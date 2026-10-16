/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — AI Layer · v0.5.0 (Multi-Provider)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  const API_BASE = (location.origin && location.origin.startsWith("http"))
    ? location.origin
    : "http://127.0.0.1:8977";

  const CACHE_KEY    = "internship-os.ai.cache.v1";
  const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

  // ═══════════════════════════════════════════
  //  Provider Metadata
  // ═══════════════════════════════════════════
  const PROVIDERS = {
    groq: {
      id: "groq", name: "Groq", icon: "⚡",
      desc: "سریع و رایگان — پیشنهاد پیش‌فرض",
      defaultModel: "openai/gpt-oss-120b",
      keyUrl: "https://console.groq.com/keys",
      needsKey: true, local: false
    },
    openai: {
      id: "openai", name: "OpenAI", icon: "🟢",
      desc: "قدرتمندترین — پرداختی",
      defaultModel: "gpt-4o-mini",
      keyUrl: "https://platform.openai.com/api-keys",
      needsKey: true, local: false
    },
    gemini: {
      id: "gemini", name: "Google Gemini", icon: "💎",
      desc: "گوگل — پلن رایگان دارد",
      defaultModel: "gemini-2.0-flash",
      keyUrl: "https://aistudio.google.com/app/apikey",
      needsKey: true, local: false
    },
    deepseek: {
      id: "deepseek", name: "DeepSeek", icon: "🐋",
      desc: "ارزان و باکیفیت",
      defaultModel: "deepseek-chat",
      keyUrl: "https://platform.deepseek.com/api_keys",
      needsKey: true, local: false
    },
    openrouter: {
      id: "openrouter", name: "OpenRouter", icon: "🔀",
      desc: "دسترسی به مدل‌های مختلف",
      defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
      keyUrl: "https://openrouter.ai/keys",
      needsKey: true, local: false
    },
    ollama: {
      id: "ollama", name: "Ollama", icon: "🖥️",
      desc: "اجرا روی کامپیوتر خودت — آفلاین",
      defaultModel: "llama3.2",
      keyUrl: "https://ollama.com/download",
      needsKey: false, local: true
    },
    lmstudio: {
      id: "lmstudio", name: "LM Studio", icon: "🎛️",
      desc: "اجرا روی کامپیوتر خودت — آفلاین",
      defaultModel: "",
      keyUrl: "https://lmstudio.ai",
      needsKey: false, local: true
    },
    custom: {
      id: "custom", name: "سفارشی", icon: "⚙️",
      desc: "URL دلخواه (سازگار با OpenAI)",
      defaultModel: "",
      keyUrl: "",
      needsKey: false, local: false
    }
  };

  function getProviderInfo(id) { return PROVIDERS[id] || PROVIDERS.groq; }

  // ═══════════════════════════════════════════
  //  System Prompts
  // ═══════════════════════════════════════════
  const SYSTEM_PROMPTS = {
    deepThinking:
      "You are a Persian-speaking assistant for an Iranian medical intern. DEEP THINKING MODE is ON: give detailed structured answers (10-15 lines max). RULES: 1) Never use markdown symbols like asterisk or hash or backticks. 2) Only reference the Snapshot data, never invent numbers. 3) If data is missing, say so honestly and stay brief. 4) Max 3 emojis. 5) Warm conversational Persian tone. STRUCTURE: brief summary, then analysis, then (if requested) one practical suggestion.",
    general:
      "تو یه دستیار فارسی‌زبان برای یه اینترن پزشکی هستی.\n" +
      "\n" +
      "## قواعد پاسخ (خیلی مهم)\n" +
      "1. **پیش‌فرض کوتاه باش** — بین ۲ تا ۵ خط. نه بیشتر.\n" +
      "2. **از markdown استفاده نکن** — ستاره ** یا # یا بک‌تیک ` کار نمی‌کنه. فقط متن ساده.\n" +
      "3. **ایموجی محدود** — حداکثر ۲-۳ ایموجی در کل پاسخ. فقط برای تأکید.\n" +
      "4. **از داده‌های Snapshot استفاده کن** — اگه تسک/کشیک/روتیشن واقعی داری، فقط به اونا اشاره کن. چیزی از خودت نساز.\n" +
      "5. **اگه داده‌ای نیست، صادقانه بگو** — مثلاً «امروز تسکی نداری» و کوتاه تموم کن.\n" +
      "6. **پیشنهاد خودسر نده** — اگه کاربر نگفته «پیشنهاد بده» یا «تحلیل کن»، فقط به سؤالش جواب بده.\n" +
      "7. **اگه کاربر خواست بیشتر** («توضیح بده»، «بیشتر بگو»، «چرا») — اون‌وقت می‌تونی مفصل‌تر جواب بدی.\n" +
      "8. **زبان**: فارسی محاوره‌ای، دوستانه، بدون رسمی‌گویی اضافه.\n" +
      "\n" +
      "## نمونه‌ی پاسخ درست\n" +
      "کاربر: امروز چی مهم‌تره؟\n" +
      "تو: امروز ۲ تا تسک داری:\n" +
      "• 📚 خوندن کاوازاکی\n" +
      "• 🩺 معاینه بالینی\n" +
      "پیشنهاد: اول کاوازاکی رو بخون چون ۲ روز عقب افتاده.\n" +
      "\n" +
      "## نمونه‌ی پاسخ غلط (نکن!)\n" +
      "«**بررسی لیست بیماران** — لیست بیماران امروز را باز کن و... [۵ بند طولانی]»",

    planReview:
      "تو یه مشاور برنامه‌ریزی برای اینترن پزشکی هستی.\n" +
      "قواعد:\n" +
      "- پاسخ کوتاه و عملی (حداکثر ۶ خط مگر کاربر خواست)\n" +
      "- بدون markdown (** یا #)\n" +
      "- فقط از داده‌های Snapshot استفاده کن\n" +
      "- اعداد رو از Snapshot بگیر و اختراع نکن\n" +
      "- اگه مسئله‌ای ندیدی، بگو «برنامه‌ات متوازنه» و کوتاه تموم کن.",

    performanceCoach:
      "تو یه مربی عملکرد برای اینترن پزشکی هستی.\n" +
      "- کوتاه، صمیمی، بدون markdown\n" +
      "- اعداد رو از Snapshot بگیر\n" +
      "- پیشنهاد فقط وقتی کاربر خواست.",

    residencyAdvisor:
      "تو یه مشاور رزیدنتی هستی.\n" +
      "- کوتاه و واقع‌بینانه\n" +
      "- بدون markdown (** یا #)\n" +
      "- اگه منبع/موضوع از Snapshot داری، همون رو بگو\n" +
      "- اگه نه، بگو «منبعی ثبت نکردی» و پیشنهاد کلی نده.",

    dashboardBrief:
      "تو یه دستیار خلاصه‌گوی اینترن پزشکی هستی.\n" +
      "قواعد سخت:\n" +
      "1. فقط ۲-۴ خط جواب بده\n" +
      "2. فقط به داده‌های Snapshot اشاره کن — هیچ چیز از خودت اضافه نکن\n" +
      "3. اگه تسک امروز خالیه: «امروز تسکی نداری» + یه جمله کوتاه\n" +
      "4. از markdown (** یا #) استفاده نکن\n" +
      "5. حداکثر ۲ ایموجی\n" +
      "6. پیشنهاد خودسر نده — فقط وضعیت رو بگو"
  };

  // ═══════════════════════════════════════════
  SYSTEM_PROMPTS.deepThinking =
      "تو یه دستیار فارسی‌زبان برای یه اینترن پزشکی هستی.\n" +
      "\n" +
      "## حالت تفکر عمیق فعال است\n" +
      "کاربر این حالت رو روشن کرده، پس می‌تونی:\n" +
      "1. **تحلیل عمیق‌تری** ارائه بده\n" +
      "2. **دلیل و استدلال** بیاری (چرا فلان چیز مهمه)\n" +
      "3. **مرحله‌ای و ساختارمند** جواب بدی\n" +
      "4. **۱۰-۱۵ خط** جواب بدی (نه بیشتر)\n" +
      "\n" +
      "## ولی هنوز این قواعد سرجاشونه\n" +
      "- **چیزی از خودت نساز** — فقط از داده‌های Snapshot استفاده کن\n" +
      "- اگه داده‌ای نیست، صادقانه بگو\n" +
      "- از ** یا # یا markdown استفاده نکن\n" +
      "- حداکثر ۳ ایموجی\n" +
      "- لحن صمیمی و محاوره‌ای\n" +
      "\n" +
      "## ساختار پیشنهادی پاسخ\n" +
      "یه جمع‌بندی کوتاه → نکات کلیدی → اگه لازم شد، یه پیشنهاد عملی.";
  //  Fetch with Timeout (Promise.race)
  // ═══════════════════════════════════════════
  //  Snapshot Builder
  // ═══════════════════════════════════════════

  var FA_DIGITS_MAP = "۰۱۲۳۴۵۶۷۸۹";

  function _getState() {
    if (window.__os && typeof window.__os.getState === "function") {
      try { return window.__os.getState(); } catch (e) { return null; }
    }
    return null;
  }

  function _faDigitsToLatin(s) {
    var out = "";
    for (var i = 0; i < s.length; i++) {
      var idx = FA_DIGITS_MAP.indexOf(s[i]);
      out += idx >= 0 ? String(idx) : s[i];
    }
    return out;
  }

  function _todayJalaliLatin() {
    try {
      var d = new Date();
      return _faDigitsToLatin(d.toLocaleDateString("fa-IR"));
    } catch (e) { return ""; }
  }

  function _nowTime() {
    try {
      var d = new Date();
      var h = d.getHours().toString();
      var m = d.getMinutes().toString();
      if (h.length < 2) h = "0" + h;
      if (m.length < 2) m = "0" + m;
      return h + ":" + m;
    } catch (e) { return ""; }
  }

  function _weekdayFa() {
    try {
      return new Date().toLocaleDateString("fa-IR", { weekday: "long" });
    } catch (e) { return ""; }
  }

  function _daysDiff(dateStr) {
    if (!dateStr) return null;
    var t = _todayJalaliLatin();
    if (!t) return null;
    var p1 = dateStr.split("/").map(Number);
    var p2 = t.split("/").map(Number);
    if (p1.length !== 3 || p2.length !== 3) return null;
    var day1 = p1[0] * 365 + p1[1] * 30 + p1[2];
    var day2 = p2[0] * 365 + p2[1] * 30 + p2[2];
    return day1 - day2;
  }

  function _compactTask(t) {
    if (!t) return null;
    var diff = _daysDiff(t.date);
    return {
      id: t.id || "",
      title: (t.title || "").slice(0, 80),
      area: t.areaId || "",
      date: t.date || "",
      time: t.time || null,
      done: !!t.completed,
      when: diff === 0 ? "today" : (diff < 0 ? ("overdue_" + Math.abs(diff) + "d") : ("in_" + diff + "d"))
    };
  }

  function _compactCase(c) {
    if (!c) return null;
    return {
      date: c.date || "",
      specialty: c.specialtyId || "",
      title: (c.title || "").slice(0, 100),
      diagnosis: (c.diagnosis || "").slice(0, 120),
      complaint: (c.complaint || "").slice(0, 150),
      learning: (c.learning || "").slice(0, 150)
    };
  }

  function _getCurrentRotationFromState(s) {
    if (!s || !Array.isArray(s.rotations)) return null;
    var today = _todayJalaliLatin();
    if (!today) return null;
    for (var i = 0; i < s.rotations.length; i++) {
      var r = s.rotations[i];
      if (!r || !r.startDate || !r.endDate) continue;
      if (_daysDiff(r.startDate) <= 0 && _daysDiff(r.endDate) >= 0) return r;
    }
    return null;
  }

  function _snapshotDashboard(s) {
    var today = _todayJalaliLatin();
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var todayTasks = tasks.filter(function (t) { return t && t.date === today; });
    var overdue = tasks.filter(function (t) { return t && !t.completed && _daysDiff(t.date) < 0; });
    var doneToday = todayTasks.filter(function (t) { return t.completed; }).length;

    var weekDone = 0, weekTotal = 0;
    for (var i = 0; i < tasks.length; i++) {
      var d = _daysDiff(tasks[i].date);
      if (d !== null && d >= -6 && d <= 0) {
        weekTotal++;
        if (tasks[i].completed) weekDone++;
      }
    }

    var rot = _getCurrentRotationFromState(s);
    var rotInfo = null;
    if (rot) {
      var remain = _daysDiff(rot.endDate);
      var total = Math.abs(_daysDiff(rot.startDate)) + remain + 1;
      var elapsed = total - remain;
      rotInfo = {
        title: rot.title,
        daysRemaining: remain,
        progressPercent: Math.round((elapsed / total) * 100)
      };
    }

    var shifts = Array.isArray(s.shifts) ? s.shifts : [];
    var todayShifts = shifts.filter(function (sh) { return sh && sh.date === today; });
    var nextShift = null;
    var upcoming = shifts
      .map(function (sh) { return { shift: sh, days: _daysDiff(sh.date) }; })
      .filter(function (x) { return x.days !== null && x.days >= 0; })
      .sort(function (a, b) { return a.days - b.days; });
    if (upcoming.length > 0) {
      nextShift = {
        date: upcoming[0].shift.date,
        time: upcoming[0].shift.startTime || "",
        type: upcoming[0].shift.type || "",
        daysAway: upcoming[0].days
      };
    }

    var cases = Array.isArray(s.cases) ? s.cases : [];
    var recentCases = cases
      .slice()
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); })
      .slice(0, 3)
      .map(_compactCase);

    return {
      today: {
        tasks: todayTasks.map(_compactTask),
        doneCount: doneToday,
        totalCount: todayTasks.length,
        shifts: todayShifts.map(function (sh) {
          return { time: sh.startTime || "", endTime: sh.endTime || "", type: sh.type || "" };
        })
      },
      overdueTasks: overdue.slice(0, 8).map(_compactTask),
      week: { done: weekDone, total: weekTotal },
      currentRotation: rotInfo,
      nextShift: nextShift,
      recentCases: recentCases,
      totalCases: cases.length,
      totalTasks: tasks.length
    };
  }

  function _snapshotPlanner(s) {
    var today = _todayJalaliLatin();
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var overdue = tasks.filter(function (t) { return t && !t.completed && _daysDiff(t.date) < 0; });
    var todayTasks = tasks.filter(function (t) { return t && t.date === today; });
    var tomorrow = tasks.filter(function (t) { return t && _daysDiff(t.date) === 1; });
    var thisWeek = tasks.filter(function (t) {
      var d = _daysDiff(t.date);
      return t && d !== null && d >= 0 && d <= 7;
    });
    var rot = _getCurrentRotationFromState(s);

    // ─── Detect similar-title tasks (for AI duplicate detection) ───
    function _normalizeTitle(s) {
      return String(s || "").toLowerCase().trim()
        .replace(/[\-_—–:،,.]/g, " ")
        .replace(/\s+/g, " ");
    }
    function _titleKeywords(s) {
      var stop = {"و":"","یا":"","به":"","از":"","در":"","با":"","برای":"","یه":"","این":"","که":""};
      return _normalizeTitle(s).split(" ").filter(function (w) { return w.length >= 3 && !stop[w]; });
    }
    var _pendingTasks = tasks.filter(function (t) { return t && !t.completed; });
    var similarTitlePairs = [];
    for (var _i = 0; _i < _pendingTasks.length; _i++) {
      for (var _j = _i + 1; _j < _pendingTasks.length; _j++) {
        var _a = _pendingTasks[_i];
        var _b = _pendingTasks[_j];
        if (_a.areaId !== _b.areaId) continue;
        var _ka = _titleKeywords(_a.title);
        var _kb = _titleKeywords(_b.title);
        if (_ka.length === 0 || _kb.length === 0) continue;
        var _common = _ka.filter(function (w) { return _kb.indexOf(w) >= 0; });
        if (_common.length === 0) continue;
        var _sim = _common.length / Math.max(_ka.length, _kb.length);
        if (_sim >= 0.5) {
          similarTitlePairs.push({
            taskA: { id: _a.id, title: _a.title, source: _a.sourceType || "manual" },
            taskB: { id: _b.id, title: _b.title, source: _b.sourceType || "manual" },
            similarity: Math.round(_sim * 100) / 100
          });
        }
      }
    }
    var noTimeTasks = _pendingTasks.filter(function (t) { return !t.time; }).map(function (t) {
      return { id: t.id, title: t.title, area: t.areaId };
    });

    var busyTimes = todayTasks.filter(function (t) { return t.time; }).map(function (t) { return { time: t.time, task: t.title }; });
    var _shifts = (Array.isArray(s.shifts) ? s.shifts : []).filter(function (sh) { return sh && sh.date === today; });
    _shifts.forEach(function (sh) {
      if (sh.startTime) busyTimes.push({ time: sh.startTime, task: "shift start" });
      if (sh.endTime) busyTimes.push({ time: sh.endTime, task: "shift end" });
    });
    busyTimes.sort(function (a, b) { return (a.time || "").localeCompare(b.time || ""); });
    return {
      overdue: overdue.slice(0, 10).map(_compactTask),
      today: todayTasks.map(_compactTask),
      tomorrow: tomorrow.slice(0, 10).map(_compactTask),
      thisWeek: thisWeek.slice(0, 20).map(_compactTask),
      currentRotation: rot ? { title: rot.title, start: rot.startDate, end: rot.endDate } : null,

      busyTimes: busyTimes,
      similarTitlePairs: similarTitlePairs,
      noTimeTasks: noTimeTasks,
      totalPending: tasks.filter(function (t) { return !t.completed; }).length,
      totalDone: tasks.filter(function (t) { return t.completed; }).length
    };
  }

  function _snapshotResidency(s) {
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var resTasks = tasks.filter(function (t) { return t && t.areaId === "residency"; });
    var byType = { study: 0, review: 0, question: 0, exam: 0, other: 0 };
    var done = 0;
    resTasks.forEach(function (t) {
      var k = (t.taskType || "other");
      if (byType[k] === undefined) byType[k] = 0;
      byType[k]++;
      if (t.completed) done++;
    });

    var custom = (s.customContent || {});
    var subjects = Object.values(custom.residencySubjects || {}).map(function (sub) {
      var topicCount = Object.values(custom.residencyTopics || {}).filter(function (t) { return t.subjectId === sub.id; }).length;
      return { title: sub.title, topicCount: topicCount };
    });
    var resources = Object.values(custom.residencyResources || {}).map(function (r) {
      return { title: r.title, type: r.type || "" };
    });

    return {
      goal: (s.workspace && s.workspace.residencyGoal) || "",
      subjects: subjects,
      resources: resources.slice(0, 10),
      tasksByType: byType,
      totalResidencyTasks: resTasks.length,
      totalResidencyDone: done,
      recentTasks: resTasks.slice(-8).map(_compactTask)
    };
  }

  function _snapshotClinical(s) {
    var cases = Array.isArray(s.cases) ? s.cases : [];
    var bySpec = {};
    cases.forEach(function (c) {
      if (!c) return;
      var k = c.specialtyId || "بدون‌بخش";
      bySpec[k] = (bySpec[k] || 0) + 1;
    });
    var recent = cases
      .slice()
      .sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); })
      .slice(0, 8)
      .map(_compactCase);

    var rotations = Array.isArray(s.rotations) ? s.rotations : [];
    var rot = _getCurrentRotationFromState(s);

    return {
      totalCases: cases.length,
      bySpecialtyId: bySpec,
      recentCases: recent,
      currentRotation: rot ? { title: rot.title } : null,
      rotationsCount: rotations.length
    };
  }

  function _snapshotStudy(s) {
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var studyTasks = tasks.filter(function (t) { return t && t.areaId === "study"; });
    var pc = Array.isArray(s.programContent) ? s.programContent.filter(function (p) { return p && p.areaId === "study"; }) : [];
    return {
      totalStudyTasks: studyTasks.length,
      doneStudyTasks: studyTasks.filter(function (t) { return t.completed; }).length,
      pendingStudyTasks: studyTasks.filter(function (t) { return !t.completed; }).slice(0, 10).map(_compactTask),
      programContentCount: pc.length
    };
  }

  function _snapshotEmergency(s) {
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var emTasks = tasks.filter(function (t) { return t && t.areaId === "emergency"; });
    var pc = Array.isArray(s.programContent) ? s.programContent.filter(function (p) { return p && p.areaId === "emergency"; }) : [];
    return {
      totalEmergencyTasks: emTasks.length,
      doneEmergencyTasks: emTasks.filter(function (t) { return t.completed; }).length,
      programContentCount: pc.length
    };
  }

  function _snapshotProgress(s) {
    var tasks = Array.isArray(s.tasks) ? s.tasks : [];
    var done = tasks.filter(function (t) { return t.completed; }).length;
    var overall = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
    var rotations = Array.isArray(s.rotations) ? s.rotations : [];
    return {
      overall: { done: done, total: tasks.length, percent: overall },
      rotationsCount: rotations.length,
      casesCount: (s.cases || []).length,
      shiftsCount: (s.shifts || []).length,
      importsCount: (s.imports || []).length
    };
  }

  function _buildSnapshot(route) {
    var s = _getState();
    if (!s) return null;

    var base = {
      now: {
        date: _todayJalaliLatin(),
        time: _nowTime(),
        weekday: _weekdayFa()
      },
      workspace: {
        firstName: (s.workspace && s.workspace.firstName) || "",
        residencyGoal: (s.workspace && s.workspace.residencyGoal) || ""
      },
      route: route
    };

    var extra;
    switch (route) {
      case "planner":     extra = _snapshotPlanner(s); break;
      case "residency":   extra = _snapshotResidency(s); break;
      case "clinical":    extra = _snapshotClinical(s); break;
      case "study":       extra = _snapshotStudy(s); break;
      case "emergency":   extra = _snapshotEmergency(s); break;
      case "progress":    extra = _snapshotProgress(s); break;
      case "calendar":    extra = _snapshotDashboard(s); break;
      case "data":        extra = _snapshotProgress(s); break;
      case "dashboard":
      default:            extra = _snapshotDashboard(s); break;
    }

    return Object.assign({}, base, extra);
  }


  // ═══════════════════════════════════════════
  function fetchWithTimeout(url, options, timeoutMs) {
    timeoutMs = timeoutMs || 45000;
    return Promise.race([
      fetch(url, options),
      new Promise(function (_, reject) {
        setTimeout(function () {
          var err = new Error("timeout");
          err.code = "timeout";
          reject(err);
        }, timeoutMs);
      })
    ]);
  }

  // ═══════════════════════════════════════════
  //  Cache
  // ═══════════════════════════════════════════
  function _loadCache() {
    try {
      var raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return {};
      var obj = JSON.parse(raw);
      return (obj && typeof obj === "object") ? obj : {};
    } catch (e) { return {}; }
  }
  function _saveCache(obj) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify(obj)); } catch (e) {}
  }
  function _hash(s) {
    var h = 5381;
    for (var i = 0; i < s.length; i++) { h = ((h << 5) + h) + s.charCodeAt(i); h &= 0xffffffff; }
    return Math.abs(h).toString(36);
  }
  function makeCacheKey(parts) { return _hash(JSON.stringify(parts)); }
  function cacheGet(key) {
    var cache = _loadCache();
    var e = cache[key];
    if (!e) return null;
    if (Date.now() - e.at > CACHE_TTL_MS) { delete cache[key]; _saveCache(cache); return null; }
    return e.value;
  }
  function cacheSet(key, value) {
    var cache = _loadCache();
    cache[key] = { at: Date.now(), value: value };
    var keys = Object.keys(cache);
    if (keys.length > 50) {
      keys.sort(function (a, b) { return (cache[a].at || 0) - (cache[b].at || 0); });
      keys.slice(0, keys.length - 50).forEach(function (k) { delete cache[k]; });
    }
    _saveCache(cache);
  }
  function cacheClear() { try { localStorage.removeItem(CACHE_KEY); } catch (e) {} }

  // ═══════════════════════════════════════════
  //  Parser & Validator
  // ═══════════════════════════════════════════
  function parseJSONResponse(text) {
    if (!text) throw new Error("پاسخ خالی است");
    var c = String(text).trim();
    var fence = c.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fence) c = fence[1].trim();
    var fb = c.indexOf("{"), lb = c.lastIndexOf("}");
    if (fb >= 0 && lb > fb) c = c.slice(fb, lb + 1);
    try { return JSON.parse(c); }
    catch (e) { var err = new Error("JSON پاسخ AI معتبر نیست"); err.code = "invalid_json"; err.raw = text; throw err; }
  }

  function normalizeRecommendation(obj, moduleName) {
    if (!obj || typeof obj !== "object") return null;
    return {
      id: String(obj.id || ("ai-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6))),
      module: String(obj.module || moduleName || "general"),
      type: String(obj.type || "suggestion"),
      title: String(obj.title || "پیشنهاد"),
      explanation: String(obj.explanation || ""),
      evidence: Array.isArray(obj.evidence) ? obj.evidence.map(String) : [],
      impact: {
        positive: (obj.impact && Array.isArray(obj.impact.positive)) ? obj.impact.positive.map(String) : [],
        negative: (obj.impact && Array.isArray(obj.impact.negative)) ? obj.impact.negative.map(String) : []
      },
      changes: (obj.changes && typeof obj.changes === "object") ? obj.changes : {},
      confidence: (typeof obj.confidence === "number") ? Math.max(0, Math.min(1, obj.confidence)) : 0.5,
      requiresConfirmation: obj.requiresConfirmation !== false
    };
  }
  function validateRecommendationList(raw, moduleName) {
    var arr = [];
    if (Array.isArray(raw)) arr = raw;
    else if (raw && Array.isArray(raw.recommendations)) arr = raw.recommendations;
    else if (raw && Array.isArray(raw.suggestions)) arr = raw.suggestions;
    else if (raw && typeof raw === "object") arr = [raw];
    return arr.map(function (o) { return normalizeRecommendation(o, moduleName); }).filter(Boolean);
  }
  function buildMessages(systemPromptId, userContent, history, context) {
    var messages = [];
    var sysContent = SYSTEM_PROMPTS[systemPromptId] || SYSTEM_PROMPTS.general;
    try {
      if (window.InternshipResidency && window.InternshipResidency.aiNormalizer
          && window.InternshipResidency.aiNormalizer.PERSIAN_RULE) {
        sysContent += "\n\n" + window.InternshipResidency.aiNormalizer.PERSIAN_RULE;
      }
    } catch (e) {}
    if (context) {
      sysContent += "\n\n═══ داده‌های واقعی برنامه کاربر ═══\n" + context
        + "\n\n## یادآوری مهم\n"
        + "- پاسخ کوتاه بده (پیش‌فرض ۲-۵ خط)\n"
        + "- فقط به همین داده‌ها اشاره کن، چیزی از خودت نساز\n"
        + "- از ** یا # یا markdown استفاده نکن\n"
        + "- اگه تسک/کاربردی نیست، صادقانه بگو و کوتاه تموم کن";
    }
    messages.push({ role: "system", content: sysContent });
    if (Array.isArray(history)) {
      history.forEach(function (m) { if (m && m.role && m.content) messages.push({ role: m.role, content: m.content }); });
    }
    if (userContent) messages.push({ role: "user", content: userContent });
    return messages;
  }

  // ═══════════════════════════════════════════
  //  Core call
  // ═══════════════════════════════════════════
  function _call(messages, opts) {
    opts = opts || {};
    var payload = {
      messages: messages,
      temperature: typeof opts.temperature === "number" ? opts.temperature : 0.4,
      max_tokens: typeof opts.maxTokens === "number" ? opts.maxTokens : 1500
    };
    if (opts.jsonMode) payload.response_format = { type: "json_object" };

    return fetchWithTimeout(API_BASE + "/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload)
    }, 60000)
      .then(function (r) { return r.json(); })
      .then(function (resp) {
        if (resp && resp.error) {
          var err = new Error(resp.hint || resp.error);
          err.code = resp.error; err.hint = resp.hint || ""; err.detail = resp.detail || "";
          throw err;
        }
        if (!resp || !resp.choices || !resp.choices[0]) {
          var e2 = new Error("پاسخ نامعتبر از سرور AI"); e2.code = "invalid_response"; throw e2;
        }
        var _rawText = resp.choices[0].message.content || "";
        var _finalText = _rawText;
        if (!opts.jsonMode && _rawText) {
          try {
            if (window.InternshipResidency && window.InternshipResidency.aiNormalizer) {
              _finalText = window.InternshipResidency.aiNormalizer.normalize(_rawText);
            }
          } catch (e) { _finalText = _rawText; }
        }
        return { text: _finalText, usage: resp.usage || null, raw: resp, rawText: _rawText };
      });
  }

  // ═══════════════════════════════════════════
  //  Public API
  // ═══════════════════════════════════════════
  var AI = {
    version: "0.5.0",
    providers: PROVIDERS,
    getProviderInfo: getProviderInfo,

    status: function () {
      return fetchWithTimeout(API_BASE + "/api/ai/status", {}, 8000).then(function (r) { return r.json(); }).then(function (s) {
        try {
          var _fb = document.getElementById("ai-fab-btn");
          var _pn = document.getElementById("ai-panel");
          if (s && s.enabled === false) {
            if (_fb) _fb.style.setProperty("display", "none", "important");
            if (_pn) { _pn.classList.remove("is-open"); _pn.style.setProperty("display", "none", "important"); }
          } else {
            if (_fb) _fb.style.removeProperty("display");
            if (_pn) _pn.style.removeProperty("display");
          }
        } catch (e) {}
        return s;
      });
    },
    setConfig: function (cfg) {
      return fetchWithTimeout(API_BASE + "/api/ai/config", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(cfg || {})
      }, 15000).then(function (r) { return r.json(); });
    },
    loadModels: function () {
      return fetchWithTimeout(API_BASE + "/api/ai/models", {}, 30000).then(function (r) { return r.json(); }).then(function (resp) {
        if (resp && resp.error) {
          var err = new Error(resp.hint || resp.error); err.code = resp.error; throw err;
        }
        return Array.isArray(resp.models) ? resp.models : [];
      });
    },
    revealKey: function (provider) {
      return fetchWithTimeout(API_BASE + "/api/ai/reveal-key", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ provider: provider })
      }, 10000).then(function (r) {
        if (!r.ok) {
          var e = new Error("HTTP " + r.status);
          e.code = "http_error";
          throw e;
        }
        return r.text();
      }).then(function (txt) {
        if (!txt || !txt.trim()) {
          var e2 = new Error("پاسخ خالی از سرور");
          e2.code = "empty_response";
          throw e2;
        }
        try { return JSON.parse(txt); }
        catch (pe) {
          var e3 = new Error("پاسخ نامعتبر: " + txt.slice(0, 100));
          e3.code = "bad_json";
          throw e3;
        }
      });
    },

    testKeyWithValue: function (payload) {
      return fetchWithTimeout(API_BASE + "/api/ai/test-key", {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify(payload || {})
      }, 45000).then(function (r) { return r.json(); }).then(function (resp) {
        if (resp && resp.error) {
          var err = new Error(resp.hint || resp.error);
          err.code = resp.error; err.hint = resp.hint || ""; err.detail = resp.detail || "";
          throw err;
        }
        if (!resp || !resp.choices || !resp.choices[0]) {
          var e2 = new Error("پاسخ نامعتبر"); e2.code = "invalid_response"; throw e2;
        }
        return { text: resp.choices[0].message.content || "", usage: resp.usage || null };
      });
    },
    resetToDefault: function () {
      return fetchWithTimeout(API_BASE + "/api/ai/reset-default", { method: "POST" }, 15000).then(function (r) { return r.json(); });
    },
    testConnection: function () {
      return AI.ask("general", "فقط بنویس: سلام", { maxTokens: 10 });
    },

    parseJSON: parseJSONResponse,
    normalizeRecommendations: validateRecommendationList,
    buildMessages: buildMessages,
    systemPrompts: SYSTEM_PROMPTS,
    cacheGet: cacheGet, cacheSet: cacheSet, cacheClear: cacheClear, makeCacheKey: makeCacheKey,

    chat: function (messages, opts) { return _call(messages, opts || {}); },
    ask: function (sysId, userContent, opts) {
      var messages = buildMessages(sysId, userContent, opts && opts.history, opts && opts.context);
      return _call(messages, opts || {});
    },
    askStructured: function (sysId, userContent, opts) {
      var messages = buildMessages(sysId, userContent, opts && opts.history, opts && opts.context);
      var o = Object.assign({}, opts || {}); o.jsonMode = true;
      return _call(messages, o);
    },

    // ═══════════════════════════════════════════
    //  Settings Card
    // ═══════════════════════════════════════════
    renderSettingsCard: function () {
      return '\n      <h2 class="section-heading">🤖 دستیار هوشمند</h2>\n      <div class="data-card data-card-ai" id="ai-card">\n        <div class="data-card-body">\n          <div class="data-card-icon" aria-hidden="true">🤖</div>\n          <div class="data-card-text">\n            <h3>اتصال به سرویس هوش مصنوعی</h3>\n            <p id="ai-card-desc">برای فعال‌سازی دستیار هوشمند، تنظیمات را وارد کن.</p>\n            <div id="ai-card-status" class="ai-status-chip">در حال بررسی...</div>\n          </div>\n        </div>\n        <button class="btn primary" type="button" id="ai-open-settings">⚙️ تنظیمات</button>\n      </div>\n    ';
    },

    wireSettingsCard: function () {
      var btn = document.getElementById("ai-open-settings");
      if (btn) btn.addEventListener("click", function () { AI.openSettingsModal(); });
      AI.refreshCardStatus();
    },

    refreshCardStatus: function () {
      AI.status().then(function (s) {
        var chip = document.getElementById("ai-card-status");
        var desc = document.getElementById("ai-card-desc");
        if (!chip) return;
        if (s.enabled === false) { chip.className = "ai-status-chip is-error"; chip.textContent = "⭕ غیرفعال"; if (desc) desc.textContent = "دستیار هوشمند غیرفعال است. برای فعال‌سازی روشن کن."; return; }
      if (s.configured) {
          var info = getProviderInfo(s.provider);
          chip.className = "ai-status-chip is-ok";
          chip.textContent = "✅ " + info.icon + " " + info.name + " · " + (s.model || "—");
          if (desc) desc.textContent = "دستیار هوشمند فعال است. برای تغییر تنظیمات کلیک کن.";
        } else if (s.hasKeys && (s.hasKeys.groq || s.hasKeys.openai)) {
          chip.className = "ai-status-chip is-warn";
          chip.textContent = "⚠️ تنظیمات کامل نیست";
        } else {
          chip.className = "ai-status-chip is-empty";
          chip.textContent = "⭕ هنوز تنظیم نشده";
        }
      }).catch(function () {
        var chip = document.getElementById("ai-card-status");
        if (chip) { chip.className = "ai-status-chip is-error"; chip.textContent = "❌ سرور در دسترس نیست"; }
      });
    },

    // ═══════════════════════════════════════════
    //  Settings Modal
    // ═══════════════════════════════════════════
    openSettingsModal: function () {
      var ex = document.getElementById("ai-settings-modal");
      if (ex) ex.remove();

      var MASK = "••••••••••••••••••••••••";
      var KEY_REGEX = /^[A-Za-z0-9_\-\.]+$/;

      var serverStatus = null;
      var typedKeys = {};
      var isSaving = false;
      var isTesting = false;

      var overlay = document.createElement("div");
      overlay.id = "ai-settings-modal";
      overlay.className = "modal-overlay";
      overlay.style.zIndex = "999999";
      overlay.innerHTML = ''
        + '<div class="modal modal-wide" role="dialog" aria-modal="true" style="max-width:560px;">'
        + '<h3>🤖 تنظیمات دستیار هوشمند</h3>'

        + '<div class="form-row"><label class="ai-toggle-row"><span class="ai-toggle-label">وضعیت دستیار هوشمند</span><span class="ai-toggle"><input type="checkbox" id="ai-set-enabled" checked><span class="ai-toggle-slider"></span></span></label><p class="form-hint" id="ai-enabled-hint"></p></div>'

        + '<div class="form-row">'
        + '<label for="ai-set-provider">سرویس‌دهنده</label>'
        + '<select id="ai-set-provider"></select>'
        + '<p class="form-hint" id="ai-provider-hint"></p>'
        + '</div>'

        + '<div class="form-row" id="ai-key-row">'
        + '<label for="ai-set-key">کلید API</label>'
        + '<div class="ai-key-wrap">'
        + '<input type="password" id="ai-set-key" autocomplete="off" placeholder="کلید را وارد کن..." dir="ltr" style="text-align:left">'
        + '<button type="button" class="ai-key-toggle" id="ai-key-toggle" title="نمایش/مخفی">👁</button>'
        + '</div>'
        + '<p class="form-hint" id="ai-key-hint"></p>'
        + '<button type="button" class="btn ghost small" id="ai-reset-default" style="margin-top:8px;width:100%">🔄 بازگشت به پیش‌فرض Groq</button>'
        + '</div>'

        + '<div class="form-row" id="ai-custom-url-row" style="display:none">'
        + '<label for="ai-set-custom-url">URL سرویس سفارشی</label>'
        + '<input type="text" id="ai-set-custom-url" autocomplete="off" placeholder="https://your-server.com/v1" dir="ltr" style="text-align:left">'
        + '<p class="form-hint">باید با OpenAI سازگار باشد.</p>'
        + '</div>'

        + '<div class="form-row">'
        + '<label>نحوه‌ی اتصال</label>'
        + '<div class="ai-proxy-options">'
        + '<label class="ai-proxy-opt"><input type="radio" name="ai-proxy-mode" value="auto" checked><span class="ai-proxy-opt-body"><strong>خودکار (توصیه‌شده)</strong><span>از تنظیمات پروکسی ویندوز</span></span></label>'
        + '<label class="ai-proxy-opt"><input type="radio" name="ai-proxy-mode" value="manual"><span class="ai-proxy-opt-body"><strong>پروکسی دستی</strong><span>آدرس را خودت وارد کن</span></span></label>'
        + '<label class="ai-proxy-opt"><input type="radio" name="ai-proxy-mode" value="direct"><span class="ai-proxy-opt-body"><strong>مستقیم (بدون پروکسی)</strong><span>اگر VPN system-wide داری</span></span></label>'
        + '</div>'
        + '</div>'

        + '<div class="form-row" id="ai-manual-proxy-row" style="display:none">'
        + '<label for="ai-set-proxy">آدرس پروکسی</label>'
        + '<input type="text" id="ai-set-proxy" autocomplete="off" placeholder="http://127.0.0.1:10809" dir="ltr" style="text-align:left">'
        + '</div>'

        + '<div class="form-row" id="ai-model-row">'
        + '<label for="ai-set-model">مدل</label>'
        + '<div class="ai-model-wrap">'
        + '<select id="ai-set-model"><option value="">— برای بارگذاری مدل‌ها، «بررسی» را بزن —</option></select>'
        + '<button type="button" class="btn ghost small" id="ai-load-models">🔄 بررسی</button>'
        + '</div>'
        + '</div>'

        + '<div class="ai-set-actions">'
        + '<button class="btn ghost" type="button" id="ai-test-btn">🧪 تست اتصال</button>'
        + '<button class="btn primary" type="button" id="ai-save-btn">💾 ذخیره</button>'
        + '</div>'

        + '<div id="ai-set-status" class="ai-set-status" style="display:none"></div>'

        + '<div class="modal-actions">'
        + '<button class="btn ghost" type="button" data-close>بستن</button>'
        + '</div>'
        + '</div>';

      document.body.appendChild(overlay);
      requestAnimationFrame(function () { overlay.classList.add("open"); });

      var close = function () {
        overlay.classList.remove("open");
        setTimeout(function () { overlay.remove(); }, 220);
      };
      overlay.querySelector("[data-close]").addEventListener("click", close);
      overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });

      var esc = function (s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
          return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
      };

      function setStatus(type, title, hint) {
        var el = overlay.querySelector("#ai-set-status");
        if (!el) return;
        el.style.display = "";
        el.className = "ai-set-status is-" + type;
        var html = '<div class="ai-set-status-title">' + esc(title) + '</div>';
        if (hint) html += '<div class="ai-set-status-hint">' + esc(hint) + '</div>';
        el.innerHTML = html;
      }
      function clearStatus() {
        var el = overlay.querySelector("#ai-set-status");
        if (el) { el.style.display = "none"; el.innerHTML = ""; }
      }
      function errorToMessage(err) {
        var code = (err && err.code) || "";
        var map = {
          unauthorized:     { title: "❌ کلید API اشتباه است",              hint: "کلید را چک کن یا کلید جدید بساز." },
          forbidden:        { title: "🚫 سرویس AI از IP شما پاسخ نمی‌دهد",  hint: "VPN یا پروکسی خود را روشن کن." },
          rate_limit:       { title: "⏸️ محدودیت مصرف",                     hint: "چند لحظه صبر کن." },
          timeout:          { title: "⏱️ زمان انتظار تمام شد",               hint: "اینترنت یا VPN خود را بررسی کن." },
          network:          { title: "🌐 اتصال به سرور AI برقرار نشد",       hint: "اینترنت و VPN خود را بررسی کن." },
          server_error:     { title: "🔧 سرور AI موقتاً مشکل دارد",          hint: "کمی بعد امتحان کن." },
          ai_disabled:      { title: "دستیار غیرفعال است", hint: "از تنظیمات روشن کن." },
        not_configured:   { title: "⚙️ تنظیمات ذخیره نشده",               hint: "ابتدا کلید و سرویس را ذخیره کن." },
          no_endpoint:      { title: "🔗 آدرس سرویس وارد نشده",              hint: "URL سرویس را وارد کن." },
          no_key:           { title: "🔑 کلید API وارد نشده",                 hint: "کلید سرویس را وارد کن." },
          bad_key:          { title: "❌ کلید شامل کاراکتر غیرمجاز",          hint: "کلید فقط باید حروف انگلیسی، عدد، _ یا - داشته باشد." },
          bad_request:      { title: "❌ درخواست نامعتبر",                     hint: "مقادیر را چک کن." },
          invalid_response: { title: "❌ پاسخ نامعتبر از سرویس",               hint: "مدل انتخابی ممکن است پشتیبانی نشود." },
          model_not_found:  { title: "❌ مدل انتخابی موجود نیست",              hint: "مدل دیگری انتخاب کن." },
          provider_error:   { title: "❌ خطا از سرویس AI",                     hint: "سرویس‌دهنده را عوض کن یا بعداً امتحان کن." }
        };
        return map[code] || { title: "❌ خطای نامشخص", hint: (err && err.hint) || (err && err.message) || "دوباره امتحان کن." };
      }

      var providerSel = overlay.querySelector("#ai-set-provider");
      Object.keys(PROVIDERS).forEach(function (key) {
        var p = PROVIDERS[key];
        var opt = document.createElement("option");
        opt.value = p.id;
        opt.textContent = p.icon + "  " + p.name + "  —  " + p.desc;
        providerSel.appendChild(opt);
      });

      function currentProvider() { return providerSel.value; }
      function currentInfo() { return getProviderInfo(currentProvider()); }
      function hasSavedKey(provider) {
        return !!(serverStatus && serverStatus.hasKeys && serverStatus.hasKeys[provider]);
      }

      function applyKeyFieldValue() {
        var p = currentProvider();
        var pInfo = currentInfo();
        var keyEl = overlay.querySelector("#ai-set-key");
        if (!keyEl) return;
        if (!pInfo.needsKey && p !== "custom") {
          keyEl.value = "";
          keyEl.disabled = true;
          keyEl.type = "password";
          return;
        }
        keyEl.disabled = false;
        if (typedKeys[p] !== undefined) {
          keyEl.value = typedKeys[p];
          return;
        }
        if (hasSavedKey(p)) {
          keyEl.value = MASK;
          keyEl.type = "password";
          return;
        }
        keyEl.value = "";
      }

      function applyProviderUI(providerId) {
        var p = getProviderInfo(providerId);
        var hintEl = overlay.querySelector("#ai-provider-hint");
        var keyRow = overlay.querySelector("#ai-key-row");
        var keyHint = overlay.querySelector("#ai-key-hint");
        var customRow = overlay.querySelector("#ai-custom-url-row");

        if (hintEl) hintEl.textContent = p.local
          ? "🖥️ محلی — باید سرویس روی سیستم نصب و اجرا باشد."
          : "☁️ ابری — نیاز به اینترنت و (معمولاً) VPN.";

        var showKey = p.needsKey || providerId === "custom";
        if (keyRow) keyRow.style.display = showKey ? "" : "none";

        if (keyHint) {
          if (p.needsKey && p.keyUrl) {
            keyHint.innerHTML = 'کلید را از <a href="' + p.keyUrl + '" target="_blank" style="color:rgb(var(--accent))">اینجا</a> بساز.';
          } else if (!p.needsKey && p.local) {
            keyHint.textContent = "این سرویس کلید لازم ندارد.";
          } else {
            keyHint.textContent = "";
          }
        }
        if (customRow) customRow.style.display = (providerId === "custom") ? "" : "none";

        var modelSel = overlay.querySelector("#ai-set-model");
        if (modelSel && p.defaultModel) {
          var has = Array.from(modelSel.options).some(function (o) { return o.value === p.defaultModel; });
          if (!has && !modelSel.value) {
            var opt = document.createElement("option");
            opt.value = p.defaultModel;
            opt.textContent = p.defaultModel + "  (پیش‌فرض)";
            opt.selected = true;
            modelSel.insertBefore(opt, modelSel.firstChild);
          }
        }
      }

      providerSel.addEventListener("change", function () {
        applyProviderUI(currentProvider());
        applyKeyFieldValue();
        clearStatus();
      });

      var keyEl = overlay.querySelector("#ai-set-key");
      keyEl.addEventListener("focus", function () {
        if (keyEl.value === MASK) {
          try { keyEl.setSelectionRange(0, keyEl.value.length); } catch (e) {}
        }
      });
      keyEl.addEventListener("input", function () {
        var p = currentProvider();
        var v = keyEl.value;
        if (v === MASK) return;
        typedKeys[p] = v;
      });

      overlay.querySelector("#ai-key-toggle").addEventListener("click", function () {
        if (keyEl.dataset.revealed === "1") {
          delete keyEl.dataset.revealed;
          keyEl.type = "password";
          if (hasSavedKey(currentProvider())) {
            keyEl.value = MASK;
          } else {
            keyEl.value = "";
          }
          return;
        }
        var provider = currentProvider();
        AI.revealKey(provider).then(function (r) {
          if (r && r.apiKey) {
            keyEl.value = r.apiKey;
            keyEl.type = "text";
            keyEl.dataset.revealed = "1";
          } else {
            setStatus("warn", "⚠️ کلیدی برای این سرویس ذخیره نشده", "");
          }
        }).catch(function (err) {
          setStatus("error", "❌ خطا در دریافت کلید", err.message || "");
        });
      });

      overlay.querySelectorAll('input[name="ai-proxy-mode"]').forEach(function (r) {
        r.addEventListener("change", function () {
          var row = overlay.querySelector("#ai-manual-proxy-row");
          var checked = overlay.querySelector('input[name="ai-proxy-mode"]:checked');
          row.style.display = (checked && checked.value === "manual") ? "" : "none";
        });
      });

      function buildPayload() {
        var provider = currentProvider();
        var pInfo = currentInfo();
        var mode = overlay.querySelector('input[name="ai-proxy-mode"]:checked').value;
        var proxy = overlay.querySelector("#ai-set-proxy").value.trim();
        var model = overlay.querySelector("#ai-set-model").value || pInfo.defaultModel || "";
        var customUrl = overlay.querySelector("#ai-set-custom-url").value.trim();
        var apiKey;
        if (typedKeys[provider] !== undefined) apiKey = typedKeys[provider];
        else if (keyEl.value === MASK) apiKey = "__keep__";
        else apiKey = keyEl.value || "";
        var _enEl = overlay.querySelector("#ai-set-enabled"); var enabledVal = _enEl ? !!_enEl.checked : true; return { enabled: enabledVal, provider: provider, model: model, proxyMode: mode, proxy: proxy, customEndpoint: customUrl, apiKey: apiKey };
      }

      function validateKeyChars(apiKey) {
        if (!apiKey || apiKey === "__keep__") return true;
        return KEY_REGEX.test(apiKey);
      }

      function validatePayload(payload) {
        var pInfo = currentInfo();
        if (pInfo.needsKey && !payload.apiKey) {
          setStatus("error", "❌ کلید API را وارد کن", "");
          return false;
        }
        if (payload.proxyMode === "manual" && !payload.proxy) {
          setStatus("error", "❌ آدرس پروکسی را وارد کن", "برای حالت «پروکسی دستی»، آدرس لازم است. اگر نمی‌خواهی از پروکسی استفاده کنی، «خودکار» یا «مستقیم» را انتخاب کن.");
          return false;
        }
        if (payload.provider === "custom" && !payload.customEndpoint) {
          setStatus("error", "❌ URL سرویس سفارشی را وارد کن", "");
          return false;
        }
        if (!validateKeyChars(payload.apiKey)) {
          setStatus("error", "❌ کلید شامل کاراکتر غیرمجاز", "کلید API فقط باید حروف انگلیسی، عدد، _ یا - داشته باشد.");
          return false;
        }
        return true;
      }

      function refreshStatusAndField() {
        return AI.status().then(function (s) {
          serverStatus = s;
          applyKeyFieldValue();
        }).catch(function () {});
      }

      // ─── Test ───
      overlay.querySelector("#ai-test-btn").addEventListener("click", function () {
        if (isTesting) {
          setStatus("warn", "⏳ یک تست در حال اجراست", "کمی صبر کن.");
          return;
        }
        var payload = buildPayload();
        if (!validatePayload(payload)) return;

        isTesting = true;
        var btn = overlay.querySelector("#ai-test-btn");
        if (btn) btn.disabled = true;
        setStatus("info", "⏳ در حال تست اتصال...", "");
        var t0 = Date.now();

        var restoreMask = function () {
          delete typedKeys[payload.provider];
          delete keyEl.dataset.revealed;
          keyEl.type = "password";
          if (hasSavedKey(payload.provider)) {
            keyEl.value = MASK;
          } else {
            keyEl.value = "";
          }
        };

        var finish = function (ok, title, hint) {
          isTesting = false;
          if (btn) btn.disabled = false;
          restoreMask();
          if (ok) setStatus("ok", title, hint || "");
          else setStatus("error", title, hint || "");
        };

        var typedKey = typedKeys[payload.provider];

        // اگه کاربر کلید جدید تایپ کرده → با testKeyWithValue تست کن، ذخیره نکن
        if (typedKey !== undefined && typedKey !== "") {
          AI.testKeyWithValue({
            provider: payload.provider,
            apiKey: typedKey,
            model: payload.model,
            proxyMode: payload.proxyMode,
            proxy: payload.proxy,
            customEndpoint: payload.customEndpoint
          }).then(function (r) {
            var ms = Date.now() - t0;
            var preview = String(r.text || "").trim().slice(0, 80);
            finish(true, "✅ اتصال موفق (" + ms + " میلی‌ثانیه)", preview);
          }).catch(function (err) {
            var m = errorToMessage(err);
            finish(false, m.title, m.hint);
          });
          return;
        }

        // کلید ماسکه یا provider عوض شده → setConfig با __keep__ و بعد test
        AI.setConfig(payload).then(function (r) {
          if (r && r.error) {
            finish(false, "❌ " + r.error, r.hint || "");
            return;
          }
          if (r && r.hasKeys && serverStatus) {
            serverStatus.hasKeys = r.hasKeys;
          }
          AI.testConnection().then(function (tr) {
            var ms = Date.now() - t0;
            var preview = String(tr.text || "").trim().slice(0, 80);
            finish(true, "✅ اتصال موفق (" + ms + " میلی‌ثانیه)", preview);
          }).catch(function (err) {
            var m = errorToMessage(err);
            finish(false, m.title, m.hint);
          });
        }).catch(function (err) {
          var m = errorToMessage(err);
          finish(false, m.title, m.hint);
        });
      });

      // ─── Reset to default ───
      overlay.querySelector("#ai-reset-default").addEventListener("click", function () {
        setStatus("info", "⏳ در حال بازگشت به پیش‌فرض...", "");
        AI.resetToDefault().then(function (r) {
          if (r && r.error) { setStatus("error", "❌ " + r.error, ""); return; }
          Object.keys(typedKeys).forEach(function (k) { delete typedKeys[k]; });
          return AI.status().then(function (s) {
            serverStatus = s;
            providerSel.value = "groq";
            applyProviderUI("groq");
            applyKeyFieldValue();
            setStatus("ok", "✅ به پیش‌فرض Groq بازگشت", "");
            AI.refreshCardStatus();
          });
        }).catch(function (err) {
          setStatus("error", "❌ خطا در بازگشت به پیش‌فرض", err.message || "");
        });
      });

      // ─── Load models ───
      overlay.querySelector("#ai-load-models").addEventListener("click", function () {
        var payload = buildPayload();
        if (!validatePayload(payload)) return;

        var modelSel = overlay.querySelector("#ai-set-model");
        var hasTypedKey = typedKeys[payload.provider] !== undefined;

        var doLoad = function () {
          setStatus("info", "⏳ در حال دریافت مدل‌ها...", "");
          AI.loadModels().then(function (models) {
            var curVal = modelSel.value;
            modelSel.innerHTML = "";
            if (models.length === 0) {
              modelSel.innerHTML = '<option value="">— مدلی یافت نشد —</option>';
              setStatus("warn", "⚠️ مدلی برنگشت", "");
              return;
            }
            models.sort(function (a, b) { return a.id.localeCompare(b.id); });
            models.forEach(function (m) {
              var opt = document.createElement("option");
              opt.value = m.id;
              opt.textContent = m.id;
              if (m.id === curVal) opt.selected = true;
              modelSel.appendChild(opt);
            });
            setStatus("ok", "✅ " + models.length + " مدل دریافت شد", "");
          }).catch(function (err) {
            var m = errorToMessage(err);
            setStatus("error", m.title, m.hint);
          });
        };

        if (hasTypedKey) {
          AI.setConfig(payload).then(function (r) {
            if (r && r.error) { setStatus("error", "❌ " + r.error, r.hint || ""); return; }
            delete typedKeys[payload.provider];
            return refreshStatusAndField().then(doLoad);
          }).catch(function (err) {
            var m = errorToMessage(err);
            setStatus("error", m.title, m.hint);
          });
        } else {
          doLoad();
        }
      });

      // ─── Save ───
      overlay.querySelector("#ai-save-btn").addEventListener("click", function () {
        if (isSaving) return;
        var payload = buildPayload();
        if (!validatePayload(payload)) return;

        isSaving = true;
        setStatus("info", "⏳ در حال ذخیره...", "");
        AI.setConfig(payload).then(function (r) {
          if (r && r.error) { setStatus("error", "❌ " + r.error, r.hint || ""); isSaving = false; return; }
          delete typedKeys[payload.provider];
          return AI.status().then(function (s) {
            serverStatus = s;
            applyKeyFieldValue();
            setStatus("ok", "✅ ذخیره شد", "");
            AI.refreshCardStatus();
            isSaving = false;
            setTimeout(close, 900);
          });
        }).catch(function (err) {
          var m = errorToMessage(err);
          setStatus("error", m.title, m.hint);
          isSaving = false;
        });
      });

      // ─── Init ───
      AI.status().then(function (s) {
        serverStatus = s;
        var p = s.provider || "groq";
        providerSel.value = p;
        var _enCb = overlay.querySelector("#ai-set-enabled"); if (_enCb) { _enCb.checked = (s.enabled !== false); var _h = overlay.querySelector("#ai-enabled-hint"); if (_h) _h.textContent = _enCb.checked ? "فعال است" : "غیرفعال است. برای استفاده روشن کن."; _enCb.addEventListener("change", function() { if (_h) _h.textContent = _enCb.checked ? "فعال است" : "غیرفعال است. برای استفاده روشن کن."; }); }
        applyProviderUI(p);

        var mode = s.proxyMode || "auto";
        overlay.querySelectorAll('input[name="ai-proxy-mode"]').forEach(function (r) { r.checked = r.value === mode; });
        if (mode === "manual") {
          var row = overlay.querySelector("#ai-manual-proxy-row");
          if (row) row.style.display = "";
        }
        if (s.customEndpoint) {
          var el = overlay.querySelector("#ai-set-custom-url");
          if (el) el.value = s.customEndpoint;
        }

        var modelSel = overlay.querySelector("#ai-set-model");
        if (s.model && modelSel) {
          var exists = Array.from(modelSel.options).some(function (o) { return o.value === s.model; });
          if (exists) {
            modelSel.value = s.model;
          } else {
            var opt = document.createElement("option");
            opt.value = s.model;
            opt.textContent = s.model;
            opt.selected = true;
            modelSel.appendChild(opt);
          }
        }
        applyKeyFieldValue();
        if (s.configured) setStatus("ok", "✅ تنظیمات فعلی فعال است", "");
      }).catch(function () {
        setStatus("error", "❌ سرور در دسترس نیست", "InternshipOS.exe را باز کن.");
      });
    }
  };

  // ═══════════════════════════════════════════
  //  Floating Button + Panel + General Chat
  // ═══════════════════════════════════════════

  var _fabInitialized = false;
  var _panelEl = null;
  var _messages = [];
  var _isSending = false;
  var _deepMode = false;
  // ─── Chat History Persistence ───
  var CHAT_STORAGE_KEY = "internship-os.ai.chat.v1";
  var CHAT_MAX_MESSAGES = 40;

  function _loadChatHistory() {
    try {
      var raw = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return null;
      var arr = JSON.parse(raw);
      if (!Array.isArray(arr)) return null;
      return arr.filter(function (m) {
        return m && typeof m === "object" && (m.role === "user" || m.role === "assistant") && typeof m.content === "string";
      });
    } catch (e) { return null; }
  }

  function _saveChatHistory() {
    try {
      var clean = _messages.filter(function (m) {
        return m && (m.role === "user" || m.role === "assistant");
      }).slice(-CHAT_MAX_MESSAGES);
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(clean));
    } catch (e) {}
  }

  function _clearChatHistory() {
    var _saved = _loadChatHistory();
    _messages = (_saved && _saved.length > 0)
      ? _saved
      : [{ role: "assistant", content: "سلام 👋 من دستیار هوشمند Internship OS هستم. چطور می‌تونم کمکت کنم؟" }];
    try { localStorage.removeItem(CHAT_STORAGE_KEY); } catch (e) {}
    AI.renderMessages();
  }
  try { _deepMode = localStorage.getItem("internship-os.ai.deepMode") === "1"; } catch (e) {}

  function _escapeAI(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function _currentRoute() {
    var h = (location.hash || "").replace(/^#\/?/, "");
    return h || "dashboard";
  }

  function _getContextQuickActions() {
    var route = _currentRoute();
    var byRoute = {
      dashboard: [
        { id: "today", label: "✨ امروز چی مهم‌تره؟", prompt: "یه نگاه کلی بنداز و بگو امروز مهم‌ترین کاری که باید انجام بدم چیه." },
        { id: "plan-review", label: "🔍 تحلیل برنامه", handler: "analyzePlan" },
        { id: "motivation", label: "🌟 یه جمله انگیزشی", prompt: "یه جمله انگیزشی کوتاه برای یه اینترن پزشکی بگو." }
      ],
      planner: [
        { id: "plan-review", label: "🔍 تحلیل برنامه", handler: "analyzePlan" },
        { id: "plan-tips", label: "🧩 نکات برنامه‌ریزی", prompt: "چند نکته‌ی عملی برای برنامه‌ریزی بهتر تو دوران اینترنی بگو." }
      ],
      calendar: [
        { id: "week-review", label: "📅 هفته‌مو مرور کن", prompt: "چطور می‌تونم هفته‌ی پرمشغله‌ی اینترنی‌ام رو بهتر مدیریت کنم؟" }
      ],
      residency: [
        { id: "res-advice", label: "🎓 مشاوره‌ی مطالعه", prompt: "برای آماده‌سازی رزیدنتی، چند نکته‌ی عملی و واقع‌بینانه بگو." }
      ],
      study: [
        { id: "study-tips", label: "📚 روش مطالعه", prompt: "بهترین روش مطالعه برای اینترن پزشکی چیه؟ چطور بازدهی رو بالا ببرم؟" }
      ],
      clinical: [
        { id: "case-help", label: "🩺 کمک کیس", prompt: "برای ثبت یه کیس بالینی مفید، چه نکاتی رو باید در نظر بگیرم؟" }
      ],
      emergency: [
        { id: "em-help", label: "🚨 مرور سریع", prompt: "چطور می‌تونم مدیریت اورژانس‌ها رو بهتر یاد بگیرم؟" }
      ],
      progress: [
        { id: "prog-help", label: "📈 تحلیل پیشرفت", prompt: "چطور پیشرفتم رو تو اینترنی بهتر بسنجم و پیگیری کنم؟" }
      ],
      data: [
        { id: "data-help", label: "⚙️ تنظیمات AI", prompt: "دستیار هوشمند چطور کار می‌کنه و چه کاربردهایی داره؟" }
      ]
    };
    return byRoute[route] || [];
  }

  function _errorToPanelMessage(err) {
    var code = (err && err.code) || "";
    var map = {
      unauthorized:   "❌ کلید API اشتباه است. برو به داده‌ها → دستیار هوشمند و کلید رو چک کن.",
      forbidden:      "🚫 سرویس AI از IP شما پاسخ نمی‌ده. VPN یا پروکسی خود را روشن کن.",
      rate_limit:     "⏸️ محدودیت مصرف. چند لحظه صبر کن.",
      timeout:        "⏱️ زمان انتظار تمام شد. اینترنت یا VPN خود را بررسی کن.",
      network:        "🌐 اتصال به سرور AI برقرار نشد. اینترنت و VPN خود را بررسی کن.",
      server_error:   "🔧 سرور AI موقتاً مشکل دارد. کمی بعد امتحان کن.",
      ai_disabled: "دستیار هوشمند غیرفعال است. از تنظیمات روشن کن.",
        not_configured: "⚙️ تنظیمات ذخیره نشده. برو به داده‌ها → دستیار هوشمند.",
      no_key:         "🔑 کلید API وارد نشده.",
      provider_error: "❌ خطا از سرویس AI. بعداً امتحان کن."
    };
    return map[code] || ("❌ " + ((err && err.hint) || (err && err.message) || "خطای نامشخص"));
  }

  AI.renderQuickActions = function () {
    var el = document.getElementById("ai-panel-quick");
    if (!el) return;
    var actions = _getContextQuickActions();
    if (!actions.length) { el.style.display = "none"; return; }
    el.style.display = "";
    el.innerHTML = actions.map(function (a) {
      return '<button type="button" class="ai-quick-chip" data-quick-id="' + a.id + '">' + _escapeAI(a.label) + '</button>';
    }).join("");
    el.querySelectorAll("[data-quick-id]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-quick-id");
        var action = null;
        for (var i = 0; i < actions.length; i++) { if (actions[i].id === id) { action = actions[i]; break; } }
        if (!action) return;
        if (action.handler === "analyzePlan") { AI.renderPlanReview(); return; }
        if (action.prompt) AI.sendMessage(action.prompt);
      });
    });
  };

  AI.renderMessages = function () {
    var body = document.getElementById("ai-panel-body");
    if (!body) return;
    body.innerHTML = _messages.map(function (m) {
      if (m.role === "loading") {
        return '<div class="ai-msg ai-msg-loading"><div class="ai-msg-icon">🤖</div><div class="ai-msg-bubble"><span class="ai-loading-dot"></span><span class="ai-loading-dot"></span><span class="ai-loading-dot"></span></div></div>';
      }
      var isUser = m.role === "user";
      var isError = m.isError ? " ai-msg-error" : "";
      var icon = isUser ? "👤" : "🤖";
      return '<div class="ai-msg ' + (isUser ? "ai-msg-user" : "ai-msg-assistant") + isError + '">'
        + '<div class="ai-msg-icon">' + icon + '</div>'
        + '<div class="ai-msg-bubble">' + _escapeAI(m.content) + '</div>'
        + '</div>';
    }).join("");
    body.scrollTop = body.scrollHeight;
  };

  AI.togglePanel = function () {
    if (!_panelEl) return;
    if (_panelEl.classList.contains("is-open")) AI.closePanel();
    else AI.openPanel();
  };

  AI.refreshFabVisibility = function () {
    return AI.status().then(function (s) {
      var fabBtn = document.getElementById("ai-fab-btn");
      var panel = document.getElementById("ai-panel");
      if (s.enabled === false) {
        if (fabBtn) fabBtn.style.setProperty("display", "none", "important");
        if (panel) { panel.classList.remove("is-open"); panel.style.setProperty("display", "none", "important"); }
      } else {
        if (fabBtn) fabBtn.style.removeProperty("display");
        if (panel) panel.style.removeProperty("display");
      }
      return s;
    }).catch(function () {});
  };

  AI.openPanel = function () {
    if (!_panelEl) return;
    _panelEl.classList.add("is-open");
    var fabBtn = document.getElementById("ai-fab-btn");
    if (fabBtn) fabBtn.classList.add("is-open");
    AI.renderQuickActions();
    setTimeout(function () {
      var input = document.getElementById("ai-panel-input");
      if (input && window.innerWidth > 500) input.focus();
    }, 250);
  };

  AI.closePanel = function () {
    if (!_panelEl) return;
    _panelEl.classList.remove("is-open");
    var fabBtn = document.getElementById("ai-fab-btn");
    if (fabBtn) fabBtn.classList.remove("is-open");
  };

  AI.sendMessage = function (textOverride) {
    if (_isSending) return;
    var input = document.getElementById("ai-panel-input");
    var text;
    if (textOverride !== undefined && textOverride !== null) text = String(textOverride);
    else if (input) text = input.value.trim();
    else return;
    if (!text) return;

    _messages.push({ role: "user", content: text });
    _saveChatHistory();
    if (input && textOverride === undefined) { input.value = ""; input.style.height = "auto"; }

    var sendBtn = document.getElementById("ai-panel-send");
    if (sendBtn) sendBtn.disabled = true;

    _messages.push({ role: "loading" });
    AI.renderMessages();
    _isSending = true;

    var history = _messages.filter(function (m) {
      return m.role === "user" || m.role === "assistant";
    });
    history.pop(); // آخرین پیام = user جدید، حذفش کن

    var route = _currentRoute();
    var sysId = _deepMode ? "deepThinking" : ((route === "dashboard" || route === "calendar") ? "dashboardBrief" : "general");
    var maxTok = _deepMode ? 1800 : 600;
    AI.ask(sysId, text, { history: history, maxTokens: maxTok, context: AI.buildContextSnapshot(route) }).then(function (r) {
      _messages = _messages.filter(function (m) { return m.role !== "loading"; });
      _messages.push({ role: "assistant", content: r.text || "(بدون پاسخ)" });
      _saveChatHistory();
      _isSending = false;
      AI.renderMessages();
      if (sendBtn && input) sendBtn.disabled = !input.value.trim();
    }).catch(function (err) {
      _messages = _messages.filter(function (m) { return m.role !== "loading"; });
      _messages.push({ role: "assistant", content: _errorToPanelMessage(err), isError: true });
      _saveChatHistory();
      _isSending = false;
      AI.renderMessages();
      if (sendBtn && input) sendBtn.disabled = !input.value.trim();
    });
  };

  // ═══════════════════════════════════════════
  //  Plan Reviewer Module
  // ═══════════════════════════════════════════

  function _normalizeRecommendations(arr) {
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 5).map(function (rec, i) {
      if (!rec || typeof rec !== "object") return null;
      var type = String(rec.type || "skip");
      if (["reschedule", "create", "delete", "skip"].indexOf(type) === -1) type = "skip";
      var changes = (rec.changes && typeof rec.changes === "object") ? rec.changes : {};
      var impact = rec.impact || {};
      return {
        id: "rec-" + Date.now().toString(36) + "-" + i,
        type: type,
        title: String(rec.title || "پیشنهاد").slice(0, 60),
        explanation: String(rec.explanation || "").slice(0, 250),
        changes: changes,
        confidence: Math.max(0, Math.min(1, Number(rec.confidence) || 0.5)),
        impact: {
          positive: Array.isArray(impact.positive) ? impact.positive.map(String).slice(0, 3) : [],
          negative: Array.isArray(impact.negative) ? impact.negative.map(String).slice(0, 3) : []
        }
      };
    }).filter(Boolean);
  }
  var PLAN_REVIEW_SYSTEM_PROMPT = "You are a Persian-speaking planning advisor for an Iranian medical intern. " +
    "TASK: Analyze the plan. OUTPUT: ONLY valid JSON, no markdown. " +
    "SCHEMA: { summary: string, recommendations: [ { type: reschedule|create|delete|skip, title: string, explanation: string, changes: object, confidence: 0.5 } ] }. " +
    "CHANGES: reschedule -> { taskId, newDate, newTime }. create -> { title, areaId, date, time }. delete -> { taskId }. " +
    "RULES: 1) TIME-FIRST: when two tasks overlap in TIME, FIRST change the time. Only change date if no free slot. " +
    "2) Use busyTimes array from snapshot to find free slots. " +
    "3) PRIORITY: never reschedule HIGH priority when LOWER priority conflicts. " +
    "4) CLINICAL FIRST: area=clinical is more important than study. " +
    "5) DUPLICATES: similar titles (not just exact match) in same area -> DELETE the AI one (source=ai). Keep manual tasks. Look for keyword overlap. " +
    "5b) NO-TIME TASKS: tasks with empty time can also conflict. Suggest adding a time. " +
    "6) NO self-duplication. " +
    "7) Max 5 recs. 8) Empty array if balanced. 9) Persian strings. 10) Dates YYYY/M/D, Times HH:MM.";

  AI.analyzePlan = function () {
    var route = _currentRoute();
    var snapRoute = (route === "planner") ? "planner" : "dashboard";
    var snapshot = AI.buildContextSnapshot(snapRoute);
    if (!snapshot) {
      var e0 = new Error("داده‌ای برای تحلیل نیست");
      e0.code = "no_data";
      return Promise.reject(e0);
    }

    var messages = [
      { role: "system", content: PLAN_REVIEW_SYSTEM_PROMPT },
      { role: "user", content: "Snapshot of the user plan:\n" + snapshot + "\n\nAnalyze. Return JSON only." }
    ];

    return AI.chat(messages, { temperature: 0.3, maxTokens: 4000 })
      .then(function (r) {
        var parsed = parseJSONResponse(r.text);
        return {
          summary: String(parsed.summary || "").slice(0, 250),
          recommendations: _normalizeRecommendations(parsed.recommendations || [])
        };
      });
  };

  function _applySingleChange(rec, state) {
    if (rec.type === "skip") return true;
    var ch = rec.changes || {};

    if (rec.type === "reschedule") {
      var taskId = ch.taskId;
      if (!taskId) return false;
      if (!ch.newDate && !ch.newTime) return false;
      var task = state.tasks.find(function (t) { return t.id === taskId; });
      if (!task) return false;
      if (ch.newDate) task.date = ch.newDate;
      if (ch.newTime) task.time = ch.newTime;
      task.updatedAt = Date.now();
      return true;
    }

    if (rec.type === "create") {
      var newId = "t-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 6);
      state.tasks.push({
        id: newId,
        title: String(ch.title || "تسک جدید").slice(0, 100),
        areaId: ch.areaId || "study",
        date: ch.date || _todayJalaliLatin(),
        time: ch.time || "",
        priority: ch.priority || "normal",
        recurrence: "none",
        description: "",
        completed: false,
        sourceType: "ai",
        sourceId: rec.id,
        taskType: ch.taskType || "other",
        createdAt: Date.now(),
        updatedAt: Date.now()
      });
      return true;
    }

    if (rec.type === "delete") {
      var tid = ch.taskId;
      if (!tid) return false;
      var idx = state.tasks.findIndex(function (t) { return t.id === tid; });
      if (idx === -1) return false;
      state.tasks.splice(idx, 1);
      return true;
    }

    return false;
  }

  function _checkConflicts(selected) {
    var conflicts = [];
    var taskOps = {};
    var created = [];

    selected.forEach(function (rec) {
      if (!rec || rec.type === "skip") return;
      var ch = rec.changes || {};
      if (rec.type === "reschedule" || rec.type === "delete") {
        var tid = ch.taskId;
        if (!tid) return;
        if (!taskOps[tid]) taskOps[tid] = [];
        taskOps[tid].push(rec);
      }
      if (rec.type === "create") {
        created.push({
          title: (ch.title || "").trim(),
          date: ch.date || "",
          areaId: ch.areaId || "",
          rec: rec
        });
      }
    });

    // 1. چند عملیات روی یک تسک
    Object.keys(taskOps).forEach(function (tid) {
      if (taskOps[tid].length > 1) {
        conflicts.push({
          type: "multi_op",
          recs: taskOps[tid],
          message: "چند پیشنهاد همزمان روی یه تسک اثر می‌ذارن."
        });
      }
    });

    // 2. create تکراری با هم
    for (var i = 0; i < created.length; i++) {
      for (var j = i + 1; j < created.length; j++) {
        if (created[i].title === created[j].title &&
            created[i].date === created[j].date &&
            created[i].areaId === created[j].areaId) {
          conflicts.push({
            type: "dup_create",
            recs: [created[i].rec, created[j].rec],
            message: "دو پیشنهاد، یه تسک تکراری می‌سازن."
          });
        }
      }
    }

    // 3. create تکراری با تسک‌های موجود
    var state = _getState();
    if (state && Array.isArray(state.tasks)) {
      created.forEach(function (c) {
        var dup = state.tasks.find(function (t) {
          return t && t.title === c.title && t.date === c.date && t.areaId === c.areaId;
        });
        if (dup) {
          conflicts.push({
            type: "existing_dup",
            recs: [c.rec],
            message: "این تسک از قبل توی برنامه هست."
          });
        }
      });
    }

    return conflicts;
  }


  AI.applyRecommendations = function (selected) {
    var state = _getState();
    if (!state || !Array.isArray(selected) || selected.length === 0) {
      return { applied: 0, errors: ["داده‌ای در دسترس نیست"] };
    }

    var applied = 0;
    var errors = [];

    selected.forEach(function (rec) {
      try {
        if (_applySingleChange(rec, state)) applied++;
        else errors.push(rec.title);
      } catch (e) {
        errors.push(rec.title);
      }
    });

    if (applied > 0 && window.__os && typeof window.__os.saveState === "function") {
      window.__os.saveState();
    }

    return { applied: applied, errors: errors };
  };

  function _renderPlanReviewResult(result) {
    var body = document.getElementById("ai-panel-body");
    if (!body) return;

    var recs = result.recommendations || [];

    if (recs.length === 0) {
      body.innerHTML = ''
        + '<div class="ai-plan-empty">'
        + '<div class="ai-plan-empty-icon">✅</div>'
        + '<div class="ai-plan-empty-title">برنامه‌ات متوازنه</div>'
        + '<div class="ai-plan-empty-sub">' + _escapeAI(result.summary || "مشکلی پیدا نشد.") + '</div>'
        + '</div>';
      return;
    }

    var html = ''
      + '<div class="ai-plan-summary">' + _escapeAI(result.summary) + '</div>'
      + '<div class="ai-plan-list">';

    recs.forEach(function (rec, i) {
      var typeIcon = { reschedule: "🔄", create: "➕", delete: "🗑️", skip: "💡" }[rec.type] || "💡";
      var conf = Math.round(rec.confidence * 100);

      html += ''
        + '<label class="ai-rec-card" data-rec-idx="' + i + '">'
        + '<input type="checkbox" class="ai-rec-checkbox" data-rec-idx="' + i + '" checked>'
        + '<div class="ai-rec-body">'
        + '<div class="ai-rec-head">'
        + '<span class="ai-rec-icon">' + typeIcon + '</span>'
        + '<span class="ai-rec-title">' + _escapeAI(rec.title) + '</span>'
        + '<span class="ai-rec-conf">' + conf + '%</span>'
        + '</div>'
        + '<div class="ai-rec-desc">' + _escapeAI(rec.explanation) + '</div>';

      if (rec.impact.positive.length || rec.impact.negative.length) {
        html += '<div class="ai-rec-impact">';
        rec.impact.positive.forEach(function (p) {
          html += '<div class="ai-rec-imp-pos">✓ ' + _escapeAI(p) + '</div>';
        });
        rec.impact.negative.forEach(function (n) {
          html += '<div class="ai-rec-imp-neg">⚠ ' + _escapeAI(n) + '</div>';
        });
        html += '</div>';
      }

      html += '</div></label>';
    });

    html += '</div>';

    html += ''
      + '<div class="ai-plan-actions">'
      + '<button type="button" class="btn ghost" id="ai-plan-cancel">انصراف</button>'
      + '<button type="button" class="btn primary" id="ai-plan-apply">اعمال انتخاب‌شده‌ها</button>'
      + '</div>';

    body.innerHTML = html;

    var applyBtn = document.getElementById("ai-plan-apply");
    var cancelBtn = document.getElementById("ai-plan-cancel");

    if (cancelBtn) {
      cancelBtn.addEventListener("click", function () { AI.renderMessages(); });
    }

    if (applyBtn) {
      applyBtn.addEventListener("click", function () {
        var checked = body.querySelectorAll(".ai-rec-checkbox:checked");
        var selected = [];
        checked.forEach(function (cb) {
          var idx = parseInt(cb.dataset.recIdx, 10);
          if (recs[idx]) selected.push(recs[idx]);
        });

        if (selected.length === 0) {
          _messages.push({ role: "assistant", content: "هیچ پیشنهادی انتخاب نشد." });
          AI.renderMessages();
          return;
        }

        var conflicts = _checkConflicts(selected);
        if (conflicts.length > 0) {
          var conflictMsg = "⚠️ " + conflicts.length + " تضاد بین پیشنهادها:";
          conflicts.forEach(function (c) { conflictMsg += "\n• " + c.message; });
          conflictMsg += "\n\nلطفاً یکی از پیشنهادهای متضاد رو بردار.";
          setStatus("error", "تضاد بین پیشنهادها", conflictMsg);
          return;
        }

        var res = AI.applyRecommendations(selected);

        var summary = '';
        if (res.applied > 0) summary += "✅ " + res.applied + " پیشنهاد اعمال شد.";
        if (res.errors.length > 0) summary += " ⚠ " + res.errors.length + " مورد اعمال نشد.";

        _messages.push({ role: "assistant", content: summary });
        AI.renderMessages();

        if (window.__os && typeof window.__os.render === "function") {
          setTimeout(function () { window.__os.render(); }, 250);
        }
      });
    }
  }

  AI.renderPlanReview = function () {
    var body = document.getElementById("ai-panel-body");
    if (!body) return;

    body.innerHTML = '<div class="ai-plan-loading">🧠 در حال تحلیل برنامه...</div>';

    AI.analyzePlan().then(function (result) {
      _renderPlanReviewResult(result);
    }).catch(function (err) {
      var msg = _errorToPanelMessage(err);
      body.innerHTML = '<div class="ai-plan-error">' + _escapeAI(msg) + '</div>';
    });
  };

  AI.initFloatingButton = function () {
        if (_fabInitialized) return;
    _fabInitialized = true;

    // ─── فقط در WebView2 نمایش داده میشه (نه مرورگر) ───
    var isWebView2 = !!(window.chrome && window.chrome.webview);
    var forceShow = /[?&]ai=1/.test(location.search);
    if (!isWebView2 && !forceShow) {
      console.log("[AI] FAB hidden — WebView2 only (use ?ai=1 to force)");
      return;
    }

    var host = document.getElementById("ai-fab-host");
    if (!host) {
      host = document.createElement("div");
      host.id = "ai-fab-host";
      document.body.appendChild(host);
    }

    host.innerHTML = ''
      + '<button class="ai-fab" id="ai-fab-btn" type="button" aria-label="دستیار هوشمند">🪄</button>'
      + '<div class="ai-panel" id="ai-panel" role="dialog">'
      + '<div class="ai-panel-head">'
      + '<div class="ai-panel-head-icon">🤖</div>'
      + '<div class="ai-panel-head-text">'
      + '<div class="ai-panel-title">دستیار هوشمند</div>'
      + '<div class="ai-panel-sub" id="ai-panel-sub">در حال آماده‌سازی...</div>'
      + '</div>'
      + '<button class="ai-panel-clear" type="button" id="ai-panel-clear" title="پاک کردن تاریخچه">🗑️</button>'
      + '<button class="ai-panel-close" type="button" id="ai-panel-close" aria-label="بستن">✕</button>'
      + '</div>'
      + '<div class="ai-panel-quick" id="ai-panel-quick"></div>'
      + '<div class="ai-panel-body" id="ai-panel-body"></div>'
      + '<div class="ai-panel-input-row">'
      + '<textarea class="ai-panel-input" id="ai-panel-input" rows="1" placeholder="سؤالت رو بنویس..."></textarea>'
      + '<button class="ai-panel-send" type="button" id="ai-panel-send" aria-label="ارسال" disabled>➤</button>'
      + '</div>'
      + '</div>';

    _panelEl = document.getElementById("ai-panel");

  // ─── Plan Reviewer System Prompt ───────────────
  var PLAN_REVIEW_SYSTEM_PROMPT =
    "You are a Persian-speaking planning advisor for an Iranian medical intern. " +
    "TASK: Analyze the user's plan and return practical suggestions. " +
    "OUTPUT: ONLY valid JSON, no markdown, no explanation. " +
    "SCHEMA: { \"summary\": \"one sentence overview\", \"recommendations\": [ { \"type\": \"reschedule|create|delete|skip\", \"title\": \"short title (5 words max)\", \"explanation\": \"one line\", \"changes\": {}, \"confidence\": 0.0-1.0, \"impact\": { \"positive\": [\"...\"], \"negative\": [\"...\"] } } ] }. " +
    "CHANGES SCHEMAS: " +
    "  reschedule_task -> {\"taskId\": \"...\", \"newDate\": \"1405/7/15\"} " +
    "  create_task -> {\"title\": \"...\", \"areaId\": \"study\", \"date\": \"1405/7/15\", \"time\": \"08:00\"} " +
    "  delete_task -> {\"taskId\": \"...\"} " +
    "RULES: " +
    "  1) Only use data from the Snapshot, never invent task IDs or numbers. " +
    "  2) Max 5 recommendations. " +
    "  3) If plan is balanced, return empty recommendations array. " +
    "  4) Priority: overdue tasks, unbalanced areas, upcoming shifts. " +
    "  5) All user-facing strings must be in Persian. " +
    "  6) areaId values: clinical, study, emergency, procedures, residency, body, income, life. " +
    "  7) Dates: Jalali format YYYY/M/D (no leading zero).";

  // ─── حالت تفکر عمیق ───────────────────────

    // ─── دکمه تفکر عمیق (dynamic) ───
    var headEl = _panelEl.querySelector(".ai-panel-head");
    var closeBtnRef = _panelEl.querySelector("#ai-panel-close");
    var deepBtn = null;
    if (headEl && closeBtnRef) {
      deepBtn = document.createElement("button");
      deepBtn.type = "button";
      deepBtn.id = "ai-panel-deep";
      deepBtn.className = "ai-panel-deep";
      deepBtn.title = "تفکر عمیق";
      deepBtn.setAttribute("aria-label", "تفکر عمیق");
      deepBtn.textContent = "🧠";
      headEl.insertBefore(deepBtn, closeBtnRef);
    }

    var fabBtn = document.getElementById("ai-fab-btn");
    var closeBtn = document.getElementById("ai-panel-close");
    var input = document.getElementById("ai-panel-input");
    var sendBtn = document.getElementById("ai-panel-send");

    fabBtn.addEventListener("click", function (e) { e.stopPropagation(); AI.togglePanel(); });
    closeBtn.addEventListener("click", function () { AI.closePanel(); });

    var clearBtn = document.getElementById("ai-panel-clear");
    if (clearBtn) {
      clearBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        if (confirm("تاریخچه‌ی چت پاک بشه؟")) { _clearChatHistory(); }
      });
    }

    // ─── Wire deep toggle ───
    if (deepBtn) {
      deepBtn.classList.toggle("is-active", _deepMode);
      deepBtn.addEventListener("click", function () {
        _deepMode = !_deepMode;
        try { localStorage.setItem("internship-os.ai.deepMode", _deepMode ? "1" : "0"); } catch (e) {}
        deepBtn.classList.toggle("is-active", _deepMode);
      });
    }

    sendBtn.addEventListener("click", function () { AI.sendMessage(); });
    input.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); AI.sendMessage(); }
    });
    input.addEventListener("input", function () {
      input.style.height = "auto";
      input.style.height = Math.min(input.scrollHeight, 100) + "px";
      sendBtn.disabled = !input.value.trim() || _isSending;
    });

    AI.status().then(function (s) {
      var sub = document.getElementById("ai-panel-sub");
      if (!sub) return;
      if (s.configured) {
        var info = getProviderInfo(s.provider);
        sub.textContent = info.icon + " " + info.name + " · " + (s.model || "—");
      } else {
        sub.textContent = "⭕ هنوز تنظیم نشده — برو به داده‌ها";
      }
    }).catch(function () {
      var sub = document.getElementById("ai-panel-sub");
      if (sub) sub.textContent = "❌ سرور در دسترس نیست";
    });

    // outside-click-close
    document.addEventListener("click", function (e) {
      if (!_panelEl || !_panelEl.classList.contains("is-open")) return;
      if (_panelEl.contains(e.target)) return;
      var fab = document.getElementById("ai-fab-btn");
      if (fab && fab.contains(e.target)) return;
      AI.closePanel();
    });

    var _saved = _loadChatHistory();
    _messages = (_saved && _saved.length > 0)
      ? _saved
      : [{ role: "assistant", content: "سلام 👋 من دستیار هوشمند Internship OS هستم. چطور می‌تونم کمکت کنم؟" }];
    AI.renderQuickActions();
    AI.renderMessages();
  };
  AI.buildContextSnapshot = function (route) {
    try {
      var snap = _buildSnapshot(route || "dashboard");
      if (!snap) return "";
      return JSON.stringify(snap, null, 2);
    } catch (e) {
      console.warn("[AI] snapshot build failed:", e);
      return "";
    }
  };

  window.InternshipAI = AI;
  console.log("[InternshipAI] loaded · v" + AI.version);
})();
