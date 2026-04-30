# The Indian Aisle

Live calculator UI on top of an Airtable base. Edit any field — totals update instantly. Click **Save to Airtable** to write the changes back.

Defaults reflect the Kash + Arjun Storii Naina Tikkar v5 plan (₹5,900,269).

## Architecture

```
Browser ──▶ Next.js (Vercel) ──▶ Airtable REST API (server-side, with PAT)
   ▲                ▲
   │                │
 live UI       server action
 sliders        getBudget / saveBudget
```

- **Read**: server component on `/` calls `getBudget()`, fetches all rows from the 3 data tables, maps them into a single `Budget` JSON shape, and renders the calculator with that as the initial state.
- **Edit**: pure client state. Every input updates totals immediately — no network round-trip.
- **Save**: server action diffs the current `Budget` against Airtable's live state and applies create/update/delete on the 3 tables. The Personal Access Token never leaves the server.

## Airtable base

Base ID: `appX3GYmlf0OQGXc7` (hardcoded in [`lib/airtable.ts`](lib/airtable.ts) — change there if you fork). Three tables are read/written:

| Table | Purpose |
|---|---|
| **Rooms** | Per-category rows. `Total = Rate × (1 + GST%/100) × Count × Nights` (computed by the calculator on save). |
| **Meals** | Per-meal rows. `Total = Rate × (1 + Tax%/100) × Pax × Sittings`. |
| **Line Items** | Sections 03–10 plus the auto-managed `11 Contingency` row. The calculator's contingency-% slider rewrites this row on save. |

The **Summary** table is currently not synced — its values go stale after you edit. Either delete it or treat it as a v1 reference.

## Local dev

1. Create a PAT at https://airtable.com/create/tokens
   - Scopes: `data.records:read`, `data.records:write`
   - Access: just the "Wedding Budget" base
2. Save it:
   ```bash
   cp .env.example .env.local
   # edit .env.local — paste the PAT
   ```
3. ```bash
   npm install
   npm run dev   # http://localhost:3000
   ```

The app works without a PAT — it boots with the in-code defaults and the Save button is disabled.

## Deploy to Vercel

1. Push to GitHub.
2. Import at [vercel.com/new](https://vercel.com/new).
3. In project settings → Environment Variables: add `AIRTABLE_PAT` with the same value as `.env.local`.
4. Deploy.

## Project layout

```
app/
  layout.tsx          root layout + fonts
  page.tsx            async server component — fetches budget from Airtable
  actions.ts          'use server' — saveBudgetAction wraps lib/airtable.saveBudget
  globals.css         Tailwind + design tokens
components/
  Calculator.tsx      all UI + editing logic (client component)
lib/
  budget.ts           types, defaults, math (formatINR, grandTotal, ...)
  airtable.ts         server-only — getBudget(), saveBudget(diff)
```

## Math

- **Room totals**: `rate × (1 + gst%) × count × nights`
- **Meal totals**: `rate × (1 + tax%) × pax × sittings`
- **Contingency**: % of subtotal of all other sections
- Defaults reproduce the v5 PDF total (₹5,900,269) — the room rate is set to ₹15,062 because the PDF's displayed "₹15,000" rate doesn't square with its own ₹1,457,400 rooms total.

## Adding fields to the base

If you add a column to a table in Airtable, the calculator won't see it until [`lib/airtable.ts`](lib/airtable.ts) is updated. The mapping uses **field names** (not IDs), so renaming a field will break the read until the constant is updated. Keep the field names stable, or migrate them deliberately.
