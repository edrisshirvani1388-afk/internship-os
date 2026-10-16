/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Scheduling Acknowledge v20.1
   Persistent: state.schedulingAcks[]
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[scheduling.ack.v20] R missing"); return; }

  var AK = R.schedulingAck = R.schedulingAck || {};
  AK.VERSION = "1.0.0";

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

  function _ensure() {
    var s = _state();
    if (!s) return null;
    if (!Array.isArray(s.schedulingAcks)) s.schedulingAcks = [];
    return s.schedulingAcks;
  }

  function _sortedPairKey(idA, idB) {
    if (!idA || !idB) return "";
    return idA < idB ? (idA + "::" + idB) : (idB + "::" + idA);
  }

  /* ═══ PUBLIC API ═══ */

  AK.acknowledge = function (conflict, reason) {
    if (!conflict) return false;
    var key = conflict.pairKey || _sortedPairKey(conflict.itemAId, conflict.itemBId);
    if (!key) return false;
    var entries = _ensure();
    if (!entries) return false;

    var fp = conflict.semanticFingerprint || "";

    // Remove old entry for same pair (replace)
    for (var i = entries.length - 1; i >= 0; i--) {
      if (entries[i] && entries[i].pairKey === key) entries.splice(i, 1);
    }

    entries.push({
      pairKey: key,
      at: Date.now(),
      reason: reason || "",
      fp: fp
    });
    _save();
    return true;
  };

  AK.isAcknowledged = function (conflict) {
    if (!conflict) return false;
    var key = conflict.pairKey || _sortedPairKey(conflict.itemAId, conflict.itemBId);
    if (!key) return false;
    var entries = _ensure();
    if (!entries) return false;
    var fp = conflict.semanticFingerprint || "";
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (!e) continue;
      if (e.pairKey !== key) continue;
      if (fp && e.fp && e.fp !== fp) continue;
      return true;
    }
    return false;
  };

  AK.getAcknowledgement = function (conflict) {
    if (!conflict) return null;
    var key = conflict.pairKey || _sortedPairKey(conflict.itemAId, conflict.itemBId);
    if (!key) return null;
    var entries = _ensure();
    if (!entries) return null;
    for (var i = 0; i < entries.length; i++) {
      var e = entries[i];
      if (e && e.pairKey === key) return e;
    }
    return null;
  };

  AK.invalidateForItem = function (itemId) {
    if (!itemId) return 0;
    var entries = _ensure();
    if (!entries) return 0;
    var before = entries.length;
    var out = entries.filter(function (e) {
      if (!e || !e.pairKey) return false;
      return e.pairKey.indexOf(itemId + "::") !== 0 &&
             e.pairKey.indexOf("::" + itemId) < 0;
    });
    _ensure();
    var s = _state();
    s.schedulingAcks = out;
    _save();
    return before - out.length;
  };

  AK.invalidateForChangedItem = function (previousItem, currentItem) {
    if (!previousItem || !currentItem) return 0;
    if (previousItem.id !== currentItem.id) return 0;
    // If any semantic field changed, invalidate
    var changed =
      (previousItem.role || "") !== (currentItem.role || "") ||
      (previousItem.category || "") !== (currentItem.category || "") ||
      (previousItem.startTime || "") !== (currentItem.startTime || "") ||
      (previousItem.endTime || "") !== (currentItem.endTime || "") ||
      (previousItem.durationMinutes || 0) !== (currentItem.durationMinutes || 0);
    if (changed) return AK.invalidateForItem(currentItem.id);
    return 0;
  };

  AK.clear = function (conflict) {
    if (!conflict) return false;
    var key = conflict.pairKey || _sortedPairKey(conflict.itemAId, conflict.itemBId);
    if (!key) return false;
    var entries = _ensure();
    if (!entries) return false;
    var before = entries.length;
    var filtered = entries.filter(function (e) { return e && e.pairKey !== key; });
    if (filtered.length === before) return false;
    var s = _state();
    s.schedulingAcks = filtered;
    _save();
    return true;
  };

  AK.clearAll = function () {
    var s = _state();
    if (!s) return false;
    var before = Array.isArray(s.schedulingAcks) ? s.schedulingAcks.length : 0;
    s.schedulingAcks = [];
    _save();
    return before > 0;
  };

  AK.listAll = function () {
    var entries = _ensure();
    return entries ? entries.slice() : [];
  };

  AK._sortedPairKey = _sortedPairKey;

  console.log("[scheduling.ack.v20] loaded v" + AK.VERSION);
})();