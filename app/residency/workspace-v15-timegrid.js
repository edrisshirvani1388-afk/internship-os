(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
  var LIB = window.InternshipLib;
  var NAV = R.calendarNavigation;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }

  var _nav = { weekStart: null, monthStart: null };

  WS._viewRenderers.week = function () {
    var f = WS.getFilters();
    var base = f.dateFrom || _today();
    if (!_nav.weekStart) _nav.weekStart = NAV.startOfWeek(base);
    var days = [];
    for (var i = 0; i < 7; i++) days.push(NAV._addDays ? NAV._addDays(_nav.weekStart, i) : _add(_nav.weekStart, i));
    function _add(d, n) {
      var LIB2 = window.InternshipLib;
      var p = LIB2.date.parseJalali(d);
      var r = LIB2.date.addJalaliDays(p.jy, p.jm, p.jd, n);
      return LIB2.date.dateKey(r.jy, r.jm, r.jd);
    }
    var all = WS.filteredActivities();

    var navBar = '<div class="pw15-nav">' +
      '<button class="pw15-nav-btn" data-pw15-week-prev>‹ هفته قبل</button>' +
      '<span class="pw15-nav-label">' + _esc(NAV.labelWeek(_nav.weekStart)) + '</span>' +
      '<button class="pw15-nav-btn" data-pw15-week-today>امروز</button>' +
      '<button class="pw15-nav-btn" data-pw15-week-next>هفته بعد ›</button>' +
    '</div>';

    var cols = days.map(function (d) {
      var vm = R.calendarView.buildDayVM(d, all, WS.getSelectedPlanId());
      return '<div class="pw15-week-col">' +
        '<div class="pw15-week-head">' +
          '<div class="pw15-week-date">' + _fa(d) + '</div>' +
          '<div class="pw15-week-cap">' + _fa(Math.round(vm.committedMinutes / 60)) + 'h / ' + _fa(Math.round(vm.capacityMinutes / 60)) + 'h</div>' +
          '<div class="pw15-cap-bar"><div class="pw15-cap-fill is-' + _esc(vm.status) + '" style="width:' + Math.min(100, vm.utilizationPercent) + '%"></div></div>' +
        '</div>' +
        '<div class="pw15-week-body" data-pw15-dropzone="' + _esc(d) + '">' +
          (vm.activities.length === 0 ? '<div class="pw15-week-empty">—</div>' : vm.activities.map(WS._renderActivityCard).join("")) +
        '</div>' +
      '</div>';
    }).join("");

    return navBar + '<div class="pw15-week-grid">' + cols + '</div>';
  };

  WS._viewRenderers.month = function () {
    var f = WS.getFilters();
    var base = f.dateFrom || _today();
    if (!_nav.monthStart) _nav.monthStart = NAV.startOfMonth(base);
    var p = LIB.date.parseJalali(_nav.monthStart);
    if (!p) return '<div class="pw15-empty">تاریخ نامعتبر</div>';
    var monthLen = LIB.date.jalaliMonthLength(p.jy, p.jm);
    var all = WS.filteredActivities();

    var navBar = '<div class="pw15-nav">' +
      '<button class="pw15-nav-btn" data-pw15-month-prev>‹ ماه قبل</button>' +
      '<span class="pw15-nav-label">' + _esc(NAV.labelMonth(_nav.monthStart)) + '</span>' +
      '<button class="pw15-nav-btn" data-pw15-month-today>ماه فعلی</button>' +
      '<button class="pw15-nav-btn" data-pw15-month-next>ماه بعد ›</button>' +
    '</div>';

    var cells = [];
    for (var i = 1; i <= monthLen; i++) {
      var d = LIB.date.dateKey(p.jy, p.jm, i);
      var vm = R.calendarView.buildDayVM(d, all, WS.getSelectedPlanId());
      var cls = "pw15-month-cell is-" + vm.status + (d === _today() ? " is-today" : "");
      cells.push('<div class="' + cls + '" data-pw15-dropzone="' + _esc(d) + '">' +
        '<div class="pw15-month-num">' + _fa(i) + '</div>' +
        '<div class="pw15-month-meta">' + _fa(vm.activityCount) + '</div>' +
        '<div class="pw15-cap-bar pw15-cap-xs"><div class="pw15-cap-fill is-' + _esc(vm.status) + '" style="width:' + Math.min(100, vm.utilizationPercent) + '%"></div></div>' +
      '</div>');
    }

    return navBar + '<div class="pw15-month-grid">' + cells.join("") + '</div>';
  };

  // ─── Time Grid View ───
  WS._viewRenderers.timegrid = function () {
    var f = WS.getFilters();
    var date = f.dateFrom || _today();
    var all = WS.filteredActivities();
    var dayActs = all.filter(function (a) { return a.plannedDate === date; });
    var timed = dayActs.filter(function (a) { return a.plannedStartTime; });
    var untimed = dayActs.filter(function (a) { return !a.plannedStartTime; });

    var startHour = 6, endHour = 23;
    var grid = [];
    for (var h = startHour; h <= endHour; h++) {
      for (var m = 0; m < 60; m += NAV.TIME_GRID_MINUTES) {
        var slot = (h < 10 ? "0" : "") + h + ":" + (m < 10 ? "0" : "") + m;
        var slotActs = timed.filter(function (a) {
          var sMin = NAV.timeToMinutes(a.plannedStartTime);
          var slotMin = h * 60 + m;
          return sMin != null && slotMin >= sMin && slotMin < sMin + (a.plannedDurationMinutes | 0);
        });
        var isStart = slotActs.some(function (a) { return a.plannedStartTime === slot; });
        var firstStart = slotActs.find(function (a) { return a.plannedStartTime === slot; });
        grid.push('<div class="pw15-slot" data-pw15-slot="' + slot + '" data-pw15-slot-date="' + _esc(date) + '">' +
          (m === 0 ? '<span class="pw15-slot-label">' + _fa(slot) + '</span>' : '<span class="pw15-slot-label pw15-slot-label-min">:' + (m < 10 ? "0" : "") + m + '</span>') +
          (firstStart ? '<div class="pw15-slot-block" draggable="true" data-pw15-act="' + _esc(firstStart.id) + '" style="height:' + Math.round((firstStart.plannedDurationMinutes | 0) / NAV.TIME_GRID_MINUTES * 100) + '%">' +
            '<span class="pw15-slot-title">' + _esc(firstStart.title || "") + '</span>' +
            '<span class="pw15-slot-meta">' + _fa(firstStart.plannedDurationMinutes | 0) + 'د</span>' +
          '</div>' : '') +
        '</div>');
      }
    }

    var nav = '<div class="pw15-timegrid-nav">' +
      '<button class="pw15-nav-btn" data-pw15-tg-prev>‹ روز قبل</button>' +
      '<span class="pw15-nav-label">' + _fa(date) + '</span>' +
      '<button class="pw15-nav-btn" data-pw15-tg-today>امروز</button>' +
      '<button class="pw15-nav-btn" data-pw15-tg-next>روز بعد ›</button>' +
    '</div>';

    var untimedBar = '';
    if (untimed.length > 0) {
      untimedBar = '<div class="pw15-untimed"><div class="pw15-untimed-title">بدون ساعت (' + _fa(untimed.length) + ')</div>' +
        '<div class="pw15-untimed-list">' + untimed.map(function (a) {
          return '<span class="pw15-untimed-chip">' + _esc(a.title || "—") + '</span>';
        }).join("") + '</div></div>';
    }

    return nav + untimedBar + '<div class="pw15-timegrid">' + grid.join("") + '</div>';
  };

  // Wire nav
  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (!o) return;

    var f = WS.getFilters();

    o.querySelectorAll("[data-pw15-week-prev]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = NAV.previousWeek(_nav.weekStart || f.dateFrom);
        _nav.weekStart = r.start;
        WS.setFilters({ dateFrom: r.start, dateTo: r.end });
      });
    });
    o.querySelectorAll("[data-pw15-week-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = NAV.nextWeek(_nav.weekStart || f.dateFrom);
        _nav.weekStart = r.start;
        WS.setFilters({ dateFrom: r.start, dateTo: r.end });
      });
    });
    o.querySelectorAll("[data-pw15-week-today]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = _today();
        _nav.weekStart = NAV.startOfWeek(t);
        WS.setFilters({ dateFrom: _nav.weekStart, dateTo: NAV.endOfWeek(t) });
      });
    });
    o.querySelectorAll("[data-pw15-month-prev]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = NAV.previousMonth(_nav.monthStart || f.dateFrom);
        _nav.monthStart = r.start;
        WS.setFilters({ dateFrom: r.start, dateTo: r.end });
      });
    });
    o.querySelectorAll("[data-pw15-month-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        var r = NAV.nextMonth(_nav.monthStart || f.dateFrom);
        _nav.monthStart = r.start;
        WS.setFilters({ dateFrom: r.start, dateTo: r.end });
      });
    });
    o.querySelectorAll("[data-pw15-month-today]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = _today();
        _nav.monthStart = NAV.startOfMonth(t);
        WS.setFilters({ dateFrom: _nav.monthStart, dateTo: NAV.endOfMonth(t) });
      });
    });

    function _shiftDay(delta) {
      var cur = WS.getFilters().dateFrom || _today();
      var p = LIB.date.parseJalali(cur);
      if (!p) return;
      var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, delta);
      var dk = LIB.date.dateKey(r.jy, r.jm, r.jd);
      WS.setFilters({ dateFrom: dk, dateTo: dk });
    }
    o.querySelectorAll("[data-pw15-tg-prev]").forEach(function (b) { b.addEventListener("click", function () { _shiftDay(-1); }); });
    o.querySelectorAll("[data-pw15-tg-next]").forEach(function (b) { b.addEventListener("click", function () { _shiftDay(1); }); });
    o.querySelectorAll("[data-pw15-tg-today]").forEach(function (b) {
      b.addEventListener("click", function () { var t = _today(); WS.setFilters({ dateFrom: t, dateTo: t }); });
    });

    // Slot drag&drop for timegrid
    o.querySelectorAll(".pw15-slot-block[draggable='true']").forEach(function (card) {
      card.addEventListener("dragstart", function (e) {
        e.dataTransfer.setData("text/plain", "slot::" + card.getAttribute("data-pw15-act"));
      });
    });
    o.querySelectorAll("[data-pw15-slot]").forEach(function (slot) {
      slot.addEventListener("dragover", function (e) { e.preventDefault(); slot.classList.add("is-hover"); });
      slot.addEventListener("dragleave", function () { slot.classList.remove("is-hover"); });
      slot.addEventListener("drop", function (e) {
        e.preventDefault();
        slot.classList.remove("is-hover");
        var payload = e.dataTransfer.getData("text/plain") || "";
        var parts = payload.split("::");
        if (parts[0] !== "slot") return;
        var actId = parts[1];
        var newTime = slot.getAttribute("data-pw15-slot");
        var newDate = slot.getAttribute("data-pw15-slot-date");
        if (WS._tryMoveActivityTime) WS._tryMoveActivityTime(actId, newDate, newTime);
      });
    });
  };

  // Add timegrid view button in v14 core — inject via filter presets mechanism not ideal.
  // Instead, extend the core's views list (monkey-patch the renderer list).
  // We'll expose a flag WS._hasTimeGridView = true and modify view list rendering via CSS + button injection.
  // Simpler: extend WS by pushing a button into viewbar via post-render injection.
  var _origViewBarPatch = WS._renderViewBarExtend;
  WS._renderViewBarExtend = function () {
    return '<button class="pw14-vbtn" data-pw14-view="timegrid">شبکه زمانی</button>';
  };

  console.log("[workspace.v15.timegrid] loaded");
})();