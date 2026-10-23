# Architecture Decisions

Last Updated: 2026-10-08

## ADR-001 — State is Source of Truth

Date: 2026-10-08
Status: Accepted

Decision: Domain State (state.tasks, state.shifts, state.residency) is the single Source of Truth.

Context: Multiple layers (Timeline, Calendar, Planner) could compete for ownership of scheduling.

Why: Single source prevents divergence; projections can be recomputed anytime.

Alternatives rejected: Allowing Timeline to own truth; bidirectional sync.

Impact: All scheduling engines read state, never write. All UI renders from projections.

## ADR-002 — Scheduling Projection is Read-Only

Date: 2026-10-08
Status: Accepted

Decision: scheduling-projection-v20.js produces ScheduledItem[] without mutating state.

Context: UI needs uniform time-based view of heterogeneous domain objects.

Why: Keeps domain boundaries clean; projection is deterministic and cheap to recompute.

Impact: DayTimeline and Calendar both consume projection, not raw state.

## ADR-003 — Planner is Deterministic

Date: 2026-10-08
Status: Accepted

Decision: Planner functions are pure. Same input → same output. No AI in decision path.

Context: User needs trust; AI hallucinations could corrupt schedules.

Why: Determinism enables fingerprinting, diffing, and replay.

Impact: AI is confined to Advisor/Explainer role. Fingerprint prevents stale proposals.

## ADR-004 — AI is Advisor, Not Decision Maker

Date: 2026-10-08
Status: Accepted

Decision: AI cannot produce or modify schedules. It explains and recommends only.

Context: AI could suggest a plan, but user must approve and engine must validate.

Why: Trust, verifiability, safety.

Impact: All AI outputs go through user-facing approval. Raw AI never mutates state.

## ADR-005 — Shared DayTimeline

Date: 2026-10-08
Status: Accepted

Decision: One DayTimeline component used by both Dashboard and Calendar.

Context: Previously multiple timeline renderers existed with slight differences.

Why: Consistency, less code, single point of evolution.

Impact: day-timeline-v20.js is the single renderer.

## ADR-006 — Storage Layout Must Not Leak

Date: 2026-10-08
Status: Accepted

Decision: Engine code must not assume a particular persistence file layout.

Context: Future Split State (multi-file) is planned. Engines must survive the migration.

Why: Prevents coupling between logic and storage.

Impact: Engines only touch state object, never read/write files directly.

## ADR-007 — Split State is Future, Not Now

Date: 2026-10-08
Status: Proposed

Decision: Multi-file persistence is a future direction, not implemented yet.

Context: Current single state.js works but will scale poorly.

Why: Need careful migration design; don't rush.

Impact: No new endpoints, loaders, or savers until design approved.

## ADR-008 — Additive Over Rewrite

Date: 2026-10-08
Status: Accepted

Decision: Prefer extending existing modules over rewriting them.

Context: Project has stable engines; rewrites risk regression.

Why: Preserves working behavior; enables incremental testing.

Impact: All patches are additive with backward compatibility.

## ADR-009 — Explicit Edit Allows Gaps

Date: 2026-10-08
Status: Accepted

Decision: computeExplicitEdit allows non-contiguous rounds (gaps). computeNormalize continues to close gaps.

Rationale: User must be able to position a round at an exact date without chain normalization pulling neighbors.

## ADR-010 — Lock Authority is Scheduler

Date: 2026-10-08
Status: Accepted

Decision: UI does not limit how many rounds can be locked. Scheduler is the sole authority on feasibility. No auto-unlock.

## ADR-011 — Preview Mandatory Before Date Mutation

Date: 2026-10-08
Status: Accepted

Decision: Every date mutation in Manager flows through _openProposalPreview. Apply only after explicit user confirmation. No silent auto-fix.

## ADR-012 — Round Create Through Scheduler

Date: 2026-10-08
Status: Accepted

Decision: Round Create in Manager uses computeNormalize with virtual new-round intent, then Preview, then atomic persistence.

## ADR-013 — Wizard Uses Scheduler

Date: 2026-10-08
Status: Accepted

Decision: Wizard calls _applySchedulerToDraft during draft manipulation and again in _commit before any Round addRound.

## ADR-014 — Regenerate Uses computeNormalize

Date: 2026-10-08
Status: Accepted

Decision: MGR.regenerateFromWizard must use computeNormalize, not Wizard's original suggestRoundDistribution. Refuses if any round locked.

## ADR-015 — Trigger Dedup by Stable Identity

Date: 2026-10-09
Status: Accepted

Decision: Trigger dedup key is `(planId, sourceType, sourceId)`. For `rotation_changed` only, dedup is `(planId, type)`.

Rationale: Rotation changes are batch-level; per-sourceId would create noise.

Impact: `RT.markNeeded` in `replan-trigger-v20.js`.

## ADR-016 — Change Details in Trigger Events

Date: 2026-10-09
Status: Accepted

Decision: Every trigger event carries `{ type, at, title, before, after }`. Merge aggregates into `events[]`.

Rationale: User-facing messages must describe what changed, not just "changed".

Impact: `RT.notifyChange`, `RT.markNeeded`, `RT.describeEvent`.

## ADR-017 — Replan carry_forward Scopes Demand to Actual Debt

Date: 2026-10-09
Status: Accepted

Decision: For `mode=recover` + `strategy=carry_forward`, demand is capped at actual debt per `(bookId, roundId)` from `execAnalysis.missed` + `execAnalysis.partial`.

Rationale: Previously allocated full remaining demand → regenerated entire future plan from 37-page debt.

Impact: `_computeDebtScope` + `_scopeDemandsToDebt` in `planner-replan-v7.js`.

## ADR-018 — Buffer Consumption = Min(Pool, ProposedMinutes)

Date: 2026-10-09
Status: Accepted

Decision: `reserveConsumed = min(remaining_pool, proposedMinutes)`. Never fill pool based on unmet demand magnitude.

Rationale: Previous `min(pool, unmet)` always saturated pool regardless of proposal size.

Impact: `generateReplanProposal` in `planner-replan-v7.js`.

## ADR-019 — Atomic Apply with Rollback

Date: 2026-10-09
Status: Accepted

Decision: Apply validates everything pre-mutation, snapshots `{activities, tasks, reserveState, planVersions, replanTriggers}`, mutates, single save, and rolls back on any failure.

Rationale: Partial mutation would leave state inconsistent.

Impact: `applyReplanProposal` in `planner-replan-apply-v7.js`.

## ADR-020 — Trigger Clear by IDs Only

Date: 2026-10-09
Status: Accepted

Decision: On successful Apply, only `proposal.coveredTriggerIds` are cleared. `RT.clearByIds(planId, ids)` added. `RT.clear(planId)` still exists for admin but is not used by Apply.

Rationale: Clearing all plan triggers would delete unrelated changes.

Impact: `RT.clearByIds`, `proposal.coveredTriggerIds` capture in `generateReplanProposal`, UI call removed.

## ADR-021 — Tests Must Not Mutate Real State

Date: 2026-10-09
Status: Accepted

Decision: `__tests` functions must operate on isolated mock objects. No `delete s[k]` on `window.INTERNSHIP_STATE`. No `_savedCopy` restore-in-place.

Rationale: Previous `PRA.__tests` broke closure references to state.

Impact: `PRA.__tests` rewritten (Phase 26.3b). Safe pattern to follow for future test suites.

## ADR-022 — Today Audit Findings (Phase 27.0)

Date: 2026-10-09
Status: Proposed

Decision: Pending Design Agent. Two parallel "today" views exist (dashboard + residency today tab). Unified Today v1 proposed as minimal Phase 27.1.

Status: Awaiting Design Agent approval.

Impact: `renderDashboard`, `_renderTodayTab`, `day-timeline-v20.js`.

## ADR-023 — Day Bar Range in Workspace State

Date: 2026-10-10
Status: Accepted

Decision: The dashboard day bar display range is stored in
`state.workspace.dayBarRange = { start: 6, end: 24 }`.

Rationale: User-adjustable, persisted across sessions.

Impact: Render uses `_getDayBarRange()` which reads from workspace.

## ADR-024 — Tooltip via JS-Driven DOM Element

Date: 2026-10-10
Status: Accepted

Decision: Timeline/bar tooltips are rendered as a fixed-position DOM element
(`#io-timeline-tip`), not as CSS `::after` pseudo-elements.

Rationale: CSS grid + stacking context + overflow rules in parents prevented
pseudo-element tooltips from displaying reliably.

Impact: Driver listens on `mouseover`/`mouseout` at document level.

## ADR-025 — Week Starts on Saturday

Date: 2026-10-10
Status: Accepted

Decision: The week strip always starts on Saturday (Persian convention),
regardless of today's weekday.

Rationale: User expectation.

Impact: `_getSaturdayOfWeek(jy, jm, jd, offset)` used by week strip
generation and `_dashWeekLabel()`.

## ADR-026 — Pointer-Based Drag System

Date: 2026-10-10
Status: Accepted

Decision: Drag-and-drop uses pointer events (`mousedown` / `mousemove` /
`mouseup` at document level), not HTML5 drag-and-drop.

Rationale: WebView2 does not reliably fire `dragover` events with HTML5 DnD.

Impact: `_ioPtrDrag` state object, `_currentDragPayload` for cross-widget drag,
ghost element (`io-pointer-ghost`) follows cursor.

## ADR-027 — Buffer Pattern for Preview

