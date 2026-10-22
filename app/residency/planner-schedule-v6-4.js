/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Schedule Generator v6.4
   Allocation → proposed activities (pure, no state mutation)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.schedule.v6.4] R missing"); return; }
  var PS = R.plannerSchedule = R.plannerSchedule || {};
  var PA = R.plannerAllocation;

  var DEFAULT_SESSION_MIN = 30;
  var DEFAULT_SESSION_DEF = 90;
  var DEFAULT_SESSION_MAX = 120;

  /* ─── Compute target range for book/round ─── */
  PS.computeTargetRange = function (demand) {
    var target = (demand && demand.targetPages) | 0;
    if (target <= 0) return null;
    return { start: 1, end: target };
  };

  /* ─── Read ranges from existing activities ─── */
  PS.getAlreadyReadRanges = function (activities, bookId, roundId) {
  /* [PATCH:f4b7-read] Cross-round completed + plannedPages fallback */
  var ranges = [];
  var hasRangeData = false;
  var cumulativePages = 0;

  (activities || []).forEach(function (a) {
    if (!a) return;
    if (a.kind !== "study") return;
    if (a.bookId !== bookId) return;

    var isDone = (a.status === "completed" || a.status === "partial" || a.status === "in_progress");
    if (!isDone) {
      if (roundId && a.roundId !== roundId) return; /* planned scoped to round */
      return;
    }

    if (Array.isArray(a.actualPageRanges) && a.actualPageRanges.length > 0) {
      hasRangeData = true;
      a.actualPageRanges.forEach(function (r) {
        if (r && typeof r.start === "number" && typeof r.end === "number" && r.end >= r.start) {
          ranges.push({ start: r.start, end: r.end });
        }
      });
    } else if (typeof a.plannedPageStart === "number" && typeof a.plannedPageEnd === "number") {
      ranges.push({ start: a.plannedPageStart, end: a.plannedPageEnd });
      hasRangeData = true;
    } else if (a.actualPages != null && a.actualPages > 0) {
      cumulativePages += a.actualPages;
    }
  });

  if (!hasRangeData && cumulativePages > 0) {
    return { ranges: [{ start: 1, end: cumulativePages }], source: "cumulative" };
  }
  if (cumulativePages > 0) {
    ranges.push({ start: 1, end: cumulativePages });
  }
  return {
    ranges: PS._mergeRanges(ranges),
    source: hasRangeData ? "explicit" : "cumulative"
  };
};;

  PS._mergeRanges = function (ranges) {
    if (!ranges || ranges.length === 0) return [];
    var sorted = ranges.slice().sort(function (a, b) { return a.start - b.start; });
    var out = [sorted[0]];
    for (var i = 1; i < sorted.length; i++) {
      var last = out[out.length - 1];
      var cur = sorted[i];
      if (cur.start <= last.end + 1) last.end = Math.max(last.end, cur.end);
      else out.push(cur);
    }
    return out;
  };

  /* [PATCH:r3f2c] allocated ranges (planned/in_progress) — excluded from re-allocation */
  PS.getAllocatedRanges = function (activities, bookId, roundId) {
    var ranges = [];
    (activities || []).forEach(function (a) {
      if (!a) return;
      if (a.kind && a.kind !== "study") return;
      if (a.bookId !== bookId) return;
      if (roundId && a.roundId && a.roundId !== roundId) return;
      if (a.status !== "planned" && a.status !== "in_progress") return;
      /* [PATCH:f4b3a-past] exclude past-dated planned — they are missed, not live */
      if (a.status === "planned" && a.plannedDate) {
        var _LIBp = window.InternshipLib;
        var _tNow = (_LIBp && _LIBp.date && _LIBp.date.todayJalaliString) ? _LIBp.date.todayJalaliString() : "";
        if (_tNow && _LIBp.date && _LIBp.date.compareJalaliDate && _LIBp.date.compareJalaliDate(a.plannedDate, _tNow) < 0) return;
      }
      if (typeof a.plannedPageStart !== "number" || typeof a.plannedPageEnd !== "number") return;
      if (a.plannedPageEnd < a.plannedPageStart) return;
      ranges.push({ start: a.plannedPageStart, end: a.plannedPageEnd });
    });
    return PS._mergeRanges(ranges);
  };

  /* ─── Complement ranges within target ─── */
  PS.complementRanges = function (target, readRanges) {
    if (!target) return [];
    var remaining = [];
    var cursor = target.start;
    (readRanges || []).forEach(function (r) {
      if (r.end < cursor) return;
      if (r.start > target.end) return;
      var s = Math.max(r.start, target.start);
      var e = Math.min(r.end, target.end);
      if (s > cursor) remaining.push({ start: cursor, end: s - 1 });
      cursor = Math.max(cursor, e + 1);
    });
    if (cursor <= target.end) remaining.push({ start: cursor, end: target.end });
    return remaining.filter(function (r) { return r.end >= r.start; });
  };

  /* ─── Session size resolution ─── */
  PS.computeSessionSize = function (plannerInput, demand, options) {
    options = options || {};
    var minS = options.minSessionMinutes || DEFAULT_SESSION_MIN;
    var maxS = options.maxSessionMinutes || DEFAULT_SESSION_MAX;
    var defS = options.defaultSessionMinutes || DEFAULT_SESSION_DEF;

    // Respect hard duration constraints targeting this demand/book/round
    var cs = (plannerInput && plannerInput.constraints) || [];
    cs.forEach(function (c) {
      if (!c || !c.active) return;
      if (c.type !== "duration") return;
      if (c.strength !== "hard") return;
      if (c.operator !== "lte" && c.operator !== "eq") return;
      var v = parseInt(c.value, 10);
      if (isNaN(v) || v <= 0) return;
      if (c.targetType === "book" && c.targetId && c.targetId !== demand.bookId) return;
      if (c.targetType === "round" && c.targetId && c.targetId !== demand.roundId) return;
      if (v < maxS) maxS = v;
    });

    if (defS > maxS) defS = maxS;
    if (defS < minS) defS = minS;
    return defS;
  };

  /* ─── Time window resolution for a date ─── */
  /* [PATCH:phase-28.4b] HARD forbidden ranges from projection dayOccupancy */
  function _hardForbiddenRanges(plannerInput, date) {
    var out = [];
    if (!plannerInput || !plannerInput.dayOccupancy) return out;
    var CF = R.schedulingConflict;
    if (!CF || typeof CF.getPolicy !== "function") return out;
    var probe = { id: "__planner_probe__", category: "study", role: "block" };
    var LIB = window.InternshipLib;
    var prevDate = null;
    if (LIB && LIB.date && LIB.date.parseJalali && LIB.date.addJalaliDays && LIB.date.dateKey) {
      try {
        var p = LIB.date.parseJalali(date);
        if (p) {
          var d = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, -1);
          prevDate = LIB.date.dateKey(d.jy, d.jm, d.jd);
        }
      } catch (e) { prevDate = null; }
    }
    plannerInput.dayOccupancy.forEach(function (it) {
      if (!it) return;
      if (!it.startTime || !it.endTime) return;
      var sameDate = (it.date === date);
      var fromPrev = (prevDate && it.date === prevDate);
      if (!sameDate && !fromPrev) return;
      var probeItem = { id: it.sourceId || it.id || "", category: it.category || "", role: it.role || "block" };
      var policy;
      try { policy = CF.getPolicy(probe, probeItem, {}); }
      catch (e) { policy = "ALLOWED"; }
      if (policy !== "HARD") return;
      var sMin = _timeToMin(it.startTime);
      var eMin = _timeToMin(it.endTime);
      if (sMin == null || eMin == null) return;
      if (sameDate) {
        if (eMin > sMin) out.push({ start: sMin, end: eMin });
        else out.push({ start: sMin, end: 1440 });
      } else if (fromPrev) {
        if (eMin <= sMin) out.push({ start: 0, end: eMin });
      }
    });
    return out;
  }

  /* [PATCH:phase-28.4b] WARNING overlap detection for visibility */
  function _warningOverlapRanges(plannerInput, date, startMin, endMin) {
    var out = [];
    if (!plannerInput || !plannerInput.dayOccupancy) return out;
    var CF = R.schedulingConflict;
    if (!CF || typeof CF.getPolicy !== "function") return out;
    var probe = { id: "__planner_probe__", category: "study", role: "block" };
    plannerInput.dayOccupancy.forEach(function (it) {
      if (!it) return;
      if (it.date !== date) return;
      if (!it.startTime || !it.endTime) return;
      var probeItem = { id: it.sourceId || it.id || "", category: it.category || "", role: it.role || "block" };
      var policy;
      try { policy = CF.getPolicy(probe, probeItem, {}); }
      catch (e) { return; }
      if (policy !== "WARNING") return;
      var sMin = _timeToMin(it.startTime);
      var eMin = _timeToMin(it.endTime);
      if (sMin == null || eMin == null) return;
      if (eMin <= sMin) eMin += 1440;
      if (startMin < eMin && endMin > sMin) {
        out.push({ itemId: it.sourceId || it.id || "", title: it.title || "", start: sMin, end: eMin });
      }
    });
    return out;
  }

  PS.getTimeWindow = function (plannerInput, date) {
    var cs = (plannerInput && plannerInput.constraints) || [];
    var allowedStart = null, allowedEnd = null;
    var forbidden = [];
    var hasTimeConstraint = false;
    cs.forEach(function (c) {
      if (!c || !c.active) return;
      if (c.type !== "time") return;
      if (c.targetType === "date" && c.targetId && c.targetId !== date) return;
      var v = c.value;
      if (!v || typeof v !== "object") return;
      if (typeof v.allowedStart === "string" && typeof v.allowedEnd === "string") {
        if (allowedStart == null || v.allowedStart > allowedStart) allowedStart = v.allowedStart;
        if (allowedEnd == null || v.allowedEnd < allowedEnd) allowedEnd = v.allowedEnd;
        hasTimeConstraint = true;
      }
      if (typeof v.forbiddenStart === "string" && typeof v.forbiddenEnd === "string") {
        forbidden.push({ start: v.forbiddenStart, end: v.forbiddenEnd });
        hasTimeConstraint = true;
      }
    });
    if (!hasTimeConstraint) return null;
    var hardRanges = _hardForbiddenRanges(plannerInput, date);
    hardRanges.forEach(function (r) {
      forbidden.push({ start: _minToTime(r.start), end: _minToTime(r.end) });
    });
    return { allowedStart: allowedStart, allowedEnd: allowedEnd, forbidden: forbidden };
  };

  function _timeToMin(t) {
    if (!t || typeof t !== "string") return null;
    var p = t.split(":");
    if (p.length !== 2) return null;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }
  function _minToTime(m) {
    m = Math.max(0, Math.min(1440, m | 0));
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  /* ─── Placement within time window ─── */
  PS.placeWithinWindow = function (window, cursorMin, durationMinutes) {
    if (!window) return { start: null, end: null, nextCursor: cursorMin + durationMinutes };
    var allowedStart = window.allowedStart ? _timeToMin(window.allowedStart) : 0;
    var allowedEnd = window.allowedEnd ? _timeToMin(window.allowedEnd) : 1440;
    var cur = Math.max(cursorMin, allowedStart);
    // Skip forbidden windows
    var safety = 0;
    while (safety < 50) {
      safety++;
      var moved = false;
      for (var i = 0; i < window.forbidden.length; i++) {
        var f = window.forbidden[i];
        var fs = _timeToMin(f.start), fe = _timeToMin(f.end);
        if (fs == null || fe == null) continue;
        if (fe <= fs) fe += 1440; // overnight
        if (cur < fe && cur + durationMinutes > fs) {
          cur = fe;
          moved = true;
        }
      }
      if (!moved) break;
    }
    if (cur + durationMinutes > allowedEnd) {
      return { start: null, end: null, nextCursor: cursorMin, failed: true };
    }
    return { start: cur, end: cur + durationMinutes, nextCursor: cur + durationMinutes };
  };

  /* ─── Main: allocation → activities ─── */
  /* [PATCH:session-merge-postpass] merge tiny sessions on same day/book */
  function _mergeTinySessions(acts, minPages) {
    if (!acts || acts.length < 2) return acts;
    var out = [acts[0]];
    for (var i = 1; i < acts.length; i++) {
      var cur = acts[i];
      var prev = out[out.length - 1];
      var sameGroup = prev.plannedDate === cur.plannedDate &&
                      prev.bookId === cur.bookId &&
                      prev.roundId === cur.roundId;
      var contiguous = (prev.plannedPageEnd + 1) === cur.plannedPageStart;
      var tiny = (prev.plannedPages < minPages) || (cur.plannedPages < minPages);
      if (sameGroup && contiguous && tiny) {
        prev.plannedPages += cur.plannedPages;
        prev.plannedPageEnd = cur.plannedPageStart + cur.plannedPages - 1;
        prev.plannedDurationMinutes += cur.plannedDurationMinutes;
      } else {
        out.push(cur);
      }
    }
    return out;
  }

  PS.allocationToActivities = function (allocation, demand, plannerInput, proposalId, options) {
    options = options || {};
    if (!allocation || !demand) return [];
    if (demand.kind && demand.kind !== "study") return []; // study only in initial planner

    var target = PS.computeTargetRange(demand);
    if (!target) return [];

    var readInfo = PS.getAlreadyReadRanges(plannerInput.activities || [], demand.bookId, demand.roundId);
    var _allocatedInfo = PS.getAllocatedRanges(plannerInput.activities || [], demand.bookId, demand.roundId);
    
    /* [PATCH:f4b8-sched-base] inject baseline ranges */
    var _baselineRanges = [];
    var _enr = (plannerInput.enrollments || []).find(function(e) { return e && e.bookId === demand.bookId && (!demand.roundId || e.roundId === demand.roundId); });
    var _bk = (plannerInput.books || []).find(function(b) { return b && b.id === demand.bookId; });
    if (_enr && _bk && R.baseline && R.baseline.resolveForEnrollment) {
      try {
        var _eb = R.baseline.resolveForEnrollment(_enr, _bk, plannerInput.enrollments, plannerInput.rounds);
        if (_eb && Array.isArray(_eb.ranges)) _baselineRanges = _eb.ranges;
      } catch (e) {}
    }
    
    var _combinedExcluded = PS._mergeRanges((readInfo.ranges || []).concat(_allocatedInfo || []).concat(_baselineRanges));
    var remainingRanges = PS.complementRanges(target, _combinedExcluded);
    if (remainingRanges.length === 0) return [];

    var sessionSize = (options && typeof options.sessionMinutes === "number" && options.sessionMinutes > 0)
      ? options.sessionMinutes
      : PS.computeSessionSize(plannerInput, demand, options);
    var pagesPerHour = demand.pagesPerHour || 20;

    var activities = [];
    var minutesLeft = allocation.allocatedMinutes | 0;
    var pagesLeft = allocation.allocatedPages | 0;
    // [PATCH:v6.4-page-cursor] per-demand cursor preservation across allocations
    var sharedCursor = options._demandCursor || null;
    var rangeIdx = 0;
    var cursor;
    if (sharedCursor && sharedCursor.rangeIdx < remainingRanges.length) {
      rangeIdx = sharedCursor.rangeIdx;
      cursor = sharedCursor.cursor;
      // verify cursor still inside range
      if (cursor > remainingRanges[rangeIdx].end) {
        rangeIdx++;
        if (rangeIdx < remainingRanges.length) cursor = remainingRanges[rangeIdx].start;
      }
    } else {
      cursor = remainingRanges[0].start;
    }
    var window = PS.getTimeWindow(plannerInput, allocation.date);
    var dayCursor = (options._dayCursor || 0); // tracked by caller

    var safety = 0;
    var subIdx = 0;

    while (minutesLeft > 0 && pagesLeft > 0 && rangeIdx < remainingRanges.length && safety < 100) {
      safety++;
      var range = remainingRanges[rangeIdx];
      var availInRange = range.end - cursor + 1;
      if (availInRange <= 0) { rangeIdx++; if (rangeIdx < remainingRanges.length) cursor = remainingRanges[rangeIdx].start; continue; }

      var sessionMin = Math.min(minutesLeft, sessionSize);
      var sessionPages = PA.pagesForMinutes(sessionMin, pagesPerHour);
      if (sessionPages < 1) break;
      var take = Math.min(sessionPages, availInRange, pagesLeft);
      if (take < 1) break;
      var activityMin = PA.minutesForPages(take, pagesPerHour);
      if (activityMin > minutesLeft) {
        take--;
        if (take < 1) break;
        activityMin = PA.minutesForPages(take, pagesPerHour);
      }

      // Place within time window (if exists)
      var placement = null;
      if (window) {
        placement = PS.placeWithinWindow(window, dayCursor, activityMin);
        if (placement.failed) {
          // can't place — emit remaining as sessionization_deficit at caller
          break;
        }
        dayCursor = placement.nextCursor;
      }

      activities.push({
        kind: "study",
        planId: demand.planId || plannerInput.planId,
        roundId: demand.roundId,
        bookId: demand.bookId,
        subjectId: demand.subjectId || null,
        taskId: null,
        sourceType: "planner",
        sourceId: proposalId,
        plannedDate: allocation.date,
        plannedStartTime: placement ? _minToTime(placement.start) : null,
        plannedDurationMinutes: activityMin,
        plannedPages: take,
        plannedPageStart: cursor,
        plannedPageEnd: cursor + take - 1,
        actualPages: 0,
        actualDurationMinutes: 0,
        actualPageRanges: [],
        status: "planned",
        locked: false,
        notes: ""
      });

      // [PATCH:phase-28.4b] attach WARNING overlaps for visibility
      if (placement) {
        try {
          var _warns = _warningOverlapRanges(plannerInput, allocation.date, placement.start, placement.end);
          if (_warns.length > 0) {
            activities._warnings = activities._warnings || [];
            _warns.forEach(function (w) {
              activities._warnings.push({
                type: "placement_warning",
                severity: "warning",
                date: allocation.date,
                demandId: demand.id,
                startTime: _minToTime(placement.start),
                endTime: _minToTime(placement.end),
                conflictWith: w.title || w.itemId || "",
                overlapStart: _minToTime(w.start),
                overlapEnd: _minToTime(w.end)
              });
            });
          }
        } catch (e) { /* swallow */ }
      }
      cursor += take;
      if (cursor > range.end) {
        rangeIdx++;
        if (rangeIdx < remainingRanges.length) cursor = remainingRanges[rangeIdx].start;
      }
      minutesLeft -= activityMin;
      pagesLeft -= take;
      subIdx++;
    }

    // [PATCH:session-merge-local] merge < 5 page sessions per demand/day
    if (activities.length >= 2) {
      var _m = [activities[0]];
      for (var _mi = 1; _mi < activities.length; _mi++) {
        var _cur = activities[_mi];
        var _pv = _m[_m.length - 1];
        var _contig = (_pv.plannedPageEnd + 1) === _cur.plannedPageStart;
        if (_cur.plannedPages < 5 && _contig) {
          _pv.plannedPages += _cur.plannedPages;
          _pv.plannedPageEnd = _cur.plannedPageStart + _cur.plannedPages - 1;
          _pv.plannedDurationMinutes += _cur.plannedDurationMinutes;
        } else {
          _m.push(_cur);
        }
      }
      activities = _m;
    }
    // [PATCH:v6.4-page-cursor] return updated cursor to caller
    activities._endCursor = { rangeIdx: rangeIdx, cursor: cursor };
    return activities;
  };

  /* ─── Main generator ─── */
  /* [PATCH:f8-date-sort] chronological comparator (Jalali-aware) */
  function _cmpDate(a, b) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.date && LIB.date.compareJalaliDate) return LIB.date.compareJalaliDate(a, b);
    return a < b ? -1 : a > b ? 1 : 0;
  }

  PS.generateSchedule = function (plannerInput, constrainedResult, proposalId, options) {
    options = options || {};
    var activities = [];
    var deficits = [];

    if (!plannerInput || !constrainedResult) return { activities: [], deficits: deficits };

    var demandMap = {};
    (plannerInput.demands || []).forEach(function (d) { demandMap[d.id] = d; });

    // [PATCH:v6.4-page-cursor] global demand cursors — persist across dates
    var demandCursors = {};

    var byDate = {};
    (constrainedResult.allocations || []).forEach(function (a) {
      if (!a) return;
      if (!byDate[a.date]) byDate[a.date] = [];
      byDate[a.date].push(a);
    });

    Object.keys(byDate).sort(_cmpDate).forEach(function (date) { /* [PATCH:f8-date-sort] */
      var dayCursor = 0;
      var dayAllocs = byDate[date];
      dayAllocs.forEach(function (a) {
        var demand = demandMap[a.demandId];
        if (!demand) return;
        var _innerOpts = {
          _dayCursor: dayCursor,
          _demandCursor: demandCursors[a.demandId] || null
        };
        if (options && typeof options.sessionMinutes === "number" && options.sessionMinutes > 0) {
          _innerOpts.sessionMinutes = options.sessionMinutes;
        }
        var generated = PS.allocationToActivities(a, demand, plannerInput, proposalId, _innerOpts);
        // Save updated cursor for this demand
        if (generated._endCursor) {
          demandCursors[a.demandId] = generated._endCursor;
        }
        // Recompute day cursor from generated activities
        generated.forEach(function (act) {
          if (act.plannedStartTime) {
            var parts = act.plannedStartTime.split(":");
            dayCursor = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10) + (act.plannedDurationMinutes | 0);
          } else {
            dayCursor += (act.plannedDurationMinutes | 0);
          }
          activities.push(act);
        });

        // [PATCH:phase-28.4b] surface placement warnings
        if (generated._warnings) {
          generated._warnings.forEach(function (w) { deficits.push(w); });
        }
        // Detect under-scheduling
        var genPages = generated.reduce(function (s, act) { return s + (act.plannedPages | 0); }, 0);
        var genMin = generated.reduce(function (s, act) { return s + (act.plannedDurationMinutes | 0); }, 0);
        var _unmetP = Math.max(0, (a.allocatedPages || 0) - genPages);
        var _unmetM = Math.max(0, (a.allocatedMinutes || 0) - genMin);
        // [PATCH:suppress-spurious] only report if unmet is meaningful
        if (_unmetP > 0 && _unmetM > 5) {
          deficits.push({
            type: "sessionization_deficit",
            demandId: a.demandId,
            date: date,
            allocatedPages: a.allocatedPages,
            scheduledPages: genPages,
            unmetPages: _unmetP,
            unmetMinutes: _unmetM,
            severity: "warning"
          });
        }
      });
    });

    activities = _mergeTinySessions(activities, 5);

    return { activities: activities, deficits: deficits };
  };

  /* ═══ TESTS (Phase 28.4b) ═══ */
  PS.__tests = function () {
    var results = [];
    function t(name, cond, info) {
      results.push({ name: name, pass: !!cond, info: info });
      console.log((cond ? "✅" : "❌") + " " + name);
    }
    function mkInput(opts) {
      return { constraints: opts.constraints || [], dayOccupancy: opts.dayOccupancy || [] };
    }
    function mkTimeConstraint(start, end, date) {
      return { active: true, type: "time", strength: "hard",
               targetType: "date", targetId: date,
               value: { allowedStart: start, allowedEnd: end } };
    }
    var D1 = "1405/7/15";
    var D0 = "1405/7/14";

    // T1: sleep cross-midnight from previous day → block [0, 06:00] on D1
    var sleepPrev = { date: D0, startTime: "22:00", endTime: "06:00", category: "sleep", role: "block", sourceType: "task", sourceId: "s1", title: "Sleep" };
    var inT1 = mkInput({ constraints: [mkTimeConstraint("04:00", "23:00", D1)], dayOccupancy: [sleepPrev] });
    var wT1 = PS.getTimeWindow(inT1, D1);
    var pT1 = PS.placeWithinWindow(wT1, 0, 60);
    t("T1 sleep cross-midnight → placement at 06:00", pT1 && pT1.start === 360, pT1);

    // T2: food 12:00-13:00 in middle → push to 13:00
    var food = { date: D1, startTime: "12:00", endTime: "13:00", category: "food", role: "block", sourceType: "task", sourceId: "f1", title: "Food" };
    var inT2 = mkInput({ constraints: [mkTimeConstraint("11:00", "15:00", D1)], dayOccupancy: [food] });
    var wT2 = PS.getTimeWindow(inT2, D1);
    var pT2 = PS.placeWithinWindow(wT2, 11 * 60, 90);
    t("T2 food middle → skip to 13:00-14:30", pT2 && pT2.start === 780 && pT2.end === 870, pT2);

    // T3: multiple HARD ranges → find valid slot
    var a1 = { date: D1, startTime: "11:00", endTime: "12:00", category: "food", role: "block", sourceType: "task", sourceId: "a1" };
    var a2 = { date: D1, startTime: "13:00", endTime: "14:00", category: "food", role: "block", sourceType: "task", sourceId: "a2" };
    var inT3 = mkInput({ constraints: [mkTimeConstraint("10:00", "16:00", D1)], dayOccupancy: [a1, a2] });
    var wT3 = PS.getTimeWindow(inT3, D1);
    var pT3a = PS.placeWithinWindow(wT3, 10 * 60, 30);
    t("T3a before first forbidden → 10:00-10:30", pT3a && pT3a.start === 600 && pT3a.end === 630, pT3a);
    var pT3b = PS.placeWithinWindow(wT3, 630, 60);
    t("T3b skip past first forbidden → 12:00", pT3b && pT3b.start === 720, pT3b);

    // T4: no valid slot → failed
    var inT4 = mkInput({ constraints: [mkTimeConstraint("11:00", "12:00", D1)], dayOccupancy: [food] });
    var wT4 = PS.getTimeWindow(inT4, D1);
    var pT4 = PS.placeWithinWindow(wT4, 11 * 60, 120);
    t("T4 no valid slot → failed", pT4 && pT4.failed === true, pT4);

    // T5: shift WARNING not blocked
    var shift = { date: D1, startTime: "12:00", endTime: "14:00", category: "shift", role: "anchor", sourceType: "shift", sourceId: "sh1", title: "Shift" };
    var inT5 = mkInput({ constraints: [mkTimeConstraint("11:00", "15:00", D1)], dayOccupancy: [shift] });
    var wT5 = PS.getTimeWindow(inT5, D1);
    var pT5 = PS.placeWithinWindow(wT5, 11 * 60, 60);
    t("T5 shift WARNING → not blocked", wT5 && wT5.forbidden.length === 0 && pT5 && pT5.start === 660, { w: wT5, p: pT5 });

    // T6: untimed item not forbidden
    var untimed = { date: D1, startTime: null, endTime: null, category: "food", role: "flexible", sourceType: "task", sourceId: "u1" };
    var inT6 = mkInput({ constraints: [mkTimeConstraint("10:00", "12:00", D1)], dayOccupancy: [untimed] });
    var wT6 = PS.getTimeWindow(inT6, D1);
    var pT6 = PS.placeWithinWindow(wT6, 10 * 60, 30);
    t("T6 untimed item → no forbidden", pT6 && pT6.start === 600, pT6);

    // T7: no time constraint → null (preserve prior behavior)
    var inT7 = mkInput({ constraints: [], dayOccupancy: [food] });
    var wT7 = PS.getTimeWindow(inT7, D1);
    t("T7 no constraint → getTimeWindow returns null", wT7 === null);

    // T8: no HARD occupancy → placement at allowedStart
    var inT8 = mkInput({ constraints: [mkTimeConstraint("10:00", "15:00", D1)], dayOccupancy: [] });
    var wT8 = PS.getTimeWindow(inT8, D1);
    var pT8 = PS.placeWithinWindow(wT8, 10 * 60, 60);
    t("T8 no occupancy → 10:00-11:00", pT8 && pT8.start === 600 && pT8.end === 660, pT8);

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };
  console.log("[planner.schedule.v6.4] loaded");
})();