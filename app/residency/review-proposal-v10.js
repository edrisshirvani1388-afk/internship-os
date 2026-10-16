(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.proposal.v10] R missing"); return; }
  var RP = R.reviewProposal = R.reviewProposal || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _mkId(p) {
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }

  RP.generate = function (opts) {
    opts = opts || {};
    var date = opts.date || _today();
    var horizonDays = opts.horizonDays || 7;
    var settings = R.store.getReviewSettings();
    if (!settings.enabled) return { ok: false, error: "review_disabled", proposal: null };

    var dailyLimit = settings.dailyReviewLimit || 20;
    var maxMinutes = settings.maxReviewMinutesPerDay || 90;

    var queue = R.reviewQueue.getDue(date);
    var proposed = [], deferred = [], usedMinutes = 0;

    queue.forEach(function (item) {
      if (proposed.length >= dailyLimit) { deferred.push({ item: item, reason: "daily_limit" }); return; }
      if (usedMinutes + item.estimatedMinutes > maxMinutes) { deferred.push({ item: item, reason: "max_minutes" }); return; }
      proposed.push(item);
      usedMinutes += item.estimatedMinutes;
    });

    var proposalId = _mkId("rvp");
    var proposedActivities = proposed.map(function (item) {
      return _buildActivityPayload(item, date, proposalId);
    });

    var reasons = [];
    deferred.forEach(function (d) { if (reasons.indexOf(d.reason) === -1) reasons.push(d.reason); });

    return {
      ok: true,
      proposal: {
        version: 1,
        proposalId: proposalId,
        planId: null,
        date: date,
        horizonDays: horizonDays,
        generatedAt: Date.now(),
        proposedActivities: proposedActivities,
        deferredItems: deferred.map(function (d) {
          return {
            reviewStateId: d.item.reviewStateId,
            targetType: d.item.targetType,
            targetId: d.item.targetId,
            dueDate: d.item.dueDate,
            reason: d.reason,
            estimatedMinutes: d.item.estimatedMinutes
          };
        }),
        statistics: {
          dueCount: queue.length,
          proposedCount: proposed.length,
          deferredCount: deferred.length,
          totalMinutes: usedMinutes,
          remainingBudget: Math.max(0, maxMinutes - usedMinutes)
        },
        feasibility: {
          status: deferred.length === 0 ? "feasible" : "feasible_with_warnings",
          deferredReasons: reasons
        }
      }
    };
  };

  function _buildActivityPayload(item, date, proposalId) {
    return {
      kind: "review",
      planId: null,
      roundId: null,
      bookId: item.bookId || null,
      subjectId: item.subjectId || null,
      taskId: null,
      sourceType: "review_scheduler",
      sourceId: proposalId,
      plannedDate: date,
      plannedStartTime: null,
      plannedDurationMinutes: item.estimatedMinutes,
      plannedPages: null,
      plannedPageStart: null,
      plannedPageEnd: null,
      actualPages: 0,
      actualDurationMinutes: 0,
      actualPageRanges: [],
      status: "planned",
      locked: false,
      notes: "reviewStateId=" + item.reviewStateId,
      title: _buildTitle(item),
      reviewTarget: {
        type: item.targetType === "page_range" ? "pages" : item.targetType,
        activityId: item.targetType === "activity" ? item.targetId : null,
        bookId: item.bookId || null,
        subjectId: item.subjectId || null,
        pageStart: item.pageStart || null,
        pageEnd: item.pageEnd || null,
        targetId: item.targetId,
        reviewStateId: item.reviewStateId
      },
      reviewMeta: {
        strategyType: "sr_v1",
        intervalDays: null,
        sourceId: item.reviewStateId
      },
      assessmentId: null
    };
  }

  function _buildTitle(item) {
    if (item.targetType === "book" && item.bookId) {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      if (s && s.residency) {
        var b = (s.residency.books || []).find(function (x) { return x && x.id === item.bookId; });
        if (b) return "مرور: " + b.title;
      }
      return "مرور کتاب";
    }
    if (item.targetType === "page_range" && item.pageStart != null) {
      return "مرور صفحات " + item.pageStart + "-" + item.pageEnd;
    }
    if (item.targetType === "subject") return "مرور موضوع";
    if (item.targetType === "activity") return "مرور فعالیت";
    return "مرور";
  }

  console.log("[InternshipResidency.review.proposal.v10] loaded");
})();