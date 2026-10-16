(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[workspace.round-nav.v18] R missing"); return; }
  var WS = R.plannerWorkspace;
  if (!WS) { console.warn("[workspace.round-nav.v18] WS missing"); return; }
  var LIB = window.InternshipLib;

  var _selectedRoundId = null;

  WS.getSelectedRoundId = function () { return _selectedRoundId; };

  // [FIX:v18-fallback] getSelectedPlanId falls back to active plan
  var _origGetSelectedPlanId = WS.getSelectedPlanId;
  WS.getSelectedPlanId = function () {
    var cur = _origGetSelectedPlanId ? _origGetSelectedPlanId() : null;
    if (cur) return cur;
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    return s && s.residency && s.residency.meta ? (s.residency.meta.activePlanId || null) : null;
  };

  // [FIX:v18] public setter for plan
  WS.setSelectedPlan = function (planId) {
    WS._setSelectedPlanId && WS._setSelectedPlanId(planId);
  };

  // Override setFilters so that setting roundId also clamps dates to round
  var _origSetFilters = WS.setFilters;
  WS.setFilters = function (patch) {
    patch = patch || {};
    if (patch.roundId !== undefined) {
      _selectedRoundId = patch.roundId || null;
      if (_selectedRoundId) {
        var round = R.store.getRound(_selectedRoundId);
        if (round) {
          patch.dateFrom = round.startDate;
          patch.dateTo = round.endDate;
        }
      } else {
        // clear round → don't touch dates (user can navigate freely)
      }
    }
    return _origSetFilters(patch);
  };

  WS.setSelectedRound = function (roundId) {
    WS.setFilters({ roundId: roundId || "" });
  };

  WS.listRoundsForPlan = function () {
    var planId = WS.getSelectedPlanId && WS.getSelectedPlanId();
    if (!planId) return [];
    return (R.store.getRoundsForPlan(planId) || []).slice();
  };

  WS.getRoundIndex = function (roundId) {
    var rounds = WS.listRoundsForPlan();
    for (var i = 0; i < rounds.length; i++) {
      if (rounds[i].id === roundId) return i;
    }
    return -1;
  };

  WS.goToPrevRound = function () {
    var rounds = WS.listRoundsForPlan();
    var idx = WS.getRoundIndex(_selectedRoundId);
    if (idx <= 0) return false;
    WS.setSelectedRound(rounds[idx - 1].id);
    return true;
  };

  WS.goToNextRound = function () {
    var rounds = WS.listRoundsForPlan();
    var idx = WS.getRoundIndex(_selectedRoundId);
    if (idx < 0 || idx >= rounds.length - 1) return false;
    WS.setSelectedRound(rounds[idx + 1].id);
    return true;
  };

  WS.clearRoundScope = function () {
    WS.setSelectedRound(null);
  };

  function _replaceExistingRoundSelect() {
    var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (!o) return null;
    var sel = o.querySelector("[data-pw14-round]");
    if (!sel) return null;
    var parent = sel.parentNode;
    var newSel = sel.cloneNode(true);
    parent.replaceChild(newSel, sel);
    newSel.addEventListener("change", function (e) {
      WS.setSelectedRound(e.target.value || null);
    });
    return newSel;
  }

  function _injectRoundNavButtons() {
    var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (!o) return;
    var headerCenter = o.querySelector(".pw14-header-center");
    if (!headerCenter) return;
    if (headerCenter.querySelector(".pw18-round-nav")) return;

    var planId = WS.getSelectedPlanId && WS.getSelectedPlanId();
    if (!planId) return;

    var rounds = WS.listRoundsForPlan();
    if (rounds.length === 0) return;

    // Reconcile selected round with plan
    if (_selectedRoundId && !rounds.some(function (r) { return r.id === _selectedRoundId; })) {
      _selectedRoundId = null;
    }

    var f = WS.getFilters();
    if (f.roundId && f.roundId !== _selectedRoundId) _selectedRoundId = f.roundId;
    else if (!f.roundId) _selectedRoundId = null;

    var idx = WS.getRoundIndex(_selectedRoundId);
    var canPrev = idx > 0;
    var canNext = idx >= 0 && idx < rounds.length - 1;
    var canNextFromNone = rounds.length > 0 && idx === -1;

    var nav = document.createElement("div");
    nav.className = "pw18-round-nav";
    nav.innerHTML =
      '<button class="pw18-round-btn" type="button" data-pw18-prev-round' +
        (canPrev ? "" : " disabled") + ' title="Round قبلی">‹ Round قبل</button>' +
      '<button class="pw18-round-btn" type="button" data-pw18-next-round' +
        ((canNext || canNextFromNone) ? "" : " disabled") + ' title="Round بعدی">Round بعد ›</button>' +
      (idx >= 0
        ? '<button class="pw18-round-btn is-clear" type="button" data-pw18-clear-round title="لغو فیلتر Round">✕ پاک کردن Round</button>'
        : '') +
      (idx >= 0
        ? '<span class="pw18-round-badge">Round ' + (idx + 1) + ' از ' + rounds.length + '</span>'
        : '');

    headerCenter.appendChild(nav);

    var prevBtn = nav.querySelector("[data-pw18-prev-round]");
    if (prevBtn && !prevBtn.disabled) {
      prevBtn.addEventListener("click", function () { WS.goToPrevRound(); });
    }
    var nextBtn = nav.querySelector("[data-pw18-next-round]");
    if (nextBtn && !nextBtn.disabled) {
      nextBtn.addEventListener("click", function () {
        if (idx === -1 && rounds.length > 0) {
          WS.setSelectedRound(rounds[0].id);
        } else {
          WS.goToNextRound();
        }
      });
    }
    var clearBtn = nav.querySelector("[data-pw18-clear-round]");
    if (clearBtn) {
      clearBtn.addEventListener("click", function () { WS.clearRoundScope(); });
    }
  }

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    _replaceExistingRoundSelect();
    _injectRoundNavButtons();
  };

  // Also patch: when plan changes, reset round
  var _origRerender = WS.rerender;
  WS.rerender = function () {
    var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (o) {
      var planSel = o.querySelector("[data-pw14-plan]");
      // Best-effort: if plan changed, round scope may be invalid; post-wire handles reconciliation
    }
    if (typeof _origRerender === "function") _origRerender();
  };

  console.log("[workspace.v18.round-nav] loaded");
})();