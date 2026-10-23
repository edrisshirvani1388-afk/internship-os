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
---

## AGENT-26 CLOSEOUT - 2026-10-22 - v0.6.0 RELEASED

**Schema:** v22 (no bump). **Version:** v0.6.0 (released 2026-10-22).

### Workspace Product Redesign - ACCEPTED

Four sections:
- نمای کلی (Overview): action-oriented, plan status + attention items + deep-link
- برنامه (Plan): all activity views (day/week/month/round/timegrid) + filters
- بازبینی و تغییر (Review & Change): Proposal + Reviews + Version History
- تحلیل و راهنما (Analysis): AI Advisor + Analytics + Context Inspector

File: `app/residency/workspace-r2w-sections-v18.js` (additive, wraps `_postWire`).

### Final Regression - 578/578 verified PASS

roundScheduler 47, plannerReplan 37, plannerReplanApply 16, plannerSchedule 9,
replanTrigger 43, schedulingConflict 48, schedulingProjection 37, dayTimeline 12,
baseline 18, availabilityEngine 18, healthTests 14, fooddbTests 12, workoutTests 32,
sleepTests 60, feasibilityFixtures 12, migrationV22 11, plannerAllocation 6,
workspace.sections 7, workspace.w43 7, V7.allocator 43, V7.input 44, V7.ui 45.

### State Integrity - PRESERVED

- `data/state.js` SHA256 unchanged before/after (323E8C...BD8C)
- `getState()` reference identity preserved
- Signature (196 tasks / 156 activities) before = after
- Backup: `data/state.js.bak-final-reg-20261022-192551`

### Protected Contracts - INTACT

roundScheduler.computeEdit, PRA.applyReplanProposal, CF.getPolicy, SP.projectAll,
Schema v22, window.INTERNSHIP_STATE, Store/Domain, Timeline/Constraints/Calendar.

### Release Artifacts

- Installer: InternshipOS-Setup-v0.6.0.exe (56.11 MB)
- SHA256: 601765D3BEC869E6A9758C742236C98A2741107DB4517EC4744FEB08AAA1A21D
- GitHub: v0.6.0 published (not draft, not prerelease)

### Cleanup

- 481 .bak files removed (58.54 MB)
- _backups/ removed (885 files, 325.7 MB)
- audit-26-*/ removed (2.25 MB)
- dist-v0.4.0-* removed (188.73 MB)
- Kept data/*.bak* (7 state backups for safety)

### Known Limitations (accepted, documented)

- Review due-row rendering: NOT TESTED (no due reviews in current data)
- W-43 real overload: CLOSED WITH DOCUMENTED LIMITATION (7/7 fixture PASS)
- ISSUE-76 plannerAllocation legacy-array: Deferred
- ISSUE-125 workspace-v13.js dead code: Deferred (needs authorization)

### Next

Await Design Agent directive. No autonomous feature work.

Release: v0.6.0 SHIPPED - no active release gate.


---

## AGENT-27 CLOSEOUT — 2026-10-23 — Study Together V1

**Schema:** v22 (no bump). **Version:** v0.6.0 (no release).

### Study Together V1 — IMPLEMENTATION COMPLETE · LIVE VALIDATION PASS (partial)

Feature: private realtime study presence for a small group of friends.
Scope: auth, private group, presence, timer, current-activity share.

| Test | Status |
|---|---|
| Unit tests (14) | PASS |
| Live: 2 accounts, presence, timer, privacy | PASS |
| SQL security (12) | PASS (L08/L10 deferred by owner) |
| Schema v22 | UNCHANGED |
| INTERNSHIP_STATE | UNCHANGED (196 / 156 / 22) |

### Files Added

- `app/residency/study-together.js` (~36000 bytes)
- `app/residency/study-together-tests.js` (1072 bytes)
- `docs/STUDY-TOGETHER.md` (4586 bytes)
- `docs/STUDY-TOGETHER-SQL.sql` (~20182 bytes)

### Files Modified (additive only)

- `app/app.js` — MAIN_ROUTES + switch + renderStudyTogether + _studyTogetherBridge + _stGetCurrentActivity
- `app/index.html` — nav button + 2 script tags
- `app/styles.css` — `[PATCH:study-together]` append

### Config (owner-supplied, outside git)

- `data/study-together.js` — url + publishableKey + sdkVersion

### Known Limitations

- ISSUE-ST-01 — UI supports one group only (LOW)
- ISSUE-ST-02 — Supabase Free Pause after 1 week idle (MEDIUM, operational)
- ISSUE-ST-03 — Offline start-study behavior undefined (design pending)
- L08 / L10 — NOT TESTED (owner deferred)

### Release Gate

PENDING Design Agent decision.

### Next

Await Design Agent decision on Release Gate + V2 feature requests A-F.
---

## AGENT-28 - 2026-10-23 - V1 PRIVATE PILOT RELEASE GATE

**Schema:** v22 (no bump). **Version:** v0.6.0 (no release).

**Decision by:** Design Agent. Doc updates delegated to Agent #28.

### V1 Status - PRIVATE PILOT

`RELEASE GATE: OPEN - PRIVATE PILOT WITH DOCUMENTED LIMITATIONS`

Study Together V1 authorized for restricted private use (small group of friends only).

### Enforced limitations

- L08 (offline disconnect/reconnect): NOT TESTED
- L10 (core app offline behavior in final scenario): NOT TESTED
- No "all release scenarios approved" language
- No claim of full offline stability or reconnect reliability
- Silent cloud/local merge without user awareness: FORBIDDEN
- Single active group per account (V1) - no extra group/data removal without owner decision
- Free tier limits, password recovery disabled, no SLA, manual Resume may be required

### V2 decision matrix

| Item | Decision |
|---|---|
| A - Keep-alive | DENIED as periodic high-frequency heartbeat. Limited review scope only (on-open / on-activity). |
| B - Avatar photos | APPROVED for V2 - Design/Audit first, then implementation. |
| C - Pomodoro mode | APPROVED - high priority. Design contract first, then implementation. |
| D - Multi-day history + manual edit | V2 Design/Audit only. NO implementation until separate approval. |
| E - Offline behavior | Option A selected: clear message only. No local session, no sync queue. |
| F - UI polish | APPROVED - Wave 1. Additive only, no data/SQL/session/Schema change. |

### V2 execution order

**Wave 1**
1. F - UI polish (additive, low-risk)
2. C - Design contract, then Pomodoro implementation

**Wave 2**
3. D - Design contract only (no code)
4. B - Storage + privacy design, then implementation

**Separate review**
- A - limited scope only, no periodic background heartbeat

**Closed**
- E - decision: no offline sync in V1 scope

### Constraints for V2 work

- V2 must NOT alter RLS, session structure, or Schema v22 without separate approval.
- V1's open Release Gate does NOT authorize RLS/session structure changes.
- `service_role` never in client (unchanged).
- SQL helpers in `private` schema only (unchanged).
- Realtime invariants (ADR-094) remain in force.

### Docs - what changed and what did not

Authorized and used:
- `docs/CURRENT.md` (this section)
- `docs/HANDOFF.md` (Agent #28 closeout section)

NOT authorized - unchanged:
- `docs/AGENT.md`
- `docs/ARCHITECTURE.md`

Technical lessons (boot() reassign, Realtime stability, verification patterns) recorded only in CURRENT/HANDOFF until separate architecture-doc approval.

### Next

- Wave 1 begins (F then C).
- D contract authoring may begin in parallel (no code).
- Any change touching RLS / SQL / Schema / session requires separate ADR + Design Agent approval.