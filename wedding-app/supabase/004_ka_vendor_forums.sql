-- Vendor forums: private chat rooms for the teams working the wedding.
--
-- A third kind of person, 'vendor', joins with their team's own invite code
-- (ka_config keys vendor_code_<team>, e.g. vendor_code_decor, vendor_code_fnb).
-- A vendor sees only their team's room, the programme and the couple's
-- updates: never the guest chat, the camera or the album. Hosts see every room.
-- Messages in a team room push to that team and the hosts.

alter table public.ka_guests drop constraint ka_guests_role_check;
alter table public.ka_guests add constraint ka_guests_role_check check (role in ('guest', 'host', 'vendor'));
alter table public.ka_guests add column team text;
alter table public.ka_channels add column team text; -- null = a guest room; otherwise private to that team + hosts

-- Replying to a message (swipe to reply) quotes it above the new one.
alter table public.ka_messages add column reply_to uuid references public.ka_messages(id);
create index ka_messages_reply_idx on public.ka_messages (reply_to) where reply_to is not null;

insert into public.ka_channels (slug, name, blurb, sort, team) values
  ('vendor-decor', 'Decor team', 'Private: the couple and the decor team', 10, 'decor'),
  ('vendor-fnb',   'Food & beverage team', 'Private: the couple and the F&B team', 11, 'fnb');

create function public.ka__can_see(g public.ka_guests, p_channel text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_channels c
                  where c.slug = p_channel
                    and (g.role = 'host'
                         or (c.team is null and g.role = 'guest')
                         or (c.team is not null and g.role = 'vendor' and c.team = g.team)));
$$;
revoke execute on function public.ka__can_see(public.ka_guests, text) from public, anon, authenticated;

-- Push to one vendor team and the hosts, except the sender.
create function public.ka__push_team(p_team text, p_except uuid, p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare v_batch jsonb;
begin
  select jsonb_agg(jsonb_build_object('to', t.push_token, 'title', p_title, 'body', p_body,
                                      'sound', 'default', 'channelId', 'default', 'data', p_data))
    into v_batch
    from public.ka_push_tokens t join public.ka_guests x on x.id = t.guest_id
   where x.id <> p_except and (x.role = 'host' or (x.role = 'vendor' and x.team = p_team));
  if v_batch is not null then
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
  end if;
exception when others then
  null;
end $$;
revoke execute on function public.ka__push_team(text, uuid, text, text, jsonb) from public, anon, authenticated;

create or replace function public.ka_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_role text;
  v_team text;
  v public.ka_guests;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 40 then raise exception 'ka_bad_name'; end if;
  select case when c.key = 'host_code' then 'host' when c.key = 'guest_code' then 'guest' else 'vendor' end,
         case when c.key like 'vendor\_code\_%' then substr(c.key, 13) end
    into v_role, v_team
    from public.ka_config c
   where (c.key in ('guest_code', 'host_code') or c.key like 'vendor\_code\_%')
     and upper(c.value) = v_code and v_code <> ''
   limit 1;
  if v_role is null then
    perform pg_sleep(0.6);
    raise exception 'ka_bad_code';
  end if;
  insert into public.ka_guests (name, role, team) values (v_name, v_role, v_team) returning * into v;
  return jsonb_build_object('token', v.token,
    'guest', jsonb_build_object('id', v.id, 'name', v.name, 'role', v.role, 'team', v.team));
end $$;

create or replace function public.ka_channels_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'name', c.name, 'blurb', c.blurb, 'private', c.team is not null,
      'count', (select count(*) from public.ka_messages m where m.channel = c.slug and m.deleted_at is null),
      'last', (select jsonb_build_object('body', m.body, 'by', a.name, 'created_at', m.created_at)
                 from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
                where m.channel = c.slug and m.deleted_at is null
                  and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = m.guest_id)
                order by m.created_at desc limit 1))
      order by c.sort), '[]'::jsonb)
    from public.ka_channels c where public.ka__can_see(g, c.slug));
end $$;

