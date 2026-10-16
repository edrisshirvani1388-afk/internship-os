/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Managers v19
   فرم‌های ساخت/ویرایش/حذف برای برنامه، موضوع، کتاب، دوره، اتصال
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.managers.v19] R missing"); return; }
  var MGR = R.residencyManagers = R.residencyManagers || {};
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  function _notify(level, msg, opts) {
    try {
      var N = window.InternshipResidency && window.InternshipResidency.notify;
      if (N && typeof N[level] === "function") { N[level](msg, opts); return; }
    } catch (e) {}
    try { if (window.InternshipLib && window.InternshipLib.toast) window.InternshipLib.toast(msg, level === "error" ? "error" : ""); }
    catch (e2) { console.warn("[notify fallback]", msg); }
  }
  function _save() { if (window.__os && window.__os.saveState) { try { window.__os.saveState(); } catch (e) {} } }
  function _render() { if (window.__os && window.__os.render) window.__os.render(); }

  var _overlay = null;
  var _kind = null;
  var _editId = null;

  /* ─── helper برای ساخت modal ─── */
  function _openModal(kind, editId) {
    if (_overlay) _overlay.remove();
    _kind = kind;
    _editId = editId || null;
    _overlay = document.createElement("div");
    _overlay.className = "r19-modal-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    _renderModal();
  }

  function _closeModal() {
    if (!_overlay) return;
    _overlay.classList.remove("is-open");
    setTimeout(function () {
      if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
      _kind = null;
      _editId = null;
    }, 200);
  }

  function _renderModal() {
    if (!_overlay) return;
    var title = "";
    var body = "";
    var kind = _kind;

    if (kind === "plan") {
      title = _editId ? "ویرایش برنامه" : "افزودن برنامه";
      body = _renderPlanForm();
    } else if (kind === "subject") {
      title = _editId ? "ویرایش موضوع" : "افزودن موضوع";
      body = _renderSubjectForm();
    } else if (kind === "book") {
      title = _editId ? "ویرایش کتاب" : "افزودن کتاب";
      body = _renderBookForm();
    } else if (kind === "round") {
      title = _editId ? "ویرایش دوره" : "افزودن دوره";
      body = _renderRoundForm();
    } else if (kind === "enrollment") {
      title = "مدیریت اتصال‌ها";
      body = _renderEnrollmentManager();
    }

    _overlay.innerHTML =
      '<div class="r19-modal">' +
        '<header class="r19-modal-head">' +
          '<span class="r19-modal-title">' + _esc(title) + '</span>' +
          '<button class="r19-close" type="button" data-r19m-close>✕</button>' +
        '</header>' +
        '<div class="r19-modal-body">' + body + '</div>' +
      '</div>';
    _wireModal();
  }

  /* ─── فرم برنامه ─── */
  function _renderPlanForm() {
    var p = _editId ? R.store.getPlan(_editId) : {};
    p = p || {};
    return '<div class="r19-form">' +
      _formRow("عنوان برنامه", '<input type="text" data-r19m-plan-title value="' + _esc(p.title || "") + '" placeholder="مثال: آزمون دستیاری ۱۴۰۶">') +
      _formRow("تاریخ آزمون (اختیاری)", '<input type="text" data-r19m-plan-examDate value="' + _esc(p.examDate || "") + '" placeholder="1406/3/15">') +
      '<div class="r19-error-box" data-r19m-error style="display:none"></div>' +
      '<div class="r19-modal-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19m-save>' + (_editId ? "💾 ذخیره" : "➕ افزودن") + '</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19m-close>انصراف</button>' +
      '</div>' +
    '</div>';
  }

  /* ─── فرم موضوع ─── */
  function _renderSubjectForm() {
    var s = _editId ? R.store.getSubject(_editId) : {};
    s = s || {};
    return '<div class="r19-form">' +
      _formRow("نام موضوع", '<input type="text" data-r19m-subject-title value="' + _esc(s.title || "") + '" placeholder="مثال: داخلی">') +
      _formRow("نام کوتاه (اختیاری)", '<input type="text" data-r19m-subject-short value="' + _esc(s.shortTitle || "") + '" placeholder="IM">') +
      _formRow("آیکون", '<input type="text" data-r19m-subject-icon value="' + _esc(s.icon || "") + '" placeholder="🫀" style="max-width:80px">') +
      '<div class="r19-error-box" data-r19m-error style="display:none"></div>' +
      '<div class="r19-modal-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19m-save>' + (_editId ? "💾 ذخیره" : "➕ افزودن") + '</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19m-close>انصراف</button>' +
      '</div>' +
    '</div>';
  }

  /* ─── فرم کتاب ─── */
  function _renderBookForm() {
    var b = _editId ? R.store.getBook(_editId) : {};
    b = b || {};
    var subjects = R.store.getSubjects() || [];
    var subjectOpts = subjects.map(function (s) {
      return '<option value="' + _esc(s.id) + '"' + (s.id === b.subjectId ? " selected" : "") + '>' + _esc(s.title) + '</option>';
    }).join("");

    if (subjects.length === 0) {
      return '<div class="r19-warn">اول باید یه موضوع بسازی.</div>' +
        '<div class="r19-modal-actions"><button class="r19-btn" type="button" data-r19m-close>باشه</button></div>';
    }

    return '<div class="r19-form">' +
      _formRow("نام کتاب", '<input type="text" data-r19m-book-title value="' + _esc(b.title || "") + '" placeholder="مثال: هریسون">') +
      _formRow("موضوع", '<select data-r19m-book-subject>' + subjectOpts + '</select>') +
      _formRow("تعداد صفحات", '<input type="number" data-r19m-book-pages value="' + _esc(b.totalPages || "") + '" min="1" placeholder="3500">') +
      _formRow("اولویت", '<select data-r19m-book-priority>' +
        ["low","normal","high"].map(function (p) {
          return '<option value="' + p + '"' + (p === (b.priority || "normal") ? " selected" : "") + '>' + ({low: "کم", normal: "متوسط", high: "بالا"}[p]) + '</option>';
        }).join("") + '</select>') +
      '<div class="r19-error-box" data-r19m-error style="display:none"></div>' +
      '<div class="r19-modal-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19m-save>' + (_editId ? "💾 ذخیره" : "➕ افزودن") + '</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19m-close>انصراف</button>' +
      '</div>' +
    '</div>';
  }

  /* ─── فرم دوره ─── */
  function _renderRoundForm() {
    var r = _editId ? R.store.getRound(_editId) : {};
    r = r || {};
    var s = _state();
    var activePlanId = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
    var rounds = activePlanId ? (R.store.getRoundsForPlan(activePlanId) || []) : [];

    return '<div class="r19-form">' +
      _formRow("نام دوره", '<input type="text" data-r19m-round-title value="' + _esc(r.title || "") + '" placeholder="مثال: R1 - داخلی">') +
      _formRow("تاریخ شروع", '<input type="text" data-r19m-round-start value="' + _esc(r.startDate || "") + '" placeholder="1405/7/1">') +
      _formRow("تاریخ پایان", '<input type="text" data-r19m-round-end value="' + _esc(r.endDate || "") + '" placeholder="1405/9/30">') +
      _formRow("ترتیب", '<input type="number" data-r19m-round-order value="' + _esc(r.order || (rounds.length + 1)) + '" min="1">') +
      _formRow("حالت تخصیص", '<select data-r19m-round-mode>' +
        ["algorithmic","equal","manual"].map(function (m) {
          return '<option value="' + m + '"' + (m === (r.allocationMode || "algorithmic") ? " selected" : "") + '>' +
            ({algorithmic: "الگوریتمی", equal: "برابر", manual: "دستی"}[m]) + '</option>';
        }).join("") + '</select>' +
        '<p class="r19-form-hint">' +
          '<strong>الگوریتمی:</strong> سیستم خودش بر اساس اولویت و ترتیب، زمان مطالعه رو تخصیص می‌ده.<br>' +
          '<strong>برابر:</strong> زمان مطالعه بین همه‌ی کتاب‌ها به‌طور مساوی تقسیم می‌شه.<br>' +
          '<strong>دستی:</strong> خودت درصد سهم هر کتاب رو تعیین می‌کنی.' +
        '</p>') +
      _formRow("سرعت مطالعه (صفحه/ساعت)", '<input type="number" data-r19m-round-speed value="' + _esc(r.studySpeedPagesPerHour || "") + '" min="1" max="200" placeholder="۲۰ (پیش‌فرض)" style="direction:ltr;text-align:start;max-width:140px">' +
        '<p class="r19-form-hint">اگه خالی بذاری، از مقدار پیش‌فرض ۲۰ صفحه/ساعت استفاده می‌شه.</p>') +
      '<div class="r19-tl-warn-compact" data-r19m-round-warn style="display:none">⚠️ با تغییر تاریخ، ترتیب دوره‌ها خودکار اصلاح می‌شه.</div>' +
          'دوره‌های دیگه هم می‌تونن با این بازه هم‌پوشانی پیدا کنن.' +
        '</div>' +
      '</div>' +
      '<div class="r19-error-box" data-r19m-error style="display:none"></div>' +
      (_editId ? ('<div class="r19-lock-row" data-r19m-lock-row><button class="r19-btn r19-btn-ghost" type="button" data-r19m-toggle-lock>' + (r.locked === true ? "🔓 باز کردن قفل" : "🔒 قفل کردن دوره") + '</button><p class="r19-form-hint">قفل = این دوره در بازچینی خودکار جابه‌جا نشه.</p></div>') : '') +
      '<div class="r19-modal-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19m-save>' + (_editId ? "💾 ذخیره" : "➕ افزودن") + '</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19m-close>انصراف</button>' +
      '</div>' +
    '</div>';
  }

  /* ─── مدیر اتصال‌ها ─── */
  function _renderEnrollmentManager() {
    var s = _state();
    var activePlanId = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
    if (!activePlanId) return '<div class="r19-warn">برنامه‌ای فعال نیست.</div>';
    var rounds = R.store.getRoundsForPlan(activePlanId) || [];
    var books = R.store.getBooks() || [];
    var subjects = R.store.getSubjects() || [];

    if (rounds.length === 0 || books.length === 0) {
      return '<div class="r19-warn">نیاز به دوره و کتاب داری.</div>' +
        '<div class="r19-modal-actions"><button class="r19-btn" type="button" data-r19m-close>باشه</button></div>';
    }

    var html = '<div class="r19-enroll-manager">';
    rounds.forEach(function (round) {
      html += '<div class="r19-enroll-round">' +
        '<div class="r19-enroll-round-title">' +
          '<span class="r19-round-dot"></span> ' + _esc(round.title) +
          '<span class="r19-enroll-round-dates">' + _esc(round.startDate || "—") + ' → ' + _esc(round.endDate || "—") + '</span>' +
        '</div>' +
        '<div class="r19-enroll-list">';

      books.forEach(function (book) {
        var subject = subjects.find(function (x) { return x.id === book.subjectId; });
        var enrollment = R.store.getEnrollmentForBookRound(book.id, round.id);
        var mode = enrollment ? enrollment.mode : "none";
        var coverage = enrollment ? enrollment.targetCoveragePercent : 100;

        html += '<div class="r19-enroll-row is-manager">' +
          '<div class="r19-enroll-book-block">' +
            '<span class="r19-enroll-book">' + _esc(book.title) + '</span>' +
            '<span class="r19-enroll-subject">' + _esc(subject ? subject.title : "—") + '</span>' +
          '</div>' +
          '<select class="r19-enroll-mode" data-r19m-enroll-mode="' + _esc(round.id) + '|' + _esc(book.id) + '">' +
            '<option value="none"' + (mode === "none" ? " selected" : "") + '>—</option>' +
            '<option value="included"' + (mode === "included" ? " selected" : "") + '>شامل</option>' +
            '<option value="excluded"' + (mode === "excluded" ? " selected" : "") + '>حذف</option>' +
            '<option value="paused"' + (mode === "paused" ? " selected" : "") + '>توقف</option>' +
            '<option value="optional"' + (mode === "optional" ? " selected" : "") + '>اختیاری</option>' +
            '<option value="review_only"' + (mode === "review_only" ? " selected" : "") + '>فقط مرور</option>' +
          '</select>' +
          '<input type="number" class="r19-enroll-coverage" data-r19m-enroll-cov="' + _esc(round.id) + '|' + _esc(book.id) + '" value="' + _fa(coverage) + '" min="0" max="100" placeholder="100">' +
          '<span class="r19-enroll-pct">٪</span>' +
        '</div>';
      });

      html += '</div></div>';
    });

    html += '</div>' +
      '<div class="r19-modal-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19m-close>✅ تمام</button>' +
      '</div>';
    return html;
  }

  function _formRow(label, inputHtml) {
    return '<div class="r19-form-row">' +
      '<label class="r19-form-label">' + _esc(label) + '</label>' +
      inputHtml +
    '</div>';
  }

  /* ─── wiring ─── */
  function _calCmp(a, b) {
    if (!a || !b) return 0;
    if (LIB && LIB.date && LIB.date.compareJalaliDate) return LIB.date.compareJalaliDate(a, b);
    return 0;
  }
  function _calResolve(v) {
    if (typeof v === "function") { try { return v(); } catch (e) { return null; } }
    return v;
  }
  function _injectCalCSS() {
    if (document.getElementById("r19-cal-minmax-css")) return;
    var st = document.createElement("style");
    st.id = "r19-cal-minmax-css";
    st.textContent = ".r19-cal-cell.is-disabled{opacity:.28;cursor:not-allowed}";
    document.head.appendChild(st);
  }
  function _showRoundCalendar(input, minDate, maxDate) {
    if (!LIB || !LIB.date) return;
    _injectCalCSS();
    var existing = document.querySelector(".r19-cal-popup");
    if (existing) existing.remove();
    var parsed = LIB.date.parseJalali(input.value);
    var now = LIB.date.parseJalali(LIB.date.todayJalaliString());
    if (!now) return;
    var cur = parsed || now;
    var viewJy = cur.jy;
    var viewJm = cur.jm;
    var popup = document.createElement("div");
    popup.className = "r19-cal-popup";
    document.body.appendChild(popup);
    function isDisabled(dateStr) {
      var mn = _calResolve(minDate);
      var mx = _calResolve(maxDate);
      if (mn && _calCmp(dateStr, mn) < 0) return true;
      if (mx && _calCmp(dateStr, mx) > 0) return true;
      return false;
    }
    function render() {
      var monthLen = LIB.date.jalaliMonthLength(viewJy, viewJm);
      var startWd = LIB.date.jalaliMonthStartWeekday(viewJy, viewJm);
      var monthName = LIB.date.JMONTHS ? LIB.date.JMONTHS[viewJm - 1] : String(viewJm);
      var wd = ["ش","ی","د","س","چ","پ","ج"];
      var h = "";
      h += "<div class=\"r19-cal-head\">";
      h += "<button type=\"button\" class=\"r19-cal-nav\" data-cal-prev>‹</button>";
      h += "<div class=\"r19-cal-title\">" + monthName + " " + viewJy + "</div>";
      h += "<button type=\"button\" class=\"r19-cal-nav\" data-cal-next>›</button>";
      h += "</div>";
      h += "<div class=\"r19-cal-weekdays\">";
      wd.forEach(function (x) { h += "<span>" + x + "</span>"; });
      h += "</div>";
      h += "<div class=\"r19-cal-grid\">";
      for (var i = 0; i < startWd; i++) h += "<span class=\"r19-cal-cell is-empty\"></span>";
      for (var d = 1; d <= monthLen; d++) {
        var ds = viewJy + "/" + viewJm + "/" + d;
        var dis = isDisabled(ds);
        var isToday = (viewJy === now.jy && viewJm === now.jm && d === now.jd);
        var isSel = parsed && (viewJy === parsed.jy && viewJm === parsed.jm && d === parsed.jd);
        var cls = "r19-cal-cell";
        if (dis) cls += " is-disabled";
        if (isToday) cls += " is-today";
        if (isSel) cls += " is-selected";
        h += "<button type=\"button\" class=\"" + cls + "\" data-cal-day=\"" + d + "\"" + (dis ? " disabled" : "") + ">" + d + "</button>";
      }
      h += "</div>";
      h += "<div class=\"r19-cal-actions\">";
      h += "<button type=\"button\" class=\"r19-cal-action\" data-cal-today>امروز</button>";
      h += "<button type=\"button\" class=\"r19-cal-action\" data-cal-clear>پاک</button>";
      h += "</div>";
      popup.innerHTML = h;
      popup.querySelector("[data-cal-prev]").addEventListener("click", function (e) { e.stopPropagation(); if (viewJm === 1) { viewJm = 12; viewJy--; } else viewJm--; render(); });
      popup.querySelector("[data-cal-next]").addEventListener("click", function (e) { e.stopPropagation(); if (viewJm === 12) { viewJm = 1; viewJy++; } else viewJm++; render(); });
      popup.querySelectorAll("[data-cal-day]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          if (b.disabled) return;
          var d = parseInt(b.getAttribute("data-cal-day"), 10);
          var newDate = viewJy + "/" + viewJm + "/" + d;
          if (isDisabled(newDate)) return;
          input.value = newDate;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          close();
        });
      });
      popup.querySelector("[data-cal-today]").addEventListener("click", function (e) {
        e.stopPropagation();
        var tv = LIB.date.todayJalaliString();
        if (!isDisabled(tv)) {
          input.value = tv;
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
        }
        close();
      });
      popup.querySelector("[data-cal-clear]").addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = "";
        input.dispatchEvent(new Event("input", { bubbles: true }));
        close();
      });
    }
    function close() { popup.remove(); document.removeEventListener("click", outside, true); }
    function outside(e) { if (!popup.contains(e.target) && e.target !== input) close(); }
    render();
    var rect = input.getBoundingClientRect();
    var w = 260;
    var hh = popup.offsetHeight || 320;
    var top = rect.bottom + 6;
    var left = rect.left;
    if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
    if (top + hh > window.innerHeight - 10) top = rect.top - hh - 6;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    popup.style.top = top + "px";
    popup.style.left = left + "px";
    setTimeout(function () { document.addEventListener("click", outside, true); }, 10);
  }
  function _attachRoundDatePicker(input, minDate, maxDate) {
    if (!input) return;
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("autocomplete", "off");
    if (!input.getAttribute("placeholder")) input.setAttribute("placeholder", "1405/7/1");
    input.classList.add("r19-date-input");
    var wrap = input.parentNode;
    if (wrap && !wrap.classList.contains("r19-date-wrap")) {
      var d = document.createElement("div");
      d.className = "r19-date-wrap";
      input.parentNode.insertBefore(d, input);
      d.appendChild(input);
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "r19-date-icon";
      btn.setAttribute("aria-label", "باز کردن تقویم");
      btn.innerHTML = "<svg width=\"16\" height=\"16\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"18\" rx=\"3\"></rect><path d=\"M16 2v4M8 2v4M3 10h18\"></path></svg>";
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        _showRoundCalendar(input, minDate, maxDate);
      });
      d.appendChild(btn);
    }
    input.addEventListener("input", function () {
      var v = input.value.replace(/[^0-9\/]/g, "");
      if (v !== input.value) input.value = v;
    });
  }

  function _wireModal() {
    if (!_overlay) return;

    // Phase 23.1: attach min/max date pickers on round form
    if (_kind === "round") {
      var _dpi = _overlay.querySelector("[data-r19m-round-start]");
      var _dpe = _overlay.querySelector("[data-r19m-round-end]");
      var _s = _state();
      var _pid = _s && _s.residency && _s.residency.meta ? _s.residency.meta.activePlanId : null;
      var _plan = _pid && _s.residency.plans ? _s.residency.plans.find(function (p) { return p && p.id === _pid; }) : null;
      var _exam = _plan ? _plan.examDate : null;
      var _today = LIB && LIB.date ? LIB.date.todayJalaliString() : null;
      var _origR = _editId ? R.store.getRound(_editId) : null;
      var _minStart = (_origR && _origR.startDate) ? _origR.startDate : _today;
      if (_today && _minStart && _calCmp(_today, _minStart) < 0) _minStart = _today;
      if (_dpi) _attachRoundDatePicker(_dpi, _minStart, _exam);
      if (_dpe) _attachRoundDatePicker(_dpe, function () { return _dpi && _dpi.value ? _dpi.value : _minStart; }, _exam);
      if (_editId && _dpi && _dpe) {
        var _resetBtn = document.createElement("button");
        _resetBtn.type = "button";
        _resetBtn.className = "r19-btn r19-btn-ghost";
        _resetBtn.setAttribute("data-r19m-reset-dates", "1");
        _resetBtn.style.margin = "6px 0";
        _resetBtn.textContent = "↺ بازگردانی به تاریخ‌های اصلی";
        var _wrap = _dpe.closest(".r19-form-row") || _dpe.parentNode;
        if (_wrap && _wrap.parentNode) _wrap.parentNode.insertBefore(_resetBtn, _wrap.nextSibling);
        _resetBtn.addEventListener("click", function () {
          var orig = R.store.getRound(_editId);
          if (!orig) return;
          _dpi.value = orig.startDate || "";
          _dpe.value = orig.endDate || "";
          _dpi.dispatchEvent(new Event("input", { bubbles: true }));
          _dpe.dispatchEvent(new Event("input", { bubbles: true }));
          _notify("info", "تاریخ‌ها بازگردانی شد.");
        });
      }
    }
    _overlay.querySelectorAll("[data-r19m-close]").forEach(function (b) {
      b.addEventListener("click", _closeModal);
    });
    _overlay.addEventListener("click", function (e) {
      if (e.target === _overlay) _closeModal();
    });
    _overlay.querySelectorAll("[data-r19m-save]").forEach(function (b) {
      b.addEventListener("click", _onSave);

    _overlay.querySelectorAll("[data-r19m-toggle-lock]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!_editId) return;
        var cur = R.store.getRound(_editId);
        if (!cur) return;
        var newLocked = !(cur.locked === true);
        var res = R.store.applyRounds([{ id: _editId, locked: newLocked }]);
        if (!res || !res.ok) { _notify("error", "خطا در تغییر قفل."); return; }
        _notify("success", newLocked ? "دوره قفل شد." : "قفل دوره باز شد.");
        _save();
        _renderModal();
        if (window.__os && window.__os.render) window.__os.render();
      });
    });
    });

    // ─── B13: هشدار تغییر تاریخ دور ───
    if (_kind === "round" && _editId) {
      var _origRound = R.store.getRound(_editId) || {};
      var _origStart = _origRound.startDate || "";
      var _origEnd = _origRound.endDate || "";
      var _startInp = _overlay.querySelector("[data-r19m-round-start]");
      var _endInp = _overlay.querySelector("[data-r19m-round-end]");
      var _warnBox = _overlay.querySelector("[data-r19m-round-warn]");
      var _checkDates = function () {
        if (!_warnBox) return;
        var nowS = _startInp ? _startInp.value.trim() : "";
        var nowE = _endInp ? _endInp.value.trim() : "";
        var changed = (nowS !== _origStart || nowE !== _origEnd);
        _warnBox.style.display = changed ? "" : "none";
      };
      if (_startInp) _startInp.addEventListener("input", _checkDates);
      if (_endInp) _endInp.addEventListener("input", _checkDates);
    }
    _overlay.querySelectorAll("[data-r19m-enroll-mode]").forEach(function (sel) {
      sel.addEventListener("change", _onEnrollModeChange);
    });
    _overlay.querySelectorAll("[data-r19m-enroll-cov]").forEach(function (inp) {
      inp.addEventListener("change", _onEnrollCovChange);
    });
  }

  function _setError(msg) {
    var el = _overlay ? _overlay.querySelector("[data-r19m-error]") : null;
    if (el) { el.textContent = msg; el.style.display = "block"; return; }
    _notify("error", msg);
  }

  function _onSave() {
    if (!_overlay) return;
    try {
      if (_kind === "plan") _savePlan();
      else if (_kind === "subject") _saveSubject();
      else if (_kind === "book") _saveBook();
      else if (_kind === "round") _saveRound();
    } catch (e) {
      _setError(e.message || String(e));
    }
  }

  function _savePlan() {
    var title = _overlay.querySelector("[data-r19m-plan-title]").value.trim();
    var examDate = _overlay.querySelector("[data-r19m-plan-examDate]").value.trim();
    if (!title) { _setError("عنوان رو وارد کن."); return; }
    var patch = { title: title, examDate: examDate || null };
    var res;
    if (_editId) res = R.store.updatePlan(_editId, patch);
    else res = R.store.addPlan(Object.assign({ status: "active" }, patch));
    if (!res) { _setError("ذخیره ناموفق."); return; }
    _save(); _render(); _closeModal();
  }

  function _saveSubject() {
    var title = _overlay.querySelector("[data-r19m-subject-title]").value.trim();
    var shortTitle = _overlay.querySelector("[data-r19m-subject-short]").value.trim();
    var icon = _overlay.querySelector("[data-r19m-subject-icon]").value.trim();
    if (!title) { _setError("نام رو وارد کن."); return; }
    var patch = { title: title, shortTitle: shortTitle || null, icon: icon || null, sourceType: "custom" };
    var res = _editId ? R.store.updateSubject(_editId, patch) : R.store.addSubject(patch);
    if (!res) { _setError("ذخیره ناموفق."); return; }
    _save(); _render(); _closeModal();
  }

  function _saveBook() {
    var title = _overlay.querySelector("[data-r19m-book-title]").value.trim();
    var subjectId = _overlay.querySelector("[data-r19m-book-subject]").value;
    var totalPages = parseInt(_overlay.querySelector("[data-r19m-book-pages]").value, 10);
    var priority = _overlay.querySelector("[data-r19m-book-priority]").value;
    if (!title) { _setError("نام کتاب رو وارد کن."); return; }
    if (!subjectId) { _setError("موضوع رو انتخاب کن."); return; }
    if (!totalPages || totalPages < 1) { _setError("تعداد صفحات باید بزرگ‌تر از صفر باشه."); return; }
    var patch = { title: title, subjectId: subjectId, totalPages: totalPages, priority: priority };
    var res = _editId ? R.store.updateBook(_editId, patch) : R.store.addBook(patch);
    if (!res) { _setError("ذخیره ناموفق."); return; }
    _save(); _render(); _closeModal();
  }

  function _faInfeasible(reason) {
    var map = {
      "no_exam_boundary": "برای این کار، تاریخ آزمون لازمه.",
      "interval_insufficient_flex": "نمی‌شه این دوره رو تغییر داد — دوره‌های مجاور قفل هستند.",
      "interval_too_small": "بازه‌ی زمانی کافی برای این تعداد دوره وجود نداره.",
      "cannot_remove_enough": "این تغییر با دوره‌های دیگه تداخل داره و فضای کافی برای جبران نیست.",
      "gap_between_locked_anchors": "بین دوره‌های قفل‌شده فاصله هست که با تغییرات حل نمی‌شه.",
      "edit_after_exam": "این دوره بعد از تاریخ آزمون تموم می‌شه.",
      "overlap_with_other_round": "این دوره با دوره‌ی دیگه‌ای هم‌پوشانی داره."
    };
    return map[reason] || "این تغییر قابل اعمال نیست.";
  }

  function _faInvalid(reason) {
    var map = {
      "edit_locked": "این دوره قفله و نمی‌شه تغییرش داد.",
      "duration_below_min": "مدت نمی‌تونه کمتر از یک روز باشه.",
      "round_not_found": "دوره پیدا نشد.",
      "empty_rounds": "دوره‌ای برای تغییر وجود نداره.",
      "locked_overlap": "دو دوره‌ی قفل‌شده هم‌پوشانی دارند.",
      "invalid_date": "تاریخ نامعتبره.",
      "start_after_end": "تاریخ شروع بعد از پایانه.",
      "duplicate_order": "دو دوره ترتیب یکسان دارند.",
      "exam_before_start": "تاریخ آزمون قبل از شروع دوره‌هاست.",
      "locked_before_start": "دوره‌ی قفل‌شده قبل از شروع برنامه‌ست.",
      "locked_after_exam": "دوره‌ی قفل‌شده بعد از آزمون تموم می‌شه."
    };
    return map[reason] || "ورودی نامعتبره.";
  }

  function _openProposalPreview(proposal, meta, editId) {
    if (!proposal || !Array.isArray(proposal.rounds)) { _setError("پیش‌نمایش نامعتبر است."); return; }
    var s = _state();
    if (!s || !s.residency) { _setError("state در دسترس نیست."); return; }
    var planId = meta && meta.planId ? meta.planId : (s.residency.meta && s.residency.meta.activePlanId);
    var currentRounds = (s.residency.rounds || []).filter(function (r) { return r && r.planId === planId; });
    var isCreate = meta && meta.isCreate === true;
    var virtualId = meta && meta.virtualId;
    if (!isCreate && currentRounds.length !== proposal.rounds.length) {
      _setError("تعداد دوره‌ها ناسازگار است. صفحه را دوباره باز کن.");
      return;
    }

    var prevById = {};
    currentRounds.forEach(function (r) { prevById[r.id] = r; });

    var rowsHTML = "";
    proposal.rounds.forEach(function (r) {
      var prev = prevById[r.id];
      var isNewRound = isCreate && r.id === virtualId;
      if (!prev && !isNewRound) return;
      var changed = isNewRound || (prev.startDate !== r.startDate) || (prev.endDate !== r.endDate);
      if (!changed) return;
      var isEdited = isNewRound || (editId && r.id === editId);
      var prevStartStr = prev ? prev.startDate : "—";
      var prevEndStr = prev ? prev.endDate : "—";
      var prevTitle = prev ? (prev.title || ("دوره " + r.order)) : ((meta && meta.title) ? meta.title : ("دوره " + r.order));
      rowsHTML += "<div class=\"r19-proposal-row" + (isEdited ? " is-edited" : "") + "\">";
      rowsHTML += "<div class=\"r19-proposal-name\">" + _esc(prevTitle) + "</div>";
      rowsHTML += "<div class=\"r19-proposal-dates\">";
      rowsHTML += "<span class=\"r19-proposal-before\">" + _esc(prevStartStr) + " → " + _esc(prevEndStr) + "</span>";
      rowsHTML += "<span class=\"r19-proposal-arrow\">←</span>";
      rowsHTML += "<span class=\"r19-proposal-after\">" + _esc(r.startDate) + " → " + _esc(r.endDate) + "</span>";
      rowsHTML += "</div></div>";
    });

    if (!rowsHTML) { _notify("info", "تغییری برای اعمال وجود نداره."); _closeModal(); return; }

    var pop = document.createElement("div");
    pop.className = "r19-modal-overlay";
    var html = "";
    html += "<div class=\"r19-modal\">";
    html += "<header class=\"r19-modal-head\">";
    html += "<span class=\"r19-modal-title\">پیش‌نمایش تغییرات</span>";
    html += "<button class=\"r19-close\" type=\"button\" data-close>✕</button>";
    html += "</header>";
    html += "<div class=\"r19-modal-body\">";
    html += "<div class=\"r19-proposal-list\">" + rowsHTML + "</div>";
    html += "<div class=\"r19-modal-actions\" style=\"margin-top:14px\">";
    html += "<button class=\"r19-btn r19-btn-primary\" type=\"button\" data-apply>اعمال</button>";
    html += "<button class=\"r19-btn r19-btn-ghost\" type=\"button\" data-close>انصراف</button>";
    html += "</div></div></div>";
    pop.innerHTML = html;
    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("is-open"); });

    pop.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { pop.remove(); });
    });
    pop.addEventListener("click", function (e) { if (e.target === pop) pop.remove(); });

    var applyBtn = pop.querySelector("[data-apply]");
    if (applyBtn) applyBtn.addEventListener("click", function () {
      pop.remove();
      _commitProposal(proposal, meta, editId);
    });
  }

  function _cleanupPreviewModals() {
    document.querySelectorAll(".r19-modal-overlay").forEach(function (el) { el.remove(); });
    document.body.style.overflow = "";
  }

  function _commitProposal(proposal, meta, editId) {
    if (!proposal || !Array.isArray(proposal.rounds)) return;

    if (meta && meta.isCreate === true) {
      var virtualId = meta.virtualId;
      var finalNew = null;
      for (var ci = 0; ci < proposal.rounds.length; ci++) { if (proposal.rounds[ci].id === virtualId) { finalNew = proposal.rounds[ci]; break; } }
      if (!finalNew) { _notify("error", "خطا در محاسبه."); return; }

      var created = R.store.addRound({
        planId: meta.planId,
        order: finalNew.order,
        title: meta.title,
        startDate: finalNew.startDate,
        endDate: finalNew.endDate,
        status: "planned",
        allocationMode: meta.mode,
        studySpeedPagesPerHour: meta.speed
      });
      if (!created) { _notify("error", "ذخیره ناموفق."); return; }

      var otherUpdates = [];
      for (var cj = 0; cj < proposal.rounds.length; cj++) {
        var rr = proposal.rounds[cj];
        if (rr.id === virtualId) continue;
        otherUpdates.push({ id: rr.id, startDate: rr.startDate, endDate: rr.endDate, locked: rr.locked === true });
      }
      if (otherUpdates.length > 0) {
        var applied = R.store.applyRounds(otherUpdates);
        if (!applied || !applied.ok) {
          _notify("warning", "دوره اضافه شد ولی جابه‌جایی سایر دوره‌ها کامل نشد. از «بازچینی» استفاده کن.");
          _save(); _render(); _closeModal();
          return;
        }
      }

      try { var RTn = R.replanTrigger; if (RTn && RTn.notifyChange) RTn.notifyChange("round_changed", { id: created.id, sourceType: "round", title: (created.title || meta.title || null), after: { startDate: created.startDate || finalNew.startDate, endDate: created.endDate || finalNew.endDate } }); } catch (e) {}
      _notify("success", "دوره اضافه شد.");
      _save(); _render(); _closeModal();
      return;
    }

    var updates = proposal.rounds.map(function (r) {
      return { id: r.id, startDate: r.startDate, endDate: r.endDate, locked: r.locked === true };
    });
    if (editId) {
      var editUpd = null;
      for (var k = 0; k < updates.length; k++) { if (updates[k].id === editId) { editUpd = updates[k]; break; } }
      if (editUpd && meta) {
        if (meta.title != null) editUpd.title = meta.title;
        if (meta.order != null) editUpd.order = meta.order;
        if (meta.mode != null) editUpd.allocationMode = meta.mode;
        if (meta.planId != null) editUpd.planId = meta.planId;
        if (meta.speed !== undefined) editUpd.studySpeedPagesPerHour = meta.speed;
      }
    }
    var res = R.store.applyRounds(updates);
    if (!res || !res.ok) {
      _notify("error", "خطا در ذخیره تغییرات: " + (res && res.error ? res.error : "نامشخص"));
      return;
    }
    try {
      var RT = R.replanTrigger;
      if (RT && RT.notifyChange) RT.notifyChange("round_changed", { id: editId || null, sourceType: "round", title: (meta && meta.title) ? meta.title : null });
    } catch (e) {}
    _notify("success", "تغییرات اعمال شد.");
    _save(); _render(); _cleanupPreviewModals();
  }

  function _saveRound() {
    var title = _overlay.querySelector("[data-r19m-round-title]").value.trim();
    var startDate = _overlay.querySelector("[data-r19m-round-start]").value.trim();
    var endDate = _overlay.querySelector("[data-r19m-round-end]").value.trim();
    var order = parseInt(_overlay.querySelector("[data-r19m-round-order]").value, 10) || 1;
    var mode = _overlay.querySelector("[data-r19m-round-mode]").value;
    var s = _state();
    var planId = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;

    if (!title) { _setError("نام دوره رو وارد کن."); return; }
    if (!startDate || !endDate) { _setError("تاریخ شروع و پایان اجباریه."); return; }
    if (LIB && LIB.date && LIB.date.parseJalali) {
      if (!LIB.date.parseJalali(startDate)) { _setError("تاریخ شروع نامعتبره."); return; }
      if (!LIB.date.parseJalali(endDate)) { _setError("تاریخ پایان نامعتبره."); return; }
      if (LIB.date.compareJalaliDate(startDate, endDate) > 0) {
        _setError("تاریخ شروع بعد از پایان دوره‌ست."); return;
      }
    }
    var _speedEl = _overlay.querySelector("[data-r19m-round-speed]");
    var _speedVal = _speedEl ? parseInt(_speedEl.value, 10) : NaN;
    var _speedPatch = (!isNaN(_speedVal) && _speedVal > 0) ? _speedVal : null;

    if (_editId) {
      var origR = R.store.getRound(_editId);
      if (!origR) { _setError("دوره پیدا نشد."); return; }
      if (origR.locked === true) { _setError("این دوره قفله و نمی‌شه تغییرش داد."); return; }

      var rounds = (R.store.getRoundsForPlan(planId) || []).slice();
      if (rounds.length === 0) { _setError("دوره‌ای برای ویرایش وجود نداره."); return; }

      var _datesSame = (origR.startDate === startDate && origR.endDate === endDate);
      var _metaChanged = (origR.title !== title) || ((origR.order || 0) !== order) || (origR.allocationMode !== mode) || ((origR.studySpeedPagesPerHour || null) !== (_speedPatch || null));
      if (_datesSame) {
        if (!_metaChanged) { _notify("info", "تغییری اعمال نشد."); _closeModal(); return; }
        var _metaUpd = { id: _editId, title: title, order: order, allocationMode: mode, planId: planId, studySpeedPagesPerHour: _speedPatch };
        var _r0 = R.store.applyRounds([_metaUpd]);
        if (!_r0 || !_r0.ok) { _setError("خطا در ذخیره: " + (_r0 && _r0.error ? _r0.error : "نامشخص")); return; }
        _notify("success", "تغییرات ذخیره شد.");
        _save(); _render(); _closeModal();
        return;
      }

      // Phase 22.7: if startDate changed, route through computeNormalize
      // Phase 23.2: explicit start/end edit allows gaps
      if (origR.startDate !== startDate || origR.endDate !== endDate) {
        var sch2 = R.roundScheduler;
        if (!sch2 || !sch2.computeExplicitEdit) { _setError("موتور زمان‌بندی نسخه‌ی جدید لازمه."); return; }
        var examDateE = _getPlanExamDate(planId);
        var resE = sch2.computeExplicitEdit(rounds, examDateE, {
          roundId: _editId,
          newStartDate: startDate,
          newEndDate: endDate
        });
        if (resE.status === "infeasible") { _setError(_faInfeasible(resE.reason)); return; }
        if (resE.status === "invalid_input") { _setError(_faInvalid(resE.reason)); return; }
        if (resE.status !== "feasible" || !resE.proposal) { _setError("این تغییر قابل اعمال نیست."); return; }
        _openProposalPreview(resE.proposal, {
          title: title, order: order, mode: mode, planId: planId, speed: _speedPatch
        }, _editId);
        return;
      }

      var newDuration = 0;
      if (LIB && LIB.date) {
        var sp = LIB.date.parseJalali(startDate);
        var ep = LIB.date.parseJalali(endDate);
        if (sp && ep) {
          newDuration = LIB.date.jalaliToDayNumber(ep.jy, ep.jm, ep.jd) -
                        LIB.date.jalaliToDayNumber(sp.jy, sp.jm, sp.jd) + 1;
        }
      }
      if (!newDuration || newDuration < 1) { _setError("مدت دوره نامعتبره."); return; }

      var sch = R.roundScheduler;
      if (!sch || !sch.computeEdit) { _setError("موتور زمان‌بندی در دسترس نیست."); return; }

      var res = sch.computeEdit(rounds, examDate, {
        roundId: _editId,
        newDuration: newDuration
      });

      if (res.status === "noop") {
        _notify("info", "برنامه سالم است. تغییری لازم نیست.");
        _closeModal();
        return;
      }
      if (res.status === "infeasible") { _setError(_faInfeasible(res.reason)); return; }
      if (res.status === "invalid_input") { _setError(_faInvalid(res.reason)); return; }
      if (res.status !== "feasible" || !res.proposal) { _setError("این تغییر قابل اعمال نیست."); return; }

      _openProposalPreview(res.proposal, {
        title: title,
        order: order,
        mode: mode,
        planId: planId,
        speed: _speedPatch
      }, _editId);
      return;
    }

    var rounds = (R.store.getRoundsForPlan(planId) || []).slice();
    var examDate = _getPlanExamDate(planId);

    var newDuration = 0;
    if (LIB && LIB.date) {
      var sp = LIB.date.parseJalali(startDate);
      var ep = LIB.date.parseJalali(endDate);
      if (sp && ep) {
        newDuration = LIB.date.jalaliToDayNumber(ep.jy, ep.jm, ep.jd) -
                      LIB.date.jalaliToDayNumber(sp.jy, sp.jm, sp.jd) + 1;
      }
    }
    if (!newDuration || newDuration < 1) { _setError("مدت دوره نامعتبره."); return; }

    var sch = R.roundScheduler;
    if (!sch || !sch.computeNormalize) { _setError("موتور زمان‌بندی در دسترس نیست."); return; }

    var virtualNewId = "__new__" + Date.now().toString(36);
    var existingForCalc = rounds.map(function (r) {
      return { id: r.id, order: r.order, startDate: r.startDate, endDate: r.endDate, locked: r.locked === true };
    });
    var newRoundIntent = { id: virtualNewId, order: order, startDate: startDate, endDate: endDate, locked: false };
    var combined = existingForCalc.concat([newRoundIntent]);

    var res = sch.computeNormalize(combined, examDate);

    if (res.status === "infeasible") { _setError(_faInfeasible(res.reason)); return; }
    if (res.status === "invalid_input") { _setError(_faInvalid(res.reason)); return; }

    var proposal;
    if (res.status === "noop") {
      var synthRounds = combined.map(function (r) {
        var d = 0;
        if (LIB && LIB.date) {
          var ps = LIB.date.parseJalali(r.startDate);
          var pe = LIB.date.parseJalali(r.endDate);
          if (ps && pe) d = LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) - LIB.date.jalaliToDayNumber(ps.jy, ps.jm, ps.jd) + 1;
        }
        return { id: r.id, order: r.order, startDate: r.startDate, endDate: r.endDate, duration: d, locked: r.locked === true };
      });
      proposal = {
        rounds: synthRounds,
        summary: {
          mode: "create",
          editedRoundId: virtualNewId,
          affectedRounds: [virtualNewId],
          unchangedRounds: existingForCalc.map(function (r) { return r.id; })
        }
      };
    } else if (res.status === "feasible") {
      proposal = res.proposal;
      proposal.summary = proposal.summary || {};
      proposal.summary.mode = "create";
      proposal.summary.editedRoundId = virtualNewId;
    } else {
      _setError("این عملیات ممکن نیست.");
      return;
    }

    _openProposalPreview(proposal, {
      isCreate: true,
      virtualId: virtualNewId,
      title: title,
      order: order,
      mode: mode,
      planId: planId,
      speed: _speedPatch
    }, null);
    return;
  }
  function _onEnrollModeChange(e) {
    var parts = e.target.getAttribute("data-r19m-enroll-mode").split("|");
    var roundId = parts[0], bookId = parts[1];
    var mode = e.target.value;
    var existing = R.store.getEnrollmentForBookRound(bookId, roundId);

    if (mode === "none") {
      if (existing) R.store.removeEnrollment(existing.id);
    } else {
      if (existing) {
        R.store.updateEnrollment(existing.id, { mode: mode });
      } else {
        R.store.addEnrollment({
          roundId: roundId, bookId: bookId,
          mode: mode, targetCoveragePercent: 100
        });
      }
    }
    _save();
  }

  function _onEnrollCovChange(e) {
    var parts = e.target.getAttribute("data-r19m-enroll-cov").split("|");
    var roundId = parts[0], bookId = parts[1];
    var cov = parseInt(e.target.value, 10);
    if (isNaN(cov) || cov < 0 || cov > 100) { e.target.value = 100; cov = 100; }
    var existing = R.store.getEnrollmentForBookRound(bookId, roundId);
    if (existing) {
      R.store.updateEnrollment(existing.id, { targetCoveragePercent: cov });
      _save();
    }
  }

  /* ─── B15: توابع کمکی برای مدیریت overlap ─── */
  function _checkOverlaps(planId, excludeRoundId) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return [];
    var rounds = (R.store.getRoundsForPlan(planId) || [])
      .slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var overlaps = [];
    for (var i = 0; i < rounds.length; i++) {
      for (var j = i + 1; j < rounds.length; j++) {
        var a = rounds[i], b = rounds[j];
        if (!a || !b || !a.startDate || !a.endDate || !b.startDate || !b.endDate) continue;
        if (excludeRoundId && (a.id === excludeRoundId || b.id === excludeRoundId)) continue;
        if (LIB.date.compareJalaliDate(a.startDate, b.endDate) <= 0 &&
            LIB.date.compareJalaliDate(b.startDate, a.endDate) <= 0) {
          overlaps.push({ a: a, b: b });
        }
      }
    }
    return overlaps;
  }

  /**
   * بازچینی همه‌ی دوره‌ها به‌ترتیب order، بدون هم‌پوشانی و بدون gap.
   * از دوره‌ی firstRoundId به بعد هم زنجیروار.
   * اگه firstRoundId داده نشه، از اول شروع می‌کنه.
   */
  /* ─── B17: چک examDate + auto-compress ─── */
  function _getPlanExamDate(planId) {
    var s = _state();
    if (!s || !s.residency) return null;
    var plan = (s.residency.plans || []).find(function (p) { return p && p.id === planId; });
    return plan ? (plan.examDate || null) : null;
  }

  function _getLastRoundEnd(planId) {
    var rounds = (R.store.getRoundsForPlan(planId) || [])
      .slice()
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (rounds.length === 0) return null;
    var last = rounds[rounds.length - 1];
    return last.endDate || null;
  }

  function _examOverflow(planId) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return null;
    var examDate = _getPlanExamDate(planId);
    var lastEnd = _getLastRoundEnd(planId);
    if (!examDate || !lastEnd) return null;
    var examP = LIB.date.parseJalali(examDate);
    var lastP = LIB.date.parseJalali(lastEnd);
    if (!examP || !lastP) return null;
    var diff = LIB.date.jalaliToDayNumber(lastP.jy, lastP.jm, lastP.jd) -
               LIB.date.jalaliToDayNumber(examP.jy, examP.jm, examP.jd);
    // B17-fix: bidirectional — positive = overflow, negative = gap, 0 = match
    if (diff === 0) return null;
    return {
      days: diff,
      overflowDays: diff > 0 ? diff : 0,
      gapDays: diff < 0 ? Math.abs(diff) : 0,
      isOverflow: diff > 0,
      isGap: diff < 0,
      examDate: examDate,
      lastEnd: lastEnd
    };
  }

  /**
   * compress همه‌ی دوره‌ها به‌نسبت، تا آخرین دوره با examDate برابر بشه.
   * اول از دوره‌ی اول شروع، همه‌ی مدّت‌ها ضربدر factor می‌شن.
   */
  MGR.examOverflow = _examOverflow;

  MGR.cleanupOrphans = function () {
    var s = _state();
    if (!s || !s.residency) return { removed: 0 };
    var rs = s.residency;
    var removed = 0;

    var validPlanIds = {};
    (rs.plans || []).forEach(function (p) { if (p && p.id) validPlanIds[p.id] = 1; });

    var validRoundIds = {};
    (rs.rounds || []).forEach(function (r) {
      if (r && r.planId && validPlanIds[r.planId]) validRoundIds[r.id] = 1;
    });

    var r0 = (rs.rounds || []).length;
    rs.rounds = (rs.rounds || []).filter(function (r) {
      return r && r.planId && validPlanIds[r.planId];
    });
    removed += (r0 - rs.rounds.length);

    var e0 = (rs.enrollments || []).length;
    rs.enrollments = (rs.enrollments || []).filter(function (e) {
      return e && validRoundIds[e.roundId];
    });
    removed += (e0 - rs.enrollments.length);

    var a0 = (rs.activities || []).length;
    rs.activities = (rs.activities || []).filter(function (a) {
      if (!a) return false;
      if (a.planId && !validPlanIds[a.planId]) return false;
      if (a.roundId && !validRoundIds[a.roundId]) return false;
      return true;
    });
    removed += (a0 - rs.activities.length);

    var validActIds = {};
    (rs.activities || []).forEach(function (a) { if (a && a.id) validActIds[a.id] = 1; });

    if (Array.isArray(rs.assessments)) {
      var as0 = rs.assessments.length;
      rs.assessments = rs.assessments.filter(function (a) {
        if (!a) return false;
        if (a.planId && !validPlanIds[a.planId]) return false;
        if (a.roundId && !validRoundIds[a.roundId]) return false;
        return true;
      });
      removed += (as0 - rs.assessments.length);
    }

    if (Array.isArray(rs.planVersions)) {
      var pv0 = rs.planVersions.length;
      // B19-fix: planVersions بدون planId معتبر باید پاک شن (حتی null)
      rs.planVersions = rs.planVersions.filter(function (pv) {
        if (!pv) return false;
        if (!pv.planId) return false;
        return !!validPlanIds[pv.planId];
      });
      removed += (pv0 - rs.planVersions.length);
    }

    if (Array.isArray(rs.reviewStates)) {
      var rs0 = rs.reviewStates.length;
      rs.reviewStates = rs.reviewStates.filter(function (rst) {
        if (!rst) return false;
        if (rst.roundId && !validRoundIds[rst.roundId]) return false;
        if (rst.planId && !validPlanIds[rst.planId]) return false;
        return true;
      });
      removed += (rs0 - rs.reviewStates.length);
    }

    if (Array.isArray(s.tasks)) {
      var t0 = s.tasks.length;
      s.tasks = s.tasks.filter(function (t) {
        if (!t) return false;
        if (t.sourceType === "residency_activity") {
          if (t.sourceId && !validActIds[t.sourceId]) return false;
          if (t.residencyActivityId && !validActIds[t.residencyActivityId]) return false;
        } else if (t.residencyActivityId && !validActIds[t.residencyActivityId]) {
          return false;
        }
        return true;
      });
      removed += (t0 - s.tasks.length);
    }

    if (Array.isArray(s.replanTriggers)) {
      var rt0 = s.replanTriggers.length;
      s.replanTriggers = s.replanTriggers.filter(function (t) {
        return t && (!t.planId || validPlanIds[t.planId]);
      });
      removed += (rt0 - s.replanTriggers.length);
    }

    if (rs.meta && rs.meta.activePlanId && !validPlanIds[rs.meta.activePlanId]) {
      rs.meta.activePlanId = (rs.plans[0] || {}).id || null;
    }

    if (removed > 0) {
      try { if (R.replanTrigger && R.replanTrigger.clearAll) R.replanTrigger.clearAll(); } catch (e) {}
      if (typeof window.__os.saveState === "function") window.__os.saveState();
    }
    return { removed: removed };
  };

  MGR.regenerateFromWizard = function (planId) {
    if (!planId) {
      var s = _state();
      planId = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
    }
    if (!planId) return { changed: 0 };

    var rounds = (R.store.getRoundsForPlan(planId) || []).slice();
    if (rounds.length === 0) { _notify("info", "دوره‌ای وجود نداره."); return { changed: 0 }; }

    var anyLocked = rounds.some(function (r) { return r && r.locked === true; });
    if (anyLocked) {
      _notify("warning", "برای بازتولید، اول قفل همه‌ی دوره‌ها را باز کن.");
      return { changed: 0 };
    }

    var examDate = _getPlanExamDate(planId);
    if (!examDate) { _notify("error", "تاریخ آزمون تعیین نشده."); return { changed: 0 }; }

    var sch = R.roundScheduler;
    if (!sch || !sch.computeNormalize) {
      _notify("error", "موتور زمان‌بندی در دسترس نیست.");
      return { changed: 0 };
    }

    var res = sch.computeNormalize(rounds, examDate);

    if (res.status === "noop") { _notify("info", "برنامه از قبل مرتب است."); return { changed: 0 }; }
    if (res.status === "infeasible") { _notify("error", _faInfeasible(res.reason)); return { changed: 0 }; }
    if (res.status === "invalid_input") { _notify("error", _faInvalid(res.reason)); return { changed: 0 }; }
    if (res.status !== "feasible" || !res.proposal) { _notify("error", "بازتولید ممکن نیست."); return { changed: 0 }; }

    _openProposalPreview(res.proposal, { planId: planId }, null);
    return { changed: res.proposal.rounds.length };
  };

  MGR.redistributeAll = function (planId) {
    if (!planId) {
      var s = _state();
      planId = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
    }
    if (!planId) return { changed: 0 };

    var rounds = (R.store.getRoundsForPlan(planId) || []).slice();
    if (rounds.length === 0) return { changed: 0 };

    var allLocked = rounds.every(function (r) { return r && r.locked === true; });
    if (allLocked) {
      _notify("info", "همه‌ی دوره‌ها قفل هستند.");
      return { changed: 0 };
    }

    var examDate = _getPlanExamDate(planId);
    var sch = R.roundScheduler;
    if (!sch || !sch.computeNormalize) {
      _notify("error", "موتور زمان‌بندی در دسترس نیست.");
      return { changed: 0 };
    }

    var res = sch.computeNormalize(rounds, examDate);

    if (res.status === "noop") {
      _notify("info", "برنامه از قبل مرتب است.");
      return { changed: 0 };
    }
    if (res.status === "infeasible") {
      _notify("error", _faInfeasible(res.reason));
      return { changed: 0 };
    }
    if (res.status === "invalid_input") {
      _notify("error", _faInvalid(res.reason));
      return { changed: 0 };
    }
    if (res.status !== "feasible" || !res.proposal) {
      _notify("error", "بازچینی ممکن نیست.");
      return { changed: 0 };
    }

    _openProposalPreview(res.proposal, { planId: planId }, null);
    return { changed: res.proposal.rounds.length };
  };

  MGR.checkOverlaps = _checkOverlaps;

  /* ─── API عمومی ─── */
  MGR.openPlanManager = function () {
    _openModal("plan");
    setTimeout(function () {
      var saveBtn = _overlay.querySelector("[data-r19m-save]");
      if (saveBtn) saveBtn.textContent = "➕ افزودن برنامه";
    }, 10);
  };

  MGR.openPlanEditor = function (id) { _openModal("plan", id); };
  MGR.openSubjectManager = function () { _openModal("subject"); };
  MGR.openSubjectEditor = function (id) { _openModal("subject", id); };
  MGR.openBookManager = function () { _openModal("book"); };
  MGR.openBookEditor = function (id) { _openModal("book", id); };
  MGR.openRoundManager = function () { _openModal("round"); };
  MGR.openRoundEditor = function (id) { _openModal("round", id); };
  MGR.openEnrollmentManager = function () { _openModal("enrollment"); };

  MGR.confirmDelete = function (kind, id) {
    if (!confirm("مطمئنی می‌خوای این مورد رو حذف کنی؟")) return false;
    var s = _state();
    if (!s || !s.residency) return false;
    var rs = s.residency;

    if (kind === "plan") {
      // cascade: collect round ids of this plan
      var roundIds = (rs.rounds || []).filter(function (r) { return r && r.planId === id; })
        .map(function (r) { return r.id; });
      rs.plans = (rs.plans || []).filter(function (p) { return !p || p.id !== id; });
      rs.rounds = (rs.rounds || []).filter(function (r) { return !r || r.planId !== id; });
      rs.enrollments = (rs.enrollments || []).filter(function (e) {
        return !e || roundIds.indexOf(e.roundId) === -1;
      });
      rs.activities = (rs.activities || []).filter(function (a) {
        return !a || (a.planId !== id && roundIds.indexOf(a.roundId) === -1);
      });
      rs.assessments = (rs.assessments || []).filter(function (a) {
        return !a || (a.planId !== id && roundIds.indexOf(a.roundId) === -1);
      });
      // B19-fix: planVersions
      if (Array.isArray(rs.planVersions)) {
        rs.planVersions = rs.planVersions.filter(function (pv) {
          return !pv || pv.planId !== id;
        });
      }
      // B19-fix: reviewStates مربوط به این plan
      if (Array.isArray(rs.reviewStates)) {
        rs.reviewStates = rs.reviewStates.filter(function (rst) {
          if (!rst) return false;
          if (rst.planId && rst.planId === id) return false;
          if (rst.roundId && roundIds.indexOf(rst.roundId) !== -1) return false;
          return true;
        });
      }
      // B19-fix: replanTriggers
      var sTop = _state();
      if (sTop && Array.isArray(sTop.replanTriggers)) {
        sTop.replanTriggers = sTop.replanTriggers.filter(function (t) {
          return !t || t.planId !== id;
        });
      }
      // B19-fix: تسک‌های متصل به activities این plan
      if (sTop && Array.isArray(sTop.tasks)) {
        var actIds = {};
        (rs.activities || []).forEach(function (a) {
          if (a && a.planId === id && a.id) actIds[a.id] = 1;
        });
        (rs.activities || []).forEach(function (a) {
          if (a && roundIds.indexOf(a.roundId) !== -1 && a.id) actIds[a.id] = 1;
        });
        sTop.tasks = sTop.tasks.filter(function (t) {
          if (!t) return false;
          if (t.sourceType === "residency_activity" && t.sourceId && actIds[t.sourceId]) return false;
          if (t.residencyActivityId && actIds[t.residencyActivityId]) return false;
          return true;
        });
      }
      // If we deleted the active plan, pick another one
      if (rs.meta && rs.meta.activePlanId === id) {
        var remaining = (rs.plans || [])[0] || null;
        rs.meta.activePlanId = remaining ? remaining.id : null;
      }
      try { var _rt4 = R.replanTrigger; if (_rt4 && _rt4.notifyChange) _rt4.notifyChange("rotation_changed", { id: id, sourceType: "plan" }); } catch (e) {}
    } else if (kind === "subject") {
      rs.subjects = (rs.subjects || []).filter(function (x) { return !x || x.id !== id; });
    } else if (kind === "book") {
      var ok = R.store.removeBook(id);
      if (!ok) { _notify("warning", "این کتاب قابل حذف نیست چون به یه دوره وصله. بایگانی شد."); }
    } else if (kind === "round") {
      var targetR = (rs.rounds || []).find(function (r) { return r && r.id === id; });
      if (targetR && targetR.locked === true) {
        _notify("warning", "این دوره قفله. اول بازش کن.");
        return false;
      }
      rs.rounds = (rs.rounds || []).filter(function (r) { return !r || r.id !== id; });
      rs.enrollments = (rs.enrollments || []).filter(function (e) { return !e || e.roundId !== id; });
      try { var _rt3 = R.replanTrigger; if (_rt3 && _rt3.notifyChange) _rt3.notifyChange("round_changed", { id: id, sourceType: "round", title: targetR ? targetR.title : null, before: targetR ? { startDate: targetR.startDate, endDate: targetR.endDate } : null }); } catch (e) {}
    }
    if (MGR.cleanupOrphans) MGR.cleanupOrphans();

    _save(); _render();
    return true;
  };

  (function _injectFixCSS() {
    if (document.getElementById("r19-fix-css")) return;
    var st = document.createElement("style");
    st.id = "r19-fix-css";
    st.textContent = ".r19-tl-warn-compact{padding:5px 10px;font-size:11.5px;background:rgba(251,191,36,.12);color:#fbbf24;border:1px solid rgba(251,191,36,.35);border-radius:6px;margin:4px 0;line-height:1.6}";
    document.head.appendChild(st);
  })();
  console.log("[residency.managers.v19] loaded");
})();