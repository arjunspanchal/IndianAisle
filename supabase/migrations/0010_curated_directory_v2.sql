-- Curated vendor directory v2: tier ladder, base city, regions served, slugs,
-- gallery images, and saves-per-wedding.
--
-- Background: 0009 introduced curated_vendors as a flat table with a single
-- `region` text. v2 grows it into a richer directory while preserving the
-- existing seed rows. We keep the old `region`/`description`/`featured` data
-- intact (with renames in two cases) — column drops happen in 0011 once we've
-- verified nothing reads them.
--
-- Scope:
--   1) Renames:
--        description -> about
--        featured    -> is_featured
--   2) New columns on curated_vendors:
--        vendor_tier (signature/established/emerging)
--        base_city, regions_served, travels_for_destination
--        slug (unique, populated from name)
--        hero_image_url, tagline, strengths
--        price_band (budget/mid/premium/luxury)
--        instagram, is_verified
--   3) Backfill base_city + travels_for_destination from existing region.
--   4) New table: curated_vendor_images (gallery beyond hero).
--   5) New table: curated_vendor_saves (Pro user pins a vendor to a wedding).
--   6) RLS for both new tables — Pro/admin read; admins write images;
--      saves are user-scoped.

------------------------------------------------------------------------------
-- 1) Renames
------------------------------------------------------------------------------
alter table public.curated_vendors rename column description to about;
alter table public.curated_vendors rename column featured to is_featured;

-- The existing index on the old column name follows the rename automatically,
-- but its name doesn't. Re-name it for grep-ability.
alter index if exists curated_vendors_featured_idx rename to curated_vendors_is_featured_idx;

------------------------------------------------------------------------------
-- 2) New columns
------------------------------------------------------------------------------
alter table public.curated_vendors
  add column vendor_tier text not null default 'emerging'
    check (vendor_tier in ('signature', 'established', 'emerging')),
  add column base_city text not null default '',
  add column regions_served text[] not null default '{}'::text[],
  add column travels_for_destination boolean not null default false,
  add column slug text,
  add column hero_image_url text not null default '',
  add column tagline text not null default '',
  add column strengths text[] not null default '{}'::text[],
  add column price_band text
    check (price_band is null or price_band in ('budget', 'mid', 'premium', 'luxury')),
  add column instagram text not null default '',
  add column is_verified boolean not null default false;

------------------------------------------------------------------------------
-- 3) Backfill: base_city + travels_for_destination from region
------------------------------------------------------------------------------
-- Heuristic: rows whose region mentions "destination", "Pan-India" or "/" are
-- treated as travels_for_destination=true with no single base_city. Anything
-- else gets copied verbatim into base_city.
update public.curated_vendors
set travels_for_destination = true,
    base_city = ''
where region ~* '(destination|pan[\s-]?india|/)';

update public.curated_vendors
set base_city = region
where base_city = ''
  and travels_for_destination = false
  and coalesce(region, '') <> '';

------------------------------------------------------------------------------
-- 3b) Slug backfill — kebab-case from name + short id suffix to guarantee
-- uniqueness, then set NOT NULL + UNIQUE.
------------------------------------------------------------------------------
update public.curated_vendors
set slug = regexp_replace(
  regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'),
  '(^-+|-+$)', '', 'g'
) || '-' || substr(id::text, 1, 6);

alter table public.curated_vendors
  alter column slug set not null,
  add constraint curated_vendors_slug_key unique (slug);

create index curated_vendors_vendor_tier_idx on public.curated_vendors(vendor_tier);
create index curated_vendors_base_city_idx on public.curated_vendors(base_city);

------------------------------------------------------------------------------
-- 4) Gallery images
------------------------------------------------------------------------------
create table public.curated_vendor_images (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references public.curated_vendors(id) on delete cascade,
  url text not null,
  caption text not null default '',
  -- 'gallery' | 'cover' | 'team' | 'work' — free-form for now, no enum.
  kind text not null default 'gallery',
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index curated_vendor_images_vendor_idx on public.curated_vendor_images(vendor_id, sort_order);

alter table public.curated_vendor_images enable row level security;

-- Read: any Pro/admin (mirrors curated_vendors).
create policy "curated_vendor_images_pro_read"
  on public.curated_vendor_images for select
  using (
    exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
  );

-- Mutations: admins only.
create policy "curated_vendor_images_admin_insert"
  on public.curated_vendor_images for insert
  with check (
    exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );
create policy "curated_vendor_images_admin_update"
  on public.curated_vendor_images for update
  using (
    exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  )
  with check (
    exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );
create policy "curated_vendor_images_admin_delete"
  on public.curated_vendor_images for delete
  using (
    exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid()) and p.is_admin
    )
  );

------------------------------------------------------------------------------
-- 5) Per-wedding saves (Pro user pins a curated vendor onto one of their
-- weddings, optionally with status + notes).
------------------------------------------------------------------------------
create table public.curated_vendor_saves (
  user_id uuid not null references auth.users(id) on delete cascade,
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  vendor_id uuid not null references public.curated_vendors(id) on delete cascade,
  status text not null default 'saved'
    check (status in ('saved', 'inquired', 'shortlisted', 'booked', 'passed')),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, wedding_id, vendor_id)
);

create index curated_vendor_saves_wedding_idx on public.curated_vendor_saves(wedding_id);
create index curated_vendor_saves_vendor_idx on public.curated_vendor_saves(vendor_id);

alter table public.curated_vendor_saves enable row level security;

-- Saves are user-scoped: the saver always owns their row. We additionally
-- require the user to be Pro/admin (mirrors directory access) so a user
-- losing Pro can't continue saving via a stale tab.
create policy "curated_vendor_saves_self_select"
  on public.curated_vendor_saves for select
  using (user_id = (select auth.uid()));

create policy "curated_vendor_saves_self_insert"
  on public.curated_vendor_saves for insert
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.wedding_profiles p
      where p.id = (select auth.uid())
        and (p.tier = 'pro' or p.is_admin)
    )
    and exists (
      select 1 from public.weddings w
      where w.id = wedding_id and w.owner_id = (select auth.uid())
    )
  );

create policy "curated_vendor_saves_self_update"
  on public.curated_vendor_saves for update
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "curated_vendor_saves_self_delete"
  on public.curated_vendor_saves for delete
  using (user_id = (select auth.uid()));

-- updated_at trigger.
create or replace function public.tg_curated_vendor_saves_touch_updated_at()
  returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end$$;

create trigger curated_vendor_saves_touch_updated_at
  before update on public.curated_vendor_saves
  for each row execute function public.tg_curated_vendor_saves_touch_updated_at();
