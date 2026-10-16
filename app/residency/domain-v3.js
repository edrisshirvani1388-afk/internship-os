/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v3 (Phase 3)
   Day Types, Capacity Keys, Weekday Rules, DayOverride ext
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v3] R missing"); return; }

  var _origCreateDayOverride = R.createDayOverride;
  var _origCreateEmpty       = R.createEmptyResidencyState;
  var _origNormalize         = R.normalizeResidencyState;

  var DAY_TYPES       = ["normal","free","off","pre_shift","shift","post_shift"];
  var CAPACITY_KEYS   = ["normal","free","off","preShift","shift","postShift"];
  var WEEKDAY_KEYS    = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
  var DEFAULT_WEEKDAY_RULES = {
    saturday:"normal", sunday:"normal", monday:"normal", tuesday:"normal",
    wednesday:"normal", thursday:"free", friday:"free"
  };
  var DEFAULT_CAPACITY = {
    normal:240, free:300, off:0, preShift:60, shift:120, postShift:30
  };
  var DAY_TO_CAP = {
    normal:"normal", free:"free", off:"off",
    pre_shift:"preShift", shift:"shift", post_shift:"postShift"
  };
  var DEFAULT_RESERVE_PCT = 10;

  R.DAY_TYPES             = DAY_TYPES;
  R.CAPACITY_KEYS         = CAPACITY_KEYS;
  R.WEEKDAY_KEYS          = WEEKDAY_KEYS;
  R.DEFAULT_WEEKDAY_RULES = DEFAULT_WEEKDAY_RULES;
  R.DEFAULT_CAPACITY      = DEFAULT_CAPACITY;
  R.DAY_TO_CAP            = DAY_TO_CAP;
  R.DEFAULT_RESERVE_PCT   = DEFAULT_RESERVE_PCT;

  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }

  R.createDayOverride = function (input) {
    input = input || {};
    var o = _origCreateDayOverride(input);
    o.dayTypeOverride = input.dayTypeOverride
      ? _enum(input.dayTypeOverride, DAY_TYPES, null)
      : null;
    return o;
  };

  R.createEmptyResidencyState = function () {
    var s = _origCreateEmpty();
    if (!s.settings) s.settings = {};
    if (!s.settings.weekdayDefaults) {
      s.settings.weekdayDefaults = Object.assign({}, DEFAULT_WEEKDAY_RULES);
    }
    if (!s.settings.reservePolicy) {
      s.settings.reservePolicy = {
        dailyPercent: DEFAULT_RESERVE_PCT,
        deadlineReservePercent: DEFAULT_RESERVE_PCT,
        allowSystemSuggestion: true
      };
    }
    return s;
  };

  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    if (!out.settings) out.settings = {};
    if (!out.settings.weekdayDefaults || typeof out.settings.weekdayDefaults !== "object") {
      out.settings.weekdayDefaults = Object.assign({}, DEFAULT_WEEKDAY_RULES);
    } else {
      var merged = Object.assign({}, DEFAULT_WEEKDAY_RULES);
      Object.keys(out.settings.weekdayDefaults).forEach(function (k) {
        if (WEEKDAY_KEYS.indexOf(k) !== -1) {
          var v = out.settings.weekdayDefaults[k];
          merged[k] = (DAY_TYPES.indexOf(v) !== -1) ? v : merged[k];
        }
      });
      out.settings.weekdayDefaults = merged;
    }
    if (!out.settings.reservePolicy || typeof out.settings.reservePolicy !== "object") {
      out.settings.reservePolicy = {
        dailyPercent: DEFAULT_RESERVE_PCT,
        deadlineReservePercent: DEFAULT_RESERVE_PCT,
        allowSystemSuggestion: true
      };
    }
    (out.dayOverrides || []).forEach(function (o) {
      if (!o) return;
      if (!("dayTypeOverride" in o)) o.dayTypeOverride = null;
      if (o.dayTypeOverride != null && DAY_TYPES.indexOf(o.dayTypeOverride) === -1) {
        o.dayTypeOverride = null;
      }
    });
    return out;
  };

  R.validateDayOverride = function (o) {
    var errs = [];
    if (!o || typeof o !== "object") return ["dayOverride is not object"];
    if (!o.id) errs.push("id required");
    if (!o.date) errs.push("date required");
    if (o.capacityMinutes != null) {
      if (typeof o.capacityMinutes !== "number" || o.capacityMinutes < 0) {
        errs.push("capacityMinutes must be >= 0 or null");
      }
    }
    if (o.dayTypeOverride != null && DAY_TYPES.indexOf(o.dayTypeOverride) === -1) {
      errs.push("invalid dayTypeOverride");
    }
    return errs;
  };

  R.validateCapacityProfile = function (p) {
    var errs = [];
    if (!p || typeof p !== "object") return ["profile is not object"];
    if (!p.id) errs.push("id required");
    if (["global","rotation"].indexOf(p.scopeType) === -1) errs.push("invalid scopeType");
    if (p.scopeType === "rotation" && !p.rotationId) errs.push("rotationId required");
    if (typeof p.reservePercent !== "number" || p.reservePercent < 0 || p.reservePercent > 100) {
      errs.push("reservePercent must be 0..100");
    }
    if (p.capacities && typeof p.capacities === "object") {
      CAPACITY_KEYS.forEach(function (k) {
        var v = p.capacities[k];
        if (v != null && (typeof v !== "number" || v < 0)) {
          errs.push("capacity." + k + " must be >= 0");
        }
      });
    }
    return errs;
  };

  console.log("[InternshipResidency.domain.v3] loaded");
})();