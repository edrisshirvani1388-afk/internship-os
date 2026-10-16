(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.analytics.review.v10] R missing"); return; }
  var AM = R.analyticsMetrics = R.analyticsMetrics || {};
  var AI = R.analyticsInsights = R.analyticsInsights || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _pct(n, d) { return (!d || d === 0) ? 0 : Math.round((n / d) * 100); }

  AM.review = function (activities, reviewStates, range) {
    var out = {
      totalReviews: 0, due: 0, overdue: 0, completed: 0,
      completionRate: 0,
      ratings: { again: 0, hard: 0, good: 0, easy: 0 },
      averageIntervalDays: 0,
      averageOverdueDays: 0,
      lapses: 0,
      totalPlannedMinutes: 0, totalActualMinutes: 0
    };
    var today = _today();
    var intervals = [];

    (activities || []).forEach(function (a) {
      if (!a || a.kind !== "review") return;
      if (range) {
        if (range.start && a.plannedDate && _cmp(a.plannedDate, range.start) < 0) return;
        if (range.end && a.plannedDate && _cmp(range.end, a.plannedDate) < 0) return;
      }
      out.totalReviews++;
      if (a.status === "completed") out.completed++;
      out.totalPlannedMinutes += (a.plannedDurationMinutes | 0);
      out.totalActualMinutes += (a.actualDurationMinutes | 0);
      if (a.notes) {
        var m = /rating=(again|hard|good|easy)/.exec(a.notes);
        if (m && out.ratings[m[1]] != null) out.ratings[m[1]]++;
      }
    });

    (reviewStates || []).forEach(function (s) {
      if (!s) return;
      if (s.status === "suspended" || s.status === "completed") return;
      var due = s.nextReviewAt;
      if (!due) return;
      if (_cmp(due, today) <= 0) out.due++;
      if (_cmp(due, today) < 0) out.overdue++;
      intervals.push(s.intervalDays | 0);
      out.lapses += (s.lapses | 0);
    });

    out.completionRate = _pct(out.completed, out.totalReviews);
    if (intervals.length > 0) {
      var sum = 0;
      intervals.forEach(function (i) { sum += i; });
      out.averageIntervalDays = Math.round(sum / intervals.length * 10) / 10;
    }
    var overdueDaysSum = 0, overdueCount = 0;
    (reviewStates || []).forEach(function (s) {
      if (!s || !s.nextReviewAt) return;
      if (s.status === "suspended" || s.status === "completed") return;
      if (_cmp(s.nextReviewAt, today) < 0) {
        var pa = DATE.parseJalali(s.nextReviewAt);
        var pb = DATE.parseJalali(today);
        if (pa && pb) {
          overdueDaysSum += DATE.jalaliToDayNumber(pb.jy, pb.jm, pb.jd) - DATE.jalaliToDayNumber(pa.jy, pa.jm, pa.jd);
          overdueCount++;
        }
      }
    });
    if (overdueCount > 0) out.averageOverdueDays = Math.round(overdueDaysSum / overdueCount * 10) / 10;
    return out;
  };

  var _origAll = AI.all;
  AI.all = function (opts) {
    var base = _origAll ? _origAll(opts) : [];
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return base;
    var stats = AM.review(s.residency.activities || [], s.residency.reviewStates || [], null);
    if (stats.overdue >= 10) {
      base.push({
        id: "ins_review_backlog_" + Date.now().toString(36),
        type: "review_backlog", severity: "warning",
        title: "بک‌لاگ مرور زیاد است",
        explanation: stats.overdue + " مرور overdue دارید.",
        metric: "review.overdue", value: stats.overdue, threshold: 10,
        evidence: ["overdue=" + stats.overdue]
      });
    }
    if (stats.lapses > 5) {
      base.push({
        id: "ins_high_lapse_" + Date.now().toString(36),
        type: "high_lapse_rate", severity: "warning",
        title: "نرخ lapse بالا",
        explanation: stats.lapses + " lapse در review state ثبت شده.",
        metric: "review.lapses", value: stats.lapses, threshold: 5,
        evidence: ["lapses=" + stats.lapses]
      });
    }
    if (stats.totalReviews > 10 && stats.completionRate < 50) {
      base.push({
        id: "ins_low_consistency_" + Date.now().toString(36),
        type: "low_review_consistency", severity: "info",
        title: "یکنواختی مرور پایین",
        explanation: "فقط " + stats.completionRate + "% مرورهای برنامه‌ریزی‌شده انجام شده‌اند.",
        metric: "review.completionRate", value: stats.completionRate, threshold: 50,
        evidence: ["completionRate=" + stats.completionRate]
      });
    }
    if (stats.due > 30) {
      base.push({
        id: "ins_review_load_high_" + Date.now().toString(36),
        type: "review_load_high", severity: "info",
        title: "بار مرور بالا",
        explanation: stats.due + " مرور در صف است.",
        metric: "review.due", value: stats.due, threshold: 30,
        evidence: ["due=" + stats.due]
      });
    }
    return base;
  };

  console.log("[InternshipResidency.analytics.review.v10] loaded");
})();