Date: 2026-10-10
Status: Accepted

Decision: Drag operations write to `_dashEditBuffer` (not the real state).
Preview uses `_ioStateWithBuffer()` which returns a shallow clone of state
with buffer applied.

Rationale: Allows save/cancel semantics without mutating Source of Truth
during drag.

Impact: `_dashSetBufferedValue`, `_dashClearBuffer`, `_dashHasBuffer`,
`_ioStateWithBuffer`. Commit via `_dashCommitBuffer`.
## ADR-028 — HARD-Only Enforcement in `_shouldBlockOverlap`

Date: 2026-10-11
Status: Accepted

Decision: `_shouldBlockOverlap` returns true only when the conflict
policy is `"HARD"`. WARNING and CONTEXTUAL do not block drag/drop.

Rationale: Prior implementation returned true for any conflict, which
made WARNING (study↔shift) behave as HARD. This contradicted the RULES
table and the 4 other consumers that checked `policy === "HARD"`.
Additionally, a blanket `sourceType === "shift"` exemption was removed;
self-comparison is now handled with an explicit id check.

Impact: `_shouldBlockOverlap` in `app/app.js`.

## ADR-029 — Dashboard Conflict Feed Must Use `_getEffectiveItems`

Date: 2026-10-11
Status: Accepted

Decision: Every dashboard path that feeds conflict detection must
obtain items via `_getEffectiveItems(dateKey)`, which applies
`_dedupItemsForOverlap`. Raw `schedulingProjection.projectDate` calls
are not permitted in dashboard conflict paths.

Rationale: A residency activity that has a linked task appears in the
projection twice (once as `sourceType: "residencyActivity"`, once as
`sourceType: "task"`). Without dedup, this produces self-conflicts
(`study ↔ study = HARD`) and stale titles ("مطالعه").

Impact: 5 dashboard paths in `app/app.js` (renderDashboard,
_dashRenderSelectedDate, toggle handler, _dashRerenderDayBar, and
one legacy refresh path).

## ADR-030 — Legacy Conflict Detector Retired from Task Modals

Date: 2026-10-11
Status: Accepted

Decision: `InternshipTimeline.detectConflicts` is no longer called
from task-modal submit paths. Conflict decisions for scheduling are
made only by `schedulingConflict` (policy-aware engine).

Rationale: The legacy detector had no notion of policy and produced
duplicate warning modals for pairs whose policy was actually
`ALLOWED` (e.g., case↔case). The new engine already covered all
relevant cases.

Constraint: `InternshipTimeline.detectConflicts` was NOT deleted
from `app/timeline.js` — that requires a full consumer audit.
`showConflictWarning` became orphaned and is documented as ISSUE-15.

Impact: 2 call sites in `app/app.js`.

## ADR-031 — Neutral Fallback Title for Untitled Residency Activity

Date: 2026-10-11
Status: Accepted

Decision: When a residency activity has no `title` and no `notes`,
its projection title is `"فعالیت بدون عنوان"` instead of a
kind-based label.

Rationale: The previous fallback labeled untitled activities as
"مطالعه" purely from `activity.kind`, which produced misleading
titles in the timeline and conflict banner. Kind is a category, not
a title.

Impact: `scheduling-projection-v20.js::projectResidencyActivity`.

## ADR-032 — Life Activities Map to Study-Kind in Conflict Engine

Date: 2026-10-11
Status: Accepted

Decision: Category sleep/food/commute in conflict engine resolve to
kind study via _kindOf. They are NOT given an independent kind.

Rationale: Same strictness semantics as study/residency/review/assessment.
Only shift is WARNING for study-kind. Everything else HARD except case (ALLOWED).

Impact: scheduling-conflict-v20.js::_kindOf
Tests: 7 new (CF.__tests). CF 1.0.1.

## ADR-033 — study|clinical = HARD (User-Approved RULES Change)

Date: 2026-10-11
Status: Accepted (explicit user approval by Edris)

Decision: RULES entry study|clinical changed from WARNING to HARD.

Rationale: User requirement — study-kind activities (incl. sleep/food/commute/
residency/review/assessment) may only overlap with shift. Any other overlap is HARD.

Exception: shift|study remains WARNING.

Impact: scheduling-conflict-v20.js RULES table; CF 1.0.1 -> 1.0.2.
Note: non-additive change to frozen RULES table; required explicit user approval.
Tests: 5 new + 1 updated (CF.__tests -> 48).
## ADR-034 — Virtual Recurrence Expansion

Date: 2026-10-12
Status: Accepted

Decision: Recurring tasks expand at projection time. No independent
task instances for occurrences are stored in state.

Context: MVP-01 exposed recurrence in the form but had zero execution.
Options considered:
  (i)   spawn N tasks on save (state bloat),
  (ii)  virtual expansion in schedulingProjection.projectAll,
  (iii) read-time filter in renderers,
  (iv)  separate recurrences[] table.

Option (ii) chosen: single point, no state growth, deterministic.

Contract:
  - Virtual id = "virtual:<parentId>@<date>"
  - sourceId stays parentId
  - completion via task.recurrenceExceptions[date] = "completed"
  - projectAll accepts rangeStart/rangeEnd; default [today, today+180]

Impact:
  - scheduling-projection-v20.js: _expandRecurrence + range options
  - app.js::toggleTask dispatches on virtual: prefix
  - No schema bump, no migration

Tests: 16 new in SP.__tests (R1..R15 + R4b).

## ADR-035 — Unified Life Domains (Design Only)

Date: 2026-10-12
Status: Proposed (awaiting approval)

Decision: Design a unified personal-management layer integrated into
existing State, Task, Projection, and Timeline. No new stores.

Scope:
  - Health & Nutrition (3 sub-tabs: workout, nutrition, body)
  - Sleep
  - Projects (task.projectId additive)
  - Finance (transactions + monthly report)
  - Life & Leisure (movies, books, dates, social, travel)

Data contract (additive, no schema bump):
  - state.health   — profile, bodyLog[], foodCatalog[], foodLog[],
                     workoutLog[], calorieTarget
  - state.sleep    — schedule{}, log[]
  - state.projects — array of project records
  - state.finance  — transactions[], categories[], budgets{}
  - state.life     — items[] (movie|book|date|social|travel|...)
  - task.projectId, task.contentId, task.logData (all nullable)

Timeline ownership: unchanged — only state.tasks[] is projected.
Timed items (workout, nap, sleep-night, scheduled content) reuse
existing Task + Recurrence. Logs (food, weight, transactions,
unplanned sleep) are never independent schedule entries.

Impact: none yet (design only). Delivered as DESIGN-30 report.

Next: Phase A — Life Areas Restructure (rename body→health,
income→projects, hide commute from dashboard cards, enable life).


## ADR-036 — Food.db Read-Only Access Layer (Phase F.1)

Date: 2026-10-15
Status: Accepted

Decision: Food.db (SQLite, ~2.8 MB) is accessed through a read-only
ASP.NET Core layer. The file is NEVER written, NEVER migrated, NEVER
replaced.

Context: Need Persian food/exercise catalog. Options:
  (i)   copy whole DB into JS bundle,
  (ii)  query SQLite at runtime via backend,
  (iii) external HTTP service.
Option (ii) chosen — smallest change, live data, no duplication.

Contract:
  - Dependency: Microsoft.Data.Sqlite 8.0.10
  - Connection: Mode=ReadOnly;Cache=Shared;Pooling=True
  - Path: <rootDir>/Food.db (fallback: parent/Food.db)
  - Missing DB → HTTP 503 { error: "db_missing" }
  - Routes (all GET):
      /api/fooddb/health
      /api/fooddb/categories
      /api/fooddb/exercise-categories
      /api/fooddb/foods?q&categoryId&limit
      /api/fooddb/foods/{id}
      /api/fooddb/exercises?q&categoryId&limit
      /api/fooddb/exercises/{id}
  - Search: LIKE + Persian normalization (ي→ی، ك→ک، ZWNJ→space)
  - Ranking: exact=0 > starts-with=1 > contains=2
  - status=1 on both tables
  - Limit clamp [1, 50]; default 20
  - Foods: normalize nutrients to per-100g from amount ≠ 100 correctly
  - Nutrients = -1 → JSON null (never 0)
  - Household units from food_units_vals (per-food); food_units as fallback
    (marked approximate with "~")

Impact:
  - server-dotnet/Program.cs (+~360 lines)
  - csproj (+Microsoft.Data.Sqlite)
  - No schema bump

Measured: warm avg 16 ms / Persian query; 3194 bytes / 20 results.

## ADR-037 — Food Log Snapshot Semantics (Phase F.2)

Date: 2026-10-15
Status: Accepted

Decision: Every foodLog item stores a snapshot sufficient to display
and recalculate totals WITHOUT querying Food.db again.

Contract:
  foodLog[].items[] = {
    foodId,                       // "db:<id>" | "custom:<ts>"
    source,                       // "db" | "custom" | (legacy manual)
    dbFoodId,                     // Food.db id, when source="db"
    grams,                        // total grams consumed
    unit,                         // { unitId, unitName, gram, count, approx } | null
    snapshot: { name, kcal, p, c, f }   // per-100g values
  }

Rationale: Catalog changes / DB unavailable must not alter historical
display. Default-food (manual catalog) entries remain backward-compatible
with the pre-F.2 shape (foodId + grams + snapshot).

