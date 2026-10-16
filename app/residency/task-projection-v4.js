/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Task Projection v4
   Activity → Task Sync (idempotent)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.task-projection.v4] R missing"); return; }
  var TP = R.taskProjection = R.taskProjection || {};
  var S = R.store;

  function _state() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _save() {
    if (window.__os && typeof window.__os.saveState === "function") {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _mkId(prefix) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(prefix); } catch (e) {} }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _taskTypeFor(activity) {
    if (!activity) return "other";
    if (activity.kind === "review")     return "review";
    if (activity.kind === "assessment") return "exam";
    return "study";
  }
  function _titleFor(activity) {
    var parts = [];
    if (activity.bookId) {
      var b = S.getBook(activity.bookId);
      if (b) parts.push(b.title);
    }
    if (activity.kind === "assessment") {
      var assm = activity.assessmentId ? S.getAssessment(activity.assessmentId) : null;
      if (assm) parts.push(assm.title);
    } else if (activity.plannedPageStart != null && activity.plannedPageEnd != null) {
      parts.push("صفحات " + activity.plannedPageStart + "–" + activity.plannedPageEnd);
    }
    if (parts.length === 0) parts.push(activity.kind === "review" ? "مرور رزیدنتی" : "مطالعه رزیدنتی");
    return parts.join(" — ");
  }

  TP.getTaskForActivity = function (activityId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return null;
    var activity = S.getActivity(activityId);
    if (activity && activity.taskId) {
      var byId = s.tasks.find(function (t) { return t && t.id === activity.taskId; });
      if (byId) return byId;
    }
    return s.tasks.find(function (t) {
      return t && t.sourceType === "residency_activity" && t.sourceId === activityId;
    }) || null;
  };

  TP.syncActivityToTask = function (activityId) {
    var activity = S.getActivity(activityId);
    if (!activity) return { ok: false, error: "activity not found" };
    if (!activity.plannedDate) return { ok: false, error: "no plannedDate → no task" };
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return { ok: false, error: "state missing" };

    var existing = TP.getTaskForActivity(activityId);
    var title = _titleFor(activity);
    var tType = _taskTypeFor(activity);
    var now = Date.now();

    if (existing) {
      // Update
      existing.title = title;
      existing.areaId = "residency";
      existing.taskType = tType;
      existing.date = activity.plannedDate;
      if (activity.plannedStartTime) existing.time = activity.plannedStartTime;
      if (activity.plannedDurationMinutes != null) existing.durationMinutes = activity.plannedDurationMinutes;
      existing.sourceType = "residency_activity";
      existing.sourceId = activity.id;
      existing.residencyActivityId = activity.id;
      existing.updatedAt = now;
      _save();
      return { ok: true, taskId: existing.id, action: "updated" };
    }

    // Create
    var newId = _mkId("t");
    s.tasks.push({
      id: newId,
      title: title,
      areaId: "residency",
      date: activity.plannedDate,
      time: activity.plannedStartTime || "",
      durationMinutes: (activity.plannedDurationMinutes != null ? activity.plannedDurationMinutes : null),
      priority: "normal",
      recurrence: "none",
      description: "",
      completed: (activity.status === "completed"),
      sourceType: "residency_activity",
      sourceId: activity.id,
      residencyActivityId: activity.id,
      taskType: tType,
      createdAt: now,
      updatedAt: now
    });
    S.updateActivity(activityId, { taskId: newId });
    _save();
    return { ok: true, taskId: newId, action: "created" };
  };

  TP.detachActivityFromTask = function (activityId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return false;
    var activity = S.getActivity(activityId);
    var taskId = activity && activity.taskId;
    var removed = 0;
    if (taskId) {
      var before = s.tasks.length;
      s.tasks = s.tasks.filter(function (t) { return !(t && t.id === taskId); });
      removed += (before - s.tasks.length);
    }
    var before2 = s.tasks.length;
    s.tasks = s.tasks.filter(function (t) {
      return !(t && t.sourceType === "residency_activity" && t.sourceId === activityId);
    });
    removed += (before2 - s.tasks.length);
    if (activity) S.updateActivity(activityId, { taskId: null });
    _save();
    return removed > 0;
  };

  // ─── Task → Activity ───
  TP.onTaskCompleted = function (taskId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return null;
    var task = s.tasks.find(function (t) { return t && t.id === taskId; });
    if (!task || task.sourceType !== "residency_activity") return null;
    var actId = task.residencyActivityId || task.sourceId;
    if (!actId) return null;
    var activity = S.getActivity(actId);
    if (!activity) return null;
    if (task.completed && activity.status !== "completed") {
      S.updateActivity(actId, { status: "completed" });
    } else if (!task.completed && activity.status === "completed") {
      S.updateActivity(actId, { status: "in_progress" });
    }
    return activity;
  };

  TP.onTaskRescheduled = function (taskId) {
    var s = _state();
    if (!s || !Array.isArray(s.tasks)) return null;
    var task = s.tasks.find(function (t) { return t && t.id === taskId; });
    if (!task || task.sourceType !== "residency_activity") return null;
    var actId = task.residencyActivityId || task.sourceId;
    if (!actId) return null;
    S.updateActivity(actId, {
      plannedDate: task.date || null,
      plannedStartTime: task.time || null,
      plannedDurationMinutes: task.durationMinutes != null ? task.durationMinutes : null
    });
    return S.getActivity(actId);
  };

  console.log("[InternshipResidency.task-projection.v4] loaded");
})();