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
  var _opts = { mode: "recover", strategy: "carry_forward", N: 5, sessionMinutes: 90 }; /* [PATCH:f4b10-session] */
  var _ignoredRuleIds = {};
  var _proposalSelection = {}; /* [PATCH:f4b] */

  // ─── Phase 24.1: strategy labels and help ───
  /* [PATCH:f4c-strat] F4-C strategy labels */
  var STRAT_LABELS = {
    carry_forward: "انتقال بدهی به روزهای آینده",
    delete: "لغو کارهای جامانده",
    redistribute: "پخش مجدد بین روزهای باقی‌مانده",
    next_day: "جبران در روز بعد",
    next_N_days: "جبران در N روز آینده",
    end_of_week: "جبران تا پایان هفته",
    end_of_round: "جبران تا پایان این دوره",
    end_of_month: "جبران تا پایان ماه",
    end_of_current_book: "جبران تا پایان کتاب فعلی",
    specific_date: "جبران در تاریخ مشخص"
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

  /* [PATCH:f4c-cmp] local compare helper */
  function _cmp(a, b) {
    if (!LIB || !LIB.date || !LIB.date.compareJalaliDate) return a < b ? -1 : (a > b ? 1 : 0);
    return LIB.date.compareJalaliDate(a, b);
  }

  UI.open = function (planId) {
    var s = _state();
    if (!planId) planId = s && s.residency && s.residency.meta && s.residency.meta.activePlanId;
    if (!planId) { try { if (R.notify && R.notify.error) R.notify.error("برای بازبرنامه‌ریزی، اول یک برنامه فعال انتخاب کن."); } catch(e){} return; }
    _planId = planId;
    _proposal = null; _comparisons = null; _recommendation = null;
    _generating = false; _simulating = false; _ignoredRuleIds = {};
    /* [PATCH:r3f3-uialign-mode] auto-select mode based on trigger type */
    /* [PATCH:f5a-defaultmode] default to capacity_rebuild when opened manually */
    _opts.mode = "capacity_rebuild";
    try {
        var _RT_ = R.replanTrigger;
        if (_RT_ && _RT_.getStatus) {
            var _st_ = _RT_.getStatus(planId);
            if (_st_ && _st_.needed && Array.isArray(_st_.reasons)) {
                var _hasDebt_ = _st_.reasons.some(function(r){
                    return r && (r.type === "task_completed" || r.type === "task_updated" || r.type === "shift_added" || r.type === "shift_updated" || r.type === "shift_removed");
                });
                if (_hasDebt_) {
                    _opts.mode = "recover";
                }
            }
        }
    } catch (_e_) {}
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
        /* [PATCH:f4c-hint] capacity-aware hint */
        var _hasCapTrigger_ = (stateSt.reasons || []).some(function(t){ return t && t.type === "capacity_context_changed"; });
        if (_hasCapTrigger_) {
          html += '<div class="p65-hint p65-hint-info" style="margin-top:10px">' +
            'ظرفیت یا روش مطالعه تغییر کرده — از حالت «تنظیم برنامه بر اساس ظرفیت جدید» استفاده کن تا برنامه با ظرفیت جدید بازسازی شود.' +
            '</div>';
        } else {
          html += '<div class="p65-hint p65-hint-info" style="margin-top:10px">' +
            'تغییر ثبت شده است. از دکمه «تولید پیشنهاد» برای ساخت برنامه جبران استفاده کن.' +
            '</div>';
        }
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
          reserve_low: "ساعت ذخیره کم",
          reserve_exhausted: "ساعت ذخیره تمام‌شده"
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
  function _getMaxDaysAvailable() {
  var s = _state();
  var plan = s && s.residency && s.residency.plans && s.residency.plans.find(function(p){ return p && p.id === _planId; });
  var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
  if (!plan || !plan.examDate || !today || !LIB.date.parseJalali) return 0;
  var pt = LIB.date.parseJalali(today);
  var pe = LIB.date.parseJalali(plan.examDate);
  if (!pt || !pe) return 0;
  return Math.max(0, LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) - LIB.date.jalaliToDayNumber(pt.jy, pt.jm, pt.jd));
}

function _getMaxDaysText() {
  var max = _getMaxDaysAvailable();
  if (max <= 0) return "تاریخ آزمون تنظیم نشده";
  return "حداکثر: " + _fa(max) + " روز تا آزمون";
}

function _getMaxDaysAvailable() {
  var s = _state();
  var plan = s && s.residency && s.residency.plans && s.residency.plans.find(function(p){ return p && p.id === _planId; });
  var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
  if (!plan || !plan.examDate || !today || !LIB.date.parseJalali) return 0;
  var pt = LIB.date.parseJalali(today), pe = LIB.date.parseJalali(plan.examDate);
  if (!pt || !pe) return 0;
  return Math.max(0, LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) - LIB.date.jalaliToDayNumber(pt.jy, pt.jm, pt.jd));
}

function _getBoundsForReplan() {
  var maxAvail = _getMaxDaysAvailable();
  if (maxAvail <= 0) return { min: null, max: 0, infeasible: false };
  
  var resMax = R.plannerReplan.generateReplanProposal(_planId, {
     mode: _opts.mode, strategy: _opts.strategy, N: _opts.N,
     sessionMinutes: _opts.sessionMinutes, maxDays: null
  });
  
  var _getStatus = function(r) {
    return (r && r.proposal && r.proposal.feasibility) ? r.proposal.feasibility.status : 'not_checked';
  };
  
  var _isOk = function(r) {
    var s = _getStatus(r);
    return r.ok && (s === 'feasible' || s === 'feasible_with_warnings');
  };

  if (!_isOk(resMax)) {
    return { min: null, max: maxAvail, infeasible: true };
  }
  
  var lo = 1, hi = maxAvail;
  while(lo < hi) {
     var mid = Math.floor((lo + hi) / 2);
     var resMid = R.plannerReplan.generateReplanProposal(_planId, {
       mode: _opts.mode, strategy: _opts.strategy, N: _opts.N,
       sessionMinutes: _opts.sessionMinutes, maxDays: mid
     });
     if (_isOk(resMid)) {
       hi = mid;
     } else {
       lo = mid + 1;
     }
  }
  return { min: lo, max: maxAvail, infeasible: false };
}

