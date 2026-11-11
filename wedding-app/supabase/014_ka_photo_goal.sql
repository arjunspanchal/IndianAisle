-- A gentle push to fill the album: every guest has a photo goal (50 by default;
-- change it with a ka_config row 'photo_goal'). Camera shots and photos added
-- from the phone both count. Reaching it earns a badge in the app; the album
-- also shows a leaderboard of the ten people who have contributed most, with
-- 1st, 2nd and 3rd place marked. If the couple decide on prizes, put the wording
-- in a ka_config row 'photo_prize' and it appears under the leaderboard.

create function public.ka_photo_goal(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v_goal int := coalesce((select nullif(value, '')::int from public.ka_config where key = 'photo_goal'), 50);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return jsonb_build_object(
    'goal', v_goal,
    'prize', (select value from public.ka_config where key = 'photo_prize'),
    'mine', (select count(*) from public.ka_photos p
              where p.guest_id = g.id and p.uploaded_at is not null and p.deleted_at is null),
    'reached', (select count(*) from (select p.guest_id from public.ka_photos p
                                       where p.uploaded_at is not null and p.deleted_at is null
                                       group by p.guest_id having count(*) >= v_goal) x),
    'top', (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'count', t.n, 'me', t.id = g.id)
                             order by t.n desc, t.name), '[]'::jsonb)
              from (select a.id, a.name, count(*) as n
                      from public.ka_photos p join public.ka_guests a on a.id = p.guest_id
                     where p.uploaded_at is not null and p.deleted_at is null and a.role <> 'vendor' and a.name <> 'Former guest'
                     group by a.id, a.name order by n desc, a.name limit 10) t));
end $$;
