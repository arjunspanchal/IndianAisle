-- Travel documents: guests can upload an ID (e.g. Aadhaar) and their tickets so
-- the couple's team can arrange travel and check-in.
--
-- These are sensitive, so they are handled differently from everything else:
--   • The bucket ka-docs is PRIVATE and has no storage policies at all.
--   • The functions below can be run only by the service role, i.e. only by the
--     ka-docs Edge Function, which checks the caller's token and then hands out
--     a one-off upload ticket or a link that expires after two minutes.
--   • A guest sees only their own documents; hosts see everyone's; vendors none.
--   • Every time someone opens or deletes a document it is written to ka_doc_access.
--   • Deleting an account deletes its documents; hosts can purge the lot after the wedding.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ka-docs', 'ka-docs', false, 10485760, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

create table public.ka_docs (
  id          uuid primary key default gen_random_uuid(),
  guest_id    uuid not null references public.ka_guests(id) on delete cascade,
  kind        text not null check (kind in ('id', 'ticket')),
  label       text not null default '' check (char_length(label) <= 80),
  mime        text not null check (mime in ('image/jpeg', 'image/png', 'application/pdf')),
  path        text not null unique,
  created_at  timestamptz not null default now(),
  uploaded_at timestamptz,
  deleted_at  timestamptz
);
create index ka_docs_guest_idx on public.ka_docs (guest_id);

create table public.ka_doc_access (
  id       bigint generated always as identity primary key,
  doc_id   uuid not null references public.ka_docs(id) on delete cascade,
  guest_id uuid not null references public.ka_guests(id) on delete cascade,
  action   text not null check (action in ('view', 'delete')),
  at       timestamptz not null default now()
);
create index ka_doc_access_doc_idx on public.ka_doc_access (doc_id);
create index ka_doc_access_guest_idx on public.ka_doc_access (guest_id);

alter table public.ka_docs       enable row level security;
alter table public.ka_doc_access enable row level security;
revoke all on public.ka_docs, public.ka_doc_access from anon, authenticated;

create function public.ka_doc_reserve(p_token uuid, p_kind text, p_label text, p_mime text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v public.ka_docs; v_ext text;
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  if p_kind not in ('id', 'ticket') then raise exception 'ka_bad_kind'; end if;
  v_ext := case p_mime when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'application/pdf' then 'pdf' end;
  if v_ext is null then raise exception 'ka_bad_file'; end if;
  if (select count(*) from public.ka_docs d where d.guest_id = g.id and d.deleted_at is null) >= 12 then
    raise exception 'ka_too_many';
  end if;
  insert into public.ka_docs (guest_id, kind, label, mime, path)
    values (g.id, p_kind, left(btrim(coalesce(p_label, '')), 80), p_mime,
            g.id::text || '/' || gen_random_uuid()::text || '.' || v_ext)
    returning * into v;
  return jsonb_build_object('id', v.id, 'path', v.path);
end $$;

create function public.ka_doc_confirm(p_token uuid, p_id uuid)
returns void language plpgsql security definer set search_path = public, storage as $$
declare g public.ka_guests := public.ka__guest(p_token); v public.ka_docs;
begin
  select * into v from public.ka_docs where id = p_id and guest_id = g.id and deleted_at is null;
  if v.id is null then raise exception 'ka_not_found'; end if;
  if not exists (select 1 from storage.objects o where o.bucket_id = 'ka-docs' and o.name = v.path) then
    raise exception 'ka_not_uploaded';
  end if;
  update public.ka_docs set uploaded_at = coalesce(uploaded_at, now()) where id = v.id;
end $$;

-- A guest gets their own documents; a host gets everyone's, with names.
create function public.ka_doc_list(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token);
begin
  if g.role = 'vendor' then raise exception 'ka_not_allowed'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'id', d.id, 'kind', d.kind, 'label', d.label, 'mime', d.mime, 'created_at', d.uploaded_at,
      'by', a.name, 'mine', d.guest_id = g.id) order by a.name, d.kind, d.uploaded_at), '[]'::jsonb)
    from public.ka_docs d join public.ka_guests a on a.id = d.guest_id
   where d.deleted_at is null and d.uploaded_at is not null
     and (d.guest_id = g.id or g.role = 'host'));
end $$;

-- Permission check before the Edge Function mints a short-lived link. Logged.
create function public.ka_doc_open(p_token uuid, p_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v public.ka_docs;
begin
  select * into v from public.ka_docs
   where id = p_id and deleted_at is null and uploaded_at is not null and (guest_id = g.id or g.role = 'host');
  if v.id is null then raise exception 'ka_not_found'; end if;
  insert into public.ka_doc_access (doc_id, guest_id, action) values (v.id, g.id, 'view');
  return jsonb_build_object('path', v.path, 'mime', v.mime);
end $$;

-- p_id null = all of my own documents. Returns the storage paths to remove.
create function public.ka_doc_delete(p_token uuid, p_id uuid default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare g public.ka_guests := public.ka__guest(p_token); v_paths jsonb;
begin
  with gone as (
    update public.ka_docs set deleted_at = now()
     where deleted_at is null
       and ((p_id is null and guest_id = g.id) or (id = p_id and (guest_id = g.id or g.role = 'host')))
    returning id, path)
  , logged as (insert into public.ka_doc_access (doc_id, guest_id, action) select id, g.id, 'delete' from gone)
  select coalesce(jsonb_agg(path), '[]'::jsonb) into v_paths from gone;
  if p_id is not null and jsonb_array_length(v_paths) = 0 then raise exception 'ka_not_found'; end if;
  return jsonb_build_object('paths', v_paths);
end $$;

-- Hosts, after the wedding: remove every travel document, including any stragglers.
create function public.ka_doc_purge(p_token uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_paths jsonb;
begin
  perform public.ka__host(p_token);
  -- (the API refuses an UPDATE with no WHERE clause, so say which rows)
  update public.ka_docs set deleted_at = now() where deleted_at is null;
  select coalesce(jsonb_agg(path), '[]'::jsonb) into v_paths from public.ka_docs;
  return jsonb_build_object('paths', v_paths);
end $$;

-- Only the Edge Function (service role) may run these.
revoke execute on function public.ka_doc_reserve(uuid, text, text, text), public.ka_doc_confirm(uuid, uuid),
  public.ka_doc_list(uuid), public.ka_doc_open(uuid, uuid), public.ka_doc_delete(uuid, uuid),
  public.ka_doc_purge(uuid) from public, anon, authenticated;
grant execute on function public.ka_doc_reserve(uuid, text, text, text), public.ka_doc_confirm(uuid, uuid),
  public.ka_doc_list(uuid), public.ka_doc_open(uuid, uuid), public.ka_doc_delete(uuid, uuid),
  public.ka_doc_purge(uuid) to service_role;

-- Belt and braces: an account's token only ever changes when the account is
-- deleted, and at that moment its documents stop existing for everyone.
create function public.ka__docs_follow_account()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.ka_docs set deleted_at = coalesce(deleted_at, now()) where guest_id = new.id;
  return new;
end $$;
revoke execute on function public.ka__docs_follow_account() from public, anon, authenticated;

create trigger ka_guests_token_rotated after update of token on public.ka_guests
  for each row when (old.token is distinct from new.token)
  execute function public.ka__docs_follow_account();
