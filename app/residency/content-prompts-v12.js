(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.content.prompts.v12] R missing"); return; }
  var P = R.aiPrompts;
  if (!P || !P.registry) { console.warn("[ai.prompts.v12] registry missing"); return; }

  var OUT =
    "\n\n## ساختار خروجی (JSON)\n" +
    "{\n" +
    '  "title": "...",\n' +
    '  "shortTitle": "...",\n' +
    '  "description": "...",\n' +
    '  "objectives": ["..."],\n' +
    '  "sections": [ { "id":"sec1", "title":"...", "type":"text", "content":"..." } ],\n' +
    '  "keyPoints": ["..."],\n' +
    '  "pitfalls": ["..."],\n' +
    '  "references": [ { "title":"...", "authors":["..."], "year":1234, "identifier":"...", "type":"textbook|guideline|article", "url":"..." } ]\n' +
    "}\n\n" +
    "قواعد:\n" +
    "- فقط JSON معتبر، بدون markdown، بدون ```.\n" +
    "- هیچ فیلد اضافه‌ای نساز.\n" +
    "- در صورت عدم اطمینان، ادعای ساختگی نساز.\n" +
    "- references فقط اگر مطمئنی؛ در غیر این صورت آرایه خالی بگذار.\n" +
    "- برای medical claims پرخطر (دوز، منع مصرف)، فقط اطلاعات قطعی بنویس.\n";

  var BASE_FA =
    "تو یک دستیار تولید محتوای آموزشی پزشکی هستی.\n" +
    "زبان خروجی فارسی است، اصطلاحات پزشکی می‌توانند انگلیسی در پرانتز بیایند.\n" +
    "محتوای ساختاریافته، دقیق، و کاربردی تولید کن.\n" +
    "از hallucination جداً پرهیز کن.\n";

  P.registry["content-generator"] = {
    id: "content-generator", version: 1,
    description: "Generate new content from topic",
    systemPrompt: BASE_FA +
      "وظیفه: تولید محتوای جدید آموزشی دربارهٔ موضوع داده‌شده با ساختار مشخص." +
      OUT
  };

  P.registry["content-expand"] = {
    id: "content-expand", version: 1,
    description: "Expand existing content",
    systemPrompt: BASE_FA +
      "وظیفه: گسترش محتوای موجود. بخش‌های موجود را حفظ کن، بخش‌های جدید اضافه کن." +
      OUT
  };

  P.registry["content-improve"] = {
    id: "content-improve", version: 1,
    description: "Improve clarity and structure",
    systemPrompt: BASE_FA +
      "وظیفه: بهبود کیفیت، انسجام، و ساختار محتوای موجود بدون تغییر معنای اصلی." +
      OUT
  };

  P.registry["content-rewrite"] = {
    id: "content-rewrite", version: 1,
    description: "Rewrite preserving meaning",
    systemPrompt: BASE_FA +
      "وظیفه: بازنویسی محتوا با حفظ کامل معنا. بهبود لحن و خوانایی." +
      OUT
  };

  P.registry["content-gap-fill"] = {
    id: "content-gap-fill", version: 1,
    description: "Fill missing sections",
    systemPrompt: BASE_FA +
      "وظیفه: تکمیل بخش‌های ناقص یا خالی محتوای موجود. فقط بخش‌های ناقص را پر کن." +
      OUT
  };

  console.log("[residency.content.prompts.v12] loaded");
})();