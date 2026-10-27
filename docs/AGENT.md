# AGENT.md — نقطه‌ی ورود Agent

> این فایل همیشه اول خوانده شود.

## شروع از اینجا

1. AGENT.md — همین فایل
2. ARCHITECTURE.md — معماری پایدار
3. CURRENT.md — وضعیت لحظه‌ای

- Schema: SCHEMA.md
- Decisions: DECISIONS.md
- Bugs: KNOWN_ISSUES.md
- Roadmap: ROADMAP.md
- Previous: HANDOFF.md

## سلسله‌مراتب حقیقت

1. Actual code / runtime behavior — برنده‌ی نهایی
2. Stable architecture documentation
3. Decision log
4. Current/Handoff status
5. Chat instructions

اگر Doc با Code تناقض داشت → Code wins. اما Agent نباید خودسرانه Doc رو تغییر بده. اول discrepancy رو گزارش کن.

## نقش Agent

Coding / Implementation Agent

- Product Architecture توسط انسان یا Agent طراح تعیین می‌شه.
- Agent اجراکننده است، نه تصمیم‌گیر معماری.
- تصمیم معماری بزرگ بدون Audit مجاز نیست.
- Rewrite بزرگ بدون تأیید صریح مجاز نیست.

## Workflow اجباری

AUDIT → IMPACT ANALYSIS → CONTRACT → IMPLEMENT → TEST → REGRESSION → INTEGRITY CHECK
## قوانین — Agent نباید

- Stable engine را بی‌دلیل Rewrite کند
- Source of Truth جدید بسازد
- Duplicate logic ایجاد کند
- با حدس Root Cause را fix کند
- Migration غیرضروری انجام دهد
- فایل نامرتبط را تغییر دهد
- Feature خارج از scope را همراه patch انجام دهد
- در Engine جای AI تصمیم بگیرد
- Silent change در Planner/Replan انجام دهد

## قبل از هر تغییر

Agent باید بتونه جواب بده: Why, What, Where, Impact, Tests, Rollback

اگه هر کدوم نامشخصه → اول Audit کن.

## Project Conventions

- Vanilla JS (ES5-compatible) با IIFE
- بدون build step، بدون npm
- WebView2 + ASP.NET Core روی 127.0.0.1:8977
- RTL / Persian UI
- Jalali presentation
- Core date arithmetic باید با lib/date.js هماهنگ باشه
- State فعلی Source of Truth است
- Projectionها read-only هستند
- AI تصمیم‌گیر نیست
- Persistence layout نباید به Engineها leak کنه

## Pitfalls

### PowerShell / Patch

- ZWNJ در anchorهای فارسی → anchor کوتاه ASCII بده
- if/else چندخط در PowerShell کنسول → ممنوع
- Here-string: @' آخر خط، '@ ابتدای خط
- quote تودرتو در diagnostic → خطوط جداگانه
- UTF-8 بدون BOM: [Text.UTF8Encoding]::new($false)

### Code / Architecture

- app.js بزرگ است (~15000 خط) — تغییرات additive
- کامنت‌های // PATCH:... marker تاریخی هستن، نه TODO
- فایل‌های -vN همه load می‌شن
- Migration chain در app.js::migrateState از v1 تا v22
- Schema فعلی: v22
- window.__os باید قبل از اولین render ساخته بشه
- isEdit در بعضی فایل‌ها به _editId تبدیل شده

### State

- State فعلی کاربر ممکنه خالی باشه بعد cascade delete
- planVersions بدون planId معتبر → یتیم می‌مونن
- state.js روی هارد ممکنه عقب‌تر از حافظه باشه → Ctrl+S

### UI

- Native confirm/alert زیبا نیستن → R.dialog.confirm/alert
- Loading overlay: R.loading.defer برای عملیات سنگین
- Notification: R.notify.info/success/warning/error + banner
- Tip icon: _tipIcon(text)

## Split State — Future Direction

State فعلی single-file (data/state.js). آینده: multi-file persistence.

مهم: domain/engine code must NOT assume a particular persistence file layout.

## Agent Compatibility

Markdown ساده، متنی، Git-friendly، self-contained، cross-reference بجای duplicate.

