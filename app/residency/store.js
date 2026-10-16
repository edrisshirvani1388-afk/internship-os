/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Store  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var R = window.InternshipResidency = window.InternshipResidency || {};
  var STORE = R.store = R.store || {};
  var DOM = R;

  function _getRoot() {
    if (window.__os && typeof window.__os.getState === "function") {
      try {
        var s = window.__os.getState();
        return s ? s.residency : null;
      } catch (e) { return null; }
    }
    return null;
  }
  function _ensure() {
    var rs = _getRoot();
    if (!rs) return null;
    if (!rs.books) rs.books = [];
    if (!rs.rounds) rs.rounds = [];
    if (!rs.enrollments) rs.enrollments = [];
    if (!rs.goals) rs.goals = [];
    if (!rs.activities) rs.activities = [];
    if (!rs.assessments) rs.assessments = [];
    if (!rs.capacityProfiles) rs.capacityProfiles = [];
    if (!rs.dayOverrides) rs.dayOverrides = [];
    if (!rs.manualOverrides) rs.manualOverrides = [];
    if (!rs.planVersions) rs.planVersions = [];
    return rs;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _touch() {
    var rs = _getRoot();
    if (rs && rs.meta) rs.meta.updatedAt = Date.now();
  }

  /* Books */
  STORE.getBooks = function () { var rs = _ensure(); return rs ? rs.books.slice() : []; };
  STORE.getBook = function (id) { var rs = _ensure(); if (!rs) return null; for (var i=0;i<rs.books.length;i++) if (rs.books[i].id===id) return rs.books[i]; return null; };
  STORE.addBook = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var b = DOM.createBook(input);
    var errs = DOM.validateBook(b);
    if (errs.length) { console.warn("[residency.store] addBook:", errs); return null; }
    rs.books.push(b); _touch(); _save();
    return b;
  };
  STORE.updateBook = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var b = null; for (var i=0;i<rs.books.length;i++) if (rs.books[i].id===id) { b=rs.books[i]; break; }
    if (!b) return null;
    Object.assign(b, patch || {}, { id: b.id, updatedAt: Date.now() });
    _touch(); _save();
    return b;
  };
  STORE.archiveBook = function (id) { return STORE.updateBook(id, { status: "archived" }); };
  STORE.pauseBook   = function (id) { return STORE.updateBook(id, { status: "paused" }); };
  STORE.resumeBook  = function (id) { return STORE.updateBook(id, { status: "active" }); };
  STORE.removeBook = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.books.length;i++) if (rs.books[i].id===id) { rs.books.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Rounds */
  STORE.getRounds = function () {
    var rs = _ensure(); if (!rs) return [];
    return rs.rounds.slice().sort(function(a,b){return (a.order||0)-(b.order||0);});
  };
  STORE.getRound = function (id) { var rs = _ensure(); if (!rs) return null; for (var i=0;i<rs.rounds.length;i++) if (rs.rounds[i].id===id) return rs.rounds[i]; return null; };
  STORE.addRound = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var r = DOM.createRound(input);
    var errs = DOM.validateRound(r);
    if (errs.length) { console.warn("[residency.store] addRound:", errs); return null; }
    rs.rounds.push(r); _touch(); _save();
    return r;
  };
  STORE.updateRound = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var r = null; for (var i=0;i<rs.rounds.length;i++) if (rs.rounds[i].id===id) { r=rs.rounds[i]; break; }
    if (!r) return null;
    Object.assign(r, patch || {}, { id: r.id, updatedAt: Date.now() });
    _touch(); _save();
    return r;
  };
  STORE.removeRound = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.rounds.length;i++) if (rs.rounds[i].id===id) { rs.rounds.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Enrollments */
  STORE.getEnrollments = function (filter) {
    var rs = _ensure(); if (!rs) return [];
    filter = filter || {};
    return rs.enrollments.filter(function (e) {
      if (!e) return false;
      if (filter.roundId && e.roundId !== filter.roundId) return false;
      if (filter.bookId && e.bookId !== filter.bookId) return false;
      return true;
    });
  };
  STORE.getEnrollment = function (id) { var rs = _ensure(); if (!rs) return null; for (var i=0;i<rs.enrollments.length;i++) if (rs.enrollments[i].id===id) return rs.enrollments[i]; return null; };
  STORE.addEnrollment = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var e = DOM.createEnrollment(input);
    var errs = DOM.validateEnrollment(e);
    if (errs.length) { console.warn("[residency.store] addEnrollment:", errs); return null; }
    var bookOk = false, roundOk = false;
    for (var i=0;i<rs.books.length;i++) if (rs.books[i].id===e.bookId) bookOk = true;
    for (var j=0;j<rs.rounds.length;j++) if (rs.rounds[j].id===e.roundId) roundOk = true;
    if (!bookOk || !roundOk) { console.warn("[residency.store] addEnrollment: ref not found"); return null; }
    rs.enrollments.push(e); _touch(); _save();
    return e;
  };
  STORE.updateEnrollment = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var e = null; for (var i=0;i<rs.enrollments.length;i++) if (rs.enrollments[i].id===id) { e=rs.enrollments[i]; break; }
    if (!e) return null;
    Object.assign(e, patch || {}, { id: e.id, updatedAt: Date.now() });
    _touch(); _save();
    return e;
  };
  STORE.removeEnrollment = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.enrollments.length;i++) if (rs.enrollments[i].id===id) { rs.enrollments.splice(i,1); _touch(); _save(); return true; }
    return false;
  };
  STORE.getBookEnrollmentForRound = function (bookId, roundId) {
    var rs = _ensure(); if (!rs) return null;
    for (var i=0;i<rs.enrollments.length;i++) {
      var e = rs.enrollments[i];
      if (e.bookId===bookId && e.roundId===roundId) return e;
    }
    return null;
  };

  /* Goals */
  STORE.getGoals = function () { var rs = _ensure(); return rs ? rs.goals.slice() : []; };
  STORE.addGoal = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var g = DOM.createGoal(input);
    rs.goals.push(g); _touch(); _save();
    return g;
  };
  STORE.updateGoal = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var g = null; for (var i=0;i<rs.goals.length;i++) if (rs.goals[i].id===id) { g=rs.goals[i]; break; }
    if (!g) return null;
    Object.assign(g, patch || {}, { id: g.id, updatedAt: Date.now() });
    _touch(); _save();
    return g;
  };
  STORE.removeGoal = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.goals.length;i++) if (rs.goals[i].id===id) { rs.goals.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Activities */
  STORE.getActivities = function (filter) {
    var rs = _ensure(); if (!rs) return [];
    filter = filter || {};
    return rs.activities.filter(function (a) {
      if (!a) return false;
      if (filter.roundId && a.roundId !== filter.roundId) return false;
      if (filter.bookId && a.bookId !== filter.bookId) return false;
      if (filter.taskId && a.taskId !== filter.taskId) return false;
      if (filter.kind && a.kind !== filter.kind) return false;
      if (filter.date && a.plannedDate !== filter.date) return false;
      return true;
    });
  };
  STORE.getActivity = function (id) { var rs = _ensure(); if (!rs) return null; for (var i=0;i<rs.activities.length;i++) if (rs.activities[i].id===id) return rs.activities[i]; return null; };
  STORE.addActivity = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var a = DOM.createActivity(input);
    var errs = DOM.validateActivity(a);
    if (errs.length) { console.warn("[residency.store] addActivity:", errs); return null; }
    rs.activities.push(a); _touch(); _save();
    return a;
  };
  STORE.updateActivity = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var a = null; for (var i=0;i<rs.activities.length;i++) if (rs.activities[i].id===id) { a=rs.activities[i]; break; }
    if (!a) return null;
    Object.assign(a, patch || {}, { id: a.id, updatedAt: Date.now() });
    _touch(); _save();
    return a;
  };
  STORE.removeActivity = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.activities.length;i++) if (rs.activities[i].id===id) { rs.activities.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Assessments */
  STORE.getAssessments = function () { var rs = _ensure(); return rs ? rs.assessments.slice() : []; };
  STORE.addAssessment = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var a = DOM.createAssessment(input);
    rs.assessments.push(a); _touch(); _save();
    return a;
  };
  STORE.updateAssessment = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var a = null; for (var i=0;i<rs.assessments.length;i++) if (rs.assessments[i].id===id) { a=rs.assessments[i]; break; }
    if (!a) return null;
    Object.assign(a, patch || {}, { id: a.id, updatedAt: Date.now() });
    _touch(); _save();
    return a;
  };
  STORE.removeAssessment = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.assessments.length;i++) if (rs.assessments[i].id===id) { rs.assessments.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Capacity Profiles */
  STORE.getCapacityProfiles = function () { var rs = _ensure(); return rs ? rs.capacityProfiles.slice() : []; };
  STORE.addCapacityProfile = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var c = DOM.createCapacityProfile(input);
    rs.capacityProfiles.push(c); _touch(); _save();
    return c;
  };
  STORE.updateCapacityProfile = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var c = null; for (var i=0;i<rs.capacityProfiles.length;i++) if (rs.capacityProfiles[i].id===id) { c=rs.capacityProfiles[i]; break; }
    if (!c) return null;
    Object.assign(c, patch || {}, { id: c.id, updatedAt: Date.now() });
    _touch(); _save();
    return c;
  };
  STORE.removeCapacityProfile = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.capacityProfiles.length;i++) if (rs.capacityProfiles[i].id===id) { rs.capacityProfiles.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Day Overrides */
  STORE.getDayOverrides = function () { var rs = _ensure(); return rs ? rs.dayOverrides.slice() : []; };
  STORE.addDayOverride = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var o = DOM.createDayOverride(input);
    rs.dayOverrides.push(o); _touch(); _save();
    return o;
  };
  STORE.updateDayOverride = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var o = null; for (var i=0;i<rs.dayOverrides.length;i++) if (rs.dayOverrides[i].id===id) { o=rs.dayOverrides[i]; break; }
    if (!o) return null;
    Object.assign(o, patch || {}, { id: o.id, updatedAt: Date.now() });
    _touch(); _save();
    return o;
  };
  STORE.removeDayOverride = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.dayOverrides.length;i++) if (rs.dayOverrides[i].id===id) { rs.dayOverrides.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Manual Overrides */
  STORE.getManualOverrides = function () { var rs = _ensure(); return rs ? rs.manualOverrides.slice() : []; };
  STORE.addManualOverride = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var o = DOM.createManualOverride(input);
    rs.manualOverrides.push(o); _touch(); _save();
    return o;
  };
  STORE.updateManualOverride = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var o = null; for (var i=0;i<rs.manualOverrides.length;i++) if (rs.manualOverrides[i].id===id) { o=rs.manualOverrides[i]; break; }
    if (!o) return null;
    Object.assign(o, patch || {}, { id: o.id, updatedAt: Date.now() });
    _touch(); _save();
    return o;
  };
  STORE.removeManualOverride = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i=0;i<rs.manualOverrides.length;i++) if (rs.manualOverrides[i].id===id) { rs.manualOverrides.splice(i,1); _touch(); _save(); return true; }
    return false;
  };

  /* Plan Versions */
  STORE.getPlanVersions = function () { var rs = _ensure(); return rs ? rs.planVersions.slice() : []; };
  STORE.addPlanVersion = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var p = DOM.createPlanVersion(input);
    rs.planVersions.push(p); _touch(); _save();
    return p;
  };
  STORE.updatePlanVersion = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var p = null; for (var i=0;i<rs.planVersions.length;i++) if (rs.planVersions[i].id===id) { p=rs.planVersions[i]; break; }
    if (!p) return null;
    Object.assign(p, patch || {}, { id: p.id });
    _touch(); _save();
    return p;
  };

  /* Meta & Settings */
  STORE.getMeta = function () { var rs = _ensure(); return rs ? Object.assign({}, rs.meta) : null; };
  STORE.setActivePlanId = function (id) {
    var rs = _ensure(); if (!rs) return false;
    rs.meta.activePlanId = id || null;
    _touch(); _save();
    return true;
  };
  STORE.getSettings = function () { var rs = _ensure(); return rs ? JSON.parse(JSON.stringify(rs.settings)) : null; };
  STORE.updateSettings = function (patch) {
    var rs = _ensure(); if (!rs) return null;
    Object.assign(rs.settings, patch || {});
    _touch(); _save();
    return rs.settings;
  };

  /* Reset */
  STORE.reset = function () {
    var rs = _ensure(); if (!rs) return false;
    var fresh = DOM.createEmptyResidencyState();
    Object.keys(fresh).forEach(function (k) { rs[k] = fresh[k]; });
    _save();
    return true;
  };

  console.log("[InternshipResidency.store] loaded");
})();