/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v2 (Phase 2)
   Extends Phase 1 domain.js with Plan + Subject + new fields
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v2] R missing"); return; }

  var _origCreateRound      = R.createRound;
  var _origCreateEnrollment = R.createEnrollment;
  var _origCreateGoal       = R.createGoal;
  var _origCreateBook       = R.createBook;
  var _origCreateEmpty      = R.createEmptyResidencyState;
  var _origNormalize        = R.normalizeResidencyState;
  var _origCheckRefs        = R.checkRefs;

  var _LIB = window.InternshipLib || null;
  function _mkId(p) {
    if (_LIB && _LIB.id && _LIB.id.content) { try { return _LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _now() { return Date.now(); }
  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) { var n = parseInt(v, 10); return isNaN(n) ? (d || 0) : n; }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }
  function _clampPct(v) {
    var n = parseFloat(v); if (isNaN(n)) n = 100;
    if (n < 0) n = 0; if (n > 100) n = 100;
    return Math.round(n);
  }

  var PLAN_STATUS     = ["draft", "active", "completed", "archived"];
  var SUBJECT_SOURCE  = ["default", "custom", "legacy", "ai"];
  var ALLOCATION_MODE = ["algorithmic", "equal", "manual"];

  R.enums.PLAN_STATUS     = PLAN_STATUS;
  R.enums.SUBJECT_SOURCE  = SUBJECT_SOURCE;
  R.enums.ALLOCATION_MODE = ALLOCATION_MODE;

  // ─── New factories ───
  R.createResidencyPlan = function (input) {
    input = input || {};
    return {
      id: input.id || _mkId("plan"),
      title: _str(input.title).trim(),
      examDate: input.examDate || null,
      status: _enum(input.status, PLAN_STATUS, "draft"),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  };

  R.createSubject = function (input) {
    input = input || {};
    return {
      id: input.id || _mkId("sub"),
      title: _str(input.title).trim(),
      shortTitle: input.shortTitle || null,
      icon: input.icon || null,
      color: input.color || null,
      notes: _str(input.notes),
      sourceType: _enum(input.sourceType, SUBJECT_SOURCE, "custom"),
      sourceId: input.sourceId || null,
      active: input.active !== false,
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  };

  // ─── Override createBook (medium → normal) ───
  R.createBook = function (input) {
    var b = _origCreateBook(input);
    if (b.priority === "medium") b.priority = "normal";
    return b;
  };

  // ─── Override createRound (add planId, allocationMode, manualAllocation) ───
  R.createRound = function (input) {
    input = input || {};
    var r = _origCreateRound(input);
    r.planId = _str(input.planId) || null;
    r.allocationMode = _enum(input.allocationMode, ALLOCATION_MODE, "algorithmic");
    r.manualAllocation = (input.manualAllocation && typeof input.manualAllocation === "object")
      ? JSON.parse(JSON.stringify(input.manualAllocation)) : {};
    return r;
  };

  // ─── Override createEnrollment (add studyOrder) ───
  R.createEnrollment = function (input) {
    input = input || {};
    var e = _origCreateEnrollment(input);
    e.studyOrder = (input.studyOrder == null) ? null : _int(input.studyOrder, 0);
    return e;
  };

  // ─── Override createGoal (add planId) ───
  R.createGoal = function (input) {
    input = input || {};
    var g = _origCreateGoal(input);
    g.planId = _str(input.planId) || null;
    return g;
  };

  // ─── Override createEmptyResidencyState ───
  R.createEmptyResidencyState = function () {
    var s = _origCreateEmpty();
    s.plans = [];
    s.subjects = [];
    return s;
  };

  // ─── Validators ───
  R.validateResidencyPlan = function (p) {
    var errs = [];
    if (!p || typeof p !== "object") return ["plan is not object"];
    if (!p.id) errs.push("id required");
    if (!p.title || !p.title.trim()) errs.push("title required");
    if (PLAN_STATUS.indexOf(p.status) === -1) errs.push("invalid status");
    return errs;
  };

  R.validateSubject = function (s) {
    var errs = [];
    if (!s || typeof s !== "object") return ["subject is not object"];
    if (!s.id) errs.push("id required");
    if (!s.title || !s.title.trim()) errs.push("title required");
    if (SUBJECT_SOURCE.indexOf(s.sourceType) === -1) errs.push("invalid sourceType");
    return errs;
  };

  // ─── Extend normalizeResidencyState ───
  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    out.plans    = Array.isArray(rs && rs.plans)    ? rs.plans.slice()    : [];
    out.subjects = Array.isArray(rs && rs.subjects) ? rs.subjects.slice() : [];
    // normalize planId on rounds
    (out.rounds || []).forEach(function (r) {
      if (r && !r.planId) r.planId = null;
      if (r && !r.allocationMode) r.allocationMode = "algorithmic";
      if (r && (!r.manualAllocation || typeof r.manualAllocation !== "object")) r.manualAllocation = {};
    });
    (out.goals || []).forEach(function (g) {
      if (g && !g.planId) g.planId = null;
    });
    (out.enrollments || []).forEach(function (e) {
      if (e && !("studyOrder" in e)) e.studyOrder = null;
    });
    (out.books || []).forEach(function (b) {
      if (b && b.priority === "medium") b.priority = "normal";
    });
    return out;
  };

  // ─── Extend checkRefs ───
  R.checkRefs = function (state) {
    var errs = _origCheckRefs(state) || [];
    if (!state || !state.residency) return errs;
    var rs = state.residency;

    var planIds = {}, subjIds = {};
    (rs.plans    || []).forEach(function (p) { if (p && p.id) planIds[p.id] = 1; });
    (rs.subjects || []).forEach(function (s) { if (s && s.id) subjIds[s.id] = 1; });

    // Active plan exists?
    if (rs.meta && rs.meta.activePlanId && !planIds[rs.meta.activePlanId]) {
      errs.push("activePlanId not found: " + rs.meta.activePlanId);
    }

    // Round.planId
    (rs.rounds || []).forEach(function (r) {
      if (r && r.planId && !planIds[r.planId]) {
        errs.push("round.planId not found: " + r.planId + " (round " + r.id + ")");
      }
    });

    // Book.subjectId
    (rs.books || []).forEach(function (b) {
      if (b && b.subjectId && !subjIds[b.subjectId]) {
        errs.push("book.subjectId not found: " + b.subjectId + " (book " + b.id + ")");
      }
    });

    // Goal.planId
    (rs.goals || []).forEach(function (g) {
      if (g && g.planId && !planIds[g.planId]) {
        errs.push("goal.planId not found: " + g.planId);
      }
      if (g && g.scopeType === "round" && g.scopeId) {
        var roundOk = (rs.rounds || []).some(function (r) { return r && r.id === g.scopeId; });
        if (!roundOk) errs.push("goal.scopeId (round) not found: " + g.scopeId);
      }
    });

    return errs;
  };

  // ─── Override validateBook (priority: low/normal/high) ───
  R.validateBook = function (b) {
    var errs = [];
    if (!b || typeof b !== "object") return ["book is not object"];
    if (!b.id) errs.push("id required");
    if (!b.title || !b.title.trim()) errs.push("title required");
    if (!b.subjectId) errs.push("subjectId required");
    if (typeof b.totalPages !== "number" || b.totalPages < 0) errs.push("totalPages must be >= 0");
    if (["low","normal","high"].indexOf(b.priority) === -1) errs.push("invalid priority");
    if (["active","paused","archived"].indexOf(b.status) === -1) errs.push("invalid status");
    return errs;
  };

  console.log("[InternshipResidency.domain.v2] loaded");
})();