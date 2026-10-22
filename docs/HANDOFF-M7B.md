# Session Handoff — Agent #20 → Agent #21 (M7-B)

Date: 2026-10-20
Schema: v22 (no bump). Version: v0.5.2 (no release).

## Completed this session — M7-B

### Phase A (stabilization)

- `_renderDayBlocksHTML` allAdded overwrite fixed
- Dedup skips cancelled/skipped blocks
- `_validateEdit` wired to save with capacity check
- Persian validation errors (no English)
- Native alert/confirm → `R.dialog.confirm` (7×)
- Added-section full rewrite (per-day detail + restore)

### Phase B (simplified Draft editor)

Per Design Agent Option 1 — source-only edit mode, no live preview:

**Edit mode:**
- Shows `_draftState.source` only
- Anchor by `_rtid` (stable, never startPage)
- `anchors[_rtid] = { pages, minutes }`
- Zero-page → removed + restore button
- No live preview, no cascade markers
- No warnings in edit mode

**Preview mode:**
- Fresh `I.buildInput` + anchors → `A.allocate`
- Read-only display
- Cascade visible (badges 🔒 / 🔄)
- Warnings only here

**Apply:**
- B5 belt-and-suspenders: per-day cap check
- `_result = { blocks, _fromDraft: true }` — no Timeline mutation
- Per-day add via checkbox (B9)
- Cancel = no-op

**Complete-book (B6):**
- `input.prioritizeBookId` in allocator
- Single-click banner → new preview

**Live cap display:**
- Header: `N ص / سقف M ص` red when `N > M`

## Test baseline

| Suite | Before M7-B | After M7-B |
|---|---|---|
| allocator | 25 | **43** |
| input | 44 | **44** |
| ui | 10 | **45** |
| **V7 total** | **79** | **132** |
| Regression standard | — | 637/637 |
| Regression legacy | — | 30/30 (noFlag) |

## Files changed

- `app/residency/planner-allocator-v7.js` (+`_allocateWithAnchors`, +`prioritizeBookId`, +18 tests)
- `app/residency/planner-study-ui-v7.js` (Draft rewrite, +35 tests net)

## Bugs found & fixed

1. All-added branch overwrite (BUG-A)
2. Dedup didn't skip cancelled (BUG-J)
3. Edit validation not wired (ISSUE-57)
4. English validation errors (ISSUE-69)
5. Dead "افزودن تکمیل" button (ISSUE-70)
6. Edit cascade inconsistent (ISSUE-67 — resolved by simplification)
7. Multi-edit reset (ISSUE-68 — resolved)
8. Restore not clearing zero-anchor
9. Over-cap anchor accepted (B5) — now blocked
10. Bulk-apply-on-confirm (B9) — now per-day

## Known limitations (by design)

1. Edit mode doesn't show cascade (visible in Preview only) — ISSUE-73
2. Preview shows only unallocated pages (green-box pages excluded) — ISSUE-74
3. Partial-day removal: partially removed day still receives allocation
4. `_draftRunLivePreview`/`_draftScheduleLivePreview` dead but not removed
5. `_draftComputeEffective` dead but not removed

## Frozen (unchanged)

- `round-scheduler-v22.js`, `store-*`, `domain-*`
- `planner-replan-apply-v7.js`
- `scheduling-conflict-v20.js` RULES
- Schema v22, migration chain
- `R.plannerUI.open(planId)` → V7
- `_legacyOpen` → v6-5
- `window.INTERNSHIP_STATE` read-only

## Next

- Awaiting Design Agent for release OR M7-C
- Release gate BLOCKED pending approval
- Before release: 667-baseline, CHANGELOG, VERSION bump, `release.ps1`