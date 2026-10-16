(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.workspace.v13] R missing"); return; }
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
  var _filters = { dateFrom: null, dateTo: null, type: "all", status: "all", search: "" };
  var _selectedPlanId = null;

  WS.open = function (tab) {
    var s = _state();
    if (!s || !s.residency) { alert("داده‌ای موجود نیست"); return; }
    _selectedPlanId = (s.residency.meta && s.residency.meta.activePlanId) ||
      (s.residency.plans && s.residency.plans[0] && s.residency.plans[0].id) || null;
    _tab = tab || "activities";
    // [PATCH:v13-filter-reset] reset all filters on open
    _filters = {
      dateFrom: _today(),
      dateTo: _addDays(_today(), 30),
      type: "all",
      status: "all",
      search: ""
    };

    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "pw13-overlay";
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
      var openModal = document.querySelector(".pw13-modal-overlay");
      if (openModal) { openModal.remove(); return; }
      WS.close();
    }
  }

  function _render() {
    if (!_overlay) return;
    _overlay.innerHTML = '<div class="pw13-shell">' +
      _renderHeader() +
      _renderKpis() +
      _renderTabs() +
      '<div class="pw13-tab-content" id="pw13-tab-content">' + _renderTabContent() + '</div>' +
      '</div>';
    _wire();
  }

  // ─── Header ───
  function _renderHeader() {
    var s = _state();
    var plans = (s.residency.plans || []);
    var rounds = _selectedPlanId ? R.store.getRoundsForPlan(_selectedPlanId) : [];
    var plan = plans.find(function (p) { return p.id === _selectedPlanId; });
    var planOpts = plans.map(function (p) {
      return '<option value="' + _esc(p.id) + '"' + (p.id === _selectedPlanId ? " selected" : "") + '>' + _esc(p.title) + '</option>';
    }).join("");
    var roundOpts = '<option value="">همه Roundها</option>' + rounds.map(function (r) {
      return '<option value="' + _esc(r.id) + '">' + _esc(r.title) + '</option>';
    }).join("");

    return '<header class="pw13-header">' +
      '<div class="pw13-header-left">' +
        '<span class="pw13-logo">🎯</span>' +
        '<div class="pw13-header-title">Planner Workspace</div>' +
      '</div>' +
      '<div class="pw13-header-center">' +
        '<label class="pw13-selector"><span>Plan:</span><select data-pw13-plan>' + planOpts + '</select></label>' +
        '<label class="pw13-selector"><span>Round:</span><select data-pw13-round>' + roundOpts + '</select></label>' +
        '<label class="pw13-selector"><span>از:</span><input type="text" data-pw13-from value="' + _esc(_filters.dateFrom || "") + '" placeholder="YYYY/M/D"></label>' +
        '<label class="pw13-selector"><span>تا:</span><input type="text" data-pw13-to value="' + _esc(_filters.dateTo || "") + '" placeholder="YYYY/M/D"></label>' +
      '</div>' +
      '<div class="pw13-header-right">' +
        '<button class="pw13-hbtn is-primary" data-pw13-generate>🚀 Generate</button>' +
        '<button class="pw13-hbtn" data-pw13-replan>♻️ Replan</button>' +
        '<button class="pw13-hbtn" data-pw13-content>🤖 محتوا</button>' +
        '<button class="pw13-close" data-pw13-close>✕</button>' +
      '</div>' +
    '</header>';
  }

  // ─── KPIs ───
  function _renderKpis() {
    var s = _state();
    var today = _today();
    var activities = _filteredActivities();
    var overview = R.analytics ? R.analytics.getOverview({ range: "last7Days" }) : null;
    var reviewSummary = R.reviewQueue ? R.reviewQueue.getSummary() : null;

    var todayActivities = activities.filter(function (a) { return a.plannedDate === today; });
    var todayMinutes = todayActivities.reduce(function (sum, a) { return sum + (a.plannedDurationMinutes | 0); }, 0);

    var kpis = [
      { icon: "📅", label: "فعالیت امروز", val: _fa(todayActivities.length) },
      { icon: "⏱️", label: "دقیقه امروز", val: _fa(todayMinutes) },
      { icon: "🔁", label: "مرور در موعد", val: _fa(reviewSummary ? reviewSummary.dueToday : 0) },
      { icon: "⚠️", label: "Overdue", val: _fa(reviewSummary ? reviewSummary.overdue : 0) },
      { icon: "✅", label: "نرخ تکمیل", val: _fa(overview && overview.execution ? overview.execution.completionRate : 0) + "%" }
    ];

    return '<div class="pw13-kpis">' + kpis.map(function (k) {
      return '<div class="pw13-kpi"><span class="pw13-kpi-icon">' + k.icon + '</span>' +
        '<div><div class="pw13-kpi-label">' + _esc(k.label) + '</div>' +
        '<div class="pw13-kpi-value">' + _esc(k.val) + '</div></div></div>';
    }).join("") + '</div>';
  }

  // ─── Tabs ───
  var TABS = [
    { id: "activities", label: "📋 فعالیت‌ها" },
    { id: "reviews", label: "🔁 مرورها" },
    { id: "analytics", label: "📊 تحلیل" },
    { id: "ai", label: "🤖 AI" }
  ];

  function _renderTabs() {
    return '<nav class="pw13-tabs">' + TABS.map(function (t) {
      return '<button class="pw13-tab' + (t.id === _tab ? " is-active" : "") + '" data-pw13-tab="' + t.id + '">' + _esc(t.label) + '</button>';
    }).join("") + '</nav>';
  }

  function _renderTabContent() {
    if (_tab === "activities") return _renderActivitiesTab();
    if (_tab === "reviews") return _renderReviewsTab();
    if (_tab === "analytics") return _renderAnalyticsTab();
    if (_tab === "ai") return _renderAITab();
    return '';
  }

  // ─── Activities Tab ───
  function _filteredActivities() {
    var s = _state();
    if (!s || !s.residency) return [];
    var acts = s.residency.activities || [];
    return acts.filter(function (a) {
      if (!a) return false;
      if (a.status === "cancelled") return false;
      if (_filters.dateFrom && a.plannedDate && _cmp(a.plannedDate, _filters.dateFrom) < 0) return false;
      if (_filters.dateTo && a.plannedDate && _cmp(_filters.dateTo, a.plannedDate) < 0) return false;
      if (_filters.type !== "all" && a.kind !== _filters.type) return false;
      if (_filters.status !== "all" && a.status !== _filters.status) return false;
      if (_filters.search) {
        var hay = ((a.title || "") + " " + (a.notes || "")).toLowerCase();
        if (hay.indexOf(_filters.search.toLowerCase()) === -1) return false;
      }
      return true;
    }).sort(function (a, b) {
      return _cmp(a.plannedDate || "", b.plannedDate || "");
    });
  }

  function _renderActivitiesTab() {
    var acts = _filteredActivities();
    var types = [
      { id: "all", label: "همه" },
      { id: "study", label: "📖 مطالعه" },
      { id: "review", label: "🔁 مرور" },
      { id: "assessment", label: "📝 آزمون" }
    ];
    var statuses = [
      { id: "all", label: "همه" },
      { id: "planned", label: "برنامه‌ریزی‌شده" },
      { id: "completed", label: "انجام‌شده" },
      { id: "partial", label: "نیمه‌کاره" },
      { id: "missed", label: "جامانده" }
    ];

    var filterBar = '<div class="pw13-filterbar">' +
      '<input type="search" class="pw13-search" data-pw13-search placeholder="جستجو..." value="' + _esc(_filters.search) + '">' +
      '<div class="pw13-chips">' + types.map(function (t) {
        return '<button class="pw13-chip' + (_filters.type === t.id ? " is-active" : "") + '" data-pw13-type="' + t.id + '">' + _esc(t.label) + '</button>';
      }).join("") + '</div>' +
      '<div class="pw13-chips">' + statuses.map(function (st) {
        return '<button class="pw13-chip' + (_filters.status === st.id ? " is-active" : "") + '" data-pw13-status="' + st.id + '">' + _esc(st.label) + '</button>';
      }).join("") + '</div>' +
      '</div>';

    if (acts.length === 0) {
      return filterBar + '<div class="pw13-empty">هیچ فعالیتی در این بازه وجود ندارد.</div>';
    }

    // Group by date
    var byDate = {};
    acts.forEach(function (a) {
      var d = a.plannedDate || "بدون تاریخ";
      if (!byDate[d]) byDate[d] = [];
      byDate[d].push(a);
    });

    var groups = Object.keys(byDate).map(function (d) {
      var items = byDate[d];
      var totalMin = items.reduce(function (sum, a) { return sum + (a.plannedDurationMinutes | 0); }, 0);
      return '<div class="pw13-day-group">' +
        '<div class="pw13-day-head"><span class="pw13-day-date">' + _fa(d) + '</span>' +
        '<span class="pw13-day-meta">' + _fa(items.length) + ' فعالیت · ' + _fa(totalMin) + ' د</span></div>' +
        '<div class="pw13-day-items">' + items.map(_renderActivityCard).join("") + '</div>' +
        '</div>';
    }).join("");

    return filterBar + groups;
  }

  function _renderActivityCard(a) {
    var kindIcon = { study: "📖", review: "🔁", assessment: "📝" }[a.kind] || "📌";
    // [PATCH:v13-status-priority] status overrides temporal state for terminal states
    var exec;
    if (a.status === "completed")      exec = { state: "completed" };
    else if (a.status === "partial")   exec = { state: "partial" };
    else if (a.status === "cancelled") exec = { state: "cancelled" };
    else if (a.status === "skipped")   exec = { state: "skipped" };
    else exec = R.plannerExecution ? R.plannerExecution.classifyActivity(a) : { state: a.status || "planned" };
    var stateClass = "pw13-state-" + exec.state;
    var isProtected = a.locked || a.status === "completed" || a.status === "cancelled" ||
      (a.plannedDate && _cmp(a.plannedDate, _today()) < 0);

    var lockedBadge = a.locked ? '<span class="pw13-badge is-locked">🔒</span>' : "";
    var sourceBadge = a.sourceType ? '<span class="pw13-badge is-source">' + _esc(a.sourceType) + '</span>' : "";
    var timeStr = a.plannedStartTime ? _fa(a.plannedStartTime) + " · " : "";
    var durationStr = a.plannedDurationMinutes ? _fa(a.plannedDurationMinutes) + " دقیقه" : "";
    var pagesStr = a.plannedPages ? " · " + _fa(a.plannedPages) + " صفحه" : "";

    return '<div class="pw13-card ' + stateClass + '" data-pw13-act="' + _esc(a.id) + '">' +
      '<div class="pw13-card-head">' +
        '<span class="pw13-card-icon">' + kindIcon + '</span>' +
        '<div class="pw13-card-title">' + _esc(a.title || "بدون عنوان") + '</div>' +
        lockedBadge + sourceBadge +
        '<span class="pw13-card-state">' + _esc(exec.state) + '</span>' +
      '</div>' +
      '<div class="pw13-card-meta">' + _fa(a.plannedDate || "—") + ' · ' + timeStr + durationStr + pagesStr + '</div>' +
      (isProtected ? '' : '<div class="pw13-card-actions">' +
        '<button class="pw13-mini" data-pw13-act-complete="' + _esc(a.id) + '">✅ کامل</button>' +
        '<button class="pw13-mini" data-pw13-act-partial="' + _esc(a.id) + '">◐ نیمه</button>' +
        '<button class="pw13-mini" data-pw13-act-lock="' + _esc(a.id) + '">🔒 قفل</button>' +
        '<button class="pw13-mini is-warn" data-pw13-act-cancel="' + _esc(a.id) + '">✕ لغو</button>' +
      '</div>') +
    '</div>';
  }

  // ─── Reviews Tab ───
  function _renderReviewsTab() {
    if (!R.reviewQueue) return '<div class="pw13-empty">Review Scheduler در دسترس نیست.</div>';
    var summary = R.reviewQueue.getSummary();
    var queue = summary.due || [];

    var html = '<div class="pw13-review-summary">' +
      _reviewStat("📅", "امروز", summary.dueToday) +
      _reviewStat("⏰", "Overdue", summary.overdue) +
      _reviewStat("📆", "۷ روز", summary.upcoming7) +
      _reviewStat("🗓️", "۳۰ روز", summary.upcoming30) +
    '</div>';

    html += '<div class="pw13-review-actions">' +
      '<button class="pw13-hbtn is-primary" data-pw13-schedule-reviews>📋 برنامه‌ریزی مرورها</button>' +
      '<button class="pw13-hbtn" data-pw13-review-settings>⚙️ تنظیمات</button>' +
      '<button class="pw13-hbtn" data-pw13-review-session' + (queue.length === 0 ? " disabled" : "") + '>▶️ شروع جلسه</button>' +
      '<button class="pw13-hbtn" data-pw13-review-ai>🤖 تحلیل AI</button>' +
    '</div>';

    if (queue.length === 0) {
      html += '<div class="pw13-empty">امروز چیزی برای مرور نیست.</div>';
    } else {
      html += '<div class="pw13-review-list">' + queue.slice(0, 50).map(function (item) {
        var overdueCls = item.overdueDays > 0 ? " is-overdue" : "";
        return '<div class="pw13-review-item' + overdueCls + '">' +
          '<div class="pw13-review-title">' + _esc(_reviewTitle(item)) + '</div>' +
          '<div class="pw13-review-meta">' + _esc(item.priorityReason || "") + ' · ' + _fa(item.estimatedMinutes) + ' د</div>' +
          '<div class="pw13-review-due">' + _fa(item.dueDate) + '</div>' +
        '</div>';
      }).join("") + '</div>';
    }
    return html;
  }

  function _reviewStat(icon, label, val) {
    return '<div class="pw13-rstat"><span>' + icon + '</span>' +
      '<div><div class="pw13-rstat-label">' + _esc(label) + '</div>' +
      '<div class="pw13-rstat-value">' + _fa(val) + '</div></div></div>';
  }

  function _reviewTitle(item) {
    var s = _state();
    if (!s) return item.targetId;
    if (item.targetType === "book" && item.bookId) {
      var b = (s.residency.books || []).find(function (x) { return x.id === item.bookId; });
      if (b) return b.title;
    }
    if (item.targetType === "page_range") return "صفحات " + (item.pageStart || 0) + "-" + (item.pageEnd || 0);
    return item.targetId;
  }

  // ─── Analytics Tab ───
  function _renderAnalyticsTab() {
    if (!R.analyticsUI) return '<div class="pw13-empty">Analytics در دسترس نیست.</div>';
    return '<div id="pw13-analytics-root" class="pw13-analytics"></div>';
  }

  // ─── AI Tab ───
  function _renderAITab() {
    return '<div class="pw13-ai-panel">' +
      '<div class="pw13-ai-title">🤖 AI Advisor</div>' +
      '<div class="pw13-ai-hint">داده‌های ارسالی context-aware و redacted هستند. AI هیچ‌گاه state را تغییر نمی‌دهد.</div>' +
      '<div class="pw13-ai-actions">' +
        '<button class="pw13-hbtn is-primary" data-pw13-ai-plan>🔍 تحلیل برنامه</button>' +
        '<button class="pw13-hbtn" data-pw13-ai-recovery>♻️ تحلیل Recovery</button>' +
        '<button class="pw13-hbtn" data-pw13-ai-review>🔁 تحلیل مرورها</button>' +
        '<button class="pw13-hbtn" data-pw13-ai-context>👁️ مشاهده Context</button>' +
      '</div>' +
      '<div id="pw13-ai-result" class="pw13-ai-result"></div>' +
    '</div>';
  }

  // ─── Wiring ───
  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-pw13-close]").forEach(function (b) {
      b.addEventListener("click", WS.close);
    });
    _overlay.querySelector("[data-pw13-plan]") && _overlay.querySelector("[data-pw13-plan]").addEventListener("change", function (e) {
      _selectedPlanId = e.target.value;
      _render();
    });
    _overlay.querySelectorAll("[data-pw13-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        _tab = b.getAttribute("data-pw13-tab");
        _render();
      });
    });
    var fromInp = _overlay.querySelector("[data-pw13-from]");
    if (fromInp) fromInp.addEventListener("change", function () { _filters.dateFrom = fromInp.value; _render(); });
    var toInp = _overlay.querySelector("[data-pw13-to]");
    if (toInp) toInp.addEventListener("change", function () { _filters.dateTo = toInp.value; _render(); });

    var searchInp = _overlay.querySelector("[data-pw13-search]");
    if (searchInp) searchInp.addEventListener("input", function () { _filters.search = searchInp.value; _render(); });
    _overlay.querySelectorAll("[data-pw13-type]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.type = b.getAttribute("data-pw13-type"); _render(); });
    });
    _overlay.querySelectorAll("[data-pw13-status]").forEach(function (b) {
      b.addEventListener("click", function () { _filters.status = b.getAttribute("data-pw13-status"); _render(); });
    });

    // Header buttons
    _overlay.querySelectorAll("[data-pw13-generate]").forEach(function (b) {
      b.addEventListener("click", function () { _openPlannerUI(); });
    });
    _overlay.querySelectorAll("[data-pw13-replan]").forEach(function (b) {
      b.addEventListener("click", function () { _openReplanUI(); });
    });
    _overlay.querySelectorAll("[data-pw13-content]").forEach(function (b) {
      b.addEventListener("click", function () { R.contentUI && R.contentUI.open(); });
    });

    // Activity actions
    _overlay.querySelectorAll("[data-pw13-act-complete]").forEach(function (b) {
      b.addEventListener("click", function () { _quickComplete(b.getAttribute("data-pw13-act-complete")); });
    });
    _overlay.querySelectorAll("[data-pw13-act-partial]").forEach(function (b) {
      b.addEventListener("click", function () { _quickPartial(b.getAttribute("data-pw13-act-partial")); });
    });
    _overlay.querySelectorAll("[data-pw13-act-lock]").forEach(function (b) {
      b.addEventListener("click", function () { _quickLock(b.getAttribute("data-pw13-act-lock")); });
    });
    _overlay.querySelectorAll("[data-pw13-act-cancel]").forEach(function (b) {
      b.addEventListener("click", function () { _quickCancel(b.getAttribute("data-pw13-act-cancel")); });
    });

    // Reviews
    _overlay.querySelectorAll("[data-pw13-schedule-reviews]").forEach(function (b) {
      b.addEventListener("click", _scheduleReviews);
    });
    _overlay.querySelectorAll("[data-pw13-review-settings]").forEach(function (b) {
      b.addEventListener("click", function () { R.reviewSettingsUI && R.reviewSettingsUI.open(); });
    });
    _overlay.querySelectorAll("[data-pw13-review-session]").forEach(function (b) {
      b.addEventListener("click", function () { R.reviewUI && R.reviewUI.open(); });
    });
    _overlay.querySelectorAll("[data-pw13-review-ai]").forEach(function (b) {
      b.addEventListener("click", _aiReviewAnalysis);
    });

    // AI actions
    _overlay.querySelectorAll("[data-pw13-ai-plan]").forEach(function (b) {
      b.addEventListener("click", _aiPlanAnalysis);
    });
    _overlay.querySelectorAll("[data-pw13-ai-recovery]").forEach(function (b) {
      b.addEventListener("click", _aiRecoveryAnalysis);
    });
    _overlay.querySelectorAll("[data-pw13-ai-review]").forEach(function (b) {
      b.addEventListener("click", _aiReviewAnalysis);
    });
    _overlay.querySelectorAll("[data-pw13-ai-context]").forEach(function (b) {
      b.addEventListener("click", _showContext);
    });

    // Analytics deferred render
    if (_tab === "analytics") {
      setTimeout(function () {
        var el = document.getElementById("pw13-analytics-root");
        if (el && R.analyticsUI && R.analyticsUI.render) {
          try { R.analyticsUI.render(el); } catch (e) { console.warn("[ws13] analytics render failed:", e); }
        }
      }, 10);
    }
  }

  // ─── Actions ───
  function _quickComplete(id) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    if (a.kind === "review" && R.spacedRepetition) {
      var res = R.spacedRepetition.completeReview(id, "good");
      if (res && res.ok) { _toast("مرور تکمیل شد"); _render(); }
      else { _toast("خطا: " + (res && res.error || "نامشخص")); }
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

  function _openPlannerUI() {
    if (!R.plannerUI) { _toast("Planner UI در دسترس نیست"); return; }
    R.plannerUI.open(_selectedPlanId);
  }

  function _openReplanUI() {
    if (!R.plannerReplanUI) { _toast("Replan UI در دسترس نیست"); return; }
    R.plannerReplanUI.open(_selectedPlanId);
  }

  function _scheduleReviews() {
    if (!R.reviewProposal || !R.reviewApply) return;
    var res = R.reviewProposal.generate({ horizonDays: 7 });
    if (!res.ok) { _toast("خطا: " + res.error); return; }
    if (res.proposal.proposedActivities.length === 0) { _toast("چیزی برای مرور نیست"); return; }
    if (!confirm(res.proposal.proposedActivities.length + " مرور اضافه شود؟")) return;
    var apply = R.reviewApply.apply(res.proposal);
    if (apply.success) { _toast(apply.statistics.activitiesCreated + " مرور اضافه شد"); _render(); }
    else { _toast("خطا: " + apply.reason); }
  }

  // ─── AI actions ───
  function _aiPlanAnalysis() {
    if (!R.plannerSnapshot || !R.aiAdvisors) { _toast("AI آماده نیست"); return; }
    var snap = R.plannerSnapshot.build(_selectedPlanId, "plan");
    if (!snap) { _toast("Plan خالی"); return; }
    var alloc = R.plannerResolution ? R.plannerResolution.runConstrainedAllocation(snap, {}) : null;
    _aiRun("تحلیل برنامه", function () { return R.aiAdvisors.reviewPlanner(snap, alloc); });
  }

  function _aiRecoveryAnalysis() {
    if (!R.plannerExecution || !R.aiAdvisors) return;
    var snap = R.plannerSnapshot.build(_selectedPlanId, "plan");
    if (!snap) return;
    var exec = R.plannerExecution.analyzeExecution(snap);
    var impact = R.plannerImpact ? R.plannerImpact.analyzeImpact(exec, snap, "plan") : null;
    var comps = R.plannerReplan ? R.plannerReplan.simulateStrategies(_selectedPlanId, ["next_day","end_of_week","end_of_round"], {}) : [];
    _aiRun("تحلیل Recovery", function () { return R.aiAdvisors.reviewRecovery(exec, impact, comps); });
  }

  function _aiReviewAnalysis() {
    if (!R.aiAdvisors || !R.reviewAIContext) return;
    var ctx = R.reviewAIContext.build();
    _aiRun("تحلیل مرورها", function () { return R.aiAdvisors.analyzeReviewContext(ctx); });
  }

  function _showContext() {
    var el = _overlay.querySelector("#pw13-ai-result");
    if (!el) return;
    var ctx = { planId: _selectedPlanId, filters: _filters, tab: _tab };
    el.innerHTML = '<div class="pw13-ctx"><div class="pw13-ctx-title">Context فعلی</div><pre class="pw13-ctx-pre">' + _esc(JSON.stringify(ctx, null, 2)) + '</pre></div>';
  }

  function _aiRun(title, fn) {
    var el = _overlay.querySelector("#pw13-ai-result");
    if (!el) return;
    el.innerHTML = '<div class="pw13-ai-loading"><div class="pw13-spinner"></div><div>' + _esc(title) + ' در حال پردازش...</div></div>';
    Promise.resolve().then(fn).then(function (out) {
      el.innerHTML = _renderAIResult(out);
    }).catch(function (err) {
      el.innerHTML = '<div class="pw13-ai-error">❌ ' + _esc((err && (err.hint || err.message)) || String(err)) + '</div>';
    });
  }

  function _renderAIResult(out) {
    if (!out) return '<div class="pw13-empty">پاسخ خالی</div>';
    var html = '';
    if (out.summary) html += '<div class="pw13-ai-summary">' + _esc(out.summary) + '</div>';
    if (out.findings && out.findings.length > 0) {
      html += '<div class="pw13-ai-group"><strong>یافته‌ها</strong><ul>' +
        out.findings.slice(0, 15).map(function (f) { return '<li>' + _esc(f) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.risks && out.risks.length > 0) {
      html += '<div class="pw13-ai-group is-risk"><strong>ریسک‌ها</strong><ul>' +
        out.risks.slice(0, 10).map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.recommendations && out.recommendations.length > 0) {
      html += '<div class="pw13-ai-group"><strong>پیشنهادها</strong>' +
        out.recommendations.slice(0, 8).map(function (r) {
          return '<div class="pw13-ai-rec is-' + _esc(r.type) + '">' +
            '<div class="pw13-ai-rec-title">' + _esc(r.title) +
              (r.confidence ? ' <span class="pw13-ai-conf">' + Math.round(r.confidence * 100) + '%</span>' : '') +
            '</div>' +
            '<div class="pw13-ai-rec-desc">' + _esc(r.explanation) + '</div>' +
            (r.evidence && r.evidence.length > 0 ? '<div class="pw13-ai-rec-ev">' + r.evidence.map(_esc).join(" · ") + '</div>' : '') +
          '</div>';
        }).join("") + '</div>';
    }
    return html || '<div class="pw13-empty">پاسخی نبود</div>';
  }

  console.log("[planner.workspace.v13] loaded");
})();