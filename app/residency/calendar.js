/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Calendar & Capacity  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.calendar] R missing"); return; }

  var CAL = R.calendar = R.calendar || {};
  var LIB = window.InternshipLib;
  if (!LIB) { console.warn("[residency.calendar] lib missing"); return; }
  var DATE = LIB.date;
  var TIME = LIB.time;

  function _getState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }

  /* ─── Shift utilities ─── */
  CAL.normalizeShift = function (sh) {
    if (!sh || !sh.date) return null;
    var startTime = TIME.normalizeTime(sh.startTime);
    var endTime   = TIME.normalizeTime(sh.endTime);
    var sm = TIME.timeToMinutes(startTime);
    var em = TIME.timeToMinutes(endTime);
    if (sm == null || em == null) return null;
    var p = DATE.parseJalali(sh.date);
    if (!p) return null;
    var dayNum = DATE.jalaliToDayNumber(p.jy, p.jm, p.jd);
    if (em <= sm) em += 1440;
    var startAbs = dayNum * 1440 + sm;
    var endAbs   = dayNum * 1440 + em;
    return {
      shiftId: sh.id,
      date: sh.date,
      startTime: startTime,
      endTime: endTime,
      startAbsolute: startAbs,
      endAbsolute: endAbs,
      durationMinutes: endAbs - startAbs,
      rotationId: sh.rotationId || null,
      raw: sh
    };
  };

  CAL.getShiftsOnDate = function (date, state) {
    var shifts = (state && state.shifts) || [];
    return shifts.filter(function (sh) { return sh && sh.date === date; });
  };

  CAL.getShiftsAroundDate = function (date, state, deltaDays) {
    var p = DATE.parseJalali(date);
    if (!p) return [];
    var results = [];
    for (var d = -deltaDays; d <= deltaDays; d++) {
      var nd = DATE.addJalaliDays(p.jy, p.jm, p.jd, d);
      var dk = DATE.dateKey(nd.jy, nd.jm, nd.jd);
      results = results.concat(CAL.getShiftsOnDate(dk, state));
    }
    return results;
  };

  CAL.detectShiftOverlaps = function (shifts) {
    var intervals = (shifts || []).map(CAL.normalizeShift).filter(Boolean);
    var overlaps = [];
    for (var i = 0; i < intervals.length; i++) {
      for (var j = i + 1; j < intervals.length; j++) {
        var a = intervals[i], b = intervals[j];
        if (a.startAbsolute < b.endAbsolute && b.startAbsolute < a.endAbsolute) {
          overlaps.push({
            type: "shift_overlap",
            shiftIds: [a.shiftId, b.shiftId],
            overlapMinutes: Math.min(a.endAbsolute, b.endAbsolute) - Math.max(a.startAbsolute, b.startAbsolute),
            severity: "warning"
          });
        }
      }
    }
    return overlaps;
  };

  /* ─── Rotation ─── */
  CAL.getActiveRotations = function (date, state) {
    var rotations = (state && state.rotations) || [];
    return rotations.filter(function (r) {
      return r && r.startDate && r.endDate &&
        DATE.compareJalaliDate(r.startDate, date) <= 0 &&
        DATE.compareJalaliDate(date, r.endDate) <= 0;
    });
  };

  /* ─── Weekday ─── */
  function _weekdayIdx(date) {
    var p = DATE.parseJalali(date);
    if (!p) return -1;
    var g = DATE.jalaliToGregorian(p.jy, p.jm, p.jd);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return (d.getDay() + 1) % 7;
  }

  CAL.getWeekdayKey = function (date) {
    var idx = _weekdayIdx(date);
    return idx < 0 ? null : R.WEEKDAY_KEYS[idx];
  };

  CAL.getWeekdayDayType = function (date, state) {
    var key = CAL.getWeekdayKey(date);
    if (!key) return "normal";
    var rules = (state && state.residency && state.residency.settings &&
                 state.residency.settings.weekdayDefaults) || R.DEFAULT_WEEKDAY_RULES;
    return rules[key] || "normal";
  };

  /* ─── Day type resolution ─── */
  CAL.resolveDayType = function (date, state) {
    var overrides = (state.residency && state.residency.dayOverrides) || [];
    for (var i = 0; i < overrides.length; i++) {
      if (overrides[i] && overrides[i].date === date && overrides[i].dayTypeOverride) {
        return overrides[i].dayTypeOverride;
      }
    }
    var todayShifts = CAL.getShiftsOnDate(date, state);
    if (todayShifts.length > 0) return "shift";

    var p = DATE.parseJalali(date);
    if (p) {
      var prev = DATE.addJalaliDays(p.jy, p.jm, p.jd, -1);
      var prevKey = DATE.dateKey(prev.jy, prev.jm, prev.jd);
      var prevShifts = CAL.getShiftsOnDate(prevKey, state);
      for (var k = 0; k < prevShifts.length; k++) {
        var sm = TIME.timeToMinutes(TIME.normalizeTime(prevShifts[k].startTime));
        var em = TIME.timeToMinutes(TIME.normalizeTime(prevShifts[k].endTime));
        if (sm != null && em != null && em <= sm) return "post_shift";
      }
      var next = DATE.addJalaliDays(p.jy, p.jm, p.jd, 1);
      var nextKey = DATE.dateKey(next.jy, next.jm, next.jd);
      var nextShifts = CAL.getShiftsOnDate(nextKey, state);
      if (nextShifts.length > 0) return "pre_shift";
    }
    return CAL.getWeekdayDayType(date, state);
  };

  /* ─── Capacity profile resolution ─── */
  function _safeDefaultProfile() {
    return {
      id: "default",
      scopeType: "global",
      rotationId: null,
      capacities: Object.assign({}, R.DEFAULT_CAPACITY),
      reservePercent: R.DEFAULT_RESERVE_PCT
    };
  }

  CAL.resolveCapacityProfile = function (activeRotations, state) {
    var profiles = (state.residency && state.residency.capacityProfiles) || [];
    if (activeRotations && activeRotations.length > 0) {
      var rotId = activeRotations[0].id;
      for (var i = 0; i < profiles.length; i++) {
        var p = profiles[i];
        if (p && p.scopeType === "rotation" && p.rotationId === rotId) return p;
      }
    }
    for (var j = 0; j < profiles.length; j++) {
      var g = profiles[j];
      if (g && g.scopeType === "global") return g;
    }
    return _safeDefaultProfile();
  };

  CAL.getRawCapacityForDayType = function (dayType, profile) {
    if (!profile || !profile.capacities) profile = _safeDefaultProfile();
    var key = R.DAY_TO_CAP[dayType] || "normal";
    var v = profile.capacities[key];
    return (typeof v === "number" && v >= 0) ? v : R.DEFAULT_CAPACITY[key];
  };

  /* ─── Phase 2: Time Availability ─── */
  function _computeTimeAvailability(date, finalCapacity, state) {
    var occupied = 0;
    var details = [];
    if (R.schedulingProjection && R.schedulingProjection.projectDate) {
      try {
        var items = R.schedulingProjection.projectDate(state, date);
        (items || []).forEach(function (it) {
          if (!it) return;
          if (it.role !== "anchor" && it.role !== "block") return;
          if (!it.startTime) return;
          if (!it.durationMinutes || it.durationMinutes <= 0) return;
          if (it.status === "cancelled" || it.status === "completed" || it.status === "skipped") return;
          occupied += it.durationMinutes;
          details.push({ id: it.id, minutes: it.durationMinutes });
        });
      } catch (e) {
        console.warn("[calendar] timeAvailability projection failed:", e);
      }
    } else {
      // Legacy fallback (projection not loaded)
      var shifts = CAL.getShiftsOnDate(date, state);
      (shifts || []).forEach(function (sh) {
        var norm = CAL.normalizeShift(sh);
        if (norm && norm.durationMinutes > 0) {
          occupied += norm.durationMinutes;
          details.push({ id: "shift:" + sh.id, minutes: norm.durationMinutes });
        }
      });
      var acts = (state.residency && state.residency.activities) || [];
      (acts || []).forEach(function (a) {
        if (!a || a.plannedDate !== date) return;
        if (a.status === "cancelled" || a.status === "completed" || a.status === "skipped") return;
        if (!a.plannedStartTime || !a.plannedDurationMinutes) return;
        occupied += a.plannedDurationMinutes;
        details.push({ id: "resActivity:" + a.id, minutes: a.plannedDurationMinutes });
      });
      var tasks = state.tasks || [];
      (tasks || []).forEach(function (t) {
        if (!t || t.date !== date) return;
        if (t.sourceType === "residency_activity") return;
        if (!t.time) return;
        if (!t.durationMinutes || t.durationMinutes <= 0) return;
        if (t.completed) return;
        occupied += t.durationMinutes;
        details.push({ id: "task:" + t.id, minutes: t.durationMinutes });
      });
    }
    var available = Math.max(0, finalCapacity - occupied);
    return { occupied: occupied, available: available, details: details };
  }

  /* ─── Main context ─── */
  CAL.getResidencyDayContext = function (date, planId) {
    var state = _getState();
    if (!state) return null;
    var p = DATE.parseJalali(date);
    if (!p) return null;

    var weekday = DATE.weekdayName(p.jy, p.jm, p.jd);
    var activeRotations = CAL.getActiveRotations(date, state);
    var shifts = CAL.getShiftsOnDate(date, state);
    var shiftIntervals = shifts.map(CAL.normalizeShift).filter(Boolean);
    var dayType = CAL.resolveDayType(date, state);

    var warnings = [];
    if (activeRotations.length > 1) {
      warnings.push({
        type: "multiple_active_rotations",
        rotationIds: activeRotations.map(function (r) { return r.id; })
      });
    }

    var shiftsAround = CAL.getShiftsAroundDate(date, state, 1);
    var overlaps = CAL.detectShiftOverlaps(shiftsAround);
    if (overlaps.length > 0) {
      warnings.push({ type: "shift_overlap", count: overlaps.length });
    }

    var shiftDurationMinutes = shiftIntervals.reduce(function (s, si) {
      return s + si.durationMinutes;
    }, 0);

    var profile = CAL.resolveCapacityProfile(activeRotations, state);
    var rawCapacity = CAL.getRawCapacityForDayType(dayType, profile);
    var reservePct = (typeof profile.reservePercent === "number")
      ? profile.reservePercent : R.DEFAULT_RESERVE_PCT;
    var reserveMinutes = Math.floor(rawCapacity * reservePct / 100);
    var availableCapacity = rawCapacity - reserveMinutes;

    var dayOverride = null;
    var overrides = (state.residency && state.residency.dayOverrides) || [];
    for (var oi = 0; oi < overrides.length; oi++) {
      if (overrides[oi] && overrides[oi].date === date) { dayOverride = overrides[oi]; break; }
    }

    var actualAvailability = (dayOverride && dayOverride.capacityMinutes != null)
      ? dayOverride.capacityMinutes : null;
    var finalCapacity = (actualAvailability != null) ? actualAvailability : availableCapacity;

    // Phase 2: Time Availability (separate from Productive Capacity)
    var timeCtx = _computeTimeAvailability(date, rawCapacity, state); // Phase 2.1: use rawCapacity, not finalCapacity
    var feasibleCapacity = Math.min(finalCapacity, timeCtx.available);

    return {
      date: date,
      weekday: weekday,
      dayType: dayType,
      activeRotationIds: activeRotations.map(function (r) { return r.id; }),
      activeRotations: activeRotations,
      shifts: shifts,
      shiftIntervals: shiftIntervals,
      shiftDurationMinutes: shiftDurationMinutes,
      hasShiftOverlap: overlaps.length > 0,
      overlaps: overlaps,
      rawCapacityMinutes: rawCapacity,
      reservePercent: reservePct,
      reserveMinutes: reserveMinutes,
      availableCapacityMinutes: availableCapacity,
      actualAvailabilityMinutes: actualAvailability,
      finalCapacityMinutes: finalCapacity,
      timeAvailabilityMinutes: timeCtx.available,
      timedOccupiedMinutes: timeCtx.occupied,
      feasibleCapacityMinutes: feasibleCapacity,
      dayOverride: dayOverride,
      profile: profile,
      planId: planId || null,
      warnings: warnings
    };
  };

  CAL.getResidencyCalendarContext = function (startDate, endDate, planId) {
    if (!DATE.parseJalali(startDate) || !DATE.parseJalali(endDate)) return [];
    var results = [];
    var cur = DATE.parseJalali(startDate);
    var maxIter = 2000;
    for (var i = 0; i < maxIter; i++) {
      var dk = DATE.dateKey(cur.jy, cur.jm, cur.jd);
      var ctx = CAL.getResidencyDayContext(dk, planId);
      if (ctx) results.push(ctx);
      if (DATE.compareJalaliDate(dk, endDate) >= 0) break;
      var next = DATE.addJalaliDays(cur.jy, cur.jm, cur.jd, 1);
      cur = next;
    }
    return results;
  };

  CAL.getCapacitySummary = function (startDate, endDate, planId) {
    var ctxs = CAL.getResidencyCalendarContext(startDate, endDate, planId);
    var totalRaw = 0, totalReserve = 0, totalAvail = 0;
    var byDayType = { normal: 0, free: 0, off: 0, pre_shift: 0, shift: 0, post_shift: 0 };
    var allWarnings = [];
    ctxs.forEach(function (ctx) {
      totalRaw += ctx.rawCapacityMinutes;
      totalReserve += ctx.reserveMinutes;
      totalAvail += ctx.availableCapacityMinutes;
      if (byDayType[ctx.dayType] != null) byDayType[ctx.dayType]++;
      ctx.warnings.forEach(function (w) {
        allWarnings.push(Object.assign({ date: ctx.date }, w));
      });
    });
    return {
      totalDays: ctxs.length,
      totalRawCapacityMinutes: totalRaw,
      totalReserveMinutes: totalReserve,
      totalAvailableCapacityMinutes: totalAvail,
      byDayType: byDayType,
      warnings: allWarnings
    };
  };

  CAL.getCapacityByRotation = function (startDate, endDate, planId) {
    var ctxs = CAL.getResidencyCalendarContext(startDate, endDate, planId);
    var map = {};
    var noRot = { id: null, title: "(بدون روتیشن)", totalDays: 0, totalRaw: 0, totalAvailable: 0 };
    var warnings = [];
    ctxs.forEach(function (ctx) {
      if (ctx.activeRotations.length === 0) {
        noRot.totalDays++;
        noRot.totalRaw += ctx.rawCapacityMinutes;
        noRot.totalAvailable += ctx.availableCapacityMinutes;
        return;
      }
      if (ctx.activeRotations.length > 1) {
        warnings.push({ type: "multiple_active_rotations", date: ctx.date });
      }
      var r = ctx.activeRotations[0];
      if (!map[r.id]) {
        map[r.id] = { id: r.id, title: r.title, totalDays: 0, totalRaw: 0, totalAvailable: 0 };
      }
      map[r.id].totalDays++;
      map[r.id].totalRaw += ctx.rawCapacityMinutes;
      map[r.id].totalAvailable += ctx.availableCapacityMinutes;
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    if (noRot.totalDays > 0) arr.push(noRot);
    return { rotations: arr, warnings: warnings };
  };

  console.log("[InternshipResidency.calendar] loaded");
})();