## Cross-Reference Rules

هیچ Documentation نباید متن کامل فایل دیگه رو duplicate کنه.

## Last Updated

2026-10-08
## Test Safety Rule (Phase 26.3b)

`__tests` functions must operate on isolated mock objects.
Never delete / replace keys on `window.INTERNSHIP_STATE`.
Never call `_restoreState()` on real state.
Verify reference identity before/after (`x === y`).
Force-fail hooks (`window.__PRA_FORCE_FAIL__`) must be cleared in `finally`.

## Session Update (2026-10-09)

Schema: v22 (no version bump — additions are additive fields).
Last completed: Phase 27.0 (audit only).
Awaiting: Phase 27.1 contract.

## Session Update (2026-10-11 · Agent #10)

Schema: v22 (no version bump).

Phases completed:
  - Phase 28.0 — Conflict Integration Audit
  - Phase 28.1 — Timeline Closeout & Generic Activity Design

New ADRs: 028 (HARD-only enforcement in overlap helper),
029 (dashboard dedup mandatory), 030 (legacy detector retired),
031 (neutral fallback title).

New Issues: 15 (orphaned showConflictWarning), 16 (non-dedup
projection callers outside dashboard).

ISSUE-10 resolved.

New invariant (enforce in future patches):
  - Dashboard conflict feed MUST go through `_getEffectiveItems`.
    Using `schedulingProjection.projectDate` directly reintroduces
    "مطالعه ↔ مطالعه" self-conflicts.
  - `_shouldBlockOverlap` MUST enforce `policy === "HARD"` only.

Last Completed: Phase 28.1.
Awaiting: Phase 28.2 contract (proposed: Item-Level Policy Override).

## Session Update (2026-10-10 · Agent #9)

Schema: v22 (no version bump — additions are additive fields).
Last completed: Phase 27.67 (Tooltip system JS-driven).
Awaiting: Phase 28.0 contract.

New ADRs: 023 (day bar range), 024 (JS tooltip), 025 (week Saturday),
026 (pointer drag), 027 (buffer pattern).

New Issues: 10 (conflict engine residency), 11 (_renderFlexibleItem),
12 (snake start circle), 13 (styles.css accumulation).

Key CSS warning: This project has accumulated many PATCH blocks with
!important. Before adding new CSS, REMOVE conflicting old blocks first.

Key JS warning: After drag-drop, call _ioRebuildAfterDrop() — not just render().
## Session Update (2026-10-12 · Agent #12)

Schema: v22 (no version bump — additive fields).

Phases completed:
  - MVP-01 — Daily-Use Readiness (task edit area fix, recurrence chip,
             duplicate quick-add guard, delete btn in edit modal)
  - MVP-02 — Recurrence Execution (virtual expansion)
  - MVP-03 — Daily-Use Readiness & Finalization (range fix + 16 recurrence tests)
  - DESIGN-30 — Unified Life Domains (design-only, delivered, awaiting approval)

New ADRs: 034 (Virtual Recurrence Expansion),
          035 (Unified Life Domains — proposed).

Key invariants (enforce in future patches):
  - Recurrence expands ONLY inside schedulingProjection.projectAll.
    Never spawn independent tasks for occurrences.
  - Virtual occurrence id = "virtual:<parentId>@<date>".
  - Per-occurrence completion lives in task.recurrenceExceptions[date].
  - projectAll accepts options.rangeStart / rangeEnd; default is
    [today, today+180]. Planner snapshot passes explicit range
    [minDate, maxDate].
  - Delete button exists in task edit modal AND dashboard day-modal.
  - Duplicate quick-add guard: refuses same (title, time, date).

New issues: 22 (projectAll 180d default outside planner — accepted),
            23 (orphan recurrenceExceptions after pattern change — low).

Last Completed: MVP-03.
Awaiting: DESIGN-30 approval → Phase A (Life Areas Restructure).


## Session Update (2026-10-15 · Agent #13)

Schema: v22 (no version bump — additive fields only).

