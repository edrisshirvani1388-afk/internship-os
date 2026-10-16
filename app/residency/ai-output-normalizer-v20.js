/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Output Normalizer v20
   کاربر هرگز اصطلاحات فنی نبینه — فقط فارسی روان
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency = window.InternshipResidency || {};
  var AN = R.aiNormalizer = R.aiNormalizer || {};
  AN.VERSION = "1.0.0";

  var _debug = false;
  AN.setDebug = function (v) { _debug = !!v; };
  AN.isDebug = function () { return _debug; };

  /* ─── Persian rule injected into every user-facing prompt ─── */
  AN.PERSIAN_RULE = [
    "قانون فارسی (الزامی):",
    "پاسخ را فقط به فارسی روان و محاوره‌ای بنویس.",
    "هرگز نام فیلدهای فنی، کلید JSON، نام تابع، اصطلاح داخلی نرم‌افزار، یا کد انگلیسی را در متن پاسخ ننویس.",
    "اگر نیاز به اشاره به عددی داری، آن را با واحد فارسی و در جمله‌ی طبیعی بگو.",
    "از markdown و ستاره و # و بک‌تیک استفاده نکن.",
    "جمله‌ها کوتاه و مستقیم باشند.",
    "هیچ کد یا ساختار JSON ننویس."
  ].join("\n");

  /* ─── Client-side safety net: replace known technical terms ─── */
  var REPLACEMENTS = [
    // statuses
    [/feasible_with_warnings/gi,        "قابل اجرا ولی با هشدار"],
    [/blocked_by_hard_constraint/gi,    "مسدود به‌خاطر محدودیت سخت"],
    [/not_checked/gi,                   "بررسی‌نشده"],
    [/infeasible/gi,                    "غیرقابل اجرا"],
    [/feasible/gi,                      "قابل اجرا"],
    // words
    [/\bsessionization\b/gi,            "تقسیم به جلسه‌های مطالعه"],
    [/\bsnapshot\b/gi,                  "تصویر وضعیت"],
    [/\ballocation\b/gi,                "تخصیص"],
    [/\bdeadline\b/gi,                  "مهلت"],
    [/\bcapacity\b/gi,                  "ظرفیت"],
    [/\bdemand\b/gi,                    "تقاضای مطالعه"],
    [/\breserve\b/gi,                   "ذخیره"],
    [/\bconflict\b/gi,                  "تداخل"],
    [/\boverride\b/gi,                  "بازنویسی"],
    [/\bconstraint\b/gi,                "محدودیت"],
    [/\benrollment\b/gi,                "اتصال کتاب به دوره"],
    [/\brotation\b/gi,                  "چرخش"],
    [/\btrigger\b/gi,                   "دلیل بازبینی"],
    // identifiers leaking from raw data
    [/\bid:\s*[a-z0-9\-_.]+/gi,         ""],
    [/\bunmetMinutes\s*=\s*\d+/gi,      ""],
    [/\bdeficits?\[\d+\]/gi,            ""]
  ];

  function _stripMarkdown(s) {
    if (!s) return "";
    var out = String(s);
    // Remove code fences
    out = out.replace(/```[\s\S]*?```/g, "");
    // Remove bold/italic markers
    out = out.replace(/\*\*([^*]+)\*\*/g, "$1");
    out = out.replace(/\*([^*]+)\*/g, "$1");
    out = out.replace(/__([^_]+)__/g, "$1");
    out = out.replace(/(^|\s|\()_([^_\s]+)_(?=\s|$|\)|،|\.|!|؟)/g, "$1$2");
    // Remove heading markers
    out = out.replace(/^#{1,6}\s*/gm, "");
    // Remove inline backticks
    out = out.replace(/`([^`]+)`/g, "$1");
    // Normalize multiple spaces
    out = out.replace(/[ \t]+/g, " ");
    // Trim lines
    out = out.split("\n").map(function (l) { return l.trim(); }).join("\n");
    // Collapse 3+ newlines
    out = out.replace(/\n{3,}/g, "\n\n");
    return out.trim();
  }

  function _replaceTerms(s) {
    var out = s;
    for (var i = 0; i < REPLACEMENTS.length; i++) {
      out = out.replace(REPLACEMENTS[i][0], REPLACEMENTS[i][1]);
    }
    return out;
  }

  function _tidyPunctuation(s) {
    if (!s) return "";
    var out = s;
    // Remove double punctuation artifacts
    out = out.replace(/،\s*،/g, "،");
    out = out.replace(/\.\s*\./g, ".");
    out = out.replace(/؛\s*؛/g, "؛");
    // Clean empty brackets
    out = out.replace(/\(\s*\)/g, "");
    out = out.replace(/\[\s*\]/g, "");
    out = out.replace(/\s+([،؛.!؟])/g, "$1");
    // Remove trailing spaces
    return out.replace(/[ \t]+$/gm, "").trim();
  }

  /**
   * Normalize an AI response for user display.
   * Returns "" if input was empty.
   */
  AN.normalize = function (text) {
    if (text == null) return "";
    var s = String(text);
    if (!s.trim()) return "";

    // Debug mode → return raw
    if (_debug) return s;

    s = _stripMarkdown(s);
    s = _replaceTerms(s);
    s = _tidyPunctuation(s);
    return s;
  };

  /**
   * Detect if a response is mostly English (user probably wanted Persian).
   * Returns true if more than 60% of "letters" are Latin.
   */
  AN.isMostlyEnglish = function (text) {
    if (!text) return false;
    var total = 0, latin = 0;
    for (var i = 0; i < text.length; i++) {
      var c = text.charCodeAt(i);
      if ((c >= 65 && c <= 90) || (c >= 97 && c <= 122)) { latin++; total++; }
      else if (c >= 0x0600 && c <= 0x06FF) { total++; }
    }
    if (total === 0) return false;
    return (latin / total) > 0.6;
  };

  /* ─── Tests ─── */
  AN.__tests = function () {
    var t = [];
    t.push({
      name: "T1 strip bold",
      ok: AN.normalize("این **مهم** است") === "این مهم است",
      got: AN.normalize("این **مهم** است")
    });
    t.push({
      name: "T2 strip code fence",
      ok: AN.normalize("متن قبل\n```js\nvar x;\n```\nمتن بعد").indexOf("var x") === -1
    });
    t.push({
      name: "T3 replace feasible_with_warnings",
      ok: AN.normalize("وضعیت: feasible_with_warnings").indexOf("قابل اجرا ولی با هشدار") !== -1
    });
    t.push({
      name: "T4 remove backticks",
      ok: AN.normalize("این `کد` است").indexOf("`") === -1
    });
    t.push({
      name: "T5 preserve pure Persian",
      ok: AN.normalize("سلام، حالت چطوره؟") === "سلام، حالت چطوره؟"
    });
    t.push({
      name: "T6 detect English",
      ok: AN.isMostlyEnglish("hello world this is english") === true
    });
    t.push({
      name: "T7 detect Persian",
      ok: AN.isMostlyEnglish("سلام این یک متن فارسی است") === false
    });
    t.push({
      name: "T8 empty input",
      ok: AN.normalize("") === "" && AN.normalize(null) === ""
    });
    t.push({
      name: "T9 debug passthrough",
      ok: (function () {
        AN.setDebug(true);
        var r = AN.normalize("**bold**");
        AN.setDebug(false);
        return r === "**bold**";
      })()
    });
    return t;
  };

  console.log("[ai-output-normalizer.v20] loaded v" + AN.VERSION);
})();