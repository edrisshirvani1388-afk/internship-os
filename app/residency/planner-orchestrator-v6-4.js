/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Orchestrator v6.4
   Top-level: generateProposal + applyPlannerProposal
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.orchestrator.v6.4] R missing"); return; }
  var PO = R.plannerOrchestrator = R.plannerOrchestrator || {};

  PO.generateProposal = function (planId, options) {
    options = options || {};
    var snap = R.plannerSnapshot && R.plannerSnapshot.build
      ? R.plannerSnapshot.build(planId, options.scope || "plan", options.scopeParam)
      : null;
    if (!snap) return { ok: false, error: "snapshot_failed" };

    var constrained = R.plannerResolution && R.plannerResolution.runConstrainedAllocation
      ? R.plannerResolution.runConstrainedAllocation(snap, options)
      : null;
    if (!constrained) return { ok: false, error: "allocation_failed" };

    var proposal = R.plannerProposal && R.plannerProposal.buildProposal
      ? R.plannerProposal.buildProposal(snap, constrained, options)
      : null;
    if (!proposal) return { ok: false, error: "proposal_failed" };

    return { ok: true, proposal: proposal, snapshot: snap, allocationResult: constrained };
  };

  PO.applyProposal = function (proposal, options) {
    if (!R.plannerApply || !R.plannerApply.applyPlannerProposal) {
      return { success: false, reason: "apply_not_loaded" };
    }
    return R.plannerApply.applyPlannerProposal(proposal, options);
  };

  console.log("[planner.orchestrator.v6.4] loaded");
})();