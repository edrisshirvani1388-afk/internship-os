/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Dialog Service v20
   جایگزین alert/confirm با modal گرافیکی سازگار با تم
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency = window.InternshipResidency || {};
  var D = R.dialog = R.dialog || {};
  D.VERSION = "1.0.0";

  function _esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function _open(cfg) {
    return new Promise(function (resolve) {
      var overlay = document.createElement("div");
      overlay.className = "io-dlg-overlay";

      var icon = cfg.icon || (cfg.kind === "danger" ? "⚠️" : (cfg.kind === "info" ? "ℹ️" : "❓"));
      var confirmLabel = cfg.confirmText || "تأیید";
      var cancelLabel = cfg.cancelText || "انصراف";

      var showCancel = cfg.showCancel !== false;

      var html = '' +
        '<div class="io-dlg-box ' + (cfg.kind === "danger" ? "is-danger" : "") + '">' +
          '<div class="io-dlg-icon">' + _esc(icon) + '</div>' +
          '<div class="io-dlg-body">' +
            (cfg.title ? '<div class="io-dlg-title">' + _esc(cfg.title) + '</div>' : '') +
            (cfg.message ? '<div class="io-dlg-message">' + _esc(cfg.message).replace(/\n/g, '<br>') + '</div>' : '') +
          '</div>' +
          '<div class="io-dlg-actions">' +
            (showCancel ? '<button type="button" class="io-dlg-btn io-dlg-cancel">' + _esc(cancelLabel) + '</button>' : '') +
            '<button type="button" class="io-dlg-btn io-dlg-confirm ' + (cfg.kind === "danger" ? "is-danger" : "is-primary") + '">' + _esc(confirmLabel) + '</button>' +
          '</div>' +
        '</div>';

      overlay.innerHTML = html;
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add("is-open"); });

      function close(value) {
        overlay.classList.remove("is-open");
        setTimeout(function () {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        }, 220);
        resolve(value);
      }

      var confirmBtn = overlay.querySelector(".io-dlg-confirm");
      var cancelBtn = overlay.querySelector(".io-dlg-cancel");

      confirmBtn.addEventListener("click", function () { close(true); });
      if (cancelBtn) cancelBtn.addEventListener("click", function () { close(false); });
      overlay.addEventListener("click", function (e) {
        if (e.target === overlay) close(false);
      });

      // keyboard
      function _keyHandler(e) {
        if (e.key === "Enter") { close(true); document.removeEventListener("keydown", _keyHandler); }
        else if (e.key === "Escape" && showCancel) { close(false); document.removeEventListener("keydown", _keyHandler); }
      }
      document.addEventListener("keydown", _keyHandler);

      setTimeout(function () { confirmBtn.focus(); }, 100);
    });
  }

  /** async confirm — Promise<boolean> */
  D.confirm = function (message, options) {
    options = options || {};
    return _open({
      message: message,
      title: options.title || "",
      kind: options.kind || (options.danger ? "danger" : "question"),
      confirmText: options.confirmText || (options.danger ? "بله، انجام بده" : "تأیید"),
      cancelText: options.cancelText || "انصراف",
      icon: options.icon || null
    });
  };

  /** async alert — Promise<void> */
  D.alert = function (message, options) {
    options = options || {};
    return _open({
      message: message,
      title: options.title || "",
      kind: options.kind || "info",
      confirmText: options.confirmText || "باشه",
      showCancel: false,
      icon: options.icon || "ℹ️"
    });
  };

  /** جایگزین سراسری window.confirm و window.alert */
  D.install = function () {
    window.__origConfirm = window.confirm;
    window.__origAlert = window.alert;
    window.confirm = function (msg) {
      // native blocking حذف شد — fallback sync برای سازگاری
      // ولی برنامه‌های داخلی باید از R.dialog.confirm استفاده کنند
      try {
        // synchronous fallback: چون confirm sync است، اما modal async است
        // از پنجره‌ی native استفاده می‌کنیم در صورت نیاز
        return window.__origConfirm.call(window, msg);
      } catch (e) { return false; }
    };
    // alert هم همین‌طور — نگه‌داشتیم که خطای JS نده
    window.alert = function (msg) { return window.__origAlert.call(window, msg); };
  };

  D.__tests = function () {
    var t = [];
    t.push({ name: "T1 confirm", ok: typeof D.confirm === "function" });
    t.push({ name: "T2 alert", ok: typeof D.alert === "function" });
    t.push({ name: "T3 version 1.0.0", ok: D.VERSION === "1.0.0" });
    return t;
  };

  console.log("[dialog.v20] loaded v" + D.VERSION);
})();