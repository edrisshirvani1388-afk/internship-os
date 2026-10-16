(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.store.v10] R missing"); return; }
  var S = R.store = R.store || {};
  var DOM = R;

  function _rs() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState().residency; } catch (e) { return null; }
    }
    return null;
  }
  function _ensure() {
    var rs = _rs(); if (!rs) return null;
    if (!Array.isArray(rs.reviewStates)) rs.reviewStates = [];
    return rs;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _touch() {
    var rs = _rs(); if (rs && rs.meta) rs.meta.updatedAt = Date.now();
  }

  S.getReviewStates = function (filter) {
    var rs = _ensure(); if (!rs) return [];
    filter = filter || {};
    return rs.reviewStates.filter(function (s) {
      if (!s) return false;
      if (filter.targetType && s.targetType !== filter.targetType) return false;
      if (filter.targetId && s.targetId !== filter.targetId) return false;
      if (filter.status && s.status !== filter.status) return false;
      if (filter.bookId && s.bookId !== filter.bookId) return false;
      if (filter.subjectId && s.subjectId !== filter.subjectId) return false;
      return true;
    });
  };

  S.getReviewState = function (id) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.reviewStates.length; i++) {
      if (rs.reviewStates[i] && rs.reviewStates[i].id === id) return rs.reviewStates[i];
    }
    return null;
  };

  S.findReviewStateByTarget = function (targetType, targetId) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.reviewStates.length; i++) {
      var s = rs.reviewStates[i];
      if (s && s.targetType === targetType && s.targetId === targetId) return s;
    }
    return null;
  };

  S.addReviewState = function (input) {
    var rs = _ensure(); if (!rs) return null;
    if (input && input.targetType && input.targetId) {
      var existing = S.findReviewStateByTarget(input.targetType, input.targetId);
      if (existing) return existing;
    }
    var s = DOM.createReviewState(input);
    var errs = DOM.validateReviewState(s);
    if (errs.length) { console.warn("[residency.store.v10] addReviewState:", errs); return null; }
    rs.reviewStates.push(s);
    _touch(); _save();
    return s;
  };

  S.updateReviewState = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var s = S.getReviewState(id);
    if (!s) return null;
    var merged = Object.assign({}, s, patch || {});
    var errs = DOM.validateReviewState(merged);
    if (errs.length) { console.warn("[residency.store.v10] updateReviewState:", errs); return null; }
    Object.assign(s, patch || {}, { id: s.id, updatedAt: Date.now() });
    _touch(); _save();
    return s;
  };

  S.removeReviewState = function (id) {
    var rs = _ensure(); if (!rs) return false;
    for (var i = 0; i < rs.reviewStates.length; i++) {
      if (rs.reviewStates[i].id === id) {
        rs.reviewStates.splice(i, 1);
        _touch(); _save();
        return true;
      }
    }
    return false;
  };

  S.suspendReviewState = function (id, reason) {
    return S.updateReviewState(id, { status: "suspended", suspendedReason: reason || "manual" });
  };
  S.resumeReviewState = function (id) {
    var s = S.getReviewState(id);
    if (!s) return null;
    var status = s.repetitions > 0 ? "review" : "new";
    return S.updateReviewState(id, { status: status, suspendedReason: null });
  };

  S.getReviewSettings = function () {
    var rs = _ensure(); if (!rs) return null;
    if (!rs.settings) rs.settings = {};
    if (!rs.settings.reviewSettings) rs.settings.reviewSettings = DOM.createDefaultReviewSettings();
    return JSON.parse(JSON.stringify(rs.settings.reviewSettings));
  };

  S.updateReviewSettings = function (patch) {
    var rs = _ensure(); if (!rs) return null;
    if (!rs.settings) rs.settings = {};
    if (!rs.settings.reviewSettings) rs.settings.reviewSettings = DOM.createDefaultReviewSettings();
    Object.assign(rs.settings.reviewSettings, patch || {});
    _touch(); _save();
    return JSON.parse(JSON.stringify(rs.settings.reviewSettings));
  };

  console.log("[InternshipResidency.store.v10] loaded");
})();