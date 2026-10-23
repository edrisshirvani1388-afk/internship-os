-- ═══════════════════════════════════════════════════════════════
-- Study Together 8.0 — Session Type Field
-- Applied: 2026-10-23
-- Idempotent. Safe to re-run.
-- ═══════════════════════════════════════════════════════════════

-- Session type: how the session was recorded (normal / pomodoro / manual)
-- NULL = unknown (legacy sessions created before this migration).
-- No fabricated values — legacy stays NULL.
alter table public.study_sessions
  add column if not exists session_type text
    check (session_type is null or session_type in ('normal','pomodoro','manual'));

notify pgrst, 'reload schema';