-- Five additions, all behind the same rules as everything else: tables have row
-- level security with no policies, and the app reaches them only through
-- functions that take the guest's token. Vendors get none of these.
--
--   1. Rides and arrivals: each guest's own vehicle (private, like rooms), an
--      "I've arrived" tap, and an arrivals board for hosts.
--   2. Wishes for the couple: notes that stay sealed until after the wedding.
--   3. Polls from the hosts.
--   4. Photo challenges: prompts guests answer with one of their album photos.
--   5. A menu for each meal, on the programme's events.

-- ───────────────────────── 1. rides and arrivals ─────────────────────────

create table public.ka_rides (
  id           uuid primary key default gen_random_uuid(),
  leg          text not null default 'arrive' check (leg in ('arrive', 'depart')),
  name         text not null check (char_length(name) between 1 and 60),
  vehicle      text not null default '' check (char_length(vehicle) <= 80),
  pickup       text not null default '' check (char_length(pickup) <= 160),
  driver       text not null default '' check (char_length(driver) <= 60),
  driver_phone text not null default '' check (char_length(driver_phone) <= 24),
  note         text not null default '' check (char_length(note) <= 200),
  sort         int  not null default 0
);
create index ka_rides_leg_idx on public.ka_rides (leg, sort);
alter table public.ka_rides enable row level security;
revoke all on public.ka_rides from anon, authenticated;

create table public.ka_arrivals (
  guest_id   uuid primary key references public.ka_guests(id) on delete cascade,
  landed_at  timestamptz,
  reached_at timestamptz
);
alter table public.ka_arrivals enable row level security;
revoke all on public.ka_arrivals from anon, authenticated;

-- The ride listed for a name: an exact match first, otherwise a first-name or
-- fuller-name match, but only if it points at exactly one row (same rule as rooms).
create function public.ka__ride_for(p_name text, p_leg text)
returns public.ka_rides language plpgsql stable security definer set search_path = public as $$
declare r public.ka_rides; v_n int;
begin
  select * into r from public.ka_rides s
   where s.leg = p_leg and public.ka__norm(s.name) = public.ka__norm(p_name)
   order by s.sort limit 1;
  if found then return r; end if;
  select count(*) into v_n from public.ka_rides s
   where s.leg = p_leg
     and (public.ka__norm(s.name) like public.ka__norm(p_name) || ' %'
          or public.ka__norm(p_name) like public.ka__norm(s.name) || ' %');
  if v_n = 1 then
    select * into r from public.ka_rides s
     where s.leg = p_leg
       and (public.ka__norm(s.name) like public.ka__norm(p_name) || ' %'
            or public.ka__norm(p_name) like public.ka__norm(s.name) || ' %')
     limit 1;
    return r;
  end if;
  return null;
end $$;

create function public.ka__ride_json(r public.ka_rides)
returns jsonb language sql immutable as $$
  select case when r.id is null then null else jsonb_build_object(
    'vehicle', r.vehicle, 'pickup', r.pickup, 'driver', r.driver, 'driver_phone', r.driver_phone, 'note', r.note) end
$$;
revoke execute on function public.ka__ride_for(text, text), public.ka__ride_json(public.ka_rides) from public, anon, authenticated;

