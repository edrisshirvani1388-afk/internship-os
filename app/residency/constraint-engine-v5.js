/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Constraint Engine v5 (Phase 5)
   Applicability, Conflicts, Feasibility — Pure Functions
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.constraint-engine.v5] R missing"); return; }
  var CE = R.constraintEngine = R.constraintEngine || {};

  function _state() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _cmp(a, b) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return 0;
    return LIB.date.compareJalaliDate(a, b);
  }

  // ─── Applicability: constraints matching filters ───
  function _matchesDateRange(item, date) {
    if (!date) return true;
    if (item.startDate && _cmp(date, item.startDate) < 0) return false;
    if (item.endDate && _cmp(item.endDate, date) < 0) return false;
    return true;
  }
  function _matchesTarget(item, targetType, targetId) {
    if (!targetType) return true;
    if (item.targetType !== targetType) return false;
    if (targetId == null) return true;
    return item.targetId === targetId;
  }

  CE.getConstraints = function (filter) {
    var s = _state();
    if (!s || !s.residency || !Array.isArray(s.residency.constraints)) return [];
    filter = filter || {};
    return s.residency.constraints.filter(function (c) {
      if (!c) return false;
      if (filter.planId != null && c.planId !== filter.planId) return false;
      if (filter.active != null && !!c.active !== !!filter.active) return false;
      if (filter.strength && c.strength !== filter.strength) return false;
      if (filter.targetType && c.targetType !== filter.targetType) return false;
      if (filter.targetId != null && c.targetId !== filter.targetId) return false;
      if (filter.date && !_matchesDateRange(c, filter.date)) return false;
      return true;
    });
  };

  CE.getOverrides = function (filter) {
    var s = _state();
    if (!s || !s.residency || !Array.isArray(s.residency.manualOverrides)) return [];
    filter = filter || {};
    return s.residency.manualOverrides.filter(function (o) {
      if (!o) return false;
      if (filter.active != null && !!o.active !== !!filter.active) return false;
      if (filter.strength && o.strength !== filter.strength) return false;
      if (filter.targetType && o.targetType !== filter.targetType) return false;
      if (filter.targetId != null && o.targetId !== filter.targetId) return false;
      if (filter.date && !_matchesDateRange(o, filter.date)) return false;
      return true;
    });
  };

  // ─── getApplicableConstraints ───
  CE.getApplicableConstraints = function (planId, date, context) {
    context = context || {};
    var out = { hard: [], soft: [], preferences: [], locks: [], overrides: [], conflicts: [] };
    var s = _state();
    if (!s || !s.residency) return out;

    var constraints = CE.getConstraints({ active: true });
    constraints.forEach(function (c) {
      if (planId && c.planId && c.planId !== planId) return;
      if (date && !_matchesDateRange(c, date)) return;
      if (context.targetType && !_matchesTarget(c, context.targetType, context.targetId)) return;
      if (c.strength === "hard") out.hard.push(c);
      else if (c.strength === "soft") out.soft.push(c);
      else out.preferences.push(c);
    });

    var overrides = CE.getOverrides({ active: true });
    overrides.forEach(function (o) {
      if (date && !_matchesDateRange(o, date)) return;
      if (context.targetType && !_matchesTarget(o, context.targetType, context.targetId)) return;
      if (o.strength === "hard") out.hard.push(o);
      else if (o.strength === "soft") out.soft.push(o);
      else out.preferences.push(o);
      out.overrides.push(o);
    });

    // Implicit locks from activities in this plan
    if (Array.isArray(s.residency.activities)) {
      s.residency.activities.forEach(function (a) {
        if (!a) return;
        if (planId && a.planId && a.planId !== planId) return;
        if (a.locked) {
          out.locks.push({ targetType: "activity", targetId: a.id, reason: "locked_by_user" });
        } else if (a.status === "completed") {
          out.locks.push({ targetType: "activity", targetId: a.id, reason: "completed_protected" });
        } else if (CE._isPast(a)) {
          out.locks.push({ targetType: "activity", targetId: a.id, reason: "past_protected" });
        }
      });
    }

    out.conflicts = CE.detectConflicts(out);
    return out;
  };

  CE._isPast = function (activity) {
    if (!activity || !activity.plannedDate) return false;
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return false;
    var today = LIB.date.todayJalaliString();
    return LIB.date.compareJalaliDate(activity.plannedDate, today) < 0;
  };

  CE.getActivityConstraints = function (activityId) {
    return CE.getConstraints({ targetType: "activity", targetId: activityId, active: true })
      .concat(CE.getOverrides({ targetType: "activity", targetId: activityId, active: true }));
  };
  CE.getBookConstraints = function (bookId, roundId) {
    return CE.getConstraints({ targetType: "book", targetId: bookId, active: true })
      .concat(CE.getOverrides({ targetType: "book", targetId: bookId, active: true }));
  };
  CE.getRoundConstraints = function (roundId) {
    return CE.getConstraints({ targetType: "round", targetId: roundId, active: true })
      .concat(CE.getOverrides({ targetType: "round", targetId: roundId, active: true }));
  };
  CE.getDateConstraints = function (date, planId) {
    return CE.getConstraints({ date: date, active: true })
      .concat(CE.getOverrides({ date: date, active: true }))
      .filter(function (x) { return !planId || !x.planId || x.planId === planId; });
  };

  // ─── Conflict Detection ───
  CE.detectConflicts = function (bucket) {
    var items = (bucket.hard || []).concat(bucket.soft || []).concat(bucket.preferences || []);
    var conflicts = [];
    for (var i = 0; i < items.length; i++) {
      for (var j = i + 1; j < items.length; j++) {
        var a = items[i], b = items[j];
        if (!a || !b) continue;
        if (a.targetType !== b.targetType) continue;
        if (a.targetId !== b.targetId) continue;
        if (a.field !== b.field) continue;
        var aVal = JSON.stringify(a.value);
        var bVal = JSON.stringify(b.value);
        if (aVal === bVal) continue; // identical → no conflict
        var classKey = _classifyConflict(a, b);
        conflicts.push({
          type: "constraint_conflict",
          constraintIds: [a.id, b.id],
          targetType: a.targetType,
          targetId: a.targetId,
          field: a.field,
          class: classKey,
          severity: R.getConflictSeverity(classKey),
          reason: "same target/field, different values"
        });
      }
    }
    return conflicts;
  };

  function _classifyConflict(a, b) {
    var ah = a.strength === "hard";
    var bh = b.strength === "hard";
    var ao = !!a.source && a.source !== "system" && (a.value !== undefined);
    var bo = !!b.source && b.source !== "system" && (b.value !== undefined);
    if (ah && bh) return "hard_hard";
    if (ah || bh) return "hard_soft";
    return "soft_soft";
  }

  CE.detectConstraintConflicts = function (planId) {
    var list = CE.getConstraints({ planId: planId, active: true });
    return CE.detectConflicts({
      hard: list.filter(function (c) { return c.strength === "hard"; }),
      soft: list.filter(function (c) { return c.strength === "soft"; }),
      preferences: list.filter(function (c) { return c.strength === "preference"; })
    });
  };

  CE.detectOverrideConflicts = function (planId) {
    var list = CE.getOverrides({ active: true })
      .filter(function (o) { return !planId || !o.planId || o.planId === planId; });
    return CE.detectConflicts({
      hard: list.filter(function (o) { return o.strength === "hard"; }),
      soft: list.filter(function (o) { return o.strength === "soft"; }),
      preferences: list.filter(function (o) { return o.strength === "preference"; })
    });
  };

  CE.detectAllConflicts = function (planId) {
    return CE.detectConstraintConflicts(planId).concat(CE.detectOverrideConflicts(planId));
  };

  // ─── Feasibility ───
  CE.checkConstraintFeasibility = function (planId, options) {
    options = options || {};
    var report = { feasible: true, errors: [], warnings: [], info: [] };
    var conflicts = CE.detectAllConflicts(planId);
    conflicts.forEach(function (c) {
      if (c.severity === "error") report.errors.push(c);
      else if (c.severity === "warning") report.warnings.push(c);
      else report.info.push(c);
    });
    // Deadline infeasibility — check if deadline < today
    var s = _state();
    if (s && s.residency && Array.isArray(s.residency.plans)) {
      var plan = s.residency.plans.find(function (p) { return p && p.id === planId; });
      if (plan && plan.examDate) {
        var LIB = window.InternshipLib;
        var today = LIB && LIB.date ? LIB.date.todayJalaliString() : "";
        if (today && LIB.date.compareJalaliDate(plan.examDate, today) < 0) {
          report.errors.push({
            type: "deadline_in_past",
            examDate: plan.examDate,
            reason: "Exam date is in the past"
          });
        }
      }
    }
    if (report.errors.length > 0) report.feasible = false;
    return report;
  };

  console.log("[InternshipResidency.constraint-engine.v5] loaded");
})();