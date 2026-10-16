/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Timeline & Conflict Engine  ·  v1.3.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function faNum(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }

  function timeToMinutes(t) {
    if (!t || typeof t !== "string") return null;
    var parts = t.split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function minutesToTime(min) {
    min = Math.max(0, Math.min(24 * 60, min));
    var h = Math.floor(min / 60);
    var m = min % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  var AREA_COLORS = {
    clinical:   "20, 184, 166",
    study:      "99, 102, 241",
    emergency:  "249, 115, 22",
    procedures: "6, 182, 212",
    residency:  "168, 85, 247",
    body:       "34, 197, 94",
    income:     "234, 179, 8",
    life:       "236, 72, 153"
  };
  function getAreaColor(areaId) {
    return AREA_COLORS[areaId] || "148, 163, 184";
  }

  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ═══════ Conflict Detection ═══════ */
  function detectConflicts(task, allTasks) {
    if (!task || !task.date || !task.time || !task.durationMinutes) return [];
    var myStart = timeToMinutes(task.time);
    if (myStart === null) return [];
    var myEnd = myStart + task.durationMinutes;

    var conflicts = [];
    (allTasks || []).forEach(function (t) {
      if (!t || t.id === task.id) return;
      if (t.date !== task.date) return;
      if (!t.time || !t.durationMinutes) return;
      if (t.completed) return;
      var tStart = timeToMinutes(t.time);
      if (tStart === null) return;
      var tEnd = tStart + t.durationMinutes;
      if (myStart < tEnd && tStart < myEnd) {
        conflicts.push({
          task: t,
          overlapStart: Math.max(myStart, tStart),
          overlapEnd: Math.min(myEnd, tEnd),
          overlapMinutes: Math.min(myEnd, tEnd) - Math.max(myStart, tStart)
        });
      }
    });
    return conflicts;
  }

  /* ═══════ Day Timeline ═══════ */
  function _tlToast(msg) {
    var w = document.getElementById("toast-wrap");
    if (!w) {
      w = document.createElement("div");
      w.id = "toast-wrap";
      w.className = "toast-wrap";
      document.body.appendChild(w);
    }
    var el = document.createElement("div");
    el.className = "toast";
    el.textContent = msg;
    w.appendChild(el);
    requestAnimationFrame(function () { el.classList.add("show"); });
    setTimeout(function () {
      el.classList.remove("show");
      setTimeout(function () { el.remove(); }, 320);
    }, 2400);
  }
  function renderDayTimeline(container, dateStr, tasks, shifts, options) {
    options = options || {};
    if (!container) return;

    var startHour = 6, endHour = 24;
    try {
      var sh = parseInt(localStorage.getItem("internship-os.timeline.startHour"), 10);
      var eh = parseInt(localStorage.getItem("internship-os.timeline.endHour"), 10);
      if (!isNaN(sh) && sh >= 0 && sh <= 22) startHour = sh;
      if (!isNaN(eh) && eh >= startHour + 4 && eh <= 24) endHour = eh;
    } catch (ex) {}

    var viewStart = startHour * 60;
    var viewEnd = endHour * 60;
    var span = viewEnd - viewStart;

    var dayTasks = (tasks || []).filter(function (t) {
      return t && t.date === dateStr && t.time && t.durationMinutes && !t.completed;
    }).sort(function (a, b) { return (a.time || "").localeCompare(b.time || ""); });

    var dayShifts = (shifts || []).filter(function (s) {
      return s && s.date === dateStr && s.startTime;
    });

    var esc = function (s) {
      return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    };

    var hourMarks = [];
    var step = (endHour - startHour) > 12 ? 2 : 1;
    for (var h = startHour; h <= endHour; h += step) hourMarks.push(h);
    if (hourMarks[hourMarks.length - 1] !== endHour) hourMarks.push(endHour);

    var nowStr = "";
    try {
      var n = new Date();
      nowStr = faNum(String(n.getHours()).padStart(2, "0")) + ":" + faNum(String(n.getMinutes()).padStart(2, "0"));
    } catch (ex) {}

    var html = '<div class="tl-wrap">';
    html += '<div class="tl-head">'
      + '<div class="tl-head-left"><span class="tl-head-icon">📅</span><span class="tl-head-title">برنامه‌ی روز</span></div>'
      + '<div class="tl-head-right">'
      + '<span class="tl-now-pill">🕐 ' + nowStr + '</span>'
      + '<button type="button" class="tl-edit-btn" data-tl-edit title="حالت ویرایش">✏️</button>'
      + '<button type="button" class="tl-range-btn" data-tl-range title="تغییر بازه‌ی ساعتی">⚙</button>'
      + '</div></div>';

    if (dayTasks.length === 0 && dayShifts.length === 0) {
      html += '<div class="tl-empty"><span class="tl-empty-icon">🌙</span><span>امروز تسکی با ساعت ثبت نشده</span></div></div>';
      container.innerHTML = html;
      return;
    }

    html += '<div class="tl-axis">';
    hourMarks.forEach(function (h) {
      var pct = ((h * 60 - viewStart) / span) * 100;
      html += '<span class="tl-hour" style="left:' + pct + '%">' + faNum(h) + '</span>';
    });
    html += '</div>';

    html += '<div class="tl-track" data-tl-track="1">';
    hourMarks.forEach(function (h) {
      if (h === startHour || h === endHour) return;
      var pct = ((h * 60 - viewStart) / span) * 100;
      html += '<span class="tl-gridline" style="left:' + pct + '%"></span>';
    });

    dayShifts.forEach(function (s) {
      var st = timeToMinutes(s.startTime);
      var en = timeToMinutes(s.endTime);
      if (st === null) return;
      if (en === null || en <= st) en = st + 24 * 60;
      var cs = Math.max(st, viewStart), ce = Math.min(en, viewEnd);
      if (ce <= cs) return;
      var l = ((cs - viewStart) / span) * 100;
      var w = ((ce - cs) / span) * 100;
      html += '<div class="tl-shift" style="left:' + l + '%;width:' + w + '%"></div>';
    });

    dayTasks.forEach(function (t) {
      var st = timeToMinutes(t.time);
      if (st === null) return;
      var en = st + t.durationMinutes;
      var cs = Math.max(st, viewStart), ce = Math.min(en, viewEnd);
      if (ce <= cs) return;
      var l = ((cs - viewStart) / span) * 100;
      var w = ((ce - cs) / span) * 100;
      var color = getAreaColor(t.areaId);
      var endStr = minutesToTime(en);
      var tooltip = esc(t.title) + " · " + faNum(t.time) + " تا " + faNum(endStr) + " · " + formatDurShort(t.durationMinutes);
      html += '<div class="tl-task" data-task-id="' + t.id + '" '
        + 'style="left:' + l + '%;width:' + w + '%;--area-color:' + color + '" title="' + tooltip + '"></div>';
    });

    html += '</div>';
    html += '<div class="tl-list">';

    var allItems = [];
    dayTasks.forEach(function (t) {
      var st = timeToMinutes(t.time);
      allItems.push({ kind: "task", t: t, st: st, en: st + t.durationMinutes });
    });
    dayShifts.forEach(function (s) {
      var st = timeToMinutes(s.startTime);
      var en = timeToMinutes(s.endTime);
      if (en === null || en <= st) en = st + 24 * 60;
      allItems.push({ kind: "shift", s: s, st: st, en: en });
    });
    allItems.sort(function (a, b) { return a.st - b.st; });

    allItems.forEach(function (x) {
      if (x.kind === "task") {
        var t = x.t;
        var color = getAreaColor(t.areaId);
        html += '<button type="button" class="tl-list-item" data-hl-task="' + t.id + '" data-open-task="' + t.id + '" style="--area-color:' + color + '">'
          + '<span class="tl-list-dot"></span>'
          + '<span class="tl-list-time">' + faNum(t.time) + '→' + faNum(minutesToTime(x.en)) + '</span>'
          + '<span class="tl-list-title">' + esc(t.title) + '</span>'
          + '<span class="tl-list-dur">' + formatDurShort(t.durationMinutes) + '</span>'
          + '</button>';
      } else {
        var s = x.s;
        html += '<div class="tl-list-item tl-list-shift" style="--area-color:244,63,94" data-shift-type="' + esc(s.type || "") + '" data-shift-start="' + esc(s.startTime || "") + '" data-shift-end="' + esc(s.endTime || "") + '">'
          + '<span class="tl-list-dot"></span>'
          + '<span class="tl-list-time">' + faNum(s.startTime) + '→' + faNum(minutesToTime(x.en)) + '</span>'
          + '<span class="tl-list-title">🚨 ' + esc(s.type || "کشیک") + '</span>'
          + '</div>';
      }
    });

    html += '</div></div>';
    container.innerHTML = html;

    setTimeout(function () {
      _tlWireInteractions(container, dateStr, tasks, shifts, options, viewStart, viewEnd, span);
    }, 0);
  }

  function _tlShowShiftPopover(shEl) {
    var ex = document.querySelector(".tl-shift-pop");
    if (ex) ex.remove();

    var label = shEl.getAttribute("data-shift-type") || "کشیک";
    var startT = shEl.getAttribute("data-shift-start") || "";
    var endT = shEl.getAttribute("data-shift-end") || "";
    var pop = document.createElement("div");
    pop.className = "tl-shift-pop";
    var inner = '<div class="tl-shift-pop-head">🚨 ' + label + '</div>';
    if (startT) inner += '<div class="tl-shift-pop-time">' + startT + (endT ? (' → ' + endT) : '') + '</div>';
    pop.innerHTML = inner;

    var rect = shEl.getBoundingClientRect();
    pop.style.position = "fixed";
    pop.style.top = (rect.top - 8) + "px";
    pop.style.left = (rect.left + rect.width / 2) + "px";
    pop.style.transform = "translate(-50%, -100%)";

    document.body.appendChild(pop);
    requestAnimationFrame(function () { pop.classList.add("is-show"); });

    var close = function (ev) {
      if (ev && pop.contains(ev.target)) return;
      pop.classList.remove("is-show");
      setTimeout(function () { pop.remove(); }, 200);
      document.removeEventListener("click", close);
    };
    setTimeout(function () { document.addEventListener("click", close); }, 50);
  }
  function _tlWireInteractions(container, dateStr, tasks, shifts, options, viewStart, viewEnd, span) {
    container.querySelectorAll(".tl-list-item[data-hl-task]").forEach(function (li) {
      var id = li.getAttribute("data-hl-task");
      var block = container.querySelector('.tl-task[data-task-id="' + id + '"]');
      li.addEventListener("mouseenter", function () { if (block) block.classList.add("is-hl"); });
      li.addEventListener("mouseleave", function () { if (block) block.classList.remove("is-hl"); });
    });

    container.querySelectorAll(".tl-task").forEach(function (block) {
      block.addEventListener("mousedown", function (e) {
        var editMode = localStorage.getItem("internship-os.timeline.editMode") === "1";
        var taskId = block.getAttribute("data-task-id");

        if (!editMode) {
          try { document.dispatchEvent(new CustomEvent("io-open-task", { detail: { id: taskId } })); } catch (ex) {}
          return;
        }

        e.preventDefault();
        e.stopPropagation();

        var state = (window.__os && window.__os.getState) ? window.__os.getState() : null;
        if (!state) return;
        var task = state.tasks.find(function (x) { return x.id === taskId; });
        if (!task) return;

        var track = block.parentElement;
        var rect = track.getBoundingClientRect();
        var origStartMin = timeToMinutes(task.time);
        if (origStartMin === null) return;
        var durMin = task.durationMinutes || 60;
        var origEndMin = origStartMin + durMin;
        var origLeftPct = parseFloat(block.style.left) || 0;
        var origWidthPct = parseFloat(block.style.width) || 0;

        // تعیین mode بر اساس موقعیت موس
        var blockRect = block.getBoundingClientRect();
        var relX = e.clientX - blockRect.left;
        var edgeZone = Math.min(12, blockRect.width * 0.25);
        var mode = "move";
        if (relX < edgeZone) mode = "resize-left";
        else if (relX > blockRect.width - edgeZone) mode = "resize-right";

        var startX = e.clientX;
        var isDragging = false;
        var finalStart = origStartMin;
        var finalEnd = origEndMin;
        var minDur = 5;

        block.classList.add("is-dragging");
        if (mode !== "move") block.classList.add("is-resizing");

        var onMove = function (ev) {
          var dx = ev.clientX - startX;
          if (Math.abs(dx) > 3) isDragging = true;
          if (!isDragging) return;

          var dPct = (dx / rect.width) * 100;

          if (mode === "move") {
            var newLeft = origLeftPct + dPct;
            var w = origWidthPct;
            if (newLeft < 0) newLeft = 0;
            if (newLeft + w > 100) newLeft = 100 - w;
            block.style.left = newLeft + "%";
            var ns = viewStart + (newLeft / 100) * span;
            ns = Math.round(ns / 5) * 5;
            ns = Math.max(viewStart, Math.min(viewEnd - durMin, ns));
            finalStart = ns;
            finalEnd = ns + durMin;
          } else if (mode === "resize-left") {
            var newLeftPct = origLeftPct + dPct;
            var minLeftPct = (origLeftPct + origWidthPct) - (minDur / span) * 100;
            if (newLeftPct < 0) newLeftPct = 0;
            if (newLeftPct > minLeftPct) newLeftPct = minLeftPct;
            block.style.left = newLeftPct + "%";
            block.style.width = (origLeftPct + origWidthPct - newLeftPct) + "%";
            var nsl = viewStart + (newLeftPct / 100) * span;
            nsl = Math.round(nsl / 5) * 5;
            nsl = Math.max(viewStart, Math.min(viewEnd - minDur, nsl));
            finalStart = nsl;
            finalEnd = origEndMin;
          } else if (mode === "resize-right") {
            var newRightPct = origLeftPct + origWidthPct + dPct;
            var minRightPct = origLeftPct + (minDur / span) * 100;
            if (newRightPct > 100) newRightPct = 100;
            if (newRightPct < minRightPct) newRightPct = minRightPct;
            block.style.width = (newRightPct - origLeftPct) + "%";
            var ner = viewStart + (newRightPct / 100) * span;
            ner = Math.round(ner / 5) * 5;
            ner = Math.min(viewEnd, Math.max(viewStart + minDur, ner));
            finalStart = origStartMin;
            finalEnd = ner;
          }

          block.setAttribute("title", faNum(minutesToTime(finalStart)) + " → " + faNum(minutesToTime(finalEnd)) + " · " + formatDurShort(finalEnd - finalStart));
        };

        var onUp = function () {
          document.removeEventListener("mousemove", onMove);
          document.removeEventListener("mouseup", onUp);
          block.classList.remove("is-dragging", "is-resizing");

          if (!isDragging) {
            try { document.dispatchEvent(new CustomEvent("io-open-task", { detail: { id: taskId } })); } catch (ex) {}
            return;
          }

          var newDur = finalEnd - finalStart;
          if (newDur < minDur) newDur = minDur;
          var newTime = minutesToTime(finalStart);

          if (newTime === task.time && newDur === task.durationMinutes) {
            renderDayTimeline(container, dateStr, tasks, shifts, options);
            return;
          }

          task.time = newTime;
          task.durationMinutes = newDur;
          task.updatedAt = Date.now();
          if (window.__os.saveState) window.__os.saveState();
          _tlToast("⏰ " + task.title + " → " + faNum(newTime) + " (" + formatDurShort(newDur) + ")");

          setTimeout(function () {
            if (window.__os && window.__os.render) window.__os.render();
          }, 200);
        };

        document.addEventListener("mousemove", onMove);
        document.addEventListener("mouseup", onUp);
      });
    });
    container.querySelectorAll("[data-open-task]").forEach(function (li) {
      li.addEventListener("click", function () {
        var id = li.getAttribute("data-open-task");
        if (id) { try { document.dispatchEvent(new CustomEvent("io-open-task", { detail: { id: id } })); } catch (ex) {} }
      });
    });

    var editBtn = container.querySelector("[data-tl-edit]");
    var editOn = localStorage.getItem("internship-os.timeline.editMode") === "1";
    if (editOn) container.classList.add("tl-is-edit");
    if (editBtn) {
      editBtn.classList.toggle("is-active", editOn);
      editBtn.addEventListener("click", function () {
        var now = !(localStorage.getItem("internship-os.timeline.editMode") === "1");
        try { localStorage.setItem("internship-os.timeline.editMode", now ? "1" : "0"); } catch (ex) {}
        renderDayTimeline(container, dateStr, tasks, shifts, options);
      });
    }

    container.querySelectorAll(".tl-list-shift").forEach(function (sh) {
      sh.addEventListener("click", function () {
        if (localStorage.getItem("internship-os.timeline.editMode") === "1") return;
        _tlShowShiftPopover(sh);
      });
    });

    var rangeBtn = container.querySelector("[data-tl-range]");
    if (rangeBtn) rangeBtn.addEventListener("click", function () {
      _tlPromptRange(viewStart / 60, viewEnd / 60, container, dateStr, tasks, shifts, options);
    });
  }
  function _tlPromptRange(curStart, curEnd, container, dateStr, tasks, shifts, options) {
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = '<div class="modal" style="max-width:360px">'
      + '<h3>بازه‌ی نمایش نوار</h3>'
      + '<p style="margin:0 0 14px;font-size:12.5px;color:var(--text-muted)">ساعت‌هایی که می‌خوای توی نوار دیده بشن رو انتخاب کن.</p>'
      + '<div class="form-grid-2">'
      + '<div class="form-row"><label>از</label><input type="number" id="tl-rs" min="0" max="22" value="' + curStart + '"></div>'
      + '<div class="form-row"><label>تا</label><input type="number" id="tl-re" min="1" max="24" value="' + curEnd + '"></div>'
      + '</div>'
      + '<div class="modal-actions"><button class="btn ghost" type="button" data-close>انصراف</button><button class="btn primary" type="button" data-confirm>اعمال</button></div>'
      + '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    var close = function () { overlay.classList.remove("open"); setTimeout(function () { overlay.remove(); }, 200); };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("[data-confirm]").addEventListener("click", function () {
      var s = parseInt(overlay.querySelector("#tl-rs").value, 10);
      var e = parseInt(overlay.querySelector("#tl-re").value, 10);
      if (isNaN(s) || isNaN(e) || e <= s + 3) return;
      try {
        localStorage.setItem("internship-os.timeline.startHour", String(s));
        localStorage.setItem("internship-os.timeline.endHour", String(e));
      } catch (ex) {}
      close();
      renderDayTimeline(container, dateStr, tasks, shifts, options);
    });
    overlay.addEventListener("click", function (ev) { if (ev.target === overlay) close(); });
  }
  function formatDurShort(min) {
    min = parseInt(min, 10) || 0;
    if (min < 60) return faNum(min) + "د";
    var h = Math.floor(min / 60);
    var r = min % 60;
    if (r === 0) return faNum(h) + " ساعت";
    if (r === 30) return faNum(h) + ".۵ ساعت";
    return faNum(h) + ":" + faNum(String(r).padStart(2, "0"));
  }

  function durationRangeChip(task) {
    if (!task || !task.time || !task.durationMinutes) return "";
    var start = timeToMinutes(task.time);
    if (start === null) return "";
    var end = start + task.durationMinutes;
    return '<span class="task-range-chip">⏰ ' + faNum(minutesToTime(start)) + '→' + faNum(minutesToTime(end)) + ' · ' + formatDurShort(task.durationMinutes) + '</span>';
  }
  function updateDurationPreview(prefix) {
    var container = document.querySelector('[data-preview-for="' + prefix + '"]');
    if (!container) return;

    var timeEl = document.querySelector('[data-tp="' + prefix + '"]');
    var durEl = document.querySelector('[data-dur="' + prefix + '"]');
    if (!timeEl && !durEl) { container.innerHTML = ""; return; }

    var time = "";
    if (timeEl) {
      var h = timeEl.querySelector(".tp-h").value.trim();
      var m = timeEl.querySelector(".tp-m").value.trim();
      if (h) {
        if (!m) m = "00";
        h = String(parseInt(h, 10) || 0).padStart(2, "0");
        m = String(parseInt(m, 10) || 0).padStart(2, "0");
        time = h + ":" + m;
      }
    }

    var dur = null;
    if (durEl) {
      var manual = durEl.querySelector(".dur-manual-input");
      if (manual && manual.value) {
        var v = parseInt(manual.value, 10);
        if (!isNaN(v) && v >= 5) dur = v;
      }
      if (dur === null) {
        var s = parseInt(durEl.querySelector(".dur-slider").value, 10);
        if (!isNaN(s)) dur = s;
      }
    }

    if (!time && !dur) {
      container.innerHTML = '<div class="task-prev-empty">'
        + '<span class="task-prev-empty-icon">⏰</span>'
        + '<span>برای دیدن بازه‌ی زمانی، ساعت و مدت رو تنظیم کن</span>'
        + '</div>';
      return;
    }

    if (time && !dur) {
      container.innerHTML = '<div class="task-prev task-prev-partial">'
        + '<div class="task-prev-head">'
        + '<span class="task-prev-icon">⏰</span>'
        + '<span class="task-prev-start">' + faNum(time) + '</span>'
        + '<span class="task-prev-partial-hint">مدت تنظیم نشده</span>'
        + '</div></div>';
      return;
    }

    if (!time && dur) {
      container.innerHTML = '<div class="task-prev task-prev-partial">'
        + '<div class="task-prev-head">'
        + '<span class="task-prev-icon">⏱️</span>'
        + '<span class="task-prev-partial-hint">ساعت شروع تنظیم نشده</span>'
        + '<span class="task-prev-dur">' + formatDurShort(dur) + '</span>'
        + '</div></div>';
      return;
    }

    var startMin = timeToMinutes(time);
    if (startMin === null) { container.innerHTML = ""; return; }
    var endMin = startMin + dur;
    var endTime = minutesToTime(endMin);
    var durLabel = formatDurShort(dur);

    var viewStart = 6 * 60;
    var viewEnd = 24 * 60;
    var span = viewEnd - viewStart;
    var cStart = Math.max(startMin, viewStart);
    var cEnd = Math.min(endMin, viewEnd);
    var leftPct = ((cStart - viewStart) / span) * 100;
    var widthPct = ((cEnd - cStart) / span) * 100;
    if (leftPct < 0) leftPct = 0;
    if (leftPct > 100) leftPct = 100;
    if (widthPct < 1) widthPct = 1;
    if (leftPct + widthPct > 100) widthPct = 100 - leftPct;

    var busyHTML = "";
    var state = (window.__os && window.__os.getState) ? window.__os.getState() : null;
    var dp = document.querySelector('[data-dp="' + prefix + '"]');
    var dateStr = "";
    if (dp) {
      var dy = dp.querySelector(".dp-h-year").value;
      var dm = dp.querySelector(".dp-h-month").value;
      var dd = dp.querySelector(".dp-h-day").value;
      if (dy && dm && dd) dateStr = dy + "/" + dm + "/" + dd;
    }
    if (state && dateStr && Array.isArray(state.tasks)) {
      state.tasks.forEach(function (t) {
        if (!t || t.date !== dateStr) return;
        if (!t.time || !t.durationMinutes) return;
        if (t.completed) return;
        var ts = timeToMinutes(t.time);
        if (ts === null) return;
        var te = ts + t.durationMinutes;
        if (ts === startMin && t.durationMinutes === dur) return;
        var cs = Math.max(ts, viewStart);
        var ce = Math.min(te, viewEnd);
        if (ce <= cs) return;
        var l = ((cs - viewStart) / span) * 100;
        var w = ((ce - cs) / span) * 100;
        var cc = getAreaColor(t.areaId);
        var tt = String(t.title || "").slice(0, 40).replace(/[<>&"]/g, "");
        busyHTML += '<div class="task-prev-busy" style="left:' + l + '%;width:' + w + '%;--area-color:' + cc + '" title="' + faNum(t.time) + ' ' + tt + '"></div>';
      });
    }

    container.innerHTML = ''
      + '<div class="task-prev">'
      + '<div class="task-prev-head">'
      + '<span class="task-prev-icon">⏰</span>'
      + '<span class="task-prev-start">' + faNum(time) + '</span>'
      + '<span class="task-prev-arrow">→</span>'
      + '<span class="task-prev-end">' + faNum(endTime) + '</span>'
      + '<span class="task-prev-dur">' + durLabel + '</span>'
      + '</div>'
      + '<div class="task-prev-track">'
      + busyHTML
      + '<div class="task-prev-fill" data-drag-fill="' + prefix + '" style="left:' + leftPct + '%;width:' + widthPct + '%">'
      + '<span class="task-prev-handle task-prev-handle-left" data-h="left"></span>'
      + '<span class="task-prev-handle task-prev-handle-right" data-h="right"></span>'
      + '</div>'
      + '</div>'
      + '</div>';

    setTimeout(function () { _setupDrag(prefix); }, 0);
  }

  function _setupDrag(prefix) {
    var container = document.querySelector('[data-preview-for="' + prefix + '"]');
    if (!container) return;
    var fill = container.querySelector("[data-drag-fill]");
    if (!fill || fill.dataset.dragReady === "1") return;
    fill.dataset.dragReady = "1";

    fill.addEventListener("mousedown", function (e) {
      e.preventDefault();
      e.stopPropagation();

      var isLeft = e.target.classList && e.target.classList.contains("task-prev-handle-left");
      var isRight = e.target.classList && e.target.classList.contains("task-prev-handle-right");
      var mode = isLeft ? "resize-left" : isRight ? "resize-right" : "move";

      var track = fill.parentElement;
      var rect = track.getBoundingClientRect();
      var timeEl = document.querySelector('[data-tp="' + prefix + '"]');
      var durEl = document.querySelector('[data-dur="' + prefix + '"]');
      if (!timeEl) return;

      var h = timeEl.querySelector(".tp-h").value;
      var m = timeEl.querySelector(".tp-m").value;
      if (!h) return;
      if (!m) m = "00";
      var cur = String(parseInt(h, 10)).padStart(2, "0") + ":" + String(parseInt(m, 10)).padStart(2, "0");
      var curStart = timeToMinutes(cur);
      if (curStart === null) return;

      var durVal = 60;
      if (durEl) {
        var manual0 = durEl.querySelector(".dur-manual-input");
        if (manual0 && manual0.value) durVal = parseInt(manual0.value, 10) || 60;
        else durVal = parseInt(durEl.querySelector(".dur-slider").value, 10) || 60;
      }
      var curEnd = curStart + durVal;

      var viewStart = 6 * 60;
      var viewEnd = 24 * 60;
      var span = viewEnd - viewStart;
      var minDur = 5;

      var startPct = ((Math.max(curStart, viewStart) - viewStart) / span) * 100;
      var endPct = ((Math.min(curEnd, viewEnd) - viewStart) / span) * 100;
      if (startPct < 0) startPct = 0;
      if (startPct > 100) startPct = 100;
      if (endPct < 0) endPct = 0;
      if (endPct > 100) endPct = 100;

      var startX = e.clientX;
      fill.classList.add("is-dragging");

      var head = container.querySelector(".task-prev-head");
      var startEl = head.querySelector(".task-prev-start");
      var endEl = head.querySelector(".task-prev-end");
      var durLabelEl = head.querySelector(".task-prev-dur");

      var finalStart = curStart;
      var finalEnd = curEnd;

      var onMove = function (ev) {
        var dx = ev.clientX - startX;
        var dPct = (dx / rect.width) * 100;

        if (mode === "move") {
          var newStartPct = startPct + dPct;
          var w = endPct - startPct;
          if (newStartPct < 0) newStartPct = 0;
          if (newStartPct + w > 100) newStartPct = 100 - w;
          var nStart = viewStart + (newStartPct / 100) * span;
          nStart = Math.round(nStart / 5) * 5;
          finalStart = nStart;
          finalEnd = nStart + durVal;
          fill.style.left = newStartPct + "%";
        } else if (mode === "resize-left") {
          var newLeftPct = startPct + dPct;
          var minLeftPct = endPct - (minDur / span) * 100;
          if (newLeftPct < 0) newLeftPct = 0;
          if (newLeftPct > minLeftPct) newLeftPct = minLeftPct;
          var nStartR = viewStart + (newLeftPct / 100) * span;
          nStartR = Math.round(nStartR / 5) * 5;
          nStartR = Math.max(viewStart, Math.min(viewEnd - minDur, nStartR));
          finalStart = nStartR;
          finalEnd = curEnd;
          fill.style.left = newLeftPct + "%";
          fill.style.width = (endPct - newLeftPct) + "%";
        } else if (mode === "resize-right") {
          var newRightPct = endPct + dPct;
          var minRightPct = startPct + (minDur / span) * 100;
          if (newRightPct > 100) newRightPct = 100;
          if (newRightPct < minRightPct) newRightPct = minRightPct;
          var nEndR = viewStart + (newRightPct / 100) * span;
          nEndR = Math.round(nEndR / 5) * 5;
          nEndR = Math.min(viewEnd, Math.max(viewStart + minDur, nEndR));
          finalStart = curStart;
          finalEnd = nEndR;
          fill.style.width = (newRightPct - startPct) + "%";
        }

        if (startEl) startEl.textContent = faNum(minutesToTime(finalStart));
        if (endEl) endEl.textContent = faNum(minutesToTime(finalEnd));
        if (durLabelEl) durLabelEl.textContent = formatDurShort(finalEnd - finalStart);
      };

      var onUp = function () {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        fill.classList.remove("is-dragging");

        var newStartTime = minutesToTime(finalStart);
        var newDur = finalEnd - finalStart;
        if (newDur < 5) newDur = 5;

        var hInp = timeEl.querySelector(".tp-h");
        var mInp = timeEl.querySelector(".tp-m");
        hInp.value = newStartTime.split(":")[0];
        mInp.value = newStartTime.split(":")[1];
        hInp.dispatchEvent(new Event("input", { bubbles: true }));

        timeEl.querySelectorAll(".tp-chip").forEach(function (ch) {
          ch.classList.toggle("is-selected", ch.dataset.tpChip === newStartTime);
        });

        if (durEl) {
          var slider = durEl.querySelector(".dur-slider");
          var manual = durEl.querySelector(".dur-manual-input");
          if (slider && newDur <= parseInt(slider.max, 10)) slider.value = newDur;
          if (manual) {
            manual.value = newDur;
            manual.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }

        setTimeout(function () { updateDurationPreview(prefix); }, 0);
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
  }
  // ═══════ Day Mini List (چه کارهایی توی این روز هست) ═══════
  function renderDayMiniList(prefix) {
    var container = document.querySelector('[data-preview-for="' + prefix + '"]');
    if (!container) return;

    var dp = document.querySelector('[data-dp="' + prefix + '"]');
    var date = "";
    if (dp) {
      var y = dp.querySelector(".dp-h-year").value;
      var m = dp.querySelector(".dp-h-month").value;
      var d = dp.querySelector(".dp-h-day").value;
      if (y && m && d) date = y + "/" + m + "/" + d;
    }
    if (!date) return;

    var state = (window.__os && window.__os.getState) ? window.__os.getState() : null;
    if (!state || !Array.isArray(state.tasks)) return;

    var dayTasks = state.tasks.filter(function (t) {
      return t && t.date === date && !t.completed && t.time;
    }).sort(function (a, b) {
      return (a.time || "").localeCompare(b.time || "");
    });

    // ─── حذف mini list قبلی ───
    var existingMini = container.querySelector(".task-mini-list");
    if (existingMini) existingMini.remove();

    if (dayTasks.length === 0) return;

    var rows = dayTasks.map(function (t) {
      var color = getAreaColor(t.areaId);
      var dur = t.durationMinutes ? ' · ' + formatDurShort(t.durationMinutes) : '';
      return '<div class="task-mini-row" style="--area-color:' + color + '">'
        + '<span class="task-mini-time">' + faNum(t.time) + '</span>'
        + '<span class="task-mini-dot"></span>'
        + '<span class="task-mini-title">' + String(t.title || "").slice(0, 40).replace(/[<>&]/g, "") + '</span>'
        + (dur ? '<span class="task-mini-dur">' + dur + '</span>' : '')
        + '</div>';
    }).join("");

    var mini = document.createElement("div");
    mini.className = "task-mini-list";
    mini.innerHTML = '<div class="task-mini-head">'
      + '<span class="task-mini-head-icon">📋</span>'
      + '<span>کارهای همین روز (' + faNum(dayTasks.length) + ')</span>'
      + '</div>'
      + '<div class="task-mini-rows">' + rows + '</div>';
    container.appendChild(mini);
  }
  // ═══════ Auto-attach Preview to any form ═══════
  function autoAttachPreviews(root) {
    if (!root || !root.querySelectorAll) return;
    var prefixes = {};
    root.querySelectorAll("[data-tp]").forEach(function (el) {
      if (el.dataset && el.dataset.tp) prefixes[el.dataset.tp] = true;
    });
    root.querySelectorAll("[data-dur]").forEach(function (el) {
      if (el.dataset && el.dataset.dur) prefixes[el.dataset.dur] = true;
    });

    Object.keys(prefixes).forEach(function (pfx) {
      // قبلاً وجود داره؟
      if (document.querySelector('[data-preview-for="' + pfx + '"]')) return;

      var tp = root.querySelector('[data-tp="' + pfx + '"]') || document.querySelector('[data-tp="' + pfx + '"]');
      var dur = root.querySelector('[data-dur="' + pfx + '"]') || document.querySelector('[data-dur="' + pfx + '"]');
      var src = tp || dur;
      if (!src) return;

      var formRow = src.closest(".form-row");
      if (!formRow) return;

      var preview = document.createElement("div");
      preview.className = "form-row";
      preview.setAttribute("data-preview-for", pfx);
      formRow.parentNode.insertBefore(preview, formRow.nextSibling);

      setTimeout(function () { updateDurationPreview(pfx); renderDayMiniList(pfx); }, 60);
    });
  }
  // Global listener for auto-update
  document.addEventListener("input", function (e) {
    var tp = e.target.closest(".tp");
    var dur = e.target.closest(".dur");
    var prefix = (tp && tp.dataset.tp) || (dur && dur.dataset.dur);
    if (prefix) setTimeout(function () { updateDurationPreview(prefix); renderDayMiniList(prefix); }, 0);
  });
  document.addEventListener("click", function (e) {
    var chip = e.target.closest(".tp-chip, .dur-chip");
    if (chip) {
      var tp = chip.closest(".tp");
      var dur = chip.closest(".dur");
      var prefix = (tp && tp.dataset.tp) || (dur && dur.dataset.dur);
      if (prefix) setTimeout(function () { updateDurationPreview(prefix); renderDayMiniList(prefix); }, 0);
    }
  });

  // ─── Duration Chip for task rows ───
  function durationRangeChip(task) {
    if (!task || !task.time || !task.durationMinutes) return "";
    var start = timeToMinutes(task.time);
    if (start === null) return "";
    var end = start + task.durationMinutes;
    return '<span class="task-range-chip">⏰ ' + faNum(minutesToTime(start)) + '→' + faNum(minutesToTime(end)) + ' · ' + formatDurShort(task.durationMinutes) + '</span>';
  }
  // ─── [PATCH:lib-connect] Use shared lib if available ───
  if (window.InternshipLib) {
    var _lib = window.InternshipLib;
    if (_lib.faNum) faNum = _lib.faNum;
    if (_lib.escapeHtml) escapeHtml = _lib.escapeHtml;
    if (_lib.time) {
      var _t = _lib.time;
      if (_t.timeToMinutes) timeToMinutes = _t.timeToMinutes;
      if (_t.minutesToTime) minutesToTime = _t.minutesToTime;
    }
  }

  window.InternshipTimeline = {
    timeToMinutes: timeToMinutes,
    minutesToTime: minutesToTime,
    detectConflicts: detectConflicts,
    render: renderDayTimeline,
    getAreaColor: getAreaColor,
    faNum: faNum,
    updateDurationPreview: updateDurationPreview,
    autoAttachPreviews: autoAttachPreviews,
    renderDayMiniList: renderDayMiniList,
    durationRangeChip: durationRangeChip,
    formatDurShort: formatDurShort
  };

  console.log("[InternshipTimeline] loaded v1.3.0");
})();
