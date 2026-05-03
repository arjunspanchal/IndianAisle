-- Optional custom display name for a wedding.
--
-- Until now, a wedding has been identified in lists/headers by `couple_names`
-- (e.g. "Kash & Arjun"). Some users want a separate, friendlier title for the
-- wedding itself ("Smith–Johnson Wedding", "The Big Indian Bash"). `name` is
-- optional — when blank, the UI falls back to `couple_names`.

alter table public.weddings
  add column if not exists name text not null default '';