Phases completed this session:
  - A     — Life Areas Restructure
  - B     — Health Profile & Body Measurements
  - B.1   — Health Closeout (height removal, bridge, 14 tests)
  - C     — Nutrition & Calorie Targets
  - F.1   — Food.db Read-Only Access Layer
  - F.2   — Food Logging UI (search/categories/favorites/custom)
  - F.3   — Health Hub Banners + donut macros
  - F.4   — Nutrition Trend + Day Navigation
  - F.5   — Notification Bell

New ADRs: 036 (Food.db read-only), 037 (food snapshot),
          038 (day-scoped editing), 039 (trend heatmap), 040 (bell).

Key invariants (enforce in future patches):
  - Food.db is READ-ONLY. Never write, never migrate, never replace.
  - foodLog.items[] MUST carry a snapshot (name + per-100g values) so
    historical display does not re-query Food.db.
  - state.health lazy-init in normalizeStateObject AND _healthEnsure.
    No migration chain change.
  - Missing nutrient = null (never 0). _mealTotals uses hasUnknown flag.
  - _nutritionViewDate = null → today. Past-day editing must go through
    _nutritionDate() everywhere, including fooddb-ui.js.
  - Persian search normalization (ي→ی، ك→ک، ZWNJ→space) is in SQL only;
    display names are untouched.
  - Bell hides when 0 items; click handlers wired per-button AFTER
    innerHTML swap (never via parent delegation).
  - fooddb-ui.js is an external module. Do NOT re-add Food.db UI
    directly into app.js.

New issues: 24 (244 baseline not re-run), 25 (workout placeholder),
  26 (manual catalog retained), 27 (generic unit ~), 28 (bell scope),
  29 (ranking), 30 (reminder grace 5 min).

Key files added:
  - app/residency/health-tests.js    (14 tests)
  - app/residency/fooddb-tests.js    (12 tests)
  - app/residency/fooddb-ui.js       (external module)

Dependency added:
  - Microsoft.Data.Sqlite 8.0.10 (NuGet, restored)

Last Completed: F.5.
Awaiting: Design Agent review → F.6 (Exercise UI).

## Session Update (2026-10-15 · Agent #14)

Schema: v22 (no version bump — additive fields only).

Phases completed:
  - F.6  — Exercise UI (workoutdb-ui.js, external module)
  - F.6c — Exercise tests (32) + bell action open-workout
  - F.7  — Sleep Hub (sleep-ui.js, external module)
  - F.7c — Sleep tests (50) + cross-midnight split UI merge

New ADRs: 041 (exercise DB access), 042 (exercise snapshot),
          043 (external module), 044 (sleep log-first + explicit sync),
          045 (sleep UI merge), 046 (sleep bell), 047 (sleep date ownership).

Key invariants (enforce in future patches):
  - Food.db read-only remains.
  - exerciseLog snapshot; sleep log snapshot per entry.
  - sleep auto-tasks: _sleepAuto marker; per-day recurrence:"none";
    built ONLY on explicit sync (not on render/boot).
  - Cross-midnight sleep: two tasks (night:evening + night:morning)
    with _cont "tail"/"head". UI merges them into one card in list views.
  - Day bar shows two blocks with arrows for continuation.
  - Bell kinds: sleep (log-aware), workout (log-aware), meal, task.
  - Sleep tasks never appear in the overdue section.
  - No schema bump; state.sleep and state.health.workoutLog are lazy-init.

New issues: 31 (sleep split render-only), 32 (nap cross-midnight),
  33 (auto sync requires explicit user action), 34 (bell dedup via log),
  35 (exercise kcal approximate), 36 (exercise ranking nuance).

Key files added:
  - app/residency/workoutdb-ui.js    (~570 lines)
  - app/residency/workoutdb-tests.js (32 tests)
  - app/residency/sleep-ui.js        (~780 lines)
  - app/residency/sleep-tests.js     (50 tests)

Last Completed: F.7.
Awaiting: Design Agent review -> F.8 (Projects).


## Session Update (2026-10-16 · Agent #15 · v0.4.0)

Schema: v22 (no version bump — additive fields only).
Version: **v0.4.0**.

