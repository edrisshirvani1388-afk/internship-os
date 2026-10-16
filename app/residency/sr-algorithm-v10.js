(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.sr.v10] R missing"); return; }
  var SR = R.spacedRepetition = R.spacedRepetition || {};
  var LIB = window.InternshipLib;
  if (!LIB) { console.warn("[residency.sr.v10] lib missing"); return; }
  var DATE = LIB.date;

  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _addDays(dateStr, n) {
    if (!DATE || !dateStr) return dateStr;
    var p = DATE.parseJalali(dateStr);
    if (!p) return dateStr;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }
  function _clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

  SR.getSettings = function () {
    if (R.store && R.store.getReviewSettings) return R.store.getReviewSettings();
    return R.createDefaultReviewSettings ? R.createDefaultReviewSettings() : {
      minIntervalDays: 1, maxIntervalDays: 180
    };
  };

  var sr_v1 = {
    id: "sr_v1",
    version: 1,

    initialize: function (target) {
      return R.createReviewState({
        targetType: target.targetType,
        targetId: target.targetId,
        bookId: target.bookId || null,
        subjectId: target.subjectId || null,
        pageStart: target.pageStart != null ? target.pageStart : null,
        pageEnd: target.pageEnd != null ? target.pageEnd : null,
        algorithm: "sr_v1",
        algorithmVersion: 1,
        repetitions: 0,
        lapses: 0,
        intervalDays: 0,
        easeFactor: 2.5,
        status: "new",
        nextReviewAt: _today()
      });
    },

    schedule: function (state, rating) {
      var settings = SR.getSettings();
      var minI = settings.minIntervalDays || 1;
      var maxI = settings.maxIntervalDays || 180;
      var today = _today();

      var repetitions = state.repetitions | 0;
      var lapses = state.lapses | 0;
      var intervalDays = state.intervalDays | 0;
      var ease = (typeof state.easeFactor === "number") ? state.easeFactor : 2.5;
      var status = state.status || "new";

      var newStatus = status;
      var newRep = repetitions;
      var newLapses = lapses;
      var newInterval = intervalDays;

      if (status === "new" || status === "learning" || status === "relearning") {
        if (rating === "again") {
          newStatus = "learning";
          newInterval = 0;
          newRep = 0;
        } else if (rating === "hard") {
          newStatus = "learning";
          newInterval = minI;
          newRep = repetitions + 1;
        } else if (rating === "good") {
          newStatus = "review";
          newInterval = minI;
          newRep = repetitions + 1;
        } else if (rating === "easy") {
          newStatus = "review";
          newInterval = Math.max(minI, Math.round(minI * 2.5));
          newRep = repetitions + 1;
        }
      } else {
        if (rating === "again") {
          newStatus = "relearning";
          newLapses = lapses + 1;
          newInterval = 0;
          newRep = 0;
          ease = _clamp(ease - 0.20, 1.3, 3.0);
        } else if (rating === "hard") {
          newInterval = Math.max(minI, Math.round(intervalDays * 1.2));
          newRep = repetitions + 1;
          ease = _clamp(ease - 0.15, 1.3, 3.0);
          newStatus = "review";
        } else if (rating === "good") {
          newInterval = Math.max(minI, Math.round(intervalDays * ease));
          newRep = repetitions + 1;
          newStatus = "review";
        } else if (rating === "easy") {
          newInterval = Math.max(minI, Math.round(intervalDays * ease * 1.3));
          newRep = repetitions + 1;
          ease = _clamp(ease + 0.15, 1.3, 3.0);
          newStatus = "review";
        }
      }

      newInterval = _clamp(newInterval, 0, maxI);
      var nextAt = newInterval === 0 ? today : _addDays(today, newInterval);

      return {
        intervalDays: newInterval,
        nextReviewAt: nextAt,
        repetitions: newRep,
        lapses: newLapses,
        easeFactor: ease,
        stability: null,
        difficulty: null,
        status: newStatus,
        lastReviewedAt: Date.now(),
        lastRating: rating
      };
    },

    preview: function (state, rating) { return this.schedule(state, rating); }
  };

  SR.algorithms = { sr_v1: sr_v1 };
  SR.getAlgorithm = function (id) { return SR.algorithms[id] || sr_v1; };

  SR.registerTarget = function (target) {
    if (!target || !target.targetType || !target.targetId) return null;
    var existing = R.store.findReviewStateByTarget(target.targetType, target.targetId);
    if (existing) return existing;
    var algo = SR.getAlgorithm(SR.getSettings().defaultAlgorithm || "sr_v1");
    var newState = algo.initialize(target);
    return R.store.addReviewState(newState);
  };

  SR.completeReview = function (activityId, rating) {
    // ─── [PATCH:v11-robust] pre-validate before any mutation ───
    if (R.REVIEW_RATINGS.indexOf(rating) === -1) {
      console.warn("[sr] invalid rating:", rating);
      return { ok: false, error: "invalid_rating" };
    }
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return { ok: false, error: "no_state" };
    var act = (s.residency.activities || []).find(function (a) { return a && a.id === activityId; });
    if (!act) return { ok: false, error: "activity_not_found" };
    if (act.kind !== "review") return { ok: false, error: "not_review" };
    if (act.status === "cancelled") return { ok: false, error: "cancelled" };
    if (act.status === "completed") return { ok: false, error: "already_completed" };
    if (!act.reviewTarget) return { ok: false, error: "no_target" };

    var targetId = act.reviewTarget.targetId;
    if (!targetId) {
      if (act.reviewTarget.type === "pages" && act.reviewTarget.bookId) {
        targetId = "pages:" + act.reviewTarget.bookId + ":" + (act.reviewTarget.pageStart|0) + "-" + (act.reviewTarget.pageEnd|0);
      } else if (act.reviewTarget.type === "book" && act.reviewTarget.bookId) {
        targetId = "book:" + act.reviewTarget.bookId;
      } else if (act.reviewTarget.type === "subject" && act.reviewTarget.subjectId) {
        targetId = "subject:" + act.reviewTarget.subjectId;
      }
    }
    if (!targetId) return null;

    var reviewState = R.store.findReviewStateByTarget(act.reviewTarget.type, targetId);
    if (!reviewState) {
      reviewState = SR.registerTarget({
        targetType: act.reviewTarget.type,
        targetId: targetId,
        bookId: act.reviewTarget.bookId || act.bookId || null,
        subjectId: act.reviewTarget.subjectId || act.subjectId || null,
        pageStart: act.reviewTarget.pageStart,
        pageEnd: act.reviewTarget.pageEnd
      });
    }
    if (!reviewState) return null;

    var algo = SR.getAlgorithm(reviewState.algorithm || "sr_v1");
    var next = algo.schedule(reviewState, rating);

    R.store.updateReviewState(reviewState.id, next);
    R.store.updateActivity(activityId, {
      status: "completed",
      actualDurationMinutes: act.actualDurationMinutes != null ? act.actualDurationMinutes : (act.plannedDurationMinutes || null),
      notes: (act.notes ? act.notes + " | " : "") + "rating=" + rating
    });

    if (R.taskProjection && R.taskProjection.syncActivityToTask) {
      try { R.taskProjection.syncActivityToTask(activityId); } catch (e) {}
    }

    return { ok: true, reviewStateId: reviewState.id, next: next };
  };

  console.log("[InternshipResidency.sr.v10] loaded");
})();