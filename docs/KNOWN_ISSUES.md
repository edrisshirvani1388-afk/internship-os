# Known Issues

Last Updated: 2026-10-11

## OPEN

### ISSUE-01 — Trigger on Non-Residency Task Cannot Be Replanned
Status: Open
Severity: Important (UX)
Area: replan-trigger-v20.js + planner-execution-v7.js
Next Action: Design Agent decision (A/B/C options).

### ISSUE-02 — task_completed Trigger Emits for Any Completion
Status: Open
Severity: Medium (UX)
Area: replan-trigger-v20.js::isRelevantTask + app.js::toggleTask
Next Action: Design Agent decision.

### ISSUE-03 — Trigger for Task Outside Plan Range
Status: Open
Severity: Medium
Area: replan-trigger-v20.js::notifyChange
Next Action: Add range filter.

### ISSUE-04 — Replan Panel Opens Without Trigger
Status: Open
Severity: Important (UX)
Area: residency-dashboard-v19.js + planner-replan-ui-v7.js
Next Action: Design Agent decision.

### ISSUE-05 — Strategy Comparison Table Confusing
Status: Open
Severity: Important (UX)
Area: planner-replan-ui-v7.js::_renderComparison
Next Action: Inline help.

### ISSUE-06 — Two Parallel "Today" Views
Status: Open
Severity: Important (UX)
Area: app.js::renderDashboard vs residency-dashboard-v19.js::_renderTodayTab
Next Action: Design Agent decision.

### ISSUE-07 — Conflict Engine Not Used in Today
Status: Open
Severity: Medium
Area: scheduling-conflict-v20.js
Next Action: Integrate.

### ISSUE-08 — N+1 Save in Wizard Commit
Status: Open
Severity: Low
Area: residency-setup-wizard-v19.js
Next Action: batch (Store frozen).

### ISSUE-09 — Two Saves in Create Round
Status: Open
Severity: Low
Area: residency-managers-v19.js::_saveRound
Accepted for now.

### ISSUE-10 — Conflict Engine Misclassifies Residency  [RESOLVED Phase 28.1]
Status: RESOLVED
Verified:
  - `_kindOf` line 58 maps `category === "residency"` → `study`
  - `CF.__tests` — 36/36 PASS (covers residency pairs)
  - Dashboard uses `_getEffectiveItems` for dedup
Resolved in: Phase 28.0 (code) + Phase 28.1 (verification + doc)

### ISSUE-11 — _renderFlexibleItem Attribute Duplication
Status: Partially Fixed (Phase 27.35)
Needs final regression test.

### ISSUE-12 — Snake Timeline Start Circle + Arrows Missing
Status: Open
Severity: Low (visual)
Needs specialized coding agent.

### ISSUE-13 — styles.css Accumulation
Status: Open
Severity: Medium (maintenance)
Many stacked PATCH blocks. Refactor pending.

### ISSUE-14 — store-v2/v5/v10 Relationship Unclear
Status: Open
Severity: Low
Docs claim `store-v2.js::applyRounds`, but store-v5.js and store-v10.js
also load. Verification needed. Frozen — awaiting Design Agent.

### ISSUE-15 — Orphaned `showConflictWarning` (Phase 28.1 side-effect)
Status: Open
Severity: Low
After retiring legacy detector from task modals, `showConflictWarning`
remains defined in app.js with zero callers. Candidate for deletion
in a later phase. Not fixed in Phase 28.1 (out of scope).

### ISSUE-16 — Non-Dedup Projection Callers Outside Dashboard
Status: Open
Severity: Low
Several lines call `schedulingProjection.projectDate(state, cur, {})`
in non-dashboard contexts (DayBar rerender helpers, prevItems snapshot
in drag logic). If any of those feed conflict detection, dedup is
required. Audited as part of Phase 28.1 — none currently feed CF.
Documented for future additions.



### ISSUE-17 — Duration Picker: Chip Click Did Not Sync Manual Input
Status: FIXED (Phase 28.2.3)
Severity: High (data integrity)
Area: pickers.js::renderDurationPicker + readDuration
Root cause: chip click handler updated slider + label but NOT .dur-manual-input.
readDuration reads manual first -> returned stale value (default 60).
Fix: chip click syncs manual; manual input syncs slider (dynamic max when exceeded).
Tests: 4 manual + baseline regression.
Backup: pickers.js.bak-28.2.3-<ts>

