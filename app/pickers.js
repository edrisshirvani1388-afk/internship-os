/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Graphical Pickers  ·  v1.4.1
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var JMONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  var JWEEKDAYS = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
  var FA = "۰۱۲۳۴۵۶۷۸۹";
  function faNum(n) { return String(n).replace(/\d/g, function (d) { return FA[+d]; }); }

  function gregorianToJalali(gy, gm, gd) {
    var gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
    var jy = (gy <= 1600) ? 0 : 979; gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
             + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }
  function jalaliToGregorian(jy, jm, jd) {
    var gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    var days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4)
             + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0));
    var sal_a = [0,31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    var gm = 0;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
  }
  function isJalaliLeap(jy) {
    var g1 = jalaliToGregorian(jy, 1, 1);
    var g2 = jalaliToGregorian(jy + 1, 1, 1);
    var d1 = Date.UTC(g1[0], g1[1] - 1, g1[2]);
    var d2 = Date.UTC(g2[0], g2[1] - 1, g2[2]);
    return Math.round((d2 - d1) / 86400000) === 366;
  }
  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
  }
  function jalaliMonthStartWeekday(jy, jm) {
    var g = jalaliToGregorian(jy, jm, 1);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return (d.getDay() + 1) % 7;
  }
  function addJalaliMonths(jy, jm, d) {
    var total = jy * 12 + (jm - 1) + d;
    return { jy: Math.floor(total / 12), jm: ((total % 12) + 12) % 12 + 1 };
  }
  function todayJalali() {
    var now = new Date();
    var r = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { jy: r[0], jm: r[1], jd: r[2] };
  }
  function weekdayName(jy, jm, jd) {
    var g = jalaliToGregorian(jy, jm, jd);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return JWEEKDAYS[(d.getDay() + 1) % 7];
  }
  function prettyDate(jy, jm, jd) {
    return faNum(jd) + " " + JMONTHS[jm - 1] + " " + faNum(jy);
  }

  /* ═══════ DATE PICKER ═══════ */
  var _dpView = {};
  window._ioDpJump = function (sel) {
    var dp = sel.closest(".dp");
    if (!dp) return;
    var pfx = dp.dataset.dp;
    var yv = parseInt(dp.querySelector(".dp-sel-year").value, 10);
    var mv = parseInt(dp.querySelector(".dp-sel-month").value, 10);
    _dpView[pfx] = { jy: yv, jm: mv };
    dp.querySelector(".dp-popup").innerHTML = renderDatePopup(pfx);
  };

  function renderDatePicker(prefix, jy, jm, jd) {
    _dpView[prefix] = { jy: jy, jm: jm };
    return '<div class="dp" data-dp="' + prefix + '">'
      + '<button type="button" class="dp-trigger">'
      + '<span class="dp-icon">📅</span>'
      + '<span class="dp-value" data-dp-value="' + prefix + '">'
      + prettyDate(jy, jm, jd) + ' · ' + weekdayName(jy, jm, jd)
      + '</span>'
      + '<span class="dp-chevron">▾</span>'
      + '</button>'
      + '<input type="hidden" class="dp-h-day" value="' + jd + '">'
      + '<input type="hidden" class="dp-h-month" value="' + jm + '">'
      + '<input type="hidden" class="dp-h-year" value="' + jy + '">'
      + '<div class="dp-popup" hidden></div>'
      + '</div>';
  }

  function renderDatePopup(prefix) {
    var view = _dpView[prefix];
    if (!view) return "";
    var jy = view.jy, jm = view.jm;
    var monthLen = jalaliMonthLength(jy, jm);
    var startW = jalaliMonthStartWeekday(jy, jm);
    var today = todayJalali();
    var dp = document.querySelector('[data-dp="' + prefix + '"]');
    var selDay = dp ? parseInt(dp.querySelector('.dp-h-day').value, 10) : 0;
    var selMonth = dp ? parseInt(dp.querySelector('.dp-h-month').value, 10) : 0;
    var selYear = dp ? parseInt(dp.querySelector('.dp-h-year').value, 10) : 0;

    var cells = "";
    for (var i = 0; i < startW; i++) cells += '<div class="dp-cell empty"></div>';
    for (var d = 1; d <= monthLen; d++) {
      var isToday = (today.jy === jy && today.jm === jm && today.jd === d);
      var isSel = (selDay === d && selMonth === jm && selYear === jy);
      var cls = "dp-cell";
      if (isToday) cls += " is-today";
      if (isSel) cls += " is-selected";
      cells += '<button type="button" class="' + cls + '" data-dp-day="' + d + '">' + faNum(d) + '</button>';
    }

    return '<div class="dp-pop-head">'
      + '<button type="button" class="dp-nav" data-dp-prev>‹</button>'
      + '<select class="dp-sel dp-sel-year" data-dp-sel-year onchange="window._ioDpJump(this)">' + (function(){ var out=""; for(var y=jy-100;y<=jy+10;y++){ out += '<option value="'+y+'"'+(y===jy?' selected':'')+'>'+faNum(y)+'</option>'; } return out; })() + '</select>'
      + '<select class="dp-sel dp-sel-month" data-dp-sel-month onchange="window._ioDpJump(this)">' + JMONTHS.map(function(m,i){ return '<option value="'+(i+1)+'"'+(i+1===jm?' selected':'')+'>'+m+'</option>'; }).join("") + '</select>'
      + '<button type="button" class="dp-nav" data-dp-next>›</button>'
      + '</div>'
      + '<div class="dp-pop-weekdays">'
      + JWEEKDAYS.map(function (w) { return '<div class="dp-pop-weekday">' + w.slice(0, 1) + '</div>'; }).join("")
      + '</div>'
      + '<div class="dp-pop-grid">' + cells + '</div>'
      + '<div class="dp-pop-actions">'
      + '<button type="button" class="dp-today-btn" data-dp-today>امروز</button>'
      + '</div>';
  }

  function readDate(prefix) {
    var dp = document.querySelector('[data-dp="' + prefix + '"]');
    if (!dp) return "";
    return dp.querySelector('.dp-h-year').value + "/"
         + dp.querySelector('.dp-h-month').value + "/"
         + dp.querySelector('.dp-h-day').value;
  }

  function updateDateValue(prefix) {
    var dp = document.querySelector('[data-dp="' + prefix + '"]');
    if (!dp) return;
    var y = parseInt(dp.querySelector('.dp-h-year').value, 10);
    var m = parseInt(dp.querySelector('.dp-h-month').value, 10);
    var d = parseInt(dp.querySelector('.dp-h-day').value, 10);
    var val = dp.querySelector('[data-dp-value="' + prefix + '"]');
    if (val) val.textContent = prettyDate(y, m, d) + " · " + weekdayName(y, m, d);
  }

  /* ═══════ TIME PICKER ═══════ */
  var QUICK_TIMES = ["07:00","08:00","09:00","10:00","12:00","14:00","16:00","18:00","20:00","22:00"];

  function renderTimePicker(prefix, value) {
    value = value || "";
    var hh = value ? value.split(":")[0] : "";
    var mm = value ? value.split(":")[1] : "";
    var displayVal = (hh && mm) ? (faNum(hh) + ":" + faNum(mm)) : "—";
    var displayCls = (hh && mm) ? "is-set" : "is-empty";

    var chips = QUICK_TIMES.map(function (t) {
      var active = (t === value) ? " is-selected" : "";
      return '<button type="button" class="tp-chip' + active + '" data-tp-chip="' + t + '">' + faNum(t) + '</button>';
    }).join("");

    return '<div class="tp" data-tp="' + prefix + '">'
      + '<div class="tp-display ' + displayCls + '">'
      + '<span class="tp-display-icon">🕐</span>'
      + '<span class="tp-display-val" data-tp-display="' + prefix + '">' + displayVal + '</span>'
      + '</div>'
      + '<div class="tp-quick-grid">' + chips + '</div>'
      + '<div class="tp-manual">'
      + '<span class="tp-manual-label">دستی</span>'
      + '<input type="number" class="tp-h" min="0" max="23" value="' + hh + '" placeholder="--">'
      + '<span class="tp-colon">:</span>'
      + '<input type="number" class="tp-m" min="0" max="59" step="5" value="' + mm + '" placeholder="--">'
      + '<button type="button" class="tp-clear" data-tp-clear title="پاک کردن">✕</button>'
      + '</div>'
      + '</div>';
  }

  function readTime(prefix) {
    var tp = document.querySelector('[data-tp="' + prefix + '"]');
    if (!tp) return "";
    var h = tp.querySelector('.tp-h').value.trim();
    var m = tp.querySelector('.tp-m').value.trim();
    if (!h) return "";
    if (!m) m = "00";
    h = String(parseInt(h, 10) || 0).padStart(2, "0");
    m = String(parseInt(m, 10) || 0).padStart(2, "0");
    return h + ":" + m;
  }

  function updateTimeDisplay(prefix) {
    var tp = document.querySelector('[data-tp="' + prefix + '"]');
    if (!tp) return;
    var h = tp.querySelector('.tp-h').value.trim();
    var m = tp.querySelector('.tp-m').value.trim();
    var disp = tp.querySelector('[data-tp-display]');
    if (!disp) return;
    if (h && m) {
      disp.textContent = faNum(String(parseInt(h,10)).padStart(2,"0")) + ":" + faNum(String(parseInt(m,10)).padStart(2,"0"));
      disp.parentElement.classList.remove("is-empty");
      disp.parentElement.classList.add("is-set");
    } else {
      disp.textContent = "—";
      disp.parentElement.classList.remove("is-set");
      disp.parentElement.classList.add("is-empty");
    }
  }

  /* ═══════ DURATION PICKER ═══════ */
  var DUR_PRESETS = [
    { m: 15, label: "۱۵د" },
    { m: 30, label: "۳۰د" },
    { m: 45, label: "۴۵د" },
    { m: 60, label: "۱ ساعت" },
    { m: 90, label: "۱.۵ ساعت" },
    { m: 120, label: "۲ ساعت" },
    { m: 180, label: "۳ ساعت" },
    { m: 240, label: "۴ ساعت" }
  ];

  function formatDuration(min) {
    min = parseInt(min, 10) || 0;
    if (min < 60) return faNum(min) + " دقیقه";
    var h = Math.floor(min / 60);
    var r = min % 60;
    if (r === 0) return faNum(h) + " ساعت";
    if (r === 30) return faNum(h) + ".۵ ساعت";
    return faNum(h) + " ساعت و " + faNum(r) + " دقیقه";
  }

  function renderDurationPicker(prefix, value) {
    value = (typeof value === "number" && value > 0) ? value : 60;
    var _sliderMax = Math.max(480, value); // [PATCH:phase-28.2.3] dynamic max for large durations
    var chips = DUR_PRESETS.map(function (p) {
      var active = (p.m === value) ? " is-selected" : "";
      return '<button type="button" class="dur-chip' + active + '" data-dur-chip="' + p.m + '">' + p.label + '</button>';
    }).join("");
    var label = formatDuration(value);

    return '<div class="dur" data-dur="' + prefix + '">'
      + '<div class="dur-display">'
      + '<span class="dur-display-icon">⏱️</span>'
      + '<span class="dur-display-val" data-dur-label="' + prefix + '">' + label + '</span>'
      + '</div>'
      + '<input type="range" class="dur-slider" min="5" max="' + _sliderMax + '" step="5" value="' + value + '">'
      + '<div class="dur-chips">' + chips + '</div>'
      + '<div class="dur-manual">'
      + '<span class="dur-manual-label">دستی</span>'
      + '<input type="number" class="dur-manual-input" min="5" max="1440" step="5" value="' + value + '">'
      + '<span class="dur-manual-unit">دقیقه</span>'
      + '</div>'
      + '</div>';
  }

  function readDuration(prefix) {
    var el = document.querySelector('[data-dur="' + prefix + '"]');
    if (!el) return null;
    var manual = el.querySelector('.dur-manual-input');
    if (manual && manual.value) {
      var v = parseInt(manual.value, 10);
      if (!isNaN(v) && v >= 5) return v;
    }
    var s = parseInt(el.querySelector('.dur-slider').value, 10);
    return isNaN(s) ? null : s;
  }

  /* ═══════ EVENT DELEGATION ═══════ */
  document.addEventListener("click", function (e) {
    var trigger = e.target.closest(".dp-trigger");
    if (trigger) {
      var dp = trigger.closest(".dp");
      var popup = dp.querySelector(".dp-popup");
      var prefix = dp.dataset.dp;
      document.querySelectorAll(".dp-popup").forEach(function (p) { if (p !== popup) p.hidden = true; });
      if (popup.hidden) {
        var y = parseInt(dp.querySelector('.dp-h-year').value, 10);
        var m = parseInt(dp.querySelector('.dp-h-month').value, 10);
        _dpView[prefix] = { jy: y, jm: m };
        popup.innerHTML = renderDatePopup(prefix);
        popup.hidden = false;
      } else {
        popup.hidden = true;
      }
      e.stopPropagation();
      return;
    }

    var cell = e.target.closest(".dp-cell[data-dp-day]");
    if (cell) {
      var dpBox = cell.closest(".dp");
      var pfx = dpBox.dataset.dp;
      var view = _dpView[pfx];
      dpBox.querySelector('.dp-h-day').value = parseInt(cell.dataset.dpDay, 10);
      dpBox.querySelector('.dp-h-month').value = view.jm;
      dpBox.querySelector('.dp-h-year').value = view.jy;
      updateDateValue(pfx);
      if (window.InternshipTimeline && window.InternshipTimeline.renderDayMiniList) {
        try { window.InternshipTimeline.renderDayMiniList(pfx); } catch (e) {}
      }
      dpBox.querySelector(".dp-popup").hidden = true;
      e.stopPropagation();
      return;
    }

    if (e.target.closest("[data-dp-prev]")) {
      var dpPrev = e.target.closest(".dp");
      var pfxP = dpPrev.dataset.dp;
      _dpView[pfxP] = addJalaliMonths(_dpView[pfxP].jy, _dpView[pfxP].jm, -1);
      dpPrev.querySelector(".dp-popup").innerHTML = renderDatePopup(pfxP);
      e.stopPropagation();
      return;
    }
    if (e.target.closest("[data-dp-next]")) {
      var dpNext = e.target.closest(".dp");
      var pfxN = dpNext.dataset.dp;
      _dpView[pfxN] = addJalaliMonths(_dpView[pfxN].jy, _dpView[pfxN].jm, 1);
      dpNext.querySelector(".dp-popup").innerHTML = renderDatePopup(pfxN);
      e.stopPropagation();
      return;
    }

    if (e.target.closest("[data-dp-today]")) {
      var dpT = e.target.closest(".dp");
      var pfxT = dpT.dataset.dp;
      var t = todayJalali();
      dpT.querySelector('.dp-h-day').value = t.jd;
      dpT.querySelector('.dp-h-month').value = t.jm;
      dpT.querySelector('.dp-h-year').value = t.jy;
      _dpView[pfxT] = { jy: t.jy, jm: t.jm };
      updateDateValue(pfxT);
      if (window.InternshipTimeline && window.InternshipTimeline.renderDayMiniList) {
        try { window.InternshipTimeline.renderDayMiniList(pfxT); } catch (e) {}
      }
      dpT.querySelector(".dp-popup").hidden = true;
      e.stopPropagation();
      return;
    }

    var chip = e.target.closest(".tp-chip");
    if (chip) {
      var tp = chip.closest(".tp");
      var tval = chip.dataset.tpChip;
      tp.querySelector(".tp-h").value = tval.split(":")[0];
      tp.querySelector(".tp-m").value = tval.split(":")[1];
      tp.querySelectorAll(".tp-chip").forEach(function (c) { c.classList.remove("is-selected"); });
      chip.classList.add("is-selected");
      updateTimeDisplay(tp.dataset.tp);
      e.stopPropagation();
      return;
    }

    if (e.target.closest("[data-tp-clear]")) {
      var tpC = e.target.closest(".tp");
      tpC.querySelector(".tp-h").value = "";
      tpC.querySelector(".tp-m").value = "";
      tpC.querySelectorAll(".tp-chip").forEach(function (c) { c.classList.remove("is-selected"); });
      updateTimeDisplay(tpC.dataset.tp);
      e.stopPropagation();
      return;
    }

    var dChip = e.target.closest(".dur-chip");
    if (dChip) {
      var dur = dChip.closest(".dur");
      var dv = parseInt(dChip.dataset.durChip, 10);
      var slider4 = dur.querySelector(".dur-slider");
      if (slider4) {
        var sMax4 = parseInt(slider4.max, 10);
        if (dv > sMax4) { slider4.max = String(dv); }
        slider4.value = dv;
      }
      // [PATCH:phase-28.2.3] sync manual input so readDuration returns chip value
      var manual4 = dur.querySelector(".dur-manual-input");
      if (manual4) manual4.value = dv;
      var lbl = dur.querySelector("[data-dur-label]");
      if (lbl) lbl.textContent = formatDuration(dv);
      dur.querySelectorAll(".dur-chip").forEach(function (c) { c.classList.remove("is-selected"); });
      dChip.classList.add("is-selected");
      e.stopPropagation();
      return;
    }

    if (!e.target.closest(".dp-popup")) {
      document.querySelectorAll(".dp-popup").forEach(function (p) { p.hidden = true; });
    }
  });

  document.addEventListener("input", function (e) {
    if (e.target.classList.contains("dur-slider")) {
      var dur = e.target.closest(".dur");
      var v = parseInt(e.target.value, 10);
      var lbl = dur.querySelector("[data-dur-label]");
      if (lbl) lbl.textContent = formatDuration(v);
      var manualInp = dur.querySelector(".dur-manual-input");
      if (manualInp && document.activeElement !== manualInp) manualInp.value = v;
      dur.querySelectorAll(".dur-chip").forEach(function (c) {
        c.classList.toggle("is-selected", parseInt(c.dataset.durChip, 10) === v);
      });
    }
    if (e.target.classList.contains("dur-manual-input")) {
      var durM = e.target.closest(".dur");
      var vM = parseInt(e.target.value, 10);
      if (isNaN(vM)) return;
      if (vM < 5) vM = 5;
      if (vM > 1440) vM = 1440;
      var slider = durM.querySelector(".dur-slider");
      if (slider) {
        // [PATCH:phase-28.2.3] expand slider max if manual exceeds it; keep in sync
        var sMax = parseInt(slider.max, 10);
        if (vM > sMax) { slider.max = String(vM); sMax = vM; }
        slider.value = vM;
      }
      var lblM = durM.querySelector("[data-dur-label]");
      if (lblM) lblM.textContent = formatDuration(vM);
      durM.querySelectorAll(".dur-chip").forEach(function (c) {
        c.classList.toggle("is-selected", parseInt(c.dataset.durChip, 10) === vM);
      });
    }
    if (e.target.classList.contains("tp-h") || e.target.classList.contains("tp-m")) {
      var tp = e.target.closest(".tp");
      var h = String(tp.querySelector(".tp-h").value).padStart(2, "0");
      var m = String(tp.querySelector(".tp-m").value).padStart(2, "0");
      var cur = h + ":" + m;
      tp.querySelectorAll(".tp-chip").forEach(function (c) {
        c.classList.toggle("is-selected", c.dataset.tpChip === cur);
      });
      updateTimeDisplay(tp.dataset.tp);
    }
  });

  /* ═══════ RECURRENCE PICKER ═══════ */
  var RECURRENCE_PRESETS = [
    { v: "none",    label: "بدون",  icon: "⭕", hint: "یک‌بار" },
    { v: "daily",   label: "روزانه", icon: "🌅", hint: "هر روز" },
    { v: "weekly",  label: "هفتگی",  icon: "📅", hint: "هر هفته" },
    { v: "monthly", label: "ماهانه", icon: "🗓️", hint: "هر ماه" }
  ];

  function renderRecurrencePicker(prefix, value) {
    value = value || "none";
    var chips = RECURRENCE_PRESETS.map(function (p) {
      var active = (p.v === value) ? " is-selected" : "";
      return '<button type="button" class="rec-chip rec-' + p.v + active + '" data-rec="' + p.v + '" data-rec-prefix="' + prefix + '">'
        + '<span class="rec-icon">' + p.icon + '</span>'
        + '<span class="rec-label">' + p.label + '</span>'
        + '</button>';
    }).join("");
    return '<div class="rec" data-rec-prefix="' + prefix + '">'
      + '<input type="hidden" class="rec-h" value="' + value + '">'
      + chips
      + '</div>';
  }

  function readRecurrence(prefix) {
    var el = document.querySelector('[data-rec-prefix="' + prefix + '"] .rec-h');
    return el ? el.value : "none";
  }

  function upgradeRecurrenceSelect(sel) {
    if (!sel || sel.dataset.recUpgraded === "1") return;
    var id = sel.id;
    if (!id) return;
    if (document.querySelector('[data-rec-prefix="' + id + '"]')) {
      sel.dataset.recUpgraded = "1"; sel.style.display = "none"; return;
    }
    var value = sel.value || "none";
    var prefix = id;
    var wrapper = document.createElement("div");
    wrapper.innerHTML = renderRecurrencePicker(prefix, value);
    var recEl = wrapper.firstElementChild;
    sel.dataset.recUpgraded = "1";
    sel.style.display = "none";
    sel.parentNode.insertBefore(recEl, sel.nextSibling);
    var hid = recEl.querySelector(".rec-h");
    recEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".rec-chip");
      if (!chip) return;
      var v = chip.dataset.rec;
      hid.value = v;
      sel.value = v;
      recEl.querySelectorAll(".rec-chip").forEach(function (cc) { cc.classList.remove("is-selected"); });
      chip.classList.add("is-selected");
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function autoUpgradeRecurrence(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('select[id$="-recur"]').forEach(function (s) { upgradeRecurrenceSelect(s); });
  }
  /* ═══════ PRIORITY PICKER ═══════ */
  var PRIORITY_PRESETS = [
    { v: "low",    label: "کم",    icon: "🌱", cls: "low" },
    { v: "normal", label: "متوسط", icon: "⚡", cls: "normal" },
    { v: "high",   label: "زیاد",  icon: "🔥", cls: "high" }
  ];

  function renderPriorityPicker(prefix, value) {
    value = value || "normal";
    var chips = PRIORITY_PRESETS.map(function (p) {
      var active = (p.v === value) ? " is-selected" : "";
      return '<button type="button" class="pri-chip pri-' + p.cls + active + '" data-pri="' + p.v + '" data-pri-prefix="' + prefix + '">'
        + '<span class="pri-icon">' + p.icon + '</span>'
        + '<span class="pri-label">' + p.label + '</span>'
        + '</button>';
    }).join("");
    return '<div class="pri" data-pri-prefix="' + prefix + '">'
      + '<input type="hidden" class="pri-h" value="' + value + '">'
      + chips
      + '</div>';
  }

  function readPriority(prefix) {
    var el = document.querySelector('[data-pri-prefix="' + prefix + '"] .pri-h');
    return el ? el.value : "normal";
  }

  /* ═══════ AUTO UPGRADE ═══════ */
  function autoUpgradeInputsIn(root) {
    if (!root || !root.querySelectorAll) return;

    // 1) <input type="time"> و <input id$="-time">
    var candidates = [];
    var _skipIds = { "sf-start": 1, "sf-end": 1, "bulk-start": 1, "bulk-end": 1 };
    root.querySelectorAll('input[type="time"]').forEach(function (x) { if (!_skipIds[x.id]) candidates.push(x); });
    root.querySelectorAll('input[id$="-time"]').forEach(function (x) {
      if (candidates.indexOf(x) < 0) candidates.push(x);
    });

    candidates.forEach(function (inp) {
      if (inp.dataset.pickerUpgraded === "1") return;
      if (inp.closest(".tp")) return;
      var id = inp.id;
      if (!id) return;
      // چک کن با این prefix هنوز پیکر نیست
      var exists = document.querySelector('[data-tp="' + id + '"]');
      if (exists) { inp.dataset.pickerUpgraded = "1"; inp.style.display = "none"; return; }

      var value = inp.value || "";
      var wrapper = document.createElement("div");
      wrapper.innerHTML = renderTimePicker(id, value);
      var pickerEl = wrapper.firstElementChild;

      inp.dataset.pickerUpgraded = "1";
      inp.style.display = "none";

      inp.parentNode.insertBefore(pickerEl, inp.nextSibling);

      var syncFn = function () {
        var v = readTime(id);
        inp.value = v;
        inp.dispatchEvent(new Event("input", { bubbles: true }));
        inp.dispatchEvent(new Event("change", { bubbles: true }));
      };
      pickerEl.addEventListener("click", syncFn);
      pickerEl.addEventListener("input", syncFn);
    });
  }

  function upgradePrioritySelect(sel) {
    if (!sel || sel.dataset.priUpgraded === "1") return;
    var id = sel.id;
    if (!id) return;
    if (document.querySelector('[data-pri-prefix="' + id + '"]')) {
      sel.dataset.priUpgraded = "1"; sel.style.display = "none"; return;
    }
    var value = sel.value || "normal";
    var prefix = id;
    var wrapper = document.createElement("div");
    wrapper.innerHTML = renderPriorityPicker(prefix, value);
    var priEl = wrapper.firstElementChild;
    sel.dataset.priUpgraded = "1";
    sel.style.display = "none";
    sel.parentNode.insertBefore(priEl, sel.nextSibling);
    // sync hidden input with select
    var hid = priEl.querySelector(".pri-h");
    priEl.addEventListener("click", function (e) {
      var chip = e.target.closest(".pri-chip");
      if (!chip) return;
      var v = chip.dataset.pri;
      hid.value = v;
      sel.value = v;
      priEl.querySelectorAll(".pri-chip").forEach(function (c) { c.classList.remove("is-selected"); });
      chip.classList.add("is-selected");
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    });
  }

  function autoUpgradePriorities(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('select[id$="-priority"]').forEach(function (s) { upgradePrioritySelect(s); });
  }
  // ─── [PATCH:lib-connect] Use shared lib if available ───
  if (window.InternshipLib) {
    var _lib = window.InternshipLib;
    if (_lib.faNum) faNum = _lib.faNum;
    if (_lib.date) {
      var _d = _lib.date;
      if (_d.gregorianToJalali) gregorianToJalali = _d.gregorianToJalali;
      if (_d.jalaliToGregorian) jalaliToGregorian = _d.jalaliToGregorian;
      if (_d.isJalaliLeap) isJalaliLeap = _d.isJalaliLeap;
      if (_d.jalaliMonthLength) jalaliMonthLength = _d.jalaliMonthLength;
      if (_d.jalaliMonthStartWeekday) jalaliMonthStartWeekday = _d.jalaliMonthStartWeekday;
      if (_d.addJalaliMonths) addJalaliMonths = _d.addJalaliMonths;
      if (_d.todayJalaliObj) todayJalali = _d.todayJalaliObj;
      if (_d.weekdayName) weekdayName = _d.weekdayName;
      if (_d.prettyDate) prettyDate = _d.prettyDate;
    }
  }

  window.InternshipPickers = {
    date: { render: renderDatePicker, read: readDate },
    time: { render: renderTimePicker, read: readTime },
    duration: { render: renderDurationPicker, read: readDuration, format: formatDuration },
    priority: { render: renderPriorityPicker, read: readPriority },
    recurrence: { render: renderRecurrencePicker, read: readRecurrence },
    autoUpgrade: { timeInputs: autoUpgradeInputsIn, prioritySelects: autoUpgradePriorities, recurrenceSelects: autoUpgradeRecurrence },
    helpers: {
      faNum: faNum, JMONTHS: JMONTHS, JWEEKDAYS: JWEEKDAYS,
      prettyDate: prettyDate, weekdayName: weekdayName
    }
  };

  console.log("[InternshipPickers] loaded v1.4.1");
})();