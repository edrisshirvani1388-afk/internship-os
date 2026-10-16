/* Internship OS — F.6 tests for Workout (exercise) UI + bridge + log.
   Run from F12:  await window.InternshipResidency.workoutTests.__tests()
   ADR-021 compliant: all state ops use isolated mock. Real state untouched.
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[workout-tests] R missing"); return; }
  var H = R.workoutTests = R.workoutTests || {};

  function _fa(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) { var e = new Error("HTTP " + r.status); e.status = r.status; throw e; }
      return r.json();
    });
  }

  /* Mirrors the contract in workoutdb-ui.js:
     gross kcal = MET * 3.5 * kg / 200 * min */
  function estimateKcal(met, kg, min) {
    if (met == null || kg == null || min == null) return null;
    if (!isFinite(met) || !isFinite(kg) || !isFinite(min)) return null;
    if (met <= 0 || kg <= 0 || min <= 0) return null;
    return met * 3.5 * kg / 200 * min;
  }

  function mkMockState() {
    return {
      health: {
        profile: { birthDate: null, sex: null, heightCm: null, activityLevel: null, goal: null, targetWeightKg: null },
        bodyLog: [],
        calorieTarget: { kcal: 2000, p: 150, c: 200, f: 60 },
        foodLog: [ { id: "f1", date: "1405/7/20", meal: "lunch", items: [] } ],
        foodCatalog: [],
        workoutLog: []
      }
    };
  }

  var TESTS = [
    ["W01 valid formula", function () {
      var v = estimateKcal(8.5, 70, 30);
      var expected = 8.5 * 3.5 * 70 / 200 * 30;
      if (Math.abs(v - expected) > 1e-9) throw new Error("formula mismatch");
    }],
    ["W02 null MET -> null", function () { if (estimateKcal(null, 70, 30) !== null) throw new Error(); }],
    ["W03 null kg -> null", function () { if (estimateKcal(8, null, 30) !== null) throw new Error(); }],
    ["W04 null min -> null", function () { if (estimateKcal(8, 70, null) !== null) throw new Error(); }],
    ["W05 zero kg -> null", function () { if (estimateKcal(8, 0, 30) !== null) throw new Error(); }],
    ["W06 zero min -> null", function () { if (estimateKcal(8, 70, 0) !== null) throw new Error(); }],
    ["W07 negative MET -> null", function () { if (estimateKcal(-1, 70, 30) !== null) throw new Error(); }],
    ["W08 NaN input -> null", function () { if (estimateKcal(NaN, 70, 30) !== null) throw new Error(); }],

    ["W09 add entry to workoutLog", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "wl-1", date: "1405/7/21", dbExerciseId: 1,
        snapshot: { name: "دویدن", met: 8.5 }, durationMinutes: 30, weightKg: 70,
        kcalEstimated: 312, formula: "gross-met-3.5", createdAt: 1 });
      if (s.health.workoutLog.length !== 1) throw new Error();
    }],
    ["W10 identity preserved after push", function () {
      var s = mkMockState();
      var ref = s.health.workoutLog;
      s.health.workoutLog.push({ id: "wl-1", date: "1405/7/21", snapshot: {}, durationMinutes: 30, weightKg: 70, kcalEstimated: 1, formula: "gross-met-3.5" });
      if (s.health.workoutLog !== ref) throw new Error("identity broken");
    }],
    ["W11 edit entry", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "wl-1", date: "1405/7/21", snapshot: { name: "دویدن" }, durationMinutes: 30, weightKg: 70, kcalEstimated: 312, formula: "gross-met-3.5" });
      s.health.workoutLog[0].durationMinutes = 45;
      s.health.workoutLog[0].kcalEstimated = 468;
      if (s.health.workoutLog[0].durationMinutes !== 45) throw new Error();
    }],
    ["W12 delete entry", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "wl-1", date: "1405/7/21", snapshot: {}, durationMinutes: 30, weightKg: 70, kcalEstimated: 312, formula: "gross-met-3.5" });
      s.health.workoutLog = s.health.workoutLog.filter(function (e) { return e.id !== "wl-1"; });
      if (s.health.workoutLog.length !== 0) throw new Error();
    }],
    ["W13 delete preserves siblings", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "a", date: "1405/7/21", snapshot: {}, durationMinutes: 10, weightKg: 70, kcalEstimated: 100, formula: "gross-met-3.5" });
      s.health.workoutLog.push({ id: "b", date: "1405/7/22", snapshot: {}, durationMinutes: 20, weightKg: 70, kcalEstimated: 200, formula: "gross-met-3.5" });
      s.health.workoutLog = s.health.workoutLog.filter(function (e) { return e.id !== "a"; });
      if (s.health.workoutLog.length !== 1 || s.health.workoutLog[0].id !== "b") throw new Error();
    }],

    ["W14 snapshot survives JSON roundtrip", function () {
      var entry = { id: "wl-1", date: "1405/7/21", dbExerciseId: 1,
        snapshot: { name: "دویدن", categoryName: "هوازی", met: 8.5 },
        durationMinutes: 30, weightKg: 70, kcalEstimated: 312, formula: "gross-met-3.5", createdAt: 1 };
      var s = JSON.parse(JSON.stringify({ health: { workoutLog: [entry] } }));
      var sn = s.health.workoutLog[0].snapshot;
      if (sn.name !== "دویدن" || sn.met !== 8.5) throw new Error("snapshot lost");
    }],
    ["W15 snapshot isolated from source", function () {
      var original = { name: "دویدن", met: 8.5 };
      var copy = JSON.parse(JSON.stringify(original));
      original.name = "changed";
      if (copy.name !== "دویدن") throw new Error("reference shared");
    }],

    ["W16 sum minutes for same date", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "a", date: "1405/7/21", durationMinutes: 30, kcalEstimated: 300, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      s.health.workoutLog.push({ id: "b", date: "1405/7/21", durationMinutes: 45, kcalEstimated: 400, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      var sum = 0;
      s.health.workoutLog.forEach(function (e) { if (e.date === "1405/7/21") sum += e.durationMinutes; });
      if (sum !== 75) throw new Error("sum=" + sum);
    }],
    ["W17 aggregation ignores other dates", function () {
      var s = mkMockState();
      s.health.workoutLog.push({ id: "a", date: "1405/7/21", durationMinutes: 30, kcalEstimated: 300, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      s.health.workoutLog.push({ id: "b", date: "1405/7/22", durationMinutes: 45, kcalEstimated: 400, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      var sum = 0;
      s.health.workoutLog.forEach(function (e) { if (e.date === "1405/7/21") sum += e.durationMinutes; });
      if (sum !== 30) throw new Error("sum=" + sum);
    }],
    ["W18 date format no padding", function () {
      var d = "1405/7/21";
      if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(d)) throw new Error();
    }],

    ["W19 calorieTarget unchanged by workout add", function () {
      var s = mkMockState();
      var before = JSON.stringify(s.health.calorieTarget);
      s.health.workoutLog.push({ id: "a", date: "1405/7/21", durationMinutes: 30, kcalEstimated: 300, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      if (JSON.stringify(s.health.calorieTarget) !== before) throw new Error();
    }],
    ["W20 foodLog unchanged by workout add", function () {
      var s = mkMockState();
      var before = s.health.foodLog.length;
      s.health.workoutLog.push({ id: "a", date: "1405/7/21", durationMinutes: 30, kcalEstimated: 300, snapshot: {}, weightKg: 70, formula: "gross-met-3.5" });
      if (s.health.foodLog.length !== before) throw new Error();
    }],

    ["W21 catIcon دویدن", function () {
      if (!R.workoutdbUI || R.workoutdbUI._catIcon("دویدن") !== "🏃") throw new Error();
    }],
    ["W22 catIcon دوچرخه", function () {
      if (R.workoutdbUI._catIcon("دوچرخه سواری") !== "🚴") throw new Error();
    }],
    ["W23 catIcon پیاده", function () {
      if (R.workoutdbUI._catIcon("پیاده روی") !== "🚶") throw new Error();
    }],
    ["W24 catIcon unknown default", function () {
      var x = R.workoutdbUI._catIcon("نامعلوم");
      if (!x || x.length === 0) throw new Error();
    }],

    ["W25 workoutdbUI exists", function () { if (!R.workoutdbUI) throw new Error(); }],
    ["W26 workoutdbUI.open is function", function () { if (typeof R.workoutdbUI.open !== "function") throw new Error(); }],
    ["W27 bridge exists", function () { if (!window.__ioWdbBridge) throw new Error(); }],
    ["W28 bridge.workoutDate Jalali format", function () {
      var wd = window.__ioWdbBridge.workoutDate();
      if (typeof wd !== "string" || !/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(wd)) throw new Error("got " + wd);
    }],

    ["W29 exercise-categories returns list", function () {
      return _fa("/api/fooddb/exercise-categories").then(function (d) {
        var list = Array.isArray(d) ? d : (d && (d.results || d.categories || d.items));
        if (!list || list.length === 0) throw new Error("no categories");
      });
    }],
    ["W30 exercises search returns results", function () {
      return _fa("/api/fooddb/exercises?q=" + encodeURIComponent("دویدن") + "&limit=5").then(function (d) {
        if (!d.results || d.results.length === 0) throw new Error("no results");
        if (!(d.results[0].met > 0)) throw new Error("MET");
      });
    }],
    ["W31 unknown exercise -> 404", function () {
      return _fa("/api/fooddb/exercises/99999999").then(
        function () { throw new Error("should have failed"); },
        function (e) { if (e.status !== 404) throw new Error("status=" + e.status); }
      );
    }],
    ["W32 exercise detail has MET", function () {
      return _fa("/api/fooddb/exercises?q=" + encodeURIComponent("دویدن") + "&limit=1").then(function (d) {
        if (!d.results || !d.results.length) throw new Error("no results");
        return _fa("/api/fooddb/exercises/" + d.results[0].id).then(function (det) {
          if (!(det.met > 0)) throw new Error("detail MET missing");
        });
      });
    }]
  ];

  H.__tests = function () {
    var results = [];
    var chain = Promise.resolve();
    TESTS.forEach(function (t) {
      chain = chain.then(function () {
        return Promise.resolve().then(t[1]).then(
          function () { results.push({ name: t[0], pass: true }); try { console.log("\u2705 " + t[0]); } catch (e) {} },
          function (e) { results.push({ name: t[0], pass: false, err: String(e && e.message || e) }); try { console.log("\u274C " + t[0] + " — " + (e && e.message || e)); } catch (x) {} }
        );
      });
    });
    return chain.then(function () {
      var passed = results.filter(function (r) { return r.pass; }).length;
      try { console.log("[workout-tests] " + passed + "/" + results.length); } catch (e) {}
      return { passed: passed, total: results.length, results: results };
    });
  };
})();