### ISSUE-19 — Non-Additive RULES Change Requires Explicit Approval
Status: Open (process note)
Severity: Low
Area: scheduling-conflict-v20.js RULES table
Phase 28.2.2 changed study|clinical WARNING -> HARD. Non-additive.
RULES table is frozen; further changes require explicit user approval and ADR.
See ADR-033.
Next action: None — process note for future.
### ISSUE-21 вАФ `dialog.confirm` Contract Mismatch (Promise vs Callback)
Status: Open (process note)
Severity: Medium
Area: any caller passing 2nd-arg as callback to `R.dialog.confirm`
Root: `R.dialog.confirm(message, options)` returns Promise<boolean>.
Historical callers may assume callback signature → silent no-op.
Fixed in replan-ui (28.4c). Other callers not yet audited.
Next: audit all `.confirm(` usages in repo.
## FIXED

### BUG-001 — Round Date Redistribution vs ExamDate
Fixed (Phase 22.3, refined 23.2)

### BUG-002 — Replan UI Technical English
Partially Fixed (Phase 24.1)

### BUG-003 — No Graphical Timeline
Fixed (Phase 23.0)

### BUG-008 — Cold-boot wizard race
Fixed

### BUG-009 — 1-minute allocation overflow
Fixed (Phase 9)

### BUG-010 — isEdit ReferenceError
Fixed

### Carry_forward Over-allocation (37 → 1926)
Fixed (Phase 26.1)

### Buffer Full Consumption (3520 → 0)
Fixed (Phase 26.2)

### Partial Apply State Corruption
Fixed (Phase 26.3)

### PRA.__tests State Mutation
Fixed (Phase 26.3b)

### Self-Conflict "مطالعه ↔ مطالعه" (Phase 28.0)
Fixed. Dashboard conflict feed deduplicated via `_getEffectiveItems`
in 5 paths.

### Blanket Shift Exemption in Overlap Check (Phase 28.1)
Fixed. `_shouldBlockOverlap` no longer exempts shift items; self-id
skip replaces it; HARD-only policy enforced.

### Legacy Detector Double-Modal (Phase 28.1)
Fixed. Two `InternshipTimeline.detectConflicts` calls removed from
task-modal submit paths.

### "مطالعه" Fallback Title (Phase 28.1)
Fixed. Untitled residency activity now shows "فعالیت بدون عنوان".
### ISSUE-22 — projectAll 180-Day Default Outside Planner
Status: Open (accepted limitation)
Severity: Low
Area: scheduling-projection-v20.js::projectAll
Context: Default range when options.rangeStart not provided is
  [today, today+180]. Planner snapshot now passes explicit range
  (MVP-03), but other consumers (dashboards, day-modal) still use
  the 180-day default. For typical dashboard views this is fine.
Next: pass explicit range from any consumer that needs > 6 months.
Not blocking daily use.

### ISSUE-23 — Orphan recurrenceExceptions After Pattern Change
Status: Open (low priority)
Severity: Low
Area: app.js — task save path
Context: Changing task.recurrence from "daily" to "weekly" (or
  vice versa) leaves old recurrenceExceptions entries that no
  longer match any generated date. Harmless but accumulates.
Next: prune exceptions on save (only keep dates still on-pattern).

### MVP-01/02/03 — Resolved in this session

- Task edit form: sleep/food/commute areas not selectable
  → FIXED (MVP-01, _getFormAreas helper)
- Recurrence <select> had no working click handler
  → FIXED (MVP-01 chip listener + MVP-02 chip wiring)
- Duplicate quick-add created self-conflicting tasks
  → FIXED (MVP-01 duplicate guard)
- No delete button in task edit modal
  → FIXED (MVP-01)
- No delete button in dashboard day-modal items
  → FIXED (MVP-01)
- Recurrence had zero execution (form-only)
  → FIXED (MVP-02 virtual expansion)
- projectAll 180-day default in planner snapshot
  → FIXED (MVP-03 explicit range)
- Fixture preShift mismatch (180 vs Production 60)
  → FIXED (MVP-01 fixture correction)


---

## Session Update — 2026-10-15 · Agent #13

### ISSUE-24 — Full 244 Baseline Not Re-run
Status: Open (process note)
Severity: Low
Area: test suites
Context: Phases A → F.5 ran targeted tests (fooddb 12, health 14,
  schedulingProjection 32, schedulingConflict 48, migrationV22 11).
  The other 8 suites (plannerReplan, plannerReplanApply, replanTrigger,
  roundScheduler, store.__applyRoundsTests, plannerSchedule,
  plannerAllocation, feasibilityFixtures) were NOT re-run this session.
