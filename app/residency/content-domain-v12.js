(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.domain.v12] R missing"); return; }
  var CD = R.contentDomain = R.contentDomain = R.contentDomain || {};
  var LIB = window.InternshipLib;

  function _mkId(p) {
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }
  function _now() { return Date.now(); }
  function _str(v) { return String(v == null ? "" : v); }
  function _int(v, d) {
    if (typeof d === "undefined") d = 0;
    if (v == null || v === "") return d;
    var n = parseInt(v, 10);
    return isNaN(n) ? d : n;
  }
  function _enum(v, list, fb) { return list.indexOf(v) !== -1 ? v : fb; }

  var CONTENT_STATUSES = ["draft","validated","approved","published","archived","rejected"];
  var CONTENT_TYPES = [
    "topic","disease","syndrome","procedure","emergency","drug",
    "diagnostic_approach","clinical_case","checklist","algorithm","review"
  ];
  var GENERATION_MODES = ["single","batch","expand","improve","rewrite","missing_content"];
  var SOURCE_STATUSES = ["ai_suggested","user_provided","imported","verified"];
  var MERGE_ACTIONS = ["create","replace","merge","skip"];
  var DIFFICULTIES = ["basic","intermediate","advanced"];

  CD.STATUSES = CONTENT_STATUSES;
  CD.TYPES = CONTENT_TYPES;
  CD.MODES = GENERATION_MODES;
  CD.SOURCE_STATUSES = SOURCE_STATUSES;
  CD.MERGE_ACTIONS = MERGE_ACTIONS;
  CD.DIFFICULTIES = DIFFICULTIES;

  CD.createContentDefinition = function (input) {
    input = input || {};
    var t = _now();
    return {
      id: input.id || _mkId("cnt"),
      contentType: _enum(input.contentType, CONTENT_TYPES, "topic"),
      areaId: _str(input.areaId),
      categoryId: input.categoryId ? _str(input.categoryId) : null,
      parentId: input.parentId ? _str(input.parentId) : null,
      contentMapId: _str(input.contentMapId),
      title: _str(input.title),
      shortTitle: input.shortTitle ? _str(input.shortTitle) : null,
      description: _str(input.description),
      difficulty: _enum(input.difficulty, DIFFICULTIES, "intermediate"),
      priority: input.priority || "normal",
      tags: Array.isArray(input.tags) ? input.tags.map(String) : [],
      objectives: Array.isArray(input.objectives) ? input.objectives.map(String) : [],
      prerequisites: Array.isArray(input.prerequisites) ? input.prerequisites.map(String) : [],
      sections: Array.isArray(input.sections) ? input.sections.map(function (s) {
        return {
          id: s.id || _mkId("sec"),
          title: _str(s.title),
          type: s.type || "text",
          content: _str(s.content)
        };
      }) : [],
      keyPoints: Array.isArray(input.keyPoints) ? input.keyPoints.map(String) : [],
      pitfalls: Array.isArray(input.pitfalls) ? input.pitfalls.map(String) : [],
      references: Array.isArray(input.references) ? input.references.map(function (r) {
        return {
          id: r.id || _mkId("ref"),
          title: _str(r.title),
          authors: Array.isArray(r.authors) ? r.authors.map(String) : [],
          year: r.year != null ? _int(r.year, null) : null,
          identifier: r.identifier ? _str(r.identifier) : null,
          type: r.type || "textbook",
          url: r.url ? _str(r.url) : null,
          sourceStatus: _enum(r.sourceStatus, SOURCE_STATUSES, "ai_suggested")
        };
      }) : [],
      body: input.body ? _str(input.body) : null,
      metadata: input.metadata && typeof input.metadata === "object" ? input.metadata : {},
      source: {
        type: (input.source && input.source.type) || "ai",
        generatedBy: (input.source && input.source.generatedBy) || "unknown",
        promptId: input.source ? (input.source.promptId || null) : null,
        promptVersion: input.source ? (input.source.promptVersion || null) : null,
        provider: input.source ? (input.source.provider || null) : null,
        model: input.source ? (input.source.model || null) : null,
        sourceContentIds: (input.source && Array.isArray(input.source.sourceContentIds))
          ? input.source.sourceContentIds.slice() : [],
        generatedAt: (input.source && input.source.generatedAt) || t
      },
      version: _int(input.version, 1),
      status: _enum(input.status, CONTENT_STATUSES, "draft"),
      createdAt: input.createdAt || t,
      updatedAt: t
    };
  };

  CD.validateShape = function (c) {
    var errs = [];
    if (!c || typeof c !== "object") return ["content is not object"];
    if (!c.id) errs.push("id required");
    if (CONTENT_TYPES.indexOf(c.contentType) === -1) errs.push("invalid contentType");
    if (!c.title || !c.title.trim()) errs.push("title required");
    if (CONTENT_STATUSES.indexOf(c.status) === -1) errs.push("invalid status");
    if (!Array.isArray(c.sections)) errs.push("sections must be array");
    return errs;
  };

  // Section templates per content type (deterministic)
  var SECTION_TEMPLATES = {
    topic: ["تعریف","اهمیت","مفاهیم کلیدی","نکات بالینی","Key Points"],
    disease: ["تعریف","اپیدمیولوژی","Clinical Presentation","Red Flags","Differential Diagnosis","Diagnosis","Treatment","Complications","Follow-up","Key Points"],
    syndrome: ["تعریف","اجزای سندرم","Clinical Presentation","Red Flags","Diagnosis","Treatment","Key Points"],
    procedure: ["Indications","Contraindications","Equipment","Preparation","Steps","Complications","Aftercare","Pitfalls"],
    emergency: ["Recognition","Immediate Assessment","ABC","Red Flags","Immediate Management","Definitive Management","Disposition","Pitfalls"],
    drug: ["کلاس دارویی","Mechanism","Indications","Dosing (general)","Side Effects","Contraindications","Interactions","Key Points"],
    diagnostic_approach: ["Problem Statement","Initial Assessment","Differential","Tests","Interpretation","Next Steps","Key Points"],
    clinical_case: ["Presentation","History","Exam","Workup","Diagnosis","Management","Discussion"],
    checklist: ["Items","Pre-conditions","Steps","Post-conditions"],
    algorithm: ["Entry Criteria","Step 1","Step 2","Step 3","Decision Points","End Criteria"],
    review: ["خلاصه","نکات کلیدی","Pitfalls","Key Points"]
  };

  CD.getSectionTemplate = function (contentType) {
    return (SECTION_TEMPLATES[contentType] || SECTION_TEMPLATES.topic).slice();
  };

  CD.getSchemaVersion = function () { return 1; };

  console.log("[residency.content.domain.v12] loaded");
})();