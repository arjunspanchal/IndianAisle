-- The outfits guide: for each function, where it is held, whether there is a
-- colour code, colours suggested for guests, and what the bride and groom are
-- wearing. Hosts fill it in from the app; until they do, guests see "coming soon".
--
-- It lives on the programme's own events so a function has one "what to wear"
-- (the existing `dress` text), not two.

alter table public.ka_events
  add column in_outfits    boolean not null default false,
  add column setting       text    not null default '' check (setting in ('', 'open', 'indoor')),
  add column dress_code    text    not null default '' check (dress_code in ('', 'coded', 'free')),
  add column guest_colours text[]  not null default '{}',
  add column bride_colour  text    not null default '',
  add column groom_colour  text    not null default '';

-- The functions guests dress for, to start the guide off. Hosts can add or remove any event.
update public.ka_events set in_outfits = true
 where title in ('Haldi', 'Sangeet', 'Afterparty', 'Baraat procession');

-- Colours are short names from the app's palette ("marigold", "sage"), never free text.
create function public.ka__colour(p text)
returns text language sql immutable as $$
  select case when lower(btrim(coalesce(p, ''))) ~ '^[a-z][a-z-]{1,23}$' then lower(btrim(p)) else '' end
$$;
revoke execute on function public.ka__colour(text) from public, anon, authenticated;

create function public.ka_event_set_outfit(
  p_token uuid,
  p_event_id uuid,
  p_in_outfits boolean,
  p_setting text,
  p_dress_code text,
  p_dress text,
  p_guest_colours text[],
  p_bride_colour text,
  p_groom_colour text
) returns void language plpgsql security definer set search_path = public as $$
declare v_colours text[];
begin
  perform public.ka__host(p_token);
  if coalesce(p_setting, '') not in ('', 'open', 'indoor') or coalesce(p_dress_code, '') not in ('', 'coded', 'free') then
    raise exception 'ka_bad_input';
  end if;
  select coalesce(array_agg(c order by n), '{}') into v_colours
    from (select public.ka__colour(x) as c, min(n) as n
            from unnest(coalesce(p_guest_colours, '{}')) with ordinality as t(x, n)
           group by 1) s
   where c <> '';
  update public.ka_events
     set in_outfits    = coalesce(p_in_outfits, false),
         setting       = coalesce(p_setting, ''),
         dress_code    = coalesce(p_dress_code, ''),
         dress         = left(btrim(coalesce(p_dress, '')), 200),
         guest_colours = v_colours[1:6],
         bride_colour  = public.ka__colour(p_bride_colour),
         groom_colour  = public.ka__colour(p_groom_colour)
   where id = p_event_id;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

-- The programme now carries the outfit details too.
create or replace function public.ka_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'now', now(),
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'role', g.role, 'team', g.team),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'day', e.day, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'time_label', e.time_label, 'title', e.title, 'note', e.note, 'location', e.location, 'dress', e.dress,
        'in_outfits', e.in_outfits, 'setting', e.setting, 'dress_code', e.dress_code,
        'guest_colours', to_jsonb(e.guest_colours), 'bride_colour', e.bride_colour, 'groom_colour', e.groom_colour)
        order by e.starts_at, e.sort), '[]'::jsonb) from public.ka_events e),
    'updates', (select coalesce(jsonb_agg(u.j order by u.pinned desc, u.created_at desc), '[]'::jsonb) from (
        select x.pinned, x.created_at, jsonb_build_object('id', x.id, 'body', x.body, 'pinned', x.pinned,
                 'created_at', x.created_at, 'by', a.name) as j
          from public.ka_updates x join public.ka_guests a on a.id = x.guest_id
         where x.deleted_at is null
         order by x.pinned desc, x.created_at desc limit 40) u),
    'camera', public.ka__camera(g.id),
    'quiz', jsonb_build_object(
      'total', (select count(*) from public.ka_quiz_questions q where q.deleted_at is null),
      'answered', (select count(*) from public.ka_quiz_answers a
                     join public.ka_quiz_questions q on q.id = a.question_id and q.deleted_at is null
                    where a.guest_id = g.id))
  );
end $$;
