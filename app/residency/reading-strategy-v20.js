/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Reading Strategy + Study Speed v20
   ترتیب مطالعه + سرعت هر دوره
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[reading-strategy.v20] R missing"); return; }

  /* ═══ Reading Strategy ═══ */
  var RS = R.readingStrategy = R.readingStrategy || {};
  RS.VERSION = "1.0.0";

  RS.MODES = [
    { id: "sequential",             label: "ترتیبی",              desc: "هر کتاب را تمام کن، بعد کتاب بعدی" },
    { id: "category_first",         label: "درس‌به‌درس",          desc: "هر درس را کامل کن، بعد درس بعدی" },
    { id: "alternating_daily",      label: "چرخشی روزانه",         desc: "هر روز بین چند کتاب بچرخ" },
    { id: "alternating_categories", label: "چرخشی بین درس‌ها",     desc: "بین چند درس جابه‌جا شو" },
    { id: "balanced",               label: "متعادل",              desc: "پیشرفت چند کتاب را نزدیک نگه دار" },
    { id: "custom",                 label: "سفارشی",              desc: "ترتیب را خودم تعیین می‌کنم" }
  ];

  RS.DEFAULT = {
    mode: "sequential",
    rotationSize: 3,
    alternationDays: 1,
    customOrder: [],
    customCategoryOrder: []
  };

  RS.normalize = function (v) {
    if (!v || typeof v !== "object") return Object.assign({}, RS.DEFAULT);
    var out = Object.assign({}, RS.DEFAULT);
    if (typeof v.mode === "string") {
      var valid = RS.MODES.map(function (m) { return m.id; });
      if (valid.indexOf(v.mode) !== -1) out.mode = v.mode;
    }
    if (typeof v.rotationSize === "number" && v.rotationSize > 0) {
      out.rotationSize = Math.min(10, v.rotationSize | 0);
    }
    if (typeof v.alternationDays === "number" && v.alternationDays > 0) {
      out.alternationDays = Math.min(30, v.alternationDays | 0);
    }
    if (Array.isArray(v.customOrder)) out.customOrder = v.customOrder.slice();
    if (Array.isArray(v.customCategoryOrder)) out.customCategoryOrder = v.customCategoryOrder.slice();
    return out;
  };

  RS.resolve = function (settings, round, enrollments) {
    var s = settings || {};
    var fromRound = round && round.readingStrategy;
    var fromGlobal = s.residency && s.residency.settings && s.residency.settings.readingStrategy;
    return RS.normalize(fromRound || fromGlobal || RS.DEFAULT);
  };

  // ─── Sort helpers ───
  function _seqSort(a, b) {
    var ad = a.demand || a;
    var bd = b.demand || b;
    var ao = (ad.studyOrder != null) ? ad.studyOrder : 9999;
    var bo = (bd.studyOrder != null) ? bd.studyOrder : 9999;
    if (ao !== bo) return ao - bo;
    var as = ad.subjectId || "";
    var bs = bd.subjectId || "";
    if (as !== bs) return as.localeCompare(bs);
    return (ad.enrollmentId || "").localeCompare(bd.enrollmentId || "");
  }

  function _catSort(a, b) {
    var ad = a.demand || a;
    var bd = b.demand || b;
    var as = ad.subjectId || "zzz";
    var bs = bd.subjectId || "zzz";
    if (as !== bs) return as.localeCompare(bs);
    return _seqSort(a, b);
  }

  function _balancedSort(a, b) {
    var ad = a.demand || a;
    var bd = b.demand || b;
    // Prefer the one with less progress = higher remaining ratio
    var ar = ad.targetPages > 0 ? (ad.remainingPages / ad.targetPages) : 0;
    var br = bd.targetPages > 0 ? (bd.remainingPages / bd.targetPages) : 0;
    if (Math.abs(ar - br) > 0.001) return br - ar; // higher remaining = first
    return _seqSort(a, b);
  }

  RS.buildSequence = function (demands, strategy, round, enrollments) {
    var items = (demands || []).map(function (d) {
      return (d && d.demand) ? d : { demand: d };
    });
    var mode = strategy.mode;
    if (mode === "category_first") items.sort(_catSort);
    else if (mode === "balanced") items.sort(_balancedSort);
    else if (mode === "custom") {
      var order = strategy.customOrder || [];
      items.sort(function (a, b) {
        var ai = order.indexOf(a.demand.enrollmentId);
        var bi = order.indexOf(b.demand.enrollmentId);
        if (ai === -1) ai = 9999;
        if (bi === -1) bi = 9999;
        if (ai !== bi) return ai - bi;
        return _seqSort(a, b);
      });
    } else {
      items.sort(_seqSort);
    }
    return items;
  };

  /**
   * Returns 0..100 (100 = highest priority).
   * Deterministic given same demand + context.
   */
  RS.getPriority = function (demand, ctx) {
    if (!demand || !ctx || !ctx.strategy) return 0;
    var strategy = ctx.strategy;
    var demands = ctx.demands || [];
    var dayIndex = ctx.dayIndex || 0;
    var round = ctx.round || null;
    var enrollments = ctx.enrollments || [];

    var seq = RS.buildSequence(demands, strategy, round, enrollments);
    var total = seq.length;
    if (total === 0) return 0;

    var pos = -1;
    for (var i = 0; i < total; i++) {
      var d = seq[i].demand;
      if (d === demand) { pos = i; break; }
      if (d && demand.id && d.id === demand.id) { pos = i; break; }
      if (d && demand.enrollmentId && d.enrollmentId === demand.enrollmentId) { pos = i; break; }
    }
    if (pos === -1) return 0;

    // Alternating modes → rotate per day
    if (strategy.mode === "alternating_daily" || strategy.mode === "alternating_categories") {
      var rotSize = Math.max(2, strategy.rotationSize | 0);
      var dayBlock = Math.floor(dayIndex / Math.max(1, strategy.alternationDays | 0));
      var shift = dayBlock % rotSize;
      if (pos < rotSize) {
        pos = (pos + shift) % rotSize;
      }
    }

    return Math.round(((total - pos) / total) * 100);
  };

  RS.explain = function (strategy) {
    if (!strategy) return "—";
    var mode = null;
    for (var i = 0; i < RS.MODES.length; i++) {
      if (RS.MODES[i].id === strategy.mode) { mode = RS.MODES[i]; break; }
    }
    return mode ? (mode.label + " — " + mode.desc) : "—";
  };

  RS.__tests = function () {
    var t = [];
    t.push({ name: "normalize default", ok: RS.normalize(null).mode === "sequential" });
    t.push({ name: "normalize invalid mode", ok: RS.normalize({ mode: "xyz" }).mode === "sequential" });
    t.push({ name: "normalize valid mode", ok: RS.normalize({ mode: "balanced" }).mode === "balanced" });

    var demands = [
      { id: "d1", enrollmentId: "e1", subjectId: "s1", studyOrder: 1, targetPages: 100, remainingPages: 50 },
      { id: "d2", enrollmentId: "e2", subjectId: "s1", studyOrder: 2, targetPages: 100, remainingPages: 80 },
      { id: "d3", enrollmentId: "e3", subjectId: "s2", studyOrder: 1, targetPages: 100, remainingPages: 30 }
    ];
    var strategy = { mode: "sequential", rotationSize: 3, alternationDays: 1, customOrder: [], customCategoryOrder: [] };
    var ctx = { strategy: strategy, demands: demands, dayIndex: 0, round: null, enrollments: [] };
    var p1 = RS.getPriority(demands[0], ctx);
    var p3 = RS.getPriority(demands[2], ctx);
    t.push({ name: "sequential: e1 > e3", ok: p1 > p3 });
    return t;
  };

  console.log("[reading-strategy.v20] loaded v" + RS.VERSION);

  /* ═══ Study Speed ═══ */
  var SS = R.studySpeed = R.studySpeed || {};
  SS.VERSION = "1.0.0";
  SS.DEFAULT = 20;

  /**
   * Priority order:
   *   round.studySpeedPagesPerHour
   *   → enrollment.useCustomSpeed/customPagesPerHour
   *   → settings.residency.settings.defaultStudySpeed.pagesPerHour
   *   → settings.defaultPagesPerHour
   *   → 20
   */
  SS.resolve = function (round, settings, enrollment) {
    if (round && typeof round.studySpeedPagesPerHour === "number" && round.studySpeedPagesPerHour > 0) {
      return round.studySpeedPagesPerHour;
    }
    if (enrollment && enrollment.useCustomSpeed && enrollment.customPagesPerHour != null) {
      var c = parseFloat(enrollment.customPagesPerHour);
      if (!isNaN(c) && c > 0) return c;
    }
    var s = settings || {};
    if (s.residency && s.residency.settings && s.residency.settings.defaultStudySpeed) {
      var g = s.residency.settings.defaultStudySpeed.pagesPerHour;
      if (typeof g === "number" && g > 0) return g;
    }
    if (typeof s.defaultPagesPerHour === "number" && s.defaultPagesPerHour > 0) {
      return s.defaultPagesPerHour;
    }
    return SS.DEFAULT;
  };

  SS.__tests = function () {
    var t = [];
    t.push({ name: "default", ok: SS.resolve(null, null, null) === 20 });
    t.push({ name: "round speed wins", ok: SS.resolve({ studySpeedPagesPerHour: 30 }, null, null) === 30 });
    t.push({ name: "enrollment speed fallback", ok: SS.resolve(null, null, { useCustomSpeed: true, customPagesPerHour: 25 }) === 25 });
    t.push({ name: "global fallback", ok: SS.resolve(null, { residency: { settings: { defaultStudySpeed: { pagesPerHour: 22 } } } }, null) === 22 });
    return t;
  };

  console.log("[study-speed.v20] loaded v" + SS.VERSION);
})();