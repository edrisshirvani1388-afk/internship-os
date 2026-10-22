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
    { id: "today",    icon: "\uD83C\uDF05", label: "\u0627\u0645\u0631\u0648\u0632" },
    { id: "program",  icon: "\uD83D\uDCC5", label: "\u0628\u0631\u0646\u0627\u0645\u0647" },
    { id: "progress", icon: "\uD83D\uDCCA", label: "\u067E\u06CC\u0634\u0631\u0641\u062A" },
    { id: "manage",   icon: "\u2699\uFE0F", label: "\u0645\u062F\u06CC\u0631\u06CC\u062A" }
];
var _TAB_MIGRATION = {
    planning: "program",
    timeline: "program",
    analysis: "progress",
    settings: "manage"
};
function _migrateTabId(v) {
    if (!v) return "today";
    for (var _i = 0; _i < TABS.length; _i++) {
        if (TABS[_i].id === v) return v;
    }
    var m = _TAB_MIGRATION[v];
    return m || "today";
}

  function _getActiveTab() {
    try {
      var v = localStorage.getItem(TAB_KEY);
      if (!v) return "today";
      var mig = _migrateTabId(v);
      if (mig !== v) {
        try { localStorage.setItem(TAB_KEY, mig); } catch (e) {}
      }
      return mig;
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
    } else if (activeTab === "program") {
      html += _renderProgramTab(rs);
    } else if (activeTab === "progress") {
      html += _renderAnalysisTab(rs);
    } else if (activeTab === "manage") {
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
    var html = '<div class="r21-tabs-bar" role="tablist" aria-label="\u062A\u0628\u200C\u0647\u0627\u06CC \u0631\u0632\u06CC\u062F\u0646\u062A\u06CC">';
    TABS.forEach(function (t) {
      var isActive = (t.id === activeTab);
      var cls = "r21-tab" + (isActive ? " is-active" : "");
      html += '<button type="button" class="' + cls + '" role="tab"' +
        ' data-r19-tab="' + t.id + '"' +
        ' aria-selected="' + (isActive ? "true" : "false") + '">' +
        '<span class="r21-tab-icon" aria-hidden="true">' + t.icon + '</span>' +
        '<span class="r21-tab-label">' + t.label + '</span>' +
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
  function _renderTodayPrimaryAction(rs) {
    var s = _state();
    if (!s) return "";

    var activePlanId = rs.meta && rs.meta.activePlanId;
    var plan = activePlanId ? (rs.plans || []).find(function (p) { return p && p.id === activePlanId; }) : null;
    var planRounds = plan ? (rs.rounds || []).filter(function (r) { return r && r.planId === plan.id; }) : [];
    var planEnrolls = (rs.enrollments || []).filter(function (e) {
        return e && planRounds.some(function (r) { return r.id === e.roundId; });
    });

    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    var todayActs = (rs.activities || []).filter(function (a) {
        return a && a.plannedDate === today && (a.status === "planned" || a.status === "in_progress");
    });
    var todayDone = (rs.activities || []).filter(function (a) {
        return a && a.plannedDate === today && a.status === "completed";
    });

    var futureActs = plan ? (rs.activities || []).filter(function (a) {
        return a && a.planId === plan.id && a.plannedDate && a.plannedDate > today &&
            (a.status === "planned" || a.status === "in_progress");
    }) : [];

    var hasTriggers = false;
    try {
        var RT = R.replanTrigger;
        if (RT && RT.getStatus && activePlanId) {
            var st = RT.getStatus(activePlanId);
            hasTriggers = !!(st && st.needed);
        }
    } catch (e) {}

    var kind, icon, title, desc, btnLabel;

    if (!plan) {
        if ((rs.plans || []).length === 0) {
            kind = "setup";
            icon = "\uD83C\uDFAF";
            title = "\u0627\u0648\u0644\u06CC\u0646 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647\u200C\u062A \u0631\u0648 \u0628\u0633\u0627\u0632";
            desc = "\u0628\u0627 \u06CC\u06A9 \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0633\u0627\u062F\u0647\u060C \u06A9\u062A\u0627\u0628\u200C\u0647\u0627\u060C \u062F\u0648\u0631\u0647\u200C\u0647\u0627 \u0648 \u0632\u0645\u0627\u0646 \u0645\u0637\u0627\u0644\u0639\u0647\u200C\u062A \u0631\u0648 \u0645\u0634\u062E\u0635 \u06A9\u0646.";
            btnLabel = "\u0634\u0631\u0648\u0639 \u06A9\u0646\u06CC\u0645";
        } else {
            kind = "activate";
            icon = "\uD83D\uDCCC";
            title = "\u06CC\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647 \u0641\u0639\u0627\u0644 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646";
            desc = "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627\u06CC \u0645\u0648\u062C\u0648\u062F\u062A \u0631\u0648 \u0628\u0628\u06CC\u0646 \u0648 \u06CC\u06A9\u06CC \u0631\u0648 \u0641\u0639\u0627\u0644 \u06A9\u0646.";
            btnLabel = "\u0645\u062F\u06CC\u0631\u06CC\u062A \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627";
        }
    } else if (planRounds.length === 0 || planEnrolls.length === 0) {
        kind = "complete-setup";
        icon = "\u26A0\uFE0F";
        title = "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u062A \u0647\u0646\u0648\u0632 \u06A9\u0627\u0645\u0644 \u0646\u06CC\u0633\u062A";
        desc = planRounds.length === 0
            ? "\u062F\u0648\u0631\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0639\u0631\u06CC\u0641 \u0646\u0634\u062F\u0647."
            : "\u0647\u0646\u0648\u0632 \u06A9\u062A\u0627\u0628\u06CC \u0628\u0647 \u062F\u0648\u0631\u0647\u200C\u0647\u0627 \u0648\u0635\u0644 \u0646\u06A9\u0631\u062F\u06CC.";
        btnLabel = "\u062A\u06A9\u0645\u06CC\u0644 \u062F\u0631 \u0645\u062F\u06CC\u0631\u06CC\u062A";
    } else if (todayActs.length === 0 && todayDone.length > 0) {
        kind = "done";
        icon = "\u2705";
        title = "\u062a\u0645\u0627\u0645 \u0641\u0639\u0627\u0644\u06cc\u062a\u200c\u0647\u0627\u06cc \u0627\u0645\u0631\u0648\u0632 \u0627\u0646\u062c\u0627\u0645 \u0634\u062f";
        desc = _fa(todayDone.length) + " \u062c\u0644\u0633\u0647 \u062a\u06a9\u0645\u06cc\u0644 \u0634\u062f. \u0628\u0631\u0627\u06cc \u0641\u0631\u062f\u0627 \u06cc\u0627 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u06a9\u0644 \u0631\u0627 \u0628\u0628\u06cc\u0646.";
        btnLabel = "\u0645\u0634\u0627\u0647\u062f\u0647 \u0628\u0631\u0646\u0627\u0645\u0647";
    } else if (todayActs.length === 0 && futureActs.length > 0) {
        kind = "plan-idle";
        icon = "\u2615";
        title = "\u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0627\u0645\u0631\u0648\u0632\u062A \u062e\u0627\u0644\u06cc\u0647";
        desc = "\u0628\u0631\u0627\u06CC \u0631\u0648\u0632\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647 " + _fa(futureActs.length) + " \u0641\u0639\u0627\u0644\u06CC\u062A \u062f\u0627\u0631\u06CC. \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u06a9\u0627\u0645\u0644 \u0631\u0627 \u0627\u0632 \u062a\u0628 \u00AB\u0628\u0631\u0646\u0627\u0645\u0647\u00BB \u0628\u0628\u06CC\u0646.";
        btnLabel = "\u0645\u0634\u0627\u0647\u062f\u0647\u0654 \u0628\u0631\u0646\u0627\u0645\u0647";
    } else if (todayActs.length === 0) {
        kind = "generate";
        icon = "\uD83D\uDE80";
        title = "\u0628\u0631\u0627\u06CC \u0627\u0645\u0631\u0648\u0632 \u0645\u0637\u0627\u0644\u0639\u0647\u200C\u0627\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u0646\u0634\u062F\u0647";
        desc = "\u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647 \u0628\u0633\u0627\u0632 \u062a\u0627 \u0631\u0648\u0632\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647 \u067E\u0631 \u0628\u0634\u0646.";
        btnLabel = "\u062a\u0648\u0644\u06cc\u062f \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647";
    } else {
        return "";
    }

    return '<div class="r21-cta is-' + kind + '">' +
        '<div class="r21-cta-icon">' + icon + '</div>' +
        '<div class="r21-cta-body">' +
            '<div class="r21-cta-title">' + _esc(title) + '</div>' +
            '<div class="r21-cta-desc">' + _esc(desc) + '</div>' +
        '</div>' +
        '<button type="button" class="r21-cta-btn" data-r21-cta="' + kind + '">' + _esc(btnLabel) + '</button>' +
    '</div>';
}
function _renderTodayTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    html += _renderTodayPrimaryAction(rs);
    html += _renderReplanBanner(rs);
    html += _renderTodayStudyRec(rs);
    html += _renderTodayWidgets(rs);
    return html;
}

  /* ─── TAB: برنامه (Phase R2-B) ───
     Temporary: sub-view toggle preserves planning + timeline content.
     R2-D will merge into one view. */
  var _PROGRAM_VIEW_KEY = "internship-os.residency.program-view.v1";
  function _getProgramView() {
    try {
      var v = localStorage.getItem(_PROGRAM_VIEW_KEY);
      if (v === "planning" || v === "timeline") return v;
    } catch (e) {}
    return "planning";
  }
  function _setProgramView(v) {
    try { localStorage.setItem(_PROGRAM_VIEW_KEY, v); } catch (e) {}
  }

  function _renderProgramTab(rs) {
    var html = "";
    html += _renderHeader(rs);
    var kind = _getProgramPrimaryKind(rs);
    html += _renderProgramPrimaryAction(rs, kind);
    if (kind !== "replan") {
        html += _renderReplanBanner(rs);
    } else {
        html += _renderReplanBanner(rs, { showCTA: false });
    }
    html += _renderProgramAdvancedTools(rs);
    html += _renderFutureDaysPreview(rs);
    var planId = rs.meta && rs.meta.activePlanId;
    html += _renderTimelineGraphic(rs, planId);
    html += _renderProgramStatusCard(rs);
    html += _renderRoundsSection(rs);
    html += _renderReadingStrategyCompact(rs);
    return html;
}

function _renderFutureDaysPreview(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    if (!LIB || !LIB.date) return "";

    var st = _state();
    if (!st) return "";
    if (!st.workspace) st.workspace = {};
    if (!st.workspace._residencyFuture || typeof st.workspace._residencyFuture !== "object") {
        st.workspace._residencyFuture = { offset: 0, selIdx: null };
    }
    var fd = st.workspace._residencyFuture;
    if (typeof fd.offset !== "number" || fd.offset < 0) fd.offset = 0;

    var offset = fd.offset;
    var todayStr = LIB.date.todayJalaliString();
    var tp = LIB.date.parseJalali(todayStr);
    if (!tp) return "";

    var startP = LIB.date.addJalaliDays(tp.jy, tp.jm, tp.jd, offset);
    var days = [];
    for (var i = 0; i < 7; i++) {
        var d = LIB.date.addJalaliDays(startP.jy, startP.jm, startP.jd, i);
        var dk = LIB.date.dateKey(d.jy, d.jm, d.jd);
        var acts = (rs.activities || []).filter(function (a) {
            return a && a.planId === activePlanId && a.plannedDate === dk && a.status !== "cancelled";
        });
        days.push({ key: dk, jy: d.jy, jm: d.jm, jd: d.jd, count: acts.length, acts: acts, isToday: dk === todayStr });
    }

    var JM = ["\u0641\u0631\u0648\u0631\u062F\u06CC\u0646","\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A","\u062E\u0631\u062F\u0627\u062F","\u062A\u06CC\u0631","\u0645\u0631\u062F\u0627\u062F","\u0634\u0647\u0631\u06CC\u0648\u0631","\u0645\u0647\u0631","\u0622\u0628\u0627\u0646","\u0622\u0630\u0631","\u062F\u06CC","\u0628\u0647\u0645\u0646","\u0627\u0633\u0641\u0646\u062F"];

    var selIdx = fd.selIdx;
    if (selIdx == null) {
        selIdx = days.findIndex(function(x){ return x.isToday; });
        if (selIdx < 0) selIdx = days.findIndex(function(x){ return x.count > 0; });
        if (selIdx < 0) selIdx = 0;
    }
    if (selIdx < 0) selIdx = 0;
    if (selIdx >= days.length) selIdx = days.length - 1;
    fd.selIdx = selIdx;
    var selDay = days[selIdx];

    var cells = days.map(function (d, idx) {
        var cls = "r21-future-day" + (d.isToday ? " is-today" : "") + (idx === selIdx ? " is-selected" : "");
        var ariaLabel = _fa(d.jd) + " " + JM[d.jm - 1];
        if (d.isToday) ariaLabel += " (\u0627\u0645\u0631\u0648\u0632)";
        ariaLabel += " \u2014 " + (d.count > 0 ? _fa(d.count) + " \u0641\u0639\u0627\u0644\u06CC\u062A" : "\u0628\u062F\u0648\u0646 \u0641\u0639\u0627\u0644\u06CC\u062A");
        var ariaCurrent = (idx === selIdx) ? ' aria-current="true"' : "";
        return '<button type="button" class="' + cls + '" data-r21-future-day-idx="' + idx + '" onclick="window.__residencyFuturePick(' + idx + ')" aria-label="' + _esc(ariaLabel) + '"' + ariaCurrent + '>' +
            '<div class="r21-future-day-date">' + _esc(JM[d.jm - 1]) + '</div>' +
            '<div class="r21-future-day-num">' + _fa(d.jd) + '</div>' +
            '<div class="r21-future-day-meta">' + (d.count > 0 ? _fa(d.count) + ' \u0641\u0639\u0627\u0644\u06CC\u062A' : '\u2014') + '</div>' +
        '</button>';
    }).join("");

    var detailHTML;
    if (selDay.count === 0) {
        detailHTML = '<div class="r21-future-detail-empty">\u0627\u06CC\u0646 \u0631\u0648\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A\u06CC \u0646\u062F\u0627\u0631\u062F.</div>';
    } else {
        var bookMap = {};
        (rs.books || []).forEach(function(b){ if (b && b.id) bookMap[b.id] = b.title || b.id; });
        var rows = selDay.acts.slice(0, 20).map(function (a) {
            var bookTitle = bookMap[a.bookId] || (a.title || "\u2014");
            var pages = "";
            if (typeof a.plannedPageStart === "number" && typeof a.plannedPageEnd === "number") {
                pages = "\u0635 " + _fa(a.plannedPageStart) + "\u2013" + _fa(a.plannedPageEnd);
            } else if (a.plannedPages) {
                pages = _fa(a.plannedPages) + " \u0635";
            }
            var dur = a.plannedDurationMinutes ? _fa(a.plannedDurationMinutes) + "\u062F" : "";
            var time = a.plannedStartTime ? _fa(a.plannedStartTime) : "";
            var meta = [time, dur].filter(Boolean).join(" \u00B7 ");
            return '<div class="r21-future-detail-row">' +
                '<span class="r21-future-detail-title">' + _esc(bookTitle) + '</span>' +
                (pages ? '<span class="r21-future-detail-pages">' + _esc(pages) + '</span>' : '') +
                (meta ? '<span class="r21-future-detail-meta">' + _esc(meta) + '</span>' : '') +
            '</div>';
        }).join("");
        detailHTML = '<div class="r21-future-detail-list">' + rows + '</div>';
    }

    var activeLabel = _fa(selDay.jd) + " " + JM[selDay.jm - 1];
    if (selDay.isToday) activeLabel = "\u0627\u0645\u0631\u0648\u0632 \u2014 " + activeLabel;

    var prevDisabled = offset <= 0 ? " disabled" : "";
    var prevOnClick = offset <= 0 ? "" : ' onclick="window.__residencyFutureNav(-1)"';
    var nextOnClick = ' onclick="window.__residencyFutureNav(1)"';

    return '<div class="r21-future-days" data-r21-future-root>' +
        '<div class="r21-sr-only" role="status" aria-live="polite" aria-atomic="true" data-r21-future-live></div>' +
        '<div class="r21-future-days-head">' +
            '<button type="button" class="r21-future-nav-btn"' + prevDisabled + prevOnClick + ' aria-label="\u0647\u0641\u062A\u0647 \u0642\u0628\u0644">\u2039</button>' +
            '<div class="r21-future-days-center">' +
                '<div class="r21-future-days-title">\uD83D\uDCC5 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647</div>' +
                '<div class="r21-future-days-active">' + _esc(activeLabel) + ' \u00B7 ' + _fa(selDay.count) + ' \u0641\u0639\u0627\u0644\u06CC\u062A</div>' +
            '</div>' +
            '<button type="button" class="r21-future-nav-btn"' + nextOnClick + ' aria-label="\u0647\u0641\u062A\u0647 \u0628\u0639\u062F">\u203A</button>' +
        '</div>' +
        '<div class="r21-future-days-grid" role="group" aria-label="\u0631\u0648\u0632\u0647\u0627\u06CC \u0647\u0641\u062A\u0647">' + cells + '</div>' +
        '<div class="r21-future-detail">' + detailHTML + '</div>' +
    '</div>';
}

window.__residencyFutureNav = function(direction) {
    var s = _state();
    if (!s || !s.workspace || !s.workspace._residencyFuture) return;
    var fd = s.workspace._residencyFuture;
    if (direction < 0) {
        if (fd.offset <= 0) return;
        fd.offset -= 7;
    } else {
        fd.offset += 7;
    }
    fd.selIdx = null;
    _refreshFutureDaysOnly({ navDir: direction < 0 ? "prev" : "next" });
};;

window.__residencyFuturePick = function(idx) {
    var s = _state();
    if (!s || !s.workspace || !s.workspace._residencyFuture) return;
    s.workspace._residencyFuture.selIdx = idx;
    _refreshFutureDaysOnly({ pickIdx: idx });
};;

function _refreshFutureDaysOnly(opts) {
    opts = opts || {};
    var s = _state();
    if (!s || !s.residency) return;
    var wrapper = document.querySelector("[data-r21-future-root]");
    if (!wrapper || !wrapper.parentNode) return;

    var newHTML = _renderFutureDaysPreview(s.residency);
    if (!newHTML) return;
    var temp = document.createElement("div");
    temp.innerHTML = newHTML;
    var newEl = temp.firstElementChild;
    if (!newEl) return;
    wrapper.parentNode.replaceChild(newEl, wrapper);

    var target = null;
    if (typeof opts.pickIdx === "number") {
        target = newEl.querySelector('[data-r21-future-day-idx="' + opts.pickIdx + '"]');
    } else if (opts.navDir === "prev") {
        target = newEl.querySelector("[data-r21-future-prev]");
        if (target && target.disabled) target = null;
    } else if (opts.navDir === "next") {
        target = newEl.querySelector("[data-r21-future-next]");
        if (target && target.disabled) target = null;
    }

    if (target) {
        var attempts = 0;
        var tryFocus = function () {
            attempts++;
            if (!target.isConnected) return;
            try { target.focus({ preventScroll: true }); } catch (e) {}
            if (document.activeElement === target) {
                console.log("[r2h11] focus OK after " + attempts + " attempt(s)");
                return;
            }
            if (attempts < 10) {
                setTimeout(tryFocus, 20);
            } else {
                console.warn("[r2h11] focus FAILED after " + attempts + " attempts — activeElement:", document.activeElement);
            }
        };
        tryFocus();
    }

    var live = newEl.querySelector("[data-r21-future-live]");
    var active = newEl.querySelector(".r21-future-days-active");
    if (live && active) {
        var txt = active.textContent.trim();
        live.textContent = "";
        setTimeout(function () {
            if (live.isConnected) live.textContent = txt;
        }, 40);
    }
}

function _wireFutureDaysOnly(scope) { /* legacy no-op */ }

function _refreshFutureDaysOnly() {
    var s = _state();
    if (!s || !s.residency) return;
    var wrapper = document.querySelector("[data-r21-future-root]");
    if (!wrapper || !wrapper.parentNode) return;
    var newHTML = _renderFutureDaysPreview(s.residency);
    if (!newHTML) return;
    var temp = document.createElement("div");
    temp.innerHTML = newHTML;
    var newEl = temp.firstElementChild;
    if (!newEl) return;
    wrapper.parentNode.replaceChild(newEl, wrapper);
    _wireFutureDaysOnly(newEl);
}

function _wireFutureDaysOnly(scope) {
    if (!scope) return;
    scope.querySelectorAll("[data-r21-future-day-idx]").forEach(function (b) {
        b.addEventListener("click", function () {
            var idx = parseInt(b.getAttribute("data-r21-future-day-idx"), 10);
            if (isNaN(idx)) return;
            var s = _state();
            if (!s || !s.workspace || !s.workspace._residencyFuture) return;
            s.workspace._residencyFuture.selIdx = idx;
            _refreshFutureDaysOnly();
        });
    });
    scope.querySelectorAll("[data-r21-future-prev]").forEach(function (b) {
        if (b.disabled) return;
        b.addEventListener("click", function () {
            var s = _state();
            if (!s || !s.workspace || !s.workspace._residencyFuture) return;
            s.workspace._residencyFuture.offset = Math.max(0, (s.workspace._residencyFuture.offset || 0) - 7);
            s.workspace._residencyFuture.selIdx = null;
            _refreshFutureDaysOnly();
        });
    });
    scope.querySelectorAll("[data-r21-future-next]").forEach(function (b) {
        b.addEventListener("click", function () {
            var s = _state();
            if (!s || !s.workspace || !s.workspace._residencyFuture) return;
            s.workspace._residencyFuture.offset = (s.workspace._residencyFuture.offset || 0) + 7;
            s.workspace._residencyFuture.selIdx = null;
            _refreshFutureDaysOnly();
        });
    });
}
function _getProgramPrimaryKind(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    var plan = activePlanId ? (rs.plans || []).find(function (p) { return p && p.id === activePlanId; }) : null;

    if (!plan) {
        return ((rs.plans || []).length === 0) ? "setup" : "activate";
    }

    var planRounds = (rs.rounds || []).filter(function (r) { return r && r.planId === plan.id; });
    var planEnrolls = (rs.enrollments || []).filter(function (e) {
        return e && planRounds.some(function (r) { return r.id === e.roundId; });
    });
    if (planRounds.length === 0 || planEnrolls.length === 0) return "complete-setup";

    var hasTriggers = false;
    try {
        var RT = R.replanTrigger;
        if (RT && RT.getStatus && activePlanId) {
            var st = RT.getStatus(activePlanId);
            hasTriggers = !!(st && st.needed);
        }
    } catch (e) {}
    if (hasTriggers) return "replan";

    var activeActs = 0;
    (rs.activities || []).forEach(function (a) {
        if (!a) return;
        if (a.planId !== activePlanId) return;
        if (a.status === "planned" || a.status === "in_progress") activeActs++;
    });
    if (activeActs === 0) return "generate";

    return "ok";
}

function _renderProgramPrimaryAction(rs, kind) {
    if (kind === "ok") return "";

    var map = {
        "setup": {
            icon: "🎯",
            title: "اولین برنامهٔ مطالعه‌ات رو بساز",
            desc: "با یک راهنمای ساده، کتاب‌ها، دوره‌ها و زمان مطالعه‌ات رو مشخص کن.",
            btn: "شروع کنیم",
            cls: "setup"
        },
        "activate": {
            icon: "📌",
            title: "یک برنامه فعال انتخاب کن",
            desc: "برنامه‌های موجودت رو ببین و یکی رو فعال کن.",
            btn: "مدیریت برنامه‌ها",
            cls: "activate"
        },
        "complete-setup": {
            icon: "⚠️",
            title: "برنامه‌ات هنوز کامل نیست",
            desc: "دوره یا اتصال کتاب‌به‌دوره لازم داری.",
            btn: "تکمیل در مدیریت",
            cls: "complete-setup"
        },
        "replan": {
            icon: "🔄",
            title: "برنامه‌ات نیاز به بازبینی دارد",
            desc: "چند تغییر روی برنامه اثر گذاشته — یک نگاه بینداز.",
            btn: "بررسی و اصلاح",
            cls: "replan"
        },
        "generate": {
            icon: "🚀",
            title: "هنوز برنامه‌ای برای روزهای آینده تولید نکردی",
            desc: "با یک کلیک، بلاک‌های مطالعه روزانه رو بساز.",
            btn: "تولید برنامهٔ مطالعه",
            cls: "generate"
        }
    };

    var m = map[kind];
    if (!m) return "";

    return '<div class="r21-cta is-' + m.cls + '">' +
        '<div class="r21-cta-icon" aria-hidden="true">' + m.icon + '</div>' +
        '<div class="r21-cta-body">' +
            '<div class="r21-cta-title">' + _esc(m.title) + '</div>' +
            '<div class="r21-cta-desc">' + _esc(m.desc) + '</div>' +
        '</div>' +
        '<button type="button" class="r21-cta-btn" data-r21-cta="' + kind + '">' + _esc(m.btn) + '</button>' +
    '</div>';
}

function _renderProgramStatusCard(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    var planRounds = (rs.rounds || []).filter(function (r) { return r && r.planId === activePlanId; });
    var planRoundIds = planRounds.map(function (r) { return r.id; });

    var uniqueBookIds = {};
    var totalEnrolls = 0;
    (rs.enrollments || []).forEach(function (e) {
        if (!e || e.mode === "excluded") return;
        if (planRoundIds.indexOf(e.roundId) === -1) return;
        uniqueBookIds[e.bookId] = 1;
        totalEnrolls++;
    });

    var books = Object.keys(uniqueBookIds).length;
    var rounds = planRounds.length;

    return '<div class="r21-program-status">' +
        '<div class="r21-program-stat"><div class="r21-program-stat-num">' + _fa(books) + '</div><div class="r21-program-stat-lbl">کتاب</div></div>' +
        '<div class="r21-program-stat"><div class="r21-program-stat-num">' + _fa(rounds) + '</div><div class="r21-program-stat-lbl">دور</div></div>' +
        '<div class="r21-program-stat"><div class="r21-program-stat-num">' + _fa(totalEnrolls) + '</div><div class="r21-program-stat-lbl">اتصال</div></div>' +
    '</div>';
}

function _renderReadingStrategyCompact(rs) {
    var mode = "sequential";
    try {
        var S = R.readingStrategy;
        if (S && S.resolve) {
            var strategy = S.resolve({ residency: rs }, null, rs.enrollments || []);
            if (strategy && strategy.mode) mode = strategy.mode;
        }
    } catch (e) {}

    var labels = {
        sequential: "ترتیبی",
        category_first: "درس‌به‌درس",
        alternating_daily: "چرخشی روزانه",
        alternating_categories: "چرخشی درس‌ها",
        balanced: "متعادل",
        custom: "سفارشی"
    };
    var label = labels[mode] || "ترتیبی";

    var speed = 20;
    try {
        if (rs.settings && rs.settings.defaultStudySpeed && rs.settings.defaultStudySpeed.pagesPerHour) {
            speed = rs.settings.defaultStudySpeed.pagesPerHour;
        }
    } catch (e) {}

    return '<div class="r21-program-strategy">' +
        '<span class="r21-program-strategy-icon" aria-hidden="true">📖</span>' +
        '<span class="r21-program-strategy-mode">' + _esc(label) + '</span>' +
        '<span class="r21-program-strategy-sep" aria-hidden="true">·</span>' +
        '<span class="r21-program-strategy-speed">' + _fa(speed) + ' ص/س</span>' +
    '</div>';
}

function _renderProgramAdvancedTools(rs) {
  var hasPlannerUI = !!(R.plannerUI && R.plannerUI.open);
  var hasWorkspace = !!(R.plannerWorkspace && R.plannerWorkspace.open);
  var hasReplanUI = !!(R.plannerReplanUI && R.plannerReplanUI.open);
  var html = '<div class="r21-program-tools">';
  html += '<div class="r21-program-tools-title">\u0627\u0628\u0632\u0627\u0631\u0647\u0627\u06CC \u0628\u06CC\u0634\u062A\u0631</div>';
  html += '<div class="r21-program-tools-grid">';
  if (hasPlannerUI) {
    html += '<button type="button" class="r21-program-tool is-planner" data-r21-cta="planner">' +
      '<span class="r21-program-tool-icon">\uD83D\uDCDA</span>' +
      '<span class="r21-program-tool-label">\u062a\u0648\u0644\u06cc\u062f / \u0648\u06cc\u0631\u0627\u06cc\u0634 \u0628\u0631\u0646\u0627\u0645\u0647</span>' +
    '</button>';
  }
  if (hasReplanUI) {
    html += '<button type="button" class="r21-program-tool is-replan" data-r21-cta="replan">' +
      '<span class="r21-program-tool-icon">\uD83D\uDD04</span>' +
      '<span class="r21-program-tool-label">\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u0645\u062C\u062F\u062F</span>' +
    '</button>';
  }
  if (hasWorkspace) {
    html += '<button type="button" class="r21-program-tool is-workspace" data-r21-cta="workspace">' +
      '<span class="r21-program-tool-icon">\uD83C\uDFAF</span>' +
      '<span class="r21-program-tool-label">\u062d\u0627\u0644\u062a \u067E\u06CC\u0634\u0631\u0641\u062A\u0647</span>' +
    '</button>';
  }
  html += '<button type="button" class="r21-program-tool is-manage" data-r21-cta="complete-setup">' +
    '<span class="r21-program-tool-icon">\u2699\uFE0F</span>' +
    '<span class="r21-program-tool-label">\u0645\u062f\u06cc\u0631\u06cc\u062a \u0628\u0631\u0646\u0627\u0645\u0647</span>' +
  '</button>';
  html += '</div></div>';
  return html;
}

  function _wireProgramTab(container) { /* wired via inline onclick */ }
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

    var mode = (strategy && strategy.mode) ? strategy.mode : "sequential";
    var descMap = {
        sequential:              "\u0647\u0631 \u06A9\u062A\u0627\u0628 \u062A\u0627 \u067E\u0627\u06CC\u0627\u0646\u060C \u0628\u0639\u062F \u06A9\u062A\u0627\u0628 \u0628\u0639\u062F\u06CC",
        category_first:          "\u0647\u0631 \u062F\u0631\u0633 \u06A9\u0627\u0645\u0644\u060C \u0628\u0639\u062F \u062F\u0631\u0633 \u0628\u0639\u062F\u06CC",
        alternating_daily:       "\u0647\u0631 \u0631\u0648\u0632 \u0628\u06CC\u0646 \u0686\u0646\u062F \u06A9\u062A\u0627\u0628",
        alternating_categories:  "\u0628\u06CC\u0646 \u0686\u0646\u062F \u062F\u0631\u0633 \u062C\u0627\u0628\u0647\u200C\u062C\u0627 \u0634\u0648",
        balanced:                "\u067E\u06CC\u0634\u0631\u0641\u062A \u0686\u0646\u062F \u06A9\u062A\u0627\u0628 \u0646\u0632\u062F\u06CC\u06A9 \u0647\u0645",
        custom:                  "\u062A\u0631\u062A\u06CC\u0628 \u062F\u0644\u062E\u0648\u0627\u0647 \u062A\u0648"
    };
    var desc = descMap[mode] || descMap.sequential;

    var modes = [
        { id: "sequential",             label: "\u062A\u0631\u062A\u06CC\u0628\u06CC" },
        { id: "category_first",         label: "\u062F\u0631\u0633\u200C\u0628\u0647\u200C\u062F\u0631\u0633" },
        { id: "alternating_daily",      label: "\u0686\u0631\u062E\u0634\u06CC \u0631\u0648\u0632\u0627\u0646\u0647" },
        { id: "alternating_categories", label: "\u0686\u0631\u062E\u0634\u06CC \u0628\u06CC\u0646 \u062F\u0631\u0633\u200C\u0647\u0627" },
        { id: "balanced",               label: "\u0645\u062A\u0639\u0627\u062F\u0644" },
        { id: "custom",                 label: "\u0633\u0641\u0627\u0631\u0634\u06CC" }
    ];
    var opts = modes.map(function (m) {
        return '<option value="' + m.id + '"' + (m.id === mode ? ' selected' : '') + '>' + m.label + '</option>';
    }).join("");

    var defaultSpeed = 20;
    try {
        if (rs.settings && rs.settings.defaultStudySpeed && rs.settings.defaultStudySpeed.pagesPerHour) {
            defaultSpeed = rs.settings.defaultStudySpeed.pagesPerHour;
        }
    } catch (e) {}

    return '<div class="r19-block">' +
        '<div class="r19-block-title"><span>\uD83D\uDCD6 \u0631\u0648\u0634 \u0645\u0637\u0627\u0644\u0639\u0647</span></div>' +
        '<select class="r21-rs-select" data-r21-rs-select aria-label="\u0631\u0648\u0634 \u0645\u0637\u0627\u0644\u0639\u0647">' + opts + '</select>' +
        '<div class="r19-rs-desc">' + _esc(desc) + '</div>' +
        '<div class="r19-rs-speed"><span>\u0633\u0631\u0639\u062A \u067E\u06CC\u0634\u200C\u0641\u0631\u0636</span><strong>' + _fa(defaultSpeed) + ' \u0635\u0641\u062D\u0647/\u0633\u0627\u0639\u062A</strong></div>' +
        '<div class="r19-rs-hint">\u0628\u0631\u0627\u06CC \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0633\u0631\u0639\u062A \u0647\u0631 \u062F\u0648\u0631\u060C \u0628\u0647 \u0628\u062E\u0634 \u00AB\u062F\u0648\u0631\u0647\u200C\u0647\u0627\u00BB \u062F\u0631 \u0647\u0645\u06CC\u0646 \u062A\u0628 \u0628\u0631\u0648.</div>' +
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
    html += _renderProgressHero(rs);
    html += _renderKpiStrip(rs);
    html += _renderRoundProgressList(rs);
    html += _renderBookProgressList(rs);
    html += _renderBaselineCompact(rs);
    return html;
}

function _renderProgressHero(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === activePlanId; });
    if (rounds.length === 0) return "";

    var total = 0, read = 0;
    rounds.forEach(function (r) {
        var st = _computeRoundStats(rs, r);
        total += st.totalPages;
        read += st.studiedPages;
    });
    var pct = total > 0 ? Math.round(read / total * 100) : 0;

    var circ = 264;
    var offset = Math.round(circ * (1 - pct / 100));

    return '<div class="r21-progress-hero">' +
        '<div class="r21-progress-ring">' +
            '<svg viewBox="0 0 100 100" class="r21-progress-ring-svg" aria-hidden="true">' +
                '<circle class="r21-p-ring-bg" cx="50" cy="50" r="42" />' +
                '<circle class="r21-p-ring-fg" cx="50" cy="50" r="42" stroke-dasharray="' + circ + '" stroke-dashoffset="' + offset + '" />' +
            '</svg>' +
            '<div class="r21-progress-ring-center">' +
                '<div class="r21-progress-ring-val">' + _fa(pct) + '٪</div>' +
                '<div class="r21-progress-ring-lbl">پیشرفت</div>' +
            '</div>' +
        '</div>' +
        '<div class="r21-progress-hero-info">' +
            '<div class="r21-progress-hero-title">پیشرفت کل مطالعه</div>' +
            '<div class="r21-progress-hero-meta">' + _fa(read) + ' / ' + _fa(total) + ' صفحه</div>' +
            '<div class="r21-progress-hero-sub">' + _fa(rounds.length) + ' دوره · ' + _fa((rs.books || []).length) + ' کتاب</div>' +
        '</div>' +
    '</div>';
}

