-- Phone numbers guests can call from the app: the resort's reception and the
-- wedding planner. Hosts set them in the app (You → Phone numbers); a button
-- only appears once its number has been set.

create or replace function public.ka_sos_state(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'contact_name',  (select value from public.ka_config where key = 'sos_contact_name'),
    'contact_phone', (select value from public.ka_config where key = 'sos_contact_phone'),
    'reception_phone', (select value from public.ka_config where key = 'reception_phone'),
    'open', case when g.role = 'host' then
      (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'by', a.name, 'role', a.role, 'team', a.team,
                                 'note', s.note, 'created_at', s.created_at) order by s.created_at desc), '[]'::jsonb)
         from public.ka_sos s join public.ka_guests a on a.id = s.guest_id
        where s.resolved_at is null)
      else '[]'::jsonb end);
end $$;

-- Hosts: set or clear (empty = clear) the three contact values.
create function public.ka_contacts_set(p_token uuid, p_reception_phone text, p_planner_name text, p_planner_phone text)
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  perform public.ka__host(p_token);
  for r in select * from (values ('reception_phone', p_reception_phone), ('sos_contact_name', p_planner_name),
                                 ('sos_contact_phone', p_planner_phone)) as t(k, v) loop
    if btrim(coalesce(r.v, '')) = '' then
      delete from public.ka_config where key = r.k;
    else
      insert into public.ka_config (key, value) values (r.k, left(btrim(r.v), 60))
        on conflict (key) do update set value = excluded.value;
    end if;
  end loop;
  perform public.ka__poke('updates');
end $$;
