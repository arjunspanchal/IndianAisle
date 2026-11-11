-- RSVP inside the app, and "get to know each other" profiles.
--
-- RSVP asks what the website's form asks: coming or not, how many, who else,
-- a phone number, food needs, a note. One reply per person who joined; it can
-- be changed later. Only hosts see the replies.
--
-- Profiles are optional: which side you're on, how you know the couple, where
-- you're from, and a photo. Guests and hosts can browse them; vendors cannot.

create table public.ka_rsvps (
  guest_id    uuid primary key references public.ka_guests(id) on delete cascade,
  attending   boolean not null,
  people      int  not null default 1 check (people between 1 and 12),
  other_names text not null default '' check (char_length(other_names) <= 400),
  phone       text not null default '' check (char_length(phone) <= 24),
  food        text not null default '' check (char_length(food) <= 200),
  message     text not null default '' check (char_length(message) <= 600),
  updated_at  timestamptz not null default now()
);
alter table public.ka_rsvps enable row level security;
revoke all on public.ka_rsvps from anon, authenticated;

alter table public.ka_guests add column side text check (side in ('kashika', 'arjun', 'both'));
alter table public.ka_guests add column about text not null default '' check (char_length(about) <= 160);
alter table public.ka_guests add column city text not null default '' check (char_length(city) <= 40);
alter table public.ka_guests add column avatar_path text;
alter table public.ka_guests add column avatar_pending text;

create function public.ka_rsvp_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select jsonb_build_object('attending', r.attending, 'people', r.people, 'other_names', r.other_names,
                                    'phone', r.phone, 'food', r.food, 'message', r.message, 'updated_at', r.updated_at)
            from public.ka_rsvps r where r.guest_id = g.id);
end $$;

create function public.ka_rsvp_set(p_token uuid, p_attending boolean, p_people int default 1,
  p_other_names text default '', p_phone text default '', p_food text default '', p_message text default '')
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if p_attending is null then raise exception 'ka_bad_request'; end if;
  insert into public.ka_rsvps (guest_id, attending, people, other_names, phone, food, message)
    values (g.id, p_attending, least(greatest(coalesce(p_people, 1), 1), 12), left(btrim(coalesce(p_other_names, '')), 400),
            left(btrim(coalesce(p_phone, '')), 24), left(btrim(coalesce(p_food, '')), 200), left(btrim(coalesce(p_message, '')), 600))
  on conflict (guest_id) do update set attending = excluded.attending, people = excluded.people,
    other_names = excluded.other_names, phone = excluded.phone, food = excluded.food,
    message = excluded.message, updated_at = now();
  perform public.ka__poke('updates');
end $$;

-- Hosts: every reply, the headcount, and who has joined but not replied yet.
create function public.ka_rsvp_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  return jsonb_build_object(
    'coming', (select count(*) from public.ka_rsvps r where r.attending),
    'headcount', (select coalesce(sum(r.people), 0) from public.ka_rsvps r where r.attending),
    'not_coming', (select count(*) from public.ka_rsvps r where not r.attending),
    'replies', (select coalesce(jsonb_agg(jsonb_build_object(
        'name', a.name, 'attending', r.attending, 'people', r.people, 'other_names', r.other_names,
        'phone', r.phone, 'food', r.food, 'message', r.message, 'updated_at', r.updated_at)
        order by r.attending desc, a.name), '[]'::jsonb)
      from public.ka_rsvps r join public.ka_guests a on a.id = r.guest_id),
    'no_reply', (select coalesce(jsonb_agg(a.name order by a.name), '[]'::jsonb) from public.ka_guests a
                  where a.role = 'guest' and a.name <> 'Former guest'
                    and not exists (select 1 from public.ka_rsvps r where r.guest_id = a.id)));
end $$;

-- ───────── profiles ─────────

create function public.ka_profile_set(p_token uuid, p_side text, p_about text, p_city text)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  update public.ka_guests
     set side = case when p_side in ('kashika', 'arjun', 'both') then p_side else null end,
         about = left(btrim(coalesce(p_about, '')), 160),
         city = left(btrim(coalesce(p_city, '')), 40)
   where id = g.id;
end $$;

-- Profile photo: reserve a path, upload to it, confirm.
create function public.ka_avatar_reserve(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_path text := 'a/' || gen_random_uuid()::text || '.jpg';
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  update public.ka_guests set avatar_pending = v_path where id = g.id;
  return jsonb_build_object('path', v_path);
end $$;

-- Returns the previous photo's path (if any) so the app can delete that file.
create function public.ka_avatar_confirm(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public, storage as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.avatar_pending is null then raise exception 'ka_not_found'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'ka-photos' and o.name = g.avatar_pending) then
    raise exception 'ka_not_uploaded';
  end if;
  update public.ka_guests set avatar_path = g.avatar_pending, avatar_pending = null where id = g.id;
  return jsonb_build_object('path', g.avatar_pending, 'old_path', g.avatar_path);
end $$;

create function public.ka_people(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'name', a.name, 'host', a.role = 'host', 'side', a.side, 'about', a.about, 'city', a.city,
      'avatar_path', a.avatar_path, 'me', a.id = g.id)
      order by (a.id = g.id) desc, (a.role = 'host') desc, a.name), '[]'::jsonb)
    from public.ka_guests a
   where a.role in ('guest', 'host') and a.name <> 'Former guest'
     and not exists (select 1 from public.ka_blocks b where b.guest_id = g.id and b.blocked_id = a.id));
end $$;

-- Storage rules now also cover profile photos (paths starting a/).
create or replace function public.ka_can_upload(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.uploaded_at is null and (p.path = p_name or 't/' || p.path = p_name))
      or exists (select 1 from public.ka_guests x where x.avatar_pending = p_name);
$$;

create or replace function public.ka_can_remove(p_name text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.ka_photos p
                  where p.deleted_at is not null and (p.path = p_name or 't/' || p.path = p_name))
      or (p_name like 'a/%' and not exists
           (select 1 from public.ka_guests x where x.avatar_path = p_name or x.avatar_pending = p_name));
$$;

-- Deleting an account also wipes its RSVP and profile (and, as before, its documents).
create or replace function public.ka__docs_follow_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.ka_docs set deleted_at = coalesce(deleted_at, now()) where guest_id = new.id;
  delete from public.ka_rsvps where guest_id = new.id;
  update public.ka_guests set side = null, about = '', city = '', avatar_path = null, avatar_pending = null where id = new.id;
  return new;
end $$;
