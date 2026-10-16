(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.workspace.v14] R missing"); return; }
  var WS = R.plannerWorkspace = R.plannerWorkspace || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _addDays(d, n) {
    if (!DATE || !d) return d;
    var p = DATE.parseJalali(d);
    if (!p) return d;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  var _overlay = null;
  var _tab = "activities";
  var _view = "day";
  var _filters = null;
  var _selectedPlanId = null;
  var _currentProposal = null;

  // ─── Extension hooks ───
  WS._tabRenderers = WS._tabRenderers || {};
  WS._viewRenderers = WS._viewRenderers || {};
  WS._filterPresets = WS._filterPresets || [];

  function _resetFilters() {
    _filters = {
      dateFrom: _today(),
      dateTo: _addDays(_today(), 30),
      type: "all",
      status: "all",
      roundId: "",
      bookId: "",
      subjectId: "",
      priority: "all",
      source: "all",
      lockedOnly: false,
      overdueOnly: false,
      search: ""
    };
  }
  _resetFilters();

  WS.getFilters = function () { return JSON.parse(JSON.stringify(_filters)); };
  WS.setFilters = function (patch) { Object.assign(_filters, patch || {}); WS.rerender(); };
  WS.resetFilters = function () { _resetFilters(); WS.rerender(); };
  WS.getSelectedPlanId = function () { return _selectedPlanId; };
  WS.getView = function () { return _view; };
  WS.setView = function (v) { _view = v; WS.rerender(); };
  WS.rerender = function () { _render(); };

  WS.open = function (tab) {
    var s = _state();
    if (!s || !s.residency) { alert("داده‌ای موجود نیست"); return; }
    _selectedPlanId = (s.residency.meta && s.residency.meta.activePlanId) ||
      (s.residency.plans && s.residency.plans[0] && s.residency.plans[0].id) || null;
    _tab = tab || "activities";
    _view = "day";
    _resetFilters();

    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "pw14-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    _render();
    document.addEventListener("keydown", _escHandler);
  };

  WS.close = function () {
    if (!_overlay) return;
    document.removeEventListener("keydown", _escHandler);
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (_overlay) { _overlay.remove(); _overlay = null; } }, 220);
  };

  function _escHandler(e) {
    if (e.key === "Escape") {
      var modal = document.querySelector(".pw14-modal-overlay");
      if (modal) { modal.remove(); return; }
      var drawer = document.querySelector(".pw14-drawer.is-open");
      if (drawer) { drawer.classList.remove("is-open"); setTimeout(function () { if (drawer.parentNode) drawer.parentNode.removeChild(drawer); }, 220); return; }
      WS.close();
    }
  }

  function _render() {
    if (!_overlay) return;
    _overlay.innerHTML = '<div class="pw14-shell">' +
      _renderHeader() +
      _renderKpis() +
      _renderTabs() +
      '<div class="pw14-tab-content" id="pw14-tab-content">' + _renderTabContent() + '</div>' +
      '</div>';
    _wire();
    _postRender();
  }

  function _postRender() {
    if (_tab === "analytics") {
      setTimeout(function () {
        var el = document.getElementById("pw14-analytics-root");
        if (el && R.analyticsUI && R.analyticsUI.render) {
          try { R.analyticsUI.render(el); } catch (e) { console.warn("[ws14] analytics:", e); }
        }
      }, 10);
    }
  }

  // ─── Header ───
  function _renderHeader() {
    var s = _state();
    var plans = (s.residency.plans || []);
    var rounds = _selectedPlanId ? R.store.getRoundsForPlan(_selectedPlanId) : [];
    var planOpts = plans.map(function (p) {
      return '<option value="' + _esc(p.id) + '"' + (p.id === _selectedPlanId ? " selected" : "") + '>' + _esc(p.title) + '</option>';
    }).join("");
    var roundOpts = '<option value="">همه Roundها</option>' + rounds.map(function (r) {
      return '<option value="' + _esc(r.id) + '"' + (r.id === _filters.roundId ? " selected" : "") + '>' + _esc(r.title) + '</option>';
    }).join("");

    return '<header class="pw14-header">' +
      '<div class="pw14-header-left"><span class="pw14-logo">🎯</span><div class="pw14-header-title">Planning Workspace</div></div>' +
      '<div class="pw14-header-center">' +
        '<label class="pw14-sel"><span>Plan:</span><select data-pw14-plan>' + planOpts + '</select></label>' +
        '<label class="pw14-sel"><span>Round:</span><select data-pw14-round>' + roundOpts + '</select></label>' +
        '<label class="pw14-sel"><span>از:</span><input type="text" data-pw14-from value="' + _esc(_filters.dateFrom || "") + '"></label>' +
        '<label class="pw14-sel"><span>تا:</span><input type="text" data-pw14-to value="' + _esc(_filters.dateTo || "") + '"></label>' +
      '</div>' +
      '<div class="pw14-header-right">' +
        '<button class="pw14-hbtn is-primary" data-pw14-generate>🚀 Generate</button>' +
        '<button class="pw14-hbtn" data-pw14-replan>♻️ Replan</button>' +
        '<button class="pw14-hbtn" data-pw14-content>🤖 محتوا</button>' +
        '<button class="pw14-close" data-pw14-close>✕</button>' +
      '</div>' +
    '</header>';
  }

  // ─── KPIs ───
  function _renderKpis() {
    var acts = _allActivities();
    var today = _today();
    var todayActs = acts.filter(function (a) { return a.plannedDate === today; });
    var todayMin = todayActs.reduce(function (s, a) { return s + (a.plannedDurationMinutes | 0); }, 0);
    var overdue = 0, due = 0;
    if (R.reviewQueue) {
      var sum = R.reviewQueue.getSummary();
      overdue = sum.overdue; due = sum.dueToday;
    }
    var overview = R.analytics ? R.analytics.getOverview({ range: "last7Days" }) : null;
    var rate = (overview && overview.execution) ? overview.execution.completionRate : 0;

    var kpis = [
      { icon: "📅", label: "فعالیت امروز", val: _fa(todayActs.length) },
      { icon: "⏱️", label: "دقیقه امروز", val: _fa(todayMin) },
      { icon: "🔁", label: "مرور در موعد", val: _fa(due) },
      { icon: "⚠️", label: "Overdue", val: _fa(overdue) },
      { icon: "✅", label: "نرخ تکمیل", val: _fa(rate) + "%" }
    ];

    return '<div class="pw14-kpis">' + kpis.map(function (k) {
      return '<div class="pw14-kpi"><span class="pw14-kpi-icon">' + k.icon + '</span>' +
        '<div><div class="pw14-kpi-label">' + _esc(k.label) + '</div>' +
        '<div class="pw14-kpi-value">' + _esc(k.val) + '</div></div></div>';
    }).join("") + '</div>';
  }

  // ─── Tabs ───
  var TABS = [
    { id: "activities", label: "📋 فعالیت‌ها" },
    { id: "proposal", label: "📊 پیشنهاد" },
    { id: "reviews", label: "🔁 مرورها" },
    { id: "analytics", label: "📈 تحلیل" },
    { id: "ai", label: "🤖 AI" }
  ];

  function _renderTabs() {
    return '<nav class="pw14-tabs">' + TABS.map(function (t) {
      return '<button class="pw14-tab' + (t.id === _tab ? " is-active" : "") + '" data-pw14-tab="' + t.id + '">' + _esc(t.label) + '</button>';
    }).join("") + '</nav>';
  }

  function _renderTabContent() {
    var fn = WS._tabRenderers[_tab];
    if (typeof fn === "function") {
      try { return fn(); } catch (e) { return '<div class="pw14-empty">خطا: ' + _esc(e.message) + '</div>'; }
    }
    if (_tab === "activities") return _defaultActivitiesTab();
    if (_tab === "proposal") return (WS._renderProposalTab || _defaultProposalTab)();
    if (_tab === "reviews") return (WS._renderReviewsTab || _defaultReviewsTab)();
    if (_tab === "analytics") return '<div id="pw14-analytics-root" class="pw14-analytics"></div>';
    if (_tab === "ai") return (WS._renderAITab || _defaultAITab)();
    return '';
  }

  // ─── Filters (used by views) ───
  function _allActivities() {
    var s = _state();
    if (!s || !s.residency) return [];
    return (s.residency.activities || []).filter(function (a) {
      return a && a.status !== "cancelled";
    });
  }

  WS.filteredActivities = function () {
    var acts = _allActivities();
    return acts.filter(function (a) {
      if (!a) return false;
      if (_filters.dateFrom && a.plannedDate && _cmp(a.plannedDate, _filters.dateFrom) < 0) return false;
      if (_filters.dateTo && a.plannedDate && _cmp(_filters.dateTo, a.plannedDate) < 0) return false;
      if (_filters.type !== "all" && a.kind !== _filters.type) return false;
      if (_filters.status !== "all") {
        if (_filters.status === "missed") {
          var exec = R.plannerExecution ? R.plannerExecution.classifyActivity(a) : { state: a.status };
          if (exec.state !== "missed") return false;
        } else if (a.status !== _filters.status) return false;
      }
      if (_filters.roundId && a.roundId !== _filters.roundId) return false;
      if (_filters.bookId && a.bookId !== _filters.bookId) return false;
      if (_filters.subjectId && a.subjectId !== _filters.subjectId) return false;
      if (_filters.priority !== "all" && a.priority !== _filters.priority) return false;
      if (_filters.source !== "all" && a.sourceType !== _filters.source) return false;
      if (_filters.lockedOnly && !a.locked) return false;
      if (_filters.overdueOnly) {
        var ex = R.plannerExecution ? R.plannerExecution.classifyActivity(a) : { state: a.status };
        if (ex.state !== "missed" && ex.state !== "overdue") return false;
      }
      if (_filters.search) {
        var hay = ((a.title || "") + " " + (a.notes || "") + " " + (a.bookId || "") + " " + (a.subjectId || "")).toLowerCase();
        if (hay.indexOf(_filters.search.toLowerCase()) === -1) return false;
      }
      return true;
    }).sort(function (a, b) { return _cmp(a.plannedDate || "", b.plannedDate || ""); });
  };

  // ─── Default Activities Tab (Day view + view switcher) ───
  function _defaultActivitiesTab() {
    var views = [
      { id: "day", label: "روز" },
      { id: "week", label: "هفته" },
      { id: "month", label: "ماه" },
      { id: "round", label: "Round" }
    ];
    var viewBar = '<div class="pw14-viewbar">' + views.map(function (v) {
      return '<button class="pw14-vbtn' + (_view === v.id ? " is-active" : "") + '" data-pw14-view="' + v.id + '">' + _esc(v.label) + '</button>';
    }).join("") + '</div>';

    var viewContent = '';
    var renderFn = WS._viewRenderers[_view];
    if (typeof renderFn === "function") {
      try { viewContent = renderFn(); }
      catch (e) { viewContent = '<div class="pw14-empty">خطا: ' + _esc(e.message) + '</div>'; }
    } else {
      viewContent = _defaultDayView();
    }

    return viewBar + _renderFilterBar() + '<div class="pw14-view-content">' + viewContent + '</div>';
  }

  function _renderFilterBar() {
    var types = [
      { id: "all", l: "همه" },
      { id: "study", l: "📖" },
      { id: "review", l: "🔁" },
      { id: "assessment", l: "📝" }
    ];
    var statuses = [
      { id: "all", l: "همه" },
      { id: "planned", l: "برنامه" },
      { id: "completed", l: "کامل" },
      { id: "partial", l: "نیمه" },
      { id: "missed", l: "جامانده" }
    ];

    var presetBar = '';
    if (WS._filterPresets.length > 0) {
      presetBar = '<div class="pw14-presets">' + WS._filterPresets.map(function (p, i) {
        return '<button class="pw14-preset" data-pw14-preset="' + i + '">' + _esc(p.label) + '</button>';
      }).join("") + '</div>';
    }

    return '<div class="pw14-filterbar">' +
      '<input type="search" class="pw14-search" data-pw14-search placeholder="جستجو..." value="' + _esc(_filters.search) + '">' +
      '<div class="pw14-chips">' + types.map(function (t) {
        return '<button class="pw14-chip' + (_filters.type === t.id ? " is-active" : "") + '" data-pw14-type="' + t.id + '">' + _esc(t.l) + '</button>';
      }).join("") + '</div>' +
      '<div class="pw14-chips">' + statuses.map(function (st) {
        return '<button class="pw14-chip' + (_filters.status === st.id ? " is-active" : "") + '" data-pw14-status="' + st.id + '">' + _esc(st.l) + '</button>';
      }).join("") + '</div>' +
      '<button class="pw14-chip' + (_filters.lockedOnly ? " is-active" : "") + '" data-pw14-locked>🔒 قفل‌شده</button>' +
      '<button class="pw14-chip' + (_filters.overdueOnly ? " is-active" : "") + '" data-pw14-overdue>⚠️ Overdue</button>' +
      '<button class="pw14-chip" data-pw14-reset>↺ ریست</button>' +
      '</div>' +
      presetBar;
  }

  // ─── Day View (registered in _viewRenderers) ───
  function _defaultDayView() {
    var acts = WS.filteredActivities();
    if (acts.length === 0) return '<div class="pw14-empty">هیچ فعالیتی در این بازه نیست.</div>';

    var byDate = {};
    acts.forEach(function (a) {
      var d = a.plannedDate || "بدون تاریخ";
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(a);
    });

    return Object.keys(byDate).sort().map(function (d) {
      var dayActs = byDate[d];
      var vm = R.calendarView ? R.calendarView.buildDayVM(d, dayActs, _selectedPlanId) : null;
      var head = '';
      if (vm) {
        head = '<div class="pw14-cap-line">' +
          '<span class="pw14-cap-metric">ظرفیت: ' + _fa(Math.round(vm.capacityMinutes / 60)) + 'h</span>' +
          '<span class="pw14-cap-metric">برنامه: ' + _fa(Math.round(vm.committedMinutes / 60)) + 'h</span>' +
          '<span class="pw14-cap-metric is-remain">باقی: ' + _fa(Math.round(vm.remainingCapacity / 60)) + 'h</span>' +
          '<div class="pw14-cap-bar"><div class="pw14-cap-fill is-' + _esc(vm.status) + '" style="width:' + Math.min(100, vm.utilizationPercent) + '%"></div></div>' +
          '<span class="pw14-cap-pct">' + _fa(vm.utilizationPercent) + '%</span>' +
        '</div>';
      }
      return '<div class="pw14-day-group">' +
        '<div class="pw14-day-head">' +
          '<span class="pw14-day-date">' + _fa(d) + '</span>' +
          '<span class="pw14-day-meta">' + _fa(dayActs.length) + ' فعالیت</span>' +
        '</div>' +
        head +
        '<div class="pw14-day-items" data-pw14-dropzone="' + _esc(d) + '">' +
          dayActs.map(_renderActivityCard).join("") +
        '</div>' +
      '</div>';
    }).join("");
  }

  // Register day view in renderer map so ext can inspect/override
  WS._viewRenderers.day = _defaultDayView;

  function _renderActivityCard(a) {
    var kindIcon = { study: "📖", review: "🔁", assessment: "📝" }[a.kind] || "📌";
    var exec;
    if (a.status === "completed") exec = { state: "completed" };
    else if (a.status === "partial") exec = { state: "partial" };
    else if (a.status === "cancelled") exec = { state: "cancelled" };
    else if (a.status === "skipped") exec = { state: "skipped" };
    else exec = R.plannerExecution ? R.plannerExecution.classifyActivity(a) : { state: a.status || "planned" };

    var isProtected = a.locked || a.status === "completed" || a.status === "cancelled" ||
      (a.plannedDate && _cmp(a.plannedDate, _today()) < 0);

    var badges = '';
    if (a.locked) badges += '<span class="pw14-badge is-locked">🔒</span>';
    if (a.sourceType) badges += '<span class="pw14-badge is-source">' + _esc(a.sourceType) + '</span>';
    if (a.reviewTarget && a.reviewTarget.reviewStateId) badges += '<span class="pw14-badge is-sr">SR</span>';

    var timeStr = a.plannedStartTime ? _fa(a.plannedStartTime) + " · " : "";
    var durStr = a.plannedDurationMinutes ? _fa(a.plannedDurationMinutes) + "د" : "";
    var pagesStr = a.plannedPages ? " · " + _fa(a.plannedPages) + " ص" : "";

    return '<div class="pw14-card pw14-state-' + _esc(exec.state) + '"' +
      (a.locked || a.status === "completed" ? '' : ' draggable="true"') +
      ' data-pw14-act="' + _esc(a.id) + '">' +
      '<div class="pw14-card-head">' +
        '<span class="pw14-card-icon">' + kindIcon + '</span>' +
        '<div class="pw14-card-title">' + _esc(a.title || "بدون عنوان") + '</div>' +
        badges +
        '<span class="pw14-card-state">' + _esc(exec.state) + '</span>' +
      '</div>' +
      '<div class="pw14-card-meta">' + timeStr + durStr + pagesStr + '</div>' +
      (isProtected ? '' : '<div class="pw14-card-actions">' +
        '<button class="pw14-mini" data-pw14-act-complete="' + _esc(a.id) + '">✅</button>' +
        '<button class="pw14-mini" data-pw14-act-partial="' + _esc(a.id) + '">◐</button>' +
        '<button class="pw14-mini" data-pw14-act-edit="' + _esc(a.id) + '">✏️</button>' +
        '<button class="pw14-mini" data-pw14-act-lock="' + _esc(a.id) + '">🔒</button>' +
        '<button class="pw14-mini is-warn" data-pw14-act-cancel="' + _esc(a.id) + '">✕</button>' +
      '</div>') +
    '</div>';
  }
  WS._renderActivityCard = _renderActivityCard;

  // ─── Proposal/Reviews/AI default tabs (overridable) ───
  function _defaultProposalTab() {
    return '<div class="pw14-empty">هنوز پیشنهادی تولید نشده. از دکمه 🚀 Generate یا ♻️ Replan استفاده کن.</div>';
  }
  WS._renderProposalTab = WS._renderProposalTab || _defaultProposalTab;

  function _defaultReviewsTab() {
    return '<div class="pw14-empty">Review Scheduler در دسترس نیست.</div>';
  }
  WS._renderReviewsTab = WS._renderReviewsTab || _defaultReviewsTab;

  function _defaultAITab() {
    return '<div class="pw14-empty">AI در دسترس نیست.</div>';
  }
  WS._renderAITab = WS._renderAITab || _defaultAITab;

  // ─── Wiring ───
  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-pw14-close]").forEach(function (b) { b.addEventListener("click", WS.close); });
    var planSel = _overlay.querySelector("[data-pw14-plan]");
    if (planSel) planSel.addEventListener("change", function (e) {
      _selectedPlanId = e.target.value; _render();
    });
    var roundSel = _overlay.querySelector("[data-pw14-round]");
    if (roundSel) roundSel.addEventListener("change", function (e) {
      _filters.roundId = e.target.value; _render();
    });
    var fromInp = _overlay.querySelector("[data-pw14-from]");
    if (fromInp) fromInp.addEventListener("change", function () { _filters.dateFrom = fromInp.value; _render(); });
    var toInp = _overlay.querySelector("[data-pw14-to]");
    if (toInp) toInp.addEventListener("change", function () { _filters.dateTo = toInp.value; _render(); });

    _overlay.querySelectorAll("[data-pw14-tab]").forEach(function (b) {
      b.addEventListener("click", function () { _tab = b.getAttribute("data-pw14-tab"); _render(); });
    });
    _overlay.querySelectorAll("[data-pw14-view]").forEach(function (b) {
      b.addEventListener("click", function () { _view = b.getAttribute("data-pw14-view"); _render(); });
    });

    var searchInp = _overlay.querySelector("[data-pw14-search]");
    if (searchInp) searchInp.addEventListener("input", function () { _filters.search = searchInp.value; _render(); });
    _overlay.querySelectorAll("[data-pw14-type]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.type = b.getAttribute("data-pw14-type"); _render(); });
    });
    _overlay.querySelectorAll("[data-pw14-status]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.status = b.getAttribute("data-pw14-status"); _render(); });
    });
    _overlay.querySelectorAll("[data-pw14-locked]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.lockedOnly = !_filters.lockedOnly; _render(); });
    });
    _overlay.querySelectorAll("[data-pw14-overdue]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.overdueOnly = !_filters.overdueOnly; _render(); });
    });
    _overlay.querySelectorAll("[data-pw14-reset]").forEach(function (b) {
      b.addEventListener("click", function () { WS.resetFilters(); });
    });
    _overlay.querySelectorAll("[data-pw14-preset]").forEach(function (b) {
      b.addEventListener("click", function () {
        var idx = parseInt(b.getAttribute("data-pw14-preset"), 10);
        var p = WS._filterPresets[idx];
        if (p && typeof p.apply === "function") p.apply();
      });
    });

    _overlay.querySelectorAll("[data-pw14-generate]").forEach(function (b) {
      b.addEventListener("click", function () { R.plannerUI && R.plannerUI.open(_selectedPlanId); });
    });
    _overlay.querySelectorAll("[data-pw14-replan]").forEach(function (b) {
      b.addEventListener("click", function () { R.plannerReplanUI && R.plannerReplanUI.open(_selectedPlanId); });
    });
    _overlay.querySelectorAll("[data-pw14-content]").forEach(function (b) {
      b.addEventListener("click", function () { R.contentUI && R.contentUI.open(); });
    });

    _overlay.querySelectorAll("[data-pw14-act-complete]").forEach(function (b) {
      b.addEventListener("click", function () { _quickComplete(b.getAttribute("data-pw14-act-complete")); });
    });
    _overlay.querySelectorAll("[data-pw14-act-partial]").forEach(function (b) {
      b.addEventListener("click", function () { _quickPartial(b.getAttribute("data-pw14-act-partial")); });
    });
    _overlay.querySelectorAll("[data-pw14-act-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (WS._openEditModal) WS._openEditModal(b.getAttribute("data-pw14-act-edit"));
      });
    });
    _overlay.querySelectorAll("[data-pw14-act-lock]").forEach(function (b) {
      b.addEventListener("click", function () { _quickLock(b.getAttribute("data-pw14-act-lock")); });
    });
    _overlay.querySelectorAll("[data-pw14-act-cancel]").forEach(function (b) {
      b.addEventListener("click", function () { _quickCancel(b.getAttribute("data-pw14-act-cancel")); });
    });

    // Card click → details drawer
    _overlay.querySelectorAll(".pw14-card").forEach(function (card) {
      card.addEventListener("click", function (e) {
        if (e.target.closest(".pw14-card-actions")) return;
        var id = card.getAttribute("data-pw14-act");
        if (id && WS._openDetailsDrawer) WS._openDetailsDrawer(id);
      });
    });

    // Drag & drop (basic)
    _overlay.querySelectorAll(".pw14-card[draggable='true']").forEach(function (card) {
      card.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", card.getAttribute("data-pw14-act"));
      });
    });
    _overlay.querySelectorAll("[data-pw14-dropzone]").forEach(function (zone) {
      zone.addEventListener("dragover", function (e) { e.preventDefault(); zone.classList.add("is-drag-over"); });
      zone.addEventListener("dragleave", function () { zone.classList.remove("is-drag-over"); });
      zone.addEventListener("drop", function (e) {
        e.preventDefault();
        zone.classList.remove("is-drag-over");
        var id = e.dataTransfer.getData("text/plain");
        var newDate = zone.getAttribute("data-pw14-dropzone");
        if (id && newDate && WS._tryMoveActivity) WS._tryMoveActivity(id, newDate);
      });
    });

    // Extension point
    if (typeof WS._postWire === "function") {
      try { WS._postWire(); } catch (e) {}
    }
  }

  // ─── Quick actions ───
  function _quickComplete(id) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    if (a.kind === "review" && R.spacedRepetition) {
      var res = R.spacedRepetition.completeReview(id, "good");
      if (res && res.ok) { _toast("مرور تکمیل شد"); _render(); }
      else { _toast("خطا: " + (res && res.error || "?")); }
      return;
    }
    R.store.updateActivity(id, { status: "completed", actualDurationMinutes: a.plannedDurationMinutes || null });
    R.taskProjection && R.taskProjection.syncActivityToTask && R.taskProjection.syncActivityToTask(id);
    _toast("انجام شد");
    _render();
  }

  function _quickPartial(id) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    var pages = a.plannedPages ? Math.floor(a.plannedPages / 2) : 0;
    R.store.updateActivity(id, { status: "partial", actualPages: pages, actualDurationMinutes: Math.floor((a.plannedDurationMinutes || 0) / 2) });
    _toast("نیمه‌کاره ثبت شد");
    _render();
  }

  function _quickLock(id) {
    R.store.updateActivity(id, { locked: true });
    _toast("قفل شد");
    _render();
  }

  function _quickCancel(id) {
    if (!confirm("لغو این فعالیت؟")) return;
    R.store.updateActivity(id, { status: "cancelled" });
    _toast("لغو شد");
    _render();
  }

  function _toast(msg) {
    if (LIB && LIB.toast) LIB.toast(msg);
    else console.log("[toast]", msg);
  }
  WS._toast = _toast;

  // ─── Try Move (drag&drop) ───
  WS._tryMoveActivity = function (id, newDate) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    if (a.locked) { _toast("🔒 این فعالیت قفل است"); return; }
    if (a.status === "completed" || a.status === "cancelled") { _toast("این فعالیت قابل جابه‌جایی نیست"); return; }
    if (a.plannedDate && _cmp(a.plannedDate, _today()) < 0) { _toast("فعالیت گذشته قابل جابه‌جایی نیست"); return; }
    if (a.plannedDate === newDate) return;
    // Delegate to store; store validates
    var res = R.store.updateActivity(id, { plannedDate: newDate });
    if (res) { _toast("منتقل شد به " + newDate); _render(); }
    else { _toast("جابه‌جایی رد شد"); }
  };

  console.log("[planner.workspace.v14] loaded");
})();