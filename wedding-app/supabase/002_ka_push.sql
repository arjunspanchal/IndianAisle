-- Push notifications for the wedding guest app.
--
-- Phones register an Expo push token. The database then asks Expo's push
-- service to deliver:
--   • every update the couple post (ka_post_update)
--   • "the photos are ready" at 9:00 am IST each morning there is a roll to
--     develop (pg_cron), or when a host develops early (ka_develop_now)
-- Chat messages deliberately do not push.

create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron;

create table public.ka_push_tokens (
  push_token text primary key,
  guest_id   uuid not null references public.ka_guests(id) on delete cascade,
  platform   text not null default '',
  updated_at timestamptz not null default now()
);
create index ka_push_tokens_guest_idx on public.ka_push_tokens (guest_id);
alter table public.ka_push_tokens enable row level security;
revoke all on public.ka_push_tokens from anon, authenticated;

create function public.ka_register_push(p_token uuid, p_push_token text, p_platform text default '')
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if p_push_token is null or p_push_token !~ '^Expo(nent)?PushToken\[[^\]]+\]$' then
    raise exception 'ka_bad_push_token';
  end if;
  insert into public.ka_push_tokens (push_token, guest_id, platform)
    values (p_push_token, g.id, left(coalesce(p_platform, ''), 16))
  on conflict (push_token) do update
    set guest_id = excluded.guest_id, platform = excluded.platform, updated_at = now();
end $$;

-- Send one notification to every registered phone (Expo accepts 100 per request).
-- Best-effort: a failure here must never undo the update or reveal that caused it.
create function public.ka__push(p_title text, p_body text, p_data jsonb default '{}'::jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_batch jsonb; v_n int := 0;
begin
  for v_batch in
    select jsonb_agg(jsonb_build_object(
             'to', t.push_token, 'title', p_title, 'body', p_body,
             'sound', 'default', 'channelId', 'default', 'data', p_data))
      from (select push_token, (row_number() over (order by push_token) - 1) / 100 as grp
              from public.ka_push_tokens) t
     group by t.grp
  loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := v_batch,
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb);
    v_n := v_n + jsonb_array_length(v_batch);
  end loop;
  return v_n;
exception when others then
  return v_n;
end $$;

-- Run by pg_cron at 9:00 am IST: tell everyone if a roll has just developed.
create function public.ka__push_developed()
returns int language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.ka_photos p
              where p.uploaded_at is not null and p.deleted_at is null
                and p.reveal_at > now() - interval '20 minutes' and p.reveal_at <= now() + interval '5 minutes') then
    perform public.ka__poke('album');
    return public.ka__push('The photos are ready', 'Yesterday''s roll has developed. Open the album to see what everyone caught.',
                           jsonb_build_object('screen', 'album'));
  end if;
  return 0;
end $$;

revoke execute on function public.ka__push(text, text, jsonb), public.ka__push_developed()
  from public, anon, authenticated;

-- 03:30 UTC = 9:00 am IST, the moment each day's roll develops.
select cron.schedule('ka-photos-developed', '30 3 * * *', $$select public.ka__push_developed()$$);

-- Posting an update now also pushes it.
create or replace function public.ka_post_update(p_token uuid, p_body text, p_pinned boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__host(p_token); v_id uuid; v_body text := btrim(coalesce(p_body, ''));
begin
  if char_length(v_body) = 0 then raise exception 'ka_empty'; end if;
  insert into public.ka_updates (guest_id, body, pinned)
    values (g.id, v_body, coalesce(p_pinned, false)) returning id into v_id;
  perform public.ka__poke('updates');
  perform public.ka__push('Kashika & Arjun',
    case when char_length(v_body) > 170 then left(v_body, 169) || '…' else v_body end,
    jsonb_build_object('screen', 'today'));
  return jsonb_build_object('id', v_id);
end $$;

-- Developing early also tells everyone.
create or replace function public.ka_develop_now(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform public.ka__host(p_token);
  update public.ka_photos set reveal_at = now() where reveal_at > now() and uploaded_at is not null;
  get diagnostics v_n = row_count;
  perform public.ka__poke('album');
  if v_n > 0 then
    perform public.ka__push('The photos are ready', 'A fresh batch has developed. Open the album to see what everyone caught.',
                            jsonb_build_object('screen', 'album'));
  end if;
  return jsonb_build_object('developed', v_n);
end $$;
