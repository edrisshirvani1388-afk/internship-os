/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Data Quality v9
   Detect malformed data before computing metrics
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.quality.v9] R missing"); return; }
  var Q = R.analyticsQuality = R.analyticsQuality || {};
  var LIB = window.InternshipLib;

  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }

  Q.check = function (activities) {
    var diagnostics = [];
    var seenIds = {};
    (activities || []).forEach(function (a, i) {
      if (!a) { diagnostics.push({ type: "null_activity", index: i, severity: "error" }); return; }
      if (!a.id) diagnostics.push({ type: "missing_id", index: i, severity: "error" });
      else if (seenIds[a.id]) diagnostics.push({ type: "duplicate_id", id: a.id, severity: "warning" });
      else seenIds[a.id] = 1;

      if (a.plannedDate && LIB && LIB.date) {
        if (!LIB.date.parseJalali(a.plannedDate)) {
          diagnostics.push({ type: "invalid_date", id: a.id, date: a.plannedDate, severity: "error" });
        }
      }
      if (a.plannedDurationMinutes != null && a.plannedDurationMinutes < 0) {
        diagnostics.push({ type: "negative_duration", id: a.id, value: a.plannedDurationMinutes, severity: "error" });
      }
      if (a.actualDurationMinutes != null && a.actualDurationMinutes < 0) {
        diagnostics.push({ type: "negative_actual_duration", id: a.id, value: a.actualDurationMinutes, severity: "error" });
      }
      if (a.plannedPages != null && a.plannedPages < 0) {
        diagnostics.push({ type: "negative_pages", id: a.id, value: a.plannedPages, severity: "error" });
      }
      if (a.actualPages != null && a.actualPages < 0) {
        diagnostics.push({ type: "negative_actual_pages", id: a.id, value: a.actualPages, severity: "error" });
      }
      if (a.plannedPageStart != null && a.plannedPageEnd != null && a.plannedPages != null) {
        var expected = a.plannedPageEnd - a.plannedPageStart + 1;
        if (expected !== a.plannedPages) {
          diagnostics.push({ type: "page_range_mismatch", id: a.id, expected: expected, got: a.plannedPages, severity: "warning" });
        }
      }
      if (a.status && ["planned","in_progress","completed","partial","skipped","cancelled"].indexOf(a.status) === -1) {
        diagnostics.push({ type: "invalid_status", id: a.id, status: a.status, severity: "warning" });
      }
    });

    var status = "good";
    if (diagnostics.some(function (d) { return d.severity === "error"; })) status = "invalid";
    else if (diagnostics.length > 0) status = "degraded";

    return {
      status: status,
      issueCount: diagnostics.length,
      diagnostics: diagnostics.slice(0, 50)
    };
  };

  console.log("[analytics.quality.v9] loaded");
})();