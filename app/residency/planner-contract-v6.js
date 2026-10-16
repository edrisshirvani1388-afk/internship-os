/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Contract v6.1
   Input/Output schema + factories + validators
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.contract.v6] R missing"); return; }
  R.planner = R.planner || {};

  var PLANNER_VERSION    = 1;
  var PLANNER_MODES      = ["initial", "rebuild", "replan"];
  var PLANNER_SCOPES     = ["plan", "round", "date_range"];
  var FEASIBILITY_STATUS = ["feasible", "feasible_with_warnings", "infeasible",
                            "blocked_by_hard_constraint", "not_checked"];
  var DEMAND_STATUS      = ["active", "paused", "excluded", "review_only",
                            "optional", "completed"];
  var ALLOCATION_MODES   = ["algorithmic", "equal", "manual", "mixed"];

  R.planner.VERSION            = PLANNER_VERSION;
  R.planner.MODES              = PLANNER_MODES;
  R.planner.SCOPES             = PLANNER_SCOPES;
  R.planner.FEASIBILITY_STATUS = FEASIBILITY_STATUS;
  R.planner.DEMAND_STATUS      = DEMAND_STATUS;
  R.planner.ALLOCATION_MODES   = ALLOCATION_MODES;

  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }
  function _mkId(p) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  // ─── StudyDemand ───
  R.planner.createStudyDemand = function (input) {
    input = input || {};
    return {
      id: input.id || _mkId("dem"),
      enrollmentId: _str(input.enrollmentId),
      bookId: _str(input.bookId),
      roundId: _str(input.roundId),
      subjectId: input.subjectId ? _str(input.subjectId) : null,
      totalPagesInBook: _int(input.totalPagesInBook, 0),
      coveragePercent: _int(input.coveragePercent, 100),
      targetPages: _int(input.targetPages, 0),
      alreadyStudiedPages: _int(input.alreadyStudiedPages, 0),
      remainingPages: _int(input.remainingPages, 0),
      overagePages: _int(input.overagePages, 0),
      pagesPerHour: _int(input.pagesPerHour, 20),
      estimatedRemainingMinutes: _int(input.estimatedRemainingMinutes, 0),
      studyOrder: (input.studyOrder == null) ? null : _int(input.studyOrder, 0),
      bookPriority: _enum(input.bookPriority, ["low","normal","high"], "normal"),
      mode: _enum(input.mode, ["included","excluded","paused","review_only","optional"], "included"),
      status: _enum(input.status, DEMAND_STATUS, "active"),
      createdAt: input.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  };

  R.planner.validateStudyDemand = function (d) {
    var errs = [];
    if (!d || typeof d !== "object") return ["demand is not object"];
    if (!d.enrollmentId) errs.push("enrollmentId required");
    if (!d.bookId) errs.push("bookId required");
    if (!d.roundId) errs.push("roundId required");
    if (d.targetPages < 0) errs.push("targetPages must be >= 0");
    if (d.remainingPages < 0) errs.push("remainingPages must be >= 0");
    if (d.overagePages < 0) errs.push("overagePages must be >= 0");
    if (d.pagesPerHour <= 0) errs.push("pagesPerHour must be > 0");
    return errs;
  };

  // ─── PlannerInput ───
  R.planner.createPlannerInput = function (input) {
    input = input || {};
    return {
      version: PLANNER_VERSION,
      generatedAt: input.generatedAt || Date.now(),
      mode: _enum(input.mode, PLANNER_MODES, "initial"),
      scope: _enum(input.scope, PLANNER_SCOPES, "plan"),
      scopeParam: input.scopeParam || null,
      planId: input.planId || null,

      plan: input.plan || null,
      rounds: Array.isArray(input.rounds) ? input.rounds.slice() : [],
      subjects: Array.isArray(input.subjects) ? input.subjects.slice() : [],
      books: Array.isArray(input.books) ? input.books.slice() : [],
      enrollments: Array.isArray(input.enrollments) ? input.enrollments.slice() : [],

      demands: Array.isArray(input.demands) ? input.demands.slice() : [],

      goals: Array.isArray(input.goals) ? input.goals.slice() : [],
      activities: Array.isArray(input.activities) ? input.activities.slice() : [],
      assessments: Array.isArray(input.assessments) ? input.assessments.slice() : [],

      calendar: Array.isArray(input.calendar) ? input.calendar.slice() : [],

      constraints: Array.isArray(input.constraints) ? input.constraints.slice() : [],
      overrides: Array.isArray(input.overrides) ? input.overrides.slice() : [],
      locks: Array.isArray(input.locks) ? input.locks.slice() : [],

      preferences: input.preferences || {
        studyOrderEnabled: true,
        allocationMode: "algorithmic",
        roundAllocationModes: []
      },

      settings: input.settings || {
        defaultPagesPerHour: 20,
        reservePolicy: null
      }
    };
  };

  R.planner.validatePlannerInput = function (s) {
    var errs = [];
    if (!s || typeof s !== "object") return ["input is not object"];
    if (s.version !== PLANNER_VERSION) errs.push("version mismatch");
    if (!s.plan) errs.push("plan required");
    if (s.scope === "plan" && !s.planId) errs.push("planId required for scope=plan");
    if (Array.isArray(s.demands)) {
      s.demands.forEach(function (d, i) {
        var e = R.planner.validateStudyDemand(d);
        if (e.length) errs.push("demand[" + i + "]: " + e.join(", "));
      });
    }
    return errs;
  };

  // ─── PlannerOutput (Proposal) ───
  R.planner.createPlannerOutput = function (input) {
    input = input || {};
    return {
      version: PLANNER_VERSION,
      proposalId: input.proposalId || _mkId("prop"),
      planId: input.planId || null,
      generatedAt: input.generatedAt || Date.now(),
      mode: _enum(input.mode, PLANNER_MODES, "initial"),
      scope: _enum(input.scope, PLANNER_SCOPES, "plan"),
      scopeParam: input.scopeParam || null,

      proposedActivities: Array.isArray(input.proposedActivities) ? input.proposedActivities.slice() : [],
      proposedTasks: Array.isArray(input.proposedTasks) ? input.proposedTasks.slice() : [],

      feasibility: input.feasibility || {
        status: "not_checked",
        requiredPages: 0,
        plannedPages: 0,
        unmetPages: 0,
        requiredMinutes: 0,
        plannedMinutes: 0,
        availableMinutes: 0
      },

      conflicts: Array.isArray(input.conflicts) ? input.conflicts.slice() : [],
      warnings: Array.isArray(input.warnings) ? input.warnings.slice() : [],

      statistics: input.statistics || {
        enrolledBooks: 0,
        plannedBooks: 0,
        plannedActivities: 0,
        coveragePercent: 0
      }
    };
  };

  R.planner.validatePlannerOutput = function (o) {
    var errs = [];
    if (!o || typeof o !== "object") return ["output is not object"];
    if (o.version !== PLANNER_VERSION) errs.push("version mismatch");
    if (!o.proposalId) errs.push("proposalId required");
    if (!o.feasibility || typeof o.feasibility !== "object") errs.push("feasibility required");
    else if (FEASIBILITY_STATUS.indexOf(o.feasibility.status) === -1) errs.push("invalid feasibility.status");
    return errs;
  };

  console.log("[planner.contract.v6] loaded");
})();