-- ═══════════════════════════════════════════════════════════════
-- Study Together 10.0 — Study Goals + Best Streak
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- 1. Best streak (denormalized for profile display)
alter table public.profiles
  add column if not exists best_streak_days int not null default 0
    check (best_streak_days >= 0 and best_streak_days <= 10000);

-- 2. Study goals table
create table if not exists public.study_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  scope text not null check (scope in ('global','course')),
  course_id uuid null references public.study_courses(id) on delete cascade,
  daily_minutes int null,
  weekly_minutes int null,
  enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  check ((scope = 'global' and course_id is null) or (scope = 'course' and course_id is not null)),
  check (daily_minutes is null or (daily_minutes > 0 and daily_minutes <= 1440)),
  check (weekly_minutes is null or (weekly_minutes > 0 and weekly_minutes <= 10080))
);

create unique index if not exists study_goals_global_uniq
  on public.study_goals (user_id) where scope = 'global';
create unique index if not exists study_goals_course_uniq
  on public.study_goals (user_id, course_id) where scope = 'course';
create index if not exists study_goals_user_idx on public.study_goals (user_id);

alter table public.study_goals enable row level security;
revoke all on public.study_goals from anon, public;
grant select, insert, update, delete on public.study_goals to authenticated;

drop policy if exists "study_goals_self_all" on public.study_goals;
create policy "study_goals_self_all" on public.study_goals
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

notify pgrst, 'reload schema';