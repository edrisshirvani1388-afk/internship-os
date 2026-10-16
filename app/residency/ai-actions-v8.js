/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Actions v8 (Generic Safety Abstraction)
   AI proposal → validate → preview → confirm → deterministic apply
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.actions.v8] R missing"); return; }
  var ACT = R.aiActions = R.aiActions || {};

  /* ─── Action kinds registered with deterministic appliers ─── */
  var _appliers = {};

  ACT.registerApplier = function (kind, fn) {
    if (typeof fn !== "function") return false;
    _appliers[kind] = fn;
    return true;
  };

  ACT.hasApplier = function (kind) { return typeof _appliers[kind] === "function"; };

  /* ─── Validate an AI-proposed action set ─── */
  ACT.validateProposal = function (proposal) {
    var errs = [];
    if (!proposal || typeof proposal !== "object") return ["proposal must be object"];
    if (!proposal.kind) errs.push("kind required");
    if (!Array.isArray(proposal.actions)) errs.push("actions must be array");
    else {
      proposal.actions.forEach(function (a, i) {
        if (!a || typeof a !== "object") errs.push("action[" + i + "] invalid");
        else if (!a.type) errs.push("action[" + i + "].type required");
      });
    }
    return errs;
  };

  /* ─── Conflict / duplicate check (generic) ─── */
  ACT.checkConflicts = function (proposal) {
    var conflicts = [];
    if (!proposal || !Array.isArray(proposal.actions)) return conflicts;
    var seen = {};
    proposal.actions.forEach(function (a, i) {
      if (!a || !a.type) return;
      var key = a.type + "::" + (a.targetId || a.taskId || "");
      if (seen[key] !== undefined) {
        conflicts.push({ type: "duplicate_action", indices: [seen[key], i], key: key });
      } else {
        seen[key] = i;
      }
    });
    return conflicts;
  };

  /* ─── Apply selected actions via registered applier ─── */
  ACT.apply = function (proposal, selectedIds) {
    var errs = ACT.validateProposal(proposal);
    if (errs.length) return { applied: 0, errors: errs };

    var conflicts = ACT.checkConflicts(proposal);
    if (conflicts.length > 0) {
      return { applied: 0, errors: conflicts.map(function (c) { return "conflict: " + c.type; }) };
    }

    var applier = _appliers[proposal.kind];
    if (!applier) return { applied: 0, errors: ["no applier registered for " + proposal.kind] };

    var filtered;
    if (Array.isArray(selectedIds) && selectedIds.length > 0) {
      var set = {};
      selectedIds.forEach(function (id) { set[id] = 1; });
      filtered = proposal.actions.filter(function (a) { return set[a.id]; });
    } else {
      filtered = proposal.actions.slice();
    }

    try {
      var result = applier(filtered);
      if (window.__os && window.__os.saveState) {
        try { window.__os.saveState(); } catch (e) {}
      }
      if (window.__os && window.__os.render) {
        setTimeout(function () { window.__os.render(); }, 200);
      }
      return result || { applied: filtered.length, errors: [] };
    } catch (e) {
      return { applied: 0, errors: [String(e.message || e)] };
    }
  };

  /* ─── Register built-in applier: task_update ─── */
  // (placeholder — actual appliers may be added by upstream modules)
  ACT.registerApplier("noop", function (actions) {
    return { applied: 0, errors: [], note: "noop applier" };
  });

  console.log("[ai.actions.v8] loaded");
})();