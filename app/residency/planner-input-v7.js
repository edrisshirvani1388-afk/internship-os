/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Input Builder V7 (Pure Adapter)
   Reads residency state + calendar → V7 allocator input
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.input.v7] R missing"); return; }
  R.plannerStudyV7 = R.plannerStudyV7 || {};
  var I = R.plannerStudyV7.input = R.plannerStudyV7.input || {};
  I.VERSION = "7.0.0";

  var VALID_SESSION_MINUTES = [30, 45, 60, 90, 120];
  var DEFAULT_SESSION_MINUTES = 60;
  var DEFAULT_PPH = 20;

  function _dateCmp(a, b) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.date && typeof LIB.date.compareJalaliDate === "function") {
      return LIB.date.compareJalaliDate(a, b);
    }
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  function _getState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _err(code, message) { return { code: code, message: message }; }
  function _resolveSpeed(round, settings, enrollment) {
    if (R.studySpeed && typeof R.studySpeed.resolve === "function") {
      try {
        var v = R.studySpeed.resolve(round, settings, enrollment);
        if (typeof v === "number" && v > 0 && isFinite(v)) return v;
      } catch (e) {}
    }
    return DEFAULT_PPH;
  }
  function _computeRemainingRanges(startPage, endPage, readRanges) {
    var start = Math.max(1, startPage | 0);
    var end = Math.max(start, endPage | 0);
    if (!Array.isArray(readRanges) || readRanges.length === 0) {
      return [{ start: start, end: end }];
    }
    var norm = readRanges.map(function (r) {
      if (!r) return null;
      var rs = Math.max(start, r.start | 0);
      var re = Math.min(end, r.end | 0);
      if (rs > re) return null;
      return { start: rs, end: re };
    }).filter(Boolean);
    if (norm.length === 0) return [{ start: start, end: end }];
    norm.sort(function (a, b) { return a.start - b.start; });
    var merged = [norm[0]];
    for (var i = 1; i < norm.length; i++) {
      var last = merged[merged.length - 1];
      if (norm[i].start <= last.end + 1) {
        if (norm[i].end > last.end) last.end = norm[i].end;
      } else {
        merged.push(norm[i]);
      }
    }
    var remaining = [];
    var cursor = start;
    for (var j = 0; j < merged.length; j++) {
      if (merged[j].start > cursor) {
        remaining.push({ start: cursor, end: merged[j].start - 1 });
      }
      cursor = Math.max(cursor, merged[j].end + 1);
    }
    if (cursor <= end) remaining.push({ start: cursor, end: end });
    return remaining;
  }

  function _resolveRange(enrollment, book) {
    var totalPages = (typeof book.totalPages === "number" && book.totalPages > 0)
      ? book.totalPages : 0;
    if (totalPages <= 0) return null;

    var startPage = (typeof enrollment.startPage === "number" && enrollment.startPage >= 1)
      ? enrollment.startPage : 1;

    var endPage;
    if (typeof enrollment.endPage === "number" &&
        enrollment.endPage >= startPage &&
        enrollment.endPage <= totalPages) {
      endPage = enrollment.endPage;
    } else {
      var pct = (typeof enrollment.targetCoveragePercent === "number")
        ? enrollment.targetCoveragePercent : 100;
      pct = Math.max(0, Math.min(100, pct));
      endPage = Math.round(totalPages * pct / 100);
      if (endPage < startPage) endPage = startPage;
    }

    if (startPage < 1 || endPage < startPage || endPage > totalPages) return null;
    return { startPage: startPage, endPage: endPage };
  }

  function _timeToMin(t) {
    if (!t || typeof t !== "string") return null;
    var p = t.split(":");
    if (p.length !== 2) return null;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }
  function _getWeekdayKey(date) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return null;
    if (!LIB.date.parseJalali || !LIB.date.weekdayName) return null;
    var p = LIB.date.parseJalali(date);
    if (!p) return null;
    var name = LIB.date.weekdayName(p.jy, p.jm, p.jd);
    var map = {
      "شنبه": "saturday",
      "یک‌شنبه": "sunday", "یکشنبه": "sunday",
      "دوشنبه": "monday",
      "سه‌شنبه": "tuesday", "سه شنبه": "tuesday",
      "چهارشنبه": "wednesday",
      "پنج‌شنبه": "thursday", "پنجشنبه": "thursday",
      "جمعه": "friday"
    };
    return map[name] || null;
  }
  function _prevDate(date) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return null;
    if (!LIB.date.parseJalali || !LIB.date.addJalaliDays || !LIB.date.dateKey) return null;
    var p = LIB.date.parseJalali(date);
    if (!p) return null;
    var prev = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, -1);
    return LIB.date.dateKey(prev.jy, prev.jm, prev.jd);
  }
  function _computeLifeEventDeduction(date, dls) {
    if (!dls || !dls.studyWindow || !Array.isArray(dls.weeklyBlocks)) return 0;
    var swStart = _timeToMin(dls.studyWindow.startTime);
    var swEnd = _timeToMin(dls.studyWindow.endTime);
    if (swStart == null || swEnd == null || swStart >= swEnd) return 0;

    var todayWeekday = _getWeekdayKey(date);
    var prevDateStr = _prevDate(date);
    var prevWeekday = prevDateStr ? _getWeekdayKey(prevDateStr) : null;

    var intervals = [];

    dls.weeklyBlocks.forEach(function (b) {
      if (!b || b.enabled === false) return;
      if (!Array.isArray(b.daysOfWeek) || b.daysOfWeek.length === 0) return;
      var bStart = _timeToMin(b.startTime);
      var bEnd = _timeToMin(b.endTime);
      if (bStart == null || bEnd == null) return;
      if (bStart === bEnd) return;
      var isOvernight = bEnd <= bStart;

      if (todayWeekday && b.daysOfWeek.indexOf(todayWeekday) !== -1) {
        if (!isOvernight) {
          var s = Math.max(bStart, swStart);
          var e = Math.min(bEnd, swEnd);
          if (e > s) intervals.push({ start: s, end: e });
        } else {
          var s2 = Math.max(bStart, swStart);
          var e2 = swEnd;
          if (e2 > s2) intervals.push({ start: s2, end: e2 });
        }
      }

      if (isOvernight && prevWeekday && b.daysOfWeek.indexOf(prevWeekday) !== -1) {
        var s3 = swStart;
        var e3 = Math.min(bEnd, swEnd);
        if (e3 > s3) intervals.push({ start: s3, end: e3 });
      }
    });

    if (intervals.length === 0) return 0;

    intervals.sort(function (a, b) { return a.start - b.start; });
    var merged = [intervals[0]];
    for (var i = 1; i < intervals.length; i++) {
      var last = merged[merged.length - 1];
      if (intervals[i].start <= last.end) {
        last.end = Math.max(last.end, intervals[i].end);
      } else {
        merged.push(intervals[i]);
      }
    }

    var total = 0;
    merged.forEach(function (r) { total += (r.end - r.start); });
    return total;
  }

  I.computeRemainingRanges = _computeRemainingRanges;
  I._unionRanges = _unionRanges;
  I._subtractRanges = _subtractRanges;
  I._rangesLength = _rangesLength;
  I._collectActivityRanges = _collectActivityRanges; /* [PATCH:m7a-expose] */

  /* [PATCH:m5-progress] */
  function _unionRanges(ranges) {
    if (!Array.isArray(ranges) || ranges.length === 0) return [];
    var norm = ranges.filter(function (r) {
      return r && typeof r.start === "number" && typeof r.end === "number" && r.end >= r.start;
    });
    if (norm.length === 0) return [];
    norm = norm.slice().sort(function (a, b) { return a.start - b.start; });
    var merged = [{ start: norm[0].start, end: norm[0].end }];
    for (var i = 1; i < norm.length; i++) {
      var last = merged[merged.length - 1];
      if (norm[i].start <= last.end + 1) {
        if (norm[i].end > last.end) last.end = norm[i].end;
      } else {
        merged.push({ start: norm[i].start, end: norm[i].end });
      }
    }
    return merged;
  }
  function _rangesLength(ranges) {
    if (!Array.isArray(ranges)) return 0;
    var n = 0;
    for (var i = 0; i < ranges.length; i++) {
      if (ranges[i] && ranges[i].end >= ranges[i].start) n += (ranges[i].end - ranges[i].start + 1);
    }
    return n;
  }
  function _subtractRanges(base, sub) {
    if (!Array.isArray(base) || base.length === 0) return [];
    if (!Array.isArray(sub) || sub.length === 0) return base.slice();
    var out = [];
    for (var i = 0; i < base.length; i++) {
      var cur = { start: base[i].start, end: base[i].end };
      for (var j = 0; j < sub.length; j++) {
        var s = sub[j];
        if (!s) continue;
        if (s.end < cur.start || s.start > cur.end) continue;
        if (s.start > cur.start) out.push({ start: cur.start, end: s.start - 1 });
        cur.start = Math.max(cur.start, s.end + 1);
        if (cur.start > cur.end) break;
      }
      if (cur.start <= cur.end) out.push(cur);
    }
    return out;
  }
  function _collectActivityRanges(s, planId, bookId, roundId) {
    var read = [];
    var planned = [];
    if (!s || !s.residency || !Array.isArray(s.residency.activities)) return { read: read, planned: planned };
    var acts = s.residency.activities;
    for (var i = 0; i < acts.length; i++) {
      var a = acts[i];
      if (!a) continue;
      if (a.kind && a.kind !== "study") continue;
      if (a.bookId !== bookId) continue;
      if (a.planId !== planId) continue;
      if (typeof a.plannedPageStart !== "number" || typeof a.plannedPageEnd !== "number") continue;
      if (a.plannedPageEnd < a.plannedPageStart) continue;
      var r = { start: a.plannedPageStart, end: a.plannedPageEnd };
      if (a.status === "completed") read.push(r);
      /* [PATCH:m6-isolation] planned/in_progress scoped to same round; completed cross-round */
      else if (a.status === "planned" || a.status === "in_progress") {
        if (roundId && a.roundId && a.roundId !== roundId) continue;
        planned.push(r);
      }
    }
    return { read: read, planned: planned };
  }

  I.buildInput = function (planId, options) {
    options = options || {};

    // ─── options validation ───
    var sessionMinutes = options.sessionMinutes != null
      ? options.sessionMinutes : DEFAULT_SESSION_MINUTES;
    if (VALID_SESSION_MINUTES.indexOf(sessionMinutes) === -1) {
      return { ok: false, errors: [_err("invalid_sessionMinutes",
        "sessionMinutes must be one of " + VALID_SESSION_MINUTES.join(","))] };
    }
    var maxDays = options.maxDays != null ? options.maxDays : null;
    if (maxDays != null) {
      if (typeof maxDays !== "number" || maxDays < 1 || Math.floor(maxDays) !== maxDays) {
        return { ok: false, errors: [_err("invalid_maxDays",
          "maxDays must be positive integer or null")] };
      }
    }

    // ─── state ───
    var s = _getState();
    if (!s || !s.residency) {
      return { ok: false, errors: [_err("no_state", "state unavailable")] };
    }
    var rs = s.residency;

    if (typeof planId !== "string" || !planId) {
      return { ok: false, errors: [_err("no_planId", "planId required")] };
    }
    var plan = (rs.plans || []).find(function (p) { return p && p.id === planId; });
    if (!plan) {
      return { ok: false, errors: [_err("plan_not_found", "plan " + planId + " not found")] };
    }
    if (typeof plan.examDate !== "string" || !plan.examDate) {
      return { ok: false, errors: [_err("no_examDate", "plan.examDate required")] };
    }

    var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === planId; });
    if (rounds.length === 0) {
      return { ok: false, errors: [_err("no_rounds", "plan has no rounds")] };
    }
    var roundById = {};
    rounds.forEach(function (r) { roundById[r.id] = r; });

    var enrollments = (rs.enrollments || []).filter(function (e) {
      return e && e.roundId && roundById[e.roundId];
    });
    if (enrollments.length === 0) {
      return { ok: false, errors: [_err("no_enrollments", "plan has no enrollments")] };
    }

    var bookById = {};
    (rs.books || []).forEach(function (b) { if (b && b.id) bookById[b.id] = b; });

    var settings = { defaultPagesPerHour: DEFAULT_PPH, residency: rs };

    // ─── build books ───
    var books = [];
    var errors = [];
    var seenBookIds = {};
    var _breakdown = {}; /* [PATCH:m5-progress] */

    enrollments.forEach(function (e) {
      var book = bookById[e.bookId];
      if (!book) {
        errors.push(_err("book_missing", "enrollment " + e.id + " references missing book " + e.bookId));
        return;
      }
      if (seenBookIds[book.id]) return; // one entry per book
      seenBookIds[book.id] = true;

      var range = _resolveRange(e, book);
      if (!range) {
        errors.push(_err("invalid_range",
          "book " + book.id + " has invalid page range"));
        return;
      }

      var studyOrder = (typeof e.studyOrder === "number" && isFinite(e.studyOrder))
        ? e.studyOrder : 9999;
      var round = roundById[e.roundId];
      var pph = _resolveSpeed(round, settings, e);

      var _baselineRanges = [];
      if (R.baseline && typeof R.baseline.resolveForEnrollment === "function") {
        try {
          var _resolved = R.baseline.resolveForEnrollment(e, book, enrollments, rounds);
          if (_resolved && Array.isArray(_resolved.ranges)) _baselineRanges = _resolved.ranges;
        } catch (ex) {}
      }
      /* [PATCH:m5-progress] union baseline + completed-activity ranges */
      var _actRanges = _collectActivityRanges(s, planId, book.id, e.roundId);
      var _readRanges = _unionRanges(
        _baselineRanges.concat(_actRanges.read.map(function (r) { return { start: r.start, end: r.end }; }))
      ).map(function (r) {
        return { start: Math.max(r.start, range.startPage), end: Math.min(r.end, range.endPage) };
      }).filter(function (r) { return r.end >= r.start; });

      var _readRemaining = _computeRemainingRanges(range.startPage, range.endPage, _readRanges);
      /* [PATCH:m5-exclude-allocated] subtract already-planned (not completed) activity ranges */
      var _allocatedRanges = _unionRanges(
        _actRanges.planned.map(function (r) {
          return { start: Math.max(r.start, range.startPage), end: Math.min(r.end, range.endPage) };
        })
      ).filter(function (r) { return r.end >= r.start; });
      var _available = _subtractRanges(_readRemaining, _allocatedRanges);

      _breakdown[book.id] = {
        total: range.endPage - range.startPage + 1,
        read: _rangesLength(_readRanges),
        allocated: _rangesLength(_allocatedRanges),
        available: _rangesLength(_available)
      };

      if (_available.length === 0) return;

      books.push({
        id: book.id,
        title: book.title || book.id,
        totalPages: book.totalPages,
        startPage: range.startPage,
        endPage: range.endPage,
        remainingRanges: _available,
        studyOrder: studyOrder,
        pagesPerHour: pph
        , roundId: e.roundId /* [PATCH:m6-isolation] */
      });
    });

    if (errors.length > 0) return { ok: false, errors: errors };
    if (books.length === 0) {
      return { ok: false, errors: [_err("no_books_to_plan", "همه کتاب‌ها خوانده یا قبلاً برنامه‌ریزی شده‌اند")], meta: { breakdown: _breakdown } };
    }

    // ─── calendar ───
    var cal = R.calendar;
    if (!cal || typeof cal.getResidencyCalendarContext !== "function") {
      return { ok: false, errors: [_err("no_calendar", "calendar API unavailable")] };
    }

    var minDate = null;
    rounds.forEach(function (r) {
      if (r.startDate && (!minDate || _dateCmp(r.startDate, minDate) < 0)) {
        minDate = r.startDate;
      }
    });
    if (!minDate) {
      return { ok: false, errors: [_err("no_start_date", "rounds have no startDate")] };
    }

    /* [PATCH:pastdate] never allocate before today */
    try {
      var _todayStr = null;
      if (window.InternshipLib && window.InternshipLib.date && typeof window.InternshipLib.date.todayJalaliString === "function") {
        _todayStr = window.InternshipLib.date.todayJalaliString();
      }
      if (_todayStr && _dateCmp(_todayStr, minDate) > 0) {
        minDate = _todayStr;
      }
    } catch (e) {}

    var ctxs;
    try {
      ctxs = cal.getResidencyCalendarContext(minDate, plan.examDate, planId);
    } catch (e) {
      return { ok: false, errors: [_err("calendar_error",
        "calendar call failed: " + String(e && e.message || e))] };
    }
    if (!Array.isArray(ctxs) || ctxs.length === 0) {
      return { ok: false, errors: [_err("no_calendar_days", "calendar returned no days")] };
    }

    /* [PATCH:usercaps] apply user settings.defaultCapacity over calendar default */
    var _userCaps = (rs.settings && rs.settings.defaultCapacity) || null;
    var _userReservePct = (rs.settings && typeof rs.settings.reservePercent === "number")
      ? rs.settings.reservePercent : 10;
    var _dtKeyMap = {
      "normal": "normal", "free": "free", "off": "off",
      "pre_shift": "preShift", "shift": "shift", "post_shift": "postShift"
    };

    var days = [];
    /* [PATCH:m5-daydiag] */
    var _diag = { total: 0, eligible: 0, planned: 0, zero: 0, short: 0, sample: { planned: [], zero: [], short: [] } };
    var invalidCapacityCount = 0;
    ctxs.forEach(function (c) {
      if (!c || typeof c.date !== "string") return;
      if (_dateCmp(c.date, plan.examDate) >= 0) return; // examDate exclusive
      var cap;
      var _dayType = c.dayType || "normal";
      var _capKey = _dtKeyMap[_dayType] || "normal";
      var _userCap = (_userCaps && typeof _userCaps[_capKey] === "number")
        ? _userCaps[_capKey] : null;

      if (_userCap !== null) {
        /* User settings take precedence: apply reserve */
        var _reserve = Math.floor(_userCap * _userReservePct / 100);
        cap = Math.max(0, _userCap - _reserve);
      } else if (typeof c.finalCapacityMinutes === "number" && isFinite(c.finalCapacityMinutes)) {
        cap = Math.max(0, c.finalCapacityMinutes);
      } else {
        invalidCapacityCount++;
        return;
      }
      // [PATCH:window-min] cap = min(dayTypeCap, windowAvailable)
      var _dls = (rs.settings && rs.settings.dailyLifeSchedule) || null;
      if (_dls && _dls.studyWindow && Array.isArray(_dls.weeklyBlocks) && _dls.weeklyBlocks.length > 0) {
        var _swStart = _timeToMin(_dls.studyWindow.startTime);
        var _swEnd = _timeToMin(_dls.studyWindow.endTime);
        if (_swStart != null && _swEnd != null && _swEnd > _swStart) {
          var _windowSize = _swEnd - _swStart;
          var _deduct = _computeLifeEventDeduction(c.date, _dls);
          var _windowAvail = Math.max(0, _windowSize - _deduct);
          cap = Math.min(cap, _windowAvail);
        }
      }
      /* [PATCH:m5-daycap] reduce day capacity by already-planned activity minutes */
      var _plannedOnDay = 0;
      (s.residency.activities || []).forEach(function(a) {
        if (!a) return;
        if (a.planId !== planId) return;
        if (a.plannedDate !== c.date) return;
        if (typeof a.plannedDurationMinutes === "number" && a.plannedDurationMinutes > 0) {
          _plannedOnDay += a.plannedDurationMinutes;
        }
      });
      if (_plannedOnDay > 0) { cap = 0; } /* [PATCH:m5-daylock] */
      /* [PATCH:m5-daydiag] */
      _diag.total++;
      if (_plannedOnDay > 0) { _diag.planned++; if (_diag.sample.planned.length < 30) _diag.sample.planned.push(c.date); }
      else if (cap === 0) { _diag.zero++; if (_diag.sample.zero.length < 30) _diag.sample.zero.push(c.date + "|" + _dayType); }
      else if (cap < sessionMinutes / 2) { _diag.short++; if (_diag.sample.short.length < 30) _diag.sample.short.push(c.date + "|" + cap); }
      else { _diag.eligible++; }
      days.push({ date: c.date, capacityMinutes: cap });
    });

    if (invalidCapacityCount > 0) {
      return { ok: false, errors: [_err("invalid_capacity",
        invalidCapacityCount + " days have invalid finalCapacityMinutes")] };
    }
    if (days.length === 0) {
      return { ok: false, errors: [_err("no_eligible_days", "no eligible days before examDate")] };
    }

    return {
      ok: true,
      input: {
        planId: planId,
        examDate: plan.examDate,
        books: books,
        days: days,
        sessionMinutes: sessionMinutes,
        maxDays: maxDays
      },
      meta: {
        roundCount: rounds.length,
        enrollmentCount: enrollments.length,
        bookCount: books.length,
        dayCount: days.length,
        totalCapacityMinutes: days.reduce(function (sum, d) { return sum + d.capacityMinutes; }, 0),
        zeroCapacityDays: days.filter(function (d) { return d.capacityMinutes === 0; }).length,
        breakdown: _breakdown /* [PATCH:m5-progress] */
        , dayBreakdown: _diag /* [PATCH:m5-daydiag] */
      }
    };
  };

  /* ═══ Tests ═══ */
  I.__tests = function () {
    var results = [];
    function _t(name, pass, info) {
      results.push({ name: name, pass: !!pass, info: info || null });
    }

    // ─── T1: valid plan → valid input ───
    try {
      var s = _getState();
      var plan = (s.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      if (!plan) { _t("T1: valid plan → valid input", false, "no active plan"); }
      else {
        var r = I.buildInput(plan.id, { sessionMinutes: 60 });
        var ok = r.ok && r.input && r.input.books.length > 0 && r.input.days.length > 0;
        _t("T1: valid plan → valid input",
           ok, { ok: r.ok, books: r.input && r.input.books.length, days: r.input && r.input.days.length });
      }
    } catch (e) { _t("T1", false, String(e)); }

    // ─── T2: books from another plan excluded ───
    try {
      var s2 = _getState();
      var plan2 = (s2.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      if (!plan2) { _t("T2: books from other plans excluded", false, "no plan"); }
      else {
        var r2 = I.buildInput(plan2.id, {});
        var roundIds = {};
        (s2.residency.rounds || []).forEach(function (rr) {
          if (rr && rr.planId === plan2.id) roundIds[rr.id] = true;
        });
        var planBookIds = {};
        (s2.residency.enrollments || []).forEach(function (e) {
          if (e && roundIds[e.roundId]) planBookIds[e.bookId] = true;
        });
        var allInPlan = r2.ok && r2.input.books.every(function (b) { return planBookIds[b.id]; });
        _t("T2: books from other plans excluded", allInPlan, { books: r2.input && r2.input.books.length });
      }
    } catch (e) { _t("T2", false, String(e)); }

    // ─── T3: studyOrder preserved ───
    try {
      var s3 = _getState();
      var plan3 = (s3.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r3 = I.buildInput(plan3.id, {});
      var enrollmentOrders = {};
      (s3.residency.enrollments || []).forEach(function (e) {
        if (e && e.bookId && e.studyOrder != null) enrollmentOrders[e.bookId] = e.studyOrder;
      });
      var ordersMatch = r3.ok && r3.input.books.every(function (b) {
        return enrollmentOrders[b.id] === b.studyOrder;
      });
      _t("T3: studyOrder preserved from enrollment",
         ordersMatch,
         { orders: r3.input && r3.input.books.map(function (b) { return b.studyOrder; }) });
    } catch (e) { _t("T3", false, String(e)); }

    // ─── T4: page ranges from coverage ───
    try {
      var s4 = _getState();
      var plan4 = (s4.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r4 = I.buildInput(plan4.id, {});
      var validRanges = r4.ok && r4.input.books.every(function (b) {
        return b.startPage >= 1 && b.endPage >= b.startPage && b.endPage <= b.totalPages;
      });
      _t("T4: page ranges valid (startPage..endPage ≤ totalPages)",
         validRanges,
         { ranges: r4.input && r4.input.books.map(function (b) {
             return b.id + ": " + b.startPage + "-" + b.endPage + "/" + b.totalPages;
           }) });
    } catch (e) { _t("T4", false, String(e)); }

    // ─── T5: reading speed resolved ───
    try {
      var s5 = _getState();
      var plan5 = (s5.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r5 = I.buildInput(plan5.id, {});
      var speedsValid = r5.ok && r5.input.books.every(function (b) {
        return typeof b.pagesPerHour === "number" && b.pagesPerHour > 0;
      });
      _t("T5: reading speed valid and > 0",
         speedsValid,
         { speeds: r5.input && r5.input.books.map(function (b) { return b.pagesPerHour; }) });
    } catch (e) { _t("T5", false, String(e)); }

    // ─── T6: days chronological + before examDate ───
    try {
      var s6 = _getState();
      var plan6 = (s6.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r6 = I.buildInput(plan6.id, {});
      var chron = true, prevDate = null;
      (r6.input && r6.input.days || []).forEach(function (d) {
        if (prevDate && _dateCmp(prevDate, d.date) > 0) chron = false;
        prevDate = d.date;
      });
      var beforeExam = (r6.input && r6.input.days || []).every(function (d) {
        return _dateCmp(d.date, plan6.examDate) < 0;
      });
      _t("T6: days chronological + before examDate",
         chron && beforeExam,
         { count: r6.input && r6.input.days.length, chron: chron, beforeExam: beforeExam });
    } catch (e) { _t("T6", false, String(e)); }

    // ─── T7: daily capacities from calendar (finalCapacityMinutes) ───
    try {
      var s7 = _getState();
      var plan7 = (s7.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r7 = I.buildInput(plan7.id, {});
      // Cross-check first day against calendar
      var round7 = (s7.residency.rounds || []).filter(function (r) { return r && r.planId === plan7.id; });
      var minDate7 = round7.reduce(function (acc, r) {
        if (!acc) return r.startDate;
        return _dateCmp(r.startDate, acc) < 0 ? r.startDate : acc;
      }, null);
      var ctxs7 = window.InternshipResidency.calendar.getResidencyCalendarContext(minDate7, plan7.examDate, plan7.id);
      /* [PATCH:usercaps] T7 verifies user settings override calendar */
      var calMap = {};
      var typeMap = {};
      ctxs7.forEach(function (c) {
        calMap[c.date] = c.finalCapacityMinutes;
        typeMap[c.date] = c.dayType;
      });
      var _uCaps7 = (s7.residency.settings && s7.residency.settings.defaultCapacity) || null;
      var _uPct7 = (s7.residency.settings && typeof s7.residency.settings.reservePercent === "number")
        ? s7.residency.settings.reservePercent : 10;
      var _dt7 = { "normal":"normal","free":"free","off":"off","pre_shift":"preShift","shift":"shift","post_shift":"postShift" };
      var _acts7 = (s7.residency.activities || []).filter(function(a){
        return a && a.planId === plan7.id && typeof a.plannedDurationMinutes === "number" && a.plannedDurationMinutes > 0;
      });
      var _hasPlan7 = {};
      _acts7.forEach(function(a){ if (a.plannedDate) _hasPlan7[a.plannedDate] = true; });
      var _t7a = true, _s7a = null, _t7b = true, _s7b = null, _t7c = true;
      r7.input.days.forEach(function (d) {
        var dt = typeMap[d.date] || "normal";
        var ck = _dt7[dt] || "normal";
        var uc = (_uCaps7 && typeof _uCaps7[ck] === "number") ? _uCaps7[ck] : null;
        var base = uc !== null ? Math.max(0, uc - Math.floor(uc * _uPct7 / 100)) : (calMap[d.date] || 0);
        if (!_hasPlan7[d.date]) { if (d.capacityMinutes !== base) { _t7a = false; _s7a = _s7a || { date: d.date, got: d.capacityMinutes, want: base }; } }
        else if (base > 0 && d.capacityMinutes >= base) { _t7b = false; _s7b = _s7b || { date: d.date, got: d.capacityMinutes, base: base }; }
        if (d.capacityMinutes > base) _t7c = false;
      });
      _t("T7a: no-planned days exact match", _t7a, _s7a);
      _t("T7b: planned days strictly reduced", _t7b, _s7b);
      _t("T7c: no day exceeds base", _t7c, null);
    } catch (e) { _t("T7", false, String(e)); }

    // ─── T8: invalid planId → explicit error ───
    try {
      var r8 = I.buildInput("nonexistent-plan-xyz", {});
      _t("T8: invalid planId → explicit error",
         !r8.ok && r8.errors && r8.errors[0] && r8.errors[0].code === "plan_not_found",
         r8);
    } catch (e) { _t("T8", false, String(e)); }

    // ─── T9: invalid sessionMinutes / maxDays ───
    try {
      var s9 = _getState();
      var plan9 = (s9.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var r9a = I.buildInput(plan9.id, { sessionMinutes: 45 });
      var r9b = I.buildInput(plan9.id, { sessionMinutes: 50 });
      var r9c = I.buildInput(plan9.id, { maxDays: 0 });
      var r9d = I.buildInput(plan9.id, { maxDays: -1 });
      var r9e = I.buildInput(plan9.id, { maxDays: 3.5 });
      var r9f = I.buildInput(plan9.id, { maxDays: 20 });
      _t("T9: session/maxDays validation",
         r9a.ok && !r9b.ok && !r9c.ok && !r9d.ok && !r9e.ok && r9f.ok,
         { a: r9a.ok, b: r9b.ok, c: r9c.ok, d: r9d.ok, e: r9e.ok, f: r9f.ok });
    } catch (e) { _t("T9", false, String(e)); }

    // ─── T10: deterministic ───
    try {
      var s10 = _getState();
      var plan10 = (s10.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var ra = I.buildInput(plan10.id, { sessionMinutes: 60 });
      var rb = I.buildInput(plan10.id, { sessionMinutes: 60 });
      _t("T10: deterministic",
         ra.ok && rb.ok && JSON.stringify(ra.input) === JSON.stringify(rb.input),
         null);
    } catch (e) { _t("T10", false, String(e)); }

    // ─── T11: no mutation ───
    try {
      var s11 = _getState();
      var plan11 = (s11.residency.plans || []).find(function (p) { return p && p.status === "active"; });
      var beforeBooks = JSON.stringify(s11.residency.books || []);
      var beforeEnr = JSON.stringify(s11.residency.enrollments || []);
      var beforeRound = JSON.stringify(s11.residency.rounds || []);
      var beforeTasksCount = (s11.tasks || []).length;
      I.buildInput(plan11.id, { sessionMinutes: 60 });
      var afterBooks = JSON.stringify(s11.residency.books || []);
      var afterEnr = JSON.stringify(s11.residency.enrollments || []);
      var afterRound = JSON.stringify(s11.residency.rounds || []);
      var afterTasksCount = (s11.tasks || []).length;
      _t("T11: builder does not mutate state",
         beforeBooks === afterBooks && beforeEnr === afterEnr &&
         beforeRound === afterRound && beforeTasksCount === afterTasksCount,
         { tasksBefore: beforeTasksCount, tasksAfter: afterTasksCount });
    } catch (e) { _t("T11", false, String(e)); }

    /* ─── T12-T19: Daily life deduction ─── */
    try {
      var _mkDls = function (blocks, swStart, swEnd) {
        return {
          version: 1,
          studyWindow: { startTime: swStart || "06:30", endTime: swEnd || "23:00" },
          weeklyBlocks: blocks || []
        };
      };
      var _mkBlock = function (kind, days, s, e) {
        return { id: "b-" + Math.random().toString(36).slice(2,6), kind: kind, title: kind,
                 daysOfWeek: days, startTime: s, endTime: e, enabled: true };
      };
      var _ALL_WD = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];

      // T12: empty schedule → 0 deduction
      var d12 = _computeLifeEventDeduction("1405/8/01", _mkDls([], "06:30", "23:00"));
      _t("T12: empty schedule → 0 deduction", d12 === 0, { d: d12 });

      // T13: meal inside window → 45 min
      var d13 = _computeLifeEventDeduction("1405/8/01", _mkDls([
        _mkBlock("meal", _ALL_WD, "13:00", "13:45")
      ], "06:30", "23:00"));
      _t("T13: meal inside window → 45 min", d13 === 45, { d: d13 });

      // T14: sleep outside window → 0
      var d14 = _computeLifeEventDeduction("1405/8/01", _mkDls([
        _mkBlock("sleep", _ALL_WD, "23:00", "06:30")
      ], "06:30", "23:00"));
      _t("T14: overnight sleep outside window → 0", d14 === 0, { d: d14 });

      // T15: partial overlap → 60 min (12:00-13:00 with window end 13:00)
      var d15 = _computeLifeEventDeduction("1405/8/01", _mkDls([
        _mkBlock("hospital", _ALL_WD, "12:00", "14:00")
      ], "06:30", "13:00"));
      _t("T15: partial overlap → 60 min", d15 === 60, { d: d15 });

      // T16: overlapping events → union 90 min
      var d16 = _computeLifeEventDeduction("1405/8/01", _mkDls([
        _mkBlock("meal", _ALL_WD, "12:00", "13:00"),
        _mkBlock("meal", _ALL_WD, "12:30", "13:30")
      ], "06:30", "23:00"));
      _t("T16: overlapping events union (90 min)", d16 === 90, { d: d16 });

      // T17: weekday-specific
      var _findDay = function (targetWd, startDate) {
        var LIB = window.InternshipLib;
        var p = LIB.date.parseJalali(startDate || "1405/8/01");
        for (var i = 0; i < 14; i++) {
          var d = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, i);
          var dk = LIB.date.dateKey(d.jy, d.jm, d.jd);
          if (_getWeekdayKey(dk) === targetWd) return dk;
        }
        return null;
      };
      var satDate = _findDay("saturday");
      var monDate = _findDay("monday");
      var d17a = _computeLifeEventDeduction(satDate, _mkDls([
        _mkBlock("meal", ["monday"], "13:00", "13:45")
      ]));
      var d17b = _computeLifeEventDeduction(monDate, _mkDls([
        _mkBlock("meal", ["monday"], "13:00", "13:45")
      ]));
      _t("T17: weekday-specific (sat=0, mon=45)", d17a === 0 && d17b === 45, { sat: d17a, mon: d17b });

      // T18: disabled block → 0
      var block18 = _mkBlock("meal", _ALL_WD, "13:00", "13:45");
      block18.enabled = false;
      var d18 = _computeLifeEventDeduction("1405/8/01", _mkDls([block18]));
      _t("T18: disabled block → 0", d18 === 0, { d: d18 });

      // T19: overnight Friday 23:00-08:00 spills into Saturday window 06:30-08:00 = 90 min
      var friDate = _findDay("friday");
      var LIB = window.InternshipLib;
      var fp = LIB.date.parseJalali(friDate);
      var satNext = LIB.date.addJalaliDays(fp.jy, fp.jm, fp.jd, 1);
      var satDate2 = LIB.date.dateKey(satNext.jy, satNext.jm, satNext.jd);
      var d19 = _computeLifeEventDeduction(satDate2, _mkDls([
        _mkBlock("sleep", ["friday"], "23:00", "08:00")
      ], "06:30", "23:00"));
      _t("T19: overnight Friday spill → Saturday 90 min", d19 === 90, { d: d19, fri: friDate, sat: satDate2 });

    } catch (e) { _t("T12-T19 exception", false, String(e)); }

    /* [M3] T20-T30: Remaining ranges */
    try {
      var _crr = _computeRemainingRanges;
      var _r20 = _crr(1, 304, []);
      _t("T20: no reads -> full", _r20.length === 1 && _r20[0].start === 1 && _r20[0].end === 304, _r20);
      var _r21 = _crr(1, 304, [{start:1,end:20}]);
      _t("T21: 1-20 read -> 21-304", _r21.length === 1 && _r21[0].start === 21 && _r21[0].end === 304, _r21);
      var _r22 = _crr(1, 304, [{start:1,end:20},{start:35,end:55}]);
      _t("T22: two non-contiguous", _r22.length === 2 && _r22[0].start === 21 && _r22[0].end === 34 && _r22[1].start === 56 && _r22[1].end === 304, _r22);
      var _r23 = _crr(1, 304, [{start:1,end:20},{start:15,end:30}]);
      _t("T23: overlap -> 31-304", _r23.length === 1 && _r23[0].start === 31 && _r23[0].end === 304, _r23);
      var _r24 = _crr(1, 304, [{start:1,end:20},{start:500,end:600}]);
      _t("T24: out of bounds ignored", _r24.length === 1 && _r24[0].start === 21 && _r24[0].end === 304, _r24);
      var _r25 = _crr(1, 304, [{start:1,end:304}]);
      _t("T25: full read -> empty", _r25.length === 0, _r25);
      var _r26 = _crr(1, 304, [{start:1,end:10},{start:11,end:20}]);
      _t("T26: adjacent merged", _r26.length === 1 && _r26[0].start === 21 && _r26[0].end === 304, _r26);
    } catch (e) { _t("T20-T26 exception", false, String(e)); }

    try {
      var _aM3 = window.InternshipResidency.plannerStudyV7.allocator;
      var _mkB = function (id, order, sp, ep, ranges, pph) {
        return { id: id, title: id, totalPages: ep, startPage: sp, endPage: ep, remainingRanges: ranges, studyOrder: order, pagesPerHour: pph || 15 };
      };
      var _res27 = _aM3.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [_mkB("A", 0, 1, 100, [{start:21,end:34},{start:56,end:100}])],
        days: [{date:"1405/8/01",capacityMinutes:240},{date:"1405/8/02",capacityMinutes:240},{date:"1405/8/03",capacityMinutes:240}],
        sessionMinutes: 60, maxDays: null
      });
      var _pg27 = _res27.blocks.map(function(b){ return [b.startPage, b.endPage]; });
      var _sk20 = !_pg27.some(function(p){ return p[0] <= 20 && p[1] >= 20; });
      var _sk35 = !_pg27.some(function(p){ return p[0] <= 55 && p[1] >= 35; });
      var _h21 = _pg27.some(function(p){ return p[0] <= 21 && p[1] >= 21; });
      var _h56 = _pg27.some(function(p){ return p[0] <= 56 && p[1] >= 56; });
      _t("T27: skip read, alloc unread", _res27.ok && _sk20 && _sk35 && _h21 && _h56 && _res27.feasibility.unplannedPages === 0, {sk20:_sk20, sk35:_sk35, h21:_h21, h56:_h56});
      var _res28 = _aM3.allocate({planId:"p",examDate:"1405/9/01",books:[_mkB("A",0,1,100,[])],days:[{date:"1405/8/01",capacityMinutes:240}],sessionMinutes:60,maxDays:null});
      _t("T28: fully read -> 0 pages feasible", _res28.ok && _res28.blocks.length === 0 && _res28.feasibility.requestedPages === 0, {blocks:_res28.blocks.length});
      var _res29 = _aM3.allocate({
        planId:"p",examDate:"1405/9/01",
        books:[_mkB("A",0,1,100,[{start:51,end:100}]),_mkB("B",1,1,80,[{start:1,end:80}])],
        days:[{date:"1405/8/01",capacityMinutes:240},{date:"1405/8/02",capacityMinutes:240},{date:"1405/8/03",capacityMinutes:240},{date:"1405/8/04",capacityMinutes:240},{date:"1405/8/05",capacityMinutes:240}],
        sessionMinutes:60,maxDays:null
      });
      var _sw29 = 0, _pv29 = null;
      _res29.blocks.forEach(function(b){ if (_pv29 && _pv29 !== b.bookId) _sw29++; _pv29 = b.bookId; });
      _t("T29: two books order (1 switch)", _res29.ok && _sw29 === 1, {sw:_sw29});
      var _in30 = {planId:"p",examDate:"1405/9/01",books:[_mkB("A",0,1,100,[{start:1,end:50}])],days:[{date:"1405/8/01",capacityMinutes:240}],sessionMinutes:60,maxDays:null};
      var _ra30 = _aM3.allocate(_in30);
      var _rb30 = _aM3.allocate(_in30);
      _t("T30: deterministic with ranges", _ra30.ok && _rb30.ok && JSON.stringify(_ra30.blocks) === JSON.stringify(_rb30.blocks), null);
    } catch (e) { _t("T27-T30 exception", false, String(e)); }


    /* [M4-stageA] T31-T33: persistence, isolation, determinism */
    try {
      var enrMock31 = { id: "me", bookId: "mb", roundId: "mr",
        initialStudyBaseline: { ranges: [{start: 1, end: 20}, {start: 50, end: 70}], applyToRounds: "ALL", selectedRoundIds: [], notes: "" } };
      var r31a = _computeRemainingRanges(1, 100, enrMock31.initialStudyBaseline.ranges);
      var ser31 = JSON.parse(JSON.stringify(enrMock31));
      var r31b = _computeRemainingRanges(1, 100, ser31.initialStudyBaseline.ranges);
      _t("T31: progress persists through serialize/reload",
         JSON.stringify(r31a) === JSON.stringify(r31b) && r31a.length === 2,
         { a: r31a, b: r31b });
      var enrA32 = { id: "a", initialStudyBaseline: { ranges: [{start: 1, end: 20}], applyToRounds: "ALL", selectedRoundIds: [], notes: "nA" } };
      var enrB32 = { id: "b", initialStudyBaseline: null };
      var aBefore32 = JSON.stringify(enrA32);
      var bBefore32 = JSON.stringify(enrB32);
      _computeRemainingRanges(1, 100, enrA32.initialStudyBaseline.ranges);
      _t("T32: progress change isolates to one enrollment",
         aBefore32 === JSON.stringify(enrA32) && bBefore32 === JSON.stringify(enrB32), null);
      var rng33 = [{start: 1, end: 20}, {start: 50, end: 70}];
      var rngBefore33 = JSON.stringify(rng33);
      var d33a = _computeRemainingRanges(1, 100, rng33);
      var d33b = _computeRemainingRanges(1, 100, rng33);
      _t("T33: identical progress -> identical remaining",
         JSON.stringify(d33a) === JSON.stringify(d33b) && rngBefore33 === JSON.stringify(rng33),
         { a: d33a, b: d33b });
    } catch (e) { _t("T31-T33 exception", false, String(e)); }

    /* [M5] T50-T55: pure range helpers */
    try { var _u1 = I._unionRanges([{start:1,end:20},{start:15,end:35},{start:40,end:50}]); _t("T50: union merges overlapping", _u1.length === 2 && _u1[0].start === 1 && _u1[0].end === 35 && _u1[1].start === 40 && _u1[1].end === 50, _u1); } catch (e) { _t("T50", false, String(e)); }
    try { var _s1 = I._subtractRanges([{start:1,end:100}], [{start:21,end:30},{start:51,end:60}]); _t("T51: subtract removes 2 ranges", _s1.length === 3 && _s1[0].start === 1 && _s1[0].end === 20 && _s1[1].start === 31 && _s1[1].end === 50 && _s1[2].start === 61 && _s1[2].end === 100, _s1); } catch (e) { _t("T51", false, String(e)); }
    try { _t("T52: rangesLength sums", I._rangesLength([{start:1,end:10},{start:20,end:25}]) === 16, null); } catch (e) { _t("T52", false, String(e)); }
    try { var _s2 = I._subtractRanges([{start:1,end:50}], [{start:10,end:20},{start:30,end:40}]); _t("T53: subtract 2 subs from base", _s2.length === 3 && _s2[0].end === 9 && _s2[1].start === 21 && _s2[1].end === 29 && _s2[2].start === 41 && _s2[2].end === 50, _s2); } catch (e) { _t("T53", false, String(e)); }
    try { var _s3 = I._subtractRanges([{start:1,end:10}], [{start:1,end:10}]); _t("T54: subtract full -> empty", _s3.length === 0, _s3); } catch (e) { _t("T54", false, String(e)); }
    try { var _u2 = I._unionRanges([{start:1,end:10},{start:11,end:20}]); _t("T55: union adjacent", _u2.length === 1 && _u2[0].start === 1 && _u2[0].end === 20, _u2); } catch (e) { _t("T55", false, String(e)); }

    /* [PATCH:m7a-issue65-test] */
    try {
      var mockS65 = { residency: { activities: [
        { id: "a1", kind: "study", planId: "p1", bookId: "b1", roundId: "r1", status: "completed", plannedPageStart: 1, plannedPageEnd: 10 },
        { id: "a2", kind: "study", planId: "p1", bookId: "b1", roundId: "r1", status: "completed" },
        { id: "a3", kind: "study", planId: "p1", bookId: "b1", roundId: "r1", status: "planned", plannedPageStart: 20, plannedPageEnd: 30 },
        { id: "a4", kind: "study", planId: "p1", bookId: "b1", roundId: "r1", status: "cancelled", plannedPageStart: 40, plannedPageEnd: 50 }
      ]}};
      var got = I._collectActivityRanges(mockS65, "p1", "b1", "r1");
      _t("T56: legacy activity without ranges ignored (ISSUE-65 conservative)", got.read.length === 1 && got.read[0].start === 1 && got.read[0].end === 10, { readCount: got.read.length, readRanges: got.read });
      _t("T57: planned activity with ranges -> planned", got.planned.length === 1 && got.planned[0].start === 20 && got.planned[0].end === 30, { plannedCount: got.planned.length });
      _t("T58: cancelled activity ignored", (got.read.length + got.planned.length) === 2, { read: got.read.length, planned: got.planned.length });
    } catch (e) { _t("T56-T58 exception", false, String(e)); }
    var passed = results.filter(function (r) { return r.pass; }).length;
    return { passed: passed, total: results.length, results: results };
  };

  console.log("[planner.input.v7] loaded v" + I.VERSION);
})();
