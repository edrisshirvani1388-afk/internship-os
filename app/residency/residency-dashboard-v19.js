/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Dashboard v19
   میزکار اصلی — خلاصه + مدیریت + اکشن‌ها
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.dashboard.v19] R missing"); return; }
  var DB = R.residencyDashboard = R.residencyDashboard || {};
  var LIB = window.InternshipLib;

  /* ─── Phase 9: Sub-tabs ─── */
  var TAB_KEY = "internship-os.residency.tab.v1";
  var TABS = [
    { id: "today",    icon: "🌅", label: "امروز" },
    { id: "planning", icon: "📅", label: "برنامه‌ریزی" },
    { id: "timeline", icon: "🗺️", label: "تایم‌لاین" },
    { id: "analysis", icon: "📊", label: "تحلیل" },
    { id: "settings", icon: "⚙️", label: "تنظیمات" }
  ];

  function _getActiveTab() {
    try {
      var v = localStorage.getItem(TAB_KEY);
      if (v && TABS.some(function (t) { return t.id === v; })) return v;
    } catch (e) {}
    return "today";
  }
  function _setActiveTab(id) {
    try { localStorage.setItem(TAB_KEY, id); } catch (e) {}
  }

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _faDate(str) {
    if (!str) return "—";
    if (!LIB || !LIB.date || !LIB.date.parseJalali || !LIB.date.prettyDate) return _fa(str);
    var p = LIB.date.parseJalali(str);
    if (!p) return _fa(str);
    return LIB.date.prettyDate(p.jy, p.jm, p.jd);
  }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  function _tipIcon(text) {
    if (!text) return "";
    return ' <span class="r19-tip-icon" tabindex="0" data-tip="' +
      _esc(text) + '" aria-label="' + _esc(text) + '">ⓘ</span>';
  }

  function _notify(level, msg, opts) {
    try {
      var N = window.InternshipResidency && window.InternshipResidency.notify;
      if (N && typeof N[level] === "function") { N[level](msg, opts); return; }
    } catch (e) {}
    try { if (window.InternshipLib && window.InternshipLib.toast) window.InternshipLib.toast(msg, level === "error" ? "error" : ""); }
    catch (e2) { console.warn("[notify fallback]", msg); }
  }

  /* ─── رندر کامل میزکار با ۵ تب ─── */
  DB.render = function (container) {
    if (!container) return;
    var s = _state();
    if (!s || !s.residency) {
      container.innerHTML = '<div class="r19-dash-empty">داده‌ای برای نمایش وجود ندارد.</div>';
      return;
    }
    var rs = s.residency;
    var activeTab = _getActiveTab();
    var html = "";

    html += _renderTabsBar(activeTab);
    html += '<div class="r19-tab-content">';

    if (activeTab === "today") {
      html += _renderTodayTab(rs);
    } else if (activeTab === "planning") {
      html += _renderPlanningTab(rs);
    } else if (activeTab === "timeline") {
      html += _renderTimelineTab(rs);
    } else if (activeTab === "analysis") {
      html += _renderAnalysisTab(rs);
    } else if (activeTab === "settings") {
      html += _renderSettingsTab(rs);
    } else {
      html += _renderTodayTab(rs);
    }

    html += '</div>';
    container.innerHTML = html;
    _wire(container);
    _wireTabs(container);
  };

  /* ─── Tabs bar ─── */
  function _renderTabsBar(activeTab) {
    var html = '<div class="r19-tabs-bar" role="tablist">';
    TABS.forEach(function (t) {
      var cls = "r19-tab-item" + (t.id === activeTab ? " is-active" : "");
      html += '<button type="button" class="' + cls + '" role="tab" data-r19-tab="' + t.id + '" aria-selected="' + (t.id === activeTab) + '">' +
        '<span class="r19-tab-icon">' + t.icon + '</span>' +
        '<span class="r19-tab-label">' + t.label + '</span>' +
      '</button>';
    });
    html += '</div>';
    return html;
  }

  function _wireTabs(container) {
    container.querySelectorAll("[data-r19-tab]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-tab");
        if (!id) return;
        _setActiveTab(id);
        DB.render(container);
      });
    });
  }

  /* ─── TAB: امروز ─── */
  function _renderTodayTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    html += _renderReplanBanner(rs);
    html += _renderTodayStudyRec(rs);
    html += _renderTodayWidgets(rs);
    html += _renderBaselineSummary(rs);
    // Quick Actions حذف شد چون تکراری با Planning tab بود
    return html;
  }

  /* ─── TAB: برنامه‌ریزی ─── */
  function _renderPlanningTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    html += _renderReplanBanner(rs);

    // Planning status card (Phase 9 §13)
    var activePlanId = rs.meta && rs.meta.activePlanId;
    var plan = activePlanId ? (rs.plans || []).find(function (p) { return p && p.id === activePlanId; }) : null;

    var activePlanId = rs.meta && rs.meta.activePlanId;
    var planRounds = activePlanId
      ? (rs.rounds || []).filter(function (r) { return r && r.planId === activePlanId; })
      : (rs.rounds || []);
    var planRoundIds = planRounds.map(function (r) { return r.id; });

    // Unique books in this plan (based on enrollments)
    var uniqueBookIds = {};
    var totalEnrollments = 0;
    (rs.enrollments || []).forEach(function (e) {
      if (!e || e.mode === "excluded") return;
      if (planRoundIds.indexOf(e.roundId) === -1) return;
      uniqueBookIds[e.bookId] = 1;
      totalEnrollments++;
    });
    var totalBooks = Object.keys(uniqueBookIds).length;
    var totalRounds = planRounds.length;

    html += '<div class="r19-block r19-block-accent">' +
      '<div class="r19-block-title"><span>📊 وضعیت برنامه‌ریزی</span></div>' +
      '<div class="r19-plan-status">' +
        '<div class="r19-plan-status-row">' +
          '<span>کتاب‌های یگانه' + _tipIcon('تعداد کتاب‌های متفاوتی که در این برنامه هستن (بدون شمارش تکراری بین دورها).') + '</span>' +
          '<strong>' + _fa(totalBooks) + '</strong>' +
        '</div>' +
        '<div class="r19-plan-status-row">' +
          '<span>دورهای این برنامه' + _tipIcon('تعداد دوره‌هایی که در این برنامه تعریف شدن.') + '</span>' +
          '<strong>' + _fa(totalRounds) + '</strong>' +
        '</div>' +
        '<div class="r19-plan-status-row">' +
          '<span>اتصال کتاب به دور' + _tipIcon('هر اتصال یعنی «این کتاب در این دور خونده می‌شه». یه کتاب می‌تونه به چند دور وصل بشه، پس این عدد معمولاً از تعداد کتاب‌ها بیشتره.') + '</span>' +
          '<strong>' + _fa(totalEnrollments) + '</strong>' +
        '</div>' +
      '</div>' +
      '<div class="r19-block-hint">' +
        'مثال: اگه ۱۰ کتاب داری و هر کدوم به ۳ دور وصل شده → ۱۰ کتاب یگانه و ۳۰ اتصال.' +
      '</div>' +
    '</div>';

    // Reading strategy summary
    html += _renderReadingStrategyCard(rs);

    // Quick actions for planning
    html += _renderPlanningActions();

    return html;
  }

  function _renderReadingStrategyCard(rs) {
    var strategy = null;
    try {
      var S = R.readingStrategy;
      if (S && S.resolve) {
        strategy = S.resolve({ residency: rs }, null, rs.enrollments || []);
      }
    } catch (e) {}

    var label = "ترتیبی";
    var desc = "هر کتاب تا پایان، بعد کتاب بعدی";
    var mode = strategy ? strategy.mode : "sequential";

    var map = {
      sequential:              { l: "ترتیبی",           d: "هر کتاب تا پایان، بعد کتاب بعدی" },
      category_first:          { l: "درس‌به‌درس",        d: "هر درس کامل، بعد درس بعدی" },
      alternating_daily:       { l: "چرخشی روزانه",      d: "هر روز بین چند کتاب" },
      alternating_categories:  { l: "چرخشی بین درس‌ها",  d: "بین چند درس جابه‌جا شو" },
      balanced:                { l: "متعادل",            d: "پیشرفت چند کتاب نزدیک هم" },
      custom:                  { l: "سفارشی",            d: "ترتیب دلخواه تو" }
    };
    if (map[mode]) { label = map[mode].l; desc = map[mode].d; }

    var defaultSpeed = 20;
    try {
      if (rs.settings && rs.settings.defaultStudySpeed && rs.settings.defaultStudySpeed.pagesPerHour) {
        defaultSpeed = rs.settings.defaultStudySpeed.pagesPerHour;
      }
    } catch (e) {}

    return '<div class="r19-block">' +
      '<div class="r19-block-title"><span>📖 روش مطالعه</span></div>' +
      '<div class="r19-rs-mode">' + _esc(label) + '</div>' +
      '<div class="r19-rs-desc">' + _esc(desc) + '</div>' +
      '<div class="r19-rs-speed"><span>سرعت پیش‌فرض</span><strong>' + _fa(defaultSpeed) + ' صفحه/ساعت</strong></div>' +
      '<div class="r19-rs-hint">برای تغییر روش یا سرعت هر دور، از تب تنظیمات استفاده کن.</div>' +
    '</div>';
  }

  function _renderPlanningActions() {
    var hasPlanner = !!(R.plannerUI && R.plannerUI.open);
    var hasReplan = !!(R.plannerReplanUI && R.plannerReplanUI.open);
    var hasWorkspace = !!(R.plannerWorkspace && R.plannerWorkspace.open);

    var btns = [];
    if (hasPlanner)   btns.push({ id: "planner",   icon: "🚀", label: "تولید برنامه",   sub: "برنامه‌ی مطالعه بساز" });
    if (hasReplan)    btns.push({ id: "replan",    icon: "♻️", label: "بازبرنامه‌ریزی",  sub: "وقتی شرایط عوض شد" });
    if (hasWorkspace) btns.push({ id: "workspace", icon: "🎯", label: "میزکار",          sub: "نمای کامل برنامه" });

    if (btns.length === 0) return "";

    return '<div class="r19-dash-actions">' +
      '<div class="r19-dash-actions-title">⚡ کارهای اصلی' + _tipIcon('این دکمه‌ها کارهای اصلی برنامه‌ریزی هستن: تولید برنامه‌ی جدید، اصلاح برنامه‌ی فعلی وقتی شرایط عوض شده، دیدن کارهای امروز برای مرور، و باز کردن میزکار کامل.') + '</div>' +
      '<div class="r19-dash-actions-grid">' +
        btns.map(function (b) {
          return '<button class="r19-dash-action" type="button" data-r19-dash-action="' + _esc(b.id) + '">' +
            '<span class="r19-dash-action-icon">' + b.icon + '</span>' +
            '<div class="r19-dash-action-body">' +
              '<span class="r19-dash-action-label">' + _esc(b.label) + '</span>' +
              '<span class="r19-dash-action-sub">' + _esc(b.sub || "") + '</span>' +
            '</div>' +
          '</button>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* ─── TAB: تایم‌لاین ─── */
  var _TL_PALETTE = ["56,189,248","167,139,250","52,211,153","251,191,36","244,114,182","239,68,68","34,197,94","20,184,166","139,92,246","251,146,60"];

  function _tlDayNum(dateStr) {
    if (!dateStr || !LIB || !LIB.date) return null;
    var p = LIB.date.parseJalali(dateStr);
    if (!p) return null;
    return LIB.date.jalaliToDayNumber(p.jy, p.jm, p.jd);
  }

  function _renderTimelineGraphic(rs, planId) {
    if (!LIB || !LIB.date || !planId) return "";
    var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === planId; });
    if (rounds.length === 0) return "";
    rounds = rounds.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var plan = (rs.plans || []).find(function (p) { return p && p.id === planId; });
    var examDate = plan ? plan.examDate : null;

    var firstDay = null, lastDay = null;
    rounds.forEach(function (r) {
      var s = _tlDayNum(r.startDate); var e = _tlDayNum(r.endDate);
      if (s === null || e === null) return;
      if (firstDay === null || s < firstDay) firstDay = s;
      if (lastDay === null || e > lastDay) lastDay = e;
    });
    if (firstDay === null || lastDay === null) return "";
    var examDay = examDate ? _tlDayNum(examDate) : null;
    if (examDay !== null && (examDay - 1) > lastDay) lastDay = examDay - 1;
    var span = lastDay - firstDay + 1;
    if (span <= 0) return "";

    var html = "";
    html += '<div class="r19-tl-wrap">';
    html += '<div class="r19-tl-head">';
    html += '<span class="r19-tl-title">📍 تایم‌لاین دوره‌ها</span>';
    if (examDate) html += '<span class="r19-tl-exam">📅 آزمون: <strong>' + _esc(examDate) + '</strong></span>';
    html += '</div>';
    html += '<div class="r19-tl-rows">';

    rounds.forEach(function (r, i) {
      var s = _tlDayNum(r.startDate); var e = _tlDayNum(r.endDate);
      if (s === null || e === null) return;
      var offset = ((s - firstDay) / span) * 100;
      var width = ((e - s + 1) / span) * 100;
      if (width < 2) width = 2;
      var dur = e - s + 1;
      var color = _TL_PALETTE[i % _TL_PALETTE.length];
      var lock = (r.locked === true) ? ' 🔒' : '';
      var label = (width >= 8) ? (_esc(r.title) + lock) : '';
      html += '<div class="r19-tl-row">';
      html += '<div class="r19-tl-track">';
      html += '<button type="button" class="r19-tl-bar" data-r19-tl-round="' + _esc(r.id) + '" ';
      html += 'style="right:' + offset.toFixed(3) + '%;width:' + width.toFixed(3) + '%;background:rgba(' + color + ',.85)" ';
      html += 'title="' + _esc(r.title) + lock + ' — ' + _esc(r.startDate) + ' → ' + _esc(r.endDate) + '">';
      html += label + '</button>';
      html += '</div>';
      html += '<div class="r19-tl-meta">' + _faDate(r.startDate) + ' → ' + _faDate(r.endDate) + ' · ' + _fa(dur) + ' روز' + lock + '</div>';
      html += '</div>';
    });

    html += '</div>';
    html += '<div class="r19-tl-axis"><span>' + _faDate(rounds[0].startDate) + '</span>';
    if (examDate) html += '<span class="r19-tl-axis-exam">📅 ' + _esc(examDate) + '</span>';
    html += '</div>';
    html += '</div>';
    return html;
  }

  function _renderTimelineTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    var planId = rs.meta && rs.meta.activePlanId;
    html += _renderTimelineGraphic(rs, planId);
    html += _renderRoundsSection(rs);
    return html;
  }

  /* ─── TAB: تحلیل ─── */
  function _renderAnalysisTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    html += _renderKpiStrip(rs);
    html += _renderStudyStatusSummary(rs);
    html += _renderBaselineSummary(rs);
    return html;
  }

  /* ─── Study Status Slideshow ─── */
  var SLIDE_KEY = "internship-os.residency.slide.v1";

  function _getSlideIndex() {
    try {
      var v = parseInt(localStorage.getItem(SLIDE_KEY), 10);
      if (!isNaN(v) && v >= 0) return v;
    } catch (e) {}
    return -1; // -1 means "auto pick"
  }
  function _setSlideIndex(i) {
    try { localStorage.setItem(SLIDE_KEY, String(i)); } catch (e) {}
  }

  function _pickDefaultSlideIndex(rounds) {
    if (!rounds || rounds.length === 0) return 0;
    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    if (!today) return 0;
    // 1. Round containing today
    for (var i = 0; i < rounds.length; i++) {
      var r = rounds[i];
      if (!r.startDate || !r.endDate) continue;
      if (LIB.date.compareJalaliDate(r.startDate, today) <= 0 &&
          LIB.date.compareJalaliDate(today, r.endDate) <= 0) {
        return i;
      }
    }
    // 2. Nearest future round
    var bestIdx = -1, bestDays = Infinity;
    for (var j = 0; j < rounds.length; j++) {
      var rr = rounds[j];
      if (!rr.startDate) continue;
      var p = LIB.date.parseJalali(rr.startDate);
      var tp = LIB.date.parseJalali(today);
      if (!p || !tp) continue;
      var diff = LIB.date.jalaliToDayNumber(p.jy, p.jm, p.jd) -
                 LIB.date.jalaliToDayNumber(tp.jy, tp.jm, tp.jd);
      if (diff > 0 && diff < bestDays) { bestDays = diff; bestIdx = j; }
    }
    if (bestIdx !== -1) return bestIdx;
    // 3. Last round
    return rounds.length - 1;
  }

  function _computeRoundStats(rs, r) {
    var enrolls = (rs.enrollments || []).filter(function (e) {
      return e && e.roundId === r.id && e.mode !== "excluded";
    });

    var booksStats = [];
    var totalPages = 0, studiedPages = 0;

    enrolls.forEach(function (e) {
      var b = (rs.books || []).find(function (x) { return x && x.id === e.bookId; });
      if (!b) return;
      var target = Math.round((b.totalPages || 0) *
        ((e.targetCoveragePercent != null ? e.targetCoveragePercent : 100) / 100));
      var studied = 0;
      try {
        if (R.baseline && R.baseline.resolveForEnrollment) {
          var eb = R.baseline.resolveForEnrollment(e, b, rs.enrollments || [], rs.rounds || []);
          if (eb) studied = R.baseline.computePages(eb, b.totalPages || 0);
        }
      } catch (err) {}
      (rs.activities || []).forEach(function (a) {
        if (!a || a.bookId !== b.id || a.roundId !== r.id) return;
        if (a.status !== "completed" && a.status !== "partial") return;
        studied += (a.actualPages | 0);
      });
      studied = Math.min(studied, target);
      totalPages += target;
      studiedPages += studied;

      var subject = (rs.subjects || []).find(function (s) { return s && s.id === b.subjectId; });
      booksStats.push({
        id: b.id,
        title: b.title,
        icon: subject ? (subject.icon || "📖") : "📖",
        target: target,
        studied: studied,
        pct: target > 0 ? Math.round(studied / target * 100) : 0
      });
    });

    booksStats.sort(function (a, b) { return b.pct - a.pct; });

    return {
      round: r,
      books: booksStats,
      totalPages: totalPages,
      studiedPages: studiedPages,
      pct: totalPages > 0 ? Math.round(studiedPages / totalPages * 100) : 0
    };
  }

  function _renderRoundSlide(stats, roundIdx, totalRounds) {
    var r = stats.round;
    var daysLeft = 0;
    if (LIB && LIB.date && r.endDate) {
      var tp = LIB.date.parseJalali(LIB.date.todayJalaliString());
      var ep = LIB.date.parseJalali(r.endDate);
      if (tp && ep) {
        daysLeft = LIB.date.jalaliToDayNumber(ep.jy, ep.jm, ep.jd) -
                   LIB.date.jalaliToDayNumber(tp.jy, tp.jm, tp.jd);
      }
    }
    var daysLabel = daysLeft > 0 ? (_fa(daysLeft) + " روز باقی‌مانده") :
                    (daysLeft === 0 ? "امروز آخرین روز" : "تمام‌شده");

    var booksHTML = "";
    var maxShow = 4;
    stats.books.slice(0, maxShow).forEach(function (b) {
      booksHTML += '<div class="r19-slide-book">' +
        '<div class="r19-slide-book-head">' +
          '<span class="r19-slide-book-icon">' + _esc(b.icon) + '</span>' +
          '<span class="r19-slide-book-title">' + _esc(b.title) + '</span>' +
          '<span class="r19-slide-book-pct">' + _fa(b.pct) + '٪</span>' +
        '</div>' +
        '<div class="r19-slide-book-bar"><div class="r19-slide-book-fill" style="width:' + b.pct + '%"></div></div>' +
        '<div class="r19-slide-book-meta">' + _fa(b.studied) + ' / ' + _fa(b.target) + '</div>' +
      '</div>';
    });

    var more = "";
    if (stats.books.length > maxShow) {
      more = '<div class="r19-slide-more">+ ' + _fa(stats.books.length - maxShow) +
             ' کتاب دیگر در این دور</div>';
    }

    var dots = "";
    for (var i = 0; i < totalRounds; i++) {
      dots += '<span class="r19-slide-dot' + (i === roundIdx ? ' is-active' : '') + '"></span>';
    }

    return '<div class="r19-slide">' +
      '<div class="r19-slide-head">' +
        '<button class="r19-slide-nav" type="button" data-r19-slide-prev aria-label="قبلی">‹</button>' +
        '<div class="r19-slide-head-info">' +
          '<div class="r19-slide-title">' + _esc(r.title) + '</div>' +
          '<div class="r19-slide-days">' + _esc(daysLabel) + '</div>' +
        '</div>' +
        '<button class="r19-slide-nav" type="button" data-r19-slide-next aria-label="بعدی">›</button>' +
      '</div>' +
      '<div class="r19-slide-books">' + booksHTML + more + '</div>' +
      '<div class="r19-slide-footer">' +
        '<div class="r19-slide-pct-global">' + _fa(stats.pct) + '٪ از کل این دور</div>' +
        '<div class="r19-slide-dots">' + dots + '</div>' +
      '</div>' +
    '</div>';
  }

  function _renderStudyStatusSummary(rs) {
    var rounds = (rs.rounds || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    if (rounds.length === 0) {
      return '<div class="r19-block">' +
        '<div class="r19-block-title"><span>📈 وضعیت مطالعه</span></div>' +
        '<div class="r19-empty-inline">دوره‌ای تعریف نشده.</div>' +
      '</div>';
    }

    var idx = _getSlideIndex();
    if (idx < 0 || idx >= rounds.length) {
      idx = _pickDefaultSlideIndex(rounds);
      _setSlideIndex(idx);
    }

    var stats = _computeRoundStats(rs, rounds[idx]);
    var slideHTML = _renderRoundSlide(stats, idx, rounds.length);

    return '<div class="r19-block" data-r19-slideshow>' +
      '<div class="r19-block-title"><span>📈 وضعیت مطالعه</span></div>' +
      '<div data-r19-slide-index="' + idx + '">' + slideHTML + '</div>' +
    '</div>';
  }

  /* ─── Plans section for settings tab ─── */
  function _renderPlansSection(rs) {
    var plans = rs.plans || [];
    var activeId = rs.meta && rs.meta.activePlanId;

    var html = '<div class="r19-block">' +
      '<div class="r19-block-title">' +
        '<span>📋 برنامه‌ها</span>' +
        '<span class="r19-block-count">' + _fa(plans.length) + '</span>' +
      '</div>' +
      '<div class="r19-block-hint">فقط یک برنامه می‌تونه فعال باشه. برنامه‌های غیرفعال باقی می‌مونن ولی در Planner استفاده نمی‌شن.</div>';

    if (plans.length === 0) {
      html += '<div class="r19-empty-inline">هنوز برنامه‌ای نساختی.</div>';
      html += '<div style="margin-top:10px"><button class="r19-btn r19-btn-add-sm" type="button" data-r19-plan-new>➕ افزودن برنامه</button></div>';
      html += '</div>';
      return html;
    }

    html += '<div class="r19-plans-list">';

    plans.forEach(function (p) {
      if (!p) return;
      var isActive = p.id === activeId;
      var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === p.id; });
      var enrollCount = (rs.enrollments || []).filter(function (e) {
        return e && rounds.some(function (r) { return r.id === e.roundId; });
      }).length;

      var examText = p.examDate ? ('📅 آزمون: ' + _fa(p.examDate)) : 'بدون تاریخ آزمون';
      var meta = examText + ' · ' + _fa(rounds.length) + ' دور · ' + _fa(enrollCount) + ' اتصال';

      html += '<div class="r19-plan-card' + (isActive ? ' is-active' : '') + '">' +
        '<div class="r19-plan-card-head">' +
          '<div class="r19-plan-card-title">' + _esc(p.title) + '</div>' +
          (isActive ? '<span class="r19-plan-badge is-active">✓ فعال</span>' : '<span class="r19-plan-badge">غیرفعال</span>') +
        '</div>' +
        '<div class="r19-plan-card-meta">' + _esc(meta) + '</div>' +
        '<div class="r19-plan-card-actions">' +
          (!isActive ? '<button class="r19-btn r19-btn-add-sm" type="button" data-r19-plan-activate="' + _esc(p.id) + '">✓ فعال‌سازی</button>' : '') +
          '<button class="r19-mini" type="button" data-r19-plan-edit="' + _esc(p.id) + '" title="ویرایش">✏️</button>' +
          '<button class="r19-mini is-warn" type="button" data-r19-plan-delete="' + _esc(p.id) + '" title="حذف">🗑️</button>' +
        '</div>' +
      '</div>';
    });

    html += '</div>';
    html += '<div style="margin-top:10px"><button class="r19-btn r19-btn-add-sm" type="button" data-r19-plan-new>➕ افزودن برنامه</button></div>';
    html += '</div>';
    return html;
  }

  /* ─── Baseline cards for settings tab ─── */
  function _renderBaselineCardsForSettings(rs) {
    var books = rs.books || [];
    var enrolls = rs.enrollments || [];
    if (enrolls.length === 0) {
      return '<div class="r19-block">' +
        '<div class="r19-block-title"><span>📊 مطالعه‌ی اولیه</span></div>' +
        '<div class="r19-empty-inline">هنوز اتصالی بین کتاب و دور ثبت نشده.</div>' +
      '</div>';
    }

    // Group by book
    var byBook = {};
    enrolls.forEach(function (e) {
      if (!e) return;
      if (!byBook[e.bookId]) byBook[e.bookId] = [];
      byBook[e.bookId].push(e);
    });

    var bookIds = Object.keys(byBook);
    var html = '<div class="r19-block">' +
      '<div class="r19-block-title">' +
        '<span>📊 مطالعه‌ی اولیه</span>' +
        '<span class="r19-block-count">' + _fa(bookIds.length) + '</span>' +
      '</div>' +
      '<div class="r19-block-hint">میزان صفحاتی که از قبل خونده بودی — برای هر کتاب به‌صورت مستقل.</div>' +
      '<div class="r19-bl-list">';

    bookIds.forEach(function (bid) {
      var b = books.find(function (x) { return x && x.id === bid; });
      if (!b) return;
      var bookEnrolls = byBook[bid];
      var hasBaseline = bookEnrolls.some(function (e) { return e && e.initialStudyBaseline; });
      var baselineSum = 0;
      bookEnrolls.forEach(function (e) {
        if (!e || !e.initialStudyBaseline) return;
        try {
          if (R.baseline && R.baseline.computePages) {
            baselineSum += R.baseline.computePages(e.initialStudyBaseline, b.totalPages || 0);
          }
        } catch (err) {}
      });
      var pct = (b.totalPages || 0) > 0 ? Math.round(baselineSum / b.totalPages * 100) : 0;

      html += '<div class="r19-bl-row" data-r19-bl-book="' + _esc(bid) + '">' +
        '<div class="r19-bl-row-head">' +
          '<span class="r19-bl-row-title">' + _esc(b.title) + '</span>' +
          '<span class="r19-bl-row-pct">' + _fa(pct) + '٪</span>' +
        '</div>' +
        '<div class="r19-bl-row-bar"><div class="r19-bl-row-fill" style="width:' + pct + '%"></div></div>' +
        '<div class="r19-bl-row-meta">' + _fa(baselineSum) + ' از ' + _fa(b.totalPages || 0) + ' صفحه' +
          (hasBaseline ? '' : ' — <em>هنوز ثبت نشده</em>') +
        '</div>' +
      '</div>';
    });

    html += '</div></div>';
    return html;
  }

  /* ─── TAB: تنظیمات ─── */
  function _renderSettingsTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    html += _renderPlansSection(rs);
    html += _renderBaselineCardsForSettings(rs);
    html += _renderSubjectsSection(rs);
    html += _renderRoundsSection(rs);
    return html;
  }

  /* ─── امروز چی بخونم؟ (بخش جدید) ─── */
  function _renderTodayStudyRec(rs) {
    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    if (!today) return "";

    var acts = (rs.activities || []).filter(function (a) {
      return a && a.plannedDate === today
        && (a.status === "planned" || a.status === "in_progress");
    });

    if (acts.length === 0) {
      return '<div class="r19-today-study-rec is-empty">' +
        '<div class="r19-tsr-head">' +
          '<span class="r19-tsr-icon">📚</span>' +
          '<span class="r19-tsr-title">امروز چی بخونم؟</span>' +
        '</div>' +
        '<div class="r19-tsr-empty">برای امروز فعالیت مطالعه‌ای ثبت نشده.<br>' +
        'از تب «برنامه‌ریزی» می‌تونی برنامه تولید کنی.</div>' +
      '</div>';
    }

    acts.sort(function (a, b) {
      var at = a.plannedStartTime || "99:99";
      var bt = b.plannedStartTime || "99:99";
      return at.localeCompare(bt);
    });

    var top = acts[0];
    var book = (rs.books || []).find(function (b) { return b && b.id === top.bookId; });
    var bookTitle = book ? book.title : "—";
    var subject = book ? (rs.subjects || []).find(function (s) { return s && s.id === book.subjectId; }) : null;
    var subjectIcon = subject ? (subject.icon || "📖") : "📖";

    var pages = "";
    if (top.plannedPageStart && top.plannedPageEnd) {
      pages = "صفحات " + _fa(top.plannedPageStart) + " تا " + _fa(top.plannedPageEnd);
    } else if (top.plannedPages) {
      pages = _fa(top.plannedPages) + " صفحه";
    }

    var duration = top.plannedDurationMinutes ?
      ("حدود " + _fa(top.plannedDurationMinutes) + " دقیقه") : "";

    var meta = [pages, duration].filter(Boolean).join(" · ");

    var reasonText = "";
    if (top.reason && top.reason.text) reasonText = top.reason.text;

    var otherCount = acts.length - 1;
    var othersHTML = "";
    if (otherCount > 0) {
      othersHTML = '<div class="r19-tsr-others">';
      othersHTML += '<div class="r19-tsr-others-title">بقیه‌ی امروز (' + _fa(otherCount) + ')</div>';
      acts.slice(1, 4).forEach(function (a) {
        var b = (rs.books || []).find(function (x) { return x && x.id === a.bookId; });
        var dur = a.plannedDurationMinutes ? _fa(a.plannedDurationMinutes) + 'د' : '';
        othersHTML += '<div class="r19-tsr-other-row">' +
          '<span class="r19-tsr-other-dot">●</span>' +
          '<span class="r19-tsr-other-title">' + _esc(b ? b.title : "—") + '</span>' +
          (dur ? '<span class="r19-tsr-other-dur">' + dur + '</span>' : '') +
        '</div>';
      });
      if (otherCount > 3) {
        othersHTML += '<div class="r19-tsr-others-more">+ ' + _fa(otherCount - 3) + ' مورد دیگر</div>';
      }
      othersHTML += '</div>';
    }

    return '<div class="r19-today-study-rec">' +
      '<div class="r19-tsr-head">' +
        '<span class="r19-tsr-icon">📚</span>' +
        '<span class="r19-tsr-title">امروز چی بخونم؟</span>' +
        (otherCount > 0 ? '<span class="r19-tsr-count">' + _fa(acts.length) + ' فعالیت</span>' : '') +
      '</div>' +
      '<div class="r19-tsr-card">' +
        '<div class="r19-tsr-book-icon">' + _esc(subjectIcon) + '</div>' +
        '<div class="r19-tsr-body">' +
          '<div class="r19-tsr-book">' + _esc(bookTitle) + '</div>' +
          (meta ? '<div class="r19-tsr-meta">' + _esc(meta) + '</div>' : '') +
          (reasonText ? '<div class="r19-tsr-reason">' + _esc(reasonText) + '</div>' : '') +
        '</div>' +
      '</div>' +
      othersHTML +
    '</div>';
  }

  /* ═══ Phase 8: Replan Banner with reasons ═══ */
  function _renderReplanBanner(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    try {
      var RT = R.replanTrigger;
      if (!RT || !RT.getStatus) return "";
      var st = RT.getStatus(activePlanId);
      if (!st || !st.needed) return "";

      var reasons = (st.reasons || []).slice(0, 3);
      var reasonListHTML = reasons.map(function (r) {
        var ev = (r.events && r.events.length > 0) ? r.events[r.events.length - 1] : null;
        var desc = (RT && RT.describeEvent) ? RT.describeEvent(ev) : (r.reason || r.type || "تغییر");
        return '<li>• ' + _esc(desc) + '</li>';
      }).join("");

      var moreCount = st.count - reasons.length;
      var moreHTML = moreCount > 0
        ? '<li class="r19-rb-more">و ' + _fa(moreCount) + ' تغییر دیگر</li>'
        : "";

      return '<div class="r19-replan-banner">' +
        '<div class="r19-rb-icon">🔄</div>' +
        '<div class="r19-rb-body">' +
          '<div class="r19-rb-title">برنامه‌ات نیاز به بازبینی دارد</div>' +
          '<div class="r19-rb-sub">' + _fa(st.count) + ' تغییر روی برنامه اثر گذاشته:</div>' +
          '<ul class="r19-rb-reasons">' + reasonListHTML + moreHTML + '</ul>' +
        '</div>' +
        '<div class="r19-rb-actions">' +
          '<button class="r19-rb-cta" type="button" data-r19-open-replan>بررسی و اصلاح برنامه</button>' +
        '</div>' +
      '</div>';
    } catch (e) { return ""; }
  }

  /* ═══ Phase 8: Baseline Summary ═══ */
  function _renderBaselineSummary(rs) {
    var books = rs.books || [];
    var enrs = rs.enrollments || [];
    var totalPages = 0;
    var baselinePages = 0;
    var booksWithBaseline = 0;
    var booksTotal = books.length;

    books.forEach(function (b) { totalPages += (b.totalPages || 0); });

    try {
      if (R.baseline) {
        enrs.forEach(function (e) {
          if (!e || !e.initialStudyBaseline) return;
          var book = books.find(function (b) { return b && b.id === e.bookId; });
          if (!book) return;
          var p = R.baseline.computePages(e.initialStudyBaseline, book.totalPages || 0);
          if (p > 0) booksWithBaseline++;
          baselinePages += p;
        });
      }
    } catch (e) {}

    // Dedupe booksWithBaseline (same book may have multiple enrollments)
    var seenBooks = {};
    try {
      enrs.forEach(function (e) {
        if (!e || !e.initialStudyBaseline) return;
        var book = books.find(function (b) { return b && b.id === e.bookId; });
        if (!book) return;
        var p = R.baseline.computePages(e.initialStudyBaseline, book.totalPages || 0);
        if (p > 0) seenBooks[book.id] = 1;
      });
    } catch (e) {}
    booksWithBaseline = Object.keys(seenBooks).length;

    if (baselinePages > 0) {
      var pct = totalPages > 0 ? Math.round(baselinePages / totalPages * 100) : 0;
      return '<div class="r19-baseline-summary">' +
        '<div class="r19-bs-icon">📚</div>' +
        '<div class="r19-bs-body">' +
          '<div class="r19-bs-title">مطالعه اولیه‌ات ثبت شده</div>' +
          '<div class="r19-bs-desc">' +
            _fa(baselinePages) + ' صفحه از قبل خوانده‌شده · ' +
            _fa(booksWithBaseline) + ' از ' + _fa(booksTotal) + ' کتاب دارای سابقه' +
          '</div>' +
          '<div class="r19-bs-bar"><div class="r19-bs-fill" style="width:' + pct + '%"></div></div>' +
        '</div>' +
      '</div>';
    }

    // No baseline yet
    return '<div class="r19-baseline-summary is-empty">' +
      '<div class="r19-bs-icon">📚</div>' +
      '<div class="r19-bs-body">' +
        '<div class="r19-bs-title">مطالعه اولیه‌ات ثبت نشده</div>' +
        '<div class="r19-bs-desc">اگه قبل از شروع برنامه چیزی خونده‌ای، اینجا ثبت کن تا برنامه‌ریزی دقیق‌تر بشه.</div>' +
      '</div>' +
      '<button class="r19-bs-cta" type="button" data-r19-bs-open-first>ثبت میزان مطالعه</button>' +
    '</div>';
  }

  /* ═══ Phase 8: Today widgets (Capacity + Windows) ═══ */
  function _renderTodayWidgets(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";

    var LIB = window.InternshipLib;
    var today = LIB && LIB.date ? LIB.date.todayJalaliString() : "";
    if (!today) return "";

    var st = _state();
    if (!st) return "";

    var html = '<div class="r19-today-widgets">';

    // ─── Capacity card ───
    try {
      var ctx = R.calendar && R.calendar.getResidencyDayContext
        ? R.calendar.getResidencyDayContext(today, activePlanId)
        : null;
      if (ctx) {
        var productive = ctx.finalCapacityMinutes || 0;
        var rawCap = ctx.rawCapacityMinutes || 0;
        var avail = ctx.timeAvailabilityMinutes != null ? ctx.timeAvailabilityMinutes : productive;

        // ─── B12: تسک‌های زمان‌دار کاربر (manual) را خودم حساب کن ───
        try {
          var userTimedMin = (st.tasks || []).filter(function (t) {
            return t && !t.completed && t.date === today
              && t.sourceType !== "residency_activity"
              && (t.durationMinutes > 0);
          }).reduce(function (s, t) { return s + (t.durationMinutes || 0); }, 0);

          var ctxOccupied = ctx.timedOccupiedMinutes || 0;

          // اگه calendar تسک‌ها رو ندیده، اینجا جبران کن
          if (userTimedMin > 0 && ctxOccupied < userTimedMin) {
            var extra = userTimedMin - ctxOccupied;
            avail = Math.max(0, avail - extra);
          }
        } catch (e) { console.warn("[capacity] user-tasks calc failed:", e); }

        var feasible = Math.min(productive, avail);

        var reason = "";
        try {
          var _userMin = 0;
          (st.tasks || []).forEach(function (t) {
            if (!t || t.completed || t.date !== today) return;
            if (t.sourceType === "residency_activity") return;
            if (!(t.durationMinutes > 0)) return;
            _userMin += (t.durationMinutes || 0);
          });
          if (_userMin > 0) {
            var hh = Math.floor(_userMin / 60);
            var mm = _userMin % 60;
            var label = hh > 0 && mm > 0 ? (hh + " ساعت و " + mm + " دقیقه")
                      : (hh > 0 ? (hh + " ساعت") : (mm + " دقیقه"));
            reason = "امروز " + label + " از وقتت پره کارهای زمان‌دار — این زمان از ظرفیت مطالعه کم شده.";
          } else if (productive > 0 && avail < productive) {
            reason = "بخشی از ظرفیت امروز پره.";
          }
        } catch (e) {}

        var fmt = function (m) { return _fa(Math.floor(m / 60)) + ":" + _fa(String(m % 60).padStart(2, "0")); };

        html += '<div class="r19-today-card">' +
          '<div class="r19-tc-title">⏱️ ظرفیت امروز</div>' +
          '<div class="r19-tc-row">' +
            '<span>قابل برنامه‌ریزی' + _tipIcon('این مقداری‌ست که امروز واقعاً می‌تونی روش برنامه‌ریزی کنی. حداقلِ «ظرفیت مفید» و «زمان قابل استفاده» است.') + '</span>' +
            '<strong>' + fmt(feasible) + '</strong>' +
          '</div>' +
          '<div class="r19-tc-row is-sub">' +
            '<span>ظرفیت مفید' + _tipIcon('زمانی که بر اساس نوع روز (عادی/تعطیل/کشیک) و چرخش‌ها برات حساب می‌شه — بدون توجه به کارهای دیگه.') + '</span>' +
            '<span>' + fmt(productive) + '</span>' +
          '</div>' +
          '<div class="r19-tc-row is-sub">' +
            '<span>زمان قابل استفاده' + _tipIcon('ظرفیت خام منهای زمانی که تسک‌های دیگه (بالین، پروژه، ورزش و...) ازت می‌گیرن.') + '</span>' +
            '<span>' + fmt(avail) + '</span>' +
          '</div>' +
          (reason ? '<div class="r19-tc-hint">' + reason + '</div>' : '') +
        '</div>';
      }
    } catch (e) {}

    // ─── Windows card ───
    try {
      var AE = R.availabilityEngine;
      if (AE && AE.findFreeWindowsFromState) {
        var windows = AE.findFreeWindowsFromState(today, st, { minWindowMinutes: 30 });
        var listHTML;
        if (windows.length === 0) {
          listHTML = '<div class="r19-tw-empty">امروز پنجره‌ی آزاد قابل استفاده‌ای نداری.</div>';
        } else {
          listHTML = windows.slice(0, 4).map(function (w) {
            return '<div class="r19-tw-row">' +
              '<span class="r19-tw-time">' + _fa(w.start) + '–' + _fa(w.end) + '</span>' +
              '<span class="r19-tw-dur">' + _fa(w.minutes) + ' دقیقه</span>' +
            '</div>';
          }).join("");
          if (windows.length > 4) {
            listHTML += '<div class="r19-tw-more">و ' + _fa(windows.length - 4) + ' پنجره دیگر</div>';
          }
        }
        html += '<div class="r19-today-card">' +
          '<div class="r19-tc-title">🪟 پنجره‌های آزاد امروز</div>' +
          listHTML +
        '</div>';
      }
    } catch (e) {}

    html += '</div>';
    return html;
  }

  /* ─── هدر: برنامه‌ی فعال ─── */
  function _renderHeader(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    var plan = activePlanId ? (rs.plans || []).find(function (p) { return p && p.id === activePlanId; }) : null;
    var plansCount = (rs.plans || []).length;

    if (!plan) {
      return '<div class="r19-dash-banner is-empty">' +
        '<span class="r19-dash-banner-icon">📌</span>' +
        '<div class="r19-dash-banner-body">' +
          '<div class="r19-dash-banner-title">برنامه‌ی فعال نداری</div>' +
          '<div class="r19-dash-banner-desc">' +
            (plansCount > 0
              ? 'یکی از برنامه‌هات رو انتخاب کن یا برنامه‌ی جدید بساز.'
              : 'اولین برنامه‌ات رو بساز تا شروع کنیم.') +
          '</div>' +
        '</div>' +
        '<button class="r19-btn r19-btn-primary" type="button" data-r19-dash-new-plan>➕ برنامه‌ی جدید</button>' +
      '</div>';
    }

    var examInfo = plan.examDate ? _examCountdown(plan.examDate) : null;

    // ─── Day type badge ───
    var dayTypeHTML = "";
    try {
      var LIB = window.InternshipLib;
      var today = LIB && LIB.date ? LIB.date.todayJalaliString() : "";
      if (today && R.calendar && R.calendar.getResidencyDayContext) {
        var ctx = R.calendar.getResidencyDayContext(today, plan.id);
        if (ctx && ctx.dayType) {
          var map = {
            normal: { icon: "🌤️", label: "روز عادی", cls: "" },
            free:   { icon: "🏖️", label: "روز تعطیل", cls: "is-free" },
            shift:  { icon: "🚨", label: "روز کشیک", cls: "is-shift" },
            pre_shift:  { icon: "⏪", label: "قبل کشیک", cls: "is-shift" },
            post_shift: { icon: "😴", label: "بعد کشیک", cls: "is-shift" },
            off:    { icon: "⛔", label: "تعطیل", cls: "is-free" }
          };
          var m = map[ctx.dayType] || map.normal;
          dayTypeHTML = '<div class="r19-day-type-badge ' + m.cls + '">' +
            '<span>' + m.icon + '</span>' +
            '<span>امروز: ' + m.label + '</span>' +
          '</div>';
        }
      }
    } catch (e) {}

    return '<div class="r19-dash-banner">' +
      '<span class="r19-dash-banner-icon">📌</span>' +
      '<div class="r19-dash-banner-body">' +
        '<div class="r19-dash-banner-label">برنامه‌ی فعال</div>' +
        '<div class="r19-dash-banner-title">' + _esc(plan.title) + '</div>' +
        (examInfo
          ? '<div class="r19-dash-banner-desc">📅 آزمون: ' + _fa(plan.examDate) + ' — ' + examInfo + '</div>'
          : '<div class="r19-dash-banner-desc">تاریخ آزمون تعیین نشده</div>') +
      '</div>' +
      dayTypeHTML +
      '<div class="r19-dash-banner-actions">' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19-dash-switch-plan>تعویض برنامه</button>' +
        '<button class="r19-btn r19-btn-ghost" type="button" data-r19-dash-edit-plan>✏️ ویرایش</button>' +
      '</div>' +
    '</div>';
  }

  function _examCountdown(examDate) {
    if (!LIB || !LIB.date) return "";
    var today = LIB.date.todayJalaliString();
    var pt = LIB.date.parseJalali(today);
    var pe = LIB.date.parseJalali(examDate);
    if (!pt || !pe) return "";
    var days = LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) - LIB.date.jalaliToDayNumber(pt.jy, pt.jm, pt.jd);
    if (days < 0) return "گذشته";
    if (days === 0) return "امروز!";
    return _fa(days) + " روز مونده";
  }

  /* ─── نوار KPI ─── */
  function _renderKpiStrip(rs) {
    var subjects = (rs.subjects || []);
    var books = (rs.books || []);
    var rounds = (rs.rounds || []);
    var totalPages = books.reduce(function (sum, b) { return sum + (b.totalPages || 0); }, 0);

    // ─── Baseline total ───
    var baselineTotal = 0;
    try {
      if (R.baseline) {
        (rs.enrollments || []).forEach(function (e) {
          if (!e || !e.initialStudyBaseline) return;
          var book = books.find(function (b) { return b && b.id === e.bookId; });
          if (!book) return;
          baselineTotal += R.baseline.computePages(e.initialStudyBaseline, book.totalPages || 0);
        });
      }
    } catch (e) {}

    var baselinePct = totalPages > 0 ? Math.round(baselineTotal / totalPages * 100) : 0;
    var baselineSub = totalPages > 0
      ? _fa(baselineTotal) + " از " + _fa(totalPages)
      : "";

    return '<div class="r19-dash-kpi">' +
      _kpiTile("📚", "موضوع", _fa(subjects.length), subjects.slice(0, 3).map(function (s) { return s.icon || "•"; }).join(" ")) +
      _kpiTile("📖", "کتاب", _fa(books.length), _fa(totalPages) + " صفحه") +
      _kpiTile("📅", "دوره", _fa(rounds.length), "") +
      _kpiTile("📊", "مطالعه اولیه", _fa(baselinePct) + "٪", baselineSub) +
    '</div>';
  }

  function _kpiTile(icon, label, value, sub) {
    return '<div class="r19-dash-kpi-tile">' +
      '<span class="r19-dash-kpi-icon">' + icon + '</span>' +
      '<div class="r19-dash-kpi-body">' +
        '<div class="r19-dash-kpi-label">' + _esc(label) + '</div>' +
        '<div class="r19-dash-kpi-value">' + _esc(value) + '</div>' +
        (sub ? '<div class="r19-dash-kpi-sub">' + _esc(sub) + '</div>' : '') +
      '</div>' +
    '</div>';
  }

  /* ─── اکشن‌های سریع ─── */
  function _renderQuickActions() {
    var hasPlanner = !!(R.plannerUI && R.plannerUI.open);
    var hasReplan = !!(R.plannerReplanUI && R.plannerReplanUI.open);
    var hasReview = !!(R.reviewUI && R.reviewUI.open);
    var hasWorkspace = !!(R.plannerWorkspace && R.plannerWorkspace.open);
    var hasContent = !!(R.contentUI && R.contentUI.open);

    var btns = [];
    if (hasPlanner)   btns.push({ id: "planner",   icon: "🚀", label: "برنامه‌ریزی", sub: "برنامه‌ی مطالعه بساز" });
    if (hasReplan)    btns.push({ id: "replan",    icon: "♻️", label: "اصلاح برنامه", sub: "وقتی کشیک یا زمانت تغییر کرده" });
    if (hasReview)    btns.push({ id: "review",    icon: "🔁", label: "مرور", sub: "کارهای امروز برای مرور" });
    if (hasWorkspace) btns.push({ id: "workspace", icon: "🎯", label: "میزکار", sub: "نمای کامل برنامه" });
    if (hasContent)   btns.push({ id: "content",   icon: "📖", label: "محتوا", sub: "تولید محتوای مطالعه" });

    if (btns.length === 0) return "";

    return '<div class="r19-dash-actions">' +
      '<div class="r19-dash-actions-title">⚡ اکشن‌های سریع</div>' +
      '<div class="r19-dash-actions-grid">' +
        btns.map(function (b) {
          return '<button class="r19-dash-action" type="button" data-r19-dash-action="' + _esc(b.id) + '">' +
            '<span class="r19-dash-action-icon">' + b.icon + '</span>' +
            '<div class="r19-dash-action-body">' +
              '<span class="r19-dash-action-label">' + _esc(b.label) + '</span>' +
              '<span class="r19-dash-action-sub">' + _esc(b.sub || "") + '</span>' +
            '</div>' +
          '</button>';
        }).join("") +
      '</div>' +
    '</div>';
  }

  /* ─── موضوع‌ها ─── */
  function _renderSubjectsSection(rs) {
    var subjects = (rs.subjects || []);
    var html = '<div class="r19-dash-section">' +
      '<div class="r19-dash-section-head">' +
        '<div class="r19-dash-section-title">📚 موضوع‌ها (' + _fa(subjects.length) + ')</div>' +
        '<button class="r19-btn r19-btn-add-sm" type="button" data-r19-dash-add-subject>➕ افزودن</button>' +
      '</div>';

    if (subjects.length === 0) {
      html += '<div class="r19-dash-empty-sm">هنوز موضوعی نساختی.</div>';
    } else {
      html += '<div class="r19-dash-list">';
      subjects.forEach(function (s) {
        var booksOfSubject = (rs.books || []).filter(function (b) { return b && b.subjectId === s.id; });
        html += '<div class="r19-dash-item" data-r19-dash-subject="' + _esc(s.id) + '">' +
          '<span class="r19-dash-item-icon">' + _esc(s.icon || "📚") + '</span>' +
          '<div class="r19-dash-item-body">' +
            '<div class="r19-dash-item-title">' + _esc(s.title) + '</div>' +
            '<div class="r19-dash-item-meta">' + _fa(booksOfSubject.length) + ' کتاب</div>' +
          '</div>' +
          '<div class="r19-dash-item-actions">' +
            '<button class="r19-mini" type="button" data-r19-dash-edit-subject="' + _esc(s.id) + '">✏️</button>' +
            '<button class="r19-mini is-warn" type="button" data-r19-dash-delete-subject="' + _esc(s.id) + '">🗑️</button>' +
          '</div>' +
        '</div>';

        // نمایش کتاب‌های این موضوع
        booksOfSubject.forEach(function (b) {
          html += '<div class="r19-dash-subitem" data-r19-dash-book="' + _esc(b.id) + '">' +
            '<span class="r19-dash-subitem-icon">📖</span>' +
            '<div class="r19-dash-subitem-body">' +
              '<span class="r19-dash-subitem-title">' + _esc(b.title) + '</span>' +
              '<span class="r19-dash-subitem-meta">' + _fa(b.totalPages || 0) + ' صفحه</span>' +
            '</div>' +
            '<div class="r19-dash-item-actions">' +
              '<button class="r19-mini" type="button" data-r19-dash-edit-book="' + _esc(b.id) + '">✏️</button>' +
              '<button class="r19-mini is-warn" type="button" data-r19-dash-delete-book="' + _esc(b.id) + '">🗑️</button>' +
            '</div>' +
          '</div>';
        });

        // دکمه افزودن کتاب
        html += '<div class="r19-dash-subitem-add">' +
          '<button class="r19-mini-add" type="button" data-r19-dash-add-book="' + _esc(s.id) + '">➕ افزودن کتاب به این موضوع</button>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  /* ─── دوره‌ها ─── */
  function _renderRoundsSection(rs) {
    var rounds = (rs.rounds || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    var html = '<div class="r19-dash-section">' +
      '<div class="r19-dash-section-head">' +
        '<div class="r19-dash-section-title">📅 دوره‌ها (' + _fa(rounds.length) + ')</div>' +
        '<div class="r19-dash-section-actions">' +
          '<button class="r19-btn r19-btn-ghost-sm" type="button" data-r19-redistribute-all title="همه‌ی دوره‌ها رو زنجیروار مرتب می‌کنه">🧹 بازچینی</button><button class="r19-btn r19-btn-ghost-sm" type="button" data-r19-dash-manage-enroll>🔗 اتصال‌ها</button>' +
          '<button class="r19-btn r19-btn-ghost-sm" type="button" data-r19-regenerate-all title="تاریخ دوره‌ها را با الگوریتم اولیه Wizard بازتولید می‌کند">🌀 بازتولید زمان‌بندی</button>' +
          '<button class="r19-btn r19-btn-add-sm" type="button" data-r19-dash-add-round>➕ افزودن</button>' +
        '</div>' +
      '</div>';

    if (rounds.length === 0) {
      html += '<div class="r19-dash-empty-sm">هنوز دوره‌ای نساختی.</div>';
    } else {
      html += '<div class="r19-dash-list">';
      rounds.forEach(function (r, i) {
        var roundBooks = (rs.enrollments || []).filter(function (e) {
          return e && e.roundId === r.id && e.mode !== "excluded";
        }).length;
        var dayInfo = _roundDays(r);
        var lockIcon = (r.locked === true) ? '<span class="r19-lock-icon" title="قفل‌شده">🔒</span> ' : '';
        html += '<div class="r19-dash-item">' +
          '<span class="r19-dash-item-num">' + _fa(i + 1) + '</span>' +
          '<div class="r19-dash-item-body">' +
            '<div class="r19-dash-item-title">' + lockIcon + _esc(r.title) + '</div>' +
            '<div class="r19-dash-item-meta">' +
              _faDate(r.startDate) + ' → ' + _faDate(r.endDate) +
              (dayInfo ? ' · ' + dayInfo : '') +
              ' · ' + _fa(roundBooks) + ' کتاب' +
            '</div>' +
          '</div>' +
          '<div class="r19-dash-item-actions">' +
            '<button class="r19-mini" type="button" data-r19-dash-edit-round="' + _esc(r.id) + '">✏️</button>' +
            '<button class="r19-mini is-warn" type="button" data-r19-dash-delete-round="' + _esc(r.id) + '">🗑️</button>' +
          '</div>' +
        '</div>';
      });
      html += '</div>';
    }
    html += '</div>';
    return html;
  }

  function _roundDays(r) {
    if (!LIB || !LIB.date) return "";
    var ps = LIB.date.parseJalali(r.startDate);
    var pe = LIB.date.parseJalali(r.endDate);
    if (!ps || !pe) return "";
    var days = LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) - LIB.date.jalaliToDayNumber(ps.jy, ps.jm, ps.jd) + 1;
    return _fa(days) + " روز";
  }

  /* ─── wiring ─── */
  function _wire(container) {
    // ─── B8: Plan management ───
    container.querySelectorAll("[data-r19-tl-round]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-tl-round");
        if (id && R.residencyManagers && R.residencyManagers.openRoundEditor) {
          R.residencyManagers.openRoundEditor(id);
        }
      });
    });
    container.querySelectorAll("[data-r19-redistribute-all]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = _state();
        var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
        if (!pid) return;
        if (R.residencyManagers && R.residencyManagers.redistributeAll) {
          R.residencyManagers.redistributeAll(pid);
        }
      });
    });
    container.querySelectorAll("[data-r19-regenerate-all]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = _state();
        var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
        if (!pid) return;
        if (R.residencyManagers && R.residencyManagers.regenerateFromWizard) {
          R.residencyManagers.regenerateFromWizard(pid);
        }
      });
    });
    container.querySelectorAll("[data-r19-plan-new]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.residencyManagers) R.residencyManagers.openPlanManager();
      });
    });
    container.querySelectorAll("[data-r19-plan-activate]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-plan-activate");
        if (!id || !R.store || !R.store.setActivePlan) return;
        R.store.setActivePlan(id);
        try { if (R.replanTrigger && R.replanTrigger.clearAll) R.replanTrigger.clearAll(); } catch (e) {}
        _saveAndRender();
        try {
          var N = R.notify;
          if (N) N.success("برنامه فعال شد.");
        } catch (e) {}
      });
    });
    container.querySelectorAll("[data-r19-plan-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-plan-edit");
        if (R.residencyManagers) R.residencyManagers.openPlanEditor(id);
      });
    });
    container.querySelectorAll("[data-r19-plan-delete]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-r19-plan-delete");
        var s = _state();
        var rs = s && s.residency;
        if (!rs || !id) return;
        var plan = (rs.plans || []).find(function (p) { return p && p.id === id; });
        if (!plan) return;

        var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === id; });
        var enrollCount = (rs.enrollments || []).filter(function (e) {
          return e && rounds.some(function (r) { return r.id === e.roundId; });
        }).length;
        var actCount = (rs.activities || []).filter(function (a) {
          return a && (a.planId === id || rounds.some(function (r) { return r.id === a.roundId; }));
        }).length;

        var isActive = rs.meta && rs.meta.activePlanId === id;
        var msg = 'حذف برنامه «' + plan.title + '»؟\n\n';
        msg += 'با این کار حذف می‌شن:\n';
        msg += '• ' + rounds.length + ' دور\n';
        msg += '• ' + enrollCount + ' اتصال کتاب به دور\n';
        if (actCount > 0) msg += '• ' + actCount + ' فعالیت ثبت‌شده\n';
        msg += '\nاین کار قابل بازگشت نیست.';
        if (isActive) msg += '\n\n(برنامه فعال بود — یکی از برنامه‌های باقی‌مونده خودکار فعال می‌شه.)';

        if (!confirm(msg)) return;

        if (R.residencyManagers && R.residencyManagers.confirmDelete) {
          var _origConfirm = window.confirm;
          window.confirm = function () { return true; };
          try {
            R.residencyManagers.confirmDelete("plan", id);
          } finally {
            window.confirm = _origConfirm;
          }
          _saveAndRender();
          try {
            var N = R.notify;
            if (N) N.success("برنامه حذف شد.");
          } catch (e) {}
        }
      });
    });
    // ─── /B8 ───
    // برنامه
    container.querySelectorAll("[data-r19-dash-new-plan]").forEach(function (b) {
      b.addEventListener("click", function () { if (R.residencyManagers) R.residencyManagers.openPlanManager(); });
    });
    container.querySelectorAll("[data-r19-dash-edit-plan]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = _state();
        var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
        if (pid && R.residencyManagers) R.residencyManagers.openPlanEditor(pid);
      });
    });
    container.querySelectorAll("[data-r19-dash-switch-plan]").forEach(function (b) {
      b.addEventListener("click", function () {
        var s = _state();
        var plans = (s && s.residency && s.residency.plans) || [];
        if (plans.length <= 1) { _notify("info", "فقط یه برنامه داری."); return; }
        var current = s.residency.meta.activePlanId;
        var next = plans.find(function (p) { return p.id !== current && p.status !== "archived"; });
        if (next) {
          R.store.setActivePlan(next.id);
          _saveAndRender();
        }
      });
    });

    // موضوع
    container.querySelectorAll("[data-r19-dash-add-subject]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openSubjectManager(); });
    });
    container.querySelectorAll("[data-r19-dash-edit-subject]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openSubjectEditor(b.getAttribute("data-r19-dash-edit-subject")); });
    });
    container.querySelectorAll("[data-r19-dash-delete-subject]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.residencyManagers.confirmDelete("subject", b.getAttribute("data-r19-dash-delete-subject"))) {
          _saveAndRender();
        }
      });
    });

    // کتاب
    container.querySelectorAll("[data-r19-dash-add-book]").forEach(function (b) {
      b.addEventListener("click", function () {
        R.residencyManagers.openBookManager();
      });
    });
    container.querySelectorAll("[data-r19-dash-edit-book]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openBookEditor(b.getAttribute("data-r19-dash-edit-book")); });
    });
    container.querySelectorAll("[data-r19-dash-delete-book]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.residencyManagers.confirmDelete("book", b.getAttribute("data-r19-dash-delete-book"))) {
          _saveAndRender();
        }
      });
    });

    // دوره
    container.querySelectorAll("[data-r19-dash-add-round]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openRoundManager(); });
    });
    container.querySelectorAll("[data-r19-dash-edit-round]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openRoundEditor(b.getAttribute("data-r19-dash-edit-round")); });
    });
    container.querySelectorAll("[data-r19-dash-delete-round]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.residencyManagers.confirmDelete("round", b.getAttribute("data-r19-dash-delete-round"))) {
          _saveAndRender();
        }
      });
    });
    container.querySelectorAll("[data-r19-dash-manage-enroll]").forEach(function (b) {
      b.addEventListener("click", function () { R.residencyManagers.openEnrollmentManager(); });
    });

    // ─── B4b: Slideshow ───
    _wireSlideshow(container);

    // ─── Phase 7: baseline editor + replan badge ───
    container.querySelectorAll("[data-r19-dash-edit-baseline]").forEach(function (b) {
      b.addEventListener("click", function () {
        var enrId = b.getAttribute("data-r19-dash-edit-baseline");
        if (typeof window.openBaselineEditor === "function") {
          window.openBaselineEditor(enrId);
        } else if (typeof openBaselineEditor === "function") {
          openBaselineEditor(enrId);
        }
      });
    });
    container.querySelectorAll("[data-r19-open-replan]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!R.plannerReplanUI || !R.plannerReplanUI.open) return;
        var s = _state();
        var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;

        var LO = R.loading;
        if (LO && LO.defer) {
          LO.defer("در حال آماده‌سازی بازبرنامه‌ریزی...", function () {
            R.plannerReplanUI.open(pid);
          }, { sub: "بررسی تغییرات و ظرفیت" })
          .catch(function (e) { console.warn("[replan]", e); });
        } else {
          R.plannerReplanUI.open(pid);
        }
      });
    });
    container.querySelectorAll("[data-r19-bs-open-first]").forEach(function (b) {
      b.addEventListener("click", function () {
        // Find first book with no baseline
        var s = _state();
        var rs = s && s.residency;
        if (!rs) return;
        var books = rs.books || [];
        var enrs = rs.enrollments || [];
        for (var i = 0; i < enrs.length; i++) {
          if (enrs[i] && !enrs[i].initialStudyBaseline) {
            if (typeof window.openBaselineEditor === "function") {
              window.openBaselineEditor(enrs[i].id);
              return;
            }
          }
        }
        if (enrs.length > 0 && typeof window.openBaselineEditor === "function") {
          window.openBaselineEditor(enrs[0].id);
        } else {
          _notify("info", "هیچ کتابی برای ثبت مطالعه اولیه وجود ندارد.");
        }
      });
    });

    // اکشن‌های سریع
    container.querySelectorAll("[data-r19-dash-action]").forEach(function (b) {
      b.addEventListener("click", function () {
        var action = b.getAttribute("data-r19-dash-action");
        var s = _state();
        var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
        if (action === "planner" && R.plannerUI) R.plannerUI.open(pid);
        else if (action === "replan" && R.plannerReplanUI) R.plannerReplanUI.open(pid);
        else if (action === "review" && R.reviewUI) R.reviewUI.open();
        else if (action === "workspace" && R.plannerWorkspace) R.plannerWorkspace.open();
        else if (action === "content" && R.contentUI) R.contentUI.open();
      });
    });
  }

  function _saveAndRender() {
    if (window.__os && window.__os.saveState) { try { window.__os.saveState(); } catch (e) {} }
    if (window.__os && window.__os.render) window.__os.render();
  }

  function _wireSlideshow(container) {
    var wrap = container.querySelector("[data-r19-slideshow]");
    if (!wrap) return;
    var idxEl = wrap.querySelector("[data-r19-slide-index]");
    if (!idxEl) return;
    var currentIdx = parseInt(idxEl.getAttribute("data-r19-slide-index"), 10) || 0;

    var s = _state();
    var rs = s && s.residency;
    if (!rs) return;
    var rounds = (rs.rounds || []).slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
    if (rounds.length === 0) return;

    function go(newIdx) {
      if (newIdx < 0) newIdx = rounds.length - 1;
      if (newIdx >= rounds.length) newIdx = 0;
      _setSlideIndex(newIdx);
      var stats = _computeRoundStats(rs, rounds[newIdx]);
      idxEl.setAttribute("data-r19-slide-index", String(newIdx));
      idxEl.innerHTML = _renderRoundSlide(stats, newIdx, rounds.length);
      _wireSlideshow(container);
    }

    var prev = wrap.querySelector("[data-r19-slide-prev]");
    if (prev) prev.addEventListener("click", function () { go(currentIdx - 1); });
    var next = wrap.querySelector("[data-r19-slide-next]");
    if (next) next.addEventListener("click", function () { go(currentIdx + 1); });
  }

  (function _injectTimelineCSS() {
    if (document.getElementById("r19-tl-css")) return;
    var st = document.createElement("style");
    st.id = "r19-tl-css";
    st.textContent = ".r19-tl-wrap{margin:14px 0;padding:14px 16px;background:var(--surface-1,#1a1f2a);border:1px solid var(--border,rgba(148,163,184,.15));border-radius:12px}" +
      ".r19-tl-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;font-size:13px;flex-wrap:wrap;gap:6px}" +
      ".r19-tl-title{font-weight:700}" +
      ".r19-tl-exam{color:var(--text-muted,#94a3b8);font-size:12px}" +
      ".r19-tl-rows{display:flex;flex-direction:column;gap:8px}" +
      ".r19-tl-row{display:flex;flex-direction:column;gap:2px}" +
      ".r19-tl-track{position:relative;height:26px;background:rgba(148,163,184,.08);border-radius:6px}" +
      ".r19-tl-bar{position:absolute;top:3px;bottom:3px;border:none;border-radius:5px;color:#fff;font-size:11px;font-family:inherit;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 6px;text-align:right}" +
      ".r19-tl-bar:hover{filter:brightness(1.12)}" +
      ".r19-tl-meta{font-size:11px;color:var(--text-muted,#94a3b8);padding-right:2px}" +
      ".r19-tl-axis{display:flex;justify-content:space-between;margin-top:10px;font-size:11px;color:var(--text-dim,#64748b);border-top:1px dashed rgba(148,163,184,.2);padding-top:8px}" +
      ".r19-tl-axis-exam{color:var(--text-muted,#94a3b8)}";
    document.head.appendChild(st);
  })();
  console.log("[residency.dashboard.v19] loaded");
})();