/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Persian Date Picker v19
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.datepicker.v19] R missing"); return; }
  var DP = R.residencyDatePicker = R.residencyDatePicker || {};
  var LIB = window.InternshipLib;

  var JMONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  var JWEEK = ["ش","ی","د","س","چ","پ","ج"];

  var _popup = null;
  var _input = null;
  var _viewJy = 0;
  var _viewJm = 0;
  var _onPick = null;

  function _fa(n) { return LIB && LIB.faNum ? LIB.faNum(n) : String(n); }
  function _esc(s) { return LIB && LIB.escapeHTML ? LIB.escapeHTML(s) : String(s == null ? "" : s); }

  function _monthLen(jy, jm) {
    if (LIB.date.jalaliMonthLength) return LIB.date.jalaliMonthLength(jy, jm);
    var n1 = LIB.date.jalaliToDayNumber(jy, jm, 1);
    var nm = jm === 12 ? { jy: jy + 1, jm: 1 } : { jy: jy, jm: jm + 1 };
    var n2 = LIB.date.jalaliToDayNumber(nm.jy, nm.jm, 1);
    return n2 - n1;
  }

  function _startWeekday(jy, jm) {
    if (LIB.date.jalaliMonthStartWeekday) return LIB.date.jalaliMonthStartWeekday(jy, jm);
    var n1 = LIB.date.jalaliToDayNumber(jy, jm, 1);
    var refDate = LIB.date.parseJalali("1405/1/1");
    var refNum = LIB.date.jalaliToDayNumber(refDate.jy, refDate.jm, refDate.jd);
    return ((n1 - refNum) % 7 + 7) % 7;
  }

  function _dateKey(jy, jm, jd) {
    if (LIB.date.dateKey) return LIB.date.dateKey(jy, jm, jd);
    return jy + "/" + jm + "/" + jd;
  }

  function _todayKey() {
    if (LIB.date.todayJalaliString) return LIB.date.todayJalaliString();
    return "";
  }

  function _close() {
    if (_popup && _popup.parentNode) _popup.parentNode.removeChild(_popup);
    _popup = null;
    _input = null;
    _onPick = null;
    document.removeEventListener("mousedown", _outside, true);
    document.removeEventListener("keydown", _escKey, true);
  }

  function _outside(e) {
    if (!_popup) return;
    if (_popup.contains(e.target)) return;
    if (_input && _input === e.target) return;
    if (e.target.classList && e.target.classList.contains("r19-date-icon")) return;
    _close();
  }

  function _escKey(e) {
    if (e.key === "Escape" && _popup) { e.preventDefault(); _close(); }
  }

  DP.open = function (inputEl, onPick) {
    if (!inputEl) return;
    _close();
    _input = inputEl;
    _onPick = onPick || null;

    var today = _todayKey();
    var base = (inputEl.value && LIB.date.parseJalali && LIB.date.parseJalali(inputEl.value)) ? inputEl.value : today;
    var p = LIB.date.parseJalali(base);
    if (p) { _viewJy = p.jy; _viewJm = p.jm; }
    else { _viewJy = 1405; _viewJm = 1; }

    _popup = document.createElement("div");
    _popup.className = "r19-cal-popup";
    document.body.appendChild(_popup);
    _render();
    _position();

    setTimeout(function () {
      document.addEventListener("mousedown", _outside, true);
      document.addEventListener("keydown", _escKey, true);
    }, 0);
  };

  DP.close = _close;

  function _position() {
    if (!_popup || !_input) return;
    var r = _input.getBoundingClientRect();
    var w = 280;
    var h = 340;
    var top = r.bottom + 8;
    var left = r.left;
    if (left + w > window.innerWidth - 12) left = window.innerWidth - w - 12;
    if (left < 12) left = 12;
    if (top + h > window.innerHeight - 12) {
      top = r.top - h - 8;
      if (top < 12) top = 12;
    }
    _popup.style.position = "fixed";
    _popup.style.top = top + "px";
    _popup.style.left = left + "px";
    _popup.style.width = w + "px";
    _popup.style.zIndex = "100000";
  }

  function _render() {
    if (!_popup) return;
    var mLen = _monthLen(_viewJy, _viewJm);
    var startWd = _startWeekday(_viewJy, _viewJm);
    var today = _todayKey();
    var curVal = _input ? _input.value : "";

    var html = '<div class="r19-cal-head">' +
      '<button class="r19-cal-nav" type="button" data-cal-prev>‹</button>' +
      '<div class="r19-cal-title">' + _esc(JMONTHS[_viewJm - 1]) + ' ' + _fa(_viewJy) + '</div>' +
      '<button class="r19-cal-nav" type="button" data-cal-next>›</button>' +
    '</div>' +
    '<div class="r19-cal-weekdays">' +
      JWEEK.map(function (d) { return '<span>' + d + '</span>'; }).join("") +
    '</div>' +
    '<div class="r19-cal-grid">';

    for (var i = 0; i < startWd; i++) html += '<span class="r19-cal-cell is-empty"></span>';
    for (var d = 1; d <= mLen; d++) {
      var key = _dateKey(_viewJy, _viewJm, d);
      var cls = "r19-cal-cell";
      if (key === today) cls += " is-today";
      if (key === curVal) cls += " is-selected";
      html += '<button class="' + cls + '" type="button" data-cal-day="' + key + '">' + _fa(d) + '</button>';
    }
    html += '</div>';

    html += '<div class="r19-cal-actions">' +
      '<button class="r19-cal-action" type="button" data-cal-today>امروز</button>' +
      '<button class="r19-cal-action" type="button" data-cal-clear>پاک کردن</button>' +
    '</div>';

    _popup.innerHTML = html;
    _wire();
  }

  function _wire() {
    _popup.querySelectorAll("[data-cal-prev]").forEach(function (b) {
      b.addEventListener("click", function () {
        _viewJm--; if (_viewJm < 1) { _viewJm = 12; _viewJy--; }
        _render();
      });
    });
    _popup.querySelectorAll("[data-cal-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        _viewJm++; if (_viewJm > 12) { _viewJm = 1; _viewJy++; }
        _render();
      });
    });
    _popup.querySelectorAll("[data-cal-day]").forEach(function (b) {
      b.addEventListener("click", function () {
        var v = b.getAttribute("data-cal-day");
        _setValue(v);
        if (_onPick) try { _onPick(v); } catch (e) {}
        _close();
      });
    });
    _popup.querySelectorAll("[data-cal-today]").forEach(function (b) {
      b.addEventListener("click", function () {
        var t = _todayKey();
        _setValue(t);
        if (_onPick) try { _onPick(t); } catch (e) {}
        _close();
      });
    });
    _popup.querySelectorAll("[data-cal-clear]").forEach(function (b) {
      b.addEventListener("click", function () {
        _setValue("");
        if (_onPick) try { _onPick(""); } catch (e) {}
        _close();
      });
    });
  }

  function _setValue(v) {
    if (!_input) return;
    _input.value = v;
    try {
      _input.dispatchEvent(new Event("input", { bubbles: true }));
      _input.dispatchEvent(new Event("change", { bubbles: true }));
    } catch (e) {}
  }

  DP.attach = function (inputEl, onPick) {
    if (!inputEl) return;
    inputEl.setAttribute("readonly", "readonly");
    inputEl.setAttribute("inputmode", "numeric");
    inputEl.setAttribute("autocomplete", "off");
    inputEl.classList.add("r19-date-input");

    var parent = inputEl.parentNode;
    if (!parent.classList.contains("r19-date-wrap")) {
      var wrap = document.createElement("div");
      wrap.className = "r19-date-wrap";
      parent.insertBefore(wrap, inputEl);
      wrap.appendChild(inputEl);
    }
    var wrapEl = inputEl.parentNode;
    var iconBtn = wrapEl.querySelector(".r19-date-icon");
    if (!iconBtn) {
      iconBtn = document.createElement("button");
      iconBtn.type = "button";
      iconBtn.className = "r19-date-icon";
      iconBtn.setAttribute("aria-label", "باز کردن تقویم");
      iconBtn.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>';
      wrapEl.appendChild(iconBtn);
    }

    function _open(e) {
      if (e) e.preventDefault();
      DP.open(inputEl, onPick);
    }
    iconBtn.addEventListener("click", _open);
    inputEl.addEventListener("click", _open);
  };

  console.log("[residency.datepicker.v19] loaded");
})();