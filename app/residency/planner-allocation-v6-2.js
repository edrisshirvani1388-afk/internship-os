/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Allocation Engine v6.2 (with 6.3 filter)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.allocation.v6.2] R missing"); return; }
  var PA = R.plannerAllocation = R.plannerAllocation || {};
  var LIB = window.InternshipLib;

  PA.minutesForPages = function (pages, pagesPerHour, basePages) {
    if (!pagesPerHour || pagesPerHour <= 0) return 0;
    var p = Math.max(0, pages | 0);
    var base = Math.max(0, (basePages | 0) || 0);

    // Phase 9 canonical rounding (fix 1-minute bug):
    //   delta = ceil((base+p)*60/PPH) - ceil(base*60/PPH)
    // guarantees sum over chunks == ceil(total_pages*60/PPH)
    if (base <= 0) {
      return Math.ceil(p / pagesPerHour * 60);
    }
    var total = Math.ceil((base + p) / pagesPerHour * 60);
    var baseMin = Math.ceil(base / pagesPerHour * 60);
    return total - baseMin;
  };
  PA.pagesForMinutes = function (minutes, pagesPerHour) {
    if (!pagesPerHour || pagesPerHour <= 0) return 0;
    var m = Math.max(0, minutes | 0);
    return Math.floor(m * pagesPerHour / 60);
  };

  function _cmp(a, b) {
    if (!LIB || !LIB.date) return 0;
    return LIB.date.compareJalaliDate(a, b);
  }
  function _today() {
    if (!LIB || !LIB.date) return "";
    return LIB.date.todayJalaliString();
  }
  function _consumesCapacity(status) {
    return status === "planned" || status === "in_progress" || status === "partial";
  }
  function _activityRemainingMin(a) {
    if (!a) return 0;
    var p = (a.plannedDurationMinutes != null) ? a.plannedDurationMinutes : 0;
    var ac = (a.actualDurationMinutes != null) ? a.actualDurationMinutes : 0;
    return Math.max(0, p - ac);
  }
  function _isEligible(d) {
    if (!d) return null;
    if (d.status === "active") return { eligible: true, optional: false };
    if (d.status === "optional") return { eligible: true, optional: true };
    return { eligible: false, optional: false };
  }
  function _priorityRank(p) {
    if (p === "high") return 3;
    if (p === "low") return 1;
    return 2;
  }

  function _detectRoundOverlaps(rounds) {
    var overlaps = [];
    for (var i = 0; i < rounds.length; i++) {
      for (var j = i + 1; j < rounds.length; j++) {
        var a = rounds[i], b = rounds[j];
        if (!a || !b || !a.startDate || !a.endDate || !b.startDate || !b.endDate) continue;
        if (_cmp(a.startDate, b.endDate) <= 0 && _cmp(b.startDate, a.endDate) <= 0) {
          overlaps.push({ type: "round_overlap", roundIds: [a.id, b.id], severity: "blocker" });
        }
      }
    }
    return overlaps;
  }

        PA.buildCapacityLedger = function (plannerInput, options) {
    options = options || {};
    if (!plannerInput) return { daily: [], deficits: [], warnings: [] };
    var deficits = [], warnings = [];
    _detectRoundOverlaps(plannerInput.rounds || []).forEach(function (o) { deficits.push(o); });

    var examDate = plannerInput.plan && plannerInput.plan.examDate || null;
    var today = _today();
    var committedByDate = {};
    
    (plannerInput.activities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      if (!_consumesCapacity(a.status)) return;
      if (today && _cmp(a.plannedDate, today) < 0) return;
      var remain = _activityRemainingMin(a);
      if (remain <= 0) return;
      committedByDate[a.plannedDate] = (committedByDate[a.plannedDate] || 0) + remain;
    });

    (plannerInput.nonResidencyConsumers || []).forEach(function (t) {
      if (!t || !t.date) return;
      if (t.completed) return;
      if (!t.durationMinutes || t.durationMinutes <= 0) return;
      if (today && _cmp(t.date, today) < 0) return;
      committedByDate[t.date] = (committedByDate[t.date] || 0) + t.durationMinutes;
    });

    var daily = [];
    (plannerInput.calendar || []).forEach(function (c) {
      if (!c || !c.roundId) return;
      if (examDate && _cmp(c.date, examDate) > 0) return;
      if (today && _cmp(c.date, today) < 0) return;
      
      /* [PATCH:f4b30-ledger] removed round endDate filter to allow gap days */
      var _uCaps = plannerInput.settings && plannerInput.settings.defaultCapacity;
      var _uPct = (plannerInput.settings && typeof plannerInput.settings.reservePercent === "number") ? plannerInput.settings.reservePercent : 10;
      var _dtMap = { "normal": "normal", "free": "free", "off": "off", "pre_shift": "preShift", "shift": "shift", "post_shift": "postShift" };
      var _cKey = _dtMap[c.dayType] || "normal";
      var _uCapRaw = (_uCaps && _uCaps[_cKey] != null) ? Number(_uCaps[_cKey]) : null;
      var capacity;
      if (_uCapRaw !== null && !isNaN(_uCapRaw)) {
        capacity = Math.max(0, _uCapRaw - Math.floor(_uCapRaw * _uPct / 100));
      } else {
        capacity = Math.max(0, c.finalCapacityMinutes | 0);
      }

      var committed = committedByDate[c.date] || 0;
      if (committed > capacity) committed = capacity;
      daily.push({
        date: c.date, roundId: c.roundId,
        capacityMinutes: capacity,
        committedMinutes: committed,
        allocatableMinutes: Math.max(0, capacity - committed),
        allocatedMinutes: 0,
        remainingMinutes: Math.max(0, capacity - committed)
      });
    });
    daily.sort(function (a, b) { return _cmp(a.date, b.date); });
    return { daily: daily, deficits: deficits, warnings: warnings };
  };;;;

  function _score(demand, remainingMin, totalFutureCap, options, strategyCtx) {
    var urgency = totalFutureCap > 0 ? (remainingMin / totalFutureCap) : 0;
    var orderBonus = (demand.studyOrder != null) ? Math.max(0, 10 - demand.studyOrder) : 0;
    var priBonus = _priorityRank(demand.bookPriority);
    var optPenalty = (demand.mode === "optional") ? -1 : 0;
    var w = (options && options.weights) || {};
    var uW = (typeof w.urgency === "number") ? w.urgency : 100;
    var oW = (typeof w.order === "number") ? w.order : 5;
    var pW = (typeof w.priority === "number") ? w.priority : 3;
    var base = urgency * uW + orderBonus * oW + priBonus * pW + optPenalty;

    // Phase 9: reading-strategy tie-breaker (small, deterministic)
    if (strategyCtx && strategyCtx.strategy && R.readingStrategy && R.readingStrategy.getPriority) {
      try {
        var prio = R.readingStrategy.getPriority(demand, strategyCtx);
        base += prio * 0.04;
      } catch (e) {}
    }
    return base;
  }

  /* ─── Try to allocate minutes on a specific day ─── */
  function _tryAllocate(PA, demand, day, maxMinutes, options, perDay, basePages) {
    if (maxMinutes < 1) return null;
    if (options && typeof options.constraintFilter === "function") {
      var alreadyD = perDay.byDemand[demand.id] || 0;
      var alreadyDate = perDay.byDate || 0;
      var filterResult = options.constraintFilter(demand, day, maxMinutes, {
        alreadyForDemand: alreadyD,
        alreadyForDate: alreadyDate
      });
      if (!filterResult || filterResult.allowed === false) {
        perDay.blocked[demand.id] = 1;
        return null;
      }
      if (typeof filterResult.maxMinutes === "number") {
        maxMinutes = Math.min(maxMinutes, filterResult.maxMinutes);
      }
    }
    if (maxMinutes < 1) { perDay.blocked[demand.id] = 1; return null; }
    var pages = PA.pagesForMinutes(maxMinutes, demand.pagesPerHour);
    if (pages < 1) { perDay.blocked[demand.id] = 1; return null; }
    var minutes = PA.minutesForPages(pages, demand.pagesPerHour, basePages || 0);
    return { minutes: minutes, pages: pages };
  }

  /* ─── Algorithmic ─── */
        function _allocateAlgorithmic(demandList, days, options, deficits, warnings, strategyCtx) {
    /* [PATCH:f6-seq-prop] Sequential + Proportional allocation */
    var allocations = [];
    var remainingMin = {};
    var allocatedPagesSoFar = {};
    demandList.forEach(function (x) {
      remainingMin[x.demand.id] = x.demand.estimatedRemainingMinutes;
      allocatedPagesSoFar[x.demand.id] = 0;
    });
    
    var totalFutureCap = days.reduce(function (s, d) { return s + d.allocatableMinutes; }, 0);
    var remainingCapacityMinutes = totalFutureCap;

    days.forEach(function (day, dayIndex) {
      var capLeft = day.allocatableMinutes;
      if (capLeft <= 0) return;

      var totalRemainingMin = 0;
      demandList.forEach(function(x) { totalRemainingMin += remainingMin[x.demand.id]; });
      if (totalRemainingMin <= 0) return;

      var dayMinBudget = remainingCapacityMinutes > 0
        ? Math.ceil(totalRemainingMin * (day.allocatableMinutes / remainingCapacityMinutes))
        : totalRemainingMin;

      var dayMinUsed = 0;
      var perDay = { byDemand: {}, byDate: 0, blocked: {} };
      var safety = 0;

      var _seq = !!(options && options.sequential);
      var _dayBookId = null;

      while (capLeft > 0 && safety < 500 && dayMinUsed < dayMinBudget) {
        safety++;
        var candidates = demandList.filter(function (x) {
          if (perDay.blocked[x.demand.id]) return false;
          if (remainingMin[x.demand.id] <= 0) return false;
          if (_seq && _dayBookId && x.demand.bookId !== _dayBookId) return false; /* Sequential lock */
          return true;
        });
        if (candidates.length === 0) break;

        if (_seq && !_dayBookId) {
          var _minOrd = 999999, _minBk = null;
          candidates.forEach(function (x) {
            var _o = (x.demand.studyOrder != null ? x.demand.studyOrder : 999999);
            if (_o < _minOrd) { _minOrd = _o; _minBk = x.demand.bookId; }
          });
          _dayBookId = _minBk;
          candidates = candidates.filter(function (x) { return x.demand.bookId === _minBk; });
          if (candidates.length === 0) break;
        }

        var _perDayCtx = strategyCtx ? Object.assign({}, strategyCtx, { dayIndex: dayIndex }) : null;
        candidates.sort(function (a, b) {
          var sa = _score(a.demand, remainingMin[a.demand.id], totalFutureCap, options, _perDayCtx);
          var sb = _score(b.demand, remainingMin[b.demand.id], totalFutureCap, options, _perDayCtx);
          if (Math.abs(sa - sb) > 0.0001) return sb - sa;
          var ta = a.demand.studyOrder != null ? a.demand.studyOrder : 9999;
          var tb = b.demand.studyOrder != null ? b.demand.studyOrder : 9999;
          if (ta !== tb) return ta - tb;
          var pa = _priorityRank(a.demand.bookPriority);
          var pb = _priorityRank(b.demand.bookPriority);
          if (pa !== pb) return pb - pa;
          if (remainingMin[b.demand.id] !== remainingMin[a.demand.id]) {
            return remainingMin[b.demand.id] - remainingMin[a.demand.id];
          }
          return (a.demand.enrollmentId || "").localeCompare(b.demand.enrollmentId || "");
        });

        var chosen = candidates[0];
        var _budgetMinLeft = dayMinBudget - dayMinUsed;
        if (_budgetMinLeft < 1) break;

        var maxAlloc = Math.min(capLeft, remainingMin[chosen.demand.id], _budgetMinLeft);
        if (maxAlloc < 1) break;

        var _baseP = allocatedPagesSoFar[chosen.demand.id] || 0;
        var got = _tryAllocate(PA, chosen.demand, day, maxAlloc, options, perDay, _baseP);
        if (!got) continue;

        if (got.minutes > capLeft) {
          got.pages--;
          if (got.pages < 1) { perDay.blocked[chosen.demand.id] = 1; continue; }
          got.minutes = PA.minutesForPages(got.pages, chosen.demand.pagesPerHour, _baseP);
        }

        allocations.push({
          demandId: chosen.demand.id,
          enrollmentId: chosen.demand.enrollmentId,
          roundId: chosen.demand.roundId,
          bookId: chosen.demand.bookId,
          date: day.date,
          allocatedMinutes: got.minutes,
          allocatedPages: got.pages,
          pagesPerHour: chosen.demand.pagesPerHour,
          allocationMode: "algorithmic",
          rank: 1,
          reason: "urgency_score"
        });

        perDay.byDemand[chosen.demand.id] = (perDay.byDemand[chosen.demand.id] || 0) + got.minutes;
        perDay.byDate += got.minutes;
        remainingMin[chosen.demand.id] -= got.minutes;
        allocatedPagesSoFar[chosen.demand.id] = _baseP + got.pages;
        dayMinUsed += got.minutes;
        capLeft -= got.minutes;
      }

      remainingCapacityMinutes -= day.allocatableMinutes;
    });
    
    return allocations;
  }

  /* ─── Equal ─── */
  function _allocateEqual(demandList, days, deficits, warnings, options) {
    var allocations = [];
    var remainingMin = {};
    demandList.forEach(function (x) { remainingMin[x.demand.id] = x.demand.estimatedRemainingMinutes; });

    var totalCap = days.reduce(function (s, d) { return s + d.allocatableMinutes; }, 0);
    if (totalCap === 0) return allocations;

    var targets = {};
    var ids = demandList.map(function (x) { return x.demand.id; });
    var share = totalCap / ids.length;

    ids.forEach(function (id) { targets[id] = Math.min(share, remainingMin[id]); });

    var excess = totalCap - ids.reduce(function (s, id) { return s + targets[id]; }, 0);
    var iter = 0;
    while (excess > 1 && iter < 30) {
      iter++;
      var cands = ids.filter(function (id) { return targets[id] < remainingMin[id]; });
      if (cands.length === 0) break;
      var addEach = excess / cands.length;
      var newExcess = 0;
      cands.forEach(function (id) {
        var room = remainingMin[id] - targets[id];
        var add = Math.min(addEach, room);
        targets[id] += add;
        newExcess += addEach - add;
      });
      if (Math.abs(newExcess - excess) < 0.5) break;
      excess = newExcess;
    }

    return _distributeTargets(PA, demandList, days, targets, "equal", remainingMin, options);
  }

  /* ─── Manual ─── */
  function _allocateManual(round, demandList, days, deficits, warnings, options) {
    var allocations = [];
    var manual = round.manualAllocation || {};
    var totalCap = days.reduce(function (s, d) { return s + d.allocatableMinutes; }, 0);
    var usedPct = 0, invalid = false;
    var targets = {}, seen = {};

    demandList.forEach(function (x) {
      var eid = x.demand.enrollmentId;
      var pct = manual[eid];
      if (pct == null) return;
      if (typeof pct !== "number" || pct < 0 || pct > 100) {
        deficits.push({ type: "manual_allocation_deficit", enrollmentId: eid, reason: "invalid_percentage", value: pct, severity: "error" });
        invalid = true; return;
      }
      if (seen[eid]) { deficits.push({ type: "manual_allocation_deficit", enrollmentId: eid, reason: "duplicate", severity: "error" }); invalid = true; return; }
      seen[eid] = 1;
      var raw = totalCap * pct / 100;
      targets[x.demand.id] = Math.min(raw, x.demand.estimatedRemainingMinutes);
      usedPct += pct;
    });

    if (invalid) return allocations;
    if (usedPct > 100) {
      deficits.push({ type: "manual_allocation_deficit", reason: "over_100", percent: usedPct, severity: "error" });
      return allocations;
    }
    if (usedPct < 100) {
      deficits.push({ type: "manual_allocation_deficit", reason: "unassigned", percent: 100 - usedPct, severity: "info" });
    }

    var remainingMin = {};
    demandList.forEach(function (x) { remainingMin[x.demand.id] = x.demand.estimatedRemainingMinutes; });
    return _distributeTargets(PA, demandList, days, targets, "manual", remainingMin, options);
  }

  function _distributeTargets(PA, demandList, days, targets, mode, remainingMin, options) {
    var allocations = [];
    var allocatedMin = {};
    var allocatedPagesSoFar = {};
    demandList.forEach(function (x) {
      allocatedMin[x.demand.id] = 0;
      allocatedPagesSoFar[x.demand.id] = 0;
    });

    days.forEach(function (day) {
      var capLeft = day.allocatableMinutes;
      var perDay = { byDemand: {}, byDate: 0, blocked: {} };
      var safety = 0;
      while (capLeft > 0 && safety < 500) {
        safety++;
        var candidates = demandList.filter(function (x) {
          if (perDay.blocked[x.demand.id]) return false;
          return (targets[x.demand.id] || 0) > allocatedMin[x.demand.id];
        });
        if (candidates.length === 0) break;

        candidates.sort(function (a, b) {
          var ta = a.demand.studyOrder != null ? a.demand.studyOrder : 9999;
          var tb = b.demand.studyOrder != null ? b.demand.studyOrder : 9999;
          if (ta !== tb) return ta - tb;
          var pa = _priorityRank(a.demand.bookPriority);
          var pb = _priorityRank(b.demand.bookPriority);
          if (pa !== pb) return pb - pa;
          return (a.demand.enrollmentId || "").localeCompare(b.demand.enrollmentId || "");
        });

        var chosen = candidates[0];
        var room = targets[chosen.demand.id] - allocatedMin[chosen.demand.id];
        var maxAlloc = Math.min(capLeft, room);
        var _baseP2 = allocatedPagesSoFar[chosen.demand.id] || 0;
        var got = _tryAllocate(PA, chosen.demand, day, maxAlloc, options, perDay, _baseP2);
        if (!got) continue;
        if (got.minutes > capLeft) {
          got.pages--;
          if (got.pages < 1) { perDay.blocked[chosen.demand.id] = 1; continue; }
          got.minutes = PA.minutesForPages(got.pages, chosen.demand.pagesPerHour, _baseP2);
        }

        allocations.push({
          demandId: chosen.demand.id,
          enrollmentId: chosen.demand.enrollmentId,
          roundId: chosen.demand.roundId,
          bookId: chosen.demand.bookId,
          date: day.date,
          allocatedMinutes: got.minutes,
          allocatedPages: got.pages,
          pagesPerHour: chosen.demand.pagesPerHour,
          allocationMode: mode,
          rank: 1,
          reason: "target_fill"
        });

        perDay.byDemand[chosen.demand.id] = (perDay.byDemand[chosen.demand.id] || 0) + got.minutes;
        perDay.byDate += got.minutes;
        allocatedMin[chosen.demand.id] += got.minutes;
        allocatedPagesSoFar[chosen.demand.id] = _baseP2 + got.pages;
        capLeft -= got.minutes;
      }
    });
    return allocations;
  }

  PA.allocateDemands = function (plannerInput, ledger, options) {
    options = options || {};
    var allocations = [], warnings = [], deficits = [];
    if (!plannerInput || !ledger) return { allocations: allocations, warnings: warnings, deficits: deficits };

    if ((ledger.deficits || []).some(function (d) { return d.type === "round_overlap"; })) {
      return { allocations: [], warnings: warnings, deficits: deficits };
    }

    var byRound = {};
    ledger.daily.forEach(function (d) {
      if (!byRound[d.roundId]) byRound[d.roundId] = [];
      byRound[d.roundId].push(d);
    });

    var byRoundDemand = {};
    (plannerInput.demands || []).forEach(function (d) {
      var e = _isEligible(d);
      if (!e || !e.eligible) return;
      if (!byRoundDemand[d.roundId]) byRoundDemand[d.roundId] = [];
      byRoundDemand[d.roundId].push({ demand: d, optional: e.optional });
    });

    (plannerInput.rounds || []).forEach(function (round) {
      if (!round) return;
      var days = byRound[round.id] || [];
      var demandList = byRoundDemand[round.id] || [];
      if (days.length === 0 || demandList.length === 0) return;

      var mode = round.allocationMode || "algorithmic";

      // Phase 9: build reading-strategy context for this round
      var _strategyCtx = null;
      if (R.readingStrategy && R.readingStrategy.resolve) {
        try {
          var _strategy = R.readingStrategy.resolve(plannerInput.settings, round, plannerInput.enrollments || []);
          _strategyCtx = {
            strategy: _strategy,
            demands: demandList.map(function (x) { return x.demand; }),
            round: round,
            enrollments: plannerInput.enrollments || []
          };
        } catch (e) { _strategyCtx = null; }
      }

      var roundAlloc = [];
      if (mode === "manual") roundAlloc = _allocateManual(round, demandList, days, deficits, warnings, options);
      else if (mode === "equal") roundAlloc = _allocateEqual(demandList, days, deficits, warnings, options);
      else roundAlloc = _allocateAlgorithmic(demandList, days, options, deficits, warnings, _strategyCtx);

      roundAlloc.forEach(function (a) {
        var day = days.find(function (d) { return d.date === a.date; });
        if (day) {
          day.allocatedMinutes += a.allocatedMinutes;
          day.remainingMinutes = Math.max(0, day.allocatableMinutes - day.allocatedMinutes);
        }
        allocations.push(a);
      });
    });

    return { allocations: allocations, warnings: warnings, deficits: deficits };
  };

  PA.buildAllocationResult = function (plannerInput, ledger, allocResult) {
    var allocations = (allocResult && allocResult.allocations) || [];
    var allDeficits = (ledger.deficits || []).concat((allocResult && allocResult.deficits) || []);
    var warnings = (ledger.warnings || []).concat((allocResult && allocResult.warnings) || []);

    var demandSummary = [];
    (plannerInput.demands || []).forEach(function (d) {
      var elig = _isEligible(d);
      if (!elig || !elig.eligible) {
        demandSummary.push({
          demandId: d.id, enrollmentId: d.enrollmentId,
          requiredPages: d.remainingPages, allocatedPages: 0, unmetPages: d.remainingPages,
          requiredMinutes: d.estimatedRemainingMinutes, allocatedMinutes: 0, unmetMinutes: d.estimatedRemainingMinutes,
          coveragePercent: 0, skipped: true, skippedReason: d.status
        });
        return;
      }
      var allocs = allocations.filter(function (a) { return a.demandId === d.id; });
      var allocP = allocs.reduce(function (s, a) { return s + a.allocatedPages; }, 0);
      var allocM = allocs.reduce(function (s, a) { return s + a.allocatedMinutes; }, 0);
      var reqP = d.remainingPages;
      var reqM = d.estimatedRemainingMinutes;
      var unmetP = Math.max(0, reqP - allocP);
      var unmetM = Math.max(0, reqM - allocM);
      var covPct = reqP > 0 ? Math.round(allocP / reqP * 100) : 100;
      demandSummary.push({
        demandId: d.id, enrollmentId: d.enrollmentId,
        requiredPages: reqP, allocatedPages: allocP, unmetPages: unmetP,
        requiredMinutes: reqM, allocatedMinutes: allocM, unmetMinutes: unmetM,
        coveragePercent: covPct
      });
      if (unmetP > 0 && reqP > 0) {
        allDeficits.push({
          type: "capacity_deficit", demandId: d.id, enrollmentId: d.enrollmentId,
          unmetPages: unmetP, unmetMinutes: unmetM, severity: "warning"
        });
      }
    });

    var totalCap = ledger.daily.reduce(function (s, d) { return s + d.capacityMinutes; }, 0);
    var committed = ledger.daily.reduce(function (s, d) { return s + d.committedMinutes; }, 0);
    var allocatable = ledger.daily.reduce(function (s, d) { return s + d.allocatableMinutes; }, 0);
    var allocated = allocations.reduce(function (s, a) { return s + a.allocatedMinutes; }, 0);
    var allocatedPages = allocations.reduce(function (s, a) { return s + a.allocatedPages; }, 0);
    var unmetPages = demandSummary.reduce(function (s, x) { return s + (x.unmetPages || 0); }, 0);

    return {
      version: 1,
      generatedAt: Date.now(),
      planId: plannerInput.planId,
      mode: plannerInput.mode,
      scope: plannerInput.scope,
      daily: ledger.daily,
      allocations: allocations,
      demandSummary: demandSummary,
      deficits: allDeficits,
      warnings: warnings,
      statistics: {
        totalCapacityMinutes: totalCap,
        committedMinutes: committed,
        allocatableMinutes: allocatable,
        allocatedMinutes: allocated,
        unusedMinutes: Math.max(0, allocatable - allocated),
        allocatedPages: allocatedPages,
        unmetPages: unmetPages
      },
      feasibility: { status: "not_checked" }
    };
  };

  PA.runAllocation = function (plannerInput, options) {
    options = options || {};
    var ledger = PA.buildCapacityLedger(plannerInput, options);
    var isBlocked = (ledger.deficits || []).some(function (d) { return d.type === "round_overlap"; });
    if (isBlocked) {
      var empty = PA.buildAllocationResult(plannerInput, ledger, { allocations: [], deficits: [], warnings: [] });
      empty.feasibility = { status: "blocked_by_hard_constraint", reasons: ["round_overlap"] };
      return empty;
    }
    var allocResult = PA.allocateDemands(plannerInput, ledger, options);
    var result = PA.buildAllocationResult(plannerInput, ledger, allocResult);
    result.feasibility = _computeFeasibility(result);
    return result;
  };

  function _computeFeasibility(result) {
    var hasError = (result.deficits || []).some(function (d) { return d.severity === "error" || d.severity === "blocker"; });
    if (hasError) return { status: "blocked_by_hard_constraint" };
    if (result.statistics.unmetPages > 0) return { status: "infeasible" };
    var hasWarn = (result.deficits || []).some(function (d) { return d.severity === "warning"; });
    return hasWarn ? { status: "feasible_with_warnings" } : { status: "feasible" };
  }

  /* ─── Phase 9: canonical rounding tests ─── */
  PA.__tests = function () {
    var t = [];

    // T1: single chunk (legacy compatible)
    var m1 = PA.minutesForPages(5, 20);
    t.push({ name: "T1 single chunk 5@20 = 15", ok: m1 === 15, got: m1 });

    // T2: delta chunking must sum to canonical total
    var chunkA = PA.minutesForPages(3, 40);
    var chunkB = PA.minutesForPages(3, 40, 3);
    var chunkC = PA.minutesForPages(4, 40, 6);
    var total = chunkA + chunkB + chunkC;
    var canonical = PA.minutesForPages(10, 40);
    t.push({ name: "T2 delta sum == canonical (10@40)", ok: total === canonical, got: total, expected: canonical });

    // T3: legacy (broken) would be 16 — verify we fixed it
    var legacySum = Math.ceil(3/40*60) + Math.ceil(3/40*60) + Math.ceil(4/40*60);
    t.push({ name: "T3 old formula was 16, new is 15", ok: legacySum === 16 && total === 15, legacy: legacySum, newTotal: total });

    // T4: no overflow — delta never exceeds maxMinutes
    var maxM = 7;
    var p7 = PA.pagesForMinutes(maxM, 40);  // = floor(7*40/60) = 4
    var d7 = PA.minutesForPages(p7, 40, 0);
    t.push({ name: "T4 no overflow (7min budget @40)", ok: d7 <= maxM, got: d7, max: maxM });

    // T5: large example (10k pages split in 100 chunks of 100)
    var totalPages = 10000;
    var pph = 40;
    var sum = 0;
    var accumulated = 0;
    for (var i = 0; i < 100; i++) {
      var m = PA.minutesForPages(100, pph, accumulated);
      sum += m;
      accumulated += 100;
    }
    var expectedMin = PA.minutesForPages(totalPages, pph);
    t.push({ name: "T5 10000 pages / 100 chunks", ok: sum === expectedMin, got: sum, expected: expectedMin });

    // T6: pagesForMinutes round-trip (integer boundary)
    var pr = PA.pagesForMinutes(45, 20);  // floor(45*20/60) = 15
    var mr = PA.minutesForPages(pr, 20);   // ceil(15*60/20) = 45
    t.push({ name: "T6 round-trip 45min@20 == 45", ok: pr === 15 && mr === 45, pages: pr, minutes: mr });

    return t;
  };

  console.log("[planner.allocation.v6.2] loaded");
})();