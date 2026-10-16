# Current Project State

<!-- [PATCH:session-update-2026-10-16-v042] -->
## Session Update — 2026-10-16 · Version v0.4.2

**Schema:** v22 (no bump — additive only)
**Version:** v0.4.2
**Phase:** F.10 complete + Dashboard UX + Greeting Cockpit + Manual/AI content entry + food log fix.
**Awaiting:** Design Agent directive for next phase.

### Version history
- v0.1.x — Residency foundation & scheduler
- v0.2.x — Health / Nutrition / Food.db / Workout
- v0.3.x — Sleep Hub
- v0.4.0 — Projects / Finance / Life & Leisure / Dashboard UX / Greeting Cockpit
- v0.4.1 — Manual content entry + AI content generator + bugfixes
- **v0.4.2 — Food log fix + favorites fix**

### Completed v0.4.0 → v0.4.2

**F.8 — Projects Hub**
- state.projects[] + task.projectId (nullable)
- app/residency/projects-ui.js (R.projectsUI v1.3)
- Shared dashboard card «پروژه‌ها و حسابداری»
- Progress = done linked tasks / total linked tasks

**F.9 + F.9.1 — Personal Finance**
- state.finance ledger
- app/residency/finance-ui.js (R.financeUI v1.4)
- Dual budget, 30 default categories, quick-add, full drawer
- Persian date «شنبه ۲۵ مهر» + mini calendar + day nav
- Date-range filter, dual donuts, 6-month bars with hover tooltips
- Month close / reopen with archive
- Owner-approved daily reminder + bell kind «finance-daily» + 🔕

**F.10 — Life & Leisure**
- state.life.items[] + app/residency/life-ui.js (R.lifeUI v2.0.0)
- 7 categories, 4 statuses, rating, tags, notes
- Task auto-link via window.__lifeLinkPending + consumePendingLink

**DASHBOARD-UX-01 / UX-02**
- Removed stale «به زودی» badge
- Today tasks + quick-add moved up
- 2-column grid (today tasks + free windows)

**GREETING-COCKPIT**
- Compact card, live clock (Persian digits)
- 5 metrics: کار امروز / عقب‌مانده / کالری / هزینه امروز / تا کشیک
- 3 quick actions: food / finance / sleep
- Auto-hides empty metrics, no fabricated zeros
- Rotation progress bar (1/3 width) with accent from rotation.color
- Animated halo, pulsing clock dot, waving 👋, hover effects

**MANUAL CONTENT (v0.4.1)**
- «➕ محتوای دستی» button in Study / Emergency / Procedures
- Modal: title + category + optional note
- Saves directly to state.programContent[] with manual:true

**AI CONTENT (v0.4.1)**
- «🤖 تولید با AI» button
- 3-step modal: copy prompt → paste JSON → commit
- Area-specific prompt (uses category structure of the area)
- Auto-skip duplicates
- Saves to state.programContent[] with aiGenerated:true

**CRITICAL FIXES (v0.4.2)**
- Food logging now persists — was writing to a stale `window.INTERNSHIP_STATE`
  copy instead of the live `state` object.
  `fooddb-ui.js::addSelected` and `addCustom` and `favList` all fixed.
- `__ioFdbBridge` now exposes `state()` accessor.
- `openContentTaskModal` no longer references undefined `isEdit`
  (was ReferenceError from «برنامه‌ریزی» button in content areas).
- Sleep quick-action now routes correctly (no view lock).

### Test baseline (F12 console) — 463/463 across 18 suites
(sleepTests 60, workoutTests 32, healthTests 14, fooddbTests 12,
financeTests 42, projectsTests 29, lifeTests 30, schedulingProjection 32,
schedulingConflict 48, replanTrigger 39, roundScheduler 47,
plannerReplan 20, plannerReplanApply 16, plannerSchedule 9,
plannerAllocation 6, feasibilityFixtures 12, store 4, migrationV22 11)

### Do Not Change
- Food.db READ-ONLY
- foodLog / workoutLog / sleep-log snapshots
- state.projects / state.finance / state.life lazy-init
- Greeting cockpit metric sources
- finance-daily reminder (owner-approved)
- Sleep auto-task contract (per-day, _sleepAuto, _cont)
- Cross-midnight split (two tasks, one render-merge)
- No schema bump

### Environment
- `window.INTERNSHIP_STATE` = initial snapshot loaded from data/state.js at boot.
  **Never write to it.** The live object is `state` inside app.js IIFE.
  Every UI module must use `need().state()` (or equivalent bridge).
- Bridge pattern: `window.__io<X>Bridge` set by app.js, exposes
  `state()`, `save()`, `notify()`, `escapeHtml()`, `fa0/fa1/faNum()`,
  `todayJalali()`, `parseJalali()`, plus module-specific helpers.

<!-- [/PATCH:session-update-2026-10-16-v042] -->