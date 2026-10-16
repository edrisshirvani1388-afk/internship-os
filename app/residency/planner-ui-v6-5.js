/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner UI v6.5
   Generate → Review → Apply Experience
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.ui.v6.5] R missing"); return; }
  var UI = R.plannerUI = R.plannerUI || {};

  // ─── State ───
  var _overlay = null;
  var _planId = null;
  var _proposal = null;
  var _generating = false;
  var _applying = false;
  var _lastApplyResult = null;

  // ─── Helpers ───
  function _esc(s) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.escapeHTML) return LIB.escapeHTML(s);
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function _fa(n) {
    var LIB = window.InternshipLib;
    return LIB && LIB.faNum ? LIB.faNum(n) : String(n);
  }
  function _fmtTime(t) {
    return t ? _fa(t) : "—";
  }
  function _getState() {
    return window.__os && window.__os.getState ? window.__os.getState() : null;
  }
  function _state() { return _getState(); }

  // ─── Open/Close ───
  UI.open = function (planId) {
    if (!planId) {
      var s = _getState();
      var activePlan = s && s.residency && s.residency.meta && s.residency.meta.activePlanId;
      if (!activePlan) {
        var plans = R.store.getPlans() || [];
        if (plans.length === 0) {
          _showSimpleAlert("هنوز برنامه‌ای نساخته‌ای. اول یک Plan بساز.");
          return;
        }
        planId = plans[0].id;
      } else {
        planId = activePlan;
      }
    }

    // Check preconditions
    var snap = R.plannerSnapshot && R.plannerSnapshot.build ? R.plannerSnapshot.build(planId, "plan") : null;
    if (!snap) {
      _showSimpleAlert("برنامه یافت نشد.");
      return;
    }

    _planId = planId;
    _proposal = null;
    _generating = false;
    _applying = false;
    _lastApplyResult = null;

    // Close existing
    if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);

    _overlay = document.createElement("div");
    _overlay.className = "p65-overlay";
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";

    _render();

    document.addEventListener("keydown", _escHandler);
    _overlay._esc = _escHandler;
  };

  function _escHandler(e) {
    if (e.key === "Escape") UI.close();
  }

  UI.close = function () {
    if (!_overlay) return;
    if (_overlay._esc) document.removeEventListener("keydown", _overlay._esc);
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () {
      if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
      _overlay = null;
    }, 220);
  };

  // ─── Simple alert ───
  function _showSimpleAlert(msg) {
    if (window.openModal) {
      window.openModal({ title: "برنامه‌ریزی خودکار", message: _esc(msg), confirmText: "باشه" });
    } else {
      alert(msg);
    }
  }

  // ─── Main render ───
  function _render() {
    if (!_overlay) return;
    var state = _getState();
    var plan = (R.store.getPlan(_planId)) || {};
    var rounds = R.store.getRoundsForPlan(_planId) || [];

    // Build a snapshot for summary (read-only)
    var snap = R.plannerSnapshot.build(_planId, "plan");
    if (!snap) {
      _overlay.innerHTML = _renderErrorBox("داده‌های Plan ناقص است.");
      return;
    }

    var demands = snap.demands || [];
    var feasibility = snap.goals ? null : null; // feasibility comes from proposal

    // Compute demand aggregate
    var totalTarget = 0, totalStudied = 0, totalRemaining = 0, totalMinutes = 0;
    demands.forEach(function (d) {
      totalTarget += (d.targetPages | 0);
      totalStudied += (d.alreadyStudiedPages | 0);
      totalRemaining += (d.remainingPages | 0);
      totalMinutes += (d.estimatedRemainingMinutes | 0);
    });
    var coveredPct = totalTarget > 0 ? Math.round(totalStudied / totalTarget * 100) : 0;

    // Capacity aggregate
    var totalCap = 0, totalAllocatable = 0, totalCommitted = 0, calendarDays = 0;
    (snap.calendar || []).forEach(function (c) {
      calendarDays++;
      totalCap += (c.finalCapacityMinutes | 0);
      totalCommitted += 0;
    });

    var html = "";
    html += _renderHeader(plan);
    html += '<div class="p65-body">';
    html += _renderPlanSummary(plan, rounds, snap);
    html += _renderDemandSummary(demands, totalTarget, totalStudied, totalRemaining, coveredPct);
    html += _renderCapacitySummary(snap.calendar, calendarDays);

    // Empty states check
    var emptyWarning = _checkEmptyStates(snap, demands, rounds);
    if (emptyWarning) {
      html += _renderEmptyBox(emptyWarning);
    }

    // Generate controls / proposal
    if (!_proposal && !_generating) {
      html += _renderGenerateControls(plan, rounds, snap, emptyWarning);
      html += _renderGenerateFooter(!!emptyWarning);
    } else if (_generating) {
      html += _renderGenerating();
    } else if (_proposal) {
      html += _renderProposalPreview(_proposal, snap);
      html += _renderFooterActions(_proposal);
    }

    html += '</div>';
    _overlay.innerHTML = html;
    _wire();
  }

  // ─── Header ───
  function _renderHeader(plan) {
    return '<header class="p65-header">' +
      '<div class="p65-header-left">' +
        '<span class="p65-header-icon">🚀</span>' +
        '<div>' +
          '<div class="p65-header-title">برنامه‌ریزی خودکار</div>' +
          '<div class="p65-header-sub">' + _esc(plan.title || "بدون عنوان") + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="p65-close" type="button" data-p65-close aria-label="بستن">✕</button>' +
    '</header>';
  }

  // ─── Plan summary ───
  function _renderPlanSummary(plan, rounds, snap) {
    return '<section class="p65-section">' +
      '<div class="p65-section-title">📋 خلاصه Plan</div>' +
      '<div class="p65-stats-grid">' +
        _statCard("📅", "تاریخ آزمون", plan.examDate ? _fa(plan.examDate) : "—") +
        _statCard("🔄", "تعداد Round", _fa(rounds.length)) +
        _statCard("📚", "کتاب", _fa((snap.books || []).length)) +
        _statCard("📖", "Enrollment", _fa((snap.enrollments || []).length)) +
      '</div>' +
    '</section>';
  }

  function _statCard(icon, label, value) {
    return '<div class="p65-stat-card">' +
      '<span class="p65-stat-icon">' + icon + '</span>' +
      '<div class="p65-stat-body">' +
        '<div class="p65-stat-label">' + _esc(label) + '</div>' +
        '<div class="p65-stat-value">' + _esc(value) + '</div>' +
      '</div>' +
    '</div>';
  }

  // ─── Demand summary ───
  function _renderDemandSummary(demands, totalTarget, totalStudied, totalRemaining, pct) {
    if (demands.length === 0) {
      return '<section class="p65-section">' +
        '<div class="p65-section-title">📊 وضعیت مطالعه</div>' +
        '<div class="p65-empty-inline">هیچ Demand فعالی وجود ندارد.</div>' +
      '</section>';
    }
    var rows = demands.map(function (d) {
      var s = _getState();
      var book = (s.residency.books || []).find(function (b) { return b.id === d.bookId; });
      var bookTitle = book ? book.title : d.bookId;
      var statusClass = "p65-status-" + (d.status || "active");
      return '<div class="p65-demand-row">' +
        '<div class="p65-demand-book">' + _esc(bookTitle) + '</div>' +
        '<div class="p65-demand-stats">' +
          '<span class="p65-demand-stat">هدف: ' + _fa(d.targetPages) + '</span>' +
          '<span class="p65-demand-stat">خوانده: ' + _fa(d.alreadyStudiedPages) + '</span>' +
          '<span class="p65-demand-stat">باقی: ' + _fa(d.remainingPages) + '</span>' +
        '</div>' +
        '<span class="p65-demand-status ' + statusClass + '">' + _esc(_statusLabel(d.status)) + '</span>' +
      '</div>';
    }).join("");

    return '<section class="p65-section">' +
      '<div class="p65-section-title">📊 وضعیت مطالعه</div>' +
      '<div class="p65-progress-bar"><div class="p65-progress-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="p65-progress-meta">' +
        _fa(totalStudied) + ' از ' + _fa(totalTarget) + ' صفحه · ' +
        _fa(pct) + '٪ · باقی: ' + _fa(totalRemaining) + ' صفحه · ' +
        'زمان تخمینی: ' + _fa(Math.round(totalRemaining / 20)) + ' ساعت' +
      '</div>' +
      '<div class="p65-demand-list">' + rows + '</div>' +
    '</section>';
  }

  function _statusLabel(st) {
    return {
      "active": "فعال",
      "optional": "اختیاری",
      "excluded": "حذف‌شده",
      "paused": "متوقف",
      "review_only": "فقط مرور",
      "completed": "تمام‌شده"
    }[st] || st;
  }

  // ─── Capacity summary ───
  function _renderCapacitySummary(calendar, days) {
    var totalCap = 0, totalAvail = 0;
    (calendar || []).forEach(function (c) {
      totalCap += (c.finalCapacityMinutes | 0);
      totalAvail += (c.availableCapacityMinutes | 0);
    });
    return '<section class="p65-section">' +
      '<div class="p65-section-title">⏱️ ظرفیت تقویم</div>' +
      '<div class="p65-stats-grid">' +
        _statCard("📅", "روزهای تقویم", _fa(days)) +
        _statCard("⏳", "ظرفیت کل", _fa(Math.round(totalCap / 60)) + " ساعت") +
        _statCard("✅", "قابل تخصیص", _fa(Math.round(totalAvail / 60)) + " ساعت") +
      '</div>' +
    '</section>';
  }

  // ─── Empty states check ───
  function _checkEmptyStates(snap, demands, rounds) {
    if (rounds.length === 0) return "هیچ Round تعریف نشده. ابتدا در بخش چرخش‌ها یک Round بساز.";
    if ((snap.books || []).length === 0) return "هیچ کتابی برای این Plan ثبت نشده.";
    if ((snap.enrollments || []).length === 0) return "هیچ Book در Roundهای این Plan ثبت نشده.";
    if (demands.length === 0) return "هیچ Demand فعالی وجود ندارد (همه excluded/paused/completed).";
    if ((snap.calendar || []).length === 0) return "ظرفیت تقویم خالی است. Rotations و Shiftها را بررسی کن.";
    var active = demands.filter(function (d) { return d.status === "active" || d.status === "optional"; });
    if (active.length === 0) return "هیچ Demand قابل تخصیصی وجود ندارد.";
    var hasRemaining = active.some(function (d) { return d.remainingPages > 0; });
    if (!hasRemaining) return "همه‌ی کتاب‌ها تکمیل شده‌اند. چیز جدیدی برای برنامه‌ریزی نیست.";
    return null;
  }

  function _renderEmptyBox(msg) {
    return '<div class="p65-empty">' +
      '<span class="p65-empty-icon">🌱</span>' +
      '<div>' + _esc(msg) + '</div>' +
    '</div>';
  }

  function _renderErrorBox(msg) {
    return '<div class="p65-error">' + _esc(msg) + '</div>';
  }

  // ─── Generate Controls ───
  function _renderGenerateControls(plan, rounds, snap, hasEmptyWarning) {
    var primaryMode = "algorithmic";
    var roundModes = rounds.map(function (r) {
      return { roundId: r.id, title: r.title, mode: r.allocationMode || "algorithmic" };
    });
    var modes = ["algorithmic", "equal", "manual"];

    var roundRows = roundModes.map(function (r) {
      var chips = modes.map(function (m) {
        var active = (m === r.mode) ? " is-active" : "";
        return '<button type="button" class="p65-mode-chip' + active + '"' +
          ' data-p65-mode="' + m + '" data-p65-round="' + _esc(r.roundId) + '">' +
          _esc(_modeLabel(m)) +
        '</button>';
      }).join("");
      return '<div class="p65-round-mode-row">' +
        '<div class="p65-round-mode-title">' + _esc(r.title) + '</div>' +
        '<div class="p65-round-mode-chips">' + chips + '</div>' +
      '</div>';
    }).join("");

    return '<section class="p65-section">' +
      '<div class="p65-section-title">⚙️ تنظیمات Allocation</div>' +
      '<p class="p65-hint">حالت تخصیص هر Round را انتخاب کن. ' +
        'این تنظیمات روی <strong>Round</strong> ذخیره می‌شود و در Generate بعدی هم اعمال می‌گردد.</p>' +
      roundRows +
      '<div class="p65-hint p65-hint-info" style="margin-top:12px">' +
        '<strong>توجه:</strong> Generate فقط پیشنهاد می‌سازد — تا زمانی که تأیید نکنی، هیچ Activity یا Task جدیدی در تقویم ساخته نمی‌شود.' +
      '</div>' +
    '</section>';
  }

  function _modeLabel(m) {
    return { "algorithmic": "الگوریتمی", "equal": "برابر", "manual": "دستی" }[m] || m;
  }

  function _renderGenerateFooter(disabled) {
    return '<div class="p65-footer">' +
      '<button class="p65-btn p65-btn-primary" type="button" data-p65-generate' +
        (disabled ? " disabled" : "") + '>' +
        '🚀 ساخت پیشنهاد برنامه' +
      '</button>' +
      '<button class="p65-btn p65-btn-ghost" type="button" data-p65-close>انصراف</button>' +
    '</div>';
  }

  // ─── Generating ───
  function _renderGenerating() {
    return '<div class="p65-generating">' +
      '<div class="p65-spinner"></div>' +
      '<div class="p65-generating-text">در حال ساخت پیشنهاد برنامه...</div>' +
      '<div class="p65-generating-hint">این ممکن است چند لحظه طول بکشد.</div>' +
    '</div>';
  }

  // ─── Proposal Preview ───
  function _renderProposalPreview(proposal, snap) {
    var html = "";

    // Feasibility panel
    html += _renderFeasibility(proposal.feasibility);

    // Stat cards
    var f = proposal.feasibility;
    var stats = '<div class="p65-stats-grid p65-stats-4">' +
      _statCard("📄", "صفحه برنامه‌ریزی", _fa(f.plannedPages)) +
      _statCard("⏱️", "دقیقه برنامه‌ریزی", _fa(f.plannedMinutes)) +
      _statCard("📚", "Activity", _fa(proposal.proposedActivities.length)) +
      _statCard("📖", "کتاب", _fa(proposal.statistics.plannedBooks)) +
    '</div>';
    html += '<section class="p65-section">' +
      '<div class="p65-section-title">📊 خلاصه پیشنهاد</div>' +
      stats +
    '</section>';

    // Deficit / Warning panel
    var issuesHtml = _renderIssues(proposal);
    if (issuesHtml) html += issuesHtml;

    // Daily schedule preview
    html += _renderDailySchedule(proposal, snap);

    // Constraint effects
    if (proposal.allocationResult && proposal.allocationResult.constraintEffects &&
        proposal.allocationResult.constraintEffects.length > 0) {
      html += _renderConstraintEffects(proposal.allocationResult.constraintEffects);
    }

    return html;
  }

  // ─── Feasibility ───
  function _renderFeasibility(f) {
    if (!f) return "";
    var statusMap = {
      "feasible": { cls: "is-ok", icon: "✅", label: "قابل اجرا" },
      "feasible_with_warnings": { cls: "is-warn", icon: "🟠", label: "قابل اجرا با هشدار" },
      "infeasible": { cls: "is-error", icon: "🔴", label: "ناقص — کمبود ظرفیت" },
      "blocked_by_hard_constraint": { cls: "is-block", icon: "🛑", label: "مسدود توسط محدودیت قطعی" },
      "not_checked": { cls: "is-info", icon: "ℹ️", label: "بررسی نشده" }
    };
    var st = statusMap[f.status] || statusMap.not_checked;

    return '<section class="p65-section">' +
      '<div class="p65-feasibility ' + st.cls + '">' +
        '<span class="p65-feasibility-icon">' + st.icon + '</span>' +
        '<div class="p65-feasibility-body">' +
          '<div class="p65-feasibility-title">' + _esc(st.label) + '</div>' +
          '<div class="p65-feasibility-stats">' +
            'هدف: ' + _fa(f.requiredPages) + ' صفحه · ' +
            'قبلاً خوانده: ' + _fa(f.alreadyStudiedPages) + ' · ' +
            'جدید: ' + _fa(f.plannedPages) + ' · ' +
            'باقی: ' + _fa(f.unmetPages) + ' · ' +
            'پوشش: ' + _fa(f.coveragePercent) + '٪' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
  }

  // ─── Issues ───
  function _renderIssues(proposal) {
    var all = [];
    (proposal.deficits || []).forEach(function (d) { all.push(d); });
    (proposal.warnings || []).forEach(function (w) { all.push(w); });

    if (all.length === 0) return "";

    // Group by severity
    var errors = all.filter(function (x) { return x.severity === "error" || x.severity === "blocker"; });
    var warnings = all.filter(function (x) { return x.severity === "warning"; });
    var infos = all.filter(function (x) { return x.severity === "info"; });

    var html = '<section class="p65-section">' +
      '<div class="p65-section-title">⚠️ گزارش محدودیت‌ها</div>';

    if (errors.length > 0) {
      html += '<div class="p65-issue-group">' +
        '<div class="p65-issue-group-title is-error">🔴 مانع برنامه‌ریزی (' + _fa(errors.length) + ')</div>' +
        errors.map(_issueRow).join("") +
      '</div>';
    }
    if (warnings.length > 0) {
      html += '<div class="p65-issue-group">' +
        '<div class="p65-issue-group-title is-warn">🟠 هشدار (' + _fa(warnings.length) + ')</div>' +
        warnings.map(_issueRow).join("") +
      '</div>';
    }
    if (infos.length > 0) {
      html += '<div class="p65-issue-group">' +
        '<div class="p65-issue-group-title is-info">🔵 اطلاع (' + _fa(infos.length) + ')</div>' +
        infos.map(_issueRow).join("") +
      '</div>';
    }

    html += '</section>';
    return html;
  }

  function _issueRow(d) {
    var icon = d.severity === "blocker" || d.severity === "error" ? "🔴"
             : d.severity === "warning" ? "🟠" : "🔵";
    var label = _deficitLabel(d.type);
    var reason = "";
    if (d.reason === "unassigned" && d.percent != null) reason = "حدود " + _fa(Math.round(d.percent)) + "٪ ظرفیت اختصاص داده نشد";
    else if (d.type === "capacity_deficit" && d.unmetPages != null) reason = "کمبود " + _fa(d.unmetPages) + " صفحه";
    else if (d.type === "hard_constraint_block") reason = "قانون: " + _esc(d.reason || "");
    else if (d.type === "round_overlap") reason = "Roundها همپوشانی دارند";
    else if (d.type === "sessionization_deficit") reason = "کمبود زمان‌بندی: " + _fa(d.unmetPages) + " صفحه";
    else if (d.reason) reason = _esc(d.reason);

    var dateStr = d.date ? " · " + _fa(d.date) : "";
    return '<div class="p65-issue-row">' +
      '<span class="p65-issue-icon">' + icon + '</span>' +
      '<div class="p65-issue-body">' +
        '<div class="p65-issue-title">' + _esc(label) + dateStr + '</div>' +
        (reason ? '<div class="p65-issue-meta">' + reason + '</div>' : "") +
      '</div>' +
    '</div>';
  }

  function _deficitLabel(t) {
    var map = {
      "capacity_deficit": "کمبود ظرفیت",
      "manual_allocation_deficit": "مشکل تخصیص دستی",
      "round_overlap": "همپوشانی Round",
      "exam_date_limit": "تاریخ آزمون",
      "hard_constraint_block": "مسدود توسط Hard Constraint",
      "soft_constraint_violation": "نقض Soft Constraint",
      "sessionization_deficit": "کمبود زمان‌بندی"
    };
    return map[t] || t;
  }

  // ─── Daily schedule ───
  function _renderDailySchedule(proposal, snap) {
    var byDate = {};
    (proposal.proposedActivities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      if (!byDate[a.plannedDate]) byDate[a.plannedDate] = [];
      byDate[a.plannedDate].push(a);
    });
    var dates = Object.keys(byDate).sort();
    if (dates.length === 0) {
      return '<section class="p65-section">' +
        '<div class="p65-section-title">📅 برنامه روزانه</div>' +
        '<div class="p65-empty-inline">هیچ Activity پیشنهاد نشد.</div>' +
      '</section>';
    }

    var bookMap = {};
    (snap.books || []).forEach(function (b) { bookMap[b.id] = b; });

    var daysHTML = dates.map(function (date) {
      var acts = byDate[date];
      var totalMin = acts.reduce(function (s, a) { return s + (a.plannedDurationMinutes | 0); }, 0);
      var totalPages = acts.reduce(function (s, a) { return s + (a.plannedPages | 0); }, 0);

      var rows = acts.map(function (a) {
        var book = bookMap[a.bookId];
        var bookTitle = book ? book.title : a.bookId;
        var timeStr = a.plannedStartTime
          ? _fa(a.plannedStartTime) + " · " + _fa(a.plannedDurationMinutes) + "د"
          : _fa(a.plannedDurationMinutes) + " دقیقه";
        var rangeStr = "ص " + _fa(a.plannedPageStart) + "–" + _fa(a.plannedPageEnd) + " (" + _fa(a.plannedPages) + ")";
        return '<div class="p65-day-activity">' +
          '<span class="p65-day-act-book">' + _esc(bookTitle) + '</span>' +
          '<span class="p65-day-act-range">' + rangeStr + '</span>' +
          '<span class="p65-day-act-time">' + timeStr + '</span>' +
        '</div>';
      }).join("");

      return '<details class="p65-day" open>' +
        '<summary class="p65-day-head">' +
          '<span class="p65-day-date">' + _fa(date) + '</span>' +
          '<span class="p65-day-stats">' +
            _fa(totalPages) + ' ص · ' + _fa(totalMin) + ' د' +
          '</span>' +
        '</summary>' +
        '<div class="p65-day-body">' + rows + '</div>' +
      '</details>';
    }).join("");

    return '<section class="p65-section">' +
      '<div class="p65-section-title">📅 برنامه روزانه (' + _fa(dates.length) + ' روز)</div>' +
      '<div class="p65-days">' + daysHTML + '</div>' +
    '</section>';
  }

  // ─── Constraint effects ───
  function _renderConstraintEffects(effects) {
    var rows = effects.slice(0, 50).map(function (e) {
      var actionLabel = {
        "allow": "اجازه",
        "deny": "مسدود",
        "limit": "محدود",
        "allow_warn": "اجازه با هشدار"
      }[e.action] || e.action;
      var strength = e.strength === "hard" ? "قطعی" : e.strength === "soft" ? "نرم" : "ترجیح";
      var dateStr = e.date ? _fa(e.date) + " · " : "";
      return '<div class="p65-effect-row">' +
        '<span class="p65-effect-strength is-' + _esc(e.strength) + '">' + _esc(strength) + '</span>' +
        '<span class="p65-effect-action">' + _esc(actionLabel) + '</span>' +
        '<span class="p65-effect-reason">' + dateStr + _esc(e.reason || "") + '</span>' +
      '</div>';
    }).join("");

    return '<details class="p65-section p65-effects-section">' +
      '<summary class="p65-section-title p65-collapse-title">🔍 اثر محدودیت‌ها (' + _fa(effects.length) + ')</summary>' +
      '<div class="p65-effects-body">' + rows + '</div>' +
    '</details>';
  }

  // ─── Footer actions ───
  function _renderFooterActions(proposal) {
    var canApply = _canApply(proposal);
    var applyDisabled = !canApply.ok;
    // ─── [PATCH:ai-advisor-v8] Add AI review button ───
    var aiAvailable = !!(window.InternshipResidency && window.InternshipResidency.aiUI);

    var reasonHTML = "";
    if (!canApply.ok) {
      reasonHTML = '<div class="p65-apply-reason">' + _esc(canApply.reason) + '</div>';
    }

    return '<div class="p65-footer p65-footer-proposal">' +
      reasonHTML +
      '<div class="p65-footer-actions">' +
        '<button class="p65-btn p65-btn-primary" type="button" data-p65-apply' +
          (applyDisabled ? " disabled" : "") + '>✅ اعمال برنامه</button>' +
        (aiAvailable ? '<button class="p65-btn p65-btn-ghost" type="button" data-p65-ai-review>🤖 بررسی با AI</button>' : '') +
        '<button class="p65-btn p65-btn-ghost" type="button" data-p65-regenerate>🔄 ساخت مجدد</button>' +
        '<button class="p65-btn p65-btn-ghost" type="button" data-p65-close>انصراف</button>' +
      '</div>' +
    '</div>';
  }

  function _canApply(proposal) {
    if (!proposal) return { ok: false, reason: "پیشنهادی موجود نیست" };
    var errs = R.plannerProposal.validateProposal(proposal);
    if (errs.length > 0) return { ok: false, reason: "پیشنهاد نامعتبر است: " + errs[0] };

    // stale check
    var current = R.plannerApply.computeCurrentFingerprint(proposal);
    if (current && current !== proposal.fingerprint) {
      return { ok: false, reason: "پیشنهاد قدیمی شده است — دوباره Generate کن" };
    }

    // already applied?
    if (R.plannerApply.isAlreadyApplied(proposal.proposalId)) {
      return { ok: false, reason: "این پیشنهاد قبلاً اعمال شده" };
    }

    // blocked by hard constraint?
    if (proposal.feasibility && proposal.feasibility.status === "blocked_by_hard_constraint") {
      return { ok: false, reason: "برنامه توسط محدودیت قطعی مسدود شده — ابتدا محدودیت‌ها را بردار" };
    }

    return { ok: true };
  }

  // ─── Wire ───
  function _wire() {
    if (!_overlay) return;

    _overlay.querySelectorAll("[data-p65-close]").forEach(function (b) {
      b.addEventListener("click", UI.close);
    });

    _overlay.querySelectorAll("[data-p65-generate]").forEach(function (b) {
      b.addEventListener("click", _onGenerate);
    });

    _overlay.querySelectorAll("[data-p65-regenerate]").forEach(function (b) {
      b.addEventListener("click", _onGenerate);
    });

    _overlay.querySelectorAll("[data-p65-apply]").forEach(function (b) {
      b.addEventListener("click", _onApply);
    });

    // ─── [PATCH:ai-advisor-v8] Wire AI review button ───
    _overlay.querySelectorAll("[data-p65-ai-review]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!_proposal) return;
        var R = window.InternshipResidency;
        if (R && R.aiUI && R.aiUI.openAdvisor) {
          R.aiUI.openAdvisor({
            title: "بررسی Proposal با AI",
            subtitle: "نقد deterministic proposal توسط مشاور",
            actions: [
              { id: "review", label: "🔍 نقد Proposal",
                handler: function () { return R.aiAdvisors.reviewProposal(_proposal); } },
              { id: "diagnostics", label: "🩺 توضیح diagnostics",
                handler: function () {
                  var deficits = (_proposal.deficits || []);
                  return R.aiAdvisors.explainDiagnostics(deficits);
                } }
            ],
            autoRun: true
          });
        }
      });
    });

    _overlay.querySelectorAll("[data-p65-mode]").forEach(function (b) {
      b.addEventListener("click", _onModeChipClick);
    });

    // ESC outside click
    _overlay.addEventListener("click", function (e) {
      if (e.target === _overlay) UI.close();
    });
  }

  // ─── Mode chips ───
  function _onModeChipClick(e) {
    var btn = e.currentTarget;
    var roundId = btn.getAttribute("data-p65-round");
    var mode = btn.getAttribute("data-p65-mode");
    if (!roundId || !mode) return;
    try {
      R.store.updateRound(roundId, { allocationMode: mode });
    } catch (err) {
      console.warn("[planner.ui] updateRound failed:", err);
    }
    // update chip visual (in-place)
    var row = btn.closest(".p65-round-mode-row");
    if (row) {
      row.querySelectorAll(".p65-mode-chip").forEach(function (c) {
        c.classList.toggle("is-active", c === btn);
      });
    }
  }

  // ─── Generate ───
  function _onGenerate() {
    if (_generating) return;
    _generating = true;
    _proposal = null;
    _render();

    // Yield to DOM then run
    setTimeout(function () {
      var res;
      try {
        res = R.plannerOrchestrator.generateProposal(_planId, { scope: "plan" });
      } catch (err) {
        console.warn("[planner.ui] generate threw:", err);
        res = { ok: false, error: String(err && err.message || err) };
      }

      _generating = false;
      if (!res || !res.ok) {
        _proposal = null;
        _render();
        _showErrorBelow("ساخت پیشنهاد ناموفق بود: " + _esc(res && res.error || "خطای نامشخص"));
        return;
      }
      _proposal = res.proposal;
      _render();
    }, 30);
  }

  function _showErrorBelow(msg) {
    if (!_overlay) return;
    var box = document.createElement("div");
    box.className = "p65-inline-error";
    box.innerHTML = "❌ " + msg;
    var body = _overlay.querySelector(".p65-body");
    if (body) body.insertBefore(box, body.firstChild);
  }

  // ─── Apply ───
  function _onApply() {
    if (_applying) return;
    if (!_proposal) return;
    var canApply = _canApply(_proposal);
    if (!canApply.ok) {
      _showSimpleAlert(canApply.reason);
      return;
    }

    var f = _proposal.feasibility || {};
    var msg = "این برنامه به تقویم شما اضافه خواهد شد:\n\n" +
      "• " + _fa(_proposal.proposedActivities.length) + " فعالیت\n" +
      "• " + _fa(f.plannedPages) + " صفحه\n" +
      "• " + _fa(f.plannedMinutes) + " دقیقه\n\n" +
      "یک Version جدید ساخته می‌شود.\n" +
      "فعالیت‌های موجود شما دست‌نخورده می‌مانند.\n\n" +
      "مطمئنی؟";

    var confirmed = window.confirm(msg);
    if (!confirmed) return;

    _applying = true;
    _render();

    setTimeout(function () {
      var res;
      try {
        res = R.plannerOrchestrator.applyProposal(_proposal, {});
      } catch (err) {
        console.warn("[planner.ui] apply threw:", err);
        res = { success: false, reason: String(err && err.message || err), errors: [] };
      }

      _applying = false;
      _lastApplyResult = res;

      if (res && res.success) {
        _renderApplySuccess(res);
      } else {
        _render();
        _showErrorBelow("اعمال برنامه ناموفق بود: " + _esc((res && (res.reason || (res.errors && res.errors[0]))) || "خطای نامشخص"));
      }
    }, 30);
  }

  // ─── Apply Success ───
  function _renderApplySuccess(res) {
    var html = "";
    html += _renderHeader({ title: "برنامه با موفقیت اعمال شد" });
    html += '<div class="p65-body">' +
      '<div class="p65-success">' +
        '<div class="p65-success-icon">✅</div>' +
        '<div class="p65-success-title">برنامه با موفقیت اعمال شد</div>' +
        '<div class="p65-success-desc">فعالیت‌های جدید به تقویم شما اضافه شدند.</div>' +
      '</div>' +
      '<div class="p65-stats-grid p65-stats-4" style="margin-top:20px">' +
        _statCard("📋", "Activity ساخته‌شده", _fa(res.statistics.activitiesCreated)) +
        _statCard("📝", "Task ساخته‌شده", _fa(res.statistics.tasksCreated)) +
        _statCard("📄", "صفحه اعمال‌شده", _fa(res.statistics.pagesApplied)) +
        _statCard("⏱️", "دقیقه اعمال‌شده", _fa(res.statistics.minutesApplied)) +
      '</div>' +
      (res.planVersionId
        ? '<div class="p65-success-info">📌 PlanVersion: <code>' + _esc(res.planVersionId) + '</code></div>'
        : '') +
      (res.warnings && res.warnings.length > 0
        ? '<div class="p65-success-warnings"><strong>هشدارها:</strong> ' + _fa(res.warnings.length) + ' مورد</div>'
        : '') +
      '<div class="p65-footer">' +
        '<button class="p65-btn p65-btn-primary" type="button" data-p65-done>بستن و بازگشت</button>' +
      '</div>' +
    '</div>';

    _overlay.innerHTML = html;
    _overlay.querySelectorAll("[data-p65-done]").forEach(function (b) {
      b.addEventListener("click", function () {
        UI.close();
        if (window.__os && window.__os.render) {
          setTimeout(function () { window.__os.render(); }, 50);
        }
      });
    });
    _overlay.querySelectorAll("[data-p65-close]").forEach(function (b) {
      b.addEventListener("click", UI.close);
    });
  }

  console.log("[planner.ui.v6.5] loaded");
})();