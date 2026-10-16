(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.dedupe.v12] R missing"); return; }
  var DD = R.contentDedupe = R.contentDedupe = R.contentDedupe || {};

  function _norm(s) {
    return String(s || "").trim().toLowerCase()
      .replace(/[\u064A\u06CC]/g, "ی")
      .replace(/[\u0643]/g, "ک")
      .replace(/[\u200c\u200f\u200e]/g, " ")
      .replace(/\s+/g, " ");
  }

  function _tokens(s) {
    return _norm(s).split(/\s+/).filter(function (t) { return t.length > 1; });
  }

  DD.jaccard = function (a, b) {
    var ta = {}, tb = {};
    _tokens(a).forEach(function (t) { ta[t] = 1; });
    _tokens(b).forEach(function (t) { tb[t] = 1; });
    var keys = Object.keys(ta);
    var inter = 0;
    keys.forEach(function (k) { if (tb[k]) inter++; });
    var union = Object.keys(ta).length + Object.keys(tb).length - inter;
    return union > 0 ? inter / union : 0;
  };

  DD.findExactDuplicate = function (def, drafts) {
    if (!def) return null;
    var target = _norm(def.title);
    for (var i = 0; i < (drafts || []).length; i++) {
      var d = drafts[i];
      if (!d) continue;
      if (d.id === def.id) continue;
      if (_norm(d.title) === target) return d;
    }
    return null;
  };

  DD.findSimilar = function (def, drafts, threshold) {
    threshold = threshold || 0.6;
    var out = [];
    (drafts || []).forEach(function (d) {
      if (!d) return;
      if (d.id === def.id) return;
      var score = DD.jaccard(def.title, d.title);
      if (score >= threshold) {
        out.push({ id: d.id, title: d.title, score: Math.round(score * 100) / 100 });
      }
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  };

  DD.checkAgainstExisting = function (def, existingLookup) {
    if (!def || typeof existingLookup !== "function") return { exact: null, similar: [] };
    var exact = existingLookup(def.contentMapId, def.title);
    var similar = [];
    if (!exact) {
      similar = existingLookup.similar(def.title) || [];
    }
    return { exact: exact, similar: similar };
  };

  console.log("[residency.content.dedupe.v12] loaded");
})();