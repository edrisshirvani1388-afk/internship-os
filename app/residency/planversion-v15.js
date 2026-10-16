(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planversion.v15] R missing"); return; }
  var PV = R.planVersion = R.planVersion || {};
  var LIB = window.InternshipLib;

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _save() { if (window.__os && window.__os.saveState) { try { window.__os.saveState(); } catch (e) {} } }

  function _snapshotHashes() {
    var s = _state();
    if (!s || !s.residency) return {};
    var out = {};
    // We store an activity hash per version by capturing ids at version creation time.
    // If PlanVersion doesn't persist per-activity data, we can only diff current vs. snapshot if we store snapshots.
    // For safety, we don't attempt to reconstruct snapshots; we just expose metadata.
    (s.residency.planVersions || []).forEach(function (v) {
      if (v && v.id) out[v.id] = { id: v.id, version: v.version, triggerType: v.triggerType, reason: v.reason, status: v.status, createdAt: v.createdAt || null };
    });
    return out;
  }

  PV.listDetailed = function () {
    var s = _state();
    if (!s || !s.residency) return [];
    return (s.residency.planVersions || []).slice().sort(function (a, b) { return (b.version || 0) - (a.version || 0); }).map(function (v) {
      return {
        id: v.id,
        version: v.version || 0,
        triggerType: v.triggerType || "unknown",
        status: v.status || "active",
        reason: v.reason || "",
        createdAt: v.createdAt || v.at || null,
        parentVersionId: v.parentVersionId || null,
        hash: v.hash || null
      };
    });
  };

  PV.getById = function (id) {
    var s = _state();
    if (!s || !s.residency) return null;
    return (s.residency.planVersions || []).find(function (v) { return v && v.id === id; }) || null;
  };

  // ─── Derive current state snapshot (for preview/diff) ───
  PV.captureCurrentActivities = function () {
    var s = _state();
    if (!s || !s.residency) return [];
    return (s.residency.activities || []).map(function (a) {
      return {
        id: a.id, kind: a.kind, title: a.title,
        plannedDate: a.plannedDate, plannedStartTime: a.plannedStartTime,
        plannedDurationMinutes: a.plannedDurationMinutes, plannedPages: a.plannedPages,
        status: a.status, locked: !!a.locked,
        sourceType: a.sourceType, sourceId: a.sourceId,
        bookId: a.bookId, roundId: a.roundId
      };
    });
  };

  // ─── Revert preview (non-destructive) ───
  PV.previewRevert = function (versionId, options) {
    options = options || {};
    var target = PV.getById(versionId);
    if (!target) return { ok: false, error: "version_not_found" };

    // We can't deterministically reconstruct historical snapshot unless we stored it.
    // Safety: return a preview that explains what can and cannot be reverted.
    var current = PV.captureCurrentActivities();
    var protectedIds = current.filter(function (a) {
      return a.locked || a.status === "completed" || a.status === "cancelled" || a.status === "skipped";
    }).map(function (a) { return a.id; });

    return {
      ok: true,
      versionId: versionId,
      targetVersion: target.version,
      targetTrigger: target.triggerType,
      currentActivityCount: current.length,
      protectedCount: protectedIds.length,
      protectedIds: protectedIds,
      canRevert: false,
      note: "Phase 15: full state snapshots per version are not stored. Revert-as-new-proposal is available only when a revert plan is provided.",
      actionable: false
    };
  };

  // ─── Revert apply (guarded, append-only) ───
  PV.applyRevert = function (versionId, revertPlan, options) {
    options = options || {};
    if (!revertPlan || !Array.isArray(revertPlan.changes)) {
      return { success: false, reason: "no_revert_plan" };
    }
    var s = _state();
    if (!s || !s.residency) return { success: false, reason: "no_state" };
    var plan = s.residency.plans && s.residency.plans.find(function (p) { return p.id === s.residency.meta.activePlanId; });
    if (!plan) return { success: false, reason: "no_active_plan" };

    var applied = [], skipped = [];
    revertPlan.changes.forEach(function (c) {
      if (!c || !c.activityId) return;
      var act = (s.residency.activities || []).find(function (x) { return x.id === c.activityId; });
      if (!act) { skipped.push({ activityId: c.activityId, reason: "not_found" }); return; }
      if (act.locked || act.status === "completed" || act.status === "cancelled" || act.status === "skipped") {
        skipped.push({ activityId: c.activityId, reason: "protected" });
        return;
      }
      var patch = {};
      if (c.to && c.to.plannedDate) patch.plannedDate = c.to.plannedDate;
      if (c.to && c.to.plannedStartTime !== undefined) patch.plannedStartTime = c.to.plannedStartTime;
      if (c.to && c.to.plannedDurationMinutes != null) patch.plannedDurationMinutes = c.to.plannedDurationMinutes;
      if (Object.keys(patch).length === 0) { skipped.push({ activityId: c.activityId, reason: "no_patch" }); return; }
      var res = R.store.updateActivity(c.activityId, patch);
      if (res) applied.push(c.activityId);
      else skipped.push({ activityId: c.activityId, reason: "store_rejected" });
    });

    if (applied.length === 0) {
      return { success: false, reason: "nothing_applied", skipped: skipped };
    }

    // Append-only new PlanVersion
    var versions = R.store.getPlanVersions() || [];
    var maxV = 0, latestId = null;
    versions.forEach(function (v) { if (v && v.version > maxV) { maxV = v.version; latestId = v.id; } });
    versions.forEach(function (v) {
      if (v && v.status === "active" && R.store.updatePlanVersion) {
        R.store.updatePlanVersion(v.id, { status: "superseded" });
      }
    });
    var pv = R.store.addPlanVersion({
      version: maxV + 1,
      parentVersionId: latestId,
      triggerType: "revert",
      reason: "Revert to v" + (PV.getById(versionId) ? PV.getById(versionId).version : "?") + " (" + applied.length + " changes)",
      status: "active",
      hash: "revert-" + versionId
    });

    _save();
    return { success: true, applied: applied, skipped: skipped, planVersionId: pv ? pv.id : null };
  };

  // ─── Build a simple diff between two versions of activity lists ───
  PV.compareActivityLists = function (before, after) {
    if (R.plannerDiff) return R.plannerDiff.compare(before, after);
    return { added: [], modified: [], cancelled: [], preserved: [] };
  };

  // ─── Compare two PlanVersions (metadata + optional activity lists) ───
  PV.compareVersions = function (idA, idB, listsA, listsB) {
    var vA = PV.getById(idA);
    var vB = PV.getById(idB);
    var out = {
      a: vA, b: vB,
      metadataDiff: {},
      activityDiff: null
    };
    if (vA && vB) {
      if (vA.triggerType !== vB.triggerType) out.metadataDiff.triggerType = { before: vA.triggerType, after: vB.triggerType };
      if (vA.reason !== vB.reason) out.metadataDiff.reason = { before: vA.reason, after: vB.reason };
    }
    if (listsA && listsB) {
      out.activityDiff = PV.compareActivityLists(listsA, listsB);
    }
    return out;
  };

  console.log("[planversion.v15] loaded");
})();