var _boundsTimer = null;
function _updateBoundsUI() {
  var lbl = _overlay.querySelector('#rp-bounds-label');
  if (!lbl) return;
  lbl.innerHTML = '<span style="color:#64748b;font-size:11px;">در حال محاسبه حداقل/حداکثر روز...</span>';
  if (_boundsTimer) clearTimeout(_boundsTimer);
  _boundsTimer = setTimeout(function() {
    _boundsTimer = null;
    var b = _getBoundsForReplan();
    if (!lbl || !lbl.parentNode) return;
    if (b.infeasible) {
       lbl.innerHTML = '<span style="color:#fb7185;font-size:11px;">ظرفیت تا آزمون کافی نیست.</span>';
    } else if (b.min != null) {
       lbl.innerHTML = '<span style="color:#94a3b8;font-size:11px;">حداقل: <strong style="color:#e2e8f0;">' + _fa(b.min) + '</strong> روز | حداکثر: <strong style="color:#e2e8f0;">' + _fa(b.max) + '</strong> روز</span>';
       var inp = _overlay.querySelector('#rp-maxdays');
       if (inp) {
          inp.setAttribute('min', b.min);
          inp.setAttribute('max', b.max);
          if (_opts.maxDays && _opts.maxDays < b.min) {
             _opts.maxDays = b.min;
             inp.value = b.min;
          }
       }
    }
  }, 250);
}

