# SCHEMA.md

Last Updated: 2026-10-15

Schema Version: 22

## Migration Chain

Location: app.js::migrateState

Chains: v1 → v2 → ... → v21 (sequential guards).

Notable additions per version:
- v3-v5: task sources, duration, time normalization
- v6-v8: residency integration
- v9: activitySchedule per rotation
- v10: residencyActivityId, reviewStates
- v11: constraints, locks
- v15: reserveState
- v16: reviewSettings
- v17: overduePolicy
- v18: contentDrafts
- v19: planVersions.snapshot
- v20: enrollment.initialStudyBaseline
- v21: round.studySpeedPagesPerHour + settings.readingStrategy

## State Paths — Source of Truth

state.tasks — Task[] — Persistent
state.shifts — Shift[] — Persistent
state.rotations — Rotation[] — Persistent
state.cases — Case[] — Persistent
state.procedures — Procedure[] — Persistent
state.clinicalProgress — { itemId: 0|1|2 } — Persistent
state.procedureProgress — { itemId: 0|1|2 } — Persistent
state.curriculumMeta — {} — Persistent
state.customContent — {} — Persistent
state.imports — Import[] — Persistent
state.programContent — ProgramContent[] — Persistent
state.contentDrafts — Draft[] — Persistent
state.residency — Residency — Persistent
state.replanTriggers — Trigger[] — Persistent
state.schedulingAcks — Ack[] — Persistent

## Key Paths — Residency

residency.plans — Plan[] — Source of Truth
residency.subjects — Subject[] — Source of Truth
residency.books — Book[] — Source of Truth
residency.rounds — Round[] — Source of Truth
residency.enrollments — Enrollment[] — Source of Truth
residency.activities — Activity[] — Source of Truth
residency.assessments — Assessment[] — Source of Truth
residency.planVersions — PlanVersion[] — Persistent (history)
residency.reviewStates — ReviewState[] — Persistent
residency.capacityProfiles — CapacityProfile[] — Source of Truth
residency.dayOverrides — DayOverride[] — Source of Truth
residency.manualOverrides — ManualOverride[] — Source of Truth
residency.constraints — Constraint[] — Source of Truth
residency.reserveState — { consumedByPlan, updatedAt } — Persistent
residency.settings — Settings — Source of Truth
residency.meta — { activePlanId, createdAt, updatedAt } — Source of Truth

## Computed (Not Stored)

- ScheduledItem[] — computed from state by schedulingProjection
- DayTimeline model — computed
- Capacity per day — computed from calendar context
- Conflict[] — computed
- Availability windows — computed
- PlannerInput (snapshot) — computed, immutable
- StudyDemand[] — computed
- Allocation result — computed
- Proposal — computed, ephemeral
- Fingerprint — computed
- Feasibility — computed

## Ephemeral (Runtime Only)

- window.__os — debug bridge, recreated at boot
- Proposal objects — not persisted (only applied results)
- Drafts in wizard — in-memory until commit
- Loading state — UI only

## Reading Strategy (settings)

residency.settings.readingStrategy:
{
  mode: "sequential" | "category_first" | "alternating_daily"
        | "alternating_categories" | "balanced" | "custom",
  rotationSize: number (default 3),
  alternationDays: number (default 1),
  customOrder: [],
  customCategoryOrder: []
} | null

Null → sequential default.

## Study Speed (per round)

residency.rounds[].studySpeedPagesPerHour: number | null

Null → fallback to enrollment → global settings → 20.

## Baseline (per enrollment)

residency.enrollments[].initialStudyBaseline:
{
  ranges: [{ start, end }],
  applyToRounds: "ALL" | "FIRST_ONLY" | "SELECTED_ROUNDS",
  selectedRoundIds: [],
  notes: ""
} | null

## PlanVersion Snapshot

residency.planVersions[].snapshot:
{
  activities: Activity[],
  capturedAt: number,
  activityCount: number,
  fingerprint: string
} | null

