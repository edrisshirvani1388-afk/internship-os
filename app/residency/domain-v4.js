/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v4 (Phase 4)
   Study/Review/Assessment — Activity as Domain Truth
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v4] R missing"); return; }

  var _origCreateActivity   = R.createActivity;
  var _origCreateAssessment = R.createAssessment;
  var _origNormalize        = R.normalizeResidencyState;

  var ACTIVITY_KINDS      = ["study","review","assessment"];
  var ACTIVITY_STATUSES   = ["planned","in_progress","completed","partial","skipped","cancelled"];
  var ASSESSMENT_TYPES    = ["mock_exam","subject_test","quiz","custom"];
  var ASSESSMENT_STATUSES = ["planned","in_progress","completed","cancelled"];
  var REVIEW_TARGET_TYPES = ["activity","pages","book","subject","custom"];
  var REVIEW_STRATEGIES   = ["manual","fixed_interval","after_book","after_subject","round_based","custom"];

  R.ACTIVITY_KINDS      = ACTIVITY_KINDS;
  R.ACTIVITY_STATUSES   = ACTIVITY_STATUSES;
  R.ASSESSMENT_TYPES    = ASSESSMENT_TYPES;
  R.ASSESSMENT_STATUSES = ASSESSMENT_STATUSES;
  R.REVIEW_TARGET_TYPES = REVIEW_TARGET_TYPES;
  R.REVIEW_STRATEGIES   = REVIEW_STRATEGIES;

  function _int(v, def) { var n = parseInt(v, 10); return isNaN(n) ? def : n; }
  function _num(v, def) { var n = parseFloat(v); return isNaN(n) ? def : n; }
  function _str(v) { return String(v == null ? "" : v); }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }
  function _nullInt(v) { if (v == null || v === "") return null; var n = parseInt(v, 10); return isNaN(n) ? null : n; }
  function _nullNum(v) { if (v == null || v === "") return null; var n = parseFloat(v); return isNaN(n) ? null : n; }
  function _nullStr(v) { return (v === 0 || v) ? String(v) : null; }

  R.createActivity = function (input) {
    input = input || {};
    var a = _origCreateActivity(input);
    a.planId           = _nullStr(input.planId);
    a.plannedPageStart = _nullInt(input.plannedPageStart);
    a.plannedPageEnd   = _nullInt(input.plannedPageEnd);
    a.actualPageRanges = Array.isArray(input.actualPageRanges) ? input.actualPageRanges.map(function (r) {
      return { start: _int(r.start, 0), end: _int(r.end, 0) };
    }) : [];
    a.notes = _str(input.notes);
    if (a.kind === "review" && input.reviewTarget && typeof input.reviewTarget === "object") {
      a.reviewTarget = {
        type: _enum(input.reviewTarget.type, REVIEW_TARGET_TYPES, "custom"),
        activityId: _nullStr(input.reviewTarget.activityId),
        bookId:     _nullStr(input.reviewTarget.bookId),
        subjectId:  _nullStr(input.reviewTarget.subjectId),
        pageStart:  _nullInt(input.reviewTarget.pageStart),
        pageEnd:    _nullInt(input.reviewTarget.pageEnd)
      };
    } else { a.reviewTarget = null; }
    if (a.kind === "review" && input.reviewMeta && typeof input.reviewMeta === "object") {
      a.reviewMeta = {
        strategyType: _enum(input.reviewMeta.strategyType, REVIEW_STRATEGIES, "manual"),
        intervalDays: _nullInt(input.reviewMeta.intervalDays),
        sourceId:     _nullStr(input.reviewMeta.sourceId)
      };
    } else { a.reviewMeta = null; }
    a.assessmentId = _nullStr(input.assessmentId);
    return a;
  };

  R.createAssessment = function (input) {
    input = input || {};
    var a = _origCreateAssessment(input);
    a.planId                = _nullStr(input.planId);
    a.bookIds               = Array.isArray(input.bookIds) ? input.bookIds.map(String) : [];
    a.type                  = _enum(input.type, ASSESSMENT_TYPES, "custom");
    a.status                = _enum(input.status, ASSESSMENT_STATUSES, "planned");
    a.plannedStartTime      = _nullStr(input.plannedStartTime);
    a.actualDurationMinutes = _nullInt(input.actualDurationMinutes);
    a.scoreRaw              = _nullNum(input.scoreRaw);
    a.breakdown             = Array.isArray(input.breakdown) ? input.breakdown.map(function (b) {
      return {
        subjectId:     _nullStr(b.subjectId),
        topic:         _nullStr(b.topic),
        questionCount: _int(b.questionCount, 0),
        correct:       _int(b.correct, 0),
        wrong:         _int(b.wrong, 0),
        unanswered:    _int(b.unanswered, 0)
      };
    }) : [];
    return a;
  };

  R.validateActivity = function (a) {
    var errs = [];
    if (!a || typeof a !== "object") return ["activity is not object"];
    if (!a.id) errs.push("id required");
    if (ACTIVITY_KINDS.indexOf(a.kind) === -1) errs.push("invalid kind");
    if (ACTIVITY_STATUSES.indexOf(a.status) === -1) errs.push("invalid status");
    // duration/page ranges
    if (a.plannedDurationMinutes != null && (a.plannedDurationMinutes < 0)) {
      errs.push("plannedDurationMinutes must be >= 0");
    }
    if (a.actualDurationMinutes != null && (a.actualDurationMinutes < 0)) {
      errs.push("actualDurationMinutes must be >= 0");
    }
    if (a.plannedPages != null && a.plannedPages < 0) errs.push("plannedPages must be >= 0");
    if (a.actualPages  != null && a.actualPages  < 0) errs.push("actualPages must be >= 0");
    // page range consistency
    if (a.plannedPageStart != null && a.plannedPageEnd != null) {
      if (a.plannedPageEnd < a.plannedPageStart) {
        errs.push("plannedPageEnd < plannedPageStart");
      }
      if (a.plannedPages != null) {
        var expected = a.plannedPageEnd - a.plannedPageStart + 1;
        if (a.plannedPages !== expected) {
          errs.push("plannedPages does not match range size (" + expected + ")");
        }
      }
    }
    // review-specific
    if (a.kind === "review") {
      var rt = a.reviewTarget;
      if (rt) {
        if (rt.type === "activity" && !rt.activityId) errs.push("reviewTarget.activityId required");
        if (rt.type === "pages") {
          if (!rt.bookId) errs.push("reviewTarget.bookId required for pages");
          if (rt.pageStart == null || rt.pageEnd == null) errs.push("reviewTarget pages required");
          if (rt.pageStart != null && rt.pageEnd != null && rt.pageEnd < rt.pageStart) {
            errs.push("reviewTarget.pageEnd < pageStart");
          }
        }
        if (rt.type === "book"    && !rt.bookId)    errs.push("reviewTarget.bookId required");
        if (rt.type === "subject" && !rt.subjectId) errs.push("reviewTarget.subjectId required");
      }
    }
    return errs;
  };

  R.validateAssessment = function (a) {
    var errs = [];
    if (!a || typeof a !== "object") return ["assessment is not object"];
    if (!a.id) errs.push("id required");
    if (!a.title) errs.push("title required");
    if (ASSESSMENT_TYPES.indexOf(a.type) === -1) errs.push("invalid type");
    if (ASSESSMENT_STATUSES.indexOf(a.status) === -1) errs.push("invalid status");
    var keys = ["questionCount","correct","wrong","unanswered"];
    keys.forEach(function (k) {
      if (a[k] != null && a[k] < 0) errs.push(k + " must be >= 0");
    });
    // if complete counts
    if (a.questionCount != null && a.correct != null && a.wrong != null && a.unanswered != null) {
      var sum = a.correct + a.wrong + a.unanswered;
      if (sum !== a.questionCount) {
        errs.push("correct+wrong+unanswered (" + sum + ") != questionCount (" + a.questionCount + ")");
      }
    }
    if (a.scorePercent != null && (a.scorePercent < 0 || a.scorePercent > 100)) {
      errs.push("scorePercent must be 0..100");
    }
    // breakdown consistency
    if (Array.isArray(a.breakdown) && a.breakdown.length > 0) {
      var sumQ = 0;
      a.breakdown.forEach(function (b) {
        sumQ += (b.questionCount || 0);
      });
      if (a.questionCount != null && sumQ > a.questionCount) {
        errs.push("breakdown sum (" + sumQ + ") > questionCount (" + a.questionCount + ")");
      }
    }
    return errs;
  };

  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    (out.activities || []).forEach(function (a) {
      if (!a) return;
      if (!("planId" in a)) a.planId = null;
      if (!("plannedPageStart" in a)) a.plannedPageStart = null;
      if (!("plannedPageEnd" in a)) a.plannedPageEnd = null;
      if (!Array.isArray(a.actualPageRanges)) a.actualPageRanges = [];
      if (!("reviewTarget" in a)) a.reviewTarget = null;
      if (!("reviewMeta" in a)) a.reviewMeta = null;
      if (!("assessmentId" in a)) a.assessmentId = null;
      if (!("notes" in a)) a.notes = "";
    });
    (out.assessments || []).forEach(function (a) {
      if (!a) return;
      if (!("planId" in a)) a.planId = null;
      if (!Array.isArray(a.bookIds)) a.bookIds = [];
      if (!("type" in a)) a.type = "custom";
      if (!("status" in a)) a.status = "planned";
      if (!("plannedStartTime" in a)) a.plannedStartTime = null;
      if (!("actualDurationMinutes" in a)) a.actualDurationMinutes = null;
      if (!("scoreRaw" in a)) a.scoreRaw = null;
      if (!Array.isArray(a.breakdown)) a.breakdown = [];
    });
    // Ensure tasks have residencyActivityId (null by default)
    if (Array.isArray(window.INTERNSHIP_STATE && window.INTERNSHIP_STATE.tasks)) {
      // do not touch here — only exposed via migration
    }
    return out;
  };

  console.log("[InternshipResidency.domain.v4] loaded");
})();