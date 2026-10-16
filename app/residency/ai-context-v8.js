/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Context v8 (Advisor Snapshots)
   Compact, deterministic, read-only snapshots for AI
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.context.v8] R missing"); return; }
  var C = R.aiContext = R.aiContext || {};

  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d || 0) : n; }
  function _num(v, d) { var n = parseFloat(v); return isNaN(n) ? (d || 0) : n; }
  function _slice(s, n) { return String(s || "").slice(0, n); }

  /* ─── Planner Snapshot ─── */
  C.snapshotPlanner = function (plannerInput, allocationResult) {
    if (!plannerInput) return null;

    var plan = plannerInput.plan || {};
    var rounds = (plannerInput.rounds || []).map(function (r) {
      return {
        id: r.id, title: _slice(r.title, 40), order: _int(r.order, 0),
        startDate: r.startDate, endDate: r.endDate,
        allocationMode: r.allocationMode || "algorithmic"
      };
    });

    var books = (plannerInput.books || []).map(function (b) {
      return {
        id: b.id, title: _slice(b.title, 60),
        subjectId: b.subjectId || null,
        totalPages: _int(b.totalPages, 0),
        priority: b.priority || "normal",
        status: b.status || "active"
      };
    });

    var demands = (plannerInput.demands || []).map(function (d) {
      return {
        id: d.id, bookId: d.bookId, roundId: d.roundId,
        totalPagesInBook: _int(d.totalPagesInBook, 0),
        targetPages: _int(d.targetPages, 0),
        alreadyStudiedPages: _int(d.alreadyStudiedPages, 0),
        remainingPages: _int(d.remainingPages, 0),
        overagePages: _int(d.overagePages, 0),
        pagesPerHour: _num(d.pagesPerHour, 20),
        estimatedRemainingMinutes: _int(d.estimatedRemainingMinutes, 0),
        studyOrder: d.studyOrder,
        bookPriority: d.bookPriority || "normal",
        mode: d.mode || "included",
        status: d.status || "active"
      };
    });

    var calendarCompact = [];
    if (plannerInput.calendar) {
      var byRound = {};
      plannerInput.calendar.forEach(function (c) {
        var key = c.roundId;
        if (!byRound[key]) byRound[key] = { roundId: key, days: 0, totalCap: 0, totalAvail: 0 };
        byRound[key].days++;
        byRound[key].totalCap += _int(c.finalCapacityMinutes, 0);
        byRound[key].totalAvail += _int(c.availableCapacityMinutes, 0);
      });
      calendarCompact = Object.keys(byRound).map(function (k) { return byRound[k]; });
    }

    var allocation = null;
    if (allocationResult) {
      allocation = {
        version: allocationResult.version || 1,
        mode: allocationResult.mode || "initial",
        scope: allocationResult.scope || "plan",
        dailySummary: {
          days: (allocationResult.daily || []).length,
          totalCapacityMinutes: (allocationResult.statistics && allocationResult.statistics.totalCapacityMinutes) || 0,
          committedMinutes: (allocationResult.statistics && allocationResult.statistics.committedMinutes) || 0,
          allocatableMinutes: (allocationResult.statistics && allocationResult.statistics.allocatableMinutes) || 0,
          allocatedMinutes: (allocationResult.statistics && allocationResult.statistics.allocatedMinutes) || 0,
          unusedMinutes: (allocationResult.statistics && allocationResult.statistics.unusedMinutes) || 0,
          allocatedPages: (allocationResult.statistics && allocationResult.statistics.allocatedPages) || 0,
          unmetPages: (allocationResult.statistics && allocationResult.statistics.unmetPages) || 0
        },
        feasibility: allocationResult.feasibility || { status: "not_checked" },
        demandSummary: (allocationResult.demandSummary || []).map(function (s) {
          return {
            demandId: s.demandId, enrollmentId: s.enrollmentId,
            requiredPages: _int(s.requiredPages, 0),
            allocatedPages: _int(s.allocatedPages, 0),
            unmetPages: _int(s.unmetPages, 0),
            coveragePercent: _int(s.coveragePercent, 0),
            skipped: !!s.skipped, skippedReason: s.skippedReason || null
          };
        }),
        deficits: (allocationResult.deficits || []).slice(0, 30).map(function (d) {
          return { type: d.type, severity: d.severity, demandId: d.demandId || null,
                   date: d.date || null, reason: d.reason || null };
        }),
        constraintEffects: (allocationResult.constraintEffects || []).slice(0, 30).map(function (e) {
          return { constraintId: e.constraintId, action: e.action, reason: e.reason,
                   demandId: e.demandId || null, date: e.date || null, strength: e.strength || null };
        })
      };
    }

    return {
      planId: plannerInput.planId,
      plan: { id: plan.id, title: _slice(plan.title, 60), examDate: plan.examDate || null, status: plan.status || "draft" },
      preferences: plannerInput.preferences || null,
      settings: plannerInput.settings || null,
      rounds: rounds,
      books: books,
      demands: demands,
      calendarSummary: calendarCompact,
      locks: (plannerInput.locks || []).length,
      constraints: (plannerInput.constraints || []).length,
      overrides: (plannerInput.overrides || []).length,
      allocation: allocation
    };
  };

  /* ─── Replanner Snapshot ─── */
  C.snapshotReplanner = function (execAnalysis, impact, comparisons, proposal) {
    if (!execAnalysis) return null;

    function _compactActivity(a) {
      return {
        id: a.id, bookId: a.bookId || null, roundId: a.roundId || null,
        plannedDate: a.plannedDate || null,
        plannedPages: _int(a.plannedPages, 0), actualPages: _int(a.actualPages, 0),
        plannedDurationMinutes: _int(a.plannedDurationMinutes, 0),
        actualDurationMinutes: _int(a.actualDurationMinutes, 0),
        pageDeficit: _int(a.pageDeficit, 0),
        state: a.state || "unknown",
        locked: !!a.locked
      };
    }

    var exec = {
      missed: (execAnalysis.missed || []).slice(0, 20).map(_compactActivity),
      partial: (execAnalysis.partial || []).slice(0, 20).map(_compactActivity),
      overdue: (execAnalysis.overdue || []).slice(0, 20).map(_compactActivity),
      skipped: (execAnalysis.skipped || []).slice(0, 20).map(_compactActivity),
      totalMissedPages: _int(execAnalysis.totalMissedPages, 0),
      totalMissedMinutes: _int(execAnalysis.totalMissedMinutes, 0),
      totalPartialDeficitPages: _int(execAnalysis.totalPartialDeficitPages, 0),
      totalPartialDeficitMinutes: _int(execAnalysis.totalPartialDeficitMinutes, 0),
      affectedBookIds: (execAnalysis.affectedBookIds || []).slice(0, 20),
      affectedRoundIds: (execAnalysis.affectedRoundIds || []).slice(0, 20),
      affectedDates: (execAnalysis.affectedDates || []).slice(0, 30)
    };

    var imp = null;
    if (impact) {
      imp = {
        affectedCount: (impact.affectedActivityIds || []).length,
        protectedCount: (impact.protectedActivityIds || []).length,
        cancelableCount: (impact.cancelableActivityIds || []).length,
        affectedRoundIds: (impact.affectedRoundIds || []).slice(0, 20),
        affectedBookIds: (impact.affectedBookIds || []).slice(0, 20),
        affectedDates: (impact.affectedDates || []).slice(0, 30),
        minimalScope: impact.minimalScope || null
      };
    }

    var comps = null;
    if (Array.isArray(comparisons)) {
      comps = comparisons.map(function (c) {
        if (c.error) return { strategy: c.strategy, error: _slice(c.error, 80) };
        return {
          strategy: c.strategy,
          feasible: !!c.feasible,
          recoveredPages: _int(c.recoveredPages, 0),
          recoveredMinutes: _int(c.recoveredMinutes, 0),
          reserveConsumed: _int(c.reserveConsumed, 0),
          reserveRemaining: _int(c.reserveRemaining, 0),
          completionDate: c.completionDate || null,
          peakDailyMinutes: _int(c.peakDailyMinutes, 0),
          totalExtraMinutes: _int(c.totalExtraMinutes, 0),
          unmetPages: _int(c.unmetPages, 0),
          hardBlocks: _int(c.hardBlocks, 0),
          softWarnings: _int(c.softWarnings, 0)
        };
      });
    }

    var prop = null;
    if (proposal) {
      prop = {
        proposalId: proposal.proposalId,
        mode: proposal.mode,
        strategy: proposal.strategy,
        preservedCount: (proposal.statistics && proposal.statistics.preservedCount) || 0,
        cancelledCount: (proposal.statistics && proposal.statistics.cancelledCount) || 0,
        proposedCount: (proposal.statistics && proposal.statistics.proposedCount) || 0,
        proposedPages: (proposal.statistics && proposal.statistics.proposedPages) || 0,
        proposedMinutes: (proposal.statistics && proposal.statistics.proposedMinutes) || 0,
        feasibility: proposal.feasibility || { status: "not_checked" },
        reserve: proposal.reserve || null,
        ignoredRules: (proposal.ignoredRules || []).length
      };
    }

    return {
      execution: exec,
      impact: imp,
      comparisons: comps,
      proposal: prop
    };
  };

  /* ─── Constraints Snapshot ─── */
  C.snapshotConstraints = function (plannerInput) {
    if (!plannerInput) return null;
    var cs = (plannerInput.constraints || []).map(function (c) {
      return {
        id: c.id, type: c.type, strength: c.strength,
        targetType: c.targetType, targetId: c.targetId || null,
        field: c.field || null, operator: c.operator || "eq",
        active: !!c.active, source: c.source || "user",
        startDate: c.startDate || null, endDate: c.endDate || null
      };
    });
    var ovs = (plannerInput.overrides || []).map(function (o) {
      return {
        id: o.id, targetType: o.targetType, targetId: o.targetId || null,
        field: o.field || null, operator: o.operator || "eq",
        scopeType: o.scopeType || null, strength: o.strength || "hard",
        startDate: o.startDate || null, endDate: o.endDate || null,
        active: !!o.active
      };
    });
    return {
      constraints: cs,
      overrides: ovs,
      hardCount: cs.filter(function (c) { return c.strength === "hard"; }).length,
      softCount: cs.filter(function (c) { return c.strength === "soft"; }).length,
      prefCount: cs.filter(function (c) { return c.strength === "preference"; }).length
    };
  };

  /* ─── Reserve Snapshot ─── */
  C.snapshotReserve = function (plannerInput) {
    if (!plannerInput || !R.plannerRecovery) return null;
    var r = R.plannerRecovery.computeDeadlineReserve(plannerInput);
    return {
      poolMinutes: _int(r.poolMinutes, 0),
      consumedMinutes: _int(r.consumedMinutes, 0),
      remainingMinutes: _int(r.remainingMinutes, 0),
      status: r.status || "healthy",
      deadlineReservePercent: _num(r.deadlineReservePercent, 10),
      exhausted: r.status === "exhausted",
      low: r.status === "low"
    };
  };

  console.log("[ai.context.v8] loaded");
})();