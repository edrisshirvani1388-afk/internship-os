/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Scheduling Projection v20.1
   Read-only, computed projection from Source-of-Truth
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[scheduling.projection.v20] R missing"); return; }

  var SP = R.schedulingProjection = R.schedulingProjection || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;
  var TIME = LIB && LIB.time;

  SP.VERSION = "1.0.0";
  SP.ROLES = ["anchor", "block", "flexible", "reminder", "context"];

  var _ROLE_PRIORITY = {
    anchor: 0, block: 1, flexible: 2, reminder: 3, context: 4
  };

  /* ═══ TIME HELPERS ═══ */
  function _normTime(t) {
    if (!t) return null;
    if (TIME && TIME.normalizeTime) {
      try {
        var v = TIME.normalizeTime(t);
        if (v) return v;
      } catch (e) {}
    }
    if (typeof t !== "string") return null;
    var parts = t.split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
  }

  function _timeToMinutes(t) {
    if (!t) return null;
    if (TIME && TIME.timeToMinutes) {
      try {
        var v = TIME.timeToMinutes(t);
        if (v != null) return v;
      } catch (e) {}
    }
    var parts = t.split(":");
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function _minutesToTime(min) {
    if (min == null) return null;
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function _computeEndTime(startTime, durationMinutes) {
    if (!startTime || !durationMinutes || durationMinutes <= 0) return null;
    var sm = _timeToMinutes(startTime);
    if (sm == null) return null;
    return _minutesToTime(sm + durationMinutes);
  }

  function _shiftDuration(startTime, endTime) {
    if (!startTime || !endTime) return null;
    var sm = _timeToMinutes(startTime);
    var em = _timeToMinutes(endTime);
    if (sm == null || em == null) return null;
    return em > sm ? (em - sm) : ((1440 - sm) + em);
  }

  function _sid(prefix, id) {
    return prefix + ":" + String(id);
  }

  function _cmpDate(a, b) {
    if (a === b) return 0;
    if (!DATE || !DATE.compareJalaliDate) return a < b ? -1 : 1;
    return DATE.compareJalaliDate(a, b);
  }

  function _isValidDate(s) {
    if (!s) return false;
    if (!DATE || !DATE.parseJalali) return false;
    return !!DATE.parseJalali(s);
  }

  function _pickTitle(task, fallback) {
    if (task && task.title) return task.title;
    return fallback || "";
  }

  /* ═══ ADAPTERS ═══ */

  SP.projectTask = function (task) {
    if (!task || !task.id) return null;
    /* [PATCH:f4a-cancelled] cancelled tasks hidden from projection (audit preserved) */
    if (task.cancelled === true) return null;
    if (!_isValidDate(task.date)) return null;

    var startTime = _normTime(task.time);
    var dur = (typeof task.durationMinutes === "number" && task.durationMinutes > 0)
      ? task.durationMinutes : null;
    var endTime = _computeEndTime(startTime, dur);

    var role;
    if (startTime && dur) role = "block";
    else if (dur)         role = "flexible";
    else                  role = "reminder";

    return {
      id: _sid("task", task.id),
      sourceType: "task",
      sourceId: task.id,
      title: _pickTitle(task, ""),
      category: task.areaId || "",
      date: task.date,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: dur,
      role: role,
      status: task.completed ? "completed" : "pending",
      context: null,
      _cont: task._cont || null,  /* PATCH:phase-F7-split5 */
      _sleepAuto: task._sleepAuto || null
    };
  };

  SP.projectShift = function (shift) {
    if (!shift || !shift.id) return null;
    if (!_isValidDate(shift.date)) return null;

    var startTime = _normTime(shift.startTime);
    var endTime = _normTime(shift.endTime);
    var dur = _shiftDuration(startTime, endTime);
    var role = startTime ? "anchor" : "context";

    return {
      id: _sid("shift", shift.id),
      sourceType: "shift",
      sourceId: shift.id,
      title: shift.type || "کشیک",
      category: "shift",
      date: shift.date,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: dur,
      role: role,
      status: "scheduled",
      context: { kind: "shift", type: shift.type || null }
    };
  };

  SP.projectResidencyActivity = function (activity) {
    if (!activity || !activity.id) return null;
    if (!_isValidDate(activity.plannedDate)) return null;
    if (activity.status === "cancelled") return null;

    var startTime = _normTime(activity.plannedStartTime);
    var dur = (typeof activity.plannedDurationMinutes === "number" && activity.plannedDurationMinutes > 0)
      ? activity.plannedDurationMinutes : null;
    var endTime = _computeEndTime(startTime, dur);

    var role;
    if (startTime && dur) role = "block";
    else if (dur)         role = "flexible";
    else                  role = "reminder";

    var title = activity.title || activity.notes || "";
    if (!title) title = "فعالیت بدون عنوان";

    return {
      id: _sid("residencyActivity", activity.id),
      sourceType: "residencyActivity",
      sourceId: activity.id,
      title: title,
      category: activity.kind || "study",
      date: activity.plannedDate,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: dur,
      role: role,
      status: activity.status || "planned",
      context: null
    };
  };

  // Rotation intentionally NOT projected (day-level context, not scheduled item)
  SP.projectRotation = function () { return null; };

  // Case only projected if it has real timing
  SP.projectCase = function (caseItem) {
    if (!caseItem || !caseItem.id) return null;
    if (!_isValidDate(caseItem.date)) return null;
    if (!caseItem.time && !caseItem.durationMinutes) return null;

    var startTime = _normTime(caseItem.time);
    var dur = (typeof caseItem.durationMinutes === "number" && caseItem.durationMinutes > 0)
      ? caseItem.durationMinutes : null;
    var endTime = _computeEndTime(startTime, dur);

    var role;
    if (startTime && dur) role = "block";
    else if (dur)         role = "flexible";
    else                  role = "reminder";

    return {
      id: _sid("case", caseItem.id),
      sourceType: "case",
      sourceId: caseItem.id,
      title: caseItem.title || "",
      category: "case",
      date: caseItem.date,
      startTime: startTime,
      endTime: endTime,
      durationMinutes: dur,
      role: role,
      status: "recorded",
      context: null
    };
  };

  /* ═══ SORTING ═══ */
  function _sortItems(items) {
    items.sort(function (a, b) {
      // 1. date asc
      var dc = _cmpDate(a.date, b.date);
      if (dc !== 0) return dc;
      // 2. startTime asc (null last)
      var aT = a.startTime, bT = b.startTime;
      if (aT && !bT) return -1;
      if (!aT && bT) return 1;
      if (aT && bT && aT !== bT) return aT < bT ? -1 : 1;
      // 3. role priority
      var aR = _ROLE_PRIORITY[a.role] != null ? _ROLE_PRIORITY[a.role] : 99;
      var bR = _ROLE_PRIORITY[b.role] != null ? _ROLE_PRIORITY[b.role] : 99;
      if (aR !== bR) return aR - bR;
      // 4. sourceType
      if (a.sourceType !== b.sourceType) {
        return a.sourceType < b.sourceType ? -1 : 1;
      }
      // 5. sourceId
      return a.sourceId < b.sourceId ? -1 : (a.sourceId > b.sourceId ? 1 : 0);
    });
    return items;
  }

  /* ═══ PUBLIC API ═══ */

  /* [PATCH:mvp02] Virtual recurrence expansion */
  function _addDaysJ(d, n){ var p=DATE.parseJalali(d); if(!p)return null; var r=DATE.addJalaliDays(p.jy,p.jm,p.jd,n); return DATE.dateKey(r.jy,r.jm,r.jd); }
  function _addMonthsJ(d, n){ var p=DATE.parseJalali(d); if(!p)return null; var r=DATE.addJalaliMonthsToDate(p.jy,p.jm,p.jd,n); return DATE.dateKey(r.jy,r.jm,r.jd); }
  function _expandRecurrence(task, baseItem, rangeStart, rangeEnd){
    if(!task || !task.recurrence || task.recurrence === "none") return [];
    if(!rangeStart || !rangeEnd) return [];
    var step;
    if(task.recurrence === "daily") step = function(d){ return _addDaysJ(d,1); };
    else if(task.recurrence === "weekly") step = function(d){ return _addDaysJ(d,7); };
    else if(task.recurrence === "monthly") step = function(d){ return _addMonthsJ(d,1); };
    else return [];
    var out=[]; var safety=0; var d=step(task.date);
    while(d && _cmpDate(d, rangeEnd) <= 0 && safety < 5000){
      safety++;
      if(_cmpDate(d, rangeStart) >= 0 && d !== task.date){
        var exc = task.recurrenceExceptions && task.recurrenceExceptions[d];
        var st = "pending";
        if(exc === "completed") st = "completed";
        else if(exc === "skipped") st = "cancelled";
        if (!(task.recurrenceEnd && d > task.recurrenceEnd)) out.push({ id: "virtual:" + task.id + "@" + d, /* PATCH:phase-F7-recEnd */ sourceType: "task", sourceId: task.id, title: baseItem.title, category: baseItem.category, date: d, startTime: baseItem.startTime, endTime: baseItem.endTime, durationMinutes: baseItem.durationMinutes, role: baseItem.role, status: st, context: null, isVirtual: true, parentTaskId: task.id, occurrenceDate: d });
      }
      d = step(d);
    }
    return out;
  }

  SP.projectAll = function (state, options) {
    options = options || {};
    var rangeStart = options.rangeStart || null;
    var rangeEnd = options.rangeEnd || null;
    if (!rangeStart || !rangeEnd) { var _t0 = (DATE && DATE.todayJalaliString) ? DATE.todayJalaliString() : null; if (_t0) { if (!rangeStart) rangeStart = _t0; if (!rangeEnd) rangeEnd = _addDaysJ(_t0, 180); } }
    var items = [];
    var warnings = [];

    if (!state) return { items: items, byDate: {}, warnings: warnings };

    (state.tasks || []).forEach(function (t) {
      if (!t) return;
      if (options.skipCompleted && t.completed) return;
      if (options.skipReminders && !t.durationMinutes && !t.time) return;
      try {
        var item = SP.projectTask(t);
        if (item) { items.push(item); var _vrts = _expandRecurrence(t, item, rangeStart, rangeEnd); for (var _vi=0; _vi<_vrts.length; _vi++) items.push(_vrts[_vi]); }
      } catch (e) {
        warnings.push({ sourceType: "task", sourceId: t.id, error: String(e) });
      }
    });

    (state.shifts || []).forEach(function (sh) {
      if (!sh) return;
      try {
        var item = SP.projectShift(sh);
        if (item) items.push(item);
      } catch (e) {
        warnings.push({ sourceType: "shift", sourceId: sh.id, error: String(e) });
      }
    });

    var rs = state.residency || {};
    (rs.activities || []).forEach(function (a) {
      if (!a) return;
      try {
        var item = SP.projectResidencyActivity(a);
        if (item) items.push(item);
      } catch (e) {
        warnings.push({ sourceType: "residencyActivity", sourceId: a.id, error: String(e) });
      }
    });

    (state.cases || []).forEach(function (c) {
      if (!c) return;
      try {
        var item = SP.projectCase(c);
        if (item) items.push(item);
      } catch (e) {
        warnings.push({ sourceType: "case", sourceId: c.id, error: String(e) });
      }
    });

    _sortItems(items);

    var byDate = {};
    items.forEach(function (it) {
      if (!byDate[it.date]) byDate[it.date] = [];
      byDate[it.date].push(it);
    });

    return { items: items, byDate: byDate, warnings: warnings };
  };

  SP.projectDate = function (state, date, options) {
    if (!date) return [];
    var _opts4 = Object.assign({}, options || {}, { rangeStart: date, rangeEnd: date });
    var all = SP.projectAll(state, _opts4);
    return all.byDate[date] || [];
  };

  SP.projectRange = function (state, startDate, endDate, options) {
    if (!startDate || !endDate) return [];
    var _opts5 = Object.assign({}, options || {}, { rangeStart: startDate, rangeEnd: endDate });
    var all = SP.projectAll(state, _opts5);
    var out = [];
    for (var i = 0; i < all.items.length; i++) {
      var it = all.items[i];
      if (_cmpDate(it.date, startDate) < 0) continue;
      if (_cmpDate(it.date, endDate) > 0) continue;
      out.push(it);
    }
    return out;
  };

  /* ═══ DEBUG ═══ */
  SP.summarize = function (result) {
    if (!result || !result.items) return null;
    var byRole = {};
    var bySourceType = {};
    result.items.forEach(function (it) {
      byRole[it.role] = (byRole[it.role] || 0) + 1;
      bySourceType[it.sourceType] = (bySourceType[it.sourceType] || 0) + 1;
    });
    return {
      total: result.items.length,
      byRole: byRole,
      bySourceType: bySourceType,
      warnings: (result.warnings || []).length
    };
  };

  /* ═══ TESTS (call: R.schedulingProjection.__tests()) ═══ */
  SP.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    // ─── Synthetic state ───
    var STATE = {
      tasks: [
        { id: "t1", title: "Timed task", areaId: "study", date: "1405/7/15",
          time: "08:00", durationMinutes: 60, completed: false },
        { id: "t2", title: "Flexible task", areaId: "body", date: "1405/7/15",
          durationMinutes: 30, completed: false },
        { id: "t3", title: "Reminder", areaId: "life", date: "1405/7/15",
          completed: false }
      ],
      shifts: [
        { id: "sh1", date: "1405/7/15", startTime: "08:00", endTime: "20:00",
          type: "کشیک ۲۴ ساعته" },
        { id: "sh2", date: "1405/7/16", type: "آنکال" }
      ],
      rotations: [],
      residency: {
        activities: [
          { id: "a1", kind: "study", plannedDate: "1405/7/15",
            plannedStartTime: "10:00", plannedDurationMinutes: 90,
            status: "planned" },
          { id: "a2", kind: "review", plannedDate: "1405/7/15",
            plannedDurationMinutes: 30, status: "planned" }
        ]
      },
      cases: [
        { id: "c1", title: "Case no time", date: "1405/7/15" },
        { id: "c2", title: "Case with time", date: "1405/7/15",
          time: "14:00", durationMinutes: 45 }
      ]
    };

    // ─── T1: Task with time → block ───
    var t1 = SP.projectTask(STATE.tasks[0]);
    t("T1: Timed task → block", t1 && t1.role === "block" && t1.startTime === "08:00");

    // ─── T2: Task no time but duration → flexible ───
    var t2 = SP.projectTask(STATE.tasks[1]);
    t("T2: Flexible task → flexible", t2 && t2.role === "flexible" && t2.startTime === null && t2.durationMinutes === 30);

    // ─── T3: Task no duration → reminder ───
    var t3 = SP.projectTask(STATE.tasks[2]);
    t("T3: Reminder → reminder", t3 && t3.role === "reminder" && t3.durationMinutes === null);

    // ─── T4: Timed shift → anchor ───
    var sh1 = SP.projectShift(STATE.shifts[0]);
    t("T4: Timed shift → anchor", sh1 && sh1.role === "anchor" && sh1.startTime === "08:00" && sh1.endTime === "20:00");

    // ─── T5: Untimed shift → context, no start/end ───
    var sh2 = SP.projectShift(STATE.shifts[1]);
    t("T5: Untimed shift → context, no start/end", sh2 && sh2.role === "context" && sh2.startTime === null && sh2.endTime === null);

    // ─── T6: Residency activity → projection ───
    var a1 = SP.projectResidencyActivity(STATE.residency.activities[0]);
    t("T6: Residency activity → projection", a1 && a1.role === "block" && a1.sourceType === "residencyActivity");
    t("T6b: Untitled residency activity -> fallback title (D7)", a1 && a1.title === "فعالیت بدون عنوان");

    // ─── T7: Activity endTime computed correctly ───
    t("T7: Activity endTime = start + duration (10:00 + 90m = 11:30)",
      a1 && a1.endTime === "11:30");

    // ─── T8: Case without timing → NOT projected ───
    var c1 = SP.projectCase(STATE.cases[0]);
    var c2 = SP.projectCase(STATE.cases[1]);
    t("T8: Case without timing → null; with time → projected",
      c1 === null && c2 !== null && c2.role === "block");

    // ─── T9: Same state → exact same projection ───
    var r1 = SP.projectAll(STATE);
    var r2 = SP.projectAll(STATE);
    t("T9: Same state → same projection",
      r1.items.length === r2.items.length &&
      JSON.stringify(r1.items) === JSON.stringify(r2.items));

    // ─── T10: State not mutated ───
    var before = JSON.stringify(STATE);
    SP.projectAll(STATE);
    var after = JSON.stringify(STATE);
    t("T10: State not mutated", before === after);

    // ─── T11: Mixed state → correct total count ───
    // t1, t2, t3 = 3 tasks
    // sh1, sh2 = 2 shifts
    // a1, a2 = 2 activities
    // c1 (null), c2 = 1 case
    // Total = 8
    t("T11: Mixed state → 8 items", r1.items.length === 8);

    // ─── T12: Sorting deterministic ───
    // Day 1405/7/15:
    //   sh1 (08:00, anchor)
    //   t1  (08:00, block)
    //   a1  (10:00, block)
    //   c2  (14:00, block)
    //   a2  (null, flexible, sourceType=residencyActivity)
    //   t2  (null, flexible, sourceType=task)
    //   t3  (null, reminder)
    // Day 1405/7/16:
    //   sh2 (null, context)
    // Note: alphabetical sourceType: "residencyActivity" < "task"
    var expectedOrder = ["shift:sh1", "task:t1", "residencyActivity:a1", "case:c2",
                         "residencyActivity:a2", "task:t2", "task:t3", "shift:sh2"];
    var actualOrder = r1.items.map(function (it) { return it.id; });
    t("T12: Sorting deterministic",
      JSON.stringify(expectedOrder) === JSON.stringify(actualOrder));

    // ─── Extra: projectDate / projectRange ───
    var d1 = SP.projectDate(STATE, "1405/7/15");
    t("Extra: projectDate returns 7 items for 1405/7/15", d1.length === 7);

    var range = SP.projectRange(STATE, "1405/7/15", "1405/7/16");
    t("Extra: projectRange returns 8 items", range.length === 8);

    var summ = SP.summarize(r1);
    // block: t1, a1, c2 = 3
    // flexible: t2, a2 = 2
    // reminder: t3 = 1
    // anchor: sh1 = 1
    // context: sh2 = 1
    t("Extra: summarize.byRole has anchor+block+flexible+reminder+context",
      summ && summ.byRole.anchor === 1 && summ.byRole.block === 3 &&
      summ.byRole.flexible === 2 && summ.byRole.reminder === 1 &&
      summ.byRole.context === 1);

    // ─── Summary ───
    /* [PATCH:mvp03-tests] 15 recurrence-specific tests */
    (function () {
      function _mkState(tasks) { return { tasks: tasks || [], shifts: [], rotations: [], residency: { activities: [] }, cases: [] }; }
      function _mkTask(id, date, rec, opts) {
        opts = opts || {};
        var tk = { id: id, title: opts.title || id, areaId: opts.areaId || "study", date: date, time: opts.time || "", durationMinutes: opts.dur || null, completed: !!opts.done, recurrence: rec || "none" };
        if (opts.exc) tk.recurrenceExceptions = opts.exc;
        return tk;
      }
      function _instances(st, parentId, rangeStart, rangeEnd) {
        var all = SP.projectAll(st, { rangeStart: rangeStart, rangeEnd: rangeEnd });
        return all.items.filter(function (x) { return x.sourceId === parentId; });
      }
      function t2(name, cond, info) {
        results.push({ name: name, pass: !!cond, info: info });
        console.log((cond ? "✅" : "❌") + " " + name);
      }
      /* PATCH:mvp03-tests-fix */
      var D1 = "1405/7/20";
      var D2 = "1405/7/21";
      var D3 = "1405/7/22";
      var D10 = "1405/7/29";
      var D30 = "1405/8/19";

      // R1: non-recurring → 1 instance only
      (function () {
        var st = _mkState([_mkTask("r1", D1, "none")]);
        var ins = _instances(st, "r1", D1, D30);
        t2("R1: non-recurring → 1 instance", ins.length === 1, ins.length);
      })();

      // R2: daily → correct count over 10 days
      (function () {
        var st = _mkState([_mkTask("r2", D1, "daily")]);
        var ins = _instances(st, "r2", D1, D10);
        t2("R2: daily 10-day → 10 instances", ins.length === 10, ins.length);
      })();

      // R3: weekly → 1 per 7 days
      (function () {
        var st = _mkState([_mkTask("r3", D1, "weekly")]);
        var ins = _instances(st, "r3", D1, D30);
        t2("R3: weekly 30-day → 5 instances", ins.length === 5, ins.length);
      })();

      /* PATCH:mvp03-r4fix */ // R4: monthly respects month boundary
      (function () {
        var st = _mkState([_mkTask("r4", D1, "monthly")]);
        var ins = _instances(st, "r4", D1, "1405/12/29");
        t2("R4: monthly 5 months → 6 instances (parent + 5 virtual)", ins.length === 6, ins.length);
        var dates = ins.map(function (x) { return x.date; }).sort();
        var ok = dates.indexOf("1405/8/20") >= 0 && dates.indexOf("1405/9/20") >= 0;
        t2("R4b: monthly dates correct", ok, dates);
      })();

      // R5: projectDate == projectAll filter for same date
      (function () {
        var st = _mkState([_mkTask("r5", D1, "daily")]);
        var all = SP.projectAll(st, { rangeStart: D1, rangeEnd: D30 });
        var viaAll = all.items.filter(function (x) { return x.sourceId === "r5" && x.date === D2; });
        var viaDate = SP.projectDate(st, D2, {}).filter(function (x) { return x.sourceId === "r5"; });
        t2("R5: projectDate consistent with projectAll", viaAll.length === viaDate.length && viaAll.length === 1, { all: viaAll.length, date: viaDate.length });
      })();

      // R6: state not mutated by projection
      (function () {
        var st = _mkState([_mkTask("r6", D1, "daily")]);
        var before = JSON.stringify(st);
        SP.projectAll(st, { rangeStart: D1, rangeEnd: D30 });
        SP.projectDate(st, D2, {});
        var after = JSON.stringify(st);
        t2("R6: projection does not mutate state", before === after, "");
      })();

      // R7: ID stable across runs
      (function () {
        var st = _mkState([_mkTask("r7", D1, "daily")]);
        var a = _instances(st, "r7", D1, D10).map(function (x) { return x.id; });
        var b = _instances(st, "r7", D1, D10).map(function (x) { return x.id; });
        t2("R7: ID stable across runs", JSON.stringify(a) === JSON.stringify(b), "");
      })();

      // R8: no duplicate on repeated projection
      (function () {
        var st = _mkState([_mkTask("r8", D1, "daily")]);
        var a = _instances(st, "r8", D1, D10);
        var b = _instances(st, "r8", D1, D10);
        var idsA = a.map(function (x) { return x.id; }).sort().join(",");
        var idsB = b.map(function (x) { return x.id; }).sort().join(",");
        t2("R8: no duplicates on repeat", idsA === idsB && a.length === 10, a.length);
      })();

      // R9: complete one occurrence → others unaffected
      (function () {
        var exc = {};
        exc[D2] = "completed";
        var st = _mkState([_mkTask("r9", D1, "daily", { exc: exc })]);
        var ins = _instances(st, "r9", D1, D10);
        var done = ins.filter(function (x) { return x.status === "completed"; });
        t2("R9: one exception only marks that date", done.length === 1 && done[0].date === D2, done.map(function (x) { return x.date; }));
      })();

      // R10: exception persists through serialization
      (function () {
        var exc = {};
        exc[D2] = "completed";
        var st1 = _mkState([_mkTask("r10", D1, "daily", { exc: exc })]);
        var ser = JSON.stringify(st1);
        var st2 = JSON.parse(ser);
        var ins = _instances(st2, "r10", D1, D10);
        var done = ins.filter(function (x) { return x.status === "completed"; });
        t2("R10: exception survives serialization", done.length === 1 && done[0].date === D2, "");
      })();

      // R11: virtual occurrence has isVirtual + parentTaskId
      (function () {
        var st = _mkState([_mkTask("r11", D1, "daily")]);
        var ins = _instances(st, "r11", D1, D10);
        var v = ins.filter(function (x) { return x.isVirtual; });
        var ok = v.length === 9 && v.every(function (x) { return x.parentTaskId === "r11" && x.occurrenceDate; });
        t2("R11: virtual items tagged correctly", ok, { virtuals: v.length });
      })();

      // R12: parent task on its own date is not duplicated
      (function () {
        var st = _mkState([_mkTask("r12", D1, "daily")]);
        var ins = _instances(st, "r12", D1, D10);
        var onD1 = ins.filter(function (x) { return x.date === D1; });
        t2("R12: parent date has exactly 1 instance", onD1.length === 1 && !onD1[0].isVirtual, onD1.length);
      })();

      // R13: removing parent removes virtuals
      (function () {
        var st = _mkState([_mkTask("r13", D1, "daily")]);
        var before = _instances(st, "r13", D1, D10).length;
        st.tasks = [];
        var after = _instances(st, "r13", D1, D10).length;
        t2("R13: removing parent removes virtuals", before === 10 && after === 0, { before: before, after: after });
      })();

      // R14: change recurrence pattern affects future dates
      (function () {
        var st = _mkState([_mkTask("r14", D1, "daily")]);
        var daily = _instances(st, "r14", D1, D30).length;
        st.tasks[0].recurrence = "weekly";
        var weekly = _instances(st, "r14", D1, D30).length;
        t2("R14: changing recurrence changes projection", daily === 30 && weekly === 5, { daily: daily, weekly: weekly });
      })();

      // R15: non-recurring siblings unaffected
      (function () {
        var st = _mkState([_mkTask("r15a", D1, "daily"), _mkTask("r15b", D2, "none"), _mkTask("r15c", D3, "none")]);
        var a = _instances(st, "r15a", D1, D10).length;
        var b = _instances(st, "r15b", D1, D10).length;
        var c = _instances(st, "r15c", D1, D10).length;
        t2("R15: non-recurring siblings unaffected", a === 10 && b === 1 && c === 1, { a: a, b: b, c: c });
      })();
    })();

    /* [PATCH:f4a-tests] F4-A projection cancellation tests */
    (function () {
      function _mk(tasks) { return { tasks: tasks || [], shifts: [], rotations: [], residency: { activities: [] }, cases: [] }; }
      function _tk(id, date, opts) {
        opts = opts || {};
        var x = { id: id, title: opts.title || id, areaId: "study", date: date, time: opts.time || "08:00", durationMinutes: opts.dur || 60, completed: false };
        if (opts.cancelled) x.cancelled = true;
        if (opts.recurrence) x.recurrence = opts.recurrence;
        return x;
      }
      var D = "1405/8/20";
      var D2 = "1405/8/21";

      (function () {
        var st = _mk([_tk("c1", D, { cancelled: true })]);
        var all = SP.projectAll(st);
        var found = all.items.filter(function(x){ return x.sourceId === "c1"; });
        t("F4A-1: cancelled task excluded from projection", found.length === 0);
      })();

      (function () {
        var st = _mk([_tk("a1", D, {})]);
        var all = SP.projectAll(st);
        var found = all.items.filter(function(x){ return x.sourceId === "a1"; });
        t("F4A-2: active task still projected", found.length === 1);
      })();

      (function () {
        var st = _mk([_tk("c3", D, { cancelled: true })]);
        var before = st.tasks.length;
        SP.projectAll(st);
        t("F4A-3: state preserved after projection", st.tasks.length === before && st.tasks[0].cancelled === true);
      })();

      (function () {
        var st = _mk([
          _tk("old", D, { cancelled: true, title: "old" }),
          _tk("new", D, { title: "new" })
        ]);
        var all = SP.projectAll(st);
        var onDate = all.items.filter(function(x){ return x.date === D; });
        t("F4A-4: cancelled+replacement -> only 1 visible", onDate.length === 1 && onDate[0].sourceId === "new");
      })();

      (function () {
        var st = _mk([_tk("rec-c", D, { cancelled: true, recurrence: "daily" })]);
        var all = SP.projectAll(st, { rangeStart: D, rangeEnd: D2 });
        var found = all.items.filter(function(x){ return x.sourceId === "rec-c"; });
        t("F4A-5: cancelled recurring parent -> 0 instances", found.length === 0);
      })();
    })();
    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[scheduling.projection.v20] loaded v" + SP.VERSION);
})();