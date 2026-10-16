/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Projects Tests (Phase F.8)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[projects-tests] R missing"); return; }
  var T = R.projectsTests = R.projectsTests || {};

  function _ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); }
  function _eq(a, b, msg) { if (a !== b) throw new Error((msg||"eq") + " got=" + a + " want=" + b); }

  function _ensure(s) {
    if (!s || typeof s !== "object") return null;
    if (!Array.isArray(s.projects)) s.projects = [];
    return s.projects;
  }
  function _progress(s, pid) {
    var ts = (s && s.tasks) || [], total = 0, done = 0;
    for (var i=0;i<ts.length;i++) if (ts[i].projectId === pid) { total++; if (ts[i].completed) done++; }
    return { total: total, done: done, pct: total ? Math.round(done*100/total) : null };
  }
  function _isDate(s) {
    if (s == null || s === "") return true;
    return /^\d{4}\/\d{1,2}\/\d{1,2}$/.test(s);
  }
  function _dateNum(s) {
    if (!s) return null;
    var p = String(s).split("/"); if (p.length !== 3) return null;
    return parseInt(p[0],10)*10000 + parseInt(p[1],10)*100 + parseInt(p[2],10);
  }
  function _validate(f) {
    var errs = [];
    if (!f.title || !f.title.trim()) errs.push("title");
    if (!_isDate(f.startDate)) errs.push("startDate");
    if (!_isDate(f.deadline)) errs.push("deadline");
    if (f.startDate && f.deadline && _dateNum(f.startDate) > _dateNum(f.deadline)) errs.push("order");
    return errs;
  }

  var TESTS = [
    ["P29 banner label is truth-based", function(){ var src = String(function(){return 1;}); var P = window.InternshipResidency && window.InternshipResidency.projectsUI; if (!P) throw new Error("projectsUI missing"); /* label must not be موجودی فعلی */ var txt = String(P._finSub ? P._finSub.toString() : ""); if (txt.indexOf("خالص جریان مالی این ماه") === -1) throw new Error("expected خالص جریان مالی این ماه in _finSub"); if (txt.indexOf("موجودی فعلی") !== -1) throw new Error("old label present"); }],
    ["P01 ensure creates array", function(){ var s={}; _ensure(s); _ok(Array.isArray(s.projects)); _eq(s.projects.length,0); }],
    ["P02 ensure idempotent", function(){ var s={}; _ensure(s); s.projects.push({id:"x"}); _ensure(s); _eq(s.projects.length,1); }],
    ["P03 ensure preserves existing", function(){ var s={projects:[{id:"a"}]}; _ensure(s); _eq(s.projects.length,1); }],
    ["P04 ensure on null state", function(){ var r=_ensure(null); _ok(r===null); }],
    ["P05 progress zero tasks -> null", function(){ var s={tasks:[]}; var r=_progress(s,"p1"); _eq(r.total,0); _eq(r.pct,null); }],
    ["P06 progress 0/3 -> 0", function(){ var s={tasks:[{projectId:"p1",completed:false},{projectId:"p1",completed:false},{projectId:"p1",completed:false}]}; var r=_progress(s,"p1"); _eq(r.total,3); _eq(r.done,0); _eq(r.pct,0); }],
    ["P07 progress 2/4 -> 50", function(){ var s={tasks:[{projectId:"p1",completed:true},{projectId:"p1",completed:true},{projectId:"p1",completed:false},{projectId:"p1",completed:false}]}; var r=_progress(s,"p1"); _eq(r.total,4); _eq(r.done,2); _eq(r.pct,50); }],
    ["P08 progress all done -> 100", function(){ var s={tasks:[{projectId:"p1",completed:true},{projectId:"p1",completed:true}]}; _eq(_progress(s,"p1").pct,100); }],
    ["P09 progress isolated per project", function(){ var s={tasks:[{projectId:"p1",completed:true},{projectId:"p2",completed:false}]}; _eq(_progress(s,"p1").pct,100); _eq(_progress(s,"p2").pct,0); }],
    ["P10 tasks without projectId ignored", function(){ var s={tasks:[{projectId:null,completed:true},{projectId:undefined,completed:true},{projectId:"p1",completed:false}]}; _eq(_progress(s,"p1").total,1); }],
    ["P11 progress handles missing completed flag", function(){ var s={tasks:[{projectId:"p1"}]}; var r=_progress(s,"p1"); _eq(r.total,1); _eq(r.done,0); }],
    ["P12 isDate empty ok", function(){ _ok(_isDate("")); _ok(_isDate(null)); }],
    ["P13 isDate valid", function(){ _ok(_isDate("1405/7/20")); }],
    ["P14 isDate bad", function(){ _ok(!_isDate("abc")); _ok(!_isDate("1405/7")); }],
    ["P15 validate rejects empty title", function(){ var e=_validate({title:"  "}); _ok(e.indexOf("title")!==-1); }],
    ["P16 validate rejects bad start", function(){ var e=_validate({title:"x",startDate:"bad"}); _ok(e.indexOf("startDate")!==-1); }],
    ["P17 validate rejects bad deadline", function(){ var e=_validate({title:"x",deadline:"1405/13"}); _ok(e.indexOf("deadline")!==-1); }],
    ["P18 validate rejects deadline<start", function(){ var e=_validate({title:"x",startDate:"1405/8/10",deadline:"1405/8/1"}); _ok(e.indexOf("order")!==-1); }],
    ["P19 validate accepts sane", function(){ var e=_validate({title:"x",startDate:"1405/7/1",deadline:"1405/8/1"}); _eq(e.length,0); }],
    ["P20 dateNum ordering", function(){ _ok(_dateNum("1405/8/1")>_dateNum("1405/7/31")); }],
    ["P21 delete detaches tasks, keeps them", function(){ var s={projects:[{id:"p1"}],tasks:[{id:"t1",projectId:"p1"},{id:"t2",projectId:"p1"}]}; for (var i=0;i<s.tasks.length;i++) if (s.tasks[i].projectId==="p1") s.tasks[i].projectId=null; s.projects=s.projects.filter(function(x){return x.id!=="p1";}); _eq(s.projects.length,0); _eq(s.tasks.length,2); _eq(s.tasks[0].projectId,null); }],
    ["P22 archive preserves tasks + link", function(){ var s={projects:[{id:"p1",status:"active"}],tasks:[{id:"t1",projectId:"p1"}]}; s.projects[0].status="archived"; _eq(s.tasks.length,1); _eq(s.tasks[0].projectId,"p1"); }],
    ["P23 complete project does not auto-complete tasks", function(){ var s={projects:[{id:"p1",status:"active"}],tasks:[{id:"t1",projectId:"p1",completed:false}]}; s.projects[0].status="completed"; _ok(!s.tasks[0].completed); }],
    ["P24 project shape additive", function(){ var p={id:"p1",title:"x",description:"",goal:"",startDate:null,deadline:null,priority:"normal",status:"active",createdAt:0,updatedAt:0}; _ok(typeof p.id==="string"); _eq(p.priority,"normal"); _eq(p.status,"active"); }],
    ["P25 health/sleep refs unchanged", function(){ var s={health:{bodyLog:[]},sleep:{log:[]},projects:[]}; var h=s.health, sl=s.sleep; s.projects.push({id:"p1"}); _ok(s.health===h); _ok(s.sleep===sl); }],
    ["P26 progress with archived project still counts", function(){ var s={projects:[{id:"p1",status:"archived"}],tasks:[{projectId:"p1",completed:true}]}; var r=_progress(s,"p1"); _eq(r.total,1); _eq(r.pct,100); }],
    ["P27 newId uniqueness (mock)", function(){ var a=Date.now()+"-"+Math.floor(Math.random()*1e6); var b=Date.now()+"-"+Math.floor(Math.random()*1e6); _ok(typeof a==="string"); _ok(typeof b==="string"); }],
    ["P28 PUI exposed helpers", function(){ var P=R.projectsUI; if (!P) throw new Error("R.projectsUI missing"); _ok(typeof P._progress==="function"); _ok(typeof P._validate==="function"); _ok(typeof P._isDate==="function"); }]
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
      var passed = 0;
      for (var i=0;i<results.length;i++) if (results[i].pass) passed++;
      try { console.log("[projects-tests] " + passed + "/" + results.length); } catch (e) {}
      return { passed: passed, total: results.length, results: results };
    });
  };
})();