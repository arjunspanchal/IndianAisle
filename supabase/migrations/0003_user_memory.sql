-- The Indian Aisle — chatbot per-user memory.
--
-- Stores small, durable facts the chatbot has learned about the user, so
-- they persist across conversations and get injected into the system prompt
-- on every request. RLS-scoped to the owner.
--
-- Apply via the Supabase dashboard SQL editor or `psql -f`.

create table if not exists public.user_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  fact text not null,
  created_at timestamptz not null default now()
);

create index if not exists user_memory_user_id_idx on public.user_memory(user_id);

alter table public.user_memory enable row level security;

drop policy if exists user_memory_self_select on public.user_memory;
create policy user_memory_self_select on public.user_memory
  for select using (user_id = (select auth.uid()));

drop policy if exists user_memory_self_insert on public.user_memory;
create policy user_memory_self_insert on public.user_memory
  for insert with check (user_id = (select auth.uid()));

drop policy if exists user_memory_self_delete on public.user_memory;
create policy user_memory_self_delete on public.user_memory
  for delete using (user_id = (select auth.uid()));