Next: run all on next milestone or before release.

### ISSUE-25 — Exercise Sub-tab Placeholder
Status: Open (planned F.6)
Severity: Low (feature pending)
Area: app.js::_renderHealthTabContent("workout")
Context: The workout tab shows a "coming soon" banner. F.1 endpoints
  for exercises are live. F.6 will wire the UI.
Next: F.6 — Exercise UI (mirror fooddb-ui.js).

### ISSUE-26 — Manual Food Catalog Hidden but Retained
Status: Open (design decision)
Severity: Low
Area: app.js::_renderNutritionCatalog (removed from new tab)
Context: Phase C built a manual food catalog (state.health.foodCatalog).
  Phase F.3 removed its UI from the nutrition tab; it's still editable
  via the dashboard day-modal. Old entries continue to work.
Next: Decide whether to keep as legacy or migrate to Food.db-only.

### ISSUE-27 — Generic Unit "~" Approximation Marker
Status: Open (informational)
Severity: Low
Area: fooddb-ui.js::detailHTML
Context: When a food has no per-food household units, the detail view
  falls back to `food_units` (generic). These show as "قاشق (۱۵ گرم ~)"
  with a tilde to signal approximation.
Next: None — documented behavior.

### ISSUE-28 — Notification Bell Scope Limited
Status: Open (planned expansion)
Severity: Low
Area: app.js::_dashNotificationsList
Context: Bell shows only meals-due + overdue tasks. No workout / study
  / finance reminders yet.
Next: Extend kinds when F.6+ add their own overdue signals. Do not
  change the meal/task logic — add new branches.

### ISSUE-29 — Food.db Ranking Does Not Demote Compound Names
Status: Open (accepted)
Severity: Low
Area: server-dotnet/Program.cs::/api/fooddb/foods
Context: Query "برنج" ranks "برنجک" (start-with, len 5) above
  "برنج سفید خام" (contains, len 14). This is per ADR-036 ordering
  (exact > starts > contains, tiebreak by length). Compound names
  starting with the query can outrank more relevant matches.
Next: Optional — add score boost for whole-word matches if user feedback
  indicates a problem. Not currently a blocker.

### ISSUE-30 — Recurrence Reminder Grace Window Reduced to 5 min
Status: Open (behavior choice)
Severity: Low
Area: app.js::_mealReminderList
Context: Reminder fires 5 minutes after scheduled meal time
  (previously was start + duration + 30 min). Chosen so users see
  prompt notifications. Could be configurable in future.
Next: Consider exposing a user setting for the grace window.

---

## Session Update — 2026-10-15 · F.6 Closeout

### ISSUE-31 — Sleep Cross-Midnight Split Lives in UI, Not Projection
Status: Open (by design)
Severity: Low
Area: sleep-ui.js + app.js merge patches
Context: Night task is stored as two same-day segments
  (`night:evening` + `night:morning`). Projection simply exposes them as
  two ScheduledItems. List views (dashboard today / calendar day panel /
  dt20 cards) merge them back to one card at render time.
Next: If future work needs cross-midnight awareness in the projection
  itself, an ADR is required. For now, merge is render-only.

### ISSUE-32 — Nap Cross-Midnight Not Split
Status: Open (accepted limitation)
Severity: Low
Area: sleep-ui.js::syncTasks
Context: Nap scheduling does not handle a nap that spans midnight
  (e.g. 23:30 + 90m). Typical naps (12:00–18:00) are unaffected.
Next: Only add split logic if user feedback indicates need.

### ISSUE-33 — Auto Sleep Tasks Require Explicit Sync
Status: Open (behavior choice)
Severity: Low
Area: sleep-ui.js::syncTasks, app.js render
Context: Auto tasks are not created on boot/render. The user must click
  💾 in sleep settings. This prevents accidental state churn but may
  surprise first-time users.
Next: Optional — show a hint banner on first visit to sleep settings.

### ISSUE-34 — Sleep Bell Deduplication Depends on Log Date
Status: Open (informational)
Severity: Low
Area: app.js::_dashNotificationsList
Context: Bell skips a sleep task if any night log exists with the same
  date. Different date entries (e.g. manually edited) may produce
  surprising bell behavior.
Next: None — documented behavior.

## Session Update — 2026-10-15 · F.6 (Exercise UI)

### ISSUE-35 — Exercise kcal Is Approximate Only
Status: Open (by design)
Severity: Low
Area: workoutdb-ui.js
Context: kcal = MET × 3.5 × kg / 200 × min. Labeled "تخمینی".
  Not auto-added to nutrition calorie allowance (TDEE already includes
  activity-level; add-back would double-count).
