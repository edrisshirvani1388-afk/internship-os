(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[workspace.keyboard.v18] R missing"); return; }
  var WS = R.plannerWorkspace;
  if (!WS) { console.warn("[workspace.keyboard.v18] WS missing"); return; }
  var NAV = R.calendarNavigation;
  var LIB = window.InternshipLib;
  var KB = R.workspaceKeyboard = R.workspaceKeyboard || {};

  var _moveState = null;
  var _lastFocusedId = null;

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _addDays(d, n) {
    if (!LIB || !d) return d;
    var p = LIB.date.parseJalali(d);
    if (!p) return d;
    var r = LIB.date.addJalaliDays(p.jy, p.jm, p.jd, n);
    return LIB.date.dateKey(r.jy, r.jm, r.jd);
  }

  function _isMoveable(a) {
    if (!a) return false;
    if (a.locked) return false;
    if (a.status === "completed" || a.status === "cancelled" || a.status === "skipped") return false;
    if (a.plannedDate && LIB && LIB.date && LIB.date.compareJalaliDate(a.plannedDate, _today()) < 0) return false;
    return true;
  }

  KB.isMoveable = _isMoveable;
  KB.getState = function () { return _moveState ? JSON.parse(JSON.stringify(_moveState)) : null; };
  KB.isActive = function () { return !!_moveState; };

  KB.startMove = function (activityId) {
    if (_moveState) KB.cancelMove();
    var s = _state();
    if (!s || !s.residency) return { ok: false, reason: "no_state" };
    var a = (s.residency.activities || []).find(function (x) { return x && x.id === activityId; });
    if (!a) return { ok: false, reason: "not_found" };
    if (!_isMoveable(a)) return { ok: false, reason: "protected" };
    _lastFocusedId = activityId;
    _moveState = {
      activityId: activityId,
      title: a.title || "",
      original: {
        date: a.plannedDate,
        time: a.plannedStartTime || null,
        duration: a.plannedDurationMinutes | 0
      },
      currentDate: a.plannedDate,
      currentTime: a.plannedStartTime || "08:00",
      duration: a.plannedDurationMinutes | 0,
      dirty: false
    };
    _highlightMoving(activityId);
    _renderPreview();
    _announce("Move started for " + (a.title || "activity") + " at " + _moveState.currentDate + " " + _moveState.currentTime);
    return { ok: true, state: KB.getState() };
  };

  KB.move = function (direction, big) {
    if (!_moveState) return { ok: false, reason: "no_move" };
    var st = _moveState;
    var step = big ? 60 : 15;
    var dayStep = big ? 7 : 1;

    if (direction === "up") {
      var cur = NAV.timeToMinutes(st.currentTime) || 0;
      var next = Math.max(6 * 60, cur - step);
      st.currentTime = NAV.minutesToTime(next);
    } else if (direction === "down") {
      var cur2 = NAV.timeToMinutes(st.currentTime) || 0;
      var maxTime = 23 * 60 - st.duration;
      var next2 = Math.min(maxTime, cur2 + step);
      st.currentTime = NAV.minutesToTime(next2);
    } else if (direction === "left") {
      st.currentDate = _addDays(st.currentDate, -dayStep);
    } else if (direction === "right") {
      st.currentDate = _addDays(st.currentDate, dayStep);
    } else {
      return { ok: false, reason: "bad_direction" };
    }
    st.currentTime = NAV.snapToGrid(st.currentTime) || st.currentTime;
    st.dirty = true;
    _renderPreview();
    _announce("Target " + st.currentDate + " " + st.currentTime);
    return { ok: true, state: KB.getState() };
  };

  KB.cancelMove = function () {
    var id = _moveState ? _moveState.activityId : null;
    _moveState = null;
    _clearPreview();
    _unhighlightMoving();
    _restoreFocus(id);
    _announce("Move cancelled");
    return { ok: true };
  };

  KB.commitMove = function () {
    if (!_moveState) return { ok: false, reason: "no_move" };
    var st = _moveState;
    if (!st.dirty) {
      // no-op
      var id0 = st.activityId;
      _moveState = null;
      _clearPreview();
      _unhighlightMoving();
      _restoreFocus(id0);
      return { ok: false, reason: "no_op" };
    }
    var id = st.activityId;
    var newDate = st.currentDate;
    var newTime = st.currentTime;
    var result;
    if (typeof WS._tryMoveActivityTime === "function") {
      try { result = WS._tryMoveActivityTime(id, newDate, newTime); }
      catch (e) { result = { ok: false, error: String(e.message || e) }; }
    }
    _moveState = null;
    _clearPreview();
    _unhighlightMoving();
    _restoreFocus(id);
    _announce("Move committed");
    return { ok: true, result: result };
  };

  function _highlightMoving(id) {
    var el = document.querySelector('[data-pw14-act="' + id + '"]');
    if (el) {
      el.classList.add("is-moving");
      el.setAttribute("aria-grabbed", "true");
    }
  }

  function _unhighlightMoving() {
    document.querySelectorAll(".pw14-card.is-moving").forEach(function (el) {
      el.classList.remove("is-moving");
      el.removeAttribute("aria-grabbed");
    });
  }

  function _restoreFocus(id) {
    if (!id) return;
    setTimeout(function () {
      var el = document.querySelector('[data-pw14-act="' + id + '"]');
      if (el && typeof el.focus === "function") el.focus();
    }, 50);
  }

  function _renderPreview() {
    if (!_moveState) return;
    var visEl = document.getElementById("pw18-move-vis");
    if (!visEl) {
      visEl = document.createElement("div");
      visEl.id = "pw18-move-vis";
      visEl.className = "pw18-move-vis";
      visEl.setAttribute("role", "status");
      document.body.appendChild(visEl);
    }
    visEl.style.display = "block";
    var esc = (LIB && LIB.escapeHTML) ? LIB.escapeHTML : function (s) { return String(s == null ? "" : s); };
    visEl.innerHTML = '<div class="pw18-mv-title">🚀 در حال حرکت</div>' +
      '<div class="pw18-mv-row"><span>فعالیت:</span><strong>' + esc(_moveState.title || "—") + '</strong></div>' +
      '<div class="pw18-mv-row"><span>هدف:</span><strong>' + esc(_moveState.currentDate) + ' — ' + esc(_moveState.currentTime) + '</strong></div>' +
      '<div class="pw18-mv-row"><span>مدت:</span>' + esc(_moveState.duration) + ' دقیقه</div>' +
      '<div class="pw18-mv-help">↑/↓ زمان (۱۵ د) · ←/→ روز · Shift+Arrow پرش بزرگ · Enter تأیید · Esc لغو</div>';
  }

  function _clearPreview() {
    var el = document.getElementById("pw18-move-vis");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function _announce(msg) {
    var liveEl = document.getElementById("pw18-move-live");
    if (!liveEl) {
      liveEl = document.createElement("div");
      liveEl.id = "pw18-move-live";
      liveEl.setAttribute("aria-live", "polite");
      liveEl.setAttribute("aria-atomic", "true");
      liveEl.style.position = "absolute";
      liveEl.style.left = "-9999px";
      liveEl.style.width = "1px";
      liveEl.style.height = "1px";
      liveEl.style.overflow = "hidden";
      document.body.appendChild(liveEl);
    }
    liveEl.textContent = msg;
  }

  // Global keydown with capture phase so we run before core ESC handler
  document.addEventListener("keydown", function (e) {
    var overlay = document.querySelector(".pw14-overlay") || document.querySelector(".pw15-overlay");
    if (!overlay) return;

    if (_moveState) {
      // Active move — handle keys
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); KB.cancelMove(); return; }
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); KB.commitMove(); return; }
      if (e.key === "ArrowUp")    { e.preventDefault(); e.stopPropagation(); KB.move("up", e.shiftKey); return; }
      if (e.key === "ArrowDown")  { e.preventDefault(); e.stopPropagation(); KB.move("down", e.shiftKey); return; }
      if (e.key === "ArrowLeft")  { e.preventDefault(); e.stopPropagation(); KB.move("left", e.shiftKey); return; }
      if (e.key === "ArrowRight") { e.preventDefault(); e.stopPropagation(); KB.move("right", e.shiftKey); return; }
      return;
    }

    // Not moving — Enter/Space on focused card starts move
    if (e.key === "Enter" || e.key === " ") {
      var focused = document.activeElement;
      if (focused && focused.classList && focused.classList.contains("pw14-card")) {
        var id = focused.getAttribute("data-pw14-act");
        if (id) {
          var res = KB.startMove(id);
          if (!res.ok) {
            WS._toast && WS._toast("❌ " + (res.reason === "protected" ? "این فعالیت قابل جابه‌جایی نیست" : res.reason));
          } else {
            e.preventDefault();
          }
        }
      }
    }
  }, true);

  // Add focusability + aria to cards
  var _origPostWire = WS._postWire;
  WS._postWire = function () {
    if (typeof _origPostWire === "function") { try { _origPostWire(); } catch (e) {} }
    var o = document.querySelector(".pw14-overlay");
    if (!o) return;
    o.querySelectorAll(".pw14-card").forEach(function (card) {
      if (!card.hasAttribute("tabindex")) card.setAttribute("tabindex", "0");
      if (!card.getAttribute("role")) card.setAttribute("role", "button");
      var id = card.getAttribute("data-pw14-act");
      var titleEl = card.querySelector(".pw14-card-title");
      var title = (titleEl && titleEl.textContent) || "—";
      if (!card.getAttribute("aria-label")) {
        card.setAttribute("aria-label", "فعالیت: " + title + " — Enter برای شروع حرکت، Esc برای لغو");
      }
    });
  };

  console.log("[workspace.v18.keyboard] loaded");
})();