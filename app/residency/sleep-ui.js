/* Internship OS — F.7 Sleep Hub v2 (external module)
   R.sleepUI.render(viewEl) / .syncTasks() / ._ensure(s)
   Depends: window.__ioSleepBridge
*/
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[sleep-ui] R missing"); return; }

  function B() { return window.__ioSleepBridge; }
  function esc(s){ var b=B(); return b&&b.escapeHtml?b.escapeHtml(s):String(s==null?"":s); }
  function fa0(n){ var b=B(); return b&&b.fa0?b.fa0(n):String(n); }
  function fa1(n){ var b=B(); return b&&b.fa1?b.fa1(n):String(n); }
  function today(){ var b=B(); return b?b.todayJalali():""; }
  function parseJ(k){ var b=B(); return b?b.parseJalali(k):null; }
  function pretty(k){ var b=B(); return b&&b.prettyDate?b.prettyDate(k):k; }
  function addDays(jy,jm,jd,d){ var b=B(); return b&&b.addDaysJKey?b.addDaysJKey(jy,jm,jd,d):""; }
  function state(){ var b=B(); return b?b.state():null; }
  function save(){ var b=B(); if(b&&b.save) b.save(); try { if(b && b.updateBell) b.updateBell(); } catch (e) {} }  /* PATCH:phase-F7-bell2-ui */
  function notify(k,m){ var b=B(); if(b&&b.notify) b.notify(k,m); }

  var DOWS = ["شنبه","یکشنبه","دوشنبه","سه‌شنبه","چهارشنبه","پنجشنبه","جمعه"];

  function _weekdayIdx(key) { /* PATCH:phase-F7-fix3 */
    var p = parseJ(key); if (!p) return 0;
    var b = B(); if (!b || !b.weekdayName) return 0;
    var nm = String(b.weekdayName(p.jy, p.jm, p.jd) || "").replace(/\u200C/g,"").trim();
    var map = { "شنبه":0, "یکشنبه":1, "دوشنبه":2, "سه‌شنبه":3, "سه شنبه":3, "سه‌ شنبه":3, "چهارشنبه":4, "پنجشنبه":5, "پنج شنبه":5, "پنج‌شنبه":5, "جمعه":6 };
    return map[nm] != null ? map[nm] : 0;
  }

  function _ensure(s) { /* PATCH:phase-F7-fix1 */
    if (!s || typeof s !== "object") return null;
    if (!s.sleep || typeof s.sleep !== "object") s.sleep = {};
    var sl = s.sleep;
    if (!sl.schedule || typeof sl.schedule !== "object") sl.schedule = {};
    if (!sl.schedule.night || typeof sl.schedule.night !== "object") sl.schedule.night = {};
    var n = sl.schedule.night;
    if (n.enabled === undefined) n.enabled = true;
    if (!n.bedTime) n.bedTime = "23:00";
    if (!n.wakeTime) n.wakeTime = "07:00";
    if (!sl.schedule.nap || typeof sl.schedule.nap !== "object") sl.schedule.nap = {};
    var p = sl.schedule.nap;
    if (p.enabled === undefined) p.enabled = false;
    if (!p.time) p.time = "14:00";
    if (!p.durationMin || p.durationMin <= 0) p.durationMin = 60;
    if (!Array.isArray(p.weekdays) || p.weekdays.length !== 7) p.weekdays = [false,false,false,false,false,false,false];
    if (!Array.isArray(sl.log)) sl.log = [];
    return s;  /* PATCH:phase-F7-fix2 */
  }
  function _newId(){ return "sl-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2,6); }
  function _sortDesc(a){ return a.slice().sort(function(x,y){ return x.date<y.date?1:(x.date>y.date?-1:0); }); }

  function _toMin(t){
    if (!t || typeof t !== "string") return null;
    var p = t.split(":"); if (p.length!==2) return null;
    var h = parseInt(p[0],10), m = parseInt(p[1],10);
    if (!isFinite(h)||!isFinite(m)||h<0||h>23||m<0||m>59) return null;
    return h*60+m;
  }
  function _duration(bed,wake){
    var s=_toMin(bed), e=_toMin(wake);
    if (s==null||e==null) return null;
    var d = e-s; if (d<0) d+=1440; if (d===0) return null;
    return d;
  }
  function _fmtDur(min){ /* PATCH:phase-F7-v6 */
    if (min==null) return "—";
    var h=Math.floor(min/60), m=min%60;
    var hh = (h<10?"۰":"") + fa0(h);
    var mm = (m<10?"۰":"") + fa0(m);
    return hh+":"+mm;
  }
  function _hoursSel(val) {
    var h=""; for (var i=0;i<24;i++){ var v=(i<10?"0":"")+i; h+='<option value="'+v+'"'+(v===val?" selected":"")+'>'+((i<10?"۰":"")+fa0(i))+'</option>'; } return h;
  }
  function _minsSel(val) {
    var arr=[0,5,10,15,20,25,30,35,40,45,50,55]; var h="";
    for (var i=0;i<arr.length;i++){ var v=(arr[i]<10?"0":"")+arr[i]; h+='<option value="'+v+'"'+(v===val?" selected":"")+'>'+((arr[i]<10?"۰":"")+fa0(arr[i]))+'</option>'; }
    return h;
  }
  function _fmtTime(t){
    if (!t) return "—";
    var p=t.split(":"); if (p.length!==2) return t;
    var hh=parseInt(p[0],10), mm=parseInt(p[1],10);
    return fa0(hh)+":"+(mm<10?"۰":fa0(mm));
  }

  var _viewDate = null, _sub = "day", _range = 7;
  var _formOpen = false, _formData = null, _editingId = null;
  var _rootEl = null, _wired = false;

  function _selDate(){ return _viewDate || today(); }
  function _shiftDay(d){
    var base=_selDate(), p=parseJ(base); if (!p) return;
    var nx=addDays(p.jy,p.jm,p.jd,d), t=today();
    if (nx>t) nx=t;
    _viewDate = (nx===t) ? null : nx;
  }
  function _currentView(){ return _rootEl || document.querySelector(".view") || document.body; }
  function render(root){ /* PATCH:phase-F7-reenable */
    if (!root) return;
    _rootEl=root;
    _wire(root);
    root.innerHTML=_html();
    _applyFocus(root);
  }

  /* ═══════════ SYNC TASKS ═══════════ */
  function syncTasks() { /* PATCH:phase-F7-split5 — cross-midnight split with arrows */
    var s = _ensure(state()); if (!s) return;
    var sch = s.sleep.schedule;
    var todayK = today();
    var todayP = parseJ(todayK); if (!todayP) return;

    /* Purge all auto + orphan sleep-like */
    s.tasks = (s.tasks || []).filter(function(t){
      if (!t || !t.title) return true;
      if (t._sleepAuto) return false;
      if (t.title.indexOf("خواب شب") !== -1) return false;
      if (t.title.indexOf("چرت") !== -1) return false;
      return true;
    });

    var bm = _toMin(sch.night.bedTime);
    var wm = _toMin(sch.night.wakeTime);
    var ndEn = sch.night.enabled !== false;
    var npEn = sch.nap.enabled;
    var npDur = parseInt(sch.nap.durationMin, 10) || 60;

    for (var off = 0; off <= 30; off++) {
      var dayK = addDays(todayP.jy, todayP.jm, todayP.jd, off);
      var prevK = addDays(todayP.jy, todayP.jm, todayP.jd, off - 1);
      var dow = _weekdayIdx(dayK);

      /* ── Night ── */
      if (ndEn && bm != null && wm != null && bm !== wm) {
        if (bm > wm) {
          /* evening tail on prev day */
          s.tasks.push({
            id: "sl-night-ev-" + prevK,
            title: "🌙 خواب شب",
            areaId: "sleep", taskType: "personal",
            date: prevK,
            time: sch.night.bedTime,
            durationMinutes: 1440 - bm,
            recurrence: "none",
            completed: false,
            _sleepAuto: "night:evening",
            _cont: "tail"
          });
          /* morning head on wake-up day */
          s.tasks.push({
            id: "sl-night-mo-" + dayK,
            title: "🌙 خواب شب",
            areaId: "sleep", taskType: "personal",
            date: dayK,
            time: "00:00",
            durationMinutes: wm,
            recurrence: "none",
            completed: false,
            _sleepAuto: "night:morning",
            _cont: "head"
          });
        } else {
          s.tasks.push({
            id: "sl-night-sd-" + dayK,
            title: "🌙 خواب شب",
            areaId: "sleep", taskType: "personal",
            date: dayK,
            time: sch.night.bedTime,
            durationMinutes: wm - bm,
            recurrence: "none",
            completed: false,
            _sleepAuto: "night:sameday"
          });
        }
      }

      /* ── Nap ── */
      if (npEn && sch.nap.weekdays[dow]) {
        s.tasks.push({
          id: "sl-nap-" + dayK,
          title: "💤 چرت",
          areaId: "sleep", taskType: "personal",
          date: dayK,
          time: sch.nap.time,
          durationMinutes: npDur,
          recurrence: "none",
          completed: false,
          _sleepAuto: "nap"
        });
      }
    }

    save();
  }
  /* ═══════════ HTML ═══════════ */
  function _html() {
    var s = _ensure(state());
    if (!s) return '<div class="health-content"><div class="sl-empty"><div>state در دسترس نیست</div></div></div>';
    var out = '<div class="health-content">';
    out += '<div class="nt-subtabs">';
    out += _tab("day","🌙 روز");
    out += _tab("trend","📊 روند");
    out += _tab("history","📜 تاریخچه");
    out += _tab("settings","⚙️ تنظیمات");
    out += '</div>';
    if (_sub === "trend") out += _renderTrend();
    else if (_sub === "settings") out += _renderSettings();
    else if (_sub === "history") out += _renderHistory();
    else out += _renderDay();
    out += '</div>';
    if (_formOpen) out += _modalHTML();  /* PATCH:phase-F7-v4 */
    return out;
  }
  function _tab(id,label){ return '<button class="nt-subtab'+(_sub===id?" is-active":"")+'" type="button" data-sl-sub="'+id+'">'+label+'</button>'; }

  function _renderDay() {
    var s = _ensure(state());
    var date = _selDate(), todayK = today();
    var nights = s.sleep.log.filter(function(e){ return e.kind==="night" && e.date===date; });
    var naps = s.sleep.log.filter(function(e){ return e.kind==="nap" && e.date===date; });
    var lastNight = nights.length ? _sortDesc(nights)[0] : null;
    var tgt = s.sleep.schedule.night;
    var tgtDur = _duration(tgt.bedTime, tgt.wakeTime) || 480;
    var curDur = lastNight ? lastNight.durationMin : null;

    var arcPct = curDur != null ? Math.min(100, Math.round(curDur/tgtDur*100)) : 0;
    var arcCirc = 2*Math.PI*34, arcOff = arcCirc - (arcPct/100)*arcCirc;

    var out = '';
    out += '<div class="nt-day-nav">';
    out += '<button class="nt-day-arrow" type="button" data-sl-day-prev>‹</button>';
    out += '<div class="nt-day-nav-body"><span class="nt-day-nav-ic">📅</span>';
    out += '<span class="nt-day-nav-txt">'+pretty(date)+'</span>';
    if (date!==todayK) out += '<button class="nt-day-nav-today" type="button" data-sl-goto-today>امروز</button>';
    out += '</div>';
    out += '<button class="nt-day-arrow" type="button" data-sl-day-next>›</button>';
    out += '</div>';

    out += '<div class="sl-hero">';
    out += '<div class="sl-hero-arc"><svg viewBox="0 0 80 80" class="sl-arc-svg">';
    out += '<defs><linearGradient id="slArcGrad" x1="0" y1="0" x2="1" y2="1">';
    out += '<stop offset="0%" stop-color="rgb(129,140,248)"/><stop offset="100%" stop-color="rgb(56,189,248)"/>';
    out += '</linearGradient></defs>';
    out += '<circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="7"/>';
    out += '<circle cx="40" cy="40" r="34" fill="none" stroke="url(#slArcGrad)" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+arcCirc.toFixed(2)+'" stroke-dashoffset="'+arcOff.toFixed(2)+'" transform="rotate(-90 40 40)"/>';
    out += '</svg>';
    out += '<div class="sl-arc-txt"><span class="sl-arc-num">'+(curDur!=null?_fmtDur(curDur):"—")+'</span><span class="sl-arc-u">ساعت</span></div>';
    out += '</div>';
    out += '<div class="sl-hero-info">';
    out += '<div class="sl-hero-title">🌙 خواب '+(date===todayK?"دیشب":pretty(date))+'</div>';
    out += '<div class="sl-hero-kpis">';
    if (lastNight) out += '<span class="sl-hero-kpi">'+_fmtTime(lastNight.bedTime)+' → '+_fmtTime(lastNight.wakeTime)+'</span>';
    out += '<span class="sl-hero-kpi sl-kpi-tgt">هدف <b>'+_fmtDur(tgtDur)+'</b></span>';
    if (naps.length) out += '<span class="sl-hero-kpi">💤 '+fa0(naps.length)+' چرت</span>';
    out += '</div>';
    if (!lastNight && !naps.length) out += '<div class="sl-hero-sub">هنوز برای این روز چیزی ثبت نشده</div>';
    out += '</div></div>';

    out += '<div class="sl-actions">';
    out += '<button class="sl-btn sl-btn-primary" type="button" data-sl-open="night">🌙 '+(lastNight?"ویرایش خواب":"ثبت خواب واقعی")+'</button>';
    out += '<button class="sl-btn sl-btn-nap" type="button" data-sl-open="nap">💤 ثبت چرت</button>';
    out += '</div>';


    var all = _sortDesc(nights.concat(naps));
    if (all.length) {
      out += '<div class="sl-list-head">📋 جلسات این روز</div><div class="sl-list">';
      for (var i=0; i<all.length; i++) {
        var e = all[i];
        var isN = e.kind === "night";
        out += '<div class="sl-item"><span class="sl-item-ic">'+(isN?"🌙":"💤")+'</span>';
        out += '<div class="sl-item-body"><div class="sl-item-title">'+(isN?"خواب شب":"چرت")+'</div>';
        out += '<div class="sl-item-sub">'+_fmtTime(e.bedTime)+' → '+_fmtTime(e.wakeTime)+' · '+_fmtDur(e.durationMin)+' ساعت</div></div>';
        out += '<div class="sl-item-acts">';
        out += '<button class="sl-act" type="button" data-sl-edit="'+esc(e.id)+'">✏️</button>';
        out += '<button class="sl-act sl-act-del" type="button" data-sl-del="'+esc(e.id)+'">🗑</button>';
        out += '</div></div>';
      }
      out += '</div>';
    } else {
      out += '<div class="sl-empty"><span class="sl-empty-ic">🌙</span><div>برای این روز جلسه‌ای ثبت نشده</div></div>';
    }
    return out;
  }

  function _modalHTML() { /* PATCH:phase-F7-v8 */
    var f = _formData; if (!f) return '';
    var isEdit = !!f.id;
    var isNight = f.kind === "night";
    var dur = isNight ? _duration(f.bedTime, f.wakeTime) : (parseInt(f.durationMin,10) || 0);
    var icon = isNight ? "🌙" : "💤";
    var title = isEdit ? "ویرایش" : (isNight ? "ثبت خواب شب" : "ثبت چرت");
    var cls = isNight ? "slm-night" : "slm-nap";
    var bp = (f.bedTime||"23:00").split(":");
    var wp = isNight ? (f.wakeTime||"07:00").split(":") : ["00","00"];

    var BED_PRESETS = ["21:00","22:00","23:00","00:00","01:00"];
    var WAKE_PRESETS = ["05:00","06:00","07:00","08:00","09:00"];
    var NAP_PRESETS = ["12:00","13:00","14:00","15:00","16:00"];
    var DUR_PRESETS = [15,30,45,60,90];

    var out = '<div class="slm-overlay" data-sl-modal="1">';
    out += '<div class="slm-card '+cls+'">';

    /* Head */
    out += '<div class="slm-head">';
    out += '<div class="slm-head-icon">'+icon+'</div>';
    out += '<div class="slm-head-txt"><div class="slm-head-title">'+title+'</div>';
    out += '<div class="slm-head-sub">'+pretty(f.date)+'</div></div>';
    out += '<button class="slm-x" type="button" data-sl-cancel="1">✕</button>';
    out += '</div>';

    if (isNight) {
      /* Bed */
      out += '<div class="slm-field">';
      out += '<div class="slm-field-lbl">🌙 ساعت خواب</div>';
      out += '<div class="slm-picker" dir="ltr">';
      out += '<select class="slm-num" id="sl-bed-hh">'+_hoursSel(bp[0])+'</select>';
      out += '<span class="slm-colon">:</span>';
      out += '<select class="slm-num" id="sl-bed-mm">'+_minsSel(bp[1])+'</select>';
      out += '</div>';
      out += '<div class="slm-mini-presets slm-mini-5">';
      BED_PRESETS.forEach(function(v){
        out += '<button class="slm-mini'+(v===f.bedTime?" is-active":"")+'" type="button" data-slm-bed="'+v+'">'+_timeLabel(v)+'</button>';
      });
      out += '</div></div>';

      /* Wake */
      out += '<div class="slm-field">';
      out += '<div class="slm-field-lbl">☀️ ساعت بیداری</div>';
      out += '<div class="slm-picker" dir="ltr">';
      out += '<select class="slm-num" id="sl-wake-hh">'+_hoursSel(wp[0])+'</select>';
      out += '<span class="slm-colon">:</span>';
      out += '<select class="slm-num" id="sl-wake-mm">'+_minsSel(wp[1])+'</select>';
      out += '</div>';
      out += '<div class="slm-mini-presets slm-mini-5">';
      WAKE_PRESETS.forEach(function(v){
        out += '<button class="slm-mini'+(v===f.wakeTime?" is-active":"")+'" type="button" data-slm-wake="'+v+'">'+_timeLabel(v)+'</button>';
      });
      out += '</div></div>';

      out += '<div class="slm-dur" id="sl-dur-box"><span class="slm-dur-lbl">مدت</span><span class="slm-dur-num">'+(dur?_fmtDur(dur):"—")+'</span><span class="slm-dur-unit">ساعت</span></div>';
    } else {
      /* Nap start */
      out += '<div class="slm-field">';
      out += '<div class="slm-field-lbl">⏰ ساعت شروع</div>';
      out += '<div class="slm-picker" dir="ltr">';
      out += '<select class="slm-num" id="sl-bed-hh">'+_hoursSel(bp[0])+'</select>';
      out += '<span class="slm-colon">:</span>';
      out += '<select class="slm-num" id="sl-bed-mm">'+_minsSel(bp[1])+'</select>';
      out += '</div>';
      out += '<div class="slm-mini-presets slm-mini-5">';
      NAP_PRESETS.forEach(function(v){
        out += '<button class="slm-mini'+(v===f.bedTime?" is-active":"")+'" type="button" data-slm-bed="'+v+'">'+_timeLabel(v)+'</button>';
      });
      out += '</div></div>';

      /* Nap duration */
      out += '<div class="slm-field">';
      out += '<div class="slm-field-lbl">⏱ مدت (دقیقه)</div>';
      out += '<div class="slm-picker slm-picker-single" dir="ltr">';
      out += '<input type="number" class="slm-num slm-num-input" id="sl-napdur" min="5" max="300" step="5" value="'+(f.durationMin||60)+'">';
      out += '</div>';
      out += '<div class="slm-mini-presets slm-mini-5">';
      DUR_PRESETS.forEach(function(v){
        out += '<button class="slm-mini'+((f.durationMin||60)===v?" is-active":"")+'" type="button" data-sl-dur="'+v+'">'+fa0(v)+' دقیقه</button>';
      });
      out += '</div></div>';
    }

    /* Actions */
    out += '<div class="slm-actions">';
    out += '<button class="slm-btn slm-cancel" type="button" data-sl-cancel="1">انصراف</button>';
    out += '<button class="slm-btn slm-save" type="button" data-sl-save="1">💾 '+(isEdit?'ذخیره':'ثبت')+'</button>';
    out += '</div>';
    out += '</div></div>';
    return out;
  }

  function _timeLabel(hhmm){ /* PATCH:phase-F7-v8 */
    var p = hhmm.split(":");
    var hh = parseInt(p[0],10), mm = parseInt(p[1],10);
    return (hh<10?"۰":"")+fa0(hh)+":"+(mm<10?"۰":"")+fa0(mm);
  }
  function _renderTrend() { /* PATCH:phase-F7-v5 */
    var s = _ensure(state());
    var allNight = s.sleep.log.filter(function(e){ return e.kind==="night" && e.durationMin > 0; });
    var allNap = s.sleep.log.filter(function(e){ return e.kind==="nap" && e.durationMin > 0; });
    var tgt = s.sleep.schedule.night;
    var tgtDur = _duration(tgt.bedTime, tgt.wakeTime) || 480;
    var todayK = today(), tp = parseJ(todayK);

    var out = '<div class="sl-range-row">';
    [7,30,90].forEach(function(r){
      out += '<button class="sl-range-btn'+(_range===r?" is-active":"")+'" type="button" data-sl-range="'+r+'">'+fa0(r)+' روز</button>';
    });
    out += '</div>';

    var recent = [];
    for (var off=_range-1; off>=0; off--) {
      var kk = addDays(tp.jy, tp.jm, tp.jd, -off);
      var nMin = 0, pMin = 0;
      for (var j=0; j<allNight.length; j++) if (allNight[j].date===kk && allNight[j].durationMin>nMin) nMin=allNight[j].durationMin;
      for (var jn=0; jn<allNap.length; jn++) if (allNap[jn].date===kk) pMin += allNap[jn].durationMin;
      recent.push({ date: kk, night: nMin, nap: pMin, total: nMin + pMin });
    }
    var validN = recent.filter(function(r){ return r.night>0; });
    var validP = recent.filter(function(r){ return r.nap>0; });
    var validT = recent.filter(function(r){ return r.total>0; });

    /* ── stat cards ── */
    var avgN = validN.length ? Math.round(validN.reduce(function(a,b){return a+b.night;},0)/validN.length) : null;
    var avgP = validP.length ? Math.round(validP.reduce(function(a,b){return a+b.nap;},0)/validP.length) : null;
    var weekT = recent.slice(-7).filter(function(r){return r.total>0;});
    var avgW = weekT.length ? Math.round(weekT.reduce(function(a,b){return a+b.total;},0)/weekT.length) : null;
    var maxT = validT.length ? Math.max.apply(null, validT.map(function(v){return v.total;})) : null;

    out += '<div class="sl-stat-grid">';
    out += '<div class="sl-stat sl-stat-night"><div class="sl-stat-ic">🌙</div><div class="sl-stat-v">'+(avgN!=null?_fmtDur(avgN):"—")+'</div><div class="sl-stat-k">میانگین شب</div></div>';
    out += '<div class="sl-stat sl-stat-nap"><div class="sl-stat-ic">💤</div><div class="sl-stat-v">'+(avgP!=null?_fmtDur(avgP):"—")+'</div><div class="sl-stat-k">میانگین چرت</div></div>';
    out += '<div class="sl-stat sl-stat-week"><div class="sl-stat-ic">📅</div><div class="sl-stat-v">'+(avgW!=null?_fmtDur(avgW):"—")+'</div><div class="sl-stat-k">هفته اخیر</div></div>';
    out += '<div class="sl-stat sl-stat-max"><div class="sl-stat-ic">🏆</div><div class="sl-stat-v">'+(maxT!=null?_fmtDur(maxT):"—")+'</div><div class="sl-stat-k">بیشترین</div></div>';
    out += '</div>';

    /* ── chart 1: night ── */
    if (validN.length >= 2) {
      out += _chartCard('🌙 خواب شب', recent, 'night', tgtDur, 'slGradNight', 'rgb(129,140,248)');
    } else {
      out += '<div class="sl-chart-empty"><span>🌙</span><div>نمودار خواب شب — حداقل ۲ روز لازم است</div></div>';
    }
    /* ── chart 2: nap ── */
    if (validP.length >= 2) {
      out += _chartCard('💤 چرت روزانه', recent, 'nap', 60, 'slGradNap', 'rgb(56,189,248)');
    } else {
      out += '<div class="sl-chart-empty sl-chart-empty-nap"><span>💤</span><div>نمودار چرت — حداقل ۲ روز لازم است</div></div>';
    }
    /* ── chart 3: combined ── */
    if (validT.length >= 2) {
      out += _chartCard('🌓 خواب تجمیعی (شب + چرت)', recent, 'total', tgtDur, 'slGradTotal', 'rgb(167,139,250)');
    } else {
      out += '<div class="sl-chart-empty"><span>📊</span><div>نمودار تجمیعی — حداقل ۲ روز لازم است</div></div>';
    }

    return out;
  }

  function _chartCard(title, recent, key, tgtDur, gradId, color) { /* PATCH:phase-F7-v5 */
    var W=340, H=130, PAD=10;
    var maxV = tgtDur;
    for (var i=0;i<recent.length;i++) if (recent[i][key] > maxV) maxV = recent[i][key];
    maxV = Math.ceil(maxV/60)*60;
    var stepX = (W-PAD*2)/(recent.length-1);
    var pts = recent.map(function(r,i){
      return { x:PAD+i*stepX, y: r[key]>0 ? (H-PAD-(r[key]/maxV)*(H-PAD*2)) : null, v:r[key] };
    });
    var d='', started=false;
    for (var p=0;p<pts.length;p++){
      if (pts[p].y==null){ started=false; continue; }
      if (!started){ d+='M '+pts[p].x.toFixed(1)+' '+pts[p].y.toFixed(1); started=true; }
      else { d+=' L '+pts[p].x.toFixed(1)+' '+pts[p].y.toFixed(1); }
    }
    var maxY = H-PAD-(tgtDur/maxV)*(H-PAD*2);
    var h = '<div class="sl-chart-card">';
    h += '<div class="sl-chart-head"><span class="sl-chart-title">'+title+'</span>';
    h += '<span class="sl-chart-legend"><span class="sl-chart-dash"></span>هدف '+_fmtDur(tgtDur)+'</span></div>';
    h += '<svg viewBox="0 0 '+W+' '+H+'" class="sl-chart-svg" preserveAspectRatio="none">';
    h += '<defs><linearGradient id="'+gradId+'" x1="0" y1="0" x2="0" y2="1">';
    h += '<stop offset="0%" stop-color="'+color+'" stop-opacity="0.35"/>';
    h += '<stop offset="100%" stop-color="'+color+'" stop-opacity="0"/>';
    h += '</linearGradient></defs>';
    h += '<line x1="'+PAD+'" y1="'+maxY.toFixed(1)+'" x2="'+(W-PAD)+'" y2="'+maxY.toFixed(1)+'" stroke="rgba(52,211,153,.4)" stroke-dasharray="4 4" stroke-width="1"/>';
    if (d) {
      var areaD = d + ' L '+pts[pts.length-1].x.toFixed(1)+' '+(H-PAD)+' L '+pts[0].x.toFixed(1)+' '+(H-PAD)+' Z';
      h += '<path d="'+areaD+'" fill="url(#'+gradId+')"/>';
      h += '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>';
    }
    for (var q=0;q<pts.length;q++) if (pts[q].y!=null && pts[q].v>0) {
      var isLast = (q === pts.length-1);
      h += '<circle cx="'+pts[q].x.toFixed(1)+'" cy="'+pts[q].y.toFixed(1)+'" r="'+(isLast?3.6:2)+'" fill="'+color+'"/>';
    }
    h += '</svg>';
    h += '<div class="sl-chart-lbl"><span>'+recent[0].date+'</span><span>'+recent[recent.length-1].date+'</span></div>';
    h += '</div>';
    return h;
  }
  function _renderHistory() { /* PATCH:phase-F7-final */
    var s = _ensure(state());
    var all = (s.sleep.log || []).slice().sort(function(a,b){
      return a.date < b.date ? 1 : (a.date > b.date ? -1 : 0);
    });
    var out = "";
    if (!all.length) {
      return '<div class="sl-empty"><span class="sl-empty-ic">📜</span><div>هنوز چیزی ثبت نشده</div></div>';
    }
    var nN=0, nP=0;
    all.forEach(function(e){ if(e.kind==="night") nN++; else nP++; });
    out += '<div class="sl-hist-stats">' +
      '<div class="sl-hist-stat sl-hist-night"><span class="sl-hist-ic">🌙</span><span class="sl-hist-v">' + fa0(nN) + '</span><span class="sl-hist-k">شب</span></div>' +
      '<div class="sl-hist-stat sl-hist-nap"><span class="sl-hist-ic">💤</span><span class="sl-hist-v">' + fa0(nP) + '</span><span class="sl-hist-k">چرت</span></div>' +
      '</div>';
    out += '<div class="sl-list">';
    all.forEach(function(e){
      var isN = e.kind === "night";
      out += '<div class="sl-item">' +
        '<span class="sl-item-ic">' + (isN ? "🌙" : "💤") + '</span>' +
        '<div class="sl-item-body">' +
        '<div class="sl-item-title">' + (isN ? "خواب شب" : "چرت") + '</div>' +
        '<div class="sl-item-sub">' + pretty(e.date) + ' · ' + _fmtTime(e.bedTime) + ' → ' + _fmtTime(e.wakeTime) + ' · <b>' + _fmtDur(e.durationMin) + '</b> ساعت</div>' +
        '</div>' +
        '<button class="sl-item-del" type="button" data-sl-del="' + esc(e.id) + '" title="حذف">✕</button>' +
        '</div>';
    });
    out += '</div>';
    return out;
  }
  function _renderSettings() { /* PATCH:phase-F7-v3 */
    var s = _ensure(state());
    var sc = s.sleep.schedule;
    var nOn = sc.night.enabled !== false;
    var pOn = !!sc.nap.enabled;
    var out = '<div class="sl-settings">';

    /* ── Night card ── */
    out += '<div class="sl-set-card sl-set-night'+(nOn?' is-on':' is-off')+'">';
    out += '<div class="sl-set-head">';
    out += '<span class="sl-set-ic">🌙</span>';
    out += '<div class="sl-set-head-txt"><div class="sl-set-title">خواب شب</div><div class="sl-set-sub">هر شب — بدون نیاز به تیک</div></div>';
    out += '<button class="sl-power'+(nOn?' is-on':' is-off')+'" type="button" data-sl-power="night" aria-pressed="'+(nOn?'true':'false')+'"><span class="sl-power-dot"></span><span class="sl-power-txt">'+(nOn?'فعال':'خاموش')+'</span></button>';
    out += '</div>';
    out += '<div class="sl-form-row-2">';
    out += '<label class="sl-time"><span class="sl-time-lbl">🌙 خواب</span><div class="sl-dual-pick"><select class="sl-num" id="sl-set-bed-hh"'+(nOn?'':' disabled')+'>'+_hoursSel((sc.night.bedTime||"23:00").split(":")[0])+'</select><span class="sl-colon">:</span><select class="sl-num" id="sl-set-bed-mm"'+(nOn?'':' disabled')+'>'+_minsSel((sc.night.bedTime||"23:00").split(":")[1])+'</select></div></label>';
    out += '<label class="sl-time"><span class="sl-time-lbl">☀️ بیداری</span><div class="sl-dual-pick"><select class="sl-num" id="sl-set-wake-hh"'+(nOn?'':' disabled')+'>'+_hoursSel((sc.night.wakeTime||"07:00").split(":")[0])+'</select><span class="sl-colon">:</span><select class="sl-num" id="sl-set-wake-mm"'+(nOn?'':' disabled')+'>'+_minsSel((sc.night.wakeTime||"07:00").split(":")[1])+'</select></div></label>';
    out += '</div>';
    out += '</div>';

    /* ── Nap card ── */
    out += '<div class="sl-set-card sl-set-nap'+(pOn?' is-on':' is-off')+'">';
    out += '<div class="sl-set-head">';
    out += '<span class="sl-set-ic">💤</span>';
    out += '<div class="sl-set-head-txt"><div class="sl-set-title">چرت هفتگی</div><div class="sl-set-sub">روزهای دلخواه</div></div>';
    out += '<button class="sl-power'+(pOn?' is-on':' is-off')+'" type="button" data-sl-power="nap" aria-pressed="'+(pOn?'true':'false')+'"><span class="sl-power-dot"></span><span class="sl-power-txt">'+(pOn?'فعال':'خاموش')+'</span></button>';
    out += '</div>';
    var DICONS = ["🌞","☀️","🌤️","⛅","🌥️","🌙","⭐"];
    out += '<div class="sl-weekdays">';
    for (var i=0; i<7; i++) {
      var on = !!sc.nap.weekdays[i];
      out += '<button class="sl-dow'+(on?' is-on':' is-off')+'" type="button" data-sl-dow="'+i+'" aria-pressed="'+(on?'true':'false')+(pOn?'':' disabled')+'">';
      out += '<span class="sl-dow-ic">'+DICONS[i]+'</span>';
      out += '<span class="sl-dow-nm">'+DOWS[i].substring(0,3)+'</span>';
      out += '<span class="sl-dow-dot"></span>';
      out += '</button>';
    }
    out += '</div>';
    out += '<div class="sl-form-row-2">';
    out += '<label class="sl-time"><span class="sl-time-lbl">⏰ شروع</span><div class="sl-dual-pick"><select class="sl-num" id="sl-set-naptime-hh"'+(pOn?'':' disabled')+'>'+_hoursSel((sc.nap.time||"14:00").split(":")[0])+'</select><span class="sl-colon">:</span><select class="sl-num" id="sl-set-naptime-mm"'+(pOn?'':' disabled')+'>'+_minsSel((sc.nap.time||"14:00").split(":")[1])+'</select></div></label>';
    out += '<label class="sl-time"><span class="sl-time-lbl">⏱ مدت (دقیقه)</span><input type="number" min="5" max="180" step="5" class="health-input" id="sl-set-napdur" value="'+(sc.nap.durationMin||60)+'"'+(pOn?'':' disabled')+'></label>';
    out += '</div>';
    out += '</div>';

    out += '<div class="sl-note">🌙 با کلیک روی دکمه زیر، تسک خواب شب (و در صورت فعال بودن، چرت) برای ۳۰ روز آینده در تقویم و تایم‌لاین ساخته می‌شود. هر روز یک تسک مستقل است — ویرایش یا حذف یک روز روی روزهای دیگر اثر ندارد.</div>'; /* PATCH:phase-F7-reenable */
    out += '<button class="sl-btn sl-btn-save sl-btn-full" type="button" data-sl-save-settings="1">💾 ذخیره و ساخت تسک‌ها</button>';
    out += '</div>';
    return out;
  }
  /* ═══════════ EVENTS ═══════════ */
  function _wire(root){
    if (_wired) return; _wired=true;
    root.addEventListener("click", _click);
    root.addEventListener("input", _input);
  }
  function _input(e){ /* PATCH:phase-F7-v8 */
    var t=e.target; if (!t||!t.id||!_formData) return;
    var id=t.id;
    function _v(x){ var e2=document.getElementById(x); return e2?e2.value:""; }
    if (id==="sl-bed-hh"||id==="sl-bed-mm"){
      _formData.bedTime = _v("sl-bed-hh")+":"+_v("sl-bed-mm");
      _clearActivePresets(); _refreshDur(); return;
    }
    if (id==="sl-wake-hh"||id==="sl-wake-mm"){
      _formData.wakeTime = _v("sl-wake-hh")+":"+_v("sl-wake-mm");
      _clearActivePresets(); _refreshDur(); return;
    }
    if (id==="sl-napdur"){ _formData.durationMin=parseInt(t.value,10)||0; _clearActivePresets(); return; }
  }
  function _clearActivePresets(){
    var ps = document.querySelectorAll(".slm-mini.is-active");
    for (var i=0;i<ps.length;i++) ps[i].classList.remove("is-active");
  }
  function _refreshDur(){ /* PATCH:phase-F7-v4 */
    if (!_formData||_formData.kind!=="night") return;
    var box=document.getElementById("sl-dur-box");
    if (!box) return;
    var d=_duration(_formData.bedTime,_formData.wakeTime);
    var num=box.querySelector(".slm-dur-num");
    if (num) num.textContent = d?_fmtDur(d):"—";
  }
  function _click(e){
    var t=e.target; if (!t||!t.closest) return;
    var el, el2; /* PATCH:phase-F7-v7 */
    el=t.closest("[data-sl-sub]"); if(el){_sub=el.getAttribute("data-sl-sub");_formOpen=false;_formData=null;render(_currentView());return;}
    el=t.closest("[data-sl-day-prev]"); if(el){_shiftDay(-1);render(_currentView());return;}
    el=t.closest("[data-sl-day-next]"); if(el){_shiftDay(1);render(_currentView());return;}
    el=t.closest("[data-sl-goto-today]"); if(el){_viewDate=null;render(_currentView());return;}
    el=t.closest("[data-sl-range]"); if(el){_range=parseInt(el.getAttribute("data-sl-range"),10)||7;render(_currentView());return;}
    el=t.closest("[data-sl-open]"); if(el){_openForm(el.getAttribute("data-sl-open"));return;}
    el=t.closest("[data-sl-cancel]"); if(el){_formOpen=false;_formData=null;_editingId=null;render(_currentView());return;}
    el=t.closest("[data-sl-save]"); if(el){_saveForm();return;}
    el=t.closest("[data-sl-edit]"); if(el){_editEntry(el.getAttribute("data-sl-edit"));return;}
    el=t.closest("[data-sl-del]"); if(el){_deleteEntry(el.getAttribute("data-sl-del"));return;}
    /* PATCH:phase-F7-v8 mini presets */
    el2=t.closest("[data-slm-bed]");
    if(el2 && _formData){ _formData.bedTime=el2.getAttribute("data-slm-bed");
      var _bp=el2.getAttribute("data-slm-bed").split(":");
      var _bh=document.getElementById("sl-bed-hh"); if(_bh) _bh.value=_bp[0];
      var _bm=document.getElementById("sl-bed-mm"); if(_bm) _bm.value=_bp[1];
      _clearActivePresets(); el2.classList.add("is-active"); _refreshDur(); return; }
    el2=t.closest("[data-slm-wake]");
    if(el2 && _formData){ _formData.wakeTime=el2.getAttribute("data-slm-wake");
      var _wp=el2.getAttribute("data-slm-wake").split(":");
      var _wh=document.getElementById("sl-wake-hh"); if(_wh) _wh.value=_wp[0];
      var _wm=document.getElementById("sl-wake-mm"); if(_wm) _wm.value=_wp[1];
      _clearActivePresets(); el2.classList.add("is-active"); _refreshDur(); return; }
    el2=t.closest("[data-sl-dur]");
    if(el2 && _formData){ _formData.durationMin=parseInt(el2.getAttribute("data-sl-dur"),10)||60;
      var _nd=document.getElementById("sl-napdur"); if(_nd) _nd.value=_formData.durationMin;
      _clearActivePresets(); el2.classList.add("is-active"); return; }
    el=t.closest("[data-sl-preset]");
    el2=t.closest("[data-slm-bed]");  /* PATCH:phase-F7-v7 */
    if(el2 && _formData){ _formData.bedTime=el2.getAttribute("data-slm-bed");
      var bi=document.getElementById("sl-bed"); if(bi) bi.value=_formData.bedTime;
      _refreshDur(); return; }
    el2=t.closest("[data-slm-wake]");
    if(el2 && _formData){ _formData.wakeTime=el2.getAttribute("data-slm-wake");
      var wi=document.getElementById("sl-wake"); if(wi) wi.value=_formData.wakeTime;
      _refreshDur(); return; }
    el2=t.closest("[data-sl-dur]");
    if(el2 && _formData){ _formData.durationMin=parseInt(el2.getAttribute("data-sl-dur"),10)||60;
      var nd=document.getElementById("sl-napdur"); if(nd) nd.value=_formData.durationMin; return; }
    if(el){ /* PATCH:phase-F7-v6 */
      var pr=el.getAttribute("data-sl-preset").split("|");
      if(_formData){
        if (_formData.kind==="night"){
          _formData.bedTime=pr[0]; _formData.wakeTime=pr[1];
          var bh=document.getElementById("sl-bed-hh"); var bm=document.getElementById("sl-bed-mm");
          var wh=document.getElementById("sl-wake-hh"); var wm=document.getElementById("sl-wake-mm");
          var bp=pr[0].split(":"), wp=pr[1].split(":");
          if(bh) bh.value=bp[0]; if(bm) bm.value=bp[1];
          if(wh) wh.value=wp[0]; if(wm) wm.value=wp[1];
        } else {
          _formData.bedTime=pr[0]; _formData.durationMin=parseInt(pr[1],10)||60;
          var bh2=document.getElementById("sl-bed-hh"); var bm2=document.getElementById("sl-bed-mm");
          var nd=document.getElementById("sl-napdur");
          var bp2=pr[0].split(":");
          if(bh2) bh2.value=bp2[0]; if(bm2) bm2.value=bp2[1];
          if(nd) nd.value=_formData.durationMin;
        }
        _refreshDur();
      }
      return;
    }
    el=t.closest("[data-sl-row]");
    if(el){ _editEntry(el.getAttribute("data-sl-row")); return; }
    el=t.closest("[data-sl-modal]");
    if(el && !t.closest(".slm-card")){ _formOpen=false; _formData=null; _editingId=null; render(_currentView()); return; }
    el=t.closest("[data-sl-power]");
    if(el){ /* PATCH:phase-F7-split2 */
      var which=el.getAttribute("data-sl-power");
      var sc=_ensure(state());
      if(which==="night") sc.sleep.schedule.night.enabled = !(sc.sleep.schedule.night.enabled!==false);
      if(which==="nap")   sc.sleep.schedule.nap.enabled   = !sc.sleep.schedule.nap.enabled;
      save();
      render(_currentView());
      return;
    }
    el=t.closest("[data-sl-dow]");
    if(el){
      var dow=parseInt(el.getAttribute("data-sl-dow"),10);
      var s=_ensure(state());
      s.sleep.schedule.nap.weekdays[dow]=!s.sleep.schedule.nap.weekdays[dow];
      save(); render(_currentView()); return;
    }
    el=t.closest("[data-sl-save-settings]"); if(el){_commitSettings();return;}
  }
  function _applyFocus(root){ if(_formOpen){ var inp=root.querySelector("#sl-bed"); if(inp&&inp.focus) inp.focus(); } }

  function _openForm(kind, forceDate) { /* PATCH:phase-F7-dateSave */
    var s=_ensure(state());
    var date=_selDate(); if (forceDate) date = forceDate;
    if (kind==="night"){
      var existing = s.sleep.log.filter(function(e){ return e.kind==="night" && e.date===date; });
      if (existing.length){
        var e = _sortDesc(existing)[0];
        _formData = { id:e.id, kind:"night", date:e.date, bedTime:e.bedTime, wakeTime:e.wakeTime };
        _editingId = e.id;
      } else {
        var sc=s.sleep.schedule.night;
        _formData = { kind:"night", date:date, bedTime:sc.bedTime, wakeTime:sc.wakeTime };
        _editingId=null;
      }
    } else {
      var np=s.sleep.schedule.nap;
      _formData = { kind:"nap", date:date, bedTime:np.time, durationMin:np.durationMin||60 };
      _editingId=null;
    }
    _formOpen=true;
    render(_currentView());
  }
  function _editEntry(id){
    var s=_ensure(state()); if (!s) return;
    var e=null; for (var i=0;i<s.sleep.log.length;i++) if (s.sleep.log[i].id===id){e=s.sleep.log[i];break;}
    if (!e) return;
    _formData={ id:e.id, kind:e.kind, date:e.date, bedTime:e.bedTime, wakeTime:e.wakeTime, durationMin:e.durationMin };
    _editingId=e.id; _formOpen=true;
    render(_currentView());
  }
  function _saveForm(){
    var s=_ensure(state()); if (!s||!_formData) return;
    var f=_formData;
    var date=(f.date||"").trim();
    if (!/^\d{4}\/\d{1,2}\/\d{1,2}$/.test(date)){ notify("error","تاریخ نامعتبر"); return; }
    var bedTime=f.bedTime, wakeTime, durationMin;
    if (f.kind==="night"){
      wakeTime=f.wakeTime;
      durationMin=_duration(bedTime,wakeTime);
      if (!durationMin){ notify("error","ساعت خواب و بیداری یکسان یا نامعتبر است"); return; }
    } else {
      var dm=parseInt(f.durationMin,10);
      if (!isFinite(dm)||dm<=0){ notify("error","مدت چرت باید مثبت باشد"); return; }
      durationMin=dm;
      var sm=_toMin(bedTime); if (sm==null){ notify("error","ساعت شروع نامعتبر"); return; }
      var em=(sm+dm)%1440;
      var hh=Math.floor(em/60), mm=em%60;
      wakeTime=(hh<10?"0":"")+hh+":"+(mm<10?"0":"")+mm;
    }
    if (_editingId){
      for (var i=0;i<s.sleep.log.length;i++) if (s.sleep.log[i].id===_editingId){
        s.sleep.log[i].date=date; s.sleep.log[i].bedTime=bedTime; s.sleep.log[i].wakeTime=wakeTime;
        s.sleep.log[i].durationMin=durationMin; s.sleep.log[i].updatedAt=Date.now(); break;
      }
      notify("success","جلسه به‌روزرسانی شد");
    } else {
      s.sleep.log.push({
        id:_newId(), date:date, kind:f.kind,
        bedTime:bedTime, wakeTime:wakeTime, durationMin:durationMin,
        taskId:null, createdAt:Date.now()
      });
      notify("success",(f.kind==="night"?"خواب شب":"چرت")+" ثبت شد");
    }
    save();
    _formOpen=false; _formData=null; _editingId=null;
    render(_currentView());
  }
  function _deleteEntry(id){
    var s=_ensure(state()); if (!s) return;
    s.sleep.log=s.sleep.log.filter(function(e){ return e.id!==id; });
    save(); notify("success","حذف شد");
    render(_currentView());
  }
  function _commitSettings() { /* PATCH:phase-F7-v3 */
    var s = _ensure(state()); if (!s) return;
    var sc = s.sleep.schedule;
    /* PATCH:phase-F7-htmlfix — read from selects (fallback to old inputs) */
    var napDurEl = document.getElementById("sl-set-napdur");
    /* PATCH:phase-F7-setfix */
    function _rd(id){ var x=document.getElementById(id); return x?x.value:""; }
    var _bhh = _rd("sl-set-bed-hh"), _bmm = _rd("sl-set-bed-mm");
    var _whh = _rd("sl-set-wake-hh"), _wmm = _rd("sl-set-wake-mm");
    var _nhh = _rd("sl-set-naptime-hh"), _nmm = _rd("sl-set-naptime-mm");
    if (_bhh && _bmm) sc.night.bedTime = _bhh + ":" + _bmm;
    if (_whh && _wmm) sc.night.wakeTime = _whh + ":" + _wmm;
    if (_nhh && _nmm) sc.nap.time = _nhh + ":" + _nmm;
    if (napDurEl) { var nd = parseInt(napDurEl.value,10); if (isFinite(nd) && nd > 0) sc.nap.durationMin = nd; }
    syncTasks();
    notify("success","ذخیره شد و تسک‌ها ساخته شد");
    render(_currentView());
  }
  R.sleepUI = { render: render, syncTasks: syncTasks, _ensure: _ensure, purgeAll: function () { /* PATCH:phase-F7-nosync */
    var s = _ensure(state()); if (!s) return 0;
    var before = (s.tasks || []).length;
    s.tasks = (s.tasks || []).filter(function(t){
      if (!t || !t.title) return true;
      if (t._sleepAuto) return false;
      if (t.title.indexOf("خواب شب") !== -1) return false;
      if (t.title.indexOf("چرت") !== -1) return false;
      return true;
    });
    save();
    return before - s.tasks.length;
  }, openForm: function (kind, date) { /* PATCH:phase-F7-dateSave */ _sub = "day"; _openForm(kind || "night", date); } };



  try { console.log("[sleep-ui] v2 loaded"); } catch (e) {}
})();