var _PROG_FILTER_KEY_PREFIX = "internship-os.residency.prog-round-filter.v1.";
function _getProgRoundFilter(planId) {
    try {
        var v = localStorage.getItem(_PROG_FILTER_KEY_PREFIX + planId);
        if (!v || v === "all") return "all";
        return v;
    } catch (e) { return "all"; }
}
function _setProgRoundFilter(planId, v) {
    try { localStorage.setItem(_PROG_FILTER_KEY_PREFIX + planId, v || "all"); } catch (e) {}
}

function _renderRoundProgressList(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    var rounds = (rs.rounds || []).filter(function (r) { return r && r.planId === activePlanId; });
    if (rounds.length === 0) return "";
    rounds = rounds.slice().sort(function (a, b) { return (a.order || 0) - (b.order || 0); });

    var filter = _getProgRoundFilter(activePlanId);

    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    var curIdx = -1;
    rounds.forEach(function (r, i) {
        if (!r.startDate || !r.endDate || !today) return;
        if (LIB.date.compareJalaliDate(r.startDate, today) <= 0 &&
            LIB.date.compareJalaliDate(today, r.endDate) <= 0) curIdx = i;
    });

    // aggregate across all rounds
    var totalAll = 0, readAll = 0;
    rounds.forEach(function (r) {
        var st = _computeRoundStats(rs, r);
        totalAll += st.totalPages;
        readAll += st.studiedPages;
    });
    var pctAll = totalAll > 0 ? Math.round(readAll / totalAll * 100) : 0;

    var html = '<div class="r21-progress-section">';
    html += '<div class="r21-progress-section-head">';
    html += '<div class="r21-progress-section-title">دوره‌ها</div>';
    html += '<div class="r21-progress-section-count">' + _fa(rounds.length) + ' دوره · کلیک کن تا کتاب‌های هر دور را ببینی</div>';
    html += '</div>';
    html += '<div class="r21-progress-hscroll">';

    // "all" chip
    var allActive = (filter === "all");
    html += '<button type="button" class="r21-progress-round-card r21-progress-round-card-all' + (allActive ? ' is-active' : '') + '" data-r21-round-filter="all" aria-pressed="' + (allActive ? "true" : "false") + '">' +
        '<div class="r21-progress-round-head">' +
            '<span class="r21-progress-round-num">∑</span>' +
        '</div>' +
        '<div class="r21-progress-round-title">همهٔ دوره‌ها</div>' +
        '<div class="r21-progress-round-pct">' + _fa(pctAll) + '٪</div>' +
        '<div class="r21-progress-bar"><span style="width:' + pctAll + '%"></span></div>' +
        '<div class="r21-progress-round-meta">' + _fa(readAll) + ' / ' + _fa(totalAll) + ' ص</div>' +
    '</button>';

    rounds.forEach(function (r, i) {
        var st = _computeRoundStats(rs, r);
        var pct = st.pct;
        var isCurrent = (i === curIdx);
        var isActive = (filter === r.id);
        var cls = "r21-progress-round-card";
        if (isCurrent) cls += " is-current";
        if (isActive) cls += " is-active";
        html += '<button type="button" class="' + cls + '" data-r21-round-filter="' + _esc(r.id) + '" aria-pressed="' + (isActive ? "true" : "false") + '">' +
            '<div class="r21-progress-round-head">' +
                '<span class="r21-progress-round-num">' + _fa(i + 1) + '</span>' +
                (isCurrent ? '<span class="r21-progress-round-live" title="دور فعلی">●</span>' : '') +
            '</div>' +
            '<div class="r21-progress-round-title">' + _esc(r.title) + '</div>' +
            '<div class="r21-progress-round-pct">' + _fa(pct) + '٪</div>' +
            '<div class="r21-progress-bar"><span style="width:' + pct + '%"></span></div>' +
            '<div class="r21-progress-round-meta">' + _fa(st.studiedPages) + ' / ' + _fa(st.totalPages) + ' ص</div>' +
        '</button>';
    });
    html += '</div></div>';
    return html;
}

