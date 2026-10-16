(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.context.inspector.v15] R missing"); return; }
  var CI = R.contextInspector = R.contextInspector = R.contextInspector || {};

  function _hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h &= 0xffffffff; }
    return Math.abs(h).toString(36);
  }

  CI.buildSafe = function (mode) {
    var s = window.__os && window.__os.getState ? window.__os.getState() : null;
    if (!s || !s.residency) return { mode: mode, empty: true, source: "none" };

    var raw = { mode: mode };
    var source = "none";
    var promptId = null, promptVersion = null;

    var planId = s.residency.meta && s.residency.meta.activePlanId;
    var snap = null;

    try {
      if (mode === "planner" || mode === "proposal") {
        snap = R.plannerSnapshot ? R.plannerSnapshot.build(planId, "plan") : null;
        source = "planner-snapshot";
        promptId = "planner-advisor"; promptVersion = 1;
        if (snap) {
          var alloc = R.plannerResolution ? R.plannerResolution.runConstrainedAllocation(snap, {}) : null;
          raw = R.aiContext && R.aiContext.snapshotPlanner ? R.aiContext.snapshotPlanner(snap, alloc) : { planId: planId };
          raw.metrics = R.aiAnalysis && R.aiAnalysis.analyzePlanner ? R.aiAnalysis.analyzePlanner(snap, alloc) : null;
        }
      } else if (mode === "recovery") {
        snap = R.plannerSnapshot ? R.plannerSnapshot.build(planId, "plan") : null;
        source = "replanner-context";
        promptId = "replanner-advisor"; promptVersion = 1;
        if (snap && R.plannerExecution) {
          var exec = R.plannerExecution.analyzeExecution(snap);
          var impact = R.plannerImpact ? R.plannerImpact.analyzeImpact(exec, snap, "plan") : null;
          raw = R.aiContext && R.aiContext.snapshotReplanner ? R.aiContext.snapshotReplanner(exec, impact, null, null) : { exec: !!exec };
        }
      } else if (mode === "reviews") {
        source = "review-ai-context";
        promptId = "review-advisor"; promptVersion = 1;
        raw = R.reviewAIContext ? R.reviewAIContext.build() : {};
      } else if (mode === "analytics" || mode === "performance") {
        source = "analytics-ai-context";
        promptId = "performance-coach"; promptVersion = 1;
        raw = R.analytics && R.analytics.buildAIContext ? R.analytics.buildAIContext({ range: "last30Days" }) : {};
      }
    } catch (e) {
      return { mode: mode, source: source, error: String(e.message || e), valid: false };
    }

    var safe = (R.aiRedaction && R.aiRedaction.redact) ? R.aiRedaction.redact(raw) : raw;
    var json = JSON.stringify(safe);
    var leaks = R.aiRedaction && R.aiRedaction.detectLeaks ? R.aiRedaction.detectLeaks(json) : [];

    return {
      mode: mode,
      source: source,
      valid: leaks.length === 0,
      leaks: leaks,
      redacted: R.aiRedaction ? true : false,
      generatedAt: Date.now(),
      promptId: promptId,
      promptVersion: promptVersion,
      contextHash: _hash(json),
      json: safe
    };
  };

  CI.listModes = function () {
    return ["planner", "proposal", "recovery", "reviews", "analytics", "performance"];
  };

  console.log("[ai.context.inspector.v15] loaded");
})();