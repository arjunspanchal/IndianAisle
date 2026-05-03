# IndianAisle.com — Project Memory

## Stack
- Framework: Next.js 14.2.15 (App Router) + TypeScript
- Styling: Tailwind CSS, design tokens parchment / ink / gold / rose / sage
- Fonts: Cormorant Garamond (display), Inter (body)
- Database + Auth: Supabase (`@supabase/ssr` + `@supabase/supabase-js`); Postgres under the hood. Project id: `frpfgpdknrxxxvyojyev`.
- Hosting: Vercel (auto-deploys on push to `main`).
- Excel export: SheetJS (`xlsx`)
- Date picking: `react-day-picker`
- AI/chat: Vercel AI SDK + Anthropic SDK

## Modules
- **Wedding Budget Calculator** at `/`, `/weddings/*`, `/properties`, `/profile`, etc. — couple-side. OTP login at `/login`.
- **Vendor Portal (Module 1)** at `/vendor/*` — email + password auth (separate from couple OTP). Vendors sign up, onboard, and wait for admin approval.
- **Admin Queue (Module 1)** at `/admin/vendors` — platform admins approve / reject vendor signups.

## Key DB tables
- `curated_vendors` — vendor listings. Module 1 added: `listing_status`, `listing_tier`, `country_code`, `latitude`, `longitude`, `submitted_at`, `approved_at`, `approved_by`, `rejection_reason`, `claimed_at`. Older single `category` column is dropped — categories now live in `vendor_to_category`.
- `vendor_categories` — 14-row lookup (slug, name, display_order, icon).
- `vendor_to_category` — M:N junction with `is_primary`.
- `vendor_users` — multi-user-per-vendor (vendor_id, user_id, role: owner|manager|staff, accepted_at).
- `admins` — platform admins (`user_id` FK to `auth.users`). Replaces `wedding_profiles.is_admin` (which is kept for backward-compat — do not modify).
- `weddings`, `wedding_*` — couple-side budget calculator. **Don't touch** for Module 1 work.

## Helper SQL functions (Postgres)
- `is_platform_admin()` → boolean — current user is in `admins`.
- `is_vendor_member(vendor_id)` → boolean — current user has any role on this vendor.
- `is_vendor_admin_role(vendor_id)` → boolean — current user is owner/manager.
- `create_vendor_with_owner(p_name, p_slug, p_about, p_country_code, p_base_city, p_contact_email, p_contact_phone, p_website, p_primary_category_id, p_secondary_category_ids uuid[])` → vendor uuid. Atomic: inserts vendor + `vendor_users(owner)` + category bindings under RLS. Vendor signup MUST use this — direct INSERTs are RLS-blocked.

## Workflow rules
- Direct commits to `main` are allowed; auto-deploys to Vercel.
- Before EVERY commit run: `npm run typecheck && npm run build`. Fix all errors. (`npm run lint` requires interactive `next lint` setup — skip until configured.)
- Conventional commit messages: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`.
- Never push secrets; `.env.local` is git-ignored.

## Output discipline (end every task with a summary block)
### Files Changed
- list of paths
### ⚠️ SQL TO RUN MANUALLY (omit if none)
### ⚠️ ENV VARS REQUIRED (omit if none)
### ⚠️ EXTERNAL ACCESS REQUIRED (omit if none)
### Commit
- hash and branch

## Conventions
- Server-only Supabase code lives in `lib/` files marked with `import "server-only"` or in `'use server'` action files. Use `createSupabaseServerClient()` from `lib/supabase/server.ts`.
- Client-side Supabase usage: `getSupabaseBrowserClient()` from `lib/supabase/client.ts`. Only `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` reach the browser.
- UI primitives in `components/ui/` (`Field`, `Input`, `Select`, `NumberInput`, `Button`, `IconButton`, `DateField`, `Textarea`, `Icon`). Reuse before introducing new patterns.
- Server components by default; `'use client'` only when interactivity demands it.
- Vendor signup MUST use `create_vendor_with_owner` RPC — RLS blocks direct INSERTs into `curated_vendors`.
- Module 1 admin checks use `public.admins`. The legacy `wedding_profiles.is_admin` still exists but is being deprecated for new admin checks.
