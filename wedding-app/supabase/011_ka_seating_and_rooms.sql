-- Sangeet tables and room numbers.
--
-- Hosts paste the list once per kind ('sangeet' or 'room'); it replaces the
-- previous list. A guest is matched to their place by the name they joined with.
--   • Sangeet tables: every guest can see their own table, their tablemates and
--     the whole chart (it is what a seating board at the door would show).
--   • Rooms: private. A guest gets back only their own room and who shares it;
--     only hosts see the full list. Vendors see neither.

create table public.ka_seating (
  id       uuid primary key default gen_random_uuid(),
  event    text not null default 'sangeet',          -- 'sangeet' | 'room'
  table_no text not null check (char_length(table_no) between 1 and 12),
  name     text not null check (char_length(name) between 1 and 60),
  sort     int  not null default 0
);
create index ka_seating_event_idx on public.ka_seating (event, sort);
alter table public.ka_seating enable row level security;
revoke all on public.ka_seating from anon, authenticated;

create function public.ka__norm(p text)
returns text language sql immutable set search_path = public as $$
  select lower(btrim(regexp_replace(coalesce(p, ''), '\s+', ' ', 'g')));
$$;
revoke execute on function public.ka__norm(text) from public, anon, authenticated;

create function public.ka_seating_get(p_token uuid, p_event text default 'sangeet')
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_table text; v_n int;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  -- exact name first
  select s.table_no into v_table from public.ka_seating s
   where s.event = p_event and public.ka__norm(s.name) = public.ka__norm(g.name)
   order by s.sort limit 1;
  -- otherwise a first-name / fuller-name match, but only if it points at exactly one place
  if v_table is null then
    select count(distinct s.table_no), min(s.table_no) into v_n, v_table from public.ka_seating s
     where s.event = p_event
       and (public.ka__norm(s.name) like public.ka__norm(g.name) || ' %'
            or public.ka__norm(g.name) like public.ka__norm(s.name) || ' %');
    if v_n is distinct from 1 then v_table := null; end if;
  end if;
  return jsonb_build_object(
    'my_table', v_table,
    'tables', (select coalesce(jsonb_agg(jsonb_build_object('table_no', t.table_no, 'names', t.names) order by t.first), '[]'::jsonb)
                 from (select s.table_no, min(s.sort) as first, jsonb_agg(s.name order by s.sort) as names
                         from public.ka_seating s
                        where s.event = p_event
                          -- rooms are private: a guest gets only their own room back
                          and (g.role = 'host' or p_event <> 'room' or s.table_no = v_table)
                        group by s.table_no) t));
end $$;

-- Hosts: replace the whole list for one kind. p_rows = [{"table_no": "4", "name": "Asha Mehta"}, …]
create function public.ka_seating_set(p_token uuid, p_rows jsonb, p_event text default 'sangeet')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform public.ka__host(p_token);
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then raise exception 'ka_bad_request'; end if;
  delete from public.ka_seating where event = p_event;
  insert into public.ka_seating (event, table_no, name, sort)
    select p_event, left(btrim(r.value->>'table_no'), 12), left(btrim(regexp_replace(r.value->>'name', '\s+', ' ', 'g')), 60), r.ordinality::int
      from jsonb_array_elements(p_rows) with ordinality r
     where btrim(coalesce(r.value->>'table_no', '')) <> '' and btrim(coalesce(r.value->>'name', '')) <> '';
  get diagnostics v_n = row_count;
  perform public.ka__poke('updates');
  return jsonb_build_object('saved', v_n);
end $$;