function _renderBookProgressList(rs) {
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    var planRounds = (rs.rounds || []).filter(function (r) { return r && r.planId === activePlanId; });
    var filter = _getProgRoundFilter(activePlanId);

    var targetRoundIds;
    if (filter === "all") {
        targetRoundIds = planRounds.map(function (r) { return r.id; });
    } else {
        targetRoundIds = [filter];
    }

    // Books enrolled in target round(s)
    var bookIds = {};
    (rs.enrollments || []).forEach(function (e) {
        if (!e) return;
        if (targetRoundIds.indexOf(e.roundId) === -1) return;
        if (e.mode === "excluded") return;
        bookIds[e.bookId] = true;
    });

    var bids = Object.keys(bookIds);
    if (bids.length === 0) {
        return '<div class="r21-progress-section">' +
            '<div class="r21-progress-section-head">' +
            '<div class="r21-progress-section-title">کتاب‌ها</div>' +
            '</div>' +
            '<div class="r21-progress-empty">کتابی برای این دور تعریف نشده.</div>' +
        '</div>';
    }

    var bookMap = {};
    bids.forEach(function (bid) {
        var book = (rs.books || []).find(function (b) { return b && b.id === bid; });
        if (!book) return;
        var total = book.totalPages || 0;
        var read = 0;
        (rs.activities || []).forEach(function (a) {
            if (!a || a.bookId !== bid) return;
            if (a.planId !== activePlanId) return;
            if (a.status === "completed") read += (a.actualPages || a.plannedPages || 0);
        });
        (rs.enrollments || []).forEach(function (e) {
            if (!e || e.bookId !== bid) return;
            if (e.initialStudyBaseline) {
                try {
                    if (R.baseline && R.baseline.computePages) {
                        read += R.baseline.computePages(e.initialStudyBaseline, total);
                    }
                } catch (err) {}
            }
        });
        read = Math.min(read, total);
        bookMap[bid] = {
            title: book.title || "—",
            total: total,
            read: read,
            pct: total > 0 ? Math.round(read / total * 100) : 0
        };
    });

    var validBids = Object.keys(bookMap).filter(function (b) { return bookMap[b].total > 0; });
    validBids.sort(function (a, b) { return bookMap[b].pct - bookMap[a].pct; });

    var filterLabel = "همهٔ دوره‌ها";
    if (filter !== "all") {
        var fr = planRounds.find(function (r) { return r.id === filter; });
        if (fr) filterLabel = fr.title;
    }

    var html = '<div class="r21-progress-section">';
    html += '<div class="r21-progress-section-head">';
    html += '<div class="r21-progress-section-title">کتاب‌ها — ' + _esc(filterLabel) + '</div>';
    html += '<div class="r21-progress-section-count">' + _fa(validBids.length) + ' کتاب</div>';
    html += '</div>';
    html += '<div class="r21-progress-books-grid">';
    validBids.forEach(function (bid) {
        var b = bookMap[bid];
        html += '<div class="r21-progress-book-card" data-r21-book-id="' + _esc(bid) + '">' +
            '<div class="r21-progress-book-title" title="' + _esc(b.title) + '">' + _esc(b.title) + '</div>' +
            '<div class="r21-progress-book-pct">' + _fa(b.pct) + '٪</div>' +
            '<div class="r21-progress-bar"><span style="width:' + b.pct + '%"></span></div>' +
            '<div class="r21-progress-book-meta">' + _fa(b.read) + ' / ' + _fa(b.total) + ' ص</div>' +
        '</div>';
    });
    html += '</div></div>';
    return html;
}

