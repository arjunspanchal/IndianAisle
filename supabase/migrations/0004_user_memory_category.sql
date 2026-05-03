-- The Indian Aisle — tag user_memory rows with a category so the chatbot
-- can track which profile slots are filled and resume the onboarding
-- interview after a page refresh.
--
-- Apply via the Supabase dashboard SQL editor or `psql -f`.

alter table public.user_memory
  add column if not exists category text;

create index if not exists user_memory_user_id_category_idx
  on public.user_memory(user_id, category);
