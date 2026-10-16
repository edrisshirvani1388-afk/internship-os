/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Loading Overlay v21
   Spinner فقط (progress bar حذف شد چون داده‌ی واقعی نداریم)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency = window.InternshipResidency || {};
  var LO = R.loading = R.loading || {};
  LO.VERSION = "2.0.0";

  var _overlay = null;
  var _depth = 0;
  var _showTime = 0;
  var MIN_SHOW_MS = 500;

  function _ensure() {
    if (_overlay && _overlay.parentNode) return _overlay;
    var el = document.createElement("div");
    el.className = "io-loading-overlay";
    el.innerHTML =
      '<div class="io-loading-box">' +
        '<div class="io-loading-spinner" aria-hidden="true"></div>' +
        '<div class="io-loading-text" data-msg>در حال بارگذاری...</div>' +
        '<div class="io-loading-sub" data-sub></div>' +
      '</div>';
    document.body.appendChild(el);
    _overlay = el;
    return el;
  }

  LO.show = function (message, options) {
    options = options || {};
    _depth++;
    if (_depth > 1) return;
    _showTime = Date.now();
    var el = _ensure();
    var msgEl = el.querySelector("[data-msg]");
    var subEl = el.querySelector("[data-sub]");
    if (msgEl) msgEl.textContent = message || "در حال بارگذاری...";
    if (subEl) {
      if (options.sub) { subEl.textContent = options.sub; subEl.style.display = ""; }
      else { subEl.style.display = "none"; }
    }
    requestAnimationFrame(function () { el.classList.add("is-open"); });
  };

  LO.hide = function () {
    _depth = Math.max(0, _depth - 1);
    if (_depth > 0) return;
    var elapsed = Date.now() - _showTime;
    var wait = Math.max(0, MIN_SHOW_MS - elapsed);
    setTimeout(function () {
      if (!_overlay) return;
      _overlay.classList.remove("is-open");
      setTimeout(function () {
        if (_overlay && _overlay.parentNode) _overlay.parentNode.removeChild(_overlay);
        _overlay = null;
      }, 220);
    }, wait);
  };

  LO.update = function (message, sub) {
    if (!_overlay) return;
    var msgEl = _overlay.querySelector("[data-msg]");
    var subEl = _overlay.querySelector("[data-sub]");
    if (msgEl && message) msgEl.textContent = message;
    if (subEl) {
      if (sub) { subEl.textContent = sub; subEl.style.display = ""; }
      else { subEl.style.display = "none"; }
    }
  };

  // سازگاری با API قدیمی — progress دیگه کاری نمی‌کنه
  LO.progress = function () { /* no-op */ };

  LO.wrap = function (message, fn, options) {
    LO.show(message, options);
    var result;
    try { result = fn(); }
    catch (e) { LO.hide(); throw e; }
    if (result && typeof result.then === "function") {
      return result.then(
        function (v) { LO.hide(); return v; },
        function (e) { LO.hide(); throw e; }
      );
    }
    LO.hide();
    return result;
  };

  /**
   * دو rAF تأخیر می‌ذاره تا overlay paint بشه، بعد کار سنگین اجرا بشه.
   * این تنها راهه که کاربر قبل از قفل شدن، overlay رو ببینه.
   */
  LO.defer = function (message, fn, options) {
    options = options || {};
    LO.show(message, options);
    var delay = options.delay != null ? options.delay : 350;
    return new Promise(function (resolve, reject) {
      // روش اول: دو rAF + setTimeout تا مطمئن بشیم paint شده
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          setTimeout(function () {
            try {
              var r = fn();
              if (r && typeof r.then === "function") {
                r.then(function (v) { LO.hide(); resolve(v); },
                       function (e) { LO.hide(); reject(e); });
              } else {
                LO.hide();
                resolve(r);
              }
            } catch (e) { LO.hide(); reject(e); }
          }, 16);
        });
      });
    });
  };

  LO.__tests = function () {
    var t = [];
    t.push({ name: "T1 show", ok: typeof LO.show === "function" });
    t.push({ name: "T2 wrap", ok: typeof LO.wrap === "function" });
    t.push({ name: "T3 defer", ok: typeof LO.defer === "function" });
    t.push({ name: "T4 version 2.0.0", ok: LO.VERSION === "2.0.0", got: LO.VERSION });
    return t;
  };

  console.log("[loading-overlay.v21] loaded v" + LO.VERSION);
})();