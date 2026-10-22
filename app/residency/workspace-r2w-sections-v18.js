/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Workspace Sections v18 (R2-W Product Redesign)
   Four-section shell: Overview / Plan / Review & Change / Analysis
   Additive post-render layer. Wraps WS._postWire.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ws.sections] R missing"); return; }
  var WS = R.plannerWorkspace || R.workspace || null;
  if (!WS) { console.warn("[ws.sections] WS missing"); return; }
  if (WS._r2wSections) { console.log("[ws.sections] already installed"); return; }

  var S = WS._r2wSections = {};
  S.VERSION = "1.0.0";

  var TXT = {
    secOverview:    "\u0646\u0645\u0627\u06CC \u06A9\u0644\u06CC",
    secPlan:        "\u0628\u0631\u0646\u0627\u0645\u0647",
    secReview:      "\u0628\u0627\u0632\u0628\u06CC\u0646\u06CC \u0648 \u062A\u063A\u06CC\u06CC\u0631",
    secAnalysis:    "\u062A\u062D\u0644\u06CC\u0644 \u0648 \u0631\u0627\u0647\u0646\u0645\u0627",
    noPlanTitle:    "\u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0641\u0639\u0627\u0644\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F",
    noPlanDesc:     "\u0627\u06CC\u0646 Workspace \u0645\u0631\u06A9\u0632 \u06A9\u0646\u062A\u0631\u0644 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647 \u0627\u0633\u062A. \u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639\u060C \u0627\u0632 \u0628\u062E\u0634 \u00AB\u0628\u0631\u0646\u0627\u0645\u0647\u00BB \u06CC\u0627 \u0627\u0632 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u06CC\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647 \u0628\u0633\u0627\u0632\u06CC\u062F.",
    statusH:        "\u0648\u0636\u0639\u06CC\u062A \u0628\u0631\u0646\u0627\u0645\u0647",
    attentionH:     "\u0645\u0648\u0627\u0631\u062F \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u062A\u0648\u062C\u0647",
    noIssue:        "\u0645\u0648\u0631\u062F \u0641\u0648\u0631\u06CC\u200C\u0627\u06CC \u0634\u0646\u0627\u0633\u0627\u06CC\u06CC \u0646\u0634\u062F.",
    nextActionH:    "\u0627\u0642\u062F\u0627\u0645 \u0628\u0639\u062F\u06CC",
    planLbl:        "\u0628\u0631\u0646\u0627\u0645\u0647:",
    examLbl:        "\u0622\u0632\u0645\u0648\u0646:",
    roundLbl:       "\u062F\u0648\u0631\u0647\u0654 \u0641\u0639\u0627\u0644:",
    overdueMsg:     "\u0641\u0639\u0627\u0644\u06CC\u062A \u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647 \u2014 \u0642\u0627\u0628\u0644 \u0628\u0631\u0631\u0633\u06CC \u062F\u0631 \u0628\u062E\u0634 \u0628\u0631\u0646\u0627\u0645\u0647",
    proposalMsg:    "\u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC \u0622\u0645\u0627\u062F\u0647\u0654 \u0628\u0631\u0631\u0633\u06CC \u0627\u0633\u062A.",
    triggerMsg:     "\u062A\u063A\u06CC\u06CC\u0631 \u062B\u0628\u062A\u200C\u0634\u062F\u0647 \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC",
    actReview:      "\u0628\u0631\u0631\u0633\u06CC \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC",
    actOverdue:     "\u0645\u0634\u0627\u0647\u062F\u0647\u0654 \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647 \u062F\u0631 \u0628\u0631\u0646\u0627\u0645\u0647",
    actTriggers:    "\u0628\u0631\u0631\u0633\u06CC \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0646\u06CC\u0627\u0632\u0645\u0646\u062F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC",
    actOpenPlan:    "\u0645\u0634\u0627\u0647\u062F\u0647\u0654 \u0628\u0631\u0646\u0627\u0645\u0647",
    noData:         "\u062F\u0627\u062F\u0647 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A."
  };

  function _esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[c]; }); }
  function _fa(n) { return String(n == null ? 0 : n).replace(/[0-9]/g, function (d) { return "\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9".charAt(d - 0); }); }
  function _state() { try { return window.__os && window.__os.getState ? window.__os.getState() : null; } catch (e) { return null; } }
  function _today() {
    try {
      if (window.InternshipLib && typeof window.InternshipLib.todayJalali === "function") return window.InternshipLib.todayJalali();
      if (R.date && typeof R.date.todayJalali === "function") return R.date.todayJalali();
    } catch (e) {}
    return null;
  }

  var _activeSection = "overview";
  var _subTabMap = {
    plan:     ["activities"],
    review:   ["proposal", "reviews"],
    analysis: ["ai", "analytics"]
  };

  function _renderOverview() {
    var s = _state();
    if (!s) return '<div class="r2w-ov-wrap"><div class="r2w-empty">' + _esc(TXT.noData) + '</div></div>';
    var res = s.residency || {};
    var plans = res.plans || [];
    var planId = (res.meta && res.meta.activePlanId) || null;
    var plan = null;
    for (var i = 0; i < plans.length; i++) { if (plans[i].id === planId) { plan = plans[i]; break; } }

    if (!plan) {
      return '<div class="r2w-ov-wrap"><div class="r2w-empty">'
        + '<div class="r2w-empty-title">' + _esc(TXT.noPlanTitle) + '</div>'
        + '<div class="r2w-empty-desc">' + _esc(TXT.noPlanDesc) + '</div>'
        + '</div></div>';
    }

    var today = _today();
    var acts = res.activities || [];
    var overdueCount = 0;
    if (today) {
      for (var j = 0; j < acts.length; j++) {
        var a = acts[j];
        if (a.planId === planId && a.status === "planned" && a.plannedDate && a.plannedDate < today && !a.locked) {
          overdueCount++;
        }
      }
    }

    var pending = null;
    try { pending = WS.getCurrentProposal ? WS.getCurrentProposal() : null; } catch (e) {}

    var trigs = 0;
    var tr = s.replanTriggers || [];
    for (var k = 0; k < tr.length; k++) { if (tr[k] && tr[k].planId === planId) trigs++; }

    var activeRound = null;
    var rounds = res.rounds || [];
    if (today) {
      for (var m = 0; m < rounds.length; m++) {
        var rr = rounds[m];
        if (rr.planId === planId && rr.startDate && rr.endDate && today >= rr.startDate && today <= rr.endDate) {
          activeRound = rr; break;
        }
      }
    }

    var actions = [];
    if (pending) actions.push({ label: TXT.actReview, goto: "review" });
    if (overdueCount > 0) actions.push({ label: TXT.actOverdue, goto: "plan" });
    if (trigs > 0 && !pending) actions.push({ label: TXT.actTriggers, goto: "review" });
    if (actions.length === 0) actions.push({ label: TXT.actOpenPlan, goto: "plan" });

    var h = '<div class="r2w-ov-wrap">';
    h += '<div class="r2w-ov-card">';
    h += '<div class="r2w-ov-h">' + _esc(TXT.statusH) + '</div>';
    h += '<div class="r2w-ov-kv"><span>' + _esc(TXT.planLbl) + '</span><b>' + _esc(plan.title || plan.name || plan.id) + '</b></div>';
    if (plan.examDate) h += '<div class="r2w-ov-kv"><span>' + _esc(TXT.examLbl) + '</span><b>' + _esc(plan.examDate) + '</b></div>';
    if (activeRound) h += '<div class="r2w-ov-kv"><span>' + _esc(TXT.roundLbl) + '</span><b>' + _esc(activeRound.title || activeRound.id) + '</b></div>';
    h += '</div>';

    h += '<div class="r2w-ov-card">';
    h += '<div class="r2w-ov-h">' + _esc(TXT.attentionH) + '</div>';
    if (overdueCount === 0 && !pending && trigs === 0) {
      h += '<div class="r2w-ov-none">' + _esc(TXT.noIssue) + '</div>';
    } else {
      if (overdueCount > 0) h += '<div class="r2w-ov-item r2w-ov-warn"><b>' + _fa(overdueCount) + '</b> ' + _esc(TXT.overdueMsg) + '</div>';
      if (pending) h += '<div class="r2w-ov-item r2w-ov-info">' + _esc(TXT.proposalMsg) + '</div>';
      if (trigs > 0) h += '<div class="r2w-ov-item"><b>' + _fa(trigs) + '</b> ' + _esc(TXT.triggerMsg) + '</div>';
    }
    h += '</div>';

    h += '<div class="r2w-ov-card">';
    h += '<div class="r2w-ov-h">' + _esc(TXT.nextActionH) + '</div>';
    for (var q = 0; q < actions.length; q++) {
      h += '<button class="r2w-ov-act" data-r2w-goto="' + _esc(actions[q].goto) + '">' + _esc(actions[q].label) + '</button>';
    }
    h += '</div>';

    h += '</div>';
    return h;
  }

  function _renderSectionsBar() {
    var secs = [
      { id: "overview", label: TXT.secOverview },
      { id: "plan",     label: TXT.secPlan },
      { id: "review",   label: TXT.secReview },
      { id: "analysis", label: TXT.secAnalysis }
    ];
    var h = '<div class="r2w-sections-bar" data-r2w-sections="1">';
    for (var i = 0; i < secs.length; i++) {
      var sc = secs[i];
      h += '<button class="r2w-sec-btn' + (sc.id === _activeSection ? ' is-active' : '') + '" data-r2w-section="' + sc.id + '">' + _esc(sc.label) + '</button>';
    }
    h += '</div>';
    return h;
  }

  function _renderOverviewContent(o) {
    var cont = o.querySelector(".r2w-overview-content");
    if (!cont) return;
    if (cont.getAttribute("data-r2w-rendered") === "1") return;
    cont.innerHTML = _renderOverview();
    cont.setAttribute("data-r2w-rendered", "1");
  }

  function _syncSectionVisibility(o) {
    var isOverview = _activeSection === "overview";
    var cont = o.querySelector(".r2w-overview-content");
    var tabs = o.querySelector(".pw14-tabs");
    var tabContent = o.querySelector(".pw14-tab-content");
    if (cont) cont.style.display = isOverview ? "block" : "none";
    if (tabs) tabs.style.display = isOverview ? "none" : "flex";
    if (tabContent) tabContent.style.display = isOverview ? "none" : "block";
    if (!isOverview && tabs) {
      var allow = _subTabMap[_activeSection] || [];
      var btns = tabs.querySelectorAll("[data-pw14-tab]");
      for (var i = 0; i < btns.length; i++) {
        var tid = btns[i].getAttribute("data-pw14-tab");
        btns[i].style.display = (allow.indexOf(tid) >= 0) ? "" : "none";
      }
    }
  }

  function _switchSection(o, sectionId) {
    if (!sectionId) return;
    if (["overview", "plan", "review", "analysis"].indexOf(sectionId) === -1) return;
    _activeSection = sectionId;
    var allBtns = o.querySelectorAll(".r2w-sec-btn");
    for (var i = 0; i < allBtns.length; i++) {
      var isOn = allBtns[i].getAttribute("data-r2w-section") === sectionId;
      if (isOn) allBtns[i].classList.add("is-active");
      else allBtns[i].classList.remove("is-active");
    }
    if (sectionId !== "overview") {
      var firstTab = _subTabMap[sectionId][0];
      var tabBtn = o.querySelector('[data-pw14-tab="' + firstTab + '"]');
      if (tabBtn) { try { tabBtn.click(); } catch (e) {} }
      var cont = o.querySelector(".r2w-overview-content");
      if (cont) cont.removeAttribute("data-r2w-rendered");
    } else {
      var c2 = o.querySelector(".r2w-overview-content");
      if (c2) { c2.removeAttribute("data-r2w-rendered"); _renderOverviewContent(o); }
    }
    _syncSectionVisibility(o);
  }

  function _injectSections(o) {
    if (!o) return;
    var tabsBar = o.querySelector(".pw14-tabs");
    if (!tabsBar) return;
    if (!o.querySelector(".r2w-sections-bar")) {
      tabsBar.insertAdjacentHTML("beforebegin", _renderSectionsBar());
      var tc = o.querySelector(".pw14-tab-content");
      if (tc && !o.querySelector(".r2w-overview-content")) {
        tc.insertAdjacentHTML("beforebegin", '<div class="r2w-overview-content"></div>');
      }
      var bar = o.querySelector(".r2w-sections-bar");
      if (bar && !bar.getAttribute("data-r2w-wired")) {
        bar.setAttribute("data-r2w-wired", "1");
        bar.addEventListener("click", function (ev) {
          var t = ev.target;
          while (t && t !== bar) {
            if (t.getAttribute && t.getAttribute("data-r2w-section")) {
              _switchSection(o, t.getAttribute("data-r2w-section")); return;
            }
            t = t.parentNode;
          }
        });
      }
      if (!o.getAttribute("data-r2w-ov-wired")) {
        o.setAttribute("data-r2w-ov-wired", "1");
        o.addEventListener("click", function (ev) {
          var t = ev.target;
          while (t && t !== o) {
            if (t.getAttribute && t.getAttribute("data-r2w-goto")) {
              _switchSection(o, t.getAttribute("data-r2w-goto")); return;
            }
            t = t.parentNode;
          }
        });
      }
    }
    _renderOverviewContent(o);
    _syncSectionVisibility(o);
  }

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    try {
      var o = document.querySelector(".pw14-overlay");
      if (o) _injectSections(o);
    } catch (e) { console.warn("[ws.sections] inject failed", e); }
  };

  S.__tests = function () {
    var out = [];
    function eq(n, a, b) { out.push({ name: n, pass: a === b, got: a, want: b }); }
    var bar = _renderSectionsBar();
    eq("T1: sections bar has 4 buttons", (bar.match(/data-r2w-section=/g) || []).length, 4);
    eq("T2: plan sub-tabs", JSON.stringify(_subTabMap.plan), '["activities"]');
    eq("T3: review sub-tabs", JSON.stringify(_subTabMap.review), '["proposal","reviews"]');
    eq("T4: analysis sub-tabs", JSON.stringify(_subTabMap.analysis), '["ai","analytics"]');
    var h = "";
    try { h = _renderOverview(); } catch (e) { h = "ERR:" + e.message; }
    eq("T5: overview renders without crash", typeof h === "string" && h.length > 0, true);
    eq("T6: overview wrapper present", h.indexOf('r2w-ov-wrap') >= 0, true);
    eq("T7: at least one action or empty state", h.indexOf('data-r2w-goto=') >= 0 || h.indexOf('r2w-empty') >= 0, true);
    var pass = 0; for (var i = 0; i < out.length; i++) if (out[i].pass) pass++;
    return { passed: pass, total: out.length, results: out };
  };

  console.log("[ws.sections] loaded v" + S.VERSION);
})();