(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
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

  // ─── Week View ───
  WS._viewRenderers.week = function () {
    var f = WS.getFilters();
    var start = f.dateFrom || _today();
    var days = [];
    for (var i = 0; i < 7; i++) days.push(_addDays(start, i));
    var all = WS.filteredActivities();

    var cols = days.map(function (d) {
      var vm = R.calendarView.buildDayVM(d, all, WS.getSelectedPlanId());
      return '<div class="pw14-week-col">' +
        '<div class="pw14-week-head">' +
          '<div class="pw14-week-date">' + _fa(d) + '</div>' +
          '<div class="pw14-week-cap">' +
            _fa(Math.round(vm.committedMinutes / 60)) + 'h / ' + _fa(Math.round(vm.capacityMinutes / 60)) + 'h' +
          '</div>' +
          '<div class="pw14-cap-bar pw14-cap-bar-sm"><div class="pw14-cap-fill is-' + _esc(vm.status) + '" style="width:' + Math.min(100, vm.utilizationPercent) + '%"></div></div>' +
        '</div>' +
        '<div class="pw14-week-body" data-pw14-dropzone="' + _esc(d) + '">' +
          (vm.activities.length === 0
            ? '<div class="pw14-week-empty">—</div>'
            : vm.activities.map(WS._renderActivityCard).join("")) +
        '</div>' +
      '</div>';
    }).join("");

    return '<div class="pw14-week-grid">' + cols + '</div>';
  };

  // ─── Month View ───
  WS._viewRenderers.month = function () {
    var f = WS.getFilters();
    var start = f.dateFrom || _today();
    var p = DATE.parseJalali(start);
    if (!p) return '<div class="pw14-empty">تاریخ نامعتبر</div>';
    var monthLen = DATE.jalaliMonthLength(p.jy, p.jm);
    var monthStart = DATE.dateKey(p.jy, p.jm, 1);
    var all = WS.filteredActivities();

    var cells = [];
    for (var i = 1; i <= monthLen; i++) {
      var d = DATE.dateKey(p.jy, p.jm, i);
      var vm = R.calendarView.buildDayVM(d, all, WS.getSelectedPlanId());
      var cls = "pw14-month-cell is-" + vm.status;
      var isToday = d === _today();
      if (isToday) cls += " is-today";
      cells.push('<div class="' + cls + '" data-pw14-dropzone="' + _esc(d) + '">' +
        '<div class="pw14-month-num">' + _fa(i) + '</div>' +
        '<div class="pw14-month-meta">' + _fa(vm.activityCount) + '</div>' +
        '<div class="pw14-cap-bar pw14-cap-bar-xs"><div class="pw14-cap-fill is-' + _esc(vm.status) + '" style="width:' + Math.min(100, vm.utilizationPercent) + '%"></div></div>' +
      '</div>');
    }

    return '<div class="pw14-month-grid">' + cells.join("") + '</div>';
  };

  // ─── Round View ───
  WS._viewRenderers.round = function () {
    var planId = WS.getSelectedPlanId();
    if (!planId) return '<div class="pw14-empty">Plan انتخاب نشده</div>';
    var rounds = R.store.getRoundsForPlan(planId);
    if (rounds.length === 0) return '<div class="pw14-empty">هیچ Roundی ثبت نشده</div>';
    var all = WS.filteredActivities();

    return rounds.map(function (r) {
      var vms = R.calendarView.buildRangeVM(r.startDate, r.endDate, all, planId);
      var totalCap = vms.reduce(function (s, v) { return s + v.capacityMinutes; }, 0);
      var totalCommitted = vms.reduce(function (s, v) { return s + v.committedMinutes; }, 0);
      var overloadedDays = vms.filter(function (v) { return v.overloaded; }).length;
      var utilization = totalCap > 0 ? Math.round(totalCommitted / totalCap * 100) : 0;
      return '<div class="pw14-round-card">' +
        '<div class="pw14-round-head">' +
          '<div class="pw14-round-title">' + _esc(r.title) + '</div>' +
          '<div class="pw14-round-range">' + _fa(r.startDate) + ' → ' + _fa(r.endDate) + '</div>' +
        '</div>' +
        '<div class="pw14-round-stats">' +
          '<span>روز: ' + _fa(vms.length) + '</span>' +
          '<span>ظرفیت: ' + _fa(Math.round(totalCap / 60)) + 'h</span>' +
          '<span>برنامه: ' + _fa(Math.round(totalCommitted / 60)) + 'h</span>' +
          '<span>Util: ' + _fa(utilization) + '%</span>' +
          (overloadedDays > 0 ? '<span class="is-warn">⚠️ ' + _fa(overloadedDays) + ' روز overload</span>' : '') +
        '</div>' +
      '</div>';
    }).join("");
  };

  // ─── Filter Presets ───
  WS._filterPresets = [
    { label: "امروز", apply: function () { WS.setFilters({ dateFrom: _today(), dateTo: _today(), type: "all", status: "all", lockedOnly: false, overdueOnly: false, search: "" }); } },
    { label: "این هفته", apply: function () { WS.setFilters({ dateFrom: _today(), dateTo: _addDays(_today(), 6), type: "all", status: "all" }); } },
    { label: "Overdue", apply: function () { WS.setFilters({ dateFrom: _addDays(_today(), -90), dateTo: _today(), overdueOnly: true, status: "all" }); } },
    { label: "مطالعه", apply: function () { WS.setFilters({ type: "study", status: "all" }); } },
    { label: "مرورها", apply: function () { WS.setFilters({ type: "review", status: "all" }); } },
    { label: "آزمون", apply: function () { WS.setFilters({ type: "assessment", status: "all" }); } },
    { label: "قفل‌شده", apply: function () { WS.setFilters({ lockedOnly: true }); } },
    { label: "نیاز به اقدام", apply: function () {
      WS.setFilters({ dateFrom: _addDays(_today(), -30), dateTo: _addDays(_today(), 30), status: "planned" });
    } }
  ];

  // ─── Inline Edit Modal ───
  WS._openEditModal = function (id) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    if (a.locked) { WS._toast("🔒 این فعالیت قفل است"); return; }
    if (a.status === "completed" || a.status === "cancelled") { WS._toast("این فعالیت قابل ویرایش نیست"); return; }

    var html = '<div class="pw14-modal-overlay" data-pw14-modal>' +
      '<div class="pw14-modal">' +
        '<header class="pw14-modal-head"><span>✏️ ویرایش فعالیت</span><button class="pw14-close" data-pw14-modal-close>✕</button></header>' +
        '<div class="pw14-modal-body">' +
          '<div class="pw14-row"><label>عنوان</label><input type="text" data-pw14-ed-title value="' + _esc(a.title || "") + '"></div>' +
          '<div class="pw14-row"><label>تاریخ</label><input type="text" data-pw14-ed-date value="' + _esc(a.plannedDate || "") + '"></div>' +
          '<div class="pw14-row"><label>ساعت شروع</label><input type="text" data-pw14-ed-time value="' + _esc(a.plannedStartTime || "") + '" placeholder="HH:MM"></div>' +
          '<div class="pw14-row"><label>مدت (دقیقه)</label><input type="number" data-pw14-ed-duration value="' + _esc(a.plannedDurationMinutes || "") + '"></div>' +
          '<div class="pw14-row"><label>صفحات</label><input type="number" data-pw14-ed-pages value="' + _esc(a.plannedPages || "") + '"></div>' +
          '<div class="pw14-row"><label>یادداشت</label><textarea rows="2" data-pw14-ed-notes>' + _esc(a.notes || "") + '</textarea></div>' +
          '<div id="pw14-ed-error" class="pw14-error" style="display:none"></div>' +
        '</div>' +
        '<footer class="pw14-modal-foot">' +
          '<button class="pw14-hbtn is-primary" data-pw14-ed-save>💾 ذخیره</button>' +
          '<button class="pw14-hbtn" data-pw14-modal-close>انصراف</button>' +
        '</footer>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML("beforeend", html);
    var modal = document.querySelector(".pw14-modal-overlay");
    function _close() { if (modal && modal.parentNode) modal.parentNode.removeChild(modal); }
    modal.querySelectorAll("[data-pw14-modal-close]").forEach(function (b) { b.addEventListener("click", _close); });
    modal.querySelector("[data-pw14-ed-save]").addEventListener("click", function () {
      var patch = {
        title: modal.querySelector("[data-pw14-ed-title]").value,
        plannedDate: modal.querySelector("[data-pw14-ed-date]").value,
        plannedStartTime: modal.querySelector("[data-pw14-ed-time]").value || null,
        plannedDurationMinutes: parseInt(modal.querySelector("[data-pw14-ed-duration]").value, 10) || null,
        plannedPages: parseInt(modal.querySelector("[data-pw14-ed-pages]").value, 10) || null,
        notes: modal.querySelector("[data-pw14-ed-notes]").value
      };
      if (!patch.plannedDate || !patch.title) {
        var err = modal.querySelector("#pw14-ed-error");
        err.style.display = "block"; err.textContent = "عنوان و تاریخ الزامی است"; return;
      }
      var res = R.store.updateActivity(id, patch);
      if (res) { WS._toast("ذخیره شد"); _close(); WS.rerender(); }
      else {
        var err2 = modal.querySelector("#pw14-ed-error");
        err2.style.display = "block"; err2.textContent = "خطا در ذخیره‌سازی";
      }
    });
  };

  // ─── Details Drawer ───
  WS._openDetailsDrawer = function (id) {
    var s = _state();
    var a = (s.residency.activities || []).find(function (x) { return x.id === id; });
    if (!a) return;
    var isProtected = a.locked || a.status === "completed" || a.status === "cancelled" ||
      (a.plannedDate && _cmp(a.plannedDate, _today()) < 0);

    var exec;
    if (a.status === "completed") exec = { state: "completed" };
    else if (a.status === "partial") exec = { state: "partial" };
    else exec = R.plannerExecution ? R.plannerExecution.classifyActivity(a) : { state: a.status || "planned" };

    function _kv(k, v) {
      return '<div class="pw14-kv"><span class="pw14-kv-k">' + _esc(k) + '</span><span class="pw14-kv-v">' + _esc(v == null ? "—" : String(v)) + '</span></div>';
    }

    var html = '<div class="pw14-drawer is-open">' +
      '<div class="pw14-drawer-head">' +
        '<span class="pw14-drawer-title">' + _esc(a.title || "بدون عنوان") + '</span>' +
        '<button class="pw14-close" data-pw14-drawer-close>✕</button>' +
      '</div>' +
      '<div class="pw14-drawer-body">' +
        _kv("نوع", a.kind || "—") +
        _kv("منبع", a.sourceType || "manual") +
        _kv("وضعیت", exec.state) +
        _kv("تاریخ", a.plannedDate) +
        _kv("ساعت", a.plannedStartTime) +
        _kv("مدت (دقیقه)", a.plannedDurationMinutes) +
        _kv("صفحه", a.plannedPages) +
        _kv("بازه", (a.plannedPageStart != null && a.plannedPageEnd != null) ? (a.plannedPageStart + "–" + a.plannedPageEnd) : null) +
        _kv("واقعی صفحات", a.actualPages) +
        _kv("واقعی دقیقه", a.actualDurationMinutes) +
        _kv("قفل", a.locked ? "بله" : "خیر") +
        (a.reviewTarget ? _kv("Review", a.reviewTarget.type) : "") +
        (a.notes ? '<div class="pw14-drawer-notes">' + _esc(a.notes) + '</div>' : "") +
      '</div>' +
      '<div class="pw14-drawer-actions">' +
        (isProtected ? '' : '<button class="pw14-hbtn is-primary" data-pw14-dr-edit>✏️ ویرایش</button>') +
        '<button class="pw14-hbtn" data-pw14-drawer-close>بستن</button>' +
      '</div>' +
    '</div>';

    document.body.insertAdjacentHTML("beforeend", html);
    var drawer = document.querySelectorAll(".pw14-drawer");
    var d = drawer[drawer.length - 1];
    function _closeDrawer() {
      d.classList.remove("is-open");
      setTimeout(function () { if (d.parentNode) d.parentNode.removeChild(d); }, 220);
    }
    d.querySelectorAll("[data-pw14-drawer-close]").forEach(function (b) { b.addEventListener("click", _closeDrawer); });
    var edBtn = d.querySelector("[data-pw14-dr-edit]");
    if (edBtn) edBtn.addEventListener("click", function () { _closeDrawer(); WS._openEditModal(id); });
  };

  console.log("[workspace.v14.ext] loaded");
})();