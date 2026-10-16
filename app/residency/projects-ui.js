/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Projects Hub (Phase F.8)
   External module — R.projectsUI — banner-style navigation
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[projects-ui] R missing"); return; }
  var P = R.projectsUI = R.projectsUI || {};
  P.VERSION = "1.1.0";

  var PROJ_PURPLE = "168, 85, 247";
  var FIN_BLUE = "59, 130, 246";

  function _b() { return window.__ioProjectsBridge; }
  function _state() { var b = _b(); return b ? b.state() : null; }
  function _save() { var b = _b(); if (b && b.save) b.save(); }
  function _notify(level, msg) {
    var b = _b();
    if (b && b.notify) { try { b.notify(level, msg); return; } catch (e) {} }
  }
  function _esc(s) { var b = _b(); return b && b.escapeHtml ? b.escapeHtml(s == null ? "" : s) : String(s == null ? "" : s); }
  function _fa(n) { var b = _b(); return b && b.fa1 ? b.fa1(n) : String(n); }

  var STATUS = [
    { id: "active",    label: "فعال",       icon: "🔥" },
    { id: "completed", label: "تکمیل‌شده",  icon: "✅" },
    { id: "archived",  label: "بایگانی",    icon: "📦" }
  ];
  var PRIORITY = [
    { id: "low",    label: "کم",     color: "96,165,250" },
    { id: "normal", label: "متوسط",  color: "251,191,36" },
    { id: "high",   label: "زیاد",   color: "248,113,113" }
  ];
  function _label(arr, id, field) {
    for (var i=0;i<arr.length;i++) if (arr[i].id === id) return arr[i][field];
    return id == null ? "" : String(id);
  }

  var _view = null;
  var _tab = "finance";
  var _filter = "active";
  var _detailId = null;
  var _expandedTasks = {};
  var _noteSaveTimer = null;

  function _ensure(s) {
    var b = _b();
    if (b && b.ensure) return b.ensure(s);
    if (!s) return [];
    if (!Array.isArray(s.projects)) s.projects = [];
    return s.projects;
  }
  function _all() {
    var s = _state(); if (!s) return [];
    _ensure(s);
    return s.projects.slice();
  }
  function _find(id) {
    var a = _all();
    for (var i=0;i<a.length;i++) if (a[i].id === id) return a[i];
    return null;
  }
  function _linked(pid) {
    var s = _state(); if (!s) return [];
    var ts = s.tasks || [], out = [];
    for (var i=0;i<ts.length;i++) if (ts[i].projectId === pid) out.push(ts[i]);
    return out;
  }
  function _progress(pid) {
    var ts = _linked(pid), total = ts.length, done = 0;
    for (var i=0;i<ts.length;i++) if (ts[i].completed) done++;
    return { total: total, done: done, pct: total ? Math.round(done*100/total) : null };
  }
  function _stats() {
    var all = _all();
    var c = { active: 0, completed: 0, archived: 0, linkedTasks: 0 };
    for (var i=0;i<all.length;i++) {
      if (c[all[i].status] !== undefined) c[all[i].status]++;
      if (all[i].status === "active") c.linkedTasks += _linked(all[i].id).length;
    }
    return c;
  }
  function _isDate(s) {
    if (s == null || s === "") return true;
    return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s);
  }
  function _dateNum(s) {
    if (!s) return null;
    var p = String(s).split("/"); if (p.length !== 3) return null;
    return parseInt(p[0],10)*10000 + parseInt(p[1],10)*100 + parseInt(p[2],10);
  }
  function _validate(form) {
    var errs = [];
    if (!form.title || !form.title.trim()) errs.push("عنوان پروژه الزامی است.");
    if (!_isDate(form.startDate)) errs.push("تاریخ شروع نامعتبر است.");
    if (!_isDate(form.deadline)) errs.push("مهلت نامعتبر است.");
    if (form.startDate && form.deadline && _dateNum(form.startDate) > _dateNum(form.deadline)) {
      errs.push("مهلت قبل از تاریخ شروع است.");
    }
    return errs;
  }

  function _finSummary() {
    var s = _state(); if (!s || !s.finance) return { income: 0, expense: 0, net: 0, count: 0 };
    var txs = s.finance.transactions || [];
    var tp = null;
    try {
      var b = _b();
      var today = b && b.todayJalali ? b.todayJalali() : "";
      tp = b && b.parseJalali ? b.parseJalali(today) : null;
    } catch (e) {}
    if (!tp) return { income: 0, expense: 0, net: 0, count: 0 };
    var inc = 0, exp = 0, cnt = 0;
    for (var i = 0; i < txs.length; i++) {
      var t = txs[i];
      var p = null;
      try { var b2 = _b(); p = b2 && b2.parseJalali ? b2.parseJalali(t.date) : null; } catch (e) {}
      if (!p || p.jy !== tp.jy || p.jm !== tp.jm) continue;
      var a = (typeof t.amount === "number" && isFinite(t.amount)) ? t.amount : 0;
      if (t.kind === "income") inc += a;
      else if (t.kind === "expense") exp += a;
      cnt++;
    }
    return { income: inc, expense: exp, net: inc - exp, count: cnt };
  }
  function _finFmt(n) {
    try {
      var R2 = window.InternshipResidency;
      if (R2 && R2.financeUI && typeof R2.financeUI.formatToman === "function") {
        return R2.financeUI.formatToman(n);
      }
    } catch (e) {}
    return String(n);
  }
  function _finBig() {
    var S = _finSummary();
    if (S.count === 0) return "بدون داده";
    var v = Math.abs(S.net);
    var sign = S.net > 0 ? "+" : (S.net < 0 ? "−" : "");
    return sign + " " + _finFmt(v) + " تومان";
  }
  function _finSub() {
    var S = _finSummary();
    if (S.count === 0) return "خالص جریان مالی این ماه";
    var b = _b();
    var fnum = (b && b.faNum) ? b.faNum : function (n) { return String(n); };
    return "خالص جریان مالی این ماه • " + fnum(S.count) + " تراکنش";
  }
  P.render = function (view) {
    if (!view) return;
    _view = view;
    var stats = _stats();

    var h = [];
    h.push('<div class="area-detail proj-hub">');
    h.push('  <button class="area-detail-back" type="button" data-nav="dashboard">');
    h.push('    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>');
    h.push('    بازگشت');
    h.push('  </button>');
    h.push('  <div class="proj-banners">');
    h.push('    <div class="proj-banner' + (_tab === "projects" ? " is-active" : "") + '" data-proj-tab="projects" style="--accent:' + PROJ_PURPLE + '" role="tab">');
    h.push('      <div class="proj-banner-icon">📋</div>');
    h.push('      <div class="proj-banner-info">');
    h.push('        <div class="proj-banner-label">پروژه‌ها</div>');
    h.push('        <div class="proj-banner-big">' + _fa(stats.active) + ' فعال</div>');
    h.push('        <div class="proj-banner-sub">' + _fa(stats.linkedTasks) + ' تسک مرتبط</div>');
    h.push('      </div>');
    h.push('    </div>');
    h.push('    <div class="proj-banner' + (_tab === "finance" ? " is-active" : "") + '" data-proj-tab="finance" style="--accent:' + FIN_BLUE + '" role="tab">');
    h.push('      <div class="proj-banner-icon">💰</div>');
    h.push('      <div class="proj-banner-info">');
    h.push('        <div class="proj-banner-label">حسابداری</div>');
    h.push('        <div class="proj-banner-big">' + _finBig() + '</div>');
    h.push('        <div class="proj-banner-sub">' + _finSub() + '</div>');
    h.push('      </div>');
    h.push('    </div>');
    h.push('  </div>');
    h.push('  <div class="proj-body" id="proj-body"></div>');
    h.push('</div>');
    view.innerHTML = h.join("\n");

    var back = view.querySelector('[data-nav="dashboard"]');
    if (back) back.addEventListener("click", function () { _route("dashboard"); });

    var banners = view.querySelectorAll("[data-proj-tab]");
    for (var ti=0; ti<banners.length; ti++) {
      (function (el) {
        el.addEventListener("click", function () {
          _tab = el.getAttribute("data-proj-tab");
          _detailId = null;
          P.render(_view);
        });
      })(banners[ti]);
    }

    var body = view.querySelector("#proj-body");
    if (!body) return;
    if (_tab === "finance") _renderFinance(body);
    else if (_detailId && _find(_detailId)) _renderDetail(body, _detailId);
    else { _detailId = null; _renderList(body); }
  };

  function _route(r) {
    var b = _b();
    if (b && b.setRoute) { try { b.setRoute(r); return; } catch (e) {} }
    try { if (typeof setRoute === "function") setRoute(r); } catch (e2) {}
  }
  function _rerender() { if (_view) P.render(_view); }

  function _renderFinance(body) {
    var R2 = window.InternshipResidency;
    if (R2 && R2.financeUI && typeof R2.financeUI.render === "function") {
      try { R2.financeUI.render(body); return; } catch (e) { console.warn("[proj-finance-delegate]", e); }
    }
    body.innerHTML = '<div class="proj-finance-placeholder"><div class="proj-empty-icon">💰</div><h3>ماژول حسابداری در دسترس نیست</h3></div>';
  }

  function _renderList(body) {
    var all = _all();
    var counts = { active:0, completed:0, archived:0 };
    for (var i=0;i<all.length;i++) if (counts[all[i].status] !== undefined) counts[all[i].status]++;

    var list = [];
    for (var j=0;j<all.length;j++) if (all[j].status === _filter) list.push(all[j]);

    var h = [];
    h.push('<div class="proj-toolbar">');
    h.push('  <button class="btn primary" type="button" data-proj-new>➕ پروژه جدید</button>');
    h.push('  <div class="proj-filters">');
    h.push('    <button class="proj-fbtn' + (_filter==="active"?" is-active":"") + '" data-proj-filter="active">🔥 فعال (' + _fa(counts.active) + ')</button>');
    h.push('    <button class="proj-fbtn' + (_filter==="completed"?" is-active":"") + '" data-proj-filter="completed">✅ تکمیل‌شده (' + _fa(counts.completed) + ')</button>');
    h.push('    <button class="proj-fbtn' + (_filter==="archived"?" is-active":"") + '" data-proj-filter="archived">📦 بایگانی (' + _fa(counts.archived) + ')</button>');
    h.push('  </div>');
    h.push('</div>');

    if (!list.length) {
      var msg = _filter === "active" ? "هنوز پروژه فعالی نداری." : "در این دسته چیزی نیست.";
      h.push('<div class="proj-empty">');
      h.push('  <div class="proj-empty-icon">📋</div>');
      h.push('  <p>' + msg + '</p>');
      if (_filter === "active") h.push('  <button class="btn primary" type="button" data-proj-new>اولین پروژه را بساز</button>');
      h.push('</div>');
    } else {
      h.push('<div class="proj-grid">');
      for (var k=0;k<list.length;k++) h.push(_cardHTML(list[k]));
      h.push('</div>');
    }
    body.innerHTML = h.join("\n");
    _bindList(body);
  }

  function _cardHTML(p) {
    var pr = _progress(p.id);
    var color = _label(PRIORITY, p.priority, "color");
    var statusIcon = _label(STATUS, p.status, "icon");
    var statusLabel = _label(STATUS, p.status, "label");
    var prioLabel = _label(PRIORITY, p.priority, "label");
    var h = [];
    h.push('<div class="proj-card" data-proj-open="' + _esc(p.id) + '" style="--accent:' + color + '">');
    h.push('  <div class="proj-card-head">');
    h.push('    <span class="proj-badge proj-badge-' + _esc(p.status) + '">' + statusIcon + ' ' + _esc(statusLabel) + '</span>');
    h.push('    <span class="proj-badge proj-badge-prio" style="--pc:' + color + '">● ' + _esc(prioLabel) + '</span>');
    h.push('  </div>');
    h.push('  <div class="proj-card-title">' + _esc(p.title) + '</div>');
    if (p.goal) h.push('  <div class="proj-card-goal">🎯 ' + _esc(p.goal) + '</div>');
    else if (p.description) h.push('  <div class="proj-card-desc">' + _esc(p.description) + '</div>');
    h.push('  <div class="proj-card-meta">');
    if (p.startDate) h.push('    <span class="proj-meta">📅 شروع: ' + _esc(p.startDate) + '</span>');
    if (p.deadline)  h.push('    <span class="proj-meta">⏰ مهلت: ' + _esc(p.deadline) + '</span>');
    h.push('  </div>');
    if (pr.pct == null) {
      h.push('  <div class="proj-prog proj-prog-empty">بدون تسک — پیشرفتی ثبت نشده</div>');
    } else {
      h.push('  <div class="proj-prog">');
      h.push('    <div class="proj-prog-bar"><span style="width:' + pr.pct + '%"></span></div>');
      h.push('    <div class="proj-prog-text">' + _fa(pr.done) + '/' + _fa(pr.total) + ' تسک — ' + _fa(pr.pct) + '٪</div>');
      h.push('  </div>');
    }
    h.push('</div>');
    return h.join("\n");
  }

  function _bindList(body) {
    body.addEventListener("click", function (e) {
      var t = e.target.closest("[data-proj-new]");
      if (t) { _openForm(null); return; }
      t = e.target.closest("[data-proj-filter]");
      if (t) { _filter = t.getAttribute("data-proj-filter"); _rerender(); return; }
      t = e.target.closest("[data-proj-open]");
      if (t) { _detailId = t.getAttribute("data-proj-open"); _rerender(); return; }
    });
  }

  function _renderDetail(body, pid) {
    var p = _find(pid);
    if (!p) { _detailId = null; _renderList(body); return; }
    var pr = _progress(pid);
    var color = _label(PRIORITY, p.priority, "color");
    var tasks = _linked(pid);

    var h = [];
    h.push('<div class="proj-detail">');
    h.push('  <button class="proj-back" type="button" data-proj-back>‹ بازگشت به لیست</button>');
    h.push('  <div class="proj-detail-hero" style="--accent:' + color + '">');
    h.push('    <div class="proj-detail-head">');
    h.push('      <span class="proj-badge proj-badge-' + _esc(p.status) + '">' + _label(STATUS, p.status, "icon") + ' ' + _esc(_label(STATUS, p.status, "label")) + '</span>');
    h.push('      <span class="proj-badge proj-badge-prio" style="--pc:' + color + '">● ' + _esc(_label(PRIORITY, p.priority, "label")) + '</span>');
    h.push('    </div>');
    h.push('    <h2 class="proj-detail-title">' + _esc(p.title) + '</h2>');
    if (p.goal) h.push('    <div class="proj-detail-goal">🎯 ' + _esc(p.goal) + '</div>');
    if (p.description) h.push('    <div class="proj-detail-desc">' + _esc(p.description) + '</div>');
    h.push('    <div class="proj-detail-meta">');
    if (p.startDate) h.push('      <span class="proj-meta">📅 شروع: ' + _esc(p.startDate) + '</span>');
    if (p.deadline)  h.push('      <span class="proj-meta">⏰ مهلت: ' + _esc(p.deadline) + '</span>');
    h.push('    </div>');
    if (pr.pct == null) {
      h.push('    <div class="proj-prog proj-prog-empty">بدون تسک — پیشرفتی ثبت نشده</div>');
    } else {
      h.push('    <div class="proj-prog">');
      h.push('      <div class="proj-prog-bar"><span style="width:' + pr.pct + '%"></span></div>');
      h.push('      <div class="proj-prog-text">' + _fa(pr.done) + '/' + _fa(pr.total) + ' تسک — ' + _fa(pr.pct) + '٪</div>');
      h.push('    </div>');
    }
    h.push('    <div class="proj-detail-actions">');
    h.push('      <button class="btn" type="button" data-proj-edit>✏️ ویرایش</button>');
    if (p.status === "active") h.push('      <button class="btn" type="button" data-proj-complete>✅ تکمیل</button>');
    if (p.status !== "archived") h.push('      <button class="btn" type="button" data-proj-archive>📦 بایگانی</button>');
    else h.push('      <button class="btn" type="button" data-proj-unarchive>♻️ بازگرداندن</button>');
    h.push('      <button class="btn ghost" type="button" data-proj-delete>🗑️ حذف</button>');
    h.push('    </div>');
    h.push('  </div>');

    h.push('  <div class="proj-tasks-head">');
    h.push('    <h3>وظایف این پروژه</h3>');
    h.push('    <button class="btn primary" type="button" data-proj-addtask>➕ افزودن تسک</button>');
    h.push('  </div>');

    if (!tasks.length) {
      h.push('<div class="proj-empty proj-empty-sm">');
      h.push('  <p>هنوز تسکی به این پروژه وصل نیست.</p>');
      h.push('</div>');
    } else {
      h.push('<div class="proj-tasks">');
      for (var i=0;i<tasks.length;i++) {
        var t = tasks[i];
        var tid = t.id;
        var isExp = !!_expandedTasks[tid];
        h.push('<div class="proj-task' + (t.completed ? " is-done" : "") + (isExp ? " is-expanded" : "") + '">');
        h.push('  <button type="button" class="proj-task-chevron" data-proj-task-exp="' + _esc(tid) + '" title="جزئیات">' + (isExp ? "▼" : "▶") + '</button>');
        h.push('  <span class="proj-task-check" data-proj-task-done="' + _esc(tid) + '" title="' + (t.completed ? "بازگردانی" : "انجام شد") + '">' + (t.completed ? "✅" : "⭕") + '</span>');
        h.push('  <span class="proj-task-title">' + _esc(t.title) + '</span>');
        h.push('  <span class="proj-task-meta">' + _esc(t.date || "") + (t.time ? " — " + _esc(t.time) : "") + '</span>');
        h.push('  <div class="proj-task-actions">');
        h.push('    <button type="button" class="proj-task-btn" data-proj-task-edit="' + _esc(tid) + '" title="ویرایش">✏️</button>');
        h.push('    <button type="button" class="proj-task-btn" data-proj-task-del="' + _esc(tid) + '" title="حذف">🗑️</button>');
        h.push('  </div>');
        h.push('</div>');
        if (isExp) {
          var desc = t.description ? _esc(t.description) : "";
          var note = t.projNote ? _esc(t.projNote) : "";
          h.push('<div class="proj-task-panel" data-proj-panel="' + _esc(tid) + '">');
          if (desc) h.push('  <div class="proj-panel-desc"><strong>توضیح تسک:</strong> ' + desc + '</div>');
          h.push('  <label class="proj-panel-label">یادداشت پیشرفت</label>');
          h.push('  <textarea class="proj-panel-note" data-proj-note="' + _esc(tid) + '" rows="2" placeholder="چی انجام شد؟ چه چیزی مونده؟">' + note + '</textarea>');
          h.push('  <div class="proj-panel-hint">ذخیره خودکار هنگام تایپ.</div>');
          h.push('</div>');
        }
      }
      h.push('</div>');
    }

    h.push('</div>');
    body.innerHTML = h.join("\n");
    _bindDetail(body, p);
  }

  function _toggleTaskDone(tid) {
    var s = _state(); if (!s) return;
    var t = null;
    for (var i = 0; i < s.tasks.length; i++) { if (s.tasks[i].id === tid) { t = s.tasks[i]; break; } }
    if (!t) return;
    t.completed = !t.completed;
    t.updatedAt = Date.now();
    _save();
    _notify("success", t.completed ? "تسک انجام شد." : "تسک به حالت بازگشت.");
    _rerender();
  }

  function _deleteTask(tid) {
    var s = _state(); if (!s) return;
    var t = null;
    for (var i = 0; i < s.tasks.length; i++) { if (s.tasks[i].id === tid) { t = s.tasks[i]; break; } }
    if (!t) return;
    var b = _b();
    var msg = "تسک «" + (t.title || "") + "» حذف شود؟";
    var go = function () {
      s.tasks = s.tasks.filter(function (x) { return x.id !== tid; });
      _save();
      _notify("info", "تسک حذف شد.");
      _rerender();
    };
    if (b && b.dialogConfirm) {
      Promise.resolve(b.dialogConfirm(msg, { title: "حذف تسک" })).then(function (ok) {
        if (ok) go();
      }, function () {});
    } else { go(); }
  }

  function _editTask(tid) {
    var b = _b();
    if (b && b.openTaskForm) {
      try { b.openTaskForm(tid); return; } catch (e) {}
    }
    _notify("warning", "فرم ویرایش در دسترس نیست.");
  }

  function _toggleTaskExpanded(tid) {
    if (!tid) return;
    if (_expandedTasks[tid]) delete _expandedTasks[tid];
    else _expandedTasks[tid] = true;
    _rerender();
  }

  function _bindDetail(body, p) {
    body.addEventListener("input", function (e) {
      var ta = e.target;
      if (!ta || !ta.getAttribute) return;
      var tid = ta.getAttribute("data-proj-note");
      if (!tid) return;
      var val = String(ta.value || "");
      if (_noteSaveTimer) clearTimeout(_noteSaveTimer);
      _noteSaveTimer = setTimeout(function () {
        var s = _state(); if (!s) return;
        var t = null;
        for (var i = 0; i < s.tasks.length; i++) { if (s.tasks[i].id === tid) { t = s.tasks[i]; break; } }
        if (!t) return;
        if ((t.projNote || "") === val) return;
        t.projNote = val || null;
        t.updatedAt = Date.now();
        _save();
        _notify("success", "یادداشت ذخیره شد.");
      }, 500);
    }, true);
    body.addEventListener("click", function (e) {
      var t = e.target.closest("[data-proj-back]");
      if (t) { _detailId = null; _rerender(); return; }
      t = e.target.closest("[data-proj-task-exp]");
      if (t) { _toggleTaskExpanded(t.getAttribute("data-proj-task-exp")); return; }
      t = e.target.closest("[data-proj-task-edit]");
      if (t) { _editTask(t.getAttribute("data-proj-task-edit")); return; }
      t = e.target.closest("[data-proj-task-del]");
      if (t) { _deleteTask(t.getAttribute("data-proj-task-del")); return; }
      t = e.target.closest("[data-proj-task-done]");
      if (t) { _toggleTaskDone(t.getAttribute("data-proj-task-done")); return; }
      t = e.target.closest("[data-proj-edit]");
      if (t) { _openForm(p.id); return; }
      t = e.target.closest("[data-proj-complete]");
      if (t) { _setStatus(p.id, "completed"); return; }
      t = e.target.closest("[data-proj-archive]");
      if (t) { _archive(p.id); return; }
      t = e.target.closest("[data-proj-unarchive]");
      if (t) { _setStatus(p.id, "active"); return; }
      t = e.target.closest("[data-proj-delete]");
      if (t) { _delete(p.id); return; }
      t = e.target.closest("[data-proj-addtask]");
      if (t) { _addTask(p.id); return; }
    });
  }

  function _setStatus(pid, status) {
    var p = _find(pid); if (!p) return;
    p.status = status;
    p.updatedAt = Date.now();
    _save();
    _notify("success", "وضعیت پروژه به‌روزرسانی شد.");
    _rerender();
  }

  function _archive(pid) {
    var p = _find(pid); if (!p) return;
    var b = _b();
    var msg = "پروژه بایگانی شود؟ وظایف مرتبط دست‌نخورده می‌مانند.";
    var go = function () {
      p.status = "archived";
      p.updatedAt = Date.now();
      _save();
      _notify("info", "پروژه بایگانی شد.");
      _rerender();
    };
    if (b && b.dialogConfirm) {
      Promise.resolve(b.dialogConfirm(msg, { title: "بایگانی" })).then(function (ok) {
        if (ok) go();
      }, function () {});
    } else { go(); }
  }

  function _delete(pid) {
    var p = _find(pid); if (!p) return;
    var s = _state(); if (!s) return;
    var linked = _linked(pid);
    var msg;
    if (linked.length) {
      msg = "این پروژه " + _fa(linked.length) + " تسک دارد. حذف پروژه تسک‌ها را حذف نمی‌کند؛ فقط ارتباط projectId پاک می‌شود. ادامه؟";
    } else {
      msg = "این پروژه حذف شود؟";
    }
    var b = _b();
    var go = function () {
      for (var i=0;i<s.tasks.length;i++) if (s.tasks[i].projectId === pid) s.tasks[i].projectId = null;
      s.projects = s.projects.filter(function (x) { return x.id !== pid; });
      _save();
      _notify("info", "پروژه حذف شد.");
      _detailId = null;
      _rerender();
    };
    if (b && b.dialogConfirm) {
      Promise.resolve(b.dialogConfirm(msg, { title: "حذف پروژه" })).then(function (ok) {
        if (ok) go();
      }, function () {});
    }
  }

  function _addTask(pid) {
    var b = _b();
    if (b && b.openTaskForm) {
      try { b.openTaskForm(null, null, null, pid); return; } catch (e) {}
    }
    _notify("warning", "فرم تسک در دسترس نیست.");
  }

  function _openForm(pid) {
    var isEdit = !!pid;
    var existing = isEdit ? _find(pid) : null;
    var init = {
      title: existing ? (existing.title || "") : "",
      description: existing ? (existing.description || "") : "",
      goal: existing ? (existing.goal || "") : "",
      startDate: existing ? (existing.startDate || "") : "",
      deadline: existing ? (existing.deadline || "") : "",
      priority: existing ? (existing.priority || "normal") : "normal",
      status: existing ? (existing.status || "active") : "active"
    };

    var h = [];
    h.push('<div class="proj-form-overlay" data-proj-form-overlay>');
    h.push('  <div class="proj-form-modal" role="dialog" aria-modal="true">');
    h.push('    <h3>' + (isEdit ? "ویرایش پروژه" : "پروژه جدید") + '</h3>');
    h.push('    <div class="proj-form-row"><label>عنوان *</label><input type="text" data-pf="title" value="' + _esc(init.title) + '" autocomplete="off"></div>');
    h.push('    <div class="proj-form-row"><label>هدف</label><input type="text" data-pf="goal" value="' + _esc(init.goal) + '"></div>');
    h.push('    <div class="proj-form-row"><label>توضیح</label><textarea data-pf="description" rows="2">' + _esc(init.description) + '</textarea></div>');
    h.push('    <div class="proj-form-grid">');
    h.push('      <div class="proj-form-row"><label>تاریخ شروع</label><input type="text" data-pf="startDate" value="' + _esc(init.startDate) + '" placeholder="1405/7/20"></div>');
    h.push('      <div class="proj-form-row"><label>مهلت</label><input type="text" data-pf="deadline" value="' + _esc(init.deadline) + '" placeholder="1405/8/15"></div>');
    h.push('    </div>');
    h.push('    <div class="proj-form-grid">');
    h.push('      <div class="proj-form-row"><label>اولویت</label><select data-pf="priority">');
    for (var i=0;i<PRIORITY.length;i++) h.push('<option value="' + PRIORITY[i].id + '"' + (init.priority===PRIORITY[i].id?" selected":"") + '>' + PRIORITY[i].label + '</option>');
    h.push('      </select></div>');
    h.push('      <div class="proj-form-row"><label>وضعیت</label><select data-pf="status">');
    for (var k=0;k<STATUS.length;k++) h.push('<option value="' + STATUS[k].id + '"' + (init.status===STATUS[k].id?" selected":"") + '>' + STATUS[k].icon + ' ' + STATUS[k].label + '</option>');
    h.push('      </select></div>');
    h.push('    </div>');
    h.push('    <div class="proj-form-err" data-proj-form-err></div>');
    h.push('    <div class="modal-actions">');
    h.push('      <button class="btn ghost" type="button" data-proj-form-cancel>انصراف</button>');
    h.push('      <button class="btn primary" type="button" data-proj-form-save>' + (isEdit ? "ذخیره" : "ایجاد") + '</button>');
    h.push('    </div>');
    h.push('  </div>');
    h.push('</div>');

    var wrap = document.createElement("div");
    wrap.innerHTML = h.join("\n");
    var root = wrap.firstChild;
    document.body.appendChild(root);
    requestAnimationFrame(function () { root.classList.add("open"); });

    var titleInput = root.querySelector('[data-pf="title"]');
    if (titleInput) { try { titleInput.focus(); } catch (e) {} }

    root.addEventListener("click", function (e) {
      if (e.target === root) { _closeForm(root); return; }
      var t2 = e.target.closest("[data-proj-form-cancel]");
      if (t2) { _closeForm(root); return; }
      t2 = e.target.closest("[data-proj-form-save]");
      if (t2) { _submitForm(root, pid); return; }
    });
  }

  function _closeForm(root) {
    try { root.classList.remove("open"); } catch (e) {}
    setTimeout(function () { try { root.parentNode.removeChild(root); } catch (e) {} }, 120);
  }

  function _submitForm(root, pid) {
    var q = function (sel) { var el = root.querySelector(sel); return el ? el.value : ""; };
    var form = {
      title: q('[data-pf="title"]'),
      goal: q('[data-pf="goal"]'),
      description: q('[data-pf="description"]'),
      startDate: String(q('[data-pf="startDate"]')).trim(),
      deadline: String(q('[data-pf="deadline"]')).trim(),
      priority: q('[data-pf="priority"]') || "normal",
      status: q('[data-pf="status"]') || "active"
    };
    var errs = _validate(form);
    var errBox = root.querySelector("[data-proj-form-err]");
    if (errs.length) {
      if (errBox) errBox.textContent = errs.join(" — ");
      return;
    }
    if (errBox) errBox.textContent = "";

    var s = _state(); if (!s) return;
    _ensure(s);
    var now = Date.now();
    if (pid) {
      var p = _find(pid);
      if (!p) { _closeForm(root); return; }
      p.title = form.title.trim();
      p.goal = form.goal;
      p.description = form.description;
      p.startDate = form.startDate || null;
      p.deadline = form.deadline || null;
      p.priority = form.priority;
      p.status = form.status;
      p.updatedAt = now;
    } else {
      var b = _b();
      var id = b && b.newId ? b.newId() : ("prj-" + now + "-" + Math.floor(Math.random()*1e6));
      s.projects.push({
        id: id,
        title: form.title.trim(),
        description: form.description,
        goal: form.goal,
        startDate: form.startDate || null,
        deadline: form.deadline || null,
        priority: form.priority,
        status: form.status,
        createdAt: now,
        updatedAt: now
      });
      _detailId = id;
    }
    _save();
    _notify("success", pid ? "پروژه ذخیره شد." : "پروژه ساخته شد.");
    _closeForm(root);
    _rerender();
  }

  P._finSub = _finSub;
  P._finBig = _finBig;
  P.openTab = function (view, tab) {
    if (!view) return;
    if (tab === "finance" || tab === "projects") _tab = tab;
    _detailId = null;
    P.render(view);
  };
  P.openDetail = function (view, pid) {
    if (!view || !pid) return;
    if (!_find(pid)) return;
    _tab = "projects";
    _detailId = pid;
    P.render(view);
  };
  P._progress = function (state, pid) {
    var ts = (state && state.tasks) || [], total = 0, done = 0;
    for (var i=0;i<ts.length;i++) if (ts[i].projectId === pid) { total++; if (ts[i].completed) done++; }
    return { total: total, done: done, pct: total ? Math.round(done*100/total) : null };
  };
  P._validate = _validate;
  P._isDate = _isDate;

  console.log("[projects-ui] loaded v" + P.VERSION);
})();