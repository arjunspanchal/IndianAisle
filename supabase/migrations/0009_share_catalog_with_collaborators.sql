-- Share owner-scoped catalogs with wedding collaborators.
--
-- wedding_properties and wedding_vendors are owner-scoped (one catalog per
-- user). When the owner shares a wedding via wedding_collaborators, the
-- collaborator should be able to read the owner's vendor + property catalog
-- for that wedding's planning context (venue picker, vendor picker).
--
-- Read-only on purpose: the catalog is per-owner and used across all of the
-- owner's weddings, so a collaborator on one wedding shouldn't be able to
-- mutate vendor/property records that affect the owner's other weddings.
--
-- These policies are additive — the existing owner_select policy keeps
-- working unchanged.

drop policy if exists wedding_properties_collaborator_select on public.wedding_properties;
create policy wedding_properties_collaborator_select on public.wedding_properties
  for select
  using (
    exists (
      select 1
      from public.weddings w
      join public.wedding_collaborators c on c.wedding_id = w.id
      where w.owner_id = wedding_properties.owner_id
        and c.user_id = (select auth.uid())
    )
  );

drop policy if exists wedding_vendors_collaborator_select on public.wedding_vendors;
create policy wedding_vendors_collaborator_select on public.wedding_vendors
  for select
  using (
    exists (
      select 1
      from public.weddings w
      join public.wedding_collaborators c on c.wedding_id = w.id
      where w.owner_id = wedding_vendors.owner_id
        and c.user_id = (select auth.uid())
    )
  );
