(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.apply.v10] R missing"); return; }
  var RA = R.reviewApply = R.reviewApply || {};

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

  RA.isAlreadyApplied = function (proposalId) {
    var s = _state();
    if (!s || !s.residency) return false;
    return (s.residency.activities || []).some(function (a) {
      return a && a.sourceType === "review_scheduler" && a.sourceId === proposalId;
    });
  };

  RA.apply = function (proposal, options) {
    options = options || {};
    if (!proposal) return { success: false, reason: "no_proposal" };
    if (RA.isAlreadyApplied(proposal.proposalId)) return { success: false, reason: "already_applied" };
    var s = _state();
    if (!s || !s.residency) return { success: false, reason: "no_state" };

    var createdIds = [], taskIds = [], warnings = [];

    (proposal.proposedActivities || []).forEach(function (src, idx) {
      var newId = "act-" + proposal.proposalId + "-r" + idx;
      var dup = (s.residency.activities || []).some(function (a) {
        if (!a || a.kind !== "review") return false;
        if (a.status === "cancelled" || a.status === "skipped") return false;
        if (a.plannedDate !== src.plannedDate) return false;
        if (!a.reviewTarget || !src.reviewTarget) return false;
        return a.reviewTarget.reviewStateId === src.reviewTarget.reviewStateId;
      });
      if (dup) {
        warnings.push({ type: "duplicate_review", reviewStateId: src.reviewTarget && src.reviewTarget.reviewStateId });
        return;
      }
      s.residency.activities.push({
        id: newId,
        kind: "review",
        planId: src.planId || null,
        roundId: src.roundId || null,
        bookId: src.bookId || null,
        subjectId: src.subjectId || null,
        taskId: null,
        sourceType: "review_scheduler",
        sourceId: proposal.proposalId,
        plannedDate: src.plannedDate,
        plannedStartTime: src.plannedStartTime || null,
        plannedDurationMinutes: src.plannedDurationMinutes || 15,
        plannedPages: null,
        plannedPageStart: null,
        plannedPageEnd: null,
        actualPages: 0,
        actualDurationMinutes: 0,
        actualPageRanges: [],
        status: "planned",
        locked: false,
        notes: src.notes || "",
        reviewTarget: src.reviewTarget,
        reviewMeta: src.reviewMeta,
        assessmentId: null,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      createdIds.push(newId);
    });

    if (createdIds.length === 0) {
      // Every proposed activity was a duplicate of an existing one.
      // Treat as already applied (idempotent).
      return { success: false, reason: "already_applied",
               warnings: warnings, statistics: { activitiesCreated: 0, tasksCreated: 0, minutesApplied: 0 } };
    }

    if (R.taskProjection && R.taskProjection.syncActivityToTask) {
      createdIds.forEach(function (aid) {
        try {
          var res = R.taskProjection.syncActivityToTask(aid);
          if (res && res.ok && res.taskId) taskIds.push(res.taskId);
        } catch (e) {
          warnings.push({ type: "task_projection_failed", activityId: aid });
        }
      });
    }

    var planVersionId = null;
    if (R.store && R.store.addPlanVersion) {
      var versions = R.store.getPlanVersions() || [];
      var maxV = 0, latestId = null;
      versions.forEach(function (pv) {
        if (pv && pv.version > maxV) { maxV = pv.version; latestId = pv.id; }
      });
      versions.forEach(function (pv) {
        if (pv && pv.status === "active" && R.store.updatePlanVersion) {
          R.store.updatePlanVersion(pv.id, { status: "superseded" });
        }
      });
      var pv = R.store.addPlanVersion({
        version: maxV + 1,
        parentVersionId: latestId,
        triggerType: "review_schedule",
        reason: "Review proposal " + proposal.proposalId + " (" + createdIds.length + " items)",
        status: "active",
        hash: proposal.proposalId
      });
      if (pv) planVersionId = pv.id;
    }

    _save();
    var totalMin = 0;
    (proposal.proposedActivities || []).forEach(function (a) { totalMin += (a.plannedDurationMinutes || 0); });

    return {
      success: true,
      proposalId: proposal.proposalId,
      planVersionId: planVersionId,
      createdActivityIds: createdIds,
      createdTaskIds: taskIds,
      warnings: warnings,
      statistics: {
        activitiesCreated: createdIds.length,
        tasksCreated: taskIds.length,
        minutesApplied: totalMin
      }
    };
  };

  console.log("[InternshipResidency.review.apply.v10] loaded");
})();