/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Demand Builder v6.1
   Convert Enrollments + Progress → StudyDemand
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.demand.v6] R missing"); return; }
  R.plannerDemand = R.plannerDemand || {};

  // ─── Already-studied pages from completed/partial study activities ───
  R.plannerDemand.computeStudiedPages = function (activities, bookId, roundId, enrollment, book, allEnrollments, allRounds) {
  /* [PATCH:f4b7-demand] Cross-round completed + plannedPages fallback */
  var fromActivities = 0;
  (activities || []).forEach(function (a) {
    if (!a) return;
    if (a.kind !== "study") return;
    if (a.bookId !== bookId) return;

    var isDone = (a.status === "completed" || a.status === "partial" || a.status === "in_progress");
    if (!isDone) {
      if (roundId && a.roundId !== roundId) return; /* planned scoped to round */
      if (a.status === "planned") {
        if (a.plannedPages != null) fromActivities += (a.plannedPages | 0);
      }
      return;
    }

    var p = (a.actualPages != null && a.actualPages > 0) ? a.actualPages : (a.plannedPages || 0);
    fromActivities += (p | 0);
  });

  var fromBaseline = 0;
  if (enrollment && book && R.baseline && R.baseline.resolveForEnrollment) {
    try {
      var eb = R.baseline.resolveForEnrollment(enrollment, book, allEnrollments || [], allRounds || []);
      if (eb) fromBaseline = R.baseline.computePages(eb, book.totalPages);
    } catch (e) {
      console.warn("[planner.demand] baseline resolve failed:", e);
    }
  }
  return fromActivities + fromBaseline;
};;

  R.plannerDemand.resolveStatus = function (enrollment, remaining, overage) {
    var mode = (enrollment && enrollment.mode) || "included";
    if (mode === "excluded") return "excluded";
    if (mode === "paused") return "paused";
    if (mode === "review_only") return "review_only";
    if (mode === "optional") return "optional";
    if (remaining === 0 && overage >= 0) return "completed";
    return "active";
  };

  R.plannerDemand.resolvePagesPerHour = function (enrollment, defaultPagesPerHour, round) {
    // Phase 9: round-level speed takes priority; fallback to enrollment, then global default
    if (R.studySpeed && typeof R.studySpeed.resolve === "function") {
      try {
        var settings = { defaultPagesPerHour: defaultPagesPerHour || 20 };
        return R.studySpeed.resolve(round, settings, enrollment);
      } catch (e) { /* fall through */ }
    }
    var def = defaultPagesPerHour || 20;
    if (!enrollment) return def;
    if (enrollment.useCustomSpeed && enrollment.customPagesPerHour != null) {
      var custom = parseFloat(enrollment.customPagesPerHour);
      if (!isNaN(custom) && custom > 0) return custom;
    }
    return def;
  };

  // ─── Build single demand ───
  R.plannerDemand.buildStudyDemand = function (enrollment, book, round, opts) {
    opts = opts || {};
    if (!enrollment || !book || !round) return null;

    var totalPagesInBook = (typeof book.totalPages === "number" && book.totalPages >= 0)
      ? book.totalPages : 0;
    var coveragePercent = (enrollment.targetCoveragePercent != null)
      ? Math.max(0, Math.min(100, Math.round(enrollment.targetCoveragePercent)))
      : 100;
    var targetPages = Math.round(totalPagesInBook * coveragePercent / 100);

    var studied = R.plannerDemand.computeStudiedPages(
      opts.activities || [],
      book.id,
      round.id,
      enrollment,
      book,
      opts.allEnrollments || [],
      opts.allRounds || []
    );
    var remaining = Math.max(0, targetPages - studied);
    var overage = Math.max(0, studied - targetPages);

    var pagesPerHour = R.plannerDemand.resolvePagesPerHour(enrollment, opts.defaultPagesPerHour, round);
    var estimatedMinutes = (pagesPerHour > 0)
      ? Math.ceil(remaining / pagesPerHour * 60)
      : 0;

    var status = R.plannerDemand.resolveStatus(enrollment, remaining, overage);

    return R.planner.createStudyDemand({
      enrollmentId: enrollment.id,
      bookId: enrollment.bookId,
      roundId: enrollment.roundId,
      subjectId: book.subjectId || null,
      totalPagesInBook: totalPagesInBook,
      coveragePercent: coveragePercent,
      targetPages: targetPages,
      alreadyStudiedPages: studied,
      remainingPages: remaining,
      overagePages: overage,
      pagesPerHour: pagesPerHour,
      estimatedRemainingMinutes: estimatedMinutes,
      studyOrder: (function () {
        if (enrollment.studyOrder != null) return enrollment.studyOrder;
        if (opts.bookIndex != null) return opts.bookIndex;
        if (book && typeof book.createdAt === "number") return book.createdAt;
        return null;
      })(),
      bookPriority: book.priority || "normal",
      mode: enrollment.mode || "included",
      status: status
    });
  };

  // ─── Build all demands from snapshot components ───
  R.plannerDemand.buildAll = function (opts) {
    opts = opts || {};
    var enrollments = opts.enrollments || [];
    var books = opts.books || [];
    var rounds = opts.rounds || [];
    var activities = opts.activities || [];
    var defaultSpeed = opts.defaultPagesPerHour || 20;

    var booksMap = {};
    var booksIndex = {};
    books.forEach(function (b, bi) {
      if (b && b.id) { booksMap[b.id] = b; booksIndex[b.id] = bi; }
    });
    var roundsMap = {};
    rounds.forEach(function (r) { if (r && r.id) roundsMap[r.id] = r; });

    var demands = [];
    var _seenKeys = {}; /* [PATCH:f9-dedup-safe] dedup by (bookId, roundId); safe for empty roundId */
    enrollments.forEach(function (e) {
      if (!e) return;
      var _bk = e.bookId || "";
      var _rd = e.roundId || "";
      var _canDedup = (_bk !== "" && _rd !== "");
      if (_canDedup) {
        var _key = _bk + "::" + _rd;
        if (_seenKeys[_key]) return;
        _seenKeys[_key] = true;
      }
      var b = booksMap[e.bookId];
      var r = roundsMap[e.roundId];
      if (!b || !r) return;
      var d = R.plannerDemand.buildStudyDemand(e, b, r, {
        activities: activities,
        defaultPagesPerHour: defaultSpeed,
        allEnrollments: enrollments,
        allRounds: rounds,
        bookIndex: booksIndex[b.id]
      });
      if (d) demands.push(d);
    });
    return demands;
  };

  // ─── Statistics helpers (pure) ───
  R.plannerDemand.summarize = function (demands) {
    demands = demands || [];
    var totalTarget = 0, totalRemaining = 0, totalMinutes = 0;
    var activeCount = 0, completedCount = 0, excludedCount = 0;
    demands.forEach(function (d) {
      totalTarget    += d.targetPages;
      totalRemaining += d.remainingPages;
      totalMinutes   += d.estimatedRemainingMinutes;
      if (d.status === "active") activeCount++;
      else if (d.status === "completed") completedCount++;
      else if (d.status === "excluded") excludedCount++;
    });
    return {
      totalDemands: demands.length,
      activeCount: activeCount,
      completedCount: completedCount,
      excludedCount: excludedCount,
      totalTargetPages: totalTarget,
      totalRemainingPages: totalRemaining,
      totalEstimatedRemainingMinutes: totalMinutes
    };
  };

  console.log("[planner.demand.v6] loaded");
})();
