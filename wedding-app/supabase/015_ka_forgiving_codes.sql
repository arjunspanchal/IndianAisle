-- Invite codes are now plain words, and typing them is forgiving: capitals,
-- spaces, dashes and other punctuation are ignored on both sides, so
-- "jasmine-amber breeze" and "JASMINEAMBERBREEZE" are the same code.
-- (The codes themselves live in ka_config, not in this file.)

create or replace function public.ka_join(p_code text, p_name text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_name text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_code text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
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
     and upper(regexp_replace(c.value, '[^A-Za-z0-9]', '', 'g')) = v_code and v_code <> ''
   limit 1;
  if v_role is null then
    perform pg_sleep(0.6);
    raise exception 'ka_bad_code';
  end if;
  insert into public.ka_guests (name, role, team) values (v_name, v_role, v_team) returning * into v;
  return jsonb_build_object('token', v.token,
    'guest', jsonb_build_object('id', v.id, 'name', v.name, 'role', v.role, 'team', v.team));
end $$;
