(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.queue.v10] R missing"); return; }
  var Q = R.reviewQueue = R.reviewQueue || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _diffDays(a, b) {
    if (!DATE || !a || !b) return 0;
    var pa = DATE.parseJalali(a), pb = DATE.parseJalali(b);
    if (!pa || !pb) return 0;
    return DATE.jalaliToDayNumber(pa.jy, pa.jm, pa.jd) - DATE.jalaliToDayNumber(pb.jy, pb.jm, pb.jd);
  }
  function _addDays(dateStr, n) {
    if (!DATE || !dateStr) return dateStr;
    var p = DATE.parseJalali(dateStr);
    if (!p) return dateStr;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  Q.estimateWorkloadMinutes = function (reviewState) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return 15;
    var activities = s.residency.activities || [];
    var targetId = reviewState.targetId;
    var durations = [];
    activities.forEach(function (a) {
      if (!a || a.kind !== "review") return;
      if (a.status !== "completed" && a.status !== "partial") return;
      if (!a.reviewTarget) return;
      var aTargetId = a.reviewTarget.targetId || a.reviewTarget.reviewStateId;
      if (aTargetId === targetId && a.actualDurationMinutes > 0) {
        durations.push(a.actualDurationMinutes);
      }
    });
    if (durations.length === 0) return 15;
    var sum = 0;
    durations.forEach(function (d) { sum += d; });
    return Math.round(sum / durations.length);
  };

  Q.computePriority = function (reviewState, dueDate, today) {
    var overdueDays = Math.max(0, _diffDays(today, dueDate));
    var lapse = reviewState.lapses | 0;
    var bookPriority = "normal";
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (s && s.residency) {
      var book = (s.residency.books || []).find(function (b) { return b && b.id === reviewState.bookId; });
      if (book) bookPriority = book.priority || "normal";
    }
    var priBonus = bookPriority === "high" ? 3 : bookPriority === "normal" ? 2 : 1;
    var score = overdueDays * 10 + lapse * 5 + priBonus;
    return {
      score: score,
      overdueDays: overdueDays,
      lapses: lapse,
      bookPriority: bookPriority,
      reason: (overdueDays > 0 ? overdueDays + " روز overdue" : "در موعد") +
              (bookPriority === "high" ? " + اهمیت بالا" : "")
    };
  };

  function _statesDue() {
    return R.store.getReviewStates({ status: "review" })
      .concat(R.store.getReviewStates({ status: "learning" }))
      .concat(R.store.getReviewStates({ status: "relearning" }));
  }

  Q.getDue = function (date) {
    date = date || _today();
    return _statesDue().filter(function (s) {
      if (!s || !s.nextReviewAt) return false;
      return _cmp(s.nextReviewAt, date) <= 0;
    }).map(function (s) { return _queueItem(s, date); })
      .sort(function (a, b) { return b.priority.score - a.priority.score; });
  };

  Q.getOverdue = function (date) {
    date = date || _today();
    return Q.getDue(date).filter(function (item) { return item.overdueDays > 0; });
  };

  Q.getUpcoming = function (date, horizonDays) {
    date = date || _today();
    horizonDays = horizonDays || 7;
    var end = _addDays(date, horizonDays);
    return _statesDue().filter(function (s) {
      if (!s || !s.nextReviewAt) return false;
      return _cmp(s.nextReviewAt, date) > 0 && _cmp(s.nextReviewAt, end) <= 0;
    }).map(function (s) { return _queueItem(s, date); })
      .sort(function (a, b) { return _cmp(a.dueDate, b.dueDate); });
  };

  function _queueItem(s, today) {
    var dueDate = s.nextReviewAt || today;
    var priority = Q.computePriority(s, dueDate, today);
    var estMin = Q.estimateWorkloadMinutes(s);
    return {
      reviewStateId: s.id,
      targetType: s.targetType,
      targetId: s.targetId,
      bookId: s.bookId,
      subjectId: s.subjectId,
      pageStart: s.pageStart,
      pageEnd: s.pageEnd,
      dueDate: dueDate,
      overdueDays: priority.overdueDays,
      priority: priority,
      estimatedMinutes: estMin,
      status: s.status,
      repetitions: s.repetitions,
      lapses: s.lapses
    };
  }

  Q.getSummary = function (date) {
    date = date || _today();
    var due = Q.getDue(date);
    var overdue = Q.getOverdue(date);
    var upcoming7 = Q.getUpcoming(date, 7);
    var upcoming30 = Q.getUpcoming(date, 30);
    var totalMin = 0;
    due.forEach(function (i) { totalMin += i.estimatedMinutes; });
    return {
      date: date,
      dueToday: due.length,
      overdue: overdue.length,
      upcoming7: upcoming7.length,
      upcoming30: upcoming30.length,
      totalEstimatedMinutes: totalMin,
      due: due,
      upcoming7Items: upcoming7
    };
  };

  console.log("[InternshipResidency.review.queue.v10] loaded");
})();