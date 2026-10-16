/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Life & Leisure Hub (Phase F.10, v2)
   External IIFE — R.lifeUI
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[life-ui] R missing"); return; }
  var L = R.lifeUI = R.lifeUI || {};
  L.VERSION = "2.0.0";

  /* ─── Bridge ─── */
  function _b() { return window.__ioLifeBridge; }
  function _state() { var b = _b(); return b ? b.state() : null; }
  function _save() { var b = _b(); if (b && b.save) b.save(); }
  function _notify(l, m) { var b = _b(); if (b && b.notify) { try { b.notify(l, m); return; } catch (e) {} } }
  function _esc(s) { var b = _b(); return b && b.escapeHtml ? b.escapeHtml(s == null ? "" : s) : String(s == null ? "" : s); }
  function _fa(n) { var b = _b(); return b && b.fa1 ? b.fa1(n) : String(n); }
  function _faNum(n) { var b = _b(); return b && b.faNum ? b.faNum(n) : String(n); }
  function _today() { var b = _b(); return b && b.todayJalali ? b.todayJalali() : ""; }
  function _parse(j) { var b = _b(); return b && b.parseJalali ? b.parseJalali(j) : null; }
  function _weekday(jy, jm, jd) { var b = _b(); return b && b.weekdayName ? b.weekdayName(jy, jm, jd) : ""; }
  function _newId() { var b = _b(); return b && b.newId ? b.newId() : ("life-" + Date.now()); }
  function _findTask(tid) { var b = _b(); return b && b.findTask ? b.findTask(tid) : null; }
  function _gotoDashboard() {
    try { window.location.hash = "#/dashboard"; } catch (e) {}
    try {
      var b = _b();
      if (b && b.setRoute) b.setRoute("dashboard");
    } catch (e2) {}
  }
  function _confirm(msg, opts) {
    var b = _b();
    if (b && b.dialogConfirm) { try { return Promise.resolve(b.dialogConfirm(msg, opts)); } catch (e) {} }
    return Promise.resolve(window.confirm(msg));
  }
  function _ensure(s) { var b = _b(); if (b && b.ensure) return b.ensure(s); return null; }

  /* ─── Categories & status ─── */
  var CATS = [
    { id: "movie",  label: "فیلم",           icon: "🎬", group: "media",  color: "139, 92, 246" },
    { id: "series", label: "سریال",          icon: "📺", group: "media",  color: "236, 72, 153" },
    { id: "book",   label: "کتاب",           icon: "📚", group: "media",  color: "59, 130, 246" },
    { id: "date",   label: "قرار",           icon: "💕", group: "social", color: "244, 63, 94" },
    { id: "social", label: "فعالیت اجتماعی", icon: "🎉", group: "social", color: "251, 191, 36" },
    { id: "travel", label: "سفر",            icon: "✈️", group: "social", color: "20, 184, 166" },
    { id: "other",  label: "سایر",           icon: "✨", group: "other",  color: "148, 163, 184" }
  ];
  var STATUS = [
    { id: "planned",     label: "برنامه‌ریزی‌شده", icon: "📌", color: "96, 165, 250" },
    { id: "in_progress", label: "در حال انجام",     icon: "▶️", color: "251, 191, 36" },
    { id: "done",        label: "انجام‌شده",       icon: "✅", color: "52, 211, 153" },
    { id: "dropped",     label: "رها‌شده",         icon: "🚫", color: "148, 163, 184" }
  ];

  function _catMeta(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return CATS[i];
    return CATS[CATS.length - 1];
  }
  function _statusMeta(id) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].id === id) return STATUS[i];
    return STATUS[0];
  }
  function _isValidCat(id) {
    for (var i = 0; i < CATS.length; i++) if (CATS[i].id === id) return true;
    return false;
  }
  function _isValidStatus(id) {
    for (var i = 0; i < STATUS.length; i++) if (STATUS[i].id === id) return true;
    return false;
  }

  /* ─── State ─── */
  var _view = null;
  var _tab = "media";
  var _filter = { catId: "", status: "", q: "", rating: 0 };
  var _detailId = null;
  var _lastSubmitAt = 0;

  function _ensureAll(s) { var f = _ensure(s); return f ? f.items : []; }
  function _all() { var s = _state(); return s ? _ensureAll(s).slice() : []; }
  function _find(id) {
    var a = _all();
    for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i];
    return null;
  }

  /* ─── Filter ─── */
  function _filteredList() {
    var arr = _all();
    if (_tab === "media") arr = arr.filter(function (x) { return _catMeta(x.category).group === "media"; });
    if (_tab === "social") arr = arr.filter(function (x) { var g = _catMeta(x.category).group; return g === "social" || g === "other"; });
    if (_filter.catId) arr = arr.filter(function (x) { return x.category === _filter.catId; });
    if (_filter.status) arr = arr.filter(function (x) { return x.status === _filter.status; });
    if (_filter.rating > 0) arr = arr.filter(function (x) { return (x.rating || 0) >= _filter.rating; });
    if (_filter.q) {
      var q = _filter.q.toLowerCase();
      arr = arr.filter(function (x) {
        var hay = ((x.title || "") + " " + (x.note || "") + " " + ((x.tags || []).join(" "))).toLowerCase();
        return hay.indexOf(q) !== -1;
      });
    }
    arr = arr.slice();
    var order = { planned: 0, in_progress: 1, done: 2, dropped: 3 };
    arr.sort(function (a, b) {
      var ao = order[a.status] != null ? order[a.status] : 9;
      var bo = order[b.status] != null ? order[b.status] : 9;
      if (ao !== bo) return ao - bo;
      return (b.updatedAt || 0) - (a.updatedAt || 0);
    });
    return arr;
  }
  function _counts() {
    var arr = _all();
    var c = { planned: 0, in_progress: 0, done: 0, dropped: 0, total: arr.length };
    for (var i = 0; i < arr.length; i++) if (c[arr[i].status] != null) c[arr[i].status]++;
    return c;
  }
  function _tabCounts() {
    var arr = _all();
    var m = 0, s = 0;
    for (var i = 0; i < arr.length; i++) {
      var g = _catMeta(arr[i].category).group;
      if (g === "media") m++;
      if (g === "social" || g === "other") s++;
    }
    return { media: m, social: s, all: arr.length };
  }

  /* ─── Render ─── */
  L.render = function (view) {
    if (!view) return;
    _view = view;
    var f = _ensure(_state());
    if (!f) { view.innerHTML = '<div class="life-empty">state در دسترس نیست</div>'; return; }
    var h = [];
    h.push('<div class="area-detail life-wrap">');
    h.push(_headerHTML());
    h.push(_heroHTML());
    h.push(_toolbarHTML());
    h.push('<div class="life-body-host">');
    if (_detailId && _find(_detailId)) h.push(_detailHTML(_find(_detailId)));
    else h.push(_listHTML());
    h.push('</div>');
    h.push('</div>');
    view.innerHTML = h.join("\n");
    _bind(view);
  };

  function _headerHTML() {
    return [
      '  <button class="area-detail-back" type="button" data-life-back-nav>',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>',
      '    بازگشت',
      '  </button>'
    ].join("\n");
  }

  function _heroHTML() {
    var c = _counts();
    var h = [];
    h.push('<div class="life-hero">');
    h.push('  <div class="life-hero-pattern" aria-hidden="true"></div>');
    h.push('  <div class="life-hero-glow"></div>');
    h.push('  <div class="life-hero-main">');
    h.push('    <div class="life-hero-icon">🎬</div>');
    h.push('    <div class="life-hero-text">');
    h.push('      <div class="life-hero-en">Life &amp; Leisure</div>');
    h.push('      <h2 class="life-hero-title">زندگی و تفریح</h2>');
    h.push('      <p class="life-hero-sub">فیلم‌ها، کتاب‌ها، قرارها و سفرها — سابقه شخصی و تجربه‌های تو</p>');
    h.push('    </div>');
    h.push('  </div>');
    h.push('  <div class="life-hero-stats">');
    h.push('    <div class="life-hero-stat is-planned"><span class="life-hero-stat-ic">📌</span><span class="life-hero-stat-n">' + _faNum(c.planned) + '</span><span class="life-hero-stat-l">برنامه</span></div>');
    h.push('    <div class="life-hero-stat is-prog"><span class="life-hero-stat-ic">▶️</span><span class="life-hero-stat-n">' + _faNum(c.in_progress) + '</span><span class="life-hero-stat-l">در حال</span></div>');
    h.push('    <div class="life-hero-stat is-done"><span class="life-hero-stat-ic">✅</span><span class="life-hero-stat-n">' + _faNum(c.done) + '</span><span class="life-hero-stat-l">انجام‌شده</span></div>');
    h.push('    <div class="life-hero-stat is-all"><span class="life-hero-stat-ic">📚</span><span class="life-hero-stat-n">' + _faNum(c.total) + '</span><span class="life-hero-stat-l">کل</span></div>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  function _toolbarHTML() {
    var tc = _tabCounts();
    var h = [];
    h.push('<div class="life-toolbar">');
    h.push('  <div class="life-tabs">');
    h.push('    <button class="life-tab' + (_tab === "media" ? " is-active" : "") + '" data-life-tab="media"><span class="life-tab-ic">🎬</span><span class="life-tab-lbl">فیلم و کتاب</span><span class="life-tab-count">' + _faNum(tc.media) + '</span></button>');
    h.push('    <button class="life-tab' + (_tab === "social" ? " is-active" : "") + '" data-life-tab="social"><span class="life-tab-ic">✈️</span><span class="life-tab-lbl">قرارها و سفرها</span><span class="life-tab-count">' + _faNum(tc.social) + '</span></button>');
    h.push('    <button class="life-tab' + (_tab === "all" ? " is-active" : "") + '" data-life-tab="all"><span class="life-tab-ic">📚</span><span class="life-tab-lbl">همه</span><span class="life-tab-count">' + _faNum(tc.all) + '</span></button>');
    h.push('  </div>');
    h.push('  <button class="btn primary life-add-btn" type="button" data-life-add>➕ افزودن مورد</button>');
    h.push('</div>');
    return h.join("\n");
  }

  function _listHTML() {
    var c = _counts();
    var list = _filteredList();
    var h = [];

    /* filter bar */
    h.push('<div class="life-filter-bar">');
    h.push('  <div class="life-search-wrap">');
    h.push('    <span class="life-search-ic">🔍</span>');
    h.push('    <input type="text" class="life-search" data-life-search placeholder="جست‌وجو در عنوان، یادداشت، برچسب..." value="' + _esc(_filter.q) + '">');
    h.push('  </div>');
    h.push('  <div class="life-status-chips">');
    h.push('    <button class="life-chip' + (!_filter.status ? " is-active" : "") + '" data-life-fstatus="">همه</button>');
    h.push('    <button class="life-chip is-planned' + (_filter.status === "planned" ? " is-active" : "") + '" data-life-fstatus="planned">📌 برنامه (' + _faNum(c.planned) + ')</button>');
    h.push('    <button class="life-chip is-prog' + (_filter.status === "in_progress" ? " is-active" : "") + '" data-life-fstatus="in_progress">▶️ در حال (' + _faNum(c.in_progress) + ')</button>');
    h.push('    <button class="life-chip is-done' + (_filter.status === "done" ? " is-active" : "") + '" data-life-fstatus="done">✅ انجام (' + _faNum(c.done) + ')</button>');
    h.push('    <button class="life-chip is-dropped' + (_filter.status === "dropped" ? " is-active" : "") + '" data-life-fstatus="dropped">🚫 رها (' + _faNum(c.dropped) + ')</button>');
    h.push('  </div>');
    h.push('</div>');

    /* category chips */
    var visibleCats = CATS;
    if (_tab === "media") visibleCats = CATS.filter(function (x) { return x.group === "media"; });
    if (_tab === "social") visibleCats = CATS.filter(function (x) { return x.group === "social" || x.group === "other"; });
    h.push('<div class="life-cat-chips">');
    h.push('  <button class="life-cat-chip' + (!_filter.catId ? " is-active" : "") + '" data-life-fcat="">همه</button>');
    for (var i = 0; i < visibleCats.length; i++) {
      var cat = visibleCats[i];
      h.push('  <button class="life-cat-chip' + (_filter.catId === cat.id ? " is-active" : "") + '" data-life-fcat="' + cat.id + '" style="--cc:' + cat.color + '">' + cat.icon + ' ' + cat.label + '</button>');
    }
    h.push('</div>');

    /* list */
    if (!list.length) {
      var empty = (_filter.q || _filter.status || _filter.catId);
      h.push('<div class="life-empty">');
      h.push('  <div class="life-empty-icon">' + (empty ? "🔍" : "🎬") + '</div>');
      if (empty) {
        h.push('  <p>هیچ موردی با فیلترهای انتخابی پیدا نشد.</p>');
        h.push('  <button class="btn ghost" type="button" data-life-reset>✕ پاک‌کردن فیلترها</button>');
      } else {
        h.push('  <p>هنوز چیزی اینجا نیست.</p>');
        h.push('  <button class="btn primary" type="button" data-life-add>➕ افزودن اولین مورد</button>');
      }
      h.push('</div>');
    } else {
      h.push('<div class="life-grid">');
      for (var j = 0; j < list.length; j++) h.push(_cardHTML(list[j]));
      h.push('</div>');
    }
    return h.join("\n");
  }

  function _cardHTML(x) {
    var cat = _catMeta(x.category);
    var st = _statusMeta(x.status);
    var task = x.taskId ? _findTask(x.taskId) : null;
    var linked = task ? true : false;
    var h = [];
    h.push('<div class="life-card" data-life-open="' + _esc(x.id) + '" style="--cc:' + cat.color + '">');
    h.push('  <div class="life-card-glow" aria-hidden="true"></div>');
    h.push('  <div class="life-card-head">');
    h.push('    <div class="life-card-icon">' + cat.icon + '</div>');
    h.push('    <span class="life-badge is-' + x.status + '">' + st.icon + ' ' + st.label + '</span>');
    h.push('  </div>');
    h.push('  <div class="life-card-title">' + _esc(x.title) + '</div>');
    h.push('  <div class="life-card-sub">' + cat.label + (x.taskId ? (linked ? ' • 📅 ' + _esc(task.date || "") : ' • 📅 (حذف‌شده)') : '') + '</div>');
    if (x.rating) h.push('  <div class="life-stars">' + _stars(x.rating) + '</div>');
    if (x.note) h.push('  <div class="life-card-note">' + _esc(x.note) + '</div>');
    h.push('  <div class="life-card-foot">');
    h.push('    <span class="life-card-foot-l">' + (x.taskId ? '📅 زمان‌بندی' : cat.group === 'media' ? '🎬 محتوا' : '✈️ رویداد') + '</span>');
    h.push('    <span class="life-card-foot-r">مشاهده ›</span>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }
  function _stars(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) out += (i <= n ? "★" : "☆");
    return out;
  }

  function _detailHTML(x) {
    var cat = _catMeta(x.category);
    var st = _statusMeta(x.status);
    var task = x.taskId ? _findTask(x.taskId) : null;
    var h = [];
    h.push('<div class="life-detail" style="--cc:' + cat.color + '">');
    h.push('  <div class="life-detail-hero">');
    h.push('    <div class="life-detail-icon">' + cat.icon + '</div>');
    h.push('    <div class="life-detail-head">');
    h.push('      <h2 class="life-detail-title">' + _esc(x.title) + '</h2>');
    h.push('      <div class="life-detail-badges">');
    h.push('        <span class="life-badge is-' + x.status + '">' + st.icon + ' ' + st.label + '</span>');
    h.push('        <span class="life-badge" style="background:rgba(' + cat.color + ',.15);color:rgb(' + cat.color + ')">' + cat.label + '</span>');
    if (x.taskId) h.push('        <span class="life-badge is-linked">' + (task ? '📅 زمان‌بندی‌شده' : '📅 تسک حذف‌شده') + '</span>');
    h.push('      </div>');
    h.push('    </div>');
    h.push('  </div>');
    if (x.rating) h.push('  <div class="life-stars life-stars-big">' + _stars(x.rating) + ' <span class="life-rating-num">' + _fa(x.rating) + '/۵</span></div>');
    if (x.note) h.push('  <div class="life-detail-section"><div class="life-detail-lbl">📝 یادداشت</div><div class="life-detail-val">' + _esc(x.note) + '</div></div>');
    if (x.tags && x.tags.length) {
      h.push('  <div class="life-detail-section"><div class="life-detail-lbl">🏷️ برچسب‌ها</div><div class="life-detail-tags">');
      for (var i = 0; i < x.tags.length; i++) h.push('    <span class="life-tag">' + _esc(x.tags[i]) + '</span>');
      h.push('  </div></div>');
    }
    if (x.taskId) {
      h.push('  <div class="life-linked-task' + (task ? '' : ' life-linked-task-miss') + '">');
      if (task) {
        h.push('    <div class="life-linked-task-ic">📅</div>');
        h.push('    <div class="life-linked-task-body">');
        h.push('      <div class="life-linked-task-title">' + _esc(task.title || "") + '</div>');
        h.push('      <div class="life-linked-task-sub">' + _esc(task.date || "") + (task.time ? ' • ' + _esc(task.time) : '') + (task.completed ? ' • ✅' : '') + '</div>');
        h.push('    </div>');
        h.push('    <button class="life-chip" type="button" data-life-open-task="' + _esc(task.id) + '">باز کردن</button>');
      } else {
        h.push('    <div class="life-linked-task-ic">⚠️</div>');
        h.push('    <div class="life-linked-task-body"><div class="life-linked-task-title">تسک مرتبط پیدا نشد</div><div class="life-linked-task-sub">ممکن است حذف شده باشد.</div></div>');
      }
      h.push('  </div>');
    }
    h.push('  <div class="life-detail-actions">');
    h.push('    <button class="btn ghost" type="button" data-life-back>‹ بازگشت</button>');
    h.push('    <button class="btn" type="button" data-life-edit="' + _esc(x.id) + '">✏️ ویرایش</button>');
    if (x.status !== "in_progress") h.push('    <button class="btn" type="button" data-life-start="' + _esc(x.id) + '">▶️ شروع</button>');
    if (x.status !== "done") h.push('    <button class="btn primary" type="button" data-life-done="' + _esc(x.id) + '">✅ انجام شد</button>');
    if (!x.taskId) h.push('    <button class="btn primary" type="button" data-life-schedule="' + _esc(x.id) + '">📅 برنامه‌ریزی</button>');
    h.push('    <button class="btn ghost" type="button" data-life-del="' + _esc(x.id) + '">🗑️ حذف</button>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  /* ─── Bind ─── */
  function _bind(view) {
    _attachClick(view);
    var search = view.querySelector("[data-life-search]");
    if (search) _attachSearch(search);
  }
  function _attachClick(view) {
    view.onclick = function (e) {
      var el = e.target;
      if (!el || !el.closest) return;
      var t;
      t = el.closest("[data-life-back-nav]");
      if (t) { _gotoDashboard(); return; }
      t = el.closest("[data-life-tab]");
      if (t) { _tab = t.getAttribute("data-life-tab"); _detailId = null; _rerender(); return; }
      t = el.closest("[data-life-add]");
      if (t) { _openForm(null); return; }
      t = el.closest("[data-life-open]");
      if (t) { _detailId = t.getAttribute("data-life-open"); _rerender(); return; }
      t = el.closest("[data-life-back]");
      if (t) { _detailId = null; _rerender(); return; }
      t = el.closest("[data-life-edit]");
      if (t) { _openForm(t.getAttribute("data-life-edit")); return; }
      t = el.closest("[data-life-done]");
      if (t) { _setStatus(t.getAttribute("data-life-done"), "done"); return; }
      t = el.closest("[data-life-start]");
      if (t) { _setStatus(t.getAttribute("data-life-start"), "in_progress"); return; }
      t = el.closest("[data-life-del]");
      if (t) { _deleteItem(t.getAttribute("data-life-del")); return; }
      t = el.closest("[data-life-schedule]");
      if (t) { _scheduleTask(t.getAttribute("data-life-schedule")); return; }
      t = el.closest("[data-life-open-task]");
      if (t) {
        var b = _b();
        if (b && b.openTaskForm) { try { b.openTaskForm(t.getAttribute("data-life-open-task")); } catch (e3) {} }
        return;
      }
      t = el.closest("[data-life-fstatus]");
      if (t) { _filter.status = t.getAttribute("data-life-fstatus") || ""; _refreshList(); return; }
      t = el.closest("[data-life-fcat]");
      if (t) { _filter.catId = t.getAttribute("data-life-fcat") || ""; _refreshList(); return; }
      t = el.closest("[data-life-reset]");
      if (t) { _filter = { catId: "", status: "", q: "", rating: 0 }; _refreshList(); return; }
    };
  }
  function _attachSearch(search) {
    search.addEventListener("input", function () {
      _filter.q = search.value || "";
      if (search.__t) clearTimeout(search.__t);
      search.__t = setTimeout(function () {
        _refreshList();
        var s2 = _view && _view.querySelector("[data-life-search]");
        if (s2) { try { s2.focus(); s2.setSelectionRange(s2.value.length, s2.value.length); } catch (e) {} }
      }, 250);
    });
  }
  function _rerender() { if (_view) L.render(_view); }
  function _refreshList() {
    if (!_view) return;
    var host = _view.querySelector(".life-body-host");
    if (!host) { _rerender(); return; }
    if (_detailId && _find(_detailId)) host.innerHTML = _detailHTML(_find(_detailId));
    else host.innerHTML = _listHTML();
    var hero = _view.querySelector(".life-hero");
    if (hero) hero.outerHTML = _heroHTML();
    var tb = _view.querySelector(".life-toolbar");
    if (tb) tb.outerHTML = _toolbarHTML();
    _attachClick(_view);
    var search = _view.querySelector("[data-life-search]");
    if (search) _attachSearch(search);
  }

  /* ─── Status / delete ─── */
  function _setStatus(id, status) {
    var x = _find(id); if (!x) return;
    x.status = status;
    x.updatedAt = Date.now();
    if (status === "done" && !x.completedAt) x.completedAt = Date.now();
    if (status === "in_progress" && !x.startedAt) x.startedAt = Date.now();
    _save();
    _notify("success", "وضعیت به‌روزرسانی شد.");
    _rerender();
  }
  function _deleteItem(id) {
    var s = _state(); if (!s) return;
    var f = _ensure(s);
    var x = _find(id); if (!x) return;
    var hasTask = !!x.taskId;
    var msg = hasTask ? "این مورد حذف شود؟ تسک مرتبط حذف نمی‌شود." : "این مورد حذف شود؟";
    _confirm(msg, { title: "حذف مورد" }).then(function (ok) {
      if (!ok) return;
      f.items = f.items.filter(function (y) { return y.id !== id; });
      _save();
      _notify("info", "حذف شد.");
      _detailId = null;
      _rerender();
    }, function () {});
  }
  function _scheduleTask(id) {
    var x = _find(id); if (!x) return;
    var b = _b();
    if (!b || !b.openTaskForm) { _notify("error", "فرم تسک در دسترس نیست."); return; }
    var today = _parse(_today());
    b.openTaskForm(null, today, "life", null);
    window.__lifeLinkPending = id;
    _notify("info", "تسک بساز؛ بعد از ذخیره به این مورد وصل می‌شود.");
  }

  /* Called from app.js after a task is created with areaId === "life" while __lifeLinkPending is set */
  L.consumePendingLink = function (taskId) {
    if (!window.__lifeLinkPending) return false;
    var id = window.__lifeLinkPending;
    window.__lifeLinkPending = null;
    var x = _find(id); if (!x) return false;
    x.taskId = taskId;
    x.updatedAt = Date.now();
    _save();
    _notify("success", "📅 تسک به مورد زندگی وصل شد.");
    return true;
  };

  /* ─── Form ─── */
  function _openForm(id) {
    var isEdit = !!id;
    var s = _state(); if (!s) return;
    var existing = isEdit ? _find(id) : null;
    if (isEdit && !existing) return;
    var init = {
      title: existing ? (existing.title || "") : "",
      category: existing ? existing.category : (_tab === "social" ? "date" : "movie"),
      status: existing ? existing.status : "planned",
      rating: existing ? (existing.rating || 0) : 0,
      note: existing ? (existing.note || "") : "",
      tags: existing ? (existing.tags || []).join(", ") : ""
    };
    var overlay = document.createElement("div");
    overlay.className = "life-form-overlay";
    overlay.innerHTML = _formHTML(init, isEdit);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var titleInput = overlay.querySelector('[data-lf="title"]');
    if (titleInput) { try { titleInput.focus(); } catch (e) {} }
    overlay.__rating = init.rating;
    overlay.__category = init.category;

    overlay.addEventListener("click", function (e) {
      var el = e.target;
      if (!el || !el.closest) return;
      if (el === overlay) { _closeForm(overlay); return; }
      var t;
      t = el.closest("[data-lf-cancel]");
      if (t) { _closeForm(overlay); return; }
      t = el.closest("[data-lf-save]");
      if (t) { _submitForm(overlay, id); return; }
      t = el.closest("[data-lf-cat]");
      if (t) {
        overlay.querySelectorAll("[data-lf-cat]").forEach(function (b) { b.classList.remove("is-active"); });
        t.classList.add("is-active");
        overlay.__category = t.getAttribute("data-lf-cat");
        return;
      }
      t = el.closest("[data-lf-star]");
      if (t) {
        var v = parseInt(t.getAttribute("data-lf-star"), 10);
        overlay.__rating = (overlay.__rating === v) ? 0 : v;
        _refreshStars(overlay);
        return;
      }
    });
  }
  function _refreshStars(overlay) {
    overlay.querySelectorAll("[data-lf-star]").forEach(function (b) {
      var v = parseInt(b.getAttribute("data-lf-star"), 10);
      if (v <= overlay.__rating) b.classList.add("is-on");
      else b.classList.remove("is-on");
    });
  }
  function _formHTML(init, isEdit) {
    var h = [];
    h.push('<div class="life-form-modal" role="dialog" aria-modal="true">');
    h.push('  <h3 class="life-form-h">' + (isEdit ? "✏️ ویرایش مورد" : "✨ مورد جدید") + '</h3>');
    h.push('  <div class="life-row"><label>عنوان *</label><input type="text" data-lf="title" value="' + _esc(init.title) + '" autocomplete="off" placeholder="مثلاً: Inception"></div>');
    h.push('  <div class="life-row"><label>دسته‌بندی *</label><div class="life-cat-chips">');
    for (var i = 0; i < CATS.length; i++) {
      var c = CATS[i];
      h.push('    <button type="button" class="life-cat-chip' + (init.category === c.id ? " is-active" : "") + '" data-lf-cat="' + c.id + '" style="--cc:' + c.color + '">' + c.icon + ' ' + c.label + '</button>');
    }
    h.push('  </div></div>');
    h.push('  <div class="life-grid-2">');
    h.push('    <div class="life-row"><label>وضعیت</label><select data-lf="status">');
    for (var s2 = 0; s2 < STATUS.length; s2++) {
      h.push('      <option value="' + STATUS[s2].id + '"' + (init.status === STATUS[s2].id ? " selected" : "") + '>' + STATUS[s2].icon + ' ' + STATUS[s2].label + '</option>');
    }
    h.push('    </select></div>');
    h.push('    <div class="life-row"><label>امتیاز (اختیاری)</label><div class="life-stars-picker">');
    for (var r = 1; r <= 5; r++) {
      h.push('      <button type="button" class="life-star-btn' + (r <= init.rating ? " is-on" : "") + '" data-lf-star="' + r + '">★</button>');
    }
    h.push('    </div></div>');
    h.push('  </div>');
    h.push('  <div class="life-row"><label>یادداشت (اختیاری)</label><textarea data-lf="note" rows="2">' + _esc(init.note) + '</textarea></div>');
    h.push('  <div class="life-row"><label>برچسب‌ها (اختیاری، با کاما)</label><input type="text" data-lf="tags" value="' + _esc(init.tags) + '" placeholder="مثلاً: خارجی، اکشن"></div>');
    h.push('  <div class="life-err" data-lf-err></div>');
    h.push('  <div class="life-actions">');
    h.push('    <button class="btn ghost" type="button" data-lf-cancel>انصراف</button>');
    h.push('    <button class="btn primary" type="button" data-lf-save>' + (isEdit ? "💾 ذخیره" : "✅ افزودن") + '</button>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }
  function _closeForm(el) {
    try { el.classList.remove("open"); } catch (e) {}
    setTimeout(function () { try { el.parentNode.removeChild(el); } catch (e) {} }, 120);
  }
  function _submitForm(overlay, id) {
    if (Date.now() - _lastSubmitAt < 600) return;
    var q = function (sel) { var el = overlay.querySelector(sel); return el ? el.value : ""; };
    var title = String(q('[data-lf="title"]')).trim();
    var category = overlay.__category;
    var status = q('[data-lf="status"]');
    var note = q('[data-lf="note"]');
    var tagsRaw = q('[data-lf="tags"]');
    var rating = overlay.__rating || 0;
    var err = overlay.querySelector("[data-lf-err]");
    if (!title) { err.textContent = "عنوان را وارد کن."; return; }
    if (!_isValidCat(category)) { err.textContent = "دسته‌بندی نامعتبر."; return; }
    if (!_isValidStatus(status)) { err.textContent = "وضعیت نامعتبر."; return; }
    if (rating && (rating < 1 || rating > 5)) { err.textContent = "امتیاز باید بین ۱ تا ۵ باشد."; return; }

    var tags = tagsRaw.split(",").map(function (t) { return t.trim(); }).filter(function (t) { return !!t; });

    var s = _state(); if (!s) return;
    var f = _ensure(s);
    var now = Date.now();
    if (id) {
      var x = _find(id); if (!x) { _closeForm(overlay); return; }
      x.title = title;
      x.category = category;
      var wasStatus = x.status;
      x.status = status;
      if (status === "done" && wasStatus !== "done" && !x.completedAt) x.completedAt = now;
      if (status === "in_progress" && wasStatus !== "in_progress" && !x.startedAt) x.startedAt = now;
      x.rating = rating || null;
      x.note = note || "";
      x.tags = tags;
      x.updatedAt = now;
    } else {
      f.items.push({
        id: _newId(),
        category: category,
        title: title,
        status: status,
        rating: rating || null,
        note: note || "",
        tags: tags,
        taskId: null,
        createdAt: now,
        updatedAt: now,
        startedAt: status === "in_progress" ? now : null,
        completedAt: status === "done" ? now : null
      });
    }
    _lastSubmitAt = now;
    _save();
    _notify("success", id ? "✅ ذخیره شد." : "✅ افزوده شد.");
    _closeForm(overlay);
    _rerender();
  }

  /* ─── Exposed helpers ─── */
  L._catMeta = _catMeta;
  L._statusMeta = _statusMeta;
  L._isValidCat = _isValidCat;
  L._isValidStatus = _isValidStatus;
  L._stars = _stars;
  L.CATS = CATS;
  L.STATUS = STATUS;

  console.log("[life-ui] loaded v" + L.VERSION);
})();