## Replan Trigger

state.replanTriggers[].{ id, planId, type, sourceType, sourceId, action, date, reason, at }

Types: shift_added / shift_updated / shift_removed / task_added / task_updated / task_removed / task_completed / rotation_changed / capacity_context_changed / baseline_changed

## Scheduling Ack

state.schedulingAcks[].{ pairKey, at, reason, fp }

pairKey = sort(a, b).join("::")
fp = semantic fingerprint for invalidation

---

## v22 Addition (Phase 22.2)

residency.rounds[].locked: boolean | false

Legacy rounds migrated to locked:false. Boolean preserved if already valid.

## Scheduler API (v22, extended in 23.2)

R.roundScheduler.computeEdit(rounds, examDate, { roundId, newDuration })
R.roundScheduler.computeNormalize(rounds, examDate)
R.roundScheduler.computeExplicitEdit(rounds, examDate, { roundId, newStartDate, newEndDate })

### Contract

- computeNormalize: closes gaps, enforces contiguous chain
- computeEdit: duration change, delegates to normalize if unhealthy
- computeExplicitEdit: user controls exact dates, gaps allowed, only overlap / exam / lock rejected

---

## v22 Additions (Phase 24 → 26)

### Trigger Event Structure (Phase 25.1b)

state.replanTriggers[].events[]:
{
  type: string,          // "task_added", "round_changed", ...
  at: number,            // timestamp
  title: string | null,  // entity title at time of change
  before: object | null, // { date, time, durationMinutes, ... }
  after: object | null
}

state.replanTriggers[].title / .before / .after  — latest event cached for convenience
state.replanTriggers[].sourceType — "task" | "shift" | "round" | "rotation" | "enrollment" | "capacity"

### Trigger Types (Phase 25.1)

- shift_added / shift_updated / shift_removed
- task_added / task_updated / task_removed / task_completed
- rotation_changed (batch — plan-level)
- round_changed (per-round)
- baseline_changed
- capacity_context_changed
- state_changed (fallback)

### Proposal Extensions (Phase 26.1–26.3)

proposal.coveredTriggerIds: string[]  — trigger IDs existing at generation time
proposal.finalSimulation: {
  activityCount: number,
  peakDailyMinutes: number,
  completionDate: string | null,
  daysWithLoad: number
}

proposal.recovery:
- debtPages / debtMinutes
- remainingDebtPages / remainingDebtMinutes

### Replan Apply Contract (Phase 26.3)

- Validate everything pre-mutation
- Snapshot: { activities, tasks, reserveState, planVersions, replanTriggers }
- Single save
- Rollback on any failure
- Trigger clear = clearByIds(coveredTriggerIds) only

### RT API (v1.4.0)

- RT.notifyChange(type, payload)
- RT.notifyTaskChange(task, action, detail)
- RT.notifyShiftChange(shift, action, detail)
- RT.markNeeded(trigger)
- RT.getStatus(planId)
- RT.clear(planId)               // legacy — admin only
- RT.clearAll()                  // legacy — admin only
- RT.clearByIds(planId, ids)     // ← used by Apply
- RT.describeEvent(ev)           // Persian description
- RT.isRelevantTask(task)
## v22 Additions — Health & Nutrition (Phase A → F.5)

Schema Version stays 22. All additions are lazy-init, additive, nullable.

### state.health

