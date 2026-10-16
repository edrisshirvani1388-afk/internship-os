/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Residency v9
   Round / Book / Subject / Global
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.residency.v9] R missing"); return; }
  var Res = R.analyticsResidency = R.analyticsResidency || {};
  var LIB = window.InternshipLib;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _int(v) { return (typeof v === "number") ? Math.round(v) : 0; }
  function _pct(n, d) { return (!d || d === 0) ? 0 : Math.round((n / d) * 100); }

  Res.summary = function (s, range) {
    var out = {
      totalBooks: 0, totalRounds: 0, activeBooks: 0,
      targetPagesTotal: 0, studiedPagesTotal: 0, remainingPagesTotal: 0,
      coveragePercent: 0, reserve: null, paceStatus: "unknown",
      rounds: [], books: [], subjects: []
    };
    if (!s || !s.residency) return out;
    var rs = s.residency;
    var roundIds = {};
    var bookIds = {};

    (rs.rounds || []).forEach(function (r) {
      if (!r) return;
      roundIds[r.id] = r;
      out.totalRounds++;
    });
    (rs.enrollments || []).forEach(function (e) {
      if (!e) return;
      var b = (rs.books || []).find(function (x) { return x && x.id === e.bookId; });
      if (!b) return;
      bookIds[b.id] = { book: b, enrollments: [] };
    });
    Object.keys(bookIds).forEach(function (k) {
      bookIds[k].enrollments = (rs.enrollments || []).filter(function (e) { return e && e.bookId === k; });
    });

    // Aggregate book stats
    var studiedPagesTotal = 0;
    var targetPagesTotal = 0;
    Object.keys(bookIds).forEach(function (k) {
      var entry = bookIds[k];
      var book = entry.book;
      var total = _int(book.totalPages);
      var bookStats = Res.book(rs, book.id);
      if (bookStats) {
        targetPagesTotal += bookStats.targetPages;
        studiedPagesTotal += bookStats.studiedPages;
        out.books.push(bookStats);
        if (book.status === "active") out.activeBooks++;
      }
    });

    // Rounds stats
    (rs.rounds || []).forEach(function (r) {
      var roundStats = Res.round(r.id);
      if (roundStats) out.rounds.push(roundStats);
    });

    out.totalBooks = Object.keys(bookIds).length;
    out.targetPagesTotal = targetPagesTotal;
    out.studiedPagesTotal = studiedPagesTotal;
    out.remainingPagesTotal = Math.max(0, targetPagesTotal - studiedPagesTotal);
    out.coveragePercent = _pct(studiedPagesTotal, targetPagesTotal);
    out.reserve = R.analytics ? R.analytics.getReserve() : null;
    out.paceStatus = Res.paceStatus(s, studiedPagesTotal, targetPagesTotal);
    return out;
  };

  Res.paceStatus = function (s, studied, target) {
    if (!s || !s.residency) return "unknown";
    var rs = s.residency;
    var plan = null;
    if (rs.plans && rs.meta && rs.meta.activePlanId) {
      plan = rs.plans.find(function (p) { return p && p.id === rs.meta.activePlanId; });
    }
    if (!plan || !plan.examDate) return "unknown";
    var today = _today();
    var remaining = Math.max(0, target - studied);
    if (remaining === 0) return "on_track";
    var p1 = LIB.date.parseJalali(today);
    var p2 = LIB.date.parseJalali(plan.examDate);
    if (!p1 || !p2) return "unknown";
    var daysLeft = LIB.date.jalaliToDayNumber(p2.jy, p2.jm, p2.jd) -
                   LIB.date.jalaliToDayNumber(p1.jy, p1.jm, p1.jd);
    if (daysLeft <= 0) return "deadline_passed";
    // Average daily target vs historical avg
    var studiedSoFar = studied;
    var dayHistory = LIB.date.jalaliToDayNumber(p1.jy, p1.jm, p1.jd); // rough
    // Simplified: check if remaining pages / daysLeft > some threshold
    var dailyNeeded = remaining / daysLeft;
    if (dailyNeeded > 60) return "at_risk";
    if (dailyNeeded > 30) return "tight";
    return "on_track";
  };

  Res.round = function (roundId) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return null;
    var rs = s.residency;
    var round = (rs.rounds || []).find(function (r) { return r && r.id === roundId; });
    if (!round) return null;

    var roundActs = (rs.activities || []).filter(function (a) { return a && a.roundId === roundId; });
    var plannedPages = 0, actualPages = 0;
    roundActs.forEach(function (a) {
      plannedPages += (a.plannedPages | 0);
      actualPages += (a.actualPages | 0);
    });

    var today = _today();
    var startP = LIB.date.parseJalali(round.startDate);
    var endP = LIB.date.parseJalali(round.endDate);
    var todayP = LIB.date.parseJalali(today);
    var totalDays = 0, elapsed = 0;
    if (startP && endP && todayP) {
      totalDays = LIB.date.jalaliToDayNumber(endP.jy, endP.jm, endP.jd) -
                  LIB.date.jalaliToDayNumber(startP.jy, startP.jm, startP.jd) + 1;
      elapsed = Math.max(0, Math.min(totalDays,
        LIB.date.jalaliToDayNumber(todayP.jy, todayP.jm, todayP.jd) -
        LIB.date.jalaliToDayNumber(startP.jy, startP.jm, startP.jd) + 1));
    }

    return {
      roundId: round.id,
      title: round.title,
      startDate: round.startDate,
      endDate: round.endDate,
      status: round.status || "planned",
      totalDays: totalDays,
      elapsedDays: elapsed,
      roundProgressPercent: totalDays > 0 ? Math.round(elapsed / totalDays * 100) : 0,
      activityCount: roundActs.length,
      plannedPages: plannedPages,
      actualPages: actualPages,
      missCount: roundActs.filter(function (a) {
        return a.status === "planned" && a.plannedDate && _cmp(a.plannedDate, today) < 0;
      }).length,
      partialCount: roundActs.filter(function (a) { return a.status === "partial"; }).length,
      completedCount: roundActs.filter(function (a) { return a.status === "completed"; }).length
    };
  };

  Res.book = function (rs, bookId) {
    var book = (rs.books || []).find(function (b) { return b && b.id === bookId; });
    if (!book) return null;
    var bookActs = (rs.activities || []).filter(function (a) { return a && a.bookId === bookId; });
    var enrollments = (rs.enrollments || []).filter(function (e) { return e && e.bookId === bookId; });
    var coverage = 100;
    if (enrollments.length > 0) {
      coverage = Math.max.apply(null, enrollments.map(function (e) {
        return (typeof e.targetCoveragePercent === "number") ? e.targetCoveragePercent : 100;
      }));
    }
    var targetPages = Math.round((book.totalPages | 0) * coverage / 100);
    var actual = 0, planned = 0;
    bookActs.forEach(function (a) {
      actual += (a.actualPages | 0);
      planned += (a.plannedPages | 0);
    });
    var studied = actual;
    var remaining = Math.max(0, targetPages - studied);
    var overage = Math.max(0, studied - targetPages);
    var completed = bookActs.filter(function (a) { return a.status === "completed"; }).length;
    var totalActs = bookActs.length;
    return {
      bookId: book.id,
      title: book.title,
      totalPages: book.totalPages | 0,
      targetPages: targetPages,
      studiedPages: studied,
      plannedPages: planned,
      remainingPages: remaining,
      overagePages: overage,
      coveragePercent: coverage,
      completionPercent: targetPages > 0 ? Math.round(studied / targetPages * 100) : 0,
      activitiesCount: totalActs,
      completedActivities: completed,
      status: book.status || "active"
    };
  };

  Res.subject = function (subjectId) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return null;
    var rs = s.residency;
    var subject = (rs.subjects || []).find(function (x) { return x && x.id === subjectId; });
    if (!subject) return null;
    var books = (rs.books || []).filter(function (b) { return b && b.subjectId === subjectId; });
    var stats = books.map(function (b) { return Res.book(rs, b.id); }).filter(Boolean);
    var totalTarget = 0, totalStudied = 0;
    stats.forEach(function (x) { totalTarget += x.targetPages; totalStudied += x.studiedPages; });
    return {
      subjectId: subject.id,
      title: subject.title,
      booksCount: books.length,
      targetPagesTotal: totalTarget,
      studiedPagesTotal: totalStudied,
      remainingPagesTotal: Math.max(0, totalTarget - totalStudied),
      coveragePercent: totalTarget > 0 ? Math.round(totalStudied / totalTarget * 100) : 0
    };
  };

  console.log("[analytics.residency.v9] loaded");
})();