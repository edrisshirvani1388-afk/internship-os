# Session Handoff — Agent #19 → Agent #20

Date: 2026-10-19
Schema: v22 (no bump). Version: v0.5.2 (no release).

## Completed this session

### M5 — Incremental Replan

- Progress detection from `state.residency.activities[]` (completed = read, planned = allocated).
- Dedup key upgraded from `(day, book)` to `(day, book, pageRangeOverlap)` — critical bug fix.
- Day capacity reduced by planned activity minutes (`[PATCH:m5-daycap]`).
- Day locked (cap=0) when any planned activity exists (`[PATCH:m5-daylock]`).
- UI: breakdown bars per book, "why N unused" diagnostic, checkbox multi-select, Add-Selected / Add-All / Remove / Remove-All, min/max clamp, Persian dates.

### M6 — Final Integration

- `R.plannerUI.open` routes to V7 (idempotent, legacy preserved at `_legacyOpen`).
- Round-scoped planned activity exclusion (`[PATCH:m6-isolation]` + `[PATCH:m6-roundprop]`).
- Test T7 strengthened into T7a/T7b/T7c.
- 18/18 manual UI tests PASS.

## Test baseline

| Suite | Before M5 | After M6 |
|---|---|---|
| allocator | 25 | **25** |
| input | 33 | **41** |
| ui | 10 | **10** |
| **total** | **68** | **76** |

## Manual UI tests (18/18 PASS)

1. Open from normal route → V7 modal
2. `planId` correctly passed
3. Dev floating button hidden by default
4. Close (✕) works without error
5. Generate → Add day → no confirm dialog
6. Close → reopen → added day in green box
7. Regenerate → added day not in proposal
8. Add second day → both in green box
9. Remove day → returns to proposal
10. "از نو" → list refreshes
11. Checkbox + Add-Selected + Add-All
12. Min/max days + clamp (38-48)
13. Breakdown bar (read/allocated/available) + legend
14. "Why N unused" with sample dates
15. Persian date display (۲۷ مهر not 1405/7/27)
16. Back-to-settings button
17. Console clean (only `[V7] route switched` on boot)
18. Legacy fallback works

## Bugs found & fixed

1. Dedup key was `(day, book)` → false negatives → fixed to include pageRangeOverlap.
2. `_inputMeta` was null after Add (fixed order).
3. `_renderDayDiagHTML` was missing in `else` branch.
4. Route switch had duplicate dev button (fixed by cleanup).
5. T7 assertion too weak (`<=`) → split into T7a/T7b/T7c.

## Known limitations

1. Multiple enrollments for same book in same round → only one visible in `input.books` (design limit).
2. Old activities without `plannedPageStart/End` → progress not counted (conservative).
3. `_roundIdForBook` fallback → null when enrollment has wrong planId → conservative skip.

## Files changed

- `app/residency/planner-input-v7.js`
- `app/residency/planner-study-ui-v7.js`

## Next

- Await Design Agent for Milestone 7 OR release approval.
- Consider full 244-baseline regression before release.