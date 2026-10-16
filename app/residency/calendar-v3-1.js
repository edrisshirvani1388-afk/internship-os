/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Calendar v3.1 (Rotation Schedule)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.calendar.v3.1] R missing"); return; }
  var CAL = R.calendar;
  if (!CAL) { console.warn("[residency.calendar.v3.1] calendar missing"); return; }

  var LIB = window.InternshipLib;
  var DATE = LIB.date;

  function _getState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }

  CAL.getRotationActivitySchedule = function (rotation) {
    if (!rotation || typeof rotation !== "object") {
      return R.createActivitySchedule(null);
    }
    if (rotation.activitySchedule && typeof rotation.activitySchedule === "object") {
      return R.createActivitySchedule(rotation.activitySchedule);
    }
    return R.createActivitySchedule(null);
  };

  CAL.resolveRotationActivityStatus = function (rotationId, date, state) {
    state = state || _getState();
    if (!state) return null;
    var rotation = (state.rotations || []).find(function (r) {
      return r && r.id === rotationId;
    });
    if (!rotation) return null;

    if (!rotation.startDate || !rotation.endDate) {
      return { rotationId: rotationId, date: date, status: "inactive", source: "date_range" };
    }
    if (DATE.compareJalaliDate(rotation.startDate, date) > 0 ||
        DATE.compareJalaliDate(date, rotation.endDate) > 0) {
      return { rotationId: rotationId, date: date, status: "inactive", source: "date_range" };
    }

    var dayOverrides = (state.residency && state.residency.dayOverrides) || [];
    for (var i = 0; i < dayOverrides.length; i++) {
      var o = dayOverrides[i];
      if (o && o.date === date && o.rotationId === rotationId && o.rotationStatus) {
        return {
          rotationId: rotationId, date: date,
          status: o.rotationStatus, source: "date_override"
        };
      }
    }

    var wk = CAL.getWeekdayKey(date);
    if (!wk) {
      return { rotationId: rotationId, date: date, status: "inactive", source: "default_schedule" };
    }
    var schedule = CAL.getRotationActivitySchedule(rotation);
    var status = schedule[wk] || "inactive";
    var source = (rotation.activitySchedule && typeof rotation.activitySchedule === "object")
      ? "weekly_schedule" : "default_schedule";
    return { rotationId: rotationId, date: date, status: status, source: source };
  };

  // ─── Wrap getResidencyDayContext ───
  var _origGetContext = CAL.getResidencyDayContext;
  CAL.getResidencyDayContext = function (date, planId) {
    var ctx = _origGetContext(date, planId);
    if (!ctx) return ctx;

    var state = _getState();
    var rotationsInRange = ctx.activeRotations || [];

    var rotationContexts = rotationsInRange.map(function (r) {
      var res = CAL.resolveRotationActivityStatus(r.id, date, state);
      return res || { rotationId: r.id, date: date, status: "inactive", source: "unknown" };
    });

    var activeIds = [], lightIds = [];
    rotationContexts.forEach(function (rc) {
      if (rc.status === "active") activeIds.push(rc.rotationId);
      else if (rc.status === "light") lightIds.push(rc.rotationId);
    });

    ctx.rotationContexts = rotationContexts;
    ctx.activeRotationIds  = activeIds;
    ctx.lightRotationIds   = lightIds;

    // Update multiple_active_rotations warning to use schedule-active list
    var filteredWarnings = (ctx.warnings || []).filter(function (w) {
      return w.type !== "multiple_active_rotations";
    });
    if (activeIds.length > 1) {
      filteredWarnings.push({ type: "multiple_active_rotations", rotationIds: activeIds.slice() });
    }
    ctx.warnings = filteredWarnings;

    return ctx;
  };

  // ─── Wrap getCapacityByRotation to use schedule-active list ───
  var _origGetCapacityByRotation = CAL.getCapacityByRotation;
  CAL.getCapacityByRotation = function (startDate, endDate, planId) {
    var ctxs = CAL.getResidencyCalendarContext(startDate, endDate, planId);
    var map = {};
    var noRot = { id: null, title: "(بدون روتیشن فعال)", totalDays: 0, totalRaw: 0, totalAvailable: 0 };
    var warnings = [];
    ctxs.forEach(function (ctx) {
      var actIds = ctx.activeRotationIds || [];
      if (actIds.length === 0) {
        noRot.totalDays++;
        noRot.totalRaw += ctx.rawCapacityMinutes;
        noRot.totalAvailable += ctx.availableCapacityMinutes;
        return;
      }
      if (actIds.length > 1) {
        warnings.push({ type: "multiple_active_rotations", date: ctx.date });
      }
      var rId = actIds[0];
      var rotInfo = (ctx.activeRotations || []).find(function (r) { return r.id === rId; });
      var title = rotInfo ? rotInfo.title : rId;
      if (!map[rId]) {
        map[rId] = { id: rId, title: title, totalDays: 0, totalRaw: 0, totalAvailable: 0 };
      }
      map[rId].totalDays++;
      map[rId].totalRaw += ctx.rawCapacityMinutes;
      map[rId].totalAvailable += ctx.availableCapacityMinutes;
    });
    var arr = Object.keys(map).map(function (k) { return map[k]; });
    if (noRot.totalDays > 0) arr.push(noRot);
    return { rotations: arr, warnings: warnings };
  };

  console.log("[InternshipResidency.calendar.v3.1] loaded");
})();