/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Store v3.1 (Rotation Schedule)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.store.v3.1] R missing"); return; }
  var S = R.store = R.store || {};
  var CAL = R.calendar;

  function _state() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _findRotation(rotationId) {
    var s = _state();
    if (!s || !Array.isArray(s.rotations)) return null;
    for (var i = 0; i < s.rotations.length; i++) {
      if (s.rotations[i] && s.rotations[i].id === rotationId) return s.rotations[i];
    }
    return null;
  }

  S.getRotationSchedules = function () {
    var s = _state();
    if (!s || !Array.isArray(s.rotations)) return [];
    return s.rotations.map(function (r) {
      return { rotationId: r.id, schedule: CAL.getRotationActivitySchedule(r) };
    });
  };

  S.getRotationSchedule = function (rotationId) {
    var r = _findRotation(rotationId);
    if (!r) return null;
    return CAL.getRotationActivitySchedule(r);
  };

  S.setRotationSchedule = function (rotationId, schedule) {
    var r = _findRotation(rotationId);
    if (!r) return null;
    r.activitySchedule = R.createActivitySchedule(schedule);
    _save();
    return r.activitySchedule;
  };
  S.updateRotationSchedule = S.setRotationSchedule;

  S.removeRotationSchedule = function (rotationId) {
    var r = _findRotation(rotationId);
    if (!r) return false;
    delete r.activitySchedule;
    _save();
    return true;
  };

  S.getRotationScheduleStatus = function (rotationId, date) {
    return CAL.resolveRotationActivityStatus(rotationId, date);
  };

  S.setRotationDateOverride = function (rotationId, date, status, reason) {
    if (R.ROTATION_STATUS.indexOf(status) === -1) {
      console.warn("[residency.store.v3.1] invalid status:", status);
      return null;
    }
    var overrides = S.getDayOverrides();
    var existing = null;
    for (var i = 0; i < overrides.length; i++) {
      var o = overrides[i];
      if (o && o.date === date && o.rotationId === rotationId) { existing = o; break; }
    }
    if (existing) {
      return S.updateDayOverride(existing.id, {
        rotationStatus: status,
        reason: reason || existing.reason
      });
    }
    return S.addDayOverride({
      date: date, rotationId: rotationId, rotationStatus: status, reason: reason || ""
    });
  };

  S.clearRotationDateOverride = function (rotationId, date) {
    var overrides = S.getDayOverrides();
    var existing = null;
    for (var i = 0; i < overrides.length; i++) {
      var o = overrides[i];
      if (o && o.date === date && o.rotationId === rotationId) { existing = o; break; }
    }
    if (!existing) return false;
    if (existing.capacityMinutes != null || existing.dayTypeOverride) {
      return S.updateDayOverride(existing.id, { rotationId: null, rotationStatus: null });
    }
    return S.removeDayOverride(existing.id);
  };

  console.log("[InternshipResidency.store.v3.1] loaded");
})();