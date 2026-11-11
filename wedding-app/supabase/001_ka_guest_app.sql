-- Kashika & Arjun — wedding guest app backend.
--
-- Lives in the IndianAisle Supabase project alongside the product tables, so
-- every object is prefixed ka_ and nothing here touches existing tables.
--
-- Access model: guests have no Supabase Auth account. They join with the
-- invite code + their name and get back a secret token (ka_guests.token) that
-- the app keeps on the phone. Every table has RLS on with NO policies, so the
-- anon key can read and write nothing directly; all access goes through the
-- SECURITY DEFINER functions below, each of which takes the token.
--
-- Invite codes are NOT in this file. Seed them once, by hand:
--   insert into ka_config(key, value) values ('guest_code', '…'), ('host_code', '…');

-- ───────────────────────── tables ─────────────────────────

create table public.ka_config (
  key   text primary key,
  value text not null
);

create table public.ka_guests (
  id           uuid primary key default gen_random_uuid(),
  token        uuid not null unique default gen_random_uuid(),
  name         text not null check (char_length(name) between 2 and 40),
  role         text not null default 'guest' check (role in ('guest', 'host')),
  created_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

-- The programme guests see. Seeded from wedding.json (guest-facing rows only).
create table public.ka_events (
  id         uuid primary key default gen_random_uuid(),
  day        int  not null check (day between 1 and 3),
  starts_at  timestamptz not null,
  ends_at    timestamptz,
  time_label text not null,
  title      text not null,
  note       text not null default '',
  location   text not null default '',
  sort       int  not null default 0
);

create table public.ka_updates (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.ka_guests(id),
  body       text not null check (char_length(body) between 1 and 600),
  pinned     boolean not null default false,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index ka_updates_created_idx on public.ka_updates (created_at desc);
create index ka_updates_guest_idx on public.ka_updates (guest_id);

create table public.ka_channels (
  slug  text primary key,
  name  text not null,
  blurb text not null default '',
  sort  int  not null default 0
);

create table public.ka_messages (
  id         uuid primary key default gen_random_uuid(),
  channel    text not null references public.ka_channels(slug),
  guest_id   uuid not null references public.ka_guests(id),
  body       text not null check (char_length(body) between 1 and 1000),
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index ka_messages_channel_idx on public.ka_messages (channel, created_at desc);
create index ka_messages_guest_idx on public.ka_messages (guest_id, created_at desc);

create table public.ka_reactions (
  message_id uuid not null references public.ka_messages(id) on delete cascade,
  guest_id   uuid not null references public.ka_guests(id),
  emoji      text not null check (emoji in ('❤️', '😂', '🎉', '🙏', '👏')),
  primary key (message_id, guest_id, emoji)
);
create index ka_reactions_guest_idx on public.ka_reactions (guest_id);

-- One row per shot on a guest's disposable camera.
--   day       = the IST calendar day the shot was taken (one 27-shot roll per day)
--   reveal_at = 9:00 am IST the next morning; nobody sees the photo before then
--   client_id = id the phone gave the shot, so a retried upload never burns two shots
create table public.ka_photos (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.ka_guests(id),
  client_id   uuid not null,
  day         date not null,
  path        text not null unique,
  taken_at    timestamptz not null,
  reveal_at   timestamptz not null,
  width       int,
  height      int,
  created_at  timestamptz not null default now(),
  uploaded_at timestamptz,
  deleted_at  timestamptz,
  unique (guest_id, client_id)
);
create index ka_photos_day_idx on public.ka_photos (day, taken_at);
create index ka_photos_guest_day_idx on public.ka_photos (guest_id, day);

create table public.ka_photo_likes (
  photo_id uuid not null references public.ka_photos(id) on delete cascade,
  guest_id uuid not null references public.ka_guests(id),
  primary key (photo_id, guest_id)
);
create index ka_photo_likes_guest_idx on public.ka_photo_likes (guest_id);

create table public.ka_quiz_questions (
  id         uuid primary key default gen_random_uuid(),
  prompt     text not null check (char_length(prompt) between 3 and 200),
  options    text[] not null check (array_length(options, 1) between 2 and 4),
  answer     int not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (answer between 1 and array_length(options, 1))
);

create table public.ka_quiz_answers (
  question_id uuid not null references public.ka_quiz_questions(id) on delete cascade,
  guest_id    uuid not null references public.ka_guests(id),
  choice      int not null,
  created_at  timestamptz not null default now(),
  primary key (question_id, guest_id)
);
create index ka_quiz_answers_guest_idx on public.ka_quiz_answers (guest_id);

alter table public.ka_config         enable row level security;
alter table public.ka_guests         enable row level security;
alter table public.ka_events         enable row level security;
alter table public.ka_updates        enable row level security;
alter table public.ka_channels       enable row level security;
alter table public.ka_messages       enable row level security;
alter table public.ka_reactions      enable row level security;
alter table public.ka_photos         enable row level security;
alter table public.ka_photo_likes    enable row level security;
alter table public.ka_quiz_questions enable row level security;
alter table public.ka_quiz_answers   enable row level security;

revoke all on public.ka_config, public.ka_guests, public.ka_events, public.ka_updates,
  public.ka_channels, public.ka_messages, public.ka_reactions, public.ka_photos,
  public.ka_photo_likes, public.ka_quiz_questions, public.ka_quiz_answers
  from anon, authenticated;

-- ───────────────────────── internal helpers ─────────────────────────

-- Resolve a token to its guest (and note they were here). Raises if unknown.
create function public.ka__guest(p_token uuid)
returns public.ka_guests
language plpgsql security definer set search_path = public as $$
declare v public.ka_guests;
begin
  update public.ka_guests set last_seen_at = now() where token = p_token returning * into v;
  if v.id is null then raise exception 'ka_unauthorized'; end if;
  return v;
end $$;

create function public.ka__host(p_token uuid)
returns public.ka_guests
language plpgsql security definer set search_path = public as $$
declare v public.ka_guests := public.ka__guest(p_token);
begin
  if v.role <> 'host' then raise exception 'ka_hosts_only'; end if;
  return v;
end $$;

create function public.ka__reveal_at(p_day date)
returns timestamptz language sql immutable set search_path = public as $$
  select ((p_day + 1)::timestamp + time '09:00') at time zone 'Asia/Kolkata';
$$;

-- Nudge every open app. Carries no content, only "something of this kind changed".
create function public.ka__poke(p_event text, p_payload jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform realtime.send(p_payload, p_event, 'ka-live', false);
exception when others then
  null; -- live nudges are best-effort; never fail the write that caused them
end $$;

create function public.ka__camera(p_guest uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
  select jsonb_build_object(
    'day', t.d,
    'limit', 27,
    'used', (select count(*) from public.ka_photos p where p.guest_id = p_guest and p.day = t.d),
    'reveal_at', public.ka__reveal_at(t.d),
    'developing', (select count(*) from public.ka_photos p
                    where p.guest_id = p_guest and p.uploaded_at is not null
                      and p.deleted_at is null and p.reveal_at > now())
  ) from today t;
$$;

revoke execute on function public.ka__guest(uuid), public.ka__host(uuid),
  public.ka__reveal_at(date), public.ka__poke(text, jsonb), public.ka__camera(uuid)
  from public, anon, authenticated;

-- ───────────────────────── joining ─────────────────────────

create function public.ka_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_role text;
  v public.ka_guests;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then raise exception 'ka_bad_name'; end if;
  select case c.key when 'host_code' then 'host' else 'guest' end into v_role
    from public.ka_config c
   where c.key in ('guest_code', 'host_code') and upper(c.value) = v_code and v_code <> ''
   order by c.key desc limit 1;
  if v_role is null then
    perform pg_sleep(0.6); -- slow down guessing
    raise exception 'ka_bad_code';
  end if;
  insert into public.ka_guests (name, role) values (v_name, v_role) returning * into v;
  return jsonb_build_object('token', v.token,
    'guest', jsonb_build_object('id', v.id, 'name', v.name, 'role', v.role));
end $$;

-- ───────────────────────── home: programme + live updates ─────────────────────────

create function public.ka_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'now', now(),
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'role', g.role),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'day', e.day, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'time_label', e.time_label, 'title', e.title, 'note', e.note, 'location', e.location)
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

create function public.ka_post_update(p_token uuid, p_body text, p_pinned boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__host(p_token); v_id uuid;
begin
  if char_length(btrim(coalesce(p_body, ''))) = 0 then raise exception 'ka_empty'; end if;
  insert into public.ka_updates (guest_id, body, pinned)
    values (g.id, btrim(p_body), coalesce(p_pinned, false)) returning id into v_id;
  perform public.ka__poke('updates');
  return jsonb_build_object('id', v_id);
end $$;

create function public.ka_delete_update(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_updates set deleted_at = now() where id = p_id;
  perform public.ka__poke('updates');
end $$;

-- ───────────────────────── chat ─────────────────────────

create function public.ka_channels_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__guest(p_token);
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'name', c.name, 'blurb', c.blurb,
      'count', (select count(*) from public.ka_messages m where m.channel = c.slug and m.deleted_at is null),
      'last', (select jsonb_build_object('body', m.body, 'by', a.name, 'created_at', m.created_at)
                 from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
                where m.channel = c.slug and m.deleted_at is null
                order by m.created_at desc limit 1))
      order by c.sort), '[]'::jsonb) from public.ka_channels c);
end $$;

-- Newest first; pass the oldest created_at you hold as p_before to page back.
create function public.ka_messages_list(p_token uuid, p_channel text,
  p_before timestamptz default null, p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return (select coalesce(jsonb_agg(t.j order by t.created_at desc), '[]'::jsonb) from (
    select m.created_at, jsonb_build_object(
        'id', m.id, 'body', m.body, 'created_at', m.created_at,
        'by', a.name, 'host', a.role = 'host', 'mine', m.guest_id = g.id,
        'reactions', (select coalesce(jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.n, 'mine', r.mine)
                              order by r.emoji), '[]'::jsonb)
                        from (select x.emoji, count(*) as n, bool_or(x.guest_id = g.id) as mine
                                from public.ka_reactions x where x.message_id = m.id group by x.emoji) r)
      ) as j
      from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
     where m.channel = p_channel and m.deleted_at is null
       and (p_before is null or m.created_at < p_before)
     order by m.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 100)) t);
