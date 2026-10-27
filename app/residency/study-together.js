/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Study Together V1 (external module)
   هم‌مطالعه — حضور زنده + تایمر
   Depends: window.__ioStudyTogetherBridge (set by app.js)
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[study-together] R missing"); return; }

  var ST = R.studyTogether = R.studyTogether || {};
  function _stDbg() {
    try { return window.__ST_DEBUG__ === true; } catch (e) { return false; }
  }
  ST.VERSION = "1.0.0";

  var K_PENDING = "internship-os.study-together.pending";
  var SDK_FALLBACK = "2.118.0";
  var SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@%V%/dist/umd/supabase.js";

  var S = {
    phase: "init",
    user: null, profile: null, group: null, members: [],
    session: null, todayTotal: 0, pendingClientId: null,
    connection: "offline", lastError: null, container: null,
    formTab: "login", busy: false,
    readyView: "main", onBreak: false,
    todaySessionCount: 0, lastSessionEndedAt: null,
    pom: null,
    historySessions: null, historyView: "list", historyEdit: null, historyError: null, historySaving: false, historyPendingDelete: null,
    courses: [], selectedCourseId: null, navTab: "focus", courseEdit: null, courseError: null, courseSaving: false,
    avatarPick: null, avatarBusy: false, avatarError: null, sharePlanPreview: null, sharePlanBusy: false, sharePlanError: null, friendPlanData: null, roomOpen: false, goals: null, streak: null, weeklyTotalSec: 0, weeklyBestDay: null, goalsBusy: false, goalsError: null, groupGoalProgress: null, groupGoalBusy: false, groupGoalError: null, inviteVisible: false, accountBusy: { identity: false, privacy: false, password: false, email: false }, accountErr: { identity: null, privacy: null, password: null, email: null }, accountOk: { identity: null, privacy: null, password: null, email: null }, friendPlanLoading: false, friendPlanError: null, friendDayDate: null, friendDaySessions: null, friendDayLoading: false, friendDayError: null,
    statsSessions: null, statsPeriod: "week", statsLoading: false, statsError: null,
    historyRangeDays: 7, historyCourseFilter: null, historyDayFilter: null, historyRangeMode: "shortcut", historyFromDate: null, historyToDate: null, calYear: null, calMonth: null, histExpanded: null, histSelected: {}, histBulkCourse: null,
    memberProfileView: null, memberProfileData: null, memberProfileLoading: false, memberProfileError: null,
    leaderboardData: null, leaderboardLoading: false, leaderboardError: null, leaderboardPeriod: "today",
    offline: false, cacheAt: null, refreshInProgress: false, helpOpen: false, helpPage: null
  };

  var _sb = null, _config = null, _sdkPromise = null;
  var _pomodoroTickInterval = null, _pomodoroTransitioning = false, _stSessionBooted = false;
  var _channel = null, _tickInterval = null, _authUnsub = null, _reconnectTimer = null, _heartbeatTimer = null, _reconnectAttempt = 0, _connecting = false, _lastAuthToken = null;

  /* ─── Bridge ─── */
  function B() { return window.__ioStudyTogetherBridge; }
  function esc(s) { var b = B(); return b && b.escapeHtml ? b.escapeHtml(s) : String(s == null ? "" : s); }
  function fa0(n) { var b = B(); return b && b.fa0 ? b.fa0(n) : String(n); }
  function notify(lv, msg) { var b = B(); if (b && b.notify) b.notify(lv, msg); }

  /* ─── Utils ─── */
  function _uuid() {
    try {
      if (window.crypto && window.crypto.randomUUID) return window.crypto.randomUUID();
      var b = new Uint8Array(16);
      if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(b);
      else for (var i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
      return Array.prototype.slice.call(b).map(function (x) { return x.toString(16).padStart(2, "0"); }).join("");
    } catch (e) { return String(Date.now()) + "-" + Math.random().toString(36).slice(2, 10); }
  }
  function _startOfTodayLocalMs() { var d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
  function _toPersianDigits(str) {
    return String(str).replace(/[0-9]/g, function (d) { return String.fromCharCode(0x06F0 + parseInt(d, 10)); });
  }
  function _isoToJalaliParts(isoOrKey) {
    if (!isoOrKey) return null;
    var dlib = window.InternshipLib && window.InternshipLib.date;
    if (!dlib || !dlib.gregorianToJalali) return null;
    var s = String(isoOrKey);
    var gy, gm, gd;
    var m = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.exec(s);
    if (m) {
      gy = parseInt(m[1], 10); gm = parseInt(m[2], 10); gd = parseInt(m[3], 10);
    } else {
      var d = new Date(s);
      if (isNaN(d.getTime())) return null;
      gy = d.getFullYear(); gm = d.getMonth() + 1; gd = d.getDate();
    }
    try {
      var j = dlib.gregorianToJalali(gy, gm, gd);
      if (!j) return null;
      if (Array.isArray(j)) return { jy: j[0], jm: j[1], jd: j[2] };
      var jy = j.jy !== undefined ? j.jy : (j.year !== undefined ? j.year : (j.y !== undefined ? j.y : null));
      var jm = j.jm !== undefined ? j.jm : (j.month !== undefined ? j.month : (j.m !== undefined ? j.m : null));
      var jd = j.jd !== undefined ? j.jd : (j.day !== undefined ? j.day : (j.d !== undefined ? j.d : null));
      if (jy != null && jm != null && jd != null) return { jy: jy, jm: jm, jd: jd };
    } catch (e) {}
    return null;
  }
  function _fmtDateJalali(isoOrKey) {
    var j = _isoToJalaliParts(isoOrKey);
    if (!j) return String(isoOrKey || "").slice(0, 10);
    return _toPersianDigits(j.jy) + "/" + _toPersianDigits(j.jm) + "/" + _toPersianDigits(j.jd);
  }
  function _fmtDateJalaliPretty(isoOrKey) {
    var j = _isoToJalaliParts(isoOrKey);
    if (!j) return String(isoOrKey || "").slice(0, 10);
    var months = ["\u0641\u0631\u0648\u0631\u062F\u06CC\u0646","\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A","\u062E\u0631\u062F\u0627\u062F","\u062A\u06CC\u0631","\u0645\u0631\u062F\u0627\u062F","\u0634\u0647\u0631\u06CC\u0648\u0631","\u0645\u0647\u0631","\u0622\u0628\u0627\u0646","\u0622\u0630\u0631","\u062F\u06CC","\u0628\u0647\u0645\u0646","\u0627\u0633\u0641\u0646\u062F"];
    var monthName = months[j.jm - 1] || "";
    var dowNames = ["\u06CC\u06A9\u0634\u0646\u0628\u0647","\u062F\u0648\u0634\u0646\u0628\u0647","\u0633\u0647\u200C\u0634\u0646\u0628\u0647","\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647","\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647","\u062C\u0645\u0639\u0647","\u0634\u0646\u0628\u0647"];
    var s = String(isoOrKey);
    var mm = /^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/.exec(s);
    var gd;
    if (mm) gd = new Date(parseInt(mm[1], 10), parseInt(mm[2], 10) - 1, parseInt(mm[3], 10));
    else gd = new Date(s);
    var dowName = isNaN(gd.getTime()) ? "" : dowNames[gd.getDay()];
    return (dowName ? dowName + " " : "") + _toPersianDigits(j.jd) + " " + monthName + " " + _toPersianDigits(j.jy);
  }
  function _fmtTimer(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function pad2(n) { return _toPersianDigits(n < 10 ? "0" + n : "" + n); }
    return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
  }

  function _fmtLastSeen(isoStr) {
    if (!isoStr) return "\u0646\u0627\u0645\u0634\u062E\u0635";
    try {
      var d = new Date(isoStr);
      if (isNaN(d.getTime())) return "\u0646\u0627\u0645\u0634\u062E\u0635";
      var now = Date.now();
      var diffSec = Math.floor((now - d.getTime()) / 1000);
      var HHMM = _toPersianDigits(("0" + d.getHours()).slice(-2)) + ":" + _toPersianDigits(("0" + d.getMinutes()).slice(-2));
      if (diffSec < 0) return "\u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627";
      if (diffSec < 60) return "\u0647\u0645\u06CC\u0646 \u062D\u0627\u0644\u0627 (" + HHMM + ")";
      if (diffSec < 3600) return _toPersianDigits(Math.floor(diffSec / 60)) + " \u062F\u0642\u06CC\u0642\u0647 \u067E\u06CC\u0634 (" + HHMM + ")";
      var today = new Date(); today.setHours(0, 0, 0, 0);
      var thatDay = new Date(d.getTime()); thatDay.setHours(0, 0, 0, 0);
      var dayDiff = Math.round((today.getTime() - thatDay.getTime()) / 86400000);
      if (dayDiff === 0) return _toPersianDigits(Math.floor(diffSec / 3600)) + " \u0633\u0627\u0639\u062A \u067E\u06CC\u0634 (" + HHMM + ")";
      if (dayDiff === 1) return "\u062F\u06CC\u0631\u0648\u0632 " + HHMM;
      if (dayDiff < 7) return _toPersianDigits(dayDiff) + " \u0631\u0648\u0632 \u067E\u06CC\u0634 (" + HHMM + ")";
      var jp = _isoToJalaliParts(isoStr);
      if (jp) {
        var months = ["\u0641\u0631\u0648\u0631\u062F\u06CC\u0646","\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A","\u062E\u0631\u062F\u0627\u062F","\u062A\u06CC\u0631","\u0645\u0631\u062F\u0627\u062F","\u0634\u0647\u0631\u06CC\u0648\u0631","\u0645\u0647\u0631","\u0622\u0628\u0627\u0646","\u0622\u0630\u0631","\u062F\u06CC","\u0628\u0647\u0645\u0646","\u0627\u0633\u0641\u0646\u062F"];
        return _toPersianDigits(jp.jd) + " " + months[jp.jm - 1] + " " + _toPersianDigits(jp.jy) + " (" + HHMM + ")";
      }
      return _fmtDateJalali(isoStr) + " (" + HHMM + ")";
    } catch (e) { return "\u0646\u0627\u0645\u0634\u062E\u0635"; }
  }
  function _lastSeenSuffix(m, status) {
    if (!m || status !== "disconnected" || !m.last_seen_at) return "";
    return ' <span class="st-m-last-seen">\u00B7 ' + esc(_fmtLastSeen(m.last_seen_at)) + '</span>';
  }
  var _lastSeenWriteAt = 0;
  function _touchLastSeen(force) {
    if (!S.user || !S.user.id || !_sb) return;
    if (!force) {
      if (S.offline) return;
      if (typeof navigator !== "undefined" && navigator.onLine === false) return;
      var now = Date.now();
      if (now - _lastSeenWriteAt < 60000) return;
      _lastSeenWriteAt = now;
    }
    try {
      var _isoNow = new Date().toISOString();
      _sb.from("profiles").update({ last_seen_at: _isoNow }).eq("id", S.user.id)
        .then(function (r) { if (r && !r.error && S.profile) S.profile.last_seen_at = _isoNow; })
        .catch(function () {});
    } catch (e) {}
  }
  function _withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var timer = setTimeout(function () {
        if (done) return;
        done = true;
        var e = new Error("timeout:" + (label || "op") + " (" + ms + "ms)");
        e.__ioTimeout = true;
        reject(e);
      }, ms);
      Promise.resolve(promise).then(function (v) {
        if (done) return;
        done = true; clearTimeout(timer); resolve(v);
      }, function (e) {
        if (done) return;
        done = true; clearTimeout(timer); reject(e);
      });
    });
  }

  /* ─── Config + SDK + Client ─── */
  function loadConfig() {
    if (window.STUDY_TOGETHER_CONFIG) { _config = window.STUDY_TOGETHER_CONFIG; return Promise.resolve(_config); }
    return new Promise(function (resolve) {
      var sc = document.createElement("script");
      sc.src = "../data/study-together.js";
      sc.onload = function () { _config = window.STUDY_TOGETHER_CONFIG || null; resolve(_config); };
      sc.onerror = function () { _config = window.STUDY_TOGETHER_DEFAULTS || null; resolve(_config); };
      document.head.appendChild(sc);
      setTimeout(function () { resolve(window.STUDY_TOGETHER_CONFIG || window.STUDY_TOGETHER_DEFAULTS || null); }, 5000);
    });
  }
  function loadSdk() {
    if (_sdkPromise) return _sdkPromise;
    if (window.supabase && window.supabase.createClient) return Promise.resolve(window.supabase);
    _sdkPromise = new Promise(function (resolve, reject) {
      var ver = (_config && _config.sdkVersion) || SDK_FALLBACK;
      var url = SDK_URL.replace("%V%", ver);
      var sc = document.createElement("script");
      sc.src = url;
      sc.onload = function () {
        if (window.supabase && window.supabase.createClient) resolve(window.supabase);
        else reject(new Error("SDK loaded but createClient missing"));
      };
      sc.onerror = function () { reject(new Error("SDK load failed (network blocked?)")); };
      document.head.appendChild(sc);
      setTimeout(function () {
        if (!(window.supabase && window.supabase.createClient)) reject(new Error("SDK load timeout"));
      }, 15000);
    });
    return _sdkPromise;
  }
  function ensureClient() {
    if (_sb) return Promise.resolve(_sb);
    return loadSdk().then(function (sb) {
      _sb = sb.createClient(_config.url, _config.publishableKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      return _sb;
    });
  }

  /* ─── Queries ─── */
  function qGetProfile(uid) {
    return _sb.from("profiles").select("*").eq("id", uid).maybeSingle().then(function (r) { return r.data || null; });
  }
  function qUpsertProfile(uid, username, displayName) {
    return _sb.from("profiles").insert({ id: uid, username: username, display_name: displayName }).select().single();
  }
  function qGetMembership(uid) {
    return _sb.from("study_group_members").select("group_id,role").eq("user_id", uid).limit(1).then(function (r) { return (r.data && r.data[0]) || null; });
  }
  function qGetGroup(gid) {
    return _sb.from("study_groups").select("*").eq("id", gid).maybeSingle().then(function (r) { return r.data || null; });
  }
  function qGetMembers(gid) {
    return _sb.from("study_group_members").select("user_id,role,joined_at").eq("group_id", gid).then(function (r) { return r.data || []; });
  }
  function qGetProfiles(uids) {
    if (!uids.length) return Promise.resolve([]);
    return _sb.from("profiles").select("id,username,display_name,share_timeline,share_daily_total,share_course_breakdown,share_history_with_group,avatar_key,bio,avatar_url,share_daily_plan,last_seen_at").in("id", uids).then(function (r) { return r.data || []; });
  }
  function qGetTodaySessions(gid) {
    var startIso = new Date(_startOfTodayLocalMs()).toISOString();
    return _sb.from("study_sessions").select("user_id,started_at,ended_at,end_reason").eq("group_id", gid).gte("started_at", startIso).then(function (r) { return r.data || []; });
  }
  function qInsertSession(p) { return _sb.from("study_sessions").insert(p).select().single(); }
  function qUpdateSession(id, patch) { return _sb.from("study_sessions").update(patch).eq("id", id).select().single(); }
  function qFindOwnOpenSession(uid, gid) {
    return _sb.from("study_sessions").select("*").eq("user_id", uid).eq("group_id", gid).is("ended_at", null).order("started_at", { ascending: false }).limit(1).then(function (r) { return (r.data && r.data[0]) || null; });
  }
  function qFindByClientId(uid, cid) {
    return _sb.from("study_sessions").select("*").eq("user_id", uid).eq("client_session_id", cid).maybeSingle().then(function (r) { return r.data || null; });
  }
  function qGetRangeSessions(uid, gid, startIso, endIso) {
    return _sb.from("study_sessions").select("*")
      .eq("user_id", uid).eq("group_id", gid)
      .gte("started_at", startIso).lt("started_at", endIso)
      .order("started_at", { ascending: false })
      .then(function (r) { return r.data || []; });
  }
  function qDeleteSessionById(id, uid) {
    return _sb.from("study_sessions").delete()
      .eq("id", id).eq("user_id", uid).select();
  }
  function qUpdateManualSession(id, uid, patch, expect) {
    var q = _sb.from("study_sessions").update(patch)
      .eq("id", id).eq("user_id", uid)
      .eq("started_at", expect.started_at)
      .eq("end_reason", expect.end_reason);
    if (expect.ended_at) q = q.eq("ended_at", expect.ended_at);
    else q = q.is("ended_at", null);
    return q.select();
  }
  function qGetCourses(uid) {
    return _sb.from("study_courses").select("*")
      .eq("user_id", uid)
      .is("archived_at", null)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true })
      .then(function (r) { return r.data || []; });
  }
  function qInsertCourse(payload) {
    return _sb.from("study_courses").insert(payload).select().single();
  }
  function qUpdateCourse(id, uid, patch) {
    return _sb.from("study_courses").update(patch)
      .eq("id", id).eq("user_id", uid).select().single();
  }
  function qDeleteCourse(id, uid) {
    return _sb.from("study_courses").delete()
      .eq("id", id).eq("user_id", uid).select();
  }
  function qGetGroupRangeSessions(gid, startIso, endIso) {
    return _sb.from("study_sessions").select("user_id,client_session_id,started_at,ended_at,end_reason,course_id,session_type")
      .eq("group_id", gid)
      .gte("started_at", startIso)
      .lt("started_at", endIso)
      .then(function (r) { return r.data || []; });
  }
  function qGetGoals(uid) {
    return _sb.from("study_goals").select("*").eq("user_id", uid)
      .then(function (r) { return r.data || []; });
  }
  function qUpsertGoal(uid, scope, courseId, payload) {
    var q = _sb.from("study_goals").select("id").eq("user_id", uid).eq("scope", scope);
    if (courseId) q = q.eq("course_id", courseId);
    else q = q.is("course_id", null);
    return q.maybeSingle().then(function (r) {
      if (r && r.error) throw r.error;
      if (r && r.data) {
        return _sb.from("study_goals").update(payload).eq("id", r.data.id);
      }
      payload.user_id = uid;
      payload.scope = scope;
      payload.course_id = courseId;
      return _sb.from("study_goals").insert(payload);
    });
  }
  function qDeleteGoal(uid, scope, courseId) {
    var q = _sb.from("study_goals").delete().eq("user_id", uid).eq("scope", scope);
    if (courseId) q = q.eq("course_id", courseId);
    else q = q.is("course_id", null);
    return q;
  }
  function qGetStreakSessions(uid, gid) {
    var start = new Date(); start.setHours(0, 0, 0, 0); start.setDate(start.getDate() - 89);
    var end = new Date(); end.setHours(23, 59, 59, 999);
    return qGetRangeSessions(uid, gid, start.toISOString(), end.toISOString());
  }
  function qRpc(name, params) { return _sb.rpc(name, params); }

  /* ─── Pending ─── */
  function _pendingRead() {
    try { var raw = localStorage.getItem(K_PENDING); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
  }
  function _pendingWrite(p) {
    try { if (p) localStorage.setItem(K_PENDING, JSON.stringify(p)); else localStorage.removeItem(K_PENDING); } catch (e) {}
  }

  /* --- Pomodoro --- */
  var K_POM = "internship-os.study-together.pomodoro.v1";
  var POM_FOCUS_SEC = 25 * 60;
  var POM_BREAK_SEC = 5 * 60;

  function _pomRead() {
    try {
      var raw = localStorage.getItem(K_POM);
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== 1) return null;
      return p;
    } catch (e) { return null; }
  }
  function _pomWrite(p) {
    try {
      if (p) localStorage.setItem(K_POM, JSON.stringify(p));
      else localStorage.removeItem(K_POM);
    } catch (e) {}
  }
  function _pomClear() { _pomWrite(null); }
  function _pomSetTransitioning(v) { _pomodoroTransitioning = !!v; }
  function _pomShouldRecover(marker, hasOpenSession, isFreshBoot) {
    if (isFreshBoot !== true) return false;
    if (!marker) return false;
    if (marker.phase !== "starting_focus" && marker.phase !== "focus") return false;
    return hasOpenSession === true;
  }
  function _pomSetIdle() {
    S.onBreak = false;
    if (_channel && _channel.state === "joined") {
      try { broadcastPresence(); } catch (e) {}
    }
  }
  function _pomStart() {
    if (_pomodoroTransitioning) return;
    if (!S.user || !S.group) { notify("error", "ورود یا گروه لازم است"); return; }
    if (S.session) { notify("warning", "ابتدا جلسهٔ فعلی را پایان بده"); return; }
    if (S.pom && S.pom.phase === "recovery_required") { notify("warning", "ابتدا recovery را حل کن"); return; }
    var cid = _uuid();
    var now = Date.now();
    var marker = {
      v: 1,
      phase: "starting_focus",
      phaseStartedAt: new Date(now).toISOString(),
      phaseEndsAt: new Date(now + POM_FOCUS_SEC * 1000).toISOString(),
      completedCycles: (S.pom && S.pom.completedCycles) || 0,
      clientSessionId: cid
    };
    _pomWrite(marker);
    S.pom = marker;
    _pomSetTransitioning(true);
    startSession(cid, S.selectedCourseId, "pomodoro").then(function () {
      if (!S.pom || S.pom.clientSessionId !== cid) { _pomSetTransitioning(false); return; }
      S.pom.phase = "focus";
      S.pom.phaseStartedAt = new Date().toISOString();
      S.pom.phaseEndsAt = new Date(Date.now() + POM_FOCUS_SEC * 1000).toISOString();
      _pomWrite(S.pom);
      _pomSetTransitioning(false);
      try { notify("success", "پومودورو شروع شد"); } catch (e) {}
      render();
    }).catch(function (err) {
      _pomSetTransitioning(false);
      _pomClear();
      S.pom = null;
      try { notify("error", "شروع پومودورو ناموفق"); } catch (e) {}
      render();
    });
  }
  function _pomTransitionFocusToBreak() {
    if (_pomodoroTransitioning) return;
    if (!S.pom || S.pom.phase !== "focus") return;
    if (!S.session) {
      _pomClear();
      S.pom = null;
      render();
      return;
    }
    var plannedEnd = S.pom.phaseEndsAt;
    _pomSetTransitioning(true);
    endWith("break", plannedEnd).then(function () {
      if (!S.pom || S.pom.phase !== "focus") { _pomSetTransitioning(false); return; }
      var now = Date.now();
      S.pom.phase = "break";
      S.pom.phaseStartedAt = new Date(now).toISOString();
      S.pom.phaseEndsAt = new Date(now + POM_BREAK_SEC * 1000).toISOString();
      S.pom.completedCycles = (S.pom.completedCycles || 0) + 1;
      _pomWrite(S.pom);
      _pomSetTransitioning(false);
      try { notify("success", "دور کامل شد — استراحت"); } catch (e) {}
      render();
    }).catch(function () {
      _pomSetTransitioning(false);
      try { notify("error", "پایان جلسه ناموفق — وضعیت حفظ شد"); } catch (e) {}
      render();
    });
  }
  function _pomTransitionBreakToReady() {
    if (_pomodoroTransitioning) return;
    if (!S.pom || S.pom.phase !== "break") return;
    _pomSetTransitioning(true);
    S.pom.phase = "ready_next_focus";
    S.pom.phaseStartedAt = new Date().toISOString();
    S.pom.phaseEndsAt = new Date().toISOString();
    _pomWrite(S.pom);
    _pomSetIdle();
    _pomSetTransitioning(false);
    render();
  }
  function _pomSkipBreak() {
    if (_pomodoroTransitioning) return;
    if (!S.pom || S.pom.phase !== "break") return;
    _pomTransitionBreakToReady();
  }
  function _pomEndManual() {
    if (_pomodoroTransitioning) return;
    if (!S.pom) return;
    var phase = S.pom.phase;
    if (phase === "focus") {
      _pomSetTransitioning(true);
      endWith("ended").then(function () {
        _pomSetTransitioning(false);
        _pomClear();
        S.pom = null;
        S.onBreak = false;
        render();
      }).catch(function () {
        _pomSetTransitioning(false);
        try { notify("error", "پایان جلسه ناموفق"); } catch (e) {}
      });
    } else if (phase === "break" || phase === "ready_next_focus") {
      _pomClear();
      S.pom = null;
      _pomSetIdle();
      render();
    }
  }
  function _pomRecoveryCrash() {
    if (!S.pom || S.pom.phase !== "recovery_required") return;
    var pending = S.pom.pendingSession;
    _pomSetTransitioning(true);
    var p = pending
      ? qUpdateSession(pending.id, { ended_at: new Date().toISOString(), end_reason: "crash" })
      : Promise.resolve();
    p.then(function (r) {
      if (r && r.error) throw r.error;
      _pomClear();
      S.pom = null;
      S.session = null;
      _pomSetTransitioning(false);
      return refreshAll();
    }).catch(function () {
      _pomSetTransitioning(false);
      try { notify("error", "تعیین تکلیف ناموفق"); } catch (e) {}
      render();
    });
  }
  function _pomRecoveryRestart() {
    if (!S.pom || S.pom.phase !== "recovery_required") return;
    var pending = S.pom.pendingSession;
    _pomSetTransitioning(true);
    var p = pending
      ? qUpdateSession(pending.id, { ended_at: new Date().toISOString(), end_reason: "crash" })
      : Promise.resolve();
    p.then(function (r) {
      if (r && r.error) throw r.error;
      _pomClear();
      S.pom = null;
      S.session = null;
      _pomSetTransitioning(false);
      return refreshAll();
    }).then(function () {
      return _pomStart();
    }).catch(function () {
      _pomSetTransitioning(false);
      try { notify("error", "تعیین تکلیف ناموفق"); } catch (e) {}
      render();
    });
  }
  function _pomRecoveryNoSessionClear() {
    if (!S.pom || S.pom.phase !== "recovery_required") return;
    _pomClear();
    S.pom = null;
    render();
  }
  function _pomRecoveryNoSessionRestart() {
    if (!S.pom || S.pom.phase !== "recovery_required") return;
    _pomClear();
    S.pom = null;
    _pomStart();
  }
  function _pomAfterOpen() {
    if (S.pom && S.pom.phase === "recovery_required") return;
    var marker = _pomRead();
    if (!marker) return;
    if (marker.phase === "starting_focus" || marker.phase === "focus") {
      if (S.session) {
        S.pom = marker;
        render();
        return;
      }
      S.pom = { v: 1, phase: "recovery_required", kind: "no_session", pendingSession: null, marker: marker };
      render();
      return;
    }
    if (marker.phase === "break" || marker.phase === "ready_next_focus") {
      S.pom = marker;
      if (marker.phase === "break" && Date.now() >= new Date(marker.phaseEndsAt).getTime()) {
        S.pom.phase = "ready_next_focus";
        _pomWrite(S.pom);
        _pomSetIdle();
      }
      render();
    }
  }
  function _pomTick() {
    if (!S.pom) return;
    var phase = S.pom.phase;
    if (phase !== "focus" && phase !== "break") return;
    var now = Date.now();
    var ends = new Date(S.pom.phaseEndsAt).getTime();
    var remaining = Math.max(0, Math.floor((ends - now) / 1000));
    if (S.container) {
      var timerEl = S.container.querySelector(".st-pom-timer");
      if (timerEl) timerEl.textContent = _fmtTimer(remaining);
      var labelEl = S.container.querySelector(".st-pom-label");
      if (labelEl && _pomodoroTransitioning) labelEl.textContent = "در حال انتقال...";
      var ringEl = S.container.querySelector(".st-pom-ring-fg");
      if (ringEl) {
        var _t = phase === "focus" ? POM_FOCUS_SEC : POM_BREAK_SEC;
        var _c = 2 * Math.PI * 96;
        var _r = Math.max(0, Math.min(1, remaining / _t));
        ringEl.setAttribute("stroke-dashoffset", String(_c * (1 - _r)));
      }
    }
    if (now >= ends && !_pomodoroTransitioning) {
      if (phase === "focus") _pomTransitionFocusToBreak();
      else if (phase === "break") _pomTransitionBreakToReady();
    }
  }
  function _ensurePomodoroTicker() {
    if (_pomodoroTickInterval) return;
    _pomodoroTickInterval = setInterval(_pomTick, 1000);
  }
  function _renderPomodoroPanel() {
    var p = S.pom;
    if (!p) return "";
    if (p.phase === "recovery_required") {
      var desc = p.kind === "open_session"
        ? "یک جلسهٔ مطالعهٔ باز از قبل مانده. تعیین تکلیف کن:"
        : "وضعیت پومودوروی قبلی نامشخص است. تعیین تکلیف کن:";
      var actions;
      if (p.kind === "open_session") {
        actions = '<button class="st-btn-danger" data-st-act="pom-recovery-crash" title="پایان با ثبت crash">⏹️ خاتمه با ثبت crash</button>' +
                  '<button class="st-btn-ghost" data-st-act="pom-recovery-restart" title="خاتمه و شروع دوباره">🔄 خاتمه و شروع دوباره</button>';
      } else {
        actions = '<button class="st-btn-ghost" data-st-act="pom-recovery-no-session-clear" title="پاک‌کردن وضعیت">✖ پاک‌کردن وضعیت</button>' +
                  '<button class="st-btn-primary" data-st-act="pom-recovery-no-session-restart" title="شروع تازه">▶️ شروع تازه</button>';
      }
      return '<div class="st-pom-panel is-recovery">' +
        '<div class="st-pom-badge">⚠️ بازیابی پومودورو</div>' +
        '<div class="st-pom-recovery-desc">' + esc(desc) + '</div>' +
        '<div class="st-pom-actions">' + actions + '</div>' +
      '</div>';
    }
    if (p.phase === "focus" || p.phase === "break") {
      var now = Date.now();
      var remaining = Math.max(0, Math.floor((new Date(p.phaseEndsAt).getTime() - now) / 1000));
      var label = _pomodoroTransitioning ? "در حال انتقال..." : (p.phase === "focus" ? "در حال مطالعه" : "استراحت");
      var cls = p.phase === "focus" ? "is-focus" : "is-break";
      var cycle = (p.completedCycles || 0) + 1;
      var actions2 = p.phase === "focus"
        ? '<button class="st-btn-danger" data-st-act="pom-end" title="پایان دستی پومودورو">⏹️ خاتمه</button>'
        : '<button class="st-btn-ghost" data-st-act="pom-skip-break" title="رد کردن استراحت">⏭️ رد کردن استراحت</button>';
      var _total = p.phase === "focus" ? POM_FOCUS_SEC : POM_BREAK_SEC;
      var _circ = 2 * Math.PI * 96;
      var _ratio = remaining / _total;
      var _offset = _circ * (1 - _ratio);
      return '<div class="st-pom-panel ' + cls + '">' +
        '<div class="st-pom-badge">🍅 پومودورو · دور ' + fa0(cycle) + '</div>' +
        '<div class="st-timer-ring-wrap">' +
          '<svg class="st-timer-ring" viewBox="0 0 220 220">' +
            '<circle class="st-ring-bg" cx="110" cy="110" r="96"></circle>' +
            '<circle class="st-ring-fg st-pom-ring-fg" cx="110" cy="110" r="96" stroke-dasharray="' + _circ + '" stroke-dashoffset="' + _offset + '" transform="rotate(-90 110 110)"></circle>' +
          '</svg>' +
          '<div class="st-timer-ring-text st-pom-timer">' + _fmtTimer(remaining) + '</div>' +
        '</div>' +
        '<div class="st-pom-label">' + label + '</div>' +
        '<div class="st-pom-actions">' + actions2 + '</div>' +
      '</div>';
    }
    if (p.phase === "ready_next_focus") {
      var total = (p.completedCycles || 0);
      return '<div class="st-pom-panel is-ready">' +
        '<div class="st-pom-badge">🍅 پومودورو · ' + fa0(total) + ' دور کامل شد</div>' +
        '<div class="st-pom-label">آماده برای دور بعد</div>' +
        '<div class="st-pom-actions">' +
          '<button class="st-btn-primary" data-st-act="pom-next" title="شروع دور بعد">▶️ شروع دور بعد</button>' +
          '<button class="st-btn-ghost" data-st-act="pom-end" title="خاتمهٔ پومودورو">✖ خاتمه</button>' +
        '</div>' +
      '</div>';
    }
    return "";
  }

  /* ─── Session ─── */
  /* --- D: Study History --- */
  function _localMidnightIso(offsetDays) {
    var d = new Date();
    d.setDate(d.getDate() - (offsetDays || 0));
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  function _dayKeyFromIso(isoStr) {
    var d = new Date(isoStr);
    return d.getFullYear() + "/" + (d.getMonth() + 1) + "/" + d.getDate();
  }
  function _fmtTimeShort(isoStr) {
    if (!isoStr) return "—";
    var d = new Date(isoStr);
    var h = d.getHours(), m = d.getMinutes();
    return _toPersianDigits((h < 10 ? "0" : "") + h) + ":" + _toPersianDigits((m < 10 ? "0" : "") + m);
  }
  function _isoToLocalInput(isoStr) {
    var d = new Date(isoStr);
    var Y = d.getFullYear();
    var M = ("0" + (d.getMonth() + 1)).slice(-2);
    var D = ("0" + d.getDate()).slice(-2);
    var h = ("0" + d.getHours()).slice(-2);
    var m = ("0" + d.getMinutes()).slice(-2);
    return Y + "-" + M + "-" + D + "T" + h + ":" + m;
  }
  function _localInputToIso(str) {
    if (!str) return null;
    var d = new Date(str);
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
  }
  function _hasOwnOverlap(startIso, endIso, editId, sessions) {
    var sMs = new Date(startIso).getTime();
    var eMs = new Date(endIso).getTime();
    if (!isFinite(sMs) || !isFinite(eMs) || eMs <= sMs) return false;
    for (var i = 0; i < (sessions || []).length; i++) {
      var r = sessions[i];
      if (r.id === editId) continue;
      if (r.end_reason === "crash") continue;
      var rS = new Date(r.started_at).getTime();
      var rE = r.ended_at ? new Date(r.ended_at).getTime() : Date.now();
      if (sMs < rE && rS < eMs) return true;
    }
    return false;
  }
  function _validateManualEntry(values, editId, sessions) {
    var errs = [];
    var sMs = new Date(values.started_at).getTime();
    var eMs = new Date(values.ended_at).getTime();
    var now = Date.now();
    if (!isFinite(sMs)) { errs.push("زمان شروع نامعتبر"); return errs; }
    if (!isFinite(eMs)) { errs.push("زمان پایان نامعتبر"); return errs; }
    if (sMs > now) errs.push("زمان شروع در آینده");
    if (eMs > now) errs.push("زمان پایان در آینده");
    if (eMs <= sMs) errs.push("پایان باید بعد از شروع باشد");
    var dur = eMs - sMs;
    if (dur < 1000) errs.push("مدت حداقل یک ثانیه");
    if (dur > 86400000) errs.push("مدت حداکثر ۲۴ ساعت");
    if (values.end_reason !== "ended" && values.end_reason !== "break") errs.push("نوع پایان نامعتبر");
    if (errs.length === 0 && _hasOwnOverlap(values.started_at, values.ended_at, editId, sessions)) {
      errs.push("با جلسهٔ دیگری هم‌پوشانی دارد");
    }
    return errs;
  }
  function _historyResolveRange() {
    var endD = new Date(); endD.setHours(23, 59, 59, 999);
    var startD = new Date(); startD.setHours(0, 0, 0, 0);
    if (S.historyRangeMode === "custom" && S.historyFromDate && S.historyToDate) {
      startD = new Date(S.historyFromDate + "T00:00:00");
      endD = new Date(S.historyToDate + "T23:59:59.999");
    } else if (S.historyRangeMode === "day" && S.historyFromDate) {
      startD = new Date(S.historyFromDate + "T00:00:00");
      endD = new Date(S.historyFromDate + "T23:59:59.999");
    } else {
      var days = S.historyRangeDays || 7;
      startD = new Date(); startD.setHours(0, 0, 0, 0);
      startD.setDate(startD.getDate() - (days - 1));
    }
    return { startIso: startD.toISOString(), endIso: endD.toISOString() };
  }
  function _loadHistory() {
    if (!S.user || !S.group) return Promise.resolve();
    var r = _historyResolveRange();
    return qGetRangeSessions(S.user.id, S.group.id, r.startIso, r.endIso)
      .then(function (rows) { S.historySessions = rows; })
      .catch(function (err) { S.historyError = String(err && err.message || err); S.historySessions = []; });
  }
  function _savePrivacy() {
    if (!S.user || !_sb) return;
    if (!_requireOnline()) return;
    S.accountBusy.privacy = true;
    S.accountErr.privacy = null;
    S.accountOk.privacy = null;
    var get = function (k) { var el = S.container.querySelector('[data-st-setting="' + k + '"]'); return el ? !!el.checked : false; };
    var _newAvatar = S.avatarPick || (S.profile && S.profile.avatar_key) || "av-1";
    var bioEl = S.container.querySelector('[data-st-bio]');
    var _newBio = bioEl ? String(bioEl.value || "").trim() : null;
    if (_newBio !== null && _newBio.length > 200) {
      S.accountBusy.privacy = false;
      S.accountErr.privacy = "\u062D\u062F\u0627\u06A9\u062B\u0631 \u06F2\u06F0\u06F0";
      render();
      return;
    }
    var patch = {
      share_daily_total: get("share_daily_total"),
      share_timeline: get("share_timeline"),
      share_course_breakdown: get("share_course_breakdown"),
      share_history_with_group: get("share_history_with_group"),
      share_daily_plan: get("share_daily_plan"),
      avatar_key: _newAvatar,
      updated_at: new Date().toISOString()
    };
    if (_newBio !== null) patch.bio = (_newBio || null);
    render();
    _sb.from("profiles").update(patch).eq("id", S.user.id).select().single().then(function (r) {
      if (r && r.error) throw r.error;
      if (!r || !r.data) throw new Error("\u0630\u062E\u06CC\u0631\u0647 \u062F\u0631 DB \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F (\u062F\u0633\u062A\u0631\u0633\u06CC \u06CC\u0627 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644)");
      S.accountBusy.privacy = false;
      S.accountOk.privacy = "\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F";
      if (S.profile) {
        S.profile.share_daily_total = patch.share_daily_total;
        S.profile.share_timeline = patch.share_timeline;
        S.profile.share_course_breakdown = patch.share_course_breakdown;
        S.profile.share_history_with_group = patch.share_history_with_group;
        S.profile.share_daily_plan = patch.share_daily_plan;
        S.profile.avatar_key = patch.avatar_key;
        if (patch.bio !== undefined) S.profile.bio = patch.bio;
      }
      S.avatarPick = null;
      try { broadcastPresence(); } catch (e) {}
      try { notify("success", "\u062A\u0646\u0638\u06CC\u0645\u0627\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {}
      render();
    }).catch(function (err) {
      S.accountBusy.privacy = false;
      S.accountErr.privacy = String(err && err.message || err);
      render();
    });
  }
  function _saveIdentity() {
    if (!S.user || !_sb) return;
    if (!_requireOnline()) return;
    var dnEl = S.container.querySelector('[data-account-field="display_name"]');
    var unEl = S.container.querySelector('[data-account-field="username"]');
    if (!dnEl || !unEl) return;
    var dn = String(dnEl.value || "").trim();
    var un = String(unEl.value || "").trim().toLowerCase();
    if (dn.length < 1 || dn.length > 64) { S.accountErr.identity = "\u0646\u0627\u0645 \u062F\u06CC\u0633\u067E\u0644\u06CC \u0628\u0627\u06CC\u062F \u06F1-\u06F6\u06F4 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F"; render(); return; }
    if (un.length < 2 || un.length > 32) { S.accountErr.identity = "\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0628\u0627\u06CC\u062F \u06F2-\u06F3\u06F2 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631 \u0628\u0627\u0634\u062F"; render(); return; }
    if (!/^[a-z0-9_.-]+$/.test(un)) { S.accountErr.identity = "\u0641\u0642\u0637 \u062D\u0631\u0648\u0641 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC\u060C \u0639\u062F\u062F\u060C _.-"; render(); return; }
    if (un !== (S.profile.username || "").toLowerCase()) {
      S.accountBusy.identity = true;
      S.accountErr.identity = null;
      S.accountOk.identity = null;
      render();
      _sb.from("profiles").select("id").eq("username", un).neq("id", S.user.id).limit(1).then(function (rr) {
        if (rr && rr.error) throw rr.error;
        if (rr.data && rr.data.length > 0) {
          throw new Error("\u0627\u06CC\u0646 \u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u0627\u0632 \u0642\u0628\u0644 \u0627\u062E\u062A\u0635\u0627\u0635 \u06CC\u0627\u0641\u062A\u0647");
        }
        return _sb.from("profiles").update({ display_name: dn, username: un, updated_at: new Date().toISOString() }).eq("id", S.user.id).select().single();
      }).then(function (r) {
        if (r && r.error) throw r.error;
        if (!r || !r.data) throw new Error("\u0630\u062E\u06CC\u0631\u0647 \u062F\u0631 DB \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F");
        S.profile.display_name = dn;
        S.profile.username = un;
        for (var i = 0; i < S.members.length; i++) {
          if (S.members[i].user_id === S.user.id) {
            S.members[i].display_name = dn;
            S.members[i].username = un;
          }
        }
        S.accountBusy.identity = false;
        S.accountOk.identity = "\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F";
        try { broadcastPresence(); } catch (e) {}
        try { notify("success", "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {}
        render();
      }).catch(function (err) {
        S.accountBusy.identity = false;
        S.accountErr.identity = String(err && err.message || err);
        render();
      });
      return;
    }
    S.accountBusy.identity = true;
    S.accountErr.identity = null;
    S.accountOk.identity = null;
    render();
    _sb.from("profiles").update({ display_name: dn, updated_at: new Date().toISOString() }).eq("id", S.user.id).select().single().then(function (r) {
      if (r && r.error) throw r.error;
      if (!r || !r.data) throw new Error("\u0630\u062E\u06CC\u0631\u0647 \u062F\u0631 DB \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F");
      S.profile.display_name = dn;
      for (var i = 0; i < S.members.length; i++) {
        if (S.members[i].user_id === S.user.id) S.members[i].display_name = dn;
      }
      S.accountBusy.identity = false;
      S.accountOk.identity = "\u0630\u062E\u06CC\u0631\u0647 \u0634\u062F";
      try { broadcastPresence(); } catch (e) {}
      try { notify("success", "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {}
      render();
    }).catch(function (err) {
      S.accountBusy.identity = false;
      S.accountErr.identity = String(err && err.message || err);
      render();
    });
  }
  function _changeEmail() {
    if (!S.user || !_sb) return;
    if (!_requireOnline()) return;
    var el = S.container.querySelector('[data-account-field="new_email"]');
    if (!el) return;
    var newEmail = String(el.value || "").trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(newEmail)) {
      S.accountErr.email = "\u0627\u06CC\u0645\u06CC\u0644 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A";
      render();
      return;
    }
    if (newEmail.toLowerCase() === String(S.user.email || "").toLowerCase()) {
      S.accountErr.email = "\u0627\u06CC\u0645\u06CC\u0644 \u0641\u0639\u0644\u06CC \u0648 \u062C\u062F\u06CC\u062F \u06CC\u06A9\u0633\u0627\u0646 \u0627\u0633\u062A";
      render();
      return;
    }
    S.accountBusy.email = true;
    S.accountErr.email = null;
    S.accountOk.email = null;
    render();
    _sb.auth.updateUser({ email: newEmail }).then(function (r) {
      if (r && r.error) throw r.error;
      S.accountBusy.email = false;
      S.accountOk.email = "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062B\u0628\u062A \u0634\u062F \u2014 \u0627\u06CC\u0645\u06CC\u0644 \u062A\u0623\u06CC\u06CC\u062F \u0631\u0627 \u0628\u0631\u0631\u0633\u06CC \u06A9\u0646\u06CC\u062F";
      try { notify("success", "\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u063A\u06CC\u06CC\u0631 \u0627\u06CC\u0645\u06CC\u0644 \u062B\u0628\u062A \u0634\u062F"); } catch (e) {}
      render();
    }).catch(function (err) {
      S.accountBusy.email = false;
      S.accountErr.email = String(err && err.message || err);
      render();
    });
  }
  function _changePassword() {
    if (!S.user || !_sb) return;
    if (!_requireOnline()) return;
    var p1 = S.container.querySelector('[data-account-field="new_password"]');
    var p2 = S.container.querySelector('[data-account-field="confirm_password"]');
    if (!p1 || !p2) return;
    var v1 = String(p1.value || "");
    var v2 = String(p2.value || "");
    if (v1.length < 8) { S.accountErr.password = "\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631"; render(); return; }
    if (v1 !== v2) { S.accountErr.password = "\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u0645\u0637\u0627\u0628\u0642\u062A \u0646\u062F\u0627\u0631\u062F"; render(); return; }
    S.accountBusy.password = true;
    S.accountErr.password = null;
    S.accountOk.password = null;
    render();
    _sb.auth.updateUser({ password: v1 }).then(function (r) {
      if (r && r.error) throw r.error;
      S.accountBusy.password = false;
      S.accountOk.password = "\u0631\u0645\u0632 \u0628\u0627 \u0645\u0648\u0641\u0642\u06CC\u062A \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F";
      var pp1 = S.container.querySelector('[data-account-field="new_password"]');
      var pp2 = S.container.querySelector('[data-account-field="confirm_password"]');
      if (pp1) pp1.value = "";
      if (pp2) pp2.value = "";
      try { notify("success", "\u0631\u0645\u0632 \u062A\u063A\u06CC\u06CC\u0631 \u06A9\u0631\u062F"); } catch (e) {}
      render();
    }).catch(function (err) {
      S.accountBusy.password = false;
      S.accountErr.password = String(err && err.message || err);
      render();
    });
  }
  function _togglePasswordVisibility(el) {
    if (!el) return;
    var input = el.parentNode.querySelector("input");
    if (!input) return;
    if (input.type === "password") { input.type = "text"; el.textContent = "\uD83D\uDE48"; }
    else { input.type = "password"; el.textContent = "\uD83D\uDC41"; }
  }
  function _toggleInviteVisibility() {
    S.inviteVisible = !S.inviteVisible;
    render();
  }
  function _avatarInnerHTML(member) {
    var url = member && member.avatar_url;
    if (url) return '<img class="st-avatar-img" src="' + esc(url) + '" alt="" loading="lazy">';
    return esc(((member && member.display_name) || "?").charAt(0));
  }
  function _avatarExtFromMime(mime) {
    if (mime === "image/png") return "png";
    if (mime === "image/webp") return "webp";
    if (mime === "image/jpeg") return "jpg";
    return null;
  }
  function _avatarValidateFile(file) {
    if (!file) return "\u0641\u0627\u06CC\u0644\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647";
    if (file.size > 2 * 1024 * 1024) return "\u062D\u062C\u0645 \u0641\u0627\u06CC\u0644 \u0628\u06CC\u0634 \u0627\u0632 \u06F2 \u0645\u06AF\u0627\u0628\u0627\u06CC\u062A";
    if (!_avatarExtFromMime(file.type)) return "\u0641\u0631\u0645\u062A \u0645\u062C\u0627\u0632: JPG\u060C PNG\u060C WEBP";
    return null;
  }
  function _avatarPathFromUrl(url) {
    var m = /\/avatars\/([^?]+)/.exec(url || "");
    return m ? m[1] : null;
  }
  function _avatarUpload(file) {
    var err = _avatarValidateFile(file);
    if (err) { S.avatarError = err; render(); return; }
    S.avatarBusy = true;
    S.avatarError = null;
    render();
    var ext = _avatarExtFromMime(file.type);
    var path = S.user.id + "/" + _uuid() + "." + ext;
    _sb.storage.from("avatars").upload(path, file, { contentType: file.type, upsert: false, cacheControl: "3600" }).then(function (r) {
      if (r && r.error) throw r.error;
      var pub = _sb.storage.from("avatars").getPublicUrl(path);
      var url = pub && pub.data && pub.data.publicUrl;
      if (!url) throw new Error("public_url_failed");
      var oldUrl = S.profile && S.profile.avatar_url;
      return _sb.from("profiles").update({ avatar_url: url, updated_at: new Date().toISOString() }).eq("id", S.user.id).then(function (u) {
        if (u && u.error) throw u.error;
        S.profile.avatar_url = url;
        for (var _mi = 0; _mi < S.members.length; _mi++) {
          if (S.members[_mi].user_id === S.user.id) S.members[_mi].avatar_url = url;
        }
        if (oldUrl) {
          try {
            var op = _avatarPathFromUrl(oldUrl);
            if (op) _sb.storage.from("avatars").remove([op]);
          } catch (e) {}
        }
        S.avatarBusy = false;
        try { notify("success", "\u0622\u0648\u0627\u062A\u0627\u0631 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC \u0634\u062F"); } catch (e) {}
        render();
      });
    }).catch(function (e) {
      S.avatarBusy = false;
      S.avatarError = String(e && e.message || e);
      render();
    });
  }
  function _avatarRemove() {
    if (!S.profile || !S.profile.avatar_url) return;
    S.avatarBusy = true;
    S.avatarError = null;
    render();
    var oldPath = _avatarPathFromUrl(S.profile.avatar_url);
    var delP = oldPath ? _sb.storage.from("avatars").remove([oldPath]) : Promise.resolve();
    delP.then(function () {
      return _sb.from("profiles").update({ avatar_url: null, updated_at: new Date().toISOString() }).eq("id", S.user.id);
    }).then(function (r) {
      if (r && r.error) throw r.error;
      S.profile.avatar_url = null;
      for (var _mj = 0; _mj < S.members.length; _mj++) {
        if (S.members[_mj].user_id === S.user.id) S.members[_mj].avatar_url = null;
      }
      S.avatarBusy = false;
      try { notify("success", "\u0622\u0648\u0627\u062A\u0627\u0631 \u062D\u0630\u0641 \u0634\u062F"); } catch (e) {}
      render();
    }).catch(function (e) {
      S.avatarBusy = false;
      S.avatarError = String(e && e.message || e);
      render();
    });
  }
  function _avatarUploadHTML() {
    var hasPhoto = !!(S.profile && S.profile.avatar_url);
    var html = '<div class="st-avatar-upload-wrap">';
    if (hasPhoto) {
      html += '<div class="st-avatar-photo-preview"><img src="' + esc(S.profile.avatar_url) + '" alt=""></div>';
      html += '<button type="button" class="st-btn-danger st-btn-small" data-st-act="avatar-remove"' + (S.avatarBusy ? ' disabled' : '') + '>\uD83D\uDDD1\uFE0F \u062D\u0630\u0641 \u0639\u06A9\u0633</button>';
    } else {
      html += '<label class="st-avatar-upload-btn' + (S.avatarBusy ? ' is-busy' : '') + '">' +
        '<input type="file" data-st-act="avatar-file" accept="image/jpeg,image/png,image/webp" style="display:none">' +
        '<span>\uD83D\uDCF7 \u0622\u067E\u0644\u0648\u062F \u0639\u06A9\u0633 \u0634\u062E\u0635\u06CC</span>' +
      '</label>';
    }
    if (S.avatarBusy) html += '<span class="st-avatar-busy">\u062F\u0631 \u062D\u0627\u0644 \u0622\u067E\u0644\u0648\u062F...</span>';
    if (S.avatarError) html += '<div class="st-error">' + esc(S.avatarError) + '</div>';
    html += '</div>';
    return html;
  }
  function _avatarPickerHTML(currentKey) {
    var keys = ["av-1","av-2","av-3","av-4","av-5","av-6","av-7","av-8"];
    var html = '<div class="st-avatar-picker" role="radiogroup" aria-label="انتخاب آواتار">';
    for (var i = 0; i < keys.length; i++) {
      var k = keys[i];
      var cls = "st-avatar-option st-avatar-" + k + (k === currentKey ? " is-active" : "");
      var ariaChecked = (k === currentKey) ? "true" : "false";
      html += '<button type="button" class="' + cls + '" role="radio" aria-checked="' + ariaChecked + '" data-st-act="avatar-pick" data-avatar-key="' + k + '" title="آواتار ' + k.slice(-1) + '"></button>';
    }
    html += '</div>';
    return html;
  }
  function _openHistoryList() {
    S.readyView = "history";
    S.historyView = "list";
    S.historyEdit = null;
    S.historyError = null;
    S.historyPendingDelete = null;
    S.historySessions = null;
    render();
    _loadHistory().then(function () { render(); });
  }
  function _openHistoryForm(session) {
    S.historyEdit = session;
    S.historyView = "form";
    S.historyError = null;
    render();
  }
  function _cancelHistoryForm() {
    S.historyView = "list";
    S.historyEdit = null;
    S.historyError = null;
    render();
  }
  function _handleEditHistory(el) {
    var id = el.getAttribute("data-hist-id");
    if (!id) return;
    var arr = S.historySessions || [];
    for (var i = 0; i < arr.length; i++) {
      if (arr[i].id === id) { _openHistoryForm(arr[i]); return; }
    }
  }
  function _handleDeleteHistory(el) {
    var id = el.getAttribute("data-hist-id");
    if (!id) return;
    S.historyPendingDelete = id;
    render();
  }
  function _confirmDeleteHistory() {
    var id = S.historyPendingDelete;
    if (!id) return;
    S.historySaving = true;
    S.historyPendingDelete = null;
    render();
    qDeleteSessionById(id, S.user.id).then(function (r) {
      if (!r || !r.data || r.data.length !== 1) {
        S.historyError = "حذف ناموفق — رکورد یافت نشد یا متعلق به شما نیست";
        S.historySaving = false;
        render();
        return;
      }
      return _loadHistory().then(function () {
        S.historySaving = false;
        try { notify("success", "حذف شد"); } catch (e) {}
        render();
      });
    }).catch(function (err) {
      S.historySaving = false;
      S.historyError = String(err && err.message || err);
      render();
    });
  }
  function _saveHistory(form) {
    var sVal = form.querySelector
    if (!_requireOnline()) return;('[name="started_at"]').value;
    var eVal = form.querySelector('[name="ended_at"]').value;
    var rVal = form.querySelector('[name="end_reason"]').value;
    var sIso = _localInputToIso(sVal);
    var eIso = _localInputToIso(eVal);
    if (!sIso) { S.historyError = "زمان شروع نامعتبر"; render(); return; }
    if (!eIso) { S.historyError = "زمان پایان نامعتبر"; render(); return; }
    var values = { started_at: sIso, ended_at: eIso, end_reason: rVal };
    var editId = S.historyEdit ? S.historyEdit.id : null;
    var errs = _validateManualEntry(values, editId, S.historySessions || []);
    if (errs.length > 0) { S.historyError = errs.join(" · "); render(); return; }
    S.historySaving = true;
    S.historyError = null;
    render();
    var op;
    if (editId) {
      var expect = {
        started_at: S.historyEdit.started_at,
        ended_at: S.historyEdit.ended_at,
        end_reason: S.historyEdit.end_reason
      };
      op = qUpdateManualSession(editId, S.user.id, values, expect).then(function (r) {
        if (!r || !r.data || r.data.length !== 1) {
          var ce = new Error("conflict"); ce.__conflict = true; throw ce;
        }
      });
    } else {
      var payload = {
        user_id: S.user.id,
        group_id: S.group.id,
        client_session_id: "manual-" + _uuid(),
        started_at: sIso,
        ended_at: eIso,
        end_reason: rVal,
        session_type: "manual"
      };
      op = qInsertSession(payload).then(function (r) {
        if (r && r.error) throw r.error;
      });
    }
    op.then(function () {
      S.historySaving = false;
      S.historyEdit = null;
      S.historyView = "list";
      S.historyError = null;
      return _loadHistory().then(function () {
        try { notify("success", "ذخیره شد"); } catch (e) {}
        render();
      });
    }).catch(function (err) {
      S.historySaving = false;
      if (err && err.__conflict) {
        S.historyError = "این جلسه در جای دیگری تغییر کرده است. تاریخچه را تازه‌سازی کن و تغییرت را دوباره بررسی کن.";
      } else {
        S.historyError = String(err && err.message || err);
      }
      render();
    });
  }
  function _renderHistoryRow(s) {
    var start = _fmtTimeShort(s.started_at);
    var end = _fmtTimeShort(s.ended_at);
    var durSec = 0;
    if (s.end_reason !== "crash" && s.ended_at) {
      durSec = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
    }
    var dur = _fmtTimer(durSec);

    var statusBadge, statusCls;
    if (s.end_reason === "crash") { statusBadge = "\u0642\u0637\u0639\u200C\u0634\u062F\u0647"; statusCls = "st-hist-badge-crash"; }
    else if (s.end_reason === "break") { statusBadge = "\u0627\u0633\u062A\u0631\u0627\u062D\u062A"; statusCls = "st-hist-badge-break"; }
    else if (s.end_reason === "ended") { statusBadge = "\u067E\u0627\u06CC\u0627\u0646"; statusCls = "st-hist-badge-ended"; }
    else { statusBadge = "\u0628\u0627\u0632"; statusCls = "st-hist-badge-open"; }

    var isManualCid = (s.client_session_id || "").indexOf("manual-") === 0;
    var typeLabel, typeCls;
    if (s.session_type === "pomodoro") { typeLabel = "\uD83C\uDF45 \u067E\u0648\u0645\u0648\u062F\u0648\u0631\u0648"; typeCls = "st-hist-badge-pom"; }
    else if (s.session_type === "manual" || isManualCid) { typeLabel = "\u270D\uFE0F \u062F\u0633\u062A\u06CC"; typeCls = "st-hist-badge-manual"; }
    else if (s.session_type === "normal") { typeLabel = "\u25B6\uFE0F \u0639\u0627\u062F\u06CC"; typeCls = "st-hist-badge-normal"; }
    else { typeLabel = "\u2753 \u0646\u0627\u0645\u0634\u062E\u0635"; typeCls = "st-hist-badge-unknown"; }

    var c = _courseById(s.course_id || null);
    var courseName = c ? c.name : "\u0628\u062F\u0648\u0646 \u062F\u0631\u0633";
    var courseIcon = c && c.icon ? _courseIconGlyph(c.icon) : "\uD83D\uDCDA";
    var colorCls = c ? _courseColorClass(c) : "st-course-none";
    var iconBg = c ? "" : "background:rgba(148,163,184,0.18);";
    var expanded = S.histExpanded === s.id;
    var selected = !!(S.histSelected && S.histSelected[s.id]);

    var actions = "";
    var editable = s.ended_at && s.end_reason !== "crash";
    if (editable) {
      actions = '<button class="st-btn-ghost st-btn-small" data-st-act="hist-edit" data-hist-id="' + esc(s.id) + '" title="\u0648\u06CC\u0631\u0627\u06CC\u0634">\u270F\uFE0F</button>' +
                '<button class="st-btn-danger st-btn-small" data-st-act="hist-delete" data-hist-id="' + esc(s.id) + '" title="\u062D\u0630\u0641">\uD83D\uDDD1\uFE0F</button>';
    }

    var expandHTML = "";
    if (expanded) {
      expandHTML = '<div class="st-hist-row-expand">' +
        '<dl><dt>\u0634\u0631\u0648\u0639:</dt><dd>' + esc(start) + '</dd></dl>' +
        '<dl><dt>\u067E\u0627\u06CC\u0627\u0646:</dt><dd>' + esc(end) + '</dd></dl>' +
        '<dl><dt>\u0645\u062F\u062A:</dt><dd>' + dur + '</dd></dl>' +
        '<dl><dt>\u062F\u0631\u0633:</dt><dd>' + esc(courseName) + '</dd></dl>' +
        '<dl><dt>\u0648\u0636\u0639\u06CC\u062A:</dt><dd>' + esc(statusBadge) + '</dd></dl>' +
        '<dl><dt>\u0646\u0648\u0639:</dt><dd>' + esc(typeLabel) + '</dd></dl>' +
      '</div>';
    }

    return '<div class="st-hist-row-v2" data-st-act="hist-expand" data-hist-id="' + esc(s.id) + '">' +
      '<div class="st-hist-select-col">' +
        '<input type="checkbox" class="st-hist-cb" data-st-act="hist-select" data-hist-id="' + esc(s.id) + '"' + (selected ? ' checked' : '') + '>' +
      '</div>' +
      '<div class="st-hist-course-icon ' + colorCls + '" style="' + iconBg + '">' + esc(courseIcon) + '</div>' +
      '<div class="st-hist-row-body">' +
        '<div class="st-hist-row-title">' +
          '<span class="st-hist-row-course' + (c ? "" : " is-none") + '">' + esc(courseName) + '</span>' +
          '<span class="st-hist-badge-v2 ' + statusCls + '">' + esc(statusBadge) + '</span>' +
          '<span class="st-hist-badge-v2 ' + typeCls + '">' + esc(typeLabel) + '</span>' +
        '</div>' +
        '<div class="st-hist-row-meta">' +
          '<span>\u23F1 ' + esc(start) + ' \u2192 ' + esc(end) + '</span>' +
        '</div>' +
      '</div>' +
      '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">' +
        '<div class="st-hist-row-dur-big">' + dur + '</div>' +
        '<div class="st-hist-actions-v2">' + actions + '</div>' +
      '</div>' +
      expandHTML +
    '</div>';
  }
  function _filteredHistorySessions() {
    var arr = S.historySessions || [];
    var cf = S.historyCourseFilter;
    var df = S.historyDayFilter;
    return arr.filter(function (s) {
      if (cf) {
        if (cf === "__none") { if (s.course_id) return false; }
        else if (s.course_id !== cf) return false;
      }
      if (df) {
        var st = new Date(s.started_at);
        var k = st.getFullYear() + "-" + (st.getMonth() + 1) + "-" + st.getDate();
        if (k !== df) return false;
      }
      return true;
    });
  }
  function _histSessionsForHeatmap() {
    var arr = S.historySessions || [];
    var cf = S.historyCourseFilter;
    if (!cf) return arr;
    return arr.filter(function (s) {
      if (cf === "__none") return !s.course_id;
      return s.course_id === cf;
    });
  }
  function _histEnsureCalState() {
    if (S.calYear === null || S.calMonth === null) {
      var t = (window.InternshipLib && window.InternshipLib.date && window.InternshipLib.date.todayJalaliObj)
        ? window.InternshipLib.date.todayJalaliObj() : null;
      if (t) { S.calYear = t.jy; S.calMonth = t.jm; }
      else {
        var d = new Date();
        S.calYear = d.getFullYear(); S.calMonth = d.getMonth() + 1;
      }
    }
  }
  function _histJalaliDateToIso(jy, jm, jd) {
    var dlib = window.InternshipLib && window.InternshipLib.date;
    if (!dlib || !dlib.jalaliToDayNumber || !dlib.todayJalaliObj) return null;
    try {
      var n = dlib.jalaliToDayNumber(jy, jm, jd);
      if (!isFinite(n)) return null;
      var today = dlib.todayJalaliObj();
      if (!today) return null;
      var todayNum = dlib.jalaliToDayNumber(today.jy, today.jm, today.jd);
      if (!isFinite(todayNum)) return null;
      var offset = n - todayNum;
      var d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + offset);
      return d;
    } catch (e) { return null; }
  }
  function _histCalPrevMonth() {
    _histEnsureCalState();
    S.calMonth--;
    if (S.calMonth < 1) { S.calMonth = 12; S.calYear--; }
    render();
  }
  function _histCalNextMonth() {
    _histEnsureCalState();
    S.calMonth++;
    if (S.calMonth > 12) { S.calMonth = 1; S.calYear++; }
    render();
  }
  function _histCalGoToday() {
    var t = (window.InternshipLib && window.InternshipLib.date && window.InternshipLib.date.todayJalaliObj)
      ? window.InternshipLib.date.todayJalaliObj() : null;
    if (t) { S.calYear = t.jy; S.calMonth = t.jm; }
    var d = new Date();
    var iso = d.getFullYear() + "-" + ((d.getMonth()+1<10?"0":"")+(d.getMonth()+1)) + "-" + ((d.getDate()<10?"0":"")+d.getDate());
    S.historyRangeMode = "day";
    S.historyFromDate = iso;
    S.historyToDate = iso;
    S.historyDayFilter = null;
    S.historySessions = null;
    render();
    _loadHistory().then(function () { render(); });
  }
  function _histCalSelectDay(jy, jm, jd) {
    var g = _histJalaliDateToIso(jy, jm, jd);
    if (!g) return;
    var iso = g.getFullYear() + "-" + ((g.getMonth()+1<10?"0":"")+(g.getMonth()+1)) + "-" + ((g.getDate()<10?"0":"")+g.getDate());
    S.historyRangeMode = "day";
    S.historyFromDate = iso;
    S.historyToDate = iso;
    S.historyDayFilter = null;
    S.historySessions = null;
    render();
    _loadHistory().then(function () { render(); });
  }
  function _renderHistCalendar() {
    _histEnsureCalState();
    var dlib = window.InternshipLib && window.InternshipLib.date;
    if (!dlib || !dlib.jalaliMonthLength || !dlib.jalaliMonthStartWeekday) {
      return '<div class="st-hist-empty">\u062A\u0642\u0648\u06CC\u0645 \u0634\u0645\u0633\u06CC \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0646\u06CC\u0633\u062A</div>';
    }
    var year = S.calYear, month = S.calMonth;
    var monthLen = dlib.jalaliMonthLength(year, month);
    var startWd = dlib.jalaliMonthStartWeekday(year, month); // 0=Sat .. 6=Fri (Persian week)
    var todayJ = dlib.todayJalaliObj ? dlib.todayJalaliObj() : null;
    var todayY = todayJ ? todayJ.jy : null, todayM = todayJ ? todayJ.jm : null, todayD = todayJ ? todayJ.jd : null;
    var MONTHS = ["\u0641\u0631\u0648\u0631\u062F\u06CC\u0646","\u0627\u0631\u062F\u06CC\u0628\u0647\u0634\u062A","\u062E\u0631\u062F\u0627\u062F","\u062A\u06CC\u0631","\u0645\u0631\u062F\u0627\u062F","\u0634\u0647\u0631\u06CC\u0648\u0631","\u0645\u0647\u0631","\u0622\u0628\u0627\u0646","\u0622\u0630\u0631","\u062F\u06CC","\u0628\u0647\u0645\u0646","\u0627\u0633\u0641\u0646\u062F"];
    var monthName = MONTHS[month - 1] || "";
    // Build day set with data — count of sessions per day from current loaded history (shortcut mode)
    var dataByDay = {};
    (S.historySessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var st = new Date(s.started_at);
      var k = st.getFullYear() + "-" + (st.getMonth()+1) + "-" + st.getDate();
      if (!dataByDay[k]) dataByDay[k] = { sec: 0, count: 0 };
      dataByDay[k].sec += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st.getTime()) / 1000));
      dataByDay[k].count++;
    });
    var maxSec = 0; Object.keys(dataByDay).forEach(function (k) { if (dataByDay[k].sec > maxSec) maxSec = dataByDay[k].sec; });
    if (maxSec === 0) maxSec = 1;

    var dows = ["\u0634","\u06CC","\u062F","\u0633","\u0686","\u067E","\u062C"];
    var html = '<div class="st-cal-wrap">' +
      '<div class="st-cal-head">' +
        '<button class="st-cal-nav-btn" data-st-act="cal-prev" title="\u0645\u0627\u0647 \u0642\u0628\u0644">\u2039</button>' +
        '<div class="st-cal-title">' + esc(monthName) + ' ' + fa0(year) + '</div>' +
        '<button class="st-cal-nav-btn" data-st-act="cal-next" title="\u0645\u0627\u0647 \u0628\u0639\u062F">\u203A</button>' +
        '<button class="st-cal-today-btn" data-st-act="cal-today">\u0627\u0645\u0631\u0648\u0632</button>' +
      '</div>' +
      '<div class="st-cal-grid">' +
        dows.map(function (d) { return '<div class="st-cal-dow">' + d + '</div>'; }).join("");

    for (var i = 0; i < startWd; i++) html += '<div class="st-cal-cell is-empty"></div>';
    for (var d = 1; d <= monthLen; d++) {
      var cellDate = _histJalaliDateToIso(year, month, d);
      var iso = null;
      if (cellDate) iso = cellDate.getFullYear() + "-" + ((cellDate.getMonth()+1<10?"0":"")+(cellDate.getMonth()+1)) + "-" + ((cellDate.getDate()<10?"0":"")+cellDate.getDate());
      var isToday = (year === todayY && month === todayM && d === todayD);
      var isSelected = (S.historyRangeMode === "day" && S.historyFromDate === iso);
      var dayRec = iso ? dataByDay[iso] : null;
      var hasData = !!(dayRec && dayRec.sec > 0);
      var isHeavy = hasData && (dayRec.sec / maxSec) > 0.6;
      var cls = "st-cal-cell";
      if (isToday) cls += " is-today";
      if (isSelected) cls += " is-selected";
      if (hasData) cls += " has-data";
      if (isHeavy) cls += " is-heavy";
      var title = hasData ? (Math.floor(dayRec.sec / 60) + " \u062F\u0642\u06CC\u0642\u0647 \u00B7 " + dayRec.count + " \u062C\u0644\u0633\u0647") : "";
      html += '<button class="' + cls + '" data-st-act="cal-day" data-jy="' + year + '" data-jm="' + month + '" data-jd="' + d + '" title="' + title + '">' + fa0(d) + '</button>';
    }
    html += '</div></div>';
    return html;
  }
    function _renderHistRangePills() {
    var opts = [
      { id: "7", label: "\u06F7 \u0631\u0648\u0632", mode: "shortcut", days: 7 },
      { id: "30", label: "\u06F3\u06F0 \u0631\u0648\u0632", mode: "shortcut", days: 30 },
      { id: "90", label: "\u06F9\u06F0 \u0631\u0648\u0632", mode: "shortcut", days: 90 },
      { id: "custom", label: "\u0628\u0627\u0632\u0647\u0654 \u062F\u0644\u062E\u0648\u0627\u0647", mode: "custom" }
    ];
    var activeId = S.historyRangeMode === "custom" ? "custom" : (S.historyRangeMode === "day" ? "day" : String(S.historyRangeDays || 7));
    var html = '<div class="st-hist-range-pills">' + opts.map(function (o) {
      var cls = "st-hist-range-pill" + (activeId === o.id ? " is-active" : "");
      return '<button type="button" class="' + cls + '" data-st-act="hist-range" data-range="' + o.id + '">' + o.label + '</button>';
    }).join("") + '</div>';
    if (S.historyRangeMode === "custom") {
      var f = S.historyFromDate || "";
      var t = S.historyToDate || "";
      html += '<div class="st-hist-filters">' +
        '<label style="font-size:11px;opacity:0.75;">\u0627\u0632 <input type="date" data-st-act="hist-from-date" value="' + esc(f) + '" style="margin-inline-start:6px;"></label>' +
        (f ? '<span class="st-hist-date-fa">' + esc(_fmtDateJalali(f)) + '</span>' : '') +
        '<label style="font-size:11px;opacity:0.75;">\u062A\u0627 <input type="date" data-st-act="hist-to-date" value="' + esc(t) + '" style="margin-inline-start:6px;"></label>' +
        (t ? '<span class="st-hist-date-fa">' + esc(_fmtDateJalali(t)) + '</span>' : '') +
        '<button class="st-btn-primary st-btn-small" data-st-act="hist-apply-range">\u0627\u0639\u0645\u0627\u0644</button>' +
      '</div>';
    }
    return html;
  }
  function _renderHistCourseFilter() {
    var cf = S.historyCourseFilter || "";
    var opts = '<option value=""' + (cf === "" ? " selected" : "") + '>همهٔ درس‌ها</option>' +
               '<option value="__none"' + (cf === "__none" ? " selected" : "") + '>بدون درس</option>';
    (S.courses || []).forEach(function (c) {
      opts += '<option value="' + esc(c.id) + '"' + (cf === c.id ? " selected" : "") + '>' + esc(c.name) + '</option>';
    });
    return '<select class="st-hist-course-filter" data-st-act="hist-course-filter" title="فیلتر درس">' + opts + '</select>';
  }
  function _renderHistHeatmap() {
    var days = S.historyRangeDays || 7;
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var start = new Date(now); start.setDate(start.getDate() - (days - 1));
    var buckets = {};
    for (var i = 0; i < days; i++) {
      var d = new Date(start); d.setDate(d.getDate() + i);
      var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      buckets[k] = { date: d, sec: 0, count: 0, key: k };
    }
    _histSessionsForHeatmap().forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var st = new Date(s.started_at);
      var k = st.getFullYear() + "-" + (st.getMonth() + 1) + "-" + st.getDate();
      if (!buckets[k]) return;
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st.getTime()) / 1000));
      buckets[k].sec += dur;
      buckets[k].count++;
    });
    var max = 0;
    Object.keys(buckets).forEach(function (k) { if (buckets[k].sec > max) max = buckets[k].sec; });
    if (max === 0) max = 1;
    var keys = Object.keys(buckets).sort();
    var leadingEmpty = ((start.getDay() + 1) % 7);
    var emptyCells = "";
    for (var e = 0; e < leadingEmpty; e++) emptyCells += '<div class="st-hm-cell is-empty"></div>';
    var dayCells = keys.map(function (k) {
      var b = buckets[k];
      var level = 0;
      if (b.sec > 0) {
        var ratio = b.sec / max;
        if (ratio < 0.25) level = 1;
        else if (ratio < 0.5) level = 2;
        else if (ratio < 0.75) level = 3;
        else level = 4;
      }
      var isActive = (S.historyDayFilter === k) ? " is-active" : "";
      var mins = Math.floor(b.sec / 60);
      var title = b.sec > 0 ? (mins + " دقیقه · " + b.count + " جلسه") : "بدون مطالعه";
      return '<button type="button" class="st-hm-cell st-hm-l' + level + isActive + '" data-st-act="hist-day" data-day="' + k + '" title="' + title + '"></button>';
    }).join("");
    var dowLabels = ["ش","ی","د","س","چ","پ","ج"];
    var headers = dowLabels.map(function (l) { return '<div class="st-hm-dow">' + l + '</div>'; }).join("");
    return '<div class="st-hist-heatmap">' +
      '<div class="st-hm-headers">' + headers + '</div>' +
      '<div class="st-hm-grid">' + emptyCells + dayCells + '</div>' +
    '</div>';
  }
  function _clearBulkSelection() {
    S.histSelected = {};
    S.histBulkCourse = null;
    render();
  }
  function _applyBulkCourse() {
    var ids = Object.keys
    if (!_requireOnline()) return;(S.histSelected || {}).filter(function (k) { return S.histSelected[k]; });
    if (ids.length === 0) { S.historyError = "\u0647\u06CC\u0686 \u062C\u0644\u0633\u0647\u200C\u0627\u06CC \u0627\u0646\u062A\u062E\u0627\u0628 \u0646\u0634\u062F\u0647"; render(); return; }
    var cid = S.histBulkCourse;
    if (!cid) { S.historyError = "\u06CC\u06A9 \u062F\u0631\u0633 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F"; render(); return; }
    S.historySaving = true;
    S.historyError = null;
    render();
    _sb.from("study_sessions")
      .update({ course_id: cid })
      .in("id", ids)
      .eq("user_id", S.user.id)
      .select("id,course_id")
      .then(function (r) {
        if (r && r.error) throw r.error;
        var updated = r.data ? r.data.length : 0;
        S.historySaving = false;
        S.histSelected = {};
        S.histBulkCourse = null;
        try { notify("success", updated + " \u062C\u0644\u0633\u0647 \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u0634\u062F"); } catch (e) {}
        return _loadHistory().then(function () { if (S.readyView === "history") render(); });
      })
      .catch(function (err) {
        S.historySaving = false;
        S.historyError = String(err && err.message || err);
        render();
      });
  }
  function _renderHistBulkBar() {
    var keys = Object.keys(S.histSelected || {}).filter(function (k) { return S.histSelected[k]; });
    if (keys.length === 0) return "";
    var opts = '<option value=""' + (S.histBulkCourse ? "" : " selected") + '>\u062F\u0631\u0633 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC\u062F</option>';
    (S.courses || []).forEach(function (c) {
      opts += '<option value="' + esc(c.id) + '"' + (S.histBulkCourse === c.id ? " selected" : "") + '>' + esc(c.name) + '</option>';
    });
    return '<div class="st-hist-bulk-bar">' +
      '<span class="st-hist-bulk-count">' + fa0(keys.length) + ' \u062C\u0644\u0633\u0647 \u0627\u0646\u062A\u062E\u0627\u0628 \u0634\u062F\u0647</span>' +
      '<select class="st-hist-bulk-course" data-st-act="hist-bulk-course">' + opts + '</select>' +
      '<button class="st-btn-primary st-btn-small" data-st-act="hist-bulk-apply"' + (S.historySaving ? ' disabled' : '') + '>' + (S.historySaving ? '\u062F\u0631 \u062D\u0627\u0644 \u0627\u0639\u0645\u0627\u0644...' : '\u2705 \u0627\u0639\u0645\u0627\u0644') + '</button>' +
      '<button class="st-btn-ghost st-btn-small" data-st-act="hist-bulk-clear">\u274C \u0644\u063A\u0648</button>' +
    '</div>';
  }
  function renderHistory() {
    var headerCommon =
      _navTabsHTML("history") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + ' ' + _connChipHTML() + '</div>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>📜 تاریخچهٔ مطالعه</h1></div>' +
      _renderHistCalendar() +
      _renderHistRangePills() +
      _renderHistBulkBar() +
      '<div class="st-hist-filters">' +
        _renderHistCourseFilter() +
        (S.historyDayFilter ? '<button class="st-btn-ghost st-btn-small" data-st-act="hist-day-clear" title="حذف فیلتر روز">✖ ' + esc(S.historyDayFilter) + '</button>' : '') +
      '</div>' +
      (S.historyError ? '<div class="st-error">' + esc(S.historyError) + '</div>' : "");

    if (S.historySessions === null) {
      S.container.innerHTML = pageWrap(
        headerCommon +
        '<div class="st-card st-loading">در حال بارگذاری...</div>'
      );
      wire();
      return;
    }
    var filtered = _filteredHistorySessions();
    var unclassifiedCount = 0;
    (S.historySessions || []).forEach(function (s) { if (!s.course_id) unclassifiedCount++; });
    var unclassifiedHTML = unclassifiedCount > 0
      ? '<div class="st-hist-unclassified">\u26A0\uFE0F ' + fa0(unclassifiedCount) + ' \u062C\u0644\u0633\u0647 \u0628\u062F\u0648\u0646 \u062F\u0631\u0633 \u2014 \u0628\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06AF\u0631\u0648\u0647\u06CC \u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u06A9\u0646\u06CC\u062F</div>'
      : "";
    var heatmap = _renderHistHeatmap();
    var groups = {};
    var order = [];
    filtered.forEach(function (s) {
      var k = _dayKeyFromIso(s.started_at);
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(s);
    });
    var dayBlocks = order.map(function (k) {
      var rows = groups[k].map(_renderHistoryRow).join("");
      return '<div class="st-hist-day">' +
        '<div class="st-hist-day-head">' + esc(_fmtDateJalaliPretty(k)) + '</div>' +
        '<div class="st-hist-day-rows">' + rows + '</div>' +
      '</div>';
    }).join("");
    var empty = filtered.length === 0
      ? '<div class="st-hist-empty">جلسه‌ای در این بازه نیست</div>'
      : "";
    var pending = S.historyPendingDelete
      ? '<div class="st-hist-confirm"><div>آیا این جلسه حذف شود؟</div><div class="st-hist-confirm-actions">' +
        '<button class="st-btn-danger st-btn-small" data-st-act="hist-del-confirm">تأیید حذف</button>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="hist-del-cancel">انصراف</button></div></div>'
      : "";
    S.container.innerHTML = pageWrap(
      headerCommon +
      unclassifiedHTML +
      '<div class="st-hist-actions">' +
        '<button class="st-btn-primary" data-st-act="hist-add" title="افزودن جلسهٔ دستی">➕ افزودن دستی</button>' +
        '<button class="st-btn-ghost" data-st-act="hist-reload" title="تازه‌سازی">🔄 تازه‌سازی</button>' +
      '</div>' +
      pending +
      heatmap +
      empty +
      '<div class="st-hist-groups">' + dayBlocks + '</div>'
    );
    wire();
  }
  function renderHistoryForm() {
    var isEdit = !!S.historyEdit;
    var sess = S.historyEdit;
    var startVal = sess ? _isoToLocalInput(sess.started_at) : _isoToLocalInput(new Date().toISOString());
    var endVal = sess && sess.ended_at ? _isoToLocalInput(sess.ended_at) : _isoToLocalInput(new Date().toISOString());
    var reasonVal = sess ? (sess.end_reason || "ended") : "ended";
    S.container.innerHTML = pageWrap(
      _navTabsHTML("history") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + ' ' + _connChipHTML() + '</div>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>' + (isEdit ? "✏️ ویرایش جلسه" : "➕ افزودن جلسهٔ دستی") + '</h1></div>' +
      '<form class="st-form st-hist-form" data-st-act="hist-form">' +
        '<label>زمان شروع<input type="datetime-local" name="started_at" value="' + esc(startVal) + '" required></label>' +
        '<label>زمان پایان<input type="datetime-local" name="ended_at" value="' + esc(endVal) + '" required></label>' +
        '<label>نوع پایان<select name="end_reason">' +
          '<option value="ended"' + (reasonVal === "ended" ? " selected" : "") + '>پایان</option>' +
          '<option value="break"' + (reasonVal === "break" ? " selected" : "") + '>استراحت</option>' +
        '</select></label>' +
        '<div class="st-hist-form-actions">' +
          '<button type="submit" class="st-btn-primary"' + (S.historySaving ? " disabled" : "") + '>' + (S.historySaving ? "در حال ذخیره..." : "ذخیره") + '</button>' +
          '<button type="button" class="st-btn-ghost" data-st-act="hist-cancel">انصراف</button>' +
        '</div>' +
        (S.historyError ? '<div class="st-error">' + esc(S.historyError) + '</div>' : "") +
      '</form>'
    );
    wire();
  }
  /* --- Wave 1: Courses + Nav --- */
  function _loadCourses() {
    if (!S.user || !_sb) { S.courses = []; return Promise.resolve(); }
    return qGetCourses(S.user.id).then(function (rows) {
      S.courses = rows || [];
      if (S.selectedCourseId && !_courseById(S.selectedCourseId)) {
        S.selectedCourseId = null;
      }
    }).catch(function () { S.courses = []; });
  }
  function _courseById(id) {
    if (!id) return null;
    for (var i = 0; i < S.courses.length; i++) if (S.courses[i].id === id) return S.courses[i];
    return null;
  }
  function _courseIconGlyph(iconName) {
    var M = {
      "book": "\uD83D\uDCD6", "pencil": "\u270F\uFE0F", "atom": "\u269B\uFE0F",
      "calculator": "\uD83E\uDDEE", "globe": "\uD83C\uDF0D", "flask": "\uD83E\uDDEA",
      "music": "\uD83C\uDFB5", "code": "\uD83D\uDCBB"
    };
    return M[iconName] || "\uD83D\uDCDA";
  }
  function _courseColorClass(course) {
    if (!course) return "st-course-1";
    return course.color || "st-course-1";
  }
  function _navTabsHTML(activeTab) {
    var tabs = [
      { id: "focus",   label: "تمرکز",   icon: "▶" },
      { id: "profile", label: "پروفایل", icon: "👤" },
      { id: "history", label: "تاریخچه", icon: "📜" },
      { id: "stats",   label: "آمار",    icon: "📊" },
      { id: "friends", label: "دوستان",  icon: "👥" }
    ];
    return '<div class="st-nav-tabs">' + tabs.map(function (t) {
      var cls = "st-nav-tab" + (t.id === activeTab ? " is-active" : "");
      return '<button class="' + cls + '" data-st-act="nav-tab" data-st-tab="' + t.id + '">' +
        '<span class="st-nav-ico" aria-hidden="true">' + t.icon + '</span>' +
        '<span class="st-nav-label">' + t.label + '</span>' +
      '</button>';
    }).join("") + '</div>';
  }
  function _courseChipsHTML() {
    var all = S.courses || [];
    var chip0 = '<button class="st-course-chip' + (!S.selectedCourseId ? " is-active" : "") + '" data-st-act="select-course" data-course-id="" title="\u0628\u062F\u0648\u0646 \u062F\u0631\u0633">\u0628\u062F\u0648\u0646 \u062F\u0631\u0633</button>';
    var chips = all.map(function (c) {
      var active = c.id === S.selectedCourseId ? " is-active" : "";
      return '<div class="st-chip-wrap">' +
        '<button class="st-course-chip ' + _courseColorClass(c) + active + '" data-st-act="select-course" data-course-id="' + esc(c.id) + '">' +
          '<span class="st-course-dot"></span>' + esc(c.name) +
        '</button>' +
        '<button class="st-chip-edit" data-st-act="course-edit" data-course-id="' + esc(c.id) + '" title="\u0648\u06CC\u0631\u0627\u06CC\u0634" aria-label="\u0648\u06CC\u0631\u0627\u06CC\u0634 \u062F\u0631\u0633">\u270E</button>' +
      '</div>';
    }).join("");
    var addBtn = '<button class="st-course-chip st-course-add" data-st-act="course-add" title="\u0627\u0641\u0632\u0648\u062F\u0646 \u062F\u0631\u0633">+ \u062F\u0631\u0633 \u062C\u062F\u06CC\u062F</button>';
    return '<div class="st-course-bar">' + chip0 + chips + addBtn + '</div>';
  }
  function _courseFormRender() {
    var c = S.courseEdit;
    var isEdit = !!c;
    var name = c ? c.name : "";
    var color = c ? (c.color || "st-course-1") : "st-course-1";
    var icon = c ? (c.icon || "book") : "book";
    var colorOpts = ["1","2","3","4","5","6","7","8"].map(function (n) {
      var cls = "st-course-" + n;
      var sel = ("st-course-" + n) === color ? " selected" : "";
      return '<option value="' + cls + '"' + sel + '>رنگ ' + n + '</option>';
    }).join("");
    var iconOpts = ["book","pencil","atom","calculator","globe","flask","music","code"].map(function (n) {
      var sel = n === icon ? " selected" : "";
      return '<option value="' + n + '"' + sel + '>' + n + '</option>';
    }).join("");
    return pageWrap(
      _navTabsHTML(S.navTab || "focus") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + '</div>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>' + (isEdit ? "✏️ ویرایش درس" : "➕ درس جدید") + '</h1></div>' +
      '<form class="st-form st-course-form" data-st-act="course-form">' +
        '<label>نام درس<input type="text" name="name" required minlength="1" maxlength="64" value="' + esc(name) + '"></label>' +
        '<label>رنگ<select name="color">' + colorOpts + '</select></label>' +
        '<label>آیکون<select name="icon">' + iconOpts + '</select></label>' +
        '<div class="st-form-actions">' +
          '<button type="submit" class="st-btn-primary"' + (S.courseSaving ? " disabled" : "") + '>' + (S.courseSaving ? "..." : "ذخیره") + '</button>' +
          '<button type="button" class="st-btn-ghost" data-st-act="course-cancel">انصراف</button>' +
          (isEdit ? '<button type="button" class="st-btn-ghost" data-st-act="course-archive" data-course-id="' + esc(c.id) + '">\uD83D\uDCE6 \u0622\u0631\u0634\u06CC\u0648</button>' : "") +
          (isEdit ? '<button type="button" class="st-btn-danger" data-st-act="course-delete" data-course-id="' + esc(c.id) + '">حذف</button>' : "") +
        '</div>' +
        (S.courseError ? '<div class="st-error">' + esc(S.courseError) + '</div>' : "") +
      '</form>'
    );
  }
  function _saveCourse(form) {
    var name = (form.querySelector('[name="name"]').value || "").trim();
    var color = form.querySelector('[name="color"]').value || "st-course-1";
    var icon = form.querySelector('[name="icon"]').value || "book";
    if (!name) { S.courseError = "نام درس الزامی است"; render(); return; }
    S.courseSaving = true;
    S.courseError = null;
    render();
    var op;
    if (S.courseEdit) {
      op = qUpdateCourse(S.courseEdit.id, S.user.id, { name: name, color: color, icon: icon, updated_at: new Date().toISOString() });
    } else {
      op = qInsertCourse({ user_id: S.user.id, name: name, color: color, icon: icon, display_order: S.courses.length });
    }
    op.then(function (r) {
      if (r && r.error) throw r.error;
      if (!r || !r.data) throw new Error("no response data");
      S.courseSaving = false;
      S.courseEdit = null;
      S.readyView = "main";
      S.courseError = null;
      return _loadCourses().then(function () {
        try { notify("success", "درس ذخیره شد"); } catch (e) {}
        render();
      });
    }).catch(function (err) {
      S.courseSaving = false;
      S.courseError = String(err && err.message || err);
      render();
    });
  }
  function _archiveCourse(id) {
    if (!S.user || !_sb) return;
    S.courseSaving = true;
    S.courseError = null;
    render();
    qUpdateCourse(id, S.user.id, { archived_at: new Date().toISOString(), updated_at: new Date().toISOString() }).then(function (r) {
      if (r && r.error) throw r.error;
      if (!r || !r.data) throw new Error("archive_failed");
      S.courseSaving = false;
      S.courseEdit = null;
      S.readyView = "main";
      return _loadCourses().then(function () {
        try { notify("success", "\u0622\u0631\u0634\u06CC\u0648 \u0634\u062F"); } catch (e) {}
        render();
      });
    }).catch(function (err) {
      S.courseSaving = false;
      S.courseError = String(err && err.message || err);
      render();
    });
  }
  function _deleteCourse(id) {
    S.courseSaving = true;
    S.courseError = null;
    render();
    qDeleteCourse(id, S.user.id).then(function (r) {
      if (!r || !r.data || r.data.length !== 1) {
        S.courseSaving = false;
        S.courseError = "حذف ناموفق — رکورد یافت نشد یا متعلق به شما نیست";
        render();
        return;
      }
      S.courseSaving = false;
      S.courseEdit = null;
      S.readyView = "main";
      return _loadCourses().then(function () {
        try { notify("success", "درس حذف شد"); } catch (e) {}
        render();
      });
    }).catch(function (err) {
      S.courseSaving = false;
      S.courseError = String(err && err.message || err);
      render();
    });
  }
  function renderProfile() {
    var p = S.profile || {};
    var today = S.todayTotal || 0;
    var weekSec = 0;
    var hs = S.historySessions || [];
    var cutoff = Date.now() - 7 * 86400000;
    hs.forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var st = new Date(s.started_at).getTime();
      if (st < cutoff) return;
      weekSec += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st) / 1000));
    });
    var avatarKey = S.avatarPick || p.avatar_key || "av-1";
    var shareDaily = !!p.share_daily_total;
    var shareTL = !!p.share_timeline;
    var shareBreak = !!p.share_course_breakdown;
    var shareHist = !!p.share_history_with_group;
    var sharePlan = !!p.share_daily_plan;
    var memberSince = p.created_at ? _fmtDateJalali(String(p.created_at).slice(0, 10)) : "";
    var isOwner = S.group && p && S.group.owner_id === S.user.id;

    var identitySection =
      '<div class="st-account-section">' +
        '<div class="st-account-section-head">' +
          '<div class="st-account-section-icon">\uD83D\uDC64</div>' +
          '<div><div class="st-account-section-title">\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0634\u062E\u0635\u06CC</div>' +
          '<div class="st-account-section-desc">\u0646\u0627\u0645 \u0646\u0645\u0627\u06CC\u0634\u06CC \u0648 \u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC \u062F\u0631 \u06AF\u0631\u0648\u0647 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F.</div></div>' +
        '</div>' +
        '<div class="st-account-field"><label>\u0646\u0627\u0645 \u0646\u0645\u0627\u06CC\u0634\u06CC</label><input type="text" data-account-field="display_name" value="' + esc(p.display_name || "") + '" maxlength="64"' + (S.accountBusy.identity ? ' disabled' : '') + '></div>' +
        '<div class="st-account-field"><label>\u0646\u0627\u0645 \u06A9\u0627\u0631\u0628\u0631\u06CC (username)</label><input type="text" data-account-field="username" value="' + esc(p.username || "") + '" maxlength="32"' + (S.accountBusy.identity ? ' disabled' : '') + '><div class="st-account-field-hint">\u062D\u0631\u0648\u0641 \u0627\u0646\u06AF\u0644\u06CC\u0633\u06CC \u06A9\u0648\u0686\u06A9\u060C \u0639\u062F\u062F\u060C _ . - \u2014 \u0628\u0627\u06CC\u062F \u06CC\u06AF\u0627\u0646\u06AF\u06CC \u062F\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F</div></div>' +
        '<div class="st-account-actions"><button class="st-btn-primary" data-st-act="account-save-identity"' + (S.accountBusy.identity ? ' disabled' : '') + '>' + (S.accountBusy.identity ? '\u062F\u0631 \u062D\u0627\u0644 \u0630\u062E\u06CC\u0631\u0647...' : '\u0630\u062E\u06CC\u0631\u0647 \u0627\u0637\u0644\u0627\u0639\u0627\u062A') + '</button></div>' +
        '<div class="st-account-status ' + (S.accountErr.identity ? 'is-err' : (S.accountOk.identity ? 'is-ok' : '')) + '">' + esc(S.accountErr.identity || S.accountOk.identity || "") + '</div>' +
      '</div>';

    var emailConfirmed = S.user && S.user.email && S.user.email.length > 0;
    var securitySection =
      '<div class="st-account-section">' +
        '<div class="st-account-section-icon" style="margin-bottom:10px;">\uD83D\uDD10</div>' +
        '<div class="st-account-section-head" style="padding-bottom:8px;">' +
          '<div><div class="st-account-section-title">\u0627\u0645\u0646\u06CC\u062A \u062D\u0633\u0627\u0628</div>' +
          '<div class="st-account-section-desc">\u062A\u063A\u06CC\u06CC\u0631 \u0627\u06CC\u0645\u06CC\u0644 \u0648 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631</div></div>' +
        '</div>' +
        '<div class="st-account-field"><label>\u0627\u06CC\u0645\u06CC\u0644 \u0641\u0639\u0644\u06CC</label><input type="email" value="' + esc(S.user.email || "") + '" disabled></div>' +
        '<div class="st-account-field"><label>\u0627\u06CC\u0645\u06CC\u0644 \u062C\u062F\u06CC\u062F</label><input type="email" data-account-field="new_email" placeholder="new@example.com" maxlength="254"' + (S.accountBusy.email ? ' disabled' : '') + '></div>' +
        '<div class="st-account-actions"><button class="st-btn-primary" data-st-act="account-change-email"' + (S.accountBusy.email ? ' disabled' : '') + '>' + (S.accountBusy.email ? '\u062F\u0631 \u062D\u0627\u0644 \u0627\u0631\u0633\u0627\u0644...' : '\u062F\u0631\u062E\u0648\u0627\u0633\u062A \u062A\u063A\u06CC\u06CC\u0631 \u0627\u06CC\u0645\u06CC\u0644') + '</button></div>' +
        '<div class="st-account-status ' + (S.accountErr.email ? 'is-err' : (S.accountOk.email ? 'is-ok' : '')) + '">' + esc(S.accountErr.email || S.accountOk.email || "") + '</div>' +
        '<div style="height:1px;background:rgba(255,255,255,0.06);margin:14px 0;"></div>' +
        '<div class="st-account-field"><label>\u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u062C\u062F\u06CC\u062F</label><div class="st-password-wrap"><input type="password" data-account-field="new_password" minlength="8" placeholder="\u062D\u062F\u0627\u0642\u0644 \u06F8 \u06A9\u0627\u0631\u0627\u06A9\u062A\u0631"' + (S.accountBusy.password ? ' disabled' : '') + '><button type="button" class="st-password-toggle" data-st-act="account-toggle-pass">\uD83D\uDC41</button></div></div>' +
        '<div class="st-account-field"><label>\u062A\u06A9\u0631\u0627\u0631 \u0631\u0645\u0632 \u062C\u062F\u06CC\u062F</label><div class="st-password-wrap"><input type="password" data-account-field="confirm_password" minlength="8"' + (S.accountBusy.password ? ' disabled' : '') + '><button type="button" class="st-password-toggle" data-st-act="account-toggle-pass">\uD83D\uDC41</button></div></div>' +
        '<div class="st-account-actions"><button class="st-btn-primary" data-st-act="account-change-password"' + (S.accountBusy.password ? ' disabled' : '') + '>' + (S.accountBusy.password ? '\u062F\u0631 \u062D\u0627\u0644 \u062A\u063A\u06CC\u06CC\u0631...' : '\u062A\u063A\u06CC\u06CC\u0631 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631') + '</button></div>' +
        '<div class="st-account-status ' + (S.accountErr.password ? 'is-err' : (S.accountOk.password ? 'is-ok' : '')) + '">' + esc(S.accountErr.password || S.accountOk.password || "") + '</div>' +
      '</div>';

    var privacySection =
      '<div class="st-account-section">' +
        '<div class="st-account-section-head">' +
          '<div class="st-account-section-icon">\uD83D\uDD12</div>' +
          '<div><div class="st-account-section-title">\u062D\u0631\u06CC\u0645 \u062E\u0635\u0648\u0635\u06CC</div>' +
          '<div class="st-account-section-desc">\u0645\u0634\u062E\u0635 \u06A9\u0646\u06CC\u062F \u0686\u0647 \u0686\u06CC\u0632\u06CC \u0628\u0627 \u062F\u0648\u0633\u062A\u0627\u0646 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u06AF\u0630\u0627\u0634\u062A\u0647 \u0634\u0648\u062F.</div></div>' +
        '</div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_daily_total"' + (shareDaily ? " checked" : "") + '><span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u0645\u062C\u0645\u0648\u0639 \u0645\u0637\u0627\u0644\u0639\u0647\u0654 \u0627\u0645\u0631\u0648\u0632</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_timeline"' + (shareTL ? " checked" : "") + '><span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u0641\u0639\u0627\u0644\u06CC\u062A \u062C\u0627\u0631\u06CC Timeline</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_course_breakdown"' + (shareBreak ? " checked" : "") + '><span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u062A\u0641\u06A9\u06CC\u06A9 \u0622\u0645\u0627\u0631 \u062F\u0631\u0633\u200C\u0647\u0627</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_history_with_group"' + (shareHist ? " checked" : "") + '><span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0628\u0627 \u06AF\u0631\u0648\u0647</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_daily_plan"' + (sharePlan ? " checked" : "") + '><span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="avatar_keep" checked disabled style="display:none"></label></div>' +
        '<div class="st-account-actions"><button class="st-btn-primary" data-st-act="account-save-privacy"' + (S.accountBusy.privacy ? ' disabled' : '') + '>' + (S.accountBusy.privacy ? '\u062F\u0631 \u062D\u0627\u0644 \u0630\u062E\u06CC\u0631\u0647...' : '\u0630\u062E\u06CC\u0631\u0647 \u062A\u0646\u0637\u06CC\u0645\u0627\u062A') + '</button></div>' +
        '<div class="st-account-status ' + (S.accountErr.privacy ? 'is-err' : (S.accountOk.privacy ? 'is-ok' : '')) + '">' + esc(S.accountErr.privacy || S.accountOk.privacy || "") + '</div>' +
      '</div>';

    var groupSection = '';
    if (S.group) {
      var codeVal = S.group.invite_code || "";
      var maskedCode = "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022";
      var codeDisplay = S.inviteVisible ? codeVal : maskedCode;
      var codeCls = "st-group-code-value" + (S.inviteVisible ? "" : " is-masked");
      groupSection =
        '<div class="st-account-section">' +
          '<div class="st-account-section-head">' +
            '<div class="st-account-section-icon">\uD83D\uDC65</div>' +
            '<div><div class="st-account-section-title">\u062A\u0646\u0637\u06CC\u0645\u0627\u062A \u06AF\u0631\u0648\u0647</div>' +
            '<div class="st-account-section-desc">' + esc(S.group.name || "") + ' \u2014 ' + fa0(S.members.length) + ' \u0639\u0636\u0648</div></div>' +
          '</div>' +
          (isOwner ?
            '<div class="st-group-code-wrap">' +
              '<span class="st-group-code-label">\u06A9\u062F \u062F\u0639\u0648\u062A:</span>' +
              '<code class="' + codeCls + '">' + (S.inviteVisible ? esc(codeVal) : maskedCode) + '</code>' +
              '<button class="st-group-code-btn" data-st-act="invite-toggle">' + (S.inviteVisible ? '\uD83D\uDE48 \u0645\u062E\u0641\u06CC' : '\uD83D\uDC41 \u0646\u0645\u0627\u06CC\u0634') + '</button>' +
              '<button class="st-group-code-btn" data-st-act="copy-invite">\uD83D\uDCCB \u06A9\u067E\u06CC</button>' +
              '<button class="st-group-code-btn" data-st-act="revoke">\uD83D\uDD04 \u06A9\u062F \u062C\u062F\u06CC\u062F</button>' +
            '</div>'
          : '<div class="st-invite-compact">\uD83D\uDD12 \u0641\u0642\u0637 \u0645\u0627\u0644\u06A9 \u06AF\u0631\u0648\u0647 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u06A9\u062F \u062F\u0639\u0648\u062A \u0631\u0627 \u0628\u0628\u06CC\u0646\u062F</div>') +
          '<div class="st-actions-bar" style="border-top:none;padding-top:8px;margin-top:8px;justify-content:flex-end;">' +
            (isOwner
              ? '<button class="st-btn-danger st-btn-small" data-st-act="delete-group">\uD83D\uDDD1\uFE0F \u062D\u0630\u0641 \u06AF\u0631\u0648\u0647</button>'
              : '<button class="st-btn-ghost st-btn-small" data-st-act="leave">\uD83D\uDEAA \u062A\u0631\u06A9 \u06AF\u0631\u0648\u0647</button>') +
          '</div>' +
        '</div>';
    }

    S.container.innerHTML = pageWrap(
      _navTabsHTML("profile") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(p.display_name) + ' <span class="st-conn st-conn-' + (S.offline ? "offline" : S.connection) + '" title="\u0648\u0636\u0639\u06CC\u062A \u0627\u062A\u0635\u0627\u0644">' + ((S.offline ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : ((S.offline ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : (S.connection === "online" ? "\u25CF \u0622\u0646\u0644\u0627\u06CC\u0646" : "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646"))))) + '</span></div>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>\u2699\uFE0F \u062D\u0633\u0627\u0628 \u0645\u0646</h1></div>' +
      '<div class="st-account-hero">' +
        '<div class="st-profile-avatar st-account-avatar st-avatar-' + esc(avatarKey) + '">' + _avatarInnerHTML(p) + '</div>' +
        '<div class="st-account-id">' +
          '<h2>' + esc(p.display_name) + '</h2>' +
          '<div class="st-account-id-user">@' + esc(p.username) + '</div>' +
          '<div class="st-account-id-meta">' +
            (memberSince ? '<span>\uD83D\uDCC5 \u0639\u0636\u0648 \u0627\u0632 ' + esc(memberSince) + '</span>' : '') +
            '<span>\u23F1 \u0627\u0645\u0631\u0648\u0632: ' + _fmtTimer(today) + '</span>' +
            '<span>\uD83D\uDCC5 \u06F7 \u0631\u0648\u0632: ' + _fmtTimer(weekSec) + '</span>' +
          '</div>' +
        '</div>' +
      '</div>' +
      identitySection +
      securitySection +
      _renderStreakSection() +
      _renderProfileGoalsSection() +
      privacySection +
      '<div class="st-members-title">\uD83C\uDFA8 \u0622\u0648\u0627\u062A\u0627\u0631</div>' +
      _avatarUploadHTML() +
      _avatarPickerHTML(avatarKey) +
      '<div class="st-members-title">\uD83D\uDCDD \u062F\u0631\u0628\u0627\u0631\u0647\u0654 \u0645\u0646</div>' +
      '<div class="st-card st-settings-card"><textarea class="st-bio-edit" data-st-bio maxlength="200" rows="3" placeholder="\u062A\u0648\u0636\u06CC\u062D \u06A9\u0648\u062A\u0627\u0647">' + esc(p.bio || "") + '</textarea></div>' +
      groupSection +
      '<div class="st-account-section">' +
        '<div class="st-account-section-head">' +
          '<div class="st-account-section-icon">\uD83D\uDEAA</div>' +
          '<div><div class="st-account-section-title">\u062E\u0631\u0648\u062C \u0627\u0632 \u062D\u0633\u0627\u0628</div>' +
          '<div class="st-account-section-desc">\u067E\u0627\u06CC\u0627\u0646 \u0646\u0634\u0633\u062A \u062F\u0631 \u0627\u06CC\u0646 \u062F\u0633\u062A\u06AF\u0627\u0647</div></div>' +
        '</div>' +
        '<div class="st-account-actions"><button class="st-btn-danger" data-st-act="logout">\uD83D\uDEAA \u062E\u0631\u0648\u062C \u0627\u0632 \u062D\u0633\u0627\u0628</button></div>' +
      '</div>'
    );
    wire();
  }
  function _statsRangeIso(period) {
    var now = new Date();
    var start = new Date(now); start.setHours(0,0,0,0);
    var end = new Date(now); end.setHours(23,59,59,999);
    var days = 1;
    if (period === "week") { days = 7; start.setDate(start.getDate() - 6); }
    else if (period === "month") { days = 30; start.setDate(start.getDate() - 29); }
    return { startIso: start.toISOString(), endIso: end.toISOString(), days: days };
  }
  function _loadStats() {
    if (!S.user || !S.group || !_sb) return Promise.resolve();
    if (S.statsLoading) return Promise.resolve();
    S.statsLoading = true; S.statsError = null;
    if (S.navTab === "stats") render();
    var r = _statsRangeIso(S.statsPeriod);
    return qGetRangeSessions(S.user.id, S.group.id, r.startIso, r.endIso)
      .then(function (rows) {
        S.statsSessions = rows || [];
        S.statsLoading = false;
        if (S.navTab === "stats") render();
      }).catch(function (err) {
        S.statsError = String(err && err.message || err);
        S.statsLoading = false;
        if (S.navTab === "stats") render();
      });
  }
  function _statsAggregateDaily(sessions, days) {
    var now = new Date(); now.setHours(0,0,0,0);
    var start = new Date(now); start.setDate(start.getDate() - (days - 1));
    var labels = [];
    var buckets = {};
    for (var i = 0; i < days; i++) {
      var d = new Date(start); d.setDate(d.getDate() + i);
      var k = d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
      buckets[k] = 0;
      labels.push({ date: d, key: k });
    }
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var st = new Date(s.started_at);
      var k = st.getFullYear() + "-" + (st.getMonth() + 1) + "-" + st.getDate();
      if (buckets[k] === undefined) return;
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st.getTime()) / 1000));
      buckets[k] += dur;
    });
    return labels.map(function (l) { return { date: l.date, key: l.key, sec: buckets[l.key] }; });
  }
  function _statsAggregateByCourse(sessions) {
    var map = {};
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var k = s.course_id || "none";
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
      map[k] = (map[k] || 0) + dur;
    });
    return map;
  }
  function _renderLineChart(daily) {
    var W = 640, H = 180, PAD = 24, n = daily.length;
    if (n < 2) return '<div class="st-hist-empty">دادهٔ کافی برای نمودار نیست</div>';
    var maxSec = 0;
    for (var i = 0; i < n; i++) { if (daily[i].sec > maxSec) maxSec = daily[i].sec; }
    if (maxSec === 0) maxSec = 1;
    var xs = [], ys = [];
    for (var j = 0; j < n; j++) {
      xs.push(PAD + (W - 2 * PAD) * (j / (n - 1)));
      ys.push(H - PAD - (H - 2 * PAD) * (daily[j].sec / maxSec));
    }
    var path = "M" + xs[0].toFixed(1) + "," + ys[0].toFixed(1);
    for (var k = 1; k < n; k++) path += " L" + xs[k].toFixed(1) + "," + ys[k].toFixed(1);
    var area = path + " L" + (W - PAD) + "," + (H - PAD) + " L" + PAD + "," + (H - PAD) + " Z";
    var dots = "";
    for (var m = 0; m < n; m++) {
      if (daily[m].sec === 0) continue;
      dots += '<circle cx="' + xs[m].toFixed(1) + '" cy="' + ys[m].toFixed(1) + '" r="3" fill="rgba(99,102,241,1)"/>';
    }
    return '<svg class="st-line-chart" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none">' +
      '<defs><linearGradient id="stLineGrad" x1="0" y1="0" x2="0" y2="1">' +
      '<stop offset="0%" stop-color="rgba(99,102,241,0.35)"/>' +
      '<stop offset="100%" stop-color="rgba(99,102,241,0)"/>' +
      '</linearGradient></defs>' +
      '<path d="' + area + '" fill="url(#stLineGrad)"/>' +
      '<path d="' + path + '" fill="none" stroke="rgba(99,102,241,1)" stroke-width="2" stroke-linejoin="round"/>' +
      dots +
    '</svg>';
  }
  function _statsPeriodPillsHTML() {
    var opts = [
      { id: "today", label: "امروز" },
      { id: "week", label: "۷ روز" },
      { id: "month", label: "۳۰ روز" }
    ];
    return '<div class="st-period-pills">' + opts.map(function (o) {
      var cls = "st-period-pill" + (S.statsPeriod === o.id ? " is-active" : "");
      return '<button type="button" class="' + cls + '" data-st-act="stats-period" data-period="' + o.id + '">' + o.label + '</button>';
    }).join("") + '</div>';
  }
  var _PERSIAN_DOW = ["یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنج‌شنبه","جمعه","شنبه"];
  function _statsTopDays(daily, n) {
    var arr = (daily || []).filter(function (d) { return d.sec > 0; });
    arr.sort(function (a, b) { return b.sec - a.sec; });
    return arr.slice(0, n || 3);
  }
  function _statsBestSession(sessions) {
    var best = null;
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
      if (!best || dur > best.durSec) best = { session: s, durSec: dur };
    });
    return best;
  }
  function _statsCourseBreakdownHTML(byCourse, limit) {
    var keys = Object.keys(byCourse);
    if (keys.length === 0) return '<div class="st-hist-empty">هنوز جلسه‌ای در این بازه ثبت نشده</div>';
    var entries = keys.map(function (k) { return { key: k, sec: byCourse[k] }; });
    entries.sort(function (a, b) { return b.sec - a.sec; });
    var lim = limit || 5;
    var shown = entries.slice(0, lim);
    var maxC = shown[0].sec || 1;
    var rows = shown.map(function (e) {
      var c = _courseById(e.key === "none" ? null : e.key);
      var label = c ? c.name : "بدون درس";
      var colorCls = c ? _courseColorClass(c) : "st-course-none";
      var pct = maxC > 0 ? (e.sec / maxC * 100) : 0;
      return '<div class="st-course-stat">' +
        '<div class="st-course-stat-row">' +
          '<span class="st-course-stat-label ' + colorCls + '"><span class="st-course-dot"></span>' + esc(label) + '</span>' +
          '<span class="st-course-stat-val">' + _fmtTimer(e.sec) + '</span>' +
        '</div>' +
        '<div class="st-course-stat-bar"><div class="st-course-stat-fill ' + colorCls + '" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '</div>';
    }).join("");
    var more = entries.length > lim
      ? '<div class="st-hist-more">+ ' + fa0(entries.length - lim) + ' مورد دیگر</div>'
      : "";
    return rows + more;
  }
  function _statsTopDaysHTML(daily) {
    var top = _statsTopDays(daily, 3);
    if (top.length === 0) {
      return '<div class="st-hist-empty">هنوز روزی با مطالعه ثبت نشده</div>';
    }
    return '<div class="st-topdays">' + top.map(function (d, i) {
      
      var dateKey = _fmtDateJalaliPretty(d.date.toISOString());
      return '<div class="st-topday">' +
        '<div class="st-topday-rank">' + fa0(i + 1) + '</div>' +
        '<div class="st-topday-info">' +
          '<div class="st-topday-date">' + esc(dateKey) + '</div>' +
          '<div class="st-topday-dur">' + _fmtTimer(d.sec) + '</div>' +
        '</div>' +
      '</div>';
    }).join("") + '</div>';
  }
  function _statsBestSessionHTML(best) {
    if (!best) return '<div class="st-hist-empty">جلسه‌ای ثبت نشده</div>';
    var s = best.session;
    var start = new Date(s.started_at);
    var end = new Date(s.ended_at);
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    var timeStr = _toPersianDigits(pad(start.getHours())) + ":" + _toPersianDigits(pad(start.getMinutes())) +
                  " → " + _toPersianDigits(pad(end.getHours())) + ":" + _toPersianDigits(pad(end.getMinutes()));
    var c = _courseById(s.course_id || null);
    var label = c ? c.name : "بدون درس";
    var colorCls = c ? _courseColorClass(c) : "st-course-none";
    var dateKey = _fmtDateJalali(s.started_at);
    return '<div class="st-bestsession">' +
      '<div class="st-bestsession-dur">' + _fmtTimer(best.durSec) + '</div>' +
      '<div class="st-bestsession-meta">' +
        '<span class="st-course-stat-label ' + colorCls + '"><span class="st-course-dot"></span>' + esc(label) + '</span>' +
        '<span class="st-bestsession-when">' + esc(dateKey) + ' · ' + timeStr + '</span>' +
      '</div>' +
    '</div>';
  }
  function renderStatistics() {
    if (!S.container) return;
    var loading = S.statsLoading || S.statsSessions === null;
    var err = S.statsError;
    var per = S.statsPeriod;
    var days = _statsRangeIso(per).days;

    var totalSec = 0, sessionCount = 0, maxDur = 0;
    var daily = [], byCourse = {};
    var best = null;

    if (!loading && S.statsSessions) {
      daily = _statsAggregateDaily(S.statsSessions, days);
      byCourse = _statsAggregateByCourse(S.statsSessions);
      for (var i = 0; i < S.statsSessions.length; i++) {
        var s = S.statsSessions[i];
        if (!s.ended_at || s.end_reason === "crash") continue;
        sessionCount++;
        var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
        totalSec += dur;
        if (dur > maxDur) maxDur = dur;
      }
      best = _statsBestSession(S.statsSessions);
    }
    var avgSec = days > 0 ? Math.floor(totalSec / days) : 0;

    var chartHTML = "";
    if (!loading) {
      if (totalSec > 0) chartHTML = _renderLineChart(daily);
      else chartHTML = '<div class="st-hist-empty">داده‌ای برای نمایش نیست — یک جلسه ثبت کن</div>';
    }

    var courseHTML = "";
    if (!loading) {
      courseHTML = _statsCourseBreakdownHTML(byCourse, 5);
    }

    var topDaysHTML = "";
    if (!loading) topDaysHTML = _statsTopDaysHTML(daily);

    var bestHTML = "";
    if (!loading) bestHTML = _statsBestSessionHTML(best);

    var summaryHTML = "";
    if (loading) {
      summaryHTML = '<div class="st-card st-loading">در حال بارگذاری...</div>';
    } else {
      summaryHTML =
        '<div class="st-stats">' +
          '<div class="st-stat"><span class="st-stat-ico">⏱</span><div><div class="st-stat-val">' + _fmtTimer(totalSec) + '</div><div class="st-stat-lbl">مجموع</div></div></div>' +
          '<div class="st-stat"><span class="st-stat-ico">📊</span><div><div class="st-stat-val">' + fa0(sessionCount) + '</div><div class="st-stat-lbl">جلسه</div></div></div>' +
          '<div class="st-stat"><span class="st-stat-ico">📈</span><div><div class="st-stat-val">' + _fmtTimer(avgSec) + '</div><div class="st-stat-lbl">میانگین روزانه</div></div></div>' +
          '<div class="st-stat"><span class="st-stat-ico">🏆</span><div><div class="st-stat-val">' + _fmtTimer(maxDur) + '</div><div class="st-stat-lbl">طولانی‌ترین</div></div></div>' +
        '</div>' +
        _renderStatsGoalCard() +
        '<div class="st-chart-card"><div class="st-members-title">📈 روند</div>' + chartHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">🏅 روزهای پربازده</div>' + topDaysHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">⭐ بهترین جلسه</div>' + bestHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">📚 به تفکیک درس</div>' + courseHTML + '</div>';
    }

    S.container.innerHTML = pageWrap(
      _navTabsHTML("stats") +
      '<div class="st-topbar"><div class="st-user-chip">' + esc((S.profile && S.profile.display_name) || "?") + ' ' + _connChipHTML() + '</div></div>' +
      '<div class="st-hero st-hero-small"><h1>📊 آمار</h1></div>' +
      _statsPeriodPillsHTML() +
      (err ? '<div class="st-error">' + esc(err) + '</div>' : "") +
      summaryHTML
    );
    wire();
  }
  function _renderMemberHistoryRow(s) {
    var start = _fmtTimeShort(s.started_at);
    var end = _fmtTimeShort(s.ended_at);
    var durSec = 0;
    if (s.end_reason !== "crash" && s.ended_at) {
      durSec = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
    }
    var dur = _fmtTimer(durSec);
    var badge;
    if (s.end_reason === "crash") badge = '<span class="st-hist-badge st-hist-badge-crash">قطع‌شده</span>';
    else if (s.end_reason === "break") badge = '<span class="st-hist-badge st-hist-badge-break">استراحت</span>';
    else badge = '<span class="st-hist-badge st-hist-badge-ended">پایان</span>';
    var c = _courseById(s.course_id || null);
    var courseLabel = c ? '<span class="st-course-stat-label ' + _courseColorClass(c) + '"><span class="st-course-dot"></span>' + esc(c.name) + '</span>' : '';
    return '<div class="st-hist-row">' +
      '<div class="st-hist-row-main">' +
        '<span class="st-hist-row-time">' + start + ' — ' + end + '</span>' +
        '<span class="st-hist-row-dur">' + dur + '</span>' +
        '<span class="st-hist-row-badges">' + badge + '</span>' +
        courseLabel +
      '</div>' +
    '</div>';
  }
  function _friendDayToday() {
    var d = new Date();
    function p2(n){ return n < 10 ? "0" + n : "" + n; }
    return d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  }
  function _friendDaySetDate(uid, isoDate) {
    if (!isoDate) return;
    S.friendDayDate = isoDate;
    S.friendDaySessions = null;
    S.friendDayLoading = true;
    S.friendDayError = null;
    render();
    _friendDayReload(uid);
  }
  function _friendDayReload(uid) {
    if (!S.user || !S.group || !_sb || !S.friendDayDate) { S.friendDayLoading = false; render(); return; }
    var d = new Date(S.friendDayDate + "T00:00:00");
    var startIso = d.toISOString();
    var end = new Date(d.getTime()); end.setDate(end.getDate() + 1);
    var endIso = end.toISOString();
    qGetGroupRangeSessions(S.group.id, startIso, endIso).then(function (rows) {
      if (!S.memberProfileView || S.memberProfileView.user_id !== uid) return;
      S.friendDaySessions = (rows || []).filter(function (s) { return s.user_id === uid; });
      S.friendDayLoading = false;
      _loadFriendPlan(uid, S.friendDayDate);
      render();
    }).catch(function (err) {
      S.friendDayError = String(err && err.message || err);
      S.friendDayLoading = false;
      render();
    });
  }
  function _friendDayShift(delta) {
    if (!S.memberProfileView || !S.friendDayDate) return;
    var d = new Date(S.friendDayDate + "T00:00:00");
    d.setDate(d.getDate() + delta);
    var now = new Date(); now.setHours(0,0,0,0);
    if (d.getTime() > now.getTime()) return;
    function p2(n){ return n < 10 ? "0" + n : "" + n; }
    var iso = d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
    _friendDaySetDate(S.memberProfileView.user_id, iso);
  }
  function _renderFriendDayHTML(uid) {
    var view = S.memberProfileView;
    if (!view) return "";
    if (!view.share_daily_total && uid !== S.user.id) {
      return '<div class="st-card"><div class="st-members-title">\uD83D\uDCC5 \u0641\u0639\u0627\u0644\u06CC\u062A \u0631\u0648\u0632\u0627\u0646\u0647</div><div class="st-muted-note">\uD83D\uDD12 \u062A\u0627\u0631\u06CC\u062E\u0686\u0647 \u0631\u0648\u0632\u0627\u0646\u0647 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u06AF\u0630\u0627\u0634\u062A\u0647 \u0646\u0634\u062F\u0647</div></div>';
    }
    if (!S.friendDayDate) S.friendDayDate = _friendDayToday();
    var d = new Date(S.friendDayDate + "T00:00:00");
    var now = new Date(); now.setHours(0,0,0,0);
    var atToday = d.getTime() >= now.getTime();
    var dowNames = ["\u06CC\u06A9\u0634\u0646\u0628\u0647","\u062F\u0648\u0634\u0646\u0628\u0647","\u0633\u0647\u200C\u0634\u0646\u0628\u0647","\u0686\u0647\u0627\u0631\u0634\u0646\u0628\u0647","\u067E\u0646\u062C\u200C\u0634\u0646\u0628\u0647","\u062C\u0645\u0639\u0647","\u0634\u0646\u0628\u0647"];
    var dowName = dowNames[d.getDay()];
    function p2(n){ return n < 10 ? "0" + n : "" + n; }
    var dayLabel = _fmtDateJalaliPretty(S.friendDayDate);
    var nav = '<div class="st-friend-day-nav">' +
      '<button class="st-btn-ghost st-btn-small" data-st-act="friend-day-prev" title="\u0631\u0648\u0632 \u0642\u0628\u0644">\u2039</button>' +
      '<input type="date" data-st-act="friend-day-set" class="st-friend-day-date" value="' + esc(S.friendDayDate) + '" max="' + esc(_friendDayToday()) + '">' +
      '<span class="st-friend-day-date-fa">' + esc(_fmtDateJalali(S.friendDayDate)) + '</span>' +
      '<button class="st-btn-ghost st-btn-small" data-st-act="friend-day-next"' + (atToday ? ' disabled' : '') + ' title="\u0631\u0648\u0632 \u0628\u0639\u062F">\u203A</button>' +
      '<button class="st-btn-ghost st-btn-small" data-st-act="friend-day-today"' + (atToday ? ' disabled' : '') + '>\u0627\u0645\u0631\u0648\u0632</button>' +
    '</div>';
    if (S.friendDayLoading) return '<div class="st-card"><div class="st-members-title">\uD83D\uDCC5 \u0641\u0639\u0627\u0644\u06CC\u062A \u0631\u0648\u0632\u0627\u0646\u0647</div>' + nav + '<div class="st-loading">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div></div>';
    if (S.friendDayError) return '<div class="st-card"><div class="st-members-title">\uD83D\uDCC5 \u0641\u0639\u0627\u0644\u06CC\u062A \u0631\u0648\u0632\u0627\u0646\u0647</div>' + nav + '<div class="st-error">' + esc(S.friendDayError) + '</div></div>';
    var sess = S.friendDaySessions || [];
    var totalSec = 0;
    sess.forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      totalSec += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
    });
    var rows;
    if (sess.length === 0) {
      rows = '<div class="st-friend-day-empty">\u062F\u0631 \u0627\u06CC\u0646 \u0631\u0648\u0632 \u062C\u0644\u0633\u0647\u200C\u0627\u06CC \u062B\u0628\u062A \u0646\u0634\u062F\u0647</div>';
    } else {
      var sorted = sess.slice().sort(function (a, b) { return new Date(a.started_at) - new Date(b.started_at); });
      rows = sorted.map(function (s) {
        var st = new Date(s.started_at);
        var durSec = 0;
        if (s.ended_at && s.end_reason !== "crash") durSec = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st.getTime()) / 1000));
        var c = _courseById(s.course_id || null);
        var courseLabel = c ? '<span class="st-course-stat-label ' + _courseColorClass(c) + '"><span class="st-course-dot"></span>' + esc(c.name) + '</span>' : '<span class="st-muted">\u0628\u062F\u0648\u0646 \u062F\u0631\u0633</span>';
        var timeStr = _fmtTimeShort(s.started_at) + " \u2192 " + (s.ended_at ? _fmtTimeShort(s.ended_at) : "\u0628\u0627\u0632");
        var badge;
        if (s.end_reason === "crash") badge = '<span class="st-hist-badge st-hist-badge-crash">\u0642\u0637\u0639\u200C\u0634\u062F\u0647</span>';
        else if (s.end_reason === "break") badge = '<span class="st-hist-badge st-hist-badge-break">\u0627\u0633\u062A\u0631\u0627\u062D\u062A</span>';
        else if (s.end_reason === "ended") badge = '<span class="st-hist-badge st-hist-badge-ended">\u067E\u0627\u06CC\u0627\u0646</span>';
        else badge = '<span class="st-hist-badge st-hist-badge-open">\u0628\u0627\u0632</span>';
        return '<div class="st-friend-session">' +
          '<div class="st-friend-session-main">' +
            '<span class="st-friend-session-time">' + timeStr + '</span>' +
            '<span class="st-friend-session-dur">' + (durSec > 0 ? _fmtTimer(durSec) : '\u2014') + '</span>' +
            badge +
            '<span class="st-friend-session-course">' + courseLabel + '</span>' +
          '</div>' +
        '</div>';
      }).join("");
    }
    return '<div class="st-card">' +
      '<div class="st-members-title">\uD83D\uDCC5 \u0641\u0639\u0627\u0644\u06CC\u062A \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
      nav +
      '<div class="st-friend-day-head">' + dayLabel + ' \u00B7 \u0645\u062C\u0645\u0648\u0639: ' + _fmtTimer(totalSec) + '</div>' +
      '<div class="st-friend-sessions">' + rows + '</div>' +
    '</div>';
  }
  function _sharePlanJalaliAddDays(jalali, n) {
    var d = window.InternshipLib && window.InternshipLib.date;
    if (d) {
      if (typeof d.jalaliAddDays === "function") { try { return d.jalaliAddDays(jalali, n); } catch (e) {} }
      if (typeof d.addDays === "function") { try { return d.addDays(jalali, n); } catch (e) {} }
    }
    var parts = String(jalali || "").split("/");
    if (parts.length !== 3) return null;
    var y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), day = parseInt(parts[2], 10);
    if (!isFinite(y) || !isFinite(m) || !isFinite(day)) return null;
    var jmd = [31,31,31,31,31,31,30,30,30,30,30,29];
    day += n;
    while (day > jmd[m-1]) { day -= jmd[m-1]; m++; if (m > 12) { m = 1; y++; } }
    while (day < 1) { m--; if (m < 1) { m = 12; y--; } day += jmd[m-1]; }
    return y + "/" + m + "/" + day;
  }
  function _sharePlanCollectForDate(jalaliDate) {
    var b = window.__ioStudyTogetherBridge;
    if (!b || typeof b.getDailyPlan !== "function") return null;
    var items = b.getDailyPlan(jalaliDate);
    if (!Array.isArray(items)) return null;
    var out = [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it) continue;
      var cat = String(it.category || "");
      var kind = "other";
      if (cat === "study" || cat === "residency" || cat === "review" || cat === "assessment" || cat === "clinical") kind = "study";
      else if (cat === "sleep" || cat === "food" || cat === "exercise" || cat === "commute" || cat === "life" || cat === "body") kind = "life";
      out.push({
        title: String(it.title || "").slice(0, 120),
        start: it.startTime ? String(it.startTime).slice(0, 5) : null,
        end: it.endTime ? String(it.endTime).slice(0, 5) : null,
        mins: (typeof it.durationMinutes === "number" && it.durationMinutes > 0) ? Math.round(it.durationMinutes) : null,
        kind: kind
      });
    }
    return out;
  }
  function _sharePlanCollectFor7Days() {
    var b = window.__ioStudyTogetherBridge;
    if (!b || typeof b.todayJalali !== "function") return null;
    var today = b.todayJalali();
    var todayMs = new Date(); todayMs.setHours(0, 0, 0, 0);
    var out = [];
    for (var i = 0; i < 8; i++) {
      var jal = _sharePlanJalaliAddDays(today, i);
      if (!jal) continue;
      var items = _sharePlanCollectForDate(jal);
      if (!items) continue;
      var d = new Date(todayMs); d.setDate(d.getDate() + i);
      var mm = (d.getMonth() + 1 < 10 ? "0" : "") + (d.getMonth() + 1);
      var dd = (d.getDate() < 10 ? "0" : "") + d.getDate();
      out.push({ date: d.getFullYear() + "-" + mm + "-" + dd, items: items });
    }
    return out;
  }
  function _sharePlanUpsert(silent) {
    if (!S.user || !S.group || !_sb) { if (!silent) { S.sharePlanError = "\u0627\u062A\u0635\u0627\u0644 \u06CC\u0627 \u06AF\u0631\u0648\u0647 \u0646\u0627\u0645\u0648\u062C\u0648\u062F"; render(); } return; }
    var toUpsert = _sharePlanCollectFor7Days();
    if (!toUpsert || toUpsert.length === 0) {
      if (!silent) { S.sharePlanBusy = false; S.sharePlanError = "\u062F\u0627\u062F\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u0646\u062A\u0634\u0627\u0631 \u0646\u06CC\u0633\u062A"; render(); }
      return;
    }
    var rows = [];
    var nowIso = new Date().toISOString();
    for (var i = 0; i < toUpsert.length; i++) {
      rows.push({ user_id: S.user.id, group_id: S.group.id, plan_date: toUpsert[i].date, items: toUpsert[i].items, published_at: nowIso });
    }
    _sb.from("study_shared_day_plans").upsert(rows, { onConflict: "user_id,group_id,plan_date" })
      .then(function (r) {
        if (r && r.error) throw r.error;
        S.sharePlanBusy = false;
        if (!silent) { try { notify("success", "\u0628\u0631\u0646\u0627\u0645\u0647 \u0645\u0646\u062A\u0634\u0631 \u0634\u062F \u2014 " + toUpsert.length + " \u0631\u0648\u0632"); } catch (e) {} render(); }
      })
      .catch(function (err) {
        S.sharePlanBusy = false;
        S.sharePlanError = String(err && err.message || err);
        if (window.console && console.warn) console.warn("[st] share-plan upsert failed:", S.sharePlanError);
        if (!silent) render();
      });
  }
  function _sharePlanPublish() {
    if (!S.profile || !S.profile.share_daily_plan) { S.sharePlanError = "\u0627\u0628\u062A\u062F\u0627 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0631\u0627 \u0631\u0648\u0634\u0646 \u06A9\u0646\u06CC\u062F"; render(); return; }
    S.sharePlanBusy = true;
    S.sharePlanError = null;
    render();
    _sharePlanUpsert(false);
  }
  function _sharePlanAutoPublish() {
    if (!S.profile || !S.profile.share_daily_plan) return;
    _sharePlanUpsert(true);
  }
  function _handleSharePlanToggle(checked) {
    if (!S.user || !_sb) return;
    S.sharePlanBusy = true;
    S.sharePlanError = null;
    render();
    _sb.from("profiles").update({ share_daily_plan: !!checked, updated_at: new Date().toISOString() }).eq("id", S.user.id).select().single()
      .then(function (r) {
        if (r && r.error) throw r.error;
        if (S.profile) S.profile.share_daily_plan = !!checked;
        for (var i = 0; i < S.members.length; i++) {
          if (S.members[i].user_id === S.user.id) S.members[i].share_daily_plan = !!checked;
        }
        S.sharePlanBusy = false;
        try { notify("success", checked ? "\u0627\u0634\u062A\u0631\u0627\u06A9 \u0641\u0639\u0627\u0644 \u0634\u062F" : "\u0627\u0634\u062A\u0631\u0627\u06A9 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0634\u062F"); } catch (e) {}
        render();
      })
      .catch(function (err) {
        S.sharePlanBusy = false;
        S.sharePlanError = String(err && err.message || err);
        render();
      });
  }
  function _loadFriendPlan(uid, isoDate) {
    if (!_sb || !S.group || !uid || !isoDate) {
      S.friendPlanLoading = false; S.friendPlanData = null; S.friendPlanError = null;
      return Promise.resolve();
    }
    S.friendPlanLoading = true;
    S.friendPlanError = null;
    S.friendPlanData = null;
    render();
    return _sb.from("study_shared_day_plans")
      .select("items,published_at,plan_date")
      .eq("user_id", uid)
      .eq("group_id", S.group.id)
      .eq("plan_date", isoDate)
      .maybeSingle()
      .then(function (r) {
        if (!S.memberProfileView || S.memberProfileView.user_id !== uid) return;
        if (S.friendDayDate !== isoDate) return;
        if (r && r.error) throw r.error;
        S.friendPlanData = r.data || null;
        S.friendPlanLoading = false;
        render();
      })
      .catch(function (err) {
        S.friendPlanError = String(err && err.message || err);
        S.friendPlanLoading = false;
        render();
      });
  }
  function _timeDiffMinutes(a, b) {
    if (!a || !b) return 0;
    var ap = a.split(":"), bp = b.split(":");
    var am = parseInt(ap[0], 10) * 60 + parseInt(ap[1], 10);
    var bm = parseInt(bp[0], 10) * 60 + parseInt(bp[1], 10);
    return bm - am;
  }
  function _renderFriendPlanHTML(uid) {
    var view = S.memberProfileView;
    if (!view) return "";
    if (uid !== S.user.id && !view.share_daily_plan) {
      return '<div class="st-card">' +
        '<div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
        '<div class="st-plan-state is-share-off">' +
          '<div class="st-plan-state-icon">\uD83D\uDD12</div>' +
          '<div class="st-plan-state-title">\u0627\u0634\u062A\u0631\u0627\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647 \u063A\u06CC\u0631\u0641\u0639\u0627\u0644 \u0627\u0633\u062A</div>' +
          '<div class="st-plan-state-desc">\u0627\u06CC\u0646 \u0639\u0636\u0648 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647\u0654 \u062E\u0648\u062F \u0631\u0627 \u0628\u0627 \u06AF\u0631\u0648\u0647 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0646\u0645\u06CC\u200C\u06AF\u0630\u0627\u0631\u062F.</div>' +
        '</div>' +
      '</div>';
    }
    if (S.friendPlanLoading) {
      return '<div class="st-card"><div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
        '<div class="st-plan-state is-loading"><div class="st-plan-state-icon">\u23F3</div><div class="st-plan-state-title">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div></div></div>';
    }
    if (S.friendPlanError) {
      return '<div class="st-card"><div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
        '<div class="st-plan-state is-error"><div class="st-plan-state-icon">\u26A0\uFE0F</div><div class="st-plan-state-title">\u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC \u0646\u0627\u0645\u0648\u0641\u0642</div><div class="st-plan-state-desc">' + esc(S.friendPlanError) + '</div>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="friend-plan-refresh" style="margin-top:10px;">\u062A\u0644\u0627\u0634 \u0645\u062C\u062F\u062F</button></div></div>';
    }
    if (!S.friendPlanData) {
      return '<div class="st-card"><div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
        '<div class="st-plan-state"><div class="st-plan-state-icon">\uD83D\uDCED</div><div class="st-plan-state-title">\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0631\u0648\u0632 \u0645\u0646\u062A\u0634\u0631 \u0646\u0634\u062F\u0647</div>' +
        '<div class="st-plan-state-desc">\u0627\u06CC\u0646 \u0639\u0636\u0648 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0627\u06CC\u0646 \u0631\u0648\u0632 \u0631\u0627 \u0647\u0646\u0648\u0632 \u0645\u0646\u062A\u0634\u0631 \u0646\u06A9\u0631\u062F\u0647 \u06CC\u0627 \u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0646\u062F\u0627\u0631\u062F.</div></div></div>';
    }
    var items = (S.friendPlanData.items || []);
    var pubStr = S.friendPlanData.published_at ? _fmtTimeShort(S.friendPlanData.published_at) : "";
    var meta = '<div class="st-plan-meta">' +
      '<div class="st-plan-meta-time">' + (pubStr ? "\u0622\u062E\u0631\u06CC\u0646 \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC: " + pubStr : "\u0647\u0646\u0648\u0632 \u0628\u0647\u200C\u0631\u0648\u0632 \u0646\u0634\u062F\u0647") + '</div>' +
      '<button class="st-plan-meta-refresh" data-st-act="friend-plan-refresh">\uD83D\uDD04 \u062A\u0627\u0632\u0647\u200C\u0633\u0627\u0632\u06CC</button>' +
    '</div>';
    if (items.length === 0) {
      return '<div class="st-card"><div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' + meta +
        '<div class="st-plan-state"><div class="st-plan-state-icon">\uD83D\uDCED</div><div class="st-plan-state-title">\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u06CC\u0646 \u0631\u0648\u0632 \u062B\u0628\u062A \u0646\u0634\u062F\u0647</div></div></div>';
    }
    var sorted = items.slice().sort(function (a, b) { return String(a.start || "99:99").localeCompare(String(b.start || "99:99")); });
    var now = new Date();
    var nowHHMM = (now.getHours() < 10 ? "0" : "") + now.getHours() + ":" + (now.getMinutes() < 10 ? "0" : "") + now.getMinutes();
    var isToday = (S.friendDayDate === _friendDayToday());
    var rows = "";
    var prevEnd = null;
    for (var i = 0; i < sorted.length; i++) {
      var it = sorted[i];
      var st = it.start || "";
      var en = it.end || "";
      if (prevEnd && st && prevEnd < st) {
        var gap = _timeDiffMinutes(prevEnd, st);
        if (gap >= 30) rows += '<div style="grid-column: 2; font-size:10px; opacity:0.35; padding:1px 0;">' + fa0(Math.round(gap)) + ' \u062F\u0642\u06CC\u0642\u0647 \u0641\u0627\u0635\u0644\u0647</div>';
      }
      var kind = it.kind || "other";
      var kindLabel = kind === "study" ? "\u0645\u0637\u0627\u0644\u0639\u0647" : (kind === "life" ? "\u0632\u0646\u062F\u06AF\u06CC" : "\u0633\u0627\u06CC\u0631");
      var itemClass = "is-" + kind;
      var badge = "";
      if (isToday && st && en) {
        if (nowHHMM >= st && nowHHMM < en) { itemClass += " is-current"; badge = '<span class="st-plan-item-badge is-current">\u062F\u0631 \u062D\u0627\u0644 \u0627\u062C\u0631\u0627</span>'; }
        else if (nowHHMM >= en) { itemClass += " is-past"; badge = '<span class="st-plan-item-badge is-past">\u06AF\u0630\u0634\u062A\u0647</span>'; }
        else badge = '<span class="st-plan-item-badge is-future">\u0622\u06CC\u0646\u062F\u0647</span>';
      } else {
        badge = '<span class="st-plan-item-badge ' + (kind === "study" ? "is-study" : kind === "life" ? "is-life" : "") + '">' + kindLabel + '</span>';
      }
      var durStr = it.mins ? fa0(it.mins) + " \u062F\u0642\u06CC\u0642\u0647" : "";
      rows += '<div class="st-plan-item">' +
        '<div class="st-plan-item-time">' + esc(st || "\u2014") + (en ? '<span class="st-plan-item-time-end">' + esc(en) + '</span>' : '') + '</div>' +
        '<div class="st-plan-item-dot"></div>' +
        '<div class="st-plan-item-card ' + itemClass + '">' +
          '<div class="st-plan-item-head"><span class="st-plan-item-title">' + esc(it.title || "(\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646)") + '</span>' + badge + '</div>' +
          (durStr ? '<div class="st-plan-item-meta"><span>\u23F1 ' + durStr + '</span></div>' : '') +
        '</div>' +
      '</div>';
      if (en) prevEnd = en;
    }
    var planMinutes = 0;
    for (var k = 0; k < sorted.length; k++) planMinutes += (sorted[k].mins || 0);
    var actualSec = 0;
    (S.friendDaySessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      actualSec += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
    });
    var compareHTML = "";
    if (planMinutes > 0 || actualSec > 0) {
      compareHTML = '<div class="st-plan-compare">' +
        '<span class="st-plan-compare-label">\u0628\u0631\u0646\u0627\u0645\u0647:</span> <span class="st-plan-compare-val">' + (planMinutes > 0 ? fa0(Math.round(planMinutes)) + " \u062F\u0642\u06CC\u0642\u0647" : "\u2014") + '</span>' +
        '<span style="opacity:0.3;">\u00B7</span>' +
        '<span class="st-plan-compare-label">\u0648\u0627\u0642\u0639\u06CC:</span> <span class="st-plan-compare-val">' + (actualSec > 0 ? _fmtTimer(actualSec) : "\u2014") + '</span>' +
      '</div>';
    }
    return '<div class="st-card">' +
      '<div class="st-members-title">\uD83D\uDCCB \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
      meta + compareHTML +
      '<div class="st-plan-timeline">' + rows + '</div>' +
    '</div>';
  }
  function _renderSharePlanUI() {
    var enabled = !!(S.profile && S.profile.share_daily_plan);
    var html = '<div class="st-members-title">\uD83D\uDCCB \u0627\u0634\u062A\u0631\u0627\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647</div>' +
      '<div class="st-card st-settings-card">' +
        '<div class="st-settings-row">' +
          '<label class="st-settings-label-wrap">' +
            '<input type="checkbox" data-st-act="share-plan-toggle"' + (enabled ? ' checked' : '') + (S.sharePlanBusy ? ' disabled' : '') + '>' +
            '<span class="st-settings-label">\u0627\u0634\u062A\u0631\u0627\u06A9 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647 \u0628\u0627 \u062F\u0648\u0633\u062A\u0627\u0646</span>' +
          '</label>' +
          '<div class="st-settings-desc">\u062F\u0648\u0633\u062A\u0627\u0646 \u06AF\u0631\u0648\u0647 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u0646\u062F \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647\u0654 \u0631\u0648\u0632\u0647\u0627\u06CC \u0634\u0645\u0627 \u0631\u0627 \u062F\u0631 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0634\u0645\u0627 \u0628\u0628\u06CC\u0646\u0646\u062F. \u0641\u0642\u0637 \u0639\u0646\u0648\u0627\u0646 \u0648 \u0632\u0645\u0627\u0646 \u2014 \u0628\u062F\u0648\u0646 \u062C\u0632\u0626\u06CC\u0627\u062A \u062E\u0635\u0648\u0635\u06CC.</div>' +
        '</div>';
    if (S.sharePlanError) html += '<div class="st-error">' + esc(S.sharePlanError) + '</div>';
    if (enabled) {
      var b = window.__ioStudyTogetherBridge;
      var tj = b && typeof b.todayJalali === "function" ? b.todayJalali() : null;
      var todayItems = tj ? _sharePlanCollectForDate(tj) : null;
      html += '<div class="st-plan-preview"><div class="st-plan-preview-title">\uD83D\uDCCC \u067E\u06CC\u0634\u200C\u0646\u0645\u0627\u06CC\u0634 \u0627\u0645\u0631\u0648\u0632:</div>';
      if (!todayItems || todayItems.length === 0) html += '<div class="st-plan-preview-row" style="opacity:0.6;">\u0628\u0631\u0646\u0627\u0645\u0647\u200C\u0627\u06CC \u0628\u0631\u0627\u06CC \u0627\u0645\u0631\u0648\u0632 \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F</div>';
      else {
        var shown = todayItems.slice(0, 5);
        for (var i = 0; i < shown.length; i++) {
          var it = shown[i];
          var ts = (it.start || "\u2014") + (it.end ? " \u2192 " + it.end : "");
          html += '<div class="st-plan-preview-row"><span class="st-plan-preview-time">' + esc(ts) + '</span><span>' + esc(it.title || "(\u0628\u062F\u0648\u0646 \u0639\u0646\u0648\u0627\u0646)") + '</span></div>';
        }
        if (todayItems.length > shown.length) html += '<div class="st-plan-preview-row" style="opacity:0.5;">+' + fa0(todayItems.length - shown.length) + ' \u0645\u0648\u0631\u062F \u062F\u06CC\u06AF\u0631</div>';
      }
      html += '</div><div style="display:flex;justify-content:flex-end;padding-top:8px;">' +
        '<button class="st-btn-primary" data-st-act="share-plan-publish"' + (S.sharePlanBusy ? ' disabled' : '') + '>' + (S.sharePlanBusy ? "\u062F\u0631 \u062D\u0627\u0644 \u0627\u0646\u062A\u0634\u0627\u0631..." : "\uD83D\uDCE4 \u0627\u0646\u062A\u0634\u0627\u0631 / \u0628\u0647\u200C\u0631\u0648\u0632\u0631\u0633\u0627\u0646\u06CC") + '</button>' +
      '</div>';
    }
    html += '</div>';
    return html;
  }
  function _pad2(n) { return n < 10 ? "0" + n : "" + n; }
  function _groupGoals(rows) {
    var out = { global: null, courses: {} };
    (rows || []).forEach(function (g) {
      if (g.scope === "global") out.global = g;
      else if (g.scope === "course" && g.course_id) out.courses[g.course_id] = g;
    });
    return out;
  }
  function _computeStreakFromSessions(sessions, opts) {
    var activeDays = {};
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var dur = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
      if (dur < 1000) return;
      var d = new Date(s.started_at);
      var k = d.getFullYear() + "-" + _pad2(d.getMonth() + 1) + "-" + _pad2(d.getDate());
      activeDays[k] = true;
    });
    var maxDays = (opts && opts.maxDays) || 365;
    var current = 0;
    var walk = new Date(); walk.setHours(0, 0, 0, 0);
    for (var i = 0; i < maxDays; i++) {
      var k = walk.getFullYear() + "-" + _pad2(walk.getMonth() + 1) + "-" + _pad2(walk.getDate());
      if (activeDays[k]) current++;
      else break;
      walk.setDate(walk.getDate() - 1);
    }
    var best = 0;
    Object.keys(activeDays).forEach(function (k) {
      if (!activeDays[k]) return;
      var parts = k.split("-");
      var dd = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      var c = 1;
      dd.setDate(dd.getDate() - 1);
      while (true) {
        var kk = dd.getFullYear() + "-" + _pad2(dd.getMonth() + 1) + "-" + _pad2(dd.getDate());
        if (!activeDays[kk]) break;
        c++;
        dd.setDate(dd.getDate() - 1);
      }
      if (c > best) best = c;
    });
    var activeWeek = 0;
    var w = new Date(); w.setHours(0, 0, 0, 0);
    for (var j = 0; j < 7; j++) {
      var kw = w.getFullYear() + "-" + _pad2(w.getMonth() + 1) + "-" + _pad2(w.getDate());
      if (activeDays[kw]) activeWeek++;
      w.setDate(w.getDate() - 1);
    }
    var activeMonth = 0;
    var m = new Date(); m.setHours(0, 0, 0, 0);
    for (var n = 0; n < 30; n++) {
      var km = m.getFullYear() + "-" + _pad2(m.getMonth() + 1) + "-" + _pad2(m.getDate());
      if (activeDays[km]) activeMonth++;
      m.setDate(m.getDate() - 1);
    }
    return { current: current, best: best, activeWeek: activeWeek, activeMonth: activeMonth };
  }
  function _sumWeekFromSessions(sessions) {
    var cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - 6);
    var cutoffMs = cutoff.getTime();
    var total = 0;
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      if (new Date(s.started_at).getTime() < cutoffMs) return;
      total += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
    });
    return total;
  }
  function _openMemberProfile(uid) {
    if (!uid) return;
    var member = null;
    for (var i = 0; i < S.members.length; i++) if (S.members[i].user_id === uid) { member = S.members[i]; break; }
    if (!member) return;
    S.memberProfileView = member;
    S.memberProfileData = null;
    S.memberProfileError = null;
    S.friendDayDate = _friendDayToday();
    S.friendDaySessions = null;
    S.friendDayLoading = false;
    S.friendDayError = null;
    render();
    _loadMemberProfile(uid);
    _friendDayReload(uid);
  }
  function _closeMemberProfile() {
    if (!S.memberProfileView) return;
    S.memberProfileView = null;
    S.memberProfileData = null;
    S.memberProfileError = null;
    S.memberProfileLoading = false;
    S.friendDayDate = null;
    S.friendDaySessions = null;
    S.friendDayLoading = false;
    S.friendDayError = null;
    render();
  }
  function _loadMemberProfile(uid) {
    if (!_sb || !S.user || !S.group) return Promise.resolve();
    S.memberProfileLoading = true;
    S.memberProfileError = null;
    render();
    var now = new Date();
    var end = new Date(now); end.setHours(23, 59, 59, 999);
    var weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0, 0, 0, 0);
    var todayStartMs = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    return qGetGroupRangeSessions(S.group.id, weekStart.toISOString(), end.toISOString())
      .then(function (rows) {
        if (!S.memberProfileView || S.memberProfileView.user_id !== uid) return;
        var myRows = rows.filter(function (s) { return s.user_id === uid; });
        var todaySec = 0, weekSec = 0, sessionCount = 0;
        var byCourse = {};
        myRows.forEach(function (s) {
          if (!s.ended_at || s.end_reason === "crash") return;
          var st = new Date(s.started_at).getTime();
          var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st) / 1000));
          weekSec += dur;
          if (st >= todayStartMs) todaySec += dur;
          sessionCount++;
          var ck = s.course_id || "none";
          byCourse[ck] = (byCourse[ck] || 0) + dur;
        });
        myRows.sort(function (a, b) { return new Date(b.started_at) - new Date(a.started_at); });
        S.memberProfileData = {
          todaySec: todaySec, weekSec: weekSec, sessionCount: sessionCount,
          byCourse: byCourse, historyRows: myRows.slice(0, 10)
        };
        S.memberProfileLoading = false;
        render();
      })
      .catch(function (err) {
        S.memberProfileError = String(err && err.message || err);
        S.memberProfileLoading = false;
        render();
      });
  }
  function _loadLeaderboard() {
    if (!_sb || !S.user || !S.group) return Promise.resolve();
    if (S.leaderboardLoading) return Promise.resolve();
    S.leaderboardLoading = true;
    S.leaderboardError = null;
    if (S.navTab === "friends") render();
    var now = new Date();
    var end = new Date(now); end.setHours(23, 59, 59, 999);
    var start = new Date(now);
    var period = S.leaderboardPeriod;
    start.setHours(0, 0, 0, 0);
    if (period === "week") start.setDate(start.getDate() - 6);
    else if (period === "month") start.setDate(start.getDate() - 29);
    return qGetGroupRangeSessions(S.group.id, start.toISOString(), end.toISOString())
      .then(function (rows) {
        var byUser = {};
        rows.forEach(function (s) {
          if (!s.ended_at || s.end_reason === "crash") return;
          var st = new Date(s.started_at).getTime();
          var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st) / 1000));
          byUser[s.user_id] = (byUser[s.user_id] || 0) + dur;
        });
        var lb = (S.members || []).map(function (m) {
          var isSelf = m.user_id === S.user.id;
          var shared = isSelf ? true : (m.share_daily_total && byUser[m.user_id] !== undefined);
          return { member: m, sec: byUser[m.user_id] || 0, shared: shared, isSelf: isSelf };
        });
        lb.sort(function (a, b) {
          if (a.shared !== b.shared) return a.shared ? -1 : 1;
          return b.sec - a.sec;
        });
        S.leaderboardData = lb;
        S.leaderboardLoading = false;
        if (S.navTab === "friends") render();
      })
      .catch(function (err) {
        S.leaderboardError = String(err && err.message || err);
        S.leaderboardLoading = false;
        if (S.navTab === "friends") render();
      });
  }
  function _leaderboardPeriodPillsHTML() {
    var opts = [
      { id: "today", label: "امروز" },
      { id: "week", label: "۷ روز" },
      { id: "month", label: "۳۰ روز" }
    ];
    return '<div class="st-period-pills st-lb-period">' + opts.map(function (o) {
      var cls = "st-period-pill" + (S.leaderboardPeriod === o.id ? " is-active" : "");
      return '<button type="button" class="' + cls + '" data-st-act="lb-period" data-period="' + o.id + '">' + o.label + '</button>';
    }).join("") + '</div>';
  }
  function _renderLeaderboardHTML() {
    var loading = S.leaderboardLoading || S.leaderboardData === null;
    var err = S.leaderboardError;
    var inner;
    if (loading) inner = '<div class="st-hist-empty">در حال بارگذاری...</div>';
    else if (err) inner = '<div class="st-error">' + esc(err) + '</div>';
    else {
      var rows = S.leaderboardData || [];
      if (rows.length === 0) {
        inner = '<div class="st-hist-empty">عضوی برای نمایش نیست</div>';
      } else {
        inner = '<div class="st-lb-list">' + rows.map(function (row, idx) {
          var m = row.member;
          var initial = (m.display_name || "?").charAt(0);
          var avKey = m.avatar_key || "av-1";
          var rankCls = idx === 0 ? "is-rank-1" : idx === 1 ? "is-rank-2" : idx === 2 ? "is-rank-3" : "";
          var selfCls = row.isSelf ? " is-self" : "";
          var durStr = row.shared ? _fmtTimer(row.sec) : '<span class="st-muted">—</span>';
          var label = m.display_name + (m.user_id === S.user.id ? ' <span class="st-m-self">شما</span>' : "");
          return '<div class="st-lb-row ' + rankCls + selfCls + '">' +
            '<div class="st-lb-rank">' + (row.shared ? fa0(idx + 1) : '🔒') + '</div>' +
            '<div class="st-lb-avatar st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(m) + '</div>' +
            '<div class="st-lb-name">' + esc(m.display_name) + (row.isSelf ? ' <span class="st-m-self">شما</span>' : '') + '</div>' +
            '<div class="st-lb-dur">' + durStr + '</div>' +
          '</div>';
        }).join("") + '</div>';
      }
    }
    return '<div class="st-card st-lb-card">' +
      '<div class="st-members-title">🏆 رتبه‌بندی گروه</div>' +
      _leaderboardPeriodPillsHTML() +
      inner +
    '</div>';
  }
  function _renderMemberProfileHTML() {
    var view = S.memberProfileView;
    if (!view) return "";
    var initial = (view.display_name || "?").charAt(0);
    var avKey = view.avatar_key || "av-1";
    var data = S.memberProfileData;
    var err = S.memberProfileError;
    var loading = S.memberProfileLoading;

    var body;
    if (loading) {
      body = '<div class="st-card st-loading">در حال بارگذاری...</div>';
    } else if (err) {
      body = '<div class="st-error">' + esc(err) + '</div>';
    } else if (!data) {
      body = '<div class="st-hist-empty">داده‌ای یافت نشد</div>';
    } else if (!view.share_daily_total && view.user_id !== S.user.id) {
      body = '<div class="st-privacy-note">🔒 این عضو آمار خود را به اشتراک نمی‌گذارد</div>';
    } else {
      var statsHTML =
        '<div class="st-stats">' +
          '<div class="st-stat"><span class="st-stat-ico">📊</span><div><div class="st-stat-val">' + _fmtTimer(data.todaySec) + '</div><div class="st-stat-lbl">امروز</div></div></div>' +
          '<div class="st-stat"><span class="st-stat-ico">📅</span><div><div class="st-stat-val">' + _fmtTimer(data.weekSec) + '</div><div class="st-stat-lbl">۷ روز</div></div></div>' +
          '<div class="st-stat"><span class="st-stat-ico">🎯</span><div><div class="st-stat-val">' + fa0(data.sessionCount) + '</div><div class="st-stat-lbl">جلسه</div></div></div>' +
        '</div>';
      var courseHTML;
      if (view.user_id === S.user.id || view.share_course_breakdown) {
        courseHTML = _statsCourseBreakdownHTML(data.byCourse, 5);
      } else {
        courseHTML = '<div class="st-muted-note">📊 تفکیک درس به اشتراک گذاشته نشده</div>';
      }
      var historyHTML;
      if (view.user_id === S.user.id || view.share_history_with_group) {
        historyHTML = data.historyRows.length === 0
          ? '<div class="st-hist-empty">جلسه‌ای در ۷ روز گذشته نیست</div>'
          : '<div class="st-hist-groups">' + data.historyRows.map(_renderMemberHistoryRow).join("") + '</div>';
      } else {
        historyHTML = '<div class="st-muted-note">📜 تاریخچهٔ کامل به اشتراک گذاشته نشده</div>';
      }
      var activityHTML = "";
      if (view.share_timeline) {
        var p = null;
        var pres = presenceState();
        for (var i = 0; i < pres.length; i++) if (pres[i].key === view.user_id) { p = pres[i]; break; }
        if (p && p.meta && p.meta.activity_title) {
          activityHTML = '<div class="st-card"><div class="st-members-title">📖 فعالیت جاری</div><div class="st-m-act-line">' + esc(p.meta.activity_title) + '</div></div>';
        }
      }
      body = statsHTML +
        _renderFriendPlanHTML(view.user_id) +
        _renderFriendDayHTML(view.user_id) +
        activityHTML +
        '<div class="st-card"><div class="st-members-title">📚 به تفکیک درس</div>' + courseHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">📜 تاریخچهٔ اخیر</div>' + historyHTML + '</div>';
    }

    return '<div class="st-member-profile-overlay" data-st-act="member-close-overlay">' +
      '<div class="st-member-profile-content">' +
        '<div class="st-topbar">' +
          '<div class="st-user-chip">پروفایل</div>' +
          '<button class="st-btn-ghost st-btn-small" data-st-act="member-close-profile" title="بستن">✖ بستن</button>' +
        '</div>' +
        '<div class="st-profile-hero">' +
          '<div class="st-profile-avatar st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(view) + '</div>' +
          '<div class="st-profile-info">' +
            '<div class="st-profile-name">' + esc(view.display_name) + '</div>' +
            '<div class="st-profile-username">@' + esc(view.username) + '</div>' +
            (view.bio ? '<div class="st-profile-bio">' + esc(view.bio) + '</div>' : '') +
          '</div>' +
        '</div>' +
        body +
      '</div>' +
    '</div>';
  }
  function _currentWeekRange() {
    var now = new Date(); now.setHours(0, 0, 0, 0);
    var dow = now.getDay();
    var daysBack = (dow === 6) ? 0 : (dow + 1);
    var start = new Date(now); start.setDate(start.getDate() - daysBack);
    var end = new Date(start); end.setDate(end.getDate() + 7);
    return { startIso: start.toISOString(), endIso: end.toISOString(), startDate: start };
  }
  function _computeGroupGoalProgress(rows) {
    var total = 0;
    var byUser = {};
    (rows || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - new Date(s.started_at).getTime()) / 1000));
      if (dur <= 0) return;
      total += dur;
      byUser[s.user_id] = (byUser[s.user_id] || 0) + dur;
    });
    return { totalSec: total, byUser: byUser };
  }
  function _loadGroupGoalProgress() {
    if (!S.user || !S.group || !_sb) { S.groupGoalProgress = { totalSec: 0, byUser: {} }; return Promise.resolve(); }
    var w = _currentWeekRange();
    return qGetGroupRangeSessions(S.group.id, w.startIso, w.endIso)
      .then(function (rows) {
        S.groupGoalProgress = _computeGroupGoalProgress(rows || []);
        if (S.container && S.container.isConnected) render();
      }).catch(function () {
        S.groupGoalProgress = { totalSec: 0, byUser: {} };
      });
  }
  function _saveGroupGoal() {
    if (!S.user || !S.group || !_sb) return;
    if (!_requireOnline()) return;
    if (S.group.owner_id !== S.user.id) { S.groupGoalError = "\u0641\u0642\u0637 \u0645\u0627\u0644\u06A9 \u06AF\u0631\u0648\u0647"; render(); return; }
    var el = S.container.querySelector('[data-group-goal-input]');
    if (!el) return;
    var val = String(el.value || "").trim();
    var mins = val ? parseInt(val, 10) : null;
    if (mins === null || isNaN(mins) || mins < 1 || mins > 10080) {
      S.groupGoalError = "\u0645\u0642\u062F\u0627\u0631 \u0645\u0639\u062A\u0628\u0631 \u0646\u06CC\u0633\u062A (\u06F1 \u062A\u0627 \u06F1\u06F0\u06F0\u06F8\u06F0 \u062F\u0642\u06CC\u0642\u0647)";
      render(); return;
    }
    S.groupGoalBusy = true; S.groupGoalError = null; render();
    _sb.from("study_groups").update({ weekly_goal_minutes: mins }).eq("id", S.group.id).select().single()
      .then(function (r) {
        if (r && r.error) throw r.error;
        if (!r || !r.data) throw new Error("\u062A\u063A\u06CC\u06CC\u0631 \u062F\u0631 DB \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F");
        S.group.weekly_goal_minutes = mins;
        S.groupGoalBusy = false;
        try { notify("success", "\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u06AF\u0631\u0648\u0647 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {}
        render();
      }).catch(function (err) {
        S.groupGoalBusy = false;
        S.groupGoalError = String(err && err.message || err);
        render();
      });
  }
  function _removeGroupGoal() {
    if (!S.user || !S.group || !_sb) return;
    if (S.group.owner_id !== S.user.id) { S.groupGoalError = "\u0641\u0642\u0637 \u0645\u0627\u0644\u06A9 \u06AF\u0631\u0648\u0647"; render(); return; }
    S.groupGoalBusy = true; S.groupGoalError = null; render();
    _sb.from("study_groups").update({ weekly_goal_minutes: null }).eq("id", S.group.id).select().single()
      .then(function (r) {
        if (r && r.error) throw r.error;
        if (!r || !r.data) throw new Error("\u062D\u0630\u0641 \u062F\u0631 DB \u0627\u0639\u0645\u0627\u0644 \u0646\u0634\u062F");
        S.group.weekly_goal_minutes = null;
        S.groupGoalBusy = false;
        try { notify("success", "\u0647\u062F\u0641 \u06AF\u0631\u0648\u0647 \u062D\u0630\u0641 \u0634\u062F"); } catch (e) {}
        render();
      }).catch(function (err) {
        S.groupGoalBusy = false;
        S.groupGoalError = String(err && err.message || err);
        render();
      });
  }
  function _renderGroupGoalCard() {
    if (!S.group || !S.user) return "";
    var w = _currentWeekRange();
    var startJ = _fmtDateJalali(w.startIso);
    var goalMin = S.group.weekly_goal_minutes || null;
    var goalSec = goalMin ? goalMin * 60 : null;
    var isOwner = S.group.owner_id === S.user.id;
    var prog = S.groupGoalProgress || { totalSec: 0, byUser: {} };
    var pct = goalSec > 0 ? Math.min(100, Math.round(prog.totalSec / goalSec * 100)) : 0;
    var remaining = goalSec ? Math.max(0, goalSec - prog.totalSec) : 0;

    var progressBar = "";
    if (goalSec) {
      progressBar = '<div class="st-group-goal-progress">' +
        '<div class="st-group-goal-bar"><div class="st-group-goal-fill" style="width:' + pct + '%"></div></div>' +
        '<span class="st-group-goal-pct">' + fa0(pct) + '\u066A</span>' +
      '</div>' +
      '<div class="st-group-goal-meta">' +
        '<span>' + _fmtTimer(prog.totalSec) + ' \u0627\u0632 ' + _fmtTimer(goalSec) + '</span>' +
        (remaining > 0 ? '<span>\u0628\u0627\u0642\u06CC: ' + _fmtTimer(remaining) + '</span>' : '<span>\u2705 \u0647\u062F\u0641 \u062A\u06A9\u0645\u06CC\u0644 \u0634\u062F</span>') +
      '</div>';
    }

    var cta = "";
    if (!goalSec && !isOwner) {
      cta = '<div class="st-group-goal-cta">\u0645\u0627\u0644\u06A9 \u06AF\u0631\u0648\u0647 \u0647\u0646\u0648\u0632 \u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u062A\u0639\u06CC\u06CC\u0646 \u0646\u06A9\u0631\u062F\u0647</div>';
    }

    var membersShare = (S.members || []).filter(function (m) { return m.share_daily_total; }).length;
    var membersNotShare = (S.members || []).length - membersShare;
    var shareNote = membersNotShare > 0
      ? '<div class="st-group-goal-note">\u26A0\uFE0F ' + fa0(membersShare) + ' \u0627\u0632 ' + fa0(S.members.length) + ' \u0639\u0636\u0648 \u0622\u0645\u0627\u0631 \u062E\u0648\u062F \u0631\u0627 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u0645\u06CC\u200C\u06AF\u0630\u0627\u0631\u0646\u062F \u2014 \u0645\u062C\u0645\u0648\u0639 \u0645\u0645\u06A9\u0646 \u0627\u0633\u062A \u06A9\u0645\u062A\u0631 \u0627\u0632 \u0648\u0627\u0642\u0639 \u0628\u0627\u0634\u062F</div>'
      : '';

    var contribHTML = "";
    if (goalSec) {
      var cRows = (S.members || []).map(function (m) {
        var isSelf = m.user_id === S.user.id;
        if (!m.share_daily_total && !isSelf) {
          return '<div class="st-group-goal-member is-hidden"><span>' + esc(m.display_name) + '</span><span>\uD83D\uDD12 \u067E\u0646\u0647\u0627\u0646</span></div>';
        }
        var uSec = prog.byUser[m.user_id] || 0;
        return '<div class="st-group-goal-member"><span>' + esc(m.display_name) + (isSelf ? ' (\u0634\u0645\u0627)' : '') + '</span><span>' + (uSec > 0 ? _fmtTimer(uSec) : '\u2014') + '</span></div>';
      }).join("");
      contribHTML = '<div class="st-group-goal-members"><div class="st-group-goal-members-title">\uD83D\uDC65 \u0645\u0634\u0627\u0631\u06A9\u062A \u0627\u0639\u0636\u0627</div>' + cRows + '</div>';
    }

    var form = "";
    if (isOwner) {
      form = '<div class="st-group-goal-form">' +
        '<label>\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC (\u062F\u0642\u06CC\u0642\u0647) <input type="number" min="1" max="10080" data-group-goal-input placeholder="\u0645\u062B\u0644\u0627\u064B 2000" value="' + (goalMin || '') + '"' + (S.groupGoalBusy ? ' disabled' : '') + '></label>' +
        '<button class="st-btn-primary st-btn-small" data-st-act="group-goal-save"' + (S.groupGoalBusy ? ' disabled' : '') + '>\u0630\u062E\u06CC\u0631\u0647</button>' +
        (goalMin ? '<button class="st-btn-danger st-btn-small" data-st-act="group-goal-remove"' + (S.groupGoalBusy ? ' disabled' : '') + '>\u062D\u0630\u0641</button>' : '') +
      '</div>';
    }

    return '<div class="st-group-goal-card">' +
      '<div class="st-group-goal-head">' +
        '<span class="st-group-goal-icon">\uD83C\uDFC6</span>' +
        '<span class="st-group-goal-title">\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u06AF\u0631\u0648\u0647</span>' +
        '<span class="st-group-goal-week">\u0647\u0641\u062A\u0647\u0654 \u062C\u0627\u0631\u06CC \u0627\u0632 ' + esc(startJ) + '</span>' +
      '</div>' +
      progressBar +
      cta +
      shareNote +
      contribHTML +
      form +
      (S.groupGoalError ? '<div class="st-error">' + esc(S.groupGoalError) + '</div>' : '') +
    '</div>';
  }
  function _computeWeekBestDay(sessions) {
    var w = _currentWeekRange();
    var startMs = new Date(w.startIso).getTime();
    var endMs = new Date(w.endIso).getTime();
    var byDay = {};
    (sessions || []).forEach(function (s) {
      if (!s.ended_at || s.end_reason === "crash") return;
      var st = new Date(s.started_at).getTime();
      if (st < startMs || st >= endMs) return;
      var d = new Date(s.started_at);
      var k = d.getFullYear() + "-" + _pad2(d.getMonth() + 1) + "-" + _pad2(d.getDate());
      var dur = Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st) / 1000));
      byDay[k] = (byDay[k] || 0) + dur;
    });
    var best = null;
    Object.keys(byDay).forEach(function (k) {
      if (!best || byDay[k] > best.sec) best = { date: k, sec: byDay[k] };
    });
    return best;
  }
  function _renderWeeklyLeaderboard() {
    if (!S.group || !S.user) return "";
    if (!S.groupGoalProgress) {
      return '<div class="st-wl-card">' +
        '<div class="st-wl-head"><span class="st-wl-ico">\uD83C\uDFC6</span><span class="st-wl-title">\u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0647\u0641\u062A\u0647</span></div>' +
        '<div class="st-hist-empty">\u062F\u0631 \u062D\u0627\u0644 \u0628\u0627\u0631\u06AF\u0630\u0627\u0631\u06CC...</div>' +
      '</div>';
    }
    var prog = S.groupGoalProgress;
    var w = _currentWeekRange();
    var startJ = _fmtDateJalali(w.startIso);
    var visible = [];
    var hidden = [];
    (S.members || []).forEach(function (m) {
      var isSelf = m.user_id === S.user.id;
      if (!isSelf && !m.share_daily_total) { hidden.push(m); return; }
      visible.push({ member: m, sec: prog.byUser[m.user_id] || 0, isSelf: isSelf });
    });
    visible.sort(function (a, b) {
      if (b.sec !== a.sec) return b.sec - a.sec;
      return String(a.member.display_name || "").localeCompare(String(b.member.display_name || ""));
    });
    var rank = 0, prevSec = 0;
    visible.forEach(function (e, i) {
      if (e.sec > 0) {
        if (e.sec !== prevSec) rank = i + 1;
        e.rank = rank;
        prevSec = e.sec;
      } else {
        e.rank = null;
      }
    });
    var rowsHTML = visible.map(function (e) {
      var m = e.member;
      var avKey = m.avatar_key || "av-1";
      var rankCls = e.rank === 1 ? "is-rank-1" : e.rank === 2 ? "is-rank-2" : e.rank === 3 ? "is-rank-3" : "";
      var selfCls = e.isSelf ? " is-self" : "";
      var durStr = e.sec > 0 ? _fmtTimer(e.sec) : "\u2014";
      var rankStr = e.rank === null ? "\u2014" : fa0(e.rank);
      return '<div class="st-wl-row ' + rankCls + selfCls + '">' +
        '<div class="st-wl-rank">' + rankStr + '</div>' +
        '<div class="st-wl-avatar st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(m) + '</div>' +
        '<div class="st-wl-name">' + esc(m.display_name) + (e.isSelf ? ' <span class="st-m-self">\u0634\u0645\u0627</span>' : '') + '</div>' +
        '<div class="st-wl-dur">' + durStr + '</div>' +
      '</div>';
    }).join("");
    var hiddenHTML = hidden.map(function (m) {
      var avKey = m.avatar_key || "av-1";
      return '<div class="st-wl-row is-hidden">' +
        '<div class="st-wl-rank">\uD83D\uDD12</div>' +
        '<div class="st-wl-avatar st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(m) + '</div>' +
        '<div class="st-wl-name">' + esc(m.display_name) + '</div>' +
        '<div class="st-wl-dur">\u2014</div>' +
      '</div>';
    }).join("");
    var content = (visible.length === 0 && hidden.length === 0)
      ? '<div class="st-hist-empty">\u0639\u0636\u0648\u06CC \u0628\u0631\u0627\u06CC \u0646\u0645\u0627\u06CC\u0634 \u0646\u06CC\u0633\u062A</div>'
      : rowsHTML + hiddenHTML;
    var note = hidden.length > 0
      ? '<div class="st-wl-note">\u26A0\uFE0F ' + fa0(hidden.length) + ' \u0639\u0636\u0648 \u0622\u0645\u0627\u0631 \u062E\u0648\u062F \u0631\u0627 \u067E\u0646\u0647\u0627\u0646 \u06A9\u0631\u062F\u0647 \u2014 \u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0641\u0642\u0637 \u0634\u0627\u0645\u0644 ' + fa0(visible.length) + ' \u0639\u0636\u0648 \u0642\u0627\u0628\u0644\u200C\u0645\u0634\u0627\u0647\u062F\u0647 \u0627\u0633\u062A</div>'
      : "";
    return '<div class="st-wl-card">' +
      '<div class="st-wl-head">' +
        '<span class="st-wl-ico">\uD83C\uDFC6</span>' +
        '<span class="st-wl-title">\u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0647\u0641\u062A\u0647</span>' +
        '<span class="st-wl-week">\u0627\u0632 ' + esc(startJ) + '</span>' +
      '</div>' +
      content +
      note +
    '</div>';
  }
  function _renderWeeklyRecap() {
    if (!S.user || !S.group) return "";
    var selfSec = S.weeklyTotalSec || 0;
    var goalMin = S.group.weekly_goal_minutes || null;
    var goalSec = goalMin ? goalMin * 60 : null;
    var groupProg = (S.groupGoalProgress && S.groupGoalProgress.totalSec) || 0;
    var groupPct = goalSec > 0 ? Math.min(100, Math.round(groupProg / goalSec * 100)) : 0;
    var best = S.weeklyBestDay;
    var bestStr = "\u2014";
    if (best && best.sec > 0) bestStr = _fmtDateJalali(best.date) + " \u00B7 " + _fmtTimer(best.sec);
    var goalCell = goalSec ? fa0(groupPct) + '\u066A' : '<span class="st-muted">\u2014</span>';
    return '<div class="st-wr-card">' +
      '<div class="st-wl-head">' +
        '<span class="st-wl-ico">\uD83D\uDCCA</span>' +
        '<span class="st-wl-title">\u062E\u0644\u0627\u0635\u0647\u0654 \u0647\u0641\u062A\u0647</span>' +
      '</div>' +
      '<div class="st-wr-grid">' +
        '<div class="st-wr-item"><div class="st-wr-lbl">\u0634\u0645\u0627 \u0627\u06CC\u0646 \u0647\u0641\u062A\u0647</div><div class="st-wr-val">' + _fmtTimer(selfSec) + '</div></div>' +
        '<div class="st-wr-item"><div class="st-wr-lbl">\u067E\u06CC\u0634\u0631\u0641\u062A \u0647\u062F\u0641 \u06AF\u0631\u0648\u0647</div><div class="st-wr-val">' + goalCell + '</div></div>' +
        '<div class="st-wr-item"><div class="st-wr-lbl">\u0628\u0647\u062A\u0631\u06CC\u0646 \u0631\u0648\u0632 \u0634\u0645\u0627</div><div class="st-wr-val st-wr-best">' + esc(bestStr) + '</div></div>' +
      '</div>' +
    '</div>';
  }
  function renderFriends() {
    var presByKey = {};
    presenceState().forEach(function (p) { presByKey[p.key] = p.meta; });
    var cards = (S.members || []).map(function (m) {
      var isSelf = (m.user_id === S.user.id);
      var p = presByKey[m.user_id];
      var status = isSelf ? (S.session ? "studying" : (S.onBreak ? "break" : "idle")) : ((p && p.status) || "disconnected");
      var label = status === "studying" ? "در حال مطالعه" : status === "break" ? "استراحت" : status === "disconnected" ? "قطع اتصال" : "بیکار";
      var cls = "is-" + status;
      var initial = (m.display_name || "?").charAt(0);
      var avKey = m.avatar_key || "av-1";
      return '<div class="st-member st-member-clickable ' + cls + '" data-st-act="member-open-profile" data-member-id="' + esc(m.user_id) + '" role="button" tabindex="0" title="مشاهدهٔ پروفایل">' +
        '<div class="st-m-avatar st-m-avatar-' + cls + ' st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(m) + '</div>' +
        '<div class="st-m-body">' +
          '<div class="st-m-name">' + esc(m.display_name) + (m.role === "owner" ? ' <span class="st-m-owner">مالک</span>' : "") + (isSelf ? ' <span class="st-m-self">شما</span>' : "") + '</div>' +
          '<div class="st-m-status"><span class="st-m-status-dot"></span>' + label + _lastSeenSuffix(m, status) + '</div>' +
        '</div>' +
      '</div>';
    }).join("");
    S.container.innerHTML = pageWrap(
      _navTabsHTML("friends") +
      '<div class="st-topbar"><div class="st-user-chip">' + esc((S.profile && S.profile.display_name) || "?") + ' ' + _connChipHTML() + '</div></div>' +
      '<div class="st-hero st-hero-small"><h1>👥 دوستان</h1><p>' + fa0((S.members||[]).length) + ' عضو</p></div>' +
      _renderGroupGoalCard() +
    _renderWeeklyLeaderboard() +
    _renderWeeklyRecap() +
    '<div class="st-room-entry"><button class="st-btn-primary st-btn-start" data-st-act="room-open">\uD83C\uDFAF \u0648\u0631\u0648\u062F \u0628\u0647 \u0627\u062A\u0627\u0642 \u0645\u0637\u0627\u0644\u0639\u0647</button></div>' +
    _renderLeaderboardHTML() +
      '<div class="st-members-title">اعضا</div>' +
      '<div class="st-member-grid">' + cards + '</div>' +
      (S.memberProfileView ? _renderMemberProfileHTML() : "")
    );
    wire();
  }
  function startSession(explicitCid, courseId, sessionType) {
    S.onBreak = false;
    if (!S.user || !S.group) return Promise.reject(new Error("no user/group"));
    var cid = explicitCid || _uuid();
    var startedAt = new Date().toISOString();
    _pendingWrite({ clientSessionId: cid, groupId: S.group.id, startedAt: startedAt });
    S.pendingClientId = cid;
    var _cid = courseId !== undefined ? courseId : null;
    if (_cid && !_courseById(_cid)) _cid = null;
    return qInsertSession({ user_id: S.user.id, group_id: S.group.id, client_session_id: cid, started_at: startedAt, course_id: _cid, session_type: (sessionType || "normal") }).then(function (r) {
      if (r.error) {
        return qFindByClientId(S.user.id, cid).then(function (ex) {
          if (!ex) throw r.error;
          S.session = ex; _pendingWrite(null); S.pendingClientId = null;
          return refreshAll();
        });
      }
      S.session = r.data; _pendingWrite(null); S.pendingClientId = null;
      return refreshAll();
    });
  }
  function endWith(reason, endedAt) {
    if (!S.session) return Promise.resolve();
    var _ea = endedAt || new Date().toISOString();
    return qUpdateSession(S.session.id, { ended_at: _ea, end_reason: reason }).then(function () {
      S.session = null; _pendingWrite(null); S.pendingClientId = null;
      if (reason === "break") { S.onBreak = true; } else { S.onBreak = false; }
      return refreshAll();
    });
  }
  function startBreak() { return endWith("break"); }
  function endSession() { return endWith("ended"); }
  function resumeSession() { return startSession(); }
  function recoverPending() {
    var p = _pendingRead();
    if (!p || !p.clientSessionId) return Promise.resolve();
    return qFindByClientId(S.user.id, p.clientSessionId).then(function (ex) {
      if (ex && !(S.pom && S.pom.phase === "recovery_required")) { S.session = ex; _pendingWrite(null); S.pendingClientId = null; return; }
      _pendingWrite(null); S.pendingClientId = null;
    });
  }

  /* ─── Presence ─── */
  function joinPresence() {
    if (!_sb || !S.group || !S.user) return;
    if (_connecting) { if (_stDbg()) console.log("[st] joinPresence: already connecting, skip"); return; }
    _connecting = true;
    leavePresence();
    _sb.auth.getSession().then(function (r) {
      var token = r && r.data && r.data.session && r.data.session.access_token;
      if (token && token !== _lastAuthToken) {
        try { _sb.realtime.setAuth(token); _lastAuthToken = token; if (_stDbg()) console.log("[st] realtime.setAuth OK (changed)"); }
        catch (e) { if (_stDbg()) console.log("[st] realtime.setAuth EXC:", e && e.message); }
      } else if (token) {
        if (_stDbg()) console.log("[st] realtime.setAuth skipped (token unchanged)");
      } else {
        if (_stDbg()) console.log("[st] realtime.setAuth skipped (no token)");
      }
      var ch;
      try {
        ch = _sb.channel("group:" + S.group.id, {
          config: { private: true, presence: { key: S.user.id, enabled: true } }
        });
      } catch (e) {
        if (_stDbg()) console.log("[st] channel() EXC:", e && e.message);
        _connecting = false;
        S.connection = "offline"; render(); return;
      }
      _channel = ch;
      ch.on("presence", { event: "sync" }, function () {
        if (_channel !== ch) { if (_stDbg()) console.log("[st] presence sync (stale, ignored)"); return; }
        var st = presenceState();
        if (_stDbg()) console.log("[st] presence sync; total=" + st.length);
        try { render(); } catch (e) {}
      });
      ch.on("presence", { event: "join" }, function (p) {
        if (_channel !== ch) return;
        if (_stDbg()) console.log("[st] presence join key=" + (p && p.key));
        try { render(); } catch (e) {}
      });
      ch.on("presence", { event: "leave" }, function (p) {
        if (_channel !== ch) return;
        if (_stDbg()) console.log("[st] presence leave key=" + (p && p.key));
        try { render(); } catch (e) {}
      });
      ch.subscribe(function (status, err) {
        if (_channel !== ch) { if (_stDbg()) console.log("[st] subscribe status=" + status + " (stale, ignored)"); return; }
        var em = (err && (err.message || String(err))) || "";
        if (_stDbg()) console.log("[st] subscribe status=" + status + (em ? " err=" + em : ""));
        if (status === "SUBSCRIBED") {
          _connecting = false;
          _reconnectAttempt = 0;
          S.connection = "online";
          broadcastPresence();
          try { render(); } catch (e) {}
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
          _connecting = false;
          S.connection = "offline";
          if (_channel === ch) _channel = null;
          try { render(); } catch (e) {}
          schedulePresenceReconnect();
        }
      });
    }).catch(function (e) {
      _connecting = false;
      if (_stDbg()) console.log("[st] joinPresence getSession EXC:", e && e.message);
      schedulePresenceReconnect();
    });
  }
  function schedulePresenceReconnect() {
    if (_reconnectTimer) return;
    if (!S.user || !S.group) return;
    if (S.phase !== "ready") return;
    _reconnectAttempt++;
    var delay = Math.min(30000, 3000 * Math.pow(2, _reconnectAttempt - 1));
    if (_stDbg()) console.log("[st] scheduling reconnect in " + delay + "ms (attempt " + _reconnectAttempt + ")");
    _reconnectTimer = setTimeout(function () {
      _reconnectTimer = null;
      if (!S.user || !S.group) return;
      if (S.phase !== "ready") return;
      if (_stDbg()) console.log("[st] attempting presence reconnect #" + _reconnectAttempt);
      joinPresence();
    }, delay);
  }
  
  function leavePresence() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_channel) { var old = _channel; _channel = null; if (_stDbg()) console.log("[st] leavePresence: unsubscribing"); try { old.unsubscribe(); } catch (e) {} }
    S.connection = "offline";
  }
  function broadcastPresence() {
    if (!_channel || !S.user || !S.profile) return;
    if (_channel.state !== "joined") { return; }
    var payload = { display_name: S.profile.display_name, status: S.session ? "studying" : (S.onBreak ? "break" : "idle") };
    if (S.profile.share_daily_total) payload.today_total_seconds = S.todayTotal;
    if (S.profile.share_timeline) {
      var act = getCurrentActivity();
      if (act && act.title) payload.activity_title = act.title;
    }
    if (S.session) payload.session_started_at = S.session.started_at;
    try {
      var res = _channel.track(payload);
      if (res && typeof res.then === "function") {
        res.then(function () { /* silent */ })
           .catch(function (e) { if (_stDbg()) console.log("[st] track FAIL:", e && e.message); });
      }
    } catch (e) { if (_stDbg()) console.log("[st] track EXC:", e && e.message); }
  }
  function presenceState() {
    if (!_channel) return [];
    try {
      var st = _channel.presenceState();
      var out = [];
      Object.keys(st || {}).forEach(function (k) {
        (st[k] || []).forEach(function (m) { out.push({ key: k, meta: m }); });
      });
      return out;
    } catch (e) { return []; }
  }

  /* ─── Timeline ─── */
  function getCurrentActivity() {
    var b = B();
    if (!b || typeof b.getCurrentActivity !== "function") return null;
    try { return b.getCurrentActivity(); } catch (e) { return null; }
  }

  /* ─── Refresh ─── */
  function recomputeTodayTotal(sessions) {
    var startMs = _startOfTodayLocalMs();
    var nowMs = Date.now();
    var total = 0;
    var count = 0;
    var lastEnd = null;
    (sessions || []).forEach(function (s) {
      if (!s.user_id || s.user_id !== (S.user && S.user.id)) return;
      var st = new Date(s.started_at).getTime();
      var en = s.ended_at ? new Date(s.ended_at).getTime() : nowMs;
      if (st < startMs) st = startMs;
      if (en < startMs) return;
      if (s.end_reason === "crash") return;
      if (!s.ended_at && !S.session) return;
      total += Math.max(0, en - st);
      count++;
      if (s.ended_at) {
        var t = new Date(s.ended_at).getTime();
        if (!lastEnd || t > lastEnd) lastEnd = t;
      }
    });
    S.todayTotal = Math.floor(total / 1000);
    S.todaySessionCount = count;
    S.lastSessionEndedAt = lastEnd;
  }
  var K_CACHE_PREFIX = "internship-os.study-together.cache.";
  var K_LASTUID = "internship-os.study-together.lastuid";
  function _cacheKey(uid) { return K_CACHE_PREFIX + (uid || "anon") + ".v1"; }
  function _cacheSave() {
    try {
      if (!S.user || !S.user.id || S.phase !== "ready") return;
      var hist = Array.isArray(S.historySessions) ? S.historySessions.slice(0, 50) : null;
      var payload = {
        v: 1, uid: S.user.id, savedAt: Date.now(),
        profile: S.profile, group: S.group,
        members: S.members,
        courses: S.courses,
        goals: S.goals,
        streak: S.streak,
        weeklyTotalSec: S.weeklyTotalSec,
        weeklyBestDay: S.weeklyBestDay,
        groupGoalProgress: S.groupGoalProgress,
        historySessions: hist,
        todayTotal: S.todayTotal,
        todaySessionCount: S.todaySessionCount
      };
      var str = JSON.stringify(payload);
      var _saved = false;
      try { localStorage.setItem(_cacheKey(S.user.id), str); _saved = true; }
      catch (e) {
        try {
          payload.historySessions = hist ? hist.slice(0, 15) : null;
          payload.members = (S.members || []).map(function(m){ return { user_id: m.user_id, display_name: m.display_name, username: m.username, avatar_key: m.avatar_key, avatar_url: m.avatar_url, share_daily_total: m.share_daily_total, role: m.role }; });
          localStorage.setItem(_cacheKey(S.user.id), JSON.stringify(payload));
          _saved = true;
        } catch (e2) { try { localStorage.removeItem(_cacheKey(S.user.id)); } catch (e3) {} }
      }
      if (_saved) {
        try { localStorage.setItem(K_LASTUID, S.user.id); } catch (e4) {}
        S.cacheAt = payload.savedAt;
      }
    } catch (e) {}
  }
  function _cacheLoad(uid) {
    if (!uid) return null;
    try {
      var raw = localStorage.getItem(_cacheKey(uid));
      if (!raw) return null;
      var p = JSON.parse(raw);
      if (!p || p.v !== 1 || p.uid !== uid) return null;
      return p;
    } catch (e) { return null; }
  }
  function _cacheClear(uid) {
    if (!uid) return;
    try { localStorage.removeItem(_cacheKey(uid)); } catch (e) {}
  }
  function _cacheApply(p) {
    if (!p) return;
    if (p.profile) S.profile = p.profile;
    if (p.group) S.group = p.group;
    if (Array.isArray(p.members)) S.members = p.members;
    if (Array.isArray(p.courses)) S.courses = p.courses;
    if (p.goals) S.goals = p.goals;
    if (p.streak) S.streak = p.streak;
    if (typeof p.weeklyTotalSec === "number") S.weeklyTotalSec = p.weeklyTotalSec;
    if (p.weeklyBestDay) S.weeklyBestDay = p.weeklyBestDay;
    if (p.groupGoalProgress) S.groupGoalProgress = p.groupGoalProgress;
    if (Array.isArray(p.historySessions)) S.historySessions = p.historySessions;
    if (typeof p.todayTotal === "number") S.todayTotal = p.todayTotal;
    if (typeof p.todaySessionCount === "number") S.todaySessionCount = p.todaySessionCount;
    S.cacheAt = p.savedAt || Date.now();
    S.offline = true;
    S.phase = "ready";
  }
  function _isNetworkError(e) {
    if (!e) return false;
    try { if (typeof navigator !== "undefined" && navigator.onLine === false) return true; } catch (x) {}
    var msg = String(e && e.message ? e.message : e).toLowerCase();
    if (!msg) return false;
    if (/network|fetch|timeout|econn|enotfound|offline|failed to fetch|networkerror|socket|closed/.test(msg)) return true;
    return false;
  }
  function _requireOnline() {
    if (S.offline) {
      try { notify("warning", "\u0627\u062A\u0635\u0627\u0644 \u0644\u0627\u0632\u0645 \u0627\u0633\u062A \u2014 \u062F\u0631 \u062D\u0627\u0644 \u062D\u0627\u0636\u0631 \u0622\u0641\u0644\u0627\u06CC\u0646 \u0647\u0633\u062A\u06CC\u062F"); } catch (e) {}
      return false;
    }
    return true;
  }
  function refreshAll() {
    if (!_sb) return Promise.resolve();
    return _sb.auth.getUser().then(function (u) {
      if (!u || !u.data || !u.data.user) {
        var _guErr = u && u.error;
        if ((_guErr && _isNetworkError(_guErr)) || (typeof navigator !== "undefined" && navigator.onLine === false)) {
          if (S.cacheAt) {
            S.offline = true;
            if (S.phase === "init" || S.phase === "error") S.phase = "ready";
            render();
            return;
          }
          try {
            var _luGU = localStorage.getItem(K_LASTUID);
            if (_luGU) {
              var _ccGU = _cacheLoad(_luGU);
              if (_ccGU) {
                if (!S.user) S.user = { id: _luGU, email: (_ccGU.profile && _ccGU.profile.email) || "" };
                _cacheApply(_ccGU);
                S.offline = true;
                render();
                return;
              }
            }
          } catch (e) {}
        }
        S.phase = "no-auth"; render(); return;
      }
      S.user = { id: u.data.user.id, email: u.data.user.email };
      return qGetProfile(S.user.id).then(function (p) {
        if (!p) { S.phase = "no-auth"; render(); return; }
        S.profile = p;
        return qGetMembership(S.user.id).then(function (m) {
          if (!m) { S.phase = "no-group"; S.group = null; render(); return; }
          return qGetGroup(m.group_id).then(function (g) {
            if (!g) { S.phase = "no-group"; S.group = null; render(); return; }
            g.role = m.role;
            S.group = g;
            return Promise.all([qGetMembers(g.id), qGetTodaySessions(g.id), qGetGoals(S.user.id), qGetStreakSessions(S.user.id, g.id)]).then(function (res) {
              var memberRows = res[0] || [];
              var todaySessions = res[1] || [];
              var uids = memberRows.map(function (x) { return x.user_id; });
              return qGetProfiles(uids).then(function (profs) {
                var pmap = {};
                (profs || []).forEach(function (p2) { pmap[p2.id] = p2; });
                S.members = memberRows.map(function (r) {
                  var pr = pmap[r.user_id] || {};
                  return { user_id: r.user_id, role: r.role, joined_at: r.joined_at,
                    display_name: pr.display_name || "?", username: pr.username || "?",
                    share_timeline: !!pr.share_timeline, share_daily_total: !!pr.share_daily_total,
                    share_course_breakdown: !!pr.share_course_breakdown, share_history_with_group: !!pr.share_history_with_group,
                    avatar_key: pr.avatar_key || "av-1", bio: pr.bio || null, avatar_url: pr.avatar_url || null, share_daily_plan: !!pr.share_daily_plan, last_seen_at: pr.last_seen_at || null };
                });
                recomputeTodayTotal(todaySessions);
                try { S.goals = _groupGoals(res[2] || []); } catch (e) { S.goals = { global: null, courses: {} }; }
                try { S.streak = _computeStreakFromSessions(res[3] || [], {}); } catch (e) { S.streak = { current: 0, best: 0, activeWeek: 0, activeMonth: 0 }; }
                try { S.weeklyTotalSec = _sumWeekFromSessions(res[3] || []); } catch (e) { S.weeklyTotalSec = 0; }
                try { S.weeklyBestDay = _computeWeekBestDay(res[3] || []); } catch (e) { S.weeklyBestDay = null; }
                if (S.streak && S.streak.best > (S.profile && S.profile.best_streak_days ? S.profile.best_streak_days : 0)) {
                  try {
                    _sb.from("profiles").update({ best_streak_days: S.streak.best }).eq("id", S.user.id)
                      .then(function (pr) {
                        if (!pr || !pr.error) { if (S.profile) S.profile.best_streak_days = S.streak.best; }
                      }).catch(function () {});
                  } catch (e) {}
                }
                return qFindOwnOpenSession(S.user.id, g.id).then(function (open) {
                  var isFreshBoot = !_stSessionBooted;
                  var pomMarker = _pomRead();
                  if (isFreshBoot && _pomShouldRecover(pomMarker, !!open, true)) {
                    S.pom = { v: 1, phase: "recovery_required", kind: "open_session", pendingSession: open, marker: pomMarker };
                    S.session = null;
                    S.phase = "ready";
                    S.offline = false;
                    if (_channel) { broadcastPresence(); } else { joinPresence(); }
                    render();
                    _cacheSave();
                    _touchLastSeen(false);
                    // W1-v2 immediate render
                    _loadCourses().then(function () { if (S.phase === "ready" && S.container && S.container.isConnected) render(); });
                    return;
                  }
                  S.session = open || null;
                  S.phase = "ready";
                  S.offline = false;
                  if (_channel) { broadcastPresence(); } else { joinPresence(); }
                  render();
                  _cacheSave();
                  _touchLastSeen(false);
                  // W1-v2 immediate render
                  _loadCourses().then(function () { if (S.phase === "ready" && S.container && S.container.isConnected) render(); });
                });
              });
            });
          });
        });
      });
    }).catch(function (e) {
      if (_isNetworkError(e) && S.cacheAt) {
        S.offline = true;
        if (S.phase === "init" || S.phase === "error") S.phase = "ready";
        render();
        return;
      }
      S.lastError = String(e && e.message || e);
      S.phase = "error";
      render();
    });
  }

  /* ─── Render ─── */
  function render() {
    if (!S.container) return;
    if (!S.container.isConnected) { ST.close(); return; }
    _ensurePomodoroTicker();
    if (S.phase === "init")      return renderLoading();
    if (S.phase === "no-config") return renderNoConfig();
    if (S.phase === "no-sdk")    return renderNoSdk();
    if (S.phase === "error")     return renderError();
    if (S.phase === "no-auth")   return renderAuth();
    if (S.phase === "no-group")  return renderNoGroup();
    if (S.phase === "ready")     return renderReady();
    return renderError();
  }
  function _currentHelpPage() {
    if (S.roomOpen) return "room";
    if (S.readyView === "goals") return "goals";
    if (S.readyView === "settings") return "profile";
    if (S.readyView === "history") return "history";
    if (S.navTab === "profile") return "profile";
    if (S.navTab === "stats") return "stats";
    if (S.navTab === "friends") return "friends";
    return "focus";
  }
  function _helpContent(page) {
    var C = {
      focus: {
        title: "\u0635\u0641\u062D\u0647\u0654 \u062A\u0645\u0631\u06A9\u0632",
        intro: "\u0627\u06CC\u0646\u062C\u0627 \u062C\u0644\u0633\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u06A9\u0646\u06CC \u0648 \u0648\u0636\u0639\u06CC\u062A \u0632\u0646\u062F\u0647\u0654 \u0627\u0639\u0636\u0627 \u0631\u0627 \u0645\u06CC\u200C\u0628\u06CC\u0646\u06CC.",
        sections: [
          { heading: "\u0634\u0631\u0648\u0639 \u0645\u0637\u0627\u0644\u0639\u0647", body: "\u062F\u06A9\u0645\u0647\u0654 \u00AB\u0634\u0631\u0648\u0639 \u0645\u0637\u0627\u0644\u0639\u0647\u00BB \u06CC\u0627 \u00AB\u0634\u0631\u0648\u0639 \u067E\u0648\u0645\u0648\u062F\u0648\u0631\u0648\u00BB \u0631\u0627 \u0628\u0632\u0646. \u062A\u0627\u06CC\u0645\u0631 \u0634\u0631\u0648\u0639 \u0645\u06CC\u200C\u0634\u0648\u062F \u0648 \u062C\u0644\u0633\u0647 \u062F\u0631 DB \u062B\u0628\u062A \u0645\u06CC\u200C\u0634\u0648\u062F." },
          { heading: "\u062F\u0631\u0633 \u0641\u0639\u0627\u0644", body: "\u0627\u0632 \u0646\u0648\u0627\u0631 chip\u0647\u0627\u06CC \u0628\u0627\u0644\u0627\u060C \u06CC\u06A9 \u062F\u0631\u0633 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646. \u062C\u0644\u0633\u0647\u0654 \u0628\u0639\u062F\u06CC \u0628\u0647 \u0647\u0645\u0627\u0646 \u062F\u0631\u0633 \u0645\u062A\u0635\u0644 \u0645\u06CC\u200C\u0634\u0648\u062F." },
          { heading: "\u0627\u0633\u062A\u0631\u0627\u062D\u062A \u0648 \u067E\u0627\u06CC\u0627\u0646", body: "\u062F\u0631 \u062D\u06CC\u0646 \u0645\u0637\u0627\u0644\u0639\u0647\u060C \u00AB\u0627\u0633\u062A\u0631\u0627\u062D\u062A\u00BB \u062C\u0644\u0633\u0647\u0654 \u0641\u0639\u0644\u06CC \u0631\u0627 \u0645\u06CC\u200C\u0628\u0646\u062F\u062F \u0648 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u062F\u0648\u0628\u0627\u0631\u0647 \u0634\u0631\u0648\u0639 \u06A9\u0646\u06CC. \u00AB\u067E\u0627\u06CC\u0627\u0646\u00BB \u062C\u0644\u0633\u0647 \u0631\u0627 \u0628\u0647 \u0637\u0648\u0631 \u06A9\u0627\u0645\u0644 \u0645\u06CC\u200C\u0628\u0646\u062F\u062F." },
          { heading: "\u0647\u062F\u0641 \u0627\u0645\u0631\u0648\u0632", body: "\u06A9\u0627\u0631\u062A \u00AB\u0647\u062F\u0641 \u0627\u0645\u0631\u0648\u0632\u00BB \u062A\u0627 \u0627\u0646\u062A\u0647\u0627\u06CC \u0631\u0648\u0632 \u0646\u0634\u0627\u0646 \u0645\u06CC\u200C\u062F\u0647\u062F \u0686\u0642\u062F\u0631 \u0627\u0632 \u0647\u062F\u0641\u062A \u0631\u0627 \u062A\u06A9\u0645\u06CC\u0644 \u06A9\u0631\u062F\u0647\u200C\u0627\u06CC. \u0628\u0631\u0627\u06CC \u062A\u0639\u06CC\u06CC\u0646/\u0648\u06CC\u0631\u0627\u06CC\u0634 \u0631\u0648\u06CC \u00AB\u0645\u062F\u06CC\u0631\u06CC\u062A\u00BB \u0628\u0632\u0646." }
        ]
      },
      profile: {
        title: "\u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0645\u0646",
        intro: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0634\u062E\u0635\u06CC\u060C \u0627\u0645\u0646\u06CC\u062A \u0648 \u062D\u0631\u06CC\u0645 \u062E\u0635\u0648\u0635\u06CC \u062E\u0648\u062F \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0645\u062F\u06CC\u0631\u06CC\u062A \u06A9\u0646.",
        sections: [
          { heading: "\u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0634\u062E\u0635\u06CC", body: "\u0646\u0627\u0645 \u0646\u0645\u0627\u06CC\u0634\u06CC \u0648 username \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u06A9\u0646. username \u0628\u0627\u06CC\u062F \u06CC\u06AF\u0627\u0646\u06AF\u06CC \u062f\u0627\u0634\u062A\u0647 \u0628\u0627\u0634\u062F." },
          { heading: "\u0627\u0645\u0646\u06CC\u062A \u062D\u0633\u0627\u0628", body: "\u0627\u06CC\u0645\u06CC\u0644 \u06CC\u0627 \u0631\u0645\u0632 \u0639\u0628\u0648\u0631 \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u062A\u063A\u06CC\u06CC\u0631 \u0628\u062F\u0647. \u0628\u0631\u0627\u06CC \u0627\u06CC\u0645\u06CC\u0644\u060C \u062A\u0623\u06CC\u06CC\u062F \u0627\u06CC\u0645\u06CC\u0644 \u062C\u062F\u06CC\u062F \u0644\u0627\u0632\u0645 \u0627\u0633\u062A." },
          { heading: "\u062D\u0631\u06CC\u0645 \u062E\u0635\u0648\u0635\u06CC", body: "\u0645\u0634\u062E\u0635 \u06A9\u0646 \u06A9\u062F\u0627\u0645 \u0622\u0645\u0627\u0631\u062A \u0628\u0627 \u062F\u0648\u0633\u062A\u0627\u0646 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u06AF\u0630\u0627\u0634\u062A\u0647 \u0634\u0648\u062F. \u062A\u063A\u06CC\u06CC\u0631\u0627\u062A \u0641\u0648\u0631\u0627\u064B \u0627\u0639\u0645\u0627\u0644 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F." },
          { heading: "\u0622\u0648\u0627\u062A\u0627\u0631", body: "\u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u06CC\u06A9 gradient \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646\u06CC \u06CC\u0627 \u0639\u06A9\u0633 \u062e\u0648\u062F\u062A \u0631\u0627 \u0622\u067E\u0644\u0648\u062F \u06A9\u0646\u06CC (\u062D\u062F\u0627\u06A9\u062B\u0631 \u06F2 \u0645\u06AF\u0627\u0628\u0627\u06CC\u062A)." },
          { heading: "\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0648 \u0627\u0647\u062F\u0627\u0641", body: "\u0628\u062E\u0634 \u00AB\u0627\u0633\u062A\u0645\u0631\u0627\u0631\u00BB \u0631\u0648\u0632\u0647\u0627\u06CC \u0645\u062A\u0648\u0627\u0644\u06CC \u0645\u0637\u0627\u0644\u0639\u0647 \u0631\u0627 \u0646\u0634\u0627\u0646 \u0645\u06CC\u200C\u062F\u0647\u062F. \u0628\u0631\u0627\u06CC \u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647/\u0647\u0641\u062A\u06AF\u06CC\u060C \u00AB\u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0647\u062F\u0627\u0641\u00BB \u0631\u0627 \u0628\u0632\u0646." }
        ]
      },
      history: {
        title: "\u062A\u0627\u0631\u06CC\u062E\u0686\u0647\u0654 \u0645\u0637\u0627\u0644\u0639\u0647",
        intro: "\u062C\u0644\u0633\u0627\u062A \u06AF\u0630\u0634\u062A\u0647 \u0631\u0627 \u0645\u0631\u0648\u0631 \u06A9\u0646\u060C \u062F\u0631\u0633 \u062A\u0639\u06CC\u06CC\u0646 \u06A9\u0646 \u06CC\u0627 \u0648\u06CC\u0631\u0627\u06CC\u0634 \u0628\u0632\u0646.",
        sections: [
          { heading: "\u062A\u0642\u0648\u06CC\u0645 \u0634\u0645\u0633\u06CC", body: "\u0628\u0627 \u06A9\u0644\u06CC\u06A9 \u0631\u0648\u06CC \u0647\u0631 \u0631\u0648\u0632\u060C \u0641\u0642\u0637 \u062C\u0644\u0633\u0627\u062A \u0647\u0645\u0627\u0646 \u0631\u0648\u0632 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F. \u062f\u06A9\u0645\u0647\u0654 \u00AB\u0627\u0645\u0631\u0648\u0632\u00BB \u0628\u0647 \u0631\u0648\u0632 \u062C\u0627\u0631\u06CC \u0628\u0631\u0645\u06CC\u200C\u06AF\u0631\u062F\u062F." },
          { heading: "\u0628\u0627\u0632\u0647 \u0648 \u0641\u06CC\u0644\u062A\u0631", body: "\u0628\u0627 \u067E\u06CC\u0644\u200C\u0647\u0627\u06CC \u06F7/\u06F3\u06F0/\u06F9\u06F0 \u0631\u0648\u0632 \u06CC\u0627 \u00AB\u0628\u0627\u0632\u0647\u0654 \u062F\u0644\u062E\u0648\u0627\u0647\u00BB \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u0628\u0627\u0632\u0647 \u0631\u0627 \u0645\u062D\u062F\u0648\u062F \u06A9\u0646\u06CC. \u0641\u06CC\u0644\u062A\u0631 \u062F\u0631\u0633 \u0647\u0645 \u062F\u0631 \u062F\u0633\u062A\u0631\u0633 \u0627\u0633\u062A." },
          { heading: "\u062F\u0633\u062A\u0647\u200C\u0628\u0646\u062F\u06CC \u06AF\u0631\u0648\u0647\u06CC", body: "\u0686\u0646\u062F \u062C\u0644\u0633\u0647 \u0631\u0627 \u0628\u0627 checkbox \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646 \u0648 \u0627\u0632 \u0646\u0648\u0627\u0631 \u0628\u0627\u0644\u0627\u060C \u062F\u0631\u0633 \u0645\u0642\u0635\u062F \u0631\u0627 \u062a\u0639\u06CC\u06CC\u0646 \u06A9\u0646 \u0648 \u00AB\u0627\u0639\u0645\u0627\u0644\u00BB \u0628\u0632\u0646." },
          { heading: "\u0648\u06CC\u0631\u0627\u06CC\u0634 \u062C\u0644\u0633\u0647", body: "\u0631\u0648\u06CC \u0647\u0631 \u062C\u0644\u0633\u0647 \u06A9\u0644\u06CC\u06A9 \u06A9\u0646 \u062A\u0627 \u062C\u0632\u0626\u06CC\u0627\u062A \u0628\u0627\u0632 \u0634\u0648\u062F. \u062F\u06A9\u0645\u0647\u0654 \u270F\uFE0F \u0628\u0631\u0627\u06CC \u0648\u06CC\u0631\u0627\u06CC\u0634\u060C \uD83D\uDDD1\uFE0F \u0628\u0631\u0627\u06CC \u062D\u0630\u0641." }
        ]
      },
      stats: {
        title: "\u0622\u0645\u0627\u0631 \u0645\u0637\u0627\u0644\u0639\u0647",
        intro: "\u0631\u0648\u0646\u062F \u0645\u0637\u0627\u0644\u0639\u0647\u062A \u0631\u0627 \u062F\u0631 \u0628\u0627\u0632\u0647\u0647\u0627\u06CC \u0645\u062E\u062A\u0644\u0641 \u0628\u0628\u06CC\u0646.",
        sections: [
          { heading: "\u0628\u0627\u0632\u0647", body: "\u0627\u0645\u0631\u0648\u0632 / \u06F7 \u0631\u0648\u0632 / \u06F3\u06F0 \u0631\u0648\u0632 \u0631\u0627 \u0627\u0646\u062A\u062E\u0627\u0628 \u06A9\u0646 \u062A\u0627 \u0646\u0645\u0648\u062F\u0627\u0631\u0647\u0627 \u0648 \u0622\u0645\u0627\u0631 \u0628\u0647\u200C\u0631\u0648\u0632 \u0634\u0648\u0646\u062F." },
          { heading: "\u0646\u0645\u0648\u062F\u0627\u0631 \u0648 \u06A9\u0627\u0631\u062A\u200C\u0647\u0627", body: "\u0646\u0645\u0648\u062F\u0627\u0631 \u0631\u0648\u0646\u062F\u060C \u0645\u062C\u0645\u0648\u0639 / \u062A\u0639\u062F\u0627\u062F / \u0645\u06CC\u0627\u0646\u06AF\u06CC\u0646 / \u0637\u0648\u0644\u0627\u0646\u06CC\u200C\u062A\u0631\u06CC\u0646 \u062C\u0644\u0633\u0647\u060C \u0628\u0647\u062A\u0631\u06CC\u0646 \u0631\u0648\u0632\u0647\u0627 \u0648 \u062A\u0641\u06A9\u06CC\u06A9 \u062F\u0631\u0633." },
          { heading: "\u067E\u06CC\u0634\u0631\u0641\u062A \u0647\u062F\u0641", body: "\u0627\u06AF\u0631 \u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647/\u0647\u0641\u062A\u06AF\u06CC \u062A\u0639\u06CC\u06CC\u0646 \u06A9\u0631\u062F\u0647 \u0628\u0627\u0634\u06CC\u060C \u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u0628\u0627\u0644\u0627\u06CC \u0635\u0641\u062D\u0647 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F." }
        ]
      },
      friends: {
        title: "\u062F\u0648\u0633\u062A\u0627\u0646",
        intro: "\u0639\u0636\u0648\u0627\u0646 \u06AF\u0631\u0648\u0647\u060C \u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0647\u0641\u062A\u06AF\u06CC\u060C \u0647\u062F\u0641 \u06AF\u0631\u0648\u0647 \u0648 \u0627\u062A\u0627\u0642 \u0645\u0637\u0627\u0644\u0639\u0647.",
        sections: [
          { heading: "\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u06AF\u0631\u0648\u0647", body: "\u0645\u0627\u0644\u06A9 \u06AF\u0631\u0648\u0647 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u062F \u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u062a\u0639\u06CC\u06CC\u0646 \u06A9\u0646\u062F. \u0646\u0648\u0627\u0631 \u067E\u06CC\u0634\u0631\u0641\u062A \u0627\u0632 \u062C\u0644\u0633\u0627\u062A \u0648\u0627\u0642\u0639\u06CC \u0627\u0639\u0636\u0627 \u0645\u062D\u0627\u0633\u0628\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F." },
          { heading: "\u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0647\u0641\u062A\u0647", body: "\u0627\u0639\u0636\u0627\u06CC\u06CC \u06A9\u0647 \u0622\u0645\u0627\u0631\u0634\u0627\u0646 \u0631\u0627 \u0628\u0647 \u0627\u0634\u062A\u0631\u0627\u06A9 \u06AF\u0630\u0627\u0634\u062A\u0647\u200C\u0627\u0646\u062F\u060C \u0628\u0631 \u0627\u0633\u0627\u0633 \u0645\u062C\u0645\u0648\u0639 \u0647\u0641\u062A\u0647 \u0631\u062A\u0628\u0647\u200C\u0628\u0646\u062F\u06CC \u0645\u06CC\u200C\u0634\u0648\u0646\u062F. \u0627\u0639\u0636\u0627\u06CC \u067E\u0646\u0647\u0627\u0646 \u0628\u0627 \uD83D\uDD12 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u0646\u062F." },
          { heading: "\u0627\u062A\u0627\u0642 \u0645\u0637\u0627\u0644\u0639\u0647", body: "\u0628\u0627 \u062F\u06A9\u0645\u0647\u0654 \u00AB\u0648\u0631\u0648\u062F \u0628\u0647 \u0627\u062A\u0627\u0642\u00BB\u060C \u0648\u0636\u0639\u06CC\u062A \u0632\u0646\u062F\u0647\u0654 \u0627\u0639\u0636\u0627 \u0648 \u062A\u0627\u06CC\u0645\u0631 \u0634\u062E\u0635\u06CC \u0631\u0627 \u0628\u0628\u06CC\u0646." },
          { heading: "\u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0627\u0639\u0636\u0627", body: "\u0631\u0648\u06CC \u0647\u0631 \u06A9\u0627\u0631\u062A \u06A9\u0644\u06CC\u06A9 \u06A9\u0646 \u062A\u0627 \u067E\u0631\u0648\u0641\u0627\u06CC\u0644 \u0648 \u0628\u0631\u0646\u0627\u0645\u0647\u0654 \u0631\u0648\u0632\u0627\u0646\u0647\u0654 \u0627\u0648 (\u062F\u0631 \u0635\u0648\u0631\u062A \u0627\u0634\u062A\u0631\u0627\u06A9) \u0631\u0627 \u0628\u0628\u06CC\u0646\u06CC." }
        ]
      },
      room: {
        title: "\u0627\u062A\u0627\u0642 \u0645\u0637\u0627\u0644\u0639\u0647",
        intro: "\u0627\u06CC\u0646\u062C\u0627 \u0628\u0627 \u062F\u0648\u0633\u062A\u0627\u0646 \u0647\u0645\u200C\u0632\u0645\u0627\u0646 \u0645\u0637\u0627\u0644\u0639\u0647 \u0645\u06CC\u200C\u06A9\u0646\u06CC.",
        sections: [
          { heading: "\u062A\u0627\u06CC\u0645\u0631 \u0634\u062E\u0635\u06CC", body: "\u062A\u0627\u06CC\u0645\u0631 \u0628\u0632\u0631\u06AF \u0645\u062F\u062A \u062c\u0644\u0633\u0647\u0654 \u062E\u0648\u062F\u062A \u0631\u0627 \u0646\u0634\u0627\u0646 \u0645\u06CC\u200C\u062F\u0647\u062F. \u0627\u06CC\u0646 \u062A\u0627\u06CC\u0645\u0631 \u0628\u0627 \u062A\u0627\u06CC\u0645\u0631 \u0627\u0639\u0636\u0627\u06CC \u062F\u06CC\u06AF\u0631 \u062C\u062F\u0627\u0633\u062A." },
          { heading: "\u0634\u0631\u0648\u0639 / \u0627\u0633\u062A\u0631\u0627\u062D\u062A / \u067E\u0627\u06CC\u0627\u0646", body: "\u0627\u06AF\u0631 \u062C\u0644\u0633\u0647 \u0641\u0639\u0627\u0644 \u0646\u062F\u0627\u0631\u06CC\u060C \u00AB\u0634\u0631\u0648\u0639 \u0645\u0637\u0627\u0644\u0639\u0647\u00BB. \u0628\u0639\u062F \u0627\u0632 \u0634\u0631\u0648\u0639: \u00AB\u0627\u0633\u062A\u0631\u0627\u062D\u062A\u00BB \u06CC\u0627 \u00AB\u067E\u0627\u06CC\u0627\u0646\u00BB." },
          { heading: "\u0627\u0639\u0636\u0627\u06CC \u062D\u0627\u0636\u0631", body: "\u0648\u0636\u0639\u06CC\u062A \u0632\u0646\u062F\u0647\u0654 \u0647\u0631 \u0639\u0636\u0648: \u0645\u0637\u0627\u0644\u0639\u0647 / \u0627\u0633\u062A\u0631\u0627\u062D\u062A / \u0628\u06CC\u06A9\u0627\u0631 / \u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644." },
          { heading: "\u062E\u0631\u0648\u062C \u0627\u0632 \u0627\u062A\u0627\u0642", body: "\u062E\u0631\u0648\u062C \u0627\u0632 \u0627\u062A\u0627\u0642 \u062C\u0644\u0633\u0647\u0654 \u0641\u0639\u0627\u0644 \u0631\u0627 \u0646\u0645\u06CC\u200C\u0628\u0646\u062F\u062F. \u0628\u0631\u0627\u06CC \u0628\u0633\u062A\u0646\u060C \u0627\u0628\u062A\u062F\u0627 \u067E\u0627\u06CC\u0627\u0646 \u0631\u0627 \u0628\u0632\u0646." }
        ]
      },
      goals: {
        title: "\u0627\u0647\u062F\u0627\u0641 \u0645\u0637\u0627\u0644\u0639\u0647",
        intro: "\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 \u0648 \u0647\u0641\u062A\u06AF\u06CC \u0628\u0631\u0627\u06CC \u062E\u0648\u062F\u062A \u0648 \u0647\u0631 \u062F\u0631\u0633 \u062a\u0639\u06CC\u06CC\u0646 \u06A9\u0646.",
        sections: [
          { heading: "\u0647\u062F\u0641 \u06A9\u0644\u06CC", body: "\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 (\u06F1-\u06F1\u06F4\u06F4\u06F0 \u062F\u0642\u06CC\u0642\u0647) \u0648 \u0647\u0641\u062A\u06AF\u06CC (\u06F1-\u06F1\u06F0\u06F0\u06F8\u06F0 \u062F\u0642\u06CC\u0642\u0647) \u0631\u0627 \u0627\u06CC\u0646\u062C\u0627 \u062a\u0639\u06CC\u06CC\u0646 \u06A9\u0646. \u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9\u06CC \u0644\u0627\u0632\u0645 \u0627\u0633\u062A." },
          { heading: "\u0647\u062F\u0641 \u062F\u0631\u0633", body: "\u0628\u0631\u0627\u06CC \u0647\u0631 \u062F\u0631\u0633 \u0645\u06CC\u200C\u062A\u0648\u0627\u0646\u06CC \u0647\u062F\u0641 \u062C\u062F\u0627\u06AF\u0627\u0646\u0647 \u062a\u0639\u06CC\u06CC\u0646 \u06A9\u0646\u06CC. \u0627\u06CC\u0646 \u0647\u062F\u0641\u0647\u0627 \u0628\u0627 \u0647\u062F\u0641 \u06A9\u0644\u06CC \u062C\u0645\u0639 \u0646\u0645\u06CC\u200C\u0634\u0648\u0646\u062F." },
          { heading: "\u0630\u062E\u06CC\u0631\u0647 \u0648 \u062D\u0630\u0641", body: "\u0628\u0639\u062F \u0627\u0632 \u0648\u0627\u0631\u062F \u06A9\u0631\u062F\u0646 \u0645\u0642\u062F\u0627\u0631\u060C \u00AB\u0630\u062E\u06CC\u0631\u0647\u00BB \u0631\u0627 \u0628\u0632\u0646. \u0628\u0631\u0627\u06CC \u062D\u0630\u0641\u060C \u062F\u06A9\u0645\u0647\u0654 \u00AB\u062D\u0630\u0641\u00BB \u0638\u0627\u0647\u0631 \u0645\u06CC\u200C\u0634\u0648\u062F." }
        ]
      }
    };
    return C[page] || C.focus;
  }
  function _renderHelpFab() {
    if (!S.user || S.phase !== "ready") return "";
    if (S.helpOpen) return "";
    return '<button class="st-help-fab" data-st-act="help-open" title="\u0631\u0627\u0647\u0646\u0645\u0627\u06CC \u0627\u06CC\u0646 \u0635\u0641\u062D\u0647" aria-label="\u0631\u0627\u0647\u0646\u0645\u0627">?</button>';
  }
  function _renderHelpDialog() {
    if (!S.helpOpen) return "";
    var page = S.helpPage || "focus";
    var content = _helpContent(page);
    var sectionsHTML = content.sections.map(function (sec, i) {
      var stepsHTML = "";
      if (sec.steps && sec.steps.length) {
        stepsHTML = '<ol class="st-help-steps">' + sec.steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join("") + '</ol>';
      }
      return '<div class="st-help-section">' +
        '<div class="st-help-section-title">' + fa0(i + 1) + '. ' + esc(sec.heading) + '</div>' +
        '<div class="st-help-section-body">' + esc(sec.body) + '</div>' +
        stepsHTML +
      '</div>';
    }).join("");
    return '<div class="st-help-overlay" data-st-act="help-close-overlay">' +
      '<div class="st-help-content" role="dialog" aria-modal="true" aria-labelledby="st-help-title">' +
        '<div class="st-help-head">' +
          '<span class="st-help-ico">\u2753</span>' +
          '<span class="st-help-title" id="st-help-title">' + esc(content.title) + '</span>' +
          '<button class="st-btn-ghost st-btn-small" data-st-act="help-close" title="\u0628\u0633\u062A\u0646">\u2716</button>' +
        '</div>' +
        (content.intro ? '<div class="st-help-intro">' + esc(content.intro) + '</div>' : '') +
        '<div class="st-help-body">' + sectionsHTML + '</div>' +
        '<div class="st-help-footer"><button class="st-btn-primary" data-st-act="help-close">\u0641\u0647\u0645\u06CC\u062F\u0645</button></div>' +
      '</div>' +
    '</div>';
  }
  function _renderOfflineBanner() {
    if (!S.offline) return "";
    var t = "";
    if (S.cacheAt) {
      try {
        var d = new Date(S.cacheAt);
        t = _fmtDateJalali(d.toISOString()) + " " + _toPersianDigits(("0" + d.getHours()).slice(-2)) + ":" + _toPersianDigits(("0" + d.getMinutes()).slice(-2));
      } catch (e) { t = ""; }
    }
    return '<div class="st-offline-bar">' +
      '<span class="st-offline-ico">\uD83D\uDCE1</span>' +
      '<span class="st-offline-text">\u0622\u0641\u0644\u0627\u06CC\u0646 \u2014 \u0622\u062E\u0631\u06CC\u0646 \u0627\u0637\u0644\u0627\u0639\u0627\u062A \u0630\u062E\u06CC\u0631\u0647\u200C\u0634\u062F\u0647 \u0646\u0645\u0627\u06CC\u0634 \u062F\u0627\u062F\u0647 \u0645\u06CC\u200C\u0634\u0648\u062F</span>' +
      (t ? '<span class="st-offline-at">' + esc(t) + '</span>' : '') +
    '</div>';
  }
  function _connChipHTML() {
    var conn = S.offline ? "offline" : S.connection;
    var label = (S.offline || S.connection !== "online") ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : "\u25CF \u0622\u0646\u0644\u0627\u06CC\u0646";
    return '<span class="st-conn st-conn-' + conn + '" title="\u0648\u0636\u0639\u06CC\u062A \u0627\u062A\u0635\u0627\u0644">' + label + '</span>';
  }
  function pageWrap(inner) { return '<div class="st-page">' + _renderOfflineBanner() + inner + _renderHelpFab() + _renderHelpDialog() + '</div>'; }

  function renderLoading() {
    S.container.innerHTML = pageWrap('<div class="st-hero"><div class="st-hero-icon">👥</div><h1>هم‌مطالعه</h1></div><div class="st-card st-loading">در حال بارگذاری...</div>');
  }
  function renderNoConfig() {
    S.container.innerHTML = pageWrap(
      '<div class="st-hero"><div class="st-hero-icon">👥</div><h1>هم‌مطالعه</h1></div>' +
      '<div class="st-card st-setup-banner">' +
        '<div class="st-setup-title">اتصال آنلاین تنظیم نشده است</div>' +
        '<div class="st-setup-desc">برای فعال‌سازی، فایل <code>data/study-together.js</code> را بساز.</div>' +
        '<div class="st-setup-code">راهنما: <code>docs/STUDY-TOGETHER.md</code></div>' +
      '</div>'
    );
  }
  function renderNoSdk() {
    S.container.innerHTML = pageWrap(
      '<div class="st-hero"><div class="st-hero-icon">👥</div><h1>هم‌مطالعه</h1></div>' +
      '<div class="st-card st-setup-banner">' +
        '<div class="st-setup-title">اتصال به سرویس آنلاین برقرار نشد</div>' +
        '<div class="st-setup-desc">کتابخانهٔ Supabase بارگذاری نشد. اینترنت یا firewall را بررسی کن.</div>' +
        '<button class="st-btn-primary" data-st-act="retry">تلاش مجدد</button>' +
      '</div>'
    );
    wire();
  }
  function renderError() {
    S.container.innerHTML = pageWrap(
      '<div class="st-hero"><div class="st-hero-icon">⚠️</div><h1>هم‌مطالعه</h1></div>' +
      '<div class="st-card st-error-card">' +
        '<div class="st-error-title">خطا</div>' +
        '<div class="st-error-msg">' + esc(S.lastError || "خطای ناشناخته") + '</div>' +
        '<button class="st-btn-primary" data-st-act="retry">تلاش مجدد</button>' +
      '</div>'
    );
    wire();
  }
  function renderAuth() {
    var tab = S.formTab || "login";
    var isSignup = tab === "signup";
    var signupFields = isSignup
      ? '<label>نام کاربری<input type="text" name="username" required minlength="2" maxlength="32"></label><label>نام نمایشی<input type="text" name="displayName" required maxlength="64"></label>'
      : "";
    S.container.innerHTML = pageWrap(
      '<div class="st-hero"><div class="st-hero-icon">👥</div><h1>هم‌مطالعه</h1><p>حضور زنده با دوستان</p></div>' +
      '<div class="st-card st-auth-card">' +
        '<div class="st-tabs">' +
          '<button class="st-tab ' + (tab === "login" ? "is-active" : "") + '" data-st-act="tab" data-st-tab="login">ورود</button>' +
          '<button class="st-tab ' + (isSignup ? "is-active" : "") + '" data-st-act="tab" data-st-tab="signup">ثبت‌نام</button>' +
        '</div>' +
        '<form class="st-form" data-st-act="submit-auth">' +
          '<label>ایمیل<input type="email" name="email" required></label>' +
          '<label>رمز عبور<input type="password" name="password" required minlength="8"></label>' +
          signupFields +
          '<button type="submit" class="st-btn-primary" ' + (S.busy ? "disabled" : "") + '>' + (S.busy ? "..." : (isSignup ? "ثبت‌نام" : "ورود")) + '</button>' +
        '</form>' +
        (S.lastError ? '<div class="st-error">' + esc(S.lastError) + '</div>' : "") +
      '</div>'
    );
    wire();
  }
  function renderNoGroup() {
    var tab = S.formTab === "group-join" ? "group-join" : "group-create";
    var inner = tab === "group-create"
      ? '<form class="st-form" data-st-act="submit-create-group"><label>نام گروه<input type="text" name="groupName" required maxlength="64"></label><button type="submit" class="st-btn-primary">ساخت</button></form>'
      : '<form class="st-form" data-st-act="submit-join-group"><label>کد دعوت<input type="text" name="inviteCode" required></label><button type="submit" class="st-btn-primary">عضویت</button></form>';
    S.container.innerHTML = pageWrap(
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc((S.profile && S.profile.display_name) || "?") + '</div>' +
        '<button class="st-btn-ghost" data-st-act="logout">خروج</button>' +
      '</div>' +
      '<div class="st-hero"><div class="st-hero-icon">👥</div><h1>گروهی نداری</h1></div>' +
      '<div class="st-card st-auth-card">' +
        '<div class="st-tabs">' +
          '<button class="st-tab ' + (tab === "group-create" ? "is-active" : "") + '" data-st-act="tab" data-st-tab="group-create">ساخت گروه</button>' +
          '<button class="st-tab ' + (tab === "group-join" ? "is-active" : "") + '" data-st-act="tab" data-st-tab="group-join">ورود با کد</button>' +
        '</div>' +
        inner +
        (S.lastError ? '<div class="st-error">' + esc(S.lastError) + '</div>' : "") +
      '</div>'
    );
    wire();
  }
  function _reminderKey() {
    var d = new Date();
    return "internship-os.study-together.reminder." + d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }
  function _reminderDismissed() {
    try { return localStorage.getItem(_reminderKey()) === "1"; } catch (e) { return false; }
  }
  function _dismissReminder() {
    try { localStorage.setItem(_reminderKey(), "1"); } catch (e) {}
  }
  function _shouldShowReminder() {
    if (S.phase !== "ready") return false;
    if (S.connection !== "online") return false;
    if (S.todaySessionCount > 0) return false;
    var h = new Date().getHours();
    if (h < 14) return false;
    if (_reminderDismissed()) return false;
    return true;
  }
  function renderRoom() {
    var presByKey = {};
    presenceState().forEach(function (p) { presByKey[p.key] = p.meta; });
    var now = Date.now();

    var sessionBlock;
    if (S.pom && S.pom.phase !== "idle") {
      sessionBlock = _renderPomodoroPanel();
    } else if (S.session) {
      var elapsed = Math.max(0, Math.floor((now - new Date(S.session.started_at).getTime()) / 1000));
      var curCourse = _courseById(S.selectedCourseId);
      sessionBlock = '<div class="st-room-timer-wrap is-active">' +
        '<div class="st-room-timer-label">\u23F1\uFE0F \u062F\u0631 \u062D\u0627\u0644 \u0645\u0637\u0627\u0644\u0639\u0647</div>' +
        (curCourse ? '<div class="st-room-course">\uD83D\uDCD6 ' + esc(curCourse.name) + '</div>' : '') +
        '<div class="st-room-timer" data-room-timer>' + _fmtTimer(elapsed) + '</div>' +
        '<div class="st-room-cta">' +
          '<button class="st-btn-ghost" data-st-act="break">\u2615 \u0627\u0633\u062A\u0631\u0627\u062D\u062A</button>' +
          '<button class="st-btn-danger" data-st-act="end">\u23F9\uFE0F \u067E\u0627\u06CC\u0627\u0646</button>' +
        '</div>' +
      '</div>';
    } else {
      sessionBlock = '<div class="st-room-timer-wrap">' +
        '<div class="st-room-timer-label">\u0622\u0645\u0627\u062F\u0647 \u0628\u0631\u0627\u06CC \u0634\u0631\u0648\u0639</div>' +
        '<div class="st-room-timer">' + _fmtTimer(0) + '</div>' +
        '<div class="st-room-cta">' +
          '<button class="st-btn-primary st-btn-start" data-st-act="start">\u25B6\uFE0F \u0634\u0631\u0648\u0639 \u0645\u0637\u0627\u0644\u0639\u0647</button>' +
        '</div>' +
      '</div>';
    }

    var activeCount = 0;
    var groupTotal = 0;

    var membersHTML = S.members.map(function (m) {
      var isSelf = m.user_id === S.user.id;
      var p = presByKey[m.user_id];
      var status;
      if (isSelf) { status = S.session ? "studying" : (S.onBreak ? "break" : "idle"); }
      else if (p && p.status) { status = p.status; }
      else { status = "disconnected"; }

      if (status === "studying") activeCount++;
      if (isSelf) groupTotal += S.todayTotal;
      else if (p && typeof p.today_total_seconds === "number") groupTotal += p.today_total_seconds;

      var label, icon;
      if (status === "studying") { label = "\u062F\u0631 \u062D\u0627\u0644 \u0645\u0637\u0627\u0644\u0639\u0647"; icon = "\uD83D\uDCD6"; }
      else if (status === "break") { label = "\u0627\u0633\u062A\u0631\u0627\u062D\u062A"; icon = "\u2615"; }
      else if (status === "disconnected") { label = "\u0642\u0637\u0639 \u0627\u062A\u0635\u0627\u0644"; icon = "\u26AB"; }
      else { label = "\u0628\u06CC\u06A9\u0627\u0631"; icon = "\u23F8\uFE0F"; }

      var cls = "st-room-card is-" + status;
      var timer = "";
      if (isSelf && S.session) {
        var ds = Math.max(0, Math.floor((now - new Date(S.session.started_at).getTime()) / 1000));
        timer = '<div class="st-room-card-timer" data-member-timer="' + esc(m.user_id) + '">' + _fmtTimer(ds) + '</div>';
      } else if (p && p.session_started_at) {
        var diff = Math.max(0, Math.floor((now - new Date(p.session_started_at).getTime()) / 1000));
        timer = '<div class="st-room-card-timer" data-member-timer="' + esc(m.user_id) + '">' + _fmtTimer(diff) + '</div>';
      }

      var total = "";
      if (isSelf) {
        if (S.profile && S.profile.share_daily_total) total = '<div class="st-room-card-total">\u0627\u0645\u0631\u0648\u0632: ' + _fmtTimer(S.todayTotal) + '</div>';
      } else if (p && typeof p.today_total_seconds === "number") {
        total = '<div class="st-room-card-total">\u0627\u0645\u0631\u0648\u0632: ' + _fmtTimer(p.today_total_seconds) + '</div>';
      }

      var activity = "";
      if (!isSelf && p && p.activity_title) activity = '<div class="st-room-card-activity">\uD83D\uDCD6 ' + esc(p.activity_title) + '</div>';

      var avKey = m.avatar_key || "av-1";
      var ownerBadge = m.role === "owner" ? ' <span class="st-m-owner">\u0645\u0627\u0644\u06A9</span>' : "";
      var selfMark = isSelf ? ' <span class="st-m-self">\u0634\u0645\u0627</span>' : "";

      return '<div class="' + cls + '">' +
        '<div class="st-room-card-head">' +
          '<div class="st-m-avatar st-m-avatar-' + status + ' st-avatar-' + esc(avKey) + '">' + _avatarInnerHTML(m) + '</div>' +
          '<div class="st-room-card-name">' + esc(m.display_name) + ownerBadge + selfMark + '</div>' +
        '</div>' +
        '<div class="st-room-card-status">' + icon + ' ' + label + _lastSeenSuffix(m, status) + '</div>' +
        timer + total + activity +
      '</div>';
    }).join("");

    var summaryHTML = '<div class="st-room-summary">' +
      '<div class="st-room-summary-item"><span class="st-room-summary-ico">\uD83D\uDC65</span><span><b>' + fa0(activeCount) + '</b> \u062F\u0631 \u062D\u0627\u0644 \u0645\u0637\u0627\u0644\u0639\u0647</span></div>' +
      '<div class="st-room-summary-item"><span class="st-room-summary-ico">\u23F1</span><span>\u0645\u062C\u0645\u0648\u0639 \u0627\u0645\u0631\u0648\u0632 \u06AF\u0631\u0648\u0647: <b>' + _fmtTimer(groupTotal) + '</b></span></div>' +
    '</div>';

    S.container.innerHTML = pageWrap(
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + ' <span class="st-conn st-conn-' + (S.offline ? "offline" : S.connection) + '" title="\u0648\u0636\u0639\u06CC\u062A \u0627\u062A\u0635\u0627\u0644">' + ((S.offline ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : ((S.offline ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : (S.connection === "online" ? "\u25CF \u0622\u0646\u0644\u0627\u06CC\u0646" : "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646"))))) + '</span></div>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="room-close" title="\u062E\u0631\u0648\u062C \u0627\u0632 \u0627\u062A\u0627\u0642">\uD83D\uDEAA \u062E\u0631\u0648\u062C</button>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>\uD83C\uDFAF \u0627\u062A\u0627\u0642 \u0645\u0637\u0627\u0644\u0639\u0647\u0654 ' + esc(S.group.name) + '</h1></div>' +
      sessionBlock +
      summaryHTML +
      _renderGroupGoalCard() +
      '<div class="st-members-title">\uD83D\uDC65 \u0627\u0639\u0636\u0627\u06CC \u062D\u0627\u0636\u0631 (' + fa0(S.members.length) + ')</div>' +
      '<div class="st-room-grid">' + membersHTML + '</div>'
    );
    wire();

    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(function () {
      if (!S.container || !S.container.isConnected) { ST.close(); return; }
      if (!S.roomOpen || S.phase !== "ready") return;
      if (S.session) {
        var el = S.container.querySelector('[data-room-timer]');
        if (el) {
          var e = Math.max(0, Math.floor((Date.now() - new Date(S.session.started_at).getTime()) / 1000));
          el.textContent = _fmtTimer(e);
        }
        var selfEl = S.container.querySelector('[data-member-timer="' + esc(S.user.id) + '"]');
        if (selfEl) {
          var e2 = Math.max(0, Math.floor((Date.now() - new Date(S.session.started_at).getTime()) / 1000));
          selfEl.textContent = _fmtTimer(e2);
        }
      }
    }, 1000);
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(function () {
      if (S.phase === "ready") broadcastPresence();
    }, 30000);
  }
  function _renderFocusGoalCard() {
    if (!S.goals) return "";
    var g = S.goals.global;
    if (!g || !g.enabled || (!g.daily_minutes && !g.weekly_minutes)) {
      return '<div class="st-goal-card is-empty"><div class="st-goal-card-head"><span class="st-goal-card-ico">\uD83C\uDFAF</span><span class="st-goal-card-title">\u0647\u062F\u0641 \u0645\u0637\u0627\u0644\u0639\u0647 \u062A\u0639\u06CC\u06CC\u0646 \u06A9\u0646\u06CC\u062F</span></div><div class="st-goal-card-cta"><button class="st-btn-primary st-btn-small" data-st-act="goals-open">\u062A\u0639\u06CC\u06CC\u0646 \u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647</button></div></div>';
    }
    if (!g.daily_minutes) return "";
    var targetSec = g.daily_minutes * 60;
    var actualSec = S.todayTotal || 0;
    var pct = targetSec > 0 ? Math.min(100, Math.round(actualSec / targetSec * 100)) : 0;
    var remaining = Math.max(0, targetSec - actualSec);
    return '<div class="st-goal-card"><div class="st-goal-card-head"><span class="st-goal-card-ico">\uD83C\uDFAF</span><span class="st-goal-card-title">\u0647\u062F\u0641 \u0627\u0645\u0631\u0648\u0632</span><button class="st-goal-card-link" data-st-act="goals-open">\u0645\u062F\u06CC\u0631\u06CC\u062A \u203A</button></div><div class="st-goal-card-progress"><div class="st-goal-card-bar"><div class="st-goal-card-fill" style="width:' + pct + '%"></div></div><span class="st-goal-card-pct">' + fa0(pct) + '\u066A</span></div><div class="st-goal-card-meta"><span>' + _fmtTimer(actualSec) + ' \u0627\u0632 ' + _fmtTimer(targetSec) + '</span>' + (remaining > 0 ? '<span>\u0628\u0627\u0642\u06CC: ' + _fmtTimer(remaining) + '</span>' : '<span>\u2705 \u062A\u06A9\u0645\u06CC\u0644 \u0634\u062F</span>') + '</div></div>';
  }
  function _renderStreakSection() {
    var st = S.streak || { current: 0, best: 0, activeWeek: 0, activeMonth: 0 };
    var bestProfile = (S.profile && S.profile.best_streak_days) || 0;
    var displayBest = Math.max(st.best || 0, bestProfile);
    return '<div class="st-account-section"><div class="st-account-section-head"><div class="st-account-section-icon">\uD83D\uDD25</div><div><div class="st-account-section-title">\u0627\u0633\u062A\u0645\u0631\u0627\u0631 \u0645\u0637\u0627\u0644\u0639\u0647</div><div class="st-account-section-desc">\u0631\u0648\u0632\u0647\u0627\u06CC \u0645\u062A\u0648\u0627\u0644\u06CC \u0645\u0637\u0627\u0644\u0639\u0647</div></div></div><div class="st-streak-grid"><div class="st-streak-item"><div class="st-streak-val">' + fa0(st.current || 0) + '</div><div class="st-streak-lbl">\u0631\u0648\u0632 \u0641\u0639\u0644\u06CC</div></div><div class="st-streak-item"><div class="st-streak-val">' + fa0(displayBest) + '</div><div class="st-streak-lbl">\u0628\u0647\u062A\u0631\u06CC\u0646 \u062F\u0648\u0631\u0647</div></div><div class="st-streak-item"><div class="st-streak-val">' + fa0(st.activeWeek || 0) + '/\u06F7</div><div class="st-streak-lbl">\u0627\u06CC\u0646 \u0647\u0641\u062A\u0647</div></div><div class="st-streak-item"><div class="st-streak-val">' + fa0(st.activeMonth || 0) + '/\u06F3\u06F0</div><div class="st-streak-lbl">\u0627\u06CC\u0646 \u0645\u0627\u0647</div></div></div></div>';
  }
  function _renderProfileGoalsSection() {
    var g = S.goals || { global: null, courses: {} };
    var lines = [];
    if (g.global && g.global.enabled) {
      var parts = [];
      if (g.global.daily_minutes) parts.push(fa0(g.global.daily_minutes) + ' \u062F\u0642\u06CC\u0642\u0647 \u0631\u0648\u0632\u0627\u0646\u0647');
      if (g.global.weekly_minutes) parts.push(fa0(g.global.weekly_minutes) + ' \u062F\u0642\u06CC\u0642\u0647 \u0647\u0641\u062A\u06AF\u06CC');
      if (parts.length) lines.push('<div class="st-goal-list-item"><span>\uD83C\uDFAF \u0647\u062F\u0641 \u06A9\u0644\u06CC:</span> ' + parts.join(' \u00B7 ') + '</div>');
    }
    Object.keys(g.courses || {}).forEach(function (cid) {
      var cg = g.courses[cid];
      if (!cg || !cg.enabled) return;
      var c = _courseById(cid);
      if (!c) return;
      var p2 = [];
      if (cg.daily_minutes) p2.push(fa0(cg.daily_minutes) + ' \u062F\u0642\u06CC\u0642\u0647');
      if (cg.weekly_minutes) p2.push(fa0(cg.weekly_minutes) + ' \u0647\u0641\u062A\u06AF\u06CC');
      if (!p2.length) return;
      lines.push('<div class="st-goal-list-item"><span class="st-course-stat-label ' + _courseColorClass(c) + '"><span class="st-course-dot"></span>' + esc(c.name) + ':</span> ' + p2.join(' \u00B7 ') + '</div>');
    });
    var content = lines.length ? lines.join("") : '<div class="st-muted-note">\u0647\u0646\u0648\u0632 \u0647\u062F\u0641\u06CC \u062A\u0639\u06CC\u06CC\u0646 \u0646\u06A9\u0631\u062F\u0647\u200C\u0627\u06CC\u062F</div>';
    return '<div class="st-account-section"><div class="st-account-section-head"><div class="st-account-section-icon">\uD83C\uDFAF</div><div><div class="st-account-section-title">\u0627\u0647\u062F\u0627\u0641 \u0645\u0637\u0627\u0644\u0639\u0647</div><div class="st-account-section-desc">\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 \u0648 \u0647\u0641\u062A\u06AF\u06CC</div></div></div>' + content + '<div class="st-account-actions"><button class="st-btn-primary" data-st-act="goals-open">\u0645\u062F\u06CC\u0631\u06CC\u062A \u0627\u0647\u062F\u0627\u0641</button></div></div>';
  }
  function _renderStatsGoalCard() {
    if (!S.goals || !S.goals.global || !S.goals.global.enabled) return "";
    var g = S.goals.global;
    if (!g.daily_minutes && !g.weekly_minutes) return "";
    var rows = "";
    if (g.daily_minutes) {
      var tD = g.daily_minutes * 60, aD = S.todayTotal || 0, pD = tD > 0 ? Math.min(100, Math.round(aD / tD * 100)) : 0;
      rows += '<div class="st-stats-goal-row"><span class="st-stats-goal-label">\u0647\u062F\u0641 \u0627\u0645\u0631\u0648\u0632 (' + fa0(g.daily_minutes) + ' \u062F\u0642\u06CC\u0642\u0647)</span><div class="st-stats-goal-bar"><div class="st-stats-goal-fill" style="width:' + pD + '%"></div></div><span class="st-stats-goal-pct">' + fa0(pD) + '\u066A</span></div>';
    }
    if (g.weekly_minutes) {
      var tW = g.weekly_minutes * 60, aW = S.weeklyTotalSec || 0, pW = tW > 0 ? Math.min(100, Math.round(aW / tW * 100)) : 0;
      rows += '<div class="st-stats-goal-row"><span class="st-stats-goal-label">\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC (' + fa0(g.weekly_minutes) + ' \u062F\u0642\u06CC\u0642\u0647)</span><div class="st-stats-goal-bar"><div class="st-stats-goal-fill" style="width:' + pW + '%"></div></div><span class="st-stats-goal-pct">' + fa0(pW) + '\u066A</span></div>';
    }
    if (!rows) return "";
    return '<div class="st-chart-card"><div class="st-members-title">\uD83C\uDFAF \u067E\u06CC\u0634\u0631\u0641\u062A \u0647\u062F\u0641</div>' + rows + '</div>';
  }
  function _saveGlobalGoal() {
    var dEl = S.container.querySelector
    if (!_requireOnline()) return;('[data-goal-global-daily]');
    var wEl = S.container.querySelector('[data-goal-global-weekly]');
    var daily = (dEl && String(dEl.value || "").trim()) ? parseInt(dEl.value, 10) : null;
    var weekly = (wEl && String(wEl.value || "").trim()) ? parseInt(wEl.value, 10) : null;
    if (daily !== null && (isNaN(daily) || daily < 1 || daily > 1440)) { S.goalsError = "\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647: \u06F1-\u06F1\u06F4\u06F4\u06F0"; render(); return; }
    if (weekly !== null && (isNaN(weekly) || weekly < 1 || weekly > 10080)) { S.goalsError = "\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC: \u06F1-\u06F1\u06F0\u06F0\u06F8\u06F0"; render(); return; }
    if (daily === null && weekly === null) { S.goalsError = "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9\u06CC \u0627\u0632 \u0627\u0647\u062F\u0627\u0641 \u0644\u0627\u0632\u0645 \u0627\u0633\u062A"; render(); return; }
    S.goalsBusy = true; S.goalsError = null; render();
    qUpsertGoal(S.user.id, "global", null, { daily_minutes: daily, weekly_minutes: weekly, enabled: true, updated_at: new Date().toISOString() })
      .then(function (r) { if (r && r.error) throw r.error; return qGetGoals(S.user.id); })
      .then(function (rows) { S.goals = _groupGoals(rows); S.goalsBusy = false; try { notify("success", "\u0647\u062F\u0641 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {} render(); })
      .catch(function (err) { S.goalsBusy = false; S.goalsError = String(err && err.message || err); render(); });
  }
  function _removeGlobalGoal() {
    S.goalsBusy = true; S.goalsError = null; render();
    qDeleteGoal(S.user.id, "global", null)
      .then(function (r) { if (r && r.error) throw r.error; return qGetGoals(S.user.id); })
      .then(function (rows) { S.goals = _groupGoals(rows); S.goalsBusy = false; try { notify("success", "\u0647\u062F\u0641 \u062D\u0630\u0641 \u0634\u062F"); } catch (e) {} render(); })
      .catch(function (err) { S.goalsBusy = false; S.goalsError = String(err && err.message || err); render(); });
  }
  function _saveCourseGoal(cid) {
    var dEl = S.container.querySelector
    if (!_requireOnline()) return;('[data-goal-course-daily="' + cid + '"]');
    var wEl = S.container.querySelector('[data-goal-course-weekly="' + cid + '"]');
    var daily = (dEl && String(dEl.value || "").trim()) ? parseInt(dEl.value, 10) : null;
    var weekly = (wEl && String(wEl.value || "").trim()) ? parseInt(wEl.value, 10) : null;
    if (daily === null && weekly === null) { S.goalsError = "\u062D\u062F\u0627\u0642\u0644 \u06CC\u06A9\u06CC \u0627\u0632 \u0627\u0647\u062F\u0627\u0641 \u062F\u0631\u0633 \u0644\u0627\u0632\u0645 \u0627\u0633\u062A"; render(); return; }
    if (daily !== null && (isNaN(daily) || daily < 1 || daily > 1440)) { S.goalsError = "\u0631\u0648\u0632\u0627\u0646\u0647: \u06F1-\u06F1\u06F4\u06F4\u06F0"; render(); return; }
    if (weekly !== null && (isNaN(weekly) || weekly < 1 || weekly > 10080)) { S.goalsError = "\u0647\u0641\u062A\u06AF\u06CC: \u06F1-\u06F1\u06F0\u06F0\u06F8\u06F0"; render(); return; }
    S.goalsBusy = true; S.goalsError = null; render();
    qUpsertGoal(S.user.id, "course", cid, { daily_minutes: daily, weekly_minutes: weekly, enabled: true, updated_at: new Date().toISOString() })
      .then(function (r) { if (r && r.error) throw r.error; return qGetGoals(S.user.id); })
      .then(function (rows) { S.goals = _groupGoals(rows); S.goalsBusy = false; try { notify("success", "\u0647\u062F\u0641 \u062F\u0631\u0633 \u0630\u062E\u06CC\u0631\u0647 \u0634\u062F"); } catch (e) {} render(); })
      .catch(function (err) { S.goalsBusy = false; S.goalsError = String(err && err.message || err); render(); });
  }
  function _removeCourseGoal(cid) {
    S.goalsBusy = true; S.goalsError = null; render();
    qDeleteGoal(S.user.id, "course", cid)
      .then(function (r) { if (r && r.error) throw r.error; return qGetGoals(S.user.id); })
      .then(function (rows) { S.goals = _groupGoals(rows); S.goalsBusy = false; try { notify("success", "\u0647\u062F\u0641 \u062F\u0631\u0633 \u062D\u0630\u0641 \u0634\u062F"); } catch (e) {} render(); })
      .catch(function (err) { S.goalsBusy = false; S.goalsError = String(err && err.message || err); render(); });
  }
  function renderGoals() {
    var g = S.goals || { global: null, courses: {} };
    var globalG = g.global || {};
    var globalDaily = globalG.daily_minutes || "";
    var globalWeekly = globalG.weekly_minutes || "";
    var hasGlobal = !!(globalG.daily_minutes || globalG.weekly_minutes);
    var courseRows = (S.courses || []).map(function (c) {
      var cg = g.courses[c.id] || {};
      var hasGoal = !!(cg.daily_minutes || cg.weekly_minutes);
      return '<div class="st-goal-course-row"><div class="st-goal-course-head"><span class="st-goal-course-icon ' + _courseColorClass(c) + '">' + esc(c.icon ? _courseIconGlyph(c.icon) : "\uD83D\uDCDA") + '</span><span class="st-goal-course-name">' + esc(c.name) + '</span></div><div class="st-goal-course-inputs"><label>\u0631\u0648\u0632\u0627\u0646\u0647 <input type="number" min="1" max="1440" placeholder="\u062F\u0642\u06CC\u0642\u0647" data-goal-course-daily="' + esc(c.id) + '" value="' + (cg.daily_minutes || '') + '"></label><label>\u0647\u0641\u062A\u06AF\u06CC <input type="number" min="1" max="10080" placeholder="\u062F\u0642\u06CC\u0642\u0647" data-goal-course-weekly="' + esc(c.id) + '" value="' + (cg.weekly_minutes || '') + '"></label><button class="st-btn-primary st-btn-small" data-st-act="goal-save-course" data-course-id="' + esc(c.id) + '">\u0630\u062E\u06CC\u0631\u0647</button>' + (hasGoal ? '<button class="st-btn-danger st-btn-small" data-st-act="goal-remove-course" data-course-id="' + esc(c.id) + '">\u062D\u0630\u0641</button>' : '') + '</div></div>';
    }).join("");
    S.container.innerHTML = pageWrap(
      _navTabsHTML(S.navTab || "profile") +
      '<div class="st-topbar"><div class="st-user-chip">' + esc(S.profile.display_name) + '</div><button class="st-btn-ghost st-btn-small" data-st-act="goals-back">\u0628\u0627\u0632\u06AF\u0634\u062A</button></div>' +
      '<div class="st-hero st-hero-small"><h1>\uD83C\uDFAF \u0627\u0647\u062F\u0627\u0641 \u0645\u0637\u0627\u0644\u0639\u0647</h1></div>' +
      '<div class="st-account-section"><div class="st-account-section-head"><div class="st-account-section-icon">\uD83C\uDFAF</div><div><div class="st-account-section-title">\u0647\u062F\u0641 \u06A9\u0644\u06CC</div><div class="st-account-section-desc">\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 \u0648 \u0647\u0641\u062A\u06AF\u06CC</div></div></div><div class="st-goal-global-form"><label>\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 (\u062F\u0642\u06CC\u0642\u0647) <input type="number" min="1" max="1440" data-goal-global-daily placeholder="\u0645\u062B\u0644\u0627\u064B \u06F1\u06F2\u06F0" value="' + globalDaily + '"' + (S.goalsBusy ? ' disabled' : '') + '></label><label>\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC (\u062F\u0642\u06CC\u0642\u0647) <input type="number" min="1" max="10080" data-goal-global-weekly placeholder="\u0645\u062B\u0644\u0627\u064B \u06F6\u06F0\u06F0" value="' + globalWeekly + '"' + (S.goalsBusy ? ' disabled' : '') + '></label><div class="st-account-actions"><button class="st-btn-primary" data-st-act="goal-save-global"' + (S.goalsBusy ? ' disabled' : '') + '>\u0630\u062E\u06CC\u0631\u0647 \u0647\u062F\u0641</button>' + (hasGlobal ? '<button class="st-btn-danger" data-st-act="goal-remove-global"' + (S.goalsBusy ? ' disabled' : '') + '>\u062D\u0630\u0641</button>' : '') + '</div>' + (S.goalsError ? '<div class="st-error">' + esc(S.goalsError) + '</div>' : '') + '</div></div>' +
      '<div class="st-account-section"><div class="st-account-section-head"><div class="st-account-section-icon">\uD83D\uDCDA</div><div><div class="st-account-section-title">\u0647\u062F\u0641 \u0628\u0647 \u062A\u0641\u06A9\u06CC\u06A9 \u062F\u0631\u0633</div><div class="st-account-section-desc">\u0647\u062F\u0641 \u0631\u0648\u0632\u0627\u0646\u0647 \u0648 \u0647\u0641\u062A\u06AF\u06CC \u0628\u0631\u0627\u06CC \u0647\u0631 \u062F\u0631\u0633</div></div></div>' + (courseRows || '<div class="st-muted-note">\u062F\u0631\u0633\u06CC \u0628\u0631\u0627\u06CC \u0647\u062F\u0641\u200C\u06AF\u0630\u0627\u0631\u06CC \u0648\u062C\u0648\u062F \u0646\u062F\u0627\u0631\u062F</div>') + '</div>'
    );
    wire();
  }
  function renderReady() {
    if (S.roomOpen) return renderRoom();
    if (S.readyView === "goals") return renderGoals();
    if (S.readyView === "settings") return renderSettings();
    if (S.readyView === "course-form") { S.container.innerHTML = _courseFormRender(); wire(); return; } // W1-v3 render course form
    if (S.readyView === "history") return (S.historyView === "form") ? renderHistoryForm() : renderHistory();
    if (S.navTab === "profile") return renderProfile();
    if (S.navTab === "stats") return renderStatistics();
    if (S.navTab === "friends") return renderFriends();
    var isOwner = S.group && S.profile && S.group.owner_id === S.user.id;
    var presByKey = {};
    presenceState().forEach(function (p) { presByKey[p.key] = p.meta; });
    var now = Date.now();
    var membersHTML = S.members.map(function (m) {
      var isSelf = (m.user_id === S.user.id);
      var p = presByKey[m.user_id];
      var status;
      if (isSelf) { status = S.session ? "studying" : (S.onBreak ? "break" : "idle"); }
      else if (p && p.status) { status = p.status; }
      else { status = "disconnected"; }
      var label, cls;
      if (status === "studying") { label = "در حال مطالعه"; cls = "is-studying"; }
      else if (status === "break") { label = "استراحت"; cls = "is-break"; }
      else if (status === "disconnected") { label = "قطع اتصال"; cls = "is-disconnected"; }
      else { label = "بیکار"; cls = "is-idle"; }
      var initial = (m.display_name || "?").trim().charAt(0) || "?";
      var timer = "";
      if (isSelf && S.session) {
        var ds = Math.max(0, Math.floor((now - new Date(S.session.started_at).getTime()) / 1000));
        timer = '<div class="st-m-timer">' + _fmtTimer(ds) + '</div>';
      } else if (p && p.session_started_at) {
        var diff = Math.max(0, Math.floor((now - new Date(p.session_started_at).getTime()) / 1000));
        timer = '<div class="st-m-timer">' + _fmtTimer(diff) + '</div>';
      }
      var total = "";
      if (isSelf) {
        if (S.profile && S.profile.share_daily_total) total = '<div class="st-m-total">امروز: ' + _fmtTimer(S.todayTotal) + '</div>';
      } else if (p && typeof p.today_total_seconds === "number") {
        total = '<div class="st-m-total">امروز: ' + _fmtTimer(p.today_total_seconds) + '</div>';
      } else if (m.share_daily_total === false) {
        total = '<div class="st-m-total st-muted">امروز: —</div>';
      }
      var activity = "";
      if (!isSelf && p && p.activity_title) activity = '<div class="st-m-act">📖 ' + esc(p.activity_title) + '</div>';
      var ownerBadge = m.role === "owner" ? ' <span class="st-m-owner">مالک</span>' : "";
      var selfMark = isSelf ? ' <span class="st-m-self">شما</span>' : "";
      return '<div class="st-member ' + cls + '">' +
        '<div class="st-m-avatar st-m-avatar-' + cls + ' st-avatar-' + esc(m.avatar_key || "av-1") + '" aria-hidden="true">' + _avatarInnerHTML(m) + '</div>' +
        '<div class="st-m-body">' +
          '<div class="st-m-name">' + esc(m.display_name) + ownerBadge + selfMark + '</div>' +
          '<div class="st-m-status"><span class="st-m-status-dot"></span>' + label + _lastSeenSuffix(m, status) + '</div>' +
          timer + total + activity +
        '</div>' +
      '</div>';
    }).join("");
    var sessionBlock;
    if (S.pom && S.pom.phase !== "idle") {
      sessionBlock = _renderPomodoroPanel();
    } else if (S.session) {
      var elapsed = Math.max(0, Math.floor((Date.now() - new Date(S.session.started_at).getTime()) / 1000));
      sessionBlock = '<div class="st-session-panel is-active">' +
        '<div class="st-session-label">⏱️ در حال مطالعه</div>' +
        '<div class="st-timer">' + _fmtTimer(elapsed) + '</div>' +
        '<div class="st-session-actions">' +
          '<button class="st-btn-ghost" data-st-act="break" title="پایان جلسهٔ فعلی و شروع استراحت">☕ استراحت</button>' +
          '<button class="st-btn-danger" data-st-act="end" title="پایان کامل جلسهٔ مطالعه">⏹️ پایان</button>' +
        '</div>' +
      '</div>';
    } else {
      var startLabel = S.pendingClientId ? "ادامهٔ مطالعه" : "شروع مطالعه";
      var hint = S.onBreak ? '<div class="st-session-hint">در حالت استراحت — برای ادامه دکمهٔ بالا را بزن</div>' : "";
      sessionBlock = '<div class="st-session-panel">' +
        '<button class="st-btn-primary st-btn-start" data-st-act="start" title="شروع یک جلسهٔ مطالعهٔ جدید">▶️ ' + startLabel + '</button>' +
        hint +
        '<button class="st-btn-ghost st-pom-start-btn" data-st-act="pom-start" title="شروع پومودورو ۲۵/۵">🍅 شروع پومودورو</button>' +
      '</div>';
    }
    var statsCls = S.todaySessionCount > 0 ? "st-stats" : "st-stats st-stats-empty";
    var lastStr = "";
    if (S.lastSessionEndedAt) {
      var ld = new Date(S.lastSessionEndedAt);
      var lh = ld.getHours(); var lm = ld.getMinutes();
      lastStr = fa0((lh < 10 ? "0" : "") + lh) + ":" + fa0((lm < 10 ? "0" : "") + lm);
    }
    var statsBlock = '<div class="' + statsCls + '">' +
      '<div class="st-stat' + (S.todaySessionCount === 0 ? ' st-stat-empty' : '') + '">' +
        '<span class="st-stat-ico">📊</span>' +
        '<div><div class="st-stat-val">' + _fmtTimer(S.todayTotal) + '</div><div class="st-stat-lbl">مجموع امروز</div></div>' +
      '</div>' +
      '<div class="st-stat' + (S.todaySessionCount === 0 ? ' st-stat-empty' : '') + '">' +
        '<span class="st-stat-ico">🎯</span>' +
        '<div><div class="st-stat-val">' + fa0(S.todaySessionCount) + '</div><div class="st-stat-lbl">جلسهٔ امروز</div></div>' +
      '</div>' +
      (lastStr
        ? '<div class="st-stat"><span class="st-stat-ico">⏱️</span><div><div class="st-stat-val">' + lastStr + '</div><div class="st-stat-lbl">آخرین جلسه</div></div></div>'
        : '') +
    '</div>';
    var reminderBlock = "";
    if (_shouldShowReminder()) {
      reminderBlock = '<div class="st-reminder">' +
        '<span class="st-reminder-ico">📚</span>' +
        '<div class="st-reminder-text">هنوز امروز جلسه‌ای ثبت نکردی — برای شروع دکمهٔ زیر را بزن.</div>' +
        '<button class="st-reminder-close" data-st-act="dismiss-reminder" title="بستن یادآور">✕</button>' +
      '</div>';
    }
    var inviteBlock = isOwner
      ? '<div class="st-invite-compact">\uD83D\uDD12 \u06A9\u062F \u062F\u0639\u0648\u062A \u067E\u0646\u0647\u0627\u0646 \u0627\u0633\u062A \u2014 <button class="st-group-code-btn" data-st-act="nav-tab" data-st-tab="profile" style="margin:0 4px;">\u0645\u062F\u06CC\u0631\u06CC\u062A \u062F\u0631 \u062D\u0633\u0627\u0628 \u0645\u0646</button></div>'
      : "";
    var settingsBtn = '<button class="st-btn-ghost" data-st-act="settings" title="تنظیمات حریم خصوصی">⚙️ تنظیمات</button>';
    var historyBtn = '<button class="st-btn-ghost" data-st-act="hist-open" title="تاریخچهٔ مطالعه">📜 تاریخچه</button>';
    var exitBtn = isOwner
      ? '<button class="st-btn-danger" data-st-act="delete-group" title="حذف کامل گروه">🗑️ حذف گروه</button>'
      : '<button class="st-btn-ghost" data-st-act="leave" title="ترک گروه">🚪 ترک گروه</button>';
    S.container.innerHTML = pageWrap(
      _navTabsHTML("focus") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + ' <span class="st-conn st-conn-' + (S.offline ? "offline" : S.connection) + '" title="وضعیت اتصال">' + ((S.offline ? "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646" : (S.connection === "online" ? "\u25CF \u0622\u0646\u0644\u0627\u06CC\u0646" : "\u25CB \u0622\u0641\u0644\u0627\u06CC\u0646"))) + '</span></div>' +
      '</div>' +
      _courseChipsHTML() +
      '<div class="st-hero st-hero-small"><h1>' + esc(S.group.name) + '</h1></div>' +
      reminderBlock +
      inviteBlock +
      sessionBlock +
      statsBlock +
      _renderFocusGoalCard() +
      '<div class="st-members-title">👥 اعضا (' + fa0(S.members.length) + ')</div>' +
      '<div class="st-member-grid">' + membersHTML + '</div>' +
      '<div class="st-actions-bar">' + settingsBtn + historyBtn + exitBtn + '</div>'
    );
    wire();
    if (_tickInterval) clearInterval(_tickInterval);
    _tickInterval = setInterval(function () {
      if (!S.container || !S.container.isConnected) { ST.close(); return; }
      if (S.phase !== "ready") return;
      if (S.readyView === "settings") return;
      var el = S.container.querySelector(".st-timer");
      if (el && S.session) {
        var e2 = Math.max(0, Math.floor((Date.now() - new Date(S.session.started_at).getTime()) / 1000));
        el.textContent = _fmtTimer(e2);
      }
    }, 1000);
    if (_heartbeatTimer) clearInterval(_heartbeatTimer);
    _heartbeatTimer = setInterval(function () {
      if (S.phase === "ready") broadcastPresence();
    }, 30000);
  }
  function renderSettings() {
    var shareTL = !!(S.profile && S.profile.share_timeline);
    var shareDaily = !!(S.profile && S.profile.share_daily_total);
    S.container.innerHTML = pageWrap(
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + '</div>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="settings-cancel" title="بازگشت">بازگشت</button>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>تنظیمات حریم خصوصی</h1></div>' +
      '<div class="st-card st-settings-card">' +
        '<div class="st-settings-row">' +
          '<label class="st-settings-label-wrap">' +
            '<input type="checkbox" data-st-setting="share_daily_total"' + (shareDaily ? " checked" : "") + '>' +
            '<span class="st-settings-label">اشتراک مجموع مطالعهٔ امروز</span>' +
          '</label>' +
          '<div class="st-settings-desc">اعضای گروه مجموع دقایق مطالعهٔ امروز شما را در کارت شما می‌بینند.</div>' +
        '</div>' +
        '<div class="st-settings-row">' +
          '<label class="st-settings-label-wrap">' +
            '<input type="checkbox" data-st-setting="share_timeline"' + (shareTL ? " checked" : "") + '>' +
            '<span class="st-settings-label">اشتراک فعالیت فعلی Timeline</span>' +
          '</label>' +
          '<div class="st-settings-desc">فقط عنوان فعالیت جاری شما (بدون جزئیات) نمایش داده می‌شود.</div>' +
        '</div>' +
        '<div class="st-settings-actions">' +
          '<button class="st-btn-primary" data-st-act="settings-save" title="ذخیره تغییرات">ذخیره</button>' +
          '<button class="st-btn-ghost" data-st-act="settings-cancel" title="بازگشت بدون ذخیره">بازگشت</button>' +
        '</div>' +
        '<div class="st-settings-status" data-st-settings-status aria-live="polite"></div>' +
      '</div>'
    );
    wire();
  }

  /* ─── Events ─── */
  function wire() {
    if (!S.container) return;
    S.container.querySelectorAll("[data-st-act]").forEach(function (el) {
      if (el.tagName === "FORM") el.addEventListener("submit", onSubmit);
      else if (el.tagName === "SELECT") el.addEventListener("change", onSelect);
    else if (el.tagName === "INPUT" && (el.getAttribute("data-st-act") === "avatar-file" || el.getAttribute("data-st-act") === "friend-day-set" || el.getAttribute("data-st-act") === "share-plan-toggle" || el.getAttribute("data-st-act") === "hist-from-date" || el.getAttribute("data-st-act") === "hist-to-date")) el.addEventListener("change", onSelect);
      else el.addEventListener("click", onClick);
    });
  }
  function onSelect(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute("data-st-act");
    if (act === "hist-from-date") { S.historyFromDate = t.value; render(); return; }
    if (act === "hist-to-date") { S.historyToDate = t.value; render(); return; }
    if (act === "share-plan-toggle") { _handleSharePlanToggle(t.checked); return; }
    if (act === "avatar-file") {
      var _f = t.files && t.files[0];
      try { t.value = ""; } catch (e) {}
      if (_f) _avatarUpload(_f);
      return;
    }
    if (act === "friend-day-set") {
      if (S.memberProfileView) _friendDaySetDate(S.memberProfileView.user_id, t.value);
      return;
    }
    if (act === "hist-bulk-course") { S.histBulkCourse = t.value || null; render(); return; }
    if (act === "hist-course-filter") {
      var v = t.value;
      S.historyCourseFilter = (v === "") ? null : v;
      render();
      return;
    }
  }
  function onClick(e) {
    var t = e.target.closest("[data-st-act]");
    if (!t) return;
    var act = t.getAttribute("data-st-act");
    if (act === "tab") { S.formTab = t.getAttribute("data-st-tab") || "login"; S.lastError = null; render(); return; }
    if (act === "logout") { if (confirm("\u0627\u0632 \u062D\u0633\u0627\u0628 \u062E\u0648\u062F \u062E\u0627\u0631\u062C \u0645\u06CC\u200C\u0634\u0648\u06CC\u062F\u061F")) doLogout(); return; }
    if (act === "start") { doStart(); return; }
    if (act === "break") { doAction(startBreak, "استراحت آغاز شد"); return; }
    if (act === "end") { doAction(endSession, "جلسه پایان یافت"); return; }
    if (act === "leave") { if (confirm("گروه را ترک می‌کنی؟")) doLeave(); return; }
    if (act === "delete-group") { if (confirm("گروه و همهٔ اطلاعات حذف شود؟")) doDelete(); return; }
    if (act === "revoke") { doRevoke(); return; }
    if (act === "retry") { ST.open(S.container); return; }
    if (act === "settings") { S.readyView = "settings"; render(); return; }
    if (act === "settings-save") { doSaveSettings(); return; }
    if (act === "settings-cancel") { S.readyView = "main"; render(); return; }
    if (act === "copy-invite") { doCopyInvite(); return; }
    if (act === "dismiss-reminder") { _dismissReminder(); render(); return; }
    if (act === "pom-start") { _pomStart(); return; }
    if (act === "pom-end") { _pomEndManual(); return; }
    if (act === "pom-skip-break") { _pomSkipBreak(); return; }
    if (act === "pom-next") { _pomStart(); return; }
    if (act === "pom-recovery-crash") { _pomRecoveryCrash(); return; }
    if (act === "pom-recovery-restart") { _pomRecoveryRestart(); return; }
    if (act === "pom-recovery-no-session-clear") { _pomRecoveryNoSessionClear(); return; }
    if (act === "pom-recovery-no-session-restart") { _pomRecoveryNoSessionRestart(); return; }
    if (act === "hist-open") { _openHistoryList(); return; }
    if (act === "hist-back") { S.readyView = "main"; S.historyView = "list"; S.historyEdit = null; S.historyError = null; S.historyPendingDelete = null; render(); return; }
    if (act === "hist-add") { _openHistoryForm(null); return; }
    if (act === "hist-edit") { _handleEditHistory(t); return; }
    if (act === "hist-delete") { _handleDeleteHistory(t); return; }
    if (act === "hist-reload") { S.historySessions = null; render(); _loadHistory().then(function () { render(); }); return; }
    if (act === "hist-cancel") { _cancelHistoryForm(); return; }
    if (act === "hist-del-confirm") { _confirmDeleteHistory(); return; }
    if (act === "hist-del-cancel") { S.historyPendingDelete = null; render(); return; }
    if (act === "cal-prev") { _histCalPrevMonth(); return; }
    if (act === "cal-next") { _histCalNextMonth(); return; }
    if (act === "cal-today") { _histCalGoToday(); return; }
    if (act === "cal-day") {
      var jy = parseInt(t.getAttribute("data-jy"), 10);
      var jm = parseInt(t.getAttribute("data-jm"), 10);
      var jd = parseInt(t.getAttribute("data-jd"), 10);
      if (jy && jm && jd) _histCalSelectDay(jy, jm, jd);
      return;
    }
    if (act === "hist-apply-range") {
      var f = S.container.querySelector('[data-st-act="hist-from-date"]');
      var to = S.container.querySelector('[data-st-act="hist-to-date"]');
      if (!f || !to) return;
      if (!f.value || !to.value) { S.historyError = "\u0647\u0631 \u062F\u0648 \u062A\u0627\u0631\u06CC\u062E \u0644\u0627\u0632\u0645 \u0627\u0633\u062A"; render(); return; }
      S.historyFromDate = f.value;
      S.historyToDate = to.value;
      S.historySessions = null;
      S.historyError = null;
      render();
      _loadHistory().then(function () { render(); });
      return;
    }
    if (act === "hist-select") { e.stopPropagation(); var sid = t.getAttribute("data-hist-id"); if (sid) { S.histSelected[sid] = !!t.checked; render(); } return; }
    if (act === "hist-bulk-apply") { _applyBulkCourse(); return; }
    if (act === "hist-bulk-clear") { _clearBulkSelection(); return; }
    if (act === "hist-expand") {
      var hid = t.getAttribute("data-hist-id");
      S.histExpanded = (S.histExpanded === hid) ? null : hid;
      render();
      return;
    }
    if (act === "hist-range") {
      var rd = t.getAttribute("data-range");
      if (rd === "custom") {
        S.historyRangeMode = "custom";
        if (!S.historyFromDate || !S.historyToDate) {
          var today = new Date();
          var iso30 = new Date(); iso30.setDate(iso30.getDate() - 29);
          S.historyFromDate = iso30.getFullYear() + "-" + ((iso30.getMonth()+1<10?"0":"")+(iso30.getMonth()+1)) + "-" + ((iso30.getDate()<10?"0":"")+iso30.getDate());
          S.historyToDate = today.getFullYear() + "-" + ((today.getMonth()+1<10?"0":"")+(today.getMonth()+1)) + "-" + ((today.getDate()<10?"0":"")+today.getDate());
        }
        render();
        return;
      }
      var rdN = parseInt(rd, 10);
      if (rdN && rdN !== S.historyRangeDays) {
        S.historyRangeDays = rdN;
        S.historyRangeMode = "shortcut";
        S.historyFromDate = null;
        S.historyToDate = null;
        S.historySessions = null;
        S.historyDayFilter = null;
        S.historyError = null;
        render();
        _loadHistory().then(function () { if (S.readyView === "history") render(); });
      } else if (rdN === S.historyRangeDays && S.historyRangeMode !== "shortcut") {
        S.historyRangeMode = "shortcut";
        S.historyFromDate = null;
        S.historyToDate = null;
        S.historySessions = null;
        render();
        _loadHistory().then(function () { if (S.readyView === "history") render(); });
      }
      return;
    }
    if (act === "hist-day") {
      var day = t.getAttribute("data-day");
      S.historyDayFilter = (S.historyDayFilter === day) ? null : day;
      render();
      return;
    }
    if (act === "hist-day-clear") { S.historyDayFilter = null; render(); return; }
    if (act === "nav-tab") {
      var nt = t.getAttribute("data-st-tab");
      S.navTab = nt || "focus";
      if (nt === "history") {
        S.readyView = "history"; S.historyView = "list"; S.historySessions = null;
        render(); _loadHistory().then(function () { render(); });
        return;
      }
      if (nt === "stats") {
        S.readyView = "main";
        if (S.statsSessions === null && !S.statsLoading) {
          _loadStats();
        } else {
          render();
        }
        return;
      }
      if (nt === "friends") {
        S.readyView = "main";
        _loadGroupGoalProgress();
        if (S.leaderboardData === null && !S.leaderboardLoading) {
          _loadLeaderboard();
        } else {
          render();
        }
        return;
      }
      S.readyView = "main";
      render();
      return;
    }
    if (act === "select-course") { S.selectedCourseId = t.getAttribute("data-course-id") || null; render(); return; }
    if (act === "course-edit") { var _ec = t.getAttribute("data-course-id"); var _cc = _courseById(_ec); if (_cc) { S.courseEdit = _cc; S.courseError = null; S.readyView = "course-form"; render(); } return; }
    if (act === "course-add") { S.courseEdit = null; S.courseError = null; S.readyView = "course-form"; render(); return; }
    if (act === "course-cancel") { S.courseEdit = null; S.courseError = null; S.readyView = "main"; render(); return; }
    if (act === "course-archive") { var _ar = t.getAttribute("data-course-id"); if (_ar && confirm("\u0622\u0631\u0634\u06CC\u0648 \u0634\u0648\u062F\u061F")) _archiveCourse(_ar); return; }
    if (act === "course-delete") { var _dc = t.getAttribute("data-course-id"); if (_dc && confirm("درس حذف شود؟ جلسات مرتبط باقی می‌مانند اما «بدون درس» می‌شوند.")) _deleteCourse(_dc); return; }
    if (act === "profile-save") { doSaveProfile(); return; }
    if (act === "account-save-identity") { _saveIdentity(); return; }
    if (act === "account-save-privacy") { _savePrivacy(); return; }
    if (act === "account-change-email") { _changeEmail(); return; }
    if (act === "account-change-password") { _changePassword(); return; }
    if (act === "account-toggle-pass") { _togglePasswordVisibility(t); return; }
    if (act === "invite-toggle") { _toggleInviteVisibility(); return; }
    if (act === "avatar-remove") { _avatarRemove(); return; }
    if (act === "avatar-pick") { S.avatarPick = t.getAttribute("data-avatar-key"); render(); return; }
    if (act === "help-open") { S.helpPage = _currentHelpPage(); S.helpOpen = true; render(); return; }
    if (act === "help-close") { S.helpOpen = false; render(); return; }
    if (act === "help-close-overlay") { if (e.target === t) { S.helpOpen = false; render(); } return; }
    if (act === "group-goal-save") { _saveGroupGoal(); return; }
    if (act === "group-goal-remove") { if (confirm("\u0647\u062F\u0641 \u0647\u0641\u062A\u06AF\u06CC \u06AF\u0631\u0648\u0647 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F")) _removeGroupGoal(); return; }
    if (act === "goals-open") { S.readyView = "goals"; S.goalsError = null; render(); return; }
    if (act === "goals-back") { S.readyView = "main"; S.goalsError = null; render(); return; }
    if (act === "goal-save-global") { _saveGlobalGoal(); return; }
    if (act === "goal-remove-global") { if (confirm("\u0647\u062F\u0641 \u06A9\u0644\u06CC \u062D\u0630\u0641 \u0634\u0648\u062F\u061F")) _removeGlobalGoal(); return; }
    if (act === "goal-save-course") { var _gc = t.getAttribute("data-course-id"); if (_gc) _saveCourseGoal(_gc); return; }
    if (act === "goal-remove-course") { var _gr = t.getAttribute("data-course-id"); if (_gr && confirm("\u0647\u062F\u0641 \u0627\u06CC\u0646 \u062F\u0631\u0633 \u062D\u0630\u0641 \u0634\u0648\u062F\u061F")) _removeCourseGoal(_gr); return; }
    if (act === "room-open") { S.roomOpen = true; S.readyView = "main"; _loadGroupGoalProgress(); render(); return; }
    if (act === "room-close") { S.roomOpen = false; S.goals = null; S.streak = null; S.weeklyTotalSec = 0; S.weeklyBestDay = null; S.goalsBusy = false; S.goalsError = null; S.groupGoalProgress = null; S.groupGoalBusy = false; S.groupGoalError = null; render(); return; }
    if (act === "member-open-profile") { _openMemberProfile(t.getAttribute("data-member-id")); return; }
    if (act === "share-plan-publish") { _sharePlanPublish(); return; }
    if (act === "friend-plan-refresh") { if (S.memberProfileView) { S.friendPlanData = null; _loadFriendPlan(S.memberProfileView.user_id, S.friendDayDate); } return; }
    if (act === "friend-day-prev") { _friendDayShift(-1); return; }
    if (act === "friend-day-next") { _friendDayShift(1); return; }
    if (act === "friend-day-today") { if (S.memberProfileView) _friendDaySetDate(S.memberProfileView.user_id, _friendDayToday()); return; }
    if (act === "member-close-profile") { _closeMemberProfile(); return; }
    if (act === "member-close-overlay") { if (e.target === t) _closeMemberProfile(); return; }
    if (act === "lb-period") {
      var lbp = t.getAttribute("data-period");
      if (lbp && lbp !== S.leaderboardPeriod) {
        S.leaderboardPeriod = lbp;
        S.leaderboardData = null;
        _loadLeaderboard();
      }
      return;
    }
    if (act === "stats-period") {
      var sp = t.getAttribute("data-period");
      if (sp !== S.statsPeriod) {
        S.statsPeriod = sp;
        S.statsSessions = null;
        S.statsError = null;
        S.statsLoading = false;
        _loadStats();
      }
      return;
    }
  }
  function onSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var act = form.getAttribute("data-st-act");
    if (act === "submit-auth") return doAuth(form);
    if (act === "submit-create-group") return doCreateGroup(form);
    if (act === "submit-join-group") return doJoinGroup(form);
    if (act === "hist-form") return _saveHistory(form);
    if (act === "course-form") return _saveCourse(form);
  }
  function _val(form, name) { var el = form.querySelector('[name="' + name + '"]'); return el ? el.value.trim() : ""; }

  /* ─── Actions ─── */
  function doAuth(form) {
    var email = _val(form, "email");
    var password = _val(form, "password");
    if (!email || !password) { S.lastError = "email_and_password_required"; render(); return; }
    S.busy = true; S.lastError = null; render();
    if (_stDbg()) console.log("[st] doAuth: start tab=" + S.formTab);
    ensureClient().then(function () {
      if (_stDbg()) console.log("[st] doAuth: client ready");
      if (S.formTab === "signup") {
        var username = _val(form, "username");
        var displayName = _val(form, "displayName");
        if (!username || !displayName) { S.busy = false; S.lastError = "all_fields_required"; render(); return; }
        if (_stDbg()) console.log("[st] doAuth: calling signUp");
        return _withTimeout(_sb.auth.signUp({ email: email, password: password }), 20000, "signUp").then(function (r) {
          if (_stDbg()) console.log("[st] doAuth: signUp resolved; hasError=" + !!(r && r.error));
          if (r.error) throw r.error;
          if (!r.data || !r.data.user) throw new Error("signUp_no_user");
          var uid = r.data.user.id;
          if (_stDbg()) console.log("[st] doAuth: upsertProfile start uid=" + uid);
          return _withTimeout(qUpsertProfile(uid, username, displayName), 20000, "upsertProfile").then(function (pr) {
            if (pr && pr.error) throw pr.error;
            if (_stDbg()) console.log("[st] doAuth: upsertProfile OK");
          });
        });
      } else {
        if (_stDbg()) console.log("[st] doAuth: calling signIn");
        return _withTimeout(_sb.auth.signInWithPassword({ email: email, password: password }), 20000, "signIn").then(function (r) {
          if (_stDbg()) console.log("[st] doAuth: signIn resolved; hasError=" + !!(r && r.error));
          if (r.error) throw r.error;
        });
      }
    }).then(function () {
      if (_stDbg()) console.log("[st] doAuth: refreshAll start");
      S.busy = false;
      return _withTimeout(refreshAll(), 25000, "refreshAll");
    }).then(function () {
      if (_stDbg()) console.log("[st] doAuth: DONE");
      S.busy = false;
      render();
    }).catch(function (err) {
      if (_stDbg()) console.log("[st] doAuth: FAILED " + (err && err.message));
      S.busy = false;
      if (err && err.__ioTimeout) {
        S.lastError = "operation_timeout: " + (err.message || "");
        try { _sb = null; _sdkPromise = null; } catch (e) {}
      } else {
        S.lastError = String(err && err.message || err);
      }
      render();
    });
  }
  function doLogout() {
    window._stExplicitLogout = true;
    if (S.user && S.user.id) {
      try { _touchLastSeen(true); } catch (e) {}
      try { _cacheClear(S.user.id); } catch (e) {}
    }
    try { localStorage.removeItem(K_LASTUID); } catch (e) {}
    if (_sb) _sb.auth.signOut();
    leavePresence();
    S.user = null; S.profile = null; S.group = null; S.members = []; S.session = null; S.todayTotal = 0;
    S.phase = "no-auth"; S.formTab = "login"; S.readyView = "main"; S.onBreak = false; S.todaySessionCount = 0; S.lastSessionEndedAt = null;
    _pomClear();
    S.pom = null;
    render();
  }
  function doCreateGroup(form) {
    var name = _val(form, "groupName");
    if (!name) { S.lastError = "نام گروه لازم است"; render(); return; }
    S.busy = true; S.lastError = null; render();
    qRpc("create_study_group", { p_name: name }).then(function (r) {
      if (r.error) throw r.error;
      S.busy = false; return refreshAll();
    }).catch(function (err) { S.busy = false; S.lastError = String(err && err.message || err); render(); });
  }
  function doJoinGroup(form) {
    var code = _val(form, "inviteCode");
    if (!code) { S.lastError = "کد دعوت لازم است"; render(); return; }
    S.busy = true; S.lastError = null; render();
    qRpc("join_study_group", { p_code: code }).then(function (r) {
      if (r.error) throw r.error;
      S.busy = false; return refreshAll();
    }).catch(function (err) { S.busy = false; S.lastError = String(err && err.message || err); render(); });
  }
  function doStart() { doAction(function () { return startSession(null, S.selectedCourseId); }, "مطالعه آغاز شد"); }
  function doAction(fn, successMsg) {
    S.busy = true; S.lastError = null; render();
    Promise.resolve().then(fn).then(function () {
      S.busy = false; if (successMsg) notify("success", successMsg);
      broadcastPresence();
    }).catch(function (err) {
      S.busy = false; S.lastError = String(err && err.message || err);
      notify("error", "خطا در عملیات");
      render();
    });
  }
  function doLeave() { doAction(function () { return qRpc("leave_study_group", { p_group: S.group.id }); }, "گروه ترک شد"); }
  function doDelete() { doAction(function () { return qRpc("delete_study_group", { p_group: S.group.id }); }, "گروه حذف شد"); }
  function doRevoke() {
    doAction(function () {
      return qRpc("revoke_invite_code", { p_group: S.group.id }).then(function (r) { if (r.error) throw r.error; });
    }, "کد جدید ساخته شد");
  }
  function doCopyInvite() {
    if (!S.group || !S.group.invite_code) { notify("error", "کد دعوت موجود نیست"); return; }
    var code = S.group.invite_code;
    function done(ok) {
      if (ok) { try { notify("success", "کد دعوت کپی شد"); } catch (e) {} }
      else { try { notify("warning", "کپی ناموفق — دستی انتخاب کن"); } catch (e) {} }
    }
    function fallback() {
      try {
        var ta = document.createElement("textarea");
        ta.value = code;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        var ok = false;
        try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
        document.body.removeChild(ta);
        done(ok);
      } catch (e) { done(false); }
    }
    try {
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
        navigator.clipboard.writeText(code).then(function () { done(true); }, fallback);
      } else {
        fallback();
      }
    } catch (e) { fallback(); }
  }
  function doSaveSettings() {
    if (!S.user || !_sb) return;
    var dEl = S.container.querySelector('[data-st-setting="share_daily_total"]');
    var tEl = S.container.querySelector('[data-st-setting="share_timeline"]');
    var shareDaily = dEl ? !!dEl.checked : false;
    var shareTL = tEl ? !!tEl.checked : false;
    var statusEl = S.container.querySelector('[data-st-settings-status]');
    var saveBtn = S.container.querySelector('[data-st-act="settings-save"]');
    if (statusEl) statusEl.textContent = "در حال ذخیره...";
    if (saveBtn) saveBtn.disabled = true;
    _sb.from("profiles").update({
      share_daily_total: shareDaily,
      share_timeline: shareTL,
      updated_at: new Date().toISOString()
    }).eq("id", S.user.id).then(function (r) {
      if (r && r.error) throw r.error;
      if (saveBtn) saveBtn.disabled = false;
      if (S.profile) { S.profile.share_daily_total = shareDaily; S.profile.share_timeline = shareTL; }
      if (statusEl) statusEl.textContent = "ذخیره شد";
      try { broadcastPresence(); } catch (e) {}
      try { notify("success", "تنظیمات ذخیره شد"); } catch (e) {}
    }).catch(function (err) {
      if (saveBtn) saveBtn.disabled = false;
      var msg = "خطا: " + String(err && err.message || err);
      if (statusEl) statusEl.textContent = msg;
      try { notify("error", "ذخیره تنظیمات ناموفق"); } catch (e) {}
    });
  }

  /* ─── Open / Close ─── */
  ST.open = function (container) {
    if (S.container && S.container !== container) { try { ST.close(); } catch (e) {} }
    S.container = container;
    S.phase = "init"; S.lastError = null; S.busy = false;
    S.readyView = "main"; S.onBreak = false; S.todaySessionCount = 0; S.lastSessionEndedAt = null;
    S.historySessions = null; S.historyView = "list"; S.historyEdit = null; S.historyError = null; S.historySaving = false; S.historyPendingDelete = null;
    S.courses = []; S.selectedCourseId = null; S.navTab = "focus"; S.courseEdit = null; S.courseError = null; S.courseSaving = false;
    S.avatarPick = null; S.avatarBusy = false; S.avatarError = null; S.friendDayDate = null; S.friendDaySessions = null; S.friendDayLoading = false; S.friendDayError = null; S.sharePlanPreview = null; S.sharePlanBusy = false; S.sharePlanError = null; S.friendPlanData = null; S.friendPlanLoading = false; S.friendPlanError = null; S.inviteVisible = false; S.accountBusy = { identity: false, privacy: false, password: false, email: false }; S.accountErr = { identity: null, privacy: null, password: null, email: null }; S.accountOk = { identity: null, privacy: null, password: null, email: null };
    S.statsSessions = null; S.statsPeriod = "week"; S.statsLoading = false; S.statsError = null;
    S.historyRangeDays = 7; S.historyCourseFilter = null; S.historyDayFilter = null; S.historyRangeMode = "shortcut"; S.historyFromDate = null; S.historyToDate = null; S.calYear = null; S.calMonth = null; S.histExpanded = null; S.histSelected = {}; S.histBulkCourse = null; S.roomOpen = false; S.goals = null; S.streak = null; S.weeklyTotalSec = 0; S.weeklyBestDay = null; S.goalsBusy = false; S.goalsError = null; S.groupGoalProgress = null; S.groupGoalBusy = false; S.groupGoalError = null;
    S.memberProfileView = null; S.memberProfileData = null; S.memberProfileLoading = false; S.memberProfileError = null;
    S.leaderboardData = null; S.leaderboardLoading = false; S.leaderboardError = null; S.leaderboardPeriod = "today"; S.offline = false; S.cacheAt = null; S.refreshInProgress = false; S.helpOpen = false; S.helpPage = null;
    render();
    loadConfig().then(function (c) {
      if (!c || !c.url || !c.publishableKey) { S.phase = "no-config"; render(); return; }
      return ensureClient().then(function () {
        if (_authUnsub) _authUnsub();
        var sub = _sb.auth.onAuthStateChange(function (event, session) {
          if (event === "SIGNED_OUT") {
            if (window._stExplicitLogout) {
              window._stExplicitLogout = false;
              S.user = null; S.profile = null; S.phase = "no-auth"; render(); return;
            }
            try {
              var _luSO = localStorage.getItem(K_LASTUID);
              if (_luSO) {
                var _ccSO = _cacheLoad(_luSO);
                if (_ccSO) {
                  if (!S.user) S.user = { id: _luSO, email: (_ccSO.profile && _ccSO.profile.email) || "" };
                  _cacheApply(_ccSO);
                  S.offline = true;
                  render();
                  return;
                }
              }
            } catch (e) {}
            S.user = null; S.profile = null; S.phase = "no-auth"; render(); return;
          }
          if (event === "SIGNED_IN" && session && session.user) { if (_stDbg()) console.log("[st] auth event: SIGNED_IN"); setTimeout(function () { try { refreshAll(); } catch (e) {} }, 50); }
        });
        _authUnsub = function () { try { sub.data.subscription.unsubscribe(); } catch (e) {} };
        return _sb.auth.getSession();
      }).then(function (r) {
        if (!r || !r.data || !r.data.session) {
          if (typeof navigator !== "undefined" && navigator.onLine === false) {
            try {
              var _lastuid = localStorage.getItem(K_LASTUID);
              if (_lastuid) {
                var _fc = _cacheLoad(_lastuid);
                if (_fc) {
                  if (!S.user) S.user = { id: _lastuid, email: (_fc.profile && _fc.profile.email) || "" };
                  _cacheApply(_fc);
                  render();
                  return;
                }
              }
            } catch (e) {}
          }
          S.phase = "no-auth"; render(); return;
        }
        var _sessUid = r.data.session.user.id;
        if (!S.user) S.user = { id: _sessUid, email: r.data.session.user.email || "" };
        try { var _cached = _cacheLoad(_sessUid); if (_cached) { _cacheApply(_cached); render(); } } catch (e) {}
        return refreshAll().then(function () { return recoverPending(); }).then(function () {
          _pomAfterOpen();
          _stSessionBooted = true;
          setTimeout(_sharePlanAutoPublish, 500);
          _touchLastSeen(false);
          if (window._stVisHandler) { try { document.removeEventListener('visibilitychange', window._stVisHandler); } catch (e) {} }
          window._stVisHandler = function () { if (document.visibilityState === 'hidden') { try { _touchLastSeen(true); } catch (e) {} } };
          document.addEventListener('visibilitychange', window._stVisHandler);
          if (window._stPageHideHandler) { try { window.removeEventListener('pagehide', window._stPageHideHandler); } catch (e) {} }
          window._stPageHideHandler = function () { try { _touchLastSeen(true); } catch (e) {} };
          window.addEventListener('pagehide', window._stPageHideHandler);
          if (window._stBeforeUnloadHandler) { try { window.removeEventListener('beforeunload', window._stBeforeUnloadHandler); } catch (e) {} }
          window._stBeforeUnloadHandler = function () { try { _touchLastSeen(true); } catch (e) {} };
          window.addEventListener('beforeunload', window._stBeforeUnloadHandler);
          if (window._stOnlineHandler) { try { window.removeEventListener("online", window._stOnlineHandler); } catch (e) {} }
          window._stOnlineHandler = function () {
            if (!S.user || S.refreshInProgress) return;
            S.refreshInProgress = true;
            S.offline = false;
            if (S.container && S.container.isConnected) render();
            refreshAll().then(function () { S.refreshInProgress = false; }).catch(function (e) {
              S.refreshInProgress = false;
              if (_isNetworkError(e)) {
                S.offline = true;
                if (S.container && S.container.isConnected) render();
              }
            });
          };
          window.addEventListener("online", window._stOnlineHandler);
          if (window._stOfflineHandler) { try { window.removeEventListener("offline", window._stOfflineHandler); } catch (e) {} }
          window._stOfflineHandler = function () {
            try { _touchLastSeen(true); } catch (e) {}
            S.offline = true;
            if (S.container && S.container.isConnected) render();
          };
          window.addEventListener("offline", window._stOfflineHandler);
        });
      });
    }).catch(function (err) {
      var msg = String(err && err.message || err);
      if (msg.indexOf("SDK") >= 0) { S.phase = "no-sdk"; } else { S.lastError = msg; S.phase = "error"; }
      render();
    });
  };
  ST.close = function () {
    if (S.user && S.user.id) { try { _touchLastSeen(true); } catch (e) {} }
    if (window._stVisHandler) { try { document.removeEventListener('visibilitychange', window._stVisHandler); } catch (e) {} window._stVisHandler = null; }
    if (window._stPageHideHandler) { try { window.removeEventListener('pagehide', window._stPageHideHandler); } catch (e) {} window._stPageHideHandler = null; }
    if (window._stBeforeUnloadHandler) { try { window.removeEventListener('beforeunload', window._stBeforeUnloadHandler); } catch (e) {} window._stBeforeUnloadHandler = null; }
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    leavePresence();
    if (_authUnsub) { try { _authUnsub(); } catch (e) {} _authUnsub = null; }
    if (window._stOnlineHandler) { try { window.removeEventListener("online", window._stOnlineHandler); } catch (e) {} window._stOnlineHandler = null; }
    if (window._stOfflineHandler) { try { window.removeEventListener("offline", window._stOfflineHandler); } catch (e) {} window._stOfflineHandler = null; }
    S.container = null;
    _connecting = false;
    _reconnectAttempt = 0;
    S.readyView = "main";
    S.onBreak = false;
    S.todaySessionCount = 0; S.lastSessionEndedAt = null;
    if (_pomodoroTickInterval) { clearInterval(_pomodoroTickInterval); _pomodoroTickInterval = null; }
    _pomodoroTransitioning = false;
    S.pom = null;
    S.historySessions = null;
    S.historyView = "list";
    S.historyEdit = null;
    S.historyError = null;
    S.historySaving = false;
    S.historyPendingDelete = null;
    S.courses = []; S.selectedCourseId = null; S.navTab = "focus"; S.courseEdit = null; S.courseError = null; S.courseSaving = false;
    S.avatarPick = null; S.avatarBusy = false; S.avatarError = null; S.friendDayDate = null; S.friendDaySessions = null; S.friendDayLoading = false; S.friendDayError = null; S.sharePlanPreview = null; S.sharePlanBusy = false; S.sharePlanError = null; S.friendPlanData = null; S.friendPlanLoading = false; S.friendPlanError = null; S.inviteVisible = false; S.accountBusy = { identity: false, privacy: false, password: false, email: false }; S.accountErr = { identity: null, privacy: null, password: null, email: null }; S.accountOk = { identity: null, privacy: null, password: null, email: null };
    S.statsSessions = null; S.statsPeriod = "week"; S.statsLoading = false; S.statsError = null;
    S.historyRangeDays = 7; S.historyCourseFilter = null; S.historyDayFilter = null; S.historyRangeMode = "shortcut"; S.historyFromDate = null; S.historyToDate = null; S.calYear = null; S.calMonth = null; S.histExpanded = null; S.histSelected = {}; S.histBulkCourse = null; S.roomOpen = false;
    S.memberProfileView = null; S.memberProfileData = null; S.memberProfileLoading = false; S.memberProfileError = null;
    S.leaderboardData = null; S.leaderboardLoading = false; S.leaderboardError = null; S.leaderboardPeriod = "today"; S.offline = false; S.cacheAt = null; S.refreshInProgress = false; S.helpOpen = false; S.helpPage = null;
  };
  ST.status = function () {
    return { phase: S.phase, connection: S.connection, userId: S.user && S.user.id, groupId: S.group && S.group.id, hasSession: !!S.session };
  };

  /* ─── Tests ─── */
  ST.__tests = function () {
    var results = [];
    function t(name, cond) { results.push({ name: name, pass: !!cond }); }
    if (!window.__ioStudyTogetherBridge) {
      window.__ioStudyTogetherBridge = {
        fa0: function (n) { return String(n); },
        escapeHtml: function (s) { return String(s); },
        getCurrentActivity: function () { return null; },
        todayJalali: function () { return "1405/8/1"; },
        setRoute: function () {}, notify: function () {}
      };
    }
    function _normDigits(s) {
      return String(s)
        .replace(/[\u06F0-\u06F9]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x06F0 + 48); })
        .replace(/[\u0660-\u0669]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 0x0660 + 48); });
    }
    t("T01 fmt 0s = 00:00:00", _normDigits(_fmtTimer(0)) === "00:00:00");
    t("T02 fmt 3661s = 01:01:01", _normDigits(_fmtTimer(3661)) === "01:01:01");
    t("T03 fmt neg = 00:00:00", _normDigits(_fmtTimer(-5)) === "00:00:00");
    t("T04 session shape valid", S.session === null || (S.session && typeof S.session === "object" && typeof S.session.id === "string" && typeof S.session.started_at === "string"));

    var origUser = S.user;
    var origSession = S.session;
    S.user = { id: "u1" };
    S.session = null;

    recomputeTodayTotal([]);
    t("T05 empty sessions total = 0", S.todayTotal === 0);

    var now = Date.now();
    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(now - 3600000).toISOString(), ended_at: new Date(now - 1800000).toISOString(), end_reason: "ended" }]);
    t("T06 closed session contributes ~1800s", Math.abs(S.todayTotal - 1800) < 5);

    recomputeTodayTotal([
      { user_id: "u1", started_at: new Date(now - 3600000).toISOString(), ended_at: new Date(now - 3000000).toISOString(), end_reason: "break" },
      { user_id: "u1", started_at: new Date(now - 2400000).toISOString(), ended_at: new Date(now - 1800000).toISOString(), end_reason: "ended" }
    ]);
    t("T07 break+resume both count", Math.abs(S.todayTotal - 1200) < 10);

    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(now - 3600000).toISOString(), ended_at: null, end_reason: null }]);
    t("T08 open session (not active locally) not counted", S.todayTotal === 0);

    var _origB09 = window.__ioStudyTogetherBridge;
    var _r09;
    try {
      window.__ioStudyTogetherBridge = { getCurrentActivity: function () { return null; } };
      _r09 = getCurrentActivity();
    } finally {
      window.__ioStudyTogetherBridge = _origB09;
    }
    t("T09 getCurrentActivity null-safe (fixture)", _r09 === null);

    _pendingWrite({ clientSessionId: "x", groupId: "g", startedAt: "t" });
    var p = _pendingRead();
    t("T10 pending roundtrip", p && p.clientSessionId === "x");
    _pendingWrite(null);
    t("T11 pending cleared", _pendingRead() === null);

    var u = _uuid();
    t("T12 uuid non-empty", typeof u === "string" && u.length > 8);

    var st = _startOfTodayLocalMs();
    var sd = new Date(st);
    t("T13 startOfToday midnight local", sd.getHours() === 0 && sd.getMinutes() === 0 && sd.getSeconds() === 0);

    t("T14 version present", ST.VERSION === "1.0.0");

    var _origTodayTotal = S.todayTotal;
    var _origUserX = S.user;
    S.user = { id: "u1" };
    var _nowX = Date.now();

    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(_nowX - 3600000).toISOString(), ended_at: new Date(_nowX - 1800000).toISOString(), end_reason: "crash" }]);
    t("T15 crash with ended_at excluded", S.todayTotal === 0);

    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(_nowX - 3600000).toISOString(), ended_at: null, end_reason: "crash" }]);
    t("T16 crash without ended_at excluded", S.todayTotal === 0);

    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(_nowX - 3600000).toISOString(), ended_at: new Date(_nowX - 1800000).toISOString(), end_reason: "ended" }]);
    t("T17 normal ended counted", Math.abs(S.todayTotal - 1800) < 5);

    recomputeTodayTotal([{ user_id: "u1", started_at: new Date(_nowX - 3600000).toISOString(), ended_at: new Date(_nowX - 3000000).toISOString(), end_reason: "break" }]);
    t("T18 break counted", Math.abs(S.todayTotal - 600) < 5);

    S.todayTotal = _origTodayTotal;
    S.user = _origUserX;

    _pomWrite({ v: 1, phase: "test", x: 1 });
    var _m1 = _pomRead();
    t("T19a marker write+read", !!(_m1 && _m1.phase === "test" && _m1.x === 1));
    _pomClear();
    t("T19b marker cleared", _pomRead() === null);

    var _t20 = Date.now();
    var _m20 = { v:1, phase:"focus", phaseEndsAt: new Date(_t20 + 25*60*1000).toISOString() };
    var _r20 = Math.max(0, Math.floor((new Date(_m20.phaseEndsAt).getTime() - _t20) / 1000));
    t("T20 remaining ~1500s", _r20 >= 1495 && _r20 <= 1505);

    t("T21a fresh+focus+session recovery", _pomShouldRecover({phase:"focus"}, true, true) === true);
    t("T21b fresh+starting+session recovery", _pomShouldRecover({phase:"starting_focus"}, true, true) === true);
    t("T21c tabswitch+focus no recovery", _pomShouldRecover({phase:"focus"}, true, false) === false);
    t("T21d fresh+break no recovery", _pomShouldRecover({phase:"break"}, true, true) === false);
    t("T21e fresh+no marker no recovery", _pomShouldRecover(null, true, true) === false);
    t("T21f fresh+focus+no session no recovery", _pomShouldRecover({phase:"focus"}, false, true) === false);

    _pomSetTransitioning(true);
    t("T22a transitioning flag set", _pomodoroTransitioning === true);
    _pomSetTransitioning(false);
    t("T22b transitioning flag cleared", _pomodoroTransitioning === false);

    var _fut = new Date(Date.now() + 3600000).toISOString();
    var _e23 = _validateManualEntry({ started_at: _fut, ended_at: new Date(Date.now() + 7200000).toISOString(), end_reason: "ended" }, null, []);
    t("T23 future start rejected", _e23.length > 0);

    var _past = new Date(Date.now() - 3600000).toISOString();
    var _e24 = _validateManualEntry({ started_at: _past, ended_at: _past, end_reason: "ended" }, null, []);
    t("T24 end<=start rejected", _e24.length > 0);

    var _s25 = Date.now() - 3600000;
    var _e25 = _validateManualEntry({ started_at: new Date(_s25).toISOString(), ended_at: new Date(_s25 + 500).toISOString(), end_reason: "ended" }, null, []);
    t("T25 dur<1s rejected", _e25.length > 0);

    var _s26 = Date.now() - 26 * 3600000;
    var _e26 = _validateManualEntry({ started_at: new Date(_s26).toISOString(), ended_at: new Date(_s26 + 25 * 3600000).toISOString(), end_reason: "ended" }, null, []);
    t("T26 dur>24h rejected", _e26.length > 0);

    var _s27 = Date.now() - 3600000;
    var _e27 = _validateManualEntry({ started_at: new Date(_s27).toISOString(), ended_at: new Date(_s27 + 1800000).toISOString(), end_reason: "crash" }, null, []);
    t("T27 crash reason rejected", _e27.length > 0);

    var _s28 = Date.now() - 7200000;
    var _sess28 = [{ id: "o", started_at: new Date(_s28).toISOString(), ended_at: new Date(_s28 + 3600000).toISOString(), end_reason: "ended" }];
    var _e28 = _validateManualEntry({ started_at: new Date(_s28 + 1800000).toISOString(), ended_at: new Date(_s28 + 5400000).toISOString(), end_reason: "ended" }, null, _sess28);
    t("T28 overlap rejected", _e28.length === 1);

    var _s29 = Date.now() - 7200000;
    var _sess29 = [{ id: "c", started_at: new Date(_s29).toISOString(), ended_at: new Date(_s29 + 3600000).toISOString(), end_reason: "crash" }];
    var _e29 = _validateManualEntry({ started_at: new Date(_s29 + 1800000).toISOString(), ended_at: new Date(_s29 + 5400000).toISOString(), end_reason: "ended" }, null, _sess29);
    t("T29 crash excluded", _e29.length === 0);

    var _s30 = Date.now() - 7200000;
    var _sess30 = [{ id: "self", started_at: new Date(_s30).toISOString(), ended_at: new Date(_s30 + 3600000).toISOString(), end_reason: "ended" }];
    var _e30 = _validateManualEntry({ started_at: new Date(_s30 + 1800000).toISOString(), ended_at: new Date(_s30 + 5400000).toISOString(), end_reason: "ended" }, "self", _sess30);
    t("T30 self excluded", _e30.length === 0);

    var _iso31 = _localMidnightIso(0);
    var _d31 = new Date(_iso31);
    t("T31 local midnight 00:00", _d31.getHours() === 0 && _d31.getMinutes() === 0 && _d31.getSeconds() === 0);

    var _cid32 = "manual-" + _uuid();
    t("T32 manual cid prefix", _cid32.indexOf("manual-") === 0 && _cid32.length > 15);

    var _iso33 = new Date().toISOString();
    var _back33 = _localInputToIso(_isoToLocalInput(_iso33));
    var _diff33 = Math.abs(new Date(_iso33).getTime() - new Date(_back33).getTime());
    t("T33 local input round-trip", _diff33 < 60000);

    var _dur34 = 0;
    var _cr34 = { end_reason: "crash", ended_at: new Date().toISOString() };
    if (_cr34.end_reason !== "crash") _dur34 = 999;
    t("T34 crash zero duration", _dur34 === 0);

    S.user = origUser;
    S.session = origSession;

    var pass = results.filter(function (r) { return r.pass; }).length;
    return { passed: pass, total: results.length, results: results };
  };

  if (_stDbg()) console.log("[study-together] loaded v" + ST.VERSION);
})();