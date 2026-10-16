(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.apply.v12] R missing"); return; }
  var AP = R.contentApply = R.contentApply = R.contentApply || {};
  var CV = R.contentValidator;
  var MG = R.contentMerge;
  var DD = R.contentDedupe;

  function _state() { return window.__os && window.__os.getState ? window.__os.getState() : null; }
  function _save() { if (window.__os && window.__os.saveState) { try { window.__os.saveState(); } catch (e) {} } }

  AP.isAlreadyApplied = function (draftId) {
    var s = _state();
    if (!s) return false;
    return (s.residency && Array.isArray(s.residency.imports)) &&
      s.residency.imports.some(function (imp) { return imp && imp.sourceDraftId === draftId; });
  };

  AP.apply = function (def, opts) {
    opts = opts || {};
    if (!def) return { success: false, reason: "no_def" };
    if (AP.isAlreadyApplied(def.id)) return { success: false, reason: "already_applied" };

    // 1) validate final
    var v = CV.validate(def);
    if (!v.valid) return { success: false, reason: "invalid", errors: v.errors };

    // 2) partial section approval
    var approvedIds = opts.approvedSectionIds;
    var finalDef = JSON.parse(JSON.stringify(def));
    if (Array.isArray(approvedIds) && approvedIds.length > 0) {
      var set = {};
      approvedIds.forEach(function (id) { set[id] = 1; });
      finalDef.sections = (finalDef.sections || []).filter(function (s) { return set[s.id]; });
      if (finalDef.sections.length === 0) return { success: false, reason: "no_sections_approved" };
    }

    // 3) duplicate check against drafts (still present)
    var dupInfo = {
      exact: DD.findExactDuplicate(finalDef, R.contentStore.listDrafts())
    };
    var mergeAction = opts.mergeAction || "skip";
    var plan = MG.plan(finalDef, dupInfo, mergeAction);

    var s = _state();
    if (!s) return { success: false, reason: "no_state" };
    if (!s.residency) return { success: false, reason: "no_residency" };

    // Init buckets if needed
    if (!s.residency.customContent) s.residency.customContent = {};
    var cc = s.residency.customContent;
    var bucketKey = _bucketKeyFor(finalDef.contentType);
    if (!cc[bucketKey]) cc[bucketKey] = {};

    var storedId, actionTaken = plan.action;
    if (plan.action === "skip" && dupInfo.exact) {
      return { success: false, reason: "duplicate_skipped", existingId: dupInfo.exact.id };
    }
    if (plan.action === "replace" && dupInfo.exact) {
      cc[bucketKey][dupInfo.exact.id] = _projectStored(finalDef, dupInfo.exact.id);
      storedId = dupInfo.exact.id;
      // remove from drafts since it's now committed
      R.contentStore.removeDraft(finalDef.id);
    } else if (plan.action === "merge" && dupInfo.exact) {
      var merged = MG.mergeContent(dupInfo.exact, finalDef);
      cc[bucketKey][dupInfo.exact.id] = _projectStored(merged, dupInfo.exact.id);
      storedId = dupInfo.exact.id;
      R.contentStore.removeDraft(finalDef.id);
    } else {
      // create
      storedId = finalDef.id;
      cc[bucketKey][storedId] = _projectStored(finalDef, storedId);
      R.contentStore.removeDraft(finalDef.id);
    }

    // 4) record import provenance
    if (!Array.isArray(s.residency.imports)) s.residency.imports = [];
    var impBatch = {
      id: "imp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 5),
      at: Date.now(),
      title: finalDef.title,
      description: "Content Generator v12 import",
      packageType: "content_generator_v12",
      sourceDraftId: def.id,
      storedId: storedId,
      action: actionTaken,
      source: finalDef.source || null,
      entities: [bucketKey]
    };
    s.residency.imports.push(impBatch);

    // 5) optional task creation
    var createdTaskId = null;
    if (opts.createLinkedTask) {
      var task = {
        id: "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 5),
        title: "مطالعه: " + finalDef.title,
        areaId: "study",
        date: (window.InternshipLib && window.InternshipLib.date)
          ? window.InternshipLib.date.todayJalaliString() : "",
        time: "",
        durationMinutes: null,
        priority: "normal",
        recurrence: "none",
        description: "",
        completed: false,
        sourceType: "content_generator",
        sourceId: storedId,
        taskType: "study",
        createdAt: Date.now(),
        updatedAt: Date.now()
      };
      if (!Array.isArray(s.tasks)) s.tasks = [];
      s.tasks.push(task);
      createdTaskId = task.id;
    }

    _save();
    return {
      success: true,
      storedId: storedId,
      action: actionTaken,
      importId: impBatch.id,
      createdTaskId: createdTaskId,
      provenance: finalDef.source || null
    };
  };

  function _bucketKeyFor(contentType) {
    // map content type to customContent bucket
    switch (contentType) {
      case "procedure": return "procedureItems";
      case "clinical_case": return "clinicalItems";
      default: return "contentItems";
    }
  }

  function _projectStored(def, id) {
    return {
      id: id,
      title: def.title,
      description: def.description,
      contentType: def.contentType,
      contentMapId: def.contentMapId,
      areaId: def.areaId,
      sections: def.sections || [],
      keyPoints: def.keyPoints || [],
      pitfalls: def.pitfalls || [],
      references: def.references || [],
      objectives: def.objectives || [],
      tags: def.tags || [],
      source: def.source || null,
      version: def.version || 1,
      status: "approved",
      createdAt: def.createdAt,
      updatedAt: Date.now()
    };
  }

  console.log("[residency.content.apply.v12] loaded");
})();