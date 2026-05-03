-- Cross-wedding tasks for the planner's "Today / This week / This month" rollup.
--
-- Each task belongs to a wedding (cascade-delete with the wedding). RLS lets
-- the wedding's owner OR any listed collaborator read/write — same model as
-- wedding_guests / wedding_events.

create table if not exists public.wedding_tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid not null references public.weddings(id) on delete cascade,
  title text not null default '',
  due_date date,
  completed_at timestamptz,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists wedding_tasks_wedding_id_idx on public.wedding_tasks (wedding_id);
create index if not exists wedding_tasks_due_date_idx on public.wedding_tasks (due_date);

drop trigger if exists wedding_tasks_set_updated_at on public.wedding_tasks;
create trigger wedding_tasks_set_updated_at
  before update on public.wedding_tasks
  for each row execute function public.set_updated_at();

alter table public.wedding_tasks enable row level security;

drop policy if exists wedding_tasks_owner_all on public.wedding_tasks;
create policy wedding_tasks_owner_all on public.wedding_tasks
  for all
  using (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_tasks.wedding_id
        and w.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.weddings w
      where w.id = wedding_tasks.wedding_id
        and w.owner_id = (select auth.uid())
    )
  );

-- Collaborator access: any user listed in wedding_collaborators for this
-- wedding can read/write tasks too. Mirrors how guests/properties are reached
-- when a wedding is shared.
drop policy if exists wedding_tasks_collaborator_all on public.wedding_tasks;
create policy wedding_tasks_collaborator_all on public.wedding_tasks
  for all
  using (
    exists (
      select 1 from public.wedding_collaborators c
      where c.wedding_id = wedding_tasks.wedding_id
        and c.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.wedding_collaborators c
      where c.wedding_id = wedding_tasks.wedding_id
        and c.user_id = (select auth.uid())
    )
  );