state.health = {
  profile: {
    birthDate:      "YYYY/M/D" | null,   // required for age
    sex:            "male" | "female" | "other" | null,
    heightCm:       number | null,
    activityLevel:  "sedentary"|"light"|"moderate"|"active"|"very_active" | null,
    goal:           "lose"|"gain"|"muscle"|"maintain" | null,
    targetWeightKg: number | null
  },

  bodyLog: [
    { id, date:"YYYY/M/D", weightKg:number, heightCm?:number }
  ],

  calorieTarget: null | {
    kcal, p, c, f,               // daily target + macro grams
    pPct, cPct, fPct,            // percentages (sum = 100)
    ree, tdee, bmi,              // computed reference values
    manual: bool,                // true when user edited macros directly
    computedAt: number,          // Date.now()
    profileSnapshot: object      // frozen copy of profile at computation
  },

  foodCatalog: [                 // manual user foods (kept for compat)
    { id, name, source:"user",
      per100: { kcal, p, c, f } }
  ],

  foodLog: [                     // one entry per (date, meal)
    {
      id,
      date: "YYYY/M/D",
      meal: "breakfast"|"lunch"|"dinner"|"snack",
      items: [
        {
          foodId,                // "db:<id>" | "custom:<ts>" | legacy id
          source,                // "db" | "custom" | undefined (legacy)
          dbFoodId,              // Food.db id (source="db")
          grams,                 // total consumed
          unit: null | {         // household unit, when used
            unitId, unitName, gram, count, approx:bool
          },
          snapshot: {            // per-100g values, frozen at log time
            name, kcal:number|null, p:number|null,
            c:number|null, f:number|null
          }
        }
      ]
    }
  ],

  favoriteFoods: [               // Food.db favorites (light index)
    { dbFoodId, name, kcal:number|null }
  ],

  // Reserved for F.6 — not yet used:
  // workoutLog: [ { id, date, exerciseId, name, durationMinutes, weightKg,
  //                 met, kcalEstimated, kcalActual|null } ]
}

### Lazy init

- normalizeStateObject(): creates s.health = {} + defaults if missing
- _healthEnsure(s): same idempotent guard at every read
- No migration chain change (v22 unchanged)

### Persistence

- Included automatically in state.js and localStorage
- Total size ≤ a few KB for typical usage
- Food.db catalog is NOT stored in state (queried on demand)

### Nullable / missing semantics

- Missing nutrient = null (never 0)
- _mealTotals / _dayTotals: hasUnknown flag flips to true when any
  item has a null nutrient; UI shows "—" for the sum row
- calorieTarget = null until user explicitly computes it

### Notification contract (derived, not stored)

- _dashNotificationsList() returns transient list; nothing persisted
- Item shape: { kind, icon, title, sub, meal?, taskId? }
- Kinds: "meal" (from _mealReminderList), "task" (date < today, !completed)

## v22 Additions — Sleep Hub (Phase F.7)

Schema Version stays 22. Additive, lazy-init.

### state.sleep

    state.sleep = {
      schedule: {
        night: { enabled: bool, bedTime:"HH:MM", wakeTime:"HH:MM" },
        nap:   { enabled: bool, weekdays:[7 bool], time:"HH:MM", durationMin: number }
      },
      log: [{
        id, date:"YYYY/M/D", kind:"night"|"nap",
        bedTime:"HH:MM", wakeTime:"HH:MM", durationMin: number,
        taskId: null, createdAt: ts, updatedAt: ts
      }]
    }

### Auto sleep tasks (in state.tasks[])

    {
      id: "sl-night-ev-YYYY/M/D" | "sl-night-mo-YYYY/M/D" | "sl-nap-YYYY/M/D",
      title: "خواب شب" | "چرت",
      areaId: "sleep", taskType: "personal",
      date, time, durationMinutes,
      recurrence: "none",
      completed: false,
      _sleepAuto: "night:evening" | "night:morning" | "nap",
      _cont: "tail"|"head"|null
    }

Split rule (bed > wake):
- evening: date = prev day, time = bedTime, dur = 1440 - bedMin
- morning: date = wake-up day, time = "00:00", dur = wakeMin

### state.health.workoutLog (Phase F.6)

    state.health.workoutLog = [{
      id, date:"YYYY/M/D",
      dbExerciseId: number|null,
      snapshot: { name, categoryName, met },
      durationMinutes: number,
      weightKg: number,
      kcalEstimated: number,
      formula: "gross-met-3.5",
      createdAt: ts, updatedAt: ts
    }]

