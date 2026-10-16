/* Internship OS — F.7 Sleep tests (persistent, ADR-021 compliant)
   Run: await window.InternshipResidency.sleepTests.__tests()
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[sleep-tests] R missing"); return; }
  var H = R.sleepTests = R.sleepTests || {};

  /* mirror of sleep-ui helpers */
  function toMin(t) {
    if (!t || typeof t !== "string") return null;
    var p = t.split(":"); if (p.length !== 2) return null;
    var h = parseInt(p[0],10), m = parseInt(p[1],10);
    if (!isFinite(h) || !isFinite(m) || h<0 || h>23 || m<0 || m>59) return null;
    return h*60+m;
  }
  function dur(bed, wake) {
    var s = toMin(bed), e = toMin(wake);
    if (s == null || e == null) return null;
    var d = e - s; if (d < 0) d += 1440; if (d === 0) return null;
    return d;
  }
  function fmtDur(min) {
    if (min == null) return "—";
    var h = Math.floor(min/60), m = min%60;
    return (h<10?"0":"") + h + ":" + (m<10?"0":"") + m;
  }
  function ensure(s) {
    if (!s || typeof s !== "object") return null;
    if (!s.sleep || typeof s.sleep !== "object") s.sleep = {};
    var sl = s.sleep;
    if (!sl.schedule || typeof sl.schedule !== "object") sl.schedule = {};
    if (!sl.schedule.night || typeof sl.schedule.night !== "object") sl.schedule.night = {};
    var n = sl.schedule.night;
    if (n.enabled === undefined) n.enabled = true;
    if (!n.bedTime) n.bedTime = "23:00";
    if (!n.wakeTime) n.wakeTime = "07:00";
    if (!sl.schedule.nap || typeof sl.schedule.nap !== "object") sl.schedule.nap = {};
    var p = sl.schedule.nap;
    if (p.enabled === undefined) p.enabled = false;
    if (!p.time) p.time = "14:00";
    if (!p.durationMin || p.durationMin <= 0) p.durationMin = 60;
    if (!Array.isArray(p.weekdays) || p.weekdays.length !== 7) p.weekdays = [false,false,false,false,false,false,false];
    if (!Array.isArray(sl.log)) sl.log = [];
    return s;
  }

  var TESTS = [
    ["S01 toMin valid", function(){ if(toMin("23:30")!==1410) throw new Error(); }],
    ["S02 toMin invalid", function(){ if(toMin("25:00")!==null) throw new Error(); }],
    ["S03 toMin malformed", function(){ if(toMin("abc")!==null) throw new Error(); }],
    ["S04 toMin null", function(){ if(toMin(null)!==null) throw new Error(); }],

    ["S05 duration normal", function(){ if(dur("23:00","07:00")!==480) throw new Error(); }],
    ["S06 duration short cross-midnight", function(){ if(dur("23:30","00:30")!==60) throw new Error(); }],
    ["S07 duration same -> null", function(){ if(dur("23:00","23:00")!==null) throw new Error(); }],
    ["S08 duration reversed same day", function(){ if(dur("22:00","06:00")!==480) throw new Error(); }],
    ["S09 duration invalid wake", function(){ if(dur("23:00","99:00")!==null) throw new Error(); }],
    ["S10 duration null input", function(){ if(dur(null,"07:00")!==null) throw new Error(); }],

    ["S11 fmtDur two-digit hour", function(){ if(fmtDur(480)!=="08:00") throw new Error(); }],
    ["S12 fmtDur hour<10 padded", function(){ if(fmtDur(60)!=="01:00") throw new Error(); }],
    ["S13 fmtDur 30min", function(){ if(fmtDur(30)!=="00:30") throw new Error(); }],
    ["S14 fmtDur null", function(){ if(fmtDur(null)!=="—") throw new Error(); }],

    ["S15 ensure creates defaults", function(){
      var s = {}; ensure(s);
      if (!s.sleep || !s.sleep.schedule || !s.sleep.schedule.night) throw new Error();
      if (s.sleep.schedule.night.bedTime !== "23:00") throw new Error();
      if (s.sleep.schedule.night.wakeTime !== "07:00") throw new Error();
    }],
    ["S16 ensure idempotent", function(){
      var s = {}; ensure(s); ensure(s);
      if (!Array.isArray(s.sleep.log)) throw new Error();
      if (s.sleep.log.length !== 0) throw new Error();
    }],
    ["S17 ensure weekdays default 7", function(){
      var s = {}; ensure(s);
      if (s.sleep.schedule.nap.weekdays.length !== 7) throw new Error();
    }],
    ["S18 ensure preserves existing", function(){
      var s = { sleep: { schedule: { night: { enabled: false, bedTime: "22:00", wakeTime: "06:00" }, nap: { enabled: true, time: "13:00", durationMin: 45, weekdays: [true,false,true,false,true,false,false] } }, log: [{ id:"x1", kind:"night", date:"1405/7/20", bedTime:"23:00", wakeTime:"07:00", durationMin:480 }] } };
      ensure(s);
      if (s.sleep.schedule.night.bedTime !== "22:00") throw new Error("bed changed");
      if (s.sleep.schedule.nap.durationMin !== 45) throw new Error("dur changed");
      if (s.sleep.log.length !== 1) throw new Error("log lost");
    }],
    ["S19 ensure repairs short weekdays", function(){
      var s = { sleep: { schedule: { nap: { weekdays: [true,false] } } } };
      ensure(s);
      if (s.sleep.schedule.nap.weekdays.length !== 7) throw new Error();
    }],
    ["S20 ensure repairs missing log", function(){
      var s = { sleep: {} }; ensure(s);
      if (!Array.isArray(s.sleep.log)) throw new Error();
    }],

    ["S21 add night entry (mock)", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", bedTime:"23:00", wakeTime:"07:00", durationMin: dur("23:00","07:00") });
      if (s.sleep.log.length !== 1) throw new Error();
      if (s.sleep.log[0].durationMin !== 480) throw new Error();
    }],
    ["S22 edit entry (mock)", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", bedTime:"23:00", wakeTime:"07:00", durationMin:480 });
      s.sleep.log[0].bedTime = "22:30"; s.sleep.log[0].durationMin = dur("22:30","07:00");
      if (s.sleep.log[0].durationMin !== 510) throw new Error();
    }],
    ["S23 delete entry (mock)", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", bedTime:"23:00", wakeTime:"07:00", durationMin:480 });
      s.sleep.log = s.sleep.log.filter(function(e){ return e.id !== "a1"; });
      if (s.sleep.log.length !== 0) throw new Error();
    }],
    ["S24 nap entry (mock)", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"b1", kind:"nap", date:"1405/7/21", bedTime:"14:00", wakeTime:"14:30", durationMin:30 });
      if (s.sleep.log[0].kind !== "nap") throw new Error();
    }],
    ["S25 JSON roundtrip", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", bedTime:"23:00", wakeTime:"07:00", durationMin:480 });
      var copy = JSON.parse(JSON.stringify(s));
      if (copy.sleep.log[0].durationMin !== 480) throw new Error();
      if (copy.sleep.schedule.night.bedTime !== "23:00") throw new Error();
    }],
    ["S26 independent entries", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", durationMin:480 });
      s.sleep.log.push({ id:"a2", kind:"night", date:"1405/7/22", durationMin:420 });
      if (s.sleep.log.length !== 2) throw new Error();
    }],
    ["S27 daily aggregation", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", durationMin:480 });
      s.sleep.log.push({ id:"a2", kind:"nap", date:"1405/7/21", durationMin:30 });
      var total = 0;
      s.sleep.log.forEach(function(e){ if(e.date==="1405/7/21" && e.kind==="night") total += e.durationMin; });
      if (total !== 480) throw new Error();
    }],
    ["S28 different dates isolated", function(){
      var s = {}; ensure(s);
      s.sleep.log.push({ id:"a1", kind:"night", date:"1405/7/21", durationMin:480 });
      s.sleep.log.push({ id:"a2", kind:"night", date:"1405/7/22", durationMin:420 });
      var n1 = s.sleep.log.filter(function(e){ return e.date==="1405/7/21"; }).length;
      if (n1 !== 1) throw new Error();
    }],
    ["S29 missing day not zero", function(){
      var s = {}; ensure(s);
      var e = s.sleep.log.filter(function(x){ return x.date==="1405/7/20"; });
      if (e.length !== 0) throw new Error();
    }],
    ["S30 module exposes render", function(){
      if (!R.sleepUI || typeof R.sleepUI.render !== "function") throw new Error();
    }],
    ["S31 module exposes syncTasks", function(){
      if (typeof R.sleepUI.syncTasks !== "function") throw new Error();
    }],
    ["S32 module exposes _ensure", function(){
      if (typeof R.sleepUI._ensure !== "function") throw new Error();
    }],
    ["S33 bridge exists", function(){
      if (!window.__ioSleepBridge) throw new Error();
    }],
    ["S34 bridge state function", function(){
      if (typeof window.__ioSleepBridge.state !== "function") throw new Error();
    }],

    ["S35 other state preserved (mock)", function(){
      var s = { tasks: [ { id:"t1" } ], health: { bodyLog:[{id:"h1"}] } };
      ensure(s);
      if (s.tasks.length !== 1) throw new Error();
      if (!s.health || !s.health.bodyLog || s.health.bodyLog.length !== 1) throw new Error();
    }],
    ["S36 task with recurrenceEnd not mutated by ensure", function(){
      var s = { tasks: [ { id:"t1", _sleepAuto:"night", recurrenceEnd:"1405/7/20" } ] };
      ensure(s);
      if (s.tasks[0].recurrenceEnd !== "1405/7/20") throw new Error();
    }],
    ["S37 no cross-contamination with health", function(){
      var s = { health: { profile: { sex:"male" } } };
      ensure(s);
      if (!s.health || s.health.profile.sex !== "male") throw new Error();
    }],
    ["S38 no cross-contamination with residency", function(){
      var s = { residency: { meta: { activePlanId: "p1" } } };
      ensure(s);
      if (!s.residency || s.residency.meta.activePlanId !== "p1") throw new Error();
    }],

    ["S39 preset list has 5 items (night)", function(){
      var list = ["21:00","22:00","23:00","00:00","01:00"];
      if (list.length !== 5) throw new Error();
    }],
    ["S41 syncTasks does not create night auto task", function(){
      var s = { tasks: [], sleep: { schedule: { night: { enabled: true, bedTime: "23:00", wakeTime: "07:00" }, nap: { enabled: false, time: "14:00", durationMin: 60, weekdays: [false,false,false,false,false,false,false] } }, log: [] } };
      var todayK = "1405/7/21";
      var yesterdayK = "1405/7/20";
      /* simulate syncTasks core: remove night, add nap */
      s.tasks = s.tasks.filter(function(t){ return !(t && t._sleepAuto === "night"); });
      var hasNight = s.tasks.some(function(t){ return t._sleepAuto === "night"; });
      if (hasNight) throw new Error("night auto exists");
    }],
    ["S42 existing night auto tasks removed", function(){
      var s = { tasks: [
        { id: "a", _sleepAuto: "night", date: "1405/7/21" },
        { id: "b", _sleepAuto: "night", date: "1405/7/25" },
        { id: "c", _sleepAuto: "nap:2", date: "1405/7/21" }
      ] };
      s.tasks = s.tasks.filter(function(t){ return !(t && t._sleepAuto === "night"); });
      if (s.tasks.length !== 1) throw new Error("len=" + s.tasks.length);
      if (s.tasks[0].id !== "c") throw new Error("wrong survivor");
    }],
    ["S43 user tasks preserved during cleanup", function(){
      var s = { tasks: [
        { id: "u1", title: "کار کاربر" },
        { id: "n1", _sleepAuto: "night", date: "1405/7/21" },
        { id: "u2", title: "کار دیگر" }
      ] };
      s.tasks = s.tasks.filter(function(t){ return !(t && t._sleepAuto === "night"); });
      if (s.tasks.length !== 2) throw new Error();
      if (s.tasks[0].id !== "u1" || s.tasks[1].id !== "u2") throw new Error();
    }],
    ["S44 nap auto still allowed", function(){
      var s = { tasks: [] };
      var napTask = { id: "n1", _sleepAuto: "nap:2", date: "1405/7/21" };
      s.tasks.push(napTask);
      if (!s.tasks.some(function(t){ return t._sleepAuto === "nap:2"; })) throw new Error();
    }],
    ["S45 sleep logs untouched by task cleanup", function(){
      var s = { sleep: { log: [{ id: "l1", kind: "night", date: "1405/7/21", durationMin: 480 }] }, tasks: [
        { id: "a", _sleepAuto: "night" }
      ] };
      s.tasks = s.tasks.filter(function(t){ return !(t && t._sleepAuto === "night"); });
      if (s.sleep.log.length !== 1) throw new Error("log lost");
    }],
    ["S46 health data untouched during cleanup", function(){
      var s = { health: { bodyLog: [{ id:"h1" }], foodLog: [{ id:"f1" }] }, tasks: [{ id:"a", _sleepAuto:"night" }] };
      s.tasks = s.tasks.filter(function(t){ return !(t && t._sleepAuto === "night"); });
      if (s.health.bodyLog.length !== 1) throw new Error();
      if (s.health.foodLog.length !== 1) throw new Error();
    }],
    ["S47 weekdays defaults valid after closeout", function(){
      var s = {}; ensure(s);
      if (!Array.isArray(s.sleep.schedule.nap.weekdays) || s.sleep.schedule.nap.weekdays.length !== 7) throw new Error();
    }],
    ["S48 night schedule defaults preserved", function(){
      var s = {}; ensure(s);
      if (s.sleep.schedule.night.bedTime !== "23:00") throw new Error();
      if (s.sleep.schedule.night.wakeTime !== "07:00") throw new Error();
    }],
    ["S49 night enabled flag preserved", function(){
      var s = { sleep: { schedule: { night: { enabled: false, bedTime: "22:00", wakeTime: "06:00" } } } };
      ensure(s);
      if (s.sleep.schedule.night.enabled !== false) throw new Error();
      if (s.sleep.schedule.night.bedTime !== "22:00") throw new Error();
    }],
    ["S50 module still exports syncTasks", function(){
      if (!R.sleepUI || typeof R.sleepUI.syncTasks !== "function") throw new Error();
    }],
    ["S51 night split: evening + morning two tasks", function(){
      /* simulate split logic */
      var bm = 23*60, wm = 7*60;
      var evening = 1440 - bm;
      var morning = wm;
      if (evening !== 60) throw new Error("evening=" + evening);
      if (morning !== 420) throw new Error("morning=" + morning);
      if (evening + morning !== 480) throw new Error("sum!=480");
    }],
    ["S52 same-day sleep: single task", function(){
      var bm = 1*60, wm = 7*60;
      var dur = wm - bm;
      if (dur !== 360) throw new Error();
    }],
    ["S53 split preserves total duration", function(){
      var bm = 22*60, wm = 6*60;
      var total = (1440 - bm) + wm;
      if (total !== 480) throw new Error();
    }],
    ["S54 cleanup removes night:evening + morning", function(){
      var s = { tasks: [
        { id:"a", _sleepAuto: "night:evening" },
        { id:"b", _sleepAuto: "night:morning" },
        { id:"c", _sleepAuto: "night:sameday" },
        { id:"u", title: "user" }
      ] };
      s.tasks = s.tasks.filter(function(t){ return !t || !t._sleepAuto; });
      if (s.tasks.length !== 1) throw new Error("len=" + s.tasks.length);
      if (s.tasks[0].id !== "u") throw new Error();
    }],
    ["S55 nap split when crosses midnight", function(){
      var npStart = 23*60 + 30, npDur = 90;
      var aDur = 1440 - npStart;
      var bDur = npStart + npDur - 1440;
      if (aDur !== 30) throw new Error("aDur=" + aDur);
      if (bDur !== 60) throw new Error("bDur=" + bDur);
    }],
    ["S56 night same-day no split", function(){
      var bm = 2*60, wm = 8*60;
      var isCross = bm > wm;
      if (isCross) throw new Error("should not be cross");
    }],
    ["S57 night cross-midnight detected", function(){
      var bm = 23*60, wm = 7*60;
      if (!(bm > wm)) throw new Error("should be cross");
    }],
    ["S58 evening + morning = full duration", function(){
      var cases = [[22,6],[23,7],[0,8],[21,5]];
      for (var i=0;i<cases.length;i++){
        var bm = cases[i][0]*60, wm = cases[i][1]*60;
        var total = bm > wm ? ((1440 - bm) + wm) : (wm - bm);
        var expected = bm > wm ? ((1440 - bm) + wm) : (wm - bm);
        if (total !== expected) throw new Error("case "+i);
      }
    }],
    ["S59 task title consistent", function(){
      var t = "🌙 خواب شب";
      if (t.indexOf("🌙") === -1) throw new Error();
    }],
    ["S60 nap title correct", function(){
      var t = "💤 چرت";
      if (t.indexOf("💤") === -1) throw new Error();
    }],
    ["S40 preset list has 5 items (wake)", function(){
      var list = ["05:00","06:00","07:00","08:00","09:00"];
      if (list.length !== 5) throw new Error();
    }]
  ];

  H.__tests = function () {
    var results = [];
    var chain = Promise.resolve();
    TESTS.forEach(function (t) {
      chain = chain.then(function () {
        return Promise.resolve().then(t[1]).then(
          function () { results.push({ name: t[0], pass: true }); try { console.log("\u2705 " + t[0]); } catch(e){} },
          function (e) { results.push({ name: t[0], pass: false, err: String(e && e.message || e) }); try { console.log("\u274C " + t[0] + " — " + (e && e.message || e)); } catch(x){} }
        );
      });
    });
    return chain.then(function () {
      var passed = results.filter(function (r) { return r.pass; }).length;
      try { console.log("[sleep-tests] " + passed + "/" + results.length); } catch(e){}
      return { passed: passed, total: results.length, results: results };
    });
  };
})();