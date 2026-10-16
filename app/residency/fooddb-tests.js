/* Internship OS — F.1 tests for Food.db read-only API.
   Run from F12:  await window.InternshipResidency.fooddbTests.__tests()
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[fooddb-tests] R missing"); return; }
  var H = R.fooddbTests = R.fooddbTests || {};

  function _ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); }
  function _eq(a, b, msg) { if (a !== b) throw new Error((msg||"eq") + " got=" + a + " expected=" + b); }
  function _fa(path) {
    return fetch(path).then(function (r) {
      if (!r.ok) {
        var e = new Error("HTTP " + r.status); e.status = r.status; throw e;
      }
      return r.json();
    });
  }

  var TESTS = [
    ["T1 /health returns ok", function () {
      return _fa("/api/fooddb/health").then(function (d) {
        _ok(d.ok === true, "ok flag");
        _ok(d.foods > 0, "foods count");
        _ok(d.exercises > 0, "exercises count");
      });
    }],
    ["T2 search برنج returns results", function () {
      return _fa("/api/fooddb/foods?q=" + encodeURIComponent("برنج") + "&limit=5").then(function (d) {
        _ok(d.results && d.results.length > 0, "results");
        _ok(d.results.length <= 5, "limit honored");
      });
    }],
    ["T3 result has id/name/kcalPer100g", function () {
      return _fa("/api/fooddb/foods?q=" + encodeURIComponent("برنج") + "&limit=5").then(function (d) {
        var r = d.results[0];
        _ok(r.id != null, "id");
        _ok(typeof r.name === "string" && r.name.length > 0, "name");
        _ok(r.kcalPer100g != null && r.kcalPer100g > 0, "kcalPer100g");
      });
    }],
    ["T4 detail normalizes amount != 100", function () {
      return _fa("/api/fooddb/foods/10001").then(function (d) {
        _eq(d.id, 10001, "id");
        _ok(d.amount > 0, "amount");
        var expected = 160 * 100 / 45;
        _ok(Math.abs(d.per100g.kcal - expected) < 1e-6, "normalization");
      });
    }],
    ["T5 missing nutrient -> null", function () {
      return _fa("/api/fooddb/foods/15000").then(function (d) {
        _eq(d.per100g.protein, null, "protein");
        _eq(d.per100g.carb, null, "carb");
        _ok(d.per100g.fat > 0, "fat present");
      });
    }],
    ["T6 household units gram > 0", function () {
      return _fa("/api/fooddb/foods/10001").then(function (d) {
        _ok(Array.isArray(d.householdUnits), "array");
        for (var i = 0; i < d.householdUnits.length; i++) {
          _ok(d.householdUnits[i].gram > 0, "unit gram positive");
          _ok(typeof d.householdUnits[i].unitName === "string", "unit name");
        }
      });
    }],
    ["T7 unknown id -> 404", function () {
      return _fa("/api/fooddb/foods/99999999").then(
        function () { throw new Error("should have failed"); },
        function (e) { _eq(e.status, 404, "status"); }
      );
    }],
    ["T8 exercises search works", function () {
      return _fa("/api/fooddb/exercises?q=" + encodeURIComponent("دویدن") + "&limit=5").then(function (d) {
        _ok(d.results && d.results.length > 0, "results");
        _ok(d.results[0].met > 0, "MET");
      });
    }],
    ["T9 limit clamped to 50", function () {
      return _fa("/api/fooddb/foods?limit=999").then(function (d) {
        _ok(d.results.length <= 50, "<= 50");
      });
    }],
    ["T10 limit clamped to min 1", function () {
      return _fa("/api/fooddb/foods?limit=0").then(function (d) {
        _ok(d.results.length >= 1, ">= 1");
      });
    }],
    ["T11 Persian yeh normalization", function () {
      return _fa("/api/fooddb/foods?q=" + encodeURIComponent("پنير") + "&limit=5").then(function (d) {
        _ok(d.results && d.results.length > 0, "results");
      });
    }],
    ["T12 empty query bounded", function () {
      return _fa("/api/fooddb/foods?limit=5").then(function (d) {
        _ok(d.results.length <= 5, "bounded");
      });
    }]
  ];

  H.__tests = function () {
    var results = [];
    var chain = Promise.resolve();
    TESTS.forEach(function (t) {
      chain = chain.then(function () {
        return Promise.resolve().then(t[1]).then(
          function () { results.push({ name: t[0], pass: true }); },
          function (e) { results.push({ name: t[0], pass: false, err: String(e && e.message ? e.message : e) }); }
        );
      });
    });
    return chain.then(function () {
      var passed = results.filter(function (r) { return r.pass; }).length;
      try { console.log("[fooddb-tests] " + passed + "/" + results.length); } catch (e) {}
      return { passed: passed, total: results.length, results: results };
    });
  };
})();