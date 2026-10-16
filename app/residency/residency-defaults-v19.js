/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Residency Defaults v19
   داده‌های پیش‌فرض و موتور تقسیم هوشمند دوره‌ها
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[residency.defaults.v19] R missing"); return; }
  var D = R.residencyDefaults = R.residencyDefaults || {};

  /* ─── ۲۳ درس آزمون رزیدنتی با آیکون ─── */
  D.SUBJECTS = [
    { title: "ریه",                 icon: "🫁", short: "Pulm" },
    { title: "قلب",                 icon: "🫀", short: "Cardio" },
    { title: "گوارش",               icon: "🩺", short: "GI" },
    { title: "کلیه",                icon: "💧", short: "Renal" },
    { title: "غدد",                 icon: "⚗️", short: "Endo" },
    { title: "خون",                 icon: "🩸", short: "Heme" },
    { title: "روماتولوژی",           icon: "🦴", short: "Rheum" },
    { title: "اطفال",               icon: "👶", short: "Peds" },
    { title: "جراحی",               icon: "🩹", short: "Surg" },
    { title: "زنان",                icon: "👩‍⚕️", short: "OB/Gyn" },
    { title: "عفونی",               icon: "🦠", short: "ID" },
    { title: "پاتولوژی",             icon: "🔬", short: "Path" },
    { title: "فارماکولوژی",          icon: "💊", short: "Pharm" },
    { title: "روان‌پزشکی",            icon: "🧠", short: "Psych" },
    { title: "نورولوژی",             icon: "⚡", short: "Neuro" },
    { title: "پوست",                icon: "🖐️", short: "Derm" },
    { title: "ارتوپدی",              icon: "🦵", short: "Ortho" },
    { title: "اورولوژی",             icon: "🚹", short: "Uro" },
    { title: "چشم",                 icon: "👁️", short: "Ophth" },
    { title: "ENT",                 icon: "👂", short: "ENT" },
    { title: "رادیولوژی",            icon: "📷", short: "Radio" },
    { title: "آمار و اپیدمیولوژی",    icon: "📊", short: "Stat" },
    { title: "اخلاق",                icon: "⚖️", short: "Ethics" }
  ];

  /* ─── کتاب‌های پیش‌فرض QB ─── */
  D.QB_BOOKS = {
    "ریه":                 [{ title: "QB ریه", pages: 223 }],
    "قلب":                 [{ title: "QB قلب", pages: 468 }],
    "گوارش":               [{ title: "QB گوارش", pages: 254 }],
    "کلیه":                [{ title: "QB کلیه", pages: 252 }],
    "غدد":                 [{ title: "QB غدد", pages: 272 }],
    "خون":                 [{ title: "QB خون", pages: 285 }],
    "روماتولوژی":           [{ title: "QB روماتولوژی", pages: 201 }],
    "اطفال":               [
                              { title: "QB اطفال ۱", pages: 282 },
                              { title: "QB اطفال ۲", pages: 262 },
                              { title: "QB اطفال ۳", pages: 405 }
                           ],
    "جراحی":               [
                              { title: "QB جراحی ۱", pages: 233 },
                              { title: "QB جراحی ۲", pages: 268 },
                              { title: "QB جراحی ۳", pages: 243 }
                           ],
    "زنان":                [
                              { title: "QB زنان ۱", pages: 343 },
                              { title: "QB زنان ۲", pages: 269 }
                           ],
    "عفونی":               [{ title: "QB عفونی", pages: 418 }],
    "پاتولوژی":             [{ title: "QB پاتولوژی", pages: 363 }],
    "فارماکولوژی":          [{ title: "QB فارماکولوژی", pages: 258 }],
    "روان‌پزشکی":            [{ title: "QB روان‌پزشکی", pages: 252 }],
    "نورولوژی":             [{ title: "QB نورولوژی", pages: 250 }],
    "پوست":                [{ title: "QB پوست", pages: 242 }],
    "ارتوپدی":              [{ title: "QB ارتوپدی", pages: 316 }],
    "اورولوژی":             [{ title: "QB اورولوژی", pages: 255 }],
    "چشم":                 [{ title: "QB چشم", pages: 245 }],
    "ENT":                 [{ title: "QB ENT", pages: 284 }],
    "رادیولوژی":            [{ title: "QB رادیولوژی", pages: 234 }],
    "آمار و اپیدمیولوژی":    [{ title: "QB آمار", pages: 264 }],
    "اخلاق":                [{ title: "QB اخلاق", pages: 45 }]
  };

  /* ─── بررسی تکراری بودن نام درس ─── */
  D.isDuplicateSubject = function (title, existingSubjects) {
    if (!title) return false;
    var norm = String(title).trim().replace(/\s+/g, " ").toLowerCase();
    return (existingSubjects || []).some(function (s) {
      if (!s || !s.title) return false;
      var t = String(s.title).trim().replace(/\s+/g, " ").toLowerCase();
      return t === norm;
    });
  };

  /* ─── موتور تقسیم هوشمند دوره‌ها ─── */
  /* استراتژی: دور اول بلند برای مطالعه‌ی عمیق،
                دورهای آخر کوتاه برای مرور سریع.
     ضریب کاهش هندسی: 0.72 */
  D.suggestRoundDistribution = function (totalDays, roundCount) {
    totalDays = Math.max(1, parseInt(totalDays, 10) || 1);
    roundCount = Math.max(1, parseInt(roundCount, 10) || 1);
    if (roundCount === 1) return [totalDays];

    var RATIO = 0.72;
    var weights = [];
    for (var i = 0; i < roundCount; i++) {
      weights.push(Math.pow(RATIO, i));
    }
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);

    var days = [];
    var allocated = 0;
    for (var i = 0; i < roundCount; i++) {
      if (i === roundCount - 1) {
        days.push(Math.max(1, totalDays - allocated));
      } else {
        var d = Math.round(totalDays * weights[i] / sum);
        d = Math.max(1, d);
        days.push(d);
        allocated += d;
      }
    }
    return days;
  };

  /* ─── محاسبه‌ی بازه‌ی دوره‌ها از تاریخ شروع + تقسیمات ─── */
  D.buildRoundRanges = function (startDate, daysPerRound) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date || !LIB.date.parseJalali) return [];
    var p = LIB.date.parseJalali(startDate);
    if (!p) return [];
    var ranges = [];
    var cursor = { jy: p.jy, jm: p.jm, jd: p.jd };
    for (var i = 0; i < daysPerRound.length; i++) {
      var startKey = LIB.date.dateKey(cursor.jy, cursor.jm, cursor.jd);
      var endOffset = daysPerRound[i] - 1;
      var endP = LIB.date.addJalaliDays(cursor.jy, cursor.jm, cursor.jd, endOffset);
      var endKey = LIB.date.dateKey(endP.jy, endP.jm, endP.jd);
      ranges.push({ index: i, startDate: startKey, endDate: endKey, days: daysPerRound[i] });
      var next = LIB.date.addJalaliDays(endP.jy, endP.jm, endP.jd, 1);
      cursor = next;
    }
    return ranges;
  };

  /* ─── محاسبه‌ی روزهای باقی‌مانده تا آزمون ─── */
  D.daysUntil = function (targetDate) {
    var LIB = window.InternshipLib;
    if (!LIB || !LIB.date) return null;
    var today = LIB.date.todayJalaliString();
    var pt = LIB.date.parseJalali(today);
    var pe = LIB.date.parseJalali(targetDate);
    if (!pt || !pe) return null;
    return LIB.date.jalaliToDayNumber(pe.jy, pe.jm, pe.jd) -
           LIB.date.jalaliToDayNumber(pt.jy, pt.jm, pt.jd);
  };

  console.log("[residency.defaults.v19] loaded — " + D.SUBJECTS.length + " درس پیش‌فرض");
})();