/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Round Scheduler v22
   Pure, deterministic round date computation
   Phase 22.0 — NO UI, NO STORE, NO STATE, NO MIGRATION
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[round-scheduler.v22] R missing"); return; }
  var SCH = R.roundScheduler = R.roundScheduler || {};
  SCH.VERSION = "1.0.0";
  SCH.MIN_DURATION = 1;

  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  if (!DATE) {
    console.warn("[round-scheduler.v22] date lib missing");
    return;
  }

  /* ─── Jalali day arithmetic helpers ─── */
  var _BASE_DATE = "1400/1/1";
  var _BASE_DAY = null;

  function _baseDay() {
    if (_BASE_DAY === null) {
      var p = DATE.parseJalali(_BASE_DATE);
      _BASE_DAY = p ? DATE.jalaliToDayNumber(p.jy, p.jm, p.jd) : 0;
    }
    return _BASE_DAY;
  }

  function _dayNum(dateStr) {
    if (!dateStr) return null;
    var p = DATE.parseJalali(dateStr);
    if (!p) return null;
    return DATE.jalaliToDayNumber(p.jy, p.jm, p.jd);
  }

  function _dateFromDayNum(d) {
    if (d === null || d === undefined) return null;
    var p = DATE.parseJalali(_BASE_DATE);
    if (!p) return null;
    var delta = d - _baseDay();
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, delta);
    if (!r) return null;
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  function _duration(round) {
    var s = _dayNum(round.startDate);
    var e = _dayNum(round.endDate);
    if (s === null || e === null) return null;
    if (e < s) return null;
    return e - s + 1;
  }

  function _cloneRounds(rounds) {
    return rounds.map(function (r) {
      return {
        id: r.id,
        order: (typeof r.order === "number") ? r.order : 0,
        startDate: r.startDate,
        endDate: r.endDate,
        locked: r.locked === true
      };
    });
  }

  function _toProposalRound(r) {
    var d = _duration(r);
    return {
      id: r.id, order: r.order,
      startDate: r.startDate, endDate: r.endDate,
      duration: d, locked: r.locked === true
    };
  }

  function _isLocked(round, options) {
    if (options && Array.isArray(options.lockedRounds)) {
      return options.lockedRounds.indexOf(round.id) >= 0;
    }
    return round.locked === true;
  }

  function _sortedByOrder(rounds) {
    return rounds.slice().sort(function (a, b) {
      var oa = (typeof a.order === "number") ? a.order : 0;
      var ob = (typeof b.order === "number") ? b.order : 0;
      return oa - ob;
    });
  }

  function _err(status, reason, issues) {
    return {
      status: status,
      reason: reason,
      proposal: null,
      issues: issues || null,
      validation: { ok: false, errors: [reason] }
    };
  }

  /* ═════ Public: simple helpers ═════ */

  SCH.durations = function (rounds) {
    if (!Array.isArray(rounds)) return [];
    return rounds.map(_duration);
  };

  SCH.totalSpan = function (rounds, examDate) {
    if (!Array.isArray(rounds) || rounds.length === 0) return 0;
    if (!examDate) return 0;
    var first = _dayNum(rounds[0].startDate);
    var last = _dayNum(examDate) - 1;
    if (first === null || last === null) return 0;
    return last - first + 1;
  };

  SCH.buildIntervals = function (rounds, examDate) {
    if (!Array.isArray(rounds) || rounds.length === 0) return [];
    return _buildIntervals(rounds, examDate);
  };

  SCH.isHealthy = function (rounds, examDate) {
    if (!Array.isArray(rounds) || rounds.length === 0) return false;
    var issues = _detectIssues(rounds, examDate, {});
    return issues.length === 0;
  };

  SCH.detectIssues = function (rounds, examDate, options) {
    return _detectIssues(rounds, examDate, options || {});
  };

  /* ═════ Internal: intervals ═════ */

  function _buildIntervals(rounds, examDate) {
    if (rounds.length === 0) return [];
    var sorted = _sortedByOrder(rounds);
    var examEnd = examDate ? (_dayNum(examDate) - 1) : null;
    var firstStart = _dayNum(sorted[0].startDate);
    var intervals = [];
    var cursor = firstStart;
    var currentFlex = [];
    var prevRound = null;

    for (var i = 0; i < sorted.length; i++) {
      var r = sorted[i];
      if (r.locked === true) {
        intervals.push({
          index: intervals.length,
          start: cursor,
          end: _dayNum(r.startDate) - 1,
          flexIds: currentFlex.slice(),
          before: prevRound ? prevRound.id : "firstStart",
          beforeLocked: prevRound ? prevRound.locked === true : false,
          after: r.id,
          afterLocked: true
        });
        currentFlex = [];
        cursor = _dayNum(r.endDate) + 1;
      } else {
        currentFlex.push(r.id);
      }
      prevRound = r;
    }

    intervals.push({
      index: intervals.length,
      start: cursor,
      end: examEnd,
      flexIds: currentFlex.slice(),
      before: prevRound ? prevRound.id : "firstStart",
      beforeLocked: prevRound ? prevRound.locked === true : false,
      after: examEnd !== null ? "examDate" : null,
      afterLocked: examEnd !== null
    });

    return intervals;
  }

  /* ═════ Internal: issue detection ═════ */

  function _detectIssues(rounds, examDate, options) {
    var issues = [];
    if (!Array.isArray(rounds) || rounds.length === 0) {
      issues.push({ type: "empty_rounds", severity: "invalid" });
      return issues;
    }

    var sorted = _sortedByOrder(rounds);

    // duplicate / missing order
    var seenOrders = {};
    for (var oi = 0; oi < sorted.length; oi++) {
      var oKey = sorted[oi].order;
      if (oKey === null || oKey === undefined) {
        issues.push({ type: "missing_order", roundId: sorted[oi].id, severity: "invalid" });
        continue;
      }
      if (seenOrders[oKey]) {
        issues.push({ type: "duplicate_order", order: oKey, severity: "invalid" });
      }
      seenOrders[oKey] = 1;
    }

    // date validity
    for (var di = 0; di < sorted.length; di++) {
      var r = sorted[di];
      var s = _dayNum(r.startDate);
      var e = _dayNum(r.endDate);
      if (s === null || e === null) {
        issues.push({ type: "invalid_date", roundId: r.id, severity: "invalid" });
        continue;
      }
      if (e < s) {
        issues.push({ type: "start_after_end", roundId: r.id, severity: "invalid" });
      }
    }

    var hasInvalid = issues.some(function (i) { return i.severity === "invalid"; });
    if (hasInvalid) return issues;

    // exam boundary
    if (examDate) {
      var examNum = _dayNum(examDate);
      if (examNum === null) {
        issues.push({ type: "invalid_exam_date", severity: "invalid" });
        return issues;
      }
      var firstNum = _dayNum(sorted[0].startDate);
      if (examNum <= firstNum) {
        issues.push({ type: "exam_before_start", severity: "invalid" });
        return issues;
      }
    }

    // locked overlap
    var lockedList = sorted.filter(function (rr) { return _isLocked(rr, options); });
    for (var li = 0; li < lockedList.length; li++) {
      for (var lj = li + 1; lj < lockedList.length; lj++) {
        var la = lockedList[li], lb = lockedList[lj];
        var laS = _dayNum(la.startDate), laE = _dayNum(la.endDate);
        var lbS = _dayNum(lb.startDate), lbE = _dayNum(lb.endDate);
        if (laS <= lbE && lbS <= laE) {
          issues.push({ type: "locked_overlap", roundIds: [la.id, lb.id], severity: "invalid" });
        }
      }
    }

    // locked before start / after exam
    var firstStartNum = _dayNum(sorted[0].startDate);
    for (var lk = 0; lk < sorted.length; lk++) {
      if (_isLocked(sorted[lk], options)) {
        var lkS = _dayNum(sorted[lk].startDate);
        var lkE = _dayNum(sorted[lk].endDate);
        if (lkS < firstStartNum) {
          issues.push({ type: "locked_before_start", roundId: sorted[lk].id, severity: "invalid" });
        }
        if (examDate) {
          var examEndNum = _dayNum(examDate) - 1;
          if (lkE > examEndNum) {
            issues.push({ type: "locked_after_exam", roundId: sorted[lk].id, severity: "invalid" });
          }
        }
      }
    }

    var hasInvalid2 = issues.some(function (i) { return i.severity === "invalid"; });
    if (hasInvalid2) return issues;

    // chain: gaps & overlaps
    for (var ci = 0; ci < sorted.length - 1; ci++) {
      var ra = sorted[ci], rb = sorted[ci + 1];
      var endA = _dayNum(ra.endDate);
      var startB = _dayNum(rb.startDate);
      if (startB > endA + 1) {
        issues.push({
          type: "gap",
          betweenIds: [ra.id, rb.id],
          days: startB - endA - 1,
          severity: "unhealthy"
        });
      } else if (startB <= endA) {
        issues.push({
          type: "overlap",
          betweenIds: [ra.id, rb.id],
          days: endA - startB + 1,
          severity: "unhealthy"
        });
      }
    }

    // exam boundary mismatch
    if (examDate) {
      var lastRound = sorted[sorted.length - 1];
      var lastEnd = _dayNum(lastRound.endDate);
      var expected = _dayNum(examDate) - 1;
      if (lastEnd !== expected) {
        issues.push({
          type: "exam_mismatch",
          lastEnd: lastRound.endDate,
          expected: _dateFromDayNum(expected),
          delta: expected - lastEnd,
          severity: "unhealthy"
        });
      }
    }

    return issues;
  }

  /* ═════ Internal: distribution ═════ */

  function _distributeDelta(flexRounds, delta) {
    if (delta === 0) {
      var copy0 = {};
      flexRounds.forEach(function (r) { copy0[r.id] = r.duration; });
      return { ok: true, newDurations: copy0 };
    }

    if (flexRounds.length === 0) {
      return { ok: false, reason: "no_flex" };
    }

    var newDur = {};
    flexRounds.forEach(function (r) { newDur[r.id] = r.duration; });

    if (delta > 0) {
      var sum = flexRounds.reduce(function (s, r) { return s + r.duration; }, 0);
      if (sum === 0) {
        var per = Math.floor(delta / flexRounds.length);
        var rem0 = delta - per * flexRounds.length;
        flexRounds.forEach(function (r, idx) {
          newDur[r.id] = per + (idx < rem0 ? 1 : 0);
        });
      } else {
        var shares = flexRounds.map(function (r) {
          var exact = (r.duration / sum) * delta;
          var base = Math.floor(exact);
          return { id: r.id, base: base, frac: exact - base, order: r.order };
        });
        var distributed = shares.reduce(function (s, sh) { return s + sh.base; }, 0);
        var remainder = delta - distributed;

        shares.sort(function (a, b) {
          if (Math.abs(a.frac - b.frac) > 1e-9) return b.frac - a.frac;
          return a.order - b.order;
        });

        for (var i = 0; i < remainder; i++) {
          shares[i].base++;
        }

        shares.forEach(function (sh) {
          newDur[sh.id] = newDur[sh.id] + sh.base;
        });
      }
    } else {
      var toRemove = -delta;
      var current = flexRounds.map(function (r) {
        return { id: r.id, duration: r.duration, order: r.order };
      });
      current.sort(function (a, b) {
        if (a.duration !== b.duration) return b.duration - a.duration;
        return a.order - b.order;
      });
      var remaining = toRemove;
      var iter = 0;
      while (remaining > 0 && iter < 10000) {
        iter++;
        var progress = false;
        for (var j = 0; j < current.length; j++) {
          if (remaining === 0) break;
          if (current[j].duration > SCH.MIN_DURATION) {
            current[j].duration--;
            remaining--;
            progress = true;
          }
        }
        if (!progress) break;
      }

      if (remaining > 0) {
        return { ok: false, reason: "cannot_remove_enough" };
      }

      current.forEach(function (r) { newDur[r.id] = r.duration; });
    }

    return { ok: true, newDurations: newDur };
  }

  /* ═════ Internal: normalize ═════ */

  function _normalizeFromIssues(rounds, examDate, options) {
    if (!examDate) {
      return { status: "infeasible", reason: "no_exam_boundary" };
    }

    var sorted = _sortedByOrder(rounds);
    var intervals = _buildIntervals(sorted, examDate);

    for (var i = 0; i < intervals.length; i++) {
      var iv = intervals[i];
      if (iv.end === null) {
        return { status: "infeasible", reason: "no_exam_boundary" };
      }
      var span = iv.end - iv.start + 1;
      if (span < 0) {
        return { status: "invalid_input", reason: "locked_overlap" };
      }
      if (iv.flexIds.length === 0) {
        if (span !== 0) {
          return { status: "infeasible", reason: "gap_between_locked_anchors" };
        }
        continue;
      }
      var minRequired = iv.flexIds.length * SCH.MIN_DURATION;
      if (span < minRequired) {
        return { status: "infeasible", reason: "interval_too_small" };
      }
    }

    var newDurations = {};
    for (var j = 0; j < intervals.length; j++) {
      var iv2 = intervals[j];
      var span2 = iv2.end - iv2.start + 1;
      var flexRounds = [];
      for (var fi = 0; fi < sorted.length; fi++) {
        if (iv2.flexIds.indexOf(sorted[fi].id) >= 0) {
          flexRounds.push(sorted[fi]);
        }
      }

      if (flexRounds.length === 0) continue;

      var sumCurrent = flexRounds.reduce(function (s, r) {
        var d = _duration(r);
        return s + (d || 0);
      }, 0);

      if (sumCurrent === span2) {
        flexRounds.forEach(function (r) { newDurations[r.id] = _duration(r); });
        continue;
      }

      var delta = span2 - sumCurrent;
      var distInput = flexRounds.map(function (r) {
        return { id: r.id, duration: _duration(r), order: r.order };
      });
      var distResult = _distributeDelta(distInput, delta);
      if (!distResult.ok) {
        return { status: "infeasible", reason: distResult.reason };
      }
      Object.keys(distResult.newDurations).forEach(function (id) {
        newDurations[id] = distResult.newDurations[id];
      });
    }

    var firstStartNum = _dayNum(sorted[0].startDate);
    var rebuilt = _rebuildFullChain(sorted, newDurations, firstStartNum);
    var proposalRounds = rebuilt.map(_toProposalRound);

    return {
      status: "feasible",
      proposal: {
        rounds: proposalRounds,
        summary: {
          mode: "normalize",
          editedRoundId: null,
          deltaApplied: 0,
          affectedRounds: proposalRounds.map(function (r) { return r.id; }),
          unchangedRounds: [],
          intervals: intervals.map(function (iv) {
            return {
              start: _dateFromDayNum(iv.start),
              end: iv.end !== null ? _dateFromDayNum(iv.end) : null,
              flexCount: iv.flexIds.length
            };
          })
        }
      }
    };
  }

  function _rebuildFullChain(sortedRounds, newDurations, firstStartNum) {
    var cursor = firstStartNum;
    var result = [];
    for (var i = 0; i < sortedRounds.length; i++) {
      var r = sortedRounds[i];
      if (r.locked === true) {
        result.push({
          id: r.id, order: r.order,
          startDate: r.startDate, endDate: r.endDate,
          locked: true
        });
        cursor = _dayNum(r.endDate) + 1;
      } else {
        var dur = newDurations[r.id];
        if (dur == null) dur = _duration(r);
        if (dur == null || dur < SCH.MIN_DURATION) dur = SCH.MIN_DURATION;
        result.push({
          id: r.id, order: r.order,
          startDate: _dateFromDayNum(cursor),
          endDate: _dateFromDayNum(cursor + dur - 1),
          locked: false
        });
        cursor = cursor + dur;
      }
    }
    return result;
  }

  /* ═════ Public: Normalize ═════ */

  SCH.computeNormalize = function (inputRounds, examDate, options) {
    if (!Array.isArray(inputRounds) || inputRounds.length === 0) {
      return _err("invalid_input", "empty_rounds");
    }
    var rounds = _cloneRounds(inputRounds);
    var issues = _detectIssues(rounds, examDate, options || {});

    var invalid = issues.filter(function (i) { return i.severity === "invalid"; });
    if (invalid.length > 0) {
      return {
        status: "invalid_input",
        reason: invalid[0].type,
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: [invalid[0].type] }
      };
    }

    var unhealthy = issues.filter(function (i) { return i.severity === "unhealthy"; });
    if (unhealthy.length === 0) {
      return {
        status: "noop",
        reason: null,
        proposal: null,
        issues: [],
        validation: { ok: true, errors: [] }
      };
    }

    var result = _normalizeFromIssues(rounds, examDate, options || {});
    if (result.status !== "feasible") {
      return {
        status: result.status,
        reason: result.reason,
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: [result.reason] }
      };
    }

    var valErrors = _validateProposal(result.proposal.rounds, examDate, options || {});
    if (valErrors.length > 0) {
      return {
        status: "invalid_input",
        reason: "output_validation_failed",
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: valErrors }
      };
    }

    return {
      status: "feasible",
      reason: null,
      proposal: result.proposal,
      issues: issues,
      validation: { ok: true, errors: [] }
    };
  };

  /* ═════ Public: Edit ═════ */

  SCH.computeEdit = function (inputRounds, examDate, editIntent, options) {
    options = options || {};
    if (!Array.isArray(inputRounds) || inputRounds.length === 0) {
      return _err("invalid_input", "empty_rounds");
    }
    if (!editIntent || !editIntent.roundId) {
      return _err("invalid_input", "missing_edit_intent");
    }
    var newDur = parseInt(editIntent.newDuration, 10);
    if (isNaN(newDur) || newDur < SCH.MIN_DURATION) {
      return _err("invalid_input", "duration_below_min");
    }

    var rounds = _cloneRounds(inputRounds);

    var edited = null;
    for (var i = 0; i < rounds.length; i++) {
      if (rounds[i].id === editIntent.roundId) { edited = rounds[i]; break; }
    }
    if (!edited) return _err("invalid_input", "round_not_found");
    if (_isLocked(edited, options)) return _err("invalid_input", "edit_locked");

    var issues = _detectIssues(rounds, examDate, options);
    var invalid = issues.filter(function (i) { return i.severity === "invalid"; });
    if (invalid.length > 0) {
      return {
        status: "invalid_input",
        reason: invalid[0].type,
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: [invalid[0].type] }
      };
    }

    var unhealthy = issues.filter(function (i) { return i.severity === "unhealthy"; });
    if (unhealthy.length > 0) {
      var normResult = _normalizeFromIssues(rounds, examDate, options);
      if (normResult.status !== "feasible") {
        return {
          status: normResult.status,
          reason: normResult.reason,
          proposal: null,
          issues: issues,
          validation: { ok: false, errors: [normResult.reason] }
        };
      }
      rounds = _sortedByOrder(normResult.proposal.rounds.map(function (r) {
        return { id: r.id, order: r.order, startDate: r.startDate, endDate: r.endDate, locked: r.locked === true };
      }));
      edited = null;
      for (var jj = 0; jj < rounds.length; jj++) {
        if (rounds[jj].id === editIntent.roundId) { edited = rounds[jj]; break; }
      }
    } else {
      rounds = _sortedByOrder(rounds);
      edited = null;
      for (var kk = 0; kk < rounds.length; kk++) {
        if (rounds[kk].id === editIntent.roundId) { edited = rounds[kk]; break; }
      }
    }

    if (!edited) return _err("invalid_input", "round_not_found_after_normalize");

    var oldDur = _duration(edited);
    if (oldDur === null) return _err("invalid_input", "invalid_duration");

    var editedStartNum = _dayNum(edited.startDate);
    edited.endDate = _dateFromDayNum(editedStartNum + newDur - 1);

    var intervals = _buildIntervals(rounds, examDate);
    var myInterval = null;
    for (var m = 0; m < intervals.length; m++) {
      if (intervals[m].flexIds.indexOf(edited.id) >= 0) {
        myInterval = intervals[m];
        break;
      }
    }
    if (!myInterval) return _err("invalid_input", "interval_not_found");

    var otherFlexIds = myInterval.flexIds.filter(function (id) { return id !== edited.id; });
    var deltaForOthers = oldDur - newDur;

    var newDurations = {};
    newDurations[edited.id] = newDur;

    if (otherFlexIds.length > 0) {
      var otherRounds = [];
      for (var n = 0; n < rounds.length; n++) {
        if (otherFlexIds.indexOf(rounds[n].id) >= 0) {
          otherRounds.push({
            id: rounds[n].id,
            duration: _duration(rounds[n]),
            order: rounds[n].order
          });
        }
      }
      if (deltaForOthers !== 0) {
        var distResult = _distributeDelta(otherRounds, deltaForOthers);
        if (!distResult.ok) {
          return _err("infeasible", distResult.reason);
        }
        Object.keys(distResult.newDurations).forEach(function (id) {
          newDurations[id] = distResult.newDurations[id];
        });
      } else {
        otherRounds.forEach(function (r) { newDurations[r.id] = r.duration; });
      }
    } else if (deltaForOthers !== 0) {
      return _err("infeasible", "interval_insufficient_flex");
    }

    for (var p = 0; p < rounds.length; p++) {
      var rp = rounds[p];
      if (!rp.locked && !(rp.id in newDurations)) {
        newDurations[rp.id] = _duration(rp);
      }
    }

    var firstStartNum = _dayNum(rounds[0].startDate);
    var rebuilt = _rebuildFullChain(rounds, newDurations, firstStartNum);
    var proposalRounds = rebuilt.map(_toProposalRound);

    var affected = [];
    var unchanged = [];
    for (var q = 0; q < proposalRounds.length; q++) {
      var orig = null;
      for (var oi = 0; oi < inputRounds.length; oi++) {
        if (inputRounds[oi].id === proposalRounds[q].id) { orig = inputRounds[oi]; break; }
      }
      if (orig) {
        if (orig.startDate !== proposalRounds[q].startDate || orig.endDate !== proposalRounds[q].endDate) {
          affected.push(proposalRounds[q].id);
        } else {
          unchanged.push(proposalRounds[q].id);
        }
      }
    }

    var proposal = {
      rounds: proposalRounds,
      summary: {
        mode: "edit",
        editedRoundId: edited.id,
        deltaApplied: newDur - oldDur,
        affectedRounds: affected,
        unchangedRounds: unchanged,
        intervals: intervals.map(function (iv) {
          return {
            start: _dateFromDayNum(iv.start),
            end: iv.end !== null ? _dateFromDayNum(iv.end) : null,
            flexCount: iv.flexIds.length
          };
        })
      }
    };

    var valErrors = _validateProposal(proposalRounds, examDate, options);
    if (valErrors.length > 0) {
      return {
        status: "invalid_input",
        reason: "output_validation_failed",
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: valErrors }
      };
    }

    var finalEdited = null;
    for (var ff = 0; ff < proposalRounds.length; ff++) {
      if (proposalRounds[ff].id === edited.id) { finalEdited = proposalRounds[ff]; break; }
    }
    if (!finalEdited || finalEdited.duration !== newDur) {
      return _err("invalid_input", "edit_not_preserved");
    }

    return {
      status: "feasible",
      reason: null,
      proposal: proposal,
      issues: issues.length > 0 ? issues : null,
      validation: { ok: true, errors: [] }
    };
  };

  /* ═════ Internal: validate proposal ═════ */

  function _validateProposal(rounds, examDate, options) {
    var errors = [];
    if (!Array.isArray(rounds) || rounds.length === 0) {
      errors.push("empty");
      return errors;
    }

    for (var i = 0; i < rounds.length - 1; i++) {
      if ((rounds[i].order || 0) >= (rounds[i+1].order || 0)) {
        errors.push("order_not_ascending");
        break;
      }
    }

    for (var j = 0; j < rounds.length - 1; j++) {
      var endA = _dayNum(rounds[j].endDate);
      var startB = _dayNum(rounds[j+1].startDate);
      if (endA === null || startB === null) {
        errors.push("invalid_date_in_chain");
        break;
      }
      if (startB !== endA + 1) {
        if (startB > endA + 1) errors.push("gap_" + j);
        else errors.push("overlap_" + j);
      }
    }

    for (var k = 0; k < rounds.length; k++) {
      var d = _duration(rounds[k]);
      if (d === null || d < SCH.MIN_DURATION) {
        errors.push("min_duration_violated_" + rounds[k].id);
      }
    }

    if (examDate) {
      var examNum = _dayNum(examDate);
      if (examNum !== null) {
        var lastEnd = _dayNum(rounds[rounds.length - 1].endDate);
        if (lastEnd !== examNum - 1) {
          errors.push("exam_mismatch");
        }
      }
    }

    return errors;
  }

  /* ═════ Public: Explicit Edit (allows gaps) ═════ */

  SCH.computeExplicitEdit = function (inputRounds, examDate, editIntent, options) {
    options = options || {};
    if (!Array.isArray(inputRounds) || inputRounds.length === 0) {
      return _err("invalid_input", "empty_rounds");
    }
    if (!editIntent || !editIntent.roundId) {
      return _err("invalid_input", "missing_edit_intent");
    }

    var rounds = _cloneRounds(inputRounds);
    var edited = null;
    for (var i = 0; i < rounds.length; i++) {
      if (rounds[i].id === editIntent.roundId) { edited = rounds[i]; break; }
    }
    if (!edited) return _err("invalid_input", "round_not_found");
    if (_isLocked(edited, options)) return _err("invalid_input", "edit_locked");

    var ns = _dayNum(editIntent.newStartDate);
    var ne = _dayNum(editIntent.newEndDate);
    if (ns === null || ne === null) return _err("invalid_input", "invalid_date");
    if (ne < ns) return _err("invalid_input", "start_after_end");
    var newDur = ne - ns + 1;
    if (newDur < SCH.MIN_DURATION) return _err("invalid_input", "duration_below_min");

    var issues = _detectIssues(rounds, examDate, options);
    var invalid = issues.filter(function (ii) { return ii.severity === "invalid"; });
    if (invalid.length > 0) {
      return {
        status: "invalid_input",
        reason: invalid[0].type,
        proposal: null,
        issues: issues,
        validation: { ok: false, errors: [invalid[0].type] }
      };
    }

    if (examDate) {
      var examNum = _dayNum(examDate);
      if (examNum !== null && ne >= examNum) {
        return _err("infeasible", "edit_after_exam");
      }
    }

    for (var j = 0; j < rounds.length; j++) {
      if (rounds[j].id === editIntent.roundId) continue;
      var os = _dayNum(rounds[j].startDate);
      var oe = _dayNum(rounds[j].endDate);
      if (os === null || oe === null) continue;
      if (ns <= oe && os <= ne) {
        return _err("infeasible", "overlap_with_other_round");
      }
    }

    var proposalRounds = rounds.map(function (r) {
      if (r.id === editIntent.roundId) {
        return {
          id: r.id, order: r.order,
          startDate: editIntent.newStartDate,
          endDate: editIntent.newEndDate,
          duration: newDur,
          locked: r.locked === true
        };
      }
      var d = _duration(r);
      return {
        id: r.id, order: r.order,
        startDate: r.startDate,
        endDate: r.endDate,
        duration: d,
        locked: r.locked === true
      };
    });

    proposalRounds.sort(function (x, y) { return (x.order || 0) - (y.order || 0); });

    return {
      status: "feasible",
      reason: null,
      proposal: {
        rounds: proposalRounds,
        summary: {
          mode: "explicit_edit",
          editedRoundId: edited.id,
          deltaApplied: newDur - (_duration(edited) || 0),
          affectedRounds: [edited.id],
          unchangedRounds: rounds.filter(function (r) { return r.id !== editIntent.roundId; }).map(function (r) { return r.id; }),
          allowsGaps: true
        }
      },
      issues: null,
      validation: { ok: true, errors: [] }
    };
  };

  /* ═════ Test helpers ═════ */

  function _makeChain(startDate, durations, lockedFlags, ids) {
    var cursor = _dayNum(startDate);
    var rounds = [];
    for (var i = 0; i < durations.length; i++) {
      rounds.push({
        id: (ids && ids[i]) || ("r" + (i + 1)),
        order: i + 1,
        startDate: _dateFromDayNum(cursor),
        endDate: _dateFromDayNum(cursor + durations[i] - 1),
        locked: !!(lockedFlags && lockedFlags[i])
      });
      cursor += durations[i];
    }
    return { rounds: rounds, examDate: _dateFromDayNum(cursor) };
  }

  function _tr(id, name, passed, expected, got, reason) {
    return {
      id: id, name: name, passed: !!passed,
      expected: expected, got: got, reason: reason || null
    };
  }

  /* ═════ __tests() ═════ */

  SCH.__tests = function () {
    var results = [];
    var START = "1406/7/1";
    var FIRST_DAY = _dayNum(START);

    function statusOk(res, status) { return res && res.status === status; }
    function editPreserved(res, rid, dur) {
      if (!res || !res.proposal) return false;
      for (var i = 0; i < res.proposal.rounds.length; i++) {
        if (res.proposal.rounds[i].id === rid) return res.proposal.rounds[i].duration === dur;
      }
      return false;
    }
    function chainHealthy(rounds, examDate) {
      for (var i = 0; i < rounds.length - 1; i++) {
        if (_dayNum(rounds[i].endDate) + 1 !== _dayNum(rounds[i+1].startDate)) return false;
      }
      if (examDate) {
        if (_dayNum(rounds[rounds.length - 1].endDate) !== _dayNum(examDate) - 1) return false;
      }
      return true;
    }
    function minDurOk(rounds) {
      for (var i = 0; i < rounds.length; i++) {
        var d = _duration(rounds[i]);
        if (d === null || d < SCH.MIN_DURATION) return false;
      }
      return true;
    }

    // ═══ GROUP A — EDIT ═══
    // A1
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 50 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r1", 50)
        && chainHealthy(res.proposal.rounds, c.examDate) && minDurOk(res.proposal.rounds);
      results.push(_tr("A1", "Edit R1 -10", ok, "feasible, r1=50", res.status + ", r1=" + (res.proposal ? res.proposal.rounds[0].duration : "?"), ok ? null : "failed"));
    })();

    // A2
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 70 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r1", 70) && chainHealthy(res.proposal.rounds, c.examDate);
      results.push(_tr("A2", "Edit R1 +10", ok, "feasible, r1=70", res.status, ok ? null : "failed"));
    })();

    // A3
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r2", 70) && chainHealthy(res.proposal.rounds, c.examDate);
      results.push(_tr("A3", "Edit middle -10", ok, "feasible, r2=70", res.status, ok ? null : "failed"));
    })();

    // A4
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 50 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r3", 50) && chainHealthy(res.proposal.rounds, c.examDate);
      results.push(_tr("A4", "Edit last -10", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // A5
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 70 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r3", 70) && chainHealthy(res.proposal.rounds, c.examDate);
      results.push(_tr("A5", "Edit last +10", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // A6 — single round, shorten → infeasible (no other flex)
    (function () {
      var c = _makeChain(START, [100]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 80 });
      var ok = statusOk(res, "infeasible");
      results.push(_tr("A6", "1 round shorten → infeasible", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // A7
    (function () {
      var c = _makeChain(START, [60, 80]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 50 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r1", 50) && chainHealthy(res.proposal.rounds, c.examDate);
      results.push(_tr("A7", "2 rounds edit", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // A8
    (function () {
      var c = _makeChain(START, [100, 100, 100, 100, 100]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 50 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r3", 50)
        && chainHealthy(res.proposal.rounds, c.examDate) && minDurOk(res.proposal.rounds);
      results.push(_tr("A8", "Large shortening", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // A9
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 0 });
      var ok = statusOk(res, "invalid_input") && res.reason === "duration_below_min";
      results.push(_tr("A9", "Below minimum", ok, "invalid_input/duration_below_min", res.status + "/" + res.reason, ok ? null : "failed"));
    })();

    // A10
    (function () {
      var c = _makeChain(START, [60, 80, 60], [false, true, false]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var ok = statusOk(res, "invalid_input") && res.reason === "edit_locked";
      results.push(_tr("A10", "Edit locked", ok, "invalid_input/edit_locked", res.status + "/" + res.reason, ok ? null : "failed"));
    })();

    // A11 — unhealthy with gap, then edit
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 59), locked: false };
      var r2 = { id: "r2", order: 2, startDate: _dateFromDayNum(FIRST_DAY + 79), endDate: _dateFromDayNum(FIRST_DAY + 158), locked: false };
      var exam = _dateFromDayNum(FIRST_DAY + 200);
      var res = SCH.computeEdit([r1, r2], exam, { roundId: "r2", newDuration: 80 });
      var ok = statusOk(res, "feasible") && chainHealthy(res.proposal.rounds, exam);
      results.push(_tr("A11", "Unhealthy + edit", ok, "feasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // A12
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 80 });
      var ok = statusOk(res, "feasible") && editPreserved(res, "r2", 80);
      results.push(_tr("A12", "Same duration edit", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // ═══ GROUP B — NORMALIZE ═══
    // B1
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeNormalize(c.rounds, c.examDate, {});
      var ok = statusOk(res, "noop");
      results.push(_tr("B1", "Healthy noop", ok, "noop", res.status, ok ? null : "failed"));
    })();

    // B2
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var exam = _dateFromDayNum(_dayNum(c.examDate) + 20);
      var res = SCH.computeNormalize(c.rounds, exam, {});
      var ok = statusOk(res, "feasible") && chainHealthy(res.proposal.rounds, exam);
      results.push(_tr("B2", "End gap fill", ok, "feasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // B3 — all locked, end gap → infeasible
    (function () {
      var c = _makeChain(START, [60, 80, 60], [true, true, true]);
      var exam = _dateFromDayNum(_dayNum(c.examDate) + 20);
      var res = SCH.computeNormalize(c.rounds, exam, {});
      var ok = statusOk(res, "infeasible");
      results.push(_tr("B3", "All locked + end gap", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // B4 — overlap
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 79), locked: false };
      var r2 = { id: "r2", order: 2, startDate: _dateFromDayNum(FIRST_DAY + 50), endDate: _dateFromDayNum(FIRST_DAY + 129), locked: false };
      var exam = _dateFromDayNum(FIRST_DAY + 130);
      var res = SCH.computeNormalize([r1, r2], exam, {});
      var ok = statusOk(res, "feasible") || statusOk(res, "infeasible");
      results.push(_tr("B4", "Overlap resolution", ok, "feasible or infeasible", res.status + "/" + (res.reason||""), ok ? null : "unexpected"));
    })();

    // B5 — overlap + gap
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 99), locked: false };
      var r2 = { id: "r2", order: 2, startDate: _dateFromDayNum(FIRST_DAY + 50), endDate: _dateFromDayNum(FIRST_DAY + 129), locked: false };
      var exam = _dateFromDayNum(FIRST_DAY + 200);
      var res = SCH.computeNormalize([r1, r2], exam, {});
      var ok = statusOk(res, "feasible") || statusOk(res, "infeasible");
      results.push(_tr("B5", "Overlap + gap", ok, "feasible or infeasible", res.status + "/" + (res.reason||""), ok ? null : "unexpected"));
    })();

    // B6 — insufficient span
    (function () {
      var r = [];
      for (var i = 0; i < 5; i++) {
        r.push({ id: "r" + (i+1), order: i+1, startDate: _dateFromDayNum(FIRST_DAY + i*2), endDate: _dateFromDayNum(FIRST_DAY + i*2), locked: false });
      }
      var exam = _dateFromDayNum(FIRST_DAY + 3);
      var res = SCH.computeNormalize(r, exam, {});
      var ok = statusOk(res, "infeasible");
      results.push(_tr("B6", "Insufficient span", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // B7 — examDate null, healthy
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeNormalize(c.rounds, null, {});
      var ok = statusOk(res, "noop");
      results.push(_tr("B7", "examDate null healthy", ok, "noop", res.status, ok ? null : "failed"));
    })();

    // B8
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 49), locked: false };
      var exam = _dateFromDayNum(FIRST_DAY + 100);
      var res = SCH.computeNormalize([r1], exam, {});
      var ok = statusOk(res, "feasible") && chainHealthy(res.proposal.rounds, exam);
      results.push(_tr("B8", "One round gap fill", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // B9
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 99), locked: false };
      var exam = _dateFromDayNum(FIRST_DAY + 100);
      var res = SCH.computeNormalize([r1], exam, {});
      var ok = statusOk(res, "noop");
      results.push(_tr("B9", "One round healthy noop", ok, "noop", res.status, ok ? null : "failed"));
    })();

    // B10
    (function () {
      var res = SCH.computeNormalize([], "1406/7/10", {});
      var ok = statusOk(res, "invalid_input");
      results.push(_tr("B10", "Zero rounds", ok, "invalid_input", res.status, ok ? null : "failed"));
    })();

    // ═══ GROUP C — LOCKED ═══
    // C1 — R2 locked, edit R1 (r1 alone in interval 1)
    (function () {
      var c = _makeChain(START, [60, 80, 60], [false, true, false]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 50 });
      var ok = statusOk(res, "infeasible") && res.reason === "interval_insufficient_flex";
      results.push(_tr("C1", "Locked R2 + edit R1 (alone)", ok, "infeasible/interval_insufficient_flex", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C2 — R2 locked, edit R3 (r3 alone in interval 2)
    (function () {
      var c = _makeChain(START, [60, 80, 60], [false, true, false]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 50 });
      var ok = statusOk(res, "infeasible");
      results.push(_tr("C2", "Locked R2 + edit R3 (alone)", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C3 — R2/R4 locked, edit R3
    (function () {
      var c = _makeChain(START, [60, 80, 60, 40, 20], [false, true, false, true, false]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 50 });
      var ok = statusOk(res, "infeasible");
      results.push(_tr("C3", "Locked around + edit middle", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C4 — gap between locked, flex fills
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 29), locked: true };
      var r2 = { id: "r2", order: 2, startDate: _dateFromDayNum(FIRST_DAY + 30), endDate: _dateFromDayNum(FIRST_DAY + 49), locked: false };
      var r3 = { id: "r3", order: 3, startDate: _dateFromDayNum(FIRST_DAY + 70), endDate: _dateFromDayNum(FIRST_DAY + 99), locked: true };
      var exam = _dateFromDayNum(FIRST_DAY + 100);
      var res = SCH.computeNormalize([r1, r2, r3], exam, {});
      var ok = statusOk(res, "feasible") && chainHealthy(res.proposal.rounds, exam);
      results.push(_tr("C4", "Gap between locked + flex", ok, "feasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C5 — locked overlap
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 49), locked: true };
      var r2 = { id: "r2", order: 2, startDate: _dateFromDayNum(FIRST_DAY + 40), endDate: _dateFromDayNum(FIRST_DAY + 89), locked: true };
      var res = SCH.computeNormalize([r1, r2], _dateFromDayNum(FIRST_DAY + 90), {});
      var ok = statusOk(res, "invalid_input") && res.reason === "locked_overlap";
      results.push(_tr("C5", "Locked overlap", ok, "invalid_input/locked_overlap", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C6
    (function () {
      var c = _makeChain(START, [60, 80, 60], [true, true, true]);
      var res = SCH.computeNormalize(c.rounds, c.examDate, {});
      var ok = statusOk(res, "noop");
      results.push(_tr("C6", "All locked healthy noop", ok, "noop", res.status, ok ? null : "failed"));
    })();

    // C7
    (function () {
      var c = _makeChain(START, [60, 80, 60], [true, true, true]);
      var exam = _dateFromDayNum(_dayNum(c.examDate) + 20);
      var res = SCH.computeNormalize(c.rounds, exam, {});
      var ok = statusOk(res, "infeasible");
      results.push(_tr("C7", "All locked unhealthy", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C8
    (function () {
      var c = _makeChain(START, [60, 80, 60], [false, false, true]);
      var exam = _dateFromDayNum(_dayNum(c.examDate) + 20);
      var res = SCH.computeNormalize(c.rounds, exam, {});
      var ok = statusOk(res, "infeasible");
      results.push(_tr("C8", "Locked final + extended exam", ok, "infeasible", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // C9
    (function () {
      var ra = { id: "ra", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 59), locked: false };
      var rb = { id: "rb", order: 2, startDate: _dateFromDayNum(FIRST_DAY - 30), endDate: _dateFromDayNum(FIRST_DAY - 1), locked: true };
      var exam = _dateFromDayNum(FIRST_DAY + 100);
      var res = SCH.computeNormalize([ra, rb], exam, {});
      var ok = statusOk(res, "invalid_input") && res.reason === "locked_before_start";
      results.push(_tr("C9", "Locked before firstStart", ok, "invalid_input/locked_before_start", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // ═══ GROUP D — LEGACY / INVALID ═══
    // D1
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      delete c.rounds[0].locked;
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 50 });
      var ok = statusOk(res, "feasible");
      results.push(_tr("D1", "Missing locked defaults false", ok, "feasible", res.status, ok ? null : "failed"));
    })();

    // D2
    (function () {
      var r = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY + 50), endDate: _dateFromDayNum(FIRST_DAY + 10), locked: false };
      var res = SCH.computeNormalize([r], _dateFromDayNum(FIRST_DAY + 60), {});
      var ok = statusOk(res, "invalid_input") && res.reason === "start_after_end";
      results.push(_tr("D2", "Start > end", ok, "invalid_input/start_after_end", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // D3
    (function () {
      var r = { id: "r1", order: 1, startDate: "abc", endDate: _dateFromDayNum(FIRST_DAY + 10), locked: false };
      var res = SCH.computeNormalize([r], _dateFromDayNum(FIRST_DAY + 20), {});
      var ok = statusOk(res, "invalid_input") && res.reason === "invalid_date";
      results.push(_tr("D3", "Invalid date string", ok, "invalid_input/invalid_date", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // D4
    (function () {
      var r = { id: "r1", order: 1, startDate: null, endDate: _dateFromDayNum(FIRST_DAY + 10), locked: false };
      var res = SCH.computeNormalize([r], _dateFromDayNum(FIRST_DAY + 20), {});
      var ok = statusOk(res, "invalid_input");
      results.push(_tr("D4", "Null date", ok, "invalid_input", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // D5
    (function () {
      var r1 = { id: "r1", order: 1, startDate: _dateFromDayNum(FIRST_DAY), endDate: _dateFromDayNum(FIRST_DAY + 9), locked: false };
      var r2 = { id: "r2", order: 1, startDate: _dateFromDayNum(FIRST_DAY + 10), endDate: _dateFromDayNum(FIRST_DAY + 19), locked: false };
      var res = SCH.computeNormalize([r1, r2], _dateFromDayNum(FIRST_DAY + 20), {});
      var ok = statusOk(res, "invalid_input") && res.reason === "duplicate_order";
      results.push(_tr("D5", "Duplicate order", ok, "invalid_input/duplicate_order", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // D6
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var examBefore = _dateFromDayNum(FIRST_DAY - 1);
      var res = SCH.computeNormalize(c.rounds, examBefore, {});
      var ok = statusOk(res, "invalid_input") && res.reason === "exam_before_start";
      results.push(_tr("D6", "Exam before start", ok, "invalid_input/exam_before_start", res.status + "/" + (res.reason||""), ok ? null : "failed"));
    })();

    // ═══ GROUP S — SAFETY ═══
    // S1 — determinism
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var r1 = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var r2 = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var ok = statusOk(r1, "feasible") && statusOk(r2, "feasible") && JSON.stringify(r1.proposal) === JSON.stringify(r2.proposal);
      results.push(_tr("S1", "Deterministic", ok, "identical", ok ? "identical" : "differ", ok ? null : "outputs differ"));
    })();

    // S2 — input not mutated
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var before = JSON.stringify(c.rounds);
      SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      SCH.computeNormalize(c.rounds, c.examDate, {});
      var after = JSON.stringify(c.rounds);
      var ok = before === after;
      results.push(_tr("S2", "Input not mutated", ok, "unchanged", ok ? "unchanged" : "mutated", ok ? null : "input changed"));
    })();

    // S3 — locked dates preserved
    (function () {
      var c = _makeChain(START, [60, 80, 60, 40, 20], [false, true, false, false, false]);
      var lockedBefore = c.rounds[1].startDate + "|" + c.rounds[1].endDate;
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r3", newDuration: 55 });
      if (!res.proposal) {
        results.push(_tr("S3", "Locked dates preserved", false, "proposal", "none", res.reason || "no proposal"));
      } else {
        var locked = null;
        for (var i = 0; i < res.proposal.rounds.length; i++) {
          if (res.proposal.rounds[i].id === "r2") { locked = res.proposal.rounds[i]; break; }
        }
        var after = locked ? (locked.startDate + "|" + locked.endDate) : "missing";
        var ok = lockedBefore === after;
        results.push(_tr("S3", "Locked dates preserved", ok, lockedBefore, after, ok ? null : "locked changed"));
      }
    })();

    // S4 — edited duration exact
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 73 });
      var ok = false;
      if (res.proposal) {
        for (var i = 0; i < res.proposal.rounds.length; i++) {
          if (res.proposal.rounds[i].id === "r2") { ok = res.proposal.rounds[i].duration === 73; break; }
        }
      }
      results.push(_tr("S4", "Edited duration exact", ok, "73", ok ? "73" : "not 73", ok ? null : "failed"));
    })();

    // S5 — total duration conservation
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var before = 60 + 80 + 60;
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var after = 0;
      if (res.proposal) {
        for (var i = 0; i < res.proposal.rounds.length; i++) after += res.proposal.rounds[i].duration;
      }
      var ok = before === after;
      results.push(_tr("S5", "Total duration conserved", ok, before, after, ok ? null : "not conserved"));
    })();

    // S6 — exam boundary exact
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 55 });
      var lastEnd = res.proposal ? _dayNum(res.proposal.rounds[res.proposal.rounds.length-1].endDate) : null;
      var expected = _dayNum(c.examDate) - 1;
      var ok = lastEnd === expected;
      results.push(_tr("S6", "Exam boundary exact", ok, expected, lastEnd, ok ? null : "mismatch"));
    })();

    // S7 — no overlap
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var ok = true;
      for (var i = 0; i < res.proposal.rounds.length - 1; i++) {
        if (_dayNum(res.proposal.rounds[i].endDate) >= _dayNum(res.proposal.rounds[i+1].startDate)) { ok = false; break; }
      }
      results.push(_tr("S7", "No overlap", ok, "true", ok ? "true" : "false", ok ? null : "overlap"));
    })();

    // S8 — no gap
    (function () {
      var c = _makeChain(START, [60, 80, 60]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 70 });
      var ok = true;
      for (var i = 0; i < res.proposal.rounds.length - 1; i++) {
        if (_dayNum(res.proposal.rounds[i].endDate) + 1 !== _dayNum(res.proposal.rounds[i+1].startDate)) { ok = false; break; }
      }
      results.push(_tr("S8", "No gap", ok, "true", ok ? "true" : "false", ok ? null : "gap"));
    })();

    // S9 — min duration guarded
    (function () {
      var c = _makeChain(START, [3, 80, 3]);
      var res = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r2", newDuration: 90 });
      var ok = statusOk(res, "infeasible") || (res.proposal && minDurOk(res.proposal.rounds));
      results.push(_tr("S9", "Min duration guarded", ok, "infeasible or min respected", res.status, ok ? null : "failed"));
    })();

    // S10 — fractional distribution deterministic
    (function () {
      var c = _makeChain(START, [10, 10, 10]);
      var r1 = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 5 });
      var r2 = SCH.computeEdit(c.rounds, c.examDate, { roundId: "r1", newDuration: 5 });
      var ok = JSON.stringify(r1.proposal.rounds) === JSON.stringify(r2.proposal.rounds);
      results.push(_tr("S10", "Deterministic fractional", ok, "identical", ok ? "identical" : "differ", ok ? null : "differ"));
    })();

    var passed = results.filter(function (r) { return r.passed; }).length;
    return { passed: passed, total: results.length, results: results };
  };

  console.log("[round-scheduler.v22] loaded v" + SCH.VERSION);
})();