create or replace function public.ka_messages_list(p_token uuid, p_channel text,
  p_before timestamptz default null, p_limit int default 50)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if not public.ka__can_see(g, p_channel) then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(t.j order by t.created_at desc), '[]'::jsonb) from (
    select m.created_at, jsonb_build_object(
        'id', m.id, 'body', m.body, 'created_at', m.created_at,
        'by', a.name, 'host', a.role = 'host', 'mine', m.guest_id = g.id,
        'reply', (select jsonb_build_object('by', ra.name,
                           'body', case when rm.deleted_at is null then rm.body else 'Message removed' end)
                    from public.ka_messages rm join public.ka_guests ra on ra.id = rm.guest_id
                   where rm.id = m.reply_to),
        'reactions', (select coalesce(jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.n, 'mine', r.mine)
                              order by r.emoji), '[]'::jsonb)
                        from (select x.emoji, count(*) as n, bool_or(x.guest_id = g.id) as mine
                                from public.ka_reactions x where x.message_id = m.id group by x.emoji) r)
      ) as j
      from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
     where m.channel = p_channel and m.deleted_at is null
       and (p_before is null or m.created_at < p_before)
       and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = m.guest_id)
     order by m.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 100)) t);
end $$;

drop function public.ka_send_message(uuid, text, text);
create function public.ka_send_message(p_token uuid, p_channel text, p_body text, p_reply_to uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v_body text := btrim(coalesce(p_body, ''));
  v public.ka_messages;
  c public.ka_channels;
begin
  if char_length(v_body) = 0 then raise exception 'ka_empty'; end if;
  if char_length(v_body) > 1000 then raise exception 'ka_too_long'; end if;
  if not public.ka__can_see(g, p_channel) then raise exception 'ka_not_allowed'; end if;
  if (select count(*) from public.ka_messages m
       where m.guest_id = g.id and m.created_at > now() - interval '1 minute') >= 20 then
    raise exception 'ka_slow_down';
  end if;
  if p_reply_to is not null and not exists
       (select 1 from public.ka_messages r where r.id = p_reply_to and r.channel = p_channel) then
    raise exception 'ka_not_found';
  end if;
  insert into public.ka_messages (channel, guest_id, body, reply_to)
    values (p_channel, g.id, v_body, p_reply_to) returning * into v;
  perform public.ka__poke('chat', jsonb_build_object('channel', p_channel));
  select * into c from public.ka_channels where slug = p_channel;
  if c.team is not null then
    perform public.ka__push_team(c.team, g.id, c.name,
      g.name || ': ' || case when char_length(v_body) > 150 then left(v_body, 149) || '…' else v_body end,
      jsonb_build_object('screen', 'chat', 'channel', c.slug, 'name', c.name));
  end if;
  return jsonb_build_object('id', v.id, 'created_at', v.created_at);
end $$;

create or replace function public.ka_toggle_reaction(p_token uuid, p_message_id uuid, p_emoji text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_channel text;
begin
  select channel into v_channel from public.ka_messages where id = p_message_id and deleted_at is null;
  if v_channel is null then raise exception 'ka_not_found'; end if;
  if not public.ka__can_see(g, v_channel) then raise exception 'ka_not_allowed'; end if;
  delete from public.ka_reactions where message_id = p_message_id and guest_id = g.id and emoji = p_emoji;
  if not found then
    insert into public.ka_reactions (message_id, guest_id, emoji) values (p_message_id, g.id, p_emoji);
  end if;
  perform public.ka__poke('chat', jsonb_build_object('channel', v_channel));
end $$;

-- The camera is for guests.
create or replace function public.ka_reserve_shot(p_token uuid, p_client_id uuid, p_taken_at timestamptz,
  p_width int default null, p_height int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v public.ka_photos;
  v_taken timestamptz := least(greatest(coalesce(p_taken_at, now()), now() - interval '4 days'), now());
  v_day date := (v_taken at time zone 'Asia/Kolkata')::date;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
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

-- ka_home tells the app which team a vendor belongs to.
create or replace function public.ka_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'now', now(),
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'role', g.role, 'team', g.team),
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
