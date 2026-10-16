/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Metrics v9
   Execution / Study / Adherence metrics (deterministic)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.metrics.v9] R missing"); return; }
  var M = R.analyticsMetrics = R.analyticsMetrics || {};
  var LIB = window.InternshipLib;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _ratio(num, den) {
    if (!den || den === 0) return 0;
    return Math.round((num / den) * 1000) / 1000;
  }
  function _pct(num, den) {
    if (!den || den === 0) return 0;
    return Math.round((num / den) * 100);
  }

  /* ─── Execution metrics ─── */
  M.execution = function (activities) {
    var total = 0, completed = 0, partial = 0, missed = 0, skipped = 0, cancelled = 0, overdue = 0, future = 0, onTrack = 0;
    var today = _today();
    (activities || []).forEach(function (a) {
      if (!a) return;
      total++;
      var st = a.status || "planned";
      var isPast = a.plannedDate && _cmp(a.plannedDate, today) < 0;
      var isFuture = a.plannedDate && _cmp(a.plannedDate, today) > 0;
      if (st === "completed") completed++;
      else if (st === "partial") partial++;
      else if (st === "skipped") skipped++;
      else if (st === "cancelled") cancelled++;
      else if (isPast) missed++;
      else if (isFuture) future++;
      else if (st === "planned") onTrack++;
    });
    overdue = missed;
    var executablePlanned = total - cancelled - future;
    return {
      total: total,
      completed: completed,
      partial: partial,
      missed: missed,
      skipped: skipped,
      cancelled: cancelled,
      overdue: overdue,
      future: future,
      onTrack: onTrack,
      executablePlanned: executablePlanned,
      completionRate: _pct(completed, executablePlanned),
      executionRate: _pct(completed + partial, executablePlanned),
      partialRate: _pct(partial, executablePlanned),
      missRate: _pct(missed, executablePlanned),
      skipRate: _pct(skipped, executablePlanned)
    };
  };

  /* ─── Study metrics ─── */
  M.study = function (activities) {
    var out = {
      plannedPages: 0, actualPages: 0, remainingPages: 0, studiedPages: 0, overagePages: 0,
      plannedMinutes: 0, actualMinutes: 0,
      pagesPerHourActual: 0, pagesPerHourHistorical: 0,
      averageSessionDuration: 0, sessions: 0,
      averageDailyPages: 0
    };
    var sessionsCount = 0;
    var completedOnly = 0;
    (activities || []).forEach(function (a) {
      if (!a) return;
      if (a.kind !== "study") return;
      out.plannedPages += (a.plannedPages | 0);
      out.actualPages += (a.actualPages | 0);
      out.plannedMinutes += (a.plannedDurationMinutes | 0);
      out.actualMinutes += (a.actualDurationMinutes | 0);
      if (a.status === "completed" || a.status === "partial") {
        sessionsCount++;
        if (a.actualDurationMinutes > 0) {
          out.pagesPerHourHistorical += a.actualPages / (a.actualDurationMinutes / 60);
          completedOnly++;
        }
      }
    });
    out.sessions = sessionsCount;
    out.remainingPages = Math.max(0, out.plannedPages - out.actualPages);
    out.overagePages = Math.max(0, out.actualPages - out.plannedPages);
    out.studiedPages = out.actualPages;
    if (out.actualMinutes > 0) {
      out.pagesPerHourActual = Math.round(out.actualPages / (out.actualMinutes / 60) * 10) / 10;
    }
    if (completedOnly > 0) {
      out.pagesPerHourHistorical = Math.round(out.pagesPerHourHistorical / completedOnly * 10) / 10;
    }
    if (sessionsCount > 0) {
      out.averageSessionDuration = Math.round(out.actualMinutes / sessionsCount);
    }
    return out;
  };

  /* ─── Adherence metrics ─── */
  M.adherence = function (activities) {
    var out = {
      plannedPages: 0, actualPages: 0,
      plannedMinutes: 0, actualMinutes: 0,
      pageAdherence: 0, timeAdherence: 0,
      pageDeviation: 0, timeDeviation: 0,
      scheduleAdherence: 0
    };
    var onSchedule = 0, count = 0;
    (activities || []).forEach(function (a) {
      if (!a) return;
      if (a.kind !== "study") return;
      out.plannedPages += (a.plannedPages | 0);
      out.actualPages += (a.actualPages | 0);
      out.plannedMinutes += (a.plannedDurationMinutes | 0);
      out.actualMinutes += (a.actualDurationMinutes | 0);
      count++;
      if (a.status === "completed") onSchedule++;
    });
    out.pageDeviation = out.actualPages - out.plannedPages;
    out.timeDeviation = out.actualMinutes - out.plannedMinutes;
    if (out.plannedPages > 0) out.pageAdherence = _pct(out.actualPages, out.plannedPages);
    if (out.plannedMinutes > 0) out.timeAdherence = _pct(out.actualMinutes, out.plannedMinutes);
    if (count > 0) out.scheduleAdherence = _pct(onSchedule, count);
    return out;
  };

  console.log("[analytics.metrics.v9] loaded");
})();