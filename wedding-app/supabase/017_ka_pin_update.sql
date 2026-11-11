-- Hosts can pin or unpin an update after it has been posted.
-- Until now "Pin to top" could only be chosen while writing the update, and the
-- only way to take a pin off was to delete the update.

create function public.ka_pin_update(p_token uuid, p_id uuid, p_pinned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_updates set pinned = coalesce(p_pinned, false)
   where id = p_id and deleted_at is null;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;
