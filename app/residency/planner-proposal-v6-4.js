/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Proposal Builder v6.4
   Fingerprint + Feasibility + Statistics + Build Proposal
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.proposal.v6.4] R missing"); return; }
  var PP = R.plannerProposal = R.plannerProposal || {};
  var PS = R.plannerSchedule;

  function _hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h &= 0xffffffff; }
    return Math.abs(h).toString(36);
  }
  function _mkId(prefix) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(prefix); } catch (e) {} }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  /* ─── Fingerprint of relevant planner state ─── */
  /* ─── Phase 0: fingerprint helpers (scheduling-relevant) ─── */
  function _fpState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _fpCmp(a, b) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date || !LIB.date.compareJalaliDate) return 0;
    return LIB.date.compareJalaliDate(a, b);
  }
  function _fpDateInRange(date, start, end) {
    if (!date) return false;
    if (start && _fpCmp(date, start) < 0) return false;
    if (end && _fpCmp(date, end) > 0) return false;
    return true;
  }
  function _fpPlanRange(plannerInput) {
    var start = null, end = null;
    (plannerInput.rounds || []).forEach(function (r) {
      if (!r) return;
      if (r.startDate && (!start || _fpCmp(r.startDate, start) < 0)) start = r.startDate;
      if (r.endDate && (!end || _fpCmp(r.endDate, end) > 0)) end = r.endDate;
    });
    if (plannerInput.plan && plannerInput.plan.examDate) {
      if (!end || _fpCmp(plannerInput.plan.examDate, end) > 0) end = plannerInput.plan.examDate;
    }
    return { start: start, end: end };
  }

  PP.computeFingerprint = function (plannerInput) {
    if (!plannerInput) return "";
    var parts = [];
    parts.push("plan=" + (plannerInput.planId || ""));
    parts.push("exam=" + ((plannerInput.plan && plannerInput.plan.examDate) || ""));

    var r0 = (plannerInput.rounds || []).map(function (r) {
      return [r.id, r.startDate, r.endDate, r.order, r.allocationMode].join("|");
    }).sort();
    parts.push("rounds=" + r0.join(";"));

    var e0 = (plannerInput.enrollments || []).map(function (e) {
      var bl = e.initialStudyBaseline;
      var blKey = "";
      if (bl && Array.isArray(bl.ranges) && bl.ranges.length > 0) {
        var rs = bl.ranges.map(function (r) { return (r.start | 0) + "-" + (r.end | 0); }).join(",");
        var sel = (bl.selectedRoundIds || []).slice().sort().join(",");
        blKey = "bl:" + bl.applyToRounds + ":" + rs + ":" + sel;
      }
      return [e.id, e.roundId, e.bookId, e.mode, e.targetCoveragePercent, e.studyOrder || "", blKey].join("|");
    }).sort();
    parts.push("enroll=" + e0.join(";"));

    var a0 = (plannerInput.activities || []).map(function (a) {
      var ranges = (a.actualPageRanges || []).map(function (r) { return r.start + "-" + r.end; }).join(",");
      return [a.id, a.status, a.plannedDate || "", a.plannedDurationMinutes || 0,
              a.actualDurationMinutes || 0, a.actualPages || 0, a.locked ? 1 : 0, ranges].join("|");
    }).sort();
    parts.push("act=" + a0.join(";"));

    var c0 = (plannerInput.constraints || []).map(function (c) {
      return [c.id, c.active ? 1 : 0, c.strength, c.type, c.targetType, c.targetId || "",
              JSON.stringify(c.value)].join("|");
    }).sort();
    parts.push("con=" + c0.join(";"));

    var o0 = (plannerInput.overrides || []).map(function (o) {
      return [o.id, o.active ? 1 : 0, o.strength, o.targetType, o.targetId || "", o.field || "",
              JSON.stringify(o.value)].join("|");
    }).sort();
    parts.push("ovr=" + o0.join(";"));

    // ─── Phase 0: schedule-relevant additions ───
    // Calendar (covers shifts + rotations.activitySchedule + capacityProfiles
    // + dayOverrides + weekdayDefaults indirectly)
    var cal0 = (plannerInput.calendar || []).map(function (c) {
      var shiftInfo = (c.shifts || []).map(function (sh) {
        return (sh.type || "") + ":" + (sh.startTime || "") + "-" + (sh.endTime || "");
      }).join(",");
      return [c.date, c.roundId, c.dayType,
              c.finalCapacityMinutes || 0,
              c.shiftDurationMinutes || 0,
              shiftInfo,
              (c.activeRotationIds || []).slice().sort().join(","),
              (c.lightRotationIds || []).slice().sort().join(",")].join("|");
    }).sort();
    parts.push("cal=" + cal0.join(";"));

    // Non-residency tasks with duration inside plan range
    var st = _fpState();
    if (st && Array.isArray(st.tasks)) {
      var range = _fpPlanRange(plannerInput);
      var t0 = st.tasks.filter(function (t) {
        if (!t) return false;
        if (t.sourceType === "residency_activity") return false;
        if (!t.date) return false;
        if (!t.durationMinutes || t.durationMinutes <= 0) return false;
        return _fpDateInRange(t.date, range.start, range.end);
      }).map(function (t) {
        return [t.id, t.date, t.time || "", t.durationMinutes || 0,
                t.completed ? 1 : 0, t.areaId || ""].join("|");
      }).sort();
      parts.push("task=" + t0.join(";"));
    }

    return _hash(parts.join("::"));
  };

  /* ─── Feasibility finalization ─── */
  PP.computeFeasibility = function (plannerInput, constrainedResult, proposedActivities, schedDeficits) {
    var targetPages = 0, alreadyStudied = 0, allocatedPages = 0;
    var requiredMinutes = 0, allocatedMinutes = 0;
    var scheduledPages = 0, scheduledMinutes = 0;

    (plannerInput.demands || []).forEach(function (d) {
      if (!d) return;
      if (d.status !== "active" && d.status !== "optional") return;
      targetPages += (d.targetPages | 0);
      alreadyStudied += (d.alreadyStudiedPages | 0);
      requiredMinutes += (d.estimatedRemainingMinutes | 0);
    });

    (constrainedResult.allocations || []).forEach(function (a) {
      if (!a) return;
      allocatedPages += (a.allocatedPages | 0);
      allocatedMinutes += (a.allocatedMinutes | 0);
    });

    (proposedActivities || []).forEach(function (a) {
      if (!a) return;
      scheduledPages += (a.plannedPages | 0);
      scheduledMinutes += (a.plannedDurationMinutes | 0);
    });

    var projectedCompletion = alreadyStudied + scheduledPages;
    var remainingAfterPlan = Math.max(0, targetPages - projectedCompletion);
    var unmetPages = Math.max(0, requiredMinutes > 0 ? (targetPages - alreadyStudied - scheduledPages) : 0);
    var unmetMinutes = Math.max(0, requiredMinutes - scheduledMinutes);

    var hasBlocker = (constrainedResult.deficits || []).some(function (d) {
      return d.severity === "blocker" || d.severity === "error";
    });

    // Phase 4: feasible capacity check (from calendar[].feasibleCapacityMinutes)
    var totalFeasible = 0;
    var hasFeasibleInfo = false;
    (plannerInput.calendar || []).forEach(function (c) {
      if (c && typeof c.feasibleCapacityMinutes === "number") {
        totalFeasible += c.feasibleCapacityMinutes;
        hasFeasibleInfo = true;
      }
    });
    var feasibleShortfall = hasFeasibleInfo && scheduledMinutes > totalFeasible
      ? (scheduledMinutes - totalFeasible) : 0;

    var status = "feasible";
    if (hasBlocker) status = "blocked_by_hard_constraint";
    else if (unmetPages > 0) status = "infeasible";
    else if (feasibleShortfall > 0) status = "infeasible";
    else if ((schedDeficits || []).length > 0 || (constrainedResult.warnings || []).length > 0) {
      status = "feasible_with_warnings";
    }

    return {
      status: status,
      requiredPages: targetPages,
      alreadyStudiedPages: alreadyStudied,
      plannedPages: scheduledPages,
      projectedCompletionPages: projectedCompletion,
      remainingAfterPlanPages: remainingAfterPlan,
      unmetPages: unmetPages,
      requiredMinutes: requiredMinutes,
      plannedMinutes: scheduledMinutes,
      allocatedMinutes: allocatedMinutes,
      unmetMinutes: unmetMinutes,
      feasibleCapacityMinutes: hasFeasibleInfo ? totalFeasible : null,
      feasibleShortfallMinutes: feasibleShortfall,
      coveragePercent: targetPages > 0
        ? Math.round(projectedCompletion / targetPages * 100)
        : 100
    };
  };

  /* ─── Phase 4: attach opportunity-window reason ─── */
  function _attachReasons(proposedActivities, plannerInput, constrainedResult) {
    if (!Array.isArray(proposedActivities)) return;
    if (!R.availabilityEngine || !R.availabilityEngine.findFreeWindowsFromState) return;
    var st = null;
    try {
      if (window.__os && window.__os.getState) st = window.__os.getState();
    } catch (e) {}

    proposedActivities.forEach(function (a) {
      if (!a || !a.plannedDate) return;
      var dur = a.plannedDurationMinutes || 0;

      var dailyRow = (constrainedResult.daily || []).find(function (d) {
        return d && d.date === a.plannedDate;
      });
      var allocatable = dailyRow ? (dailyRow.allocatableMinutes || 0) : 0;

      var windows = [];
      try {
        windows = st
          ? R.availabilityEngine.findFreeWindowsFromState(a.plannedDate, st, { minWindowMinutes: 15 })
          : [];
      } catch (e) {}

      if (windows.length === 0) {
        a.reason = {
          type: "no_window",
          text: "بدون پنجره‌ی آزاد در " + a.plannedDate
        };
        return;
      }

      var matched = null;
      for (var i = 0; i < windows.length; i++) {
        if (windows[i].minutes >= dur) { matched = windows[i]; break; }
      }
      if (!matched) matched = windows[0];

      a.reason = {
        type: "opportunity_window",
        text: "پنجره آزاد " + matched.start + "–" + matched.end +
              " (" + matched.minutes + " دقیقه)" +
              "؛ ظرفیت: " + allocatable + " دقیقه",
        windowStart: matched.start,
        windowEnd: matched.end,
        windowMinutes: matched.minutes,
        activityDuration: dur,
        feasibleCapacityBefore: allocatable,
        feasibleCapacityAfter: Math.max(0, allocatable - dur)
      };
    });
  }

  /* ─── Build full proposal ─── */
  PP.buildProposal = function (plannerInput, constrainedResult, options) {
    options = options || {};
    if (!plannerInput || !constrainedResult) return null;

    var proposalId = _mkId("prop");
    var fingerprint = PP.computeFingerprint(plannerInput);

    var sched = PS.generateSchedule(plannerInput, constrainedResult, proposalId, options);
    var proposedActivities = sched.activities || [];
    var schedDeficits = sched.deficits || [];

    var feasibility = PP.computeFeasibility(plannerInput, constrainedResult, proposedActivities, schedDeficits);

    try { _attachReasons(proposedActivities, plannerInput, constrainedResult); }
    catch (e) { console.warn("[proposal] reason attachment failed:", e); }

    var deficits = (constrainedResult.deficits || []).concat(schedDeficits);

    var statistics = {
      enrolledBooks: (plannerInput.books || []).length,
      plannedBooks: (function () {
        var s = {};
        proposedActivities.forEach(function (a) { s[a.bookId] = 1; });
        return Object.keys(s).length;
      })(),
      plannedActivities: proposedActivities.length,
      coveragePercent: feasibility.coveragePercent
    };

    return {
      version: 1,
      proposalId: proposalId,
      planId: plannerInput.planId,
      generatedAt: Date.now(),
      mode: plannerInput.mode,
      scope: plannerInput.scope,
      scopeParam: plannerInput.scopeParam,

      fingerprint: fingerprint,

      proposedActivities: proposedActivities,
      proposedTasks: [], // populated by task projector if needed

      feasibility: feasibility,
      conflicts: (constrainedResult.conflicts || []),
      warnings: (constrainedResult.warnings || []),

      deficits: deficits,
      statistics: statistics,

      // preserve constrained result for diagnostics
      allocationResult: {
        daily: constrainedResult.daily,
        allocations: constrainedResult.allocations,
        demandSummary: constrainedResult.demandSummary,
        constraintEffects: constrainedResult.constraintEffects || []
      }
    };
  };

  /* ─── Validate proposal structure ─── */
  PP.validateProposal = function (proposal) {
    var errs = [];
    if (!proposal || typeof proposal !== "object") return ["proposal is not object"];
    if (!proposal.proposalId) errs.push("proposalId required");
    if (!proposal.planId) errs.push("planId required");
    if (!proposal.fingerprint) errs.push("fingerprint required");
    if (!Array.isArray(proposal.proposedActivities)) errs.push("proposedActivities must be array");
    if (!proposal.feasibility || typeof proposal.feasibility !== "object") errs.push("feasibility required");
    // Validate each activity page-range invariant
    (proposal.proposedActivities || []).forEach(function (a, i) {
      if (!a) return;
      if (a.plannedPageStart != null && a.plannedPageEnd != null && a.plannedPages != null) {
        var expected = a.plannedPageEnd - a.plannedPageStart + 1;
        if (expected !== a.plannedPages) {
          errs.push("activity[" + i + "] page range mismatch: expected " + expected + " got " + a.plannedPages);
        }
      }
    });
    return errs;
  };

  console.log("[planner.proposal.v6.4] loaded");
})();