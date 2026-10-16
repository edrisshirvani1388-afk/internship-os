(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.diff.v14] R missing"); return; }
  var PD = R.plannerDiff = R.plannerDiff || {};

  var DIFF_FIELDS = [
    "plannedDate", "plannedStartTime", "plannedDurationMinutes",
    "plannedPages", "plannedPageStart", "plannedPageEnd",
    "status", "title", "bookId", "subjectId", "locked"
  ];

  PD._diffFields = function (a, b) {
    var changes = [];
    DIFF_FIELDS.forEach(function (f) {
      var va = a ? a[f] : null;
      var vb = b ? b[f] : null;
      var na = (va == null || va === "") ? null : va;
      var nb = (vb == null || vb === "") ? null : vb;
      if (na !== nb) {
        changes.push({ field: f, before: na, after: nb });
      }
    });
    return changes;
  };

  PD.compare = function (before, after) {
    var beforeMap = {};
    (before || []).forEach(function (a) {
      if (a && a.id) beforeMap[a.id] = a;
    });

    var added = [], modified = [], preserved = [];
    var seenBefore = {};

    (after || []).forEach(function (pa) {
      if (!pa) return;
      var id = pa.id;
      var existing = id ? beforeMap[id] : null;
      if (existing) {
        seenBefore[id] = 1;
        var changes = PD._diffFields(existing, pa);
        if (changes.length > 0) modified.push({ id: id, before: existing, after: pa, changes: changes });
        else preserved.push({ id: id, activity: pa });
      } else {
        added.push(pa);
      }
    });

    var cancelled = [];
    Object.keys(beforeMap).forEach(function (id) {
      if (!seenBefore[id]) cancelled.push(beforeMap[id]);
    });

    return {
      added: added,
      modified: modified,
      cancelled: cancelled,
      preserved: preserved,
      statistics: {
        addedCount: added.length,
        modifiedCount: modified.length,
        cancelledCount: cancelled.length,
        preservedCount: preserved.length
      }
    };
  };

  PD.dailyDiff = function (proposal) {
    if (!proposal) return [];
    var beforeByDay = {}, afterByDay = {};
    var before = proposal.beforeActivities || [];
    var after = proposal.proposedActivities || [];
    before.forEach(function (a) {
      var d = a.plannedDate; if (!d) return;
      if (!beforeByDay[d]) beforeByDay[d] = { study: 0, review: 0, assessment: 0, count: 0 };
      var m = (a.plannedDurationMinutes | 0);
      if (a.kind === "study") beforeByDay[d].study += m;
      else if (a.kind === "review") beforeByDay[d].review += m;
      else if (a.kind === "assessment") beforeByDay[d].assessment += m;
      beforeByDay[d].count++;
    });
    after.forEach(function (a) {
      var d = a.plannedDate; if (!d) return;
      if (!afterByDay[d]) afterByDay[d] = { study: 0, review: 0, assessment: 0, count: 0 };
      var m = (a.plannedDurationMinutes | 0);
      if (a.kind === "study") afterByDay[d].study += m;
      else if (a.kind === "review") afterByDay[d].review += m;
      else if (a.kind === "assessment") afterByDay[d].assessment += m;
      afterByDay[d].count++;
    });
    var dates = {};
    Object.keys(beforeByDay).forEach(function (d) { dates[d] = 1; });
    Object.keys(afterByDay).forEach(function (d) { dates[d] = 1; });
    return Object.keys(dates).sort().map(function (d) {
      var b = beforeByDay[d] || { study: 0, review: 0, assessment: 0, count: 0 };
      var a = afterByDay[d] || { study: 0, review: 0, assessment: 0, count: 0 };
      return {
        date: d,
        before: b, after: a,
        delta: {
          study: a.study - b.study,
          review: a.review - b.review,
          assessment: a.assessment - b.assessment,
          count: a.count - b.count
        }
      };
    });
  };

  PD.beforeAfterStats = function (before, after) {
    function _stats(list) {
      var total = 0, study = 0, review = 0, assessment = 0, pages = 0;
      (list || []).forEach(function (a) {
        var m = (a.plannedDurationMinutes | 0);
        total += m;
        if (a.kind === "study") study += m;
        else if (a.kind === "review") review += m;
        else if (a.kind === "assessment") assessment += m;
        pages += (a.plannedPages | 0);
      });
      return { totalMinutes: total, studyMinutes: study, reviewMinutes: review, assessmentMinutes: assessment, totalPages: pages, count: (list || []).length };
    }
    var s1 = _stats(before);
    var s2 = _stats(after);
    return {
      before: s1,
      after: s2,
      delta: {
        totalMinutes: s2.totalMinutes - s1.totalMinutes,
        studyMinutes: s2.studyMinutes - s1.studyMinutes,
        reviewMinutes: s2.reviewMinutes - s1.reviewMinutes,
        assessmentMinutes: s2.assessmentMinutes - s1.assessmentMinutes,
        totalPages: s2.totalPages - s1.totalPages,
        count: s2.count - s1.count
      }
    };
  };

  console.log("[planner.diff.v14] loaded");
})();