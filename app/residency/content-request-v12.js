(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.request.v12] R missing"); return; }
  var CR = R.contentRequest = R.contentRequest = R.contentRequest || {};
  var CD = R.contentDomain;

  CR.PROMPT_BY_MODE = {
    "single": "content-generator",
    "batch": "content-generator",
    "expand": "content-expand",
    "improve": "content-improve",
    "rewrite": "content-rewrite",
    "missing_content": "content-gap-fill"
  };

  CR.createRequest = function (input) {
    input = input || {};
    var mode = CD.MODES.indexOf(input.generationMode) !== -1
      ? input.generationMode : "single";
    return {
      areaId: String(input.areaId || ""),
      contentMapId: String(input.contentMapId || ""),
      contentType: CD.TYPES.indexOf(input.contentType) !== -1 ? input.contentType : "topic",
      topic: String(input.topic || "").trim(),
      audience: input.audience || "medical_intern",
      depth: input.depth || "intermediate",
      language: "fa",
      learningObjectives: Array.isArray(input.learningObjectives)
        ? input.learningObjectives.slice() : [],
      constraints: Array.isArray(input.constraints) ? input.constraints.slice() : [],
      requestedSections: Array.isArray(input.requestedSections)
        ? input.requestedSections.slice() : [],
      existingContentContext: input.existingContentContext || null,
      currentContent: input.currentContent || null,
      generationMode: mode
    };
  };

  CR.validateRequest = function (req, contentMapLookup) {
    var errs = [];
    if (!req) return ["request is null"];
    if (!req.areaId) errs.push("areaId required");
    if (!req.contentMapId) errs.push("contentMapId required");
    if (!req.topic) errs.push("topic required");
    if (CD.TYPES.indexOf(req.contentType) === -1) errs.push("invalid contentType");
    if (CD.MODES.indexOf(req.generationMode) === -1) errs.push("invalid generationMode");
    if (typeof contentMapLookup === "function") {
      if (!contentMapLookup(req.contentMapId)) {
        errs.push("contentMapId not found: " + req.contentMapId);
      }
    }
    if ((req.generationMode === "expand" || req.generationMode === "improve" ||
         req.generationMode === "rewrite" || req.generationMode === "missing_content") &&
        !req.currentContent) {
      errs.push("currentContent required for mode " + req.generationMode);
    }
    return errs;
  };

  CR.getPromptIdForRequest = function (req) {
    return CR.PROMPT_BY_MODE[req.generationMode] || "content-generator";
  };

  console.log("[residency.content.request.v12] loaded");
})();