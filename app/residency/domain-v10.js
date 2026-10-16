(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v10] R missing"); return; }
  var _origNormalize = R.normalizeResidencyState;
  var _LIB = window.InternshipLib;

  function _mkId(p) {
    if (_LIB && _LIB.id && _LIB.id.content) { try { return _LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _now() { return Date.now(); }
  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) {
    if (typeof d === "undefined") d = 0;
    if (v == null || v === "") return d;
    var n = parseInt(v, 10);
    return isNaN(n) ? d : n;
  }
  function _nullStr(v) { return (v === 0 || v) ? String(v) : null; }
  function _nullNum(v) {
    if (v == null || v === "") return null;
    var n = parseFloat(v);
    return isNaN(n) ? null : n;
  }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }

  var TARGET_TYPES = ["task","subject","book","page_range","activity"];
  var STATUSES = ["new","learning","review","relearning","suspended","completed"];
  var RATINGS = ["again","hard","good","easy"];
  var ALGORITHMS = ["sr_v1"];

  R.REVIEW_TARGET_TYPES = TARGET_TYPES;
  R.REVIEW_STATUSES = STATUSES;
  R.REVIEW_RATINGS = RATINGS;
  R.REVIEW_ALGORITHMS = ALGORITHMS;

  R.createReviewState = function (input) {
    input = input || {};
    var t = _now();
    return {
      id: input.id || _mkId("rst"),
      targetType: _enum(input.targetType, TARGET_TYPES, "task"),
      targetId: _str(input.targetId),
      bookId: _nullStr(input.bookId),
      subjectId: _nullStr(input.subjectId),
      pageStart: input.pageStart == null ? null : _int(input.pageStart, null),
      pageEnd: input.pageEnd == null ? null : _int(input.pageEnd, null),
      algorithm: _enum(input.algorithm, ALGORITHMS, "sr_v1"),
      algorithmVersion: _int(input.algorithmVersion, 1),
      repetitions: _int(input.repetitions, 0),
      lapses: _int(input.lapses, 0),
      intervalDays: _int(input.intervalDays, 0),
      stability: _nullNum(input.stability),
      difficulty: _nullNum(input.difficulty),
      easeFactor: input.easeFactor != null ? parseFloat(input.easeFactor) : 2.5,
      lastReviewedAt: input.lastReviewedAt || null,
      nextReviewAt: input.nextReviewAt || null,
      lastRating: input.lastRating ? _enum(input.lastRating, RATINGS, null) : null,
      status: _enum(input.status, STATUSES, "new"),
      suspendedReason: _nullStr(input.suspendedReason),
      notes: _str(input.notes),
      createdAt: input.createdAt || t,
      updatedAt: t
    };
  };

  R.validateReviewState = function (s) {
    var errs = [];
    if (!s || typeof s !== "object") return ["reviewState is not object"];
    if (!s.id) errs.push("id required");
    if (TARGET_TYPES.indexOf(s.targetType) === -1) errs.push("invalid targetType");
    if (!s.targetId) errs.push("targetId required");
    if (STATUSES.indexOf(s.status) === -1) errs.push("invalid status");
    if (s.intervalDays < 0) errs.push("intervalDays must be >= 0");
    if (s.repetitions < 0) errs.push("repetitions must be >= 0");
    if (s.lapses < 0) errs.push("lapses must be >= 0");
    if (s.pageStart != null && s.pageEnd != null && s.pageEnd < s.pageStart) {
      errs.push("pageEnd < pageStart");
    }
    return errs;
  };

  R.createDefaultReviewSettings = function () {
    return {
      enabled: true,
      defaultAlgorithm: "sr_v1",
      minIntervalDays: 1,
      maxIntervalDays: 180,
      dailyReviewLimit: 20,
      maxReviewMinutesPerDay: 90,
      overduePolicy: "spread",
      horizonDays: 30,
      autoRegisterOnStudyComplete: true
    };
  };

  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    if (!Array.isArray(out.reviewStates)) out.reviewStates = [];
    out.reviewStates.forEach(function (s) {
      if (!s) return;
      if (!("algorithm" in s)) s.algorithm = "sr_v1";
      if (!("algorithmVersion" in s)) s.algorithmVersion = 1;
      if (!("easeFactor" in s)) s.easeFactor = 2.5;
      if (!("repetitions" in s)) s.repetitions = 0;
      if (!("lapses" in s)) s.lapses = 0;
      if (!("intervalDays" in s)) s.intervalDays = 0;
      if (!("status" in s)) s.status = "new";
      if (!("suspendedReason" in s)) s.suspendedReason = null;
      if (!("notes" in s)) s.notes = "";
    });
    if (!out.settings) out.settings = {};
    if (!out.settings.reviewSettings || typeof out.settings.reviewSettings !== "object") {
      out.settings.reviewSettings = R.createDefaultReviewSettings();
    } else {
      var def = R.createDefaultReviewSettings();
      Object.keys(def).forEach(function (k) {
        if (!(k in out.settings.reviewSettings)) out.settings.reviewSettings[k] = def[k];
      });
    }
    return out;
  };

  var _origCreateActivity = R.createActivity;
  R.createActivity = function (input) {
    input = input || {};
    var a = _origCreateActivity(input);
    if (a && a.reviewTarget && input.reviewTarget) {
      if (input.reviewTarget.targetId != null) a.reviewTarget.targetId = String(input.reviewTarget.targetId);
      if (input.reviewTarget.reviewStateId != null) a.reviewTarget.reviewStateId = String(input.reviewTarget.reviewStateId);
    }
    return a;
  };

  console.log("[InternshipResidency.domain.v10] loaded");
})();