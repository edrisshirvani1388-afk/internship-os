/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Activity Store v4
   Queries, Progress, Remaining Pages, Overdue
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.activity-store.v4] R missing"); return; }
  var S = R.store = R.store || {};
  var DOM = R;

  function _state() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _today() {
    var d = window.InternshipLib && window.InternshipLib.date;
    return d ? d.todayJalaliString() : "";
  }
  function _cmp(a, b) {
    var d = window.InternshipLib && window.InternshipLib.date;
    return d ? d.compareJalaliDate(a, b) : 0;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }

  var _origAddActivity = S.addActivity;
  S.addActivity = function (input) {
    var a = DOM.createActivity(input);
    var errs = DOM.validateActivity(a);
    if (errs.length) { console.warn("[residency.activity-store.v4] addActivity:", errs); return null; }
    return _origAddActivity(input);
  };

  var _origAddAssessment = S.addAssessment;
  S.addAssessment = function (input) {
    var a = DOM.createAssessment(input);
    var errs = DOM.validateAssessment(a);
    if (errs.length) { console.warn("[residency.activity-store.v4] addAssessment:", errs); return null; }
    return _origAddAssessment(input);
  };

  var _origUpdateActivity = S.updateActivity;
  S.updateActivity = function (id, patch) {
    var cur = S.getActivity(id);
    if (!cur) return null;
    var merged = Object.assign({}, cur, patch || {});
    var errs = DOM.validateActivity(merged);
    if (errs.length) { console.warn("[residency.activity-store.v4] updateActivity:", errs); return null; }
    return _origUpdateActivity(id, patch);
  };

  var _origUpdateAssessment = S.updateAssessment;
  S.updateAssessment = function (id, patch) {
    var cur = S.getAssessment(id);
    if (!cur) return null;
    var merged = Object.assign({}, cur, patch || {});
    var errs = DOM.validateAssessment(merged);
    if (errs.length) { console.warn("[residency.activity-store.v4] updateAssessment:", errs); return null; }
    return _origUpdateAssessment(id, patch);
  };

  // ─── Queries ───
  S.getStudyActivities     = function () { return S.getActivities({ kind: "study" }); };
  S.getReviewActivities    = function () { return S.getActivities({ kind: "review" }); };
  S.getAssessmentActivities = function () { return S.getActivities({ kind: "assessment" }); };

  S.getActivitiesForBook = function (bookId) {
    return S.getActivities().filter(function (a) { return a && a.bookId === bookId; });
  };
  S.getActivitiesForRound = function (roundId) {
    return S.getActivities().filter(function (a) { return a && a.roundId === roundId; });
  };
  S.getActivitiesForSubject = function (subjectId) {
    return S.getActivities().filter(function (a) { return a && a.subjectId === subjectId; });
  };

  S.getOverdueActivities = function (planId) {
    var today = _today();
    return S.getActivities({ planId: planId }).filter(function (a) {
      if (!a || !a.plannedDate) return false;
      if (a.status === "completed" || a.status === "skipped" || a.status === "cancelled") return false;
      return _cmp(a.plannedDate, today) < 0;
    });
  };

  S.getActivityRemainingPages = function (activityId) {
    var a = S.getActivity(activityId);
    if (!a) return null;
    var planned = (a.plannedPages != null) ? a.plannedPages : null;
    var actual  = (a.actualPages  != null) ? a.actualPages  : 0;
    if (planned == null) return { planned: null, actual: actual, remaining: null, overage: null };
    var remaining = Math.max(0, planned - actual);
    var overage   = Math.max(0, actual - planned);
    return { planned: planned, actual: actual, remaining: remaining, overage: overage };
  };

  S.getActivityProgress = function (activityId) {
    var a = S.getActivity(activityId);
    if (!a) return null;
    if (a.plannedPages != null && a.plannedPages > 0 && a.actualPages != null) {
      return Math.min(100, Math.round(a.actualPages / a.plannedPages * 100));
    }
    // Duration-based fallback
    if (a.plannedDurationMinutes != null && a.plannedDurationMinutes > 0 && a.actualDurationMinutes != null) {
      return Math.min(100, Math.round(a.actualDurationMinutes / a.plannedDurationMinutes * 100));
    }
    // Status-based
    if (a.status === "completed") return 100;
    if (a.status === "in_progress" || a.status === "partial") return 50;
    return 0;
  };

  // ─── Assessment queries ───
  S.getAssessmentsForRound = function (roundId) {
    return S.getAssessments().filter(function (a) { return a && a.roundId === roundId; });
  };
  S.getAssessmentsForSubject = function (subjectId) {
    return S.getAssessments().filter(function (a) { return a && a.subjectId === subjectId; });
  };
  S.getPendingAssessments = function () {
    return S.getAssessments().filter(function (a) {
      return a && (a.status === "planned" || a.status === "in_progress");
    });
  };

  // ─── Aggregates (basic only) ───
  S.getBookActivityProgress = function (bookId, roundId) {
    var list = S.getActivitiesForBook(bookId);
    if (roundId) list = list.filter(function (a) { return a.roundId === roundId; });
    var planned = 0, actual = 0;
    list.forEach(function (a) {
      if (a.plannedPages != null) planned += a.plannedPages;
      if (a.actualPages != null) actual += a.actualPages;
    });
    return { totalActivities: list.length, plannedPages: planned, actualPages: actual };
  };

  S.getReviewProgress = function (planId) {
    var list = S.getActivities({ kind: "review", planId: planId });
    var completed = list.filter(function (a) { return a.status === "completed"; }).length;
    return { planned: list.length, completed: completed };
  };

  S.getAssessmentProgress = function (planId) {
    var list = planId ? S.getAssessments().filter(function (a) { return a.planId === planId; })
                      : S.getAssessments();
    var completed = list.filter(function (a) { return a.status === "completed"; }).length;
    return { planned: list.length, completed: completed };
  };

  console.log("[InternshipResidency.activity-store.v4] loaded");
})();