end $$;

create function public.ka_send_message(p_token uuid, p_channel text, p_body text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_body text := btrim(coalesce(p_body, '')); v public.ka_messages;
begin
  if char_length(v_body) = 0 then raise exception 'ka_empty'; end if;
  if char_length(v_body) > 1000 then raise exception 'ka_too_long'; end if;
  if not exists (select 1 from public.ka_channels c where c.slug = p_channel) then raise exception 'ka_no_channel'; end if;
  if (select count(*) from public.ka_messages m
       where m.guest_id = g.id and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'ka_slow_down';
  end if;
  insert into public.ka_messages (channel, guest_id, body) values (p_channel, g.id, v_body) returning * into v;
  perform public.ka__poke('chat', jsonb_build_object('channel', p_channel));
  return jsonb_build_object('id', v.id, 'created_at', v.created_at);
end $$;

create function public.ka_delete_message(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_channel text;
begin
  update public.ka_messages set deleted_at = now()
   where id = p_id and deleted_at is null and (guest_id = g.id or g.role = 'host')
   returning channel into v_channel;
  if v_channel is null then raise exception 'ka_not_allowed'; end if;
  perform public.ka__poke('chat', jsonb_build_object('channel', v_channel));
end $$;

create function public.ka_toggle_reaction(p_token uuid, p_message_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_channel text;
begin
  select channel into v_channel from public.ka_messages where id = p_message_id and deleted_at is null;
  if v_channel is null then raise exception 'ka_not_found'; end if;
  delete from public.ka_reactions where message_id = p_message_id and guest_id = g.id and emoji = p_emoji;
  if not found then
    insert into public.ka_reactions (message_id, guest_id, emoji) values (p_message_id, g.id, p_emoji);
  end if;
  perform public.ka__poke('chat', jsonb_build_object('channel', v_channel));
end $$;

-- ───────────────────────── disposable camera ─────────────────────────

create function public.ka_camera_state(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return public.ka__camera(g.id);
end $$;

-- Step 1 of an upload: claim a frame on the roll and get the storage path to
-- upload to. Safe to call again with the same p_client_id (returns the same frame).
create function public.ka_reserve_shot(p_token uuid, p_client_id uuid, p_taken_at timestamptz,
  p_width int default null, p_height int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v public.ka_photos;
  v_taken timestamptz := least(greatest(coalesce(p_taken_at, now()), now() - interval '4 days'), now());
  v_day date := (v_taken at time zone 'Asia/Kolkata')::date;
begin
  select * into v from public.ka_photos where guest_id = g.id and client_id = p_client_id;
  if v.id is null then
    perform pg_advisory_xact_lock(hashtext(g.id::text));
    if (select count(*) from public.ka_photos p where p.guest_id = g.id and p.day = v_day) >= 27 then
      raise exception 'ka_roll_finished';
    end if;
    insert into public.ka_photos (guest_id, client_id, day, path, taken_at, reveal_at, width, height)
      values (g.id, p_client_id, v_day, v_day::text || '/' || gen_random_uuid()::text || '.jpg',
              v_taken, public.ka__reveal_at(v_day), p_width, p_height)
      returning * into v;
  end if;
  return jsonb_build_object('photo_id', v.id, 'path', v.path, 'uploaded', v.uploaded_at is not null);
end $$;

-- Step 3 (after the file is in storage): mark the frame as exposed.
create function public.ka_confirm_shot(p_token uuid, p_photo_id uuid)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare g public.ka_guests := public.ka__guest(p_token); v public.ka_photos;
begin
  select * into v from public.ka_photos where id = p_photo_id and guest_id = g.id;
  if v.id is null then raise exception 'ka_not_found'; end if;
  if v.uploaded_at is null then
    if not exists (select 1 from storage.objects o where o.bucket_id = 'ka-photos' and o.name = v.path) then
      raise exception 'ka_not_uploaded';
    end if;
    update public.ka_photos set uploaded_at = now() where id = v.id;
  end if;
  return public.ka__camera(g.id);
end $$;

-- Used by the storage policy: a file may be written only at a path that a
-- guest has reserved and not yet filled. Each shot is stored twice: the photo
-- at ka_photos.path and a small grid thumbnail at 't/' || path.
create function public.ka_can_upload(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.uploaded_at is null and (p.path = p_name or 't/' || p.path = p_name));
$$;

create function public.ka_album(p_token uuid, p_day date default null, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_day date;
begin
  v_day := coalesce(p_day, (select max(p.day) from public.ka_photos p
                             where p.uploaded_at is not null and p.deleted_at is null and p.reveal_at <= now()));
  return jsonb_build_object(
    'now', now(),
    'day', v_day,
    'days', (select coalesce(jsonb_agg(jsonb_build_object(
        'day', d.day, 'reveal_at', public.ka__reveal_at(d.day),
        'ready', d.ready, 'developing', d.developing) order by d.day), '[]'::jsonb)
      from (select p.day,
                   count(*) filter (where p.reveal_at <= now()) as ready,
                   count(*) filter (where p.reveal_at > now()) as developing
              from public.ka_photos p
             where p.uploaded_at is not null and p.deleted_at is null
             group by p.day) d),
    'photos', (select coalesce(jsonb_agg(t.j order by t.taken_at, t.id), '[]'::jsonb) from (
        select p.taken_at, p.id, jsonb_build_object(
            'id', p.id, 'path', p.path, 'taken_at', p.taken_at, 'width', p.width, 'height', p.height,
            'by', a.name, 'mine', p.guest_id = g.id,
            'likes', (select count(*) from public.ka_photo_likes l where l.photo_id = p.id),
            'liked', exists (select 1 from public.ka_photo_likes l where l.photo_id = p.id and l.guest_id = g.id)
          ) as j
          from public.ka_photos p join public.ka_guests a on a.id = p.guest_id
         where p.day = v_day and p.uploaded_at is not null and p.deleted_at is null and p.reveal_at <= now()
         order by p.taken_at, p.id
         offset greatest(coalesce(p_offset, 0), 0) limit 90) t)
  );
end $$;

create function public.ka_toggle_like(p_token uuid, p_photo_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_liked boolean;
begin
  if not exists (select 1 from public.ka_photos p where p.id = p_photo_id and p.deleted_at is null and p.reveal_at <= now()) then
    raise exception 'ka_not_found';
  end if;
  delete from public.ka_photo_likes where photo_id = p_photo_id and guest_id = g.id;
  v_liked := not found;
  if v_liked then insert into public.ka_photo_likes (photo_id, guest_id) values (p_photo_id, g.id); end if;
  return jsonb_build_object('liked', v_liked,
    'likes', (select count(*) from public.ka_photo_likes l where l.photo_id = p_photo_id));
end $$;

create function public.ka_delete_photo(p_token uuid, p_photo_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  update public.ka_photos set deleted_at = now()
   where id = p_photo_id and deleted_at is null and (guest_id = g.id or g.role = 'host');
  if not found then raise exception 'ka_not_allowed'; end if;
  perform public.ka__poke('album');
end $$;

-- Hosts can open the darkroom early (also handy for trying the app before the wedding).
create function public.ka_develop_now(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform public.ka__host(p_token);
  update public.ka_photos set reveal_at = now() where reveal_at > now() and uploaded_at is not null;
  get diagnostics v_n = row_count;
  perform public.ka__poke('album');
  return jsonb_build_object('developed', v_n);
end $$;

-- ───────────────────────── couple quiz ─────────────────────────

create function public.ka_quiz(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'questions', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', q.id, 'prompt', q.prompt, 'options', to_jsonb(q.options),
        'choice', a.choice,
        -- the right answer is only sent once you have answered (hosts always see it)
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
              join public.ka_guests x on x.id = a.guest_id
             group by x.id, x.name
             order by 3 desc, 4 limit 10) s)
  );
end $$;

create function public.ka_quiz_answer(p_token uuid, p_question_id uuid, p_choice int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); q public.ka_quiz_questions;
begin
  select * into q from public.ka_quiz_questions where id = p_question_id and deleted_at is null;
  if q.id is null then raise exception 'ka_not_found'; end if;
  if p_choice is null or p_choice < 1 or p_choice > array_length(q.options, 1) then raise exception 'ka_bad_choice'; end if;
  insert into public.ka_quiz_answers (question_id, guest_id, choice) values (q.id, g.id, p_choice)
    on conflict (question_id, guest_id) do nothing; -- first answer stands
  return jsonb_build_object('answer', q.answer,
    'choice', (select a.choice from public.ka_quiz_answers a where a.question_id = q.id and a.guest_id = g.id));
end $$;

create function public.ka_quiz_save(p_token uuid, p_prompt text, p_options text[], p_answer int)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  perform public.ka__host(p_token);
  insert into public.ka_quiz_questions (prompt, options, answer)
    values (btrim(p_prompt), p_options, p_answer) returning id into v_id;
  perform public.ka__poke('quiz');
  return jsonb_build_object('id', v_id);
end $$;

create function public.ka_quiz_delete(p_token uuid, p_question_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_quiz_questions set deleted_at = now() where id = p_question_id;
  perform public.ka__poke('quiz');
end $$;

-- ───────────────────────── photo storage ─────────────────────────

-- Public bucket: a photo is fetched by its unguessable path, and the app is
-- only told a path once the photo has developed. JPEG only, 3 MB cap.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ka-photos', 'ka-photos', true, 3145728, array['image/jpeg'])
on conflict (id) do nothing;

create policy "ka guests upload reserved shots"
  on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'ka-photos' and public.ka_can_upload(name));

-- ───────────────────────── seed: channels + programme ─────────────────────────

insert into public.ka_channels (slug, name, blurb, sort) values
  ('everyone',    'Everyone',              'The whole wedding party, in one place', 1),
  ('travel',      'Getting there',         'Flights, cabs and carpools from Chandigarh', 2),
  ('dance-floor', 'Sangeet & dance floor', 'Song requests, rehearsals and afterparty plans', 3),
  ('lost-found',  'Lost & found',          'Left something behind? Found something?', 4);

-- Guest-facing programme from wedding.json. Family-only functions, lunch
-- timings and the check-in time are deliberately left out. Times are IST.
insert into public.ka_events (day, starts_at, ends_at, time_label, title, note, location, sort) values
  (1, '2027-01-17 11:00+05:30', '2027-01-17 16:00+05:30', '11:00 am onwards', 'Guest arrival', 'Welcome drinks in the lobby', 'Lobby', 1),
  (1, '2027-01-17 16:00+05:30', '2027-01-17 18:00+05:30', '4:00 – 6:00 pm',   'Mehendi',       'At your leisure', '', 2),
  (1, '2027-01-17 20:00+05:30', '2027-01-17 23:00+05:30', '8:00 pm',          'Sangeet',       'Afterparty from 11:00 pm', '', 3),
  (1, '2027-01-17 20:00+05:30', '2027-01-17 23:00+05:30', '8:00 pm onwards',  'Dinner',        'Served through the Sangeet evening', '', 4),
  (2, '2027-01-18 08:00+05:30', '2027-01-18 10:30+05:30', '8:00 – 10:30 am',  'Breakfast',     '', '', 1),
  (2, '2027-01-18 10:00+05:30', '2027-01-18 12:00+05:30', '10:00 am',         'Haldi',         'Wear something you can stain', '', 2),
  (2, '2027-01-18 14:00+05:30', '2027-01-18 16:00+05:30', '2:00 pm',          'Varghodo',      'Assemble at the lobby', 'Lobby', 3),
  (2, '2027-01-18 16:00+05:30', '2027-01-18 16:30+05:30', '4:00 pm',          'Jaimala',       '', '', 4),
  (2, '2027-01-18 16:30+05:30', '2027-01-18 18:30+05:30', '4:30 pm',          'Pheras',        'Mangal phera and saptapadi', '', 5),
  (2, '2027-01-18 20:00+05:30', '2027-01-18 22:30+05:30', '8:00 pm',          'Dinner',        '', '', 6),
  (3, '2027-01-19 08:00+05:30', '2027-01-19 11:00+05:30', '8:00 – 11:00 am',  'Breakfast',     '', '', 1),
  (3, '2027-01-19 12:00+05:30', '2027-01-19 13:00+05:30', '12:00 noon',       'Check-out',     'Cabs to Chandigarh leave from the porch', 'Porch', 2);