Impact:
  - app.js: _mealTotals, _dayTotals null-safe (hasUnknown flag)
  - Missing nutrient ≠ 0 → shown "—"
  - No migration (nullable additions only)

## ADR-038 — Nutrition Log Day-Scoped Editing (Phase F.4)

Date: 2026-10-15
Status: Accepted

Decision: The nutrition UI supports editing any past day's food log
via the Trend heatmap. State uses:

  var _nutritionViewDate = null;  // null = today
  function _nutritionDate() { return _nutritionViewDate || todayJalali(); }

Food.db modal adds items to `_nutritionDate()`, not `todayJalali()`.
The UI shows a "بازگشت به امروز" affordance when editing a past day.

Contract:
  - No mutation of past-date semantics
  - No schema change (existing foodLog.date already carries the date)
  - Trend heatmap click → set _nutritionViewDate → switch to "روز" tab

Impact:
  - app.js: _nutritionViewDate, _nutritionDate, _nutritionShiftDay
  - fooddb-ui.js: viewDate() helper (window.__ioNutritionDate bridge)

## ADR-039 — Nutrition Trend Heatmap Contract (Phase F.4)

Date: 2026-10-15
Status: Accepted

Decision: The nutrition trend view is a Jalali monthly calendar with
5 heat levels, plus a 30-day line chart and 4 stat cards.

Heat levels (relative to calorieTarget):
  l0 — no data
  l1 — kcal < 50%  target
  l2 — 50% ≤ kcal < 85%
  l3 — 85% ≤ kcal ≤ 110%
  l4 — kcal > 110%

Contract:
  - No data ever faked: missing days show l0
  - Line chart uses only days with kcal > 0
  - Target line shown when calorieTarget exists
  - 4 stat cards: days-logged, avg kcal, hit-target days, max kcal
  - Monthly navigation: prev/next; today highlighted

Impact:
  - app.js: _renderNutritionTrend, _renderNutritionLineChart,
    _renderNutritionStats
  - No state change

## ADR-040 — Notification Bell Contract (Phase F.5)

Date: 2026-10-15
Status: Accepted

Decision: Notification bell lives in app header, next to Save/Theme.
Hidden when 0 items. Hover opens a dropdown. Items are actionable.

Sources (from _dashNotificationsList):
  - meals:  unlogged meals whose scheduled time has passed
            (via _mealReminderList, recurrence-aware)
  - tasks:  incomplete tasks with date < today

Item actions (data-act):
  - "open-meal"  → switch to nutrition → open Food.db modal for that meal
  - "edit-task"  → call window.__ioOpenTask(taskId) → openTaskForm
  - "done-task"  → call window.__ioCompleteTask(taskId) → mark complete

Contract:
  - Click handlers attached per-button AFTER innerHTML swap (not delegation)
  - Bell lives in index.html header, updated by _updateDashBell()
  - Bridge functions in app.js: __ioOpenTask, __ioCompleteTask
  - No new state fields (pure derivations)

Impact:
  - app/index.html: <div id="io-dash-bell" class="dash-bell-host">
  - app.js: _updateDashBell, _dashNotificationsList, _dashBellDoAction
  - CSS: .dash-bell-host, .dash-bell-btn, .dash-bell-drop, .db-item, .db-act
  - Extend _dashNotificationsList with new kinds (workout, study) later
    without touching meal/task logic
## ADR-041 — Exercise Database Access Layer (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Exercise catalog reads reuse the F.1 Food.db read-only endpoints
(`/api/fooddb/exercise-categories`, `/exercises`, `/exercises/{id}`).
No new server route, no duplication of catalog into State.

Impact:
- app/residency/workoutdb-ui.js (external IIFE, ~570 lines)
- No server change; Food.db untouched

## ADR-042 — Exercise Log Snapshot Contract (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Every entry in `state.health.workoutLog[]` carries a frozen
snapshot sufficient for historical display:

    { id, date, dbExerciseId, snapshot:{ name, categoryName, met },
      durationMinutes, weightKg, kcalEstimated, formula:"gross-met-3.5",
      createdAt, updatedAt? }

Formula: kcal = MET × 3.5 × weightKg / 200 × durationMinutes
Labeled "تخمینی" in UI. NULL on any missing/invalid input (never 0).
Never writes back to calorieTarget or foodLog.

## ADR-043 — Workout UI as External Module (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Exercise modal lives in `app/residency/workoutdb-ui.js` as an
external IIFE, following the fooddb-ui.js pattern. app.js only exposes
`window.__ioWdbBridge` and hub integration points (`_renderWorkoutTab`,
`_renderWorkoutTrend`).

Rationale: Keeps app.js patch surface minimal; module replaceable if broken.

## ADR-044 — Sleep Hub: Log-First, Auto-Task on Explicit Sync (F.7)

Date: 2026-10-15
Status: Accepted

Decision: Sleep log (`state.sleep.log[]`) is the source of truth for actual
sleep. Auto-tasks are generated ONLY on explicit user action (💾 button in
settings), never on render or boot. Each auto-task is per-day, independent:

    { id: "sl-night-ev-YYYY/M/D" | "sl-night-mo-YYYY/M/D" | "sl-nap-YYYY/M/D",
      _sleepAuto: "night:evening" | "night:morning" | "nap",
      recurrence: "none", _cont: "tail"|"head"|null }

Cross-midnight night is split into two same-day segments:
- Evening: date=prev day, time=bedTime, duration=1440-bedMin
- Morning: date=wake-up day, time="00:00", duration=wakeMin

Rationale: User edits/deletes must not affect other days. Sync is idempotent
(purge all `_sleepAuto`, rebuild from scratch).

## ADR-045 — Sleep Cross-Midnight UI Merge (F.7)

Date: 2026-10-15
Status: Accepted

Decision: In list views (dashboard "today tasks", calendar day panel,
dt20 schedule cards), the two split tasks are shown as ONE merged card
with the full interval (e.g. 22:00 → 06:00). In the horizontal day bar
they remain two blocks with directional arrows:
- Evening block: `→` (continues into next day)
- Morning block: `←` (continues from previous night)

Impact:
- app.js::tasksOnDate (calendar) · PATCH:phase-F7-merge5
- app.js::renderDashboard `todaysTasks` · PATCH:phase-F7-merge2
- day-timeline-v20.js::_renderTimedItem · PATCH:phase-F7-merge
- styles.css::.is-cont-tail / .is-cont-head arrows

## ADR-046 — Sleep Bell Notification (F.7)

Date: 2026-10-15
Status: Accepted

Decision: A dedicated bell kind `"sleep"` surfaces unlogged overnight
sleeps (6:00–13:00 window, or overdue in general). Action button
"ثبت ›" opens `sleepUI.openForm("night", date)` which loads the task's
date into the form. Logs suppress the reminder for that date.
Sleep tasks never appear in the generic "کار عقب‌افتاده" section.

Impact:
- app.js::_dashNotificationsList (kind branch + log check)
- app.js::_updateDashBell (data-date attr)
- app.js::_dashBellHandleClick (open-sleep with date)

## ADR-047 — Sleep Log Date Ownership (F.7)

Date: 2026-10-15
Status: Accepted

Decision: A nighttime sleep log entry belongs to its **wake-up date**.
A nap belongs to its own calendar date. Duration is computed from
actual bedTime/wakeTime with cross-midnight wrap (end<start → +1440).
Identical bedTime/wakeTime → null (not 24h).

Impact: `_duration()` in sleep-ui.js, `_saveForm`, calendar filters.
Tests: sleep-tests.js S01–S14.

## ADR-041 — Exercise Database Access Layer (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Exercise catalog reads reuse the F.1 Food.db read-only endpoints
(`/api/fooddb/exercise-categories`, `/exercises`, `/exercises/{id}`).
No new server route, no duplication of catalog into State.

Impact:
- app/residency/workoutdb-ui.js (external IIFE, ~570 lines)
- No server change; Food.db untouched

## ADR-042 — Exercise Log Snapshot Contract (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Every entry in `state.health.workoutLog[]` carries a frozen
snapshot sufficient for historical display:

    { id, date, dbExerciseId, snapshot:{ name, categoryName, met },
      durationMinutes, weightKg, kcalEstimated, formula:"gross-met-3.5",
      createdAt, updatedAt? }

Formula: kcal = MET × 3.5 × weightKg / 200 × durationMinutes
Labeled "تخمینی" in UI. NULL on any missing/invalid input (never 0).
Never writes back to calorieTarget or foodLog.

## ADR-043 — Workout UI as External Module (F.6)

Date: 2026-10-15
Status: Accepted

Decision: Exercise modal lives in `app/residency/workoutdb-ui.js` as an
external IIFE, following the fooddb-ui.js pattern. app.js only exposes
`window.__ioWdbBridge` and hub integration points (`_renderWorkoutTab`,
`_renderWorkoutTrend`).

Rationale: Keeps app.js patch surface minimal; module replaceable if broken.

## ADR-044 — Sleep Hub: Log-First, Auto-Task on Explicit Sync (F.7)

Date: 2026-10-15
Status: Accepted

Decision: Sleep log (`state.sleep.log[]`) is the source of truth for actual
sleep. Auto-tasks are generated ONLY on explicit user action (💾 button in
settings), never on render or boot. Each auto-task is per-day, independent:

    { id: "sl-night-ev-YYYY/M/D" | "sl-night-mo-YYYY/M/D" | "sl-nap-YYYY/M/D",
      _sleepAuto: "night:evening" | "night:morning" | "nap",
      recurrence: "none", _cont: "tail"|"head"|null }

