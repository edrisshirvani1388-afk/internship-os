(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planversion.v17] R missing"); return; }
  var PV = R.planVersion = R.planVersion || {};

  var SNAPSHOT_FIELDS = [
    "id","planId","roundId","bookId","subjectId","taskId",
    "kind","title","sourceType","sourceId",
    "plannedDate","plannedStartTime","plannedDurationMinutes",
    "plannedPages","plannedPageStart","plannedPageEnd",
    "status","locked","notes"
  ];

  var COMPARE_FIELDS = [
    "plannedDate","plannedStartTime","plannedDurationMinutes",
    "plannedPages","plannedPageStart","plannedPageEnd",
    "status","locked","roundId","bookId","subjectId","taskId",
    "notes","kind","title"
  ];

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _save() { if (window.__os && window.__os.saveState) { try { window.__os.saveState(); } catch (e) {} } }

  function _projectActivity(a) {
    if (!a) return null;
    var out = {};
    SNAPSHOT_FIELDS.forEach(function (f) {
      var v = a[f];
      out[f] = (v === undefined) ? null : v;
    });
    if (a.reviewTarget) out.reviewTarget = a.reviewTarget;
    if (a.reviewMeta) out.reviewMeta = a.reviewMeta;
    if (a.assessmentId) out.assessmentId = a.assessmentId;
    return out;
  }

  function _hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h &= 0xffffffff; }
    return Math.abs(h).toString(36);
  }

  PV.captureCurrentActivities = function (planId) {
    var s = _state();
    if (!s || !s.residency) return null;
    var pid = planId || (s.residency.meta && s.residency.meta.activePlanId) || null;
    var list = (s.residency.activities || []).filter(function (a) {
      if (!a) return false;
      if (!pid) return true;
      // include if belongs to plan (or has no planId but same round)
      if (a.planId === pid) return true;
      if (a.planId == null && a.roundId) {
        var round = (s.residency.rounds || []).find(function (r) { return r && r.id === a.roundId; });
        if (round && round.planId === pid) return true;
      }
      if (a.planId == null && !a.roundId) return true;
      return false;
    });
    var projected = list.map(_projectActivity);
    var payload = JSON.stringify(projected.map(function (x) { return SNAPSHOT_FIELDS.map(function (f) { return String(x[f] == null ? "" : x[f]); }).join("|"); }).sort());
    return {
      activities: projected,
      capturedAt: Date.now(),
      activityCount: projected.length,
      fingerprint: _hash(payload)
    };
  };

  PV.getSnapshot = function (versionId) {
    var v = PV.getById(versionId);
    if (!v) return null;
    return v.snapshot || null;
  };

  PV.hasSnapshot = function (versionId) {
    var s = PV.getSnapshot(versionId);
    return !!(s && Array.isArray(s.activities));
  };

  /* ═══ Activity-level compare ═══ */

  function _fieldChanges(a, b) {
    var changes = [];
    COMPARE_FIELDS.forEach(function (f) {
      var va = a ? a[f] : null;
      var vb = b ? b[f] : null;
      var na = (va == null || va === "") ? null : va;
      var nb = (vb == null || vb === "") ? null : vb;
      if (String(na) !== String(nb)) {
        changes.push({ field: f, before: na, after: nb });
      }
    });
    return changes;
  }

  function _compareActivities(before, after) {
    var aMap = {}, bMap = {};
    (before || []).forEach(function (a) { if (a && a.id) aMap[a.id] = a; });
    (after || []).forEach(function (a) { if (a && a.id) bMap[a.id] = a; });

    var added = [], removed = [], modified = [], unchanged = [];

    (after || []).forEach(function (a) {
      if (!a || !a.id) return;
      if (aMap[a.id]) {
        var changes = _fieldChanges(aMap[a.id], a);
        if (changes.length > 0) modified.push({ activityId: a.id, before: aMap[a.id], after: a, changes: changes });
        else unchanged.push({ activityId: a.id, activity: a });
      } else {
        added.push(a);
      }
    });

    (before || []).forEach(function (a) {
      if (!a || !a.id) return;
      if (!bMap[a.id]) removed.push(a);
    });

    return {
      added: added,
      removed: removed,
      modified: modified,
      unchanged: unchanged,
      summary: {
        addedCount: added.length,
        removedCount: removed.length,
        modifiedCount: modified.length,
        unchangedCount: unchanged.length
      }
    };
  }
  PV._compareActivities = _compareActivities;

  PV.compare = function (versionAId, versionBId) {
    var a = PV.getById(versionAId);
    var b = PV.getById(versionBId);
    if (!a || !b) return { error: "version_not_found" };
    if (!PV.hasSnapshot(versionAId) || !PV.hasSnapshot(versionBId)) {
      return { error: "snapshot_unavailable" };
    }
    var snapA = PV.getSnapshot(versionAId);
    var snapB = PV.getSnapshot(versionBId);
    return _compareActivities(snapA.activities, snapB.activities);
  };

  PV.compareVersionToCurrent = function (versionId, planId) {
    var v = PV.getById(versionId);
    if (!v) return { error: "version_not_found" };
    if (!PV.hasSnapshot(versionId)) return { error: "snapshot_unavailable" };
    var snap = PV.getSnapshot(versionId);
    // [FIX:v17-planid] fallback chain
    if (!planId) {
      planId = v.planId
        || (snap.activities && snap.activities[0] && snap.activities[0].planId)
        || null;
    }
    var current = PV.captureCurrentActivities(planId);
    if (!current) return { error: "no_state" };
    return _compareActivities(snap.activities, current.activities);
  };

  PV.computeCurrentFingerprint = function (planId) {
    var c = PV.captureCurrentActivities(planId);
    return c ? c.fingerprint : null;
  };

  /* ═══ Revert Preview ═══ */

  function _isProtected(a) {
    if (!a) return true;
    if (a.locked) return true;
    if (a.status === "completed" || a.status === "cancelled" || a.status === "skipped") return true;
    var LIB = window.InternshipLib;
    if (a.plannedDate && LIB && LIB.date) {
      var today = LIB.date.todayJalaliString();
      if (LIB.date.compareJalaliDate(a.plannedDate, today) < 0) return true;
    }
    return false;
  }

  function _isSafeToRemove(a) {
    if (!a) return false;
    if (a.locked) return false;
    if (a.status !== "planned" && a.status !== "partial") return false;
    var LIB = window.InternshipLib;
    if (a.plannedDate && LIB && LIB.date) {
      var today = LIB.date.todayJalaliString();
      if (LIB.date.compareJalaliDate(a.plannedDate, today) < 0) return false;
    }
    return true;
  }

  PV.previewRevert = function (versionId, options) {
    options = options || {};
    var v = PV.getById(versionId);
    if (!v) return { canRevert: false, error: "version_not_found" };
    if (!PV.hasSnapshot(versionId)) return { canRevert: false, error: "snapshot_unavailable" };

    var snap = PV.getSnapshot(versionId);
    var s = _state();
    if (!s || !s.residency) return { canRevert: false, error: "no_state" };
    // [FIX:v17-planid] derive planId from version/snapshot, not active meta
    var planId = options.planId
      || v.planId
      || (snap.activities && snap.activities[0] && snap.activities[0].planId)
      || (s.residency.meta && s.residency.meta.activePlanId);
    var current = PV.captureCurrentActivities(planId);
    if (!current) return { canRevert: false, error: "no_current" };

    var diff = _compareActivities(current.activities, snap.activities);

    var changes = [], skipped = [], warnings = [];

    // added → restore (activity existed in snapshot, not in current)
    diff.added.forEach(function (a) {
      changes.push({
        activityId: a.id,
        action: "restore",
        before: null,
        target: a,
        reason: "missing_in_current"
      });
    });

    // modified → update or skip if protected
    diff.modified.forEach(function (m) {
      var cur = current.activities.find(function (x) { return x.id === m.activityId; });
      if (_isProtected(cur)) {
        skipped.push({ activityId: m.activityId, reason: "protected", changes: m.changes });
        warnings.push("activity " + m.activityId + " is protected (locked/completed/past)");
        return;
      }
      changes.push({
        activityId: m.activityId,
        action: "update",
        before: cur,
        target: m.after,
        changes: m.changes,
        reason: "field_differs"
      });
    });

    // removed → cancel if safe
    diff.removed.forEach(function (a) {
      var cur = current.activities.find(function (x) { return x.id === a.id; });
      if (!cur) { skipped.push({ activityId: a.id, reason: "not_in_current" }); return; }
      if (!_isSafeToRemove(cur)) {
        skipped.push({ activityId: a.id, reason: "protected_or_past", current: cur });
        warnings.push("activity " + a.id + " cannot be removed (protected/past)");
        return;
      }
      changes.push({
        activityId: a.id,
        action: "remove",
        before: cur,
        target: null,
        reason: "not_in_snapshot"
      });
    });

    return {
      ok: true,
      sourceVersionId: versionId,
      sourceVersion: v.version,
      planId: planId,
      currentFingerprint: current.fingerprint,
      changes: changes,
      skipped: skipped,
      conflicts: [],
      warnings: warnings,
      canRevert: changes.length > 0,
      summary: {
        totalChanges: changes.length,
        totalSkipped: skipped.length,
        restoreCount: changes.filter(function (c) { return c.action === "restore"; }).length,
        updateCount: changes.filter(function (c) { return c.action === "update"; }).length,
        removeCount: changes.filter(function (c) { return c.action === "remove"; }).length
      }
    };
  };

  /* ═══ Revert Apply ═══ */

  PV.applyRevert = function (versionId, options) {
    options = options || {};
    var s = _state();
    if (!s || !s.residency) return { success: false, reason: "no_state" };

    var preview = options.preview || PV.previewRevert(versionId, options);
    if (!preview || !preview.ok) return { success: false, reason: "preview_failed", error: preview && preview.error };

    // [FIX:v17-stale] Stale check FIRST, before canRevert
    var currentFp = PV.computeCurrentFingerprint(preview.planId);
    if (currentFp && preview.currentFingerprint && currentFp !== preview.currentFingerprint) {
      return { success: false, reason: "STALE_PROPOSAL" };
    }

    if (!preview.canRevert) return { success: false, reason: "nothing_to_revert" };

    // Idempotency check: if state already matches target, no-op
    if (preview.changes.length === 0) {
      return { success: false, reason: "no_op" };
    }

    // Apply each change
    var applied = [], failed = [];

    if (!Array.isArray(s.residency.activities)) s.residency.activities = [];

    preview.changes.forEach(function (c) {
      var act = (s.residency.activities || []).find(function (x) { return x.id === c.activityId; });
      if (c.action === "update") {
        if (!act) { failed.push({ activityId: c.activityId, reason: "not_found" }); return; }
        if (_isProtected(act)) { failed.push({ activityId: c.activityId, reason: "protected" }); return; }
        var patch = {};
        c.changes.forEach(function (ch) { patch[ch.field] = ch.after; });
        var res = R.store.updateActivity(c.activityId, patch);
        if (res) applied.push({ activityId: c.activityId, action: "update" });
        else failed.push({ activityId: c.activityId, reason: "store_rejected" });
      } else if (c.action === "remove") {
        if (!act) { failed.push({ activityId: c.activityId, reason: "not_found" }); return; }
        if (!_isSafeToRemove(act)) { failed.push({ activityId: c.activityId, reason: "protected_or_past" }); return; }
        var res2 = R.store.updateActivity(c.activityId, { status: "cancelled" });
        if (res2) applied.push({ activityId: c.activityId, action: "remove" });
        else failed.push({ activityId: c.activityId, reason: "store_rejected" });
      } else if (c.action === "restore") {
        var t = c.target;
        if (!t) { failed.push({ activityId: c.activityId, reason: "no_target" }); return; }
        var restored = Object.assign({}, t, {
          updatedAt: Date.now(),
          createdAt: t.createdAt || Date.now()
        });
        // ensure unique id if it already exists elsewhere
        if (s.residency.activities.some(function (x) { return x.id === restored.id; })) {
          failed.push({ activityId: c.activityId, reason: "id_conflict" });
          return;
        }
        s.residency.activities.push(restored);
        applied.push({ activityId: restored.id, action: "restore" });
        if (R.taskProjection && R.taskProjection.syncActivityToTask) {
          try { R.taskProjection.syncActivityToTask(restored.id); } catch (e) {}
        }
      }
    });

    if (applied.length === 0) {
      return { success: false, reason: "nothing_applied", failed: failed };
    }

    // Task projection for updated/removed
    applied.forEach(function (a) {
      if (a.action === "update" && R.taskProjection && R.taskProjection.syncActivityToTask) {
        try { R.taskProjection.syncActivityToTask(a.activityId); } catch (e) {}
      }
    });

    // Append-only new PlanVersion with snapshot
    var versions = R.store.getPlanVersions() || [];
    var maxV = 0, latestId = null;
    versions.forEach(function (v) { if (v && v.version > maxV) { maxV = v.version; latestId = v.id; } });
    versions.forEach(function (v) {
      if (v && v.status === "active" && R.store.updatePlanVersion) {
        R.store.updatePlanVersion(v.id, { status: "superseded" });
      }
    });

    var sourceV = PV.getById(versionId);
    var newSnapshot = PV.captureCurrentActivities(preview.planId);

    var pv = R.store.addPlanVersion({
      version: maxV + 1,
      parentVersionId: latestId,
      triggerType: "revert",
      reason: "Revert to v" + (sourceV ? sourceV.version : "?") + " (" + applied.length + " changes)",
      status: "active",
      hash: "revert-" + versionId,
      snapshot: newSnapshot,
      planId: preview.planId
    });

    _save();
    return {
      success: true,
      applied: applied,
      failed: failed,
      skipped: preview.skipped,
      planVersionId: pv ? pv.id : null,
      newVersionNumber: pv ? pv.version : null
    };
  };

  /* ═══ Auto-capture hooks ═══ */

  var _origCreatePV = R.createPlanVersion;
  if (_origCreatePV && !R._pv17_wrapped) {
    R.createPlanVersion = function (input) {
      input = input || {};
      var pv = _origCreatePV(input);
      pv.snapshot = input.snapshot || null;
      // [FIX:v17-planid] preserve planId
      pv.planId = input.planId || null;
      return pv;
    };
    R._pv17_wrapped = true;
  }

  var _origAddPV = R.store && R.store.addPlanVersion;
  if (_origAddPV && R.store && !R.store._pv17_wrapped) {
    var _origAddPVBound = _origAddPV;
    R.store.addPlanVersion = function (input) {
      input = input || {};
      if (!input.snapshot) {
        var s = _state();
        var pid = input.planId || (s && s.residency && s.residency.meta && s.residency.meta.activePlanId);
        var cap = PV.captureCurrentActivities(pid);
        if (cap) input.snapshot = cap;
      }
      return _origAddPVBound.call(R.store, input);
    };
    R.store._pv17_wrapped = true;
  }

  console.log("[planversion.v17] loaded");
})();