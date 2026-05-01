-- The Indian Aisle — full wedding-app schema.
--
-- Purpose: this file is the single source of truth for the database. Apply it to a
-- fresh Supabase project (e.g. when this app moves off the shared hyrox-app project)
-- and the back-end is ready. Idempotent (uses IF NOT EXISTS / DROP-then-CREATE
-- for triggers and policies) so it's safe to re-run on a project that already has
-- some of these objects.
--
-- Apply via the Supabase dashboard SQL editor or `psql -f`.

create extension if not exists pgcrypto;

-- ============================================================================
-- Enums
-- ============================================================================
do $$ begin
  create type public.wedding_section as enum (
    'decor','entertainment','photography','attire',
    'travel','rituals','gifting','misc'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.wedding_line_source as enum ('Confirmed','Estimate');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- Helpers
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================================
-- wedding_profiles  (one row per signed-in user)
-- ============================================================================
create table if not exists public.wedding_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  created_at timestamptz not null default now()
);
alter table public.wedding_profiles enable row level security;

drop policy if exists wedding_profiles_self_select on public.wedding_profiles;
create policy wedding_profiles_self_select on public.wedding_profiles
  for select using (id = (select auth.uid()));

drop policy if exists wedding_profiles_self_insert on public.wedding_profiles;
create policy wedding_profiles_self_insert on public.wedding_profiles
  for insert with check (id = (select auth.uid()));

drop policy if exists wedding_profiles_self_update on public.wedding_profiles;
create policy wedding_profiles_self_update on public.wedding_profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- ============================================================================
-- weddings  (one row per wedding the user is planning)
-- ============================================================================
create table if not exists public.weddings (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('couple','planner','family_or_friend')),
  couple_names text not null,
  wedding_date date,
  wedding_type text not null check (wedding_type in ('local','destination')),
  bride_name text not null default '',
  groom_name text not null default '',
  venue text not null default '',
  start_date date,
  end_date date,
  guests integer not null default 0,
  events integer not null default 0,
  rooms_nights integer not null default 0,
  rooms_gst_pct numeric not null default 18,
  contingency_pct numeric not null default 5,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists weddings_owner_id_idx on public.weddings (owner_id);

drop trigger if exists weddings_set_updated_at on public.weddings;
create trigger weddings_set_updated_at
  before update on public.weddings
  for each row execute function public.set_updated_at();

alter table public.weddings enable row level security;

drop policy if exists weddings_owner_select on public.weddings;
create policy weddings_owner_select on public.weddings
  for select using (owner_id = (select auth.uid()));

drop policy if exists weddings_owner_insert on public.weddings;
create policy weddings_owner_insert on public.weddings
  for insert with check (owner_id = (select auth.uid()));

drop policy if exists weddings_owner_update on public.weddings;
create policy weddings_owner_update on public.weddings
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists weddings_owner_delete on public.weddings;
create policy weddings_owner_delete on public.weddings
  for delete using (owner_id = (select auth.uid()));

-- ============================================================================
-- wedding_rooms / wedding_meals / wedding_lines  (budget detail tables)
-- ============================================================================
create table if not exists public.wedding_rooms (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null default '',
  count integer not null default 0,
  rate_per_night numeric not null default 0,
  position integer not null default 0
);
create index if not exists wedding_rooms_wedding_id_idx on public.wedding_rooms (wedding_id);
alter table public.wedding_rooms enable row level security;

drop policy if exists wedding_rooms_owner_all on public.wedding_rooms;
create policy wedding_rooms_owner_all on public.wedding_rooms
  for all
  using (exists (select 1 from public.weddings w where w.id = wedding_rooms.wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_rooms.wedding_id and w.owner_id = (select auth.uid())));

create table if not exists public.wedding_meals (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  label text not null default '',
  pax integer not null default 0,
  rate_per_head numeric not null default 0,
  tax_pct numeric not null default 0,
  sittings integer not null default 1,
  position integer not null default 0
);
create index if not exists wedding_meals_wedding_id_idx on public.wedding_meals (wedding_id);
alter table public.wedding_meals enable row level security;

drop policy if exists wedding_meals_owner_all on public.wedding_meals;
create policy wedding_meals_owner_all on public.wedding_meals
  for all
  using (exists (select 1 from public.weddings w where w.id = wedding_meals.wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_meals.wedding_id and w.owner_id = (select auth.uid())));

