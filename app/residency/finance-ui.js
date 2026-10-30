/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Finance UI (F.9 / F.9.1b)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[finance-ui] R missing"); return; }
  var F = R.financeUI = R.financeUI || {};
  F.VERSION = "1.2.0";

  /* ─── Bridge ─── */
  function _b() { return window.__ioFinanceBridge; }
  function _state() { var b = _b(); return b ? b.state() : null; }
  function _save() { var b = _b(); if (b && b.save) b.save(); }
  function _notify(l, m) { var b = _b(); if (b && b.notify) { try { b.notify(l, m); return; } catch (e) {} } }
  function _esc(s) { var b = _b(); return b && b.escapeHtml ? b.escapeHtml(s == null ? "" : s) : String(s == null ? "" : s); }
  function _fa(n) { var b = _b(); return b && b.fa1 ? b.fa1(n) : String(n); }
  function _faNum(n) { var b = _b(); return b && b.faNum ? b.faNum(n) : String(n); }
  function _today() { var b = _b(); return b && b.todayJalali ? b.todayJalali() : ""; }
  function _parse(j) { var b = _b(); return b && b.parseJalali ? b.parseJalali(j) : null; }
  function _mlen(jy, jm) { var b = _b(); return b && b.jalaliMonthLength ? b.jalaliMonthLength(jy, jm) : 31; }
  function _newId() { var b = _b(); return b && b.newId ? b.newId() : ("txn-" + Date.now()); }
  function _weekday(jy, jm, jd) { var b = _b(); return b && b.weekdayName ? b.weekdayName(jy, jm, jd) : ""; }
  function _addDays(jy, jm, jd, n) {
    var b = _b();
    if (b && b.addJalaliDays) { try { return b.addJalaliDays(jy, jm, jd, n); } catch (e) {} }
    /* fallback */
    return { jy: jy, jm: jm, jd: jd };
  }
  function _confirm(msg, opts) {
    var b = _b();
    if (b && b.dialogConfirm) { try { return Promise.resolve(b.dialogConfirm(msg, opts)); } catch (e) {} }
    return Promise.resolve(window.confirm(msg));
  }
  function _ensure(s) { var b = _b(); if (b && b.ensure) return b.ensure(s); return null; }

  /* ─── Categories ─── */
  var DEFAULT_CATS = [
    { id: "inc-salary",   label: "حقوق",         kind: "income",  builtin: true, icon: "💼" },
    { id: "inc-project",  label: "درآمد پروژه",  kind: "income",  builtin: true, icon: "🧩" },
    { id: "inc-freelance",label: "فریلنس",       kind: "income",  builtin: true, icon: "💻" },
    { id: "inc-sale",     label: "فروش",         kind: "income",  builtin: true, icon: "🛒" },
    { id: "inc-gift",     label: "هدیه",         kind: "income",  builtin: true, icon: "🎁" },
    { id: "inc-invest",   label: "سرمایه‌گذاری",  kind: "income",  builtin: true, icon: "📈" },
    { id: "inc-refund",   label: "بازگشت وجه",   kind: "income",  builtin: true, icon: "↩️" },
    { id: "inc-other",    label: "سایر درآمد",   kind: "income",  builtin: true, icon: "💰" },
    { id: "exp-food",     label: "خوراک",        kind: "expense", builtin: true, icon: "🍽️" },
    { id: "exp-restaurant",label:"رستوران",      kind: "expense", builtin: true, icon: "🍔" },
    { id: "exp-cafe",     label: "کافه",         kind: "expense", builtin: true, icon: "☕" },
    { id: "exp-grocery",  label: "خرید روزانه",  kind: "expense", builtin: true, icon: "🛍️" },
    { id: "exp-home",     label: "مسکن",         kind: "expense", builtin: true, icon: "🏠" },
    { id: "exp-bills",    label: "قبوض",         kind: "expense", builtin: true, icon: "💡" },
    { id: "exp-trans",    label: "حمل و نقل",    kind: "expense", builtin: true, icon: "🚗" },
    { id: "exp-taxi",     label: "تاکسی",        kind: "expense", builtin: true, icon: "🚕" },
    { id: "exp-fuel",     label: "سوخت",         kind: "expense", builtin: true, icon: "⛽" },
    { id: "exp-health",   label: "سلامت",        kind: "expense", builtin: true, icon: "💊" },
    { id: "exp-doctor",   label: "پزشک",         kind: "expense", builtin: true, icon: "🩺" },
    { id: "exp-edu",      label: "آموزش",        kind: "expense", builtin: true, icon: "📚" },
    { id: "exp-book",     label: "کتاب",         kind: "expense", builtin: true, icon: "📖" },
    { id: "exp-tech",     label: "تکنولوژی",     kind: "expense", builtin: true, icon: "📱" },
    { id: "exp-clothes",  label: "پوشاک",        kind: "expense", builtin: true, icon: "👕" },
    { id: "exp-fun",      label: "تفریح",        kind: "expense", builtin: true, icon: "🎬" },
    { id: "exp-travel",   label: "سفر",          kind: "expense", builtin: true, icon: "✈️" },
    { id: "exp-gym",      label: "ورزش",         kind: "expense", builtin: true, icon: "🏋️" },
    { id: "exp-gift",     label: "هدیه",         kind: "expense", builtin: true, icon: "🎀" },
    { id: "exp-charity",  label: "خیریه",        kind: "expense", builtin: true, icon: "🤲" },
    { id: "exp-project",  label: "هزینه پروژه",  kind: "expense", builtin: true, icon: "🧩" },
    { id: "exp-other",    label: "سایر هزینه",   kind: "expense", builtin: true, icon: "💸" }
  ];
  var CAT_ICONS = ["🍽️","🍔","☕","🛍️","🏠","💡","🚗","🚕","⛽","💊","🩺","📚","📖","📱","👕","🎬","✈️","🏋️","🎀","🤲","🧩","💸","💰","💼","💻","🛒","🎁","📈","↩️","🎓","🎨","🎵","🍕","🥗","🍎","🚌","🚇","🛏️","🧴","🧺","🐾","👶"];

  function _ensureSeeded(s) {
    var f = _ensure(s);
    if (!f) return null;
    if (!f.months || typeof f.months !== "object") f.months = {};
    if (!f.settings || typeof f.settings !== "object") f.settings = {};
    if (typeof f.settings.dailyReminder !== "boolean") f.settings.dailyReminder = false;
    if (typeof f.settings.dailyReminderHour !== "number") f.settings.dailyReminderHour = 20;
    if (typeof f.settings.dismissedDailyDate !== "string") f.settings.dismissedDailyDate = "";

    if (!f.__catSeeded) {
      var have = {};
      for (var i = 0; i < f.categories.length; i++) have[f.categories[i].id] = 1;
      for (var j = 0; j < DEFAULT_CATS.length; j++) {
        if (!have[DEFAULT_CATS[j].id]) f.categories.push(DEFAULT_CATS[j]);
      }
      f.__catSeeded = true;
    }
    return f;
  }

  /* ─── View state ─── */
  var _view = null;
  var _ym = null;
  var _filter = { kind: "all", catId: "", fromDate: "", toDate: "" };
  var _lastSubmitAt = 0;
  var _quickKind = "expense";
  var _barsShift = 0;

  function _initYm() {
    if (_ym) return;
    var t = _parse(_today());
    if (t) _ym = { jy: t.jy, jm: t.jm };
    else _ym = { jy: 1404, jm: 1 };
  }
  function _shiftMonth(delta) {
    if (!_ym) _initYm();
    var m = _ym.jm + delta;
    var y = _ym.jy;
    while (m > 12) { m -= 12; y += 1; }
    while (m < 1) { m += 12; y -= 1; }
    _ym = { jy: y, jm: m };
  }
  function _isInMonth(dateStr, ym) {
    var p = _parse(dateStr);
    if (!p) return false;
    return p.jy === ym.jy && p.jm === ym.jm;
  }
  var MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  function _monthLabel(jy, jm) {
    var name = MONTHS[(jm - 1) % 12] || ("ماه " + jm);
    return name + " " + _fa(jy);
  }
  function _fmtDateLong(dateStr) {
    var p = _parse(dateStr);
    if (!p) return dateStr || "";
    var wd = _weekday(p.jy, p.jm, p.jd) || "";
    var m = MONTHS[(p.jm - 1) % 12] || p.jm;
    return (wd ? wd + " " : "") + _fa(p.jd) + " " + m;
  }
  function _isCurrentMonth(ym) {
    var t = _parse(_today());
    return !!(t && t.jy === ym.jy && t.jm === ym.jm);
  }
  function _isPastMonth(ym) {
    var t = _parse(_today());
    if (!t) return false;
    return (ym.jy * 100 + ym.jm) < (t.jy * 100 + t.jm);
  }
  function _isClosed(ym) {
    var s = _state(); if (!s) return false;
    var f = _ensureSeeded(s);
    var m = f.months[ym.jy + "/" + ym.jm];
    return !!(m && m.status === "closed");
  }

  function _cats(kind) {
    var s = _state(); if (!s) return [];
    var f = _ensureSeeded(s);
    var out = [];
    for (var i = 0; i < f.categories.length; i++) {
      var cat = f.categories[i];
      if (cat.deactivated) continue;
      if (kind && cat.kind !== kind) continue;
      out.push(cat);
    }
    return out;
  }
  function _catById(id) {
    var s = _state(); if (!s) return null;
    var f = _ensureSeeded(s);
    for (var i = 0; i < f.categories.length; i++) if (f.categories[i].id === id) return f.categories[i];
    return null;
  }
  function _txs() {
    var s = _state(); if (!s) return [];
    return _ensureSeeded(s).transactions;
  }

  var _FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function _faDigits(s) {
    return String(s).replace(/[0-9]/g, function (d) { return _FA_DIGITS[+d]; });
  }
  function _amtDigits(s) {
    return String(s == null ? "" : s)
      .replace(/[\u06F0-\u06F9]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x06F0 + 48); })
      .replace(/[\u0660-\u0669]/g, function (d) { return String.fromCharCode(d.charCodeAt(0) - 0x0660 + 48); })
      .replace(/[^0-9]/g, "");
  }
  function _fmtToman(n) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var neg = n < 0; n = Math.round(Math.abs(n));
    var s = String(n), parts = [];
    while (s.length > 3) { parts.unshift(s.slice(-3)); s = s.slice(0, -3); }
    parts.unshift(s);
    return (neg ? "-" : "") + _faDigits(parts.join(","));
  }
  function _signed(kind, amount) {
    var sign = kind === "income" ? "+" : "−";
    return sign + " " + _fmtToman(amount);
  }

  /* ─── Summary ─── */
  function _summary(list) {
    var inc = 0, exp = 0;
    for (var i = 0; i < list.length; i++) {
      var a = (typeof list[i].amount === "number" && isFinite(list[i].amount)) ? list[i].amount : 0;
      if (list[i].kind === "income") inc += a;
      else if (list[i].kind === "expense") exp += a;
    }
    return { income: inc, expense: exp, net: inc - exp };
  }
  function _forecast(list, ym) {
    if (!_isCurrentMonth(ym)) return null;
    var t = _parse(_today());
    if (!t) return null;
    var dim = _mlen(ym.jy, ym.jm);
    if (t.jd <= 0) return null;
    var exp = 0;
    for (var i = 0; i < list.length; i++) if (list[i].kind === "expense" && typeof list[i].amount === "number") exp += list[i].amount;
    if (exp <= 0) return null;
    return Math.round((exp / t.jd) * dim);
  }
  function _budget(ym) {
    var s = _state(); if (!s) return { income: null, expense: null };
    var f = _ensureSeeded(s);
    var v = f.budgets[ym.jy + "/" + ym.jm];
    if (v == null) return { income: null, expense: null };
    if (typeof v === "number") return { income: null, expense: v };
    if (typeof v === "object") return {
      income:  (typeof v.income === "number" && isFinite(v.income)) ? v.income : null,
      expense: (typeof v.expense === "number" && isFinite(v.expense)) ? v.expense : null
    };
    return { income: null, expense: null };
  }
  function _saveBudget(ym, inc, exp) {
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    var key = ym.jy + "/" + ym.jm;
    if (inc == null && exp == null) { delete f.budgets[key]; return; }
    f.budgets[key] = { income: inc, expense: exp };
  }

  /* ─── Render ─── */
  F.render = function (body) {
    if (!body) return;
    _view = body;
    _initYm();
    var f = _ensureSeeded(_state());
    if (!f) { body.innerHTML = '<div class="fin-empty">state در دسترس نیست</div>'; return; }
    var h = [];
    h.push('<div class="fin-wrap">');
    h.push(_monthHeaderHTML());
    var bnr = _prevOpenBannerHTML();
    if (bnr) h.push(bnr);
    h.push(_overviewHTML());
    h.push(_budgetHTML());
    h.push(_quickAddHTML());
    h.push(_filterHTML());
    h.push(_txListHTML());
    h.push(_projectReportHTML());
    h.push(_chartsRowHTML());
    h.push('</div>');
    body.innerHTML = h.join("\n");
    _bind(body);
  };

  function _monthHeaderHTML() {
    var closed = _isClosed(_ym);
    var isCur = _isCurrentMonth(_ym);
    var canClose = !closed && !isCur;
    var h = [];
    h.push('<div class="fin-toolbar">');
    h.push('  <div class="fin-toolbar-left">');
    h.push('    <button class="fin-month-btn" type="button" data-fin-mnav="-1">‹</button>');
    h.push('    <span class="fin-month-label">📅 ' + _esc(_monthLabel(_ym.jy, _ym.jm)) + (closed ? ' <span class="fin-closed-badge">بایگانی‌شده</span>' : '') + '</span>');
    h.push('    <button class="fin-month-btn" type="button" data-fin-mnav="1">›</button>');
    h.push('    <button class="fin-month-btn" type="button" data-fin-today>امروز</button>');
    h.push('  </div>');
    h.push('  <div class="fin-toolbar-right">');
    if (canClose) h.push('    <button class="fin-month-btn" type="button" data-fin-close-month>🗄️ بستن و بایگانی</button>');
    if (closed)    h.push('    <button class="fin-month-btn" type="button" data-fin-reopen-month>↩️ بازکردن مجدد</button>');
    h.push('    <button class="fin-month-btn" type="button" data-fin-archive>📚 آرشیو</button>');
    h.push('    <button class="fin-month-btn" type="button" data-fin-settings>⚙️ تنظیمات</button>');
    h.push('    <button class="btn primary" type="button" data-fin-add>➕ تراکنش جدید</button>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  function _prevOpenBannerHTML() {
    var s = _state(); if (!s) return "";
    var f = _ensureSeeded(s);
    var t = _parse(_today());
    if (!t) return "";
    var openMonths = [];
    var keys = {};
    for (var i = 0; i < f.transactions.length; i++) {
      var p = _parse(f.transactions[i].date);
      if (!p) continue;
      if ((p.jy * 100 + p.jm) < (t.jy * 100 + t.jm)) keys[p.jy + "/" + p.jm] = { jy: p.jy, jm: p.jm };
    }
    for (var bk in f.budgets) {
      if (!Object.prototype.hasOwnProperty.call(f.budgets, bk)) continue;
      var bp = bk.split("/");
      if (bp.length === 2) {
        var by = parseInt(bp[0],10), bm = parseInt(bp[1],10);
        if (isFinite(by) && isFinite(bm) && (by * 100 + bm) < (t.jy * 100 + t.jm)) keys[bk] = { jy: by, jm: bm };
      }
    }
    for (var kk in keys) {
      if (!Object.prototype.hasOwnProperty.call(keys, kk)) continue;
      var m = f.months[kk];
      if (!m || m.status !== "closed") openMonths.push(keys[kk]);
    }
    if (!openMonths.length) return "";
    openMonths.sort(function (a, b) { return (b.jy * 100 + b.jm) - (a.jy * 100 + a.jm); });
    var first = openMonths[0];
    var extra = openMonths.length > 1 ? (" و " + _fa(openMonths.length - 1) + " ماه دیگر") : "";
    return [
      '<div class="fin-prev-open-banner">',
      '  <span>📌 ماه «' + _esc(_monthLabel(first.jy, first.jm)) + '»' + extra + ' هنوز بسته نشده.</span>',
      '  <button class="fin-month-btn" type="button" data-fin-goto-open="' + first.jy + '/' + first.jm + '">مشاهده</button>',
      '</div>'
    ].join("\n");
  }

  function _overviewHTML() {
    var list = _txs().filter(function (t) { return _isInMonth(t.date, _ym); });
    var sum = _summary(list);
    var closed = _isClosed(_ym);
    var isCur = _isCurrentMonth(_ym);
    var fc = (!closed && isCur) ? _forecast(list, _ym) : null;
    var netClass = sum.net < 0 ? " is-net neg" : (sum.net > 0 ? " is-net" : "");
    var netSign = sum.net > 0 ? "+ " : (sum.net < 0 ? "− " : "");
    var netAbs = Math.abs(sum.net);

    var m4Label, m4Value, m4Sub = "", m4Icon = "🔮";
    if (closed) { m4Label = "هزینه نهایی"; m4Value = _fmtToman(sum.expense) + " تومان"; m4Sub = "ماه بسته‌شده"; m4Icon = "🔒"; }
    else if (!isCur) { m4Label = "هزینه ماه گذشته"; m4Value = _fmtToman(sum.expense) + " تومان"; m4Sub = "قابل بستن"; m4Icon = "📦"; }
    else {
      m4Label = "برآورد پایان ماه";
      m4Sub = "بر اساس روند هزینه تا امروز";
      if (fc == null) { m4Value = "—"; m4Sub = "داده کافی نیست"; }
      else { m4Value = _fmtToman(fc) + " تومان"; m4Sub = "برآورد تقریبی"; }
    }

    var h = [];
    h.push('<div class="fin-summary-cards">');
    h.push('  <div class="fin-card is-income">');
    h.push('    <div class="fin-card-icon">💵</div>');
    h.push('    <div class="fin-card-label">درآمد ماه</div>');
    h.push('    <div class="fin-card-value">+ ' + _fmtToman(sum.income) + ' تومان</div>');
    h.push('  </div>');
    h.push('  <div class="fin-card is-expense">');
    h.push('    <div class="fin-card-icon">💸</div>');
    h.push('    <div class="fin-card-label">هزینه ماه</div>');
    h.push('    <div class="fin-card-value">− ' + _fmtToman(sum.expense) + ' تومان</div>');
    h.push('  </div>');
    h.push('  <div class="fin-card' + netClass + '">');
    h.push('    <div class="fin-card-icon">⚖️</div>');
    h.push('    <div class="fin-card-label">خالص جریان مالی</div>');
    h.push('    <div class="fin-card-value">' + netSign + _fmtToman(netAbs) + ' تومان</div>');
    h.push('  </div>');
    h.push('  <div class="fin-card">');
    h.push('    <div class="fin-card-icon">' + m4Icon + '</div>');
    h.push('    <div class="fin-card-label">' + _esc(m4Label) + (m4Icon === "🔮" ? ' <span class="fin-tip" title="برآورد تقریبی هزینه تا پایان ماه&#10;فرمول: (هزینه تا امروز ÷ روزهای سپری‌شده) × کل روزهای ماه">؟</span>' : '') + '</div>');
    h.push('    <div class="fin-card-value">' + m4Value + '</div>');
    if (m4Sub) h.push('    <div class="fin-card-sub">' + _esc(m4Sub) + '</div>');
    if (m4Icon === "🔮" && fc != null) h.push('    <div class="fin-card-hint">بر اساس روند هزینه تا امروز</div>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  function _budgetHTML() {
    var list = _txs().filter(function (t) { return _isInMonth(t.date, _ym); });
    var sum = _summary(list);
    var b = _budget(_ym);
    var hasAny = (b.income != null) || (b.expense != null);
    var h = [];
    h.push('<div class="fin-budget-card">');
    h.push('  <div class="fin-budget-head">');
    h.push('    <strong>🎯 بودجه ماه</strong>');
    h.push('    <button class="btn ghost" type="button" data-fin-setbudget>' + (hasAny ? '✏️ ویرایش' : '➕ تنظیم بودجه') + '</button>');
    h.push('  </div>');

    if (!hasAny) {
      h.push('  <div class="fin-bud-empty">برای این ماه هدف درآمد یا سقف هزینه تعیین نشده است.</div>');
      h.push('</div>');
      return h.join("\n");
    }

    if (b.income != null) {
      var ipRaw = b.income > 0 ? Math.round((sum.income * 100) / b.income) : 0;
      var iPct = Math.min(100, ipRaw);
      var remainI = b.income - sum.income;
      h.push('  <div class="fin-bud-row">');
      h.push('    <div class="fin-bud-head">');
      h.push('      <strong>💚 هدف درآمد</strong>');
      h.push('      <span class="fin-bud-pct">' + _fa(ipRaw) + '٪</span>');
      h.push('    </div>');
      h.push('    <div class="fin-budget-bar accent"><span style="width:' + iPct + '%"></span></div>');
      h.push('    <div class="fin-bud-meta">');
      h.push('      <span>+ ' + _fmtToman(sum.income) + ' از ' + _fmtToman(b.income) + ' تومان</span>');
      if (remainI > 0) h.push('      <span>باقی: ' + _fmtToman(remainI) + '</span>');
      else if (remainI === 0) h.push('      <span style="color:#34d399">🎉 هدف محقق شد</span>');
      else h.push('      <span style="color:#34d399">+ ' + _fmtToman(-remainI) + ' فراتر</span>');
      h.push('    </div>');
      h.push('  </div>');
    }
    if (b.expense != null) {
      var epRaw = b.expense > 0 ? Math.round((sum.expense * 100) / b.expense) : 0;
      var ePct = Math.min(100, epRaw);
      var over = b.expense > 0 && sum.expense > b.expense;
      var remainE = b.expense - sum.expense;
      h.push('  <div class="fin-bud-row">');
      h.push('    <div class="fin-bud-head">');
      h.push('      <strong>🔥 سقف هزینه</strong>');
      h.push('      <span class="fin-bud-pct">' + _fa(epRaw) + '٪</span>');
      h.push('    </div>');
      h.push('    <div class="fin-budget-bar' + (over ? " over" : "") + '"><span style="width:' + ePct + '%"></span></div>');
      h.push('    <div class="fin-bud-meta">');
      h.push('      <span>− ' + _fmtToman(sum.expense) + ' از ' + _fmtToman(b.expense) + ' تومان</span>');
      if (over) h.push('      <span style="color:#f87171">⚠️ اضافه‌خرج: ' + _fmtToman(-remainE) + '</span>');
      else h.push('      <span>باقی: ' + _fmtToman(remainE) + '</span>');
      h.push('    </div>');
      h.push('  </div>');
    }
    h.push('</div>');
    return h.join("\n");
  }

  function _quickAddHTML() {
    var isInc = _quickKind === "income";
    var h = [];
    h.push('<div class="fin-quick">');
    h.push('  <div class="fin-quick-kind">');
    h.push('    <button class="fin-kind-btn' + (isInc ? " is-income" : "") + '" type="button" data-fin-qkind="income">💵 درآمد</button>');
    h.push('    <button class="fin-kind-btn' + (isInc ? "" : " is-expense") + '" type="button" data-fin-qkind="expense">💸 هزینه</button>');
    h.push('  </div>');
    h.push('  <input type="text" inputmode="numeric" class="fin-quick-amt" data-fin-qamt placeholder="مبلغ (تومان)">');
    h.push('  <select class="fin-quick-cat" data-fin-qcat></select>');
    h.push('  <input type="text" class="fin-quick-note" data-fin-qnote placeholder="توضیح (اختیاری)">');
    h.push('  <button class="btn primary fin-quick-save" type="button" data-fin-qsave>✔️ ثبت</button>');
    h.push('</div>');
    return h.join("\n");
  }
  function _fillQuickCats(body) {
    var sel = body.querySelector("[data-fin-qcat]");
    if (!sel) return;
    var cats = _cats(_quickKind);
    var h = ['<option value="">— دسته —</option>'];
    for (var i = 0; i < cats.length; i++) {
      var ic = cats[i].icon || (cats[i].kind === "income" ? "💵" : "💸");
      h.push('<option value="' + _esc(cats[i].id) + '">' + _esc(ic + " " + cats[i].label) + '</option>');
    }
    sel.innerHTML = h.join("");
  }

  function _filterHTML() {
    var h = [];
    h.push('<div class="fin-filter-bar">');
    h.push('  <button class="fin-filter-chip' + (_filter.kind === "all" ? " is-active" : "") + '" data-fin-fkind="all">📋 همه</button>');
    h.push('  <button class="fin-filter-chip' + (_filter.kind === "income" ? " is-active" : "") + '" data-fin-fkind="income">💵 درآمد</button>');
    h.push('  <button class="fin-filter-chip' + (_filter.kind === "expense" ? " is-active" : "") + '" data-fin-fkind="expense">💸 هزینه</button>');
    var cats = _cats(_filter.kind === "all" ? null : _filter.kind);
    h.push('  <select data-fin-fcat class="fin-quick-cat"><option value="">همه دسته‌ها</option>');
    for (var i = 0; i < cats.length; i++) h.push('<option value="' + _esc(cats[i].id) + '"' + (_filter.catId === cats[i].id ? " selected" : "") + '>' + _esc(cats[i].label) + '</option>');
    h.push('  </select>');
    h.push('  <span class="fin-date-filter">');
    h.push('    <span>📅 از:</span>');
    h.push('    <button class="fin-date-filter-btn" type="button" data-fin-from>' + (_filter.fromDate ? _esc(_fmtDateLong(_filter.fromDate)) : "انتخاب") + '</button>');
    h.push('    <span>تا:</span>');
    h.push('    <button class="fin-date-filter-btn" type="button" data-fin-to>' + (_filter.toDate ? _esc(_fmtDateLong(_filter.toDate)) : "انتخاب") + '</button>');
    h.push('  </span>');
    if (_filter.kind !== "all" || _filter.catId || _filter.fromDate || _filter.toDate) h.push('  <button class="fin-filter-chip" data-fin-clear>✕ پاک‌کردن</button>');
    h.push('</div>');
    return h.join("\n");
  }

  function _compareDate(a, b) {
    /* a,b = "YYYY/M/D" — returns -1 if a < b */
    var pa = _parse(a), pb = _parse(b);
    if (!pa || !pb) return 0;
    var na = pa.jy * 10000 + pa.jm * 100 + pa.jd;
    var nb = pb.jy * 10000 + pb.jm * 100 + pb.jd;
    return na < nb ? -1 : (na > nb ? 1 : 0);
  }

  function _filteredList() {
    var list = _txs().filter(function (t) { return _isInMonth(t.date, _ym); });
    if (_filter.kind !== "all") list = list.filter(function (t) { return t.kind === _filter.kind; });
    if (_filter.catId) list = list.filter(function (t) { return t.categoryId === _filter.catId; });
    if (_filter.fromDate) list = list.filter(function (t) { return _compareDate(t.date, _filter.fromDate) >= 0; });
    if (_filter.toDate) list = list.filter(function (t) { return _compareDate(t.date, _filter.toDate) <= 0; });
    list = list.slice();
    /* newest first */
    list.sort(function (a, b) {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
    return list;
  }

  function _txListHTML() {
    var list = _filteredList();
    var hasFilter = (_filter.kind !== "all" || _filter.catId || _filter.fromDate || _filter.toDate);
    var h = [];
    if (!list.length) {
      h.push('<div class="fin-empty">');
      h.push('  <div class="fin-empty-icon">💳</div>');
      if (hasFilter) {
        h.push('  <p>هیچ تراکنشی با فیلترهای انتخابی پیدا نشد.</p>');
        h.push('  <button class="btn ghost" type="button" data-fin-clear>پاک‌کردن فیلترها</button>');
      } else {
        h.push('  <p>' + (_isPastMonth(_ym) ? 'در این ماه تراکنشی ثبت نشده است.' : 'هنوز تراکنشی ثبت نشده. اولین را ثبت کن!') + '</p>');
        h.push('  <button class="btn primary" type="button" data-fin-add>➕ ثبت اولین تراکنش</button>');
      }
      h.push('</div>');
      return h.join("\n");
    }
    h.push('<div class="fin-tx-list">');
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var c = _catById(t.categoryId);
      var catName = t.categoryNameSnapshot || (c ? c.label : "");
      var catIcon = (c && c.icon) || (t.kind === "income" ? "💵" : "💸");
      h.push('<div class="fin-tx ' + (t.kind === "income" ? "is-income" : "is-expense") + '">');
      h.push('  <span class="fin-tx-ic">' + _esc(catIcon) + '</span>');
      h.push('  <div class="fin-tx-amt">' + _signed(t.kind, t.amount) + '</div>');
      h.push('  <div class="fin-tx-main">');
      h.push('    <div class="fin-tx-title">' + _esc(t.note || catName || "—") + '</div>');
      h.push('    <div class="fin-tx-sub">📅 ' + _esc(_fmtDateLong(t.date)) + (catName ? ' • ' + _esc(catName) : '') + '</div>');
      h.push('  </div>');
      h.push('  <div class="fin-tx-actions">');
      h.push('    <button class="fin-tx-btn" type="button" data-fin-edit="' + _esc(t.id) + '" title="ویرایش">✏️</button>');
      h.push('    <button class="fin-tx-btn" type="button" data-fin-del="' + _esc(t.id) + '" title="حذف">🗑️</button>');
      h.push('  </div>');
      h.push('</div>');
    }
    h.push('</div>');
    return h.join("\n");
  }

  function _projectReportHTML() {
    var all = _txs().filter(function (t) { return _isInMonth(t.date, _ym); });
    var map = {};
    for (var i = 0; i < all.length; i++) {
      var t = all[i];
      if (!t.projectId || t.kind !== "income") continue;
      if (!map[t.projectId]) map[t.projectId] = { title: t.projectTitleSnapshot || t.projectId, total: 0 };
      map[t.projectId].total += (typeof t.amount === "number" ? t.amount : 0);
    }
    var keys = Object.keys(map);
    if (!keys.length) return "";
    var h = [];
    h.push('<div class="fin-budget-card">');
    h.push('  <div class="fin-budget-head"><strong>🧩 درآمد پروژه‌ها</strong></div>');
    h.push('  <div class="fin-tx-list">');
    for (var k = 0; k < keys.length; k++) {
      h.push('  <div class="fin-tx is-income">');
      h.push('    <span class="fin-tx-ic">🧩</span>');
      h.push('    <div class="fin-tx-amt">+ ' + _fmtToman(map[keys[k]].total) + '</div>');
      h.push('    <div class="fin-tx-main"><div class="fin-tx-title">📋 ' + _esc(map[keys[k]].title) + '</div></div>');
      h.push('  </div>');
    }
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  /* ─── Bind ─── */
  function _bind(body) {
    _fillQuickCats(body);
    body.onclick = function (e) {
      var el = e.target;
      if (!el || !el.closest) return;
      var t;
      t = el.closest("[data-fin-mnav]");
      if (t) { _shiftMonth(parseInt(t.getAttribute("data-fin-mnav"), 10)); _rerender(); return; }
      t = el.closest("[data-fin-today]");
      if (t) { _ym = null; _barsShift = 0; _initYm(); _rerender(); return; }
      t = el.closest("[data-fin-add]");
      if (t) { _openTxForm(null); return; }
      t = el.closest("[data-fin-edit]");
      if (t) { _openTxForm(t.getAttribute("data-fin-edit")); return; }
      t = el.closest("[data-fin-del]");
      if (t) { _deleteTx(t.getAttribute("data-fin-del")); return; }
      t = el.closest("[data-fin-setbudget]");
      if (t) { _openBudgetForm(); return; }
      t = el.closest("[data-fin-settings]");
      if (t) { _openSettings(); return; }
      t = el.closest("[data-fin-fkind]");
      if (t) { _filter.kind = t.getAttribute("data-fin-fkind"); _filter.catId = ""; _rerender(); return; }
      t = el.closest("[data-fin-clear]");
      if (t) { _filter = { kind: "all", catId: "", fromDate: "", toDate: "" }; _rerender(); return; }
      t = el.closest("[data-fin-qkind]");
      if (t) { _quickKind = t.getAttribute("data-fin-qkind"); _rerender(); return; }
      t = el.closest("[data-fin-qsave]");
      if (t) { _quickSubmit(body); return; }
      t = el.closest("[data-fin-close-month]");
      if (t) { _openCloseMonthFlow(); return; }
      t = el.closest("[data-fin-reopen-month]");
      if (t) { _openReopenMonthFlow(); return; }
      t = el.closest("[data-fin-archive]");
      if (t) { _openArchive(); return; }
      t = el.closest("[data-fin-goto-open]");
      if (t) {
        var pr = String(t.getAttribute("data-fin-goto-open")).split("/");
        if (pr.length === 2) { _ym = { jy: parseInt(pr[0],10), jm: parseInt(pr[1],10) }; _rerender(); }
        return;
      }
      t = el.closest("[data-fin-from]");
      if (t) { _openDateFilter("from"); return; }
      t = el.closest("[data-fin-to]");
      if (t) { _openDateFilter("to"); return; }
      t = el.closest("[data-fin-bars-back]");
      if (t) { _barsShift++; _rerender(); return; }
      t = el.closest("[data-fin-bars-fwd]");
      if (t) { if (_barsShift > 0) { _barsShift--; _rerender(); } return; }
    };
    body.onchange = function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      if (el.getAttribute("data-fin-fcat") !== null) { _filter.catId = el.value || ""; _rerender(); return; }
    };
    var q = body.querySelector("[data-fin-qamt]");
    if (q) {
      q.addEventListener("input", function () { var v = _amtDigits(q.value); q.value = v ? _fmtToman(parseInt(v, 10)) : ""; });
      q.addEventListener("keydown", function (ev) { if (ev.key === "Enter") { ev.preventDefault(); _quickSubmit(body); } });
    }
  }
  function _rerender() { if (_view) F.render(_view); }

  /* ─── Quick submit ─── */
  function _quickSubmit(body) {
    if (Date.now() - _lastSubmitAt < 700) return;
    var kind = _quickKind;
    var amtEl = body.querySelector("[data-fin-qamt]");
    var catEl = body.querySelector("[data-fin-qcat]");
    var noteEl = body.querySelector("[data-fin-qnote]");
    var raw = _amtDigits(amtEl.value);
    var amt = parseInt(raw, 10);
    if (!isFinite(amt) || amt <= 0) { _notify("error", "مبلغ باید عدد صحیح مثبت باشد."); return; }
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    if (_isClosed(_ym)) { _notify("error", "این ماه بسته شده."); return; }
    var cat = catEl.value ? _catById(catEl.value) : null;
    if (cat && cat.kind !== kind) { _notify("error", "دسته با نوع نمی‌خواند."); return; }
    var date = _isCurrentMonth(_ym) ? _today() : (_ym.jy + "/" + _ym.jm + "/1");
    var now = Date.now();
    f.transactions.push({
      id: _newId(), kind: kind, amount: amt, date: date,
      categoryId: cat ? cat.id : null, categoryNameSnapshot: cat ? cat.label : null,
      note: (noteEl && noteEl.value) ? noteEl.value : "",
      projectId: null, projectTitleSnapshot: null,
      createdAt: now, updatedAt: now
    });
    _lastSubmitAt = now;
    _save();
    _notify("success", kind === "income" ? "✅ درآمد ثبت شد." : "✅ هزینه ثبت شد.");
    _rerender();
  }

  /* ─── Full transaction modal ─── */
  function _openTxForm(id) {
    var isEdit = !!id;
    var s = _state(); if (!s) return;
    if (_isClosed(_ym) && !isEdit) { _notify("error", "این ماه بسته شده."); return; }
    var existing = null;
    if (isEdit) {
      var all = _txs();
      for (var i = 0; i < all.length; i++) if (all[i].id === id) { existing = all[i]; break; }
      if (!existing) return;
    }
    var init = {
      kind: existing ? existing.kind : "expense",
      amount: existing ? String(existing.amount) : "",
      date: existing ? existing.date : _today(),
      categoryId: existing ? (existing.categoryId || "") : "",
      note: existing ? (existing.note || "") : ""
    };
    var overlay = document.createElement("div");
    overlay.className = "fin-form-overlay";
    overlay.innerHTML = _txFormHTML(init, isEdit);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    overlay.__kind = init.kind;
    overlay.__date = init.date;
    overlay.__catId = init.categoryId;

    _wireTxForm(overlay, id);
  }

  function _txFormHTML(init, isEdit) {
    var h = [];
    h.push('<div class="fin-form-modal" role="dialog" aria-modal="true">');
    h.push('  <h3>✨ ' + (isEdit ? "ویرایش تراکنش" : "تراکنش جدید") + '</h3>');

    h.push('  <div class="fin-row"><label>🎯 نوع تراکنش</label><div class="fin-kind-row">');
    h.push('    <button type="button" class="fin-kind-btn ' + (init.kind === "income" ? "is-income" : "") + '" data-fx-kind="income">💵 درآمد</button>');
    h.push('    <button type="button" class="fin-kind-btn ' + (init.kind === "expense" ? "is-expense" : "") + '" data-fx-kind="expense">💸 هزینه</button>');
    h.push('  </div></div>');

    h.push('  <div class="fin-row"><label>💰 مبلغ (تومان)</label>');
    h.push('    <input type="text" inputmode="numeric" class="fin-amt-big ' + (init.kind === "income" ? "is-income" : "is-expense") + '" data-fx="amount" value="' + _esc(init.amount) + '" placeholder="0"></div>');

    h.push('  <div class="fin-row"><label>📅 تاریخ</label><div class="fin-date-row">');
    h.push('    <button type="button" class="fin-date-nav" data-fx-daynav="-1">‹</button>');
    h.push('    <button type="button" class="fin-date-btn" data-fx-datebtn>' + _esc(_fmtDateLong(init.date)) + '</button>');
    h.push('    <button type="button" class="fin-date-nav" data-fx-daynav="1">›</button>');
    h.push('  </div>');
    h.push('  <div data-fx-calhost></div>');
    h.push('  </div>');

    h.push('  <div class="fin-row"><label>🏷️ دسته‌بندی</label>');
    h.push('    <div class="fin-cat-grid" data-fx-cathost>' + _catChipsHTML(init.kind, init.categoryId) + '</div>');
    h.push('  </div>');

    h.push('  <div class="fin-row"><label>📝 توضیح (اختیاری)</label><input type="text" data-fx="note" value="' + _esc(init.note) + '"></div>');
    h.push('  <div class="fin-err" data-fx-err></div>');
    h.push('  <div class="fin-actions">');
    h.push('    <button class="btn ghost" type="button" data-fx-cancel>انصراف</button>');
    h.push('    <button class="btn primary" type="button" data-fx-save>' + (isEdit ? "💾 ذخیره" : "✅ ثبت") + '</button>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  function _catChipsHTML(kind, selected) {
    var cats = _cats(kind);
    var h = [];
    h.push('<button type="button" class="fin-cat-chip' + (!selected ? " is-sel" : "") + '" data-fx-cat="">');
    h.push('  <span class="fin-cat-ic">🚫</span>');
    h.push('  <span class="fin-cat-lbl">بدون دسته</span>');
    h.push('</button>');
    for (var i = 0; i < cats.length; i++) {
      var c = cats[i];
      var ic = c.icon || (c.kind === "income" ? "💵" : "💸");
      h.push('<button type="button" class="fin-cat-chip' + (selected === c.id ? " is-sel" : "") + '" data-fx-cat="' + _esc(c.id) + '">');
      h.push('  <span class="fin-cat-ic">' + _esc(ic) + '</span>');
      h.push('  <span class="fin-cat-lbl">' + _esc(c.label) + '</span>');
      h.push('</button>');
    }
    h.push('<button type="button" class="fin-cat-chip fin-cat-add" data-fx-cat-new>');
    h.push('  <span class="fin-cat-ic">➕</span>');
    h.push('  <span class="fin-cat-lbl">جدید</span>');
    h.push('</button>');
    return h.join("");
  }

  function _wireTxForm(overlay, id) {
    var amtEl = overlay.querySelector('[data-fx="amount"]');
    if (amtEl) {
      try { amtEl.focus(); } catch (e) {}
      amtEl.addEventListener("input", function () {
        var v = _amtDigits(amtEl.value);
        amtEl.value = v ? _fmtToman(parseInt(v, 10)) : "";
      });
    }

    overlay.querySelectorAll("[data-fx-kind]").forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.getAttribute("data-fx-kind");
        overlay.__kind = k;
        overlay.querySelectorAll("[data-fx-kind]").forEach(function (b2) {
          b2.classList.remove("is-income"); b2.classList.remove("is-expense");
          if (b2.getAttribute("data-fx-kind") === k) b2.classList.add(k === "income" ? "is-income" : "is-expense");
        });
        if (amtEl) { amtEl.classList.remove("is-income"); amtEl.classList.remove("is-expense"); amtEl.classList.add(k === "income" ? "is-income" : "is-expense"); }
        overlay.__catId = "";
        var host = overlay.querySelector("[data-fx-cathost]");
        if (host) host.innerHTML = _catChipsHTML(k, "");
      });
    });

    var dateBtn = overlay.querySelector("[data-fx-datebtn]");
    if (dateBtn) dateBtn.addEventListener("click", function () { _toggleCal(overlay); });

    overlay.querySelectorAll("[data-fx-daynav]").forEach(function (b) {
      b.addEventListener("click", function () {
        var d = parseInt(b.getAttribute("data-fx-daynav"), 10);
        var p = _parse(overlay.__date) || _parse(_today());
        if (!p) return;
        var nd = _addDays(p.jy, p.jm, p.jd, d);
        overlay.__date = nd.jy + "/" + nd.jm + "/" + nd.jd;
        _refreshDateBtn(overlay);
        _refreshCal(overlay);
      });
    });

    overlay.addEventListener("click", function (e) {
      var el = e.target;
      if (!el || !el.closest) return;
      if (el === overlay) { _closeForm(overlay); return; }
      var t = el.closest("[data-fx-cancel]");
      if (t) { _closeForm(overlay); return; }
      t = el.closest("[data-fx-save]");
      if (t) { _submitTxForm(overlay, id); return; }
      t = el.closest("[data-fx-cat-new]");
      if (t) { _openInlineNewCat(overlay); return; }
      t = el.closest("[data-fx-cat]");
      if (t) {
        overlay.__catId = t.getAttribute("data-fx-cat") || "";
        overlay.querySelectorAll("[data-fx-cat]").forEach(function (x) { x.classList.remove("is-sel"); });
        t.classList.add("is-sel");
        return;
      }
      t = el.closest("[data-cal-nav]");
      if (t) {
        var dir = parseInt(t.getAttribute("data-cal-nav"), 10);
        var p2 = _parse(overlay.__date) || _parse(_today());
        if (!p2) return;
        var m = p2.jm + dir, y = p2.jy;
        while (m > 12) { m -= 12; y++; }
        while (m < 1) { m += 12; y--; }
        overlay.__date = y + "/" + m + "/1";
        _refreshDateBtn(overlay);
        _refreshCal(overlay);
        return;
      }
      t = el.closest("[data-cal-day]");
      if (t) {
        var jd = parseInt(t.getAttribute("data-cal-day"), 10);
        var p3 = _parse(overlay.__date) || _parse(_today());
        if (!p3) return;
        overlay.__date = p3.jy + "/" + p3.jm + "/" + jd;
        _refreshDateBtn(overlay);
        _refreshCal(overlay);
        var host2 = overlay.querySelector("[data-fx-calhost]");
        if (host2) host2.innerHTML = "";
        return;
      }
    });
  }

  function _refreshDateBtn(overlay) {
    var b = overlay.querySelector("[data-fx-datebtn]");
    if (b) b.textContent = _fmtDateLong(overlay.__date);
  }

  function _toggleCal(overlay) {
    var host = overlay.querySelector("[data-fx-calhost]");
    if (!host) return;
    if (host.innerHTML) { host.innerHTML = ""; return; }
    host.innerHTML = _calHTML(overlay.__date);
  }
  function _refreshCal(overlay) {
    var host = overlay.querySelector("[data-fx-calhost]");
    if (!host) return;
    if (!host.innerHTML) return;
    host.innerHTML = _calHTML(overlay.__date);
  }

  function _calHTML(dateStr) {
    var p = _parse(dateStr) || _parse(_today());
    if (!p) return "";
    var dim = _mlen(p.jy, p.jm);
    /* start weekday for jd=1 */
    var wd = _weekday(p.jy, p.jm, 1);
    var names = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
    var startIdx = 0;
    for (var i = 0; i < names.length; i++) if (names[i] === wd) { startIdx = i; break; }
    var t = _parse(_today());
    var isCurrentCalMonth = !!(t && t.jy === p.jy && t.jm === p.jm);
    var h = [];
    h.push('<div class="fin-cal">');
    h.push('  <div class="fin-cal-head">');
    h.push('    <button type="button" data-cal-nav="-1">‹</button>');
    h.push('    <span>' + _esc(_monthLabel(p.jy, p.jm)) + '</span>');
    h.push('    <button type="button" data-cal-nav="1">›</button>');
    h.push('  </div>');
    h.push('  <div class="fin-cal-grid">');
    for (var w = 0; w < 7; w++) h.push('    <div class="fin-cal-wd">' + names[w].slice(0, 2) + '</div>');
    for (var s = 0; s < startIdx; s++) h.push('    <div></div>');
    for (var d = 1; d <= dim; d++) {
      var sel = (d === p.jd) ? " is-sel" : "";
      var today = (isCurrentCalMonth && t && d === t.jd) ? " is-today" : "";
      h.push('    <button type="button" class="fin-cal-day' + sel + today + '" data-cal-day="' + d + '">' + _fa(d) + '</button>');
    }
    h.push('  </div>');
    h.push('</div>');
    return h.join("");
  }

  function _openInlineNewCat(overlay) {
    var overlay2 = document.createElement("div");
    overlay2.className = "fin-form-overlay";
    overlay2.innerHTML = [
      '<div class="fin-form-modal" role="dialog" aria-modal="true" style="width:min(420px,92vw)">',
      '  <h3>➕ دسته‌بندی جدید</h3>',
      '  <div class="fin-row"><label>نام</label><input type="text" data-nc="label" placeholder="مثلاً: قهوه"></div>',
      '  <div class="fin-row"><label>نوع</label><select data-nc="kind">',
      '    <option value="' + (overlay.__kind === "income" ? "income" : "expense") + '" selected>' + (overlay.__kind === "income" ? "درآمد" : "هزینه") + '</option>',
      '  </select></div>',
      '  <div class="fin-row"><label>آیکون</label><div class="fin-cat-grid" data-nc-icons>' + _iconPickerHTML(0) + '</div></div>',
      '  <div class="fin-err" data-nc-err></div>',
      '  <div class="fin-actions">',
      '    <button class="btn ghost" type="button" data-nc-cancel>انصراف</button>',
      '    <button class="btn primary" type="button" data-nc-save>ایجاد</button>',
      '  </div>',
      '</div>'
    ].join("\n");
    document.body.appendChild(overlay2);
    requestAnimationFrame(function () { overlay2.classList.add("open"); });
    var selIcon = 0;
    overlay2.addEventListener("click", function (e) {
      if (e.target === overlay2) { _closeForm(overlay2); return; }
      var t = e.target.closest("[data-nc-cancel]");
      if (t) { _closeForm(overlay2); return; }
      t = e.target.closest("[data-nc-icon]");
      if (t) {
        selIcon = parseInt(t.getAttribute("data-nc-icon"), 10);
        var host = overlay2.querySelector("[data-nc-icons]");
        if (host) host.innerHTML = _iconPickerHTML(selIcon);
        return;
      }
      t = e.target.closest("[data-nc-save]");
      if (t) {
        var label = String(overlay2.querySelector('[data-nc="label"]').value || "").trim();
        var kind = overlay2.querySelector('[data-nc="kind"]').value;
        if (!label) { overlay2.querySelector("[data-nc-err]").textContent = "نام را وارد کن."; return; }
        var s = _state(); if (!s) return;
        var f = _ensureSeeded(s);
        var newId = "cat-" + Date.now() + "-" + Math.floor(Math.random()*1e6);
        f.categories.push({ id: newId, label: label, kind: kind, icon: CAT_ICONS[selIcon] });
        _save();
        _closeForm(overlay2);
        overlay.__catId = newId;
        var host2 = overlay.querySelector("[data-fx-cathost]");
        if (host2) host2.innerHTML = _catChipsHTML(overlay.__kind, newId);
        _notify("success", "دسته اضافه شد.");
      }
    });
  }

  function _iconPickerHTML(sel) {
    var h = [];
    for (var i = 0; i < CAT_ICONS.length; i++) {
      h.push('<button type="button" class="fin-cat-chip' + (i === sel ? " is-sel" : "") + '" data-nc-icon="' + i + '"><span class="fin-cat-ic">' + CAT_ICONS[i] + '</span></button>');
    }
    return h.join("");
  }

  function _closeForm(el) {
    try { el.classList.remove("open"); } catch (e) {}
    setTimeout(function () { try { el.parentNode.removeChild(el); } catch (e) {} }, 120);
  }
  function _validateDate(s) { return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(String(s || "").trim()); }

  function _submitTxForm(overlay, id) {
    var kind = overlay.__kind || "expense";
    var amtEl = overlay.querySelector('[data-fx="amount"]');
    var noteEl = overlay.querySelector('[data-fx="note"]');
    var err = overlay.querySelector("[data-fx-err]");
    var raw = _amtDigits(amtEl.value);
    var amt = parseInt(raw, 10);
    if (!isFinite(amt) || amt <= 0) { err.textContent = "مبلغ باید عدد صحیح مثبت باشد."; return; }
    if (!_validateDate(overlay.__date)) { err.textContent = "تاریخ نامعتبر."; return; }
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    var cat = overlay.__catId ? _catById(overlay.__catId) : null;
    if (cat && cat.kind !== kind) { err.textContent = "دسته با نوع نمی‌خواند."; return; }
    var now = Date.now();
    if (id) {
      var tgt = null;
      for (var i = 0; i < f.transactions.length; i++) if (f.transactions[i].id === id) { tgt = f.transactions[i]; break; }
      if (!tgt) { _closeForm(overlay); return; }
      tgt.kind = kind; tgt.amount = amt; tgt.date = overlay.__date;
      tgt.categoryId = cat ? cat.id : null; tgt.categoryNameSnapshot = cat ? cat.label : null;
      tgt.note = (noteEl && noteEl.value) || "";
      tgt.updatedAt = now;
    } else {
      f.transactions.push({
        id: _newId(), kind: kind, amount: amt, date: overlay.__date,
        categoryId: cat ? cat.id : null, categoryNameSnapshot: cat ? cat.label : null,
        note: (noteEl && noteEl.value) || "",
        projectId: null, projectTitleSnapshot: null,
        createdAt: now, updatedAt: now
      });
    }
    _save();
    _notify("success", id ? "✅ ذخیره شد." : "✅ ثبت شد.");
    _closeForm(overlay);
    _rerender();
  }

  function _deleteTx(id) {
    if (_isClosed(_ym)) { _notify("error", "این ماه بسته شده."); return; }
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    var tgt = null;
    for (var i = 0; i < f.transactions.length; i++) if (f.transactions[i].id === id) { tgt = f.transactions[i]; break; }
    if (!tgt) return;
    _confirm("این تراکنش حذف شود؟", { title: "حذف تراکنش" }).then(function (ok) {
      if (!ok) return;
      f.transactions = f.transactions.filter(function (x) { return x.id !== id; });
      _save();
      _notify("info", "🗑️ حذف شد.");
      _rerender();
    }, function () {});
  }

  /* ─── Date filter popup ─── */
  function _openDateFilter(which) {
    var overlay = document.createElement("div");
    overlay.className = "fin-form-overlay";
    overlay.__date = (which === "from" ? (_filter.fromDate || _today()) : (_filter.toDate || _today()));
    overlay.innerHTML = [
      '<div class="fin-form-modal" role="dialog" aria-modal="true" style="width:min(400px,92vw)">',
      '  <h3>📅 ' + (which === "from" ? "از تاریخ" : "تا تاریخ") + '</h3>',
      '  <div class="fin-date-row">',
      '    <button type="button" class="fin-date-nav" data-df-nav="-1">‹</button>',
      '    <button type="button" class="fin-date-btn" data-df-btn>' + _esc(_fmtDateLong(overlay.__date)) + '</button>',
      '    <button type="button" class="fin-date-nav" data-df-nav="1">›</button>',
      '  </div>',
      '  <div data-df-calhost style="margin-top:8px">' + _calHTMLFilter(overlay.__date) + '</div>',
      '  <div class="fin-actions">',
      '    <button class="btn ghost" type="button" data-df-clear>پاک‌کردن</button>',
      '    <button class="btn ghost" type="button" data-df-cancel>انصراف</button>',
      '    <button class="btn primary" type="button" data-df-save>ذخیره</button>',
      '  </div>',
      '</div>'
    ].join("\n");
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { _closeForm(overlay); return; }
      var t = e.target.closest("[data-df-cancel]");
      if (t) { _closeForm(overlay); return; }
      t = e.target.closest("[data-df-clear]");
      if (t) {
        if (which === "from") _filter.fromDate = ""; else _filter.toDate = "";
        _closeForm(overlay); _rerender(); return;
      }
      t = e.target.closest("[data-df-save]");
      if (t) {
        if (which === "from") _filter.fromDate = overlay.__date; else _filter.toDate = overlay.__date;
        _closeForm(overlay); _rerender(); return;
      }
      t = e.target.closest("[data-df-nav]");
      if (t) {
        var d = parseInt(t.getAttribute("data-df-nav"), 10);
        var p = _parse(overlay.__date) || _parse(_today());
        if (!p) return;
        var nd = _addDays(p.jy, p.jm, p.jd, d);
        overlay.__date = nd.jy + "/" + nd.jm + "/" + nd.jd;
        _refreshFilter(overlay); return;
      }
      t = e.target.closest("[data-df-cal-nav]");
      if (t) {
        var dir = parseInt(t.getAttribute("data-df-cal-nav"), 10);
        var p2 = _parse(overlay.__date) || _parse(_today());
        if (!p2) return;
        var m = p2.jm + dir, y = p2.jy;
        while (m > 12) { m -= 12; y++; }
        while (m < 1) { m += 12; y--; }
        overlay.__date = y + "/" + m + "/1";
        _refreshFilter(overlay); return;
      }
      t = e.target.closest("[data-df-day]");
      if (t) {
        var jd = parseInt(t.getAttribute("data-df-day"), 10);
        var p3 = _parse(overlay.__date) || _parse(_today());
        if (!p3) return;
        overlay.__date = p3.jy + "/" + p3.jm + "/" + jd;
        _refreshFilter(overlay); return;
      }
    });
  }
  function _refreshFilter(overlay) {
    var b = overlay.querySelector("[data-df-btn]");
    if (b) b.textContent = _fmtDateLong(overlay.__date);
    var host = overlay.querySelector("[data-df-calhost]");
    if (host) host.innerHTML = _calHTMLFilter(overlay.__date);
  }
  function _calHTMLFilter(dateStr) {
    var p = _parse(dateStr) || _parse(_today());
    if (!p) return "";
    var dim = _mlen(p.jy, p.jm);
    var wd = _weekday(p.jy, p.jm, 1);
    var names = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
    var startIdx = 0;
    for (var i = 0; i < names.length; i++) if (names[i] === wd) { startIdx = i; break; }
    var h = [];
    h.push('<div class="fin-cal">');
    h.push('  <div class="fin-cal-head">');
    h.push('    <button type="button" data-df-cal-nav="-1">‹</button>');
    h.push('    <span>' + _esc(_monthLabel(p.jy, p.jm)) + '</span>');
    h.push('    <button type="button" data-df-cal-nav="1">›</button>');
    h.push('  </div>');
    h.push('  <div class="fin-cal-grid">');
    for (var w = 0; w < 7; w++) h.push('    <div class="fin-cal-wd">' + names[w].slice(0,2) + '</div>');
    for (var s = 0; s < startIdx; s++) h.push('    <div></div>');
    for (var d = 1; d <= dim; d++) {
      h.push('    <button type="button" class="fin-cal-day' + (d === p.jd ? " is-sel" : "") + '" data-df-day="' + d + '">' + _fa(d) + '</button>');
    }
    h.push('  </div>');
    h.push('</div>');
    return h.join("");
  }

  /* ─── Budget form (dual) ─── */
  function _openBudgetForm() {
    var s = _state(); if (!s) return;
    if (_isClosed(_ym)) { _notify("error", "این ماه بسته شده."); return; }
    var b = _budget(_ym);
    var overlay = document.createElement("div");
    overlay.className = "fin-form-overlay";
    overlay.innerHTML = [
      '<div class="fin-form-modal" role="dialog" aria-modal="true">',
      '  <h3>🎯 بودجه ' + _esc(_monthLabel(_ym.jy, _ym.jm)) + '</h3>',
      '  <div class="fin-row"><label>💚 هدف درآمد (تومان)</label>',
      '    <input type="text" inputmode="numeric" data-fb="income" value="' + (b.income != null ? _esc(_fmtToman(b.income)) : "") + '">',
      '  </div>',
      '  <div class="fin-row"><label>🔥 سقف هزینه (تومان)</label>',
      '    <input type="text" inputmode="numeric" data-fb="expense" value="' + (b.expense != null ? _esc(_fmtToman(b.expense)) : "") + '">',
      '  </div>',
      '  <div class="fin-err" data-fb-err></div>',
      '  <div class="fin-actions">',
      '    <button class="btn ghost" type="button" data-fb-clear>حذف بودجه</button>',
      '    <button class="btn ghost" type="button" data-fb-cancel>انصراف</button>',
      '    <button class="btn primary" type="button" data-fb-save>💾 ذخیره</button>',
      '  </div>',
      '</div>'
    ].join("\n");
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    overlay.querySelectorAll('[data-fb]').forEach(function (inp) {
      inp.addEventListener("input", function () {
        var v = _amtDigits(inp.value);
        inp.value = v ? _fmtToman(parseInt(v, 10)) : "";
      });
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { _closeForm(overlay); return; }
      var t = e.target.closest("[data-fb-cancel]");
      if (t) { _closeForm(overlay); return; }
      t = e.target.closest("[data-fb-clear]");
      if (t) { _saveBudget(_ym, null, null); _save(); _closeForm(overlay); _notify("info", "بودجه حذف شد."); _rerender(); return; }
      t = e.target.closest("[data-fb-save]");
      if (t) {
        function _read(sel) {
          var v = _amtDigits(overlay.querySelector(sel).value);
          if (v === "") return null;
          var n = parseInt(v, 10);
          return (isFinite(n) && n >= 0) ? n : null;
        }
        _saveBudget(_ym, _read('[data-fb="income"]'), _read('[data-fb="expense"]'));
        _save();
        _closeForm(overlay);
        _notify("success", "✅ بودجه ذخیره شد.");
        _rerender();
      }
    });
  }

  /* ─── Settings (category management) ─── */
  function _openSettings() {
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    var overlay = document.createElement("div");
    overlay.className = "fin-form-overlay";
    overlay.innerHTML = _settingsHTML(f);
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    overlay.addEventListener("change", function (e) {
      var el = e.target;
      if (!el || !el.getAttribute) return;
      if (el.getAttribute("data-fs-reminder") !== null) {
        var f2 = _ensureSeeded(_state());
        if (!f2.settings) f2.settings = {};
        f2.settings.dailyReminder = !!el.checked;
        _save();
        _notify(el.checked ? "success" : "info", el.checked ? "🔔 یادآور روزانه فعال شد." : "🔔 یادآور روزانه غیرفعال شد.");
      }
      if (el.getAttribute("data-fs-remhour") !== null) {
        var f3 = _ensureSeeded(_state());
        if (!f3.settings) f3.settings = {};
        var hv = parseInt(el.value, 10);
        if (isFinite(hv) && hv >= 0 && hv <= 23) f3.settings.dailyReminderHour = hv;
        _save();
        _notify("success", "🕒 ساعت یادآور تنظیم شد.");
      }
    });    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { _closeForm(overlay); return; }
      var t = e.target.closest("[data-fs-close]");
      if (t) { _closeForm(overlay); return; }
      t = e.target.closest("[data-fs-cat-del]");
      if (t) {
        var cid = t.getAttribute("data-fs-cat-del");
        var used = f.transactions.some(function (tx) { return tx.categoryId === cid; });
        if (used) {
          var cat = _catById(cid);
          if (cat) { cat.deactivated = true; }
          _save();
          _notify("info", "دسته به‌جای حذف، غیرفعال شد (تراکنش دارد).");
          overlay.innerHTML = _settingsHTML(_ensureSeeded(_state()));
          return;
        }
        var idx = -1;
        for (var i = 0; i < f.categories.length; i++) if (f.categories[i].id === cid) { idx = i; break; }
        if (idx >= 0) { f.categories.splice(idx, 1); _save(); }
        overlay.innerHTML = _settingsHTML(_ensureSeeded(_state()));
        return;
      }
      t = e.target.closest("[data-fs-cat-res]");
      if (t) {
        var cid2 = t.getAttribute("data-fs-cat-res");
        for (var j = 0; j < f.categories.length; j++) if (f.categories[j].id === cid2) { f.categories[j].deactivated = false; break; }
        _save();
        overlay.innerHTML = _settingsHTML(_ensureSeeded(_state()));
        return;
      }
      t = e.target.closest("[data-fs-new]");
      if (t) { _openInlineNewCatStandalone(); return; }
    });
  }
  function _openInlineNewCatStandalone() {
    var dummy = { __kind: "expense" };
    _openInlineNewCat(dummy);
  }
  function _settingsHTML(f) {
    var inc = [], exp = [];
    for (var i = 0; i < f.categories.length; i++) {
      (f.categories[i].kind === "income" ? inc : exp).push(f.categories[i]);
    }
    function _row(c) {
      var used = f.transactions.some(function (tx) { return tx.categoryId === c.id; });
      var d = c.deactivated ? " (غیرفعال)" : "";
      return '<div class="fin-settings-cat ' + (c.kind === "income" ? "is-income" : "is-expense") + '">'
        + '<span class="fin-cat-ic">' + _esc(c.icon || (c.kind === "income" ? "💵" : "💸")) + '</span>'
        + '<span class="fin-cat-name">' + _esc(c.label + d) + '</span>'
        + (c.deactivated
            ? '<button class="fin-tx-btn" type="button" data-fs-cat-res="' + _esc(c.id) + '" title="فعال‌سازی">↩️</button>'
            : '<button class="fin-tx-btn" type="button" data-fs-cat-del="' + _esc(c.id) + '" title="حذف/غیرفعال">🗑️</button>')
        + '</div>';
    }
    var h = [];
    h.push('<div class="fin-form-modal fin-archive-modal" role="dialog" aria-modal="true">');
    h.push('  <h3>⚙️ تنظیمات حسابداری</h3>');
    var _remOn = !!(f.settings && f.settings.dailyReminder);
    var _remHour = (f.settings && typeof f.settings.dailyReminderHour === "number") ? f.settings.dailyReminderHour : 20;
    h.push('  <div class="fin-rem-row">');
    h.push('    <div class="fin-rem-lbl">');
    h.push('      <strong>🔔 یادآور روزانه</strong>');
    h.push('      <div class="fin-rem-sub">اگر امروز تراکنشی ثبت نکرده باشی، در زنگوله یادآوری می‌شود.</div>');
    h.push('    </div>');
    h.push('    <label class="fin-switch">');
    h.push('      <input type="checkbox" data-fs-reminder' + (_remOn ? ' checked' : '') + '>');
    h.push('      <span class="fin-switch-slider"></span>');
    h.push('    </label>');
    h.push('  </div>');
    h.push('  <div class="fin-rem-hours">');
    h.push('    <label>🕒 از ساعت</label>');
    h.push('    <select data-fs-remhour>');
    for (var _hh = 0; _hh < 24; _hh++) {
      h.push('      <option value="' + _hh + '"' + (_hh === _remHour ? ' selected' : '') + '>' + _fa(_hh) + ':۰۰</option>');
    }
    h.push('    </select>');
    h.push('  </div>');
h.push('  <div class="fin-settings-list">');
    h.push('    <div class="fin-settings-group">💚 درآمد</div>');
    for (var a = 0; a < inc.length; a++) h.push(_row(inc[a]));
    h.push('    <div class="fin-settings-group">🔥 هزینه</div>');
    for (var b = 0; b < exp.length; b++) h.push(_row(exp[b]));
    h.push('  </div>');
    h.push('  <div class="fin-actions" style="margin-top:12px">');
    h.push('    <button class="btn primary" type="button" data-fs-close>بستن</button>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  /* ─── Close / Reopen month ─── */
  function _openCloseMonthFlow() {
    if (_isCurrentMonth(_ym)) { _notify("error", "ماه جاری قابل بستن نیست."); return; }
    if (_isClosed(_ym)) { _notify("info", "این ماه قبلاً بسته شده."); return; }
    var list = _txs().filter(function (t) { return _isInMonth(t.date, _ym); });
    var sum = _summary(list);
    var msg = [
      "🗄️ ماه «" + _monthLabel(_ym.jy, _ym.jm) + "» بسته و بایگانی شود؟",
      "",
      "💵 درآمد: + " + _fmtToman(sum.income) + " تومان",
      "💸 هزینه: − " + _fmtToman(sum.expense) + " تومان",
      "⚖️ خالص: " + (sum.net >= 0 ? "+ " : "− ") + _fmtToman(Math.abs(sum.net)) + " تومان",
      "🧾 تعداد تراکنش: " + _faNum(list.length),
      "",
      "با بستن ماه، اطلاعات مالی حذف نمی‌شود. ماه به آرشیو منتقل می‌شود و برای ویرایش باید دوباره باز شود."
    ].join("\n");
    _confirm(msg, { title: "بستن ماه" }).then(function (ok) {
      if (!ok) return;
      var s = _state(); if (!s) return;
      var f = _ensureSeeded(s);
      f.months[_ym.jy + "/" + _ym.jm] = { status: "closed", closedAt: Date.now() };
      _save();
      _notify("success", "🗄️ ماه بسته شد.");
      _rerender();
    }, function () {});
  }
  function _openReopenMonthFlow() {
    var msg = "↩️ ماه «" + _monthLabel(_ym.jy, _ym.jm) + "» دوباره باز شود؟\n\nبرای ویرایش تراکنش‌ها نیاز است. گزارش‌ها پس از ویرایش بازمحاسبه می‌شوند.";
    _confirm(msg, { title: "بازکردن ماه" }).then(function (ok) {
      if (!ok) return;
      var s = _state(); if (!s) return;
      var f = _ensureSeeded(s);
      var key = _ym.jy + "/" + _ym.jm;
      if (f.months[key]) delete f.months[key];
      _save();
      _notify("success", "ماه باز شد.");
      _rerender();
    }, function () {});
  }

  /* ─── Archive ─── */
  function _openArchive() {
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    var keys = {};
    for (var i = 0; i < f.transactions.length; i++) {
      var p = _parse(f.transactions[i].date);
      if (!p) continue;
      keys[p.jy + "/" + p.jm] = { jy: p.jy, jm: p.jm };
    }
    for (var bk in f.budgets) {
      if (!Object.prototype.hasOwnProperty.call(f.budgets, bk)) continue;
      var bp = bk.split("/");
      if (bp.length === 2) {
        var by = parseInt(bp[0],10), bm = parseInt(bp[1],10);
        if (isFinite(by) && isFinite(bm)) keys[bk] = { jy: by, jm: bm };
      }
    }
    for (var mk in f.months) {
      if (!Object.prototype.hasOwnProperty.call(f.months, mk)) continue;
      var mp = mk.split("/");
      if (mp.length === 2) {
        var my = parseInt(mp[0],10), mm = parseInt(mp[1],10);
        if (isFinite(my) && isFinite(mm)) keys[mk] = { jy: my, jm: mm };
      }
    }
    var list = Object.keys(keys).map(function (k) { return keys[k]; });
    list.sort(function (a, b) { return (b.jy * 100 + b.jm) - (a.jy * 100 + a.jm); });

    var h = [];
    h.push('<div class="fin-form-modal fin-archive-modal" role="dialog" aria-modal="true">');
    h.push('  <h3>📚 آرشیو ماه‌ها</h3>');
    if (!list.length) {
      h.push('  <div class="fin-empty"><p>هنوز ماهی با داده مالی وجود ندارد.</p></div>');
    } else {
      h.push('  <div class="fin-archive-list">');
      for (var j = 0; j < list.length; j++) {
        var ym = list[j];
        var txs = f.transactions.filter(function (t) { return _isInMonth(t.date, ym); });
        var sum = _summary(txs);
        var meta = f.months[ym.jy + "/" + ym.jm];
        var closed = !!(meta && meta.status === "closed");
        h.push('  <div class="fin-archive-item" data-fin-archgoto="' + ym.jy + "/" + ym.jm + '">');
        h.push('    <div class="fin-archive-title">📅 ' + _esc(_monthLabel(ym.jy, ym.jm)) + ' ' + (closed ? '<span class="fin-closed-badge">بایگانی‌شده</span>' : '<span class="fin-open-badge">باز</span>') + '</div>');
        h.push('    <div class="fin-archive-stats">');
        h.push('      <span style="color:#34d399">+ ' + _fmtToman(sum.income) + '</span>');
        h.push('      <span style="color:#f87171">− ' + _fmtToman(sum.expense) + '</span>');
        h.push('      <span>⚖️ ' + (sum.net >= 0 ? "+ " : "− ") + _fmtToman(Math.abs(sum.net)) + '</span>');
        h.push('    </div>');
        h.push('  </div>');
      }
      h.push('  </div>');
    }
    h.push('  <div class="fin-actions">');
    h.push('    <button class="btn ghost" type="button" data-fa-close>بستن</button>');
    h.push('  </div>');
    h.push('</div>');

    var overlay = document.createElement("div");
    overlay.className = "fin-form-overlay";
    overlay.innerHTML = h.join("\n");
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) { _closeForm(overlay); return; }
      var t = e.target.closest("[data-fa-close]");
      if (t) { _closeForm(overlay); return; }
      t = e.target.closest("[data-fin-archgoto]");
      if (t) {
        var pr = String(t.getAttribute("data-fin-archgoto")).split("/");
        if (pr.length === 2) {
          _ym = { jy: parseInt(pr[0],10), jm: parseInt(pr[1],10) };
          _closeForm(overlay);
          _rerender();
        }
      }
    });
  }

  /* ─── Charts ─── */
  var _CAT_PALETTE = [
    "#ef4444", "#f97316", "#f59e0b", "#eab308", "#84cc16", "#22c55e",
    "#10b981", "#14b8a6", "#06b6d4", "#0ea5e9", "#3b82f6", "#6366f1",
    "#8b5cf6", "#a855f7", "#d946ef", "#ec4899", "#f43f5e", "#fb7185",
    "#fbbf24", "#a3e635", "#4ade80", "#2dd4bf", "#38bdf8", "#818cf8",
    "#c084fc", "#e879f9", "#facc15", "#fcd34d", "#67e8f9", "#bae6fd",
    "#78716c", "#1d4ed8"
  ];
  function _catColor(id) {
    if (!id) return "#94a3b8";
    var h = 0;
    for (var i = 0; i < id.length; i++) { h = (h * 31 + id.charCodeAt(i)) | 0; }
    return _CAT_PALETTE[Math.abs(h) % _CAT_PALETTE.length];
  }

  function _chartsRowHTML() {
    return [
      '<div class="fin-charts-row">',
      _donutsHTML(),
      _barsHTML(),
      '</div>'
    ].join("\n");
  }

  function _buildDonutData(kind) {
    var list = _txs().filter(function (t) { return _isInMonth(t.date, _ym) && t.kind === kind; });
    var groups = {};
    var total = 0;
    for (var i = 0; i < list.length; i++) {
      var t = list[i];
      var catId = t.categoryId || "__none__";
      var c = t.categoryId ? _catById(t.categoryId) : null;
      var label = t.categoryNameSnapshot || (c ? c.label : "بدون دسته");
      var icon = (c && c.icon) || (kind === "income" ? "💵" : "💸");
      if (!groups[catId]) groups[catId] = { id: catId, label: label, icon: icon, total: 0 };
      var a = (typeof t.amount === "number" && isFinite(t.amount)) ? t.amount : 0;
      groups[catId].total += a;
      total += a;
    }
    var keys = Object.keys(groups);
    keys.sort(function (a, b) { return groups[b].total - groups[a].total; });
    var items = [];
    var others = 0;
    for (var k = 0; k < keys.length; k++) {
      if (k < 8) items.push(groups[keys[k]]);
      else others += groups[keys[k]].total;
    }
    if (others > 0) items.push({ id: "__other__", label: "سایر", icon: "…", total: others });
    return { items: items, total: total };
  }

  function _donutSVG(items, total, cx, cy, r, th) {
    var circ = 2 * Math.PI * r;
    var svg = '<svg viewBox="0 0 ' + (cx * 2) + ' ' + (cy * 2) + '" class="fin-donut-svg">';
    svg += '<circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="' + th + '"/>';
    var acc = 0;
    for (var i = 0; i < items.length; i++) {
      var pct = items[i].total / total;
      var dash = pct * circ;
      var dashAdj = Math.max(0, dash - 3);
      var gapAdj = circ - dashAdj;
      var col = _catColor(items[i].id === "__none__" ? "" : items[i].id);
      svg += '<circle class="fin-donut-seg" cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="' + col + '" stroke-width="' + th + '" stroke-dasharray="' + dashAdj.toFixed(2) + ' ' + gapAdj.toFixed(2) + '" stroke-dashoffset="' + (-acc).toFixed(2) + '" stroke-linecap="butt">';
      svg += '<title>' + _esc(items[i].label) + ' — ' + _fmtToman(items[i].total) + ' تومان (' + Math.round(pct * 100) + '٪)</title>';
      svg += '</circle>';
      acc += dash;
    }
    svg += '</svg>';
    return svg;
  }

  function _donutBlockHTML(kind, data) {
    var label = kind === "income" ? "💵 درآمد" : "💸 هزینه";
    var sign = kind === "income" ? "+" : "−";
    var h = [];
    h.push('  <div class="fin-donut-block">');
    h.push('    <div class="fin-donut-block-h">' + label + '</div>');
    if (data.total <= 0) {
      h.push('    <div class="fin-chart-empty">داده‌ای نیست.</div>');
    } else {
      h.push('    <div class="fin-donut-wrap">');
      h.push('      ' + _donutSVG(data.items, data.total, 90, 90, 62, 22));
      h.push('      <div class="fin-donut-center">');
      h.push('        <div class="fin-donut-total ' + (kind === "income" ? "is-income" : "is-expense") + '">' + sign + ' ' + _fmtToman(data.total) + '</div>');
      h.push('        <div class="fin-donut-sub">تومان</div>');
      h.push('      </div>');
      h.push('    </div>');
      h.push('    <div class="fin-donut-legend">');
      for (var i = 0; i < data.items.length; i++) {
        var pp = Math.round((data.items[i].total / data.total) * 100);
        var col = _catColor(data.items[i].id === "__none__" ? "" : data.items[i].id);
        h.push('      <div class="fin-legend-row">');
        h.push('        <span class="fin-legend-dot" style="background:' + col + '"></span>');
        h.push('        <span class="fin-legend-ic">' + _esc(data.items[i].icon) + '</span>');
        h.push('        <span class="fin-legend-lbl">' + _esc(data.items[i].label) + '</span>');
        h.push('        <span class="fin-legend-val ' + (kind === "income" ? "is-income" : "is-expense") + '">' + sign + ' ' + _fmtToman(data.items[i].total) + '</span>');
        h.push('        <span class="fin-legend-pct">' + _fa(pp) + '٪</span>');
        h.push('      </div>');
      }
      h.push('    </div>');
    }
    h.push('  </div>');
    return h.join("\n");
  }

  function _donutsHTML() {
    var exp = _buildDonutData("expense");
    var inc = _buildDonutData("income");
    var h = [];
    h.push('<div class="fin-chart-card fin-chart-donuts">');
    h.push('  <div class="fin-chart-title">🍩 ترکیب مالی</div>');
    h.push('  <div class="fin-donuts-grid">');
    h.push(_donutBlockHTML("expense", exp));
    h.push(_donutBlockHTML("income", inc));
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }

  function _barsHTML() {
    var cur = { jy: _ym.jy, jm: _ym.jm };
    for (var sh = 0; sh < _barsShift; sh++) {
      cur.jm--;
      if (cur.jm < 1) { cur.jm += 12; cur.jy--; }
    }
    var months = [];
    for (var i = 5; i >= 0; i--) {
      var m = cur.jm - i;
      var y = cur.jy;
      while (m < 1) { m += 12; y -= 1; }
      while (m > 12) { m -= 12; y += 1; }
      months.push({ jy: y, jm: m });
    }
    var data = [];
    var maxV = 0;
    for (var j = 0; j < months.length; j++) {
      var ym = months[j];
      var sum = _summary(_txs().filter(function (t) { return _isInMonth(t.date, ym); }));
      if (sum.income > maxV) maxV = sum.income;
      if (sum.expense > maxV) maxV = sum.expense;
      data.push({ ym: ym, income: sum.income, expense: sum.expense });
    }
    var h = [];
    h.push('<div class="fin-chart-card">');
    h.push('  <div class="fin-chart-title">');
    h.push('    <span>📊 درآمد و هزینه ۶ ماه</span>');
    h.push('    <span class="fin-bars-nav">');
    h.push('      <button type="button" class="fin-bars-nav-btn" data-fin-bars-back title="عقب‌تر">‹</button>');
    if (_barsShift > 0) h.push('      <button type="button" class="fin-bars-nav-btn" data-fin-bars-fwd title="جلوتر">›</button>');
    h.push('      <span class="fin-bars-range">' + _esc(_monthLabel(months[0].jy, months[0].jm)) + ' – ' + _esc(_monthLabel(months[5].jy, months[5].jm)) + '</span>');
    h.push('    </span>');
    h.push('  </div>');
    if (maxV <= 0) {
      h.push('  <div class="fin-chart-empty">در این بازه داده‌ای نیست.</div>');
      h.push('</div>');
      return h.join("\n");
    }
    var W = 680, H = 250, PX = 30, PY = 30;
    var innerW = W - PX * 2;
    var innerH = H - PY * 2;
    var groupW = innerW / data.length;
    var barW = Math.min(24, groupW * 0.32);
    var svg = '<svg viewBox="0 0 ' + W + ' ' + H + '" class="fin-bars-svg">';
    svg += '<defs>';
    svg += '<linearGradient id="finBarInc" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#34d399"/><stop offset="100%" stop-color="#10b981"/></linearGradient>';
    svg += '<linearGradient id="finBarExp" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#f87171"/><stop offset="100%" stop-color="#dc2626"/></linearGradient>';
    svg += '</defs>';
    var steps = 4;
    for (var g = 0; g <= steps; g++) {
      var gy = PY + (innerH / steps) * g;
      svg += '<line x1="' + PX + '" y1="' + gy.toFixed(1) + '" x2="' + (W - PX) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(255,255,255,.05)" stroke-width="1"/>';
    }
    svg += '<line x1="' + PX + '" y1="' + (H - PY) + '" x2="' + (W - PX) + '" y2="' + (H - PY) + '" stroke="rgba(255,255,255,.15)" stroke-width="1"/>';
    var FULL = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
    for (var b = 0; b < data.length; b++) {
      var gx = PX + b * groupW + groupW / 2;
      var incH = (data[b].income / maxV) * innerH;
      var expH = (data[b].expense / maxV) * innerH;
      var incX = gx - barW - 2;
      var expX = gx + 2;
      svg += '<rect class="fin-bar" x="' + incX.toFixed(1) + '" y="' + (H - PY - incH).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(0, incH).toFixed(1) + '" rx="3" fill="url(#finBarInc)">';
      svg += '<title>درآمد ' + _esc(_monthLabel(data[b].ym.jy, data[b].ym.jm)) + ' — ' + _fmtToman(data[b].income) + ' تومان</title>';
      svg += '</rect>';
      svg += '<rect class="fin-bar" x="' + expX.toFixed(1) + '" y="' + (H - PY - expH).toFixed(1) + '" width="' + barW.toFixed(1) + '" height="' + Math.max(0, expH).toFixed(1) + '" rx="3" fill="url(#finBarExp)">';
      svg += '<title>هزینه ' + _esc(_monthLabel(data[b].ym.jy, data[b].ym.jm)) + ' — ' + _fmtToman(data[b].expense) + ' تومان</title>';
      svg += '</rect>';
      svg += '<text x="' + gx.toFixed(1) + '" y="' + (H - PY + 18) + '" text-anchor="middle" font-size="11" fill="rgba(255,255,255,.7)">' + FULL[(data[b].ym.jm - 1) % 12] + '</text>';
    }
    svg += '</svg>';
    h.push('  <div class="fin-bars-wrap">' + svg + '</div>');
    h.push('  <div class="fin-bars-legend">');
    h.push('    <span class="fin-legend-row-inline"><span class="fin-legend-dot" style="background:#34d399"></span>درآمد</span>');
    h.push('    <span class="fin-legend-row-inline"><span class="fin-legend-dot" style="background:#f87171"></span>هزینه</span>');
    h.push('  </div>');
    h.push('</div>');
    return h.join("\n");
  }
  /* ─── Daily reminder (owner-directed, Edris) ─── */
  function _isDailyReminderOn() {
    var s = _state(); if (!s) return false;
    var f = _ensureSeeded(s);
    return !!(f && f.settings && f.settings.dailyReminder);
  }
  function _getReminderHour() {
    var s = _state(); if (!s) return 20;
    var f = _ensureSeeded(s);
    var h = (f && f.settings && typeof f.settings.dailyReminderHour === "number") ? f.settings.dailyReminderHour : 20;
    if (h < 0) h = 0; if (h > 23) h = 23;
    return h;
  }
  function _isReminderWindowActive() {
    var start = _getReminderHour();
    var end = (start + 6) % 24;
    var nowH = (new Date()).getHours();
    if (start < end) return nowH >= start && nowH < end;
    return nowH >= start || nowH < end;
  }
  function _hasTxnToday() {
    var s = _state(); if (!s) return false;
    var f = _ensureSeeded(s);
    var t = _today();
    if (!t) return false;
    for (var i = 0; i < f.transactions.length; i++) {
      if (f.transactions[i].date === t) return true;
    }
    return false;
  }
  function _isDismissedToday() {
    var s = _state(); if (!s) return false;
    var f = _ensureSeeded(s);
    var d = (f && f.settings && f.settings.dismissedDailyDate) || "";
    return d === _today();
  }
  function _dismissDailyReminder() {
    var s = _state(); if (!s) return;
    var f = _ensureSeeded(s);
    if (!f.settings) f.settings = {};
    f.settings.dismissedDailyDate = _today();
    _save();
    _notify("info", "🔕 برای امروز نشان داده نمی‌شود.");
  }
  /* ─── Exposed helpers ─── */
  F._summary = _summary;
  F._forecast = _forecast;
  F._fmtToman = _fmtToman;
  F._fmtDateLong = _fmtDateLong;
  F._isInMonth = _isInMonth;
  F._monthLabel = _monthLabel;
  F._validateDate = _validateDate;
  F._budget = _budget;
  F._saveBudget = _saveBudget;
  F._isClosed = _isClosed;
  F.DEFAULT_CATS = DEFAULT_CATS;
  F.formatToman = _fmtToman;
  F.isDailyReminderOn = _isDailyReminderOn;
  F.getReminderHour = _getReminderHour;
  F.isReminderWindowActive = _isReminderWindowActive;
  F.hasTxnToday = _hasTxnToday;
  F.isDismissedToday = _isDismissedToday;
  F.dismissDailyReminder = _dismissDailyReminder;
  F._faDigits = _faDigits;
  F.CAT_ICONS = CAT_ICONS;

  console.log("[finance-ui] loaded v" + F.VERSION);
})();