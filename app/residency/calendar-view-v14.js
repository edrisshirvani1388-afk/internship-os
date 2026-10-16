(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[calendar.view.v14] R missing"); return; }
  var CV = R.calendarView = R.calendarView || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _addDays(d, n) {
    if (!DATE || !d) return d;
    var p = DATE.parseJalali(d);
    if (!p) return d;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }
  function _int(v, d) { if (v == null) return d || 0; var n = parseInt(v, 10); return isNaN(n) ? (d||0) : n; }

  CV.THRESHOLDS = {
    nearLimitPercent: 80,
    overloadPercent: 100,
    veryOverloadPercent: 120
  };

  CV.computeStatus = function (utilizationPct) {
    if (utilizationPct >= CV.THRESHOLDS.veryOverloadPercent) return "blocked";
    if (utilizationPct >= CV.THRESHOLDS.overloadPercent) return "overloaded";
    if (utilizationPct >= CV.THRESHOLDS.nearLimitPercent) return "near_limit";
    return "available";
  };

  function _getCalendarCtx(date, planId) {
    if (!R.plannerSnapshot || !planId) return null;
    try {
      var snap = R.plannerSnapshot.build(planId, "plan");
      if (!snap || !Array.isArray(snap.calendar)) return null;
      return snap.calendar.find(function (c) { return c && c.date === date; }) || null;
    } catch (e) { return null; }
  }

  CV.buildDayVM = function (date, activities, planId) {
    var ctx = _getCalendarCtx(date, planId);
    var capacityMin = ctx ? _int(ctx.finalCapacityMinutes, 0) : 0;
    var dayType = ctx ? (ctx.dayType || "normal") : "normal";

    var dayActivities = (activities || []).filter(function (a) {
      return a && a.plannedDate === date && a.status !== "cancelled";
    });

    var studyMin = 0, reviewMin = 0, assessmentMin = 0;
    dayActivities.forEach(function (a) {
      if (a.status === "completed" || a.status === "cancelled") return;
      var m = _int(a.plannedDurationMinutes, 0);
      if (a.kind === "study") studyMin += m;
      else if (a.kind === "review") reviewMin += m;
      else if (a.kind === "assessment") assessmentMin += m;
    });
    var committedMin = studyMin + reviewMin + assessmentMin;
    var remaining = Math.max(0, capacityMin - committedMin);
    var utilizationPct = capacityMin > 0 ? Math.round(committedMin / capacityMin * 100) : 0;

    return {
      date: date,
      dayType: dayType,
      capacityMinutes: capacityMin,
      committedMinutes: committedMin,
      allocatedMinutes: committedMin,
      usedMinutes: committedMin,
      remainingCapacity: remaining,
      studyMinutes: studyMin,
      reviewMinutes: reviewMin,
      assessmentMinutes: assessmentMin,
      activityCount: dayActivities.length,
      overloaded: utilizationPct >= CV.THRESHOLDS.overloadPercent,
      utilizationPercent: utilizationPct,
      status: CV.computeStatus(utilizationPct),
      activities: dayActivities
    };
  };

  CV.buildRangeVM = function (startDate, endDate, activities, planId) {
    if (!DATE || !startDate || !endDate) return [];
    var out = [];
    var cur = startDate;
    var safety = 0;
    while (_cmp(cur, endDate) <= 0 && safety < 500) {
      safety++;
      out.push(CV.buildDayVM(cur, activities, planId));
      cur = _addDays(cur, 1);
      if (!cur) break;
    }
    return out;
  };

  CV.todayRange = function (days) {
    days = days || 7;
    var t = _today();
    return { start: t, end: _addDays(t, days - 1) };
  };

  console.log("[calendar.view.v14] loaded");
})();