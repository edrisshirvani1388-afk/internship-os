# CHAT HANDOFF — Agent #11

## Context

You are Coding Agent #11 for Internship OS.
Entry point: `docs/AGENT.md`.

## Where We Are

- Schema v22 (no version bump).
- Phase 28.1 complete.
- All 173 tests PASS (7 suites).
- All 6 manual UI tests PASS in Phase 28.0 + 5/6 in Phase 28.1.
- No code changes pending.
- Awaiting Phase 28.2 contract from Design Agent.

## Frozen Modules

- app/residency/round-scheduler-v22.js
- app/residency/store-v2.js
- app/residency/store-v5.js
- app/residency/store-v10.js
- app/residency/domain-v2.js
- Replan apply atomicity contract (26.3)
- Trigger clearByIds contract
- AI boundary
- Migration chain
- app/residency/scheduling-conflict-v20.js RULES table
- `_getEffectiveItems` dedup semantics
- `_shouldBlockOverlap` policy-HARD enforcement

## Test Suites (F12 console)

- R.schedulingConflict.__tests()    —  36 tests
- R.plannerReplanApply.__tests()    —  16 tests
- R.plannerReplan.__tests()         —  20 tests
- R.replanTrigger.__tests()         —  39 tests
- R.roundScheduler.__tests()        —  47 tests
- R.store.__applyRoundsTests()      —   4 tests
- R.migrationV22.__tests()          —  11 tests
- TOTAL                             — 173 tests

## Ready For Next Phase

Per Design Agent. Proposed (order matters):

1. Phase 28.2 — Item-Level Policy Override (Minimal)
2. Phase 28.3 — Sleep/Rest/Food/Commute data model
3. Phase 28.4 — Unified Capacity engine
4. Phase 28.5 — Snake timeline start circle + arrows (specialist agent)
5. Phase 28.6 — Split styles.css

## Ground Rules

- Read docs/AGENT.md, ARCHITECTURE.md, CURRENT.md, HANDOFF.md first.
- Code = ultimate truth.
- Minimal change, additive, backward compatible.
- Backup before every file change (.bak-<phase>-<timestamp>).
- UTF-8 without BOM.
- No silent auto-fix, no bypass.
- Fail-closed.
- Tests must not mutate real state.
- Anchor ASCII only (never Persian with ZWNJ).
- Never use `$str.Replace($a, $b, 1)` — no count overload in PowerShell.
- Remove old CSS PATCH blocks BEFORE adding new ones.
- After drop, call `_ioRebuildAfterDrop()`, not just `render()`.
- Dashboard conflict feed must use `_getEffectiveItems`.
- `_shouldBlockOverlap` enforces HARD-only policy.

## Design Notes for Phase 28.2 (proposed, not approved)

### Item-Level Policy Override

Add optional field to `state.tasks[]`:

    overlap: null | "allow" | "warn" | "block"

Semantics:
- null → fallback to RULES lookup (current behavior)
- "allow" → always ALLOWED regardless of category pair
- "warn" → always WARNING
- "block" → always HARD

Mechanism:
- `CF.getPolicy(a, b, options)` reads `a.overlap || b.overlap` first.
  If both set, precedence is stricter (block > warn > allow).
- No schema bump. Field is nullable, additive.
- UI: checkbox group in `openTaskForm`.

Out of scope:
- Sleep/Food/Commute (Phase 28.3).
- Capacity changes.
- Replan re-open.

### Test surface (new)

CF.__tests extended:
- overlap="allow" → policy ALLOWED even for study|study
- overlap="block" → policy HARD even for case|case
- overlap=null → fallback to RULES
- one-sided override → override wins
- both overrides → stricter wins

Regression: 173 baseline + new tests.

## Continue

Ask Design Agent for the next phase contract before any code.