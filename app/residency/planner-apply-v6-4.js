/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Apply v6.4
   Validate → Create Activities → Project Tasks → PlanVersion
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.apply.v6.4] R missing"); return; }
  var PApp = R.plannerApply = R.plannerApply || {};
  var PP = R.plannerProposal;
  var TP = R.taskProjection;
  var DOM = R;

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
  function _hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h &= 0xffffffff; }
    return Math.abs(h).toString(36);
  }
  function _mkId(p) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  /* ─── Compute CURRENT state fingerprint (must match proposal.fingerprint) ─── */
  PApp.computeCurrentFingerprint = function (proposal) {
    var snap = R.plannerSnapshot;
    if (!snap || !snap.build) return "";
    var fresh = snap.build(proposal.planId, proposal.scope, proposal.scopeParam);
    if (!fresh) return "";
    return PP.computeFingerprint(fresh);
  };

  /* ─── Check if proposal already applied ─── */
  PApp.isAlreadyApplied = function (proposalId) {
    var s = _state();
    if (!s || !s.residency || !Array.isArray(s.residency.activities)) return false;
    return s.residency.activities.some(function (a) {
      return a && a.sourceType === "planner" && a.sourceId === proposalId;
    });
  };

  /* ─── Apply ─── */
  PApp.applyPlannerProposal = function (proposal, options) {
    options = options || {};
    var warnings = [];

    // 1) Validate structure
    var errs = PP.validateProposal(proposal);
    if (errs.length > 0) {
      return { success: false, reason: "invalid_proposal", errors: errs, warnings: warnings };
    }

    // 2) Check plan still exists
    var s = _state();
    if (!s || !s.residency) {
      return { success: false, reason: "no_state", errors: ["state missing"], warnings: warnings };
    }
    var plan = null;
    (s.residency.plans || []).forEach(function (p) { if (p && p.id === proposal.planId) plan = p; });
    if (!plan) {
      return { success: false, reason: "plan_not_found", errors: ["plan " + proposal.planId + " not found"], warnings: warnings };
    }

    // 3) Idempotency — already applied?
    if (PApp.isAlreadyApplied(proposal.proposalId)) {
      return { success: false, reason: "already_applied", errors: ["proposal already applied"], warnings: warnings };
    }

    // 4) Stale check
    if (!options.force) {
      var currentFp = PApp.computeCurrentFingerprint(proposal);
      if (currentFp && currentFp !== proposal.fingerprint) {
        return { success: false, reason: "stale_proposal", errors: ["state has changed since proposal was generated"], warnings: warnings };
      }
    } else {
      warnings.push({ type: "force_apply", message: "stale check bypassed" });
    }

    // 5) Pre-build all activities/tasks in memory (atomicity prep)
    var activitiesToAdd = [];
    var activityIds = [];
    (proposal.proposedActivities || []).forEach(function (src, idx) {
      var id = "act-" + proposal.proposalId + "-" + idx;
      activityIds.push(id);
      // validate page range invariant
      var invariantOK = true;
      if (src.plannedPageStart != null && src.plannedPageEnd != null && src.plannedPages != null) {
        invariantOK = (src.plannedPageEnd - src.plannedPageStart + 1) === src.plannedPages;
      }
      if (!invariantOK) {
        return; // skip silently — should have been caught by validateProposal
      }
      activitiesToAdd.push({
        id: id,
        kind: src.kind || "study",
        planId: src.planId || proposal.planId,
        roundId: src.roundId || null,
        bookId: src.bookId || null,
        subjectId: src.subjectId || null,
        taskId: null,
        sourceType: "planner",
        sourceId: proposal.proposalId,
        plannedDate: src.plannedDate || null,
        plannedStartTime: src.plannedStartTime || null,
        plannedDurationMinutes: src.plannedDurationMinutes || null,
        plannedPages: src.plannedPages || null,
        plannedPageStart: src.plannedPageStart || null,
        plannedPageEnd: src.plannedPageEnd || null,
        actualPages: 0,
        actualDurationMinutes: 0,
        actualPageRanges: [],
        status: "planned",
        locked: false,
        notes: src.notes || "",
        reviewTarget: null,
        reviewMeta: null,
        assessmentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
    });

    // 6) Commit — push activities
    if (!Array.isArray(s.residency.activities)) s.residency.activities = [];
    var beforeLen = s.residency.activities.length;
    activitiesToAdd.forEach(function (a) { s.residency.activities.push(a); });

    // 7) Task projection for each activity (pure function via existing API)
    var createdTaskIds = [];
    if (TP && TP.syncActivityToTask) {
      activitiesToAdd.forEach(function (a) {
        try {
          var res = TP.syncActivityToTask(a.id);
          if (res && res.ok && res.taskId) createdTaskIds.push(res.taskId);
        } catch (e) {
          warnings.push({ type: "task_projection_failed", activityId: a.id, message: String(e) });
        }
      });
    }

    // 8) PlanVersion
    var planVersionId = null;
    if (DOM.store && DOM.store.addPlanVersion) {
      var existingVersions = DOM.store.getPlanVersions() || [];
      var maxVersion = 0;
      var latestId = null;
      existingVersions.forEach(function (pv) {
        if (pv && pv.version && pv.version > maxVersion) { maxVersion = pv.version; latestId = pv.id; }
      });
      // Supersede existing active versions
      existingVersions.forEach(function (pv) {
        if (pv && pv.status === "active" && DOM.store.updatePlanVersion) {
          DOM.store.updatePlanVersion(pv.id, { status: "superseded" });
        }
      });
      var versionHash = _hash(proposal.proposalId + ":" + activityIds.slice().sort().join("|"));
      var pv = DOM.store.addPlanVersion({
        version: maxVersion + 1,
        parentVersionId: latestId,
        triggerType: "initial_plan",
        reason: "Applied proposal " + proposal.proposalId,
        status: "active",
        hash: versionHash
      });
      if (pv) planVersionId = pv.id;
    }

    // 9) Save
    _save();

    return {
      success: true,
      proposalId: proposal.proposalId,
      planVersionId: planVersionId,
      createdActivityIds: activityIds,
      createdTaskIds: createdTaskIds,
      skippedActivityIds: [],
      warnings: warnings,
      statistics: {
        activitiesCreated: activitiesToAdd.length,
        tasksCreated: createdTaskIds.length,
        minutesApplied: activitiesToAdd.reduce(function (sum, a) { return sum + (a.plannedDurationMinutes || 0); }, 0),
        pagesApplied: activitiesToAdd.reduce(function (sum, a) { return sum + (a.plannedPages || 0); }, 0)
      }
    };
  };

  console.log("[planner.apply.v6.4] loaded");
})();