-- A guest's own ride (each way), who shares the vehicle, and whether they have said they've arrived.
create function public.ka_ride_mine(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  g public.ka_guests := public.ka__guest(p_token); a public.ka_arrivals;
  r_in public.ka_rides; r_out public.ka_rides;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  select * into a from public.ka_arrivals where guest_id = g.id;
  r_in := public.ka__ride_for(g.name, 'arrive');
  r_out := public.ka__ride_for(g.name, 'depart');
  return jsonb_build_object(
    'arrive', public.ka__ride_json(r_in),
    'arrive_with', (select coalesce(jsonb_agg(s.name order by s.sort), '[]'::jsonb) from public.ka_rides s
                     where s.leg = 'arrive' and r_in.id is not null and r_in.vehicle <> '' and s.vehicle = r_in.vehicle and s.id <> r_in.id),
    'depart', public.ka__ride_json(r_out),
    'depart_with', (select coalesce(jsonb_agg(s.name order by s.sort), '[]'::jsonb) from public.ka_rides s
                     where s.leg = 'depart' and r_out.id is not null and r_out.vehicle <> '' and s.vehicle = r_out.vehicle and s.id <> r_out.id),
    'landed_at', a.landed_at, 'reached_at', a.reached_at);
end $$;

-- "I've arrived in Chandigarh" / "I've reached the resort". The first time, the hosts are told.
create function public.ka_arrive(p_token uuid, p_stage text, p_undo boolean default false)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_first boolean := false; v_vehicle text;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if p_stage is null or p_stage not in ('landed', 'reached') then raise exception 'ka_bad_input'; end if;
  insert into public.ka_arrivals (guest_id) values (g.id) on conflict (guest_id) do nothing;
  if coalesce(p_undo, false) then
    update public.ka_arrivals
       set landed_at  = case when p_stage = 'landed'  then null else landed_at end,
           reached_at = case when p_stage = 'reached' then null else reached_at end
     where guest_id = g.id;
  elsif p_stage = 'landed' then
    update public.ka_arrivals set landed_at = now() where guest_id = g.id and landed_at is null;
    v_first := found;
  else
    update public.ka_arrivals set reached_at = now() where guest_id = g.id and reached_at is null;
    v_first := found;
  end if;
  perform public.ka__poke('updates');
  if v_first then
    v_vehicle := (public.ka__ride_for(g.name, 'arrive')).vehicle;
    -- team '' matches no vendor team, so this reaches the hosts only
    perform public.ka__push_team('', g.id,
      case when p_stage = 'landed' then g.name || ' has arrived in Chandigarh' else g.name || ' has reached the resort' end,
      case when p_stage = 'reached' then 'Open Rides to see who is still on the way.'
           when coalesce(v_vehicle, '') = '' then 'No vehicle is listed for them yet.'
           else 'Vehicle: ' || v_vehicle end,
      jsonb_build_object('screen', 'today'));
  end if;
  return public.ka_ride_mine(p_token);
end $$;

-- Hosts: everyone in the app with their ride and arrival times, plus the full ride lists.
create function public.ka_rides_board(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  return jsonb_build_object(
    'people', (select coalesce(jsonb_agg(jsonb_build_object(
          'name', x.name, 'landed_at', a.landed_at, 'reached_at', a.reached_at,
          'arrive', public.ka__ride_json(public.ka__ride_for(x.name, 'arrive')),
          'depart', public.ka__ride_json(public.ka__ride_for(x.name, 'depart')))
        order by public.ka__norm(x.name)), '[]'::jsonb)
      from public.ka_guests x left join public.ka_arrivals a on a.guest_id = x.id
     where x.role <> 'vendor' and x.name <> 'Former guest'),
    'rides', (select coalesce(jsonb_agg(jsonb_build_object(
          'leg', r.leg, 'name', r.name, 'vehicle', r.vehicle, 'pickup', r.pickup,
          'driver', r.driver, 'driver_phone', r.driver_phone, 'note', r.note)
        order by r.leg, r.sort), '[]'::jsonb) from public.ka_rides r));
end $$;

-- Hosts: replace the whole list for one direction.
-- p_rows = [{"name": "Asha Mehta", "vehicle": "Urbania 2", "pickup": "…", "driver": "…", "driver_phone": "…", "note": "…"}, …]
create function public.ka_rides_set(p_token uuid, p_rows jsonb, p_leg text default 'arrive')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  perform public.ka__host(p_token);
  if p_leg is null or p_leg not in ('arrive', 'depart') then raise exception 'ka_bad_input'; end if;
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 400 then raise exception 'ka_bad_request'; end if;
  delete from public.ka_rides where leg = p_leg;
  insert into public.ka_rides (leg, name, vehicle, pickup, driver, driver_phone, note, sort)
    select p_leg,
           left(btrim(regexp_replace(r.value->>'name', '\s+', ' ', 'g')), 60),
           left(btrim(coalesce(r.value->>'vehicle', '')), 80),
           left(btrim(coalesce(r.value->>'pickup', '')), 160),
           left(btrim(coalesce(r.value->>'driver', '')), 60),
           left(btrim(coalesce(r.value->>'driver_phone', '')), 24),
           left(btrim(coalesce(r.value->>'note', '')), 200),
           r.ordinality::int
      from jsonb_array_elements(p_rows) with ordinality r
     where btrim(coalesce(r.value->>'name', '')) <> '';
  get diagnostics v_n = row_count;
  perform public.ka__poke('updates');
  return jsonb_build_object('saved', v_n);
end $$;

-- ───────────────────────── 2. wishes for the couple ─────────────────────────

create table public.ka_wishes (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.ka_guests(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 1500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ka_wishes_guest_idx on public.ka_wishes (guest_id);
alter table public.ka_wishes enable row level security;
revoke all on public.ka_wishes from anon, authenticated;

-- Sealed until the morning after the wedding. Hosts can open them sooner.
insert into public.ka_config (key, value) values ('wishes_open_at', '2027-01-20T09:00:00+05:30') on conflict (key) do nothing;

-- A guest sees only their own wishes. Hosts see how many are waiting, and all of them once opened.
create function public.ka_wishes_get(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_open timestamptz; v_opened boolean;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  select value::timestamptz into v_open from public.ka_config where key = 'wishes_open_at';
  v_opened := v_open is not null and v_open <= now();
  return jsonb_build_object(
    'open_at', v_open, 'opened', v_opened,
    'mine', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'body', w.body, 'created_at', w.created_at) order by w.created_at), '[]'::jsonb)
               from public.ka_wishes w where w.guest_id = g.id),
    'count', case when g.role = 'host' then (select count(*) from public.ka_wishes) else null end,
    'all', case when g.role = 'host' and v_opened then
             (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'body', w.body, 'created_at', w.created_at, 'by', a.name) order by w.created_at), '[]'::jsonb)
                from public.ka_wishes w join public.ka_guests a on a.id = w.guest_id)
           else null end);