function _renderControls() {
  var modes = ["recover","rebuild_affected_scope","capacity_rebuild","full_replan"];
  var strategies = R.plannerRecovery.STRATEGIES;
  var modeLabels = {
    recover: "جبران عقب‌ماندگی",
    rebuild_affected_scope: "بازسازی بخش‌های تحت‌تأثیر",
    capacity_rebuild: "تنظیم برنامه بر اساس ظرفیت جدید",
    full_replan: "برنامه‌ریزی کامل از نو"
  };
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

  var capHint = _opts.mode === "capacity_rebuild"
    ? '<div class="p65-hint" style="background:rgba(59,130,246,.10);border-color:rgba(59,130,246,.35);color:#93c5fd;margin-bottom:12px">🔧 <strong>بازسازی ظرفیت:</strong> فقط فعالیت‌های planned آینده لغو و از نو توزیع می‌شوند. کارهای در حال انجام، انجام‌شده و قفل حفظ می‌شوند.</div>'
    : "";
  var fullWarn = _opts.mode === "full_replan"
    ? '<div class="p65-hint" style="background:rgba(244,63,94,.10);border-color:rgba(244,63,94,.35);color:#fb7185;margin-bottom:12px">⚠️ <strong>بازبرنامه‌ریزی کامل:</strong> همه‌ی فعالیت‌های future و unlocked ممکن است لغو و جایگزین شوند.</div>'
    : "";

  var html = '<section class="p65-section">' +
    '<div class="p65-section-title">⚙️ تنظیمات بازبرنامه‌ریزی</div>' +
    capHint + fullWarn +
    '<div class="p65-round-mode-row" style="margin-bottom:12px"><div class="p65-round-mode-title">حالت:</div><div class="p65-round-mode-chips">' + modeChips + '</div></div>' +
    
    '<div style="display:grid;gap:10px;margin-bottom:14px;">' +
      '<label style="display:flex;flex-direction:column;gap:6px;padding:10px;background:rgba(255,255,255,.03);border-radius:8px;">' +
        '<span style="font-size:12px;color:#94a3b8;">مدت هر جلسه</span>' +
        '<select id="rp-session" style="padding:6px 8px;background:rgba(0,0,0,.2);color:#e2e8f0;border:1px solid rgba(255,255,255,.1);border-radius:6px;font-family:inherit;">' +
          [30,45,60,90,120].map(function(v){
            return '<option value="' + v + '"' + (v === _opts.sessionMinutes ? ' selected' : '') + '>' + _fa(v) + ' دقیقه</option>';
          }).join("") +
        '</select>' +
      '</label>' +
      '<label style="display:flex;flex-direction:column;gap:6px;padding:10px;background:rgba(255,255,255,.03);border-radius:8px;">' +
        '<span style="font-size:12px;color:#94a3b8;">حداکثر روزها (خالی = همه)</span>' +
        '<input type="number" id="rp-maxdays" min="1" value="' + (_opts.maxDays || "") + '" placeholder="همه‌ی روزها" style="padding:6px 8px;background:rgba(0,0,0,.2);color:#e2e8f0;border:1px solid rgba(255,255,255,.1);border-radius:6px;font-family:inherit;">' +
        '<div id="rp-bounds-label" style="font-size:11px;margin-top:6px;line-height:1.7;padding:6px 8px;background:rgba(59,130,246,.06);border-radius:6px;border-right:2px solid #3b82f6;">' + _getMaxDaysText() + '</div>' +
      '</label>' +
    '</div>' +

    '<div class="p65-round-mode-row"><div class="p65-round-mode-title">زمان‌بندی جبران:</div>' +
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
  return html;
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
  /* [PATCH:f4b-helpers] */
function _prettyDate(d) {
  if (!d) return "\u2014";
  if (!LIB || !LIB.date || !LIB.date.parseJalali) return _fa(d);
  var p = LIB.date.parseJalali(d);
  if (!p) return _fa(d);
  var months = ["\u0641\u0631\u0648\u0631\u062F\u06CC\u0646","\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A","\u062E\u0631\u062F\u0627\u062F","\u062A\u06CC\u0631","\u0645\u0631\u062F\u0627\u062F","\u0634\u0647\u0631\u06CC\u0648\u0631","\u0645\u0647\u0631","\u0622\u0628\u0627\u0646","\u0622\u0630\u0631","\u062F\u06CC","\u0628\u0647\u0645\u0646","\u0627\u0633\u0641\u0646\u062F"];
  return _fa(p.jd) + " " + months[p.jm - 1];
}

/* [PATCH:f4b1-helpers] book title + existing activities + diff helpers */
function _bookTitle(bookId) {
  var s = _state();
  if (!s || !s.residency || !Array.isArray(s.residency.books)) return bookId || "\u2014";
  for (var i = 0; i < s.residency.books.length; i++) {
    var b = s.residency.books[i];
    if (b && b.id === bookId) return b.title || bookId;
  }
  return bookId || "\u2014";
}

function _existingActivitiesForDate(planId, date) {
  var s = _state();
  if (!s || !s.residency || !Array.isArray(s.residency.activities)) return [];
  var out = [];
  for (var i = 0; i < s.residency.activities.length; i++) {
    var a = s.residency.activities[i];
    if (!a) continue;
    if (a.planId !== planId) continue;
    if (a.plannedDate !== date) continue;
    if (a.status === "cancelled" || a.status === "skipped") continue;
    if (a.locked) continue;
    out.push(a);
  }
  return out;
}

function _renderActPill(a, mode) {
  var _t = _bookTitle(a.bookId);
  var _p = "";
  if (typeof a.plannedPageStart === "number" && typeof a.plannedPageEnd === "number") {
    _p = "ص " + _fa(a.plannedPageStart) + "–" + _fa(a.plannedPageEnd);
  } else if (a.plannedPages) {
    _p = _fa(a.plannedPages) + " ص";
  }
  var _d = a.plannedDurationMinutes ? _rpFmtMin(a.plannedDurationMinutes) : "";
  var _prefix = (mode === "preserved") ? "🔒 " : "";
  var label = _prefix + _t + (_p ? " · " + _p : "") + (_d ? " · " + _d : "");
  return '<span class="rp-act-pill is-' + mode + '">' + _esc(label) + '</span>';
}

function _diffLabelForDay(toCancel, proposed) {
  /* [PATCH:f4b2-diff] */
  var en = toCancel.length, pn = proposed.length;
  if (en === 0 && pn === 0) return '<span class="rp-diff is-same">\u0628\u062F\u0648\u0646 \u062A\u063A\u06CC\u06CC\u0631</span>';
  if (en === 0) return '<span class="rp-diff is-new">+' + _fa(pn) + ' \u062C\u062F\u06CC\u062F</span>';
  if (pn === 0) return '<span class="rp-diff is-removed">-' + _fa(en) + ' \u0644\u063A\u0648</span>';
  return '<span class="rp-diff is-changed">-' + _fa(en) + ' \u00B7 +' + _fa(pn) + '</span>';
}

function _renderProposalSummaryStrip(pr) {
  /* [PATCH:f4b2-summary] */
  var g = _groupProposalByDate(pr);
  var _dates = Object.keys(g);
  var _totalNew = 0, _totalDel = 0, _totalPages = 0;
  _dates.forEach(function(d){
    var _ex = _existingActivitiesForDate(pr.planId, d);
    var _pr = g[d];
    _totalNew += _pr.length;
    _totalDel += _ex.filter(function(a){ return a.status === "planned"; }).length;
    _pr.forEach(function(a){ _totalPages += (a.plannedPages|0); });
  });
  var _readPages = _countReadPages(pr.planId);
  var html = '<div class="rp-f4b1-summary">' +
    '<span>\uD83D\uDCC5 ' + _fa(_dates.length) + ' \u0631\u0648\u0632 \u062A\u062D\u062A \u062A\u0623\u062B\u06CC\u0631</span>' +
    '<span>\u2795 ' + _fa(_totalNew) + ' \u0641\u0639\u0627\u0644\u06CC\u062A \u062C\u062F\u06CC\u062F</span>' +
    '<span>\u2796 ' + _fa(_totalDel) + ' \u0641\u0639\u0627\u0644\u06CC\u062A \u0644\u063A\u0648</span>' +
    '<span>\uD83D\uDCD6 ' + _fa(_totalPages) + ' \u0635\u0641\u062D\u0647 \u062C\u0628\u0631\u0627\u0646</span>';
  if (_readPages > 0) {
    html += '<span>\u2713 ' + _fa(_readPages) + ' \u0635 \u0642\u0628\u0644\u0627\u064B \u062E\u0648\u0627\u0646\u062F\u0647 (\u0645\u062D\u0641\u0648\u0638)</span>';
  }
  html += '</div>';
  return html;
}

function _groupProposalByDate(pr) {
  var _byDate = {};
  ((pr && pr.proposedActivities) || []).forEach(function(a){
    if (!a || !a.plannedDate) return;
    if (!_byDate[a.plannedDate]) _byDate[a.plannedDate] = [];
    _byDate[a.plannedDate].push(a);
  });
  return _byDate;
}

function _countTotalDays(pr) {
  return Object.keys(_groupProposalByDate(pr)).length;
}

function _countSelectedDays(pr) {
  var g = _groupProposalByDate(pr);
  var n = 0;
  Object.keys(g).forEach(function(d){ if (_proposalSelection[d]) n++; });
  return n;
}

function _mergeRangesLocal(ranges) {
  /* [PATCH:f4b9-ui-merge] local range merge (no PS dependency) */
  if (!Array.isArray(ranges) || ranges.length === 0) return [];
  var norm = ranges.filter(function(r){
    return r && typeof r.start === "number" && typeof r.end === "number" && r.end >= r.start;
  });
  if (norm.length === 0) return [];
  norm = norm.slice().sort(function(a,b){ return a.start - b.start; });
  var merged = [{ start: norm[0].start, end: norm[0].end }];
  for (var i = 1; i < norm.length; i++) {
    var last = merged[merged.length - 1];
    if (norm[i].start <= last.end + 1) {
      if (norm[i].end > last.end) last.end = norm[i].end;
    } else {
      merged.push({ start: norm[i].start, end: norm[i].end });
    }
  }
  return merged;
}

function _renderReadProgressPanel(pr) {
  /* [PATCH:f4b9-ui-panel] local merge + baseline + try/catch */
  try {
    var s = _state();
    if (!s || !s.residency) return "";
    var books = (s.residency.books || []);
    var enrolls = (s.residency.enrollments || []);
    var byBook = {};

    (s.residency.activities || []).forEach(function(a){
      if (!a || a.planId !== pr.planId || a.status !== "completed" || !a.bookId) return;
      var p = (a.actualPages || a.plannedPages || 0);
      if (p <= 0) return;
      if (!byBook[a.bookId]) byBook[a.bookId] = { ranges: [] };
      if (typeof a.plannedPageStart === "number" && typeof a.plannedPageEnd === "number") {
        byBook[a.bookId].ranges.push({ start: a.plannedPageStart, end: a.plannedPageEnd });
      }
    });

    if (R.baseline && R.baseline.resolveForEnrollment) {
      enrolls.forEach(function(e){
        if (!e || !e.bookId) return;
        var b = books.find(function(x){ return x && x.id === e.bookId; });
        if (!b) return;
        try {
          var eb = R.baseline.resolveForEnrollment(e, b, enrolls, s.residency.rounds || []);
          if (eb && Array.isArray(eb.ranges) && eb.ranges.length > 0) {
            if (!byBook[e.bookId]) byBook[e.bookId] = { ranges: [] };
            eb.ranges.forEach(function(r) {
              byBook[e.bookId].ranges.push({ start: r.start, end: r.end });
            });
          }
        } catch(err) {}
      });
    }

    var bookIds = Object.keys(byBook);
    if (bookIds.length === 0) return "";

    var html = '<div style="padding:10px 12px;background:rgba(52,211,153,.08);border:1px solid rgba(52,211,153,.30);border-radius:8px;margin-bottom:12px;font-size:11.5px;">';
    html += '<div style="color:#6ee7b7;font-weight:600;margin-bottom:6px;">📖 پیشرفت فعلی (محفوظ می‌ماند)</div>';

    bookIds.forEach(function(bid){
      var book = books.find(function(b){ return b && b.id === bid; });
      var title = book ? (book.title || bid) : bid;
      var total = book ? (book.totalPages || 0) : 0;

      var merged = _mergeRangesLocal(byBook[bid].ranges);
      var readPages = 0;
      merged.forEach(function(r){ readPages += (r.end - r.start + 1); });

      var pct = total > 0 ? Math.round(readPages / total * 100) : 0;
      var rangesStr = merged.slice(0, 5).map(function(r){ return _fa(r.start) + "-" + _fa(r.end); }).join("، ");
      if (merged.length > 5) rangesStr += " …";

      html += '<div style="display:flex;gap:8px;padding:4px 0;border-bottom:1px dashed rgba(255,255,255,.06);flex-wrap:wrap;">';
      html += '<span style="flex:1;min-width:120px;color:#e2e8f0;">' + _esc(title) + '</span>';
      html += '<span style="color:#6ee7b7;white-space:nowrap;">' + _fa(readPages) + ' / ' + _fa(total) + ' (' + _fa(pct) + '%)</span>';
      if (rangesStr) html += '<span style="color:#94a3b8;font-size:10.5px;width:100%;">' + rangesStr + '</span>';
      html += '</div>';
    });
    html += '</div>';
    return html;
  } catch (e) {
    console.warn("[f4b9] read progress panel failed:", e);
    return "";
  }
}

function _renderProposalDays(pr) {
  var g = _groupProposalByDate(pr);
  var _dates = Object.keys(g).sort(function(a,b){ return _cmp(a,b); });
  if (_dates.length === 0) {
    return '<section class="p65-section"><div class="p65-hint p65-hint-info">فعالیت جدیدی برای افزودن نیست.</div></section>';
  }
  var _selCount = _countSelectedDays(pr);
  var html = '<section class="p65-section">';
  html += '<div class="p65-section-title">پیشنهاد روز-به-روز</div>';
  html += _renderProposalSummaryStrip(pr);
  html += _renderReadProgressPanel(pr);
  html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;flex-wrap:wrap;">';
  html += '<button type="button" class="p65-btn p65-btn-ghost p65-btn-sm" data-rp-day-select-all>انتخاب همه</button>';
  html += '<button type="button" class="p65-btn p65-btn-ghost p65-btn-sm" data-rp-day-select-none>لغو انتخاب همه</button>';
  html += '<span style="margin-right:auto;color:#94a3b8;font-size:12px;">' + _fa(_selCount) + ' روز انتخاب شد از ' + _fa(_dates.length) + ' روز</span>';
  html += '</div>';

  _dates.forEach(function(d) {
    var _ctx = _dayContextForDate(pr.planId, d);
    var _dt = _dayTypeLabel(_ctx);
    var _cap = (_ctx && _ctx.finalCapacityMinutes) || 0;

    var _proposed = g[d];
    var pSum = _proposed.reduce(function(s,a){ return s + (a.plannedPages|0); },0);
    var mSum = _proposed.reduce(function(s,a){ return s + (a.plannedDurationMinutes|0); },0);

    var _existing = _existingActivitiesForDate(pr.planId, d);
    var _toCancel = _existing.filter(function(a){ return a.status === "planned"; });
    var _preserved = _existing.filter(function(a){ return a.status !== "planned"; });

    var _sel = !!_proposalSelection[d];
    var _cardCls = "rp-day-card " + (_sel ? "is-sel" : "is-off");

    html += '<label class="' + _cardCls + '">';
    html += '<div class="rp-day-head">';
    html += '<input type="checkbox" data-rp-day-check="' + _esc(d) + '"' + (_sel ? ' checked' : '') + '>';
    html += '<span class="rp-day-date">' + _esc(_prettyDate(d)) + '</span>';
    html += '<span class="rp-day-type">' + _esc(_dt.icon + ' ' + _dt.label + ' · ' + _rpFmtMin(_cap)) + '</span>';
    html += '<span class="rp-day-sum">' + _fa(pSum) + ' ص · ' + _rpFmtMin(mSum) + '</span>';
    html += _diffLabelForDay(_toCancel, _proposed);
    html += '</div>';
    html += '<div class="rp-day-diff">';

    if (_toCancel.length > 0) {
      var _before = _toCancel.map(function(a){ return _renderActPill(a, "before"); }).join("");
      html += '<div class="rp-diff-row"><span class="rp-diff-lbl">قبل:</span><span class="rp-diff-val">' + _before + '</span></div>';
    }

    var _afterParts = [];
    if (_preserved.length > 0) {
      _preserved.forEach(function(a){ _afterParts.push(_renderActPill(a, "preserved")); });
    }
    _proposed.forEach(function(a){ _afterParts.push(_renderActPill(a, "after")); });

    if (_afterParts.length === 0) {
      html += '<div class="rp-diff-row"><span class="rp-diff-lbl">بعد:</span><span class="rp-diff-val rp-act-empty">—</span></div>';
    } else {
      html += '<div class="rp-diff-row"><span class="rp-diff-lbl">بعد:</span><span class="rp-diff-val">' + _afterParts.join("") + '</span></div>';
    }

    html += '</div>';
    html += '</label>';
  });
  html += '</section>';
  return html;
}

function _dayContextForDate(planId, date) {
  try {
    if (!R.calendar || typeof R.calendar.getResidencyDayContext !== "function") return null;
    var ctx = R.calendar.getResidencyDayContext(date, planId);
    var s = _state();
    if (ctx && s && s.residency && s.residency.settings && s.residency.settings.defaultCapacity) {
      var _uCaps = s.residency.settings.defaultCapacity;
      var _pct = typeof s.residency.settings.reservePercent === "number" ? s.residency.settings.reservePercent : 10;
      var _map = { "normal": "normal", "free": "free", "off": "off", "pre_shift": "preShift", "shift": "shift", "post_shift": "postShift" };
      var _k = _map[ctx.dayType] || "normal";
      var _raw = _uCaps[_k];
      if (_raw != null) {
        var _num = Number(_raw);
        if (!isNaN(_num)) {
          ctx.finalCapacityMinutes = Math.max(0, _num - Math.floor(_num * _pct / 100));
        }
      }
    }
    return ctx;
  } catch (e) { return null; }
}

function _dayTypeLabel(ctx) {
  var map = {
    normal: { icon: "\u2600", label: "\u0639\u0627\u062F\u06CC" },
    free: { icon: "F", label: "\u062A\u0639\u0637\u06CC\u0644" },
    shift: { icon: "S", label: "\u06A9\u0634\u06CC\u06A9" },
    pre_shift: { icon: "P", label: "\u0642\u0628\u0644 \u06A9\u0634\u06CC\u06A9" },
    post_shift: { icon: "A", label: "\u0628\u0639\u062F \u06A9\u0634\u06CC\u06A9" },
    off: { icon: "X", label: "\u062A\u0639\u0637\u06CC\u0644" }
  };
  var dt = ctx && ctx.dayType;
  return map[dt] || { icon: "\u00B7", label: dt || "\u0639\u0627\u062F\u06CC" };
}

function _rpFmtMin(m) {
  /* [PATCH:f4b5ui-fmt] human readable time */
  if (!m || m <= 0) return "بدون ظرفیت";
  var h = Math.floor(m/60), mm = m%60;
  if (h === 0) return _fa(mm) + " دقیقه";
  if (mm === 0) return _fa(h) + " ساعت";
  return _fa(h) + " ساعت و " + _fa(mm) + " دقیقه";
}

function _countReadPages(planId) {
  var s = _state();
  if (!s || !s.residency || !Array.isArray(s.residency.activities)) return 0;
  var total = 0;
  s.residency.activities.forEach(function(a){
    if (!a) return;
    if (a.planId !== planId) return;
    if (a.status !== "completed") return;
    total += (a.actualPages || a.plannedPages || 0);
  });
  return total;
}
function _renderProposal(pr) {
  var html = "";
  html += '<div class="p65-section-title" style="margin-bottom:10px">پیشنهاد پیشنهادی</div>';
  var f = pr.feasibility || {};
  var statusMap = {
    "feasible": { cls: "is-ok", icon: "✓", label: "قابل اجرا" },
    "feasible_with_warnings": { cls: "is-warn", icon: "!", label: "قابل اجرا با هشدار" },
    "infeasible": { cls: "is-error", icon: "X", label: "ناقص" },
    "blocked_by_hard_constraint": { cls: "is-block", icon: "B", label: "مسدود" },
    "not_checked": { cls: "is-info", icon: "i", label: "بررسی نشده" }
  };
  var st = statusMap[f.status] || statusMap.not_checked;

  var _hasExecInfo = (pr.executionAnalysis.missedCount > 0) || (pr.executionAnalysis.partialCount > 0) || (pr.executionAnalysis.totalMissedPages > 0);
  if (_hasExecInfo) {
    html += '<section class="p65-section"><div class="p65-feasibility ' + st.cls + '">' +
      '<span class="p65-feasibility-icon">' + st.icon + '</span>' +
      '<div class="p65-feasibility-body"><div class="p65-feasibility-title">' + _esc(st.label) + '</div>' +
        '<div class="p65-feasibility-stats">' +
          'جامانده: ' + _fa(pr.executionAnalysis.missedCount) + ' · ' +
          'نیمه‌کاره: ' + _fa(pr.executionAnalysis.partialCount) + ' · ' +
          'صفحات جامانده: ' + _fa(pr.executionAnalysis.totalMissedPages) +
        '</div></div></div></section>';
  } else {
    html += '<section class="p65-section"><div class="p65-feasibility ' + st.cls + '">' +
      '<span class="p65-feasibility-icon">' + st.icon + '</span>' +
      '<div class="p65-feasibility-body"><div class="p65-feasibility-title">' + _esc(st.label) + '</div>' +
        '<div class="p65-feasibility-stats">' + _fa(_countTotalDays(pr)) + ' روز · ' + _fa((pr.statistics && pr.statistics.proposedCount) || 0) + ' فعالیت جدید</div>' +
      '</div></div></section>';
  }

  html += _renderBeforeAfter(pr);
  html += _renderProposalDays(pr); /* [PATCH:f4b11-dedup] panels are inside days */
  html += _renderReservePanel(pr);

  if (pr.ignoredRules && pr.ignoredRules.length > 0) {
    html += '<section class="p65-section"><div class="p65-hint p65-hint-info">' + _fa(pr.ignoredRules.length) + ' قانون برای این Replan نادیده گرفته شد.</div></section>';
  }

  var canApply = f.status !== "blocked_by_hard_constraint";
  var _selCount = _countSelectedDays(pr);
  var _totalDays = _countTotalDays(pr);

  html += '<div class="p65-footer p65-footer-proposal">' +
    '<div class="p65-footer-actions">' +
      '<button class="p65-btn p65-btn-primary" type="button" data-rp-apply' + (canApply && _selCount > 0 ? '' : ' disabled') + '>اعمال انتخاب‌شده (' + _fa(_selCount) + ')</button>' +
      '<button class="p65-btn p65-btn-ghost" type="button" data-rp-apply-all' + (canApply ? '' : ' disabled') + '>اعمال همه (' + _fa(_totalDays) + ')</button>' +
      '<button class="p65-btn p65-btn-ghost" type="button" data-rp-reject>رد کردن</button>' +
      '<button class="p65-btn p65-btn-ghost" type="button" data-rp-back>تنظیمات</button>' +
    '</div>' +
  '</div>';

  return html;
}

  function _renderBeforeAfter(pr) {
  /* [PATCH:f4b4fix-ba] relabel to اکنون / پس از اعمال */
  var rec = pr.recovery || {};
  var debtBefore = (rec.debtPages != null) ? rec.debtPages : ((rec.missedPages || 0) + (rec.partialDeficitPages || 0));
  var debtAfter = (rec.remainingDebtPages != null) ? rec.remainingDebtPages : Math.max(0, debtBefore - (rec.recoveredPages || 0));
  var rows = [
    { label: "کار عقب‌افتاده", before: debtBefore, after: debtAfter, unit: "صفحه" },
    { label: "فعالیت‌های جدید", before: 0, after: (pr.statistics && pr.statistics.proposedCount) || 0, unit: "" },
    { label: "ساعت ذخیره‌ی مصرف‌شده", before: 0, after: (pr.reserve && pr.reserve.consumedMinutes) || 0, unit: "دقیقه" }
  ];
  return '<section class="p65-section"><div class="p65-section-title">🔄 وضعیت برنامه</div>' +
    '<div class="p75-ba-table">' +
    '<div class="p75-ba-row p75-ba-head"><div>شاخص</div><div>اکنون</div><div>پس از اعمال</div></div>' +
    rows.map(function (r) {
      return '<div class="p75-ba-row">' +
        '<div>' + _esc(r.label) + '</div>' +
        '<div>' + _fa(r.before) + (r.unit ? " " + _esc(r.unit) : "") + '</div>' +
        '<div>' + _fa(r.after) + (r.unit ? " " + _esc(r.unit) : "") + '</div>' +
      '</div>';
    }).join("") +
    '</div>' +
    '<div class="p65-stats-grid p65-stats-4" style="margin-top:14px">' +
      _stat("✅", "حفظ‌شده", _fa((pr.statistics && pr.statistics.preservedCount) || 0)) +
      _stat("🗑️", "لغو", _fa((pr.statistics && pr.statistics.cancelledCount) || 0)) +
      _stat("➕", "جدید", _fa((pr.statistics && pr.statistics.proposedCount) || 0)) +
      _stat("📄", "جبران شده", _fa((pr.statistics && pr.statistics.proposedPages) || 0)) +
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
    var html = '<section class="p65-section"><div class="p65-section-title">🛡️ ساعت ذخیره</div>';
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
      html += '<div class="p65-hint" style="margin-top:10px;background:rgba(244,63,94,.10);border-color:rgba(244,63,94,.35);color:#fb7185">🛑 <strong>ساعت ذخیره تمام شد.</strong> گزینه‌های جبران را بررسی کن.</div>';
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
    var sessionSel = _overlay.querySelector("#rp-session");
    if (sessionSel) sessionSel.addEventListener("change", function () {
      _opts.sessionMinutes = parseInt(sessionSel.value, 10) || 90;
    });
    var sessionSel = _overlay.querySelector("#rp-session");
    if (sessionSel) sessionSel.addEventListener("change", function () {
      _opts.sessionMinutes = parseInt(sessionSel.value, 10) || 90;
    });
    var maxDaysInp = _overlay.querySelector("#rp-maxdays");
    if (maxDaysInp) maxDaysInp.addEventListener("input", function () {
      var v = parseInt(maxDaysInp.value, 10);
      _opts.maxDays = (isNaN(v) || v < 1) ? null : v;
    });
        var sessionSel = _overlay.querySelector("#rp-session");
    if (sessionSel) sessionSel.addEventListener("change", function () { _opts.sessionMinutes = parseInt(sessionSel.value, 10) || 90; _updateBoundsUI(); });
    var maxDaysInp = _overlay.querySelector("#rp-maxdays");
    if (maxDaysInp) maxDaysInp.addEventListener("input", function () {
      var v = parseInt(maxDaysInp.value, 10);
      var _max = _getMaxDaysAvailable();
      if (isNaN(v) || v < 1) {
        _opts.maxDays = null;
      } else {
        _opts.maxDays = (_max > 0) ? Math.min(v, _max) : v;
        if (_opts.maxDays !== v) maxDaysInp.value = _opts.maxDays;
      }
    });
    if (typeof _updateBoundsUI === "function") { _updateBoundsUI(); } /* [PATCH:f4b16-wire] */
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
    /* [PATCH:f4b-wire] */
    _overlay.querySelectorAll("[data-rp-apply]").forEach(function (b) { b.addEventListener("click", function(){ _onApply(false); }); });
    _overlay.querySelectorAll("[data-rp-apply-all]").forEach(function (b) { b.addEventListener("click", function(){ _onApply(true); }); });
    _overlay.querySelectorAll("[data-rp-day-select-all]").forEach(function (b) { b.addEventListener("click", function() {
      var _g = _groupProposalByDate(_proposal); Object.keys(_g).forEach(function(d){ _proposalSelection[d] = true; }); _render();
    }); });
    _overlay.querySelectorAll("[data-rp-day-select-none]").forEach(function (b) { b.addEventListener("click", function() {
      var _g = _groupProposalByDate(_proposal); Object.keys(_g).forEach(function(d){ _proposalSelection[d] = false; }); _render();
    }); });
    _overlay.querySelectorAll("[data-rp-day-check]").forEach(function(cb){ cb.addEventListener("change", function() {
      var _d = cb.getAttribute("data-rp-day-check"); if (!_d) return; _proposalSelection[_d] = !!cb.checked; _render();
    }); });
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
          ignoreRuleIds: _getIgnoreIds(), sessionMinutes: _opts.sessionMinutes, maxDays: _opts.maxDays
        });
      } catch (e) { res = { ok: false, error: String(e.message || e) }; }
      _generating = false;
      if (!res || !res.ok) {
        _render();
        var body = _overlay.querySelector(".p65-body");
        if (body) {
          if (res && res.isNoop) {
            /* [PATCH:r3f3-uialign-noop] mode-aware message */
            var _noopMsg = res.error || "کاری برای جبران پیدا نشد؛ برنامه تغییری نکرد.";
            if (_opts.mode === "recover") {
              _noopMsg = "بدهی واقعی (missed/partial) پیدا نشد. اگر تغییر از نوع ظرفیت یا روش مطالعه است، حالت بازسازی ظرفیت را انتخاب کن.";
            }
            body.insertAdjacentHTML("afterbegin",
              '<div class="p65-hint p65-hint-info" style="margin-bottom:10px">ℹ️ ' +
              _esc(_noopMsg) +
              '</div>');
          } else {
            body.insertAdjacentHTML("afterbegin",
              '<div class="p65-inline-error">❌ ' + _esc(res && res.error || "خطا") + '</div>');
          }
        }
        return;
      }
      _proposal = res.proposal;
      /* [PATCH:f4b-reset] select all days by default */
      _proposalSelection = {};
      (res.proposal.proposedActivities || []).forEach(function(a) {
        if (a && a.plannedDate) _proposalSelection[a.plannedDate] = true;
      });
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
          ignoreRuleIds: _getIgnoreIds(), sessionMinutes: _opts.sessionMinutes, maxDays: _opts.maxDays
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

  function _onApply(applyAll) {
  if (!_proposal) return;
  var pr = _proposal;
  var _byDate = _groupProposalByDate(pr);
  var _allDates = Object.keys(_byDate);
  
  var _keepDates = {};
  if (applyAll) {
    _allDates.forEach(function(d){ _keepDates[d] = true; });
  } else {
    Object.keys(_proposalSelection).forEach(function(d){ if (_proposalSelection[d]) _keepDates[d] = true; });
  }
  var _keepCount = Object.keys(_keepDates).length;
  if (_keepCount === 0) {
    try { if (R.notify && R.notify.error) R.notify.error("حداقل یک روز را انتخاب کن."); } catch(e){}
    return;
  }
  
  var _allSelected = _allDates.length > 0 && _allDates.every(function(d){ return _keepDates[d]; });
  var _isRebuild = (pr.mode === "capacity_rebuild" || pr.mode === "full_replan");
  var _effectiveApplyAll = applyAll || _allSelected || _isRebuild;

  var _prCopy;
  try { _prCopy = JSON.parse(JSON.stringify(pr)); }
  catch (e) { _prCopy = pr; }

  if (_effectiveApplyAll) {
    _prCopy.cancelledActivities = (pr.cancelledActivities || []).slice();
    try {
      var s = _state();
      if (s && s.residency && Array.isArray(s.residency.activities)) {
        var _today = (window.InternshipLib && window.InternshipLib.date)
          ? window.InternshipLib.date.todayJalaliString() : "";
        var _seen = {};
        _prCopy.cancelledActivities.forEach(function(c){ if (c && c.id) _seen[c.id] = true; });
        s.residency.activities.forEach(function(a){
          if (!a) return;
          if (a.planId !== pr.planId) return;
          if (a.status !== "planned") return;
          if (a.locked) return;
          if (_today && a.plannedDate && window.InternshipLib.date.compareJalaliDate(a.plannedDate, _today) < 0) return;
          if (_seen[a.id]) return;
          _prCopy.cancelledActivities.push({
            id: a.id, bookId: a.bookId, roundId: a.roundId,
            plannedDate: a.plannedDate, plannedPages: a.plannedPages | 0,
            plannedDurationMinutes: a.plannedDurationMinutes | 0
          });
          _seen[a.id] = true;
        });
      }
    } catch (_sweepErr) { console.warn("[f7-sweep] failed:", _sweepErr); }
  } else {
    _prCopy.cancelledActivities = (pr.cancelledActivities || []).filter(function(c){
      if (!c) return true;
      if (!c.plannedDate) return true;
      return _keepDates[c.plannedDate];
    });
  }

  _prCopy.proposedActivities = (pr.proposedActivities || []).filter(function(a){
    return a && a.plannedDate && _keepDates[a.plannedDate];
  });

  _prCopy.coveredTriggerIds = _allSelected ? (pr.coveredTriggerIds || []).slice() : [];
  var _pSum = _prCopy.proposedActivities.reduce(function(s,a){ return s + (a.plannedPages|0); },0);
  var _mSum = _prCopy.proposedActivities.reduce(function(s,a){ return s + (a.plannedDurationMinutes|0); },0);
  if (!_prCopy.statistics) _prCopy.statistics = {};
  _prCopy.statistics.proposedCount = _prCopy.proposedActivities.length;
  _prCopy.statistics.proposedPages = _pSum;
  _prCopy.statistics.proposedMinutes = _mSum;
  _prCopy.statistics.cancelledCount = _prCopy.cancelledActivities.length;

  var _doApply = function() {
    var res = R.plannerReplanApply.applyReplanProposal(_prCopy, {});
    if (res && res.success) {
      _overlay.innerHTML = '<header class="p65-header"><div class="p65-header-left"><span class="p65-header-icon">OK</span><div><div class="p65-header-title">پیشنهاد اعمال شد</div></div></div></header>' +
        '<div class="p65-body">' +
        '<div class="p65-success"><div class="p65-success-icon">OK</div><div class="p65-success-title">' + _fa(res.created.length) + ' فعالیت جدید اضافه شد</div>' +
        '<div class="p65-success-desc">' + _fa(res.cancelled.length) + ' فعالیت لغو · ' + _fa(res.recoveredPages) + ' صفحه جبران</div></div>' +
        '<div class="p65-footer"><button class="p65-btn p65-btn-primary" type="button" data-p65-close>بستن</button></div></div>';
      _wire();
      if (window.__os && window.__os.render) setTimeout(function(){ window.__os.render(); }, 50);
    } else {
      var reason = (res && (res.reason || (res.errors && res.errors[0]))) || "خطا";
      var msg2 = (reason === "stale_proposal_fingerprint_mismatch" || reason === "stale_replan_proposal")
        ? "این پیشنهاد دیگر معتبر نیست؛ برنامه تغییر کرده. یک پیشنهاد جدید بساز."
        : ("خطا: " + reason);
      var body = _overlay.querySelector(".p65-body");
      if (body) body.insertAdjacentHTML("afterbegin", '<div class="p65-inline-error">' + _esc(msg2) + '</div>');
    }
  };

  var summary = "این پیشنهاد برای " + _fa(_keepCount) + " روز:\n" +
    "• حفظ: " + _fa((pr.statistics && pr.statistics.preservedCount) || 0) + " فعالیت\n" +
    "• لغو/حذف: " + _fa(_prCopy.cancelledActivities.length) + " فعالیت\n" +
    "• جدید: " + _fa(_prCopy.proposedActivities.length) + " فعالیت\n" +
    "• جبران: " + _fa(_pSum) + " صفحه";

  _confirmDialog(summary + "\n\nاعمال شود؟", _doApply);
}
  (function _injectF4B1CSS() { /* [PATCH:f4b1-css] */
    if (document.getElementById("rp-f4b1-css")) return;
    var s = document.createElement("style");
    s.id = "rp-f4b1-css";
    s.textContent = ".rp-day-card{display:block;padding:10px 12px;margin-bottom:8px;border-radius:8px;cursor:pointer;transition:all .15s}" +
      ".rp-day-card.is-sel{background:rgba(255,255,255,.04);border:1px solid rgba(59,130,246,.5)}" +
      ".rp-day-card.is-off{background:rgba(255,255,255,.02);border:1px solid rgba(255,255,255,.08);opacity:.7}" +
      ".rp-day-head{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap}" +
      ".rp-day-date{font-weight:700;color:#e2e8f0;font-size:13px}" +
      ".rp-day-sum{color:#94a3b8;font-size:11.5px}" +
      ".rp-diff{margin-right:auto;font-size:10.5px;padding:2px 8px;border-radius:10px;font-weight:600;white-space:nowrap}" +
      ".rp-diff.is-new{background:rgba(52,211,153,.2);color:#6ee7b7}" +
      ".rp-diff.is-removed{background:rgba(251,113,133,.2);color:#fda4af}" +
      ".rp-diff.is-changed{background:rgba(251,191,36,.2);color:#fcd34d}" +
      ".rp-diff.is-same{background:rgba(148,163,184,.15);color:#cbd5e1}" +
      ".rp-day-diff{padding:6px 10px;background:rgba(0,0,0,.2);border-radius:6px;font-size:11px;line-height:1.7}" +
      ".rp-diff-row{display:flex;gap:8px;align-items:flex-start}" +
      ".rp-diff-row+.rp-diff-row{margin-top:3px;padding-top:3px;border-top:1px dashed rgba(255,255,255,.06)}" +
      ".rp-diff-lbl{color:#64748b;min-width:36px;flex-shrink:0;font-size:10.5px;padding-top:2px}" +
      ".rp-diff-val{flex:1;display:flex;flex-wrap:wrap;gap:4px}" +
      ".rp-act-pill{display:inline-block;padding:1px 7px;border-radius:4px;font-size:10.5px;white-space:nowrap}" +
      ".rp-act-pill.is-before{background:rgba(148,163,184,.18);color:#cbd5e1;text-decoration:line-through;opacity:.75}" +
      ".rp-act-pill.is-after{background:rgba(52,211,153,.18);color:#6ee7b7}" +
      ".rp-act-empty{color:#64748b;font-style:italic;font-size:10.5px}" +
      ".rp-f4b1-summary{display:flex;gap:10px;flex-wrap:wrap;padding:10px 12px;background:rgba(59,130,246,.08);border:1px solid rgba(59,130,246,.25);border-radius:8px;margin-bottom:12px;font-size:11.5px;color:#93c5fd}" +
      ".rp-f4b1-summary > span{white-space:nowrap}" +
      ".rp-day-type{font-size:10.5px;padding:1px 6px;border-radius:4px;background:rgba(148,163,184,.15);color:#cbd5e1;white-space:nowrap}" +
      ".rp-act-pill.is-preserved{background:rgba(100,116,139,.22);color:#94a3b8}";
    document.head.appendChild(s);
})();
console.log("[planner.replan.ui.v7] loaded");
})();