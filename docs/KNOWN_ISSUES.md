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