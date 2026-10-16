(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[content.diff.v16] R missing"); return; }
  var CD = R.contentDiff = R.contentDiff = R.contentDiff || {};

  var FIELDS = ["title","shortTitle","description","contentType","contentMapId","areaId","categoryId","difficulty"];

  function _fieldDiff(a, b, field) {
    var va = a ? a[field] : null;
    var vb = b ? b[field] : null;
    if ((va == null ? "" : String(va)) === (vb == null ? "" : String(vb))) return null;
    return { field: field, before: va, after: vb };
  }

  function _arrayDiff(a, b) {
    a = a || []; b = b || [];
    var setA = {}, setB = {};
    a.forEach(function (x) { if (x != null) setA[String(x)] = 1; });
    b.forEach(function (x) { if (x != null) setB[String(x)] = 1; });
    var added = [], removed = [];
    Object.keys(setB).forEach(function (k) { if (!setA[k]) added.push(k); });
    Object.keys(setA).forEach(function (k) { if (!setB[k]) removed.push(k); });
    return { added: added, removed: removed };
  }

  CD.compare = function (existing, candidate) {
    if (!existing && !candidate) return { fieldChanges: [], arrayChanges: {}, sectionDiff: { added: [], removed: [], modified: [], unchanged: [] } };
    if (!existing) return { created: true };
    if (!candidate) return { deleted: true };

    var fieldChanges = [];
    FIELDS.forEach(function (f) {
      var d = _fieldDiff(existing, candidate, f);
      if (d) fieldChanges.push(d);
    });

    var arrayChanges = {
      tags: _arrayDiff(existing.tags, candidate.tags),
      objectives: _arrayDiff(existing.objectives, candidate.objectives),
      keyPoints: _arrayDiff(existing.keyPoints, candidate.keyPoints),
      pitfalls: _arrayDiff(existing.pitfalls, candidate.pitfalls)
    };

    // Sections
    var exSections = existing.sections || [];
    var cdSections = candidate.sections || [];
    var byTitle = {};
    exSections.forEach(function (s) { if (s && s.title) byTitle[s.title] = s; });
    var seenTitles = {};
    var addedSections = [], modifiedSections = [], unchangedSections = [];

    cdSections.forEach(function (s) {
      if (!s || !s.title) return;
      seenTitles[s.title] = 1;
      if (byTitle[s.title]) {
        if (byTitle[s.title].content !== s.content || byTitle[s.title].id !== s.id) {
          modifiedSections.push({ title: s.title, sectionId: s.id, before: byTitle[s.title], after: s });
        } else {
          unchangedSections.push({ title: s.title, sectionId: s.id });
        }
      } else {
        addedSections.push(s);
      }
    });
    var removedSections = [];
    exSections.forEach(function (s) {
      if (s && s.title && !seenTitles[s.title]) removedSections.push(s);
    });

    return {
      fieldChanges: fieldChanges,
      arrayChanges: arrayChanges,
      sectionDiff: {
        added: addedSections,
        removed: removedSections,
        modified: modifiedSections,
        unchanged: unchangedSections
      }
    };
  };

  CD.isNoOp = function (diff) {
    if (!diff) return true;
    if (diff.created || diff.deleted) return false;
    var fc = diff.fieldChanges.length;
    var ac = Object.keys(diff.arrayChanges || {}).reduce(function (s, k) {
      var a = diff.arrayChanges[k];
      return s + (a.added.length + a.removed.length);
    }, 0);
    var sd = diff.sectionDiff;
    return fc === 0 && ac === 0 && sd.added.length === 0 && sd.removed.length === 0 && sd.modified.length === 0;
  };

  console.log("[content.diff.v16] loaded");
})();