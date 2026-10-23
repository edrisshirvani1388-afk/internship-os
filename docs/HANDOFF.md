# Session Handoff - Agent #26 -> Agent #27

Date: 2026-10-22
Schema: v22 (no bump). Version: v0.6.0 (released).

## What v0.6.0 shipped

### Workspace Product Redesign - 4 sections

| Section | Content |
|---|---|
| نمای کلی (Overview) | Action-oriented: plan/round/exam + overdue count + pending proposal + triggers + deep-link |
| برنامه (Plan) | All activity views (day/week/month/round/timegrid) + filters + card actions |
| بازبینی و تغییر (Review & Change) | Proposal (before/after, changes, daily, cancelled, impact, versions) + Reviews |
| تحلیل و راهنما (Analysis) | AI Advisor + Analytics + Context Inspector |

File: `app/residency/workspace-r2w-sections-v18.js` (additive, wraps `_postWire`).

### R3 Replan Engine - CLOSED

- `planner-demand-v6.js::computeStudiedPages` - cross-round completed + planned fallback
- `planner-schedule-v6-4.js::getAllocatedRanges` - planned/in_progress excluded from remaining
- `planner-replan-v7.js` - `capacity_rebuild` mode, per-day proposal, Apply All / Apply Selected
- `planner-replan-apply-v7.js` - narrow hard-delete (ADR-081), atomic rollback, orphan sweep
- `scheduling-projection-v20.js::projectTask` - cancelled filter
- 11 bugs fixed

### R2-I Integrated Wizard Redesign - CLOSED WITH LIMITATIONS

- 5 step groups, 13-step header, aria-live, inline errors (keyword matching)
- ESC/close unified via `R.dialog.confirm`
- 12/12 automated PASS + owner confirmation

### R2-H Visual Polish / Accessibility - CLOSED WITH LIMITATIONS

- Today CTA (R2H-01), program tools grid (R2H-02), manage-input alignment (R2H-03), V7 planner entry (R2H-04)
- Future Days Preview (7-day slideshow)
- Focus-visible, aria-label, aria-current, aria-live, prefers-reduced-motion
- 2 automated tests waived (WebView2 .click() artifact; manual keyboard PASS)

## Test baseline (v0.6.0)

578/578 verified PASS - count excludes NOT TESTED and waived.

Key suites:

- roundScheduler 47/47
- plannerReplan 37/37
- plannerReplanApply 16/16
- plannerSchedule 9/9
- replanTrigger 43/43
- schedulingConflict 48/48
- schedulingProjection 37/37
- dayTimeline 12/12
- baseline 18/18
- availabilityEngine 18/18
- healthTests 14/14
- fooddbTests 12/12
- workoutTests 32/32
- sleepTests 60/60
- feasibilityFixtures 12/12
- migrationV22 11/11
- plannerAllocation 6/6 (legacy-array, ISSUE-76)
- workspace.sections 7/7
- workspace.w43 7/7
- V7.allocator 43/43
- V7.input 44/44 (fixture ADR-087)
- V7.ui 45/45 (fixture ADR-087)

## Known limitations (accepted, documented)

| ID | Limitation | Reason |
|---|---|---|
| ISSUE-122 | Proposal real-data (Generate) NOT tested | No state mutation allowed; fixture covers renderer contract |
| ISSUE-123 | Review due-row NOT tested | No due reviews in current data; empty-state verified |
| ISSUE-124 | W-43 real overload not reproducible | Fixture 7/7 PASS; 0 overload in current data |
| ISSUE-76 | plannerAllocation returns legacy array | 6/6 counted as-is |
| ISSUE-125 | workspace-v13.js dead code | Deferred; removal needs authorization |

## Files changed in v0.6.0

Added:
- `app/residency/workspace-r2w-sections-v18.js`

Modified:
- `app/index.html` (+1 script tag)
- `app/styles.css` (`[PATCH:r2w-sections]`)
- `app/residency/workspace-r2w-completion-v18.js` (superseded label)
- `docs/CURRENT.md`, `docs/ROADMAP.md`, `docs/KNOWN_ISSUES.md`, `docs/AGENT.md`
- `docs/ARCHITECTURE.md`, `docs/DECISIONS.md` (ADR-090), `docs/HANDOFF.md`
- `CHANGELOG.md` (0.6.0 + 0.5.0-0.5.2 backfill)
- `VERSION`, `version.json`, `app/data.js`, `update.json`

