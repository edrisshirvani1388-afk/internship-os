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
## DONE — v0.5.0 / v0.5.1 (2026-10-16 · Agent #16)

Phase U.1 — Git init + .gitignore + first commit
Phase U.2 — GitHub remote + force push + legacy backup branch
Phase U.3 — Release infrastructure:
  - release.iss   (unified Inno Setup template, parameterized)
  - release.ps1   (full build + assemble + installer + sha256 + push + gh release)
  - release.cmd   (double-click wrapper)
Phase U.4 — Backend installer-based update:
  - /api/check-update reads manifest with installerUrl + sha256
  - /api/apply-update downloads, verifies SHA256, silent-installs
  - registry lookup for install dir; fallback to %LOCALAPPDATA%
Phase U.5 — Frontend:
  - app.js sends installerUrl + sha256 to backend
  - data.js updateUrl → releases/latest/download/update.json
Phase U.6 — v0.5.0 released, v0.5.1 released, end-to-end verified.

Test: manual end-to-end (v0.5.0 → v0.5.1) — PASS


## V7 Study Planner — Milestones (2026-10-18)

**Milestone 1 — Capacity Source Fix** DONE
  input-v7 reads settings.defaultCapacity[dayType], explicit zero preserved.

**Milestone 2 — Daily Life Model + Wizard Step** DONE
  dailyLifeSchedule, Wizard step, effective capacity = min(baseCap, windowAvail),
  impact preview, studyHours <-> defaultCapacity sync.

**Milestone 3 — Progress Tracking (baseline ranges)** PENDING
  Activate initialStudyBaseline.ranges[], non-contiguous read ranges,
  allocator accepts remaining ranges, replan from first unread page.

**Milestone 4 — Proportional Allocator (hard cap)** PENDING

**Milestone 5 — Incremental Replan** PENDING

**Milestone 6 — Final Integration** PENDING
  Route R.plannerUI.open to V7, remove legacy scripts, full regression, release.
---

## DONE — V7 Milestone 5 (Incremental Replan) · 2026-10-19 · Agent #19

Scope:
- Progress detection from activity status (completed = read, planned = allocated).
- Dedup key upgraded: `(day, book)` → `(day, book, pageRangeOverlap)`.
- Day capacity reduced by planned minutes; day locked (cap=0) when any activity planned.
- UI: breakdown bars, "why N unused" diag, checkbox select, Add-Selected / Add-All,
  Remove / Remove-All, min/max clamp, Persian dates, ✕ close.

Files: `planner-input-v7.js`, `planner-study-ui-v7.js`.
Tests: allocator 25, input 39 (+6 range helpers), ui 10 = 74.

## DONE — V7 Milestone 6 (Final Integration) · 2026-10-19 · Agent #19

Scope:
- Route switch: `R.plannerUI.open` → V7 (idempotent; legacy at `_legacyOpen`).
- Round-scoped planned exclusion (completed cross-round, planned per-round).
- `_roundIdForBook(s, bookId, planId)` filters by plan.
- Round-propagation post-Generate: `res.blocks[].roundId` from `input.books[].roundId`.
- T7 strengthened: T7a (exact) / T7b (strict) / T7c (ceiling).
- Legacy `_injectDevBtn` removed; only dev mode (`window.__V7_DEV__`).

Tests: allocator 25, input 41, ui 10 = 76/76.
Manual UI tests: 18/18 PASS.
Release: **BLOCKED** pending Design Agent approval.

## NEXT — candidates for Milestone 7 / release

Options (awaiting Design Agent):
1. **Release gate**: run full 244-baseline (18 suites), bump to v0.5.3 or v0.6.0, ship.
2. **Milestone 7 candidates**:
   - Multi-enrollment-per-book disambiguation (ISSUE-64).
   - Migration for old activities (ISSUE-65).
   - V6-5 file removal after stability window.
3. **UI polish**: further refinement of breakdown card, day diag, added-list.

## FROZEN (unchanged)

- `round-scheduler-v22.js`
- `store-v2/v5/v10.js`
- `domain-v2.js`, `domain-v3.js`
- `planner-replan-apply-v7.js`
- `scheduling-conflict-v20.js` RULES
- Schema v22 (no bump)
- `window.INTERNSHIP_STATE` (read-only)
## DONE — M7-B (Residency Planner UX Redesign) · 2026-10-20 · Agent #20

**Phase A:** allAdded fix, dedup skip cancelled, edit validation, Persian errors,
added-section rewrite, native alert → `R.dialog`.

**Phase B (simplified):**
- Draft editor: source-only in edit
- Anchor by `_rtid`
- Zero-page + restore
- Preview: allocator + cascade (read-only)
- Per-day Apply (B9)
- Live cap display
- Complete-book single-click (`prioritizeBookId`)
- Cancel no-op

**Removed:** `_draftComputeEffective`, `_effMap`, `_lbMatch`, `_srcMatched`,
`_draftRunLivePreview`, `_draftScheduleLivePreview`.

**Test baseline:**
- allocator 43/43, input 44/44, ui 45/45
- Regression (23 std) 637/637, legacy (6) 30/30 (noFlag)

## NEXT (candidates for M7-C / v0.6.0+)

**Release gate** [BLOCKED — awaiting Design Agent]
  Before release: full baseline (667), CHANGELOG, VERSION bump, release.ps1.

**M7-C candidates:**
- ISSUE-73: Cascade display in edit mode (optional)
- ISSUE-74: "شامل اضافه‌شده‌ها" toggle in preview
- ISSUE-64: Multi-enrollment disambiguation
- ISSUE-65: Old activities without page ranges
- v6-5 removal after stability window
- Docs: 244-baseline → 667 update
---

