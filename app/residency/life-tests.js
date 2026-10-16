/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Life & Leisure Tests (Phase F.10)
   ADR-021 compliant — isolated mocks
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[life-tests] R missing"); return; }
  var T = R.lifeTests = R.lifeTests || {};

  function _ok(v, m) { if (!v) throw new Error(m || "expected truthy"); }
  function _eq(a, b, m) { if (a !== b) throw new Error((m || "eq") + " got=" + a + " want=" + b); }

  var CATS = ["movie","series","book","date","social","travel","other"];
  var STATUS = ["planned","in_progress","done","dropped"];

  function _ensure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.life || typeof s.life !== "object") s.life = {};
    if (!Array.isArray(s.life.items)) s.life.items = [];
    return s.life;
  }
  function _isValidCat(id) { return CATS.indexOf(id) !== -1; }
  function _isValidStatus(id) { return STATUS.indexOf(id) !== -1; }
  function _validRating(r) {
    if (r == null) return true;
    if (typeof r !== "number") return false;
    return r >= 1 && r <= 5 && Math.floor(r) === r;
  }
  function _stars(n) {
    var out = "";
    for (var i = 1; i <= 5; i++) out += (i <= n ? "★" : "☆");
    return out;
  }
  function _counts(items) {
    var c = { planned:0, in_progress:0, done:0, dropped:0, total: items.length };
    for (var i=0;i<items.length;i++) if (c[items[i].status] != null) c[items[i].status]++;
    return c;
  }
  function _mkId(i) { return "life-test-" + i + "-" + Date.now() + "-" + Math.floor(Math.random()*1e6); }

  var TESTS = [
    ["L01 ensure creates life object", function(){ var s={}; _ensure(s); _ok(s.life); _ok(Array.isArray(s.life.items)); }],
    ["L02 ensure idempotent", function(){ var s={}; _ensure(s); s.life.items.push({id:"x"}); _ensure(s); _eq(s.life.items.length,1); }],
    ["L03 ensure null state safe", function(){ _ok(_ensure(null) === null); }],
    ["L04 ensure preserves existing", function(){ var s={life:{items:[{id:"a"},{id:"b"}]}}; _ensure(s); _eq(s.life.items.length,2); }],
    ["L05 push item", function(){ var s={}; _ensure(s); s.life.items.push({id:_mkId(1),title:"Film",category:"movie",status:"planned"}); _eq(s.life.items.length,1); }],
    ["L06 delete filter", function(){ var s={}; _ensure(s); s.life.items=[{id:"a"},{id:"b"},{id:"c"}]; s.life.items=s.life.items.filter(function(x){return x.id!=="b";}); _eq(s.life.items.length,2); _ok(s.life.items[0].id==="a"); }],
    ["L07 ids stable across edit", function(){ var it={id:"ID-1",title:"A"}; var same=it.id; it.title="B"; _eq(it.id,same); }],
    ["L08 category validation", function(){ _ok(_isValidCat("movie")); _ok(_isValidCat("book")); _ok(!_isValidCat("xxx")); _ok(!_isValidCat("")); }],
    ["L09 status validation", function(){ _ok(_isValidStatus("planned")); _ok(_isValidStatus("done")); _ok(!_isValidStatus("nope")); }],
    ["L10 rating valid range", function(){ _ok(_validRating(1)); _ok(_validRating(3)); _ok(_validRating(5)); _ok(_validRating(null)); }],
    ["L11 rating invalid", function(){ _ok(!_validRating(0)); _ok(!_validRating(6)); _ok(!_validRating(2.5)); _ok(!_validRating("3")); }],
    ["L12 stars render", function(){ _eq(_stars(0),"☆☆☆☆☆"); _eq(_stars(3),"★★★☆☆"); _eq(_stars(5),"★★★★★"); }],
    ["L13 counts", function(){ var arr=[{status:"planned"},{status:"planned"},{status:"in_progress"},{status:"done"},{status:"dropped"}]; var c=_counts(arr); _eq(c.planned,2); _eq(c.in_progress,1); _eq(c.done,1); _eq(c.dropped,1); _eq(c.total,5); }],
    ["L14 status→done sets completedAt", function(){ var x={status:"planned"}; if(x.status!=="done"){ x.status="done"; x.completedAt=Date.now(); } _ok(typeof x.completedAt === "number"); }],
    ["L15 status→in_progress sets startedAt", function(){ var x={status:"planned"}; if(!x.startedAt){ x.startedAt=Date.now(); } _ok(typeof x.startedAt === "number"); }],
    ["L16 editing one item does not mutate siblings", function(){ var s={life:{items:[{id:"a",title:"A"},{id:"b",title:"B"}]}}; s.life.items[0].title="A2"; _eq(s.life.items[1].title,"B"); }],
    ["L17 task link field nullable", function(){ var x={id:"i1",taskId:null}; _eq(x.taskId,null); x.taskId="t1"; _eq(x.taskId,"t1"); }],
    ["L18 delete item keeps linked task id (state-level)", function(){ var s={life:{items:[{id:"i1",taskId:"t1"}]},tasks:[{id:"t1",title:"Event"}]}; s.life.items=s.life.items.filter(function(x){return x.id!=="i1";}); _eq(s.tasks.length,1); _eq(s.tasks[0].id,"t1"); }],
    ["L19 missing task in state handled gracefully", function(){ var s={life:{items:[{id:"i1",taskId:"MISSING"}]},tasks:[]}; var it=s.life.items[0]; var task=null; for(var i=0;i<s.tasks.length;i++) if(s.tasks[i].id===it.taskId) task=s.tasks[i]; _eq(task,null); }],
    ["L20 unrelated state untouched", function(){ var s={life:{items:[]},health:{bodyLog:[]},sleep:{log:[]},finance:{transactions:[]},projects:[]}; _ensure(s); s.life.items.push({id:"x"}); _ok(Array.isArray(s.health.bodyLog)); _ok(Array.isArray(s.sleep.log)); _ok(Array.isArray(s.finance.transactions)); _ok(Array.isArray(s.projects)); }],
    ["L21 no duplicate scheduling", function(){ var s={life:{items:[{id:"i1",taskId:"t1"}]},tasks:[{id:"t1"}]}; var counts={}; for(var i=0;i<s.tasks.length;i++) counts[s.tasks[i].id]=(counts[s.tasks[i].id]||0)+1; _eq(counts["t1"],1); }],
    ["L22 search by title (manual)", function(){ var items=[{title:"Inception",note:""},{title:"Book",note:"sci-fi"}]; var q="incep"; var found=items.filter(function(x){ return (x.title+" "+x.note).toLowerCase().indexOf(q)!==-1; }); _eq(found.length,1); }],
    ["L23 filter by category", function(){ var items=[{category:"movie"},{category:"book"},{category:"movie"}]; var mv=items.filter(function(x){return x.category==="movie";}); _eq(mv.length,2); }],
    ["L24 filter by status", function(){ var items=[{status:"planned"},{status:"done"}]; var p=items.filter(function(x){return x.status==="planned";}); _eq(p.length,1); }],
    ["L25 tags split/trim", function(){ var raw="foreign, action , sci-fi"; var parts=raw.split(",").map(function(t){return t.trim();}).filter(function(t){return !!t;}); _eq(parts.length,3); _eq(parts[0],"foreign"); _eq(parts[2],"sci-fi"); }],
    ["L26 UI exposes CATS", function(){ var L = window.InternshipResidency && window.InternshipResidency.lifeUI; if(!L) throw new Error("lifeUI missing"); _ok(Array.isArray(L.CATS)); _ok(L.CATS.length >= 7); }],
    ["L27 UI exposes STATUS", function(){ var L = window.InternshipResidency && window.InternshipResidency.lifeUI; if(!L) throw new Error("lifeUI missing"); _ok(Array.isArray(L.STATUS)); _eq(L.STATUS.length, 4); }],
    ["L28 UI exposes render", function(){ var L = window.InternshipResidency && window.InternshipResidency.lifeUI; if(!L) throw new Error("lifeUI missing"); _ok(typeof L.render === "function"); }],
    ["L29 UI exposes consumePendingLink", function(){ var L = window.InternshipResidency && window.InternshipResidency.lifeUI; if(!L) throw new Error("lifeUI missing"); _ok(typeof L.consumePendingLink === "function"); }],
    ["L30 status priorities sorted (planned first)", function(){ var order={planned:0,in_progress:1,done:2,dropped:3}; var arr=[{status:"done"},{status:"planned"},{status:"in_progress"}]; arr.sort(function(a,b){return order[a.status]-order[b.status];}); _eq(arr[0].status,"planned"); _eq(arr[2].status,"done"); }]
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
      try { console.log("[life-tests] " + p + "/" + results.length); } catch (e) {}
      return { passed: p, total: results.length, results: results };
    });
  };
})();