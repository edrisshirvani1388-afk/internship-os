# Roadmap

Last Updated: 2026-10-11

## DONE (Phases 0-24)

- AI Layer, Residency Foundation, Plan/Subject/Book/Round
- Capacity & Calendar, Rotation Activity Schedule
- Constraint / Override / Lock
- Planner Engine, Replanning Engine, Advanced Replanning
- AI Advisor Layer, Analytics, Spaced Repetition
- Review System, AI Content Generator 2.0
- Unified Planner UI, Planning Workspace 2.0/3.0
- Content Pipeline 2.0, Setup Wizard v19
- Scheduling Projection, Shared DayTimeline
- Capacity/Availability Split, Conflict + Ack
- Opportunity Windows, Replanning Triggers
- Residency Baseline, Reading Strategy
- Round Scheduling v22 (Phases 22.2 -> 24)

## DONE (Phases 24.1 -> 26.3b)

Phase 24.1  — Replan Trigger Unification & UX Fix
Phase 25.1  — Trigger Recording Fix
Phase 25.1b — Complete Trigger Paths & Change Details
Phase 26.0  — Replan Engine & Unified Timeline Design Audit
Phase 26.1  — Fix Carry_forward Demand Scoping
Phase 26.2  — Metrics & Buffer Correction
Phase 26.3  — Apply Atomicity & Trigger Lifecycle
Phase 26.3b — Safe Replan Tests

## DONE (Phases 27.0 -> 27.67)

Phase 27.0  — Today Experience Audit & Design
Phase 27.1  — Unified Today v1 (minimal)
Phase 27.2  — Dashboard Polish & Quick Scheduling
Phase 27.3  — Dashboard Visual Polish (LTR bar, colors)
Phase 27.4  — Quick Add + Residency Timing Modal
Phase 27.5  — Timeline Polish + Idle State
Phase 27.6  — Residency Activity Timing + Dedup + Legend
Phase 27.7  — Drag Chip -> Bar
Phase 27.8  — Timeline Redesign Attempts
Phase 27.9  — Pointer-Based Drag System
Phase 27.10-27.20 — Timeline Snake Grid
Phase 27.21-27.32 — Banner Redesign (2-zone)
Phase 27.33-27.49 — Week Slider (Saturday-start)
Phase 27.60-27.67 — Tooltip System (JS-driven)

## DONE (Phases 28.0 -> 28.1)

Phase 28.0  — Conflict Integration Audit
  Fixed `_shouldBlockOverlap` policy enforcement, dashboard dedup,
  banner per-row icon, mixed title, toast z-index. Added CF.__tests.

Phase 28.1  — Timeline Closeout & Generic Activity Design
  Removed blanket shift exemption, retired legacy detector from task
  modals, neutral fallback title, ISSUE-10 resolved, Generic Activity
  design delivered.

## NEXT (candidates for Phase 28.2+)

Phase 28.2 — Item-Level Policy Override (Minimal)   [PROPOSED]
  Add `state.tasks[].overlap: null|"allow"|"warn"|"block"` (additive).
  Conflict engine checks item-level override before RULES lookup.
  UI checkbox in task form. No migration required.

Phase 28.3 — Sleep/Rest/Food/Commute data model    [PROPOSED]
  Extend generic activity model with these domains.

Phase 28.4 — Unified Capacity engine               [PROPOSED]
  All activity domains contribute to capacity, not only residency.

Phase 28.5 — Snake timeline start circle + arrows  [SPECIALIST AGENT]
Phase 28.6 — Split styles.css into modules          [LATER]
Phase 28.7 — Mobile tooltip (long-press)            [LATER]
Phase 28.8 — Keyboard accessibility for tooltip     [LATER]
Phase 28.9 — Night shift (24h+) rendering           [LATER]

## FUTURE

- Replan UX full redesign
- Unified Timeline with proposal layer
- Reading Strategy major/minor
- Split State (multi-file persistence)
- Wizard post-commit preview
- Additional AI advisor flows

## FROZEN

- round-scheduler-v22.js
- store-v2/v5/v10.js
- domain-v2.js
- Replan apply atomicity contract (26.3)
- Trigger clearByIds contract
- scheduling-conflict-v20.js RULES table (policy data is frozen;
  extending via item-level override allowed, not via RULES mutation)
## DONE (Phases A → F.5, 2026-10-15, Agent #13)

Phase A   — Life Areas Restructure (dashboard cards, health hub shell)
Phase B   — Health Profile & Body Measurements
Phase B.1 — Health Closeout (height removed from body, bridge, tests)
Phase C   — Nutrition & Calorie Targets (Mifflin-St Jeor + macros)
Phase F.1 — Food.db Read-Only Access Layer (ASP.NET Core + Sqlite)
Phase F.2 — Food Logging UI (search/categories/favorites/custom)
Phase F.3 — Health Hub Banners + donut macro cards
Phase F.4 — Nutrition Trend (heatmap + line chart) + Day Navigation
Phase F.5 — Notification Bell (header; meals-due + overdue tasks)

## NEXT (candidates for F.6+)

Phase F.6 — Exercise UI                              [PROPOSED]
  Mirror fooddb-ui.js for exercises. Sub-tab "🏋️ ورزش":
    - search + category picker over /api/fooddb/exercises
    - detail: MET × weightKg × duration → kcal estimated
    - snapshot in state.health.workoutLog (new additive field)
    - trend heatmap + line chart
    - bell kind "workout" for scheduled-but-not-logged sessions
  Acceptance: real Food.db exercises searchable; MET estimate correct;
  snapshot persists independently; bell shows new kind.

