import Anthropic from "@anthropic-ai/sdk";
import {
  createUIMessageStream,
  createUIMessageStreamResponse,
  type UIMessage,
} from "ai";
import {
  createWedding,
  getWeddingBudget,
  saveWeddingBudget,
} from "@/lib/wedding-repo";
import type { Budget, LineItem } from "@/lib/budget";
import {
  forgetFactsMatching,
  listFactsForCurrentUser,
  rememberFact,
  PROFILE_CATEGORIES,
  type MemoryFact,
  type ProfileCategory,
} from "@/lib/memory-repo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
  SectionKey,
  WeddingRole,
  WeddingType,
} from "@/lib/supabase/types";

const SECTION_KEYS: SectionKey[] = [
  "decor",
  "entertainment",
  "photography",
  "attire",
  "travel",
  "rituals",
  "gifting",
  "misc",
];

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

# Importing a vendor PDF / quote

When the user attaches a PDF (visible as a "document" content block in the latest user message), treat it as a vendor quote or wedding budget breakdown. Flow:

1. **Read the document carefully.** Identify: couple names, venue, dates (start/end), guest count, number of events, room block (count/rate/GST), meal lines (pax/rate/tax/sittings), and line items grouped by section. Map vendor categories to your section keys: decor, entertainment, photography, attire, travel, rituals, gifting, misc.
2. **Decide the target wedding.**
   - If the user already has a wedding open / mentioned and you have its id, target that one.
   - Otherwise, propose creating a new wedding. Ask only for the fields not in the PDF (e.g. role — couple/planner/family_or_friend). Get confirmation, call \`create_wedding\`, capture the returned id.
3. **Summarize what you extracted in a short, structured recap** — venue, dates, guests, the room block (e.g. "41 rooms × Rs 15,000 × 2 nights, +18% GST"), totals per section, and the grand total. Then ask: "Should I populate this into the calculator?"
4. **Wait for explicit confirmation** ("yes", "go ahead", "populate it"). Never call \`populate_budget\` without it.
5. **Call \`populate_budget\`** with the parsed data. Pass only sections you actually extracted — sections you omit stay unchanged. Use pre-tax rates for room \`rate_per_night\` and meal \`rate_per_head\` (the GST/tax_pct fields handle the markup separately). For meal \`sittings\`, count how many times the meal is served (e.g. breakfast on Day 1 + Day 2 = 2 sittings).
6. **After success**, briefly confirm what was populated and give the URL the tool returned. Do not invent IDs.

If the PDF is unclear, scanned, or unreadable, say so plainly and ask the user to provide the missing details in chat.

# Long-term memory (remember / forget)

You have two more tools that give you memory across conversations:

- "remember" — save a small, durable fact about the user (preferences, constraints, recurring context). Examples: "prefers destination weddings", "budget cap around 30L", "based in Mumbai", "shortlisted The Leela Goa". Save short atomic facts, one per call. Do NOT remember ephemeral things ("user just asked about catering"), passwords, or anything sensitive.
- "forget" — remove facts matching a substring. Use when the user corrects you ("actually 40L not 30L") or asks you to forget something. Confirm to the user what you removed.

When you remember or forget something, briefly acknowledge it (e.g. "Got it — I'll remember that.") so the user knows.

Any facts already known about this user are listed in the "Known facts" section below; rely on those silently when relevant rather than restating them.

# Profile slots (REQUIRED, persistent)

Every signed-in user has 5 required profile slots. The "Profile slots" status block in the user message below tells you which are filled (✓) and which are missing (✗). When you call "remember" for a profile answer, ALWAYS pass the matching category so it counts toward filling the slot:

- name — the user's name (and partner's name if relevant)
- role — relationship to the wedding: couple / planner / family_or_friend
- city — where the user is based
- budget — rough total budget in lakhs or crores
- non_negotiable — any hard requirements (one fact per non-negotiable; reuse the same category)

## When to ask

- If ALL slots are ✓: do not run the interview. Just answer the user's question.
- If ANY slot is ✗ AND the user is signed in: gently fill the gaps. On the FIRST message of the session ask them to fill the missing slots ("Quick — 2 questions left to finish your profile: …"). One question at a time. Call "remember" with the right category after each answer.
- If the user dives into a real question, answer it first — but circle back to ask one missing slot at a time afterwards. Don't pile up multiple questions.
- If the user volunteers multiple answers in one message, accept them all (multiple "remember" calls in parallel) and only ask for what's still missing.
- After all slots are ✓, briefly summarize ("Got it. Profile is set.") and stop interviewing.

## When the user is signed out

The Profile-slots block will say "(signed out)". Do not run the interview. If they try to set up a profile, tell them to sign in at /login first so the facts can be saved.

## Free-form facts

Anything else durable the user mentions (preferred decor style, shortlisted venues, specific dates) should still be saved with "remember", but pass category="other" or omit category. Don't conflate these with the 5 required slots.`;

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
      "Save a short, durable fact about the user (preferences, constraints, context) so it persists across conversations. One atomic fact per call. Do not save sensitive data, passwords, or ephemeral intents. Pass `category` for profile slot answers (name/role/city/budget/non_negotiable) so they count toward filling the user's profile.",
    input_schema: {
      type: "object",
      properties: {
        fact: {
          type: "string",
          description:
            "A short factual statement about the user, written in third person. E.g. 'Prefers destination weddings.', 'Budget cap is around 30 lakhs.', 'Based in Mumbai.'",
        },
        category: {
          type: "string",
          enum: ["name", "role", "city", "budget", "non_negotiable", "other"],
          description:
            "Tag the fact. Use one of the 5 profile slots (name/role/city/budget/non_negotiable) for onboarding answers, or 'other' for free-form facts.",
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
  {
    name: "populate_budget",
    description:
      "Populate a wedding's budget (rooms, meals, decor, entertainment, photography, attire, travel, rituals, gifting, misc) from extracted vendor-quote data. Each section provided REPLACES the existing entries in that section; sections you omit stay unchanged. Only call AFTER the user has explicitly confirmed the extracted summary.",
    input_schema: {
      type: "object",
      properties: {
        wedding_id: {
          type: "string",
          description:
            "ID of the wedding to populate. Use the id returned by create_wedding, or one the user explicitly named.",
        },
        meta: {
          type: "object",
          description: "High-level wedding details extracted from the quote.",
          properties: {
            bride_name: { type: "string" },
            groom_name: { type: "string" },
            venue: { type: "string" },
            start_date: {
              type: "string",
              description: "ISO yyyy-mm-dd, first event day.",
            },
            end_date: {
              type: "string",
              description: "ISO yyyy-mm-dd, last event day.",
            },
            guests: { type: "integer" },
            events: { type: "integer", description: "Number of events." },
          },
        },
        rooms: {
          type: "object",
          description:
            "Hotel room block. `nights` is the number of paid nights (e.g. 2 for a 3-day wedding with check-in Day 1, check-out Day 3). `gst_pct` is the room-rate GST as a percent (typically 18 for India). `categories` is the list of room types — pre-tax rates only.",
          properties: {
            nights: { type: "integer" },
            gst_pct: { type: "number" },
            categories: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  label: { type: "string" },
                  count: { type: "integer" },
                  rate_per_night: {
                    type: "number",
                    description: "INR per room per night, BEFORE tax.",
                  },
                },
                required: ["label", "count", "rate_per_night"],
              },
            },
          },
        },
        meals: {
          type: "array",
          description:
            "Catering line items. Each entry is one meal type (e.g. 'Platinum Breakfast'). `tax_pct` is GST (5 or 18 typically). `sittings` is the number of times this meal is served (e.g. 2 for breakfast on Day 1 and Day 2).",
          items: {
            type: "object",
            properties: {
              label: { type: "string" },
              pax: { type: "integer" },
              rate_per_head: {
                type: "number",
                description: "INR per person, BEFORE tax.",
              },
              tax_pct: { type: "number" },
              sittings: { type: "integer" },
            },
            required: ["label", "pax", "rate_per_head", "tax_pct", "sittings"],
          },
        },
        lines: {
          type: "object",
          description:
            "Line items grouped by section. Each section is REPLACED wholesale by the items provided. Omit sections you don't want to change. `amount` is in INR. `source` is 'Confirmed' if the quote shows a fixed price, else 'Estimate'.",
          properties: {
            decor: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            entertainment: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            photography: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            attire: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            travel: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            rituals: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            gifting: { type: "array", items: { $ref: "#/$defs/lineItem" } },
            misc: { type: "array", items: { $ref: "#/$defs/lineItem" } },
          },
        },
        contingency_pct: {
          type: "number",
          description:
            "Contingency buffer as a percent of the rest (e.g. 5 for 5%). Only set if the quote explicitly calls one out.",
        },
      },
      required: ["wedding_id"],
      $defs: {
        lineItem: {
          type: "object",
          properties: {
            label: { type: "string" },
            amount: { type: "number" },
            source: { type: "string", enum: ["Confirmed", "Estimate"] },
            note: { type: "string" },
          },
          required: ["label", "amount"],
        },
      },
    } as Anthropic.Tool["input_schema"],
  },
];

