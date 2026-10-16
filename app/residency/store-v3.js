/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Store v3 (Phase 3)
   Day Override helpers + Capacity Profile helpers + Calendar
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.store.v3] R missing"); return; }
  var S = R.store = R.store || {};
  var CAL = R.calendar;
  var DOM = R;

  /* ─── Day Override helpers ─── */
  S.getDayOverride = function (date) {
    var list = S.getDayOverrides();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].date === date) return list[i];
    }
    return null;
  };

  S.setDayAvailability = function (date, minutes, reason) {
    var ex = S.getDayOverride(date);
    if (ex) {
      return S.updateDayOverride(ex.id, {
        capacityMinutes: minutes,
        reason: reason || ex.reason
      });
    }
    return S.addDayOverride({
      date: date, capacityMinutes: minutes, reason: reason || ""
    });
  };

  S.clearDayAvailability = function (date) {
    var ex = S.getDayOverride(date);
    if (!ex) return false;
    if (ex.dayTypeOverride) {
      return S.updateDayOverride(ex.id, { capacityMinutes: null });
    }
    return S.removeDayOverride(ex.id);
  };

  S.setDayTypeOverride = function (date, type, reason) {
    if (R.DAY_TYPES.indexOf(type) === -1) {
      console.warn("[residency.store] invalid day type:", type);
      return null;
    }
    var ex = S.getDayOverride(date);
    if (ex) {
      return S.updateDayOverride(ex.id, {
        dayTypeOverride: type,
        reason: reason || ex.reason
      });
    }
    return S.addDayOverride({
      date: date, dayTypeOverride: type, reason: reason || ""
    });
  };

  S.clearDayTypeOverride = function (date) {
    var ex = S.getDayOverride(date);
    if (!ex) return false;
    if (ex.capacityMinutes != null) {
      return S.updateDayOverride(ex.id, { dayTypeOverride: null });
    }
    return S.removeDayOverride(ex.id);
  };

  /* ─── Capacity Profile helpers ─── */
  S.getGlobalCapacityProfile = function () {
    var list = S.getCapacityProfiles();
    for (var i = 0; i < list.length; i++) {
      if (list[i] && list[i].scopeType === "global") return list[i];
    }
    return null;
  };

  S.getCapacityProfileForRotation = function (rotationId) {
    var list = S.getCapacityProfiles();
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p && p.scopeType === "rotation" && p.rotationId === rotationId) return p;
    }
    return null;
  };

  /* ─── Calendar wrappers ─── */
  S.getResidencyDayContext = function (date, planId) {
    if (!CAL || !CAL.getResidencyDayContext) return null;
    return CAL.getResidencyDayContext(date, planId);
  };
  S.getResidencyCalendarContext = function (startDate, endDate, planId) {
    if (!CAL || !CAL.getResidencyCalendarContext) return [];
    return CAL.getResidencyCalendarContext(startDate, endDate, planId);
  };
  S.getCapacitySummary = function (startDate, endDate, planId) {
    if (!CAL || !CAL.getCapacitySummary) return null;
    return CAL.getCapacitySummary(startDate, endDate, planId);
  };
  S.getCapacityByRotation = function (startDate, endDate, planId) {
    if (!CAL || !CAL.getCapacityByRotation) return null;
    return CAL.getCapacityByRotation(startDate, endDate, planId);
  };

  /* ─── Validation wrappers ─── */
  var _origAddCapacityProfile = S.addCapacityProfile;
  S.addCapacityProfile = function (input) {
    // ─── Validate raw input BEFORE clamping ───
    if (input && typeof input.reservePercent === "number") {
      if (input.reservePercent < 0 || input.reservePercent > 100) {
        console.warn("[residency.store.v3] invalid reservePercent (raw):", input.reservePercent);
        return null;
      }
    }
    if (input && input.capacities && typeof input.capacities === "object") {
      var keys = Object.keys(input.capacities);
      for (var i = 0; i < keys.length; i++) {
        var v = input.capacities[keys[i]];
        if (typeof v === "number" && v < 0) {
          console.warn("[residency.store.v3] negative capacity (raw):", keys[i], "=", v);
          return null;
        }
      }
    }
    var c = DOM.createCapacityProfile(input);
    var errs = DOM.validateCapacityProfile(c);
    if (errs.length) {
      console.warn("[residency.store.v3] addCapacityProfile:", errs);
      return null;
    }
    return _origAddCapacityProfile(input);
  };

  var _origAddDayOverride = S.addDayOverride;
  S.addDayOverride = function (input) {
    var o = DOM.createDayOverride(input);
    var errs = DOM.validateDayOverride(o);
    if (errs.length) {
      console.warn("[residency.store.v3] addDayOverride:", errs);
      return null;
    }
    return _origAddDayOverride(input);
  };

  console.log("[InternshipResidency.store.v3] loaded");
})();