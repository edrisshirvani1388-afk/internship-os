/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Notification System v20
   Toast / Banner / Friendly Persian messages
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[notification.v20] R missing"); return; }

  var N = R.notify = R.notify || {};
  N.VERSION = "1.0.0";

  var _banners = {};
  var _bannerContainer = null;

  function _esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function _ensureToastWrap() {
    var wrap = document.getElementById("toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-wrap";
      wrap.className = "toast-wrap";
      wrap.setAttribute("aria-live", "polite");
      document.body.appendChild(wrap);
    }
    return wrap;
  }

  var ICONS = { info: "ℹ️", success: "✅", warning: "⚠️", error: "❌" };

  function _toast(message, kind, options) {
    options = options || {};
    var wrap = _ensureToastWrap();
    var el = document.createElement("div");
    el.className = "toast toast-v20 is-" + kind;

    var icon = ICONS[kind] || "";
    var html = '<span class="toast-v20-icon">' + icon + '</span>';
    html += '<span class="toast-v20-body">';
    html += '<span class="toast-v20-msg">' + _esc(message) + '</span>';
    html += '</span>';
    if (options.action && options.action.label) {
      html += '<button type="button" class="toast-v20-action">' + _esc(options.action.label) + '</button>';
    }
    if (options.dismissible !== false) {
      html += '<button type="button" class="toast-v20-close" aria-label="بستن">✕</button>';
    }
    el.innerHTML = html;

    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });

    var duration = options.duration;
    if (duration == null) {
      if (kind === "warning" || kind === "error") duration = 5500;
      else if (options.action) duration = 7000;
      else duration = 3500;
    }

    var timer = null;
    function dismiss() {
      if (timer) clearTimeout(timer);
      el.classList.remove("show");
      setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 320);
    }
    if (duration > 0) timer = setTimeout(dismiss, duration);

    var closeBtn = el.querySelector(".toast-v20-close");
    if (closeBtn) closeBtn.addEventListener("click", dismiss);

    var actionBtn = el.querySelector(".toast-v20-action");
    if (actionBtn && options.action && typeof options.action.onClick === "function") {
      actionBtn.addEventListener("click", function () {
        try { options.action.onClick(); } catch (e) {}
        dismiss();
      });
    }
    return el;
  }

  // ─── Banners ───
  function _ensureBannerContainer() {
    if (_bannerContainer && _bannerContainer.parentNode) return _bannerContainer;
    var c = document.getElementById("io-banner-container");
    if (!c) {
      c = document.createElement("div");
      c.id = "io-banner-container";
      c.className = "io-banner-container";
      document.body.appendChild(c);
    }
    _bannerContainer = c;
    return c;
  }

  function _renderBannerHTML(options) {
    var icon = options.icon || ICONS[options.kind || "info"] || "💡";
    var html = '<span class="io-banner-icon">' + _esc(icon) + '</span>';
    html += '<div class="io-banner-body">';
    if (options.title) html += '<div class="io-banner-title">' + _esc(options.title) + '</div>';
    if (options.message) html += '<div class="io-banner-message">' + _esc(options.message) + '</div>';
    html += '</div>';
    if (options.action && options.action.label) {
      html += '<button type="button" class="io-banner-action">' + _esc(options.action.label) + '</button>';
    }
    if (options.dismissible !== false) {
      html += '<button type="button" class="io-banner-close" aria-label="بستن">✕</button>';
    }
    return html;
  }

  function _wireBanner(el, options) {
    var closeBtn = el.querySelector(".io-banner-close");
    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        N.clear(el.getAttribute("data-banner-id"));
      });
    }
    var actionBtn = el.querySelector(".io-banner-action");
    if (actionBtn && options.action && typeof options.action.onClick === "function") {
      actionBtn.addEventListener("click", function () {
        try { options.action.onClick(); } catch (e) {}
      });
    }
  }

  N.banner = function (id, options) {
    options = options || {};
    var container = _ensureBannerContainer();
    var existing = _banners[id];
    if (existing && existing.el && existing.el.parentNode) {
      existing.el.className = "io-banner is-" + (options.kind || "info") + " show";
      existing.el.innerHTML = _renderBannerHTML(options);
      _wireBanner(existing.el, options);
      existing.options = options;
      return existing.el;
    }
    var el = document.createElement("div");
    el.className = "io-banner is-" + (options.kind || "info");
    el.setAttribute("data-banner-id", id);
    el.innerHTML = _renderBannerHTML(options);
    container.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    _wireBanner(el, options);
    _banners[id] = { el: el, options: options };
    return el;
  };

  N.clear = function (id) {
    var b = _banners[id];
    if (!b || !b.el) return;
    b.el.classList.remove("show");
    var el = b.el;
    setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 250);
    delete _banners[id];
  };

  N.clearAll = function () {
    Object.keys(_banners).forEach(function (id) { N.clear(id); });
  };

  N.info    = function (msg, opts) { return _toast(msg, "info", opts); };
  N.success = function (msg, opts) { return _toast(msg, "success", opts); };
  N.warning = function (msg, opts) { return _toast(msg, "warning", opts); };
  N.error   = function (msg, opts) { return _toast(msg, "error", opts); };

  // Phase 9 — Day Type helper (UI-facing)
  N.dayTypeLabel = function (dayType) {
    var map = {
      normal:     "روز عادی",
      free:       "روز تعطیل",
      shift:      "روز کشیک",
      pre_shift:  "قبل از کشیک",
      post_shift: "بعد از کشیک",
      off:        "تعطیل"
    };
    return map[dayType] || "روز عادی";
  };
  N.dayTypeIcon = function (dayType) {
    var map = {
      normal:     "🌤️",
      free:       "🏖️",
      shift:      "🚨",
      pre_shift:  "⏪",
      post_shift: "😴",
      off:        "⛔"
    };
    return map[dayType] || "🌤️";
  };

  console.log("[notification.v20] loaded v" + N.VERSION);
})();