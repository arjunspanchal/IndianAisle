-- RSVP names, properly: the person replying gives a first and last name, and
-- so does everyone coming with them (ka_rsvps.companions = [{first, last}, …]).
-- The headcount is then simply 1 + the number of companions.
--
-- The old free-text "other names" field is still filled in (from the
-- companions) so older copies of the app and the host summary keep working,
-- and ka_rsvp_set still accepts the older call without the new arguments.

alter table public.ka_rsvps add column first_name text not null default '' check (char_length(first_name) <= 40);
alter table public.ka_rsvps add column last_name text not null default '' check (char_length(last_name) <= 40);
alter table public.ka_rsvps add column companions jsonb not null default '[]'::jsonb;

create or replace function public.ka_rsvp_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select jsonb_build_object('attending', r.attending, 'people', r.people, 'other_names', r.other_names,
                                    'first_name', r.first_name, 'last_name', r.last_name, 'companions', r.companions,
                                    'phone', r.phone, 'food', r.food, 'message', r.message, 'updated_at', r.updated_at)
            from public.ka_rsvps r where r.guest_id = g.id);
end $$;

drop function public.ka_rsvp_set(uuid, boolean, int, text, text, text, text);
create function public.ka_rsvp_set(p_token uuid, p_attending boolean, p_people int default 1,
  p_other_names text default '', p_phone text default '', p_food text default '', p_message text default '',
  p_first_name text default '', p_last_name text default '', p_companions jsonb default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v_comp jsonb := '[]'::jsonb;
  v_people int := least(greatest(coalesce(p_people, 1), 1), 12);
  v_others text := left(btrim(coalesce(p_other_names, '')), 400);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if p_attending is null then raise exception 'ka_bad_request'; end if;
  if p_companions is not null and jsonb_typeof(p_companions) = 'array' then
    select coalesce(jsonb_agg(jsonb_build_object('first', left(btrim(c.value->>'first'), 40), 'last', left(btrim(c.value->>'last'), 40))
                              order by c.ordinality), '[]'::jsonb)
      into v_comp
      from jsonb_array_elements(p_companions) with ordinality c
     where btrim(coalesce(c.value->>'first', '')) <> '' or btrim(coalesce(c.value->>'last', '')) <> '';
    if jsonb_array_length(v_comp) > 11 then raise exception 'ka_bad_request'; end if;
    v_people := 1 + jsonb_array_length(v_comp);
    v_others := left((select coalesce(string_agg(btrim((c.value->>'first') || ' ' || (c.value->>'last')), ', '), '')
                        from jsonb_array_elements(v_comp) c), 400);
  end if;
  insert into public.ka_rsvps (guest_id, attending, people, other_names, phone, food, message, first_name, last_name, companions)
    values (g.id, p_attending, v_people, v_others,
            left(btrim(coalesce(p_phone, '')), 24), left(btrim(coalesce(p_food, '')), 200), left(btrim(coalesce(p_message, '')), 600),
            left(btrim(coalesce(p_first_name, '')), 40), left(btrim(coalesce(p_last_name, '')), 40), v_comp)
  on conflict (guest_id) do update set attending = excluded.attending, people = excluded.people,
    other_names = excluded.other_names, phone = excluded.phone, food = excluded.food, message = excluded.message,
    first_name = excluded.first_name, last_name = excluded.last_name, companions = excluded.companions, updated_at = now();
  perform public.ka__poke('updates');
end $$;

create or replace function public.ka_rsvp_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  return jsonb_build_object(
    'coming', (select count(*) from public.ka_rsvps r where r.attending),
    'headcount', (select coalesce(sum(r.people), 0) from public.ka_rsvps r where r.attending),
    'not_coming', (select count(*) from public.ka_rsvps r where not r.attending),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', case when btrim(r.first_name || ' ' || r.last_name) <> '' then btrim(r.first_name || ' ' || r.last_name) else a.name end,
        'first_name', r.first_name, 'last_name', r.last_name, 'companions', r.companions,
        'attending', r.attending, 'people', r.people, 'other_names', r.other_names,
        'phone', r.phone, 'food', r.food, 'message', r.message, 'updated_at', r.updated_at)
        order by r.attending desc, r.last_name, a.name), '[]'::jsonb)
      from public.ka_rsvps r join public.ka_guests a on a.id = r.guest_id),
    'no_reply', (select coalesce(jsonb_agg(a.name order by a.name), '[]'::jsonb) from public.ka_guests a
                  where a.role = 'guest' and a.name <> 'Former guest'
                    and not exists (select 1 from public.ka_rsvps r where r.guest_id = a.id)));
end $$;
