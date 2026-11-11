-- Photos and voice notes in chat.
--
-- Same shape as the camera roll: the app reserves a message (hidden until its
-- file arrives), uploads the file to the reserved path, then confirms.
-- Files live in the public bucket ka-chat at unguessable paths that the app
-- only learns for messages it is allowed to see.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ka-chat', 'ka-chat', true, 5242880,
        array['image/jpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/aac', 'audio/mpeg', 'audio/webm', 'audio/3gpp'])
on conflict (id) do nothing;

alter table public.ka_messages add column kind text not null default 'text' check (kind in ('text', 'image', 'voice'));
alter table public.ka_messages add column media_path text unique;
alter table public.ka_messages add column media_meta jsonb not null default '{}'::jsonb; -- image: width,height · voice: seconds
alter table public.ka_messages add column uploaded_at timestamptz;                        -- media only: set on confirm
alter table public.ka_messages add column client_id uuid;                                 -- makes a retried send harmless
create unique index ka_messages_client_idx on public.ka_messages (guest_id, client_id) where client_id is not null;

-- A photo or voice note may have no words; a text message must.
alter table public.ka_messages drop constraint ka_messages_body_check;
alter table public.ka_messages add constraint ka_messages_body_check
  check (char_length(body) <= 1000 and (kind <> 'text' or char_length(body) >= 1));

-- What a message looks like in one line (room list, reply quotes, notifications).
create function public.ka__preview(m public.ka_messages)
returns text language sql immutable set search_path = public as $$
  select case
    when m.kind = 'image' then case when m.body = '' then 'Photo' else 'Photo: ' || m.body end
    when m.kind = 'voice' then 'Voice note'
    else m.body end;
$$;

-- Sent and not removed. Media that never finished uploading stays invisible.
create function public.ka__shown(m public.ka_messages)
returns boolean language sql immutable set search_path = public as $$
  select m.deleted_at is null and (m.kind = 'text' or m.uploaded_at is not null);
$$;

revoke execute on function public.ka__preview(public.ka_messages), public.ka__shown(public.ka_messages)
  from public, anon, authenticated;

create function public.ka_media_reserve(p_token uuid, p_channel text, p_kind text, p_client_id uuid,
  p_ext text default '', p_meta jsonb default '{}'::jsonb, p_body text default '', p_reply_to uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v public.ka_messages;
  v_ext text;
begin
  if p_kind not in ('image', 'voice') then raise exception 'ka_bad_kind'; end if;
  if not public.ka__can_see(g, p_channel) then raise exception 'ka_not_allowed'; end if;
  select * into v from public.ka_messages where guest_id = g.id and client_id = p_client_id;
  if v.id is null then
    if (select count(*) from public.ka_messages m
         where m.guest_id = g.id and m.created_at > now() - interval '1 minute') >= 20 then
      raise exception 'ka_slow_down';
    end if;
    if p_reply_to is not null and not exists
         (select 1 from public.ka_messages r where r.id = p_reply_to and r.channel = p_channel) then
      raise exception 'ka_not_found';
    end if;
    v_ext := case when p_kind = 'image' then 'jpg'
                  when lower(p_ext) in ('m4a', 'mp4', 'aac', 'webm', '3gp', 'mp3') then lower(p_ext)
                  else 'm4a' end;
    insert into public.ka_messages (channel, guest_id, body, reply_to, kind, media_path, media_meta, client_id)
      values (p_channel, g.id, left(btrim(coalesce(p_body, '')), 1000), p_reply_to, p_kind,
              'c/' || gen_random_uuid()::text || '.' || v_ext, coalesce(p_meta, '{}'::jsonb), p_client_id)
      returning * into v;
  end if;
  return jsonb_build_object('message_id', v.id, 'path', v.media_path, 'uploaded', v.uploaded_at is not null);
end $$;

create function public.ka_media_confirm(p_token uuid, p_message_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare g public.ka_guests := public.ka__guest(p_token); v public.ka_messages; c public.ka_channels;
begin
  select * into v from public.ka_messages where id = p_message_id and guest_id = g.id and kind <> 'text';
  if v.id is null then raise exception 'ka_not_found'; end if;
  if v.uploaded_at is not null then return; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'ka-chat' and o.name = v.media_path) then
    raise exception 'ka_not_uploaded';
  end if;
  -- created_at moves to now so the message lands at the bottom when it actually appears
  update public.ka_messages set uploaded_at = now(), created_at = now() where id = v.id returning * into v;
  perform public.ka__poke('chat', jsonb_build_object('channel', v.channel));
  select * into c from public.ka_channels where slug = v.channel;
  if c.team is not null then
    perform public.ka__push_team(c.team, g.id, c.name, g.name || ': ' || public.ka__preview(v),
      jsonb_build_object('screen', 'chat', 'channel', c.slug, 'name', c.name));
  end if;
end $$;

create function public.ka_chat_can_upload(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_messages m where m.media_path = p_name and m.uploaded_at is null and m.deleted_at is null);
$$;

create function public.ka_chat_can_remove(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_messages m where m.media_path = p_name and m.deleted_at is not null);
$$;

create policy "ka chat media upload reserved" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'ka-chat' and public.ka_chat_can_upload(name));
create policy "ka chat media removed can be found" on storage.objects for select to anon, authenticated
  using (bucket_id = 'ka-chat' and public.ka_chat_can_remove(name));
