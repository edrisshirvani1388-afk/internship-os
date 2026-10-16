# Current Project State

<!-- [PATCH:session-update-2026-10-16-v051] -->
## Session Update — 2026-10-16 · Version v0.5.1

**Schema:** v22 (no bump — additive only)
**Version:** v0.5.1
**Phase:** U (Auto-Update Infrastructure) complete.
**Awaiting:** Next feature directive.

### Version history
- v0.1.x — Residency foundation & scheduler
- v0.2.x — Health / Nutrition / Food.db / Workout
- v0.3.x — Sleep Hub
- v0.4.0 — Projects / Finance / Life & Leisure / Dashboard UX / Greeting Cockpit
- v0.4.1 — Manual content entry + AI content generator + bugfixes
- v0.4.2 — Food log fix + favorites fix
- **v0.5.0 — Release infra + GitHub setup + release.ps1/.iss/.cmd**
- **v0.5.1 — Auto-update installer-based (silent + SHA256 + registry path)**

### Completed v0.5.0 → v0.5.1

**Git + GitHub setup**
- git repo initialized (main branch)
- `.gitignore` for data/, server/, dist-*, *.bak*, node_modules/
- GitHub remote: `edrisshirvani1388-afk/internship-os` (public)
- Legacy branch `legacy-v0.3.0-zip-update` preserved

**Release infrastructure**
- `release.iss` — unified Inno Setup template (parameterized by /D)
- `release.ps1` — full release cycle (build → installer → push → gh release)
- `release.cmd` — double-click wrapper with version prompt
- `update.json` — manifest generated per release

**Backend update logic (server-dotnet/Program.cs)**
- `/api/check-update` reads installerUrl + sha256 + sizeBytes from manifest
- `/api/apply-update` — download → SHA256 verify → registry lookup →
  `/SILENT /NORESTART /SUPPRESSMSGBOXES /DIR=<prev-path>` → Exit(0)
- Install dir from `HKCU\...\Uninstall\{AppId}_is1\InstallLocation`
- Fallback: `%LOCALAPPDATA%\Programs\InternshipOS`

**Frontend (app/app.js)**
- Sends `{ installerUrl, newVersion, sha256 }` to backend
- Fallback: reads `zipUrl` if `installerUrl` missing (legacy)

**data.js**
- `updateUrl` → `https://github.com/.../releases/latest/download/update.json`

**Installer safety**
- `data\` excluded from wildcard copy — user data preserved
- Fresh install writes empty `state.js` and `ai-config.json`
  (onlyifdoesntexist)
- `CloseApplications=force`, `RestartApplications=no`, `UsePreviousAppDir=yes`
- `[Run]` without `skipifsilent` — re-launches after silent install

### Release artifacts

- v0.5.0: https://github.com/edrisshirvani1388-afk/internship-os/releases/tag/v0.5.0
- v0.5.1: https://github.com/edrisshirvani1388-afk/internship-os/releases/tag/v0.5.1
- Manifest: https://github.com/edrisshirvani1388-afk/internship-os/releases/latest/download/update.json

### Test baseline (F12 console) — 463/463 across 18 suites (unchanged)

### Do Not Change
- Food.db READ-ONLY
- foodLog / workoutLog / sleep-log snapshots
- state.projects / state.finance / state.life lazy-init
- Greeting cockpit metric sources
- finance-daily reminder (owner-approved)
- Sleep auto-task contract (per-day, _sleepAuto, _cont)
- Cross-midnight split (two tasks, one render-merge)
- No schema bump
- **Never write to `window.INTERNSHIP_STATE`** — use `need().state()`
- **release.iss must always exclude `data\`** — never touch user data
- **AppId is frozen** — changing it breaks upgrades

### Environment
- `window.INTERNSHIP_STATE` = initial snapshot loaded from data/state.js
  at boot. **Never write to it.** Live state is `state` inside app.js IIFE.
- Bridge pattern: `window.__io<X>Bridge` exposes `state()`, `save()`,
  `notify()`, `escapeHtml()`, `fa0/fa1/faNum()`, `todayJalali()`,
  `parseJalali()`, plus module-specific helpers.
- Release flow: `release.cmd` → prompt version → 1-2 min → done.
- Update flow (user): Settings → «بررسی آپدیت» → «دانلود و نصب» → auto.

<!-- [/PATCH:session-update-2026-10-16-v051] -->