function _renderBaselineCompact(rs) {
    var books = rs.books || [];
    var enrs = rs.enrollments || [];
    var totalPages = 0;
    var baselinePages = 0;
    books.forEach(function (b) { totalPages += (b.totalPages || 0); });
    try {
        if (R.baseline) {
            enrs.forEach(function (e) {
                if (!e || !e.initialStudyBaseline) return;
                var book = books.find(function (b) { return b && b.id === e.bookId; });
                if (!book) return;
                baselinePages += R.baseline.computePages(e.initialStudyBaseline, book.totalPages || 0);
            });
        }
    } catch (e) {}
    if (baselinePages === 0) return "";
    var pct = totalPages > 0 ? Math.round(baselinePages / totalPages * 100) : 0;
    return '<div class="r21-progress-baseline">' +
        '<span class="r21-progress-baseline-icon" aria-hidden="true">📚</span>' +
        '<div class="r21-progress-baseline-body">' +
            '<div class="r21-progress-baseline-title">مطالعهٔ اولیه ثبت شده</div>' +
            '<div class="r21-progress-baseline-meta">' + _fa(baselinePages) + ' صفحه (' + _fa(pct) + '٪)</div>' +
        '</div>' +
        '<button type="button" class="r21-progress-baseline-btn" data-r19-bs-open-first>ویرایش</button>' +
    '</div>';
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
            '<div class="r19-block-title"><span>\uD83D\uDCCA \u0645\u0637\u0627\u0644\u0639\u0647\u0654 \u0627\u0648\u0644\u06CC\u0647</span></div>' +
            '<div class="r19-empty-inline">\u0647\u0646\u0648\u0632 \u0627\u062A\u0635\u0627\u0644\u06CC \u0628\u06CC\u0646 \u06A9\u062A\u0627\u0628 \u0648 \u062F\u0648\u0631 \u062B\u0628\u062A \u0646\u0634\u062F\u0647.</div>' +
        '</div>';
    }

    var byBook = {};
    enrolls.forEach(function (e) {
        if (!e) return;
        if (!byBook[e.bookId]) byBook[e.bookId] = [];
        byBook[e.bookId].push(e);
    });

    var bookIds = Object.keys(byBook);
    var html = '<div class="r19-block">' +
        '<div class="r19-block-title">' +
            '<span>\uD83D\uDCCA \u0645\u0637\u0627\u0644\u0639\u0647\u0654 \u0627\u0648\u0644\u06CC\u0647</span>' +
            '<span class="r19-block-count">' + _fa(bookIds.length) + '</span>' +
        '</div>' +
        '<div class="r19-block-hint">\u0645\u06CC\u0632\u0627\u0646 \u0635\u0641\u062D\u0627\u062A\u06CC \u06A9\u0647 \u0627\u0632 \u0642\u0628\u0644 \u062E\u0648\u0646\u062F\u0647 \u0628\u0648\u062F\u06CC \u2014 \u0628\u0631\u0627\u06CC \u0647\u0631 \u06A9\u062A\u0627\u0628 \u0628\u0647\u200C\u0635\u0648\u0631\u062A \u0645\u0633\u062A\u0642\u0644.</div>' +
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

        // Primary enrollment for editing
        var primaryEnr = bookEnrolls.find(function(e){ return e && e.initialStudyBaseline; }) || bookEnrolls[0];
        var editBtn = primaryEnr ? '<button type="button" class="r21-bl-edit" data-r19-dash-edit-baseline="' + _esc(primaryEnr.id) + '">\uD83D\uDCDD \u0648\u06CC\u0631\u0627\u06CC\u0634</button>' : '';

        html += '<div class="r19-bl-row" data-r19-bl-book="' + _esc(bid) + '">' +
            '<div class="r19-bl-row-head">' +
                '<span class="r19-bl-row-title">' + _esc(b.title) + '</span>' +
                '<span class="r19-bl-row-pct">' + _fa(pct) + '\u066A</span>' +
            '</div>' +
            '<div class="r19-bl-row-bar"><div class="r19-bl-row-fill" style="width:' + pct + '%"></div></div>' +
            '<div class="r21-bl-row-foot">' +
                '<span class="r19-bl-row-meta">' + _fa(baselineSum) + ' \u0627\u0632 ' + _fa(b.totalPages || 0) + ' \u0635\u0641\u062D\u0647' +
                    (hasBaseline ? '' : ' \u2014 <em>\u0647\u0646\u0648\u0632 \u062B\u0628\u062A \u0646\u0634\u062F\u0647</em>') +
                '</span>' +
                editBtn +
            '</div>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
}

  /* ─── TAB: تنظیمات ─── */
  var _MANAGE_TAB_KEY = "internship-os.residency.manage-tab.v1";
