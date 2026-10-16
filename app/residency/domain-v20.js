/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain v20
   Add Enrollment.initialStudyBaseline
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.domain.v20] R missing"); return; }

  var _origCreateEnrollment = R.createEnrollment;
  var _origNormalize = R.normalizeResidencyState;

  function _str(v) { return String(v == null ? "" : v); }

  function _normalizeBaselineInput(input) {
    if (!input || typeof input !== "object") return null;
    var ranges = Array.isArray(input.ranges) ? input.ranges : [];
    if (ranges.length === 0) return null;
    var clean = [];
    ranges.forEach(function (r) {
      if (!r) return;
      var s = parseInt(r.start, 10);
      var e = parseInt(r.end, 10);
      if (isNaN(s) || isNaN(e)) return;
      if (s < 1 || e < 1) return;
      if (s > e) { var t = s; s = e; e = t; }
      clean.push({ start: s, end: e });
    });
    if (clean.length === 0) return null;
    return {
      ranges: clean,
      applyToRounds: (["ALL","FIRST_ONLY","SELECTED_ROUNDS"].indexOf(input.applyToRounds) !== -1)
        ? input.applyToRounds : "ALL",
      selectedRoundIds: Array.isArray(input.selectedRoundIds)
        ? input.selectedRoundIds.filter(function (x) { return typeof x === "string" && x.length; })
        : [],
      notes: _str(input.notes)
    };
  }

  R.createEnrollment = function (input) {
    input = input || {};
    var e = _origCreateEnrollment(input);
    e.initialStudyBaseline = _normalizeBaselineInput(input.initialStudyBaseline);
    return e;
  };

  R.normalizeResidencyState = function (rs) {
    var out = _origNormalize(rs);
    if (!out || !Array.isArray(out.enrollments)) return out;
    out.enrollments.forEach(function (e) {
      if (!e) return;
      if (!("initialStudyBaseline" in e)) {
        e.initialStudyBaseline = null;
      } else if (e.initialStudyBaseline) {
        e.initialStudyBaseline = _normalizeBaselineInput(e.initialStudyBaseline);
      }
    });
    return out;
  };

  console.log("[residency.domain.v20] loaded");
})();