# Supabase schema

`migrations/0001_wedding_app_init.sql` is the **single source of truth** for the wedding-app's database. Apply it to any Supabase project to get a working back-end.

## Current project

The app is currently pointed at the shared **`hyrox-app`** Supabase project (ref `frpfgpdknrxxxvyojyev`) — it's the only Supabase project on the user's account that holds the `wedding_*` tables. This is a co-tenancy of convenience and we'll move to a dedicated project later.

## Switching to a new Supabase project

1. Create a new Supabase project (any region).
2. Open the dashboard SQL editor → paste & run `migrations/0001_wedding_app_init.sql`. The script is idempotent so re-running it is safe.
3. Copy the new project's URL + anon key into env vars:
   - Local: `.env.local`
     - `NEXT_PUBLIC_SUPABASE_URL=https://<new-ref>.supabase.co`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY=<new-anon-key>`
   - Vercel: `vercel env add NEXT_PUBLIC_SUPABASE_URL production` (and `preview`, `development`), repeat for the anon key.
4. Redeploy. No code changes needed — the app reads everything from env.

## Data migration (if you have data on the old project)

If you have rows on `hyrox-app` you want to bring across:

```bash
# from the old project
supabase db dump --data-only --schema public --table 'wedding_*' > wedding_data.sql
# on the new project
psql "$NEW_DB_URL" -f wedding_data.sql
```

(Or `pg_dump`/`pg_restore` directly if you have the connection string.)
