-- ═══════════════════════════════════════════════════════════
-- STUDY TOGETHER V1 — Supabase Schema + RLS
-- اجرا در SQL Editor پروژه Supabase (نه در Client)
-- ───────────────────────────────────────────────────────────
-- اصلاحات امنیتی این نسخه:
--   - هیچ ALTER روی realtime.messages (RLS از قبل فعال است)
--   - helper functions در private schema با SECURITY DEFINER
--   - SET search_path = '' + نام کامل schema.object
--   - revoke از public/anon صریح، grant فقط به authenticated
--   - SELECT/INSERT/UPDATE/DELETE جدا برای هر جدول
--   - INSERT عضو فقط از طریق RPC
-- ═══════════════════════════════════════════════════════════


-- ─────────────────────────────────────────────
-- 0. Private schema
-- ─────────────────────────────────────────────
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated, service_role;


-- ─────────────────────────────────────────────
-- 1. Tables
-- ─────────────────────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null check (length(username) between 2 and 32),
  display_name text not null check (length(display_name) between 1 and 64),
  share_timeline boolean not null default false,
  share_daily_total boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  name text not null check (length(name) between 1 and 64),
  invite_code text unique not null,
  invite_revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  client_session_id text not null,
  started_at timestamptz not null,
  ended_at timestamptz,
  end_reason text check (end_reason in ('ended','break','crash') or end_reason is null),
  created_at timestamptz not null default now(),
  unique (user_id, client_session_id)
);

create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, started_at desc);
create index if not exists study_sessions_group_idx
  on public.study_sessions (group_id, started_at desc);
create index if not exists study_sessions_open_idx
  on public.study_sessions (user_id) where ended_at is null;


-- ─────────────────────────────────────────────
-- 2. Helper functions (SECURITY DEFINER, no recursion)
-- ─────────────────────────────────────────────
create or replace function private.is_member(p_group uuid, p_user uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.study_group_members
    where group_id = p_group and user_id = p_user
  );
$$;

create or replace function private.is_owner(p_group uuid, p_user uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.study_groups
    where id = p_group and owner_id = p_user
  );
$$;

create or replace function private.shares_group(p_a uuid, p_b uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1
    from public.study_group_members m1
    join public.study_group_members m2 on m1.group_id = m2.group_id
    where m1.user_id = p_a and m2.user_id = p_b
  );
$$;

create or replace function private.is_member_of_topic(p_topic text, p_user uuid)
returns boolean
language sql security definer set search_path = ''
as $$
  select exists (
    select 1 from public.study_group_members m
    where m.user_id = p_user
      and ('group:' || m.group_id::text) = p_topic
  );
$$;

revoke all on function private.is_member(uuid, uuid)         from public;
revoke all on function private.is_owner(uuid, uuid)          from public;
revoke all on function private.shares_group(uuid, uuid)      from public;
revoke all on function private.is_member_of_topic(text, uuid) from public;

grant execute on function private.is_member(uuid, uuid)         to authenticated;
grant execute on function private.is_owner(uuid, uuid)          to authenticated;
grant execute on function private.shares_group(uuid, uuid)      to authenticated;
grant execute on function private.is_member_of_topic(text, uuid) to authenticated;


-- ─────────────────────────────────────────────
-- 3. Enable RLS
-- ─────────────────────────────────────────────
alter table public.profiles            enable row level security;
alter table public.study_groups        enable row level security;
alter table public.study_group_members enable row level security;
alter table public.study_sessions      enable row level security;


-- ─────────────────────────────────────────────
-- 4. Table grants (minimum)
-- ─────────────────────────────────────────────
revoke all on public.profiles            from anon, public;
revoke all on public.study_groups        from anon, public;
revoke all on public.study_group_members from anon, public;
revoke all on public.study_sessions      from anon, public;

grant select, insert, update          on public.profiles            to authenticated;
grant select, update, delete          on public.study_groups        to authenticated;
grant select, delete                  on public.study_group_members to authenticated;
grant select, insert, update, delete  on public.study_sessions      to authenticated;


