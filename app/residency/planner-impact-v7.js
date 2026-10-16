/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Impact Analysis v7
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.impact.v7] R missing"); return; }
  var PI = R.plannerImpact = R.plannerImpact || {};
  var LIB = window.InternshipLib;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }

  PI.analyzeImpact = function (executionAnalysis, plannerInput, scope) {
    var out = {
      scope: scope || "plan",
      affectedActivityIds: [], affectedDemandIds: [],
      affectedRoundIds: [], affectedBookIds: [], affectedDates: [],
      protectedActivityIds: [], cancelableActivityIds: [], unaffectedActivityIds: []
    };
    if (!executionAnalysis || !plannerInput) return out;

    out.affectedRoundIds = executionAnalysis.affectedRoundIds.slice();
    out.affectedBookIds = executionAnalysis.affectedBookIds.slice();
    out.affectedDates = executionAnalysis.affectedDates.slice();

    (plannerInput.demands || []).forEach(function (d) {
      if (!d) return;
      if (out.affectedBookIds.indexOf(d.bookId) !== -1 ||
          out.affectedRoundIds.indexOf(d.roundId) !== -1) {
        out.affectedDemandIds.push(d.id);
      }
    });

    var today = _today();
    (plannerInput.activities || []).forEach(function (a) {
      if (!a) return;
      if (a.locked) { out.protectedActivityIds.push(a.id); return; }
      if (a.status === "completed" || a.status === "cancelled" || a.status === "skipped") {
        out.protectedActivityIds.push(a.id); return;
      }
      if (a.plannedDate && _cmp(a.plannedDate, today) < 0) {
        out.protectedActivityIds.push(a.id); return;
      }
      if (out.affectedBookIds.indexOf(a.bookId) !== -1 ||
          out.affectedRoundIds.indexOf(a.roundId) !== -1) {
        out.cancelableActivityIds.push(a.id);
      } else {
        out.unaffectedActivityIds.push(a.id);
      }
      out.affectedActivityIds.push(a.id);
    });

    return out;
  };

  console.log("[planner.impact.v7] loaded");
})();