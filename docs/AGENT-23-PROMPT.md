# AGENT-23 — Handoff from Agent #22

## You are Agent #23 — successor to Agent #22

**Reading order:** `AGENT.md` → `CURRENT.md` → `AGENT-23-PROMPT.md` (this) → `ARCHITECTURE.md` → `DECISIONS.md` (ADR-074 to ADR-080) → `KNOWN_ISSUES.md` → `ROADMAP.md` → `SCHEMA.md` → `POWERSHELL-GUIDE.md`.

## 1. Project (compressed)

**Internship OS** — Windows desktop app for a medical intern (Edris).

- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8 on `127.0.0.1:8977`
- Path: `D:\Desktop\.internship-os\internship-os`
- Schema: **v22 (unchanged)**
- Version: **v0.5.2 (no release)**
- Persistence: localStorage + `data/state.js`

## 2. Your role

**Coding / Implementation Agent.** Execute Design Agent directives. Ambiguous → Audit, don't patch.

**Workflow:** AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT

## 3. Session R3 — COMPLETE (Agent #22)

### F1 — Contract validated (no production changes)

- Audit proved `buildCapacityLedger` uses only `finalCapacityMinutes` + `committedByDate` (correct)
- `_applyCancellationsToSnapshot` already removes cancelled from `modSnap.activities`
- Added tests T21–T24 in `planner-replan-v7.js`

### F2 — Demand double-count fixed

- **F2-A** (`planner-demand-v6.js::computeStudiedPages`): completed/read vs planned/unread separated; planned filtered by round
- **F2-B** (`planner-schedule-v6-4.js::getAlreadyReadRanges`): cross-round completed included; `plannedPageStart` fallback when `actualPageRanges` empty
- **F2-C** (`planner-schedule-v6-4.js::getAllocatedRanges`): new — excludes planned ranges from remainingRanges
- Demands recomputed on `modSnap` after cancellation
- Tests T25–T29

### F3 — `capacity_rebuild` mode

- New mode in `_computeCancelIds`: cancels ONLY future planned (preserves in_progress, completed, locked, past, partial)
- `full_replan` preserved (planned+in_progress+partial future)
- UI mode chip added
- Tests T30–T37

### F4-A — Cancelled tasks hidden from projection

- `scheduling-projection-v20.js::projectTask`: `if (task.cancelled === true) return null;`
- Tests F4A-1 to F4A-5

### F4-B — Per-day proposal UI

- `_renderProposalDays`: per-day cards + checkboxes
- `_proposalSelection` state per date
- Apply Selected vs Apply All
- Before/after diff (cancelled in "before" strikethrough, preserved in "after" with lock icon, new in "after" green)
- Read progress panel (baseline + completed)
- Day-type headers (عادی/کشیك/تعطیل) with capacity from user settings
- Section summary strip

### F4-C — Persian labels

- Modes: «جبران عقب‌ماندگی», «بازسازی بخش‌های تحت‌تأثیر», «تنظیم برنامه بر اساس ظرفیت جدید», «برنامه‌ریزی کامل از نو»
- «بافر امنیتی» → «ساعت ذخیره»
- «استراتژی» → «زمان‌بندی جبران»

### F5 — Apply All sweep + manual Replan button

- `_onApply(applyAll)`: Apply All cancels ALL future planned (even outside window); Apply Selected only those in selected dates
- Manual «برنامه‌ریزی مجدد» button in Program tab
- Default mode = `capacity_rebuild` when opened manually
- Orphan task sweep in `planner-replan-apply-v7.js`: any task whose `sourceId` points to cancelled/missing activity → `cancelled = true`

## 4. Critical bugs fixed in R3

- **B1** — `_addDays` not defined in `planner-replan-v7.js` — added helper
- **B2** — `_cmp` not defined in `planner-replan-ui-v7.js` — added local helper
- **B3** — Sequential allocation not applied — added `options.sequential` to `_allocateAlgorithmic`
- **B4** — Proportional allocation — `dayMinBudget = totalRemainingMin × (dayCapacity / remainingCapacityMinutes)`
- **B5** — Calendar ended at last round endDate not examDate — extended `_buildCalendar` gap
- **B6** — `roundUsable.endDate` filter blocked gap days — removed in `buildCapacityLedger` (the KEY fix)
- **B7** — `settings.defaultCapacity` not applied in Replan — passed from snapshot
- **B8** — Strategy window hardcoded 30-day fallback — now falls back to examDate
- **B9** — `_getBoundsForReplan` accepted `blocked_by_hard_constraint` as feasible — fixed
- **B10** — Cancelled tasks remained in calendar (app.js) — patched but **NOT FULLY SOLVED** (see §6)
- **B11** — Orphan tasks after Apply — added sweep in Apply

## 5. Test baseline

