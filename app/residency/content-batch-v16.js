(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[content.batch.v16] R missing"); return; }
  var CB = R.contentBatch = R.contentBatch = R.contentBatch || {};
  var CD = R.contentDomain;
  var CR = R.contentRequest;
  var CG = R.contentGenerator;

  function _mkId(p) {
    var LIB = window.InternshipLib;
    if (LIB && LIB.id && LIB.id.content) { try { return LIB.id.content(p); } catch (e) {} }
    return p + "-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
  }

  CB.createBatch = function (input) {
    input = input || {};
    return {
      batchId: input.batchId || _mkId("batch"),
      generationMode: input.generationMode || "single",
      sharedOptions: input.sharedOptions || {},
      items: (Array.isArray(input.items) ? input.items : []).map(function (it) {
        return CB.createItem(it);
      }),
      createdAt: Date.now()
    };
  };

  CB.createItem = function (input) {
    input = input || {};
    return {
      itemId: input.itemId || _mkId("item"),
      topic: String(input.topic || "").trim(),
      contentMapId: String(input.contentMapId || "").trim(),
      contentType: input.contentType || "topic",
      areaId: String(input.areaId || "").trim(),
      categoryId: input.categoryId || null,
      objectives: Array.isArray(input.objectives) ? input.objectives.slice() : [],
      options: input.options || {},
      status: "pending",
      error: null,
      warnings: [],
      draftId: null,
      dedupe: null
    };
  };

  CB.validateBatch = function (batch) {
    var errors = [], warnings = [];
    if (!batch || !Array.isArray(batch.items)) {
      return { valid: false, errors: ["batch is null or invalid"], warnings: [], normalizedItems: [] };
    }
    var lookup = CG.buildContentMapLookup ? CG.buildContentMapLookup() : null;
    var seenKeys = {};
    batch.items.forEach(function (it, i) {
      if (!it.topic) errors.push("item[" + i + "]: topic required");
      if (!it.contentMapId) errors.push("item[" + i + "]: contentMapId required");
      if (lookup && it.contentMapId && !lookup(it.contentMapId)) errors.push("item[" + i + "]: invalid contentMapId: " + it.contentMapId);
      if (CD.TYPES.indexOf(it.contentType) === -1) errors.push("item[" + i + "]: invalid contentType");
      var key = it.contentMapId + "::" + it.topic.toLowerCase();
      if (seenKeys[key]) warnings.push("item[" + i + "]: duplicate request (" + it.topic + ")");
      seenKeys[key] = 1;
    });
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings,
      normalizedItems: batch.items.slice()
    };
  };

  CB.addItem = function (batch, item) {
    if (!batch || !Array.isArray(batch.items)) return;
    batch.items.push(CB.createItem(item));
  };

  CB.removeItem = function (batch, itemId) {
    if (!batch || !Array.isArray(batch.items)) return;
    batch.items = batch.items.filter(function (it) { return it.itemId !== itemId; });
  };

  CB.reorderItems = function (batch, fromIdx, toIdx) {
    if (!batch || !Array.isArray(batch.items)) return;
    var arr = batch.items;
    if (fromIdx < 0 || fromIdx >= arr.length || toIdx < 0 || toIdx >= arr.length) return;
    var it = arr.splice(fromIdx, 1)[0];
    arr.splice(toIdx, 0, it);
  };

  CB.duplicateItem = function (batch, itemId) {
    if (!batch || !Array.isArray(batch.items)) return null;
    var src = batch.items.find(function (x) { return x.itemId === itemId; });
    if (!src) return null;
    var copy = CB.createItem({
      topic: src.topic + " (copy)",
      contentMapId: src.contentMapId,
      contentType: src.contentType,
      areaId: src.areaId,
      categoryId: src.categoryId,
      objectives: src.objectives.slice(),
      options: Object.assign({}, src.options)
    });
    batch.items.push(copy);
    return copy;
  };

  CB.executeBatch = function (batch, progressCallback) {
    if (!batch || !Array.isArray(batch.items)) return Promise.resolve({ ok: false, error: "invalid_batch" });
    var v = CB.validateBatch(batch);
    if (!v.valid) return Promise.resolve({ ok: false, error: "validation_failed", errors: v.errors });

    var results = { batchId: batch.batchId, items: [], success: 0, failed: 0, warnings: 0 };

    function _runOne(i) {
      if (i >= batch.items.length) return Promise.resolve(results);
      var item = batch.items[i];
      item.status = "generating";
      if (typeof progressCallback === "function") progressCallback({ index: i, total: batch.items.length, item: item });
      var req = CR.createRequest({
        areaId: item.areaId,
        contentMapId: item.contentMapId,
        contentType: item.contentType,
        topic: item.topic,
        depth: item.options.depth || "intermediate",
        generationMode: batch.generationMode,
        learningObjectives: item.objectives,
        constraints: item.options.constraints || []
      });
      return CG.generate(req, item.options)
        .then(function (def) {
          item.status = "generated";
          item.draftId = def.id;
          // Dedupe
          var drafts = R.contentStore.listDrafts();
          var dedupe = R.contentDedupe.findBest(def, drafts, {});
          item.dedupe = dedupe;
          // Store draft
          R.contentStore.addDraft(def);
          // Validation
          var val = R.contentValidator.validate(def);
          if (!val.valid) { item.status = "failed"; item.error = "validation: " + val.errors.join(", "); results.failed++; }
          else {
            item.warnings = val.warnings || [];
            if (item.warnings.length > 0) results.warnings++;
            item.status = "validated";
            results.success++;
          }
          results.items.push({ itemId: item.itemId, status: item.status, draftId: def.id, error: item.error || null, warnings: item.warnings });
          if (typeof progressCallback === "function") progressCallback({ index: i, total: batch.items.length, item: item, done: true });
          return _runOne(i + 1);
        })
        .catch(function (err) {
          item.status = "failed";
          item.error = (err && (err.code || err.message)) || "ai_error";
          results.failed++;
          results.items.push({ itemId: item.itemId, status: "failed", error: item.error });
          if (typeof progressCallback === "function") progressCallback({ index: i, total: batch.items.length, item: item, done: true });
          return _runOne(i + 1);
        });
    }

    return _runOne(0);
  };

  CB.approveAllValid = function (batch) {
    var count = 0;
    (batch.items || []).forEach(function (it) {
      if (it.status === "validated") { it.status = "approved"; count++; }
    });
    return count;
  };

  CB.applyBatch = function (batch, options) {
    options = options || {};
    if (!batch || !Array.isArray(batch.items)) return { success: false, reason: "invalid_batch" };
    var applied = [], skipped = [], failed = [];
    batch.items.forEach(function (it) {
      if (it.status !== "approved") { skipped.push({ itemId: it.itemId, reason: "not_approved" }); return; }
      var draft = it.draftId ? R.contentStore.getDraft(it.draftId) : null;
      if (!draft) { failed.push({ itemId: it.itemId, reason: "draft_missing" }); return; }
      var mergeAction = (it.dedupe && it.dedupe.similar) ? (options.defaultMergeAction || "skip") : "create";
      var res = R.contentApply.apply(draft, { mergeAction: mergeAction, createLinkedTask: !!options.createLinkedTask });
      if (res.success) { applied.push({ itemId: it.itemId, storedId: res.storedId }); it.status = "applied"; }
      else { failed.push({ itemId: it.itemId, reason: res.reason }); }
    });
    return {
      success: applied.length > 0,
      batchId: batch.batchId,
      applied: applied,
      skipped: skipped,
      failed: failed,
      statistics: { appliedCount: applied.length, skippedCount: skipped.length, failedCount: failed.length }
    };
  };

  CB.retryFailed = function (batch, progressCallback) {
    if (!batch || !Array.isArray(batch.items)) return Promise.resolve({ ok: false });
    var failedItems = batch.items.filter(function (it) { return it.status === "failed"; });
    failedItems.forEach(function (it) { it.status = "pending"; it.error = null; });
    return CB.executeBatch(batch, progressCallback);
  };

  console.log("[content.batch.v16] loaded");
})();