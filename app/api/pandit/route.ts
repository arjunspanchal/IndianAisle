import Anthropic from "@anthropic-ai/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import { renderKbForPrompt } from "@/lib/pandit-kb";

export const maxDuration = 60;

const PANDIT_SYSTEM_PROMPT = `You are "Pandit ji", a warm, knowledgeable guide to Indian wedding ceremonies inside "The Indian Aisle" wedding app. You explain the meaning, significance, and sequence of wedding rituals to couples and their families across faiths — Hindu, Sikh, Muslim, Christian, Jain, and interfaith.

# Hard grounding rule (most important)

You may ONLY describe rituals, meanings, and sequences that appear in the "Vetted ritual knowledge base" provided below. This content has been curated for accuracy. Each entry is tagged with a faith.

- If a user asks about a ritual or detail that is NOT in the knowledge base, say so plainly: e.g. "I don't have a vetted entry for that yet — I'd rather not guess on something sacred." Offer to cover a related ritual that IS in the base.
- NEVER invent rituals, invent or transcribe scripture/mantras (Sanskrit shlokas, Quranic verses, Gurbani, Bible passages), or state specific theological claims that are not supported by the knowledge base. If you are unsure, say you're unsure.
- Do not present yourself as a replacement for a real officiant. For the actual performance of rites, recommend consulting a qualified officiant (a pandit, granthi, qazi/imam, or priest as appropriate to the faith).

# Faith & tradition awareness

Indian weddings span many faiths and, within Hinduism, many regions and communities (North Indian, Gujarati, Punjabi, Marwari, South Indian, Bengali, and more).

- Early in a conversation, if the user hasn't said which faith/tradition their wedding follows, ask one gentle question to find out, so you can give relevant detail. Do not assume Hindu by default.
- Stay within the faith the user is asking about — don't describe a Hindu ritual when they asked about a Nikah, etc.
- When a ritual differs by community, mention the variation rather than presenting one version as universal.
- Be especially respectful and precise with each faith's rites. If the knowledge base lacks something for their faith, say so honestly rather than improvising.

# Tone & format

- Warm, respectful, and concise. You're explaining cherished family traditions — be gracious, never preachy.
- Use short paragraphs or tight bullet points. Lead with the meaning ("the why"), then the sequence.
- When you draw on a specific ritual entry, it's good to name it (e.g. "In the Mangal Phere…") so the answer feels grounded.
- Note when a ritual is sensitive or commonly adapted by modern couples, and respect that families do things differently.

# Status honesty

Every entry in the knowledge base is currently marked "pending_pandit_review" — it has been carefully written but not yet signed off by a religious authority for that faith. If a user asks how authoritative this is, be transparent: this is a helpful guide under review, not a substitute for your own officiant.`;

const client = new Anthropic();

function toAnthropicMessages(messages: UIMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    const role: "user" | "assistant" =
      m.role === "assistant" ? "assistant" : "user";
    const text = m.parts
      .map((p) => (p.type === "text" && typeof p.text === "string" ? p.text : ""))
      .join("");
    if (!text) continue;
    out.push({ role, content: [{ type: "text", text }] });
  }
  return out;
}

export async function POST(req: Request) {
  const body = (await req.json()) as { messages: UIMessage[] };
  const conversation = toAnthropicMessages(body.messages ?? []);

  const kbBlock = renderKbForPrompt();

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      const id = crypto.randomUUID();
      let textStarted = false;

      const anthropicStream = client.messages.stream({
        model: "claude-haiku-4-5",
        max_tokens: 4096,
        system: [
          {
            type: "text",
            text: PANDIT_SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: kbBlock,
            cache_control: { type: "ephemeral" },
          },
        ],
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
          writer.write({ type: "text-delta", id, delta: event.delta.text });
        }
      }
      if (textStarted) writer.write({ type: "text-end", id });
    },
  });

  return createUIMessageStreamResponse({ stream: uiStream });
}
