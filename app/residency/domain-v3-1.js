/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v3.1 (Rotation Schedule)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v3.1] R missing"); return; }

  var _origCreateDayOverride = R.createDayOverride;
  var _origNormalize         = R.normalizeResidencyState;
  var _origValidateDayOver   = R.validateDayOverride;

  var ROTATION_STATUS = ["active", "light", "inactive"];
  var DEFAULT_ACTIVITY_SCHEDULE = {
    saturday: "active", sunday: "active", monday: "active",
    tuesday: "active", wednesday: "active",
    thursday: "inactive", friday: "inactive"
  };

  R.ROTATION_STATUS = ROTATION_STATUS;
  R.DEFAULT_ACTIVITY_SCHEDULE = DEFAULT_ACTIVITY_SCHEDULE;

  R.createActivitySchedule = function (input) {
    var s = input || {};
    var out = {};
    R.WEEKDAY_KEYS.forEach(function (k) {
      var v = s[k];
      out[k] = (ROTATION_STATUS.indexOf(v) !== -1) ? v : DEFAULT_ACTIVITY_SCHEDULE[k];
    });
    return out;
  };

  R.createDayOverride = function (input) {
    input = input || {};
    var o = _origCreateDayOverride(input);
    o.rotationId = input.rotationId ? String(input.rotationId) : null;
    o.rotationStatus = (input.rotationStatus && ROTATION_STATUS.indexOf(input.rotationStatus) !== -1)
      ? input.rotationStatus : null;
    // ─── v3.1 fix: capacityMinutes defaults to null when not explicit ───
    if (input.capacityMinutes === undefined || input.capacityMinutes === null) {
      o.capacityMinutes = null;
    }
    return o;
  };

  R.validateActivitySchedule = function (s) {
    var errs = [];
    if (!s || typeof s !== "object") return ["schedule is not object"];
    R.WEEKDAY_KEYS.forEach(function (k) {
      if (ROTATION_STATUS.indexOf(s[k]) === -1) errs.push("invalid status for " + k);
    });
    return errs;
  };

  R.validateDayOverride = function (o) {
    var errs = _origValidateDayOver(o) || [];
    if (o && o.rotationStatus != null && ROTATION_STATUS.indexOf(o.rotationStatus) === -1) {
      errs.push("invalid rotationStatus");
    }
    return errs;
  };

  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    (out.dayOverrides || []).forEach(function (o) {
      if (!o) return;
      if (!("rotationId" in o)) o.rotationId = null;
      if (!("rotationStatus" in o)) o.rotationStatus = null;
      if (o.rotationStatus != null && ROTATION_STATUS.indexOf(o.rotationStatus) === -1) {
        o.rotationStatus = null;
      }
    });
    return out;
  };

  R.normalizeRotationSchedule = function (r) {
    if (!r || typeof r !== "object") return null;
    if (!r.activitySchedule || typeof r.activitySchedule !== "object") {
      r.activitySchedule = R.createActivitySchedule(null);
    } else {
      r.activitySchedule = R.createActivitySchedule(r.activitySchedule);
    }
    return r;
  };

  console.log("[InternshipResidency.domain.v3.1] loaded");
})();