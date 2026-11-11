-- 1. The programme, re-seeded from the live wedding website (kashika-arjun.com,
--    read 12 Nov 2026), which is newer than the wedding.json that 001 used.
-- 2. "What to wear": a dress line per event, set by hosts from the app.

alter table public.ka_events add column dress text not null default '' check (char_length(dress) <= 200);

delete from public.ka_events;

insert into public.ka_events (day, starts_at, ends_at, time_label, title, note, sort) values
  (1, '2027-01-17 11:00+05:30', '2027-01-17 14:00+05:30', '11:00 am onwards', 'Guest arrival', 'Welcome drink on arrival. Rooms are ready from 2:00 pm.', 1),
  (1, '2027-01-17 12:30+05:30', '2027-01-17 15:00+05:30', '12:30 – 3:00 pm', 'Lunch', 'Chaat and more, inside the restaurant', 2),
  (1, '2027-01-17 14:00+05:30', '2027-01-17 15:00+05:30', '2:00 pm', 'Check-in', 'Rooms are ready from 2:00 pm', 3),
  (1, '2027-01-17 15:00+05:30', '2027-01-17 17:00+05:30', '3:00 pm onwards', 'Haldi', 'At Al fresco, behind the restaurant. Kashika & Arjun join at 3:30. Wear something you can stain.', 4),
  (1, '2027-01-17 17:00+05:30', '2027-01-17 18:00+05:30', '5:00 – 6:00 pm', 'High tea', '', 5),
  (1, '2027-01-17 17:00+05:30', '2027-01-17 18:30+05:30', '5:00 – 6:30 pm', 'Sangeet rehearsal', 'For everyone performing at the Sangeet. Room details on WhatsApp.', 6),
  (1, '2027-01-17 19:00+05:30', '2027-01-17 23:00+05:30', '7:00 – 11:00 pm', 'Dinner', 'Inside the restaurant, open all evening', 7),
  (1, '2027-01-17 19:30+05:30', '2027-01-17 23:00+05:30', '7:30 pm onwards', 'Sangeet', 'At Al fresco. Family performances, then the dance floor opens.', 8),
  (1, '2027-01-17 23:00+05:30', '2027-01-18 01:00+05:30', '11:00 pm onwards', 'Afterparty', 'In the indoor banquet hall', 9),
  (2, '2027-01-18 07:15+05:30', '2027-01-18 08:00+05:30', '7:15 am', 'Devgon', 'Kashika''s family. A Kashmiri Pandit blessing for the bride. Everyone else, enjoy a slow morning.', 1),
  (2, '2027-01-18 08:00+05:30', '2027-01-18 11:00+05:30', '8:00 – 11:00 am', 'Breakfast', '', 2),
  (2, '2027-01-18 13:00+05:30', '2027-01-18 15:00+05:30', '1:00 – 3:00 pm', 'Lunch', 'Inside the restaurant', 3),
  (2, '2027-01-18 15:30+05:30', '2027-01-18 16:30+05:30', '3:30 pm onwards', 'Kahwa & hot snacks', '', 4),
  (2, '2027-01-18 15:45+05:30', '2027-01-18 16:45+05:30', '3:45 pm', 'Baraat procession', 'From the Garden Lawn to the Spa Deck. Everyone dances! Dancers, please gather at 3:15 pm.', 5),
  (2, '2027-01-18 16:45+05:30', '2027-01-18 17:00+05:30', '4:45 pm', 'Bride''s entry', 'On the Spa Deck', 6),
  (2, '2027-01-18 17:00+05:30', '2027-01-18 17:30+05:30', '5:00 pm', 'Varmala', 'Kashika & Arjun exchange garlands at golden hour', 7),
  (2, '2027-01-18 17:00+05:30', '2027-01-18 18:00+05:30', '5:00 – 6:00 pm', 'High tea', '', 8),
  (2, '2027-01-18 18:00+05:30', '2027-01-18 19:15+05:30', '6:00 pm', 'Pheras', 'The wedding vows around the sacred fire. Close family sits on the Spa Deck; everyone else watches from just behind the bridge.', 9),
  (2, '2027-01-18 19:00+05:30', '2027-01-18 23:00+05:30', '7:00 – 11:00 pm', 'Dinner', 'Inside the restaurant', 10),
  (2, '2027-01-18 19:15+05:30', '2027-01-18 19:45+05:30', '7:15 pm', 'Posh puja', 'A Kashmiri flower shower. Everyone showers the couple with petals.', 11),
  (3, '2027-01-19 08:00+05:30', '2027-01-19 11:00+05:30', '8:00 – 11:00 am', 'Breakfast', '', 1),
  (3, '2027-01-19 11:00+05:30', '2027-01-19 12:00+05:30', '11:00 am', 'Check-out', '', 2);

-- Hosts set (or clear) what to wear for an event.
create function public.ka_event_set_dress(p_token uuid, p_event_id uuid, p_dress text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_events set dress = left(btrim(coalesce(p_dress, '')), 200) where id = p_event_id;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

create or replace function public.ka_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'now', now(),
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'role', g.role, 'team', g.team),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'day', e.day, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'time_label', e.time_label, 'title', e.title, 'note', e.note, 'location', e.location, 'dress', e.dress)
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