## DONE — R3 (Replan Engine Overhaul) · 2026-10-21 · Agent #22

**Scope:** F1 (contract validated) → F2 (demand fix) → F3 (capacity_rebuild) →
F4-A (projection cancelled) → F4-B (per-day UI) → F4-C (labels) → F5 (apply modes).

**Files changed:** 8 backend + 3 UI = 11 files.

**Tests:** ~376/376 (sub-regression).

**Bugs fixed:** 11 (calendar gap, sequential, proportional, settings, orphan sweep, ...).

**Unresolved:** ISSUE-104 — 11 cancelled residency tasks in calendar (`app.js`).

## NEXT — R3 closeout + R2-H + R2-I + Workspace

**R3 closeout:** resolve ISSUE-104, then mark R3 complete.

**R2-H — Visual Polish, Accessibility & Responsive**
- RTL typography
- 500px width
- keyboard navigation
- prefers-reduced-motion
- loading / empty / error / disabled states
- visual consistency
- Progress cards + horizontal card design

**R2-I — Wizard Redesign**
- Group/simplify steps
- Progress indicator
- Final summary before confirm
- Clear Persian validation
- No data reset

**Workspace (last, per Edris)**
- Audit advanced tools
- Align UX with new Residency
- Do NOT change scheduling logic without authorization
- Do NOT remove features

**Final regression + release readiness** — Release BLOCKED until all above done.

**R3 CLOSED** — 2026-10-22 (Agent #22). All tests green. Calendar cleanup verified.

---

## ACTIVE PHASE: R2-H — Visual Polish & Accessibility
**Started:** 2026-10-22
**Status:** H1 (Audit & Design) — awaiting Design Agent approval.

**Scope:**
1. R2-H: Visual Polish, Responsive (500px), Accessibility (A11y).
2. R2-I: Wizard Redesign (Group steps, final summary).
3. Workspace: Align UX, remove English jargon, standardize with new Residency.
4. Final Regression + Release.

**Release:** BLOCKED until all above complete.
---

## DONE — R2-H Gate 1 (Visual Polish) · 2026-10-22 · Agent #24

Scope: R2H-01..05 + Bonus (Future Days) + W-45 fix.
Files: `residency-dashboard-v19.js`, `styles.css`.
Regression: 376/376 PASS (isolated fixture).
Status: CLOSED per Design Agent acceptance.

## DONE — R2-H Gate 2 (Accessibility) · 2026-10-22 · Agent #24

Scope: focus-visible, aria-label, aria-current, aria-live, prefers-reduced-motion.
Files: `residency-dashboard-v19.js`, `styles.css`.
Automated: 16/18 PASS (2 waived — WebView2 test-harness artifact).
Manual keyboard: 6/6 PASS.
Status: CLOSED WITH DOCUMENTED LIMITATIONS.

## DONE — R2-I Integrated Wizard Redesign · 2026-10-22 · Agent #24

Scope (single batch):
- C1: unified ESC/close via R.dialog.confirm, reduced-motion
- Integrated: 5 groups, step count fix, double-submit guard, existing-plan dialog, focus, aria-live, inline errors

Files: `residency-setup-wizard-v19.js`, `styles.css`.
Verification: 12/12 automated PASS, owner confirmed.
Status: CLOSED per Design Agent + owner acceptance.

## NEXT — Agent #25

1. **Workspace Redesign** (deferred, awaiting D-01..D-07)
2. **Final regression** + Release readiness
3. Release: **BLOCKED**

## OPEN — Deferred

- W-43: utilization > 100% (Workspace) — P1, NEEDS INVESTIGATION
- ISSUE-76: plannerAllocation legacy-array — Deferred to Maintenance
- CSS mass cleanup — NOT AUTHORIZED
- Wizard reset-all — NOT TESTED


## DONE — R2-I Finalization + Closeout · 2026-10-22 · Agent #25

Scope: aria-describedby per-field, fallback wiz-error-box, cleanup. Guard 4/4. Header unified to 13 steps. CTA «ساخت برنامه».

Status: CLOSED WITH DOCUMENTED LIMITATIONS

## IN PROGRESS — Workspace R2-W · 2026-10-22 · Agent #25

| Item | Status |
|---|---|
| D-02 Activity card 2+menu | Deployed |
| D-03 KPI bar | Preserved |
| D-04 Header 3-group | Deployed |
| D-06 TimeGrid exposed | Deployed |
| D-07 Round nav | Preserved |
| Persian state/source | 40/40 |
| Proposal empty-state 3-step | Deployed |
| Proposal real-proposal 3-step | Code ready, NOT TESTED |
| Context Inspector Persian | After click |
| Review tab | Empty state only |
| Version History | superseded/active partial |
| W-43 formula | 7/7 fixture |
| W-43 real reproduction | Not reproducible |
| workspace-v13 removal | Out of scope |

Files added: workspace-r2w-polish-v18.js, workspace-r2w-completion-v18.js

Status: PARTIALLY IMPLEMENTED — awaiting Design Agent review

## NEXT — Agent #26

Option A - Workspace Completion:
- Test Proposal 3-step with real proposal
- Test Review tab with real data
- Add superseded/active Persian mappings
- W-43 reproduction with fixture or Round view

Option B - Final Regression + Release Readiness:
- Run ~376 tests
- CHANGELOG + VERSION bump
- release.ps1

Option C - Combined (A then B)

Release: BLOCKED pending Design Agent approval.

## Workspace-specific invariants

- _postWire chain must be wrapped, never replaced
- New polish layers wrap the last wrapper
- data-r2w-* flags prevent double-processing
- MutationObserver on overlay subtree for dynamic content
- No R.store.* mutation from polish layer
- No window.INTERNSHIP_STATE write from polish layer