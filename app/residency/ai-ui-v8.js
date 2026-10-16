/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Advisor UI v8
   Contextual AI panels for Planner / Replanner
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.ui.v8] R missing"); return; }
  var AIUI = R.aiUI = R.aiUI || {};
  var ADV = R.aiAdvisors;
  var LIB = window.InternshipLib;

  var _overlay = null;

  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }
  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }

  /* ─── Generic advisor panel ─── */
  AIUI.openAdvisor = function (opts) {
    opts = opts || {};
    if (_overlay) _overlay.remove();
    _overlay = document.createElement("div");
    _overlay.className = "ai8-overlay";
    _overlay.innerHTML = _renderPanel(opts);
    document.body.appendChild(_overlay);
    requestAnimationFrame(function () { _overlay.classList.add("is-open"); });
    document.body.style.overflow = "hidden";

    _wire(opts);
    // Auto-run if requested
    if (opts.autoRun) setTimeout(function () { _runAdvisor(opts); }, 30);
  };

  AIUI.close = function () {
    if (!_overlay) return;
    _overlay.classList.remove("is-open");
    document.body.style.overflow = "";
    setTimeout(function () { if (_overlay) { _overlay.remove(); _overlay = null; } }, 220);
  };

  function _renderPanel(opts) {
    return '' +
      '<div class="ai8-panel">' +
        '<header class="ai8-header">' +
          '<div class="ai8-header-left">' +
            '<span class="ai8-icon">🤖</span>' +
            '<div>' +
              '<div class="ai8-title">' + _esc(opts.title || "مشاور هوشمند") + '</div>' +
              '<div class="ai8-sub">' + _esc(opts.subtitle || "") + '</div>' +
            '</div>' +
          '</div>' +
          '<button class="ai8-close" type="button" data-ai8-close>✕</button>' +
        '</header>' +
        '<div class="ai8-body">' +
          '<div class="ai8-actions">' +
            (opts.actions || []).map(function (a) {
              return '<button class="ai8-action" type="button" data-ai8-action="' + _esc(a.id) + '">' + _esc(a.label) + '</button>';
            }).join("") +
          '</div>' +
          '<div class="ai8-result" id="ai8-result">' +
            (opts.autoRun
              ? '<div class="ai8-loading"><div class="ai8-spinner"></div><div>در حال تحلیل...</div></div>'
              : '<div class="ai8-empty">یک گزینه را انتخاب کن.</div>') +
          '</div>' +
        '</div>' +
      '</div>';
  }

  function _wire(opts) {
    if (!_overlay) return;
    _overlay.querySelectorAll("[data-ai8-close]").forEach(function (b) {
      b.addEventListener("click", AIUI.close);
    });
    _overlay.addEventListener("click", function (e) { if (e.target === _overlay) AIUI.close(); });
    _overlay.querySelectorAll("[data-ai8-action]").forEach(function (b) {
      b.addEventListener("click", function () {
        var id = b.getAttribute("data-ai8-action");
        var action = (opts.actions || []).find(function (x) { return x.id === id; });
        if (action && typeof action.handler === "function") {
          _showLoading();
          Promise.resolve()
            .then(function () { return action.handler(); })
            .then(_renderResult)
            .catch(_renderError);
        }
      });
    });
  }

  function _runAdvisor(opts) {
    if (!opts.actions || opts.actions.length === 0) return;
    var first = opts.actions[0];
    if (typeof first.handler === "function") {
      _showLoading();
      Promise.resolve()
        .then(function () { return first.handler(); })
        .then(_renderResult)
        .catch(_renderError);
    }
  }

  function _showLoading() {
    var el = _overlay && _overlay.querySelector("#ai8-result");
    if (!el) return;
    el.innerHTML = '<div class="ai8-loading"><div class="ai8-spinner"></div><div>در حال تحلیل...</div></div>';
  }

  function _renderError(err) {
    var el = _overlay && _overlay.querySelector("#ai8-result");
    if (!el) return;
    var msg = (err && err.hint) || (err && err.message) || String(err);
    el.innerHTML = '<div class="ai8-error">❌ ' + _esc(msg) + '</div>';
  }

  function _renderResult(out) {
    var el = _overlay && _overlay.querySelector("#ai8-result");
    if (!el) return;
    if (!out || typeof out !== "object") {
      el.innerHTML = '<div class="ai8-empty">پاسخی دریافت نشد.</div>';
      return;
    }
    var html = "";
    if (out.summary) {
      html += '<div class="ai8-summary">' + _esc(out.summary) + '</div>';
    }
    if (Array.isArray(out.findings) && out.findings.length > 0) {
      html += '<div class="ai8-section"><div class="ai8-sec-title">🔍 یافته‌ها</div><ul class="ai8-list">' +
        out.findings.map(function (f) { return '<li>' + _esc(f) + '</li>'; }).join("") +
        '</ul></div>';
    }
    if (Array.isArray(out.risks) && out.risks.length > 0) {
      html += '<div class="ai8-section"><div class="ai8-sec-title">⚠️ ریسک‌ها</div><ul class="ai8-list is-risk">' +
        out.risks.map(function (r) { return '<li>' + _esc(r) + '</li>'; }).join("") +
        '</ul></div>';
    }
    if (Array.isArray(out.recommendations) && out.recommendations.length > 0) {
      html += '<div class="ai8-section"><div class="ai8-sec-title">💡 پیشنهادها</div>' +
        out.recommendations.map(function (r) {
          return '<div class="ai8-rec is-' + _esc(r.type) + '">' +
            '<div class="ai8-rec-title">' + _esc(r.title) +
              (r.confidence ? ' <span class="ai8-conf">' + Math.round(r.confidence * 100) + '٪</span>' : '') +
            '</div>' +
            '<div class="ai8-rec-desc">' + _esc(r.explanation) + '</div>' +
            (r.evidence && r.evidence.length > 0
              ? '<div class="ai8-rec-ev">' + r.evidence.map(_esc).join(" · ") + '</div>' : '') +
          '</div>';
        }).join("") +
        '</div>';
    }
    if (out.confidence != null) {
      html += '<div class="ai8-conf-total">اطمینان کلی: ' + Math.round(out.confidence * 100) + '٪</div>';
    }
    if (!html) html = '<div class="ai8-empty">پاسخ خالی.</div>';
    el.innerHTML = html;
  }

  /* ═══════ High-level entry points for UI ═══════ */

  AIUI.openPlannerAdvisor = function (getContextFn) {
    AIUI.openAdvisor({
      title: "مشاور برنامه‌ریزی",
      subtitle: "تحلیل برنامه‌ی اینترنی",
      actions: [
        { id: "review", label: "🔍 تحلیل برنامه",
          handler: function () {
            var ctx = getContextFn();
            if (!ctx || !ctx.plannerInput) return Promise.reject({ hint: "Context آماده نیست" });
            return ADV.reviewPlanner(ctx.plannerInput, ctx.allocationResult);
          } },
        { id: "diagnostics", label: "🩺 توضیح diagnostics",
          handler: function () {
            var ctx = getContextFn();
            if (!ctx || !ctx.allocationResult) return Promise.reject({ hint: "Allocation موجود نیست" });
            return ADV.explainDiagnostics(ctx.allocationResult.deficits);
          } }
      ]
    });
  };

  AIUI.openReplannerAdvisor = function (getContextFn) {
    AIUI.openAdvisor({
      title: "مشاور Replanning",
      subtitle: "تحلیل وضعیت بازیابی",
      actions: [
        { id: "recovery", label: "🤖 تحلیل وضعیت",
          handler: function () {
            var ctx = getContextFn();
            if (!ctx || !ctx.execAnalysis) return Promise.reject({ hint: "Context آماده نیست" });
            return ADV.reviewRecovery(ctx.execAnalysis, ctx.impact, ctx.comparisons);
          } },
        { id: "rescue", label: "🎯 پیشنهاد Rescue",
          handler: function () {
            var ctx = getContextFn();
            if (!ctx || !ctx.comparisons || ctx.comparisons.length === 0) {
              return Promise.reject({ hint: "ابتدا استراتژی‌ها را مقایسه کن" });
            }
            return ADV.recommendRecoveryStrategy(ctx.comparisons);
          } },
        { id: "proposal", label: "🔍 بررسی Proposal",
          handler: function () {
            var ctx = getContextFn();
            if (!ctx || !ctx.proposal) return Promise.reject({ hint: "Proposal موجود نیست" });
            return ADV.reviewProposal(ctx.proposal);
          } }
      ]
    });
  };

  console.log("[ai.ui.v8] loaded");
})();