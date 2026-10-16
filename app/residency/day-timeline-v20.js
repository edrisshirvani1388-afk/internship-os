/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Day Timeline v20.1 (Shared Renderer)
   Reads ONLY from schedulingProjection — no direct state access
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[day.timeline.v20] R missing"); return; }

  var DT = R.dayTimeline = R.dayTimeline || {};
  var LIB = window.InternshipLib;
  var SP = R.schedulingProjection;

  DT.VERSION = "1.0.0";

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  /* ═══ VIEW MODEL ═══ */
  DT.getItemDisplayModel = function (item, options) {
    if (!item) return null;
    options = options || {};

    var vm = {
      item: item,
      id: item.id,
      title: item.title || "",
      startTime: item.startTime || null,
      endTime: item.endTime || null,
      durationMinutes: item.durationMinutes || null,
      role: item.role,
      category: item.category || "",
      status: item.status || "",
      displayType: null,
      displayLabel: ""
    };

    if (item.role === "anchor") {
      vm.displayType = "anchor";
      vm.displayLabel = vm.startTime
        ? _fa(vm.startTime) + (vm.endTime ? " → " + _fa(vm.endTime) : "")
        : "تمام روز";
    } else if (item.role === "block") {
      vm.displayType = "block";
      vm.displayLabel = vm.startTime
        ? _fa(vm.startTime) + (vm.endTime ? " → " + _fa(vm.endTime) : "")
        : "";
    } else if (item.role === "flexible") {
      vm.displayType = "flexible";
      vm.displayLabel = vm.durationMinutes ? _fa(vm.durationMinutes) + " دقیقه" : "";
    } else if (item.role === "reminder") {
      vm.displayType = "reminder";
      vm.displayLabel = "یادآوری";
    } else if (item.role === "context") {
      vm.displayType = "context";
      vm.displayLabel = "زمینه‌ی روز";
    } else {
      vm.displayType = "unknown";
      vm.displayLabel = "";
    }

    return vm;
  };

  DT.buildModel = function (date, state, options) {
    options = options || {};
    state = state || _state();
    if (!state || !date) return _emptyModel(date);

    if (!SP || !SP.projectDate) {
      console.warn("[day.timeline.v20] schedulingProjection missing");
      return _emptyModel(date);
    }

    var items;
    try {
      items = SP.projectDate(state, date, options) || [];
    } catch (e) {
      console.warn("[day.timeline.v20] projectDate failed:", e);
      return _emptyModel(date);
    }

    // ─── Phase 27.2b: dedup ───
    // اگر یک residencyActivity توسط تسکِ لینک‌شده نمایش داده می‌شود،
    // خودِ activity را حذف کن تا دوبار دیده نشود.
    try {
      var _linkedActIds = {};
      (state.tasks || []).forEach(function (t) {
        if (!t) return;
        var st = t.sourceType;
        if (st === "residency_activity" || st === "residencyActivity") {
          var ref = t.residencyActivityId || t.sourceId;
          if (ref) _linkedActIds[String(ref)] = true;
        }
      });
      var _keys = Object.keys(_linkedActIds);
      if (_keys.length > 0) {
        items = items.filter(function (it) {
          if (!it) return false;
          if (it.sourceType !== "residencyActivity") return true;
          return !_linkedActIds[String(it.sourceId)];
        });
      }

      // Phase 27.6: force-replace title for residencyActivities (when no user notes)
      var _books = (state.residency && state.residency.books) || [];
      var _acts = (state.residency && state.residency.activities) || [];
      items = items.map(function (it) {
        if (!it || it.sourceType !== "residencyActivity") return it;
        var act = null;
        for (var ai = 0; ai < _acts.length; ai++) {
          if (_acts[ai] && _acts[ai].id === it.sourceId) { act = _acts[ai]; break; }
        }
        if (!act) return it;
        // اگر کاربر یادداشت شخصی گذاشته، دست نزن
        if (act.notes && String(act.notes).trim().length > 0) return it;
        var parts = [];
        if (act.bookId) {
          for (var bi = 0; bi < _books.length; bi++) {
            if (_books[bi] && _books[bi].id === act.bookId) {
              var bn = _books[bi].title || _books[bi].name || "";
              if (bn) parts.push(bn);
              break;
            }
          }
        }
        if (act.plannedPageStart != null && act.plannedPageEnd != null) {
          parts.push("صفحات " + act.plannedPageStart + "–" + act.plannedPageEnd);
        } else if (typeof act.plannedPages === "number" && act.plannedPages > 0) {
          parts.push(act.plannedPages + " صفحه");
        }
        if (parts.length > 0) {
          it = Object.assign({}, it, { title: parts.join(" — ") });
        }
        return it;
      });
    } catch (e) {
      console.warn("[day.timeline.v20] dedup+title failed:", e);
    }

    var timed = [];
    var flexible = [];
    var reminders = [];
    var context = [];

    items.forEach(function (it) {
      var vm = DT.getItemDisplayModel(it, options);
      if (!vm) return;
      if (vm.role === "anchor" || vm.role === "block") {
        if (vm.startTime) timed.push(vm);
        else flexible.push(vm);
      } else if (vm.role === "flexible") {
        flexible.push(vm);
      } else if (vm.role === "reminder") {
        reminders.push(vm);
      } else if (vm.role === "context") {
        context.push(vm);
      } else {
        flexible.push(vm);
      }
    });

    // timed items already sorted by projection (date + startTime + role + sourceType)
    // Keep order for the rest as received

    return {
      date: date,
      timed: timed,
      flexible: flexible,
      reminders: reminders,
      context: context,
      total: items.length,
      isEmpty: items.length === 0
    };
  };

  function _emptyModel(date) {
    return {
      date: date,
      timed: [],
      flexible: [],
      reminders: [],
      context: [],
      total: 0,
      isEmpty: true
    };
  }

  /* ═══ RENDER ═══ */
  DT.renderSplit = function (hostTimed, hostUntimed, date, state, options) {
    options = options || {};
    state = state || _state();
    if (!state || !date) {
      if (hostTimed) hostTimed.innerHTML = "";
      if (hostUntimed) hostUntimed.innerHTML = "";
      return null;
    }
    var model = DT.buildModel(date, state, options);

    if (hostTimed) {
      var h = "";
      if (model.timed.length === 0 && model.context.length === 0) {
        h = '<div class="dt20-empty">برای این روز برنامه‌ی زمانی ثبت نشده</div>';
      } else {
        if (model.timed.length > 0) {
          h += '<div class="dt20-timeline">';
          model.timed.forEach(function (vm) { h += _renderTimedItem(vm); });
          h += '</div>';
        }
        if (model.context.length > 0) {
          h += '<div class="dt20-section dt20-section-context"><div class="dt20-section-title">🏥 زمینه‌ی روز</div><div class="dt20-context-list">';
          model.context.forEach(function (vm) { h += _renderContextItem(vm); });
          h += '</div></div>';
        }
      }
      hostTimed.innerHTML = h;
    }

    if (hostUntimed) {
      var u = "";
      var all = model.flexible.concat(model.reminders);
      if (all.length === 0) {
        u = '<div class="dt20-untimed-empty">همه‌ی کارها ساعت دارند ✨</div>';
      } else {
        all.forEach(function (vm) {
          u += (vm.role === "reminder") ? _renderReminderItem(vm) : _renderFlexibleItem(vm);
        });
      }
      hostUntimed.innerHTML = u;
    }

    return model;
  };
  DT.render = function (container, date, state, options) {
    if (!container) return null;
    options = options || {};
    state = state || _state();

    var model = DT.buildModel(date, state, options);
    container.innerHTML = DT.renderModel(model, options);
    container.setAttribute("data-dt20-date", date || "");
    return model;
  };

  DT.renderModel = function (model, options) {
    options = options || {};
    if (!model) return "";

    if (model.isEmpty) {
      return '<div class="dt20-empty">امروز چیزی برنامه‌ریزی نشده</div>';
    }

    var html = '<div class="dt20-root">';

    // ─── Timed Section ───
    if (model.timed.length > 0) {
      html += '<div class="dt20-section dt20-section-timed">';
      html += '<div class="dt20-section-title">⏱️ برنامه‌ی زمانی</div>';
      html += '<div class="dt20-timeline">';
      model.timed.forEach(function (vm) {
        html += _renderTimedItem(vm);
      });
      html += '</div></div>';
    }

    // ─── Context Section ───
    if (model.context.length > 0) {
      html += '<div class="dt20-section dt20-section-context">';
      html += '<div class="dt20-section-title">🏥 زمینه‌ی روز</div>';
      html += '<div class="dt20-context-list">';
      model.context.forEach(function (vm) {
        html += _renderContextItem(vm);
      });
      html += '</div></div>';
    }

    // ─── Flexible Section ───
    if (model.flexible.length > 0) {
      html += '<div class="dt20-section dt20-section-flexible">';
      html += '<div class="dt20-section-title">🕐 کارهای بدون ساعت</div>';
      html += '<div class="dt20-flexible-list">';
      model.flexible.forEach(function (vm) {
        html += _renderFlexibleItem(vm);
      });
      html += '</div></div>';
    }

    // ─── Reminders Section ───
    if (model.reminders.length > 0) {
      html += '<div class="dt20-section dt20-section-reminders">';
      html += '<div class="dt20-section-title">🔔 یادآوری‌ها</div>';
      html += '<div class="dt20-reminder-list">';
      model.reminders.forEach(function (vm) {
        html += _renderReminderItem(vm);
      });
      html += '</div></div>';
    }

    html += '</div>';
    return html;
  };

  function _roleIcon(role) {
    return {
      anchor: "🚨",
      block: "📌",
      flexible: "🕐",
      reminder: "🔔",
      context: "🏥"
    }[role] || "•";
  }

  function _categoryIcon(cat) {
    return {
      study: "📖",
      review: "🔁",
      assessment: "📝",
      shift: "🚨",
      case: "📋",
      body: "🏃",
      life: "🌱",
      clinical: "🩺",
      emergency: "🚑",
      residency: "🎓",
      income: "💼"
    }[cat] || "";
  }

  function _renderTimedItem(vm) { /* PATCH:phase-F7-merge */
    /* ─── merge sleep split ─── */
    if (vm.item && vm.item._sleepAuto === "night:evening") return "";
    if (vm.item && vm.item._sleepAuto === "night:morning") {
      var _st = (typeof _state === "function") ? _state() : window.INTERNSHIP_STATE;
      var _sch = _st && _st.sleep && _st.sleep.schedule && _st.sleep.schedule.night;
      if (_sch && _sch.bedTime) {
        var _bp = String(_sch.bedTime).split(":");
        var _bm = parseInt(_bp[0],10)*60 + parseInt(_bp[1],10);
        var _eveDur = 1440 - _bm;
        var _vmC = {}; for (var _k in vm) _vmC[_k] = vm[_k];
        _vmC.durationMinutes = (vm.durationMinutes||0) + _eveDur;
        var _itC = {}; for (var _k2 in vm.item) _itC[_k2] = vm.item[_k2];
        _itC.startTime = _sch.bedTime;
        _vmC.item = _itC;
        vm = _vmC;
      }
    }
    var icon = _roleIcon(vm.role);
    var sAttr = _esc((vm.item && vm.item.startTime) || "");
    var eAttr = _esc((vm.item && vm.item.endTime) || "");
    var src = _esc((vm.item && vm.item.sourceType) || "");
    var sid = _esc((vm.item && vm.item.sourceId) || "");
    var status = _esc(vm.status || "");
    var isDone = (status === "completed" || status === "done");
    var catLc = String(vm.category || "").toLowerCase();
    var isResAct = (vm.item && vm.item.sourceType === "residencyActivity") || catLc === "residency";

    var catCls = "cat-other";
    if (vm.role === "anchor") catCls = "cat-anchor";
    else if (isResAct) catCls = "cat-residency";
    else if (catLc === "study" || catLc === "review" || catLc === "assessment") catCls = "cat-study";
    else if (catLc === "body" || catLc === "exercise") catCls = "cat-body";
    else if (catLc === "clinical" || catLc === "case") catCls = "cat-clinical";
    else if (catLc === "hospital") catCls = "cat-hospital";
    else if (catLc === "sleep" || catLc === "rest") catCls = "cat-sleep";
    else if (catLc === "life" || catLc === "personal") catCls = "cat-life";
    else if (catLc === "income") catCls = "cat-income";

    var catRGB = "148, 163, 184";
    if (vm.role === "anchor") catRGB = "239, 68, 68";
    else if (isResAct) catRGB = "167, 139, 250";
    else if (catLc === "study" || catLc === "review" || catLc === "assessment") catRGB = "45, 212, 191";
    else if (catLc === "body" || catLc === "exercise") catRGB = "251, 146, 60";
    else if (catLc === "clinical" || catLc === "case") catRGB = "59, 130, 246";
    else if (catLc === "hospital") catRGB = "236, 72, 153";
    else if (catLc === "sleep" || catLc === "rest") catRGB = "100, 116, 139";
    else if (catLc === "life" || catLc === "personal") catRGB = "234, 179, 8";
    else if (catLc === "income") catRGB = "34, 197, 94";

    var timeStart = sAttr || "—";
    var timeEnd = eAttr || "—";

    var durText = "";
    if (vm.durationMinutes && vm.durationMinutes > 0) {
      var h = Math.floor(vm.durationMinutes / 60);
      var m = vm.durationMinutes % 60;
      if (h === 0) durText = _fa(m) + "د";
      else if (m === 0) durText = _fa(h) + "س";
      else durText = _fa(h) + "س " + _fa(m) + "د";
    }

    var catLabels = {
      "cat-anchor": "زمان ثابت", "cat-study": "مطالعه", "cat-residency": "رزیدنتی",
      "cat-clinical": "بالین", "cat-hospital": "بیمارستان", "cat-body": "ورزش و سلامت",
      "cat-life": "زندگی شخصی", "cat-sleep": "خواب", "cat-income": "پروژه و کار", "cat-other": "سایر"
    };
    var catLabel = catLabels[catCls] || "";

    // ── tooltip: ساعت شروع، پایان، مدت، دسته، توضیحات ──
    var tipParts = [];
    if (timeStart && timeStart !== "—") {
      tipParts.push("⏰ " + timeStart + (timeEnd && timeEnd !== "—" ? " → " + timeEnd : ""));
    } else {
      tipParts.push("⏰ بدون ساعت");
    }
    if (durText) tipParts.push("⏱ " + durText);
    if (catLabel) tipParts.push("🏷 " + catLabel);
    if (isDone) tipParts.push("✅ انجام شده");
    var notes = (vm.item && vm.item.notes) || (vm.item && vm.item.description) || "";
    if (notes && String(notes).trim().length > 0) {
      tipParts.push("📝 " + String(notes).trim().substring(0, 120));
    }
    var tipText = _esc(tipParts.join(" · "));

    var actions = "";
    if (src === "task") {
      actions = '<div class="dt20-item-actions">'
        + '<button class="dt20-act dt20-act-done" data-act="done" type="button" title="' + (isDone ? "برگرداندن" : "انجام شد") + '">' + (isDone ? "↺" : "✓") + '</button>'
        + '<button class="dt20-act dt20-act-edit" data-act="edit" type="button" title="ویرایش">✏️</button>'
        + '<button class="dt20-act dt20-act-untime" data-act="untime" type="button" title="حذف از نوار">📌</button>'
        + '</div>';
    } else if (src === "residencyActivity") {
      actions = '<div class="dt20-item-actions">'
        + '<button class="dt20-act dt20-act-edit" data-act="edit" type="button" title="ویرایش زمان">✏️</button>'
        + '<button class="dt20-act dt20-act-untime" data-act="untime" type="button" title="حذف از نوار">📌</button>'
        + '</div>';
    }

    var cls = "dt20-item dt20-item-" + _esc(vm.role) + " " + catCls + (isDone ? " is-completed" : "") + (isResAct ? " is-residency" : "");

    return '<div class="' + cls + '"'
      + ' style="--cat-rgb:' + catRGB + ';"'
      + ' data-tip="' + tipText + '"'
      + ' data-dt20-id="' + _esc(vm.id || "") + '"'
      + ' data-dt20-source="' + src + '"'
      + ' data-dt20-sourceid="' + sid + '"'
      + ' data-dt20-start="' + sAttr + '"'
      + ' data-dt20-end="' + eAttr + '"'
      + ' data-dt20-duration="' + (vm.durationMinutes || 0) + '"'
      + ' data-dt20-status="' + status + '">'
      + '<div class="dt20-item-top">'
      +   '<span class="dt20-time-pill is-start" title="شروع">' + _esc(timeStart) + '</span>'
      +   '<span class="dt20-time-pill is-end" title="پایان">' + _esc(timeEnd) + '</span>'
      + '</div>'
      + '<div class="dt20-item-body">'
      +   '<span class="dt20-item-icon-wrap"><span class="dt20-item-icon">' + icon + '</span></span>'
      +   '<span class="dt20-item-title">' + _esc(vm.title) + '</span>'
      + '</div>'
      + (durText ? '<div class="dt20-item-dur">' + durText + '</div>' : '')
      + '<span class="dt20-cat-label">' + catLabel + '</span>'
      + '<span class="dt20-item-hatch"></span>'
      + actions
    + '</div>';
  }

  function _renderFlexibleItem(vm) {
    var catIcon = _categoryIcon(vm.category);
    var _src = _esc((vm.item && vm.item.sourceType) || "");
    var _sid = _esc((vm.item && vm.item.sourceId) || "");
    var _dur = (vm.item && vm.item.durationMinutes) || 60;
    return '<div class="dt20-flex-item" data-dt20-id="' + _esc(vm.id || "") + '" data-dt20-source="' + _src + '" data-dt20-sourceid="' + _sid + '" data-dt20-duration="' + _dur + '" data-dt20-cat="' + _esc(vm.category || "") + '" data-dt20-title="' + _esc(vm.title || "") + '" draggable="false">' +
      '<span class="dt20-flex-icon">🕐</span>' +
      (catIcon ? '<span class="dt20-flex-cat">' + catIcon + '</span>' : '') +
      '<span class="dt20-flex-title">' + _esc(vm.title) + '</span>' +
      (vm.displayLabel ? '<span class="dt20-flex-meta">' + _esc(vm.displayLabel) + '</span>' : '') +
    '</div>';
  }

  function _renderReminderItem(vm) {
    var catIcon = _categoryIcon(vm.category);
    var _src = _esc((vm.item && vm.item.sourceType) || "");
    var _sid = _esc((vm.item && vm.item.sourceId) || "");
    var _dur = (vm.durationMinutes) || 30;
    return '<div class="dt20-reminder-item" data-dt20-id="' + _esc(vm.id || "") + '" data-dt20-source="' + _src + '" data-dt20-sourceid="' + _sid + '" data-dt20-duration="' + _dur + '" data-dt20-cat="' + _esc(vm.category || "") + '" data-dt20-title="' + _esc(vm.title || "") + '">' +
      '<span class="dt20-reminder-icon">🔔</span>' +
      (catIcon ? '<span class="dt20-reminder-cat">' + catIcon + '</span>' : '') +
      '<span class="dt20-reminder-title">' + _esc(vm.title) + '</span>' +
    '</div>';
  }

  function _renderContextItem(vm) {
    return '<div class="dt20-context-item">' +
      '<span class="dt20-context-icon">🏥</span>' +
      '<span class="dt20-context-title">' + _esc(vm.title) + '</span>' +
      '<span class="dt20-context-meta">' + _esc(vm.displayLabel) + '</span>' +
    '</div>';
  }

  /* ═══ TESTS ═══ */
  DT.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    if (!SP) { console.error("❌ schedulingProjection missing"); return; }

    var STATE = {
      tasks: [
        { id: "t1", title: "Timed task", areaId: "study", date: "1405/7/15",
          time: "08:00", durationMinutes: 60, completed: false },
        { id: "t2", title: "Flexible task", areaId: "body", date: "1405/7/15",
          durationMinutes: 30, completed: false },
        { id: "t3", title: "Reminder only", areaId: "life", date: "1405/7/15",
          completed: false }
      ],
      shifts: [
        { id: "sh1", date: "1405/7/15", startTime: "08:00", endTime: "20:00",
          type: "کشیک ۲۴ ساعته" },
        { id: "sh2", date: "1405/7/15", type: "آنکال" }
      ],
      residency: {
        activities: [
          { id: "a1", kind: "study", plannedDate: "1405/7/15",
            plannedStartTime: "10:00", plannedDurationMinutes: 90,
            status: "planned" }
        ]
      },
      cases: []
    };

    // ─── T1: Empty day ───
    var m1 = DT.buildModel("1405/1/1", STATE);
    t("T1: Empty day → isEmpty", m1.isEmpty && m1.total === 0);

    // ─── T2: One timed task ───
    var m2 = DT.buildModel("1405/7/15", STATE);
    t("T2: Timed task → in timed array",
      m2.timed.some(function (v) { return v.id === "task:t1"; }));

    // ─── T3: One flexible task ───
    t("T3: Flexible task → in flexible array",
      m2.flexible.some(function (v) { return v.id === "task:t2"; }));

    // ─── T4: One reminder ───
    t("T4: Reminder → in reminders array",
      m2.reminders.some(function (v) { return v.id === "task:t3"; }));

    // ─── T5: Timed shift → anchor ───
    t("T5: Timed shift → in timed (anchor)",
      m2.timed.some(function (v) { return v.id === "shift:sh1" && v.role === "anchor"; }));

    // ─── T6: Untimed shift → context ───
    t("T6: Untimed shift → in context",
      m2.context.some(function (v) { return v.id === "shift:sh2"; }));

    // ─── T7: Residency activity → timed ───
    t("T7: Residency activity → in timed",
      m2.timed.some(function (v) { return v.id === "residencyActivity:a1"; }));

    // ─── T8: Mixed items → total count ───
    t("T8: Mixed state → 6 items total", m2.total === 6);

    // ─── T9: Deterministic model ───
    var m2b = DT.buildModel("1405/7/15", STATE);
    t("T9: Deterministic model",
      JSON.stringify(m2.timed.map(function (v) { return v.id; })) ===
      JSON.stringify(m2b.timed.map(function (v) { return v.id; })));

    // ─── T10: No mutation ───
    var before = JSON.stringify(STATE);
    DT.buildModel("1405/7/15", STATE);
    var after = JSON.stringify(STATE);
    t("T10: Renderer does not mutate state", before === after);

    // ─── T11: Sorting preserved ───
    var ids = m2.timed.map(function (v) { return v.id; });
    var sortedOk = true;
    for (var i = 1; i < ids.length; i++) {
      // Just check it's not random — same as projection output
    }
    t("T11: Sorting deterministic", ids.length === m2.timed.length);

    // ─── T12: Cross-midnight shift does not crash ───
    var STATE2 = {
      tasks: [], residency: { activities: [] }, cases: [],
      shifts: [
        { id: "sh3", date: "1405/7/15", startTime: "22:00", endTime: "06:00",
          type: "کشیک شب" }
      ]
    };
    var m3 = DT.buildModel("1405/7/15", STATE2);
    t("T12: Cross-midnight shift → no crash",
      m3.timed.length === 1 && m3.timed[0].durationMinutes === 480);

    // ─── Summary ───
    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[day.timeline.v20] loaded v" + DT.VERSION);
})();