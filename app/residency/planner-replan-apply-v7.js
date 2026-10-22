/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Replan Apply v7
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.replan.apply.v7] R missing"); return; }
  var PRA = R.plannerReplanApply = R.plannerReplanApply || {};
  var PP = R.plannerProposal, TP = R.taskProjection;

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

  PRA.isAlreadyApplied = function (proposalId) {
    var s = _state();
    if (!s || !s.residency || !Array.isArray(s.residency.activities)) return false;
    return s.residency.activities.some(function (a) {
      return a && a.sourceType === "replanner" && a.sourceId === proposalId;
    });
  };

  /* ─── Phase 26.3: internal helpers for atomic apply ─── */
  function _deepCopy(x) {
    try { return JSON.parse(JSON.stringify(x)); } catch (e) { return x; }
  }

  function _takeSnapshot(s) {
    if (!s || !s.residency) return null;
    return {
      activities: _deepCopy(s.residency.activities || []),
      tasks: _deepCopy(s.tasks || []),
      reserveState: _deepCopy(s.residency.reserveState || null),
      planVersions: _deepCopy(s.residency.planVersions || []),
      replanTriggers: _deepCopy(s.replanTriggers || [])
    };
  }

  function _restoreSnapshot(s, snap) {
    if (!s || !s.residency || !snap) return;
    s.residency.activities = snap.activities;
    s.tasks = snap.tasks;
    s.residency.reserveState = snap.reserveState;
    s.residency.planVersions = snap.planVersions;
    s.replanTriggers = snap.replanTriggers;
  }

  function _maybeForceFail(step) {
    if (typeof window !== "undefined" && window.__PRA_FORCE_FAIL__ === step) {
      throw new Error("forced_fail@" + step);
    }
  }

  PRA.applyReplanProposal = function (proposal, options) {
    options = options || {};
    var warnings = [];
    if (!proposal || typeof proposal !== "object") return { success: false, reason: "invalid_proposal" };
    if (PRA.isAlreadyApplied(proposal.proposalId)) return { success: false, reason: "already_applied" };

    var s = _state();
    if (!s || !s.residency) return { success: false, reason: "no_state" };

    var plan = (s.residency.plans || []).find(function (p) { return p && p.id === proposal.planId; });
    if (!plan) return { success: false, reason: "plan_not_found" };

    // ─── Phase 26.3: Phase 1 — validate before any mutation ───
    if (!options.force) {
      // Fingerprint check — if fingerprint computation throws, reject (do not silently skip)
      if (proposal.fingerprint) {
        if (!(R.plannerProposal && R.plannerProposal.computeFingerprint && R.plannerSnapshot && R.plannerSnapshot.build)) {
          return { success: false, reason: "stale_proposal_fingerprint_check_unavailable" };
        }
        var _snapNow;
        var _fpNow;
        try {
          _snapNow = R.plannerSnapshot.build(proposal.planId, 'plan');
        } catch (e) {
          return { success: false, reason: "stale_proposal_fingerprint_compute_failed", error: String(e) };
        }
        if (!_snapNow) {
          return { success: false, reason: "stale_proposal_fingerprint_snapshot_missing" };
        }
        try {
          _fpNow = R.plannerProposal.computeFingerprint(_snapNow);
        } catch (e) {
          return { success: false, reason: "stale_proposal_fingerprint_compute_failed", error: String(e) };
        }
        if (!_fpNow) {
          return { success: false, reason: "stale_proposal_fingerprint_empty" };
        }
        if (_fpNow !== proposal.fingerprint) {
          return { success: false, reason: 'stale_proposal_fingerprint_mismatch' };
        }
      }

      // All cancelled activities must still exist
      var existingIds = (s.residency.activities || []).map(function (a) { return a.id; });
      var cancelledList = proposal.cancelledActivities || [];
      for (var i = 0; i < cancelledList.length; i++) {
        var c = cancelledList[i];
        if (!c || !c.id) continue;
        if (existingIds.indexOf(c.id) === -1) {
          return { success: false, reason: "stale_replan_proposal" };
        }
      }

      // Reserve integrity checks (pre-flight, same as mutation-phase check)
      if (proposal.reserve && proposal.reserve.consumedMinutes > 0) {
        var _b = proposal.reserve.beforeMinutes | 0;
        var _u = proposal.reserve.consumedMinutes | 0;
        var _a = proposal.reserve.afterMinutes | 0;
        if (_b - _u !== _a) {
          return { success: false, reason: "reserve_integrity_violation",
                   errors: ["reserve arithmetic mismatch: " + _b + " - " + _u + " !== " + _a] };
        }
        if (_u > _b) {
          return { success: false, reason: "reserve_overconsumption",
                   errors: ["cannot consume more than available: " + _u + " > " + _b] };
        }
      }

      // Proposed activities: page-range invariant
      var _prop = proposal.proposedActivities || [];
      for (var j = 0; j < _prop.length; j++) {
        var pa = _prop[j];
        if (!pa) continue;
        if (pa.plannedPageStart != null && pa.plannedPageEnd != null && pa.plannedPages != null) {
          var expected = pa.plannedPageEnd - pa.plannedPageStart + 1;
          if (expected !== pa.plannedPages) {
            return { success: false, reason: "proposed_activity_invalid",
                     errors: ["activity[" + j + "] page range mismatch: expected " + expected + " got " + pa.plannedPages] };
          }
        }
      }
    }

    // ─── Phase 26.3: Phase 2 — snapshot before mutation ───
    var _snap = _takeSnapshot(s);
    if (!_snap) return { success: false, reason: "snapshot_failed" };

    var cancelledIds = [];
    var createdIds = [];
    var createdTaskIds = [];
    var planVersionId = null;
    var currentStep = "init";

    try {
      _maybeForceFail("start");

      // 1. Cancel activities
      currentStep = "cancel";
      (proposal.cancelledActivities || []).forEach(function (c) {
        var a = (s.residency.activities || []).find(function (x) { return x && x.id === c.id; });
        if (!a) return;
        if (a.locked) { warnings.push({ type: "protected_activity_skipped", activityId: a.id }); return; }
        a.status = "cancelled";
        a.updatedAt = Date.now();
        cancelledIds.push(a.id);
        if (a.taskId) {
          var t = (s.tasks || []).find(function (x) { return x && x.id === a.taskId; });
          if (t) { t.completed = false; t.cancelled = true; t.updatedAt = Date.now(); }
        }
      });
      /* [PATCH:f5b-orphan] sweep: cancel orphan tasks whose activity is cancelled/missing */
      try {
        (s.tasks || []).forEach(function(t){
          if (!t) return;
          if (t.cancelled === true) return;
          if (t.sourceType !== "residency_activity" && t.sourceType !== "residencyActivity") return;
          var _src = t.residencyActivityId || t.sourceId;
          if (!_src) return;
          var _act = (s.residency.activities || []).find(function(x){ return x && x.id === _src; });
          if (!_act || _act.status === "cancelled" || _act.status === "skipped") {
            t.cancelled = true;
            t.updatedAt = Date.now();
          }
        });
      } catch (_sweepErr) { console.warn("[f5b] orphan sweep failed:", _sweepErr); }

      _maybeForceFail("cancel");

      // 2. Create new activities
      currentStep = "create";
      if (!Array.isArray(s.residency.activities)) s.residency.activities = [];
      (proposal.proposedActivities || []).forEach(function (src, idx) {
        var id = "act-" + proposal.proposalId + "-" + idx;
        createdIds.push(id);
        s.residency.activities.push({
          id: id,
          kind: src.kind || "study",
          planId: src.planId || proposal.planId,
          roundId: src.roundId || null,
          bookId: src.bookId || null,
          subjectId: src.subjectId || null,
          taskId: null,
          sourceType: "replanner",
          sourceId: proposal.proposalId,
          plannedDate: src.plannedDate || null,
          plannedStartTime: src.plannedStartTime || null,
          plannedDurationMinutes: src.plannedDurationMinutes || null,
          plannedPages: src.plannedPages || null,
          plannedPageStart: src.plannedPageStart || null,
          plannedPageEnd: src.plannedPageEnd || null,
          actualPages: 0, actualDurationMinutes: 0, actualPageRanges: [],
          status: "planned", locked: false, notes: src.notes || "",
          reviewTarget: null, reviewMeta: null, assessmentId: null,
          createdAt: Date.now(), updatedAt: Date.now()
        });
      });
      _maybeForceFail("create");

      // 3. Task projection
      currentStep = "syncTasks";
      if (TP && TP.syncActivityToTask) {
        createdIds.forEach(function (aid) {
          try {
            var r = TP.syncActivityToTask(aid);
            if (r && r.ok && r.taskId) createdTaskIds.push(r.taskId);
          } catch (e) {
            warnings.push({ type: "task_projection_failed", activityId: aid });
          }
        });
      }
      _maybeForceFail("syncTasks");

      // 4. Reserve consumption
      currentStep = "reserve";
      if (proposal.reserve && proposal.reserve.consumedMinutes > 0) {
        var _b2 = proposal.reserve.beforeMinutes | 0;
        var _u2 = proposal.reserve.consumedMinutes | 0;
        var _a2 = proposal.reserve.afterMinutes | 0;
        if (_b2 - _u2 !== _a2) {
          throw new Error("reserve_integrity_violation_during_mutation");
        }
        if (_u2 > _b2) {
          throw new Error("reserve_overconsumption_during_mutation");
        }
        if (!s.residency.reserveState) s.residency.reserveState = { consumedByPlan: {}, updatedAt: Date.now() };
        if (!s.residency.reserveState.consumedByPlan) s.residency.reserveState.consumedByPlan = {};
        var prev = s.residency.reserveState.consumedByPlan[proposal.planId] || 0;
        s.residency.reserveState.consumedByPlan[proposal.planId] = prev + _u2;
        s.residency.reserveState.updatedAt = Date.now();
      }
      _maybeForceFail("reserve");

      // 5. PlanVersion
      currentStep = "planVersion";
      if (R.store && R.store.addPlanVersion) {
        var existing = R.store.getPlanVersions() || [];
        var maxV = 0, latestId = null;
        existing.forEach(function (pv) {
          if (pv && pv.version > maxV) { maxV = pv.version; latestId = pv.id; }
        });
        existing.forEach(function (pv) {
          if (pv && pv.status === "active" && R.store.updatePlanVersion) {
            R.store.updatePlanVersion(pv.id, { status: "superseded" });
          }
        });
        var vhash = _hash(proposal.proposalId + "::" + createdIds.slice().sort().join("|"));
        var pv = R.store.addPlanVersion({
          version: maxV + 1,
          parentVersionId: latestId,
          triggerType: "replan",
          reason: "Replan (" + proposal.mode + ", " + proposal.strategy + "): " + (proposal.executionAnalysis && proposal.executionAnalysis.missedCount || 0) + " missed",
          status: "active",
          hash: vhash
        });
        if (pv) planVersionId = pv.id;
      }
      _maybeForceFail("planVersion");

      // 6. Clear ONLY covered triggers (atomic — inside transaction)
      currentStep = "clearTriggers";
      var coveredIds = Array.isArray(proposal.coveredTriggerIds) ? proposal.coveredTriggerIds : [];
      var clearedTriggerIds = [];
      if (coveredIds.length > 0 && Array.isArray(s.replanTriggers)) {
        var idSet = {};
        coveredIds.forEach(function (id) { if (id) idSet[id] = 1; });
        var remainingTriggers = [];
        s.replanTriggers.forEach(function (t) {
          if (!t) return;
          if (t.planId === proposal.planId && idSet[t.id]) {
            clearedTriggerIds.push(t.id);
            return;
          }
          remainingTriggers.push(t);
        });
        s.replanTriggers = remainingTriggers;
      }
      _maybeForceFail("clearTriggers");

      // Phase 26.3: single save for entire transaction
      _save();
      currentStep = "done";

      return {
        success: true,
        proposalId: proposal.proposalId,
        planVersionId: planVersionId,
        preserved: (proposal.preservedActivities || []).slice(),
        cancelled: cancelledIds,
        created: createdIds,
        createdTaskIds: createdTaskIds,
        recoveredPages: (proposal.statistics && proposal.statistics.proposedPages) || 0,
        recoveredMinutes: (proposal.statistics && proposal.statistics.proposedMinutes) || 0,
        reserveConsumed: (proposal.reserve && proposal.reserve.consumedMinutes) || 0,
        reserveRemaining: (proposal.reserve && proposal.reserve.afterMinutes) || 0,
        clearedTriggerIds: clearedTriggerIds,
        warnings: warnings
      };
    } catch (err) {
      // ─── Phase 26.3: Rollback on any failure ───
      _restoreSnapshot(s, _snap);
      _save();
      return {
        success: false,
        reason: "mutation_failed",
        step: currentStep,
        error: String(err && err.message || err),
        warnings: warnings
      };
    }
  };

  /* ─── Phase 26.3b: unit tests — pure, no real state mutation ─── */
  /* All tests operate on isolated mock objects or read-only calls.   */
  /* No `delete` / replace on real state. No `_savedCopy`.            */
  PRA.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    // ─── T1-T3: helpers exist ───
    t("T1: _takeSnapshot present", typeof _takeSnapshot === "function");
    t("T2: _restoreSnapshot present", typeof _restoreSnapshot === "function");
    t("T3: _maybeForceFail present", typeof _maybeForceFail === "function");

    // ─── T4: snapshot round-trips on isolated mock ───
    var mock = {
      residency: {
        activities: [{ id: "a1" }],
        reserveState: { consumedByPlan: {} },
        planVersions: []
      },
      tasks: [{ id: "t1" }],
      replanTriggers: [{ id: "rt1" }]
    };
    var snap = _takeSnapshot(mock);
    t("T4: snapshot has activities",
      snap && Array.isArray(snap.activities) && snap.activities.length === 1 &&
      snap.activities[0].id === "a1");

    // ─── T5: deep copy isolation (mock NOT affected by snap mutation) ───
    snap.activities.push({ id: "injected" });
    snap.tasks.push({ id: "injected" });
    snap.replanTriggers.push({ id: "injected" });
    t("T5: snapshot isolated from mock",
      mock.residency.activities.length === 1 &&
      mock.tasks.length === 1 &&
      mock.replanTriggers.length === 1);

    // ─── T6: restore brings mock back ───
    var backup = _takeSnapshot(mock);
    mock.residency.activities = [];
    mock.tasks = [];
    mock.replanTriggers = [];
    _restoreSnapshot(mock, backup);
    t("T6: restore activities + tasks + triggers",
      mock.residency.activities.length === 1 &&
      mock.tasks.length === 1 &&
      mock.replanTriggers.length === 1 &&
      mock.residency.activities[0].id === "a1");

    // ─── T7: force fail throws and flag cleared ───
    var threw = false;
    window.__PRA_FORCE_FAIL__ = "cancel";
    try {       /* [PATCH:f7c-harddelete] Physically remove future-planned activities with no progress */
      try {
        var _hdIds = {};
        cancelledIds.forEach(function (aid) {
          var _a = (s.residency.activities || []).find(function (x) { return x && x.id === aid; });
          if (!_a) return;
          if (typeof _a.actualPages === "number" && _a.actualPages > 0) return;
          if (_a.locked) return;
          _hdIds[aid] = true;
        });
        if (Object.keys(_hdIds).length > 0) {
          var _beforeCount = s.residency.activities.length;
          s.residency.activities = s.residency.activities.filter(function (x) { return x && !_hdIds[x.id]; });
          s.tasks = (s.tasks || []).filter(function (t) {
            if (!t) return false;
            if (t.sourceType !== "residency_activity" && t.sourceType !== "residencyActivity") return true;
            var ref = t.residencyActivityId || t.sourceId;
            if (!ref) return true;
            return !_hdIds[ref];
          });
          var _afterCount = s.residency.activities.length;
          console.log("[f7c-hd] hard-deleted", (_beforeCount - _afterCount), "activities with no progress");
        }
      } catch (_hdErr) {
        warnings.push({ type: "hard_delete_failed", message: String(_hdErr) });
        console.warn("[f7c-hd] failed:", _hdErr);
      }

      _maybeForceFail("cancel"); } catch (e) { threw = true; }
    window.__PRA_FORCE_FAIL__ = null;
    t("T7: force fail throws", threw === true);
    t("T7b: force fail flag cleared after test",
      window.__PRA_FORCE_FAIL__ === null || typeof window.__PRA_FORCE_FAIL__ === "undefined");

    // ─── T8: RT.clearByIds exists ───
    var RTtest = R && R.replanTrigger;
    t("T8: RT.clearByIds exists",
      !!(RTtest && typeof RTtest.clearByIds === "function"));

    // ─── T9: isAlreadyApplied callable ───
    t("T9: isAlreadyApplied callable",
      typeof PRA.isAlreadyApplied === "function");

    // ─── Capture real state reference before any apply call ───
    var sReal = (window.__os && window.__os.getState) ? window.__os.getState() : null;

    function _realSnapshot() {
      if (!sReal) return null;
      return JSON.stringify({
        act: sReal.residency ? sReal.residency.activities : null,
        tasks: sReal.tasks,
        trig: sReal.replanTriggers
      });
    }
    var sRefBefore = sReal;

    // ─── T10: null proposal → invalid_proposal, no mutation ───
    var pre10 = _realSnapshot();
    var r1 = PRA.applyReplanProposal(null, {});
    var post10 = _realSnapshot();
    t("T10: null proposal → invalid_proposal",
      r1 && r1.reason === "invalid_proposal");
    t("T10b: real state untouched by null apply",
      pre10 === post10);

    // ─── T11: empty proposal → not success, no mutation ───
    var pre11 = _realSnapshot();
    var r2 = PRA.applyReplanProposal({}, {});
    var post11 = _realSnapshot();
    t("T11: empty proposal → not success",
      r2 && r2.success === false);
    t("T11b: real state untouched by empty apply",
      pre11 === post11);

    // ─── T12: reference identity stable ───
    var sAfter = (window.__os && window.__os.getState) ? window.__os.getState() : null;
    t("T12: state reference identity stable", sAfter === sRefBefore);

    // ─── T13: force fail flag is null (safety) ───
    t("T13: no leftover __PRA_FORCE_FAIL__ flag",
      window.__PRA_FORCE_FAIL__ === null || typeof window.__PRA_FORCE_FAIL__ === "undefined");

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[planner.replan.apply.v7] loaded");
})();