end $$;

-- Write a wish, or change one of your own (pass its id). Up to five each.
create function public.ka_wish_save(p_token uuid, p_body text, p_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_body text := btrim(coalesce(p_body, '')); v_id uuid;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if char_length(v_body) = 0 then raise exception 'ka_empty'; end if;
  if char_length(v_body) > 1500 then raise exception 'ka_too_long'; end if;
  if p_id is not null then
    update public.ka_wishes set body = v_body, updated_at = now() where id = p_id and guest_id = g.id returning id into v_id;
    if v_id is null then raise exception 'ka_not_found'; end if;
  else
    if (select count(*) from public.ka_wishes where guest_id = g.id) >= 5 then raise exception 'ka_slow_down'; end if;
    insert into public.ka_wishes (guest_id, body) values (g.id, v_body) returning id into v_id;
  end if;
  perform public.ka__poke('updates');
  return jsonb_build_object('id', v_id);
end $$;

create function public.ka_wish_delete(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  delete from public.ka_wishes where id = p_id and guest_id = g.id;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

create function public.ka_wishes_open_now(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_config set value = to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"') where key = 'wishes_open_at';
  perform public.ka__poke('updates');
end $$;

-- ───────────────────────── 3. polls ─────────────────────────

create table public.ka_polls (
  id         uuid primary key default gen_random_uuid(),
  guest_id   uuid not null references public.ka_guests(id),
  question   text not null check (char_length(question) between 1 and 200),
  options    jsonb not null check (jsonb_typeof(options) = 'array'),
  created_at timestamptz not null default now(),
  closed_at  timestamptz,
  deleted_at timestamptz
);
alter table public.ka_polls enable row level security;
revoke all on public.ka_polls from anon, authenticated;

create table public.ka_poll_votes (
  poll_id  uuid not null references public.ka_polls(id) on delete cascade,
  guest_id uuid not null references public.ka_guests(id) on delete cascade,
  choice   int  not null check (choice >= 0),
  voted_at timestamptz not null default now(),
  primary key (poll_id, guest_id)
);
alter table public.ka_poll_votes enable row level security;
revoke all on public.ka_poll_votes from anon, authenticated;

create function public.ka_polls_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'question', p.question, 'created_at', p.created_at, 'closed', p.closed_at is not null,
      'options', (select jsonb_agg(jsonb_build_object('text', o.value,
                      'votes', (select count(*) from public.ka_poll_votes v where v.poll_id = p.id and v.choice = o.ordinality - 1))
                    order by o.ordinality)
                    from jsonb_array_elements_text(p.options) with ordinality o),
      'total', (select count(*) from public.ka_poll_votes v where v.poll_id = p.id),
      'my_choice', (select v.choice from public.ka_poll_votes v where v.poll_id = p.id and v.guest_id = g.id))
    order by p.created_at desc), '[]'::jsonb)
    from public.ka_polls p where p.deleted_at is null);
