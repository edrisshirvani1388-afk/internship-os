(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.validator.v12] R missing"); return; }
  var CV = R.contentValidator = R.contentValidator = R.contentValidator || {};
  var CD = R.contentDomain;

  var MAX_TITLE = 200;
  var MAX_SECTION = 8000;
  var MAX_SECTIONS = 30;
  var MAX_TOTAL = 60000;

  CV.validate = function (def, ctx) {
    ctx = ctx || {};
    var errors = [], warnings = [];
    if (!def || typeof def !== "object") {
      return { valid: false, errors: ["def is not object"], warnings: [], normalizedContent: null };
    }

    if (!def.title || !def.title.trim()) errors.push("title empty");
    else if (def.title.length > MAX_TITLE) errors.push("title too long");

    if (!def.contentType || CD.TYPES.indexOf(def.contentType) === -1) {
      errors.push("invalid contentType");
    }

    if (!def.contentMapId) errors.push("contentMapId empty");

    if (!Array.isArray(def.sections) || def.sections.length === 0) {
      errors.push("no sections");
    } else if (def.sections.length > MAX_SECTIONS) {
      errors.push("too many sections (" + def.sections.length + ")");
    }

    var seen = {};
    var totalLen = 0;
    (def.sections || []).forEach(function (s, i) {
      if (!s) return;
      if (!s.id) errors.push("section[" + i + "] missing id");
      else if (seen[s.id]) errors.push("duplicate section id: " + s.id);
      else seen[s.id] = 1;
      if (!s.title) warnings.push("section[" + i + "] missing title");
      if (!s.content || !s.content.trim()) warnings.push("section[" + i + "] empty content");
      if (s.content && s.content.length > MAX_SECTION) errors.push("section[" + i + "] too long");
      totalLen += (s.content || "").length;
    });
    if (totalLen > MAX_TOTAL) errors.push("total content too large");

    var unsafeFields = ["__proto__","constructor","prototype"];
    function _scanUnsafe(obj, path) {
      if (!obj || typeof obj !== "object") return;
      Object.keys(obj).forEach(function (k) {
        if (unsafeFields.indexOf(k) !== -1) {
          errors.push("unsafe field: " + path + "." + k);
        }
        if (obj[k] && typeof obj[k] === "object") _scanUnsafe(obj[k], path + "." + k);
      });
    }
    _scanUnsafe(def, "content");

    // References
    (def.references || []).forEach(function (ref, i) {
      if (!ref) { warnings.push("ref[" + i + "] null"); return; }
      if (!ref.title) errors.push("ref[" + i + "] missing title");
      if (!ref.sourceStatus) errors.push("ref[" + i + "] missing sourceStatus");
      if (ref.sourceStatus === "verified") {
        warnings.push("ref[" + i + "] marked verified but no verification performed");
      }
      if (ref.url && !/^https?:\/\//.test(ref.url)) {
        errors.push("ref[" + i + "] invalid url");
      }
    });

    var valid = errors.length === 0;
    return {
      valid: valid,
      errors: errors,
      warnings: warnings,
      normalizedContent: valid ? def : null
    };
  };

  console.log("[residency.content.validator.v12] loaded");
})();