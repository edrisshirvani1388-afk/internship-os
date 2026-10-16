(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.integration.v10] R missing"); return; }
  var RI = R.reviewIntegration = R.reviewIntegration || {};

  RI.onStudyActivityCompleted = function (activityId) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return null;
    var settings = R.store.getReviewSettings();
    if (!settings.autoRegisterOnStudyComplete) return null;
    if (!settings.enabled) return null;

    var act = (s.residency.activities || []).find(function (a) { return a && a.id === activityId; });
    if (!act) return null;
    if (act.kind !== "study") return null;
    if (act.status !== "completed") return null;
    if (act.actualPages == null || act.actualPages <= 0) return null;

    var pageStart = act.plannedPageStart != null ? act.plannedPageStart :
                    (act.actualPageRanges && act.actualPageRanges[0] ? act.actualPageRanges[0].start : null);
    var pageEnd = act.plannedPageEnd != null ? act.plannedPageEnd :
                  (act.actualPageRanges && act.actualPageRanges[0] ? act.actualPageRanges[0].end : null);
    var targetId, targetType;
    if (pageStart != null && pageEnd != null && act.bookId) {
      targetId = "pages:" + act.bookId + ":" + pageStart + "-" + pageEnd;
      targetType = "page_range";
    } else if (act.bookId) {
      targetId = "book:" + act.bookId;
      targetType = "book";
    } else {
      return null;
    }

    return R.spacedRepetition.registerTarget({
      targetType: targetType,
      targetId: targetId,
      bookId: act.bookId || null,
      subjectId: act.subjectId || null,
      pageStart: pageStart,
      pageEnd: pageEnd
    });
  };

  RI.onTaskCompleted = function (taskId) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s) return null;
    var t = (s.tasks || []).find(function (x) { return x && x.id === taskId; });
    if (!t || !t.completed) return null;
    if (t.sourceType !== "residency_activity") return null;
    var actId = t.residencyActivityId || t.sourceId;
    if (actId) return RI.onStudyActivityCompleted(actId);
    return null;
  };

  console.log("[InternshipResidency.review.integration.v10] loaded");
})();