### Nullable / missing semantics

- Sleep log durationMin must be > 0 and <= 1440. Identical times -> null.
- Exercise kcalEstimated is null on any invalid input.
- Both lazy-init via their own ensure helpers; no migration.


## v22 Additions — Projects, Finance, Life (Phase F.8 → F.10)

Schema stays v22. All additions are lazy-init, additive, nullable.
No migration chain change.

### state.projects[]

    [
      {
        id,                     // "prj-..." unique
        title,                  // required
        description,            // optional string
        goal,                   // optional string
        startDate,              // "YYYY/M/D" | null
        deadline,               // "YYYY/M/D" | null
        priority,               // "low" | "normal" | "high"
        status,                 // "active" | "completed" | "archived"
        createdAt,              // number
        updatedAt               // number
      }
    ]

Related: task.projectId — nullable string (references state.projects[].id).
Related: task.projNote — nullable string (progress note per task).

### state.finance

    {
      transactions: [
        {
          id,                     // "txn-..." unique
          kind,                   // "income" | "expense"
          amount,                 // positive integer (toman)
          date,                   // "YYYY/M/D"
          categoryId,             // string | null
          categoryNameSnapshot,   // frozen at log time
          note,                   // string
          projectId,              // string | null
          projectTitleSnapshot,   // frozen at log time
          createdAt, updatedAt
        }
      ],
      categories: [
        { id, label, kind, icon, builtin?, deactivated? }
      ],
      budgets: {
        "YYYY/M": number                       // legacy F.9 scalar (expense)
                 | { income: number|null, expense: number|null }
      },
      months: {
        "YYYY/M": { status: "closed", closedAt: number }
      },
      settings: {
        dailyReminder:       boolean,   // default false — OWNER-APPROVED
        dailyReminderHour:   number,    // 0..23, default 20
        dismissedDailyDate:  string     // "YYYY/M/D" — hide for today only
      },
      __catSeeded: boolean
    }

Lazy-init in normalizeStateObject AND _financeEnsure(s).
No migration.

### state.life

    {
      items: [
        {
          id,             // "life-..." unique
          category,       // "movie" | "series" | "book"
                         // "date" | "social" | "travel" | "other"
          title,          // required
          status,         // "planned" | "in_progress" | "done" | "dropped"
          rating,         // 1..5 integer | null
          note,           // string
          tags,           // string[]
          taskId,         // string | null — references state.tasks[].id
          createdAt, updatedAt,
          startedAt, completedAt
        }
      ]
    }

Rule: life item does NOT store date/time/duration. The linked task
(state.tasks[]) is the single scheduling authority. Timeline sees
only the task.

Lazy-init in normalizeStateObject AND _lifeEnsure(s).
No migration.

### Dashboard greeting cockpit

No new state. Metrics derive from:
  - کار امروز / عقب‌مانده  → state.tasks[]
  - کالری                  → _dayTotals(state, today) + state.health.calorieTarget
  - هزینه امروز            → state.finance.transactions (kind=expense, date=today)
  - تا کشیک                → state.shifts[] (existing source)
  - روتیشن                → currentRot (getCurrentRotation)
  - نزدیک‌ترین قرار زندگی    → state.life.items[] linked to state.tasks[]

A metric hides when its data source is empty. Never fabricate 0.
## Auto-Update Infrastructure (v0.5.1)

Schema Version stays 22. No state field changes.

### `update.json` (manifest, NOT in state)

    {
      "latest": "0.5.1",
      "installerUrl": "https://github.com/.../releases/download/v0.5.1/InternshipOS-Setup-v0.5.1.exe",
      "zipUrl": "<same as installerUrl — legacy alias>",
      "sha256": "45870960DB527F...",
      "sizeBytes": 58754032,
      "releaseNotes": "...",
      "publishedAt": "2026-10-16"
    }

Location on GitHub: release asset named `update.json`, reachable via
`.../releases/latest/download/update.json`.

