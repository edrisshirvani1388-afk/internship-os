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