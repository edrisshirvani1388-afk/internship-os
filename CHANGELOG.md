# Changelog

All notable changes to Internship OS are documented here.
This project adheres to a lightweight versioning scheme:

- `v0.1.x` — Residency foundation, scheduler, planner, replan
- `v0.2.x` — Health / Nutrition / Food.db / Workout
- `v0.3.x` — Sleep Hub
- `v0.4.0` — Projects, Finance, Life, Dashboard UX, Greeting Cockpit
- `v0.5.0+` — TBD

Schema version is independent of app version.
Schema stays at **v22** unless an explicit migration ADR is approved.

---

## [0.4.0] — 2026-10-16

### Added
- **F.8 — Projects Hub**
  - `state.projects[]` (additive, lazy-init)
  - `task.projectId` (nullable reference)
  - External module `app/residency/projects-ui.js` (R.projectsUI v1.3)
  - Shared dashboard card «پروژه‌ها و حسابداری»
  - Progress = done linked tasks / total linked tasks
  - Task auto-link from project detail (`openTaskFormForProject`)
  - HARD conflict message with previous task name + time range
  - Bell kind `project-deadline` (0–3 days ahead, up to 30 days past)
  - 29 persistent tests

- **F.9 + F.9.1 — Personal Finance**
  - `state.finance` ledger (transactions / categories / budgets / months / settings)
  - External module `app/residency/finance-ui.js` (R.financeUI v1.4)
  - Dual budget: `{ income, expense }` per `"YYYY/M"`; legacy numeric preserved
  - 30 default categories (8 income + 22 expense) with icons
  - Quick-add row + full transaction modal (mini calendar, category chips,
    live amount formatting)
  - Persian date display «شنبه ۲۵ مهر» with day navigation ‹ ›
  - Date-range filter (from/to)
  - Two donut charts (expense + income) + 6-month grouped bar chart
  - Hover tooltips on all chart segments
  - Month close / reopen with archive
  - Persian digits + Latin comma separator (e.g. `+ ۲،۵۰۰،۰۰۰`)
  - Owner-approved daily reminder: settings toggle + hour picker +
    bell kind `finance-daily` + 🔕 dismiss for today
  - 42 persistent tests

- **F.10 — Life & Leisure**
  - `state.life.items[]` (additive, lazy-init)
  - External module `app/residency/life-ui.js` (R.lifeUI v2.0.0)
  - 7 categories: فیلم / سریال / کتاب / قرار / فعالیت اجتماعی / سفر / سایر
  - 4 statuses: planned / in_progress / done / dropped
  - Rating (1–5), tags, notes
  - Task auto-link via `window.__lifeLinkPending` + `consumePendingLink`
  - Rich UI: hero card, tabs, filter chips, category accent cards
  - 30 persistent tests

- **DASHBOARD-UX-01 / UX-02 — Today-First Dashboard**
  - Removed stale «به زودی» badge on active Life card
  - Today's tasks + quick-add moved above the week strip
  - 2-column grid: «کارهای امروز» + «زمان‌های آزاد»
  - Compact banner: 4 pills → 3 pills + chip row

- **GREETING-COCKPIT**
  - Single compact greeting card replacing the old banner
  - Live clock (Persian digits + seconds)
  - 5 metric tiles: کار امروز / عقب‌مانده / کالری / هزینه امروز / تا کشیک
  - 3 quick actions: ثبت غذا / ثبت تراکنش / ثبت خواب
  - Metrics auto-hide when source data is absent (no fabricated zeros)
  - Rotation progress bar (1/3 width) with accent color from rotation
  - Animated halo background, pulsing clock dot, waving 👋,
    shine on progress bars, hover lift on tiles and buttons
  - `prefers-reduced-motion` respected

### Fixed
- Sleep quick-action from the greeting cockpit no longer locks the view.
  It now routes to `area-detail/sleep` first, then opens the form.
- Money formatter rounds values before inserting thousand separators
  (no more `724.297272727272`).
- Dashboard life card no longer displays the stale «به زودی» badge.

### Changed
- `data.js`: `income` card accent changed from purple to blue (`59,130,246`).
- `projects-ui.js`: hub opens to «حسابداری» tab by default.
- Dashboard banner compaction (fewer pills, chip row for context).

### Documentation
- `docs/CURRENT.md` — refreshed for v0.4.0
- `docs/HANDOFF.md` — refreshed for v0.4.0
- `docs/AGENT.md` — appended session update (Agent #15)
- `docs/ROADMAP.md` — appended DONE section for F.8 → F.10 + UX + Cockpit
- `docs/SCHEMA.md` — documented state.projects / state.finance / state.life

### Schema
- **v22 (unchanged)**. All new namespaces are lazy-init and additive.

### Tests
- Total: **463/463** across 18 suites (see HANDOFF.md for the full list).

---

## [0.3.0] — 2026-10-15

### Added
- F.7 — Sleep Hub (`state.sleep`, external module `sleep-ui.js`)
- F.6 / F.6c — Exercise UI (`workoutdb-ui.js`, `state.health.workoutLog`)
- F.5 — Notification Bell
- F.4 — Nutrition Trend + Day Navigation
- F.3 — Health Hub Banners
- F.2 — Food Logging UI (`fooddb-ui.js`)
- F.1 — Food.db read-only access layer (ASP.NET Core + Sqlite)

(For full earlier history see previous handoff documents
`docs/_bak-docs-*/HANDOFF.md`.)

---

## Unreleased / Next

See `docs/ROADMAP.md` for the current backlog.
The next proposed design task is **LIFE-AREAS-UX-01** (redesign of the
8 dashboard life-area cards).

## [0.4.1] — 2026-10-16

### Added
- Manual content entry for Study / Emergency / Procedures.
  Button «➕ محتوای دستی» next to program/proposed tabs.
  Fields: title + category + optional note. Appears directly in
  «برنامهی من» with ✎ icon.
- AI content generator «🤖 تولید با AI» with area-specific prompt.
  Three-step modal: copy prompt → paste JSON → commit.
  Auto-skip duplicates. Snapshot-free, additive to state.programContent[].

### Fixed
- `openContentTaskModal` referenced undefined `isEdit` — caused
  ReferenceError when clicking «برنامهریزی» on a content item.
- Sleep quick-action from greeting cockpit locked the view
  (now routes to area-detail/sleep first, then opens form).
- Life back-button robustness (hash + bridge dual path).
- Money formatter rounding.

### Changed
- Greeting cockpit: 3 pills + chip row (compact layout).
- Today-first dashboard section order.

## [0.4.2] — 2026-10-16

### Fixed
- Food logging not persisting (added items were written to a stale
  `window.INTERNSHIP_STATE` copy instead of the live `state` object;
  the success toast showed but state did not change).
- Favorites list in the food modal read from the same stale global.
- Added `state()` accessor to `__ioFdbBridge` in app.js.
- Replaced `window.INTERNSHIP_STATE` reads with `need().state()` in
  `fooddb-ui.js` (both `addSelected`, `addCustom`, and `favList`).

### Notes
- Root cause: `window.INTERNSHIP_STATE` is only the initial snapshot
  loaded from `data/state.js` at boot. The live object is `state`
  inside `app.js` IIFE. Any UI that wrote to the global snapshot had
  its changes invisible to `saveState()` and to the rest of the app.