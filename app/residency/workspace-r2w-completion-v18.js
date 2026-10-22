/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Workspace R2-W Completion v18 (fix2)
   - D-05: Proposal 3-step restructure (only for real proposals)
   - Persian labels for Proposal/Review/AI/Context (with MutationObserver)
   - W-43: fixture tests + diagnostic
   - Card primary markers re-applied on every render
   Additive. No protected contract modified.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ws.r2w.comp] R missing"); return; }
  var WS = R.plannerWorkspace;
  if (!WS) { console.warn("[ws.r2w.comp] WS missing"); return; }

  var VERSION = "1.0.1";

  function _overlay() {
    return document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
  }

  // ─── Persian label maps ───
  var PROP_LABELS = {
    "Added":                 "\u0627\u0641\u0632\u0648\u062F\u0647",
    "Removed":               "\u062D\u0630\u0641\u200C\u0634\u062F\u0647",
    "Modified":              "\u062A\u063A\u06CC\u06CC\u0631\u200C\u06CC\u0627\u0641\u062A\u0647",
    "Unchanged":             "\u0628\u062F\u0648\u0646\u200C\u062A\u063A\u06CC\u06CC\u0631",
    "Snapshot unavailable":  "\u0627\u0633\u0646\u067E\u200C\u0634\u0627\u062A \u0645\u0648\u062C\u0648\u062F \u0646\u06CC\u0633\u062A",
    "restore":               "\u0628\u0627\u0632\u06AF\u0631\u062F\u0627\u0646\u06CC",
    "update":                "\u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC",
    "remove":                "\u062D\u0630\u0641",
    "skipped":               "\u0631\u062F\u200C\u0634\u062F\u0647",
    "stale":                 "\u0645\u0646\u0642\u0636\u06CC",
    "active":                "\u0641\u0639\u0627\u0644",
    "superseded":            "\u062C\u0627\u06CC\u06AF\u0632\u06CC\u0646\u200C\u0634\u062F\u0647",
    "archived":              "\u0628\u0627\u06CC\u06AF\u0627\u0646\u06CC",
    "Util":                  "\u0627\u0633\u062A\u0641\u0627\u062F\u0647",
    "Generate":              "\u062A\u0648\u0644\u06CC\u062F",
    "Replan":                "\u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC"
  };

  var CTX_LABELS = {
    "Source":             "\u0645\u0646\u0628\u0639",
    "Prompt":             "\u067E\u0631\u0648\u067E\u062A",
    "Hash":               "\u0647\u0634",
    "Integrity":          "\u06CC\u06A9\u067E\u0627\u0631\u0686\u06AF\u06CC",
    "Redaction":          "\u067E\u0627\u06A9\u200C\u0633\u0627\u0632\u06CC",
    "Secrets":            "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u062D\u0633\u0627\u0633",
    "View JSON":          "\u0645\u0634\u0627\u0647\u062F\u0647\u0654 JSON",
    "Validated":          "\u062A\u0623\u06CC\u06CC\u062F\u200C\u0634\u062F\u0647",
    "validated":          "\u062A\u0623\u06CC\u06CC\u062F\u200C\u0634\u062F\u0647",
    "invalid":            "\u0646\u0627\u0645\u0639\u062A\u0628\u0631",
    "enabled":            "\u0641\u0639\u0627\u0644",
    "no secrets":         "\u0628\u062F\u0648\u0646 \u0646\u0634\u062A"
  };

  function _walkTextNodes(root, fn) {
    if (!root) return;
    var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
    var n;
    while ((n = walker.nextNode())) { fn(n); }
  }

  function _persifyTextMap(root, map) {
    if (!root) return;
    _walkTextNodes(root, function (n) {
      var t = n.nodeValue;
      var trimmed = t.trim();
      if (!trimmed) return;
      if (map[trimmed]) {
        var leading = t.match(/^\s*/)[0];
        var trailing = t.match(/\s*$/)[0];
        n.nodeValue = leading + map[trimmed] + trailing;
      }
    });
  }

  // ─── Card primary markers ───
  function _reMarkPrimary(o) {
    if (!o) return;
    o.querySelectorAll(".pw14-card-actions").forEach(function (bar) {
      var card = bar.closest ? bar.closest(".pw14-card") : null;
      if (!card) return;
      var cls = card.className || "";
      var isMissed = cls.indexOf("pw14-state-missed") >= 0;
      var complete = bar.querySelector("[data-pw14-act-complete]");
      var edit     = bar.querySelector("[data-pw14-act-edit]");
      var partial  = bar.querySelector("[data-pw14-act-partial]");
      if (isMissed) {
        if (edit)    edit.setAttribute("data-r2w-primary", "1");
        if (partial) partial.setAttribute("data-r2w-primary", "1");
      } else {
        if (complete) complete.setAttribute("data-r2w-primary", "1");
        if (edit)     edit.setAttribute("data-r2w-primary", "1");
      }
    });
  }

  // ─── Proposal: Persian labels ───
  function _persifyProposalSections(o) {
    if (!o) return;
    o.querySelectorAll(".pw14-change-chip, .pw17-cmp-chip, .pw17-badge").forEach(function (el) {
      if (el.getAttribute("data-r2w-comp-pers")) return;
      el.setAttribute("data-r2w-comp-pers", "1");
      _persifyTextMap(el, PROP_LABELS);
    });
    o.querySelectorAll(".pw15-version-status, .pw17-cmp-id, .pw15-v-kv, .pw17-cmp-sub").forEach(function (el) {
      if (el.getAttribute("data-r2w-comp-pers")) return;
      el.setAttribute("data-r2w-comp-pers", "1");
      _persifyTextMap(el, PROP_LABELS);
    });
    o.querySelectorAll(".pw14-prop-section, .pw17-cmp, .pw17-revert, .pw15-versions").forEach(function (sec) {
      if (sec.getAttribute("data-r2w-comp-pers")) return;
      sec.setAttribute("data-r2w-comp-pers", "1");
      _persifyTextMap(sec, PROP_LABELS);
    });
  }

  // ─── Proposal: enhance empty state ───
  function _enhanceEmptyProposal(o) {
    if (!o) return;
    o.querySelectorAll(".pw14-empty").forEach(function (empty) {
      if (empty.getAttribute("data-r2w-empty-enhanced")) return;
      var txt = (empty.textContent || "").trim();
      if (txt.indexOf("\u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u062A\u0648\u0644\u06CC\u062F \u0646\u0634\u062F\u0647") === -1) return;
      empty.setAttribute("data-r2w-empty-enhanced", "1");
      empty.innerHTML =
        '<div class="r2w-empty-3step">' +
          '<h3>\u0647\u0646\u0648\u0632 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F\u06CC \u0633\u0627\u062E\u062A\u0647 \u0646\u0634\u062F\u0647</h3>' +
          '<ol>' +
            '<li><b>\u06F1 \u062E\u0644\u0627\u0635\u0647:</b> \u0627\u0632 \u062F\u06A9\u0645\u0647\u0654 \u00AB\u{1F680} \u062A\u0648\u0644\u06CC\u062F\u00BB \u06CC\u0627 \u00AB\u267B\uFE0F \u0628\u0627\u0632\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0631\u06CC\u0632\u06CC\u00BB \u06CC\u06A9 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F \u0628\u0633\u0627\u0632.</li>' +
            '<li><b>\u06F2 \u0628\u0631\u0631\u0633\u06CC:</b> \u0642\u0628\u0644/\u0628\u0639\u062F\u060C \u062A\u0641\u0627\u0648\u062A \u0631\u0648\u0632\u0627\u0646\u0647\u060C \u0641\u0639\u0627\u0644\u06CC\u062A\u200C\u0647\u0627\u06CC \u0644\u063A\u0648\u0634\u0648\u0646\u062F\u0647 \u0648 Impact \u0627\u06CC\u0646\u062C\u0627 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.</li>' +
            '<li><b>\u06F3 \u0627\u0639\u0645\u0627\u0644:</b> \u0628\u0627 \u062A\u0623\u06CC\u06CC\u062F\u060C \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0631\u0648\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0641\u0639\u0627\u0644 \u0627\u0639\u0645\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F.</li>' +
          '</ol>' +
        '</div>';
    });
  }

  // ─── Proposal: 3-step restructure ───
  function _restructureProposal(o) {
    if (!o) return;
    if (o.querySelector(".r2w-prop-3step")) return;

    var headEl = o.querySelector(".pw14-prop-head");
    var actionsEl = o.querySelector(".pw14-prop-actions");
    if (!headEl && !actionsEl) return;  // no real proposal — skip

    var secs = o.querySelectorAll(".pw14-prop-section");
    if (secs.length === 0 && !headEl) return;

    var parent = secs.length > 0 ? secs[0].parentNode : headEl.parentNode;
    if (!parent) return;
    if (parent.getAttribute("data-r2w-3step")) return;
    parent.setAttribute("data-r2w-3step", "1");

    var staleEl = o.querySelector(".pw14-stale");
    var s1Parts = [], s2Parts = [], s3Parts = [];
    if (staleEl) s1Parts.push(staleEl);
    if (headEl)  s1Parts.push(headEl);

    secs.forEach(function (sec) {
      var titleEl = sec.querySelector(".pw14-prop-sec-title");
      var title = titleEl ? titleEl.textContent : "";
      if (/\u0642\u0628\u0644\s*\/\s*\u0628\u0639\u062F/.test(title)) {
        s1Parts.push(sec);
      } else if (/\u062A\u063A\u06CC\u06CC\u0631\u0627\u062A|Daily|Diff|Impact|\u062A\u062D\u0644\u06CC\u0644|\u0644\u063A\u0648|\u062A\u0641\u0627\u0648\u062A|\u062A\u0627\u0631\u06CC\u062E\u0686\u0647/.test(title)) {
        s2Parts.push(sec);
      } else {
        s3Parts.push(sec);
      }
    });

    var wrapper = document.createElement("div");
    wrapper.className = "r2w-prop-3step";

    var s1 = document.createElement("section");
    s1.className = "r2w-step r2w-step-1";
    s1.innerHTML = '<header class="r2w-step-head"><span class="r2w-step-num">\u06F1</span><h3>\u062E\u0644\u0627\u0635\u0647\u0654 \u067E\u06CC\u0634\u0646\u0647\u0627\u062F</h3></header>';
    s1Parts.forEach(function (el) { s1.appendChild(el); });

    var s2 = document.createElement("details");
    s2.className = "r2w-step r2w-step-2";
    s2.open = true;
    s2.innerHTML = '<summary class="r2w-step-head"><span class="r2w-step-num">\u06F2</span><h3>\u0628\u0631\u0631\u0633\u06CC \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A</h3><span class="r2w-step-count">' + s2Parts.length + '</span></summary>';
    s2Parts.forEach(function (el) { s2.appendChild(el); });
    if (s2Parts.length === 0) {
      s2.insertAdjacentHTML("beforeend", '<div class="r2w-step-empty">\u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u062C\u0632\u0626\u06CC\u0627\u062A \u0646\u062F\u0627\u0631\u062F.</div>');
    }

    var s3 = document.createElement("section");
    s3.className = "r2w-step r2w-step-3";
    s3.innerHTML = '<header class="r2w-step-head"><span class="r2w-step-num">\u06F3</span><h3>\u0628\u0627\u0632\u0628\u06CC\u0646\u06CC \u0648 \u0627\u0639\u0645\u0627\u0644</h3></header>' +
      '<div class="r2w-apply-notice"><strong>\u062A\u0648\u062C\u0647:</strong> \u0628\u0627 \u0632\u062F\u0646 \u00AB\u0627\u0639\u0645\u0627\u0644\u00BB\u060C \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0631\u0648\u06CC \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0641\u0639\u0627\u0644 \u0630\u062E\u06CC\u0631\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0627\u0632 Version History \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u0628\u0647 \u0639\u0642\u0628 \u0628\u0631\u06AF\u0631\u062F\u06CC.</div>';
    if (actionsEl) s3.appendChild(actionsEl);
    s3Parts.forEach(function (el) { s3.appendChild(el); });

    wrapper.appendChild(s1);
    wrapper.appendChild(s2);
    wrapper.appendChild(s3);

    while (parent.firstChild) parent.removeChild(parent.firstChild);
    parent.appendChild(wrapper);
  }

  // ─── Context Inspector Persian ───
  function _persifyContext(o) {
    if (!o) return;
    o.querySelectorAll(".pw15-ctx-kv, .pw15-v-kv").forEach(function (row) {
      if (row.getAttribute("data-r2w-comp-pers")) return;
      row.setAttribute("data-r2w-comp-pers", "1");
      var spans = row.querySelectorAll("span");
      if (spans.length >= 1) {
        _persifyTextMap(spans[0], CTX_LABELS);
      }
    });
    o.querySelectorAll(".pw15-ctx-json summary").forEach(function (sum) {
      if (sum.getAttribute("data-r2w-comp-pers")) return;
      sum.setAttribute("data-r2w-comp-pers", "1");
      _persifyTextMap(sum, CTX_LABELS);
    });
    o.querySelectorAll(".pw15-ctx-title").forEach(function (t) {
      if (t.getAttribute("data-r2w-comp-pers")) return;
      t.setAttribute("data-r2w-comp-pers", "1");
      t.textContent = "\u0628\u0627\u0632\u0631\u0633\u06CC \u06A9\u0627\u0646\u062A\u06A9\u0633\u062A (\u062A\u0623\u06CC\u06CC\u062F\u200C\u0634\u062F\u0647)";
    });
  }

  // ─── Review Persian ───
  function _persifyReview(o) {
    if (!o) return;
    var containers = o.querySelectorAll(".pw14-reviews-tab, [data-r2w-review], .pw14-review-summary");
    containers.forEach(function (el) {
      if (el.getAttribute("data-r2w-comp-pers")) return;
      el.setAttribute("data-r2w-comp-pers", "1");
      _walkTextNodes(el, function (n) {
        if (!n.nodeValue) return;
        n.nodeValue = n.nodeValue
          .replace(/Review Scheduler \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A\./g, "\u0632\u0645\u0627\u0646\u200C\u0628\u0646\u062F \u0645\u0631\u0648\u0631 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A.");
      });
    });
  }

  // ─── MutationObserver — re-persify dynamic content ───
  var _obs = null;
  var _obsTarget = null;
  function _setupObserver(o) {
    if (!o) return;
    if (_obsTarget === o && _obs) return;
    if (_obs) { try { _obs.disconnect(); } catch (e) {} }
    _obsTarget = o;
    var pending = false;
    _obs = new MutationObserver(function () {
      if (pending) return;
      pending = true;
      setTimeout(function () {
        pending = false;
        var ov = _overlay();
        if (!ov) return;
        try { _persifyContext(ov); }          catch (e) {}
        try { _persifyProposalSections(ov); } catch (e) {}
      }, 150);
    });
    _obs.observe(o, { childList: true, subtree: true });
  }

  // ─── postWire orchestrator ───
  function _postWire() {
    var o = _overlay();
    if (!o) return;
    try { _reMarkPrimary(o);             } catch (e) { console.warn("[r2w.comp primary]", e); }
    try { _persifyProposalSections(o); } catch (e) { console.warn("[r2w.comp prop-pers]", e); }
    try { _enhanceEmptyProposal(o);    } catch (e) { console.warn("[r2w.comp prop-empty]", e); }
    try { _restructureProposal(o);     } catch (e) { console.warn("[r2w.comp prop-3step]", e); }
    try { _persifyContext(o);          } catch (e) { console.warn("[r2w.comp ctx]", e); }
    try { _persifyReview(o);           } catch (e) { console.warn("[r2w.comp rev]", e); }
    try { _setupObserver(o);           } catch (e) { console.warn("[r2w.comp obs]", e); }
  }

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") {
      try { _origPostWire(); } catch (e) { console.warn("[r2w.comp prev]", e); }
    }
    _postWire();
  };

  if (_overlay()) setTimeout(_postWire, 80);

  // ─── W-43 fixture tests ───
  function _w43Fixture() {
    var results = [];
    function rec(name, pass, detail) { results.push({ name: name, pass: !!pass, detail: detail || "" }); }
    function pct(c, cap) { return cap > 0 ? Math.round(c / cap * 100) : 0; }
    function barW(p) { return Math.min(100, p); }
    var p1 = pct(300, 600);
    rec("under_100pct", p1 === 50, "50/" + p1);
    var p2 = pct(366, 300);
    rec("over_100pct_122", p2 === 122, "122/" + p2);
    var p3 = pct(732, 300);
    rec("over_100pct_244", p3 === 244, "244/" + p3);
    var p4 = pct(480, 480);
    rec("exactly_100", p4 === 100, "100/" + p4);
    var bw2 = barW(p2);
    rec("bar_caps_at_100", bw2 === 100, "100/" + bw2);
    rec("real_number_preserved", p2 === 122, "122/" + p2);
    var p6 = pct(500, 0);
    rec("zero_capacity_guard", p6 === 0, "0/" + p6);
    return { passed: results.filter(function (r) { return r.pass; }).length, total: results.length, results: results };
  }

  function _w43Diag() {
    var o = _overlay();
    if (!o) return { error: "workspace_not_open" };
    var out = {
      view: WS.getView ? WS.getView() : "?",
      capPctCount: o.querySelectorAll(".pw14-cap-pct").length,
      weekCapCount: o.querySelectorAll(".pw14-week-cap").length,
      roundStatsCount: o.querySelectorAll(".pw14-round-stats").length,
      overCapMarkers: o.querySelectorAll(".r2w-over-cap").length,
      overCapDetails: []
    };
    o.querySelectorAll(".r2w-over-cap").forEach(function (el, i) {
      if (i < 10) out.overCapDetails.push({
        text: (el.textContent || "").trim(),
        title: el.getAttribute("title") || ""
      });
    });
    return out;
  }

  function _cardPrimaryDiag() {
    var o = _overlay();
    if (!o) return { error: "workspace_not_open" };
    var out = { totalCards: 0, cardsWithMenuBtn: 0, primaryVisible: 0, sample: [] };
    o.querySelectorAll(".pw14-card").forEach(function (card, i) {
      out.totalCards++;
      var bar = card.querySelector(".r2w-card-actions");
      if (!bar) return;
      if (bar.querySelector(".r2w-menu-btn")) out.cardsWithMenuBtn++;
      var vis = [];
      bar.querySelectorAll(".pw14-mini").forEach(function (b) {
        if (getComputedStyle(b).display !== "none") {
          vis.push(b.getAttribute("data-r2w-primary") === "1");
          out.primaryVisible++;
        }
      });
      if (i < 3) out.sample.push({ idx: i, visible: vis.length, primary: vis.filter(Boolean).length });
    });
    return out;
  }

  WS._r2wCompletion = {
    VERSION: VERSION,
    __postWire: _postWire,
    __tests: {
      w43: _w43Fixture,
      w43Diag: _w43Diag,
      cardPrimary: _cardPrimaryDiag
    }
  };

  console.log("[workspace.r2w-completion] loaded v" + VERSION);
})();