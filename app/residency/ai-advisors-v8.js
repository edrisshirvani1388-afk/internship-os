/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Advisors v8
   Advisor Modules — structured output, no state mutation
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.advisors.v8] R missing"); return; }
  var ADV = R.aiAdvisors = R.aiAdvisors || {};
  var C = R.aiContext, A = R.aiAnalysis, RED = R.aiRedaction, P = R.aiPrompts;

  /* ─── Core helper: call AI with prompt + validated context ─── */
  function _callAdvisor(promptId, userPayload, opts) {
    opts = opts || {};
    var AI = window.InternshipAI;
    if (!AI || typeof AI.askStructured !== "function") {
      return Promise.reject({ code: "ai_not_loaded", hint: "AI module not available" });
    }
    var prompt = P && P.get ? P.get(promptId) : null;
    if (!prompt) {
      return Promise.reject({ code: "unknown_prompt", hint: "promptId not registered: " + promptId });
    }

    // 1. Validate payload metrics (light)
    if (opts.metricsKind && A && A.validateMetrics) {
      var errs = A.validateMetrics(userPayload && userPayload.metrics, opts.metricsKind);
      if (errs.length > 0) {
        return Promise.reject({ code: "invalid_metrics", hint: errs.join("; ") });
      }
    }

    // 2. Redact payload
    var safe = RED && RED.redact ? RED.redact(userPayload) : userPayload;
    var text = JSON.stringify(safe, null, 2);
    var notice = RED && RED.getRedactionNotice ? RED.getRedactionNotice() : "";

    // 3. Build user content
    var userContent = (opts.userNote ? opts.userNote + "\n\n" : "") +
      "## داده‌های واقعی\n" + text + "\n\n" + notice + "\n\nلطفاً تحلیل کن و JSON برگردان.";

    // 4. Call AI with prompt system id "general" (proxy) — but override system via history? 
    // We use `AI.chat` with explicit messages so the registered prompt is the system message.
    var messages = [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: userContent }
    ];

    return AI.chat(messages, {
      temperature: opts.temperature || 0.3,
      maxTokens: opts.maxTokens || 2000
    }).then(function (r) {
      // Parse structured JSON
      var parsed;
      try { parsed = AI.parseJSON ? AI.parseJSON(r.text) : JSON.parse(r.text); }
      catch (e) {
        var err = new Error("AI response not JSON");
        err.code = "invalid_json";
        err.raw = r.text;
        throw err;
      }
      return _normalizeAdvisorOutput(parsed);
    });
  }

  /* ─── Normalize advisor output ─── */
  function _normalizeAdvisorOutput(parsed) {
    if (!parsed || typeof parsed !== "object") parsed = {};
    var out = {
      summary: String(parsed.summary || "").slice(0, 500),
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 20).map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 10).map(function (rec, i) {
            if (!rec || typeof rec !== "object") return null;
            return {
              id: String(rec.id || ("ai-rec-" + i)),
              type: ["info","warning","suggestion"].indexOf(rec.type) !== -1 ? rec.type : "suggestion",
              title: String(rec.title || "پیشنهاد").slice(0, 100),
              explanation: String(rec.explanation || "").slice(0, 400),
              evidence: Array.isArray(rec.evidence) ? rec.evidence.slice(0, 5).map(String) : [],
              confidence: Math.max(0, Math.min(1, Number(rec.confidence) || 0.5)),
              proposedAction: null // AI never proposes actions
            };
          }).filter(Boolean)
        : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 10).map(String) : [],
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5))
    };
    return out;
  }
  ADV._normalizeAdvisorOutput = _normalizeAdvisorOutput;

  /* ═══════ Public Advisor API ═══════ */

  /* Performance Coach */
  ADV.analyzePerformance = function (context) {
    return _callAdvisor("performance-coach", context || {}, { maxTokens: 2000 });
  };

  /* Residency Advisor */
  ADV.adviseResidency = function (context) {
    return _callAdvisor("residency-advisor", context || {}, { maxTokens: 2000 });
  };

  /* Planner Advisor */
  ADV.reviewPlanner = function (plannerInput, allocationResult) {
    if (!C || !A) return Promise.reject({ code: "context_missing" });
    var snapshot = C.snapshotPlanner(plannerInput, allocationResult);
    var metrics = A.analyzePlanner(plannerInput, allocationResult);
    return _callAdvisor("planner-advisor",
      { snapshot: snapshot, metrics: metrics },
      { metricsKind: "planner", maxTokens: 2500 });
  };

  /* Proposal Reviewer */
  ADV.reviewProposal = function (proposal) {
    if (!proposal) return Promise.reject({ code: "no_proposal" });
    var compact = {
      proposalId: proposal.proposalId,
      mode: proposal.mode,
      strategy: proposal.strategy,
      feasibility: proposal.feasibility,
      statistics: proposal.statistics,
      recovery: proposal.recovery,
      reserve: proposal.reserve,
      deficits: (proposal.deficits || []).slice(0, 15),
      warnings: (proposal.warnings || []).slice(0, 15)
    };
    return _callAdvisor("proposal-reviewer", { proposal: compact }, { maxTokens: 2200 });
  };

  /* Recovery Advisor */
  ADV.reviewRecovery = function (execAnalysis, impact, comparisons) {
    if (!C) return Promise.reject({ code: "context_missing" });
    var snapshot = C.snapshotReplanner(execAnalysis, impact, comparisons, null);
    var metrics = A.analyzeReplanner(execAnalysis, impact, comparisons);
    return _callAdvisor("replanner-advisor",
      { snapshot: snapshot, metrics: metrics },
      { metricsKind: "replanner", maxTokens: 2500 });
  };

  /* Rescue Strategy Recommendation */
  ADV.recommendRecoveryStrategy = function (comparisons) {
    if (!Array.isArray(comparisons) || comparisons.length === 0) {
      return Promise.reject({ code: "no_comparisons" });
    }
    var compact = comparisons.map(function (c) {
      if (c.error) return { strategy: c.strategy, error: c.error };
      return {
        strategy: c.strategy,
        feasible: c.feasible,
        recoveredPages: c.recoveredPages,
        reserveConsumed: c.reserveConsumed,
        reserveRemaining: c.reserveRemaining,
        completionDate: c.completionDate,
        peakDailyMinutes: c.peakDailyMinutes,
        unmetPages: c.unmetPages,
        hardBlocks: c.hardBlocks,
        softWarnings: c.softWarnings
      };
    });
    // Deterministic recommendation also available
    var deterministic = R.plannerReplan && R.plannerReplan.recommendStrategy
      ? R.plannerReplan.recommendStrategy(comparisons) : null;
    return _callAdvisor("rescue-recommendation",
      { comparisons: compact, deterministicRecommendation: deterministic },
      { maxTokens: 1800 });
  };

  /* Diagnostics Explainer */
  ADV.explainDiagnostics = function (diagnostics) {
    if (!Array.isArray(diagnostics)) diagnostics = [];
    var compact = diagnostics.slice(0, 30).map(function (d) {
      return { type: d.type, severity: d.severity, reason: d.reason || null,
               demandId: d.demandId || null, date: d.date || null };
    });
    return _callAdvisor("diagnostics-explainer",
      { diagnostics: compact, count: compact.length },
      { maxTokens: 1500 });
  };

  console.log("[ai.advisors.v8] loaded");
})();