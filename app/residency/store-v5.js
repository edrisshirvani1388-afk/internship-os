/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Store v5 (Phase 5)
   Constraint CRUD, Override helpers, Lock helpers
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.store.v5] R missing"); return; }
  var S = R.store = R.store || {};
  var DOM = R;
  var CE = R.constraintEngine;

  function _state() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _rs() {
    var s = _state();
    return s ? s.residency : null;
  }
  function _ensure() {
    var rs = _rs();
    if (!rs) return null;
    if (!Array.isArray(rs.constraints)) rs.constraints = [];
    if (!Array.isArray(rs.manualOverrides)) rs.manualOverrides = [];
    return rs;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }

  // ═══════ Constraint CRUD ═══════
  S.getConstraints = function (filter) {
    return CE ? CE.getConstraints(filter) : [];
  };
  S.getConstraint = function (id) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.constraints.length; i++) {
      if (rs.constraints[i].id === id) return rs.constraints[i];
    }
    return null;
  };
  S.addConstraint = function (input) {
    var rs = _ensure(); if (!rs) return null;
    // ─── Pre-validate raw input (before coercion) ───
    if (input) {
      if (input.strength != null && R.STRENGTHS.indexOf(input.strength) === -1) {
        console.warn("[residency.store.v5] addConstraint: invalid strength:", input.strength);
        return null;
      }
      if (input.targetType != null && R.TARGET_TYPES.indexOf(input.targetType) === -1) {
        console.warn("[residency.store.v5] addConstraint: invalid targetType:", input.targetType);
        return null;
      }
      if (input.type != null && R.CONSTRAINT_TYPES.indexOf(input.type) === -1) {
        console.warn("[residency.store.v5] addConstraint: invalid type:", input.type);
        return null;
      }
      if (input.source != null && R.CONSTRAINT_SOURCES.indexOf(input.source) === -1) {
        console.warn("[residency.store.v5] addConstraint: invalid source:", input.source);
        return null;
      }
      if (input.operator != null && R.OPERATORS.indexOf(input.operator) === -1) {
        console.warn("[residency.store.v5] addConstraint: invalid operator:", input.operator);
        return null;
      }
    }
    var c = DOM.createConstraint(input);
    var errs = DOM.validateConstraint(c);
    if (errs.length) { console.warn("[residency.store.v5] addConstraint:", errs); return null; }
    rs.constraints.push(c);
    _save();
    return c;
  };
  S.updateConstraint = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var c = S.getConstraint(id);
    if (!c) return null;
    var merged = Object.assign({}, c, patch || {});
    var errs = DOM.validateConstraint(merged);
    if (errs.length) { console.warn("[residency.store.v5] updateConstraint:", errs); return null; }
    Object.assign(c, patch || {}, { id: c.id, updatedAt: Date.now() });
    _save();
    return c;
  };
  S.removeConstraint = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i = 0; i < rs.constraints.length; i++) {
      if (rs.constraints[i].id === id) { rs.constraints.splice(i, 1); _save(); return true; }
    }
    return false;
  };
  S.activateConstraint = function (id) { return S.updateConstraint(id, { active: true }); };
  S.deactivateConstraint = function (id) { return S.updateConstraint(id, { active: false }); };

  // ═══════ Override helpers ═══════
  S.getOverridesForTarget = function (targetType, targetId) {
    return CE ? CE.getOverrides({ targetType: targetType, targetId: targetId, active: true }) : [];
  };
  S.getOverridesForDate = function (date) {
    return CE ? CE.getOverrides({ date: date, active: true }) : [];
  };
  S.getOverridesForRound = function (roundId) {
    return CE ? CE.getOverrides({ targetType: "round", targetId: roundId, active: true }) : [];
  };
  S.getOverridesForBook = function (bookId) {
    return CE ? CE.getOverrides({ targetType: "book", targetId: bookId, active: true }) : [];
  };
  S.activateOverride = function (id) { return S.updateManualOverride(id, { active: true }); };
  S.deactivateOverride = function (id) { return S.updateManualOverride(id, { active: false }); };

  // ═══════ Lock helpers — Activity ═══════
  S.lockActivity = function (activityId) {
    var a = S.getActivity(activityId);
    if (!a) return null;
    return S.updateActivity(activityId, { locked: true });
  };
  S.unlockActivity = function (activityId) {
    var a = S.getActivity(activityId);
    if (!a) return null;
    return S.updateActivity(activityId, { locked: false });
  };
  S.isActivityLocked = function (activityId) {
    var a = S.getActivity(activityId);
    return !!(a && a.locked);
  };

  // ═══════ Lock helpers — Task ═══════
  S.lockTask = function (taskId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return null;
    var t = s.tasks.find(function (x) { return x && x.id === taskId; });
    if (!t) return null;
    t.locked = true;
    t.updatedAt = Date.now();
    _save();
    return t;
  };
  S.unlockTask = function (taskId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return null;
    var t = s.tasks.find(function (x) { return x && x.id === taskId; });
    if (!t) return null;
    t.locked = false;
    t.updatedAt = Date.now();
    _save();
    return t;
  };
  S.isTaskLocked = function (taskId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return false;
    var t = s.tasks.find(function (x) { return x && x.id === taskId; });
    return !!(t && t.locked);
  };

  // ═══════ Engine wrappers ═══════
  S.getApplicableConstraints = function (planId, date, context) {
    return CE ? CE.getApplicableConstraints(planId, date, context) : null;
  };
  S.getActivityConstraints = function (activityId) {
    return CE ? CE.getActivityConstraints(activityId) : [];
  };
  S.getBookConstraints = function (bookId, roundId) {
    return CE ? CE.getBookConstraints(bookId, roundId) : [];
  };
  S.getRoundConstraints = function (roundId) {
    return CE ? CE.getRoundConstraints(roundId) : [];
  };
  S.getDateConstraints = function (date, planId) {
    return CE ? CE.getDateConstraints(date, planId) : [];
  };
  S.detectConstraintConflicts = function (planId) {
    return CE ? CE.detectConstraintConflicts(planId) : [];
  };
  S.detectOverrideConflicts = function (planId) {
    return CE ? CE.detectOverrideConflicts(planId) : [];
  };
  S.checkConstraintFeasibility = function (planId, options) {
    return CE ? CE.checkConstraintFeasibility(planId, options) : null;
  };

  console.log("[InternshipResidency.store.v5] loaded");
})();