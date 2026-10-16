/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v5 (Phase 5)
   Constraint / Manual Override / Lock — Schema + Validation
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v5] R missing"); return; }

  var _origCreateManualOverride = R.createManualOverride;
  var _origCreateEmpty          = R.createEmptyResidencyState;
  var _origNormalize            = R.normalizeResidencyState;

  // ─── Enums ───
  var STRENGTHS          = ["hard","soft","preference"];
  var CONSTRAINT_SOURCES = ["system","user","rotation","goal","derived"];
  var CONSTRAINT_TYPES   = ["deadline","lock","date","time","duration","pages",
                            "capacity","allocation","order","inclusion","review"];
  var TARGET_TYPES       = ["plan","round","book","subject","activity","task","date","global"];
  var OVERRIDE_TYPES     = ["date","start_time","duration","pages","capacity","day_type",
                            "book_allocation","book_order","review_schedule","round_assignment"];
  var OVERRIDE_SCOPES    = ["single_date","date_range","activity","book","round","subject","plan","global"];
  var OVERRIDE_LIFETIMES = ["one_day","date_range","round","book","plan","permanent"];
  var OPERATORS          = ["eq","neq","lt","lte","gt","gte","in","not_in"];
  var CONFLICT_SEVERITY  = { hard_hard:"error", hard_soft:"warning", soft_soft:"info",
                             override_override:"error", override_lock:"error" };

  R.STRENGTHS          = STRENGTHS;
  R.CONSTRAINT_SOURCES = CONSTRAINT_SOURCES;
  R.CONSTRAINT_TYPES   = CONSTRAINT_TYPES;
  R.TARGET_TYPES       = TARGET_TYPES;
  R.OVERRIDE_TYPES     = OVERRIDE_TYPES;
  R.OVERRIDE_SCOPES    = OVERRIDE_SCOPES;
  R.OVERRIDE_LIFETIMES = OVERRIDE_LIFETIMES;
  R.OPERATORS          = OPERATORS;
  R.CONFLICT_SEVERITY  = CONFLICT_SEVERITY;

  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) { var n = parseInt(v, 10); return isNaN(n) ? d : n; }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }
  function _nullStr(v) { return (v === 0 || v) ? String(v) : null; }
  function _bool(v, d) { return (typeof v === "boolean") ? v : (d || false); }
  function _mkId(prefix) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(prefix); } catch (e) {} }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  // ─── Factory: Constraint ───
  R.createConstraint = function (input) {
    input = input || {};
    return {
      id: input.id || _mkId("cst"),
      planId: _nullStr(input.planId),
      type: _enum(input.type, CONSTRAINT_TYPES, "date"),
      strength: _enum(input.strength, STRENGTHS, "soft"),
      targetType: _enum(input.targetType, TARGET_TYPES, "global"),
      targetId: _nullStr(input.targetId),
      field: _nullStr(input.field),
      operator: _enum(input.operator, OPERATORS, "eq"),
      value: (input.value !== undefined) ? input.value : null,
      startDate: _nullStr(input.startDate),
      endDate: _nullStr(input.endDate),
      active: _bool(input.active, true),
      source: _enum(input.source, CONSTRAINT_SOURCES, "user"),
      priority: _int(input.priority, 500),
      reason: _str(input.reason),
      createdAt: input.createdAt || Date.now(),
      updatedAt: Date.now()
    };
  };

  // ─── Override createManualOverride (extend Phase 1 schema) ───
  R.createManualOverride = function (input) {
    input = input || {};
    var o = _origCreateManualOverride(input);
    o.strength    = _enum(input.strength, STRENGTHS, "hard");
    o.source      = _enum(input.source, CONSTRAINT_SOURCES, "user");
    o.priority    = _int(input.priority, 500);
    o.lifetime    = _enum(input.lifetime, OVERRIDE_LIFETIMES, "permanent");
    o.operator    = _enum(input.operator, OPERATORS, "eq");
    return o;
  };

  // ─── Extend empty state ───
  R.createEmptyResidencyState = function () {
    var s = _origCreateEmpty();
    if (!Array.isArray(s.constraints)) s.constraints = [];
    return s;
  };

  // ─── Normalize ───
  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    if (!Array.isArray(out.constraints)) out.constraints = [];
    out.constraints.forEach(function (c) {
      if (!c) return;
      if (!("planId" in c)) c.planId = null;
      if (!("strength" in c)) c.strength = "soft";
      if (!("source" in c)) c.source = "user";
      if (!("priority" in c)) c.priority = 500;
      if (!("operator" in c)) c.operator = "eq";
      if (!("active" in c)) c.active = true;
      if (!("reason" in c)) c.reason = "";
    });
    (out.manualOverrides || []).forEach(function (o) {
      if (!o) return;
      if (!("strength" in o)) o.strength = "hard";
      if (!("source" in o)) o.source = "user";
      if (!("priority" in o)) o.priority = 500;
      if (!("lifetime" in o)) o.lifetime = "permanent";
      if (!("operator" in o)) o.operator = "eq";
    });
    return out;
  };

  // ─── Validators ───
  R.validateConstraint = function (c) {
    var errs = [];
    if (!c || typeof c !== "object") return ["constraint is not object"];
    if (!c.id) errs.push("id required");
    if (STRENGTHS.indexOf(c.strength) === -1) errs.push("invalid strength");
    if (CONSTRAINT_SOURCES.indexOf(c.source) === -1) errs.push("invalid source");
    if (CONSTRAINT_TYPES.indexOf(c.type) === -1) errs.push("invalid type");
    if (TARGET_TYPES.indexOf(c.targetType) === -1) errs.push("invalid targetType");
    if (OPERATORS.indexOf(c.operator) === -1) errs.push("invalid operator");
    if (typeof c.priority !== "number") errs.push("priority must be number");
    if (c.startDate && c.endDate) {
      var LIB = window.InternshipLib;
      if (LIB && LIB.date && LIB.date.compareJalaliDate) {
        if (LIB.date.compareJalaliDate(c.startDate, c.endDate) > 0) {
          errs.push("startDate > endDate");
        }
      }
    }
    return errs;
  };

  R.validateManualOverride = function (o) {
    var errs = [];
    if (!o || typeof o !== "object") return ["override is not object"];
    if (!o.id) errs.push("id required");
    if (STRENGTHS.indexOf(o.strength) === -1) errs.push("invalid strength");
    if (OVERRIDE_SCOPES.indexOf(o.scopeType) === -1) errs.push("invalid scopeType");
    if (OVERRIDE_LIFETIMES.indexOf(o.lifetime) === -1) errs.push("invalid lifetime");
    if (OPERATORS.indexOf(o.operator) === -1) errs.push("invalid operator");
    if (!o.targetType) errs.push("targetType required");
    return errs;
  };

  // ─── Implicit protection checks ───
  R.isActivityProtected = function (activity) {
    if (!activity) return false;
    if (activity.locked) return true;
    if (activity.status === "completed") return true;
    if (activity.status === "cancelled") return true;
    return false;
  };

  R.isActivityPast = function (activity) {
    if (!activity || !activity.plannedDate) return false;
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return false;
    var today = LIB.date.todayJalaliString();
    return LIB.date.compareJalaliDate(activity.plannedDate, today) < 0;
  };

  // ─── Conflict severity helper ───
  R.getConflictSeverity = function (classKey) {
    return CONFLICT_SEVERITY[classKey] || "info";
  };

  console.log("[InternshipResidency.domain.v5] loaded");
})();