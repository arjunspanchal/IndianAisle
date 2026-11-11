-- SOS: anyone in the app (guest, vendor or host) can call for help.
-- Raising one pushes to every host's phone and pins it on the hosts' Today
-- screen until a host marks it handled. Other guests never see SOS alerts.
--
-- Optional: a person to call directly. Set once, by hand:
--   insert into ka_config(key, value) values ('sos_contact_name', '…'), ('sos_contact_phone', '+91…');

create table public.ka_sos (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.ka_guests(id) on delete cascade,
  note        text not null default '' check (char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.ka_guests(id)
);
create index ka_sos_open_idx on public.ka_sos (created_at desc) where resolved_at is null;
create index ka_sos_guest_idx on public.ka_sos (guest_id);
alter table public.ka_sos enable row level security;
revoke all on public.ka_sos from anon, authenticated;

create function public.ka_sos_raise(p_token uuid, p_note text default '')
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_note text := left(btrim(coalesce(p_note, '')), 300); v_id uuid;
begin
  if (select count(*) from public.ka_sos s where s.guest_id = g.id and s.created_at > now() - interval '10 minutes') >= 3 then
    raise exception 'ka_slow_down';
  end if;
  insert into public.ka_sos (guest_id, note) values (g.id, v_note) returning id into v_id;
  perform public.ka__poke('updates');
  -- team '' matches no vendor team, so this reaches the hosts only
  perform public.ka__push_team('', g.id, 'SOS: ' || g.name || ' needs help',
    case when v_note = '' then 'Open the app to see who and when.' else v_note end,
    jsonb_build_object('screen', 'today'));
  return jsonb_build_object('id', v_id);
end $$;

-- Who to call, and (for hosts) the alerts still open.
create function public.ka_sos_state(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  return jsonb_build_object(
    'contact_name',  (select value from public.ka_config where key = 'sos_contact_name'),
    'contact_phone', (select value from public.ka_config where key = 'sos_contact_phone'),
    'open', case when g.role = 'host' then
      (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'by', a.name, 'role', a.role, 'team', a.team,
                                 'note', s.note, 'created_at', s.created_at) order by s.created_at desc), '[]'::jsonb)
         from public.ka_sos s join public.ka_guests a on a.id = s.guest_id
        where s.resolved_at is null)
      else '[]'::jsonb end);
end $$;

create function public.ka_sos_resolve(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__host(p_token);
begin
  update public.ka_sos set resolved_at = now(), resolved_by = g.id where id = p_id and resolved_at is null;
  perform public.ka__poke('updates');
end $$;
