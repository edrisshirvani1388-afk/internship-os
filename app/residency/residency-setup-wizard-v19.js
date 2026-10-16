/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Setup Wizard v19.1 (Enhanced)
   راهنمای قدم‌به‌قدم با انیمیشن، رنگ، و تجربه‌ی زیبا
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.setup.wizard.v19] R missing"); return; }
  var WZ = R.residencySetup = R.residencySetup || {};
  var LIB = window.InternshipLib;
  var D = R.residencyDefaults;

  /* ─── utility ─── */
  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  function _notify(level, msg, opts) {
    try {
      var N = window.InternshipResidency && window.InternshipResidency.notify;
      if (N && typeof N[level] === "function") { N[level](msg, opts); return; }
    } catch (e) {}
    try { if (window.InternshipLib && window.InternshipLib.toast) window.InternshipLib.toast(msg, level === "error" ? "error" : ""); }
    catch (e2) { console.warn("[notify fallback]", msg); }
  }
  function _mkTempId(prefix) { return prefix + "_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 6); }
  function _now() { return Date.now(); }

  /* ─── تقویم شمسی سرخود ─── */
  function _showJalaliCalendar(input, onPick) {
    var existing = document.querySelector(".r19-cal-popup");
    if (existing) existing.remove();
    if (!LIB || !LIB.date) return;

    var parsed = LIB.date.parseJalali(input.value);
    var now = LIB.date.parseJalali(LIB.date.todayJalaliString());
    if (!now) return;
    var cur = parsed || now;
    var viewJy = cur.jy;
    var viewJm = cur.jm;

    var popup = document.createElement("div");
    popup.className = "r19-cal-popup";
    document.body.appendChild(popup);

    function _renderCal() {
      var monthLen = LIB.date.jalaliMonthLength(viewJy, viewJm);
      var startWeekday = LIB.date.jalaliMonthStartWeekday(viewJy, viewJm);
      var monthName = LIB.date.JMONTHS[viewJm - 1];
      var weekdays = ["ش","ی","د","س","چ","پ","ج"];

      var html = '<div class="r19-cal-head">' +
        '<button class="r19-cal-nav" type="button" data-cal-prev>‹</button>' +
        '<div class="r19-cal-title">' + _esc(monthName) + ' ' + _fa(viewJy) + '</div>' +
        '<button class="r19-cal-nav" type="button" data-cal-next>›</button>' +
      '</div>';

      html += '<div class="r19-cal-weekdays">' + weekdays.map(function (w) {
        return '<span>' + w + '</span>';
      }).join("") + '</div>';

      html += '<div class="r19-cal-grid">';
      for (var i = 0; i < startWeekday; i++) html += '<span class="r19-cal-cell is-empty"></span>';
      for (var d = 1; d <= monthLen; d++) {
        var isToday = (viewJy === now.jy && viewJm === now.jm && d === now.jd);
        var isSelected = parsed && (viewJy === parsed.jy && viewJm === parsed.jm && d === parsed.jd);
        var cls = "r19-cal-cell";
        if (isToday) cls += " is-today";
        if (isSelected) cls += " is-selected";
        html += '<button class="' + cls + '" type="button" data-cal-day="' + d + '">' + _fa(d) + '</button>';
      }
      html += '</div>';

      html += '<div class="r19-cal-actions">' +
        '<button class="r19-cal-action" type="button" data-cal-today>امروز</button>' +
        '<button class="r19-cal-action" type="button" data-cal-clear>پاک</button>' +
      '</div>';

      popup.innerHTML = html;
      _wireCal();
    }

    function _wireCal() {
      popup.querySelector("[data-cal-prev]").addEventListener("click", function (e) {
        e.stopPropagation();
        if (viewJm === 1) { viewJm = 12; viewJy--; } else viewJm--;
        _renderCal();
      });
      popup.querySelector("[data-cal-next]").addEventListener("click", function (e) {
        e.stopPropagation();
        if (viewJm === 12) { viewJm = 1; viewJy++; } else viewJm++;
        _renderCal();
      });
      popup.querySelectorAll("[data-cal-day]").forEach(function (b) {
        b.addEventListener("click", function (e) {
          e.stopPropagation();
          var d = parseInt(b.getAttribute("data-cal-day"), 10);
          var newDate = viewJy + "/" + viewJm + "/" + d;
          input.value = newDate;
          if (typeof onPick === "function") onPick(newDate);
          input.dispatchEvent(new Event("input", { bubbles: true }));
          input.dispatchEvent(new Event("change", { bubbles: true }));
          _closeCal();
        });
      });
      popup.querySelector("[data-cal-today]").addEventListener("click", function (e) {
        e.stopPropagation();
        var t = LIB.date.todayJalaliString();
        input.value = t;
        if (typeof onPick === "function") onPick(t);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        _closeCal();
      });
      popup.querySelector("[data-cal-clear]").addEventListener("click", function (e) {
        e.stopPropagation();
        input.value = "";
        if (typeof onPick === "function") onPick("");
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
        _closeCal();
      });
    }

    function _closeCal() {
      popup.remove();
      document.removeEventListener("click", _outsideClick, true);
      document.removeEventListener("keydown", _keyClose, true);
    }

    function _outsideClick(e) {
      if (!popup.contains(e.target) && e.target !== input) _closeCal();
    }

    function _keyClose(e) {
      if (e.key === "Escape") _closeCal();
    }

    _renderCal();

    // موقعیت
    var rect = input.getBoundingClientRect();
    var w = 260;
    var h = popup.offsetHeight || 320;
    var top = rect.bottom + 6;
    var left = rect.left;
    if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
    if (top + h > window.innerHeight - 10) top = rect.top - h - 6;
    if (top < 10) top = 10;
    popup.style.top = top + "px";
    popup.style.left = left + "px";

    setTimeout(function () {
      document.addEventListener("click", _outsideClick, true);
      document.addEventListener("keydown", _keyClose, true);
    }, 10);
  }

  /* ─── date picker ─── */
  function _attachDatePicker(input, onPick) {
    if (!input) return;
    input.setAttribute("inputmode", "numeric");
    input.setAttribute("autocomplete", "off");
    input.setAttribute("placeholder", "1405/7/1");
    input.classList.add("r19-date-input");

    var wrap = input.parentNode;
    if (wrap && !wrap.classList.contains("r19-date-wrap")) {
      var d = document.createElement("div");
      d.className = "r19-date-wrap";
      input.parentNode.insertBefore(d, input);
      d.appendChild(input);
      var calBtn = document.createElement("button");
      calBtn.type = "button";
      calBtn.className = "r19-date-icon";
      calBtn.setAttribute("aria-label", "باز کردن تقویم");
      calBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="3"></rect><path d="M16 2v4M8 2v4M3 10h18"></path></svg>';
      calBtn.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();
        _showJalaliCalendar(input, onPick);
      });
      d.appendChild(calBtn);
    }

    // ورودی دستی
    input.addEventListener("input", function () {
      var v = input.value.replace(/[^0-9\/]/g, "");
      if (v !== input.value) input.value = v;
      if (typeof onPick === "function") onPick(input.value);
    });

    if (typeof onPick === "function") {
      input.addEventListener("change", function () { onPick(input.value); });
    }
  }

  /* ─── وضعیت ─── */
  var _overlay = null;
  var _step = 0;
  var _draft = null;
  var _error = "";
  var _direction = 1; // برای انیمیشن

  var STEPS = [
    { id: "welcome",          title: "خوش‌آمد",          icon: "🎯" },
    { id: "plan",             title: "برنامه",            icon: "📌" },
    { id: "subjects",         title: "موضوع‌ها",          icon: "📚" },
    { id: "books",            title: "کتاب‌ها",           icon: "📖" },
    { id: "rounds",           title: "دوره‌ها و سرعت",    icon: "📅" },
    { id: "enrollments",      title: "اتصال‌ها",          icon: "🔗" },
    { id: "readingStrategy",  title: "روش مطالعه",       icon: "📖" },
    { id: "studyHours",       title: "ساعت‌های مطالعه",   icon: "⏰" },
    { id: "weekly",           title: "الگوی هفتگی",      icon: "🗓️" },
    { id: "rotations",        title: "چرخش‌ها",           icon: "🏥" },
    { id: "preview",          title: "بررسی برنامه",      icon: "🔍" },
    { id: "summary",          title: "جمع‌بندی",          icon: "✨" }
  ];

  /* ─── draft ─── */
  function _createEmptyDraft(initial) {
    initial = initial || {};
    return {
      goal: String(initial.goal || ""),
      plan: { title: String(initial.title || ""), examDate: "" },
      subjects: [],
      books: [],
      rounds: [],
      enrollments: [],
      roundStrategy: { autoSuggested: false, totalDays: 0, distribution: [] },
      enrollmentBaselines: {},
      readingStrategy: { mode: "sequential", rotationSize: 3, alternationDays: 1 }
    };
  }

  /* ─── باز و بسته ─── */
  WZ.openWizard = function (initialData) {
    if (_overlay) _overlay.remove();
    _draft = _createEmptyDraft(initialData || {});
    _step = 0;
    _error = "";
    _direction = 1;

    _overlay = document.createElement("div");
    _overlay.className = "r19-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    _render();
    document.addEventListener("keydown", _escHandler);
  };

  WZ.closeWizard = function () {
    if (!_overlay) return;
    document.removeEventListener("keydown", _escHandler);
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () {
      if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }, 220);
  };

  function _escHandler(e) {
    if (e.key === "Escape") {
      if (confirm("می‌خوای راهنما رو ببندی؟ اطلاعات ذخیره نمی‌شه.")) WZ.closeWizard();
    }
  }

  /* ─── رندر ─── */
  function _render() {
    if (!_overlay) return;
    var stepId = STEPS[_step].id;
    var body = "";
    if (stepId === "welcome")              body = _renderWelcome();
    else if (stepId === "plan")            body = _renderPlanStep();
    else if (stepId === "subjects")        body = _renderSubjectsStep();
    else if (stepId === "books")           body = _renderBooksStep();
    else if (stepId === "rounds")          body = _renderRoundsStep();
    else if (stepId === "enrollments")     body = _renderEnrollmentsStep();
    else if (stepId === "readingStrategy") body = _renderReadingStrategyStep();
    else if (stepId === "studyHours")      body = _renderStudyHoursStep();
    else if (stepId === "weekly")          body = _renderWeeklyStep();
    else if (stepId === "rotations")       body = _renderRotationsStep();
    else if (stepId === "preview")         body = _renderFeasibilityPreview();
    else if (stepId === "summary")         body = _renderSummary();

    _overlay.innerHTML =
      '<div class="r19-panel">' +
        _renderHeader() +
        '<div class="r19-body r19-body-anim-' + (_direction > 0 ? "forward" : "backward") + '">' + body + '</div>' +
      '</div>';
    _wire();
  }

  function _renderHeader() {
    var stepId = STEPS[_step].id;
    var percent = Math.round((_step / (STEPS.length - 1)) * 100);
    var showProgress = stepId !== "welcome" && stepId !== "summary";
    var stepInfo = STEPS[_step];

    // نقطه‌های پیشرفت
    var dots = "";
    if (showProgress) {
      dots = '<div class="r19-dots">';
      for (var i = 1; i <= STEPS.length - 2; i++) {
        var cls = i < _step ? "is-done" : (i === _step ? "is-current" : "");
        dots += '<span class="r19-dot ' + cls + '" title="' + _esc(STEPS[i].title) + '"></span>';
      }
      dots += '</div>';
    }

    return '<header class="r19-header">' +
      '<div class="r19-header-left">' +
        '<div class="r19-icon-wrap"><span class="r19-icon">' + stepInfo.icon + '</span></div>' +
        '<div>' +
          '<div class="r19-title">' + _esc(stepInfo.title) + '</div>' +
          (showProgress ? '<div class="r19-sub">مرحله ' + _fa(_step) + ' از ' + _fa(STEPS.length - 2) + '</div>' : '<div class="r19-sub">راهنمای ساخت برنامه</div>') +
        '</div>' +
      '</div>' +
      '<div class="r19-header-right">' +
        dots +
        '<button class="r19-close" type="button" data-r19-close aria-label="بستن">✕</button>' +
      '</div>' +
    '</header>' +
    (showProgress
      ? '<div class="r19-progress"><div class="r19-progress-fill" style="width:' + percent + '%"></div></div>'
      : '');
  }

  /* ─── مرحله‌ی خوش‌آمد ─── */
  function _renderWelcome() {
    return '<div class="r19-welcome">' +
      '<div class="r19-welcome-hero">' +
        '<div class="r19-welcome-glow"></div>' +
        '<div class="r19-welcome-icon-big">🎯</div>' +
      '</div>' +
      '<h2 class="r19-welcome-title">بیا با هم برنامه‌ات رو بسازیم</h2>' +
      '<p class="r19-welcome-desc">در چند قدم ساده، اولین برنامه‌ی مطالعه‌ات رو آماده می‌کنیم تا بتونی با خیال راحت شروع کنی.</p>' +
      '<div class="r19-steps-preview">' +
        _previewRow("1", "📌", "برنامه", "هدفت چیه و کِی آزمون داری") +
        _previewRow("2", "📚", "موضوع‌ها", "۲۳ درس رزیدنتی آماده‌ی انتخاب") +
        _previewRow("3", "📖", "کتاب‌ها", "منابع اصلی برای هر درس") +
        _previewRow("4", "📅", "دوره‌ها", "تقسیم هوشمند زمان تا آزمون") +
        _previewRow("5", "🔗", "اتصال‌ها", "مشخص کن کدوم کتاب رو کِی بخونی") +
      '</div>' +
      '<p class="r19-welcome-time">🕐 چند دقیقه وقت بذار — بعداً هم می‌تونی تغییرش بدی</p>' +
      '<div class="r19-actions">' +
        '<button class="r19-btn r19-btn-primary r19-btn-large" type="button" data-r19-start>شروع کنیم</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19-skip>بعداً</button>' +
      '</div>' +
    '</div>';
  }

  function _previewRow(num, icon, title, desc) {
    return '<div class="r19-preview-row">' +
      '<span class="r19-preview-num">' + _fa(num) + '</span>' +
      '<span class="r19-preview-icon">' + icon + '</span>' +
      '<div class="r19-preview-text">' +
        '<div class="r19-preview-title">' + _esc(title) + '</div>' +
        '<div class="r19-preview-desc">' + _esc(desc) + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ─── مرحله‌ی برنامه — دیگه استفاده نمی‌شه (توی welcome ادغام شده) ─── */
  function _renderPlanStep() {
    var p = _draft.plan;
    var daysLeft = p.examDate ? D.daysUntil(p.examDate) : null;
    var daysInfo = "";
    if (daysLeft != null) {
      if (daysLeft > 0) {
        daysInfo = '<div class="r19-day-badge is-ok"><span class="r19-day-num">' + _fa(daysLeft) + '</span><span class="r19-day-lbl">روز تا آزمون</span></div>';
      } else if (daysLeft === 0) {
        daysInfo = '<div class="r19-day-badge is-warn"><span class="r19-day-num">امروز</span></div>';
      } else {
        daysInfo = '<div class="r19-day-badge is-error"><span class="r19-day-num">گذشته</span></div>';
      }
    }
    return '<div class="r19-step">' +
      _stepIntro("📌", "برنامه", "هدف، عنوان، و تاریخ آزمون برنامه‌ات رو مشخص کن.") +
      _errorBox() +
      '<div class="r19-form">' +
        '<div class="r19-plan-grid">' +
          '<div class="r19-form-row">' +
            '<label class="r19-form-label">🎯 هدف اصلی‌ات چیه؟</label>' +
            '<input type="text" class="r19-input" data-r19-plan-goal value="' + _esc(p.goal || "") + '" placeholder="قبولی در رشته قلب با نمره ۵۰۰">' +
            '<div class="r19-form-hint">این هدف بلندمدتته و بالای برنامه‌ت می‌مونه.</div>' +
          '</div>' +
          '<div class="r19-form-row">' +
            '<label class="r19-form-label">📌 عنوان برنامه</label>' +
            '<input type="text" class="r19-input" data-r19-plan-title value="' + _esc(p.title || "") + '" placeholder="آزمون دستیاری ۱۴۰۷">' +
            '<div class="r19-form-hint">این عنوان برنامه‌ی فعالته.</div>' +
          '</div>' +
        '</div>' +
        '<div class="r19-form-row">' +
          '<label class="r19-form-label">📅 تاریخ آزمون (تاریخ پایان برنامه)</label>' +
          '<input type="text" class="r19-input r19-date-input" data-r19-plan-examDate value="' + _esc(p.examDate || "") + '" placeholder="روی آیکون تقویم بزن">' +
          '<div class="r19-form-hint">اگه بدی، Planner می‌تونه هوشمند زمان‌بندی کنه.</div>' +
        '</div>' +
      '</div>' +
      daysInfo +
      '<div class="r19-tip"><span>💡</span><span>هدف و عنوان اجباری‌ان. تاریخ اختیاریه ولی توصیه می‌شه.</span></div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۲: موضوع‌ها ─── */
  function _renderSubjectsStep() {
    var defaultAdded = _draft.subjects.filter(function (s) {
      return D.SUBJECTS.some(function (ds) { return ds.title === s.title; });
    }).length;
    var allSelected = defaultAdded === D.SUBJECTS.length;

    var rows = _draft.subjects.map(function (s) {
      return '<div class="r19-row r19-row-anim">' +
        '<button type="button" class="r19-row-icon-btn" data-r19-subject-icon="' + _esc(s.tempId) + '" title="تغییر آیکون">' + _esc(s.icon || "📚") + '</button>' +
        '<input type="text" class="r19-input-inline" data-r19-subject-edit="' + _esc(s.tempId) + '" value="' + _esc(s.title) + '" placeholder="نام موضوع">' +
        '<button class="r19-row-del" type="button" data-r19-subject-remove="' + _esc(s.tempId) + '" aria-label="حذف">🗑️</button>' +
      '</div>';
    }).join("");

    var defGrid = '<div class="r19-subject-grid">';
    D.SUBJECTS.forEach(function (s) {
      var exists = D.isDuplicateSubject(s.title, _draft.subjects);
      defGrid += '<button class="r19-subject-tile' + (exists ? ' is-added' : '') + '" type="button" data-r19-subject-add-def="' + _esc(s.title) + '" data-r19-subject-icon="' + _esc(s.icon) + '" data-r19-subject-short="' + _esc(s.short) + '">' +
        '<span class="r19-subject-tile-icon">' + s.icon + '</span>' +
        '<span class="r19-subject-tile-title">' + _esc(s.title) + '</span>' +
        (exists ? '<span class="r19-subject-tile-check">✓</span>' : '') +
      '</button>';
    });
    defGrid += '</div>';

    var selectAllBtn = '<button class="r19-btn-select-all' + (allSelected ? ' is-active' : '') + '" type="button" data-r19-subject-select-all>' +
      (allSelected ? '✕ پاک کردن همه' : '✓ انتخاب همه ۲۳ درس') +
    '</button>';

    return '<div class="r19-step">' +
      _stepIntro("📚", "موضوع‌ها", "درس‌هایی که می‌خوای مطالعه کنی. می‌تونی از لیست پیش‌فرض انتخاب کنی یا خودت اضافه کنی.") +
      _errorBox() +
      '<div class="r19-block">' +
        '<div class="r19-block-title">' +
          '<span>⚡ دروس رزیدنتی</span>' +
          '<span class="r19-block-count">' + _fa(defaultAdded) + ' از ' + _fa(D.SUBJECTS.length) + '</span>' +
        '</div>' +
        '<div class="r19-block-hint">روی هر درس بزن تا اضافه یا حذف بشه. آیکون‌ها یکتا هستن و از تکرار جلوگیری می‌شه.</div>' +
        '<div style="display:flex; justify-content:flex-end; margin-bottom:6px">' + selectAllBtn + '</div>' +
        defGrid +
      '</div>' +
      '<div class="r19-block">' +
        '<div class="r19-block-title"><span>✏️ موضوع‌های سفارشی</span></div>' +
        '<div class="r19-block-hint">برای تغییر آیکون، روی خود آیکون بزن.</div>' +
        '<div class="r19-list r19-list-anim">' +
          (rows || '<div class="r19-empty">هنوز موضوع سفارشی اضافه نکردی.</div>') +
        '</div>' +
        '<button class="r19-btn r19-btn-add" type="button" data-r19-subject-add>➕ افزودن موضوع سفارشی</button>' +
      '</div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۳: کتاب‌ها ─── */
  function _renderBooksStep() {
    if (_draft.subjects.length === 0) {
      return '<div class="r19-step">' +
        _stepIntro("📖", "کتاب‌ها", "اول باید موضوع بسازی تا بتونی بهش کتاب وصل کنی.") +
        '<div class="r19-warn">ابتدا موضوع‌ها را در مرحله‌ی قبل بساز.</div>' +
        _navButtons(true, "بعدی", false) +
      '</div>';
    }

    var qbRows = _draft.subjects.map(function (s) {
      var qbList = D.QB_BOOKS[s.title];
      if (!qbList) return "";
      var alreadyHasQB = _draft.books.some(function (b) {
        return b.subjectTempId === s.tempId && b.title.indexOf("QB") === 0;
      });
      var pagesSum = qbList.reduce(function (sum, q) { return sum + q.pages; }, 0);
      return '<div class="r19-qb-row' + (alreadyHasQB ? " is-added" : "") + '">' +
        '<span class="r19-qb-icon">' + _esc(s.icon || "📚") + '</span>' +
        '<div class="r19-qb-body">' +
          '<div class="r19-qb-title">' + _esc(s.title) + '</div>' +
          '<div class="r19-qb-meta">' + _fa(qbList.length) + ' جلد · مجموعاً ' + _fa(pagesSum) + ' صفحه</div>' +
        '</div>' +
        (alreadyHasQB
          ? '<span class="r19-qb-badge">✓ اضافه‌شده</span>'
          : '<button class="r19-btn r19-btn-sm r19-btn-primary" type="button" data-r19-add-qb="' + _esc(s.tempId) + '">➕ افزودن QB</button>') +
      '</div>';
    }).filter(Boolean).join("");

    var allQBAdded = _draft.subjects.every(function (s) {
      if (!D.QB_BOOKS[s.title]) return true;
      return _draft.books.some(function (b) {
        return b.subjectTempId === s.tempId && b.title.indexOf("QB") === 0;
      });
    });
    var qbAvailable = _draft.subjects.filter(function (s) { return D.QB_BOOKS[s.title]; }).length;
    var selectAllQB = qbAvailable > 0
      ? '<button class="r19-btn-select-all' + (allQBAdded ? ' is-active' : '') + '" type="button" data-r19-add-all-qb>' +
          (allQBAdded ? '✕ حذف همه QB' : '✓ افزودن همه QB') +
        '</button>'
      : '';

    var booksHtml = _draft.books.map(function (b) {
      var subj = _draft.subjects.find(function (x) { return x.tempId === b.subjectTempId; });
      var subjIcon = subj ? (subj.icon || "📚") : "📚";
      var subjTitle = subj ? subj.title : "انتخاب درس";
      return '<div class="r19-row r19-row-anim r19-book-row">' +
        '<button type="button" class="r19-row-icon-btn" data-r19-book-icon="' + _esc(b.tempId) + '" title="تغییر آیکون">' + _esc(b.icon || "📖") + '</button>' +
        '<div class="r19-row-body">' +
          '<input type="text" class="r19-input-inline" data-r19-book-edit-title="' + _esc(b.tempId) + '" value="' + _esc(b.title) + '" placeholder="نام کتاب">' +
          '<div class="r19-row-meta">' +
            '<button type="button" class="r19-subject-picker-btn" data-r19-book-pick-subject="' + _esc(b.tempId) + '">' +
              '<span class="r19-spb-icon">' + _esc(subjIcon) + '</span>' +
              '<span class="r19-spb-title">' + _esc(subjTitle) + '</span>' +
              '<span class="r19-spb-caret">▾</span>' +
            '</button>' +
            '<input type="number" class="r19-input-tiny" data-r19-book-edit-pages="' + _esc(b.tempId) + '" value="' + _esc(b.totalPages) + '" min="1" placeholder="صفحه">' +
            '<span class="r19-hint-inline">صفحه</span>' +
          '</div>' +
        '</div>' +
        '<button class="r19-row-del" type="button" data-r19-book-remove="' + _esc(b.tempId) + '" aria-label="حذف">🗑️</button>' +
      '</div>';
    }).join("");

    return '<div class="r19-step">' +
      _stepIntro("📖", "کتاب‌ها", "منابع مطالعه برای هر درس. از QB استفاده کن یا کتاب خودت رو اضافه کن.") +
      _errorBox() +
      (qbRows
        ? '<div class="r19-block r19-block-accent">' +
            '<div class="r19-block-title"><span>⚡ سریع‌ترین راه: افزودن QB</span></div>' +
            '<div class="r19-block-hint">صفحات پیش‌فرض بر اساس سری QB هستن. بعداً قابل ویرایشه.</div>' +
            (selectAllQB ? '<div style="display:flex; justify-content:flex-end; margin-bottom:6px">' + selectAllQB + '</div>' : '') +
            '<div class="r19-qb-list">' + qbRows + '</div>' +
          '</div>'
        : '') +
      '<div class="r19-block">' +
        '<div class="r19-block-title"><span>📚 کتاب‌های اضافه‌شده</span><span class="r19-block-count">' + _fa(_draft.books.length) + ' مورد</span></div>' +
        '<div class="r19-block-hint">برای تغییر درس یا آیکون کتاب، از کنترل‌های زیرش استفاده کن.</div>' +
        '<div class="r19-list r19-list-anim">' +
          (booksHtml || '<div class="r19-empty">هنوز کتابی اضافه نکردی.</div>') +
        '</div>' +
        '<button class="r19-btn r19-btn-add" type="button" data-r19-book-add>➕ افزودن کتاب سفارشی</button>' +
      '</div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۴: دوره‌ها ─── */
  function _renderRoundsStep() {
    var p = _draft.plan;
    var totalDays = p.examDate ? D.daysUntil(p.examDate) : null;
    var hasExamDate = totalDays != null && totalDays > 0;
    var roundCount = _draft.rounds.length || 0;
    var distribution = _draft.roundStrategy.distribution || [];

    if (roundCount > 0 && distribution.length !== roundCount && hasExamDate) {
      distribution = D.suggestRoundDistribution(totalDays, roundCount);
      _draft.roundStrategy.distribution = distribution.slice();
      _draft.roundStrategy.totalDays = totalDays;
      _draft.roundStrategy.autoSuggested = true;
      _applyDistributionToRounds();
    }

    var sumDays = distribution.reduce(function (a, b) { return a + b; }, 0);
    var over = hasExamDate && sumDays > totalDays;

    var infoBadge = "";
    if (hasExamDate) {
      infoBadge = '<div class="r19-round-info' + (over ? ' is-over' : '') + '">' +
        '<div class="r19-round-info-badge">' + (over ? '⚠️' : '📅') + '</div>' +
        '<div class="r19-round-info-body">' +
          '<div class="r19-round-info-title">' +
            (over
              ? 'مجموع دوره‌ها ' + _fa(sumDays - totalDays) + ' روز بیشتر از زمان باقی‌مانده'
              : _fa(totalDays) + ' روز تا آزمون · مجموع دوره‌ها: ' + _fa(sumDays) + ' روز') +
          '</div>' +
          '<div class="r19-round-info-desc">' +
            (over
              ? 'لطفاً ' + _fa(sumDays - totalDays) + ' روز از دوره‌ها کم کن.'
              : 'با کشیدن هر نوار، می‌تونی روزهای هر دوره رو کم یا زیاد کنی.') +
          '</div>' +
        '</div>' +
      '</div>';
    } else {
      infoBadge = '<div class="r19-warn">برای تقسیم هوشمند، تاریخ آزمون رو در مرحله‌ی اول وارد کن. یا خودت دستی تعداد روز هر دوره رو وارد کن.</div>';
    }

    var countControl = '<div class="r19-block">' +
      '<div class="r19-block-title"><span>🔢 تعداد دوره‌ها</span></div>' +
      '<div class="r19-count-control">' +
        '<button class="r19-count-btn" type="button" data-r19-round-count-minus>−</button>' +
        '<span class="r19-count-value">' + _fa(roundCount || 0) + '</span>' +
        '<button class="r19-count-btn" type="button" data-r19-round-count-plus>+</button>' +
        (hasExamDate ? '<button class="r19-btn r19-btn-sm r19-btn-ghost" type="button" data-r19-round-auto style="margin-inline-start:12px">✨ تقسیم هوشمند</button>' : '') +
      '</div>' +
    '</div>';

    var roundsHtml = "";
    if (roundCount > 0) {
      // مجموع صفحات کتاب‌ها
      var totalPagesAll = _draft.books.reduce(function (s, b) { return s + (b.totalPages || 0); }, 0);

      roundsHtml = '<div class="r19-block"><div class="r19-block-title"><span>📊 زمان‌بندی پیشنهادی — قابل کشیدن</span></div>' +
        '<div class="r19-block-hint">هر نوار رو بکش تا روزهای همون دوره کم یا زیاد بشه. سایر دوره‌ها خودکار جبران می‌شن.</div>' +
        '<div class="r19-rounds-list r19-list-anim" data-r19-drag-container>';

      _draft.rounds.forEach(function (r, i) {
        var days = distribution[i] || 0;
        var daysPct = (totalDays && days) ? (days / totalDays) * 100 : (100 / roundCount);
        var avgPages = days > 0 ? Math.round(totalPagesAll / days) : 0;
        var avgPagesAllBooks = days > 0 ? Math.ceil((totalPagesAll * roundCount) / Math.max(1, sumDays) / 1) : 0;
        var perRoundPagesPerDay = days > 0 ? Math.round(totalPagesAll / days) : 0;
        roundsHtml += '<div class="r19-round-card" data-r19-round-idx="' + i + '">' +
          '<div class="r19-round-card-head">' +
            '<span class="r19-round-num">' + _fa(i + 1) + '</span>' +
            '<input type="text" class="r19-round-title-input" data-r19-round-edit-title="' + _esc(r.tempId) + '" value="' + _esc(r.title) + '" placeholder="نام دوره">' +
            '<input type="number" class="r19-round-days-input" data-r19-round-edit-days="' + i + '" value="' + days + '" min="1" max="' + (totalDays || 3650) + '">' +
            '<span class="r19-round-days-lbl">روز</span>' +
            '<button class="r19-row-del" type="button" data-r19-round-remove="' + _esc(r.tempId) + '">🗑️</button>' +
          '</div>' +
          '<div class="r19-round-bar-wrap" data-r19-round-bar="' + i + '">' +
            '<div class="r19-round-bar">' +
              '<div class="r19-round-bar-fill" style="width:' + Math.min(100, daysPct) + '%"></div>' +
            '</div>' +
            '<div class="r19-round-bar-handle" data-r19-round-handle="' + i + '" title="برای تغییر بکش">⋮⋮</div>' +
          '</div>' +
          '<div class="r19-round-stats">' +
            '<span class="r19-round-stat r19-round-stat-avg">📄 میانگین: <strong>' + _fa(perRoundPagesPerDay) + '</strong> صفحه در روز</span>' +
            '<span class="r19-round-stat r19-round-stat-days">🗓️ <strong>' + _fa(days) + '</strong> روز</span>' +
          '</div>' +
          '<div class="r19-round-dates">' +
            '<span class="r19-round-date">از <strong>' + _fa(r.startDate || "—") + '</strong></span>' +
            '<span class="r19-round-date">تا <strong>' + _fa(r.endDate || "—") + '</strong></span>' +
          '</div>' +
          '<div class="r19-round-speed-row">' +
            '<span class="r19-round-speed-lbl">⚡ سرعت مطالعه</span>' +
            '<input type="number" class="r19-round-speed-input" data-r19-round-edit-speed="' + i + '" value="' + (r.studySpeedPagesPerHour || "") + '" placeholder="20" min="1" max="200">' +
            '<span class="r19-round-speed-unit">صفحه/ساعت</span>' +
            '<span class="r19-round-speed-hint">خالی = پیش‌فرض (۲۰)</span>' +
          '</div>' +
        '</div>';
      });

      roundsHtml += '</div></div>';
    } else {
      roundsHtml = '<div class="r19-empty">برای شروع، تعداد دوره‌ها رو تعیین کن.</div>';
    }

    return '<div class="r19-step">' +
      _stepIntro("📅", "دوره‌ها", "برنامه‌ات رو به بازه‌های زمانی تقسیم کن. با کشیدن هر نوار، روزهای دوره رو تنظیم کن.") +
      _errorBox() +
      infoBadge +
      countControl +
      roundsHtml +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  function _redistributeFromIndex(idx, newDays) {
    var totalDays = _draft.roundStrategy.totalDays;
    if (!totalDays) return;
    var dist = _draft.roundStrategy.distribution.slice();
    var others = dist.reduce(function (s, d, i) { return i === idx ? s : s + d; }, 0);
    var othersCount = dist.length - 1;
    if (othersCount < 1) { dist[idx] = totalDays; _draft.roundStrategy.distribution = dist; _applyDistributionToRounds(); return; }
    var remaining = totalDays - newDays;
    if (remaining < othersCount) {
      newDays = totalDays - othersCount;
      remaining = othersCount;
    }
    dist[idx] = newDays;
    // توزیع باقیمانده به نسبت دوره‌های دیگر
    if (others > 0) {
      var factor = remaining / others;
      var acc = 0;
      for (var i = 0; i < dist.length; i++) {
        if (i === idx) continue;
        var newVal = Math.max(1, Math.round(dist[i] * factor));
        dist[i] = newVal;
        acc += newVal;
      }
      // اصلاح اختلاف گرد کردن
      var diff = totalDays - dist.reduce(function (a, b) { return a + b; }, 0);
      var correctionIdx = idx === 0 ? 1 : 0;
      dist[correctionIdx] = Math.max(1, dist[correctionIdx] + diff);
    }
    _draft.roundStrategy.distribution = dist;
    _applyDistributionToRounds();
  }

  function _faWizSchedInfeasible(reason) {
    var map = {
      "no_exam_boundary": "برای زمان‌بندی، تاریخ آزمون لازمه.",
      "interval_insufficient_flex": "نمی‌شه دوره‌ها رو طوری چید که با تاریخ آزمون هماهنگ بشن.",
      "interval_too_small": "بازه‌ی زمانی برای این تعداد دوره کافی نیست.",
      "cannot_remove_enough": "نمی‌شه دوره‌ها رو به اندازه‌ی کافی کوتاه کرد.",
      "gap_between_locked_anchors": "بین دوره‌های قفل‌شده فاصله وجود داره."
    };
    return map[reason] || "زمان‌بندی دوره‌ها با تنظیمات فعلی ممکن نیست.";
  }

  function _faWizSchedInvalid(reason) {
    var map = {
      "empty_rounds": "دوره‌ای برای زمان‌بندی وجود نداره.",
      "invalid_date": "تاریخ یکی از دوره‌ها نامعتبره.",
      "start_after_end": "تاریخ شروع یکی از دوره‌ها بعد از پایانه.",
      "duplicate_order": "دو دوره ترتیب یکسان دارند.",
      "exam_before_start": "تاریخ آزمون قبل از شروع دوره‌هاست."
    };
    return map[reason] || "تنظیمات دوره‌ها نامعتبره.";
  }

  function _applySchedulerToDraft() {
    var sch = R.roundScheduler;
    if (!sch || !sch.computeNormalize) return null;
    if (!_draft || !Array.isArray(_draft.rounds) || _draft.rounds.length === 0) return null;
    var examDate = _draft.plan && _draft.plan.examDate ? _draft.plan.examDate.trim() : null;
    if (!examDate) return null;

    var pending = _draft.rounds.map(function (r, i) {
      return {
        id: r.tempId || ("wiz-draft-" + i),
        order: i + 1,
        startDate: r.startDate,
        endDate: r.endDate,
        locked: false
      };
    });

    var res;
    try { res = sch.computeNormalize(pending, examDate); }
    catch (e) { console.warn("[wizard] scheduler error:", e); return null; }
    if (!res) return null;

    if (res.status === "noop") return null;
    if (res.status === "feasible" && res.proposal && res.proposal.rounds.length === _draft.rounds.length) {
      res.proposal.rounds.forEach(function (pr, i) {
        if (_draft.rounds[i]) {
          _draft.rounds[i].startDate = pr.startDate;
          _draft.rounds[i].endDate = pr.endDate;
        }
      });
      return null;
    }
    if (res.status === "infeasible") return _faWizSchedInfeasible(res.reason);
    if (res.status === "invalid_input") return _faWizSchedInvalid(res.reason);
    return "خطا در زمان‌بندی دوره‌ها.";
  }

  function _applyDistributionToRounds() {
    var p = _draft.plan;
    if (!p.examDate) return;
    var startDate = p.startDate || LIB.date.todayJalaliString();
    var dist = _draft.roundStrategy.distribution;
    if (!dist || dist.length !== _draft.rounds.length) return;
    var ranges = D.buildRoundRanges(startDate, dist);
    ranges.forEach(function (r, i) {
      if (_draft.rounds[i]) {
        _draft.rounds[i].startDate = r.startDate;
        _draft.rounds[i].endDate = r.endDate;
        if (!_draft.rounds[i].title) {
          _draft.rounds[i].title = "دوره " + (i + 1);
        }
      }
    });
    // Phase 22.5: Scheduler normalizes the chain to examDate
    _applySchedulerToDraft();
  }

  /* ─── مرحله ۵: اتصال‌ها ─── */
  function _renderEnrollmentsStep() {
    if (_draft.rounds.length === 0 || _draft.books.length === 0) {
      return '<div class="r19-step">' +
        _stepIntro("🔗", "اتصال‌ها", "اول باید کتاب و دوره داشته باشی.") +
        '<div class="r19-warn">نیاز به کتاب و دوره داری.</div>' +
        _navButtons(true, "بعدی", false) +
      '</div>';
    }

    // پیش‌فرض: همه کتاب‌ها به همه دوره‌ها
    if (_draft.enrollments.length === 0) {
      _draft.rounds.forEach(function (round) {
        _draft.books.forEach(function (book) {
          _draft.enrollments.push({
            roundTempId: round.tempId,
            bookTempId: book.tempId,
            mode: "included",
            targetCoveragePercent: 100
          });
        });
      });
    }

    // اگر در حالت ویرایش یک دوره هستیم، اون رو نشون بده
    if (_draft._editingRoundTempId) {
      return _renderEnrollmentEditor();
    }

    var html = '<div class="r19-step">' +
      _stepIntro("🔗", "اتصال کتاب به دوره", "برای هر دوره، مشخص کن کدوم کتاب‌ها خونده می‌شن. کلیک روی «ویرایش» برای تعیین دقیق.") +
      _errorBox();

    _draft.rounds.forEach(function (round, ri) {
      var enrolled = _draft.enrollments.filter(function (e) { return e.roundTempId === round.tempId; });
      var enrolledBooks = enrolled.map(function (e) {
        return _draft.books.find(function (b) { return b.tempId === e.bookTempId; });
      }).filter(Boolean);
      var excludedBooks = _draft.books.filter(function (b) {
        return !enrolled.some(function (e) { return e.bookTempId === b.tempId; });
      });
      var totalPages = enrolledBooks.reduce(function (s, b) { return s + (b.totalPages || 0); }, 0);
      var days = (_draft.roundStrategy.distribution && _draft.roundStrategy.distribution[ri]) || 0;
      var avgPerDay = days > 0 ? Math.round(totalPages / days) : 0;

      html += '<div class="r19-enroll-card">' +
        '<div class="r19-enroll-card-head">' +
          '<span class="r19-round-num">' + _fa(ri + 1) + '</span>' +
          '<div class="r19-enroll-card-head-body">' +
            '<div class="r19-enroll-card-title">' + _esc(round.title || "بی‌نام") + '</div>' +
            '<div class="r19-enroll-card-dates">' + _fa(round.startDate || "—") + ' → ' + _fa(round.endDate || "—") + '</div>' +
          '</div>' +
          '<button class="r19-btn r19-btn-sm r19-btn-primary" type="button" data-r19-enroll-edit="' + _esc(round.tempId) + '">✏️ ویرایش کتاب‌ها</button>' +
        '</div>' +
        '<div class="r19-enroll-summary">' +
          '<div class="r19-enroll-summary-row">' +
            '<span class="r19-enroll-summary-label">✅ خوانده می‌شود:</span>' +
            '<span class="r19-enroll-summary-value">' + _fa(enrolledBooks.length) + ' از ' + _fa(_draft.books.length) + '</span>' +
          '</div>' +
          (excludedBooks.length > 0
            ? '<div class="r19-enroll-summary-row is-excluded">' +
                '<span class="r19-enroll-summary-label">✕ خونده نمی‌شود:</span>' +
                '<span class="r19-enroll-summary-value">' +
                  excludedBooks.map(function (b) { return _esc(b.title); }).join("، ") +
                '</span>' +
              '</div>'
            : '') +
          (totalPages > 0 && days > 0
            ? '<div class="r19-enroll-summary-row">' +
                '<span class="r19-enroll-summary-label">📄 میانگین:</span>' +
                '<span class="r19-enroll-summary-value">' + _fa(avgPerDay) + ' صفحه در روز (کل ' + _fa(totalPages) + ' صفحه)</span>' +
              '</div>'
            : '') +
        '</div>' +
      '</div>';
    });

    html += _navButtons(true, "بعدی", false) + '</div>';
    return html;
  }

  function _renderEnrollmentEditor() {
    var round = _draft.rounds.find(function (r) { return r.tempId === _draft._editingRoundTempId; });
    if (!round) { _draft._editingRoundTempId = null; return _renderEnrollmentsStep(); }

    var enrolled = _draft.enrollments.filter(function (e) { return e.roundTempId === round.tempId; });
    var enrolledIds = {};
    enrolled.forEach(function (e) { enrolledIds[e.bookTempId] = 1; });

    var html = '<div class="r19-step">' +
      '<button class="r19-back-link" type="button" data-r19-enroll-back>→ بازگشت به لیست دوره‌ها</button>' +
      _stepIntro("📖", "ویرایش کتاب‌های " + round.title, "کتاب‌هایی که نمی‌خوای این دوره خونده بشن رو بردار. برای وارد کردن صفحات خوانده‌شده‌ی قبلی، روی 📊 بزن.") +
      '<div class="r19-block">' +
        '<div class="r19-block-title">' +
          '<span>📚 کتاب‌ها</span>' +
          '<button class="r19-btn-select-all" type="button" data-r19-enroll-toggle-all>✓ همه / هیچ‌کدام</button>' +
        '</div>' +
        '<div class="r19-enroll-edit-list">';

    _draft.books.forEach(function (b) {
      var isOn = !!enrolledIds[b.tempId];
      var subj = _draft.subjects.find(function (s) { return s.tempId === b.subjectTempId; });
      var baselineKey = round.tempId + "|" + b.tempId;
      var bl = _draft.enrollmentBaselines[baselineKey];
      var blPages = bl && R.baseline ? R.baseline.computePages(bl, b.totalPages) : 0;
      var blLabel = blPages > 0 ? '📊 ' + _fa(blPages) + ' صفحه خوانده‌شده' : '📊 افزودن صفحات خوانده‌شده';
      html += '<div class="r19-enroll-edit-row-wrap">' +
        '<label class="r19-enroll-edit-row' + (isOn ? " is-on" : " is-off") + '">' +
        '<input type="checkbox" data-r19-enroll-toggle="' + _esc(b.tempId) + '"' + (isOn ? " checked" : "") + '>' +
        '<span class="r19-enroll-edit-icon">' + _esc(b.icon || "📖") + '</span>' +
        '<div class="r19-enroll-edit-body">' +
          '<div class="r19-enroll-edit-title">' + _esc(b.title) + '</div>' +
          '<div class="r19-enroll-edit-meta">' + _esc(subj ? subj.icon + " " + subj.title : "—") + ' · ' + _fa(b.totalPages || 0) + ' صفحه</div>' +
        '</div>' +
        '<span class="r19-enroll-edit-state">' + (isOn ? "✅" : "✕") + '</span>' +
        '</label>' +
        '<button type="button" class="r19-enroll-baseline-btn" data-r19-enroll-baseline="' + _esc(b.tempId) + '">' + blLabel + '</button>' +
        '</div>';
    });

    html += '</div></div>' +
      '<div class="r19-actions">' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19-enroll-save>✅ تأیید و بازگشت</button>' +
      '</div>' +
    '</div>';
    return html;
  }

  /* ─── B5: مرحله‌ی روش مطالعه ─── */
  function _renderReadingStrategyStep() {
    var rs = _draft.readingStrategy || { mode: "sequential", rotationSize: 3, alternationDays: 1 };
    var modes = [
      { id: "sequential",             icon: "📚", title: "ترتیبی",            desc: "هر کتاب را تمام کن، بعد کتاب بعدی" },
      { id: "category_first",         icon: "📂", title: "درس‌به‌درس",        desc: "هر درس را کامل کن، بعد درس بعدی" },
      { id: "alternating_daily",      icon: "🔄", title: "چرخشی روزانه",       desc: "هر روز بین چند کتاب بچرخ" },
      { id: "alternating_categories", icon: "🔁", title: "چرخشی بین درس‌ها",   desc: "بین چند درس جابه‌جا شو" },
      { id: "balanced",               icon: "⚖️", title: "متعادل",            desc: "پیشرفت چند کتاب نزدیک هم باشه" },
      { id: "custom",                 icon: "✏️", title: "سفارشی",            desc: "ترتیب را خودم تعیین می‌کنم" }
    ];

    var modeHTML = modes.map(function (m) {
      var isActive = rs.mode === m.id;
      return '<button type="button" class="r19-rsmode-card' + (isActive ? ' is-active' : '') + '" data-r19-rsmode="' + m.id + '">' +
        '<span class="r19-rsmode-icon">' + m.icon + '</span>' +
        '<div class="r19-rsmode-body">' +
          '<div class="r19-rsmode-title">' + _esc(m.title) + '</div>' +
          '<div class="r19-rsmode-desc">' + _esc(m.desc) + '</div>' +
        '</div>' +
        (isActive ? '<span class="r19-rsmode-check">✓</span>' : '') +
      '</button>';
    }).join("");

    var extraHTML = "";
    if (rs.mode === "alternating_daily" || rs.mode === "alternating_categories") {
      extraHTML = '<div class="r19-block">' +
        '<div class="r19-block-title"><span>تنظیمات چرخش</span></div>' +
        '<div class="r19-form-row">' +
          '<label class="r19-form-label">تعداد کتاب/درس در هر چرخه</label>' +
          '<input type="number" class="r19-input" data-r19-rs-rotation value="' + (rs.rotationSize || 3) + '" min="2" max="10" style="max-width:120px">' +
          '<div class="r19-form-hint">مثلاً ۳ یعنی هر روز بین ۳ کتاب بچرخی.</div>' +
        '</div>' +
        '<div class="r19-form-row">' +
          '<label class="r19-form-label">هر چند روز یک‌بار کتاب عوض بشه</label>' +
          '<input type="number" class="r19-input" data-r19-rs-alternation value="' + (rs.alternationDays || 1) + '" min="1" max="30" style="max-width:120px">' +
          '<div class="r19-form-hint">۱ = هر روز، ۲ = هر دو روز.</div>' +
        '</div>' +
      '</div>';
    }

    return '<div class="r19-step">' +
      _stepIntro("📖", "چطور دوست داری مطالعه کنی؟", "روش ترتیب مطالعه‌ات رو انتخاب کن. هر وقت خواستی می‌تونی از تنظیمات تغییرش بدی.") +
      _errorBox() +
      '<div class="r19-rsmode-grid">' + modeHTML + '</div>' +
      extraHTML +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۶: ساعت‌های مطالعه ─── */
  function _renderStudyHoursStep() {
    var sh = _draft.studyHours;
    if (!sh) {
      sh = { normal: 3, free: 5, beforeShift: 2, shift: 1, afterShift: 2 };
      _draft.studyHours = sh;
    }
    var rows = [
      { key: "normal",      icon: "🌤️", label: "روز عادی" },
      { key: "free",        icon: "🏖️", label: "روز تعطیل" },
      { key: "beforeShift", icon: "⏪",  label: "قبل از کشیک" },
      { key: "shift",       icon: "🚨", label: "روز کشیک" },
      { key: "afterShift",  icon: "😴", label: "بعد از کشیک" }
    ].map(function (r) {
      var v = (sh[r.key] != null) ? sh[r.key] : 0;
      return '<div class="r19-sh-row">' +
        '<span class="r19-sh-icon">' + r.icon + '</span>' +
        '<span class="r19-sh-label">' + r.label + '</span>' +
        '<input type="number" class="r19-sh-input" data-r19-sh="' + r.key + '" value="' + v + '" min="0" max="16" step="0.5">' +
        '<span class="r19-sh-unit">ساعت</span>' +
      '</div>';
    }).join("");
    return '<div class="r19-step">' +
      _stepIntro("⏰", "ساعت‌های مطالعه", "در هر نوع روز، چقدر می‌تونی مطالعه کنی؟") +
      _errorBox() +
      '<div class="r19-block">' +
        '<div class="r19-block-hint">برای هر نوع روز، تعداد ساعت قابل مطالعه رو مشخص کن. (۰ تا ۱۶ ساعت)</div>' +
        '<div class="r19-sh-list">' + rows + '</div>' +
      '</div>' +
      '<div class="r19-tip"><span>💡</span><span>این اعداد برای زمان‌بندی خودکار استفاده می‌شن. می‌تونی بعداً تغییرشون بدی.</span></div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۷: الگوی هفتگی ─── */
  function _renderWeeklyStep() {
    var wp = _draft.weeklyPattern;
    if (!wp) {
      wp = {
        saturday: "normal", sunday: "normal", monday: "normal",
        tuesday: "normal", wednesday: "normal", thursday: "free", friday: "free"
      };
      _draft.weeklyPattern = wp;
    }
    var days = [
      { key: "saturday",  label: "شنبه" },
      { key: "sunday",    label: "یک‌شنبه" },
      { key: "monday",    label: "دوشنبه" },
      { key: "tuesday",   label: "سه‌شنبه" },
      { key: "wednesday", label: "چهارشنبه" },
      { key: "thursday",  label: "پنج‌شنبه" },
      { key: "friday",    label: "جمعه" }
    ];
    var rows = days.map(function (d) {
      var v = wp[d.key] || "normal";
      return '<div class="r19-wp-row">' +
        '<span class="r19-wp-day">' + d.label + '</span>' +
        '<div class="r19-wp-chips">' +
          '<button type="button" class="r19-wp-chip' + (v === "normal" ? " is-active" : "") + '" data-r19-wp="' + d.key + '" data-r19-wp-val="normal">🌤️ عادی</button>' +
          '<button type="button" class="r19-wp-chip' + (v === "free" ? " is-active" : "") + '" data-r19-wp="' + d.key + '" data-r19-wp-val="free">🏖️ تعطیل</button>' +
        '</div>' +
      '</div>';
    }).join("");
    return '<div class="r19-step">' +
      _stepIntro("📅", "الگوی هفتگی", "برای هر روز هفته مشخص کن که عادی است یا تعطیل.") +
      _errorBox() +
      '<div class="r19-block">' +
        '<div class="r19-wp-list">' + rows + '</div>' +
      '</div>' +
      '<div class="r19-tip"><span>💡</span><span>این الگو پایه‌ی زمان‌بندی خودکاره.</span></div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }

  /* ─── مرحله ۸: چرخش‌ها — لود از state ─── */
  function _renderRotationsStep() {
    var s = _state();
    var rotations = (s && Array.isArray(s.rotations)) ? s.rotations : [];

    if (rotations.length === 0) {
      return '<div class="r19-step">' +
        _stepIntro("🏥", "روزهای فعال چرخش‌ها", "این مرحله اختیاریه.") +
        '<div class="r19-warn">هنوز چرخشی توی برنامه‌ی اصلی ثبت نکردی. ' +
        'برو به «بالین → مسیر اینترنی» و چرخش‌هات رو اضافه کن، بعد برگرد. ' +
        'الان می‌تونی این مرحله رو با «بعدی» رد کنی.</div>' +
        _navButtons(true, "بعدی", false) +
      '</div>';
    }

    if (!_draft.rotationDays) _draft.rotationDays = {};

    var dayList = [
      { key: "saturday",  label: "شنبه" },
      { key: "sunday",    label: "یک‌شنبه" },
      { key: "monday",    label: "دوشنبه" },
      { key: "tuesday",   label: "سه‌شنبه" },
      { key: "wednesday", label: "چهارشنبه" },
      { key: "thursday",  label: "پنج‌شنبه" },
      { key: "friday",    label: "جمعه" }
    ];

    var cards = rotations.map(function (r, i) {
      var rid = r.id;
      if (!_draft.rotationDays[rid]) {
        var existing = r.activitySchedule || {};
        var copy = {};
        dayList.forEach(function (d) {
          var v = existing[d.key];
          if (v === "light") v = "active";
          if (!v) v = "unknown";
          copy[d.key] = v;
        });
        _draft.rotationDays[rid] = copy;
      }
      var sched = _draft.rotationDays[rid];

      var chipsHtml = dayList.map(function (d) {
        var v = sched[d.key] || "unknown";
        return '<div class="r19-rd-row">' +
          '<span class="r19-rd-day">' + d.label + '</span>' +
          '<div class="r19-rd-chips">' +
            '<button type="button" class="r19-rd-chip' + (v === "active" ? " is-active" : "") + '" data-r19-rd="' + _esc(rid) + '|' + d.key + '|active">فعال</button>' +
            '<button type="button" class="r19-rd-chip' + (v === "unknown" ? " is-unknown" : "") + '" data-r19-rd="' + _esc(rid) + '|' + d.key + '|unknown">نمی‌دونم</button>' +
            '<button type="button" class="r19-rd-chip' + (v === "inactive" ? " is-inactive" : "") + '" data-r19-rd="' + _esc(rid) + '|' + d.key + '|inactive">غیرفعال</button>' +
          '</div>' +
        '</div>';
      }).join("");

      return '<div class="r19-rot-card">' +
        '<div class="r19-rot-card-head">' +
          '<span class="r19-rot-num">' + _fa(i + 1) + '</span>' +
          '<span class="r19-rot-card-title">' + _esc(r.title || "بی‌نام") + '</span>' +
          '<span class="r19-rot-card-range">' + _fa(r.startDate || "—") + ' → ' + _fa(r.endDate || "—") + '</span>' +
        '</div>' +
        '<div class="r19-rot-card-days">' + chipsHtml + '</div>' +
      '</div>';
    }).join("");

    return '<div class="r19-step">' +
      _stepIntro("🏥", "روزهای فعال چرخش‌ها", "برای هر چرخش، مشخص کن کدوم روزها فعاله. اگه نمی‌دونی، «نمی‌دونم» رو بزن تا پیش‌فرض (شنبه تا چهارشنبه) اعمال بشه.") +
      _errorBox() +
      '<div class="r19-block">' +
        '<div class="r19-block-hint">این چرخش‌ها از برنامه‌ی اصلی لود شدن. اگه چرخشی کم داری، از «بالین → مسیر اینترنی» اضافه کن.</div>' +
        cards +
      '</div>' +
      _navButtons(true, "بعدی", false) +
    '</div>';
  }


  /* ─── B6: Feasibility Preview ─── */
  function _buildTempResidencyFromDraft(draft) {
    var s = _state();
    if (!s || !s.residency) return null;
    var clone = JSON.parse(JSON.stringify(s.residency));

    // Clear draft-affected lists
    clone.plans = [];
    clone.subjects = [];
    clone.books = [];
    clone.rounds = [];
    clone.enrollments = [];
    clone.activities = [];
    clone.assessments = [];

    var planId = "preview-plan-" + Date.now().toString(36);
    clone.plans.push({
      id: planId,
      title: (draft.plan.title || "پیش‌نمایش").trim(),
      examDate: draft.plan.examDate || null,
      status: "active"
    });
    clone.meta = { activePlanId: planId, createdAt: Date.now(), updatedAt: Date.now() };

    var subjMap = {};
    (draft.subjects || []).forEach(function (sub) {
      var id = "prev-subj-" + sub.tempId;
      subjMap[sub.tempId] = id;
      clone.subjects.push({ id: id, title: sub.title || "", icon: sub.icon || null, shortTitle: sub.short || null });
    });

    var bookMap = {};
    (draft.books || []).forEach(function (b) {
      var id = "prev-book-" + b.tempId;
      bookMap[b.tempId] = id;
      clone.books.push({
        id: id,
        title: b.title || "",
        subjectId: subjMap[b.subjectTempId] || null,
        totalPages: b.totalPages || 0,
        priority: "normal",
        status: "active"
      });
    });

    var roundMap = {};
    (draft.rounds || []).forEach(function (r, i) {
      var id = "prev-round-" + r.tempId;
      roundMap[r.tempId] = id;
      clone.rounds.push({
        id: id,
        planId: planId,
        order: i + 1,
        title: r.title || ("دوره " + (i + 1)),
        startDate: r.startDate || null,
        endDate: r.endDate || null,
        status: "planned",
        allocationMode: "algorithmic",
        studySpeedPagesPerHour: (r.studySpeedPagesPerHour && r.studySpeedPagesPerHour > 0)
          ? r.studySpeedPagesPerHour
          : null
      });
    });

    (draft.enrollments || []).forEach(function (e, idx) {
      var rid = roundMap[e.roundTempId];
      var bid = bookMap[e.bookTempId];
      if (!rid || !bid) return;
      clone.enrollments.push({
        id: "prev-enr-" + idx + "-" + Math.random().toString(36).slice(2, 6),
        roundId: rid,
        bookId: bid,
        mode: e.mode || "included",
        targetCoveragePercent: e.targetCoveragePercent != null ? e.targetCoveragePercent : 100,
        useCustomSpeed: false,
        customPagesPerHour: null,
        initialStudyBaseline: null,
        studyOrder: idx
      });
    });

    if (!clone.settings) clone.settings = {};
    if (draft.readingStrategy) {
      clone.settings.readingStrategy = draft.readingStrategy;
    }
    if (draft.studyHours) {
      clone.settings.studyHoursByDayType = {
        normal:      draft.studyHours.normal      || 0,
        free:        draft.studyHours.free        || 0,
        beforeShift: draft.studyHours.beforeShift || 0,
        shift:       draft.studyHours.shift       || 0,
        afterShift:  draft.studyHours.afterShift  || 0
      };
    }
    if (draft.weeklyPattern) {
      clone.settings.weekdayDefaults = draft.weeklyPattern;
    }
    return { tempResidency: clone, planId: planId };
  }

  function _runFeasibilityCheck(draft) {
    var R = window.InternshipResidency;
    if (!R || !R.plannerSnapshot || !R.plannerAllocation) {
      return { ok: false, reason: "planner modules unavailable" };
    }
    var s = _state();
    if (!s) return { ok: false, reason: "state unavailable" };

    var built = _buildTempResidencyFromDraft(draft);
    if (!built) return { ok: false, reason: "temp residency build failed" };

    var savedResidency = s.residency;
    var out = { ok: false };

    try {
      s.residency = built.tempResidency;

      var snap = null;
      try { snap = R.plannerSnapshot.build(built.planId, "plan"); }
      catch (e) { console.warn("[feasibility] snapshot build error:", e); }

      if (!snap) { out.reason = "snapshot build returned null"; }
      else {
        var allocResult = null;
        try { allocResult = R.plannerAllocation.runAllocation(snap, {}); }
        catch (e) { console.warn("[feasibility] allocation error:", e); }

        if (!allocResult) { out.reason = "allocation returned null"; }
        else {
          var demandMin = 0;
          (snap.demands || []).forEach(function (d) {
            if (!d) return;
            if (d.status !== "active" && d.status !== "optional") return;
            demandMin += (d.estimatedRemainingMinutes | 0);
          });

          var allocatableMin = 0;
          var dayPeaks = [];
          (allocResult.daily || []).forEach(function (day) {
            if (!day) return;
            allocatableMin += (day.allocatableMinutes | 0);
            dayPeaks.push(day.allocatedMinutes | 0);
          });

          var allocatedMin = 0;
          (allocResult.allocations || []).forEach(function (a) {
            allocatedMin += (a.allocatedMinutes | 0);
          });

          var unmetMin = 0;
          (allocResult.demandSummary || []).forEach(function (ds) {
            unmetMin += (ds.unmetMinutes | 0);
          });

          var peakPressure = dayPeaks.length > 0 ? Math.max.apply(null, dayPeaks) : 0;

          // Days active
          var daysWithWork = dayPeaks.filter(function (m) { return m > 0; }).length;

          var gap = Math.max(0, demandMin - allocatableMin);
          var surplus = Math.max(0, allocatableMin - demandMin);

          var status = "feasible";
          if (gap > 0) status = "infeasible";
          else if (surplus < 60) status = "tight";

          out = {
            ok: true,
            status: status,
            demandMin: demandMin,
            allocatableMin: allocatableMin,
            allocatedMin: allocatedMin,
            unmetMin: unmetMin,
            gapMin: gap,
            surplusMin: surplus,
            peakPressureMin: peakPressure,
            daysWithWork: daysWithWork,
            totalDays: (allocResult.daily || []).length,
            feasibility: allocResult.feasibility || null,
            deficits: (allocResult.deficits || []).slice(0, 8)
          };
        }
      }
    } finally {
      s.residency = savedResidency;
    }
    return out;
  }

  function _fmtMin(m) {
    if (!m && m !== 0) return "—";
    m = Math.max(0, m | 0);
    var h = Math.floor(m / 60);
    var mm = m % 60;
    if (h === 0) return _fa(mm) + " دقیقه";
    if (mm === 0) return _fa(h) + " ساعت";
    return _fa(h) + " ساعت و " + _fa(mm) + " دقیقه";
  }

  function _renderFeasibilityPreview() {
    _errorBox();

    var res;
    try { res = _runFeasibilityCheck(_draft); }
    catch (e) {
      console.warn("[feasibility]", e);
      res = { ok: false, reason: (e && e.message) || "خطای نامشخص" };
    }

    if (!res.ok) {
      return '<div class="r19-step">' +
        _stepIntro("🔍", "بررسی برنامه", "نمی‌تونیم برنامه‌ات رو کامل بررسی کنیم.") +
        '<div class="r19-warn">بررسی انجام نشد: ' + _esc(res.reason || "دلیل نامشخص") +
        '<br><br>می‌تونی با خیال راحت ادامه بدی — برنامه‌ات ذخیره می‌شه، ولی ما نتونستیم از قبل عملی‌بودنش رو بسنجیم.</div>' +
        _navButtons(true, "ادامه", false) +
      '</div>';
    }

    var statusMap = {
      feasible:   { icon: "✅", title: "قابل اجرا",  cls: "is-ok",     msg: "برنامه در بازه‌ی آزمون جا می‌شود." },
      tight:      { icon: "⚠️", title: "کمی فشرده",  cls: "is-tight",  msg: "برنامه جا می‌شود، ولی حاشیه‌ی امن کم است." },
      infeasible: { icon: "❌", title: "غیرعملی",    cls: "is-block",  msg: "برنامه در شرایط فعلی جا نمی‌شود." }
    };
    var st = statusMap[res.status] || statusMap.feasible;

    var metricsHTML =
      '<div class="r19-feas-metrics">' +
        '<div class="r19-feas-metric">' +
          '<span class="r19-feas-metric-lbl">تقاضای کل</span>' +
          '<span class="r19-feas-metric-val">' + _fmtMin(res.demandMin) + '</span>' +
        '</div>' +
        '<div class="r19-feas-metric">' +
          '<span class="r19-feas-metric-lbl">ظرفیت قابل برنامه‌ریزی</span>' +
          '<span class="r19-feas-metric-val">' + _fmtMin(res.allocatableMin) + '</span>' +
        '</div>' +
        (res.status === "infeasible"
          ? '<div class="r19-feas-metric is-danger">' +
              '<span class="r19-feas-metric-lbl">کمبود</span>' +
              '<span class="r19-feas-metric-val">' + _fmtMin(res.gapMin) + '</span>' +
            '</div>'
          : '<div class="r19-feas-metric is-ok">' +
              '<span class="r19-feas-metric-lbl">حاشیه‌ی امن</span>' +
              '<span class="r19-feas-metric-val">' + _fmtMin(res.surplusMin) + '</span>' +
            '</div>') +
        '<div class="r19-feas-metric">' +
          '<span class="r19-feas-metric-lbl">روزهای کاری</span>' +
          '<span class="r19-feas-metric-val">' + _fa(res.daysWithWork) + ' از ' + _fa(res.totalDays) + '</span>' +
        '</div>' +
      '</div>';

    var suggestionsHTML = _renderFeasibilitySuggestions(res);

    return '<div class="r19-step">' +
      _stepIntro("🔍", "بررسی برنامه", "قبل از ذخیره، یه نگاه به عملی‌بودن برنامه‌ات بنداز.") +
      '<div class="r19-feas-banner ' + st.cls + '">' +
        '<div class="r19-feas-icon">' + st.icon + '</div>' +
        '<div class="r19-feas-body">' +
          '<div class="r19-feas-title">' + st.title + '</div>' +
          '<div class="r19-feas-msg">' + st.msg + '</div>' +
        '</div>' +
      '</div>' +
      metricsHTML +
      suggestionsHTML +
      _navButtons(true, "تأیید و ادامه", false) +
    '</div>';
  }

  function _renderFeasibilitySuggestions(res) {
    if (res.status === "feasible") return "";

    var sugs = [];

    if (res.status === "infeasible") {
      // Suggestion 1: increase all round speeds by 25%
      var anySpeedRoom = false;
      (_draft.rounds || []).forEach(function (r) {
        var sp = r.studySpeedPagesPerHour || 20;
        if (sp < 60) anySpeedRoom = true;
      });
      if (anySpeedRoom) {
        sugs.push({
          id: "speed-up",
          icon: "⚡",
          title: "افزایش سرعت مطالعه",
          desc: "سرعت همه‌ی دوره‌ها را ۲۵٪ بیشتر کن (مثلاً ۲۰ → ۲۵)."
        });
      }

      if ((_draft.rounds || []).length < 6) {
        sugs.push({
          id: "add-round",
          icon: "➕",
          title: "افزودن یک دور مطالعه",
          desc: "زمان کل مطالعه را با یه دور اضافه تقسیم کن."
        });
      }

      // Suggestion 3: reduce target coverage
      var anyCoverage = false;
      (_draft.enrollments || []).forEach(function (e) {
        if ((e.targetCoveragePercent || 100) > 70) anyCoverage = true;
      });
      if (anyCoverage) {
        sugs.push({
          id: "reduce-coverage",
          icon: "📉",
          title: "کاهش درصد پوشش",
          desc: "هدف پوشش همه‌ی کتاب‌ها را از ۱۰۰٪ به ۸۰٪ کم کن."
        });
      }
    } else if (res.status === "tight") {
      sugs.push({
        id: "speed-up-small",
        icon: "⚡",
        title: "کمی افزایش سرعت",
        desc: "سرعت مطالعه را ۱۰٪ بیشتر کن تا حاشیه‌ی امن بهتر بشه."
      });
      sugs.push({
        id: "reduce-coverage-small",
        icon: "📉",
        title: "کاهش کوچک پوشش",
        desc: "هدف پوشش را از ۱۰۰٪ به ۹۰٪ کم کن."
      });
    }

    if (sugs.length === 0) return "";

    var rows = sugs.map(function (sug) {
      return '<div class="r19-feas-sug">' +
        '<span class="r19-feas-sug-icon">' + sug.icon + '</span>' +
        '<div class="r19-feas-sug-body">' +
          '<div class="r19-feas-sug-title">' + _esc(sug.title) + '</div>' +
          '<div class="r19-feas-sug-desc">' + _esc(sug.desc) + '</div>' +
        '</div>' +
        '<button type="button" class="r19-feas-sug-btn" data-r19-feas-apply="' + sug.id + '">اعمال</button>' +
      '</div>';
    }).join("");

    return '<div class="r19-feas-sugs-block">' +
      '<div class="r19-feas-sugs-title">💡 پیشنهادها</div>' +
      '<div class="r19-feas-sugs-list">' + rows + '</div>' +
    '</div>';
  }

  function _applyFeasibilitySuggestion(id) {
    if (id === "speed-up") {
      (_draft.rounds || []).forEach(function (r) {
        var sp = r.studySpeedPagesPerHour || 20;
        r.studySpeedPagesPerHour = Math.min(80, Math.round(sp * 1.25));
      });
    } else if (id === "speed-up-small") {
      (_draft.rounds || []).forEach(function (r) {
        var sp = r.studySpeedPagesPerHour || 20;
        r.studySpeedPagesPerHour = Math.min(80, Math.round(sp * 1.10));
      });
    } else if (id === "add-round") {
      var cnt = (_draft.rounds || []).length;
      var newTitle = "دوره " + (cnt + 1);
      _draft.rounds.push({
        tempId: _mkTempId("round"),
        title: newTitle,
        startDate: "",
        endDate: "",
        studySpeedPagesPerHour: null
      });
    } else if (id === "reduce-coverage") {
      (_draft.enrollments || []).forEach(function (e) {
        e.targetCoveragePercent = Math.min(e.targetCoveragePercent || 100, 80);
      });
    } else if (id === "reduce-coverage-small") {
      (_draft.enrollments || []).forEach(function (e) {
        e.targetCoveragePercent = Math.min(e.targetCoveragePercent || 100, 90);
      });
    }
    _render();
  }

  /* ─── مرحله ۶: جمع‌بندی ─── */
  function _renderSummary() {
    var totalEnroll = _draft.enrollments.length;
    var totalDays = 0;
    if (_draft.roundStrategy && _draft.roundStrategy.totalDays) {
      totalDays = _draft.roundStrategy.totalDays;
    }
    return '<div class="r19-summary">' +
      '<div class="r19-summary-hero">' +
        '<div class="r19-summary-glow"></div>' +
        '<div class="r19-summary-icon">✨</div>' +
      '</div>' +
      '<h2 class="r19-summary-title">همه چیز آماده‌ست!</h2>' +
      '<p class="r19-summary-desc">با یه کلیک، همه‌ی اطلاعات ذخیره می‌شن.</p>' +
      '<div class="r19-summary-grid">' +
        _summaryCard("📌", "برنامه", _draft.plan.title || "بی‌نام") +
        (totalDays > 0 ? _summaryCard("⏳", "زمان تا آزمون", _fa(totalDays) + " روز") : '') +
        _summaryCard("📚", "موضوع", _fa(_draft.subjects.length) + " مورد") +
        _summaryCard("📖", "کتاب", _fa(_draft.books.length) + " مورد") +
        _summaryCard("📅", "دوره", _fa(_draft.rounds.length) + " مورد") +
        _summaryCard("🔗", "اتصال", _fa(totalEnroll) + " مورد") +
      '</div>' +
      _errorBox() +
      '<div class="r19-tip" style="margin: 16px 0 0;">' +
        '<span>💡</span>' +
        '<span>هر وقت کشیک‌هات رو توی تقویم وارد کردی، می‌تونی از داخل اپ (پلنر → بازبرنامه‌ریزی) برنامه رو خودکار بازچینی کنی.</span>' +
      '</div>' +
      '<div class="r19-actions r19-actions-center" style="margin-top:20px">' +
        '<button class="r19-btn r19-btn-primary r19-btn-large" type="button" data-r19-commit>✅ تأیید و ذخیره</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19-back>→ برگشت</button>' +
      '</div>' +
    '</div>';
  }

  function _summaryCard(icon, label, value) {
    return '<div class="r19-summary-card">' +
      '<span class="r19-summary-card-icon">' + icon + '</span>' +
      '<div class="r19-summary-card-body">' +
        '<div class="r19-summary-card-label">' + _esc(label) + '</div>' +
        '<div class="r19-summary-card-value">' + _esc(value) + '</div>' +
      '</div>' +
    '</div>';
  }

  /* ─── اجزای کمکی ─── */
  function _stepIntro(icon, title, desc) {
    return '<div class="r19-step-intro">' +
      '<div class="r19-step-icon-wrap"><div class="r19-step-icon-glow"></div><div class="r19-step-icon">' + icon + '</div></div>' +
      '<h2 class="r19-step-title">' + _esc(title) + '</h2>' +
      '<p class="r19-step-desc">' + _esc(desc) + '</p>' +
    '</div>';
  }

  function _field(label, inputHtml, hint) {
    return '<div class="r19-form-row">' +
      '<label class="r19-form-label">' + _esc(label) + '</label>' +
      inputHtml +
      (hint ? '<div class="r19-form-hint">' + _esc(hint) + '</div>' : '') +
    '</div>';
  }

  function _errorBox() {
    if (!_error) return "";
    return '<div class="r19-error r19-error-anim">❌ ' + _esc(_error) + '</div>';
  }

  function _navButtons(showBack, nextLabel, nextDisabled) {
    return '<div class="r19-actions">' +
      (showBack ? '<button class="r19-btn r19-btn-ghost" type="button" data-r19-back>→ قبلی</button>' : '') +
      '<button class="r19-btn r19-btn-primary" type="button" data-r19-next' + (nextDisabled ? " disabled" : "") + '>' + _esc(nextLabel || "بعدی") + ' <span class="r19-arrow">←</span></button>' +
    '</div>';
  }

  /* ─── ناوبری ─── */
  function _next() {
    if (!_validateStep()) { _render(); return; }
    if (_step < STEPS.length - 1) {
      _step++;
      _direction = 1;
      _error = "";
      _render();
    }
  }

  function _back() {
    if (_step > 0) {
      _step--;
      _direction = -1;
      _error = "";
      _render();
    }
  }

  /* ─── اعتبارسنجی ─── */
  function _validateStep() {
    var stepId = STEPS[_step].id;
    _error = "";
    if (stepId === "plan") {
      if (!_draft.plan.goal || !_draft.plan.goal.trim()) { _error = "هدف اصلی‌ات رو وارد کن."; return false; }
      if (!_draft.plan.title || !_draft.plan.title.trim()) { _error = "عنوان برنامه‌ت رو وارد کن."; return false; }
      return true;
    }
    if (stepId === "subjects") {
      if (_draft.subjects.length === 0) { _error = "حداقل یه موضوع اضافه کن."; return false; }
      var empty = _draft.subjects.find(function (s) { return !s.title || !s.title.trim(); });
      if (empty) { _error = "همه‌ی موضوع‌ها باید نام داشته باشن."; return false; }
      // چک تکراری
      var seen = {};
      for (var i = 0; i < _draft.subjects.length; i++) {
        var norm = _draft.subjects[i].title.trim().toLowerCase();
        if (seen[norm]) { _error = "موضوع تکراری: «" + _draft.subjects[i].title + "»"; return false; }
        seen[norm] = 1;
      }
      return true;
    }
    if (stepId === "books") {
      if (_draft.books.length === 0) { _error = "حداقل یه کتاب اضافه کن."; return false; }
      for (var j = 0; j < _draft.books.length; j++) {
        var b = _draft.books[j];
        if (!b.title || !b.title.trim()) { _error = "همه‌ی کتاب‌ها باید نام داشته باشن."; return false; }
        if (!b.totalPages || b.totalPages < 1) { _error = "تعداد صفحات باید بزرگ‌تر از صفر باشه."; return false; }
      }
      return true;
    }
    if (stepId === "rounds") {
      if (_draft.rounds.length === 0) { _error = "حداقل یه دوره اضافه کن."; return false; }
      for (var k = 0; k < _draft.rounds.length; k++) {
        var r = _draft.rounds[k];
        if (!r.title || !r.title.trim()) { _error = "همه‌ی دوره‌ها نام داشته باشن."; return false; }
        if (!r.startDate || !r.endDate) { _error = "هر دوره باید شروع و پایان داشته باشه."; return false; }
      }
      return true;
    }
    if (stepId === "enrollments") {
      if (_draft.enrollments.length === 0) { _error = "حداقل یه اتصال لازمه."; return false; }
      return true;
    }
    if (stepId === "studyHours") {
      // همه‌ی inputها معتبرن (min/max). فقط چک کن یه عدد باشه.
      return true;
    }
    if (stepId === "weekly") {
      var wp = _draft.weeklyPattern || {};
      var wdays = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
      for (var wi = 0; wi < wdays.length; wi++) {
        if (!wp[wdays[wi]]) { _error = "برای همه‌ی روزهای هفته یه الگو انتخاب کن."; return false; }
      }
      return true;
    }
    if (stepId === "rotations") {
      // مرحله اختیاریه — هیچ اعتبارسنجی نیاز نیست
      return true;
    }

    return true;
  }

  /* ─── تأیید ─── */
  function _commit() {
    if (!_validateStep()) { _render(); return; }
    var s = _state();
    if (!s || !s.residency) { _error = "state یافت نشد."; _render(); return; }

    try {
      var goalText = (_draft.plan.goal || "").trim();
      var titleText = (_draft.plan.title || "").trim();
      if (!goalText) throw new Error("هدف اصلی برنامه الزامیه.");
      if (!titleText) throw new Error("عنوان برنامه الزامیه.");

      // ذخیره‌ی جدا: هدف و عنوان
      var st = _state();
      if (st && st.workspace) {
        st.workspace.residencyGoal = goalText;
        st.workspace.residencyPlanTitle = titleText;
      }

      var plan = R.store.addPlan({
        title: titleText,
        examDate: _draft.plan.examDate ? _draft.plan.examDate.trim() : null,
        status: "active"
      });
      if (!plan) throw new Error("ساخت برنامه ناموفق بود.");

      var subjectMap = {};
      _draft.subjects.forEach(function (s) {
        var sub = R.store.addSubject({
          title: s.title.trim(),
          shortTitle: s.short || null,
          icon: s.icon || null,
          sourceType: "custom"
        });
        if (sub) subjectMap[s.tempId] = sub.id;
      });

      var bookMap = {};
      _draft.books.forEach(function (b) {
        var realSubjectId = subjectMap[b.subjectTempId];
        if (!realSubjectId) return;
        var bk = R.store.addBook({
          title: b.title.trim(),
          subjectId: realSubjectId,
          totalPages: b.totalPages,
          priority: "normal",
          sourceType: "manual"
        });
        if (bk) bookMap[b.tempId] = bk.id;
      });

      // Phase 22.5: Scheduler authoritative pass before any Round mutation
      var _wizSchedErr = _applySchedulerToDraft();
      if (_wizSchedErr) { throw new Error(_wizSchedErr); }

      var roundMap = {};
      _draft.rounds.forEach(function (r, i) {
        var rd = R.store.addRound({
          planId: plan.id,
          order: i + 1,
          title: r.title.trim(),
          startDate: r.startDate.trim(),
          endDate: r.endDate.trim(),
          status: "planned",
          allocationMode: "algorithmic"
        });
        if (rd) {
          roundMap[r.tempId] = rd.id;
          if (r.studySpeedPagesPerHour && r.studySpeedPagesPerHour > 0) {
            try { R.store.updateRound(rd.id, { studySpeedPagesPerHour: r.studySpeedPagesPerHour }); }
            catch (e) { rd.studySpeedPagesPerHour = r.studySpeedPagesPerHour; }
          }
        }
      });

      var enrollCount = 0;
      _draft.enrollments.forEach(function (e) {
        var realRoundId = roundMap[e.roundTempId];
        var realBookId = bookMap[e.bookTempId];
        if (!realRoundId || !realBookId) return;
        var baselineKey = e.roundTempId + "|" + e.bookTempId;
        var baseline = _draft.enrollmentBaselines ? _draft.enrollmentBaselines[baselineKey] : null;
        var enr = R.store.addEnrollment({
          roundId: realRoundId,
          bookId: realBookId,
          mode: e.mode || "included",
          targetCoveragePercent: e.targetCoveragePercent || 100,
          initialStudyBaseline: baseline || null
        });
        if (enr) enrollCount++;
      });

      // ═══ ذخیره‌ی ساعت‌های مطالعه در settings ═══
      if (_draft.studyHours) {
        if (!s.residency.settings) s.residency.settings = {};
        s.residency.settings.studyHoursByDayType = {
          normal:      _draft.studyHours.normal      || 0,
          free:        _draft.studyHours.free        || 0,
          beforeShift: _draft.studyHours.beforeShift || 0,
          shift:       _draft.studyHours.shift       || 0,
          afterShift:  _draft.studyHours.afterShift  || 0
        };
      }

      // ═══ ذخیره‌ی الگوی هفتگی در settings.weekdayDefaults ═══
      if (_draft.weeklyPattern) {
        if (!s.residency.settings) s.residency.settings = {};
        s.residency.settings.weekdayDefaults = {
          saturday:  _draft.weeklyPattern.saturday  || "normal",
          sunday:    _draft.weeklyPattern.sunday    || "normal",
          monday:    _draft.weeklyPattern.monday    || "normal",
          tuesday:   _draft.weeklyPattern.tuesday   || "normal",
          wednesday: _draft.weeklyPattern.wednesday || "normal",
          thursday:  _draft.weeklyPattern.thursday  || "free",
          friday:    _draft.weeklyPattern.friday    || "free"
        };
      }

      // ═══ اعمال روزهای فعال روی چرخش‌های موجود ═══
      if (_draft.rotationDays && s.rotations) {
        var _defSched = { saturday:"active", sunday:"active", monday:"active",
                         tuesday:"active", wednesday:"active",
                         thursday:"inactive", friday:"inactive" };
        Object.keys(_draft.rotationDays).forEach(function (rid) {
          var r = s.rotations.find(function (x) { return x && x.id === rid; });
          if (!r) return;
          var dayMap = _draft.rotationDays[rid] || {};
          var finalSched = {};
          ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"].forEach(function (k) {
            var v = dayMap[k];
            if (v === "unknown" || !v) v = _defSched[k];
            finalSched[k] = v;
          });
          r.activitySchedule = finalSched;
        });
      }

      // ─── B5: ذخیره‌ی روش مطالعه ───
      if (_draft.readingStrategy) {
        if (!s.residency.settings) s.residency.settings = {};
        s.residency.settings.readingStrategy = _draft.readingStrategy;
      }

      R.store.setActivePlan(plan.id);
      if (window.__os.saveState) window.__os.saveState();

      _showSuccess({
        plan: plan.title,
        subjects: Object.keys(subjectMap).length,
        books: Object.keys(bookMap).length,
        rounds: Object.keys(roundMap).length,
        enrollments: enrollCount,
        totalDays: _draft.roundStrategy.totalDays || 0
      });
    } catch (e) {
      _error = "خطا: " + (e.message || e);
      _render();
    }
  }

  function _showSuccess(info) {
    if (!_overlay) return;
    _overlay.innerHTML =
      '<div class="r19-panel">' +
        '<div class="r19-body">' +
          '<div class="r19-success">' +
            '<div class="r19-success-hero"><div class="r19-success-glow"></div><div class="r19-success-icon">🎉</div></div>' +
            '<h2 class="r19-success-title">تبریک!</h2>' +
            '<p class="r19-success-desc">برنامه‌ی اولت با موفقیت ساخته شد.</p>' +
            '<div class="r19-summary-grid">' +
              _summaryCard("📌", "برنامه", info.plan) +
              (info.totalDays > 0 ? _summaryCard("⏳", "زمان تا آزمون", _fa(info.totalDays) + " روز") : '') +
              _summaryCard("📚", "موضوع", _fa(info.subjects)) +
              _summaryCard("📖", "کتاب", _fa(info.books)) +
              _summaryCard("📅", "دوره", _fa(info.rounds)) +
              _summaryCard("🔗", "اتصال", _fa(info.enrollments)) +
            '</div>' +
            '<div class="r19-actions r19-actions-center" style="margin-top:26px">' +
              '<button class="r19-btn r19-btn-primary r19-btn-large" type="button" data-r19-done-planner>🚀 برنامه‌ریزی خودکار</button>' +
              '<button class="r19-btn r19-btn-ghost" type="button" data-r19-done-dashboard>میزکار</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    _wireSuccess();
  }

  function _wireSuccess() {
    if (!_overlay) return;
    var pb = _overlay.querySelector("[data-r19-done-planner]");
    if (pb) pb.addEventListener("click", function () {
      WZ.closeWizard();
      setTimeout(function () {
        if (R.plannerUI && R.plannerUI.open) {
          var s = _state();
          var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
          R.plannerUI.open(pid);
        }
      }, 300);
    });
    var db = _overlay.querySelector("[data-r19-done-dashboard]");
    if (db) db.addEventListener("click", function () {
      WZ.closeWizard();
      if (window.__os && window.__os.render) setTimeout(function () { window.__os.render(); }, 300);
    });
  }

  /* ─── اتصال رویدادها ─── */
  function _wire() {
    if (!_overlay) return;

    _overlay.querySelectorAll("[data-r19-close]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (confirm("می‌خوای راهنما رو ببندی؟ اطلاعات ذخیره نمی‌شه.")) WZ.closeWizard();
      });
    });
    _overlay.querySelectorAll("[data-r19-skip]").forEach(function (b) {
      b.addEventListener("click", WZ.closeWizard);
    });
    _overlay.querySelectorAll("[data-r19-start]").forEach(function (b) {
      b.addEventListener("click", function () { _step = 1; _direction = 1; _render(); });
    });
    _overlay.querySelectorAll("[data-r19-next]").forEach(function (b) {
      b.addEventListener("click", _next);
    });
    _overlay.querySelectorAll("[data-r19-back]").forEach(function (b) {
      b.addEventListener("click", _back);
    });
    _overlay.querySelectorAll("[data-r19-commit]").forEach(function (b) {
      b.addEventListener("click", _commit);
    });

    // مرحله‌ی برنامه — سه فیلد (goal + title + examDate)
    var planGoal = _overlay.querySelector("[data-r19-plan-goal]");
    if (planGoal) planGoal.addEventListener("input", function () { _draft.plan.goal = planGoal.value; });

    var planTitle = _overlay.querySelector("[data-r19-plan-title]");
    if (planTitle) planTitle.addEventListener("input", function () { _draft.plan.title = planTitle.value; });

    var planExam = _overlay.querySelector("[data-r19-plan-examDate]");
    if (planExam) {
      planExam.addEventListener("change", function () {
        _draft.plan.examDate = planExam.value;
        if (STEPS[_step].id === "plan") _render();
      });
      _attachDatePicker(planExam, function (v) {
        _draft.plan.examDate = v;
      });
    }

    // مرحله‌ی موضوع‌ها: دروس پیش‌فرض
    _overlay.querySelectorAll("[data-r19-subject-add-def]").forEach(function (b) {
      b.addEventListener("click", function () {
        var title = b.getAttribute("data-r19-subject-add-def");
        var icon = b.getAttribute("data-r19-subject-icon");
        var short = b.getAttribute("data-r19-subject-short");
        if (D.isDuplicateSubject(title, _draft.subjects)) {
          // حذف
          _draft.subjects = _draft.subjects.filter(function (s) { return s.title !== title; });
          _draft.books = _draft.books.filter(function (bk) {
            var subj = _draft.subjects.find(function (s) { return s.tempId === bk.subjectTempId; });
            return !!subj;
          });
        } else {
          _draft.subjects.push({ tempId: _mkTempId("subj"), title: title, icon: icon, short: short });
        }
        _render();
      });
    });

    // انتخاب همه‌ی موضوع‌ها
    var selectAllSubj = _overlay.querySelector("[data-r19-subject-select-all]");
    if (selectAllSubj) selectAllSubj.addEventListener("click", function () {
      var defaultAdded = _draft.subjects.filter(function (s) {
        return D.SUBJECTS.some(function (ds) { return ds.title === s.title; });
      }).length;
      if (defaultAdded === D.SUBJECTS.length) {
        // حذف همه‌ی پیش‌فرض‌ها
        _draft.subjects = _draft.subjects.filter(function (s) {
          return !D.SUBJECTS.some(function (ds) { return ds.title === s.title; });
        });
        _draft.books = _draft.books.filter(function (b) {
          return _draft.subjects.some(function (s) { return s.tempId === b.subjectTempId; });
        });
      } else {
        // اضافه‌ی همه‌ی پیش‌فرض‌ها
        D.SUBJECTS.forEach(function (ds) {
          if (!D.isDuplicateSubject(ds.title, _draft.subjects)) {
            _draft.subjects.push({ tempId: _mkTempId("subj"), title: ds.title, icon: ds.icon, short: ds.short });
          }
        });
      }
      _render();
    });

    // آیکون موضوع سفارشی
    _overlay.querySelectorAll("[data-r19-subject-icon]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-r19-subject-icon");
        _showIconPicker(b, function (icon) {
          var s = _draft.subjects.find(function (x) { return x.tempId === id; });
          if (s) { s.icon = icon; }
          _render();
        });
      });
    });

    // افزودن موضوع سفارشی
    var subjAdd = _overlay.querySelector("[data-r19-subject-add]");
    if (subjAdd) subjAdd.addEventListener("click", function () {
      _draft.subjects.push({ tempId: _mkTempId("subj"), title: "", icon: "📚" });
      _render();
      var inputs = _overlay.querySelectorAll("[data-r19-subject-edit]");
      if (inputs.length > 0) inputs[inputs.length - 1].focus();
    });
    _overlay.querySelectorAll("[data-r19-subject-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-subject-remove");
        _draft.subjects = _draft.subjects.filter(function (s) { return s.tempId !== id; });
        _draft.books = _draft.books.filter(function (bk) { return bk.subjectTempId !== id; });
        _render();
      });
    });
    _overlay.querySelectorAll("[data-r19-subject-edit]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-r19-subject-edit");
        var s = _draft.subjects.find(function (x) { return x.tempId === id; });
        if (s) s.title = inp.value;
      });
      inp.addEventListener("blur", function () {
        // چک تکراری در لحظه‌ی blur
        var id = inp.getAttribute("data-r19-subject-edit");
        var s = _draft.subjects.find(function (x) { return x.tempId === id; });
        if (!s || !s.title) return;
        var others = _draft.subjects.filter(function (x) { return x.tempId !== id; });
        if (D.isDuplicateSubject(s.title, others)) {
          _error = "موضوع «" + s.title + "» قبلاً اضافه شده.";
          _render();
        }
      });
    });

    // مرحله‌ی کتاب‌ها: افزودن QB برای یک درس
    _overlay.querySelectorAll("[data-r19-add-qb]").forEach(function (b) {
      b.addEventListener("click", function () {
        var subjectTempId = b.getAttribute("data-r19-add-qb");
        var subj = _draft.subjects.find(function (s) { return s.tempId === subjectTempId; });
        if (!subj) return;
        var qbList = D.QB_BOOKS[subj.title];
        if (!qbList) return;
        qbList.forEach(function (q) {
          _draft.books.push({
            tempId: _mkTempId("book"),
            title: q.title,
            subjectTempId: subjectTempId,
            totalPages: q.pages,
            priority: "normal",
            icon: subj.icon || "📕"
          });
        });
        _render();
      });
    });

    // افزودن همه‌ی QBها
    var addAllQB = _overlay.querySelector("[data-r19-add-all-qb]");
    if (addAllQB) addAllQB.addEventListener("click", function () {
      var allQBAdded = _draft.subjects.every(function (s) {
        if (!D.QB_BOOKS[s.title]) return true;
        return _draft.books.some(function (b) {
          return b.subjectTempId === s.tempId && b.title.indexOf("QB") === 0;
        });
      });
      if (allQBAdded) {
        // حذف همه‌ی QBها
        _draft.books = _draft.books.filter(function (b) { return b.title.indexOf("QB") !== 0; });
      } else {
        // اضافه‌ی همه
        _draft.subjects.forEach(function (s) {
          var qbList = D.QB_BOOKS[s.title];
          if (!qbList) return;
          var has = _draft.books.some(function (b) {
            return b.subjectTempId === s.tempId && b.title.indexOf("QB") === 0;
          });
          if (has) return;
          qbList.forEach(function (q) {
            _draft.books.push({
              tempId: _mkTempId("book"),
              title: q.title,
              subjectTempId: s.tempId,
              totalPages: q.pages,
              priority: "normal",
              icon: s.icon || "📕"
            });
          });
        });
      }
      _render();
    });

    // آیکون کتاب
    _overlay.querySelectorAll("[data-r19-book-icon]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-r19-book-icon");
        _showIconPicker(b, function (icon) {
          var bk = _draft.books.find(function (x) { return x.tempId === id; });
          if (bk) { bk.icon = icon; }
          _render();
        }, ["📕", "📗", "📘", "📙", "📖", "📚", "📓", "📔", "📒"]);
      });
    });

    // تغییر درس کتاب — با پنل انتخاب
    _overlay.querySelectorAll("[data-r19-book-pick-subject]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-r19-book-pick-subject");
        var bk = _draft.books.find(function (x) { return x.tempId === id; });
        if (!bk) return;
        b.setAttribute("data-current-subject", bk.subjectTempId || "");
        _showSubjectPicker(b, function (newSubjId) {
          bk.subjectTempId = newSubjId;
          var subj = _draft.subjects.find(function (s) { return s.tempId === newSubjId; });
          // فقط اگه آیکون کاربر تغییر نداده باشه، از آیکون درس استفاده کن
          if (subj && (!bk.icon || bk.icon === "📖" || BOOK_ICONS.indexOf(bk.icon) >= 0)) {
            bk.icon = subj.icon || "📕";
          }
          _render();
        });
      });
    });

    var bookAdd = _overlay.querySelector("[data-r19-book-add]");
    if (bookAdd) bookAdd.addEventListener("click", function () {
      if (_draft.subjects.length === 0) return;
      _draft.books.push({
        tempId: _mkTempId("book"),
        title: "",
        subjectTempId: _draft.subjects[0].tempId,
        totalPages: 0,
        priority: "normal",
        icon: "📕"
      });
      _render();
    });
    _overlay.querySelectorAll("[data-r19-book-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-book-remove");
        _draft.books = _draft.books.filter(function (x) { return x.tempId !== id; });
        _draft.enrollments = _draft.enrollments.filter(function (e) { return e.bookTempId !== id; });
        _render();
      });
    });
    _overlay.querySelectorAll("[data-r19-book-edit-title]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-r19-book-edit-title");
        var b = _draft.books.find(function (x) { return x.tempId === id; });
        if (b) b.title = inp.value;
      });
    });
    _overlay.querySelectorAll("[data-r19-book-edit-pages]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-r19-book-edit-pages");
        var b = _draft.books.find(function (x) { return x.tempId === id; });
        if (b) b.totalPages = parseInt(inp.value, 10) || 0;
      });
    });

    // مرحله‌ی دوره‌ها: تعداد
    var minus = _overlay.querySelector("[data-r19-round-count-minus]");
    if (minus) minus.addEventListener("click", function () { _changeRoundCount(-1); });
    var plus = _overlay.querySelector("[data-r19-round-count-plus]");
    if (plus) plus.addEventListener("click", function () { _changeRoundCount(1); });
    var auto = _overlay.querySelector("[data-r19-round-auto]");
    if (auto) auto.addEventListener("click", function () { _applySmartDivision(); });

    _overlay.querySelectorAll("[data-r19-round-remove]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-round-remove");
        _draft.rounds = _draft.rounds.filter(function (x) { return x.tempId !== id; });
        _draft.enrollments = _draft.enrollments.filter(function (e) { return e.roundTempId !== id; });
        _draft.roundStrategy.distribution = _draft.roundStrategy.distribution.slice(0, _draft.rounds.length);
        _render();
      });
    });
    _overlay.querySelectorAll("[data-r19-round-edit-title]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var id = inp.getAttribute("data-r19-round-edit-title");
        var r = _draft.rounds.find(function (x) { return x.tempId === id; });
        if (r) r.title = inp.value;
      });
    });

    // تغییر تعداد روز از input
    _overlay.querySelectorAll("[data-r19-round-edit-days]").forEach(function (inp) {
      inp.addEventListener("change", function () {
        var idx = parseInt(inp.getAttribute("data-r19-round-edit-days"), 10);
        var newDays = parseInt(inp.value, 10);
        if (isNaN(newDays) || newDays < 1) { inp.value = _draft.roundStrategy.distribution[idx]; return; }
        _redistributeFromIndex(idx, newDays);
        _render();
      });
    });

    // drag handle روی نوار دوره‌ها — بدون reload صفحه
    _overlay.querySelectorAll("[data-r19-round-handle]").forEach(function (handle) {
      handle.addEventListener("pointerdown", function (e) {
        e.preventDefault();
        e.stopPropagation();
        var idx = parseInt(handle.getAttribute("data-r19-round-handle"), 10);
        var card = handle.closest(".r19-round-card");
        var barWrap = handle.closest(".r19-round-bar-wrap");
        var bar = barWrap.querySelector(".r19-round-bar");
        var rect = bar.getBoundingClientRect();
        var totalDays = _draft.roundStrategy.totalDays;
        var startX = e.clientX;
        var startDays = _draft.roundStrategy.distribution[idx] || 1;
        var daysPerPx = totalDays / rect.width;
        var lastDays = startDays;

        handle.setPointerCapture && handle.setPointerCapture(e.pointerId);

        function onMove(ev) {
          var dx = ev.clientX - startX;
          var newDays = Math.max(1, Math.round(startDays + dx * daysPerPx));
          if (newDays === lastDays) return;
          lastDays = newDays;

          // آپدیت فقط بصری — بدون _render()
          var newPct = Math.max(3, Math.min(97, (newDays / totalDays) * 100));
          var barFill = card.querySelector(".r19-round-bar-fill");
          var daysInput = card.querySelector("[data-r19-round-edit-days]");
          var statDays = card.querySelector(".r19-round-stat-days");
          var statAvg = card.querySelector(".r19-round-stat-avg");
          if (barFill) barFill.style.width = newPct + "%";
          if (daysInput) daysInput.value = newDays;
          if (statDays) statDays.innerHTML = '<strong>' + _fa(newDays) + '</strong> روز';
          var totalPagesAll = _draft.books.reduce(function (s, b) { return s + (b.totalPages || 0); }, 0);
          if (statAvg) statAvg.innerHTML = '<strong>' + _fa(Math.round(totalPagesAll / newDays)) + '</strong> صفحه در روز';
        }

        function onUp() {
          document.removeEventListener("pointermove", onMove);
          document.removeEventListener("pointerup", onUp);
          if (lastDays !== startDays) {
            _redistributeFromIndex(idx, lastDays);
            _render();
          }
        }
        document.addEventListener("pointermove", onMove);
        document.addEventListener("pointerup", onUp);
      });
    });

    // مرحله‌ی اتصال‌ها: ویرایش هر دوره
    _overlay.querySelectorAll("[data-r19-enroll-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        _draft._editingRoundTempId = b.getAttribute("data-r19-enroll-edit");
        _render();
      });
    });
    var enrollBack = _overlay.querySelector("[data-r19-enroll-back]");
    if (enrollBack) enrollBack.addEventListener("click", function () {
      _draft._editingRoundTempId = null;
      _render();
    });
    _overlay.querySelectorAll("[data-r19-enroll-toggle]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var bookTempId = cb.getAttribute("data-r19-enroll-toggle");
        var roundTempId = _draft._editingRoundTempId;
        var label = cb.closest(".r19-enroll-edit-row");
        if (cb.checked) {
          var exists = _draft.enrollments.some(function (e) {
            return e.roundTempId === roundTempId && e.bookTempId === bookTempId;
          });
          if (!exists) {
            _draft.enrollments.push({
              roundTempId: roundTempId,
              bookTempId: bookTempId,
              mode: "included",
              targetCoveragePercent: 100
            });
          }
          if (label) { label.classList.add("is-on"); label.classList.remove("is-off"); var st = label.querySelector(".r19-enroll-edit-state"); if (st) st.textContent = "✅"; }
        } else {
          _draft.enrollments = _draft.enrollments.filter(function (e) {
            return !(e.roundTempId === roundTempId && e.bookTempId === bookTempId);
          });
          if (label) { label.classList.add("is-off"); label.classList.remove("is-on"); var st2 = label.querySelector(".r19-enroll-edit-state"); if (st2) st2.textContent = "✕"; }
        }
      });
    });
    var toggleAll = _overlay.querySelector("[data-r19-enroll-toggle-all]");
    if (toggleAll) toggleAll.addEventListener("click", function () {
      var roundTempId = _draft._editingRoundTempId;
      var allOn = _draft.books.every(function (b) {
        return _draft.enrollments.some(function (e) {
          return e.roundTempId === roundTempId && e.bookTempId === b.tempId;
        });
      });
      if (allOn) {
        _draft.enrollments = _draft.enrollments.filter(function (e) { return e.roundTempId !== roundTempId; });
      } else {
        _draft.books.forEach(function (b) {
          var exists = _draft.enrollments.some(function (e) {
            return e.roundTempId === roundTempId && e.bookTempId === b.tempId;
          });
          if (!exists) {
            _draft.enrollments.push({
              roundTempId: roundTempId,
              bookTempId: b.tempId,
              mode: "included",
              targetCoveragePercent: 100
            });
          }
        });
      }
      _render();
    });
    var enrollSave = _overlay.querySelector("[data-r19-enroll-save]");
    if (enrollSave) enrollSave.addEventListener("click", function () {
      _draft._editingRoundTempId = null;
      _render();
    });

    // Phase 6: baseline per book
    _overlay.querySelectorAll("[data-r19-enroll-baseline]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var bookTempId = b.getAttribute("data-r19-enroll-baseline");
        _showBaselineEditorForWizard(bookTempId);
      });
    });

    // ═══ B6: اعمال پیشنهاد Feasibility ═══
    _overlay.querySelectorAll("[data-r19-feas-apply]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-feas-apply");
        _applyFeasibilitySuggestion(id);
      });
    });

    // ═══ B5: سرعت مطالعه هر دور ═══
    _overlay.querySelectorAll("[data-r19-round-edit-speed]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var idx = parseInt(inp.getAttribute("data-r19-round-edit-speed"), 10);
        if (isNaN(idx) || !_draft.rounds[idx]) return;
        var v = parseInt(inp.value, 10);
        if (isNaN(v) || v < 1) {
          _draft.rounds[idx].studySpeedPagesPerHour = null;
        } else {
          _draft.rounds[idx].studySpeedPagesPerHour = v;
        }
      });
    });

    // ═══ B5: روش مطالعه ═══
    _overlay.querySelectorAll("[data-r19-rsmode]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!_draft.readingStrategy) _draft.readingStrategy = { mode: "sequential", rotationSize: 3, alternationDays: 1 };
        _draft.readingStrategy.mode = b.getAttribute("data-r19-rsmode");
        _render();
      });
    });
    var _rsRot = _overlay.querySelector("[data-r19-rs-rotation]");
    if (_rsRot) _rsRot.addEventListener("input", function () {
      var v = parseInt(_rsRot.value, 10);
      if (!isNaN(v) && v >= 2 && v <= 10) _draft.readingStrategy.rotationSize = v;
    });
    var _rsAlt = _overlay.querySelector("[data-r19-rs-alternation]");
    if (_rsAlt) _rsAlt.addEventListener("input", function () {
      var v = parseInt(_rsAlt.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 30) _draft.readingStrategy.alternationDays = v;
    });

    // ═══ مرحله‌ی ساعت‌های مطالعه ═══
    _overlay.querySelectorAll("[data-r19-sh]").forEach(function (inp) {
      inp.addEventListener("input", function () {
        var key = inp.getAttribute("data-r19-sh");
        var v = parseFloat(inp.value);
        if (isNaN(v)) v = 0;
        if (v < 0) v = 0;
        if (v > 16) { v = 16; inp.value = 16; }
        if (!_draft.studyHours) _draft.studyHours = {};
        _draft.studyHours[key] = v;
      });
    });

    // ═══ مرحله‌ی الگوی هفتگی ═══
    _overlay.querySelectorAll("[data-r19-wp]").forEach(function (b) {
      b.addEventListener("click", function () {
        var key = b.getAttribute("data-r19-wp");
        var val = b.getAttribute("data-r19-wp-val");
        if (!_draft.weeklyPattern) _draft.weeklyPattern = {};
        _draft.weeklyPattern[key] = val;
        _render();
      });
    });

    // ═══ مرحله‌ی چرخش‌ها — انتخاب روزهای فعال ═══
    _overlay.querySelectorAll("[data-r19-rd]").forEach(function (b) {
      b.addEventListener("click", function () {
        var parts = b.getAttribute("data-r19-rd").split("|");
        var rid = parts[0], dayKey = parts[1], val = parts[2];
        if (!_draft.rotationDays) _draft.rotationDays = {};
        if (!_draft.rotationDays[rid]) _draft.rotationDays[rid] = {};
        _draft.rotationDays[rid][dayKey] = val;
        _render();
      });
    });


  }

  /* ─── Baseline editor (Phase 6) ─── */
  function _showBaselineEditorForWizard(bookTempId) {
    var book = _draft.books.find(function (b) { return b.tempId === bookTempId; });
    if (!book) return;
    var roundTempId = _draft._editingRoundTempId;
    if (!roundTempId) return;
    var round = _draft.rounds.find(function (r) { return r.tempId === roundTempId; });
    var key = roundTempId + "|" + bookTempId;
    var totalPages = book.totalPages || 0;
    var baseline = _draft.enrollmentBaselines[key] || {
      ranges: [{ start: 1, end: 0 }],
      applyToRounds: "ALL",
      selectedRoundIds: [],
      notes: ""
    };

    var pop = document.createElement("div");
    pop.className = "r19-modal-overlay";
    pop.innerHTML = '<div class="r19-modal">' +
      '<header class="r19-modal-head">' +
        '<span class="r19-modal-title">📊 خوانده‌شده‌ی قبلی — ' + _esc(book.title) + '</span>' +
        '<button class="r19-close" type="button" data-close>✕</button>' +
      '</header>' +
      '<div class="r19-modal-body">' +
        '<p class="r19-form-hint">کل صفحات: <strong>' + _fa(totalPages) + '</strong> · دوره: <strong>' + _esc(round ? round.title : "") + '</strong></p>' +
        '<div id="wiz-bl-ranges"></div>' +
        '<button type="button" class="r19-btn r19-btn-add" id="wiz-bl-add" style="margin-top:8px">+ افزودن بازه</button>' +
        '<div class="r19-form-row" style="margin-top:12px">' +
          '<label class="r19-form-label">اعمال روی دوره‌ها</label>' +
          '<select class="r19-input" id="wiz-bl-apply">' +
            '<option value="ALL"' + (baseline.applyToRounds === "ALL" ? " selected" : "") + '>همه‌ی دوره‌های این کتاب</option>' +
            '<option value="FIRST_ONLY"' + (baseline.applyToRounds === "FIRST_ONLY" ? " selected" : "") + '>فقط دوره‌ی اول</option>' +
            '<option value="SELECTED_ROUNDS"' + (baseline.applyToRounds === "SELECTED_ROUNDS" ? " selected" : "") + '>دوره‌های انتخابی</option>' +
          '</select>' +
        '</div>' +
        '<div class="r19-form-row" id="wiz-bl-rounds-row" style="display:none">' +
          '<label class="r19-form-label">دوره‌های انتخابی</label>' +
          '<div id="wiz-bl-rounds"></div>' +
        '</div>' +
        '<div class="r19-form-row"><label class="r19-form-label">یادداشت (اختیاری)</label><textarea class="r19-input" id="wiz-bl-notes" rows="2">' + _esc(baseline.notes || "") + '</textarea></div>' +
        '<div class="r19-form-hint" id="wiz-bl-summary" style="color:rgb(var(--accent));margin-top:8px"></div>' +
        '<div class="r19-modal-actions" style="margin-top:14px">' +
          '<button class="r19-btn r19-btn-ghost" type="button" data-clear>پاک کردن</button>' +
          '<button class="r19-btn r19-btn-ghost" type="button" data-close>انصراف</button>' +
          '<button class="r19-btn r19-btn-primary" type="button" data-save>ذخیره</button>' +
        '</div>' +
      '</div>' +
    '</div>';
    document.body.appendChild(pop);

    var rangesEl = pop.querySelector("#wiz-bl-ranges");
    var applySel = pop.querySelector("#wiz-bl-apply");
    var roundsRow = pop.querySelector("#wiz-bl-rounds-row");
    var roundsEl = pop.querySelector("#wiz-bl-rounds");
    var summaryEl = pop.querySelector("#wiz-bl-summary");

    function renderRanges() {
      rangesEl.innerHTML = baseline.ranges.map(function (r, i) {
        return '<div style="display:flex;gap:8px;align-items:center;margin-bottom:6px">' +
          '<input type="number" class="r19-input-tiny" data-rs="' + i + '" value="' + (r.start || "") + '" placeholder="شروع" min="1" max="' + totalPages + '">' +
          '<span>تا</span>' +
          '<input type="number" class="r19-input-tiny" data-re="' + i + '" value="' + (r.end || "") + '" placeholder="پایان" min="1" max="' + totalPages + '">' +
          '<button type="button" class="r19-row-del" data-rm="' + i + '">✕</button>' +
        '</div>';
      }).join("");
      rangesEl.querySelectorAll("[data-rs]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = parseInt(inp.getAttribute("data-rs"), 10);
          baseline.ranges[i].start = parseInt(inp.value, 10) || 0;
          updateSummary();
        });
      });
      rangesEl.querySelectorAll("[data-re]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = parseInt(inp.getAttribute("data-re"), 10);
          baseline.ranges[i].end = parseInt(inp.value, 10) || 0;
          updateSummary();
        });
      });
      rangesEl.querySelectorAll("[data-rm]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = parseInt(b.getAttribute("data-rm"), 10);
          baseline.ranges.splice(i, 1);
          if (baseline.ranges.length === 0) baseline.ranges.push({ start: 1, end: 0 });
          renderRanges();
          updateSummary();
        });
      });
    }

    function renderRounds() {
      var bookRounds = _draft.rounds.filter(function (r) {
        return _draft.enrollments.some(function (e) {
          return e.roundTempId === r.tempId && e.bookTempId === bookTempId;
        }) || r.tempId === roundTempId;
      });
      roundsEl.innerHTML = bookRounds.map(function (r) {
        var checked = (baseline.selectedRoundIds || []).indexOf(r.tempId) !== -1;
        return '<label style="display:flex;gap:6px;align-items:center;padding:4px 0">' +
          '<input type="checkbox" data-wiz-round="' + _esc(r.tempId) + '"' + (checked ? " checked" : "") + '>' +
          '<span>' + _esc(r.title) + '</span>' +
        '</label>';
      }).join("") || '<div class="r19-empty">دوره‌ای وجود ندارد</div>';
    }

    function updateSummary() {
      var p = R.baseline ? R.baseline.computePages(baseline, totalPages) : 0;
      summaryEl.innerHTML = '📄 خوانده‌شده: <strong>' + _fa(p) + '</strong> · باقی‌مانده: <strong>' + _fa(Math.max(0, totalPages - p)) + '</strong>';
    }

    pop.querySelector("#wiz-bl-add").addEventListener("click", function () {
      baseline.ranges.push({ start: 1, end: 0 });
      renderRanges();
      updateSummary();
    });
    applySel.addEventListener("change", function () {
      baseline.applyToRounds = applySel.value;
      roundsRow.style.display = applySel.value === "SELECTED_ROUNDS" ? "" : "none";
    });

    renderRanges();
    renderRounds();
    applySel.dispatchEvent(new Event("change"));
    updateSummary();

    pop.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { pop.remove(); });
    });
    pop.addEventListener("click", function (e) { if (e.target === pop) pop.remove(); });
    pop.querySelector("[data-clear]").addEventListener("click", function () {
      delete _draft.enrollmentBaselines[key];
      pop.remove();
      _render();
    });
    pop.querySelector("[data-save]").addEventListener("click", function () {
      var selected = [];
      roundsEl.querySelectorAll("[data-wiz-round]:checked").forEach(function (cb) {
        selected.push(cb.getAttribute("data-wiz-round"));
      });
      var payload = {
        ranges: baseline.ranges.filter(function (r) { return r.start > 0 && r.end > 0; }),
        applyToRounds: baseline.applyToRounds,
        selectedRoundIds: selected,
        notes: pop.querySelector("#wiz-bl-notes").value.trim()
      };
      var val = R.baseline ? R.baseline.validate(payload, totalPages) : { ok: true, errors: [] };
      if (!val.ok) { _notify("error", val.errors.join("\n")); return; }
      var normalized = R.baseline ? R.baseline.normalize(payload, totalPages) : payload;
      _draft.enrollmentBaselines[key] = normalized;
      pop.remove();
      _render();
    });
  }

  /* ─── icon picker ─── */
  var BOOK_ICONS = ["📕","📗","📘","📙","📖","📚","📓","📔","📒"];
  var MEDICAL_ICONS = [
    "📚","📖","📕","📗","📘","📙","📓",
    "🫀","🫁","🧠","🦴","🩸","💧","⚗️","💊","🩺","🔬","🦠","💉","🧬",
    "👶","👁️","👂","🩹","🚹","🦵","🖐️","👃","👄","🦷",
    "📊","⚖️","🎯","⚡","✨","🌡️","🧪","🔭","🧫"
  ];
  function _getAllUsedSubjectIcons() {
    var set = {};
    D.SUBJECTS.forEach(function (s) { if (s.icon) set[s.icon] = 1; });
    (_draft.subjects || []).forEach(function (s) { if (s.icon) set[s.icon] = 1; });
    return Object.keys(set);
  }

  function _showIconPicker(anchorBtn, onPick, customList) {
    var existing = document.querySelector(".r19-icon-picker");
    if (existing) existing.remove();
    var list = customList || MEDICAL_ICONS;

    var popup = document.createElement("div");
    popup.className = "r19-icon-picker";

    var html = '<div class="r19-icon-picker-head">یک آیکون انتخاب کن</div>';
    // بخش ۱: آیکون‌های کتاب (اگه داریم)
    if (customList) {
      html += '<div class="r19-icon-picker-section-title">📚 آیکون‌های کتاب</div>';
      html += '<div class="r19-icon-picker-grid">';
      list.forEach(function (ic) {
        html += '<button type="button" class="r19-icon-pick-btn" data-icon="' + ic + '">' + ic + '</button>';
      });
      html += '</div>';
      // بخش ۲: آیکون‌های استفاده‌شده در دروس
      var used = _getAllUsedSubjectIcons();
      if (used.length > 0) {
        html += '<div class="r19-icon-picker-section-title">🎨 آیکون‌های دروس</div>';
        html += '<div class="r19-icon-picker-grid">';
        used.forEach(function (ic) {
          html += '<button type="button" class="r19-icon-pick-btn" data-icon="' + ic + '">' + ic + '</button>';
        });
        html += '</div>';
      }
    } else {
      html += '<div class="r19-icon-picker-grid">';
      list.forEach(function (ic) {
        html += '<button type="button" class="r19-icon-pick-btn" data-icon="' + ic + '">' + ic + '</button>';
      });
      html += '</div>';
    }
    popup.innerHTML = html;
    document.body.appendChild(popup);

    var rect = anchorBtn.getBoundingClientRect();
    var w = 340, h = 320;
    var top = rect.bottom + 6;
    var left = rect.left;
    if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
    if (top + h > window.innerHeight - 10) top = rect.top - h - 6;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    popup.style.top = top + "px";
    popup.style.left = left + "px";

    popup.querySelectorAll("[data-icon]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        onPick(b.getAttribute("data-icon"));
        popup.remove();
        document.removeEventListener("click", _outside, true);
      });
    });

    function _outside(e) {
      if (!popup.contains(e.target) && e.target !== anchorBtn) {
        popup.remove();
        document.removeEventListener("click", _outside, true);
      }
    }
    setTimeout(function () {
      document.addEventListener("click", _outside, true);
    }, 10);
  }

  /* ─── subject picker (به جای dropdown) ─── */
  function _showSubjectPicker(anchorBtn, onPick) {
    var existing = document.querySelector(".r19-icon-picker");
    if (existing) existing.remove();
    if (_draft.subjects.length === 0) return;

    var popup = document.createElement("div");
    popup.className = "r19-icon-picker r19-subject-picker-panel";
    var html = '<div class="r19-icon-picker-head">درس این کتاب رو انتخاب کن</div>';
    html += '<div class="r19-subject-picker-list">';
    _draft.subjects.forEach(function (s) {
      html += '<button type="button" class="r19-subject-picker-item" data-subject-pick="' + _esc(s.tempId) + '">' +
        '<span class="r19-subject-picker-item-icon">' + _esc(s.icon || "📚") + '</span>' +
        '<span class="r19-subject-picker-item-title">' + _esc(s.title) + '</span>' +
        '<span class="r19-subject-picker-item-check">' + (anchorBtn.getAttribute("data-current-subject") === s.tempId ? "✓" : "") + '</span>' +
      '</button>';
    });
    html += '</div>';
    popup.innerHTML = html;
    document.body.appendChild(popup);

    var rect = anchorBtn.getBoundingClientRect();
    var w = 280;
    var h = Math.min(380, 60 + _draft.subjects.length * 44);
    var top = rect.bottom + 6;
    var left = rect.left;
    if (left + w > window.innerWidth - 10) left = window.innerWidth - w - 10;
    if (top + h > window.innerHeight - 10) top = rect.top - h - 6;
    if (top < 10) top = 10;
    if (left < 10) left = 10;
    popup.style.top = top + "px";
    popup.style.left = left + "px";
    popup.style.width = w + "px";
    popup.style.maxHeight = "400px";

    popup.querySelectorAll("[data-subject-pick]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        onPick(b.getAttribute("data-subject-pick"));
        popup.remove();
        document.removeEventListener("click", _outside, true);
      });
    });

    function _outside(e) {
      if (!popup.contains(e.target) && e.target !== anchorBtn) {
        popup.remove();
        document.removeEventListener("click", _outside, true);
      }
    }
    setTimeout(function () {
      document.addEventListener("click", _outside, true);
    }, 10);
  }

  function _changeRoundCount(delta) {
    var currentCount = _draft.rounds.length;
    var nextCount = Math.max(1, Math.min(10, currentCount + delta));
    if (nextCount === currentCount) return;
    if (nextCount > currentCount) {
      for (var i = currentCount; i < nextCount; i++) {
        _draft.rounds.push({
          tempId: _mkTempId("round"),
          title: "دوره " + (i + 1),
          startDate: "",
          endDate: "",
          order: i + 1
        });
      }
    } else {
      _draft.rounds = _draft.rounds.slice(0, nextCount);
      _draft.enrollments = _draft.enrollments.filter(function (e) {
        return _draft.rounds.some(function (r) { return r.tempId === e.roundTempId; });
      });
    }
    // تقسیم خودکار
    var p = _draft.plan;
    if (p.examDate) {
      var totalDays = D.daysUntil(p.examDate);
      if (totalDays != null && totalDays > 0) {
        _draft.roundStrategy.distribution = D.suggestRoundDistribution(totalDays, nextCount);
        _draft.roundStrategy.totalDays = totalDays;
        _draft.roundStrategy.autoSuggested = true;
        _applyDistributionToRounds();
      }
    }
    _render();
  }

  function _applySmartDivision() {
    var p = _draft.plan;
    if (!p.examDate) { _error = "تاریخ آزمون لازمه."; _render(); return; }
    var totalDays = D.daysUntil(p.examDate);
    if (totalDays == null || totalDays <= 0) { _error = "تاریخ آزمون نامعتبره."; _render(); return; }
    var n = _draft.rounds.length || 1;
    _draft.roundStrategy.distribution = D.suggestRoundDistribution(totalDays, n);
    _draft.roundStrategy.totalDays = totalDays;
    _draft.roundStrategy.autoSuggested = true;
    _applyDistributionToRounds();
    _render();
  }

  /* ─── تشخیص تکمیل ─── */
  WZ.isSetupComplete = function () {
    var s = _state();
    if (!s || !s.residency) return false;
    var rs = s.residency;
    return (rs.plans || []).length > 0
        && (rs.subjects || []).length > 0
        && (rs.books || []).length > 0
        && (rs.rounds || []).length > 0;
  };

  WZ.getSetupProgress = function () {
    var s = _state();
    if (!s || !s.residency) return { step: 0, total: 5, percent: 0 };
    var rs = s.residency;
    var checks = [
      (rs.plans || []).length > 0,
      (rs.subjects || []).length > 0,
      (rs.books || []).length > 0,
      (rs.rounds || []).length > 0,
      (rs.enrollments || []).length > 0
    ];
    var done = checks.filter(Boolean).length;
    return { step: done, total: 5, percent: Math.round(done / 5 * 100) };
  };

  console.log("[residency.setup.wizard.v19] loaded v19.1 (enhanced)");
})();