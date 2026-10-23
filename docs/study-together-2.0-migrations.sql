-- ═══════════════════════════════════════════════════════════════
-- Study Together 2.0 — Wave 1 Migrations (M1 + M2 + M3)
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- Server-side ownership enforced via trigger.
-- ═══════════════════════════════════════════════════════════════

-- ─── M1: study_courses ───
create table if not exists public.study_courses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (length(name) between 1 and 64),
  color text not null default 'st-course-1'
    check (color ~ '^st-course-[1-8]$'),
  icon text not null default 'book'
    check (icon ~ '^[a-z0-9_-]{1,32}$'),
  display_order int not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists study_courses_user_idx
  on public.study_courses (user_id, archived_at nulls first, display_order);

revoke all on public.study_courses from anon, public;
grant select, insert, update, delete on public.study_courses to authenticated;

alter table public.study_courses enable row level security;

drop policy if exists courses_self_read on public.study_courses;
create policy courses_self_read on public.study_courses
  for select to authenticated using (user_id = auth.uid());

drop policy if exists courses_self_insert on public.study_courses;
create policy courses_self_insert on public.study_courses
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists courses_self_update on public.study_courses;
create policy courses_self_update on public.study_courses
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists courses_self_delete on public.study_courses;
create policy courses_self_delete on public.study_courses
  for delete to authenticated using (user_id = auth.uid());

-- ─── M2: study_sessions.course_id + server-side ownership ───
alter table public.study_sessions
  add column if not exists course_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'sessions_course_fk'
  ) then
    alter table public.study_sessions
      add constraint sessions_course_fk
      foreign key (course_id) references public.study_courses(id)
      on delete set null;
  end if;
end $$;

create or replace function private.enforce_session_course_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.course_id is not null then
    if not exists (
      select 1 from public.study_courses
      where id = new.course_id and user_id = new.user_id
    ) then
      raise exception 'course_not_owned_by_user' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_session_course_owner() from public;
revoke all on function private.enforce_session_course_owner() from anon;
grant execute on function private.enforce_session_course_owner() to authenticated;

drop trigger if exists sessions_course_owner_check on public.study_sessions;
create trigger sessions_course_owner_check
  before insert or update of course_id, user_id on public.study_sessions
  for each row execute function private.enforce_session_course_owner();

-- ─── M3: profiles extensions ───
alter table public.profiles
  add column if not exists avatar_key text
    check (avatar_key is null or avatar_key ~ '^av-[1-8]$'),
  add column if not exists bio text
    check (bio is null or length(bio) <= 200),
  add column if not exists share_course_breakdown boolean not null default false,
  add column if not exists share_history_with_group boolean not null default false;

notify pgrst, 'reload schema';