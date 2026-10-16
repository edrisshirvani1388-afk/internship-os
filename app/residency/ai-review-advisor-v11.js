(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.ai.review.advisor.v11] R missing"); return; }
  var ADV = R.aiAdvisors = R.aiAdvisors || {};
  var P = R.aiPrompts;
  if (!P || !P.registry) { console.warn("[ai.review.advisor.v11] prompts missing"); return; }

  P.registry["review-advisor"] = {
    id: "review-advisor",
    version: 1,
    description: "تحلیل سیستم Spaced Repetition",
    systemPrompt:
      "تو یک مشاور spaced repetition برای یک اینترن پزشکی ایرانی هستی.\n" +
      "وظیفه: تحلیل وضعیت مرورها (backlog، overdue، lapse، بار کاری، retention proxy) و ارائه‌ی insight و پیشنهاد سطح‌بالا.\n\n" +
      "قواعد سخت:\n" +
      "- AI هیچ‌گاه interval، due date، یا rating را محاسبه نمی‌کند.\n" +
      "- AI هیچ‌گاه review state را mutate نمی‌کند.\n" +
      "- AI هیچ‌گاه review activity نمی‌سازد.\n" +
      "- اعداد را از metrics داده‌شده بگیر، اختراع نکن.\n" +
      "- هر finding باید evidence از metrics/trends داشته باشد.\n" +
      "- خروجی فقط JSON معتبر، بدون markdown.\n\n" +
      "## ساختار خروجی (JSON)\n" +
      "{\n" +
      '  "summary": "خلاصه یک‌خطی",\n' +
      '  "findings": ["یافته ۱", ...],\n' +
      '  "recommendations": [\n' +
      '    { "id": "r1", "type": "info|warning|suggestion", "title": "...", "explanation": "...", "evidence": ["metric=value"], "confidence": 0.0 }\n' +
      '  ],\n' +
      '  "risks": ["..."],\n' +
      '  "confidence": 0.0\n' +
      "}"
  };

  function _callReviewAdvisor(payload, opts) {
    opts = opts || {};
    var AI = window.InternshipAI;
    if (!AI || typeof AI.chat !== "function") {
      return Promise.reject({ code: "ai_not_loaded" });
    }
    var prompt = P.registry["review-advisor"];
    var safe = (R.aiRedaction && R.aiRedaction.redact) ? R.aiRedaction.redact(payload) : payload;
    var text = JSON.stringify(safe, null, 2);
    var userContent = "## داده‌های واقعی\n" + text + "\n\n" +
      "داده‌ها deterministic هستند. لطفاً تحلیل کن و JSON برگردان.";
    var messages = [
      { role: "system", content: prompt.systemPrompt },
      { role: "user", content: userContent }
    ];
    return AI.chat(messages, { temperature: 0.3, maxTokens: opts.maxTokens || 2000 })
      .then(function (r) {
        var parsed;
        try { parsed = AI.parseJSON ? AI.parseJSON(r.text) : JSON.parse(r.text); }
        catch (e) {
          var err = new Error("AI response not JSON");
          err.code = "invalid_json";
          err.raw = r.text;
          throw err;
        }
        return _normalize(parsed);
      });
  }

  function _normalize(parsed) {
    if (!parsed || typeof parsed !== "object") parsed = {};
    return {
      summary: String(parsed.summary || "").slice(0, 500),
      findings: Array.isArray(parsed.findings) ? parsed.findings.slice(0, 20).map(String) : [],
      recommendations: Array.isArray(parsed.recommendations)
        ? parsed.recommendations.slice(0, 10).map(function (rec, i) {
            if (!rec || typeof rec !== "object") return null;
            return {
              id: String(rec.id || ("rv-rec-" + i)),
              type: ["info","warning","suggestion"].indexOf(rec.type) !== -1 ? rec.type : "suggestion",
              title: String(rec.title || "پیشنهاد").slice(0, 100),
              explanation: String(rec.explanation || "").slice(0, 400),
              evidence: Array.isArray(rec.evidence) ? rec.evidence.slice(0, 5).map(String) : [],
              confidence: Math.max(0, Math.min(1, Number(rec.confidence) || 0.5)),
              proposedAction: null
            };
          }).filter(Boolean) : [],
      risks: Array.isArray(parsed.risks) ? parsed.risks.slice(0, 10).map(String) : [],
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.5))
    };
  }

  ADV.analyzeReviewContext = function (context) {
    return _callReviewAdvisor(context || (R.reviewAIContext.build() || {}), { maxTokens: 2200 });
  };

  console.log("[residency.ai.review.advisor.v11] loaded");
})();