end $$;

-- Hosts ask; every phone is told.
create function public.ka_poll_create(p_token uuid, p_question text, p_options text[])
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__host(p_token); v_q text := btrim(coalesce(p_question, '')); v_opts jsonb; v_id uuid;
begin
  select coalesce(jsonb_agg(left(btrim(x), 80) order by n), '[]'::jsonb) into v_opts
    from unnest(coalesce(p_options, '{}')) with ordinality as t(x, n) where btrim(coalesce(x, '')) <> '';
  if char_length(v_q) = 0 or char_length(v_q) > 200 or jsonb_array_length(v_opts) < 2 or jsonb_array_length(v_opts) > 6 then
    raise exception 'ka_bad_input';
  end if;
  insert into public.ka_polls (guest_id, question, options) values (g.id, v_q, v_opts) returning id into v_id;
  perform public.ka__poke('updates');
  perform public.ka__push('Kashika & Arjun are asking', v_q, jsonb_build_object('screen', 'today'));
  return jsonb_build_object('id', v_id);
end $$;

create function public.ka_poll_vote(p_token uuid, p_poll_id uuid, p_choice int)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); p public.ka_polls;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  select * into p from public.ka_polls where id = p_poll_id and deleted_at is null;
  if not found then raise exception 'ka_not_found'; end if;
  if p.closed_at is not null then raise exception 'ka_closed'; end if;
  if p_choice is null or p_choice < 0 or p_choice >= jsonb_array_length(p.options) then raise exception 'ka_bad_input'; end if;
  insert into public.ka_poll_votes (poll_id, guest_id, choice) values (p.id, g.id, p_choice)
    on conflict (poll_id, guest_id) do update set choice = excluded.choice, voted_at = now();
  perform public.ka__poke('updates');
end $$;

create function public.ka_poll_close(p_token uuid, p_poll_id uuid, p_closed boolean default true)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_polls set closed_at = case when coalesce(p_closed, true) then coalesce(closed_at, now()) else null end
   where id = p_poll_id and deleted_at is null;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