Next: None — documented behavior.

### ISSUE-36 — Exercise Duplicate Name Suggestion
Status: Open (informational)
Severity: Low
Area: workoutdb-ui.js search
Context: Food.db exercise ranking uses exact > starts-with > contains,
  same as foods. May rank compound names above more relevant matches.
Next: Same as ISSUE-29 (optional score boost).


---

## Session Update — 2026-10-15 · F.6 Closeout

### ISSUE-31 — Sleep Cross-Midnight Split Lives in UI, Not Projection
Status: Open (by design)
Severity: Low
Area: sleep-ui.js + app.js merge patches
Context: Night task is stored as two same-day segments
  (`night:evening` + `night:morning`). Projection simply exposes them as
  two ScheduledItems. List views (dashboard today / calendar day panel /
  dt20 cards) merge them back to one card at render time.
Next: If future work needs cross-midnight awareness in the projection
  itself, an ADR is required. For now, merge is render-only.

### ISSUE-32 — Nap Cross-Midnight Not Split
Status: Open (accepted limitation)
Severity: Low
Area: sleep-ui.js::syncTasks
Context: Nap scheduling does not handle a nap that spans midnight
  (e.g. 23:30 + 90m). Typical naps (12:00–18:00) are unaffected.
Next: Only add split logic if user feedback indicates need.

### ISSUE-33 — Auto Sleep Tasks Require Explicit Sync
Status: Open (behavior choice)
Severity: Low
Area: sleep-ui.js::syncTasks, app.js render
Context: Auto tasks are not created on boot/render. The user must click
  💾 in sleep settings. This prevents accidental state churn but may
  surprise first-time users.
Next: Optional — show a hint banner on first visit to sleep settings.

### ISSUE-34 — Sleep Bell Deduplication Depends on Log Date
Status: Open (informational)
Severity: Low
Area: app.js::_dashNotificationsList
Context: Bell skips a sleep task if any night log exists with the same
  date. Different date entries (e.g. manually edited) may produce
  surprising bell behavior.
Next: None — documented behavior.

## Session Update — 2026-10-15 · F.6 (Exercise UI)

### ISSUE-35 — Exercise kcal Is Approximate Only
Status: Open (by design)
Severity: Low
Area: workoutdb-ui.js
Context: kcal = MET × 3.5 × kg / 200 × min. Labeled "تخمینی".
  Not auto-added to nutrition calorie allowance (TDEE already includes
  activity-level; add-back would double-count).
Next: None — documented behavior.

### ISSUE-36 — Exercise Duplicate Name Suggestion
Status: Open (informational)
Severity: Low
Area: workoutdb-ui.js search
Context: Food.db exercise ranking uses exact > starts-with > contains,
  same as foods. May rank compound names above more relevant matches.
Next: Same as ISSUE-29 (optional score boost).


---

## Session Update — 2026-10-16 · Agent #15 · v0.4.0

### OPEN (new since v0.3.0)

### ISSUE-37 — Life task-form is project-locked when inside project detail
Status: Open (by design)
Severity: Low
Area: openTaskForm presetProjectId
Context: A task created from within a project has its project picker
  hidden. Reassigning it requires editing from a non-project context.
Next: Documented as intentional MVP behavior.

### ISSUE-38 — project-deadline bell range capped at 30 days back
Status: Open (accepted limitation)
Severity: Low
Area: _dashNotificationsList project-deadline block
Context: Only shows deadlines within [−30, +3] days. Older overdue hidden.
Next: None — accepted.

### ISSUE-41 — finance-ui.js grew to ~1180 lines
Status: Open (maintenance)
Severity: Low
Area: app/residency/finance-ui.js
Context: Contains UI + helpers + charts + settings + reminder. Single
  external IIFE but a split candidate.
Next: Optional future split (ui / charts / settings / reminder).

### ISSUE-43 — Life auto-link is silent after task save
Status: Open (UX)
Severity: Low
Area: life-ui.js _scheduleTask + app.js consumePendingLink hook
Context: After «برنامه‌ریزی», the user builds the task; the link applies
  via a pending flag. There is no explicit "link now" step in the task
  save screen.
Next: Optional future improvement.

### ISSUE-44 — Life back-button relies on hash + bridge dual path
Status: Open (informational)
Severity: Low
Area: life-ui.js _gotoDashboard
Context: Sets window.location.hash and calls bridge setRoute. Works today,
  but if the app ever runs outside a hash-router the visual route change
  depends on the bridge.
