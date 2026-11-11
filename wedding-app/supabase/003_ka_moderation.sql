-- Safety tools the App Store and Play Store require of any app with chat and
-- shared photos: report content, block a person, delete your own account.

create table public.ka_reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.ka_guests(id) on delete cascade,
  kind        text not null check (kind in ('message', 'photo')),
  target_id   uuid not null,
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  unique (reporter_id, kind, target_id)
);
create index ka_reports_open_idx on public.ka_reports (created_at) where resolved_at is null;

create table public.ka_blocks (
  guest_id   uuid not null references public.ka_guests(id) on delete cascade,
  blocked_id uuid not null references public.ka_guests(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (guest_id, blocked_id)
);
create index ka_blocks_blocked_idx on public.ka_blocks (blocked_id);

alter table public.ka_reports enable row level security;
alter table public.ka_blocks  enable row level security;
revoke all on public.ka_reports, public.ka_blocks from anon, authenticated;

-- Who wrote this message / took this photo.
create function public.ka__author(p_kind text, p_target_id uuid)
returns uuid language sql stable security definer set search_path = public as $$
  select case p_kind
    when 'message' then (select m.guest_id from public.ka_messages m where m.id = p_target_id)
    when 'photo'   then (select p.guest_id from public.ka_photos p where p.id = p_target_id)
  end;
$$;
revoke execute on function public.ka__author(text, uuid) from public, anon, authenticated;

create function public.ka_report(p_token uuid, p_kind text, p_target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if public.ka__author(p_kind, p_target_id) is null then raise exception 'ka_not_found'; end if;
  insert into public.ka_reports (reporter_id, kind, target_id) values (g.id, p_kind, p_target_id)
    on conflict (reporter_id, kind, target_id) do nothing;
end $$;

-- Hide everything this person posts from me (chat and album). Takes the
-- message/photo rather than a guest id, so the app never handles other guests' ids.
create function public.ka_block_author(p_token uuid, p_kind text, p_target_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_author uuid := public.ka__author(p_kind, p_target_id);
begin
  if v_author is null then raise exception 'ka_not_found'; end if;
  if v_author = g.id then raise exception 'ka_not_allowed'; end if;
  insert into public.ka_blocks (guest_id, blocked_id) values (g.id, v_author) on conflict do nothing;
end $$;

-- Hosts: the open reports, newest first.
create function public.ka_reports_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  return (select coalesce(jsonb_agg(t.j order by t.latest desc), '[]'::jsonb) from (
    select max(r.created_at) as latest, jsonb_build_object(
        'kind', r.kind, 'target_id', r.target_id, 'count', count(*), 'latest', max(r.created_at),
        'author', (select a.name from public.ka_guests a where a.id = public.ka__author(r.kind, r.target_id)),
        'body', (select m.body from public.ka_messages m where r.kind = 'message' and m.id = r.target_id),
        'path', (select p.path from public.ka_photos p where r.kind = 'photo' and p.id = r.target_id)) as j
      from public.ka_reports r
     where r.resolved_at is null
     group by r.kind, r.target_id) t);
end $$;

-- Hosts: settle a report, either removing the message/photo or keeping it.
create function public.ka_report_resolve(p_token uuid, p_kind text, p_target_id uuid, p_remove boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  if p_remove and p_kind = 'message' then
    update public.ka_messages set deleted_at = now() where id = p_target_id and deleted_at is null;
    perform public.ka__poke('chat');
  elsif p_remove and p_kind = 'photo' then
    update public.ka_photos set deleted_at = now() where id = p_target_id and deleted_at is null;
    perform public.ka__poke('album');
  end if;
  update public.ka_reports set resolved_at = now()
   where kind = p_kind and target_id = p_target_id and resolved_at is null;
end $$;

-- Delete my account: my messages and photos disappear for everyone, my
-- reactions, likes, quiz answers and notification tokens are erased, my name is
-- removed and my token stops working. Returns the storage paths of my photos
-- so the app can delete the files themselves.
create function public.ka_delete_me(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_paths jsonb;
begin
  update public.ka_photos set deleted_at = coalesce(deleted_at, now()) where guest_id = g.id;
  select coalesce(jsonb_agg(x.p), '[]'::jsonb) into v_paths
    from (select p.path as p from public.ka_photos p where p.guest_id = g.id
          union all select 't/' || p.path from public.ka_photos p where p.guest_id = g.id) x;
  update public.ka_messages set deleted_at = coalesce(deleted_at, now()), body = '[removed]' where guest_id = g.id;
  delete from public.ka_reactions    where guest_id = g.id;
  delete from public.ka_photo_likes  where guest_id = g.id;
  delete from public.ka_quiz_answers where guest_id = g.id;
  delete from public.ka_push_tokens  where guest_id = g.id;
  delete from public.ka_blocks       where guest_id = g.id or blocked_id = g.id;
  delete from public.ka_reports      where reporter_id = g.id;
  update public.ka_guests set name = 'Former guest', token = gen_random_uuid() where id = g.id;
  perform public.ka__poke('chat');
  perform public.ka__poke('album');
  return jsonb_build_object('paths', v_paths);
end $$;

-- Files of removed photos may be deleted from storage by the app.
create function public.ka_can_remove(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.deleted_at is not null and (p.path = p_name or 't/' || p.path = p_name));
$$;

create policy "ka removed shots can be found"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'ka-photos' and public.ka_can_remove(name));

create policy "ka removed shots can be deleted"
  on storage.objects for delete to anon, authenticated
  using (bucket_id = 'ka-photos' and public.ka_can_remove(name));

-- ───────── the album now leaves out people I have blocked ─────────
-- (chat does the same; its functions are redefined in 004 with the vendor forums)

create or replace function public.ka_album(p_token uuid, p_day date default null, p_offset int default 0)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_day date;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if; -- the album is for guests
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
               and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = p.guest_id)
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
           and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = p.guest_id)
         order by p.taken_at, p.id
         offset greatest(coalesce(p_offset, 0), 0) limit 90) t)
  );
end $$;
