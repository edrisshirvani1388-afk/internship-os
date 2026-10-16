(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.safety.v12] R missing"); return; }
  var CS = R.contentSafety = R.contentSafety = R.contentSafety || {};

  // Deterministic pattern-based safety scanner for medical content
  var PATTERNS = [
    { id: "dose_claim",     re: /\b\d+\s*(mg|mcg|g|ml|cc|IU|units?)\b/i,         severity: "warning", category: "dosage" },
    { id: "absolute_claim", re: /(همیشه|هرگز|قطعاً|بدون شک|حتماً)/,               severity: "info",    category: "claim" },
    { id: "contraindication", re: /(منع مصرف|کنترااندیکاسیون|contraindicated)/i,   severity: "info",    category: "safety" },
    { id: "emergency_mgmt", re: /(درمان فوری|management of emergency|ABC|resuscitat)/i, severity: "info", category: "emergency" },
    { id: "reference_claim", re: /(طبق|بر اساس)\s+[^،.\n]{3,50}(،|\.|$)/,          severity: "info",    category: "reference" }
  ];

  CS.scan = function (def) {
    var flags = [];
    if (!def) return { flags: flags };
    function _scanText(text, path) {
      if (!text || typeof text !== "string") return;
      PATTERNS.forEach(function (p) {
        if (p.re.test(text)) {
          flags.push({ patternId: p.id, severity: p.severity, category: p.category, path: path });
        }
      });
    }
    _scanText(def.title, "title");
    _scanText(def.description, "description");
    (def.sections || []).forEach(function (s, i) {
      _scanText(s && s.title, "sections[" + i + "].title");
      _scanText(s && s.content, "sections[" + i + "].content");
    });
    (def.keyPoints || []).forEach(function (k, i) { _scanText(k, "keyPoints[" + i + "]"); });
    (def.pitfalls || []).forEach(function (p, i) { _scanText(p, "pitfalls[" + i + "]"); });
    // Dedupe by patternId+path
    var seen = {};
    var uniq = [];
    flags.forEach(function (f) {
      var k = f.patternId + "|" + f.path;
      if (seen[k]) return;
      seen[k] = 1; uniq.push(f);
    });
    return { flags: uniq, forceDraft: uniq.length > 0 };
  };

  console.log("[residency.content.safety.v12] loaded");
})();