### Backend contract

`GET /api/check-update?url=<manifest-url>` — fetches and parses.
`POST /api/apply-update` with body `{ installerUrl, newVersion, sha256 }` —
downloads, verifies, executes silent install.

### `VERSION` (root)

Single-line semver, e.g. `0.5.1`. Written by `release.ps1`.
Read by `app.js` at boot for display; compared to manifest `latest`.

### `version.json` (root)

Same shape as before, updated per release:
`{ version, releasedAt, schema, highlights[], notes }`.

### No state impact

No new fields in `window.INTERNSHIP_STATE`. `data/` preservation is
handled entirely at the installer layer (`release.iss` excludes `data\`
from the wildcard copy).


## v22 Addition — Daily Life Schedule (additive, no bump)

Path: state.residency.settings.dailyLifeSchedule

Shape:
```
{
  version: 1,
  studyWindow: { startTime: "HH:mm", endTime: "HH:mm" },
  weeklyBlocks: [ {
    id: "dls-...",
    kind: "sleep" | "meal" | "hospital" | "other",
    title: "string",
    daysOfWeek: ["saturday", ...],
    startTime: "HH:mm", endTime: "HH:mm",
    enabled: true,
    rotationId: "string|null"
  } ]
}
```

Default: studyWindow {06:30, 23:00}, weeklyBlocks [].

Validation:
- studyWindow.startTime < endTime
- block startTime !== endTime (either can be overnight)
- daysOfWeek subset of standard weekdays

## studyHours / defaultCapacity Sync

settings.studyHoursByDayType (hours) and settings.defaultCapacity (minutes)
synced on Wizard commit: defaultCapacity.key = studyHours.key x 60.
defaultCapacity is source of truth for planner.
## v22 Additions — V7 Activity Contract (M5/M6, additive, no bump)

Schema stays v22. No migration.

### state.residency.activities[] — V7 shape (from `_buildDayActivity`)

    {
      id: "act-v7-<ts>-<rand>",
      kind: "study",
      planId, roundId, bookId, subjectId,
      plannedDate: "YYYY/M/D",
      plannedStartTime: "HH:MM" | null,
      plannedDurationMinutes: number | null,
      plannedPages: number,
      plannedPageStart: number,     // v7-only, additive
      plannedPageEnd: number,       // v7-only, additive
      actualPages: 0,
      actualDurationMinutes: 0,
      actualPageRanges: [],
      status: "planned" | "in_progress" | "completed" | "cancelled",
      sourceType: "planner",
      sourceId: "v7-ui",
      taskId: null,
      locked: false,
      notes: "",
      reviewTarget: null, reviewMeta: null, assessmentId: null,
      createdAt, updatedAt
    }

All new fields nullable / default. Legacy activities (pre-M5) load without
plannedPageStart/End — treated as "no progress data" (conservative).

### Generated blocks (ephemeral, not stored)

allocator.allocate() returns blocks[]:
    { date, bookId, bookTitle, startPage, endPage, pages, minutes, sessionIndex }
Post-Generate, UI adds roundId in-memory (from input.books[].roundId).
Not persisted — regenerated each Generate.

### Contracts (enforced by tests)

- Dedup: (planId, roundId, bookId, date, pageRangeOverlap).
- Progress = union(baseline.ranges, completed activity ranges) per enrollment.
- Allocated = planned/in_progress activity ranges, per-round scoped.
- Day lock: any planned activity on date -> cap = 0 in next Generate.
- Route: R.plannerUI.open(planId) -> V7; legacy at _legacyOpen.

### Not stored

- _inputMeta (breakdown, dayBreakdown) — recomputed per Generate.
- _selectedDays, _editedDays — runtime only, reset in UI.close().
- _dayBounds — computed from current plan state.

### Frozen — no bump needed

Schema v22 stays. All additions are activity fields and UI state; no
new top-level namespaces, no migration chain changes.