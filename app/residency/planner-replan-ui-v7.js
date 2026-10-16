/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Replan UI v7.5 (Advanced)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.replan.ui.v7] R missing"); return; }
  var UI = R.plannerReplanUI = R.plannerReplanUI || {};
  var LIB = window.InternshipLib;

  var _overlay = null, _planId = null, _proposal = null;
  var _comparisons = null, _recommendation = null;
  var _generating = false, _simulating = false;
  var _opts = { mode: "recover", strategy: "carry_forward", N: 5 };
  var _ignoredRuleIds = {};

  // ─── Phase 24.1: strategy labels and help ───
  var STRAT_LABELS = {
    carry_forward: "انتقال به آینده",
    delete: "حذف",
    redistribute: "توزیع مجدد",
    next_day: "فردا",
    next_N_days: "N روز آینده",
    end_of_week: "پایان هفته",
    end_of_round: "پایان دور",
    end_of_month: "پایان ماه",
    end_of_current_book: "پایان کتاب جاری",
    specific_date: "تاریخ مشخص"
  };
  var STRAT_HELP = {
    carry_forward: "کارهای جامانده به روزهای بعد منتقل می‌شوند و جبران می‌شوند.",
    delete: "کارهای جامانده لغو می‌شوند و جبران نمی‌شوند.",
    redistribute: "کارها بین روزهای باقی‌مانده بازتوزیع می‌شوند.",
    next_day: "همه‌ی جبران‌ها روی فردا متمرکز می‌شوند.",
    next_N_days: "جبران‌ها بین N روز آینده پخش می‌شوند.",
    end_of_week: "جبران‌ها تا پایان همین هفته انجام می‌شوند.",
    end_of_round: "جبران‌ها تا پایان دور فعلی انجام می‌شوند.",
    end_of_month: "جبران‌ها تا پایان همین ماه انجام می‌شوند.",
    end_of_current_book: "جبران‌ها تا پایان کتاب جاری انجام می‌شوند.",
    specific_date: "جبران‌ها روی یک تاریخ مشخص متمرکز می‌شوند."
  };
  function _stratLabel(s) { return STRAT_LABELS[s] || s; }
  function _stratHelpText(s) { return STRAT_HELP[s] || ""; }

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  UI.open = function (planId) {
    var s = _state();
    if (!planId) planId = s && s.residency && s.residency.meta && s.residency.meta.activePlanId;
    if (!planId) { try { if (R.notify && R.notify.error) R.notify.error("برای بازبرنامه‌ریزی، اول یک برنامه فعال انتخاب کن."); } catch(e){} return; }
    _planId = planId;
    _proposal = null; _comparisons = null; _recommendation = null;
    _generating = false; _simulating = false; _ignoredRuleIds = {};
    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "p65-overlay p75-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";
    _render();
  };

  UI.close = function () {
    if (!_overlay) return;
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (_overlay) { _overlay.remove(); _overlay = null; } }, 220);
  };

  function _render() {
    if (!_overlay) return;
    var plan = R.store.getPlan(_planId) || {};
    var html = "";
    html += '<header class="p65-header">' +
      '<div class="p65-header-left"><span class="p65-header-icon">♻️</span><div>' +
        '<div class="p65-header-title">بازبرنامه‌ریزی پیشرفته</div>' +
        '<div class="p65-header-sub">' + _esc(plan.title || "") + '</div>' +
      '</div></div>' +
      '<button class="p65-close" type="button" data-p65-close>✕</button></header>';
    html += '<div class="p65-body">';

    // Phase 24.1: intro
    html += _renderIntro();

    // Triggers + Execution
    html += _renderTriggers();

    // Ignore rules
    html += _renderIgnorePanel();

    // Controls
    html += _renderControls();

    if (_generating || _simulating) {
      html += '<div class="p65-generating"><div class="p65-spinner"></div><div class="p65-generating-text">' +
        (_simulating ? "در حال مقایسه استراتژی‌ها..." : "در حال تحلیل و بازبرنامه‌ریزی...") + '</div></div>';
    } else if (_comparisons) {
      html += _renderComparison();
    } else if (_proposal) {
      html += _renderProposal(_proposal);
    }

    html += '</div>';
    _overlay.innerHTML = html;
    _wire();
  }

  // ─── Phase 24.1: intro ───
  function _renderIntro() {
    return '<section class="p65-section p65-intro">' +
      '<div class="p65-hint p65-hint-info">' +
        'ℹ️ گاهی یک تغییر در برنامه باعث می‌شود بخشی از کارها جابه‌جا شوند. ' +
        'اینجا می‌توانی ببینی چه چیزی تغییر کرده و یک برنامه‌ی جدید برای جبران آن بسازی.' +
      '</div>' +
    '</section>';
  }

  // ─── Triggers panel ───
  function _renderTriggers() {
    var stateSt = null;
    try {
      if (R.replanTrigger && R.replanTrigger.getStatus) {
        stateSt = R.replanTrigger.getStatus(_planId);
      }
    } catch (e) { stateSt = null; }
    var hasStateTriggers = !!(stateSt && stateSt.needed);

    var snap = R.plannerSnapshot.build(_planId, "plan");
    var recoveryTriggers = [];
    if (snap) {
      try { recoveryTriggers = R.plannerRecovery.detectReplanTriggers(snap) || []; } catch (e) { recoveryTriggers = []; }
    }
    var hasRecoveryIssues = recoveryTriggers.length > 0;

    if (!hasStateTriggers && !hasRecoveryIssues) {
      return '<section class="p65-section"><div class="p65-hint p65-hint-info">✅ <strong>بازبرنامه‌ریزی لازم نیست.</strong> برنامه‌ات در وضعیت سالم است.</div></section>';
    }

    var html = '<section class="p65-section">';

    // Section 1: state triggers (primary)
    if (hasStateTriggers) {
      html += '<div class="p65-section-title">🔍 تغییرات برنامه</div>';
      var stateRows = (stateSt.reasons || []).map(function (t) {
        var ev = (t.events && t.events.length > 0) ? t.events[t.events.length - 1] : null;
        var label = (R.replanTrigger && R.replanTrigger.describeEvent)
          ? R.replanTrigger.describeEvent(ev)
          : (t.reason || t.type || "تغییر");
        return '<div class="p65-issue-row">' +
          '<span class="p65-issue-icon">🔄</span>' +
          '<div class="p65-issue-body"><div class="p65-issue-title">' + _esc(label) + '</div>' +
          '</div></div>';
      }).join("");
      html += '<div class="p65-issue-group">' + stateRows + '</div>';

      if (hasRecoveryIssues) {
        html += '<div class="p65-hint p65-hint-info" style="margin-top:10px">' +
          'برنامه تغییر کرده است. می‌توانی با انتخاب یک استراتژی، برنامه‌ی جبران بسازی.' +
          '</div>';
      } else {
        html += '<div class="p65-hint p65-hint-info" style="margin-top:10px">' +
          'تغییر ثبت شده است، اما در حال حاضر پیشنهاد قابل اعمالی پیدا نشد. ' +
          'با این حال می‌توانی استراتژی‌ها را امتحان کنی.' +
          '</div>';
      }
    }

    // Section 2: recovery execution analysis (supplementary)
    if (hasRecoveryIssues) {
      html += '<div class="p65-section-title"' + (hasStateTriggers ? ' style="margin-top:14px"' : '') + '>📊 ' +
        (hasStateTriggers ? 'تحلیل اجرا' : 'تحلیل وضعیت') + '</div>';
      var recRows = recoveryTriggers.map(function (t) {
        var icon = t.severity === "error" ? "🔴" : t.severity === "warning" ? "🟠" : "🔵";
        var labels = {
          missed_activity: "فعالیت جامانده",
          partial_activity: "فعالیت نیمه‌کاره",
          deadline_pressure: "فشار مهلت",
          reserve_low: "بافر امنیتی کم",
          reserve_exhausted: "بافر امنیتی تمام‌شده"
        };
        var label = labels[t.type] || t.type;
        var detail = "";
        if (t.type === "missed_activity") detail = _fa(t.count) + " مورد · " + _fa(t.totalMissedPages) + " صفحه";
        else if (t.type === "partial_activity") detail = _fa(t.count) + " مورد · " + _fa(t.totalDeficitPages) + " صفحه کمبود";
        else if (t.type === "deadline_pressure") detail = "نیاز " + _fa(t.needed) + " دقیقه · موجود " + _fa(t.available) + " دقیقه";
        else if (t.type === "reserve_low") detail = "باقی " + _fa(t.remainingMinutes) + " از " + _fa(t.poolMinutes) + " دقیقه";
        return '<div class="p65-issue-row">' +
          '<span class="p65-issue-icon">' + icon + '</span>' +
          '<div class="p65-issue-body"><div class="p65-issue-title">' + _esc(label) + '</div>' +
          (detail ? '<div class="p65-issue-meta">' + _esc(detail) + '</div>' : '') +
          '</div></div>';
      }).join("");
      html += '<div class="p65-issue-group">' + recRows + '</div>';
    }

    html += '</section>';
    return html;
  }

  // ─── Execution details ───
  function _renderExecutionDetails(exec) {
    if (!exec) return "";
    var html = "";
    if (exec.missed && exec.missed.length > 0) {
      var s = _state();
      var books = (s.residency.books || []);
      var rows = exec.missed.slice(0, 20).map(function (m) {
        var b = books.find(function (x) { return x.id === m.bookId; });
        return '<div class="p65-day-activity">' +
          '<span class="p65-day-act-book">' + _esc(b ? b.title : m.bookId) + '</span>' +
          '<span class="p65-day-act-range">' + _fa(m.plannedDate) + '</span>' +
          '<span class="p65-day-act-time">' + _fa(m.plannedPages) + ' ص · ' + _fa(m.plannedDurationMinutes) + ' د</span>' +
        '</div>';
      }).join("");
      html += '<details class="p75-details"><summary>🔴 فعالیت‌های جامانده (' + _fa(exec.missed.length) + ')</summary>' +
        '<div class="p65-day-body">' + rows + '</div></details>';
    }
    if (exec.partial && exec.partial.length > 0) {
      var s2 = _state();
      var books2 = (s2.residency.books || []);
      var rows2 = exec.partial.slice(0, 20).map(function (m) {
        var b = books2.find(function (x) { return x.id === m.bookId; });
        return '<div class="p65-day-activity">' +
          '<span class="p65-day-act-book">' + _esc(b ? b.title : m.bookId) + '</span>' +
          '<span class="p65-day-act-range">' + _fa(m.plannedDate) + '</span>' +
          '<span class="p65-day-act-time">' + _fa(m.actualPages) + '/' + _fa(m.plannedPages) + ' ص · کمبود ' + _fa(m.pageDeficit) + '</span>' +
        '</div>';
      }).join("");
      html += '<details class="p75-details"><summary>🟠 فعالیت‌های نیمه‌کاره (' + _fa(exec.partial.length) + ')</summary>' +
        '<div class="p65-day-body">' + rows2 + '</div></details>';
    }
    if (!html) return "";
    return '<section class="p65-section"><div class="p65-section-title">📋 جزئیات اجرا</div>' + html + '</section>';
  }

  // ─── Impact details ───
  function _renderImpactDetails(impact) {
    if (!impact) return "";
    var tiles = [
      { icon: "🔄", label: "تحت‌تأثیر", val: impact.affectedActivityIds.length },
      { icon: "🔒", label: "محافظت‌شده", val: impact.protectedActivityIds.length },
      { icon: "🆓", label: "قابل لغو", val: impact.cancelableActivityIds.length },
      { icon: "📚", label: "کتاب", val: impact.affectedBookIds.length },
      { icon: "📅", label: "روز", val: (impact.affectedDates || []).length },
      { icon: "🎯", label: "حداقل محدوده", val: impact.minimalScope || "—" }
    ];
    return '<section class="p65-section"><div class="p65-section-title">🎯 تحلیل تأثیر</div>' +
      '<div class="p65-stats-grid">' +
      tiles.map(function (t) {
        return '<div class="p65-stat-card"><span class="p65-stat-icon">' + t.icon + '</span>' +
          '<div class="p65-stat-body"><div class="p65-stat-label">' + _esc(t.label) + '</div>' +
          '<div class="p65-stat-value">' + _esc(t.val) + '</div></div></div>';
      }).join("") +
      '</div></section>';
  }

  // ─── Ignore panel ───
  function _renderIgnorePanel() {
    var snap = R.plannerSnapshot.build(_planId, "plan");
    if (!snap) return "";
    var rules = [];
    (snap.constraints || []).forEach(function (c) {
      // Non-ignorable: hard constraints are not ignorable per spec
      var ignorable = (c.strength !== "hard");
      rules.push({ id: c.id, kind: "constraint", label: (c.type || "constraint") + " · " + (c.strength || ""), ignorable: ignorable });
    });
    (snap.overrides || []).forEach(function (o) {
      var ignorable = (o.strength !== "hard");
      rules.push({ id: o.id, kind: "override", label: (o.field || "override") + " · " + (o.strength || ""), ignorable: ignorable });
    });
    if (rules.length === 0) return "";
    var ignorable = rules.filter(function (r) { return r.ignorable; });
    var nonIgnorable = rules.filter(function (r) { return !r.ignorable; });

    var rows = ignorable.map(function (r) {
      var checked = !!_ignoredRuleIds[r.id];
      return '<label class="p75-ignore-row">' +
        '<input type="checkbox" data-rp-ignore="' + _esc(r.id) + '"' + (checked ? " checked" : "") + '>' +
        '<span class="p75-ignore-kind is-' + r.kind + '">' + _esc(r.kind) + '</span>' +
        '<span class="p75-ignore-label">' + _esc(r.label) + '</span>' +
      '</label>';
    }).join("");

    var nonIgnRows = nonIgnorable.length > 0
      ? '<div class="p65-hint p65-hint-info" style="margin-top:8px">🔒 ' + _fa(nonIgnorable.length) + ' قانون Hard غیرقابل نادیده‌گرفتن وجود دارد.</div>'
      : "";

    return '<section class="p65-section"><div class="p65-section-title">🚫 قوانین قابل نادیده‌گرفتن (فقط این Replan)</div>' +
      '<div class="p65-hint">توجه: نادیده‌گرفتن فقط برای همین Replan اعمال می‌شود. قانون حذف نمی‌شود.</div>' +
      (rows || '<div class="p65-empty-inline">قانون قابل نادیده‌گرفتن وجود ندارد.</div>') +
      nonIgnRows +
      '<div class="p75-ignore-actions">' +
        '<button type="button" class="p65-btn p65-btn-ghost p65-btn-sm" data-rp-ignore-all>انتخاب همه</button>' +
        '<button type="button" class="p65-btn p65-btn-ghost p65-btn-sm" data-rp-ignore-none>لغو انتخاب همه</button>' +
      '</div>' +
    '</section>';
  }

  // ─── Controls ───
  function _renderControls() {
    var modes = ["recover","rebuild_affected_scope","full_replan"];
    var strategies = R.plannerRecovery.STRATEGIES;
    var modeLabels = { recover: "فقط بازیابی", rebuild_affected_scope: "بازسازی محدوده آسیب‌دیده", full_replan: "بازبرنامه‌ریزی کامل" };
    var stratLabels = {
      carry_forward: "انتقال به آینده", delete: "حذف", redistribute: "توزیع مجدد",
      next_day: "فردا", end_of_week: "پایان هفته", end_of_round: "پایان دور",
      end_of_month: "پایان ماه", end_of_current_book: "پایان کتاب جاری",
      specific_date: "تاریخ مشخص", next_N_days: "N روز آینده"
    };
    var modeChips = modes.map(function (m) {
      return '<button type="button" class="p65-mode-chip' + (m === _opts.mode ? ' is-active' : '') + '" data-rp-mode="' + m + '">' + _esc(modeLabels[m]) + '</button>';
    }).join("");
    var stratOptions = strategies.map(function (s) {
      return '<option value="' + s + '"' + (s === _opts.strategy ? " selected" : "") + '>' + _esc(stratLabels[s] || s) + '</option>';
    }).join("");

    var fullWarn = _opts.mode === "full_replan"
      ? '<div class="p65-hint" style="background:rgba(244,63,94,.10);border-color:rgba(244,63,94,.35);color:#fb7185;margin-bottom:12px">⚠️ <strong>بازبرنامه‌ریزی کامل:</strong> همه‌ی فعالیت‌های future و unlocked ممکن است لغو و جایگزین شوند. فقظ با تأیید مضاعف Apply می‌شود.</div>'
      : "";

    return '<section class="p65-section">' +
      '<div class="p65-section-title">⚙️ تنظیمات بازبرنامه‌ریزی</div>' +
      fullWarn +
      '<div class="p65-round-mode-row"><div class="p65-round-mode-title">حالت:</div><div class="p65-round-mode-chips">' + modeChips + '</div></div>' +
      '<div class="p65-round-mode-row"><div class="p65-round-mode-title">استراتژی:</div>' +
        '<select id="rp-strategy" style="padding:6px 12px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:12.5px">' + stratOptions + '</select>' +
        '<span data-rp-n-wrap style="display:none;align-items:center;gap:6px">' +
          '<label style="color:var(--text-dim);font-size:12px">تعداد روز:</label>' +
          '<input id="rp-N" type="number" min="1" max="60" value="' + _opts.N + '" style="width:70px;padding:6px 10px;border-radius:10px;background:var(--surface-2);border:1px solid var(--border);color:var(--text);font-family:inherit;font-size:12.5px">' +
        '</span>' +
      '</div>' +
      '<div class="p65-hint p65-hint-info" data-rp-strat-help style="margin-top:8px;font-size:12px">' + _esc(_stratHelpText(_opts.strategy)) + '</div>' +
      '<div class="p65-footer" style="margin-top:14px">' +
        '<button class="p65-btn p65-btn-primary" type="button" data-rp-generate>♻️ تولید پیشنهاد</button>' +
        '<button class="p65-btn p65-btn-ghost" type="button" data-rp-compare>📊 مقایسه استراتژی‌ها</button>' +
        '<button class="p65-btn p65-btn-ghost" type="button" data-p65-close>انصراف</button>' +
      '</div>' +
    '</section>';
  }

  // ─── Strategy comparison ───
  function _renderComparison() {
    var html = '<section class="p65-section"><div class="p65-section-title">📊 مقایسه استراتژی‌ها</div>';
    if (_recommendation) {
      var _isInf = !!_recommendation.allInfeasible;
      var _head = _isInf
        ? "بهترین گزینه (هیچ‌کدام کاملاً قابل اجرا نیستند)"
        : "پیشنهاد سیستم";
      var _headIcon = _isInf ? "⚖️" : "⭐";
      html += '<div class="p75-recommended">' +
        '<div class="p75-rec-head"><span class="p75-rec-star">' + _headIcon + '</span><strong>' + _esc(_head) + ': ' + _esc(_stratLabel(_recommendation.strategy)) + '</strong></div>' +
        '<ul class="p75-rec-reasons">' + _recommendation.reasons.map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join("") + '</ul>' +
      '</div>';
    }
    html += '<div class="p75-compare-table">';
    html += '<div class="p75-compare-row p75-compare-head">' +
      '<div>استراتژی</div><div>قابل اجرا</div><div>صفحات</div><div>بافر</div><div>اوج روزانه</div><div>تاریخ تکمیل</div>' +
    '</div>';
    _comparisons.forEach(function (c) {
      if (c.error) {
        html += '<div class="p75-compare-row is-error">' +
          '<div>' + _esc(c.strategy) + '</div><div colspan="5" style="grid-column:2/-1">خطا: ' + _esc(c.error) + '</div></div>';
        return;
      }
      var badge = c.feasible ? "✅" : "🔴";
      html += '<div class="p75-compare-row">' +
        '<div class="p75-compare-strategy" data-rp-pick="' + _esc(c.strategy) + '">' + _esc(_stratLabel(c.strategy)) + '</div>' +
        '<div>' + badge + '</div>' +
        '<div>' + _fa(c.recoveredPages) + '</div>' +
        '<div>' + _fa(c.reserveConsumed) + ' د</div>' +
        '<div>' + _fa(c.peakDailyMinutes) + ' د</div>' +
        '<div>' + (c.completionDate ? _fa(c.completionDate) : "—") + '</div>' +
      '</div>';
    });
    html += '</div>';
    html += '<div class="p65-footer" style="margin-top:14px">' +
      '<button class="p65-btn p65-btn-ghost" type="button" data-rp-back>→ بازگشت</button>' +
    '</div>';
    html += '</section>';
    return html;
  }

  // ─── Proposal ───
  function _renderProposal(pr) {
    var html = "";
    html += '<div class="p65-section-title" style="margin-bottom:10px">📋 پیشنهاد پیشنهادی</div>';
    var f = pr.feasibility || {};
    var statusMap = {
      "feasible": { cls: "is-ok", icon: "✅", label: "قابل اجرا" },
      "feasible_with_warnings": { cls: "is-warn", icon: "🟠", label: "قابل اجرا با هشدار" },
      "infeasible": { cls: "is-error", icon: "🔴", label: "ناقص" },
      "blocked_by_hard_constraint": { cls: "is-block", icon: "🛑", label: "مسدود" },
      "not_checked": { cls: "is-info", icon: "ℹ️", label: "بررسی نشده" }
    };
    var st = statusMap[f.status] || statusMap.not_checked;

    html += '<section class="p65-section"><div class="p65-feasibility ' + st.cls + '">' +
      '<span class="p65-feasibility-icon">' + st.icon + '</span>' +
      '<div class="p65-feasibility-body"><div class="p65-feasibility-title">' + _esc(st.label) + '</div>' +
        '<div class="p65-feasibility-stats">' +
          'جامانده: ' + _fa(pr.executionAnalysis.missedCount) + ' · ' +
          'نیمه‌کاره: ' + _fa(pr.executionAnalysis.partialCount) + ' · ' +
          'صفحات جامانده: ' + _fa(pr.executionAnalysis.totalMissedPages) +
        '</div></div></div></section>';

    // Before / After table
    html += _renderBeforeAfter(pr);

    // Execution details
    html += _renderExecutionDetails(pr.executionAnalysis);

    // Impact details
    html += _renderImpactDetails(pr.impactAnalysis);

    // Cancelled preview
    html += _renderCancelledPreview(pr.cancelledActivities);

    // Reserve
    html += _renderReservePanel(pr);

    // Ignored rules recap
    if (pr.ignoredRules && pr.ignoredRules.length > 0) {
      html += '<section class="p65-section"><div class="p65-hint p65-hint-info">🚫 ' + _fa(pr.ignoredRules.length) + ' قانون برای این Replan نادیده گرفته شد.</div></section>';
    }

    // Actions
    var canApply = f.status !== "blocked_by_hard_constraint";
    html += '<div class="p65-footer p65-footer-proposal">' +
      '<div class="p65-footer-actions">' +
        '<button class="p65-btn p65-btn-primary" type="button" data-rp-apply' + (canApply ? '' : ' disabled') + '>✅ اعمال پیشنهاد</button>' +
        '<button class="p65-btn p65-btn-ghost" type="button" data-rp-reject>❌ رد کردن</button>' +
        '<button class="p65-btn p65-btn-ghost" type="button" data-rp-back>→ تنظیمات</button>' +
      '</div>' +
    '</div>';

    return html;
  }

  function _renderBeforeAfter(pr) {
    var rec = pr.recovery || {};
    var debtBefore = (rec.debtPages != null)
      ? rec.debtPages
      : ((rec.missedPages || 0) + (rec.partialDeficitPages || 0));
    var debtAfter = (rec.remainingDebtPages != null)
      ? rec.remainingDebtPages
      : Math.max(0, debtBefore - (rec.recoveredPages || 0));
    var rows = [
      { label: "کار عقب‌افتاده", before: debtBefore, after: debtAfter, unit: "صفحه" },
      { label: "فعالیت‌های جدید", before: 0, after: (pr.statistics && pr.statistics.proposedCount) || 0, unit: "" },
      { label: "بافر مصرف‌شده در این پیشنهاد", before: 0, after: (pr.reserve && pr.reserve.consumedMinutes) || 0, unit: "دقیقه" }
    ];
    return '<section class="p65-section"><div class="p65-section-title">🔄 قبل / بعد</div>' +
      '<div class="p75-ba-table">' +
      '<div class="p75-ba-row p75-ba-head"><div>شاخص</div><div>قبل</div><div>بعد</div></div>' +
      rows.map(function (r) {
        return '<div class="p75-ba-row">' +
          '<div>' + _esc(r.label) + '</div>' +
          '<div>' + _fa(r.before) + (r.unit ? " " + _esc(r.unit) : "") + '</div>' +
          '<div>' + _fa(r.after) + (r.unit ? " " + _esc(r.unit) : "") + '</div>' +
        '</div>';
      }).join("") +
      '</div>' +
      '<div class="p65-stats-grid p65-stats-4" style="margin-top:14px">' +
        _stat("✅", "حفظ‌شده", _fa(pr.statistics.preservedCount)) +
        _stat("🗑️", "لغو", _fa(pr.statistics.cancelledCount)) +
        _stat("➕", "جدید", _fa(pr.statistics.proposedCount)) +
        _stat("📄", "جبران شده", _fa(pr.statistics.proposedPages)) +
      '</div></section>';
  }

  function _renderCancelledPreview(cancelled) {
    if (!cancelled || cancelled.length === 0) return "";
    var s = _state();
    var books = (s.residency.books || []);
    var rows = cancelled.slice(0, 30).map(function (c) {
      var b = books.find(function (x) { return x.id === c.bookId; });
      return '<div class="p65-day-activity is-cancelled">' +
        '<span class="p65-day-act-book">' + _esc(b ? b.title : (c.bookId || "—")) + '</span>' +
        '<span class="p65-day-act-range">' + _fa(c.plannedDate || "—") + '</span>' +
        '<span class="p65-day-act-time">' + _fa(c.plannedPages) + ' ص · ' + _fa(c.plannedDurationMinutes) + ' د</span>' +
      '</div>';
    }).join("");
    return '<section class="p65-section"><div class="p65-section-title">🗑️ فعالیت‌های لغو‌شونده (' + _fa(cancelled.length) + ')</div>' +
      '<div class="p65-hint">این فعالیت‌ها در تقویم باقی می‌مانند ولی وضعیت <code>cancelled</code> می‌گیرند (تاریخچه حفظ می‌شود).</div>' +
      '<details class="p75-details"><summary>نمایش لیست</summary>' +
      '<div class="p65-day-body">' + rows + '</div>' +
      '</details></section>';
  }

  function _renderReservePanel(pr) {
    if (pr.reserve.consumedMinutes === 0 && pr.reserve.status !== "exhausted") return "";
    var html = '<section class="p65-section"><div class="p65-section-title">🛡️ بافر امنیتی</div>';
    if (pr.reserve.consumedMinutes > 0) {
      html += '<div class="p65-hint p65-hint-info"><strong>⚠️ ' + _fa(pr.reserve.consumedMinutes) + ' دقیقه از بافر مهلت مصرف می‌شود.</strong></div>' +
        '<div class="p65-stats-grid p65-stats-4">' +
          _stat("📊", "قبل", _fa(pr.reserve.beforeMinutes) + " د") +
          _stat("➖", "مصرف", _fa(pr.reserve.consumedMinutes) + " د") +
          _stat("💼", "باقی", _fa(pr.reserve.afterMinutes) + " د") +
          _stat("📦", "کل بافر", _fa(pr.reserve.poolMinutes) + " د") +
        '</div>';
      if (pr.reserve.calculation && pr.reserve.calculation.fallbackUsed) {
        html += '<div class="p65-hint" style="margin-top:8px;color:var(--text-dim)">ℹ️ برخی موارد فاقد سرعت مطالعه‌ی اختصاصی بودند و از سرعت پیش‌فرض استفاده شد.</div>';
      }
    }
    if (pr.reserve.status === "exhausted" || (pr.reserve.afterMinutes === 0 && pr.reserve.consumedMinutes > 0)) {
      html += '<div class="p65-hint" style="margin-top:10px;background:rgba(244,63,94,.10);border-color:rgba(244,63,94,.35);color:#fb7185">🛑 <strong>بافر امنیتی تمام شد.</strong> گزینه‌های جبران را بررسی کن.</div>';
    }
    html += '</section>';
    return html;
  }

  function _stat(icon, label, val) {
    return '<div class="p65-stat-card"><span class="p65-stat-icon">' + icon + '</span>' +
      '<div class="p65-stat-body"><div class="p65-stat-label">' + _esc(label) + '</div>' +
      '<div class="p65-stat-value">' + _esc(val) + '</div></div></div>';
  }

  // ─── Wire ───
  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-p65-close]").forEach(function (b) { b.addEventListener("click", UI.close); });
    _overlay.querySelectorAll("[data-rp-mode]").forEach(function (b) {
      b.addEventListener("click", function () { _opts.mode = b.getAttribute("data-rp-mode"); _render(); });
    });
    var stratSel = _overlay.querySelector("#rp-strategy");
    if (stratSel) stratSel.addEventListener("change", function () {
      _opts.strategy = stratSel.value;
      var helpEl = _overlay.querySelector("[data-rp-strat-help]");
      if (helpEl) helpEl.textContent = _stratHelpText(_opts.strategy);
      var nWrap = _overlay.querySelector("[data-rp-n-wrap]");
      if (nWrap) nWrap.style.display = (_opts.strategy === "next_N_days") ? "inline-flex" : "none";
    });
    var nInp = _overlay.querySelector("#rp-N");
    if (nInp) nInp.addEventListener("change", function () { _opts.N = parseInt(nInp.value, 10) || 5; });

    _overlay.querySelectorAll("[data-rp-ignore]").forEach(function (cb) {
      cb.addEventListener("change", function () {
        var id = cb.getAttribute("data-rp-ignore");
        if (cb.checked) _ignoredRuleIds[id] = 1;
        else delete _ignoredRuleIds[id];
      });
    });
    var allBtn = _overlay.querySelector("[data-rp-ignore-all]");
    if (allBtn) allBtn.addEventListener("click", function () {
      _overlay.querySelectorAll("[data-rp-ignore]").forEach(function (cb) {
        cb.checked = true;
        _ignoredRuleIds[cb.getAttribute("data-rp-ignore")] = 1;
      });
    });
    var noneBtn = _overlay.querySelector("[data-rp-ignore-none]");
    if (noneBtn) noneBtn.addEventListener("click", function () {
      _overlay.querySelectorAll("[data-rp-ignore]").forEach(function (cb) {
        cb.checked = false;
        delete _ignoredRuleIds[cb.getAttribute("data-rp-ignore")];
      });
    });

    _overlay.querySelectorAll("[data-rp-generate]").forEach(function (b) { b.addEventListener("click", _onGenerate); });
    _overlay.querySelectorAll("[data-rp-compare]").forEach(function (b) { b.addEventListener("click", _onCompare); });
    _overlay.querySelectorAll("[data-rp-back]").forEach(function (b) {
      b.addEventListener("click", function () { _comparisons = null; _recommendation = null; _proposal = null; _render(); });
    });
    _overlay.querySelectorAll("[data-rp-pick]").forEach(function (b) {
      b.addEventListener("click", function () {
        var strat = b.getAttribute("data-rp-pick");
        _opts.strategy = strat;
        _onGenerate();
      });
    });
    _overlay.querySelectorAll("[data-rp-apply]").forEach(function (b) { b.addEventListener("click", _onApply); });
    _overlay.querySelectorAll("[data-rp-reject]").forEach(function (b) { b.addEventListener("click", function () { _proposal = null; _comparisons = null; _recommendation = null; try { if (R.notify && R.notify.info) R.notify.info("پیشنهاد رد شد."); } catch(e){} _render(); }); });

    // ─── [PATCH:ai-advisor-v8] Replanner AI buttons ───
    _overlay.querySelectorAll("[data-rp-ai-analyze]").forEach(function (b) {
      b.addEventListener("click", function () {
        var R = window.InternshipResidency;
        if (!R || !R.aiAdvisors) return;
        // Build context from the current replan
        var ctx = _buildAIContext();
        if (!ctx) { try { if (R.notify && R.notify.info) R.notify.info("ابتدا یک پیشنهاد بازبرنامه‌ریزی تولید کن."); } catch(e){} return; }
        R.aiUI.openAdvisor({
          title: "تحلیل وضعیت بازبرنامه‌ریزی",
          subtitle: "بررسی برنامه‌ی جبران و انتخاب‌های جایگزین",
          actions: [
            { id: "recovery", label: "🔍 تحلیل recovery",
              handler: function () { return R.aiAdvisors.reviewRecovery(ctx.execAnalysis, ctx.impact, ctx.comparisons); } },
            { id: "diagnostics", label: "🩺 توضیح diagnostics",
              handler: function () { return R.aiAdvisors.explainDiagnostics(ctx.diagnostics || []); } }
          ],
          autoRun: true
        });
      });
    });
    _overlay.querySelectorAll("[data-rp-ai-rescue]").forEach(function (b) {
      b.addEventListener("click", function () {
        var R = window.InternshipResidency;
        if (!R || !R.aiAdvisors) return;
        var ctx = _buildAIContext();
        if (!ctx || !ctx.comparisons || ctx.comparisons.length === 0) {
          try { if (R.notify && R.notify.info) R.notify.info("ابتدا استراتژی‌ها را مقایسه کن."); } catch(e){}
          return;
        }
        R.aiUI.openAdvisor({
          title: "پیشنهاد استراتژی جبران",
          subtitle: "مشاور بر اساس مقایسه‌ی قطعی",
          actions: [
            { id: "rescue", label: "🎯 پیشنهاد نهایی",
              handler: function () { return R.aiAdvisors.recommendRecoveryStrategy(ctx.comparisons); } }
          ],
          autoRun: true
        });
      });
    });
  }

  function _getIgnoreIds() {
    return Object.keys(_ignoredRuleIds);
  }

  // ─── [PATCH:ai-advisor-v8] Build AI context from current replan state ───
  function _buildAIContext() {
    var R = window.InternshipResidency;
    if (!R || !R.plannerSnapshot || !R.plannerExecution) return null;
    var snap = R.plannerSnapshot.build(_planId, "plan");
    if (!snap) return null;
    var exec = R.plannerExecution.analyzeExecution(snap);
    var impact = R.plannerImpact ? R.plannerImpact.analyzeImpact(exec, snap, "plan") : null;
    var comparisons = _comparisons || [];
    var diagnostics = [];
    if (_proposal && _proposal.deficits) diagnostics = _proposal.deficits.slice(0, 30);
    else if (comparisons.length > 0 && comparisons[0].deficits) diagnostics = comparisons[0].deficits;
    return {
      execAnalysis: exec,
      impact: impact,
      comparisons: comparisons,
      proposal: _proposal || null,
      diagnostics: diagnostics
    };
  }

  function _onGenerate() {
    if (_generating || _simulating) return;
    _generating = true;
    _comparisons = null;
    _recommendation = null;
    _render();
    setTimeout(function () {
      var res;
      try {
        res = R.plannerReplan.generateReplanProposal(_planId, {
          mode: _opts.mode, strategy: _opts.strategy, N: _opts.N,
          ignoreRuleIds: _getIgnoreIds()
        });
      } catch (e) { res = { ok: false, error: String(e.message || e) }; }
      _generating = false;
      if (!res || !res.ok) {
        _render();
        var body = _overlay.querySelector(".p65-body");
        if (body) {
          if (res && res.isNoop) {
            body.insertAdjacentHTML("afterbegin",
              '<div class="p65-hint p65-hint-info" style="margin-bottom:10px">ℹ️ ' +
              _esc(res.error || "کاری برای جبران پیدا نشد؛ برنامه تغییری نکرد.") +
              '</div>');
          } else {
            body.insertAdjacentHTML("afterbegin",
              '<div class="p65-inline-error">❌ ' + _esc(res && res.error || "خطا") + '</div>');
          }
        }
        return;
      }
      _proposal = res.proposal;
      _render();
    }, 30);
  }

  function _onCompare() {
    if (_generating || _simulating) return;
    _simulating = true;
    _comparisons = null;
    _proposal = null;
    _render();
    setTimeout(function () {
      var strategies = ["next_day", "next_N_days", "end_of_week", "end_of_round"];
      var results;
      try {
        results = R.plannerReplan.simulateStrategies(_planId, strategies, {
          mode: _opts.mode, N: _opts.N,
          ignoreRuleIds: _getIgnoreIds()
        });
      } catch (e) { results = []; }
      _simulating = false;
      _comparisons = results || [];
      _recommendation = R.plannerReplan.recommendStrategy(_comparisons);
      _render();
    }, 30);
  }

  // [PATCH:phase-28.4c] dialog.confirm returns a Promise<boolean>, not callback-based
  function _confirmDialog(msg, onConfirm) {
    if (!R.dialog || typeof R.dialog.confirm !== "function") {
      console.warn("[replan-ui] dialog service missing");
      return;
    }
    var p;
    try { p = R.dialog.confirm(msg, {}); }
    catch (e) { console.warn("[replan-ui] dialog threw:", e); return; }
    if (p && typeof p.then === "function") {
      p.then(function (ok) {
        if (ok) { try { onConfirm(); } catch (e) { console.error("[replan-ui] onConfirm threw:", e); } }
      }).catch(function (e) {
        console.warn("[replan-ui] dialog promise rejected:", e);
      });
      return;
    }
    // legacy callback fallback (only if second-arg is truly a function)
    if (typeof p === "function") { p(onConfirm); return; }
    // unknown contract — do nothing safe
    console.warn("[replan-ui] dialog returned unexpected value:", p);
  }

  function _onApply() {
    if (!_proposal) return;
    var pr = _proposal;

    var doApply = function () {
      var res = R.plannerReplanApply.applyReplanProposal(pr, {});
      if (res && res.success) {
        // Phase 26.3: trigger clearing happens atomically inside applyReplanProposal
        // Only proposal.coveredTriggerIds are cleared. New triggers (post-generation) remain.
        _overlay.innerHTML = '<header class="p65-header"><div class="p65-header-left"><span class="p65-header-icon">✅</span><div><div class="p65-header-title">پیشنهاد اعمال شد</div></div></div></header>' +
          '<div class="p65-body">' +
          '<div class="p65-success"><div class="p65-success-icon">✅</div><div class="p65-success-title">' + _fa(res.created.length) + ' فعالیت جدید اضافه شد</div>' +
          '<div class="p65-success-desc">' + _fa(res.cancelled.length) + ' فعالیت لغو · ' + _fa(res.recoveredPages) + ' صفحه جبران</div></div>' +
          '<div class="p65-footer"><button class="p65-btn p65-btn-primary" type="button" data-p65-close>بستن</button></div></div>';
        _wire();
        if (window.__os && window.__os.render) setTimeout(function () { window.__os.render(); }, 50);
      } else {
        var reason = (res && (res.reason || (res.errors && res.errors[0]))) || "خطا";
        var msg2;
        if (reason === "stale_proposal_fingerprint_mismatch" || reason === "stale_replan_proposal") {
          msg2 = "این پیشنهاد دیگر معتبر نیست؛ برنامه تغییر کرده. یک پیشنهاد جدید بساز.";
        } else if (reason === "already_applied") {
          msg2 = "این پیشنهاد قبلاً اعمال شده.";
        } else {
          msg2 = "خطا: " + reason;
        }
        var body = _overlay.querySelector(".p65-body");
        if (body) body.insertAdjacentHTML("afterbegin", '<div class="p65-inline-error">❌ ' + _esc(msg2) + '</div>');
      }
    };

    var summary = "این پیشنهاد شامل:\n" +
      "• حفظ: " + _fa(pr.statistics.preservedCount) + " فعالیت\n" +
      "• لغو: " + _fa(pr.statistics.cancelledCount) + " فعالیت\n" +
      "• جدید: " + _fa(pr.statistics.proposedCount) + " فعالیت\n" +
      "• جبران: " + _fa(pr.statistics.proposedPages) + " صفحه";

    if (pr.mode === "full_replan") {
      _confirmDialog("⚠️ بازبرنامه‌ریزی کامل\n\n" + summary + "\n\nادامه می‌دهی؟", doApply);
    } else {
      _confirmDialog(summary + "\n\nاعمال شود؟", doApply);
    }
  }
  console.log("[planner.replan.ui.v7] loaded");
})();