Cross-midnight night is split into two same-day segments:
- Evening: date=prev day, time=bedTime, duration=1440-bedMin
- Morning: date=wake-up day, time="00:00", duration=wakeMin

Rationale: User edits/deletes must not affect other days. Sync is idempotent
(purge all `_sleepAuto`, rebuild from scratch).

## ADR-045 — Sleep Cross-Midnight UI Merge (F.7)

Date: 2026-10-15
Status: Accepted

Decision: In list views (dashboard "today tasks", calendar day panel,
dt20 schedule cards), the two split tasks are shown as ONE merged card
with the full interval (e.g. 22:00 → 06:00). In the horizontal day bar
they remain two blocks with directional arrows:
- Evening block: `→` (continues into next day)
- Morning block: `←` (continues from previous night)

Impact:
- app.js::tasksOnDate (calendar) · PATCH:phase-F7-merge5
- app.js::renderDashboard `todaysTasks` · PATCH:phase-F7-merge2
- day-timeline-v20.js::_renderTimedItem · PATCH:phase-F7-merge
- styles.css::.is-cont-tail / .is-cont-head arrows

## ADR-046 — Sleep Bell Notification (F.7)

Date: 2026-10-15
Status: Accepted

Decision: A dedicated bell kind `"sleep"` surfaces unlogged overnight
sleeps (6:00–13:00 window, or overdue in general). Action button
"ثبت ›" opens `sleepUI.openForm("night", date)` which loads the task's
date into the form. Logs suppress the reminder for that date.
Sleep tasks never appear in the generic "کار عقب‌افتاده" section.

Impact:
- app.js::_dashNotificationsList (kind branch + log check)
- app.js::_updateDashBell (data-date attr)
- app.js::_dashBellHandleClick (open-sleep with date)

## ADR-047 — Sleep Log Date Ownership (F.7)

Date: 2026-10-15
Status: Accepted

Decision: A nighttime sleep log entry belongs to its **wake-up date**.
A nap belongs to its own calendar date. Duration is computed from
actual bedTime/wakeTime with cross-midnight wrap (end<start → +1440).
Identical bedTime/wakeTime → null (not 24h).

Impact: `_duration()` in sleep-ui.js, `_saveForm`, calendar filters.
Tests: sleep-tests.js S01–S14.


## ADR-048 — Projects Domain (F.8)

Date: 2026-10-15
Status: Accepted

Decision: Projects are a first-class domain (`state.projects[]`), separate
from tasks. `task.projectId` is a nullable link. Progress is derived:
`done linked tasks / total linked tasks`. No independent progress field
is stored.

Rationale: A project is not a schedule; it groups tasks. The task remains
the single scheduling authority (Timeline, recurrence, conflict engine).

Impact: app/residency/projects-ui.js (external IIFE), task form gets an
optional project picker (locked when created from a project), project
delete detaches task.projectId without deleting tasks.

## ADR-049 — Finance Ledger (F.9)

Date: 2026-10-15
Status: Accepted

Decision: `state.finance` is a personal ledger, not a double-entry system.
Transactions carry a kind (`income`/`expense`) and a positive integer amount
in toman. Category name and project title are snapshotted per transaction
so historical display does not depend on live catalogs.

Impact: app/residency/finance-ui.js (external IIFE), Money formatting in
Persian digits + Latin comma. No currency conversion. No account balances.

## ADR-050 — Finance Dual Budget (F.9.1)

Date: 2026-10-15
Status: Accepted

Decision: `budgets["YYYY/M"]` becomes an object `{ income, expense }`.
Legacy numeric values are interpreted as `expense` (backward compat).
Neither budget is a cash balance; they are planning targets.

Impact: `_budget()` and `_saveBudget()` in finance-ui.js. No migration.

## ADR-051 — Finance Daily Reminder (Owner-Approved)

Date: 2026-10-15
Status: Accepted (explicit owner approval by Edris)

Decision: A daily reminder for finance transaction logging is included,
with owner-chosen start hour and 6-hour active window. Dismissible for
today only. Bell kind `finance-daily`.

Rationale: Edris requested this directly as a product feature; it is
documented here so future agents do not remove it as "scope creep".

Impact: finance-ui.js `_isDailyReminderOn` / `_getReminderHour` /
`_isReminderWindowActive` / `_isDismissedToday` / `_dismissDailyReminder`;
app.js bell kind + action branch.

## ADR-052 — Finance Month Close / Reopen (F.9.1)

Date: 2026-10-15
Status: Accepted

Decision: Closing a month sets `months["YYYY/M"] = { status: "closed",
closedAt }`. The month becomes read-only. Reopening removes the closure
record. No transaction data is ever deleted. All summary/chart values are
derived from the ledger — never cached.

## ADR-053 — Life & Leisure Domain (F.10)

Date: 2026-10-15
Status: Accepted

Decision: `state.life.items[]` holds personal content (movies, books,
series) and planned events (dates, social, travel). A life item may link
to a scheduled task via `life.taskId` — the task remains the sole
scheduling authority.

Rationale: Separates "records of interest / experience" from "scheduled
time blocks". Timeline only sees tasks.

Impact: app/residency/life-ui.js (external IIFE), auto-link via
`window.__lifeLinkPending` + `R.lifeUI.consumePendingLink(taskId)`.

## ADR-054 — Dashboard Greeting Cockpit (UX)

Date: 2026-10-16
Status: Accepted

Decision: A single compact greeting card replaces the previous tall banner.
Metrics hide when their source is empty (no fabricated zeros).
Money is rounded before formatting.

Rationale: The prior banner duplicated info from tasks / shifts / rotation
and occupied ~250px. Cockpit targets ~140–180px with cleaner hierarchy.

Impact: app.js renderDashboard; styles.css GREETING-COCKPIT-V* blocks.

## ADR-055 — Sleep Quick-Action Route

Date: 2026-10-16
Status: Accepted

Decision: Sleep quick-action from the greeting cockpit must call
`setRoute("area-detail","sleep")` BEFORE invoking `sleepUI.openForm(...)`.
Otherwise the sleep render replaces the entire dashboard view and the user
loses navigation.

Impact: app.js `_cockpitAction("sleep")`.

## ADR-056 — Life Back-Button Robustness

Date: 2026-10-16
Status: Accepted

Decision: The Life hub back button sets `window.location.hash = "#/dashboard"`
and additionally calls the bridge `setRoute("dashboard")` if available.
Belt-and-braces to survive missing hash-router scenarios.

## ADR-057 — Never Write to `window.INTERNSHIP_STATE`

Date: 2026-10-16
Status: Accepted (v0.4.2)

Decision: `window.INTERNSHIP_STATE` is a frozen read-only snapshot
loaded from `data/state.js` at boot. It is NOT the live state.

The live state object is `state` inside the `app.js` IIFE. Every
external UI module must obtain it through the module bridge:
`need().state()` (or the equivalent accessor on `window.__io<X>Bridge`).

Rationale: `fooddb-ui.js::addSelected` and `addCustom` were writing
into `window.INTERNSHIP_STATE.health.foodLog`. The success toast
displayed, but `saveState()` (which serializes the live `state`)
never saw the change. Result: user-visible "not adding" bug in v0.4.1.

Fix (v0.4.2):
  - `__ioFdbBridge` gained `state: function () { return state; }`.
  - `fooddb-ui.js` `addSelected`, `addCustom`, `favList` now call
    `need().state()` instead of reading the global.

Impact:
  - app/residency/fooddb-ui.js
  - app/app.js (bridge extension)

Enforcement for future modules: any code in `app/residency/*.js`
that mutates user data must call `need().state()` (or its
module-specific equivalent). Direct access to
`window.INTERNSHIP_STATE` in a UI module is a code-review red flag.

## ADR-058 — Manual / AI Content Entry Contract

Date: 2026-10-16
Status: Accepted (v0.4.1)

Decision: Users can add custom content to the
Study / Emergency / Procedures areas by two paths:

  1. **Manual** — «➕ محتوای دستی» modal (title + category + optional note).
  2. **AI-assisted** — «🤖 تولید با AI» 3-step modal:
     copy area-specific prompt → paste JSON → commit.

Both paths write to `state.programContent[]` with the same shape:

    {
      id, areaId,
      sourceType: "<areaId>_manual",
      sourceId:   "<areaId>.<categoryIndex>.manual.<uid>",
      title, note,
      manual: true,
      aiGenerated?: true,
      addedAt, active: true, createdAt, updatedAt
    }

A categoryIndex is derived from
`DATA.lifeAreasStructure.areas[areaId].categories`.

Duplicate policy: same `(areaId, title)` is skipped silently.

Impact:
  - app/app.js: `_openManualContentModal`, `_openAIContentModal`,
    `_aiPromptForArea`, program row template, wire handlers.
  - app/styles.css: `.study-view-btn.is-manual`, `.is-ai`,
    `.ai-content-modal`, `.ai-content-steps`, `.ai-step`, ...

Non-goal: writing into `data.js` or the shared curriculum. Manual/AI
content is user-scoped (stored in state, not in the base catalog).
## ADR-059 — Installer-Based Auto-Update (v0.5.1)

Date: 2026-10-16
Status: Accepted

