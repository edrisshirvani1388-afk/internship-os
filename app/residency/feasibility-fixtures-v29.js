/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Feasibility Golden Fixtures v29.1
   Phase 29.1 — Audit-only. No production behavior change.
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[feasibility.fixtures.v29.1] R missing"); return; }
  var LIB = window.InternshipLib;
  if (!LIB || !LIB.date) { console.warn("[feasibility.fixtures.v29.1] lib.date missing"); return; }
  var DATE = LIB.date;

  var FX = R.feasibilityFixtures = R.feasibilityFixtures || {};
  FX.VERSION = "1.0.0";

  /* ─── Helpers ─── */
  function _addDays(dateStr, offset) {
    var p = DATE.parseJalali(dateStr);
    if (!p) return null;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, offset);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  function _mkMockState(opts) {
    var startDate = opts.startDate;
    var dayCount = opts.dayCount;
    var shiftOffsets = opts.shiftOffsets || [];
    var capacities = opts.capacities;
    var reservePercent = opts.reservePercent != null ? opts.reservePercent : 0;

    var endDate = _addDays(startDate, dayCount - 1);
    var shifts = [];
    for (var i = 0; i < shiftOffsets.length; i++) {
      var d = _addDays(startDate, shiftOffsets[i]);
      shifts.push({
        id: "fx-sh" + i,
        date: d,
        startTime: "22:00",
        endTime: "06:00"
      });
    }

    return {
      shifts: shifts,
      rotations: [{
        id: "fx-rot",
        title: "Fixture Rotation",
        startDate: startDate,
        endDate: endDate,
        activitySchedule: {}
      }],
      tasks: [],
      residency: {
        activities: [],
        dayOverrides: [],
        settings: {
          weekdayDefaults: {
            saturday: "normal", sunday: "normal", monday: "normal",
            tuesday: "normal", wednesday: "normal", thursday: "normal",
            friday: "normal"
          }
        },
        capacityProfiles: [{
          id: "fx-profile",
          scopeType: "global",
          capacities: capacities,
          reservePercent: reservePercent
        }]
      }
    };
  }

  function _runFixture(mockState, startDate, endDate) {
    var savedOS = window.__os;
    var savedProjectDate = null;
    var hasProjection = R.schedulingProjection &&
                        typeof R.schedulingProjection.projectDate === "function";
    if (hasProjection) {
      savedProjectDate = R.schedulingProjection.projectDate;
      R.schedulingProjection.projectDate = function () { return []; };
    }

    window.__os = { getState: function () { return mockState; } };

    var ctxs = [];
    try {
      ctxs = R.calendar.getResidencyCalendarContext(startDate, endDate, null);
    } finally {
      window.__os = savedOS;
      if (hasProjection) R.schedulingProjection.projectDate = savedProjectDate;
    }
    return ctxs;
  }

  function _summarize(ctxs) {
    var out = {
      days: ctxs.length,
      raw: 0,
      reserve: 0,
      effective: 0,
      byDayType: {}
    };
    ctxs.forEach(function (c) {
      out.raw += c.rawCapacityMinutes | 0;
      out.reserve += c.reserveMinutes | 0;
      out.effective += c.finalCapacityMinutes | 0;
      var dt = c.dayType || "?";
      out.byDayType[dt] = (out.byDayType[dt] || 0) + 1;
    });
    return out;
  }

  /* ─── Fixture A: raw capacity without reserve ─── */
  FX.fixtureA = function () {
    var CAPS = { normal: 180, free: 180, off: 0, preShift: 60, shift: 0, postShift: 60 };
    var startDate = "1405/08/01";
    var dayCount = 28;

    function run(shiftOffsets) {
      var st = _mkMockState({
        startDate: startDate, dayCount: dayCount,
        shiftOffsets: shiftOffsets,
        capacities: CAPS, reservePercent: 0
      });
      var endDate = _addDays(startDate, dayCount - 1);
      var ctxs = _runFixture(st, startDate, endDate);
      return _summarize(ctxs);
    }

    return {
      caps: CAPS,
      reservePercent: 0,
      four:  run([2, 6, 10, 14]),
      six:   run([2, 6, 10, 14, 18, 22]),
      eight: run([2, 5, 8, 11, 14, 17, 20, 23])
    };
  };

  /* ─── Fixture B: with daily reserve 10% ─── */
  FX.fixtureB = function () {
    var CAPS = { normal: 180, free: 180, off: 0, preShift: 60, shift: 0, postShift: 60 };
    var startDate = "1405/08/01";
    var dayCount = 28;

    function run(shiftOffsets) {
      var st = _mkMockState({
        startDate: startDate, dayCount: dayCount,
        shiftOffsets: shiftOffsets,
        capacities: CAPS, reservePercent: 10
      });
      var endDate = _addDays(startDate, dayCount - 1);
      var ctxs = _runFixture(st, startDate, endDate);
      return _summarize(ctxs);
    }

    return {
      caps: CAPS,
      reservePercent: 10,
      plain: run([]),
      four:  run([2, 6, 10, 14]),
      six:   run([2, 6, 10, 14, 18, 22]),
      eight: run([2, 5, 8, 11, 14, 17, 20, 23])
    };
  };

  /* ─── Tests ─── */
  FX.__tests = function () {
    var results = [];
    function t(name, cond, info) {
      results.push({ name: name, pass: !!cond, info: info });
      console.log((cond ? "OK  " : "FAIL") + "  " + name);
    }

    var a = FX.fixtureA();
    var b = FX.fixtureB();

    /* ─── Fixture A ─── */
    t("A-1  4 shifts -> 56h raw (3360 min)",
      a.four.raw === 3360, a.four);
    t("A-2  6 shifts -> 42h raw (2520 min)",
      a.six.raw === 2520, a.six);
    t("A-3  8 shifts -> 28h raw (1680 min)",
      a.eight.raw === 1680, a.eight);
    t("A-4  4-shift dayType counts (4 shift / 4 post_shift / 4 pre_shift / 16 normal)",
      a.four.byDayType.shift === 4 &&
      a.four.byDayType.post_shift === 4 &&
      a.four.byDayType.pre_shift === 4 &&
      a.four.byDayType.normal === 16,
      a.four.byDayType);
    t("A-5  reservePercent=0 -> reserve=0 and raw=effective",
      a.four.reserve === 0 && a.four.raw === a.four.effective,
      { raw: a.four.raw, eff: a.four.effective, reserve: a.four.reserve });

    /* ─── Fixture B ─── */
    t("B-1  28 plain days -> 75.6h effective (4536 min)",
      b.plain.effective === 4536, b.plain);
    t("B-2  4 shifts -> 50.4h effective (3024 min)",
      b.four.effective === 3024, b.four);
    t("B-3  6 shifts -> 37.8h effective (2268 min)",
      b.six.effective === 2268, b.six);
    t("B-4  8 shifts -> 25.2h effective (1512 min)",
      b.eight.effective === 1512, b.eight);
    t("B-5  reserve = raw - effective (all three cases)",
      (b.four.raw - b.four.effective) === b.four.reserve &&
      (b.six.raw - b.six.effective) === b.six.reserve &&
      (b.eight.raw - b.eight.effective) === b.eight.reserve,
      { four: { raw: b.four.raw, eff: b.four.effective, res: b.four.reserve } });
    t("B-6  per-day floor reserve (16*18 + 4*6 + 4*0 + 4*6 = 336)",
      b.four.reserve === 336, { computed: b.four.reserve, expected: 336 });

    /* ─── Side-effect ─── */
    t("S-1  window.__os restored after fixture run",
      window.__os && typeof window.__os.getState === "function",
      typeof window.__os);

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n======================================");
    console.log("Passed: " + passed + " / " + total);
    console.log(passed === total ? "ALL FIXTURES PASSED" : "SOME FIXTURES FAILED");
    console.log("======================================\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[feasibility.fixtures.v29.1] loaded v" + FX.VERSION);
})();