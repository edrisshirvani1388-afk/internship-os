/* Internship OS — Phase B.1 tests for state.health (profile + bodyLog)
   Run from F12 console: InternshipResidency.healthTests.__tests()
   Uses window.__os.health bridge. Operates on isolated mock state only.
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[health-tests] R missing"); return; }
  var H = R.healthTests = R.healthTests || {};

  function _bridge() {
    if (!window.__os || !window.__os.health) throw new Error("bridge missing: window.__os.health");
    return window.__os.health;
  }
  function _eq(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error((msg || "eq") + " got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b));
    }
  }
  function _ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); }
  function _mk() {
    return { schemaVersion: 22, tasks: [] };
  }
  function _emptyProfile() {
    return { birthDate: null, sex: null, heightCm: null, activityLevel: null, goal: null, targetWeightKg: null };
  }

  var TESTS = [
    ["H1 legacy state: ensure creates health+profile+bodyLog", function () {
      var B = _bridge();
      var s = _mk();
      _eq(s.health, undefined, "pre");
      var h = B.ensure(s);
      _ok(h && typeof h === "object", "health obj");
      _ok(h.profile && typeof h.profile === "object", "profile obj");
      _ok(Array.isArray(h.bodyLog), "bodyLog arr");
      _eq(h.profile, _emptyProfile(), "profile defaults");
    }],
    ["H2 applyProfile stores values", function () {
      var B = _bridge();
      var s = _mk();
      B.applyProfile(s, { birthDate: "1385/3/12", sex: "male", activityLevel: "light", goal: "lose", heightCm: 178, targetWeightKg: 72 });
      var p = B.ensure(s).profile;
      _eq(p.birthDate, "1385/3/12", "birth");
      _eq(p.sex, "male", "sex");
      _eq(p.activityLevel, "light", "act");
      _eq(p.goal, "lose", "goal");
      _eq(p.heightCm, 178, "height");
      _eq(p.targetWeightKg, 72, "target");
    }],
    ["H3 upsertBody insert new", function () {
      var B = _bridge();
      var s = _mk();
      var r = B.upsertBody(s, { date: "1405/7/20", weightKg: 75, heightCm: null }, null);
      _eq(r.ok, true, "ok");
      _eq(r.mode, "insert", "mode");
      _ok(typeof r.id === "string" && r.id.length > 0, "id");
      var h = B.ensure(s);
      _eq(h.bodyLog.length, 1, "len");
      _eq(h.bodyLog[0].weightKg, 75, "w");
      _eq(h.bodyLog[0].date, "1405/7/20", "date");
    }],
    ["H4 same date -> update not duplicate", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/20", weightKg: 75 }, null);
      var r = B.upsertBody(s, { date: "1405/7/20", weightKg: 74 }, null);
      _eq(r.ok, true, "ok");
      _eq(r.mode, "update", "mode");
      var h = B.ensure(s);
      _eq(h.bodyLog.length, 1, "no dup");
      _eq(h.bodyLog[0].weightKg, 74, "updated");
    }],
    ["H5 edit by id only affects target", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74 }, null);
      var h = B.ensure(s);
      var id1 = h.bodyLog[0].id, id2 = h.bodyLog[1].id;
      var r = B.upsertBody(s, { date: "1405/7/02", weightKg: 76 }, id1);
      _eq(r.ok, true, "ok");
      _eq(r.mode, "edit", "mode");
      _eq(h.bodyLog[0].date, "1405/7/02", "date1");
      _eq(h.bodyLog[0].weightKg, 76, "w1");
      _eq(h.bodyLog[1].date, "1405/7/15", "date2 untouched");
      _eq(h.bodyLog[1].weightKg, 74, "w2 untouched");
      _eq(h.bodyLog[1].id, id2, "id2 untouched");
    }],
    ["H6 edit unknown id -> NOT_FOUND, no mutation", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      var before = JSON.stringify(s.health);
      var r = B.upsertBody(s, { date: "1405/7/02", weightKg: 76 }, "nonexistent");
      _eq(r.ok, false, "not ok");
      _eq(r.err, "NOT_FOUND", "err");
      _eq(JSON.stringify(s.health), before, "no mutation");
    }],
    ["H7 edit onto occupied date -> DUPLICATE_DATE", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74 }, null);
      var h = B.ensure(s);
      var id1 = h.bodyLog[0].id;
      var r = B.upsertBody(s, { date: "1405/7/15", weightKg: 80 }, id1);
      _eq(r.ok, false, "not ok");
      _eq(r.err, "DUPLICATE_DATE", "err");
      _eq(h.bodyLog[0].weightKg, 75, "w1 unchanged");
      _eq(h.bodyLog[0].date, "1405/7/01", "date1 unchanged");
    }],
    ["H8 deleteBody only removes target, profile intact", function () {
      var B = _bridge();
      var s = _mk();
      B.applyProfile(s, { birthDate: "1385/3/12", sex: "male", heightCm: 178 });
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74 }, null);
      var h = B.ensure(s);
      var id1 = h.bodyLog[0].id;
      var del = B.deleteBody(s, id1);
      _eq(del, true, "deleted");
      _eq(h.bodyLog.length, 1, "len");
      _eq(h.bodyLog[0].weightKg, 74, "remaining");
      _eq(h.profile.heightCm, 178, "profile intact");
      _eq(h.profile.sex, "male", "profile sex intact");
    }],
    ["H9 validDate rejects future and malformed", function () {
      var B = _bridge();
      _eq(B.validDate(""), false, "empty");
      _eq(B.validDate("abc"), false, "abc");
      _eq(B.validDate("1405/13/1"), false, "month13");
      _eq(B.validDate("9999/1/1"), false, "future");
    }],
    ["H10 validDate accepts past", function () {
      var B = _bridge();
      _eq(B.validDate("1400/1/1"), true, "past");
    }],
    ["H11 read helpers do not mutate", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74 }, null);
      var before = JSON.stringify(s.health);
      B.lastBody(s);
      B.sortDesc(s.health.bodyLog);
      _eq(JSON.stringify(s.health), before, "no mutation on reads");
    }],
    ["H12 sortDesc returns new array, original untouched", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74 }, null);
      var h = B.ensure(s);
      var origOrder = h.bodyLog.map(function (x) { return x.id; });
      var sorted = B.sortDesc(h.bodyLog);
      _ok(sorted !== h.bodyLog, "new array");
      _eq(h.bodyLog.map(function (x) { return x.id; }), origOrder, "orig order");
    }],
    ["H13 lastBody consistent with bodyLog", function () {
      var B = _bridge();
      var s = _mk();
      B.upsertBody(s, { date: "1405/7/01", weightKg: 75, heightCm: 178 }, null);
      B.upsertBody(s, { date: "1405/7/15", weightKg: 74, heightCm: null }, null);
      var last = B.lastBody(s);
      _eq(last.date, "1405/7/15", "last date");
      _eq(last.weightKg, 74, "last w");
    }],
    ["H14 newId produces unique strings", function () {
      var B = _bridge();
      var a = B.newId(), b = B.newId();
      _ok(typeof a === "string" && a.length > 0, "a");
      _ok(typeof b === "string" && b.length > 0, "b");
      _ok(a !== b, "unique");
    }]
  ];

  H.__tests = function () {
    var passed = 0, total = 0, results = [];
    for (var i = 0; i < TESTS.length; i++) {
      total++;
      var name = TESTS[i][0], fn = TESTS[i][1];
      try { fn(); passed++; results.push({ name: name, pass: true }); }
      catch (e) { results.push({ name: name, pass: false, err: String(e && e.message ? e.message : e) }); }
    }
    try { console.log("[health-tests] " + passed + "/" + total); } catch (e) {}
    return { passed: passed, total: total, results: results };
  };
})();