Next: None — documented.

### ISSUE-45 — Greeting cockpit width at very narrow viewports
Status: Open (cosmetic)
Severity: Low
Area: styles.css .dgc-metrics grid
Context: At 360px the metric tiles drop to 2 columns; still readable but
  tight. Considered acceptable.
Next: None.

### ISSUE-46 — Sleep modal cannot fully exit to dashboard in one click
Status: Open (design decision)
Severity: Low
Area: app.js _cockpitAction("sleep") + sleep-ui.js _openForm
Context: The sleep modal renders inside the sleep-hub view. Closing it
  leaves the user in the sleep hub. A subsequent «بازگشت» returns to the
  dashboard. Globalizing the sleep modal is a larger change.
Next: Consider in a future UX pass.

### RESOLVED in v0.4.0

- Sleep quick-action no longer locks the view (ISSUE-47 → FIXED)
- Money formatter no longer emits long decimals (ISSUE-48 → FIXED)
- Stale «به زودی» badge on Life card (ISSUE-49 → FIXED)

### Session notes

- No regression in any of the 18 registered test suites (463/463).
- Food.db remains read-only.
- Replan atomicity contract untouched.
- Owner-approved finance-daily reminder retained.

---

## Session Update — 2026-10-16 · v0.4.2

### RESOLVED in v0.4.2

- **Food log not persisting** — FIXED. `fooddb-ui.js::addSelected` /
  `addCustom` were writing to `window.INTERNSHIP_STATE` (stale boot
  snapshot) instead of the live `state` object. Bridge now exposes
  `state()`. Same fix applied to `favList`.
  See ADR-057.

- **Favorites list reading stale global** — FIXED (same root cause).

- **`openContentTaskModal` ReferenceError: `isEdit` is not defined** — FIXED.
  The line `${isEdit ? ...}` was removed; this modal is create-only.

- **Sleep quick-action locked the view** — FIXED.
  Now `setRoute("area-detail","sleep")` runs first, then openForm after 170ms.

- **Money formatter emitted long decimals** — FIXED. `Math.round()`
  before separator insertion.

### OPEN (as of v0.4.2)

- ISSUE-37 — Life task form is project-locked when created from project detail.
- ISSUE-38 — project-deadline bell window capped [−30, +3] days.
- ISSUE-41 — finance-ui.js ~1180 lines (maintenance).
- ISSUE-43 — Life auto-link is silent after task save.
- ISSUE-44 — Life back-button dual path (hash + bridge).
- ISSUE-45 — Greeting cockpit narrow-width tile density.
- ISSUE-46 — Sleep modal does not exit to dashboard in one click.
- ISSUE-50 — AI content modal focus handling in WebView2 (best-effort clipboard).
- ISSUE-51 — `_aiPromptForArea` includes up to 30 existing titles; long
  prompt may exceed some AI context limits if content is dense. Accept.


## V7 Study Planner — Known Limitations (2026-10-18)

### ISSUE-52 — Baseline not active
Status: Open (Milestone 3)
Severity: Medium
Context: initialStudyBaseline null in all enrollments.
Next: Milestone 3.

### ISSUE-53 — V7 UI edit uses hardcoded 15 pph
Status: Open
Severity: Low
Next: store pagesPerHour in block, use in edit.

### ISSUE-54 — V7 not wired to R.plannerUI.open
Status: Open (Milestone 6)
Severity: Medium
Next: Milestone 6.

### ISSUE-55 — Time-aware placement absent
Status: Open (deferred)
Severity: Low
Next: Deferred.

### ISSUE-56 — pagesPerDayBudget is soft
Status: Open (Milestone 4)
Severity: Low
Next: hard cap x 1.5 in Milestone 4.

### ISSUE-57 — V7 UI edit does not re-validate blocks
Status: Open
Severity: Low
Next: call _validateEdit in _onEditDay.
---

## Session Update — 2026-10-19 · Agent #19 (M5 + M6)

### RESOLVED

**ISSUE-52** (baseline not active) — RESOLVED (M5)
  `_collectActivityRanges` reads completed activities + baseline union.

**ISSUE-56** (pagesPerDayBudget soft) — RESOLVED (M4.1 + M5)
  Day cap enforced via `[PATCH:m4cap]` + `[PATCH:m5-daycap]`.

**ISSUE-57** (edit no re-validate) — RESOLVED (M4)
  `_validateEdit` called in `_onEditDay`.

