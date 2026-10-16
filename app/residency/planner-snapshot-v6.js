/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Planner Snapshot Builder v6.1
   Read state → PlannerInput (immutable snapshot)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[planner.snapshot.v6] R missing"); return; }
  R.plannerSnapshot = R.plannerSnapshot || {};

  function _getState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }
  function _rs(state) { return state && state.residency ? state.residency : null; }

  function _findPlan(rs, planId) {
    if (!rs || !Array.isArray(rs.plans)) return null;
    for (var i = 0; i < rs.plans.length; i++) {
      if (rs.plans[i] && rs.plans[i].id === planId) return rs.plans[i];
    }
    return null;
  }
  function _roundsForPlan(rs, planId) {
    if (!rs || !Array.isArray(rs.rounds)) return [];
    return rs.rounds.filter(function (r) { return r && r.planId === planId; })
      .sort(function (a, b) { return (a.order || 0) - (b.order || 0); });
  }
  function _enrollmentsForRounds(rs, roundIds) {
    if (!rs || !Array.isArray(rs.enrollments)) return [];
    var set = {};
    roundIds.forEach(function (id) { set[id] = 1; });
    return rs.enrollments.filter(function (e) { return e && set[e.roundId]; });
  }
  function _booksByIds(rs, ids) {
    if (!rs || !Array.isArray(rs.books)) return [];
    var set = {};
    ids.forEach(function (id) { set[id] = 1; });
    return rs.books.filter(function (b) { return b && set[b.id]; });
  }
  function _subjectsByIds(rs, ids) {
    if (!rs || !Array.isArray(rs.subjects)) return [];
    var set = {};
    ids.forEach(function (id) { set[id] = 1; });
    return rs.subjects.filter(function (s) { return s && set[s.id]; });
  }
  function _activitiesForPlan(rs, planId, roundIds) {
    if (!rs || !Array.isArray(rs.activities)) return [];
    var rset = {};
    roundIds.forEach(function (id) { rset[id] = 1; });
    return rs.activities.filter(function (a) {
      if (!a) return false;
      if (a.planId === planId) return true;
      if (a.roundId && rset[a.roundId]) return true;
      return false;
    });
  }
  function _goalsForPlan(rs, planId) {
    if (!rs || !Array.isArray(rs.goals)) return [];
    return rs.goals.filter(function (g) { return g && g.planId === planId; });
  }
  function _assessmentsForPlan(rs, planId, roundIds) {
    if (!rs || !Array.isArray(rs.assessments)) return [];
    var rset = {};
    roundIds.forEach(function (id) { rset[id] = 1; });
    return rs.assessments.filter(function (a) {
      if (!a) return false;
      if (a.planId === planId) return true;
      if (a.roundId && rset[a.roundId]) return true;
      return false;
    });
  }
  function _constraintsForPlan(rs, planId) {
    if (!rs || !Array.isArray(rs.constraints)) return [];
    return rs.constraints.filter(function (c) {
      if (!c) return false;
      if (!c.active) return false;
      if (!c.planId) return true;
      return c.planId === planId;
    });
  }
  function _overridesForPlan(rs, planId) {
    if (!rs || !Array.isArray(rs.manualOverrides)) return [];
    return rs.manualOverrides.filter(function (o) {
      if (!o) return false;
      if (!o.active) return false;
      if (!o.planId) return true;
      return o.planId === planId;
    });
  }

  function _buildCalendar(rounds, planId) {
    var out = [];
    if (!R.calendar || !R.calendar.getResidencyCalendarContext) return out;
    rounds.forEach(function (r) {
      if (!r || !r.startDate || !r.endDate) return;
      var ctxs = [];
      try { ctxs = R.calendar.getResidencyCalendarContext(r.startDate, r.endDate, planId); } catch (e) {}
      ctxs.forEach(function (c) {
        if (!c) return;
        out.push({
          date: c.date,
          roundId: r.id,
          weekday: c.weekday,
          dayType: c.dayType,
          rotationContexts: c.rotationContexts,
          activeRotationIds: c.activeRotationIds,
          lightRotationIds: c.lightRotationIds,
          rawCapacityMinutes: c.rawCapacityMinutes,
          reserveMinutes: c.reserveMinutes,
          availableCapacityMinutes: c.availableCapacityMinutes,
          finalCapacityMinutes: c.finalCapacityMinutes,
          feasibleCapacityMinutes: (typeof c.feasibleCapacityMinutes === "number") ? c.feasibleCapacityMinutes : null,
          timeAvailabilityMinutes: (typeof c.timeAvailabilityMinutes === "number") ? c.timeAvailabilityMinutes : null,
          actualAvailabilityMinutes: c.actualAvailabilityMinutes,
          shifts: c.shifts,
          shiftDurationMinutes: c.shiftDurationMinutes,
          warnings: c.warnings
        });
      });
    });
    return out;
  }

  function _buildLocks(activities) {
    var locks = [];
    (activities || []).forEach(function (a) {
      if (!a) return;
      if (a.locked) locks.push({ activityId: a.id, reason: "explicit" });
      else if (a.status === "completed") locks.push({ activityId: a.id, reason: "completed" });
      else if (a.status === "cancelled") locks.push({ activityId: a.id, reason: "cancelled" });
    });
    return locks;
  }

  function _resolveAllocationMode(rounds) {
    if (!rounds || rounds.length === 0) return "algorithmic";
    var modes = {};
    rounds.forEach(function (r) {
      var m = (r && r.allocationMode) || "algorithmic";
      modes[m] = (modes[m] || 0) + 1;
    });
    var keys = Object.keys(modes);
    if (keys.length === 1) return keys[0];
    return "mixed";
  }

  /* ─── Phase 2: Non-Residency Consumers ─── */
  function _cmpDate(a, b) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return a < b ? -1 : (a > b ? 1 : 0);
    return LIB.date.compareJalaliDate(a, b);
  }

  function _buildNonResidencyConsumers(state, rounds, planId) {
    if (!state || !Array.isArray(state.tasks)) return [];
    if (!Array.isArray(rounds) || rounds.length === 0) return [];

    var minDate = null, maxDate = null;
    rounds.forEach(function (r) {
      if (!r || !r.startDate || !r.endDate) return;
      if (!minDate || _cmpDate(r.startDate, minDate) < 0) minDate = r.startDate;
      if (!maxDate || _cmpDate(r.endDate, maxDate) > 0) maxDate = r.endDate;
    });
    if (!minDate || !maxDate) return [];

    var out = [];
    state.tasks.forEach(function (t) {
      if (!t) return;
      if (t.sourceType === "residency_activity") return;
      if (!t.date) return;
      if (!t.durationMinutes || t.durationMinutes <= 0) return;
      if (t.completed) return;
      if (_cmpDate(t.date, minDate) < 0) return;
      if (_cmpDate(t.date, maxDate) > 0) return;
      out.push({
        id: t.id,
        date: t.date,
        time: t.time || null,
        durationMinutes: t.durationMinutes,
        title: t.title || "",
        areaId: t.areaId || "",
        completed: !!t.completed,
        isTimed: !!t.time
      });
    });
    return out;
  }

  /* [PATCH:phase-28.4b] Projection-aware day occupancy for time placement */
  function _buildDayOccupancy(state, rounds) {
    if (!state) return [];
    if (!R.schedulingProjection || !R.schedulingProjection.projectAll) return [];
    if (!Array.isArray(rounds) || rounds.length === 0) return [];
    var minDate = null, maxDate = null;
    rounds.forEach(function (r) {
      if (!r || !r.startDate || !r.endDate) return;
      if (!minDate || _cmpDate(r.startDate, minDate) < 0) minDate = r.startDate;
      if (!maxDate || _cmpDate(r.endDate, maxDate) > 0) maxDate = r.endDate;
    });
    if (!minDate || !maxDate) return [];
    var projection;
    /* PATCH:mvp03-range */ try { projection = R.schedulingProjection.projectAll(state, { rangeStart: minDate, rangeEnd: maxDate }); }
    catch (e) { return []; }
    if (!projection || !Array.isArray(projection.items)) return [];
    var out = [];
    projection.items.forEach(function (it) {
      if (!it) return;
      if (!it.date) return;
      if (!it.startTime || !it.endTime) return;
      if (_cmpDate(it.date, minDate) < 0) return;
      if (_cmpDate(it.date, maxDate) > 0) return;
      out.push({
        date: it.date,
        startTime: it.startTime,
        endTime: it.endTime,
        role: it.role,
        category: it.category,
        sourceType: it.sourceType,
        sourceId: it.sourceId,
        title: it.title || ""
      });
    });
    return out;
  }
  // ─── Main entry ───
  R.plannerSnapshot.build = function (planId, scope, scopeParam) {
    scope = scope || "plan";
    var state = _getState();
    if (!state) return null;
    var rs = _rs(state);
    if (!rs) return null;

    var plan = _findPlan(rs, planId);
    if (!plan) return null;

    var rounds = _roundsForPlan(rs, planId);
    var roundIds = rounds.map(function (r) { return r.id; });

    var enrollments = _enrollmentsForRounds(rs, roundIds);
    var bookIds = enrollments.map(function (e) { return e.bookId; });
    var books = _booksByIds(rs, bookIds);
    var subjectIds = books.map(function (b) { return b.subjectId; }).filter(Boolean);
    var subjects = _subjectsByIds(rs, subjectIds);

    var activities = _activitiesForPlan(rs, planId, roundIds);
    var goals = _goalsForPlan(rs, planId);
    var assessments = _assessmentsForPlan(rs, planId, roundIds);
    var constraints = _constraintsForPlan(rs, planId);
    var overrides = _overridesForPlan(rs, planId);
    var locks = _buildLocks(activities);

    var defaultSpeed = 20;
    if (rs.settings && rs.settings.defaultStudySpeed &&
        typeof rs.settings.defaultStudySpeed.pagesPerHour === "number") {
      defaultSpeed = rs.settings.defaultStudySpeed.pagesPerHour;
    }

    var demands = R.plannerDemand.buildAll({
      enrollments: enrollments,
      books: books,
      rounds: rounds,
      activities: activities,
      defaultPagesPerHour: defaultSpeed
    });

    var calendar = _buildCalendar(rounds, planId);
    var dayOccupancy = _buildDayOccupancy(state, rounds);

    var preferences = {
      studyOrderEnabled: true,
      allocationMode: _resolveAllocationMode(rounds),
      roundAllocationModes: rounds.map(function (r) {
        return { roundId: r.id, mode: (r && r.allocationMode) || "algorithmic" };
      })
    };

    var settings = {
      defaultPagesPerHour: defaultSpeed,
      reservePolicy: (rs.settings && rs.settings.reservePolicy) || null
    };

    var nonResidencyConsumers = _buildNonResidencyConsumers(state, rounds, planId);

    var result = R.planner.createPlannerInput({
      mode: "initial",
      scope: scope,
      scopeParam: scopeParam || null,
      planId: planId,
      plan: plan,
      rounds: rounds,
      subjects: subjects,
      books: books,
      enrollments: enrollments,
      demands: demands,
      goals: goals,
      activities: activities,
      assessments: assessments,
      calendar: calendar,
      constraints: constraints,
      overrides: overrides,
      locks: locks,
      preferences: preferences,
      settings: settings
    });
    result.nonResidencyConsumers = nonResidencyConsumers;
    result.dayOccupancy = dayOccupancy;
    return result;
  };

  // ─── Debug/summary helper ───
  R.plannerSnapshot.summarize = function (snapshot) {
    if (!snapshot) return null;
    return {
      planId: snapshot.planId,
      rounds: snapshot.rounds.length,
      subjects: snapshot.subjects.length,
      books: snapshot.books.length,
      enrollments: snapshot.enrollments.length,
      demands: snapshot.demands.length,
      goals: snapshot.goals.length,
      activities: snapshot.activities.length,
      assessments: snapshot.assessments.length,
      calendarDays: snapshot.calendar.length,
      constraints: snapshot.constraints.length,
      overrides: snapshot.overrides.length,
      locks: snapshot.locks.length,
      allocationMode: snapshot.preferences.allocationMode
    };
  };

  console.log("[planner.snapshot.v6] loaded");
})();