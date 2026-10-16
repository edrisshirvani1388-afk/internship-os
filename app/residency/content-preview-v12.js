(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.preview.v12] R missing"); return; }
  var PV = R.contentPreview = R.contentPreview = R.contentPreview || {};
  var CV = R.contentValidator;
  var CS = R.contentSafety;
  var DD = R.contentDedupe;

  PV.build = function (def, opts) {
    opts = opts || {};
    if (!def) return { ok: false, error: "no_def" };

    var validation = CV.validate(def);
    var safety = CS.scan(def);
    var drafts = R.contentStore.listDrafts();
    var exact = DD.findExactDuplicate(def, drafts);
    var similar = DD.findSimilar(def, drafts, 0.6);

    // Also check existing customContent (simple best-effort)
    var existingHits = [];
    try {
      var s = window.__os && window.__os.getState ? window.__os.getState() : null;
      if (s && s.residency && s.residency.customContent) {
        Object.keys(s.residency.customContent || {}).forEach(function (k) {
          var bucket = s.residency.customContent[k];
          if (bucket && typeof bucket === "object") {
            Object.keys(bucket).forEach(function (id) {
              var item = bucket[id];
              if (item && item.title) {
                var sc = DD.jaccard(def.title, item.title);
                if (sc >= 0.6) existingHits.push({ id: id, title: item.title, bucket: k, score: sc });
              }
            });
          }
        });
      }
    } catch (e) {}

    return {
      ok: true,
      def: def,
      validation: validation,
      safety: safety,
      duplicates: { exact: exact, similar: similar, existingHits: existingHits },
      previewOnly: true,
      generatedAt: Date.now()
    };
  };

  PV.compareWithExisting = function (existing, incoming) {
    if (!existing) return { sections: [], incomingOnly: incoming ? (incoming.sections || []).map(function (s) { return s.title; }) : [] };
    var existingTitles = {};
    (existing.sections || []).forEach(function (s) { if (s && s.title) existingTitles[s.title] = s; });
    var rows = [];
    (incoming.sections || []).forEach(function (s) {
      if (!s || !s.title) return;
      var old = existingTitles[s.title];
      rows.push({
        title: s.title,
        hasExisting: !!old,
        diff: !old ? "new" : (old.content === s.content ? "same" : "changed")
      });
    });
    return { sections: rows };
  };

  console.log("[residency.content.preview.v12] loaded");
})();