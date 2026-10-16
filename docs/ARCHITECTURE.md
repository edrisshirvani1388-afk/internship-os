# ARCHITECTURE.md

Last Updated: 2026-10-15

## System Overview

Internship OS یک اپلیکیشن دسکتاپ ویندوزی برای مدیریت زندگی مطالعاتی و بالینی یک اینترن پزشکی است.

Stack:
- Frontend: HTML + CSS + Vanilla JS (ES5-compatible, IIFE)
- Desktop wrapper: WebView2 (.NET 8)
- Backend: ASP.NET Core روی 127.0.0.1:8977
- Persistence: localStorage (auto, 700ms) + data/state.js (manual, Ctrl+S)
- AI Layer: Provider abstraction (Groq/OpenAI/Gemini/DeepSeek/OpenRouter/Ollama/LM Studio/Custom)

بدون build step. بدون framework. بدون npm.

## Runtime

Load order in index.html:

1. lib/*.js (utils, date, time, id)
2. pickers.js, timeline.js
3. notification-v20.js
4. reading-strategy-v20.js
5. dialog-v20.js
6. loading-overlay-v20.js
7. ai-output-normalizer-v20.js
8. ai.js
9. residency/*.js (به ترتیب نسخه: v1, v2, ..., v20)
10. app.js

app.js::boot():
1. loadState() از state.js یا localStorage
2. migrateState() — schema chain v1 → v21
3. Install window.__os (debug bridge) — قبل از render
4. setup nav listeners
5. applyTheme
6. setRoute → render

نکته‌ی مهم: window.__os باید قبل از اولین render ساخته بشه. وگرنه race condition.
## State Architecture

Single global state object در window.INTERNSHIP_STATE.

Domain State (Source of Truth):
- state.tasks — تسک‌های زمان‌دار کاربر
- state.shifts — کشیک‌ها
- state.rotations — چرخش‌های بالینی
- state.cases — کیس‌لاگ
- state.procedures — پروسیجرها
- state.residency.* — domain رزیدنتی
- state.clinicalProgress, state.procedureProgress — پیشرفت
- state.customContent — محتوای سفارشی
- state.imports — بسته‌های واردشده
- state.programContent — محتوای برنامه
- state.contentDrafts — پیش‌نویس‌ها
- state.replanTriggers — triggerهای بازبرنامه‌ریزی
- state.schedulingAcks — تأییدهای تداخل

سه لایه‌ی معماری:

Domain State (Source of Truth)
   ↓
Scheduling Projection (read-only, computed)
   ↓
Capacity / Availability / Conflict / Planning
   ↓
UI + AI

اصل طلایی: Timeline، Calendar، Planner هیچ‌کدام Source of Truth نیستند — فقط Projection و View هستند.

## Domain Boundaries

Domain 1 — Tasks
تسک‌های عمومی با areaId (clinical, study, emergency, procedures, residency, body, income, life).

Domain 2 — Rotations
چرخش‌های بالینی با بازه، محل، ماژول، activitySchedule هفتگی (active/light/inactive).

Domain 3 — Shifts
کشیک‌ها با زمان شروع/پایان. cross-midnight ممکن است (endTime <= startTime).

Domain 4 — Cases
کیس‌لاگ با specialty/category/curriculumItem متصل.

Domain 5 — Procedures
پروسیجر با ۳ سطح: not_seen / seen / done.

Domain 6 — Clinical Curriculum
کوریکولوم با ۳ سطح mastery: none / seen / mastered.

Domain 7 — Custom Content
محتوای سفارشی روی کوریکولوم، پروسیجر، رزیدنتی.

Domain 8 — Imports
بسته‌های JSON با rollback capability.

Domain 9 — Program Content
محتوای فعال برای برنامه‌ریزی.

Domain 10 — Content Drafts
پیش‌نویس‌های محتوا.

Domain 11 — Residency
Domain کامل: plans, subjects, books, rounds, enrollments, activities, assessments, capacityProfiles, dayOverrides, manualOverrides, constraints, planVersions, reviewStates, reserveState.
## Scheduling Architecture

### Scheduling Projection (Phase 1A)
File: residency/scheduling-projection-v20.js

Input: state
Output: ScheduledItem[]

ScheduledItem = {
  id, sourceType, sourceId,
  title, category,
  date, startTime, endTime, durationMinutes,
  role: anchor | block | flexible | reminder | context,
  status,
  context: { kind: shift, type } | null
}

Roles:
- anchor — زمان ثابت مهم (Shift, Exam)
- block — زمان‌دار قابل جابجایی (Study, Gym)
- flexible — زمان‌ندیده
- reminder — یادآوری
- context — محیط Scheduling (Rotation, untimed Shift)

مهم: این فقط Projection است، نه Source of Truth.

### Day Timeline (Phase 1B)
File: residency/day-timeline-v20.js

نمایش مشترک روز در Dashboard و Calendar. یک DayTimeline مشترک، نه چند تا.

### Capacity / Availability (Phase 2)
- Productive Capacity = finalCapacityMinutes
- Time Availability = rawCapacity - timedOccupied
- Feasible Capacity = min(Productive, Availability)

### Conflict + Ack (Phase 3)
- residency/scheduling-conflict-v20.js
- residency/scheduling-ack-v20.js
Policies: HARD / WARNING / ALLOWED / CONTEXTUAL

قواعد:
- Shift + Study → WARNING
- Shift + Gym → HARD
- Study + Study → HARD
- Study + Gym → HARD
- Reminder + هر چیز → ALLOWED
- Flexible + هر چیز → ALLOWED
- Untimed Shift + Timed → CONTEXTUAL

### Availability Windows (Phase 4)
File: residency/availability-engine-v20.js

Algorithm:
1. Day boundary: 00:00 → 24:00
2. Collect blockers (anchor + block با timing)
3. Normalize + sort + merge
4. Complement در day boundary
5. Filter با minWindowMinutes (default 30)

Cross-midnight shift در دو روز segment می‌شه.

## Planner Architecture

Files: residency/planner-*.js

planner-contract-v6.js       — Contracts, validators
planner-demand-v6.js         — StudyDemand
planner-snapshot-v6.js       — PlannerInput (immutable)
planner-allocation-v6-2.js   — Allocation Engine
planner-constraints-v6-3.js  — Rule evaluation
planner-resolution-v6-3.js   — Constrained allocation
planner-schedule-v6-4.js     — Generate schedule
planner-proposal-v6-4.js     — Proposal + Fingerprint + Feasibility
planner-apply-v6-4.js        — Apply proposal
planner-orchestrator-v6-4.js — Orchestration
planner-ui-v6-5.js           — UI

اصل: Planner deterministic است. Pure function. AI دخالت نداره.

Flow:
Snapshot → Demand → Allocation (algorithmic|equal|manual)
→ Constraints → Resolution → Schedule → Proposal
→ Fingerprint check → User Approval → Apply

Fingerprint: hash از planId + examDate + rounds + enrollments + activities + constraints + overrides + calendar + non-residency tasks.

Feasibility Status:
- feasible
- feasible_with_warnings
- infeasible
- blocked_by_hard_constraint
- not_checked
## Replanner Architecture

Files: residency/planner-*-v7.js

planner-execution-v7.js       — Execution analysis
planner-impact-v7.js          — Impact analysis
planner-recovery-v7.js        — Recovery strategies
planner-replan-v7.js          — Generate replan
planner-replan-apply-v7.js    — Apply
planner-replan-ui-v7.js       — UI

Recovery Strategies:
carry_forward, delete, redistribute, next_day,
end_of_week, end_of_round, end_of_month,
end_of_current_book, specific_date, next_N_days

## Replanning Triggers (Phase 5)

File: residency/replan-trigger-v20.js
Storage: state.replanTriggers[]

Trigger Types:
- shift_added / shift_updated / shift_removed
- task_added / task_updated / task_removed / task_completed
- rotation_changed
- capacity_context_changed
- baseline_changed

Deduplication: trigger مشابه در ۳۰ دقیقه اخیر update می‌شه.

## Residency Baseline (Phase 6)

File: residency/baseline-v20.js

Contract: enrollment.initialStudyBaseline

{
  ranges: [{ start, end }],
  applyToRounds: "ALL" | "FIRST_ONLY" | "SELECTED_ROUNDS",
  selectedRoundIds: [],
  notes: ""
}

Semantics: صفحاتی که کاربر قبلاً خونده بود، از demand کسر می‌شن.

## Reading Strategy (Phase 9)

File: residency/reading-strategy-v20.js

۶ mode:
- sequential — ترتیبی
- category_first — درس‌به‌درس
- alternating_daily — چرخشی روزانه
- alternating_categories — چرخشی بین درس‌ها
- balanced — متعادل
- custom — سفارشی

API:
- RS.resolve(settings, round, enrollments)
- RS.getPriority(demand, ctx) → 0..100
- RS.buildSequence(demands, strategy, round, enrollments)
- RS.explain(strategy)

Integration: در planner-allocation-v6-2.js::_score به‌عنوان tie-breaker کوچک (prio * 0.04). Hard constraints و priority حفظ می‌شن.

Study Speed: R.studySpeed.resolve(round, settings, enrollment)
اولویت: round.studySpeedPagesPerHour → enrollment.useCustomSpeed → global → 20

## UI Architecture

Main Navigation (۸ tab):
داشبورد / تقویم / برنامه‌ریزی / بالین / رزیدنتی / پیشرفت / داده‌ها / راهنما

Clinical Hub (۴ sub-tab):
مسیر اینترنی / کوریکولوم / کیس‌ها / پروسیجرها

Residency Hub (۵ sub-tab — Phase 9):
امروز / برنامه‌ریزی / تایم‌لاین / تحلیل / تنظیمات

Component Layers:
- Task rows — taskRowHTML, studyRowHTML, plannerRowHTML
- Cards — life-card, case-card-v2, rotation-card, r19-plan-card
- Modals — modal-overlay با openModal helper
- Dialogs — R.dialog.confirm/alert (Phase 9)
- Notifications — R.notify.info/success/warning/error + banner (Phase 9)
- Loading — R.loading.show/hide/defer/wrap (Phase 9)
- Pickers — InternshipPickers.date/time/duration
## AI Boundary

اصل: AI Advisor است، نه Decision Maker.

Files:
- ai.js — Layer پایه
- residency/ai-context-v8.js — Context builder
- residency/ai-analysis-v8.js — Analysis
- residency/ai-redaction-v8.js — Redaction
- residency/ai-prompts-v8.js — Prompts
- residency/ai-advisors-v8.js — Advisors
- residency/ai-actions-v8.js — Actions
- residency/ai-ui-v8.js — UI
- residency/ai-review-*-v11.js — Review advisors
- residency/ai-output-normalizer-v20.js — Output normalization (Phase 9)

Advisors: reviewPlanner / reviewRecovery / explainDiagnostics / recommendRecoveryStrategy

System Prompts: general / deepThinking / planReview / performanceCoach / residencyAdvisor / dashboardBrief

قواعد:
- AI نمی‌تونه محاسبه جدید جای Engine بکنه
- AI خروجی فارسی می‌ده، بدون اصطلاحات فنی
- AI هیچ ID یا technical key در user-facing output نشون نمی‌ده

## Persistence

### localStorage (Auto)
Key: internship-os.workspace.v2
Value: { state, savedAt }
Debounce: 700ms

### state.js (Manual)
Path: data/state.js
Structure: window.INTERNSHIP_STATE = {...}; window.INTERNSHIP_STATE_SAVED_AT = ...
Save: Ctrl+S یا 💾

### Load Priority
1. state.js (اگر موجود و savedAt بزرگتر)
2. localStorage
3. freshState()

### Save Flow
state → localStorage (instant)
     → server /api/save-state (debounced 700ms)
     → state.js file (manual Ctrl+S)

## Current Architectural Principles

1. Source of Truth دست نزن — domainها merge نکن
2. Additive Changes — Extend نه Replace
3. Backward Compatibility — فیلدهای جدید nullable + migration
4. Deterministic Output — Planner pure function
5. No Auto-Mutation — UI → Proposal → Approval → Apply
6. AI فقط Advisor
7. Projectionها read-only
8. Storage layout نباید به Engineها leak کنه
9. Migration additive فقط
10. Silent change ممنوع

## Future Architectural Direction

### Split State (Pre-design)
Status: future candidate، هنوز پیاده‌سازی نشده.

Idea: state.js تک‌فایلی به معماری multi-file:
- state.workspace.js
- state.domain.js
- state.residency.js
- state.activities.js
- state.versions.js
- state.imports.js

Constraint: Engineها نباید assume کنن persistence کجاست.

### Round Scheduling Stabilization (Pre-design)
Idea: Round Scheduler قوی‌تر با بازچینی خودکار، حفظ examDate، compress + expand دوطرفه.
Constraint: storage-independent.

### Replan UI Redesign (Pre-design)
Status: future candidate. نیاز به بازطراحی کاربرمحور.

### Graphical Timeline (Pre-design)
Status: future candidate. Gantt-style timeline با رنگ‌بندی، hover، drag.

## Round Scheduling v22 (Phases 22.2–24)

### Core module
File: residency/round-scheduler-v22.js
Public API:
- computeEdit(rounds, examDate, { roundId, newDuration })
- computeNormalize(rounds, examDate)
- computeExplicitEdit(rounds, examDate, { roundId, newStartDate, newEndDate })

### Manager integration
File: residency/residency-managers-v19.js
- _saveRound: routes Edit / Create / Explicit-edit through Scheduler → Preview → _commitProposal
- _commitProposal: sole applyRounds call site for Round date mutations
- MGR.redistributeAll: computeNormalize → Preview → apply
- MGR.regenerateFromWizard: computeNormalize → Preview → apply, refuses if any locked
- MGR.confirmDelete: refuses if locked

### Timeline
File: residency/residency-dashboard-v19.js
- _renderTimelineGraphic: bar per round, exam axis, lock indicator
- Click bar → openRoundEditor(id)

### Lock semantics
- Enforced at UI, Manager, Scheduler layers
- Migration v22 initialized locked:false on all legacy rounds

### Frozen contracts
- store-v2.js::applyRounds — atomic, rollback on validation fail
- Scheduler purity: no store, no state, no UI references

---

## Replan Engine (Phase 24 → 26.3b)

### Debt scoping (Phase 26.1)

For `mode=recover` + `strategy=carry_forward`:
  debtScope = _computeDebtScope(execAnalysis)
  windowed.demands = _scopeDemandsToDebt(windowed.demands, debtScope)

Debt key = `bookId::roundId`. Sources:
  - execAnalysis.missed[].plannedPages
  - execAnalysis.partial[].pageDeficit

### Final Simulation (Phase 26.2)

_simulateFinalPlan(existing, proposed) → {
  activityCount,
  peakDailyMinutes,        // from existing preserved + proposed
  completionDate,          // last valid date
  daysWithLoad
}

Attached as proposal.finalSimulation. Consumed by computeRecoveryMetrics.

### Buffer accounting (Phase 26.2)

reserveConsumed = min(remaining_pool, proposedMinutes)

Never `min(pool, unmet)`. If proposal is empty → 0.

### Apply Atomicity (Phase 26.3)

applyReplanProposal flow:
  1. Validate (plan, alreadyApplied, fingerprint, cancelled exist,
     reserve integrity, page-range invariant)
  2. Snapshot { activities, tasks, reserveState, planVersions, replanTriggers }
  3. Mutate (cancel → create → syncTasks → consume reserve → planVersion → clear triggers)
  4. Single save
  5. Catch → _restoreSnapshot + save + return error

Force fail hook: window.__PRA_FORCE_FAIL__ = "<step>" (test only)

### Trigger Lifecycle (Phase 26.3)

- coveredTriggerIds captured at proposal generation time
- On Apply: only those IDs cleared (via RT.clearByIds)
- Triggers added after generation: different IDs → preserved
- Reject: no state change

### Test Safety (Phase 26.3b)

All `__tests` functions must:
  - operate on isolated mock objects
  - never delete/replace keys on window.INTERNSHIP_STATE
  - never call _restoreState() on real state
  - verify reference identity before/after
---

## Conflict Engine — Integration (Phase 28.x)

File: `app/residency/scheduling-conflict-v20.js`

### Public API (frozen signatures)

- `CF.getPolicy(a, b, options) → "HARD"|"WARNING"|"ALLOWED"|"CONTEXTUAL"`
- `CF.detectPair(a, b, options) → Conflict | null`
- `CF.detect(items, options) → Conflict[]`
- `CF.summarize(conflicts) → { total, byPolicy }` — no external consumers (D4)
- `CF._kindOf`, `CF._itemFp`, `CF._sortedPairKey`, `CF._overlap` — test hooks
- `CF.__tests() → { passed, total, results }` — 36 tests (Phase 28.0)

### Policy Matrix (frozen)

| pair | policy |
|------|--------|
| study \| study | HARD |
| study \| residency (mapped to study) | HARD |
| study \| gym | HARD |
| study \| shift | WARNING |
| study \| clinical | WARNING |
| body \| shift | HARD |
| life \| shift | HARD |
| clinical \| clinical | HARD |
| case \| case | ALLOWED |
| case \| anything | ALLOWED (except clinical) |
| reminder \| anything | ALLOWED |
| flexible \| anything | ALLOWED |
| default (unmatched) | ALLOWED |

### Consumers

| Path | Location | Uses |
|------|----------|------|
| RATM edit | app.js ~1452 | detectPair → policy check |
| Day-bar drag | app.js ~2172 | `_shouldBlockOverlap` |
| Drag drop | app.js ~2296 | `_shouldBlockOverlap` |
| Drop handler | app.js ~2889 | `_shouldBlockOverlap` |
| Content task modal | app.js ~3940 (removed legacy) | detectPair in Phase 27.2 path |
| Regular task modal | app.js ~4864 (removed legacy) | detectPair in Phase 27.2 path |
| Dashboard banner | app.js 1043, 1282, 1746, 2019, 2339 | `_getEffectiveItems` + detect |

### Invariants

1. `_shouldBlockOverlap` returns true **only** when `policy === "HARD"`.
2. No blanket exemption for any `sourceType`. Self-comparison uses id.
3. Dashboard conflict feed must deduplicate via `_getEffectiveItems`.
4. `getPolicy` is called internally by `detectPair`. External callers
   should use `detectPair` — no need for a third detector.
5. Legacy `InternshipTimeline.detectConflicts` is retired for conflict
   purposes. It may still exist in `app/timeline.js` for other uses
   (currently none) — do not rebuild around it.

### Known design decisions pending

- D3: default ALLOWED — theoretical, no practical risk in current RULES.
- D4: `getPolicy`/`summarize` — kept as future public API.
- Item-level policy override (`task.overlap`) — proposed for Phase 28.2.
---

## Virtual Recurrence (MVP-02)

File: `app/residency/scheduling-projection-v20.js`

### Contract

Recurring tasks (recurrence: "daily" | "weekly" | "monthly") expand
only at projection time. No independent task instances are stored
in state for occurrences.

Virtual item shape:

    {
      id:              "virtual:<parentId>@<date>"
      sourceType:      "task"
      sourceId:        <parentId>
      date:            <occurrence date, Jalaali YYYY/M/D>
      startTime:       <from parent>
      endTime:         <from parent>
      durationMinutes: <from parent>
      role:            <from parent>
      status:          "pending" | "completed" | "cancelled"
      isVirtual:       true
      parentTaskId:    <parentId>
      occurrenceDate:  <date>
    }

### Per-occurrence completion

Stored on the parent task:

    task.recurrenceExceptions = {
      "YYYY/M/D": "completed"      // or "skipped"
    }

Nullable. No migration required (missing key = all pending).

### Range handling

- `projectAll(state, options)`:
    options.rangeStart / rangeEnd — explicit [start, end].
    Default when omitted: [today, today+180].
- `projectDate(state, date)`: narrows to [date, date].
- `projectRange(state, start, end)`: narrows to [start, end].
- `planner-snapshot-v6::_buildDayOccupancy` passes
    [minDate, maxDate] from rounds (MVP-03).

### ID stability

IDs are derived from parentId + date. Repeated projections
produce identical ids. Deterministic.

### Test surface

SP.__tests: R1..R15 + R4b (16 new). Total suite = 32.
Covers: no-recurrence, daily, weekly, monthly, exception
isolation, serialization survival, id stability, no-duplicate,
parent removal, pattern change, sibling isolation.

### Anti-patterns

- Do NOT store virtual items in state.
- Do NOT mutate task.completed for a single occurrence.
- Do NOT change recurrenceExceptions format without ADR.
- Do NOT expand in a renderer (single point of truth = projection).

---

## Unified Life Domains (DESIGN-30, proposed)

Status: design-only; awaiting approval. No implementation yet.

### Scope

- Health & Nutrition (workout, nutrition, body measurements)
- Sleep (nightly + naps)
- Projects (task.projectId additive)
- Finance (transactions + monthly report)
- Life & Leisure (movies, books, dates, social, travel)

### Data contract (additive, schema v22 unchanged)

    state.health = {
      profile:      { birthYear, sex, heightCm, activityLevel,
                      goal, targetWeightKg }
      bodyLog:      [ { id, date, weightKg, heightCm|null } ]
      foodCatalog:  [ { id, name, source, per100, unit, unitGrams } ]
      foodLog:      [ { id, date, meal, items:[{foodId, grams,
                        snapshot:{name,kcal,p,c,f}}] } ]
      workoutLog:   [ { id, date, taskId, type, plannedMin,
                        actualMin, intensity, caloriesEstimated,
                        caloriesActual } ]
      calorieTarget:{ kcal, p, c, f, computedAt, profileSnapshot }
    }

    state.sleep = {
      schedule: { bedTime, wakeTime, weekdays[7],
                  nap: { weekdays[7], time, durationMin } }
      log:      [ { id, date, bedTime, wakeTime, durationMin,
                    kind, taskId } ]
    }

    state.projects = [ { id, title, description, goal, startDate,
                        deadline, priority, status, createdAt } ]

    state.finance = {
      transactions: [ { id, date, amount, kind, category, note,
                        projectId|null } ]
      categories:   [ { id, label, kind, color } ]
      budgets:      { "1405/07": { amount } }
    }

    state.life = {
      items: [ { id, category, title, status, rating, note,
                 tags[], createdAt } ]
    }

    task.projectId — nullable string
    task.contentId — nullable string
    task.logData   — nullable object (workout/sleep payloads)

### Timeline ownership

Unchanged. Only state.tasks[] is projected to Timeline.
- Workout sessions = Task with recurrence:"weekly".
- Naps = Task with recurrence:"weekly".
- Nightly sleep = Task with recurrence:"daily" (cross-midnight).
- Scheduled content = Task with contentId.
- Logs (food, weight, transactions, unplanned sleep) are
  independent of Timeline.

### Nutrition formulas

    BMR (Mifflin-St Jeor):
      male:   10*kg + 6.25*cm - 5*age + 5
      female: 10*kg + 6.25*cm - 5*age - 161
    TDEE = BMR * factor
      sedentary 1.2 | light 1.375 | moderate 1.55
      active 1.725 | very_active 1.9
    Target:
      lose     = TDEE - 500 (floor 1200 F / 1500 M)
      gain     = TDEE + 300
      muscle   = TDEE + 200
      maintain = TDEE
    Safety: age < 18 or pregnancy → show TDEE only, no auto target.

### Workout calorie (MET)

    kcal = MET * weightKg * durationHours
    MET baseline: walk 3.5 | run 8.5 | bike 6 | swim 7 | weights 5
    Labeled "تخمینی". User can override with caloriesActual.
    NOT auto-added to daily food budget (activity already in TDEE).

### Historical integrity

- foodLog item snapshots freeze macro values at log time.
- workoutLog calorie values freeze at log time (weight changes
  do not rewrite history).
- calorieTarget stores profileSnapshot.
- bodyLog is raw; no interpolation for missing dates.

### Migration

None. Schema v22 stays. All new namespaces lazy-initialized
on first access (pattern: `_ensureHealth(state)` similar to
`normalizeResidencyState`).


---

## Food.db Access Layer (Phase F.1)

File: `server-dotnet/Program.cs` (PATCH:phase-F1-fooddb)

Dependency: `Microsoft.Data.Sqlite 8.0.10`

### Endpoints (read-only)

| Route | Returns |
|---|---|
| `GET /api/fooddb/health` | `{ ok, foods, exercises }` |
| `GET /api/fooddb/categories` | `[ {id, name, count} ]` — foods |
| `GET /api/fooddb/exercise-categories` | `[ {id, name, count} ]` — exercises |
| `GET /api/fooddb/foods?q&categoryId&limit` | `{ query, count, results:[...] }` |
| `GET /api/fooddb/foods/{id}` | `{ id, name, categoryName, per100g:{...}, householdUnits:[...], genericUnits:[...] }` |
| `GET /api/fooddb/exercises?q&categoryId&limit` | `{ query, count, results:[...] }` |
| `GET /api/fooddb/exercises/{id}` | `{ id, name, categoryName, met }` |

### Rules

- status=1 filter on foods and exercises
- limit clamp [1, 50]; default 20
- Persian normalization in SQL: `REPLACE(col,'ي','ی')` etc.
- Wildcards `%`/`_` escaped
- Ranking: exact=0 > starts-with=1 > contains=2, tiebreak by length
- Detail: nutrients normalized to per-100g from `amount`
- Missing (-1) → null

### Path resolution

    var rootDir = FindRoot();                // walks for /app directory
    var foodDbPath = Path.Combine(rootDir, "Food.db");
    // fallback: parent(rootDir)/Food.db
    // connection string: Data Source=...;Mode=ReadOnly;Cache=Shared;Pooling=True

### Error contract

- Missing file → 503 `{ error:"db_missing" }`
- SQL error → 500 `{ error:"db_error", detail }`
- Unknown id → 404 `{ error:"not_found", id }`
- No stack traces, no path leaks

---

## Food Logging UI (Phase F.2 / F.3)

File: `app/residency/fooddb-ui.js` (external IIFE module)

Exposed: `window.InternshipResidency.fooddbUI.open(mealId)` / `.close()`

Depends on: `window.__ioFdbBridge` (set by `app.js` boot)

### Bridge (app.js)

    window.__ioFdbBridge = {
      mealEnsure, notify, save, render, escapeHtml,
      fa0, fa1, meals: _MEALS, todayJalali, healthEnsure
    };

### UI layers

1. **Tabs** — search / categories / favorites / custom
2. **Search** — 300ms debounce; stale response guard via reqId; targeted
   `updateResults()` DOM update (no full modal re-render)
3. **Categories** — grid with Persian icon map (fallback 🍽️); click → list
4. **Favorites** — from `state.health.favoriteFoods`
5. **Custom** — name + per-100g kcal/p/c/f + grams
6. **Detail** — hero kcal + 3 SVG donut cards (p/c/f with % of energy) +
   unit selector (household or generic) + grams or count input +
   live preview + favorite toggle + add/back

### Delegation

Single click + single input listener on `#fdb-overlay`, dispatched by
`data-fdb-*` attributes. Per-button handlers where innerHTML is swapped.

### Persistence

On add: `_mealEnsure(state, date, meal)` → `items.push({...snapshot})` →
`saveState()` → notify → `renderAreaDetail("body")`.

Date resolution: `viewDate()` (reads `window.__ioNutritionDate`) → falls
back to `todayJalali()`.

---

## Nutrition Trend (Phase F.4)

File: `app/app.js::_renderNutritionTrend`

### Components

- **Heatmap**: monthly grid, 7 columns, 5 heat levels per cell
- **Line chart**: 30-day SVG (target line dashed, area gradient)
- **Stat cards**: days-logged, avg kcal, hit-target days, max kcal

### Navigation

- Month prev/next buttons — `_trendView.{jy,jm}` state
- Day click → `_nutritionViewDate = key` → `_nutritionSubTab = "today"`

### Constants

    var _nutritionSubTab = "today";
    var _nutritionViewDate = null;         // null = today
    var _trendView = null;                 // null = current month

---

## Notification Bell (Phase F.5)

Files:
- `app/index.html`: `<div id="io-dash-bell" class="dash-bell-host"></div>`
  inserted before the theme button in `.app-header .actions`
- `app/app.js`: `_updateDashBell`, `_dashNotificationsList`, `_dashBellDoAction`
- `app/styles.css`: `.dash-bell-host`, `.dash-bell-btn`, `.dash-bell-drop`

### State

None (all derived). Hidden when 0 items via `.has-items` class toggle.

### Notification kinds

| kind | source | actions |
|---|---|---|
| `meal` | `_mealReminderList()` — recurrence-aware, past-due, unlogged | `open-meal` |
| `task` | `state.tasks` with `date < today` and `!completed` | `edit-task`, `done-task` |

### Bridges (app.js)

    window.__ioOpenTask     = function (id) { openTaskForm(id); }
    window.__ioCompleteTask = function (id) { ...; saveState(); _updateDashBell(); render(); }

### Click semantics

- Individual `addEventListener` per `[data-act]` button, attached AFTER
  `innerHTML` assignment (avoids parent delegation pitfalls).
- `data-act` values: `open-meal`, `edit-task`, `done-task`.
- For meals: switch to nutrition tab → `renderAreaDetail("body")` →
  delayed `fooddbUI.open(mealId)` (250 ms) so DOM is ready.

---

## Health Hub (Phase F.3+)

File: `app/app.js::renderHealthHub`

### Layout

- Hero card (area icon + title)
- 3 graphic banners (tabs): workout / nutrition / body
- Content for active tab
- Back button to dashboard

### Banner contract

Each banner has `--accent` CSS custom property (rgb triplet).
Content from `_healthBannerData(id)`:
  { icon, title, big, unit, sub, pct?, trend?, color }

- nutrition: today kcal + target + % (arc)
- body: last weight + date + trend arrow (up/down/flat)
- workout: placeholder

### Animations

- Glow pulse (`hbGlow`)
- Dot pattern (`hb-pattern`, masked)
- Arc fill (`hbArcFill`, delays per card)

---

## Sleep Hub (Phase F.7)

Files:
- app/residency/sleep-ui.js — external IIFE, exposes R.sleepUI
- app/residency/sleep-tests.js — 50 persistent tests (ADR-021)
- app/app.js::_renderSleepHub — hub entry
- app/app.js::_sleepTestBridge — bridge to sleep-ui

### State

    state.sleep = {
      schedule: {
        night: { enabled, bedTime:"22:00", wakeTime:"06:00" },
        nap:   { enabled, weekdays:[7 bool], time:"14:00", durationMin:60 }
      },
      log: [{
        id, date, kind:"night"|"nap",
        bedTime, wakeTime, durationMin,
        taskId:null, createdAt, updatedAt
      }]
    }

Lazy-init in _ensure(s). No migration.

### UI

- 4 sub-tabs: روز / روند / تاریخچه / تنظیمات
- Modal entry uses native input[type=time] + 5-preset pills
- Trend: 4 stat cards + 3 SVG line charts (night / nap / combined)

### Auto Tasks (explicit-sync only)

    { id: "sl-night-ev-YYYY/M/D" | "sl-night-mo-YYYY/M/D" | "sl-nap-YYYY/M/D",
      _sleepAuto: "night:evening" | "night:morning" | "nap",
      _cont: "tail"|"head"|null,
      recurrence: "none" }

Cross-midnight split (22:00 -> 06:00):
- evening: date = prev day, time = "22:00", duration = 120
- morning: date = today,    time = "00:00", duration = 360

Sync is idempotent — purge all _sleepAuto then rebuild from settings.

### Bell

Kind "sleep": shows task with no matching log for its date. Action
"ثبت >" calls sleepUI.openForm("night", date). Sleep tasks never appear
in the generic overdue section.

### Cross-Midnight Merge (UI-only)

- app.js::tasksOnDate (calendar day panel) — filter evening, extend morning
- app.js::todaysTasks (dashboard today tasks) — same
- day-timeline-v20.js::_renderTimedItem — same
- Day bar (_renderDashDayBar) — keeps two blocks; arrows via CSS

---

## Exercise UI (Phase F.6)

Files:
- app/residency/workoutdb-ui.js — external IIFE (R.workoutdbUI)
- app/residency/workoutdb-tests.js — 32 persistent tests

### Endpoints (read-only, F.1)

- /api/fooddb/exercise-categories
- /api/fooddb/exercises?q&categoryId&limit
- /api/fooddb/exercises/{id}

### State

    state.health.workoutLog = [{
      id, date, dbExerciseId,
      snapshot: { name, categoryName, met },
      durationMinutes, weightKg, kcalEstimated,
      formula: "gross-met-3.5",
      createdAt, updatedAt
    }]

### Formula

    kcal = MET * 3.5 * weightKg / 200 * durationMinutes

Labeled "تخمینی". Never added to nutrition budget (TDEE already covers
activity level). Invalid inputs -> NULL (never 0).

### UI

- Modal with 3 tabs: search / categories / history
- CAT_ICONS map (23 Persian->emoji rules)
- Hub: day / trend sub-tabs; trend = heatmap + line chart + 4 cards

---

## Auto-Update Infrastructure (v0.5.1)

File: `release.ps1`, `release.iss`, `release.cmd`, `server-dotnet/Program.cs` (endpoints)

### Flow

    Developer:  release.cmd (double-click)
                    │ prompts for version
                    ▼
                release.ps1
                    │ 1. dotnet publish → server/
                    │ 2. copy app/, server/, Food.db, CHANGELOG → release folder
                    │ 3. write empty data/state.js
                    │ 4. update VERSION, version.json, app/data.js
                    │ 5. ISCC compile → InternshipOS-Setup-vX.Y.Z.exe
                    │ 6. SHA256
                    │ 7. build update.json
                    │ 8. git push
                    │ 9. gh release create + upload installer + update.json
                    ▼
                GitHub Release (public)

    User:       App → تنظیمات → «بررسی آپدیت»
                    │
                    ▼
                GET /api/check-update?url=<manifest>
                    │ backend fetches manifest from GitHub
                    ▼
                modal: «نسخه‌ی جدید vX.Y.Z» + notes + دکمه
                    │
                    ▼
                POST /api/apply-update { installerUrl, newVersion, sha256 }
                    │ 1. download exe to %TEMP%
                    │ 2. verify SHA256
                    │ 3. read install dir from registry (AppId)
                    │ 4. Process.Start(exe, "/SILENT /NORESTART /DIR=...")
                    │ 5. Environment.Exit(0) after 2 s
                    ▼
                Inno Setup installer runs silently
                    │ replaces app/, server/, Food.db, root files
                    │ EXCLUDES data/ (user preserved)
                    │ [Run] postinstall → re-launch app
                    ▼
                App vX.Y.Z running with user's data intact

### Key decisions

- **Installer-based, not ZIP** — handles backend binary changes,
  DB updates, schema migration chain. ZIP-only was insufficient.
- **AppId stable** — `{B8F3A9D5-2E4C-4A1B-9F5D-1C7E3B8A6F2D}` → Inno
  recognizes upgrade, keeps install location.
- **Silent + self-exit** — app calls `Environment.Exit(0)` so the
  running `InternshipOS.exe` is not locked when installer replaces it.
- **SHA256 verify** — protects against corrupted downloads.
- **data/ excluded** — installer `Excludes: "data\*,data"` on the
  main wildcard. `state.js` and `ai-config.json` only written on
  fresh install (`onlyifdoesntexist`).

### Registry contract

Install location stored at:
`HKCU\Software\Microsoft\Windows\CurrentVersion\Uninstall\{B8F3A9D5-...}_is1\InstallLocation`

Backend reads this before launching the installer so the new install
goes to the same directory. Fallback: `%LOCALAPPDATA%\Programs\InternshipOS`.

### Endpoints

    GET  /api/check-update?url=<manifest-url>
    POST /api/apply-update   body: { installerUrl, newVersion, sha256 }

See `docs/AUTO-UPDATE.md` for full details, troubleshooting, and
developer workflow.

### Constraints

- Versions < 0.5.1 have ZIP-based update logic. One-time manual
  install of v0.5.1 is required to enter the auto-update path.
- No delta updates. Each update downloads the full installer (~56 MB).
- No code signing. Windows SmartScreen may show a warning on first
  install from a new machine (signed builds planned).
- No progress percentage in the update modal (shows only "در حال
  دانلود").