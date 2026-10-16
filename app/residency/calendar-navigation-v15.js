(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[calendar.nav.v15] R missing"); return; }
  var NAV = R.calendarNavigation = R.calendarNavigation || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _parse(d) { return DATE ? DATE.parseJalali(d) : null; }
  function _key(p) { return p ? DATE.dateKey(p.jy, p.jm, p.jd) : null; }
  function _addDays(d, n) {
    var p = _parse(d);
    if (!p) return d;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return _key(r);
  }
  function _addMonths(d, n) {
    var p = _parse(d);
    if (!p) return d;
    var r = DATE.addJalaliMonthsToDate(p.jy, p.jm, p.jd, n);
    return _key(r);
  }
  function _weekdayIdx(d) {
    // Shamsi: Sat=0 ... Fri=6
    var p = _parse(d);
    if (!p) return 0;
    var g = DATE.jalaliToGregorian(p.jy, p.jm, p.jd);
    var dd = new Date(g[0], g[1] - 1, g[2]);
    return (dd.getDay() + 1) % 7;
  }

  NAV.startOfWeek = function (d) {
    var idx = _weekdayIdx(d);
    return _addDays(d, -idx);
  };
  NAV.endOfWeek = function (d) {
    return _addDays(NAV.startOfWeek(d), 6);
  };
  NAV.startOfMonth = function (d) {
    var p = _parse(d);
    if (!p) return d;
    return _key({ jy: p.jy, jm: p.jm, jd: 1 });
  };
  NAV.endOfMonth = function (d) {
    var p = _parse(d);
    if (!p) return d;
    var len = DATE.jalaliMonthLength(p.jy, p.jm);
    return _key({ jy: p.jy, jm: p.jm, jd: len });
  };

  NAV.previousWeek = function (fromDate) {
    return { start: _addDays(NAV.startOfWeek(fromDate), -7), end: _addDays(NAV.endOfWeek(fromDate), -7) };
  };
  NAV.nextWeek = function (fromDate) {
    return { start: _addDays(NAV.startOfWeek(fromDate), 7), end: _addDays(NAV.endOfWeek(fromDate), 7) };
  };
  NAV.previousMonth = function (fromDate) {
    var s = _addMonths(NAV.startOfMonth(fromDate), -1);
    return { start: s, end: NAV.endOfMonth(s) };
  };
  NAV.nextMonth = function (fromDate) {
    var s = _addMonths(NAV.startOfMonth(fromDate), 1);
    return { start: s, end: NAV.endOfMonth(s) };
  };

  NAV.labelWeek = function (fromDate) {
    var s = NAV.startOfWeek(fromDate);
    var e = NAV.endOfWeek(fromDate);
    return s + " – " + e;
  };
  NAV.labelMonth = function (fromDate) {
    var p = _parse(fromDate);
    if (!p) return fromDate;
    return DATE.prettyDate(p.jy, p.jm, 1).split(" ").slice(1).join(" ") + " " + p.jy;
  };

  NAV.TIME_GRID_MINUTES = 15;
  NAV.SNAP_TOLERANCE = 7;

  NAV.snapToGrid = function (timeStr) {
    if (!timeStr) return null;
    var LIB2 = window.InternshipLib;
    var min = LIB2 && LIB2.time && LIB2.time.timeToMinutes ? LIB2.time.timeToMinutes(timeStr) : null;
    if (min == null) return null;
    var g = NAV.TIME_GRID_MINUTES;
    var snapped = Math.round(min / g) * g;
    if (snapped < 0) snapped = 0;
    if (snapped >= 24 * 60) snapped = 24 * 60 - g;
    var h = Math.floor(snapped / 60);
    var m = snapped % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  };

  NAV.minutesToTime = function (min) {
    min = Math.max(0, Math.min(24 * 60, min | 0));
    var h = Math.floor(min / 60);
    var m = min % 60;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  };
  NAV.timeToMinutes = function (t) {
    var LIB2 = window.InternshipLib;
    return (LIB2 && LIB2.time && LIB2.time.timeToMinutes) ? LIB2.time.timeToMinutes(t) : null;
  };

  NAV.detectOverlap = function (a, b) {
    var aS = NAV.timeToMinutes(a.plannedStartTime);
    var bS = NAV.timeToMinutes(b.plannedStartTime);
    if (aS == null || bS == null) return false;
    if (a.plannedDate !== b.plannedDate) return false;
    var aE = aS + (a.plannedDurationMinutes | 0);
    var bE = bS + (b.plannedDurationMinutes | 0);
    return aS < bE && bS < aE;
  };

  NAV.findOverlaps = function (activity, activities) {
    return (activities || []).filter(function (x) {
      if (!x || x.id === activity.id) return false;
      if (x.status === "cancelled" || x.status === "skipped") return false;
      return NAV.detectOverlap(activity, x);
    });
  };

  console.log("[calendar.nav.v15] loaded");
})();