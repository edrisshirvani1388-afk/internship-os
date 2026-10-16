(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[content.io.v16] R missing"); return; }
  var IO = R.contentIO = R.contentIO = R.contentIO || {};
  var CD = R.contentDomain;

  var FORMAT = "internship-os-content";
  var VERSION = 1;

  /* ═══ EXPORT ═══ */

  IO.createExport = function (options) {
    options = options || {};
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return { format: FORMAT, version: VERSION, generatedAt: Date.now(), items: [] };

    var items = [];

    // Collect from customContent buckets
    var cc = s.residency.customContent || {};
    Object.keys(cc).forEach(function (bucket) {
      var b = cc[bucket];
      if (!b || typeof b !== "object") return;
      Object.keys(b).forEach(function (id) {
        var item = b[id];
        if (!item) return;
        if (options.areaId && item.areaId && item.areaId !== options.areaId) return;
        if (options.categoryId && item.categoryId && item.categoryId !== options.categoryId) return;
        if (options.contentType && item.contentType !== options.contentType) return;
        if (options.status && item.status && item.status !== options.status) return;
        if (options.generatedOnly && !(item.source && item.source.generatedBy)) return;
        if (options.approvedOnly && item.status !== "approved") return;
        if (Array.isArray(options.ids) && options.ids.length > 0 && options.ids.indexOf(id) === -1) return;
        items.push(_sanitizeForExport(item));
      });
    });

    // Drafts optionally
    if (options.includeDrafts) {
      (s.contentDrafts || []).forEach(function (d) {
        if (!d) return;
        if (Array.isArray(options.ids) && options.ids.length > 0 && options.ids.indexOf(d.id) === -1) return;
        items.push(_sanitizeForExport(d));
      });
    }

    return {
      format: FORMAT,
      version: VERSION,
      generatedAt: Date.now(),
      itemCount: items.length,
      items: items
    };
  };

  function _sanitizeForExport(item) {
    var out = JSON.parse(JSON.stringify(item));
    // Strip secrets / dangerous fields
    delete out.apiKey;
    delete out.apiKeys;
    delete out.authorization;
    delete out.__proto__;
    delete out.constructor;
    delete out.prototype;
    // Keep provenance but no keys
    if (out.source && out.source.apiKey) delete out.source.apiKey;
    return out;
  }

  IO.exportToString = function (options) {
    var pack = IO.createExport(options);
    return JSON.stringify(pack, null, 2);
  };

  IO.exportToDownload = function (options) {
    var str = IO.exportToString(options);
    var LIB = window.InternshipLib;
    var blob = new Blob([str], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "internship-os-content-" + Date.now() + ".json";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    return str.length;
  };

  /* ═══ IMPORT ═══ */

  IO.previewImport = function (jsonStringOrObject) {
    var parsed;
    try {
      parsed = (typeof jsonStringOrObject === "string") ? JSON.parse(jsonStringOrObject) : jsonStringOrObject;
    } catch (e) {
      return { ok: false, error: "invalid_json", hint: String(e.message) };
    }
    if (!parsed || typeof parsed !== "object") return { ok: false, error: "invalid_envelope" };
    if (parsed.format !== FORMAT) return { ok: false, error: "unsupported_format", hint: "expected " + FORMAT };
    if (!parsed.version || parsed.version !== VERSION) {
      return { ok: false, error: "unsupported_format_version", hint: "expected version " + VERSION };
    }
    if (!Array.isArray(parsed.items)) return { ok: false, error: "missing_items" };

    var results = [], validCount = 0, errorCount = 0, warningCount = 0, dupCount = 0;

    parsed.items.forEach(function (raw, i) {
      var normalized = _normalizeImportItem(raw, i);
      if (normalized.error) {
        results.push({ index: i, valid: false, error: normalized.error, warnings: [] });
        errorCount++;
        return;
      }
      // Validation
      var val = R.contentValidator.validate(normalized.def);
      // Dedupe
      var drafts = R.contentStore.listDrafts();
      var dedupe = R.contentDedupe.findBest(normalized.def, drafts, {});
      if (dedupe && dedupe.similar) dupCount++;

      var ok = val.valid;
      if (ok) validCount++;
      else errorCount++;
      if (val.warnings.length > 0) warningCount++;

      results.push({
        index: i,
        valid: ok,
        errors: val.errors,
        warnings: val.warnings,
        def: normalized.def,
        dedupe: dedupe
      });
    });

    return {
      ok: true,
      format: parsed.format,
      version: parsed.version,
      totalCount: parsed.items.length,
      validCount: validCount,
      errorCount: errorCount,
      warningCount: warningCount,
      duplicateCount: dupCount,
      results: results
    };
  };

  function _normalizeImportItem(raw, idx) {
    if (!raw || typeof raw !== "object") return { error: "item[" + idx + "]: not object" };
    // Prototype pollution guard
    var BAD = ["__proto__","constructor","prototype"];
    function _scan(o) {
      if (!o || typeof o !== "object") return false;
      for (var i = 0; i < BAD.length; i++) {
        if (Object.prototype.hasOwnProperty.call(o, BAD[i])) return true;
      }
      return Object.keys(o).some(function (k) { return typeof o[k] === "object" && _scan(o[k]); });
    }
    if (_scan(raw)) return { error: "item[" + idx + "]: unsafe fields detected" };

    try {
      var def = CD.createContentDefinition({
        id: raw.id,
        contentType: raw.contentType,
        areaId: raw.areaId,
        categoryId: raw.categoryId,
        contentMapId: raw.contentMapId,
        title: raw.title,
        shortTitle: raw.shortTitle,
        description: raw.description,
        difficulty: raw.difficulty,
        tags: raw.tags,
        objectives: raw.objectives,
        prerequisites: raw.prerequisites,
        sections: raw.sections,
        keyPoints: raw.keyPoints,
        pitfalls: raw.pitfalls,
        references: raw.references,
        metadata: raw.metadata,
        source: raw.source,
        version: raw.version,
        status: raw.status || "draft",
        createdAt: raw.createdAt
      });
      return { def: def };
    } catch (e) {
      return { error: "item[" + idx + "]: " + String(e.message || e) };
    }
  }

  IO.applyImport = function (preview, options) {
    options = options || {};
    if (!preview || !preview.ok) return { success: false, reason: "invalid_preview" };
    var applied = [], failed = [], skipped = [];
    preview.results.forEach(function (r) {
      if (!r.valid) { failed.push({ index: r.index, reason: "validation" }); return; }
      if (Array.isArray(options.selectedIndices) && options.selectedIndices.length > 0 && options.selectedIndices.indexOf(r.index) === -1) {
        skipped.push({ index: r.index, reason: "not_selected" });
        return;
      }
      var mergeAction = options.mergeAction || (r.dedupe && r.dedupe.similar ? "skip" : "create");
      // Ensure draft exists in state
      R.contentStore.addDraft(r.def);
      var res = R.contentApply.apply(r.def, {
        mergeAction: mergeAction,
        createLinkedTask: !!options.createLinkedTask
      });
      if (res.success) applied.push({ index: r.index, storedId: res.storedId });
      else failed.push({ index: r.index, reason: res.reason });
    });

    // Audit trail
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (s && s.residency) {
      if (!Array.isArray(s.residency.imports)) s.residency.imports = [];
      s.residency.imports.push({
        id: "imp-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 5),
        at: Date.now(),
        title: "JSON Import",
        description: "Content IO import (" + applied.length + " applied)",
        packageType: "content_io_v16",
        operationType: "import",
        itemCount: preview.totalCount,
        successCount: applied.length,
        failedCount: failed.length,
        entities: ["contentItems"]
      });
      if (window.__os.saveState) window.__os.saveState();
    }

    return {
      success: applied.length > 0,
      applied: applied,
      failed: failed,
      skipped: skipped,
      statistics: { appliedCount: applied.length, failedCount: failed.length, skippedCount: skipped.length }
    };
  };

  IO.roundTripTest = function (sampleDef) {
    if (!sampleDef) return { ok: false, error: "no_sample" };
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return { ok: false };
    // temporarily attach sample to customContent for export test
    var cc = s.residency.customContent = s.residency.customContent || {};
    if (!cc.contentItems) cc.contentItems = {};
    var testId = "roundtrip-" + Date.now().toString(36);
    cc.contentItems[testId] = _sanitizeForExport(Object.assign({}, sampleDef, { id: testId }));
    var pack = IO.createExport({ ids: [testId] });
    delete cc.contentItems[testId];
    if (pack.items.length === 0) return { ok: false, error: "export_empty" };
    var preview = IO.previewImport(JSON.stringify(pack));
    if (!preview.ok) return { ok: false, error: preview.error };
    var first = preview.results[0];
    if (!first || !first.valid) return { ok: false, error: "validation" };
    var fields = ["title","contentType","contentMapId","areaId"];
    var mismatches = fields.filter(function (f) { return String(first.def[f] || "") !== String(sampleDef[f] || ""); });
    return { ok: mismatches.length === 0, mismatches: mismatches };
  };

  console.log("[content.io.v16] loaded");
})();