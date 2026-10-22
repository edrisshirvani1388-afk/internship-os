# Current Project State

Last Updated: 2026-10-21 (Agent #22 — R3 complete: F1-F5)
Schema: v22 (no bump). Version: v0.5.2 (no release).

## V7 Study Planner

| File | Role | Tests |
|---|---|---|
| planner-allocator-v7.js | pure sequential allocator | 43/43 |
| planner-input-v7.js | state → allocator input | 44/44 |
| planner-study-ui-v7.js | Draft editor + UI | 45/45 |

## Replan Engine V7.5

| Suite | Tests |
|---|---|
| plannerReplan | 37/37 |
| plannerReplanApply | 16/16 |
| plannerSchedule | 9/9 |
| plannerAllocation | 6/6 (legacy) |
| replanTrigger | 43/43 |

## Other Suites

| Suite | Tests |
|---|---|
| schedulingConflict | 48/48 |
| schedulingProjection | 37/37 |
| dayTimeline | 12/12 |
| baseline | 18/18 |
| availabilityEngine | 18/18 |

**TOTAL: ~376/376.**

## R3 — COMPLETE (F1 to F5)

### F1 — Contract validated

`buildCapacityLedger` uses only `finalCapacityMinutes` + `committedByDate`.
No production change. Tests T21–T24.

### F2 — Demand double-count fixed

- `planner-demand-v6.js::computeStudiedPages`: cross-round completed + plannedPages fallback
- `planner-schedule-v6-4.js::getAlreadyReadRanges`: same
- `planner-schedule-v6-4.js::getAllocatedRanges`: new — excludes planned from remaining
- Demands recomputed on `modSnap` after cancellation
- Tests T25–T29

### F3 — `capacity_rebuild` mode

Cancels only future planned. Preserves in_progress, completed, locked, past, partial.
`full_replan` unchanged. Tests T30–T37.

### F4-A — Projection filter

`projectTask` returns null when `task.cancelled === true`. Tests F4A-1 to F4A-5.

### F4-B — Per-day proposal UI

Cards per day with checkbox, day-type header, capacity, before/after diff, read-progress panel.

### F4-C — Persian labels

Mode, strategy, reserve labels rewritten. See ADR-078.

### F5 — Apply modes + manual button

- Apply All: cancels ALL future planned (even outside window)
- Apply Selected: only those in selected dates
- Manual «برنامه‌ریزی مجدد» button in Program tab
- Orphan task sweep in Apply
- Default mode = `capacity_rebuild` when opened manually

## Bugs fixed in R3 (11 items)

B1 `_addDays` — B2 `_cmp` — B3 sequential — B4 proportional — B5 calendar gap —
B6 round endDate filter — B7 settings capacity — B8 window fallback —
B9 bounds feasibility — B10 calendar cancelled — B11 orphan sweep

## CRITICAL — Unresolved

**11 residency tasks on 3 Azar** still show in calendar (`app.js`).
State is clean. Audit in `_audit-calendar/`. See AGENT-23-PROMPT §6.

**R3 is FULLY COMPLETE. All bugs resolved. State cleaned.**

## Next

1. Resolve 3-Azar bug
2. R2-H — Visual polish, a11y, responsive
3. R2-I — Wizard redesign
4. Workspace (last)
5. Final regression + release readiness

Release still BLOCKED.

## R2-H — IN PROGRESS
Visual Polish, Accessibility & Responsive.

---

## UPDATE: 2026-10-22 (Agent #24 Handoff Prep)

**R3 Status:** CLOSED ✅
- T27 (cross-round dedup) fixed.
- Hard-delete (ADR-081) documented and scope-verified.
- Full regression: 376/376 PASS (isolated fixtures).

**Current Phase:** R2-H (Visual Polish, Accessibility & Responsive).
**Sub-Phase:** H1 (Visual Audit & Design).
**Rule:** No UI patches allowed until Design Agent approves H1.

**Known UI Issues (User-reported):**
- R2H-01: Today empty state CTA is misleading.
- R2H-02: Program advanced tools are ugly.
- R2H-03: Manage study hours inputs are center-aligned.
- R2H-04: No V7 planner button when no plan exists.
- R2H-05: Workspace is messy and full of English terms.
---

## AGENT-25 CLOSEOUT — 2026-10-22

**Schema:** v22. **Version:** v0.5.2 (no release).

### R2-I — CLOSED WITH DOCUMENTED LIMITATIONS

Guard 4/4 PASS. Header "مرحله X از ۱۳" all steps. CTA "ساخت برنامه".
Per-field aria-describedby on Plan; fallback wiz-error-box.

### Workspace R2-W — PARTIALLY IMPLEMENTED

| Item | Status |
|---|---|
| D-02 card menu | 40/40 |
| D-04 header 3-group | yes |
| D-06 TimeGrid | 72 slots |
| Persian state/source | 40/40 |
| Proposal empty-state 3-step | yes |
| Proposal real-proposal 3-step | NOT TESTED |
| Context Inspector Persian | after click |
| Review tab | empty state only |
| Version History | superseded/active partial |
| W-43 formula | 7/7 fixture PASS |
| W-43 real reproduction | not with current data |

### Files Added

- app/residency/workspace-r2w-polish-v18.js
- app/residency/workspace-r2w-completion-v18.js
- app/styles.css: 2 PATCH blocks
- app/index.html: 2 script tags after workspace-round-nav-v18.js

### Next

1. Workspace completion (Proposal/Review real-data, superseded mapping)
2. Final Regression + Release readiness
3. Release BLOCKED

---

## AGENT-24 CLOSEOUT — 2026-10-22

**Schema:** v22 (no bump). **Version:** v0.5.2 (no release).
**Session scope:** R2-H (Gate 1+2) CLOSED + R2-I (Wizard Redesign) CLOSED.

### R2-H / Gate 1 — CLOSED

Owner-directed 5 UI fixes + bonus feature + 1 bug:

| ID | Issue | Patch | Verified |
|---|---|---|---|
| R2H-01 | Today CTA misleading | r2h1 | Owner |
| R2H-02 | Program tools ugly | r2h1+r2h4 | Owner |
| R2H-03 | Manage input alignment | r2h3-r2h7 | Owner |
| R2H-04 | V7 planner entry | r2h1 | Owner |
| R2H-Bonus | Future Days Preview | r2h4-r2h7 | Owner |
| W-45 | Wizard entry bug | r2h8 | Owner |

Baseline captured (`audit-trail/phase-a-baseline-*`).
Isolated fixture: `input.__tests` 44/44, `ui.__tests` 45/45, state PRESERVED.
Regression: 376/376 PASS.

### R2-H / Gate 2 — CLOSED WITH DOCUMENTED LIMITATIONS

Accessibility patches (r2h9, r2h10, r2h11): `:focus-visible`, `aria-label`, `aria-current`, `aria-live="polite"`, `prefers-reduced-motion`.

**Waived by owner:** 2 automated tests (WebView2 `.click()` does not preserve focus → test-harness artifact). Manual keyboard works per owner.

### R2-I — Wizard Redesign — CLOSED

Integrated batch (single authorization):
- **C1** (r2i-c1): ESC/close unified via `R.dialog.confirm`, `_closing` guard, capture-phase handler, reduced-motion CSS
- **Integrated** (r2i-int, r2i-int2, r2i-int3): 5 groups, step count «مرحله X از ۱۳ · گروه Y از ۵: ...», double-submit guard, existing-plan confirmation dialog, focus management, `aria-live` step announce, inline error via keyword matching, off-by-one fixed

Verification: 12/12 automated PASS, inline error marking PASS, owner confirmed functional.

### Files Modified

- `app/residency/residency-dashboard-v19.js` (r2h1, r2h3-r2h7, r2h8, r2h10, r2h11)
- `app/styles.css` (r2h1, r2h3-r2h7, r2h9-accessibility, r2i-c1, r2i-int)
- `app/residency/residency-setup-wizard-v19.js` (r2i-c1, r2i-int, r2i-int2, r2i-int3)

All backups preserved under `.bak-*` per patch.

### Frozen Contracts — VERIFIED INTACT

Schema v22 · `round-scheduler-v22.js` · `planner-replan-apply-v7.js` · `scheduling-conflict-v20.js` RULES · `window.INTERNSHIP_STATE` (read-only) · `R.store.*` · `STEPS` (13) · `_draft` · Migration chain

### NEXT — Agent #25

1. Workspace Redesign (deferred, awaiting Design Agent D-01..D-07)
2. Or Final Regression + Release readiness
3. Release: **BLOCKED**