create function public.ka_poll_delete(p_token uuid, p_poll_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_polls set deleted_at = now() where id = p_poll_id and deleted_at is null;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

-- ───────────────────────── 4. photo challenges ─────────────────────────

create table public.ka_challenges (
  id         uuid primary key default gen_random_uuid(),
  title      text not null check (char_length(title) between 1 and 120),
  sort       int  not null default 0,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);
alter table public.ka_challenges enable row level security;
revoke all on public.ka_challenges from anon, authenticated;

-- One photo per guest per challenge; it must be one of their own album photos.
create table public.ka_challenge_entries (
  challenge_id uuid not null references public.ka_challenges(id) on delete cascade,
  guest_id     uuid not null references public.ka_guests(id) on delete cascade,
  photo_id     uuid not null references public.ka_photos(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (challenge_id, guest_id)
);
create index ka_challenge_entries_photo_idx on public.ka_challenge_entries (photo_id);
alter table public.ka_challenge_entries enable row level security;
revoke all on public.ka_challenge_entries from anon, authenticated;

-- An entry counts for a viewer once its photo has developed, is not removed, and is not from someone they blocked.
create function public.ka__entry_shown(p_viewer uuid, p_photo public.ka_photos)
returns boolean language sql stable security definer set search_path = public as $$
  select p_photo.uploaded_at is not null and p_photo.deleted_at is null and p_photo.reveal_at <= now()
     and not exists (select 1 from public.ka_blocks b where b.guest_id = p_viewer and b.blocked_id = p_photo.guest_id)
$$;
revoke execute on function public.ka__entry_shown(uuid, public.ka_photos) from public, anon, authenticated;

create function public.ka_challenges_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return jsonb_build_object(
    'challenges', (select coalesce(jsonb_agg(jsonb_build_object(
          'id', c.id, 'title', c.title,
          'entries', (select count(*) from public.ka_challenge_entries e join public.ka_photos p on p.id = e.photo_id
                       where e.challenge_id = c.id and public.ka__entry_shown(g.id, p)),
          'mine', (select jsonb_build_object('photo_id', p.id, 'path', p.path, 'developing', p.reveal_at > now())
                     from public.ka_challenge_entries e join public.ka_photos p on p.id = e.photo_id
                    where e.challenge_id = c.id and e.guest_id = g.id and p.deleted_at is null),
          'peek', (select coalesce(jsonb_agg(x.path), '[]'::jsonb) from (
                     select p.path from public.ka_challenge_entries e join public.ka_photos p on p.id = e.photo_id
                      where e.challenge_id = c.id and public.ka__entry_shown(g.id, p)
                      order by e.created_at desc limit 4) x))
        order by c.sort, c.created_at), '[]'::jsonb)
      from public.ka_challenges c where c.deleted_at is null),
    'done', (select count(*) from public.ka_challenge_entries e
               join public.ka_challenges c on c.id = e.challenge_id and c.deleted_at is null
               join public.ka_photos p on p.id = e.photo_id and p.deleted_at is null
              where e.guest_id = g.id),
    'board', (select coalesce(jsonb_agg(jsonb_build_object('name', t.name, 'done', t.n, 'me', t.id = g.id) order by t.n desc, t.name), '[]'::jsonb) from (
                select a.id, a.name, count(*) as n
                  from public.ka_challenge_entries e
                  join public.ka_challenges c on c.id = e.challenge_id and c.deleted_at is null
                  join public.ka_photos p on p.id = e.photo_id
                  join public.ka_guests a on a.id = e.guest_id
                 where public.ka__entry_shown(g.id, p)
                 group by a.id, a.name order by count(*) desc, a.name limit 10) t));
end $$;

-- Everyone's photos for one challenge.
create function public.ka_challenge_photos(p_token uuid, p_challenge_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'path', p.path, 'taken_at', p.taken_at, 'width', p.width, 'height', p.height,
      'by', a.name, 'mine', p.guest_id = g.id) order by e.created_at desc), '[]'::jsonb)
    from public.ka_challenge_entries e
    join public.ka_photos p on p.id = e.photo_id
    join public.ka_guests a on a.id = p.guest_id
   where e.challenge_id = p_challenge_id and public.ka__entry_shown(g.id, p));
end $$;

-- A guest's own developed photos, newest first, to choose an entry from.
create function public.ka_my_photos(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(t.j order by t.taken_at desc), '[]'::jsonb) from (
    select p.taken_at, jsonb_build_object('id', p.id, 'path', p.path, 'taken_at', p.taken_at, 'width', p.width, 'height', p.height) as j
      from public.ka_photos p
     where p.guest_id = g.id and p.uploaded_at is not null and p.deleted_at is null and p.reveal_at <= now()
     order by p.taken_at desc limit 150) t);
end $$;

