/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Analysis / Validation Layer v8
   Deterministic derived metrics — pre-AI
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.analysis.v8] R missing"); return; }
  var A = R.aiAnalysis = R.aiAnalysis || {};
  var LIB = window.InternshipLib;

  function _int(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d || 0) : n; }
  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }

  /* ─── Derived metrics from planner input + allocation ─── */
  A.analyzePlanner = function (plannerInput, allocationResult) {
    if (!plannerInput) return null;
    var demands = plannerInput.demands || [];
    var targetPages = 0, studiedPages = 0, remainingPages = 0, remainingMinutes = 0;
    demands.forEach(function (d) {
      if (!d) return;
      if (d.status !== "active" && d.status !== "optional") return;
      targetPages += _int(d.targetPages, 0);
      studiedPages += _int(d.alreadyStudiedPages, 0);
      remainingPages += _int(d.remainingPages, 0);
      remainingMinutes += _int(d.estimatedRemainingMinutes, 0);
    });

    var totalCap = 0, totalAvail = 0;
    (plannerInput.calendar || []).forEach(function (c) {
      totalCap += _int(c.finalCapacityMinutes, 0);
      totalAvail += _int(c.availableCapacityMinutes, 0);
    });

    var allocatedPages = 0, allocatedMinutes = 0, unmetPages = 0;
    if (allocationResult && allocationResult.statistics) {
      allocatedPages = _int(allocationResult.statistics.allocatedPages, 0);
      allocatedMinutes = _int(allocationResult.statistics.allocatedMinutes, 0);
      unmetPages = _int(allocationResult.statistics.unmetPages, 0);
    }

    var feasible = totalAvail >= remainingMinutes;
    var projectedCompletion = studiedPages + allocatedPages;
    var coveragePct = targetPages > 0 ? Math.round(projectedCompletion / targetPages * 100) : 100;

    return {
      targetPages: targetPages,
      alreadyStudiedPages: studiedPages,
      remainingPages: remainingPages,
      remainingMinutes: remainingMinutes,
      totalCalendarCapacityMinutes: totalCap,
      allocatableMinutes: totalAvail,
      allocatedPages: allocatedPages,
      allocatedMinutes: allocatedMinutes,
      unmetPages: unmetPages,
      projectedCompletionPages: projectedCompletion,
      coveragePercent: coveragePct,
      feasible: feasible,
      demandsCount: demands.length,
      activeDemandsCount: demands.filter(function (d) { return d.status === "active"; }).length,
      optionalDemandsCount: demands.filter(function (d) { return d.status === "optional"; }).length,
      excludedDemandsCount: demands.filter(function (d) { return d.status === "excluded"; }).length,
      roundsCount: (plannerInput.rounds || []).length,
      booksCount: (plannerInput.books || []).length,
      constraintsCount: (plannerInput.constraints || []).length,
      overridesCount: (plannerInput.overrides || []).length,
      locksCount: (plannerInput.locks || []).length,
      source: "planner-analysis-v8"
    };
  };

  /* ─── Derived metrics from replanner data ─── */
  A.analyzeReplanner = function (exec, impact, comparisons) {
    if (!exec) return null;
    var totalMissed = _int(exec.totalMissedPages, 0);
    var totalMissedMin = _int(exec.totalMissedMinutes, 0);
    var totalPartialDeficit = _int(exec.totalPartialDeficitPages, 0);
    var totalRequired = totalMissed + totalPartialDeficit;

    var bestStrategy = null;
    if (Array.isArray(comparisons) && comparisons.length > 0) {
      var valid = comparisons.filter(function (c) { return !c.error && c.feasible; });
      if (valid.length > 0) {
        valid.sort(function (a, b) {
          if (a.reserveConsumed !== b.reserveConsumed) return a.reserveConsumed - b.reserveConsumed;
          if (a.peakDailyMinutes !== b.peakDailyMinutes) return a.peakDailyMinutes - b.peakDailyMinutes;
          return String(a.strategy).localeCompare(String(b.strategy));
        });
        bestStrategy = valid[0].strategy;
      }
    }

    return {
      missedCount: (exec.missed || []).length,
      partialCount: (exec.partial || []).length,
      overdueCount: (exec.overdue || []).length,
      skippedCount: (exec.skipped || []).length,
      totalMissedPages: totalMissed,
      totalMissedMinutes: totalMissedMin,
      totalPartialDeficitPages: totalPartialDeficit,
      totalRequiredRecoveryPages: totalRequired,
      protectedActivitiesCount: impact ? (impact.protectedActivityIds || []).length : 0,
      cancelableActivitiesCount: impact ? (impact.cancelableActivityIds || []).length : 0,
      affectedRoundsCount: impact ? (impact.affectedRoundIds || []).length : 0,
      affectedBooksCount: impact ? (impact.affectedBookIds || []).length : 0,
      minimalScope: impact ? impact.minimalScope : null,
      comparisonsCount: Array.isArray(comparisons) ? comparisons.length : 0,
      bestStrategyByMetric: bestStrategy,
      source: "replanner-analysis-v8"
    };
  };

  /* ─── Validation of AI-received metrics (sanity check) ─── */
  A.validateMetrics = function (metrics, kind) {
    var errs = [];
    if (!metrics) return ["metrics missing"];
    if (kind === "planner") {
      if (metrics.targetPages < 0) errs.push("targetPages negative");
      if (metrics.alreadyStudiedPages < 0) errs.push("studiedPages negative");
      if (metrics.remainingPages < 0) errs.push("remainingPages negative");
      if (metrics.coveragePercent < 0 || metrics.coveragePercent > 200) errs.push("coveragePercent out of range");
      // consistency
      var expectedRemaining = Math.max(0, metrics.targetPages - metrics.alreadyStudiedPages);
      // note: rounding tolerance
      if (Math.abs(expectedRemaining - metrics.remainingPages) > metrics.targetPages * 0.1 + 5) {
        errs.push("remainingPages inconsistent with target/studied");
      }
    } else if (kind === "replanner") {
      if (metrics.totalMissedPages < 0) errs.push("totalMissedPages negative");
      if (metrics.totalRequiredRecoveryPages < metrics.totalMissedPages) errs.push("recovery < missed");
    }
    return errs;
  };

  console.log("[ai.analysis.v8] loaded");
})();