const client = new Anthropic();

const MAX_ITERATIONS = 5;

function toAnthropicMessages(messages: UIMessage[]): Anthropic.MessageParam[] {
  const out: Anthropic.MessageParam[] = [];
  for (const m of messages) {
    const role: "user" | "assistant" =
      m.role === "assistant" ? "assistant" : "user";
    const blocks: Anthropic.ContentBlockParam[] = [];

    for (const part of m.parts) {
      if (part.type === "text" && typeof part.text === "string" && part.text) {
        blocks.push({ type: "text", text: part.text });
      } else if (
        role === "user" &&
        part.type === "file" &&
        typeof (part as { mediaType?: unknown }).mediaType === "string" &&
        (part as { mediaType: string }).mediaType === "application/pdf" &&
        typeof (part as { url?: unknown }).url === "string"
      ) {
        const url = (part as { url: string }).url;
        const base64 = url.includes(",") ? url.split(",", 2)[1] : url;
        blocks.push({
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: base64,
          },
          cache_control: { type: "ephemeral" },
        });
      }
    }

    if (blocks.length === 0) continue;
    out.push({ role, content: blocks });
  }
  return out;
}

function renderMemorySection(
  facts: MemoryFact[],
  signedIn: boolean,
): string {
  const header = "# Known facts about this user";
  if (!signedIn) {
    return `${header}\n\nProfile slots: (signed out — onboarding disabled until the user signs in)\n\n(No saved facts yet.)`;
  }

  const factsByCategory = new Map<string, MemoryFact[]>();
  for (const f of facts) {
    const key = f.category ?? "other";
    const bucket = factsByCategory.get(key) ?? [];
    bucket.push(f);
    factsByCategory.set(key, bucket);
  }

  const slotLines = (PROFILE_CATEGORIES as readonly ProfileCategory[]).map(
    (slot) => {
      const slotFacts = factsByCategory.get(slot) ?? [];
      if (slotFacts.length === 0) return `- ✗ ${slot}: MISSING`;
      const joined = slotFacts.map((f) => f.fact).join(" / ");
      return `- ✓ ${slot}: ${joined}`;
    },
  );

  const otherFacts = factsByCategory.get("other") ?? [];
  const otherSection =
    otherFacts.length === 0
      ? ""
      : `\n\n## Other facts\n${otherFacts.map((f) => `- ${f.fact}`).join("\n")}`;

  return `${header}\n\n## Profile slots\n${slotLines.join("\n")}${otherSection}`;
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
  const args = (input ?? {}) as { fact?: unknown; category?: unknown };
  if (typeof args.fact !== "string" || !args.fact.trim()) {
    throw new Error("fact is required");
  }
  const category =
    typeof args.category === "string" && args.category.trim()
      ? args.category.trim()
      : null;
  const saved = await rememberFact(args.fact, category);
  return JSON.stringify({
    ok: true,
    id: saved.id,
    fact: saved.fact,
    category: saved.category,
  });
}

