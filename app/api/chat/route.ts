import Anthropic from "@anthropic-ai/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { createWedding } from "@/lib/wedding-repo";
import {
  forgetFactsMatching,
  listFactsForCurrentUser,
  rememberFact,
} from "@/lib/memory-repo";
import type { WeddingRole, WeddingType } from "@/lib/supabase/types";

export const maxDuration = 60;

const STATIC_SYSTEM_PROMPT = `You are an assistant inside "The Indian Aisle", a wedding planning and budget app focused on Indian weddings (mehendi, sangeet, haldi, baraat, vidaai, etc.).

Help users with:
- Budget planning across venues, decor, catering, photography, entertainment, attire, jewelry, transport, and miscellaneous costs
- Comparing destination vs local weddings
- Vendor and venue questions
- Guest list and room block planning
- Cultural traditions and event sequencing

Keep answers concise and practical. When users ask about numbers, give realistic INR ranges and call out what drives the cost. If a question needs details you don't have (guest count, city, dates), ask one focused follow-up.

# Creating weddings in the calculator

You have a "create_wedding" tool that creates a real wedding entry the user can open and edit in the app. Rules for using it:

1. ALWAYS gather these fields first by asking the user (do not infer silently):
   - couple_names — e.g. "Kash & Arjun"
   - wedding_type — "local" or "destination"
   - role — "couple", "planner", or "family_or_friend" (whose perspective the user is planning from)
   - wedding_date — optional, ISO yyyy-mm-dd if known
2. After you have the required fields, summarize them in one short line and EXPLICITLY ask "Should I create this?". Wait for an affirmative reply ("yes", "create it", "go ahead", etc.) before calling the tool.
3. Never call create_wedding speculatively, on the first turn, or based on inferred intent — only after explicit confirmation.
4. When the tool returns successfully, tell the user the wedding was created and share the URL it returned (e.g. "Created — open it at /weddings/<id>"). Do not invent IDs.
5. If the tool returns an error (e.g. user not signed in), surface the message plainly and suggest they sign in at /login.

# Long-term memory (remember / forget)

You have two more tools that give you memory across conversations:

- "remember" — save a small, durable fact about the user (preferences, constraints, recurring context). Examples: "prefers destination weddings", "budget cap around 30L", "based in Mumbai", "shortlisted The Leela Goa". Save short atomic facts, one per call. Do NOT remember ephemeral things ("user just asked about catering"), passwords, or anything sensitive.
- "forget" — remove facts matching a substring. Use when the user corrects you ("actually 40L not 30L") or asks you to forget something. Confirm to the user what you removed.

When you remember or forget something, briefly acknowledge it (e.g. "Got it — I'll remember that.") so the user knows.

Any facts already known about this user are listed in the "Known facts" section below; rely on those silently when relevant rather than restating them.`;

const TOOLS: Anthropic.Tool[] = [
  {
    name: "create_wedding",
    description:
      "Create a new wedding entry in the user's calculator. Only call AFTER the user has explicitly confirmed (e.g. 'yes', 'create it', 'go ahead'). Never call this on the first turn or based on inferred intent.",
    input_schema: {
      type: "object",
      properties: {
        couple_names: {
          type: "string",
          description: "Names of the couple, e.g. 'Kash & Arjun'.",
        },
        wedding_type: {
          type: "string",
          enum: ["local", "destination"],
          description: "Whether the wedding is local or a destination wedding.",
        },
        role: {
          type: "string",
          enum: ["couple", "planner", "family_or_friend"],
          description:
            "The user's relationship to the wedding. Default to 'couple' unless the user has indicated otherwise.",
        },
        wedding_date: {
          type: "string",
          description:
            "Wedding date in ISO yyyy-mm-dd format. Omit if the date is not yet set.",
        },
      },
      required: ["couple_names", "wedding_type", "role"],
    },
  },
  {
    name: "remember",
    description:
      "Save a short, durable fact about the user (preferences, constraints, context) so it persists across conversations. One atomic fact per call. Do not save sensitive data, passwords, or ephemeral intents.",
    input_schema: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description:
            "A short factual statement about the user, written in third person. E.g. 'Prefers destination weddings.', 'Budget cap is around 30 lakhs.', 'Based in Mumbai.'",
        },
      },
      required: ["fact"],
    },
  },
  {
    name: "forget",
    description:
      "Remove any saved facts whose text contains the given substring (case-insensitive). Use when the user corrects you or asks you to forget something. Returns the number of facts removed.",
    input_schema: {
      type: "object",
      properties: {
        matching: {
          type: "string",
          description:
            "Substring to match against stored facts. Match is case-insensitive. E.g. 'budget cap' would remove 'Budget cap is around 30 lakhs.'",
        },
      },
      required: ["matching"],
    },
  },
];