var _MANAGE_TABS = [
    { id: "plans",    icon: "\uD83D\uDCCB", label: "\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0647\u0627" },
    { id: "subjects", icon: "\uD83D\uDCDA", label: "\u0645\u0648\u0636\u0648\u0639\u200C\u0647\u0627" },
    { id: "books",    icon: "\uD83D\uDCD6", label: "\u06A9\u062A\u0627\u0628\u200C\u0647\u0627" },
    { id: "rounds",   icon: "\uD83D\uDCC5", label: "\u062F\u0648\u0631\u0647\u200C\u0647\u0627" },
    { id: "settings", icon: "\u2699\uFE0F", label: "\u062A\u0646\u0637\u06CC\u0645\u0627\u062A" }
];
function _getManageTab() {
    try {
        var v = localStorage.getItem(_MANAGE_TAB_KEY);
        if (v && _MANAGE_TABS.some(function (t) { return t.id === v; })) return v;
    } catch (e) {}
    return "plans";
}
function _setManageTab(v) {
    try { localStorage.setItem(_MANAGE_TAB_KEY, v); } catch (e) {}
}

function _renderSettingsTab(rs) {
    var active = _getManageTab();
    var html = "";
    html += _renderHeader(rs);
    html += _renderManageTabsBar(active);
    html += '<div class="r21-manage-content">';
    if (active === "plans")          html += _renderManagePlans(rs);
    else if (active === "subjects")  html += _renderManageSubjects(rs);
    else if (active === "books")     html += _renderManageBooks(rs);
    else if (active === "rounds")    html += _renderManageRounds(rs);
    else if (active === "settings")  html += _renderManageSettings(rs);
    html += '</div>';
    return html;
}

function _renderManageTabsBar(active) {
    var html = '<div class="r21-manage-tabs" role="tablist" aria-label="\u0628\u062E\u0634\u200C\u0647\u0627\u06CC \u0645\u062F\u06CC\u0631\u06CC\u062A">';
    _MANAGE_TABS.forEach(function (t) {
        var isActive = (t.id === active);
        html += '<button type="button" class="r21-manage-tab' + (isActive ? " is-active" : "") + '" role="tab" data-r21-manage-tab="' + t.id + '" aria-selected="' + (isActive ? "true" : "false") + '">' +
            '<span class="r21-manage-tab-icon" aria-hidden="true">' + t.icon + '</span>' +
            '<span class="r21-manage-tab-label">' + t.label + '</span>' +
        '</button>';
    });
    html += '</div>';
    return html;
}

function _renderManagePlans(rs) {
    var html = "";
    html += '<div class="r21-manage-hero">' +
        '<span class="r21-manage-hero-icon" aria-hidden="true">\uD83E\uDDD9</span>' +
        '<div class="r21-manage-hero-body">' +
            '<div class="r21-manage-hero-title">\u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u062C\u062F\u06CC\u062F</div>' +
            '<div class="r21-manage-hero-desc">\u0628\u0627 \u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0642\u062F\u0645\u200C\u0628\u0647\u200C\u0642\u062F\u0645\u060C \u0628\u0631\u0646\u0627\u0645\u0647\u060C \u06A9\u062A\u0627\u0628\u200C\u0647\u0627 \u0648 \u062F\u0648\u0631\u0647\u200C\u0647\u0627\u062A \u0631\u0648 \u0628\u0633\u0627\u0632.</div>' +
        '</div>' +
        '<button type="button" class="r21-manage-hero-btn" data-r19-dash-new-plan>\u0634\u0631\u0648\u0639</button>' +
    '</div>';
    html += _renderPlansSection(rs);
    return html;
}

function _renderManageSubjects(rs) {
    return _renderSubjectsSection(rs);
}

function _renderManageBooks(rs) {
    var books = (rs.books || []);
    var subjects = (rs.subjects || []);
    var subjMap = {};
    subjects.forEach(function (s) { if (s) subjMap[s.id] = s; });
    var multiPlan = (rs.plans || []).length > 1;

    var html = '<div class="r19-dash-section">' +
        '<div class="r19-dash-section-head">' +
            '<div class="r19-dash-section-title">\uD83D\uDCD6 \u06A9\u062A\u0627\u0628\u200C\u0647\u0627 (' + _fa(books.length) + ')</div>' +
            '<div class="r19-dash-section-actions">' +
                '<button class="r19-btn r19-btn-ghost-sm" type="button" data-r19-dash-manage-enroll>\uD83D\uDD17 \u0627\u062A\u0635\u0627\u0644\u200C\u0647\u0627</button>' +
                '<button class="r19-btn r19-btn-add-sm" type="button" data-r19-dash-add-book>\u2795 \u0627\u0641\u0632\u0648\u062F\u0646</button>' +
            '</div>' +
        '</div>';

    if (books.length === 0) {
        html += '<div class="r19-dash-empty-sm">\u0647\u0646\u0648\u0632 \u06A9\u062A\u0627\u0628\u06CC \u0627\u0636\u0627\u0641\u0647 \u0646\u06A9\u0631\u062F\u06CC.</div>';
    } else {
        html += '<div class="r21-manage-books-grid">';
        books.forEach(function (b) {
            if (!b) return;
            var subj = subjMap[b.subjectId];

            // Enrollments → round chips
            var bookEnrolls = (rs.enrollments || []).filter(function(e){ return e && e.bookId === b.id; });
            var seenRounds = {};
            var roundChips = [];
            bookEnrolls.forEach(function(e) {
                if (seenRounds[e.roundId]) return;
                seenRounds[e.roundId] = true;
                var round = (rs.rounds || []).find(function(r){ return r && r.id === e.roundId; });
                if (!round) return;
                var label = round.title;
                if (multiPlan) {
                    var roundPlan = (rs.plans || []).find(function(p){ return p && p.id === round.planId; });
                    if (roundPlan) label = roundPlan.title + " · " + round.title;
                }
                roundChips.push(label);
            });

            var chipsHTML = "";
            if (roundChips.length > 0) {
                var visible = roundChips.slice(0, 2);
                chipsHTML = '<div class="r21-manage-book-rounds">' +
                    '<span class="r21-manage-book-rounds-label">\u062F\u0648\u0631:</span>' +
                    visible.map(function(c){ return '<span class="r21-manage-book-round-chip">' + _esc(c) + '</span>'; }).join("") +
                    (roundChips.length > 2 ? '<span class="r21-manage-book-round-chip is-more">+' + _fa(roundChips.length - 2) + '</span>' : '') +
                '</div>';
            } else {
                chipsHTML = '<div class="r21-manage-book-rounds is-empty"><span class="r21-manage-book-rounds-label">\u0647\u0646\u0648\u0632 \u0628\u0647 \u062F\u0648\u0631\u06CC \u0648\u0635\u0644 \u0646\u0634\u062F\u0647</span></div>';
            }

            html += '<div class="r21-manage-book-card">' +
                '<div class="r21-manage-book-title" title="' + _esc(b.title) + '">' + _esc(b.title) + '</div>' +
                '<div class="r21-manage-book-meta">' +
                    '<span class="r21-manage-book-subject">' + _esc(subj ? subj.title : "\u2014") + '</span>' +
                    '<span class="r21-manage-book-pages">' + _fa(b.totalPages || 0) + ' \u0635</span>' +
                '</div>' +
                chipsHTML +
                '<div class="r21-manage-book-actions">' +
                    '<button class="r19-mini" type="button" data-r19-dash-edit-book="' + _esc(b.id) + '" title="\u0648\u06CC\u0631\u0627\u06CC\u0634">\u270F\uFE0F</button>' +
                    '<button class="r19-mini is-warn" type="button" data-r19-dash-delete-book="' + _esc(b.id) + '" title="\u062D\u0630\u0641">\uD83D\uDDD1\uFE0F</button>' +
                '</div>' +
            '</div>';
        });
        html += '</div>';
    }
    html += '</div>';
    return html;
}

