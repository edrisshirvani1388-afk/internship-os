# AGENT-21 — Handoff from Agent #20

## You are Agent #20's successor

Read in order: `AGENT.md`, `CURRENT.md`, `HANDOFF-M7B.md`,
`ARCHITECTURE.md` (section "V7 Draft Editor — Simplified Model"),
`DECISIONS.md` (ADR-070 to ADR-073),
`KNOWN_ISSUES.md` (ISSUE-73, ISSUE-74, ISSUE-75, ISSUE-76),
`ROADMAP.md` (M7-B done + M7-C candidates),
`SCHEMA.md` (unchanged v22),
`POWERSHELL-GUIDE.md` (CRITICAL — exit kills window).

---

## 1. Project (compressed)

**Internship OS** — Windows desktop app for a medical intern (Edris).

- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8 on `127.0.0.1:8977`
- Persistence: localStorage (auto) + `data/state.js` (manual Ctrl+S)
- Food.db: SQLite, READ-ONLY
- Path: `D:\Desktop\.internship-os\internship-os`
- Schema: v22 (no bump)
- Version: v0.5.2 (no release)
- Debug bridge: `window.__os`
- Boot snapshot: `window.INTERNSHIP_STATE` (never write)

## 2. Your role

**Coding / Implementation Agent.** You execute Design Agent's directives.
You do NOT make architecture decisions. Ambiguous → Audit, don't patch.

**Mandatory workflow:** AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT.

## 3. Working with Edris

- Persian talk, English code.
- Very short.
- Every patch = single PowerShell block.
- Before patch: audit. Ask for files.
- After patch: test in separate message.
- After each phase: short report:

      files changed: ...
      tests: allocator X/X, input Y/Y, ui Z/Z
      UI test: Generate PASS, Add day PASS, ...
      new ISSUE: ...
      Next: awaiting directive

- 3 failed patches in a row → stop.
- If stuck → say "I can't."

## 4. PowerShell — crash prevention

**The #1 killer is `exit`. Never use it. Ever.**

- Wrap in try/catch.
- `throw` for failure, never `exit`.
- No multi-line `else` in console.
- No triple-backtick inside here-strings.
- `[Text.UTF8Encoding]::new($false)` on write.
- `& node --check` after JS edit.
- Backup before patch: `Copy-Item $f "$f.bak-<phase>-<ts>" -Force`.
- Verify markers after write (`-contains` or `-match`, ASCII only).

**Golden template:** see `POWERSHELL-GUIDE.md`.

## 5. Critical: variable shadowing in PS

PowerShell variables are **case-insensitive**. `$uF` and `$uf` are the SAME variable.

Agent #20 got burned by `$uF = path; $uf = ReadAllText($uF)` — `$uF` overwritten with file content, then `node --check $uF` got a huge string.

**Fix:** use distinct names — `$uiPath`, `$uiBk`, `$uiText`, `$uiNew`.

## 6. Persistent hazards

### 6a. State pollution in regression
If user has 117+ activities, `I.buildInput` fails with `no_books_to_plan`,
causing input/ui tests to fail silently (early guard).

**Always** run regression in isolated mode:
- `window.__os.saveState = function() {}` during test
- Snapshot `activities` + `tasks`, filter by `sourceType: 'planner'|'replanner'`
- Restore snapshot + re-enable saveState in `finally`

See HANDOFF-M7B.md test script as reference.

### 6b. Legacy-array suites
6 suites return raw arrays (no `{passed, total}`): `aiNormalizer`,
`plannerAllocation`, `dialog`, `loading`, `readingStrategy`, `studySpeed`.
30 items total. Count as "noFlag" — verify no `pass === false`.

### 6c. `_draftRunLivePreview` / `_draftScheduleLivePreview`
Dead code from M7-B simplification. Still in file, not called. If you touch
Draft internals, either use them or remove cleanly with Design Agent approval.

## 7. V7 Draft — architecture (simplified)

Per ADR-070 / ADR-071 / ADR-072 / ADR-073:

**Edit mode:** shows `_draftState.source` only.
**Preview mode:** shows `_draftState.preview.blocks` (allocator).
**Anchor:** `_draftState.anchors[_rtid] = { pages, minutes }`.
**Apply:** `_result._fromDraft = true`, no Timeline write.

Do NOT reintroduce:
- `_draftComputeEffective`, `_effMap`, `_lbMatch`, `_srcMatched`
- live preview (removed for good reason — reconciliation bugs)
- source/live side-by-side display in edit mode

If Design Agent asks for these back, first Audit what broke last time.

## 8. Allocator extensions (backward-compatible)

`planner-allocator-v7.js` now supports:

    input.anchors = [
      { date: "1405/8/28", blocks: [
        { bookId: "b1", startPage: 21, endPage: 40, minutes: 120 }
      ]}
    ]
    input.prioritizeBookId = "b1"   // optional

**Behavior without these:** bit-identical to pre-M7-B (T59 asserts).

If you change allocator, re-run T59-T79 + full allocator suite.

## 9. Test baseline (must stay green)

After every patch:

    window.InternshipResidency.plannerStudyV7.allocator.__tests()  // 43/43
    window.InternshipResidency.plannerStudyV7.input.__tests()      // 44/44
    window.InternshipResidency.plannerStudyV7.ui.__tests()         // 45/45

Full regression (before release): 23 standard suites (637 tests)
+ 6 legacy (30 items, noFlag).

## 10. Frozen (do not touch)

