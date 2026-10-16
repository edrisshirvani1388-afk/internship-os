/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Scheduling Conflict Engine v20.1
   Pure: ScheduledItem[] → Conflict[]
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[scheduling.conflict.v20] R missing"); return; }

  var CF = R.schedulingConflict = R.schedulingConflict || {};
  CF.VERSION = "1.0.2";
  CF.POLICIES = ["HARD", "WARNING", "ALLOWED", "CONTEXTUAL"];

  /* ═══ TIME HELPERS ═══ */
  function _timeToMin(t) {
    if (!t) return null;
    var parts = String(t).split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function _minToTime(min) {
    if (min == null) return null;
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function _normalizeRange(startTime, endTime) {
    var s = _timeToMin(startTime);
    var e = _timeToMin(endTime);
    if (s == null || e == null) return null;
    if (e <= s) e += 1440;
    return { start: s, end: e };
  }

  /* ═══ KIND CLASSIFICATION ═══ */
  function _kindOf(item) {
    if (!item) return "unknown";
    // Shift (timed or untimed)
    if (item.category === "shift") {
      return item.role === "context" ? "shift_untimed" : "shift";
    }
    // Reminder
    if (item.role === "reminder") return "reminder";
    // Flexible (unplaced)
    if (item.role === "flexible") return "flexible";
    // Body/Life = gym/personal
    if (item.category === "body") return "gym";
    if (item.category === "life") return "personal";
    // Study-like (task study, residency study/review/assessment/residency)
    if (item.category === "study" || item.category === "review" ||
        item.category === "assessment" || item.category === "residency") return "study";
    // [PATCH:phase-28.2.1] Life activities (sleep/food/commute) = study-kind strictness
    // Only shift & clinical are WARNING; all other overlaps are HARD.
    if (item.category === "sleep" || item.category === "food" || item.category === "commute") return "study";
    if (item.category === "clinical") return "clinical";
    if (item.category === "case") return "case";
    return "other";
  }

  /* ═══ SEMANTIC FINGERPRINTS ═══ */
  function _itemFp(it) {
    if (!it) return "";
    return [
      it.id,
      it.role || "",
      it.category || "",
      it.startTime || "",
      it.endTime || "",
      it.durationMinutes || 0
    ].join(":");
  }

  function _pairFp(a, b) {
    var fa = _itemFp(a), fb = _itemFp(b);
    return fa < fb ? (fa + "||" + fb) : (fb + "||" + fa);
  }

  function _sortedPairKey(idA, idB) {
    return idA < idB ? (idA + "::" + idB) : (idB + "::" + idA);
  }

  /* ═══ RULES TABLE ═══ */
  var RULES = {
    "shift|study":     "WARNING",
    "shift|gym":       "HARD",
    "shift|personal":  "HARD",
    "shift|shift":     "HARD",
    "shift|clinical":  "WARNING",
    "shift|case":      "ALLOWED",
    "shift|other":     "WARNING",

    "study|study":     "HARD",
    "study|gym":       "HARD",
    "study|personal":  "HARD",
    // [PATCH:phase-28.2.2] study-kind vs clinical = HARD (user-approved RULES change)
    // study-kind includes: study, review, assessment, residency, sleep, food, commute.
    // Only shift is WARNING for study-kind. All others HARD/ALLOWED per table.
    "study|clinical":  "HARD",
    "study|case":      "ALLOWED",
    "study|other":     "WARNING",

    "gym|gym":         "HARD",
    "gym|personal":    "WARNING",
    "gym|clinical":    "HARD",
    "gym|case":        "ALLOWED",
    "gym|other":       "WARNING",

    "personal|personal": "HARD",
    "personal|clinical": "HARD",
    "personal|case":     "ALLOWED",
    "personal|other":    "WARNING",

    "clinical|clinical": "HARD",
    "clinical|case":     "ALLOWED",
    "clinical|other":    "WARNING",

    "case|case":         "ALLOWED",
    "case|other":        "ALLOWED",
    "other|other":       "WARNING",

    // Untimed shift
    "shift_untimed|study":     "CONTEXTUAL",
    "shift_untimed|gym":       "CONTEXTUAL",
    "shift_untimed|personal":  "CONTEXTUAL",
    "shift_untimed|shift":     "CONTEXTUAL",
    "shift_untimed|clinical":  "CONTEXTUAL",
    "shift_untimed|case":      "ALLOWED",
    "shift_untimed|other":     "CONTEXTUAL"
  };

  function _lookupRule(kA, kB) {
    if (kA === "flexible" || kB === "flexible") return "ALLOWED";
    if (kA === "reminder" || kB === "reminder") return "ALLOWED";
    var k1 = kA + "|" + kB;
    var k2 = kB + "|" + kA;
    if (RULES[k1] != null) return RULES[k1];
    if (RULES[k2] != null) return RULES[k2];
    return "ALLOWED";
  }

  /* ═══ POLICY ═══ */
  CF.getPolicy = function (a, b, options) {
    if (!a || !b) return "ALLOWED";
    if (a.id === b.id) return "ALLOWED";
    var kA = _kindOf(a);
    var kB = _kindOf(b);
    return _lookupRule(kA, kB);
  };

  /* ═══ REASONS ═══ */
  function _reasonFor(policy, a, b) {
    var kA = _kindOf(a);
    var kB = _kindOf(b);
    if (policy === "HARD")
      return "این دو مورد نمی‌توانند هم‌زمان باشند (" + kA + " + " + kB + ")";
    if (policy === "WARNING")
      return "تداخل زمانی وجود دارد — قابل پذیرش با تصمیم کاربر (" + kA + " + " + kB + ")";
    if (policy === "CONTEXTUAL")
      return "بستگی به زمینه دارد — " + kA + " با " + kB;
    return "تداخل مجاز است";
  }

  /* ═══ OVERLAP DETECTION ═══ */
  function _overlap(a, b) {
    if (!a || !b) return null;
    if (a.date !== b.date) return null;
    if (!a.startTime || !a.endTime) return null;
    if (!b.startTime || !b.endTime) return null;
    var ra = _normalizeRange(a.startTime, a.endTime);
    var rb = _normalizeRange(b.startTime, b.endTime);
    if (!ra || !rb) return null;
    if (ra.start < rb.end && rb.start < ra.end) {
      var overlapStart = Math.max(ra.start, rb.start);
      var overlapEnd = Math.min(ra.end, rb.end);
      return {
        start: overlapStart,
        end: overlapEnd,
        minutes: overlapEnd - overlapStart
      };
    }
    return null;
  }

  /* ═══ DETECT PAIR ═══ */
  CF.detectPair = function (a, b, options) {
    options = options || {};
    if (!a || !b) return null;
    if (a.id === b.id) return null;
    if (a.date !== b.date) return null;

    var policy = CF.getPolicy(a, b, options);
    if (policy === "ALLOWED") return null;

    var ov = _overlap(a, b);
    if (!ov) return null;

    return {
      id: "conflict-" + _sortedPairKey(a.id, b.id),
      type: "time_overlap",
      policy: policy,
      itemAId: a.id,
      itemBId: b.id,
      overlapStart: _minToTime(ov.start),
      overlapEnd: _minToTime(ov.end),
      overlapMinutes: ov.minutes,
      reason: _reasonFor(policy, a, b),
      pairKey: _sortedPairKey(a.id, b.id),
      semanticFingerprint: _pairFp(a, b)
    };
  };

  /* ═══ DETECT ALL ═══ */
  CF.detect = function (items, options) {
    options = options || {};
    if (!Array.isArray(items)) return [];
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var a = items[i];
      if (!a) continue;
      for (var j = i + 1; j < items.length; j++) {
        var b = items[j];
        if (!b) continue;
        try {
          var c = CF.detectPair(a, b, options);
          if (c) out.push(c);
        } catch (e) {
          console.warn("[conflict.detectPair]", e);
        }
      }
    }
    // Deterministic sort by conflict id
    out.sort(function (x, y) {
      return x.id < y.id ? -1 : (x.id > y.id ? 1 : 0);
    });
    return out;
  };

  /* ═══ SUMMARIZE ═══ */
  CF.summarize = function (conflicts) {
    if (!Array.isArray(conflicts)) return { total: 0, byPolicy: {} };
    var byPolicy = { HARD: 0, WARNING: 0, ALLOWED: 0, CONTEXTUAL: 0 };
    conflicts.forEach(function (c) {
      if (!c) return;
      if (byPolicy[c.policy] != null) byPolicy[c.policy]++;
    });
    return { total: conflicts.length, byPolicy: byPolicy };
  };

  /* ═══ INTERNAL (for tests) ═══ */
  CF._kindOf = _kindOf;
  CF._itemFp = _itemFp;
  CF._sortedPairKey = _sortedPairKey;
  CF._overlap = _overlap;

  /* ═══ TESTS (Phase 28.0) ═══ */
  CF.__tests = function () {
    var results = [];
    var _mkCounter = 0;
    function t(name, cond) { results.push({ name: name, pass: !!cond }); }
    function _mk(cat, role, st, en, d) {
      _mkCounter++;
      return { id: "mk" + _mkCounter, category: cat, role: role || "block",
               startTime: st || "09:00", endTime: en || "10:00",
               durationMinutes: d || 60, date: "2026-01-01" };
    }

    t("_kindOf study -> study", CF._kindOf(_mk("study")) === "study");
    t("_kindOf residency -> study", CF._kindOf(_mk("residency")) === "study");
    t("_kindOf review -> study", CF._kindOf(_mk("review")) === "study");
    t("_kindOf assessment -> study", CF._kindOf(_mk("assessment")) === "study");
    t("_kindOf body -> gym", CF._kindOf(_mk("body")) === "gym");
    t("_kindOf life -> personal", CF._kindOf(_mk("life")) === "personal");
    t("_kindOf clinical -> clinical", CF._kindOf(_mk("clinical")) === "clinical");
    t("_kindOf case -> case", CF._kindOf(_mk("case")) === "case");
    t("_kindOf misc -> other", CF._kindOf(_mk("misc")) === "other");

    var shiftA = { id: "shA", category: "shift", role: "anchor",
                   startTime: "09:00", endTime: "17:00",
                   durationMinutes: 480, date: "2026-01-01" };
    var shiftU = { id: "shU", category: "shift", role: "context",
                   date: "2026-01-01" };
    var rem = { id: "rem", category: "study", role: "reminder",
                startTime: "09:00", endTime: "10:00",
                durationMinutes: 60, date: "2026-01-01" };
    var flex = { id: "flx", category: "study", role: "flexible",
                 date: "2026-01-01" };

    t("_kindOf shift anchor -> shift", CF._kindOf(shiftA) === "shift");
    t("_kindOf shift context -> shift_untimed", CF._kindOf(shiftU) === "shift_untimed");
    t("_kindOf reminder -> reminder", CF._kindOf(rem) === "reminder");
    t("_kindOf flexible -> flexible", CF._kindOf(flex) === "flexible");

    t("policy study|study = HARD",
      CF.getPolicy(_mk("study"), _mk("study")) === "HARD");
    t("policy study|residency = HARD (ISSUE-10)",
      CF.getPolicy(_mk("study"), _mk("residency")) === "HARD");
    t("policy study|shift = WARNING",
      CF.getPolicy(_mk("study"), shiftA) === "WARNING");
    t("policy body|shift = HARD",
      CF.getPolicy(_mk("body"), shiftA) === "HARD");
    t("policy life|shift = HARD",
      CF.getPolicy(_mk("life"), shiftA) === "HARD");
    t("policy case|case = ALLOWED",
      CF.getPolicy(_mk("case"), _mk("case")) === "ALLOWED");
    t("policy clinical|clinical = HARD",
      CF.getPolicy(_mk("clinical"), _mk("clinical")) === "HARD");
    t("policy reminder|study = ALLOWED",
      CF.getPolicy(rem, _mk("study")) === "ALLOWED");
    t("policy flexible|study = ALLOWED",
      CF.getPolicy(flex, _mk("study")) === "ALLOWED");
    t("policy null safe", CF.getPolicy(null, _mk("study")) === "ALLOWED");

    // [PATCH:phase-28.2.1] Life activities → study kind
    t("_kindOf sleep -> study",   CF._kindOf(_mk("sleep"))   === "study");
    t("_kindOf food -> study",    CF._kindOf(_mk("food"))    === "study");
    t("_kindOf commute -> study", CF._kindOf(_mk("commute")) === "study");
    t("policy sleep|sleep = HARD",     CF.getPolicy(_mk("sleep"), _mk("sleep")) === "HARD");
    t("policy sleep|shift = WARNING",  CF.getPolicy(_mk("sleep"), shiftA)       === "WARNING");
    t("policy food|study = HARD",      CF.getPolicy(_mk("food"),  _mk("study")) === "HARD");
    t("policy commute|clinical = HARD [28.2.2]", CF.getPolicy(_mk("commute"), _mk("clinical")) === "HARD");

    // [PATCH:phase-28.2.2] study-kind vs clinical = HARD
    t("policy study|clinical = HARD [28.2.2]",   CF.getPolicy(_mk("study"), _mk("clinical"))   === "HARD");
    t("policy sleep|clinical = HARD [28.2.2]",   CF.getPolicy(_mk("sleep"), _mk("clinical"))   === "HARD");
    t("policy residency|clinical = HARD [28.2.2]", CF.getPolicy(_mk("residency"), _mk("clinical")) === "HARD");
    t("policy study|shift still WARNING [28.2.2]", CF.getPolicy(_mk("study"), shiftA) === "WARNING");
    t("policy sleep|shift still WARNING [28.2.2]",  CF.getPolicy(_mk("sleep"), shiftA) === "WARNING");

    var same = { id: "same", category: "study", role: "block",
                 startTime: "09:00", endTime: "10:00",
                 durationMinutes: 60, date: "2026-01-01" };
    t("getPolicy same id -> ALLOWED", CF.getPolicy(same, same) === "ALLOWED");

    var a = { id: "a", date: "2026-01-01", category: "study", role: "block",
              startTime: "09:00", endTime: "10:00", durationMinutes: 60 };
    var b = { id: "b", date: "2026-01-01", category: "study", role: "block",
              startTime: "09:30", endTime: "10:30", durationMinutes: 60 };
    var c = { id: "c", date: "2026-01-01", category: "study", role: "block",
              startTime: "11:00", endTime: "12:00", durationMinutes: 60 };
    var d = { id: "d", date: "2026-01-02", category: "study", role: "block",
              startTime: "09:00", endTime: "10:00", durationMinutes: 60 };

    var cAB = CF.detectPair(a, b);
    t("detectPair overlap HARD", cAB && cAB.policy === "HARD");
    t("detectPair overlapMinutes === 30", cAB && cAB.overlapMinutes === 30);
    t("detectPair non-overlap -> null", CF.detectPair(a, c) === null);
    t("detectPair different date -> null", CF.detectPair(a, d) === null);
    t("detectPair self -> null", CF.detectPair(a, a) === null);
    t("detectPair ALLOWED policy -> null", CF.detectPair(a, rem) === null);

    var unt = { id: "u", date: "2026-01-01", category: "study", role: "block" };
    t("detectPair untimed -> null", CF.detectPair(unt, a) === null);

    var cs = CF.detect([a, b, c]);
    t("detect([a,b,c]) = 1 conflict", cs.length === 1);

    var sum = CF.summarize([{ policy: "HARD" }, { policy: "WARNING" }, { policy: "HARD" }]);
    t("summarize.HARD === 2", sum.byPolicy.HARD === 2);
    t("summarize.WARNING === 1", sum.byPolicy.WARNING === 1);
    t("summarize.ALLOWED === 0", sum.byPolicy.ALLOWED === 0);
    t("summarize.total === 3", sum.total === 3);

    var passed = 0;
    for (var i = 0; i < results.length; i++) { if (results[i].pass) passed++; }
    return { passed: passed, total: results.length, results: results };
  };
  console.log("[scheduling.conflict.v20] loaded v" + CF.VERSION);
})();