(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.merge.v12] R missing"); return; }
  var MG = R.contentMerge = R.contentMerge = R.contentMerge || {};

  MG.plan = function (def, duplicateInfo, action) {
    action = action || "skip";
    if (!def) return { action: "skip", reason: "no_def" };
    if (!duplicateInfo || !duplicateInfo.exact) {
      return { action: action === "skip" ? "create" : action, reason: "no_duplicate" };
    }
    if (action === "create") return { action: "create", reason: "user_chose_create", existingId: duplicateInfo.exact.id };
    if (action === "replace") return { action: "replace", reason: "user_chose_replace", existingId: duplicateInfo.exact.id };
    if (action === "merge")   return { action: "merge",   reason: "user_chose_merge",   existingId: duplicateInfo.exact.id };
    return { action: "skip", reason: "user_chose_skip", existingId: duplicateInfo.exact.id };
  };

  MG.mergeContent = function (existing, incoming) {
    if (!existing) return incoming;
    var merged = JSON.parse(JSON.stringify(existing));
    if (incoming.description) merged.description = incoming.description;
    if (Array.isArray(incoming.objectives) && incoming.objectives.length > 0) {
      merged.objectives = (merged.objectives || []).concat(incoming.objectives.filter(function (o) {
        return (merged.objectives || []).indexOf(o) === -1;
      }));
    }
    var sectionIndex = {};
    (merged.sections || []).forEach(function (s) { if (s && s.title) sectionIndex[s.title] = s; });
    (incoming.sections || []).forEach(function (s) {
      if (!s || !s.title) return;
      if (sectionIndex[s.title]) sectionIndex[s.title].content = s.content;
      else { if (!merged.sections) merged.sections = []; merged.sections.push(s); }
    });
    if (Array.isArray(incoming.keyPoints)) {
      merged.keyPoints = (merged.keyPoints || []).concat(incoming.keyPoints);
    }
    if (Array.isArray(incoming.pitfalls)) {
      merged.pitfalls = (merged.pitfalls || []).concat(incoming.pitfalls);
    }
    if (Array.isArray(incoming.references)) {
      var refIndex = {};
      (merged.references || []).forEach(function (r) { if (r && r.title) refIndex[r.title] = 1; });
      (incoming.references || []).forEach(function (r) {
        if (!r || !r.title) return;
        if (!refIndex[r.title]) { if (!merged.references) merged.references = []; merged.references.push(r); }
      });
    }
    merged.updatedAt = Date.now();
    return merged;
  };

  console.log("[residency.content.merge.v12] loaded");
})();