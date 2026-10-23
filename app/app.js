/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Logic  ·  v0.2.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const DATA           = window.INTERNSHIP_DATA || {};
  const EMPTY          = window.INTERNSHIP_EMPTY_WORKSPACE || {};
  const LIFE_AREAS     = DATA.lifeAreas || [];

  /* ─── [PATCH:phase-28.2] Generic Life Activities: sleep / food / commute ───
     Additive injection — does not touch data.js.
     Idempotent: skips ids already present. */
  (function _extendLifeAreas28_2() {
    var _extra = [
      { id: "sleep",   icon: "😴", title: "خواب و استراحت" },
      { id: "food",    icon: "🍎", title: "غذا" },
      { id: "commute", icon: "🚗", title: "رفت‌وآمد" }
    ];
    var _have = {};
    LIFE_AREAS.forEach(function (a) { if (a && a.id) _have[a.id] = true; });
    _extra.forEach(function (a) {
      if (!_have[a.id]) LIFE_AREAS.push(a);
    });
  })();
  /* PATCH:phase-A-dash */
  (function _extendLifeAreasPhaseA() {
    var _extra = [
      { id: "sleep",   icon: "😴", title: "خواب",    subtitle: "Sleep",   desc: "برنامه خواب شبانه و چرت روزانه.",  accent: "129, 140, 248" },
      { id: "finance", icon: "💰", title: "حسابداری", subtitle: "Finance", desc: "درآمد و هزینه، بودجه و گزارش ماهانه.", accent: "34, 197, 94" }
    ];
    var _have = {};
    LIFE_AREAS.forEach(function (a) { if (a && a.id) _have[a.id] = true; });
    _extra.forEach(function (a) {
      if (!_have[a.id]) { LIFE_AREAS.push(a); return; }
      for (var i = 0; i < LIFE_AREAS.length; i++) {
        if (LIFE_AREAS[i].id === a.id) {
          if (!LIFE_AREAS[i].subtitle) LIFE_AREAS[i].subtitle = a.subtitle;
          if (!LIFE_AREAS[i].accent)   LIFE_AREAS[i].accent   = a.accent;
          if (a.id === "sleep") LIFE_AREAS[i].title = "خواب";
        }
      }
    });
  })();
/* ─── [PATCH:phase-28.2.4] Quick Add Presets ─── */
  var _QA_DEFAULTS = [
    { id: "sleep",     icon: "😴", label: "خواب شب",   areaId: "sleep",    title: "خواب شب",   time: "23:00", durationMinutes: 480, recurrence: "daily", enabled: true },
    { id: "workout",   icon: "🏋️", label: "ورزش",      areaId: "body",     title: "ورزش",      time: "07:00", durationMinutes: 60,  recurrence: "daily", enabled: true },
    { id: "nap",       icon: "🛏️", label: "چرت",       areaId: "sleep",    title: "چرت",       time: "14:00", durationMinutes: 60,  recurrence: "daily", enabled: true },
    { id: "breakfast", icon: "🍳", label: "صبحانه",    areaId: "food",     title: "صبحانه",    time: "07:30", durationMinutes: 30,  recurrence: "daily", enabled: true },
    { id: "lunch",     icon: "🍎", label: "نهار",      areaId: "food",     title: "نهار",      time: "13:00", durationMinutes: 45,  recurrence: "daily", enabled: true },
    { id: "dinner",    icon: "🍽️", label: "شام",       areaId: "food",     title: "شام",       time: "20:00", durationMinutes: 45,  recurrence: "daily", enabled: true },
    { id: "hospital",  icon: "🏥", label: "بیمارستان", areaId: "clinical", title: "بیمارستان", time: "08:00", durationMinutes: 480, recurrence: "none",  enabled: true }
  ];

  function _qaGetPresets() {
    if (!state.workspace) state.workspace = {};
    if (!Array.isArray(state.workspace.quickAddPresets)) {
      state.workspace.quickAddPresets = JSON.parse(JSON.stringify(_QA_DEFAULTS));
      return state.workspace.quickAddPresets;
    }
    var have = {};
    state.workspace.quickAddPresets.forEach(function (p) { if (p && p.id) have[p.id] = true; });
    _QA_DEFAULTS.forEach(function (d) {
      if (!have[d.id]) state.workspace.quickAddPresets.push(JSON.parse(JSON.stringify(d)));
    });
    return state.workspace.quickAddPresets;
  }

  // [PATCH:phase-28.2.4d] helpers
  function _qaFmtDuration(min) {
    min = parseInt(min, 10) || 0;
    if (min < 60) return faNum(min) + " دقیقه";
    var h = Math.floor(min / 60);
    var r = min % 60;
    if (r === 0) return faNum(h) + " ساعت";
    return faNum(h) + " ساعت و " + faNum(r) + " دقیقه";
  }
  // [PATCH:phase-28.2.4e] Persian kind labels for user-facing conflict messages
  var _QA_KIND_FA = {
    study: "مطالعه", clinical: "بالینی", shift: "کشیک", shift_untimed: "کشیک بدون ساعت",
    gym: "ورزش", personal: "شخصی", case: "کیس", reminder: "یادآور",
    flexible: "انعطاف‌پذیر", other: "سایر", unknown: "نامشخص"
  };
  function _qaPersianReason(cf) {
    var Rr = window.InternshipResidency;
    var CF = Rr && Rr.schedulingConflict;
    if (!CF || !CF._kindOf) return "تداخل زمانی جدی";
    return "این دو فعالیت نمی‌توانند هم‌زمان باشند";
  }
  function _qaDetectConflict(task) {
    var Rr = window.InternshipResidency;
    var SP = Rr && Rr.schedulingProjection;
    var CF = Rr && Rr.schedulingConflict;
    if (!SP || !CF || !SP.projectTask) return null;
    var hypo = SP.projectTask(task);
    if (!hypo) return null;
    if (!hypo.startTime || !hypo.endTime) return null;
    var existing = [];
    try { existing = _getEffectiveItems(task.date) || []; } catch (e) { return null; }
    for (var i = 0; i < existing.length; i++) {
      var c = CF.detectPair(hypo, existing[i], {});
      if (c && c.policy === "HARD") return { conflict: c, other: existing[i] };
    }
    return null;
  }
  function _qaOpenDurPop(btn, onPick) {
    var rect = btn.getBoundingClientRect();
    var pop = document.createElement("div");
    pop.className = "qas-dur-pop";
    var opts = [15, 30, 45, 60, 90, 120, 180, 240, 300, 360, 480];
    pop.innerHTML = opts.map(function (m) {
      return '<button type="button" class="qas-dur-opt" data-min="' + m + '">' + _qaFmtDuration(m) + '</button>';
    }).join("");
    document.body.appendChild(pop);
    var top = rect.bottom + 6;
    var left = rect.left;
    var w = pop.offsetWidth;
    if (left + w > window.innerWidth - 8) left = window.innerWidth - w - 8;
    pop.style.top = top + "px";
    pop.style.left = left + "px";
    function close() {
      if (pop.parentNode) pop.parentNode.removeChild(pop);
      document.removeEventListener("click", onDoc, true);
    }
    function onDoc(e) {
      if (pop.contains(e.target)) return;
      if (e.target === btn) return;
      close();
    }
    pop.addEventListener("click", function (e) {
      var opt = e.target.closest(".qas-dur-opt");
      if (!opt) return;
      var m = parseInt(opt.dataset.min, 10);
      onPick(m);
      close();
    });
    setTimeout(function () { document.addEventListener("click", onDoc, true); }, 0);
  }
  function _qaNewId() {
    return "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function _qaAddPreset(presetId) {
    var presets = _qaGetPresets();
    var p = presets.find(function (x) { return x.id === presetId; });
    if (!p) return;
    // [PATCH:phase-28.2.4c] honor selected dashboard day instead of always today
    var date = (typeof _dashSelectedDay !== "undefined" && _dashSelectedDay) ? _dashSelectedDay : todayJalali();
    var task = {
      id: _qaNewId(),
      title: p.title || p.label || "فعالیت",
      areaId: p.areaId || "life",
      date: date,
      time: p.time || "",
      durationMinutes: (typeof p.durationMinutes === "number" && p.durationMinutes > 0) ? p.durationMinutes : null,
      priority: "normal",
      description: "",
      recurrence: p.recurrence || "none",
      completed: false,
      createdAt: Date.now()
    };
    // [PATCH:phase-28.2.4d] HARD conflict gate
    // [PATCH:mvp01-b] guard: refuse duplicate quick-add on same date
    var _dup = state.tasks.find(function (x) {
      return x && !x.completed && x.date === task.date &&
             x.title === task.title && (x.time || "") === (task.time || "");
    });
    if (_dup) {
      _notifyApp("info", "«" + task.title + "» قبلاً برای این روز ثبت شده");
      return;
    }
    var conflictInfo = _qaDetectConflict(task);
    if (conflictInfo) {
      var cf = conflictInfo.conflict;
      var other = conflictInfo.other;
      // [PATCH:phase-28.2.4e] build Persian reason from titles
      var myTitle = task.title || "این فعالیت";
      var otherTitle = (other && other.title) ? other.title : "فعالیت دیگر";
      var when = (cf.overlapStart && cf.overlapEnd) ? (" از " + cf.overlapStart + " تا " + cf.overlapEnd) : "";
      var msg = "⛔ «" + myTitle + "» با «" + otherTitle + "»" + when + " تداخل دارد";
      _notifyApp("error", msg);
      return;
    }
    state.tasks.push(task);
    try { saveState(); } catch (e) {}
    _rtNotify("task_added", { taskId: task.id, title: task.title, date: task.date, time: task.time, durationMinutes: task.durationMinutes });
    _notifyApp("success", "«" + task.title + "» اضافه شد");
    render();
  }

  function _qaRenderRow() {
    var presets = _qaGetPresets();
    var enabled = presets.filter(function (p) { return p.enabled !== false; });
    var btns = enabled.map(function (p) {
      return '<button type="button" class="qa-btn" data-qa-add="' + p.id + '">' +
        '<span class="qa-ico">' + (p.icon || "") + '</span>' +
        '<span>' + escapeHTML(p.label || p.id) + '</span>' +
        '</button>';
    }).join("");
    return '' +
      '<button type="button" class="qa-fab" id="qa-fab" data-qa-fab title="افزودن سریع">+</button>' +
      '<div class="qa-pop" id="qa-pop" hidden>' +
        '<div class="qa-pop-title">افزودن سریع</div>' +
        '<div class="qa-pop-grid">' + btns + '</div>' +
        '<div class="qa-pop-actions">' +
          '<button type="button" class="qa-pop-btn qa-manual" data-qa-manual>✏️ افزودن دستی</button>' +
          '<button type="button" class="qa-pop-btn qa-gear" data-qa-settings title="تنظیمات میان‌برها">⚙️ تنظیمات</button>' +
        '</div>' +
      '</div>';
  }

  function _qaOpenSettings() {
    // [PATCH:phase-28.2.4c] minimal settings UI — simple inputs, no full pickers
    var presets = _qaGetPresets();
    var rows = presets.map(function (p, idx) {
      var dm = (typeof p.durationMinutes === "number" && p.durationMinutes >= 5) ? p.durationMinutes : 60;
      return '<div class="qas-row" data-qa-idx="' + idx + '">' +
        '<span class="qas-ico">' + (p.icon || "") + '</span>' +
        '<span class="qas-name">' + escapeHTML(p.label || p.id) + '</span>' +
        '<input type="time" class="qas-time" value="' + (p.time || "") + '">' +
        '<button type="button" class="qas-dur-btn" data-min="' + dm + '">' + _qaFmtDuration(dm) + '</button>' +
        '<label class="qas-toggle"><input type="checkbox" class="qas-en" ' + (p.enabled !== false ? 'checked' : '') + '></label>' +
        '</div>';
    }).join("");
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal qas-modal" role="dialog" aria-modal="true">' +
        '<h3>میان‌برهای روزانه</h3>' +
        '<div class="qas-head">' +
          '<span></span><span>نام</span><span>ساعت شروع</span><span>مدت</span><span>فعال</span>' +
        '</div>' +
        '<div class="qas-list">' + rows + '</div>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" type="button" data-close>انصراف</button>' +
          '<button class="btn primary" type="button" data-confirm>ذخیره</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    // [PATCH:phase-28.2.4d] dur-btn popover
    overlay.addEventListener("click", function (e) {
      var btn = e.target.closest(".qas-dur-btn");
      if (!btn) return;
      e.stopPropagation();
      _qaOpenDurPop(btn, function (m) {
        btn.dataset.min = String(m);
        btn.textContent = _qaFmtDuration(m);
      });
    });
    function close() { overlay.remove(); }
    overlay.querySelector("[data-close]").addEventListener("click", close);
    var _delBtn = overlay.querySelector("[data-delete-task]");
    if (_delBtn) _delBtn.addEventListener("click", function () { close(); confirmDeleteTask(taskId); });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector("[data-confirm]").addEventListener("click", function () {
      overlay.querySelectorAll("[data-qa-idx]").forEach(function (row) {
        var idx = parseInt(row.dataset.qaIdx, 10);
        var p = presets[idx];
        if (!p) return;
        var tv = row.querySelector(".qas-time").value;
        var durBtn = row.querySelector(".qas-dur-btn");
        var dv = durBtn ? parseInt(durBtn.dataset.min, 10) : NaN;
        if (tv && /^\d{2}:\d{2}$/.test(tv)) p.time = tv;
        if (!isNaN(dv)) { if (dv < 5) dv = 5; if (dv > 1440) dv = 1440; p.durationMinutes = dv; }
        p.enabled = !!row.querySelector(".qas-en").checked;
      });
      try { saveState(); } catch (e) {}
      close();
      render();
    });
  }

  function _qaClosePop() {
    var pop = document.getElementById("qa-pop");
    if (pop) pop.hidden = true;
  }

  document.addEventListener("click", function (e) {
    var fab = e.target.closest && e.target.closest("[data-qa-fab]");
    if (fab) {
      e.stopPropagation();
      var pop = document.getElementById("qa-pop");
      if (pop) pop.hidden = !pop.hidden;
      return;
    }
    var addBtn = e.target.closest && e.target.closest("[data-qa-add]");
    if (addBtn) { e.stopPropagation(); _qaAddPreset(addBtn.dataset.qaAdd); _qaClosePop(); return; }
    var setBtn = e.target.closest && e.target.closest("[data-qa-settings]");
    if (setBtn) { e.stopPropagation(); _qaClosePop(); _qaOpenSettings(); return; }
    var manualBtn = e.target.closest && e.target.closest("[data-qa-manual]");
    if (manualBtn) { e.stopPropagation(); _qaClosePop(); openTaskForm(); return; }
    var pop = document.getElementById("qa-pop");
    if (pop && !pop.hidden && !e.target.closest(".qa-pop") && !e.target.closest("[data-qa-fab]")) pop.hidden = true;
  });
  const SAMPLE_TASKS   = DATA.sampleTasks || [];
  const APP_VERSION    = DATA.appVersion || "0.2.0";
  const SCHEMA_VERSION = DATA.schemaVersion || 2;

  const STORAGE_KEY = "internship-os.workspace.v2";

  // ─── آدرس سرور محلی ───
  const API_BASE = (location.origin && location.origin.startsWith("http"))
    ? location.origin
    : "http://127.0.0.1:8977";
  const THEME_KEY   = "internship-os.theme";

  // ─── [PATCH:lib-connect] Use shared lib if available ───
  var _LIB = window.InternshipLib || null;
  var _esc = function (str) { return escapeHTML(str); };


  function _notifyApp(level, msg, opts) {
    try {
      var N = window.InternshipResidency && window.InternshipResidency.notify;
      if (N && typeof N[level] === "function") { N[level](msg, opts); return; }
    } catch (e) {}
    try { if (window.InternshipLib && window.InternshipLib.toast) window.InternshipLib.toast(msg, level === "error" ? "error" : ""); }
    catch (e2) { console.warn("[notify fallback]", msg); }
  }

  // ─── [PATCH:id-unify] Central ID generator ───
  function _mkId(prefix) {
    if (_LIB && _LIB.id && _LIB.id.content) {
      try { return _LIB.id.content(prefix); } catch (e) {}
    }
    return _mkId(prefix);
  }

  // ─── [PATCH:replan-trigger-v20] Change notification helper ───
  function _rtNotify(type, payload) {
    try {
      var RT = window.InternshipResidency && window.InternshipResidency.replanTrigger;
      if (RT && RT.notifyChange) RT.notifyChange(type, payload || {});
    } catch (e) {}
  }
  function _rtIsRelevantTask(t) {
    try {
      var RT = window.InternshipResidency && window.InternshipResidency.replanTrigger;
      if (RT && RT.isRelevantTask) return RT.isRelevantTask(t);
    } catch (e) {}
    return false;
  }

  const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
  const faNum = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[+d]);

  const JMONTHS   = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  const JWEEKDAYS = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
  const ROUTES = ["dashboard","calendar","planner","clinical","study","residency","progress","data","help"];

  /* ─── Jalali calendar ──────────────────────────────────── */

  function gregorianToJalali(gy, gm, gd) {
    const gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
    let jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    const gy2 = (gm > 2) ? (gy + 1) : gy;
    let days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
             + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    const jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    const jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }

  function jalaliToGregorian(jy, jm, jd) {
    let gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    let days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4)
             + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097);
    days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461);
    days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    let gd = days + 1;
    const leap = (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0));
    const sal_a = [0,31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    let gm = 0;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
  }

  function todayJalali() {
    const now = new Date();
    const [jy, jm, jd] = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return jy + "/" + jm + "/" + jd;
  }

  function dateKey(jy, jm, jd) { return jy + "/" + jm + "/" + jd; }

  function parseJalali(str) {
    if (!str) return null;
    const parts = String(str).split("/").map((x) => parseInt(x, 10));
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return { jy: parts[0], jm: parts[1], jd: parts[2] };
  }

  function compareJalaliDate(a, b) {
    const pa = parseJalali(a), pb = parseJalali(b);
    if (!pa || !pb) return 0;
    if (pa.jy !== pb.jy) return pa.jy - pb.jy;
    if (pa.jm !== pb.jm) return pa.jm - pb.jm;
    return pa.jd - pb.jd;
  }

  function weekdayName(jy, jm, jd) {
    const g = jalaliToGregorian(jy, jm, jd);
    const d = new Date(g[0], g[1] - 1, g[2]);
    return JWEEKDAYS[(d.getDay() + 1) % 7];
  }

  function prettyDate(jy, jm, jd) {
    return faNum(jd) + " " + JMONTHS[jm - 1] + " " + faNum(jy);
  }

  function prettyDateWD(jy, jm, jd) {
    return faNum(jd) + " " + JMONTHS[jm - 1] + " " + faNum(jy) + " · " + weekdayName(jy, jm, jd);
  }

  function jalaliYearLength(jy) {
    const g1 = jalaliToGregorian(jy, 1, 1);
    const g2 = jalaliToGregorian(jy + 1, 1, 1);
    const d1 = Date.UTC(g1[0], g1[1] - 1, g1[2]);
    const d2 = Date.UTC(g2[0], g2[1] - 1, g2[2]);
    return Math.round((d2 - d1) / 86400000);
  }

  function isJalaliLeap(jy) { return jalaliYearLength(jy) === 366; }

  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
  }

  function jalaliMonthStartWeekday(jy, jm) {
    const g = jalaliToGregorian(jy, jm, 1);
    const d = new Date(g[0], g[1] - 1, g[2]);
    return (d.getDay() + 1) % 7;
  }

  function addJalaliMonths(jy, jm, delta) {
    const total = (jy * 12) + (jm - 1) + delta;
    return { jy: Math.floor(total / 12), jm: ((total % 12) + 12) % 12 + 1 };
  }

  function addJalaliDays(jy, jm, jd, delta) {
    const g = jalaliToGregorian(jy, jm, jd);
    const d = new Date(g[0], g[1] - 1, g[2]);
    d.setDate(d.getDate() + delta);
    const r = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { jy: r[0], jm: r[1], jd: r[2] };
  }

  function addJalaliMonthsToDate(jy, jm, jd, delta) {
    const total = jy * 12 + (jm - 1) + delta;
    const nj = Math.floor(total / 12);
    const nm = ((total % 12) + 12) % 12 + 1;
    const nd = Math.min(jd, jalaliMonthLength(nj, nm));
    return { jy: nj, jm: nm, jd: nd };
  }

  // ─── [PATCH:lib-override] Override local functions with lib versions ───
  if (_LIB) {
    try {
      // faNum is const — its local impl is identical to lib
      if (_LIB.escapeHTML) escapeHTML = _LIB.escapeHTML;
      if (_LIB.toast) toast = _LIB.toast;
      if (_LIB.date) {
        var _d = _LIB.date;
        if (_d.gregorianToJalali) gregorianToJalali = _d.gregorianToJalali;
        if (_d.jalaliToGregorian) jalaliToGregorian = _d.jalaliToGregorian;
        if (_d.isJalaliLeap) isJalaliLeap = _d.isJalaliLeap;
        if (_d.jalaliMonthLength) jalaliMonthLength = _d.jalaliMonthLength;
        if (_d.jalaliMonthStartWeekday) jalaliMonthStartWeekday = _d.jalaliMonthStartWeekday;
        if (_d.addJalaliMonths) addJalaliMonths = _d.addJalaliMonths;
        if (_d.addJalaliDays) addJalaliDays = _d.addJalaliDays;
        if (_d.addJalaliMonthsToDate) addJalaliMonthsToDate = _d.addJalaliMonthsToDate;
        if (_d.parseJalali) parseJalali = _d.parseJalali;
        if (_d.compareJalaliDate) compareJalaliDate = _d.compareJalaliDate;
        if (_d.weekdayName) weekdayName = _d.weekdayName;
        if (_d.prettyDate) prettyDate = _d.prettyDate;
        if (_d.prettyDateWD) prettyDateWD = _d.prettyDateWD;
        if (_d.dateKey) dateKey = _d.dateKey;
        if (_d.todayJalaliString) todayJalali = _d.todayJalaliString;
      }
    } catch (e) { console.warn("[lib-override] failed:", e); }
  }

  function jalaliToDayNumber(jy, jm, jd) {
    const g = jalaliToGregorian(jy, jm, jd);
    return Math.floor(Date.UTC(g[0], g[1] - 1, g[2]) / 86400000);
  }

  /* ─── State ────────────────────────────────────────────── */

  let state = null;

  function freshState() {
    const s = JSON.parse(JSON.stringify(EMPTY));
    s.schemaVersion = SCHEMA_VERSION;
    if (typeof window.InternshipResidency !== "undefined" && window.InternshipResidency.createEmptyResidencyState) {
      s.residency = window.InternshipResidency.createEmptyResidencyState();
    } else if (!s.residency || typeof s.residency !== "object") {
      s.residency = {
        schemaVersion: 1,
        meta: { activePlanId: null, createdAt: Date.now(), updatedAt: Date.now() },
        settings: {},
        books: [], rounds: [], enrollments: [], goals: [],
        activities: [], assessments: [], capacityProfiles: [],
        dayOverrides: [], manualOverrides: [], planVersions: []
      };
    }
    return migrateState(s);
  }

  function migrateState(s) {
    if (!s || typeof s !== "object") return s;

    // ─── v2 → v3 ───────────────────────────────────────────
    if (!s.schemaVersion || s.schemaVersion < 3) {

      // مجموعه‌های جدید
      if (!s.curriculumMeta || typeof s.curriculumMeta !== "object") s.curriculumMeta = {};
      if (!s.procedureProgress || typeof s.procedureProgress !== "object") s.procedureProgress = {};

      // لایه‌ی محتوای کاربر
      if (!s.customContent || typeof s.customContent !== "object") {
        s.customContent = {
          clinicalSpecialties: {},
          clinicalCategories: {},
          clinicalItems: {},
          procedureCategories: {},
          procedureItems: {}
        };
      } else {
        if (!s.customContent.clinicalSpecialties) s.customContent.clinicalSpecialties = {};
        if (!s.customContent.clinicalCategories)  s.customContent.clinicalCategories  = {};
        if (!s.customContent.clinicalItems)       s.customContent.clinicalItems       = {};
        if (!s.customContent.procedureCategories) s.customContent.procedureCategories = {};
        if (!s.customContent.procedureItems)      s.customContent.procedureItems      = {};
      }

      // سابقه‌ی Importها — برای حذف یک‌کلیکی
      if (!Array.isArray(s.imports)) s.imports = [];
      if (!Array.isArray(s.programContent)) s.programContent = [];

      // ارتقای Taskها — افزودن فیلدهای جدید
      if (Array.isArray(s.tasks)) {
        const now = Date.now();
        s.tasks.forEach((t) => {
          if (!t) return;
          if (!t.sourceType) t.sourceType = "manual";
          if (t.sourceId === undefined) t.sourceId = null;
          if (!t.taskType) t.taskType = "other";
          if (!t.createdAt) t.createdAt = now;
          if (!t.updatedAt) t.updatedAt = now;
        });
      }

      s.schemaVersion = 3;
    }

    // ─── v3 → v4 ───────────────────────────────────────────
    if (!s.schemaVersion || s.schemaVersion < 4) {
      // programContent: محتوایی که کاربر به برنامه‌اش اضافه کرده
      if (!Array.isArray(s.programContent)) s.programContent = [];

      // durationMinutes: مدت زمان تسک
      if (Array.isArray(s.tasks)) {
        s.tasks.forEach((t) => {
          if (!t) return;
          if (typeof t.durationMinutes !== "number") t.durationMinutes = null;
        });
      }

      s.schemaVersion = 4;
    }

    // ─── v4 → v5 ───────────────────────────────────────────
    if (!s.schemaVersion || s.schemaVersion < 5) {
      var _normTime = function (t) {
        if (!t || typeof t !== "string") return t;
        var parts = t.split(":");
        if (parts.length !== 2) return t;
        var h = parseInt(parts[0], 10);
        var m = parseInt(parts[1], 10);
        if (isNaN(h) || isNaN(m)) return t;
        if (h < 0 || h > 23 || m < 0 || m > 59) return t;
        return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
      };

      if (Array.isArray(s.tasks)) {
        s.tasks.forEach(function (t) {
          if (!t) return;
          if (t.time) t.time = _normTime(t.time);
        });
      }
      if (Array.isArray(s.shifts)) {
        s.shifts.forEach(function (sh) {
          if (!sh) return;
          if (sh.startTime) sh.startTime = _normTime(sh.startTime);
          if (sh.endTime) sh.endTime = _normTime(sh.endTime);
        });
      }

      s.schemaVersion = 5;
    }

    if (!s.schemaVersion || s.schemaVersion < 6) {
      if (typeof window.InternshipResidency !== "undefined" && window.InternshipResidency.createEmptyResidencyState) {
        if (!s.residency || typeof s.residency !== "object") {
          s.residency = window.InternshipResidency.createEmptyResidencyState();
        } else {
          s.residency = window.InternshipResidency.normalizeResidencyState(s.residency);
        }
      } else if (!s.residency || typeof s.residency !== "object") {
        s.residency = {
          schemaVersion: 1,
          meta: { activePlanId: null, createdAt: Date.now(), updatedAt: Date.now() },
          settings: {},
          books: [], rounds: [], enrollments: [], goals: [],
          activities: [], assessments: [], capacityProfiles: [],
          dayOverrides: [], manualOverrides: [], planVersions: []
        };
      }
      s.schemaVersion = 6;
    }

    if (!s.schemaVersion || s.schemaVersion < 7) {
      if (typeof window.InternshipResidency !== "undefined" &&
          window.InternshipResidency.createEmptyResidencyState) {
        if (!s.residency || typeof s.residency !== "object") {
          s.residency = window.InternshipResidency.createEmptyResidencyState();
        } else {
          s.residency = window.InternshipResidency.normalizeResidencyState(s.residency);
        }
        if (!Array.isArray(s.residency.plans)) s.residency.plans = [];
        if (!Array.isArray(s.residency.subjects)) s.residency.subjects = [];
        if (s.residency.meta && s.residency.meta.activePlanId) {
          var planExists = s.residency.plans.some(function (p) {
            return p && p.id === s.residency.meta.activePlanId;
          });
          if (!planExists) s.residency.meta.activePlanId = null;
        }
      }
      s.schemaVersion = 7;
    }

    if (!s.schemaVersion || s.schemaVersion < 8) {
      if (typeof window.InternshipResidency !== "undefined" &&
          window.InternshipResidency.normalizeResidencyState) {
        if (!s.residency || typeof s.residency !== "object") {
          s.residency = window.InternshipResidency.createEmptyResidencyState();
        } else {
          s.residency = window.InternshipResidency.normalizeResidencyState(s.residency);
        }
      }
      if (Array.isArray(s.shifts)) {
        s.shifts.forEach(function (sh) {
          if (sh && !("rotationId" in sh)) sh.rotationId = null;
        });
      }
      if (s.residency && s.residency.settings) {
        if (!s.residency.settings.weekdayDefaults) {
          s.residency.settings.weekdayDefaults = {
            saturday:"normal", sunday:"normal", monday:"normal",
            tuesday:"normal", wednesday:"normal", thursday:"free", friday:"free"
          };
        }
        if (!s.residency.settings.reservePolicy) {
          s.residency.settings.reservePolicy = {
            dailyPercent: 10,
            deadlineReservePercent: 10,
            allowSystemSuggestion: true
          };
        }
      }
      s.schemaVersion = 8;
    }

    if (!s.schemaVersion || s.schemaVersion < 9) {
      if (Array.isArray(s.rotations)) {
        s.rotations.forEach(function (r) {
          if (!r) return;
          if (!r.activitySchedule || typeof r.activitySchedule !== "object") {
            r.activitySchedule = {
              saturday:"active", sunday:"active", monday:"active",
              tuesday:"active", wednesday:"active", thursday:"inactive", friday:"inactive"
            };
          }
        });
      }
      if (s.residency && Array.isArray(s.residency.dayOverrides)) {
        s.residency.dayOverrides.forEach(function (o) {
          if (!o) return;
          if (!("rotationId" in o)) o.rotationId = null;
          if (!("rotationStatus" in o)) o.rotationStatus = null;
        });
      }
      s.schemaVersion = 9;
    }

    if (!s.schemaVersion || s.schemaVersion < 10) {
      if (typeof window.InternshipResidency !== "undefined" && window.InternshipResidency.normalizeResidencyState) {
        if (s.residency && typeof s.residency === "object") {
          s.residency = window.InternshipResidency.normalizeResidencyState(s.residency);
        }
      }
      if (Array.isArray(s.tasks)) {
        s.tasks.forEach(function (t) {
          if (!t) return;
          if (!("residencyActivityId" in t)) t.residencyActivityId = null;
        });
      }
      s.schemaVersion = 10;
    }

    if (!s.schemaVersion || s.schemaVersion < 11) {
      if (s.residency && typeof s.residency === "object") {
        if (!Array.isArray(s.residency.constraints)) s.residency.constraints = [];
        if (Array.isArray(s.residency.manualOverrides)) {
          s.residency.manualOverrides.forEach(function (o) {
            if (!o) return;
            if (!("strength" in o)) o.strength = "hard";
            if (!("source" in o)) o.source = "user";
            if (!("priority" in o)) o.priority = 500;
            if (!("lifetime" in o)) o.lifetime = "permanent";
            if (!("operator" in o)) o.operator = "eq";
          });
        }
      }
      if (Array.isArray(s.tasks)) {
        s.tasks.forEach(function (t) {
          if (!t) return;
          if (!("locked" in t)) t.locked = false;
        });
      }
      if (s.residency && Array.isArray(s.residency.activities)) {
        s.residency.activities.forEach(function (a) {
          if (!a) return;
          if (!("locked" in a)) a.locked = false;
        });
      }
      s.schemaVersion = 11;
    }

    if (!s.schemaVersion || s.schemaVersion < 12) {
      // Phase 6.1: no new entity, only ensures planner-compatible defaults.
      if (s.residency && s.residency.settings) {
        if (!s.residency.settings.defaultStudySpeed) {
          s.residency.settings.defaultStudySpeed = { pagesPerHour: 20 };
        }
        if (typeof s.residency.settings.defaultStudySpeed.pagesPerHour !== "number") {
          s.residency.settings.defaultStudySpeed.pagesPerHour = 20;
        }
        if (!s.residency.settings.reservePolicy) {
          s.residency.settings.reservePolicy = {
            dailyPercent: 10,
            deadlineReservePercent: 10,
            allowSystemSuggestion: true
          };
        }
      }
      s.schemaVersion = 12;
    }

    if (!s.schemaVersion || s.schemaVersion < 13) {
      // Phase 6.2 — no new persistent entity, only version bump.
      s.schemaVersion = 13;
    }

    if (!s.schemaVersion || s.schemaVersion < 14) {
      // Phase 6.3 — no new persistent entity, version only.
      s.schemaVersion = 14;
    }

    if (!s.schemaVersion || s.schemaVersion < 15) {
      if (s.residency && typeof s.residency === "object") {
        if (!s.residency.reserveState || typeof s.residency.reserveState !== "object") {
          s.residency.reserveState = { consumedByPlan: {}, updatedAt: Date.now() };
        } else if (!s.residency.reserveState.consumedByPlan) {
          s.residency.reserveState.consumedByPlan = {};
        }
      }
      s.schemaVersion = 15;
    }

    if (!s.schemaVersion || s.schemaVersion < 16) {
      if (s.residency && typeof s.residency === "object") {
        if (!Array.isArray(s.residency.reviewStates)) s.residency.reviewStates = [];
        if (!s.residency.settings) s.residency.settings = {};
        if (!s.residency.settings.reviewSettings || typeof s.residency.settings.reviewSettings !== "object") {
          s.residency.settings.reviewSettings = {
            enabled: true,
            defaultAlgorithm: "sr_v1",
            minIntervalDays: 1,
            maxIntervalDays: 180,
            dailyReviewLimit: 20,
            maxReviewMinutesPerDay: 90,
            overduePolicy: "spread",
            horizonDays: 30,
            autoRegisterOnStudyComplete: true
          };
        }
      }
      s.schemaVersion = 16;
    }

    if (!s.schemaVersion || s.schemaVersion < 17) {
      // Phase 11 — no new persistent entity, settings extended
      if (s.residency && s.residency.settings && s.residency.settings.reviewSettings) {
        var rs = s.residency.settings.reviewSettings;
        if (!rs.overduePolicy) rs.overduePolicy = "spread";
      }
      s.schemaVersion = 17;
    }

    if (!s.schemaVersion || s.schemaVersion < 18) {
      if (!Array.isArray(s.contentDrafts)) s.contentDrafts = [];
      s.schemaVersion = 18;
    }

    if (!s.schemaVersion || s.schemaVersion < 19) {
      if (s.residency && Array.isArray(s.residency.planVersions)) {
        s.residency.planVersions.forEach(function (pv) {
          if (pv && !("snapshot" in pv)) pv.snapshot = null;
        });
      }
      s.schemaVersion = 19;
    }

    if (!s.schemaVersion || s.schemaVersion < 20) {
      if (s.residency && Array.isArray(s.residency.enrollments)) {
        s.residency.enrollments.forEach(function (e) {
          if (e && !("initialStudyBaseline" in e)) e.initialStudyBaseline = null;
        });
      }
      s.schemaVersion = 20;
    }

    // ─── v20 → v21 (Phase 9): round-level study speed + reading strategy ───
    if (!s.schemaVersion || s.schemaVersion < 21) {
      if (s.residency) {
        if (Array.isArray(s.residency.rounds)) {
          s.residency.rounds.forEach(function (r) {
            if (r && !("studySpeedPagesPerHour" in r)) r.studySpeedPagesPerHour = null;
          });
        }
        if (!s.residency.settings || typeof s.residency.settings !== "object") {
          s.residency.settings = {};
        }
        if (!("readingStrategy" in s.residency.settings)) {
          s.residency.settings.readingStrategy = null;
        }
      }
      s.schemaVersion = 21;
    }

    // v21 -> v22 (Phase 22.2): explicit boolean round.locked
    // Schema compatibility only: no dates, durations, or scheduling changes.
    if (!s.schemaVersion || s.schemaVersion < 22) {
      if (s.residency && Array.isArray(s.residency.rounds)) {
        s.residency.rounds.forEach(function (r) {
          if (!r || typeof r !== "object") return;
          if (typeof r.locked !== "boolean") r.locked = false;
        });
      }
      s.schemaVersion = 22;
    }

    return s;
  }

  function normalizeStateObject(parsed) {
    if (!parsed || typeof parsed !== "object") return null;
    const s = JSON.parse(JSON.stringify(EMPTY));
    Object.assign(s, parsed);
    s.workspace = Object.assign({}, EMPTY.workspace, parsed.workspace || {});
    s.settings  = Object.assign({}, EMPTY.settings,  parsed.settings  || {});
    if (!Array.isArray(s.tasks))      s.tasks = [];
    if (!s.health || typeof s.health !== "object") s.health = {};
    if (!s.health.profile || typeof s.health.profile !== "object") s.health.profile = { birthDate: null, sex: null, heightCm: null, activityLevel: null, goal: null, targetWeightKg: null };
    if (!Array.isArray(s.health.bodyLog)) s.health.bodyLog = [];
    if (!Array.isArray(s.projects)) s.projects = []; /* PATCH:phase-F8-projects */
    if (!s.finance || typeof s.finance !== "object") s.finance = {}; /* PATCH:phase-F9-finance */
    if (!Array.isArray(s.finance.transactions)) s.finance.transactions = [];
    if (!Array.isArray(s.finance.categories)) s.finance.categories = [];
    if (!s.finance.budgets || typeof s.finance.budgets !== "object") s.finance.budgets = {};
    if (!s.life || typeof s.life !== "object") s.life = {}; /* PATCH:phase-F10-life */
    if (!Array.isArray(s.life.items)) s.life.items = [];

    if (!Array.isArray(s.rotations))  s.rotations = [];
    if (!Array.isArray(s.shifts))     s.shifts = [];
    if (!Array.isArray(s.cases))      s.cases = [];
    if (!Array.isArray(s.procedures)) s.procedures = [];
    if (!s.clinicalProgress || typeof s.clinicalProgress !== "object") s.clinicalProgress = {};
    if (!s.procedureProgress || typeof s.procedureProgress !== "object") s.procedureProgress = {};
    if (!s.curriculumMeta || typeof s.curriculumMeta !== "object") s.curriculumMeta = {};
    if (!Array.isArray(s.imports)) s.imports = [];
    if (!s.customContent || typeof s.customContent !== "object") {
      s.customContent = {
        clinicalSpecialties: {},
        clinicalCategories: {},
        clinicalItems: {},
        procedureCategories: {},
        procedureItems: {},
        residencySubjects: {},
        residencyTopics: {},
        residencyResources: {}
      };
    }
    if (!s.customContent.residencySubjects)  s.customContent.residencySubjects  = {};
    if (!s.customContent.residencyTopics)    s.customContent.residencyTopics    = {};
    if (!s.customContent.residencyResources) s.customContent.residencyResources = {};
    if (typeof window.InternshipResidency !== "undefined" && window.InternshipResidency.normalizeResidencyState) {
      s.residency = window.InternshipResidency.normalizeResidencyState(s.residency);
    } else if (!s.residency || typeof s.residency !== "object") {
      s.residency = {
        schemaVersion: 1,
        meta: { activePlanId: null, createdAt: Date.now(), updatedAt: Date.now() },
        settings: {},
        books: [], rounds: [], enrollments: [], goals: [],
        activities: [], assessments: [], capacityProfiles: [],
        dayOverrides: [], manualOverrides: [], planVersions: []
      };
    }
    return migrateState(s);
  }

  function loadState() {
    try {
      // 1. state.js
      let fromFile = null;
      let fileSavedAt = 0;
      if (window.INTERNSHIP_STATE && typeof window.INTERNSHIP_STATE === "object") {
        fromFile = normalizeStateObject(window.INTERNSHIP_STATE);
        fileSavedAt = Number(window.INTERNSHIP_STATE_SAVED_AT) || 0;
      }

      // 2. localStorage
      let fromLS = null;
      let lsSavedAt = 0;
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const wrapper = JSON.parse(raw);
          if (wrapper && wrapper.state && typeof wrapper.state === "object") {
            fromLS = normalizeStateObject(wrapper.state);
            lsSavedAt = Number(wrapper.savedAt) || 0;
          } else if (wrapper && typeof wrapper === "object") {
            fromLS = normalizeStateObject(wrapper);
            lsSavedAt = 0;
          }
        }
      } catch (e) {}

      // 3. انتخاب جدیدتر
      if (fromFile && (!fromLS || fileSavedAt >= lsSavedAt)) {
        console.log("[Internship OS] loaded from state.js");
        return fromFile;
      }
      if (fromLS) {
        console.log("[Internship OS] loaded from localStorage");
        return fromLS;
      }
      return freshState();
    } catch (err) {
      console.warn("[Internship OS] load failed:", err);
      return freshState();
    }
  }
  // ─── ذخیره‌سازی به سرور (debounced) ───
  let _saveDebounceTimer = null;
  let _savePending = false;

  function saveState() {
    // ─── ۱. localStorage (cache فوری) ───
    try {
      const wrapper = { state: state, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapper));
    } catch (err) {
      console.warn("[Internship OS] localStorage save failed:", err);
    }

    // ─── ۲. سرور (debounced 700ms) ───
    _savePending = true;
    if (_saveDebounceTimer) clearTimeout(_saveDebounceTimer);
    _saveDebounceTimer = setTimeout(() => {
      _saveDebounceTimer = null;
      saveStateToServer();
    }, 700);
  }

  function saveStateToServer() {
    if (!_savePending) return;
    _savePending = false;
    try {
      fetch(API_BASE + "/api/save-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: state, savedAt: Date.now() })
      }).then(function(r) {
        if (!r.ok) console.warn("[Internship OS] save-state HTTP", r.status);
      }).catch(function(err) {
        console.warn("[Internship OS] save-state network error:", err);
      });
    } catch (err) {
      console.warn("[Internship OS] save-state error:", err);
    }
  }

  function flushStateToServer() {
    // برای beforeunload — بهترین تلاش برای ذخیره‌ی قطعی
    try {
      const wrapper = { state: state, savedAt: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapper));
    } catch (e) {}
    try {
      const body = JSON.stringify({ state: state, savedAt: Date.now() });
      if (navigator.sendBeacon) {
        const blob = new Blob([body], { type: "application/json" });
        navigator.sendBeacon(API_BASE + "/api/save-state", blob);
      } else {
        fetch(API_BASE + "/api/save-state", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: body,
          keepalive: true
        }).catch(function() {});
      }
    } catch (e) {}
  }
  /* ─── Navigation ───────────────────────────────────────── */

  var _dashSelectedDay = null;
  var _dashWeekOffset = 0;
  let route = "dashboard";
  let routeParam = null;

  function setRoute(r, param) {
    let actualRoute = r;
    if (typeof r === "string" && r.indexOf(":") !== -1) {
      const parts = r.split(":");
      actualRoute = parts[0];
      param = parts[1];
    }

    // ─── Coming Soon: پاپ‌آپ به‌جای رفتن به صفحه ───
    // این چک باید اول انجام بشه چون بعدش actualRoute ممکنه به area-detail تبدیل بشه
    if (typeof COMING_SOON_AREAS !== "undefined" && COMING_SOON_AREAS.indexOf(actualRoute) !== -1) {
      showComingSoonModal(actualRoute);
      return;
    }

    const MAIN_ROUTES = ["dashboard","calendar","planner","clinical","study","emergency","procedures","residency","study-together","progress","data","help"];
    const isAreaId = LIFE_AREAS.some((a) => a.id === actualRoute);
    if (isAreaId && MAIN_ROUTES.indexOf(actualRoute) === -1) {
      param = actualRoute;
      actualRoute = "area-detail";
    }

    routeParam = (typeof param !== "undefined") ? param : null;

    const validRoutes = MAIN_ROUTES.concat(["area-detail"]);
    if (validRoutes.indexOf(actualRoute) === -1) actualRoute = "dashboard";

    route = actualRoute;
    if (location.hash !== "#/" + actualRoute) history.replaceState(null, "", "#/" + actualRoute);
    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.route === actualRoute);
    });
    render();
    try { _updateMealReminder(); } catch (e) {}
    window.scrollTo(0, 0);
  }

  function routeFromHash() {
    const h = location.hash.replace(/^#\/?/, "");
    return ROUTES.indexOf(h) !== -1 ? h : "dashboard";
  }

  /* ─── Rendering dispatch ───────────────────────────────── */

  const view = document.getElementById("view");

  function render() {
    try { _updateDashBell(); } catch (e) {}  /* PATCH:phase-F7-bell2 */
    switch (route) {
      case "dashboard": return renderDashboard();
      case "calendar":  return renderCalendar();
      case "planner":   return renderPlanner();
      case "clinical":  return renderClinicalHub();
      case "study":     return renderStudy();
      case "emergency": return renderEmergency();
      case "procedures": return renderProceduresPage();
      case "residency": return renderResidency();
      case "progress":  return renderProgress();
      case "data":      return renderData();
      case "help":      return renderHelp();
      case "study-together": return renderStudyTogether();
      case "area-detail": return renderAreaDetail(routeParam);
    }
  }

  /* ─── Dashboard ────────────────────────────────────────── */

  function _cockpitTick() {
    try {
      var el = document.querySelector(".dgc-clock-time");
      if (!el) return;
      var d = new Date();
      var pad = function (v) { return (v < 10 ? "0" : "") + v; };
      var s = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
      el.textContent = s.replace(/[0-9]/g, function (ch) { return "۰۱۲۳۴۵۶۷۸۹"[+ch]; });
    } catch (e) {}
  }
  function _cockpitAction(kind) {
    var R = window.InternshipResidency || {};
    if (kind === "food") {
      var _h = (new Date()).getHours();
      var _meal = "breakfast";
      if (_h >= 10 && _h < 15) _meal = "lunch";
      else if (_h >= 15 && _h < 21) _meal = "dinner";
      else if (_h >= 21 || _h < 2) _meal = "snack";
      try {
        if (R.fooddbUI && typeof R.fooddbUI.open === "function") { R.fooddbUI.open(_meal); return; }
      } catch (e) {}
      _notifyApp("warning", "ماژول ثبت غذا در دسترس نیست.");
      return;
    }
    if (kind === "finance") {
      try { setRoute("area-detail", "income"); } catch (e) {}
      setTimeout(function () {
        try {
          var R2 = window.InternshipResidency || {};
          if (R2.projectsUI && typeof R2.projectsUI.openTab === "function") {
            R2.projectsUI.openTab(view, "finance");
          }
        } catch (e) {}
      }, 140);
      return;
    }
    if (kind === "sleep") {
      try { setRoute("area-detail", "sleep"); } catch (e) {}
      setTimeout(function () {
        try {
          var R2 = window.InternshipResidency || {};
          if (R2.sleepUI && typeof R2.sleepUI.openForm === "function") {
            R2.sleepUI.openForm("night", todayJalali());
          }
        } catch (e) {}
      }, 170);
      return;
    }
  }
  function renderDashboard() {
    if (typeof view !== "undefined" && view && !view.__cockpitWired) {
      view.__cockpitWired = true;
      view.addEventListener("click", function (e) {
        var t = e.target && e.target.closest ? e.target.closest("[data-cockpit]") : null;
        if (!t) return;
        _cockpitAction(t.getAttribute("data-cockpit"));
      });
    }
    if (typeof window !== "undefined") {
      if (!window.__cockpitClockId) { window.__cockpitClockId = setInterval(_cockpitTick, 1000); }
      setTimeout(_cockpitTick, 40);
    }
    const today = todayJalali();
    const t = parseJalali(today);
    const weekday = weekdayName(t.jy, t.jm, t.jd);
    const todayPretty = prettyDate(t.jy, t.jm, t.jd);

    const _selectedDate = _dashSelectedDay || today;
    const _selP = parseJalali(_selectedDate) || t;
    const _selWeekday = weekdayName(_selP.jy, _selP.jm, _selP.jd);
    const _selPretty = prettyDate(_selP.jy, _selP.jm, _selP.jd);
    const _isToday = _selectedDate === today;

    /* PATCH:phase-F7-merge2 — merge sleep split for today card */
    let todaysTasks = state.tasks
      .filter((task) => task.date === today && task.cancelled !== true)
      .filter((task) => !(task._sleepAuto === "night:evening"));
    todaysTasks = todaysTasks.map((task) => {
      if (task._sleepAuto === "night:morning" && state.sleep && state.sleep.schedule && state.sleep.schedule.night) {
        const nb = state.sleep.schedule.night.bedTime || "22:00";
        const bp = String(nb).split(":");
        const bm = parseInt(bp[0],10)*60 + parseInt(bp[1],10);
        const eveDur = 1440 - bm;
        return Object.assign({}, task, {
          time: nb,
          durationMinutes: (task.durationMinutes || 0) + eveDur
        });
      }
      return task;
    });
    todaysTasks.sort((a, b) => Number(a.completed) - Number(b.completed));

    const stats = overallStats();

    // ─── بنر بالای داشبورد (greeting) ───────────────
    const name = getFirstName();
    const hour = new Date().getHours();
    let greet = "سلام";
    if (hour >= 5 && hour < 12) greet = "صبح بخیر";
    else if (hour >= 12 && hour < 17) greet = "وقت بخیر";
    else if (hour >= 17 && hour < 21) greet = "شب بخیر";
    else greet = "شب‌زنده‌داری";
    const greetLine = name ? `${greet}، ${escapeHTML(name)}` : `${greet}`;

    const currentRot = getCurrentRotation();
    let rotMiniHTML = "";
    if (currentRot) {
      const rStart = parseJalali(currentRot.startDate);
      const rEnd = parseJalali(currentRot.endDate);
      const rotStartDay = jalaliToDayNumber(rStart.jy, rStart.jm, rStart.jd);
      const rotEndDay = jalaliToDayNumber(rEnd.jy, rEnd.jm, rEnd.jd);
      const todayDay = jalaliToDayNumber(t.jy, t.jm, t.jd);
      const totalDays = rotEndDay - rotStartDay + 1;
      const elapsed = Math.max(0, Math.min(totalDays, todayDay - rotStartDay + 1));
      const pct = Math.round((elapsed / totalDays) * 100);
      const rotColor = currentRot.color || "45, 212, 191";
      rotMiniHTML = `
        <div class="dash-rot" style="--rotation-color:rgb(${rotColor})">
          <span class="dash-rot-icon">🏥</span>
          <div class="dash-rot-body">
            <div class="dash-rot-title">روتیشن فعلی: <strong>${escapeHTML(currentRot.title)}</strong></div>
            <div class="dash-rot-track"><div class="dash-rot-fill" style="width:${pct}%"></div></div>
          </div>
          <div class="dash-rot-pct">${faNum(pct)}٪</div>
        </div>
      `;
    }

    const todayShiftsCount = shiftsOnDate(t.jy, t.jm, t.jd).length;
    const pendingCount = state.tasks.filter((x) => !x.completed).length;
    const doneTodayCount = todaysTasks.filter((x) => x.completed).length;

    // ─── کشیک بعدی ─────────────────────────────────
    let nextShiftHTML = "";
    const todayDayN = jalaliToDayNumber(t.jy, t.jm, t.jd);
    const futureShifts = (state.shifts || [])
      .map((s) => {
        const p = parseJalali(s.date);
        if (!p) return null;
        const dN = jalaliToDayNumber(p.jy, p.jm, p.jd);
        return { shift: s, days: dN - todayDayN, p };
      })
      .filter((x) => x && x.days >= 0)
      .sort((a, b) => a.days - b.days);

    if (futureShifts.length > 0) {
      const nxt = futureShifts[0];
      const isToday = nxt.days === 0;
      const daysLabel = isToday ? "امروز" : (nxt.days === 1 ? "فردا" : `${faNum(nxt.days)} روز مانده`);
      nextShiftHTML = `
        <div class="dash-next-shift ${isToday ? "is-today" : ""}">
          <span class="dash-next-shift-icon">🚨</span>
          <div class="dash-next-shift-body">
            <div class="dash-next-shift-label">کشیک بعدی</div>
            <div class="dash-next-shift-value">${prettyDateWD(nxt.p.jy, nxt.p.jm, nxt.p.jd)} · ${nxt.shift.startTime ? faNum(nxt.shift.startTime) : ""}</div>
          </div>
          <div class="dash-next-shift-countdown">${daysLabel}</div>
        </div>
      `;
    }

    const examCountdownHTML = _renderDashExamCountdown();
    const dayTypeInfo = _resolveDashboardDayType();
    const dayTypeBadgeHTML = '<div class="dash-daytype-badge is-' + dayTypeInfo.key + '"><span class="dash-daytype-icon">' + dayTypeInfo.icon + '</span><span class="dash-daytype-label">' + dayTypeInfo.label + '</span></div>';

    const bannerHTML = (function () {
      var todayDayN = jalaliToDayNumber(t.jy, t.jm, t.jd);

      var _todayTotal = state.tasks.filter(function (x) { return x.date === today && !x.cancelled; }).length;
      var _todayDone = state.tasks.filter(function (x) { return x.date === today && x.completed && !x.cancelled; }).length;
      var _todayPend = _todayTotal - _todayDone;
      var _overdueCount = state.tasks.filter(function (x) {
        return !x.completed && !x.cancelled && x.date && x.date < today;
      }).length;

      var _calToday = 0, _calTarget = 0;
      try {
        var _dt = _dayTotals(state, today);
        if (_dt && typeof _dt.kcal === "number") _calToday = Math.round(_dt.kcal);
        var _hh = _healthEnsure(state);
        if (_hh && _hh.calorieTarget && typeof _hh.calorieTarget.kcal === "number") _calTarget = Math.round(_hh.calorieTarget.kcal);
      } catch (e) {}

      var _expToday = 0;
      try {
        var _ftx = (state.finance && Array.isArray(state.finance.transactions)) ? state.finance.transactions : [];
        for (var _fi = 0; _fi < _ftx.length; _fi++) {
          if (_ftx[_fi].date === today && _ftx[_fi].kind === "expense") _expToday += (_ftx[_fi].amount || 0);
        }
        _expToday = Math.round(_expToday);
      } catch (e) {}
      var _expBudgetDay = null;
      try {
        var _bmon = state.finance && state.finance.budgets ? state.finance.budgets[t.jy + "/" + t.jm] : null;
        var _dim = jalaliMonthLength(t.jy, t.jm);
        if (_bmon && typeof _bmon === "object" && typeof _bmon.expense === "number") _expBudgetDay = Math.round(_bmon.expense / _dim);
        else if (typeof _bmon === "number") _expBudgetDay = Math.round(_bmon / _dim);
      } catch (e) {}

      var _fmt = function (n) {
        try {
          var R2 = window.InternshipResidency;
          if (R2 && R2.financeUI && typeof R2.financeUI.formatToman === "function") return R2.financeUI.formatToman(Math.round(n));
        } catch (e) {}
        return faNum(String(Math.round(n)));
      };
      var _pdig = function (s) { return String(s).replace(/[0-9]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[+d]; }); };

      /* ─── Future shifts ─── */
      var _futureShifts = (state.shifts || [])
        .map(function (s) {
          var p = parseJalali(s.date);
          if (!p) return null;
          var dN = jalaliToDayNumber(p.jy, p.jm, p.jd);
          return { shift: s, days: dN - todayDayN, p: p };
        })
        .filter(function (x) { return x && x.days >= 0; })
        .sort(function (a, b) { return a.days - b.days; });

      var _shiftCountdown = null;
      var _shiftLine = "";
      if (_futureShifts.length > 0) {
        var _nxt = _futureShifts[0];
        var _nowH = (new Date()).getHours();
        var _nowM = (new Date()).getMinutes();
        var _ss = _nxt.shift.startTime ? String(_nxt.shift.startTime).split(":") : null;
        if (_nxt.days === 0 && _ss && _ss.length === 2) {
          var _smin = parseInt(_ss[0],10)*60 + parseInt(_ss[1],10);
          var _diff = _smin - (_nowH*60 + _nowM);
          if (_diff > 0) {
            var _hh2 = Math.floor(_diff/60), _mm = _diff % 60;
            _shiftCountdown = (_hh2 > 0 ? faNum(_hh2) + ":" + _pdig((_mm < 10 ? "0" : "") + _mm) : faNum(_mm) + "د");
          } else { _shiftCountdown = "اکنون"; }
        } else if (_nxt.days === 1) { _shiftCountdown = "فردا"; }
        else if (_nxt.days > 1) { _shiftCountdown = faNum(_nxt.days) + "روز"; }
        var _when = _nxt.days === 0 ? "امروز" : (_nxt.days === 1 ? "فردا" : (faNum(_nxt.days) + " روز دیگر"));
        var _time = _nxt.shift.startTime ? faNum(_nxt.shift.startTime) : "";
        _shiftLine = "کشیک بعدی " + _when + (_time ? " ساعت " + _time : "");
      }

      /* ─── Next life event ─── */
      var _lifeLine = "";
      try {
        var _lifeItems = (state.life && Array.isArray(state.life.items)) ? state.life.items : [];
        var _upEvents = [];
        for (var _li = 0; _li < _lifeItems.length; _li++) {
          var _it = _lifeItems[_li];
          if (!_it || !_it.taskId) continue;
          var _tk = null;
          for (var _ti = 0; _ti < state.tasks.length; _ti++) { if (state.tasks[_ti].id === _it.taskId) { _tk = state.tasks[_ti]; break; } }
          if (!_tk || !_tk.date || _tk.completed) continue;
          if (_tk.date < today) continue;
          var _tp = parseJalali(_tk.date);
          if (!_tp) continue;
          var _dn = jalaliToDayNumber(_tp.jy, _tp.jm, _tp.jd) - todayDayN;
          var _m = _catMeta ? _catMeta(_it.category) : null;
          var _icon = (_m && _m.icon) || "📅";
          _upEvents.push({ days: _dn, date: _tk.date, time: _tk.time || "", title: _it.title, icon: _icon });
        }
        _upEvents.sort(function (a, b) { return a.days - b.days; });
        if (_upEvents.length > 0) {
          var _e = _upEvents[0];
          var _wl = _e.days === 0 ? "امروز" : (_e.days === 1 ? "فردا" : (_pdig(_e.days) + " روز"));
          _lifeLine = _e.icon + " " + _e.title + " · " + _wl + (_e.time ? " " + faNum(_e.time) : "");
        }
      } catch (e) {}

      /* ─── Rotation ─── */
      var _rotPct = 0, _rotColor = "148, 163, 184", _rotTitle = "", _rotChip = "";
      if (currentRot) {
        var _rS = parseJalali(currentRot.startDate);
        var _rE = parseJalali(currentRot.endDate);
        var _rSd = jalaliToDayNumber(_rS.jy, _rS.jm, _rS.jd);
        var _rEd = jalaliToDayNumber(_rE.jy, _rE.jm, _rE.jd);
        var _totD = _rEd - _rSd + 1;
        var _el = Math.max(0, Math.min(_totD, todayDayN - _rSd + 1));
        _rotPct = Math.round((_el / _totD) * 100);
        _rotTitle = currentRot.title || "";
        if (currentRot.color) _rotColor = currentRot.color;
        _rotChip = '<span class="dgc-chip is-rot" style="--rc:' + _rotColor + '" title="روتیشن فعال"><span class="dgc-chip-ic">🏥</span> ' + escapeHTML(_rotTitle) + ' <span class="dgc-chip-pct">' + faNum(_rotPct) + '٪</span></span>';
      }

      var _dayTypeChip = '<span class="dgc-daytype is-' + dayTypeInfo.key + '"><span class="dgc-chip-ic">' + dayTypeInfo.icon + '</span> ' + dayTypeInfo.label + '</span>';

      var _workPct = _todayTotal > 0 ? Math.round((_todayDone / _todayTotal) * 100) : 0;
      var _calPct = _calTarget > 0 ? Math.min(100, Math.round((_calToday / _calTarget) * 100)) : 0;
      var _calOver = _calTarget > 0 && _calToday > _calTarget;
      var _expPct = _expBudgetDay && _expBudgetDay > 0 ? Math.min(100, Math.round((_expToday / _expBudgetDay) * 100)) : 0;
      var _expOver = _expBudgetDay && _expBudgetDay > 0 && _expToday > _expBudgetDay;
      var _overNum = _overdueCount;

      /* bottom strip: rotation progress (only if rot exists) + shift line + life line */
      var _bottomStrip = "";
      if (_rotTitle || _lifeLine) {
        _bottomStrip = '<div class="dgc-strip">';
        if (_rotTitle) {
          _bottomStrip += '<div class="dgc-info-row is-rot" style="--rc:' + _rotColor + '">';
          _bottomStrip += '  <span class="dgc-rot-name">🏥 ' + escapeHTML(_rotTitle) + '</span>';
          _bottomStrip += '  <span class="dgc-rot-inline-bar"><span style="width:' + _rotPct + '%"></span></span>';
          _bottomStrip += '  <span class="dgc-info-val">' + faNum(_rotPct) + '٪</span>';
          _bottomStrip += '</div>';
        }
        if (_shiftLine || _lifeLine) {
          _bottomStrip += '<div class="dgc-info">';
          if (_lifeLine) _bottomStrip += '<div class="dgc-info-row is-life"><span>' + _lifeLine + '</span></div>';
          _bottomStrip += '</div>';
        }
        _bottomStrip += '</div>';
      }

      return `
      <section class="dash-banner dash-cockpit">
        <div class="dgc-bg" aria-hidden="true"></div>
        <div class="dgc-head">
          <div class="dgc-greet">
            <div class="dgc-hi">
              <span class="dgc-hi-name">${greetLine} <span class="dgc-wave">👋</span></span>
              <span class="dgc-clock"><span class="dgc-clock-dot"></span><span class="dgc-clock-time">—:—:—</span></span>
            </div>
            <div class="dgc-date">
              <span class="dgc-date-txt">📅 ${todayPretty} · ${weekday}</span>
              ${_dayTypeChip}
            </div>
          </div>
          <div class="dgc-actions">
            <button class="dgc-act is-food" type="button" data-cockpit="food" title="ثبت غذا">
              <span class="dgc-act-ic">🍔</span><span class="dgc-act-lbl">ثبت غذا</span>
            </button>
            <button class="dgc-act is-fin" type="button" data-cockpit="finance" title="ثبت تراکنش">
              <span class="dgc-act-ic">💰</span><span class="dgc-act-lbl">ثبت تراکنش</span>
            </button>
            <button class="dgc-act is-sleep" type="button" data-cockpit="sleep" title="ثبت خواب">
              <span class="dgc-act-ic">🌙</span><span class="dgc-act-lbl">ثبت خواب</span>
            </button>
          </div>
        </div>
        <div class="dgc-metrics">
          <div class="dgc-m is-work">
            <div class="dgc-m-head">
              <span class="dgc-m-ic">✅</span>
              <span class="dgc-m-num">${faNum(_todayPend)}</span>
            </div>
            <span class="dgc-m-lbl">کار امروز${_todayTotal > 0 ? ' · ' + faNum(_todayDone) + '/' + faNum(_todayTotal) : ''}</span>
            ${_todayTotal > 0 ? `<div class="dgc-m-bar"><span style="width:${_workPct}%"></span></div>` : ''}
          </div>
          <div class="dgc-m is-over${_overNum > 0 ? " is-active" : ""}">
            <div class="dgc-m-head">
              <span class="dgc-m-ic">⏰</span>
              <span class="dgc-m-num">${faNum(_overNum)}</span>
            </div>
            <span class="dgc-m-lbl">عقب‌مانده</span>
          </div>
          ${(_calToday > 0 || _calTarget > 0) ? `
          <div class="dgc-m is-cal${_calOver ? " is-over" : ""}">
            <div class="dgc-m-head">
              <span class="dgc-m-ic">🔥</span>
              <span class="dgc-m-num">${faNum(_calToday)}${_calTarget > 0 ? ` <span class="dgc-m-from">/ ${faNum(_calTarget)}</span>` : ""}</span>
            </div>
            <span class="dgc-m-lbl">کالری</span>
            ${_calTarget > 0 ? `<div class="dgc-m-bar"><span style="width:${_calPct}%"></span></div>` : ''}
          </div>` : ""}
          ${_expToday > 0 ? `
          <div class="dgc-m is-exp${_expOver ? " is-over" : ""}">
            <div class="dgc-m-head">
              <span class="dgc-m-ic">💸</span>
              <span class="dgc-m-num">${_fmt(_expToday)}</span>
            </div>
            <span class="dgc-m-lbl">هزینه امروز</span>
            ${_expBudgetDay > 0 ? `<div class="dgc-m-bar"><span style="width:${_expPct}%"></span></div>` : ''}
          </div>` : ""}
          ${_shiftCountdown ? `
          <div class="dgc-m is-shift" style="--mc:${_rotColor}">
            <div class="dgc-m-head">
              <span class="dgc-m-ic">🚨</span>
              <span class="dgc-m-num">${_shiftCountdown}</span>
            </div>
            <span class="dgc-m-lbl">تا کشیک</span>
          </div>` : ""}
        </div>
        ${_bottomStrip}
      </section>
      `;
    })();

    // ─── نوار هفته (۷ روز افقی) ─────────────────────
    const weekStrip = [];
    var _weekBase = _getSaturdayOfWeek(t.jy, t.jm, t.jd, _dashWeekOffset);
    for (let i = 0; i < 7; i++) {
      const d = addJalaliDays(_weekBase.jy, _weekBase.jm, _weekBase.jd, i);
      const dKey = dateKey(d.jy, d.jm, d.jd);
      const dayTasks = state.tasks.filter((x) => x.date === dKey && !x.cancelled);
      const dayShifts = shiftsOnDate(d.jy, d.jm, d.jd);
      weekStrip.push({
        jy: d.jy, jm: d.jm, jd: d.jd,
        key: dKey,
        weekday: weekdayName(d.jy, d.jm, d.jd),
        isToday: i === 0,
        total: dayTasks.length,
        done: dayTasks.filter((x) => x.completed).length,
        shifts: dayShifts.length
      });
    }

    const weekStripHTML = `
      <section class="dash-week">
        <div class="dash-week-head">
          <button class="dash-week-nav" type="button" data-week-prev>‹</button><span class="dash-week-title" data-week-label>${_dashWeekLabel()}</span><button class="dash-week-today" type="button" data-week-today title="برو به هفته‌ی جاری">امروز</button>
          <button class="dash-week-nav" type="button" data-week-next>›</button>
        </div>
        <div class="dash-week-grid">
          ${weekStrip.map((d) => {
            const hasShift = d.shifts > 0;
            const hasTasks = d.total > 0;
            const allDone = hasTasks && d.done === d.total;
            const partial = hasTasks && d.done > 0 && !allDone;
            let cls = "dash-week-cell";
            if (d.isToday) cls += " is-today";
            if (hasShift) cls += " has-shift";
            if (allDone) cls += " is-done";
            else if (partial) cls += " is-partial";
            else if (hasTasks) cls += " is-pending";
            return `
              <button type="button" class="${cls}" data-dash-day="${d.key}">
                <div class="dash-week-day">${d.weekday.slice(0, 3)}</div>
                <div class="dash-week-num">${faNum(d.jd)}</div>
                <div class="dash-week-meta">
                  ${hasTasks ? `<span>${faNum(d.done)}/${faNum(d.total)}</span>` : `<span class="dash-week-empty">—</span>`}
                </div>
              </button>
            `;
          }).join("")}
        </div>
      </section>
    `;

    // ─── Day context: items / conflicts / windows ───
    const _R = window.InternshipResidency || {};
    let _items = [];
    try {
      if (_R.schedulingProjection && _R.schedulingProjection.projectDate) {
        _items = _getEffectiveItems(_selectedDate);
      }
    } catch (e) { console.warn("[dash] projectDate failed:", e); }

    let _conflicts = [];
    try {
      if (_R.schedulingConflict && _R.schedulingConflict.detect && _items.length > 1) {
        _conflicts = _R.schedulingConflict.detect(_items, {}) || [];
        _conflicts = _conflicts.filter(function (c) {
          return c && (c.policy === "HARD" || c.policy === "WARNING");
        });
      }
    } catch (e) { console.warn("[dash] conflicts failed:", e); }

    let _windows = [];
    try {
      if (_R.availabilityEngine && _R.availabilityEngine.findFreeWindowsFromState) {
        _windows = _R.availabilityEngine.findFreeWindowsFromState(_selectedDate, state, { minWindowMinutes: 30 }) || [];
      }
    } catch (e) { console.warn("[dash] windows failed:", e); }

    window.__dashConflictExpanded = window.__dashConflictExpanded || false;
    const conflictBannerHTML = _renderDashConflictBanner(_conflicts, _items);
    const freeWindowsHTML = _renderDashFreeWindows(_windows, _isToday, _selWeekday);
    const timeSummaryHTML = _renderDashTimeSummary(_selectedDate, _items, _windows, _isToday, _selWeekday);
    const nowNextHTML = _renderDashNowNext(_items, _isToday);
    const dayBarHTML = _renderDashDayBar(_items, _isToday);
    const replanBannerHTML = _renderDashReplanBanner();

    // ─── کارت کارهای امروز ───────────────────────────
    const todayTasksHTML = `
      <section class="dash-tasks-card" id="dash-tasks-card">
        <div class="dash-tasks-head">
          <span class="dash-tasks-title">✅ کارهای امروز</span>
          <button class="btn ghost small" id="btn-open-planner" type="button">برنامه‌ریزی ←</button>
        </div>
        <ul class="today-tasks">
          ${todaysTasks.length
            ? todaysTasks.map(taskRowHTML).join("")
            : '<li class="today-empty">برای امروز کاری ثبت نشده.</li>'}
        </ul>
      </section>
    `;

    const mot = getRandomMotivation();
    const motivationHTML = `
      <section class="dash-motivation" id="dash-motivation">
        <div class="dash-motivation-emoji" aria-hidden="true">${mot.emoji}</div>
        <div class="dash-motivation-text">${escapeHTML(mot.text)}</div>
        <button class="dash-motivation-refresh" type="button" id="dash-motivation-refresh" title="پیام دیگه">🔄</button>
      </section>
    `;

    const dayTitle = _isToday ? "📅 برنامه‌ی امروز" : "📅 برنامه‌ی " + _selWeekday;

    view.innerHTML = `
      ${bannerHTML}
      ${_qaRenderRow()}
      ${replanBannerHTML}
      ${conflictBannerHTML}
      ${weekStripHTML}
      <section class="dash-day-section" id="dash-day-section">
        <div class="dash-day-head">
          <span class="dash-day-title">${dayTitle}</span>
          <span class="dash-day-sub">${_selPretty}</span>
        </div>
        ${nowNextHTML}
        ${dayBarHTML}
        <div class="dash-untimed-wrap" id="dash-untimed-wrap">
          <div class="dash-untimed-head">
            <span class="dash-untimed-title">🕐 کارهای بدون ساعت</span>
            <span class="dash-untimed-hint">🖱️ برای زمان‌بندی، هر کار را روی نوار بالا بکش</span>
          </div>
          <div class="dash-untimed-list" id="dash-untimed"></div>
        </div>
        <div class="dash-timeline-card" id="dash-timeline"></div>
        <div class="dash-timeline-guide">
          <span class="dtg-item"><span class="dtg-swatch is-solid"></span>برنامه‌ریزی‌شده</span>
          <span class="dtg-item"><span class="dtg-swatch is-hatched"></span>انجام‌شده</span>
          <span class="dtg-item"><span class="dtg-swatch is-next"></span>در حال اجرا</span>
        </div>
      </section>
      <div class="dash-2col">
        ${todayTasksHTML}

        ${freeWindowsHTML}
      </div>
      ${timeSummaryHTML}
      <h2 class="section-heading">بخش‌های زندگی</h2>
      <div class="cards">${_getDashboardAreas().map(areaCardHTML).join("")}</div>
      ${motivationHTML}

      <section class="hero">
        <div>
          <span class="hero-label">پیشرفت کلی</span>
          <div class="hero-value">${faNum(stats.done)} از ${faNum(stats.total)} کار انجام شده</div>
          <p class="hero-sub">جمع کل کارها در همه‌ی بخش‌ها</p>
        </div>
        <div class="ring" style="--p:0" data-ring-target="${stats.percent}">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#5eead4"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52"/>
            <circle class="ring-fg" cx="60" cy="60" r="52"/>
          </svg>
          <div class="ring-label">${faNum(stats.percent)}٪</div>
        </div>
      </section>

      <footer class="app-footer">Internship OS — نسخه ${faNum(APP_VERSION)}</footer>
    `;

    document.title = "Internship OS";
    setTimeout(function () { _dashSyncTodayButton(); }, 30);
    setTimeout(_wireDayBarControls, 20);
    setTimeout(_wireFlexibleDragDrop.bind(null, document.getElementById("dash-timeline")), 40);
    setTimeout(_wireDayBarDropzone, 40);
    setTimeout(_wireUntimedDropzone, 40);
    setTimeout(_wireDashConflictToggle, 20);

    requestAnimationFrame(() => {
      const ring = view.querySelector(".ring[data-ring-target]");
      if (ring) ring.style.setProperty("--p", ring.dataset.ringTarget);
    });

    // ─── Motivation refresh ───
    const motBtn = document.getElementById("dash-motivation-refresh");
    if (motBtn) {
      motBtn.addEventListener("click", () => { applyNewMotivation(); });
    }

    // ─── Dashboard timeline render (initial) ───
    const _dashTL = document.getElementById("dash-timeline");
    if (_dashTL) _renderDashTimeline(_dashTL, _selectedDate);

    // ─── Week nav buttons ───
    view.querySelectorAll("[data-week-prev]").forEach(function (b) {
      b.addEventListener("click", function () {
        _dashWeekOffset--;
        _dashSelectedDay = null;
        render();
      });
    });
    view.querySelectorAll("[data-week-next]").forEach(function (b) {
      b.addEventListener("click", function () {
        _dashWeekOffset++;
        _dashSelectedDay = null;
        render();
      });
    });
    view.querySelectorAll("[data-week-today]").forEach(function (b) {
      b.addEventListener("click", function () {
        _dashWeekOffset = 0;
        _dashSelectedDay = null;
        render();
      });
    });

    // ─── Week strip: mark active ───
    setTimeout(function () {
      view.querySelectorAll("[data-dash-day]").forEach(function (b) {
        b.classList.toggle("is-active", b.getAttribute("data-dash-day") === _selectedDate);
      });
    }, 30);

    // ─── Week cell click: targeted re-render of day context ───
    view.querySelectorAll("[data-dash-day]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var key = btn.getAttribute("data-dash-day");
        if (!key) return;
        _dashSelectedDay = key;
        _dashRenderSelectedDate(key);
      });
    });

    // ─── Other wire ───
    const plannerBtn = document.getElementById("btn-open-planner");
    if (plannerBtn) plannerBtn.addEventListener("click", () => setRoute("planner"));

    view.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => setRoute(el.dataset.nav));
    });

    view.querySelectorAll("[data-toggle-task]").forEach((el) => {
      el.addEventListener("click", () => toggleTask(el.dataset.toggleTask));
    });
  }

  // ─── Dashboard helpers (Phase 27.1) ──────────────────────

  function _dashSyncTodayButton() {
    try {
      var today = todayJalali();
      var isCurrent = (_dashWeekOffset === 0) && (_dashSelectedDay === null || _dashSelectedDay === today);
      var btns = document.querySelectorAll("[data-week-today]");
      for (var i = 0; i < btns.length; i++) {
        if (isCurrent) btns[i].setAttribute("disabled", "disabled");
        else btns[i].removeAttribute("disabled");
      }
    } catch (e) {}
  }
function _dashRenderSelectedDate(dateKeyStr) {
    try { _dashSyncTodayButton(); } catch (e) {}
    var today = todayJalali();
    var _isToday = (dateKeyStr === today);
    var _p = parseJalali(dateKeyStr);
    if (!_p) return;
    var _wk = weekdayName(_p.jy, _p.jm, _p.jd);
    var _pDate = prettyDate(_p.jy, _p.jm, _p.jd);

    // Section title / sub
    var titleEl = document.querySelector(".dash-day-title");
    var subEl = document.querySelector(".dash-day-sub");
    if (titleEl) titleEl.textContent = _isToday ? "📅 برنامه‌ی امروز" : "📅 برنامه‌ی " + _wk;
    if (subEl) subEl.textContent = _pDate;

    // Timeline
    var tl = document.getElementById("dash-timeline");
    if (tl) _renderDashTimeline(tl, dateKeyStr);

    // Week cell active state
    document.querySelectorAll("[data-dash-day]").forEach(function (b) {
      b.classList.toggle("is-active", b.getAttribute("data-dash-day") === dateKeyStr);
    });

    // Free windows
    var _R = window.InternshipResidency || {};
    var _windows = [];
    try {
      if (_R.availabilityEngine && _R.availabilityEngine.findFreeWindowsFromState) {
        _windows = _R.availabilityEngine.findFreeWindowsFromState(dateKeyStr, state, { minWindowMinutes: 30 }) || [];
      }
    } catch (e) { console.warn("[dash] windows refresh failed:", e); }
    var hostW = document.getElementById("dash-windows-host");
    if (hostW) hostW.outerHTML = _renderDashFreeWindows(_windows, _isToday, _wk);

    // Conflicts
    var _items = [];
    try {
      if (_R.schedulingProjection && _R.schedulingProjection.projectDate) {
        _items = _getEffectiveItems(dateKeyStr);
      }
    } catch (e) { console.warn("[dash] projectDate refresh failed:", e); }
    var _conf = [];
    try {
      if (_R.schedulingConflict && _R.schedulingConflict.detect && _items.length > 1) {
        _conf = (_R.schedulingConflict.detect(_items, {}) || []).filter(function (c) {
          return c && (c.policy === "HARD" || c.policy === "WARNING");
        });
      }
    } catch (e) { console.warn("[dash] conflicts refresh failed:", e); }
    var hostTS = document.getElementById("dash-time-summary-host");
    if (hostTS) hostTS.outerHTML = _renderDashTimeSummary(dateKeyStr, _items, _windows, _isToday, _wk);

    var hostNN = document.getElementById("dash-now-next-host");
    if (hostNN) hostNN.outerHTML = _renderDashNowNext(_items, _isToday);

    var hostDB = document.getElementById("dash-daybar-host");
    if (hostDB) { hostDB.outerHTML = _renderDashDayBar(_items, _isToday); setTimeout(_wireDayBarControls, 20); }

    var hostC = document.getElementById("dash-conflict-host");
    if (hostC) hostC.outerHTML = _renderDashConflictBanner(_conf, _items);
  }

  function _renderDashTimeline(host, dateStr) {
    if (!host || !dateStr) return;
    var R = window.InternshipResidency;
    var untimedHost = document.getElementById("dash-untimed");
    if (R && R.dayTimeline && R.dayTimeline.renderSplit) {
      try {
        R.dayTimeline.renderSplit(host, untimedHost, dateStr, _ioStateWithBuffer(), {});
        _highlightNextTimedItem(host, dateStr);
        _wireDashTimelineInteractions(host);
        _wireTimedItemActions(host);
        if (untimedHost) {
          _wireFlexibleDragDrop(untimedHost);
          _wireUntimedActions(untimedHost);
        }
        return;
      } catch (e) { console.warn("[dash] split render failed:", e); }
    }
    if (R && R.dayTimeline && R.dayTimeline.render) {
      try {
        R.dayTimeline.render(host, dateStr, state, {});
        _highlightNextTimedItem(host, dateStr);
        _wireDashTimelineInteractions(host);
        return;
      } catch (e) { console.warn("[dash] dayTimeline render failed:", e); }
    }
  }

  function _highlightNextTimedItem(host, dateStr) {
    if (!host) return;
    var today = todayJalali();
    if (dateStr !== today) return;
    var nowMin = (new Date()).getHours() * 60 + (new Date()).getMinutes();
    var items = host.querySelectorAll(".dt20-item");
    if (!items.length) return;
    var best = null;
    var bestScore = -1;
    Array.prototype.forEach.call(items, function (el) {
      var startStr = el.getAttribute("data-dt20-start");
      if (!startStr) return;
      var parts = startStr.split(":");
      if (parts.length !== 2) return;
      var sMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      var eStr = el.getAttribute("data-dt20-end") || "";
      var eParts = eStr.split(":");
      var eMin = (eParts.length === 2)
        ? parseInt(eParts[0], 10) * 60 + parseInt(eParts[1], 10)
        : sMin + 60;
      if (eMin < sMin) eMin += 1440;
      var score;
      if (nowMin >= sMin && nowMin < eMin) {
        score = 1000000 + sMin;
      } else if (sMin > nowMin) {
        score = 100000 - (sMin - nowMin);
      } else {
        score = -1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = el;
      }
    });
    if (best) best.classList.add("is-next-highlight");
  }
  function openResidencyActivityTimingModalWithPreset(activityId, presetTime, presetDuration) {
    openResidencyActivityTimingModal(activityId);
    setTimeout(function () {
      var overlay = document.querySelector(".modal-overlay");
      if (!overlay) return;
      var tEl = overlay.querySelector("#ratm-time");
      var dEl = overlay.querySelector("#ratm-dur");
      if (tEl && presetTime) tEl.value = presetTime;
      if (dEl && presetDuration) dEl.value = presetDuration;
    }, 100);
  }
  /* Phase 27.6: residency activity timing modal */
  function openResidencyActivityTimingModal(activityId) {
    if (!activityId) return;
    var rs = state.residency || {};
    var activities = Array.isArray(rs.activities) ? rs.activities : [];
    var activity = null;
    for (var i = 0; i < activities.length; i++) {
      if (activities[i] && activities[i].id === activityId) { activity = activities[i]; break; }
    }
    if (!activity) { toast("فعالیت پیدا نشد", "error"); return; }

    var p = parseJalali(activity.plannedDate) || parseJalali(todayJalali());
    var curTime = activity.plannedStartTime || "";
    var curDur = (typeof activity.plannedDurationMinutes === "number")
      ? activity.plannedDurationMinutes
      : 60;

    var title = activity.notes || "";
    if (!title) {
      var kindLabels = { study: "مطالعه", review: "مرور", assessment: "آزمون" };
      title = kindLabels[activity.kind] || "فعالیت رزیدنتی";
    }
    var pagesInfo = "";
    if (typeof activity.plannedPages === "number" && activity.plannedPages > 0) {
      var pStart = (activity.plannedPageStart != null) ? activity.plannedPageStart : "?";
      var pEnd = (activity.plannedPageEnd != null) ? activity.plannedPageEnd : "?";
      pagesInfo = "صفحات " + faNum(pStart) + "–" + faNum(pEnd) + " · " + faNum(activity.plannedPages) + " صفحه";
    }

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = ''
      + '<div class="modal modal-wide" role="dialog" aria-modal="true" style="max-width:480px">'
      + '<h3 style="margin-bottom:6px">⏰ زمان‌بندی فعالیت رزیدنتی</h3>'
      + '<p class="ratm-title">' + escapeHTML(title) + '</p>'
      + (pagesInfo ? '<p class="ratm-pages">' + pagesInfo + '</p>' : '')
      + '<div class="form-row"><label>تاریخ *</label>' + datePickerHTML("ratm", p.jy, p.jm, p.jd) + '</div>'
      + '<div class="form-grid-2">'
      +   '<div class="form-row"><label for="ratm-time">ساعت شروع *</label>'
      +     '<input type="time" id="ratm-time" value="' + (curTime || "08:00") + '"></div>'
      +   '<div class="form-row"><label for="ratm-dur">مدت (دقیقه)</label>'
      +     '<input type="number" id="ratm-dur" min="10" max="600" step="5" value="' + curDur + '" style="direction:ltr;text-align:start"></div>'
      + '</div>'
      + '<p class="ratm-hint">مدت پیشنهادی از صفحه‌های برنامه و سرعت مطالعه محاسبه شده. می‌توانی تغییرش بدهی.</p>'
      + '<div class="modal-actions">'
      +   '<button class="btn ghost" type="button" data-close>انصراف</button>'
      +   '<button class="btn primary" type="button" data-confirm>ذخیره</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var mEl = overlay.querySelector("#ratm-month");
    var yEl = overlay.querySelector("#ratm-year");
    if (mEl) mEl.addEventListener("change", function () { refreshDatePicker("ratm"); });
    if (yEl) yEl.addEventListener("change", function () { refreshDatePicker("ratm"); });

    var close = function () {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay._esc = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    var submit = function () {
      var newDate = readDatePicker("ratm");
      if (!newDate) { toast("تاریخ نامعتبر", "error"); return; }
      var newTime = overlay.querySelector("#ratm-time").value || "";
      if (!newTime) { toast("ساعت شروع را وارد کن", "error"); return; }
      var newDur = parseInt(overlay.querySelector("#ratm-dur").value, 10);
      if (isNaN(newDur) || newDur < 5 || newDur > 1440) { toast("مدت نامعتبر", "error"); return; }

      var R = window.InternshipResidency;
      var SP = R && R.schedulingProjection;
      var CF = R && R.schedulingConflict;
      if (SP && CF && CF.detectPair && SP.projectDate) {
        try {
          var existing = _getEffectiveItems(newDate);
          var filt = [];
          for (var j = 0; j < existing.length; j++) {
            var ex = existing[j];
            if (ex.sourceType === "residencyActivity" && ex.sourceId === activityId) continue;
            if (ex.sourceType === "task") {
              var _tEx = (state.tasks || []).filter(function(x){ return x.id === ex.sourceId; })[0];
              if (_tEx && (_tEx.sourceType === "residency_activity" || _tEx.sourceType === "residencyActivity")) continue;
            }
            filt.push(ex);
          }
          var tm = _hhmmToMin(newTime);
          var endStr = _minToHHMM(tm + newDur);
          var hypo = {
            id: "hypo", sourceType: "residencyActivity", sourceId: activityId,
            title: title, category: activity.kind || "study",
            date: newDate, startTime: newTime, endTime: endStr,
            durationMinutes: newDur, role: "block", status: "planned", context: null
          };
          for (var k = 0; k < filt.length; k++) {
            var c = CF.detectPair(hypo, filt[k], {});
            if (c && c.policy === "HARD") {
              toast("⛔ تداخل غیرمجاز — ساعت دیگری انتخاب کن", "error");
              return;
            }
          }
        } catch (e) { console.warn("[27.6 conflict]", e); }
      }

      activity.plannedDate = newDate;
      activity.plannedStartTime = newTime;
      activity.plannedDurationMinutes = newDur;

      try {
        var tasks = state.tasks || [];
        for (var t = 0; t < tasks.length; t++) {
          var tk = tasks[t];
          if (!tk) continue;
          var isLinked = (tk.sourceType === "residency_activity" || tk.sourceType === "residencyActivity");
          if (!isLinked) continue;
          var ref = tk.residencyActivityId || tk.sourceId;
          if (ref !== activityId) continue;
          tk.date = newDate;
          tk.time = newTime;
          tk.durationMinutes = newDur;
          tk.updatedAt = Date.now();
        }
      } catch (e) { console.warn("[27.6 task-sync]", e); }

      try { _rtNotify("task_updated", { id: activityId, sourceType: "residencyActivity", date: newDate, title: title }); } catch (e) {}

      saveState();
      close();
      render();
      toast("زمان‌بندی ذخیره شد");
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
  }
  function _wireTimedItemActions(host) {
    if (!host) return;
    // 27.8b: make timeline items draggable for drag-back
    var draggables = host.querySelectorAll(".dt20-item[data-dt20-source]");
    Array.prototype.forEach.call(draggables, function (it) {
      if (it.__wiredDragBack27) return;
      it.__wiredDragBack27 = true;
      it.setAttribute("draggable", "true");
      it.addEventListener("dragstart", function (ev) {
        var src = it.getAttribute("data-dt20-source");
        var sid = it.getAttribute("data-dt20-sourceid");
        if (!src || !sid) { ev.preventDefault(); return; }
        if (src === "shift") { ev.preventDefault(); return; }
        try {
          ev.dataTransfer.effectAllowed = "move";
          ev.dataTransfer.setData("application/x-io-timed", JSON.stringify({ sourceType: src, sourceId: sid }));
        } catch (e) { ev.preventDefault(); return; }
        it.classList.add("is-drag-source");
      });
      it.addEventListener("dragend", function () {
        it.classList.remove("is-drag-source");
        var z = document.getElementById("dash-untimed-wrap");
        if (z) z.classList.remove("is-drop-untime");
      });
    });

    var acts = host.querySelectorAll(".dt20-act");
    Array.prototype.forEach.call(acts, function (btn) {
      if (btn.__wired27) return;
      btn.__wired27 = true;
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var act = btn.getAttribute("data-act");
        var item = btn.closest(".dt20-item");
        if (!item) return;
        var src = item.getAttribute("data-dt20-source");
        var sid = item.getAttribute("data-dt20-sourceid");
        if (!sid) return;
        if (act === "done") _onTimelineToggleDone(src, sid);
        else if (act === "edit") _onTimelineEdit(src, sid);
        else if (act === "untime") _onTimelineUntime(src, sid);
      });
    });
  }

  function _wireUntimedActions(host) {
    if (!host) return;
    var items = host.querySelectorAll(".dt20-flex-item, .dt20-reminder-item");
    Array.prototype.forEach.call(items, function (el) {
      if (el.__wired27) return;
      el.__wired27 = true;
      var btn = document.createElement("button");
      btn.className = "dt20-chip-act";
      btn.type = "button";
      btn.setAttribute("data-act", "edit");
      btn.title = "ویرایش";
      btn.textContent = "✏️";
      btn.addEventListener("click", function (ev) {
        ev.stopPropagation();
        ev.preventDefault();
        var src = el.getAttribute("data-dt20-source");
        var sid = el.getAttribute("data-dt20-sourceid");
        if (!sid) return;
        _onTimelineEdit(src, sid);
      });
      el.appendChild(btn);
      el.classList.add("has-act");
    });
  }

  function _onTimelineToggleDone(src, sid) {
    if (src !== "task") return;
    var t = null;
    for (var i = 0; i < state.tasks.length; i++) {
      if (state.tasks[i].id === sid) { t = state.tasks[i]; break; }
    }
    if (!t) return;
    t.completed = !t.completed && !t.cancelled;
    t.updatedAt = Date.now();
    if (_rtIsRelevantTask(t)) _rtNotify(t.completed ? "task_completed" : "task_updated", { id: t.id, date: t.date, sourceType: "task", title: t.title });
    try {
      if (window.InternshipResidency && window.InternshipResidency.taskProjection) {
        window.InternshipResidency.taskProjection.onTaskCompleted(sid);
      }
    } catch (e) {}
    try {
      if (window.InternshipResidency && window.InternshipResidency.reviewIntegration) {
        window.InternshipResidency.reviewIntegration.onTaskCompleted(sid);
      }
    } catch (e) {}
    saveState();
    // Full day section re-render (timeline + day-bar + now/next + windows)
    try {
      var _c = _dashSelectedDay || todayJalali();
      _dashRenderSelectedDate(_c);
    } catch (e) {
      console.warn("[toggle re-render]", e);
      var host = document.getElementById("dash-timeline");
      var cur = _dashSelectedDay || todayJalali();
      if (host) _renderDashTimeline(host, cur);
    }
  }

  function _onTimelineEdit(src, sid) {
    if (src === "task") {
      openTaskForm(sid);
    } else if (src === "shift") {
      openShiftForm(sid);
    } else if (src === "residencyActivity") {
      openResidencyActivityTimingModal(sid);
    }
  }

  function _onTimelineUntime(src, sid) {
    try { if (_dashEditBuffer && _dashEditBuffer[sid]) delete _dashEditBuffer[sid]; } catch (e) {}
    if (src === "task") {
      var t = null;
      for (var i = 0; i < state.tasks.length; i++) {
        if (state.tasks[i].id === sid) { t = state.tasks[i]; break; }
      }
      if (!t) return;
      var oldTime = t.time;
      var oldDur = t.durationMinutes;
      t.time = "";
      if (typeof t.durationMinutes !== "number" || t.durationMinutes <= 0) t.durationMinutes = 60;
      t.updatedAt = Date.now();
      if (_rtIsRelevantTask(t)) {
        _rtNotify("task_updated", {
          id: t.id, sourceType: "task", date: t.date, title: t.title,
          before: { time: oldTime, durationMinutes: oldDur },
          after: { time: null, durationMinutes: t.durationMinutes }
        });
      }
      saveState();
      _ioRebuildAfterDrop();
      toast("از نوار حذف شد — به کارهای بدون ساعت منتقل شد");
    } else if (src === "residencyActivity") {
      var rs = state.residency || {};
      var acts = rs.activities || [];
      var act = null;
      for (var a = 0; a < acts.length; a++) {
        if (acts[a] && acts[a].id === sid) { act = acts[a]; break; }
      }
      if (!act) return;
      act.plannedStartTime = null;
      try {
        var tasks = state.tasks || [];
        for (var k = 0; k < tasks.length; k++) {
          var tk = tasks[k];
          if (!tk) continue;
          var st = tk.sourceType;
          if (st !== "residency_activity" && st !== "residencyActivity") continue;
          var ref = tk.residencyActivityId || tk.sourceId;
          if (ref !== sid) continue;
          tk.time = "";
          tk.updatedAt = Date.now();
        }
      } catch (e) {}
      saveState();
      _ioRebuildAfterDrop();
      toast("از نوار حذف شد");
    }
  }
  function _wireDashTimelineInteractions(host) {
    if (!host) return;
    var clickable = host.querySelectorAll(".dt20-flex-item[data-dt20-source], .dt20-reminder-item[data-dt20-source]");
    Array.prototype.forEach.call(clickable, function (el) {
      var src = el.getAttribute("data-dt20-source");
      var sid = el.getAttribute("data-dt20-sourceid");
      if (!src || !sid) return;
      var handler = null;
      if (src === "task") {
        handler = function () { openTaskForm(sid); };
      } else if (src === "shift") {
        handler = function () { openShiftForm(sid); };
      } else if (src === "residencyActivity") {
        handler = function () { openResidencyActivityTimingModal(sid); };
      }
      if (handler) {
        el.classList.add("is-clickable");
        el.setAttribute("title", "برای ویرایش زمان کلیک کن");
        el.addEventListener("click", function (ev) { ev.stopPropagation(); handler(); });
      }
    });
  }

  function _renderDashExamCountdown() {
    try {
      var rs = state.residency;
      var planId = rs && rs.meta && rs.meta.activePlanId;
      var plan = planId ? (rs.plans || []).find(function (p) { return p && p.id === planId; }) : null;
      var examDate = plan && plan.examDate;
      if (!examDate) return "";
      var p = parseJalali(examDate);
      if (!p) return "";
      var tp = parseJalali(todayJalali());
      var tDay = jalaliToDayNumber(tp.jy, tp.jm, tp.jd);
      var eDay = jalaliToDayNumber(p.jy, p.jm, p.jd);
      var days = eDay - tDay;
      if (days < 0) return "";
      var label = days === 0 ? "امروز" : (days === 1 ? "فردا" : faNum(days) + " روز مانده");
      var pretty = prettyDate(p.jy, p.jm, p.jd);
      return '<div class="dash-exam-countdown">'
        + '<span class="dash-exam-icon">🎯</span>'
        + '<div class="dash-exam-body">'
        +   '<div class="dash-exam-label">آزمون رزیدنتی</div>'
        +   '<div class="dash-exam-date">' + pretty + '</div>'
        + '</div>'
        + '<div class="dash-exam-value">' + label + '</div>'
      + '</div>';
    } catch (e) { return ""; }
  }

  function _wireDashConflictToggle() {
    var el = document.getElementById("dash-conflict-host");
    if (!el) return;
    if (el.__wiredToggle) return;
    el.__wiredToggle = true;
    el.addEventListener("click", function (ev) {
      if (ev.target.closest && ev.target.closest(".dash-conflict-row")) return;
      window.__dashConflictExpanded = !window.__dashConflictExpanded;
      var R = window.InternshipResidency;
      var items = [];
      var cur = _dashSelectedDay || todayJalali();
      try {
        if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
          items = _getEffectiveItems(cur);
        }
      } catch (e) {}
      var conf = [];
      try {
        if (R && R.schedulingConflict && R.schedulingConflict.detect && items.length > 1) {
          conf = (R.schedulingConflict.detect(items, {}) || []).filter(function (c) {
            return c && (c.policy === "HARD" || c.policy === "WARNING");
          });
        }
      } catch (e) {}
      el.outerHTML = _renderDashConflictBanner(conf, items);
      setTimeout(_wireDashConflictToggle, 20);
    });
  }
  function _renderDashReplanBanner() {
    try {
      var R = window.InternshipResidency;
      var RT = R && R.replanTrigger;
      if (!RT || !RT.getStatus) return "";
      var rs = state.residency;
      var planId = rs && rs.meta && rs.meta.activePlanId;
      if (!planId) return "";
      var st = RT.getStatus(planId);
      if (!st || !st.needed) return "";
      var count = (typeof st.count === "number") ? st.count : 0;
      var sub = count > 0 ? faNum(count) + " تغییر از آخرین بازبررسی" : "تغییراتی در برنامه ثبت شده";
      return '<div class="dash-alert dash-alert-replan" id="dash-replan-host">'
        + '<div class="dash-alert-head">'
        +   '<span class="dash-alert-icon">🔄</span>'
        +   '<div class="dash-alert-body">'
        +     '<div class="dash-alert-title">برنامه‌ی مطالعه نیاز به بازبررسی دارد</div>'
        +     '<div class="dash-alert-sub">' + sub + '</div>'
        +   '</div>'
        + '</div>'
      + '</div>';
    } catch (e) { return ""; }
  }

  function _renderDashConflictBanner(conflicts, items) {
    if (!Array.isArray(conflicts) || conflicts.length === 0) {
      return '<div id="dash-conflict-host"></div>';
    }
    var hardCount = conflicts.filter(function (c) { return c.policy === "HARD"; }).length;
    var warnCount = conflicts.filter(function (c) { return c.policy === "WARNING"; }).length;
    var isHard = hardCount > 0;
    var cls = "dash-alert dash-alert-conflict" + (isHard ? " is-hard" : " is-warning");
    var expanded = !!window.__dashConflictExpanded;

    var title;
    if (hardCount > 0 && warnCount > 0) {
      title = faNum(hardCount) + " تداخل جدی · " + faNum(warnCount) + " هشدار";
    } else if (hardCount > 0) {
      title = faNum(hardCount) + " تداخل جدی در برنامه";
    } else {
      title = faNum(warnCount) + " هشدار تداخل زمانی";
    }

    var subtitle = expanded
      ? "برای بستن کلیک کن."
      : "برای مشاهده‌ی جزئیات کلیک کن.";

    var idMap = {};
    (items || []).forEach(function (it) { if (it && it.id) idMap[it.id] = it; });

    var detailHTML = "";
    if (expanded) {
      var rows = conflicts.slice(0, 10).map(function (c) {
        var a = idMap[c.itemAId] || {};
        var b = idMap[c.itemBId] || {};
        var aTitle = a.title || "—";
        var bTitle = b.title || "—";
        var range = (c.overlapStart && c.overlapEnd)
          ? (faNum(c.overlapStart) + " تا " + faNum(c.overlapEnd))
          : "";
        var policyLabel = c.policy === "HARD" ? "تداخل جدی" : "تداخل قابل قبول";
        return '<div class="dash-conflict-row">'
          + '<span class="dash-conflict-icon">' + (c.policy === "HARD" ? "⛔" : "⚠️") + '</span>'
          + '<div class="dash-conflict-text">'
          +   '<div class="dash-conflict-titles">' + escapeHTML(aTitle) + ' ↔ ' + escapeHTML(bTitle) + '</div>'
          +   '<div class="dash-conflict-meta">' + policyLabel + (range ? ' · ' + range : '') + '</div>'
          + '</div>'
        + '</div>';
      }).join("");
      var moreCount = Math.max(0, conflicts.length - 10);
      var moreRow = moreCount > 0
        ? '<div class="dash-conflict-more">و ' + faNum(moreCount) + ' تداخل دیگر</div>'
        : "";
      detailHTML = '<div class="dash-conflict-list">' + rows + moreRow + '</div>';
    }

    return '<div class="' + cls + (expanded ? ' is-expanded' : ' is-collapsed') + '" id="dash-conflict-host" data-dash-conflict-toggle>'
      + '<div class="dash-alert-head">'
      +   '<span class="dash-alert-icon">' + (isHard ? "⛔" : "⚠️") + '</span>'
      +   '<div class="dash-alert-body">'
      +     '<div class="dash-alert-title">' + title + '</div>'
      +     '<div class="dash-alert-sub">' + subtitle + '</div>'
      +   '</div>'
      +   '<span class="dash-alert-chevron">' + (expanded ? '▴' : '▾') + '</span>'
      + '</div>'
      + detailHTML
    + '</div>';
  }
  function _renderDashFreeWindows(windows, isToday, weekdayLabel) {
    var titleTxt = isToday
      ? "زمان‌های آزاد امروز"
      : ("زمان‌های آزاد " + (weekdayLabel || ""));

    var host = '<div class="dash-windows-card" id="dash-windows-host">';
    host += '<div class="dash-windows-head">'
      + '<span class="dash-windows-title">🪟 ' + titleTxt + '</span>'
      + '</div>';

    if (!Array.isArray(windows) || windows.length === 0) {
      host += '<div class="dash-windows-empty">امروز زمان آزاد کافی پیدا نشد.</div>';
      host += '</div>';
      return host;
    }

    var listHTML = windows.slice(0, 6).map(function (w) {
      var range = faNum(w.start) + " تا " + faNum(w.end);
      var dur = _formatWindowMinutesHuman(w.minutes);
      return '<div class="dash-window-row">'
        + '<span class="dash-window-time">' + range + '</span>'
        + '<span class="dash-window-dur">' + dur + ' زمان آزاد</span>'
      + '</div>';
    }).join("");
    host += '<div class="dash-windows-list">' + listHTML + '</div>';

    if (windows.length > 6) {
      host += '<div class="dash-windows-more">و ' + faNum(windows.length - 6) + ' بازه‌ی دیگر</div>';
    }
    host += '</div>';
    return host;
  }

  function _formatWindowMinutesHuman(min) {
    if (!min || min <= 0) return "—";
    var h = Math.floor(min / 60);
    var m = min % 60;
    if (h === 0) return faNum(m) + " دقیقه";
    if (m === 0) {
      if (h === 1) return "یک ساعت";
      if (h === 2) return "دو ساعت";
      return faNum(h) + " ساعت";
    }
    if (h === 1 && m === 30) return "یک ساعت و نیم";
    return faNum(h) + " ساعت و " + faNum(m) + " دقیقه";
  }

  function _hStartEndMin(it) {
    if (!it || !it.startTime || !it.durationMinutes) return null;
    var parts = String(it.startTime).split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    var start = h * 60 + m;
    return { start: start, end: start + it.durationMinutes };
  }

  function _minToHHMM(min) {
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function _dashCatColor(cat, role, sourceType) {
    if (sourceType === "residencyActivity") return "167, 139, 250";
    if (role === "anchor") return "239, 68, 68";
    var c = String(cat || "").toLowerCase();
    if (c === "shift") return "239, 68, 68";
    if (c === "residency") return "167, 139, 250";
    if (c === "study" || c === "review" || c === "assessment") return "45, 212, 191";
    if (c === "body" || c === "exercise") return "251, 146, 60";
    if (c === "clinical" || c === "case") return "59, 130, 246";
    if (c === "hospital") return "236, 72, 153";
    if (c === "sleep" || c === "rest") return "100, 116, 139";
    if (c === "life" || c === "personal") return "234, 179, 8";
    if (c === "income") return "34, 197, 94";
    return "148, 163, 184";
  }

  function _dashCatIcon(cat, role, sourceType) {
    if (sourceType === "residencyActivity") return "🎓";
    if (role === "anchor") return "🚨";
    var c = String(cat || "").toLowerCase();
    if (c === "shift") return "🚨";
    if (c === "residency") return "🎓";
    if (c === "study") return "📖";
    if (c === "review") return "🔁";
    if (c === "assessment") return "📝";
    if (c === "body" || c === "exercise") return "🏃";
    if (c === "clinical" || c === "case") return "🩺";
    if (c === "hospital") return "🏥";
    if (c === "sleep" || c === "rest") return "🌙";
    if (c === "life" || c === "personal") return "🌱";
    if (c === "income") return "💼";
    return "📌";
  }

  function _dashCatLabel(cat, role, sourceType) {
    if (sourceType === "residencyActivity") return "رزیدنتی";
    if (role === "anchor") return "زمان ثابت";
    var c = String(cat || "").toLowerCase();
    if (c === "shift") return "کشیک";
    if (c === "residency") return "رزیدنتی";
    if (c === "study") return "مطالعه";
    if (c === "review") return "مرور";
    if (c === "assessment") return "آزمون";
    if (c === "body" || c === "exercise") return "ورزش و سلامت";
    if (c === "clinical" || c === "case") return "بالین";
    if (c === "hospital") return "بیمارستان";
    if (c === "sleep" || c === "rest") return "خواب";
    if (c === "life" || c === "personal") return "زندگی شخصی";
    if (c === "income") return "پروژه و کار";
    return "سایر";
  }

  function _getDayBarRange() {
    var s = state.workspace && state.workspace.dayBarRange;
    var startH = (s && typeof s.start === "number") ? s.start : 6;
    var endH   = (s && typeof s.end   === "number") ? s.end   : 24;
    if (startH < 0) startH = 0;
    if (startH > 23) startH = 23;
    if (endH <= startH) endH = startH + 1;
    if (endH > 24) endH = 24;
    return { start: startH * 60, end: endH * 60, startH: startH, endH: endH };
  }

  function _wireDayBarControls() {
    var sEl = document.getElementById("dbar-start");
    var eEl = document.getElementById("dbar-end");

    if (sEl && eEl && !sEl.__wired27) {
      sEl.__wired27 = true;
      eEl.__wired27 = true;
      var onChange = function () {
        var sh = parseInt(sEl.value, 10);
        var eh = parseInt(eEl.value, 10);
        if (isNaN(sh) || isNaN(eh)) return;
        if (eh <= sh) return;
        if (!state.workspace) state.workspace = {};
        state.workspace.dayBarRange = { start: sh, end: eh };
        saveState();
        _dashRerenderDayBar();
      };
      sEl.addEventListener("change", onChange);
      eEl.addEventListener("change", onChange);
    }

    var toggleBtn = document.querySelector("[data-dbar-edit-toggle]");
    if (toggleBtn && !toggleBtn.__wired27) {
      toggleBtn.__wired27 = true;
      toggleBtn.addEventListener("click", _toggleDashEditMode);
    }

    var saveBtn = document.querySelector("[data-dbar-save]");
    if (saveBtn && !saveBtn.__wired27) {
      saveBtn.__wired27 = true;
      saveBtn.addEventListener("click", _onDashSave);
    }

    var cancelBtn = document.querySelector("[data-dbar-cancel]");
    if (cancelBtn && !cancelBtn.__wired27) {
      cancelBtn.__wired27 = true;
      cancelBtn.addEventListener("click", _onDashCancel);
    }

    _wireDayBarDrag();
  }

  function _dashRerenderDayBar() {
    var R = window.InternshipResidency;
    var items = [];
    var cur = _dashSelectedDay || todayJalali();
    try {
      if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
        items = _getEffectiveItems(cur);
      }
    } catch (e) { console.warn("[dash-rerender]", e); }
    var isToday = (cur === todayJalali());
    var host = document.getElementById("dash-daybar-host");
    if (host) {
      host.outerHTML = _renderDashDayBar(items, isToday);
      setTimeout(_wireDayBarControls, 20);
    setTimeout(_wireFlexibleDragDrop.bind(null, document.getElementById("dash-timeline")), 40);
    setTimeout(_wireDayBarDropzone, 40);
    setTimeout(_wireUntimedDropzone, 40);
    setTimeout(_wireDashConflictToggle, 20);
    }
  }

  function _onDashSave() {
    var n = _dashCommitBuffer();
    _dashClearBuffer();
    if (n > 0) {
      saveState();
      toast(faNum(n) + " تسک به‌روزرسانی شد");
    } else {
      toast("تغییری برای ذخیره نبود", "error");
    }
    render();
  }

  function _onDashCancel() {
    _dashClearBuffer();
    toast("تغییرات لغو شد");
    render();
  }

  function _wireDayBarDrag() {
    if (!_dashEditMode) return;
    var bar = document.querySelector(".dash-daybar");
    if (!bar) return;
    var blocks = bar.querySelectorAll('.dash-daybar-block[data-bar-source="task"], .dash-daybar-block[data-bar-source="residencyActivity"]');
    Array.prototype.forEach.call(blocks, function (blk) {
      blk.classList.add("is-draggable");
      if (!blk.__wiredDrag) {
        blk.__wiredDrag = true;
        blk.addEventListener("mousedown", _onDayBarMouseDown);
      }
    });
  }

  function _onDayBarMouseDown(ev) {
    if (!_dashEditMode) return;
    var blk = ev.currentTarget;
    if (!blk) return;
    var _srcT = blk.getAttribute("data-bar-source"); if (_srcT !== "task" && _srcT !== "residencyActivity") return;
    ev.preventDefault();

    var handleType = null;
    var target = ev.target;
    if (target && target.classList && target.classList.contains("dbar-handle")) {
      // 27.6c: residency never resizes
      if (blk.getAttribute("data-bar-source") === "residencyActivity") {
        handleType = null;
      } else {
        handleType = target.getAttribute("data-handle");
      }
    }

    var bar = blk.parentElement;
    var barRect = bar.getBoundingClientRect();
    var range = _getDayBarRange();
    var span = range.end - range.start;
    var startX = ev.clientX;
    var taskId = blk.getAttribute("data-bar-id");
    var oldStartStr = blk.getAttribute("data-bar-start");
    var oldDur = parseInt(blk.getAttribute("data-bar-duration"), 10) || 0;
    var oldStartMin = _hhmmToMin(oldStartStr);
    if (oldStartMin == null) return;

    blk.classList.add("is-dragging");
    var moved = false;
    var dragData = { start: oldStartMin, dur: oldDur };

    var onMove = function (e) {
      var dx = e.clientX - startX;
      if (Math.abs(dx) > 3) moved = true;

      var dxMin = Math.round(((dx / barRect.width) * span) / 5) * 5;

      if (!handleType) {
        var newStart = oldStartMin + dxMin;
        if (newStart < range.start) newStart = range.start;
        if (newStart + oldDur > range.end) newStart = range.end - oldDur;
        dragData.start = newStart;
        dragData.dur = oldDur;
      } else if (handleType === "left") {
        var newStartL = oldStartMin + dxMin;
        var newEndL = oldStartMin + oldDur;
        if (newStartL < range.start) newStartL = range.start;
        if (newStartL > newEndL - 5) newStartL = newEndL - 5;
        dragData.start = newStartL;
        dragData.dur = newEndL - newStartL;
      } else if (handleType === "right") {
        var newEndR = oldStartMin + oldDur + dxMin;
        if (newEndR > range.end) newEndR = range.end;
        if (newEndR < oldStartMin + 5) newEndR = oldStartMin + 5;
        dragData.start = oldStartMin;
        dragData.dur = newEndR - oldStartMin;
      }

      var leftPct = ((dragData.start - range.start) / span) * 100;
      var widthPct = (dragData.dur / span) * 100;
      blk.style.left = leftPct + "%";
      blk.style.width = widthPct + "%";
    };

    var onUp = function () {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      blk.classList.remove("is-dragging");

      if (!moved) {
        openTaskForm(taskId);
        return;
      }

      var newTime = _minToHHMM(dragData.start);
      if (newTime === oldStartStr && dragData.dur === oldDur) return;

      var R = window.InternshipResidency;
      var SP = R && R.schedulingProjection;
      var CF = R && R.schedulingConflict;
      if (SP && CF && CF.detectPair && SP.projectDate) {
        try {
          var tsk = null;
          for (var ti = 0; ti < state.tasks.length; ti++) {
            if (state.tasks[ti].id === taskId) { tsk = state.tasks[ti]; break; }
          }
          if (tsk) {
            var existing = _getEffectiveItems(tsk.date);
            var filt = [];
            for (var ei = 0; ei < existing.length; ei++) {
              var ex = existing[ei];
              if (ex.sourceType === "task" && ex.sourceId === taskId) continue;
              filt.push(ex);
            }
            var sm = _hhmmToMin(newTime);
            var endStr = _minToHHMM(sm + dragData.dur);
            var hypo = {
              id: "hypo", sourceType: "task", sourceId: taskId,
              title: tsk.title, category: tsk.areaId || "",
              date: tsk.date, startTime: newTime, endTime: endStr,
              durationMinutes: dragData.dur, role: "block",
              status: "pending", context: null
            };
            for (var ci = 0; ci < filt.length; ci++) {
              if (_shouldBlockOverlap(hypo, filt[ci])) {
                toast("⛔ تداخل غیرمجاز — به حالت قبل برگشت", "error");
                render();
                return;
              }
            }
          }
        } catch (e) { console.warn("[drag-hard]", e); }
      }

      _dashSetBufferedValue(taskId, newTime, dragData.dur);
      _dashRerenderDayBar();
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  var _dashEditMode = false;
  var _dashEditBuffer = {};

  function _dashSetBufferedValue(sourceId, time, durationMinutes) {
    _dashEditBuffer[sourceId] = { time: time, durationMinutes: durationMinutes };
  }

  function _dashClearBuffer() {
    _dashEditBuffer = {};
  }

  function _dashHasBuffer() {
    return Object.keys(_dashEditBuffer).length > 0;
  }

  function _dashCommitBuffer() {
    var ids = Object.keys(_dashEditBuffer);
    if (ids.length === 0) return 0;
    var R = window.InternshipResidency;
    var SP = R && R.schedulingProjection;
    var CF = R && R.schedulingConflict;
    var applied = 0;
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var task = null;
      for (var t = 0; t < state.tasks.length; t++) {
        if (state.tasks[t].id === id) { task = state.tasks[t]; break; }
      }
      var buf = _dashEditBuffer[id];

      // Fallback: residency activity
      if (!task) {
        var _acts = (state.residency && state.residency.activities) || [];
        var _act = null;
        for (var _ai = 0; _ai < _acts.length; _ai++) {
          if (_acts[_ai] && _acts[_ai].id === id) { _act = _acts[_ai]; break; }
        }
        if (_act) {
          var _blockedA = false;
          if (SP && CF && CF.detectPair && SP.projectDate) {
            try {
              var _exA = _getEffectiveItems(_act.plannedDate);
              var _fltA = [];
              for (var _ei = 0; _ei < _exA.length; _ei++) {
                var _ex = _exA[_ei];
                if (_ex.sourceType === "residencyActivity" && _ex.sourceId === id) continue;
                _fltA.push(_ex);
              }
              var _smA = _hhmmToMin(buf.time);
              var _enA = _minToHHMM(_smA + buf.durationMinutes);
              var _hypoA = {
                id: "hypo", sourceType: "residencyActivity", sourceId: id,
                title: _act.notes || "رزیدنتی", category: _act.kind || "study",
                date: _act.plannedDate, startTime: buf.time, endTime: _enA,
                durationMinutes: buf.durationMinutes, role: "block", status: "planned", context: null
              };
              for (var _ci = 0; _ci < _fltA.length; _ci++) {
                var _cA = CF.detectPair(_hypoA, _fltA[_ci], {});
                if (_cA && _cA.policy === "HARD") { _blockedA = true; break; }
              }
            } catch (e) { console.warn("[dash-commit-act]", e); }
          }
          if (!_blockedA) {
            _act.plannedStartTime = buf.time;
            _act.plannedDurationMinutes = buf.durationMinutes;
            // sync linked tasks
            try {
              var _tsks = state.tasks || [];
              for (var _t = 0; _t < _tsks.length; _t++) {
                var _tk = _tsks[_t];
                if (!_tk) continue;
                var _st = _tk.sourceType;
                if (_st !== "residency_activity" && _st !== "residencyActivity") continue;
                var _ref = _tk.residencyActivityId || _tk.sourceId;
                if (_ref !== id) continue;
                _tk.time = buf.time;
                _tk.durationMinutes = buf.durationMinutes;
                _tk.updatedAt = Date.now();
              }
            } catch (e) {}
            applied++;
          }
          continue;
        }
        continue;
      }

      var blocked = false;
      if (SP && CF && CF.detectPair && SP.projectDate) {
        try {
          var existing = _getEffectiveItems(task.date);
          var filt = [];
          for (var j = 0; j < existing.length; j++) {
            var ex = existing[j];
            if (ex.sourceType === "task" && ex.sourceId === id) continue;
            filt.push(ex);
          }
          var sm = _hhmmToMin(buf.time);
          var hEnd = _minToHHMM(sm + buf.durationMinutes);
          var hypo = {
            id: "hypo", sourceType: "task", sourceId: id,
            title: task.title, category: task.areaId || "",
            date: task.date, startTime: buf.time, endTime: hEnd,
            durationMinutes: buf.durationMinutes, role: "block", status: "pending", context: null
          };
          for (var k = 0; k < filt.length; k++) {
            if (_shouldBlockOverlap(hypo, filt[k])) { blocked = true; break; }
          }
        } catch (e) { console.warn("[dash-commit]", e); }
      }
      if (blocked) continue;

      task.time = buf.time;
      task.durationMinutes = buf.durationMinutes;
      task.updatedAt = Date.now();
      applied++;
    }
    return applied;
  }


  function _hhmmToMin(hhmm) {
    if (!hhmm) return null;
    var parts = String(hhmm).split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10), m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return h * 60 + m;
  }

  function _toggleDashEditMode() {
    // If currently in edit mode AND buffer has unsaved changes → ask
    if (_dashEditMode && _dashHasBuffer()) {
      _askSaveBeforeExit();
      return;
    }
    _applyEditModeToggle();
  }

  function _applyEditModeToggle() {
    _dashEditMode = !_dashEditMode;
    if (!_dashEditMode) _dashClearBuffer();
    var host = document.getElementById("dash-daybar-host");
    if (!host) return;
    var R = window.InternshipResidency;
    var items = [];
    var cur = _dashSelectedDay || todayJalali();
    try {
      if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
        items = _getEffectiveItems(cur);
      }
    } catch (e) { console.warn("[editmode] project failed:", e); }
    var isToday = (cur === todayJalali());
    host.outerHTML = _renderDashDayBar(items, isToday);
    setTimeout(function () {
      _wireDayBarControls();
      _wireDayBarDrag();
    }, 20);
  }

  function _askSaveBeforeExit() {
    var n = Object.keys(_dashEditBuffer).length;
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = ''
      + '<div class="modal" role="dialog" aria-modal="true" style="max-width:420px">'
      + '<h3 style="margin-bottom:6px">💾 تغییرات ذخیره‌نشده</h3>'
      + '<p style="margin:0 0 18px;font-size:13px;color:var(--text-muted);line-height:1.8">'
      +   'شما ' + faNum(n) + ' تغییر ذخیره‌نشده دارید. می‌خواهید همه را ذخیره کنید یا لغو؟'
      + '</p>'
      + '<div class="modal-actions">'
      +   '<button class="btn ghost" type="button" data-close>ادامه ویرایش</button>'
      +   '<button class="btn danger" type="button" data-cancel>لغو تغییرات</button>'
      +   '<button class="btn primary" type="button" data-save>ذخیره و بستن</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var close = function () {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay._esc = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-cancel]").addEventListener("click", function () {
      _dashClearBuffer();
      close();
      _dashEditMode = false;
      _applyEditModeToggle();
      toast("تغییرات لغو شد");
    });

    overlay.querySelector("[data-save]").addEventListener("click", function () {
      var applied = _dashCommitBuffer();
      _dashClearBuffer();
      close();
      _dashEditMode = false;
      if (applied > 0) {
        saveState();
        toast(faNum(applied) + " تسک ذخیره شد");
      } else {
        toast("تغییری برای ذخیره نبود", "error");
      }
      render();
    });
  }
  function _dashCatClass(cat, role, sourceType) {
    if (sourceType === "residencyActivity") return "is-residency";
    if (role === "anchor") return "is-anchor";
    var c = String(cat || "").toLowerCase();
    if (c === "shift") return "is-shift";
    if (c === "residency") return "is-residency";
    if (c === "study" || c === "review" || c === "assessment") return "is-study";
    if (c === "body" || c === "exercise") return "is-body";
    if (c === "clinical" || c === "case") return "is-clinical";
    if (c === "hospital") return "is-hospital";
    if (c === "sleep" || c === "rest") return "is-sleep";
    if (c === "life" || c === "personal") return "is-life";
    if (c === "income") return "is-income";
    return "is-other";
  }

  function _renderDashNowNext(items, isToday) {
    if (!isToday) return '<div id="dash-now-next-host"></div>';

    var nowMin = (new Date()).getHours() * 60 + (new Date()).getMinutes();
    var timed = [];
    (items || []).forEach(function (it) {
      if (!it) return;
      if (it.role !== "anchor" && it.role !== "block") return;
      if (it.status === "completed" || it.status === "done") return;
      var se = _hStartEndMin(it);
      if (!se) return;
      timed.push({ item: it, start: se.start, end: se.end });
    });
    timed.sort(function (a, b) { return a.start - b.start; });
    /* Phase 27.4c: exclude shifts from now/next */
    timed = timed.filter(function (x) { return x.item && x.item.sourceType !== "shift"; });

    var current = null, currentIdx = -1;
    for (var i = 0; i < timed.length; i++) {
      if (timed[i].start <= nowMin && nowMin < timed[i].end) { current = timed[i]; currentIdx = i; break; }
    }
    var next = null, nextIdx = -1;
    for (var j = 0; j < timed.length; j++) {
      if (timed[j].start > nowMin) { next = timed[j]; nextIdx = j; break; }
    }

    if (!current && !next) {
      return '<div id="dash-now-next-host">' +
        '<div class="dnn2 dnn2-idle dnn2-idle-free" style="--dnn-c: 94, 234, 212">' +
          '<div class="dnn2-center">' +
            '<div class="dnn2-icon-wrap dnn2-icon-float">' +
              '<span class="dnn2-icon">🌤️</span>' +
            '</div>' +
            '<div class="dnn2-body">' +
              '<div class="dnn2-label">' +
                '<span class="dnn2-cat">زمان آزاد</span>' +
                '<span class="dnn2-sep">·</span>' +
                '<span class="dnn2-state">هیچ تسکی در پیش نیست</span>' +
              '</div>' +
              '<div class="dnn2-title">برنامه‌ی امروز تکمیل شده — از این فرصت استفاده کن یا استراحت کن.</div>' +
              '<div class="dnn2-meta">' +
                '<span class="dnn2-remain">می‌توانی با ➕ کار جدیدی اضافه کنی</span>' +
              '</div>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }

    var center = current || next;
    var centerIdx = current ? currentIdx : nextIdx;
    var isNow = !!current;
    var prevItem = centerIdx > 0 ? timed[centerIdx - 1] : null;
    var nextItem = (centerIdx + 1 < timed.length) ? timed[centerIdx + 1] : null;

    var color = _isResidencyLinkedItem(center.item) ? "167, 139, 250" : _dashCatColor(center.item.category, center.item.role, center.item.sourceType);
    var icon  = _isResidencyLinkedItem(center.item) ? "🎓" : _dashCatIcon(center.item.category, center.item.role);
    var catLabel = _isResidencyLinkedItem(center.item) ? "رزیدنتی" : _dashCatLabel(center.item.category, center.item.role);

    var timeRange = _minToHHMM(center.start) + " – " + _minToHHMM(center.end);

    var metaRight, progressPct = 0;
    if (isNow) {
      var remain = center.end - nowMin;
      var elapsed = nowMin - center.start;
      var total = center.end - center.start;
      progressPct = total > 0 ? Math.round((elapsed / total) * 100) : 0;
      metaRight = _fmtMinutesHuman(remain) + ' باقی مانده';
    } else {
      var until = center.start - nowMin;
      metaRight = 'شروع در ' + _fmtMinutesHuman(until);
      progressPct = 0;
    }

    function sideHTML(slot, dir) {
      if (!slot) return '<div class="dnn2-side dnn2-' + dir + ' is-empty"></div>';
      var sIcon  = _isResidencyLinkedItem(slot.item) ? "🎓" : _dashCatIcon(slot.item.category, slot.item.role);
      var sRange = _minToHHMM(slot.start) + "–" + _minToHHMM(slot.end);
      var sTitle = (slot.item.title || "").substring(0, 30);
      return '<div class="dnn2-side dnn2-' + dir + '">' +
        '<div class="dnn2-side-icon">' + sIcon + '</div>' +
        '<div class="dnn2-side-time">' + faNum(sRange) + '</div>' +
        '<div class="dnn2-side-title">' + escapeHTML(sTitle) + '</div>' +
      '</div>';
    }

    return '<div id="dash-now-next-host">' +
      '<div class="dnn2 ' + (isNow ? 'dnn2-now' : 'dnn2-next') + '" style="--dnn-c:' + color + '">' +
        sideHTML(prevItem, 'prev') +
        '<div class="dnn2-center">' +
          '<div class="dnn2-icon-wrap">' +
            '<span class="dnn2-icon">' + (isNow ? icon : "⏳") + '</span>' +
            (isNow ? '<span class="dnn2-pulse"></span>' : '<span class="dnn2-ring"></span>') +
          '</div>' +
          '<div class="dnn2-body">' +
            '<div class="dnn2-label">' +
              '<span class="dnn2-cat">' + catLabel + '</span>' +
              '<span class="dnn2-sep">·</span>' +
              '<span class="dnn2-state">' + (isNow ? '▶️ الان' : '⏳ در پیش رو') + '</span>' +
            '</div>' +
            '<div class="dnn2-title">' + escapeHTML(center.item.title || "") + '</div>' +
            '<div class="dnn2-meta">' +
              '<span class="dnn2-time">' + faNum(timeRange) + '</span>' +
              '<span class="dnn2-sep">·</span>' +
              '<span class="dnn2-remain">' + metaRight + '</span>' +
            '</div>' +
            (isNow ? '<div class="dnn2-progress"><div class="dnn2-progress-fill" style="width:' + progressPct + '%"></div></div>' : '') +
          '</div>' +
        '</div>' +
        sideHTML(nextItem, 'next') +
      '</div>' +
    '</div>';
  }

  function _enDayKey(jy, jm, jd) {
    var EN_DAYS = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
    try {
      var g = jalaliToGregorian(jy, jm, jd);
      var d = new Date(g[0], g[1] - 1, g[2]);
      return EN_DAYS[(d.getDay() + 1) % 7];
    } catch (e) { return "saturday"; }
  }

  function _resolveDashboardDayType() {
    var t = parseJalali(todayJalali());
    if (!t) return { key: "unknown", label: "نامشخص", icon: "❔" };

    var shiftsToday = shiftsOnDate(t.jy, t.jm, t.jd);
    if (shiftsToday.length > 0) return { key: "shift", label: "روز کشیک", icon: "🚨" };

    var y = addJalaliDays(t.jy, t.jm, t.jd, -1);
    var shiftsYest = shiftsOnDate(y.jy, y.jm, y.jd);
    if (shiftsYest.length > 0) return { key: "post_shift", label: "روز پس از کشیک", icon: "😴" };

    var R = window.InternshipResidency;
    var dayType = null;
    try {
      if (R && R.calendar && R.calendar.resolveDayType) {
        dayType = R.calendar.resolveDayType(todayJalali(), state);
      }
    } catch (e) { console.warn("[dash] resolveDayType failed:", e); }

    if (dayType === "free" || dayType === "off") return { key: "free", label: "روز تعطیل", icon: "🏖️" };
    if (dayType === "pre_shift") return { key: "pre_shift", label: "روز قبل کشیک", icon: "⏪" };

    var wdKey = _enDayKey(t.jy, t.jm, t.jd);
    var defaults = state.residency && state.residency.settings && state.residency.settings.weekdayDefaults;
    if (defaults && defaults[wdKey] === "free") {
      return { key: "free", label: "روز تعطیل", icon: "🏖️" };
    }

    var rot = getCurrentRotation();
    if (rot && rot.activitySchedule && typeof rot.activitySchedule === "object") {
      var st = rot.activitySchedule[wdKey];
      if (st === "active")   return { key: "active",   label: "روز فعال",  icon: "🔥" };
      if (st === "light")    return { key: "light",    label: "روز سبک",   icon: "🌤️" };
      if (st === "inactive") return { key: "free",     label: "روز تعطیل", icon: "🏖️" };
    }

    return { key: "normal", label: "روز عادی", icon: "🌤️" };
  }

  function _sumMergedIntervals(intervals) {
    if (!intervals.length) return 0;
    var sorted = intervals.slice().sort(function (a, b) { return a[0] - b[0]; });
    var total = 0, cs = sorted[0][0], ce = sorted[0][1];
    for (var i = 1; i < sorted.length; i++) {
      if (sorted[i][0] <= ce) { if (sorted[i][1] > ce) ce = sorted[i][1]; }
      else { total += ce - cs; cs = sorted[i][0]; ce = sorted[i][1]; }
    }
    total += ce - cs;
    return total;
  }

  function _fmtMinutesHuman(mins) {
    if (!mins || mins <= 0) return "—";
    var h = Math.floor(mins / 60);
    var m = mins % 60;
    if (h === 0) return faNum(m) + " دقیقه";
    if (m === 0) return faNum(h) + " ساعت";
    return faNum(h) + " ساعت و " + faNum(m) + " دقیقه";
  }

  function _renderDashTimeSummary(dateStr, items, windows, isToday, weekdayLabel) {
    var studyIntervals = [];
    var otherIntervals = [];

    (items || []).forEach(function (it) {
      if (!it || !it.startTime || !it.durationMinutes) return;
      if (it.role !== "anchor" && it.role !== "block") return;
      var parts = String(it.startTime).split(":");
      if (parts.length !== 2) return;
      var h = parseInt(parts[0], 10);
      var m = parseInt(parts[1], 10);
      if (isNaN(h) || isNaN(m)) return;
      var start = h * 60 + m;
      var end = start + it.durationMinutes;
      var cat = String(it.category || "");
      if (cat === "study" || cat === "review" || cat === "assessment") {
        studyIntervals.push([start, end]);
      } else {
        otherIntervals.push([start, end]);
      }
    });

    var studyMin = _sumMergedIntervals(studyIntervals);
    var otherMin = _sumMergedIntervals(otherIntervals);
    var freeMin = 0;
    (windows || []).forEach(function (w) { if (w && w.minutes) freeMin += w.minutes; });

    var titleTxt = isToday ? "تقسیم زمان امروز" : ("تقسیم زمان " + (weekdayLabel || ""));

    return '' +
      '<section class="dash-time-summary" id="dash-time-summary-host">' +
      '  <div class="dash-ts-head">' +
      '    <span class="dash-ts-title">⏱️ ' + titleTxt + '</span>' +
      '  </div>' +
      '  <div class="dash-ts-grid">' +
      '    <div class="dash-ts-item is-study">' +
      '      <span class="dash-ts-label">📖 مطالعه‌ی برنامه‌ریزی‌شده</span>' +
      '      <span class="dash-ts-value">' + _fmtMinutesHuman(studyMin) + '</span>' +
      '    </div>' +
      '    <div class="dash-ts-item is-other">' +
      '      <span class="dash-ts-label">🗂️ سایر فعالیت‌های زمان‌دار</span>' +
      '      <span class="dash-ts-value">' + _fmtMinutesHuman(otherMin) + '</span>' +
      '    </div>' +
      '    <div class="dash-ts-item is-free">' +
      '      <span class="dash-ts-label">🪟 زمان آزاد قابل‌استفاده</span>' +
      '      <span class="dash-ts-value">' + _fmtMinutesHuman(freeMin) + '</span>' +
      '    </div>' +
      '  </div>' +
      '  <div class="dash-ts-note">فقط فعالیت‌های دارای ساعت لحاظ شده‌اند.</div>' +
      '</section>';
  }

  /* 27.7b: effective items with buffer */
  function _getEffectiveItems(dateStr) {
    if (!dateStr) return [];
    var SP = window.InternshipResidency && window.InternshipResidency.schedulingProjection;
    if (!SP || !SP.projectDate) return [];
    var items = _dedupItemsForOverlap(SP.projectDate(state, dateStr, {}) || []);
    var bufIds = Object.keys(_dashEditBuffer);
    if (bufIds.length === 0) return items;
    return items.map(function (it) {
      if (!it || it.sourceType !== "task") return it;
      var buf = _dashEditBuffer[it.sourceId];
      if (!buf) return it;
      var sm = _hhmmToMin(buf.time);
      if (sm == null) return it;
      var endStr = _minToHHMM(sm + buf.durationMinutes);
      return Object.assign({}, it, {
        startTime: buf.time,
        endTime: endStr,
        durationMinutes: buf.durationMinutes,
        role: "block"
      });
    });
  }
  /* 27.6d: dedup projection for overlap */
  function _dedupItemsForOverlap(items) {
    if (!Array.isArray(items)) return [];
    var linkedActIds = {};
    (state.tasks || []).forEach(function (t) {
      if (!t) return;
      var st = t.sourceType;
      if (st === "residency_activity" || st === "residencyActivity") {
        var ref = t.residencyActivityId || t.sourceId;
        if (ref) linkedActIds[String(ref)] = true;
      }
    });
    return items.filter(function (it) {
      if (!it) return false;
      if (it.sourceType !== "residencyActivity") return true;
      return !linkedActIds[String(it.sourceId)];
    });
  }
  /* 27.6c: residency link detection */
  function _isResidencyLinkedItem(it) {
    if (!it) return false;
    if (it.sourceType === "residencyActivity") return true;
    if (it.sourceType !== "task") return false;
    var sid = it.sourceId;
    if (!sid) return false;
    var ts = state.tasks || [];
    for (var i = 0; i < ts.length; i++) {
      var t = ts[i];
      if (!t || t.id !== sid) continue;
      if (t.residencyActivityId) return true;
      var st = t.sourceType;
      if (st === "residency_activity" || st === "residencyActivity") return true;
      break;
    }
    return false;
  }
  /* 27.6c: block task-on-task overlap */
  function _shouldBlockOverlap(hypo, ex) {
    if (!hypo || !ex) return false;
    if (hypo.id && ex.id && hypo.id === ex.id) return false;
    var CF = window.InternshipResidency && window.InternshipResidency.schedulingConflict;
    if (!CF || !CF.detectPair) return false;
    var c = CF.detectPair(hypo, ex, {});
    if (!c) return false;
    return c.policy === "HARD";
  }
  var _currentDragPayload = null;

  function _ensureDropGhost(bar) {
    var g = bar.querySelector(".dash-daybar-ghost");
    if (!g) {
      g = document.createElement("span");
      g.className = "dash-daybar-ghost";
      bar.appendChild(g);
    }
    return g;
  }

  function _hideDropGhost(bar) {
    if (!bar) return;
    var g = bar.querySelector(".dash-daybar-ghost");
    if (g) g.style.display = "none";
  }

  function _wireUntimedDropzone() {
    var zone = document.getElementById("dash-untimed-wrap");
    if (!zone || zone.__wiredDrop27) return;
    zone.__wiredDrop27 = true;
    zone.addEventListener("dragover", function (ev) {
      try {
        var t = ev.dataTransfer.types;
        for (var i = 0; i < t.length; i++) {
          if (t[i] === "application/x-io-timed") {
            ev.preventDefault();
            ev.dataTransfer.dropEffect = "move";
            zone.classList.add("is-drop-untime");
            return;
          }
        }
      } catch (e) {}
    });
    zone.addEventListener("dragleave", function (ev) {
      if (zone.contains(ev.relatedTarget)) return;
      zone.classList.remove("is-drop-untime");
    });
    zone.addEventListener("drop", function (ev) {
      zone.classList.remove("is-drop-untime");
      var raw; try { raw = ev.dataTransfer.getData("application/x-io-timed"); } catch (e) {}
      if (!raw) return;
      var payload; try { payload = JSON.parse(raw); } catch (e) { return; }
      if (!payload) return;
      ev.preventDefault();
      _onTimelineUntime(payload.sourceType, payload.sourceId);
    });
  }
  function _wireDayBarDropzone() {
    var bar = document.querySelector(".dash-daybar");
    if (!bar || bar.__wiredDrop27) return;
    bar.__wiredDrop27 = true;

    bar.addEventListener("dragover", function (ev) {
      if (!_currentDragPayload) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
      bar.classList.add("is-drop-target");

      var range = _getDayBarRange();
      var span = range.end - range.start;
      var rect = bar.getBoundingClientRect();
      var pct = (ev.clientX - rect.left) / rect.width;
      if (pct < 0) pct = 0;
      if (pct > 1) pct = 1;
      var dur = _currentDragPayload.durationMinutes || 60;
      var minAt = Math.round((range.start + pct * span) / 5) * 5;
      if (minAt + dur > range.end) minAt = range.end - dur;
      if (minAt < range.start) minAt = range.start;
      var leftPct = ((minAt - range.start) / span) * 100;
      var widthPct = (dur / span) * 100;
      var g = _ensureDropGhost(bar);
      g.style.left = leftPct + "%";
      g.style.width = widthPct + "%";
      g.style.display = "block";
    });

    bar.addEventListener("dragleave", function (ev) {
      if (bar.contains(ev.relatedTarget)) return;
      bar.classList.remove("is-drop-target");
      _hideDropGhost(bar);
    });

    bar.addEventListener("drop", function (ev) {
      bar.classList.remove("is-drop-target");
      _hideDropGhost(bar);
      var raw;
      try { raw = ev.dataTransfer.getData("application/x-io-flexible"); } catch (e) {}
      if (!raw) return;
      var payload;
      try { payload = JSON.parse(raw); } catch (e) { return; }
      if (!payload) return;
      ev.preventDefault();
      _currentDragPayload = null;
      _onFlexibleDropOnBar(payload, ev.clientX, bar);
    });
  }
  /* 27.7: drag flexible to bar */
  function _onFlexibleDropOnBar(payload, clientX, bar) {
    if (!payload || !bar) return;
    var range = _getDayBarRange();
    var span = range.end - range.start;
    var rect = bar.getBoundingClientRect();
    var pct = (clientX - rect.left) / rect.width;
    if (pct < 0) pct = 0;
    if (pct > 1) pct = 1;
    var minAt = Math.round((range.start + pct * span) / 5) * 5;
    var duration = payload.durationMinutes || 60;
    if (minAt + duration > range.end) minAt = range.end - duration;
    if (minAt < range.start) minAt = range.start;
    var newTime = _minToHHMM(minAt);

    if (payload.sourceType === "residencyActivity") {
      var overlay = document.createElement("div");
      overlay.className = "modal-overlay";
      overlay.innerHTML = ''
        + '<div class="modal" role="dialog" aria-modal="true" style="max-width:400px">'
        + '<h3 style="margin-bottom:6px">⏰ افزودن به نوار</h3>'
        + '<p style="margin:0 0 16px;font-size:13px;color:var(--text-muted);line-height:1.8">'
        +   'ساعت پیشنهادی: <strong style="color:#5eead4">' + faNum(newTime) + '</strong> · مدت: ' + faNum(duration) + ' دقیقه'
        + '</p>'
        + '<div class="modal-actions">'
        +   '<button class="btn ghost" type="button" data-close>انصراف</button>'
        +   '<button class="btn primary" type="button" data-confirm>ادامه</button>'
        + '</div>'
        + '</div>';
      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add("open"); });
      var close2 = function () { overlay.remove(); };
      overlay.querySelector("[data-close]").addEventListener("click", close2);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close2(); });
      overlay.querySelector("[data-confirm]").addEventListener("click", function () {
        close2();
        openResidencyActivityTimingModalWithPreset(payload.sourceId, newTime, duration);
      });
      return;
    }

    if (payload.sourceType === "task") {
      var t = null;
      for (var i = 0; i < state.tasks.length; i++) {
        if (state.tasks[i].id === payload.sourceId) { t = state.tasks[i]; break; }
      }
      if (!t) return;

      // HARD check
      var R = window.InternshipResidency;
      var SP = R && R.schedulingProjection;
      var CF = R && R.schedulingConflict;
      if (SP && CF && CF.detectPair && SP.projectDate) {
        try {
          var existing = _getEffectiveItems(t.date);
          var filt = [];
          for (var j = 0; j < existing.length; j++) {
            var ex = existing[j];
            if (ex.sourceType === "task" && ex.sourceId === t.id) continue;
            filt.push(ex);
          }
          var sm = _hhmmToMin(newTime);
          var endStr = _minToHHMM(sm + duration);
          var hypo = {
            id: "hypo", sourceType: "task", sourceId: t.id,
            title: t.title, category: t.areaId || "",
            date: t.date, startTime: newTime, endTime: endStr,
            durationMinutes: duration, role: "block", status: "pending", context: null
          };
          for (var k = 0; k < filt.length; k++) {
            if (_shouldBlockOverlap(hypo, filt[k])) {
              toast("⛔ تداخل غیرمجاز", "error");
              return;
            }
          }
        } catch (e) { console.warn("[27.7 drop]", e); }
      }

      _dashSetBufferedValue(t.id, newTime, duration);
      if (!_dashEditMode) _dashEditMode = true;
      _ioRefreshDay();
      toast("به نوار اضافه شد — برای ذخیره «💾» را بزن");
    }
  }

  function _wireFlexibleDragDrop(host) {
    if (!host) return;
    var flexibles = host.querySelectorAll('.dt20-flex-item[data-dt20-source]');
    Array.prototype.forEach.call(flexibles, function (el) {
      if (el.__wiredDrag27) return;
      el.__wiredDrag27 = true;
      el.addEventListener("dragstart", function (ev) {
        var sid = el.getAttribute("data-dt20-sourceid");
        var src = el.getAttribute("data-dt20-source");
        var dur = parseInt(el.getAttribute("data-dt20-duration"), 10) || 60;
        if (!sid || !src) { ev.preventDefault(); return; }
        try {
          ev.dataTransfer.effectAllowed = "copy";
          ev.dataTransfer.setData("application/x-io-flexible", JSON.stringify({
            sourceType: src, sourceId: sid, durationMinutes: dur
          }));
          _currentDragPayload = { sourceType: src, sourceId: sid, durationMinutes: dur };
        } catch (e) { ev.preventDefault(); return; }
        el.classList.add("is-drag-source");
      });
      el.addEventListener("dragend", function () {
        el.classList.remove("is-drag-source");
        _currentDragPayload = null;
        var b = document.querySelector(".dash-daybar");
        if (b) {
          b.classList.remove("is-drop-target");
          _hideDropGhost(b);
        }
      });
    });
  }
  function _renderDashDayBar(items, isToday) {
    var range = _getDayBarRange();
    var span  = range.end - range.start;

    // Phase 27.6b: dedup residencyActivity vs linked task (mirror day-timeline)
    try {
      var _linkedActIds = {};
      (state.tasks || []).forEach(function (t) {
        if (!t) return;
        var st = t.sourceType;
        if (st === "residency_activity" || st === "residencyActivity") {
          var ref = t.residencyActivityId || t.sourceId;
          if (ref) _linkedActIds[String(ref)] = true;
        }
      });
      if (Object.keys(_linkedActIds).length > 0) {
        items = (items || []).filter(function (it) {
          if (!it) return false;
          if (it.sourceType !== "residencyActivity") return true;
          return !_linkedActIds[String(it.sourceId)];
        });
      }
    } catch (e) { console.warn("[daybar-dedup]", e); }

    var cur = _dashSelectedDay || todayJalali();
    var prevItems = [];
    try {
      var p = parseJalali(cur);
      if (p) {
        var prev = addJalaliDays(p.jy, p.jm, p.jd, -1);
        var prevKey = dateKey(prev.jy, prev.jm, prev.jd);
        var R = window.InternshipResidency;
        if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
          prevItems = R.schedulingProjection.projectDate(state, prevKey, {}) || [];
        }
      }
    } catch (e) {}

    var blocks = [];
    var todayShiftCount = 0;

    (items || []).forEach(function (it) {
      if (!it) return;
      if (it.sourceType === "shift") todayShiftCount++;

      /* p283: HARD FILTER */
      if (it.sourceType === "task" || it.sourceType === "residencyActivity") {
        var _buf = _dashEditBuffer[it.sourceId];
        var _bufHasTime = _buf && _hhmmToMin(_buf.time) != null;
        var _itHasTime = it.startTime && it.durationMinutes;
        if (!_bufHasTime && !_itHasTime) return;
      }

      var effStart = null, effEnd = null, isDirty = false;
      if (it.sourceType === "task" && _dashEditBuffer[it.sourceId]) {
        var buf = _dashEditBuffer[it.sourceId];
        var sm = _hhmmToMin(buf.time);
        if (sm != null) {
          effStart = sm;
          effEnd = sm + buf.durationMinutes;
          isDirty = true;
        }
      }
      if (!isDirty) {
        if (it.role !== "anchor" && it.role !== "block") return;
        var se = _hStartEndMin(it);
        if (!se) return;
        effStart = se.start;
        effEnd = se.end;
      }

      var s = Math.max(effStart, range.start);
      var e = Math.min(effEnd, range.end);
      if (e <= s) return;
      var startPct = ((s - range.start) / span) * 100;
      var widthPct = ((e - s) / span) * 100;
      if (widthPct <= 0) return;

      var catCls = _isResidencyLinkedItem(it) ? "is-residency" : _dashCatClass(it.category, it.role, it.sourceType);
      var cls = "dash-daybar-block " + catCls;
      var _isDone = (it.status === "completed" || it.status === "done");
      if (_isDone) cls += " is-completed";
      if (isDirty) cls += " is-dirty";
      /* PATCH:phase-F7-split5 — continuation arrows for sleep */
      if (it._cont === "tail") cls += " is-cont-tail";
      if (it._cont === "head") cls += " is-cont-head";
      var isShift = (it.sourceType === "shift");
      var title = (it.title || "").substring(0, 60);
      var seStr = _minToHHMM(effStart) + "–" + _minToHHMM(effEnd);
      var tooltip = title + ' · ' + seStr;
      var dataAttrs = ' data-bar-source="' + (it.sourceType || '') + '"' +
                      ' data-bar-id="' + (it.sourceId || '') + '"' +
                      ' data-bar-start="' + _minToHHMM(effStart) + '"' +
                      ' data-bar-end="' + _minToHHMM(effEnd) + '"' +
                      ' data-bar-duration="' + (effEnd - effStart) + '"';
      dataAttrs += ' data-bar-cat="' + _esc(it.category || "") + '" data-bar-title="' + _esc(it.title || "") + '" data-bar-tooltip-range="' + _minToHHMM(effStart) + '–' + _minToHHMM(effEnd) + '"';
      // p27-66: tooltip — title + time only
      var _bar_titleStr = String(it.title || "").trim();
      var _bar_timeStr = _minToHHMM(effStart) + " → " + _minToHHMM(effEnd);
      var _bar_tip_join = _bar_titleStr ? (_bar_titleStr + " · " + _bar_timeStr) : _bar_timeStr;
      dataAttrs += ' data-tip="' + _esc(_bar_tip_join) + '"';
      if (isShift) dataAttrs += ' data-bar-noclick="1"';

      var handles = "";
      if (_dashEditMode && it.sourceType === "task" && !_isResidencyLinkedItem(it)) {
        handles = '<span class="dbar-handle dbar-handle-l" data-handle="left"></span>' +
                  '<span class="dbar-handle dbar-handle-r" data-handle="right"></span>';
      }

      blocks.push('<span class="' + cls + '" style="left:' + startPct + '%;width:' + widthPct + '%;--bar-tip-c:' + _dashCatColor(it.category, it.role, it.sourceType) + '"' + dataAttrs + '>' + handles + '</span>');
    });

    (prevItems || []).forEach(function (it) {
      if (!it) return;
      if (it.sourceType !== "shift") return;
      var se = _hStartEndMin(it);
      if (!se) return;
      if (se.end <= 1440) return;
      var carryEnd = se.end - 1440;
      var s = Math.max(0, range.start);
      var e = Math.min(carryEnd, range.end);
      if (e <= s) return;
      var startPct = ((s - range.start) / span) * 100;
      var widthPct = ((e - s) / span) * 100;
      if (widthPct <= 0) return;
      var catCls = _isResidencyLinkedItem(it) ? "is-residency" : _dashCatClass(it.category, it.role, it.sourceType);
      var cls = "dash-daybar-block " + catCls + " is-continued";
      blocks.push('<span class="' + cls + '" style="left:' + startPct + '%;width:' + widthPct + '%;--bar-tip-c:' + _dashCatColor(it.category, it.role, it.sourceType) + '"></span>');
    });

    var nowHTML = "";
    if (isToday) {
      var d = new Date();
      var nowMin = d.getHours() * 60 + d.getMinutes();
      if (nowMin >= range.start && nowMin <= range.end) {
        var nowPct = ((nowMin - range.start) / span) * 100;
        nowHTML = '<span class="dash-daybar-now" style="left:' + nowPct + '%"></span>';
      }
    }

    var ticksHTML = "";
    var tickCount = 5;
    for (var i = 0; i < tickCount; i++) {
      var pct = (i / (tickCount - 1)) * 100;
      var minAt = range.start + (i / (tickCount - 1)) * span;
      var hAt = Math.round(minAt / 60);
      var label = (hAt === 24) ? "۲۴" : faNum(hAt);
      ticksHTML += '<span class="dash-daybar-tick" style="left:' + pct + '%">' + label + '</span>';
    }

    var startOpts = "", endOpts = "";
    for (var hs = 0; hs <= 23; hs++) {
      var selS = (hs === range.startH) ? " selected" : "";
      startOpts += '<option value="' + hs + '"' + selS + '>' + faNum(hs) + '</option>';
    }
    for (var he = 1; he <= 24; he++) {
      var selE = (he === range.endH) ? " selected" : "";
      endOpts += '<option value="' + he + '"' + selE + '>' + faNum(he) + '</option>';
    }

    var hasBuffer = _dashHasBuffer();
    var editModeCls = _dashEditMode ? " is-edit" : "";

    var shiftBadge = todayShiftCount > 0
      ? '<span class="dash-day-shift-badge" title="امروز کشیک داری">🚨</span>'
      : '';

    var toolbarHTML =
      '<div class="dash-daybar-toolbar">' +
        '<div class="dash-daybar-toolbar-left">' +
          '<span class="dbar-toolbar-title">🕐 خط زمان روز</span>' +
          shiftBadge +
        '</div>' +
        '<div class="dash-daybar-toolbar-right">' +
          '<button class="dbar-quick-add" type="button" data-dbar-quick-add title="افزودن سریع">➕</button>' +
          (_dashEditMode && hasBuffer
            ? '<button class="dbar-action-btn is-save" type="button" data-dbar-save>💾 ذخیره تغییرات</button>' +
              '<button class="dbar-action-btn is-cancel" type="button" data-dbar-cancel>✗ لغو</button>'
            : '') +
          '<button class="dbar-edit-toggle ' + (_dashEditMode ? 'is-active' : '') + '" type="button" data-dbar-edit-toggle>' +
            (_dashEditMode ? '✓ پایان ویرایش' : '✏️ ویرایش') +
          '</button>' +
        '</div>' +
      '</div>';

    var editPanelHTML = _dashEditMode
      ? '<div class="dash-daybar-edit-panel">' +
          '<div class="dbar-ctrl-group">' +
            '<label class="dbar-ctrl"><span>از ساعت</span><select id="dbar-start">' + startOpts + '</select></label>' +
            '<label class="dbar-ctrl"><span>تا ساعت</span><select id="dbar-end">' + endOpts + '</select></label>' +
          '</div>' +
          '<div class="dbar-edit-hint">🖱️ از وسط بلوک بکش = جابجایی · از لبه‌ها بکش = تغییر مدت · کلیک ساده = ویرایش کامل</div>' +
        '</div>'
      : '';

    var legendHTML =
      '<div class="dash-daybar-legend">' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-shift"></span>کشیک</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-study"></span>مطالعه</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-residency"></span>رزیدنتی</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-clinical"></span>بالین</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-hospital"></span>بیمارستان</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-body"></span>ورزش و سلامت</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-life"></span>زندگی شخصی</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-sleep"></span>خواب</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-income"></span>پروژه و کار</span>' +
        '<span class="dbar-legend-item"><span class="dbar-legend-swatch is-other"></span>سایر</span>' +
      '</div>';

    return '<div id="dash-daybar-host">' +
      '<div class="dash-daybar-wrap' + editModeCls + '">' +
        toolbarHTML +
        '<div class="dash-daybar">' +
          '<span class="dash-daybar-grid"></span>' +
          blocks.join("") +
          nowHTML +
        '</div>' +
        '<div class="dash-daybar-ticks">' + ticksHTML + '</div>' +
      '</div>' +
      editPanelHTML +
      legendHTML +
    '</div>';
  }
  function _getSaturdayOfWeek(jy, jm, jd, weekOffset) {
    // پیدا کردن شنبه‌ی هفته‌ی جاری + offset هفته‌ها
    var wdName = weekdayName(jy, jm, jd);
    var JW = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];
    var wdIdx = JW.indexOf(wdName);
    if (wdIdx < 0) wdIdx = 0;
    // برگرد به شنبه (0 = شنبه)
    var sat = addJalaliDays(jy, jm, jd, -wdIdx + (weekOffset || 0) * 7);
    return sat;
  }
function _dashWeekLabel() {
    var t = parseJalali(todayJalali());
    var base = _getSaturdayOfWeek(t.jy, t.jm, t.jd, _dashWeekOffset);
    var end = addJalaliDays(base.jy, base.jm, base.jd, 6);
    var m1 = JMONTHS[base.jm - 1];
    var m2 = JMONTHS[end.jm - 1];
    var rangeStr;
    if (base.jm === end.jm) {
      rangeStr = faNum(base.jd) + " – " + faNum(end.jd) + " " + m1 + " " + faNum(base.jy);
    } else if (base.jy === end.jy) {
      rangeStr = faNum(base.jd) + " " + m1 + " – " + faNum(end.jd) + " " + m2 + " " + faNum(base.jy);
    } else {
      rangeStr = faNum(base.jd) + " " + m1 + " " + faNum(base.jy) + " – " + faNum(end.jd) + " " + m2 + " " + faNum(end.jy);
    }
    var relLabel;
    if (_dashWeekOffset === 0) relLabel = "هفته‌ی جاری";
    else if (_dashWeekOffset === -1) relLabel = "هفته‌ی گذشته";
    else if (_dashWeekOffset < 0) relLabel = faNum(-_dashWeekOffset) + " هفته پیش";
    else if (_dashWeekOffset === 1) relLabel = "هفته‌ی آینده";
    else relLabel = faNum(_dashWeekOffset) + " هفته بعد";
    return '<span class="dash-week-range">' + rangeStr + '</span>' +
           '<span class="dash-week-rel">' + relLabel + '</span>';
  }

  function areaCardHTML(area) {
    const p = areaProgress(area.id);
    const total = state.tasks.filter((t) => t.areaId === area.id && !t.cancelled).length;
    const active = state.tasks.filter((t) => t.areaId === area.id && !t.completed && !t.cancelled).length;
    const done = total - active;
    const isEmpty = total === 0;
    const isComingSoon = (typeof COMING_SOON_AREAS !== "undefined") && (COMING_SOON_AREAS.indexOf(area.id) !== -1);

    let statusText;
    let statusClass = "";
    if (isEmpty) {
      statusText = "خالی";
      statusClass = "is-empty";
    } else if (active === 0) {
      statusText = "✓ کامل";
      statusClass = "is-done";
    } else if (done === 0) {
      statusText = "در انتظار";
      statusClass = "is-pending";
    } else {
      statusText = `${faNum(active)} باقی‌مانده`;
      statusClass = "is-partial";
    }

    const comingBadge = isComingSoon
      ? `<span class="life-card-coming-badge">🚧 به زودی</span>`
      : "";

    return `
      <button class="life-card ${statusClass} ${isComingSoon ? "is-coming-soon" : ""}" type="button" data-nav="${area.id}" style="--accent:${area.accent}">
        <span class="life-card-glow" aria-hidden="true"></span>
        ${comingBadge}
        <span class="life-card-head">
          <span class="life-card-icon" aria-hidden="true">${area.icon}</span>
          <span class="life-card-pct">${faNum(p)}٪</span>
        </span>
        <span class="life-card-name">${area.title}</span>
        <span class="life-card-en">${area.subtitle}</span>
        <span class="life-card-track">
          <span class="life-card-track-fill" style="width:${p}%"></span>
        </span>
        <span class="life-card-foot">
          <span class="life-card-count">${isEmpty ? "بدون تسک" : faNum(total) + " کار"}</span>
          <span class="life-card-status">${statusText}</span>
        </span>
      </button>
    `;
  }

  function taskRowHTML(task) {
    const area = areaById(task.areaId);
    return `
      <li class="task-row ${task.completed ? "done" : ""}">
        <span class="task-check" data-toggle-task="${task.id}" role="checkbox"
              aria-checked="${task.completed}" tabindex="0" aria-label="${escapeHTML(task.title)}"></span>
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${taskSourceBadgeHTML(task)}
        ${area ? `<span class="task-area-pill">${area.icon} ${area.title}</span>` : ""}
      </li>
    `;
  }

  function taskSourceBadgeHTML(task) {
    if (!task || !task.sourceType || task.sourceType === "manual") return "";
    if (task.sourceType === "curriculum") {
      return `<span class="task-source-badge source-curriculum" title="از کوریکولوم بالینی">📚</span>`;
    }
    if (task.sourceType === "case") {
      return `<span class="task-source-badge source-case" title="از کیس‌لاگ">📝</span>`;
    }
    return "";
  }

  /* [PATCH:mvp02] Virtual occurrence toggle */
  function _toggleVirtualOccurrence(virtualId) {
    var m = /^virtual:([^@]+)@(.+)$/.exec(virtualId);
    if (!m) return;
    var parentId = m[1];
    var date = m[2];
    var parent = state.tasks.find(function (x) { return x.id === parentId; });
    if (!parent) return;
    if (!parent.recurrenceExceptions || typeof parent.recurrenceExceptions !== "object") {
      parent.recurrenceExceptions = {};
    }
    if (parent.recurrenceExceptions[date] === "completed") {
      delete parent.recurrenceExceptions[date];
    } else {
      parent.recurrenceExceptions[date] = "completed";
    }
    parent.updatedAt = Date.now();
    try { saveState(); } catch (e) {}
    render();
  }


  function toggleTask(id) {
    // [PATCH:mvp02] virtual occurrence
    if (typeof id === "string" && id.indexOf("virtual:") === 0) {
      return _toggleVirtualOccurrence(id);
    }
    const t = state.tasks.find((x) => x.id === id);
    if (!t) return;
    const wasCompleted = t.completed;
    t.completed = !t.completed && !t.cancelled;
    t.updatedAt = Date.now();
    if (_rtIsRelevantTask(t)) _rtNotify(t.completed ? "task_completed" : "task_updated", { id: t.id, date: t.date, sourceType: "task", title: t.title });
    if (t.completed) spawnNextOccurrence(t);
    // ─── [PATCH:v4-task-activity-sync] propagate completion to residency activity ───
    try {
      if (window.InternshipResidency && window.InternshipResidency.taskProjection) {
        window.InternshipResidency.taskProjection.onTaskCompleted(id);
      }
    } catch (e) { console.warn("[v4 task-sync]", e); }
    // ─── [PATCH:review-v10] auto-register study→review ───
    try {
      if (window.InternshipResidency && window.InternshipResidency.reviewIntegration) {
        window.InternshipResidency.reviewIntegration.onTaskCompleted(id);
      }
    } catch (e) { console.warn("[v10 review-sync]", e); }
    saveState();
    render();

    // ─── اگه تسک تازه «انجام شد» و کاربر توی داشبورد یا برنامه‌ریزیه، پیام رو عوض کن ───
    if (!wasCompleted && t.completed && (route === "dashboard" || route === "planner")) {
      // تأخیر کوچیک تا انیمیشن تیک تسک تموم بشه
      setTimeout(() => {
        applyNewMotivation();
      }, 400);
    }
  }

  function renderAreaStructureHTML(areaId) {
    const area = areaById(areaId);
    if (!area) return "<p>بخش پیدا نشد</p>";

    const structure = (DATA.lifeAreasStructure || {}).areas || {};
    const areaStruct = structure[areaId];

    if (!areaStruct || !Array.isArray(areaStruct.categories) || areaStruct.categories.length === 0) {
      return '<div class="area-detail-empty"><p>ساختاری برای این بخش تعریف نشده.</p></div>';
    }

    const catsHTML = areaStruct.categories.map((cat, ci) => {
      const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
      const subsHTML = subs.length === 0
        ? '<li class="area-detail-sub"><span class="area-detail-sub-title" style="color:var(--text-dim)">زیردسته‌ای ثبت نشده</span></li>'
        : subs.map((sub) => `
            <li class="area-detail-sub">
              <span class="area-detail-sub-icon">◆</span>
              <span class="area-detail-sub-title">${escapeHTML(sub.title)}</span>
            </li>
          `).join("");
      return `
        <div class="area-detail-cat">
          <div class="area-detail-cat-head">
            <span class="area-detail-cat-num">${faNum(ci + 1)}</span>
            <div class="area-detail-cat-titles">
              <h4>${escapeHTML(cat.title)}</h4>
              <span class="area-detail-cat-meta">${faNum(subs.length)} زیردسته</span>
            </div>
          </div>
          <ul class="area-detail-subs">${subsHTML}</ul>
        </div>
      `;
    }).join("");

    return `<div class="area-detail-grid">${catsHTML}</div>`;
  }

  const COMING_SOON_AREAS = []; /* PATCH:phase-F10-no-cs-life */
 /* PATCH:phase-F8b8-no-cs-income */

  /* ─── Area Detail (ساختار ۷ بخش زندگی) ─── */

/* PATCH:phase-A-health-hub */
  var _healthTab = "workout";
/* PATCH:phase-B-health */
  var _healthEditId = null;

    function _financeEnsure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.finance || typeof s.finance !== "object") s.finance = {};
    if (!Array.isArray(s.finance.transactions)) s.finance.transactions = [];
    if (!Array.isArray(s.finance.categories)) s.finance.categories = [];
    if (!s.finance.budgets || typeof s.finance.budgets !== "object") s.finance.budgets = {};
    return s.finance;
  }

  function _financeTestBridge() {
    if (typeof window === "undefined") return;
    if (window.__ioFinanceBridge && window.__ioFinanceBridge.__v === 1) return;
    window.__ioFinanceBridge = {
      __v: 1,
      state:        function () { return state; },
      save:         saveState,
      notify:       _notifyApp,
      escapeHtml:   escapeHTML,
      fa0:          _fa0,
      fa1:          _fa1,
      faNum:        faNum,
      todayJalali:  todayJalali,
      parseJalali:  parseJalali,
      jalaliToDayNumber: function (jy,jm,jd) { try { return jalaliToDayNumber(jy,jm,jd); } catch (e) { return 0; } },
      jalaliMonthLength: function (jy,jm) { try { return jalaliMonthLength(jy,jm); } catch (e) { return 31; } },
      weekdayName: function (jy,jm,jd) { try { return weekdayName(jy,jm,jd); } catch (e) { return ""; } },
      addJalaliDays: function (jy,jm,jd,n) { try { return addJalaliDays(jy,jm,jd,n); } catch (e) { return { jy:jy, jm:jm, jd:jd }; } },
      dateKey:      function (jy,jm,jd) { try { return dateKey(jy,jm,jd); } catch (e) { return ""; } },
      ensure:       _financeEnsure,
      newId:        function () { try { return "txn-" + Date.now() + "-" + Math.floor(Math.random()*1e6); } catch (e) { return "txn-" + Date.now(); } },
      financeFormat: function (n) { try { var R2 = window.InternshipResidency; if (R2 && R2.financeUI && R2.financeUI.formatToman) return R2.financeUI.formatToman(n); } catch (e) {} return String(n); },
      dialogConfirm: function (msg, opts) {
        try {
          var D = window.InternshipResidency && window.InternshipResidency.dialog;
          if (D && typeof D.confirm === "function") return D.confirm(msg, opts);
        } catch (e) {}
        return Promise.resolve(window.confirm(msg));
      }
    };
  }
  function _lifeEnsure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.life || typeof s.life !== "object") s.life = {};
    if (!Array.isArray(s.life.items)) s.life.items = [];
    return s.life;
  }

  function _lifeTestBridge() {
    if (typeof window === "undefined") return;
    if (window.__ioLifeBridge && window.__ioLifeBridge.__v === 1) return;
    window.__ioLifeBridge = {
      __v: 1,
      state:        function () { return state; },
      save:         saveState,
      notify:       _notifyApp,
      escapeHtml:   escapeHTML,
      fa0:          _fa0,
      fa1:          _fa1,
      faNum:        faNum,
      todayJalali:  todayJalali,
      parseJalali:  parseJalali,
      weekdayName:  function (jy,jm,jd) { try { return weekdayName(jy,jm,jd); } catch (e) { return ""; } },
      dateKey:      function (jy,jm,jd) { try { return dateKey(jy,jm,jd); } catch (e) { return ""; } },
      ensure:       _lifeEnsure,
      newId:        function () { try { return "life-" + Date.now() + "-" + Math.floor(Math.random()*1e6); } catch (e) { return "life-" + Date.now(); } },
      openTaskForm: function (taskId, presetDate, presetAreaId, presetProjectId) {
        try { openTaskForm(taskId, presetDate, presetAreaId, presetProjectId); } catch (e) {}
      },
      openTaskFormForLife: function (presetDate) {
        try { openTaskForm(null, presetDate || null, "life", null); } catch (e) {}
      },
      findTask: function (tid) {
        try { for (var i = 0; i < state.tasks.length; i++) if (state.tasks[i].id === tid) return state.tasks[i]; } catch (e) {}
        return null;
      },
      dialogConfirm: function (msg, opts) {
        try {
          var D = window.InternshipResidency && window.InternshipResidency.dialog;
          if (D && typeof D.confirm === "function") return D.confirm(msg, opts);
        } catch (e) {}
        return Promise.resolve(window.confirm(msg));
      }
    };
  }
function _projectsEnsure(s) {
    if (!s || typeof s !== "object") return null;
    if (!Array.isArray(s.projects)) s.projects = [];
    return s.projects;
  }

  function _projectsTestBridge() {
    if (typeof window === "undefined") return;
    if (window.__ioProjectsBridge) return;
    window.__ioProjectsBridge = {
      state:        function () { return state; },
      save:         saveState,
      notify:       _notifyApp,
      escapeHtml:   escapeHTML,
      fa0:          _fa0,
      fa1:          _fa1,
      faNum:        faNum,
      todayJalali:  todayJalali,
      parseJalali:  parseJalali,
      setRoute:     function (r) { try { setRoute(r); } catch (e) {} },
      ensure:       _projectsEnsure,
      newId:        function () {
        try { return "prj-" + Date.now() + "-" + Math.floor(Math.random()*1e6); }
        catch (e) { return "prj-" + Date.now(); }
      },
      openTaskForm: function (taskId, presetDate, presetAreaId, presetProjectId) {
        try { openTaskForm(taskId, presetDate, presetAreaId, presetProjectId); } catch (e) {}
      },
      openTaskFormForProject: function (projectId) {
        try { openTaskForm(null, null, null, projectId); } catch (e) {}
      },
      dialogConfirm: function (msg, opts) {
        try {
          var D = window.InternshipResidency && window.InternshipResidency.dialog;
          if (D && typeof D.confirm === "function") return D.confirm(msg, opts);
        } catch (e) {}
        return Promise.resolve(window.confirm(msg));
      }
    };
  }
  function _healthEnsure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.health || typeof s.health !== "object") s.health = {};
    if (!s.health.profile || typeof s.health.profile !== "object") {
      s.health.profile = { birthDate: null, sex: null, heightCm: null, activityLevel: null, goal: null, targetWeightKg: null };
    }
    if (!Array.isArray(s.health.bodyLog)) s.health.bodyLog = [];
    if (s.health.calorieTarget === undefined) s.health.calorieTarget = null;
    if (!Array.isArray(s.health.foodCatalog)) s.health.foodCatalog = [];
    if (!Array.isArray(s.health.foodLog)) s.health.foodLog = [];
    if (!Array.isArray(s.health.workoutLog)) s.health.workoutLog = []; /* PATCH:phase-F6-health */
    return s.health;
  }
  function _healthNewId() {
    return "h-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _healthValidDate(str) {
    if (!str || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(str)) return false;
    var p = parseJalali(str);
    if (!p) return false;
    var t = parseJalali(todayJalali());
    if (p.jy > t.jy) return false;
    if (p.jy === t.jy && p.jm > t.jm) return false;
    if (p.jy === t.jy && p.jm === t.jm && p.jd > t.jd) return false;
    return true;
  }
  function _healthSortDesc(arr) {
    return arr.slice().sort(function (a, b) { return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0); });
  }
  function _healthLastBody() {
    var h = _healthEnsure(state); if (!h || !h.bodyLog.length) return null;
    return _healthSortDesc(h.bodyLog)[0];
  }
  function _healthLastHeight() {
    var h = _healthEnsure(state); if (!h || !h.bodyLog.length) return null;
    var s = _healthSortDesc(h.bodyLog);
    for (var i = 0; i < s.length; i++) { if (s[i].heightCm) return s[i]; }
    return null;
  }
  function _selHTML(id, opts, val) {
    return '<select class="health-input" id="' + id + '">' + opts.map(function (o) {
      return '<option value="' + o[0] + '"' + (o[0] === val ? ' selected' : '') + '>' + o[1] + '</option>';
    }).join('') + '</select>';
  }
  function _profileStatus(p) {
    var miss = [];
    if (!p.birthDate) miss.push("تاریخ تولد");
    if (!p.sex) miss.push("جنس");
    if (!p.heightCm) miss.push("قد");
    if (!p.activityLevel) miss.push("سطح فعالیت");
    if (!p.goal) miss.push("هدف");
    return { incomplete: miss.length > 0, missing: miss };
  }

  /* PATCH:phase-C-ui */
  var _foodDraft = null;
  var _mealPickerState = null;

  function _fa1(n) {
    if (n === null || n === undefined) return '—';
    var x = Math.round(n * 10) / 10;
    return faNum(x);
  }
  function _fa0(n) {
    if (n === null || n === undefined) return '—';
    return faNum(Math.round(n));
  }
  function _nutritionStatusText(s) {
    var info = _nutritionCalcProfile(s);
    if (info.status === 'ok') return null;
    if (info.status === 'incomplete') return 'برای محاسبه هدف، این موارد ناقص است: ' + (info.missing || []).join('، ');
    if (info.status === 'no_sex_method') return 'برای گزینه «سایر»، روش محاسبه هدف به‌صورت خودکار فعال نیست.';
    if (info.status === 'underage') return 'برای افراد زیر ۱۸ سال هدف کالری خودکار محاسبه نمی‌شود.';
    return 'وضعیت پروفایل برای محاسبه هدف مناسب نیست.';
  }
    function _renderNutritionProfileSection() {
    var h = _healthEnsure(state);
    var p = h.profile;
    var stat = _profileStatus(p);
    var complete = !stat.incomplete;
    var out = '<div class="nt-card">';
    out += '<div class="nt-card-head">';
    out += '<span class="nt-card-title">پروفایل پایه</span>';
    if (complete && !_nutritionProfileEditOpen) {
      out += '<span class="nt-card-sub">تاریخ تولد · ' + (p.sex === 'male' ? 'مرد' : p.sex === 'female' ? 'زن' : 'سایر') + ' · ' + _fa0(p.heightCm) + ' سانتی‌متر</span>';
      out += '<button class="btn ghost nt-edit-btn" type="button" id="hp-toggle-edit">ویرایش</button>';
    }
    out += '</div>';
    if (!complete || _nutritionProfileEditOpen) {
      if (stat.incomplete) out += '<div class="health-hint">برای محاسبه هدف، این موارد را کامل کن: ' + stat.missing.join('، ') + '</div>';
      var bstr = p.birthDate || todayJalali();
      var bp = parseJalali(bstr) || parseJalali(todayJalali());
      out += '<div class="health-form">';
      out += '<label class="health-field"><span>تاریخ تولد</span>' + datePickerHTML('hp-birth', bp.jy, bp.jm, bp.jd) + '</label>';
      out += '<label class="health-field"><span>جنس (برای معادله تخمین انرژی)</span>' + _selHTML('hp-sex', [['','—'],['male','مرد'],['female','زن'],['other','سایر']], p.sex || '') + '</label>';
      out += '<label class="health-field"><span>قد (سانتی‌متر)</span><input type="number" class="health-input" id="hp-height" min="30" max="250" value="' + (p.heightCm || '') + '"></label>';
      out += '<label class="health-field"><span>سطح فعالیت</span>' + _selHTML('hp-activity', [['','—'],['sedentary','کم‌تحرک'],['light','فعالیت سبک'],['moderate','متوسط'],['active','فعال'],['very_active','بسیار فعال']], p.activityLevel || '') + '</label>';
      out += '<label class="health-field"><span>هدف</span>' + _selHTML('hp-goal', [['','—'],['lose','کاهش وزن'],['gain','افزایش وزن'],['muscle','عضله‌سازی'],['maintain','حفظ وزن']], p.goal || '') + '</label>';
      out += '<label class="health-field"><span>وزن هدف (کیلوگرم، اختیاری)</span><input type="number" step="0.1" class="health-input" id="hp-target" min="20" max="400" value="' + (p.targetWeightKg || '') + '"></label>';
      out += '</div>';
      out += '<div class="health-actions">';
      out += '<button class="btn primary" type="button" id="hp-save">ذخیره پروفایل</button>';
      if (complete) out += ' <button class="btn ghost" type="button" id="hp-cancel-edit">انصراف</button>';
      out += '</div>';
    }
    out += '</div>';
    return out;
  }
function _renderNutritionTargetSection() {
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    var info = _nutritionCalcProfile(state);
    var statusMsg = _nutritionStatusText(state);
    var out = '<h3 class="section-heading">هدف تغذیه</h3>';
    if (statusMsg) {
      out += '<div class="health-hint">' + statusMsg + '</div>';
    }
    var canCalc = (info.status === 'ok');
    var calcBtn = canCalc
      ? '<button class="btn primary" type="button" id="nt-recalc">' + (t ? 'محاسبه مجدد' : 'محاسبه هدف') + '</button>'
      : '';
    if (t) {
      out += '<div class="nt-target">';
      out += '<div class="nt-target-kcal"><span class="nt-target-num">' + _fa0(t.kcal) + '</span><span class="nt-target-label">کیلوکالری در روز</span></div>';
      out += '<div class="nt-macros">';
      out += '<div class="nt-macro"><span class="nt-macro-name">پروتئین</span><span class="nt-macro-g">' + _fa1(t.p) + ' گرم</span><span class="nt-macro-p">' + _fa0(t.pPct) + '٪</span></div>';
      out += '<div class="nt-macro"><span class="nt-macro-name">کربوهیدرات</span><span class="nt-macro-g">' + _fa1(t.c) + ' گرم</span><span class="nt-macro-p">' + _fa0(t.cPct) + '٪</span></div>';
      out += '<div class="nt-macro"><span class="nt-macro-name">چربی</span><span class="nt-macro-g">' + _fa1(t.f) + ' گرم</span><span class="nt-macro-p">' + _fa0(t.fPct) + '٪</span></div>';
      out += '</div>';
      out += '<div class="nt-target-meta">';
      if (t.ree) out += '<span>انرژی استراحت تخمینی: ' + _fa0(t.ree) + ' کیلوکالری</span>';
      if (t.tdee) out += '<span>انرژی روزانه تخمینی: ' + _fa0(t.tdee) + ' کیلوکالری</span>';
      if (t.bmi) out += '<span>شاخص توده بدنی تقریبی: ' + _fa1(t.bmi) + '</span>';
      if (t.manual) out += '<span>این هدف به‌صورت دستی تنظیم شده است.</span>';
      out += '</div>';
      out += '<div class="health-actions">' + calcBtn + ' <button class="btn ghost" type="button" id="nt-edit-macros">ویرایش نسبت‌ها</button></div>';
      out += '</div>';
      var diffHint = _nutritionTargetDiffers(state);
      if (diffHint) out += '<div class="health-hint">' + diffHint + '</div>';
    } else {
      out += '<div class="nt-target-empty">هنوز هدفی محاسبه و ذخیره نشده است.</div>';
      if (calcBtn) out += '<div class="health-actions">' + calcBtn + '</div>';
    }
    out += _renderMacroEditor();
    return out;
  }

  function _nutritionTargetDiffers(s) {
    var h = _healthEnsure(s);
    var t = h.calorieTarget;
    if (!t || !t.profileSnapshot) return null;
    var cur = JSON.stringify(h.profile);
    var snap = JSON.stringify(t.profileSnapshot);
    if (cur === snap) return null;
    return 'پروفایل پس از محاسبه هدف تغییر کرده است. در صورت نیاز «محاسبه مجدد» را بزن.';
  }

  function _renderMacroEditor() {
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    if (!t) return '';
    return '<div class="nt-macro-editor" id="nt-macro-editor" hidden>' +
      '<h4>ویرایش نسبت درشت‌مغذی‌ها</h4>' +
      '<div class="health-form">' +
      '<label class="health-field"><span>پروتئین (٪)</span><input type="number" class="health-input" id="nt-p" min="0" max="100" value="' + t.pPct + '"></label>' +
      '<label class="health-field"><span>کربوهیدرات (٪)</span><input type="number" class="health-input" id="nt-c" min="0" max="100" value="' + t.cPct + '"></label>' +
      '<label class="health-field"><span>چربی (٪)</span><input type="number" class="health-input" id="nt-f" min="0" max="100" value="' + t.fPct + '"></label>' +
      '</div>' +
      '<div class="health-actions"><button class="btn primary" type="button" id="nt-save-macros">ذخیره نسبت‌ها</button> <button class="btn ghost" type="button" id="nt-cancel-macros">انصراف</button></div>' +
      '</div>';
  }

  function _renderNutritionSummary(date) {
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    var day = _dayTotals(state, date);
    var out = '<div class="nt-sum-strip">';
    /* --- kcal card --- */
    out += '<div class="nt-kcal-card">';
    out += '<div class="nt-kcal-icon">🔥</div>';
    out += '<div class="nt-kcal-body">';
    out += '<div class="nt-kcal-label">کالری امروز</div>';
    out += '<div class="nt-kcal-nums"><span class="nt-kcal-now">' + _fa0(day.kcal) + '</span>';
    if (t) out += '<span class="nt-kcal-goal">/ ' + _fa0(t.kcal) + '</span>';
    out += '</div>';
    if (t) {
      out += _ntBar(day.kcal, t.kcal, 'kcal');
      var rem = t.kcal - day.kcal;
      out += '<div class="nt-kcal-rem ' + (rem < 0 ? 'is-over' : '') + '">' + (rem < 0 ? '⚠️ ' + _fa0(-rem) + ' بیش از هدف' : '✨ ' + _fa0(rem) + ' باقی‌مانده') + '</div>';
    } else {
      out += '<div class="nt-kcal-rem">بدون هدف — فقط مصرف</div>';
    }
    out += '</div></div>';
    /* --- macros card --- */
    out += '<div class="nt-macros-card">';
    var macros = [['p','پروتئین','🍗','is-p'],['c','کربوهیدرات','🍚','is-c'],['f','چربی','🥜','is-f']];
    for (var mi = 0; mi < macros.length; mi++) {
      var k = macros[mi][0], label = macros[mi][1], ic = macros[mi][2], cls = macros[mi][3];
      var consumed = day[k];
      var tgt = t ? t[k] : null;
      out += '<div class="nt-macro-row ' + cls + '">';
      out += '<span class="nt-macro-ic">' + ic + '</span>';
      out += '<div class="nt-macro-body">';
      out += '<div class="nt-macro-top"><span class="nt-macro-lab">' + label + '</span>';
      out += '<span class="nt-macro-val">' + _fa1(consumed) + (tgt ? ' / ' + _fa1(tgt) : '') + 'g</span></div>';
      if (tgt) out += _ntBar(consumed, tgt, cls);
      out += '</div></div>';
    }
    out += '</div>';
    out += '</div>';
    return out;
  }
  function _ntBar(consumed, target, kind) {
    if (!target || target <= 0) return '';
    var pct = (consumed / target) * 100;
    var shown = Math.min(100, pct);
    var over = consumed > target;
    return '<div class="nt-bar nt-bar-' + kind + (over ? ' is-over' : '') + '"><span class="nt-bar-fill" style="width:' + shown.toFixed(1) + '%"></span></div>';
  }
var _MEALS = [["breakfast","صبحانه","🍳"],["lunch","ناهار","🍲"],["dinner","شام","🍽️"],["snack","میان‌وعده","🍪"]];
  function _renderNutritionHero(date) { /* PATCH:phase-F6-nutri5 */
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    var day = _dayTotals(state, date);
    var target = t ? t.kcal : null;
    var pct = target ? Math.min(100, Math.round(day.kcal / target * 100)) : 0;
    var arcCirc = 2 * Math.PI * 34;
    var arcOff = arcCirc - (pct / 100) * arcCirc;
    var remain = target ? (target - day.kcal) : null;
    var out = '<div class="nt-hero">';
    out += '<div class="nt-hero-arc">';
    out += '<svg viewBox="0 0 80 80" class="nt-arc-svg">';
    out += '<defs><linearGradient id="ntArcGrad" x1="0" y1="0" x2="1" y2="1">';
    out += '<stop offset="0%" stop-color="rgb(52,211,153)"/>';
    out += '<stop offset="100%" stop-color="rgb(56,189,248)"/>';
    out += '</linearGradient></defs>';
    out += '<circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>';
    out += '<circle cx="40" cy="40" r="34" fill="none" stroke="url(#ntArcGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="' + arcCirc.toFixed(2) + '" stroke-dashoffset="' + arcOff.toFixed(2) + '" transform="rotate(-90 40 40)"/>';
    out += '</svg>';
    out += '<div class="nt-arc-txt"><span class="nt-arc-num">' + _fa0(day.kcal) + '</span><span class="nt-arc-u">کالری</span></div>';
    out += '</div>';
    out += '<div class="nt-hero-info">';
    out += '<div class="nt-hero-title">🔥 امروز</div>';
    out += '<div class="nt-hero-kpis">';
    out += '<div class="nt-hero-kcal-side">';
    if (target) out += '<span class="nt-hero-kpi">هدف <b>' + _fa0(target) + '</b></span>';
    if (remain != null && remain >= 0) out += '<span class="nt-hero-kpi">باقی <b>' + _fa0(remain) + '</b></span>';
    if (remain != null && remain < 0) out += '<span class="nt-hero-kpi nt-kpi-over">بیش از هدف <b>' + _fa0(-remain) + '</b></span>';
    out += '<div class="nt-hero-sub">' + (target ? _fa0(pct) + '٪ از هدف روزانه' : 'هدف تعیین نشده') + '</div>';
    out += '</div>';
    if (t && t.p) {
      var pCons = day.p || 0;
      var pTgt = t.p;
      var _pPct = pTgt > 0 ? Math.min(100, (pCons / pTgt * 100)) : 0;
      out += '<div class="nt-hero-pro-side">';
      out += '<span class="nt-hero-kpi nt-kpi-p">پروتئین <b>' + _fa1(pCons) + '</b> / ' + _fa1(pTgt) + '</span>';
      out += '<div class="nt-hero-pbar"><span class="nt-hero-pbar-fill" style="width:' + _pPct.toFixed(1) + '%"></span></div>';
      out += '</div>';
    }
    out += '</div>';
    out += '</div>';
    out += '</div>';
    return out;
  }
  function _renderNutritionMeals(date) {
    var out = '<h3 class="section-heading">🍽️ وعده‌های امروز</h3>';
    out += '<div class="nt-meals-grid">';
    for (var mi = 0; mi < _MEALS.length; mi++) {
      var mealId = _MEALS[mi][0], mealLabel = _MEALS[mi][1], mealIcon = _MEALS[mi][2] || '🍽️';
      var m = _mealByDateKind(state, date, mealId);
      var mt = m ? _mealTotals(m) : { kcal:0, p:0, c:0, f:0 };
      out += '<div class="nt-meal-card is-' + mealId + '">';
      out += '<div class="nt-meal-card-head">';
      out += '<span class="nt-meal-card-icon">' + mealIcon + '</span>';
      out += '<span class="nt-meal-card-name">' + mealLabel + '</span>';
      out += '<span class="nt-meal-card-kcal">' + _fa0(mt.kcal) + ' kcal</span>';
      out += '<button class="nt-meal-plus" type="button" data-meal-db="' + mealId + '" title="افزودن">+</button>';
      out += '</div>';
      if (m && m.items.length) {
        out += '<ul class="nt-meal-items">';
        for (var ii = 0; ii < m.items.length; ii++) {
          var it = m.items[ii];
          var ik = (typeof it.snapshot.kcal === "number") ? (it.grams * it.snapshot.kcal / 100) : null;
          out += '<li class="nt-meal-item">';
          out += '<span class="nt-item-name">' + escapeHTML(it.snapshot.name) + '</span>';
          out += '<span class="nt-item-grams">' + _fa0(it.grams) + 'g</span>';
          out += '<span class="nt-item-kcal">' + (ik == null ? "—" : _fa0(ik)) + '</span>';
          out += '<button class="nt-item-del" type="button" data-meal-del="' + m.id + '" data-item-idx="' + ii + '" title="حذف">✕</button>';
          out += '</li>';
        }
        out += '</ul>';
      } else {
        out += '<div class="nt-meal-card-empty">هنوز چیزی ثبت نشده</div>';
      }
      out += '</div>';
    }
    out += '</div>';
    return out;
  }
function _renderNutritionTab() {
    var date = _nutritionDate();
    var todayK = todayJalali();
    var out = '<div class="health-content">';
    out += '<div class="nt-subtabs">';
    out += '<button class="nt-subtab' + (_nutritionSubTab === "today" ? " is-active" : "") + '" type="button" data-nt-sub="today">🍽️ روز</button>';
    out += '<button class="nt-subtab' + (_nutritionSubTab === "trend" ? " is-active" : "") + '" type="button" data-nt-sub="trend">📊 روند</button>';
    out += '</div>';
    if (_nutritionSubTab === "trend") {
      out += _renderNutritionTrend();
    } else {
      out += '<div class="nt-day-nav">';
      out += '<button class="nt-day-arrow" type="button" data-nt-day-prev>‹</button>';
      out += '<div class="nt-day-nav-body">';
      out += '<span class="nt-day-nav-ic">📅</span>';
      out += '<span class="nt-day-nav-txt">' + _nutritionPrettyDate(date) + '</span>';
      if (date !== todayK) out += '<button class="nt-day-nav-today" type="button" data-nt-goto-today>امروز</button>';
      out += '</div>';
      out += '<button class="nt-day-arrow" type="button" data-nt-day-next>›</button>';
      out += '</div>';
      out += _renderNutritionHero(date);
      out += _renderNutritionMeals(date);
      out += _renderNutritionSummary(date);
      out += '<div class="nt-bottom-grid">';
      out += '<div class="nt-bottom-col">' + _renderNutritionTargetSection() + '</div>';
      out += '<div class="nt-bottom-col">' + _renderNutritionProfileSection() + '</div>';
      out += '</div>';
    }
    out += '</div>';
    return out;
  }
function _addDaysJKey(jy, jm, jd, delta) {
    var y = jy, m = jm, d = jd + delta;
    function len(y2, m2) { return m2 <= 6 ? 31 : (m2 <= 11 ? 30 : 29); }
    while (d < 1) { m--; if (m < 1) { m = 12; y--; } d += len(y, m); }
    while (d > len(y, m)) { d -= len(y, m); m++; if (m > 12) { m = 1; y++; } }
    return y + "/" + m + "/" + d;
  }

  function _trendDaysOfMonth(jy, jm) {
    var max = (jm <= 6) ? 31 : (jm <= 11 ? 30 : 29);
    var arr = [];
    for (var d = 1; d <= max; d++) arr.push({ d: d, key: jy + "/" + jm + "/" + d });
    return arr;
  }

  function _renderNutritionTrend() {
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    var target = t ? t.kcal : null;
    var today = todayJalali();
    var tp = parseJalali(today);
    if (!_trendView) _trendView = { jy: tp.jy, jm: tp.jm };
    var jy = _trendView.jy, jm = _trendView.jm;
    var days = _trendDaysOfMonth(jy, jm);
    var out = '<div class="nt-trend">';
    out += '<div class="nt-trend-head">';
    out += '<button class="nt-nav" type="button" data-nt-month="prev">‹</button>';
    out += '<span class="nt-month-name">' + NT_MONTHS[jm - 1] + ' ' + faNum(jy) + '</span>';
    out += '<button class="nt-nav" type="button" data-nt-month="next">›</button>';
    out += '</div>';
    out += '<div class="nt-heat-grid">';
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var tot = _dayTotals(state, d.key);
      var pct = target ? (tot.kcal / target * 100) : 0;
      var level = "l0";
      if (tot.kcal > 0) {
        if (pct < 50) level = "l1";
        else if (pct < 85) level = "l2";
        else if (pct <= 110) level = "l3";
        else level = "l4";
      }
      var isToday = (d.key === today);
      out += '<div class="nt-heat-cell ' + level + (isToday ? ' is-today' : '') + '" data-nt-day="' + d.key + '" title=""' + d.key + ' — ' + _fa0(tot.kcal) + ' کالری — برای ویرایش کلیک کن">' +
        '<span class="nt-heat-day">' + faNum(d.d) + '</span>' +
        '<span class="nt-heat-kcal">' + (tot.kcal ? _fa0(tot.kcal) : '') + '</span>' +
        '</div>';
    }
    out += '</div>';
    out += '<div class="nt-heat-legend">';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l0"></span>ثبت نشده</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l1"></span>کم</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l2"></span>متوسط</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l3"></span>در محدوده</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l4"></span>بیش از هدف</span>';
    out += '</div>';
    out += _renderNutritionLineChart(target);
    out += _renderNutritionStats(target);
    out += '</div>';
    return out;
  }

  function _renderNutritionLineChart(target) {
    var today = todayJalali();
    var tp = parseJalali(today);
    var keys = [], vals = [];
    for (var i = 29; i >= 0; i--) {
      var k = _addDaysJKey(tp.jy, tp.jm, tp.jd, -i);
      keys.push(k);
      vals.push(_dayTotals(state, k).kcal);
    }
    var W = 680, H = 200, PX = 30, PY = 24;
    var maxV = target || 0;
    for (var m = 0; m < vals.length; m++) if (vals[m] > maxV) maxV = vals[m];
    if (maxV <= 0) maxV = 500;
    var stepX = (W - PX * 2) / (keys.length - 1);
    var pts = [];
    for (var n = 0; n < vals.length; n++) {
      pts.push({
        x: PX + n * stepX,
        y: H - PY - (vals[n] / maxV) * (H - PY * 2),
        v: vals[n]
      });
    }
    var d = "";
    for (var p2 = 0; p2 < pts.length; p2++) d += (p2 ? " L" : "M") + pts[p2].x.toFixed(1) + " " + pts[p2].y.toFixed(1);
    var svg = '<svg class="nt-chart" viewBox="0 0 ' + W + ' ' + H + '">';
    svg += '<defs><linearGradient id="ntLineGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0%" stop-color="#5eead4"/><stop offset="50%" stop-color="#818cf8"/><stop offset="100%" stop-color="#f472b6"/></linearGradient>';
    svg += '<linearGradient id="ntAreaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="rgba(129,140,248,.35)"/><stop offset="100%" stop-color="rgba(129,140,248,0)"/></linearGradient></defs>';
    if (target) {
      var ty = H - PY - (target / maxV) * (H - PY * 2);
      svg += '<line x1="' + PX + '" y1="' + ty.toFixed(1) + '" x2="' + (W - PX) + '" y2="' + ty.toFixed(1) + '" stroke="rgba(251,191,36,.5)" stroke-width="1.5" stroke-dasharray="6 5"/>';
      svg += '<text x="' + (W - PX) + '" y="' + (ty - 5).toFixed(1) + '" text-anchor="end" font-size="10" fill="#fbbf24">هدف</text>';
    }
    svg += '<path d="' + d + ' L' + pts[pts.length - 1].x.toFixed(1) + ' ' + (H - PY) + ' L' + pts[0].x.toFixed(1) + ' ' + (H - PY) + ' Z" fill="url(#ntAreaGrad)"/>';
    svg += '<path d="' + d + '" fill="none" stroke="url(#ntLineGrad)" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"/>';
    for (var q = 0; q < pts.length; q++) {
      if (vals[q] > 0) svg += '<circle cx="' + pts[q].x.toFixed(1) + '" cy="' + pts[q].y.toFixed(1) + '" r="3" fill="#818cf8"/>';
    }
    svg += '</svg>';
    var out = '<h3 class="section-heading">📈 ۳۰ روز اخیر</h3>';
    out += '<div class="nt-chart-wrap">' + svg + '</div>';
    return out;
  }

  function _renderNutritionStats(target) {
    var today = todayJalali();
    var tp = parseJalali(today);
    var total = 0, count = 0, best = 0, bestKey = "", hitTarget = 0;
    for (var i = 29; i >= 0; i--) {
      var k = _addDaysJKey(tp.jy, tp.jm, tp.jd, -i);
      var v = _dayTotals(state, k).kcal;
      if (v > 0) {
        total += v; count++;
        if (v > best) { best = v; bestKey = k; }
        if (target && v >= target * 0.85 && v <= target * 1.1) hitTarget++;
      }
    }
    var avg = count ? total / count : 0;
    var out = '<h3 class="section-heading">📊 آمار ۳۰ روز</h3>';
    out += '<div class="nt-stats">';
    out += '<div class="nt-stat"><span class="nt-stat-ic">📅</span><span class="nt-stat-num">' + faNum(count) + '</span><span class="nt-stat-lbl">روز ثبت‌شده</span></div>';
    out += '<div class="nt-stat"><span class="nt-stat-ic">🍽️</span><span class="nt-stat-num">' + _fa0(avg) + '</span><span class="nt-stat-lbl">میانگین کالری</span></div>';
    out += '<div class="nt-stat"><span class="nt-stat-ic">🎯</span><span class="nt-stat-num">' + faNum(hitTarget) + '</span><span class="nt-stat-lbl">روز در محدوده هدف</span></div>';
    out += '<div class="nt-stat"><span class="nt-stat-ic">🔥</span><span class="nt-stat-num">' + _fa0(best) + '</span><span class="nt-stat-lbl">بیشترین کالری' + (bestKey ? ' (' + bestKey + ')' : '') + '</span></div>';
    out += '</div>';
    return out;
  }
function _renderBodyTab() { /* PATCH:phase-F6-bodyUI */
    var h = _healthEnsure(state);
    var last = _healthLastBody();
    var sorted = _healthSortDesc(h.bodyLog);
    var first = sorted.length ? sorted[sorted.length - 1] : null;
    var delta = (last && first && last.id !== first.id) ? (last.weightKg - first.weightKg) : null;

    var out = '<div class="health-content">';

    var currWeight = last ? last.weightKg : null;
    var target = (h.profile && h.profile.targetWeightKg) ? h.profile.targetWeightKg : null;
    var deltaTxt = '';
    var deltaCls = 'flat';
    if (delta != null) {
      if (delta > 0.1) { deltaTxt = '▲ ' + _fa1(Math.abs(delta)); deltaCls = 'up'; }
      else if (delta < -0.1) { deltaTxt = '▼ ' + _fa1(Math.abs(delta)); deltaCls = 'down'; }
      else { deltaTxt = '—'; deltaCls = 'flat'; }
    }
    var arcCirc = 2 * Math.PI * 34;
    var arcPct = 0;
    if (currWeight && target && target > 0) {
      var dnum = Math.abs(currWeight - target);
      var dbase = Math.max(5, currWeight * 0.2);
      arcPct = Math.max(0, Math.min(100, 100 - (dnum / dbase) * 100));
    } else if (currWeight) {
      arcPct = Math.max(0, Math.min(100, ((currWeight - 40) / 80) * 100));
    }
    var arcOff = arcCirc - (arcPct / 100) * arcCirc;

    out += '<div class="body-hero">' +
      '<div class="body-hero-arc">' +
        '<svg viewBox="0 0 80 80" class="body-arc-svg">' +
          '<defs><linearGradient id="bodyArcGrad" x1="0" y1="0" x2="1" y2="1">' +
            '<stop offset="0%" stop-color="rgb(244,114,182)"/>' +
            '<stop offset="100%" stop-color="rgb(167,139,250)"/>' +
          '</linearGradient></defs>' +
          '<circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>' +
          '<circle cx="40" cy="40" r="34" fill="none" stroke="url(#bodyArcGrad)" stroke-width="7" stroke-linecap="round"' +
            ' stroke-dasharray="' + arcCirc.toFixed(2) + '" stroke-dashoffset="' + arcOff.toFixed(2) + '" transform="rotate(-90 40 40)"/>' +
        '</svg>' +
        '<div class="body-arc-txt">' +
          '<span class="body-arc-num">' + (currWeight != null ? _fa1(currWeight) : '—') + '</span>' +
          '<span class="body-arc-u">کیلوگرم</span>' +
        '</div>' +
      '</div>' +
      '<div class="body-hero-info">' +
        '<div class="body-hero-title">📏 آخرین اندازه‌گیری</div>' +
        '<div class="body-hero-kpis">' +
          (sorted.length ? '<span class="body-hero-kpi"><b>' + _fa0(sorted.length) + '</b> ثبت</span>' : '') +
          (delta != null ? '<span class="body-hero-kpi body-kpi-' + deltaCls + '">' + deltaTxt + '</span>' : '') +
          (target ? '<span class="body-hero-kpi">هدف <b>' + _fa1(target) + '</b></span>' : '') +
        '</div>' +
        '<div class="body-hero-date">' + (last ? ('📅 ' + last.date) : 'هنوز ثبت نشده') + '</div>' +
      '</div>' +
    '</div>';

    var editing = _healthEditId ? h.bodyLog.filter(function (x) { return x.id === _healthEditId; })[0] : null;
    var init = editing || {};
    var initDate = editing ? editing.date : todayJalali();
    var ip = parseJalali(initDate) || parseJalali(todayJalali());
    out += '<div class="body-form-card">';
    out += '<div class="body-form-title">' + (editing ? '✏️ ویرایش اندازه‌گیری' : '➕ ثبت اندازه‌گیری جدید') + '</div>';
    out += '<div class="health-form">';
    out += '<label class="health-field"><span>تاریخ</span>' + datePickerHTML('hb-date', ip.jy, ip.jm, ip.jd) + '</label>';
    out += '<label class="health-field"><span>وزن (کیلوگرم)</span><input type="number" step="0.1" class="health-input" id="hb-weight" min="20" max="400" value="' + (init.weightKg || '') + '" placeholder="۷۵.۵"></label>';
    out += '</div>';
    out += '<div class="health-actions">';
    out += '<button class="btn primary" type="button" id="hb-save">' + (editing ? '💾 ذخیره ویرایش' : '💾 ثبت') + '</button>';
    if (editing) out += '<button class="btn ghost" type="button" id="hb-cancel">انصراف</button>';
    out += '</div></div>';

    out += '<h3 class="section-heading">📈 روند وزن</h3>';
    out += _renderWeightChart();
    out += '<h3 class="section-heading">📋 تاریخچه</h3>';
    out += _renderBodyHistory();
    out += '</div>';
    return out;
  }

  function _renderWeightChart() { /* PATCH:phase-F6-bodyUI */
    var h = _healthEnsure(state);
    var logs = (h.bodyLog || []).filter(function (x) { return x.weightKg; });
    if (logs.length === 0) return '<div class="body-empty"><span class="body-empty-ic">📉</span><div>داده‌ای برای نمودار وجود ندارد</div></div>';
    if (logs.length === 1) return '<div class="body-empty"><span class="body-empty-ic">📊</span><div>برای رسم روند، حداقل دو اندازه‌گیری لازم است</div></div>';
    logs.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
    var W = 640, H = 200, P = 28;
    var minV = logs[0].weightKg, maxV = logs[0].weightKg;
    logs.forEach(function (l) { if (l.weightKg < minV) minV = l.weightKg; if (l.weightKg > maxV) maxV = l.weightKg; });
    var pad = Math.max(0.5, (maxV - minV) * 0.15);
    minV -= pad; maxV += pad;
    var range = Math.max(0.5, maxV - minV);
    var stepX = (W - P * 2) / (logs.length - 1);
    var pts = logs.map(function (l, i) {
      return { x: P + i * stepX, y: H - P - ((l.weightKg - minV) / range) * (H - P * 2), log: l };
    });
    var d = '';
    for (var i = 0; i < pts.length; i++) {
      if (i === 0) d += 'M ' + pts[i].x.toFixed(1) + ' ' + pts[i].y.toFixed(1);
      else {
        var x0 = pts[i-1].x, y0 = pts[i-1].y, x1 = pts[i].x, y1 = pts[i].y;
        var cx = (x0 + x1) / 2;
        d += ' C ' + cx.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
      }
    }
    var areaD = d + ' L ' + pts[pts.length-1].x.toFixed(1) + ' ' + (H - P) + ' L ' + pts[0].x.toFixed(1) + ' ' + (H - P) + ' Z';
    var svg = '<svg class="body-chart-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">';
    svg += '<defs><linearGradient id="bodyAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgb(244,114,182)" stop-opacity="0.42"/>' +
      '<stop offset="100%" stop-color="rgb(244,114,182)" stop-opacity="0"/>' +
      '</linearGradient>' +
      '<linearGradient id="bodyLineGrad" x1="0" y1="0" x2="1" y2="0">' +
      '<stop offset="0%" stop-color="rgb(244,114,182)"/>' +
      '<stop offset="100%" stop-color="rgb(167,139,250)"/>' +
      '</linearGradient></defs>';
    for (var gi = 0; gi <= 3; gi++) {
      var gy = P + (gi / 3) * (H - P * 2);
      svg += '<line x1="' + P + '" y1="' + gy.toFixed(1) + '" x2="' + (W-P) + '" y2="' + gy.toFixed(1) + '" stroke="rgba(255,255,255,.05)" stroke-width="1"/>';
    }
    svg += '<path d="' + areaD + '" fill="url(#bodyAreaGrad)"/>';
    svg += '<path d="' + d + '" fill="none" stroke="url(#bodyLineGrad)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>';
    for (var pi = 0; pi < pts.length; pi++) {
      var isLast = (pi === pts.length - 1);
      svg += '<circle cx="' + pts[pi].x.toFixed(1) + '" cy="' + pts[pi].y.toFixed(1) + '" r="' + (isLast ? 5 : 3) + '" fill="' + (isLast ? 'rgb(244,114,182)' : '#1a1f2b') + '" stroke="rgb(244,114,182)" stroke-width="2"/>';
    }
    svg += '</svg>';
    var labels = '<div class="body-chart-labels"><span>' + logs[0].date + '</span><span>' + logs[logs.length-1].date + '</span></div>';
    return '<div class="body-chart-wrap">' + svg + labels + '</div>';
  }

  function _renderBodyHistory() { /* PATCH:phase-F6-bodyUI */
    var h = _healthEnsure(state);
    if (!h.bodyLog.length) return '<div class="body-empty"><span class="body-empty-ic">📋</span><div>تاریخچه‌ای وجود ندارد</div></div>';
    var sorted = _healthSortDesc(h.bodyLog);
    var max = sorted[0].weightKg, min = sorted[0].weightKg;
    sorted.forEach(function (r) { if (r.weightKg > max) max = r.weightKg; if (r.weightKg < min) min = r.weightKg; });
    var range = Math.max(0.5, max - min);
    var rows = sorted.slice(0, 30).map(function (r, idx) {
      var pct = 20 + ((r.weightKg - min) / range) * 80;
      var isLatest = (idx === 0);
      return '<div class="body-hist-item' + (isLatest ? ' is-latest' : '') + '">' +
        '<div class="body-hist-bar-wrap"><div class="body-hist-bar" style="width:' + pct.toFixed(0) + '%"></div></div>' +
        '<div class="body-hist-info">' +
          '<div class="body-hist-weight">' + faNum(r.weightKg) + ' <span class="body-hist-u">kg</span></div>' +
          '<div class="body-hist-date">' + r.date + '</div>' +
        '</div>' +
        '<div class="body-hist-acts">' +
          '<button class="body-act" type="button" data-hb-edit="' + r.id + '" title="ویرایش">✏️</button>' +
          '<button class="body-act" type="button" data-hb-del="' + r.id + '" title="حذف">🗑</button>' +
        '</div>' +
      '</div>';
    }).join('');
    return '<div class="body-hist-list">' + rows + '</div>';
  }

  function _renderWorkoutTab() { /* PATCH:phase-F6-workoutreal, b5 */
    var h = _healthEnsure(state);
    var date = _workoutDate();
    var todayK = todayJalali();
    var out = '<div class="health-content">';
    out += '<div class="nt-subtabs">';
    out += '<button class="nt-subtab' + (_workoutSubTab === "today" ? " is-active" : "") + '" type="button" data-wo-sub="today">🏋️ روز</button>';
    out += '<button class="nt-subtab' + (_workoutSubTab === "trend" ? " is-active" : "") + '" type="button" data-wo-sub="trend">📊 روند</button>';
    out += '</div>';
    if (_workoutSubTab === "trend") {
      out += _renderWorkoutTrend();
    } else {
      out += '<div class="nt-day-nav">';
      out += '<button class="nt-day-arrow" type="button" data-wo-day-prev>‹</button>';
      out += '<div class="nt-day-nav-body">';
      out += '<span class="nt-day-nav-ic">📅</span>';
      out += '<span class="nt-day-nav-txt">' + _nutritionPrettyDate(date) + '</span>';
      if (date !== todayK) out += '<button class="nt-day-nav-today" type="button" data-wo-goto-today>امروز</button>';
      out += '</div>';
      out += '<button class="nt-day-arrow" type="button" data-wo-day-next>›</button>';
      out += '</div>';

      var all = (h && Array.isArray(h.workoutLog)) ? h.workoutLog : [];
      var dayLogs = all.filter(function (e) { return e && e.date === date; });
      var sumMin = 0, sumKcal = 0;
      for (var i = 0; i < dayLogs.length; i++) {
        sumMin += Number(dayLogs[i].durationMinutes) || 0;
        sumKcal += Number(dayLogs[i].kcalEstimated) || 0;
      }
      var w = null;
      try { var b = _healthLastBody(); w = (b && isFinite(b.weightKg)) ? b.weightKg : null; } catch (e) {}

            /* PATCH:phase-F6-woUI */
      var _arcCirc = 2 * Math.PI * 34;
      var _arcPct = Math.min(100, Math.round(sumMin / 30 * 100));
      var _arcOff = _arcCirc - (_arcPct / 100) * _arcCirc;
      out += '<div class="wo-hero">' +
        '<div class="wo-hero-arc">' +
          '<svg viewBox="0 0 80 80" class="wo-arc-svg">' +
            '<defs><linearGradient id="woArcGrad" x1="0" y1="0" x2="1" y2="1">' +
              '<stop offset="0%" stop-color="rgb(56,189,248)"/>' +
              '<stop offset="100%" stop-color="rgb(52,211,153)"/>' +
            '</linearGradient></defs>' +
            '<circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>' +
            '<circle cx="40" cy="40" r="34" fill="none" stroke="url(#woArcGrad)" stroke-width="7" stroke-linecap="round"' +
              ' stroke-dasharray="' + _arcCirc.toFixed(2) + '" stroke-dashoffset="' + _arcOff.toFixed(2) + '" transform="rotate(-90 40 40)"/>' +
          '</svg>' +
          '<div class="wo-arc-txt"><span class="wo-arc-num">' + _fa0(sumMin) + '</span><span class="wo-arc-u">دقیقه</span></div>' +
        '</div>' +
        '<div class="wo-hero-info">' +
          '<div class="wo-hero-title">🏋️ ورزش این روز</div>' +
          '<div class="wo-hero-kpis">' +
            '<span class="wo-hero-kpi"><b>' + _fa0(Math.round(sumKcal)) + '</b> کالری تخمینی</span>' +
            '<span class="wo-hero-kpi"><b>' + _fa0(dayLogs.length) + '</b> جلسه</span>' +
          '</div>' +
          (w != null ? ('<div class="wo-hero-weight">وزن فعلی: ' + _fa1(w) + ' کیلوگرم</div>') : '') +
        '</div>' +
      '</div>';
      out += '<button type="button" class="wo-open-btn" id="wdb-open-main">➕ ثبت جلسه جدید</button>';

      if (dayLogs.length) {
        out += '<div class="wo-list-head">جلسات این روز</div><div class="wo-log-list">';
        for (var k = 0; k < dayLogs.length; k++) {
          var e2 = dayLogs[k];
          var sn = e2.snapshot || {};
          out += '<div class="wo-log-item">' +
                 '<div class="wo-log-body"><div class="wo-log-name">' + escapeHTML(sn.name || "ورزش") + '</div>' +
                 '<div class="wo-log-sub">' + _fa0(e2.durationMinutes || 0) + ' دقیقه · ' + _fa0(e2.kcalEstimated || 0) + ' کالری</div></div>' +
                 '<button class="wo-log-del" type="button" data-wo-del="' + escapeHTML(e2.id) + '" title="حذف">🗑</button></div>';
        }
        out += '</div>';
      } else {
        out += '<div class="wo-empty-state"><span class="wo-empty-ic">💤</span><div>برای این روز جلسه‌ای ثبت نشده</div></div>';
      }
    }
    out += '</div>';
    return out;
  }

  function _renderWorkoutTrend() { /* PATCH:phase-F6-b5 */
    var h = _healthEnsure(state);
    var today = todayJalali();
    var tp = parseJalali(today);
    if (!_workoutTrendView) _workoutTrendView = { jy: tp.jy, jm: tp.jm };
    var jy = _workoutTrendView.jy, jm = _workoutTrendView.jm;
    var days = _trendDaysOfMonth(jy, jm);
    var TARGET_MIN = 30;
    var all = (h && Array.isArray(h.workoutLog)) ? h.workoutLog : [];
    var out = '<div class="nt-trend">';
    out += '<div class="nt-trend-head">';
    out += '<button class="nt-nav" type="button" data-wo-month="prev">‹</button>';
    out += '<span class="nt-month-name">' + NT_MONTHS[jm - 1] + ' ' + faNum(jy) + '</span>';
    out += '<button class="nt-nav" type="button" data-wo-month="next">›</button>';
    out += '</div>';
    out += '<div class="nt-heat-grid wo-heat-grid">';
    for (var i = 0; i < days.length; i++) {
      var d = days[i];
      var min = 0, kc = 0;
      for (var j = 0; j < all.length; j++) {
        if (!all[j] || all[j].date !== d.key) continue;
        min += Number(all[j].durationMinutes) || 0;
        kc += Number(all[j].kcalEstimated) || 0;
      }
      var level = "l0";
      if (min > 0) {
        if (min < 15) level = "l1";
        else if (min < TARGET_MIN) level = "l2";
        else if (min <= 60) level = "l3";
        else level = "l4";
      }
      var isToday = (d.key === today);
      out += '<div class="nt-heat-cell wo-heat ' + level + (isToday ? ' is-today' : '') + '" data-wo-day="' + d.key + '" title="' + d.key + ' — ' + _fa0(min) + ' دقیقه">' +
        '<span class="nt-heat-day">' + faNum(d.d) + '</span>' +
        '<span class="nt-heat-kcal">' + (min ? _fa0(min) : '') + '</span>' +
        '</div>';
    }
    out += '</div>';
    out += '<div class="nt-heat-legend">';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l0"></span>ثبت نشده</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l1"></span>کم</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l2"></span>متوسط</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l3"></span>خوب</span>';
    out += '<span class="nt-leg-item"><span class="nt-leg-dot l4"></span>عالی</span>';
    out += '</div>';
    out += _renderWorkoutLineChart(all);
    out += _renderWorkoutStats(all);
    out += '</div>';
    return out;
  }

  function _renderWorkoutLineChart(all) { /* PATCH:phase-F6-chart */
    var today = todayJalali();
    var tp = parseJalali(today); if (!tp) return '';
    var days = [];
    for (var off = 29; off >= 0; off--) {
      var k = _addDaysJKey(tp.jy, tp.jm, tp.jd, -off);
      var min = 0;
      for (var j = 0; j < all.length; j++) {
        if (all[j] && all[j].date === k) min += Number(all[j].durationMinutes) || 0;
      }
      days.push({ key: k, min: min });
    }
    var W = 320, H = 130, PAD = 8;
    var maxMin = 60;
    for (var i = 0; i < days.length; i++) if (days[i].min > maxMin) maxMin = days[i].min;
    maxMin = Math.ceil(maxMin / 30) * 30;
    var stepX = (W - PAD * 2) / (days.length - 1);
    var pts = [];
    for (var i2 = 0; i2 < days.length; i2++) {
      var x = PAD + i2 * stepX;
      var y = H - PAD - (days[i2].min / maxMin) * (H - PAD * 2);
      pts.push({ x: x, y: y, v: days[i2].min, key: days[i2].key });
    }
    var d = '';
    for (var p = 0; p < pts.length; p++) {
      if (p === 0) d += 'M ' + pts[p].x.toFixed(1) + ' ' + pts[p].y.toFixed(1);
      else {
        var x0 = pts[p-1].x, y0 = pts[p-1].y, x1 = pts[p].x, y1 = pts[p].y;
        var cx = (x0 + x1) / 2;
        d += ' C ' + cx.toFixed(1) + ' ' + y0.toFixed(1) + ' ' + cx.toFixed(1) + ' ' + y1.toFixed(1) + ' ' + x1.toFixed(1) + ' ' + y1.toFixed(1);
      }
    }
    var areaD = d + ' L ' + pts[pts.length-1].x.toFixed(1) + ' ' + (H - PAD) + ' L ' + pts[0].x.toFixed(1) + ' ' + (H - PAD) + ' Z';
    var maxY = H - PAD - (30 / maxMin) * (H - PAD * 2);
    var h = '<div class="nt-line-wrap">';
    h += '<div class="nt-line-title">۳۰ روز اخیر</div>';
    h += '<svg viewBox="0 0 ' + W + ' ' + H + '" class="nt-line-svg wo-line-svg" preserveAspectRatio="none">';
    h += '<defs><linearGradient id="woAreaGrad" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0%" stop-color="rgb(56,189,248)" stop-opacity="0.35"/>' +
         '<stop offset="100%" stop-color="rgb(56,189,248)" stop-opacity="0"/>' +
         '</linearGradient></defs>';
    h += '<line x1="' + PAD + '" y1="' + maxY.toFixed(1) + '" x2="' + (W-PAD) + '" y2="' + maxY.toFixed(1) + '" stroke="rgba(52,211,153,.45)" stroke-dasharray="4 4" stroke-width="1"/>';
    h += '<path d="' + areaD + '" fill="url(#woAreaGrad)"/>';
    h += '<path d="' + d + '" fill="none" stroke="rgb(56,189,248)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>';
    for (var q = 0; q < pts.length; q++) {
      if (pts[q].v > 0) {
        h += '<circle cx="' + pts[q].x.toFixed(1) + '" cy="' + pts[q].y.toFixed(1) + '" r="2.2" fill="rgb(56,189,248)"/>';
      }
    }
    h += '</svg>';
    h += '<div class="wo-chart-legend"><span class="wo-chart-dash"></span>هدف ۳۰ دقیقه</div>';
    h += '</div>';
    return h;
  }

  function _renderWorkoutStats(all) { /* PATCH:phase-F6-chart */
    var today = todayJalali();
    var tp = parseJalali(today); if (!tp) return '';
    var active = 0, totalMin = 0, totalKcal = 0, bestDay = null, bestMin = 0;
    for (var off = 29; off >= 0; off--) {
      var k = _addDaysJKey(tp.jy, tp.jm, tp.jd, -off);
      var dMin = 0, dKcal = 0;
      for (var j = 0; j < all.length; j++) {
        if (!all[j] || all[j].date !== k) continue;
        dMin += Number(all[j].durationMinutes) || 0;
        dKcal += Number(all[j].kcalEstimated) || 0;
      }
      if (dMin > 0) active++;
      totalMin += dMin;
      totalKcal += dKcal;
      if (dMin > bestMin) { bestMin = dMin; bestDay = k; }
    }
    var h = '<div class="nt-stats">';
    h += '<div class="nt-stat"><div class="nt-stat-v">' + _fa0(active) + '</div><div class="nt-stat-k">روز فعال</div></div>';
    h += '<div class="nt-stat"><div class="nt-stat-v">' + _fa0(totalMin) + '</div><div class="nt-stat-k">دقیقه کل</div></div>';
    h += '<div class="nt-stat"><div class="nt-stat-v">' + _fa0(Math.round(totalKcal)) + '</div><div class="nt-stat-k">کالری تخمینی</div></div>';
    h += '<div class="nt-stat"><div class="nt-stat-v">' + (bestMin > 0 ? _fa0(bestMin) : '—') + '</div><div class="nt-stat-k">بهترین روز</div></div>';
    h += '</div>';
    return h;
  } function _renderHealthTabContent(id) { /* PATCH:phase-F6-tab */
    if (id === "nutrition") return _renderNutritionTab();
    if (id === "body") return _renderBodyTab();
    if (id === "workout") return _renderWorkoutTab();
    return '<div class="coming-soon-banner"><span class="coming-soon-icon">🚧</span><div class="coming-soon-text"><strong>در حال آماده‌سازی</strong><p>این بخش برای برنامه ورزشی هفتگی، ثبت جلسات و پیگیری کالری مصرفی آماده می‌شود.</p></div></div>';
  }

    /* PATCH:phase-B1-health bridge */
  /* PATCH:phase-F7-bridge */
  function renderSleepHub() {
    try { _sleepTestBridge(); } catch (e) {}
    var R = window.InternshipResidency;
    if (R && R.sleepUI && typeof R.sleepUI.render === "function") {
      R.sleepUI.render(view);
      document.title = "خواب و استراحت — Internship OS";
      return;
    }
    view.innerHTML = '<div class="placeholder"><span class="placeholder-icon">😴</span><h2>ماژول خواب در دسترس نیست</h2></div>';
  }
  /* PATCH:phase-F7-boot-bridge — ensure bridge exists before any UI interaction */
  try { _sleepTestBridge(); } catch (e) {}
  function _sleepTestBridge() {
    if (typeof window === "undefined") return;
    if (window.__ioSleepBridge) return;
    window.__ioSleepBridge = {
      state: function () { return state; },
      save: saveState,
      notify: _notifyApp,
      escapeHtml: escapeHTML,
      fa0: _fa0, fa1: _fa1, faNum: faNum,
      todayJalali: todayJalali,
      parseJalali: parseJalali,
      prettyDate: _nutritionPrettyDate,
      addDaysJKey: _addDaysJKey,
      /* PATCH:phase-F7-v2-bridge */
      jalaliToDayNumber: function (jy,jm,jd) { try { return jalaliToDayNumber(jy,jm,jd); } catch (e) { return 0; } },
      updateBell: function () { try { _updateDashBell(); } catch (e) {} },  /* PATCH:phase-F7-bell2 */
      weekdayName: function (jy,jm,jd) { try { return weekdayName(jy,jm,jd); } catch (e) { return ""; } },
      notify: _notifyApp,
      setRoute: setRoute
    };
  }
  function _healthTestBridge() {
    if (typeof window === "undefined") return;
    window.__os = window.__os || {};
    window.__os.dashNotif = function () { try { return _dashNotificationsList(); } catch (e) { return { error: String(e && e.message || e) }; } };  /* PATCH:phase-F7-dbg */
    window.__os.dashBellRefresh = function () { try { _updateDashBell(); return "ok"; } catch (e) { return String(e); } };
    window.__os.health = {
      ensure:      _healthEnsure,
      newId:       _healthNewId,
      validDate:   _healthValidDate,
      sortDesc:    _healthSortDesc,
      lastBody:    function (s) { var h = _healthEnsure(s); if (!h || !h.bodyLog.length) return null; return _healthSortDesc(h.bodyLog)[0]; },


      applyProfile:_healthApplyProfile,
      upsertBody:  _healthUpsertBody,
      deleteBody:  _healthDeleteBody,
      HIDDEN:      ["food", "commute", "finance"],
      age:         _nutritionAge,
      bmi:         _nutritionBMI,
      weight:      _nutritionWeight,
      calcProfile: _nutritionCalcProfile,
      ree:         _nutritionREE,
      tdee:        _nutritionTDEE,
      computeTarget:_nutritionComputeTarget,
      saveTarget:  _nutritionSaveTarget,
      recalc:      _nutritionRecalc,
      macrosFromKcal:_macrosFromKcal,
      foodAdd:     _foodAdd,
      foodUpdate:  _foodUpdate,
      foodDelete:  _foodDelete,
      foodFind:    _foodFind,
      foodSearch:  _foodSearch,
      mealEnsure:  _mealEnsure,
      mealAddItem: _mealAddItem,
      mealRemoveItem:_mealRemoveItem,
      mealDelete:  _mealDelete,
      mealTotals:  _mealTotals,
      dayTotals:   _dayTotals
    };
  }  /* PATCH:phase-C-ui2 */
  /* PATCH:phase-F3-bridge */
  try { window.__ioNutritionDate = function () { return _nutritionDate(); }; } catch (e) {}
  try {
    window.__ioOpenTask = function (id) {
      try { if (typeof openTaskForm === "function") return openTaskForm(id); } catch (e) {}
      try { if (window.InternshipApp && window.InternshipApp.openTaskForm) return window.InternshipApp.openTaskForm(id); } catch (e) {}
    };
    window.__ioCompleteTask = function (id) {
      var t = (state.tasks || []).find(function (x) { return x.id === id; });
      if (!t) return;
      t.completed = true;
      t.updatedAt = Date.now();
      try { saveState(); } catch (e) {}
      try { _notifyApp("success", "«" + (t.title || "کار") + "» انجام شد"); } catch (e) {}
      try { _updateDashBell(); } catch (e) {}
      try { if (typeof route !== "undefined" && route === "dashboard") render(); } catch (e) {}
    };
  } catch (e) {}
  try {
    window.__ioMealReminder = { run: function () { try { _updateMealReminder(); } catch (e) {} }, list: function () { return _mealReminderList(); } };
    setInterval(function () { try { _updateMealReminder(); } catch (e) {} }, 60000);
  } catch (e) {}
  try {
    window.__ioFdbBridge = {
      state:        function () { return state; },
      mealEnsure: _mealEnsure,
      notify: _notifyApp,
      save: saveState,
      render: renderAreaDetail,
      escapeHtml: escapeHTML,
      fa0: _fa0,
      fa1: _fa1,
      meals: _MEALS,
      todayJalali: todayJalali,
      healthEnsure: _healthEnsure,
      __ioNutritionDate: function(){ return _nutritionDate(); }
    };
  } catch (e) { try { console.warn("[fdb-bridge]", e); } catch (x) {} }
  /* PATCH:phase-F6-wdbbridge */
  try {
    window.__ioWdbBridge = {
      notify: _notifyApp,
      save: saveState,
      render: renderAreaDetail,
      escapeHtml: escapeHTML,
      fa0: _fa0,
      fa1: _fa1,
      todayJalali: todayJalali,
      healthEnsure: _healthEnsure,
      nutritionDate: function () { return _nutritionDate(); },
      workoutDate: function () { return _workoutDate(); }, /* PATCH:phase-F6-woDate */
      lastBodyWeight: function () {
        try { var b = _healthLastBody(); return b && isFinite(b.weightKg) ? b.weightKg : null; } catch (e) { return null; }
      }
    };
  } catch (e) { try { console.warn("[wdb-bridge]", e); } catch (x) {} }
  function _wireHealthEvents() {
    /* Delegated handlers — resilient to innerHTML re-renders */
    if (view.__ioHealthWired) return;
    view.__ioHealthWired = true;
    view.addEventListener("click", function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var el;
      el = t.closest("[data-meal-add]");
      if (el) { _openMealItemModal(el.getAttribute("data-meal-add")); return; }
      el = t.closest("[data-meal-del]");
      if (el) {
        _mealRemoveItem(state, el.getAttribute("data-meal-del"), parseInt(el.getAttribute("data-item-idx"), 10));
        try { saveState(); } catch (e2) {}
        renderAreaDetail("body"); return;
      }
      el = t.closest("[data-food-edit]");
      if (el) { _openFoodForm(el.getAttribute("data-food-edit")); return; }
      el = t.closest("[data-food-del]");
      if (el) { _foodDeleteConfirm(el.getAttribute("data-food-del")); return; }
      el = t.closest("#nt-recalc");
      if (el) { _nutritionRecalcClick(); return; }
      el = t.closest("#nt-edit-macros");
      if (el) { var b = document.getElementById("nt-macro-editor"); if (b) b.hidden = !b.hidden; return; }
      el = t.closest("#nt-save-macros");
      if (el) { _nutritionSaveMacrosClick(); return; }
      el = t.closest("#nt-cancel-macros");
      if (el) { var b2 = document.getElementById("nt-macro-editor"); if (b2) b2.hidden = true; return; }
      el = t.closest("#nt-cat-add");
      if (el) { _openFoodForm(null); return; }
      el = t.closest("#hp-toggle-edit");
      if (el) { _nutritionProfileEditOpen = !_nutritionProfileEditOpen; renderAreaDetail("body"); return; }
      el = t.closest("#hp-cancel-edit");
      if (el) { _nutritionProfileEditOpen = false; renderAreaDetail("body"); return; }
      el = t.closest("[data-hb-edit]");
      if (el) { _healthEditId = el.getAttribute("data-hb-edit"); renderAreaDetail("body"); return; }
      el = t.closest("[data-hb-del]");
      if (el) { _deleteBodyMeasurement(el.getAttribute("data-hb-del")); return; }
      el = t.closest("#hp-save");
      if (el) { _saveHealthProfile(); return; }
      el = t.closest("#hb-save");
      if (el) { _saveBodyMeasurement(); return; }
      el = t.closest("#hb-cancel");
      if (el) { _healthEditId = null; renderAreaDetail("body"); return; }
      el = t.closest("[data-dash-reminder-chip]");
      if (el) {
        var _mrList = _mealReminderList();
        var _mrMeal = _mrList.length ? _mrList[0].id : "lunch";
        _healthTab = "nutrition"; _nutritionSubTab = "today"; _nutritionViewDate = null;
        renderAreaDetail("body");
        setTimeout(function () { if (window.InternshipResidency && window.InternshipResidency.fooddbUI) window.InternshipResidency.fooddbUI.open(_mrMeal); }, 250);
        return;
      }
      el = t.closest("[data-meal-db]");
      if (el) { if (window.InternshipResidency && window.InternshipResidency.fooddbUI) window.InternshipResidency.fooddbUI.open(el.getAttribute("data-meal-db")); return; }
      /* PATCH:phase-F6-wdbclick */
      el = t.closest("#wdb-open-main");
      if (el) { if (window.InternshipResidency && window.InternshipResidency.workoutdbUI) window.InternshipResidency.workoutdbUI.open({ tab: "search", focusSearch: true }); return; }
      el = t.closest("[data-nt-sub]");
      if (el) { _nutritionSubTab = el.getAttribute("data-nt-sub"); renderAreaDetail("body"); return; }      /* PATCH:phase-F6-b5 handlers */
      el = t.closest("[data-wo-sub]");
      if (el) { _workoutSubTab = el.getAttribute("data-wo-sub"); renderAreaDetail("body"); return; }
      el = t.closest("[data-wo-day-prev]");
      if (el) { _workoutShiftDay(-1); renderAreaDetail("body"); return; }
      el = t.closest("[data-wo-day-next]");
      if (el) { _workoutShiftDay(1); renderAreaDetail("body"); return; }
      el = t.closest("[data-wo-day]");
      if (el) { _workoutViewDate = el.getAttribute("data-wo-day"); _workoutSubTab = "today"; renderAreaDetail("body"); return; }
      el = t.closest("[data-wo-del]");
      if (el) {
        var _delId = el.getAttribute("data-wo-del");
        var _hh = _healthEnsure(state);
        if (_hh && Array.isArray(_hh.workoutLog)) {
          _hh.workoutLog = _hh.workoutLog.filter(function (x) { return x.id !== _delId; });
          try { saveState(); } catch (e3) {}
          try { _notifyApp("success", "جلسه حذف شد"); } catch (e3) {}
          renderAreaDetail("body");
        }
        return;
      }
      el = t.closest("[data-wo-goto-today]");
      if (el) { _workoutViewDate = null; renderAreaDetail("body"); return; }
      el = t.closest("[data-wo-month]");
      if (el) {
        var _wdir = el.getAttribute("data-wo-month");
        if (!_workoutTrendView) { var _wtp0 = parseJalali(todayJalali()); _workoutTrendView = { jy: _wtp0.jy, jm: _wtp0.jm }; }
        if (_wdir === "prev") { _workoutTrendView.jm--; if (_workoutTrendView.jm < 1) { _workoutTrendView.jm = 12; _workoutTrendView.jy--; } }
        if (_wdir === "next") { _workoutTrendView.jm++; if (_workoutTrendView.jm > 12) { _workoutTrendView.jm = 1; _workoutTrendView.jy++; } }
        renderAreaDetail("body"); return;
      }
      el = t.closest("[data-nt-day-prev]");
      if (el) { _nutritionShiftDay(-1); renderAreaDetail("body"); return; }
      el = t.closest("[data-nt-day-next]");
      if (el) { _nutritionShiftDay(1); renderAreaDetail("body"); return; }
      el = t.closest("[data-nt-day]");
      if (el) { _nutritionViewDate = el.getAttribute("data-nt-day"); _nutritionSubTab = "today"; renderAreaDetail("body"); return; }
      el = t.closest("[data-nt-goto-today]");
      if (el) { _nutritionViewDate = null; renderAreaDetail("body"); return; }
      el = t.closest("[data-nt-month]");
      if (el) {
        var dir = el.getAttribute("data-nt-month");
        if (!_trendView) { var _tp0 = parseJalali(todayJalali()); _trendView = { jy: _tp0.jy, jm: _tp0.jm }; }
        if (dir === "prev") { _trendView.jm--; if (_trendView.jm < 1) { _trendView.jm = 12; _trendView.jy--; } }
        if (dir === "next") { _trendView.jm++; if (_trendView.jm > 12) { _trendView.jm = 1; _trendView.jy++; } }
        renderAreaDetail("body"); return;
      }
    });
    view.addEventListener("input", function (e) {
      var t = e.target;
      /* food catalog removed in F.4 */
    });
  }
  var _nutritionProfileEditOpen = false;
  var _nutritionSubTab = "today";
  /* PATCH:phase-F6-b5 */
  var _workoutSubTab = "today";
  var _workoutViewDate = null;
  var _workoutTrendView = null;
  function _workoutDate() { return _workoutViewDate || todayJalali(); }
  function _workoutShiftDay(delta) {
    var base = _workoutDate();
    var p = parseJalali(base); if (!p) return;
    var next = _addDaysJKey(p.jy, p.jm, p.jd, delta);
    var todayK = todayJalali();
    if (next > todayK) next = todayK;
    _workoutViewDate = (next === todayK) ? null : next;
  }
  var _nutritionViewDate = null;  /* null = today */
  function _nutritionDate() { return _nutritionViewDate || todayJalali(); }
  function _nutritionPrettyDate(key) {
    var p = parseJalali(key); if (!p) return key;
    var months = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
    return faNum(p.jd) + " " + months[p.jm - 1];
  }
  function _nutritionShiftDay(delta) {
    var cur = _nutritionViewDate || todayJalali();
    var p = parseJalali(cur); if (!p) return;
    var y = p.jy, m = p.jm, d = p.jd + delta;
    function _len(y2, m2) { return m2 <= 6 ? 31 : (m2 <= 11 ? 30 : 29); }
    while (d < 1) { m--; if (m < 1) { m = 12; y--; } d += _len(y, m); }
    while (d > _len(y, m)) { d -= _len(y, m); m++; if (m > 12) { m = 1; y++; } }
    _nutritionViewDate = y + "/" + m + "/" + d;
  }
  var _trendView = null;
  var NT_MONTHS = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  function _healthApplyProfile(s, input) {
    var h = _healthEnsure(s);
    h.profile.birthDate = input.birthDate || null;
    h.profile.sex = input.sex || null;
    h.profile.activityLevel = input.activityLevel || null;
    h.profile.goal = input.goal || null;
    h.profile.heightCm = (typeof input.heightCm === "number" && !isNaN(input.heightCm)) ? input.heightCm : null;
    h.profile.targetWeightKg = (typeof input.targetWeightKg === "number" && !isNaN(input.targetWeightKg)) ? input.targetWeightKg : null;
    return h;
  }
  function _healthUpsertBody(s, input, editId) {
    var h = _healthEnsure(s);
    var date = input.date;
    var w = input.weightKg;
    var hgt = (typeof input.heightCm === "number" && !isNaN(input.heightCm)) ? input.heightCm : null;
    var i;
    if (editId) {
      var rec = null;
      for (i = 0; i < h.bodyLog.length; i++) { if (h.bodyLog[i].id === editId) { rec = h.bodyLog[i]; break; } }
      if (!rec) return { ok: false, err: "NOT_FOUND" };
      for (i = 0; i < h.bodyLog.length; i++) {
        if (h.bodyLog[i].id !== editId && h.bodyLog[i].date === date) return { ok: false, err: "DUPLICATE_DATE" };
      }
      rec.date = date;
      rec.weightKg = w;
      if (hgt !== null) rec.heightCm = hgt;
      if (hgt !== null) h.profile.heightCm = hgt;
      return { ok: true, mode: "edit", id: editId };
    }
    var dup = null;
    for (i = 0; i < h.bodyLog.length; i++) { if (h.bodyLog[i].date === date) { dup = h.bodyLog[i]; break; } }
    if (dup) {
      dup.weightKg = w;
      if (hgt !== null) dup.heightCm = hgt;
      if (hgt !== null) h.profile.heightCm = hgt;
      return { ok: true, mode: "update", id: dup.id };
    }
    var newId = _healthNewId();
    h.bodyLog.push({ id: newId, date: date, weightKg: w, heightCm: hgt });
    if (hgt !== null) h.profile.heightCm = hgt;
    return { ok: true, mode: "insert", id: newId };
  }
  function _healthDeleteBody(s, id) {
    var h = _healthEnsure(s);
    var before = h.bodyLog.length;
    h.bodyLog = h.bodyLog.filter(function (x) { return x.id !== id; });
    return before !== h.bodyLog.length;
  }
/* PATCH:phase-C-nutrition */
  var _NUTRITION_FACTORS = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9 };
  var _NUTRITION_DEFAULTS = {
    maintain: { delta: 0,   pPct: 25, cPct: 45, fPct: 30 },
    lose:     { delta: -500,pPct: 30, cPct: 45, fPct: 25 },
    gain:     { delta: 300, pPct: 25, cPct: 50, fPct: 25 },
    muscle:   { delta: 200, pPct: 25, cPct: 50, fPct: 25 }
  };
  function _nutritionAge(birthDate, todayKey) {
    if (!birthDate || !todayKey) return null;
    var b = parseJalali(birthDate), t = parseJalali(todayKey);
    if (!b || !t) return null;
    var age = t.jy - b.jy;
    if (t.jm < b.jm || (t.jm === b.jm && t.jd < b.jd)) age--;
    return age;
  }
  function _nutritionBMI(weightKg, heightCm) {
    if (!weightKg || !heightCm) return null;
    var m = heightCm / 100;
    return weightKg / (m * m);
  }
  function _nutritionWeight(s) {
    var h = _healthEnsure(s); if (!h || !h.bodyLog.length) return null;
    var last = _healthSortDesc(h.bodyLog)[0];
    return last ? last.weightKg : null;
  }
  function _nutritionCalcProfile(s) {
    var h = _healthEnsure(s);
    var p = h.profile;
    var today = todayJalali();
    var missing = [];
    if (!p.birthDate) missing.push("تاریخ تولد");
    if (!p.sex) missing.push("جنس");
    if (!p.heightCm) missing.push("قد");
    if (!p.activityLevel) missing.push("سطح فعالیت");
    if (!p.goal) missing.push("هدف");
    var w = _nutritionWeight(s);
    if (!w) missing.push("وزن (ثبت اندازه‌گیری)");
    var age = p.birthDate ? _nutritionAge(p.birthDate, today) : null;
    if (missing.length > 0) return { status: "incomplete", missing: missing, age: age };
    if (p.sex === "other") return { status: "no_sex_method", age: age };
    if (age !== null && age < 18) return { status: "underage", age: age };
    return { status: "ok", age: age, weightKg: w, heightCm: p.heightCm, sex: p.sex, activity: p.activityLevel, goal: p.goal };
  }
  function _nutritionREE(sex, weightKg, heightCm, ageYears) {
    if (sex === "male")   return 10 * weightKg + 6.25 * heightCm - 5 * ageYears + 5;
    if (sex === "female") return 10 * weightKg + 6.25 * heightCm - 5 * ageYears - 161;
    return null;
  }
  function _nutritionTDEE(ree, activityLevel) {
    var f = _NUTRITION_FACTORS[activityLevel];
    if (!f) return null;
    return ree * f;
  }
  function _macrosFromKcal(kcal, pPct, cPct, fPct) {
    return { p: kcal * pPct / 100 / 4, c: kcal * cPct / 100 / 4, f: kcal * fPct / 100 / 9 };
  }
  function _nutritionComputeTarget(s) {
    var info = _nutritionCalcProfile(s);
    if (info.status !== "ok") return { status: info.status, missing: info.missing, age: info.age };
    var bmi = _nutritionBMI(info.weightKg, info.heightCm);
    var ree = _nutritionREE(info.sex, info.weightKg, info.heightCm, info.age);
    var tdee = _nutritionTDEE(ree, info.activity);
    if (tdee === null) return { status: "incomplete", missing: ["سطح فعالیت"], age: info.age };
    var dft = _NUTRITION_DEFAULTS[info.goal] || _NUTRITION_DEFAULTS.maintain;
    var kcal = tdee + dft.delta;
    var status = "ok";
    var warnings = [];
    if (bmi !== null && bmi < 17.5) {
      warnings.push("شاخص توده بدنی پایین است؛ کاهش وزن خودکار پیشنهاد نمی‌شود.");
      if (info.goal === "lose") status = "needs_review";
    }
    var minSafe = info.sex === "female" ? 1200 : 1500;
    if (status === "ok" && kcal < minSafe) {
      status = "needs_review";
      warnings.push("کالری پیشنهادی زیر حد بازبینی است.");
    }
    var g = _macrosFromKcal(kcal, dft.pPct, dft.cPct, dft.fPct);
    return {
      status: status, warnings: warnings,
      ree: ree, tdee: tdee, kcal: kcal,
      pPct: dft.pPct, cPct: dft.cPct, fPct: dft.fPct,
      p: g.p, c: g.c, f: g.f,
      age: info.age, weightKg: info.weightKg, heightCm: info.heightCm, bmi: bmi
    };
  }
  function _nutritionSaveTarget(s, t) {
    var h = _healthEnsure(s);
    h.calorieTarget = {
      kcal: t.kcal, p: t.p, c: t.c, f: t.f,
      pPct: t.pPct, cPct: t.cPct, fPct: t.fPct,
      ree: t.ree || null, tdee: t.tdee || null, bmi: t.bmi || null,
      manual: !!t.manual,
      computedAt: Date.now(),
      profileSnapshot: JSON.parse(JSON.stringify(h.profile))
    };
    return h.calorieTarget;
  }
  function _nutritionRecalc(s) {
    var t = _nutritionComputeTarget(s);
    if (t.status !== "ok" && t.status !== "needs_review") return { ok: false, status: t.status, missing: t.missing };
    _nutritionSaveTarget(s, t);
    return { ok: true, target: t };
  }
  function _foodFind(s, id) {
    var h = _healthEnsure(s);
    for (var i = 0; i < h.foodCatalog.length; i++) {
      if (h.foodCatalog[i].id === id) return h.foodCatalog[i];
    }
    return null;
  }
  function _foodAdd(s, food) {
    var h = _healthEnsure(s);
    var f = {
      id: _healthNewId(), name: food.name, source: "user",
      per100: { kcal: food.kcal, p: food.p, c: food.c, f: food.f }
    };
    h.foodCatalog.push(f);
    return f;
  }
  function _foodUpdate(s, id, patch) {
    var f = _foodFind(s, id); if (!f) return false;
    if (typeof patch.name === "string") f.name = patch.name;
    if (typeof patch.kcal === "number") f.per100.kcal = patch.kcal;
    if (typeof patch.p === "number") f.per100.p = patch.p;
    if (typeof patch.c === "number") f.per100.c = patch.c;
    if (typeof patch.f === "number") f.per100.f = patch.f;
    return true;
  }
  function _foodDelete(s, id) {
    var h = _healthEnsure(s);
    var before = h.foodCatalog.length;
    h.foodCatalog = h.foodCatalog.filter(function (x) { return x.id !== id; });
    return h.foodCatalog.length < before;
  }
  function _foodSearch(s, q) {
    var h = _healthEnsure(s);
    if (!q) return h.foodCatalog.slice();
    var qq = String(q).toLowerCase();
    return h.foodCatalog.filter(function (f) { return f.name.toLowerCase().indexOf(qq) !== -1; });
  }
  function _mealByDateKind(s, date, meal) {
    var h = _healthEnsure(s);
    for (var i = 0; i < h.foodLog.length; i++) {
      if (h.foodLog[i].date === date && h.foodLog[i].meal === meal) return h.foodLog[i];
    }
    return null;
  }
  function _mealEnsure(s, date, meal) {
    var m = _mealByDateKind(s, date, meal);
    if (m) return m;
    var h = _healthEnsure(s);
    m = { id: _healthNewId(), date: date, meal: meal, items: [] };
    h.foodLog.push(m);
    return m;
  }
  function _mealAddItem(s, date, meal, foodId, grams) {
    if (!foodId) return { ok: false, err: "NO_FOOD" };
    if (typeof grams !== "number" || isNaN(grams) || grams <= 0) return { ok: false, err: "BAD_GRAMS" };
    var f = _foodFind(s, foodId);
    if (!f) return { ok: false, err: "NOT_FOUND" };
    var m = _mealEnsure(s, date, meal);
    m.items.push({
      foodId: foodId, grams: grams,
      snapshot: { name: f.name, kcal: f.per100.kcal, p: f.per100.p, c: f.per100.c, f: f.per100.f }
    });
    return { ok: true };
  }
  function _mealRemoveItem(s, mealId, itemIndex) {
    var h = _healthEnsure(s);
    for (var i = 0; i < h.foodLog.length; i++) {
      if (h.foodLog[i].id === mealId) {
        if (itemIndex < 0 || itemIndex >= h.foodLog[i].items.length) return false;
        h.foodLog[i].items.splice(itemIndex, 1);
        if (h.foodLog[i].items.length === 0) {
          h.foodLog = h.foodLog.filter(function (m) { return m.id !== mealId; });
        }
        return true;
      }
    }
    return false;
  }
  function _mealDelete(s, mealId) {
    var h = _healthEnsure(s);
    var before = h.foodLog.length;
    h.foodLog = h.foodLog.filter(function (m) { return m.id !== mealId; });
    return h.foodLog.length < before;
  }
  function _mealTotals(m) {
    var t = { kcal: 0, p: 0, c: 0, f: 0, hasUnknown: false };
    if (!m || !m.items) return t;
    for (var i = 0; i < m.items.length; i++) {
      var it = m.items[i], g = it.grams, sn = it.snapshot || {};
      if (typeof sn.kcal === "number") t.kcal += g * sn.kcal / 100; else t.hasUnknown = true;
      if (typeof sn.p === "number")    t.p    += g * sn.p    / 100; else t.hasUnknown = true;
      if (typeof sn.c === "number")    t.c    += g * sn.c    / 100; else t.hasUnknown = true;
      if (typeof sn.f === "number")    t.f    += g * sn.f    / 100; else t.hasUnknown = true;
    }
    return t;
  }
function _dayTotals(s, date) {
    var meals = _healthEnsure(s).foodLog.filter(function (m) { return m.date === date; });
    var t = { kcal: 0, p: 0, c: 0, f: 0, hasUnknown: false };
    for (var i = 0; i < meals.length; i++) {
      var mt = _mealTotals(meals[i]);
      t.kcal += mt.kcal; t.p += mt.p; t.c += mt.c; t.f += mt.f;
      if (mt.hasUnknown) t.hasUnknown = true;
    }
    return t;
  }

  function _saveHealthProfile() {
    var sex = document.getElementById("hp-sex").value || null;
    var act = document.getElementById("hp-activity").value || null;
    var goal = document.getElementById("hp-goal").value || null;
    var hRaw = document.getElementById("hp-height").value;
    var tRaw = document.getElementById("hp-target").value;
    var birth = readDatePicker("hp-birth");
    if (birth && !_healthValidDate(birth)) { _notifyApp("error", "تاریخ تولد نامعتبر است."); return; }
    var hgt = hRaw ? parseFloat(hRaw) : null;
    if (hgt !== null && (isNaN(hgt) || hgt <= 0 || hgt > 300)) { _notifyApp("error", "قد نامعتبر است."); return; }
    var tgt = tRaw ? parseFloat(tRaw) : null;
    if (tgt !== null && (isNaN(tgt) || tgt <= 0 || tgt > 500)) { _notifyApp("error", "وزن هدف نامعتبر است."); return; }
    _healthApplyProfile(state, { birthDate: birth, sex: sex, activityLevel: act, goal: goal, heightCm: hgt, targetWeightKg: tgt });
    _nutritionProfileEditOpen = false;
    try { saveState(); } catch (e) {}
    _notifyApp("success", "پروفایل ذخیره شد");
    renderAreaDetail("body");
  }
  function _saveBodyMeasurement() {
    var date = readDatePicker("hb-date");
    if (!_healthValidDate(date)) { _notifyApp("error", "تاریخ نامعتبر یا در آینده است."); return; }
    var wRaw = document.getElementById("hb-weight").value;
    var w = wRaw ? parseFloat(wRaw) : null;
    if (w === null || isNaN(w) || w <= 0 || w > 500) { _notifyApp("error", "وزن معتبر وارد کن."); return; }
    var editingId = _healthEditId;
    var res = _healthUpsertBody(state, { date: date, weightKg: w, heightCm: null }, editingId);
    if (!res.ok) {
      if (res.err === "NOT_FOUND") { _healthEditId = null; _notifyApp("error", "رکورد پیدا نشد."); return; }
      if (res.err === "DUPLICATE_DATE") { _notifyApp("error", "رکورد دیگری برای این تاریخ وجود دارد."); return; }
      _notifyApp("error", "خطای ناشناخته."); return;
    }
    _healthEditId = null;
    try { saveState(); } catch (e) {}
    _notifyApp(res.mode === "update" ? "info" : "success", res.mode === "update" ? "برای این تاریخ رکوردی بود و به‌روزرسانی شد." : (res.mode === "edit" ? "ویرایش ذخیره شد" : "اندازه‌گیری ثبت شد"));
    renderAreaDetail("body");
  }
  try { _healthTestBridge(); } catch (e) {}


  function _deleteBodyMeasurement(id) {
    var h = _healthEnsure(state);
    var rec = h.bodyLog.filter(function (x) { return x.id === id; })[0];
    if (!rec) return;
    openModal({
      title: "حذف اندازه‌گیری",
      message: "این اندازه‌گیری حذف شود؟ سایر رکوردها دست‌نخورده می‌مانند.",
      danger: true,
      confirmText: "حذف",
      onConfirm: function () {
        _healthDeleteBody(state, id);
        if (_healthEditId === id) _healthEditId = null;
        try { saveState(); } catch (e) {}
        _notifyApp("success", "حذف شد");
        renderAreaDetail("body");
      }
    });
  }
  function _wireCatalogList() {
    view.querySelectorAll("[data-food-edit]").forEach(function (el) {
      el.addEventListener("click", function () { _openFoodForm(el.getAttribute("data-food-edit")); });
    });
    view.querySelectorAll("[data-food-del]").forEach(function (el) {
      el.addEventListener("click", function () { _foodDeleteConfirm(el.getAttribute("data-food-del")); });
    });
  }
  function _nutritionRecalcClick() {
    var res = _nutritionRecalc(state);
    if (!res.ok) { _notifyApp("error", "پروفایل برای محاسبه هدف کامل نیست."); return; }
    try { saveState(); } catch (e) {}
    _notifyApp("success", "هدف کالری محاسبه و ذخیره شد.");
    renderAreaDetail("body");
  }
  function _nutritionSaveMacrosClick() {
    var pv = parseFloat(document.getElementById("nt-p").value);
    var cv = parseFloat(document.getElementById("nt-c").value);
    var fv = parseFloat(document.getElementById("nt-f").value);
    if (isNaN(pv) || isNaN(cv) || isNaN(fv)) { _notifyApp("error", "مقادیر نامعتبر."); return; }
    if (pv < 0 || cv < 0 || fv < 0) { _notifyApp("error", "درصدها نمی‌توانند منفی باشند."); return; }
    var sum = Math.round(pv + cv + fv);
    if (sum !== 100) { _notifyApp("error", "مجموع درصدها باید دقیقاً ۱۰۰ باشد. الان: " + faNum(sum)); return; }
    var h = _healthEnsure(state);
    var t = h.calorieTarget;
    if (!t) { _notifyApp("error", "هدفی ذخیره نشده."); return; }
    var g = _macrosFromKcal(t.kcal, pv, cv, fv);
    t.pPct = pv; t.cPct = cv; t.fPct = fv;
    t.p = g.p; t.c = g.c; t.f = g.f;
    t.manual = true;
    t.computedAt = Date.now();
    try { saveState(); } catch (e) {}
    _notifyApp("success", "نسبت‌ها ذخیره شد.");
    renderAreaDetail("body");
  }
  function _openFoodForm(editId) {
    var editing = editId ? _foodFind(state, editId) : null;
    var init = editing ? { name: editing.name, kcal: editing.per100.kcal, p: editing.per100.p, c: editing.per100.c, f: editing.per100.f } : { name:'', kcal:'', p:'', c:'', f:'' };
    var html = '<div class="modal" role="dialog" aria-modal="true">' +
      '<h3>' + (editing ? 'ویرایش غذا' : 'افزودن غذای جدید') + '</h3>' +
      '<div class="health-form">' +
      '<label class="health-field"><span>نام</span><input type="text" class="health-input" id="nf-name" value="' + escapeHTML(init.name) + '"></label>' +
      '<label class="health-field"><span>کالری (به ازای ۱۰۰ گرم)</span><input type="number" class="health-input" id="nf-kcal" min="0" value="' + init.kcal + '"></label>' +
      '<label class="health-field"><span>پروتئین (گرم در ۱۰۰ گرم)</span><input type="number" step="0.1" class="health-input" id="nf-p" min="0" value="' + init.p + '"></label>' +
      '<label class="health-field"><span>کربوهیدرات (گرم در ۱۰۰ گرم)</span><input type="number" step="0.1" class="health-input" id="nf-c" min="0" value="' + init.c + '"></label>' +
      '<label class="health-field"><span>چربی (گرم در ۱۰۰ گرم)</span><input type="number" step="0.1" class="health-input" id="nf-f" min="0" value="' + init.f + '"></label>' +
      '</div>' +
      '<div class="modal-actions">' +
      '<button class="btn ghost" type="button" data-close>انصراف</button>' +
      '<button class="btn primary" type="button" data-confirm>' + (editing ? 'ذخیره' : 'افزودن') + '</button>' +
      '</div></div>';
    _showCustomModal(html, function () {
      var name = document.getElementById("nf-name").value.trim();
      var k = parseFloat(document.getElementById("nf-kcal").value);
      var p = parseFloat(document.getElementById("nf-p").value);
      var cc = parseFloat(document.getElementById("nf-c").value);
      var ff = parseFloat(document.getElementById("nf-f").value);
      if (!name) { _notifyApp("error", "نام غذا را وارد کن."); return false; }
      if (isNaN(k) || k < 0) { _notifyApp("error", "کالری نامعتبر."); return false; }
      if (isNaN(p) || p < 0 || isNaN(cc) || cc < 0 || isNaN(ff) || ff < 0) { _notifyApp("error", "مقادیر درشت‌مغذی نامعتبر."); return false; }
      if (editing) {
        _foodUpdate(state, editId, { name: name, kcal: k, p: p, c: cc, f: ff });
        _notifyApp("success", "غذا ویرایش شد.");
      } else {
        _foodAdd(state, { name: name, kcal: k, p: p, c: cc, f: ff });
        _notifyApp("success", "غذا اضافه شد.");
      }
      try { saveState(); } catch (e) {}
      renderAreaDetail("body");
      return true;
    });
  }
  function _foodDeleteConfirm(id) {
    var f = _foodFind(state, id);
    if (!f) return;
    openModal({
      title: "حذف غذا",
      message: "«" + f.name + "» از کاتالوگ حذف شود؟ سوابق وعده‌های قبلی دست‌نخورده می‌ماند.",
      danger: true, confirmText: "حذف",
      onConfirm: function () {
        _foodDelete(state, id);
        try { saveState(); } catch (e) {}
        _notifyApp("success", "حذف شد.");
        renderAreaDetail("body");
      }
    });
  }
  function _showCustomModal(innerHtml, onConfirm) {
    closeModal();
    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = innerHtml;
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    var close = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.querySelector("[data-confirm]").addEventListener("click", function () {
      var ok = true;
      if (typeof onConfirm === "function") ok = onConfirm();
      if (ok !== false) close();
    });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }
  function _openMealItemModal(meal) {
    var h = _healthEnsure(state);
    var today = todayJalali();
    var mealLabel = "";
    for (var mi = 0; mi < _MEALS.length; mi++) { if (_MEALS[mi][0] === meal) mealLabel = _MEALS[mi][1]; }
    var foods = h.foodCatalog;
    var listHtml;
    if (!foods.length) {
      listHtml = '<div class="nt-cat-empty">کاتالوگ خالی است. ابتدا یک غذا اضافه کن.</div>';
    } else {
      listHtml = '<div class="nt-mitem-food-list">';
      for (var i = 0; i < foods.length; i++) {
        var f = foods[i];
        listHtml += '<label class="nt-mitem-food-opt"><input type="radio" name="nf-food" value="' + f.id + '"><span>' + escapeHTML(f.name) + '</span><span class="nt-mitem-food-kcal">' + _fa0(f.per100.kcal) + ' kcal/۱۰۰گرم</span></label>';
      }
      listHtml += '</div>';
    }
    var inner = '<div class="modal" role="dialog" aria-modal="true">' +
      '<h3>افزودن به ' + mealLabel + ' — ' + today + '</h3>' +
      listHtml +
      '<label class="health-field"><span>مقدار (گرم)</span><input type="number" step="0.1" class="health-input" id="nm-grams" min="1" value="100"></label>' +
      '<div class="modal-actions">' +
      '<button class="btn ghost" type="button" data-close>انصراف</button>' +
      '<button class="btn primary" type="button" data-confirm>افزودن</button>' +
      '</div></div>';
    _showCustomModal(inner, function () {
      var sel = document.querySelector('input[name="nf-food"]:checked');
      if (!sel) { _notifyApp("error", "یک غذا انتخاب کن."); return false; }
      var grams = parseFloat(document.getElementById("nm-grams").value);
      if (isNaN(grams) || grams <= 0) { _notifyApp("error", "مقدار معتبر وارد کن."); return false; }
      var r = _mealAddItem(state, today, meal, sel.value, grams);
      if (!r.ok) { _notifyApp("error", "خطا در افزودن."); return false; }
      try { saveState(); } catch (e) {}
      _notifyApp("success", "به " + mealLabel + " اضافه شد.");
      renderAreaDetail("body");
      return true;
    });
  }
  function _healthBannerSummary(id) {
    var h = _healthEnsure(state);
    var today = todayJalali();
    if (id === "nutrition") {
      var day = _dayTotals(state, today);
      var t = h.calorieTarget;
      var k = _fa0(day.kcal);
      if (t) return "امروز: " + k + " از " + _fa0(t.kcal) + " کالری";
      return "امروز: " + k + " کالری";
    }
    if (id === "body") {
      var last = _healthLastBody();
      if (last) return "آخرین وزن: " + _fa1(last.weightKg) + " کیلو · " + last.date;
      return "هنوز اندازه‌گیری ثبت نشده";
    }
    if (id === "workout") {
      return "به‌زودی فعال می‌شود";
    }
    return "";
  }
  function _healthBannerData(id) {
    var h = _healthEnsure(state);
    var today = todayJalali();
    if (id === "nutrition") {
      var day = _dayTotals(state, today);
      var t = h.calorieTarget;
      var target = t ? t.kcal : null;
      var pct = target ? Math.min(100, Math.round(day.kcal / target * 100)) : null;
      return {
        icon: "🍎",
        title: "تغذیه",
        big: _fa0(day.kcal),
        unit: "کالری",
        sub: target ? ("از " + _fa0(target)) : "بدون هدف",
        pct: pct,
        color: "251,191,36" /* PATCH:phase-F6-nutri4-banner */
      };
    }
    if (id === "body") {
      var last = _healthLastBody();
      var arr = _healthSortDesc(h.bodyLog);
      var trend = null;
      if (arr.length >= 2) {
        var d = arr[0].weightKg - arr[1].weightKg;
        trend = d > 0.1 ? "up" : (d < -0.1 ? "down" : "flat");
      }
      return {
        icon: "📏",
        title: "اندازه‌های بدن",
        big: last ? _fa1(last.weightKg) : "—",
        unit: "کیلوگرم",
        sub: last ? last.date : "هنوز ثبت نشده",
        pct: null,
        trend: trend,
        color: "244,114,182"
      };
    }
    /* PATCH:phase-F6-b5 workout banner */
    if (id === "workout") {
      var todayW = todayJalali();
      var allW = (h && Array.isArray(h.workoutLog)) ? h.workoutLog : [];
      var sumMinW = 0, sumKcalW = 0, cntW = 0;
      for (var wi = 0; wi < allW.length; wi++) {
        if (!allW[wi] || allW[wi].date !== todayW) continue;
        sumMinW += Number(allW[wi].durationMinutes) || 0;
        sumKcalW += Number(allW[wi].kcalEstimated) || 0;
        cntW++;
      }
      var TGT = 30;
      var pctW = (sumMinW > 0) ? Math.min(100, Math.round(sumMinW / TGT * 100)) : 0;
      var subW = (cntW > 0) ? (_fa0(Math.round(sumKcalW)) + " کالری تخمینی") : "امروز ثبت نشده";
      return {
        icon: "🏋️",
        title: "ورزش",
        big: _fa0(sumMinW),
        unit: "دقیقه",
        sub: subW,
        pct: (sumMinW > 0) ? pctW : null,
        color: "56,189,248"
      };
    }
    return {
      icon: "🏋️",
      title: "ورزش",
      big: "—",
      unit: "",
      sub: "—",
      pct: null,
      color: "56,189,248"
    };
  }
  function _mealReminderList() {
    var now = new Date();
    var nowMin = now.getHours() * 60 + now.getMinutes();
    var today = todayJalali();
    var wanted = [
      { id: "breakfast", rx: /صبحانه/, label: "صبحانه", icon: "🍳" },
      { id: "lunch",     rx: /ناهار|نهار/, label: "ناهار", icon: "🍲" },
      { id: "dinner",    rx: /شام/,   label: "شام",   icon: "🍽️" }
    ];
    function _matches(t) {
      if (!t || !t.title || !t.time) return false;
      if (t.completed || t.cancelled === true) return false;
      if (t.areaId !== "food") return false;
      var rec = t.recurrence || "none";
      if (rec === "none") return t.date === today;
      if (t.date > today) return false;
      if (rec === "daily") return true;
      var st = parseJalali(t.date), td = parseJalali(today);
      if (!st || !td) return false;
      if (rec === "weekly") {
        var a = st.jy * 365 + st.jm * 30 + st.jd;
        var b = td.jy * 365 + td.jm * 30 + td.jd;
        return ((b - a) % 7) === 0;
      }
      if (rec === "monthly") return st.jd === td.jd;
      return false;
    }
    var tasks = (state.tasks || []).filter(_matches);
    var res = [];
    for (var i = 0; i < wanted.length; i++) {
      var w = wanted[i];
      var best = null, bestMin = -1;
      for (var k = 0; k < tasks.length; k++) {
        if (!w.rx.test(tasks[k].title)) continue;
        var parts = String(tasks[k].time).split(":");
        if (parts.length !== 2) continue;
        var tMin = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
        /* grace: 5 min after meal time */
        if (nowMin < tMin + 5) continue;
        if (tMin > bestMin) { bestMin = tMin; best = tasks[k]; }
      }
      if (!best) continue;
      var mealLog = _mealByDateKind(state, today, w.id);
      if (mealLog && mealLog.items && mealLog.items.length > 0) continue;
      res.push({ id: w.id, label: w.label, icon: w.icon, time: best.time });
    }
    return res;
  }
  function _updateMealReminder() { /* deprecated — replaced by _updateDashBell */ }

function _dashNotificationsList() {
    var out = [];
    try {
      var meals = _mealReminderList();
      for (var i = 0; i < meals.length; i++) {
        out.push({
          kind: "meal", icon: meals[i].icon,
          title: meals[i].label + " ثبت نشده",
          sub: "ساعت " + meals[i].time + " گذشته",
          meal: meals[i].id
        });
      }
    } catch (e) {}
    try {
      var today = todayJalali();
      var od = (state.tasks || []).filter(function (t) { /* PATCH:phase-F7-arrow2 */
        if (!t || t.completed || t.cancelled === true || !t.date || t.date >= today) return false;
        if (t._sleepAuto) return false;
        return true;
      });
      od.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
      /* PATCH:phase-F6-b5 bell-workout */
      try {
        var nowD = new Date();
        var nowMin = nowD.getHours() * 60 + nowD.getMinutes();
        var wTasks = (state.tasks || []).filter(function (t) {
          if (!t || t.completed || t.cancelled === true) return false;
          if (t.date !== today) return false;
          if (t.areaId !== "body" && t.taskType !== "exercise") return false;
          if (!t.time) return false;
          var pp = String(t.time).split(":");
          if (pp.length !== 2) return false;
          var tm = parseInt(pp[0], 10) * 60 + parseInt(pp[1], 10);
          if (!isFinite(tm)) return false;
          return nowMin >= tm + 15;
        });
        for (var wk = 0; wk < Math.min(wTasks.length, 3); wk++) {
          var wt = wTasks[wk];
          var log = (state.health && Array.isArray(state.health.workoutLog)) ? state.health.workoutLog : [];
          var loggedToday = log.some(function (e) { return e && e.date === today; });
          if (loggedToday) break;
          out.push({
            kind: "workout", icon: "🏋️",
            title: "ورزش ثبت نشده",
            sub: (wt.title || "جلسه ورزشی") + " — ساعت " + wt.time + " گذشته",
            taskId: wt.id,            /* PATCH:phase-F6-bellfix */
            workoutTaskId: wt.id
          });
        }
      } catch (e) {}
      /* PATCH:phase-F7-bell-sleep */
      try {
        var _h = (new Date()).getHours();
        if (_h >= 6 && _h < 13) {
          if (!state.sleep) state.sleep = {};
          if (!Array.isArray(state.sleep.log)) state.sleep.log = [];
          var _todayK = todayJalali();
          var _hasNight = state.sleep.log.some(function (e) { return e && e.kind === "night" && e.date === _todayK; });
          if (!_hasNight) {
            out.push({
              kind: "sleep", icon: "🌙",
              title: "خواب دیشب ثبت نشده",
              sub: "ساعت خواب و بیداری واقعی را ثبت کن"
            });
          }
        }
      } catch (e) {}
      for (var k = 0; k < Math.min(od.length, 5); k++) {
        if (od[k].areaId === "sleep") { /* PATCH:phase-F7-belllog */
          /* skip if a sleep log already exists for that date */
          var _hasLog = (state.sleep && Array.isArray(state.sleep.log)) ? state.sleep.log.some(function(e){ return e && e.kind === "night" && e.date === od[k].date; }) : false;
          if (_hasLog) { continue; }
          out.push({
            kind: "sleep", icon: "🌙",
            title: "خواب ثبت نشده",
            sub: od[k].title + " — " + od[k].date,
            date: od[k].date,
            taskId: od[k].id
          });
        } else {
          out.push({
            kind: "task", icon: "⏰",
            title: "کار عقب‌افتاده",
            sub: od[k].title + " — " + od[k].date,
            taskId: od[k].id
          });
        }
      }
    } catch (e) {}
        try {
      /* PATCH:phase-F8-bell-project */
      var _tdP = parseJalali(todayJalali());
      if (_tdP && typeof jalaliToDayNumber === "function") {
        var _tdNum = jalaliToDayNumber(_tdP.jy, _tdP.jm, _tdP.jd);
        var _projL = (state.projects || []).filter(function (p) { return p && p.status === "active" && p.deadline; });
        for (var _pjI = 0; _pjI < _projL.length; _pjI++) {
          var _pj = _projL[_pjI];
          var _dp = parseJalali(_pj.deadline);
          if (!_dp) continue;
          var _daysLeft = jalaliToDayNumber(_dp.jy, _dp.jm, _dp.jd) - _tdNum;
          if (_daysLeft > 3) continue;
          if (_daysLeft < -30) continue;
          var _sub;
          if (_daysLeft < 0) { _sub = "مهلت گذشته: " + _pj.deadline + " — " + faNum(-_daysLeft) + " روز پیش"; }
          else if (_daysLeft === 0) { _sub = "مهلت: امروز"; }
          else { _sub = "مهلت: " + _pj.deadline + " — " + faNum(_daysLeft) + " روز"; }
          out.push({
            kind: "project-deadline", icon: "💻",
            title: "پروژه: " + _pj.title,
            sub: _sub,
            taskId: _pj.id,
            overdue: _daysLeft < 0
          });
        }
      }
    } catch (e) {}
    try {
      /* PATCH:phase-F91k-finance-reminder */
      var _FR = window.InternshipResidency && window.InternshipResidency.financeUI;
      if (_FR && typeof _FR.isDailyReminderOn === "function" && _FR.isDailyReminderOn()) {
        if (typeof _FR.hasTxnToday === "function" && !_FR.hasTxnToday()) {
          if (typeof _FR.isReminderWindowActive === "function" && _FR.isReminderWindowActive() && !(typeof _FR.isDismissedToday === "function" && _FR.isDismissedToday())) {
            out.push({
              kind: "finance-daily", icon: "💰",
              title: "ثبت تراکنش‌های امروز",
              sub: "امروز هیچ درآمد/هزینه‌ای ثبت نکردی"
            });
          }
        }
      }
    } catch (e) {}
return out;
  }

  function _dashBellHandleClick(e) {
    var el = e.target;
    if (!el || !el.closest) return;
    var actBtn = el.closest("[data-act]");
    var host = el.closest("[data-kind]");
    if (!actBtn || !host) return;
    var act = actBtn.getAttribute("data-act");
    var kind = host.getAttribute("data-kind");
    try {
      if (act === "open-meal") {
        var mealId = host.getAttribute("data-meal");
        _healthTab = "nutrition";
        _nutritionSubTab = "today";
        _nutritionViewDate = null;
        renderAreaDetail("body");
        setTimeout(function () {
          if (window.InternshipResidency && window.InternshipResidency.fooddbUI) window.InternshipResidency.fooddbUI.open(mealId);
        }, 250);
      } else if (act === "open-sleep") {
        /* PATCH:phase-F7-bellsleep */
        var _sleepDate = host.getAttribute("data-date") || null;
        try { setRoute("area-detail", "sleep"); } catch (e) {}
        setTimeout(function () {
          var _ui = window.InternshipResidency && window.InternshipResidency.sleepUI;
          if (_ui && _ui.openForm) _ui.openForm("night", _sleepDate);
        }, 260);
      } else if (act === "open-workout") {
        _healthTab = "workout";
        _workoutSubTab = "today";
        _workoutViewDate = null;
        renderAreaDetail("body");
        setTimeout(function () {
          if (window.InternshipResidency && window.InternshipResidency.workoutdbUI) window.InternshipResidency.workoutdbUI.open({ tab: "search", focusSearch: true });
        }, 250);
            } else if (act === "dismiss-finance") {
        try {
          var _FR2 = window.InternshipResidency && window.InternshipResidency.financeUI;
          if (_FR2 && typeof _FR2.dismissDailyReminder === "function") _FR2.dismissDailyReminder();
        } catch (e) {}
        try { _updateDashBell(); } catch (e) {}
      } else if (act === "open-finance") {
        try { setRoute("area-detail", "income"); } catch (e) {}
        setTimeout(function () {
          try {
            var _PU = window.InternshipResidency && window.InternshipResidency.projectsUI;
            if (_PU && typeof _PU.openTab === "function") _PU.openTab(view, "finance");
          } catch (e2) {}
        }, 140);
      } else if (act === "open-project") {
        var _bellPid = host.getAttribute("data-task");
        if (_bellPid) {
          try { setRoute("area-detail", "income"); } catch (e) {}
          setTimeout(function () {
            var _PU = window.InternshipResidency && window.InternshipResidency.projectsUI;
            if (_PU && typeof _PU.openDetail === "function") {
              try { _PU.openDetail(view, _bellPid); } catch (e2) {}
            }
          }, 140);
        }
} else if (act === "edit-task") {
        var taskId = host.getAttribute("data-task");
        if (taskId && typeof openTaskForm === "function") openTaskForm(taskId);
      } else if (act === "done-task") {
        var tid = host.getAttribute("data-task");
        if (!tid) return;
        var t = (state.tasks || []).find(function (x) { return x.id === tid; });
        if (!t) return;
        t.completed = true;
        t.updatedAt = Date.now();
        try { saveState(); } catch (e2) {}
        _notifyApp("success", "«" + (t.title || "کار") + "» انجام شد");
        _updateDashBell();
        if (typeof renderDashboard === "function" && typeof route !== "undefined" && route === "dashboard") {
          try { render(); } catch (e3) {}
        }
      }
    } catch (err) { try { console.warn("[dash-bell-click]", err); } catch (x) {} }
  }

function _updateDashBell() {
    try {
      var el = document.getElementById("io-dash-bell");
      if (!el) return;
      var list = _dashNotificationsList();
      var count = list.length;
      if (count === 0) {
        el.innerHTML = "";
        el.classList.remove("has-items");
        return;
      }
      el.classList.add("has-items");
      var html = '<button class="dash-bell-btn" type="button" aria-label="اعلان‌ها">' +
        '<span class="db-icon">🔔</span>' +
        '<span class="db-count">' + faNum(count) + '</span>' +
        '</button>';
      html += '<div class="dash-bell-drop">';
      html += '<div class="db-head"><span>🔔 اعلان‌ها</span><span class="db-head-badge">' + faNum(count) + '</span></div>';
      for (var m = 0; m < list.length; m++) {
        var it = list[m];
        var kind = it.kind;
        var attrs = 'data-kind="' + kind + '"';
        if (it.meal) attrs += ' data-meal="' + it.meal + '"';
        if (it.taskId) attrs += ' data-task="' + it.taskId + '"';
        if (it.date) attrs += ' data-date="' + it.date + '"';  /* PATCH:phase-F7-bellsleep */
        html += '<div class="db-item" ' + attrs + '>';
        html += '<span class="db-item-ic">' + it.icon + '</span>';
        html += '<div class="db-item-body"><span class="db-item-title">' + it.title + '</span><span class="db-item-sub">' + it.sub + '</span></div>';
        if (kind === "meal") {
          html += '<button class="db-act db-act-open" type="button" data-act="open-meal" title="ثبت وعده">ثبت ›</button>';
        } else if (kind === "task") {
          html += '<button class="db-act db-act-edit" type="button" data-act="edit-task" title="ویرایش">✏️</button>';
          html += '<button class="db-act db-act-done" type="button" data-act="done-task" title="انجام شد">✓</button>';
        } else if (kind === "sleep") {
          /* PATCH:phase-F7-bell-sleep */
          html += '<button class="db-act db-act-open" type="button" data-act="open-sleep" title="ثبت خواب">ثبت ›</button>';
        } else if (kind === "workout") {
          /* PATCH:phase-F6-bellfix */
          html += '<button class="db-act db-act-open" type="button" data-act="open-workout" title="ثبت جلسه">ثبت ›</button>';        } else if (kind === "project-deadline") {
          html += '<button class="db-act db-act-open" type="button" data-act="open-project" title="باز کردن">باز ›</button>';        } else if (kind === "finance-daily") {
          html += '<button class="db-act db-act-open" type="button" data-act="open-finance" title="رفتن به حسابداری">ثبت ›</button>';
          html += '<button class="db-act db-act-dismiss" type="button" data-act="dismiss-finance" title="برای امروز نشان نده">🔕</button>';
        }
        html += '</div>';
      }
      html += '</div>';
      el.innerHTML = html;
      if (!el.__wired_v2) {
        el.__wired_v2 = true;
        el.addEventListener("click", _dashBellHandleClick);
      }
    } catch (e) { try { console.warn("[dash-bell]", e); } catch (x) {} }
  }
  function _dashReminderChipHTML() { return ""; }

  function renderHealthHub() {
    _healthTestBridge();
    var area = areaById("body");
    if (!area) { view.innerHTML = ""; return; }
    var tabs = [
      { id: "workout",   label: "ورزش",          icon: "🏋️", color: "56,189,248" },
      { id: "nutrition", label: "تغذیه",         icon: "🍎", color: "52,211,153" },
      { id: "body",      label: "اندازه‌های بدن", icon: "📏", color: "244,114,182" }
    ];
    var active = tabs[0];
    for (var ti = 0; ti < tabs.length; ti++) { if (tabs[ti].id === _healthTab) active = tabs[ti]; }
    var banners = tabs.map(function (t) {
      var d = _healthBannerData(t.id);
      var cls = "health-banner health-banner-" + t.id + (t.id === active.id ? " is-active" : "");
      var pctArc = "";
      if (d.pct != null) {
        var r = 22, circ = 2 * Math.PI * r;
        var off = circ - (d.pct / 100) * circ;
        pctArc = '<div class="hb-arc-wrap">' +
          '<svg viewBox="0 0 52 52" class="hb-arc">' +
          '<circle cx="26" cy="26" r="' + r + '" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="5"/>' +
          '<circle cx="26" cy="26" r="' + r + '" fill="none" stroke="rgb(' + d.color + ')" stroke-width="5" stroke-linecap="round" stroke-dasharray="' + circ.toFixed(2) + '" stroke-dashoffset="' + circ.toFixed(2) + '" style="--target-off:' + off.toFixed(2) + '" transform="rotate(-90 26 26)" class="hb-arc-fill"/>' +
          '</svg>' +
          '<span class="hb-arc-num">' + _fa0(d.pct) + '٪</span>' +
          '</div>';
      } else {
        pctArc = '<div class="hb-arc-wrap hb-arc-empty"><span class="hb-arc-icon">' + d.icon + '</span></div>';
      }
      var trendArrow = "";
      if (d.trend === "up")   trendArrow = '<span class="hb-trend hb-trend-up">▲</span>';
      if (d.trend === "down") trendArrow = '<span class="hb-trend hb-trend-down">▼</span>';
      if (d.trend === "flat") trendArrow = '<span class="hb-trend hb-trend-flat">■</span>';
      return '<button class="' + cls + '" style="--accent:' + d.color + '" type="button" data-health-tab="' + t.id + '">' +
        '<span class="hb-pattern" aria-hidden="true"></span>' +
        '<span class="hb-left">' + pctArc + '</span>' +
        '<span class="hb-right">' +
        '<span class="hb-title">' + d.title + trendArrow + '</span>' +
        '<span class="hb-big">' + d.big + ' <span class="hb-unit">' + d.unit + '</span></span>' +
        '<span class="hb-sub">' + d.sub + '</span>' +
        '</span>' +
        '<span class="hb-arrow">›</span>' +
        '</button>';
    }).join("");
    view.innerHTML = [
      '<div class="area-detail">',
      '  <button class="area-detail-back" type="button" data-nav="dashboard">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '      <line x1="5" y1="12" x2="19" y2="12"/>',
      '      <polyline points="12 5 19 12 12 19"/>',
      '    </svg>بازگشت',
      '  </button>',
      '  <div class="health-hero" style="--accent:' + (area.accent || "56,189,248") + '">',
      '    <div class="health-hero-icon">' + area.icon + '</div>',
      '    <div class="health-hero-text">',
      '      <div class="health-hero-en">' + (area.subtitle || "") + '</div>',
      '      <h2 class="health-hero-title">' + escapeHTML(area.title) + '</h2>',
      '    </div>',
      '  </div>',
      '  <div class="health-banners">' + banners + '</div>',
      '  <div class="health-content-wrap">' + _renderHealthTabContent(active.id) + '</div>',
      '</div>'
    ].join("\n");
    document.title = area.title + " — Internship OS";
    view.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () { setRoute(el.dataset.nav); });
    });
    view.querySelectorAll("[data-health-tab]").forEach(function (el) {
      el.addEventListener("click", function () { _healthTab = el.dataset.healthTab; renderAreaDetail("body"); });
    });
    _wireHealthEvents();
  }
  function renderLifeDomainPage(areaId) {
    var area = areaById(areaId);
    if (!area) { view.innerHTML = ""; return; }
    var descs = {
      sleep:  "برنامه خواب شبانه، تنظیم چرت روزانه و مشاهده آمار خواب در این بخش آماده می‌شود.",
      income: "پروژه‌ها، وظایف مرتبط، درآمد و گزارش مالی در این بخش آماده می‌شود.",
      life:   "فیلم، کتاب، قرارها، سفر و فعالیت‌های اجتماعی در این بخش آماده می‌شود."
    };
    view.innerHTML = [
      '<div class="area-detail">',
      '  <button class="area-detail-back" type="button" data-nav="dashboard">',
      '    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">',
      '      <line x1="5" y1="12" x2="19" y2="12"/>',
      '      <polyline points="12 5 19 12 12 19"/>',
      '    </svg>',
      '    بازگشت',
      '  </button>',
      '  <div class="area-detail-hero" style="--accent:' + area.accent + '">',
      '    <div class="area-detail-hero-icon">' + area.icon + '</div>',
      '    <div class="area-detail-hero-text">',
      '      <div class="area-detail-hero-en">' + (area.subtitle || "") + '</div>',
      '      <h2 class="area-detail-hero-title">' + escapeHTML(area.title) + '</h2>',
      '      <p class="area-detail-hero-desc">' + escapeHTML(area.desc || "") + '</p>',
      '    </div>',
      '  </div>',
      '  <div class="coming-soon-banner">',
      '    <span class="coming-soon-icon">🚧</span>',
      '    <div class="coming-soon-text">',
      '      <strong>در حال آماده‌سازی</strong>',
      '      <p>' + (descs[areaId] || "این بخش در حال آماده‌سازی است.") + '</p>',
      '    </div>',
      '  </div>',
      '</div>'
    ].join("\n");
    document.title = area.title + " — Internship OS";
    view.querySelectorAll("[data-nav]").forEach(function (el) {
      el.addEventListener("click", function () { setRoute(el.dataset.nav); });
    });
  }
  function renderLifeHub() {
    try { _lifeTestBridge(); } catch (e) {}
    var R2 = window.InternshipResidency;
    if (R2 && R2.lifeUI && typeof R2.lifeUI.render === "function") {
      R2.lifeUI.render(view);
      document.title = "زندگی و تفریح — Internship OS";
      return;
    }
    view.innerHTML = '<div class="placeholder"><span class="placeholder-icon">🎬</span><h2>ماژول زندگی در دسترس نیست</h2></div>';
  }
  function renderProjectsHub() {
    try { _projectsTestBridge(); } catch (e) {}
    try { _financeTestBridge(); } catch (e) { console.warn("[finance-bridge-boot]", e && e.message); }
    try { _lifeTestBridge(); } catch (e) { console.warn("[life-bridge-boot]", e && e.message); }
    var R2 = window.InternshipResidency;
    if (R2 && R2.projectsUI && typeof R2.projectsUI.render === "function") {
      R2.projectsUI.render(view);
      document.title = "پروژه‌ها و حسابداری — Internship OS";
      return;
    }
    view.innerHTML = '<div class="placeholder"><span class="placeholder-icon">📋</span><h2>ماژول پروژه‌ها در دسترس نیست</h2></div>';
  }
  function renderAreaDetail(areaId) {
    if (areaId === "body") { renderHealthHub(); return; }
    /* PATCH:phase-F7-route */
    if (areaId === "sleep") { renderSleepHub(); return; }
    if (areaId === "income") { renderProjectsHub(); return; }
    if (areaId === "life") { renderLifeHub(); return; } /* PATCH:phase-F10-route */
    const area = areaById(areaId);
    if (!area) {
      view.innerHTML = `<div class="placeholder"><span class="placeholder-icon">❓</span><h2>بخش پیدا نشد</h2></div>`;
      return;
    }
    const p = areaProgress(area.id);
    const totalTasks = state.tasks.filter((t) => t.areaId === areaId).length;
    const doneTasks = state.tasks.filter((t) => t.areaId === areaId && t.completed).length;
    const structure = (DATA.lifeAreasStructure || {}).areas || {};
    const areaStruct = structure[areaId];
    const isComingSoon = COMING_SOON_AREAS.indexOf(areaId) !== -1;

    const comingSoonHTML = isComingSoon ? `
      <div class="coming-soon-banner">
        <span class="coming-soon-icon">🚧</span>
        <div class="coming-soon-text">
          <strong>به زودی در آپدیت‌های بعدی</strong>
          <p>این بخش هنوز کامل نشده. ساختار پیشنهادی زیر نمایش داده می‌شود تا با کلیات آشنا بشی.</p>
        </div>
      </div>
    ` : "";

    view.innerHTML = `
      <div class="area-detail">
        <button class="area-detail-back" type="button" data-nav="dashboard">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          بازگشت
        </button>
        <div class="area-detail-hero" style="--accent:${area.accent}">
          <div class="area-detail-hero-icon">${area.icon}</div>
          <div class="area-detail-hero-text">
            <div class="area-detail-hero-en">${area.subtitle}</div>
            <h2 class="area-detail-hero-title">${escapeHTML(area.title)}</h2>
            <p class="area-detail-hero-desc">${escapeHTML(area.desc)}</p>
          </div>
          <div class="area-detail-hero-pct">${faNum(p)}٪</div>
        </div>
        ${comingSoonHTML}
        <div class="area-detail-stats">
          <div class="area-detail-stat">
            <span class="area-detail-stat-num">${faNum(totalTasks)}</span>
            <span class="area-detail-stat-label">تسک</span>
          </div>
          <div class="area-detail-stat">
            <span class="area-detail-stat-num">${faNum(doneTasks)}</span>
            <span class="area-detail-stat-label">انجام‌شده</span>
          </div>
          <div class="area-detail-stat">
            <span class="area-detail-stat-num">${faNum(areaStruct ? areaStruct.categories.length : 0)}</span>
            <span class="area-detail-stat-label">دسته</span>
          </div>
        </div>
        <h3 class="section-heading">ساختار پیشنهادی</h3>
        ${renderAreaStructureHTML(areaId)}
      </div>
    `;
    document.title = area.title + " — Internship OS";
    view.querySelectorAll("[data-nav]").forEach((el) => {
      el.addEventListener("click", () => setRoute(el.dataset.nav));
    });
  }

  /* ╔═══ [PATCH:content-engine] ═══╗ */
  /* موتور عمومی Content — Study / Emergency / Procedures */

    /* ═══ Study Together V1 (external module) ═══ */
  function renderStudyTogether() {
    var R = window.InternshipResidency;
    if (!R || !R.studyTogether || typeof R.studyTogether.open !== "function") {
      view.innerHTML = '<div class="placeholder"><span class="placeholder-icon">👥</span><h2>ماژول هم‌مطالعه در دسترس نیست</h2></div>';
      return;
    }
    _studyTogetherBridge();
    try { R.studyTogether.open(view); } catch (e) {
      view.innerHTML = '<div class="placeholder"><span class="placeholder-icon">⚠️</span><h2>خطا در بارگذاری هم‌مطالعه</h2><p>' + escapeHTML(String(e && e.message || e)) + '</p></div>';
    }
    document.title = "هم‌مطالعه — Internship OS";
  }
  function _studyTogetherBridge() {
    if (window.__ioStudyTogetherBridge) return;
    window.__ioStudyTogetherBridge = {
      state: function () { return state; },
      notify: _notifyApp,
      escapeHtml: escapeHTML,
      fa0: _fa0,
      fa1: _fa1,
      faNum: faNum,
      todayJalali: todayJalali,
      setRoute: setRoute,
      getCurrentActivity: _stGetCurrentActivity
    };
  }
  function _stGetCurrentActivity() {
    try {
      var R = window.InternshipResidency;
      if (!R || !R.schedulingProjection || typeof R.schedulingProjection.projectDate !== "function") return null;
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      if (!s) return null;
      var today = todayJalali();
      var items = R.schedulingProjection.projectDate(s, today, {}) || [];
      var now = new Date();
      var nowMin = now.getHours() * 60 + now.getMinutes();
      for (var i = 0; i < items.length; i++) {
        var it = items[i];
        if (!it || !it.startTime || !it.durationMinutes) continue;
        var p = String(it.startTime).split(":");
        if (p.length !== 2) continue;
        var hh = parseInt(p[0], 10), mm = parseInt(p[1], 10);
        if (!isFinite(hh) || !isFinite(mm)) continue;
        var st = hh * 60 + mm;
        var en = st + it.durationMinutes;
        if (nowMin >= st && nowMin < en) {
          return { title: it.title || "", sourceType: it.sourceType || "", role: it.role || "" };
        }
      }
      return null;
    } catch (e) { return null; }
  }
function contentRefId(areaId, sourceType, sourceId) {
    return areaId + "::" + sourceType + "::" + sourceId;
  }

  function isContentInProgram(areaId, sourceType, sourceId) {
    if (!Array.isArray(state.programContent)) return false;
    return state.programContent.some((p) =>
      p && p.areaId === areaId &&
      p.sourceType === sourceType &&
      p.sourceId === sourceId
    );
  }

  function getProgramContent(areaId) {
    if (!Array.isArray(state.programContent)) return [];
    return state.programContent.filter((p) =>
      p && p.active !== false && (!areaId || p.areaId === areaId)
    );
  }

  function addContentToProgram(areaId, sourceType, sourceId, meta) {
    if (!Array.isArray(state.programContent)) state.programContent = [];
    if (isContentInProgram(areaId, sourceType, sourceId)) return false;
    const now = Date.now();
    const id = _mkId("pc");
    state.programContent.push({
      id,
      areaId,
      sourceType,
      sourceId,
      title: (meta && meta.title) ? meta.title : "",
      addedAt: todayJalali(),
      active: true
    });
    saveState();
    return true;
  }

  function removeContentFromProgram(areaId, sourceType, sourceId) {
    if (!Array.isArray(state.programContent)) return false;
    const before = state.programContent.length;
    state.programContent = state.programContent.filter((p) =>
      !(p && p.areaId === areaId && p.sourceType === sourceType && p.sourceId === sourceId)
    );
    if (state.programContent.length !== before) {
      saveState();
      return true;
    }
    return false;
  }

  function addAllContentToProgram(areaId, items) {
    let added = 0;
    (items || []).forEach((it) => {
      if (addContentToProgram(areaId, it.sourceType, it.sourceId, { title: it.title })) added++;
    });
    return added;
  }

  function createTaskFromContent(contentRef, taskData) {
    const now = Date.now();
    const id = _mkId("t");
    state.tasks.push({
      id,
      title: (taskData && taskData.title) || contentRef.title || "کار",
      areaId: contentRef.areaId,
      date: taskData.date,
      time: (taskData && taskData.time) || "",
      durationMinutes: (taskData && typeof taskData.durationMinutes === "number")
        ? taskData.durationMinutes
        : null,
      priority: (taskData && taskData.priority) || "normal",
      recurrence: "none",
      description: (taskData && taskData.description) || "",
      completed: false,
      sourceType: contentRef.sourceType,
      sourceId: contentRef.sourceId,
      taskType: (taskData && taskData.taskType) || "study",
      createdAt: now,
      updatedAt: now
    });
    saveState();
    try {
      var _rtTask = state.tasks[state.tasks.length - 1];
      var _rtN = window.InternshipResidency && window.InternshipResidency.replanTrigger;
      if (_rtTask && _rtN && _rtN.notifyTaskChange) _rtN.notifyTaskChange(_rtTask, "task_added");
    } catch (e) { console.warn("[25.1 createTaskFromContent]", e); }
    return id;
  }

  function countTasksForContent(areaId, sourceType, sourceId) {
    return (state.tasks || []).filter((t) =>
      t && t.sourceType === sourceType && t.sourceId === sourceId
    ).length;
  }

  /* ╚═══ [/PATCH:content-engine] ═══╝ */

  /* ╔═══ [PATCH:proposed-content-ui] ═══╗ */

  function contentIdFor(areaId, path) {
    return areaId + "." + path.join(".");
  }

  function getProposedContentItems(areaId) {
    const structure = (DATA.lifeAreasStructure || {}).areas || {};
    const areaStruct = structure[areaId];
    if (!areaStruct || !Array.isArray(areaStruct.categories)) return [];
    const items = [];
    areaStruct.categories.forEach((cat, ci) => {
      const subs = Array.isArray(cat.subcategories) ? cat.subcategories : [];
      subs.forEach((sub, si) => {
        const subItems = Array.isArray(sub.items) ? sub.items : [];
        if (subItems.length > 0) {
          subItems.forEach((it, ii) => {
            items.push({
              path: [ci, si, ii],
              categoryIndex: ci,
              categoryTitle: cat.title,
              subcategoryTitle: sub.title,
              title: it.title,
              sourceId: contentIdFor(areaId, [ci, si, ii]),
              sourceType: areaId + "_default"
            });
          });
        } else {
          items.push({
            path: [ci, si],
            categoryIndex: ci,
            categoryTitle: cat.title,
            subcategoryTitle: "",
            title: sub.title,
            sourceId: contentIdFor(areaId, [ci, si]),
            sourceType: areaId + "_default"
          });
        }
      });
    });
    return items;
  }

  /* ─── Search helpers ─── */
  function normalizeSearch(s) {
    if (!s) return "";
    return String(s)
      .toLowerCase()
      .replace(/[يى]/g, "ی")
      .replace(/[كک]/g, "ک")
      .replace(/[ۀهة]/g, "ه")
      .replace(/[\u064B-\u0652]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function highlightSearchMatch(text, query) {
    if (!query) return escapeHTML(text);
    const nText = normalizeSearch(text);
    const nQuery = normalizeSearch(query);
    if (!nQuery) return escapeHTML(text);

    // ─── موقعیت رو توی متن نرمال پیدا کن و معادلش رو توی متن اصلی مپ کن ───
    // روش ساده: از regex استفاده می‌کنیم که خودش عربی/فارسی رو یکی می‌کنه
    try {
      const esc = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const pattern = esc
        .replace(/ی/g, "[یي]")
        .replace(/ک/g, "[کك]")
        .replace(/ه/g, "[هۀة]");
      const re = new RegExp("(" + pattern + ")", "gi");
      return escapeHTML(text).replace(re, '<mark class="content-search-hl">$1</mark>');
    } catch (e) {
      return escapeHTML(text);
    }
  }

  function matchesSearch(item, query) {
    if (!query) return true;
    const nq = normalizeSearch(query);
    if (!nq) return true;
    const fields = [
      item.title || "",
      item.categoryTitle || "",
      item.subcategoryTitle || ""
    ];
    return fields.some((f) => normalizeSearch(f).indexOf(nq) !== -1);
  }

  function renderContentSearchHTML(areaId, resultCount, totalCount) {
    const q = _contentSearch[areaId] || "";
    const countHTML = q
      ? `<span class="content-search-count">${faNum(resultCount)} از ${faNum(totalCount)}</span>`
      : "";
    return `<div class="content-search-wrap">
      <div class="content-search-field">
        <input type="text" class="content-search-input" 
               id="content-search-${areaId}"
               placeholder="جستجو در محتوا..."
               autocomplete="off"
               value="${escapeHTML(q)}">
        <span class="content-search-icon">🔍</span>
        <button type="button" class="content-search-clear" data-search-clear="${areaId}" title="پاک کردن">✕</button>
      </div>
      ${countHTML}
    </div>`;
  }

  function wireContentSearch(areaId, renderFn) {
    const input = document.getElementById("content-search-" + areaId);
    if (!input) return;

    // ─── حفظ focus و position ───
    const savedPos = _contentSearch[areaId + "_cursorPos"];
    setTimeout(() => {
      if (savedPos === undefined) return;
      input.focus();
      try { input.setSelectionRange(savedPos, savedPos); } catch (e) {}
    }, 0);

    let debounceTimer = null;
    input.addEventListener("input", () => {
      _contentSearch[areaId + "_cursorPos"] = input.selectionStart;
      const val = input.value;
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        _contentSearch[areaId] = val;
        renderFn();
      }, 180);
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        _contentSearch[areaId] = "";
        _contentSearch[areaId + "_cursorPos"] = 0;
        renderFn();
      }
    });

    const clearBtn = document.querySelector(`[data-search-clear="${areaId}"]`);
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        _contentSearch[areaId] = "";
        _contentSearch[areaId + "_cursorPos"] = 0;
        renderFn();
      });
    }
  }
  function renderProposedContentHTML(areaId, searchQuery) {
    const structure = (DATA.lifeAreasStructure || {}).areas || {};
    const areaStruct = structure[areaId];
    if (!areaStruct || !Array.isArray(areaStruct.categories) || areaStruct.categories.length === 0) {
      return "<div class=\"proposed-empty\">ساختاری برای این بخش تعریف نشده.</div>";
    }
    const sourceType = areaId + "_default";
    let allItems = getProposedContentItems(areaId);

    if (searchQuery) {
      allItems = allItems.filter((it) => matchesSearch(it, searchQuery));
    }

    const CAT_TINTS = [
      "45, 212, 191", "129, 140, 248", "244, 114, 182", "251, 191, 36",
      "52, 211, 153", "167, 139, 250", "56, 189, 248", "251, 113, 133",
      "34, 197, 94", "239, 68, 68"
    ];

    const catBlocks = areaStruct.categories.map((cat, ci) => {
      const catItems = allItems.filter((it) => it.categoryIndex === ci);
      if (catItems.length === 0) return "";

      const tint = cat.accent || CAT_TINTS[ci % CAT_TINTS.length];
      const icon = cat.icon || "📌";

      const bySub = new Map();
      catItems.forEach((it) => {
        const key = it.subcategoryTitle || "";
        if (!bySub.has(key)) bySub.set(key, []);
        bySub.get(key).push(it);
      });

      const subsHTML = Array.from(bySub.entries()).map(([subTitle, items]) => {
        const itemsHTML = items.map((it) => {
          const inProgram = isContentInProgram(areaId, sourceType, it.sourceId);
          const taskCount = countTasksForContent(areaId, sourceType, it.sourceId);
          const taskBadge = taskCount > 0
            ? `<span class="proposed-task-badge">${faNum(taskCount)} تسک</span>`
            : "";
          let actions;
          if (inProgram) {
            actions = `<span class="proposed-status">✓ در برنامه</span>
              <button class="proposed-mini-btn" type="button" data-content-task 
                data-area="${areaId}" data-source-type="${sourceType}" data-source-id="${it.sourceId}" 
                data-title="${escapeHTML(it.title)}" title="ایجاد تسک">📝</button>
              <button class="proposed-mini-btn proposed-mini-remove" type="button" data-content-remove 
                data-area="${areaId}" data-source-type="${sourceType}" data-source-id="${it.sourceId}" 
                title="حذف از برنامه">✕</button>`;
          } else {
            actions = `<button class="proposed-add-btn" type="button" data-content-add 
              data-area="${areaId}" data-source-type="${sourceType}" data-source-id="${it.sourceId}" 
              data-title="${escapeHTML(it.title)}">➕ افزودن</button>`;
          }
          const titleHTML = searchQuery
            ? highlightSearchMatch(it.title, searchQuery)
            : escapeHTML(it.title);
          return `<li class="proposed-sub ${inProgram ? "is-in" : ""}">
            <span class="proposed-sub-bullet">◆</span>
            <span class="proposed-sub-title">${titleHTML}</span>
            ${taskBadge}
            <span class="proposed-sub-actions">${actions}</span>
          </li>`;
        }).join("");

        const groupHeader = subTitle
          ? `<div class="proposed-subgroup-head">${escapeHTML(subTitle)}<span class="proposed-subgroup-count">${faNum(items.length)}</span></div>`
          : "";

        return `<div class="proposed-subgroup">${groupHeader}<ul class="proposed-subs">${itemsHTML}</ul></div>`;
      }).join("");

      const total = catItems.length;
      const inProgramCount = catItems.filter((it) => isContentInProgram(areaId, sourceType, it.sourceId)).length;
      const allIn = total > 0 && inProgramCount === total;
      const addAllBtn = allIn
        ? `<span class="proposed-all-done">✓ همه اضافه شده</span>`
        : `<button class="proposed-all-btn" type="button" data-content-add-all 
            data-area="${areaId}" data-cat-idx="${ci}">➕ افزودن همه</button>`;

      return `<div class="proposed-cat" style="--cat-tint:${tint};">
        <div class="proposed-cat-head">
          <span class="proposed-cat-icon" style="background:rgba(${tint},.16);border:1px solid rgba(${tint},.35);">${icon}</span>
          <div class="proposed-cat-titles">
            <span class="proposed-cat-title">${escapeHTML(cat.title)}</span>
            <span class="proposed-cat-meta">${faNum(inProgramCount)} از ${faNum(total)} در برنامه</span>
          </div>
          ${addAllBtn}
        </div>
        <div class="proposed-cat-body">${subsHTML}</div>
      </div>`;
    });

    const col1 = [];
    const col2 = [];
    let h1 = 0;
    let h2 = 0;
    areaStruct.categories.forEach((cat, ci) => {
      const catItems = allItems.filter((it) => it.categoryIndex === ci);
      if (catItems.length === 0) return;
      const weight = catItems.length + 2;
      if (h1 <= h2) { col1.push(catBlocks[ci] || ""); h1 += weight; }
      else { col2.push(catBlocks[ci] || ""); h2 += weight; }
    });

    if (col1.length === 0 && col2.length === 0) {
      return `<div class="content-search-empty">
        <span class="content-search-empty-icon">🔍</span>
        نتیجه‌ای برای «${escapeHTML(searchQuery || "")}» پیدا نشد.
      </div>`;
    }

    return `<div class="proposed-grid">
      <div class="proposed-col">${col1.join("")}</div>
      <div class="proposed-col">${col2.join("")}</div>
    </div>`;
  }

  function wireProposedContentEvents(areaId) {
    const ar = areaId || "study";
    const refresh = () => refreshAreaView(ar);

    document.querySelectorAll("[data-content-add]").forEach((btn) => {
      if (btn.dataset.area !== ar) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const area = btn.dataset.area;
        const st = btn.dataset.sourceType;
        const sid = btn.dataset.sourceId;
        const title = btn.dataset.title;
        if (addContentToProgram(area, st, sid, { title: title })) {
          toast("«" + title + "» به برنامه اضافه شد");
          refresh();
        }
      });
    });

    document.querySelectorAll("[data-content-remove]").forEach((btn) => {
      if (btn.dataset.area !== ar) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (removeContentFromProgram(btn.dataset.area, btn.dataset.sourceType, btn.dataset.sourceId)) {
          toast("از برنامه حذف شد");
          refresh();
        }
      });
    });

    document.querySelectorAll("[data-content-add-all]").forEach((btn) => {
      if (btn.dataset.area !== ar) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const area = btn.dataset.area;
        const catIdx = parseInt(btn.dataset.catIdx, 10);
        const items = getProposedContentItems(area).filter((it) => it.categoryIndex === catIdx);
        const added = addAllContentToProgram(area, items);
        if (added > 0) {
          toast(faNum(added) + " مورد به برنامه اضافه شد");
          refresh();
        } else {
          toast("همه از قبل در برنامه بودند", "error");
        }
      });
    });

    document.querySelectorAll("[data-content-task]").forEach((btn) => {
      if (btn.dataset.area !== ar) return;
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        openContentTaskModal({
          areaId: btn.dataset.area,
          sourceType: btn.dataset.sourceType,
          sourceId: btn.dataset.sourceId,
          title: btn.dataset.title
        }, refresh);
      });
    });
  }

  function openContentTaskModal(contentRef, onDone) {
    const t = parseJalali(todayJalali());
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>📝 ایجاد تسک از محتوا</h3>
        <p style="margin:0 0 16px;font-size:12.5px;color:var(--text-muted)">
          محتوا: <strong style="color:var(--text)">${escapeHTML(contentRef.title)}</strong>
        </p>
        <div class="form-row">
          <label for="ctm-title">عنوان تسک *</label>
          <input type="text" id="ctm-title" autocomplete="off" value="مطالعه: ${escapeHTML(contentRef.title)}">
        </div>
        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("ctm", t.jy, t.jm, t.jd)}
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="ctm-time">ساعت شروع</label>
            <input type="text" id="ctm-time" placeholder="08:30" autocomplete="off">
          </div>
          <div class="form-row">
            <label for="ctm-dur">مدت (دقیقه)</label>
            <input type="number" id="ctm-dur" min="5" max="600" step="5" placeholder="60" style="direction:ltr;text-align:start">
          </div>
        </div>
        <div class="modal-actions">

          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>ایجاد تسک</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    const m = overlay.querySelector("#ctm-month");
    const y = overlay.querySelector("#ctm-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("ctm"));
    if (y) y.addEventListener("change", () => refreshDatePicker("ctm"));
    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#ctm-title"); if (i) i.select(); }, 60);
    const submit = () => {
      const title = overlay.querySelector("#ctm-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const date = readDatePicker("ctm");
      const time = overlay.querySelector("#ctm-time").value.trim();
      const durationMinutes = InternshipPickers.duration.read("ctm");
      // ─── Phase 27.2: HARD conflict block (new engine) ───
      try {
        var _R27 = window.InternshipResidency;
        var _SP27 = _R27 && _R27.schedulingProjection;
        var _CF27 = _R27 && _R27.schedulingConflict;
        if (_SP27 && _CF27 && _CF27.detectPair) {
          var _existing = (_SP27.projectDate && _SP27.projectDate(state, date, {})) || [];
          var _excludeSourceId = isEdit ? task.id : null;
          _existing = _existing.filter(function (x) {
            if (!_excludeSourceId) return true;
            return !(x.sourceType === "task" && x.sourceId === _excludeSourceId);
          });
          var _hStart = time || null;
          var _hDur = (typeof durationMinutes === "number" && durationMinutes > 0) ? durationMinutes : null;
          var _hEnd = null;
          if (_hStart && _hDur) {
            var _hm = String(_hStart).split(":");
            if (_hm.length === 2) {
              var _sm = parseInt(_hm[0], 10) * 60 + parseInt(_hm[1], 10);
              var _em = _sm + _hDur;
              var _eh = Math.floor(_em / 60) % 24;
              var _emm = _em % 60;
              _hEnd = (_eh < 10 ? "0" : "") + _eh + ":" + (_emm < 10 ? "0" : "") + _emm;
            }
          }
          if (_hStart && _hDur && _hEnd) {
            var _hypo = {
              id: "hypo:task",
              sourceType: "task",
              sourceId: _excludeSourceId || "__new__",
              title: title,
              category: areaId || "",
              date: date,
              startTime: _hStart,
              endTime: _hEnd,
              durationMinutes: _hDur,
              role: "block",
              status: "pending",
              context: null
            };
            var _hasHard = false;
            var _clashTitle = "";
            var _clashTime = "";
            for (var _i = 0; _i < _existing.length; _i++) {
              var _c = _CF27.detectPair(_hypo, _existing[_i], {});
              if (_c && _c.policy === "HARD") {
                _hasHard = true;
                _clashTitle = _existing[_i].title || "فعالیت بدون عنوان";
                _clashTime = (_existing[_i].startTime || "") + (_existing[_i].endTime ? "–" + _existing[_i].endTime : "");
                break;
              }
            }
            if (_hasHard) {
              var _msg = "⛔ تداخل زمانی با: «" + _clashTitle + "»";
              if (_clashTime) _msg += " (" + _clashTime + ")";
              _msg += " — لطفاً زمان دیگری انتخاب کن.";
              toast(_msg, "error");
              return;
            }
          }
        }
      } catch (e) { console.warn("[27.2 hard-conflict]", e); }

      const taskType = contentRef.areaId === "procedures" ? "skill" : "study";
      createTaskFromContent(contentRef, { title: title, date: date, time: time, durationMinutes: durationMinutes, taskType: taskType });
      close();
      if (typeof onDone === "function") onDone();
      toast("تسک ایجاد شد");
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#ctm-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  /* ╚═══ [/PATCH:proposed-content-ui] ═══╝ */

  /* ─── Calendar ─────────────────────────────────────────── */

  let calView = null;
  let calSelected = null;

  function initCalendarView() {
    if (calView && calSelected) return;
    const t = parseJalali(todayJalali());
    if (!calView)     calView     = { jy: t.jy, jm: t.jm };
    if (!calSelected) calSelected = { jy: t.jy, jm: t.jm, jd: t.jd };
  }

   function tasksOnDate(jy, jm, jd) { /* PATCH:phase-F7-merge5 */
    var _sch = state.sleep && state.sleep.schedule && state.sleep.schedule.night;
    var _eveDur = 0;
    if (_sch && _sch.bedTime) {
      var _bp = String(_sch.bedTime).split(":");
      _eveDur = 1440 - (parseInt(_bp[0],10)*60 + parseInt(_bp[1],10));
    }
    return state.tasks.filter((t) => {
      if (!t) return false;
      if (t.cancelled === true) return false;   /* [PATCH:issue-104] */
      if (t._sleepAuto === "night:evening") return false;
      const p = parseJalali(t.date);
      return p && p.jy === jy && p.jm === jm && p.jd === jd;
    }).map((t) => {
      if (t._sleepAuto === "night:morning" && _sch && _sch.bedTime) {
        const m = Object.assign({}, t);
        m.time = _sch.bedTime;
        m.durationMinutes = (t.durationMinutes || 0) + _eveDur;
        return m;
      }
      return t;
    });
  }

  function renderCalendar() {
    initCalendarView();
    const { jy, jm } = calView;
    const monthLen = jalaliMonthLength(jy, jm);
    const startWeekday = jalaliMonthStartWeekday(jy, jm);
    const today = todayJalali();

    const cells = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= monthLen; d++) cells.push(d);

    view.innerHTML = `
      <div class="cal-layout">
      <div class="cal-layout-main">
      <section class="calendar">
        <div class="cal-head">
          <button class="cal-nav" data-cal-prev type="button" aria-label="ماه قبل">‹</button>
          <div class="cal-title">
            <div class="cal-month">${JMONTHS[jm - 1]} ${faNum(jy)}</div>
            <button class="cal-today-btn" data-cal-today type="button">امروز</button>
          </div>
          <button class="cal-nav" data-cal-next type="button" aria-label="ماه بعد">›</button>
        </div>
        <div class="cal-weekdays">${JWEEKDAYS.map((w) => `<div class="cal-weekday">${w}</div>`).join("")}</div>
        <div class="cal-grid">
          ${cells.map((d) => d === null ? '<div class="cal-cell empty"></div>' : calDayHTML(d, jy, jm, today)).join("")}
        </div>
      </section>

      <section class="cal-legend" aria-label="راهنمای رنگ‌ها">
        <span class="legend-item"><span class="legend-swatch today-swatch"></span> امروز</span>
        <span class="legend-item"><span class="legend-swatch pending-swatch"></span> کار دارد</span>
        <span class="legend-item"><span class="legend-swatch partial-swatch"></span> نیمه‌کاره</span>
        <span class="legend-item"><span class="legend-swatch done-swatch"></span> کامل</span>
        <span class="legend-item"><span class="legend-swatch past-swatch"></span> گذشته</span>
        <span class="legend-item"><span class="legend-dot"></span> تسک ثبت‌شده</span>
      </section>

      </div>
      <section class="day-panel">${selectedDateHTML()}</section>
      </div>
      <section class="cal-day-timeline" id="cal-day-timeline"></section>
    `;

    document.title = "تقویم — Internship OS";
    wireCalendarEvents();
  }

    function calDayHTML(d, jy, jm, todayStr) {
    const key = dateKey(jy, jm, d);
    const isToday    = key === todayStr;
    const isPast     = compareJalaliDate(key, todayStr) < 0;
    const isSelected = calSelected && calSelected.jy === jy && calSelected.jm === jm && calSelected.jd === d;
    const tasks      = tasksOnDate(jy, jm, d);
    const hasTasks   = tasks.length > 0;
    const doneCount  = tasks.filter((t) => t.completed).length;
    const allDone    = hasTasks && doneCount === tasks.length;
    const hasPartial = hasTasks && doneCount > 0 && !allDone;
    const hasPending = hasTasks && doneCount === 0;
    const hasShift   = shiftsOnDate(jy, jm, d).length > 0;

    const cls = ["cal-cell"];
    if (isToday)          cls.push("today");
    if (isSelected)       cls.push("selected");
    if (isPast)           cls.push("past");
    if (hasShift)         cls.push("has-shift");
    if (allDone)          cls.push("status-done");
    else if (hasPartial)  cls.push("status-partial");
    else if (hasPending)  cls.push("status-pending");

    return `
      <button class="${cls.join(" ")}" type="button" data-cal-day="${key}"
              aria-label="${prettyDate(jy, jm, d)}">
        <span class="cal-day-num">${faNum(d)}</span>
        ${hasTasks ? '<span class="cal-day-dot" aria-hidden="true"></span>' : ""}
      </button>
    `;
  }

  function selectedDateHTML() {
    if (!calSelected) return "";
    const { jy, jm, jd } = calSelected;
    const weekday = weekdayName(jy, jm, jd);
    const tasks = tasksOnDate(jy, jm, jd);
    const shifts = shiftsOnDate(jy, jm, jd);
    const doneCount = tasks.filter((t) => t.completed).length;

    const shiftsSection = shifts.length > 0
      ? `<div class="day-shifts-section">
           <div class="day-section-label">🚨 کشیک‌ها</div>
           <ul class="day-shifts">${shifts.map(shiftRowHTML).join("")}</ul>
         </div>`
      : "";

    const tasksLabel = shifts.length > 0 ? '<div class="day-section-label">📝 کارها</div>' : "";

    return `
      <div class="day-panel-head">
        <div>
          <div class="day-panel-title">${prettyDate(jy, jm, jd)}</div>
          <div class="day-panel-sub">${weekday} — ${faNum(doneCount)} از ${faNum(tasks.length)} کار انجام شده</div>
        </div>
        <div class="day-panel-actions">
          <button class="btn ghost" type="button" data-cal-add-shift-bulk>+ کشیک گروهی</button>
          <button class="btn ghost" type="button" data-cal-add-shift>+ کشیک</button>
          <button class="btn primary" type="button" data-cal-add>+ کار</button>
        </div>
      </div>
      ${shiftsSection}
      ${tasksLabel}
      ${tasks.length
        ? `<ul class="today-tasks">${tasks.map(taskRowHTML).join("")}</ul>`
        : '<p class="today-empty">برای این روز کاری ثبت نشده.</p>'}
    `;
  }

  function wireCalendarEvents() {
    const prev = view.querySelector("[data-cal-prev]");
    const next = view.querySelector("[data-cal-next]");
    const todayBtn = view.querySelector("[data-cal-today]");

    if (prev) prev.addEventListener("click", () => { calView = addJalaliMonths(calView.jy, calView.jm, -1); renderCalendar(); });
    if (next) next.addEventListener("click", () => { calView = addJalaliMonths(calView.jy, calView.jm, 1); renderCalendar(); });
    if (todayBtn) todayBtn.addEventListener("click", () => {
      const t = parseJalali(todayJalali());
      calView = { jy: t.jy, jm: t.jm };
      calSelected = { jy: t.jy, jm: t.jm, jd: t.jd };
      renderCalendar();
    });

    view.querySelectorAll("[data-cal-day]").forEach((el) => {
      el.addEventListener("click", () => {
        const p = parseJalali(el.dataset.calDay);
        if (!p) return;
        calSelected = { jy: p.jy, jm: p.jm, jd: p.jd };
        renderCalendar();
      });
    });

    view.querySelectorAll("[data-toggle-task]").forEach((el) => {
      el.addEventListener("click", () => toggleTask(el.dataset.toggleTask));
    });

    // ─── Calendar day timeline render ───
    setTimeout(function () {
      var _calTl = document.getElementById("cal-day-timeline");
      if (_calTl && typeof InternshipTimeline !== "undefined" && InternshipTimeline.render && calSelected) {
        try {
          var _calDateStr = calSelected.jy + "/" + calSelected.jm + "/" + calSelected.jd;
          if (window.InternshipResidency && window.InternshipResidency.dayTimeline && window.InternshipResidency.dayTimeline.render) { window.InternshipResidency.dayTimeline.render(_calTl, _calDateStr, state, {}); } else { InternshipTimeline.render(_calTl, _calDateStr, state.tasks, state.shifts || [], {}); }
        } catch (e) { console.warn("[cal-timeline]", e); }
      }
    }, 60);

    const addBtn = view.querySelector("[data-cal-add]");
    if (addBtn) addBtn.addEventListener("click", () => openTaskForm(null, calSelected));

    const addShiftBtn = view.querySelector("[data-cal-add-shift]");
    if (addShiftBtn) addShiftBtn.addEventListener("click", () => openShiftForm(null, calSelected));

    const addBulkBtn = view.querySelector("[data-cal-add-shift-bulk]");
    if (addBulkBtn) addBulkBtn.addEventListener("click", () => openBulkShiftForm());

    view.querySelectorAll("[data-edit-shift]").forEach((b) => {
      b.addEventListener("click", () => openShiftForm(b.dataset.editShift));
    });
    view.querySelectorAll("[data-delete-shift]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteShift(b.dataset.deleteShift));
    });
  }

  /* ─── Planner ──────────────────────────────────────────── */

  const AREA_PRIORITY = { clinical: 1, study: 2, emergency: 3, residency: 4, body: 5, income: 6, life: 7, sleep: 8, food: 9, commute: 10 };

  function renderPlanner() {
    const today = todayJalali();
    const t = parseJalali(today);
    const tomorrow = addJalaliDays(t.jy, t.jm, t.jd, 1);
    const in7 = addJalaliDays(t.jy, t.jm, t.jd, 7);
    const in7Key = dateKey(in7.jy, in7.jm, in7.jd);
    const tomorrowKey = dateKey(tomorrow.jy, tomorrow.jm, tomorrow.jd);

    const groups = [
      { id: "overdue",  title: "عقب‌افتاده", accent: "251, 113, 133", tasks: [] },
      { id: "today",    title: "امروز",      accent: "45, 212, 191",  tasks: [] },
      { id: "tomorrow", title: "فردا",       accent: "129, 140, 248", tasks: [] },
      { id: "week",     title: "این هفته",   accent: "167, 139, 250", tasks: [] },
      { id: "later",    title: "بعدتر",      accent: "148, 163, 184", tasks: [] }
    ];

    state.tasks.forEach((task) => {
      if (!parseJalali(task.date)) return;
      if (task.cancelled === true) return;   /* [PATCH:issue-104] */
      const cmpToday = compareJalaliDate(task.date, today);
      const cmp7 = compareJalaliDate(task.date, in7Key);
      if (!task.completed && cmpToday < 0) groups[0].tasks.push(task);
      else if (cmpToday === 0) groups[1].tasks.push(task);
      else if (task.date === tomorrowKey) groups[2].tasks.push(task);
      else if (cmp7 <= 0) groups[3].tasks.push(task);
      else groups[4].tasks.push(task);
    });

    groups.forEach((g) => g.tasks.sort((a, b) => {
      const da = compareJalaliDate(a.date, b.date);
      if (da !== 0) return da;
      const aa = AREA_PRIORITY[a.areaId] || 99;
      const ab = AREA_PRIORITY[b.areaId] || 99;
      if (aa !== ab) return aa - ab;
      return (a.time || "").localeCompare(b.time || "");
    }));

    const active = groups.filter((g) => g.tasks.length > 0);

    // Weekly view - 7 روز آینده
    // [PATCH:phase-28.2.4b] _weekBase was missing in planner scope
    const _weekBase = t;
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
      const d = addJalaliDays(_weekBase.jy, _weekBase.jm, _weekBase.jd, i);
      const dKey = dateKey(d.jy, d.jm, d.jd);
      const dayTasks = state.tasks.filter((task) => task.date === dKey && !task.cancelled);
      const dayShifts = shiftsOnDate(d.jy, d.jm, d.jd);
      weekDays.push({
        jy: d.jy, jm: d.jm, jd: d.jd,
        key: dKey,
        weekday: weekdayName(d.jy, d.jm, d.jd),
        isToday: i === 0,
        total: dayTasks.length,
        done: dayTasks.filter((x) => x.completed).length,
        overdue: dayTasks.filter((x) => !x.completed && compareJalaliDate(x.date, today) < 0).length,
        shifts: dayShifts.length
      });
    }

    // Rotation context
    const currentRot = getCurrentRotation();
    let rotContextHTML = "";
    if (currentRot) {
      const rotColor = currentRot.color || "45, 212, 191";
      const rStart = parseJalali(currentRot.startDate);
      const rEnd = parseJalali(currentRot.endDate);
      const rotStartDay = jalaliToDayNumber(rStart.jy, rStart.jm, rStart.jd);
      const rotEndDay = jalaliToDayNumber(rEnd.jy, rEnd.jm, rEnd.jd);
      const todayDay = jalaliToDayNumber(t.jy, t.jm, t.jd);
      const totalDays = rotEndDay - rotStartDay + 1;
      const elapsed = Math.max(0, todayDay - rotStartDay + 1);
      const pct = Math.min(100, Math.round((elapsed / totalDays) * 100));
      const monthNum = Math.ceil(elapsed / 30);
      const monthTotal = Math.ceil(totalDays / 30);

      rotContextHTML = `
        <div class="planner-rot-context" style="--rotation-color:rgb(${rotColor})">
          <span class="planner-rot-icon">🏥</span>
          <div class="planner-rot-text">
            <div class="planner-rot-title">روتیشن فعلی: <strong>${escapeHTML(currentRot.title)}</strong></div>
            <div class="planner-rot-sub">ماه ${faNum(monthNum)} از ${faNum(monthTotal)} — ${faNum(pct)}٪ گذشت</div>
          </div>
        </div>
      `;
    }

    const mot = getRandomMotivation();
    const motivationHTML = `
      <section class="dash-motivation" id="dash-motivation">
        <div class="dash-motivation-emoji" aria-hidden="true">${mot.emoji}</div>
        <div class="dash-motivation-text">${escapeHTML(mot.text)}</div>
        <button class="dash-motivation-refresh" type="button" id="dash-motivation-refresh" title="پیام دیگه">🔄</button>
      </section>
    `;

    view.innerHTML = `
      <div class="planner-head">
        <h2 class="planner-title">برنامه‌ریزی</h2>
        <div style="display:flex;gap:8px">
          <button class="btn ghost" type="button" data-ai-generator-life>🤖 تولید با AI</button>
          <button class="btn primary" type="button" data-planner-add>+ افزودن کار</button>
        </div>
      </div>

      ${motivationHTML}
      ${rotContextHTML}

      <section class="weekly-view">
        <div class="weekly-view-head">
          <span class="weekly-view-title">📅 هفته‌ی پیش‌رو</span>
        </div>
        <div class="weekly-grid">
          ${weekDays.map(weeklyCellHTML).join("")}
        </div>
      </section>

      ${active.length === 0
        ? `<div class="placeholder"><span class="placeholder-icon">📝</span>
             <h2>هنوز کاری ثبت نشده</h2>
             <p>با دکمه‌ی «افزودن کار» اولین کار را بساز.</p></div>`
        : `<div class="planner-grid">${active.map(plannerGroupHTML).join("")}</div>`}
    `;

    document.title = "برنامه‌ریزی — Internship OS";
    wirePlannerEvents();
  }

  function weeklyCellHTML(day) {
    const isToday = day.isToday;
    const hasShift = day.shifts > 0;
    const pct = day.total > 0 ? Math.round((day.done / day.total) * 100) : 0;
    let statusCls = "week-empty";
    if (day.total > 0) {
      if (day.done === day.total) statusCls = "week-done";
      else if (day.done > 0) statusCls = "week-partial";
      else statusCls = "week-pending";
    }

    return `
      <button class="weekly-cell ${isToday ? "week-today" : ""} ${statusCls} ${hasShift ? "week-has-shift" : ""}"
              type="button" data-goto-date="${day.key}">
        <div class="weekly-cell-day">${day.weekday.slice(0, 3)}</div>
        <div class="weekly-cell-num">${faNum(day.jd)}</div>
        <div class="weekly-cell-meta">
          ${day.total > 0 ? `<span class="weekly-count">${faNum(day.done)}/${faNum(day.total)}</span>` : `<span class="weekly-count-empty">—</span>`}
        </div>
        ${hasShift ? '<span class="weekly-shift-dot"></span>' : ""}
      </button>
    `;
  }
  function plannerGroupHTML(group) {
    const done = group.tasks.filter((t) => t.completed).length;

    // گروه‌بندی داخلی بر اساس بخش زندگی
    const byArea = new Map();
    group.tasks.forEach((task) => {
      if (!byArea.has(task.areaId)) byArea.set(task.areaId, []);
      byArea.get(task.areaId).push(task);
    });

    const areaGroups = Array.from(byArea.entries())
      .sort((a, b) => (AREA_PRIORITY[a[0]] || 99) - (AREA_PRIORITY[b[0]] || 99))
      .map(([areaId, tasks]) => {
        const area = areaById(areaId);
        if (!area) return "";
        const areaDone = tasks.filter((x) => x.completed).length;
        return `
          <div class="planner-area-subgroup">
            <div class="planner-area-head">
              <span class="planner-area-icon">${area.icon}</span>
              <span class="planner-area-title">${escapeHTML(area.title)}</span>
              <span class="planner-area-count">${faNum(areaDone)}/${faNum(tasks.length)}</span>
            </div>
            <ul class="today-tasks">${tasks.map(plannerRowHTML).join("")}</ul>
          </div>
        `;
      }).join("");

    return `
      <section class="planner-group" style="--accent:${group.accent}">
        <div class="planner-group-head">
          <span class="planner-group-title">${group.title}</span>
          <span class="planner-group-count">${faNum(done)} / ${faNum(group.tasks.length)}</span>
        </div>
        ${areaGroups}
      </section>
    `;
  }

  function plannerRowHTML(task) {
    const area = areaById(task.areaId);
    const today = todayJalali();
    const p = parseJalali(task.date);
    const isToday = task.date === today;
    const isPast = compareJalaliDate(task.date, today) < 0;

    const currentRot = getCurrentRotation();
    const isRotationLinked = !!(currentRot && task.sourceSpec &&
      currentRot.clinicalModuleId === task.sourceSpec);

    const dateChip = isToday ? "" : `<span class="task-date-chip ${isPast ? "overdue" : ""}">${p ? prettyDate(p.jy, p.jm, p.jd) : ""}</span>`;
    const timeChip = task.time ? `<span class="task-time-chip">${faNum(task.time)}</span>` : "";
    const recurBadge = task.recurrence && task.recurrence !== "none"
      ? `<span class="task-recur-badge" title="تکرار">↻</span>` : "";

    return `
      <li class="task-row planner-row ${task.completed ? "done" : ""} ${isRotationLinked ? "rotation-linked" : ""}">
        <span class="task-check" data-toggle-task="${task.id}" role="checkbox"
              aria-checked="${task.completed}" tabindex="0" aria-label="${escapeHTML(task.title)}"></span>
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${taskSourceBadgeHTML(task)}
        ${isRotationLinked ? '<span class="task-rotation-badge" title="مرتبط با روتیشن فعلی">🏥</span>' : ""}
        ${recurBadge}${timeChip}
        ${area ? `<span class="task-area-pill">${area.icon} ${area.title}</span>` : ""}
        ${dateChip}
        <span class="task-actions">
          <button class="task-action" type="button" data-edit-task="${task.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-delete-task="${task.id}" title="حذف">🗑️</button>
        </span>
      </li>
    `;
  }
  
  function wirePlannerEvents() {
    view.querySelectorAll("[data-toggle-task]").forEach((el) => {
      el.addEventListener("click", () => toggleTask(el.dataset.toggleTask));
    });
    view.querySelectorAll("[data-edit-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); openTaskForm(el.dataset.editTask); });
    });
    view.querySelectorAll("[data-delete-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); confirmDeleteTask(el.dataset.deleteTask); });
    });
    const addBtn = view.querySelector("[data-planner-add]");
    if (addBtn) addBtn.addEventListener("click", () => openTaskForm(null));

    const aiLifeBtn = view.querySelector("[data-ai-generator-life]");
    if (aiLifeBtn) aiLifeBtn.addEventListener("click", () => openAIGenerator({ type: "life_area" }));

    // ─── دکمه‌ی پیام انگیزشی ─────────────────
    const motBtn = view.querySelector("#dash-motivation-refresh");
    if (motBtn) motBtn.addEventListener("click", () => applyNewMotivation());

    // Weekly cell → پریدن به تقویم روی اون روز
    view.querySelectorAll("[data-goto-date]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const p = parseJalali(btn.dataset.gotoDate);
        if (!p) return;
        calSelected = { jy: p.jy, jm: p.jm, jd: p.jd };
        calView = { jy: p.jy, jm: p.jm };
        setRoute("calendar");
      });
    });
  }
  /* ─── Shared date picker ───────────────────────────────── */

  function datePickerHTML(prefix, jy, jm, jd) {
    if (typeof InternshipPickers !== "undefined" && InternshipPickers.date) {
      return InternshipPickers.date.render(prefix, jy, jm, jd);
    }
    const currentYear = parseJalali(todayJalali()).jy;
    const years = [];
    for (let y = currentYear - 1; y <= currentYear + 3; y++) years.push(y);
    const maxDay = jalaliMonthLength(jy, jm);
    const days = [];
    for (let d = 1; d <= maxDay; d++) days.push(d);
    return `
      <div class="date-picker">
        <select id="${prefix}-day">${days.map((d) => `<option value="${d}" ${d === jd ? "selected" : ""}>${faNum(d)}</option>`).join("")}</select>
        <select id="${prefix}-month">${JMONTHS.map((m, i) => `<option value="${i + 1}" ${i + 1 === jm ? "selected" : ""}>${m}</option>`).join("")}</select>
        <select id="${prefix}-year">${years.map((y) => `<option value="${y}" ${y === jy ? "selected" : ""}>${faNum(y)}</option>`).join("")}</select>
      </div>
    `;
  }

  function readDatePicker(prefix) {
    if (typeof InternshipPickers !== "undefined" && InternshipPickers.date) {
      var _v = InternshipPickers.date.read(prefix);
      if (_v) return _v;
    }
    const dEl = document.getElementById(prefix + "-day");
    const mEl = document.getElementById(prefix + "-month");
    const yEl = document.getElementById(prefix + "-year");
    if (!dEl || !mEl || !yEl) return null;
    return dateKey(parseInt(yEl.value, 10), parseInt(mEl.value, 10), parseInt(dEl.value, 10));
  }

  function refreshDatePicker(prefix) {
    if (typeof InternshipPickers !== "undefined") return;
    const dayEl   = document.getElementById(prefix + "-day");
    const monthEl = document.getElementById(prefix + "-month");
    const yearEl  = document.getElementById(prefix + "-year");
    if (!dayEl || !monthEl || !yearEl) return;
    const jy = parseInt(yearEl.value, 10);
    const jm = parseInt(monthEl.value, 10);
    const maxDay = jalaliMonthLength(jy, jm);
    const curDay = Math.min(parseInt(dayEl.value, 10) || 1, maxDay);
    dayEl.innerHTML = "";
    for (let d = 1; d <= maxDay; d++) {
      const opt = document.createElement("option");
      opt.value = d;
      opt.textContent = faNum(d);
      if (d === curDay) opt.selected = true;
      dayEl.appendChild(opt);
    }
  }

  /* ─── Task form ────────────────────────────────────────── */

  // ═══════════════════════════════════════════
  //  Conflict Warning Modal
  // ═══════════════════════════════════════════
  function openDashDayModal(dateKey) {
    var ex = document.getElementById("dash-day-modal");
    if (ex) ex.remove();
    if (!dateKey) return;

    var p = parseJalali(dateKey);
    if (!p) return;
    var wk = weekdayName(p.jy, p.jm, p.jd);
    var pdate = prettyDate(p.jy, p.jm, p.jd);

    var overlay = document.createElement("div");
    overlay.id = "dash-day-modal";
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = ''
      + '<div class="modal modal-wide dash-day-modal" role="dialog" aria-modal="true" style="max-width:520px">'
      + '<div class="dash-day-modal-head">'
      + '<div class="dash-day-modal-head-left">'
      + '<span class="dash-day-modal-icon">📅</span>'
      + '<div>'
      + '<div class="dash-day-modal-title">' + pdate + '</div>'
      + '<div class="dash-day-modal-sub">' + wk + '</div>'
      + '</div>'
      + '</div>'
      + '<button class="dash-day-modal-close" type="button" data-close>✕</button>'
      + '</div>'
      + '<div class="dash-day-modal-body">'
      + '<div id="dash-day-timeline"></div>'
      + '<div id="dash-day-tasks-list"></div>'
      + '</div>'
      + '<div class="dash-day-modal-actions">'
      + '<button class="btn ghost small" type="button" data-go-cal>مشاهده در تقویم</button>'
      + '<button class="btn primary small" type="button" data-close>بستن</button>'
      + '</div>'
      + '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    // ─── render timeline ───
    var tlEl = overlay.querySelector("#dash-day-timeline");
    if (tlEl && typeof InternshipTimeline !== "undefined" && InternshipTimeline.render) {
      try {
        if (window.InternshipResidency && window.InternshipResidency.dayTimeline && window.InternshipResidency.dayTimeline.render) { window.InternshipResidency.dayTimeline.render(tlEl, dateKey, state, {}); } else { InternshipTimeline.render(tlEl, dateKey, state.tasks, state.shifts || [], {}); }
      } catch (e) {
        console.warn("[dash-day-timeline]", e);
      }
    }

    // ─── render tasks + shifts list ───
    var listEl = overlay.querySelector("#dash-day-tasks-list");
    if (listEl) {
      /* PATCH:phase-F7-merge3 — merge sleep split in calendar day modal */
      var dayTasks = state.tasks.filter(function (t) {
        if (!t || t.date !== dateKey) return false;
        if (t._sleepAuto === "night:evening") return false;
        if (t.cancelled === true) return false;  /* [PATCH:issue-104] */
        return true;
      }).map(function (t) {
        if (t._sleepAuto === "night:morning" && state.sleep && state.sleep.schedule && state.sleep.schedule.night) {
          var nb = state.sleep.schedule.night.bedTime || "22:00";
          var bp = String(nb).split(":");
          var bm = parseInt(bp[0],10)*60 + parseInt(bp[1],10);
          var eveDur = 1440 - bm;
          var merged = Object.assign({}, t);
          merged.time = nb;
          merged.durationMinutes = (t.durationMinutes || 0) + eveDur;
          return merged;
        }
        return t;
      }).sort(function (a, b) {
        return (a.time || "").localeCompare(b.time || "");
      });
      var dayShifts = (state.shifts || []).filter(function (s) {
        return s && s.date === dateKey;
      }).sort(function (a, b) {
        return (a.startTime || "").localeCompare(b.startTime || "");
      });

      var html2 = "";
      if (dayShifts.length > 0) {
        html2 += '<div class="dash-day-group">'
          + '<div class="dash-day-group-title">🚨 کشیک‌ها (' + faNum(dayShifts.length) + ')</div>'
          + '<div class="dash-day-items">';
        dayShifts.forEach(function (s) {
          html2 += '<div class="dash-day-item dash-day-shift">'
            + '<span class="dash-day-item-time">' + faNum(s.startTime || "") + '→' + faNum(s.endTime || "") + '</span>'
            + '<span class="dash-day-item-title">' + escapeHTML(s.type || "کشیک") + '</span>'
            + '</div>';
        });
        html2 += '</div></div>';
      }
      if (dayTasks.length > 0) {
        html2 += '<div class="dash-day-group">'
          + '<div class="dash-day-group-title">📝 کارها (' + faNum(dayTasks.length) + ')</div>'
          + '<div class="dash-day-items">';
        dayTasks.forEach(function (t) {
          var area = areaById(t.areaId);
          var areaColor = area ? area.accent : "148,163,184";
          html2 += '<button type="button" class="dash-day-item dash-day-task ' + (t.completed ? 'is-done' : '') + '" data-open-task-day="' + t.id + '" style="--area-color:' + areaColor + '">'
            + '<span class="dash-day-item-dot"></span>'
            + '<span class="dash-day-item-time">' + (t.time ? faNum(t.time) : '—') + '</span>'
            + '<span class="dash-day-item-title">' + escapeHTML(t.title) + '</span>'
            + (t.durationMinutes ? '<span class="dash-day-item-dur">' + faNum(t.durationMinutes) + 'د</span>' : '')
            + '<span class="dash-day-item-del" data-del-task-day="' + t.id + '" title="حذف">🗑️</span>'
            + '</button>';
        });
        html2 += '</div></div>';
      }
      if (dayTasks.length === 0 && dayShifts.length === 0) {
        html2 = '<div class="dash-day-empty">'
          + '<span class="dash-day-empty-icon">🌙</span>'
          + '<span>برای این روز چیزی ثبت نشده</span>'
          + '</div>';
      }
      listEl.innerHTML = html2;
    }

    // ─── wire ───
    var close = function () {
      overlay.classList.remove("open");
      setTimeout(function () { overlay.remove(); }, 220);
    };
    overlay.querySelectorAll("[data-close]").forEach(function (b) {
      b.addEventListener("click", close);
    });
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) close();
    });
    var goCal = overlay.querySelector("[data-go-cal]");
    if (goCal) goCal.addEventListener("click", function () {
      close();
      calSelected = { jy: p.jy, jm: p.jm, jd: p.jd };
      calView = { jy: p.jy, jm: p.jm };
      setRoute("calendar");
    });
    overlay.querySelectorAll("[data-del-task-day]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var _id = b.getAttribute("data-del-task-day");
        if (!_id) return;
        close();
        setTimeout(function () { confirmDeleteTask(_id); }, 200);
      });
    });
    overlay.querySelectorAll("[data-open-task-day]").forEach(function (b) {
      b.addEventListener("click", function (e) {
        e.stopPropagation();
        var id = b.getAttribute("data-open-task-day");
        close();
        setTimeout(function () {
          try { document.dispatchEvent(new CustomEvent("io-open-task", { detail: { id: id } })); } catch (ex) {}
        }, 250);
      });
    });
  }
  /* PATCH:mvp03-del-btn */
  function showConflictWarning(conflicts, onConfirm) {
    var ex = document.getElementById("conflict-modal");
    if (ex) ex.remove();

    var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
    var faNum = function (n) { return String(n).replace(/\d/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹"[+d]; }); };

    var overlay = document.createElement("div");
    overlay.id = "conflict-modal";
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";

    var rows = "";
    conflicts.forEach(function (c) {
      var t = c.task;
      rows += '<div class="confl-row">'
        + '<span class="confl-icon">⚠️</span>'
        + '<div class="confl-body">'
        + '<div class="confl-title">' + esc(t.title) + '</div>'
        + '<div class="confl-meta">' + faNum(t.time) + ' (' + faNum(t.durationMinutes) + ' دقیقه) · تداخل ' + faNum(c.overlapMinutes) + ' دقیقه</div>'
        + '</div>'
        + '</div>';
    });

    var html = '<div class="modal modal-wide" role="dialog" aria-modal="true" style="max-width:460px;">'
      + '<div class="confl-head">'
      + '<div class="confl-head-icon">⚠️</div>'
      + '<div>'
      + '<div class="confl-head-title">تداخل زمانی</div>'
      + '<div class="confl-head-sub">این تسک با ' + faNum(conflicts.length) + ' تسک دیگر هم‌پوشانی دارد</div>'
      + '</div>'
      + '</div>'
      + '<div class="confl-list">' + rows + '</div>'
      + '<p class="confl-hint">می‌تونی زمان تسک رو تغییر بدی، یا با تأیید، اجازه‌ی هم‌پوشانی بده.</p>'
      + '<div class="modal-actions">'
      + '<button class="btn ghost" type="button" data-confl-cancel>بازگشت</button>'
      + '<button class="btn danger" type="button" data-confl-confirm>اجازه‌ی تداخل</button>'
      + '</div>'
      + '</div>';

    overlay.innerHTML = html;
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var close = function () {
      overlay.classList.remove("open");
      setTimeout(function () { overlay.remove(); }, 220);
    };

    overlay.querySelector("[data-confl-cancel]").addEventListener("click", close);
    overlay.querySelector("[data-confl-confirm]").addEventListener("click", function () {
      close();
      if (typeof onConfirm === "function") onConfirm();
    });
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
  }


  /* [PATCH:mvp01-a] Extra form areas - task areaId may not be present in LIFE_AREAS UI */
  const _TASK_FORM_EXTRA_AREAS = [
    { id: "sleep",   icon: "😴", title: "خواب" },
    { id: "food",    icon: "🍎", title: "غذا" },
    { id: "commute", icon: "🚗", title: "رفت‌وآمد" }
  ];
  /* PATCH:phase-A2 */ function _getDashboardAreas() {
    var _hidden = ["food", "commute", "finance"];
    return LIFE_AREAS.filter(function (a) { return _hidden.indexOf(a.id) === -1; });
  }
  function _getFormAreas() {
    var out = LIFE_AREAS.slice();
    var have = {};
    out.forEach(function (x) { have[x.id] = true; });
    _TASK_FORM_EXTRA_AREAS.forEach(function (x) { if (!have[x.id]) out.push(x); });
    return out;
  }
    function _taskProjectRowHTML(selectedId, locked) {
    var s = state;
    if (!s || !Array.isArray(s.projects)) return "";
    if (locked && selectedId) {
      var lp = null;
      for (var li = 0; li < s.projects.length; li++) { if (s.projects[li].id === selectedId) { lp = s.projects[li]; break; } }
      if (lp) {
        return '<div class="form-row" id="tf-project-row">'
          + '<label>پروژه</label>'
          + '<div class="tf-project-locked">📋 ' + escapeHTML(lp.title) + '</div>'
          + '<input type="hidden" id="tf-project" value="' + escapeHTML(lp.id) + '">'
          + '</div>';
      }
    }
    var active = s.projects.filter(function (p) { return p.status === "active"; });
    if (!active.length) return "";
    var h = '<div class="form-row" id="tf-project-row">';
    h += '<label for="tf-project">پروژه (اختیاری)</label>';
    h += '<select id="tf-project"><option value="">— بدون پروژه —</option>';
    for (var i = 0; i < active.length; i++) {
      var p = active[i];
      h += '<option value="' + escapeHTML(p.id) + '"' + (p.id === selectedId ? " selected" : "") + '>' + escapeHTML(p.title) + '</option>';
    }
    h += '</select></div>';
    return h;
  }

function openTaskForm(taskId, presetDate, presetAreaId, presetProjectId) {
    const isEdit = !!taskId;
    const task = isEdit ? state.tasks.find((t) => t.id === taskId) : null;
    if (isEdit && !task) return;

    const t = parseJalali(todayJalali());
    let init;
    if (isEdit) {
      const tp = parseJalali(task.date) || t;
      init = { title: task.title, areaId: task.areaId, date: tp, time: task.time || "", priority: task.priority || "normal", description: task.description || "", recurrence: task.recurrence || "none", durationMinutes: (typeof task.durationMinutes === "number" ? task.durationMinutes : null), projectId: task.projectId || "" };
    } else if (presetDate) {
      init = { title: "", areaId: (presetAreaId || (presetProjectId ? "income" : "clinical")), date: { jy: presetDate.jy, jm: presetDate.jm, jd: presetDate.jd }, time: "", priority: "normal", description: "", recurrence: "none", projectId: presetProjectId || "" };
    } else {
      init = { title: "", areaId: (presetAreaId || (presetProjectId ? "income" : "clinical")), date: t, time: "", priority: "normal", description: "", recurrence: "none", durationMinutes: null, projectId: presetProjectId || "" };
    }
    // نوع تسک رزیدنتی — برای پیش‌انتخاب در فرم
    let initResType = "auto";
    if (isEdit && task.areaId === "residency" &&
        ["study", "review", "question", "exam"].indexOf(task.taskType) !== -1) {
      initResType = task.taskType;
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش کار" : "افزودن کار جدید"}</h3>
        <div class="form-row">
          <label for="tf-title">عنوان *</label>
          <input type="text" id="tf-title" placeholder="مثلاً: مرور پنومونی" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="tf-area">بخش *</label>
            <select id="tf-area">
              ${_getFormAreas().map((a) => `<option value="${a.id}" ${a.id === init.areaId ? "selected" : ""}>${a.icon} ${a.title}</option>`).join("")}
            </select>
          </div>
          <div class="form-row">
            <label for="tf-priority">اولویت</label>
            <select id="tf-priority">
              <option value="low"    ${init.priority === "low" ? "selected" : ""}>کم</option>
              <option value="normal" ${init.priority === "normal" ? "selected" : ""}>متوسط</option>
              <option value="high"   ${init.priority === "high" ? "selected" : ""}>زیاد</option>
            </select>
          </div>
        </div>
        <div class="form-row" id="tf-res-type-row" style="${init.areaId === "residency" ? "" : "display:none"}">
          <label for="tf-res-type">نوع تسک رزیدنتی</label>
          <select id="tf-res-type">
            <option value="auto"     ${initResType === "auto"     ? "selected" : ""}>🔍 تشخیص خودکار (از عنوان)</option>
            <option value="study"    ${initResType === "study"    ? "selected" : ""}>📚 مطالعه</option>
            <option value="review"   ${initResType === "review"   ? "selected" : ""}>🔄 مرور</option>
            <option value="question" ${initResType === "question" ? "selected" : ""}>❓ تست</option>
            <option value="exam"     ${initResType === "exam"     ? "selected" : ""}>🎯 آزمون جامع</option>
          </select>
          <p class="form-hint">🔍 تشخیص خودکار از عنوان: «مرور/ریویو» → مرور · «آزمون/امتحان/شبیه‌ساز» → آزمون · «تست/سوال/کوئیز» → تست · بقیه → مطالعه</p>
        </div>
        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("tf", init.date.jy, init.date.jm, init.date.jd)}
        </div>
        <div class="form-row">
        <div class="form-grid-2 tf-time-row">
          <div class="form-row">
            <label>مدت زمان</label>
            ${InternshipPickers.duration.render("tf", init.durationMinutes)}
          </div>
          <div class="form-row">
            <label>ساعت شروع</label>
            ${InternshipPickers.time.render("tf", init.time)}
          </div>
        </div>
        <div class="form-row">
          <label>تکرار</label>
          ${InternshipPickers.recurrence.render("tf", init.recurrence)}
        </div>
        ${_taskProjectRowHTML(init.projectId, !!presetProjectId)}
        <div class="form-row" data-preview-for="tf" id="tf-preview"></div>
        <div class="form-row">
          <label for="tf-desc">توضیح (اختیاری)</label>
          <textarea id="tf-desc" rows="2">${escapeHTML(init.description)}</textarea>
        </div>
        <div class="modal-actions">
          ${isEdit ? '<button class="btn ghost" type="button" data-delete-task title="حذف">🗑️ حذف</button>' : ""}
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "ایجاد"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    /* [PATCH:mvp02-chips] */
    (function(){
      var _rr=overlay.querySelector(".rec");
      if(!_rr)return;
      var _rh=_rr.querySelector(".rec-h");
      _rr.addEventListener("click",function(e){
        var cc=e.target.closest(".rec-chip");
        if(!cc)return;
        if(_rh)_rh.value=cc.getAttribute("data-rec");
        _rr.querySelectorAll(".rec-chip").forEach(function(x){x.classList.remove("is-selected");});
        cc.classList.add("is-selected");
      });
    })();
    const m = overlay.querySelector("#tf-month");
    const y = overlay.querySelector("#tf-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("tf"));
    if (y) y.addEventListener("change", () => refreshDatePicker("tf"));

    // نمایش/مخفی کردن زیر-dropdown نوع رزیدنتی
    const areaSelect = overlay.querySelector("#tf-area");
    const resTypeRow = overlay.querySelector("#tf-res-type-row");
    if (areaSelect && resTypeRow) {
      const syncResRow = () => {
        resTypeRow.style.display = (areaSelect.value === "residency") ? "" : "none";
      };
      areaSelect.addEventListener("change", syncResRow);
      syncResRow();
    }

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#tf-title"); if (i) i.focus(); }, 60);
    if (typeof InternshipTimeline !== "undefined" && InternshipTimeline.updateDurationPreview) {
      setTimeout(function () { InternshipTimeline.updateDurationPreview("tf"); }, 80);
    }

    /* PATCH:mvp03-del-btn3 */
    var _delBtnTf = overlay.querySelector("[data-delete-task]");
    if (_delBtnTf) _delBtnTf.addEventListener("click", function () { close(); confirmDeleteTask(taskId); });
    const submit = () => {
      const title = overlay.querySelector("#tf-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const areaId = overlay.querySelector("#tf-area").value;
      const priority = overlay.querySelector("#tf-priority").value;
      const date = readDatePicker("tf");
      const durationMinutes = InternshipPickers.duration.read("tf");
      const time = InternshipPickers.time.read("tf") || "";
      const recurrence = (typeof InternshipPickers !== "undefined" && InternshipPickers.recurrence) ? (InternshipPickers.recurrence.read("tf") || "none") : overlay.querySelector("#tf-recur").value;
      const description = overlay.querySelector("#tf-desc").value.trim();

      // ─── تعیین taskType ───────────────────────────────
      //  • اگه بخش رزیدنتی بود: از زیر-dropdown یا تشخیص خودکار
      //  • وگرنه: مقدار قبلی (edit) یا پیش‌فرض other
      let taskType;
      if (areaId === "residency") {
        const resTypeSel = overlay.querySelector("#tf-res-type");
        const chosen = resTypeSel ? resTypeSel.value : "auto";
        if (chosen && chosen !== "auto") {
          taskType = chosen;
        } else {
          taskType = resolveResidencyType({ title });
        }
      } else {
        taskType = (isEdit && task.taskType) ? task.taskType : "other";
      }

      // ─── Phase 27.2: HARD conflict block (new engine) ───
      try {
        var _R27 = window.InternshipResidency;
        var _SP27 = _R27 && _R27.schedulingProjection;
        var _CF27 = _R27 && _R27.schedulingConflict;
        if (_SP27 && _CF27 && _CF27.detectPair) {
          var _existing = (_SP27.projectDate && _SP27.projectDate(state, date, {})) || [];
          var _excludeSourceId = isEdit ? task.id : null;
          _existing = _existing.filter(function (x) {
            if (!_excludeSourceId) return true;
            return !(x.sourceType === "task" && x.sourceId === _excludeSourceId);
          });
          var _hStart = time || null;
          var _hDur = (typeof durationMinutes === "number" && durationMinutes > 0) ? durationMinutes : null;
          var _hEnd = null;
          if (_hStart && _hDur) {
            var _hm = String(_hStart).split(":");
            if (_hm.length === 2) {
              var _sm = parseInt(_hm[0], 10) * 60 + parseInt(_hm[1], 10);
              var _em = _sm + _hDur;
              var _eh = Math.floor(_em / 60) % 24;
              var _emm = _em % 60;
              _hEnd = (_eh < 10 ? "0" : "") + _eh + ":" + (_emm < 10 ? "0" : "") + _emm;
            }
          }
          if (_hStart && _hDur && _hEnd) {
            var _hypo = {
              id: "hypo:task",
              sourceType: "task",
              sourceId: _excludeSourceId || "__new__",
              title: title,
              category: areaId || "",
              date: date,
              startTime: _hStart,
              endTime: _hEnd,
              durationMinutes: _hDur,
              role: "block",
              status: "pending",
              context: null
            };
            var _hasHard = false;
            for (var _i = 0; _i < _existing.length; _i++) {
              var _c = _CF27.detectPair(_hypo, _existing[_i], {});
              if (_c && _c.policy === "HARD") { _hasHard = true; break; }
            }
            if (_hasHard) {
              toast("⛔ این زمان با یک فعالیت دیگر تداخل غیرمجاز دارد. لطفاً زمان دیگری انتخاب کن.", "error");
              return;
            }
          }
        }
      } catch (e) { console.warn("[27.2 hard-conflict]", e); }

            var _tfProjSel = overlay.querySelector("#tf-project");
      var _tfProjectId;
      if (_tfProjSel && _tfProjSel.value) {
        _tfProjectId = _tfProjSel.value;
      } else if (presetProjectId) {
        _tfProjectId = presetProjectId;
      } else if (isEdit && task && task.projectId) {
        _tfProjectId = task.projectId;
      } else {
        _tfProjectId = null;
      }
const now = Date.now();
      if (isEdit) {
        const _rtWasRel = _rtIsRelevantTask({ time: task.time, durationMinutes: task.durationMinutes, sourceType: task.sourceType, areaId: task.areaId, _sleepAuto: task._sleepAuto });
        const _rtBefore = {
          title: task.title, date: task.date,
          time: task.time || null,
          durationMinutes: (typeof task.durationMinutes === "number" ? task.durationMinutes : null)
        };
        Object.assign(task, {
          title, areaId, date, time, priority, recurrence, description,
          durationMinutes,
          taskType,
          projectId: _tfProjectId,
          updatedAt: now
        });
        const _rtIsRel = _rtIsRelevantTask(task);
        if (_rtWasRel || _rtIsRel) {
          _rtNotify("task_updated", {
            id: task.id, sourceType: "task", date: task.date, title: task.title,
            before: _rtBefore,
            after: { title: task.title, date: task.date, time: task.time || null, durationMinutes: (typeof task.durationMinutes === "number" ? task.durationMinutes : null) }
          });
        }
        // ─── [PATCH:v4-task-activity-sync] propagate changes to linked activity ───
        try {
          if (task.sourceType === "residency_activity" && window.InternshipResidency && window.InternshipResidency.taskProjection) {
            var actId = task.residencyActivityId || task.sourceId;
            if (actId) window.InternshipResidency.taskProjection.onTaskRescheduled(task.id);
          }
        } catch (e) { console.warn("[v4 task-resync]", e); }
        toast("کار به‌روزرسانی شد");
      } else {
        const id = _mkId("t");
        const _rtNewTask = {
          id, title, areaId, date, time, priority, recurrence, description,
          durationMinutes,
          completed: false,
          sourceType: "manual",
          sourceId: null,
          taskType,
          projectId: _tfProjectId || null,
          createdAt: now,
          updatedAt: now
        };
        state.tasks.push(_rtNewTask);
        try {
          if (typeof window !== "undefined" && window.__lifeLinkPending && window.InternshipResidency && window.InternshipResidency.lifeUI && typeof window.InternshipResidency.lifeUI.consumePendingLink === "function") {
            window.InternshipResidency.lifeUI.consumePendingLink(_rtNewTask.id);
          }
        } catch (e) {}
        if (_rtIsRelevantTask(_rtNewTask)) {
          _rtNotify("task_added", {
            id: _rtNewTask.id, sourceType: "task", date: _rtNewTask.date, title: _rtNewTask.title,
            after: { title: _rtNewTask.title, date: _rtNewTask.date, time: _rtNewTask.time || null, durationMinutes: (typeof _rtNewTask.durationMinutes === "number" ? _rtNewTask.durationMinutes : null) }
          });
        }
        toast("کار اضافه شد");
      }
      saveState();
      close();
      render();
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#tf-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  function confirmDeleteTask(id) {
    const task = state.tasks.find((t) => t.id === id);
    if (!task) return;
    openModal({
      title: "حذف کار",
      message: `آیا از حذف «${escapeHTML(task.title)}» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        var _rtWasRelevant = _rtIsRelevantTask(task);
        var _rtSnap = {
          title: task.title, date: task.date,
          time: task.time || null,
          durationMinutes: (typeof task.durationMinutes === "number" ? task.durationMinutes : null)
        };
        state.tasks = state.tasks.filter((t) => t.id !== id);
        if (_rtWasRelevant) _rtNotify("task_removed", {
          id: id, date: task.date, sourceType: "task", title: task.title,
          before: _rtSnap
        });
        saveState();
        render();
        toast("کار حذف شد");
      }
    });
  }
  function resolveResidencyType(task) {
    if (!task) return "study";
    // اگه نوع صریح غیر از "other" تنظیم شده، همون رو برگردون
    if (task.taskType && task.taskType !== "other") return task.taskType;

    const title = String(task.title || "").trim();
    if (!title) return "study";

    // ۱. مرور / ریویو
    if (/مرور|ریویو|review/i.test(title)) return "review";
    // ۲. آزمون / امتحان / شبیه‌ساز
    if (/آزمون|امتحان|شبیه.{0,3}ساز|exam/i.test(title)) return "exam";
    // ۳. تست / سوال / کوئیز
    if (/تست|سوال|سؤال|کوئیز|quiz|question/i.test(title)) return "question";
    // ۴. پیش‌فرض → مطالعه
    return "study";
  }


  function spawnNextOccurrence(task) {
    if (!task.recurrence || task.recurrence === "none") return;
    const p = parseJalali(task.date);
    if (!p) return;
    let next;
    if (task.recurrence === "daily") next = addJalaliDays(p.jy, p.jm, p.jd, 1);
    else if (task.recurrence === "weekly") next = addJalaliDays(p.jy, p.jm, p.jd, 7);
    else if (task.recurrence === "monthly") {
      next = addJalaliMonthsToDate(p.jy, p.jm, p.jd, 1);
    } else return;

    const nextDate = dateKey(next.jy, next.jm, next.jd);
    if (state.tasks.some((t) => t.title === task.title && t.areaId === task.areaId && t.date === nextDate)) return;

    const now = Date.now();
    const id = _mkId("t");
    state.tasks.push({
      id, title: task.title, areaId: task.areaId, date: nextDate,
      time: task.time || "", priority: task.priority || "normal",
      recurrence: task.recurrence, description: task.description || "",
      completed: false,
      sourceType: task.sourceType || "manual",
      sourceId: task.sourceId || null,
      taskType: task.taskType || "other",
      createdAt: now,
      updatedAt: now
    });
  }
  /* ╔═══ [PATCH:attachments-db] ═══╗ */
  /* ذخیره‌ی فایل‌های کیس‌لاگ از طریق API سرور محلی */

  function attachmentUrl(caseId, storedName) {
    return API_BASE + "/api/attachment/" +
      encodeURIComponent(caseId) + "/" +
      encodeURIComponent(storedName);
  }

  function saveAttachment(caseId, file, onProgress) {
    return new Promise((resolve, reject) => {
      const fd = new FormData();
      fd.append("caseId", caseId);
      fd.append("file", file, file.name || "file");
      const xhr = new XMLHttpRequest();
      xhr.open("POST", API_BASE + "/api/upload", true);
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && typeof onProgress === "function") {
          onProgress((e.loaded / e.total) * 100);
        }
      };
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const j = JSON.parse(xhr.responseText);
            if (j && j.attachment && j.attachment.id) {
              if (typeof onProgress === "function") onProgress(100);
              resolve(j.attachment.id);
            } else reject(new Error("invalid response"));
          } catch (e) { reject(e); }
        } else {
          reject(new Error("upload failed: " + xhr.status));
        }
      };
      xhr.onerror = () => reject(new Error("network error"));
      xhr.send(fd);
    });
  }

  // ─── Progress UI ───
  function showUploadProgress(fileName, index, total) {
    let overlay = document.getElementById("upload-progress-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "upload-progress-overlay";
      overlay.className = "upload-progress-overlay";
      overlay.innerHTML = `
        <div class="upload-progress-box">
          <div class="upload-progress-title">💾 در حال ذخیره‌ی فایل...</div>
          <div class="upload-progress-file" id="upload-progress-file"></div>
          <div class="upload-progress-track">
            <div class="upload-progress-fill" id="upload-progress-fill"></div>
          </div>
          <div class="upload-progress-pct" id="upload-progress-pct">۰٪</div>
        </div>
      `;
      document.body.appendChild(overlay);
    }
    const fileEl = overlay.querySelector("#upload-progress-file");
    if (fileEl) {
      fileEl.textContent = (total > 1)
        ? `فایل ${faNum(index)} از ${faNum(total)} — ${fileName}`
        : fileName;
    }
    updateUploadProgress(0);
    requestAnimationFrame(() => overlay.classList.add("open"));
  }

  function updateUploadProgress(pct) {
    const overlay = document.getElementById("upload-progress-overlay");
    if (!overlay) return;
    const fill = overlay.querySelector("#upload-progress-fill");
    const pctEl = overlay.querySelector("#upload-progress-pct");
    if (fill) fill.style.width = pct + "%";
    if (pctEl) pctEl.textContent = faNum(Math.round(pct)) + "٪";
  }

  function hideUploadProgress() {
    const overlay = document.getElementById("upload-progress-overlay");
    if (!overlay) return;
    overlay.classList.remove("open");
    setTimeout(() => {
      const el = document.getElementById("upload-progress-overlay");
      if (el) el.remove();
    }, 250);
  }

  function listAttachmentsByCase(caseId) {
    return fetch(API_BASE + "/api/attachments?caseId=" + encodeURIComponent(caseId))
      .then((r) => {
        if (!r.ok) throw new Error("list failed: " + r.status);
        return r.json();
      })
      .then((j) => {
        const items = Array.isArray(j.attachments) ? j.attachments : [];
        items.sort((a, b) => (a.uploadedAt || 0) - (b.uploadedAt || 0));
        return items;
      });
  }

  function deleteAttachment(attId, caseId) {
    return fetch(
      API_BASE + "/api/attachment-delete/" +
      encodeURIComponent(caseId) + "/" +
      encodeURIComponent(attId),
      { method: "DELETE" }
    ).then((r) => {
      if (!r.ok) throw new Error("delete failed: " + r.status);
      return r.json();
    });
  }

  // ─── حذف کل پوشه‌ی کیس روی سرور ───
  function deleteCaseAttachments(caseId) {
    return fetch(API_BASE + "/api/case-delete/" + encodeURIComponent(caseId), {
      method: "DELETE"
    }).then((r) => {
      if (!r.ok) throw new Error("case-delete failed: " + r.status);
      return r.json();
    });
  }

  // ─── آپدیت counter پیوست توی کارت کیس (بدون rebuild کل UI) ───
  function updateCaseCardCounter(caseId) {
    const card = document.querySelector('.case-card-v2[data-case-id="' + caseId + '"]');
    if (!card) return;
    const c = state.cases.find((x) => x.id === caseId);
    if (!c) return;
    const attachments = Array.isArray(c.attachments) ? c.attachments : [];
    const side = card.querySelector(".case-card-v2-side");
    if (!side) return;

    // ─── پیدا کردن استت موجود ───
    let attachStat = side.querySelector(".case-card-v2-stat.is-attach");
    if (attachments.length === 0) {
      if (attachStat) attachStat.remove();
    } else {
      if (!attachStat) {
        attachStat = document.createElement("div");
        attachStat.className = "case-card-v2-stat is-attach";
        attachStat.innerHTML = `
          <span class="case-card-v2-stat-num"></span>
          <span class="case-card-v2-stat-label">پیوست</span>
        `;
        side.appendChild(attachStat);
      }
      const num = attachStat.querySelector(".case-card-v2-stat-num");
      if (num) num.textContent = "📎 " + faNum(attachments.length);
    }
  }
  function getAttachmentsStats() {
    const caseIds = (Array.isArray(state.cases) ? state.cases : [])
      .map((c) => c.id)
      .filter(Boolean)
      .join(",");
    const url = API_BASE + "/api/attachments-stats" +
      (caseIds ? "?caseIds=" + encodeURIComponent(caseIds) : "?caseIds=");
    return fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("stats failed: " + r.status);
        return r.json();
      })
      .then((j) => ({ count: j.count || 0, totalSize: j.totalSize || 0 }));
  }

  function cleanupOrphanFolders() {
    const caseIds = (Array.isArray(state.cases) ? state.cases : [])
      .map((c) => c.id)
      .filter(Boolean);
    return fetch(API_BASE + "/api/cleanup-orphans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caseIds })
    })
      .then((r) => r.json())
      .catch((err) => {
        console.warn("[cleanup] failed:", err);
        return { removed: 0 };
      });
  }


  function countAllAttachments() {
    return getAttachmentsStats().then((s) => s.count);
  }

  function getAttachment() { return Promise.resolve(null); }
  function openAttachmentsDB() { return Promise.resolve(null); }

  function formatBytes(bytes) {
    if (!bytes) return "۰";
    if (bytes < 1024) return faNum(bytes) + " B";
    if (bytes < 1024 * 1024) return faNum(Math.round(bytes / 1024)) + " KB";
    if (bytes < 1024 * 1024 * 1024) return faNum(Math.round(bytes / 1024 / 1024 * 10) / 10) + " MB";
    return faNum(Math.round(bytes / 1024 / 1024 / 1024 * 100) / 100) + " GB";
  }

  /* ╚═══ [/PATCH:attachments-db] ═══╝ */

  /* ─── Clinical hub ─────────────────────────────────────── */

  let clinicalTab = "timeline";

  function renderClinicalHub() {
    const tabs = [
      { id: "timeline",   icon: "🗓️", label: "مسیر اینترنی" },
      { id: "curriculum", icon: "📚", label: "کوریکولوم" },
      { id: "cases",      icon: "📝", label: "کیس‌ها" },
      { id: "procedures", icon: "🩹", label: "پروسیجرها" }
    ];

    const tabsHTML = `
      <div class="clinical-tabs" role="tablist">
        ${tabs.map((t) => `
          <button class="clinical-tab ${clinicalTab === t.id ? "active" : ""}"
                  data-clinical-tab="${t.id}" type="button" role="tab">
            <span aria-hidden="true">${t.icon}</span><span>${t.label}</span>
          </button>
        `).join("")}
      </div>
    `;

    let content = "";
    if (clinicalTab === "timeline")        content = renderTimelineTab();
    else if (clinicalTab === "curriculum") content = renderCurriculumTab();
    else if (clinicalTab === "cases")      content = renderCasesTab();
    else if (clinicalTab === "procedures") content = renderContentAreaPage("procedures");
    else                                    content = renderAreaStructureHTML("clinical");

    view.innerHTML = tabsHTML + '<div class="clinical-content">' + content + '</div>';

    document.title = "بالین — Internship OS";

    // ─── wire clinical tabs ───
    view.querySelectorAll("[data-clinical-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        clinicalTab = btn.dataset.clinicalTab;
        renderClinicalHub();
      });
    });

    // ─── wire content area events (برای procedures) ───
    if (clinicalTab === "procedures") {
      wireContentAreaPage("procedures");
    } else {
      if (clinicalTab === "timeline")   wireTimelineEvents();
      if (clinicalTab === "curriculum") wireCurriculumEvents();
      if (clinicalTab === "cases")      wireCasesEvents();
    }
  }

  function placeholder(icon, title, text, tag) {
    return `
      <section class="placeholder">
        <span class="placeholder-icon" aria-hidden="true">${icon}</span>
        <h2>${title}</h2>
        <p>${text}</p>
        <span class="phase-tag">${tag}</span>
      </section>
    `;
  }

  /* ─── Timeline tab ─────────────────────────────────────── */

   function renderTimelineTab() {
    const startStr = state.workspace.internshipStart;
    const startP = startStr ? parseJalali(startStr) : null;
    if (!startP) return renderStartSetup();

    let endStr = state.workspace.internshipEnd;
    if (!endStr) {
      const e = addJalaliMonthsToDate(startP.jy, startP.jm, startP.jd, 18);
      endStr = dateKey(e.jy, e.jm, e.jd);
    }
    const endP = parseJalali(endStr);

    // اگه اولین چرخش قبل از internshipStart شروع می‌شه،
    // تایم‌لاین رو از اول اولین چرخش حساب کن
    let timelineStartP = startP;
    if (state.rotations.length > 0) {
      const firstRotStart = parseJalali(state.rotations[0].startDate);
      if (firstRotStart &&
          compareJalaliDate(state.rotations[0].startDate, state.workspace.internshipStart) < 0) {
        timelineStartP = firstRotStart;
      }
    }

    const startDay = jalaliToDayNumber(timelineStartP.jy, timelineStartP.jm, timelineStartP.jd);
    const endDay   = jalaliToDayNumber(endP.jy, endP.jm, endP.jd);
    const totalDays = Math.max(endDay - startDay, 1);

    const todayStr = todayJalali();
    const todayP = parseJalali(todayStr);
    const todayDay = jalaliToDayNumber(todayP.jy, todayP.jm, todayP.jd);
    const todayPercent = ((todayDay - startDay) / totalDays) * 100;
    const inRange = todayPercent >= 0 && todayPercent <= 100;

    const currentRot = state.rotations.find((r) =>
      compareJalaliDate(r.startDate, todayStr) <= 0 && compareJalaliDate(todayStr, r.endDate) <= 0
    );

    const bars = state.rotations.map((r) => {
      const rp = parseJalali(r.startDate);
      const re = parseJalali(r.endDate);
      if (!rp || !re) return null;
      const rs = jalaliToDayNumber(rp.jy, rp.jm, rp.jd);
      const reN = jalaliToDayNumber(re.jy, re.jm, re.jd);
      const offset = Math.max(0, Math.min(100, ((rs - startDay) / totalDays) * 100));
      const width  = Math.max(1, Math.min(100 - offset, ((reN - rs + 1) / totalDays) * 100));
      return { rot: r, offset, width };
    }).filter(Boolean);

    const months = [];
    for (let i = 0; i < 18; i++) {
      months.push(addJalaliMonthsToDate(timelineStartP.jy, timelineStartP.jm, timelineStartP.jd, i));
    }

    let currentHTML;
    if (currentRot) {
      const c = parseJalali(currentRot.startDate);
      const ce = parseJalali(currentRot.endDate);
      const rotStart = jalaliToDayNumber(c.jy, c.jm, c.jd);
      const rotEnd = jalaliToDayNumber(ce.jy, ce.jm, ce.jd);
      const rotTotal = rotEnd - rotStart + 1;
      const rotDone = Math.min(rotTotal, todayDay - rotStart + 1);
      const pct = Math.round((rotDone / rotTotal) * 100);
      const color = currentRot.color || "45, 212, 191";

      currentHTML = `
        <div class="current-rotation-card" style="--rotation-color:rgb(${color})">
          <span class="now-label">اکنون در چرخش</span>
          <h2 class="current-rotation-title">${escapeHTML(currentRot.title)}</h2>
          ${currentRot.location ? `<p class="current-rotation-sub">${escapeHTML(currentRot.location)}</p>` : ""}
          <div class="current-rotation-period">
            <span><strong>شروع:</strong> ${prettyDateWD(c.jy, c.jm, c.jd)}</span>
            <span><strong>پایان:</strong> ${prettyDateWD(ce.jy, ce.jm, ce.jd)}</span>
            <span><strong>${faNum(pct)}٪</strong> گذشت</span>
          </div>
          <div class="progress">
            <div class="progress-track">
              <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg, rgba(${color},.65), rgb(${color}))"></div>
            </div>
          </div>
        </div>
      `;
    } else {
      currentHTML = `
        <div class="current-rotation-card" style="--rotation-color:rgba(148,163,184,.7)">
          <span class="now-label" style="background:rgba(148,163,184,.7)">خارج از چرخش‌ها</span>
          <h2 class="current-rotation-title">در حال حاضر در چرخشی نیستی</h2>
          <p class="current-rotation-sub">می‌توانی یک چرخش جدید اضافه کنی یا تاریخ شروع اینترنی را ویرایش کنی.</p>
        </div>
      `;
    }

    const startInfo = `
      <div class="timeline-info-row">
        <span class="timeline-info-text">شروع اینترنی: <strong>${prettyDateWD(startP.jy, startP.jm, startP.jd)}</strong></span>
        <button class="timeline-edit-btn" type="button" data-edit-start>✏️ ویرایش تاریخ شروع</button>
      </div>
    `;

    return `
      <div class="timeline-top-grid">
        <div>${startInfo}</div>
        <div>${currentHTML}</div>
      </div>
      <div class="timeline-rail-wrap">
        <div class="timeline-inner">
          <div class="timeline-rail">
            ${inRange ? `<div class="timeline-today" style="right:${todayPercent}%"></div>` : ""}
            ${bars.map((b) => {
              const abbr = rotationAbbrev(b.rot.title);
              const showLabel = b.width >= 4 && abbr;
              return `
                <div class="timeline-rotation"
                     style="right:${b.offset}%;width:${b.width}%;background:rgb(${b.rot.color || "45, 212, 191"})"
                     title="${escapeHTML(b.rot.title)} — ${b.rot.startDate} تا ${b.rot.endDate}">
                  ${showLabel ? `<span class="timeline-rotation-abbr">${abbr}</span>` : ""}
                </div>
              `;
            }).join("")}
          </div>
          <div class="timeline-months">
${months.map((m) => `<div class="timeline-month">${JMONTHS[m.jm - 1]}<br><span>${faNum(m.jy)}</span></div>`).join("")}          </div>
        </div>
      </div>
      <div class="rotations-header">
        <h3>چرخش‌ها <span style="color:var(--text-dim);font-weight:500">(${faNum(state.rotations.length)})</span></h3>
        <div class="rotations-actions">
          ${state.rotations.length === 0 ? `
            <button class="btn ghost small" type="button" data-load-template>📋 بارگذاری قالب پیش‌فرض</button>
          ` : ""}
          <button class="btn primary" type="button" data-add-rotation>+ افزودن چرخش</button>
        </div>
      </div>
      ${state.rotations.length === 0
        ? '<div class="empty-rotations"><p>هنوز چرخشی ثبت نشده. با دکمه‌ی «افزودن چرخش» شروع کن.</p></div>'
        : `<div class="rotations-list">${state.rotations.map((r) => rotationCardHTML(r, todayStr)).join("")}</div>`}
    `;
  }

  function renderStartSetup() {
    const t = parseJalali(todayJalali());
    return `
      <div class="setup-card">
        <h3>شروع اینترنی را ثبت کن</h3>
        <p>با ثبت تاریخ شروع، مسیر ۱۸ ماهه‌ی اینترنی‌ات ساخته می‌شود.</p>
        <div class="setup-row">
          <div class="form-row" style="margin:0">
            <label>تاریخ شروع اینترنی</label>
            ${datePickerHTML("setup-start", t.jy, t.jm, t.jd)}
          </div>
          <button class="btn primary" type="button" data-set-start>ثبت و شروع</button>
        </div>
      </div>
    `;
  }

  function rotationCardHTML(r, todayStr) {
    const rp = parseJalali(r.startDate);
    const re = parseJalali(r.endDate);
    if (!rp || !re) return "";
    const isActive = compareJalaliDate(r.startDate, todayStr) <= 0 && compareJalaliDate(todayStr, r.endDate) <= 0;
    const color = r.color || "45, 212, 191";
    const months = rotationMonths(r.startDate, r.endDate);
    return `
      <div class="rotation-card" draggable="true" data-rotation-id="${r.id}">
        <span class="rotation-drag-handle" title="برای جابه‌جایی بکش" aria-hidden="true">≡</span>
        <div class="rotation-color-strip" style="background:rgb(${color})"></div>
        <div class="rotation-body">
          <div class="rotation-title-row">
            <span class="rotation-card-title">${escapeHTML(r.title)}</span>
            ${isActive ? '<span class="rotation-active-pill">فعال</span>' : ""}
          </div>
          <div class="rotation-card-dates">${prettyDateWD(rp.jy, rp.jm, rp.jd)} → ${prettyDateWD(re.jy, re.jm, re.jd)} <span class="rotation-months-pill">${faNum(months)} ماه</span></div>
          ${r.location ? `<div class="rotation-card-loc">📍 ${escapeHTML(r.location)}</div>` : ""}
          ${r.notes ? `<div class="rotation-card-notes">${escapeHTML(r.notes)}</div>` : ""}
        </div>
        <div class="rotation-actions">
          <button class="task-action" type="button" data-edit-rotation="${r.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-delete-rotation="${r.id}" title="حذف">🗑️</button>
        </div>
      </div>
    `;
  }

  /* ─── Rotation abbreviations ──────────────────────────── */

  const ROTATION_ABBREV = {
    "اطفال": "PEDS",
    "داخلی": "IM",
    "جراحی": "SURG",
    "زنان و زایمان": "OB/GYN",
    "قلب": "CARDI",
    "عفونی": "ID",
    "اورژانس": "EM",
    "گوش، حلق، بینی": "ENT",
    "پزشکی اجتماعی": "SOC",
    "پوست": "DERM",
    "ارولوژی": "URO",
    "روانپزشکی": "PSYCH"
  };

  function rotationAbbrev(title) {
    if (!title) return "";
    if (ROTATION_ABBREV[title]) return ROTATION_ABBREV[title];
    // جستجوی تقریبی
    for (const key of Object.keys(ROTATION_ABBREV)) {
      if (title.indexOf(key) !== -1 || key.indexOf(title) !== -1) {
        return ROTATION_ABBREV[key];
      }
    }
    return "";
  }

  /* ─── Rotation drag & drop helpers ────────────────────── */

  function rotationMonths(startStr, endStr) {
    const sp = parseJalali(startStr);
    const ep = parseJalali(endStr);
    if (!sp || !ep) return 1;
    const days = jalaliToDayNumber(ep.jy, ep.jm, ep.jd) - jalaliToDayNumber(sp.jy, sp.jm, sp.jd) + 1;
    return Math.max(1, Math.round(days / 30));
  }

  function recalculateRotationDates() {
    const startP = parseJalali(state.workspace.internshipStart);
    if (!startP) return;

    // شروع همه چرخش‌ها از اول ماه
    let curJy = startP.jy;
    let curJm = startP.jm;

    state.rotations.forEach((rot) => {
      const months = rotationMonths(rot.startDate, rot.endDate);

      // شروع: اول ماه
      rot.startDate = dateKey(curJy, curJm, 1);

      // پایان: آخرین روز ماه (months - 1) بعد
      const nextMonth = addJalaliMonths(curJy, curJm, months);
      const lastMonth = addJalaliMonths(nextMonth.jy, nextMonth.jm, -1);
      const lastDay = jalaliMonthLength(lastMonth.jy, lastMonth.jm);
      rot.endDate = dateKey(lastMonth.jy, lastMonth.jm, lastDay);

      // cursor
      curJy = nextMonth.jy;
      curJm = nextMonth.jm;
    });

    const last = state.rotations[state.rotations.length - 1];
    if (last) state.workspace.internshipEnd = last.endDate;
  }



  /* ─── Default 18-month template ───────────────────────── */

  const ROTATION_TEMPLATE = [
    { title: "اطفال",             months: 3, icon: "👶", color: "251, 146, 60"  },  // نارنجی گرم
    { title: "داخلی",             months: 3, icon: "🫀", color: "59, 130, 246"  },  // آبی
    { title: "جراحی",             months: 2, icon: "🔪", color: "220, 38, 38"   },  // قرمز تیره
    { title: "زنان و زایمان",     months: 2, icon: "🤰", color: "236, 72, 153"  },  // صورتی
    { title: "قلب",               months: 1, icon: "❤️", color: "244, 63, 94"   },  // رز
    { title: "عفونی",             months: 1, icon: "🦠", color: "16, 185, 129"  },  // زمردی
    { title: "اورژانس",           months: 1, icon: "🚨", color: "249, 115, 22"  },  // نارنجی
    { title: "گوش، حلق، بینی",    months: 1, icon: "👂", color: "6, 182, 212"   },  // فیروزه‌ای
    { title: "پزشکی اجتماعی",     months: 1, icon: "🏥", color: "20, 184, 166"  },  // تیل
    { title: "پوست",              months: 1, icon: "🩹", color: "192, 38, 211"  },  // ارغوانی
    { title: "ارولوژی",           months: 1, icon: "💧", color: "99, 102, 241"  },  // نیلی
    { title: "روانپزشکی",         months: 1, icon: "🧠", color: "139, 92, 246"  }   // بنفش
  ];

  function confirmLoadTemplate() {
    if (!state.workspace.internshipStart) {
      toast("ابتدا تاریخ شروع اینترنی را ثبت کن", "error");
      return;
    }
    const totalMonths = ROTATION_TEMPLATE.reduce((s, r) => s + r.months, 0);

    openModal({
      title: "بارگذاری قالب پیش‌فرض",
      message:
        `قالب استاندارد شامل <strong>${faNum(ROTATION_TEMPLATE.length)} چرخش</strong> در <strong>${faNum(totalMonths)} ماه</strong> است:<br><br>` +
        ROTATION_TEMPLATE.map((r) => `• ${r.icon} ${escapeHTML(r.title)} — ${faNum(r.months)} ماه`).join("<br>") +
        `<br><br>چرخش‌ها به‌ترتیب از تاریخ شروع اینترنی‌ات محاسبه می‌شوند.` +
        `<br><br>مطمئنی؟`,
      confirmText: "بارگذاری کن",
      onConfirm: () => {
        loadRotationTemplate();
      }
    });
  }

  function loadRotationTemplate() {
    const startP = parseJalali(state.workspace.internshipStart);
    if (!startP) { toast("تاریخ شروع نامعتبر است", "error"); return; }

    // همه چرخش‌ها از اول همان ماهِ شروع اینترنی شروع می‌شن
    let curJy = startP.jy;
    let curJm = startP.jm;

    // پاک‌کردن چرخش‌های فعلی
    state.rotations = [];
    const now = Date.now();

    ROTATION_TEMPLATE.forEach((item, idx) => {
      // شروع: اول ماه
      const startJ = { jy: curJy, jm: curJm, jd: 1 };

      // پایان: آخرین روز از ماه (item.months - 1) بعد
      const nextMonth = addJalaliMonths(curJy, curJm, item.months);
      const lastMonth = addJalaliMonths(nextMonth.jy, nextMonth.jm, -1);
      const lastDay = jalaliMonthLength(lastMonth.jy, lastMonth.jm);
      const endJ = { jy: lastMonth.jy, jm: lastMonth.jm, jd: lastDay };

      const id = _mkId("r");
      state.rotations.push({
        id,
        title: item.title,
        startDate: dateKey(startJ.jy, startJ.jm, startJ.jd),
        endDate: dateKey(endJ.jy, endJ.jm, endJ.jd),
        location: "",
        notes: "",
        color: item.color,
        clinicalModuleId: ""
      });

      // cursor برای چرخش بعدی: اول ماه بعد از این چرخش
      curJy = nextMonth.jy;
      curJm = nextMonth.jm;
    });

    // تاریخ پایان اینترنی
    const finalEnd = state.rotations[state.rotations.length - 1].endDate;
    state.workspace.internshipEnd = finalEnd;

    saveState();
    renderClinicalHub();
    toast(`${faNum(state.rotations.length)} چرخش بارگذاری شد`);
  }

  /* ─── Drag & drop rotations ───────────────────────────── */

  function wireRotationDragDrop() {
    const cards = view.querySelectorAll(".rotation-card[data-rotation-id]");
    if (!cards.length) return;

    let dragId = null;

    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        dragId = card.dataset.rotationId;
        card.classList.add("dragging");
        e.dataTransfer.effectAllowed = "move";
        try { e.dataTransfer.setData("text/plain", dragId); } catch (err) {}
      });

      card.addEventListener("dragend", () => {
        dragId = null;
        cards.forEach((c) => {
          c.classList.remove("dragging", "drag-over", "drag-under");
        });
      });

      card.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (card.dataset.rotationId === dragId) return;

        const rect = card.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const above = e.clientY < mid;

        cards.forEach((c) => c.classList.remove("drag-over", "drag-under"));
        card.classList.add(above ? "drag-over" : "drag-under");
      });

      card.addEventListener("dragleave", () => {
        card.classList.remove("drag-over", "drag-under");
      });

      card.addEventListener("drop", (e) => {
        e.preventDefault();
        const targetId = card.dataset.rotationId;
        if (!dragId || dragId === targetId) return;

        const rect = card.getBoundingClientRect();
        const mid = rect.top + rect.height / 2;
        const insertBefore = e.clientY < mid;

        const fromIdx = state.rotations.findIndex((r) => r.id === dragId);
        let toIdx = state.rotations.findIndex((r) => r.id === targetId);
        if (fromIdx === -1 || toIdx === -1) return;

        const [moved] = state.rotations.splice(fromIdx, 1);
        if (fromIdx < toIdx) toIdx--;
        if (!insertBefore) toIdx++;
        state.rotations.splice(toIdx, 0, moved);

        recalculateRotationDates();
        saveState();
        renderClinicalHub();
        toast("ترتیب چرخش‌ها به‌روزرسانی شد");
      });
    });
  }

  function wireTimelineEvents() {
    const editStartBtn = view.querySelector("[data-edit-start]");
    if (editStartBtn) editStartBtn.addEventListener("click", openEditStartDateModal);

    wireRotationDragDrop();

    const m = view.querySelector("#setup-start-month");
    const y = view.querySelector("#setup-start-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("setup-start"));
    if (y) y.addEventListener("change", () => refreshDatePicker("setup-start"));

    const setupBtn = view.querySelector("[data-set-start]");
    if (setupBtn) setupBtn.addEventListener("click", () => {
      const date = readDatePicker("setup-start");
      if (!date) return;
      state.workspace.internshipStart = date;
      saveState();
      renderClinicalHub();
      toast("تاریخ شروع ثبت شد");
    });

    const addBtn = view.querySelector("[data-add-rotation]");
    if (addBtn) addBtn.addEventListener("click", () => openRotationForm(null));

    const templateBtn = view.querySelector("[data-load-template]");
    if (templateBtn) templateBtn.addEventListener("click", confirmLoadTemplate);

    view.querySelectorAll("[data-edit-rotation]").forEach((b) => {
      b.addEventListener("click", () => openRotationForm(b.dataset.editRotation));
    });
    view.querySelectorAll("[data-delete-rotation]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteRotation(b.dataset.deleteRotation));
    });
  }

  function openEditStartDateModal() {
    const cur = parseJalali(state.workspace.internshipStart) || parseJalali(todayJalali());
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>ویرایش تاریخ شروع اینترنی</h3>
        <p style="margin-bottom:16px">با تغییر تاریخ شروع، موقعیت چرخش‌ها روی تایم‌لاین حفظ می‌شود.</p>
        <div class="form-row">
          <label>تاریخ شروع جدید</label>
          ${datePickerHTML("edit-start", cur.jy, cur.jm, cur.jd)}
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>ذخیره</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#edit-start-month");
    const y = overlay.querySelector("#edit-start-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("edit-start"));
    if (y) y.addEventListener("change", () => refreshDatePicker("edit-start"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      const date = readDatePicker("edit-start");
      if (!date) return;
      state.workspace.internshipStart = date;
      saveState();
      close();
      renderClinicalHub();
      toast("تاریخ شروع به‌روزرسانی شد");
    });
  }

  function openRotationForm(id) {
    const isEdit = !!id;
    const rot = isEdit ? state.rotations.find((x) => x.id === id) : null;
    if (isEdit && !rot) return;

    const t = parseJalali(todayJalali());
    const palette = DATA.rotationPalette || ["45, 212, 191"];
    const usedColors = state.rotations.map((x) => x.color);
    const defaultColor = palette.find((c) => !usedColors.includes(c)) || palette[0];

    let init;
    if (isEdit) {
      const sp = parseJalali(rot.startDate) || t;
      const ep = parseJalali(rot.endDate) || t;
      init = { title: rot.title, startJ: sp, endJ: ep, location: rot.location || "", notes: rot.notes || "", color: rot.color || defaultColor, clinicalModuleId: rot.clinicalModuleId || "", activitySchedule: (rot.activitySchedule && typeof rot.activitySchedule === "object") ? Object.assign({}, rot.activitySchedule) : null };
    } else {
      const endJ = addJalaliMonthsToDate(t.jy, t.jm, t.jd, 1);
      init = { title: "", startJ: t, endJ: endJ, location: "", notes: "", color: defaultColor, clinicalModuleId: "", activitySchedule: null };
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش چرخش" : "افزودن چرخش جدید"}</h3>
        <div class="form-row">
          <label for="rf-title">عنوان *</label>
          <input type="text" id="rf-title" placeholder="مثلاً: اطفال" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="form-row">
          <label>تاریخ شروع *</label>
          ${datePickerHTML("rf-start", init.startJ.jy, init.startJ.jm, init.startJ.jd)}
        </div>
        <div class="form-row">
          <label>تاریخ پایان *</label>
          ${datePickerHTML("rf-end", init.endJ.jy, init.endJ.jm, init.endJ.jd)}
        </div>
        <div class="form-row">
          <label for="rf-loc">محل (اختیاری)</label>
          <input type="text" id="rf-loc" placeholder="بیمارستان / بخش" autocomplete="off" value="${escapeHTML(init.location)}">
        </div>

        <div class="form-row">
          <label for="rf-module">ماژول بالینی متصل</label>
          <select id="rf-module">
            <option value="">— بدون ماژول —</option>
            ${getCurriculum().map((s) => `<option value="${s.id}" ${s.id === (rot && rot.clinicalModuleId || "") ? "selected" : ""}>${s.icon} ${escapeHTML(s.title)}</option>`).join("")}
          </select>
          <p class="form-hint">اگه این روتیشن به یه ماژول کوریکولوم وصل باشه، تسک‌های مطالعه‌ی مرتبط توی صفحه‌ی «مطالعه» جدا نمایش داده می‌شن.</p>
        </div>
        <div class="form-row">
          <label>رنگ</label>
          <div class="color-palette">
            ${palette.map((c) => `<button type="button" class="color-swatch ${c === init.color ? "selected" : ""}" data-color="${c}" style="background:rgb(${c})" aria-label="رنگ"></button>`).join("")}
          </div>
        </div>
        <div class="form-row">
<label>📅 روزهای فعالیت این بخش</label>
          <p class="form-hint" style="margin:0 0 8px">این الگو فقط برای تشخیص روزهای فعال روتیشن استفاده می‌شود و مستقیماً زمان مطالعه را تعیین نمی‌کند.</p>
          <div class="rf-schedule-grid" id="rf-schedule-grid">
            ${JWEEKDAYS.map((dayName, idx) => {
              const key = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"][idx];
              return `<div class="rf-schedule-row" data-rf-day="${key}">
                <span class="rf-schedule-label">${dayName}</span>
                <div class="rf-schedule-chips">
                  <button type="button" class="rf-schedule-chip" data-rf-status="active">فعال</button>
                  <button type="button" class="rf-schedule-chip" data-rf-status="light">سبک</button>
                  <button type="button" class="rf-schedule-chip" data-rf-status="inactive">غیرفعال</button>
                </div>
              </div>`;
            }).join("")}
          </div>
          <button type="button" class="btn ghost small" id="rf-schedule-reset" style="margin-top:8px">بازگشت به الگوی پیشنهادی</button>
        </div>
        <div class="form-row">
          <label for="rf-notes">یادداشت (اختیاری)</label><label for="rf-notes">یادداشت (اختیاری)</label>
          <textarea id="rf-notes" rows="2">${escapeHTML(init.notes)}</textarea>
        </div>
        <div class="modal-actions">
          ${isEdit ? '<button class="btn ghost" type="button" data-delete-task title="حذف">🗑️ حذف</button>' : ""}
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "ایجاد"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    let selectedColor = init.color;
    ["rf-start", "rf-end"].forEach((prefix) => {
      const m = overlay.querySelector("#" + prefix + "-month");
      const y = overlay.querySelector("#" + prefix + "-year");
      if (m) m.addEventListener("change", () => refreshDatePicker(prefix));
      if (y) y.addEventListener("change", () => refreshDatePicker(prefix));
    });
    overlay.querySelectorAll(".color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        selectedColor = sw.dataset.color;
        overlay.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
        sw.classList.add("selected");
      });
    // ─── [PATCH:rotation-schedule-v31] activity schedule wiring ───
    const RF_DAYS = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
    const _DEFAULT_SCHED = { saturday:"active", sunday:"active", monday:"active", tuesday:"active", wednesday:"active", thursday:"inactive", friday:"inactive" };
    var rfSchedule = init.activitySchedule
      ? Object.assign({}, init.activitySchedule)
      : (window.InternshipResidency && window.InternshipResidency.createActivitySchedule
          ? window.InternshipResidency.createActivitySchedule(null)
          : Object.assign({}, _DEFAULT_SCHED));

    function _syncScheduleChips() {
      var grid = overlay.querySelector("#rf-schedule-grid");
      if (!grid) return;
      RF_DAYS.forEach(function (k) {
        var row = grid.querySelector('[data-rf-day="' + k + '"]');
        if (!row) return;
        var cur = rfSchedule[k] || "inactive";
        row.querySelectorAll(".rf-schedule-chip").forEach(function (b) {
          b.classList.toggle("is-selected", b.dataset.rfStatus === cur);
        });
      });
    }
    _syncScheduleChips();

    var _grid = overlay.querySelector("#rf-schedule-grid");
    if (_grid) {
      _grid.addEventListener("click", function (e) {
        var chip = e.target.closest(".rf-schedule-chip");
        if (!chip) return;
        var row = chip.closest("[data-rf-day]");
        if (!row) return;
        var dayKey = row.getAttribute("data-rf-day");
        rfSchedule[dayKey] = chip.dataset.rfStatus;
        _syncScheduleChips();
      });
    }
    var _resetBtn = overlay.querySelector("#rf-schedule-reset");
    if (_resetBtn) {
      _resetBtn.addEventListener("click", function () {
        rfSchedule = (window.InternshipResidency && window.InternshipResidency.createActivitySchedule)
          ? window.InternshipResidency.createActivitySchedule(null)
          : Object.assign({}, _DEFAULT_SCHED);
        _syncScheduleChips();
      });
    }
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#rf-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#rf-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const startDate = readDatePicker("rf-start");
      const endDate   = readDatePicker("rf-end");
      if (compareJalaliDate(startDate, endDate) > 0) { toast("تاریخ پایان باید بعد از شروع باشد", "error"); return; }
      const location = overlay.querySelector("#rf-loc").value.trim();
      const notes = overlay.querySelector("#rf-notes").value.trim();
      const clinicalModuleId = overlay.querySelector("#rf-module").value;

      if (isEdit) {
        Object.assign(rot, { title, startDate, endDate, location, notes, color: selectedColor, clinicalModuleId, activitySchedule: Object.assign({}, rfSchedule) });
        toast("چرخش به‌روزرسانی شد");
      } else {
        const newId = _mkId("r");
        state.rotations.push({ id: newId, title, startDate, endDate, location, notes, color: selectedColor, clinicalModuleId, activitySchedule: Object.assign({}, rfSchedule) });
        toast("چرخش اضافه شد");
      }
      _rtNotify("rotation_changed", { id: isEdit ? rot.id : "new" });
      saveState();
      close();
      renderClinicalHub();
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#rf-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  function confirmDeleteRotation(id) {
    const rot = state.rotations.find((r) => r.id === id);
    if (!rot) return;
    openModal({
      title: "حذف چرخش",
      message: `آیا از حذف «${escapeHTML(rot.title)}» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        state.rotations = state.rotations.filter((r) => r.id !== id);
        saveState();
        renderClinicalHub();
        toast("چرخش حذف شد");
      }
    });
  }

  /* ─── Curriculum tab ───────────────────────────────────── */

  let studyView = "program";  // "program" | "proposed"
  const _contentSearch = { study: "", emergency: "" };
  let proceduresView = "program";
  let curriculumView = "list";
  let curriculumSpecialtyId = null;

  const MASTERY_STATES = [
    { value: 0, symbol: "⬜", label: "شروع نشده", weight: 0 },
    { value: 1, symbol: "🟡", label: "دیده‌ام",   weight: 0.5 },
    { value: 2, symbol: "🟢", label: "مسلط‌ام",   weight: 1 }
  ];
  /* ╔═══ [PATCH:motivation] ═══╗ */
  /* پیام‌های شخصی‌سازی‌شده — {name} با اسم کوچک کاربر جایگزین می‌شود */
    /* پیام‌های شخصی‌سازی‌شده — {name} با اسم کوچک کاربر جایگزین می‌شود */
  const MOTIVATION_MESSAGES_PERSONAL = [
    { text: "یک روز، بیماری با شنیدن صدای {name} کمتر می‌ترسد؛ گاهی همین، بخشی از درمان است.", emoji: "🩺" },
    { text: "دست‌های {name} فقط نسخه نمی‌نویسند؛ گاهی به یک آدم، حسِ تنها نبودن می‌دهند.", emoji: "🤍" },
    { text: "پشت هر پرونده، یک زندگی‌ست؛ {name}، قبل از تشخیص، آدم روبه‌رویت را ببین.", emoji: "👤" },
    { text: "شاید اسم {name} روی هیچ تابلویی نباشد، اما ممکن است در خاطر یک بیمار بماند.", emoji: "🌿" },
    { text: "یک نگاه آرام از {name}، گاهی برای بیماری که ترسیده، از ده‌ها جمله مهم‌تر است.", emoji: "🫂" },
    { text: "روزی کسی به {name} می‌گوید: «ممنون که ماندی»؛ بعضی لحظه‌ها دلیل این مسیرند.", emoji: "💙" },
    { text: "برای یک بیمار، {name} فقط پزشک نیست؛ انسانی‌ست که در سخت‌ترین لحظه کنارش ایستاده.", emoji: "❤️" },
    { text: "بین عددها، آزمایش‌ها و تشخیص‌ها، {name} هنوز باید صدای یک انسان را بشنود.", emoji: "👂" },
    { text: "بعضی کشیک‌ها فقط خسته‌ات نمی‌کنند؛ آرام‌آرام ظرفیتِ {name} را بیشتر می‌سازند.", emoji: "🌙" },
    { text: "امروز برای {name} سنگین است؛ قرار نیست همیشه سبک باشد، فقط قرار است بگذرد.", emoji: "🌧️" },
    { text: "خستگیِ {name} واقعی‌ست؛ لازم نیست انکارش کنی تا ادامه بدهی.", emoji: "🫶" },
    { text: "گاهی {name} فقط باید بیمار بعدی را ببیند، کار بعدی را انجام دهد، و شب را رد کند.", emoji: "🚶" },
    { text: "راه پزشکی طولانی‌ست؛ {name} لازم نیست همه‌اش را امروز طی کند.", emoji: "🛤️" },
    { text: "قوی بودنِ {name} همیشه شبیه جنگیدن نیست؛ گاهی یعنی آرام بمانی و کار درست را انجام دهی.", emoji: "🧭" },
    { text: "هر روزی که {name} با وجود خستگی یاد می‌گیرد، چیزی در پزشکِ آینده‌اش ساخته می‌شود.", emoji: "🌱" },
    { text: "اشتباه امروزِ {name}، اگر درست فهمیده شود، می‌تواند جلوی اشتباه فردا را بگیرد.", emoji: "🔎" },
    { text: "یک سؤال که امروز {name} پرسید، شاید فردا بخشی از یک تشخیص مهم باشد.", emoji: "❓" },
    { text: "پزشک شدن برای {name} از دانستن همه‌چیز شروع نمی‌شود؛ از بلد بودنِ یاد گرفتن شروع می‌شود.", emoji: "📚" },
    { text: "هر بار که {name} جواب را نمی‌داند و دنبال آن می‌گردد، یک قدم واقعی جلو رفته است.", emoji: "💡" },
    { text: "خوابِ {name} تنبلی نیست؛ مغزی که قرار است برای دیگران تصمیم بگیرد، به استراحت نیاز دارد.", emoji: "😴" },
    { text: "امروز اگر برای {name} فقط جای نفس کشیدن مانده، همان چند دقیقه را جدی بگیر.", emoji: "🌿" },
    { text: "مراقبت از بیمار با مراقبت از خودِ {name} در تضاد نیست؛ هر دو بخشی از پزشکی‌اند.", emoji: "🤍" },
    { text: "یک وعده غذای درست و چند ساعت خواب، برای ادامه‌ی مسیر {name} از صدها صفحه مهم‌تر می‌شود.", emoji: "🍎" },
    { text: "شاید {name} هنوز به مقصد نرسیده، اما دیگر همان آدمی نیست که این مسیر را شروع کرد.", emoji: "🌳" },
    { text: "بعضی روزها پیشرفتِ {name} دیده نمی‌شود؛ یادگیری عمیق معمولاً بی‌سروصدا اتفاق می‌افتد.", emoji: "🌱" },
    { text: "راهی که {name} انتخاب کرده، با یک شب سخت یا یک هفته بد تعریف نمی‌شود.", emoji: "🛤️" },
    { text: "آینده‌ی {name} از همین کارهای کوچک ساخته می‌شود؛ شرح حال دقیق، مطالعه‌ی امروز، یک بیمار بیشتر.", emoji: "🧩" },
    { text: "روزی می‌رسد که کاری که امروز برای {name} سخت است، تبدیل به بخشی از عادت دست و ذهنش می‌شود.", emoji: "✨" },
    { text: "رؤیای {name} شاید دور باشد؛ اما هر بیمار امروز، بخشی از مسیر رسیدن به آن است.", emoji: "🌅" },
    { text: "شاید روزی {name} کسی را نجات دهد؛ آن روز، ریشه‌اش در همین روزهای معمولی است.", emoji: "❤️" },
    { text: "رزیدنِ {name} فقط گرفتن یک عنوان نیست؛ ساختنِ پزشکی‌ست که می‌تواند در لحظه‌ی سخت مفید باشد.", emoji: "🎯" },
    { text: "آن آینده‌ای که {name} برایش این‌همه زحمت می‌کشد، از همین شیفت‌های ساده و خسته‌کننده ساخته می‌شود.", emoji: "🔥" },
    { text: "یک تشخیص درست، یک درد کمتر، یک خانواده‌ی آرام‌تر؛ گاهی تمام پاداشِ امروزِ {name} همین است.", emoji: "🌤️" },
    { text: "یک «ممنون دکتر» از یک بیمار، شاید کوچک باشد؛ برای {name} می‌تواند تمام روز را معنا کند.", emoji: "💙" },
    { text: "گاهی موفقیتِ {name} فقط این است که امروز چیزی را بهتر از دیروز انجام داد.", emoji: "📈" },
    { text: "شاید کسی متوجه نشود {name} امروز چقدر خسته بود؛ اما بیماری که کمک گرفت، چرا.", emoji: "🫂" },
    { text: "{name} فقط یک اسم نیست؛ پشتش سال‌ها تلاش، شب‌های بیداری و آرزوی مفید بودن ایستاده.", emoji: "🌟" },
    { text: "وقتی می‌گویند {name}، یک مسیر شنیده می‌شود؛ مسیری که هنوز ادامه دارد.", emoji: "🛤️" },
    { text: "در اسمِ {name}، فقط یک نفر نیست؛ پزشکی در حال شکل گرفتن است، آرام و واقعی.", emoji: "🌱" },
    { text: "{name} قرار نیست بی‌نقص باشد؛ قرار است هر بار کمی دقیق‌تر، مهربان‌تر و عاقل‌تر شود.", emoji: "🤍" }
  ];

  const MOTIVATION_MESSAGES = [
    { text: "همه‌ی روزها قرار نیست درخشان باشند؛ بعضی روزها فقط باید دوام بیاوری.", emoji: "🌱" },
    { text: "یک تشخیص درست، گاهی حاصل صد بار اشتباه کردن و دوباره نگاه کردن است.", emoji: "🩺" },
    { text: "امروز شاید خسته‌ای؛ لازم نیست قهرمان باشی، فقط پزشکِ حاضر و دقیق باش.", emoji: "🤍" },
    { text: "بیمار، قبل از اینکه پرونده باشد، یک آدم است؛ این را هیچ‌وقت فراموش نکن.", emoji: "🫂" },
    { text: "بعضی روزها پیشرفتت دیده نمی‌شود؛ اما تو آرام‌آرام داری عوض می‌شوی.", emoji: "🌿" },
    { text: "قرار نیست همه‌چیز را امروز بلد باشی؛ مهم این است که امروز کمی بیشتر بدانی.", emoji: "📚" },
    { text: "گاهی بزرگ‌ترین کمک، یک توضیح ساده و یک صدای آرام است.", emoji: "🕊️" },
    { text: "از یک کشیک سخت، چیزی با خودت ببر؛ حتی اگر فقط یک درس کوچک باشد.", emoji: "🌙" },
    { text: "اگر خسته‌ای، استراحت کردن عقب‌نشینی نیست؛ بخشی از ادامه دادن است.", emoji: "😴" },
    { text: "یک روزی می‌رسد که کار سخت امروز، برایت تبدیل به یک واکنش طبیعی شده است.", emoji: "✨" },
    { text: "لازم نیست همیشه سریع باشی؛ در پزشکی، درست بودن گاهی از سریع بودن مهم‌تر است.", emoji: "🩺" },
    { text: "شاید امروز نتیجه را نبینی؛ بعضی اثرها سال‌ها بعد خودشان را نشان می‌دهند.", emoji: "🌳" },
    { text: "یک بیمار ممکن است اسم تو را یادش بماند، چون آن روز به او آرامش دادی.", emoji: "🤍" },
    { text: "اشتباهت را پنهان نکن؛ بفهمش، اصلاحش کن، و بگذار به مهارت تبدیل شود.", emoji: "🔄" },
    { text: "پزشک شدن یک مقصد نیست؛ هر بیمار، بخشی از مسیر یادگیری توست.", emoji: "🛤️" },
    { text: "امروز فقط روی بیمار بعدی تمرکز کن؛ لازم نیست کل مسیر را یک‌جا طی کنی.", emoji: "🌿" },
    { text: "گاهی یک «ممنون دکتر» تمام خستگی یک روز را از یادت می‌برد.", emoji: "💙" },
    { text: "اگر امروز کم آوردی، خودت را سرزنش نکن؛ بدن تو هم بخشی از این مسیر است.", emoji: "🫶" },
    { text: "دانستن مهم است؛ اما بلد بودنِ گوش دادن، گاهی مهم‌تر است.", emoji: "👂" },
    { text: "هر بار که با دقت شرح حال می‌گیری، به تشخیص یک قدم نزدیک‌تر می‌شوی.", emoji: "🔎" },
    { text: "قرار نیست همه‌ی بیماران را نجات بدهی؛ اما می‌توانی در رنجشان تنها نمانیشان.", emoji: "🤍" },
    { text: "شب تمام می‌شود؛ تو هم باید گاهی چراغت را خاموش کنی و بخوابی.", emoji: "🌙" },
    { text: "آن چیزی که امروز بلد نیستی، می‌تواند موضوع مطالعه‌ی امشب باشد.", emoji: "📖" },
    { text: "پیشرفت همیشه شبیه فتح قله نیست؛ گاهی فقط یک اشتباه کمتر است.", emoji: "⛰️" },
    { text: "امروز لازم نیست بهترینِ بیمارستان باشی؛ فقط بهترین نسخه‌ی امروز خودت باش.", emoji: "🌱" },
    { text: "پزشکی فقط درمان بیماری نیست؛ گاهی یعنی کنار کسی بمانی تا نترسد.", emoji: "🫂" },
    { text: "یک روز به چیزهایی مسلط می‌شوی که امروز برای یادگیری‌شان خسته شده‌ای.", emoji: "✨" },
    { text: "اگر مسیر طولانی شده، به عقب نگاه کن؛ ببین چقدر از همان آدم قبلی دور شده‌ای.", emoji: "🌱" },
    { text: "گاهی کافی‌ست امروز را خوب تمام کنی؛ فردا، نوبتِ فرداست.", emoji: "☀️" },
    { text: "در میان همه‌ی عددها و آزمایش‌ها، یادت بماند یک انسان آن طرف تخت است.", emoji: "❤️" }
  ];

  const LAST_MOT_KEY = "internship-os.lastMotivationIdx";

  /**
   * یه پیام انگیزشی رندوم برمی‌گردونه.
   * - بین پیام‌های عمومی و شخصی به‌صورت رندوم انتخاب می‌کنه
   * - از تکرار پیام قبلی جلوگیری می‌کنه
   * - اگه کاربر اسم نداره، فقط پیام‌های عمومی رو می‌ده
   */

  /**
   * یه پیام رندوم می‌گیره و کارت انگیزشی توی داشبورد رو با انیمیشن آپدیت می‌کنه.
   * اگه کارت وجود نداشته باشه (کاربر توی صفحه‌ی دیگه)، فقط برمی‌گرده.
   */
  function applyNewMotivation() {
    const card = document.getElementById("dash-motivation");
    if (!card) return;

    const m = getRandomMotivation();

    card.classList.remove("is-flipping");
    void card.offsetWidth;
    card.classList.add("is-flipping");

    const emojiEl = card.querySelector(".dash-motivation-emoji");
    const textEl  = card.querySelector(".dash-motivation-text");
    if (emojiEl) emojiEl.textContent = m.emoji;
    if (textEl)  textEl.textContent  = m.text;
  }


  function getRandomMotivation() {
    const firstName = getFirstName();
    const allMessages = firstName
      ? MOTIVATION_MESSAGES.concat(MOTIVATION_MESSAGES_PERSONAL)
      : MOTIVATION_MESSAGES;

    let lastIdx = -1;
    try {
      const v = parseInt(localStorage.getItem(LAST_MOT_KEY), 10);
      if (!isNaN(v)) lastIdx = v;
    } catch (e) {}

    let idx = lastIdx;
    // تا ۱۰ بار تلاش کن تا پیام جدید پیدا کنی
    for (let i = 0; i < 10; i++) {
      idx = Math.floor(Math.random() * allMessages.length);
      if (idx !== lastIdx) break;
    }

    try { localStorage.setItem(LAST_MOT_KEY, String(idx)); } catch (e) {}

    const msg = allMessages[idx];
    const text = msg.text.replace(/\{name\}/g, firstName || "");
    return { text, emoji: msg.emoji };
  }

  /* ╚═══ [/PATCH:motivation] ═══╝ */

  /* ─── Content Layer merge ─────────────────────────────── */

  let _curriculumCache = null;
  let _curriculumBump = 0;
  let _curriculumCachedBump = -1;

  let _proceduresCache = null;
  let _proceduresBump = 0;
  let _proceduresCachedBump = -1;

  function bumpContentCache() {
    _curriculumBump++;
    _proceduresBump++;
  }

  function getCustomContent() {
    if (!state.customContent || typeof state.customContent !== "object") {
      state.customContent = {
        clinicalSpecialties: {},
        clinicalCategories: {},
        clinicalItems: {},
        procedureCategories: {},
        procedureItems: {},
        residencySubjects: {},
        residencyTopics: {},
        residencyResources: {}
      };
    }
    const c = state.customContent;
    if (!c.clinicalSpecialties) c.clinicalSpecialties = {};
    if (!c.clinicalCategories)  c.clinicalCategories  = {};
    if (!c.clinicalItems)       c.clinicalItems       = {};
    if (!c.procedureCategories) c.procedureCategories = {};
    if (!c.procedureItems)      c.procedureItems      = {};
    if (!c.residencySubjects)   c.residencySubjects   = {};
    if (!c.residencyTopics)     c.residencyTopics     = {};
    if (!c.residencyResources)  c.residencyResources  = {};
    return c;
  }

  function mergeCurriculum(base, custom) {
    const result = JSON.parse(JSON.stringify(base || []));
    const c = custom || {};

    // 1) تخصص‌های سفارشی
    Object.values(c.clinicalSpecialties || {}).forEach((spec) => {
      if (!spec || !spec.id) return;
      if (!result.find((s) => s.id === spec.id)) {
        result.push({
          id: spec.id,
          icon: spec.icon || "📚",
          title: spec.title || "بدون عنوان",
          subtitle: spec.subtitle || "",
          accent: spec.accent || "45, 212, 191",
          categories: [],
          isCustom: true
        });
      }
    });

    // 2) دسته‌های سفارشی
    Object.values(c.clinicalCategories || {}).forEach((cat) => {
      if (!cat || !cat.id || !cat.specialtyId) return;
      const spec = result.find((s) => s.id === cat.specialtyId);
      if (!spec) return;
      if (!spec.categories) spec.categories = [];
      if (!spec.categories.find((x) => x.id === cat.id)) {
        spec.categories.push({
          id: cat.id,
          title: cat.title || "بدون عنوان",
          items: [],
          isCustom: true
        });
      }
    });

    // 3) آیتم‌های سفارشی
    Object.values(c.clinicalItems || {}).forEach((item) => {
      if (!item || !item.id || !item.specialtyId || !item.categoryId) return;
      const spec = result.find((s) => s.id === item.specialtyId);
      if (!spec) return;
      const cat = (spec.categories || []).find((x) => x.id === item.categoryId);
      if (!cat) return;
      if (!cat.items) cat.items = [];
      const exists = cat.items.some((i) => {
        if (typeof i === "string") return i === item.title;
        if (i && typeof i === "object") return i.id === item.id;
        return false;
      });
      if (!exists) {
        cat.items.push({ id: item.id, title: item.title || "بدون عنوان", isCustom: true });
      }
    });

    return result;
  }

  function mergeProcedures(base, custom) {
    const result = JSON.parse(JSON.stringify(base || []));
    const c = custom || {};

    Object.values(c.procedureCategories || {}).forEach((cat) => {
      if (!cat || !cat.id) return;
      if (!result.find((x) => x.id === cat.id)) {
        result.push({
          id: cat.id,
          icon: cat.icon || "🔧",
          title: cat.title || "بدون عنوان",
          accent: cat.accent || "45, 212, 191",
          items: [],
          isCustom: true
        });
      }
    });

    Object.values(c.procedureItems || {}).forEach((item) => {
      if (!item || !item.categoryId || !item.title) return;
      const cat = result.find((x) => x.id === item.categoryId);
      if (!cat) return;
      if (!cat.items) cat.items = [];
      if (!cat.items.includes(item.title)) {
        cat.items.push(item.title);
      }
    });

    return result;
  }

  function getCurriculum() {
    if (_curriculumCache && _curriculumCachedBump === _curriculumBump) return _curriculumCache;
    _curriculumCache = mergeCurriculum(DATA.clinicalCurriculum || [], getCustomContent());
    _curriculumCachedBump = _curriculumBump;
    return _curriculumCache;
  }

  function getMastery(itemId) {
    const v = state.clinicalProgress && state.clinicalProgress[itemId];
    return typeof v === "number" ? v : 0;
  }

  function cycleMastery(itemId) {
    const cur = getMastery(itemId);
    if (!state.clinicalProgress) state.clinicalProgress = {};
    state.clinicalProgress[itemId] = (cur + 1) % 3;
    saveState();
  }

  function normalizeItem(spec, cat, ci, it, ii) {
    const baseId = spec.id + "-" + (cat.id || ci) + "-" + ii;
    if (typeof it === "string") return { id: baseId, title: it };
    if (it && typeof it === "object") return { id: it.id || baseId, title: it.title || it.name || "آیتم" };
    return { id: baseId, title: String(it || "آیتم") };
  }

  function getNormalizedCategory(spec, cat, ci) {
    return {
      id: cat.id || (spec.id + "-c" + ci),
      title: cat.title || "دسته",
      items: (cat.items || []).map((it, ii) => normalizeItem(spec, cat, ci, it, ii))
    };
  }

  function categoryProgress(cat) {
    if (!cat.items.length) return 0;
    const sum = cat.items.reduce((s, it) => s + MASTERY_STATES[getMastery(it.id)].weight, 0);
    return Math.round((sum / cat.items.length) * 100);
  }

  function specialtyProgress(spec) {
    const all = spec.categories.flatMap((c, ci) => getNormalizedCategory(spec, c, ci).items);
    if (!all.length) return 0;
    const sum = all.reduce((s, it) => s + MASTERY_STATES[getMastery(it.id)].weight, 0);
    return Math.round((sum / all.length) * 100);
  }

  function overallCurriculumProgress() {
    const cur = getCurriculum();
    const all = cur.flatMap((spec) => spec.categories.flatMap((c, ci) => getNormalizedCategory(spec, c, ci).items));
    if (!all.length) return 0;
    const sum = all.reduce((s, it) => s + MASTERY_STATES[getMastery(it.id)].weight, 0);
    return Math.round((sum / all.length) * 100);
  }

  function renderCurriculumTab() {
    if (curriculumView === "detail" && curriculumSpecialtyId) {
      const spec = getCurriculum().find((s) => s.id === curriculumSpecialtyId);
      if (spec) return renderCurriculumDetail(spec);
      curriculumView = "list";
    }
    return renderCurriculumList();
  }

  function renderCurriculumList() {
    const cur = getCurriculum();
    const overall = overallCurriculumProgress();
    const totalItems = cur.flatMap((spec) => spec.categories.flatMap((c, ci) => getNormalizedCategory(spec, c, ci).items)).length;

    const specHTML = cur.map((spec) => {
      const p = specialtyProgress(spec);
      const count = spec.categories.flatMap((c, ci) => getNormalizedCategory(spec, c, ci).items).length;
      return `
        <button class="spec-card" type="button" data-open-spec="${spec.id}" style="--accent:${spec.accent || "45, 212, 191"}">
          <span class="spec-card-head">
            <span class="spec-card-icon" aria-hidden="true">${spec.icon}</span>
            <span class="spec-card-titles">
              <span class="spec-card-title">${escapeHTML(spec.title)}</span>
              <span class="spec-card-sub">${escapeHTML(spec.subtitle || "")}</span>
            </span>
            <span class="spec-card-pct">${faNum(p)}٪</span>
          </span>
          <span class="progress-track"><span class="progress-fill" style="width:${p}%"></span></span>
          <span class="spec-card-foot">${faNum(count)} آیتم</span>
        </button>
      `;
    }).join("");

    return `
      <div class="curriculum-top">
        <div class="curriculum-hero">
          <div>
            <span class="hero-label">پیشرفت کوریکولوم بالینی</span>
            <div class="hero-value">${faNum(totalItems)} آیتم در ${faNum(cur.length)} تخصص</div>
            <p class="hero-sub">پیشرفت کلی: ${faNum(overall)}٪</p>
          </div>
          <div class="ring" style="--p:0" data-ring-target="${overall}">
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <defs>
                <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stop-color="#5eead4"/>
                  <stop offset="100%" stop-color="#818cf8"/>
                </linearGradient>
              </defs>
              <circle class="ring-bg" cx="60" cy="60" r="52"/>
              <circle class="ring-fg" cx="60" cy="60" r="52"/>
            </svg>
            <div class="ring-label">${faNum(overall)}٪</div>
          </div>
        </div>

        <div class="curriculum-actions">
          <div class="curriculum-toolbar">
            <button class="btn ghost small" type="button" data-ai-generator>🤖 تولید با AI</button>
            <button class="btn primary" type="button" data-add-specialty>+ افزودن تخصص</button>
          </div>
        </div>
      </div>

      <div class="spec-grid">${specHTML}</div>
    `;
  }

  function renderCurriculumDetail(spec) {
    const p = specialtyProgress(spec);
    const isCustomSpec = !!spec.isCustom;

    const catsHTML = spec.categories.map((cat, ci) => {
      const normCat = getNormalizedCategory(spec, cat, ci);
      const cp = categoryProgress(normCat);
      const isCustomCat = !!(cat.isCustom || customCategoryCheck(spec.id, cat.id));

      const itemsHTML = normCat.items.map((it) => {
        const sv = getMastery(it.id);
        const st = MASTERY_STATES[sv];
        const isCustomItem = customItemCheck(it.id);
        return `
          <li class="curriculum-item" data-mastery="${sv}">
            <button class="curriculum-item-btn" type="button" data-cycle-mastery="${it.id}">
              <span class="mastery-icon" aria-hidden="true">${st.symbol}</span>
              <span class="curriculum-item-title">${escapeHTML(it.title)}</span>
            </button>
            <span class="curriculum-item-actions">
              <button class="task-action curriculum-plan-btn" type="button"
                      data-plan-item="${it.id}"
                      data-plan-spec="${spec.id}"
                      data-plan-cat="${cat.id}"
                      data-plan-title="${escapeHTML(it.title)}"
                      title="افزودن به برنامه">➕</button>
              ${isCustomItem ? `
                <button class="task-action" type="button"
                        data-edit-citem="${it.id}" data-citem-spec="${spec.id}" data-citem-cat="${cat.id}"
                        title="ویرایش">✏️</button>
                <button class="task-action" type="button"
                        data-del-citem="${it.id}" data-citem-spec="${spec.id}" data-citem-cat="${cat.id}"
                        title="حذف">🗑️</button>
              ` : ""}
            </span>
          </li>
        `;
      }).join("");

      // شماره‌ی دسته برای نمایش
      const catNum = ci + 1;
      // نمایش پیشرفت به‌صورت mini ring
      const catItemsCount = normCat.items.length;
      const catDoneCount = normCat.items.filter((it) => getMastery(it.id) === 2).length;

      // پالت رنگ ملایم — چرخشی برای هر دسته
      const CAT_TINTS = [
        "45, 212, 191",    // teal
        "129, 140, 248",   // indigo
        "244, 114, 182",   // pink
        "251, 191, 36",    // amber
        "52, 211, 153",    // emerald
        "167, 139, 250"    // violet
      ];
      const catTint = CAT_TINTS[ci % CAT_TINTS.length];

      return `
        <div class="curriculum-category" data-cat-progress="${cp}" style="--cat-tint:${catTint}">
          <div class="curriculum-category-head">
            <div class="curriculum-category-head-left">
              <span class="curriculum-category-num">${faNum(catNum)}</span>
              <div class="curriculum-category-titles">
                <h4>${escapeHTML(normCat.title)}</h4>
                <span class="curriculum-category-meta">${faNum(catDoneCount)} از ${faNum(catItemsCount)} مسلط</span>
              </div>
            </div>
            <span class="category-head-right">
              <span class="curriculum-category-pct">${faNum(cp)}٪</span>
              ${isCustomCat ? `
                <button class="task-action" type="button"
                        data-edit-ccat="${cat.id}" data-ccat-spec="${spec.id}"
                        title="ویرایش دسته">✏️</button>
                <button class="task-action" type="button"
                        data-del-ccat="${cat.id}" data-ccat-spec="${spec.id}"
                        title="حذف دسته">🗑️</button>
              ` : ""}
            </span>
          </div>
          <div class="curriculum-category-track">
            <div class="curriculum-category-track-fill" style="width:${cp}%"></div>
          </div>
          <ul class="curriculum-items">
            ${itemsHTML || '<li class="curriculum-empty">آیتمی در این دسته نیست.</li>'}
          </ul>
          <div class="category-add-row">
            <button class="btn ghost small" type="button"
                    data-add-citem data-add-spec="${spec.id}" data-add-cat="${cat.id}">
              + افزودن آیتم
            </button>
          </div>
        </div>
      `;
    }).join("");

    return `
      <div class="curriculum-detail-head" style="--accent:${spec.accent || "45, 212, 191"};display:block">
        <button type="button" data-curriculum-back
                style="display:inline-flex;align-items:center;gap:6px;padding:6px 13px 6px 10px;font-size:12px;font-family:inherit;color:var(--text-muted);background:var(--surface-1);border:1px solid var(--border);border-radius:999px;cursor:pointer;width:auto;line-height:1.2;margin-bottom:16px">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
               stroke-linecap="round" stroke-linejoin="round"
               style="width:12px;height:12px;flex:0 0 12px">
            <line x1="5" y1="12" x2="19" y2="12"/>
            <polyline points="12 5 19 12 12 19"/>
          </svg>
          بازگشت
        </button>
        <div class="curriculum-detail-title-row">
          <span class="curriculum-detail-icon" aria-hidden="true">${spec.icon}</span>
          <div class="curriculum-detail-titles">
            <h2>${escapeHTML(spec.title)}</h2>
            <span class="sub">${escapeHTML(spec.subtitle || "")}</span>
          </div>
          <span class="curriculum-detail-pct">${faNum(p)}٪</span>
        </div>
        <div class="progress-track" style="margin-top:14px">
          <div class="progress-fill" style="width:${p}%"></div>
        </div>
        <div class="curriculum-detail-actions">
          <button class="btn ghost small" type="button" data-add-ccat data-add-spec="${spec.id}">
            + افزودن دسته
          </button>
          ${isCustomSpec ? `
            <button class="btn ghost small" type="button" data-edit-spec="${spec.id}">✏️ ویرایش تخصص</button>
            <button class="btn ghost small danger-ghost" type="button" data-del-spec="${spec.id}">🗑️ حذف تخصص</button>
          ` : ""}
        </div>
      </div>
      <div class="curriculum-detail-legend">
        <span class="legend-item"><span class="mastery-chip state-0">⬜</span> شروع نشده</span>
        <span class="legend-item"><span class="mastery-chip state-1">🟡</span> دیده‌ام</span>
        <span class="legend-item"><span class="mastery-chip state-2">🟢</span> مسلط‌ام</span>
        <span class="legend-hint">با کلیک روی هر آیتم، حالت تغییر می‌کند</span>
      </div>
      <div class="curriculum-categories">${catsHTML}</div>
    `;
  }

  function customCategoryCheck(specId, catId) {
    const c = getCustomContent();
    return !!(c.clinicalCategories[catId] && c.clinicalCategories[catId].specialtyId === specId);
  }

  function customItemCheck(itemId) {
    const c = getCustomContent();
    return !!c.clinicalItems[itemId];
  }

  function wireCurriculumEvents() {
    // افزودن تخصص
    
    const aiBtn = view.querySelector("[data-ai-generator]");
    if (aiBtn) aiBtn.addEventListener("click", () => openAIGenerator(null));
    
    const addSpecBtn = view.querySelector("[data-add-specialty]");
    if (addSpecBtn) addSpecBtn.addEventListener("click", () => openSpecialtyForm(null));

    // ویرایش/حذف تخصص
    const editSpecBtn = view.querySelector("[data-edit-spec]");
    if (editSpecBtn) editSpecBtn.addEventListener("click", () => openSpecialtyForm(editSpecBtn.dataset.editSpec));
    const delSpecBtn = view.querySelector("[data-del-spec]");
    if (delSpecBtn) delSpecBtn.addEventListener("click", () => confirmDeleteSpecialty(delSpecBtn.dataset.delSpec));

    // افزودن دسته
    view.querySelectorAll("[data-add-ccat]").forEach((b) => {
      b.addEventListener("click", () => openCategoryForm(b.dataset.addSpec, null));
    });

    // ویرایش/حذف دسته
    view.querySelectorAll("[data-edit-ccat]").forEach((b) => {
      b.addEventListener("click", () => openCategoryForm(b.dataset.ccatSpec, b.dataset.editCcat));
    });
    view.querySelectorAll("[data-del-ccat]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteCategory(b.dataset.ccatSpec, b.dataset.delCcat));
    });

    // افزودن آیتم
    view.querySelectorAll("[data-add-citem]").forEach((b) => {
      b.addEventListener("click", () => openCurriculumItemForm(b.dataset.addSpec, b.dataset.addCat, null));
    });

    // افزودن به برنامه (Curriculum → Task)
    view.querySelectorAll("[data-plan-item]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openCurriculumPlanTask(
          b.dataset.planItem,
          b.dataset.planSpec,
          b.dataset.planCat,
          b.dataset.planTitle
        );
      });
    });

    // ویرایش/حذف آیتم
    view.querySelectorAll("[data-edit-citem]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        openCurriculumItemForm(b.dataset.citemSpec, b.dataset.citemCat, b.dataset.editCitem);
      });
    });
    view.querySelectorAll("[data-del-citem]").forEach((b) => {
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        confirmDeleteCurriculumItem(b.dataset.citemSpec, b.dataset.citemCat, b.dataset.delCitem);
      });
    });

    view.querySelectorAll("[data-open-spec]").forEach((btn) => {

      btn.addEventListener("click", () => {
        curriculumView = "detail";
        curriculumSpecialtyId = btn.dataset.openSpec;
        renderClinicalHub();
      });
    });
    view.querySelectorAll("[data-curriculum-back]").forEach((btn) => {
      btn.addEventListener("click", () => {
        curriculumView = "list";
        curriculumSpecialtyId = null;
        renderClinicalHub();
      });
    });
    view.querySelectorAll("[data-cycle-mastery]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cycleMastery(btn.dataset.cycleMastery);
        renderClinicalHub();
      });
    });
    requestAnimationFrame(() => {
      const ring = view.querySelector(".ring[data-ring-target]");
      if (ring) ring.style.setProperty("--p", ring.dataset.ringTarget);
    });
  }

   /* ╔═══ [PATCH:ai-generator] ═══╗ */

  function openAIGenerator(opts) {
    opts = opts || {};
    const presetType = opts.type || "clinical";
    const presetId = opts.presetId || "";

    const curriculum = getCurriculum();
    const procedures = getProcedures();
    const residencySubjects = getResidencySubjects();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>🤖 تولید محتوا با AI</h3>
        <p style="margin:0 0 18px;font-size:12.5px;color:var(--text-muted);line-height:1.8">
          این ابزار یک پرامپت حرفه‌ای برای AI می‌سازد. پرامپت را کپی کن، به AI بده،
          پاسخ JSON را اینجا پیست کن. AI خودش تشخیص می‌دهد چه دسته‌ها و آیتم‌هایی بسازد.
        </p>

        <div class="ai-step">
          <div class="ai-step-num">۱</div>
          <div class="ai-step-body">
            <div class="ai-step-title">انتخاب بخش</div>

            <div class="form-row">
              <label for="ai-type">نوع محتوا *</label>
              <select id="ai-type">
                <option value="clinical"   ${presetType === "clinical" ? "selected" : ""}>🩺 کوریکولوم بالینی</option>
                <option value="procedures" ${presetType === "procedures" ? "selected" : ""}>🩹 پروسیجرها</option>
                <option value="residency"  ${presetType === "residency" ? "selected" : ""}>📝 رزیدنتی</option>
                <option value="life_area"  ${presetType === "life_area" ? "selected" : ""}>🌱 بخش‌های زندگی (برنامه)</option>
              </select>
            </div>

            <div class="form-grid-2">
              <div class="form-row" id="ai-spec-row">
                <label for="ai-spec">تخصص *</label>
                <select id="ai-spec">
                  <option value="">— انتخاب کن —</option>
                  ${curriculum.map((s) =>
                    `<option value="${s.id}" ${s.id === presetId ? "selected" : ""}>${s.icon} ${escapeHTML(s.title)}</option>`
                  ).join("")}
                </select>
              </div>
              <div class="form-row" id="ai-proc-row" style="display:none">
                <label for="ai-proc">دسته پروسیجر *</label>
                <select id="ai-proc">
                  <option value="">— انتخاب کن —</option>
                  ${procedures.map((c) =>
                    `<option value="${c.id}" ${c.id === presetId ? "selected" : ""}>${c.icon || "🔧"} ${escapeHTML(c.title)}</option>`
                  ).join("")}
                </select>
              </div>
              <div class="form-row" id="ai-res-row" style="display:none">
                <label for="ai-res">درس رزیدنتی</label>
                <select id="ai-res">
                  <option value="">— بدون درس —</option>
                  ${residencySubjects.map((s) =>
                    `<option value="${s.id}">${s.icon || "📖"} ${escapeHTML(s.title)}</option>`
                  ).join("")}
                </select>
              </div>
                            <div class="form-row" id="ai-life-row" style="display:none">
                <label for="ai-life">بخش زندگی *</label>
                <select id="ai-life">
                  ${LIFE_AREAS.map((a) =>
                    `<option value="${a.id}">${a.icon} ${escapeHTML(a.title)}</option>`
                  ).join("")}
                </select>
              </div>

              <div class="form-row">
                <label for="ai-cat">دسته خاص (اختیاری)</label>
                <select id="ai-cat">
                  <option value="">— AI خودش تصمیم بگیرد —</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <label for="ai-count">تعداد تقریبی آیتم</label>
              <select id="ai-count">
                <option value="auto" selected>خود AI تصمیم بگیرد</option>
                <option value="5">حدود ۵ آیتم</option>
                <option value="10">حدود ۱۰ آیتم</option>
                <option value="15">حدود ۱۵ آیتم</option>
                <option value="25">حدود ۲۵ آیتم</option>
              </select>
            </div>
          </div>
        </div>

        <div class="ai-step">
          <div class="ai-step-num">۲</div>
          <div class="ai-step-body">
            <div class="ai-step-title">توضیح خواسته‌هایت</div>
            <p class="ai-step-hint">
              به زبان خودت بنویس چه می‌خواهی. AI خودش دسته‌بندی و آیتم‌ها را طراحی می‌کند.
            </p>
            <textarea id="ai-request" rows="4"
              placeholder="مثلاً: می‌خواهم محتوای اطفال را کامل کنی. تمرکز روی اورژانس‌های نوزادی، تشنج، سپسیس و مشکلات تنفسی. اگر دسته‌ی جدیدی لازم است بساز. سطح اینترن."></textarea>
          </div>
        </div>

        <div class="ai-step">
          <div class="ai-step-num">۳</div>
          <div class="ai-step-body">
            <div class="ai-step-title">پرامپت آماده</div>
            <p class="ai-step-hint">این متن را کپی کن و به AI بده.</p>
            <textarea id="ai-prompt" readonly rows="14" placeholder="ابتدا بخش را انتخاب کن..."></textarea>
            <div class="ai-step-actions">
              <button class="btn primary" type="button" data-ai-copy disabled>📋 کپی پرامپت</button>
              <span class="ai-copied-hint" id="ai-copied-hint"></span>
            </div>
          </div>
        </div>

        <div class="ai-step">
          <div class="ai-step-num">۴</div>
          <div class="ai-step-body">
            <div class="ai-step-title">پاسخ AI</div>
            <p class="ai-step-hint">JSON پاسخ AI را اینجا پیست کن.</p>
            <textarea id="ai-response" rows="8"
              placeholder='{"schemaVersion":1,"packageType":"internship-os-content",...}'></textarea>
            <div class="ai-step-actions">
              <button class="btn primary" type="button" data-ai-analyze disabled>تحلیل پاسخ</button>
              <button class="btn ghost" type="button" data-ai-clear>پاک کردن</button>
            </div>
          </div>
        </div>

        <div class="import-preview" id="ai-preview" hidden></div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const typeSel   = overlay.querySelector("#ai-type");
    const specRow   = overlay.querySelector("#ai-spec-row");
    const procRow   = overlay.querySelector("#ai-proc-row");
    const resRow    = overlay.querySelector("#ai-res-row");
    const lifeRow   = overlay.querySelector("#ai-life-row");
    const specSel   = overlay.querySelector("#ai-spec");
    const procSel   = overlay.querySelector("#ai-proc");
    const resSel    = overlay.querySelector("#ai-res");
    const lifeSel   = overlay.querySelector("#ai-life");
    const catSel    = overlay.querySelector("#ai-cat");
    const countSel  = overlay.querySelector("#ai-count");
    const requestEl = overlay.querySelector("#ai-request");
    const promptEl  = overlay.querySelector("#ai-prompt");
    const copyBtn   = overlay.querySelector("[data-ai-copy]");
    const copiedHint = overlay.querySelector("#ai-copied-hint");
    const responseEl = overlay.querySelector("#ai-response");
    const analyzeBtn = overlay.querySelector("[data-ai-analyze]");
    const clearBtn   = overlay.querySelector("[data-ai-clear]");
    const previewEl  = overlay.querySelector("#ai-preview");

    function updateRows() {
      const t = typeSel.value;
      specRow.style.display = t === "clinical" ? "" : "none";
      procRow.style.display = t === "procedures" ? "" : "none";
      resRow.style.display  = t === "residency" ? "" : "none";
      if (lifeRow) lifeRow.style.display = t === "life_area" ? "" : "none";
      // برای life_area نیازی به دسته خاص نیست
      const catWrap = catSel ? catSel.closest(".form-row") : null;
      if (catWrap) catWrap.style.display = (t === "life_area") ? "none" : "";
      updateCategories();
      updatePrompt();
    }

    function updateCategories() {
      const t = typeSel.value;
      if (t === "clinical") {
        const spec = curriculum.find((s) => s.id === specSel.value);
        if (!spec) {
          catSel.innerHTML = '<option value="">— AI خودش تصمیم بگیرد —</option>';
        } else {
          catSel.innerHTML = '<option value="">— AI خودش تصمیم بگیرد —</option>' +
            spec.categories.map((c) =>
              `<option value="${c.id}">${escapeHTML(c.title)}</option>`
            ).join("");
        }
      } else if (t === "procedures") {
        const proc = procedures.find((c) => c.id === procSel.value);
        if (!proc) {
          catSel.innerHTML = '<option value="">— AI خودش تصمیم بگیرد —</option>';
        } else {
          catSel.innerHTML = '<option value="">— AI خودش تصمیم بگیرد —</option>' +
            `<option value="__same__">${escapeHTML(proc.title)} (همین دسته)</option>`;
        }
      } else {
        catSel.innerHTML = '<option value="">— AI خودش تصمیم بگیرد —</option>';
      }
    }

    function updatePrompt() {
      const t = typeSel.value;
      let anchorId = "";
      if (t === "clinical") anchorId = specSel.value;
      else if (t === "procedures") anchorId = procSel.value;
      else if (t === "life_area") anchorId = lifeSel ? lifeSel.value : "";
      else anchorId = resSel.value;

      if (!anchorId && t !== "residency") {
        promptEl.value = "";
        copyBtn.disabled = true;
        return;
      }

      promptEl.value = buildAIPromptV2({
        type: t,
        anchorId: anchorId,
        categoryId: catSel.value && catSel.value !== "__same__" ? catSel.value : "",
        count: countSel.value,
        userRequest: requestEl.value.trim()
      });
      copyBtn.disabled = false;
    }

    typeSel.addEventListener("change", updateRows);
    specSel.addEventListener("change", () => { updateCategories(); updatePrompt(); });
    procSel.addEventListener("change", () => { updateCategories(); updatePrompt(); });
    resSel.addEventListener("change", () => { updateCategories(); updatePrompt(); });
    if (lifeSel) lifeSel.addEventListener("change", () => { updateCategories(); updatePrompt(); });
    catSel.addEventListener("change", updatePrompt);
    countSel.addEventListener("change", updatePrompt);
    requestEl.addEventListener("input", updatePrompt);

    copyBtn.addEventListener("click", () => {
      const ok = copyToClipboard(promptEl.value);
      copiedHint.textContent = ok ? "✓ کپی شد" : "کپی نشد — دستی انتخاب کن";
      copiedHint.classList.toggle("error", !ok);
      setTimeout(() => { copiedHint.textContent = ""; copiedHint.classList.remove("error"); }, 2400);
    });

    responseEl.addEventListener("input", () => {
      analyzeBtn.disabled = !responseEl.value.trim();
    });

    clearBtn.addEventListener("click", () => {
      responseEl.value = "";
      analyzeBtn.disabled = true;
      previewEl.hidden = true;
      previewEl.innerHTML = "";
    });

    analyzeBtn.addEventListener("click", () => {
      const text = responseEl.value.trim();
      if (!text) return;

      const isPlan = typeSel.value === "life_area";

      let cleaned = text;
      const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fenceMatch) cleaned = fenceMatch[1].trim();
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace >= 0 && lastBrace >= 0) {
        cleaned = cleaned.slice(firstBrace, lastBrace + 1);
      }

      let parsed;
      try { parsed = JSON.parse(cleaned); }
      catch (e) {
        previewEl.innerHTML = `
          <div class="import-errors">
            <div class="import-error-title">❌ JSON معتبر نیست</div>
            <p style="color:var(--text-muted);font-size:12.5px;line-height:1.8">
              مطمئن شو کل پاسخ JSON رو کپی کردی، بدون متن اضافه.<br>
              خطا: <code style="font-size:11.5px;background:var(--surface-2);padding:2px 6px;border-radius:4px">${escapeHTML(e.message)}</code>
            </p>
          </div>
        `;
        previewEl.hidden = false;
        return;
      }

      if (isPlan) {
        // ─── Plan Package (بخش‌های زندگی) ─────────────
        const analyzed = analyzePlanPackage(parsed);
        previewEl.innerHTML = renderPlanImportPreview(analyzed);
        previewEl.hidden = false;

        const commitBtn = previewEl.querySelector("[data-pi-commit]");
        if (commitBtn) {
          commitBtn.addEventListener("click", () => {
            const checked = previewEl.querySelector('input[name="planDupMode"]:checked');
            const mode = checked ? checked.value : "skip";
            const result = commitPlanImport(analyzed, mode);
            if (result.added > 0) {
              previewEl.innerHTML = `
                <div class="import-success">
                  <div class="import-success-icon">✓</div>
                  <div class="import-success-title">${faNum(result.added)} تسک اضافه شد</div>
                  <p class="import-success-hint">می‌توانی این پنجره را ببندی و در برنامه‌ریزی ببینی.</p>
                </div>
              `;
            } else if (result.skipped > 0) {
              toast(`همه‌ی ${faNum(result.skipped)} مورد تکراری بود`, "error");
            } else {
              toast("موردی اضافه نشد", "error");
            }
          });
        }
      } else {
        // ─── Content Package ───────────────────────────
        const analyzed = analyzeContentPackage(parsed);
        previewEl.innerHTML = renderImportPreview(analyzed);
        previewEl.hidden = false;

        const commitBtn = previewEl.querySelector("[data-ci-commit]");
        if (commitBtn) {
          commitBtn.addEventListener("click", () => {
            const checked = previewEl.querySelector('input[name="dupMode"]:checked');
            const mode = checked ? checked.value : "skip";
            confirmAndCommitContentImport(analyzed, mode, (result) => {
              const parts = [];
              if (result.added > 0)   parts.push(`${faNum(result.added)} افزودن`);
              if (result.deleted > 0) parts.push(`${faNum(result.deleted)} حذف`);
              if (result.updated > 0) parts.push(`${faNum(result.updated)} ویرایش`);
              if (parts.length > 0) {
                previewEl.innerHTML = `
                  <div class="import-success">
                    <div class="import-success-icon">✓</div>
                    <div class="import-success-title">${parts.join(" · ")}</div>
                    <p class="import-success-hint">می‌توانی این پنجره را ببندی و در بخش مربوطه ببینی.</p>
                  </div>
                `;
                bumpContentCache();
              } else if (result.skipped > 0) {
                toast(`همه‌ی ${faNum(result.skipped)} مورد تکراری بود`, "error");
              } else {
                toast("موردی اضافه نشد", "error");
              }
            });
          });
        }
      }
    });

    // init
    if (presetId) {
      if (presetType === "clinical") {
        specSel.value = presetId;
      } else if (presetType === "procedures") {
        procSel.value = presetId;
      } else if (presetType === "life_area") {
        if (lifeSel) lifeSel.value = presetId;
      } else {
        resSel.value = presetId;
      }
    }
    updateRows();

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
      if (typeof renderClinicalHub === "function") renderClinicalHub();
      if (typeof render === "function") render();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
  }

  /* ─── Prompt builder V2 ──────────────────────────────── */
  function actionTypesSection() {
    let s = "";
    s += "## انواع عملیات (action)\n\n";
    s += "- `add` — افزودن محتوای جدید (پیش‌فرض)\n";
    s += "- `update` — ویرایش محتوای سفارشی که کاربر قبلاً اضافه کرده. فقط `id` + فیلدهای تغییر.\n";
    s += '  مثال: { "action": "update", "entity": "clinical_item", "data": { "id": "peds-item-1010", "title": "عنوان جدید" } }\n';
    s += "- `delete` — حذف محتوای سفارشی. فقط `id` لازمه. ⚠️ قابل بازگشت نیست.\n";
    s += '  مثال: { "action": "delete", "entity": "clinical_item", "data": { "id": "peds-item-1010" } }\n\n';
    s += "⚠️ محدودیت‌های مهم:\n";
    s += "- فقط محتوای سفارشی قابل ویرایش یا حذف است (نه محتوای پیش‌فرض سیستم).\n";
    s += "- حذف/ویرایش را فقط وقتی کاربر صریحاً خواسته استفاده کن.\n";
    s += "- حذف خطرناکه — قبلش توی `metadata.description` توضیح بده چرا.\n\n";
    return s;
  }

  function buildAIPromptV2(cfg) {
    const type = cfg.type;
    const anchorId = cfg.anchorId;
    const categoryId = cfg.categoryId;
    const count = cfg.count;
    const userRequest = cfg.userRequest || "";

    let prompt = "";
    prompt += "تو یک دستیار تولید محتوای پزشکی برای یک اپلیکیشن شخصی به اسم Internship OS هستی.\n";
    prompt += "خروجی تو باید فقط JSON خالص باشد — بدون توضیح، بدون markdown، بدون ```json.\n";
    prompt += "\n";

    let packageType = "internship-os-content";

    if (type === "clinical") {
      prompt += buildClinicalPrompt(anchorId, categoryId, count, userRequest);
    } else if (type === "procedures") {
      prompt += buildProceduresPrompt(anchorId, count, userRequest);
    } else if (type === "life_area") {
      prompt += buildLifeAreaPrompt(anchorId, count, userRequest);
      packageType = "internship-os-plan";
    } else {
      prompt += buildResidencyPrompt(anchorId, userRequest);
    }

    // ─── بخش عملیات (فقط برای محتوا) ────────────────
    if (packageType === "internship-os-content") {
      prompt += "\n";
      prompt += "## انواع عملیات (action)\n\n";
      prompt += "- `add` — افزودن محتوای جدید (پیش‌فرض)\n";
      prompt += "- `update` — ویرایش محتوای سفارشی که کاربر قبلاً اضافه کرده. فقط `id` + فیلدهای تغییر.\n";
      prompt += '  مثال: { "action": "update", "entity": "clinical_item", "data": { "id": "peds-item-1010", "title": "عنوان جدید" } }\n';
      prompt += "- `delete` — حذف محتوای سفارشی. فقط `id` لازمه. ⚠️ قابل بازگشت نیست.\n";
      prompt += '  مثال: { "action": "delete", "entity": "clinical_item", "data": { "id": "peds-item-1010" } }\n\n';
      prompt += "⚠️ محدودیت‌های مهم:\n";
      prompt += "- فقط محتوای سفارشی قابل ویرایش یا حذف است (نه محتوای پیش‌فرض سیستم).\n";
      prompt += "- حذف/ویرایش را فقط وقتی کاربر صریحاً خواسته استفاده کن.\n";
      prompt += "- حذف خطرناکه — قبلش توی `metadata.description` توضیح بده چرا.\n\n";
    }

    prompt += "\n## قواعد کلی خروجی\n\n";
    prompt += "- فقط JSON خالص، بدون متن اضافه\n";
    prompt += "- عناوین فارسی و کوتاه (زیر ۵ کلمه)\n";
    if (packageType === "internship-os-content") {
      prompt += "- id های یکتا با الگوی گفته‌شده\n";
      prompt += "- محتوای پزشکی معتبر\n";
    } else {
      prompt += "- تسک‌ها باید عملی و قابل انجام در روز باشند\n";
      prompt += "- تاریخ‌ها به فرمت YYYY/M/D بدون صفر پیشوند (مثل 1405/7/1)\n";
    }
    prompt += "\n## ساختار JSON خروجی\n\n";
    prompt += "{\n";
    prompt += '  "schemaVersion": 1,\n';
    prompt += '  "packageType": "' + packageType + '",\n';
    prompt += '  "metadata": {\n';
    prompt += '    "title": "...",\n';
    prompt += '    "description": "..."\n';
    prompt += "  },\n";
    prompt += '  "operations": [ ... ]\n';
    prompt += "}\n";

    return prompt;
  }

   function buildClinicalPrompt(specId, categoryId, count, userRequest) {
    const spec = getCurriculum().find((s) => s.id === specId);
    if (!spec) return "";

    let p = "";
    p += "## نقش تو\n\n";
    p += "تو یک متخصص محتوای آموزش پزشکی هستی با تجربه‌ی طراحی کوریکولوم اینترنی و رزیدنتی.\n";
    p += "کار تو فقط «اضافه کردن آیتم» نیست — تو می‌توانی ساختار را بازطراحی کنی.\n\n";

    p += "## هدف\n\n";
    p += "طراحی/تکمیل محتوای کوریکولوم بالینی برای تخصص «" + spec.title + "» (id: " + spec.id + ").\n";
    p += "هدف نهایی: یک کوریکولوم کاربردی که یک اینترن بتونه از روی اون مطالعه کنه.\n\n";

    if (categoryId) {
      const cat = spec.categories.find((c) => c.id === categoryId);
      if (cat) {
        p += "## دسته‌ی هدف\n\n";
        p += "دسته: «" + cat.title + "» (id: " + cat.id + ")\n";
        p += "اولویت روی همین دسته، ولی اگه بازطراحی کلی تخصص لازم داری، می‌تونی تغییرات بزرگ‌تر بدی.\n\n";
      }
    }

    p += "## ساختار فعلی تخصص\n\n";
    spec.categories.forEach((cat, ci) => {
      const norm = getNormalizedCategory(spec, cat, ci);
      p += "- «" + cat.title + "» (id: " + cat.id + ")\n";
      if (norm.items.length > 0) {
        norm.items.slice(0, 10).forEach((it) => {
          p += "  • " + it.title + "\n";
        });
        if (norm.items.length > 10) {
          p += "  • ... (" + (norm.items.length - 10) + " مورد دیگر)\n";
        }
      }
    });
    p += "\n";

    p += "## آزادی کامل عمل\n\n";
    p += "تو مجازی:\n\n";
    p += "۱. **افزودن آیتم** به دسته‌های موجود → entity: clinical_item\n";
    p += "۲. **ساخت دسته‌ی جدید** → entity: clinical_category\n";
    p += "۳. **ترکیب یا بازطراحی دسته‌ها**: اگه فکر می‌کنی دسته‌بندی فعلی منطقی نیست،\n";
    p += "    در `metadata.description` توضیح بده که چه بازطراحی پیشنهاد می‌دی.\n";
    p += "    (چون ما auto-delete نمی‌کنیم، فقط پیشنهاد بده — کاربر خودش تصمیم می‌گیره.)\n";
    p += "۴. **تولید ساختار متفاوت**: اگه کاربر خواسته، ساختار جدید پیشنهاد بده و آیتم‌هاش رو بساز.\n";
    p += "۵. **پیشنهاد بازطراحی کلی**: در `metadata.description` بنویس کدوم بخش‌ها نیاز به تغییر دارن.\n\n";

    p += "⚠️ محدودیت‌ها:\n";
    p += "- چیزی رو که وجود داره، حذف نکن (نمیتونی delete بفرستی)\n";
    p += "- فقط action: \"add\" معتبره\n";
    p += "- id ها رو یکتا نگه دار و با ساختار داده تداخل نداشته باش\n\n";

    if (userRequest) {
      p += "## خواسته‌ی کاربر\n\n";
      p += "کاربر دقیقاً این رو خواسته — این اولویت اول توئه:\n\n";
      p += "«" + userRequest + "»\n\n";
      p += "اگه خواسته‌ی کاربر با ساختار فعلی نمی‌خونه، ساختار مناسب رو پیشنهاد بده و پیاده کن.\n\n";
    }

    p += "## سطح محتوا\n\n";
    p += "اینترن پزشکی — نه تخصصی-عمیق، نه ابتدایی.\n";
    p += "هر آیتم باید چیزی باشه که یک اینترن واقعاً بتونه یاد بگیره یا تمرین کنه.\n";
    p += "از محتوای تخیلی یا خیلی نادر پرهیز کن.\n\n";

    p += "## تعداد\n\n";
    if (count === "auto") {
      p += "خودت تعداد مناسب رو تشخیص بده. معمولاً ۸ تا ۲۰ آیتم کافیه.\n\n";
    } else {
      p += "حدود " + count + " آیتم تولید کن (توزیع منطقی بین دسته‌ها).\n\n";
    }

    p += "## ساختار عملیات\n\n";
    p += "برای هر دسته‌ی جدید:\n";
    p += '  { "action": "add", "entity": "clinical_category",\n';
    p += '    "data": { "id": "' + spec.id + '-cat-NNN", "specialtyId": "' + spec.id + '", "title": "..." } }\n\n';
    p += "برای هر آیتم:\n";
    p += '  { "action": "add", "entity": "clinical_item",\n';
    p += '    "data": { "id": "' + spec.id + '-item-NNNN", "specialtyId": "' + spec.id + '", "categoryId": "...", "title": "..." } }\n\n';

    p += "## قواعد ID\n\n";
    p += "- id دسته‌ی جدید: " + spec.id + "-cat-NNN (NNN از ۱۰۱ شروع، سه رقم)\n";
    p += "- id آیتم جدید: " + spec.id + "-item-NNNN (NNNN از ۱۰۰۱ شروع، چهار رقم)\n";
    p += "- با محتوای فعلی تداخل نکن (لیست بالا رو ببین)\n\n";

    p += "## فیلد metadata\n\n";
    p += '- title: عنوان کوتاه بسته (مثلاً «تکمیل محتوای اطفال»)\n';
    p += '- description: توضیح + هر پیشنهاد بازطراحی که داری\n';

    return p;
  }
  function buildProceduresPrompt(procId, count, userRequest) {
    const procs = getProcedures();
    const proc = procs.find((c) => c.id === procId);
    if (!proc) return "";

    let p = "";
    p += "## نقش تو\n\n";
    p += "تو یک متخصص آموزش مهارت‌های بالینی هستی و می‌دونی یه اینترن واقعاً چه مهارت‌هایی لازم داره.\n";
    p += "کار تو فقط «اضافه کردن پروسیجر» نیست — می‌تونی دسته‌بندی رو هم بازطراحی کنی.\n\n";

    p += "## هدف\n\n";
    p += "تکمیل/بازطراحی بخش پروسیجرهای Internship OS.\n";
    p += "دسته‌ی هدف: «" + proc.title + "» (id: " + proc.id + ")\n\n";

    p += "## ساختار فعلی\n\n";
    procs.forEach((c) => {
      p += "- «" + c.title + "» (id: " + c.id + ")\n";
      (c.items || []).slice(0, 10).forEach((it) => {
        p += "  • " + it + "\n";
      });
      if ((c.items || []).length > 10) {
        p += "  • ... (" + (c.items.length - 10) + " مورد دیگر)\n";
      }
    });
    p += "\n";

    p += "## آزادی کامل عمل\n\n";
    p += "تو مجازی:\n\n";
    p += "۱. **افزودن پروسیجر** به دسته‌ی موجود → entity: procedure_item\n";
    p += "۲. **ساخت دسته‌ی جدید** اگه لازمه → entity: procedure_category\n";
    p += "۳. **پیشنهاد ادغام/جابجایی** دسته‌ها در `metadata.description`\n";
    p += "۴. **بازطراحی کلی**: اگه دسته‌بندی فعلی منطقی نیست، نسخه‌ی بهتری پیشنهاد بده و پیاده کن\n\n";

    p += "⚠️ محدودیت‌ها:\n";
    p += "- چیزی رو حذف نکن (delete پشتیبانی نمی‌شه)\n";
    p += "- فقط action: \"add\"\n";
    p += "- پروسیجرها باید عملی و مرتبط با اینترن باشن، نه جراحی‌های تخصصی\n\n";

    if (userRequest) {
      p += "## خواسته‌ی کاربر\n\n";
      p += "«" + userRequest + "»\n\n";
    }

    p += "## سطح\n\n";
    p += "مهارت‌های عملی که یه اینترن پزشکی باید بلد باشه:\n";
    p += "از سوند و بخیه ساده تا CPR و تفسیر ECG.\n";
    p += "هر پروسیجر باید عنوان کوتاه فارسی داشته باشه (زیر ۵ کلمه).\n\n";

    p += "## تعداد\n\n";
    if (count === "auto") {
      p += "خودت تعداد مناسب رو تشخیص بده. معمولاً ۵ تا ۱۵ پروسیجر.\n\n";
    } else {
      p += "حدود " + count + " پروسیجر جدید.\n\n";
    }

    p += "## ساختار عملیات\n\n";
    p += "برای هر دسته‌ی جدید:\n";
    p += '  { "action": "add", "entity": "procedure_category",\n';
    p += '    "data": { "id": "proc-cat-NNN", "title": "...", "icon": "🩹", "accent": "R, G, B" } }\n\n';
    p += "برای هر پروسیجر:\n";
    p += '  { "action": "add", "entity": "procedure_item",\n';
    p += '    "data": { "categoryId": "' + proc.id + '", "title": "..." } }\n\n';

    p += "## قواعد ID\n\n";
    p += "- id دسته‌ی جدید: proc-cat-NNN (NNN از ۱۰۱ شروع)\n";
    p += "- برای پروسیجرها id لازم نیست (عنوان یکتاست)\n";
    p += "- رنگ accent در دسته‌های جدید: مثلاً \"56, 189, 248\" یا \"251, 191, 36\"\n\n";

    p += "## فیلد metadata\n\n";
    p += "- title: عنوان کوتاه\n";
    p += "- description: توضیح + پیشنهاد بازطراحی (اگه داری)\n";

    return p;
  }

   function buildResidencyPrompt(subjectId, userRequest) {
    const subs = getResidencySubjects();
    const topics = getResidencyTopics(null);
    const goal = state.workspace.residencyGoal || "";

    let p = "";
    p += "## نقش تو\n\n";
    p += "تو یک مشاور آماده‌سازی رزیدنتی هستی. کارت اینه که ساختار مطالعه‌ی رزیدنتی کاربر رو\n";
    p += "از صفر بسازی یا کامل کنی — با دروس، موضوعات و منابع واقعی.\n\n";

    p += "## هدف\n\n";
    p += "طراحی/تکمیل ساختار مطالعه‌ی رزیدنتی در Internship OS.\n\n";

    if (goal) {
      p += "## هدف کاربر\n\n";
      p += "«" + goal + "»\n\n";
    }

    if (subjectId) {
      const sub = subs.find((s) => s.id === subjectId);
      if (sub) p += "درس هدف: «" + sub.title + "»\n\n";
    }

    p += "## ساختار فعلی\n\n";
    if (subs.length === 0) {
      p += "(خالی — تو ساختار رو از صفر می‌سازی)\n\n";
    } else {
      subs.forEach((sub) => {
        p += "- «" + sub.title + "» (id: " + sub.id + ")\n";
        const subTopics = topics.filter((t) => t.subjectId === sub.id);
        subTopics.slice(0, 8).forEach((t) => {
          p += "  • " + t.title + "\n";
        });
        if (subTopics.length > 8) {
          p += "  • ... (" + (subTopics.length - 8) + " مورد دیگر)\n";
        }
      });
      p += "\n";
    }

    p += "## آزادی کامل عمل\n\n";
    p += "تو مجازی:\n\n";
    p += "۱. **درس جدید بسازی** → entity: residency_subject\n";
    p += "۲. **موضوع اضافه کنی** زیر درس‌ها → entity: residency_topic\n";
    p += "۳. **منبع بسازی** (کتاب / بانک سوال / ویدیو) → entity: residency_resource\n";
    p += "۴. **ساختار کاملاً نو پیشنهاد بدی** اگه ساختار فعلی ناکافیه\n";
    p += "۵. **ترکیب یا تفکیک موضوعات** برای منطقی‌تر شدن مطالعه\n";
    p += "۶. **پیشنهاد بازطراحی** در `metadata.description`\n\n";

    p += "⚠️ محدودیت‌ها:\n";
    p += "- فقط action: \"add\"\n";
    p += "- چیزی رو حذف نکن\n";
    p += "- منابع باید واقعی و شناخته‌شده باشن (Braunwald، Harrison، UWorld، ...)\n\n";

    if (userRequest) {
      p += "## خواسته‌ی کاربر\n\n";
      p += "«" + userRequest + "»\n\n";
    }

    p += "## سطح محتوا\n\n";
    p += "هدف: آماده‌سازی برای آزمون دستیاری.\n";
    p += "موضوعات باید در سطح امتحان دستیاری باشن، نه تخصصی-فلوشیپ.\n";
    p += "منابع باید فارسی یا انگلیسیِ رایج در ایران باشن.\n\n";

    p += "## ساختار عملیات\n\n";
    p += "درس جدید:\n";
    p += '  { "action": "add", "entity": "residency_subject",\n';
    p += '    "data": { "id": "rsub-NNN", "title": "...", "icon": "📖", "accent": "R, G, B" } }\n\n';
    p += "موضوع جدید:\n";
    p += '  { "action": "add", "entity": "residency_topic",\n';
    p += '    "data": { "id": "rtop-NNNN", "subjectId": "rsub-XXX", "title": "..." } }\n\n';
    p += "منبع جدید:\n";
    p += '  { "action": "add", "entity": "residency_resource",\n';
    p += '    "data": { "id": "rres-NNN", "title": "...", "type": "کتاب / بانک سوال / ویدیو", "subjectId": "rsub-XXX" } }\n\n';

    p += "## قواعد ID\n\n";
    p += "- درس: rsub-NNN (مثلاً rsub-101)\n";
    p += "- موضوع: rtop-NNNN (مثلاً rtop-1001)\n";
    p += "- منبع: rres-NNN (مثلاً rres-101)\n";
    p += "- با محتوای فعلی تداخل نکن\n\n";

    p += "## فیلد metadata\n\n";
    p += "- title: عنوان کوتاه (مثلاً «ساختار مطالعه‌ی داخلی»)\n";
    p += "- description: توضیح + پیشنهاد بازطراحی\n";

    return p;
  }

  function buildLifeAreaPrompt(areaId, count, userRequest) {
    const area = LIFE_AREAS.find((a) => a.id === areaId);
    if (!area) return "";

    const today = todayJalali();
    const todayP = parseJalali(today);
    const in7 = addJalaliDays(todayP.jy, todayP.jm, todayP.jd, 7);
    const in7Key = dateKey(in7.jy, in7.jm, in7.jd);

    const currentRot = getCurrentRotation();
    const rotInfo = currentRot
      ? "- چرخش فعلی کاربر: «" + currentRot.title + "» (" + currentRot.startDate + " تا " + currentRot.endDate + ")\n"
      : "- کاربر در حال حاضر چرخش فعالی ندارد.\n";

    let p = "";
    p += "## هدف\n\n";
    p += "تولید یک بسته‌ی برنامه (Plan Package) برای بخش زندگی «" + area.title + "» در Internship OS.\n";
    p += "تو باید تسک‌های واقع‌بینانه، عملی و مناسب یک اینترن پزشکی طراحی کنی.\n\n";

    p += "## توصیف این بخش\n\n";
    p += area.desc + "\n\n";

    p += "## شرایط کاربر\n\n";
    p += "- امروز: " + today + "\n";
    p += "- یک هفته‌ی پیش‌رو تا: " + in7Key + "\n";
    p += rotInfo + "\n";

    p += "## فیلدهای هر تسک\n\n";
    p += "- title (اجباری، فارسی، کوتاه و عملی)\n";
    p += '- areaId (اجباری، دقیقاً: "' + area.id + '")\n';
    p += "- date (اجباری، فرمت YYYY/M/D، بین " + today + " و " + in7Key + ")\n";
    p += '- time (اختیاری، مثل "08:30")\n';
    p += "- priority (اختیاری، یکی از: low / normal / high)\n";
    p += "- recurrence (اختیاری، یکی از: none / daily / weekly / monthly)\n";
    p += "- description (اختیاری، توضیح کوتاه)\n";
    p += "- taskType (اختیاری، یکی از: study, review, question, exam, clinical, skill, exercise, project, personal, other)\n\n";

    if (userRequest) {
      p += "## خواسته‌ی کاربر\n\n";
      p += userRequest + "\n\n";
    }

    p += "## تعداد\n\n";
    if (count === "auto") {
      p += "خودت تعداد مناسب رو تشخیص بده (معمولاً بین ۵ تا ۱۲ تسک).\n\n";
    } else {
      p += "حدود " + count + " تسک تولید کن.\n\n";
    }

    p += "## ساختار عملیات\n\n";
    p += '  { "action": "add", "entity": "task", "data": {\n';
    p += '    "title": "...",\n';
    p += '    "areaId": "' + area.id + '",\n';
    p += '    "date": "' + today + '",\n';
    p += '    "taskType": "..."\n';
    p += "  } }\n\n";
    p += "⚠️ فقط برای بخش «" + area.title + "» تسک بساز — نه بخش‌های دیگه.\n";

    return p;
  }

  /* ─── Clipboard helper ────────────────────────────────── */

  function copyToClipboard(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
      return true;
    }
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch (e) { return false; }
  }

  /* ╚═══ [/PATCH:ai-generator] ═══╝ */

  /* ─── Manual content editor ───────────────────────────── */

  /* ─── Manual content editor ───────────────────────────── */

  function generateCustomId(prefix) {
    return _mkId(prefix);
  }

  function accentPalette() {
    return DATA.rotationPalette || [
      "45, 212, 191", "129, 140, 248", "251, 113, 133",
      "167, 139, 250", "52, 211, 153", "251, 191, 36",
      "244, 114, 182", "56, 189, 248", "34, 197, 94", "239, 68, 68"
    ];
  }

  function openSpecialtyForm(editId) {
    const isEdit = !!editId;
    const custom = getCustomContent();
    const existing = isEdit ? custom.clinicalSpecialties[editId] : null;
    if (isEdit && !existing) return;

    const palette = accentPalette();
    let init;
    if (isEdit) {
      init = {
        title: existing.title || "",
        subtitle: existing.subtitle || "",
        icon: existing.icon || "📚",
        accent: existing.accent || palette[0]
      };
    } else {
      const usedColors = Object.values(custom.clinicalSpecialties).map((s) => s.accent);
      init = { title: "", subtitle: "", icon: "📚", accent: palette.find((c) => !usedColors.includes(c)) || palette[0] };
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش تخصص" : "افزودن تخصص جدید"}</h3>

        <div class="form-row">
          <label for="spec-title">عنوان *</label>
          <input type="text" id="spec-title" placeholder="مثلاً: نفرولوژی" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="spec-subtitle">زیرعنوان (انگلیسی)</label>
            <input type="text" id="spec-subtitle" placeholder="Nephrology" autocomplete="off" value="${escapeHTML(init.subtitle)}" style="direction:ltr;text-align:start">
          </div>
          <div class="form-row">
            <label for="spec-icon">آیکون (ایموجی)</label>
            <input type="text" id="spec-icon" maxlength="4" autocomplete="off" value="${escapeHTML(init.icon)}" style="text-align:center">
          </div>
        </div>

        <div class="form-row">
          <label>رنگ</label>
          <div class="color-palette">
            ${palette.map((c) => `<button type="button" class="color-swatch ${c === init.accent ? "selected" : ""}" data-color="${c}" style="background:rgb(${c})"></button>`).join("")}
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    let selectedColor = init.accent;
    overlay.querySelectorAll(".color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        selectedColor = sw.dataset.color;
        overlay.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
        sw.classList.add("selected");
      });
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#spec-title"); if (i) i.focus(); }, 60);

    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      const title = overlay.querySelector("#spec-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const subtitle = overlay.querySelector("#spec-subtitle").value.trim();
      const icon = overlay.querySelector("#spec-icon").value.trim() || "📚";
      const now = Date.now();
      if (isEdit) {
        Object.assign(existing, { title, subtitle, icon, accent: selectedColor });
        toast("تخصص به‌روزرسانی شد");
      } else {
        const id = generateCustomId("spec");
        custom.clinicalSpecialties[id] = {
          id, title, subtitle, icon, accent: selectedColor, createdAt: now
        };
        toast("تخصص اضافه شد");
      }
      bumpContentCache();
      saveState();
      close();
      renderClinicalHub();
    });
  }

  function openCategoryForm(specId, editId) {
    const custom = getCustomContent();
    const isEdit = !!editId;
    const existing = isEdit ? custom.clinicalCategories[editId] : null;
    if (isEdit && !existing) return;

    const init = { title: isEdit ? (existing.title || "") : "" };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش دسته" : "افزودن دسته جدید"}</h3>
        <div class="form-row">
          <label for="cat-title">عنوان *</label>
          <input type="text" id="cat-title" placeholder="مثلاً: نارسایی حاد کلیه" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#cat-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#cat-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const now = Date.now();
      if (isEdit) {
        existing.title = title;
        toast("دسته به‌روزرسانی شد");
      } else {
        const id = generateCustomId("cat");
        custom.clinicalCategories[id] = { id, specialtyId: specId, title, createdAt: now };
        toast("دسته اضافه شد");
      }
      bumpContentCache();
      saveState();
      close();
      renderClinicalHub();
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#cat-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  function openCurriculumItemForm(specId, catId, editId) {
    const custom = getCustomContent();
    const isEdit = !!editId;
    const existing = isEdit ? custom.clinicalItems[editId] : null;
    if (isEdit && !existing) return;

    const init = {
      title: isEdit ? (existing.title || "") : "",
      description: isEdit ? (existing.description || "") : ""
    };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش آیتم" : "افزودن آیتم جدید"}</h3>
        <div class="form-row">
          <label for="item-title">عنوان *</label>
          <input type="text" id="item-title" placeholder="مثلاً: معیارهای تشخیصی" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="form-row">
          <label for="item-desc">توضیح (اختیاری)</label>
          <textarea id="item-desc" rows="2" placeholder="جزئیات کوتاه...">${escapeHTML(init.description)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#item-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#item-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const description = overlay.querySelector("#item-desc").value.trim();
      const now = Date.now();
      if (isEdit) {
        existing.title = title;
        existing.description = description;
        toast("آیتم به‌روزرسانی شد");
      } else {
        const id = generateCustomId("item");
        custom.clinicalItems[id] = {
          id, specialtyId: specId, categoryId: catId, title, description, createdAt: now
        };
        toast("آیتم اضافه شد");
      }
      bumpContentCache();
      saveState();
      close();
      renderClinicalHub();
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#item-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
    });
  }

  /* ─── Curriculum → Task ───────────────────────────────── */

  function openCurriculumPlanTask(itemId, specId, catId, itemTitle) {
    const t = parseJalali(todayJalali());
    const defaultTitle = "مطالعه " + itemTitle;

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>افزودن به برنامه</h3>
        <p style="margin:0 0 16px;font-size:12.5px;color:var(--text-muted)">
          از کوریکولوم: <strong style="color:var(--text)">${escapeHTML(itemTitle)}</strong>
        </p>

        <div class="form-row">
          <label for="qpt-title">عنوان کار *</label>
          <input type="text" id="qpt-title" autocomplete="off"
                 value="${escapeHTML(defaultTitle)}">
        </div>

        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("qpt", t.jy, t.jm, t.jd)}
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="qpt-time">ساعت (اختیاری)</label>
            <input type="text" id="qpt-time" placeholder="08:30" autocomplete="off">
          </div>
          <div class="form-row">
            <label for="qpt-type">نوع کار</label>
            <select id="qpt-type">
              <option value="study">📚 مطالعه</option>
              <option value="clinical">🩺 بالین</option>
              <option value="review">🔄 مرور</option>
              <option value="question">❓ تست</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>افزودن به برنامه</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#qpt-month");
    const y = overlay.querySelector("#qpt-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("qpt"));
    if (y) y.addEventListener("change", () => refreshDatePicker("qpt"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#qpt-title"); if (i) i.select(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#qpt-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }

      const date = readDatePicker("qpt");
      const time = overlay.querySelector("#qpt-time").value.trim();
      const taskType = overlay.querySelector("#qpt-type").value;
      const areaId = (taskType === "clinical") ? "clinical" : "study";
      const now = Date.now();

      const newId = _mkId("t");
      state.tasks.push({
        id: newId,
        title,
        areaId,
        date,
        time,
        priority: "normal",
        recurrence: "none",
        description: "",
        completed: false,
        sourceType: "curriculum",
        sourceId: itemId,
        sourceSpec: specId,
        sourceCat: catId,
        taskType,
        createdAt: now,
        updatedAt: now
      });
      saveState();
      try {
        var _rtT2 = state.tasks[state.tasks.length - 1];
        var _rtN2 = window.InternshipResidency && window.InternshipResidency.replanTrigger;
        if (_rtT2 && _rtN2 && _rtN2.notifyTaskChange) _rtN2.notifyTaskChange(_rtT2, "task_added");
      } catch (e) { console.warn("[25.1 curriculum]", e); }
      close();
      render();
      toast("به برنامه اضافه شد");
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#qpt-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  /* ─── Case → Task ─────────────────────────────────────── */

  function openCasePlanTask(caseId) {
    const c = getCases().find((x) => x.id === caseId);
    if (!c) return;

    const t = parseJalali(todayJalali());

    // عنوان پیش‌فرض: اگه آیتم کوریکولوم متصل داره، از اون. وگرنه از عنوان کیس
    let defaultTitle = "مطالعه: " + c.title;
    if (c.specialtyId && c.categoryId && c.curriculumItemId) {
      const spec = getCurriculum().find((s) => s.id === c.specialtyId);
      const cat = spec && spec.categories.find((x) => x.id === c.categoryId);
      if (cat) {
        const normCat = getNormalizedCategory(spec, cat, spec.categories.indexOf(cat));
        const found = normCat.items.find((it) => it.id === c.curriculumItemId);
        if (found) defaultTitle = "مطالعه: " + found.title;
      }
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>برنامه‌ریزی مطالعه از کیس</h3>
        <p style="margin:0 0 16px;font-size:12.5px;color:var(--text-muted)">
          کیس: <strong style="color:var(--text)">${escapeHTML(c.title)}</strong>
        </p>

        <div class="form-row">
          <label for="cpt-title">عنوان کار *</label>
          <input type="text" id="cpt-title" autocomplete="off"
                 value="${escapeHTML(defaultTitle)}">
        </div>

        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("cpt", t.jy, t.jm, t.jd)}
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="cpt-time">ساعت (اختیاری)</label>
            <input type="text" id="cpt-time" placeholder="08:30" autocomplete="off">
          </div>
          <div class="form-row">
            <label for="cpt-type">نوع کار</label>
            <select id="cpt-type">
              <option value="study">📚 مطالعه</option>
              <option value="review">🔄 مرور</option>
              <option value="question">❓ تست</option>
            </select>
          </div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>افزودن به برنامه</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#cpt-month");
    const y = overlay.querySelector("#cpt-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("cpt"));
    if (y) y.addEventListener("change", () => refreshDatePicker("cpt"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#cpt-title"); if (i) i.select(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#cpt-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }

      const date = readDatePicker("cpt");
      const time = overlay.querySelector("#cpt-time").value.trim();
      const taskType = overlay.querySelector("#cpt-type").value;
      const now = Date.now();

      const newId = _mkId("t");
      state.tasks.push({
        id: newId,
        title,
        areaId: "study",
        date,
        time,
        priority: "normal",
        recurrence: "none",
        description: "",
        completed: false,
        sourceType: "case",
        sourceId: c.id,
        sourceCurriculumItem: c.curriculumItemId || null,
        sourceSpec: c.specialtyId || null,
        sourceCat: c.categoryId || null,
        taskType,
        createdAt: now,
        updatedAt: now
      });
      saveState();
      try {
        var _rtT3 = state.tasks[state.tasks.length - 1];
        var _rtN3 = window.InternshipResidency && window.InternshipResidency.replanTrigger;
        if (_rtT3 && _rtN3 && _rtN3.notifyTaskChange) _rtN3.notifyTaskChange(_rtT3, "task_added");
      } catch (e) { console.warn("[25.1 case]", e); }
      close();
      render();
      toast("به برنامه اضافه شد");
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#cpt-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  /* ─── Delete handlers ─────────────────────────────────── */


  function confirmDeleteSpecialty(specId) {
    const custom = getCustomContent();
    const spec = custom.clinicalSpecialties[specId];
    if (!spec) return;

    const catCount = Object.values(custom.clinicalCategories).filter((c) => c.specialtyId === specId).length;
    const itemCount = Object.values(custom.clinicalItems).filter((i) => i.specialtyId === specId).length;

    openModal({
      title: "حذف تخصص",
      message:
        `آیا از حذف «<strong>${escapeHTML(spec.title)}</strong>» مطمئن هستی؟<br><br>` +
        (catCount + itemCount > 0
          ? `این کار همچنین <strong>${faNum(catCount)} دسته</strong> و <strong>${faNum(itemCount)} آیتم</strong> داخل آن را پاک می‌کند.`
          : "این تخصص هیچ محتوای سفارشی داخل خود ندارد."),
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        Object.keys(custom.clinicalCategories).forEach((cid) => {
          if (custom.clinicalCategories[cid].specialtyId === specId) delete custom.clinicalCategories[cid];
        });
        Object.keys(custom.clinicalItems).forEach((iid) => {
          if (custom.clinicalItems[iid].specialtyId === specId) {
            delete custom.clinicalItems[iid];
            if (state.clinicalProgress) delete state.clinicalProgress[iid];
          }
        });
        delete custom.clinicalSpecialties[specId];
        cleanupImportsRefs();
        bumpContentCache();
        saveState();
        curriculumView = "list";
        curriculumSpecialtyId = null;
        renderClinicalHub();
        toast("تخصص حذف شد");
      }
    });
  }

  function confirmDeleteCategory(specId, catId) {
    const custom = getCustomContent();
    const cat = custom.clinicalCategories[catId];
    if (!cat) return;

    const itemCount = Object.values(custom.clinicalItems).filter(
      (i) => i.specialtyId === specId && i.categoryId === catId
    ).length;

    openModal({
      title: "حذف دسته",
      message:
        `آیا از حذف «<strong>${escapeHTML(cat.title)}</strong>» مطمئن هستی؟<br><br>` +
        (itemCount > 0
          ? `این کار همچنین <strong>${faNum(itemCount)} آیتم</strong> داخل آن را پاک می‌کند.`
          : "این دسته آیتمی ندارد."),
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        Object.keys(custom.clinicalItems).forEach((iid) => {
          if (custom.clinicalItems[iid].categoryId === catId &&
              custom.clinicalItems[iid].specialtyId === specId) {
            delete custom.clinicalItems[iid];
            if (state.clinicalProgress) delete state.clinicalProgress[iid];
          }
        });
        delete custom.clinicalCategories[catId];
        cleanupImportsRefs();
        bumpContentCache();
        saveState();
        renderClinicalHub();
        toast("دسته حذف شد");
      }
    });
  }

  function confirmDeleteCurriculumItem(specId, catId, itemId) {
    const custom = getCustomContent();
    const item = custom.clinicalItems[itemId];
    if (!item) return;

    openModal({
      title: "حذف آیتم",
      message: `آیا از حذف «<strong>${escapeHTML(item.title)}</strong>» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        delete custom.clinicalItems[itemId];
        if (state.clinicalProgress) delete state.clinicalProgress[itemId];
        cleanupImportsRefs();
        bumpContentCache();
        saveState();
        renderClinicalHub();
        toast("آیتم حذف شد");
      }
    });
  }

  /** بعد از حذف دستی، IDهایی که دیگه وجود ندارن رو از batchها پاک کن */
  function cleanupImportsRefs() {
    if (!Array.isArray(state.imports)) return;
    const custom = getCustomContent();
    state.imports.forEach((b) => {
      if (!b || !b.entities) return;
      b.entities.clinicalSpecialties = (b.entities.clinicalSpecialties || []).filter((id) => custom.clinicalSpecialties[id]);
      b.entities.clinicalCategories  = (b.entities.clinicalCategories  || []).filter((id) => custom.clinicalCategories[id]);
      b.entities.clinicalItems       = (b.entities.clinicalItems       || []).filter((id) => custom.clinicalItems[id]);
      b.entities.procedureCategories = (b.entities.procedureCategories || []).filter((id) => custom.procedureCategories[id]);
      b.entities.procedureItems      = (b.entities.procedureItems      || []).filter((k) => custom.procedureItems[k]);
      b.entities.residencySubjects   = (b.entities.residencySubjects   || []).filter((id) => custom.residencySubjects[id]);
      b.entities.residencyTopics     = (b.entities.residencyTopics     || []).filter((id) => custom.residencyTopics[id]);
      b.entities.residencyResources  = (b.entities.residencyResources  || []).filter((id) => custom.residencyResources[id]);
    });
  }

  /* ╔═══ [PATCH:study-engine] ═══╗ */

  function getCurrentRotation() {
    const today = todayJalali();
    return (state.rotations || []).find((r) =>
      compareJalaliDate(r.startDate, today) <= 0 &&
      compareJalaliDate(today, r.endDate) <= 0
    ) || null;
  }

  function studyTaskIsRotationLinked(task, rotation) {
    if (!task || !rotation) return false;
    if (task.sourceSpec && rotation.clinicalModuleId === task.sourceSpec) return true;
    if (task.rotationId && task.rotationId === rotation.id) return true;
    return false;
  }

  /* ─── Emergency (اورژانس) ─── */
  let emergencyView = "program";

  function renderEmergency() {
    view.innerHTML = renderContentAreaPage("emergency");
    wireContentAreaPage("emergency");
  }

  function renderStudy() {
    view.innerHTML = renderContentAreaPage("study");
    wireContentAreaPage("study");
  }


  function renderProceduresPage() {
    clinicalTab = "procedures";
    renderClinicalHub();
  }

  /* ═══════════ MANUAL CONTENT ═══════════ */
  function _manualCategoriesForArea(areaId) {
    var structure = (DATA.lifeAreasStructure || {}).areas || {};
    var areaStruct = structure[areaId];
    if (!areaStruct || !Array.isArray(areaStruct.categories)) return [];
    return areaStruct.categories.map(function (c, i) { return { index: i, title: c.title || ("دسته " + (i + 1)) }; });
  }

  function _openManualContentModal(areaId, editId) {
    var cats = _manualCategoriesForArea(areaId);
    var isEdit = !!editId;
    var editItem = null;
    var existing = [];
    if (Array.isArray(state.programContent)) {
      existing = state.programContent.filter(function (p) { return p && p.areaId === areaId && p.manual === true; });
      if (isEdit) { for (var k = 0; k < existing.length; k++) if (existing[k].id === editId) { editItem = existing[k]; break; } }
    }
    if (isEdit && !editItem) return;

    var initTitle = isEdit ? (editItem.title || "") : "";
    var initNote = isEdit ? (editItem.note || "") : "";
    var initCatIdx = 0;
    if (isEdit) {
      var parts = String(editItem.sourceId || "").split(".");
      if (parts.length >= 2) initCatIdx = parseInt(parts[1], 10) || 0;
    }

    var catOptions = cats.map(function (c) {
      return '<option value="' + c.index + '"' + (c.index === initCatIdx ? ' selected' : '') + '>' + escapeHTML(c.title) + '</option>';
    }).join("");
    if (!catOptions) catOptions = '<option value="0">سایر</option>';

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isEdit ? "✏️ ویرایش محتوای دستی" : "➕ افزودن محتوای دستی"}</h3>
        <p style="margin:0 0 14px;font-size:12px;color:var(--text-muted)">
          این محتوا مستقیم به «برنامه‌ی من» اضافه می‌شود.
        </p>
        <div class="form-row">
          <label for="mc-title">عنوان *</label>
          <input type="text" id="mc-title" autocomplete="off" value="${escapeHTML(initTitle)}" placeholder="مثلاً: مرور پنومونی">
        </div>
        <div class="form-row">
          <label for="mc-cat">دسته‌بندی</label>
          <select id="mc-cat">${catOptions}</select>
        </div>
        <div class="form-row">
          <label for="mc-note">توضیحات (اختیاری)</label>
          <textarea id="mc-note" rows="3" placeholder="یادداشت، منبع، لینک...">${escapeHTML(initNote)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "💾 ذخیره" : "✅ افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });
    var close = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay.querySelector("[data-confirm]").addEventListener("click", function () {
      var title = String(overlay.querySelector("#mc-title").value || "").trim();
      var catIdx = parseInt(overlay.querySelector("#mc-cat").value, 10) || 0;
      var note = String(overlay.querySelector("#mc-note").value || "").trim();
      if (!title) { _notifyApp("error", "عنوان را وارد کن."); return; }
      if (!Array.isArray(state.programContent)) state.programContent = [];
      var now = Date.now();
      if (isEdit) {
        editItem.title = title;
        editItem.note = note;
        editItem.sourceId = areaId + "." + catIdx + ".manual." + (editItem.id || _mkId("mc"));
        editItem.updatedAt = now;
      } else {
        var newId = _mkId("pc");
        var uid = _mkId("m");
        state.programContent.push({
          id: newId,
          areaId: areaId,
          sourceType: areaId + "_manual",
          sourceId: areaId + "." + catIdx + ".manual." + uid,
          title: title,
          note: note,
          manual: true,
          addedAt: todayJalali(),
          active: true,
          createdAt: now,
          updatedAt: now
        });
      }
      saveState();
      _notifyApp("success", isEdit ? "محتوا ویرایش شد." : "محتوا به برنامه اضافه شد.");
      close();
      refreshAreaView(areaId);
    });
    setTimeout(function () { var i = overlay.querySelector("#mc-title"); if (i) i.select(); }, 60);
  }
  /* ═══════════ AI CONTENT GENERATOR ═══════════ */
  function _aiPromptForArea(areaId, userRequest) {
    var area = areaById(areaId);
    var areaName = area ? area.title : areaId;
    var structure = (DATA.lifeAreasStructure || {}).areas || {};
    var areaStruct = structure[areaId] || {};
    var cats = Array.isArray(areaStruct.categories) ? areaStruct.categories : [];
    var existing = (state.programContent || []).filter(function (p) { return p && p.areaId === areaId; });
    var existingTitles = existing.slice(0, 30).map(function (p) { return p.title; });

    var p = "";
    p += "## نقش تو\n\n";
    p += "دستیار تولید محتوای آموزشی برای اینترن پزشکی هستی.\n";
    p += "بخش هدف: «" + areaName + "»\n\n";
    p += "## دسته‌بندی‌های این بخش\n\n";
    if (cats.length) {
      for (var i = 0; i < cats.length; i++) {
        var cat = cats[i];
        p += (i + 1) + ". «" + (cat.title || ("دسته " + (i + 1))) + "»";
        if (cat.subcategories && cat.subcategories.length) {
          var subTitles = [];
          for (var s = 0; s < cat.subcategories.length; s++) {
            if (cat.subcategories[s] && cat.subcategories[s].title) subTitles.push(cat.subcategories[s].title);
          }
          if (subTitles.length) p += " — زیرشاخه: " + subTitles.join("، ");
        }
        p += "\n";
      }
      p += "\n";
    } else {
      p += "(بدون دسته‌بندی ثابت)\n\n";
    }
    if (existingTitles.length) {
      p += "## محتوای فعلی (تکرار نکن)\n\n";
      for (var k = 0; k < existingTitles.length; k++) { p += "- " + existingTitles[k] + "\n"; }
      p += "\n";
    }
    if (userRequest && String(userRequest).trim()) {
      p += "## خواسته‌ی کاربر\n\n«" + String(userRequest).trim() + "»\n\n";
    }
    p += "## خروجی\n\n";
    p += "فقط JSON خالص با ساختار زیر، بدون توضیح اضافه:\n\n";
    p += "{\n  \"items\": [\n    { \"title\": \"عنوان کوتاه\", \"categoryIndex\": 0, \"note\": \"توضیح کوتاه\" }\n  ]\n}\n\n";
    p += "## قواعد\n\n";
    p += "- بین ۵ تا ۲۰ آیتم\n";
    p += "- categoryIndex عدد صحیح از ۰ بر اساس دسته‌های بالا\n";
    p += "- عنوان کوتاه (حداکثر ۶ کلمه)\n";
    p += "- محتوای تکراری نده\n";
    p += "- متن فارسی، سطح اینترن پزشکی\n";
    return p;
  }

  function _openAIContentModal(areaId) {
    var area = areaById(areaId);
    var areaName = area ? area.title : areaId;
    var promptText = _aiPromptForArea(areaId, "");

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";

    var html = "";
    html += '<div class="modal modal-wide ai-content-modal" role="dialog" aria-modal="true">';

    html += '<div class="ai-panel-head">';
    html += '  <div class="ai-panel-head-icon">🤖</div>';
    html += '  <div class="ai-panel-head-text">';
    html += '    <div class="ai-panel-title">تولید محتوا با AI</div>';
    html += '    <div class="ai-panel-sub">' + escapeHTML(areaName) + '</div>';
    html += '  </div>';
    html += '</div>';

    html += '<div class="ai-content-steps">';

    html += '  <div class="ai-step">';
    html += '    <div class="ai-step-num">۱</div>';
    html += '    <div class="ai-step-body">';
    html += '      <div class="ai-step-title">پرامت را کپی کن</div>';
    html += '      <p class="ai-step-hint">درخواست اختیاری را بنویس، پرامت را کپی کن و در ChatGPT / Gemini / Grok بچسبان.</p>';
    html += '      <div class="form-row ai-step-input">';
    html += '        <input type="text" id="ai-user-req" placeholder="درخواست (اختیاری) — مثلاً: تمرکز روی بیماری‌های شایع">';
    html += '      </div>';
    html += '      <textarea id="ai-prompt" rows="8" readonly class="ai-mono">' + escapeHTML(promptText) + '</textarea>';
    html += '      <div class="ai-step-actions">';
    html += '        <button class="btn primary" type="button" data-ai-copy>📋 کپی پرامت</button>';
    html += '        <span class="ai-copied-hint" id="ai-copied" hidden>✓ کپی شد</span>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';

    html += '  <div class="ai-step">';
    html += '    <div class="ai-step-num">۲</div>';
    html += '    <div class="ai-step-body">';
    html += '      <div class="ai-step-title">پاسخ JSON را پیست کن</div>';
    html += '      <p class="ai-step-hint">پاسخ AI را اینجا بچسبان. بلوک‌های کد به‌طور خودکار حذف می‌شوند.</p>';
    html += '      <textarea id="ai-json" rows="7" class="ai-mono" placeholder="{ &quot;items&quot;: [ { &quot;title&quot;: &quot;...&quot;, &quot;categoryIndex&quot;: 0 } ] }"></textarea>';
    html += '      <div class="ai-err" id="ai-err"></div>';
    html += '    </div>';
    html += '  </div>';

    html += '  <div class="ai-step">';
    html += '    <div class="ai-step-num">۳</div>';
    html += '    <div class="ai-step-body">';
    html += '      <div class="ai-step-title">افزودن به برنامه</div>';
    html += '      <p class="ai-step-hint">محتواها یک‌جا به «برنامه‌ی من» اضافه می‌شوند. موارد تکراری رد می‌شوند.</p>';
    html += '      <div class="ai-step-actions">';
    html += '        <button class="btn primary" type="button" data-ai-commit>✅ افزودن به برنامه</button>';
    html += '      </div>';
    html += '    </div>';
    html += '  </div>';

    html += '</div>';

    html += '<div class="modal-actions">';
    html += '  <button class="btn ghost" type="button" data-close>انصراف</button>';
    html += '</div>';
    html += '</div>';

    overlay.innerHTML = html;

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var close = function () { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

    var reqInput = overlay.querySelector("#ai-user-req");
    var promptArea = overlay.querySelector("#ai-prompt");
    if (reqInput && promptArea) {
      reqInput.addEventListener("input", function () {
        promptArea.value = _aiPromptForArea(areaId, reqInput.value || "");
      });
    }

    overlay.querySelector("[data-ai-copy]").addEventListener("click", function () {
      try {
        promptArea.select();
        promptArea.setSelectionRange(0, promptArea.value.length);
        var okCopy = document.execCommand("copy");
        if (okCopy) {
          var hint = overlay.querySelector("#ai-copied");
          if (hint) { hint.hidden = false; setTimeout(function () { hint.hidden = true; }, 2200); }
          _notifyApp("success", "پرامت کپی شد.");
        } else {
          _notifyApp("warning", "کپی نشد — دستی انتخاب کن.");
        }
      } catch (e) { _notifyApp("error", "کپی ناموفق."); }
    });

    overlay.querySelector("[data-ai-commit]").addEventListener("click", function () {
      var err = overlay.querySelector("#ai-err");
      var raw = String(overlay.querySelector("#ai-json").value || "").trim();
      if (!raw) { err.textContent = "پاسخ JSON را پیست کن."; return; }
      raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
      var parsed;
      try { parsed = JSON.parse(raw); }
      catch (e) { err.textContent = "JSON معتبر نیست: " + e.message; return; }
      if (!parsed || !Array.isArray(parsed.items) || parsed.items.length === 0) {
        err.textContent = "ساختار باید شامل items باشد."; return;
      }
      if (!Array.isArray(state.programContent)) state.programContent = [];
      var added = 0, skipped = 0, now = Date.now();
      for (var i = 0; i < parsed.items.length; i++) {
        var it = parsed.items[i];
        if (!it || typeof it !== "object") { skipped++; continue; }
        var title = String(it.title || "").trim();
        if (!title) { skipped++; continue; }
        var dup = false;
        for (var j = 0; j < state.programContent.length; j++) {
          var pc = state.programContent[j];
          if (pc && pc.areaId === areaId && pc.title === title) { dup = true; break; }
        }
        if (dup) { skipped++; continue; }
        var catIdx = (typeof it.categoryIndex === "number") ? it.categoryIndex : 0;
        var note = String(it.note || "").trim();
        var uid = _mkId("m");
        state.programContent.push({
          id: _mkId("pc"),
          areaId: areaId,
          sourceType: areaId + "_manual",
          sourceId: areaId + "." + catIdx + ".manual." + uid,
          title: title,
          note: note,
          manual: true,
          aiGenerated: true,
          addedAt: todayJalali(),
          active: true,
          createdAt: now,
          updatedAt: now
        });
        added++;
      }
      saveState();
      if (added > 0) {
        _notifyApp("success", faNum(added) + " محتوا اضافه شد" + (skipped > 0 ? " (" + faNum(skipped) + " رد)" : ""));
        close();
        refreshAreaView(areaId);
      } else {
        err.textContent = "هیچ محتوای جدیدی اضافه نشد (همه تکراری).";
      }
    });

    setTimeout(function () { if (reqInput) reqInput.focus(); }, 60);
  }
  function renderContentAreaPage(areaId) {
    const area = areaById(areaId);
    if (!area) return "";

    const allTasks = (state.tasks || []).filter((t) => t.areaId === areaId && !t.cancelled);
    const total = allTasks.length;
    const done = allTasks.filter((t) => t.completed).length;
    const pct = total ? Math.round((done / total) * 100) : 0;
    const programItems = getProgramContent(areaId);
    const proposedItems = getProposedContentItems(areaId);
    const q = _contentSearch[areaId] || "";

    const filteredProgram = q ? programItems.filter((it) => matchesSearch(it, q)) : programItems;
    const filteredProposed = q ? proposedItems.filter((it) => matchesSearch(it, q)) : proposedItems;

    const currentView = (areaId === "emergency") ? emergencyView :
                        (areaId === "procedures") ? proceduresView : studyView;

    const toggleHTML = `
      <div class="study-view-toggle">
        <button class="study-view-btn ${currentView === "program" ? "active" : ""}" type="button" data-content-view="program" data-area-id="${areaId}">
          📋 برنامه‌ی من <span class="study-view-count">${faNum(programItems.length)}</span>
        </button>
        <button class="study-view-btn ${currentView === "proposed" ? "active" : ""}" type="button" data-content-view="proposed" data-area-id="${areaId}">
          💡 محتوای پیشنهادی <span class="study-view-count">${faNum(proposedItems.length)}</span>
        </button>
        <button class="study-view-btn is-manual" type="button" data-content-manual-add data-area-id="${areaId}">
          ➕ محتوای دستی
        </button>
        <button class="study-view-btn is-ai" type="button" data-content-ai-add data-area-id="${areaId}">
          🤖 تولید با AI
        </button>
      </div>
    `;

    const searchHTML = renderContentSearchHTML(areaId, 
      currentView === "program" ? filteredProgram.length : filteredProposed.length,
      currentView === "program" ? programItems.length : proposedItems.length
    );

    let bodyHTML;
    let areaBarHTML = "";

    if (currentView === "program") {
      if (q && filteredProgram.length === 0) {
        bodyHTML = `<div class="content-search-empty">
          <span class="content-search-empty-icon">🔍</span>
          نتیجه‌ای برای «${escapeHTML(q)}» پیدا نشد.
        </div>`;
      } else {
        bodyHTML = renderProgramViewHTML(areaId, filteredProgram, q);
      }
    } else {
      const allInCount = proposedItems.filter((it) =>
        isContentInProgram(areaId, it.sourceType, it.sourceId)
      ).length;
      const allIn = proposedItems.length > 0 && allInCount === proposedItems.length;
      const addAllAreaBtn = allIn
        ? `<span class="proposed-all-done">✓ همه اضافه شده</span>`
        : `<button class="proposed-addall-btn" type="button" data-content-add-all-area data-area-id="${areaId}">➕ افزودن همه</button>`;

      areaBarHTML = `<div class="proposed-area-bar">
        <div class="proposed-area-text">
          <strong>${faNum(proposedItems.length)}</strong> مورد پیشنهادی — ${faNum(allInCount)} در برنامه
        </div>
        ${addAllAreaBtn}
      </div>`;

      if (q && filteredProposed.length === 0) {
        bodyHTML = `<div class="content-search-empty">
          <span class="content-search-empty-icon">🔍</span>
          نتیجه‌ای برای «${escapeHTML(q)}» پیدا نشد.
        </div>`;
      } else {
        bodyHTML = renderProposedContentHTML(areaId, q);
      }
    }

    return `
      <section class="study-hero">
        <div>
          <span class="hero-label">${escapeHTML(area.title)}</span>
          <div class="hero-value">${faNum(done)} از ${faNum(total)} تسک انجام شده</div>
          <p class="hero-sub">${faNum(programItems.length)} محتوا در برنامه · ${faNum(proposedItems.length)} پیشنهادی</p>
        </div>
        <div class="ring" style="--p:0" data-ring-target="${pct}">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#5eead4"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52"/>
            <circle class="ring-fg" cx="60" cy="60" r="52"/>
          </svg>
          <div class="ring-label">${faNum(pct)}٪</div>
        </div>
      </section>
      ${toggleHTML}
      <div class="content-toolbar-row">
        <div class="ctr-right">${searchHTML}</div>
        <div class="ctr-left">${areaBarHTML}</div>
      </div>
      ${bodyHTML}
      <footer class="app-footer">Internship OS — نسخه ${faNum(APP_VERSION)}</footer>
    `;
  }

  function wireContentAreaPage(areaId) {
    const area = areaById(areaId);
    if (!area) return;

    // ─── ring animation ───
    requestAnimationFrame(() => {
      const ring = view.querySelector(".ring[data-ring-target]");
      if (ring) ring.style.setProperty("--p", ring.dataset.ringTarget);
    });

    // ─── tabs ───
    view.querySelectorAll("[data-content-view]").forEach((btn) => {
      btn.addEventListener("click", () => {
        if (areaId === "emergency") emergencyView = btn.dataset.contentView;
        else if (areaId === "procedures") proceduresView = btn.dataset.contentView;
        else studyView = btn.dataset.contentView;
        refreshAreaView(areaId);
      });
    });

    // ─── search ───
    wireContentSearch(areaId, () => refreshAreaView(areaId));

    // ─── tasks ───
    view.querySelectorAll("[data-toggle-task]").forEach((el) => {
      el.addEventListener("click", () => { toggleTask(el.dataset.toggleTask); refreshAreaView(areaId); });
    });
    view.querySelectorAll("[data-edit-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); openTaskForm(el.dataset.editTask); });
    });
    view.querySelectorAll("[data-delete-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); confirmDeleteTask(el.dataset.deleteTask); });
    });

    const linkBtn = view.querySelector("[data-link-rotation]");
    if (linkBtn) linkBtn.addEventListener("click", () => openRotationForm(linkBtn.dataset.linkRotation));

    var _aiAddBtn = view.querySelector("[data-content-ai-add]");
    if (_aiAddBtn) _aiAddBtn.addEventListener("click", function () { _openAIContentModal(areaId); });
    var _mcAddBtn = view.querySelector("[data-content-manual-add]");
    if (_mcAddBtn) _mcAddBtn.addEventListener("click", function () { _openManualContentModal(areaId, null); });
    view.querySelectorAll("[data-program-edit-manual]").forEach(function (el) {
      el.addEventListener("click", function (e) { e.stopPropagation(); _openManualContentModal(areaId, el.getAttribute("data-program-edit-manual")); });
    });
    wireProposedContentEvents(areaId);
    wireInlineTaskForms(areaId);

    const addAllArea = view.querySelector("[data-content-add-all-area]");
    if (addAllArea) {
      addAllArea.addEventListener("click", () => {
        const items = getProposedContentItems(areaId);
        const added = addAllContentToProgram(areaId, items);
        if (added > 0) {
          toast(faNum(added) + " مورد به برنامه اضافه شد");
          refreshAreaView(areaId);
        } else {
          toast("همه از قبل در برنامه بودند", "error");
        }
      });
    }

    document.title = area.title + " — Internship OS";
  }

  function renderProgramViewHTML(areaId, items, searchQuery) {
    if (!items || items.length === 0) {
      const area = areaById(areaId);
      const areaName = area ? area.title : "";
      return `<div class="placeholder">
        <span class="placeholder-icon">📋</span>
        <h2>هنوز محتوایی به برنامه‌ات اضافه نکردی</h2>
        <p>از تب «محتوای پیشنهادی» شروع کن — با یه کلیک می‌تونی موارد ${escapeHTML(areaName)} رو اضافه کنی.</p>
      </div>`;
    }

    const structure = (DATA.lifeAreasStructure || {}).areas || {};
    const areaStruct = structure[areaId];
    const categories = areaStruct && Array.isArray(areaStruct.categories) ? areaStruct.categories : [];

    const CAT_TINTS = [
      "45, 212, 191", "129, 140, 248", "244, 114, 182", "251, 191, 36",
      "52, 211, 153", "167, 139, 250", "56, 189, 248", "251, 113, 133",
      "34, 197, 94", "239, 68, 68"
    ];

    const groups = categories.map((cat, ci) => {
      const catItems = items.filter((item) => {
        const parts = String(item.sourceId).split(".");
        return parts.length >= 3 && parseInt(parts[1], 10) === ci;
      });
      return { title: cat.title, icon: cat.icon || "📌", accent: cat.accent || CAT_TINTS[ci % CAT_TINTS.length], index: ci, items: catItems };
    }).filter((g) => g.items.length > 0);

    const groupBlocks = groups.map((g) => {
      const rowsHTML = g.items.map((item) => {
        const tasks = (state.tasks || []).filter((t) =>
          t.areaId === item.areaId &&
          t.sourceType === item.sourceType &&
          t.sourceId === item.sourceId &&
          t.cancelled !== true
        );
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t) => t.completed).length;
        const masteryLevel = (state.clinicalProgress && state.clinicalProgress[item.sourceId]) || 0;

        let statsHTML = "";
        if (totalTasks > 0) {
          if (doneTasks === totalTasks) {
            statsHTML = `<span class="program-stat done">✓ ${faNum(doneTasks)}/${faNum(totalTasks)}</span>`;
          } else if (doneTasks > 0) {
            statsHTML = `<span class="program-stat pending">◐ ${faNum(doneTasks)}/${faNum(totalTasks)}</span>`;
          } else {
            statsHTML = `<span class="program-stat total">◯ ${faNum(totalTasks)}</span>`;
          }
        }
        if (masteryLevel === 2) {
          statsHTML += `<span class="program-stat mastered">🟢</span>`;
        } else if (masteryLevel === 1) {
          statsHTML += `<span class="program-stat pending">🟡</span>`;
        }

        const titleHTML = searchQuery
          ? highlightSearchMatch(item.title, searchQuery)
          : escapeHTML(item.title);

        const isManual = item.manual === true;
        const editBtnHTML = isManual
          ? `<button class="program-row-btn edit" type="button" data-program-edit-manual="${item.id}" title="ویرایش">✏️</button>`
          : "";
        const noteHTML = (isManual && item.note)
          ? `<div class="program-row-note">${escapeHTML(item.note)}</div>`
          : "";
        return `<li class="program-row${isManual ? " is-manual" : ""}" data-content-id="${item.id}">
          <span class="program-row-icon">${isManual ? "✎" : "◆"}</span>
          <span class="program-row-title">${titleHTML}${noteHTML}</span>
          <span class="program-row-stats">${statsHTML}</span>
          <button class="program-row-btn" type="button" data-program-create="${item.id}">
            📝 <span class="program-btn-label">برنامه‌ریزی</span>
          </button>
          ${editBtnHTML}
          <button class="program-row-btn remove" type="button" data-program-remove="${item.id}" title="حذف">✕</button>
        </li>`;
      }).join("");

      return `<div class="program-cat-group" style="--cat-tint:${g.accent};">
        <div class="program-cat-head">
          <span class="program-cat-icon" style="background:rgba(${g.accent},.16);border:1px solid rgba(${g.accent},.35);">${g.icon}</span>
          <span>${escapeHTML(g.title)}</span>
          <span class="program-cat-head-count">${faNum(g.items.length)}</span>
        </div>
        <ul class="program-cat-list">${rowsHTML}</ul>
      </div>`;
    });

    const col1 = [];
    const col2 = [];
    let h1 = 0;
    let h2 = 0;
    groups.forEach((g, idx) => {
      const weight = g.items.length + 2;
      if (h1 <= h2) { col1.push(groupBlocks[idx]); h1 += weight; }
      else { col2.push(groupBlocks[idx]); h2 += weight; }
    });

    return `<div class="program-cats">
      <div class="program-col">${col1.join("")}</div>
      <div class="program-col">${col2.join("")}</div>
    </div>`;
  }

  function refreshAreaView(areaId) {
    if (route === "clinical") {
      renderClinicalHub();
    } else if (route === "study" || areaId === "study") {
      renderStudy();
    } else if (route === "emergency" || areaId === "emergency") {
      renderEmergency();
    } else {
      render();
    }
  }

  function wireInlineTaskForms(areaId) {
    const ar = areaId || "study";
    view.querySelectorAll("[data-program-create]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const contentId = btn.dataset.programCreate;
        const item = (state.programContent || []).find((p) => p.id === contentId);
        if (!item) return;
        if (item.areaId !== ar) return;
        openContentTaskModal({
          areaId: item.areaId,
          sourceType: item.sourceType,
          sourceId: item.sourceId,
          title: item.title
        }, function() { refreshAreaView(ar); });
      });
    });

    view.querySelectorAll("[data-program-remove]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const contentId = btn.dataset.programRemove;
        const item = (state.programContent || []).find((p) => p.id === contentId);
        if (!item) return;
        if (item.areaId !== ar) return;
        if (removeContentFromProgram(item.areaId, item.sourceType, item.sourceId)) {
          toast("از برنامه حذف شد");
          refreshAreaView(ar);
        }
      });
    });
  }

  function studyRowHTML(task) {
    const today = todayJalali();
    const p = parseJalali(task.date);
    const isToday = task.date === today;
    const isPast = compareJalaliDate(task.date, today) < 0;
    const dateChip = isToday ? "" : `<span class="task-date-chip ${isPast ? "overdue" : ""}">${p ? prettyDateWD(p.jy, p.jm, p.jd) : ""}</span>`;
    const timeChip = task.time ? `<span class="task-time-chip">${faNum(task.time)}</span>` : "";
    const recurBadge = task.recurrence && task.recurrence !== "none" ? `<span class="task-recur-badge" title="تکرار">↻</span>` : "";

    return `
      <li class="task-row planner-row ${task.completed ? "done" : ""}">
        <span class="task-check" data-toggle-task="${task.id}" role="checkbox"
              aria-checked="${task.completed}" tabindex="0" aria-label="${escapeHTML(task.title)}"></span>
        <span class="task-title">${escapeHTML(task.title)}</span>
        ${taskSourceBadgeHTML(task)}
        ${recurBadge}${timeChip}
        ${dateChip}
        <span class="task-actions">
          <button class="task-action" type="button" data-edit-task="${task.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-delete-task="${task.id}" title="حذف">🗑️</button>
        </span>
      </li>
    `;
  }

  /* ╚═══ [/PATCH:study-engine] ═══╝ */

  /* ╔═══ [PATCH:residency-engine] ═══╗ */

  function getResidencySubjects() {
    const c = getCustomContent();
    return Object.values(c.residencySubjects || {}).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", "fa")
    );
  }

  function getResidencyTopics(subjectId) {
    const c = getCustomContent();
    return Object.values(c.residencyTopics || {})
      .filter((t) => !subjectId || t.subjectId === subjectId)
      .sort((a, b) => (a.title || "").localeCompare(b.title || "", "fa"));
  }

  function getResidencyResources() {
    const c = getCustomContent();
    return Object.values(c.residencyResources || {}).sort((a, b) =>
      (a.title || "").localeCompare(b.title || "", "fa")
    );
  }

  function residencyTasksByType(type) {
    return (state.tasks || []).filter((t) => t.areaId === "residency" && t.taskType === type);
  }

    function balanceResidencyColumns() {
    const flow = document.getElementById("res-flow");
    if (!flow) return;

    // فقط روی دسکتاپ (روی موبایل، flex-direction: column کار می‌کنه)
    if (window.innerWidth <= 800) return;

    const blocks = Array.from(flow.children).filter((el) =>
      el.classList && el.classList.contains("res-block")
    );
    if (blocks.length < 2) return;

    // اندازه‌ی هر بلاک رو بگیر قبل از جابه‌جایی
    const measurements = blocks.map((b) => ({
      el: b,
      h: b.getBoundingClientRect().height
    }));

    // دو ستون بساز
    const col1 = document.createElement("div");
    col1.className = "res-col";
    const col2 = document.createElement("div");
    col2.className = "res-col";

    // اول همه رو موقتاً از flow جدا کن تا اندازه‌گیری مختل نشه
    blocks.forEach((b) => b.remove());

    // Greedy: هر بلاک می‌ره توی کوتاه‌ترین ستون
    let h1 = 0, h2 = 0;
    measurements.forEach((m) => {
      if (h1 <= h2) {
        col1.appendChild(m.el);
        h1 += m.h + 14;
      } else {
        col2.appendChild(m.el);
        h2 += m.h + 14;
      }
    });

    flow.appendChild(col1);
    flow.appendChild(col2);
  }


  function renderResidency() {
  const R = window.InternshipResidency;
  const view = document.getElementById("view");

  // ─── [PATCH:residency-v19] استفاده از میزکار جدید ───
  if (!R || !R.residencySetup) {
    // fallback: پیام ساده
    view.innerHTML = '<div class="r19-dash-empty">سیستم رزیدنتی لود نشده است.</div>';
    return;
  }

  // ۱. بررسی وضعیت Setup
  const setupComplete = R.residencySetup.isSetupComplete();

  if (!setupComplete) {
    // نمایش پیام خوش‌آمد + دکمه راهنما
    view.innerHTML = _renderResidencyWelcome();
    _wireResidencyWelcome(view);
    document.title = "رزیدنتی — Internship OS";
    return;
  }

  // ۲. اگر Setup کامل است → نمایش میزکار
  view.innerHTML = '<div id="residency-dashboard-root"></div>';
  try {
    R.residencyDashboard.render(document.getElementById("residency-dashboard-root"));
  } catch (e) {
    console.warn("[renderResidency] dashboard failed:", e);
    view.innerHTML = '<div class="r19-dash-empty">خطا در نمایش میزکار: ' + (e.message || e) + '</div>';
  }
  document.title = "رزیدنتی — Internship OS";
}

function _renderResidencyWelcome() {
  return '<div class="r19-welcome-page">' +
    '<div class="r19-bg-anim" aria-hidden="true">' +
      '<span class="r19-orb r19-orb-1"></span>' +
      '<span class="r19-orb r19-orb-2"></span>' +
      '<span class="r19-orb r19-orb-3"></span>' +
      '<span class="r19-orb r19-orb-4"></span>' +
      '<span class="r19-orb r19-orb-5"></span>' +
      '<div class="r19-grid-lines"></div>' +
      '<div class="r19-stars"></div>' +
    '</div>' +
    '<div class="r19-welcome-page-card">' +
      '<div class="r19-welcome-glow-2"></div>' +
      '<div class="r19-welcome-page-icon-wrap">' +
        '<div class="r19-icon-ring"></div>' +
        '<div class="r19-icon-ring r19-icon-ring-2"></div>' +
        '<span class="r19-welcome-page-icon">🎯</span>' +
      '</div>' +
      '<h1 class="r19-welcome-page-title">به بخش رزیدنتی خوش آمدی</h1>' +
      '<p class="r19-welcome-page-desc">بیا با هم برنامه‌ی مطالعه‌ات رو بسازیم — ساده، هوشمند، قدم‌به‌قدم.</p>' +
      '<div class="r19-welcome-page-features">' +
        '<div class="r19-feature">' +
          '<span class="r19-feature-icon-wrap"><span class="r19-feature-icon">📌</span></span>' +
          '<div><div class="r19-feature-title">برنامه</div><div class="r19-feature-desc">هدف و تاریخ آزمون</div></div>' +
        '</div>' +
        '<div class="r19-feature">' +
          '<span class="r19-feature-icon-wrap"><span class="r19-feature-icon">📚</span></span>' +
          '<div><div class="r19-feature-title">۲۳ درس آماده</div><div class="r19-feature-desc">با یک کلیک انتخاب کن</div></div>' +
        '</div>' +
        '<div class="r19-feature">' +
          '<span class="r19-feature-icon-wrap"><span class="r19-feature-icon">📖</span></span>' +
          '<div><div class="r19-feature-title">کتاب‌های QB</div><div class="r19-feature-desc">صفحات پیش‌فرض آماده</div></div>' +
        '</div>' +
        '<div class="r19-feature">' +
          '<span class="r19-feature-icon-wrap"><span class="r19-feature-icon">✨</span></span>' +
          '<div><div class="r19-feature-title">تقسیم هوشمند</div><div class="r19-feature-desc">دوره‌ها بر اساس زمان</div></div>' +
        '</div>' +
      '</div>' +
      '<div class="r19-welcome-page-actions">' +
        '<button class="r19-btn r19-btn-primary r19-btn-large" type="button" data-open-wizard>' +
          '<span class="r19-btn-shine"></span>' +
          '🚀 شروع ساخت برنامه' +
        '</button>' +
        '<div class="r19-welcome-tagline">🕐 چند دقیقه وقت بذار — بعداً هم قابل ویرایشه</div>' +
      '</div>' +
    '</div>' +
  '</div>';
}
function _wireResidencyWelcome(view) {
  const startBtn = view.querySelector("[data-open-wizard]");
  if (startBtn) startBtn.addEventListener("click", function () {
    if (window.InternshipResidency && window.InternshipResidency.residencySetup) {
      window.InternshipResidency.residencySetup.openWizard();
    }
  });
}



  function residencyTaskSectionHTML(title, type, tasks, emptyLabel) {
    return `
      <section class="res-block">
        <div class="res-block-head">
          <span class="res-block-title">${title}</span>
          <span class="res-block-count">${faNum(tasks.length)}</span>
        </div>
        ${tasks.length === 0
          ? `<p class="res-empty">تسک ${escapeHTML(emptyLabel)}ی ثبت نشده.</p>`
          : `<ul class="today-tasks">${tasks.map(studyRowHTML).join("")}</ul>`}
        <div class="res-add-row">
          <button class="btn ghost small" type="button" data-add-res-task="${type}">+ تسک ${escapeHTML(emptyLabel)}</button>
        </div>
      </section>
    `;
  }

  function residencySubjectHTML(sub) {
    const topics = getResidencyTopics(sub.id);
    const topicsHTML = topics.length === 0
      ? '<li class="res-empty-line">موضوعی ثبت نشده.</li>'
      : topics.map((t) => `
          <li class="res-topic-row">
            <span class="res-topic-title">${escapeHTML(t.title)}</span>
            <span class="res-topic-actions">
              <button class="task-action" type="button" data-edit-res-topic="${t.id}" title="ویرایش">✏️</button>
              <button class="task-action" type="button" data-del-res-topic="${t.id}" title="حذف">🗑️</button>
            </span>
          </li>
        `).join("");

    return `
      <div class="res-subject" style="--accent:${sub.accent || "45, 212, 191"}">
        <div class="res-subject-head">
          <span class="res-subject-icon">${sub.icon || "📖"}</span>
          <span class="res-subject-title">${escapeHTML(sub.title)}</span>
          <span class="res-subject-count">${faNum(topics.length)}</span>
          <span class="res-subject-actions">
            <button class="task-action" type="button" data-edit-res-subject="${sub.id}" title="ویرایش">✏️</button>
            <button class="task-action" type="button" data-del-res-subject="${sub.id}" title="حذف">🗑️</button>
          </span>
        </div>
        <ul class="res-topic-list">${topicsHTML}</ul>
        <div class="res-add-row">
          <button class="btn ghost small" type="button" data-add-res-topic="${sub.id}">+ افزودن موضوع</button>
        </div>
      </div>
    `;
  }

  function resourceRowHTML(r) {
    const sub = r.subjectId ? getCustomContent().residencySubjects[r.subjectId] : null;
    return `
      <li class="res-resource-row">
        <span class="res-resource-icon">📚</span>
        <span class="res-resource-title">${escapeHTML(r.title)}</span>
        ${r.type ? `<span class="res-resource-type">${escapeHTML(r.type)}</span>` : ""}
        ${sub ? `<span class="res-resource-sub">${escapeHTML(sub.title)}</span>` : ""}
        <span class="res-resource-actions">
          <button class="task-action" type="button" data-edit-res-resource="${r.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-del-res-resource="${r.id}" title="حذف">🗑️</button>
        </span>
      </li>
    `;
  }

  function wireResidencyEvents() {

        // ری‌بالانس در صورت تغییر اندازه
    if (window._resResizeHandler) {
      window.removeEventListener("resize", window._resResizeHandler);
    }
    let _resizeTimer = null;
    window._resResizeHandler = () => {
      clearTimeout(_resizeTimer);
      _resizeTimer = setTimeout(() => {
        if (route !== "residency") return;
        // ری‌رندر کامل تا بلاک‌ها برگردن به حالت اول، بعد دوباره توزیع بشن
        renderResidency();
      }, 200);
    };
    window.addEventListener("resize", window._resResizeHandler);

    const aiBtn = view.querySelector("[data-ai-generator-res]");
    if (aiBtn) aiBtn.addEventListener("click", () => openAIGenerator({ type: "residency" }));

    const workspaceBtn = view.querySelector("[data-open-workspace]");
    if (workspaceBtn) workspaceBtn.addEventListener("click", function () {
      if (window.InternshipResidency && window.InternshipResidency.plannerWorkspace) {
        window.InternshipResidency.plannerWorkspace.open();
      }
    });

    const reviewBtn = view.querySelector("[data-open-review]");
    if (reviewBtn) reviewBtn.addEventListener("click", function () {
      if (window.InternshipResidency && window.InternshipResidency.reviewUI) {
        window.InternshipResidency.reviewUI.open();
      }
    });

    const replanBtn = view.querySelector("[data-open-replan]");
    if (replanBtn) replanBtn.addEventListener("click", function () {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      var activePlanId = s && s.residency && s.residency.meta && s.residency.meta.activePlanId;
      if (window.InternshipResidency && window.InternshipResidency.plannerReplanUI) {
        window.InternshipResidency.plannerReplanUI.open(activePlanId);
      }
    });

    const plannerBtn = view.querySelector("[data-open-planner]");
    if (plannerBtn) plannerBtn.addEventListener("click", function () {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      var activePlanId = s && s.residency && s.residency.meta && s.residency.meta.activePlanId;
      if (window.InternshipResidency && window.InternshipResidency.plannerUI) {
        window.InternshipResidency.plannerUI.open(activePlanId);
      } else {
        console.warn("[app.js] plannerUI not loaded");
      }
    });

    const goalBtn = view.querySelector("[data-edit-goal]");
    if (goalBtn) goalBtn.addEventListener("click", openResidencyGoalForm);

    const addSubBtn = view.querySelector("[data-add-res-subject]");
    if (addSubBtn) addSubBtn.addEventListener("click", () => openResidencySubjectForm(null));

    const addResBtn = view.querySelector("[data-add-res-resource]");
    if (addResBtn) addResBtn.addEventListener("click", () => openResidencyResourceForm(null));

    view.querySelectorAll("[data-add-res-topic]").forEach((b) => {
      b.addEventListener("click", () => openResidencyTopicForm(b.dataset.addResTopic, null));
    });

    view.querySelectorAll("[data-edit-res-subject]").forEach((b) => {
      b.addEventListener("click", () => openResidencySubjectForm(b.dataset.editResSubject));
    });
    view.querySelectorAll("[data-del-res-subject]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteResidencySubject(b.dataset.delResSubject));
    });

    view.querySelectorAll("[data-edit-res-topic]").forEach((b) => {
      b.addEventListener("click", () => openResidencyTopicForm(null, b.dataset.editResTopic));
    });
    view.querySelectorAll("[data-del-res-topic]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteResidencyTopic(b.dataset.delResTopic));
    });

    view.querySelectorAll("[data-edit-res-resource]").forEach((b) => {
      b.addEventListener("click", () => openResidencyResourceForm(b.dataset.editResResource));
    });
    view.querySelectorAll("[data-del-res-resource]").forEach((b) => {
      b.addEventListener("click", () => confirmDeleteResidencyResource(b.dataset.delResResource));
    });

    view.querySelectorAll("[data-add-res-task]").forEach((b) => {
      b.addEventListener("click", () => openResidencyTaskForm(b.dataset.addResTask));
    });

    view.querySelectorAll("[data-toggle-task]").forEach((el) => {
      el.addEventListener("click", () => toggleTask(el.dataset.toggleTask));
    });
    view.querySelectorAll("[data-edit-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); openTaskForm(el.dataset.editTask); });
    });
    view.querySelectorAll("[data-delete-task]").forEach((el) => {
      el.addEventListener("click", (e) => { e.stopPropagation(); confirmDeleteTask(el.dataset.deleteTask); });
    });
  }

  /* ─── Baseline editor (Phase 6) ─── */
  function openBaselineEditor(enrollmentId) {
    var R = window.InternshipResidency; /* [PATCH:f4b9-appjs-R] */

    var s = state;
    var enr = (s.residency.enrollments || []).find(function (e) { return e && e.id === enrollmentId; });
    if (!enr) return;
    var book = (s.residency.books || []).find(function (b) { return b && b.id === enr.bookId; });
    if (!book) return;
    var round = (s.residency.rounds || []).find(function (r) { return r && r.id === enr.roundId; });
    var totalPages = book.totalPages || 0;
    var baseline = enr.initialStudyBaseline || { ranges: [{ start: 1, end: 0 }], applyToRounds: "ALL", selectedRoundIds: [], notes: "" };

    var overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML =
      '<div class="modal modal-wide" role="dialog" aria-modal="true">' +
        '<h3>خوانده‌شده‌ی اولیه — ' + escapeHTML(book.title) + '</h3>' +
        '<p style="margin:0 0 14px;font-size:12.5px;color:var(--text-muted)">' +
          'دوره: <strong>' + escapeHTML(round ? round.title : "—") + '</strong> · ' +
          'کل صفحات کتاب: <strong>' + faNum(totalPages) + '</strong>' +
        '</p>' +
        '<div class="form-row">' +
          '<label>بازه‌های خوانده‌شده (صفحه‌ی شروع تا پایان)</label>' +
          '<div id="bl-ranges"></div>' +
          '<button type="button" class="btn ghost small" id="bl-add-range" style="margin-top:8px">+ افزودن بازه</button>' +
        '</div>' +
        '<div class="form-row">' +
          '<label>اعمال روی دوره‌ها</label>' +
          '<select id="bl-apply">' +
            '<option value="ALL"' + (baseline.applyToRounds === "ALL" ? " selected" : "") + '>همه‌ی دوره‌های این کتاب</option>' +
            '<option value="FIRST_ONLY"' + (baseline.applyToRounds === "FIRST_ONLY" ? " selected" : "") + '>فقط دوره‌ی اول</option>' +
            '<option value="SELECTED_ROUNDS"' + (baseline.applyToRounds === "SELECTED_ROUNDS" ? " selected" : "") + '>دوره‌های انتخابی</option>' +
          '</select>' +
        '</div>' +
        '<div class="form-row" id="bl-rounds-row" style="display:none">' +
          '<label>دوره‌های انتخابی</label>' +
          '<div id="bl-rounds-list"></div>' +
        '</div>' +
        '<div class="form-row"><label>یادداشت (اختیاری)</label><textarea id="bl-notes" rows="2">' + escapeHTML(baseline.notes || "") + '</textarea></div>' +
        '<div class="form-row" id="bl-summary" style="font-size:12.5px;color:var(--accent)"></div>' +
        '<div class="modal-actions">' +
          '<button class="btn ghost" type="button" data-clear>پاک کردن همه</button>' +
          '<button class="btn ghost" type="button" data-close>انصراف</button>' +
          '<button class="btn primary" type="button" data-save>ذخیره</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add("open"); });

    var rangesContainer = overlay.querySelector("#bl-ranges");
    var roundsRow = overlay.querySelector("#bl-rounds-row");
    var roundsList = overlay.querySelector("#bl-rounds-list");
    var applySel = overlay.querySelector("#bl-apply");
    var summaryEl = overlay.querySelector("#bl-summary");

    // Build rounds list (all rounds using this book)
    var bookRounds = (s.residency.enrollments || [])
      .filter(function (e) { return e && e.bookId === book.id; })
      .map(function (e) { return (s.residency.rounds || []).find(function (r) { return r.id === e.roundId; }); })
      .filter(Boolean);

    function renderRoundsList() {
      roundsList.innerHTML = bookRounds.map(function (r) {
        var checked = (baseline.selectedRoundIds || []).indexOf(r.id) !== -1;
        return '<label style="display:flex;align-items:center;gap:6px;padding:4px 0">' +
          '<input type="checkbox" data-round-id="' + escapeHTML(r.id) + '"' + (checked ? " checked" : "") + '>' +
          '<span>' + escapeHTML(r.title) + '</span>' +
        '</label>';
      }).join("") || '<div style="color:var(--text-dim);font-size:12px">دوره‌ای برای این کتاب یافت نشد.</div>';
    }

    function renderRanges() {
      rangesContainer.innerHTML = baseline.ranges.map(function (r, i) {
        return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
          '<input type="number" class="r19-input-tiny" data-range-start="' + i + '" value="' + (r.start || "") + '" placeholder="شروع" min="1" max="' + totalPages + '">' +
          '<span>تا</span>' +
          '<input type="number" class="r19-input-tiny" data-range-end="' + i + '" value="' + (r.end || "") + '" placeholder="پایان" min="1" max="' + totalPages + '">' +
          '<button type="button" class="task-action" data-remove-range="' + i + '">✕</button>' +
        '</div>';
      }).join("");
      rangesContainer.querySelectorAll("[data-range-start]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = parseInt(inp.getAttribute("data-range-start"), 10);
          baseline.ranges[i].start = parseInt(inp.value, 10) || 0;
          updateSummary();
        });
      });
      rangesContainer.querySelectorAll("[data-range-end]").forEach(function (inp) {
        inp.addEventListener("input", function () {
          var i = parseInt(inp.getAttribute("data-range-end"), 10);
          baseline.ranges[i].end = parseInt(inp.value, 10) || 0;
          updateSummary();
        });
      });
      rangesContainer.querySelectorAll("[data-remove-range]").forEach(function (b) {
        b.addEventListener("click", function () {
          var i = parseInt(b.getAttribute("data-remove-range"), 10);
          baseline.ranges.splice(i, 1);
          if (baseline.ranges.length === 0) baseline.ranges.push({ start: 1, end: 0 });
          renderRanges();
          updateSummary();
        });
      });
    }

    function updateSummary() {
    var R = window.InternshipResidency; /* [PATCH:f4b8-appjs] */

      var pages = R.baseline ? R.baseline.computePages(baseline, totalPages) : 0;
      var remaining = Math.max(0, totalPages - pages);
      summaryEl.innerHTML = '📄 خوانده‌شده: <strong>' + faNum(pages) + '</strong> از ' + faNum(totalPages) +
        ' · باقی‌مانده: <strong>' + faNum(remaining) + '</strong>';
    }

    overlay.querySelector("#bl-add-range").addEventListener("click", function () {
      baseline.ranges.push({ start: 1, end: 0 });
      renderRanges();
      updateSummary();
    });

    applySel.addEventListener("change", function () {
      baseline.applyToRounds = applySel.value;
      roundsRow.style.display = applySel.value === "SELECTED_ROUNDS" ? "" : "none";
    });

    renderRanges();
    renderRoundsList();
    applySel.dispatchEvent(new Event("change"));
    updateSummary();

    function close() {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    }
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    overlay._esc = function (e) { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-clear]").addEventListener("click", function () {
      R.store.updateEnrollment(enr.id, { initialStudyBaseline: null });
      if (typeof window.__os.saveState === "function") window.__os.saveState();
      _rtNotifyBaselineChange(enr.id);
      close();
      if (window.__os && window.__os.render) window.__os.render();
      toast("Baseline پاک شد");
    });

    overlay.querySelector("[data-save]").addEventListener("click", function () {
      var selected = [];
      roundsList.querySelectorAll("[data-round-id]:checked").forEach(function (cb) {
        selected.push(cb.getAttribute("data-round-id"));
      });
      var payload = {
        ranges: baseline.ranges.filter(function (r) { return r.start > 0 && r.end > 0; }),
        applyToRounds: baseline.applyToRounds,
        selectedRoundIds: selected,
        notes: overlay.querySelector("#bl-notes").value.trim()
      };

      var val = R.baseline ? R.baseline.validate(payload, totalPages) : { ok: true, errors: [] };
      if (!val.ok) { alert(val.errors.join("\n")); return; }

      var normalized = R.baseline ? R.baseline.normalize(payload, totalPages) : payload;
      R.store.updateEnrollment(enr.id, { initialStudyBaseline: normalized });
      if (typeof window.__os.saveState === "function") window.__os.saveState();
      _rtNotifyBaselineChange(enr.id);
      close();
      if (window.__os && window.__os.render) window.__os.render();
      toast("Baseline ذخیره شد");
    });
  }

  function _rtNotifyBaselineChange(enrId) {
    try {
      var RT = window.InternshipResidency && window.InternshipResidency.replanTrigger;
      if (RT && RT.notifyChange) RT.notifyChange("baseline_changed", { id: enrId, sourceType: "enrollment" });
    } catch (e) {}
  }

  /* ─── Residency forms ─── */

  function openResidencyGoalForm() {
    const current = state.workspace.residencyGoal || "";
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>هدف من در رزیدنتی</h3>
        <div class="form-row">
          <textarea id="rg-goal" rows="3" placeholder="مثلاً: قبولی در آزمون دستیاری داخلی با رتبه زیر ۱۰۰">${escapeHTML(current)}</textarea>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>ذخیره</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      state.workspace.residencyGoal = overlay.querySelector("#rg-goal").value.trim();
      saveState();
      close();
      render();
      toast("هدف ذخیره شد");
    });
  }

  function openResidencySubjectForm(editId) {
    const isEdit = !!editId;
    const c = getCustomContent();
    const existing = isEdit ? c.residencySubjects[editId] : null;
    if (isEdit && !existing) return;

    const palette = accentPalette();
    const init = isEdit
      ? { title: existing.title || "", icon: existing.icon || "📖", accent: existing.accent || palette[0] }
      : { title: "", icon: "📖", accent: palette[0] };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش درس" : "افزودن درس رزیدنتی"}</h3>
        <div class="form-row">
          <label for="rs-title">عنوان *</label>
          <input type="text" id="rs-title" placeholder="مثلاً: داخلی" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="rs-icon">آیکون</label>
            <input type="text" id="rs-icon" maxlength="4" value="${escapeHTML(init.icon)}" style="text-align:center">
          </div>
          <div class="form-row">
            <label>رنگ</label>
            <div class="color-palette">
              ${palette.map((clr) => `<button type="button" class="color-swatch ${clr === init.accent ? "selected" : ""}" data-color="${clr}" style="background:rgb(${clr})"></button>`).join("")}
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    let selectedColor = init.accent;
    overlay.querySelectorAll(".color-swatch").forEach((sw) => {
      sw.addEventListener("click", () => {
        selectedColor = sw.dataset.color;
        overlay.querySelectorAll(".color-swatch").forEach((s) => s.classList.remove("selected"));
        sw.classList.add("selected");
      });
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      const title = overlay.querySelector("#rs-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const icon = overlay.querySelector("#rs-icon").value.trim() || "📖";
      const now = Date.now();

      if (isEdit) {
        Object.assign(existing, { title, icon, accent: selectedColor });
        toast("درس به‌روزرسانی شد");
      } else {
        const id = _mkId("rsub");
        c.residencySubjects[id] = { id, title, icon, accent: selectedColor, createdAt: now };
        toast("درس اضافه شد");
      }
      saveState();
      close();
      render();
    });
  }

  function openResidencyTopicForm(subjectId, editId) {
    const isEdit = !!editId;
    const c = getCustomContent();
    const existing = isEdit ? c.residencyTopics[editId] : null;
    if (isEdit && !existing) return;

    const init = { title: isEdit ? (existing.title || "") : "" };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش موضوع" : "افزودن موضوع"}</h3>
        <div class="form-row">
          <label for="rt-title">عنوان *</label>
          <input type="text" id="rt-title" placeholder="مثلاً: نارسایی قلب" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#rt-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#rt-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const now = Date.now();
      if (isEdit) {
        existing.title = title;
        toast("موضوع به‌روزرسانی شد");
      } else {
        const id = _mkId("rtop");
        c.residencyTopics[id] = { id, subjectId, title, createdAt: now };
        toast("موضوع اضافه شد");
      }
      saveState();
      close();
      render();
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#rt-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  function openResidencyResourceForm(editId) {
    const isEdit = !!editId;
    const c = getCustomContent();
    const existing = isEdit ? c.residencyResources[editId] : null;
    if (isEdit && !existing) return;

    const subjects = getResidencySubjects();
    const init = isEdit
      ? { title: existing.title || "", type: existing.type || "", subjectId: existing.subjectId || "" }
      : { title: "", type: "", subjectId: "" };

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش منبع" : "افزودن منبع"}</h3>
        <div class="form-row">
          <label for="rr-title">عنوان *</label>
          <input type="text" id="rr-title" placeholder="مثلاً: Braunwald's Heart Disease" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="rr-type">نوع</label>
            <input type="text" id="rr-type" placeholder="کتاب / بانک سوال / ویدیو" autocomplete="off" value="${escapeHTML(init.type)}">
          </div>
          <div class="form-row">
            <label for="rr-sub">درس مرتبط (اختیاری)</label>
            <select id="rr-sub">
              <option value="">— بدون درس —</option>
              ${subjects.map((s) => `<option value="${s.id}" ${s.id === init.subjectId ? "selected" : ""}>${s.icon} ${escapeHTML(s.title)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "افزودن"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#rr-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#rr-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const type = overlay.querySelector("#rr-type").value.trim();
      const subjectId = overlay.querySelector("#rr-sub").value;
      const now = Date.now();
      if (isEdit) {
        Object.assign(existing, { title, type, subjectId });
        toast("منبع به‌روزرسانی شد");
      } else {
        const id = _mkId("rres");
        c.residencyResources[id] = { id, title, type, subjectId, createdAt: now };
        toast("منبع اضافه شد");
      }
      saveState();
      close();
      render();
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
  }

  function openResidencyTaskForm(taskType) {
    const t = parseJalali(todayJalali());
    const typeInfo = (DATA.taskTypes || []).find((x) => x.id === taskType) || { label: taskType, icon: "📝" };
    const defaultTitle = ({ study: "مطالعه", review: "مرور", question: "تست", exam: "آزمون جامع" })[taskType] || "تسک";

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${typeInfo.icon} افزودن تسک ${escapeHTML(typeInfo.label)}</h3>
        <div class="form-row">
          <label for="rtf-title">عنوان *</label>
          <input type="text" id="rtf-title" placeholder="${escapeHTML(defaultTitle)}..." autocomplete="off" value="${escapeHTML(defaultTitle)}: ">
        </div>
        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("rtf", t.jy, t.jm, t.jd)}
        </div>
        <div class="form-grid-2">
          <div class="form-row">
            <label for="rtf-time">ساعت (اختیاری)</label>
            <input type="text" id="rtf-time" placeholder="08:30" autocomplete="off">
          </div>
          <div class="form-row">
            <label for="rtf-sub">درس مرتبط (اختیاری)</label>
            <select id="rtf-sub">
              <option value="">— بدون درس —</option>
              ${getResidencySubjects().map((s) => `<option value="${s.id}">${s.icon} ${escapeHTML(s.title)}</option>`).join("")}
            </select>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>افزودن</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#rtf-month");
    const y = overlay.querySelector("#rtf-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("rtf"));
    if (y) y.addEventListener("change", () => refreshDatePicker("rtf"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#rtf-title"); if (i) i.select(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#rtf-title").value.trim();
      if (!title) { toast("عنوان را وارد کن", "error"); return; }
      const date = readDatePicker("rtf");
      const time = overlay.querySelector("#rtf-time").value.trim();
      const subjectId = overlay.querySelector("#rtf-sub").value;
      const now = Date.now();

      const newId = _mkId("t");
      state.tasks.push({
        id: newId, title, areaId: "residency", date, time,
        priority: "normal", recurrence: "none", description: "",
        completed: false,
        sourceType: "manual",
        sourceId: null,
        residencySubjectId: subjectId || null,
        taskType,
        createdAt: now, updatedAt: now
      });
      saveState();
      try {
        var _rtT4 = state.tasks[state.tasks.length - 1];
        var _rtN4 = window.InternshipResidency && window.InternshipResidency.replanTrigger;
        if (_rtT4 && _rtN4 && _rtN4.notifyTaskChange) _rtN4.notifyTaskChange(_rtT4, "task_added");
      } catch (e) { console.warn("[25.1 residency task]", e); }
      close();
      render();
      toast("تسک اضافه شد");
    };
    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
    overlay.querySelector("#rtf-title").addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); submit(); }
    });
  }

  /* ─── Deletions ─── */

  function confirmDeleteResidencySubject(id) {
    const c = getCustomContent();
    const s = c.residencySubjects[id];
    if (!s) return;
    const topicCount = Object.values(c.residencyTopics).filter((t) => t.subjectId === id).length;
    openModal({
      title: "حذف درس",
      message: `آیا از حذف «<strong>${escapeHTML(s.title)}</strong>» مطمئن هستی؟` +
        (topicCount > 0 ? `<br><br>${faNum(topicCount)} موضوع داخل آن هم پاک می‌شود.` : ""),
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        Object.keys(c.residencyTopics).forEach((tid) => {
          if (c.residencyTopics[tid].subjectId === id) delete c.residencyTopics[tid];
        });
        Object.keys(c.residencyResources).forEach((rid) => {
          if (c.residencyResources[rid].subjectId === id) c.residencyResources[rid].subjectId = "";
        });
        delete c.residencySubjects[id];
        saveState();
        render();
        toast("درس حذف شد");
      }
    });
  }

  function confirmDeleteResidencyTopic(id) {
    const c = getCustomContent();
    const t = c.residencyTopics[id];
    if (!t) return;
    openModal({
      title: "حذف موضوع",
      message: `آیا از حذف «<strong>${escapeHTML(t.title)}</strong>» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        delete c.residencyTopics[id];
        saveState();
        render();
        toast("موضوع حذف شد");
      }
    });
  }

  function confirmDeleteResidencyResource(id) {
    const c = getCustomContent();
    const r = c.residencyResources[id];
    if (!r) return;
    openModal({
      title: "حذف منبع",
      message: `آیا از حذف «<strong>${escapeHTML(r.title)}</strong>» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        delete c.residencyResources[id];
        saveState();
        render();
        toast("منبع حذف شد");
      }
    });
  }

  /* ╚═══ [/PATCH:residency-engine] ═══╝ */

  /* ─── Progress & Data placeholders ─────────────────────── */
  
  
  /* ╔═══ [PATCH:procedures-engine] ═══╗ */

  const PROCEDURE_STATES = [
    { value: 0, symbol: "⬜", label: "دیده‌ام",           weight: 0 },
    { value: 1, symbol: "🟡", label: "با کمک انجام دادم", weight: 0.5 },
    { value: 2, symbol: "🟢", label: "مستقل انجام دادم",   weight: 1 }
  ];

  function getProcedures() {
    if (_proceduresCache && _proceduresCachedBump === _proceduresBump) return _proceduresCache;
    _proceduresCache = mergeProcedures(DATA.defaultProcedures || [], getCustomContent());
    _proceduresCachedBump = _proceduresBump;
    return _proceduresCache;
  }

  function procedureItemId(catId, index) {
    return "proc-" + catId + "-" + index;
  }

  function getProcedureMastery(itemId) {
    const v = state.procedureProgress && state.procedureProgress[itemId];
    return typeof v === "number" ? v : 0;
  }

  function cycleProcedureMastery(itemId) {
    const cur = getProcedureMastery(itemId);
    if (!state.procedureProgress) state.procedureProgress = {};
    state.procedureProgress[itemId] = (cur + 1) % 3;
    saveState();
  }

  function procedureCategoryProgress(cat) {
    const items = cat.items || [];
    if (!items.length) return 0;
    const sum = items.reduce((s, _, i) => s + PROCEDURE_STATES[getProcedureMastery(procedureItemId(cat.id, i))].weight, 0);
    return Math.round((sum / items.length) * 100);
  }

  function overallProcedureProgress() {
    const cats = getProcedures();
    let total = 0;
    let sum = 0;
    cats.forEach((cat) => {
      (cat.items || []).forEach((_, i) => {
        total += 1;
        sum += PROCEDURE_STATES[getProcedureMastery(procedureItemId(cat.id, i))].weight;
      });
    });
    return total ? Math.round((sum / total) * 100) : 0;
  }

  function renderProceduresTab() {
    return renderContentAreaPage("procedures");
  }

  function wireProceduresEvents() {
    const aiBtn = view.querySelector("[data-ai-generator-proc]");
    if (aiBtn) aiBtn.addEventListener("click", () => openAIGenerator({ type: "procedures", presetId: "airway" }));

    view.querySelectorAll("[data-cycle-procedure]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cycleProcedureMastery(btn.dataset.cycleProcedure);
        renderClinicalHub();
      });
    });
    requestAnimationFrame(() => {
      const ring = view.querySelector(".ring[data-ring-target]");
      if (ring) ring.style.setProperty("--p", ring.dataset.ringTarget);
    });
  }

  /* ╚═══ [/PATCH:procedures-engine] ═══╝ */

  /* ╔═══ [PATCH:shifts-engine] ═══╗ */

  const SHIFT_TYPES = [
    "کشیک ۲۴ ساعته",
    "کشیک شب",
    "شیفت صبح",
    "شیفت عصر",
    "آنکال",
    "کشیک اورژانس"
  ];

  const SHIFT_PRESETS = {
    "کشیک ۲۴ ساعته": { start: "08:00", end: "08:00" },
    "کشیک شب":       { start: "20:00", end: "08:00" },
    "شیفت صبح":      { start: "08:00", end: "14:00" },
    "شیفت عصر":      { start: "14:00", end: "20:00" },
    "آنکال":         { start: "17:00", end: "08:00" },
    "کشیک اورژانس":  { start: "08:00", end: "20:00" }
  };

  function getShifts() {
    if (!Array.isArray(state.shifts)) state.shifts = [];
    return state.shifts;
  }

   function shiftsOnDate(jy, jm, jd) {
    return getShifts()
      .filter((s) => {
        const p = parseJalali(s.date);
        return p && p.jy === jy && p.jm === jm && p.jd === jd;
      })
      .sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
  }

  function formatShiftTime(t) {
    return faNum(t || "");
  }

  function shiftRowHTML(s) {
    const nextDay = s.endTime && s.startTime && s.endTime <= s.startTime;
    const time = `${formatShiftTime(s.startTime)} → ${formatShiftTime(s.endTime)}${nextDay ? ' <span class="shift-next-day">فردا</span>' : ""}`;
    return `
      <li class="shift-row">
        <span class="shift-icon" aria-hidden="true">🚨</span>
        <span class="shift-time">${time}</span>
        ${s.type ? `<span class="shift-type">${escapeHTML(s.type)}</span>` : ""}
        ${s.notes ? `<span class="shift-notes">${escapeHTML(s.notes)}</span>` : ""}
        <span class="shift-actions">
          <button class="task-action" type="button" data-edit-shift="${s.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-delete-shift="${s.id}" title="حذف">🗑️</button>
        </span>
      </li>
    `;
  }

  function todayShiftsBadgeHTML(t) {
    const shifts = shiftsOnDate(t.jy, t.jm, t.jd);
    if (!shifts.length) return "";

    const rows = shifts.map((s) => {
      const nextDay = s.endTime && s.startTime && s.endTime <= s.startTime;
      return `
        <div class="today-shift-row">
          <span class="today-shift-icon">🚨</span>
          <span class="today-shift-time">${formatShiftTime(s.startTime)} → ${formatShiftTime(s.endTime)}${nextDay ? ' <span class="shift-next-day">فردا</span>' : ""}</span>
          ${s.type ? `<span class="today-shift-type">${escapeHTML(s.type)}</span>` : ""}
        </div>
      `;
    }).join("");

    return `<div class="today-shifts">${rows}</div>`;
  }

  function openShiftForm(id, presetDate) {
    const isEdit = !!id;
    const shift = isEdit ? getShifts().find((x) => x.id === id) : null;
    if (isEdit && !shift) return;

    const today = parseJalali(todayJalali());

    let init;
    if (isEdit) {
      init = {
        date: parseJalali(shift.date) || today,
        startTime: shift.startTime || "08:00",
        endTime: shift.endTime || "20:00",
        type: shift.type || "کشیک ۲۴ ساعته",
        notes: shift.notes || ""
      };
    } else if (presetDate) {
      init = {
        date: { jy: presetDate.jy, jm: presetDate.jm, jd: presetDate.jd },
        startTime: "08:00",
        endTime: "20:00",
        type: "کشیک ۲۴ ساعته",
        notes: ""
      };
    } else {
      init = { date: today, startTime: "08:00", endTime: "20:00", type: "کشیک ۲۴ ساعته", notes: "" };
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش کشیک" : "افزودن کشیک"}</h3>

        <div class="form-row">
          <label>تاریخ *</label>
          ${datePickerHTML("sf", init.date.jy, init.date.jm, init.date.jd)}
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="sf-start">ساعت شروع *</label>
            <input type="time" id="sf-start" value="${init.startTime}">
          </div>
          <div class="form-row">
            <label for="sf-end">ساعت پایان *</label>
            <input type="time" id="sf-end" value="${init.endTime}">
          </div>
        </div>

        <div class="form-row">
          <label for="sf-type">نوع</label>
          <div class="shift-type-chips">
            ${SHIFT_TYPES.map((t) => `<button type="button" class="shift-type-chip ${t === init.type ? "active" : ""}" data-sf-chip="${t}">${t}</button>`).join("")}
          </div>
          <input type="text" id="sf-type" autocomplete="off" value="${escapeHTML(init.type)}" placeholder="یا نوع دلخواه...">
        </div>

        <div class="form-row">
          <label for="sf-notes">یادداشت (اختیاری)</label>
          <textarea id="sf-notes" rows="2" placeholder="مثلاً: بخش اطفال، طبقه ۳">${escapeHTML(init.notes)}</textarea>
        </div>

        <div class="modal-actions">
          ${isEdit ? '<button class="btn ghost" type="button" data-delete-task title="حذف">🗑️ حذف</button>' : ""}
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "ایجاد"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#sf-month");
    const y = overlay.querySelector("#sf-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("sf"));
    if (y) y.addEventListener("change", () => refreshDatePicker("sf"));

    // ── کشیک: چیپس‌ها و پیش‌فرض ساعت ──
    const typeInput = overlay.querySelector("#sf-type");
    const startInput = overlay.querySelector("#sf-start");
    const endInput = overlay.querySelector("#sf-end");
    const typeChips = overlay.querySelectorAll("[data-sf-chip]");

    const applyType = (type) => {
      typeInput.value = type;
      const preset = SHIFT_PRESETS[type];
      if (preset) {
        startInput.value = preset.start;
        endInput.value = preset.end;
      }
      typeChips.forEach((c) => c.classList.toggle("active", c.dataset.sfChip === type));
    };

    typeChips.forEach((chip) => {
      chip.addEventListener("click", () => applyType(chip.dataset.sfChip));
    });

    typeInput.addEventListener("input", () => {
      const v = typeInput.value.trim();
      typeChips.forEach((c) => c.classList.toggle("active", c.dataset.sfChip === v));
      if (SHIFT_PRESETS[v]) {
        startInput.value = SHIFT_PRESETS[v].start;
        endInput.value = SHIFT_PRESETS[v].end;
      }
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    const submit = () => {
      const date = readDatePicker("sf");
      const startTime = overlay.querySelector("#sf-start").value || "08:00";
      const endTime = overlay.querySelector("#sf-end").value || "20:00";
      const type = overlay.querySelector("#sf-type").value.trim();
      const notes = overlay.querySelector("#sf-notes").value.trim();

      if (isEdit) {
        const _rtBefore = {
          date: shift.date, startTime: shift.startTime,
          endTime: shift.endTime, type: shift.type
        };
        Object.assign(shift, { date, startTime, endTime, type, notes });
        toast("کشیک به‌روزرسانی شد");
        _rtNotify("shift_updated", {
          id: shift.id, sourceType: "shift", date: date, title: type,
          before: _rtBefore,
          after: { date: date, startTime: startTime, endTime: endTime, type: type }
        });
      } else {
        const newId = _mkId("s");
        state.shifts.push({ id: newId, date, startTime, endTime, type, notes });
        toast("کشیک اضافه شد");
        _rtNotify("shift_added", {
          id: newId, sourceType: "shift", date: date, title: type,
          after: { date: date, startTime: startTime, endTime: endTime, type: type }
        });
      }
      saveState();
      close();
      render();
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
  }

  function confirmDeleteShift(id) {
    const s = getShifts().find((x) => x.id === id);
    if (!s) return;
    const label = `${formatShiftTime(s.startTime)} → ${formatShiftTime(s.endTime)}`;
    openModal({
      title: "حذف کشیک",
      message: `آیا از حذف کشیک «${label}» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        var _rtRemoved = state.shifts.find((x) => x.id === id);
        var _rtSnap = _rtRemoved ? {
          date: _rtRemoved.date,
          startTime: _rtRemoved.startTime,
          endTime: _rtRemoved.endTime,
          type: _rtRemoved.type
        } : null;
        state.shifts = state.shifts.filter((x) => x.id !== id);
        _rtNotify("shift_removed", {
          id: id, date: _rtRemoved && _rtRemoved.date, sourceType: "shift",
          title: _rtRemoved ? _rtRemoved.type : null,
          before: _rtSnap
        });
        saveState();
        render();
        toast("کشیک حذف شد");
      }
    });
  }

  function openBulkShiftForm() {
    let bulkView = calView ? { jy: calView.jy, jm: calView.jm } : (() => {
      const t = parseJalali(todayJalali());
      return { jy: t.jy, jm: t.jm };
    })();
    const bulkSelected = new Set();
    const todayStr = todayJalali();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>افزودن گروهی کشیک</h3>
        <p style="margin-bottom:14px">روزها را در تقویم زیر انتخاب کن، سپس نوع و ساعت را تنظیم کن.</p>

          <div class="form-row">
          <label>نوع کشیک</label>
          <div class="shift-type-chips" id="bulk-type-chips">
            ${SHIFT_TYPES.map((t) => `<button type="button" class="shift-type-chip ${t === "کشیک ۲۴ ساعته" ? "active" : ""}" data-bulk-type="${t}">${t}</button>`).join("")}
          </div>
          <input type="text" id="bulk-type" autocomplete="off"
                 placeholder="یا نوع دلخواه (مثلاً کشیک اطفال)"
                 value="کشیک ۲۴ ساعته">
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="bulk-start">ساعت شروع</label>
            <input type="time" id="bulk-start" value="08:00">
          </div>
          <div class="form-row">
            <label for="bulk-end">ساعت پایان</label>
            <input type="time" id="bulk-end" value="08:00">
          </div>
        </div>

        <div class="form-row">
          <label>روزها</label>
          <div class="bulk-calendar" id="bulk-calendar"></div>
        </div>

        <div class="bulk-summary" id="bulk-summary">هیچ روزی انتخاب نشده</div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm disabled>افزودن</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const calendarEl = overlay.querySelector("#bulk-calendar");
    const summaryEl = overlay.querySelector("#bulk-summary");
    const confirmBtn = overlay.querySelector("[data-confirm]");
    const startInput = overlay.querySelector("#bulk-start");
    const endInput = overlay.querySelector("#bulk-end");
    const typeChips = overlay.querySelectorAll("[data-bulk-type]");

    let currentType = "کشیک ۲۴ ساعته";

    function renderBulkCalendar() {
      const { jy, jm } = bulkView;
      const monthLen = jalaliMonthLength(jy, jm);
      const startWeekday = jalaliMonthStartWeekday(jy, jm);

      const cells = [];
      for (let i = 0; i < startWeekday; i++) cells.push(null);
      for (let d = 1; d <= monthLen; d++) cells.push(d);

      calendarEl.innerHTML = `
        <div class="bulk-cal-head">
          <button class="cal-nav" type="button" data-bulk-prev aria-label="ماه قبل">‹</button>
          <div class="bulk-cal-title">${JMONTHS[jm - 1]} ${faNum(jy)}</div>
          <button class="cal-nav" type="button" data-bulk-next aria-label="ماه بعد">›</button>
        </div>
        <div class="cal-weekdays">
          ${JWEEKDAYS.map((w) => `<div class="cal-weekday" style="font-size:10px;padding:3px 0">${w}</div>`).join("")}
        </div>
        <div class="cal-grid">
          ${cells.map((d) => {
            if (d === null) return '<div class="cal-cell empty bulk-cell"></div>';
            const key = dateKey(jy, jm, d);
            const isSel = bulkSelected.has(key);
            const isToday = key === todayStr;
            return `<button type="button" class="cal-cell bulk-cell ${isSel ? "selected" : ""} ${isToday && !isSel ? "today" : ""}" data-bulk-day="${key}">${faNum(d)}</button>`;
          }).join("")}
        </div>
      `;

      calendarEl.querySelector("[data-bulk-prev]").addEventListener("click", () => {
        bulkView = addJalaliMonths(bulkView.jy, bulkView.jm, -1);
        renderBulkCalendar();
      });
      calendarEl.querySelector("[data-bulk-next]").addEventListener("click", () => {
        bulkView = addJalaliMonths(bulkView.jy, bulkView.jm, 1);
        renderBulkCalendar();
      });
      calendarEl.querySelectorAll("[data-bulk-day]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const k = btn.dataset.bulkDay;
          if (bulkSelected.has(k)) bulkSelected.delete(k);
          else bulkSelected.add(k);
          renderBulkCalendar();
          updateSummary();
        });
      });
    }

    function updateSummary() {
      const n = bulkSelected.size;
      summaryEl.textContent = n === 0 ? "هیچ روزی انتخاب نشده" : `${faNum(n)} روز انتخاب شده`;
      confirmBtn.disabled = n === 0;
    }

    const typeInput = overlay.querySelector("#bulk-type");

    const setBulkType = (type) => {
      currentType = type;
      typeInput.value = type;
      typeChips.forEach((c) => c.classList.toggle("active", c.dataset.bulkType === type));
      const preset = SHIFT_PRESETS[type];
      if (preset) {
        startInput.value = preset.start;
        endInput.value = preset.end;
      }
    };

    typeChips.forEach((chip) => {
      chip.addEventListener("click", () => setBulkType(chip.dataset.bulkType));
    });

    typeInput.addEventListener("input", () => {
      const v = typeInput.value.trim();
      currentType = v;
      typeChips.forEach((c) => c.classList.toggle("active", c.dataset.bulkType === v));
      if (SHIFT_PRESETS[v]) {
        startInput.value = SHIFT_PRESETS[v].start;
        endInput.value = SHIFT_PRESETS[v].end;
      }
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    confirmBtn.addEventListener("click", () => {
      if (bulkSelected.size === 0) return;
      const startTime = startInput.value || "08:00";
      const endTime = endInput.value || "20:00";
      const finalType = (typeInput.value.trim() || currentType || "").trim();
      let count = 0;
      bulkSelected.forEach((dateStr) => {
        const exists = state.shifts.some((s) =>
          s.date === dateStr && s.startTime === startTime && s.endTime === endTime && s.type === finalType
        );
        if (exists) return;
        const newId = _mkId("s");
        state.shifts.push({ id: newId, date: dateStr, startTime, endTime, type: finalType, notes: "" });
        _rtNotify("shift_added", {
          id: newId, sourceType: "shift", date: dateStr, title: finalType,
          after: { date: dateStr, startTime: startTime, endTime: endTime, type: finalType }
        });
        count++;
      });
      saveState();
      close();
      render();
      toast(`${faNum(count)} کشیک اضافه شد`);
    });

    renderBulkCalendar();
    updateSummary();
  }

  /* ╚═══ [/PATCH:shifts-engine] ═══╝ */

  /* ─── Progress & Data placeholders ─────────────────────── */

  /* ╔═══ [PATCH:cases-engine] ═══╗ */

  function getCases() {
    if (!Array.isArray(state.cases)) state.cases = [];
    return state.cases;
  }

  // مقادیر پیش‌فرض فیلدهای جدید (برای کیس‌های قدیمی)
  function normalizeCase(c) {
    if (!c || typeof c !== "object") return null;
    const out = Object.assign({}, c);
    out.complaint  = out.complaint  || "";
    out.exam       = out.exam       || "";
    out.paraclinic = out.paraclinic || "";
    out.diagnosis  = out.diagnosis  || "";
    out.treatment  = out.treatment  || "";
    out.learning   = out.learning   || "";
    out.notes      = out.notes      || "";
    out.attachments = Array.isArray(out.attachments) ? out.attachments : [];
    out.tags       = Array.isArray(out.tags) ? out.tags : [];
    return out;
  }

  // خروجی: { متن، تعداد بخش‌های پر، تعداد پیوست‌ها }
  function caseSummaryInfo(c) {
    const n = normalizeCase(c);
    if (!n) return { filled: 0, attachments: 0, hasDiagnosis: false };
    const fields = ["complaint", "exam", "paraclinic", "diagnosis", "treatment", "learning", "notes"];
    const filled = fields.filter((f) => n[f] && n[f].trim().length > 0).length;
    return {
      filled,
      attachments: n.attachments.length,
      hasDiagnosis: !!(n.diagnosis && n.diagnosis.trim())
    };
  }

    let casesFilterSpec = "all";
  let casesFilterRot = "all";
  let casesPage = 1;
  const CASES_PER_PAGE = 10;

    function renderCasesTab() {
    const curriculum = getCurriculum();
    const allCases = getCases().slice().sort((a, b) => {
      // اول بر اساس تاریخ نزولی، بعد بر اساس createdAt نزولی
      const d = compareJalaliDate(b.date, a.date);
      if (d !== 0) return d;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });

    // اعمال فیلترها
    const filtered = allCases.filter((c) => {
      if (casesFilterSpec !== "all" && c.specialtyId !== casesFilterSpec) return false;
      if (casesFilterRot !== "all" && c.rotationId !== casesFilterRot) return false;
      return true;
    });

    // ─── صفحه‌بندی ───
    const totalPages = Math.max(1, Math.ceil(filtered.length / CASES_PER_PAGE));
    if (casesPage > totalPages) casesPage = totalPages;
    if (casesPage < 1) casesPage = 1;
    const startIdx = (casesPage - 1) * CASES_PER_PAGE;
    const pageCases = filtered.slice(startIdx, startIdx + CASES_PER_PAGE);

    // گروه‌بندی بر اساس بخش (فقط کیس‌های همین صفحه)
    const groups = [];
    const bySpec = new Map();
    curriculum.forEach((s) => bySpec.set(s.id, { spec: s, cases: [] }));
    const ungrouped = [];

    pageCases.forEach((c) => {
      if (c.specialtyId && bySpec.has(c.specialtyId)) {
        bySpec.get(c.specialtyId).cases.push(c);
      } else {
        ungrouped.push(c);
      }
    });

    curriculum.forEach((s) => {
      const g = bySpec.get(s.id);
      if (g.cases.length > 0) groups.push(g);
    });
    if (ungrouped.length > 0) groups.push({ spec: null, cases: ungrouped });

    const filterBar = `
      <div class="cases-filter">
        <div class="cases-filter-item">
          <label for="cf-spec-filter">بخش</label>
          <select id="cf-spec-filter">
            <option value="all" ${casesFilterSpec === "all" ? "selected" : ""}>همه بخش‌ها</option>
            ${curriculum.map((s) => `<option value="${s.id}" ${casesFilterSpec === s.id ? "selected" : ""}>${s.icon} ${escapeHTML(s.title)}</option>`).join("")}
          </select>
        </div>
        <div class="cases-filter-item">
          <label for="cf-rot-filter">چرخش</label>
          <select id="cf-rot-filter">
            <option value="all" ${casesFilterRot === "all" ? "selected" : ""}>همه چرخش‌ها</option>
            ${state.rotations.map((r) => `<option value="${r.id}" ${casesFilterRot === r.id ? "selected" : ""}>${escapeHTML(r.title)}</option>`).join("")}
          </select>
        </div>
        ${(casesFilterSpec !== "all" || casesFilterRot !== "all") ? `<button class="cases-filter-clear" type="button" data-clear-filters>× پاک کردن فیلتر</button>` : ""}
      </div>
    `;

    let bodyHTML;
    if (allCases.length === 0) {
      bodyHTML = `<div class="placeholder"><span class="placeholder-icon">📝</span>
             <h2>هنوز کیسی ثبت نشده</h2>
             <p>تجربه‌های بالینی مهمت را اینجا ثبت کن تا بعداً مرور کنی.</p></div>`;
    } else if (filtered.length === 0) {
      bodyHTML = `<div class="placeholder"><span class="placeholder-icon">🔍</span>
             <h2>کیسی با این فیلتر پیدا نشد</h2>
             <p>فیلترها را تغییر بده یا پاک کن.</p></div>`;
    } else {
      bodyHTML = groups.map((g) => {
        const header = g.spec
          ? `<div class="cases-group-head" style="--accent:${g.spec.accent || "45, 212, 191"}">
               <span class="cases-group-icon">${g.spec.icon}</span>
               <span class="cases-group-title">${escapeHTML(g.spec.title)}</span>
               <span class="cases-group-count">${faNum(g.cases.length)}</span>
             </div>`
          : `<div class="cases-group-head" style="--accent:148, 163, 184">
               <span class="cases-group-icon">📁</span>
               <span class="cases-group-title">بدون بخش</span>
               <span class="cases-group-count">${faNum(g.cases.length)}</span>
             </div>`;
        return `<div class="cases-group">${header}<div class="cases-list">${g.cases.map(caseCardHTML).join("")}</div></div>`;
      }).join("");
    }

    // ─── نوار صفحه‌بندی ───
    const paginationHTML = totalPages > 1 ? `
      <div class="cases-pagination">
        <button class="pagination-btn" type="button" data-cases-prev ${casesPage === 1 ? "disabled" : ""}>
          → قبلی
        </button>
        <div class="pagination-info">
          صفحه <strong>${faNum(casesPage)}</strong> از <strong>${faNum(totalPages)}</strong>
          <span class="pagination-range">(${faNum(startIdx + 1)} تا ${faNum(Math.min(startIdx + CASES_PER_PAGE, filtered.length))} از ${faNum(filtered.length)})</span>
        </div>
        <button class="pagination-btn" type="button" data-cases-next ${casesPage === totalPages ? "disabled" : ""}>
          بعدی ←
        </button>
      </div>
    ` : (filtered.length > 0 ? `
      <div class="cases-pagination cases-pagination-minimal">
        <div class="pagination-info">
          ${faNum(filtered.length)} کیس
        </div>
      </div>
    ` : "");

    return `
      <div class="cases-head">
        <div>
          <h3 class="cases-title">کیس‌لاگ</h3>
          <span class="cases-count">${faNum(filtered.length)} از ${faNum(allCases.length)} کیس</span>
        </div>
        <button class="btn primary" type="button" data-add-case>+ افزودن کیس</button>
      </div>
      ${filterBar}
      ${bodyHTML}
      ${paginationHTML}
    `;
  }

       function caseCardHTML(c) {
    const n = normalizeCase(c);
    if (!n) return "";

    const p = parseJalali(n.date);
    const dateStr = p ? prettyDateWD(p.jy, p.jm, p.jd) : n.date;
    const rot = n.rotationId ? state.rotations.find((r) => r.id === n.rotationId) : null;
    const rotColor = rot ? (rot.color || "45, 212, 191") : "148, 163, 184";

    const spec = n.specialtyId ? getCurriculum().find((s) => s.id === n.specialtyId) : null;
    const cat  = (spec && n.categoryId) ? spec.categories.find((x) => x.id === n.categoryId) : null;

    let itemTitle = "";
    if (spec && cat && n.curriculumItemId) {
      const normCat = getNormalizedCategory(spec, cat, spec.categories.indexOf(cat));
      const found = normCat.items.find((it) => it.id === n.curriculumItemId);
      if (found) itemTitle = found.title;
    }

    const sum = caseSummaryInfo(n);
    const hasAttachments = sum.attachments > 0;

    const badges = [];
    if (spec) badges.push(`<span class="case-badge case-badge-spec">${spec.icon} ${escapeHTML(spec.title)}</span>`);
    if (cat)  badges.push(`<span class="case-badge case-badge-cat">${escapeHTML(cat.title)}</span>`);
    if (itemTitle) badges.push(`<span class="case-badge case-badge-item">${escapeHTML(itemTitle)}</span>`);

    const diagLine = n.diagnosis
      ? `<div class="case-card-diag"><span class="case-card-diag-icon">🎯</span><span class="case-card-diag-text">${escapeHTML(n.diagnosis)}</span></div>`
      : "";

    return `
      <div class="case-card-v2" data-case-id="${n.id}" style="--case-color:rgb(${rotColor})">
        <div class="case-card-v2-strip"></div>
        <div class="case-card-v2-body-wrap">
          <div class="case-card-v2-body">
            <div class="case-card-v2-head">
              <span class="case-card-v2-date">${dateStr}</span>
              ${rot ? `<span class="case-card-v2-rot" style="color:rgb(${rotColor})">${escapeHTML(rot.title)}</span>` : ""}
            </div>
            <div class="case-card-v2-title">${escapeHTML(n.title)}</div>
            ${diagLine}
            ${badges.length ? `<div class="case-card-v2-badges">${badges.join("")}</div>` : ""}
            <div class="case-card-v2-extra">
              ${n.complaint ? `<div class="case-card-v2-row"><span class="case-card-v2-row-label">شرح حال:</span> ${escapeHTML(n.complaint)}</div>` : ""}
              ${n.exam ? `<div class="case-card-v2-row"><span class="case-card-v2-row-label">معاینه:</span> ${escapeHTML(n.exam)}</div>` : ""}
              ${n.paraclinic ? `<div class="case-card-v2-row"><span class="case-card-v2-row-label">پاراکلینیک:</span> ${escapeHTML(n.paraclinic)}</div>` : ""}
              ${n.treatment ? `<div class="case-card-v2-row"><span class="case-card-v2-row-label">درمان:</span> ${escapeHTML(n.treatment)}</div>` : ""}
              ${n.learning ? `<div class="case-card-v2-row"><span class="case-card-v2-row-label">یادگیری:</span> ${escapeHTML(n.learning)}</div>` : ""}
            </div>
          </div>
          <div class="case-card-v2-fade"></div>
        </div>
        <div class="case-card-v2-actions">
          <button class="task-action" type="button" data-edit-case="${n.id}" title="ویرایش">✏️</button>
          <button class="task-action" type="button" data-delete-case="${n.id}" title="حذف">🗑️</button>
        </div>
        <div class="case-card-v2-side">
          <div class="case-card-v2-stat">
            <span class="case-card-v2-stat-num">${faNum(sum.filled)}</span>
            <span class="case-card-v2-stat-label">بخش</span>
          </div>
          ${hasAttachments ? `
            <div class="case-card-v2-stat is-attach">
              <span class="case-card-v2-stat-num">📎 ${faNum(sum.attachments)}</span>
              <span class="case-card-v2-stat-label">پیوست</span>
            </div>
          ` : ""}
        </div>
        <button class="case-card-v2-toggle" type="button" data-toggle-case="${n.id}" hidden>
          <span class="case-card-v2-toggle-icon">▾</span>
          <span class="case-card-v2-toggle-text">بیشتر</span>
        </button>
      </div>
    `;
  }

    function wireCasesEvents() {
    const addBtn = view.querySelector("[data-add-case]");
    if (addBtn) addBtn.addEventListener("click", () => openCaseForm(null));

    const specFilter = view.querySelector("#cf-spec-filter");
    if (specFilter) specFilter.addEventListener("change", () => {
      casesFilterSpec = specFilter.value;
      casesPage = 1;
      renderClinicalHub();
    });

    const rotFilter = view.querySelector("#cf-rot-filter");
    if (rotFilter) rotFilter.addEventListener("change", () => {
      casesFilterRot = rotFilter.value;
      casesPage = 1;
      renderClinicalHub();
    });

    const clearBtn = view.querySelector("[data-clear-filters]");
    if (clearBtn) clearBtn.addEventListener("click", () => {
      casesFilterSpec = "all";
      casesFilterRot = "all";
      casesPage = 1;
      renderClinicalHub();
    });

    // ─── صفحه‌بندی ───
    const prevBtn = view.querySelector("[data-cases-prev]");
    if (prevBtn) prevBtn.addEventListener("click", () => {
      if (casesPage > 1) {
        casesPage--;
        renderClinicalHub();
        // اسکرول به بالای لیست
        const viewEl = document.getElementById("view");
        if (viewEl) viewEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });

    const nextBtn = view.querySelector("[data-cases-next]");
    if (nextBtn) nextBtn.addEventListener("click", () => {
      casesPage++;
      renderClinicalHub();
      const viewEl = document.getElementById("view");
      if (viewEl) viewEl.scrollIntoView({ behavior: "smooth", block: "start" });
    });

    // ─── کارت‌ها: باز کردن کیس با کلیک + toggle ────
    view.querySelectorAll(".case-card-v2").forEach((card) => {
      const caseId = card.dataset.caseId;
      const toggleBtn = card.querySelector(".case-card-v2-toggle");

      card.addEventListener("click", (e) => {
        // اگه روی دکمه‌ی toggle کلیک شده، کاری با باز کردن detail نداشته باش
        if (e.target.closest("[data-toggle-case]")) return;
        openCaseDetail(caseId);
      });

      if (toggleBtn) {
        toggleBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const expanded = card.classList.toggle("is-expanded");
          if (expanded) {
            toggleBtn.querySelector(".case-card-v2-toggle-text").textContent = "کمتر";
          } else {
            toggleBtn.querySelector(".case-card-v2-toggle-text").textContent = "بیشتر";
            // اسکرول نرم به کارت تا کاربر گم نشه
            card.scrollIntoView({ behavior: "smooth", block: "nearest" });
          }
        });
      }
    });

    // ─── تشخیص overflow برای نمایش/مخفی دکمه ──────
    requestAnimationFrame(() => {
      view.querySelectorAll(".case-card-v2").forEach((card) => {
        const wrap = card.querySelector(".case-card-v2-body-wrap");
        const toggle = card.querySelector(".case-card-v2-toggle");
        if (!wrap || !toggle) return;
        // wrap.clientHeight بدون fade‌ـه، پس از scrollHeight استفاده می‌کنیم
        const body = card.querySelector(".case-card-v2-body");
        if (!body) return;
        if (body.scrollHeight > wrap.clientHeight + 2) {
          card.classList.add("is-clamped");
          toggle.hidden = false;
        }
      });
    });

    view.querySelectorAll("[data-edit-case]").forEach((b) => {
      b.addEventListener("click", (e) => { e.stopPropagation(); openCaseForm(b.dataset.editCase); });
    });
    view.querySelectorAll("[data-delete-case]").forEach((b) => {
      b.addEventListener("click", (e) => { e.stopPropagation(); confirmDeleteCase(b.dataset.deleteCase); });
    });
    view.querySelectorAll("[data-plan-case]").forEach((b) => {
      b.addEventListener("click", (e) => { e.stopPropagation(); openCasePlanTask(b.dataset.planCase); });
    });
  }
  function openCaseForm(id) {
    const isEdit = !!id;
    const existing = isEdit ? getCases().find((x) => x.id === id) : null;
    if (isEdit && !existing) return;

    const today = parseJalali(todayJalali());
    const todayStr = todayJalali();
    const curriculum = getCurriculum();
    const n = existing ? normalizeCase(existing) : null;

    let init;
    if (isEdit) {
      init = {
        date: parseJalali(n.date) || today,
        rotationId: n.rotationId || "",
        specialtyId: n.specialtyId || "",
        categoryId: n.categoryId || "",
        curriculumItemId: n.curriculumItemId || "",
        title: n.title || "",
        complaint: n.complaint || "",
        exam: n.exam || "",
        paraclinic: n.paraclinic || "",
        diagnosis: n.diagnosis || "",
        treatment: n.treatment || "",
        learning: n.learning || "",
        notes: n.notes || ""
      };
    } else {
      const activeRot = state.rotations.find((r) =>
        compareJalaliDate(r.startDate, todayStr) <= 0 && compareJalaliDate(todayStr, r.endDate) <= 0
      );
      init = {
        date: today,
        rotationId: activeRot ? activeRot.id : "",
        specialtyId: "",
        categoryId: "",
        curriculumItemId: "",
        title: "",
        complaint: "",
        exam: "",
        paraclinic: "",
        diagnosis: "",
        treatment: "",
        learning: "",
        notes: ""
      };
    }

    function categoryOptionsHTML(specId, selectedCatId) {
      const spec = curriculum.find((s) => s.id === specId);
      if (!spec) return '<option value="">— ابتدا بخش را انتخاب کن —</option>';
      return '<option value="">— بدون دسته —</option>' + spec.categories.map((c) =>
        `<option value="${c.id}" ${c.id === selectedCatId ? "selected" : ""}>${escapeHTML(c.title)}</option>`
      ).join("");
    }

    function itemOptionsHTML(specId, catId, selectedItemId) {
      if (!specId || !catId) return '<option value="">— ابتدا بخش و دسته —</option>';
      const spec = curriculum.find((s) => s.id === specId);
      if (!spec) return '<option value="">—</option>';
      const cat = (spec.categories || []).find((c) => c.id === catId);
      if (!cat) return '<option value="">—</option>';
      const normCat = getNormalizedCategory(spec, cat, spec.categories.indexOf(cat));
      if (!normCat.items.length) return '<option value="">— موردی نیست —</option>';
      return '<option value="">— بدون موضوع —</option>' + normCat.items.map((it) =>
        `<option value="${it.id}" ${it.id === selectedItemId ? "selected" : ""}>${escapeHTML(it.title)}</option>`
      ).join("");
    }

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>${isEdit ? "ویرایش کیس" : "افزودن کیس جدید"}</h3>

        <div class="form-row">
          <label for="cf-title">عنوان *</label>
          <input type="text" id="cf-title" placeholder="مثلاً: پسر ۵ ساله با تب و استفراغ" autocomplete="off" value="${escapeHTML(init.title)}">
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label>تاریخ *</label>
            ${datePickerHTML("cf", init.date.jy, init.date.jm, init.date.jd)}
          </div>
          <div class="form-row">
            <label for="cf-rotation">چرخش</label>
            <select id="cf-rotation">
              <option value="">— بدون چرخش —</option>
              ${state.rotations.map((r) => `<option value="${r.id}" ${r.id === init.rotationId ? "selected" : ""}>${escapeHTML(r.title)}</option>`).join("")}
            </select>
          </div>
        </div>

        <div class="form-grid-2">
          <div class="form-row">
            <label for="cf-specialty">بخش</label>
            <select id="cf-specialty">
              <option value="">— بدون بخش —</option>
              ${curriculum.map((s) => `<option value="${s.id}" ${s.id === init.specialtyId ? "selected" : ""}>${s.icon} ${escapeHTML(s.title)}</option>`).join("")}
            </select>
          </div>
          <div class="form-row">
            <label for="cf-category">دسته</label>
            <select id="cf-category">
              ${categoryOptionsHTML(init.specialtyId, init.categoryId)}
            </select>
          </div>
        </div>

        <div class="form-row">
          <label for="cf-item">موضوع کوریکولوم (اختیاری)</label>
          <select id="cf-item">
            ${itemOptionsHTML(init.specialtyId, init.categoryId, init.curriculumItemId)}
          </select>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">📋 شرح حال</div>
          <div class="form-row">
            <textarea id="cf-complaint" rows="3" placeholder="شکایت اصلی، سیر بیماری، سابقه...">${escapeHTML(init.complaint)}</textarea>
          </div>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">🩺 معاینه</div>
          <div class="form-row">
            <textarea id="cf-exam" rows="2" placeholder="یافته‌های مثبت و منفی مهم...">${escapeHTML(init.exam)}</textarea>
          </div>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">🧪 پاراکلینیک</div>
          <div class="form-row">
            <textarea id="cf-paraclinic" rows="2" placeholder="آزمایش، تصویربرداری، ECG...">${escapeHTML(init.paraclinic)}</textarea>
          </div>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">🎯 تشخیص</div>
          <div class="form-row">
            <input type="text" id="cf-diagnosis" placeholder="تشخیص نهایی یا تشخیص افتراقی" autocomplete="off" value="${escapeHTML(init.diagnosis)}">
          </div>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">💊 درمان</div>
          <div class="form-row">
            <textarea id="cf-treatment" rows="2" placeholder="داروها، دوز، پیگیری...">${escapeHTML(init.treatment)}</textarea>
          </div>
        </div>

        <div class="case-form-section">
          <div class="case-form-section-title">💡 نکته‌ی یادگیری</div>
          <div class="form-row">
            <textarea id="cf-learning" rows="3" placeholder="مهم‌ترین چیزی که از این کیس یاد گرفتی...">${escapeHTML(init.learning)}</textarea>
          </div>
        </div>

        <div class="form-row">
          <label for="cf-notes">یادداشت (اختیاری)</label>
          <textarea id="cf-notes" rows="2" placeholder="جزئیات بیشتر...">${escapeHTML(init.notes)}</textarea>
        </div>

        <p class="form-hint" style="margin-top:4px">
          📎 برای افزودن عکس و فایل، بعد از ذخیره، روی کیس کلیک کن و از صفحه‌ی جزئیات استفاده کن.
        </p>

        <div class="modal-actions">
          ${isEdit ? '<button class="btn ghost" type="button" data-delete-task title="حذف">🗑️ حذف</button>' : ""}
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm>${isEdit ? "ذخیره" : "ایجاد"}</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const m = overlay.querySelector("#cf-month");
    const y = overlay.querySelector("#cf-year");
    if (m) m.addEventListener("change", () => refreshDatePicker("cf"));
    if (y) y.addEventListener("change", () => refreshDatePicker("cf"));

    const specSel = overlay.querySelector("#cf-specialty");
    const catSel  = overlay.querySelector("#cf-category");
    const itemSel = overlay.querySelector("#cf-item");
    specSel.addEventListener("change", () => {
      catSel.innerHTML = categoryOptionsHTML(specSel.value, "");
      itemSel.innerHTML = itemOptionsHTML(specSel.value, "", "");
    });
    catSel.addEventListener("change", () => {
      itemSel.innerHTML = itemOptionsHTML(specSel.value, catSel.value, "");
    });

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);
    setTimeout(() => { const i = overlay.querySelector("#cf-title"); if (i) i.focus(); }, 60);

    const submit = () => {
      const title = overlay.querySelector("#cf-title").value.trim();
      if (!title) { toast("عنوان کیس را وارد کن", "error"); return; }

      const date = readDatePicker("cf");
      const rotationId  = overlay.querySelector("#cf-rotation").value;
      const specialtyId = overlay.querySelector("#cf-specialty").value;
      const categoryId  = overlay.querySelector("#cf-category").value;
      const curriculumItemId = overlay.querySelector("#cf-item").value;
      const complaint  = overlay.querySelector("#cf-complaint").value.trim();
      const exam       = overlay.querySelector("#cf-exam").value.trim();
      const paraclinic = overlay.querySelector("#cf-paraclinic").value.trim();
      const diagnosis  = overlay.querySelector("#cf-diagnosis").value.trim();
      const treatment  = overlay.querySelector("#cf-treatment").value.trim();
      const learning   = overlay.querySelector("#cf-learning").value.trim();
      const notes      = overlay.querySelector("#cf-notes").value.trim();

      if (isEdit) {
        Object.assign(existing, {
          date, rotationId, specialtyId, categoryId, curriculumItemId,
          title, complaint, exam, paraclinic, diagnosis, treatment, learning, notes,
          updatedAt: Date.now()
        });
        toast("کیس به‌روزرسانی شد");
      } else {
        const newId = _mkId("c");
        state.cases.push({
          id: newId, date, rotationId, specialtyId, categoryId, curriculumItemId,
          title, complaint, exam, paraclinic, diagnosis, treatment, learning, notes,
          attachments: [], tags: [],
          createdAt: Date.now(), updatedAt: Date.now()
        });
        toast("کیس ثبت شد");
      }
      saveState();
      close();
      renderClinicalHub();
    };

    overlay.querySelector("[data-confirm]").addEventListener("click", submit);
  }
  
  /* ╔═══ [PATCH:case-detail] ═══╗ */

  let _activeDetailOverlay = null;
  let _detailBlobUrls = [];

  function openCaseDetail(id) {
    const c = getCases().find((x) => x.id === id);
    if (!c) return;
    const n = normalizeCase(c);
    if (!n) return;

    // پاک کردن overlay قبلی
    closeCaseDetail();

    const p = parseJalali(n.date);
    const dateStr = p ? prettyDateWD(p.jy, p.jm, p.jd) : n.date;
    const rot = n.rotationId ? state.rotations.find((r) => r.id === n.rotationId) : null;
    const rotColor = rot ? (rot.color || "45, 212, 191") : "148, 163, 184";

    const spec = n.specialtyId ? getCurriculum().find((s) => s.id === n.specialtyId) : null;
    const cat  = (spec && n.categoryId) ? spec.categories.find((x) => x.id === n.categoryId) : null;

    let itemTitle = "";
    if (spec && cat && n.curriculumItemId) {
      const normCat = getNormalizedCategory(spec, cat, spec.categories.indexOf(cat));
      const found = normCat.items.find((it) => it.id === n.curriculumItemId);
      if (found) itemTitle = found.title;
    }

    const overlay = document.createElement("div");
    overlay.className = "case-detail-overlay";
    overlay.innerHTML = `
      <div class="case-detail">
        <header class="case-detail-header">
          <button class="case-detail-back" type="button" data-detail-close>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"
                 stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="5" y1="12" x2="19" y2="12"/>
              <polyline points="12 5 19 12 12 19"/>
            </svg>
            بازگشت
          </button>
          <div class="case-detail-header-actions">
            <button class="btn ghost small" type="button" data-detail-edit>✏️ ویرایش</button>
            <button class="btn ghost small danger-ghost" type="button" data-detail-delete>🗑️ حذف</button>
          </div>
        </header>

        <div class="case-detail-body">
          <div class="case-detail-hero" style="--case-color:rgb(${rotColor})">
            <div class="case-detail-meta">
              <span class="case-detail-chip">📅 ${dateStr}</span>
              ${rot ? `<span class="case-detail-chip" style="color:rgb(${rotColor})">🏥 ${escapeHTML(rot.title)}</span>` : ""}
              ${spec ? `<span class="case-detail-chip">${spec.icon} ${escapeHTML(spec.title)}</span>` : ""}
              ${cat ? `<span class="case-detail-chip">${escapeHTML(cat.title)}</span>` : ""}
              ${itemTitle ? `<span class="case-detail-chip">${escapeHTML(itemTitle)}</span>` : ""}
            </div>
            <h1 class="case-detail-title">${escapeHTML(n.title)}</h1>
            ${n.diagnosis ? `
              <div class="case-detail-diagnosis">
                <span class="case-detail-diagnosis-icon">🎯</span>
                <div>
                  <div class="case-detail-diagnosis-label">تشخیص</div>
                  <div class="case-detail-diagnosis-text">${escapeHTML(n.diagnosis)}</div>
                </div>
              </div>
            ` : ""}
          </div>

          ${n.complaint ? caseDetailSectionHTML("📋", "شرح حال", n.complaint, "complaint") : ""}
          ${n.exam ? caseDetailSectionHTML("🩺", "معاینه", n.exam, "exam") : ""}
          ${n.paraclinic ? caseDetailSectionHTML("🧪", "پاراکلینیک", n.paraclinic, "paraclinic") : ""}
          ${n.treatment ? caseDetailSectionHTML("💊", "درمان", n.treatment, "treatment") : ""}
          ${n.learning ? caseDetailSectionHTML("💡", "نکته‌ی یادگیری", n.learning, "learning") : ""}
          ${n.notes ? caseDetailSectionHTML("📝", "یادداشت", n.notes, "notes") : ""}

          <section class="case-detail-section case-detail-attachments">
            <div class="case-detail-section-head">
              <span class="case-detail-section-icon">📎</span>
              <span class="case-detail-section-title">پیوست‌ها</span>
              <span class="case-detail-section-count" id="attach-count">0</span>
            </div>
            <div class="case-detail-attach-actions">
              <input type="file" id="attach-input" accept="image/*,.pdf" multiple hidden>
              <button class="btn ghost small" type="button" data-attach-pick>
                📷 افزودن عکس یا فایل
              </button>
            </div>
            <div class="case-detail-gallery" id="attach-gallery">
              <div class="case-detail-gallery-loading">در حال بارگذاری...</div>
            </div>
          </section>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    document.body.style.overflow = "hidden";

    _activeDetailOverlay = overlay;

    // ─── wire ───────────────────────────────────────
    overlay.querySelector("[data-detail-close]").addEventListener("click", closeCaseDetail);
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeCaseDetail();
    });

    const escHandler = (e) => { if (e.key === "Escape") closeCaseDetail(); };
    document.addEventListener("keydown", escHandler);
    overlay._esc = escHandler;

    overlay.querySelector("[data-detail-edit]").addEventListener("click", () => {
      closeCaseDetail();
      setTimeout(() => openCaseForm(n.id), 100);
    });

    overlay.querySelector("[data-detail-delete]").addEventListener("click", () => {
      closeCaseDetail();
      setTimeout(() => confirmDeleteCase(n.id), 100);
    });

    // ─── attachments ───────────────────────────────
    const fileInput = overlay.querySelector("#attach-input");
    const pickBtn = overlay.querySelector("[data-attach-pick]");
    const galleryEl = overlay.querySelector("#attach-gallery");
    const countEl = overlay.querySelector("#attach-count");

    function renderGallery(items) {
      // پاک‌کردن blob urlهای قبلی
      _detailBlobUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
      _detailBlobUrls = [];

      countEl.textContent = faNum(items.length);

      if (items.length === 0) {
        galleryEl.innerHTML = `<div class="case-detail-gallery-empty">هنوز فایلی آپلود نشده — عکس رادیولوژی، آزمایش یا هر چیز مهمی رو اینجا نگه‌دار.</div>`;
        return;
      }

      galleryEl.innerHTML = items.map((item) => {
        const url = attachmentUrl(item.caseId, item.storedName);
        _detailBlobUrls.push(url);
        const isImage = item.type && item.type.indexOf("image/") === 0;
        const isPdf = item.type === "application/pdf";
        const sizeKB = Math.round((item.size || 0) / 1024);
        const sizeLabel = sizeKB > 1024 ? (Math.round(sizeKB / 102.4) / 10) + " MB" : sizeKB + " KB";

        let previewHTML;
        if (isImage) {
          previewHTML = `<img src="${url}" alt="${escapeHTML(item.name)}" loading="lazy">`;
        } else if (isPdf) {
          previewHTML = `<div class="case-attach-file-icon">📄</div>`;
        } else {
          previewHTML = `<div class="case-attach-file-icon">📁</div>`;
        }

        return `
          <div class="case-attach-item" data-attach-id="${item.id}">
            <button class="case-attach-thumb" type="button" data-open-attach="${item.id}">
              ${previewHTML}
              ${isImage ? "" : `<div class="case-attach-file-name">${escapeHTML(item.name)}</div>`}
            </button>
            <div class="case-attach-info">
              <div class="case-attach-name">${escapeHTML(item.name)}</div>
              <div class="case-attach-size">${sizeLabel}</div>
            </div>
            <button class="case-attach-del" type="button" data-del-attach="${item.id}" title="حذف">🗑️</button>
          </div>
        `;
      }).join("");

      // wire
      galleryEl.querySelectorAll("[data-open-attach]").forEach((btn) => {
        btn.addEventListener("click", () => openAttachmentViewer(btn.dataset.openAttach, items));
      });
      galleryEl.querySelectorAll("[data-del-attach]").forEach((btn) => {
        btn.addEventListener("click", () => confirmDeleteAttachment(btn.dataset.delAttach, n.id, () => loadGallery()));
      });
    }

    function loadGallery() {
      listAttachmentsByCase(n.id)
        .then((items) => {
          items.sort((a, b) => (a.uploadedAt || 0) - (b.uploadedAt || 0));
          renderGallery(items);
        })
        .catch((err) => {
          console.error(err);
          galleryEl.innerHTML = `<div class="case-detail-gallery-empty">خطا در بارگذاری پیوست‌ها</div>`;
        });
    }

    pickBtn.addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      const files = Array.from(fileInput.files || []);
      if (files.length === 0) return;
      pickBtn.disabled = true;
      pickBtn.textContent = "⏳ در حال ذخیره...";

      const total = files.length;
      let current = 0;
      let saved = 0;
      const savedIds = [];

      const finalize = () => {
        const target = state.cases.find((x) => x.id === n.id);
        if (target && savedIds.length > 0) {
          if (!Array.isArray(target.attachments)) target.attachments = [];
          savedIds.forEach((id) => target.attachments.push(id));
          saveState();
        }
        pickBtn.disabled = false;
        pickBtn.textContent = "📷 افزودن عکس یا فایل";
        fileInput.value = "";
        hideUploadProgress();
        if (saved > 0) {
          toast(`${faNum(saved)} فایل اضافه شد`);
        }
        // ─── reload gallery ───
        try { loadGallery(); } catch (e) { console.warn(e); }
        // ─── آپدیت counter کارت ───
        try { updateCaseCardCounter(n.id); } catch (e) { console.warn(e); }
      };

      const processNext = () => {
        if (current >= total) { finalize(); return; }
        const f = files[current];
        current++;

        if (f.size > 100 * 1024 * 1024) {
          toast(`«${f.name}» بزرگ‌تر از ۱۰۰ مگابایته و رد شد`, "error");
          processNext();
          return;
        }

        showUploadProgress(f.name, current, total);
        saveAttachment(n.id, f, (pct) => updateUploadProgress(pct))
          .then((id) => {
            saved++;
            savedIds.push(id);
            processNext();
          })
          .catch((err) => {
            console.error(err);
            toast(`خطا در ذخیره‌ی «${f.name}»`, "error");
            processNext();
          });
      };

      processNext();
    });
    // ─── شروع بارگذاری ────────────────────────────
    loadGallery();
  }

  function closeCaseDetail() {
    const overlay = _activeDetailOverlay;
    if (!overlay) return;

    if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
    _detailBlobUrls.forEach((u) => { try { URL.revokeObjectURL(u); } catch (e) {} });
    _detailBlobUrls = [];

    overlay.classList.remove("open");
    document.body.style.overflow = "";

    setTimeout(() => overlay.remove(), 250);
    _activeDetailOverlay = null;
  }

  function caseDetailSectionHTML(icon, title, text, field) {
    return `
      <section class="case-detail-section">
        <div class="case-detail-section-head">
          <span class="case-detail-section-icon">${icon}</span>
          <span class="case-detail-section-title">${escapeHTML(title)}</span>
        </div>
        <div class="case-detail-section-body">${escapeHTML(text)}</div>
      </section>
    `;
  }

  function confirmDeleteAttachment(attId, caseId, onDone) {
    openModal({
      title: "حذف پیوست",
      message: "آیا از حذف این فایل مطمئن هستی؟ این عمل قابل بازگشت نیست.",
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        deleteAttachment(attId, caseId).then(() => {
          // ─── حذف از state.cases ───
          const c = state.cases.find((x) => x.id === caseId);
          if (c && Array.isArray(c.attachments)) {
            c.attachments = c.attachments.filter((id) => id !== attId);
            saveState();
          }
          toast("پیوست حذف شد");
          if (typeof onDone === "function") onDone();
        }).catch((err) => {
          console.error("[deleteAttachment] error:", err);
          toast("خطا در حذف پیوست: " + (err.message || err), "error");
        });
      }
    });
  }
  function openAttachmentViewer(attId, items) {
    const item = items.find((x) => x.id === attId);
    if (!item) return;

    const url = attachmentUrl(item.caseId, item.storedName);
    const isImage = item.type && item.type.indexOf("image/") === 0;
    const isPdf = item.type === "application/pdf";

    const overlay = document.createElement("div");
    overlay.className = "attachment-viewer";

    let contentHTML;
    if (isImage) {
      contentHTML = `<img src="${url}" alt="${escapeHTML(item.name)}" class="attachment-viewer-img">`;
    } else if (isPdf) {
      contentHTML = `<iframe src="${url}" class="attachment-viewer-pdf" title="${escapeHTML(item.name)}"></iframe>`;
    } else {
      contentHTML = `
        <div class="attachment-viewer-file">
          <div class="attachment-viewer-file-icon">📁</div>
          <div class="attachment-viewer-file-name">${escapeHTML(item.name)}</div>
          <a href="${url}" download="${escapeHTML(item.name)}" class="btn primary">دانلود فایل</a>
        </div>
      `;
    }

    overlay.innerHTML = `
      <button class="attachment-viewer-close" type="button" aria-label="بستن">×</button>
      <div class="attachment-viewer-content">${contentHTML}</div>
      <div class="attachment-viewer-info">
        <span class="attachment-viewer-name">${escapeHTML(item.name)}</span>
        <a href="${url}" download="${escapeHTML(item.name)}" class="attachment-viewer-dl" title="دانلود">⬇️</a>
      </div>
    `;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      overlay.classList.remove("open");
      setTimeout(() => {
        overlay.remove();
        try { URL.revokeObjectURL(url); } catch (e) {}
      }, 220);
      document.removeEventListener("keydown", esc);
    };

    const esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", esc);

    overlay.querySelector(".attachment-viewer-close").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
  }

  /* ╚═══ [/PATCH:case-detail] ═══╝ */


  function confirmDeleteCase(id) {
    const c = getCases().find((x) => x.id === id);
    if (!c) return;
    openModal({
      title: "حذف کیس",
      message: `آیا از حذف «${escapeHTML(c.title)}» مطمئن هستی؟`,
      confirmText: "حذف",
      danger: true,
      onConfirm: () => {
        deleteCaseAttachments(id).catch((err) => { console.warn("[deleteCase]", err); });
        state.cases = state.cases.filter((x) => x.id !== id);
        saveState();
        renderClinicalHub();
        toast("کیس حذف شد");
      }
    });
  }

  /* ╚═══ [/PATCH:cases-engine] ═══╝ */

  /* ─── Progress & Data placeholders ─────────────────────── */

  function renderProgress() {
    var LO = window.InternshipResidency && window.InternshipResidency.loading;
    if (LO) {
      LO.defer("در حال آماده‌سازی پیشرفت...", _renderProgressBody, {
        sub: "در حال محاسبه‌ی آمار و روندها"
      }).catch(function (e) { console.warn("[renderProgress]", e); });
    } else {
      _renderProgressBody();
    }
  }

  function _renderProgressBody() {
    const overall = overallStats();
    const lifeAreas = LIFE_AREAS.map((area) => ({
      ...area,
      progress: areaProgress(area.id),
      total: state.tasks.filter((t) => t.areaId === area.id && !t.cancelled).length,
      done: state.tasks.filter((t) => t.areaId === area.id && t.completed && !t.cancelled).length
    }));

    const currentRot = getCurrentRotation();
    let rotationHTML = "";
    if (currentRot) {
      const rStart = parseJalali(currentRot.startDate);
      const rEnd = parseJalali(currentRot.endDate);
      const rotStartDay = jalaliToDayNumber(rStart.jy, rStart.jm, rStart.jd);
      const rotEndDay = jalaliToDayNumber(rEnd.jy, rEnd.jm, rEnd.jd);
      const todayP = parseJalali(todayJalali());
      const todayDay = jalaliToDayNumber(todayP.jy, todayP.jm, todayP.jd);
      const totalDays = rotEndDay - rotStartDay + 1;
      const elapsed = Math.max(0, Math.min(totalDays, todayDay - rotStartDay + 1));
      const pct = Math.round((elapsed / totalDays) * 100);
      const rotColor = currentRot.color || "45, 212, 191";
      const rotColorCSS = `rgb(${rotColor})`;

      rotationHTML = `
        <div class="prog-rot-card" style="--rotation-color:${rotColorCSS}">
          <div class="prog-rot-head">
            <span class="prog-rot-icon">🏥</span>
            <div class="prog-rot-text">
              <div class="prog-rot-title">${escapeHTML(currentRot.title)}</div>
              <div class="prog-rot-sub">${prettyDate(rStart.jy, rStart.jm, rStart.jd)} → ${prettyDate(rEnd.jy, rEnd.jm, rEnd.jd)}</div>
            </div>
            <div class="prog-rot-pct">${faNum(pct)}٪</div>
          </div>
          <div class="progress-track">
            <div class="progress-fill" style="width:${pct}%;background:linear-gradient(90deg, rgba(${rotColor},.65), ${rotColorCSS})"></div>
          </div>
          <div class="prog-rot-days">${faNum(elapsed)} از ${faNum(totalDays)} روز</div>
        </div>
      `;
    } else {
      rotationHTML = `
        <div class="prog-empty-card">
          <span style="font-size:24px;opacity:.5">🏥</span>
          <p>در حال حاضر روتیشن فعالی نداری.</p>
        </div>
      `;
    }

    const currProgress = overallCurriculumProgress();
    const procProgress = overallProcedureProgress();

    const curriculum = getCurriculum();
    const curriculumTotal = curriculum.flatMap((s) =>
      s.categories.flatMap((c, ci) => getNormalizedCategory(s, c, ci).items)
    ).length;

    const proceduresList = getProcedures();
    const proceduresTotal = proceduresList.reduce((s, c) => s + (c.items || []).length, 0);

    const studyTasks = state.tasks.filter((t) => t.areaId === "study" && !t.cancelled);
    const studyDone = studyTasks.filter((t) => t.completed).length;
    const studyPct = studyTasks.length ? Math.round((studyDone / studyTasks.length) * 100) : 0;

    const resTasks = state.tasks.filter((t) => t.areaId === "residency" && !t.cancelled);
    const resDone = resTasks.filter((t) => t.completed).length;
    const resPct = resTasks.length ? Math.round((resDone / resTasks.length) * 100) : 0;

    const casesCount = (state.cases || []).length;
    const shiftsCount = (state.shifts || []).length;
    const rotationsCount = (state.rotations || []).length;
    const importsCount = (state.imports || []).length;

    view.innerHTML = `
      <div class="prog-head">
        <h2 class="prog-title">📊 پیشرفت کلی</h2>
      </div>

      <section class="prog-overall">
        <div class="prog-overall-text">
          <span class="hero-label">جمع کل کارها</span>
          <div class="hero-value">${faNum(overall.done)} از ${faNum(overall.total)} انجام شده</div>
          <p class="hero-sub">در تمام بخش‌های زندگی</p>
        </div>
        <div class="ring" style="--p:0" data-ring-target="${overall.percent}">
          <svg viewBox="0 0 120 120" aria-hidden="true">
            <defs>
              <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stop-color="#5eead4"/>
                <stop offset="100%" stop-color="#818cf8"/>
              </linearGradient>
            </defs>
            <circle class="ring-bg" cx="60" cy="60" r="52"/>
            <circle class="ring-fg" cx="60" cy="60" r="52"/>
          </svg>
          <div class="ring-label">${faNum(overall.percent)}٪</div>
        </div>
      </section>

      <div class="prog-grid-2">
        <div>
          <h3 class="prog-section-title">🏥 روتیشن فعلی</h3>
          ${rotationHTML}
          ${rotationsRoadmapHTML()}
        </div>
        <div>
          <h3 class="prog-section-title">🩺 بخش‌های زندگی</h3>
          <div class="prog-areas">
            ${lifeAreas.map(progAreaRowHTML).join("")}
          </div>
        </div>
      </div>

      <div class="prog-grid-2">
        <div>
          <h3 class="prog-section-title">📚 کوریکولوم بالینی</h3>
          <div class="prog-big-card">
            <div class="prog-big-head">
              <span class="prog-big-icon">📚</span>
              <div class="prog-big-text">
                <div class="prog-big-title">${faNum(curriculumTotal)} آیتم در ${faNum(curriculum.length)} تخصص</div>
                <div class="prog-big-sub">شروع‌نشده / دیده‌ام / مسلط‌ام</div>
              </div>
              <div class="prog-big-pct">${faNum(currProgress)}٪</div>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${currProgress}%"></div></div>
          </div>
        </div>
        <div>
          <h3 class="prog-section-title">🩹 مهارت‌های عملی</h3>
          <div class="prog-big-card">
            <div class="prog-big-head">
              <span class="prog-big-icon">🩹</span>
              <div class="prog-big-text">
                <div class="prog-big-title">${faNum(proceduresTotal)} پروسیجر در ${faNum(proceduresList.length)} دسته</div>
                <div class="prog-big-sub">دیده‌ام / با کمک / مستقل</div>
              </div>
              <div class="prog-big-pct">${faNum(procProgress)}٪</div>
            </div>
            <div class="progress-track"><div class="progress-fill" style="width:${procProgress}%"></div></div>
          </div>
        </div>
      </div>

      <h3 class="prog-section-title">📖 مطالعه و رزیدنتی</h3>
      <div class="prog-two-col">
        <div class="prog-block">
          <div class="prog-block-head">
            <span>📖</span>
            <span class="prog-block-title">مطالعه</span>
            <span class="prog-block-pct">${faNum(studyPct)}٪</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${studyPct}%"></div></div>
          <div class="prog-block-sub">${faNum(studyDone)} از ${faNum(studyTasks.length)} تسک</div>
        </div>

        <div class="prog-block">
          <div class="prog-block-head">
            <span>📝</span>
            <span class="prog-block-title">رزیدنتی</span>
            <span class="prog-block-pct">${faNum(resPct)}٪</span>
          </div>
          <div class="progress-track"><div class="progress-fill" style="width:${resPct}%"></div></div>
          <div class="prog-block-sub">${faNum(resDone)} از ${faNum(resTasks.length)} تسک</div>
        </div>
      </div>

      <h3 class="prog-section-title">📈 آمار</h3>
      <div class="prog-stats-grid">
        <div class="prog-stat">
          <span class="prog-stat-num">${faNum(casesCount)}</span>
          <span class="prog-stat-label">کیس ثبت‌شده</span>
        </div>
        <div class="prog-stat">
          <span class="prog-stat-num">${faNum(shiftsCount)}</span>
          <span class="prog-stat-label">کشیک ثبت‌شده</span>
        </div>
        <div class="prog-stat">
          <span class="prog-stat-num">${faNum(rotationsCount)}</span>
          <span class="prog-stat-label">چرخش</span>
        </div>
        <div class="prog-stat">
          <span class="prog-stat-num">${faNum(importsCount)}</span>
          <span class="prog-stat-label">بسته‌ی واردشده</span>
        </div>
      </div>

      <section id="analytics-section" class="an9-root"></section>

      <footer class="app-footer">Internship OS — نسخه ${faNum(APP_VERSION)}</footer>
    `;

    document.title = "پیشرفت — Internship OS";

    // ─── [PATCH:analytics-v9] Render analytics ───
    try {
      if (window.InternshipResidency && window.InternshipResidency.analyticsUI) {
        var anContainer = document.getElementById("analytics-section");
        if (anContainer) window.InternshipResidency.analyticsUI.render(anContainer);
      }
    } catch (e) { console.warn("[analytics] render failed:", e); }

    requestAnimationFrame(() => {
      const ring = view.querySelector(".ring[data-ring-target]");
      if (ring) ring.style.setProperty("--p", ring.dataset.ringTarget);
    });
  }
  function rotationsRoadmapHTML() {
    const rotations = state.rotations || [];
    if (rotations.length === 0) return "";

    const today = todayJalali();
    const todayP = parseJalali(today);
    if (!todayP) return "";
    const todayDay = jalaliToDayNumber(todayP.jy, todayP.jm, todayP.jd);

    const ROT_ICONS = {
      "اطفال": "👶",
      "داخلی": "🫀",
      "جراحی": "🔪",
      "زنان و زایمان": "🤰",
      "قلب": "❤️",
      "عفونی": "🦠",
      "اورژانس": "🚨",
      "گوش، حلق، بینی": "👂",
      "پزشکی اجتماعی": "🏥",
      "پوست": "🩹",
      "ارولوژی": "💧",
      "روانپزشکی": "🧠"
    };

    function iconFor(title) {
      for (const key of Object.keys(ROT_ICONS)) {
        if (title.indexOf(key) !== -1) return ROT_ICONS[key];
      }
      return "🏥";
    }

    const rows = rotations.map((r, idx) => {
      const rp = parseJalali(r.startDate);
      const re = parseJalali(r.endDate);
      if (!rp || !re) return "";

      const rStart = jalaliToDayNumber(rp.jy, rp.jm, rp.jd);
      const rEnd = jalaliToDayNumber(re.jy, re.jm, re.jd);
      const totalDays = rEnd - rStart + 1;
      const elapsed = Math.max(0, Math.min(totalDays, todayDay - rStart + 1));
      const pct = Math.round((elapsed / totalDays) * 100);
      const isActive = todayDay >= rStart && todayDay <= rEnd;
      const isDone = todayDay > rEnd;

      const color = r.color || "45, 212, 191";
      let statusCls = "is-upcoming";
      let statusText = faNum(idx + 1);
      if (isActive) { statusCls = "is-active"; statusText = faNum(pct) + "٪"; }
      else if (isDone) { statusCls = "is-done"; statusText = "✓"; }

      return `
        <div class="prog-roadmap-row ${statusCls}"
             style="--rotation-color:rgb(${color});--rotation-rgb:${color}">
          <span class="prog-roadmap-strip"></span>
          <span class="prog-roadmap-icon">${iconFor(r.title)}</span>
          <span class="prog-roadmap-title">${escapeHTML(r.title)}</span>
          <span class="prog-roadmap-status">${statusText}</span>
        </div>
      `;
    }).join("");

    return `
      <h3 class="prog-section-title">🗺️ مسیر چرخش‌ها</h3>
      <div class="prog-roadmap">${rows}</div>
    `;
  }

  function progAreaRowHTML(area) {
    return `
      <div class="prog-area-row" style="--accent:${area.accent}">
        <span class="prog-area-icon">${area.icon}</span>
        <span class="prog-area-title">${escapeHTML(area.title)}</span>
        <span class="prog-area-count">${faNum(area.done)}/${faNum(area.total)}</span>
        <span class="prog-area-bar">
          <span class="prog-area-bar-fill" style="width:${area.progress}%"></span>
        </span>
        <span class="prog-area-pct">${faNum(area.progress)}٪</span>
      </div>
    `;
  }

  /* ─── Help page ────────────────────────────────────────── */
  const HELP_STEP_KEY = "internship-os.help.step";

  function loadHelpStep() {
    try {
      const v = parseInt(localStorage.getItem(HELP_STEP_KEY), 10);
      if (!isNaN(v) && v >= 0 && v <= HELP_QUICK_STEPS.length) return v;
    } catch (e) {}
    return 0;
  }

  function saveHelpStep(v) {
    try { localStorage.setItem(HELP_STEP_KEY, String(v)); } catch (e) {}
  }

  let helpQuickStep = loadHelpStep();

  const HELP_QUICK_STEPS = [
    {
      icon: "📅",
      title: "تاریخ شروع اینترنی رو ثبت کن",
      desc: "اولین قدم اینه که مشخص کنی اینترنی‌ات از کِی شروع شده. این تاریخ پایه‌ی همه‌ی محاسبات بعدیه.",
      hint: "برو بالین → مسیر اینترنی → تاریخ شروع رو انتخاب کن → «ثبت و شروع»",
      tint: "56, 189, 248"
    },
    {
      icon: "🎯",
      title: "قالب ۱۸ ماهه‌ی چرخش‌ها رو بارگذاری کن",
      desc: "یه قالب استاندارد با ۱۲ چرخش (اطفال ۳ ماه، داخلی ۳ ماه، جراحی ۲ ماه، زنان ۲ ماه و بقیه ۱ ماهه) از روی تاریخ شروع ساخته می‌شه.",
      hint: "همون صفحه → دکمه‌ی «📋 بارگذاری قالب پیش‌فرض» → تأیید",
      tint: "167, 139, 250"
    },
    {
      icon: "🚨",
      title: "اولین کشیکت رو ثبت کن",
      desc: "کشیک‌ها توی تقویم با نوار قرمز مشخص می‌شن. اگه چند تا کشیک توی یه ماه داری، از حالت گروهی استفاده کن که سریع‌تره.",
      hint: "برو تقویم → روی روز کلیک → «+ کشیک گروهی» → چند روز رو انتخاب کن",
      tint: "244, 63, 94"
    },
    {
      icon: "✅",
      title: "اولین تسکت رو بساز",
      desc: "تسک‌ها ستون فقرات اپن. می‌تونی از فرم ساده بسازی، یا از داخل کوریکولوم با یه کلیک به برنامه اضافه کنی.",
      hint: "برنامه‌ریزی → + افزودن کار · یا کوریکولوم → ➕ روی هر آیتم",
      tint: "52, 211, 153"
    },
    {
      icon: "💾",
      title: "ذخیره کن تا از دست نره",
      desc: "localStorage خودکار ذخیره می‌کنه، ولی برای انتقال بین سیستم‌ها باید state.js رو آپدیت کنی.",
      hint: "دکمه‌ی 💾 بالای صفحه یا Ctrl+S → فایل state.js رو جایگزین کن",
      tint: "251, 191, 36"
    }
  ];

  function renderHelpWizard() {
    const progressEl = document.getElementById("help-wizard-progress");
    const stageEl    = document.getElementById("help-wizard-stage");
    const backBtn    = document.getElementById("help-wizard-back");
    const nextBtn    = document.getElementById("help-wizard-next");
    if (!progressEl || !stageEl || !backBtn || !nextBtn) return;

    const total = HELP_QUICK_STEPS.length;
    const isFinal = helpQuickStep >= total;

    // ─── Progress Dots ───────────────────────────────
    if (isFinal) {
      progressEl.innerHTML = HELP_QUICK_STEPS.map((_, i) =>
        `<span class="help-wizard-dot is-done"></span>`
      ).join("");
    } else {
      progressEl.innerHTML = HELP_QUICK_STEPS.map((_, i) => {
        let cls = "help-wizard-dot";
        if (i < helpQuickStep) cls += " is-done";
        else if (i === helpQuickStep) cls += " is-active";
        return `<span class="${cls}"></span>`;
      }).join("");
    }

    // ─── Stage ──────────────────────────────────────
    if (isFinal) {
      stageEl.innerHTML = `
        <div class="help-wizard-success">
          <div class="help-wizard-success-icon">🎉</div>
          <div class="help-wizard-success-title">راه‌اندازی سریع انجام شد!</div>
          <div class="help-wizard-success-desc">
            حالا آماده‌ای اینترنی‌ات رو با Internship OS مدیریت کنی.
          </div>
          <div class="help-wizard-success-tips">
            <div class="help-wizard-tip">
              <span class="help-wizard-tip-icon">🌅</span>
              <span>هر روز صبح از داشبورد شروع کن</span>
            </div>
            <div class="help-wizard-tip">
              <span class="help-wizard-tip-icon">💾</span>
              <span>هفته‌ای یه بار <kbd>Ctrl+S</kbd> بزن</span>
            </div>
            <div class="help-wizard-tip">
              <span class="help-wizard-tip-icon">🤖</span>
              <span>محتوای جدید رو با AI Generator بساز</span>
            </div>
          </div>
        </div>
      `;
    } else {
      const s = HELP_QUICK_STEPS[helpQuickStep];
      stageEl.innerHTML = `
        <div class="help-wizard-card" style="--step-tint:${s.tint}">
          <div class="help-wizard-card-head">
            <div class="help-wizard-card-icon">${s.icon}</div>
            <div class="help-wizard-card-num">گام ${faNum(helpQuickStep + 1)} از ${faNum(total)}</div>
          </div>
          <div class="help-wizard-card-title">${escapeHTML(s.title)}</div>
          <div class="help-wizard-card-desc">${escapeHTML(s.desc)}</div>
          <div class="help-wizard-card-hint">
            <span class="help-wizard-card-hint-icon">📍</span>
            <span>${escapeHTML(s.hint)}</span>
          </div>
        </div>
      `;
    }

    // ─── Nav ────────────────────────────────────────
    backBtn.disabled = helpQuickStep === 0;
    if (isFinal) {
      nextBtn.textContent = "شروع مجدد";
      nextBtn.classList.remove("primary");
      nextBtn.classList.add("ghost");
    } else if (helpQuickStep === total - 1) {
      nextBtn.textContent = "پایان ✓";
      nextBtn.classList.add("primary");
      nextBtn.classList.remove("ghost");
    } else {
      nextBtn.textContent = "بعدی ←";
      nextBtn.classList.add("primary");
      nextBtn.classList.remove("ghost");
    }
  }

  function wireHelpWizard() {
    const backBtn = document.getElementById("help-wizard-back");
    const nextBtn = document.getElementById("help-wizard-next");
    if (!backBtn || !nextBtn) return;

    const total = HELP_QUICK_STEPS.length;

    backBtn.addEventListener("click", () => {
      if (helpQuickStep > 0) {
        helpQuickStep--;
        saveHelpStep(helpQuickStep);
        renderHelpWizard();
      }
    });

    nextBtn.addEventListener("click", () => {
      if (helpQuickStep >= total) {
        // شروع مجدد
        helpQuickStep = 0;
      } else {
        helpQuickStep++;
      }
      saveHelpStep(helpQuickStep);
      renderHelpWizard();
    });

    renderHelpWizard();
  }

   function renderHelp() {
    const counts = {
      tasks: (state.tasks || []).length,
      rotations: (state.rotations || []).length,
      shifts: (state.shifts || []).length,
      cases: (state.cases || []).length,
      imports: (state.imports || []).length,
      curriculumItems: (function () {
        const c = getCurriculum();
        return c.flatMap((s) => s.categories.flatMap((cat, ci) =>
          getNormalizedCategory(s, cat, ci).items
        )).length;
      })(),
      procedures: (function () {
        const p = getProcedures();
        return p.reduce((sum, c) => sum + (c.items || []).length, 0);
      })()
    };

    const pages = [
      { icon: "🏠", name: "داشبورد",         desc: "بنر بالای صفحه با greeting + آمار سریع + کشیک بعدی. زیرش نوار هفته. بعد ۷ بخش زندگی. آخر کارت امروز + حلقه‌ی پیشرفت.", color: "45, 212, 191" },
      { icon: "📅", name: "تقویم",           desc: "تقویم شمسی با رنگ‌بندی وضعیت (آبی=در انتظار، زرد=نیمه، سبز=کامل). کشیک با نوار قرمز مشخص می‌شود. کشیک گروهی از اینجا.", color: "56, 189, 248" },
      { icon: "📝", name: "برنامه‌ریزی",     desc: "Weekly View بالا + گروه‌بندی تسک‌ها (عقب‌افتاده/امروز/فردا/این هفته/بعدتر) در دو ستون.", color: "129, 140, 248" },
      { icon: "🩺", name: "بالین",           desc: "۴ تب: مسیر اینترنی (چرخش‌ها + تایم‌لاین)، کوریکولوم (۱۲ تخصص + محتوای سفارشی)، کیس‌ها، پروسیجرها.", color: "251, 113, 133" },
      { icon: "🎓", name: "رزیدنتی",         desc: "هدف + درس‌ها + موضوعات + منابع + تسک‌های ۴ گانه (مطالعه/مرور/تست/آزمون). چیدمان داینامیک.", color: "167, 139, 250" },
      { icon: "📊", name: "پیشرفت",          desc: "همه‌ی آمار یکجا: Overall + روتیشن + مسیر چرخش‌ها + بخش‌ها + کوریکولوم + پروسیجر + مطالعه + رزیدنتی + آمار.", color: "52, 211, 153" },
      { icon: "⚙️", name: "داده‌ها",         desc: "پشتیبان JSON + بازیابی + Import محتوا/برنامه + Content Map + نسخه‌ی Portable + بازنشانی.", color: "251, 191, 36" },
      { icon: "❓", name: "راهنما",          desc: "همین صفحه — همه‌چیز درباره‌ی استفاده از اپ.", color: "244, 114, 182" }
    ];

    const changelog = [
      { title: "محتوای جدید با AI", desc: "AI Generator حالا برای بخش‌های زندگی هم Plan Package می‌سازد." },
      { title: "موتور Import پیشرفته", desc: "حالا action های add / update / delete پشتیبانی می‌شوند. حذف نیاز به تأیید مضاعف دارد." },
      { title: "تشخیص خودکار رزیدنتی", desc: "نوع تسک رزیدنتی از عنوان تشخیص داده می‌شود (مرور → review، آزمون → exam، تست → question)." },
      { title: "چیدمان داینامیک", desc: "صفحه‌های پیشرفت، برنامه‌ریزی، کوریکولوم، پروسیجر، رزیدنتی و داده‌ها به‌صورت دو ستونی/dynamic." },
      { title: "رنگ‌های ملایم", desc: "کارت‌های کوریکولوم و پروسیجر با تینت‌های ملایم رنگ‌آمیزی شدند." },
      { title: "داشبورد گرافیکی", desc: "بنر greeting + آمار سریع + کشیک بعدی + نوار هفته." }
    ];

    view.innerHTML = `
      <section class="help-hero">
        <div class="help-hero-text">
          <div class="help-hero-label">راهنمای Internship OS</div>
          <h2 class="help-hero-title">هر چیزی که لازم داری، اینجاست</h2>
          <p class="help-hero-sub">از شروع سریع تا AI و انتقال به دوست — همه‌چیز در یک نگاه.</p>
        </div>
        <div class="help-hero-stats">
          <div class="help-stat">
            <span class="help-stat-num">${faNum(counts.tasks)}</span>
            <span class="help-stat-label">کار</span>
          </div>
          <div class="help-stat">
            <span class="help-stat-num">${faNum(counts.rotations)}</span>
            <span class="help-stat-label">چرخش</span>
          </div>
          <div class="help-stat">
            <span class="help-stat-num">${faNum(counts.shifts)}</span>
            <span class="help-stat-label">کشیک</span>
          </div>
          <div class="help-stat">
            <span class="help-stat-num">${faNum(counts.cases)}</span>
            <span class="help-stat-label">کیس</span>
          </div>
        </div>
      </section>

      <h3 class="help-section-title">🚀 شروع سریع</h3>
      <div class="help-wizard" id="help-wizard">
        <div class="help-wizard-progress" id="help-wizard-progress"></div>
        <div class="help-wizard-stage" id="help-wizard-stage"></div>
        <div class="help-wizard-nav">
          <button class="btn ghost" type="button" id="help-wizard-back" disabled>→ قبلی</button>
          <button class="btn primary" type="button" id="help-wizard-next">بعدی ←</button>
        </div>
      </div>

      <h3 class="help-section-title">🗺️ مرور صفحه‌ها</h3>
      <div class="help-pages-grid">
        ${pages.map((p) => `
          <div class="help-page-card" style="--page-tint:${p.color}">
            <div class="help-page-card-head">
              <span class="help-page-card-icon">${p.icon}</span>
              <span class="help-page-card-name">${p.name}</span>
            </div>
            <div class="help-page-card-desc">${p.desc}</div>
          </div>
        `).join("")}
      </div>

      <h3 class="help-section-title">📖 راهنماهای تفصیلی</h3>

      <details class="help-card help-card-ai">
        <summary class="help-card-summary">
          <span class="help-card-icon">🤖</span>
          <span class="help-card-title">استفاده از AI Generator</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">از دکمه‌ی «🤖 تولید با AI» توی کوریکولوم، پروسیجرها، رزیدنتی یا برنامه‌ریزی استفاده کن.</p>
          <ol class="help-steps">
            <li><strong>بخش رو انتخاب کن</strong> — کوریکولوم / پروسیجر / رزیدنتی / بخش زندگی (Plan).</li>
            <li><strong>خواسته‌ات رو بنویس</strong> — به زبان خودت. AI خودش دسته‌بندی رو طراحی می‌کنه.</li>
            <li><strong>«📋 کپی پرامپت»</strong> رو بزن.</li>
            <li><strong>پرامپت رو بده</strong> به ChatGPT / Claude / Gemini.</li>
            <li><strong>پاسخ JSON</strong> رو پیست کن و «تحلیل پاسخ» رو بزن.</li>
            <li><strong>توی Preview</strong> بررسی کن → Import.</li>
          </ol>
          <div class="help-callout">
            <strong>💡 آزادی AI:</strong> AI می‌تونه ساختار رو بازطراحی کنه یا دسته‌های جدید بسازه. پیشنهاداتش رو توی فیلد <code>description</code> می‌نویسه.
          </div>
        </div>
      </details>

      <details class="help-card help-card-res">
        <summary class="help-card-summary">
          <span class="help-card-icon">🔍</span>
          <span class="help-card-title">تشخیص خودکار نوع تسک رزیدنتی</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">وقتی از فرم افزودن کار، بخش «🎓 رزیدنتی» رو انتخاب می‌کنی، یه زیر-dropdown ظاهر می‌شه. اگه «تشخیص خودکار» رو انتخاب کنی، بر اساس عنوان تسک، نوع مشخص می‌شه:</p>
          <div class="help-table">
            <div class="help-table-row">
              <span class="help-table-cell"><strong>مرور / ریویو</strong></span>
              <span class="help-table-arrow">→</span>
              <span class="help-table-cell">🔄 مرور</span>
            </div>
            <div class="help-table-row">
              <span class="help-table-cell"><strong>آزمون / امتحان / شبیه‌ساز</strong></span>
              <span class="help-table-arrow">→</span>
              <span class="help-table-cell">🎯 آزمون جامع</span>
            </div>
            <div class="help-table-row">
              <span class="help-table-cell"><strong>تست / سوال / کوئیز</strong></span>
              <span class="help-table-arrow">→</span>
              <span class="help-table-cell">❓ تست</span>
            </div>
            <div class="help-table-row">
              <span class="help-table-cell"><strong>بقیه</strong></span>
              <span class="help-table-arrow">→</span>
              <span class="help-table-cell">📚 مطالعه</span>
            </div>
          </div>
        </div>
      </details>

      <details class="help-card help-card-import">
        <summary class="help-card-summary">
          <span class="help-card-icon">📥</span>
          <span class="help-card-title">Import محتوا (افزودن / ویرایش / حذف)</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">سه نوع عملیات پشتیبانی می‌شه:</p>
          <ul class="help-list">
            <li><code>action: "add"</code> — افزودن محتوای جدید (تخصص، دسته، آیتم، درس، ...).</li>
            <li><code>action: "update"</code> — ویرایش محتوای سفارشی که خودت اضافه کردی. فقط <code>id</code> + فیلدهای تغییر.</li>
            <li><code>action: "delete"</code> — حذف محتوای سفارشی. <strong>نیاز به تأیید مضاعف داره.</strong></li>
          </ul>
          <div class="help-callout help-callout-warn">
            <strong>⚠️ توجه:</strong> فقط محتوای <em>سفارشی</em> قابل حذف/ویرایشه. محتوای پیش‌فرض <code>data.js</code> دست‌نخورده می‌مونه.
          </div>
        </div>
      </details>

      <details class="help-card help-card-portable">
        <summary class="help-card-summary">
          <span class="help-card-icon">📦</span>
          <span class="help-card-title">ساخت فایل Portable</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">یه فایل <code>.html</code> واحد می‌سازی که همه‌چیز (ظاهر + منطق + داده‌ها) داخلش جاسازی شده. هر جا ببریش کار می‌کنه.</p>
          <ol class="help-steps">
            <li>برو <em>⚙️ داده‌ها → 📦 ساخت نسخه</em>.</li>
            <li>چهار فایل رو انتخاب کن: <code>index.html</code>، <code>styles.css</code>، <code>data.js</code>، <code>app.js</code>.</li>
            <li>دکمه‌ی «ساخت و دانلود» رو بزن.</li>
          </ol>
          <div class="help-callout">
            <strong>💡 نکته:</strong> فایل Portable همیشه snapshot از داده‌های <em>لحظه‌ی ساخت</em> رو داره. بعدش که تغییر دادی، دوباره بساز.
          </div>
        </div>
      </details>

      <details class="help-card help-card-friend">
        <summary class="help-card-summary">
          <span class="help-card-icon">🎁</span>
          <span class="help-card-title">انتقال به دوست</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">دو راه داری:</p>
          <div class="help-two-col">
            <div class="help-col">
              <div class="help-col-title">🅰️ انتقال کل پروژه</div>
              <ul class="help-list">
                <li>کل پوشه‌ی <code>internship-os</code> رو کپی کن.</li>
                <li>اگه <code>state.js</code> همراهش نباشه، دوستت از صفر شروع می‌کنه.</li>
                <li>اگه <code>state.js</code> رو بخواد داشته باشه، قبلش محتوای شخصی رو پاک کن.</li>
              </ul>
            </div>
            <div class="help-col">
              <div class="help-col-title">🅱️ انتقال یه‌فایلی</div>
              <ul class="help-list">
                <li>از <em>داده‌ها → 📦 Portable</em> یه فایل HTML بساز.</li>
                <li>فقط همون یه فایل رو بفرست.</li>
                <li>دوستش کافیه فایل رو تو مرورگر باز کنه.</li>
              </ul>
            </div>
          </div>
        </div>
      </details>

      <details class="help-card help-card-save">
        <summary class="help-card-summary">
          <span class="help-card-icon">💾</span>
          <span class="help-card-title">ذخیره و پشتیبان‌گیری</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <p class="help-p">دو لایه‌ی ذخیره‌سازی داری:</p>
          <ul class="help-list">
            <li><strong>localStorage</strong> — خودکار، فقط توی همون مرورگر.</li>
            <li><strong>state.js</strong> — دستی با 💾 یا <kbd>Ctrl+S</kbd>؛ برای انتقال بین سیستم‌ها.</li>
          </ul>
          <div class="help-callout help-callout-warn">
            <strong>⚠️ مهم:</strong> اگه مرورگر رو پاک کنی، localStorage می‌ره. پس حتماً هر چند وقت یه‌بار <em>Ctrl+S</em> بزن و فایل <code>state.js</code> رو توی پوشه‌ی پروژه نگه دار.
          </div>
        </div>
      </details>

      <details class="help-card help-card-changelog">
        <summary class="help-card-summary">
          <span class="help-card-icon">✨</span>
          <span class="help-card-title">تازه‌های نسخه‌ی اخیر</span>
          <span class="help-card-chevron">▾</span>
        </summary>
        <div class="help-card-body">
          <ul class="help-list">
            ${changelog.map((c) => `<li><strong>${escapeHTML(c.title)}</strong> — ${escapeHTML(c.desc)}</li>`).join("")}
          </ul>
        </div>
      </details>

      <footer class="app-footer">Internship OS — نسخه ${faNum(APP_VERSION)}</footer>
    `;

    document.title = "راهنما — Internship OS";

    // wizard شروع سریع — گام قبلی حفظ می‌شه
    if (typeof wireHelpWizard === "function") {
      helpQuickStep = loadHelpStep();
      wireHelpWizard();
    }
  }


  function renderData() {
    const counts = dataCounts();
    const lastSaveAt = Number(window.INTERNSHIP_STATE_SAVED_AT) || 0;
    const lastSaveStr = lastSaveAt
      ? new Date(lastSaveAt).toLocaleString("fa-IR")
      : "نامشخص";
    const workspaceName = getFullName();
    const importsCount = getImportsCount();

    view.innerHTML = `
      <h2 class="section-heading">بکاپ کامل (شامل پیوست‌ها)</h2>
      <div class="data-card data-card-full" id="full-backup-card">
        <div class="data-card-body">
          <div class="data-card-icon" aria-hidden="true">🗄️</div>
          <div class="data-card-text">
            <h3>بکاپ کامل — با یه دکمه</h3>
            <p>همه‌چیز رو توی یه فایل واحد ذخیره می‌کنه: کارها، چرخش‌ها، کیس‌ها، <strong>و همه‌ی عکس‌ها/فایل‌ها</strong>.</p>
            <div class="data-card-stats" id="full-backup-stats">
              <span class="data-card-stat">در حال محاسبه...</span>
            </div>
          </div>
        </div>
        <div class="data-card-actions">
          <button class="btn primary" type="button" data-full-export>⬇️ بکاپ کامل</button>
          <button class="btn ghost" type="button" data-full-import>⬆️ بازیابی کامل</button>
        </div>
      </div>

      <h2 class="section-heading">بکاپ سبک (فقط داده‌ها)</h2>
      <div class="data-grid-2">
        <div class="data-card">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">💾</div>
            <div class="data-card-text">
              <h3>خروجی JSON سبک</h3>
              <p>فقط داده‌ها بدون پیوست‌ها — مناسب برای بکاپ سریع.</p>
            </div>
          </div>
          <button class="btn ghost" type="button" data-export-json>دانلود</button>
        </div>

        <div class="data-card">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">📥</div>
            <div class="data-card-text">
              <h3>ورود JSON سبک</h3>
              <p>داده‌های فعلی <strong>جایگزین</strong> می‌شود. پیوست‌ها دست‌نخورده می‌مانند.</p>
            </div>
          </div>
          <button class="btn ghost" type="button" data-import-json>انتخاب فایل</button>
        </div>
      </div>
      <h2 class="section-heading">اطلاعات داده‌ها</h2>
      <div class="data-stats">
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.tasks)}</span>
          <span class="data-stat-label">کار</span>
        </div>
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.rotations)}</span>
          <span class="data-stat-label">چرخش</span>
        </div>
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.shifts)}</span>
          <span class="data-stat-label">کشیک</span>
        </div>
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.cases)}</span>
          <span class="data-stat-label">کیس</span>
        </div>
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.clinicalMastery)}</span>
          <span class="data-stat-label">تسلط بالینی</span>
        </div>
        <div class="data-stat">
          <span class="data-stat-num">${faNum(counts.procedureMastery)}</span>
          <span class="data-stat-label">مهارت عملی</span>
        </div>
      </div>

      <h2 class="section-heading">درباره‌ی برنامه</h2>
      <div class="data-card data-card-about">
        <div class="data-card-body">
          <div class="data-card-icon" aria-hidden="true">ℹ️</div>
          <div class="data-card-text">
            <h3>Internship OS — نسخه ${faNum(APP_VERSION)}</h3>
            <p>
              اسکیمای داده: <strong>v${faNum(SCHEMA_VERSION)}</strong>
              ${workspaceName ? ` · کاربر: <strong>${escapeHTML(workspaceName)}</strong>` : ""}
            </p>
            <p style="margin-top:4px">
              آخرین ذخیره در <code style="font-size:11.5px">state.js</code>: <strong>${lastSaveStr}</strong>
            </p>
            <p style="margin-top:4px">
              بسته‌های واردشده: <strong>${faNum(importsCount)}</strong> · امروز: <strong>${new Date().toLocaleDateString("fa-IR")}</strong>
            </p>
          </div>
        </div>
      </div>

      ${(typeof InternshipAI !== "undefined" && InternshipAI.renderSettingsCard) ? InternshipAI.renderSettingsCard() : ""}

      <div class="data-card data-card-update">
        <div class="data-card-body">
          <div class="data-card-icon" aria-hidden="true">🔄</div>
          <div class="data-card-text">
            <h3>به‌روزرسانی برنامه</h3>
            <p>برنامه می‌تونه خودش رو از اینترنت به‌روزرسانی کنه. داده‌های شخصی شما (<code style="font-size:11.5px">data/</code>) هرگز دست نمی‌خوره.</p>
            <p style="margin-top:6px;color:#34d399;font-weight:600">✓ نسخه‌ی فعلی: <span style="font-family:ui-monospace;">v${faNum(APP_VERSION)}</span></p>
          </div>
        </div>
        <button class="btn primary" type="button" data-check-update>🔄 بررسی آپدیت</button>
      </div>

      <h2 class="section-heading">Import محتوا و برنامه</h2>
      <div class="data-grid-2">
        <div class="data-card data-card-import">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">📥</div>
            <div class="data-card-text">
              <h3>Import محتوا</h3>
              <p>بسته JSON با محتوای جدید (تخصص، دسته، آیتم، پروسیجر).</p>
              ${getImportsCount() > 0 ? `<p style="margin-top:6px;font-size:11px;color:var(--text-dim)">${faNum(getImportsCount())} بسته‌ی واردشده</p>` : ""}
            </div>
          </div>
          <button class="btn primary" type="button" data-content-import>انتخاب بسته</button>
        </div>

        <div class="data-card data-card-plan">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">📅</div>
            <div class="data-card-text">
              <h3>Import برنامه</h3>
              <p>بسته JSON با تسک‌ها و کشیک‌ها (فقط برنامه‌ی زمان‌بندی‌شده).</p>
            </div>
          </div>
          <button class="btn primary" type="button" data-plan-import>انتخاب بسته</button>
        </div>
      </div>

      ${importsListHTML()}

      <h2 class="section-heading">ابزارهای AI و انتقال</h2>
      <div class="data-grid-2">
        <div class="data-card data-card-map">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">🧩</div>
            <div class="data-card-text">
              <h3>Content Map</h3>
              <p>ساختار کوریکولوم برای AI — تخصص‌ها، دسته‌ها و آیتم‌ها با ID.</p>
            </div>
          </div>
          <button class="btn primary" type="button" data-export-content-map>خروجی ساختار</button>
        </div>

        <div class="data-card data-card-portable">
          <div class="data-card-body">
            <div class="data-card-icon" aria-hidden="true">📦</div>
            <div class="data-card-text">
              <h3>فایل HTML خودکفا</h3>
              <p>یک فایل HTML واحد با همه‌چیز جاسازی‌شده. هر جا ببری، کار می‌کند.</p>
            </div>
          </div>
          <button class="btn primary" type="button" data-make-portable>ساخت نسخه</button>
        </div>
      </div>

      <h2 class="section-heading">منطقه‌ی خطر</h2>
      <div class="data-card data-card-danger">
        <div class="data-card-body">
          <div class="data-card-icon" aria-hidden="true">⚠️</div>
          <div class="data-card-text">
            <h3>بازنشانی همه‌ی داده‌ها</h3>
            <p>تمام اطلاعات پروژه پاک می‌شود و به حالت اولیه برمی‌گردد. این عملیات قابل بازگشت نیست.</p>
          </div>
        </div>
        <button class="btn danger" type="button" data-reset-all>بازنشانی</button>
      </div>
    `;

    document.title = "داده‌ها — Internship OS";
    wireDataEvents();
  }

  function dataCounts() {
    return {
      tasks: Array.isArray(state.tasks) ? state.tasks.length : 0,
      rotations: Array.isArray(state.rotations) ? state.rotations.length : 0,
      shifts: Array.isArray(state.shifts) ? state.shifts.length : 0,
      cases: Array.isArray(state.cases) ? state.cases.length : 0,
      clinicalMastery: Object.keys(state.clinicalProgress || {}).filter((k) => state.clinicalProgress[k] > 0).length,
      procedureMastery: Object.keys(state.procedureProgress || {}).filter((k) => state.procedureProgress[k] > 0).length
    };
  }

  function wireDataEvents() {
    const exp = view.querySelector("[data-export-json]");
    if (exp) exp.addEventListener("click", exportJSON);

    // ─── بکاپ کامل ─────────────────────────────────
    const fullExp = view.querySelector("[data-full-export]");
    if (fullExp) fullExp.addEventListener("click", exportFullBackup);

    const fullImp = view.querySelector("[data-full-import]");
    if (fullImp) fullImp.addEventListener("click", triggerImportFullBackup);

    // نمایش حجم کل
    const statsEl = view.querySelector("#full-backup-stats");
    if (statsEl) {
      getAttachmentsStats().then((stats) => {
        const curCases = (state.cases || []).length;
        statsEl.innerHTML =
          `<span class="data-card-stat">📎 ${faNum(stats.count)} فایل</span>` +
          `<span class="data-card-stat">💾 ${formatBytes(stats.totalSize)}</span>` +
          `<span class="data-card-stat">📝 ${faNum(curCases)} کیس</span>` +
          `<span class="data-card-stat">📦 ${faNum(getImportsCount())} بسته‌ی محتوا</span>`;
      }).catch(() => {
        statsEl.innerHTML = `<span class="data-card-stat">خطا در محاسبه</span>`;
      });
    }

    const imp = view.querySelector("[data-import-json]");
    if (imp) imp.addEventListener("click", triggerImportJSON);

    const rst = view.querySelector("[data-reset-all]");

    // AI settings card wire
    if (typeof InternshipAI !== "undefined" && InternshipAI.wireSettingsCard) {
      try { InternshipAI.wireSettingsCard(); } catch (e) { console.warn("[AI] wire failed:", e); }
    }
    if (rst) rst.addEventListener("click", confirmResetAll);

    const mp = view.querySelector("[data-make-portable]");

    // ─── بررسی آپدیت ───
    const updateBtn = view.querySelector("[data-check-update]");
    if (updateBtn) updateBtn.addEventListener("click", openUpdateModal);
    if (mp) mp.addEventListener("click", openPortableBuilder);

    const cm = view.querySelector("[data-export-content-map]");
    if (cm) cm.addEventListener("click", exportContentMap);

    const ci = view.querySelector("[data-content-import]");
    
    const pi = view.querySelector("[data-plan-import]");
    if (pi) pi.addEventListener("click", openPlanImport);

    if (ci) ci.addEventListener("click", openContentImport);

    view.querySelectorAll("[data-del-import]").forEach((btn) => {
      btn.addEventListener("click", () => confirmDeleteImport(btn.dataset.delImport));
    });
      }

  /* ─── Portable builder ────────────────────────────────── */

  function openPortableBuilder() {
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>ساخت نسخه‌ی قابل انتقال</h3>
        <p style="margin-bottom:14px">چهار فایل پروژه را از پوشه‌ی <code style="background:var(--surface-2);padding:1px 6px;border-radius:4px;font-size:12px">internship-os</code> انتخاب کن. سپس فایل خروجی را دانلود کن.</p>

        <ol class="portable-steps">
          <li><strong>index.html</strong></li>
          <li><strong>styles.css</strong></li>
          <li><strong>data.js</strong></li>
          <li><strong>app.js</strong></li>
        </ol>

        <input type="file" id="portable-files" multiple accept=".html,.css,.js,text/html,text/css,application/javascript" style="display:none">
        <div class="portable-file-pick">
          <button class="btn primary" type="button" data-portable-pick>انتخاب ۴ فایل</button>
          <span class="portable-file-status" id="portable-status">هیچ فایلی انتخاب نشده</span>
        </div>

        <div class="portable-preview" id="portable-preview" hidden>
          <div class="portable-preview-row"><span>HTML:</span><strong id="pf-html-name">—</strong></div>
          <div class="portable-preview-row"><span>CSS:</span><strong id="pf-css-name">—</strong></div>
          <div class="portable-preview-row"><span>Data:</span><strong id="pf-data-name">—</strong></div>
          <div class="portable-preview-row"><span>App:</span><strong id="pf-app-name">—</strong></div>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn primary" type="button" data-confirm disabled>ساخت و دانلود</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const fileInput = overlay.querySelector("#portable-files");
    const statusEl  = overlay.querySelector("#portable-status");
    const previewEl = overlay.querySelector("#portable-preview");
    const confirmBtn = overlay.querySelector("[data-confirm]");

    const picked = { html: null, css: null, data: null, app: null };

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-portable-pick]").addEventListener("click", () => fileInput.click());

    fileInput.addEventListener("change", () => {
      Array.from(fileInput.files || []).forEach((file) => {
        const name = file.name.toLowerCase();
        if (name.endsWith(".html")) picked.html = file;
        else if (name.endsWith(".css")) picked.css = file;
        else if (name === "data.js") picked.data = file;
        else if (name === "app.js") picked.app = file;
      });

      const found = [picked.html, picked.css, picked.data, picked.app].filter(Boolean).length;
      statusEl.textContent = found === 0
        ? "هیچ فایلی انتخاب نشده"
        : `${faNum(found)} از ۴ فایل انتخاب شده`;

      overlay.querySelector("#pf-html-name").textContent = picked.html ? picked.html.name : "—";
      overlay.querySelector("#pf-css-name").textContent  = picked.css  ? picked.css.name  : "—";
      overlay.querySelector("#pf-data-name").textContent = picked.data ? picked.data.name : "—";
      overlay.querySelector("#pf-app-name").textContent  = picked.app  ? picked.app.name  : "—";

      if (found === 4) {
        previewEl.hidden = false;
        confirmBtn.disabled = false;
      } else {
        previewEl.hidden = false;
        confirmBtn.disabled = true;
      }
    });

    confirmBtn.addEventListener("click", () => {
      if (!picked.html || !picked.css || !picked.data || !picked.app) return;
      readFile(picked.html).then((htmlText) =>
        readFile(picked.css).then((cssText) =>
          readFile(picked.data).then((dataText) =>
            readFile(picked.app).then((appText) => {
              const built = buildPortableHTML(htmlText, cssText, dataText, appText);
              downloadHTML(built);
              close();
              toast("فایل قابل انتقال ساخته شد");
            })
          )
        )
      ).catch((err) => {
        console.error(err);
        toast("خطا در خواندن فایل‌ها", "error");
      });
    });
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file);
    });
  }

  function buildPortableHTML(htmlText, cssText, dataText, appText) {
    // استخراج تگ‌های <link rel="stylesheet"> و <script src="..."> از HTML اصلی
    // و جایگزینی با نسخه‌های inline
    let out = htmlText;

    // جایگزینی لینک CSS با استایل inline
    out = out.replace(/<link[^>]*rel=["']stylesheet["'][^>]*href=["'][^"']*styles\.css["'][^>]*>/i,
      '<style>\n' + cssText + '\n</style>');

    // جایگزینی data.js
    out = out.replace(/<script[^>]*src=["'][^"']*data\.js["'][^>]*><\/script>/i,
      '<script>\n' + dataText + '\n</script>');

    // جایگزینی app.js
    out = out.replace(/<script[^>]*src=["'][^"']*app\.js["'][^>]*><\/script>/i,
      '<script>\n' + appText + '\n</script>');

    // جاسازی state فعلی کاربر درون HTML
    const stateJSON = JSON.stringify(state);
    const stateTag = '<script id="internship-os-embedded-state" type="application/json">\n' +
                     stateJSON + '\n</script>';

    // تگ state را قبل از بسته‌شدن body اضافه کن
    out = out.replace(/<\/body>/i, stateTag + '\n</body>');

    return out;
  }

  function downloadHTML(content) {
    const blob = new Blob([content], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    const stamp = now.getFullYear() + "-" +
                  String(now.getMonth() + 1).padStart(2, "0") + "-" +
                  String(now.getDate()).padStart(2, "0");
    a.href = url;
    a.download = getUsername() + "-portable-" + stamp + ".html";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  /* ─── Export ──────────────────────────────────────────── */
  /* ╔═══ [PATCH:full-backup] ═══╗ */

  async function exportFullBackup() {
    try {
      toast("در حال آماده‌سازی بکاپ کامل...");

      const cases = Array.isArray(state.cases) ? state.cases : [];
      const attachmentsData = [];
      let totalFiles = 0;

      for (const c of cases) {
        try {
          const items = await listAttachmentsByCase(c.id);
          for (const item of items) {
            try {
              const url = attachmentUrl(c.id, item.storedName);
              const resp = await fetch(url);
              if (!resp.ok) continue;
              const blob = await resp.blob();
              const base64 = await blobToBase64(blob);
              attachmentsData.push({
                id: item.id,
                caseId: item.caseId,
                name: item.name,
                type: item.type,
                size: item.size,
                uploadedAt: item.uploadedAt,
                data: base64
              });
              totalFiles++;
            } catch (e) {
              console.warn("[exportFullBackup] skip file:", item.id, e);
            }
          }
        } catch (e) {
          console.warn("[exportFullBackup] skip case:", c.id, e);
        }
      }

      const pack = {
        app: "internship-os",
        schemaVersion: SCHEMA_VERSION,
        appVersion: APP_VERSION,
        packageType: "internship-os-full-backup",
        exportedAt: new Date().toISOString(),
        state: state,
        attachments: attachmentsData
      };

      const json = JSON.stringify(pack);
      const now = new Date();
      const stamp = now.getFullYear() + "-" +
                    String(now.getMonth() + 1).padStart(2, "0") + "-" +
                    String(now.getDate()).padStart(2, "0");
      const filename = getUsername() + "-full-backup-" + stamp + ".json";

      const totalSizeMB = (json.length / 1024 / 1024).toFixed(1);
      const ok = await saveFileWithPicker(filename, json, "application/json", {
        "application/json": [".json"]
      });

      if (ok) {
        toast(`بکاپ کامل ذخیره شد (${faNum(totalSizeMB)} MB · ${faNum(totalFiles)} فایل)`);
      }
    } catch (err) {
      console.error(err);
      toast("خطا در ساخت بکاپ: " + (err.message || err), "error");
    }
  }


  function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result);
        // حذف prefix data:...;base64,
        const comma = result.indexOf(",");
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  }

  function base64ToBlob(base64, mimeType) {
    const byteChars = atob(base64);
    const byteArrays = [];
    const sliceSize = 1024;
    for (let offset = 0; offset < byteChars.length; offset += sliceSize) {
      const slice = byteChars.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    return new Blob(byteArrays, { type: mimeType || "application/octet-stream" });
  }

  async function importFullBackup(pack) {
    if (!pack || pack.packageType !== "internship-os-full-backup") {
      throw new Error("این فایل بکاپ کامل نیست");
    }
    if (!pack.state || typeof pack.state !== "object") {
      throw new Error("state داخل بکاپ پیدا نشد");
    }

    // ─── ۱. state رو بازیابی کن ───
    const normalized = normalizeStateObject(pack.state);
    if (!normalized) throw new Error("state قابل پردازش نیست");

    const attachments = Array.isArray(pack.attachments) ? pack.attachments : [];

    // ─── ۲. پاک کردن پوشه‌های قبلی روی سرور ───
    toast("در حال پاک‌سازی پیوست‌های قبلی...");
    await fetch(API_BASE + "/api/clear-all-attachments", { method: "POST" })
      .catch((e) => console.warn("[import] clear failed:", e));

    // ─── ۳. آپلود پیوست‌ها با ID اصلی ───
    let uploaded = 0;
    for (let i = 0; i < attachments.length; i++) {
      const att = attachments[i];
      try {
        // تبدیل base64 به blob
        const byteChars = atob(att.data);
        const byteArrays = [];
        const sliceSize = 1024;
        for (let off = 0; off < byteChars.length; off += sliceSize) {
          const slice = byteChars.slice(off, off + sliceSize);
          const byteNumbers = new Array(slice.length);
          for (let j = 0; j < slice.length; j++) byteNumbers[j] = slice.charCodeAt(j);
          byteArrays.push(new Uint8Array(byteNumbers));
        }
        const blob = new Blob(byteArrays, { type: att.type || "application/octet-stream" });
        const file = new File([blob], att.name || "file", { type: att.type });

        const fd = new FormData();
        fd.append("caseId", att.caseId);
        fd.append("attId", att.id);
        fd.append("file", file, att.name || "file");

        const resp = await fetch(API_BASE + "/api/upload", { method: "POST", body: fd });
        if (resp.ok) uploaded++;
      } catch (e) {
        console.warn("[import] failed to upload:", att.id, e);
      }
    }

    // ─── ۴. اعمال state ───
    state = normalized;
    bumpContentCache();
    saveState();

    return { attachmentsCount: uploaded };
  }

  /* ╚═══ [/PATCH:full-backup] ═══╝ */

  function exportJSON() {
    const payload = {
      app: "internship-os",
      schemaVersion: SCHEMA_VERSION,
      appVersion: APP_VERSION,
      exportedAt: new Date().toISOString(),
      workspace: state.workspace,
      tasks: state.tasks,
      rotations: state.rotations,
      shifts: state.shifts,
      cases: state.cases,
      procedures: state.procedures,
      clinicalProgress: state.clinicalProgress,
      procedureProgress: state.procedureProgress,
      curriculumMeta: state.curriculumMeta || {},
      customContent: state.customContent || {},
      imports: state.imports || [],
      programContent: state.programContent || [],
      residency: state.residency || null,
      settings: state.settings
    };

    const json = JSON.stringify(payload, null, 2);
    const now = new Date();
    const stamp = now.getFullYear() + "-" +
                  String(now.getMonth() + 1).padStart(2, "0") + "-" +
                  String(now.getDate()).padStart(2, "0");
    const filename = getUsername() + "-backup-" + stamp + ".json";

    saveFileWithPicker(filename, json, "application/json", {
      "application/json": [".json"]
    }).then((ok) => {
      if (ok) toast("فایل پشتیبان ذخیره شد");
    });
  }

  /* ─── Import ──────────────────────────────────────────── */

  function triggerImportJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) handleImportJSON(input.files[0]);
    });
    input.click();
  }

  function triggerImportFullBackup() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json,.json";
    input.addEventListener("change", () => {
      if (input.files && input.files[0]) handleImportFullBackup(input.files[0]);
    });
    input.click();
  }

  function handleImportFullBackup(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let pack;
      try { pack = JSON.parse(String(reader.result)); }
      catch (e) { toast("فایل قابل خواندن نیست", "error"); return; }

      if (!pack || pack.packageType !== "internship-os-full-backup") {
        toast("این فایل، بکاپ کامل Internship OS نیست", "error");
        return;
      }

      const attCount = Array.isArray(pack.attachments) ? pack.attachments.length : 0;
      const stateInfo = pack.state || {};
      const tasksCount = Array.isArray(stateInfo.tasks) ? stateInfo.tasks.length : 0;
      const rotCount = Array.isArray(stateInfo.rotations) ? stateInfo.rotations.length : 0;
      const casesCount = Array.isArray(stateInfo.cases) ? stateInfo.cases.length : 0;
      const sizeMB = (String(reader.result).length / 1024 / 1024).toFixed(1);
      const exportedAt = pack.exportedAt ? new Date(pack.exportedAt).toLocaleString("fa-IR") : "نامشخص";

      openModal({
        title: "بازیابی بکاپ کامل",
        message:
          `تاریخ بکاپ: <strong>${exportedAt}</strong><br>` +
          `حجم فایل: <strong>${faNum(sizeMB)} MB</strong><br><br>` +
          `شامل:<br>` +
          `• ${faNum(tasksCount)} کار<br>` +
          `• ${faNum(rotCount)} چرخش<br>` +
          `• ${faNum(casesCount)} کیس<br>` +
          `• ${faNum(attCount)} پیوست (عکس/فایل)<br><br>` +
          `<span style="color:#fb7185">همه‌ی داده‌های فعلی شما پاک می‌شود.</span>`,
        confirmText: "بازیابی",
        danger: true,
        onConfirm: () => {
          toast("در حال بازیابی...");
          importFullBackup(pack).then((result) => {
            render();
            toast(`بازیابی انجام شد (${faNum(result.attachmentsCount)} پیوست)`);
          }).catch((err) => {
            console.error(err);
            toast("خطا در بازیابی: " + err.message, "error");
          });
        }
      });
    };
    reader.onerror = () => toast("خواندن فایل ناموفق بود", "error");
    reader.readAsText(file);
  }

  function handleImportJSON(file) {
    const reader = new FileReader();
    reader.onload = () => {
      let data;
      try {
        data = JSON.parse(String(reader.result));
      } catch (e) {
        toast("فایل JSON خوانده نشد یا معتبر نیست", "error");
        return;
      }

      if (!data || typeof data !== "object" || data.app !== "internship-os") {
        toast("این فایل مربوط به Internship OS نیست", "error");
        return;
      }

      const c = {
        tasks:      Array.isArray(data.tasks) ? data.tasks.length : 0,
        rotations:  Array.isArray(data.rotations) ? data.rotations.length : 0,
        shifts:     Array.isArray(data.shifts) ? data.shifts.length : 0,
        cases:      Array.isArray(data.cases) ? data.cases.length : 0,
        mastery:    Object.keys(data.clinicalProgress || {}).length,
        exported:   data.exportedAt ? new Date(data.exportedAt).toLocaleString("fa-IR") : "نامشخص"
      };

      openModal({
        title: "بازیابی از فایل پشتیبان",
        message:
          `<strong>${escapeHTML(data.workspace && data.workspace.name ? data.workspace.name : "بدون نام")}</strong><br>` +
          `تاریخ فایل: ${c.exported}<br><br>` +
          `فایل شامل:<br>` +
          `• ${faNum(c.tasks)} کار<br>` +
          `• ${faNum(c.rotations)} چرخش<br>` +
          `• ${faNum(c.shifts)} کشیک<br>` +
          `• ${faNum(c.cases)} کیس<br>` +
          `• ${faNum(c.mastery)} حالت تسلط<br><br>` +
          `<span style="color:#fb7185">همه‌ی داده‌های فعلی شما پاک می‌شود.</span>`,
        confirmText: "بازیابی",
        danger: true,
        onConfirm: () => {
          const normalized = normalizeStateObject(data);
          if (!normalized) {
            toast("داده‌های فایل قابل پردازش نیست", "error");
            return;
          }
          state = normalized;
          bumpContentCache();
          saveState();
          render();
          toast("بازیابی با موفقیت انجام شد");
        }
      });
    };
    reader.onerror = () => toast("خواندن فایل ناموفق بود", "error");
    reader.readAsText(file);
  }

  /* ─── Reset all ───────────────────────────────────────── */

  function confirmResetAll() {
    openModal({
      title: "⚠️ بازنشانی همه‌ی داده‌ها",
      message:
        `این کار <strong style="color:#fb7185">همه‌ی</strong> اطلاعات را پاک می‌کند:<br><br>` +
        `• تمام کارها<br>` +
        `• تمام چرخش‌ها و کشیک‌ها<br>` +
        `• تمام کیس‌ها و پیوست‌ها<br>` +
        `• تمام پیشرفت کوریکولوم و پروسیجرها<br>` +
        `• تنظیمات و اطلاعات شخصی<br><br>` +
        `<strong>این عملیات قابل بازگشت نیست.</strong> مطمئن هستی؟`,
      confirmText: "بله، همه را پاک کن",
      danger: true,
      onConfirm: () => {
        toast("در حال پاک‌سازی...");
        // ─── ۱. پاک کردن state.js و پوشه‌ها روی سرور ───
        fetch(API_BASE + "/api/reset-all", { method: "POST" })
          .catch((e) => console.warn("[reset] server cleanup:", e))
          .finally(() => {
            // ─── ۲. پاک کردن localStorage ───
            try {
              localStorage.removeItem(STORAGE_KEY);
              localStorage.removeItem(THEME_KEY);
              localStorage.removeItem("internship-os.help.step");
              localStorage.removeItem("internship-os.lastMotivationIdx");
            } catch (e) {}
            // ─── ۳. پاک کردن IndexedDB قدیمی ───
            try { indexedDB.deleteDatabase("internship-os-attachments"); } catch (e) {}
            // ─── ۴. reload ───
            setTimeout(() => location.reload(), 400);
          });
      }
    });
  }
  /* ─── Utilities ────────────────────────────────────────── */

  function taskRangeChipHTML(task) {
    if (!task || !task.time) return "";
    var startMin = timeToMinutes ? null : null;
    // به‌صورت inline محاسبه می‌کنیم (بدون وابستگی به timeline)
    var parts = String(task.time).split(":");
    if (parts.length !== 2) return '<span class="task-time-chip">' + faNum(task.time) + '</span>';
    var sH = parseInt(parts[0], 10), sM = parseInt(parts[1], 10);
    if (isNaN(sH) || isNaN(sM)) return "";
    var total = sH * 60 + sM;
    if (!task.durationMinutes) {
      return '<span class="task-time-chip">⏰ ' + faNum(task.time) + '</span>';
    }
    var endMin = total + task.durationMinutes;
    var eH = Math.floor(endMin / 60);
    var eM = endMin % 60;
    var endStr = String(eH).padStart(2, "0") + ":" + String(eM).padStart(2, "0");
    var dm = task.durationMinutes;
    var durLabel;
    if (dm < 60) durLabel = faNum(dm) + "د";
    else if (dm % 60 === 0) durLabel = faNum(dm / 60) + "س";
    else durLabel = faNum(Math.floor(dm / 60)) + ":" + faNum(String(dm % 60).padStart(2, "0"));
    return '<span class="task-range-chip">⏰ ' + faNum(task.time) + '→' + faNum(endStr) + ' · ' + durLabel + '</span>';
  }

  function areaById(id) {
    if (id === "procedures") {
      return { id: "procedures", icon: "🩹", title: "پروسیجرها", subtitle: "Procedures", desc: "مهارت‌های عملی و پروسیجرهای پایه", accent: "45, 212, 191" };
    }
    return LIFE_AREAS.find((a) => a.id === id) || null;
  }

  function areaProgress(areaId) {
    const tasks = state.tasks.filter((t) => t.areaId === areaId && !t.cancelled);
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((t) => t.completed).length / tasks.length) * 100);
  }

  function overallStats() {
    const total = state.tasks.filter((t) => !t.cancelled).length;
    const done = state.tasks.filter((t) => t.completed && !t.cancelled).length;
    return { total, done, percent: total ? Math.round((done / total) * 100) : 0 };
  }

  function normalizeUsername(v) {
    return String(v || "")
      .toLowerCase()
      .replace(/[^a-z0-9_\-]/g, "")
      .slice(0, 24);
  }

  function validateUsername(v) {
    const n = normalizeUsername(v);
    if (n.length === 0)    return { ok: false, msg: "یوزرنیم رو بنویس" };
    if (n.length < 3)      return { ok: false, msg: "حداقل ۳ حرف" };
    if (n.length > 24)     return { ok: false, msg: "حداکثر ۲۴ حرف" };
    if (!/^[a-z0-9_\-]+$/.test(n)) return { ok: false, msg: "فقط حروف انگلیسی کوچک، عدد، _ یا -" };
    return { ok: true, value: n };
  }

  function getUsername() {
    if (!state || !state.workspace) return "user";
    const u = normalizeUsername(state.workspace.username);
    return u || "user";
  }

    function getFirstName() {
    if (!state || !state.workspace) return "";
    const fn = (state.workspace.firstName || "").trim();
    if (fn) return fn;
    // سازگاری با نسخه‌ی قدیم: از name اولین کلمه
    const full = (state.workspace.name || "").trim();
    if (full) return full.split(/\s+/)[0];
    return "";
  }

  function getFullName() {
    if (!state || !state.workspace) return "";
    const fn = (state.workspace.firstName || "").trim();
    const ln = (state.workspace.lastName || "").trim();
    if (fn && ln) return fn + " " + ln;
    if (fn) return fn;
    return (state.workspace.name || "").trim();
  }

  function escapeHTML(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }

  /* ─── Theme ────────────────────────────────────────────── */

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
    const sun = document.getElementById("icon-sun");
    const moon = document.getElementById("icon-moon");
    if (sun && moon) {
      sun.style.display  = theme === "dark"  ? "" : "none";
      moon.style.display = theme === "light" ? "" : "none";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f4f6fb" : "#0a0e13");
  }

  function toggleTheme() {
    const cur = document.documentElement.getAttribute("data-theme") || "dark";
    applyTheme(cur === "dark" ? "light" : "dark");
  }

  /* ─── Modal ────────────────────────────────────────────── */

  function showComingSoonModal(areaId) {
    const area = areaById(areaId);
    if (!area) return;
    const tint = area.accent || "251, 191, 36";
    const icon = area.icon || "🚧";

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = `
      <div class="modal coming-soon-modal" role="dialog" aria-modal="true" style="--cs-tint:${tint};">
        <div class="coming-soon-modal-icon">${icon}</div>
        <div class="coming-soon-modal-title">به زودی فعال می‌شه</div>
        <div class="coming-soon-modal-sub">${escapeHTML(area.title)}</div>
        <div class="coming-soon-modal-desc">
          این بخش هنوز کامل نشده و طراحی جدیدی داره.<br>
          توی آپدیت‌های بعدی فعال می‌شه.<br>
          اگه دوست داری، می‌تونی ساختار پیشنهادی رو ببینی.
        </div>
        <div class="coming-soon-modal-actions">
          <button class="btn ghost" type="button" data-view-structure>📋 ببینم ساختار</button>
          <button class="btn primary" type="button" data-close>باشه، فهمیدم</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };

    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-view-structure]").addEventListener("click", () => {
      close();
      routeParam = areaId;
      route = "area-detail";
      if (location.hash !== "#/area-detail") history.replaceState(null, "", "#/area-detail");
      document.querySelectorAll(".nav-item").forEach((btn) => {
        btn.classList.toggle("active", btn.dataset.route === "area-detail");
      });
      render();
      window.scrollTo(0, 0);
    });
  }

  /* ─── Auto-Update ─── */
  function compareVersions(a, b) {
    const pa = String(a).split(".").map((x) => parseInt(x, 10) || 0);
    const pb = String(b).split(".").map((x) => parseInt(x, 10) || 0);
    const len = Math.max(pa.length, pb.length);
    for (let i = 0; i < len; i++) {
      const va = pa[i] || 0;
      const vb = pb[i] || 0;
      if (va > vb) return 1;
      if (va < vb) return -1;
    }
    return 0;
  }

  function openUpdateModal() {
    const currentVersion = APP_VERSION;
    const updateUrl = (DATA.updateUrl || "").trim();

    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.zIndex = "999999";

    const baseHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true" style="max-width:520px;">
        <h3 style="display:flex;align-items:center;gap:8px;">🔄 به‌روزرسانی برنامه</h3>
        <div id="update-body">
          <p style="margin:0 0 16px;color:var(--text-muted);font-size:13px;">
            نسخه‌ی فعلی: <strong style="color:var(--text);font-family:ui-monospace;">v${escapeHTML(currentVersion)}</strong>
          </p>
          <div id="update-status" style="padding:16px;border-radius:12px;background:var(--surface-1);border:1px solid var(--border);font-size:13px;color:var(--text-muted);text-align:center;">
            در حال بررسی...
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>بستن</button>
          <button class="btn primary" type="button" data-check hidden>🔄 بررسی مجدد</button>
        </div>
      </div>
    `;
    overlay.innerHTML = baseHTML;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const statusEl = overlay.querySelector("#update-status");
    const checkBtn = overlay.querySelector("[data-check]");

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    const checkUpdate = () => {
      if (!updateUrl) {
        statusEl.innerHTML = `
          <div style="text-align:start;color:var(--text-muted);line-height:1.9">
            ⚠️ آدرس بررسی آپدیت تنظیم نشده.<br>
            <span style="font-size:12px;color:var(--text-dim)">
              این قابلیت وقتی فعال می‌شه که نسخه‌های جدید آنلاین قرار بگیرن.
            </span>
          </div>`;
        checkBtn.hidden = true;
        return;
      }

      statusEl.innerHTML = "🔍 در حال بررسی نسخه‌ی جدید...";
      checkBtn.hidden = true;

      fetch(API_BASE + "/api/check-update?url=" + encodeURIComponent(updateUrl))
        .then((r) => r.json())
        .then((res) => {
          if (res.error) {
            statusEl.innerHTML = `<span style="color:#fb7185">❌ خطا: ${escapeHTML(res.error)}</span>`;
            checkBtn.hidden = false;
            return;
          }
          const latest = res.latest || "";
          const notes = res.notes || "";
          const installerUrl = res.installerUrl || res.zipUrl || "";
          const sha256 = res.sha256 || "";
          const cmp = compareVersions(latest, currentVersion);

          if (cmp <= 0) {
            statusEl.innerHTML = `
              <div style="text-align:center;line-height:1.9;">
                <div style="font-size:32px;margin-bottom:6px;">✅</div>
                <div style="color:#34d399;font-weight:700;margin-bottom:4px;">آخرین نسخه رو داری!</div>
                <div style="font-size:12px;color:var(--text-dim);">v${escapeHTML(currentVersion)}</div>
              </div>`;
            checkBtn.hidden = false;
            return;
          }

          statusEl.innerHTML = `
            <div style="text-align:start;line-height:1.9;">
              <div style="font-size:32px;text-align:center;margin-bottom:8px;">🎁</div>
              <div style="text-align:center;color:#5eead4;font-weight:800;font-size:15px;margin-bottom:10px;">
                نسخه‌ی جدید موجوده: v${escapeHTML(latest)}
              </div>
              ${notes ? `<div style="padding:10px 12px;background:var(--surface-2);border-radius:8px;font-size:12.5px;color:var(--text-muted);margin-bottom:12px;border:1px solid var(--border);">
                <strong style="color:var(--text);display:block;margin-bottom:4px;">📝 تغییرات:</strong>
                ${escapeHTML(notes).replace(/\n/g, "<br>")}
              </div>` : ""}
              <button class="btn primary" type="button" data-apply style="width:100%;justify-content:center;">
                ⬇️ دانلود و نصب آپدیت
              </button>
            </div>`;

          const applyBtn = statusEl.querySelector("[data-apply]");
          if (applyBtn) {
            applyBtn.addEventListener("click", () => {
              applyBtn.disabled = true;
              applyBtn.textContent = "⏳ در حال دانلود...";
              statusEl.innerHTML = `
                <div style="text-align:center;line-height:1.9;">
                  <div style="font-size:32px;margin-bottom:8px;">⬇️</div>
                  <div style="color:#fbbf24;font-weight:700;">در حال دانلود و نصب...</div>
                  <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">ممکنه چند ثانیه طول بکشه. برنامه خودش بسته و دوباره باز می‌شه.</div>
                </div>`;

              fetch(API_BASE + "/api/apply-update", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ installerUrl: installerUrl, newVersion: latest, sha256: sha256 })
              })
                .then((r) => r.json())
                .then((j) => {
                  if (j.error) {
                    statusEl.innerHTML = `<span style="color:#fb7185">❌ خطا در نصب: ${escapeHTML(j.error)}</span>`;
                    return;
                  }
                  var pollFailures = 0;
                  var pollUpdateProgress = function () {
                    fetch(API_BASE + "/api/apply-update-progress")
                      .then((r) => r.json())
                      .then((p) => {
                        pollFailures = 0;
                        var pct = (p.bytesTotal > 0) ? Math.min(100, Math.round(p.bytesDone / p.bytesTotal * 100)) : 0;
                        var mbDone = (p.bytesDone / 1048576).toFixed(1);
                        var mbTotal = (p.bytesTotal / 1048576).toFixed(1);
                        if (p.state === "downloading") {
                          statusEl.innerHTML = `
                            <div style="text-align:center;line-height:1.9;">
                              <div style="font-size:32px;margin-bottom:8px;">⬇️</div>
                              <div style="color:#fbbf24;font-weight:700;margin-bottom:12px;">در حال دانلود آپدیت...</div>
                              <div style="background:var(--surface-2);border-radius:10px;height:14px;overflow:hidden;margin:0 0 12px;border:1px solid var(--border);">
                                <div style="height:100%;width:${pct}%;background:linear-gradient(90deg,#3b82f6,#5eead4);transition:width 0.3s ease;"></div>
                              </div>
                              <div style="font-size:12px;color:var(--text-muted);line-height:1.6;">
                                <div><strong style="color:var(--text);font-family:ui-monospace;font-size:14px;">${pct}%</strong> · ${mbDone} / ${mbTotal} MB</div>
                              </div>
                            </div>`;
                          setTimeout(pollUpdateProgress, 400);
                          return;
                        }
                        if (p.state === "verifying") {
                          statusEl.innerHTML = `<div style="text-align:center;color:#5eead4;padding:16px;font-weight:700;">🔐 بررسی SHA256...</div>`;
                          setTimeout(pollUpdateProgress, 400);
                          return;
                        }
                        if (p.state === "installing" || p.state === "restarting") {
                          statusEl.innerHTML = `
                            <div style="text-align:center;line-height:1.9;">
                              <div style="font-size:32px;margin-bottom:8px;">⚙️</div>
                              <div style="color:#34d399;font-weight:700;">آپدیت دانلود شد — در حال نصب...</div>
                              <div style="font-size:12px;color:var(--text-dim);margin-top:6px;">برنامه تا چند ثانیه دیگه خودش بسته و دوباره باز می‌شه.</div>
                            </div>`;
                          return;
                        }
                        if (p.state === "error") {
                          statusEl.innerHTML = `<span style="color:#fb7185">❌ خطا: ${escapeHTML(p.error || p.message || "unknown")}</span>`;
                          return;
                        }
                        setTimeout(pollUpdateProgress, 400);
                      })
                      .catch(() => {
                        pollFailures++;
                        if (pollFailures > 15) return;
                        setTimeout(pollUpdateProgress, 800);
                      });
                  };
                  pollUpdateProgress();
                })
                .catch((err) => {
                  statusEl.innerHTML = `<span style="color:#fb7185">❌ خطا: ${escapeHTML(err.message)}</span>`;
                });
            });
          }
        })
        .catch((err) => {
          statusEl.innerHTML = `<span style="color:#fb7185">❌ خطا در اتصال: ${escapeHTML(err.message)}</span>`;
          checkBtn.hidden = false;
        });
    };

    checkBtn.addEventListener("click", checkUpdate);
    checkUpdate();
  }

  function openModal(opts) {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.style.position = "fixed";
    overlay.style.inset = "0";
    overlay.style.zIndex = "999999";
    overlay.innerHTML = `
      <div class="modal" role="dialog" aria-modal="true">
        <h3>${opts.title}</h3>
        <p>${opts.message}</p>
        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
          <button class="btn ${opts.danger ? "danger" : "primary"}" type="button" data-confirm>${opts.confirmText || "تأیید"}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));
    overlay.querySelector("[data-close]").addEventListener("click", closeModal);
    overlay.querySelector("[data-confirm]").addEventListener("click", () => {
      closeModal();
      if (typeof opts.onConfirm === "function") opts.onConfirm();
    });
    overlay.addEventListener("click", (e) => { if (e.target === overlay) closeModal(); });
    overlay._esc = (e) => { if (e.key === "Escape") closeModal(); };
    document.addEventListener("keydown", overlay._esc);
  }

  function closeModal() {
    const existing = document.querySelector(".modal-overlay");
    if (!existing) return;
    if (existing._esc) document.removeEventListener("keydown", existing._esc);
    existing.remove();
  }

  function toast(message, type) {
    const wrap = document.getElementById("toast-wrap");
    if (!wrap) return;
    const el = document.createElement("div");
    el.className = "toast" + (type === "error" ? " error" : "");
    el.textContent = message;
    wrap.appendChild(el);
    requestAnimationFrame(() => el.classList.add("show"));
    setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 320); }, 2600);
  }

  /* ─── Content Import (Bulk JSON) ───────────────────────── */

  function getImportsCount() {
    return Array.isArray(state.imports) ? state.imports.length : 0;
  }

  function openContentImport() {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>📥 وارد کردن محتوا</h3>
        <p style="margin-bottom:14px">
          فایل JSON انتخاب کن یا محتوا را در کادر زیر Paste کن.
          پیش از افزودن، پیش‌نمایش نشان داده می‌شود.
        </p>

        <div class="import-source-row">
          <input type="file" id="ci-file" accept=".json,application/json" hidden>
          <button type="button" class="btn ghost" data-ci-pick>📁 انتخاب فایل</button>
          <span class="import-file-status" id="ci-file-status">—</span>
        </div>

        <textarea id="ci-textarea" rows="8"
          placeholder='{"schemaVersion":1,"packageType":"internship-os-content","operations":[...]}'></textarea>

        <div class="import-actions">
          <button type="button" class="btn primary" data-ci-analyze>تحلیل</button>
          <button type="button" class="btn ghost" data-ci-clear>پاک کردن</button>
        </div>

        <div class="import-preview" id="ci-preview" hidden></div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const fileInput  = overlay.querySelector("#ci-file");
    const fileStatus = overlay.querySelector("#ci-file-status");
    const textarea   = overlay.querySelector("#ci-textarea");
    const previewEl  = overlay.querySelector("#ci-preview");

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-ci-pick]").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      fileStatus.textContent = f.name;
      const reader = new FileReader();
      reader.onload = () => { textarea.value = String(reader.result || ""); };
      reader.readAsText(f);
    });

    overlay.querySelector("[data-ci-clear]").addEventListener("click", () => {
      textarea.value = "";
      fileInput.value = "";
      fileStatus.textContent = "—";
      previewEl.hidden = true;
      previewEl.innerHTML = "";
    });

    overlay.querySelector("[data-ci-analyze]").addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) { toast("محتوایی برای تحلیل نیست", "error"); return; }
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (e) { toast("JSON معتبر نیست", "error"); return; }

      const analyzed = analyzeContentPackage(parsed);
      previewEl.innerHTML = renderImportPreview(analyzed);
      previewEl.hidden = false;

      const commitBtn = previewEl.querySelector("[data-ci-commit]");
      if (commitBtn) {
        commitBtn.addEventListener("click", () => {
          const checked = overlay.querySelector('input[name="dupMode"]:checked');
          const mode = checked ? checked.value : "skip";
          confirmAndCommitContentImport(analyzed, mode, (result) => {
            close();
            render();
            const parts = [];
            if (result.added > 0)   parts.push(`${faNum(result.added)} افزودن`);
            if (result.deleted > 0) parts.push(`${faNum(result.deleted)} حذف`);
            if (result.updated > 0) parts.push(`${faNum(result.updated)} ویرایش`);
            if (result.skipped > 0) parts.push(`${faNum(result.skipped)} تکراری رد شد`);
            if (parts.length > 0) {
              toast(parts.join(" · "));
            } else {
              toast("موردی اضافه نشد", "error");
            }
          });
        });
      }
    });
  }

  /* ─── Analyze ─────────────────────────────────────────── */

    function analyzeContentPackage(pkg) {
    const result = {
      valid: true,
      errors: [],
      metadata: (pkg && pkg.metadata) ? pkg.metadata : {},
      operations: [],
      stats: { validCount: 0, duplicateCount: 0, invalidCount: 0, deleteCount: 0, updateCount: 0 },
      counts: {
        clinical_specialty: 0,
        clinical_category: 0,
        clinical_item: 0,
        procedure_category: 0,
        procedure_item: 0,
        residency_subject: 0,
        residency_topic: 0,
        residency_resource: 0
      }
    };

    if (!pkg || typeof pkg !== "object") {
      result.valid = false;
      result.errors.push("ساختار JSON قابل شناسایی نیست.");
      return result;
    }
    if (pkg.packageType !== "internship-os-content") {
      result.valid = false;
      result.errors.push('packageType باید "internship-os-content" باشد.');
    }
    if (!Array.isArray(pkg.operations) || pkg.operations.length === 0) {
      result.valid = false;
      result.errors.push("لیست operations خالی یا نامعتبر است.");
      return result;
    }

    const custom = getCustomContent();
    const baseCurriculum = DATA.clinicalCurriculum || [];
    const baseProcedures = DATA.defaultProcedures || [];

    const specInBase   = (id) => baseCurriculum.some((s) => s.id === id);
    const specInCustom = (id) => !!custom.clinicalSpecialties[id];
    const catInBase    = (specId, catId) => {
      const spec = baseCurriculum.find((s) => s.id === specId);
      return !!(spec && (spec.categories || []).some((c) => c.id === catId));
    };
    const catInCustom  = (specId, catId) => {
      const c = custom.clinicalCategories[catId];
      return !!(c && c.specialtyId === specId);
    };
    const itemInBase   = (specId, catId, title) => {
      const spec = baseCurriculum.find((s) => s.id === specId);
      if (!spec) return false;
      const cat = (spec.categories || []).find((c) => c.id === catId);
      if (!cat) return false;
      return (cat.items || []).some((it) => {
        if (typeof it === "string") return it === title;
        return it && it.title === title;
      });
    };
    const itemInCustom = (id) => !!custom.clinicalItems[id];
    const procCatInBase   = (id) => baseProcedures.some((c) => c.id === id);
    const procCatInCustom = (id) => !!custom.procedureCategories[id];
    const procItemInBase  = (catId, title) => {
      const c = baseProcedures.find((x) => x.id === catId);
      return !!(c && (c.items || []).includes(title));
    };
    const procItemInCustom = (catId, title) =>
      Object.values(custom.procedureItems || {}).some(
        (x) => x.categoryId === catId && x.title === title
      );

    const resSubInCustom = (id) => !!custom.residencySubjects[id];
    const resTopInCustom = (id) => !!custom.residencyTopics[id];
    const resResInCustom = (id) => !!custom.residencyResources[id];

    const pendingSpecs    = new Set();
    const pendingCats     = new Set();
    const pendingProcCats = new Set();
    const pendingResSubs  = new Set();

    pkg.operations.forEach((op) => {
      if (!op || op.action !== "add" || !op.entity || !op.data) return;
      const d = op.data;
      if (op.entity === "clinical_specialty" && d.id) {
        if (!specInBase(d.id) && !specInCustom(d.id)) pendingSpecs.add(d.id);
      } else if (op.entity === "clinical_category" && d.id && d.specialtyId) {
        if (!catInBase(d.specialtyId, d.id) && !catInCustom(d.specialtyId, d.id)) {
          pendingCats.add(d.specialtyId + "::" + d.id);
        }
      } else if (op.entity === "procedure_category" && d.id) {
        if (!procCatInBase(d.id) && !procCatInCustom(d.id)) pendingProcCats.add(d.id);
      } else if (op.entity === "residency_subject" && d.id) {
        if (!resSubInCustom(d.id)) pendingResSubs.add(d.id);
      }
    });

    const specExists    = (id) => specInBase(id) || specInCustom(id) || pendingSpecs.has(id);
    const catExists     = (specId, catId) =>
      catInBase(specId, catId) || catInCustom(specId, catId) || pendingCats.has(specId + "::" + catId);
    const procCatExists = (id) =>
      procCatInBase(id) || procCatInCustom(id) || pendingProcCats.has(id);
    const resSubExists  = (id) => resSubInCustom(id) || pendingResSubs.has(id);

    pkg.operations.forEach((op, index) => {
      const entry = {
        index,
        action: op && op.action ? op.action : "add",
        entity: op && op.entity ? op.entity : null,
        data: op && op.data ? op.data : null,
        status: "valid",
        reason: ""
      };

      if (!op || typeof op !== "object") {
        entry.status = "invalid"; entry.reason = "operation نامعتبر";
      } else if (["add", "delete", "update"].indexOf(entry.action) === -1) {
        entry.status = "invalid"; entry.reason = 'action باید "add" یا "delete" یا "update" باشد';
      } else if (!entry.entity) {
        entry.status = "invalid"; entry.reason = "entity مشخص نشده";
      } else if (!entry.data || typeof entry.data !== "object") {
        entry.status = "invalid"; entry.reason = "data نامعتبر";
      } else if (entry.action === "delete") {
        // ─── حذف: فقط id لازمه، فقط روی محتوای سفارشی ───
        const d = entry.data;
        const customMap = {
          clinical_specialty:  custom.clinicalSpecialties,
          clinical_category:   custom.clinicalCategories,
          clinical_item:       custom.clinicalItems,
          procedure_category:  custom.procedureCategories,
          residency_subject:   custom.residencySubjects,
          residency_topic:     custom.residencyTopics,
          residency_resource:  custom.residencyResources
        };
        if (!d.id) {
          entry.status = "invalid"; entry.reason = "id ندارد";
        } else if (entry.entity === "procedure_item") {
          const found = Object.values(custom.procedureItems || {}).find(
            (x) => x.key === d.id ||
                   (d.categoryId && x.categoryId === d.categoryId && x.title === d.title)
          );
          if (!found) {
            entry.status = "invalid";
            entry.reason = "پروسیجر سفارشی با این id یا عنوان پیدا نشد";
          }
        } else if (customMap[entry.entity]) {
          if (!customMap[entry.entity][d.id]) {
            entry.status = "invalid";
            entry.reason = "این مورد سفارشی وجود ندارد (فقط محتوای سفارشی قابل حذف است)";
          }
        } else {
          entry.status = "invalid"; entry.reason = "entity ناشناخته: " + entry.entity;
        }
      } else if (entry.action === "update") {
        // ─── ویرایش: id + فیلدهای جدید، فقط روی محتوای سفارشی ───
        const d = entry.data;
        const customMap = {
          clinical_specialty:  custom.clinicalSpecialties,
          clinical_category:   custom.clinicalCategories,
          clinical_item:       custom.clinicalItems,
          procedure_category:  custom.procedureCategories,
          residency_subject:   custom.residencySubjects,
          residency_topic:     custom.residencyTopics,
          residency_resource:  custom.residencyResources
        };
        if (!d.id) {
          entry.status = "invalid"; entry.reason = "id ندارد";
        } else if (entry.entity === "procedure_item") {
          entry.status = "invalid";
          entry.reason = "ویرایش پروسیجر پشتیبانی نمی‌شود — فقط حذف و افزودن";
        } else if (!customMap[entry.entity]) {
          entry.status = "invalid"; entry.reason = "entity قابل ویرایش نیست: " + entry.entity;
        } else if (!customMap[entry.entity][d.id]) {
          entry.status = "invalid";
          entry.reason = "این مورد سفارشی وجود ندارد (فقط محتوای سفارشی قابل ویرایش است)";
        }
      } else {
        const d = entry.data;

        if (entry.entity === "clinical_specialty") {
          if (!d.id || !d.title) {
            entry.status = "invalid"; entry.reason = "id یا title ندارد";
          } else if (specInBase(d.id) || specInCustom(d.id)) {
            entry.status = "duplicate"; entry.reason = "تخصص با این id از قبل وجود دارد";
          }
        }
        else if (entry.entity === "clinical_category") {
          if (!d.id || !d.title || !d.specialtyId) {
            entry.status = "invalid"; entry.reason = "id یا title یا specialtyId ندارد";
          } else if (!specExists(d.specialtyId)) {
            entry.status = "invalid"; entry.reason = "تخصص مقصد پیدا نشد";
          } else if (catInBase(d.specialtyId, d.id) || catInCustom(d.specialtyId, d.id)) {
            entry.status = "duplicate"; entry.reason = "دسته با این id در این تخصص وجود دارد";
          }
        }
        else if (entry.entity === "clinical_item") {
          if (!d.id || !d.title || !d.specialtyId || !d.categoryId) {
            entry.status = "invalid"; entry.reason = "id یا title یا specialtyId یا categoryId ندارد";
          } else if (!specExists(d.specialtyId)) {
            entry.status = "invalid"; entry.reason = "تخصص مقصد پیدا نشد";
          } else if (!catExists(d.specialtyId, d.categoryId)) {
            entry.status = "invalid"; entry.reason = "دسته مقصد پیدا نشد";
          } else if (itemInCustom(d.id) || itemInBase(d.specialtyId, d.categoryId, d.title)) {
            entry.status = "duplicate"; entry.reason = "آیتم با این id یا عنوان از قبل وجود دارد";
          }
        }
        else if (entry.entity === "procedure_category") {
          if (!d.id || !d.title) {
            entry.status = "invalid"; entry.reason = "id یا title ندارد";
          } else if (procCatInBase(d.id) || procCatInCustom(d.id)) {
            entry.status = "duplicate"; entry.reason = "دسته پروسیجر با این id از قبل وجود دارد";
          }
        }
        else if (entry.entity === "procedure_item") {
          if (!d.categoryId || !d.title) {
            entry.status = "invalid"; entry.reason = "categoryId یا title ندارد";
          } else if (!procCatExists(d.categoryId)) {
            entry.status = "invalid"; entry.reason = "دسته پروسیجر مقصد پیدا نشد";
          } else if (procItemInBase(d.categoryId, d.title) || procItemInCustom(d.categoryId, d.title)) {
            entry.status = "duplicate"; entry.reason = "این پروسیجر در این دسته از قبل وجود دارد";
          }
        }
        else if (entry.entity === "residency_subject") {
          if (!d.id || !d.title) {
            entry.status = "invalid"; entry.reason = "id یا title ندارد";
          } else if (resSubInCustom(d.id)) {
            entry.status = "duplicate"; entry.reason = "درس رزیدنتی با این id از قبل وجود دارد";
          }
        }
        else if (entry.entity === "residency_topic") {
          if (!d.id || !d.title || !d.subjectId) {
            entry.status = "invalid"; entry.reason = "id یا title یا subjectId ندارد";
          } else if (!resSubExists(d.subjectId)) {
            entry.status = "invalid"; entry.reason = "درس رزیدنتی مقصد پیدا نشد";
          } else if (resTopInCustom(d.id)) {
            entry.status = "duplicate"; entry.reason = "موضوع با این id از قبل وجود دارد";
          }
        }
        else if (entry.entity === "residency_resource") {
          if (!d.id || !d.title) {
            entry.status = "invalid"; entry.reason = "id یا title ندارد";
          } else if (d.subjectId && !resSubExists(d.subjectId)) {
            entry.status = "invalid"; entry.reason = "درس رزیدنتی مقصد پیدا نشد";
          } else if (resResInCustom(d.id)) {
            entry.status = "duplicate"; entry.reason = "منبع با این id از قبل وجود دارد";
          }
        }
        else {
          entry.status = "invalid"; entry.reason = "entity ناشناخته: " + entry.entity;
        }
      }

      if (entry.status === "valid") {
        result.stats.validCount++;
        if (entry.action === "delete") result.stats.deleteCount++;
        if (entry.action === "update") result.stats.updateCount++;
      }
      else if (entry.status === "duplicate") result.stats.duplicateCount++;
      else result.stats.invalidCount++;

      // counts فقط برای add معنی داره
      if (entry.status === "valid" && entry.action === "add" &&
          entry.entity && result.counts[entry.entity] !== undefined) {
        result.counts[entry.entity]++;
      }

      result.operations.push(entry);
    });

    return result;
  }

  /* ─── Preview ─────────────────────────────────────────── */

  function renderImportPreview(a) {
    if (!a.valid) {
      return `
        <div class="import-errors">
          <div class="import-error-title">❌ بسته قابل پردازش نیست</div>
          <ul>${a.errors.map((e) => `<li>${escapeHTML(e)}</li>`).join("")}</ul>
        </div>
      `;
    }

    const title = a.metadata.title || "بدون عنوان";
    const desc = a.metadata.description || "";

    const addOps = a.operations.filter((o) => o.status === "valid" && o.action === "add");
    const delOps = a.operations.filter((o) => o.status === "valid" && o.action === "delete");
    const updOps = a.operations.filter((o) => o.status === "valid" && o.action === "update");
    const dupOps = a.operations.filter((o) => o.status === "duplicate");
    const invalidOps = a.operations.filter((o) => o.status === "invalid");

    const labels = {
      clinical_specialty: "تخصص",
      clinical_category: "دسته",
      clinical_item: "آیتم",
      procedure_category: "دسته پروسیجر",
      procedure_item: "پروسیجر",
      residency_subject: "درس رزیدنتی",
      residency_topic: "موضوع رزیدنتی",
      residency_resource: "منبع رزیدنتی"
    };

    const countsHTML = Object.entries(a.counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `<div class="import-count-row"><span>${labels[k] || k}</span><strong>${faNum(v)}</strong></div>`)
      .join("");

    const dupBlock = dupOps.length > 0 ? `
      <div class="import-option">
        <label>رفتار با موارد تکراری:</label>
        <div class="import-radio-group">
          <label><input type="radio" name="dupMode" value="skip" checked> رد کردن</label>
          <label><input type="radio" name="dupMode" value="replace"> جایگزینی</label>
        </div>
      </div>
    ` : "";

    const deleteWarning = delOps.length > 0 ? `
      <div class="import-option" style="background:rgba(244,63,94,.08);border-color:rgba(244,63,94,.30)">
        <label style="color:#fb7185">⚠️ این بسته شامل حذف است</label>
        <p style="margin:0;font-size:12.5px;color:var(--text-muted);line-height:1.8">
          ${faNum(delOps.length)} مورد از محتوای سفارشی حذف می‌شود.
          این کار قابل بازگشت نیست — هنگام اعمال، یک تأیید مضاعف از تو گرفته می‌شود.
        </p>
      </div>
    ` : "";

    const listBlock = (list, header) => list.length === 0 ? "" : `
      <details class="import-invalid-details">
        <summary>${header}</summary>
        <ul>
          ${list.slice(0, 30).map((o) => `<li><strong>#${faNum(o.index + 1)}</strong> ${escapeHTML(o.reason)}</li>`).join("")}
          ${list.length > 30 ? `<li>... و ${faNum(list.length - 30)} مورد دیگر</li>` : ""}
        </ul>
      </details>
    `;

    const confirmLabel =
      `${faNum(addOps.length)} افزودن` +
      (delOps.length ? ` · ${faNum(delOps.length)} حذف` : "") +
      (updOps.length ? ` · ${faNum(updOps.length)} ویرایش` : "");

    return `
      <div class="import-preview-box">
        <div class="import-preview-title">📦 ${escapeHTML(title)}</div>
        ${desc ? `<div class="import-preview-desc">${escapeHTML(desc)}</div>` : ""}

        <div class="import-counts">${countsHTML || '<p class="import-empty">موردی برای افزودن نیست</p>'}</div>

        <div class="import-summary">
          <span class="import-badge valid">✓ ${faNum(addOps.length)} افزودن</span>
          ${delOps.length > 0 ? `<span class="import-badge invalid">🗑️ ${faNum(delOps.length)} حذف</span>` : ""}
          ${updOps.length > 0 ? `<span class="import-badge dup">✏️ ${faNum(updOps.length)} ویرایش</span>` : ""}
          ${dupOps.length > 0 ? `<span class="import-badge dup">⚠️ ${faNum(dupOps.length)} تکراری</span>` : ""}
          ${invalidOps.length > 0 ? `<span class="import-badge invalid">❌ ${faNum(invalidOps.length)} نامعتبر</span>` : ""}
        </div>

        ${deleteWarning}
        ${dupBlock}
        ${listBlock(dupOps, `⚠️ ${faNum(dupOps.length)} مورد تکراری`)}
        ${listBlock(invalidOps, `❌ ${faNum(invalidOps.length)} مورد نامعتبر`)}
        ${listBlock(delOps.filter(() => false), "")}

        <div class="import-confirm-row">
          <button class="btn primary" type="button" data-ci-commit
                  ${addOps.length === 0 && delOps.length === 0 && updOps.length === 0 ? "disabled" : ""}>
            ادامه Import (${confirmLabel})
          </button>
        </div>
      </div>
    `;
  }
  /* ─── Commit ──────────────────────────────────────────── */

  /**
   * اگه بسته شامل delete/update باشه، قبل از commit تأیید می‌گیره.
   * اگه فقط add باشه، مستقیم commit می‌کنه.
   */
  function confirmAndCommitContentImport(analyzed, dupMode, onSuccess) {
    const delOps = analyzed.operations.filter((o) => o.status === "valid" && o.action === "delete");
    const updOps = analyzed.operations.filter((o) => o.status === "valid" && o.action === "update");

    const doCommit = () => {
      const result = commitContentImport(analyzed, dupMode);
      if (typeof onSuccess === "function") onSuccess(result);
    };

    // اگه delete/update نداریم → مستقیم
    if (delOps.length === 0 && updOps.length === 0) {
      doCommit();
      return;
    }

    // اگه delete داریم → تأیید مضاعف
    const lines = [];
    if (delOps.length > 0) {
      lines.push(
        `<strong style="color:#fb7185">🗑️ ${faNum(delOps.length)} مورد حذف می‌شود</strong>` +
        `<br><span style="font-size:12px;color:var(--text-dim)">حذف قابل بازگشت نیست.</span>`
      );
    }
    if (updOps.length > 0) {
      lines.push(`✏️ ${faNum(updOps.length)} مورد ویرایش می‌شود`);
    }

    openModal({
      title: "⚠️ تأیید تغییرات حساس",
      message:
        "این بسته شامل عملیات غیر-افزودنی است:<br><br>" +
        lines.join("<br><br>") +
        "<br><br>مطمئن هستی که می‌خوای اعمال کنی؟",
      confirmText: "بله، اعمال کن",
      danger: delOps.length > 0,
      onConfirm: doCommit
    });
  }

  function confirmAndCommitContentImport(analyzed, dupMode, onSuccess) {
    const delOps = analyzed.operations.filter((o) => o.status === "valid" && o.action === "delete");
    const updOps = analyzed.operations.filter((o) => o.status === "valid" && o.action === "update");

    const doCommit = () => {
      const result = commitContentImport(analyzed, dupMode);
      if (typeof onSuccess === "function") onSuccess(result);
    };

    if (delOps.length === 0 && updOps.length === 0) {
      doCommit();
      return;
    }

    const lines = [];
    if (delOps.length > 0) {
      lines.push(
        `<strong style="color:#fb7185">🗑️ ${faNum(delOps.length)} مورد حذف می‌شود</strong>` +
        `<br><span style="font-size:12px;color:var(--text-dim)">حذف قابل بازگشت نیست.</span>`
      );
    }
    if (updOps.length > 0) {
      lines.push(`✏️ ${faNum(updOps.length)} مورد ویرایش می‌شود`);
    }

    openModal({
      title: "⚠️ تأیید تغییرات حساس",
      message:
        "این بسته شامل عملیات غیر-افزودنی است:<br><br>" +
        lines.join("<br><br>") +
        "<br><br>مطمئن هستی که می‌خوای اعمال کنی؟",
      confirmText: "بله، اعمال کن",
      danger: delOps.length > 0,
      onConfirm: doCommit
    });
  }


function commitContentImport(analyzed, dupMode) {
  if (!analyzed || !analyzed.valid) return { added: 0, skipped: 0 };
  const custom = getCustomContent();
  const now = Date.now();

  const batch = {
    id: _mkId("imp"),
    at: now,
    title: analyzed.metadata.title || "",
    description: analyzed.metadata.description || "",
    entities: {
      clinicalSpecialties: [],
      clinicalCategories: [],
      clinicalItems: [],
      procedureCategories: [],
      procedureItems: [],
      residencySubjects: [],
      residencyTopics: [],
      residencyResources: []
    }
  };

  let added = 0, skipped = 0, deleted = 0, updated = 0;

  analyzed.operations.forEach((op) => {
    if (op.status === "invalid") return;
    if (op.status === "duplicate" && dupMode === "skip") { skipped++; return; }
    const d = op.data;

    if (op.action === "delete") {
      if (op.entity === "clinical_specialty") {
        if (custom.clinicalSpecialties[d.id]) {
          Object.keys(custom.clinicalCategories).forEach((cid) => {
            if (custom.clinicalCategories[cid].specialtyId === d.id) delete custom.clinicalCategories[cid];
          });
          Object.keys(custom.clinicalItems).forEach((iid) => {
            if (custom.clinicalItems[iid].specialtyId === d.id) {
              delete custom.clinicalItems[iid];
              if (state.clinicalProgress) delete state.clinicalProgress[iid];
            }
          });
          delete custom.clinicalSpecialties[d.id];
          deleted++;
        }
      }
      else if (op.entity === "clinical_category") {
        if (custom.clinicalCategories[d.id]) {
          Object.keys(custom.clinicalItems).forEach((iid) => {
            if (custom.clinicalItems[iid].categoryId === d.id) {
              delete custom.clinicalItems[iid];
              if (state.clinicalProgress) delete state.clinicalProgress[iid];
            }
          });
          delete custom.clinicalCategories[d.id];
          deleted++;
        }
      }
      else if (op.entity === "clinical_item") {
        if (custom.clinicalItems[d.id]) {
          delete custom.clinicalItems[d.id];
          if (state.clinicalProgress) delete state.clinicalProgress[d.id];
          deleted++;
        }
      }
      else if (op.entity === "procedure_category") {
        if (custom.procedureCategories[d.id]) {
          Object.keys(custom.procedureItems).forEach((k) => {
            if (custom.procedureItems[k].categoryId === d.id) delete custom.procedureItems[k];
          });
          delete custom.procedureCategories[d.id];
          deleted++;
        }
      }
      else if (op.entity === "procedure_item") {
        const foundKey = Object.keys(custom.procedureItems || {}).find((k) => {
          const x = custom.procedureItems[k];
          return x.key === d.id || (d.categoryId && x.categoryId === d.categoryId && x.title === d.title);
        });
        if (foundKey) { delete custom.procedureItems[foundKey]; deleted++; }
      }
      else if (op.entity === "residency_subject") {
        if (custom.residencySubjects[d.id]) {
          Object.keys(custom.residencyTopics).forEach((tid) => {
            if (custom.residencyTopics[tid].subjectId === d.id) delete custom.residencyTopics[tid];
          });
          Object.keys(custom.residencyResources).forEach((rid) => {
            if (custom.residencyResources[rid].subjectId === d.id) custom.residencyResources[rid].subjectId = "";
          });
          delete custom.residencySubjects[d.id];
          deleted++;
        }
      }
      else if (op.entity === "residency_topic") {
        if (custom.residencyTopics[d.id]) { delete custom.residencyTopics[d.id]; deleted++; }
      }
      else if (op.entity === "residency_resource") {
        if (custom.residencyResources[d.id]) { delete custom.residencyResources[d.id]; deleted++; }
      }
      return;
    }

    if (op.action === "update") {
      const target = (function () {
        if (op.entity === "clinical_specialty") return custom.clinicalSpecialties[d.id];
        if (op.entity === "clinical_category") return custom.clinicalCategories[d.id];
        if (op.entity === "clinical_item") return custom.clinicalItems[d.id];
        if (op.entity === "procedure_category") return custom.procedureCategories[d.id];
        if (op.entity === "residency_subject") return custom.residencySubjects[d.id];
        if (op.entity === "residency_topic") return custom.residencyTopics[d.id];
        if (op.entity === "residency_resource") return custom.residencyResources[d.id];
        return null;
      })();
      if (target) {
        ["title", "subtitle", "icon", "accent", "description", "type", "subjectId", "specialtyId", "categoryId"].forEach((f) => {
          if (d[f] !== undefined) target[f] = d[f];
        });
        target.updatedAt = now;
        updated++;
      }
      return;
    }


    if (op.entity === "clinical_specialty") {
      custom.clinicalSpecialties[d.id] = {
        id: d.id, title: d.title, subtitle: d.subtitle || "",
        icon: d.icon || "📚", accent: d.accent || "45, 212, 191",
        createdAt: now
      };
      batch.entities.clinicalSpecialties.push(d.id);
      added++;
    }
    else if (op.entity === "clinical_category") {
      custom.clinicalCategories[d.id] = {
        id: d.id, specialtyId: d.specialtyId, title: d.title, createdAt: now
      };
      batch.entities.clinicalCategories.push(d.id);
      added++;
    }
    else if (op.entity === "clinical_item") {
      custom.clinicalItems[d.id] = {
        id: d.id, specialtyId: d.specialtyId, categoryId: d.categoryId,
        title: d.title, description: d.description || "",
        tags: d.tags || [], createdAt: now
      };
      batch.entities.clinicalItems.push(d.id);
      added++;
    }
    else if (op.entity === "procedure_category") {
      custom.procedureCategories[d.id] = {
        id: d.id, title: d.title, icon: d.icon || "🔧",
        accent: d.accent || "45, 212, 191", createdAt: now
      };
      batch.entities.procedureCategories.push(d.id);
      added++;
    }
    else if (op.entity === "procedure_item") {
      const key = _mkId("pitem");
      custom.procedureItems[key] = {
        key, categoryId: d.categoryId, title: d.title, createdAt: now
      };
      batch.entities.procedureItems.push(key);
      added++;
    }
    else if (op.entity === "residency_subject") {
      custom.residencySubjects[d.id] = {
        id: d.id, title: d.title, icon: d.icon || "📖",
        accent: d.accent || "45, 212, 191", createdAt: now
      };
      batch.entities.residencySubjects.push(d.id);
      added++;
    }
    else if (op.entity === "residency_topic") {
      custom.residencyTopics[d.id] = {
        id: d.id, subjectId: d.subjectId, title: d.title, createdAt: now
      };
      batch.entities.residencyTopics.push(d.id);
      added++;
    }
    else if (op.entity === "residency_resource") {
      custom.residencyResources[d.id] = {
        id: d.id, title: d.title, type: d.type || "",
        subjectId: d.subjectId || "", createdAt: now
      };
      batch.entities.residencyResources.push(d.id);
      added++;
    }
  });

  if (added > 0) {
    if (!Array.isArray(state.imports)) state.imports = [];
    state.imports.push(batch);
  }

  cleanupImportsRefs();
  bumpContentCache();
  saveState();
  return { added, skipped, deleted, updated };


  }

  /* ╔═══ [PATCH:plan-import-engine] ═══╗ */

  function openPlanImport() {
    closeModal();
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>📅 وارد کردن برنامه</h3>
        <p style="margin-bottom:14px">
          فایل JSON برنامه انتخاب کن یا محتوا را در کادر زیر Paste کن.
          این بسته فقط شامل تسک‌ها و کشیک‌هاست.
        </p>

        <div class="import-source-row">
          <input type="file" id="pi-file" accept=".json,application/json" hidden>
          <button type="button" class="btn ghost" data-pi-pick>📁 انتخاب فایل</button>
          <span class="import-file-status" id="pi-file-status">—</span>
        </div>

        <textarea id="pi-textarea" rows="8"
          placeholder='{"schemaVersion":1,"packageType":"internship-os-plan","operations":[...]}'></textarea>

        <div class="import-actions">
          <button type="button" class="btn primary" data-pi-analyze>تحلیل</button>
          <button type="button" class="btn ghost" data-pi-clear>پاک کردن</button>
        </div>

        <div class="import-preview" id="pi-preview" hidden></div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const fileInput  = overlay.querySelector("#pi-file");
    const fileStatus = overlay.querySelector("#pi-file-status");
    const textarea   = overlay.querySelector("#pi-textarea");
    const previewEl  = overlay.querySelector("#pi-preview");

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelector("[data-pi-pick]").addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const f = fileInput.files && fileInput.files[0];
      if (!f) return;
      fileStatus.textContent = f.name;
      const reader = new FileReader();
      reader.onload = () => { textarea.value = String(reader.result || ""); };
      reader.readAsText(f);
    });

    overlay.querySelector("[data-pi-clear]").addEventListener("click", () => {
      textarea.value = "";
      fileInput.value = "";
      fileStatus.textContent = "—";
      previewEl.hidden = true;
      previewEl.innerHTML = "";
    });

    overlay.querySelector("[data-pi-analyze]").addEventListener("click", () => {
      const text = textarea.value.trim();
      if (!text) { toast("محتوایی برای تحلیل نیست", "error"); return; }
      let parsed;
      try { parsed = JSON.parse(text); }
      catch (e) { toast("JSON معتبر نیست", "error"); return; }

      const analyzed = analyzePlanPackage(parsed);
      previewEl.innerHTML = renderPlanImportPreview(analyzed);
      previewEl.hidden = false;

      const commitBtn = previewEl.querySelector("[data-pi-commit]");
      if (commitBtn) {
        commitBtn.addEventListener("click", () => {
          const checked = overlay.querySelector('input[name="planDupMode"]:checked');
          const mode = checked ? checked.value : "skip";
          const result = commitPlanImport(analyzed, mode);
          close();
          render();
          if (result.added > 0) {
            const extra = result.skipped > 0 ? ` (${faNum(result.skipped)} تکراری رد شد)` : "";
            toast(`${faNum(result.added)} مورد اضافه شد${extra}`);
          } else if (result.skipped > 0) {
            toast(`همه‌ی ${faNum(result.skipped)} مورد تکراری بود`);
          } else {
            toast("موردی اضافه نشد", "error");
          }
        });
      }
    });
  }

  function analyzePlanPackage(pkg) {
    const result = {
      valid: true,
      errors: [],
      metadata: (pkg && pkg.metadata) ? pkg.metadata : {},
      operations: [],
      stats: { validCount: 0, duplicateCount: 0, invalidCount: 0 },
      counts: { task: 0, shift: 0 }
    };

    if (!pkg || typeof pkg !== "object") {
      result.valid = false;
      result.errors.push("ساختار JSON قابل شناسایی نیست.");
      return result;
    }
    if (pkg.packageType !== "internship-os-plan") {
      result.valid = false;
      result.errors.push('packageType باید "internship-os-plan" باشد.');
    }
    if (!Array.isArray(pkg.operations) || pkg.operations.length === 0) {
      result.valid = false;
      result.errors.push("لیست operations خالی یا نامعتبر است.");
      return result;
    }

    const validAreas = LIFE_AREAS.map((a) => a.id);

    pkg.operations.forEach((op, index) => {
      const entry = {
        index,
        action: op && op.action ? op.action : "add",
        entity: op && op.entity ? op.entity : null,
        data: op && op.data ? op.data : null,
        status: "valid",
        reason: ""
      };

      if (!op || typeof op !== "object") {
        entry.status = "invalid"; entry.reason = "operation نامعتبر";
      } else if (["add", "delete", "update"].indexOf(entry.action) === -1) {
        entry.status = "invalid"; entry.reason = 'action باید "add" یا "delete" یا "update" باشد';
      } else if (!entry.entity) {
        entry.status = "invalid"; entry.reason = "entity مشخص نشده";
      } else if (!entry.data || typeof entry.data !== "object") {
        entry.status = "invalid"; entry.reason = "data نامعتبر";
      } else if (entry.action === "delete") {
        const d = entry.data;
        const customMap = {
          clinical_specialty:  custom.clinicalSpecialties,
          clinical_category:   custom.clinicalCategories,
          clinical_item:       custom.clinicalItems,
          procedure_category:  custom.procedureCategories,
          residency_subject:   custom.residencySubjects,
          residency_topic:     custom.residencyTopics,
          residency_resource:  custom.residencyResources
        };
        if (!d.id) {
          entry.status = "invalid"; entry.reason = "id ندارد";
        } else if (entry.entity === "procedure_item") {
          const found = Object.values(custom.procedureItems || {}).find(
            (x) => x.key === d.id ||
                   (d.categoryId && x.categoryId === d.categoryId && x.title === d.title)
          );
          if (!found) {
            entry.status = "invalid";
            entry.reason = "پروسیجر سفارشی با این id یا عنوان پیدا نشد";
          }
        } else if (customMap[entry.entity]) {
          if (!customMap[entry.entity][d.id]) {
            entry.status = "invalid";
            entry.reason = "این مورد سفارشی وجود ندارد (فقط محتوای سفارشی قابل حذف است)";
          }
        } else {
          entry.status = "invalid"; entry.reason = "entity ناشناخته: " + entry.entity;
        }
      } else if (entry.action === "update") {
        const d = entry.data;
        const customMap = {
          clinical_specialty:  custom.clinicalSpecialties,
          clinical_category:   custom.clinicalCategories,
          clinical_item:       custom.clinicalItems,
          procedure_category:  custom.procedureCategories,
          residency_subject:   custom.residencySubjects,
          residency_topic:     custom.residencyTopics,
          residency_resource:  custom.residencyResources
        };
        if (!d.id) {
          entry.status = "invalid"; entry.reason = "id ندارد";
        } else if (entry.entity === "procedure_item") {
          entry.status = "invalid";
          entry.reason = "ویرایش پروسیجر پشتیبانی نمی‌شود — فقط حذف و افزودن";
        } else if (!customMap[entry.entity]) {
          entry.status = "invalid"; entry.reason = "entity قابل ویرایش نیست: " + entry.entity;
        } else if (!customMap[entry.entity][d.id]) {
          entry.status = "invalid";
          entry.reason = "این مورد سفارشی وجود ندارد (فقط محتوای سفارشی قابل ویرایش است)";
        }
      } else {
        const d = entry.data;

    

        if (entry.entity === "task") {
          if (!d.title) {
            entry.status = "invalid"; entry.reason = "title ندارد";
          } else if (!d.date || !parseJalali(d.date)) {
            entry.status = "invalid"; entry.reason = "date نامعتبر (باید YYYY/M/D باشد)";
          } else if (!d.areaId || validAreas.indexOf(d.areaId) === -1) {
            entry.status = "invalid"; entry.reason = "areaId نامعتبر";
          } else if (d.id && state.tasks.some((t) => t.id === d.id)) {
            entry.status = "duplicate"; entry.reason = "تسک با این id از قبل وجود دارد";
          }
        }
        else if (entry.entity === "shift") {
          if (!d.date || !parseJalali(d.date)) {
            entry.status = "invalid"; entry.reason = "date نامعتبر";
          } else if (!d.startTime || !d.endTime) {
            entry.status = "invalid"; entry.reason = "startTime یا endTime ندارد";
          } else if (d.id && state.shifts.some((s) => s.id === d.id)) {
            entry.status = "duplicate"; entry.reason = "کشیک با این id از قبل وجود دارد";
          }
        }
        else {
          entry.status = "invalid"; entry.reason = "entity ناشناخته: " + entry.entity;
        }
      }

      if (entry.status === "valid") result.stats.validCount++;
      else if (entry.status === "duplicate") result.stats.duplicateCount++;
      else result.stats.invalidCount++;

      if (entry.status === "valid" && entry.entity && result.counts[entry.entity] !== undefined) {
        result.counts[entry.entity]++;
      }

      result.operations.push(entry);
    });

    return result;
  }

  function renderPlanImportPreview(a) {
    if (!a.valid) {
      return `
        <div class="import-errors">
          <div class="import-error-title">❌ بسته قابل پردازش نیست</div>
          <ul>${a.errors.map((e) => `<li>${escapeHTML(e)}</li>`).join("")}</ul>
        </div>
      `;
    }

    const title = a.metadata.title || "بدون عنوان";
    const desc = a.metadata.description || "";

    const validOps = a.operations.filter((o) => o.status === "valid");
    const dupOps = a.operations.filter((o) => o.status === "duplicate");
    const invalidOps = a.operations.filter((o) => o.status === "invalid");

    const labels = { task: "تسک", shift: "کشیک" };

    const countsHTML = Object.entries(a.counts)
      .filter(([_, v]) => v > 0)
      .map(([k, v]) => `<div class="import-count-row"><span>${labels[k] || k}</span><strong>${faNum(v)}</strong></div>`)
      .join("");

    const dupBlock = dupOps.length > 0 ? `
      <div class="import-option">
        <label>رفتار با موارد تکراری:</label>
        <div class="import-radio-group">
          <label><input type="radio" name="planDupMode" value="skip" checked> رد کردن</label>
          <label><input type="radio" name="planDupMode" value="replace"> جایگزینی</label>
        </div>
      </div>
    ` : "";

    const listBlock = (list, header) => list.length === 0 ? "" : `
      <details class="import-invalid-details">
        <summary>${header}</summary>
        <ul>
          ${list.slice(0, 30).map((o) => `<li><strong>#${faNum(o.index + 1)}</strong> ${escapeHTML(o.reason)}</li>`).join("")}
          ${list.length > 30 ? `<li>... و ${faNum(list.length - 30)} مورد دیگر</li>` : ""}
        </ul>
      </details>
    `;

    return `
      <div class="import-preview-box">
        <div class="import-preview-title">📅 ${escapeHTML(title)}</div>
        ${desc ? `<div class="import-preview-desc">${escapeHTML(desc)}</div>` : ""}

        <div class="import-counts">${countsHTML || '<p class="import-empty">موردی برای افزودن نیست</p>'}</div>

        <div class="import-summary">
          <span class="import-badge valid">✓ ${faNum(validOps.length)} معتبر</span>
          ${dupOps.length > 0 ? `<span class="import-badge dup">⚠️ ${faNum(dupOps.length)} تکراری</span>` : ""}
          ${invalidOps.length > 0 ? `<span class="import-badge invalid">❌ ${faNum(invalidOps.length)} نامعتبر</span>` : ""}
        </div>

        ${dupBlock}
        ${listBlock(dupOps, `⚠️ ${faNum(dupOps.length)} مورد تکراری`)}
        ${listBlock(invalidOps, `❌ ${faNum(invalidOps.length)} مورد نامعتبر`)}

        <div class="import-confirm-row">
          <button class="btn primary" type="button" data-pi-commit
                  ${validOps.length === 0 && dupOps.length === 0 ? "disabled" : ""}>
            ادامه Import (${faNum(validOps.length)} مورد)
          </button>
        </div>
      </div>
    `;
  }

  function commitPlanImport(analyzed, dupMode) {
    if (!analyzed || !analyzed.valid) return { added: 0, skipped: 0 };
    const now = Date.now();

    const batch = {
      id: _mkId("imp"),
      at: now,
      packageType: "plan",
      title: analyzed.metadata.title || "",
      description: analyzed.metadata.description || "",
      entities: {
        tasks: [],
        shifts: []
      }
    };

    let added = 0, skipped = 0;

    analyzed.operations.forEach((op) => {
      if (op.status === "invalid") return;
      if (op.status === "duplicate" && dupMode === "skip") { skipped++; return; }
      const d = op.data;

      if (op.entity === "task") {
        const id = d.id || ("t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6));
        state.tasks.push({
          id,
          title: d.title,
          areaId: d.areaId,
           date: (function () {
            const p = parseJalali(d.date);
            return p ? dateKey(p.jy, p.jm, p.jd) : d.date;
          })(),

          time: d.time || "",
          priority: d.priority || "normal",
          recurrence: d.recurrence || "none",
          description: d.description || "",
          completed: !!d.completed,
          sourceType: d.sourceType || "manual",
          sourceId: d.sourceId || null,
          sourceSpec: d.sourceSpec || null,
          sourceCat: d.sourceCat || null,
          taskType: (d.areaId === "residency")
            ? resolveResidencyType({ title: d.title, taskType: d.taskType })
            : (d.taskType || "other"),
          createdAt: now,
          updatedAt: now
        });
        batch.entities.tasks.push(id);
        added++;
      }
      else if (op.entity === "shift") {
        const id = d.id || ("s-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6));
        state.shifts.push({
          id,
         date: (function () {
            const p = parseJalali(d.date);
            return p ? dateKey(p.jy, p.jm, p.jd) : d.date;
          })(),

          startTime: d.startTime,
          endTime: d.endTime,
          type: d.type || "",
          notes: d.notes || ""
        });
        batch.entities.shifts.push(id);
        added++;
      }
    });

    if (added > 0) {
      if (!Array.isArray(state.imports)) state.imports = [];
      state.imports.push(batch);
      saveState();
    }

    return { added, skipped };
  }

  /* ╚═══ [/PATCH:plan-import-engine] ═══╝ */


  /* ─── Import Manager (delete batches) ──────────────────── */

   function importEntityCount(batch) {
    if (!batch || !batch.entities) return 0;
    const e = batch.entities;
    return (e.clinicalSpecialties || []).length +
           (e.clinicalCategories || []).length +
           (e.clinicalItems || []).length +
           (e.procedureCategories || []).length +
           (e.procedureItems || []).length +
           (e.residencySubjects || []).length +
           (e.residencyTopics || []).length +
           (e.residencyResources || []).length +
           (e.tasks || []).length +
           (e.shifts || []).length;
  }

  function importDateLabel(batch) {
    if (!batch || !batch.at) return "";
    try {
      return new Date(batch.at).toLocaleDateString("fa-IR") + " — " +
             new Date(batch.at).toLocaleTimeString("fa-IR", { hour: "2-digit", minute: "2-digit" });
    } catch (e) { return ""; }
  }

  /** حذف یک batch. اگه cascade=true باشه، هر چیزی که بعدش اضافه شده هم پاک می‌شه. */
function deleteImportBatch(batchId, cascade) {
  if (!Array.isArray(state.imports)) return { removed: 0 };
  const idx = state.imports.findIndex((b) => b.id === batchId);
  if (idx === -1) return { removed: 0 };

  const custom = getCustomContent();
  const batches = cascade
    ? state.imports.slice(idx)
    : [state.imports[idx]];

  let removed = 0;

  batches.forEach((b) => {
    if (!b || !b.entities) return;
    const e = b.entities;

    (e.clinicalItems || []).forEach((id) => {
      if (custom.clinicalItems[id]) { delete custom.clinicalItems[id]; removed++; }
    });
    (e.clinicalCategories || []).forEach((id) => {
      if (custom.clinicalCategories[id]) { delete custom.clinicalCategories[id]; removed++; }
    });
    (e.clinicalSpecialties || []).forEach((id) => {
      if (custom.clinicalSpecialties[id]) { delete custom.clinicalSpecialties[id]; removed++; }
    });
    (e.procedureItems || []).forEach((key) => {
      if (custom.procedureItems[key]) { delete custom.procedureItems[key]; removed++; }
    });
    (e.procedureCategories || []).forEach((id) => {
      if (custom.procedureCategories[id]) { delete custom.procedureCategories[id]; removed++; }
    });
    (e.residencyTopics || []).forEach((id) => {
      if (custom.residencyTopics[id]) { delete custom.residencyTopics[id]; removed++; }
    });
    (e.residencySubjects || []).forEach((id) => {
      if (custom.residencySubjects[id]) { delete custom.residencySubjects[id]; removed++; }
    });
    (e.residencyResources || []).forEach((id) => {
      if (custom.residencyResources[id]) { delete custom.residencyResources[id]; removed++; }
    });
    
      (e.tasks || []).forEach((id) => {
        const tIdx = state.tasks.findIndex((t) => t.id === id);
        if (tIdx !== -1) { state.tasks.splice(tIdx, 1); removed++; }
      });
      (e.shifts || []).forEach((id) => {
        const sIdx = state.shifts.findIndex((s) => s.id === id);
        if (sIdx !== -1) { state.shifts.splice(sIdx, 1); removed++; }
      });
  });

  if (cascade) state.imports = state.imports.slice(0, idx);
  else state.imports.splice(idx, 1);

  // پاک‌سازی progress‌های آیتم‌هایی که دیگه وجود ندارن
  if (state.clinicalProgress && typeof state.clinicalProgress === "object") {
    Object.keys(state.clinicalProgress).forEach((itemId) => {
      const stillExists = custom.clinicalItems[itemId];
      if (!stillExists) {
        const inBase = (DATA.clinicalCurriculum || []).some((spec) =>
          (spec.categories || []).some((cat) =>
            (cat.items || []).some((it, ii) => {
              const normId = (typeof it === "object" && it && it.id)
                ? it.id
                : (spec.id + "-" + (cat.id || ii) + "-" + ii);
              return normId === itemId;
            })
          )
        );
        if (!inBase) delete state.clinicalProgress[itemId];
      }
    });
  }

  bumpContentCache();
  saveState();
  return { removed };
   }


  function confirmDeleteImport(batchId) {
    const batch = (state.imports || []).find((b) => b.id === batchId);
    if (!batch) return;

    const count = importEntityCount(batch);
    const dateStr = importDateLabel(batch);
    const title = batch.title || "بدون عنوان";

    // مودال اول: انتخاب حالت
    const overlay = document.createElement("div");
    overlay.className = "modal-overlay";
    overlay.innerHTML = `
      <div class="modal modal-wide" role="dialog" aria-modal="true">
        <h3>حذف بسته‌ی واردشده</h3>
        <p style="margin-bottom:14px">
          <strong>${escapeHTML(title)}</strong><br>
          <span style="font-size:12px;color:var(--text-dim)">${dateStr}</span>
        </p>

        <div class="import-delete-options">
          <button class="import-delete-option" type="button" data-del-mode="single">
            <div class="import-delete-option-title">فقط این بسته</div>
            <div class="import-delete-option-desc">
              ${faNum(count)} مورد که این بسته اضافه کرده پاک می‌شود.
              بقیه‌ی بسته‌ها و داده‌های شما دست‌نخورده می‌ماند.
            </div>
          </button>

          <button class="import-delete-option import-delete-option-danger" type="button" data-del-mode="cascade">
            <div class="import-delete-option-title">این بسته + موارد بعدی</div>
            <div class="import-delete-option-desc">
              این بسته و <strong>همه‌ی بسته‌هایی که بعد از آن Import شده‌اند</strong> پاک می‌شوند.
              این کار قابل بازگشت نیست.
            </div>
          </button>
        </div>

        <div class="modal-actions">
          <button class="btn ghost" type="button" data-close>انصراف</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("open"));

    const close = () => {
      if (overlay._esc) document.removeEventListener("keydown", overlay._esc);
      overlay.remove();
    };
    overlay.querySelector("[data-close]").addEventListener("click", close);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) close(); });
    overlay._esc = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", overlay._esc);

    overlay.querySelectorAll("[data-del-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = btn.dataset.delMode;
        if (mode === "single") {
          const r = deleteImportBatch(batchId, false);
          close();
          render();
          toast(`${faNum(r.removed)} مورد حذف شد`);
        } else {
          // حالت خطرناک — تأیید مضاعف
          close();
          const cascadedCount = state.imports.length -
            state.imports.findIndex((b) => b.id === batchId);
          openModal({
            title: "⚠️ تأیید مضاعف",
            message:
              `این کار <strong>${faNum(cascadedCount)} بسته</strong> (شامل این بسته و همه‌ی موارد بعدی) را پاک می‌کند.<br><br>` +
              `همه‌ی محتوایی که این بسته‌ها اضافه کرده‌اند از بین می‌رود.<br><br>` +
              `<strong style="color:#fb7185">مطمئن هستی؟</strong>`,
            confirmText: "بله، همه را پاک کن",
            danger: true,
            onConfirm: () => {
              const r = deleteImportBatch(batchId, true);
              render();
              toast(`${faNum(r.removed)} مورد از ${faNum(cascadedCount)} بسته حذف شد`);
            }
          });
        }
      });
    });
  }

  function importsListHTML() {
    const imports = Array.isArray(state.imports) ? state.imports : [];
    if (imports.length === 0) return "";

    const rows = imports.slice().reverse().map((b) => {
      const count = importEntityCount(b);
      const dateStr = importDateLabel(b);
      const isPlan = b.packageType === "plan";
      const badge = isPlan
        ? '<span class="import-type-badge plan">📅 برنامه</span>'
        : '<span class="import-type-badge content">📚 محتوا</span>';
      return `
        <div class="import-batch-row">
          <div class="import-batch-info">
            <div class="import-batch-title">
              ${badge}
              ${escapeHTML(b.title || "بدون عنوان")}
            </div>
            <div class="import-batch-meta">${faNum(count)} مورد — ${dateStr}</div>
          </div>
          <button class="task-action import-batch-del" type="button"
                  data-del-import="${b.id}" title="حذف این بسته">🗑️</button>
        </div>
      `;
    }).join("");

    return `
      <div class="imports-list">
        <div class="imports-list-title">📚 بسته‌های واردشده (${faNum(imports.length)})</div>
        ${rows}
      </div>
    `;
  }
  /* ─── Content Map Export ───────────────────────────────── */
  
  function buildContentMap() {
    const curriculum = getCurriculum();
    const procedures = getProcedures();

    const clinical = curriculum.map((spec) => ({
      id: spec.id,
      title: spec.title,
      subtitle: spec.subtitle || "",
      categories: (spec.categories || []).map((cat, ci) => {
        const normalizedItems = (cat.items || []).map((it, ii) => {
          const id = (typeof it === "object" && it && it.id)
            ? it.id
            : (spec.id + "-" + (cat.id || ci) + "-" + ii);
          const title = (typeof it === "string") ? it : (it && it.title) || "آیتم";
          return { id, title };
        });
        return {
          id: cat.id || (spec.id + "-c" + ci),
          title: cat.title || "دسته",
          items: normalizedItems
        };
      })
    }));

    const proceduresOut = procedures.map((cat) => ({
      id: cat.id,
      title: cat.title,
      items: (cat.items || []).map((t, i) => ({ title: t, index: i }))
    }));

    return {
      schemaVersion: 1,
      packageType: "internship-os-content-map",
      generatedAt: new Date().toISOString(),
      app: "internship-os",
      appVersion: APP_VERSION,
      clinical,
      procedures: proceduresOut
    };
  }

  function exportContentMap() {
    const map = buildContentMap();
    const json = JSON.stringify(map, null, 2);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = getUsername() + "-content-map-" + stamp + ".json";

    saveFileWithPicker(filename, json, "application/json", {
      "application/json": [".json"]
    }).then((ok) => {
      if (ok) toast("Content Map ذخیره شد");
    });
  }

  /* ─── File save helper (with picker) ──────────────────── */

  async function saveFileWithPicker(filename, content, mimeType, acceptMap) {
    if (window.showSaveFilePicker) {
      try {
        const opts = {
          id: "internship-os-save",              // ← کلید حفظ پوشه
          suggestedName: filename,
          types: [{ description: "File", accept: acceptMap || { "application/json": [".json"] } }]
        };
        // اگه پوشه‌ی قبلی ذخیره شده، از startIn استفاده کن
        try {
          const savedDir = localStorage.getItem("internship-os.lastDir");
          if (savedDir) opts.startIn = savedDir;
        } catch (e) {}

        const handle = await window.showSaveFilePicker(opts);
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();

        // ذخیره‌ی نام پوشه برای دفعه‌ی بعد (بهترین تلاش)
        try { localStorage.setItem("internship-os.lastDir", "documents"); } catch (e) {}

        return true;
      } catch (err) {
        if (err && err.name === "AbortError") return false;
        console.warn("[Internship OS] FSA failed, fallback to download:", err);
      }
    }
    // fallback
    const blob = new Blob([content], { type: mimeType || "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  }

  /* ─── Save to state.js ─────────────────────────────────── */

  function buildStateFileContent() {
    const now = Date.now();
    const json = JSON.stringify(state, null, 2);
    return (
      "/* ═══════════════════════════════════════════════════════════\n" +
      "   INTERNSHIP OS — State file\n" +
      "   ───────────────────────────────────────────────────────────\n" +
      "   این فایل داده‌های شخصی شما را نگه می‌دارد.\n" +
      "   برای انتقال پروژه به سیستم دیگر، کل پوشه را همراه این فایل ببرید.\n" +
      "   آخرین ذخیره: " + new Date(now).toLocaleString("fa-IR") + "\n" +
      "   ═══════════════════════════════════════════════════════════ */\n\n" +
      "window.INTERNSHIP_STATE = " + json + ";\n\n" +
      "window.INTERNSHIP_STATE_SAVED_AT = " + now + ";\n"
    );
  }

  function downloadStateFile() {
    const content = buildStateFileContent();
    const blob = new Blob([content], { type: "text/javascript;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "state.js";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function saveToStateFile() {
    saveState();

    if (window.showSaveFilePicker) {
      window.showSaveFilePicker({
        suggestedName: "state.js",
        types: [{ description: "JavaScript State File", accept: { "text/javascript": [".js"] } }]
      }).then((handle) => {
        return handle.createWritable().then((writable) =>
          writable.write(buildStateFileContent()).then(() => writable.close())
        ).then(() => {
          toast("state.js ذخیره شد");
        });
      }).catch((err) => {
        if (err && err.name === "AbortError") {
          downloadStateFile();
          toast("فایل state.js دانلود شد — آن را در پوشه‌ی پروژه جایگزین کن");
        } else {
          console.warn("[Internship OS] FSA failed, using download:", err);
          downloadStateFile();
          toast("فایل state.js دانلود شد — آن را در پوشه‌ی پروژه جایگزین کن");
        }
      });
      return;
    }

    downloadStateFile();
    toast("فایل state.js دانلود شد — آن را در پوشه‌ی پروژه جایگزین کن");
  }

  /* ╔═══ [PATCH:onboarding] ═══╗ */

  let _onboardingStep = 1;
  let _onboardingOverlay = null;

  function shouldShowOnboarding() {
    if (!state || !state.workspace) return true;
    const fn = (state.workspace.firstName || "").trim();
    if (fn) return false;
    // سازگاری با نسخه‌ی قدیم
    const oldName = (state.workspace.name || "").trim();
    return oldName.length === 0;
  }

  function openOnboarding() {
    if (_onboardingOverlay) return;
    _onboardingStep = 1;

    const overlay = document.createElement("div");
    overlay.className = "onboarding-overlay";
    overlay.innerHTML = `
      <div class="onboarding-stars" id="onboarding-stars"></div>
      <div class="onboarding-glow-1"></div>
      <div class="onboarding-glow-2"></div>
      <div class="onboarding-stage" id="onboarding-stage"></div>
      <div class="onboarding-dots" id="onboarding-dots"></div>
    `;
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    _onboardingOverlay = overlay;

    // ساخت ستاره‌ها
    const starsEl = overlay.querySelector("#onboarding-stars");
    const starCount = 42;
    let starsHTML = "";
    for (let i = 0; i < starCount; i++) {
      const left = Math.random() * 100;
      const delay = Math.random() * 8;
      const duration = 6 + Math.random() * 8;
      const size = 2 + Math.random() * 3;
      const twinkle = Math.random() > 0.6;
      starsHTML += `<span class="onboarding-star ${twinkle ? "is-twinkle" : ""}"
        style="left:${left}%; animation-delay:${delay}s; animation-duration:${duration}s; width:${size}px; height:${size}px"></span>`;
    }
    starsEl.innerHTML = starsHTML;

    renderOnboardingStep();
  }

  function renderOnboardingStep() {
    if (!_onboardingOverlay) return;
    const stage = _onboardingOverlay.querySelector("#onboarding-stage");
    const dots  = _onboardingOverlay.querySelector("#onboarding-dots");
    if (!stage || !dots) return;

    // progress dots
    dots.innerHTML = [1, 2, 3, 4].map((n) => {
      let cls = "onboarding-dot";
      if (n < _onboardingStep) cls += " is-done";
      else if (n === _onboardingStep) cls += " is-active";
      return `<span class="${cls}"></span>`;
    }).join("");

    if (_onboardingStep === 1) {
      stage.innerHTML = `
        <div class="onboarding-card onboarding-card-1">
          <div class="onboarding-logo">🧠</div>
          <div class="onboarding-greeting">سلام!</div>
          <h1 class="onboarding-title">به <span class="onboarding-brand">Internship OS</span> خوش اومدی</h1>
          <p class="onboarding-desc">
            همسفر تو در دوران اینترنی — برای اینکه روزهات منظم‌تر، کارهات شفاف‌تر
            و پیشرفتت قابل دیدن باشه.
          </p>
          <div class="onboarding-features">
            <div class="onboarding-feature">
              <span class="onboarding-feature-icon">📅</span>
              <span>برنامه‌ریزی هوشمند</span>
            </div>
            <div class="onboarding-feature">
              <span class="onboarding-feature-icon">🩺</span>
              <span>مدیریت بالینی</span>
            </div>
            <div class="onboarding-feature">
              <span class="onboarding-feature-icon">📊</span>
              <span>دیدن پیشرفت</span>
            </div>
          </div>
          <button class="onboarding-btn onboarding-btn-primary" type="button" id="onboarding-start">
            شروع کنیم
            <span class="onboarding-btn-arrow">←</span>
          </button>
        </div>
      `;
      const btn = stage.querySelector("#onboarding-start");
      if (btn) btn.addEventListener("click", () => {
        _onboardingStep = 2;
        renderOnboardingStep();
      });
    }

       else if (_onboardingStep === 2) {
      const currentFirst = (state.workspace && state.workspace.firstName) ? state.workspace.firstName : "";
      const currentLast  = (state.workspace && state.workspace.lastName)  ? state.workspace.lastName  : "";
      stage.innerHTML = `
        <div class="onboarding-card onboarding-card-2">
          <div class="onboarding-step-icon">👋</div>
          <div class="onboarding-step-label">گام ۱ از ۳</div>
          <h2 class="onboarding-step-title">خوشحالیم که اینجایی</h2>
          <p class="onboarding-step-desc">
            بذار یه کم بیشتر بشناسیمت — اسمت رو بنویس تا بتونیم یه تجربه‌ی شخصی‌تر برات بسازیم.
          </p>
          <div class="onboarding-field">
            <label class="onboarding-field-label" for="onboarding-firstname">نام کوچک <span class="onboarding-field-req">*</span></label>
            <div class="onboarding-input-wrap">
              <input type="text" id="onboarding-firstname" class="onboarding-input"
                     placeholder="مثلاً: علی" autocomplete="given-name"
                     value="${escapeHTML(currentFirst)}" maxlength="20">
            </div>
          </div>
          <div class="onboarding-field">
            <label class="onboarding-field-label" for="onboarding-lastname">نام خانوادگی <span class="onboarding-field-opt">(اختیاری)</span></label>
            <div class="onboarding-input-wrap">
              <input type="text" id="onboarding-lastname" class="onboarding-input"
                     placeholder="مثلاً: احمدی" autocomplete="family-name"
                     value="${escapeHTML(currentLast)}" maxlength="30">
            </div>
          </div>
          <div class="onboarding-nav">
            <button class="onboarding-btn onboarding-btn-ghost" type="button" id="onboarding-back">→ قبلی</button>
            <button class="onboarding-btn onboarding-btn-primary" type="button" id="onboarding-next">
              بعدی
              <span class="onboarding-btn-arrow">←</span>
            </button>
          </div>
        </div>
      `;

      const firstInput = stage.querySelector("#onboarding-firstname");
      const lastInput  = stage.querySelector("#onboarding-lastname");
      setTimeout(() => { if (firstInput) firstInput.focus(); }, 300);

      const backBtn = stage.querySelector("#onboarding-back");
      if (backBtn) backBtn.addEventListener("click", () => {
        _onboardingStep = 1;
        renderOnboardingStep();
      });

      const nextBtn = stage.querySelector("#onboarding-next");
      const handleNext = () => {
        const fn = firstInput.value.trim();
        const ln = lastInput.value.trim();
        if (!fn || fn.length < 2) {
          firstInput.classList.add("is-error");
          setTimeout(() => firstInput.classList.remove("is-error"), 1500);
          toast("نام کوچکت رو بنویس (حداقل ۲ حرف)", "error");
          if (!fn) firstInput.focus();
          return;
        }
        state.workspace.firstName = fn;
        state.workspace.lastName  = ln;
        // سازگاری با فیلد قدیمی name
        state.workspace.name = ln ? (fn + " " + ln) : fn;
        saveState();
        _onboardingStep = 3;
        renderOnboardingStep();
      };

      if (nextBtn) nextBtn.addEventListener("click", handleNext);
      const onEnter = (e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } };
      if (firstInput) firstInput.addEventListener("keydown", onEnter);
      if (lastInput)  lastInput.addEventListener("keydown", onEnter);
    }

    else if (_onboardingStep === 3) {
      const currentUsername = (state.workspace && state.workspace.username) ? state.workspace.username : "";
      stage.innerHTML = `
        <div class="onboarding-card onboarding-card-3">
          <div class="onboarding-step-icon">🔖</div>
          <div class="onboarding-step-label">گام ۲ از ۳</div>
          <h2 class="onboarding-step-title">یه یوزرنیم برای خودت بساز</h2>
          <p class="onboarding-step-desc">
            یه اسم کوتاه انگلیسی — فایل‌های بکاپ و داده‌هات با این اسم ذخیره می‌شن تا بعداً راحت پیداشون کنی.
          </p>
          <div class="onboarding-input-wrap">
            <input type="text" id="onboarding-username" class="onboarding-input is-ltr"
                   placeholder="ali_ahmadi" autocomplete="off"
                   value="${escapeHTML(currentUsername)}" maxlength="24"
                   spellcheck="false" dir="ltr">
            <div class="onboarding-input-glow"></div>
          </div>
          <p class="onboarding-username-preview" id="onboarding-username-preview">
            نام فایل بکاپ: <strong>ali_ahmadi-backup-1405-07-15.json</strong>
          </p>
          <div class="onboarding-nav">
            <button class="onboarding-btn onboarding-btn-ghost" type="button" id="onboarding-back">→ قبلی</button>
            <button class="onboarding-btn onboarding-btn-primary" type="button" id="onboarding-next">
              بعدی
              <span class="onboarding-btn-arrow">←</span>
            </button>
          </div>
        </div>
      `;

      const uInput = stage.querySelector("#onboarding-username");
      const previewEl = stage.querySelector("#onboarding-username-preview");
      setTimeout(() => { if (uInput) uInput.focus(); }, 300);

      function updatePreview() {
        const v = normalizeUsername(uInput.value) || "username";
        const today = todayJalali().replace(/\//g, "-");
        previewEl.innerHTML = `نام فایل بکاپ: <strong>${escapeHTML(v)}-backup-${today}.json</strong>`;
      }

      uInput.addEventListener("input", () => {
        // فیلتر خودکار
        const cleaned = normalizeUsername(uInput.value);
        if (cleaned !== uInput.value) {
          const pos = uInput.selectionStart;
          uInput.value = cleaned;
          try { uInput.setSelectionRange(pos, pos); } catch (e) {}
        }
        updatePreview();
      });
      updatePreview();

      const backBtn = stage.querySelector("#onboarding-back");
      if (backBtn) backBtn.addEventListener("click", () => {
        _onboardingStep = 2;
        renderOnboardingStep();
      });

      const nextBtn = stage.querySelector("#onboarding-next");
      const handleNext = () => {
        const check = validateUsername(uInput.value);
        if (!check.ok) {
          uInput.classList.add("is-error");
          setTimeout(() => uInput.classList.remove("is-error"), 1500);
          toast(check.msg, "error");
          return;
        }
        state.workspace.username = check.value;
        saveState();
        _onboardingStep = 4;
        renderOnboardingStep();
      };

      if (nextBtn) nextBtn.addEventListener("click", handleNext);
      if (uInput) {
        uInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") { e.preventDefault(); handleNext(); }
        });
      }
    }

    else if (_onboardingStep === 4) {
      const savedName = getFirstName();
      stage.innerHTML = `
        <div class="onboarding-card onboarding-card-3">
          <div class="onboarding-step-icon">🎉</div>
          <div class="onboarding-step-label">گام ۳ از ۳</div>
          <h2 class="onboarding-step-title">خوش اومدی، ${escapeHTML(savedName)}!</h2>
          <p class="onboarding-step-desc">
            می‌خوای یه گشت کوتاه بزنیم تا با همه‌ی بخش‌ها آشنا بشی؟
            بعداً هم می‌تونی از تب <strong>❓ راهنما</strong> ببینیشون.
          </p>
          <div class="onboarding-choice">
            <button class="onboarding-choice-btn onboarding-choice-yes" type="button" id="onboarding-help-yes">
              <span class="onboarding-choice-icon">📖</span>
              <div class="onboarding-choice-text">
                <span class="onboarding-choice-title">آره، بریم راهنما</span>
                <span class="onboarding-choice-desc">یه گشت سریع می‌زنیم</span>
              </div>
            </button>
            <button class="onboarding-choice-btn onboarding-choice-no" type="button" id="onboarding-help-no">
              <span class="onboarding-choice-icon">🚀</span>
              <div class="onboarding-choice-text">
                <span class="onboarding-choice-title">نه، خودم کشف می‌کنم</span>
                <span class="onboarding-choice-desc">مستقیم می‌رم داشبورد</span>
              </div>
            </button>
          </div>
          <div class="onboarding-nav" style="justify-content:center">
            <button class="onboarding-btn onboarding-btn-ghost" type="button" id="onboarding-back-3">→ قبلی</button>
          </div>
        </div>
      `;

      const backBtn = stage.querySelector("#onboarding-back-3");
      if (backBtn) backBtn.addEventListener("click", () => {
        _onboardingStep = 3;
        renderOnboardingStep();
      });

      const yesBtn = stage.querySelector("#onboarding-help-yes");
      if (yesBtn) yesBtn.addEventListener("click", () => {
        finishOnboarding("help");
      });

      const noBtn = stage.querySelector("#onboarding-help-no");
      if (noBtn) noBtn.addEventListener("click", () => {
        finishOnboarding("dashboard");
      });
    }

    // انیمیشن ورود
    requestAnimationFrame(() => {
      const card = stage.querySelector(".onboarding-card");
      if (card) card.classList.add("is-visible");
    });
  }

  function finishOnboarding(where) {
    saveState();
    // بستن overlay با انیمیشن
    if (_onboardingOverlay) {
      _onboardingOverlay.classList.add("is-closing");
      setTimeout(() => {
        if (_onboardingOverlay) {
          _onboardingOverlay.remove();
          _onboardingOverlay = null;
        }
        document.body.style.overflow = "";
        // رفتن به مقصد
        if (where === "help") setRoute("help");
        else setRoute("dashboard");
        // نمایش پیام خوش‌آمد
        const name = getFirstName();
        toast(name ? `خوش اومدی ${name} 🎉` : "خوش اومدی 🎉");
      }, 480);
    }
  }

  /* ╚═══ [/PATCH:onboarding] ═══╝ */

  /* ─── Boot ─────────────────────────────────────────────── */

  function boot() {
    if (!LIFE_AREAS.length) {
      console.error("[Internship OS] data.js بارگذاری نشد.");
      view.innerHTML = '<p style="padding:40px;text-align:center">خطا در بارگذاری داده‌ها</p>';
      return;
    }

    state = loadState();
    getCustomContent();     // اطمینان از ساختار درست
    bumpContentCache();
    saveState();

    // ─── B9: Install debug bridge EARLY ───
    // so that isSetupComplete() works during the first render()
    window.__os = {
      getState: () => state,
      getCustomContent,
      bumpContentCache,
      saveState,
      render,
      renderClinicalHub,
      getCurriculum,
      getProcedures,
      getLifeAreasStructure: () => (DATA.lifeAreasStructure || {}).areas || {},
      migrateState: migrateState
    };
    try { _healthTestBridge(); } catch (e) { console.warn("[health-bridge-boot]", e && e.message); }

    // ─── B9: Safety re-render (catch cold-boot race) ───
    setTimeout(function () {
      try {
        var R = window.InternshipResidency;
        if (R && R.residencySetup && R.residencySetup.isSetupComplete && R.residencySetup.isSetupComplete()) {
          var hasWelcome = document.querySelector(".r19-welcome-page");
          if (hasWelcome) {
            console.log("[boot] B9 safety re-render (setup is complete but welcome shown)");
            render();
          }
        }
      } catch (e) { console.warn("[boot] B9 safety re-render failed:", e); }
    }, 250);

    // ─── Debug bridge (early: needed by isSetupComplete during initial render) ───
    window.__os = {
      getState: () => state,
      getCustomContent,
      bumpContentCache,
      saveState,
      render,
      renderClinicalHub,
      getCurriculum,
      getProcedures,
      getLifeAreasStructure: () => (DATA.lifeAreasStructure || {}).areas || {},
      migrateState: migrateState
    };
    try { _healthTestBridge(); } catch (e) { console.warn("[health-bridge-boot]", e && e.message); }

    // ─── B9: Safety re-render (catch cold-boot race) ───
    setTimeout(function () {
      try {
        var R = window.InternshipResidency;
        if (R && R.residencySetup && R.residencySetup.isSetupComplete && R.residencySetup.isSetupComplete()) {
          var hasWelcome = document.querySelector(".r19-welcome-page");
          if (hasWelcome) {
            console.log("[boot] B9 safety re-render (setup is complete but welcome shown)");
            render();
          }
        }
      } catch (e) { console.warn("[boot] B9 safety re-render failed:", e); }
    }, 250);
    try { window.openBaselineEditor = openBaselineEditor; } catch (e) {}

    // ─── پاک‌سازی خودکار پوشه‌های یتیم ───
    setTimeout(() => {
      cleanupOrphanFolders().then((r) => {
        if (r && r.removed > 0) {
          console.log("[cleanup] removed", r.removed, "orphan folders");
        }
      });
    }, 1500);

    document.querySelectorAll(".nav-item").forEach((btn) => {
      btn.addEventListener("click", () => setRoute(btn.dataset.route));
    });

    const saveBtn = document.getElementById("btn-save-state");
    if (saveBtn) saveBtn.addEventListener("click", saveToStateFile);

    const themeBtn = document.getElementById("btn-theme");
    if (themeBtn) themeBtn.addEventListener("click", toggleTheme);

    route = routeFromHash();
    window.addEventListener("hashchange", () => {
      const r = routeFromHash();
      if (r !== route) setRoute(r);
    });

    applyTheme(document.documentElement.getAttribute("data-theme") || "dark");

    // ─── Defensive: close any leftover wizard overlay ───
    setTimeout(function () {
      var leftover = document.querySelector(".r19-overlay");
      if (leftover && leftover.parentNode) {
        // Only close if wizard isn't supposed to be open
        var W = window.InternshipResidency && window.InternshipResidency.residencySetup;
        var setupComplete = W && W.isSetupComplete && W.isSetupComplete();
        if (setupComplete) {
          leftover.parentNode.removeChild(leftover);
          document.body.style.overflow = "";
          console.log("[boot] closed leftover wizard overlay (setup complete)");
        }
      }
    }, 300);

    // ─── Onboarding برای بار اول ───────────────────
    if (shouldShowOnboarding()) {
      setRoute(route); // یک بار رندر عادی
      openOnboarding();
    } else {
      setRoute(route);
    }

    // ─── Open task from timeline ───
    document.addEventListener("io-open-task", function (e) {
      try {
        var id = e && e.detail && e.detail.id;
        if (id) openTaskForm(id);
      } catch (err) { console.warn("[io-open-task]", err); }
    });

    // ─── Auto-upgrade time inputs + priority selects in modals ───
    if (typeof InternshipPickers !== "undefined" && InternshipPickers.autoUpgrade) {
      var _pickerUpgradeObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (m) {
          m.addedNodes.forEach(function (node) {
            if (node.nodeType === 1) {
              // اگه خودش modal-overlay یا حاویه
              if (node.classList && node.classList.contains("modal-overlay")) {
                setTimeout(function () {
                  try {
                    InternshipPickers.autoUpgrade.timeInputs(node);
                    InternshipPickers.autoUpgrade.prioritySelects(node);
                    if (InternshipPickers.autoUpgrade.recurrenceSelects) InternshipPickers.autoUpgrade.recurrenceSelects(node);
                    if (typeof InternshipTimeline !== "undefined" && InternshipTimeline.autoAttachPreviews) {
                      try { InternshipTimeline.autoAttachPreviews(node); } catch(e) {}
                    }
                  } catch (e) { console.warn("[pickers] upgrade failed:", e); }
                }, 30);
              } else if (node.querySelectorAll) {
                try {
                  InternshipPickers.autoUpgrade.timeInputs(node);
                  InternshipPickers.autoUpgrade.prioritySelects(node);
                    if (InternshipPickers.autoUpgrade.recurrenceSelects) InternshipPickers.autoUpgrade.recurrenceSelects(node);
                  if (typeof InternshipTimeline !== "undefined" && InternshipTimeline.autoAttachPreviews) {
                    try { InternshipTimeline.autoAttachPreviews(node); } catch(e) {}
                  }
                } catch (e) { console.warn("[pickers] upgrade failed:", e); }
              }
            }
          });
        });
      });
      _pickerUpgradeObserver.observe(document.body, { childList: true, subtree: true });
    }

    // ─── AI Floating Button ───
    if (typeof InternshipAI !== "undefined" && InternshipAI.initFloatingButton) {
      try { InternshipAI.initFloatingButton(); } catch (e) { console.warn("[AI] FAB init failed:", e); }
    }

    // ─── Debug bridge: already defined early in boot() ───
    if (window.__os && typeof window.__os.getState === "function") {
      // refresh state getter (in case state reference changed)
      window.__os.getState = () => state;
    }
  }

  /* quickadd-delegate-27.4a */
  document.addEventListener("click", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var btn = t.closest("[data-dbar-quick-add]");
    if (!btn) return;
    ev.preventDefault();
    ev.stopPropagation();
    var cur = (typeof _dashSelectedDay !== "undefined" && _dashSelectedDay) ? _dashSelectedDay : todayJalali();
    var p = parseJalali(cur);
    if (!p) return;
    openTaskForm(null, { jy: p.jy, jm: p.jm, jd: p.jd });
  });
    /* 27.8c: delegated drag */
  document.addEventListener("dragstart", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var chip = t.closest(".dt20-flex-item[data-dt20-source], .dt20-reminder-item[data-dt20-source]");
    if (!chip) return;
    var sid = chip.getAttribute("data-dt20-sourceid");
    var src = chip.getAttribute("data-dt20-source");
    var dur = parseInt(chip.getAttribute("data-dt20-duration"), 10) || 60;
    if (!sid || !src) return;
    try {
      ev.dataTransfer.effectAllowed = "copy";
      ev.dataTransfer.setData("application/x-io-flexible", JSON.stringify({ sourceType: src, sourceId: sid, durationMinutes: dur }));
      try { ev.dataTransfer.setData("text/plain", "io-flex"); } catch (e2) {}
      _currentDragPayload = { sourceType: src, sourceId: sid, durationMinutes: dur };
    } catch (e) {}
    chip.classList.add("is-drag-source");
  }, true);
  document.addEventListener("dragend", function (ev) {
    var t = ev.target;
    if (!t || !t.closest) return;
    var chip = t.closest(".dt20-flex-item, .dt20-reminder-item");
    if (chip) chip.classList.remove("is-drag-source");
    var bar = document.querySelector(".dash-daybar");
    if (bar) { bar.classList.remove("is-drop-target"); var g = bar.querySelector(".dash-daybar-ghost"); if (g) g.style.display = "none"; }
    _currentDragPayload = null;
  }, true);

  /* 27.8e: types-based delegated dragover */
  document.addEventListener("dragover", function (ev) {
    if (!ev.dataTransfer) return;
    var bar = document.querySelector(".dash-daybar");
    if (!bar) return;
    var r = bar.getBoundingClientRect();
    var overBar = (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top - 25 && ev.clientY <= r.bottom + 25);

    var hasFlex = false;
    try {
      var types = ev.dataTransfer.types;
      for (var i = 0; i < types.length; i++) {
        if (types[i] === "application/x-io-flexible" || types[i] === "text/plain") { hasFlex = true; break; }
      }
    } catch (e) {}

    if (!hasFlex || !overBar) {
      bar.classList.remove("is-drop-target");
      var gOld = bar.querySelector(".dash-daybar-ghost");
      if (gOld) gOld.style.display = "none";
      return;
    }

    ev.preventDefault();
    ev.dataTransfer.dropEffect = "copy";
    bar.classList.add("is-drop-target");

    try {
      var range = _getDayBarRange();
      var span = range.end - range.start;
      var pct = (ev.clientX - r.left) / r.width;
      if (pct < 0) pct = 0;
      if (pct > 1) pct = 1;
      var dur = (_currentDragPayload && _currentDragPayload.durationMinutes) || 60;
      var minAt = Math.round((range.start + pct * span) / 5) * 5;
      if (minAt + dur > range.end) minAt = range.end - dur;
      if (minAt < range.start) minAt = range.start;
      var leftPct = ((minAt - range.start) / span) * 100;
      var widthPct = (dur / span) * 100;
      var g = bar.querySelector(".dash-daybar-ghost");
      if (!g) {
        g = document.createElement("span");
        g.className = "dash-daybar-ghost";
        bar.appendChild(g);
      }
      g.style.left = leftPct + "%";
      g.style.width = widthPct + "%";
      g.style.display = "block";
    } catch (e) {}
  }, true);

  document.addEventListener("drop", function (ev) {
    var bar = document.querySelector(".dash-daybar");
    if (!bar) return;
    var r = bar.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top - 20 || ev.clientY > r.bottom + 20) return;
    var raw;
    try { raw = ev.dataTransfer.getData("application/x-io-flexible"); } catch (e) {}
    if (!raw) return;
    ev.preventDefault();
    bar.classList.remove("is-drop-target");
    var g = bar.querySelector(".dash-daybar-ghost");
    if (g) g.style.display = "none";
    var payload = _currentDragPayload;
    if (!payload) { try { payload = JSON.parse(raw); } catch (e) { return; } }
    _currentDragPayload = null;
    _onFlexibleDropOnBar(payload, ev.clientX, bar);
  }, true);
    /* 27.8d: drag-back delegated */
  document.addEventListener("dragover", function (ev) {
    var z = document.getElementById("dash-untimed-wrap");
    if (!z) return;
    try {
      var types = ev.dataTransfer.types;
      var hasTimed = false;
      for (var i = 0; i < types.length; i++) {
        if (types[i] === "application/x-io-timed") { hasTimed = true; break; }
      }
      if (!hasTimed) return;
    } catch (e) { return; }
    var r = z.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) {
      z.classList.remove("is-drop-untime");
      return;
    }
    ev.preventDefault();
    ev.dataTransfer.dropEffect = "move";
    z.classList.add("is-drop-untime");
  }, true);

  document.addEventListener("drop", function (ev) {
    var z = document.getElementById("dash-untimed-wrap");
    if (!z) return;
    var r = z.getBoundingClientRect();
    if (ev.clientX < r.left || ev.clientX > r.right || ev.clientY < r.top || ev.clientY > r.bottom) return;
    var raw;
    try { raw = ev.dataTransfer.getData("application/x-io-timed"); } catch (e) {}
    z.classList.remove("is-drop-untime");
    if (!raw) return;
    ev.preventDefault();
    var payload;
    try { payload = JSON.parse(raw); } catch (e) { return; }
    _onTimelineUntime(payload.sourceType, payload.sourceId);
  }, true);
    function _ioForceRefreshBar() {
    var cur = _dashSelectedDay || todayJalali();
    var isToday = (cur === todayJalali());
    var R = window.InternshipResidency;
    var items = [];
    try {
      if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
        items = _getEffectiveItems(cur);
      }
    } catch (e) { console.warn("[forceRefresh projectDate]", e); }

    var barHost = document.getElementById("dash-daybar-host");
    if (barHost) {
      console.log("[ioRebuild] barHost.replace, items=", items.length);
      barHost.outerHTML = _renderDashDayBar(items, isToday);
      console.log("[ioRebuild] barHost replaced, new children=", document.getElementById("dash-daybar-host").children.length);
      setTimeout(function () { _wireDayBarControls(); _wireDayBarDrag(); }, 20);
    }

    var h = document.getElementById("dash-timeline");
    var u = document.getElementById("dash-untimed");
    if (R && R.dayTimeline && R.dayTimeline.renderSplit && h) {
      try {
        R.dayTimeline.renderSplit(h, u, cur, state, {});
        _highlightNextTimedItem(h, cur);
        _wireDashTimelineInteractions(h);
        _wireTimedItemActions(h);
        if (u) { _wireFlexibleDragDrop(u); _wireUntimedActions(u); }
      } catch (e) { console.warn("[forceRefresh split]", e); }
    }

    var nnHost = document.getElementById("dash-now-next-host");
    if (nnHost) nnHost.outerHTML = _renderDashNowNext(items, isToday);
  }
  function _ioRebuildAfterDrop() {
    console.log("[ioRebuild] START");
    var cur = _dashSelectedDay || todayJalali();
    var isToday = (cur === todayJalali());
    var R = window.InternshipResidency;
    var items = [];
    try {
      if (R && R.schedulingProjection && R.schedulingProjection.projectDate) {
        items = _getEffectiveItems(cur);
      }
    } catch (e) { console.warn("[ioRebuild projectDate]", e); }

    var barHost = document.getElementById("dash-daybar-host");
    if (barHost) {
      console.log("[ioRebuild] barHost.replace, items=", items.length);
      barHost.outerHTML = _renderDashDayBar(items, isToday);
      console.log("[ioRebuild] barHost replaced, new children=", document.getElementById("dash-daybar-host").children.length);
      setTimeout(function () { _wireDayBarControls(); _wireDayBarDrag(); }, 20);
    }

    var h = document.getElementById("dash-timeline");
    var u = document.getElementById("dash-untimed");
    if (R && R.dayTimeline && R.dayTimeline.renderSplit && h) {
      try {
        R.dayTimeline.renderSplit(h, u, cur, state, {});
        _highlightNextTimedItem(h, cur);
        _wireDashTimelineInteractions(h);
        _wireTimedItemActions(h);
        if (u) { _wireFlexibleDragDrop(u); _wireUntimedActions(u); }
      } catch (e) { console.warn("[ioRebuild split]", e); }
    }

    var nnHost = document.getElementById("dash-now-next-host");
    if (nnHost) nnHost.outerHTML = _renderDashNowNext(items, isToday);
  }
  /* 27.9: pointer drag system */
  var _ioPtrDrag = null;
  var _dashEditMode = false;
  var _dashEditBuffer = {};

  function _dashHasBuffer() {
    return Object.keys(_dashEditBuffer).length > 0;
    try { _ioForceRefreshBar(); } catch (e) { console.warn('[untime-render]', e); }
    try { _ioForceRefreshBar(); } catch (e) { console.warn('[drop-render]', e); }
  }
  function _dashClearBuffer() {
    _dashEditBuffer = {};
  }
  function _dashSetBufferedValue(sourceId, time, durationMinutes) {
    _dashEditBuffer[sourceId] = { time: time, durationMinutes: durationMinutes };
  }

  function _ioStateWithBuffer() {
    if (!_dashHasBuffer()) return state;
    var clone;
    try { clone = JSON.parse(JSON.stringify(state)); } catch (e) { return state; }
    var ids = Object.keys(_dashEditBuffer);
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var buf = _dashEditBuffer[id];
      if (!buf) continue;
      if (clone.tasks) {
        for (var t = 0; t < clone.tasks.length; t++) {
          if (clone.tasks[t].id === id) {
            clone.tasks[t].time = buf.time;
            clone.tasks[t].durationMinutes = buf.durationMinutes;
            break;
          }
        }
      }
      if (clone.residency && clone.residency.activities) {
        var acts = clone.residency.activities;
        for (var a = 0; a < acts.length; a++) {
          if (acts[a].id === id) {
            acts[a].plannedStartTime = buf.time;
            acts[a].plannedDurationMinutes = buf.durationMinutes;
            break;
          }
        }
      }
      if (clone.tasks) {
        for (var k = 0; k < clone.tasks.length; k++) {
          var tk = clone.tasks[k];
          if (!tk) continue;
          var st = tk.sourceType;
          if (st !== "residency_activity" && st !== "residencyActivity") continue;
          var ref = tk.residencyActivityId || tk.sourceId;
          if (ref !== id) continue;
          tk.time = buf.time;
          tk.durationMinutes = buf.durationMinutes;
        }
      }
    }
    return clone;
  }

  function _ioRefreshDay() {
    try { render(); } catch (e) { console.warn("[ioRefreshDay]", e); }
  }

  function _ioMakeGhost(label, color, x, y) {
    var g = document.createElement("div");
    g.className = "io-pointer-ghost";
    g.textContent = label;
    if (color) {
      g.style.background = "linear-gradient(135deg, rgba(" + color + ", .95), rgba(" + color + ", .78))";
      g.style.boxShadow = "0 10px 30px -6px rgba(" + color + ", .75), 0 0 0 3px rgba(" + color + ", .25)";
      g.style.color = "#0a0e13";
    }
    document.body.appendChild(g);
    g.style.left = x + "px";
    g.style.top = y + "px";
    return g;
  }
  function _ioMoveGhost(g, x, y) {
    if (!g) return;
    g.style.left = x + "px";
    g.style.top = y + "px";
  }
  function _ioKillGhost(g) {
    if (g && g.parentNode) g.parentNode.removeChild(g);
  }
  function _ioIsOver(el, x, y, padY) {
    if (!el) return false;
    var r = el.getBoundingClientRect();
    var p = padY || 0;
    return x >= r.left && x <= r.right && y >= r.top - p && y <= r.bottom + p;
  }

  document.addEventListener("mousedown", function (ev) {
    if (ev.button !== 0) return;
    var t = ev.target;
    if (!t || !t.closest) return;
    if (t.closest(".dt20-chip-act") || t.closest(".dt20-act")) return;
    if (t.closest("[data-dbar-edit-toggle]") || t.closest(".dbar-action-btn") || t.closest(".dbar-quick-add")) return;

    var chip = t.closest(".dt20-flex-item[data-dt20-source], .dt20-reminder-item[data-dt20-source]");
    if (chip) {
      var src = chip.getAttribute("data-dt20-source");
      var sid = chip.getAttribute("data-dt20-sourceid");
      var dur = parseInt(chip.getAttribute("data-dt20-duration"), 10) || 60;
      var ctitle = chip.getAttribute("data-dt20-title") || (chip.textContent || "").trim().substring(0, 30);
      var ccat = chip.getAttribute("data-dt20-cat") || "";
      var ccolor = _dashCatColor(ccat, "", src);
      if (!src || !sid) return;
      _ioPtrDrag = {
        mode: "chip",
        src: src, sid: sid, dur: dur,
        title: ctitle, color: ccolor,
        startX: ev.clientX, startY: ev.clientY,
        el: chip, active: false, ghost: null
      };
      return;
    }

    var blk = t.closest('.dash-daybar-block[data-bar-source]');
    if (blk) {
      if (blk.getAttribute("data-bar-noclick") === "1") return;
      var bsrc = blk.getAttribute("data-bar-source");
      if (bsrc !== "task" && bsrc !== "residencyActivity") return;
      var bid = blk.getAttribute("data-bar-id");
      if (!bid) return;
      var bdur = parseInt(blk.getAttribute("data-bar-duration"), 10) || 60;
      var btitle = blk.getAttribute("data-bar-title") || blk.title || "";
      var bcat = blk.getAttribute("data-bar-cat") || "";
      var bcolor = _dashCatColor(bcat, "", bsrc);
      _ioPtrDrag = {
        mode: "bar",
        src: bsrc, sid: bid, dur: bdur,
        title: btitle, color: bcolor,
        startX: ev.clientX, startY: ev.clientY,
        el: blk, active: false, ghost: null
      };
      return;
    }
  }, true);

  document.addEventListener("mousemove", function (ev) {
    if (!_ioPtrDrag) return;
    var d = _ioPtrDrag;
    if (!d.active) {
      var dx = ev.clientX - d.startX;
      var dy = ev.clientY - d.startY;
      if (Math.sqrt(dx * dx + dy * dy) < 6) return;
      d.active = true;
      var _lbl = d.title ? (d.title.substring(0, 24) + " · " + d.dur + "د") : (d.dur + "د");
      d.ghost = _ioMakeGhost(_lbl, d.color, ev.clientX, ev.clientY);
      if (d.el) d.el.classList.add("is-drag-source");
      document.body.classList.add("io-dragging");
    }
    ev.preventDefault();
    _ioMoveGhost(d.ghost, ev.clientX, ev.clientY);

    var bar = document.querySelector(".dash-daybar");
    var zone = document.getElementById("dash-untimed-wrap");

    if (bar) {
      bar.classList.remove("is-drop-target");
      var gOld = bar.querySelector(".dash-daybar-ghost");
      if (gOld) gOld.style.display = "none";
    }
    if (zone) zone.classList.remove("is-drop-untime");

    if (d.mode === "chip" && _ioIsOver(bar, ev.clientX, ev.clientY, 25)) {
      bar.classList.add("is-drop-target");
      try {
        var range = _getDayBarRange();
        var span = range.end - range.start;
        var r = bar.getBoundingClientRect();
        var pct = (ev.clientX - r.left) / r.width;
        if (pct < 0) pct = 0;
        if (pct > 1) pct = 1;
        var dur = d.dur;
        var minAt = Math.round((range.start + pct * span) / 5) * 5;
        if (minAt + dur > range.end) minAt = range.end - dur;
        if (minAt < range.start) minAt = range.start;
        var leftPct = ((minAt - range.start) / span) * 100;
        var widthPct = (dur / span) * 100;
        var g = bar.querySelector(".dash-daybar-ghost");
        if (!g) {
          g = document.createElement("span");
          g.className = "dash-daybar-ghost";
          bar.appendChild(g);
        }
        g.style.left = leftPct + "%";
        g.style.width = widthPct + "%";
        g.style.display = "block";
      } catch (e) {}
    } else if (d.mode === "bar" && _ioIsOver(zone, ev.clientX, ev.clientY, 8)) {
      zone.classList.add("is-drop-untime");
    }
  }, true);

  document.addEventListener("mouseup", function (ev) {
    if (!_ioPtrDrag) return;
    var d = _ioPtrDrag;
    _ioPtrDrag = null;
    if (!d.active) return;

    _ioKillGhost(d.ghost);
    if (d.el) d.el.classList.remove("is-drag-source");
    document.body.classList.remove("io-dragging");

    var bar = document.querySelector(".dash-daybar");
    var zone = document.getElementById("dash-untimed-wrap");
    if (bar) {
      bar.classList.remove("is-drop-target");
      var g = bar.querySelector(".dash-daybar-ghost");
      if (g) g.style.display = "none";
    }
    if (zone) zone.classList.remove("is-drop-untime");

    if (d.mode === "chip" && _ioIsOver(bar, ev.clientX, ev.clientY, 25)) {
      _onFlexibleDropOnBar({ sourceType: d.src, sourceId: d.sid, durationMinutes: d.dur }, ev.clientX, bar);
    } else if (d.mode === "bar" && _ioIsOver(zone, ev.clientX, ev.clientY, 8)) {
      _onTimelineUntime(d.src, d.sid);
    }
  }, true);
    try {
    window.__ioDbg = {
      ptr: function () { return _ioPtrDrag; },
      buf: function () { return _dashEditBuffer; },
      edit: function () { return _dashEditMode; }
    };
  } catch (e) {}
    /* 27.63: JS-driven tooltip */
  (function () {
    var tipEl = null;
    function ensureTip() {
      if (tipEl && document.body.contains(tipEl)) return tipEl;
      tipEl = document.createElement("div");
      tipEl.id = "io-timeline-tip";
      tipEl.className = "io-timeline-tip"; tipEl.setAttribute("role", "tooltip");
      tipEl.style.display = "none";
      document.body.appendChild(tipEl);
      return tipEl;
    }
    function showTip(target) {
      var text = target.getAttribute("data-tip");
      if (!text) return;
      var t = ensureTip();
      t.textContent = text;
      t.style.display = "block";
      t.style.top = "0px";
      t.style.left = "0px";
      var r = target.getBoundingClientRect();
      var tipRect = t.getBoundingClientRect();
      var top = r.top - tipRect.height - 10;
      var left = r.left + (r.width / 2) - (tipRect.width / 2);
      if (left < 8) left = 8;
      if (left + tipRect.width > window.innerWidth - 8) {
        left = window.innerWidth - tipRect.width - 8;
      }
      if (top < 8) top = r.bottom + 10;
      t.style.top = top + "px";
      t.style.left = left + "px";
      var catRGB = target.style.getPropertyValue("--cat-rgb") || "148, 163, 184";
      t.style.setProperty("--cat-rgb", catRGB);
    }
    function hideTip() {
      if (tipEl) tipEl.style.display = "none";
    }
    document.addEventListener("mouseover", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var item = t.closest("#dash-timeline .dt20-item[data-tip], .dash-daybar-block[data-tip]");
      if (item) showTip(item);
    }, true);
    document.addEventListener("mouseout", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var item = t.closest("#dash-timeline .dt20-item[data-tip], .dash-daybar-block[data-tip]");
      if (item) hideTip();
    }, true);
    document.addEventListener("focusin", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var item = t.closest("#dash-timeline .dt20-item[data-tip], .dash-daybar-block[data-tip]");
      if (item) showTip(item);
    }, true);
    document.addEventListener("focusout", function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var item = t.closest("#dash-timeline .dt20-item[data-tip], .dash-daybar-block[data-tip]");
      if (item) hideTip();
    }, true);
    window.addEventListener("scroll", hideTip, true);
    window.addEventListener("resize", hideTip, true);
  })();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();


/* boot-sync removed PATCH:phase-F7-noboot */
