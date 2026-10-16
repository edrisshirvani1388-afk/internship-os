/* Internship OS — F.6 Exercise UI v2 (external module)
   Exposes: R.workoutdbUI.open({ tab?, focusSearch? }) / .close()
   Depends on: window.__ioWdbBridge
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[workoutdb-ui] R missing"); return; }

  function need() { return window.__ioWdbBridge; }
  function esc(s) { var b = need(); if (b && b.escapeHtml) return b.escapeHtml(s); return String(s == null ? "" : s); }
  function fa0(n) { var b = need(); if (b && b.fa0) return b.fa0(n); return String(n); }
  function fa1(n) { var b = need(); if (b && b.fa1) return b.fa1(n); return String(n); }

  var CAT_ICONS = [
    { re: /بی[\s\u200C]*تحرک|کم[\s\u200C]*تحرک|نشسته|استراحت/, icon: "🛋️" },
    { re: /حمل|نقل|رانند|خودرو/, icon: "🚚" },
    { re: /تعمیر|ساخت|فنی|ابزار/, icon: "🔧" },
    { re: /دوچرخ/, icon: "🚴" },
    { re: /دویدن|دوی/, icon: "🏃" },
    { re: /پیاده|راه[\s\u200C]*رفت|قدم/, icon: "🚶" },
    { re: /شکار|تیر/, icon: "🏹" },
    { re: /خانگی|نظافت/, icon: "🧹" },
    { re: /مذهب|نیایش|عبادت|مسجد|نماز/, icon: "🕌" },
    { re: /ورزشی|اسپرت/, icon: "🏅" },
    { re: /مشاغل|شغل|کار[\s\u200C]*بدنی|کارگر/, icon: "💼" },
    { re: /موسیقی|ساز/, icon: "🎵" },
    { re: /شخصی|فردی/, icon: "👤" },
    { re: /متفرقه|متنوع|سایر/, icon: "✨" },
    { re: /هوازی|قلبی|کاردیو/, icon: "❤️" },
    { re: /قدرتی|بدنسازی|وزنه|مقاومت/, icon: "🏋️" },
    { re: /کشش|انعطاف|یوگا|پیلاتس/, icon: "🧘" },
    { re: /شنا/, icon: "🏊" },
    { re: /توپ|فوتبال|بسکتبال|والیبال/, icon: "⚽" },
    { re: /رزمی|بوکس|کاراته/, icon: "🥊" },
    { re: /رقص|ایروبیک/, icon: "💃" },
    { re: /اسکی|برف/, icon: "⛷️" },
    { re: /کوه|صعود/, icon: "⛰️" }
  ];
  function catIcon(name) {
    if (!name) return "🏋️";
    for (var i = 0; i < CAT_ICONS.length; i++) if (CAT_ICONS[i].re.test(name)) return CAT_ICONS[i].icon;
    return "🏋️";
  }

  var S = null;
  var _debTimer = null;

  function injectStyles() {
    if (document.getElementById("wdb-style")) return;
    var s = document.createElement("style");
    s.id = "wdb-style";
    s.textContent = [
      ".wdb-modal{border-radius:16px;overflow:hidden;background:#0f1621!important;border:1px solid rgba(56,189,248,.28);box-shadow:0 22px 60px rgba(0,0,0,.6)}",
      ".wdb-root .fdb-modal{background:#0f1621!important;backdrop-filter:none!important}",
      ".wdb-root.fdb-overlay{background:rgba(0,0,0,.92)!important;backdrop-filter:blur(4px)}",
      ".wdb-root .fdb-body{max-height:68vh;overflow-y:auto;overflow-x:hidden;padding:8px 14px 16px;scrollbar-width:thin}",
      ".wdb-root .fdb-body::-webkit-scrollbar{width:8px}",
      ".wdb-root .fdb-body::-webkit-scrollbar-thumb{background:rgba(56,189,248,.35);border-radius:4px}",
      ".wdb-root .fdb-modal{max-width:520px}",
      ".wdb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px 8px;position:relative;overflow:hidden}",
      ".wdb-head::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 20% 0%,rgba(56,189,248,.18),transparent 55%),radial-gradient(circle at 90% 100%,rgba(52,211,153,.14),transparent 55%);pointer-events:none}",
      ".wdb-hero{display:flex;align-items:center;gap:12px;position:relative;z-index:1}",
      ".wdb-hero-icon{font-size:30px;filter:drop-shadow(0 0 8px rgba(56,189,248,.6))}",
      ".wdb-hero-title{font-weight:800;font-size:17px;letter-spacing:.3px}",
      ".wdb-hero-sub{font-size:11px;opacity:.7;margin-top:1px}",
      ".wdb-close{font-size:24px;line-height:1;background:none;border:none;cursor:pointer;padding:4px 10px;color:inherit;position:relative;z-index:1}",
      ".wdb-close:hover{color:rgb(56,189,248)}",
      ".wdb-root .fdb-tabs{border-bottom:1px solid rgba(255,255,255,.06)}",
      ".wdb-root .fdb-tab.active{color:rgb(56,189,248);border-bottom-color:rgb(56,189,248)}",
      ".wdb-list{display:flex;flex-direction:column;gap:6px;padding:4px 2px}",
      ".wdb-item{display:flex;align-items:center;gap:10px;width:100%;text-align:right;background:linear-gradient(135deg,rgba(56,189,248,.06),rgba(56,189,248,.02));border:1px solid rgba(56,189,248,.18);border-radius:12px;padding:10px 12px;cursor:pointer;color:inherit;font:inherit;transition:transform .15s,box-shadow .15s,border-color .15s}",
      ".wdb-item:hover{transform:translateY(-1px);border-color:rgba(56,189,248,.5);box-shadow:0 4px 14px rgba(56,189,248,.15)}",
      ".wdb-item-icon{font-size:22px;flex-shrink:0}",
      ".wdb-item-body{flex:1;min-width:0}",
      ".wdb-item-title{font-weight:600;font-size:13px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".wdb-item-sub{font-size:11px;opacity:.7;margin-top:2px}",
      ".wdb-item-arrow{opacity:.4;font-size:18px}",
      ".wdb-cat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;padding:4px 2px}",
      ".wdb-cat{display:flex;flex-direction:column;align-items:center;gap:4px;background:linear-gradient(135deg,rgba(56,189,248,.1),rgba(52,211,153,.06));border:1px solid rgba(56,189,248,.22);border-radius:11px;padding:8px 4px;cursor:pointer;color:inherit;font:inherit;transition:transform .15s,box-shadow .15s}",
      ".wdb-cat:hover{transform:translateY(-2px);box-shadow:0 6px 18px rgba(56,189,248,.2);border-color:rgba(56,189,248,.5)}",
      ".wdb-cat-icon{font-size:20px}",
      ".wdb-cat-title{font-size:10.5px;font-weight:600;text-align:center;line-height:1.2;overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;word-break:break-word}",
      ".wdb-cat-count{font-size:9px;opacity:.6;background:rgba(56,189,248,.15);padding:1px 8px;border-radius:8px}",
      ".wdb-meta-row{display:flex;gap:8px;margin:10px 4px}",
      ".wdb-meta{flex:1;background:linear-gradient(135deg,rgba(56,189,248,.08),rgba(56,189,248,.02));padding:10px 8px;border-radius:12px;text-align:center;border:1px solid rgba(56,189,248,.15)}",
      ".wdb-meta-k{display:block;font-size:10px;opacity:.7;letter-spacing:.3px}",
      ".wdb-meta-v{display:block;font-weight:800;font-size:16px;margin-top:3px;color:rgb(56,189,248)}",
      ".wdb-inputs{display:flex;gap:8px;margin:10px 4px}",
      ".wdb-inputs .fdb-field{flex:1}",
      ".wdb-kcal-card{position:relative;overflow:hidden;background:linear-gradient(135deg,rgba(56,189,248,.16),rgba(52,211,153,.12));border:1px solid rgba(56,189,248,.35);border-radius:16px;padding:18px 14px;text-align:center;margin:12px 4px;animation:wdbPop .28s cubic-bezier(.2,.9,.3,1.2)}",
      ".wdb-kcal-card::before{content:'';position:absolute;inset:0;background-image:radial-gradient(rgba(255,255,255,.08) 1px,transparent 1px);background-size:14px 14px;mask-image:radial-gradient(circle at 50% 0%,#000,transparent 70%);opacity:.6}",
      ".wdb-kcal-label{font-size:11px;opacity:.8;letter-spacing:1px;position:relative}",
      ".wdb-kcal-big{font-size:38px;font-weight:900;margin:6px 0;color:rgb(56,189,248);text-shadow:0 0 18px rgba(56,189,248,.45);position:relative}",
      ".wdb-kcal-u{font-size:12px;font-weight:400;opacity:.75;margin-right:8px;text-shadow:none}",
      ".wdb-kcal-note{font-size:10px;opacity:.55;direction:ltr;position:relative}",
      ".wdb-missing{background:rgba(251,191,36,.15);border:1px solid rgba(251,191,36,.4);padding:10px 12px;border-radius:10px;font-size:12px;margin:8px 4px}",
      ".wdb-actions{display:flex;gap:8px;margin-top:14px;padding:0 4px 4px}",
      ".wdb-actions .btn{flex:1;padding:11px;font-weight:700}",
      ".wdb-actions .btn-primary{background:linear-gradient(135deg,rgb(56,189,248),rgb(52,211,153));border:none;color:#001824;text-shadow:none;box-shadow:0 4px 14px rgba(56,189,248,.35)}",
      ".wdb-actions .btn-primary:disabled{opacity:.4;box-shadow:none;cursor:not-allowed}",
      ".wdb-detail-head{margin:4px 4px 6px}",
      ".wdb-detail-title{font-size:18px;font-weight:800;margin-top:8px}",
      ".wdb-detail-cat{font-size:12px;opacity:.7;margin-top:2px}",
      ".wdb-root .fdb-back{background:rgba(56,189,248,.1);border:1px solid rgba(56,189,248,.3);border-radius:8px;color:inherit;padding:5px 12px;font:inherit;cursor:pointer;font-size:12px}",
      ".wdb-hist-row{display:flex;align-items:center;gap:8px;width:100%}",
      ".wdb-hist-info{flex:1;text-align:right;min-width:0}",
      ".wdb-hist-acts{display:flex;gap:2px;flex-shrink:0}",
      ".wdb-hist-acts .wdb-act{background:rgba(56,189,248,.08);border:1px solid rgba(56,189,248,.2);cursor:pointer;font-size:13px;padding:6px 9px;border-radius:8px;color:inherit;transition:transform .12s}",
      ".wdb-hist-acts .wdb-act:hover{transform:scale(1.08);background:rgba(56,189,248,.2)}",
      "@keyframes wdbPop{0%{transform:scale(.92);opacity:0}100%{transform:scale(1);opacity:1}}",
      "@keyframes wdbFadeIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}",
      ".wdb-item,.wdb-cat,.wdb-hist-item{animation:wdbFadeIn .22s ease}",
      ".wdb-empty{text-align:center;opacity:.6;font-size:13px;padding:24px 12px;direction:rtl}"
    ].join("\n");
    document.head.appendChild(s);
  }

  function ensureOverlay() {
    injectStyles();
    var el = document.getElementById("wdb-overlay");
    if (el) return el;
    el = document.createElement("div");
    el.id = "wdb-overlay";
    el.className = "fdb-overlay wdb-root";
    el.innerHTML = '<div class="fdb-modal wdb-modal">' +
      '<div id="wdb-head-host"></div>' +
      '<div class="fdb-tabs" id="wdb-tabs"></div>' +
      '<div class="fdb-body" id="wdb-body"></div>' +
      '</div>';
    document.body.appendChild(el);
    el.addEventListener("click", onOverlayClick);
    el.addEventListener("input", onOverlayInput);
    return el;
  }

  function close() {
    var el = document.getElementById("wdb-overlay");
    if (el && el.parentNode) el.parentNode.removeChild(el);
    S = null;
  }

  function viewDate() { /* PATCH:phase-F6-woDate3 */
    var b = need();
    if (b && typeof b.workoutDate === "function") {
      try { var dw = b.workoutDate(); if (dw) return dw; } catch (e) {}
    }
    if (b && typeof b.nutritionDate === "function") {
      try { var dn = b.nutritionDate(); if (dn) return dn; } catch (e) {}
    }
    if (b && typeof b.todayJalali === "function") {
      try { return b.todayJalali(); } catch (e) {}
    }
    return null;
  }

  function bodyWeight() {
    var b = need();
    if (!b) return null;
    if (typeof b.lastBodyWeight === "function") {
      try { var w = b.lastBodyWeight(); if (w != null && isFinite(w)) return w; } catch (e) {}
    }
    return null;
  }

  function estimateKcal(met, kg, minutes) {
    if (met == null || kg == null || minutes == null) return null;
    if (!isFinite(met) || !isFinite(kg) || !isFinite(minutes)) return null;
    if (met <= 0 || kg <= 0 || minutes <= 0) return null;
    return met * 3.5 * kg / 200 * minutes;
  }
  function fmtRound(n) { if (n == null || !isFinite(n)) return null; return Math.round(n); }

  function loadCategories() {
    fetch("/api/fooddb/exercise-categories")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!S) return;
        if (Array.isArray(d)) S.categories = d;
        else if (d && Array.isArray(d.results)) S.categories = d.results;
        else if (d && Array.isArray(d.categories)) S.categories = d.categories;
        else if (d && Array.isArray(d.items)) S.categories = d.items;
        else S.categories = [];
        try { console.log("[wdb] exercise-categories:", S.categories); } catch (e) {}
        if (S.tab === "cat") render();
      })
      .catch(function (e) {
        if (!S) return;
        S.categories = [];
        try { console.warn("[wdb] categories error:", e); } catch (x) {}
        if (S.tab === "cat") render();
      });
  }

  function loadHistory() {
    var st = window.INTERNSHIP_STATE;
    var h = (st && st.health && Array.isArray(st.health.workoutLog)) ? st.health.workoutLog : [];
    if (!S) return;
    S.history = h.slice().sort(function (a, b) {
      return (a.date < b.date) ? 1 : (a.date > b.date ? -1 : 0);
    });
  }

  function runSearch() {
    if (!S) return;
    var q = (S.query || "").trim();
    if (!q) { S.results = []; S.error = null; S.loading = false; updateResultsHost(); return; }
    S.loading = true; S.error = null; S.reqId++;
    var myReq = S.reqId;
    updateResultsHost();
    fetch("/api/fooddb/exercises?q=" + encodeURIComponent(q) + "&limit=20")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!S || S.reqId !== myReq) return;
        S.results = d.results || []; S.loading = false; S.error = null;
        updateResultsHost();
      })
      .catch(function () {
        if (!S || S.reqId !== myReq) return;
        S.results = []; S.loading = false; S.error = "خطا در دریافت نتایج.";
        updateResultsHost();
      });
  }

  function loadByCategory(catId) {
    if (!S) return;
    S.loading = true; S.error = null; S.reqId++;
    var myReq = S.reqId;
    render();
    fetch("/api/fooddb/exercises?categoryId=" + encodeURIComponent(catId) + "&limit=50")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!S || S.reqId !== myReq) return;
        S.results = d.results || []; S.loading = false;
        render();
      })
      .catch(function () {
        if (!S || S.reqId !== myReq) return;
        S.results = []; S.loading = false; S.error = "خطا در دریافت نتایج.";
        render();
      });
  }

  function openDetail(id) {
    if (!S) return;
    S.loading = true; S.error = null; S._editingId = null;
    render();
    fetch("/api/fooddb/exercises/" + id)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (!S) return;
        S.loading = false; S.selected = d;
        var w = bodyWeight();
        S.weightOverride = (w != null && isFinite(w)) ? String(w) : "";
        render();
      })
      .catch(function () {
        if (!S) return;
        S.loading = false; S.error = "خطا در دریافت جزئیات.";
        render();
      });
  }

  function headerHTML() {
    return '<div class="wdb-head">' +
      '<div class="wdb-hero"><span class="wdb-hero-icon">🏋️</span>' +
      '<div class="wdb-hero-body"><div class="wdb-hero-title">ورزش</div>' +
      '<div class="wdb-hero-sub">جستجو · تخمین کالری · ثبت جلسه</div></div></div>' +
      '<button type="button" class="wdb-close" data-wdb-close="1">×</button>' +
      '</div>';
  }

  function tabsHTML() {
    var tabs = [
      { id: "search",  label: "🔍 جستجو" },
      { id: "cat",     label: "📂 دسته‌ها" },
      { id: "history", label: "📜 تاریخچه" }
    ];
    return tabs.map(function (t) {
      return '<button type="button" class="fdb-tab' + (S.tab === t.id ? ' active' : '') + '" data-wdb-tab="' + t.id + '">' + t.label + '</button>';
    }).join('');
  }

  function resultsHTML() {
    if (S.loading) return '<div class="wdb-empty">در حال جستجو…</div>';
    if (S.error) return '<div class="wdb-empty" style="color:#f87171">' + esc(S.error) + '</div>';
    if (!S.results.length) {
      if ((S.query || "").trim()) return '<div class="wdb-empty">نتیجه‌ای یافت نشد.</div>';
      return '<div class="wdb-empty">نام تمرین را تایپ کن.</div>';
    }
    var h = '<div class="wdb-list">';
    S.results.forEach(function (r) {
      var metTxt = (r.met != null) ? fa1(r.met) : '—';
      var ico = catIcon(r.categoryName || r.name || '');
      h += '<button type="button" class="wdb-item" data-wdb-open="' + r.id + '">' +
        '<div class="wdb-item-icon">' + ico + '</div>' +
        '<div class="wdb-item-body">' +
          '<div class="wdb-item-title">' + esc(r.name) + '</div>' +
          '<div class="wdb-item-sub">شدت ' + metTxt + (r.categoryName ? ' · ' + esc(r.categoryName) : '') + '</div>' +
        '</div>' +
        '<div class="wdb-item-arrow">›</div>' +
      '</button>';
    });
    h += '</div>';
    return h;
  }

  function catGridHTML() {
    if (!S.categories.length) {
      if (S.loading) return '<div class="wdb-empty">در حال بارگذاری…</div>';
      return '<div class="wdb-empty">دسته‌ای موجود نیست.</div>';
    }
    var h = '<div class="wdb-cat-grid">';
    S.categories.forEach(function (c) {
      var ico = catIcon(c.name || '');
      h += '<button type="button" class="wdb-cat" data-wdb-cat="' + c.id + '">' +
        '<span class="wdb-cat-icon">' + ico + '</span>' +
        '<span class="wdb-cat-title">' + esc(c.name) + '</span>' +
        (c.count != null ? '<span class="wdb-cat-count">' + fa0(c.count) + '</span>' : '') +
      '</button>';
    });
    h += '</div>';
    if (S.loading) h += '<div class="wdb-empty">در حال بارگذاری…</div>';
    else if (S.results.length > 0) {
      h += '<div class="wdb-list">';
      S.results.forEach(function (r) {
        var ico = catIcon(r.categoryName || r.name || '');
        h += '<button type="button" class="wdb-item" data-wdb-open="' + r.id + '">' +
          '<div class="wdb-item-icon">' + ico + '</div>' +
          '<div class="wdb-item-body">' +
            '<div class="wdb-item-title">' + esc(r.name) + '</div>' +
            '<div class="wdb-item-sub">شدت ' + (r.met != null ? fa1(r.met) : '—') + '</div>' +
          '</div>' +
          '<div class="wdb-item-arrow">›</div>' +
        '</button>';
      });
      h += '</div>';
    }
    return h;
  }

  function historyViewHTML() {
    if (!S.history.length) return '<div class="wdb-empty">هنوز جلسه‌ای ثبت نشده.</div>';
    var h = '<div class="wdb-list">';
    S.history.slice(0, 100).forEach(function (e) {
      var sn = e.snapshot || {};
      var ico = catIcon(sn.categoryName || sn.name || '');
      h += '<div class="wdb-item" style="cursor:default">' +
        '<div class="wdb-item-icon">' + ico + '</div>' +
        '<div class="wdb-item-body">' +
          '<div class="wdb-item-title">' + esc(sn.name || "ورزش") + '</div>' +
          '<div class="wdb-item-sub">' + esc(e.date || "") + ' · ' + fa0(e.durationMinutes || 0) + ' دقیقه · ' + fa0(e.kcalEstimated || 0) + ' کالری</div>' +
        '</div>' +
        '<div class="wdb-hist-acts">' +
          '<button type="button" class="wdb-act" data-wdb-edit="' + esc(e.id) + '">✏️</button>' +
          '<button type="button" class="wdb-act" data-wdb-del="' + esc(e.id) + '">🗑</button>' +
        '</div>' +
      '</div>';
    });
    h += '</div>';
    return h;
  }

  function detailViewHTML() {
    if (!S.selected) return '';
    var x = S.selected;
    var met = (typeof x.met === "number" && x.met > 0) ? x.met : null;
    var kg = parseFloat(S.weightOverride);
    if (!isFinite(kg) || kg <= 0) kg = null;
    var dur = parseFloat(S.durationMinutes);
    if (!isFinite(dur) || dur <= 0) dur = null;
    var kcal = fmtRound(estimateKcal(met, kg, dur));
    var ico = catIcon(x.categoryName || x.name || '');

    var h = '';
    h += '<div class="wdb-detail-head">' +
      '<button type="button" class="fdb-back" data-wdb-back="1">→ بازگشت</button>' +
      '<div class="wdb-detail-title">' + ico + ' ' + esc(x.name) + '</div>' +
      (x.categoryName ? '<div class="wdb-detail-cat">' + esc(x.categoryName) + '</div>' : '') +
      '</div>';

    h += '<div class="wdb-meta-row">' +
      '<div class="wdb-meta"><span class="wdb-meta-k">شدت</span><span class="wdb-meta-v">' + (met != null ? fa1(met) : '—') + '</span></div>' +
      '<div class="wdb-meta"><span class="wdb-meta-k">وزن</span><span class="wdb-meta-v">' + (kg != null ? fa1(kg) : '—') + '</span></div>' +
      '<div class="wdb-meta"><span class="wdb-meta-k">مدت</span><span class="wdb-meta-v">' + (dur != null ? fa0(dur) : '—') + '</span></div>' +
      '</div>';

    h += '<div class="wdb-inputs">' +
      '<label class="fdb-field"><span>مدت (دقیقه)</span><input type="number" min="1" max="600" step="1" class="health-input" id="wdb-dur" value="' + esc(String(S.durationMinutes || 30)) + '"></label>' +
      '<label class="fdb-field"><span>وزن (kg)</span><input type="number" min="20" max="300" step="0.1" class="health-input" id="wdb-kg" value="' + esc(S.weightOverride || '') + '" placeholder="از پروفایل"></label>' +
      '</div>';

    h += '<div class="wdb-kcal-card">' +
      '<div class="wdb-kcal-label">تخمینی</div>' +
      '<div class="wdb-kcal-big">' + (kcal != null ? fa0(kcal) : '—') + '<span class="wdb-kcal-u">کالری</span></div>' +
      '<div class="wdb-kcal-note">برآورد از شدت × وزن × مدت</div>' +
      '</div>';

    var missing = [];
    if (met == null) missing.push("MET");
    if (kg == null) missing.push("وزن");
    if (dur == null) missing.push("مدت");
    if (missing.length) {
      h += '<div class="wdb-missing">برای تخمین وارد کن: ' + esc(missing.join('، ')) + '</div>';
    }

    h += '<div class="wdb-actions">' +
      '<button type="button" class="btn btn-primary" data-wdb-log="1"' + (kcal == null ? ' disabled' : '') + '>' + (S._editingId ? 'به‌روزرسانی جلسه' : 'ثبت جلسه') + '</button>' +
      '</div>';

    return h;
  }

  function render() {
    var el = document.getElementById("wdb-overlay");
    if (!el || !S) return;

    var hh = document.getElementById("wdb-head-host");
    if (hh) hh.innerHTML = headerHTML();

    var tabs = document.getElementById("wdb-tabs");
    if (tabs) {
      if (S.selected) { tabs.style.display = "none"; }
      else { tabs.style.display = ""; tabs.innerHTML = tabsHTML(); }
    }

    var body = document.getElementById("wdb-body");
    if (!body) return;

    if (S.selected) { body.innerHTML = detailViewHTML(); return; }

    if (S.tab === "search") {
      var shell = document.getElementById("wdb-search-shell");
      if (!shell) {
        body.innerHTML =
          '<div id="wdb-search-shell">' +
            '<div class="fdb-search-wrap">' +
              '<input type="text" id="wdb-q" class="health-input fdb-search" placeholder="نام تمرین…" value="' + esc(S.query || "") + '">' +
            '</div>' +
            '<div id="wdb-results-host"></div>' +
          '</div>';
      }
      updateResultsHost();
      return;
    }

    if (S.tab === "cat") { body.innerHTML = catGridHTML(); return; }
    if (S.tab === "history") { body.innerHTML = historyViewHTML(); return; }
  }

  function updateResultsHost() {
    var host = document.getElementById("wdb-results-host");
    if (!host) return;
    host.innerHTML = resultsHTML();
  }

  function softRefreshKcal() {
    if (!S || !S.selected) return;
    var met = (typeof S.selected.met === "number" && S.selected.met > 0) ? S.selected.met : null;
    var kg = parseFloat(S.weightOverride);
    if (!isFinite(kg) || kg <= 0) kg = null;
    var dur = parseFloat(S.durationMinutes);
    if (!isFinite(dur) || dur <= 0) dur = null;
    var kcal = fmtRound(estimateKcal(met, kg, dur));
    var big = document.querySelector("#wdb-overlay .wdb-kcal-big");
    if (big) big.innerHTML = (kcal != null ? fa0(kcal) : '—') + '<span class="wdb-kcal-u">کالری</span>';
    var btn = document.querySelector('#wdb-overlay [data-wdb-log]');
    if (btn) btn.disabled = (kcal == null);
    var meta = document.querySelectorAll('#wdb-overlay .wdb-meta-v');
    if (meta && meta.length >= 3) {
      meta[1].textContent = (kg != null ? fa1(kg) : '—');
      meta[2].textContent = (dur != null ? fa0(dur) : '—');
    }
  }

  function logSelected() {
    if (!S || !S.selected) return;
    var x = S.selected;
    var met = (typeof x.met === "number" && x.met > 0) ? x.met : null;
    var kg = parseFloat(S.weightOverride);
    if (!isFinite(kg) || kg <= 0) kg = null;
    var dur = parseFloat(S.durationMinutes);
    if (!isFinite(dur) || dur <= 0) dur = null;
    var kcal = fmtRound(estimateKcal(met, kg, dur));
    if (kcal == null) {
      if (need()) need().notify("error", "برای تخمین، MET، وزن و مدت لازم است.");
      return;
    }
    var date = viewDate();
    if (!date) { if (need()) need().notify("error", "تاریخ نامعتبر."); return; }

    var st = window.INTERNSHIP_STATE;
    if (need() && need().healthEnsure) need().healthEnsure(st);
    if (!Array.isArray(st.health.workoutLog)) st.health.workoutLog = [];

    var snap = { name: x.name || "", categoryName: x.categoryName || null, met: met };

    if (S._editingId) {
      var found = null;
      for (var i = 0; i < st.health.workoutLog.length; i++) {
        if (st.health.workoutLog[i].id === S._editingId) { found = st.health.workoutLog[i]; break; }
      }
      if (found) {
        found.dbExerciseId = (x.id != null ? x.id : found.dbExerciseId);
        found.snapshot = snap;
        found.durationMinutes = dur;
        found.weightKg = kg;
        found.kcalEstimated = kcal;
        found.updatedAt = Date.now();
        if (need().save) need().save();
        if (need().notify) need().notify("success", "جلسه به‌روزرسانی شد.");
      }
    } else {
      var entry = {
        id: "wl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6),
        date: date,
        dbExerciseId: (x.id != null ? x.id : null),
        snapshot: snap,
        durationMinutes: dur,
        weightKg: kg,
        kcalEstimated: kcal,
        formula: "gross-met-3.5",
        createdAt: Date.now()
      };
      st.health.workoutLog.push(entry);
      if (need().save) need().save();
      if (need().notify) need().notify("success", "«" + (x.name || "ورزش") + "» ثبت شد.");
    }

    S.selected = null; S._editingId = null; S.tab = "history";
    loadHistory();
    render();
    if (need().render) need().render("body");
  }

  function deleteEntry(id) {
    var st = window.INTERNSHIP_STATE;
    if (!st || !st.health || !Array.isArray(st.health.workoutLog)) return;
    st.health.workoutLog = st.health.workoutLog.filter(function (e) { return e.id !== id; });
    if (need().save) need().save();
    if (need().notify) need().notify("success", "جلسه حذف شد.");
    loadHistory();
    render();
    if (need().render) need().render("body");
  }

  function editEntry(id) {
    var st = window.INTERNSHIP_STATE;
    if (!st || !st.health || !Array.isArray(st.health.workoutLog)) return;
    var entry = null;
    for (var i = 0; i < st.health.workoutLog.length; i++) {
      if (st.health.workoutLog[i].id === id) { entry = st.health.workoutLog[i]; break; }
    }
    if (!entry) return;
    var sn = entry.snapshot || {};
    S.selected = {
      id: entry.dbExerciseId,
      name: sn.name || "ورزش",
      categoryName: sn.categoryName || null,
      met: sn.met
    };
    S.durationMinutes = entry.durationMinutes;
    S.weightOverride = String(entry.weightKg);
    S._editingId = id;
    render();
  }

  function onOverlayInput(e) {
    var t = e.target;
    if (!t || !t.id || !S) return;
    if (t.id === "wdb-q") {
      S.query = t.value;
      if (_debTimer) clearTimeout(_debTimer);
      _debTimer = setTimeout(runSearch, 300);
      return;
    }
    if (t.id === "wdb-dur") {
      S.durationMinutes = parseFloat(t.value) || 0;
      softRefreshKcal();
      return;
    }
    if (t.id === "wdb-kg") {
      S.weightOverride = t.value;
      softRefreshKcal();
      return;
    }
  }

  function onOverlayClick(e) {
    var t = e.target;
    if (!t || !t.closest || !S) return;
    var el;

    el = t.closest("[data-wdb-close]");
    if (el) { close(); return; }

    el = t.closest("[data-wdb-tab]");
    if (el) {
      S.tab = el.getAttribute("data-wdb-tab");
      S.selected = null; S._editingId = null;
      if (S.tab === "cat") { S.results = []; loadCategories(); }
      if (S.tab === "history") { loadHistory(); }
      render();
      return;
    }

    el = t.closest("[data-wdb-back]");
    if (el) { S.selected = null; S._editingId = null; render(); return; }

    el = t.closest("[data-wdb-open]");
    if (el) { openDetail(el.getAttribute("data-wdb-open")); return; }

    el = t.closest("[data-wdb-cat]");
    if (el) { loadByCategory(el.getAttribute("data-wdb-cat")); return; }

    el = t.closest("[data-wdb-log]");
    if (el) { logSelected(); return; }

    el = t.closest("[data-wdb-del]");
    if (el) { deleteEntry(el.getAttribute("data-wdb-del")); return; }

    el = t.closest("[data-wdb-edit]");
    if (el) { editEntry(el.getAttribute("data-wdb-edit")); return; }
  }

  function open(opts) {
    opts = opts || {};
    ensureOverlay();
    S = {
      tab: opts.tab || "search",
      query: "",
      loading: false,
      error: null,
      results: [],
      categories: [],
      reqId: 0,
      selected: null,
      durationMinutes: 30,
      weightOverride: "",
      history: [],
      _editingId: null
    };
    loadCategories();
    loadHistory();
    render();
    if (opts.focusSearch) {
      setTimeout(function () {
        var inp = document.getElementById("wdb-q");
        if (inp) inp.focus();
      }, 60);
    }
  }

  R.workoutdbUI = { open: open, close: close, _catIcon: catIcon };
  try { console.log("[workoutdb-ui] loaded v3 /* PATCH:phase-F6-v3 */"); } catch (e) {}
})();