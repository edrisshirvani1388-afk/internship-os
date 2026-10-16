(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  var _lastProposal = null;

  // ─── Proposal Tab ───
  WS._renderProposalTab = function () {
    if (!_lastProposal) {
      return '<div class="pw14-empty">هنوز پیشنهادی تولید نشده.<br>' +
        '<button class="pw14-hbtn is-primary" style="margin-top:12px" data-pw14-proposal-open-planner>🚀 Generate</button>' +
        '<button class="pw14-hbtn" style="margin-top:12px;margin-inline-start:8px" data-pw14-proposal-open-replan>♻️ Replan</button>' +
      '</div>';
    }
    return _renderProposal(_lastProposal);
  };

  WS.setCurrentProposal = function (p) { _lastProposal = p; WS.setView && WS.setView("day"); WS.rerender && WS.rerender(); };
  WS.getCurrentProposal = function () { return _lastProposal; };
  WS.clearCurrentProposal = function () { _lastProposal = null; if (WS.rerender) WS.rerender(); };

  function _renderProposal(prop) {
    var kind = prop.type || "planner";
    var proposal = prop.data || prop;
    var diff = prop.diff || null;
    var stale = prop.stale || false;

    var html = '';

    if (stale) {
      html += '<div class="pw14-stale">⚠️ این Proposal منقضی شده. لطفاً دوباره Generate کن.</div>';
    }

    // Header
    html += '<div class="pw14-prop-head">' +
      '<div class="pw14-prop-title">' + (kind === "replan" ? "♻️ پیشنهاد Replan" : "🚀 پیشنهاد Planner") + '</div>' +
      '<div class="pw14-prop-actions">' +
        '<button class="pw14-hbtn is-primary" data-pw14-prop-apply' + (stale ? " disabled" : "") + '>✅ اعمال</button>' +
        '<button class="pw14-hbtn" data-pw14-prop-discard>🗑️ رد کردن</button>' +
      '</div>' +
    '</div>';

    // Stats Before/After
    if (diff && diff.stats) {
      html += _renderBeforeAfter(diff.stats);
    }

    // Change Highlighting
    if (diff) {
      html += _renderChangeHighlight(diff);
    }

    // Daily diff
    if (diff && diff.daily) {
      html += _renderDailyDiff(diff.daily);
    }

    // Cancelled preview
    if (diff && diff.cancelledList && diff.cancelledList.length > 0) {
      html += _renderCancelledPreview(diff.cancelledList);
    }

    // Replan impact
    if (proposal.impactAnalysis) {
      html += _renderImpact(proposal.impactAnalysis);
    }

    // PlanVersion history
    html += _renderPlanVersionHistory();

    return html;
  }

  function _renderBeforeAfter(stats) {
    function _row(label, before, after, unit) {
      var delta = after - before;
      var cls = delta > 0 ? "is-up" : delta < 0 ? "is-down" : "";
      var sign = delta > 0 ? "+" : "";
      return '<div class="pw14-ba-row">' +
        '<div>' + _esc(label) + '</div>' +
        '<div>' + _fa(before) + (unit ? " " + unit : "") + '</div>' +
        '<div>' + _fa(after) + (unit ? " " + unit : "") + '</div>' +
        '<div class="' + cls + '">' + sign + _fa(delta) + (unit ? " " + unit : "") + '</div>' +
      '</div>';
    }
    return '<div class="pw14-prop-section">' +
      '<div class="pw14-prop-sec-title">🔄 قبل / بعد</div>' +
      '<div class="pw14-ba-table">' +
        '<div class="pw14-ba-row is-head"><div>شاخص</div><div>قبل</div><div>بعد</div><div>Δ</div></div>' +
        _row("دقیقه کل", stats.before.totalMinutes, stats.after.totalMinutes, "د") +
        _row("مطالعه", stats.before.studyMinutes, stats.after.studyMinutes, "د") +
        _row("مرور", stats.before.reviewMinutes, stats.after.reviewMinutes, "د") +
        _row("آزمون", stats.before.assessmentMinutes, stats.after.assessmentMinutes, "د") +
        _row("صفحه", stats.before.totalPages, stats.after.totalPages) +
        _row("فعالیت", stats.before.count, stats.after.count) +
      '</div>' +
    '</div>';
  }

  function _renderChangeHighlight(diff) {
    var html = '<div class="pw14-prop-section"><div class="pw14-prop-sec-title">تغییرات</div>';
    html += '<div class="pw14-changes-strip">' +
      '<span class="pw14-change-chip is-added">🟢 ' + _fa(diff.added.length) + ' اضافه</span>' +
      '<span class="pw14-change-chip is-modified">🟡 ' + _fa(diff.modified.length) + ' تغییر</span>' +
      '<span class="pw14-change-chip is-cancelled">🔴 ' + _fa(diff.cancelled.length) + ' لغو</span>' +
      '<span class="pw14-change-chip is-preserved">🔵 ' + _fa(diff.preserved.length) + ' حفظ</span>' +
    '</div>';
    if (diff.modified.length > 0) {
      html += '<div class="pw14-changes-list">' + diff.modified.slice(0, 20).map(function (m) {
        var changes = m.changes.map(function (c) {
          return '<span class="pw14-change-item">' + _esc(c.field) + ': ' + _esc(c.before) + ' → ' + _esc(c.after) + '</span>';
        }).join("");
        return '<div class="pw14-change-row"><div class="pw14-change-title">' + _esc(m.after.title || m.before.title || "—") + '</div>' +
          '<div class="pw14-change-detail">' + changes + '</div></div>';
      }).join("") + '</div>';
    }
    html += '</div>';
    return html;
  }

  function _renderDailyDiff(daily) {
    if (!daily || daily.length === 0) return "";
    var rows = daily.filter(function (d) {
      return d.delta.study !== 0 || d.delta.review !== 0 || d.delta.assessment !== 0 || d.delta.count !== 0;
    });
    if (rows.length === 0) return "";
    return '<div class="pw14-prop-section"><div class="pw14-prop-sec-title">📅 تفاوت روزانه</div>' +
      '<div class="pw14-daily-diff">' + rows.slice(0, 20).map(function (d) {
        function _delta(label, v) {
          if (v === 0) return "";
          var sign = v > 0 ? "+" : "";
          var cls = v > 0 ? "is-up" : "is-down";
          return '<span class="' + cls + '">' + _esc(label) + ' ' + sign + _fa(v) + 'د</span>';
        }
        return '<div class="pw14-daily-row">' +
          '<div class="pw14-daily-date">' + _fa(d.date) + '</div>' +
          '<div class="pw14-daily-deltas">' +
            _delta("📖", d.delta.study) +
            _delta("🔁", d.delta.review) +
            _delta("📝", d.delta.assessment) +
          '</div>' +
        '</div>';
      }).join("") + '</div></div>';
  }

  function _renderCancelledPreview(list) {
    if (!list || list.length === 0) return "";
    var html = '<div class="pw14-prop-section"><div class="pw14-prop-sec-title">🔴 فعالیت‌های لغو‌شونده (' + _fa(list.length) + ')</div>';
    html += '<div class="pw14-cancelled-list">';
    html += list.slice(0, 30).map(function (c) {
      return '<div class="pw14-cancelled-row">' +
        '<div class="pw14-cancelled-title">' + _esc(c.title || "—") + '</div>' +
        '<div class="pw14-cancelled-meta">' + _fa(c.plannedDate || "—") + ' · ' + _fa(c.plannedDurationMinutes || 0) + 'د' +
          (c.plannedPages ? ' · ' + _fa(c.plannedPages) + 'ص' : "") +
        '</div>' +
      '</div>';
    }).join("");
    html += '</div></div>';
    return html;
  }

  function _renderImpact(impact) {
    if (!impact) return "";
    return '<div class="pw14-prop-section">' +
      '<div class="pw14-prop-sec-title">🎯 تحلیل تأثیر Replan</div>' +
      '<div class="pw14-impact-grid">' +
        '<div class="pw14-impact-tile"><span>🔄</span><div><div>تحت‌تأثیر</div><div class="pw14-impact-num">' + _fa((impact.affectedActivityIds || []).length) + '</div></div></div>' +
        '<div class="pw14-impact-tile"><span>🔒</span><div><div>محافظت</div><div class="pw14-impact-num">' + _fa((impact.protectedActivityIds || []).length) + '</div></div></div>' +
        '<div class="pw14-impact-tile"><span>🆓</span><div><div>قابل لغو</div><div class="pw14-impact-num">' + _fa((impact.cancelableActivityIds || []).length) + '</div></div></div>' +
        '<div class="pw14-impact-tile"><span>📚</span><div><div>کتاب</div><div class="pw14-impact-num">' + _fa((impact.affectedBookIds || []).length) + '</div></div></div>' +
        '<div class="pw14-impact-tile"><span>🎯</span><div><div>Round</div><div class="pw14-impact-num">' + _fa((impact.affectedRoundIds || []).length) + '</div></div></div>' +
      '</div>' +
    '</div>';
  }

  function _renderPlanVersionHistory() {
    if (!R.store || !R.store.getPlanVersions) return "";
    var versions = R.store.getPlanVersions() || [];
    if (versions.length === 0) return "";
    var latest = versions.slice(-5).reverse();
    return '<div class="pw14-prop-section"><div class="pw14-prop-sec-title">📜 تاریخچه PlanVersion</div>' +
      '<div class="pw14-versions-list">' + latest.map(function (v) {
        return '<div class="pw14-version-row">' +
          '<span class="pw14-version-num">v' + _fa(v.version || 1) + '</span>' +
          '<span class="pw14-version-trigger">' + _esc(v.triggerType || "—") + '</span>' +
          '<span class="pw14-version-reason">' + _esc((v.reason || "").slice(0, 60)) + '</span>' +
          '<span class="pw14-version-status is-' + _esc(v.status || "active") + '">' + _esc(v.status || "active") + '</span>' +
        '</div>';
      }).join("") + '</div></div>';
  }

  // ─── Wire proposal buttons ───
  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }

    var o = document.querySelector(".pw14-overlay");
    if (!o) return;

    o.querySelectorAll("[data-pw14-proposal-open-planner]").forEach(function (b) {
      b.addEventListener("click", function () { R.plannerUI && R.plannerUI.open(WS.getSelectedPlanId()); });
    });
    o.querySelectorAll("[data-pw14-proposal-open-replan]").forEach(function (b) {
      b.addEventListener("click", function () { R.plannerReplanUI && R.plannerReplanUI.open(WS.getSelectedPlanId()); });
    });

    o.querySelectorAll("[data-pw14-prop-apply]").forEach(function (b) {
      b.addEventListener("click", function () {
        var prop = WS.getCurrentProposal();
        if (!prop) return;
        if (!window.confirm("این پیشنهاد اعمال شود؟")) return;
        var res;
        if (prop.type === "replan" && R.plannerReplanApply) {
          res = R.plannerReplanApply.applyReplanProposal(prop.data, {});
        } else if (R.plannerApply) {
          res = R.plannerApply.applyPlannerProposal(prop.data, {});
        }
        if (res && (res.success || res.ok)) {
          WS._toast("✅ اعمال شد");
          WS.clearCurrentProposal();
        } else {
          WS._toast("خطا: " + ((res && res.reason) || "?"));
        }
      });
    });
    o.querySelectorAll("[data-pw14-prop-discard]").forEach(function (b) {
      b.addEventListener("click", function () { WS.clearCurrentProposal(); });
    });
  };

  // ─── Context Inspector ───
  WS._buildContextSummary = function (mode) {
    var planId = WS.getSelectedPlanId();
    var s = _state();
    if (!s || !s.residency) return { mode: mode, empty: true };
    var out = { mode: mode, planId: planId, generatedAt: Date.now() };
    if (mode === "planner") {
      var snap = R.plannerSnapshot ? R.plannerSnapshot.build(planId, "plan") : null;
      if (snap) {
        out.activities = (snap.activities || []).length;
        out.rounds = (snap.rounds || []).length;
        out.books = (snap.books || []).length;
        out.constraints = (snap.constraints || []).length;
        out.locks = (snap.locks || []).length;
        var totalCap = 0;
        (snap.calendar || []).forEach(function (c) { totalCap += (c.finalCapacityMinutes | 0); });
        out.capacityMinutes = totalCap;
      }
    } else if (mode === "recovery") {
      var snap2 = R.plannerSnapshot ? R.plannerSnapshot.build(planId, "plan") : null;
      if (snap2 && R.plannerExecution) {
        var exec = R.plannerExecution.analyzeExecution(snap2);
        out.missed = exec.missed.length;
        out.partial = exec.partial.length;
        out.totalMissedPages = exec.totalMissedPages;
      }
    } else if (mode === "reviews") {
      if (R.reviewQueue) {
        var rq = R.reviewQueue.getSummary();
        out.dueToday = rq.dueToday;
        out.overdue = rq.overdue;
        out.upcoming7 = rq.upcoming7;
      }
    } else if (mode === "analytics") {
      var ov = R.analytics ? R.analytics.getOverview({ range: "last30Days" }) : null;
      if (ov) {
        out.totalActivities = (ov.execution && ov.execution.total) || 0;
        out.completionRate = (ov.execution && ov.execution.completionRate) || 0;
      }
    } else if (mode === "proposal") {
      var prop = WS.getCurrentProposal();
      if (prop) {
        out.proposalKind = prop.type || "planner";
        out.proposedActivities = (prop.data && prop.data.proposedActivities && prop.data.proposedActivities.length) || 0;
      }
    }
    return out;
  };

  // ─── Reviews Tab (passthrough to reviewUI queue) ───
  WS._renderReviewsTab = function () {
    if (!R.reviewQueue) return '<div class="pw14-empty">Review Scheduler در دسترس نیست.</div>';
    var sum = R.reviewQueue.getSummary();
    var queue = sum.due || [];
    var html = '';
    html += '<div class="pw14-review-summary">';
    html += '<div class="pw14-impact-tile"><span>📅</span><div><div>امروز</div><div class="pw14-impact-num">' + sum.dueToday + '</div></div></div>';
    html += '<div class="pw14-impact-tile"><span>⏰</span><div><div>Overdue</div><div class="pw14-impact-num">' + sum.overdue + '</div></div></div>';
    html += '<div class="pw14-impact-tile"><span>📆</span><div><div>۷ روز</div><div class="pw14-impact-num">' + sum.upcoming7 + '</div></div></div>';
    html += '<div class="pw14-impact-tile"><span>🗓️</span><div><div>۳۰ روز</div><div class="pw14-impact-num">' + sum.upcoming30 + '</div></div></div>';
    html += '</div>';
    html += '<div class="pw14-ai-actions" style="margin-bottom:14px">';
    html += '<button class="pw14-hbtn is-primary" data-pw14-schedule-reviews>📋 برنامه‌ریزی مرورها</button>';
    html += '<button class="pw14-hbtn" data-pw14-review-settings>⚙️ تنظیمات</button>';
    html += '<button class="pw14-hbtn" data-pw14-review-session' + (queue.length === 0 ? ' disabled' : '') + '>▶️ شروع جلسه</button>';
    html += '</div>';
    if (queue.length === 0) {
      html += '<div class="pw14-empty">امروز چیزی برای مرور نیست.</div>';
    } else {
      html += '<div class="pw14-changes-list">' + queue.slice(0, 50).map(function (item) {
        var cls = item.overdueDays > 0 ? 'is-cancelled' : 'is-preserved';
        return '<div class="pw14-change-row">' +
          '<div class="pw14-change-title">' + _esc(item.targetId || '—') + '</div>' +
          '<div class="pw14-change-detail">' + _esc(item.priorityReason || '') + ' · ' + _fa(item.estimatedMinutes) + ' د</div>' +
        '</div>';
      }).join("") + '</div>';
    }
    return html;
  };

  // ─── AI Tab extension ───
  var _origAIRender = WS._renderAITab;
  WS._renderAITab = function () {
    var html = '';
    html += '<div class="pw14-ai-panel">';
    html += '<div class="pw14-ai-title">🤖 AI Advisor</div>';
    html += '<div class="pw14-ai-hint">داده‌ها context-aware و redacted هستند. AI هرگز state را تغییر نمی‌دهد.</div>';

    html += '<div class="pw14-ai-actions">' +
      '<button class="pw14-hbtn is-primary" data-pw14-ai-plan>🔍 تحلیل برنامه</button>' +
      '<button class="pw14-hbtn" data-pw14-ai-recovery>♻️ تحلیل Recovery</button>' +
      '<button class="pw14-hbtn" data-pw14-ai-review>🔁 تحلیل مرورها</button>' +
      '<button class="pw14-hbtn" data-pw14-ai-analytics>📈 تحلیل عملکرد</button>' +
    '</div>';

    html += '<div class="pw14-ctx-panel">' +
      '<div class="pw14-ctx-title">👁️ Context Inspector</div>' +
      '<div class="pw14-ctx-tabs">' +
        ['planner','recovery','reviews','analytics','proposal'].map(function (m) {
          return '<button class="pw14-ctx-tab" data-pw14-ctx-mode="' + m + '">' + _esc(m) + '</button>';
        }).join("") +
      '</div>' +
      '<div id="pw14-ctx-out" class="pw14-ctx-out"></div>' +
    '</div>';

    html += '<div id="pw14-ai-result" class="pw14-ai-result"></div>';
    html += '</div>';
    return html;
  };

  var _origWire2 = WS._postWire;
  WS._postWire = function () {
    if (typeof _origWire2 === "function") { try { _origWire2(); } catch (e) {} }

    var o = document.querySelector(".pw14-overlay");
    if (!o) return;

    o.querySelectorAll("[data-pw14-ai-plan]").forEach(function (b) {
      b.addEventListener("click", function () {
        var snap = R.plannerSnapshot && R.plannerSnapshot.build(WS.getSelectedPlanId(), "plan");
        if (!snap || !R.aiAdvisors) return;
        var alloc = R.plannerResolution ? R.plannerResolution.runConstrainedAllocation(snap, {}) : null;
        _aiRun("تحلیل برنامه", function () { return R.aiAdvisors.reviewPlanner(snap, alloc); });
      });
    });
    o.querySelectorAll("[data-pw14-ai-recovery]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!R.plannerExecution || !R.aiAdvisors) return;
        var snap = R.plannerSnapshot.build(WS.getSelectedPlanId(), "plan");
        var exec = R.plannerExecution.analyzeExecution(snap);
        var impact = R.plannerImpact ? R.plannerImpact.analyzeImpact(exec, snap, "plan") : null;
        var comps = R.plannerReplan ? R.plannerReplan.simulateStrategies(WS.getSelectedPlanId(), ["next_day","end_of_week","end_of_round"], {}) : [];
        _aiRun("تحلیل Recovery", function () { return R.aiAdvisors.reviewRecovery(exec, impact, comps); });
      });
    });
    o.querySelectorAll("[data-pw14-ai-review]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!R.aiAdvisors || !R.reviewAIContext) return;
        var ctx = R.reviewAIContext.build();
        _aiRun("تحلیل مرورها", function () { return R.aiAdvisors.analyzeReviewContext(ctx); });
      });
    });
    o.querySelectorAll("[data-pw14-ai-analytics]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!R.aiAdvisors || !R.analytics) return;
        var ctx = R.analytics.buildAIContext({ range: "last30Days" });
        _aiRun("تحلیل عملکرد", function () {
          if (R.aiAdvisors.analyzePerformance) return R.aiAdvisors.analyzePerformance(ctx);
          return R.aiAdvisors.reviewPlanner(null, null);
        });
      });
    });

    // Reviews tab actions
    o.querySelectorAll("[data-pw14-schedule-reviews]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (!R.reviewProposal || !R.reviewApply) return;
        var res = R.reviewProposal.generate({ horizonDays: 7 });
        if (!res.ok || res.proposal.proposedActivities.length === 0) { WS._toast("چیزی برای مرور نیست"); return; }
        if (!window.confirm(res.proposal.proposedActivities.length + " مرور اضافه شود؟")) return;
        var apply = R.reviewApply.apply(res.proposal);
        WS._toast(apply.success ? "✅ " + apply.statistics.activitiesCreated + " مرور اضافه شد" : "خطا");
        if (apply.success) WS.rerender();
      });
    });
    o.querySelectorAll("[data-pw14-review-settings]").forEach(function (b) {
      b.addEventListener("click", function () { R.reviewSettingsUI && R.reviewSettingsUI.open(); });
    });
    o.querySelectorAll("[data-pw14-review-session]").forEach(function (b) {
      b.addEventListener("click", function () { R.reviewUI && R.reviewUI.open(); });
    });

    o.querySelectorAll("[data-pw14-ctx-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-pw14-ctx-mode");
        var out = o.querySelector("#pw14-ctx-out");
        if (!out) return;
        var summary = WS._buildContextSummary(mode);
        out.innerHTML = '<pre class="pw14-ctx-pre">' + _esc(JSON.stringify(summary, null, 2)) + '</pre>';
        b.parentNode.querySelectorAll("[data-pw14-ctx-mode]").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
      });
    });
  };

  function _aiRun(title, fn) {
    var el = document.querySelector("#pw14-ai-result");
    if (!el) return;
    el.innerHTML = '<div class="pw14-ai-loading"><div class="pw14-spinner"></div><div>' + _esc(title) + ' ...</div></div>';
    Promise.resolve().then(fn).then(function (out) {
      el.innerHTML = _renderAIResult(out);
    }).catch(function (err) {
      el.innerHTML = '<div class="pw14-ai-error">❌ ' + _esc((err && (err.hint || err.message)) || String(err)) + '</div>';
    });
  }

  function _renderAIResult(out) {
    if (!out) return '<div class="pw14-empty">پاسخ خالی</div>';
    var html = '';
    if (out.summary) html += '<div class="pw14-ai-summary">' + _esc(out.summary) + '</div>';
    if (out.findings && out.findings.length > 0) {
      html += '<div class="pw14-ai-group"><strong>یافته‌ها</strong><ul>' +
        out.findings.slice(0, 15).map(function (f) { return '<li>' + _esc(f) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.risks && out.risks.length > 0) {
      html += '<div class="pw14-ai-group is-risk"><strong>ریسک‌ها</strong><ul>' +
        out.risks.slice(0, 10).map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.recommendations && out.recommendations.length > 0) {
      html += '<div class="pw14-ai-group"><strong>پیشنهادها</strong>' +
        out.recommendations.slice(0, 8).map(function (r) {
          return '<div class="pw14-ai-rec is-' + _esc(r.type) + '">' +
            '<div class="pw14-ai-rec-title">' + _esc(r.title) +
              (r.confidence ? ' <span class="pw14-ai-conf">' + Math.round(r.confidence * 100) + '%</span>' : '') +
            '</div>' +
            '<div class="pw14-ai-rec-desc">' + _esc(r.explanation) + '</div>' +
            (r.evidence && r.evidence.length > 0 ? '<div class="pw14-ai-rec-ev">' + r.evidence.map(_esc).join(" · ") + '</div>' : '') +
          '</div>';
        }).join("") + '</div>';
    }
    return html || '<div class="pw14-empty">پاسخی نبود</div>';
  }

  console.log("[workspace.v14.proposal] loaded");
})();