/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Baseline v20.1
   Pure helpers for Enrollment.initialStudyBaseline
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.baseline.v20] R missing"); return; }

  var B = R.baseline = R.baseline || {};
  B.VERSION = "1.0.0";
  B.APPLY_MODES = ["ALL", "FIRST_ONLY", "SELECTED_ROUNDS"];

  function _safeInt(v, def) {
    if (v == null || v === "") return def;
    var n = parseInt(v, 10);
    return isNaN(n) ? def : n;
  }

  function _makeRange(start, end) {
    return { start: Math.max(1, _safeInt(start, 1)), end: Math.max(1, _safeInt(end, 1)) };
  }

  /* ═══ Normalize: merge overlaps, clamp to [1, totalPages] ═══ */
  B.normalize = function (baseline, totalPages) {
    if (!baseline || typeof baseline !== "object") return null;
    var ranges = Array.isArray(baseline.ranges) ? baseline.ranges : [];
    var total = _safeInt(totalPages, 0);
    if (total <= 0) return null;

    var normalized = [];
    ranges.forEach(function (r) {
      if (!r) return;
      var s = _safeInt(r.start, 0);
      var e = _safeInt(r.end, 0);
      if (s < 1) return;
      if (e < 1) return;
      if (s > e) { var t = s; s = e; e = t; }
      if (s > total) return;
      if (e > total) e = total;
      normalized.push({ start: s, end: e });
    });

    if (normalized.length === 0) return null;

    normalized.sort(function (a, b) { return a.start - b.start || a.end - b.end; });
    var merged = [normalized[0]];
    for (var i = 1; i < normalized.length; i++) {
      var last = merged[merged.length - 1];
      var cur = normalized[i];
      if (cur.start <= last.end + 1) {
        if (cur.end > last.end) last.end = cur.end;
      } else {
        merged.push({ start: cur.start, end: cur.end });
      }
    }

    return {
      ranges: merged,
      applyToRounds: _enumApply(baseline.applyToRounds),
      selectedRoundIds: Array.isArray(baseline.selectedRoundIds)
        ? baseline.selectedRoundIds.filter(function (x) { return typeof x === "string" && x.length; })
        : [],
      notes: String(baseline.notes || "")
    };
  };

  function _enumApply(v) {
    return B.APPLY_MODES.indexOf(v) !== -1 ? v : "ALL";
  }

  /* ═══ Compute pages (sum of normalized ranges) ═══ */
  B.computePages = function (baseline, totalPages) {
    var n = B.normalize(baseline, totalPages);
    if (!n) return 0;
    return n.ranges.reduce(function (sum, r) {
      return sum + Math.max(0, r.end - r.start + 1);
    }, 0);
  };

  /* ═══ Validate ═══ */
  B.validate = function (baseline, totalPages) {
    var errors = [];
    if (baseline == null) return { ok: true, errors: [] };
    if (typeof baseline !== "object") { errors.push("baseline باید آبجکت باشد"); return { ok: false, errors: errors }; }

    var total = _safeInt(totalPages, 0);
    if (total <= 0) { errors.push("تعداد صفحات کتاب نامعتبر است"); return { ok: false, errors: errors }; }

    var ranges = Array.isArray(baseline.ranges) ? baseline.ranges : [];
    ranges.forEach(function (r, i) {
      if (!r) { errors.push("range #" + (i + 1) + " خالی"); return; }
      var s = _safeInt(r.start, 0);
      var e = _safeInt(r.end, 0);
      if (s < 1) errors.push("range #" + (i + 1) + ": شروع باید >= 1 باشد");
      if (e < 1) errors.push("range #" + (i + 1) + ": پایان باید >= 1 باشد");
      if (s > e) errors.push("range #" + (i + 1) + ": شروع بعد از پایان است");
      if (e > total) errors.push("range #" + (i + 1) + ": پایان از کل صفحات کتاب (" + total + ") بیشتر است");
    });

    var mode = baseline.applyToRounds;
    if (mode && B.APPLY_MODES.indexOf(mode) === -1) {
      errors.push("applyToRounds نامعتبر: " + mode);
    }
    if (mode === "SELECTED_ROUNDS") {
      var list = baseline.selectedRoundIds || [];
      if (!Array.isArray(list) || list.length === 0) {
        errors.push("حالت SELECTED_ROUNDS نیاز به انتخاب حداقل یک دوره دارد");
      }
    }

    return { ok: errors.length === 0, errors: errors };
  };

  /* ═══ Resolve effective baseline for a target enrollment ═══ */
  /* Returns the normalized baseline that should be applied to this
     enrollment (round+book), or null if none. */
  B.resolveForEnrollment = function (targetEnrollment, book, allEnrollments, allRounds) {
    if (!targetEnrollment || !book) return null;
    if (!Array.isArray(allEnrollments)) return null;

    var totalPages = _safeInt(book.totalPages, 0);
    if (totalPages <= 0) return null;

    // 1. Direct baseline on this enrollment
    if (targetEnrollment.initialStudyBaseline) {
      var own = B.normalize(targetEnrollment.initialStudyBaseline, totalPages);
      if (own) return own;
    }

    // 2. Check sibling enrollments for the same book
    var siblings = allEnrollments.filter(function (e) {
      return e && e.bookId === book.id && e.id !== targetEnrollment.id;
    });
    if (siblings.length === 0) return null;

    // 3. Find first applicable baseline (deterministic by enrollment id)
    siblings.sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });

    var roundsById = {};
    if (Array.isArray(allRounds)) {
      allRounds.forEach(function (r) { if (r && r.id) roundsById[r.id] = r; });
    }

    // Determine if targetEnrollment's round is "first" for this book
    var allBookEnrollments = allEnrollments.filter(function (e) { return e && e.bookId === book.id; });
    allBookEnrollments.sort(function (a, b) {
      var ra = roundsById[a.roundId] || { order: 9999 };
      var rb = roundsById[b.roundId] || { order: 9999 };
      return (ra.order || 0) - (rb.order || 0);
    });
    var firstEnrollmentId = allBookEnrollments.length > 0 ? allBookEnrollments[0].id : null;

    for (var i = 0; i < siblings.length; i++) {
      var s = siblings[i];
      if (!s.initialStudyBaseline) continue;
      var nb = B.normalize(s.initialStudyBaseline, totalPages);
      if (!nb) continue;

      var mode = nb.applyToRounds;
      if (mode === "ALL") return nb;

      if (mode === "FIRST_ONLY") {
        if (firstEnrollmentId === targetEnrollment.id) return nb;
      }

      if (mode === "SELECTED_ROUNDS") {
        if (Array.isArray(nb.selectedRoundIds) &&
            nb.selectedRoundIds.indexOf(targetEnrollment.roundId) !== -1) {
          return nb;
        }
      }
    }

    return null;
  };

  /* ═══ Tests ═══ */
  B.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    // ─── T1: null valid ───
    t("T1: null baseline valid", B.validate(null, 100).ok === true);
    t("T1b: null → 0 pages", B.computePages(null, 100) === 0);

    // ─── T2: simple 1-350 ───
    var b2 = { ranges: [{ start: 1, end: 350 }], applyToRounds: "ALL", selectedRoundIds: [] };
    t("T2: simple range → 350", B.computePages(b2, 500) === 350);

    // ─── T3: multiple ranges ───
    var b3 = { ranges: [{ start: 1, end: 100 }, { start: 200, end: 300 }], applyToRounds: "ALL" };
    t("T3: multiple ranges → 201", B.computePages(b3, 500) === 201);

    // ─── T4: invalid range ───
    var b4 = { ranges: [{ start: 300, end: 100 }] };
    // s>e auto-swapped by normalize
    var b4n = B.normalize(b4, 500);
    t("T4: start>end swapped", b4n && b4n.ranges[0].start === 100 && b4n.ranges[0].end === 300);

    // ─── T5: range beyond totalPages ───
    var b5 = { ranges: [{ start: 1, end: 1500 }] };
    var v5 = B.validate(b5, 1000);
    t("T5: range > totalPages → invalid", !v5.ok);
    var b5n = B.normalize(b5, 1000);
    t("T5b: normalize clamps to 1000", b5n && b5n.ranges[0].end === 1000);

    // ─── T6: overlapping ranges ───
    var b6 = { ranges: [{ start: 1, end: 300 }, { start: 200, end: 500 }] };
    var b6n = B.normalize(b6, 1000);
    t("T6: overlapping merged to 1-500",
      b6n && b6n.ranges.length === 1 && b6n.ranges[0].start === 1 && b6n.ranges[0].end === 500);
    t("T6b: compute 500", B.computePages(b6, 1000) === 500);

    // ─── T7: adjacent ranges merge ───
    var b7 = { ranges: [{ start: 1, end: 100 }, { start: 101, end: 200 }] };
    var b7n = B.normalize(b7, 500);
    t("T7: adjacent merged to 1-200", b7n && b7n.ranges.length === 1 && b7n.ranges[0].end === 200);

    // ─── T8: SELECTED_ROUNDS validation ───
    var b8 = { ranges: [{ start: 1, end: 100 }], applyToRounds: "SELECTED_ROUNDS", selectedRoundIds: [] };
    t("T8: SELECTED without ids invalid", !B.validate(b8, 500).ok);
    var b8b = { ranges: [{ start: 1, end: 100 }], applyToRounds: "SELECTED_ROUNDS", selectedRoundIds: ["r1"] };
    t("T8b: SELECTED with ids valid", B.validate(b8b, 500).ok);

    // ─── T9: resolve — direct ───
    var enr1 = { id: "e1", bookId: "b1", roundId: "r1", initialStudyBaseline: { ranges: [{ start: 1, end: 100 }], applyToRounds: "ALL" } };
    var r9 = B.resolveForEnrollment(enr1, { id: "b1", totalPages: 500 }, [enr1], [{ id: "r1", order: 1 }]);
    t("T9: direct baseline resolved", r9 && r9.ranges.length === 1);

    // ─── T10: resolve — ALL propagation ───
    var enr2 = { id: "e2", bookId: "b1", roundId: "r2" };
    var r10 = B.resolveForEnrollment(enr2, { id: "b1", totalPages: 500 }, [enr1, enr2], [{ id: "r1", order: 1 }, { id: "r2", order: 2 }]);
    t("T10: ALL propagates to sibling", r10 && r10.ranges.length === 1);

    // ─── T11: FIRST_ONLY — only to first ───
    var enrA = { id: "eA", bookId: "b1", roundId: "r1", initialStudyBaseline: { ranges: [{ start: 1, end: 100 }], applyToRounds: "FIRST_ONLY" } };
    var enrB = { id: "eB", bookId: "b1", roundId: "r2" };
    var rounds = [{ id: "r1", order: 1 }, { id: "r2", order: 2 }];
    var rA = B.resolveForEnrollment(enrA, { id: "b1", totalPages: 500 }, [enrA, enrB], rounds);
    var rB = B.resolveForEnrollment(enrB, { id: "b1", totalPages: 500 }, [enrA, enrB], rounds);
    t("T11: FIRST_ONLY applies to first round", rA !== null);
    t("T11b: FIRST_ONLY does not propagate", rB === null);

    // ─── T12: SELECTED_ROUNDS ───
    var enrC = { id: "eC", bookId: "b1", roundId: "r1", initialStudyBaseline: { ranges: [{ start: 1, end: 100 }], applyToRounds: "SELECTED_ROUNDS", selectedRoundIds: ["r3"] } };
    var enrD = { id: "eD", bookId: "b1", roundId: "r3" };
    var enrE = { id: "eE", bookId: "b1", roundId: "r4" };
    var rounds12 = [{ id: "r1", order: 1 }, { id: "r3", order: 3 }, { id: "r4", order: 4 }];
    var rD = B.resolveForEnrollment(enrD, { id: "b1", totalPages: 500 }, [enrC, enrD, enrE], rounds12);
    var rE = B.resolveForEnrollment(enrE, { id: "b1", totalPages: 500 }, [enrC, enrD, enrE], rounds12);
    t("T12: SELECTED_ROUNDS applies to selected", rD !== null);
    t("T12b: SELECTED_ROUNDS does not apply to others", rE === null);

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[residency.baseline.v20] loaded v" + B.VERSION);
})();