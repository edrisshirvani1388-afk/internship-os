/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics UI v9
   Overview + Trends + Residency + Workload + Insights
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.ui.v9] R missing"); return; }
  var UI = R.analyticsUI = R.analyticsUI || {};
  var AN = R.analytics;
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }

  UI.render = function (container) {
    if (!container) return;
    var s = _state();
    if (!s || !s.residency) {
      container.innerHTML = '<div class="an9-empty">داده‌ای برای تحلیل وجود ندارد.</div>';
      return;
    }

    var ov = AN.getOverview({ range: "last30Days" });
    var dq = AN.getDataQuality();
    var trends = R.analyticsTrends ? R.analyticsTrends.all({ range: "last30Days" }) : {};
    var insights = R.analyticsInsights ? R.analyticsInsights.all({ range: "last30Days" }) : [];

    var html = "";
    html += _renderHeader();
    html += _renderOverview(ov);
    html += _renderTrends(trends);
    html += _renderResidency(ov.residency);
    html += _renderWorkload(ov.workload);
    html += _renderInsights(insights);
    if (dq && dq.status !== "good") html += _renderDataQuality(dq);

    container.innerHTML = html;
  };

  function _renderHeader() {
    return '<section class="an9-hero">' +
      '<div class="an9-hero-text">' +
        '<div class="an9-hero-label">Analytics · ۳۰ روز اخیر</div>' +
        '<h2 class="an9-hero-title">📊 تحلیل عملکرد</h2>' +
        '<p class="an9-hero-sub">تصویر واقعی از پیشرفت، بار کاری، و روندها</p>' +
      '</div>' +
    '</section>';
  }

  function _renderOverview(ov) {
    if (!ov) return "";
    var ex = ov.execution || {};
    var st = ov.study || {};
    var rs = ov.residency || {};
    var rv = ov.reserve || {};
    var cards = [
      _kpi("✅", "نرخ تکمیل", _fa(ex.completionRate) + "%", _trendClass(ex.completionRate, 70)),
      _kpi("📄", "صفحات خوانده", _fa(st.actualPages), ""),
      _kpi("📚", "پوشش کلی", _fa(rs.coveragePercent) + "%", _trendClass(rs.coveragePercent, 60)),
      _kpi("🛡️", "Safety Buffer", _fa(rv.remainingMinutes) + " د", rv.status === "low" ? "is-warn" : rv.status === "exhausted" ? "is-error" : "is-ok")
    ];
    return '<section class="an9-section">' +
      '<div class="an9-section-title">🎯 خلاصه</div>' +
      '<div class="an9-kpi-grid">' + cards.join("") + '</div>' +
    '</section>';
  }

  function _kpi(icon, label, value, cls) {
    return '<div class="an9-kpi ' + cls + '">' +
      '<span class="an9-kpi-icon">' + icon + '</span>' +
      '<div class="an9-kpi-body">' +
        '<div class="an9-kpi-label">' + _esc(label) + '</div>' +
        '<div class="an9-kpi-value">' + _esc(value) + '</div>' +
      '</div>' +
    '</div>';
  }

  function _trendClass(v, good) {
    if (v >= good) return "is-ok";
    if (v >= good * 0.6) return "is-warn";
    return "is-error";
  }

  function _renderTrends(trends) {
    if (!trends || Object.keys(trends).length === 0) return "";
    var rows = Object.keys(trends).map(function (k) {
      var t = trends[k];
      var dir = t.direction;
      var icon = dir === "improving" ? "📈" : dir === "worsening" ? "📉" : dir === "stable" ? "➡️" : "❓";
      var cls = dir === "improving" ? "is-ok" : dir === "worsening" ? "is-error" : "is-info";
      var label = {
        plannedPages: "صفحات برنامه‌ریزی",
        actualPages: "صفحات خوانده",
        plannedMinutes: "دقیقه‌ی برنامه",
        actualMinutes: "دقیقه‌ی واقعی",
        completed: "تکمیل‌شده",
        partial: "نیمه‌کاره",
        missed: "جامانده"
      }[k] || k;
      return '<div class="an9-trend-row ' + cls + '">' +
        '<span class="an9-trend-icon">' + icon + '</span>' +
        '<span class="an9-trend-label">' + _esc(label) + '</span>' +
        '<span class="an9-trend-delta">' + (t.percentChange >= 0 ? "+" : "") + _fa(t.percentChange) + "%</span>" +
      '</div>';
    }).join("");
    return '<section class="an9-section">' +
      '<div class="an9-section-title">📈 روندها</div>' +
      '<div class="an9-trends">' + rows + '</div>' +
    '</section>';
  }

  function _renderResidency(rs) {
    if (!rs) return "";
    var html = '<section class="an9-section">' +
      '<div class="an9-section-title">🎓 Residency</div>' +
      '<div class="an9-kpi-grid">' +
        _kpi("📖", "کتاب‌ها", _fa(rs.totalBooks), "") +
        _kpi("🔄", "Roundها", _fa(rs.totalRounds), "") +
        _kpi("📄", "باقی‌مانده (صفحه)", _fa(rs.remainingPagesTotal), "") +
        _kpi("⚡", "وضعیت Pace", _esc(_paceLabel(rs.paceStatus)), rs.paceStatus === "on_track" ? "is-ok" : "is-warn") +
      '</div>';
    return html + '</section>';
  }

  function _paceLabel(p) {
    return {
      on_track: "طبق برنامه",
      tight: "فشرده",
      at_risk: "در خطر",
      deadline_passed: "Deadline گذشته",
      unknown: "نامشخص"
    }[p] || p;
  }

  function _renderWorkload(wl) {
    if (!wl) return "";
    return '<section class="an9-section">' +
      '<div class="an9-section-title">⏱️ بار کاری</div>' +
      '<div class="an9-kpi-grid">' +
        _kpi("📅", "روزهای فعال", _fa(wl.totalDays), "") +
        _kpi("📊", "میانگین روزانه", _fa(wl.averageDailyMinutes) + " د", "") +
        _kpi("🔥", "اوج روزانه", _fa(wl.peakDailyMinutes) + " د", wl.peakDailyMinutes > 240 ? "is-warn" : "") +
        _kpi("💤", "روزهای کم‌بار", _fa(wl.underutilizedDays), "") +
      '</div>' +
    '</section>';
  }

  function _renderInsights(insights) {
    if (!insights || insights.length === 0) {
      return '<section class="an9-section"><div class="an9-section-title">💡 بینش‌ها</div>' +
        '<div class="an9-empty-inline">✅ مورد خاصی برای گزارش نیست.</div></section>';
    }
    var rows = insights.map(function (ins) {
      var icon = ins.severity === "error" ? "🔴" : ins.severity === "warning" ? "🟠" : "🔵";
      return '<div class="an9-insight is-' + _esc(ins.severity) + '">' +
        '<span class="an9-insight-icon">' + icon + '</span>' +
        '<div class="an9-insight-body">' +
          '<div class="an9-insight-title">' + _esc(ins.title) + '</div>' +
          '<div class="an9-insight-desc">' + _esc(ins.explanation) + '</div>' +
        '</div>' +
      '</div>';
    }).join("");
    return '<section class="an9-section">' +
      '<div class="an9-section-title">💡 بینش‌ها</div>' +
      '<div class="an9-insights">' + rows + '</div>' +
    '</section>';
  }

  function _renderDataQuality(dq) {
    if (!dq || dq.status === "good") return "";
    return '<section class="an9-section">' +
      '<div class="an9-section-title">🩺 کیفیت داده</div>' +
      '<div class="an9-empty-inline is-warn">⚠️ ' + _fa(dq.issueCount) + ' مورد problem در داده‌ها (وضعیت: ' + _esc(dq.status) + ')</div>' +
    '</section>';
  }

  console.log("[analytics.ui.v9] loaded");
})();