create policy "ka chat media removed can be deleted" on storage.objects for delete to anon, authenticated
  using (bucket_id = 'ka-chat' and public.ka_chat_can_remove(name));

create or replace function public.ka_channels_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'slug', c.slug, 'name', c.name, 'blurb', c.blurb, 'private', c.team is not null,
      'count', (select count(*) from public.ka_messages m where m.channel = c.slug and public.ka__shown(m)),
      'last', (select jsonb_build_object('body', public.ka__preview(m), 'by', a.name, 'created_at', m.created_at)
                 from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
                where m.channel = c.slug and public.ka__shown(m)
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
        'kind', m.kind, 'media_path', m.media_path, 'media_meta', m.media_meta,
        'by', a.name, 'host', a.role = 'host', 'mine', m.guest_id = g.id,
        'reply', (select jsonb_build_object('by', ra.name,
                           'body', case when rm.deleted_at is null then public.ka__preview(rm) else 'Message removed' end)
                    from public.ka_messages rm join public.ka_guests ra on ra.id = rm.guest_id
                   where rm.id = m.reply_to),
        'reactions', (select coalesce(jsonb_agg(jsonb_build_object('emoji', r.emoji, 'count', r.n, 'mine', r.mine)
                              order by r.emoji), '[]'::jsonb)
                        from (select x.emoji, count(*) as n, bool_or(x.guest_id = g.id) as mine
                                from public.ka_reactions x where x.message_id = m.id group by x.emoji) r)
      ) as j
      from public.ka_messages m join public.ka_guests a on a.id = m.guest_id
     where m.channel = p_channel and public.ka__shown(m)
       and (p_before is null or m.created_at < p_before)
       and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = m.guest_id)
     order by m.created_at desc
     limit least(greatest(coalesce(p_limit, 50), 1), 100)) t);
end $$;

-- Hosts reviewing a report need to see the photo or hear the voice note.
create or replace function public.ka_reports_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  return (select coalesce(jsonb_agg(t.j order by t.latest desc), '[]'::jsonb) from (
    select max(r.created_at) as latest, jsonb_build_object(
        'kind', r.kind, 'target_id', r.target_id, 'count', count(*), 'latest', max(r.created_at),
        'author', (select a.name from public.ka_guests a where a.id = public.ka__author(r.kind, r.target_id)),
        'body', (select public.ka__preview(m) from public.ka_messages m where r.kind = 'message' and m.id = r.target_id),
        'media_kind', (select m.kind from public.ka_messages m where r.kind = 'message' and m.id = r.target_id),
        'media_path', (select m.media_path from public.ka_messages m where r.kind = 'message' and m.id = r.target_id),
        'path', (select p.path from public.ka_photos p where r.kind = 'photo' and p.id = r.target_id)) as j
      from public.ka_reports r
     where r.resolved_at is null
     group by r.kind, r.target_id) t);
end $$;

-- Deleting an account also hands back the chat files to delete.
create or replace function public.ka_delete_me(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_paths jsonb; v_chat jsonb;
begin
  update public.ka_photos set deleted_at = coalesce(deleted_at, now()) where guest_id = g.id;
  select coalesce(jsonb_agg(x.p), '[]'::jsonb) into v_paths
    from (select p.path as p from public.ka_photos p where p.guest_id = g.id
          union all select 't/' || p.path from public.ka_photos p where p.guest_id = g.id) x;
  select coalesce(jsonb_agg(m.media_path), '[]'::jsonb) into v_chat
    from public.ka_messages m where m.guest_id = g.id and m.media_path is not null;
  update public.ka_messages set deleted_at = coalesce(deleted_at, now()),
         body = case when kind = 'text' then '[removed]' else '' end
   where guest_id = g.id;
  delete from public.ka_reactions    where guest_id = g.id;
  delete from public.ka_photo_likes  where guest_id = g.id;
  delete from public.ka_quiz_answers where guest_id = g.id;
  delete from public.ka_push_tokens  where guest_id = g.id;
  delete from public.ka_blocks       where guest_id = g.id or blocked_id = g.id;
  delete from public.ka_reports      where reporter_id = g.id;
  update public.ka_guests set name = 'Former guest', token = gen_random_uuid() where id = g.id;
  perform public.ka__poke('chat');
  perform public.ka__poke('album');
  return jsonb_build_object('paths', v_paths, 'chat_paths', v_chat);
end $$;
