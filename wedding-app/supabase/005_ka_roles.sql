-- Roles, stated in one place:
--
--   guest   guest chat rooms, camera, album, quiz, programme, the couple's updates
--   vendor  ONLY their own team's room, plus the programme and the couple's updates
--   host    everything, including every vendor room, reports and moderation
--
-- Guests never see vendors (no shared room, no leaderboard, no album), vendors
-- never see guests or other teams. 003/004 closed chat, camera and album to
-- vendors; this closes the quiz and photo likes too.

create or replace function public.ka_quiz(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'prompt', q.prompt, 'options', to_jsonb(q.options),
        'choice', a.choice,
        'answer', case when a.choice is not null or g.role = 'host' then q.answer end
      ) order by q.created_at), '[]'::jsonb)
      from public.ka_quiz_questions q
      left join public.ka_quiz_answers a on a.question_id = q.id and a.guest_id = g.id
      where q.deleted_at is null),
    'leaderboard', (select coalesce(jsonb_agg(jsonb_build_object('name', s.name, 'score', s.score, 'me', s.id = g.id)
                             order by s.score desc, s.finished), '[]'::jsonb)
      from (select x.id, x.name, count(*) filter (where a.choice = q.answer) as score, max(a.created_at) as finished
              from public.ka_quiz_answers a
              join public.ka_quiz_questions q on q.id = a.question_id and q.deleted_at is null
              join public.ka_guests x on x.id = a.guest_id and x.role <> 'vendor'
             group by x.id, x.name
             order by 3 desc, 4 limit 10) s)
  );
end $$;

create or replace function public.ka_quiz_answer(p_token uuid, p_question_id uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); q public.ka_quiz_questions;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  select * into q from public.ka_quiz_questions where id = p_question_id and deleted_at is null;
  if q.id is null then raise exception 'ka_not_found'; end if;
  if p_choice is null or p_choice < 1 or p_choice > array_length(q.options, 1) then raise exception 'ka_bad_choice'; end if;
  insert into public.ka_quiz_answers (question_id, guest_id, choice) values (q.id, g.id, p_choice)
    on conflict (question_id, guest_id) do nothing;
  return jsonb_build_object('answer', q.answer,
    'choice', (select a.choice from public.ka_quiz_answers a where a.question_id = q.id and a.guest_id = g.id));
end $$;

create or replace function public.ka_toggle_like(p_token uuid, p_photo_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_liked boolean;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if not exists (select 1 from public.ka_photos p where p.id = p_photo_id and p.deleted_at is null and p.reveal_at <= now()) then
    raise exception 'ka_not_found';
  end if;
  delete from public.ka_photo_likes where photo_id = p_photo_id and guest_id = g.id;
  v_liked := not found;
  if v_liked then insert into public.ka_photo_likes (photo_id, guest_id) values (p_photo_id, g.id); end if;
  return jsonb_build_object('liked', v_liked,
    'likes', (select count(*) from public.ka_photo_likes l where l.photo_id = p_photo_id));
end $$;
