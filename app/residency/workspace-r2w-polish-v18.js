/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Workspace R2-W Polish v18
   Additive post-render enhancement layer.
   - Header regrouping (D-04)
   - Activity card secondary menu (D-02)
   - Persian state/source labels (3.2)
   - TimeGrid button injection (D-06)
   - W-43 over-cap visual prominence (D-03/W-43)
   No protected contract is modified.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ws.r2w] R missing"); return; }
  var WS = R.plannerWorkspace;
  if (!WS) { console.warn("[ws.r2w] WS missing"); return; }

  var VERSION = "1.0.0";

  var STATE_FA = {
    completed:   "\u0627\u0646\u062C\u0627\u0645\u200C\u0634\u062F\u0647",
    partial:     "\u0646\u06CC\u0645\u0647",
    cancelled:   "\u0644\u063A\u0648",
    skipped:     "\u0631\u062F\u200C\u0634\u062F\u0647",
    missed:      "\u062C\u0627\u0645\u0627\u0646\u062F\u0647",
    planned:     "\u0628\u0631\u0646\u0627\u0645\u0647",
    on_track:    "\u062F\u0631 \u0645\u0633\u06CC\u0631",
    overdue:     "\u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647",
    in_progress: "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062C\u0627\u0645",
    upcoming:    "\u067E\u06CC\u0634\u200C\u0631\u0648",
    due:         "\u062F\u0631 \u0645\u0648\u0639\u062F",
    today:       "\u0627\u0645\u0631\u0648\u0632",
    future:      "\u0622\u06CC\u0646\u062F\u0647",
    past:        "\u06AF\u0630\u0634\u062A\u0647",
    pending:     "\u062F\u0631 \u0627\u0646\u062A\u0638\u0627\u0631",
    active:      "\u0641\u0639\u0627\u0644",
    delayed:     "\u062A\u0623\u062E\u06CC\u0631",
    rescheduled: "\u0628\u0627\u0632\u0686\u06CC\u0646\u06CC",
    moved:       "\u062C\u0627\u0628\u062C\u0627\u0634\u062F\u0647",
    future_dated:"\u0622\u06CC\u0646\u062F\u0647",
    behind:      "\u0639\u0642\u0628",
    ahead:       "\u062C\u0644\u0648\u062A\u0631"
  };
  var SOURCE_FA = {
    planner:            "\u067E\u0644\u0646\u0631",
    "v7-ui":            "V7",
    manual:             "\u062F\u0633\u062A\u06CC",
    residency_activity: "\u0641\u0639\u0627\u0644\u06CC\u062A",
    residencyActivity:  "\u0641\u0639\u0627\u0644\u06CC\u062A"
  };

  function _restructureHeader(o) {
    var header = o.querySelector(".pw14-header");
    if (!header || header.getAttribute("data-r2w-processed")) return;
    header.setAttribute("data-r2w-processed", "1");
    header.classList.add("r2w-header");

    var center = header.querySelector(".pw14-header-center");
    var right  = header.querySelector(".pw14-header-right");
    var left   = header.querySelector(".pw14-header-left");

    if (left) {
      var titleEl = left.querySelector(".pw14-header-title");
      if (titleEl) titleEl.textContent = "\u0645\u06CC\u0632\u06A9\u0627\u0631 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC";
    }

    if (center && !center.querySelector(".r2w-hg")) {
      var planSel   = center.querySelector("[data-pw14-plan]");
      var roundSel  = center.querySelector("[data-pw14-round]");
      var fromInp   = center.querySelector("[data-pw14-from]");
      var toInp     = center.querySelector("[data-pw14-to]");
      var roundNav  = center.querySelector(".pw18-round-nav");

      if (planSel && planSel.closest("label")) {
        var lbl1 = planSel.closest("label").querySelector("span");
        if (lbl1 && !lbl1.getAttribute("data-r2w-fa")) { lbl1.textContent = "\u0628\u0631\u0646\u0627\u0645\u0647:"; lbl1.setAttribute("data-r2w-fa","1"); }
      }
      if (roundSel && roundSel.closest("label")) {
        var lbl2 = roundSel.closest("label").querySelector("span");
        if (lbl2 && !lbl2.getAttribute("data-r2w-fa")) { lbl2.textContent = "\u062F\u0648\u0631\u0647:"; lbl2.setAttribute("data-r2w-fa","1"); }
      }

      var scopeGroup = document.createElement("div");
      scopeGroup.className = "r2w-hg r2w-hg-scope";
      if (planSel && planSel.closest("label")) scopeGroup.appendChild(planSel.closest("label"));
      if (roundSel && roundSel.closest("label")) scopeGroup.appendChild(roundSel.closest("label"));
      if (roundNav) scopeGroup.appendChild(roundNav);

      var rangeGroup = document.createElement("div");
      rangeGroup.className = "r2w-hg r2w-hg-range";
      if (fromInp && fromInp.closest("label")) rangeGroup.appendChild(fromInp.closest("label"));
      if (toInp && toInp.closest("label")) rangeGroup.appendChild(toInp.closest("label"));

      center.innerHTML = "";
      center.classList.add("r2w-header-group");
      center.appendChild(scopeGroup);
      center.appendChild(rangeGroup);
    }

    if (right) {
      var genBtn = right.querySelector("[data-pw14-generate]");
      var repBtn = right.querySelector("[data-pw14-replan]");
      var conBtn = right.querySelector("[data-pw14-content]");

      if (genBtn && !genBtn.getAttribute("data-r2w-fa")) {
        genBtn.textContent = "\u{1F680} \u062A\u0648\u0644\u06CC\u062F";
        genBtn.setAttribute("data-r2w-fa","1");
      }
      if (repBtn && !repBtn.getAttribute("data-r2w-fa")) {
        repBtn.textContent = "\u267B\uFE0F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC";
        repBtn.setAttribute("data-r2w-fa","1");
      }
      if (conBtn && !conBtn.getAttribute("data-r2w-fa")) {
        conBtn.textContent = "\u{1F916} \u0645\u062D\u062A\u0648\u0627";
        conBtn.setAttribute("data-r2w-fa","1");
      }

      if (repBtn && conBtn && !right.querySelector(".r2w-secondary-actions")) {
        var sec = document.createElement("div");
        sec.className = "r2w-secondary-actions";
        right.insertBefore(sec, repBtn);
        sec.appendChild(repBtn);
        sec.appendChild(conBtn);
      }
    }
  }

  function _persifyStates(o) {
    o.querySelectorAll(".pw14-card").forEach(function (card) {
      var stateEl = card.querySelector(".pw14-card-state");
      if (!stateEl || stateEl.getAttribute("data-r2w-fa")) return;
      var orig = (stateEl.textContent || "").trim();
      var m = (card.className || "").match(/pw14-state-([a-zA-Z_]+)/);
      var classKey = m ? m[1] : null;
      var fa = STATE_FA[orig] || STATE_FA[classKey];
      if (fa) {
        stateEl.textContent = fa;
        stateEl.setAttribute("data-r2w-fa","1");
      } else {
        console.log("[r2w] unmapped state:", { text: orig, class: classKey });
      }
    });
    o.querySelectorAll(".pw14-badge.is-source").forEach(function (el) {
      if (el.getAttribute("data-r2w-fa")) return;
      var orig = (el.textContent || "").trim();
      if (SOURCE_FA[orig]) { el.textContent = SOURCE_FA[orig]; el.setAttribute("data-r2w-fa","1"); }
    });
  }

  function _persifyKpis(o) {
    var map = {
      "Overdue": "\u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647",
      "Plan:":   "\u0628\u0631\u0646\u0627\u0645\u0647:",
      "Round:":  "\u062F\u0648\u0631\u0647:"
    };
    o.querySelectorAll(".pw14-kpi-label").forEach(function (el) {
      if (el.getAttribute("data-r2w-fa")) return;
      var t = (el.textContent || "").trim();
      if (map[t]) { el.textContent = map[t]; el.setAttribute("data-r2w-fa","1"); }
    });
    o.querySelectorAll(".pw14-vbtn").forEach(function (b) {
      if (b.getAttribute("data-r2w-fa")) return;
      if (b.textContent === "Round") { b.textContent = "\u062F\u0648\u0631\u0647"; b.setAttribute("data-r2w-fa","1"); }
    });
  }

  function _persifyFilterBar(o) {
    o.querySelectorAll("[data-pw14-overdue]").forEach(function (b) {
      if (b.getAttribute("data-r2w-fa")) return;
      b.textContent = "\u26A0\uFE0F \u0639\u0642\u0628\u200C\u0627\u0641\u062A\u0627\u062F\u0647";
      b.setAttribute("data-r2w-fa","1");
    });
    o.querySelectorAll("[data-pw14-search]").forEach(function (inp) {
      if (inp.getAttribute("data-r2w-fa")) return;
      inp.setAttribute("placeholder", "\u062C\u0633\u062A\u062C\u0648...");
      inp.setAttribute("data-r2w-fa","1");
    });
    var bar = o.querySelector(".pw14-filterbar");
    if (bar) bar.classList.add("r2w-filterbar");
  }

  function _addCardMenus(o) {
    o.querySelectorAll(".pw14-card-actions").forEach(function (bar) {
      if (bar.getAttribute("data-r2w-menu")) return;
      bar.setAttribute("data-r2w-menu","1");
      bar.classList.add("r2w-card-actions");

      var menuBtn = document.createElement("button");
      menuBtn.className = "r2w-menu-btn";
      menuBtn.setAttribute("type","button");
      menuBtn.setAttribute("aria-haspopup","menu");
      menuBtn.setAttribute("aria-expanded","false");
      menuBtn.setAttribute("aria-label","\u0627\u0642\u062F\u0627\u0645\u0627\u062A \u0628\u06CC\u0634\u062A\u0631");
      menuBtn.textContent = "\u22EF";
      bar.appendChild(menuBtn);

      menuBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        var isOpen = bar.classList.contains("is-menu-open");
        bar.classList.toggle("is-menu-open", !isOpen);
        menuBtn.setAttribute("aria-expanded", isOpen ? "false" : "true");
      });

      var card = bar.closest(".pw14-card");
      if (card) {
        var cls = card.className || "";
        var isMissed  = cls.indexOf("pw14-state-missed")  >= 0;
        var complete = bar.querySelector("[data-pw14-act-complete]");
        var edit     = bar.querySelector("[data-pw14-act-edit]");
        var partial  = bar.querySelector("[data-pw14-act-partial]");
        if (isMissed) {
          if (edit) edit.setAttribute("data-r2w-primary","1");
          if (partial) partial.setAttribute("data-r2w-primary","1");
        } else {
          if (complete) complete.setAttribute("data-r2w-primary","1");
          if (edit) edit.setAttribute("data-r2w-primary","1");
        }
      }
    });

    if (!document.body.getAttribute("data-r2w-outside")) {
      document.body.setAttribute("data-r2w-outside","1");
      document.addEventListener("click", function (e) {
        if (!e.target.closest(".r2w-card-actions")) {
          document.querySelectorAll(".r2w-card-actions.is-menu-open").forEach(function (b) {
            b.classList.remove("is-menu-open");
            var mb = b.querySelector(".r2w-menu-btn");
            if (mb) mb.setAttribute("aria-expanded","false");
          });
        }
      });
    }
  }

  function _addTimegridButton(o) {
    if (!WS._viewRenderers || !WS._viewRenderers.timegrid) return;
    var viewBar = o.querySelector(".pw14-viewbar");
    if (!viewBar) return;
    if (viewBar.querySelector('[data-pw14-view="timegrid"]')) return;
    var btn = document.createElement("button");
    btn.className = "pw14-vbtn";
    btn.setAttribute("data-pw14-view","timegrid");
    btn.setAttribute("data-r2w-fa","1");
    btn.textContent = "\u0634\u0628\u06A9\u0647 \u0632\u0645\u0627\u0646\u06CC";
    viewBar.appendChild(btn);
    btn.addEventListener("click", function () { WS.setView("timegrid"); });
  }

  function _markOverCapacity(o) {
    o.querySelectorAll(".pw14-cap-pct").forEach(function (el) {
      if (el.getAttribute("data-r2w-cap")) return;
      el.setAttribute("data-r2w-cap","1");
      var pct = parseInt((el.textContent || "").replace(/[^\d]/g, ""), 10);
      if (!isNaN(pct) && pct > 100) {
        el.classList.add("r2w-over-cap");
        el.setAttribute("title", "\u0627\u0636\u0627\u0641\u0647\u200C\u0628\u0627\u0631: " + (pct - 100) + "\u066A");
        var bar = el.parentNode ? el.parentNode.querySelector(".pw14-cap-fill") : null;
        if (bar) bar.classList.add("r2w-over-cap-fill");
      }
    });
    o.querySelectorAll(".pw14-week-cap").forEach(function (el) {
      if (el.getAttribute("data-r2w-cap")) return;
      el.setAttribute("data-r2w-cap","1");
      var m = (el.textContent || "").match(/([\d.]+)h\s*\/\s*([\d.]+)h/);
      if (m) {
        var used = parseFloat(m[1]), cap = parseFloat(m[2]);
        if (cap > 0 && used > cap) {
          el.classList.add("r2w-over-cap");
          el.setAttribute("title", "\u0627\u0636\u0627\u0641\u0647\u200C\u0628\u0627\u0631: " + Math.round((used - cap) / cap * 100) + "\u066A");
        }
      }
    });
    o.querySelectorAll(".pw14-round-stats > span").forEach(function (el) {
      if (el.getAttribute("data-r2w-cap")) return;
      var m = (el.textContent || "").match(/Util:\s*(\d+)/);
      if (m) {
        el.setAttribute("data-r2w-cap","1");
        var pct = parseInt(m[1], 10);
        el.textContent = "\u0627\u0633\u062A\u0641\u0627\u062F\u0647: " + pct + "\u066A";
        if (pct > 100) {
          el.classList.add("r2w-over-cap");
          el.setAttribute("title", "\u0627\u0636\u0627\u0641\u0647\u200C\u0628\u0627\u0631: " + (pct - 100) + "\u066A");
        }
      }
    });
  }

  function _postWire() {
    var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (!o) return;
    try { _restructureHeader(o); } catch (e) { console.warn("[ws.r2w header]", e); }
    try { _persifyStates(o);    } catch (e) { console.warn("[ws.r2w states]", e); }
    try { _persifyKpis(o);      } catch (e) { console.warn("[ws.r2w kpis]", e); }
    try { _persifyFilterBar(o); } catch (e) { console.warn("[ws.r2w filter]", e); }
    try { _addCardMenus(o);     } catch (e) { console.warn("[ws.r2w cards]", e); }
    try { _addTimegridButton(o);} catch (e) { console.warn("[ws.r2w timegrid]", e); }
    try { _markOverCapacity(o); } catch (e) { console.warn("[ws.r2w cap]", e); }
  }

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") {
      try { _origPostWire(); } catch (e) { console.warn("[ws.r2w prev]", e); }
    }
    _postWire();
  };

  if (document.querySelector(".pw14-overlay, .pw15-overlay")) {
    setTimeout(_postWire, 60);
  }

  WS._r2wPolish = {
    VERSION: VERSION,
    __postWire: _postWire,
    diagStates: function () {
      var o = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
      if (!o) return [];
      var out = [];
      o.querySelectorAll(".pw14-card").forEach(function (card, i) {
        var m = (card.className || "").match(/pw14-state-([a-zA-Z_]+)/);
        var stateEl = card.querySelector(".pw14-card-state");
        out.push({
          idx: i,
          classState: m ? m[1] : null,
          textContent: stateEl ? stateEl.textContent : null,
          mapped: stateEl ? !!stateEl.getAttribute("data-r2w-fa") : false
        });
      });
      return out;
    }
  };
  console.log("[workspace.r2w-polish] loaded v" + VERSION);
})();