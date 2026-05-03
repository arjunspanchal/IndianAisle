-- Self-serve account deletion.
--
-- The schema already cascades on `auth.users(id) on delete cascade`, so deleting
-- the auth row automatically removes the user's profile, weddings, properties,
-- guests, rooms, meals, and budget lines.
--
-- We expose a security-definer RPC so the authenticated user can delete only
-- their own auth.users row without needing the service-role key in the app.

create or replace function public.delete_account()
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  if uid is null then
    raise exception 'not authenticated';
  end if;
  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_account() from public;
grant execute on function public.delete_account() to authenticated;
