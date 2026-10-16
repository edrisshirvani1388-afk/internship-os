(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.queue.v11] R missing"); return; }
  var Q = R.reviewQueue = R.reviewQueue || {};

  var _origQueueItem = Q._queueItem;

  Q._queueItem = function (s, today) {
    var item = _origQueueItem ? _origQueueItem(s, today) : null;
    if (!item) return item;
    item.priorityReason = item.priority ? item.priority.reason : "";
    item.bookPriority = item.priority ? item.priority.bookPriority : "normal";
    item.intervalDays = s.intervalDays | 0;
    item.lastRating = s.lastRating || null;
    item.reviewStateId = s.id;
    item.target = {
      targetType: s.targetType,
      targetId: s.targetId,
      bookId: s.bookId,
      subjectId: s.subjectId,
      pageStart: s.pageStart,
      pageEnd: s.pageEnd
    };
    return item;
  };

  console.log("[residency.review.queue.v11] loaded");
})();