Phases completed this session:
  - F.8   — Projects Hub (state.projects[], task.projectId)
  - F.9   — Personal Finance (state.finance ledger)
  - F.9.1 — Finance UX redesign (charts, month close/reopen, dual budget)
  - F.10  — Life & Leisure (state.life.items[])
  - UX-01 — Dashboard audit (design only)
  - UX-02 — Today-First dashboard (D1, D2, D3)
  - GREETING-COCKPIT — Compact dashboard header (v2→v6 iterations)
  - FIX — Sleep quick-action route + money formatter rounding

Key invariants (enforce in future patches):
  - Food.db READ-ONLY stays.
  - finance dual-budget: budgets["YYYY/M"] = { income, expense } | number (legacy).
  - finance daily reminder is OWNER-APPROVED — never remove without owner decision.
  - life.taskId = link to state.tasks[] (task is the single scheduling authority).
  - Life record does NOT duplicate task date/time.
  - Auto-link: window.__lifeLinkPending + R.lifeUI.consumePendingLink(taskId).
  - Dashboard greeting cockpit hides a metric when its data source is empty
    (never fabricate 0).
  - Sleep quick-action MUST setRoute("area-detail","sleep") FIRST, then openForm
    after a 170ms delay (otherwise the sleep render replaces the whole view).
  - Money formatter: Math.round before inserting separators.
  - No schema bump; state.projects / state.finance / state.life are lazy-init.

New issues: 41 (finance-ui.js size), 43 (auto-link UX), 44 (life back button
robustness), 45 (dashboard UX polish residuals).

Last Completed: F.10 + Dashboard UX + Greeting Cockpit.
Awaiting: Design Agent review of LIFE-AREAS-UX-01.

## Session Update (2026-10-16 · Agent #15 · v0.4.2)

Schema: v22 (no version bump).
Version: **v0.4.2**.

Phases completed this session:
  - F.8   — Projects Hub
  - F.9   — Personal Finance
  - F.9.1 — Finance UX (charts, month close, dual budget, reminder)
  - F.10  — Life & Leisure
  - UX-01 — Dashboard audit (design-only)
  - UX-02 — Today-First dashboard (D1/D2/D3)
  - GREETING-COCKPIT — compact dashboard header
  - MANUAL-CONTENT — «➕ محتوای دستی» in Study/Emergency/Procedures
  - AI-CONTENT — «🤖 تولید با AI» 3-step prompt/paste/commit
  - FIXES — isEdit, sleep route, money format, food log, favorites

### CRITICAL INVARIANT (added v0.4.2)

**Never write to `window.INTERNSHIP_STATE`.**
It is only the initial snapshot loaded from `data/state.js` at boot.
The live object is `state` inside the `app.js` IIFE.
Every external UI module (fooddb-ui, sleep-ui, workoutdb-ui,
projects-ui, finance-ui, life-ui) MUST get the live state via its
bridge: `need().state()` (or equivalent accessor).

Symptom of violating this rule: UI shows "success" toast but the
change never persists — see v0.4.2 food-log fix as the canonical
example.

### Key invariants (enforce in future patches)

- Food.db READ-ONLY.
- foodLog items carry `snapshot` (name + per-100g values).
- finance dual-budget shape: `budgets["YYYY/M"] = { income, expense } | number (legacy)`.
- finance-daily reminder is OWNER-APPROVED — never remove.
- life.taskId = link to state.tasks[] (task is scheduling authority).
- Auto-link via `window.__lifeLinkPending` + `R.lifeUI.consumePendingLink(taskId)`.
- Dashboard greeting cockpit hides a metric when source is empty.
- Sleep quick-action: `setRoute("area-detail","sleep")` FIRST, then openForm.
- Money formatter: Math.round before separators.
- Content tasks: `openContentTaskModal` no longer uses `isEdit`.
- Manual/AI content writes to `state.programContent[]` with
  `manual:true` and optionally `aiGenerated:true`.
- No schema bump; state.projects / state.finance / state.life are lazy-init.

### Environment reminders

- `window.INTERNSHIP_STATE` — frozen boot snapshot, never write.
- `window.__os` — debug bridge (getState, saveState, render, etc.).
- Modules register on `window.InternshipResidency.<name>`.

### Release artifacts

