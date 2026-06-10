-- Phase 3: DB-backed, wedding-tied ceremony checklist.
-- RLS mirrors wedding_lines: access via user_can_access_wedding(wedding_id)
-- (owner or collaborator). Already applied to prod via Supabase on 2026-06-10.

create table if not exists public.wedding_rituals (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  ritual_slug text,
  title text not null,
  phase text not null,
  done boolean not null default false,
  sort_order integer not null default 0,
  is_custom boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Full unique index (NULL slugs stay distinct, so custom items aren't constrained).
create unique index if not exists wedding_rituals_wedding_slug_uniq
  on public.wedding_rituals (wedding_id, ritual_slug);

create index if not exists wedding_rituals_wedding_id_idx
  on public.wedding_rituals (wedding_id);

alter table public.wedding_rituals enable row level security;

drop policy if exists wedding_rituals_collab_all on public.wedding_rituals;
create policy wedding_rituals_collab_all on public.wedding_rituals
  for all
  using (public.user_can_access_wedding(wedding_id))
  with check (public.user_can_access_wedding(wedding_id));
