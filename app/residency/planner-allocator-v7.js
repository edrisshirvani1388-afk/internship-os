/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Allocator V7 (Sequential, Pure)
   No dependencies. No state. No DOM.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.allocator.v7] R missing"); return; }
  R.plannerStudyV7 = R.plannerStudyV7 || {};
  var A = R.plannerStudyV7.allocator = R.plannerStudyV7.allocator || {};
  A.VERSION = "7.0.0";

  var VALID_SESSION_MINUTES = [30, 45, 60, 90, 120];

  /* ═══ Helpers ═══ */
  function _dateCmp(a, b) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.date && typeof LIB.date.compareJalaliDate === "function") {
      return LIB.date.compareJalaliDate(a, b);
    }
    return a < b ? -1 : (a > b ? 1 : 0);
  }
  function _faNum(n) {
    var LIB = window.InternshipLib;
    if (LIB && typeof LIB.faNum === "function") {
      try { return LIB.faNum(n); } catch (e) {}
    }
    return String(n);
  }
  function _err(code, message) { return { code: code, message: message }; }

  /* ═══ Input validation ═══ */
  function _validateInput(input) {
    var errors = [];
    if (!input || typeof input !== "object") {
      return { ok: false, errors: [_err("invalid_input", "input must be an object")] };
    }
    if (typeof input.planId !== "string" || !input.planId) {
      errors.push(_err("invalid_planId", "planId required"));
    }
    if (typeof input.examDate !== "string" || !input.examDate) {
      errors.push(_err("invalid_examDate", "examDate required"));
    }
    if (!Array.isArray(input.books) || input.books.length === 0) {
      errors.push(_err("invalid_books", "books must be non-empty array"));
      return { ok: false, errors: errors };
    }
    var seenBookIds = {};
    input.books.forEach(function (b, i) {
      if (!b || typeof b !== "object") {
        errors.push(_err("invalid_book", "book[" + i + "] not object")); return;
      }
      if (typeof b.id !== "string" || !b.id) {
        errors.push(_err("invalid_book_id", "book[" + i + "].id required"));
      } else if (seenBookIds[b.id]) {
        errors.push(_err("duplicate_book_id", "book id " + b.id + " duplicated"));
      } else {
        seenBookIds[b.id] = true;
      }
      if (typeof b.title !== "string" || !b.title) {
        errors.push(_err("invalid_book_title", "book[" + i + "].title required"));
      }
      if (typeof b.startPage !== "number" || b.startPage < 1) {
        errors.push(_err("invalid_startPage", "book[" + i + "].startPage must be >= 1"));
      }
      if (typeof b.endPage !== "number" || b.endPage < b.startPage) {
        errors.push(_err("invalid_endPage", "book[" + i + "].endPage must be >= startPage"));
      }
      if (typeof b.studyOrder !== "number" || !isFinite(b.studyOrder)) {
        errors.push(_err("invalid_studyOrder", "book[" + i + "].studyOrder required"));
      }
      if (typeof b.pagesPerHour !== "number" || b.pagesPerHour <= 0) {
        errors.push(_err("invalid_pph", "book[" + i + "].pagesPerHour must be > 0"));
      }
    });
    if (!Array.isArray(input.days) || input.days.length === 0) {
      errors.push(_err("invalid_days", "days must be non-empty array"));
      return { ok: false, errors: errors };
    }
    input.days.forEach(function (d, i) {
      if (!d || typeof d !== "object") {
        errors.push(_err("invalid_day", "day[" + i + "] not object")); return;
      }
      if (typeof d.date !== "string" || !d.date) {
        errors.push(_err("invalid_day_date", "day[" + i + "].date required"));
      }
      if (typeof d.capacityMinutes !== "number" || d.capacityMinutes < 0) {
        errors.push(_err("invalid_capacity", "day[" + i + "].capacityMinutes must be >= 0"));
      }
    });
    if (VALID_SESSION_MINUTES.indexOf(input.sessionMinutes) === -1) {
      errors.push(_err("invalid_session", "sessionMinutes must be one of " + VALID_SESSION_MINUTES.join(",")));
    }
    if (input.prioritizeBookId != null) {
      if (typeof input.prioritizeBookId !== "string" || !input.prioritizeBookId) {
        errors.push(_err("invalid_prioritizeBookId", "prioritizeBookId must be a non-empty string or null"));
      } else {
        var _hasP = false;
        for (var _bi = 0; _bi < input.books.length; _bi++) {
          if (input.books[_bi] && input.books[_bi].id === input.prioritizeBookId) { _hasP = true; break; }
        }
        if (!_hasP) {
          errors.push(_err("prioritize_book_not_found", "prioritizeBookId " + input.prioritizeBookId + " not in books[]"));
        }
      }
    }
    if (input.maxDays != null) {
      if (typeof input.maxDays !== "number" || input.maxDays < 1 || Math.floor(input.maxDays) !== input.maxDays) {
        errors.push(_err("invalid_maxDays", "maxDays must be positive integer or null"));
      }
    }
    return { ok: errors.length === 0, errors: errors };
  }

  /* ═══ Main allocate ═══ */
  A.allocate = function (input) {
    var v = _validateInput(input);
    if (!v.ok) {
      return {
        ok: false,
        errors: v.errors,
        blocks: [],
        feasibility: {
          requestedPages: 0, plannedPages: 0, unplannedPages: 0,
          requestedMinutes: 0, plannedMinutes: 0, unplannedMinutesEstimate: 0,
          minDaysRequired: null, minDaysRequiredIsEstimate: true,
          daysAvailable: 0, daysUsed: 0,
          status: "invalid_input",
          message: "ورودی نامعتبر"
        },
        validation: { valid: false, violations: [] }
      };
    }

    var books = input.books.slice().sort(function (a, b) {
      if (a.studyOrder !== b.studyOrder) return a.studyOrder - b.studyOrder;
      return a.id.localeCompare(b.id);
    });

    var eligibleDays = input.days
      .filter(function (d) {
        if (d.capacityMinutes < input.sessionMinutes / 2) return false;
        if (_dateCmp(d.date, input.examDate) >= 0) return false;
        return true;
      })
      .sort(function (a, b) { return _dateCmp(a.date, b.date); });

    if (input.maxDays != null && input.maxDays > 0) {
      eligibleDays = eligibleDays.slice(0, input.maxDays);
    }

    var totalRequestedPages = 0;
    books.forEach(function (b) {
      if (!Array.isArray(b.remainingRanges)) {
        b.remainingRanges = [{ start: b.startPage || 1, end: b.endPage || (b.startPage || 1) }];
      }
      b.remainingRanges.forEach(function (r) {
        if (r.end >= r.start) totalRequestedPages += (r.end - r.start + 1);
      });
    });

    /* [PATCH:skipempty] drop fully-read books so remainingRanges[0] is always valid */
    books = books.filter(function (b) {
      return Array.isArray(b.remainingRanges) && b.remainingRanges.length > 0;
    });

    /* [PATCH:skipempty] drop fully-read books so remainingRanges[0] is always valid */
    books = books.filter(function (b) {
      return Array.isArray(b.remainingRanges) && b.remainingRanges.length > 0;
    });

    var halfSession = input.sessionMinutes / 2;

    /* [PATCH:m4cap] deterministic per-day page hard cap */
    var _N_eligible = eligibleDays.length;
    var _basePagesPerDay = _N_eligible > 0 ? Math.ceil(totalRequestedPages / _N_eligible) : 0;
    var _dailyPageHardCap = _N_eligible > 0 ? Math.ceil(_basePagesPerDay * 1.5) : 0;

    var currentPage = {};
    var currentRangeIdx = {};
    books.forEach(function (b) {
      currentRangeIdx[b.id] = 0;
      currentPage[b.id] = b.remainingRanges[0].start;
    });
    var bookIdx = 0;

    var blocks = [];
    var daysUsed = 0;
    var plannedPagesSoFar = 0;
    var carryOverPages = 0; /* [PATCH:m4.1-carry] */

    var remainingCapacityMinutes = 0;
    eligibleDays.forEach(function(d) { remainingCapacityMinutes += d.capacityMinutes; });

    for (var dIdx = 0; dIdx < eligibleDays.length && bookIdx < books.length; dIdx++) {
      var day = eligibleDays[dIdx];

      var pagesRemaining = totalRequestedPages - plannedPagesSoFar;
      if (pagesRemaining <= 0) break;

      var dayCapacity = day.capacityMinutes;
      var dayPageBudget = remainingCapacityMinutes > 0
        ? Math.ceil(pagesRemaining * (dayCapacity / remainingCapacityMinutes))
        : pagesRemaining;
      if (dayPageBudget < 1) dayPageBudget = 1;
      dayPageBudget += carryOverPages; /* [PATCH:m4.1-carry] */
      if (_dailyPageHardCap > 0 && dayPageBudget > _dailyPageHardCap) dayPageBudget = _dailyPageHardCap;
      var _budgetThisDay = dayPageBudget; /* [PATCH:m4.1-carry] */
      /* [PATCH:m4.1-tailpressure] */
      var _curBookForPressure = books[bookIdx];
      if (_curBookForPressure) {
        var _slowestPageMin = 60 / _curBookForPressure.pagesPerHour;
        for (var _bf = bookIdx + 1; _bf < books.length; _bf++) {
          var _pmX = 60 / books[_bf].pagesPerHour;
          if (_pmX > _slowestPageMin) _slowestPageMin = _pmX;
        }
        var _tailMax = 0;
        for (var _tf = dIdx + 1; _tf < eligibleDays.length; _tf++) {
          var _capF = eligibleDays[_tf].capacityMinutes;
          var _timeF = Math.floor(_capF / _slowestPageMin);
          _tailMax += Math.min(_dailyPageHardCap, _timeF);
        }
        var _forcedMinX = pagesRemaining - _tailMax;
        if (_forcedMinX > dayPageBudget) dayPageBudget = _forcedMinX;
        if (dayPageBudget > _dailyPageHardCap) dayPageBudget = _dailyPageHardCap;
        var _timeToday = Math.floor(dayCapacity / (60 / _curBookForPressure.pagesPerHour));
        if (dayPageBudget > _timeToday) dayPageBudget = _timeToday;
      }
      remainingCapacityMinutes -= dayCapacity;

      var remainingDayMinutes = dayCapacity;
      var dayPagesUsed = 0;
      var dayBlocks = [];
      var dayBookId = null;

      while (remainingDayMinutes > 0 && bookIdx < books.length) {
        var dayPagesLeft = dayPageBudget - dayPagesUsed;
        if (dayPagesLeft < 1) break;

        var book = books[bookIdx];

        while (currentRangeIdx[book.id] < book.remainingRanges.length &&
               currentPage[book.id] > book.remainingRanges[currentRangeIdx[book.id]].end) {
          currentRangeIdx[book.id]++;
          if (currentRangeIdx[book.id] < book.remainingRanges.length) {
            currentPage[book.id] = book.remainingRanges[currentRangeIdx[book.id]].start;
          }
        }
        if (currentRangeIdx[book.id] >= book.remainingRanges.length) {
          bookIdx++;
          break;
        }

        var currentRange = book.remainingRanges[currentRangeIdx[book.id]];
        if (currentPage[book.id] < currentRange.start) currentPage[book.id] = currentRange.start;
        var pagesLeftInBook = currentRange.end - currentPage[book.id] + 1;
        if (pagesLeftInBook <= 0) { bookIdx++; break; }

        if (dayBookId !== null && dayBookId !== book.id) break;

        if (remainingDayMinutes < halfSession) {
          var pagesByTimeSmall = Math.floor(remainingDayMinutes * book.pagesPerHour / 60);
          if (pagesByTimeSmall >= pagesLeftInBook && pagesByTimeSmall >= 1 && pagesLeftInBook <= dayPagesLeft) {
            var shortPages = pagesLeftInBook;
            var shortMinutes = Math.ceil(shortPages * 60 / book.pagesPerHour);
            if (shortMinutes <= remainingDayMinutes) {
              dayBlocks.push({
                date: day.date, bookId: book.id, bookTitle: book.title,
                startPage: currentPage[book.id], endPage: currentPage[book.id] + shortPages - 1,
                pages: shortPages, minutes: shortMinutes, sessionIndex: dayBlocks.length
              });
              currentPage[book.id] += shortPages;
              remainingDayMinutes -= shortMinutes;
              dayPagesUsed += shortPages;
              if (currentPage[book.id] > currentRange.end) {
                currentRangeIdx[book.id]++;
                if (currentRangeIdx[book.id] >= book.remainingRanges.length) bookIdx++;
              }
            }
          }
          break;
        }

        var sessionLimit = Math.min(input.sessionMinutes, remainingDayMinutes);
        var pagesByTime = Math.floor(sessionLimit * book.pagesPerHour / 60);
        if (pagesByTime < 1) break;
        var pagesByBudget = Math.min(pagesByTime, dayPagesLeft);
        var pages = Math.min(pagesByBudget, pagesLeftInBook);
        if (pages < 1) break;
        
        if (pages < 3 && pagesLeftInBook > 3 && dayPagesLeft > pages) break;

        var minutes = Math.ceil(pages * 60 / book.pagesPerHour);
        if (minutes > remainingDayMinutes) {
          pages--;
          if (pages < 1) break;
          minutes = Math.ceil(pages * 60 / book.pagesPerHour);
        }

        dayBookId = book.id;
        dayBlocks.push({
          date: day.date, bookId: book.id, bookTitle: book.title,
          startPage: currentPage[book.id], endPage: currentPage[book.id] + pages - 1,
          pages: pages, minutes: minutes, sessionIndex: dayBlocks.length
        });
        currentPage[book.id] += pages;
        remainingDayMinutes -= minutes;
        dayPagesUsed += pages;

        if (currentPage[book.id] > currentRange.end) {
          currentRangeIdx[book.id]++;
          if (currentRangeIdx[book.id] >= book.remainingRanges.length) {
            bookIdx++;
            break;
          }
          currentPage[book.id] = book.remainingRanges[currentRangeIdx[book.id]].start;
        }
      }

      if (dayBlocks.length > 0) {
        blocks = blocks.concat(dayBlocks);
        daysUsed++;
        plannedPagesSoFar += dayPagesUsed;
        carryOverPages = 0; /* [PATCH:m4.1-carry] */
      } else {
        carryOverPages = _budgetThisDay; /* [PATCH:m4.1-carry] */
      }
    }

    var requestedPages = 0;
    var requestedMinutes = 0;
    books.forEach(function (b) {
      var pages = 0;
      b.remainingRanges.forEach(function (r) { pages += r.end - r.start + 1; });
      requestedPages += pages;
      requestedMinutes += pages * 60 / b.pagesPerHour;
    });

    var plannedPages = 0;
    var plannedMinutes = 0;
    blocks.forEach(function (b) { plannedPages += b.pages; plannedMinutes += b.minutes; });
    var unplannedPages = requestedPages - plannedPages;

    var unplannedMinutesEstimate = 0;
    books.forEach(function (b) {
      var ci = currentRangeIdx[b.id];
      var cPage = currentPage[b.id];
      for (var ri = ci; ri < b.remainingRanges.length; ri++) {
        var r = b.remainingRanges[ri];
        var from = (ri === ci) ? cPage : r.start;
        var unread = Math.max(0, r.end - from + 1);
        if (unread > 0) unplannedMinutesEstimate += unread * 60 / b.pagesPerHour;
      }
    });

    var totalAvailableMinutes = 0;
    eligibleDays.forEach(function (d) { totalAvailableMinutes += d.capacityMinutes; });
    var avgCapacity = eligibleDays.length > 0 ? totalAvailableMinutes / eligibleDays.length : 0;
    var minDaysRequired = avgCapacity > 0 ? Math.ceil(requestedMinutes / avgCapacity) : null;

    var daysAvailable = eligibleDays.length;
    var status;
    if (unplannedPages > 0) status = "infeasible";
    else if (daysUsed === daysAvailable && daysUsed > 0) status = "tight";
    else status = "feasible";

    var message;
    if (status === "feasible") {
      message = "برنامه کامل است. " + _faNum(daysUsed) + " روز از " + _faNum(daysAvailable) + " روز استفاده شد.";
    } else if (status === "tight") {
      message = "برنامه کامل است ولی همه‌ی " + _faNum(daysAvailable) + " روز استفاده شد.";
    } else {
      message = "کمبود: " + _faNum(unplannedPages) + " صفحه (~" + _faNum(Math.ceil(unplannedMinutesEstimate)) + " دقیقه).";
    }

    var result = {
      ok: true,
      blocks: blocks,
      feasibility: {
        requestedPages: requestedPages,
        plannedPages: plannedPages,
        unplannedPages: unplannedPages,
        requestedMinutes: Math.round(requestedMinutes),
        plannedMinutes: plannedMinutes,
        unplannedMinutesEstimate: Math.round(unplannedMinutesEstimate),
        minDaysRequired: minDaysRequired,
        minDaysRequiredIsEstimate: true,
        daysAvailable: daysAvailable,
        daysUsed: daysUsed,
        status: status,
        message: message,
        dailyPageHardCap: _dailyPageHardCap,
        basePagesPerDay: _basePagesPerDay
      }
    };
    result.validation = A.validateBlocks(input, result);
    return result;
  };

  /* ═══ Validate result ═══ */
  A.validateBlocks = function (input, result) {
    var violations = [];
    if (!result || !Array.isArray(result.blocks)) {
      return { valid: false, violations: ["no blocks array"] };
    }
    if (!input || !input.books || !input.days) {
      return { valid: false, violations: ["missing input"] };
    }

    var booksById = {};
    input.books.forEach(function (b) { booksById[b.id] = b; });
    var dayByDate = {};
    input.days.forEach(function (d) { dayByDate[d.date] = d; });

    var byDay = {};
    result.blocks.forEach(function (b) {
      if (!byDay[b.date]) byDay[b.date] = [];
      byDay[b.date].push(b);
    });

    /* At most one book per day */
    Object.keys(byDay).forEach(function (date) {
      var ids = {};
      byDay[date].forEach(function (b) { ids[b.bookId] = true; });
      if (Object.keys(ids).length > 1) {
        violations.push("day " + date + " has multiple books: " + Object.keys(ids).join(", "));
      }
    });

    /* Before examDate */
    if (input.examDate) {
      result.blocks.forEach(function (b) {
        if (_dateCmp(b.date, input.examDate) >= 0) {
          violations.push("block on/after examDate: " + b.date);
        }
      });
    }

    /* Capacity not exceeded */
    Object.keys(byDay).forEach(function (date) {
      var day = dayByDate[date];
      if (!day) { violations.push("unknown day: " + date); return; }
      var total = 0;
      byDay[date].forEach(function (b) { total += b.minutes; });
      if (total > day.capacityMinutes) {
        violations.push("day " + date + " over capacity: " + total + " > " + day.capacityMinutes);
      }
    });

    /* Check blocks respect remainingRanges */
    var pagesByBook = {};
    result.blocks.forEach(function (b) {
      if (!pagesByBook[b.bookId]) pagesByBook[b.bookId] = [];
      pagesByBook[b.bookId].push({ start: b.startPage, end: b.endPage });
    });
    Object.keys(pagesByBook).forEach(function (bookId) {
      var bookObj = booksById[bookId];
      if (!bookObj) return;
      var remRanges = bookObj.remainingRanges || [{ start: bookObj.startPage, end: bookObj.endPage }];
      var ranges = pagesByBook[bookId].sort(function (a, b) { return a.start - b.start; });
      
      ranges.forEach(function (r) {
        var inside = remRanges.some(function (rr) { return r.start >= rr.start && r.end <= rr.end; });
        if (!inside) {
          violations.push("book " + bookId + " block " + r.start + "-" + r.end + " outside remaining ranges");
        }
      });
      
      // Overlaps are caught by the duplicate page check.
      // Gaps within a remaining range are valid if capacity ran out (reported as unplannedPages).
    });

    /* No page outside book range, no duplicates */
    var allPages = {};
    result.blocks.forEach(function (b) {
      var book = booksById[b.bookId];
      if (!book) { violations.push("unknown book: " + b.bookId); return; }
      if (b.startPage < book.startPage) {
        violations.push("block " + b.bookId + " start < book startPage");
      }
      if (b.endPage > book.endPage) {
        violations.push("block " + b.bookId + " end > book endPage");
      }
      for (var p = b.startPage; p <= b.endPage; p++) {
        var key = b.bookId + ":" + p;
        if (allPages[key]) violations.push("duplicate page " + key);
        allPages[key] = true;
      }
    });

    /* Book order monotonic in (date, sessionIndex) */
    var ordered = result.blocks.slice().sort(function (a, b) {
      var dc = _dateCmp(a.date, b.date);
      if (dc !== 0) return dc;
      return a.sessionIndex - b.sessionIndex;
    });
    var orderMap = {};
    input.books.forEach(function (b) { orderMap[b.id] = b.studyOrder; });
    var prevOrder = -Infinity;
    ordered.forEach(function (b) {
      var o = orderMap[b.bookId];
      if (o == null) { violations.push("unknown book order for " + b.bookId); return; }
      if (o < prevOrder) violations.push("book order regressed: " + b.bookId + " (order " + o + ") after " + prevOrder);
      prevOrder = o;
    });

    return { valid: violations.length === 0, violations: violations };
  };

  /* ═══ Tests ═══ */
  A.__tests = function () {
    var results = [];
    function _t(name, pass, info) {
      results.push({ name: name, pass: !!pass, info: info || null });
    }
    function mkBook(id, order, startPage, endPage, pph) {
      return { id: id, title: "Book " + id, totalPages: endPage,
               startPage: startPage, endPage: endPage,
               studyOrder: order, pagesPerHour: pph || 15 };
    }
    function mkDay(date, cap) { return { date: date, capacityMinutes: cap }; }
    function genDays(startN, count, cap) {
      var arr = [];
      for (var i = 0; i < count; i++) {
        var d = String(startN + i);
        while (d.length < 2) d = "0" + d;
        arr.push(mkDay("1405/8/" + d, cap));
      }
      return arr;
    }

    /* T1: single book 300 pages, 30 days × 240 min */
    try {
      var r1 = A.allocate({
        planId: "p1", examDate: "1405/9/30",
        books: [mkBook("A", 0, 1, 300, 15)],
        days: genDays(1, 30, 240),
        sessionMinutes: 60, maxDays: null
      });
      var sum1 = r1.blocks.reduce(function (s, b) { return s + b.pages; }, 0);
      _t("T1: 300 pages in 30 days × 240min",
         r1.ok && sum1 === 300 && r1.feasibility.unplannedPages === 0,
         { sum: sum1, days: r1.feasibility.daysUsed, status: r1.feasibility.status });
    } catch (e) { _t("T1", false, String(e)); }

    /* T2: 3 books, no interleave */
    try {
      var r2 = A.allocate({
        planId: "p1", examDate: "1405/10/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 100, 15), mkBook("C", 2, 1, 100, 15)],
        days: genDays(1, 30, 240),
        sessionMinutes: 60, maxDays: null
      });
      var sw = 0, prev = null;
      r2.blocks.forEach(function (b) { if (prev && prev !== b.bookId) sw++; prev = b.bookId; });
      _t("T2: 3 books sequential (2 switches)",
         r2.ok && sw === 2 && r2.validation.valid,
         { switches: sw, valid: r2.validation.valid, v: r2.validation.violations });
    } catch (e) { _t("T2", false, String(e)); }

    /* T3: maxDays 30 vs 15 changes output */
    try {
      var daysA = genDays(1, 30, 60);
      var booksA = [mkBook("A", 0, 1, 300, 15)];
      var ra30 = A.allocate({ planId: "p", examDate: "1405/10/01", books: booksA, days: daysA, sessionMinutes: 60, maxDays: 30 });
      var ra15 = A.allocate({ planId: "p", examDate: "1405/10/01", books: booksA, days: daysA, sessionMinutes: 60, maxDays: 15 });
      var differs = (ra30.feasibility.daysUsed !== ra15.feasibility.daysUsed) ||
                    (ra30.feasibility.unplannedPages !== ra15.feasibility.unplannedPages);
      var ordered15 = ra15.blocks.every(function (b) { return b.bookId === "A"; });
      var honest = ra15.feasibility.unplannedPages > 0;
      _t("T3: maxDays 30 vs 15 changes output",
         differs && ordered15 && honest,
         { d30: ra30.feasibility.daysUsed, d15: ra15.feasibility.daysUsed,
           unmet30: ra30.feasibility.unplannedPages, unmet15: ra15.feasibility.unplannedPages });
    } catch (e) { _t("T3", false, String(e)); }

    /* T4: zero-capacity days skipped */
    try {
      var r4 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: [ mkDay("1405/8/01", 0), mkDay("1405/8/02", 240), mkDay("1405/8/03", 0), mkDay("1405/8/04", 240) ],
        sessionMinutes: 60, maxDays: null
      });
      var skipped = r4.blocks.every(function (b) {
        return b.date !== "1405/8/01" && b.date !== "1405/8/03";
      });
      _t("T4: zero-capacity days skipped", r4.ok && skipped, r4.feasibility);
    } catch (e) { _t("T4", false, String(e)); }

    /* T5: book finishes → next book NOT started same day */
    try {
      var r5 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 5, 15), mkBook("B", 1, 1, 100, 15)],
        days: genDays(1, 10, 240),
        sessionMinutes: 60, maxDays: null
      });
      var day1Books = {};
      r5.blocks.forEach(function (b) { if (b.date === "1405/8/01") day1Books[b.bookId] = true; });
      var onlyA = Object.keys(day1Books).length === 1 && day1Books.A === true;
      _t("T5: book finish → next book not started same day",
         r5.ok && onlyA, { day1Books: Object.keys(day1Books) });
    } catch (e) { _t("T5", false, String(e)); }

    /* T6: single day, book finishes → last block may be shorter than session target */
    try {
      var r6 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 20, 15)],
        days: [mkDay("1405/8/01", 240)],
        sessionMinutes: 60, maxDays: null
      });
      var sum6 = r6.blocks.reduce(function (s, b) { return s + b.pages; }, 0);
      var lastBlock = r6.blocks[r6.blocks.length - 1];
      var shortOk = sum6 === 20 && r6.blocks.length === 2 &&
                    r6.blocks[0].pages === 15 && lastBlock.pages === 5;
      _t("T6: single day, last block shorter than session target",
         r6.ok && shortOk, { pages: r6.blocks.map(function (b) { return b.pages; }), sum: sum6 });
    } catch (e) { _t("T6", false, String(e)); }

    /* T7: insufficient → unplanned > 0 */
    try {
      var r7 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 500, 15)],
        days: genDays(1, 3, 60),
        sessionMinutes: 60, maxDays: null
      });
      _t("T7: insufficient → unplanned > 0, infeasible",
         r7.ok && r7.feasibility.unplannedPages > 0 && r7.feasibility.status === "infeasible",
         { unmet: r7.feasibility.unplannedPages, status: r7.feasibility.status });
    } catch (e) { _t("T7", false, String(e)); }

    /* T8: sufficient → all pages exactly once */
    try {
      var r8 = A.allocate({
        planId: "p", examDate: "1405/9/30",
        books: [mkBook("A", 0, 1, 100, 20), mkBook("B", 1, 1, 200, 20)],
        days: genDays(1, 60, 240),
        sessionMinutes: 60, maxDays: null
      });
      var sum8 = r8.blocks.reduce(function (s, b) { return s + b.pages; }, 0);
      var seen = {}, unique = true;
      r8.blocks.forEach(function (b) {
        for (var p = b.startPage; p <= b.endPage; p++) {
          var k = b.bookId + ":" + p;
          if (seen[k]) unique = false;
          seen[k] = true;
        }
      });
      _t("T8: sufficient → 300 pages unique",
         r8.ok && sum8 === 300 && unique && r8.feasibility.unplannedPages === 0,
         { sum: sum8, unique: unique });
    } catch (e) { _t("T8", false, String(e)); }

    /* T9: deterministic */
    try {
      var inA = {
        planId: "p", examDate: "1405/10/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 200, 20)],
        days: genDays(1, 20, 180),
        sessionMinutes: 60, maxDays: null
      };
      var ra = A.allocate(inA);
      var rb = A.allocate(inA);
      _t("T9: deterministic",
         ra.ok && rb.ok && JSON.stringify(ra.blocks) === JSON.stringify(rb.blocks), null);
    } catch (e) { _t("T9", false, String(e)); }

    /* T10: examDate boundary */
    try {
      var r10 = A.allocate({
        planId: "p", examDate: "1405/8/05",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: [
          mkDay("1405/8/01", 240), mkDay("1405/8/02", 240),
          mkDay("1405/8/03", 240), mkDay("1405/8/04", 240),
          mkDay("1405/8/05", 240), mkDay("1405/8/06", 240)
        ],
        sessionMinutes: 60, maxDays: null
      });
      var noneOnOrAfter = r10.blocks.every(function (b) { return _dateCmp(b.date, "1405/8/05") < 0; });
      _t("T10: no blocks on/after examDate, 4 days available",
         r10.ok && noneOnOrAfter && r10.feasibility.daysAvailable === 4,
         { daysAvail: r10.feasibility.daysAvailable });
    } catch (e) { _t("T10", false, String(e)); }

    /* T11: validateBlocks detects violations */
    try {
      var fakeRes = { blocks: [
        { date: "1405/8/01", bookId: "A", bookTitle: "A", startPage: 1, endPage: 5, pages: 5, minutes: 20, sessionIndex: 0 },
        { date: "1405/8/01", bookId: "B", bookTitle: "B", startPage: 1, endPage: 5, pages: 5, minutes: 20, sessionIndex: 1 }
      ]};
      var fakeIn = {
        examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 100, 15)],
        days: [mkDay("1405/8/01", 240)]
      };
      var vRes = A.validateBlocks(fakeIn, fakeRes);
      _t("T11: validateBlocks detects multi-book day",
         vRes.valid === false && vRes.violations.length > 0, vRes);
    } catch (e) { _t("T11", false, String(e)); }

    /* [M4-cap] T34-T42: hard cap */
    try {
      var r34 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 1000, 15)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null });
      _t("T34: cap formula = ceil(1.5 × ceil(P/N))",
        r34.ok && r34.feasibility.dailyPageHardCap === 150 && r34.feasibility.basePagesPerDay === 100,
        { cap: r34.feasibility.dailyPageHardCap, base: r34.feasibility.basePagesPerDay });
    } catch (e) { _t("T34", false, String(e)); }

    try {
      var r35 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: [mkDay("1405/8/1", 1200), mkDay("1405/8/2", 240), mkDay("1405/8/3", 240), mkDay("1405/8/4", 240), mkDay("1405/8/5", 240), mkDay("1405/8/6", 240), mkDay("1405/8/7", 240), mkDay("1405/8/8", 240), mkDay("1405/8/9", 240), mkDay("1405/8/10", 240)],
        sessionMinutes: 60, maxDays: null });
      var byDate35 = {};
      r35.blocks.forEach(function(b){ byDate35[b.date] = (byDate35[b.date]||0) + b.pages; });
      var cap35 = r35.feasibility.dailyPageHardCap;
      var noOver35 = Object.keys(byDate35).every(function(d){ return byDate35[d] <= cap35; });
      _t("T35: no day exceeds hard cap",
        r35.ok && noOver35 && byDate35["1405/8/1"] === cap35,
        { cap: cap35, day1: byDate35["1405/8/1"], byDate: byDate35 });
    } catch (e) { _t("T35", false, String(e)); }

    try {
      var r36 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 200, 15)],
        days: [mkDay("1405/8/1", 1200), mkDay("1405/8/2", 120), mkDay("1405/8/3", 120), mkDay("1405/8/4", 120), mkDay("1405/8/5", 120), mkDay("1405/8/6", 120), mkDay("1405/8/7", 120), mkDay("1405/8/8", 120), mkDay("1405/8/9", 120), mkDay("1405/8/10", 120)],
        sessionMinutes: 60, maxDays: null });
      var day1_36 = r36.blocks.filter(function(b){ return b.date === "1405/8/1"; })
        .reduce(function(s,b){ return s+b.pages; }, 0);
      var cap36 = r36.feasibility.dailyPageHardCap;
      _t("T36: high-capacity day capped, others receive pages",
        r36.ok && day1_36 <= cap36 && cap36 < 200 && day1_36 < 200,
        { day1: day1_36, cap: cap36, total: r36.feasibility.plannedPages });
    } catch (e) { _t("T36", false, String(e)); }

    try {
      var r37 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null });
      _t("T37: cap leaves no pages when horizon adequate",
        r37.ok && r37.feasibility.unplannedPages === 0 && r37.feasibility.plannedPages === 100,
        { planned: r37.feasibility.plannedPages, unplanned: r37.feasibility.unplannedPages });
    } catch (e) { _t("T37", false, String(e)); }

    try {
      var r38 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 5000, 15)],
        days: genDays(1, 3, 240), sessionMinutes: 60, maxDays: null });
      _t("T38: infeasible honestly when dates exhausted",
        r38.ok && r38.feasibility.unplannedPages > 0 && r38.feasibility.status === "infeasible",
        { unplanned: r38.feasibility.unplannedPages, status: r38.feasibility.status });
    } catch (e) { _t("T38", false, String(e)); }

    try {
      var r39 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: [mkDay("1405/8/1", 240), mkDay("1405/8/2", 10), mkDay("1405/8/3", 20), mkDay("1405/8/4", 240)],
        sessionMinutes: 60, maxDays: null });
      var days39 = {};
      r39.blocks.forEach(function(b){ days39[b.date] = true; });
      _t("T39: below-half-session days excluded",
        r39.ok && !days39["1405/8/2"] && !days39["1405/8/3"] && r39.feasibility.daysAvailable === 2,
        { daysAvail: r39.feasibility.daysAvailable });
    } catch (e) { _t("T39", false, String(e)); }

    try {
      var daysA = genDays(1, 20, 240);
      var r40a = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 400, 15)], days: daysA, sessionMinutes: 60, maxDays: 5 });
      var r40b = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 400, 15)], days: daysA, sessionMinutes: 60, maxDays: 20 });
      _t("T40: maxDays limits eligible set",
        r40a.ok && r40b.ok && r40a.feasibility.daysAvailable === 5 && r40b.feasibility.daysAvailable === 20 && r40a.feasibility.unplannedPages > r40b.feasibility.unplannedPages,
        { avail5: r40a.feasibility.daysAvailable, avail20: r40b.feasibility.daysAvailable,
          unplanned5: r40a.feasibility.unplannedPages, unplanned20: r40b.feasibility.unplannedPages });
    } catch (e) { _t("T40", false, String(e)); }

    try {
      var r41 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 200, 15)],
        days: [mkDay("1405/8/1", 600), mkDay("1405/8/2", 240), mkDay("1405/8/3", 240), mkDay("1405/8/4", 240), mkDay("1405/8/5", 240)],
        sessionMinutes: 60, maxDays: null });
      var d41 = {};
      r41.blocks.forEach(function(b){ d41[b.date] = (d41[b.date]||0) + b.pages; });
      _t("T41: proportional preserved under cap",
        r41.ok && d41["1405/8/1"] <= r41.feasibility.dailyPageHardCap,
        { freeDay: d41["1405/8/1"], cap: r41.feasibility.dailyPageHardCap, all: d41 });
    } catch (e) { _t("T41", false, String(e)); }

    try {
      var inA = { planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 500, 15), mkBook("B", 1, 1, 300, 20)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null };
      var ra42 = A.allocate(inA), rb42 = A.allocate(inA);
      _t("T42: deterministic with cap",
        ra42.ok && rb42.ok && JSON.stringify(ra42.blocks) === JSON.stringify(rb42.blocks) && ra42.feasibility.dailyPageHardCap === rb42.feasibility.dailyPageHardCap,
        { cap: ra42.feasibility.dailyPageHardCap });
    } catch (e) { _t("T42", false, String(e)); }


    /* [M4.1-carry] T43-T47: carryover accumulation */
    try {
      var r43 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 4, 10)],
        days: [mkDay("1405/8/1", 100), mkDay("1405/8/2", 100), mkDay("1405/8/3", 100)],
        sessionMinutes: 60, maxDays: null });
      _t("T43: carryover recovers skipped pages (4p/3d/cap3)",
        r43.ok && r43.feasibility.plannedPages === 4 && r43.feasibility.unplannedPages === 0 && r43.feasibility.dailyPageHardCap === 3,
        { planned: r43.feasibility.plannedPages, unplanned: r43.feasibility.unplannedPages, cap: r43.feasibility.dailyPageHardCap });
    } catch (e) { _t("T43", false, String(e)); }

    try {
      var r44 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 10, 10)],
        days: genDays(1, 8, 100),
        sessionMinutes: 60, maxDays: null });
      _t("T44: carryover accumulates over multiple skipped days",
        r44.ok && r44.feasibility.plannedPages === 10 && r44.feasibility.unplannedPages === 0,
        { planned: r44.feasibility.plannedPages, unplanned: r44.feasibility.unplannedPages });
    } catch (e) { _t("T44", false, String(e)); }

    try {
      var byDate45 = {};
      r43.blocks.forEach(function(b){ byDate45[b.date] = (byDate45[b.date]||0) + b.pages; });
      var maxDay45 = 0;
      Object.keys(byDate45).forEach(function(d){ if (byDate45[d] > maxDay45) maxDay45 = byDate45[d]; });
      _t("T45: cap not exceeded with carryover",
        r43.ok && maxDay45 <= r43.feasibility.dailyPageHardCap,
        { maxDay: maxDay45, cap: r43.feasibility.dailyPageHardCap });
    } catch (e) { _t("T45", false, String(e)); }

    try {
      var inA46 = { planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 4, 10)],
        days: [mkDay("1405/8/1", 100), mkDay("1405/8/2", 100), mkDay("1405/8/3", 100)],
        sessionMinutes: 60, maxDays: null };
      var ra46 = A.allocate(inA46), rb46 = A.allocate(inA46);
      _t("T46: deterministic with carryover",
        ra46.ok && rb46.ok && JSON.stringify(ra46.blocks) === JSON.stringify(rb46.blocks),
        null);
    } catch (e) { _t("T46", false, String(e)); }

    try {
      var r47 = A.allocate({ planId: "p", examDate: "1405/12/01",
        books: [mkBook("A", 0, 1, 3, 10), mkBook("B", 1, 1, 3, 10)],
        days: [mkDay("1405/8/1", 100), mkDay("1405/8/2", 100), mkDay("1405/8/3", 100), mkDay("1405/8/4", 100), mkDay("1405/8/5", 100), mkDay("1405/8/6", 100)],
        sessionMinutes: 60, maxDays: null });
      var bookByDate47 = {};
      r47.blocks.forEach(function(b){
        if (!bookByDate47[b.date]) bookByDate47[b.date] = {};
        bookByDate47[b.date][b.bookId] = true;
      });
      var multiBook47 = Object.keys(bookByDate47).some(function(d){
        return Object.keys(bookByDate47[d]).length > 1;
      });
      _t("T47: one-book-per-day preserved with carryover",
        r47.ok && !multiBook47 && r47.feasibility.plannedPages === 6,
        { planned: r47.feasibility.plannedPages, multiBook: multiBook47 });
    } catch (e) { _t("T47", false, String(e)); }

    /* [PATCH:m7b2-tests] */
    try {
      var r59 = A.allocate({ planId: "p", examDate: "1405/9/01", books: [mkBook("A", 0, 1, 100, 15)], days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null, anchors: [] });
      var r59b = A.allocate({ planId: "p", examDate: "1405/9/01", books: [mkBook("A", 0, 1, 100, 15)], days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null });
      _t("T59: empty anchors == no anchors (bit-identical)", JSON.stringify(r59.blocks) === JSON.stringify(r59b.blocks), null);
    } catch (e) { _t("T59", false, String(e)); }

    try {
      var r60 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 200, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/03", blocks: [{ bookId: "A", startPage: 21, endPage: 50, pages: 30, minutes: 120 }] }]
      });
      var day3 = r60.blocks.filter(function (b) { return b.date === "1405/8/03"; });
      var day3anc = day3.filter(function (b) { return b.isAnchor; });
      _t("T60: anchor preserved at specified day", r60.ok && day3anc.length === 1 && day3anc[0].startPage === 21 && day3anc[0].endPage === 50, { day3blocks: day3.length });
      var preEnd = r60.blocks.filter(function (b) { return b.date < "1405/8/03"; }).reduce(function (s, b) { return Math.max(s, b.endPage); }, 0);
      _t("T60b: pre-anchor pages < 21", preEnd <= 20, { preEnd: preEnd });
      var postStart = r60.blocks.filter(function (b) { return b.date >= "1405/8/03" && !b.isAnchor; }).reduce(function (s, b) { return s === 0 ? b.startPage : Math.min(s, b.startPage); }, 0);
      _t("T60c: post-anchor pages > 50", postStart >= 51 || postStart === 0, { postStart: postStart });
    } catch (e) { _t("T60-T60c", false, String(e)); }

    try {
      var r61 = A.allocate({
        planId: "p", examDate: "1405/10/01",
        books: [mkBook("A", 0, 1, 200, 15)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null,
        anchors: [
          { date: "1405/8/02", blocks: [{ bookId: "A", startPage: 11, endPage: 25, pages: 15 }] },
          { date: "1405/8/05", blocks: [{ bookId: "A", startPage: 51, endPage: 70, pages: 20 }] }
        ]
      });
      var a1 = r61.blocks.filter(function (b) { return b.date === "1405/8/02" && b.isAnchor; });
      var a2 = r61.blocks.filter(function (b) { return b.date === "1405/8/05" && b.isAnchor; });
      _t("T61: two compatible anchors preserved", r61.ok && a1.length === 1 && a2.length === 1 && a1[0].startPage === 11 && a2[0].startPage === 51, null);
    } catch (e) { _t("T61", false, String(e)); }

    try {
      var r62 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 200, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/02", blocks: [
          { bookId: "A", startPage: 11, endPage: 30, pages: 20 },
          { bookId: "A", startPage: 25, endPage: 40, pages: 16 }
        ]}]
      });
      _t("T62: overlapping anchors rejected", !r62.ok && r62.errors[0].code === "anchor_overlap", r62.errors);
    } catch (e) { _t("T62", false, String(e)); }

    try {
      var r63 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/03", blocks: [{ bookId: "A", startPage: 1, endPage: 30, pages: 30, minutes: 120 }] }]
      });
      var d3 = r63.blocks.filter(function (b) { return b.date === "1405/8/03"; });
      var anc3 = d3.filter(function (b) { return b.isAnchor; });
      _t("T63: first-day anchor", r63.ok && anc3.length === 1 && anc3[0].startPage === 1, null);
    } catch (e) { _t("T63", false, String(e)); }

    try {
      var r64a = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/03", blocks: [{ bookId: "A", startPage: 21, endPage: 40, pages: 20, minutes: 80 }] }]
      });
      var r64b = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/03", blocks: [{ bookId: "A", startPage: 21, endPage: 40, pages: 20, minutes: 80 }] }]
      });
      _t("T64: deterministic with anchors", r64a.ok && r64b.ok && JSON.stringify(r64a.blocks) === JSON.stringify(r64b.blocks), null);
    } catch (e) { _t("T64", false, String(e)); }
    /* [PATCH:m7b21-t65] */
    try {
      var r65a = A.allocate({ planId: "p", examDate: "1405/9/01", books: [mkBook("A", 0, 1, 200, 15)], days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null });
      var r65b = A.allocate({ planId: "p", examDate: "1405/9/01", books: [mkBook("A", 0, 1, 200, 15)], days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null, anchors: [{ date: "1405/8/03", blocks: [{ bookId: "A", startPage: 21, endPage: 50, pages: 30, minutes: 120 }] }] });
      var noAnc = r65a.feasibility.plannedPages;
      var withAnc = r65b.feasibility.plannedPages;
      var nonAncPages = r65b.blocks.filter(function(b){ return !b.isAnchor; }).reduce(function(s,b){ return s+b.pages; },0);
      _t("T65: anchor does not under-allocate (efficiency preserved)", r65a.ok && r65b.ok && noAnc >= 190 && withAnc >= 190 && nonAncPages >= 160, { noAnc: noAnc, withAnc: withAnc, nonAnc: nonAncPages });
    } catch (e) { _t("T65", false, String(e)); }
    /* [PATCH:m7b3e-tests] */
    try {
      var r70 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 300, 15)],
        days: [{ date: "1405/8/01", capacityMinutes: 120 }],
        sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/01", blocks: [{ bookId: "A", startPage: 1, endPage: 100, pages: 100, minutes: 400 }] }]
      });
      _t("T70: anchor exceeds day capacity rejected", !r70.ok && r70.errors[0].code === "anchor_exceeds_capacity", r70.errors);
    } catch (e) { _t("T70", false, String(e)); }

    try {
      var r71 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 60, 15)],
        days: [
          { date: "1405/8/01", capacityMinutes: 240 },
          { date: "1405/8/02", capacityMinutes: 240 },
          { date: "1405/8/03", capacityMinutes: 240 }
        ],
        sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/02", blocks: [{ bookId: "A", startPage: 1, endPage: 60, pages: 60, minutes: 240 }] }]
      });
      _t("T71: anchor sum over dailyPageHardCap rejected", !r71.ok && r71.errors.some(function(e){ return e.code === "anchor_exceeds_daily_cap"; }), r71.errors);
    } catch (e) { _t("T71", false, String(e)); }

    try {
      var r72 = A.allocate({
        planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 100, 15)],
        days: [
          { date: "1405/8/01", capacityMinutes: 240 },
          { date: "1405/8/02", capacityMinutes: 240 }
        ],
        sessionMinutes: 60, maxDays: null,
        anchors: [{ date: "1405/8/02", blocks: [{ bookId: "B", startPage: 1, endPage: 10, pages: 10, minutes: 40 }] }]
      });
      var _day2Books = {};
      if (r72.ok) {
        r72.blocks.forEach(function(b) { if (b.date === "1405/8/02") _day2Books[b.bookId] = true; });
      }
      var _oneBookOnDay2 = Object.keys(_day2Books).length <= 1;
      _t("T72: one book per day (anchor day)", r72.ok && _oneBookOnDay2, { day2Books: Object.keys(_day2Books) });
    } catch (e) { _t("T72", false, String(e)); }
    /* [PATCH:m7s2a-tests] */
    try {
      var r76a = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 100, 15)],
        days: genDays(1, 20, 240), sessionMinutes: 60, maxDays: null });
      var r76b = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15), mkBook("B", 1, 1, 100, 15)],
        days: genDays(1, 20, 240), sessionMinutes: 60, maxDays: null,
        prioritizeBookId: "B" });
      var firstBookA = r76a.blocks[0] ? r76a.blocks[0].bookId : null;
      var firstBookB = r76b.blocks[0] ? r76b.blocks[0].bookId : null;
      _t("T76: without prioritize -> A first", r76a.ok && firstBookA === "A", { first: firstBookA });
      _t("T76b: with prioritize B -> B first", r76b.ok && firstBookB === "B", { first: firstBookB });
      var r76B_firstDay_books = {};
      r76b.blocks.forEach(function(b) { if (b.date === "1405/8/01") r76B_firstDay_books[b.bookId] = true; });
      _t("T76c: one book per day still enforced", Object.keys(r76B_firstDay_books).length <= 1, { day1Books: Object.keys(r76B_firstDay_books) });
    } catch (e) { _t("T76", false, String(e)); }

    try {
      var r77 = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 200, 15), mkBook("B", 1, 1, 200, 15)],
        days: genDays(1, 25, 240), sessionMinutes: 60, maxDays: null,
        prioritizeBookId: "B" });
      var pagesA = 0, pagesB = 0;
      r77.blocks.forEach(function(b) { if (b.bookId === "A") pagesA += b.pages; if (b.bookId === "B") pagesB += b.pages; });
      _t("T77: prioritize B gives B more pages", r77.ok && pagesB >= pagesA, { pagesA: pagesA, pagesB: pagesB });
    } catch (e) { _t("T77", false, String(e)); }

    try {
      var r78a = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null });
      var r78b = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 10, 240), sessionMinutes: 60, maxDays: null,
        prioritizeBookId: null });
      _t("T78: prioritizeBookId null == no field (backward-compat)", 
        r78a.ok && r78b.ok && JSON.stringify(r78a.blocks) === JSON.stringify(r78b.blocks), null);
    } catch (e) { _t("T78", false, String(e)); }

    try {
      var r79 = A.allocate({ planId: "p", examDate: "1405/9/01",
        books: [mkBook("A", 0, 1, 100, 15)],
        days: genDays(1, 5, 240), sessionMinutes: 60, maxDays: null,
        prioritizeBookId: "NONEXISTENT" });
      _t("T79: invalid prioritizeBookId rejected", !r79.ok && r79.errors && r79.errors[0] && r79.errors[0].code === "prioritize_book_not_found", r79.errors);
    } catch (e) { _t("T79", false, String(e)); }
    var passed = results.filter(function (r) { return r.pass; }).length;
    return { passed: passed, total: results.length, results: results };
  };

  /* ═══ M7-B Patch 2: Anchor-Aware Allocation ═══ */
  /* [PATCH:m7b2-anchors] */
  var _coreAllocate = A.allocate;

  A.allocate = function (input) {
    var anchors = (input && Array.isArray(input.anchors)) ? input.anchors : [];
    var hasPrio = !!(input && input.prioritizeBookId);
    if (anchors.length === 0 && !hasPrio) return _coreAllocate(input);
    return _allocateWithAnchors(input, anchors);
  };

  function _invalRes(errors) {
    return {
      ok: false,
      errors: errors,
      blocks: [],
      feasibility: {
        requestedPages: 0, plannedPages: 0, unplannedPages: 0,
        requestedMinutes: 0, plannedMinutes: 0, unplannedMinutesEstimate: 0,
        minDaysRequired: null, minDaysRequiredIsEstimate: true,
        daysAvailable: 0, daysUsed: 0,
        status: "invalid_input",
        message: "\u0648\u0631\u0648\u062F\u06CC \u0646\u0627\u0645\u0639\u062A\u0628\u0631"
      },
      validation: { valid: false, violations: [] }
    };
  }

  function _allocateWithAnchors(input, anchors) {
    /* [PATCH:m7b25-fixed] Day loop with range search (not blind cursor advance) */
    var v = _validateInput(input);
    if (!v.ok) return _invalRes(v.errors);

    var bookMap = {};
    input.books.forEach(function (b) { bookMap[b.id] = b; });

    var anchorsByBook = {};
    var errs = [];

    anchors.forEach(function (dayA, dIdx) {
      if (!dayA || typeof dayA.date !== "string" || !Array.isArray(dayA.blocks)) {
        errs.push(_err("anchor_invalid", "\u0633\u0627\u062E\u062A\u0627\u0631 anchor " + (dIdx + 1) + " \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A."));
        return;
      }
      dayA.blocks.forEach(function (b, bIdx) {
        if (!b || typeof b.bookId !== "string" ||
            typeof b.startPage !== "number" || typeof b.endPage !== "number" ||
            b.endPage < b.startPage) {
          errs.push(_err("anchor_invalid", "\u0628\u0644\u0648\u06A9 " + (bIdx + 1) + " \u062F\u0631 anchor " + (dIdx + 1) + " \u0646\u0627\u0645\u0639\u062A\u0628\u0631 \u0627\u0633\u062A."));
          return;
        }
        var book = bookMap[b.bookId];
        if (!book) { errs.push(_err("anchor_unknown_book", "\u06A9\u062A\u0627\u0628 \u00AB" + b.bookId + "\u00BB \u062F\u0631 \u0648\u0631\u0648\u062F\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F.")); return; }
        if (b.startPage < book.startPage || b.endPage > book.endPage) {
          errs.push(_err("anchor_out_of_range", "\u0628\u0627\u0632\u0647\u0654 \u0635\u0641\u062D\u0627\u062A anchor \u00AB\u0635 " + b.startPage + "\u2013" + b.endPage + "\u00BB \u062E\u0627\u0631\u062C \u0627\u0632 \u0645\u062D\u062F\u0648\u062F\u0647\u0654 \u06A9\u062A\u0627\u0628 \u00AB\u0635 " + book.startPage + "\u2013" + book.endPage + "\u00BB \u0627\u0633\u062A."));
          return;
        }
        if (!anchorsByBook[b.bookId]) anchorsByBook[b.bookId] = [];
        anchorsByBook[b.bookId].push({
          date: dayA.date, bookId: b.bookId,
          startPage: b.startPage, endPage: b.endPage,
          pages: b.endPage - b.startPage + 1,
          minutes: (typeof b.minutes === "number" && b.minutes > 0) ? b.minutes : null
        });
      });
    });

    if (errs.length > 0) return _invalRes(errs);

    Object.keys(anchorsByBook).forEach(function (bid) {
      var list = anchorsByBook[bid].slice().sort(function (a, b) {
        var dc = _dateCmp(a.date, b.date);
        if (dc !== 0) return dc;
        return a.startPage - b.startPage;
      });
      anchorsByBook[bid] = list;
      for (var i = 1; i < list.length; i++) {
        if (list[i].startPage <= list[i - 1].endPage) {
          var _bkA = bookMap[bid]; var _bkT = _bkA ? _bkA.title : bid; errs.push(_err("anchor_overlap", "\u06A9\u062A\u0627\u0628 \u00AB" + _bkT + "\u00BB: \u062F\u0648 \u0628\u0644\u0648\u06A9 \u062F\u0631 \u062A\u0627\u0631\u06CC\u062E " + list[i].date + " \u0647\u0645\u200C\u067E\u0648\u0634\u0627\u0646\u06CC \u062F\u0627\u0631\u0646\u062F (\u0635 " + list[i].startPage + "\u2013" + list[i - 1].endPage + ")."));
        }
      }
    });
    if (errs.length > 0) return _invalRes(errs);

    var books = input.books.slice().sort(function (a, b) {
      if (a.studyOrder !== b.studyOrder) return a.studyOrder - b.studyOrder;
      return a.id.localeCompare(b.id);
    });
    if (input.prioritizeBookId) {
      var _prioIdx = -1;
      for (var _pi2 = 0; _pi2 < books.length; _pi2++) {
        if (books[_pi2] && books[_pi2].id === input.prioritizeBookId) { _prioIdx = _pi2; break; }
      }
      if (_prioIdx > 0) {
        var _prioBook = books.splice(_prioIdx, 1)[0];
        books.unshift(_prioBook);
      }
    }

    books.forEach(function (b) {
      var bookAnchors = anchorsByBook[b.id] || [];
      var rr = (Array.isArray(b.remainingRanges) && b.remainingRanges.length > 0)
        ? b.remainingRanges.slice().sort(function(x,y){ return x.start - y.start; })
        : [{ start: b.startPage || 1, end: b.endPage || (b.startPage || 1) }];
      var out = [];
      rr.forEach(function (r) {
        var segs = [{ start: r.start, end: r.end }];
        bookAnchors.forEach(function (a) {
          var ns = [];
          segs.forEach(function (s) {
            if (a.endPage < s.start || a.startPage > s.end) { ns.push(s); return; }
            if (a.startPage > s.start) ns.push({ start: s.start, end: a.startPage - 1 });
            if (a.endPage < s.end) ns.push({ start: a.endPage + 1, end: s.end });
          });
          segs = ns;
        });
        segs.forEach(function (s) { if (s.end >= s.start) out.push(s); });
      });
      b.remainingRanges = out;
    });

    var anchorMinByDate = {};
    var anchorBlocks = [];
    Object.keys(anchorsByBook).forEach(function (bid) {
      var book = bookMap[bid];
      anchorsByBook[bid].forEach(function (a) {
        var pph = (book.pagesPerHour > 0) ? book.pagesPerHour : 20;
        var mins = (typeof a.minutes === "number" && a.minutes > 0) ? a.minutes : Math.ceil(a.pages * 60 / pph);
        anchorMinByDate[a.date] = (anchorMinByDate[a.date] || 0) + mins;
        anchorBlocks.push({
          date: a.date, bookId: bid, bookTitle: book.title,
          startPage: a.startPage, endPage: a.endPage,
          pages: a.pages, minutes: mins, sessionIndex: 0, isAnchor: true
        });
      });
    });

    var eligibleDays = input.days.filter(function (d) {
      if (d.capacityMinutes < input.sessionMinutes / 2 && !anchorMinByDate[d.date]) return false;
      if (_dateCmp(d.date, input.examDate) >= 0) return false;
      return true;
    }).sort(function (a, b) { return _dateCmp(a.date, b.date); });

    if (input.maxDays != null && input.maxDays > 0) {
      eligibleDays = eligibleDays.slice(0, input.maxDays);
    }

        /* [PATCH:m7b3e-cap-compute] */
    var _totalAllPages = 0;
    books.forEach(function(b) {
      b.remainingRanges.forEach(function(r) { _totalAllPages += r.end - r.start + 1; });
    });
    var _anchorPagesForCap = 0;
    anchorBlocks.forEach(function(b) { _anchorPagesForCap += b.pages; });
    _totalAllPages += _anchorPagesForCap;
    var _N_eligible = eligibleDays.length;
    var _basePagesPerDay = _N_eligible > 0 ? Math.ceil(_totalAllPages / _N_eligible) : 0;
    var _dailyPageHardCap = _N_eligible > 0 ? Math.ceil(_basePagesPerDay * 1.5) : 0;

    /* [PATCH:m7b3e-anchor-validation] */
    var _anchorPagesByDate = {};
    anchorBlocks.forEach(function(b) {
      _anchorPagesByDate[b.date] = (_anchorPagesByDate[b.date] || 0) + b.pages;
    });
    var _anchorBookByDate = {};
    Object.keys(anchorsByBook).forEach(function(bid) {
      anchorsByBook[bid].forEach(function(a) { _anchorBookByDate[a.date] = bid; });
    });
    var _dayCapMap = {};
    eligibleDays.forEach(function(d) { _dayCapMap[d.date] = d.capacityMinutes; });

    Object.keys(anchorMinByDate).forEach(function(_vd) {
      var _dayCap = _dayCapMap[_vd];
      if (_dayCap == null) {
        errs.push(_err("anchor_day_not_eligible",
          "\u0631\u0648\u0632 بلوک " + _vd + " \u062f\u0631 \u0628\u0627\u0632\u0647\u0654 \u0645\u062c\u0627\u0632 \u0646\u06cc\u0633\u062a."));
        return;
      }
      if (anchorMinByDate[_vd] > _dayCap) {
        errs.push(_err("anchor_exceeds_capacity",
          "\u0645\u062c\u0645\u0648\u0639 \u062f\u0642\u0627\u06cc\u0642 بلوک \u062f\u0631 " + _vd + " (" + anchorMinByDate[_vd] + " \u062f\u0642\u06cc\u0642\u0647) \u0627\u0632 \u0638\u0631\u0641\u06cc\u062a \u0631\u0648\u0632 (" + _dayCap + " \u062f\u0642\u06cc\u0642\u0647) \u0628\u06cc\u0634\u062a\u0631 \u0627\u0633\u062a."));
      }
    });
    Object.keys(_anchorPagesByDate).forEach(function(_vd) {
      if (_dailyPageHardCap > 0 && _anchorPagesByDate[_vd] > _dailyPageHardCap) {
        errs.push(_err("anchor_exceeds_daily_cap",
          "\u0645\u062c\u0645\u0648\u0639 \u0635\u0641\u062d\u0627\u062a بلوک \u062f\u0631 " + _vd + " (" + _anchorPagesByDate[_vd] + " \u0635\u0641\u062d\u0647) \u0627\u0632 \u0633\u0642\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 (" + _dailyPageHardCap + " \u0635\u0641\u062d\u0647) \u0628\u06cc\u0634\u062a\u0631 \u0627\u0633\u062a."));
      }
    });

    if (errs.length > 0) return _invalRes(errs);
function _dayFilter(bookId, date) {
      /* [PATCH:m7b25-filter] Returns {minPage, maxPage} always (never null) */
      var bk = bookMap[bookId];
      var anchors = anchorsByBook[bookId];
      if (!anchors || anchors.length === 0) {
        return { minPage: bk.startPage || 1, maxPage: bk.endPage || (bk.startPage || 1) };
      }
      var prev = null, cur = null, nxt = null;
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i];
        var cmp = _dateCmp(date, a.date);
        if (cmp === 0) { cur = a; break; }
        if (cmp < 0) { nxt = a; break; }
        prev = a;
      }
      var minP = bk.startPage, maxP = bk.endPage;
      if (cur) {
        minP = prev ? prev.endPage + 1 : bk.startPage;
        maxP = nxt ? nxt.startPage - 1 : bk.endPage;
      } else if (nxt && !prev) {
        minP = bk.startPage;
        maxP = nxt.startPage - 1;
      } else if (prev && !nxt) {
        minP = prev.endPage + 1;
        maxP = bk.endPage;
      } else if (prev && nxt) {
        minP = prev.endPage + 1;
        maxP = nxt.startPage - 1;
      }
      if (minP > maxP) return { minPage: 0, maxPage: 0 };
      return { minPage: minP, maxPage: maxP };
    }

    var currentPage = {};
    var currentRangeIdx = {};
    books.forEach(function (b) {
      currentRangeIdx[b.id] = 0;
      currentPage[b.id] = (b.remainingRanges.length > 0) ? b.remainingRanges[0].start : 0;
    });

    var newBlocks = [];

        /* [PATCH:m7b3e-onebook] */
    for (var dIdx = 0; dIdx < eligibleDays.length; dIdx++) {
      var day = eligibleDays[dIdx];
      var dayCapacity = day.capacityMinutes - (anchorMinByDate[day.date] || 0);
      if (dayCapacity < input.sessionMinutes / 2) continue;

      var _anchorBookToday = _anchorBookByDate[day.date] || null;
      var _dayPagesBudget = _dailyPageHardCap > 0 ? Math.max(0, _dailyPageHardCap - (_anchorPagesByDate[day.date] || 0)) : Infinity;
      var _dayBlocks = [];
      var _bookUsedToday = null;
      var _dayPagesUsed = 0;

      for (var bIdx = 0; bIdx < books.length && dayCapacity > 0 && _dayPagesUsed < _dayPagesBudget; bIdx++) {
        var book = books[bIdx];
        if (_anchorBookToday && book.id !== _anchorBookToday) continue;
        if (_bookUsedToday && _bookUsedToday !== book.id) continue;

        while (currentRangeIdx[book.id] < book.remainingRanges.length) {
          var cr0 = book.remainingRanges[currentRangeIdx[book.id]];
          if (cr0.end < currentPage[book.id]) { currentRangeIdx[book.id]++; continue; }
          break;
        }
        if (currentRangeIdx[book.id] >= book.remainingRanges.length) continue;

        var _f = _dayFilter(book.id, day.date);
        if (_f.minPage > _f.maxPage) continue;

        var _rangeToUse = null;
        for (var ri = currentRangeIdx[book.id]; ri < book.remainingRanges.length; ri++) {
          var cr = book.remainingRanges[ri];
          if (cr.end < currentPage[book.id]) continue;
          var effMin = Math.max(cr.start, _f.minPage);
          var effMax = Math.min(cr.end, _f.maxPage);
          if (effMin > effMax) continue;
          var candidateStart = Math.max(currentPage[book.id], effMin);
          if (candidateStart > effMax) continue;
          _rangeToUse = { ri: ri, startP: candidateStart, effMax: effMax };
          break;
        }

        if (!_rangeToUse) continue;

        var startP = _rangeToUse.startP;
        while (dayCapacity > 0 && startP <= _rangeToUse.effMax && _dayPagesUsed < _dayPagesBudget) {
          var sessionLim = Math.min(input.sessionMinutes, dayCapacity);
          var pagesByTime = Math.floor(sessionLim * book.pagesPerHour / 60);
          if (pagesByTime < 1) break;
          var pagesLeftInRange = _rangeToUse.effMax - startP + 1;
          var pagesLeftBudget = _dayPagesBudget - _dayPagesUsed;
          var pages = Math.min(pagesByTime, pagesLeftInRange, pagesLeftBudget);
          if (pages < 1) break;
          var minutes = Math.ceil(pages * 60 / book.pagesPerHour);
          if (minutes > dayCapacity) {
            pages--;
            if (pages < 1) break;
            minutes = Math.ceil(pages * 60 / book.pagesPerHour);
          }
          _dayBlocks.push({
            date: day.date, bookId: book.id, bookTitle: book.title,
            startPage: startP, endPage: startP + pages - 1,
            pages: pages, minutes: minutes, sessionIndex: 0
          });
          startP += pages;
          dayCapacity -= minutes;
          _dayPagesUsed += pages;
          _bookUsedToday = book.id;
        }
        currentPage[book.id] = startP;

        while (currentRangeIdx[book.id] < book.remainingRanges.length) {
          var cr2 = book.remainingRanges[currentRangeIdx[book.id]];
          if (cr2.end < currentPage[book.id]) { currentRangeIdx[book.id]++; continue; }
          break;
        }
        if (_bookUsedToday) break;
      }

      if (_dayBlocks.length > 0) {
        _dayBlocks.forEach(function (b, i) { b.sessionIndex = i; });
        newBlocks = newBlocks.concat(_dayBlocks);
      }
    }

    var _skipUntilMarker = true;    var merged = newBlocks.concat(anchorBlocks);
    merged.sort(function (a, b) {
      var dc = _dateCmp(a.date, b.date);
      if (dc !== 0) return dc;
      return (a.startPage || 0) - (b.startPage || 0);
    });
    var dayCounters = {};
    merged.forEach(function (b) {
      if (dayCounters[b.date] == null) dayCounters[b.date] = 0;
      b.sessionIndex = dayCounters[b.date]++;
    });

    var violations = [];
    var pageMap = {};
    merged.forEach(function (b) {
      for (var p = b.startPage; p <= b.endPage; p++) {
        var key = b.bookId + ":" + p;
        if (pageMap[key]) violations.push("duplicate page " + key);
        pageMap[key] = true;
      }
    });

    var anchorPages = 0, anchorMin = 0;
    anchorBlocks.forEach(function (b) { anchorPages += b.pages; anchorMin += b.minutes; });

    var nonAncRequested = 0, nonAncMin = 0;
    books.forEach(function (b) {
      b.remainingRanges.forEach(function (r) {
        var p = r.end - r.start + 1;
        nonAncRequested += p;
        nonAncMin += p * 60 / (b.pagesPerHour || 20);
      });
    });
    var nonAncPlanned = 0, nonAncPlannedMin = 0;
    newBlocks.forEach(function (b) { nonAncPlanned += b.pages; nonAncPlannedMin += b.minutes; });

    var totalRequested = anchorPages + nonAncRequested;
    var totalPlanned = anchorPages + nonAncPlanned;
    var unplanned = Math.max(0, totalRequested - totalPlanned);

    var usedDates = {};
    merged.forEach(function (b) { usedDates[b.date] = true; });

    var status = violations.length > 0 ? "invalid_input" : (unplanned > 0 ? "infeasible" : "feasible");
    var message = violations.length > 0
      ? ("\u062a\u0639\u0627\u0631\u0636: " + violations[0])
      : (status === "feasible" ? "\u0628\u0631\u0646\u0627\u0645\u0647 \u06a9\u0627\u0645\u0644 \u0627\u0633\u062a." : ("\u06a9\u0645\u0628\u0648\u062f: " + _faNum(unplanned) + " \u0635\u0641\u062d\u0647"));

    var feasibility = {
      requestedPages: totalRequested, plannedPages: totalPlanned, unplannedPages: unplanned,
      requestedMinutes: Math.round(nonAncMin + anchorMin),
      plannedMinutes: nonAncPlannedMin + anchorMin,
      unplannedMinutesEstimate: Math.round(unplanned * 60 / 20),
      minDaysRequired: null, minDaysRequiredIsEstimate: true,
      daysAvailable: eligibleDays.length, daysUsed: Object.keys(usedDates).length,
      status: status, message: message,
      dailyPageHardCap: 0, basePagesPerDay: 0
    };

    var result = { ok: violations.length === 0, blocks: merged, feasibility: feasibility };
    if (violations.length > 0) {
      result.errors = [{ code: "anchor_page_conflict", message: violations[0] }];
      result.validation = { valid: false, violations: violations };
    } else {
      result.validation = { valid: true, violations: [] };
    }
    return result;
  }
  console.log("[planner.allocator.v7] loaded v" + A.VERSION);
})();
