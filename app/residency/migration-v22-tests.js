/* Internship OS - Phase 22.2 tests for v21 -> v22 migration.
   Run from F12 console: InternshipResidency.migrationV22.__tests()
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[migration-v22-tests] R missing"); return; }
  var M = R.migrationV22 = R.migrationV22 || {};

  function _migrate(s) {
    if (window.__os && typeof window.__os.migrateState === "function") {
      return window.__os.migrateState(s);
    }
    throw new Error("hook missing: window.__os.migrateState");
  }
  function _eq(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      throw new Error((msg || "eq") + " got=" + JSON.stringify(a) + " expected=" + JSON.stringify(b));
    }
  }
  function _ok(v, msg) { if (!v) throw new Error(msg || "expected truthy"); }
  function _mkRound(id, order, sd, ed) {
    return { id: id, planId: "p1", order: order, title: "R" + order,
             startDate: sd, endDate: ed, studySpeedPagesPerHour: null,
             customKeep: "k" + order };
  }
  function _legacy() {
    return [
      _mkRound("r1", 1, "1405/7/1", "1405/7/30"),
      _mkRound("r2", 2, "1405/8/1", "1405/8/30"),
      _mkRound("r3", 3, "1405/9/1", "1405/9/30")
    ];
  }
  function _state(ver, rounds) {
    return {
      schemaVersion: ver,
      workspace: { name: "t", firstName: "t", username: "t" },
      tasks: [{ id: "t1", title: "x", areaId: "clinical", date: "1405/7/1" }],
      settings: { theme: "dark" },
      customTop: { a: 1, nested: { b: 2 } },
      residency: {
        schemaVersion: 1,
        meta: { activePlanId: null, createdAt: 1, updatedAt: 1 },
        settings: { readingStrategy: null },
        plans: [{ id: "p1" }],
        subjects: [{ id: "s1", title: "Sub" }],
        books: [{ id: "b1", title: "Book", totalPages: 100 }],
        rounds: rounds,
        enrollments: [{ id: "e1", bookId: "b1", roundId: "r1" }],
        goals: [], activities: [], assessments: [],
        capacityProfiles: [], dayOverrides: [], manualOverrides: [],
        planVersions: [], constraints: [], reviewStates: []
      },
      contentDrafts: [], schedulingAcks: [], replanTriggers: []
    };
  }
  function _day(s) { var p = s.split("/").map(function (x) { return parseInt(x, 10); }); return p[0]*365 + p[1]*30 + p[2]; }
  function _durs(rs) { return rs.map(function (r) { return _day(r.endDate) - _day(r.startDate) + 1; }); }

  var TESTS = [
    ["T1 basic v21->v22", function () {
      var o = _migrate(_state(21, _legacy()));
      _eq(o.schemaVersion, 22, "ver");
      _eq(o.residency.rounds.map(function (r) { return r.locked; }), [false, false, false], "locks");
      _eq(o.residency.rounds.map(function (r) { return r.id; }), ["r1","r2","r3"], "ids");
      _eq(o.residency.rounds.map(function (r) { return r.order; }), [1,2,3], "orders");
      _eq(o.residency.rounds.map(function (r) { return r.startDate; }), ["1405/7/1","1405/8/1","1405/9/1"], "starts");
      _eq(o.residency.rounds.map(function (r) { return r.endDate; }), ["1405/7/30","1405/8/30","1405/9/30"], "ends");
    }],
    ["T2 already v22 unchanged", function () {
      var rounds = _legacy(); rounds.forEach(function (r) { r.locked = false; });
      var s = _state(22, rounds);
      var before = JSON.stringify(s);
      _migrate(s);
      _eq(JSON.stringify(s), before, "unchanged");
    }],
    ["T3 idempotent", function () {
      var o1 = _migrate(_state(21, _legacy()));
      var snap = JSON.stringify(o1);
      var o2 = _migrate(o1);
      _eq(JSON.stringify(o2), snap, "idempotent");
    }],
    ["T4 locked=true preserved", function () {
      var rounds = _legacy(); rounds[1].locked = true;
      var o = _migrate(_state(21, rounds));
      _eq(o.residency.rounds.map(function (r) { return r.locked; }), [false, true, false], "mixed");
    }],
    ["T5 mixed", function () {
      var rounds = _legacy(); rounds[0].locked = true; rounds[2].locked = false;
      var o = _migrate(_state(21, rounds));
      _eq(o.residency.rounds.map(function (r) { return r.locked; }), [true, false, false], "mixed");
    }],
    ["T6 dates untouched", function () {
      var s = _state(21, _legacy());
      var before = s.residency.rounds.map(function (r) { return [r.startDate, r.endDate]; });
      var o = _migrate(s);
      _eq(o.residency.rounds.map(function (r) { return [r.startDate, r.endDate]; }), before, "dates");
    }],
    ["T7 durations untouched", function () {
      var s = _state(21, _legacy());
      var before = _durs(s.residency.rounds);
      var o = _migrate(s);
      _eq(_durs(o.residency.rounds), before, "durations");
    }],
    ["T8 unrelated preserved", function () {
      var s = _state(21, _legacy());
      s.customTop = { a: 1, deep: { x: [1,2,3] } };
      var bC = JSON.stringify(s.customTop);
      var bT = JSON.stringify(s.tasks);
      var bS = JSON.stringify(s.residency.subjects);
      var bB = JSON.stringify(s.residency.books);
      var bE = JSON.stringify(s.residency.enrollments);
      var bP = JSON.stringify(s.residency.plans);
      var bK = JSON.stringify(s.residency.rounds.map(function (r) { return r.customKeep; }));
      var o = _migrate(s);
      _eq(JSON.stringify(o.customTop), bC, "customTop");
      _eq(JSON.stringify(o.tasks), bT, "tasks");
      _eq(JSON.stringify(o.residency.subjects), bS, "subjects");
      _eq(JSON.stringify(o.residency.books), bB, "books");
      _eq(JSON.stringify(o.residency.enrollments), bE, "enrollments");
      _eq(JSON.stringify(o.residency.plans), bP, "plans");
      _eq(JSON.stringify(o.residency.rounds.map(function (r) { return r.customKeep; })), bK, "customKeep");
    }],
    ["T9 malformed safe", function () {
      _eq(_migrate(null), null, "null");
      _ok(_migrate(undefined) === undefined, "undefined");
      _eq(_migrate({ schemaVersion: 21 }).schemaVersion, 22, "no residency");
      _eq(_migrate({ schemaVersion: 21, residency: { rounds: "no" } }).schemaVersion, 22, "non-array");
      var s3 = _state(21, [null, 5, "x", _mkRound("r1", 1, "1405/7/1", "1405/7/5")]);
      var o3 = _migrate(s3);
      _eq(o3.residency.rounds[0], null, "null kept");
      _eq(o3.residency.rounds[1], 5, "5 kept");
      _eq(o3.residency.rounds[2], "x", "str kept");
      _eq(o3.residency.rounds[3].locked, false, "obj false");
    }],
    ["T10 non-bool -> false", function () {
      var rounds = _legacy();
      rounds[0].locked = "true"; rounds[1].locked = 1; rounds[2].locked = null;
      var o = _migrate(_state(21, rounds));
      _eq(o.residency.rounds.map(function (r) { return r.locked; }), [false, false, false], "canonicalized");
    }],
    ["T11 no scheduler invocation", function () {
      var SCH = R.roundScheduler; if (!SCH) return;
      var e = 0, n = 0;
      var oE = SCH.computeEdit, oN = SCH.computeNormalize;
      SCH.computeEdit = function () { e++; return oE.apply(this, arguments); };
      SCH.computeNormalize = function () { n++; return oN.apply(this, arguments); };
      try { _migrate(_state(21, _legacy())); }
      finally { SCH.computeEdit = oE; SCH.computeNormalize = oN; }
      _eq(e, 0, "computeEdit");
      _eq(n, 0, "computeNormalize");
    }]
  ];

  M.__tests = function () {
    if (!window.__os || typeof window.__os.migrateState !== "function") {
      return { passed: 0, total: TESTS.length, error: "hook missing: window.__os.migrateState" };
    }
    var out = [];
    for (var i = 0; i < TESTS.length; i++) {
      var pass = false, err = null;
      try { TESTS[i][1](); pass = true; } catch (e) { err = String(e && e.message || e); }
      out.push({ name: TESTS[i][0], passed: pass, error: err });
    }
    var p = out.filter(function (r) { return r.passed; }).length;
    return { passed: p, total: out.length, results: out };
  };

  console.log("[migration-v22-tests] loaded");
})();