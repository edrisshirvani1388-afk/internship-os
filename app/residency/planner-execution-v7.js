/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Execution Analysis v7
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.execution.v7] R missing"); return; }
  var PE = R.plannerExecution = R.plannerExecution || {};
  var LIB = window.InternshipLib;

  var STATES = ["on_track","completed","partial","missed","skipped","cancelled","overdue","future","unknown"];
  PE.STATES = STATES;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }

  PE.classifyActivity = function (a) {
    if (!a) return { state: "unknown", pageDeficit: 0, timeDeficit: 0 };
    var today = _today();
    var status = a.status || "planned";
    var planned = a.plannedPages | 0;
    var actual = a.actualPages | 0;
    var plannedMin = a.plannedDurationMinutes | 0;
    var actualMin = a.actualDurationMinutes | 0;
    var pageDeficit = Math.max(0, planned - actual);
    var timeDeficit = Math.max(0, plannedMin - actualMin);

    if (a.plannedDate && _cmp(a.plannedDate, today) > 0) {
      return { state: "future", pageDeficit: pageDeficit, timeDeficit: timeDeficit };
    }
    if (status === "cancelled") return { state: "cancelled", pageDeficit: 0, timeDeficit: 0 };
    if (status === "skipped") return { state: "skipped", pageDeficit: planned, timeDeficit: plannedMin };
    if (status === "completed") return { state: "completed", pageDeficit: 0, timeDeficit: 0 };
    if (status === "partial") return { state: "partial", pageDeficit: pageDeficit, timeDeficit: timeDeficit };
    if (a.plannedDate && _cmp(a.plannedDate, today) < 0) {
      return { state: "missed", pageDeficit: planned, timeDeficit: plannedMin };
    }
    if (a.plannedDate && _cmp(a.plannedDate, today) === 0) {
      return { state: "on_track", pageDeficit: pageDeficit, timeDeficit: timeDeficit };
    }
    return { state: "unknown", pageDeficit: 0, timeDeficit: 0 };
  };

  PE.analyzeExecution = function (plannerInput) {
    var out = {
      missed: [], partial: [], overdue: [], skipped: [], cancelled: [],
      future: [], completed: [], onTrack: [],
      totalMissedPages: 0, totalMissedMinutes: 0,
      totalPartialDeficitPages: 0, totalPartialDeficitMinutes: 0,
      affectedBookIds: {}, affectedRoundIds: {}, affectedDates: {}
    };
    if (!plannerInput) return out;

    (plannerInput.activities || []).forEach(function (a) {
      if (!a) return;
      var c = PE.classifyActivity(a);
      var rec = {
        id: a.id, title: a.title || "",
        bookId: a.bookId || null, roundId: a.roundId || null,
        plannedDate: a.plannedDate || null, status: a.status || "planned",
        locked: !!a.locked,
        plannedPages: a.plannedPages | 0, actualPages: a.actualPages | 0,
        plannedDurationMinutes: a.plannedDurationMinutes | 0,
        actualDurationMinutes: a.actualDurationMinutes | 0,
        state: c.state, pageDeficit: c.pageDeficit, timeDeficit: c.timeDeficit
      };

      if (c.state === "missed") {
        out.missed.push(rec);
        out.totalMissedPages += rec.plannedPages;
        out.totalMissedMinutes += rec.plannedDurationMinutes;
      } else if (c.state === "partial") {
        out.partial.push(rec);
        out.totalPartialDeficitPages += rec.pageDeficit;
        out.totalPartialDeficitMinutes += rec.timeDeficit;
      } else if (c.state === "overdue") out.overdue.push(rec);
      else if (c.state === "skipped") out.skipped.push(rec);
      else if (c.state === "cancelled") out.cancelled.push(rec);
      else if (c.state === "completed") out.completed.push(rec);
      else if (c.state === "future") out.future.push(rec);
      else if (c.state === "on_track") out.onTrack.push(rec);

      if (c.state === "missed" || c.state === "partial" || c.state === "skipped") {
        if (a.bookId && a.roundId) {
          out.affectedBookIds[a.bookId] = 1;
          out.affectedRoundIds[a.roundId] = 1;
        }
        if (a.plannedDate) out.affectedDates[a.plannedDate] = 1;
      }
    });

    out.affectedBookIds = Object.keys(out.affectedBookIds);
    out.affectedRoundIds = Object.keys(out.affectedRoundIds);
    out.affectedDates = Object.keys(out.affectedDates).sort();
    return out;
  };

  console.log("[planner.execution.v7] loaded");
})();