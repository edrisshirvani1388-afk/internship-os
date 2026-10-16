(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.review.proposal.v11] R missing"); return; }
  var RP = R.reviewProposal = R.reviewProposal || {};
  var LIB = window.InternshipLib;
  var DATE = LIB && LIB.date;

  function _mkId(p) {
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _today() { return DATE ? DATE.todayJalaliString() : ""; }
  function _cmp(a, b) { return DATE ? DATE.compareJalaliDate(a, b) : 0; }
  function _addDays(d, n) {
    if (!DATE || !d) return d;
    var p = DATE.parseJalali(d);
    if (!p) return d;
    var r = DATE.addJalaliDays(p.jy, p.jm, p.jd, n);
    return DATE.dateKey(r.jy, r.jm, r.jd);
  }

  function _committedMinutesByDate(activities) {
    var out = {};
    (activities || []).forEach(function (a) {
      if (!a || !a.plannedDate) return;
      var st = a.status || "planned";
      if (st !== "planned" && st !== "in_progress" && st !== "partial") return;
      var p = a.plannedDurationMinutes | 0;
      var ac = a.actualDurationMinutes | 0;
      var remain = Math.max(0, p - ac);
      if (remain <= 0) return;
      out[a.plannedDate] = (out[a.plannedDate] || 0) + remain;
    });
    return out;
  }

  function _buildDailyCapacity(snapshot, startDate, days, existingActivities) {
    var committed = _committedMinutesByDate(existingActivities);
    var daily = [];
    var cursor = startDate;
    for (var i = 0; i < days; i++) {
      var cap = 0;
      if (snapshot && Array.isArray(snapshot.calendar)) {
        var ctx = snapshot.calendar.find(function (c) { return c && c.date === cursor; });
        if (ctx) cap = ctx.finalCapacityMinutes | 0;
        else {
          // not in plan range → zero capacity
          cap = 0;
        }
      } else {
        cap = 240;
      }
      var comm = committed[cursor] || 0;
      var alloc = Math.max(0, cap - comm);
      daily.push({
        date: cursor,
        capacityMinutes: cap,
        existingCommittedMinutes: comm,
        allocatableMinutes: alloc,
        reviewMinutes: 0,
        remainingCapacity: alloc,
        deferredMinutes: 0
      });
      cursor = _addDays(cursor, 1);
    }
    return daily;
  }

  function _evaluateConstraints(item, date, snapshot) {
    var effectList = [];
    var allowed = true;
    var reason = null;
    if (!snapshot) return { allowed: true, reason: null, constraintEffects: effectList };
    var CE = R.plannerConstraints;
    var PC = R.constraintEngine;
    if (!CE || !CE.buildRuleIndex || !CE.evaluateCandidate) {
      return { allowed: true, reason: null, constraintEffects: effectList };
    }
    var index = CE.buildRuleIndex(snapshot);
    var ctx = {
      planId: snapshot.planId,
      roundId: item.roundId || null,
      bookId: item.bookId || null,
      subjectId: item.subjectId || null,
      date: date,
      proposedMinutes: item.estimatedMinutes | 0,
      alreadyForDemand: 0,
      alreadyForDate: 0,
      pagesPerHour: 20,
      totalRoundAllocatableMinutes: 0
    };
    var res = CE.evaluateCandidate(index, ctx);
    (res.effects || []).forEach(function (e) { effectList.push(e); });
    if (res.allowed === false) {
      allowed = false;
      reason = "constraint_block";
    }
    return { allowed: allowed, reason: reason, constraintEffects: effectList };
  }

  var _origGenerate = RP.generate;
  RP.generate = function (opts) {
    opts = opts || {};
    var date = opts.date || _today();
    var horizonDays = opts.horizonDays || 7;
    var settings = R.store.getReviewSettings();
    if (!settings.enabled) return { ok: false, error: "review_disabled", proposal: null };

    var dailyLimit = settings.dailyReviewLimit || 20;
    var maxMinutes = settings.maxReviewMinutesPerDay || 90;
    var overduePolicy = settings.overduePolicy || "spread";

    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return { ok: false, error: "no_state" };

    var activePlanId = s.residency.meta && s.residency.meta.activePlanId;
    var snapshot = null;
    if (R.plannerSnapshot && activePlanId) {
      try { snapshot = R.plannerSnapshot.build(activePlanId, "plan"); } catch (e) {}
    }

    var queue = R.reviewQueue.getDue(date);
    var ordered = R.reviewOverduePolicy.apply(queue, overduePolicy, { today: date, spreadDays: horizonDays });

    var daily = _buildDailyCapacity(snapshot, date, horizonDays, s.residency.activities || []);
    var byDate = {};
    daily.forEach(function (d) { byDate[d.date] = d; });

    var proposedReviews = [], deferredReviews = [], warnings = [], deficits = [], conflicts = [];
    var proposedPerDateCount = {};
    var proposedPerDateMinutes = {};

    ordered.forEach(function (entry) {
      var item = entry.item;
      var preferredDate = entry.preferredDate || date;

      // Find a day in horizon starting at preferredDate
      var chosen = null;
      for (var i = 0; i < daily.length; i++) {
        var d = daily[i];
        if (_cmp(d.date, preferredDate) < 0) continue;
        var alreadyCount = proposedPerDateCount[d.date] || 0;
        var alreadyMin = proposedPerDateMinutes[d.date] || 0;
        if (alreadyCount >= dailyLimit) continue;
        if (alreadyMin + item.estimatedMinutes > maxMinutes) continue;
        if (d.remainingCapacity < item.estimatedMinutes) {
          // try next day
          continue;
        }
        chosen = d;
        break;
      }

      if (!chosen) {
        deferredReviews.push({
          reviewStateId: item.reviewStateId,
          targetType: item.targetType,
          targetId: item.targetId,
          dueDate: item.dueDate,
          reason: "no_capacity_in_horizon",
          estimatedMinutes: item.estimatedMinutes
        });
        return;
      }

      var evalResult = _evaluateConstraints(item, chosen.date, snapshot);
      if (!evalResult.allowed) {
        deferredReviews.push({
          reviewStateId: item.reviewStateId,
          targetType: item.targetType,
          targetId: item.targetId,
          dueDate: item.dueDate,
          reason: evalResult.reason || "constraint_block",
          estimatedMinutes: item.estimatedMinutes,
          constraintEffects: evalResult.constraintEffects
        });
        deficits.push({ type: "constraint_block", reviewStateId: item.reviewStateId, date: chosen.date, severity: "warning" });
        return;
      }

      proposedReviews.push({
        reviewStateId: item.reviewStateId,
        targetType: item.targetType,
        targetId: item.targetId,
        bookId: item.bookId,
        subjectId: item.subjectId,
        pageStart: item.pageStart,
        pageEnd: item.pageEnd,
        date: chosen.date,
        durationMinutes: item.estimatedMinutes,
        priority: item.priority,
        reason: item.priority.reason,
        constraintEffects: evalResult.constraintEffects
      });

      chosen.reviewMinutes += item.estimatedMinutes;
      chosen.remainingCapacity = Math.max(0, chosen.allocatableMinutes - chosen.reviewMinutes);
      proposedPerDateCount[chosen.date] = (proposedPerDateCount[chosen.date] || 0) + 1;
      proposedPerDateMinutes[chosen.date] = (proposedPerDateMinutes[chosen.date] || 0) + item.estimatedMinutes;
    });

    var proposalId = _mkId("rvp");
    var proposedActivities = proposedReviews.map(function (pr) {
      return _buildActivityPayload(pr, proposalId);
    });

    var totalMinutes = proposedReviews.reduce(function (acc, p) { return acc + (p.durationMinutes | 0); }, 0);

    return {
      ok: true,
      proposal: {
        version: 2,
        proposalId: proposalId,
        planId: activePlanId || null,
        date: date,
        horizonDays: horizonDays,
        generatedAt: Date.now(),
        proposedActivities: proposedActivities,
        proposedReviews: proposedReviews,
        deferredReviews: deferredReviews,
        deferredItems: deferredReviews.map(function (d) {
          return { reviewStateId: d.reviewStateId, reason: d.reason, estimatedMinutes: d.estimatedMinutes };
        }),
        daily: daily,
        conflicts: conflicts,
        warnings: warnings,
        deficits: deficits,
        overduePolicy: overduePolicy,
        statistics: {
          dueCount: queue.length,
          proposedCount: proposedReviews.length,
          deferredCount: deferredReviews.length,
          totalMinutes: totalMinutes,
          remainingBudget: Math.max(0, maxMinutes * horizonDays - totalMinutes)
        },
        feasibility: {
          status: deferredReviews.length === 0 ? "feasible" : "feasible_with_warnings",
          deferredReasons: deferredReviews.map(function (d) { return d.reason; })
                       .filter(function (v, i, arr) { return arr.indexOf(v) === i; })
        }
      }
    };
  };

  function _buildActivityPayload(pr, proposalId) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    return {
      kind: "review",
      planId: null,
      roundId: null,
      bookId: pr.bookId || null,
      subjectId: pr.subjectId || null,
      taskId: null,
      sourceType: "review_scheduler",
      sourceId: proposalId,
      plannedDate: pr.date,
      plannedStartTime: null,
      plannedDurationMinutes: pr.durationMinutes,
      plannedPages: null,
      plannedPageStart: null,
      plannedPageEnd: null,
      actualPages: 0,
      actualDurationMinutes: 0,
      actualPageRanges: [],
      status: "planned",
      locked: false,
      notes: "reviewStateId=" + pr.reviewStateId,
      title: _buildTitle(pr),
      reviewTarget: {
        type: pr.targetType === "page_range" ? "pages" : pr.targetType,
        activityId: pr.targetType === "activity" ? pr.targetId : null,
        bookId: pr.bookId || null,
        subjectId: pr.subjectId || null,
        pageStart: pr.pageStart || null,
        pageEnd: pr.pageEnd || null,
        targetId: pr.targetId,
        reviewStateId: pr.reviewStateId
      },
      reviewMeta: {
        strategyType: "sr_v1",
        intervalDays: null,
        sourceId: pr.reviewStateId
      },
      assessmentId: null
    };
  }

  function _buildTitle(pr) {
    if (pr.targetType === "book" && pr.bookId) {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      if (s && s.residency) {
        var b = (s.residency.books || []).find(function (x) { return x && x.id === pr.bookId; });
        if (b) return "مرور: " + b.title;
      }
      return "مرور کتاب";
    }
    if (pr.targetType === "page_range" && pr.pageStart != null) {
      return "مرور صفحات " + pr.pageStart + "-" + pr.pageEnd;
    }
    if (pr.targetType === "subject") return "مرور موضوع";
    if (pr.targetType === "activity") return "مرور فعالیت";
    return "مرور";
  }

  console.log("[residency.review.proposal.v11] loaded");
})();