async function runForget(input: unknown): Promise<string> {
  const args = (input ?? {}) as { matching?: unknown };
  if (typeof args.matching !== "string" || !args.matching.trim()) {
    throw new Error("matching is required");
  }
  const removed = await forgetFactsMatching(args.matching);
  return JSON.stringify({ ok: true, removed });
}

function rid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function asNumber(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function asInt(v: unknown): number | null {
  const n = asNumber(v);
  return n === null ? null : Math.round(n);
}

function asString(v: unknown): string | null {
  return typeof v === "string" && v.trim() ? v.trim() : null;
}

type PopulateBudgetArgs = {
  wedding_id?: unknown;
  meta?: unknown;
  rooms?: unknown;
  meals?: unknown;
  lines?: unknown;
  contingency_pct?: unknown;
};

async function runPopulateBudget(input: unknown): Promise<string> {
  const args = (input ?? {}) as PopulateBudgetArgs;
  const weddingId = asString(args.wedding_id);
  if (!weddingId) throw new Error("wedding_id is required");

  const current = await getWeddingBudget(weddingId);
  if (!current) throw new Error("Wedding not found or not accessible");

  const next: Budget = {
    ...current,
    meta: { ...current.meta },
    rooms: { ...current.rooms, categories: [...current.rooms.categories] },
    meals: [...current.meals],
  };
  for (const s of SECTION_KEYS) next[s] = [...current[s]];

  if (args.meta && typeof args.meta === "object") {
    const m = args.meta as Record<string, unknown>;
    const bn = asString(m.bride_name);
    const gn = asString(m.groom_name);
    const v = asString(m.venue);
    const sd = asString(m.start_date);
    const ed = asString(m.end_date);
    const guests = asInt(m.guests);
    const events = asInt(m.events);
    if (bn) next.meta.brideName = bn;
    if (gn) next.meta.groomName = gn;
    if (v) next.meta.venue = v;
    if (sd && /^\d{4}-\d{2}-\d{2}$/.test(sd)) next.meta.startDate = sd;
    if (ed && /^\d{4}-\d{2}-\d{2}$/.test(ed)) next.meta.endDate = ed;
    if (guests !== null) next.meta.guests = guests;
    if (events !== null) next.meta.events = events;
  }

  if (args.rooms && typeof args.rooms === "object") {
    const r = args.rooms as Record<string, unknown>;
    const nights = asInt(r.nights);
    const gst = asNumber(r.gst_pct);
    if (nights !== null) next.rooms.nights = nights;
    if (gst !== null) next.rooms.gstPct = gst;
    if (Array.isArray(r.categories)) {
      next.rooms.categories = r.categories.map((c, i) => {
        const o = (c ?? {}) as Record<string, unknown>;
        return {
          id: rid(`room${i}`),
          label: asString(o.label) ?? `Category ${i + 1}`,
          count: asInt(o.count) ?? 0,
          ratePerNight: asNumber(o.rate_per_night) ?? 0,
        };
      });
    }
  }

  if (Array.isArray(args.meals)) {
    next.meals = args.meals.map((m, i) => {
      const o = (m ?? {}) as Record<string, unknown>;
      return {
        id: rid(`meal${i}`),
        label: asString(o.label) ?? `Meal ${i + 1}`,
        pax: asInt(o.pax) ?? 0,
        ratePerHead: asNumber(o.rate_per_head) ?? 0,
        taxPct: asNumber(o.tax_pct) ?? 0,
        sittings: asInt(o.sittings) ?? 1,
      };
    });
  }

  if (args.lines && typeof args.lines === "object") {
    const linesObj = args.lines as Record<string, unknown>;
    for (const section of SECTION_KEYS) {
      const provided = linesObj[section];
      if (Array.isArray(provided)) {
        next[section] = provided.map((l, i): LineItem => {
          const o = (l ?? {}) as Record<string, unknown>;
          return {
            id: rid(`${section}${i}`),
            label: asString(o.label) ?? `Item ${i + 1}`,
            amount: asNumber(o.amount) ?? 0,
            source: o.source === "Estimate" ? "Estimate" : "Confirmed",
            note: asString(o.note) ?? undefined,
          };
        });
      }
    }
  }

  const cp = asNumber(args.contingency_pct);
  if (cp !== null) next.contingencyPct = cp;

  await saveWeddingBudget(weddingId, next);

  const lineCounts: Record<string, number> = {};
  for (const s of SECTION_KEYS) lineCounts[s] = next[s].length;

  return JSON.stringify({
    ok: true,
    wedding_id: weddingId,
    url: `/weddings/${weddingId}`,
    summary: {
      meta: next.meta,
      rooms: {
        nights: next.rooms.nights,
        gst_pct: next.rooms.gstPct,
        categories: next.rooms.categories.length,
      },
      meals: next.meals.length,
      line_items_by_section: lineCounts,
    },
  });
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();
  const conversation: Anthropic.MessageParam[] = toAnthropicMessages(messages);

  const sb = createSupabaseServerClient();
  const {
    data: { user },
  } = await sb.auth.getUser();
  const signedIn = Boolean(user);

  const facts = signedIn ? await listFactsForCurrentUser() : [];
  const memorySection = renderMemorySection(facts, signedIn);

  const uiStream = createUIMessageStream({
    execute: async ({ writer }) => {
      for (let i = 0; i < MAX_ITERATIONS; i++) {
        const id = crypto.randomUUID();
        let textStarted = false;

        const anthropicStream = client.messages.stream({
          model: "claude-haiku-4-5",
          max_tokens: 8192,
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
            } else if (block.name === "populate_budget") {
              result = await runPopulateBudget(block.input);
              const parsed = JSON.parse(result) as { wedding_id: string; url: string };
              writer.write({
                type: "data-wedding-created",
                data: { id: parsed.wedding_id, url: parsed.url },
                transient: true,
              });
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
