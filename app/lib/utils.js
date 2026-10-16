/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Shared Utils  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIB = window.InternshipLib = window.InternshipLib || {};

  var FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  function faNum(n) {
    return String(n).replace(/\d/g, function (d) { return FA_DIGITS[+d]; });
  }

  function faDigitsToLatin(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var idx = FA_DIGITS.indexOf(s[i]);
      out += idx >= 0 ? String(idx) : s[i];
    }
    return out;
  }

  function escapeHTML(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(message, type) {
    var wrap = document.getElementById("toast-wrap");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.id = "toast-wrap";
      wrap.className = "toast-wrap";
      document.body.appendChild(wrap);
    }
    var el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    wrap.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 320);
    }, 2600);
  }

  LIB.faNum = faNum;
  LIB.faDigitsToLatin = faDigitsToLatin;
  LIB.escapeHTML = escapeHTML;
  LIB.escapeHtml = escapeHTML; // alias (timeline.js از این نام استفاده می‌کند)
  LIB.toast = toast;
})();