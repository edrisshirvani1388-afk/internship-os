(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[content.dedupe.v16] R missing"); return; }
  var DD = R.contentDedupe = R.contentDedupe || {};

  DD.THRESHOLDS = {
    exactThreshold: 0.95,
    highSimilarityThreshold: 0.75,
    similarThreshold: 0.55,
    distinctThreshold: 0.40
  };

  DD.WEIGHTS = {
    title: 0.50,
    tokens: 0.25,
    contentMap: 0.15,
    contentType: 0.10
  };

  DD.STOPWORDS_FA = ["و","با","از","به","در","که","را","این","آن","یک","های","ها","است","بود","شد"];

  function _normalizePersian(s) {
    return String(s || "")
      .replace(/[\u064A\u06CC\u0649]/g, "ی")
      .replace(/[\u0643\u06A9]/g, "ک")
      .replace(/[\u0629]/g, "ه")
      .replace(/[\u064B-\u065F\u0670]/g, "")
      .replace(/[\u200B-\u200F\u202A-\u202E]/g, "")
      .replace(/[،؛:,.!?()[\]{}<>"'\u00AB\u00BB]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }
  DD.normalizePersian = _normalizePersian;

  function _tokens(s) {
    var norm = _normalizePersian(s);
    if (!norm) return [];
    return norm.split(/\s+/).filter(function (t) {
      return t.length > 1 && DD.STOPWORDS_FA.indexOf(t) === -1;
    });
  }
  DD.tokens = _tokens;

  function _jaccard(a, b) {
    var ta = {}, tb = {};
    _tokens(a).forEach(function (t) { ta[t] = 1; });
    _tokens(b).forEach(function (t) { tb[t] = 1; });
    var keysA = Object.keys(ta), keysB = Object.keys(tb);
    if (keysA.length === 0 && keysB.length === 0) return 0;
    var inter = 0;
    keysA.forEach(function (k) { if (tb[k]) inter++; });
    var union = keysA.length + keysB.length - inter;
    return union > 0 ? inter / union : 0;
  }
  DD.jaccard = _jaccard;

  function _exactMatch(a, b) {
    return _normalizePersian(a) === _normalizePersian(b);
  }

  function _collectStrings(def) {
    var out = [];
    if (!def) return out;
    if (def.title) out.push(def.title);
    if (def.shortTitle) out.push(def.shortTitle);
    if (Array.isArray(def.tags)) def.tags.forEach(function (t) { if (t) out.push(String(t)); });
    return out;
  }

  function _bestPairScore(listA, listB) {
    var best = 0, info = null;
    for (var i = 0; i < listA.length; i++) {
      for (var j = 0; j < listB.length; j++) {
        var s = _jaccard(listA[i], listB[j]);
        if (s > best) {
          best = s;
          info = { a: listA[i], b: listB[j] };
        }
      }
    }
    return { score: best, info: info };
  }

  DD.compare = function (candidate, existing, options) {
    options = options || {};
    var th = Object.assign({}, DD.THRESHOLDS, options.thresholds || {});
    var w = Object.assign({}, DD.WEIGHTS, options.weights || {});

    if (!candidate || !existing) {
      return { exact: false, similar: false, score: 0, method: "none", matchedId: null, explanation: "missing_input" };
    }

    // Exact title — only "exact" if contentType + contentMap also match
    var cmEqualTitle = candidate.contentMapId && candidate.contentMapId === existing.contentMapId;
    var ctEqualTitle = candidate.contentType && candidate.contentType === existing.contentType;
    if (_exactMatch(candidate.title, existing.title) && cmEqualTitle && ctEqualTitle) {
      return {
        exact: true, similar: true, score: 1.0, method: "exact_title",
        matchedId: existing.id,
        explanation: "عنوان دقیقاً یکسان است"
      };
    }

    // Alias-aware best-pair
    var candStrings = _collectStrings(candidate);
    var existStrings = _collectStrings(existing);
    var pair = _bestPairScore(candStrings, existStrings);
    var titleScore = Math.max(_jaccard(candidate.title, existing.title), pair.score);

    // ContentMap
    var cmScore = 0;
    if (candidate.contentMapId && candidate.contentMapId === existing.contentMapId) cmScore = 1;

    // ContentType
    var ctScore = 0;
    if (candidate.contentType && candidate.contentType === existing.contentType) ctScore = 1;

    // Weighted combination
    var total = (titleScore * w.title) + (cmScore * w.contentMap) + (ctScore * w.contentType);
    // tokens bonus
    var tokenBonus = 0;
    if (candidate.description && existing.description) {
      tokenBonus = _jaccard(candidate.description, existing.description) * w.tokens;
    }
    total += tokenBonus;
    total = Math.round(total * 1000) / 1000;

    var exact = total >= th.exactThreshold && cmScore > 0 && ctScore > 0;
    var similar = total >= th.similarThreshold;
    var high = total >= th.highSimilarityThreshold;

    var reasons = [];
    reasons.push("عنوان: " + Math.round(titleScore * 100) + "%");
    if (cmScore > 0) reasons.push("Content Map یکسان");
    if (ctScore > 0) reasons.push("نوع محتوا یکسان");
    if (tokenBonus > 0) reasons.push("شرح مشابه");
    if (pair.info && pair.info.a !== candidate.title) {
      reasons.push("alias: '" + pair.info.a + "' ≈ '" + pair.info.b + "'");
    }

    return {
      exact: exact,
      similar: similar,
      high: high,
      score: total,
      method: "weighted_title_cm_ct",
      matchedId: existing.id,
      explanation: reasons.join(" · ")
    };
  };

  DD.findBest = function (candidate, existingList, options) {
    var best = null;
    (existingList || []).forEach(function (ex) {
      var r = DD.compare(candidate, ex, options);
      if (!best || r.score > best.score) best = r;
    });
    return best;
  };

  DD.findExactDuplicate = function (def, drafts) {
    var target = _normalizePersian(def && def.title);
    if (!target) return null;
    for (var i = 0; i < (drafts || []).length; i++) {
      var d = drafts[i];
      if (!d || d.id === (def && def.id)) continue;
      if (_normalizePersian(d.title) === target) return d;
    }
    return null;
  };

  DD.findSimilar = function (def, drafts, threshold) {
    threshold = threshold || DD.THRESHOLDS.similarThreshold;
    var out = [];
    (drafts || []).forEach(function (d) {
      if (!d || d.id === (def && def.id)) return;
      var r = DD.compare(def, d, {});
      if (r.score >= threshold) {
        out.push({ id: d.id, title: d.title, score: r.score, explanation: r.explanation });
      }
    });
    return out.sort(function (a, b) { return b.score - a.score; });
  };

  console.log("[content.dedupe.v16] loaded");
})();