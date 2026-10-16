(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) return;
  var WS = R.plannerWorkspace;
  if (!WS) return;
  var CI = R.contextInspector;
  var LIB = window.InternshipLib;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  WS._renderContextInspector = function () {
    if (!CI) return '';
    var modes = CI.listModes();
    return '<div class="pw15-ctx-panel">' +
      '<div class="pw15-ctx-title">🔍 Context Inspector (Validated)</div>' +
      '<div class="pw15-ctx-tabs">' + modes.map(function (m) {
        return '<button class="pw14-ctx-tab" data-pw15-ctx-mode="' + _esc(m) + '">' + _esc(m) + '</button>';
      }).join("") + '</div>' +
      '<div id="pw15-ctx-out" class="pw15-ctx-out"></div>' +
    '</div>';
  };

  var _origAIRender = WS._renderAITab;
  WS._renderAITab = function () {
    var base = typeof _origAIRender === "function" ? _origAIRender() : "";
    return base + '<div style="margin-top:14px">' + WS._renderContextInspector() + '</div>';
  };

  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    var o = document.querySelector(".pw14-overlay");
    if (!o) return;

    o.querySelectorAll("[data-pw15-ctx-mode]").forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-pw15-ctx-mode");
        var built = CI.buildSafe(mode);
        var out = o.querySelector("#pw15-ctx-out");
        if (!out) return;

        var status = built.valid ? '✅ validated' : '❌ invalid';
        var leakStr = built.leaks && built.leaks.length > 0 ? '⚠️ ' + built.leaks.join(", ") : '✓ no secrets';

        out.innerHTML = '<div class="pw15-ctx-meta">' +
          '<div class="pw15-ctx-kv"><span>Source</span><span>' + _esc(built.source) + '</span></div>' +
          '<div class="pw15-ctx-kv"><span>Prompt</span><span>' + _esc((built.promptId || "—") + " v" + (built.promptVersion || "—")) + '</span></div>' +
          '<div class="pw15-ctx-kv"><span>Hash</span><span>' + _esc(built.contextHash || "—") + '</span></div>' +
          '<div class="pw15-ctx-kv"><span>Integrity</span><span>' + status + '</span></div>' +
          '<div class="pw15-ctx-kv"><span>Redaction</span><span>' + (built.redacted ? '🔒 enabled' : '—') + '</span></div>' +
          '<div class="pw15-ctx-kv"><span>Secrets</span><span>' + leakStr + '</span></div>' +
        '</div>' +
        '<details class="pw15-ctx-json"><summary>📋 View JSON</summary>' +
        '<pre class="pw14-ctx-pre">' + _esc(JSON.stringify(built.json, null, 2).slice(0, 8000)) + '</pre></details>';

        b.parentNode.querySelectorAll("[data-pw15-ctx-mode]").forEach(function (x) { x.classList.remove("is-active"); });
        b.classList.add("is-active");
      });
    });
  };

  console.log("[workspace.v15.contextinspector] loaded");
})();