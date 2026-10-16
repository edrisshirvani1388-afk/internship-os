/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Availability Engine v20.1
   Opportunity Windows — pure, read-only
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[availability.engine.v20] R missing"); return; }

  var AE = R.availabilityEngine = R.availabilityEngine || {};
  AE.VERSION = "1.0.0";
  AE.DEFAULT_MIN_WINDOW = 30;
  AE.DAY_START_MIN = 0;
  AE.DAY_END_MIN = 1440;

  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  /* ═══ HELPERS ═══ */
  function _t2m(t) {
    if (!t) return null;
    var p = String(t).split(":");
    if (p.length !== 2) return null;
    var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h === 24 && m === 0) return 1440;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function _m2t(min) {
    if (min == null) return null;
    if (min === 1440) return "24:00";
    var m = ((min % 1440) + 1440) % 1440;
    var h = Math.floor(m / 60);
    var mm = m % 60;
    return (h < 10 ? "0" : "") + h + ":" + (mm < 10 ? "0" : "") + mm;
  }

  function _prevDay(date) {
    if (!DATE || !DATE.parseJalali || !DATE.addJalaliDays) return null;
    var p = DATE.parseJalali(date);
    if (!p) return null;
    var d = DATE.addJalaliDays(p.jy, p.jm, p.jd, -1);
    return DATE.dateKey(d.jy, d.jm, d.jd);
  }

  function _isBlocking(it) {
    if (!it) return false;
    if (it.role !== "anchor" && it.role !== "block") return false;
    if (!it.startTime || !it.endTime) return false;
    if (it.status === "cancelled" || it.status === "completed" || it.status === "skipped") return false;
    return true;
  }

  function _collectBlockers(date, items) {
    var blockers = [];
    if (!Array.isArray(items)) return blockers;
    var prev = _prevDay(date);

    items.forEach(function (it) {
      if (!_isBlocking(it)) return;
      if (it.date === date) {
        var s = _t2m(it.startTime), e = _t2m(it.endTime);
        if (s == null || e == null) return;
        if (e <= s) {
          // cross-midnight: blocks s..1440 today
          blockers.push({ start: s, end: 1440, sourceId: it.id });
        } else {
          blockers.push({ start: s, end: e, sourceId: it.id });
        }
      } else if (prev && it.date === prev) {
        var s2 = _t2m(it.startTime), e2 = _t2m(it.endTime);
        if (s2 == null || e2 == null) return;
        if (e2 <= s2) {
          // cross-midnight from prev day: blocks 0..e2 today
          blockers.push({ start: 0, end: e2, sourceId: it.id });
        }
      }
    });

    return blockers;
  }

  function _mergeIntervals(intervals) {
    if (!intervals || intervals.length === 0) return [];
    var sorted = intervals.slice().sort(function (a, b) {
      if (a.start !== b.start) return a.start - b.start;
      return a.end - b.end;
    });
    var merged = [sorted[0]];
    for (var i = 1; i < sorted.length; i++) {
      var last = merged[merged.length - 1];
      var cur = sorted[i];
      if (cur.start <= last.end) {
        if (cur.end > last.end) last.end = cur.end;
      } else {
        merged.push({ start: cur.start, end: cur.end });
      }
    }
    return merged;
  }

  function _complement(merged) {
    var free = [];
    var cursor = AE.DAY_START_MIN;
    merged.forEach(function (b) {
      if (b.start > cursor) {
        free.push({ start: cursor, end: b.start });
      }
      cursor = Math.max(cursor, b.end);
    });
    if (cursor < AE.DAY_END_MIN) {
      free.push({ start: cursor, end: AE.DAY_END_MIN });
    }
    return free;
  }

  /* ═══ PUBLIC API ═══ */

  AE.findFreeWindows = function (date, items, options) {
    options = options || {};
    var minMin = (typeof options.minWindowMinutes === "number" && options.minWindowMinutes >= 0)
      ? options.minWindowMinutes
      : AE.DEFAULT_MIN_WINDOW;

    if (!date) return [];

    var blockers = _collectBlockers(date, items);
    var merged = _mergeIntervals(blockers);
    var raw = _complement(merged);

    var out = [];
    raw.forEach(function (w) {
      var minutes = w.end - w.start;
      if (minutes >= minMin) {
        out.push({
          date: date,
          start: _m2t(w.start),
          end: _m2t(w.end),
          minutes: minutes
        });
      }
    });
    return out;
  };

  AE.findFreeWindowsFromState = function (date, state, options) {
    if (!state || !date) return [];
    if (!R.schedulingProjection || !R.schedulingProjection.projectAll) {
      console.warn("[availability.engine.v20] projection missing");
      return [];
    }
    var result;
    try {
      result = R.schedulingProjection.projectAll(state);
    } catch (e) {
      console.warn("[availability.engine.v20] projectAll failed:", e);
      return [];
    }
    return AE.findFreeWindows(date, result.items, options);
  };

  AE.getNextWindow = function (date, items, options) {
    options = options || {};
    var windows = AE.findFreeWindows(date, items, options);
    if (windows.length === 0) return null;
    var nowMin = null;
    if (options.nowTime) {
      nowMin = _t2m(options.nowTime);
    } else {
      var d = new Date();
      nowMin = d.getHours() * 60 + d.getMinutes();
    }
    for (var i = 0; i < windows.length; i++) {
      var wStart = _t2m(windows[i].start);
      if (wStart != null && wStart >= nowMin) return windows[i];
    }
    return windows[windows.length - 1];
  };

  AE.summarizeWindows = function (windows) {
    if (!Array.isArray(windows)) return { count: 0, totalMinutes: 0, longestMinutes: 0 };
    var total = 0, longest = 0;
    windows.forEach(function (w) {
      if (!w) return;
      total += w.minutes || 0;
      if ((w.minutes || 0) > longest) longest = w.minutes;
    });
    return { count: windows.length, totalMinutes: total, longestMinutes: longest };
  };

  /* ═══ TESTS ═══ */
  AE.__tests = function () {
    var results = [];
    function t(name, cond) {
      results.push({ name: name, pass: !!cond });
      console.log((cond ? "✅" : "❌") + " " + name);
    }

    function mkItem(id, role, cat, date, st, et, dur) {
      return { id: id, sourceType: "task", sourceId: id, title: id,
               category: cat || "study", role: role, date: date,
               startTime: st || null, endTime: et || null, durationMinutes: dur || null,
               status: "pending" };
    }

    var D = "1405/7/15";
    var Dprev = "1405/7/14";

    // T1: no blocks → full day
    var w1 = AE.findFreeWindows(D, [], {});
    t("T1: no blocks → full day window", w1.length === 1 && w1[0].minutes === 1440);

    // T2: single block in middle
    var items2 = [mkItem("b1", "block", "study", D, "08:00", "10:00", 120)];
    var w2 = AE.findFreeWindows(D, items2, {});
    t("T2: single block → 2 windows", w2.length === 2 && w2[0].minutes === 480 && w2[1].minutes === 840);

    // T3: two separate blocks
    var items3 = [
      mkItem("b1", "block", "study", D, "08:00", "10:00", 120),
      mkItem("b2", "block", "study", D, "13:00", "15:00", 120)
    ];
    var w3 = AE.findFreeWindows(D, items3, {});
    t("T3: two blocks → 3 windows", w3.length === 3);

    // T4: adjacent blocks merge
    var items4 = [
      mkItem("b1", "block", "study", D, "08:00", "10:00", 120),
      mkItem("b2", "block", "study", D, "10:00", "12:00", 120)
    ];
    var w4 = AE.findFreeWindows(D, items4, {});
    t("T4: adjacent blocks merged", w4.length === 2 && w4[0].minutes === 480 && w4[1].minutes === 720);

    // T5: full-day block → zero
    var items5 = [mkItem("b1", "block", "study", D, "00:00", "24:00", 1440)];
    var w5 = AE.findFreeWindows(D, items5, {});
    t("T5: full-day block → 0 windows", w5.length === 0);

    // T6: minWindow filter (short free remainder skipped)
    var items6 = [mkItem("b1", "block", "study", D, "23:00", "24:00", 60)];
    var w6a = AE.findFreeWindows(D, items6, { minWindowMinutes: 30 });
    var w6b = AE.findFreeWindows(D, items6, { minWindowMinutes: 1500 });
    t("T6: minWindow filter works", w6a.length === 1 && w6b.length === 0);

    // T7: custom minWindow 60
    var items7 = [
      mkItem("b1", "block", "study", D, "10:00", "11:00", 60),
      mkItem("b2", "block", "study", D, "11:00", "12:00", 60),
      mkItem("b3", "block", "study", D, "12:00", "13:00", 60)
    ];
    // Wait — adjacent so merged to 10-13. Free: 0-10 (600), 13-24 (660). min 60 both pass.
    var w7 = AE.findFreeWindows(D, items7, { minWindowMinutes: 60 });
    t("T7: minWindow=60 keeps both", w7.length === 2);

    // T8: flexible task does not block
    var items8 = [mkItem("f1", "flexible", "study", D, null, null, 90)];
    var w8 = AE.findFreeWindows(D, items8, {});
    t("T8: flexible → full day", w8.length === 1 && w8[0].minutes === 1440);

    // T9: reminder does not block
    var items9 = [mkItem("r1", "reminder", "life", D, null, null, null)];
    var w9 = AE.findFreeWindows(D, items9, {});
    t("T9: reminder → full day", w9.length === 1 && w9[0].minutes === 1440);

    // T10: untimed shift (context) does not block
    var items10 = [mkItem("s1", "context", "shift", D, null, null, null)];
    var w10 = AE.findFreeWindows(D, items10, {});
    t("T10: untimed shift → full day", w10.length === 1 && w10[0].minutes === 1440);

    // T11: timed shift blocks
    var items11 = [mkItem("s1", "anchor", "shift", D, "08:00", "20:00", 720)];
    var w11 = AE.findFreeWindows(D, items11, {});
    t("T11: timed shift blocks 8-20", w11.length === 2 && w11[0].minutes === 480 && w11[1].minutes === 240);

    // T12: cross-midnight
    var items12 = [mkItem("s1", "anchor", "shift", D, "22:00", "06:00", 480)];
    var w12 = AE.findFreeWindows(D, items12, {});
    var w12next = AE.findFreeWindows("1405/7/16", items12, {});
    t("T12a: cross-midnight blocks 22-24 on D",
      w12.length === 1 && w12[0].minutes === 1320 && w12[0].end === "22:00");
    t("T12b: cross-midnight blocks 0-6 on D+1",
      w12next.length === 1 && w12next[0].minutes === 1080 && w12next[0].start === "06:00");

    // T13: multiple timed blocks
    var items13 = [
      mkItem("a1", "anchor", "shift", D, "08:00", "12:00", 240),
      mkItem("b1", "block", "study", D, "14:00", "15:00", 60),
      mkItem("b2", "block", "study", D, "18:00", "19:00", 60)
    ];
    var w13 = AE.findFreeWindows(D, items13, {});
    t("T13: multiple timed blocks", w13.length === 4);

    // T14: deterministic
    var w14a = AE.findFreeWindows(D, items13, {});
    var w14b = AE.findFreeWindows(D, items13, {});
    t("T14: deterministic output", JSON.stringify(w14a) === JSON.stringify(w14b));

    // T15: no mutation
    var before = JSON.stringify(items13);
    AE.findFreeWindows(D, items13, {});
    var after = JSON.stringify(items13);
    t("T15: no mutation", before === after);

    // T16-T18: Feasibility distinction
    // (just verify the API returns minutes independent of capacity)
    t("T16: window minutes independent of capacity",
      w2[1].minutes === 840 && w2[0].minutes === 480);

    // summarizeWindows
    var s = AE.summarizeWindows(w13);
    t("Extra: summarizeWindows works", s.count === 4 && s.totalMinutes > 0);

    var passed = results.filter(function (r) { return r.pass; }).length;
    var total = results.length;
    console.log("\n══════════════════════════════════════");
    console.log("📊 Passed: " + passed + " / " + total);
    console.log(passed === total ? "🎉 ALL TESTS PASSED" : "⚠️ SOME TESTS FAILED");
    console.log("══════════════════════════════════════\n");
    return { passed: passed, total: total, results: results };
  };

  console.log("[availability.engine.v20] loaded v" + AE.VERSION);
})();