Phase F.7 — Sleep tracking & trend                   [PROPOSED]
Phase F.8 — Projects (task.projectId)                [PROPOSED]
Phase F.9 — Finance (transactions + monthly report)  [PROPOSED]
Phase F.10 — Life & Leisure (movies/books/dates)     [PROPOSED]

## EARLIER — Phases 28.x (design only)

Phase 28.2 — Item-Level Policy Override (Minimal)     [PROPOSED]
Phase 28.3 — Sleep/Rest/Food/Commute data model        [PROPOSED]
Phase 28.4 — Unified Capacity engine                   [PROPOSED]
Phase 28.5 — Snake timeline start circle + arrows      [SPECIALIST AGENT]
Phase 28.6 — Split styles.css into modules             [LATER]
Phase 28.7 — Mobile tooltip (long-press)               [LATER]
Phase 28.8 — Keyboard accessibility for tooltip        [LATER]
Phase 28.9 — Night shift (24h+) rendering              [LATER]

## Regression policy

The 244-baseline (Phase 12) has not been re-run since Phase A.
Re-run all suites before any release or before F.6 if Design Agent
requests. See HANDOFF.md for exact list.

## DONE (Phases F.6 -> F.7, 2026-10-15, Agent #14)

Phase F.6  — Exercise UI (external module, F.1 endpoints reused)
Phase F.6c — Exercise tests + bell action open-workout
Phase F.7  — Sleep Hub (log-only first; auto-tasks on explicit sync)
Phase F.7c — Sleep tests + cross-midnight split + bell + UI merge

## NEXT (candidates for F.8+)

Phase F.8 — Projects                                 [PROPOSED]
  state.projects[] + task.projectId (nullable)
  Hub under card پروژه‌ها و حسابداری
  Progress = done tasks / total tasks
  Deadline view + bell kind "project-deadline"

Phase F.9 — Accounting                              [PROPOSED]
  state.finance = { transactions, categories, budgets }
  Depends on F.8 for projectId linkage

Phase F.10 — Life and Leisure                       [PROPOSED]
  state.life.items[] (movie/book/date/social/travel)
  Rating + notes; timestamps for date/travel

## Regression policy

Targeted suites (all PASS after F.7):
  sleepTests (50), workoutTests (32), healthTests (14), fooddbTests (12),
  schedulingProjection (32), schedulingConflict (48), replanTrigger (39),
  plannerReplanApply (16), plannerReplan (20), roundScheduler (47),
  plannerSchedule (9), plannerAllocation (6), feasibilityFixtures (12),
  store (4), migrationV22 (11).


## DONE (Phases F.8 → F.10, UX-01/02, Cockpit, 2026-10-16, Agent #15 · v0.4.0)

Phase F.8   — Projects Hub (state.projects[], task.projectId, shared card,
              progress derived from linked tasks, bell project-deadline)
Phase F.9   — Personal Finance (state.finance ledger, categories, budgets)
Phase F.9.1 — Finance UX redesign (dual budget, donut charts, 6-month bars,
              month close/reopen, date-range filter, daily reminder)
Phase F.10  — Life & Leisure (state.life.items[], 7 categories, 4 statuses,
              task auto-link)
UX-01       — Dashboard usability audit (design-only)
UX-02       — Today-First dashboard (D1/D2/D3)
GREETING-COCKPIT — Compact dashboard header (5 metrics, 3 actions, live clock,
              rotation progress, animated halo, hover polish)
FIXES       — Sleep quick-action route; money formatter rounding

Test total at v0.4.0: 463/463 ✅

## NEXT (candidates for v0.5.0+)

LIFE-AREAS-UX-01     [PROPOSED — awaiting Design Agent]
  Redesign the 8 dashboard life-area cards (info density, variants,
  color usage, responsive layout).

Finance refinements  [BACKLOG]
  Slide-over drawer, keypad quick-entry, recurring transactions (out of scope).

Sleep hub refinement [BACKLOG]
  Sleep modal should not be duplicated with dashboard greeting clock.

Life & Leisure polish [BACKLOG]
  Reading progress (page/total), episode tracking, year-in-review summary.

Cross-domain audit    [BACKLOG]
  Verify integration across all new domains after v0.4.0 stability window.

## DONE (v0.4.0 → v0.4.2, 2026-10-16, Agent #15)

Phase F.8   — Projects Hub
Phase F.9   — Personal Finance
Phase F.9.1 — Finance UX redesign
Phase F.10  — Life & Leisure Hub
UX-01       — Dashboard usability audit (design-only)
UX-02       — Today-First dashboard (D1/D2/D3)
GREETING-COCKPIT — Compact header with live clock + 5 metrics + 3 actions
MANUAL-CONTENT  — «➕ محتوای دستی» in Study/Emergency/Procedures
AI-CONTENT      — «🤖 تولید با AI» with 3-step modal
FIXES       — isEdit, sleep route, money format, food log, favorites

Test total at v0.4.2: 463/463 ✅

## NEXT (candidates for v0.5.0+)

LIFE-AREAS-UX-01     [PROPOSED — awaiting Design Agent]
  Redesign the 8 dashboard life-area cards
  (info density, variants, color usage, responsive).

Finance refinements   [BACKLOG]
  Slide-over drawer, keypad quick-entry.

Life & Leisure polish [BACKLOG]
  Reading progress, episode tracking, year-in-review.

Cross-domain audit    [BACKLOG]
  Post-stability integration review of all new domains.

## FROZEN

- round-scheduler-v22.js
- store-v2/v5/v10.js
- domain-v2.js
- Replan apply atomicity contract (26.3)
- Trigger clearByIds contract
- scheduling-conflict-v20.js RULES table
- window.INTERNSHIP_STATE — read-only snapshot