const client = new Anthropic();

const MAX_ITERATIONS = 5;

function toAnthropicMessages(messages: UIMessage[]): Anthropic.MessageParam[] {
  return messages
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: m.parts
        .map((p) => (p.type === "text" ? p.text : ""))
        .join(""),
    }))
    .filter((m) => m.content.length > 0);
}

function renderMemorySection(facts: { fact: string }[]): string {
  if (facts.length === 0) {
    return `# Known facts about this user\n\n(No saved facts yet. Use the "remember" tool when you learn something durable.)`;
  }
  const lines = facts.map((f) => `- ${f.fact}`).join("\n");
  return `# Known facts about this user\n\n${lines}`;
}

type CreateWeddingArgs = {
  couple_names?: unknown;
  wedding_type?: unknown;
  role?: unknown;
  wedding_date?: unknown;
};

async function runCreateWedding(input: unknown): Promise<string> {
  const args = (input ?? {}) as CreateWeddingArgs;
  const couple_names =
    typeof args.couple_names === "string" ? args.couple_names.trim() : "";
  const wedding_type =
    args.wedding_type === "local" || args.wedding_type === "destination"
      ? (args.wedding_type as WeddingType)
      : null;
  const role =
    args.role === "couple" ||
    args.role === "planner" ||
    args.role === "family_or_friend"
      ? (args.role as WeddingRole)
      : null;
  const wedding_date =
    typeof args.wedding_date === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(args.wedding_date)
      ? args.wedding_date
      : null;

  if (!couple_names) throw new Error("couple_names is required");
  if (!wedding_type) throw new Error("wedding_type must be 'local' or 'destination'");
  if (!role)
    throw new Error("role must be 'couple', 'planner', or 'family_or_friend'");

  const id = await createWedding({
    role,
    couple_names,
    wedding_date,
    wedding_type,
  });
  return JSON.stringify({ ok: true, id, url: `/weddings/${id}` });
}

async function runRemember(input: unknown): Promise<string> {
  const args = (input ?? {}) as { fact?: unknown };
  if (typeof args.fact !== "string" || !args.fact.trim()) {
    throw new Error("fact is required");
  }
  const saved = await rememberFact(args.fact);
  return JSON.stringify({ ok: true, id: saved.id, fact: saved.fact });
}

async function runForget(input: unknown): Promise<string> {
  const args = (input ?? {}) as { matching?: unknown };
  if (typeof args.matching !== "string" || !args.matching.trim()) {
    throw new Error("matching is required");
  }
  const removed = await forgetFactsMatching(args.matching);
  return JSON.stringify({ ok: true, removed });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const conversation: Anthropic.MessageParam[] = toAnthropicMessages(messages);

  const facts = await listFactsForCurrentUser();
  const memorySection = renderMemorySection(facts);

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const id = crypto.randomUUID();
        let textStarted = false;

        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 4096,
          system: [
            {
              type: "text",
              text: STATIC_SYSTEM_PROMPT,
              cache_control: { type: "ephemeral" },
            },
            { type: "text", text: memorySection },
          ],
          tools: TOOLS,
          messages: conversation,
        });

        for await (const event of anthropicStream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            if (!textStarted) {
              writer.write({ type: "text-start", id });
              textStarted = true;
            }
            writer.write({
              type: "text-delta",
              id,
              delta: event.delta.text,
            });
          }
        }
        if (textStarted) writer.write({ type: "text-end", id });

        const finalMessage = await anthropicStream.finalMessage();
        conversation.push({
          role: "assistant",
          content: finalMessage.content,
        });

        if (finalMessage.stop_reason !== "tool_use") break;

        const toolResults: Anthropic.ToolResultBlockParam[] = [];
        for (const block of finalMessage.content) {
          if (block.type !== "tool_use") continue;
          try {
            let result: string;
            if (block.name === "create_wedding") {
              result = await runCreateWedding(block.input);
              const parsed = JSON.parse(result) as { id: string; url: string };
              writer.write({
                type: "data-wedding-created",
                data: { id: parsed.id, url: parsed.url },
                transient: true,
              });
            } else if (block.name === "remember") {
              result = await runRemember(block.input);
            } else if (block.name === "forget") {
              result = await runForget(block.input);
            } else {
              toolResults.push({
                type: "tool_result",
                tool_use_id: block.id,
                content: `Unknown tool: ${block.name}`,
                is_error: true,
              });
              continue;
            }
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: result,
            });
          } catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: msg,
              is_error: true,
            });
          }
        }
        conversation.push({ role: "user", content: toolResults });
      }
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
