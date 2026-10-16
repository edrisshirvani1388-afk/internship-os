(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.manual.v11] R missing"); return; }
  var M = R.reviewManual = R.reviewManual || {};
  var LIB = window.InternshipLib;

  M.suspend = function (id, reason) {
    return R.store.suspendReviewState(id, reason || "manual_user");
  };
  M.resume = function (id) {
    return R.store.resumeReviewState(id);
  };
  M.reviewNow = function (id) {
    var s = R.store.getReviewState(id);
    if (!s) return null;
    if (s.status === "suspended" || s.status === "completed") return null;
    return R.store.updateReviewState(id, {
      nextReviewAt: LIB.date ? LIB.date.todayJalaliString() : null,
      status: s.repetitions === 0 ? "new" : "review"
    });
  };
  M.changeDueDate = function (id, newDate) {
    if (!newDate) return null;
    var s = R.store.getReviewState(id);
    if (!s) return null;
    // Mark as manual override
    return R.store.updateReviewState(id, {
      nextReviewAt: newDate,
      notes: (s.notes ? s.notes + " | " : "") + "manual_due_override"
    });
  };
  M.resetSchedule = function (id) {
    var s = R.store.getReviewState(id);
    if (!s) return null;
    return R.store.updateReviewState(id, {
      repetitions: 0, lapses: 0, intervalDays: 0,
      easeFactor: 2.5, stability: null, difficulty: null,
      lastReviewedAt: null, lastRating: null,
      nextReviewAt: LIB.date ? LIB.date.todayJalaliString() : null,
      status: "new"
    });
  };
  M.markDifficult = function (id) {
    var s = R.store.getReviewState(id);
    if (!s) return null;
    return R.store.updateReviewState(id, {
      difficulty: 0.9,
      easeFactor: Math.max(1.3, (s.easeFactor || 2.5) - 0.3)
    });
  };

  console.log("[residency.review.manual.v11] loaded");
})();