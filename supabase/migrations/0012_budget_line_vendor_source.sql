-- Wedding budget lines now optionally reference a vendor — either personal
-- (public.wedding_vendors) or curated (public.curated_vendors). Discriminated
-- by `vendor_source`. We use a single `vendor_id` + `vendor_source` pair
-- rather than two FK columns because the two referent tables have completely
-- different lifecycles (personal: user-owned, deletable; curated: platform-
-- managed, ON DELETE CASCADE inappropriate). When either underlying record
-- vanishes, the budget line keeps its label/amount text — the picker just
-- can't re-resolve the reference, which is the right behaviour.

------------------------------------------------------------------------------
-- 1) Columns on wedding_lines
------------------------------------------------------------------------------
alter table public.wedding_lines
  add column vendor_id uuid,
  add column vendor_source text
    check (vendor_source is null or vendor_source in ('personal', 'curated'));

-- Both-or-neither — the picker writes them together.
alter table public.wedding_lines
  add constraint wedding_lines_vendor_pair_check
  check (
    (vendor_id is null and vendor_source is null)
    or (vendor_id is not null and vendor_source is not null)
  );

create index wedding_lines_vendor_idx
  on public.wedding_lines (vendor_id, vendor_source)
  where vendor_id is not null;

-- Existing rows stay null/null which is correct: they were typed manually
-- before the picker existed and aren't tied to any vendor record.

------------------------------------------------------------------------------
-- 2) Display helper for downgraded users.
--
-- A user who shortlists a curated vendor and then lapses to Free can no
-- longer SELECT from curated_vendors directly (RLS gate). But we still want
-- their budget-line UI to render the vendor's *name* + category + base city
-- so the line is meaningful — just read-only with a "Re-upgrade to edit"
-- affordance. This SECURITY DEFINER helper exposes only the safe display
-- columns. Contact details, gallery, quote_amount, etc. stay behind RLS.
------------------------------------------------------------------------------
create or replace function public.get_curated_vendor_display(p_vendor_id uuid)
  returns table (
    id uuid,
    name text,
    category text,
    base_city text
  )
  language sql
  security definer
  stable
  set search_path = public
as $$
  select v.id, v.name, v.category::text, v.base_city
  from public.curated_vendors v
  where v.id = p_vendor_id;
$$;

revoke all on function public.get_curated_vendor_display(uuid) from public;
grant execute on function public.get_curated_vendor_display(uuid) to authenticated;
