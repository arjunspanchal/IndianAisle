-- Guests can add photos from their own phone to the shared album.
--
-- These sit beside disposable-camera shots in the same pool, but they are not
-- part of the 27-shot roll and need no developing: they appear straight away.
-- ka_photos.source tells the two apart ('camera' | 'upload').

alter table public.ka_photos add column source text not null default 'camera' check (source in ('camera', 'upload'));

-- The roll counts camera shots only.
create or replace function public.ka__camera(p_guest uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  with today as (select (now() at time zone 'Asia/Kolkata')::date as d)
  select jsonb_build_object(
    'day', t.d,
    'limit', 27,
    'used', (select count(*) from public.ka_photos p where p.guest_id = p_guest and p.day = t.d and p.source = 'camera'),
    'reveal_at', public.ka__reveal_at(t.d),
    'developing', (select count(*) from public.ka_photos p
                    where p.guest_id = p_guest and p.uploaded_at is not null
                      and p.deleted_at is null and p.reveal_at > now())
  ) from today t;
$$;

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
    if (select count(*) from public.ka_photos p
         where p.guest_id = g.id and p.day = v_day and p.source = 'camera') >= 27 then
      raise exception 'ka_roll_finished';
    end if;
    insert into public.ka_photos (guest_id, client_id, day, path, taken_at, reveal_at, width, height)
      values (g.id, p_client_id, v_day, v_day::text || '/' || gen_random_uuid()::text || '.jpg',
              v_taken, public.ka__reveal_at(v_day), p_width, p_height)
      returning * into v;
  end if;
  return jsonb_build_object('photo_id', v.id, 'path', v.path, 'uploaded', v.uploaded_at is not null);
end $$;

-- Claim a place in the album for a photo from the phone's gallery. Up to 150 a day per guest.
create function public.ka_upload_reserve(p_token uuid, p_client_id uuid, p_width int default null, p_height int default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token);
  v public.ka_photos;
  v_day date := (now() at time zone 'Asia/Kolkata')::date;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  select * into v from public.ka_photos where guest_id = g.id and client_id = p_client_id;
  if v.id is null then
    if (select count(*) from public.ka_photos p
         where p.guest_id = g.id and p.source = 'upload' and p.created_at > now() - interval '1 day') >= 150 then
      raise exception 'ka_too_many';
    end if;
    insert into public.ka_photos (guest_id, client_id, day, path, taken_at, reveal_at, width, height, source)
      values (g.id, p_client_id, v_day, v_day::text || '/' || gen_random_uuid()::text || '.jpg',
              now(), now(), p_width, p_height, 'upload')
      returning * into v;
  end if;
  return jsonb_build_object('photo_id', v.id, 'path', v.path, 'uploaded', v.uploaded_at is not null);
end $$;

-- Confirming an uploaded photo tells open albums to refresh.
create or replace function public.ka_confirm_shot(p_token uuid, p_photo_id uuid)
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
    if v.source = 'upload' then perform public.ka__poke('album'); end if;
  end if;
  return public.ka__camera(g.id);
end $$;
