/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Date & Time  ·  v1.0.0
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";

  var LIB = window.InternshipLib = window.InternshipLib || {};
  var DATE = LIB.date = LIB.date || {};
  var TIME = LIB.time = LIB.time || {};

  var JMONTHS   = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
  var JWEEKDAYS = ["شنبه","یک‌شنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه"];

  var faNum = LIB.faNum;

  /* ─── Gregorian ↔ Jalali ─── */
  function gregorianToJalali(gy, gm, gd) {
    var gdm = [0,31,59,90,120,151,181,212,243,273,304,334];
    var jy = (gy <= 1600) ? 0 : 979;
    gy -= (gy <= 1600) ? 621 : 1600;
    var gy2 = (gm > 2) ? (gy + 1) : gy;
    var days = (365 * gy) + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100)
             + Math.floor((gy2 + 399) / 400) - 80 + gd + gdm[gm - 1];
    jy += 33 * Math.floor(days / 12053); days %= 12053;
    jy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { jy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var jm = (days < 186) ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
    var jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
    return [jy, jm, jd];
  }

  function jalaliToGregorian(jy, jm, jd) {
    var gy = (jy <= 979) ? 621 : 1600;
    jy -= (jy <= 979) ? 0 : 979;
    var days = (365 * jy) + (Math.floor(jy / 33) * 8) + Math.floor(((jy % 33) + 3) / 4)
             + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
    gy += 400 * Math.floor(days / 146097); days %= 146097;
    if (days > 36524) { gy += 100 * Math.floor(--days / 36524); days %= 36524; if (days >= 365) days++; }
    gy += 4 * Math.floor(days / 1461); days %= 1461;
    if (days > 365) { gy += Math.floor((days - 1) / 365); days = (days - 1) % 365; }
    var gd = days + 1;
    var leap = (gy % 4 === 0 && (gy % 100 !== 0 || gy % 400 === 0));
    var sal_a = [0,31,leap ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
    var gm = 0;
    for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
    return [gy, gm, gd];
  }

  function jalaliYearLength(jy) {
    var g1 = jalaliToGregorian(jy, 1, 1);
    var g2 = jalaliToGregorian(jy + 1, 1, 1);
    var d1 = Date.UTC(g1[0], g1[1] - 1, g1[2]);
    var d2 = Date.UTC(g2[0], g2[1] - 1, g2[2]);
    return Math.round((d2 - d1) / 86400000);
  }

  function isJalaliLeap(jy) { return jalaliYearLength(jy) === 366; }

  function jalaliMonthLength(jy, jm) {
    if (jm <= 6) return 31;
    if (jm <= 11) return 30;
    return isJalaliLeap(jy) ? 30 : 29;
  }

  function jalaliMonthStartWeekday(jy, jm) {
    var g = jalaliToGregorian(jy, jm, 1);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return (d.getDay() + 1) % 7;
  }

  function addJalaliMonths(jy, jm, delta) {
    var total = jy * 12 + (jm - 1) + delta;
    return { jy: Math.floor(total / 12), jm: ((total % 12) + 12) % 12 + 1 };
  }

  function addJalaliDays(jy, jm, jd, delta) {
    var g = jalaliToGregorian(jy, jm, jd);
    var d = new Date(g[0], g[1] - 1, g[2]);
    d.setDate(d.getDate() + delta);
    var r = gregorianToJalali(d.getFullYear(), d.getMonth() + 1, d.getDate());
    return { jy: r[0], jm: r[1], jd: r[2] };
  }

  function addJalaliMonthsToDate(jy, jm, jd, delta) {
    var total = jy * 12 + (jm - 1) + delta;
    var nj = Math.floor(total / 12);
    var nm = ((total % 12) + 12) % 12 + 1;
    var nd = Math.min(jd, jalaliMonthLength(nj, nm));
    return { jy: nj, jm: nm, jd: nd };
  }

  function jalaliToDayNumber(jy, jm, jd) {
    var g = jalaliToGregorian(jy, jm, jd);
    return Math.floor(Date.UTC(g[0], g[1] - 1, g[2]) / 86400000);
  }

  /* ─── Format & Parse ─── */
  function dateKey(jy, jm, jd) { return jy + "/" + jm + "/" + jd; }

  function todayJalaliString() {
    var now = new Date();
    var r = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return r[0] + "/" + r[1] + "/" + r[2];
  }

  function todayJalaliObj() {
    var now = new Date();
    var r = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
    return { jy: r[0], jm: r[1], jd: r[2] };
  }

  function parseJalali(str) {
    if (!str) return null;
    var parts = String(str).split("/").map(function (x) { return parseInt(x, 10); });
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return { jy: parts[0], jm: parts[1], jd: parts[2] };
  }

  function compareJalaliDate(a, b) {
    var pa = parseJalali(a), pb = parseJalali(b);
    if (!pa || !pb) return 0;
    if (pa.jy !== pb.jy) return pa.jy - pb.jy;
    if (pa.jm !== pb.jm) return pa.jm - pb.jm;
    return pa.jd - pb.jd;
  }

  function weekdayName(jy, jm, jd) {
    var g = jalaliToGregorian(jy, jm, jd);
    var d = new Date(g[0], g[1] - 1, g[2]);
    return JWEEKDAYS[(d.getDay() + 1) % 7];
  }

  function prettyDate(jy, jm, jd) {
    return faNum(jd) + " " + JMONTHS[jm - 1] + " " + faNum(jy);
  }

  function prettyDateWD(jy, jm, jd) {
    return faNum(jd) + " " + JMONTHS[jm - 1] + " " + faNum(jy) + " · " + weekdayName(jy, jm, jd);
  }

  /* ─── Time helpers ─── */
  function timeToMinutes(t) {
    if (!t || typeof t !== "string") return null;
    var parts = t.split(":");
    if (parts.length !== 2) return null;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return h * 60 + m;
  }

  function minutesToTime(min) {
    min = Math.max(0, Math.min(24 * 60, min));
    var h = Math.floor(min / 60);
    var m = min % 60;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  // ─── NEW: یکسان‌سازی فرمت ساعت ("8:20" → "08:20") ───
  function normalizeTime(t) {
    if (!t || typeof t !== "string") return "";
    var parts = t.split(":");
    if (parts.length !== 2) return t;
    var h = parseInt(parts[0], 10);
    var m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return t;
    if (h < 0 || h > 23 || m < 0 || m > 59) return t;
    return String(h).padStart(2, "0") + ":" + String(m).padStart(2, "0");
  }

  /* ─── Exports ─── */
  DATE.JMONTHS = JMONTHS;
  DATE.JWEEKDAYS = JWEEKDAYS;
  DATE.gregorianToJalali = gregorianToJalali;
  DATE.jalaliToGregorian = jalaliToGregorian;
  DATE.jalaliYearLength = jalaliYearLength;
  DATE.isJalaliLeap = isJalaliLeap;
  DATE.jalaliMonthLength = jalaliMonthLength;
  DATE.jalaliMonthStartWeekday = jalaliMonthStartWeekday;
  DATE.addJalaliMonths = addJalaliMonths;
  DATE.addJalaliDays = addJalaliDays;
  DATE.addJalaliMonthsToDate = addJalaliMonthsToDate;
  DATE.jalaliToDayNumber = jalaliToDayNumber;
  DATE.dateKey = dateKey;
  DATE.todayJalaliString = todayJalaliString;
  DATE.todayJalaliObj = todayJalaliObj;
  DATE.parseJalali = parseJalali;
  DATE.compareJalaliDate = compareJalaliDate;
  DATE.weekdayName = weekdayName;
  DATE.prettyDate = prettyDate;
  DATE.prettyDateWD = prettyDateWD;

  TIME.timeToMinutes = timeToMinutes;
  TIME.minutesToTime = minutesToTime;
  TIME.normalizeTime = normalizeTime;
})();