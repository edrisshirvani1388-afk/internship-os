-- ═══════════════════════════════════════════════════════════════
-- Study Together 11.0 — Group Weekly Goal
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

alter table public.study_groups
  add column if not exists weekly_goal_minutes int
    check (weekly_goal_minutes is null or (weekly_goal_minutes > 0 and weekly_goal_minutes <= 10080));

notify pgrst, 'reload schema';