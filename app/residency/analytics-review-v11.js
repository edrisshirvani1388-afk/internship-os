(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.analytics.review.v11] R missing"); return; }
  var AM = R.analyticsMetrics = R.analyticsMetrics || {};
  var AT = R.analyticsReviewTrends = R.analyticsReviewTrends = R.analyticsReviewTrends || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _pct(n, d) { return (!d || d === 0) ? 0 : Math.round((n / d) * 100); }
  function _round1(n) { return Math.round(n * 10) / 10; }

  // Extend AM.review with backlog, backlogMinutes, trends, retentionProxy
  var _origReview = AM.review;
  AM.review = function (activities, reviewStates, range) {
    var base = _origReview ? _origReview(activities, reviewStates, range) : {
      totalReviews: 0, due: 0, overdue: 0, completed: 0, completionRate: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      averageIntervalDays: 0, averageOverdueDays: 0, lapses: 0,
      totalPlannedMinutes: 0, totalActualMinutes: 0
    };
    var today = _today();

    // backlog
    var backlogSize = 0, backlogMinutes = 0, overdueSum = 0, overdueCount = 0;
    (reviewStates || []).forEach(function (s) {
      if (!s) return;
      if (s.status === "suspended" || s.status === "completed") return;
      if (!s.nextReviewAt) return;
      if (_cmp(s.nextReviewAt, today) <= 0) {
        backlogSize++;
        backlogMinutes += (R.reviewQueue && R.reviewQueue.estimateWorkloadMinutes
          ? R.reviewQueue.estimateWorkloadMinutes(s) : 15);
      }
      if (_cmp(s.nextReviewAt, today) < 0) {
        var pa = DATE.parseJalali(s.nextReviewAt);
        var pb = DATE.parseJalali(today);
        if (pa && pb) {
          overdueSum += DATE.jalaliToDayNumber(pb.jy, pb.jm, pb.jd) - DATE.jalaliToDayNumber(pa.jy, pa.jm, pa.jd);
          overdueCount++;
        }
      }
    });

    var reviewConsistency = 0;
    if (base.totalReviews >= 5) {
      reviewConsistency = base.completionRate;
    }

    var totalRatings = (base.ratings.again|0)+(base.ratings.hard|0)+(base.ratings.good|0)+(base.ratings.easy|0);
    var positiveRatings = (base.ratings.good|0)+(base.ratings.easy|0);
    var retentionProxy = null;
    if (totalRatings >= 5) {
      var ratingQuality = positiveRatings / totalRatings; // 0..1
      var lapseRatio = base.lapses / Math.max(1, reviewStates ? reviewStates.length : 1);
      var overduePenalty = backlogSize > 0 ? Math.min(0.3, backlogSize / 50) : 0;
      var consistency = reviewConsistency / 100;
      retentionProxy = _round1(Math.max(0, Math.min(1,
        0.5 * ratingQuality + 0.3 * consistency - 0.2 * lapseRatio - overduePenalty
      )));
    }

    base.backlogSize = backlogSize;
    base.backlogMinutes = backlogMinutes;
    base.reviewConsistency = reviewConsistency;
    base.retentionProxy = retentionProxy;
    base.overdueGrowth = null; // filled by trends
    return base;
  };

  // Trends for backlog/overdue/lapses/load
  function _compareMetric(series) {
    if (!Array.isArray(series) || series.length < 4) {
      return { direction: "insufficient_data", delta: 0, percentChange: 0 };
    }
    var half = Math.floor(series.length / 2);
    var a = 0, b = 0;
    for (var i = 0; i < half; i++) a += series[i];
    for (var j = half; j < series.length; j++) b += series[j];
    a = a / half;
    b = b / (series.length - half);
    var delta = b - a;
    var pct = a !== 0 ? Math.round((delta / Math.abs(a)) * 100) : 0;
    var dir = "stable";
    if (Math.abs(pct) > 10) dir = delta > 0 ? "increasing" : "decreasing";
    return { direction: dir, delta: _round1(delta), percentChange: pct, baseline: _round1(a), current: _round1(b) };
  }

  AT.compute = function (reviewStates, activities, horizonDays) {
    horizonDays = horizonDays || 30;
    var today = _today();
    var out = {
      backlog: { direction: "insufficient_data" },
      overdue: { direction: "insufficient_data" },
      lapses: { direction: "insufficient_data" },
      load: { direction: "insufficient_data" }
    };
    if (!DATE) return out;

    // Build historical series by day (last horizonDays)
    var days = [];
    for (var i = horizonDays - 1; i >= 0; i--) {
      var p = DATE.parseJalali(today);
      var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, -i);
      days.push(DATE.dateKey(r.jy, r.jm, r.jd));
    }

    // For each day, compute rough snapshot of review state at that time
    var backlogSeries = [], overdueSeries = [], lapseSeries = [], loadSeries = [];

    days.forEach(function (day) {
      var b = 0, o = 0, l = 0, m = 0;
      (reviewStates || []).forEach(function (s) {
        if (!s || s.status === "completed") return;
        if (!s.nextReviewAt) return;
        if (_cmp(s.nextReviewAt, day) <= 0) b++;
        if (_cmp(s.nextReviewAt, day) < 0) o++;
        l += (s.lapses | 0);
      });
      (activities || []).forEach(function (a) {
        if (!a || a.kind !== "review") return;
        if (a.plannedDate === day) m += (a.plannedDurationMinutes | 0);
      });
      backlogSeries.push(b);
      overdueSeries.push(o);
      lapseSeries.push(l);
      loadSeries.push(m);
    });

    out.backlog = _compareMetric(backlogSeries);
    out.overdue = _compareMetric(overdueSeries);
    out.lapses = _compareMetric(lapseSeries);
    out.load = _compareMetric(loadSeries);
    return out;
  };

  console.log("[residency.analytics.review.v11] loaded");
})();