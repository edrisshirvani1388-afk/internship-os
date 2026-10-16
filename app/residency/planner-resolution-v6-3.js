/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Resolution Layer v6.3
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.resolution.v6.3] R missing"); return; }
  var PR = R.plannerResolution = R.plannerResolution || {};
  var PC = R.plannerConstraints;
  var PA = R.plannerAllocation;

  PR.runConstrainedAllocation = function (plannerInput, options) {
    options = options || {};
    if (!plannerInput || !PC || !PA) return null;

    var index = PC.buildRuleIndex(plannerInput);
    var preLedger = PA.buildCapacityLedger(plannerInput, options);
    var totalByRound = {};
    preLedger.daily.forEach(function (d) {
      totalByRound[d.roundId] = (totalByRound[d.roundId] || 0) + d.allocatableMinutes;
    });

    var effects = [], constraintDeficits = [], constraintWarnings = [];

    var filter = function (demand, day, proposedMinutes, meta) {
      meta = meta || {};
      var ctx = {
        planId: plannerInput.planId,
        roundId: demand.roundId,
        bookId: demand.bookId,
        subjectId: demand.subjectId,
        enrollmentId: demand.enrollmentId,
        demandId: demand.id,
        date: day.date,
        proposedMinutes: proposedMinutes,
        alreadyForDemand: meta.alreadyForDemand || 0,
        alreadyForDate: meta.alreadyForDate || 0,
        pagesPerHour: demand.pagesPerHour,
        totalRoundAllocatableMinutes: totalByRound[demand.roundId] || 0
      };
      var result = PC.evaluateCandidate(index, ctx);
      (result.effects || []).forEach(function (e) { effects.push(e); });
      (result.deficits || []).forEach(function (d) { constraintDeficits.push(d); });
      (result.warnings || []).forEach(function (w) { constraintWarnings.push(w); });
      return result;
    };

    var mergedOptions = {};
    Object.keys(options).forEach(function (k) { mergedOptions[k] = options[k]; });
    mergedOptions.constraintFilter = filter;

    var result = PA.runAllocation(plannerInput, mergedOptions);
    if (!result) return null;

    result.constraintEffects = effects;
    result.constraintDeficits = constraintDeficits;
    result.constraintWarnings = constraintWarnings;
    result.deficits = (result.deficits || []).concat(constraintDeficits);
    result.warnings = (result.warnings || []).concat(constraintWarnings);

    var hasBlocker = result.deficits.some(function (d) { return d.severity === "blocker" || d.severity === "error"; });
    var hasWarning = result.warnings.length > 0 || result.deficits.some(function (d) { return d.severity === "warning"; });
    var unmet = result.statistics ? result.statistics.unmetPages : 0;

    if (hasBlocker) result.feasibility = { status: "blocked_by_hard_constraint" };
    else if (unmet > 0) result.feasibility = { status: "infeasible", unmetPages: unmet };
    else if (hasWarning) result.feasibility = { status: "feasible_with_warnings" };
    else result.feasibility = { status: "feasible" };

    return result;
  };

  console.log("[planner.resolution.v6.3] loaded");
})();