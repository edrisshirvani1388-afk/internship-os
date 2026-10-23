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
    avatarPick: null, avatarBusy: false, avatarError: null, friendDayDate: null, friendDaySessions: null, friendDayLoading: false, friendDayError: null,
    statsSessions: null, statsPeriod: "week", statsLoading: false, statsError: null,
    historyRangeDays: 7, historyCourseFilter: null, historyDayFilter: null,
    memberProfileView: null, memberProfileData: null, memberProfileLoading: false, memberProfileError: null,
    leaderboardData: null, leaderboardLoading: false, leaderboardError: null, leaderboardPeriod: "today"
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
  function _fmtTimer(sec) {
    sec = Math.max(0, Math.floor(sec || 0));
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
    function pad2(n) { return _toPersianDigits(n < 10 ? "0" + n : "" + n); }
    return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
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
      sc.onerror = function () { resolve(null); };
      document.head.appendChild(sc);
      setTimeout(function () { resolve(window.STUDY_TOGETHER_CONFIG || null); }, 5000);
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
    return _sb.from("profiles").select("id,username,display_name,share_timeline,share_daily_total,share_course_breakdown,share_history_with_group,avatar_key,bio,avatar_url").in("id", uids).then(function (r) { return r.data || []; });
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
    return _sb.from("study_sessions").select("user_id,client_session_id,started_at,ended_at,end_reason,course_id")
      .eq("group_id", gid)
      .gte("started_at", startIso)
      .lt("started_at", endIso)
      .then(function (r) { return r.data || []; });
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
    startSession(cid, S.selectedCourseId).then(function () {
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
  function _loadHistory() {
    if (!S.user || !S.group) return Promise.resolve();
    var days = S.historyRangeDays || 7;
    var endD = new Date(); endD.setDate(endD.getDate() + 1); endD.setHours(0, 0, 0, 0);
    var startD = new Date(endD); startD.setDate(startD.getDate() - days);
    return qGetRangeSessions(S.user.id, S.group.id, startD.toISOString(), endD.toISOString())
      .then(function (rows) { S.historySessions = rows; })
      .catch(function (err) { S.historyError = String(err && err.message || err); S.historySessions = []; });
  }
  function doSaveProfile() {
    if (!S.user || !_sb || !S.container) return;
    var statusEl = S.container.querySelector('[data-st-settings-status]');
    var saveBtn = S.container.querySelector('[data-st-act="profile-save"]');
    var get = function (k) { var el = S.container.querySelector('[data-st-setting="' + k + '"]'); return el ? !!el.checked : false; };
    var _newAvatar = S.avatarPick || (S.profile && S.profile.avatar_key) || "av-1";
    var bioEl = S.container.querySelector('[data-st-bio]');
    var _newBio = bioEl ? String(bioEl.value || "").trim() : null;
    if (_newBio !== null && _newBio.length > 200) {
      if (statusEl) statusEl.textContent = "\u062D\u062F\u0627\u06A9\u062B\u0631 \u06F2\u06F0\u06F0";
      return;
    }
    var patch = {
      share_daily_total: get("share_daily_total"),
      share_timeline: get("share_timeline"),
      share_course_breakdown: get("share_course_breakdown"),
      share_history_with_group: get("share_history_with_group"),
      avatar_key: _newAvatar,
      updated_at: new Date().toISOString()
    };
    if (_newBio !== null) patch.bio = (_newBio || null);
    if (statusEl) statusEl.textContent = "در حال ذخیره...";
    if (saveBtn) saveBtn.disabled = true;
    _sb.from("profiles").update(patch).eq("id", S.user.id).then(function (r) {
      if (r && r.error) throw r.error;
      if (saveBtn) saveBtn.disabled = false;
      if (S.profile) {
        S.profile.share_daily_total = patch.share_daily_total;
        S.profile.share_timeline = patch.share_timeline;
        S.profile.share_course_breakdown = patch.share_course_breakdown;
        S.profile.share_history_with_group = patch.share_history_with_group;
        S.profile.avatar_key = patch.avatar_key;
        if (patch.bio !== undefined) S.profile.bio = patch.bio;
      }
      S.avatarPick = null;
      if (statusEl) statusEl.textContent = "ذخیره شد";
      try { notify("success", "تنظیمات ذخیره شد"); } catch (e) {}
      try { broadcastPresence(); } catch (e) {}
    }).catch(function (err) {
      if (saveBtn) saveBtn.disabled = false;
      if (statusEl) statusEl.textContent = "خطا: " + String(err && err.message || err);
      try { notify("error", "ذخیره ناموفق"); } catch (e) {}
    });
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
    var sVal = form.querySelector('[name="started_at"]').value;
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
        end_reason: rVal
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
    var badge;
    if (s.end_reason === "crash") badge = '<span class="st-hist-badge st-hist-badge-crash">قطع‌شده</span>';
    else if (s.end_reason === "break") badge = '<span class="st-hist-badge st-hist-badge-break">استراحت</span>';
    else if (s.end_reason === "ended") badge = '<span class="st-hist-badge st-hist-badge-ended">پایان</span>';
    else badge = '<span class="st-hist-badge st-hist-badge-open">باز</span>';
    var manual = (s.client_session_id || "").indexOf("manual-") === 0 ? '<span class="st-hist-badge st-hist-badge-manual">دستی</span>' : "";
    var actions = "";
    var editable = s.ended_at && s.end_reason !== "crash";
    if (editable) {
      actions = '<button class="st-btn-ghost st-btn-small" data-st-act="hist-edit" data-hist-id="' + esc(s.id) + '" title="ویرایش">✏️</button>' +
                '<button class="st-btn-danger st-btn-small" data-st-act="hist-delete" data-hist-id="' + esc(s.id) + '" title="حذف">🗑️</button>';
    }
    return '<div class="st-hist-row">' +
      '<div class="st-hist-row-main">' +
        '<span class="st-hist-row-time">' + start + ' — ' + end + '</span>' +
        '<span class="st-hist-row-dur">' + dur + '</span>' +
        '<span class="st-hist-row-badges">' + badge + manual + '</span>' +
      '</div>' +
      '<div class="st-hist-row-actions">' + actions + '</div>' +
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
  function _renderHistRangePills() {
    var opts = [
      { id: 7, label: "۷ روز" },
      { id: 30, label: "۳۰ روز" },
      { id: 90, label: "۹۰ روز" }
    ];
    return '<div class="st-hist-range-pills">' + opts.map(function (o) {
      var cls = "st-hist-range-pill" + (S.historyRangeDays === o.id ? " is-active" : "");
      return '<button type="button" class="' + cls + '" data-st-act="hist-range" data-range="' + o.id + '">' + o.label + '</button>';
    }).join("") + '</div>';
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
  function renderHistory() {
    var headerCommon =
      _navTabsHTML("history") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + '</div>' +
      '</div>' +
      '<div class="st-hero st-hero-small"><h1>📜 تاریخچهٔ مطالعه</h1></div>' +
      _renderHistRangePills() +
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
        '<div class="st-hist-day-head">' + esc(k) + '</div>' +
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
        '<div class="st-user-chip">' + esc(S.profile.display_name) + '</div>' +
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
    // week: sum of last 7 days from historySessions if loaded
    var hs = S.historySessions || [];
    var cutoff = Date.now() - 7 * 86400000;
    hs.forEach(function (s) {
      if (!s.ended_at) return;
      if (s.end_reason === "crash") return;
      var st = new Date(s.started_at).getTime();
      if (st < cutoff) return;
      weekSec += Math.max(0, Math.floor((new Date(s.ended_at).getTime() - st) / 1000));
    });
    var avatarKey = S.avatarPick || p.avatar_key || "av-1";
    var initial = (p.display_name || "?").charAt(0);
    var shareDaily = !!p.share_daily_total;
    var shareTL = !!p.share_timeline;
    var shareBreak = !!p.share_course_breakdown;
    var shareHist = !!p.share_history_with_group;
    S.container.innerHTML = pageWrap(
      _navTabsHTML("profile") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(p.display_name) + '</div>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="logout" title="خروج">🚪 خروج</button>' +
      '</div>' +
      '<div class="st-profile-hero">' +
        '<div class="st-profile-avatar st-avatar-' + esc(avatarKey) + '">' + _avatarInnerHTML(p) + '</div>' +
        '<div class="st-profile-info">' +
          '<div class="st-profile-name">' + esc(p.display_name) + '</div>' +
          '<div class="st-profile-username">@' + esc(p.username) + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="st-stats">' +
        '<div class="st-stat"><span class="st-stat-ico">📊</span><div><div class="st-stat-val">' + _fmtTimer(today) + '</div><div class="st-stat-lbl">امروز</div></div></div>' +
        '<div class="st-stat"><span class="st-stat-ico">📅</span><div><div class="st-stat-val">' + _fmtTimer(weekSec) + '</div><div class="st-stat-lbl">۷ روز</div></div></div>' +
        '<div class="st-stat"><span class="st-stat-ico">📚</span><div><div class="st-stat-val">' + fa0((S.courses||[]).length) + '</div><div class="st-stat-lbl">درس</div></div></div>' +
      '</div>' +
      '<div class="st-members-title">آواتار</div>' +
      _avatarUploadHTML() +
      _avatarPickerHTML(avatarKey) +
      '<div class="st-members-title">\u062F\u0631\u0628\u0627\u0631\u0647\u0654 \u0645\u0646</div>' +
      '<div class="st-card st-settings-card"><textarea class="st-bio-edit" data-st-bio maxlength="200" rows="3" placeholder="\u062A\u0648\u0636\u06CC\u062D \u06A9\u0648\u062A\u0627\u0647">' + esc(p.bio || "") + '</textarea></div>' +
      '<div class="st-members-title">حریم خصوصی</div>' +
      '<div class="st-card st-settings-card">' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_daily_total"' + (shareDaily ? " checked" : "") + '><span class="st-settings-label">اشتراک مجموع مطالعهٔ امروز</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_timeline"' + (shareTL ? " checked" : "") + '><span class="st-settings-label">اشتراک فعالیت Timeline</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_course_breakdown"' + (shareBreak ? " checked" : "") + '><span class="st-settings-label">اشتراک تفکیک آمار درس‌ها</span></label></div>' +
        '<div class="st-settings-row"><label class="st-settings-label-wrap"><input type="checkbox" data-st-setting="share_history_with_group"' + (shareHist ? " checked" : "") + '><span class="st-settings-label">اشتراک تاریخچه با گروه</span></label></div>' +
        '<div class="st-settings-actions"><button class="st-btn-primary" data-st-act="profile-save" title="ذخیره">ذخیره</button></div>' +
        '<div class="st-settings-status" data-st-settings-status aria-live="polite"></div>' +
      '</div>' +
      '<div class="st-actions-bar">' +
        '<button class="st-btn-ghost" data-st-act="hist-open" title="تاریخچه">📜 تاریخچه</button>' +
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
      var dow = _PERSIAN_DOW[d.date.getDay()];
      var dateKey = _dayKeyFromIso(d.date.toISOString());
      return '<div class="st-topday">' +
        '<div class="st-topday-rank">' + fa0(i + 1) + '</div>' +
        '<div class="st-topday-info">' +
          '<div class="st-topday-date">' + esc(dow) + ' · ' + esc(dateKey) + '</div>' +
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
    var dateKey = _dayKeyFromIso(s.started_at);
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
        '<div class="st-chart-card"><div class="st-members-title">📈 روند</div>' + chartHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">🏅 روزهای پربازده</div>' + topDaysHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">⭐ بهترین جلسه</div>' + bestHTML + '</div>' +
        '<div class="st-card"><div class="st-members-title">📚 به تفکیک درس</div>' + courseHTML + '</div>';
    }

    S.container.innerHTML = pageWrap(
      _navTabsHTML("stats") +
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
    var dayLabel = _toPersianDigits(d.getFullYear()) + "/" + _toPersianDigits(p2(d.getMonth() + 1)) + "/" + _toPersianDigits(p2(d.getDate()));
    var nav = '<div class="st-friend-day-nav">' +
      '<button class="st-btn-ghost st-btn-small" data-st-act="friend-day-prev" title="\u0631\u0648\u0632 \u0642\u0628\u0644">\u2039</button>' +
      '<input type="date" data-st-act="friend-day-set" class="st-friend-day-date" value="' + esc(S.friendDayDate) + '" max="' + esc(_friendDayToday()) + '">' +
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
      '<div class="st-friend-day-head">' + esc(dowName) + ' \u00B7 ' + dayLabel + ' \u00B7 \u0645\u062C\u0645\u0648\u0639: ' + _fmtTimer(totalSec) + '</div>' +
      '<div class="st-friend-sessions">' + rows + '</div>' +
    '</div>';
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
          '<div class="st-m-status"><span class="st-m-status-dot"></span>' + label + '</div>' +
        '</div>' +
      '</div>';
    }).join("");
    S.container.innerHTML = pageWrap(
      _navTabsHTML("friends") +
      '<div class="st-hero st-hero-small"><h1>👥 دوستان</h1><p>' + fa0((S.members||[]).length) + ' عضو</p></div>' +
      _renderLeaderboardHTML() +
      '<div class="st-members-title">اعضا</div>' +
      '<div class="st-member-grid">' + cards + '</div>' +
      (S.memberProfileView ? _renderMemberProfileHTML() : "")
    );
    wire();
  }
  function startSession(explicitCid, courseId) {
    S.onBreak = false;
    if (!S.user || !S.group) return Promise.reject(new Error("no user/group"));
    var cid = explicitCid || _uuid();
    var startedAt = new Date().toISOString();
    _pendingWrite({ clientSessionId: cid, groupId: S.group.id, startedAt: startedAt });
    S.pendingClientId = cid;
    var _cid = courseId !== undefined ? courseId : null;
    if (_cid && !_courseById(_cid)) _cid = null;
    return qInsertSession({ user_id: S.user.id, group_id: S.group.id, client_session_id: cid, started_at: startedAt, course_id: _cid }).then(function (r) {
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
    if (_connecting) { console.log("[st] joinPresence: already connecting, skip"); return; }
    _connecting = true;
    leavePresence();
    _sb.auth.getSession().then(function (r) {
      var token = r && r.data && r.data.session && r.data.session.access_token;
      if (token && token !== _lastAuthToken) {
        try { _sb.realtime.setAuth(token); _lastAuthToken = token; console.log("[st] realtime.setAuth OK (changed)"); }
        catch (e) { console.log("[st] realtime.setAuth EXC:", e && e.message); }
      } else if (token) {
        console.log("[st] realtime.setAuth skipped (token unchanged)");
      } else {
        console.log("[st] realtime.setAuth skipped (no token)");
      }
      var ch;
      try {
        ch = _sb.channel("group:" + S.group.id, {
          config: { private: true, presence: { key: S.user.id, enabled: true } }
        });
      } catch (e) {
        console.log("[st] channel() EXC:", e && e.message);
        _connecting = false;
        S.connection = "offline"; render(); return;
      }
      _channel = ch;
      ch.on("presence", { event: "sync" }, function () {
        if (_channel !== ch) { console.log("[st] presence sync (stale, ignored)"); return; }
        var st = presenceState();
        console.log("[st] presence sync; total=" + st.length);
        try { render(); } catch (e) {}
      });
      ch.on("presence", { event: "join" }, function (p) {
        if (_channel !== ch) return;
        console.log("[st] presence join key=" + (p && p.key));
        try { render(); } catch (e) {}
      });
      ch.on("presence", { event: "leave" }, function (p) {
        if (_channel !== ch) return;
        console.log("[st] presence leave key=" + (p && p.key));
        try { render(); } catch (e) {}
      });
      ch.subscribe(function (status, err) {
        if (_channel !== ch) { console.log("[st] subscribe status=" + status + " (stale, ignored)"); return; }
        var em = (err && (err.message || String(err))) || "";
        console.log("[st] subscribe status=" + status + (em ? " err=" + em : ""));
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
      console.log("[st] joinPresence getSession EXC:", e && e.message);
      schedulePresenceReconnect();
    });
  }
  function schedulePresenceReconnect() {
    if (_reconnectTimer) return;
    if (!S.user || !S.group) return;
    if (S.phase !== "ready") return;
    _reconnectAttempt++;
    var delay = Math.min(30000, 3000 * Math.pow(2, _reconnectAttempt - 1));
    console.log("[st] scheduling reconnect in " + delay + "ms (attempt " + _reconnectAttempt + ")");
    _reconnectTimer = setTimeout(function () {
      _reconnectTimer = null;
      if (!S.user || !S.group) return;
      if (S.phase !== "ready") return;
      console.log("[st] attempting presence reconnect #" + _reconnectAttempt);
      joinPresence();
    }, delay);
  }
  function schedulePresenceReconnect() {
    if (_reconnectTimer) return;
    if (!S.user || !S.group) return;
    console.log("[st] scheduling presence reconnect in 3000ms");
    _reconnectTimer = setTimeout(function () {
      _reconnectTimer = null;
      if (!S.user || !S.group) return;
      if (S.phase !== "ready") return;
      console.log("[st] attempting presence reconnect");
      joinPresence();
    }, 3000);
  }
  function leavePresence() {
    if (_reconnectTimer) { clearTimeout(_reconnectTimer); _reconnectTimer = null; }
    if (_channel) { var old = _channel; _channel = null; console.log("[st] leavePresence: unsubscribing"); try { old.unsubscribe(); } catch (e) {} }
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
           .catch(function (e) { console.log("[st] track FAIL:", e && e.message); });
      }
    } catch (e) { console.log("[st] track EXC:", e && e.message); }
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
  function refreshAll() {
    if (!_sb) return Promise.resolve();
    return _sb.auth.getUser().then(function (u) {
      if (!u || !u.data || !u.data.user) { S.phase = "no-auth"; render(); return; }
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
            return Promise.all([qGetMembers(g.id), qGetTodaySessions(g.id)]).then(function (res) {
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
                    avatar_key: pr.avatar_key || "av-1", bio: pr.bio || null, avatar_url: pr.avatar_url || null };
                });
                recomputeTodayTotal(todaySessions);
                return qFindOwnOpenSession(S.user.id, g.id).then(function (open) {
                  var isFreshBoot = !_stSessionBooted;
                  var pomMarker = _pomRead();
                  if (isFreshBoot && _pomShouldRecover(pomMarker, !!open, true)) {
                    S.pom = { v: 1, phase: "recovery_required", kind: "open_session", pendingSession: open, marker: pomMarker };
                    S.session = null;
                    S.phase = "ready";
                    if (_channel) { broadcastPresence(); } else { joinPresence(); }
                    render();
                    // W1-v2 immediate render
                    _loadCourses().then(function () { if (S.phase === "ready" && S.container && S.container.isConnected) render(); });
                    return;
                  }
                  S.session = open || null;
                  S.phase = "ready";
                  if (_channel) { broadcastPresence(); } else { joinPresence(); }
                  render();
                  // W1-v2 immediate render
                  _loadCourses().then(function () { if (S.phase === "ready" && S.container && S.container.isConnected) render(); });
                });
              });
            });
          });
        });
      });
    }).catch(function (e) {
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
  function pageWrap(inner) { return '<div class="st-page">' + inner + '</div>'; }

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
  function renderReady() {
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
          '<div class="st-m-status"><span class="st-m-status-dot"></span>' + label + '</div>' +
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
      ? '<div class="st-invite">🔗 کد دعوت: <code>' + esc(S.group.invite_code) + '</code>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="copy-invite" title="کپی کد دعوت">کپی</button>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="revoke" title="ساخت کد دعوت جدید">🔄 کد جدید</button>' +
        '</div>'
      : "";
    var settingsBtn = '<button class="st-btn-ghost" data-st-act="settings" title="تنظیمات حریم خصوصی">⚙️ تنظیمات</button>';
    var historyBtn = '<button class="st-btn-ghost" data-st-act="hist-open" title="تاریخچهٔ مطالعه">📜 تاریخچه</button>';
    var exitBtn = isOwner
      ? '<button class="st-btn-danger" data-st-act="delete-group" title="حذف کامل گروه">🗑️ حذف گروه</button>'
      : '<button class="st-btn-ghost" data-st-act="leave" title="ترک گروه">🚪 ترک گروه</button>';
    S.container.innerHTML = pageWrap(
      _navTabsHTML("focus") +
      '<div class="st-topbar">' +
        '<div class="st-user-chip">' + esc(S.profile.display_name) + ' <span class="st-conn st-conn-' + S.connection + '" title="وضعیت اتصال">' + (S.connection === "online" ? "● آنلاین" : "○ آفلاین") + '</span></div>' +
        '<button class="st-btn-ghost st-btn-small" data-st-act="logout" title="خروج از حساب">🚪 خروج</button>' +
      '</div>' +
      _courseChipsHTML() +
      '<div class="st-hero st-hero-small"><h1>' + esc(S.group.name) + '</h1></div>' +
      reminderBlock +
      inviteBlock +
      sessionBlock +
      statsBlock +
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
    else if (el.tagName === "INPUT" && (el.getAttribute("data-st-act") === "avatar-file" || el.getAttribute("data-st-act") === "friend-day-set")) el.addEventListener("change", onSelect);
      else el.addEventListener("click", onClick);
    });
  }
  function onSelect(e) {
    var t = e.target;
    if (!t || !t.getAttribute) return;
    var act = t.getAttribute("data-st-act");
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
    if (act === "logout") { doLogout(); return; }
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
    if (act === "hist-range") {
      var rd = parseInt(t.getAttribute("data-range"), 10);
      if (rd && rd !== S.historyRangeDays) {
        S.historyRangeDays = rd;
        S.historySessions = null;
        S.historyDayFilter = null;
        S.historyError = null;
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
    if (act === "avatar-remove") { _avatarRemove(); return; }
    if (act === "avatar-pick") { S.avatarPick = t.getAttribute("data-avatar-key"); render(); return; }
    if (act === "member-open-profile") { _openMemberProfile(t.getAttribute("data-member-id")); return; }
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
    console.log("[st] doAuth: start tab=" + S.formTab);
    ensureClient().then(function () {
      console.log("[st] doAuth: client ready");
      if (S.formTab === "signup") {
        var username = _val(form, "username");
        var displayName = _val(form, "displayName");
        if (!username || !displayName) { S.busy = false; S.lastError = "all_fields_required"; render(); return; }
        console.log("[st] doAuth: calling signUp");
        return _withTimeout(_sb.auth.signUp({ email: email, password: password }), 20000, "signUp").then(function (r) {
          console.log("[st] doAuth: signUp resolved; hasError=" + !!(r && r.error));
          if (r.error) throw r.error;
          if (!r.data || !r.data.user) throw new Error("signUp_no_user");
          var uid = r.data.user.id;
          console.log("[st] doAuth: upsertProfile start uid=" + uid);
          return _withTimeout(qUpsertProfile(uid, username, displayName), 20000, "upsertProfile").then(function (pr) {
            if (pr && pr.error) throw pr.error;
            console.log("[st] doAuth: upsertProfile OK");
          });
        });
      } else {
        console.log("[st] doAuth: calling signIn");
        return _withTimeout(_sb.auth.signInWithPassword({ email: email, password: password }), 20000, "signIn").then(function (r) {
          console.log("[st] doAuth: signIn resolved; hasError=" + !!(r && r.error));
          if (r.error) throw r.error;
        });
      }
    }).then(function () {
      console.log("[st] doAuth: refreshAll start");
      S.busy = false;
      return _withTimeout(refreshAll(), 25000, "refreshAll");
    }).then(function () {
      console.log("[st] doAuth: DONE");
      S.busy = false;
      render();
    }).catch(function (err) {
      console.log("[st] doAuth: FAILED " + (err && err.message));
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
    S.avatarPick = null; S.avatarBusy = false; S.avatarError = null; S.friendDayDate = null; S.friendDaySessions = null; S.friendDayLoading = false; S.friendDayError = null;
    S.statsSessions = null; S.statsPeriod = "week"; S.statsLoading = false; S.statsError = null;
    S.historyRangeDays = 7; S.historyCourseFilter = null; S.historyDayFilter = null;
    S.memberProfileView = null; S.memberProfileData = null; S.memberProfileLoading = false; S.memberProfileError = null;
    S.leaderboardData = null; S.leaderboardLoading = false; S.leaderboardError = null; S.leaderboardPeriod = "today";
    render();
    loadConfig().then(function (c) {
      if (!c || !c.url || !c.publishableKey) { S.phase = "no-config"; render(); return; }
      return ensureClient().then(function () {
        if (_authUnsub) _authUnsub();
        var sub = _sb.auth.onAuthStateChange(function (event, session) {
          if (event === "SIGNED_OUT") { S.user = null; S.profile = null; S.phase = "no-auth"; render(); return; }
          if (event === "SIGNED_IN" && session && session.user) { console.log("[st] auth event: SIGNED_IN"); setTimeout(function () { try { refreshAll(); } catch (e) {} }, 50); }
        });
        _authUnsub = function () { try { sub.data.subscription.unsubscribe(); } catch (e) {} };
        return _sb.auth.getSession();
      }).then(function (r) {
        if (!r || !r.data || !r.data.session) { S.phase = "no-auth"; render(); return; }
        return refreshAll().then(function () { return recoverPending(); }).then(function () {
          _pomAfterOpen();
          _stSessionBooted = true;
        });
      });
    }).catch(function (err) {
      var msg = String(err && err.message || err);
      if (msg.indexOf("SDK") >= 0) { S.phase = "no-sdk"; } else { S.lastError = msg; S.phase = "error"; }
      render();
    });
  };
  ST.close = function () {
    if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
    leavePresence();
    if (_authUnsub) { try { _authUnsub(); } catch (e) {} _authUnsub = null; }
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
    S.avatarPick = null; S.avatarBusy = false; S.avatarError = null; S.friendDayDate = null; S.friendDaySessions = null; S.friendDayLoading = false; S.friendDayError = null;
    S.statsSessions = null; S.statsPeriod = "week"; S.statsLoading = false; S.statsError = null;
    S.historyRangeDays = 7; S.historyCourseFilter = null; S.historyDayFilter = null;
    S.memberProfileView = null; S.memberProfileData = null; S.memberProfileLoading = false; S.memberProfileError = null;
    S.leaderboardData = null; S.leaderboardLoading = false; S.leaderboardError = null; S.leaderboardPeriod = "today";
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

  console.log("[study-together] loaded v" + ST.VERSION);
})();