function _renderManageRounds(rs) {
    var html = "";
    var planId = rs.meta && rs.meta.activePlanId;
    html += _renderTimelineGraphic(rs, planId);
    html += _renderRoundsSection(rs);
    return html;
}

function _renderManageSettings(rs) {
    var html = "";

    // Reading strategy
    html += _renderReadingStrategyCard(rs);

    // Study hours — editable
    var dc = (rs.settings && rs.settings.defaultCapacity) || {};
    var hmap = { normal: "\u0639\u0627\u062F\u06CC", free: "\u062A\u0639\u0637\u06CC\u0644", preShift: "\u0642\u0628\u0644 \u06A9\u0634\u06CC\u06A9", shift: "\u06A9\u0634\u06CC\u06A9", postShift: "\u0628\u0639\u062F \u06A9\u0634\u06CC\u06A9" };
    var rows = "";
    ["normal","free","preShift","shift","postShift"].forEach(function (k) {
        var mins = (typeof dc[k] === "number") ? dc[k] : 0;
        var hours = Math.round(mins / 60 * 10) / 10;
        rows += '<div class="r21-manage-settings-row">' +
            '<span class="r21-manage-settings-label">' + hmap[k] + '</span>' +
            '<input type="text" inputmode="decimal" class="r21-manage-settings-input" data-r21-cap-input="' + k + '" value="' + hours + '" min="0" max="16" step="0.5">' +
            '<span class="r21-manage-settings-unit">\u0633\u0627\u0639\u062A</span>' +
        '</div>';
    });
    html += '<div class="r19-block">' +
        '<div class="r19-block-title"><span>\u23F0 \u0633\u0627\u0639\u062A\u200C\u0647\u0627\u06CC \u0645\u0637\u0627\u0644\u0639\u0647</span></div>' +
        '<div class="r19-block-hint">\u0632\u0645\u0627\u0646 \u0645\u0637\u0627\u0644\u0639\u0647\u0654 \u0647\u0631 \u0646\u0648\u0639 \u0631\u0648\u0632 \u0631\u0648 \u0645\u0634\u062E\u0635 \u06A9\u0646. \u0628\u0639\u062F \u0627\u0632 \u0630\u062E\u06CC\u0631\u0647\u060C \u0628\u0631\u0627\u06CC \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u067E\u06CC\u0627\u0645 \u062F\u0631\u06CC\u0627\u0641\u062A \u0645\u06CC\u200C\u06A9\u0646\u06CC.</div>' +
        '<div class="r21-manage-settings-list">' + rows + '</div>' +
        '<button type="button" class="r21-manage-settings-save" data-r21-cap-save>\uD83D\uDCBE \u0630\u062E\u06CC\u0631\u0647\u0654 \u0633\u0627\u0639\u062A\u200C\u0647\u0627</button>' +
    '</div>';

    // Baseline cards (with edit button)
    html += _renderBaselineCardsForSettings(rs);

    return html;
}

  /* ─── امروز چی بخونم؟ (بخش جدید) ─── */
  function _renderTodayStudyRec(rs) {
    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    if (!today) return "";

    var planned = (rs.activities || []).filter(function (a) {
        return a && a.plannedDate === today && (a.status === "planned" || a.status === "in_progress");
    });
    var done = (rs.activities || []).filter(function (a) {
        return a && a.plannedDate === today && a.status === "completed";
    });

    if (planned.length === 0 && done.length === 0) {
        return '<div class="r21-today-study is-empty">' +
            '<div class="r21-study-empty-icon" aria-hidden="true">\uD83D\uDCDA</div>' +
            '<div class="r21-study-empty-title">\u0627\u0645\u0631\u0648\u0632 \u0641\u0639\u0627\u0644\u06CC\u062A \u0645\u0637\u0627\u0644\u0639\u0647\u200C\u0627\u06CC \u0646\u062F\u0627\u0631\u06CC</div>' +
            '<div class="r21-study-empty-hint">\u0627\u0632 \u062A\u0628 \u00AB\u0628\u0631\u0646\u0627\u0645\u0647\u00BB \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u0628\u0631\u0627\u06CC \u0627\u0645\u0631\u0648\u0632 \u0648 \u0631\u0648\u0632\u0647\u0627\u06CC \u0622\u06CC\u0646\u062F\u0647 \u0628\u0631\u0646\u0627\u0645\u0647 \u062A\u0648\u0644\u06CC\u062F \u06A9\u0646\u06CC.</div>' +
        '</div>';
    }

    function _sortKey(a) {
        var t = (a.plannedStartTime && /^\d{1,2}:\d{2}$/.test(a.plannedStartTime)) ? a.plannedStartTime : "99:99";
        return t + "|" + String(a.plannedPageStart || 0).padStart(6, "0");
    }

    var all = planned.concat(done).slice().sort(function (a, b) {
        return _sortKey(a).localeCompare(_sortKey(b));
    });

    // session numbering per book (real time order)
    var _bookGroups = {};
    all.forEach(function (a) {
        if (!a.bookId) { a._sessionIdx = 1; a._sessionTotal = 1; return; }
        if (!_bookGroups[a.bookId]) _bookGroups[a.bookId] = [];
        _bookGroups[a.bookId].push(a);
    });
    Object.keys(_bookGroups).forEach(function (bid) {
        var grp = _bookGroups[bid];
        grp.forEach(function (a, i) {
            a._sessionIdx = i + 1;
            a._sessionTotal = grp.length;
        });
    });

    var plannedSorted = all.filter(function (a) { return a.status !== "completed"; });
    var doneSorted = all.filter(function (a) { return a.status === "completed"; });

    function _renderItem(a, isDone) {
        var book = (rs.books || []).find(function (b) { return b && b.id === a.bookId; });
        var bookTitle = book ? book.title : "\u2014";
        var subject = book ? (rs.subjects || []).find(function (s) { return s && s.id === book.subjectId; }) : null;
        var subjectIcon = subject ? (subject.icon || "\uD83D\uDCD6") : "\uD83D\uDCD6";

        var pages = "";
        if (typeof a.plannedPageStart === "number" && typeof a.plannedPageEnd === "number") {
            pages = "\u0635 " + _fa(a.plannedPageStart) + "\u2013" + _fa(a.plannedPageEnd);
        } else if (a.plannedPages) {
            pages = _fa(a.plannedPages) + " \u0635";
        }

        var dur = a.plannedDurationMinutes ? (_fa(a.plannedDurationMinutes) + " \u062F") : "";
        var timeStr = "";
        if (a.plannedStartTime && /^\d{1,2}:\d{2}$/.test(a.plannedStartTime)) {
            timeStr = _fa(a.plannedStartTime);
        }
        var metaParts = [timeStr, dur].filter(Boolean);
        var meta = metaParts.join(" \u00B7 ");

        var sessionLabel = "";
        if (a._sessionTotal > 1) {
            sessionLabel = "\u062C\u0644\u0633\u0647 " + _fa(a._sessionIdx) + " \u0627\u0632 " + _fa(a._sessionTotal);
        }

        var statusBadge = "";
        if (isDone) statusBadge = '<span class="r21-study-badge is-done" title="\u0627\u0646\u062C\u0627\u0645 \u0634\u062F">\u2713</span>';
        else if (a.status === "in_progress") statusBadge = '<span class="r21-study-badge is-progress" title="\u062F\u0631 \u062C\u0631\u06CC\u0627\u0646">\u25CF</span>';

        var cls = "r21-study-item" + (isDone ? " is-done" : "");

        return '<li class="' + cls + '" tabindex="0">' +
            '<div class="r21-study-icon" aria-hidden="true">' + _esc(subjectIcon) + '</div>' +
            '<div class="r21-study-main">' +
                '<div class="r21-study-title-row">' +
                    '<span class="r21-study-title">' + _esc(bookTitle) + '</span>' +
                    (pages ? '<span class="r21-study-pages">' + pages + '</span>' : '') +
                '</div>' +
                (meta ? '<div class="r21-study-meta">' + meta + '</div>' : '') +
            '</div>' +
            '<div class="r21-study-side">' +
                (sessionLabel ? '<span class="r21-study-session">' + sessionLabel + '</span>' : '') +
                statusBadge +
            '</div>' +
        '</li>';
    }

    var plannedHTML = plannedSorted.map(function (a) { return _renderItem(a, false); }).join("");
    var doneHTML = doneSorted.map(function (a) { return _renderItem(a, true); }).join("");

    var countLabel;
    if (doneSorted.length > 0 && plannedSorted.length > 0) {
        countLabel = _fa(plannedSorted.length) + " \u0628\u0627\u0642\u06CC\u200C\u0645\u0627\u0646\u062F\u0647 \u00B7 " + _fa(doneSorted.length) + " \u0627\u0646\u062C\u0627\u0645\u200C\u0634\u062F\u0647";
    } else if (doneSorted.length > 0) {
        countLabel = _fa(doneSorted.length) + " \u0627\u0646\u062C\u0627\u0645\u200C\u0634\u062F\u0647";
    } else {
        countLabel = _fa(plannedSorted.length) + " \u0641\u0639\u0627\u0644\u06CC\u062A";
    }

    return '<div class="r21-today-study">' +
        '<div class="r21-study-head">' +
            '<span class="r21-study-head-icon" aria-hidden="true">\uD83D\uDCDA</span>' +
            '<span class="r21-study-head-title">\u0627\u0645\u0631\u0648\u0632 \u0686\u06CC \u0628\u062E\u0648\u0646\u0645\u061F</span>' +
            '<span class="r21-study-head-count">' + countLabel + '</span>' +
        '</div>' +
        '<ul class="r21-study-list">' + plannedHTML + doneHTML + '</ul>' +
    '</div>';
}

  /* ═══ Phase 8: Replan Banner with reasons ═══ */
  function _getDisplayReasons(st, planId) {
    // DISPLAY-ONLY filter. Does NOT touch st.reasons or Replan operations.
    // Replan UI uses RT.getStatus() independently and is unaffected.
    if (!st || !Array.isArray(st.reasons)) return [];
    var hiddenList = [];
    try {
        hiddenList = JSON.parse(localStorage.getItem("internship-os.residency.replan-hidden-triggers.v1." + planId) || "[]") || [];
    } catch (e) { hiddenList = []; }
    return st.reasons.filter(function (r) { return r && r.id && hiddenList.indexOf(r.id) === -1; });
}
function _renderReplanBanner(rs, opts) {
    opts = opts || {};
    var showCTA = opts.showCTA !== false;
    var activePlanId = rs.meta && rs.meta.activePlanId;
    if (!activePlanId) return "";
    try {
        var RT = R.replanTrigger;
        if (!RT || !RT.getStatus) return "";
        var st = RT.getStatus(activePlanId);
        if (!st || !st.needed) return "";

        var dismissKey = "internship-os.residency.replan-dismissed.v1." + activePlanId;
        var lastTriggerAt = st.lastTriggeredAt || 0;
        var dismissedAt = 0;
        try { dismissedAt = parseInt(localStorage.getItem(dismissKey), 10) || 0; } catch (e) {}
        if (dismissedAt > 0 && dismissedAt >= lastTriggerAt) return "";

        var collapsed = false;
        try { collapsed = localStorage.getItem("internship-os.residency.replan-collapsed.v1." + activePlanId) === "1"; } catch (e) {}

        var s = _state();
        var taskById = {};
        if (s && Array.isArray(s.tasks)) {
            s.tasks.forEach(function (t) { if (t && t.id) taskById[t.id] = t; });
        }

        function _renderItem(r) {
            var ev = (r.events && r.events.length > 0) ? r.events[r.events.length - 1] : null;
            var desc = (RT && RT.describeEvent) ? RT.describeEvent(ev) : (r.reason || r.type || "تغییر");
            var isOrphan = (r.sourceType === "task" && r.sourceId && !taskById[r.sourceId]);
            var badge = isOrphan
                ? '<button type="button" class="r21-trigger-uncertain" data-r21-trigger-info="' + _esc(r.id || "") + '" aria-label="توضیح">؟</button>'
                : "";
            return '<li class="r21-trigger-item">' +
                '<span class="r21-trigger-bullet" aria-hidden="true">•</span>' +
                '<span class="r21-trigger-text">' + _esc(desc) + '</span>' +
                badge +
            '</li>';
        }

        var displayReasons = _getDisplayReasons(st, activePlanId);
        if (displayReasons.length === 0) return "";

        var visible = displayReasons.slice(0, 3);
        var rest = displayReasons.slice(3);
        var visibleHTML = visible.map(_renderItem).join("");
        var restHTML = rest.map(_renderItem).join("");
        var restWrap = rest.length > 0
            ? '<div class="r21-trigger-rest" style="display:none">' + restHTML + '</div>'
            : "";
        var moreBtn = rest.length > 0
            ? '<button type="button" class="r21-trigger-more" data-r21-trigger-expand="1">+ ' + _fa(rest.length) + ' تغییر دیگر</button>'
            : "";

        var bannerCls = "r21-trigger-banner" + (collapsed ? " is-collapsed" : "");

        return '<div class="' + bannerCls + '" data-r21-trigger-banner data-r21-plan-id="' + _esc(activePlanId) + '">' +
            '<div class="r21-trigger-head">' +
                '<button type="button" class="r21-trigger-toggle" data-r21-trigger-collapse="1" aria-label="جمع کردن" aria-expanded="' + (collapsed ? "false" : "true") + '">' +
                    '<span class="r21-trigger-chevron" aria-hidden="true">▾</span>' +
                '</button>' +
                '<span class="r21-trigger-icon" aria-hidden="true">🔄</span>' +
                '<span class="r21-trigger-title">' + _fa(displayReasons.length) + ' تغییر روی برنامه اثر گذاشته</span>' +
                '<button type="button" class="r21-trigger-dismiss" data-r21-trigger-dismiss="1" aria-label="بستن بنر">✕</button>' +
            '</div>' +
            '<ul class="r21-trigger-list">' + visibleHTML + restWrap + '</ul>' +
            moreBtn +
            (showCTA
                ? '<div class="r21-trigger-actions">' +
                    '<button type="button" class="r21-trigger-cta" data-r19-open-replan="1">بررسی و اصلاح</button>' +
                  '</div>'
                : '') +
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

    var today = (LIB && LIB.date) ? LIB.date.todayJalaliString() : "";
    if (!today) return "";

    var st = _state();
    if (!st) return "";

    var html = '<div class="r21-today-grid">';

    try {
        var ctx = R.calendar && R.calendar.getResidencyDayContext
            ? R.calendar.getResidencyDayContext(today, activePlanId)
            : null;
        if (ctx) {
            var productive = ctx.finalCapacityMinutes || 0;

            var plannedMin = 0;
            (rs.activities || []).forEach(function (a) {
                if (!a) return;
                if (a.plannedDate !== today) return;
                if (a.status === "planned" || a.status === "in_progress") {
                    plannedMin += (a.plannedDurationMinutes || 0);
                }
            });

            var otherMin = 0;
            (st.tasks || []).forEach(function (t) {
                if (!t) return;
                if (t.completed) return;
                if (t.cancelled === true) return;  /* [PATCH:issue-104] */
                if (t.date !== today) return;
                if (t.sourceType === "residency_activity") return;
                if (t._sleepAuto) return;
                if (!(t.durationMinutes > 0)) return;
                otherMin += t.durationMinutes;
            });

            var usedMin = plannedMin + otherMin;
            var remaining = Math.max(0, productive - usedMin);
            var pctRemaining = productive > 0 ? Math.round(remaining / productive * 100) : 0;
            if (pctRemaining < 0) pctRemaining = 0;
            if (pctRemaining > 100) pctRemaining = 100;

            // Full-plan state: everything planned, nothing wasted, nothing left
            var isFullPlan = (productive > 0 && remaining === 0 && plannedMin >= productive && otherMin === 0);
            var isDonePlan = (productive > 0 && remaining === 0 && plannedMin > 0 && otherMin > 0 && plannedMin >= 5);

            var fmt = function (m) {
                var h = Math.floor(m / 60), mm = m % 60;
                return _fa(h) + ":" + _fa(String(mm).padStart(2, "0"));
            };

            var circ = 264;
            var offset = Math.round(circ * (1 - pctRemaining / 100));

            var ringCls = "r21-capacity-ring";
            var centerVal = fmt(remaining);
            var centerUnit = "آزاد";
            var ratioNum = _fa(pctRemaining) + "٪";
            var ratioLbl = "ظرفیت آزاد برای برنامه‌ریزی جدید";
            var hint = "";

            if (productive <= 0) {
                ringCls += " is-empty";
                hint = "امروز ظرفیت مطالعه نداری (کشیک، تعطیل، یا تنظیمات).";
            } else if (isFullPlan) {
                ringCls += " is-complete";
                centerVal = "✓";
                centerUnit = "کامل";
                ratioNum = _fa(100) + "٪";
                ratioLbl = "برنامه‌ریزی کامل — ظرفیت امروزت پر شده";
                hint = "کل ظرفیت مطالعه امروزت با فعالیت‌های برنامه‌ریزی‌شده پر شده. آفرین!";
            } else if (isDonePlan) {
                ringCls += " is-partial";
                hint = "بخشی از ظرفیت امروز با کارهای زمان‌دار گرفته شده.";
            } else {
                if (pctRemaining < 30) ringCls += " is-critical";
                else if (pctRemaining < 60) ringCls += " is-low";
                if (remaining === 0 && plannedMin > 0) {
                    hint = "کل ظرفیت مطالعه امروزت برنامه‌ریزی شده.";
                } else if (otherMin > 0) {
                    var hh = Math.floor(otherMin / 60), mm2 = otherMin % 60;
                    var lbl = (hh > 0 && mm2 > 0) ? (hh + " ساعت و " + mm2 + " دقیقه")
                              : (hh > 0 ? (hh + " ساعت") : (mm2 + " دقیقه"));
                    hint = lbl + " از ظرفیت امروزت با کارهای زمان‌دار گرفته شده.";
                }
            }

            html += '<div class="r21-capacity-card' + (isFullPlan ? ' is-complete' : '') + '">' +
                '<div class="r21-capacity-label">⏱️ ظرفیت امروز</div>' +
                '<div class="r21-capacity-main">' +
                    '<div class="' + ringCls + '">' +
                        '<svg viewBox="0 0 100 100" class="r21-capacity-ring-svg" aria-hidden="true">' +
                            '<circle class="r21-cap-ring-bg" cx="50" cy="50" r="42" />' +
                            '<circle class="r21-cap-ring-fg" cx="50" cy="50" r="42" stroke-dasharray="' + circ + '" stroke-dashoffset="' + (isFullPlan ? 0 : offset) + '" />' +
                        '</svg>' +
                        '<div class="r21-capacity-ring-center">' +
                            '<div class="r21-capacity-ring-val' + (isFullPlan ? ' is-check' : '') + '">' + centerVal + '</div>' +
                            '<div class="r21-capacity-ring-unit">' + centerUnit + '</div>' +
                        '</div>' +
                    '</div>' +
                    '<div class="r21-capacity-summary">' +
                        '<div class="r21-capacity-ratio-num">' + ratioNum + '</div>' +
                        '<div class="r21-capacity-ratio-lbl">' + ratioLbl + '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="r21-capacity-breakdown">' +
                    '<div class="r21-capacity-row"><span>ظرفیت مطالعه' + _tipIcon("سهم مطالعه امروزت (بعد از احتیاط).") + '</span><span>' + fmt(productive) + '</span></div>' +
                    '<div class="r21-capacity-row"><span>برنامه‌ریزی‌شده' + _tipIcon("مجموع زمان فعالیت‌های مطالعه‌ی امروز.") + '</span><span>' + fmt(plannedMin) + '</span></div>' +
                    (otherMin > 0 ? '<div class="r21-capacity-row"><span>کارهای دیگر' + _tipIcon("زمان تسک‌های غیرمطالعه (خواب خودکار و فعالیت‌های رزیدنتی جدا شمرده می‌شوند).") + '</span><span>' + fmt(otherMin) + '</span></div>' : '') +
                '</div>' +
                (hint ? '<div class="r21-capacity-hint">' + _esc(hint) + '</div>' : '') +
            '</div>';
        }
    } catch (e) { console.warn("[capacity]", e); }

    try {
        var AE = R.availabilityEngine;
        if (AE && AE.findFreeWindowsFromState) {
            var windows = AE.findFreeWindowsFromState(today, st, { minWindowMinutes: 30 });
            var listHTML;
            if (windows.length === 0) {
                listHTML = '<div class="r21-windows-empty">امروز پنجره‌ی آزاد قابل استفاده‌ای نداری.</div>';
            } else {
                var _renderWin = function (w) {
                    return '<div class="r21-window-row">' +
                        '<span class="r21-window-time">' + _fa(w.start) + '–' + _fa(w.end) + '</span>' +
                        '<span class="r21-window-dur">' + _fa(w.minutes) + ' دقیقه</span>' +
                    '</div>';
                };
                var visibleW = windows.slice(0, 4);
                var restW = windows.slice(4);
                listHTML = visibleW.map(_renderWin).join("");
                if (restW.length > 0) {
                    listHTML += '<div class="r21-windows-rest" style="display:none">' + restW.map(_renderWin).join("") + '</div>';
                    listHTML += '<button type="button" class="r21-windows-more" data-r21-windows-expand="1">+ ' + _fa(restW.length) + ' پنجره دیگر</button>';
                }
            }
            html += '<div class="r21-windows-card">' +
                '<div class="r21-windows-label">🪟 پنجره‌های آزاد</div>' +
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
      b.addEventListener("click", function () {
        if (R.residencySetup && typeof R.residencySetup.openWizard === "function") {
          try { R.residencySetup.openWizard(); return; } catch (e) { console.warn("[r2h8 wizard]", e); }
        }
        if (R.residencyManagers) R.residencyManagers.openPlanManager();
      });
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
    _wireR21Cta(container);
    _wireProgramTab(container);
    _wireR21Today(container);
    _wireProgRoundFilter(container);
    _wireManageTabs(container);
    _wireManageSettings(container);
  }

  function _wireR21Cta(container) {
    if (!container) return;
    container.querySelectorAll("[data-r21-cta]").forEach(function (b) {
        b.addEventListener("click", function () {
            var kind = b.getAttribute("data-r21-cta");
            var s = _state();
            var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;

            if (kind === "setup") {
                if (R.residencySetup && R.residencySetup.openWizard) {
                    try { R.residencySetup.openWizard(); } catch (e) {}
                } else if (R.residencyManagers) {
                    R.residencyManagers.openPlanManager();
                }
            } else if (kind === "activate") {
                if (R.residencyManagers) R.residencyManagers.openPlanManager();
            } else if (kind === "complete-setup") {
                _goToTab("manage");
            } else if (kind === "generate") {
                if (R.plannerUI && R.plannerUI.open) R.plannerUI.open(pid);
            } else if (kind === "planner") {
                if (R.plannerUI && R.plannerUI.open) R.plannerUI.open(pid);
            } else if (kind === "plan-idle") {
                _goToTab("program");
            } else if (kind === "done") {
                _goToTab("program");
            } else if (kind === "ready") {
                var el = container.querySelector(".r21-today-study");
                if (el && el.scrollIntoView) el.scrollIntoView({ behavior: "smooth", block: "start" });
            } else if (kind === "replan") {
                if (R.plannerReplanUI && R.plannerReplanUI.open) R.plannerReplanUI.open(pid);
            } else if (kind === "workspace") {
                if (R.plannerWorkspace && R.plannerWorkspace.open) R.plannerWorkspace.open();
            }
        });
    });
}

function _wireManageSettings(container) {
    if (!container) return;
    container.querySelectorAll("[data-r21-rs-select]").forEach(function (sel) {
        sel.addEventListener("change", function () {
            var s = _state();
            if (!s || !s.residency) return;
            var v = sel.value;
            if (!s.residency.settings) s.residency.settings = {};
            if (!s.residency.settings.readingStrategy) s.residency.settings.readingStrategy = {};
            var before = s.residency.settings.readingStrategy.mode || "sequential";
            if (before === v) return;
            s.residency.settings.readingStrategy.mode = v;
            if (window.__os && window.__os.saveState) {
                try { window.__os.saveState(); } catch (e) {}
            }
            try {
                if (R.replanTrigger && R.replanTrigger.notifyChange) {
                    R.replanTrigger.notifyChange("capacity_context_changed", {
                        planId: s.residency.meta.activePlanId,
                        sourceType: "capacity",
                        title: "\u0631\u0648\u0634 \u0645\u0637\u0627\u0644\u0639\u0647 \u062a\u063a\u06cc\u06cc\u0631 \u06a9\u0631\u062f",
                        before: { mode: before },
                        after: { mode: v }
                    });
                }
            } catch (e) {}
            _notify("success", "\u0631\u0648\u0634 \u0645\u0637\u0627\u0644\u0639\u0647 \u0630\u062e\u06cc\u0631\u0647 \u0634\u062f \u2014 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u062a \u0646\u06cc\u0627\u0632 \u0628\u0647 \u0628\u0627\u0632\u0628\u06cc\u0646\u06cc \u062f\u0627\u0631\u062f.");
        });
    });

    container.querySelectorAll("[data-r21-cap-save]").forEach(function (b) {
        b.addEventListener("click", function () {
            var s = _state();
            if (!s || !s.residency) return;
            if (!s.residency.settings) s.residency.settings = {};
            if (!s.residency.settings.defaultCapacity) s.residency.settings.defaultCapacity = {};
            var before = JSON.parse(JSON.stringify(s.residency.settings.defaultCapacity));
            var changed = false;
            container.querySelectorAll("[data-r21-cap-input]").forEach(function (inp) {
                var k = inp.getAttribute("data-r21-cap-input");
                if (!k) return;
                var v = parseFloat(inp.value);
                if (isNaN(v) || v < 0) v = 0;
                if (v > 16) v = 16;
                var newMin = Math.round(v * 60);
                if (s.residency.settings.defaultCapacity[k] !== newMin) {
                    s.residency.settings.defaultCapacity[k] = newMin;
                    changed = true;
                }
            });
            if (!changed) { _notify("info", "تغییری اعمال نشد."); return; }
            if (window.__os && window.__os.saveState) {
                try { window.__os.saveState(); } catch (e) {}
            }
            try {
                if (R.replanTrigger && R.replanTrigger.notifyChange) {
                    R.replanTrigger.notifyChange("capacity_context_changed", {
                        planId: s.residency.meta.activePlanId,
                        sourceType: "capacity",
                        title: "ظرفیت مطالعه تغییر کرد",
                        before: before,
                        after: s.residency.settings.defaultCapacity
                    });
                }
            } catch (e) {}
            _notify("success", "ذخیره شد — برنامه‌ت نیاز به بازبینی دارد. از تب «امروز» یا «برنامه» بررسی کن.");
            var tabBar = container.querySelector(".r21-tabs-bar");
            if (tabBar && tabBar.parentElement) DB.render(tabBar.parentElement);
        });
    });
}

function _wireManageTabs(container) {
    if (!container) return;
    container.querySelectorAll("[data-r21-manage-tab]").forEach(function (b) {
        b.addEventListener("click", function () {
            var v = b.getAttribute("data-r21-manage-tab");
            if (!v) return;
            _setManageTab(v);
            DB.render(container);
        });
    });
}

function _wireProgRoundFilter(container) {
    if (!container) return;
    container.querySelectorAll("[data-r21-round-filter]").forEach(function (b) {
        b.addEventListener("click", function () {
            var v = b.getAttribute("data-r21-round-filter");
            if (!v) return;
            var s = _state();
            var pid = s && s.residency && s.residency.meta ? s.residency.meta.activePlanId : null;
            if (!pid) return;
            _setProgRoundFilter(pid, v);
            DB.render(container);
        });
    });
}

function _wireR21Today(container) {
    if (!container) return;

    container.querySelectorAll("[data-r21-trigger-dismiss]").forEach(function (b) {
        b.addEventListener("click", function () {
            var banner = b.closest("[data-r21-trigger-banner]");
            if (!banner) return;
            var planId = banner.getAttribute("data-r21-plan-id");
            if (!planId) return;
            try { localStorage.setItem("internship-os.residency.replan-dismissed.v1." + planId, String(Date.now())); } catch (e) {}
            banner.style.display = "none";
        });
    });

    container.querySelectorAll("[data-r21-trigger-collapse]").forEach(function (b) {
        b.addEventListener("click", function () {
            var banner = b.closest("[data-r21-trigger-banner]");
            if (!banner) return;
            var planId = banner.getAttribute("data-r21-plan-id");
            if (!planId) return;
            var isCollapsed = banner.classList.toggle("is-collapsed");
            b.setAttribute("aria-expanded", isCollapsed ? "false" : "true");
            try { localStorage.setItem("internship-os.residency.replan-collapsed.v1." + planId, isCollapsed ? "1" : "0"); } catch (e) {}
        });
    });

    container.querySelectorAll("[data-r21-trigger-expand]").forEach(function (b) {
        b.addEventListener("click", function () {
            var banner = b.closest("[data-r21-trigger-banner]");
            if (!banner) return;
            var rest = banner.querySelector(".r21-trigger-rest");
            if (rest) rest.style.display = "";
            b.style.display = "none";
        });
    });

    container.querySelectorAll("[data-r21-windows-expand]").forEach(function (b) {
        b.addEventListener("click", function () {
            var card = b.closest(".r21-windows-card");
            if (!card) return;
            var rest = card.querySelector(".r21-windows-rest");
            if (rest) rest.style.display = "";
            b.style.display = "none";
        });
    });

    container.querySelectorAll("[data-r21-trigger-info]").forEach(function (b) {
        b.addEventListener("click", function () {
            var trigId = b.getAttribute("data-r21-trigger-info");
            _showTriggerExplain(trigId);
        });
    });
}

function _showTriggerExplain(trigId) {
    var s = _state();
    if (!s || !s.residency) return;
    var pid = s.residency.meta && s.residency.meta.activePlanId;
    if (!pid) return;

    var trig = (s.replanTriggers || []).find(function (t) { return t && t.id === trigId; });
    if (!trig) { _notify("info", "\u0627\u06cc\u0646 \u062a\u063a\u06cc\u06cc\u0631 \u062f\u06cc\u06af\u0631 \u0645\u0648\u062c\u0648\u062f \u0646\u06cc\u0633\u062a."); return; }

    var msg = "\u0627\u06cc\u0646 \u062a\u063a\u06cc\u06cc\u0631 \u0627\u0632 \u06cc\u06a9 \u062a\u0633\u06a9 \u0645\u06cc\u200c\u0622\u06cc\u062f \u06a9\u0647 \u062f\u06cc\u06af\u0631 \u062f\u0631 \u062f\u0627\u062f\u0647\u200c\u0647\u0627 \u0648\u062c\u0648\u062f \u0646\u062f\u0627\u0631\u062f.\n\n";
    msg += "\u200c\u0639\u0646\u0648\u0627\u0646 \u062a\u0633\u06a9: " + (trig.title || "\u2014") + "\n";
    msg += "\u200c\u0646\u0648\u0639 \u062a\u063a\u06cc\u06cc\u0631: " + (trig.type || "\u2014") + "\n";
    msg += "\u200c\u062a\u0627\u0631\u06cc\u062e: " + (trig.date || "\u2014") + "\n\n";
    msg += "\u0627\u06cc\u0646 \u062a\u063a\u06cc\u06cc\u0631 \u0627\u062d\u062a\u0645\u0627\u0644\u0627\u064b \u0628\u0631 \u0645\u0637\u0627\u0644\u0639\u0647 \u0627\u062b\u0631\u06cc \u0646\u062f\u0627\u0631\u062f\u060c \u0627\u0645\u0627 \u0628\u0647 \u062f\u0644\u06cc\u0644 \u067e\u0627\u06a9\u200c\u0634\u062f\u0646 \u062a\u0633\u06a9 \u0642\u0627\u0628\u0644 \u0627\u062b\u0628\u0627\u062a \u0646\u06cc\u0633\u062a.\n";
    msg += "\u0645\u06cc\u200c\u062a\u0648\u0627\u0646\u06cc \u0627\u06cc\u0646 \u0628\u0646\u0631 \u0631\u0627 \u0628\u0628\u0646\u062f\u06cc \u06cc\u0627 \u0645\u0633\u06cc\u0631 \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200c\u0631\u06cc\u0632\u06cc \u0631\u0627 \u0628\u0631\u0631\u0633\u06cc \u06a9\u0646\u06cc.";

    _notify("info", msg);

    // conceal this trigger for current session (localStorage)
    try {
        var key = "internship-os.residency.replan-hidden-triggers.v1." + pid;
        var list = [];
        try { list = JSON.parse(localStorage.getItem(key) || "[]") || []; } catch (e) { list = []; }
        if (list.indexOf(trigId) === -1) list.push(trigId);
        localStorage.setItem(key, JSON.stringify(list));
    } catch (e) {}

    var container = document.getElementById("view");
    if (container) DB.render(container);
}

function _goToTab(id) {
    _setActiveTab(id);
    var tabBar = document.querySelector(".r21-tabs-bar");
    if (tabBar && tabBar.parentElement) {
        DB.render(tabBar.parentElement);
    }
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
  /* [R2-B] public test API */
  DB._getActiveTab = _getActiveTab;
  DB._migrateTabId = _migrateTabId;
  DB.TABS = TABS;

  console.log("[residency.dashboard.v19] loaded");
})();