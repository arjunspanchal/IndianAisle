-- Profile-level role + planner company name.
--
-- Users who identify as a wedding planner can attach a company name. When set,
-- the company name is rendered as a header in PDF and Excel exports so client
-- decks read like agency-branded budgets.
--
-- The per-wedding `weddings.role` column stays — that's about the role for a
-- specific wedding. This profile-level role is the user's overall self-id and
-- gates the company-name field.

alter table public.wedding_profiles
  add column if not exists role text not null default 'couple'
    check (role in ('couple','planner','family_or_friend'));

alter table public.wedding_profiles
  add column if not exists company_name text not null default '';
