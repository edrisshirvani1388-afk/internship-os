(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.policy.v11] R missing"); return; }
  var OP = R.reviewOverduePolicy = R.reviewOverduePolicy || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  OP.MODES = ["spread","priority","all"];

  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _addDays(d, n) {
    if (!DATE || !d) return d;
    var p = DATE.parseJalali(d);
    if (!p) return d;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  OP.apply = function (queueItems, mode, opts) {
    opts = opts || {};
    mode = OP.MODES.indexOf(mode) !== -1 ? mode : "spread";
    var sorted = queueItems.slice().sort(function (a, b) {
      return (b.priority && b.priority.score || 0) - (a.priority && a.priority.score || 0);
    });

    if (mode === "priority") {
      return sorted.map(function (it) { return { item: it, preferredDate: null }; });
    }

    if (mode === "all") {
      return sorted.map(function (it) { return { item: it, preferredDate: null }; });
    }

    // spread: distribute overdue items across N days
    var overdue = sorted.filter(function (x) { return x.overdueDays > 0; });
    var todayDue = sorted.filter(function (x) { return x.overdueDays === 0; });
    var today = opts.today || (DATE ? DATE.todayJalaliString() : "");

    var spreadDays = opts.spreadDays || 7;
    var buckets = [];
    for (var i = 0; i < spreadDays; i++) buckets.push([]);

    var totalMin = 0;
    overdue.forEach(function (it) { totalMin += (it.estimatedMinutes | 0); });
    var perDayTarget = Math.ceil(totalMin / spreadDays) || 1;

    var bucketIdx = 0;
    var bucketMin = 0;
    overdue.forEach(function (it) {
      if (bucketMin >= perDayTarget && bucketIdx < spreadDays - 1) {
        bucketIdx++;
        bucketMin = 0;
      }
      buckets[bucketIdx].push(it);
      bucketMin += (it.estimatedMinutes | 0);
    });

    var out = [];
    buckets.forEach(function (bucket, idx) {
      var date = idx === 0 ? today : _addDays(today, idx);
      bucket.forEach(function (it) {
        out.push({ item: it, preferredDate: date });
      });
    });
    todayDue.forEach(function (it) {
      out.push({ item: it, preferredDate: today });
    });
    return out;
  };

  console.log("[residency.review.policy.v11] loaded");
})();