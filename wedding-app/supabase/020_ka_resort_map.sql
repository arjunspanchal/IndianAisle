-- The resort map: one picture the hosts upload (from the resort or the planner),
-- shown to everyone, plus a place name on each programme event ("where is it?").
-- The picture lives in the ka-photos bucket under m/. As with every other upload,
-- a phone can only write to a path the database has just reserved for it.

create function public.ka_map_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__guest(p_token);
  return jsonb_build_object(
    'path',   (select value from public.ka_config where key = 'map_path'),
    'width',  (select nullif(value, '')::int from public.ka_config where key = 'map_width'),
    'height', (select nullif(value, '')::int from public.ka_config where key = 'map_height'));
end $$;

create function public.ka_map_reserve(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_path text := 'm/' || gen_random_uuid()::text || '.jpg';
begin
  perform public.ka__host(p_token);
  insert into public.ka_config (key, value) values ('map_pending', v_path)
    on conflict (key) do update set value = excluded.value;
  return jsonb_build_object('path', v_path);
end $$;

create function public.ka_map_confirm(p_token uuid, p_width int, p_height int)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare v_pending text; v_old text;
begin
  perform public.ka__host(p_token);
  select value into v_pending from public.ka_config where key = 'map_pending';
  if v_pending is null then raise exception 'ka_not_found'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'ka-photos' and o.name = v_pending) then
    raise exception 'ka_not_uploaded';
  end if;
  select value into v_old from public.ka_config where key = 'map_path';
  insert into public.ka_config (key, value) values
      ('map_path', v_pending),
      ('map_width', greatest(coalesce(p_width, 0), 0)::text),
      ('map_height', greatest(coalesce(p_height, 0), 0)::text)
    on conflict (key) do update set value = excluded.value;
  delete from public.ka_config where key = 'map_pending';
  perform public.ka__poke('updates');
  return jsonb_build_object('path', v_pending, 'old_path', v_old);
end $$;

create function public.ka_map_clear(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_old text;
begin
  perform public.ka__host(p_token);
  select value into v_old from public.ka_config where key = 'map_path';
  delete from public.ka_config where key in ('map_path', 'map_pending', 'map_width', 'map_height');
  perform public.ka__poke('updates');
  return jsonb_build_object('old_path', v_old);
end $$;

-- Where each event is held, in a few words ("Garden lawn"). Shown on the programme and under the map.
create function public.ka_event_set_location(p_token uuid, p_event_id uuid, p_location text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_events set location = left(btrim(coalesce(p_location, '')), 80) where id = p_event_id;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

-- Uploads: a reserved album shot, a reserved profile photo, or the reserved map.
create or replace function public.ka_can_upload(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.uploaded_at is null and (p.path = p_name or 't/' || p.path = p_name))
      or exists (select 1 from public.ka_guests x where x.avatar_pending = p_name)
      or exists (select 1 from public.ka_config c where c.key = 'map_pending' and c.value = p_name);
$$;

-- Removals: files nothing points at any more.
create or replace function public.ka_can_remove(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.deleted_at is not null and (p.path = p_name or 't/' || p.path = p_name))
      or (p_name like 'a/%' and not exists
           (select 1 from public.ka_guests x where x.avatar_path = p_name or x.avatar_pending = p_name))
      or (p_name like 'm/%' and not exists
           (select 1 from public.ka_config c where c.key in ('map_path', 'map_pending') and c.value = p_name));
$$;