| Suite | Count |
|---|---|
| allocator | 43 |
| input | 44 |
| ui | 45 |
| schedulingConflict | 48 |
| schedulingProjection | 37 |
| dayTimeline | 12 |
| replanTrigger | 43 |
| plannerReplan | 37 |
| plannerReplanApply | 16 |
| plannerSchedule | 9 |
| plannerAllocation | 6 (legacy) |
| baseline | 18 |
| availabilityEngine | 18 |
| **TOTAL** | **~376** |

## 6. CRITICAL — outstanding bug (unresolved)

### The "11 residency tasks on 3 Azar in calendar" bug

After full state cleanup:
- `activities: {completed: 2, cancelled: 313}` — clean
- `future planned: 0` — clean
- `active residency tasks: 2` — clean
- BUT: Calendar (`app.js`) STILL shows 11 items on 3 Azar

**Audit was run** — files copied to `D:\Desktop\.internship-os\_audit-calendar\`:
- `app.js`
- `residency-dashboard-v19.js`
- `scheduling-projection-v20.js`
- `task-projection-v4.js`
- `day-timeline-v20.js`

**Console test also run for date `1405/9/03` — user needs to provide output.**

**Likely cause:** `app.js` calendar renderer does NOT use `schedulingProjection.projectDate` OR doesn't check `cancelled` on residency activities. The last patch (`f5d`) added `!t.cancelled` broadly but didn't solve it — so the data source is NOT `state.tasks`. Probably reads `state.residency.activities` directly with its own filter.

**Agent #23 action:**
1. Read `_audit-calendar/app.js` — locate calendar day panel renderer
2. Determine data source (`state.tasks` vs `state.residency.activities` vs `projectDate`)
3. Identify where the 11 items come from
4. Apply filter at the correct layer

**R3 is NOT complete until this is resolved.**

## 7. What's next (per Design Agent roadmap)

### R2-H — Visual Polish, Accessibility & Responsive

- RTL typography
- 500px width, prevent overflow
- keyboard navigation, focus-visible
- `prefers-reduced-motion`
- loading / empty / error / disabled states
- visual consistency, remove duplication
- Progress cards + horizontal card design
- No rewriting healthy sections

### R2-I — Wizard Redesign

- Audit 13-step wizard
- Group and simplify steps
- Progress indicator + final summary before confirm
- Clear validation with Persian messages
- Preserve all essential features
- No unwanted overwrite of existing plan
- No data reset

### Workspace (last, per Edris)

- Audit: Proposal, AI Advisor, Reviews, Context Inspector, Time Grid, activity drag
- Align UX with new Residency
- **DO NOT change scheduling logic / Apply without explicit authorization**
- **DO NOT remove features for simplification**

### Final regression + release readiness

Release is BLOCKED until all above is complete.

## 8. Files frozen (DO NOT TOUCH)

- `round-scheduler-v22.js`
- `store-v2/v5/v10.js`
- `domain-v2/v3.js`
- `planner-replan-apply-v7.js` — contract changes forbidden; additive only
- `scheduling-conflict-v20.js` RULES
- `_getEffectiveItems` dedup
- `_shouldBlockOverlap` policy-HARD
- Virtual recurrence (ADR-034)
- Food.db (READ-ONLY)
- `window.INTERNSHIP_STATE` (read-only snapshot)
- Schema v22 — no bump

**Newly frozen by ADR-074 to ADR-080:**
- Replan `capacity_rebuild` semantics
- Replan per-day selection UI
- Apply All vs Apply Selected
- Cancelled task projection filter
- Proportional allocation policy

## 9. Golden rules

- Persian talk, English code
- Audit before patch. Ask for files if unseen.
- One script = one patch
- Test separate from patch
- Mandatory backup + size verify
- `try/catch`, never `exit`
- Distinct PS variable names (PowerShell is case-insensitive)
- `[Text.UTF8Encoding]::new($false)` on write
- `__tests` must not mutate real state
- After each phase, short report (under 10 lines)

## 10. PowerShell CRITICAL lessons (Agent #22 additions)

### L1 — NEVER `exit` — always `throw`
`exit` closes the PowerShell window silently.

### L2 — No multi-line `else` in console
Use two `if` statements.

### L3 — NEVER triple-backtick inside here-string
Chat renderer closes outer block early. Use `~~~` or 4-space indent for sample code.

### L4 — HTML in scripts → `@'...'@` here-string
Never use inline quoted strings with `\"` or `""` for HTML content. This caused ~3 parser errors in R3.

### L5 — Use `Replace-BraceFn` for function replacements
String/regex replace fails when function body contains quotes or nested braces. Brace counting always works:

~~~powershell
function Replace-BraceFn($content, $fnMarker, $newBody, $patchTag) {
    $start = $content.IndexOf($fnMarker)
    if ($start -lt 0) { throw "$patchTag : fn not found: $fnMarker" }
    $depth = 0; $found = $false; $end = -1
    for ($i = $start; $i -lt $content.Length; $i++) {
        $c = $content[$i]
        if ($c -eq '{') { $depth++; $found = $true }
        elseif ($c -eq '}') { $depth--; if ($found -and $depth -eq 0) { $end = $i; break } }
    }
    if ($end -lt 0) { throw "$patchTag : end not found" }
    return $content.Substring(0, $start) + $newBody + $content.Substring($end + 1)
}
~~~

### L6 — Persian text in JS strings → `\uXXXX`
Raw Persian gets mangled by terminal. Use `\u0627` etc.

### L7 — Anchor uniqueness check on EVERY patch
~~~powershell
$c = ([regex]::Matches($text, [regex]::Escape($anchor))).Count
if ($c -ne 1) { throw "anchor count=$c (expected 1)" }
~~~

### L8 — Distinct variable names
`$uF == $uf == $UF`. Never reuse for path + content.

### L9 — `-contains` is ARRAY membership
Use `.Contains()` for string, `-match` for regex.

### L10 — If a patch fails silently — it did NOT apply
If `$c -eq 0` but no throw — you skipped the patch. Always `throw` on count != 1.

### L11 — Never `throw` from inside a heredoc
If here-string content contains `throw` (JS code), PowerShell doesn't execute it — it's just text. But if the here-string terminates early (unescaped `'@` inside), PowerShell executes garbage. Always check `@'` is at line start and `'@` is at line start with nothing after.

## 11. Test commands

**Sub-regression (paste in F12 Console):**

~~~javascript
(function(){
  var R = window.InternshipResidency;
  var suites = {
    allocator: R.plannerStudyV7.allocator,
    input: R.plannerStudyV7.input,
    ui: R.plannerStudyV7.ui,
    schedulingConflict: R.schedulingConflict,
    schedulingProjection: R.schedulingProjection,
    dayTimeline: R.dayTimeline,
    replanTrigger: R.replanTrigger,
    plannerReplan: R.plannerReplan,
    plannerReplanApply: R.plannerReplanApply,
    plannerSchedule: R.plannerSchedule,
    plannerAllocation: R.plannerAllocation,
    baseline: R.baseline,
    availabilityEngine: R.availabilityEngine
  };
  var P=0, T=0, F=[];
  Object.keys(suites).forEach(function(n){
    var s = suites[n];
    if (!s || typeof s.__tests !== "function") return;
    var r; try { r = s.__tests(); } catch(e) { console.log(n+": EXCEPTION "+e); F.push(n); return; }
    if (Array.isArray(r)) {
      var ap = r.filter(function(x){return x && x.pass !== false;}).length;
      console.log(n+": "+ap+"/"+r.length+" (legacy)");
      P += ap; T += r.length; return;
    }
    var p = r.passed||0, t = r.total||0;
    P+=p; T+=t;
    if (p!==t) F.push(n);
    console.log(n+": "+p+"/"+t+(p===t?" OK":" FAIL"));
  });
  console.log("===== TOTAL: "+P+"/"+T+" =====");
  if (F.length) console.log("FAILED: "+F.join(", "));
})();
~~~

**Expected: ~376/376.**

## 12. Report format

    files changed: ...
    tests: <suite> X/X
    UI test: <scenario> PASS/FAIL/NOT TESTED
    new ISSUE: ...
    Next: awaiting directive

Under 10 lines. Persian.

## 13. Files changed in R3 (complete list)

### Backend / engine

- `app/residency/planner-replan-v7.js`
- `app/residency/planner-replan-apply-v7.js`
- `app/residency/planner-allocation-v6-2.js`
- `app/residency/planner-snapshot-v6.js`
- `app/residency/planner-schedule-v6-4.js`
- `app/residency/planner-demand-v6.js`
- `app/residency/planner-recovery-v7.js`
- `app/residency/scheduling-projection-v20.js`

### UI

- `app/residency/planner-replan-ui-v7.js`
- `app/residency/residency-dashboard-v19.js`
- `app/app.js`

### Unresolved

- `app/app.js` calendar still shows 11 cancelled residency tasks on 3 Azar

## 14. Confirmation message (send exactly this)

    تأیید شد. Agent #23 آماده.
    R3 تا F5 کامل: F1 (contract validated)، F2 (demand fix)، F3 (capacity_rebuild)،
    F4-A (projection cancelled)، F4-B (per-day UI)، F4-C (labels)، F5 (apply modes).
    تست: ~376/376 PASS.
    باگ باقی‌مانده: ۱۱ فعالیت رزیدنتی روی ۳ آذر در تقویم (app.js) — Audit در _audit-calendar/.
    منتظر دستور Design Agent یا ادریس.
    بدون دستور صریح، پچ نمی‌زنم.
    Schema v22، frozen files، legacy route حفظ شده.

---

**End of AGENT-23-PROMPT.**