## Release artifacts

- Installer: `D:\Desktop\.internship-os\InternshipOS-Setup-v0.6.0.exe` (56.11 MB)
- SHA256: 601765D3BEC869E6A9758C742236C98A2741107DB4517EC4744FEB08AAA1A21D
- GitHub: https://github.com/edrisshirvani1388-afk/internship-os/releases/tag/v0.6.0
- Auto-update: enabled (v0.5.1+ users get one-click update)

## Cleanup performed

- 481 `*.bak*` files outside data/ (58.54 MB)
- `_backups/` (885 files, 325.7 MB)
- `audit-26-*/` (3 folders, 2.25 MB)
- `dist-v0.4.0-20261016-002630/` (188.73 MB)
- Total ~575 MB reclaimed
- Kept: `data/*.bak*` (7 state backups)

## For Agent #27

### Environment

- Repo: `D:\Desktop\.internship-os\internship-os`
- Git: main with source sync + v0.6.0 release commit
- Schema v22 (no bump expected)
- Current app version: 0.6.0

### Rules unchanged

- Patch scripts: try/catch + throw (never exit)
- Backup + marker-check before write
- `[Text.UTF8Encoding]::new($false)` for read and write
- Persian in JS strings via `\uXXXX`
- No triple-backtick inside here-strings
- `node --check` with explicit `$LASTEXITCODE` check

### Invariants (frozen)

- Schema v22, migration chain
- `window.INTERNSHIP_STATE` (read-only)
- Store / Domain signatures
- `round-scheduler-v22.js`
- `planner-replan-apply-v7.js`
- `scheduling-conflict-v20.js` RULES
- Timeline / Constraints / Calendar
- `_postWire` chain order (10 layers)
- ADR-081 hard-delete gate (5 conditions)

### Pending decisions (require Design Agent approval)

- Legacy cleanup: `workspace-v13.js` + `.pw13-*`
- CSS mass cleanup / `styles.css` split
- Next product phase scope

### Recommended first actions

1. Await Design Agent directive - no autonomous feature work
2. If addressing NOT TESTED: fixture-only (no real-state mutation)
3. Verify auto-update path once on a spare machine (v0.5.1 -> v0.6.0)

## Roadmap status

| Phase | Status |
|---|---|
| R3 - Replan | CLOSED |
| R2-H - Polish/Accessibility | CLOSED WITH DOCUMENTED LIMITATIONS |
| R2-I - Wizard Redesign | CLOSED WITH DOCUMENTED LIMITATIONS |
| Workspace Product Redesign | ACCEPTED |
| Final Regression | ACCEPTED WITH DOCUMENTED LIMITATIONS |
| Release v0.6.0 | RELEASED |
| Next phase | Awaiting directive |

---

## For Agent #28

### Environment

- Repo: `D:\Desktop\.internship-os\internship-os`
- Schema: v22 (no bump)
- Version: v0.6.0
- Study Together config: `data/study-together.js` (owner-supplied, outside git)

### Current status

**Study Together V1:** IMPLEMENTATION COMPLETE · LIVE VALIDATION PASS (partial) · RELEASE GATE PENDING

- L08 (offline start) and L10 (offline core) — owner deferred to future
- Design Agent needs to decide: open/close Release Gate + V2 requests A-F

### What was shipped this session

- Study Together V1 — private realtime study presence (external module, Supabase backend)
- 14 unit tests, 12 SQL security tests, live validation with 2 accounts

### Critical invariants for Agent #28

- `window.__os` is REASSIGNED in boot() — bridges must merge or poll
- Realtime: heartbeat 30s, closure capture, exponential backoff
- `share_*` flags enforced by RLS on `study_sessions`, not UI
- SQL helpers in `private` schema only (SECURITY DEFINER + SET search_path = '')
- `service_role` never in client
- Study Together SQL is validated; do not modify without live retest
- Core `state.*` never touched by this feature

### Pending Design Agent requests (from owner)

A. Keep-alive heartbeat — prevent Free tier Pause — medium priority, low complexity
B. Avatar photos (Supabase Storage) — medium/ medium
C. Pomodoro mode — high/ medium
D. Multi-day history + manual edit — high/ medium
E. Offline start-study behavior (A/B/C options) — medium/ low-medium
F. UI polish (cards, avatar, buttons, copy-code) — high/ low

### Recommended first actions

