/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Domain  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var R = window.InternshipResidency = window.InternshipResidency || {};
  var _LIB = window.InternshipLib || null;

  function _mkId(prefix) {
    if (_LIB && _LIB.id && _LIB.id.content) {
      try { return _LIB.id.content(prefix); } catch (e) {}
    }
    return prefix + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  function _now() { return Date.now(); }

  var SCHEMA_VERSION = 1;

  var PRIORITY          = ["low", "medium", "high"];
  var BOOK_STATUS       = ["active", "paused", "archived"];
  var BOOK_SOURCE       = ["manual", "residency_default", "ai", "custom"];
  var ROUND_STATUS      = ["planned", "active", "completed", "paused"];
  var ENROLLMENT_MODE   = ["included", "excluded", "paused", "review_only", "optional"];
  var GOAL_SCOPE        = ["global", "round"];
  var GOAL_PRIORITY     = ["low", "normal", "high"];
  var ACTIVITY_KIND     = ["study", "review", "assessment"];
  var ACTIVITY_STATUS   = ["planned", "in_progress", "completed", "partial", "skipped", "cancelled"];
  var OVERRIDE_SCOPE    = ["date", "range", "round", "book", "global"];
  var PLAN_VERSION_ST   = ["active", "superseded", "archived"];
  var CAPACITY_SCOPE    = ["global", "rotation"];

  function _enumOr(v, list, fallback) {
    return (list.indexOf(v) !== -1) ? v : fallback;
  }
  function _safeStr(v) { return String(v == null ? "" : v); }
  function _safeInt(v, def) {
    var n = parseInt(v, 10);
    return isNaN(n) ? (def || 0) : n;
  }
  function _safeNum(v, def) {
    var n = parseFloat(v);
    return isNaN(n) ? (def || 0) : n;
  }
  function _clampPct(v) {
    var n = _safeNum(v, 100);
    if (n < 0) n = 0;
    if (n > 100) n = 100;
    return Math.round(n);
  }

  function createDefaultSettings() {
    return {
      examDate: null,
      totalRounds: 4,
      reservePercent: 10,
      defaultStudySpeed: { pagesPerHour: 20 },
      defaultCapacity: {
        normal: 240, free: 300, off: 0,
        preShift: 60, shift: 120, postShift: 30
      }
    };
  }

  function createEmptyResidencyState() {
    var t = _now();
    return {
      schemaVersion: SCHEMA_VERSION,
      meta: { activePlanId: null, createdAt: t, updatedAt: t },
      settings: createDefaultSettings(),
      books: [],
      rounds: [],
      enrollments: [],
      goals: [],
      activities: [],
      assessments: [],
      capacityProfiles: [],
      dayOverrides: [],
      manualOverrides: [],
      planVersions: []
    };
  }

  function createBook(input) {
    input = input || {};
    return {
      id: input.id || _mkId("book"),
      title: _safeStr(input.title).trim(),
      subjectId: _safeStr(input.subjectId),
      totalPages: Math.max(0, _safeInt(input.totalPages, 0)),
      priority: _enumOr(input.priority, PRIORITY, "medium"),
      status: _enumOr(input.status, BOOK_STATUS, "active"),
      sourceType: _enumOr(input.sourceType, BOOK_SOURCE, "manual"),
      sourceId: input.sourceId || null,
      notes: _safeStr(input.notes),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createRound(input) {
    input = input || {};
    return {
      id: input.id || _mkId("round"),
      order: _safeInt(input.order, 1),
      title: _safeStr(input.title).trim(),
      startDate: _safeStr(input.startDate),
      endDate: _safeStr(input.endDate),
      status: _enumOr(input.status, ROUND_STATUS, "planned"),
      notes: _safeStr(input.notes),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createEnrollment(input) {
    input = input || {};
    var mode = _enumOr(input.mode, ENROLLMENT_MODE, "included");
    return {
      id: input.id || _mkId("enr"),
      roundId: _safeStr(input.roundId),
      bookId: _safeStr(input.bookId),
      mode: mode,
      targetCoveragePercent: _clampPct(
        input.targetCoveragePercent == null ? 100 : input.targetCoveragePercent
      ),
      useCustomSpeed: !!input.useCustomSpeed,
      customPagesPerHour: (input.useCustomSpeed && input.customPagesPerHour != null)
        ? _safeNum(input.customPagesPerHour, 20)
        : null,
      notes: _safeStr(input.notes),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createGoal(input) {
    input = input || {};
    var scope = _enumOr(input.scopeType, GOAL_SCOPE, "global");
    return {
      id: input.id || _mkId("goal"),
      scopeType: scope,
      scopeId: scope === "round" ? _safeStr(input.scopeId) : null,
      type: _safeStr(input.type),
      target: (input.target !== undefined) ? input.target : null,
      priority: _enumOr(input.priority, GOAL_PRIORITY, "normal"),
      active: input.active !== false,
      notes: _safeStr(input.notes),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createActivity(input) {
    input = input || {};
    return {
      id: input.id || _mkId("act"),
      kind: _enumOr(input.kind, ACTIVITY_KIND, "study"),
      roundId: input.roundId ? _safeStr(input.roundId) : null,
      bookId: input.bookId ? _safeStr(input.bookId) : null,
      subjectId: input.subjectId ? _safeStr(input.subjectId) : null,
      taskId: input.taskId ? _safeStr(input.taskId) : null,
      sourceType: input.sourceType || null,
      sourceId: input.sourceId || null,
      plannedDate: input.plannedDate || null,
      plannedStartTime: input.plannedStartTime || null,
      plannedDurationMinutes: (input.plannedDurationMinutes == null) ? null : _safeInt(input.plannedDurationMinutes, 0),
      plannedPages: (input.plannedPages == null) ? null : _safeInt(input.plannedPages, 0),
      actualPages: (input.actualPages == null) ? null : _safeInt(input.actualPages, 0),
      actualDurationMinutes: (input.actualDurationMinutes == null) ? null : _safeInt(input.actualDurationMinutes, 0),
      status: _enumOr(input.status, ACTIVITY_STATUS, "planned"),
      locked: !!input.locked,
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createAssessment(input) {
    input = input || {};
    return {
      id: input.id || _mkId("asm"),
      roundId: input.roundId ? _safeStr(input.roundId) : null,
      subjectId: input.subjectId ? _safeStr(input.subjectId) : null,
      title: _safeStr(input.title).trim(),
      date: input.date || null,
      plannedDurationMinutes: (input.plannedDurationMinutes == null) ? null : _safeInt(input.plannedDurationMinutes, 0),
      questionCount: (input.questionCount == null) ? null : _safeInt(input.questionCount, 0),
      correct: (input.correct == null) ? null : _safeInt(input.correct, 0),
      wrong: (input.wrong == null) ? null : _safeInt(input.wrong, 0),
      unanswered: (input.unanswered == null) ? null : _safeInt(input.unanswered, 0),
      scorePercent: (input.scorePercent == null) ? null : _clampPct(input.scorePercent),
      notes: _safeStr(input.notes),
      taskId: input.taskId ? _safeStr(input.taskId) : null,
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createCapacityProfile(input) {
    input = input || {};
    var scope = _enumOr(input.scopeType, CAPACITY_SCOPE, "global");
    var caps = input.capacities || {};
    return {
      id: input.id || _mkId("cap"),
      scopeType: scope,
      rotationId: scope === "rotation" ? _safeStr(input.rotationId) : null,
      capacities: {
        normal: _safeInt(caps.normal, 240),
        free: _safeInt(caps.free, 300),
        off: _safeInt(caps.off, 0),
        preShift: _safeInt(caps.preShift, 60),
        shift: _safeInt(caps.shift, 120),
        postShift: _safeInt(caps.postShift, 30)
      },
      reservePercent: _clampPct(input.reservePercent == null ? 10 : input.reservePercent),
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createDayOverride(input) {
    input = input || {};
    return {
      id: input.id || _mkId("dov"),
      date: _safeStr(input.date),
      capacityMinutes: Math.max(0, _safeInt(input.capacityMinutes, 0)),
      reason: _safeStr(input.reason),
      locked: !!input.locked,
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createManualOverride(input) {
    input = input || {};
    return {
      id: input.id || _mkId("mov"),
      targetType: _safeStr(input.targetType),
      targetId: input.targetId ? _safeStr(input.targetId) : null,
      field: _safeStr(input.field),
      value: (input.value !== undefined) ? input.value : null,
      scopeType: _enumOr(input.scopeType, OVERRIDE_SCOPE, "global"),
      startDate: input.startDate || null,
      endDate: input.endDate || null,
      active: input.active !== false,
      locked: !!input.locked,
      createdAt: input.createdAt || _now(),
      updatedAt: _now()
    };
  }

  function createPlanVersion(input) {
    input = input || {};
    return {
      id: input.id || _mkId("plan"),
      version: _safeInt(input.version, 1),
      parentVersionId: input.parentVersionId || null,
      createdAt: input.createdAt || _now(),
      triggerType: _safeStr(input.triggerType),
      reason: _safeStr(input.reason),
      status: _enumOr(input.status, PLAN_VERSION_ST, "active"),
      hash: input.hash || null
    };
  }

  function validateBook(b) {
    var errs = [];
    if (!b || typeof b !== "object") return ["book is not object"];
    if (!b.id) errs.push("id required");
    if (!b.title || !b.title.trim()) errs.push("title required");
    if (!b.subjectId) errs.push("subjectId required");
    if (typeof b.totalPages !== "number" || b.totalPages < 0) errs.push("totalPages must be >= 0");
    if (PRIORITY.indexOf(b.priority) === -1) errs.push("invalid priority");
    if (BOOK_STATUS.indexOf(b.status) === -1) errs.push("invalid status");
    return errs;
  }

  function validateRound(r) {
    var errs = [];
    if (!r || typeof r !== "object") return ["round is not object"];
    if (!r.id) errs.push("id required");
    if (!r.title) errs.push("title required");
    if (typeof r.order !== "number" || r.order < 1) errs.push("order must be >= 1");
    if (ROUND_STATUS.indexOf(r.status) === -1) errs.push("invalid status");
    return errs;
  }

  function validateEnrollment(e) {
    var errs = [];
    if (!e || typeof e !== "object") return ["enrollment is not object"];
    if (!e.id) errs.push("id required");
    if (!e.roundId) errs.push("roundId required");
    if (!e.bookId) errs.push("bookId required");
    if (ENROLLMENT_MODE.indexOf(e.mode) === -1) errs.push("invalid mode");
    if (typeof e.targetCoveragePercent !== "number" ||
        e.targetCoveragePercent < 0 ||
        e.targetCoveragePercent > 100) errs.push("targetCoveragePercent must be 0..100");
    return errs;
  }

  function validateActivity(a) {
    var errs = [];
    if (!a || typeof a !== "object") return ["activity is not object"];
    if (!a.id) errs.push("id required");
    if (ACTIVITY_KIND.indexOf(a.kind) === -1) errs.push("invalid kind");
    if (ACTIVITY_STATUS.indexOf(a.status) === -1) errs.push("invalid status");
    return errs;
  }

  function checkRefs(state) {
    var errors = [];
    if (!state || !state.residency) return errors;
    var rs = state.residency;
    var bookIds = {};
    var roundIds = {};
    (rs.books || []).forEach(function (b) { if (b && b.id) bookIds[b.id] = 1; });
    (rs.rounds || []).forEach(function (r) { if (r && r.id) roundIds[r.id] = 1; });

    if (rs.enrollments) {
      rs.enrollments.forEach(function (e) {
        if (e && e.roundId && !roundIds[e.roundId]) {
          errors.push("enrollment.roundId not found: " + e.roundId);
        }
        if (e && e.bookId && !bookIds[e.bookId]) {
          errors.push("enrollment.bookId not found: " + e.bookId);
        }
      });
    }
    return errors;
  }

  function normalizeResidencyState(rs) {
    if (!rs || typeof rs !== "object") return createEmptyResidencyState();
    var out = createEmptyResidencyState();
    if (rs.schemaVersion) out.schemaVersion = rs.schemaVersion;
    if (rs.meta && typeof rs.meta === "object") {
      out.meta = {
        activePlanId: rs.meta.activePlanId || null,
        createdAt: rs.meta.createdAt || out.meta.createdAt,
        updatedAt: rs.meta.updatedAt || out.meta.updatedAt
      };
    }
    if (rs.settings && typeof rs.settings === "object") {
      var def = createDefaultSettings();
      out.settings = {
        examDate: rs.settings.examDate || null,
        totalRounds: _safeInt(rs.settings.totalRounds, def.totalRounds),
        reservePercent: _clampPct(rs.settings.reservePercent == null ? def.reservePercent : rs.settings.reservePercent),
        defaultStudySpeed: {
          pagesPerHour: _safeNum(
            (rs.settings.defaultStudySpeed && rs.settings.defaultStudySpeed.pagesPerHour) || def.defaultStudySpeed.pagesPerHour,
            def.defaultStudySpeed.pagesPerHour
          )
        },
        defaultCapacity: Object.assign({}, def.defaultCapacity, rs.settings.defaultCapacity || {}),
        dailyLifeSchedule: (function(v) {
          var dls = v && typeof v === "object" ? v : null;
          var sw = (dls && dls.studyWindow) || {};
          var VALID_WD = ["saturday","sunday","monday","tuesday","wednesday","thursday","friday"];
          function _st(t, def) {
            if (typeof t !== "string") return def;
            if (!/^\d{2}:\d{2}$/.test(t)) return def;
            var p = t.split(":");
            var h = parseInt(p[0], 10), m = parseInt(p[1], 10);
            if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) return def;
            return t;
          }
          var startTime = _st(sw.startTime, "06:30");
          var endTime = _st(sw.endTime, "23:00");
          var blocks = (dls && Array.isArray(dls.weeklyBlocks)) ? dls.weeklyBlocks : [];
          var normalizedBlocks = [];
          blocks.forEach(function(b) {
            if (!b || typeof b !== "object") return;
            var kinds = ["sleep","meal","hospital","other"];
            var kind = kinds.indexOf(b.kind) !== -1 ? b.kind : "other";
            var daysOfWeek = Array.isArray(b.daysOfWeek) ? b.daysOfWeek.filter(function(d) {
              return VALID_WD.indexOf(d) !== -1;
            }) : [];
            var bt = _st(b.startTime, "");
            var et = _st(b.endTime, "");
            if (!bt || !et) return;
            if (bt === et) return;
            normalizedBlocks.push({
              id: b.id || ("dls-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6)),
              kind: kind,
              title: b.title || "",
              daysOfWeek: daysOfWeek,
              startTime: bt,
              endTime: et,
              enabled: b.enabled !== false
            });
          });
          return {
            version: 1,
            studyWindow: { startTime: startTime, endTime: endTime },
            weeklyBlocks: normalizedBlocks
          };
        })(rs.settings.dailyLifeSchedule)
      };
    }
    function _arr(name) { return Array.isArray(rs[name]) ? rs[name] : []; }
    out.books            = _arr("books");
    out.rounds           = _arr("rounds");
    out.enrollments      = _arr("enrollments");
    out.goals            = _arr("goals");
    out.activities       = _arr("activities");
    out.assessments      = _arr("assessments");
    out.capacityProfiles = _arr("capacityProfiles");
    out.dayOverrides     = _arr("dayOverrides");
    out.manualOverrides  = _arr("manualOverrides");
    out.planVersions     = _arr("planVersions");
    return out;
  }

  R.SCHEMA_VERSION = SCHEMA_VERSION;
  R.enums = {
    PRIORITY: PRIORITY, BOOK_STATUS: BOOK_STATUS, BOOK_SOURCE: BOOK_SOURCE,
    ROUND_STATUS: ROUND_STATUS, ENROLLMENT_MODE: ENROLLMENT_MODE,
    GOAL_SCOPE: GOAL_SCOPE, GOAL_PRIORITY: GOAL_PRIORITY,
    ACTIVITY_KIND: ACTIVITY_KIND, ACTIVITY_STATUS: ACTIVITY_STATUS,
    OVERRIDE_SCOPE: OVERRIDE_SCOPE, PLAN_VERSION_STATUS: PLAN_VERSION_ST,
    CAPACITY_SCOPE: CAPACITY_SCOPE
  };
  R.createEmptyResidencyState = createEmptyResidencyState;
  R.createDefaultSettings = createDefaultSettings;
  R.createBook = createBook;
  R.createRound = createRound;
  R.createEnrollment = createEnrollment;
  R.createGoal = createGoal;
  R.createActivity = createActivity;
  R.createAssessment = createAssessment;
  R.createCapacityProfile = createCapacityProfile;
  R.createDayOverride = createDayOverride;
  R.createManualOverride = createManualOverride;
  R.createPlanVersion = createPlanVersion;
  R.validateBook = validateBook;
  R.validateRound = validateRound;
  R.validateEnrollment = validateEnrollment;
  R.validateActivity = validateActivity;
  R.checkRefs = checkRefs;
  R.normalizeResidencyState = normalizeResidencyState;

  console.log("[InternshipResidency.domain] loaded v" + SCHEMA_VERSION);
})();