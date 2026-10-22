/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Recovery + Deadline Reserve v7
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.recovery.v7] R missing"); return; }
  var PR = R.plannerRecovery = R.plannerRecovery || {};
  var LIB = window.InternshipLib;

  var STRATEGIES = [
    "carry_forward","delete","redistribute",
    "next_day","end_of_week","end_of_round","end_of_month",
    "end_of_current_book","specific_date","next_N_days"
  ];
  PR.STRATEGIES = STRATEGIES;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _addDays(d, n) {
    if (!LIB || !LIB.date) return d;
    var p = LIB.date.parseJalali(d);
    if (!p) return d;
    var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
    return LIB.date.dateKey(r.jy, r.jm, r.jd);
  }

  PR.resolveStrategyWindow = function (strategy, plannerInput, executionAnalysis, options) {
    options = options || {};
    var today = _today();
    if (strategy === "next_day") return { start: _addDays(today, 1), end: _addDays(today, 1) };
    if (strategy === "next_N_days") {
      var n = parseInt(options.N, 10) || 5;
      return { start: _addDays(today, 1), end: _addDays(today, n) };
    }
    if (strategy === "end_of_week") return { start: _addDays(today, 1), end: _addDays(today, 6) };
    if (strategy === "end_of_round") {
      var maxDate = null;
      (plannerInput.rounds || []).forEach(function (r) {
        if (!r) return;
        if (executionAnalysis.affectedRoundIds && executionAnalysis.affectedRoundIds.indexOf(r.id) === -1) return;
        if (!maxDate || _cmp(r.endDate, maxDate) > 0) maxDate = r.endDate;
      });
      /* [PATCH:f4b17] fallback to examDate instead of arbitrary 30 days */
      if (!maxDate) {
        maxDate = (plannerInput.plan && plannerInput.plan.examDate) 
          ? plannerInput.plan.examDate 
          : _addDays(today, 60);
      }
      return { start: _addDays(today, 1), end: maxDate };
    }
    if (strategy === "end_of_month") {
      var p = LIB.date.parseJalali(today);
      if (p) {
        var len = LIB.date.jalaliMonthLength(p.jy, p.jm);
        var end = LIB.date.dateKey(p.jy, p.jm, len);
        return { start: _addDays(today, 1), end: end };
      }
    }
    if (strategy === "end_of_current_book") {
      var plan = plannerInput.plan;
      if (plan && plan.examDate) return { start: _addDays(today, 1), end: plan.examDate };
      return { start: _addDays(today, 1), end: _addDays(today, 60) };
    }
    if (strategy === "specific_date" && options.date) {
      return { start: options.date, end: options.date };
    }
    return { start: _addDays(today, 1), end: null };
  };

  PR.computeDeadlineReserve = function (plannerInput) {
    if (!plannerInput) return { totalHorizonMinutes: 0, poolMinutes: 0, consumedMinutes: 0, remainingMinutes: 0, status: "healthy", deadlineReservePercent: 10 };
    var settings = (plannerInput.settings && plannerInput.settings.reservePolicy) || {};
    var pct = (typeof settings.deadlineReservePercent === "number") ? settings.deadlineReservePercent : 10;

    var totalCap = 0;
    (plannerInput.calendar || []).forEach(function (c) { totalCap += (c.finalCapacityMinutes | 0); });
    var pool = Math.floor(totalCap * pct / 100);

    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    var consumed = 0;
    if (s && s.residency && s.residency.reserveState &&
        s.residency.reserveState.consumedByPlan &&
        typeof s.residency.reserveState.consumedByPlan[plannerInput.planId] === "number") {
      consumed = s.residency.reserveState.consumedByPlan[plannerInput.planId];
    }
    var remaining = Math.max(0, pool - consumed);

    var status = "healthy";
    if (remaining === 0) status = "exhausted";
    else if (remaining < pool * 0.3) status = "low";
    else if (consumed > 0) status = "consumed";

    return {
      totalHorizonMinutes: totalCap,
      poolMinutes: pool,
      consumedMinutes: consumed,
      remainingMinutes: remaining,
      status: status,
      deadlineReservePercent: pct
    };
  };

  /* ─── Phase 7.5: reserve from demands using pagesPerHour ─── */
  PR.reserveFromDemands = function (unmetByDemand, demandMap, defaultPagesPerHour) {
    var totalMin = 0;
    var diagnostics = [];
    var def = defaultPagesPerHour || 20;
    Object.keys(unmetByDemand || {}).forEach(function (dId) {
      var unmet = unmetByDemand[dId] | 0;
      if (unmet <= 0) return;
      var d = demandMap[dId];
      var rate = (d && d.pagesPerHour && d.pagesPerHour > 0) ? d.pagesPerHour : def;
      var mins = Math.ceil(unmet / rate * 60);
      totalMin += mins;
      diagnostics.push({ demandId: dId, unmetPages: unmet, pagesPerHour: rate, minutes: mins });
    });
    return { minutes: totalMin, diagnostics: diagnostics, fallbackUsed: diagnostics.some(function (x) { return x.pagesPerHour === def; }) };
  };

  /* ─── Phase 7.5: trigger detection ─── */
  PR.detectReplanTriggers = function (snapshot) {
    var triggers = [];
    if (!snapshot) return triggers;
    var PE = R.plannerExecution;
    var exec = PE && PE.analyzeExecution ? PE.analyzeExecution(snapshot) : null;
    if (!exec) return triggers;

    if (exec.missed.length > 0) {
      triggers.push({
        type: "missed_activity",
        severity: "warning",
        affectedDemandIds: (function () {
          var ids = {};
          exec.missed.forEach(function (m) { if (m.bookId && m.roundId) ids[m.bookId + "::" + m.roundId] = 1; });
          return Object.keys(ids);
        })(),
        count: exec.missed.length,
        totalMissedPages: exec.totalMissedPages
      });
    }
    if (exec.partial.length > 0) {
      triggers.push({
        type: "partial_activity",
        severity: "info",
        count: exec.partial.length,
        totalDeficitPages: exec.totalPartialDeficitPages
      });
    }
    var reserves = PR.computeDeadlineReserve(snapshot);
    if (reserves.status === "low") {
      triggers.push({ type: "reserve_low", severity: "warning", remainingMinutes: reserves.remainingMinutes, poolMinutes: reserves.poolMinutes });
    }
    if (reserves.status === "exhausted") {
      triggers.push({ type: "reserve_exhausted", severity: "error", remainingMinutes: 0 });
    }
    // deadline pressure: any demand whose estimated remaining minutes > remaining capacity until deadline
    var totalFutureCap = 0;
    (snapshot.calendar || []).forEach(function (c) { totalFutureCap += (c.finalCapacityMinutes | 0); });
    (snapshot.demands || []).forEach(function (d) {
      if (!d || (d.status !== "active" && d.status !== "optional")) return;
      if (d.estimatedRemainingMinutes > totalFutureCap) {
        triggers.push({ type: "deadline_pressure", severity: "warning", demandId: d.id, needed: d.estimatedRemainingMinutes, available: totalFutureCap });
      }
    });
    return triggers;
  };

  /* ─── Phase 7.5: minimal impact scope ─── */
  PR.computeMinimalScope = function (executionAnalysis, impact) {
    if (!executionAnalysis || !impact) return "plan";
    if (executionAnalysis.missed.length === 0 && executionAnalysis.partial.length === 0) return "plan";
    var affectedDates = executionAnalysis.affectedDates || [];
    var affectedRounds = executionAnalysis.affectedRoundIds || [];
    var affectedBooks = executionAnalysis.affectedBookIds || [];
    if (affectedDates.length === 1) return "day";
    if (affectedDates.length <= 7) return "date_range";
    if (affectedRounds.length === 1) return "round";
    if (affectedBooks.length === 1) return "book";
    return "plan";
  };

  /* ─── Phase 7.5: recovery quality metrics from a proposal ─── */
  PR.computeRecoveryMetrics = function (proposal) {
    if (!proposal) return null;

    // Phase 26.2: use finalSimulation when available (peak + completion from full simulated plan)
    var sim = proposal.finalSimulation || null;
    var peak = 0;
    var completionDate = null;
    var finalCount = 0;

    if (sim) {
      peak = sim.peakDailyMinutes | 0;
      completionDate = sim.completionDate || null;
      finalCount = sim.activityCount | 0;
    } else {
      // Fallback (backward compat): old behavior — proposed only
      var dailyMin = {};
      (proposal.proposedActivities || []).forEach(function (a) {
        if (!a || !a.plannedDate) return;
        dailyMin[a.plannedDate] = (dailyMin[a.plannedDate] || 0) + (a.plannedDurationMinutes | 0);
      });
      Object.keys(dailyMin).forEach(function (k) { if (dailyMin[k] > peak) peak = dailyMin[k]; });
      var dates = (proposal.proposedActivities || []).map(function (a) { return a.plannedDate; }).filter(Boolean).sort();
      completionDate = dates.length > 0 ? dates[dates.length - 1] : null;
      finalCount = (proposal.proposedActivities || []).length;
    }

    var warnings = (proposal.warnings || []).length;
    var hardBlocks = (proposal.deficits || []).filter(function (d) { return d.severity === "blocker" || d.severity === "error"; }).length;
    var softWarnings = (proposal.deficits || []).filter(function (d) { return d.severity === "warning"; }).length;
    var totalExtraMinutes = (proposal.statistics && proposal.statistics.proposedMinutes) || 0;
    var reserveConsumed = (proposal.reserve && proposal.reserve.consumedMinutes) || 0;
    var reserveRemaining = (proposal.reserve && proposal.reserve.afterMinutes) || 0;
    var unmetPages = (proposal.feasibility && proposal.feasibility.unmetPages) || 0;
    return {
      completionDate: completionDate,
      peakDailyMinutes: peak,
      finalActivityCount: finalCount,
      totalExtraMinutes: totalExtraMinutes,
      reserveConsumed: reserveConsumed,
      reserveRemaining: reserveRemaining,
      unmetPages: unmetPages,
      hardBlocks: hardBlocks,
      softWarnings: softWarnings,
      warnings: warnings,
      feasible: (proposal.feasibility && proposal.feasibility.status === "feasible") || false,
      feasibleWithWarnings: (proposal.feasibility && proposal.feasibility.status === "feasible_with_warnings") || false
    };
  };

  console.log("[planner.recovery.v7] loaded");
})();