Decision: Auto-update uses the Inno Setup installer as the update
payload. The backend downloads it, verifies SHA256, and runs it with
`/SILENT /NORESTART /SUPPRESSMSGBOXES /DIR=<previous-install-path>`.
The old ZIP-based approach (replace `app/` directory only) is retired.

Context: Prior auto-update replaced only the `app/` folder, missing
new backend binaries, new root files (Food.db), or new dependency
changes. Any version with a backend or DB change could not ship
via that path.

Alternatives considered:
  (i)  ZIP of full release folder + in-place replace (unsafe: locked
       exe cannot be overwritten while running),
  (ii) keep ZIP-based (fails on schema/backend changes),
  (iii) installer-based silent (chosen).

Why (iii):
  - Inno Setup installer already exists for manual installs.
  - AppId is stable → installer upgrades over previous install and
    preserves user `data/`.
  - `/SILENT` runs without UI; the running app calls `Environment.Exit(0)`
    after starting the installer so files are free to replace.
  - SHA256 verification guarantees the download was not corrupted.
  - Handles all future changes: new files, new DB, new NuGet deps,
    schema bumps via existing migration chain.

Contract:
  - Source of truth: `VERSION` (semver `X.Y.Z`).
  - Manifest URL: `https://github.com/<owner>/<repo>/releases/latest/download/update.json`
  - Manifest fields: `latest`, `installerUrl`, `sha256`, `sizeBytes`,
    `releaseNotes`, `publishedAt`, `zipUrl` (legacy alias).
  - `release.cmd` (double-click) → `release.ps1` does the full cycle:
    build → assemble → installer → sha256 → push → gh release.
  - Backend `/api/check-update` reads manifest and returns parsed JSON.
  - Backend `/api/apply-update`:
      1. Download installer to `%TEMP%`
      2. Verify SHA256
      3. Read install path from registry
         `HKCU\...\Uninstall\{AppId}_is1\InstallLocation`
      4. Fallback to `%LOCALAPPDATA%\Programs\InternshipOS`
      5. `Process.Start(installer, "/SILENT /NORESTART ... /DIR=<path>")`
      6. After 2 s: `Environment.Exit(0)`
  - Installer `release.iss`:
      - `CloseApplications=force`, `RestartApplications=no`
      - `UsePreviousAppDir=yes`
      - `data\` excluded from wildcard → preserved
      - `[Run]` without `skipifsilent`

Impact:
  - `release.iss`, `release.ps1`, `release.cmd` (new)
  - `server-dotnet/Program.cs` — check-update + apply-update rewritten
  - `app/app.js` — sends `installerUrl` + `sha256` to backend
  - `app/data.js` — `updateUrl` points to manifest
  - `.gitignore` — ignore `data/`, `server/`, `dist-*`, `*.bak*`

Migration path:
  - Versions < 0.5.1 must install v0.5.1 manually once.
  - From v0.5.1 on, all updates are one-click.

Non-goals:
  - Delta / incremental updates.
  - Rollback UI (installer keeps 2 backups; manual restore).
  - Code signing (planned future).


## ADR-060 — V7 Sequential Allocator (Isolated)
Date: 2026-10-18
Status: Accepted

Decision: Isolated planner-allocator-v7.js with pure allocate(input). No DOM, no state access.

Contract:
- Input: planId, examDate, books[], days[], sessionMinutes, maxDays
- Books: id, title, totalPages, startPage, endPage, studyOrder, pagesPerHour
- Days: date, capacityMinutes
- Output: ok, blocks[], feasibility, validation

Rules:
- Days chronological; books strictly by studyOrder
- A day contains blocks from at most one book
- If book finishes mid-day, that day ends; next book starts next day
- Pages sequential, no gaps/duplicates/backtracking
- maxDays respected; examDate exclusive
- Deterministic

## ADR-061 — V7 Input Honors User defaultCapacity
Date: 2026-10-18
Status: Accepted

planner-input-v7.js reads capacity from settings.defaultCapacity[dayType],
not from R.DEFAULT_CAPACITY. Explicit zero preserved. Reserve applied once.

## ADR-062 — Daily Life Schedule Model
Date: 2026-10-18
Status: Accepted

Recurring daily-life commitments stored at state.residency.settings.dailyLifeSchedule.
Deductions only. Never create Timeline tasks. Overlaps counted once. Overnight spills to next day.

## ADR-063 — Effective Capacity = min(baseCap, windowAvail)
Date: 2026-10-18
Status: Accepted

baseCap = defaultCapacity[dayType] x (1 - reservePercent/100)
windowAvail = (studyWindow.end - studyWindow.start) - lifeEventDeduction
effectiveCapacity = min(baseCap, windowAvail)

Rejected: baseCap - deduction (can go negative).
Example: window 06:30-23:00 = 990 min; events 540 -> avail 450;
normal day 240 x 0.9 = 216 -> effective = min(216, 450) = 216.

## ADR-064 — studyHours <-> defaultCapacity Sync
Date: 2026-10-18
Status: Accepted

Bidirectional: prefill from defaultCapacity/60; commit writes defaultCapacity = studyHours x 60.

## ADR-065 — Per-Day Apply in V7 UI
Date: 2026-10-18
Status: Accepted

V7 UI offers per-day add-to-Timeline. No bulk apply.
Dedup: content-based on (planId, roundId, bookId, plannedDate). Idempotent.

## ADR-066 — Legacy Planner Remains Active
Date: 2026-10-18
Status: Accepted

R.plannerUI.open(planId) continues to route to legacy planner.
V7 only via plannerStudyV7.ui.open(). Route switch is Milestone 6.
## ADR-067 — V7 Incremental Replan Contracts

Date: 2026-10-19 (Agent #19)
Status: Accepted

Decision: The V7 planner honours the following contracts for M5:

1. **Progress = union(baseline, completed activities)**, clamped to enrollment range.
2. **Allocated = planned/in_progress activities**, scoped to enrollment round.
3. **Dedup key** = `(planId, roundId, bookId, date, pageRangeOverlap)`.
4. **Day capacity** = `base - sum(planned_minutes)`; if >0 planned → `cap = 0`.
5. **Generate is idempotent**: existing activity of same overlap is skipped.

Rationale: Prevent duplicate activity, respect real progress, allow partial
adds to be resumed without data loss.

Impact: `planner-input-v7.js::_collectActivityRanges`,
`planner-study-ui-v7.js::_blockAlreadyInState` (rewritten from day-key to range-overlap).

Tests: input T50-T55 + T27-T30 + T43-T47; UI T1-T10 + integration test 18/18.

## ADR-068 — V7 Route Switch (idempotent, legacy preserved)

Date: 2026-10-19 (Agent #19)
Status: Accepted (M6)

Decision: `R.plannerUI.open(planId)` routes to `plannerStudyV7.ui.open`.
Legacy handler preserved at `R.plannerUI._legacyOpen`.

Idempotency: guard on `_legacyOpen` (run multiple times = no-op).

Rationale: Users must not need F12. Legacy must stay reachable for
fallback / A/B comparison / rollback.

Impact: `planner-study-ui-v7.js::_installRouteSwitch`.
`planner-ui-v6-5.js` remains loaded but shadowed (not removed).

Testing: integration test PASS (route switched=true, legacy preserved=true).

Non-goal: removal of `planner-ui-v6-5.js` — deferred to later phase.

## ADR-069 — T7 Test Strengthened (three-way split)

Date: 2026-10-19 (Agent #19)
Status: Accepted

Decision: `input.__tests::T7` (single `<=` assertion) replaced by:

- **T7a:** no-planned days → `capacityMinutes === base` **exact**
- **T7b:** planned days → `capacityMinutes < base` **strict**
- **T7c:** all days → `capacityMinutes <= base` **ceiling**

Rationale: Original `<=` would pass even if capacity was 0 for all days
(catastrophic). T7a fails if user settings not applied; T7b fails if day
not locked; T7c fails if capacity inflates.

Impact: `planner-input-v7.js::__tests`.

Test count: input 39 → 41.
## ADR-070 — V7 Draft Editor: source-only in edit mode

Date: 2026-10-20 (Agent #20)
Status: Accepted (M7-B, Design Agent Option 1)

Decision: The V7 multi-day draft editor (`_renderDraft`) displays ONLY `_draftState.source`
in edit mode. Allocator runs only on explicit Preview.

Rationale: Multiple source/live reconciliation attempts produced persistent display
inconsistencies. Design Agent chose simplification.

Contract:
- Edit mode: source blocks (editable, anchor-marked)
- Preview mode: allocator result (read-only)
- No live preview, no cascade in edit
- Warnings only in preview

Impact:
- `_draftComputeEffective`, `_effMap`, `_lbMatch`, `_srcMatched` removed
- `_draftRunLivePreview`, `_draftScheduleLivePreview` unreferenced
- UI tests: 51 → 45 (T70-T72, T73a-b removed; T87a-b added)

## ADR-071 — Anchor keyed by `_rtid`, not `startPage`

Date: 2026-10-20 (Agent #20)
Status: Accepted

Decision: Anchors stored as `_draftState.anchors[_rtid] = { pages, minutes }`.
`_rtid` assigned once in `_draftOpen()` (src-0, src-1, ...) and never changes.

Rationale: Cascade changes `startPage`; identity by `startPage` breaks on rearrange.

Contract:
- `_draftIsAnchored(rtid)`, `_draftSetAnchor(rtid, pages, minutes)`, `_draftRemoveAnchor(rtid)`
- Anchor map runtime-only (never in state — Schema v22)

## ADR-072 — Per-Day Apply for Draft (B9)

Date: 2026-10-20 (Agent #20)
Status: Accepted

Decision: `_draftApply` sets `_result = { blocks, _fromDraft: true }` and closes Draft.
Timeline population per-day via checkbox + `[+ افزودن]` / `[+ افزودن همه]`.

Rationale: Previously added all preview days at once. B9: draft confirm ≠ commit all.

Contract:
- `_draftApply` → set `_result._fromDraft = true`, close, render
- `_onAddDay` / `_onAddAll` / `_onAddSelected` check `_result._fromDraft`
- When `_result.blocks.length === 0` → `_onGenerate(true)`

Impact: No silent bulk add; day-by-day control preserved.

## ADR-073 — Allocator `input.prioritizeBookId` (B6)

Date: 2026-10-20 (Agent #20)
Status: Accepted

Decision: `input.prioritizeBookId` (string or null) moves target book to front of
allocator's book queue. Rest preserves `studyOrder`.

Rationale: Complete-book UX needs priority reallocation. Backward-compatible.

Contract:
- Validate: string → must be in `input.books[]`, else `prioritize_book_not_found`
- Reorder: target to index 0
- No change: cap 33/day, one-book-per-day, anchor validation

Impact: `planner-allocator-v7.js` + T76-T79 tests
---

## ADR-074 — `capacity_rebuild` Mode (Independent from `full_replan`)

Date: 2026-10-21 (Agent #22)
Status: Accepted (Design Agent R3 approval)

Decision: `capacity_rebuild` is a distinct mode. It cancels ONLY future `planned` activities.
Preserves `in_progress`, `completed`, `locked`, past-dated, and `partial`.

Rationale: When capacity or study-method changes, user expects their in-progress
and locked work preserved. `full_replan` remains broader (cancels planned+in_progress+partial).

Contract:
- `_computeCancelIds("capacity_rebuild", snap, impact)` — mode-specific logic
- Selection: `status === "planned"` AND `plannedDate >= today` AND `!locked`
- Sequence: mode-specific `sequential` flag passed to allocator
- Window: forced to full calendar (start = today+1, end = null)

## ADR-075 — Per-day Proposal UI (F4-B)

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision: Replan proposal renders as one card per day, with:
- checkbox for selection
- day-type header (عادی/کشیك/تعطیل) + capacity
- before/after diff (cancelled in "before" strikethrough, preserved with lock icon, new in green)
- read-progress panel showing baseline + completed

Contract:
- `_proposalSelection[date] = true|false`
- Default: all dates selected
- Apply Selected applies only `_keepDates`
- Apply All ignores `_proposalSelection`, keeps all dates

Non-goal: per-day editing of pages (reserved for future).

## ADR-076 — Apply All vs Apply Selected Semantics

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision:
- **Apply All**: cancel ALL future planned (even dates outside the proposal window).
  This is the "compact the plan" use case.
- **Apply Selected**: cancel ONLY the cancelled activities whose `plannedDate` is in `_keepDates`.
  Preserves activities outside the selected range (conservative).

Rationale: User selects days for apply → those exact days should be rewritten, others
must remain untouched. But "Apply All" should clean everything.

Impact: `_onApply(applyAll)` in `planner-replan-ui-v7.js`.

## ADR-077 — Cancelled Task Projection Filter (F4-A)

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision: `scheduling-projection-v20.js::projectTask` returns null for `task.cancelled === true`.

Rationale: After Apply, both the activity AND its linked task are marked cancelled
(per Apply contract). Without this filter, cancelled tasks appeared alongside
new replacement tasks → user sees duplicates.

Impact: `projectTask` early-return. Cancelled tasks hidden from all consumers
(Timeline, Calendar, DayTimeline). Audit trail preserved (state unchanged).

## ADR-078 — Persian Label Rewrite (F4-C)

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision: Replan UI uses user-facing Persian labels:

| Internal | Label |
|---|---|
| recover | جبران عقب‌ماندگی |
| rebuild_affected_scope | بازسازی بخش‌های تحت‌تأثیر |
| capacity_rebuild | تنظیم برنامه بر اساس ظرفیت جدید |
| full_replan | برنامه‌ریزی کامل از نو |

- «بافر امنیتی» → «ساعت ذخیره»
- «استراتژی» → «زمان‌بندی جبران»

Internal identifiers unchanged (contract stability).

## ADR-079 — Proportional Allocation (V7-style, F4-B.4)

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision: `_allocateAlgorithmic` distributes pages proportionally by daily capacity ratio:

    dayMinBudget = totalRemainingMin × (dayCapacity / remainingCapacityMinutes)

Rationale: Previous greedy algorithm filled early days, leaving later days empty.
Proportional allocation respects each day's capacity while spreading the load.

Not: equal split (each day gets totalPages / N — wrong when capacities differ).
Not: hard cap 1.5× (V7 legacy — still leaves later days empty when demand is small).

Impact: `planner-allocation-v6-2.js::_allocateAlgorithmic`.

## ADR-080 — Calendar Gap Fill to examDate

Date: 2026-10-21 (Agent #22)
Status: Accepted

Decision: `_buildCalendar` fills the gap from last round's `endDate` to plan's `examDate`
with synthetic "normal" days using `settings.defaultCapacity.normal`.

Rationale: Rounds typically end before examDate. Old behavior left days after the last
round completely absent from calendar → engine had no capacity to allocate → plan
compressed into last round only.

Removed `roundUsable.endDate` filter in `buildCapacityLedger` — was the KEY blocker.

Impact: `planner-snapshot-v6.js::_buildCalendar`, `_buildDayOccupancy`,
`planner-allocation-v6-2.js::buildCapacityLedger`.
---

## ADR-081 — Narrow Hard-Delete of Future Planned Activities

Date: 2026-10-22 (Agent #22)
Status: Accepted (Design Agent R3 Final Gate)

### Decision

`planner-replan-apply-v7.js` performs a **narrow, scoped** hard-delete of activities when ALL of the following are true:

1. `activity.status === "planned"`
2. `activity.plannedDate >= today` (future only)
3. `activity.locked !== true`
4. `activity.actualPages === 0` or undefined (no progress)
5. `activity.id` is in `proposal.cancelledActivities` (user-approved for cancellation)

Activities matching ALL 5 conditions are **physically removed** from `state.residency.activities`. Their linked tasks (`sourceType === "residency_activity"`) are also **physically removed** from `state.tasks`.

### Preservation guarantees

The following are **NEVER** hard-deleted by this ADR:
- `status === "completed"`
- `status === "partial"`
- `status === "in_progress"`
- `locked === true`
- `plannedDate < today` (past-dated, even if status is "planned")
- `actualPages > 0` (any progress at all)
- Activities outside `proposal.cancelledActivities`

These all continue to receive the prior **soft-cancel** treatment (`status = "cancelled"`), preserving audit trail.

### Conflict with prior decision

The original R3 directive stated: "soft-cancel و حفظ audit trail. حذف فیزیکی فعالیت‌ها با `splice` یا هر روش دیگر ممنوع است."

**Conflict acknowledged.** Hard-delete was added mid-R3 because:
- After multiple Apply cycles, cancelled activities accumulated in state
- The calendar renderer (`app.js`) still showed cancelled items despite the projection filter added in ADR-077
- The user (Edris) explicitly requested these be removed
- The root cause in `app.js` was not fully diagnosed in time

**This ADR does NOT authorize broader hard-delete.** Any expansion beyond the 5 conditions above requires a new ADR and explicit Design Agent approval.

### Task dependency

Linked tasks with `sourceType === "residency_activity"` (or `"residencyActivity"`) and `sourceId`/`residencyActivityId` matching a hard-deleted activity are also removed. Orphan task sweep (see `applyReplanProposal`) provides a second layer of safety.

### Recoverability

Hard-deleted activities and their tasks are **not recoverable** from state after Apply. They are, however, recoverable from:
- The `.bak-*` backup files in the workspace (if user has a backup)
- The Apply snapshot (`_takeSnapshot` before mutation; rolled back only on failure)
- The `data/state.js` backup (if any)

### Scope verification

This ADR was verified against the following Console audit (see session 2026-10-22):
- 75 live activities post-Apply
- 0 activities with `actualPages > 0` and `status === "planned"` (violation check)
- 0 locked activities with `status === "cancelled"` and no progress (should not have been cancelled)
- 0 orphan tasks (all tasks match a live activity)

Any future audit showing a violation of the 5 conditions should trigger an **immediate rollback** of the hard-delete patch and an incident report.

### Non-goals

- This ADR is NOT a general-purpose state cleaner
- This ADR does NOT apply to `full_replan` mode (which uses `planned+in_progress+partial` for cancel, but hard-delete gate still requires `actualPages === 0`)
- This ADR does NOT bypass the fingerprint or stale-proposal checks

---

**End of ADR-081.**
---

## ADR-082 — R2H-01..05 Owner-Authorized UI Fixes

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: Owner (Edris) reported 5 UI issues after R3 close. Each fix applied as small, reversible patch with backup.

| Fix | Change |
|---|---|
| R2H-01 | Add `plan-idle` branch in `_renderTodayPrimaryAction` |
| R2H-02 | Redesign `.r21-program-tool` as 4-card glassmorphism grid |
| R2H-03 | `text-align: right` + `flex-start` row on `.r21-manage-settings-input` |
| R2H-04 | Add `data-r21-cta="planner"` button (V7 entry) |
| R2H-Bonus | Add `_renderFutureDaysPreview` (7-day nav + detail) |

Impact: `residency-dashboard-v19.js`, `styles.css`.

## ADR-083 — Future Days Preview (7-Day Slideshow)

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: `_renderFutureDaysPreview` renders 7-day grid with nav (`<` `>`), day selection, and detail list (horizontal scroll per selected day). Inline `onclick` handlers to avoid `querySelector` race in WebView2.

Contract: state fields `workspace._residencyFuture.{offset, selIdx}` are additive runtime-only.

Non-goal: no changes to scheduling, allocation, or engines.

## ADR-084 — R2-H Gate 2 Accessibility Approach

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: Baseline a11y without refactoring:
- `:focus-visible` scoped to new components
- `aria-label` on cells/nav with Persian + date + activity count
- `aria-current="true"` on selected day
- `aria-live="polite"` + `role="status"` region
- `prefers-reduced-motion` disabling transitions

Waived: 2 automated tests (focus restoration + aria-live timing after `.click()`) — test-harness artifact in WebView2. Manual keyboard confirmed by owner.

Non-goal: no global `:focus-visible` changes.

## ADR-085 — R2-I Single Integrated Batch

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: Wizard redesign as one integrated batch (per Design Agent directive) rather than 5 C1-C5 gates.

Scope: progress/groups, inline validation, existing-plan guard, double-submit, summary/commit, focus/keyboard, translation (partial).

Constraint: no changes to `STEPS`, `_draft`, `_applySchedulerToDraft`, `R.store.*`, `_commit` core. Only wrapper layers.

Impact: `residency-setup-wizard-v19.js`, `styles.css`.

## ADR-086 — Wizard Inline Error via Keyword Matching

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: `_applyInlineErrors` matches error message keywords against field context (label + placeholder + name + id + aria-label). Fallback `.r19-form-row` container approach failed for plan step.

Rationale: container-agnostic matching handles all 13 wizard steps.

Trade-off: possible false positives. Mitigation: keywords length >= 2, first-match focus only.

## ADR-087 — Test Suite Isolation Requirement

Date: 2026-10-22 (Agent #24). Status: Accepted.

Decision: `input.__tests` and `ui.__tests` MUST run against an isolated fixture state, not live user state.

Rationale: Live state (156 activities, 3 enrollments, active plan) causes `buildInput` to return `ok:false` (`no_books_to_plan`). 9 test failures against real state → false regressions. Fixture resolves to 44/44 + 45/45.

Fixture requirements:
- Fresh state object, stable reference for full run (not fresh-per-call)
- Override `window.__os.getState`/`saveState` in `try/finally`
- Verify state signature before/after (`{tasks, activities, plans, enrollments, activePlanId}`)
- Report PRESERVED / MUTATED


---

## ADR-088 — Workspace Post-render Additive Layer

Date: 2026-10-22 (Agent #25). Status: Accepted.

### Decision

All Workspace visual/UX enhancements for R2-W are implemented in additive post-render layers (workspace-r2w-*.js) that wrap WS._postWire. No core workspace file is modified.

### Rationale

The _postWire chain has 8 wrappers across 9 files. Modifying any core file risks regressions. Adding a new wrapper at the end preserves prior behavior, is isolated to DOM manipulation, is reversible, and uses data-r2w-* flags for idempotency.

### Contract

- Wrap pattern: _origPostWire = WS._postWire; WS._postWire = function() { _origPostWire(); _myEnhancements(); }
- Every wrapped layer MUST call the previous in try/catch.
- Every DOM mutation MUST be idempotent (flag on element).
- MutationObserver on .pw14-overlay subtree for dynamic content.
- No window.INTERNSHIP_STATE access.
- No R.store.* mutation.

### Files

- workspace-r2w-polish-v18.js (v1.0.0)
- workspace-r2w-completion-v18.js (v1.0.1)
- CSS: [PATCH:r2w-workspace-polish] + [PATCH:r2w-completion]

---

## ADR-089 — W-43 Formula Validation + Real Overload Display

Date: 2026-10-22 (Agent #25). Status: Accepted.

### Decision

Formula Math.round(totalCommitted / totalCap * 100) is verified correct via 7/7 fixture. W-43 reclassified from P1 to P2 (instrumented, not reproducible with current data).

### Fixture Results

| Scenario | Input | Expected | Actual |
|---|---|---|---|
| under | 300/600 | 50 | 50 |
| 122 over | 366/300 | 122 | 122 |
| 244 over | 732/300 | 244 | 244 |
| exact | 480/480 | 100 | 100 |
| bar caps | 122 | 100 | 100 |
| real preserved | 122 | 122 | 122 |
| zero cap | 500/0 | 0 | 0 |

### Display Behavior

- Bar: Math.min(100, pct) - visually capped
- Number: real value shown
- Over-cap marker: .r2w-over-cap class + warning suffix + tooltip

### Non-reproduction

Current 156 activities, no over-cap days in day view. Historical 122/244 from prior data state or Round view.

## ADR-090 - Workspace 4-Section Product Shell

Date: 2026-10-22 (Agent #26). Status: Accepted.

### Decision

Workspace presents four top-level sections: Overview / Plan / Review & Change / Analysis.
Implementation is additive: a new layer `workspace-r2w-sections-v18.js` wraps `WS._postWire`
and injects the section bar before the existing `.pw14-tabs`. No core workspace file is modified.

### Rationale

Before v0.6.0, Workspace presented five flat tabs (activities | proposal | reviews | analytics | ai)
with no clear task-oriented entry point. The owner-approved product definition (مرکز کنترل برنامه زمانی مطالعه) requires
a continuous workflow: understand -> identify -> review -> act -> verify.

Four sections map directly to that workflow. The Overview section is action-oriented
(not another dashboard) and provides deep-links into Plan or Review.

### Contract

- Section bar is `.r2w-sections-bar` with buttons `[data-r2w-section]`
- Default section: `overview`
- Sub-tab mapping: plan->[activities], review->[proposal,reviews], analysis->[analytics,ai]
- Section switch persists in-memory (`_activeSection`), resets to overview on close
- Deep-link: `[data-r2w-goto]` -> section
- Idempotency: `data-r2w-sections`, `data-r2w-ov-wired`, `data-r2w-rendered` on relevant nodes
- No `window.INTERNSHIP_STATE` write
- No `R.store.*` mutation

### Non-goals

- No change to underlying tab renderers
- No change to `_postWire` chain order for prior layers
- No removal of any existing capability
- No legacy file deletion

### Impact

- `app/residency/workspace-r2w-sections-v18.js` (new, ~330 lines)
- `app/index.html` (+1 script tag after `r2w-completion`)
- `app/styles.css` (`[PATCH:r2w-sections]`)

Tests: 7 unit tests in `workspace-r2w-sections-v18.js::__tests`.

---

## ADR-091 — Study Together: Managed Supabase Backend

Date: 2026-10-23 (Agent #27)
Status: Accepted (Design Agent approval for V1)

### Decision

Study Together V1 uses Supabase Free (Auth + Postgres + Realtime Presence)
as the online backend. No personal server, no paid hosting.

### Rationale

- Zero monthly cost target for a small group of friends
- Managed Postgres + Auth + Realtime in one service
- RLS provides per-row security without a backend server
- Free tier adequate for <50 MAU usage pattern

### Contract

- Client uses `@supabase/supabase-js@2.118.0` (pinned), lazy loaded from
  jsDelivr only when the Study Together tab opens
- `service_role` key MUST NEVER appear in client code, `data/study-together.js`,
  or any distributable file
- Only `publishable` (or legacy `anon`) key is used in client
- Config lives in `data/study-together.js` (outside git, preserved by installer)
- Core app remains fully functional when config is absent (UI shows
  "اتصال آنلاین تنظیم نشده است", no crash)

### Trade-offs / Limitations

- Supabase Free pauses project after 1 week of inactivity → ISSUE-ST-02
- Free tier has no uptime SLA
- SMTP not configured for pilot → password recovery disabled in V1
- Emails are unverified (Confirm email = OFF, owner decision for private pilot)

---

## ADR-092 — Study Together: Additive Module + `_stGetCurrentActivity`

Date: 2026-10-23 (Agent #27)
Status: Accepted

### Decision

Study Together is implemented as an external IIFE module
(`app/residency/study-together.js`) following the `fooddb-ui.js` /
`sleep-ui.js` pattern. It uses `window.__ioStudyTogetherBridge` set by
`app.js` after the first `renderStudyTogether()` call.

### Contract

- Zero writes to `state.*` and `window.INTERNSHIP_STATE` (read-only access via bridge)
- Timeline access is read-only via `_stGetCurrentActivity()`:
  - `R.schedulingProjection.projectDate(state, today, {})` — never mutates
  - Filters items where `now ∈ [startTime, startTime + durationMinutes)`
  - Returns `{ title, sourceType, role }` or `null`
- Bridge is installed lazily (idempotent) — never in `boot()` directly
- 3 additive points in `app.js`:
  1. `MAIN_ROUTES` gains `"study-together"`
  2. `switch (route)` gains `case "study-together": return renderStudyTogether()`
  3. New functions inserted before `contentRefId`: `renderStudyTogether`,
     `_studyTogetherBridge`, `_stGetCurrentActivity`
- `index.html`: nav button + 2 script tags (before `app.js`)
- `styles.css`: single `[PATCH:study-together]` append, prefix `st-` only

### Rationale

- Zero regression risk to core scheduler / planner / workspace
- Feature can be removed by deleting 4 new files + reverting 3 additive patches
- `window.__os` is REASSIGNED in `boot()` (not extended) — bridge must not
  assume it survives. `study-together-tests.js` uses poll-until-ready pattern.

---

## ADR-093 — Study Together: Client Session Idempotency + Pending Recovery

Date: 2026-10-23 (Agent #27)
Status: Accepted

### Decision

Each session has a `client_session_id` (UUID) generated client-side before
insert. DB enforces `unique(user_id, client_session_id)`. Pending state is
written to `localStorage["internship-os.study-together.pending"]` BEFORE the
network request, and cleared only after the server confirms.

### Order of operations (start session)

1. Generate `clientSessionId` (crypto.randomUUID)
2. Write `{ clientSessionId, groupId, startedAt }` to localStorage
3. Insert to `study_sessions`
4. If insert fails with unique violation → fetch by client_session_id
   (reconnect recovery)
5. On success → clear pending, set `S.session`

### On app restart with a pending record

- `recoverPending()` runs at tab open
- If session exists on server → resume it silently (no duplicate)
- If not → clear pending, show normal idle state

### On crash mid-session (server-side open session, no local recovery)

- Next open: `qFindOwnOpenSession()` finds it
- UI presents it as active (user may end it or ignore)
- **Never** auto-close silently — user decides

### Rationale

Prevents duplicate rows on network flakiness. The unique constraint is the
final guarantee — client-side logic is a convenience layer (per Design Agent
§6 and §11 SQL-08 test).

### Preserved invariants

- `end_reason='ended'` and `end_reason='break'` both count toward today's total
- `end_reason='crash'` (or missing `ended_at` without active client) does NOT
  auto-count (per Design Agent §4)

---

## ADR-094 — Study Together: Realtime Presence Stability Rules

Date: 2026-10-23 (Agent #27)
Status: Accepted

### Decision

The following rules are MANDATORY for any realtime module in this project
(Study Together is the reference implementation).

### Rules

1. **Heartbeat ≤ 1 per 30 seconds.** Calling `track()` at 1Hz causes Supabase
   to close the channel silently (no error).
   Reference: `[st] subscribe status=CLOSED` with no `err=` in logs.

2. **Closure capture per channel.** Each `_sb.channel(topic).subscribe(cb)`
   MUST capture its own `ch` reference. Stale callbacks MUST check
   `_channel === ch` before mutating shared state.
   Without this, reconnect creates loops (old callback nulls the new channel).

3. **Exponential backoff on reconnect.** 3s → 6s → 12s → 24s → 30s cap.
   Reset attempt counter on successful `SUBSCRIBED`.
   Never reconnect in tight loop.

4. **`setAuth` only on token change.** Cache `_lastAuthToken`. Skip redundant
   calls. Realtime auth failures manifest as `CHANNEL_ERROR` with no message.

5. **Private channel per group.** `channel("group:" + group_id, { private: true })`.
   Public Realtime access MUST be OFF in the Supabase dashboard. RLS on
   `realtime.messages` gates topic access via
   `private.is_member_of_topic(topic, auth.uid())`.

6. **Heartbeat vs UI tick must be separated.** The timer display may update
   at 1Hz (local), but `broadcastPresence()` runs at 30s intervals via its own
   timer (`_heartbeatTimer`).

7. **`broadcastPresence` MUST check `_channel.state === "joined"`** before
   calling `track()` — otherwise SDK throws silently on closed channels.

### Consequences

- Stable presence in 2-3 user tests after applying these rules
- Without these rules: `CLOSED` loops every ~1-2 seconds, presence disappears
- Anyone implementing a new realtime feature MUST follow ADR-094

## ADR-100 — Study Together 2.0: Course System + Session Binding

Date: 2026-10-23 (Agent #28)
Status: Accepted

### Decision

Add a first-class `study_courses` domain and bind each `study_session` to an optional course via `course_id`. Server-side ownership enforced by trigger.

### Rationale

V1 could not attribute time to a subject. Cross-device and cross-user analytics require persistent `course_id` in `study_sessions` — not just in presence payload.

### Contract

- `study_courses` (id, user_id, name, color regex `st-course-[1-8]`, icon regex `[a-z0-9_-]{1,32}`, display_order, archived_at, timestamps)
- RLS: 4 self policies (select / insert / update / delete) — user_id = auth.uid()
- `study_sessions.course_id` nullable FK (ON DELETE SET NULL) — legacy NULL = "بدون درس"
- `private.enforce_session_course_owner()` BEFORE INSERT OR UPDATE OF course_id, user_id — raises `course_not_owned_by_user` (errCode 42501) if course_id not owned by new.user_id
- Client validation is a convenience layer, not a security boundary

### Impact

- `app/residency/study-together.js` (course CRUD + chips + timer binding)
- `docs/study-together-2.0-migrations.sql`
- Historical sessions with NULL course_id remain valid — UI displays "عمومی / بدون دسته"

### Non-goals

- Multi-course sessions
- Session re-attribution after end
- Cross-user course sharing (each course is user-scoped)

---

## ADR-101 — Study Together 2.0: Statistics & History Expand

Date: 2026-10-23 (Agent #28)
Status: Accepted

### Decision

Statistics page: 3 period presets (today / 7d / 30d) with server-driven aggregation (SVG line chart, 4 stat tiles, top-3 days, best session, per-course breakdown top-5). History expand: 7/30/90 day range with monthly heatmap (5 levels) + course filter + day-click filter.

### Rationale

V1 only showed "today" totals. Users need multi-day view to see trends and course attribution.

### Contract

- Period selector: `S.statsPeriod ∈ {"today","week","month"}`
- `_statsRangeIso` returns start/end ISO + days count
- `_statsAggregateDaily` produces day-bucketed array
- `_statsAggregateByCourse` produces `{courseKey: seconds}`
- `_renderLineChart` inline SVG (no external chart lib) — area gradient + dots
- Top days sorted by duration desc, top 3
- Best session = longest single ended session (crash excluded)
- Course breakdown sorted by duration desc, top 5, colored by course
- History: `S.historyRangeDays ∈ {7,30,90}`, `S.historyCourseFilter ∈ {null, "__none", courseId}`, `S.historyDayFilter ∈ {null, "YYYY-M-D"}`
- Heatmap levels: l0 (no data) / l1 (<25%) / l2 (<50%) / l3 (<75%) / l4 (≥75%) of max
- All views respect `prefers-reduced-motion`

### Non-goals

- Custom date ranges (Wave 4+)
- Multi-metric comparison (avg vs median vs max)
- Cross-user analytics (Wave 4+، gated by share flags)

---

## ADR-102 — Study Together 2.0: Server-Side Ownership Enforcement

Date: 2026-10-23 (Agent #28)
Status: Accepted

### Decision

Course ownership MUST be enforced server-side via PostgreSQL trigger، not client validation alone.

### Rationale

Client-side validation can be bypassed via DevTools / direct API calls. V1's RLS already enforced user-level ownership on `study_sessions` (INSERT/UPDATE/DELETE only self)، but allowed attaching any course UUID to your own session. Without the trigger, a malicious client could attach another user's course_id to their session، corrupting cross-user analytics (Wave 2/3).

### Contract

    create or replace function private.enforce_session_course_owner()
    returns trigger language plpgsql security definer set search_path = ''
    as $$ begin
      if new.course_id is not null then
        if not exists (select 1 from public.study_courses
                       where id = new.course_id and user_id = new.user_id) then
          raise exception 'course_not_owned_by_user' using errcode = '42501';
        end if;
      end if;
      return new;
    end; $$;

    create trigger sessions_course_owner_check
      before insert or update of course_id, user_id on public.study_sessions
      for each row execute function private.enforce_session_course_owner();

### Verified

- F.2a INSERT cross-owner → rejected 42501
- F.2b UPDATE own session to foreign course → rejected 42501
- F.2c no stray rows in DB after attack

### Non-goals

- Enforcing content validity (duration، overlap) at DB layer — kept client-only per D-B3
- Enforcing cross-user share flags beyond `share_daily_total` — see ISSUE-ST-05

---

## ADR-103 — Study Together 2.0: Two-Layer Privacy Model

Date: 2026-10-23 (Agent #28)
Status: Accepted

### Decision

`share_daily_total` enforced at DB layer (RLS on `study_sessions` SELECT); `share_course_breakdown` and `share_history_with_group` enforced at UI layer only — no RLS change.

### Rationale

- `share_daily_total` gates raw session durations — must be RLS-enforced to prevent cross-user leak via direct API
- `share_course_breakdown` and `share_history_with_group` are aggregated views of the same data — a user with `share_daily_total=true` already exposes the raw rows; course/history flags add nothing at the storage layer
- Extending RLS would require a new migration + policy, with no actual security gain
- This is documented as ISSUE-ST-05 (accepted limitation)

### Consequences

- A malicious client with `share_daily_total=true` can query raw rows and compute course breakdown / history itself — but this was already true in V1
- UI gates are honest about what the member chose to share، even if not a security boundary
- If future need arises: extend RLS on `study_sessions` per-flag — new ADR required

### Non-goals

- Cross-user course analytics with `share_course_breakdown=false` — UI blocks، server allows
- Time-based share (share only last 7 days) — Wave 4+
