-- ═══════════════════════════════════════════════════════════════
-- Study Together 6.0 — Shared Daily Plans
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- 1. Profile share flag (default OFF)
alter table public.profiles
  add column if not exists share_daily_plan boolean not null default false;

-- 2. Shared day-plan snapshots
create table if not exists public.study_shared_day_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id uuid not null references public.study_groups(id) on delete cascade,
  plan_date date not null,
  items jsonb not null default '[]'::jsonb,
  published_at timestamptz not null default now(),
  primary key (user_id, group_id, plan_date),
  check (jsonb_array_length(items) <= 80)
);

create index if not exists shared_day_plans_group_date_idx
  on public.study_shared_day_plans (group_id, plan_date);

-- 3. RLS
alter table public.study_shared_day_plans enable row level security;

revoke all on public.study_shared_day_plans from anon, public;
grant select, insert, update, delete on public.study_shared_day_plans to authenticated;

drop policy if exists "shared_plans_self_all" on public.study_shared_day_plans;
create policy "shared_plans_self_all" on public.study_shared_day_plans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "shared_plans_group_read" on public.study_shared_day_plans;
create policy "shared_plans_group_read" on public.study_shared_day_plans
  for select to authenticated
  using (
    private.is_member(group_id, auth.uid())
    and exists (
      select 1 from public.profiles p
      where p.id = study_shared_day_plans.user_id
        and p.share_daily_plan = true
    )
  );

notify pgrst, 'reload schema';