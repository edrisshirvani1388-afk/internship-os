/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Replan Trigger v20.1
   Persistent "replan needed" flag — O(1), no auto-apply
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[replan.trigger.v20] R missing"); return; }

  var RT = R.replanTrigger = R.replanTrigger || {};
  var LIB = window.InternshipLib;
  RT.VERSION = "1.4.0";

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _save() {
    if (window.__os && window.__os.saveState) {
      try { window.__os.saveState(); } catch (e) {}
    }
  }
  function _mkId() {
    return "rt-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _activePlanId() {
    var s = _state();
    if (!s || !s.residency) return null;
    return (s.residency.meta && s.residency.meta.activePlanId) || null;
  }
  function _ensure() {
    var s = _state();
    if (!s) return null;
    if (!Array.isArray(s.replanTriggers)) s.replanTriggers = [];
    return s.replanTriggers;
  }

  var REASON_LABELS = {
    shift_added: "کشیک اضافه شد",
    shift_updated: "کشیک تغییر کرد",
    shift_removed: "کشیک حذف شد",
    task_added: "کار زمان‌دار اضافه شد",
    task_updated: "کار زمان‌دار تغییر کرد",
    task_removed: "کار زمان‌دار حذف شد",
    task_completed: "کار زمان‌دار انجام شد",
    rotation_changed: "چرخش تغییر کرد",
    round_changed: "دوره مطالعه تغییر کرد",
    capacity_context_changed: "تنظیمات ظرفیت تغییر کرد",
    baseline_changed: "Baseline تغییر کرد",
    state_changed: "وضعیت برنامه تغییر کرده"
  };

  function _inferSourceType(type) {
    if (!type) return "unknown";
    if (type.indexOf("task") === 0) return "task";
    if (type.indexOf("shift") === 0) return "shift";
    if (type === "rotation_changed") return "rotation";
    if (type === "round_changed") return "round";
    if (type === "baseline_changed") return "enrollment";
    if (type === "capacity_context_changed") return "capacity";
    return "unknown";
  }

  function _faNum(n) {
    if (LIB && LIB.faNum) { try { return LIB.faNum(n); } catch (e) {} }
    return String(n);
  }

  function _describeDate(str) {
    if (!str) return "";
    var LD = LIB && LIB.date;
    if (!LD) return str;
    var p = LD.parseJalali ? LD.parseJalali(str) : null;
    if (!p) return str;
    var pretty = "";
    if (LD.prettyDate) {
      try { pretty = LD.prettyDate(p.jy, p.jm, p.jd); } catch (e) { pretty = ""; }
    }
    if (!pretty) {
      var JMAN = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
      pretty = _faNum(p.jd) + " " + JMAN[p.jm - 1] + " " + _faNum(p.jy);
    }
    var wd = "";
    try {
      if (LD.weekdayName) {
        wd = LD.weekdayName(p.jy, p.jm, p.jd);
      } else if (LD.prettyDateWD) {
        var wdStr = LD.prettyDateWD(p.jy, p.jm, p.jd);
        var parts = wdStr.split(" · ");
        if (parts.length === 2) return parts[1] + " " + parts[0];
      }
    } catch (e) { wd = ""; }
    return wd ? (wd + " " + pretty) : pretty;
  }

  function _describeEvent(ev) {
    if (!ev) return "تغییر";
    var t = ev.type || "state_changed";
    var title = ev.title ? ("«" + ev.title + "»") : "";
    var before = ev.before || {};
    var after = ev.after || {};

    if (t === "task_added") {
      return "تسک " + title + " اضافه شد" + (after.date ? " — " + _describeDate(after.date) : "");
    }
    if (t === "task_completed") {
      return "تسک " + title + " انجام شد";
    }
    if (t === "task_removed") {
      return "تسک " + title + " حذف شد" + (before.date ? " — " + _describeDate(before.date) : "");
    }
    if (t === "task_updated") {
      if (before.date && after.date && before.date !== after.date) {
        return "تسک " + title + " از " + _describeDate(before.date) + " به " + _describeDate(after.date) + " منتقل شد";
      }
      if (before.time && !after.time) {
        return "تسک " + title + " بدون ساعت شد";
      }
      if (!before.time && after.time) {
        return "تسک " + title + " ساعت‌دار شد — " + after.time;
      }
      return "تسک " + title + " ویرایش شد";
    }
    if (t === "shift_added") {
      return "کشیک جدید اضافه شد" + (after.date ? " — " + _describeDate(after.date) : "");
    }
    if (t === "shift_removed") {
      return "کشیک حذف شد" + (before.date ? " — " + _describeDate(before.date) : "");
    }
    if (t === "shift_updated") {
      if (before.date && after.date && before.date !== after.date) {
        return "کشیک از " + _describeDate(before.date) + " به " + _describeDate(after.date) + " منتقل شد";
      }
      return "کشیک" + (after.date ? " " + _describeDate(after.date) : "") + " ویرایش شد";
    }
    if (t === "round_changed") {
      return "دوره مطالعه " + title + " تغییر کرد";
    }
    if (t === "rotation_changed") {
      return "چرخش بالینی " + title + " تغییر کرد";
    }
    if (t === "baseline_changed") {
      return "مطالعه اولیه به‌روزرسانی شد";
    }
    if (t === "capacity_context_changed") {
      return "تنظیمات ظرفیت تغییر کرد";
    }
    return ev.reason || "تغییر در برنامه";
  }
  RT.describeEvent = _describeEvent;

  RT.notifyChange = function (type, payload) {
    payload = payload || {};
    var pid = payload.planId || _activePlanId();
    if (!pid) return false;
    var _st = payload.sourceType || _inferSourceType(type);
    var _now = Date.now();
    var _ev = {
      type: type || "state_changed",
      at: _now,
      title: payload.title || null,
      before: payload.before || null,
      after: payload.after || null
    };
    return RT.markNeeded({
      id: _mkId(),
      planId: pid,
      type: type || "state_changed",
      sourceType: _st,
      sourceId: payload.sourceId || payload.id || null,
      action: payload.action || null,
      date: payload.date || null,
      reason: REASON_LABELS[type] || "تغییر در برنامه",
      at: _now,
      title: _ev.title,
      before: _ev.before,
      after: _ev.after,
      events: [_ev]
    });
  };

  RT.markNeeded = function (trigger) {
    if (!trigger || !trigger.planId) return false;
    var list = _ensure();
    if (!list) return false;

    var _st = trigger.sourceType || _inferSourceType(trigger.type);
    trigger.sourceType = _st;
    var _sid = (trigger.sourceId === undefined) ? null : trigger.sourceId;

    var incomingEvent = null;
    if (Array.isArray(trigger.events) && trigger.events.length > 0) {
      incomingEvent = trigger.events[trigger.events.length - 1];
    } else {
      incomingEvent = {
        type: trigger.type,
        at: trigger.at || Date.now(),
        title: trigger.title || null,
        before: trigger.before || null,
        after: trigger.after || null
      };
    }

    var found = false;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      if (!t) continue;
      if (t.planId !== trigger.planId) continue;

      // Phase 24.1/25.1 dedup contract:
      //  - rotation_changed → dedup by (planId, type) only
      //  - everything else  → dedup by (planId, sourceType, sourceId)
      if (trigger.type === "rotation_changed") {
        if (t.type !== "rotation_changed") continue;
      } else {
        var _tSt = t.sourceType || _inferSourceType(t.type);
        if (_tSt !== _st) continue;
        var _tSid = (t.sourceId === undefined) ? null : t.sourceId;
        if (_tSid !== _sid) continue;
      }

      if (!Array.isArray(t.events)) {
        t.events = [{
          type: t.type,
          at: t.at || Date.now(),
          title: t.title || null,
          before: t.before || null,
          after: t.after || null
        }];
      }
      t.events.push(incomingEvent);
      t.type = trigger.type;
      t.at = incomingEvent.at;
      if (trigger.date) t.date = trigger.date;
      if (trigger.reason) t.reason = trigger.reason;
      if (trigger.action) t.action = trigger.action;
      if (_sid !== null) t.sourceId = _sid;
      t.sourceType = _st;
      t.title = incomingEvent.title;
      t.before = incomingEvent.before;
      t.after = incomingEvent.after;
      found = true;
      break;
    }
    if (!found) {
      trigger.sourceId = _sid;
      trigger.events = [incomingEvent];
      trigger.title = incomingEvent.title;
      trigger.before = incomingEvent.before;
      trigger.after = incomingEvent.after;
      list.push(trigger);
    }
    _save();
    return true;
  };

  RT.notifyTaskChange = function (task, action, detail) {
    if (!task) return false;
    if (!RT.isRelevantTask(task)) return false;
    var type = action || (task.completed ? "task_completed" : "task_updated");
    var after = (detail && detail.after) ? detail.after : {
      title: task.title || null,
      date: task.date || null,
      time: task.time || null,
      durationMinutes: (typeof task.durationMinutes === "number" ? task.durationMinutes : null)
    };
    var payload = {
      id: task.id,
      sourceType: "task",
      date: task.date || null,
      title: task.title || null,
      after: after
    };
    if (detail && detail.before) payload.before = detail.before;
    return RT.notifyChange(type, payload);
  };

  RT.notifyShiftChange = function (shift, action, detail) {
    if (!shift) return false;
    var type = action || "shift_updated";
    var after = (detail && detail.after) ? detail.after : {
      date: shift.date || null,
      startTime: shift.startTime || null,
      endTime: shift.endTime || null,
      type: shift.type || null
    };
    var payload = {
      id: shift.id,
      sourceType: "shift",
      date: shift.date || null,
      title: shift.type || null,
      after: after
    };
    if (detail && detail.before) payload.before = detail.before;
    return RT.notifyChange(type, payload);
  };

  RT.getStatus = function (planId) {
    if (!planId) planId = _activePlanId();
    var list = _ensure() || [];
    var filtered = list.filter(function (t) { return t && t.planId === planId; });
    var dates = {};
    var lastAt = 0;
    filtered.forEach(function (t) {
      if (t.date) dates[t.date] = 1;
      if (t.at > lastAt) lastAt = t.at;
    });
    return {
      planId: planId,
      needed: filtered.length > 0,
      count: filtered.length,
      reasons: filtered.slice(),
      affectedDates: Object.keys(dates).sort(),
      lastTriggeredAt: lastAt || null
    };
  };

  RT.shouldReplan = function (planId) {
    return RT.getStatus(planId).needed;
  };

  RT.getPendingReasons = function (planId) {
    return RT.getStatus(planId).reasons;
  };

  RT.clear = function (planId) {
    if (!planId) planId = _activePlanId();
    var s = _state();
    if (!s) return false;
    var list = s.replanTriggers || [];
    var before = list.length;
    s.replanTriggers = list.filter(function (t) { return !t || t.planId !== planId; });
    _save();
    return before !== s.replanTriggers.length;
  };

  // ─── Phase 26.3: clear only specific trigger IDs (atomic-safe, no save side effect when no-op) ───
  RT.clearByIds = function (planId, ids) {
    if (!planId || !Array.isArray(ids) || ids.length === 0) {
      return { cleared: 0, clearedIds: [] };
    }
    var s = _state();
    if (!s) return { cleared: 0, clearedIds: [] };
    var idSet = {};
    ids.forEach(function (id) { if (id) idSet[id] = 1; });
    var list = Array.isArray(s.replanTriggers) ? s.replanTriggers : [];
    var clearedIds = [];
    var remaining = [];
    list.forEach(function (t) {
      if (!t) return;
      if (t.planId === planId && idSet[t.id]) {
        clearedIds.push(t.id);
        return;
      }
      remaining.push(t);
    });
    s.replanTriggers = remaining;
    if (clearedIds.length > 0) _save();
    return { cleared: clearedIds.length, clearedIds: clearedIds };
  };

  RT.clearAll = function () {
    var s = _state();
    if (!s) return false;
    var before = (s.replanTriggers || []).length;
    s.replanTriggers = [];
    _save();
    return before > 0;
  };

  RT.listAll = function () { return (_ensure() || []).slice(); };

  RT.isRelevantTask = function (task) {
    if (!task) return false;
    if (task.sourceType === "residency_activity") return false;
    if (task.durationMinutes && task.durationMinutes > 0) return true;
    if (task.time) return true;
    return false;
  };

  RT.__tests = function () {
    /* PATCH:phase-F6-rtmock — isolated mock state (ADR-021) */
    var _realOs = window.__os;
    var _mockState = {
      residency: { meta: { activePlanId: "rt-test-plan" } },
      replanTriggers: []
    };
    window.__os = {
      getState: function () { return _mockState; },
      saveState: function () {}
    };
    try {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    RT.clearAll();

    RT.notifyChange("shift_added", { id: "sh-1", date: "1405/7/15" });
    t("T1: add shift → needed", RT.shouldReplan());

    RT.notifyChange("shift_added", { id: "sh-1", date: "1405/7/15" });
    t("T2: dedupe same trigger", RT.getStatus().count === 1);

    RT.notifyChange("shift_added", { id: "sh-2", date: "1405/7/16" });
    t("T3: different sourceId → 2 triggers", RT.getStatus().count === 2);

    RT.notifyChange("task_added", { id: "t-1", date: "1405/7/17" });
    t("T4: different type → 3 triggers", RT.getStatus().count === 3);

    var st = RT.getStatus();
    t("T5: affectedDates collected (3)", st.affectedDates.length === 3);

    t("T6a: task with duration relevant", RT.isRelevantTask({ durationMinutes: 60 }));
    t("T6b: task with time relevant", RT.isRelevantTask({ time: "08:00" }));
    t("T6c: no-time/dur not relevant", !RT.isRelevantTask({ title: "reminder" }));
    t("T6d: residency_activity excluded", !RT.isRelevantTask({ durationMinutes: 60, sourceType: "residency_activity" }));

    RT.clear();
    t("T7: clear → not needed", !RT.shouldReplan());

    RT.notifyChange("shift_added", { id: "sh-9" });
    RT.clearAll();
    t("T8: clearAll → empty", RT.listAll().length === 0);

    // ─── Phase 24.1: rotation_changed dedup ignores sourceId ───
    RT.clearAll();
    RT.notifyChange("rotation_changed", { id: "rot-A", date: "1405/8/01" });
    t("T9: rotation_changed A -> 1", RT.getStatus().count === 1);
    RT.notifyChange("rotation_changed", { id: "rot-B", date: "1405/8/02" });
    t("T10: rotation_changed B -> still 1", RT.getStatus().count === 1);
    RT.notifyChange("rotation_changed", { id: "rot-C", date: "1405/8/03" });
    t("T11: rotation_changed C -> still 1", RT.getStatus().count === 1);
    t("T12: latest date captured", RT.getStatus().reasons[0].date === "1405/8/03");
    RT.notifyChange("shift_added", { id: "sh-x" });
    t("T13: rotation + shift -> 2", RT.getStatus().count === 2);
    RT.clearAll();

    // ─── Phase 25.1: new dedup contract ───
    RT.clearAll();
    RT.notifyChange("task_added", { id: "tk-1", sourceType: "task", date: "1405/8/01" });
    RT.notifyChange("task_updated", { id: "tk-1", sourceType: "task" });
    RT.notifyChange("task_completed", { id: "tk-1", sourceType: "task" });
    t("T14: task_added+updated+completed -> 1 trigger", RT.getStatus().count === 1);
    t("T15: events aggregated (3)", (RT.getStatus().reasons[0].events || []).length === 3);

    RT.notifyChange("task_added", { id: "tk-2", sourceType: "task", date: "1405/8/02" });
    t("T16: different taskId -> 2 triggers", RT.getStatus().count === 2);

    RT.notifyChange("shift_added", { id: "sh-1", sourceType: "shift", date: "1405/8/03" });
    t("T17: different sourceType -> 3 triggers", RT.getStatus().count === 3);

    RT.notifyChange("round_changed", { id: "r-1", sourceType: "round" });
    t("T18: round_changed (r-1) -> 4 triggers", RT.getStatus().count === 4);
    RT.notifyChange("round_changed", { id: "r-1", sourceType: "round" });
    t("T19: same roundId -> still 4", RT.getStatus().count === 4);
    RT.notifyChange("round_changed", { id: "r-2", sourceType: "round" });
    t("T20: different roundId -> 5 triggers", RT.getStatus().count === 5);
    RT.notifyChange("round_changed", { id: null, sourceType: "round" });
    t("T21: group round_changed (null) -> 6 triggers", RT.getStatus().count === 6);
    RT.notifyChange("round_changed", { id: null, sourceType: "round" });
    t("T22: group round_changed dedup -> still 6", RT.getStatus().count === 6);

    // ─── Phase 25.1b: before/after detail + describeEvent ───
    RT.clearAll();
    RT.notifyChange("task_updated", {
      id: "tk-a", sourceType: "task", title: "مرور پنومونی",
      date: "1405/7/18",
      before: { date: "1405/7/17" },
      after: { date: "1405/7/18" }
    });
    var _st = RT.getStatus();
    t("T23: task_updated detail stored", _st.reasons[0] && _st.reasons[0].events && _st.reasons[0].events[0].before && _st.reasons[0].events[0].before.date === "1405/7/17");
    t("T24: title captured", _st.reasons[0].events[0].title === "مرور پنومونی");

    var _desc = RT.describeEvent(_st.reasons[0].events[0]);
    t("T25: describeEvent mentions move", _desc.indexOf("منتقل شد") !== -1);
    t("T26: describeEvent mentions title", _desc.indexOf("مرور پنومونی") !== -1);

    RT.notifyChange("task_updated", {
      id: "tk-a", sourceType: "task", title: "مرور پنومونی",
      before: { date: "1405/7/18" },
      after: { date: "1405/7/19" }
    });
    var _st2 = RT.getStatus();
    t("T27: merged events count 2", _st2.reasons[0].events.length === 2);
    t("T28: latest after captured", _st2.reasons[0].events[1].after.date === "1405/7/19");

    RT.notifyChange("round_changed", { id: "r-d", sourceType: "round", title: "دور داخلی" });
    var _desc2 = RT.describeEvent(RT.getStatus().reasons[1].events[0]);
    t("T29: round_changed describes as study round", _desc2.indexOf("دوره مطالعه") !== -1);

    // ─── Phase 26.3: clearByIds ───
    RT.clearAll();
    RT.notifyChange("task_added", { id: "tk-1", sourceType: "task", date: "1405/8/01" });
    RT.notifyChange("task_added", { id: "tk-2", sourceType: "task", date: "1405/8/02" });
    RT.notifyChange("shift_added", { id: "sh-1", sourceType: "shift", date: "1405/8/03" });
    var _ids = RT.getStatus().reasons.map(function (t) { return t.id; });
    t("T30: clearByIds returns list", _ids.length === 3);

    var _r1 = RT.clearByIds(RT.getStatus().planId, [_ids[0]]);
    t("T31: clearByIds cleared 1", _r1.cleared === 1 && _r1.clearedIds[0] === _ids[0]);
    t("T32: remaining count 2", RT.getStatus().count === 2);

    var _r2 = RT.clearByIds(RT.getStatus().planId, [_ids[0]]);
    t("T33: clearing already-cleared id → 0", _r2.cleared === 0);

    var _r3 = RT.clearByIds(RT.getStatus().planId, []);
    t("T34: empty list → 0", _r3.cleared === 0);

    var _r4 = RT.clearByIds("non-existent-plan", [_ids[1]]);
    t("T35: wrong planId → 0", _r4.cleared === 0);
    t("T36: remaining count still 2", RT.getStatus().count === 2);

    RT.clearAll();

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
    } finally {
      window.__os = _realOs;
    }
  };

  console.log("[replan.trigger.v20] loaded v" + RT.VERSION);
})();