create table if not exists public.wedding_lines (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  section public.wedding_section not null,
  label text not null default '',
  amount numeric not null default 0,
  source public.wedding_line_source not null default 'Estimate',
  note text,
  position integer not null default 0
);
create index if not exists wedding_lines_wedding_id_idx on public.wedding_lines (wedding_id);
alter table public.wedding_lines enable row level security;

drop policy if exists wedding_lines_owner_all on public.wedding_lines;
create policy wedding_lines_owner_all on public.wedding_lines
  for all
  using (exists (select 1 from public.weddings w where w.id = wedding_lines.wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_lines.wedding_id and w.owner_id = (select auth.uid())));

-- ============================================================================
-- wedding_guests
-- ============================================================================
create table if not exists public.wedding_guests (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  name text not null default '',
  guest_type text not null default '',
  side text not null default '' check (side in ('','bride','groom','both')),
  address text not null default '',
  phone text not null default '',
  email text not null default '',
  invited boolean not null default true,
  rsvp_status text not null default 'pending' check (rsvp_status in ('pending','accepted','declined','maybe')),
  hotel_required boolean not null default false,
  arrival_date date,
  plus_ones integer not null default 0 check (plus_ones >= 0),
  notes text not null default '',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wedding_guests_wedding_id_idx on public.wedding_guests (wedding_id);

drop trigger if exists wedding_guests_set_updated_at on public.wedding_guests;
create trigger wedding_guests_set_updated_at
  before update on public.wedding_guests
  for each row execute function public.set_updated_at();

alter table public.wedding_guests enable row level security;

drop policy if exists wedding_guests_owner_all on public.wedding_guests;
create policy wedding_guests_owner_all on public.wedding_guests
  for all
  using (exists (select 1 from public.weddings w where w.id = wedding_guests.wedding_id and w.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.weddings w where w.id = wedding_guests.wedding_id and w.owner_id = (select auth.uid())));

-- ============================================================================
-- wedding_properties  (per-owner venue catalog)
-- ============================================================================
create table if not exists public.wedding_properties (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,

  name text not null default '',
  location text not null default '',
  address text not null default '',
  website text not null default '',

  contact_name text not null default '',
  contact_phone text not null default '',
  contact_email text not null default '',

  rooms integer not null default 0,
  max_guests integer,
  event_spaces integer,
  tier integer not null default 2 check (tier in (1,2,3)),

  banquet boolean not null default false,
  lawn boolean not null default false,
  poolside boolean not null default false,
  mandap boolean not null default false,
  bridal_suite boolean not null default false,
  air_conditioned boolean not null default false,

  in_house_catering boolean not null default false,
  outside_catering_allowed boolean not null default false,
  outside_decor_allowed boolean not null default false,
  liquor_license boolean not null default false,

  avg_room_rate numeric,
  banquet_rental numeric,
  per_plate_cost numeric,
  buyout_cost numeric,

  parking_spots integer,
  airport_km numeric,

  status text check (status in ('Not contacted','Inquired','Visited','Shortlisted','Booked','Rejected')),
  rating numeric not null default 0,
  visited boolean not null default false,

  notes text not null default '',
  position integer not null default 0,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists wedding_properties_owner_id_idx on public.wedding_properties (owner_id);

drop trigger if exists wedding_properties_set_updated_at on public.wedding_properties;
create trigger wedding_properties_set_updated_at
  before update on public.wedding_properties
  for each row execute function public.set_updated_at();

alter table public.wedding_properties enable row level security;

drop policy if exists wedding_properties_owner_select on public.wedding_properties;
create policy wedding_properties_owner_select on public.wedding_properties
  for select using (owner_id = (select auth.uid()));

drop policy if exists wedding_properties_owner_insert on public.wedding_properties;
create policy wedding_properties_owner_insert on public.wedding_properties
  for insert with check (owner_id = (select auth.uid()));

drop policy if exists wedding_properties_owner_update on public.wedding_properties;
create policy wedding_properties_owner_update on public.wedding_properties
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

drop policy if exists wedding_properties_owner_delete on public.wedding_properties;
create policy wedding_properties_owner_delete on public.wedding_properties
  for delete using (owner_id = (select auth.uid()));