**ISSUE-58** (V7 not wired to R.plannerUI.open) — RESOLVED (M6)
  Route switched idempotently; legacy preserved at `_legacyOpen`.

### OPEN (new)

**ISSUE-59** — Dedup key false-negative (RESOLVED in this session)
  Status: RESOLVED (M5)
  Root cause: `_dayKey` used `(plan, round, book, day)` → second block
  on same day was skipped as "already added". Fixed to include
  pageRangeOverlap via `_rangesOverlap(s1,e1,s2,e2)`.
  Evidence: add day 27 with 2 blocks → both added (was: 1).

**ISSUE-60** — T7 assertion too weak (RESOLVED in this session)
  Status: RESOLVED (M6)
  Root cause: `d.capacityMinutes <= exp` passed even when all days had
  capacity 0 (catastrophic). Split into T7a (exact on clean days),
  T7b (strictly reduced on planned days), T7c (ceiling).

**ISSUE-61** — Dev button duplicated (RESOLVED in this session)
  Status: RESOLVED (M6)
  Root cause: two `_injectDevBtn` IIFEs, one from prior patch, one from
  route patch. Fixed: legacy `_injectDevBtn` removed; only dev mode
  button remains behind `window.__V7_DEV__`.

**ISSUE-62** — `_inputMeta` null after Generate (RESOLVED)
  Status: RESOLVED (M5)
  Root cause: `_onGenerate` returned before setting `_inputMeta` in some
  branches. Fixed: `_inputMeta = r.meta || null` assigned right after
  `_input = r.input` on success path.

**ISSUE-63** — Diag card not shown in result branch (RESOLVED)
  Status: RESOLVED (M6)
  Root cause: `_renderDayDiagHTML()` was only wired in the settings
  branch. Fixed: added call after feasibility render in result branch.

### OPEN (remaining)

**ISSUE-64** — Multiple enrollments per book in same round
  Status: Open (design limit)
  Severity: Low
  Context: `_roundIdForBook` returns first matching enrollment. If a
  book is enrolled twice in same round, only one is visible in
  `input.books`. Pre-M5 behavior; documented for future.
  Next: If multi-enrollment becomes required, add explicit disambiguation
  contract (e.g. enrollment priority field).

**ISSUE-65** — Old activities without plannedPageStart/End
  Status: Open (accepted limitation)
  Severity: Low
  Context: Activities created before M5 lack page range fields. Their
  status === "completed" is not counted as read progress (conservative,
  safe). They still reduce day capacity if plannedDurationMinutes exists.
  Next: Optional one-time migration to populate ranges from task title
  (e.g. "صفحات 21-30"), or manual fix via UI.
---

## Session Update — 2026-10-20 · Agent #20 (M7-B)

### RESOLVED in M7-B

- **BUG-A** — `_renderDayBlocksHTML` allAdded overwrite
- **BUG-J** — Dedup didn't skip cancelled/skipped blocks (T11)
- **ISSUE-57** — Edit validation not wired to save (T13, T14)
- **ISSUE-67** — Edit cascade inconsistent (resolved by simplification)
- **ISSUE-68** — Multi-edit reset (resolved by simple source model)
- **ISSUE-69** — English validation errors
- **ISSUE-70** — Dead "افزودن تکمیل" button
- **ISSUE-71** — Only green-box removal access
- **ISSUE-72** — Only last session editable (resolved)

### OPEN (new)

**ISSUE-73 — Cascade not shown in edit mode** (design decision)
Status: Open (by design)
Severity: Low
Context: Per Design Agent Option 1, edit mode shows only `_draftState.source`.
Cascade visible only in Preview.
Next: Optional "show estimated impact" if UX needs it.

**ISSUE-74 — Draft Preview shows only unallocated pages**
Status: Open (by design)
Severity: Low
Context: If pages already in green-box, preview shows only remaining.
Next: Optional "شامل اضافه‌شده‌ها" toggle.

**ISSUE-75 — state.js modified during manual test**
Status: Open (process note)
Severity: Low
Context: User's Generate+Add changed `data/state.js` SHA256 (expected).
Backup: `data/state.js.bak-m7final-<ts>`.
Next: None.

**ISSUE-76 — Legacy-array suites no `pass` field**
Status: Open (process note)
Severity: Low
Area: `aiNormalizer`, `plannerAllocation`, `dialog`, `loading`, `readingStrategy`, `studySpeed`
Context: 6 suites return raw arrays (30 items, no throw, no `pass`).
Next: Optionally wrap. Non-blocking.