- Release folder: `D:\Desktop\.internship-os\internship-os-releases\InternshipOS-Release-v0.4.2\`
- Installer: `D:\Desktop\.internship-os\InternshipOS-Setup-v0.4.2.exe`
- Inno Setup: `C:\Users\M. Edris Sirvani\AppData\Local\Programs\Inno Setup 6\ISCC.exe`
- Stable AppId → upgrades over old install, preserves data.

Last Completed: v0.4.2.
Awaiting: Design Agent directive for next phase.


## Session Update (2026-10-18 · V7 Milestones 1+2)

Schema: v22 (no bump). Version: v0.5.2 (no release).

### V7 study planner
Three isolated modules under app/residency/, all passing:
- planner-allocator-v7.js: 11/11
- planner-input-v7.js: 19/19
- planner-study-ui-v7.js: 10/10

Registered additively. Legacy planner still active.
V7 only via plannerStudyV7.ui.open() in F12.

### Key invariants
- No monkey-patching of legacy planner
- No schema bump (v22)
- No release until Milestone 6
- input-v7 uses settings.defaultCapacity[dayType], NOT R.DEFAULT_CAPACITY
- effectiveCapacity = min(baseCap, windowAvail), never subtract
- dailyLifeSchedule.weeklyBlocks never create Timeline tasks
- initialStudyBaseline activation is Milestone 3
- Legacy R.plannerUI.open remains live route until Milestone 6

### New ADRs
ADR-060 allocator, ADR-061 usercaps, ADR-062 dailyLifeSchedule,
ADR-063 effective capacity, ADR-064 studyHours sync,
ADR-065 per-day apply, ADR-066 legacy planner active.

### Next
Await Design Agent for Milestone 3 (Progress Tracking).

## Session Update (2026-10-19 · Agent #19)

Schema: v22 (no version bump — additive fields only).
Version: v0.5.2 (no release).

Phases completed:
  - M5  — Incremental Replan (progress detection, dedup, day lock, UI)
  - M6  — Final Integration (route switch, round isolation, T7 strengthen)

Key invariants (enforce in future patches):
  - Dedup key = `(planId, roundId, bookId, date, pageRangeOverlap)`.
    Never dedupe by day only — a day may contain multiple blocks.
  - Completed activity → read (cross-round); planned → allocated (per-round).
    `_collectActivityRanges(s, planId, bookId, roundId)` honours this.
  - Day with any planned activity (same plan) → `cap = 0` (locked from Generate).
  - `R.plannerUI.open(planId)` → V7; legacy at `R.plannerUI._legacyOpen`.
    Idempotent via `_legacyOpen` guard.
  - Round propagation: `_input.books[].roundId` → `res.blocks[].roundId` post-Generate.
    `_resolveBlockMeta` uses `block.roundId`; `_roundIdForBook` accepts `planId`.
  - Dev floating button hidden unless `window.__V7_DEV__ = true`.
  - Tests: allocator 25, input 41, ui 10 = 76/76.

New resolved issues: ISSUE-52, ISSUE-56, ISSUE-57, ISSUE-58,
  ISSUE-59 (dedup), ISSUE-60 (T7), ISSUE-61 (devbtn), ISSUE-62 (meta),
  ISSUE-63 (diag).
New open issues: ISSUE-64 (multi-enrollment), ISSUE-65 (old activities).

Frozen unchanged: round-scheduler-v22, store-*, domain-*,
  planner-replan-apply-v7, scheduling-conflict-v20 RULES,
  window.INTERNSHIP_STATE, schema v22, migration chain.

Awaiting: Design Agent directive for M7 OR release approval.
         Release gate BLOCKED pending approval.

## PowerShell Lessons (Agent #19 · 2026-10-19)

Critical: `exit` in any script closes the PowerShell window (no warning).
The root cause of ~8 crashes this session was `exit` inside error
handling, NOT long scripts, NOT Persian text.

Solution adopted: wrap everything in `try/catch` and use `throw` for
failure. NEVER use `exit`.

    try {
        if (cond) { throw "reason" }
        # do work
        Write-Host "  OK - done" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL - $_" -ForegroundColor Red
    }

Also: no multi-line `else` in console; use two `if` statements or `throw`.
See `POWERSHELL-GUIDE.md` for the full playbook.
## Session Update (2026-10-22 · Agent #24)

Schema: v22 (no bump). Version: v0.5.2 (no release).

Phases completed:
- R2-H / Gate 1 — Visual Polish
- R2-H / Gate 2 — Accessibility
- R2-I Integrated — Wizard Redesign

New ADRs: 082-087.

Key invariants (enforce in future patches):

**Testing:**
- `input.__tests` / `ui.__tests` MUST run isolated fixture (ADR-087)
- NEVER live user state
- Stable reference, not fresh-per-call
- Verify state PRESERVED

**Wizard (R2-I):**
- `STEPS` (13) FROZEN
- `_closing` / `_committing` = double-invoke guards
- `R.dialog.confirm` is Promise (not callback — ISSUE-21)
- No native `confirm()` in production path
- Inline errors: keyword matching (ADR-086)
- `_fa(_step + 1)` for step count
- `aria-live` + `role="status"` for announce

**R2-H:**
- Future Days nav: inline `onclick` (WebView2 `.click()` doesn't preserve focus)
- `_residencyFuture.{offset, selIdx}` runtime only
- `:focus-visible` scoped (not global)
- `prefers-reduced-motion` for wizard transitions
- 2 Gate 2 automated tests WAIVED by owner (WebView2 artifact)

Deferred: W-43, ISSUE-76, CSS cleanup, Wizard reset-all.

Last Completed: R2-I Integrated Wizard Redesign.
Awaiting: Agent #25 — Workspace or Final Regression.
## Session Update (2026-10-22 - Agent #26) - v0.6.0 RELEASED

Schema: v22 (no bump). Version: v0.6.0.

### Shipped

- Workspace Product Redesign - 4-section shell (Overview / Plan / Review & Change / Analysis)
- R3 Replan Engine (already in source; first documented release)
- R2-I Integrated Wizard Redesign
- R2-H Visual Polish / Accessibility

### Key invariants (new)

- Workspace top-level shell: `.r2w-sections-bar` with `[data-r2w-section]` buttons
- Default section: `overview`. Deep-links via `[data-r2w-goto]`
- Section → sub-tabs mapping (frozen): plan→[activities], review→[proposal,reviews], analysis→[analytics,ai]
- `_postWire` chain now 10 layers: v14-core -> ... -> r2w-polish -> r2w-completion -> r2w-sections
- `PROP_LABELS` complete: superseded (جایگزین‌شده) and active (فعال) mapped

### Testing invariants (reinforced)

- V7.input / V7.ui require isolated fixture with `plan.status === "active"` (ADR-087)
- Test count excludes NOT TESTED and waived from PASS total

### Deferred (require separate authorization)

- `workspace-v13.js` + `.pw13-*` removal
- CSS mass cleanup / `styles.css` split
- ISSUE-76 legacy-array test wrapper

### Environment

- Repo: D:\Desktop\.internship-os\internship-os
- Release folder: D:\Desktop\.internship-os\internship-os-releases\
- Installer: D:\Desktop\.internship-os\InternshipOS-Setup-v0.6.0.exe
- GitHub: v0.6.0 published

Last Completed: v0.6.0 release.
Awaiting: Design Agent directive for next phase.

## Session Update (2026-10-23 · Agent #27) — Study Together V1

Schema: v22 (no bump). Version: v0.6.0 (no release — feature release-gated).

### Shipped (feature-complete, live-validated)

Study Together V1 — private realtime study presence for a small group of friends.
External module `app/residency/study-together.js` (1.0.0).
Supabase Free backend (Auth + Postgres + Realtime Presence).
Live validation: PASS (2 real accounts, presence + timer + privacy).
Release Gate: PENDING Design Agent decision.

### New invariants (enforce in future patches)

- `window.__os` is REASSIGNED in `boot()` (lines ~17792 and ~17821). NOT extended.
  Any new bridge must either merge into boot() or poll until `window.__os.getState`
  exists (pattern in `study-together-tests.js`).
- Realtime presence: heartbeat 30s maximum. Calling `track()` at 1Hz causes
  Supabase to close the channel with no error.
- Realtime closure capture: each `channel.subscribe()` callback must capture
  its own `ch` reference. Stale callbacks MUST check `_channel === ch` before
  mutating state. Without this, reconnect loops occur.
- Exponential backoff on reconnect: 3s → 6s → 12s → 24s → 30s cap.
- `setAuth` only when token changes (`_lastAuthToken` cache).
- `share_daily_total` and `share_timeline` are enforced at DB layer
  (RLS `sessions_self_or_group_read`), not just UI. A non-member reading
  another user's sessions through direct SQL gets 0 rows.
- SQL helper functions live in `private` schema with `SECURITY DEFINER`,
  `SET search_path = ''`, `revoke from public, anon`, `grant only to authenticated`.
- Do NOT run `ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY` — Supabase enables it.
  Just add RLS policies for `realtime.messages`.
- Client SDK: `@supabase/supabase-js@2.118.0` (pinned), lazy loaded from jsDelivr
  only when the tab opens. Never at boot.

### Files (new, additive)

- `docs/STUDY-TOGETHER-SQL.sql` — Schema + RLS + RPC + Realtime policy
- `docs/STUDY-TOGETHER.md` — setup guide (Persian)
- `app/residency/study-together.js` — external module (IIFE)
- `app/residency/study-together-tests.js` — test bridge with deferred install
- `data/study-together.js` — config (OWNER-supplied, outside git)
- `app/app.js` — +70 lines (MAIN_ROUTES, switch, render, bridge, activity fn)
- `app/index.html` — nav button + 2 script tags
- `app/styles.css` — `[PATCH:study-together]` append, prefix `st-` only

### Known limitations (accepted, documented)

- ISSUE-ST-01 — UI supports one group only (LOW)
- ISSUE-ST-02 — Supabase Free Pause after 1 week idle (MEDIUM, operational)
- ISSUE-ST-03 — Offline start-study behavior undefined (design pending)
- L08 / L10 — NOT TESTED (owner deferred)

### Deferred requests (require Design Agent approval)

A. Keep-alive heartbeat — prevent Free tier pause — medium/ low complexity
B. Avatar photos (Supabase Storage) — medium/ medium
C. Pomodoro mode — high/ medium
D. Multi-day session history + manual edit — high/ medium
E. Offline start-study behavior (A/B/C options) — medium/ low-medium
F. UI polish (cards, avatar, buttons, copy-code) — high/ low

### PowerShell lessons (added this session)

- `'...'` in PowerShell is LITERAL — backtick-n is two literal chars, not
  newline. For multi-line anchors use `@'...'@` here-string with
  `.Replace("`r`n","`n")` OR segment-based `IndexOf` + `Substring`.
- Verification must be SEGMENT-SCOPED: `$v.Substring($start, $len).Contains(...)`,
  not global `$v.Contains(...)`. Global Contains gave 3 false positives this session.
- Always `[Text.UTF8Encoding]::new($false)` for read AND write.
- Node `--check` after every write. `$LASTEXITCODE` must be explicit.

Last Completed: Study Together V1 implementation + live validation.
Awaiting: Design Agent decision on Release Gate + V2 features A-F.

## Session Update (2026-10-23 · Agent #28)

Schema: v22 (no bump). Version: v0.6.1 (no release — private pilot gate open).

### Phases completed

- **C** — Pomodoro implementation (25/5, timestamp-driven, marker-based recovery)
- **D** — Study History + Manual Editing (12 unit + 4 SQL security + 18 integration)
- **Study Together 2.0 Wave 1** — Design System، Nav 5-tab، Course CRUD، Timer↔course، Profile + avatar picker، SVG timer ring
- **Wave 2** — Stats (period selector + line chart + top days + best session + course breakdown)، History expand (7/30/90 + heatmap + filters)
- **Wave 3** — Friends (leaderboard + rank badges + member profile modal + privacy gating)

### Git commits

- `74efa79` — V1 + D + Wave 1 (31 files, +5008/-1985)
- `db09687` — Wave 2 (2 files, +630/-40)
- `27e4069` — Wave 3 (2 files, +386/-11) — HEAD

### New invariants (enforce)

- **`_toPersianDigits` نه `fa0`** برای zero-padded — `fa0("00") = "۰"` نه "۰۰"
- **render* dispatch**: `S.container.innerHTML = renderX(); wire(); return;` نه `return renderX()`
- **waitFor الگوی تست**: نه `phase==="ready"` تنها؛ روی عنصر واقعی
- **Detached element بعد از render**: query مجدد کن، reference cache نکن
- **Pomodoro fast-forward**: از طریق nav-away/back (localStorage → S.pom)
- **Multiple open sessions**: loop تا pom-start (نه end)
- **qGetProfiles**: همهٔ ستون‌های موردنیاز در SELECT
- **Server ownership**: `private.enforce_session_course_owner()` trigger (42501) — client validation تنها کافی نیست
- **Test-script bug ≠ module bug**: شاهد قطعی از DB قبل از patch
- **`_agent*-audit/` در gitignore** — audit folder commit نمی‌شود

### Known issues added

- **ISSUE-ST-04** — presence reconnect duplication (pre-existing V1)
- **ISSUE-ST-05** — 2-layer privacy (RLS gates only share_daily_total)

### Frozen — unchanged

Schema v22، `window.INTERNSHIP_STATE`، `state.tasks`، `state.residency.activities`، SQL/RLS on core tables، ADR-081، ADR-091..094.

### Last completed

Wave 3 committed. Study Together 2.0 (V1 + W1 + W2 + W3) shipped on `main`. V1 Release Gate remains `OPEN — PRIVATE PILOT`.

### Awaiting

Design Agent directive for Wave 4 (or other phase).


## Session Update (2026-10-27 · Agent #29)

Schema: v22 (no bump). Version: v1.0.1 (released).

### Waves completed

- Wave 4 — Bio, course edit/archive, visual overhaul
- Wave 5 — Avatar upload, friend day view
- Wave 6 — Shared daily plan
- Wave 7 — Account center, Persian calendar, rich history
- Wave 8 — Session type, bulk categorize
- Wave 9 — Live co-study room, ST-04 fix
- Wave 10 — Goals, streaks, Persian dates
- Wave 11 — Group weekly goal
- Wave 12 — Weekly leaderboard, weekly recap
- Wave 13 — Help FAB, loading states, offline resilience
- Wave 14 — Offline boot fix, logout relocation, chip fix
- Wave 15 — Server reset (data-only), debug cleanup, save bug fix
- Wave 16 — Full installer v1.0.0
- Wave 17 — Last seen label (v1.0.1)

### Releases

- v1.0.0 — 2026-10-23 — commit `9907521`
- v1.0.1 — 2026-10-27 — commit `3559da7`
- `study-together-v1.0.0` — subsystem tag (preserved)

### Key invariants (new)

- **Save functions**: read inputs → build patch → `S.busy = true; render()` → update → `.select().single()` → check `r.data`.
  - **NEVER `render()` before reading inputs** — DOM resets to old state and save writes OLD values
- **All DB updates**: `.select().single()` + `if (!r || !r.data) throw` — detects silent 0-row RLS failures
- **`_stDbg()` gate**: all `console.log("[st]...")` behind `window.__ST_DEBUG__`
- **`_connChipHTML()`** — single source of truth for connection chip
- **`_touchLastSeen(force)`** — 60s throttle on auto, force on explicit exit
- **`_fmtLastSeen(iso)`** — Persian relative time (e.g., "۲ ساعت پیش (۱۴:۳۰)")
- **Last seen transitions**: visibilitychange=hidden, pagehide, beforeunload, offline, logout, ST.close
- **Config fallback**: `app/study-together-defaults.js` (in git) + `data/study-together.js` (owner-supplied, gitignored)
- **WebView2 cache**: after release, owner must delete `%LOCALAPPDATA%\InternshipOS\WebView2` before testing

### Known issues added

- ISSUE-ST-04 — presence reconnect duplication (pre-existing V1)
- ISSUE-ST-05 — 2-layer privacy (RLS gates only `share_daily_total`)

### Frozen — unchanged

Schema v22, `window.INTERNSHIP_STATE`, `state.tasks`, `state.residency.activities`, SQL/RLS on core tables, ADR-081, ADR-091..094, ADR-100..103.

### Last completed

v1.0.1 released. All Study Together 2.0 features shipped.

### Awaiting

Design Agent or owner directive for bug fixes.