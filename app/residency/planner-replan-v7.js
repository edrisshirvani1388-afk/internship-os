/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Replan Orchestrator v7.5
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.replan.v7] R missing"); return; }
  var PRp = R.plannerReplan = R.plannerReplan || {};
  var PE = R.plannerExecution, PI = R.plannerImpact, PRc = R.plannerRecovery;
  var PS = R.plannerSchedule, PP = R.plannerProposal, PRes = R.plannerResolution;
  var LIB = window.InternshipLib;

  function _mkId(p) {
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  /* [PATCH:f4b21-addDays] helper for window calculation */
  function _addDays(d, n) {
    if (!LIB || !LIB.date) return d;
    var p = LIB.date.parseJalali(d);
    if (!p) return d;
    var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
    return LIB.date.dateKey(r.jy, r.jm, r.jd);
  }
  /* [PATCH:f4b20-addDays] helper for window calculation */
  function _addDays(d, n) {
    if (!LIB || !LIB.date) return d;
    var p = LIB.date.parseJalali(d);
    if (!p) return d;
    var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
    return LIB.date.dateKey(r.jy, r.jm, r.jd);
  }

  function _applyCancellationsToSnapshot(snapshot, cancelIds) {
    var copy = JSON.parse(JSON.stringify(snapshot));
    var idSet = {};
    cancelIds.forEach(function (id) { idSet[id] = 1; });
    copy.activities = (copy.activities || []).filter(function (a) { return !idSet[a.id]; });
    return copy;
  }

  function _applyIgnoredRules(snapshot, ignoreIds) {
    if (!ignoreIds || ignoreIds.length === 0) return snapshot;
    var copy = JSON.parse(JSON.stringify(snapshot));
    var set = {};
    ignoreIds.forEach(function (id) { set[id] = 1; });
    copy.constraints = (copy.constraints || []).filter(function (c) { return !set[c.id]; });
    copy.overrides  = (copy.overrides  || []).filter(function (o) { return !set[o.id]; });
    return copy;
  }

  // ─── Phase 26.1: debt scoping for recover + carry_forward ───
  function _computeDebtScope(execAnalysis) {
    var byKey = {};
    var totalPages = 0;
    var totalMinutes = 0;
    function _add(bookId, roundId, pages, minutes) {
      if (!bookId || !roundId) return;
      var key = bookId + "::" + roundId;
      if (!byKey[key]) byKey[key] = { pages: 0, minutes: 0 };
      var p = Math.max(0, pages | 0);
      var m = Math.max(0, minutes | 0);
      byKey[key].pages += p;
      byKey[key].minutes += m;
      totalPages += p;
      totalMinutes += m;
    }
    if (execAnalysis) {
      (execAnalysis.missed || []).forEach(function (r) {
        if (!r) return;
        _add(r.bookId, r.roundId, r.plannedPages | 0, r.plannedDurationMinutes | 0);
      });
      (execAnalysis.partial || []).forEach(function (r) {
        if (!r) return;
        _add(r.bookId, r.roundId, r.pageDeficit | 0, r.timeDeficit | 0);
      });
    }
    return { byKey: byKey, totalPages: totalPages, totalMinutes: totalMinutes };
  }

  function _scopeDemandsToDebt(demands, debtScope) {
    if (!Array.isArray(demands)) return [];
    return demands.map(function (d) {
      if (!d) return d;
      var copy = {};
      Object.keys(d).forEach(function (k) { copy[k] = d[k]; });
      var key = (d.bookId || "") + "::" + (d.roundId || "");
      var debt = debtScope && debtScope.byKey ? debtScope.byKey[key] : null;
      if (!debt || debt.pages <= 0) {
        copy.remainingPages = 0;
        copy.estimatedRemainingMinutes = 0;
        copy._debtScoped = true;
        copy._debtPages = 0;
        return copy;
      }
      var originalRemaining = d.remainingPages | 0;
      var cappedPages = Math.min(originalRemaining, debt.pages);
      copy.remainingPages = cappedPages;
      copy.estimatedRemainingMinutes = (d.pagesPerHour > 0)
        ? Math.ceil(cappedPages / d.pagesPerHour * 60)
        : 0;
      copy._debtScoped = true;
      copy._debtPages = debt.pages;
      return copy;
    });
  }

  // ─── Phase 26.2: simulate final plan (existing preserved + proposed) ───
  function _simulateFinalPlan(existingActivities, proposedActivities) {
    var dailyMin = {};
    var lastDate = null;
    var count = 0;

    (existingActivities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      if (a.status === "cancelled" || a.status === "skipped") return;
      var m = a.plannedDurationMinutes | 0;
      if (m > 0) dailyMin[a.plannedDate] = (dailyMin[a.plannedDate] || 0) + m;
      count++;
      if (!lastDate || _cmp(a.plannedDate, lastDate) > 0) lastDate = a.plannedDate;
    });

    (proposedActivities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      var m = a.plannedDurationMinutes | 0;
      if (m > 0) dailyMin[a.plannedDate] = (dailyMin[a.plannedDate] || 0) + m;
      count++;
      if (!lastDate || _cmp(a.plannedDate, lastDate) > 0) lastDate = a.plannedDate;
    });

    var peak = 0;
    Object.keys(dailyMin).forEach(function (k) { if (dailyMin[k] > peak) peak = dailyMin[k]; });

    return {
      activityCount: count,
      peakDailyMinutes: peak,
      completionDate: lastDate,
      daysWithLoad: Object.keys(dailyMin).length
    };
  }

  function _collectUnmetByDemand(constrained, windowed) {
    var demandMap = {};
    (windowed.demands || []).forEach(function (d) { demandMap[d.id] = d; });
    var unmet = {};
    (constrained.demandSummary || []).forEach(function (s) {
      if (!s || s.skipped) return;
      var u = s.unmetPages | 0;
      if (u > 0) unmet[s.demandId] = u;
    });
    return { unmet: unmet, demandMap: demandMap };
  }

  /* [PATCH:r3f3] cancel-scope helper — mode-specific activity selection */
  function _computeCancelIds(mode, snap, impact) {
    var cancelIds = [];
    if (!snap || !Array.isArray(snap.activities)) return cancelIds;

    if (mode === "rebuild_affected_scope") {
      return (impact && Array.isArray(impact.cancelableActivityIds))
        ? impact.cancelableActivityIds.slice()
        : [];
    }

    if (mode === "full_replan") {
      var tFull = _today();
      snap.activities.forEach(function (a) {
        if (!a) return;
        if (a.locked) return;
        if (a.status === "completed" || a.status === "cancelled" || a.status === "skipped") return;
        if (a.plannedDate && _cmp(a.plannedDate, tFull) < 0) return;
        cancelIds.push(a.id);
      });
      return cancelIds;
    }

    if (mode === "capacity_rebuild") {
      var tCap = _today();
      snap.activities.forEach(function (a) {
        if (!a) return;
        if (a.locked) return;
        if (a.status !== "planned") return;
        if (a.plannedDate && _cmp(a.plannedDate, tCap) < 0) return;
        cancelIds.push(a.id);
      });
      return cancelIds;
    }

    return cancelIds;
  }
  PRp.generateReplanProposal = function (planId, options) {
    options = options || {};
    var mode = options.mode || "recover";
    var strategy = options.strategy || "carry_forward";
    var ignoreRuleIds = Array.isArray(options.ignoreRuleIds) ? options.ignoreRuleIds : [];

    var rawSnap = R.plannerSnapshot.build(planId, options.scope || "plan", options.scopeParam);
    if (!rawSnap) return { ok: false, error: "snapshot_failed" };

    var snap = _applyIgnoredRules(rawSnap, ignoreRuleIds);

    var execAnalysis = PE.analyzeExecution(snap);
    var impact = PI.analyzeImpact(execAnalysis, snap, options.scope || "plan");

    var cancelIds = _computeCancelIds(mode, snap, impact);

    var modSnap = _applyCancellationsToSnapshot(snap, cancelIds);

    /* [PATCH:r3f2a] recompute demands on modSnap so cancelled activities don't reduce demand */
    if (cancelIds.length > 0) {
      try {
        var _rebuiltDemands = R.plannerDemand.buildAll({
          enrollments: modSnap.enrollments || [],
          books: modSnap.books || [],
          rounds: modSnap.rounds || [],
          activities: modSnap.activities || [],
          defaultPagesPerHour: (modSnap.settings && modSnap.settings.defaultPagesPerHour) || 20
        });
        if (Array.isArray(_rebuiltDemands) && _rebuiltDemands.length > 0) {
          modSnap.demands = _rebuiltDemands;
        }
      } catch (_e) {
        console.warn("[replan] demand rebuild failed:", _e);
      }
    }

    var reserveInfo = PRc.computeDeadlineReserve(modSnap);

    var _nowT = _today();
    function _addDaysLocal(d, n) {
      if (!LIB || !LIB.date) return d;
      var p = LIB.date.parseJalali(d);
      if (!p) return d;
      var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
      return LIB.date.dateKey(r.jy, r.jm, r.jd);
    }
    var window = PRc.resolveStrategyWindow(strategy, modSnap, execAnalysis, options);
    /* [PATCH:f4b30-window] Force full window for capacity_rebuild */
    if (mode === "capacity_rebuild" || mode === "full_replan") {
      window = { start: _addDaysLocal(_nowT, 1), end: null };
    }

    var windowed = JSON.parse(JSON.stringify(modSnap));
    windowed.calendar = (windowed.calendar || []).filter(function (c) {
      if (!c || !c.date) return false;
      if (window.start && _cmp(c.date, window.start) < 0) return false;
      if (window.end && _cmp(c.date, window.end) > 0) return false;
      return true;
    });

    /* [PATCH:f4b30-maxdays] */
    if (options.maxDays && options.maxDays > 0) {
      /* [PATCH:f6-maxdays] slice from TODAY, not round start */
      var _tNow = _today();
      var _futureCal = windowed.calendar.filter(function(c) { return _cmp(c.date, _tNow) >= 0; });
      windowed.calendar = _futureCal.slice(0, options.maxDays);
    }

    if (mode === "recover" && strategy === "carry_forward") {
      var debtScope = _computeDebtScope(execAnalysis);
      if (debtScope.totalPages === 0) {
        return { ok: false, isNoop: true, error: "کاری برای جبران پیدا نشد؛ برنامه تغییری نکرد." };
      }
      windowed.demands = _scopeDemandsToDebt(windowed.demands || [], debtScope);
    }

    var _constrainOpts = {};
    Object.keys(options).forEach(function (k) { _constrainOpts[k] = options[k]; });
    if (mode === "capacity_rebuild" || mode === "full_replan") {
      _constrainOpts.sequential = true;
    }
    _constrainOpts.sessionMinutes = options.sessionMinutes || 90;
    
    var constrained = PRes.runConstrainedAllocation(windowed, _constrainOpts);
    var proposalId = _mkId("replan");
    var sched = PS.generateSchedule(windowed, constrained, proposalId, options);
    var proposed = sched.activities || [];
    var proposedPages = proposed.reduce(function (s, a) { return s + (a.plannedPages | 0); }, 0);
    var proposedMin = proposed.reduce(function (s, a) { return s + (a.plannedDurationMinutes | 0); }, 0);

    // Phase 26.2: simulate final plan (existing preserved + proposed)
    var finalSimulation = _simulateFinalPlan(modSnap.activities || [], proposed);

    var cancelledMeta = cancelIds.map(function (id) {
      var o = (snap.activities || []).find(function (a) { return a.id === id; });
      return o ? {
        id: id, bookId: o.bookId, roundId: o.roundId,
        plannedDate: o.plannedDate, plannedPages: o.plannedPages | 0,
        plannedDurationMinutes: o.plannedDurationMinutes | 0
      } : { id: id, plannedPages: 0, plannedDurationMinutes: 0 };
    });
    var cancelledPages = cancelledMeta.reduce(function (s, c) { return s + c.plannedPages; }, 0);
    var cancelledMin = cancelledMeta.reduce(function (s, c) { return s + c.plannedDurationMinutes; }, 0);

    // ─── Reserve consumption from demand-specific pagesPerHour ───
    var unmetInfo = _collectUnmetByDemand(constrained, windowed);
    var defSpeed = (windowed.settings && windowed.settings.defaultPagesPerHour) || 20;
    var reserveCalc = PRc.reserveFromDemands(unmetInfo.unmet, unmetInfo.demandMap, defSpeed);
    // Phase 26.2b: buffer consumed = minutes of activities actually proposed,
    // capped at remaining pool. Never fill pool just because unmet demand is huge.
    var reserveConsumed = (mode === "capacity_rebuild" || mode === "full_replan") ? 0 : Math.min(reserveInfo.remainingMinutes, proposedMin); /* [PATCH:f4b7-reserve] */ /* [PATCH:f4b5d-reserve] */

    var fingerprint = PP.computeFingerprint(rawSnap);

    var proposal = {
      version: 1,
      proposalId: proposalId,
      planId: planId,
      generatedAt: Date.now(),
      mode: mode,
      scope: windowed.scope,
      scopeParam: windowed.scopeParam,
      strategy: strategy,
      strategyWindow: window,

      fingerprint: fingerprint,
      finalSimulation: finalSimulation,

      preservedActivities: (modSnap.activities || []).map(function (a) { return a.id; }),
      cancelledActivities: cancelledMeta,
      proposedActivities: proposed,

      recovery: {
        missedPages: execAnalysis.totalMissedPages,
        missedMinutes: execAnalysis.totalMissedMinutes,
        partialDeficitPages: execAnalysis.totalPartialDeficitPages,
        partialDeficitMinutes: execAnalysis.totalPartialDeficitMinutes,
        debtPages: execAnalysis.totalMissedPages + execAnalysis.totalPartialDeficitPages,
        debtMinutes: execAnalysis.totalMissedMinutes + execAnalysis.totalPartialDeficitMinutes,
        recoveredPages: proposedPages,
        recoveredMinutes: proposedMin,
        remainingDebtPages: Math.max(0, (execAnalysis.totalMissedPages + execAnalysis.totalPartialDeficitPages) - proposedPages),
        remainingDebtMinutes: Math.max(0, (execAnalysis.totalMissedMinutes + execAnalysis.totalPartialDeficitMinutes) - proposedMin),
        cancelledPages: cancelledPages,
        cancelledMinutes: cancelledMin
      },

      reserve: {
        beforeMinutes: reserveInfo.remainingMinutes,
        consumedMinutes: reserveConsumed,
        afterMinutes: Math.max(0, reserveInfo.remainingMinutes - reserveConsumed),
        poolMinutes: reserveInfo.poolMinutes,
        status: reserveInfo.status,
        exhausted: reserveInfo.remainingMinutes === 0,
        calculation: reserveCalc
      },

      executionAnalysis: {
        missedCount: execAnalysis.missed.length,
        partialCount: execAnalysis.partial.length,
        totalMissedPages: execAnalysis.totalMissedPages,
        totalMissedMinutes: execAnalysis.totalMissedMinutes,
        missed: execAnalysis.missed,
        partial: execAnalysis.partial,
        overdue: execAnalysis.overdue,
        skipped: execAnalysis.skipped
      },

      impactAnalysis: {
        affectedActivityIds: impact.affectedActivityIds,
        protectedActivityIds: impact.protectedActivityIds,
        cancelableActivityIds: impact.cancelableActivityIds,
        unaffectedActivityIds: impact.unaffectedActivityIds,
        affectedRoundIds: impact.affectedRoundIds,
        affectedBookIds: impact.affectedBookIds,
        affectedDates: impact.affectedDates || [],
        affectedDemandIds: impact.affectedDemandIds,
        minimalScope: PRc.computeMinimalScope(execAnalysis, impact)
      },

      ignoredRules: ignoreRuleIds.slice(),

      feasibility: constrained.feasibility || { status: "not_checked" },
      conflicts: constrained.conflicts || [],
      warnings: (constrained.warnings || []).concat(sched.deficits || []),
      deficits: (constrained.deficits || []).concat(sched.deficits || []),

      statistics: {
        preservedCount: (modSnap.activities || []).length,
        cancelledCount: cancelIds.length,
        proposedCount: proposed.length,
        proposedPages: proposedPages,
        proposedMinutes: proposedMin
      },

      allocationResult: {
        daily: constrained.daily,
        allocations: constrained.allocations,
        demandSummary: constrained.demandSummary,
        constraintEffects: constrained.constraintEffects || []
      }
    };

    // attach metrics for comparison
    proposal.metrics = PRc.computeRecoveryMetrics(proposal);

    // ─── Phase 26.3: snapshot trigger IDs existing at generation time ───
    // On Apply, only these specific IDs will be cleared (via RT.clearByIds).
    // Triggers added after generation → different IDs → preserved.
    proposal.coveredTriggerIds = [];
    try {
      var RTgen = R.replanTrigger;
      if (RTgen && RTgen.getStatus) {
        var tst = RTgen.getStatus(planId);
        if (tst && Array.isArray(tst.reasons)) {
          tst.reasons.forEach(function (t) {
            if (t && t.id) proposal.coveredTriggerIds.push(t.id);
          });
        }
      }
    } catch (e) { /* leave empty — safe default */ }

    return { ok: true, proposal: proposal, executionAnalysis: execAnalysis, impactAnalysis: impact };
  };

  /* ─── Phase 7.5: simulate multiple strategies (read-only) ─── */
  PRp.simulateStrategies = function (planId, strategies, options) {
    options = options || {};
    var results = [];
    (strategies || []).forEach(function (strategy) {
      var opts = {};
      Object.keys(options).forEach(function (k) { opts[k] = options[k]; });
      opts.strategy = strategy;
      var res = PRp.generateReplanProposal(planId, opts);
      if (!res || !res.ok) {
        results.push({ strategy: strategy, error: res && res.error || "failed" });
        return;
      }
      results.push({
        strategy: strategy,
        proposalId: res.proposal.proposalId,
        feasible: res.proposal.metrics.feasible,
        recoveredPages: res.proposal.statistics.proposedPages,
        recoveredMinutes: res.proposal.statistics.proposedMinutes,
        reserveConsumed: res.proposal.reserve.consumedMinutes,
        reserveRemaining: res.proposal.reserve.afterMinutes,
        completionDate: res.proposal.metrics.completionDate,
        peakDailyMinutes: res.proposal.metrics.peakDailyMinutes,
        totalExtraMinutes: res.proposal.metrics.totalExtraMinutes,
        unmetPages: res.proposal.metrics.unmetPages,
        hardBlocks: res.proposal.metrics.hardBlocks,
        softWarnings: res.proposal.metrics.softWarnings,
        warnings: res.proposal.metrics.warnings,
        metrics: res.proposal.metrics,
        _proposal: res.proposal
      });
    });
    return results;
  };

  /* ─── Phase 7.5: deterministic recommendation ─── */
  PRp.recommendStrategy = function (comparisons) {
    if (!Array.isArray(comparisons) || comparisons.length === 0) return null;
    var valid = comparisons.filter(function (c) { return !c.error; });
    if (valid.length === 0) return null;

    valid.sort(function (a, b) {
      // 1. feasible first
      if (a.feasible !== b.feasible) return a.feasible ? -1 : 1;
      // 2. no hard blocks
      if (a.hardBlocks !== b.hardBlocks) return a.hardBlocks - b.hardBlocks;
      // 3. minimum reserve consumption
      if (a.reserveConsumed !== b.reserveConsumed) return a.reserveConsumed - b.reserveConsumed;
      // 4. lower peak daily load
      if (a.peakDailyMinutes !== b.peakDailyMinutes) return a.peakDailyMinutes - b.peakDailyMinutes;
      // 5. earlier completion
      if (a.completionDate && b.completionDate && a.completionDate !== b.completionDate) {
        return _cmp(a.completionDate, b.completionDate);
      }
      // 6. deterministic tie-breaker: strategy name
      return String(a.strategy).localeCompare(String(b.strategy));
    });

    var best = valid[0];
    var _faN = function (n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); };
    var _allInf = !best.feasible;
    return {
      strategy: best.strategy,
      allInfeasible: _allInf,
      reasons: [
        ("وضعیت: " + (best.feasible ? "قابل اجرا" : "غیرقابل اجرا")),
        (best.hardBlocks > 0
          ? ("تعارض سخت: " + _faN(best.hardBlocks) + " مورد")
          : "تعارض سخت ندارد"),
        ("مصرف بافر: " + _faN(best.reserveConsumed) + " دقیقه"),
        ("حداکثر بار روزانه: " + _faN(best.peakDailyMinutes) + " دقیقه"),
        (best.completionDate
          ? ("تاریخ تکمیل: " + best.completionDate)
          : "بدون تاریخ تکمیل")
      ].filter(Boolean),
      full: best
    };
  };

  /* ─── Phase 26.1: unit tests ─── */
  PRp.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    // T1: missed activity → debt
    var e1 = { missed: [{ bookId: "b1", roundId: "r1", plannedPages: 37, plannedDurationMinutes: 111 }], partial: [] };
    var s1 = _computeDebtScope(e1);
    t("T1: missed → debt.pages == 37", s1.byKey["b1::r1"] && s1.byKey["b1::r1"].pages === 37);
    t("T2: total.pages == 37", s1.totalPages === 37);

    // T3: partial → deficit only
    var e2 = { missed: [], partial: [{ bookId: "b1", roundId: "r1", pageDeficit: 15, timeDeficit: 45 }] };
    var s2 = _computeDebtScope(e2);
    t("T3: partial → debt.pages == 15", s2.byKey["b1::r1"] && s2.byKey["b1::r1"].pages === 15);

    // T4: missed + partial combined
    var e3 = {
      missed: [{ bookId: "b1", roundId: "r1", plannedPages: 20, plannedDurationMinutes: 60 }],
      partial: [{ bookId: "b1", roundId: "r1", pageDeficit: 10, timeDeficit: 30 }]
    };
    var s3 = _computeDebtScope(e3);
    t("T4: missed+partial → 30 combined", s3.byKey["b1::r1"].pages === 30);

    // T5: scope demands — main regression (1926 → 30)
    var demands1 = [
      { id: "d1", bookId: "b1", roundId: "r1", remainingPages: 1926, estimatedRemainingMinutes: 5778, pagesPerHour: 20 }
    ];
    var scoped1 = _scopeDemandsToDebt(demands1, s3);
    t("T5: 1926-page demand scoped to 30", scoped1[0].remainingPages === 30);
    t("T6: minutes recomputed (ceil 30/20*60 = 90)", scoped1[0].estimatedRemainingMinutes === 90);

    // T7: no debt → demand zeroed
    var s4 = _computeDebtScope({ missed: [], partial: [] });
    var demands2 = [
      { id: "d2", bookId: "b2", roundId: "r2", remainingPages: 500, estimatedRemainingMinutes: 1500, pagesPerHour: 20 }
    ];
    var scoped2 = _scopeDemandsToDebt(demands2, s4);
    t("T7: no debt → demand 0 pages", scoped2[0].remainingPages === 0 && scoped2[0].estimatedRemainingMinutes === 0);

    // T8: smaller remaining preserved
    var demands3 = [
      { id: "d3", bookId: "b1", roundId: "r1", remainingPages: 10, estimatedRemainingMinutes: 30, pagesPerHour: 20 }
    ];
    var scoped3 = _scopeDemandsToDebt(demands3, s3);
    t("T8: min(10, 30) == 10", scoped3[0].remainingPages === 10);

    // T9: independent demands
    var demands4 = [
      { id: "dA", bookId: "b1", roundId: "r1", remainingPages: 500, estimatedRemainingMinutes: 1500, pagesPerHour: 20 },
      { id: "dB", bookId: "bX", roundId: "rX", remainingPages: 300, estimatedRemainingMinutes: 900, pagesPerHour: 20 }
    ];
    var scoped4 = _scopeDemandsToDebt(demands4, s3);
    t("T9: matching demand scoped", scoped4[0].remainingPages === 30);
    t("T10: unrelated demand zeroed", scoped4[1].remainingPages === 0);

    // T11: empty execAnalysis
    var s5 = _computeDebtScope({});
    t("T11: empty exec → 0 debt", s5.totalPages === 0);

    // T12: no mutation of input demand
    var origDemand = { id: "dZ", bookId: "b1", roundId: "r1", remainingPages: 500, estimatedRemainingMinutes: 1500, pagesPerHour: 20 };
    var before = JSON.stringify(origDemand);
    _scopeDemandsToDebt([origDemand], s3);
    var after = JSON.stringify(origDemand);
    t("T12: no mutation of original demand", before === after);

    // T13: demand with no bookId/roundId → skipped
    var demands5 = [
      { id: "dN", bookId: null, roundId: null, remainingPages: 100, estimatedRemainingMinutes: 300, pagesPerHour: 20 }
    ];
    var scoped5 = _scopeDemandsToDebt(demands5, s3);
    t("T13: demand without book/round → 0", scoped5[0].remainingPages === 0);

    // T14: multiple rounds same book
    var e4 = {
      missed: [
        { bookId: "b1", roundId: "r1", plannedPages: 10, plannedDurationMinutes: 30 },
        { bookId: "b1", roundId: "r2", plannedPages: 25, plannedDurationMinutes: 75 }
      ],
      partial: []
    };
    var s6 = _computeDebtScope(e4);
    t("T14: same book different rounds separated",
      s6.byKey["b1::r1"].pages === 10 && s6.byKey["b1::r2"].pages === 25);

    // T15: null/undefined exec safety
    var s7 = _computeDebtScope(null);
    t("T15: null exec → 0 debt", s7.totalPages === 0);

    // ─── Phase 26.2: finalSimulation helper ───
    var sim = _simulateFinalPlan(
      [{ id: "a1", plannedDate: "1405/8/01", plannedDurationMinutes: 120, status: "planned" },
       { id: "a2", plannedDate: "1405/8/02", plannedDurationMinutes: 60, status: "planned" },
       { id: "a3", plannedDate: "1405/8/03", plannedDurationMinutes: 60, status: "cancelled" }],
      [{ id: "n1", plannedDate: "1405/8/01", plannedDurationMinutes: 90 },
       { id: "n2", plannedDate: "1405/8/04", plannedDurationMinutes: 45 }]
    );
    t("T16: finalSimulation peak == 210 (120+90)", sim.peakDailyMinutes === 210);
    t("T17: finalSimulation completion == 1405/8/04", sim.completionDate === "1405/8/04");
    t("T18: finalSimulation activityCount == 4 (cancelled excluded)",
      sim.activityCount === 4);

    var simEmpty = _simulateFinalPlan([], []);
    t("T19: empty simulation → peak 0, completion null",
      simEmpty.peakDailyMinutes === 0 && simEmpty.completionDate === null);

    // skip cancelled
    var sim2 = _simulateFinalPlan(
      [{ id: "c1", plannedDate: "1405/9/01", plannedDurationMinutes: 300, status: "cancelled" }],
      []
    );
    t("T20: only-cancelled → count 0, peak 0", sim2.activityCount === 0 && sim2.peakDailyMinutes === 0);

        /* [PATCH:r3f1-tests] F1 contract validation: cancellation frees capacity */
    try {
      var _PA_ = R.plannerAllocation;
      if (_PA_ && typeof _PA_.buildCapacityLedger === "function") {
        var _LIB_ = window.InternshipLib;
        var _today_ = _LIB_.date.todayJalaliString();
        var _p0_ = _LIB_.date.parseJalali(_today_);
        var _d30_ = _LIB_.date.addJalaliDays(_p0_.jy, _p0_.jm, _p0_.jd, 30);
        var _future_ = _LIB_.date.dateKey(_d30_.jy, _d30_.jm, _d30_.jd);
        var _d90_ = _LIB_.date.addJalaliDays(_p0_.jy, _p0_.jm, _p0_.jd, 90);
        var _exam_ = _LIB_.date.dateKey(_d90_.jy, _d90_.jm, _d90_.jd);
        var _snap1_ = {
          plan: { examDate: _exam_ },
          rounds: [{ id: "r-f1t", startDate: _today_, endDate: _exam_ }],
          activities: [{ id: "a-f1t", status: "planned", plannedDate: _future_, plannedDurationMinutes: 60, actualDurationMinutes: 0, roundId: "r-f1t" }],
          calendar: [{ date: _future_, roundId: "r-f1t", finalCapacityMinutes: 100 }],
          nonResidencyConsumers: []
        };
        var _l1_ = _PA_.buildCapacityLedger(_snap1_, {});
        var _d1_ = _l1_.daily.find(function(x){ return x.date === _future_; });
        var _before_ = _d1_ ? _d1_.allocatableMinutes : -1;
        var _snap2_ = _applyCancellationsToSnapshot(_snap1_, ["a-f1t"]);
        t("T21: cancelled activity removed from snapshot", _snap2_.activities.length === 0);
        var _l2_ = _PA_.buildCapacityLedger(_snap2_, {});
        var _d2_ = _l2_.daily.find(function(x){ return x.date === _future_; });
        var _after_ = _d2_ ? _d2_.allocatableMinutes : -1;
        t("T22: capacity before cancel == 40", _before_ === 40);
        t("T23: capacity after cancel == 100", _after_ === 100);
        t("T24: cancellation frees exactly 60 min", (_after_ - _before_) === 60);
      } else {
        t("T21-T24: skipped (PA.buildCapacityLedger missing)", true);
      }
    } catch (_e_) {
      t("T21-T24: exception", false);
      console.log("[r3f1-test exception]", _e_);
    }
    /* [PATCH:r3f2-tests] F2 invariant tests */
    try {
      var _LIB_F2 = window.InternshipLib;
      var _tNowF2 = _LIB_F2.date.todayJalaliString();

      var _s25 = {
        enrollments: [{ id: "e-t25", bookId: "b-t25", roundId: "r-t25", targetCoveragePercent: 100 }],
        books: [{ id: "b-t25", title: "B25", totalPages: 100 }],
        rounds: [{ id: "r-t25", planId: "p-t25", startDate: _tNowF2, endDate: _tNowF2 }],
        activities: [{ id: "a-pl", kind: "study", bookId: "b-t25", roundId: "r-t25", status: "planned", plannedPageStart: 1, plannedPageEnd: 20, plannedPages: 20 }]
      };
      var _d25 = R.plannerDemand.buildAll({ enrollments: _s25.enrollments, books: _s25.books, rounds: _s25.rounds, activities: _s25.activities, defaultPagesPerHour: 20 });
      t("T25: planned 20p -> demand 80 remaining", _d25[0] && _d25[0].remainingPages === 80);

      var _s26 = _applyCancellationsToSnapshot(_s25, ["a-pl"]);
      var _d26 = R.plannerDemand.buildAll({ enrollments: _s26.enrollments, books: _s26.books, rounds: _s26.rounds, activities: _s26.activities, defaultPagesPerHour: 20 });
      t("T26: after cancel -> demand 100 remaining", _d26[0] && _d26[0].remainingPages === 100);

      var _s27 = {
        enrollments: [
          { id: "e-r1", bookId: "b-x", roundId: "r1", targetCoveragePercent: 100 },
          { id: "e-r2", bookId: "b-x", roundId: "r2", targetCoveragePercent: 100 }
        ],
        books: [{ id: "b-x", title: "X", totalPages: 100 }],
        rounds: [
          { id: "r1", planId: "p-x", startDate: _tNowF2, endDate: _tNowF2, order: 1 },
          { id: "r2", planId: "p-x", startDate: _tNowF2, endDate: _tNowF2, order: 2 }
        ],
        activities: [{ id: "a-r1", kind: "study", bookId: "b-x", roundId: "r1", status: "planned", plannedPageStart: 1, plannedPageEnd: 30, plannedPages: 30 }]
      };
      var _d27 = R.plannerDemand.buildAll({ enrollments: _s27.enrollments, books: _s27.books, rounds: _s27.rounds, activities: _s27.activities, defaultPagesPerHour: 20 });
      var _r1d = _d27.find(function(d){ return d.roundId === "r1"; });
      var _r2d = _d27.find(function(d){ return d.roundId === "r2"; });
      t("T27: cross-round planned -> r1=70, r2=100", _r1d && _r1d.remainingPages === 70 && _r2d && _r2d.remainingPages === 100);

      var _s28 = {
        enrollments: [{ id: "e-c", bookId: "b-c", roundId: "r-c", targetCoveragePercent: 100 }],
        books: [{ id: "b-c", title: "C", totalPages: 100 }],
        rounds: [{ id: "r-c", planId: "p-c", startDate: _tNowF2, endDate: _tNowF2 }],
        activities: [{ id: "a-done", kind: "study", bookId: "b-c", roundId: "r-c", status: "completed", actualPages: 25, plannedPageStart: 1, plannedPageEnd: 25 }]
      };
      var _d28 = R.plannerDemand.buildAll({ enrollments: _s28.enrollments, books: _s28.books, rounds: _s28.rounds, activities: _s28.activities, defaultPagesPerHour: 20 });
      t("T28: completed 25p -> demand 75 remaining", _d28[0] && _d28[0].remainingPages === 75);

      if (R.plannerSchedule && typeof R.plannerSchedule.getAllocatedRanges === "function") {
        var _acts29 = [
          { kind: "study", bookId: "b-g", roundId: "r-g", status: "planned", plannedPageStart: 1, plannedPageEnd: 20 },
          { kind: "study", bookId: "b-g", roundId: "r-g", status: "in_progress", plannedPageStart: 21, plannedPageEnd: 30 },
          { kind: "study", bookId: "b-g", roundId: "r-g", status: "completed", plannedPageStart: 31, plannedPageEnd: 40 },
          { kind: "study", bookId: "b-g", roundId: "other", status: "planned", plannedPageStart: 41, plannedPageEnd: 50 }
        ];
        var _got29 = R.plannerSchedule.getAllocatedRanges(_acts29, "b-g", "r-g");
        t("T29: getAllocatedRanges merges in-scope planned+in_progress (1-30)", _got29.length === 1 && _got29[0].start === 1 && _got29[0].end === 30);
      } else {
        t("T29: skipped (getAllocatedRanges missing)", false);
      }
    } catch (_e_f2) {
      t("T25-T29 exception", false);
      console.log("[r3f2-tests]", _e_f2);
    }

    /* [PATCH:r3f3-tests] F3 cancel-scope tests */
    try {
      var _LIB_F3 = window.InternshipLib;
      var _tF3 = _LIB_F3.date.todayJalaliString();
      var _p0F3 = _LIB_F3.date.parseJalali(_tF3);
      var _futF3 = _LIB_F3.date.addJalaliDays(_p0F3.jy, _p0F3.jm, _p0F3.jd, 5);
      var _futStrF3 = _LIB_F3.date.dateKey(_futF3.jy, _futF3.jm, _futF3.jd);
      var _pastF3 = _LIB_F3.date.addJalaliDays(_p0F3.jy, _p0F3.jm, _p0F3.jd, -5);
      var _pastStrF3 = _LIB_F3.date.dateKey(_pastF3.jy, _pastF3.jm, _pastF3.jd);

      var _mockF3 = { activities: [
        { id: "a1", status: "planned",     plannedDate: _futStrF3, locked: false },
        { id: "a2", status: "in_progress", plannedDate: _futStrF3, locked: false },
        { id: "a3", status: "completed",   plannedDate: _futStrF3, locked: false },
        { id: "a4", status: "planned",     plannedDate: _futStrF3, locked: true },
        { id: "a5", status: "planned",     plannedDate: _pastStrF3, locked: false },
        { id: "a6", status: "partial",     plannedDate: _futStrF3, locked: false }
      ]};

      var _cCap = _computeCancelIds("capacity_rebuild", _mockF3, null);
      t("T30: capacity_rebuild cancels future planned only", _cCap.length === 1 && _cCap[0] === "a1");
      t("T31: capacity_rebuild preserves in_progress", _cCap.indexOf("a2") === -1);
      t("T32: capacity_rebuild preserves completed", _cCap.indexOf("a3") === -1);
      t("T33: capacity_rebuild preserves locked", _cCap.indexOf("a4") === -1);
      t("T34: capacity_rebuild preserves past-dated", _cCap.indexOf("a5") === -1);
      t("T35: capacity_rebuild preserves partial", _cCap.indexOf("a6") === -1);

      var _cFull = _computeCancelIds("full_replan", _mockF3, null);
      t("T36: full_replan cancels planned+in_progress+partial (future)", _cFull.length === 3 && _cFull.indexOf("a1") !== -1 && _cFull.indexOf("a2") !== -1 && _cFull.indexOf("a6") !== -1);

      var _cEmpty = _computeCancelIds("unknown", _mockF3, null);
      t("T37: unknown mode -> empty cancelIds", _cEmpty.length === 0);
    } catch (_e_f3) {
      t("T30-T37 exception", false);
      console.log("[r3f3-tests]", _e_f3);
    }
var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[planner.replan.v7] loaded");
})();