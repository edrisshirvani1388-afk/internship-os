(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.ai.review.context.v11] R missing"); return; }
  var RC = R.reviewAIContext = R.reviewAIContext || {};

  RC.build = function (opts) {
    opts = opts || {};
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return null;
    var activities = s.residency.activities || [];
    var states = s.residency.reviewStates || [];
    var settings = R.store.getReviewSettings();

    var metrics = R.analyticsMetrics.review(activities, states, null);
    var trends = R.analyticsReviewTrends.compute(states, activities, 30);
    var insights = R.analyticsInsights ? R.analyticsInsights.all({}) : [];
    var reviewInsights = insights.filter(function (i) {
      return i && i.type && i.type.indexOf("review") === 0 ||
             i.type === "high_lapse_rate" || i.type === "low_review_consistency" ||
             i.type === "review_backlog" || i.type === "review_load_high";
    });

    var queueSummary = R.reviewQueue.getSummary();

    return {
      generatedAt: Date.now(),
      metrics: {
        totalReviews: metrics.totalReviews,
        due: metrics.due,
        overdue: metrics.overdue,
        completed: metrics.completed,
        completionRate: metrics.completionRate,
        averageIntervalDays: metrics.averageIntervalDays,
        averageOverdueDays: metrics.averageOverdueDays,
        lapses: metrics.lapses,
        backlogSize: metrics.backlogSize,
        backlogMinutes: metrics.backlogMinutes,
        reviewConsistency: metrics.reviewConsistency,
        retentionProxy: metrics.retentionProxy,
        ratings: metrics.ratings
      },
      trends: trends,
      queue: {
        dueToday: queueSummary.dueToday,
        overdueCount: queueSummary.overdue,
        upcoming7: queueSummary.upcoming7,
        upcoming30: queueSummary.upcoming30,
        totalEstimatedMinutes: queueSummary.totalEstimatedMinutes
      },
      settings: {
        overduePolicy: settings.overduePolicy,
        dailyReviewLimit: settings.dailyReviewLimit,
        maxReviewMinutesPerDay: settings.maxReviewMinutesPerDay,
        minIntervalDays: settings.minIntervalDays,
        maxIntervalDays: settings.maxIntervalDays
      },
      deterministicInsights: reviewInsights.slice(0, 15),
      source: "review-ai-context-v11",
      disclaimer: "Metrics are deterministic system calculations. Do not recompute or invent numbers."
    };
  };

  console.log("[residency.ai.review.context.v11] loaded");
})();