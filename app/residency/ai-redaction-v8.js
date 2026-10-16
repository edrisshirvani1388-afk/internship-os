/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Redaction Layer v8
   Privacy filter — removes sensitive content before AI
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[ai.redaction.v8] R missing"); return; }
  var RED = R.aiRedaction = R.aiRedaction || {};

  var _config = {
    redactClinical: true,      // remove complaint/exam/diagnosis details
    redactNotes: true,         // remove free-text notes
    redactTitles: false,       // keep book/round titles (usually safe)
    redactNames: false,        // keep firstName (only used in greeting)
    customRedactors: []
  };

  RED.config = function (patch) {
    if (!patch) return Object.assign({}, _config);
    Object.keys(patch).forEach(function (k) { _config[k] = patch[k]; });
    return Object.assign({}, _config);
  };

  /* ─── Recursive redaction ─── */
  RED.redact = function (obj, contextLabel) {
    if (obj == null) return obj;
    if (Array.isArray(obj)) return obj.map(function (x) { return RED.redact(x, contextLabel); });
    if (typeof obj !== "object") return obj;

    var out = {};
    Object.keys(obj).forEach(function (k) {
      var v = obj[k];
      // Skip sensitive keys
      if (_config.redactClinical) {
        if (k === "complaint" || k === "exam" || k === "paraclinic" ||
            k === "diagnosis" || k === "treatment" || k === "learning" ||
            k === "attachments" || k === "attachmentId") {
          out[k] = "[REDACTED]";
          return;
        }
      }
      if (_config.redactNotes) {
        if (k === "notes" || k === "description") {
          // keep as short placeholder if empty
          out[k] = v ? "[REDACTED]" : "";
          return;
        }
      }
      if (k === "apiKey" || k === "apiKeys" || k === "key") {
        out[k] = "[REDACTED]";
        return;
      }
      out[k] = RED.redact(v, contextLabel);
    });
    // custom redactors
    _config.customRedactors.forEach(function (fn) {
      try { fn(out); } catch (e) {}
    });
    return out;
  };

  /* ─── Redact a JSON string (for safety before send) ─── */
  RED.redactString = function (jsonString) {
    if (!jsonString || typeof jsonString !== "string") return jsonString;
    // remove API-like keys from serialized content
    return jsonString
      .replace(/"(apiKey|apiKeys|authorization|bearer)":\s*"[^"]*"/gi, '"$1":"[REDACTED]"')
      .replace(/\bgsk_[A-Za-z0-9]{20,}/g, "gsk_[REDACTED]")
      .replace(/\bsk-[A-Za-z0-9]{20,}/g, "sk-[REDACTED]");
  };

  /* ─── Marker for AI so it knows redaction happened ─── */
  RED.getRedactionNotice = function () {
    return "NOTE: Some user data may be redacted for privacy (clinical details, notes, keys). Do not attempt to reconstruct missing fields.";
  };

  RED.detectLeaks = function (text) {
    var leaks = [];
    if (!text) return leaks;
    var s = String(text);
    if (/gsk_[A-Za-z0-9]{20,}/.test(s)) leaks.push("groq_key_pattern");
    if (/sk-[A-Za-z0-9]{20,}/.test(s)) leaks.push("openai_key_pattern");
    if (/AIza[0-9A-Za-z\-_]{30,}/.test(s)) leaks.push("gemini_key_pattern");
    return leaks;
  };

  console.log("[ai.redaction.v8] loaded");
})();