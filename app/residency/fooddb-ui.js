/* Internship OS — Food.db UI (Phase F.3)
   Tabs: search / categories / favorites / custom.
   No full-modal refresh during typing; targeted results update.
*/
(function () {
  "use strict";
  var R = window.InternshipResidency = window.InternshipResidency || {};

  function B() { return window.__ioFdbBridge; }
  function need() { var b = B(); if (!b) throw new Error("bridge missing"); return b; }
  function esc(s) { return need().escapeHtml(s); }
  function viewDate() { try { return window.__ioNutritionDate ? window.__ioNutritionDate() : need().todayJalali(); } catch (e) { return need().todayJalali(); } }
  function fa0(n) { return need().fa0(n); }
  function fa1(n) { return need().fa1(n); }
  function mealLabel(id) {
    var ms = need().meals || [];
    for (var i = 0; i < ms.length; i++) if (ms[i][0] === id) return ms[i][1];
    return id;
  }
  function persian(s) { return fa0(s); }

  /* Category icon map (by Persian name) */
  var CAT_ICONS = {
    "غذاهای ایرانی": "🍲",
    "غذاهای فرنگی": "🍝",
    "میوه ها": "🍎",
    "سبزیجات": "🥬",
    "لبنیات": "🥛",
    "گوشت و پروتئین": "🥩",
    "غلات و حبوبات": "🌾",
    "ادویه و چاشنی": "🧂",
    "خشکبار و آجیل": "🥜",
    "کمپوت و کنسرو": "🥫",
    "رب و سس و روغن": "🫒",
    "مربا و عسل": "🍯",
    "شیرینی و دسر": "🍰",
    "ترشیجات": "🥒",
    "سالاد": "🥗",
    "نوشیدنی": "🥤",
    "تنقلات": "🍿",
    "مکمل": "💊",
    "غذای آماده و منجمد": "🧊",
    "فست فود": "🍔"
  };
  function catIcon(name) { return CAT_ICONS[name] || "🍽️"; }

  var S = null;
  var timer = null;
  var reqId = 0;
  var catReqId = 0;

  function open(mealId) {
    S = {
      meal: mealId, tab: "search",
      q: "", results: [], loading: false, error: null,
      selected: null, unitId: 0, unitCount: 1, grams: 100,
      favQ: "",
      cats: null, activeCat: null, catFoods: [], catLoading: false,
      cName: "", cKcal: "", cP: "", cC: "", cF: "", cGrams: 100
    };
    renderAll();
  }
  function close() {
    var ov = document.getElementById("fdb-overlay");
    if (ov && ov.parentNode) ov.parentNode.removeChild(ov);
    if (timer) { clearTimeout(timer); timer = null; }
    S = null;
  }
  R.fooddbUI = { open: open, close: close };

  function overlay() {
    var ov = document.getElementById("fdb-overlay");
    if (ov) return ov;
    ov = document.createElement("div");
    ov.id = "fdb-overlay";
    ov.className = "fdb-overlay";
    document.body.appendChild(ov);
    ov.addEventListener("click", onClick);
    ov.addEventListener("input", onInput);
    ov.addEventListener("change", onInput);
    return ov;
  }

  function renderAll() {
    if (!S) return;
    var ov = overlay();
    var aId = document.activeElement ? document.activeElement.id : null;
    var s0 = null, s1 = null;
    if (aId && document.activeElement && document.activeElement.setSelectionRange) {
      try { s0 = document.activeElement.selectionStart; s1 = document.activeElement.selectionEnd; } catch (x) {}
    }
    ov.innerHTML = '<div class="fdb-modal" role="dialog" aria-modal="true">' + body() + '</div>';
    if (aId) {
      var el = document.getElementById(aId);
      if (el) { try { el.focus(); if (s0 != null && el.setSelectionRange) el.setSelectionRange(s0, s1); } catch (x) {} }
    }
  }

  function body() {
    if (S.selected) return detailHTML();
    var h = headHTML();
    h += '<div class="fdb-tabs">';
    h += tab("search", "🔍", "جست‌وجو");
    h += tab("cat",    "📂", "دسته‌بندی");
    h += tab("fav",    "⭐", "علاقه‌ها");
    h += tab("custom", "✏️", "دستی");
    h += '</div>';
    if (S.tab === "search") h += searchHTML();
    else if (S.tab === "cat") h += catHTML();
    else if (S.tab === "fav") h += favHTML();
    else h += customHTML();
    return h;
  }
  function tab(id, icon, label) {
    return '<button class="fdb-tab' + (S.tab === id ? " is-active" : "") + '" type="button" data-fdb-tab="' + id + '"><span class="fdb-tab-ic">' + icon + '</span><span>' + label + '</span></button>';
  }
  function headHTML() {
    return '<div class="fdb-head"><span class="fdb-title">افزودن به ' + esc(mealLabel(S.meal)) + '</span>' +
      '<button class="fdb-x" type="button" data-fdb-close>✕</button></div>';
  }

  /* ---------- search ---------- */
  function searchHTML() {
    return '<div class="fdb-search-wrap">' +
      '<input type="text" class="fdb-search-input" id="fdb-q" placeholder="جست‌وجو... مثلاً برنج، مرغ، نان" value="' + esc(S.q) + '">' +
      '<span class="fdb-search-icon">🔍</span>' +
      '</div>' +
      '<div id="fdb-results-wrap">' + resultsHTML() + '</div>';
  }
  function resultsHTML() {
    if (S.error) return '<div class="fdb-error">' + esc(S.error) + '</div>';
    if (S.loading) return '<div class="fdb-loading">در حال جست‌وجو...</div>';
    if (!S.q) return '<div class="fdb-empty">شروع به تایپ کن. مثلاً: برنج، مرغ، نان</div>';
    if (!S.results.length) return '<div class="fdb-empty">نتیجه‌ای پیدا نشد.</div>';
    var h = '<ul class="fdb-results">';
    for (var i = 0; i < S.results.length; i++) {
      var r = S.results[i];
      var kcalStr = (r.kcalPer100g == null) ? "—" : fa0(r.kcalPer100g);
      h += '<li class="fdb-result-item" data-fdb-pick="' + r.id + '">' +
        '<div class="fdb-result-main"><span class="fdb-result-name">' + esc(r.name) + '</span>' +
        (r.categoryName ? '<span class="fdb-result-cat">' + esc(r.categoryName) + '</span>' : '') +
        '</div><span class="fdb-result-kcal">' + kcalStr + ' کالری / ۱۰۰گرم</span></li>';
    }
    h += '</ul>';
    return h;
  }
  function updateResults() {
    var box = document.getElementById("fdb-results-wrap");
    if (box) box.innerHTML = resultsHTML();
  }

  /* ---------- categories ---------- */
  function catHTML() {
    if (!S.cats) { loadCategories(); return '<div class="fdb-loading">در حال بارگذاری...</div>'; }
    if (S.activeCat != null) return catFoodsHTML();
    var h = '<div class="fdb-cat-grid">';
    for (var i = 0; i < S.cats.length; i++) {
      var cat = S.cats[i];
      h += '<button class="fdb-cat-card" type="button" data-fdb-cat="' + cat.id + '">' +
        '<span class="fdb-cat-ic">' + catIcon(cat.name) + '</span>' +
        '<span class="fdb-cat-name">' + esc(cat.name) + '</span>' +
        '<span class="fdb-cat-cnt">' + fa0(cat.count) + '</span>' +
        '</button>';
    }
    h += '</div>';
    return h;
  }
  function catFoodsHTML() {
    var catName = "";
    for (var i = 0; i < S.cats.length; i++) if (S.cats[i].id === S.activeCat) catName = S.cats[i].name;
    var h = '<div class="fdb-cat-head">';
    h += '<button class="fdb-back-sm" type="button" data-fdb-cat-back>‹ بازگشت</button>';
    h += '<span class="fdb-cat-head-name">' + catIcon(catName) + ' ' + esc(catName) + '</span>';
    h += '</div>';
    if (S.catLoading) return h + '<div class="fdb-loading">در حال بارگذاری...</div>';
    if (!S.catFoods.length) return h + '<div class="fdb-empty">غذایی در این دسته نیست.</div>';
    h += '<ul class="fdb-results">';
    for (var k = 0; k < S.catFoods.length; k++) {
      var r = S.catFoods[k];
      var kcalStr = (r.kcalPer100g == null) ? "—" : fa0(r.kcalPer100g);
      h += '<li class="fdb-result-item" data-fdb-pick="' + r.id + '">' +
        '<div class="fdb-result-main"><span class="fdb-result-name">' + esc(r.name) + '</span>' +
        (r.categoryName ? '<span class="fdb-result-cat">' + esc(r.categoryName) + '</span>' : '') +
        '</div><span class="fdb-result-kcal">' + kcalStr + ' کالری / ۱۰۰گرم</span></li>';
    }
    h += '</ul>';
    return h;
  }
  function loadCategories() {
    if (S.cats) return;
    fetch("/api/fooddb/categories")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) { if (!S) return; S.cats = d.categories || []; renderAll(); })
      .catch(function () { if (!S) return; S.error = "خطا در بارگذاری دسته‌ها."; renderAll(); });
  }
  function openCategory(id) {
    S.activeCat = id; S.catFoods = []; S.catLoading = true; renderAll();
    var my = ++catReqId;
    fetch("/api/fooddb/foods?categoryId=" + id + "&limit=50")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (my !== catReqId || !S) return;
        S.catLoading = false; S.catFoods = d.results || []; renderAll();
      })
      .catch(function () {
        if (my !== catReqId || !S) return;
        S.catLoading = false; S.catFoods = []; renderAll();
      });
  }

  /* ---------- favorites ---------- */
  function favList() {
    var h = need().healthEnsure(need().state());
    if (!Array.isArray(h.favoriteFoods)) h.favoriteFoods = [];
    return h.favoriteFoods;
  }
  function favHTML() {
    var list = favList();
    if (!list.length) return '<div class="fdb-empty">هنوز غذای مورد علاقه‌ای نداری.<br>در صفحه جزئیات غذا ⭐ بزن.</div>';
    var q = (S.favQ || "").toLowerCase();
    var filtered = list.filter(function (f) { return !q || (f.name || "").toLowerCase().indexOf(q) !== -1; });
    var h = '<div class="fdb-search-wrap"><input type="text" class="fdb-search-input" id="fdb-fav-q" placeholder="جست‌وجو در علاقه‌ها" value="' + esc(S.favQ) + '"><span class="fdb-search-icon">🔍</span></div>';
    if (!filtered.length) return h + '<div class="fdb-empty">موردی پیدا نشد.</div>';
    h += '<ul class="fdb-results">';
    for (var i = 0; i < filtered.length; i++) {
      var f = filtered[i];
      var kcalStr = (typeof f.kcal === "number") ? fa0(f.kcal) + ' کالری / ۱۰۰گرم' : '—';
      h += '<li class="fdb-result-item"><div class="fdb-result-main" data-fdb-pick="' + f.dbFoodId + '"><span class="fdb-result-name">' + esc(f.name) + '</span><span class="fdb-result-cat">' + kcalStr + '</span></div><button class="fdb-fav-del" type="button" data-fdb-fav-del="' + f.dbFoodId + '">✕</button></li>';
    }
    h += '</ul>';
    return h;
  }
  function removeFav(id) {
    var list = favList();
    for (var k = 0; k < list.length; k++) if (list[k].dbFoodId === id) { list.splice(k, 1); break; }
    need().save(); renderAll();
  }

  /* ---------- custom ---------- */
  function customHTML() {
    return '<div class="fdb-custom">' +
      '<label class="fdb-field"><span>نام غذا</span><input type="text" class="health-input" id="fdb-c-name" value="' + esc(S.cName) + '" placeholder="مثلاً نان خانگی"></label>' +
      '<div class="fdb-custom-grid">' +
      '<label class="fdb-field"><span>کالری / ۱۰۰گرم</span><input type="number" step="0.1" min="0" class="health-input" id="fdb-c-kcal" value="' + S.cKcal + '"></label>' +
      '<label class="fdb-field"><span>پروتئین (g)</span><input type="number" step="0.1" min="0" class="health-input" id="fdb-c-p" value="' + S.cP + '"></label>' +
      '<label class="fdb-field"><span>کربو (g)</span><input type="number" step="0.1" min="0" class="health-input" id="fdb-c-c" value="' + S.cC + '"></label>' +
      '<label class="fdb-field"><span>چربی (g)</span><input type="number" step="0.1" min="0" class="health-input" id="fdb-c-f" value="' + S.cF + '"></label>' +
      '</div>' +
      '<label class="fdb-field"><span>مقدار مصرف (گرم)</span><input type="number" step="1" min="1" class="health-input" id="fdb-c-grams" value="' + S.cGrams + '"></label>' +
      '<div class="fdb-actions"><button class="btn primary" type="button" data-fdb-add-custom>افزودن به وعده</button></div>' +
      '</div>';
  }

  /* ---------- detail ---------- */
  function detailHTML() {
    var f = S.selected, p = f.per100g || {};
    var h = '<div class="fdb-head"><span class="fdb-title">' + esc(f.name) + '</span><button class="fdb-x" type="button" data-fdb-close>✕</button></div>';
    if (f.categoryName) h += '<div class="fdb-cat">' + esc(f.categoryName) + (f.brand ? ' · ' + esc(f.brand) : '') + '</div>';
    var kcal = (typeof p.kcal === "number" && p.kcal > 0) ? p.kcal : null;
    var protPct = (kcal && typeof p.protein === "number") ? (p.protein * 4 / kcal * 100) : null;
    var carbPct = (kcal && typeof p.carb === "number")    ? (p.carb * 4 / kcal * 100)    : null;
    var fatPct  = (kcal && typeof p.fat === "number")     ? (p.fat * 9 / kcal * 100)     : null;
    h += '<div class="fdb-hero-nutri">';
    h += '<div class="fdb-hero-kcal">';
    h += '<span class="fdb-hero-flame">🔥</span>';
    h += '<span class="fdb-hero-num">' + (kcal == null ? "—" : fa0(kcal)) + '</span>';
    h += '<span class="fdb-hero-unit">کالری / ۱۰۰ گرم</span>';
    h += '</div>';
    h += '<div class="fdb-donuts">';
    h += donutCard("پروتئین", p.protein, protPct, "#60a5fa", "🍗");
    h += donutCard("کربوهیدرات", p.carb, carbPct, "#fbbf24", "🍚");
    h += donutCard("چربی", p.fat, fatPct, "#a855f7", "🥜");
    h += '</div>';
    h += '</div>';
    h += '<div class="fdb-qty">';
    var units = (f.householdUnits || []).slice();
    if (units.length === 0 && Array.isArray(f.genericUnits) && f.genericUnits.length > 0) {
      units = f.genericUnits.slice(0, 8);
      for (var u2 = 0; u2 < units.length; u2++) units[u2].approx = true;
    }
    if (units.length) {
      h += '<label class="fdb-field"><span>واحد</span><select class="health-input" id="fdb-unit">';
      h += '<option value="0"' + (S.unitId === 0 ? " selected" : "") + '>گرم</option>';
      for (var u = 0; u < units.length; u++) {
        var un = units[u];
        var lbl = esc(un.unitName) + ' (' + fa0(un.gram) + ' گرم' + (un.approx ? ' ~' : '') + ')';
        h += '<option value="' + un.unitId + '"' + (S.unitId === un.unitId ? " selected" : "") + '>' + lbl + '</option>';
      }
      h += '</select></label>';
      S._units = units;
    } else {
      S._units = [];
    }
    if (S.unitId === 0) {
      h += '<label class="fdb-field"><span>گرم</span><input type="number" step="1" min="1" max="5000" class="health-input" id="fdb-grams" value="' + S.grams + '"></label>';
    } else {
      h += '<label class="fdb-field"><span>تعداد</span><input type="number" step="1" min="1" max="99" class="health-input" id="fdb-count" value="' + S.unitCount + '"></label>';
    }
    h += '</div>';
    h += '<div class="fdb-total-grams">مقدار کل: <b>' + fa0(totalGrams()) + ' گرم</b></div>';
    h += '<div id="fdb-preview-wrap">' + previewHTML(totalGrams()) + '</div>';
    h += '<button class="fdb-fav-toggle' + (isFav(f.id) ? ' is-on' : '') + '" type="button" data-fdb-fav>' + (isFav(f.id) ? '⭐ حذف از علاقه‌ها' : '⭐ افزودن به علاقه‌ها') + '</button>';
    h += '<div class="fdb-actions"><button class="btn ghost" type="button" data-fdb-back>بازگشت</button><button class="btn primary" type="button" data-fdb-add>افزودن به وعده</button></div>';
    return h;
  }
  function macro(label, val, fmt) {
    var s = (val == null || isNaN(val)) ? "—" : fmt(val);
    return '<div class="fdb-macro"><span class="fdb-macro-v">' + s + '</span><span class="fdb-macro-l">' + label + '</span></div>';
  }
  function donutCard(label, val, pct, color, icon, unit) {
    var R = 26, C = 2 * Math.PI * R;
    var safePct = (pct == null || isNaN(pct)) ? 0 : Math.min(100, Math.max(0, pct));
    var off = C - (safePct / 100) * C;
    var vTxt = (val == null || isNaN(val)) ? "—" : fa1(val);
    var pTxt = (pct == null || isNaN(pct)) ? "—" : fa0(pct) + "٪";
    return '<div class="fdb-donut-card" style="--dc:' + color + '">' +
      '<div class="fdb-donut-wrap">' +
      '<svg viewBox="0 0 64 64" class="fdb-donut">' +
      '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="rgba(255,255,255,.07)" stroke-width="6"/>' +
      '<circle cx="32" cy="32" r="' + R + '" fill="none" stroke="' + color + '" stroke-width="6" stroke-linecap="round" ' +
        'stroke-dasharray="' + C.toFixed(2) + '" stroke-dashoffset="' + C.toFixed(2) + '" ' +
        'style="--target-off:' + off.toFixed(2) + '" transform="rotate(-90 32 32)" class="fdb-donut-fill"/>' +
      '</svg>' +
      '<span class="fdb-donut-ic">' + icon + '</span>' +
      '</div>' +
      '<div class="fdb-donut-body">' +
      '<span class="fdb-donut-val">' + vTxt + '<span class="fdb-donut-unit">' + (unit || "g") + '</span></span>' +
      '<span class="fdb-donut-lbl">' + label + '</span>' +
      '<span class="fdb-donut-pct">' + pTxt + ' از انرژی</span>' +
      '</div>' +
      '</div>';
  }
  function previewHTML(tg) {
    if (!S || !S.selected || !tg || tg <= 0) return '';
    var p = S.selected.per100g || {};
    var k = (tg > 0) ? (tg / 100) : null;
    var kcal = (k == null || p.kcal == null) ? null : p.kcal * k;
    var pr = (k == null || p.protein == null) ? null : p.protein * k;
    var cb = (k == null || p.carb == null) ? null : p.carb * k;
    var ft = (k == null || p.fat == null) ? null : p.fat * k;
    return '<div class="fdb-preview">' +
      '<div class="fdb-preview-kcal">' + (kcal == null ? "—" : fa0(kcal)) + '<span class="fdb-preview-unit">کالری</span></div>' +
      '<div class="fdb-preview-macros">' +
      '<span>پروتئین: ' + (pr == null ? "نامشخص" : fa1(pr) + "g") + '</span>' +
      '<span>کربو: ' + (cb == null ? "نامشخص" : fa1(cb) + "g") + '</span>' +
      '<span>چربی: ' + (ft == null ? "نامشخص" : fa1(ft) + "g") + '</span>' +
      '</div></div>';
  }
  function totalGrams() {
    if (!S || !S.selected) return 0;
    if (S.unitId === 0) return Math.max(0, S.grams || 0);
    var us = S._units || [];
    for (var i = 0; i < us.length; i++) {
      if (us[i].unitId !== S.unitId) continue;
      var _g = Number(us[i].gram);
      if (!isFinite(_g) || _g <= 0) return 0; /* PATCH:phase-F6-unit */
      return Math.max(0, (S.unitCount || 0) * _g);
    }
    return 0;
  }
  function refreshPreview() {
    if (!S || !S.selected) return;
    var tg = totalGrams();
    var el = document.querySelector(".fdb-total-grams b");
    if (el) el.textContent = fa0(tg) + " گرم";
    var wrap = document.getElementById("fdb-preview-wrap");
    if (wrap) wrap.innerHTML = previewHTML(tg);
  }

  /* ---------- favorites toggle ---------- */
  function isFav(id) {
    var l = favList();
    for (var i = 0; i < l.length; i++) if (l[i].dbFoodId === id) return true;
    return false;
  }
  function toggleFav() {
    if (!S || !S.selected) return;
    var l = favList();
    var id = S.selected.id, idx = -1;
    for (var i = 0; i < l.length; i++) if (l[i].dbFoodId === id) { idx = i; break; }
    if (idx >= 0) { l.splice(idx, 1); need().notify("info", "از علاقه‌ها حذف شد."); }
    else {
      var p = S.selected.per100g || {};
      l.push({ dbFoodId: id, name: S.selected.name, kcal: (typeof p.kcal === "number") ? p.kcal : null });
      need().notify("success", "به علاقه‌ها اضافه شد.");
    }
    need().save();
    renderAll();
  }

  /* ---------- search flow (no full refresh) ---------- */
  function searchDebounced(q) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(function () { searchNow(q); }, 300);
  }
  function searchNow(q) {
    if (!S) return;
    S.q = q || "";
    if (!S.q) { S.results = []; S.loading = false; S.error = null; updateResults(); return; }
    S.loading = true; S.error = null;
    updateResults();
    var my = ++reqId;
    fetch("/api/fooddb/foods?q=" + encodeURIComponent(S.q) + "&limit=25")
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (d) {
        if (my !== reqId || !S) return;
        S.results = d.results || []; S.loading = false; updateResults();
      })
      .catch(function () {
        if (my !== reqId || !S) return;
        S.loading = false; S.error = "خطا در اتصال به بانک غذا."; updateResults();
      });
  }
  function pick(id) {
    if (!S) return;
    S.loading = true; S.error = null; renderAll();
    fetch("/api/fooddb/foods/" + id)
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (f) {
        if (!S) return;
        S.loading = false; S.selected = f; S.unitId = 0; S.grams = 100; S.unitCount = 1;
        renderAll();
      })
      .catch(function () {
        if (!S) return;
        S.loading = false; S.error = "خطا در دریافت جزئیات."; renderAll();
      });
  }

  /* ---------- add ---------- */
  function addSelected() {
    if (!S || !S.selected) return;
    var tg = totalGrams();
    if (!tg || tg <= 0) { need().notify("error", "مقدار معتبر وارد کن."); return; }
    var p = S.selected.per100g || {};
    var date = viewDate();
    var unitInfo = null;
    if (S.unitId !== 0) {
      var us = S._units || [];
      for (var i = 0; i < us.length; i++) if (us[i].unitId === S.unitId) {
        unitInfo = { unitId: us[i].unitId, unitName: us[i].unitName, gram: us[i].gram, count: S.unitCount, approx: !!us[i].approx };
        break;
      }
    }
    var st = need().state();
    var m = need().mealEnsure(st, date, S.meal);
    m.items.push({
      foodId: "db:" + S.selected.id,
      source: "db",
      dbFoodId: S.selected.id,
      grams: tg, unit: unitInfo,
      snapshot: {
        name: S.selected.name,
        kcal: (typeof p.kcal === "number") ? p.kcal : null,
        p:    (typeof p.protein === "number") ? p.protein : null,
        c:    (typeof p.carb === "number") ? p.carb : null,
        f:    (typeof p.fat === "number") ? p.fat : null
      }
    });
    need().save();
    need().notify("success", "«" + S.selected.name + "» به " + mealLabel(S.meal) + " اضافه شد.");
    var _r = need();
    close();
    _r.render("body");
  }
  function addCustom() {
    if (!S) return;
    var name = (S.cName || "").trim();
    if (!name) { need().notify("error", "نام غذا را وارد کن."); return; }
    var kcal = parseFloat(S.cKcal);
    var p = parseFloat(S.cP); if (isNaN(p)) p = null;
    var c = parseFloat(S.cC); if (isNaN(c)) c = null;
    var f = parseFloat(S.cF); if (isNaN(f)) f = null;
    var g = parseFloat(S.cGrams);
    if (isNaN(kcal) || kcal < 0) { need().notify("error", "کالری معتبر وارد کن."); return; }
    if (isNaN(g) || g <= 0) { need().notify("error", "گرم معتبر وارد کن."); return; }
    var date = viewDate();
    var st = need().state();
    var m = need().mealEnsure(st, date, S.meal);
    m.items.push({
      foodId: "custom:" + Date.now(), source: "custom", grams: g, unit: null,
      snapshot: { name: name, kcal: kcal, p: p, c: c, f: f }
    });
    need().save();
    need().notify("success", "«" + name + "» به " + mealLabel(S.meal) + " اضافه شد.");
    var _r = need();
    close();
    _r.render("body");
  }

  /* ---------- events ---------- */
  function onClick(e) {
    if (!S) return;
    var t = e.target; if (!t || !t.closest) return;
    if (t.id === "fdb-overlay") { close(); return; }
    var el;
    el = t.closest("[data-fdb-close]"); if (el) { close(); return; }
    el = t.closest("[data-fdb-back]");  if (el) { S.selected = null; renderAll(); return; }
    el = t.closest("[data-fdb-add]");   if (el) { addSelected(); return; }
    el = t.closest("[data-fdb-add-custom]"); if (el) { addCustom(); return; }
    el = t.closest("[data-fdb-tab]");   if (el) { S.tab = el.getAttribute("data-fdb-tab"); S.activeCat = null; renderAll(); return; }
    el = t.closest("[data-fdb-cat-back]"); if (el) { S.activeCat = null; renderAll(); return; }
    el = t.closest("[data-fdb-cat]"); if (el) { openCategory(parseInt(el.getAttribute("data-fdb-cat"), 10)); return; }
    el = t.closest("[data-fdb-fav-del]"); if (el) { removeFav(parseInt(el.getAttribute("data-fdb-fav-del"), 10)); return; }
    el = t.closest("[data-fdb-fav]");   if (el) { toggleFav(); return; }
    el = t.closest("[data-fdb-pick]");  if (el) { pick(parseInt(el.getAttribute("data-fdb-pick"), 10)); return; }
  }
  function onInput(e) {
    if (!S) return;
    var t = e.target; if (!t) return;
    if (t.id === "fdb-q") { S.q = t.value; searchDebounced(t.value); return; }
    if (t.id === "fdb-fav-q") { S.favQ = t.value; renderAll(); return; }
    if (t.id === "fdb-grams") { S.grams = parseFloat(t.value) || 0; refreshPreview(); return; }
    if (t.id === "fdb-count") { S.unitCount = parseInt(t.value, 10) || 0; refreshPreview(); return; }
    if (t.id === "fdb-unit")  { S.unitId = parseInt(t.value, 10) || 0; S.unitCount = 1; renderAll(); return; }
    if (t.id === "fdb-c-name") { S.cName = t.value; return; }
    if (t.id === "fdb-c-kcal") { S.cKcal = t.value; return; }
    if (t.id === "fdb-c-p")    { S.cP = t.value; return; }
    if (t.id === "fdb-c-c")    { S.cC = t.value; return; }
    if (t.id === "fdb-c-f")    { S.cF = t.value; return; }
    if (t.id === "fdb-c-grams"){ S.cGrams = t.value; return; }
  }
})();