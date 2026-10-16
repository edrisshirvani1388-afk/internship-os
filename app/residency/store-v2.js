/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Store v2 (Phase 2)
   Adds Plans, Subjects, derived queries, dup-prevention,
   safe Book removal.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.store.v2] R missing"); return; }
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
    ["plans","subjects","books","rounds","enrollments","goals",
     "activities","assessments","capacityProfiles","dayOverrides",
     "manualOverrides","planVersions"].forEach(function (k) {
      if (!Array.isArray(rs[k])) rs[k] = [];
    });
    return rs;
  }
  var _saveCallCount = 0;
  function _save() {
    _saveCallCount++;
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _touch() {
    var rs = _rs(); if (rs && rs.meta) rs.meta.updatedAt = Date.now();
  }

  // ════════ PLANS ════════
  S.getPlans = function () { var rs = _ensure(); return rs ? rs.plans.slice() : []; };
  S.getPlan = function (id) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.plans.length; i++) if (rs.plans[i].id === id) return rs.plans[i];
    return null;
  };
  S.addPlan = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var p = DOM.createResidencyPlan(input);
    var errs = DOM.validateResidencyPlan(p);
    if (errs.length) { console.warn("[residency.store] addPlan:", errs); return null; }
    rs.plans.push(p);
    if (!rs.meta.activePlanId && p.status === "active") rs.meta.activePlanId = p.id;
    _touch(); _save();
    return p;
  };
  S.updatePlan = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var p = null;
    for (var i = 0; i < rs.plans.length; i++) if (rs.plans[i].id === id) { p = rs.plans[i]; break; }
    if (!p) return null;
    Object.assign(p, patch || {}, { id: p.id, updatedAt: Date.now() });
    _touch(); _save();
    return p;
  };
  S.archivePlan = function (id) { return S.updatePlan(id, { status: "archived" }); };
  S.setActivePlan = function (id) {
    var rs = _ensure(); if (!rs) return false;
    if (id) {
      var found = rs.plans.some(function (p) { return p && p.id === id; });
      if (!found) return false;
    }
    rs.meta.activePlanId = id || null;
    _touch(); _save();
    return true;
  };

  // ════════ SUBJECTS ════════
  S.getSubjects = function () { var rs = _ensure(); return rs ? rs.subjects.slice() : []; };
  S.getSubject = function (id) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.subjects.length; i++) if (rs.subjects[i].id === id) return rs.subjects[i];
    return null;
  };
  S.addSubject = function (input) {
    var rs = _ensure(); if (!rs) return null;
    var s = DOM.createSubject(input);
    var errs = DOM.validateSubject(s);
    if (errs.length) { console.warn("[residency.store] addSubject:", errs); return null; }
    rs.subjects.push(s); _touch(); _save();
    return s;
  };
  S.updateSubject = function (id, patch) {
    var rs = _ensure(); if (!rs) return null;
    var s = null;
    for (var i = 0; i < rs.subjects.length; i++) if (rs.subjects[i].id === id) { s = rs.subjects[i]; break; }
    if (!s) return null;
    Object.assign(s, patch || {}, { id: s.id, updatedAt: Date.now() });
    _touch(); _save();
    return s;
  };
  S.archiveSubject = function (id) { return S.updateSubject(id, { active: false }); };

  // ════════ DERIVED QUERIES ════════
  S.getBooksBySubject = function (subjectId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.books.filter(function (b) { return b && b.subjectId === subjectId; });
  };
  S.getRoundsForPlan = function (planId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.rounds
      .filter(function (r) { return r && r.planId === planId; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  };
  S.getEnrollmentsForRound = function (roundId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.enrollments.filter(function (e) { return e && e.roundId === roundId; });
  };
  S.getEnrollmentsForBook = function (bookId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.enrollments.filter(function (e) { return e && e.bookId === bookId; });
  };
  S.getEnrollmentForBookRound = function (bookId, roundId) {
    var rs = _ensure(); if (!rs) return null;
    for (var i = 0; i < rs.enrollments.length; i++) {
      var e = rs.enrollments[i];
      if (e.bookId === bookId && e.roundId === roundId) return e;
    }
    return null;
  };
  S.getBooksForRound = function (roundId) {
    var rs = _ensure(); if (!rs) return [];
    var ids = {};
    S.getEnrollmentsForRound(roundId).forEach(function (e) { ids[e.bookId] = 1; });
    return rs.books.filter(function (b) { return b && ids[b.id]; });
  };
  S.getBooksForPlan = function (planId) {
    var rs = _ensure(); if (!rs) return [];
    var rounds = S.getRoundsForPlan(planId);
    var bookIds = {};
    rounds.forEach(function (r) {
      S.getEnrollmentsForRound(r.id).forEach(function (e) { bookIds[e.bookId] = 1; });
    });
    return rs.books.filter(function (b) { return b && bookIds[b.id]; });
  };
  S.getSubjectsForPlan = function (planId) {
    var books = S.getBooksForPlan(planId);
    var subjIds = {};
    books.forEach(function (b) { if (b.subjectId) subjIds[b.subjectId] = 1; });
    return S.getSubjects().filter(function (s) { return s && subjIds[s.id]; });
  };
  S.getGoalsForPlan = function (planId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.goals.filter(function (g) { return g && g.planId === planId; });
  };
  S.getGoalsForRound = function (roundId) {
    var rs = _ensure(); if (!rs) return [];
    return rs.goals.filter(function (g) { return g && g.scopeType === "round" && g.scopeId === roundId; });
  };
  S.reorderRounds = function (planId, orderedIds) {
    var rs = _ensure(); if (!rs) return false;
    var rounds = S.getRoundsForPlan(planId);
    var idToOrder = {};
    orderedIds.forEach(function (id, i) { idToOrder[id] = i + 1; });
    rounds.forEach(function (r) {
      if (idToOrder[r.id]) {
        for (var j = 0; j < rs.rounds.length; j++) {
          if (rs.rounds[j].id === r.id) { rs.rounds[j].order = idToOrder[r.id]; break; }
        }
      }
    });
    _touch(); _save();
    return true;
  };

  // ════════ DUPLICATE PREVENTION ════════
  var _origAddEnrollment = S.addEnrollment;
  S.addEnrollment = function (input) {
    input = input || {};
    if (input.bookId && input.roundId) {
      var existing = S.getEnrollmentForBookRound(input.bookId, input.roundId);
      if (existing) {
        return S.updateEnrollment(existing.id, {
          mode: input.mode != null ? input.mode : existing.mode,
          targetCoveragePercent: input.targetCoveragePercent != null ? input.targetCoveragePercent : existing.targetCoveragePercent,
          useCustomSpeed: input.useCustomSpeed != null ? !!input.useCustomSpeed : existing.useCustomSpeed,
          customPagesPerHour: input.customPagesPerHour != null ? input.customPagesPerHour : existing.customPagesPerHour,
          studyOrder: input.studyOrder != null ? input.studyOrder : existing.studyOrder,
          notes: input.notes != null ? input.notes : existing.notes
        });
      }
    }
    return _origAddEnrollment(input);
  };

  // ════════ SAFE BOOK REMOVAL ════════
  var _origRemoveBook = S.removeBook;
  S.removeBook = function (id) {
    var enrollments = S.getEnrollmentsForBook(id);
    var activities = S.getActivities({ bookId: id });
    if (enrollments.length > 0 || activities.length > 0) {
      console.warn("[residency.store] Book has " + enrollments.length +
        " enrollments + " + activities.length +
        " activities → archiving instead of removing");
      S.updateBook(id, { status: "archived" });
      return false;
    }
    return _origRemoveBook(id);
  };

  
  /* ═══════════════════════════════════════════════════════════
     Phase 22.1 — Atomic applyRounds
     چند Round را یکجا، امن و اتمیک ذخیره می‌کند.
     - snapshot → apply → validate → commit یا rollback
     - در صورت خطا: هیچ state mutation باقی نمی‌ماند
     - در صورت موفقیت: فقط یک _save()
     ═══════════════════════════════════════════════════════════ */

  function _cloneRoundForSnapshot(r) {
    return {
      id: r.id,
      planId: r.planId,
      order: r.order,
      title: r.title,
      startDate: r.startDate,
      endDate: r.endDate,
      status: r.status,
      allocationMode: r.allocationMode,
      manualAllocation: r.manualAllocation ? JSON.parse(JSON.stringify(r.manualAllocation)) : r.manualAllocation,
      studySpeedPagesPerHour: r.studySpeedPagesPerHour,
      locked: r.locked,
      notes: r.notes,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    };
  }

  function _findRoundIndex(rs, id) {
    for (var i = 0; i < rs.rounds.length; i++) {
      if (rs.rounds[i] && rs.rounds[i].id === id) return i;
    }
    return -1;
  }

  function _restoreRounds(rs, snapshot) {
    // snapshot: { [id]: cloned-round }
    Object.keys(snapshot).forEach(function (id) {
      var idx = _findRoundIndex(rs, id);
      if (idx >= 0) {
        rs.rounds[idx] = snapshot[id];
      }
    });
  }

  S.applyRounds = function (updates) {
    var rs = _ensure();
    if (!rs) {
      return { ok: false, rolledBack: false, error: "no_state" };
    }
    if (!Array.isArray(updates)) {
      return { ok: false, rolledBack: false, error: "invalid_input_not_array" };
    }
    if (updates.length === 0) {
      return { ok: true, applied: [] };
    }

    // ─── مرحله ۱: Snapshot و اعتبارسنجی اولیه ورودی ───
    var snapshot = {};
    var seenIds = {};

    for (var i = 0; i < updates.length; i++) {
      var u = updates[i];
      if (!u || typeof u !== "object") {
        return { ok: false, rolledBack: false, error: "invalid_update_at_" + i };
      }
      if (!u.id || typeof u.id !== "string") {
        return { ok: false, rolledBack: false, error: "missing_id_at_" + i };
      }
      if (seenIds[u.id]) {
        return { ok: false, rolledBack: false, error: "duplicate_update:" + u.id };
      }
      seenIds[u.id] = 1;

      var idx = _findRoundIndex(rs, u.id);
      if (idx < 0) {
        return { ok: false, rolledBack: false, error: "round_not_found:" + u.id };
      }
      snapshot[u.id] = _cloneRoundForSnapshot(rs.rounds[idx]);
    }

    // ─── مرحله ۲: Apply ───
    var preApplyIds = [];
    try {
      for (var k = 0; k < updates.length; k++) {
        var uu = updates[k];
        var kIdx = _findRoundIndex(rs, uu.id);
        if (kIdx < 0) {
          // این حالت نباید رخ دهد (چون در مرحله ۱ چک شد)، ولی امنیت
          throw new Error("round_disappeared_mid_apply:" + uu.id);
        }
        var target = rs.rounds[kIdx];
        var originalId = target.id;
        // merge patch
        for (var key in uu) {
          if (!Object.prototype.hasOwnProperty.call(uu, key)) continue;
          if (key === "id") continue;
          target[key] = uu[key];
        }
        target.id = originalId;
        target.updatedAt = Date.now();
        preApplyIds.push(originalId);
      }
    } catch (e) {
      _restoreRounds(rs, snapshot);
      return { ok: false, rolledBack: true, error: "apply_exception:" + String(e && e.message || e) };
    }

    // ─── مرحله ۳: Validation ───
    var errs = [];
    try {
      var st = window.__os && typeof window.__os.getState === "function"
        ? window.__os.getState()
        : null;
      if (st && DOM && typeof DOM.checkRefs === "function") {
        errs = DOM.checkRefs(st) || [];
      }
    } catch (e) {
      errs = ["checkRefs_threw:" + String(e && e.message || e)];
    }

    if (errs.length > 0) {
      _restoreRounds(rs, snapshot);
      return {
        ok: false,
        rolledBack: true,
        error: "validation:" + errs.join(";")
      };
    }

    // ─── مرحله ۴: Commit — فقط یک save ───
    _touch();
    _save();

    return {
      ok: true,
      applied: preApplyIds.slice()
    };
  };

  // ─── Helpers تست ───
  S.__saveCountReset = function () { _saveCallCount = 0; };
  S.__saveCount = function () { return _saveCallCount; };

  S.__applyRoundsTests = function () {
    var results = [];
    var rs = _rs();
    if (!rs) {
      return { passed: 0, total: 4, results: [
        { id: "P0", name: "no state", passed: false, reason: "no residency state" }
      ]};
    }

    var TEST_ID_1 = "__p221_test_r1__";
    var TEST_ID_2 = "__p221_test_r2__";

    // حذف قبلی‌ها اگه بودن
    rs.rounds = rs.rounds.filter(function (r) {
      return r && r.id !== TEST_ID_1 && r.id !== TEST_ID_2;
    });

    function _mkTestRound(id, order, startD, endD) {
      return {
        id: id, planId: null, order: order,
        title: "TEST-" + order,
        startDate: startD, endDate: endD,
        status: "planned", allocationMode: "algorithmic",
        manualAllocation: {}, studySpeedPagesPerHour: null,
        locked: false, notes: "",
        createdAt: Date.now(), updatedAt: Date.now()
      };
    }

    rs.rounds.push(_mkTestRound(TEST_ID_1, 9001, "1406/1/1", "1406/1/10"));
    rs.rounds.push(_mkTestRound(TEST_ID_2, 9002, "1406/1/11", "1406/1/20"));

    function _cleanup() {
      rs.rounds = rs.rounds.filter(function (r) {
        return r && r.id !== TEST_ID_1 && r.id !== TEST_ID_2;
      });
    }

    function _snap() {
      return rs.rounds.map(function (x) {
        return { id: x.id, startDate: x.startDate, endDate: x.endDate,
                 planId: x.planId, locked: x.locked };
      });
    }

    // P1
    (function () {
      var res = S.applyRounds([
        { id: TEST_ID_1, startDate: "1406/1/1", endDate: "1406/1/10", locked: false },
        { id: TEST_ID_2, startDate: "1406/1/11", endDate: "1406/1/20", locked: false }
      ]);
      var ok = res.ok === true && res.applied && res.applied.length === 2;
      results.push({ id: "P1", name: "multi-round success",
        passed: ok, expected: "ok=true, applied=2",
        got: "ok=" + res.ok + ", applied=" + (res.applied ? res.applied.length : 0),
        reason: ok ? null : (res.error || "failed") });
    })();

    // P2
    (function () {
      var before = JSON.stringify(_snap());
      var res = S.applyRounds([
        { id: TEST_ID_1, startDate: "1406/1/1", endDate: "1406/1/10" },
        { id: "nonexistent-round-xyz", startDate: "1406/1/1", endDate: "1406/1/5" }
      ]);
      var after = JSON.stringify(_snap());
      var unchanged = (before === after);
      var ok = res.ok === false && res.rolledBack === false && unchanged
        && res.error && res.error.indexOf("round_not_found") === 0;
      results.push({ id: "P2", name: "invalid id → no mutation",
        passed: ok, expected: "ok=false, unchanged, error=round_not_found:*",
        got: "ok=" + res.ok + ", unchanged=" + unchanged + ", err=" + (res.error || ""),
        reason: ok ? null : "failed" });
    })();

    // P3
    (function () {
      var before = JSON.stringify(_snap());
      var res = S.applyRounds([
        { id: TEST_ID_1, planId: "nonexistent-plan-zzz" }
      ]);
      var after = JSON.stringify(_snap());
      var unchanged = (before === after);
      var ok = res.ok === false && res.rolledBack === true && unchanged
        && res.error && res.error.indexOf("validation") >= 0;
      results.push({ id: "P3", name: "validation failure → rollback",
        passed: ok, expected: "ok=false, rolledBack=true, error=validation:*",
        got: "ok=" + res.ok + ", rb=" + res.rolledBack + ", err=" + (res.error || ""),
        reason: ok ? null : "failed" });
    })();

    // P4
    (function () {
      S.__saveCountReset();
      var res = S.applyRounds([
        { id: TEST_ID_1, startDate: "1406/1/1", endDate: "1406/1/10" },
        { id: TEST_ID_2, startDate: "1406/1/11", endDate: "1406/1/20" }
      ]);
      var count = S.__saveCount();
      var ok = res.ok === true && count === 1;
      results.push({ id: "P4", name: "single save on success",
        passed: ok, expected: "ok=true, saveCount=1",
        got: "ok=" + res.ok + ", saveCount=" + count,
        reason: ok ? null : "failed" });
    })();

    // Cleanup
    _cleanup();
    _touch();
    _save();

    var passed = results.filter(function (r) { return r.passed; }).length;
    return { passed: passed, total: results.length, results: results };
  };

  console.log("[InternshipResidency.store.v2] loaded");
})();