# Session Handoff (2026-10-16 · v0.5.1)

## Status

Schema: v22 (no bump).
Version: **v0.5.1**.
Phase U (Auto-Update Infrastructure) complete. End-to-end verified.

## Session completed

- Git init + .gitignore + first commit
- GitHub remote (public): edrisshirvani1388-afk/internship-os
- Legacy backup branch `legacy-v0.3.0-zip-update`
- `release.iss` — Inno Setup template (parameterized)
- `release.ps1` — full release automation
- `release.cmd` — double-click wrapper
- Backend: check-update (manifest-aware) + apply-update (silent installer)
- Frontend: installerUrl + sha256 sent to backend
- Installer excludes `data\` → user data preserved
- v0.5.0 released + v0.5.1 released
- End-to-end test: v0.5.0 → v0.5.1 auto-update — PASS

## Files changed

- `release.iss` (NEW)
- `release.ps1` (NEW)
- `release.cmd` (NEW)
- `update.json` (NEW, generated per release)
- `server-dotnet/Program.cs` — check-update + apply-update rewritten
- `app/app.js` — installerUrl + sha256 payload
- `app/data.js` — updateUrl → manifest
- `.gitignore` (NEW)
- `VERSION`, `version.json` — bumped to 0.5.1
- `docs/AUTO-UPDATE.md` (NEW)
- `docs/DECISIONS.md` + ADR-059
- `docs/SCHEMA.md` + Auto-Update section
- `docs/ARCHITECTURE.md` + Auto-Update section
- `docs/ROADMAP.md` + Phase U
- `docs/CURRENT.md`, `docs/HANDOFF.md`

## Test baseline (F12)

All 18 suites green: 463/463 (unchanged from v0.4.2).

## Manual E2E test (PASS)

- v0.5.0 installed → «بررسی آپدیت» → «نسخه‌ی جدید: v0.5.1» →
  «دانلود و نصب» → silent install → app reopened at v0.5.1 →
  data/ intact.

## Do Not Touch

- `release.iss` AppId (breaks upgrade recognition)
- `release.iss` `Excludes: "data\*,data"` (user data)
- Manifest URL format (`releases/latest/download/update.json`)
- Registry path `{B8F3A9D5-2E4C-4A1B-9F5D-1C7E3B8A6F2D}_is1`
- All prior invariants (Food.db, snapshots, lazy-init, etc.)

## Known follow-ups

- No progress bar in update modal (ISSUE-XX)
- No code signing (SmartScreen warning on new machines)
- Versions < 0.5.1 must install v0.5.1 manually once
- Draft release cleanup on network failure (manual)

## Distribution

- GitHub Releases: https://github.com/edrisshirvani1388-afk/internship-os/releases
- Latest manifest: https://github.com/edrisshirvani1388-afk/internship-os/releases/latest/download/update.json
- Developer: double-click `release.cmd`, type version, done.