### STILL OPEN (deferred)

- **ISSUE-64** — multi-enrollment per book
- **ISSUE-65** — old activities without plannedPageStart/End
---

## Session Update — 2026-10-21 · Agent #22 · R3 Complete

### RESOLVED in R3

**ISSUE-90** — Demand double-count (planned counted twice)
Status: RESOLVED
Area: `planner-demand-v6.js::computeStudiedPages`
Fix: cross-round completed + plannedPages fallback; planned filtered by round.

**ISSUE-91** — Planned pages re-allocated (page ranges overlap)
Status: RESOLVED
Area: `planner-schedule-v6-4.js::getAllocatedRanges`
Fix: exclude planned/in_progress ranges from remainingRanges.

**ISSUE-92** — Capacity trigger yielded `proposedPages: 0`
Status: RESOLVED
Area: `planner-replan-v7.js`
Fix: recompute demands on `modSnap` after cancellation (F2-A).

**ISSUE-93** — Replan cancelled only 78 of 122 future activities
Status: RESOLVED
Area: `planner-replan-v7.js::_computeCancelIds`
Fix: read live state, not filtered snapshot. Sweep in Apply.

**ISSUE-94** — Duplicate cancelled tasks appeared in projection
Status: RESOLVED
Area: `scheduling-projection-v20.js::projectTask`
Fix: return null for `task.cancelled === true`.

**ISSUE-95** — Orphan tasks after Apply (activity cancelled, task alive)
Status: RESOLVED
Area: `planner-replan-apply-v7.js`
Fix: sweep at Apply — any task whose source activity is cancelled/missing → cancelled.

**ISSUE-96** — Calendar didn't extend past last round endDate (3 Azar)
Status: RESOLVED
Area: `planner-snapshot-v6.js::_buildCalendar` + `planner-allocation-v6-2.js::buildCapacityLedger`
Fix: fill gap to examDate; remove `roundUsable.endDate` filter.

**ISSUE-97** — Sequential allocation not applied (books interleaved)
Status: RESOLVED
Area: `planner-allocation-v6-2.js::_allocateAlgorithmic`
Fix: `options.sequential` — one book per day, chosen by studyOrder.

**ISSUE-98** — Algorithm filled days greedily, ignored maxDays
Status: RESOLVED
Area: `planner-allocation-v6-2.js::_allocateAlgorithmic`
Fix: proportional dayMinBudget = remaining × (dayCap / totalCap).

**ISSUE-99** — `settings.defaultCapacity` ignored in Replan
Status: RESOLVED
Area: `planner-snapshot-v6.js` + `planner-allocation-v6-2.js`
Fix: pass settings; apply with reserve %.

**ISSUE-100** — Strategy window used 30-day hardcoded fallback
Status: RESOLVED
Area: `planner-recovery-v7.js::resolveStrategyWindow`
Fix: fallback to plan.examDate.

**ISSUE-101** — `_getBoundsForReplan` accepted `blocked_by_hard_constraint` as feasible
Status: RESOLVED
Area: `planner-replan-ui-v7.js`
Fix: only accept `feasible` or `feasible_with_warnings`.

**ISSUE-102** — `_addDays`, `_cmp` undefined in Replan files
Status: RESOLVED
Area: `planner-replan-v7.js`, `planner-replan-ui-v7.js`
Fix: local helpers added.

**ISSUE-103** — `openBaselineEditor` and `updateSummary` threw `R is not defined`
Status: RESOLVED
Area: `app.js`
Fix: `var R = window.InternshipResidency;` injected at function start.

### OPEN — CRITICAL

**ISSUE-104** — 11 cancelled residency tasks still render in calendar on 3 Azar
Status: OPEN
Severity: HIGH
Area: `app.js` calendar day-panel renderer
Context: State is clean (`{completed: 2, cancelled: 313}`, `future planned: 0`).
Calendar still shows 11 items for `1405/9/03`. Patch `f5d` added `!t.cancelled`
broadly but did not fix — so data source is NOT `state.tasks`.
Audit: `_audit-calendar/` (app.js, residency-dashboard-v19.js, scheduling-projection-v20.js,
task-projection-v4.js, day-timeline-v20.js).
Next: Agent #23 must audit `app.js` calendar renderer, determine data source,
and apply filter at the correct layer.

### OPEN — LOW

**ISSUE-105** — Replan `isNoop` message still says "کاری برای جبران پیدا نشد"
even for capacity triggers when debt=0 and capacity_rebuild would work.
Status: OPEN
Severity: LOW
Area: `planner-replan-ui-v7.js`
Next: mode-aware message (partially done in F4-C, may need more work).

