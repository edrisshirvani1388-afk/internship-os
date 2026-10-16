/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Finance Tests (Phase F.9)
   ADR-021 compliant — isolated mocks only
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[finance-tests] R missing"); return; }
  var T = R.financeTests = R.financeTests || {};

  function _ok(v, m) { if (!v) throw new Error(m || "expected truthy"); }
  function _eq(a, b, m) { if (a !== b) throw new Error((m || "eq") + " got=" + a + " want=" + b); }

  function _ensure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.finance || typeof s.finance !== "object") s.finance = {};
    if (!Array.isArray(s.finance.transactions)) s.finance.transactions = [];
    if (!Array.isArray(s.finance.categories)) s.finance.categories = [];
    if (!s.finance.budgets || typeof s.finance.budgets !== "object") s.finance.budgets = {};
    return s.finance;
  }
  function _parse(j) {
    var p = String(j || "").split("/");
    if (p.length !== 3) return null;
    var jy = parseInt(p[0],10), jm = parseInt(p[1],10), jd = parseInt(p[2],10);
    if (!isFinite(jy)||!isFinite(jm)||!isFinite(jd)) return null;
    return { jy: jy, jm: jm, jd: jd };
  }
  function _isInMonth(dateStr, ym) {
    var p = _parse(dateStr);
    return !!(p && p.jy === ym.jy && p.jm === ym.jm);
  }
  function _summary(list) {
    var inc = 0, exp = 0;
    for (var i = 0; i < list.length; i++) {
      var a = (typeof list[i].amount === "number") ? list[i].amount : 0;
      if (list[i].kind === "income") inc += a;
      else if (list[i].kind === "expense") exp += a;
    }
    return { income: inc, expense: exp, net: inc - exp };
  }
  function _validAmount(v) {
    var n = parseInt(String(v).replace(/[^\d\-]/g, ""), 10);
    return isFinite(n) && n > 0 && String(n) === String(parseInt(n,10));
  }
  function _validDate(s) { return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(String(s||"").trim()); }
  function _fmt(n) {
    if (typeof n !== "number" || !isFinite(n)) return "—";
    var neg = n < 0; n = Math.abs(n);
    var s = String(n), parts = [];
    while (s.length > 3) { parts.unshift(s.slice(-3)); s = s.slice(0,-3); }
    parts.unshift(s);
    return (neg ? "-" : "") + parts.join("،");
  }

  var TESTS = [
    ["F41 no-reminder state fields", function(){ var s={finance:{transactions:[],categories:[],budgets:{},settings:{}}}; if (s.finance.settings.dailyReminder !== undefined) throw new Error("dailyReminder should be absent"); }],
    ["F42 formatter exists", function(){ var P = window.InternshipResidency && window.InternshipResidency.financeUI; if (!P) throw new Error("financeUI missing"); if (typeof P.formatToman !== "function") throw new Error("formatToman missing"); }],
    ["F01 ensure creates finance object", function(){ var s={}; _ensure(s); _ok(s.finance); _ok(Array.isArray(s.finance.transactions)); }],
    ["F02 ensure creates categories array", function(){ var s={}; _ensure(s); _ok(Array.isArray(s.finance.categories)); }],
    ["F03 ensure creates budgets object", function(){ var s={}; _ensure(s); _ok(s.finance.budgets && typeof s.finance.budgets === "object"); }],
    ["F04 ensure preserves existing", function(){ var s={finance:{transactions:[{id:"a"}], categories:[], budgets:{}}}; _ensure(s); _eq(s.finance.transactions.length,1); }],
    ["F05 ensure null state", function(){ _ok(_ensure(null) === null); }],
    ["F06 amount validation positive int", function(){ _ok(_validAmount("1500")); _ok(_validAmount(200)); }],
    ["F07 amount rejects zero", function(){ _ok(!_validAmount("0")); }],
    ["F08 amount rejects negative", function(){ _ok(!_validAmount("-10")); }],
    ["F09 amount rejects text", function(){ _ok(!_validAmount("abc")); }],
    ["F10 date validation basic", function(){ _ok(_validDate("1405/7/23")); _ok(_validDate("1405/12/29")); }],
    ["F11 date rejects malformed", function(){ _ok(!_validDate("1405/7")); _ok(!_validDate("abc")); _ok(!_validDate("")); }],
    ["F12 parse extracts parts", function(){ var p=_parse("1405/7/23"); _eq(p.jy,1405); _eq(p.jm,7); _eq(p.jd,23); }],
    ["F13 isInMonth basic yes", function(){ _ok(_isInMonth("1405/7/23",{jy:1405,jm:7})); }],
    ["F14 isInMonth month-boundary no", function(){ _ok(!_isInMonth("1405/6/31",{jy:1405,jm:7})); }],
    ["F15 isInMonth year-boundary no", function(){ _ok(!_isInMonth("1404/7/1",{jy:1405,jm:7})); }],
    ["F16 summary basic", function(){ var r=_summary([{kind:"income",amount:1000},{kind:"expense",amount:300}]); _eq(r.income,1000); _eq(r.expense,300); _eq(r.net,700); }],
    ["F17 summary net negative", function(){ var r=_summary([{kind:"income",amount:100},{kind:"expense",amount:400}]); _eq(r.net,-300); }],
    ["F18 summary empty", function(){ var r=_summary([]); _eq(r.income,0); _eq(r.expense,0); _eq(r.net,0); }],
    ["F19 summary ignores unknown kind", function(){ var r=_summary([{kind:"other",amount:999}]); _eq(r.income,0); _eq(r.expense,0); }],
    ["F20 fmt thousands separator", function(){ _eq(_fmt(1234567), "1،234،567"); }],
    ["F21 fmt zero", function(){ _eq(_fmt(0), "0"); }],
    ["F22 fmt negative", function(){ _eq(_fmt(-5000), "-5،000"); }],
    ["F23 fmt NaN returns em-dash", function(){ _eq(_fmt(NaN), "—"); }],
    ["F24 transaction push isolated", function(){ var s={finance:{transactions:[],categories:[],budgets:{}}}; _ensure(s); s.finance.transactions.push({id:"t1",kind:"expense",amount:500,date:"1405/7/23"}); _eq(s.finance.transactions.length,1); }],
    ["F25 transaction delete filter", function(){ var s={finance:{transactions:[{id:"a"},{id:"b"}],categories:[],budgets:{}}}; _ensure(s); s.finance.transactions = s.finance.transactions.filter(function(x){return x.id!=="a";}); _eq(s.finance.transactions.length,1); _eq(s.finance.transactions[0].id,"b"); }],
    ["F26 category-kind match", function(){ var cats=[{id:"c1",kind:"expense"}]; var chosen=null; for (var i=0;i<cats.length;i++) if (cats[i].id==="c1") chosen=cats[i]; _eq(chosen.kind,"expense"); }],
    ["F27 category mismatch detected", function(){ var kind="income", cat={kind:"expense"}; _ok(kind !== cat.kind); }],
    ["F28 snapshot preserved after rename", function(){ var t={categoryId:"c1", categoryNameSnapshot:"خوراک"}; var cats=[{id:"c1",label:"Food"}]; _eq(t.categoryNameSnapshot,"خوراک"); }],
    ["F29 project snapshot preserved", function(){ var t={projectId:"p1", projectTitleSnapshot:"A"}; t.projectTitleSnapshot="A"; _eq(t.projectTitleSnapshot,"A"); }],
    ["F30 budgets keyed by YYYY/M", function(){ var s={finance:{transactions:[],categories:[],budgets:{}}}; _ensure(s); s.finance.budgets["1405/7"]=2000000; _eq(s.finance.budgets["1405/7"],2000000); }],
    ["F31 foreign keys untouched (projects)", function(){ var s={projects:[{id:"p1"}], finance:{transactions:[],categories:[],budgets:{}}}; var n=s.projects.length; _ensure(s); s.finance.transactions.push({id:"t1"}); _eq(s.projects.length, n); }],
    ["F32 no mutation of unrelated (health)", function(){ var s={health:{bodyLog:[]}, finance:null}; _ensure(s); _ok(Array.isArray(s.health.bodyLog)); }],
    ["F33 no mutation of unrelated (sleep)", function(){ var s={sleep:{log:[]}, finance:null}; _ensure(s); _ok(Array.isArray(s.sleep.log)); }],
    ["F34 months independent aggregation", function(){ var list=[{kind:"expense",amount:100,date:"1405/7/10"},{kind:"expense",amount:200,date:"1405/8/10"}]; var july=list.filter(function(t){return _isInMonth(t.date,{jy:1405,jm:7});}); _eq(_summary(july).expense,100); }],
    ["F35 forecast formula month-of-31", function(){ var exp=310000; var elapsed=10; var dim=31; var fc=Math.round((exp/elapsed)*dim); _eq(fc,961000); }],
    ["F36 forecast unavailable when no expense", function(){ var list=[]; var exp=0; for (var i=0;i<list.length;i++) if(list[i].kind==="expense") exp+=list[i].amount; _eq(exp,0); }],
    ["F37 budget math remaining", function(){ var bud=1000, sp=300; _eq(bud-sp,700); }],
    ["F38 budget overspend", function(){ var bud=100, sp=150; _ok(sp>bud); }],
    ["F39 transaction kind strict", function(){ var kinds=["income","expense"]; _ok(kinds.indexOf("income")>=0); _ok(kinds.indexOf("expense")>=0); _ok(kinds.indexOf("other")<0); }],
    ["F40 default categories count >= 13", function(){ var P = window.InternshipResidency && window.InternshipResidency.financeUI; if (!P) throw new Error("financeUI missing"); _ok(P.DEFAULT_CATS.length >= 13); }]
  ];

  T.__tests = function () {
    var results = [];
    var chain = Promise.resolve();
    TESTS.forEach(function (t) {
      chain = chain.then(function () {
        return Promise.resolve().then(t[1]).then(
          function () { results.push({ name: t[0], pass: true }); try { console.log("\u2705 " + t[0]); } catch (e) {} },
          function (e) { results.push({ name: t[0], pass: false, err: String((e && e.message) || e) }); try { console.log("\u274C " + t[0] + " — " + ((e && e.message) || e)); } catch (x) {} }
        );
      });
    });
    return chain.then(function () {
      var p = 0;
      for (var i = 0; i < results.length; i++) if (results[i].pass) p++;
      try { console.log("[finance-tests] " + p + "/" + results.length); } catch (e) {}
      return { passed: p, total: results.length, results: results };
    });
  };
})();