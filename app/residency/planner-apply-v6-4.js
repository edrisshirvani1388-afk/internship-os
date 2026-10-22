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
  /* ─── Content-based day key (regenerate-safe provenance) ─── */
  function _dayKey(planId, a) {
    if (!a) return "";
    return [
      planId || "",
      a.roundId || "",
      a.bookId || "",
      a.plannedDate || ""
    ].join("|");
  }

  function _activityAlreadyInState(s, planId, proposed) {
    if (!s || !s.residency || !Array.isArray(s.residency.activities)) return false;
    var key = _dayKey(planId, proposed);
    if (!key) return false;
    for (var i = 0; i < s.residency.activities.length; i++) {
      var a = s.residency.activities[i];
      if (!a) continue;
      if (a.kind && a.kind !== "study") continue;
      if (_dayKey(planId, a) === key) return true;
    }
    return false;
  }

  /* ─── Read-only: which proposed activities already exist in state? ─── */
  PApp.checkAppliedForDay = function (proposal, date) {
    if (!proposal || !date) return [];
    var s = _state();
    var list = (proposal.proposedActivities || []).filter(function (a) {
      return a && a.plannedDate === date;
    });
    return list.map(function (a) {
      return {
        plannedDate: a.plannedDate,
        roundId: a.roundId || null,
        bookId: a.bookId || null,
        plannedPageStart: a.plannedPageStart != null ? a.plannedPageStart : null,
        plannedPageEnd: a.plannedPageEnd != null ? a.plannedPageEnd : null,
        plannedPages: a.plannedPages != null ? a.plannedPages : null,
        plannedDurationMinutes: a.plannedDurationMinutes != null ? a.plannedDurationMinutes : null,
        alreadyAdded: _activityAlreadyInState(s, proposal.planId, a)
      };
    });
  };

  /* ─── Shared internal apply routine with optional date filter ─── */
  function _applyInternal(proposal, options) {
    options = options || {};
    var dateFilter = options.dateFilter || null;
    var warnings = [];

    // 1) Validate structure
    var errs = PP.validateProposal(proposal);
    if (errs.length > 0) {
      return { success: false, reason: "invalid_proposal", errors: errs, warnings: warnings };
    }

    // 2) Plan exists
    var s = _state();
    if (!s || !s.residency) {
      return { success: false, reason: "no_state", errors: ["state missing"], warnings: warnings };
    }
    var plan = null;
    (s.residency.plans || []).forEach(function (p) {
      if (p && p.id === proposal.planId) plan = p;
    });
    if (!plan) {
      return { success: false, reason: "plan_not_found",
               errors: ["plan " + proposal.planId + " not found"], warnings: warnings };
    }

    // 3) Index source activities (preserve original idx for stable IDs)
    var indexed = (proposal.proposedActivities || []).map(function (a, i) {
      return { src: a, idx: i };
    });

    // 4) Optional date filter
    if (dateFilter) {
      indexed = indexed.filter(function (x) { return x.src && x.src.plannedDate === dateFilter; });
      if (indexed.length === 0) {
        return { success: false, reason: "no_activities_for_date",
                 date: dateFilter, warnings: warnings };
      }
    }

    // 5) Content-based dedup — skip if (plan,round,book,date) already in state
    var toAdd = indexed.filter(function (x) {
      return !_activityAlreadyInState(s, proposal.planId, x.src);
    });
    var skippedCount = indexed.length - toAdd.length;

    // 6) Everything already exists → friendly no-op
    if (toAdd.length === 0) {
      return {
        success: true, alreadyExists: true,
        proposalId: proposal.proposalId,
        createdActivityIds: [], createdTaskIds: [],
        skippedActivityIds: indexed.map(function (x) {
          return "act-" + proposal.proposalId + "-" + x.idx;
        }),
        warnings: warnings,
        statistics: {
          activitiesCreated: 0, tasksCreated: 0,
          minutesApplied: 0, pagesApplied: 0, activitiesSkipped: skippedCount
        }
      };
    }

    // 7) Stale check (only for full apply, skipped for subset)
    if (!options.force && !dateFilter) {
      var currentFp = PApp.computeCurrentFingerprint(proposal);
      if (currentFp && currentFp !== proposal.fingerprint) {
        return { success: false, reason: "stale_proposal",
                 errors: ["state has changed since proposal was generated"], warnings: warnings };
      }
    }

    // 8) Build activities in memory
    var activitiesToAdd = [];
    var activityIds = [];
    toAdd.forEach(function (x) {
      var src = x.src;
      var invariantOK = true;
      if (src.plannedPageStart != null && src.plannedPageEnd != null && src.plannedPages != null) {
        invariantOK = (src.plannedPageEnd - src.plannedPageStart + 1) === src.plannedPages;
      }
      if (!invariantOK) return;
      var id = "act-" + proposal.proposalId + "-" + x.idx;
      activityIds.push(id);
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

    if (activitiesToAdd.length === 0) {
      return {
        success: true, alreadyExists: true,
        proposalId: proposal.proposalId,
        createdActivityIds: [], createdTaskIds: [],
        skippedActivityIds: indexed.map(function (x) {
          return "act-" + proposal.proposalId + "-" + x.idx;
        }),
        warnings: warnings,
        statistics: {
          activitiesCreated: 0, tasksCreated: 0,
          minutesApplied: 0, pagesApplied: 0, activitiesSkipped: skippedCount
        }
      };
    }

    // 9) Commit activities
    if (!Array.isArray(s.residency.activities)) s.residency.activities = [];
    activitiesToAdd.forEach(function (a) { s.residency.activities.push(a); });

    // 10) Task projection
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

    // 11) PlanVersion (full apply only — skipped for subset)
    if (!dateFilter && DOM.store && DOM.store.addPlanVersion) {
      try {
        var existingVersions = DOM.store.getPlanVersions ? (DOM.store.getPlanVersions() || []) : [];
        var maxVersion = 0, latestId = null;
        existingVersions.forEach(function (pv) {
          if (pv && pv.version && pv.version > maxVersion) { maxVersion = pv.version; latestId = pv.id; }
        });
        existingVersions.forEach(function (pv) {
          if (pv && pv.status === "active" && DOM.store.updatePlanVersion) {
            DOM.store.updatePlanVersion(pv.id, { status: "superseded" });
          }
        });
        var versionHash = _hash(proposal.proposalId + ":" + activityIds.slice().sort().join("|"));
        DOM.store.addPlanVersion({
          version: maxVersion + 1,
          parentVersionId: latestId,
          triggerType: "initial_plan",
          reason: "Applied proposal " + proposal.proposalId,
          status: "active",
          hash: versionHash
        });
      } catch (e) {
        warnings.push({ type: "plan_version_failed", message: String(e) });
      }
    }

    // 12) Save
    _save();

    return {
      success: true, alreadyExists: false,
      proposalId: proposal.proposalId,
      createdActivityIds: activityIds,
      createdTaskIds: createdTaskIds,
      skippedActivityIds: [],
      warnings: warnings,
      statistics: {
        activitiesCreated: activitiesToAdd.length,
        tasksCreated: createdTaskIds.length,
        minutesApplied: activitiesToAdd.reduce(function (sum, a) {
          return sum + (a.plannedDurationMinutes || 0);
        }, 0),
        pagesApplied: activitiesToAdd.reduce(function (sum, a) {
          return sum + (a.plannedPages || 0);
        }, 0),
        activitiesSkipped: skippedCount
      }
    };
  }

  /* ─── Public: Full apply (bulk) — content-dedup for safety ─── */
  PApp.applyPlannerProposal = function (proposal, options) {
    return _applyInternal(proposal, options || {});
  };

  /* ─── Public: Per-day subset apply ─── */
  PApp.applyProposalSubset = function (proposal, opts) {
    opts = opts || {};
    if (!opts.date) {
      return { success: false, reason: "missing_date", warnings: [] };
    }
    return _applyInternal(proposal, {
      dateFilter: opts.date,
      force: opts.force === true
    });
  };

  /* ─── Focused tests for per-day workflow (Phase 1) ─── */
  PApp.__tests = function () {
    var results = [];
    function _t(id, name, pass, expected, got, reason) {
      results.push({ id: id, name: name, passed: !!pass, expected: expected, got: got, reason: reason || null });
    }
    function _state() {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      return s;
    }

    var s = _state();
    if (!s || !s.residency) {
      return { passed: 0, total: 4, results: [
        { id: "PD0", name: "state available", passed: false, expected: "state", got: "no state", reason: "no residency state" }
      ]};
    }

    // Backup: snapshot activities + tasks arrays
    var backupActivities = (s.residency.activities || []).slice();
    var backupTasks = (s.tasks || []).slice();
    var backupPlans = (s.residency.plans || []).slice();

    try {
      // Synthetic plan + proposal
      var testPlanId = "__pd_test_plan__";
      var testDate1 = "1405/8/01";
      var testDate2 = "1405/8/02";

      // Ensure test plan exists
      var hasPlan = false;
      for (var pi = 0; pi < (s.residency.plans || []).length; pi++) {
        if (s.residency.plans[pi].id === testPlanId) { hasPlan = true; break; }
      }
      if (!hasPlan) {
        s.residency.plans.push({ id: testPlanId, title: "PD-Test", examDate: "1405/9/01", status: "active" });
      }

      function mkAct(date, pageStart, pageEnd) {
        return {
          kind: "study",
          planId: testPlanId,
          roundId: "rnd-pd",
          bookId: "bk-pd",
          subjectId: "sb-pd",
          plannedDate: date,
          plannedStartTime: "08:00",
          plannedDurationMinutes: 60,
          plannedPages: (pageEnd - pageStart + 1),
          plannedPageStart: pageStart,
          plannedPageEnd: pageEnd
        };
      }

      function mkProposal(activities, pId) {
        return {
          version: 1,
          proposalId: pId || ("prop-pd-" + Date.now().toString(36)),
          planId: testPlanId,
          fingerprint: "fp-pd-test",
          feasibility: { status: "feasible" },
          proposedActivities: activities
        };
      }

      function countActivitiesAt(date) {
        var arr = s.residency.activities || [];
        var n = 0;
        for (var i = 0; i < arr.length; i++) {
          if (arr[i] && arr[i].planId === testPlanId && arr[i].plannedDate === date) n++;
        }
        return n;
      }

      // ─── T1: only selected day committed ───
      var prop1 = mkProposal([ mkAct(testDate1, 1, 10), mkAct(testDate2, 11, 20) ]);
      var r1 = PApp.applyProposalSubset(prop1, { date: testDate1, force: true });
      var d1Count = countActivitiesAt(testDate1);
      var d2Count = countActivitiesAt(testDate2);
      var ok1 = r1.success === true && d1Count === 1 && d2Count === 0;
      _t("PD1", "subset commits only selected day", ok1,
         "d1=1 d2=0 success=true", "d1=" + d1Count + " d2=" + d2Count + " success=" + r1.success);

      // ─── T2: idempotent (same day twice) ───
      var r2 = PApp.applyProposalSubset(prop1, { date: testDate1, force: true });
      var d1CountAfter = countActivitiesAt(testDate1);
      var ok2 = d1CountAfter === 1 && (r2.alreadyExists === true || (r2.statistics && r2.statistics.activitiesCreated === 0));
      _t("PD2", "same day applied twice → no duplicate", ok2,
         "d1=1 alreadyExists=true", "d1=" + d1CountAfter + " alreadyExists=" + r2.alreadyExists);

      // ─── T3: different date independent ───
      var r3 = PApp.applyProposalSubset(prop1, { date: testDate2, force: true });
      var d1Final = countActivitiesAt(testDate1);
      var d2Final = countActivitiesAt(testDate2);
      var ok3 = r3.success === true && d1Final === 1 && d2Final === 1;
      _t("PD3", "date B added after A — A preserved", ok3,
         "d1=1 d2=1", "d1=" + d1Final + " d2=" + d2Final);

      // ─── T4: bulk after subset → no duplication ───
      var r4 = PApp.applyPlannerProposal(prop1, { force: true });
      var d1AfterBulk = countActivitiesAt(testDate1);
      var d2AfterBulk = countActivitiesAt(testDate2);
      var ok4 = d1AfterBulk === 1 && d2AfterBulk === 1;
      _t("PD4", "bulk after subsets → no duplicates", ok4,
         "d1=1 d2=1", "d1=" + d1AfterBulk + " d2=" + d2AfterBulk);

    } catch (e) {
      _t("PD-ERR", "unexpected exception", false, "no exception", String(e && e.message || e));
    } finally {
      // Restore state
      s.residency.activities = backupActivities;
      s.tasks = backupTasks;
      s.residency.plans = backupPlans;
      if (window.__os && window.__os.saveState) {
        try { window.__os.saveState(); } catch (e) {}
      }
    }

    var passed = results.filter(function (r) { return r.passed; }).length;
    return { passed: passed, total: results.length, results: results };
  };

  console.log("[planner.apply.v6.4] loaded");
})();