-- ─────────────────────────────────────────────
-- 5. Profiles policies
-- ─────────────────────────────────────────────
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.shares_group(auth.uid(), id));

drop policy if exists profiles_self_insert on public.profiles;
create policy profiles_self_insert on public.profiles
  for insert to authenticated
  with check (id = auth.uid());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());


-- ─────────────────────────────────────────────
-- 6. Groups policies
-- ─────────────────────────────────────────────
drop policy if exists groups_member_read on public.study_groups;
create policy groups_member_read on public.study_groups
  for select to authenticated
  using (private.is_member(id, auth.uid()));

drop policy if exists groups_owner_update on public.study_groups;
create policy groups_owner_update on public.study_groups
  for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists groups_owner_delete on public.study_groups;
create policy groups_owner_delete on public.study_groups
  for delete to authenticated
  using (owner_id = auth.uid());

-- Direct INSERT blocked → RPC create_study_group()
drop policy if exists groups_insert_blocked on public.study_groups;
create policy groups_insert_blocked on public.study_groups
  for insert to authenticated
  with check (false);


-- ─────────────────────────────────────────────
-- 7. Members policies
-- ─────────────────────────────────────────────
drop policy if exists members_self_or_group_read on public.study_group_members;
create policy members_self_or_group_read on public.study_group_members
  for select to authenticated
  using (user_id = auth.uid() or private.is_member(group_id, auth.uid()));

drop policy if exists members_self_or_owner_delete on public.study_group_members;
create policy members_self_or_owner_delete on public.study_group_members
  for delete to authenticated
  using (user_id = auth.uid() or private.is_owner(group_id, auth.uid()));

drop policy if exists members_insert_blocked on public.study_group_members;
create policy members_insert_blocked on public.study_group_members
  for insert to authenticated
  with check (false);

drop policy if exists members_update_blocked on public.study_group_members;
create policy members_update_blocked on public.study_group_members
  for update to authenticated
  using (false);


-- ─────────────────────────────────────────────
-- 8. Sessions policies
-- ─────────────────────────────────────────────
-- Select policy:
--   - Self always sees own sessions
--   - Group member sees another member's sessions ONLY when that owner
--     has share_daily_total = true
--   (Enforces section 3 of Study Together V1 contract at DB layer)
drop policy if exists sessions_self_or_group_read on public.study_sessions;
create policy sessions_self_or_group_read on public.study_sessions
  for select to authenticated
  using (
    user_id = auth.uid()
    or (
      private.is_member(group_id, auth.uid())
      and exists (
        select 1 from public.profiles p
        where p.id = study_sessions.user_id
          and p.share_daily_total = true
      )
    )
  );

drop policy if exists sessions_self_insert on public.study_sessions;
create policy sessions_self_insert on public.study_sessions
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and private.is_member(group_id, auth.uid())
  );

drop policy if exists sessions_self_update on public.study_sessions;
create policy sessions_self_update on public.study_sessions
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists sessions_self_delete on public.study_sessions;
create policy sessions_self_delete on public.study_sessions
  for delete to authenticated
  using (user_id = auth.uid());


