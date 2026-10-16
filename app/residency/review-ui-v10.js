(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.ui.v10] R missing"); return; }
  var UI = R.reviewUI = R.reviewUI || {};
  var LIB = window.InternshipLib;
  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  var _overlay = null;
  var _sessionQueue = null;
  var _sessionIndex = 0;

  UI.open = function () {
    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "rv10-overlay";
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
    var summary = R.reviewQueue.getSummary();
    var settings = R.store.getReviewSettings();
    var html = "";
    html += '<header class="rv10-header">' +
      '<div class="rv10-header-left"><span class="rv10-icon">🔁</span><div>' +
        '<div class="rv10-title">مرور (Spaced Repetition)</div>' +
        '<div class="rv10-sub">' + _fa(summary.dueToday) + ' در موعد · ' + _fa(summary.overdue) + ' overdue</div>' +
      '</div></div>' +
      '<button class="rv10-close" type="button" data-rv10-close>✕</button></header>';

    html += '<div class="rv10-body">';
    html += _renderStats(summary);
    html += _renderActions(summary, settings);
    html += _renderQueue(summary);
    html += _renderUpcoming(summary);
    html += '</div>';
    _overlay.innerHTML = html;
    _wire();
  }

  function _renderStats(s) {
    return '<section class="rv10-section"><div class="rv10-grid">' +
      _stat("📅", "امروز", s.dueToday) +
      _stat("⏰", "Overdue", s.overdue) +
      _stat("📆", "۷ روز آینده", s.upcoming7) +
      _stat("🗓️", "۳۰ روز آینده", s.upcoming30) +
      '</div></section>';
  }

  function _stat(icon, label, val) {
    return '<div class="rv10-stat"><span class="rv10-stat-icon">' + icon + '</span>' +
      '<div><div class="rv10-stat-label">' + _esc(label) + '</div>' +
      '<div class="rv10-stat-value">' + _fa(val) + '</div></div></div>';
  }

  function _renderActions(s, settings) {
    if (!settings.enabled) {
      return '<section class="rv10-section"><div class="rv10-disabled">مرور غیرفعال است.</div></section>';
    }
    return '<section class="rv10-section"><div class="rv10-actions">' +
      '<button class="rv10-btn rv10-btn-primary" type="button" data-rv10-generate>📋 تولید پیشنهاد مرور</button>' +
      (s.dueToday > 0 ? '<button class="rv10-btn" type="button" data-rv10-start>▶️ شروع جلسه</button>' : '') +
      '<button class="rv10-btn" type="button" data-rv11-settings>⚙️ تنظیمات</button>' +
      '<button class="rv10-btn" type="button" data-rv11-ai>🤖 تحلیل AI</button>' +
      '</div></section>';
  }

  function _renderQueue(s) {
    if (s.due.length === 0) {
      return '<section class="rv10-section"><div class="rv10-section-title">📋 صف امروز</div>' +
        '<div class="rv10-empty">✅ امروز چیزی برای مرور نیست.</div></section>';
    }
    var rows = s.due.slice(0, 30).map(function (item) {
      return '<div class="rv10-item">' +
        '<div class="rv10-item-main">' +
          '<div class="rv10-item-title">' + _esc(_title(item)) + '</div>' +
          '<div class="rv10-item-meta">' + _esc(item.priority.reason) + ' · ' + _fa(item.estimatedMinutes) + ' دقیقه</div>' +
        '</div>' +
        '<div class="rv10-item-due ' + (item.overdueDays > 0 ? 'is-overdue' : '') + '">' + _fa(item.dueDate) + '</div>' +
      '</div>';
    }).join("");
    return '<section class="rv10-section"><div class="rv10-section-title">📋 صف امروز (' + _fa(s.due.length) + ')</div>' +
      '<div class="rv10-list">' + rows + '</div></section>';
  }

  function _renderUpcoming(s) {
    if (s.upcoming7Items.length === 0) return "";
    var rows = s.upcoming7Items.slice(0, 20).map(function (item) {
      return '<div class="rv10-item rv10-item-upcoming">' +
        '<div class="rv10-item-main">' +
          '<div class="rv10-item-title">' + _esc(_title(item)) + '</div>' +
          '<div class="rv10-item-meta">' + _fa(item.estimatedMinutes) + ' دقیقه</div>' +
        '</div>' +
        '<div class="rv10-item-due">' + _fa(item.dueDate) + '</div>' +
      '</div>';
    }).join("");
    return '<section class="rv10-section"><div class="rv10-section-title">📆 پیش‌رو (۷ روز)</div>' +
      '<div class="rv10-list">' + rows + '</div></section>';
  }

  function _title(item) {
    var s = _state();
    if (item.targetType === "book" && item.bookId && s && s.residency) {
      var b = (s.residency.books || []).find(function (x) { return x && x.id === item.bookId; });
      if (b) return b.title;
    }
    if (item.targetType === "page_range") return "صفحات " + item.pageStart + "-" + item.pageEnd;
    if (item.targetType === "subject") return "موضوع";
    if (item.targetType === "activity") return "فعالیت";
    if (item.targetType === "task") return "تسک";
    return item.targetId;
  }

  function _wire() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-rv10-close]").forEach(function (b) {
      b.addEventListener("click", UI.close);
    });
    _overlay.addEventListener("click", function (e) { if (e.target === _overlay) UI.close(); });
    _overlay.querySelectorAll("[data-rv10-generate]").forEach(function (b) {
      b.addEventListener("click", _onGenerate);
    });
    _overlay.querySelectorAll("[data-rv10-start]").forEach(function (b) {
      b.addEventListener("click", _onStartSession);
    });
    _overlay.querySelectorAll("[data-rv11-settings]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (R.reviewSettingsUI) R.reviewSettingsUI.open();
      });
    });
    _overlay.querySelectorAll("[data-rv11-ai]").forEach(function (b) {
      b.addEventListener("click", _onAIAnalyze);
    });
  }

  function _onAIAnalyze() {
    if (!R.aiAdvisors || !R.aiAdvisors.analyzeReviewContext) {
      alert("AI Advisor در دسترس نیست");
      return;
    }
    if (!R.reviewAIContext) {
      alert("Context Builder در دسترس نیست");
      return;
    }
    var ctx = R.reviewAIContext.build();
    if (!ctx) { alert("Context خالی"); return; }

    if (!_overlay) return;
    var body = _overlay.querySelector(".rv10-body");
    if (!body) return;
    var loadingId = "rv11-ai-result";
    var existing = body.querySelector("#" + loadingId);
    if (existing) existing.remove();
    var box = document.createElement("section");
    box.id = loadingId;
    box.className = "rv10-section";
    box.innerHTML = '<div class="rv10-section-title">🤖 تحلیل AI</div><div class="rv11-ai-loading">در حال تحلیل...</div>';
    body.insertBefore(box, body.firstChild);

    R.aiAdvisors.analyzeReviewContext(ctx)
      .then(function (out) {
        box.innerHTML = _renderAIResult(out);
      })
      .catch(function (err) {
        var msg = (err && err.hint) || (err && err.message) || String(err);
        box.innerHTML = '<div class="rv10-section-title">🤖 تحلیل AI</div>' +
          '<div class="rv11-ai-error">❌ ' + _esc(msg) + '</div>';
      });
  }

  function _renderAIResult(out) {
    if (!out || typeof out !== "object") return '<div class="rv11-ai-error">پاسخ خالی</div>';
    var html = '<div class="rv10-section-title">🤖 تحلیل AI</div>';
    if (out.summary) html += '<div class="rv11-ai-summary">' + _esc(out.summary) + '</div>';
    if (out.findings && out.findings.length > 0) {
      html += '<div class="rv11-ai-group"><strong>یافته‌ها</strong><ul>' +
        out.findings.map(function (f) { return '<li>' + _esc(f) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.risks && out.risks.length > 0) {
      html += '<div class="rv11-ai-group is-risk"><strong>ریسک‌ها</strong><ul>' +
        out.risks.map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join("") + '</ul></div>';
    }
    if (out.recommendations && out.recommendations.length > 0) {
      html += '<div class="rv11-ai-group"><strong>پیشنهادها</strong>' +
        out.recommendations.map(function (r) {
          return '<div class="rv11-ai-rec is-' + _esc(r.type) + '">' +
            '<div class="rv11-ai-rec-title">' + _esc(r.title) +
              (r.confidence ? ' <span class="rv11-ai-conf">' + Math.round(r.confidence * 100) + '%</span>' : '') +
            '</div>' +
            '<div class="rv11-ai-rec-desc">' + _esc(r.explanation) + '</div>' +
            (r.evidence && r.evidence.length > 0
              ? '<div class="rv11-ai-rec-ev">' + r.evidence.map(_esc).join(" · ") + '</div>' : '') +
          '</div>';
        }).join("") + '</div>';
    }
    return html;
  }

  function _onGenerate() {
    var res = R.reviewProposal.generate({ horizonDays: 7 });
    if (!res.ok) { alert("خطا: " + res.error); return; }
    var p = res.proposal;
    if (p.proposedActivities.length === 0) { alert("چیزی برای برنامه‌ریزی نیست."); return; }
    var msg = "این پیشنهاد " + _fa(p.proposedActivities.length) + " مرور (" +
      _fa(p.statistics.totalMinutes) + " دقیقه) می‌سازد.\n\n" +
      (p.statistics.deferredCount > 0 ? _fa(p.statistics.deferredCount) + " مورد deferred می‌شود.\n\n" : "") +
      "تأیید می‌کنی؟";
    if (!confirm(msg)) return;
    var applyRes = R.reviewApply.apply(p, {});
    if (applyRes.success) {
      alert("✅ " + _fa(applyRes.statistics.activitiesCreated) + " مرور اضافه شد.");
      _render();
      if (window.__os && window.__os.render) setTimeout(function () { window.__os.render(); }, 100);
    } else {
      alert("خطا: " + (applyRes.reason || "unknown"));
    }
  }

  function _onStartSession() {
    var s = _state();
    var today = LIB.date ? LIB.date.todayJalaliString() : "";
    var plannedToday = (s.residency.activities || []).filter(function (a) {
      return a && a.kind === "review" && a.status === "planned" && a.plannedDate === today;
    });
    if (plannedToday.length === 0) {
      var proposal = R.reviewProposal.generate({ horizonDays: 1 });
      if (proposal.ok && proposal.proposal.proposedActivities.length > 0) {
        R.reviewApply.apply(proposal.proposal, {});
        plannedToday = (window.__os.getState().residency.activities || []).filter(function (a) {
          return a && a.kind === "review" && a.status === "planned" && a.plannedDate === today;
        });
      }
    }
    if (plannedToday.length === 0) { alert("نتوانستم فعالیت مرور بسازم."); return; }
    _sessionQueue = plannedToday;
    _sessionIndex = 0;
    _renderSession();
  }

  function _renderSession() {
    if (!_overlay || !_sessionQueue) return;
    if (_sessionIndex >= _sessionQueue.length) {
      _overlay.innerHTML = '<header class="rv10-header"><div class="rv10-header-left"><span class="rv10-icon">✅</span><div><div class="rv10-title">جلسه تمام شد</div></div></div>' +
        '<button class="rv10-close" type="button" data-rv10-close>✕</button></header>' +
        '<div class="rv10-body"><div class="rv10-done">🎉 همه مرورها انجام شد.</div></div>';
      _wire();
      _sessionQueue = null;
      return;
    }
    var act = _sessionQueue[_sessionIndex];
    var title = (act.reviewTarget && act.reviewTarget.bookId) ? _bookTitle(act.reviewTarget.bookId) : "مرور";
    var html = '<header class="rv10-header">' +
      '<div class="rv10-header-left"><span class="rv10-icon">🔁</span><div>' +
        '<div class="rv10-title">جلسه مرور</div>' +
        '<div class="rv10-sub">' + _fa(_sessionIndex + 1) + ' از ' + _fa(_sessionQueue.length) + '</div>' +
      '</div></div>' +
      '<button class="rv10-close" type="button" data-rv10-close>✕</button></header>' +
      '<div class="rv10-body">' +
      '<section class="rv10-section">' +
        '<div class="rv10-session-title">' + _esc(title) + '</div>' +
        '<div class="rv10-session-meta">' + _fa(act.plannedDurationMinutes || 0) + ' دقیقه</div>' +
      '</section>' +
      '<section class="rv10-section">' +
        '<div class="rv10-section-title">نتیجه‌ی این مرور؟</div>' +
        '<div class="rv10-rate-grid">' +
          '<button class="rv10-rate-btn" data-rv10-rate="again">😞 فراموش کردم<br><small>Again</small></button>' +
          '<button class="rv10-rate-btn" data-rv10-rate="hard">😐 سخت بود<br><small>Hard</small></button>' +
          '<button class="rv10-rate-btn" data-rv10-rate="good">🙂 خوب بود<br><small>Good</small></button>' +
          '<button class="rv10-rate-btn" data-rv10-rate="easy">😎 راحت بود<br><small>Easy</small></button>' +
        '</div>' +
      '</section>' +
      '<div class="rv10-actions"><button class="rv10-btn" data-rv10-close>پایان</button></div>' +
      '</div>';
    _overlay.innerHTML = html;
    _wireSession();
  }

  function _bookTitle(bookId) {
    var s = _state();
    if (!s || !s.residency) return "مرور";
    var b = (s.residency.books || []).find(function (x) { return x && x.id === bookId; });
    return b ? "مرور: " + b.title : "مرور";
  }

  function _wireSession() {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-rv10-close]").forEach(function (b) {
      b.addEventListener("click", function () { _sessionQueue = null; UI.close(); });
    });
    _overlay.querySelectorAll("[data-rv10-rate]").forEach(function (b) {
      b.addEventListener("click", function () {
        var rating = b.getAttribute("data-rv10-rate");
        var act = _sessionQueue[_sessionIndex];
        try { R.spacedRepetition.completeReview(act.id, rating); }
        catch (e) { console.warn("[rv10] completeReview failed:", e); }
        _sessionIndex++;
        _renderSession();
        if (window.__os && window.__os.render) setTimeout(function () { window.__os.render(); }, 100);
      });
    });
  }

  console.log("[InternshipResidency.review.ui.v10] loaded");
})();