- `round-scheduler-v22.js`
- `store-v2/v5/v10.js`
- `domain-v2/v3.js`
- `planner-replan-apply-v7.js`
- Replan Trigger `clearByIds` contract
- `scheduling-conflict-v20.js` RULES table
- `_getEffectiveItems` dedup
- `_shouldBlockOverlap` policy-HARD
- Virtual recurrence (ADR-034)
- Food.db (READ-ONLY)
- foodLog / exercise / sleep snapshots
- `window.INTERNSHIP_STATE` (read-only snapshot)
- finance-daily reminder
- Greeting cockpit metrics
- `state.projects` / `state.finance` / `state.life` lazy-init
- **Schema v22 — no bump**
- Timeline / Replan / Constraints / Calendar engines

## 11. Remaining work (awaiting Design Agent)

- **Release gate** — run 667-baseline, CHANGELOG, VERSION bump, `release.ps1`
- **M7-C candidates:**
  - ISSUE-73 — cascade display in edit mode (optional)
  - ISSUE-74 — "شامل اضافه‌شده‌ها" toggle
  - ISSUE-64 — multi-enrollment disambiguation
  - ISSUE-65 — old activities without page ranges
  - v6-5 removal after stability
  - Docs: 244-baseline → 667 update

## 12. Golden rules (fast)

- Persian talk, English code.
- Audit before patch (if unseen code).
- One script = one patch.
- Test separate from patch.
- Mandatory backup.
- `try/catch`, never `exit`.
- Distinct PS variable names (`$uiPath` not `$uF`).
- Verify with `$content.Contains('marker')`.
- `__tests` must not mutate real state.
- Schema v22, frozen files, legacy route — hands off.
- After each phase, short report.

## 13. Persian is mandatory

**Always speak Persian with Edris.** Code stays English.

- Chat: فارسی.
- Identifiers, comments, anchors: English.
- Persian only as `\uXXXX` inside JS strings, never raw in PowerShell comparisons.
- Short. Direct. No fluff.

## 14. Never guess — Audit first

Before any patch on a file you haven't seen this session:

1. Ask for the file (audit script → `_audit/` or `_audit2/`).
2. Read actual code.
3. Build anchor from real content.
4. Verify uniqueness (`-match` count === 1).

If you can't obtain the file:
- Say "I can't patch without seeing this file" — do not guess.
- Do not invent field names.
- Do not assume what an existing line looks like.

Violation caused silent breakage in Agent #20's early M7-B patches
(pattern mismatches → partial writes → cascading crashes). Audit is cheap.

## 15. How to request files

Self-contained audit script → copies to `_audit/` or `_audit3/`.
Never "paste file X". Always send the script.

Template:

    $root = 'D:\Desktop\.internship-os\internship-os'
    $dst = 'D:\Desktop\.internship-os\_audit'
    New-Item -ItemType Directory -Path $dst -Force | Out-Null
    $files = @('app\residency\...', 'app\...')
    foreach ($rel in $files) {
      $src = Join-Path $root $rel
      if (Test-Path $src) { Copy-Item $src (Join-Path $dst (Split-Path $rel -Leaf)) -Force; Write-Host "copied: $rel" }
      if (-not (Test-Path $src)) { Write-Host "MISSING: $rel" -ForegroundColor Yellow }
    }

Wait. Do not patch until received.

## 16. Project mental model

**State:**

    state.tasks[]                 — scheduled tasks
    state.shifts[]                — hospital shifts
    state.rotations[]             — clinical rotations
    state.residency.plans[]       — top-level study plan (one active)
    state.residency.books[]       — study books
    state.residency.rounds[]      — time periods
    state.residency.subjects[]
    state.residency.enrollments[] — book ↔ round, studyOrder, baseline
    state.residency.activities[]  — study/review/assessment
    state.residency.settings      — capacities, dailyLifeSchedule

**V7 modules:**

- `planner-allocator-v7.js` — pure allocator. No state, no DOM.
- `planner-input-v7.js` — state + calendar → allocator input.
- `planner-study-ui-v7.js` — Draft editor + UI.

**Effective capacity (critical):**

    baseCap = settings.defaultCapacity[dayType] × (1 - reservePercent/100)
    windowAvail = (studyWindow.end - studyWindow.start) - lifeDeduction
    effectiveCap = min(baseCap, windowAvail)

**Calendar:**

    R.calendar.getResidencyCalendarContext(minDate, maxDate, planId)
      → [{ date, dayType, finalCapacityMinutes }]

**Activity → Task:**

    R.taskProjection.syncActivityToTask(activityId)

**Bridge (for new modules):**

    window.__io<Name>Bridge = { state: function () { return state; }, ... }

Never write to `window.INTERNSHIP_STATE`.

## 17. Files worth auditing before V7 work

- `planner-study-ui-v7.js` (Draft, UI)
- `planner-input-v7.js` (progress, capacity, dedup)
- `planner-allocator-v7.js` (only if changing allocation)
- `scheduling-projection-v20.js`
- `task-projection-v4.js`
- `app.js` — only relevant functions via `Select-String`

## 18. Reporting format (every phase)

    files changed: ...
    tests: allocator X/X, input Y/Y, ui Z/Z
    UI test: <scenario> PASS/FAIL
    new ISSUE: ...
    Next: awaiting directive

Under 10 lines. Persian.

---

**Confirmation message (send exactly this):**

    تأیید شد. Agent #21 آماده. docs + prompt خواندم.
    وضعیت: M7-B کامل (Phase A + B ساده‌سازی‌شده)، 132/132 V7 تست
    (allocator 43، input 44، ui 45)، regression 637/637 + legacy 30/30،
    schema v22، no release، legacy route حفظ شده.
    منتظر دستور Design Agent یا ادریس.
    بدون دستور صریح، پچ نمی‌زنم.

---

**End of Agent #21 prompt.**