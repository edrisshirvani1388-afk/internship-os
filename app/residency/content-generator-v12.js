(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.generator.v12] R missing"); return; }
  var CG = R.contentGenerator = R.contentGenerator = R.contentGenerator || {};
  var CR = R.contentRequest;
  var CD = R.contentDomain;
  var P = R.aiPrompts;

  function _mkId(p) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  CG.buildContentMapLookup = function () {
    // lookup function that returns true if contentMapId exists in the data structure
    return function (id) {
      if (!id) return false;
      var DATA = window.INTERNSHIP_DATA || {};
      var LAS = DATA.lifeAreasStructure || { areas: {} };
      var parts = String(id).split(".");
      if (parts.length < 2) return false;
      var area = LAS.areas && LAS.areas[parts[0]];
      if (!area) return false;
      // path[0] area, path[1] category index, optional [2] sub, [3] item
      if (!area.categories) return false;
      var ci = parseInt(parts[1], 10);
      if (isNaN(ci) || ci < 0 || ci >= area.categories.length) return false;
      var cat = area.categories[ci];
      if (parts.length >= 3) {
        var si = parseInt(parts[2], 10);
        if (isNaN(si) || si < 0) return false;
        var subs = cat.subcategories || cat.items || [];
        if (si >= subs.length) return false;
      }
      return true;
    };
  };

  CG.buildPromptUserMessage = function (req) {
    var parts = [];
    parts.push("## درخواست");
    parts.push("Area: " + req.areaId);
    parts.push("Content Map ID: " + req.contentMapId);
    parts.push("Content Type: " + req.contentType);
    parts.push("Topic: " + req.topic);
    parts.push("Mode: " + req.generationMode);
    parts.push("Depth: " + req.depth);
    if (req.learningObjectives.length > 0) {
      parts.push("Objectives:");
      req.learningObjectives.forEach(function (o) { parts.push("- " + o); });
    }
    if (req.constraints.length > 0) {
      parts.push("Constraints:");
      req.constraints.forEach(function (c) { parts.push("- " + c); });
    }
    parts.push("");
    parts.push("## Section Template (توسط سیستم تعیین شده)");
    var tmpl = CD.getSectionTemplate(req.contentType);
    parts.push(tmpl.join(" | "));
    parts.push("");
    if (req.currentContent) {
      parts.push("## محتوای فعلی");
      parts.push(JSON.stringify(req.currentContent, null, 2).slice(0, 4000));
      parts.push("");
    }
    if (req.existingContentContext) {
      parts.push("## محتوای مرتبط موجود (برای جلوگیری از تکرار)");
      parts.push(JSON.stringify(req.existingContentContext, null, 2).slice(0, 2000));
      parts.push("");
    }
    parts.push("لطفاً خروجی JSON معتبر برگردان.");
    return parts.join("\n");
  };

  CG.normalizeAIOutput = function (parsed, req, meta) {
    meta = meta || {};
    if (!parsed || typeof parsed !== "object") parsed = {};
    var rawSections = Array.isArray(parsed.sections) ? parsed.sections : [];
    var sections = rawSections.map(function (s, i) {
      if (!s || typeof s !== "object") return null;
      return {
        id: String(s.id || ("sec" + (i + 1))),
        title: String(s.title || "").slice(0, 200),
        type: String(s.type || "text").slice(0, 40),
        content: String(s.content || "")
      };
    }).filter(Boolean);

    var refs = Array.isArray(parsed.references) ? parsed.references.map(function (r, i) {
      if (!r || typeof r !== "object") return null;
      return {
        id: "ref" + (i + 1),
        title: String(r.title || "").slice(0, 300),
        authors: Array.isArray(r.authors) ? r.authors.slice(0, 10).map(String) : [],
        year: r.year != null ? parseInt(r.year, 10) : null,
        identifier: r.identifier ? String(r.identifier).slice(0, 100) : null,
        type: r.type ? String(r.type).slice(0, 40) : "textbook",
        url: r.url ? String(r.url).slice(0, 500) : null,
        sourceStatus: "ai_suggested"
      };
    }).filter(Boolean) : [];

    return R.contentDomain.createContentDefinition({
      areaId: req.areaId,
      contentMapId: req.contentMapId,
      contentType: req.contentType,
      title: String(parsed.title || req.topic || "").slice(0, 200),
      shortTitle: parsed.shortTitle ? String(parsed.shortTitle).slice(0, 80) : null,
      description: String(parsed.description || "").slice(0, 800),
      difficulty: req.depth,
      objectives: Array.isArray(parsed.objectives) ? parsed.objectives.slice(0, 20).map(String) : req.learningObjectives,
      sections: sections,
      keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 30).map(String) : [],
      pitfalls: Array.isArray(parsed.pitfalls) ? parsed.pitfalls.slice(0, 30).map(String) : [],
      references: refs,
      metadata: { generatedForArea: req.areaId, requestedSections: req.requestedSections },
      source: {
        type: "ai",
        generatedBy: "content-generator",
        promptId: meta.promptId || null,
        promptVersion: meta.promptVersion || null,
        provider: meta.provider || null,
        model: meta.model || null,
        sourceContentIds: req.currentContent && req.currentContent.id ? [req.currentContent.id] : [],
        generatedAt: Date.now()
      },
      status: "draft"
    });
  };

  CG.generate = function (request, options) {
    options = options || {};
    var AI = window.InternshipAI;
    if (!AI || typeof AI.chat !== "function") {
      return Promise.reject({ code: "ai_not_loaded", hint: "AI module not available" });
    }
    var promptId = CR.getPromptIdForRequest(request);
    var prompt = P.get(promptId);
    if (!prompt) {
      return Promise.reject({ code: "unknown_prompt", hint: promptId });
    }

    var lookup = CG.buildContentMapLookup();
    var errs = CR.validateRequest(request, lookup);
    if (errs.length > 0) {
      return Promise.reject({ code: "invalid_request", hint: errs.join("; ") });
    }

    var userMsg = CG.buildPromptUserMessage(request);
    var messages = [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: userMsg }
    ];

    return AI.chat(messages, {
      temperature: options.temperature || 0.4,
      maxTokens: options.maxTokens || 3500
    }).then(function (r) {
      var parsed;
      try {
        var txt = String(r.text || "");
        // strip markdown fence
        var fenceMatch = txt.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (fenceMatch) txt = fenceMatch[1];
        parsed = JSON.parse(txt);
      } catch (e) {
        var err = new Error("AI response not JSON");
        err.code = "invalid_json";
        err.raw = r.text;
        throw err;
      }
      var def = CG.normalizeAIOutput(parsed, request, {
        promptId: promptId,
        promptVersion: prompt.version,
        provider: r.provider || null,
        model: r.model || null
      });
      return def;
    });
  };

  console.log("[residency.content.generator.v12] loaded");
})();