create function public.ka_challenge_enter(p_token uuid, p_challenge_id uuid, p_photo_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if not exists (select 1 from public.ka_challenges c where c.id = p_challenge_id and c.deleted_at is null) then raise exception 'ka_not_found'; end if;
  if not exists (select 1 from public.ka_photos p where p.id = p_photo_id and p.guest_id = g.id and p.uploaded_at is not null and p.deleted_at is null) then
    raise exception 'ka_not_found';
  end if;
  insert into public.ka_challenge_entries (challenge_id, guest_id, photo_id) values (p_challenge_id, g.id, p_photo_id)
    on conflict (challenge_id, guest_id) do update set photo_id = excluded.photo_id, created_at = now();
  perform public.ka__poke('album');
end $$;

create function public.ka_challenge_leave(p_token uuid, p_challenge_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  delete from public.ka_challenge_entries where challenge_id = p_challenge_id and guest_id = g.id;
  perform public.ka__poke('album');
end $$;

-- Hosts add a challenge, or reword one (pass its id).
create function public.ka_challenge_save(p_token uuid, p_title text, p_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_title text := btrim(coalesce(p_title, '')); v_id uuid;
begin
  perform public.ka__host(p_token);
  if char_length(v_title) = 0 or char_length(v_title) > 120 then raise exception 'ka_bad_input'; end if;
  if p_id is not null then
    update public.ka_challenges set title = v_title where id = p_id and deleted_at is null returning id into v_id;
    if v_id is null then raise exception 'ka_not_found'; end if;
  else
    insert into public.ka_challenges (title, sort)
      values (v_title, coalesce((select max(sort) from public.ka_challenges), 0) + 1) returning id into v_id;
  end if;
  perform public.ka__poke('album');
  return jsonb_build_object('id', v_id);
end $$;

create function public.ka_challenge_delete(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_challenges set deleted_at = now() where id = p_id and deleted_at is null;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('album');
end $$;

-- ───────────────────────── 5. menus ─────────────────────────

-- One block of text per event, a dish per line. A line ending in ":" is a heading.
alter table public.ka_events add column menu text not null default '' check (char_length(menu) <= 4000);

create function public.ka_event_set_menu(p_token uuid, p_event_id uuid, p_menu text)
returns void language plpgsql security definer set search_path = public as $$
begin
  perform public.ka__host(p_token);
  update public.ka_events set menu = left(btrim(coalesce(p_menu, '')), 4000) where id = p_event_id;
  if not found then raise exception 'ka_not_found'; end if;
  perform public.ka__poke('updates');
end $$;

create or replace function public.ka_home(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'now', now(),
    'guest', jsonb_build_object('id', g.id, 'name', g.name, 'role', g.role, 'team', g.team),
    'events', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', e.id, 'day', e.day, 'starts_at', e.starts_at, 'ends_at', e.ends_at,
        'time_label', e.time_label, 'title', e.title, 'note', e.note, 'location', e.location, 'dress', e.dress,
        'in_outfits', e.in_outfits, 'setting', e.setting, 'dress_code', e.dress_code,
        'guest_colours', to_jsonb(e.guest_colours), 'bride_colour', e.bride_colour, 'groom_colour', e.groom_colour,
        'menu', e.menu)
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

-- ───────────────────────── leaving removes these too ─────────────────────────

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
  delete from public.ka_reactions         where guest_id = g.id;
  delete from public.ka_photo_likes       where guest_id = g.id;
  delete from public.ka_quiz_answers      where guest_id = g.id;
  delete from public.ka_push_tokens       where guest_id = g.id;
  delete from public.ka_blocks            where guest_id = g.id or blocked_id = g.id;
  delete from public.ka_reports           where reporter_id = g.id;
  delete from public.ka_arrivals          where guest_id = g.id;
  delete from public.ka_wishes            where guest_id = g.id;
  delete from public.ka_poll_votes        where guest_id = g.id;
  delete from public.ka_challenge_entries where guest_id = g.id;
  update public.ka_guests set name = 'Former guest', token = gen_random_uuid() where id = g.id;
  perform public.ka__poke('chat');
  perform public.ka__poke('album');
  return jsonb_build_object('paths', v_paths, 'chat_paths', v_chat);
end $$;
