-- Curated vendor saves: rework to global-by-default with wedding scoping optional.
-- Tighten RLS so SELECT also requires Pro (graceful-degrade: saves stay in DB when
-- a user lapses to Free; they just become invisible until re-upgrade).
--
-- Background: 0010 created curated_vendor_saves with a composite PK
-- (user_id, wedding_id, vendor_id) which forced wedding_id NOT NULL. v1 of the
-- save UX is global ("save this vendor for myself") — we may add per-wedding
-- shortlisting later, so we keep wedding_id as a nullable column with two
-- partial unique indexes instead of a composite PK.

------------------------------------------------------------------------------
-- 1) Switch primary key to a surrogate uuid
------------------------------------------------------------------------------
alter table public.curated_vendor_saves drop constraint curated_vendor_saves_pkey;

alter table public.curated_vendor_saves
  add column id uuid not null default gen_random_uuid();

alter table public.curated_vendor_saves
  add constraint curated_vendor_saves_pkey primary key (id);

------------------------------------------------------------------------------
-- 2) Allow wedding_id to be null (global save)
------------------------------------------------------------------------------
alter table public.curated_vendor_saves
  alter column wedding_id drop not null;

------------------------------------------------------------------------------
-- 3) Partial unique indexes — one save per (user, vendor) at each scope
------------------------------------------------------------------------------
create unique index curated_vendor_saves_user_global_uq
  on public.curated_vendor_saves (user_id, vendor_id)
  where wedding_id is null;

create unique index curated_vendor_saves_user_wedding_uq
  on public.curated_vendor_saves (user_id, wedding_id, vendor_id)
  where wedding_id is not null;

create index curated_vendor_saves_user_wedding_idx
  on public.curated_vendor_saves (user_id, wedding_id);

------------------------------------------------------------------------------
-- 4) Default status now reflects shortlist semantics
------------------------------------------------------------------------------
alter table public.curated_vendor_saves
  alter column status set default 'shortlisted';

------------------------------------------------------------------------------
-- 5) RLS: SELECT now also requires Pro/admin so a downgraded user's saves
-- become invisible (rows preserved, just not returned).
-- INSERT remains Pro-gated; wedding-ownership check stays but is now
-- conditional on wedding_id being non-null.
-- DELETE policy mirrors SELECT for consistency.
-- UPDATE remains user-only — only `notes`/`status` realistically change.
------------------------------------------------------------------------------
drop policy if exists "curated_vendor_saves_self_select" on public.curated_vendor_saves;
drop policy if exists "curated_vendor_saves_self_insert" on public.curated_vendor_saves;
drop policy if exists "curated_vendor_saves_self_update" on public.curated_vendor_saves;
drop policy if exists "curated_vendor_saves_self_delete" on public.curated_vendor_saves;

create policy "curated_vendor_saves_pro_select"
  on public.curated_vendor_saves for select
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
  );

create policy "curated_vendor_saves_pro_insert"
  on public.curated_vendor_saves for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
    and (
      wedding_id is null
      or exists (
        select 1 from public.weddings w
        where w.id = wedding_id and w.owner_id = (select auth.uid())
      )
    )
  );

create policy "curated_vendor_saves_pro_update"
  on public.curated_vendor_saves for update
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
  )
  with check (user_id = (select auth.uid()));

create policy "curated_vendor_saves_pro_delete"
  on public.curated_vendor_saves for delete
  using (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
  );
