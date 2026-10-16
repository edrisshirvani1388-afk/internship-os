/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Analytics Workload v9
   Daily load + capacity + utilization
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[analytics.workload.v9] R missing"); return; }
  var W = R.analyticsWorkload = R.analyticsWorkload || {};
  var LIB = window.InternshipLib;

  function _cmp(a, b) { return LIB && LIB.date ? LIB.date.compareJalaliDate(a, b) : 0; }
  function _today() { return LIB && LIB.date ? LIB.date.todayJalaliString() : ""; }
  function _pct(n, d) { return (!d || d === 0) ? 0 : Math.round((n / d) * 100); }

  /* ─── Workload Summary ─── */
  W.workloadSummary = function (activities, shifts, range) {
    var byDate = {};
    var today = _today();

    // Aggregate planned vs actual minutes per day
    (activities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      if (!byDate[a.plannedDate]) {
        byDate[a.plannedDate] = { date: a.plannedDate, planned: 0, actual: 0, count: 0 };
      }
      byDate[a.plannedDate].planned += (a.plannedDurationMinutes | 0);
      byDate[a.plannedDate].actual += (a.actualDurationMinutes | 0);
      byDate[a.plannedDate].count++;
    });

    // Add shift days (for utilization context)
    var shiftDates = {};
    (shifts || []).forEach(function (sh) {
      if (sh && sh.date) shiftDates[sh.date] = 1;
    });

    // Calculate daily stats
    var days = Object.keys(byDate).map(function (k) { return byDate[k]; });
    days.sort(function (a, b) { return _cmp(a.date, b.date); });

    var totalPlanned = 0, totalActual = 0, peak = 0, peakDate = null;
    var overloadDays = 0, lowLoadDays = 0, zeroDays = 0;
    var sessionsCount = 0;

    days.forEach(function (d) {
      totalPlanned += d.planned;
      totalActual += d.actual;
      if (d.planned > peak) { peak = d.planned; peakDate = d.date; }
      if (d.planned > 240) overloadDays++;
      if (d.planned > 0 && d.planned < 30) lowLoadDays++;
      if (d.planned === 0) zeroDays++;
      sessionsCount += d.count;
    });

    var avgPlanned = days.length > 0 ? Math.round(totalPlanned / days.length) : 0;
    var avgActual  = days.length > 0 ? Math.round(totalActual / days.length) : 0;

    // Variance
    var variance = 0;
    if (days.length > 0) {
      var sumSq = 0;
      days.forEach(function (d) { sumSq += Math.pow(d.planned - avgPlanned, 2); });
      variance = Math.round(sumSq / days.length);
    }

    return {
      totalDays: days.length,
      totalPlannedMinutes: totalPlanned,
      totalActualMinutes: totalActual,
      averageDailyMinutes: avgPlanned,
      averageActualMinutes: avgActual,
      peakDailyMinutes: peak,
      peakDate: peakDate,
      overloadedDays: overloadDays,
      underutilizedDays: lowLoadDays,
      emptyDays: zeroDays,
      workloadVariance: variance,
      sessionsPerDay: days.length > 0 ? Math.round(sessionsCount / days.length * 10) / 10 : 0,
      daily: days
    };
  };

  /* ─── Capacity Analytics (reads from calendar contexts) ─── */
  W.capacityAnalysis = function (plannerInput) {
    if (!plannerInput || !plannerInput.calendar) {
      return { totalCapacityMinutes: 0, totalAvailableMinutes: 0, days: 0, avgDaily: 0 };
    }
    var totalCap = 0, totalAvail = 0;
    plannerInput.calendar.forEach(function (c) {
      totalCap += (c.finalCapacityMinutes | 0);
      totalAvail += (c.availableCapacityMinutes | 0);
    });
    return {
      totalCapacityMinutes: totalCap,
      totalAvailableMinutes: totalAvail,
      days: plannerInput.calendar.length,
      avgDaily: plannerInput.calendar.length > 0
        ? Math.round(totalCap / plannerInput.calendar.length)
        : 0,
      utilizationByDay: plannerInput.calendar.map(function (c) {
        return {
          date: c.date,
          capacity: c.finalCapacityMinutes | 0,
          available: c.availableCapacityMinutes | 0,
          dayType: c.dayType || "normal"
        };
      })
    };
  };

  /* ─── Utilization vs allocated ─── */
  W.utilization = function (allocationResult) {
    if (!allocationResult || !allocationResult.statistics) {
      return { utilPercent: 0, allocatedMinutes: 0, allocatableMinutes: 0, unusedMinutes: 0 };
    }
    var st = allocationResult.statistics;
    return {
      allocatedMinutes: st.allocatedMinutes | 0,
      allocatableMinutes: st.allocatableMinutes | 0,
      unusedMinutes: st.unusedMinutes | 0,
      utilPercent: _pct(st.allocatedMinutes, st.allocatableMinutes)
    };
  };

  console.log("[analytics.workload.v9] loaded");
})();