1. Wait for Design Agent decision on Release Gate + requests A-F
2. Read docs (order at top of AGENT-28-PROMPT.md)
3. Verify `data/study-together.js` exists in owner's environment
4. No autonomous feature work

### Files to read first (order)

1. `docs/AGENT.md` (Session Update · Agent #27)
2. `docs/AGENT-28-PROMPT.md`
3. `docs/CURRENT.md` (AGENT-27 CLOSEOUT)
4. `docs/HANDOFF.md` (this file)
5. `docs/DECISIONS.md` (ADR-091..094)
6. `docs/ARCHITECTURE.md` (Study Together V1 section)
7. `docs/KNOWN_ISSUES.md` (ISSUE-ST-01..03)
8. `docs/STUDY-TOGETHER.md` (setup guide)
9. `docs/STUDY-TOGETHER-SQL.sql`
10. `app/residency/study-together.js`
11. `docs/POWERSHELL-GUIDE.md`

### Roadmap status

| Phase | Status |
|---|---|
| R3 - Replan | CLOSED |
| R2-H - Polish | CLOSED WITH LIMITATIONS |
| R2-I - Wizard | CLOSED WITH LIMITATIONS |
| Workspace Redesign | ACCEPTED |
| Final Regression | ACCEPTED WITH LIMITATIONS |
| Release v0.6.0 | RELEASED |
| Study Together V1 | IMPLEMENTATION COMPLETE · LIVE VALIDATION PASS (partial) · RELEASE GATE PENDING |
| Next phase | Await Design Agent |
---

## AGENT-28 CLOSEOUT - 2026-10-23 - V1 Private Pilot + V2 Authorization

**Schema:** v22 (no bump). **Version:** v0.6.0 (no release).

**Authority:** Design Agent decision delegated V1 release gate + V2 scope to Agent #28 for doc updates only.

### V1 - PRIVATE PILOT (OPEN)

Status: `RELEASE GATE: OPEN - PRIVATE PILOT WITH DOCUMENTED LIMITATIONS`

- Authorized: small private group use only
- L08 / L10: NOT TESTED (owner deferred)
- No "all scenarios approved" language
- Connection state must be clearly visible on failure / pause
- No silent cloud/local merge
- Single active group (V1)
- Free tier / no password recovery / no SLA / manual Resume documented

### V2 - Authorized waves

| Wave | Item | Type |
|---|---|---|
| 1 | F (UI polish) | Implement now |
| 1 | C (Pomodoro) | Design contract first, then implement |
| 2 | D (history + edit) | Design/audit only - no code |
| 2 | B (avatar) | Design/audit, then implement |
| - | A (keep-alive) | Limited review only, no periodic heartbeat |
| - | E (offline) | Decision: Option A (clear message, no local session) |

### V2 constraints

- V2 must NOT modify: RLS, session structure, Schema v22, or state shape - without separate ADR + Design Agent approval.
- V1's open Release Gate is NOT blanket authorization for infra changes.
- ADR-091..094 invariants remain in force.
- Realtime stability (ADR-094): 30s heartbeat cap, closure capture per channel, backoff 3-6-12-24-30, setAuth only on token change, joined-state gate.

### Docs state

Authorized changes (this session):
- `docs/CURRENT.md` - new AGENT-28 section
- `docs/HANDOFF.md` - this section

NOT authorized (unchanged):
- `docs/AGENT.md`
- `docs/ARCHITECTURE.md`

### Recommended first actions for next agent

1. Read AGENT-28 sections in CURRENT.md and HANDOFF.md.
2. Begin Wave 1: F (UI polish) - additive only.
3. C (Pomodoro): produce Design contract FIRST, wait approval, then implement.
4. D: design/audit only, NO code changes.
5. A: do not implement periodic heartbeat.
6. Any infra change (RLS / SQL / Schema / session) - stop, request Design Agent approval.

### Roadmap status

| Phase | Status |
|---|---|
| R3 - Replan | CLOSED |
| R2-H - Polish | CLOSED WITH LIMITATIONS |
| R2-I - Wizard | CLOSED WITH LIMITATIONS |
| Workspace Redesign | ACCEPTED |
| Final Regression | ACCEPTED WITH LIMITATIONS |
| Release v0.6.0 | RELEASED |
| Study Together V1 | PRIVATE PILOT - RELEASE GATE OPEN (documented limitations) |
| Study Together V2 | AUTHORIZED - Wave 1 (F, C) |
| Next phase | Wave 1 execution |