-- ─────────────────────────────────────────────
-- 9. RPC: create_study_group
-- ─────────────────────────────────────────────
create or replace function public.create_study_group(p_name text)
returns table(group_id uuid, invite_code text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_code text;
  v_uid uuid;
  v_raw text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if length(coalesce(p_name,'')) < 1 or length(p_name) > 64 then
    raise exception 'invalid_name';
  end if;
  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  insert into public.study_groups (owner_id, name, invite_code)
    values (v_uid, p_name, v_code) returning id into v_id;
  insert into public.study_group_members (group_id, user_id, role)
    values (v_id, v_uid, 'owner');
  return query select v_id, v_code;
end;
$$;

revoke all on function public.create_study_group(text) from public;
revoke all on function public.create_study_group(text) from anon;
grant execute on function public.create_study_group(text) to authenticated;


-- ─────────────────────────────────────────────
-- 10. RPC: join_study_group
-- ─────────────────────────────────────────────
create or replace function public.join_study_group(p_code text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_id uuid;
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select id into v_id from public.study_groups
    where invite_code = p_code and invite_revoked_at is null;
  if v_id is null then
    raise exception 'invalid_invite_code';
  end if;
  insert into public.study_group_members (group_id, user_id, role)
    values (v_id, v_uid, 'member')
    on conflict (group_id, user_id) do nothing;
  return v_id;
end;
$$;

revoke all on function public.join_study_group(text) from public;
revoke all on function public.join_study_group(text) from anon;
grant execute on function public.join_study_group(text) to authenticated;


-- ─────────────────────────────────────────────
-- 11. RPC: leave_study_group
-- ─────────────────────────────────────────────
create or replace function public.leave_study_group(p_group uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_owner uuid;
  v_other int;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  select owner_id into v_owner from public.study_groups where id = p_group;
  if v_owner is null then
    raise exception 'group_not_found';
  end if;
  if v_owner = v_uid then
    select count(*) into v_other
      from public.study_group_members
      where group_id = p_group and user_id <> v_uid;
    if v_other = 0 then
      delete from public.study_groups where id = p_group;
      return;
    else
      raise exception 'owner_cannot_leave_with_members';
    end if;
  else
    delete from public.study_group_members
      where group_id = p_group and user_id = v_uid;
  end if;
end;
$$;

revoke all on function public.leave_study_group(uuid) from public;
revoke all on function public.leave_study_group(uuid) from anon;
grant execute on function public.leave_study_group(uuid) to authenticated;


-- ─────────────────────────────────────────────
-- 12. RPC: delete_study_group (owner-only, explicit)
-- ─────────────────────────────────────────────
create or replace function public.delete_study_group(p_group uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.study_groups where id = p_group and owner_id = v_uid
  ) then
    raise exception 'not_owner';
  end if;
  delete from public.study_groups where id = p_group;
end;
$$;

revoke all on function public.delete_study_group(uuid) from public;
revoke all on function public.delete_study_group(uuid) from anon;
grant execute on function public.delete_study_group(uuid) to authenticated;


-- ─────────────────────────────────────────────
-- 13. RPC: revoke_invite_code (owner-only)
-- ─────────────────────────────────────────────
create or replace function public.revoke_invite_code(p_group uuid)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_uid uuid;
  v_raw text;
  v_code text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;
  if not exists (
    select 1 from public.study_groups where id = p_group and owner_id = v_uid
  ) then
    raise exception 'not_owner';
  end if;
  v_code := substr(replace(gen_random_uuid()::text, '-', ''), 1, 12);
  update public.study_groups
    set invite_code = v_code,
        invite_revoked_at = null,
        updated_at = now()
    where id = p_group;
  return v_code;
end;
$$;

revoke all on function public.revoke_invite_code(uuid) from public;
revoke all on function public.revoke_invite_code(uuid) from anon;
grant execute on function public.revoke_invite_code(uuid) to authenticated;


-- ─────────────────────────────────────────────
-- 14. Realtime (private channel per group)
-- NOTE: realtime.messages already has RLS enabled.
-- Do NOT enable RLS on realtime.messages via ALTER (already enabled by Supabase).
-- ─────────────────────────────────────────────

drop policy if exists presence_group_select on realtime.messages;
create policy presence_group_select on realtime.messages
  for select to authenticated
  using (private.is_member_of_topic(realtime.messages.topic, auth.uid()));

drop policy if exists presence_group_insert on realtime.messages;
create policy presence_group_insert on realtime.messages
  for insert to authenticated
  with check (private.is_member_of_topic(realtime.messages.topic, auth.uid()));


-- ─────────────────────────────────────────────
-- DONE. After executing:
--   1. Auth → Provider → Email: ON, Confirm email: OFF
--   2. Realtime → Public access: OFF
--   3. Run verification queries (see docs/STUDY-TOGETHER.md §5)
-- ─────────────────────────────────────────────