**ISSUE-106** — Replan bounds calculation triggers many `generateReplanProposal` calls
Status: OPEN
Severity: LOW (performance)
Area: `_getBoundsForReplan`
Context: Binary search over maxDays — runs O(log N) full proposals.
Next: cache or approximate.
---

## Session Update — 2026-10-22 · Agent #24 · R2-H + R2-I Closeout

### RESOLVED

- W-45 — Wizard entry button (🧙) opened Plan Manager instead of Wizard. Fixed via handler rewrite to prefer `openWizard()` with fallback.
- R2H-01 — Today CTA misleading. Fixed with `plan-idle` branch.
- R2H-02 — Program tools ugly. Redesigned as 4-card glassmorphism.
- R2H-03 — Manage inputs center-aligned. Fixed with flex-row + left-align.
- R2H-04 — V7 planner entry missing. Added to Program tools.
- R2H-Bonus — Future Days Preview added.
- 9 test failures in `input.__tests` (8) + `ui.__tests` (1) — root cause: state-dependent tests against live state. Fixed by isolated fixture (ADR-087).

### WAIVED (OWNER DECISION)

- 2 automated Gate 2 tests (focus restoration + aria-live timing after `.click()`). Cause: WebView2 `.click()` focus behavior — not a code bug. Manual keyboard passes.

### OPEN — DEFERRED

- W-43 — utilization > 100% (122%, 244%) in Workspace. **P1, NEEDS INVESTIGATION.** Deferred to Workspace phase.
- ISSUE-76 — `plannerAllocation.__tests` returns raw array. Deferred to Maintenance.
- CSS mass cleanup (158 PATCH blocks, 2945 `!important`). NOT AUTHORIZED.
- Wizard reset-all flow — NOT TESTED. Needs isolated environment.

### NEW — LOW

- ISSUE-107 — Header showed «مرحله X از ۱۱» while STEPS.length=13. RESOLVED via `_fa(_step + 1)` in r2i-int2.
- ISSUE-108 — `_refreshFutureDaysOnly` relied on `document.activeElement` (cleared by WebView2 after DOM swap). RESOLVED via explicit `opts.pickIdx`/`opts.navDir` param.
- ISSUE-109 — Group label display: welcome + summary show group only (no step count). By design, documented.
- ISSUE-110 — `.r19-form-row` container assumption for inline errors failed plan step. RESOLVED via keyword + broad field scan (ADR-086).

### Test Baseline

allocator 43/43 · input 44/44 (fixture) · ui 45/45 (fixture) · schedulingConflict 48/48 · schedulingProjection 37/37 · dayTimeline 12/12 · replanTrigger 43/43 · availabilityEngine 18/18 · baseline 18/18 · plannerReplan 37/37 · plannerReplanApply 16/16 · plannerSchedule 9/9 · plannerAllocation 6/6 (legacy) · **TOTAL 376/376**


---

## Session Update — 2026-10-22 · Agent #25 · R2-I + Workspace

### RESOLVED

ISSUE-111 Wizard CTA renamed to «ساخت برنامه»
ISSUE-112 Wizard step count unified to 13
ISSUE-113 aria-describedby per-field on Plan; wiz-error-box fallback
ISSUE-114 Guard 4/4 PASS, real state preserved
ISSUE-115 Header labels Persian
ISSUE-116 Card actions 2+menu
ISSUE-117 TimeGrid button injected
ISSUE-118 W-43 formula 7/7 fixture PASS
ISSUE-119 Proposal empty-state 3-step
ISSUE-120 Context Inspector Persian via MutationObserver

### OPEN — LOW

ISSUE-121 superseded/active still English in Version History
Status: Open. Severity: Low. Next: add to PROP_LABELS.

ISSUE-122 Proposal 3-step with real proposal NOT TESTED
Status: Open. Severity: Low. Next: Generate + verify.

ISSUE-123 Review tab full Persian with real data NOT TESTED
Status: Open. Severity: Low.

ISSUE-124 W-43 not reproducible with current data
Status: Open (instrumented). Severity: P2 (was P1).

ISSUE-125 workspace-v13.js + .pw13-* CSS dead code confirmed
Status: Open (propose only). Severity: Low.

### Deferred to Agent #26

- superseded/active mapping
- Proposal real-data test
- Review full Persian
- W-43 fixture reproduction
- workspace-v13 removal
- Final Regression + Release