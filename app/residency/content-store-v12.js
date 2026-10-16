(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.store.v12] R missing"); return; }
  var CS = R.contentStore = R.contentStore = R.contentStore || {};
  var DOM = R.contentDomain;

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
  function _ensureDrafts() {
    var s = _state();
    if (!s) return null;
    if (!Array.isArray(s.contentDrafts)) s.contentDrafts = [];
    return s.contentDrafts;
  }

  CS.listDrafts = function (filter) {
    var arr = _ensureDrafts();
    if (!arr) return [];
    filter = filter || {};
    return arr.filter(function (d) {
      if (!d) return false;
      if (filter.status && d.status !== filter.status) return false;
      if (filter.areaId && d.areaId !== filter.areaId) return false;
      if (filter.contentType && d.contentType !== filter.contentType) return false;
      return true;
    });
  };

  CS.getDraft = function (id) {
    var arr = _ensureDrafts();
    if (!arr) return null;
    for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].id === id) return arr[i];
    return null;
  };

  CS.addDraft = function (input) {
    var arr = _ensureDrafts();
    if (!arr) return null;
    var c = (input && input.id) ? input : DOM.createContentDefinition(input);
    arr.push(c);
    _save();
    return c;
  };

  CS.updateDraft = function (id, patch) {
    var arr = _ensureDrafts();
    if (!arr) return null;
    var c = CS.getDraft(id);
    if (!c) return null;
    Object.assign(c, patch || {}, { id: c.id, updatedAt: Date.now() });
    _save();
    return c;
  };

  CS.removeDraft = function (id) {
    var arr = _ensureDrafts();
    if (!arr) return false;
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { arr.splice(i, 1); _save(); return true; }
    }
    return false;
  };

  CS.clearDrafts = function () {
    var s = _state();
    if (!s) return false;
    s.contentDrafts = [];
    _save();
    return true;
  };

  CS.getProvenance = function (draft) {
    if (!draft || !draft.source) return null;
    var src = draft.source;
    return {
      generatedAt: src.generatedAt || null,
      generatedBy: src.generatedBy || "unknown",
      provider: src.provider || null,
      model: src.model || null,
      promptId: src.promptId || null,
      promptVersion: src.promptVersion || null,
      sourceContentIds: src.sourceContentIds || []
    };
  };

  console.log("[residency.content.store.v12] loaded");
})();