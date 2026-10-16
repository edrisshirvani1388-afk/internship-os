/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Constraints Engine v6.3
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.constraints.v6.3] R missing"); return; }
  var PC = R.plannerConstraints = R.plannerConstraints || {};

  var HARD = "hard", SOFT = "soft", PREF = "preference";

  function _cmp(a, b) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return 0;
    return LIB.date.compareJalaliDate(a, b);
  }

  /* ─── Build Rule Index ─── */
  PC.buildRuleIndex = function (snapshot) {
    var rules = [];
    if (snapshot) {
      (snapshot.constraints || []).forEach(function (c) {
        if (c && c.active !== false) rules.push({ rule: c, kind: "constraint" });
      });
      (snapshot.overrides || []).forEach(function (o) {
        if (o && o.active !== false) rules.push({ rule: o, kind: "override" });
      });
    }
    return { rules: rules };
  };

  /* ─── Applicability ─── */
  function _matches(rule, ctx) {
    if (!rule) return false;
    if (rule.planId && ctx.planId && rule.planId !== ctx.planId) return false;
    if (rule.startDate && ctx.date && _cmp(ctx.date, rule.startDate) < 0) return false;
    if (rule.endDate && ctx.date && _cmp(rule.endDate, ctx.date) < 0) return false;

    var tt = rule.targetType, tid = rule.targetId;
    if (tt === "global") return true;
    if (tt === "plan") return !tid || tid === ctx.planId;
    if (tt === "round") return !!ctx.roundId && (!tid || tid === ctx.roundId);
    if (tt === "book") return !!ctx.bookId && (!tid || tid === ctx.bookId);
    if (tt === "subject") return !!ctx.subjectId && (!tid || tid === ctx.subjectId);
    if (tt === "date") return !tid || tid === ctx.date;
    if (tt === "activity") return !!ctx.activityId && (!tid || tid === ctx.activityId);
    if (tt === "task") return !!ctx.taskId && (!tid || tid === ctx.taskId);
    return false;
  }

  PC.getApplicableRules = function (index, ctx) {
    if (!index || !ctx) return [];
    return index.rules.filter(function (w) { return _matches(w.rule, ctx); });
  };

  /* ─── Evaluators ─── */
  function _hard(rule) { return rule.strength === HARD; }

  var EVAL = {};

  EVAL.date = function (rule, ctx) {
    if (rule.operator === "eq") {
      var ok = ctx.date === String(rule.value);
      return ok
        ? { action: "allow", maxMinutes: null, reason: "date_ok" }
        : { action: _hard(rule) ? "deny" : "allow_warn", maxMinutes: null, reason: "date_mismatch" };
    }
    if (rule.operator === "in" && Array.isArray(rule.value)) {
      var okIn = rule.value.indexOf(ctx.date) !== -1;
      return okIn
        ? { action: "allow", maxMinutes: null, reason: "date_in_ok" }
        : { action: _hard(rule) ? "deny" : "allow_warn", maxMinutes: null, reason: "date_not_in" };
    }
    if (rule.operator === "not_in" && Array.isArray(rule.value)) {
      var okNI = rule.value.indexOf(ctx.date) === -1;
      return okNI
        ? { action: "allow", maxMinutes: null, reason: "date_not_in_ok" }
        : { action: _hard(rule) ? "deny" : "allow_warn", maxMinutes: null, reason: "date_in" };
    }
    return { action: "allow", maxMinutes: null, reason: "date_unhandled" };
  };

  EVAL.capacity = function (rule, ctx) {
    if (rule.targetType === "date" && rule.targetId && rule.targetId !== ctx.date) {
      return { action: "allow", maxMinutes: null, reason: "date_mismatch" };
    }
    var v = parseInt(rule.value, 10);
    if (isNaN(v) || v < 0) return { action: "allow", maxMinutes: null, reason: "invalid_cap" };
    if (rule.operator === "lte" || rule.operator === "eq") {
      var already = ctx.alreadyForDate || 0;
      var allowed = Math.max(0, v - already);
      if (allowed < (ctx.proposedMinutes || 0)) {
        return { action: "limit", maxMinutes: allowed, reason: "capacity_cap" };
      }
      return { action: "allow", maxMinutes: null, reason: "capacity_ok" };
    }
    return { action: "allow", maxMinutes: null, reason: "capacity_floor" };
  };

  EVAL.pages = function (rule, ctx) {
    var v = parseInt(rule.value, 10);
    if (isNaN(v) || v < 0) return { action: "allow", maxMinutes: null, reason: "invalid_pages" };
    if (rule.operator === "lte" || rule.operator === "eq") {
      var rate = ctx.pagesPerHour || 20;
      var capMin = Math.ceil(v / rate * 60);
      var alreadyMin = ctx.alreadyForDemand || 0;
      var allowed = Math.max(0, capMin - alreadyMin);
      if (allowed < (ctx.proposedMinutes || 0)) {
        return { action: "limit", maxMinutes: allowed, reason: "pages_cap" };
      }
      return { action: "allow", maxMinutes: null, reason: "pages_ok" };
    }
    return { action: "allow", maxMinutes: null, reason: "pages_floor" };
  };

  EVAL.duration = function (rule, ctx) {
    var v = parseInt(rule.value, 10);
    if (isNaN(v) || v < 0) return { action: "allow", maxMinutes: null, reason: "invalid_dur" };
    if (rule.operator === "lte" || rule.operator === "eq") {
      var alreadyDur = ctx.alreadyForDemand || 0;
      var allowedD = Math.max(0, v - alreadyDur);
      if (allowedD < (ctx.proposedMinutes || 0)) {
        return { action: "limit", maxMinutes: allowedD, reason: "duration_cap" };
      }
      return { action: "allow", maxMinutes: null, reason: "duration_ok" };
    }
    return { action: "allow", maxMinutes: null, reason: "duration_floor" };
  };

  EVAL.inclusion = function (rule, ctx) {
    var v = String(rule.value || "").toLowerCase();
    if (v === "excluded" || v === "exclude" || v === "review_only") {
      if (_hard(rule)) {
        return { action: "deny", maxMinutes: null, reason: "inclusion_" + v };
      }
      return { action: "allow_warn", maxMinutes: null, reason: "inclusion_soft_" + v };
    }
    return { action: "allow", maxMinutes: null, reason: "inclusion_ok" };
  };

  EVAL.allocation = function (rule, ctx) {
    var v = parseFloat(rule.value);
    if (isNaN(v) || v < 0) return { action: "allow", maxMinutes: null, reason: "invalid_alloc" };
    if (rule.operator === "lte") {
      var base = ctx.totalRoundAllocatableMinutes || 0;
      var cap = (v <= 100 && base > 0) ? Math.round(v / 100 * base) : Math.round(v);
      return { action: "limit", maxMinutes: cap, reason: "allocation_cap" };
    }
    return { action: "allow", maxMinutes: null, reason: "allocation_floor" };
  };

  EVAL.order = function () { return { action: "allow", maxMinutes: null, reason: "order_deferred" }; };
  EVAL.time = function () { return { action: "allow", maxMinutes: null, reason: "time_deferred" }; };
  EVAL.lock = function () { return { action: "allow", maxMinutes: null, reason: "lock_deferred" }; };
  EVAL.review = function () { return { action: "allow", maxMinutes: null, reason: "review_deferred" }; };

  EVAL.deadline = function (rule, ctx) {
    var v = String(rule.value || "");
    if (!v || !ctx.date) return { action: "allow", maxMinutes: null, reason: "no_deadline" };
    if (_cmp(ctx.date, v) > 0) {
      return _hard(rule)
        ? { action: "deny", maxMinutes: null, reason: "deadline_exceeded" }
        : { action: "allow_warn", maxMinutes: null, reason: "deadline_soft" };
    }
    return { action: "allow", maxMinutes: null, reason: "deadline_ok" };
  };

  PC.evaluateRule = function (rule, ctx) {
    if (!rule || !rule.type) return { action: "allow", maxMinutes: null, reason: "no_type" };
    var fn = EVAL[rule.type];
    if (!fn) return { action: "allow", maxMinutes: null, reason: "unknown_type" };
    return fn(rule, ctx);
  };

  /* ─── Evaluate all rules for a candidate ─── */
  PC.evaluateCandidate = function (index, context) {
    var out = {
      allowed: true,
      maxMinutes: null,
      penalty: 0,
      effects: [],
      deficits: [],
      warnings: []
    };
    if (!index || !context) return out;

    var matched = PC.getApplicableRules(index, context);
    matched.sort(function (a, b) {
      var ha = _hard(a.rule) ? 2 : (a.rule.strength === "soft" ? 1 : 0);
      var hb = _hard(b.rule) ? 2 : (b.rule.strength === "soft" ? 1 : 0);
      if (ha !== hb) return hb - ha;
      return (b.rule.priority || 500) - (a.rule.priority || 500);
    });

    var hardDeny = null;
    var hardCaps = [];
    var softCaps = [];

    matched.forEach(function (w) {
      var r = w.rule;
      var ev = PC.evaluateRule(r, context);

      out.effects.push({
        constraintId: r.id,
        kind: w.kind,
        demandId: context.demandId || null,
        date: context.date,
        action: ev.action,
        reason: ev.reason,
        strength: r.strength
      });

      if (ev.action === "deny") {
        if (_hard(r)) { if (!hardDeny) hardDeny = r; }
        else { out.penalty -= 5; }
      } else if (ev.action === "allow_warn") {
        out.warnings.push({
          type: "soft_constraint_violation",
          constraintId: r.id,
          demandId: context.demandId || null,
          date: context.date,
          reason: ev.reason,
          severity: "warning"
        });
      } else if (ev.action === "limit" && ev.maxMinutes != null) {
        if (_hard(r)) hardCaps.push({ rule: r, minutes: ev.maxMinutes });
        else softCaps.push({ rule: r, minutes: ev.maxMinutes, penalty: 3 });
      }
    });

    if (hardDeny) {
      out.allowed = false;
      out.deficits.push({
        type: "hard_constraint_block",
        constraintId: hardDeny.id,
        demandId: context.demandId || null,
        date: context.date,
        reason: hardDeny.type,
        severity: "blocker"
      });
      return out;
    }

    // apply caps
    var cap = context.proposedMinutes;
    var capApplied = false;
    hardCaps.forEach(function (c) { if (c.minutes < cap) { cap = c.minutes; capApplied = true; } });
    softCaps.forEach(function (c) {
      if (c.minutes < cap) { cap = c.minutes; capApplied = true; }
      out.penalty -= c.penalty;
    });
    if (capApplied) out.maxMinutes = Math.max(0, cap);

    return out;
  };

  console.log("[planner.constraints.v6.3] loaded");
})();