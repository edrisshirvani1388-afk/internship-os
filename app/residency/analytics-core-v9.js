/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Core v9
   Range resolver + orchestrator + AI context
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.core.v9] R missing"); return; }
  var AN = R.analytics = R.analytics || {};
  var LIB = window.InternshipLib;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _addDays(d, n) {
    if (!LIB || !LIB.date) return d;
    var p = LIB.date.parseJalali(d);
    if (!p) return d;
    var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
    return LIB.date.dateKey(r.jy, r.jm, r.jd);
  }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _rs() { var s = _state(); return s ? s.residency : null; }

  /* ─── Range Resolver ─── */
  AN.RANGES = ["today","yesterday","thisWeek","last7Days","thisMonth","last30Days",
               "currentRound","currentBook","all","custom"];
  AN.AGGREGATIONS = ["daily","weekly","monthly","round","book","subject","total"];

  AN.resolveRange = function (rangeKey, opts) {
    opts = opts || {};
    var today = _today();
    if (rangeKey === "today") return { start: today, end: today, key: "today" };
    if (rangeKey === "yesterday") {
      var y = _addDays(today, -1);
      return { start: y, end: y, key: "yesterday" };
    }
    if (rangeKey === "thisWeek" || rangeKey === "last7Days") {
      return { start: _addDays(today, -6), end: today, key: rangeKey };
    }
    if (rangeKey === "thisMonth" || rangeKey === "last30Days") {
      return { start: _addDays(today, -29), end: today, key: rangeKey };
    }
    if (rangeKey === "all") {
      return { start: null, end: null, key: "all" };
    }
    if (rangeKey === "currentRound") {
      var rs = _rs();
      var s = _state();
      var today0 = _today();
      if (!rs || !Array.isArray(rs.rounds)) return { start: today, end: today, key: "currentRound" };
      var cur = rs.rounds.find(function (r) {
        return r && r.startDate && r.endDate &&
          _cmp(r.startDate, today0) <= 0 && _cmp(today0, r.endDate) <= 0;
      });
      if (cur) return { start: cur.startDate, end: cur.endDate, key: "currentRound", roundId: cur.id };
      return { start: today, end: today, key: "currentRound" };
    }
    if (rangeKey === "currentBook") {
      if (!opts.bookId) return { start: today, end: today, key: "currentBook" };
      return { start: null, end: null, key: "currentBook", bookId: opts.bookId };
    }
    if (rangeKey === "custom") {
      return { start: opts.start || null, end: opts.end || null, key: "custom" };
    }
    return { start: _addDays(today, -29), end: today, key: "last30Days" };
  };

  AN.inRange = function (date, range) {
    if (!date) return false;
    if (!range || (!range.start && !range.end)) return true;
    if (range.start && _cmp(date, range.start) < 0) return false;
    if (range.end && _cmp(range.end, date) < 0) return false;
    return true;
  };

  /* ─── Filter activities by range + optional round/book ─── */
  AN.filterActivities = function (activities, range, opts) {
    opts = opts || {};
    return (activities || []).filter(function (a) {
      if (!a) return false;
      if (opts.roundId && a.roundId !== opts.roundId) return false;
      if (opts.bookId && a.bookId !== opts.bookId) return false;
      if (opts.subjectId && a.subjectId !== opts.subjectId) return false;
      if (opts.kind && a.kind !== opts.kind) return false;
      if (opts.status && a.status !== opts.status) return false;
      if (!AN.inRange(a.plannedDate, range)) return false;
      return true;
    });
  };

  /* ─── Overview ─── */
  AN.getOverview = function (opts) {
    opts = opts || {};
    var range = AN.resolveRange(opts.range || "last30Days", opts);
    var s = _state();
    if (!s || !s.residency) return null;
    var all = s.residency.activities || [];
    var inRange = AN.filterActivities(all, range, opts);
    var M = R.analyticsMetrics;
    var W = R.analyticsWorkload;
    var Res = R.analyticsResidency;

    var exec = M ? M.execution(inRange) : null;
    var study = M ? M.study(inRange) : null;
    var adherence = M ? M.adherence(inRange) : null;
    var workload = W ? W.workloadSummary(inRange, s.shifts || [], range) : null;
    var residency = Res ? Res.summary(s, range) : null;
    var reserve = AN.getReserve();

    return {
      range: range,
      execution: exec,
      study: study,
      adherence: adherence,
      workload: workload,
      residency: residency,
      reserve: reserve,
      generatedAt: Date.now(),
      source: "analytics-overview-v9"
    };
  };

  /* ─── Reserve ─── */
  AN.getReserve = function () {
    var s = _state();
    if (!s || !s.residency) return null;
    var activePlanId = s.residency.meta && s.residency.meta.activePlanId;
    var consumed = 0;
    if (s.residency.reserveState && s.residency.reserveState.consumedByPlan && activePlanId) {
      consumed = s.residency.reserveState.consumedByPlan[activePlanId] || 0;
    }
    var pool = 0;
    if (s.residency.settings && s.residency.settings.reservePolicy) {
      // Pool is roughly derived from calendar; without plannerInput, use a summary
      // Fallback: use consumed only as estimate
    }
    var pendingPlanner = R.plannerSnapshot && activePlanId
      ? R.plannerSnapshot.build(activePlanId, "plan") : null;
    if (pendingPlanner && R.plannerRecovery) {
      var r = R.plannerRecovery.computeDeadlineReserve(pendingPlanner);
      pool = r.poolMinutes | 0;
      consumed = r.consumedMinutes | 0;
      return {
        poolMinutes: pool,
        consumedMinutes: consumed,
        remainingMinutes: r.remainingMinutes | 0,
        status: r.status,
        exhausted: r.status === "exhausted",
        low: r.status === "low"
      };
    }
    return {
      poolMinutes: pool,
      consumedMinutes: consumed,
      remainingMinutes: 0,
      status: "unknown",
      exhausted: false,
      low: false
    };
  };

  /* ─── Data Quality ─── */
  AN.getDataQuality = function (opts) {
    opts = opts || {};
    var s = _state();
    if (!s || !s.residency) return { status: "unknown", issueCount: 0, diagnostics: [] };
    var Q = R.analyticsQuality;
    if (!Q || !Q.check) return { status: "unknown", issueCount: 0, diagnostics: [] };
    return Q.check(s.residency.activities || []);
  };

  /* ─── Time Series ─── */
  AN.getTimeSeries = function (opts) {
    opts = opts || {};
    opts.aggregation = opts.aggregation || "daily";
    var range = AN.resolveRange(opts.range || "last30Days", opts);
    var s = _state();
    if (!s || !s.residency) return [];
    var acts = AN.filterActivities(s.residency.activities || [], range, opts);
    var byDate = {};
    acts.forEach(function (a) {
      if (!a || !a.plannedDate) return;
      if (!byDate[a.plannedDate]) {
        byDate[a.plannedDate] = {
          date: a.plannedDate,
          plannedPages: 0, actualPages: 0,
          plannedMinutes: 0, actualMinutes: 0,
          count: 0, completed: 0, partial: 0, missed: 0
        };
      }
      var b = byDate[a.plannedDate];
      b.plannedPages += (a.plannedPages | 0);
      b.actualPages += (a.actualPages | 0);
      b.plannedMinutes += (a.plannedDurationMinutes | 0);
      b.actualMinutes += (a.actualDurationMinutes | 0);
      b.count++;
      if (a.status === "completed") b.completed++;
      else if (a.status === "partial") b.partial++;
      else if (a.status === "planned" && a.plannedDate < _today()) b.missed++;
    });
    var out = Object.keys(byDate).map(function (k) { return byDate[k]; });
    out.sort(function (a, b) { return _cmp(a.date, b.date); });
    return out;
  };

  /* ─── AI-ready context (validated) ─── */
  AN.buildAIContext = function (opts) {
    opts = opts || {};
    var ov = AN.getOverview(opts);
    var dq = AN.getDataQuality(opts);
    var trends = R.analyticsTrends ? R.analyticsTrends.all(opts) : [];
    var insights = R.analyticsInsights ? R.analyticsInsights.all(opts) : [];
    return {
      generatedAt: Date.now(),
      range: ov ? ov.range : null,
      overview: ov,
      trends: trends,
      insights: insights,
      dataQuality: dq,
      source: "analytics-ai-context-v9"
    };
  };

  console.log("[analytics.core.v9] loaded");
})();