# AGENT-28 — Handoff from Agent #27

## شما Agent #28 هستید — جانشین Agent #27

### ترتیب خواندن
1. docs/AGENT.md
2. docs/AGENT-28-PROMPT.md — همین فایل
3. docs/CURRENT.md (بخش AGENT-27 CLOSEOUT)
4. docs/HANDOFF.md (بخش For Agent #28)
5. docs/DECISIONS.md (ADR-091..094 — Study Together)
6. docs/KNOWN_ISSUES.md (ISSUE-ST-01..03)
7. docs/ROADMAP.md (بخش STUDY TOGETHER V1)
8. docs/ARCHITECTURE.md (بخش Study Together V1)
9. docs/STUDY-TOGETHER.md — راهنمای راه‌اندازی
10. docs/STUDY-TOGETHER-SQL.sql — Schema + RLS
11. app/residency/study-together.js
12. docs/POWERSHELL-GUIDE.md — CRITICAL

---

## ۱. پروژه (خلاصه)

Internship OS — اپلیکیشن دسکتاپ ویندوز برای اینترن پزشکی (ادریس).
- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8 روی 127.0.0.1:8977
- Persistence: localStorage + data/state.js
- Path: D:\Desktop\.internship-os\internship-os
- Schema: v22 (بدون تغییر)
- Version: **v0.6.0** (بدون release جدید)

## ۲. نقش شما

Coding / Implementation Agent. اجراکنندهٔ دستورهای Design Agent و مالک.

Workflow: AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT

اگر دستور مبهم بود: Audit کن، patch نزن.

## ۳. چطور با ما کار کن (حیاتی)

### ۳.۱. واقعیت محیط

شما هیچ دسترسی مستقیم به فایل‌سیستم مالک ندارید. کل تعامل از طریق چت است.
مالک (ادریس) اسکریپت‌ها را اجرا می‌کند و خروجی را برمی‌گرداند.

### ۳.۲. قاعده طلایی

هرگز فرض نکن که فایل‌ها را داری. هیچ فایلی را نمی‌بینی مگر اینکه مالک برایت بفرستد یا اسکریپت اجرا کند.

### ۳.۳. پوشهٔ مخصوص Audit شما

    D:\Desktop\.internship-os\internship-os\_agent28-audit\

قواعد:
- هر audit script را با New-Item -ItemType Directory -Force بساز.
- نام فایل با پیشوند topic-number.txt.
- هرگز فایل را در root پروژه یا داخل app/ یا docs/ نریز.

### ۳.۴. چهار الگوی تعامل مجاز

الگوی ۱ — Audit Script: PowerShell script بده که فایل را در _agent28-audit/ کپی کند یا slice دقیق تابع را در txt بنویسد.

الگوی ۲ — Copy-Paste Slice: PowerShell script بده که slice کوتاه را در Console چاپ کند.

الگوی ۳ — Patch Script:
- backup با پسوند .bak-phase-ts
- anchor ASCII
- marker-check قبل/بعد
- نوشتن با WriteAllText و UTF8Encoding(false)
- node --check + LASTEXITCODE check
- در catch: rollback از backup همین patch

الگوی ۴ — New File: script بده که فایل جدید با content کامل بنویسد + node --check.

### ۳.۵. قواعد اسکریپت (POWERSHELL-GUIDE + درس‌های Agent #27)

- try/catch — هیچ‌جا exit نه
- anchor ASCII (نه فارسی)
- backup اجباری + size check (0 byte → throw)
- نوشتن با IO.File.WriteAllText و UTF8Encoding(false)
- خواندن با IO.File.ReadAllText + Replace(crlf, lf)
- **درس جدید Agent #27:** در PowerShell، single-quote هر چیزی را literal نگه می‌دارد — حتی backtick. backtick-n درون single-quote دو کاراکتر است، نه newline.
- **درس جدید Agent #27:** verification باید segment-scoped باشد: v.Substring(start, len).Contains(...) نه global v.Contains(...). Global Contains باعث ۳ false-positive شد.
- برای anchor چندخطی از here-string with Replace یا brace-counting استفاده کن.
- node --check روی .bak-* fail می‌دهد — به check-tmp.js کپی کن.
- variable names case-sensitive — uiPath vs uiText مخلوط نکن.
- هیچ triple-backtick داخل here-string نگذار — markdown چت را قطع می‌کند.
- **درس جدید Agent #27:** اگر در محتوای here-string کاراکتر backtick (تک) لازم داری، از placeholder مثل ` استفاده کن و در انتها Replace کن.

### ۳.۶. زبان پاسخ

- فارسی برای explanation
- انگلیسی برای کد، log، نام فایل، نام تابع، ID
- پاسخ کوتاه، بدون فلسفه
- اسکریپت اول، راهنمای تست دوم

## ۴. وضعیت فعلی (2026-10-23)

| مورد | وضعیت |
|---|---|
| Release v0.6.0 | RELEASED 2026-10-22 |
| R3 Replan Engine | CLOSED |
| R2-H Polish/A11y | CLOSED WITH LIMITATIONS |
| R2-I Wizard | CLOSED WITH LIMITATIONS |
| Workspace Redesign | ACCEPTED |
| Final Regression | 578/578 PASS |
| **Study Together V1** | **IMPLEMENTATION COMPLETE · LIVE VALIDATION PASS (partial) · RELEASE GATE PENDING** |

## ۵. Study Together V1 — چه چیزی تحویل داده شد

### معماری

- Backend: Supabase Free (Auth + Postgres + Realtime Presence)
- Client SDK: @supabase/supabase-js version 2.118.0 (pinned, lazy load)
- Config: data/study-together.js (خارج از git)
- Module: app/residency/study-together.js (external IIFE, ~36000 bytes)

### فایل‌های جدید

| فایل | نقش |
|---|---|
| app/residency/study-together.js | ماژول اصلی |
| app/residency/study-together-tests.js | test bridge (deferred install) |
| docs/STUDY-TOGETHER.md | راهنمای راه‌اندازی |
| docs/STUDY-TOGETHER-SQL.sql | Schema + RLS + RPC |
| data/study-together.js | config (مالک می‌سازد) |

### فایل‌های تغییر‌یافته (additive only)

- app/app.js — MAIN_ROUTES + switch case + renderStudyTogether + _studyTogetherBridge + _stGetCurrentActivity (~+70 خط)
- app/index.html — nav button + ۲ script tag
- app/styles.css — PATCH:study-together append (prefix st-)

### Test Matrix (نهایی)

**App Tests:**
- L01-L07, L09, L11 → PASS
- L08, L10 → NOT TESTED (مالک defer کرد)

**SQL Security:**
- SQL-01..SQL-12 → همه PASS
- SQL-08 (idempotency) → unique violation 23505
- SQL-09 (revoke invite) → invalid_invite_code

**Unit Tests:**
- 14/14 PASS

**Live Validation:**
- ۲ حساب واقعی + ۱ non-member
- Presence + Timer + Privacy → همه PASS

**State Integrity:**
- 196 tasks / 156 activities / schema v22 — UNCHANGED

## ۶. نقشهٔ فایل‌های Study Together

| فایل | خط | نقش |
|---|---|---|
| app/residency/study-together.js | ~900 | ماژول اصلی (S runtime, doAuth, joinPresence, broadcastPresence, schedulePresenceReconnect, session lifecycle) |
| app/residency/study-together-tests.js | ~40 | bridge با poll-until-ready (چون boot() window.__os را reassign می‌کند) |
| app/app.js | +70 خط در ۳ نقطه | MAIN_ROUTES, switch case, renderStudyTogether, _studyTogetherBridge, _stGetCurrentActivity |
| app/index.html | +5 خط | nav button + ۲ script |
| app/styles.css | +250 خط | PATCH:study-together prefix st- |
| docs/STUDY-TOGETHER-SQL.sql | ~465 خط | جدول‌ها، RLS، RPC، Realtime policy |
| data/study-together.js | ~5 خط | url + publishableKey + sdkVersion |
## ۷. قراردادهای Frozen — دست نزن

### قبلی (از v0.6.0)

- round-scheduler-v22.js
- store-v2/v5/v10.js
- domain-v2/v3/v4/v5/v10/v20.js
- planner-replan-apply-v7.js
- scheduling-conflict-v20.js RULES table
- Schema v22 (no bump)
- window.INTERNSHIP_STATE (read-only)
- Migration chain
- STEPS array (13) در wizard
- _draft structure
- _applySchedulerToDraft()
- Workspace _postWire chain (۱۰ لایه — فقط wrap، نه جایگزین)
- ۹ فایل core workspace
- ADR-081 hard-delete gate (۵ شرط)

### جدید (Study Together V1 — ADR-091..094)

- ADR-091: Supabase Free backend
- ADR-092: Additive module + _stGetCurrentActivity
- ADR-093: Client session idempotency + pending recovery
- ADR-094: Realtime presence stability rules
- service_role هرگز در client
- share_daily_total / share_timeline enforcement در RLS (نه فقط UI)
- SQL helpers در private schema فقط (SECURITY DEFINER + SET search_path = '')
- gen_random_uuid() نه gen_random_bytes (بدون pgcrypto dependency)

## ۸. موارد Deferred — نیازمند مجوز صریح

### قبلی

- حذف workspace-v13.js + .pw13-* CSS
- CSS mass cleanup / شکستن styles.css
- ادغام دسته‌جمعی patch blockها
- هر تغییر در Schema v22

### جدید — Study Together V2 (درخواست مالک، منتظر Design Agent)

- A: Keep-alive heartbeat (جلوگیری از Pause)
- B: Avatar photos (Supabase Storage)
- C: Pomodoro mode
- D: Multi-day session history + manual edit
- E: Offline start-study behavior (A/B/C options)
- F: UI polish (cards, avatar, buttons, copy-code, badges)

## ۹. Known Limitations (پذیرفته — باز نکن)

- ISSUE-122 — Proposal real-data NOT TESTED
- ISSUE-123 — Review due-row NOT TESTED
- ISSUE-124 — W-43 real overload not reproducible
- ISSUE-76 — plannerAllocation legacy array
- ISSUE-125 — workspace-v13.js dead code
- ISSUE-ST-01 — UI یک گروه
- ISSUE-ST-02 — Supabase Free Pause بعد از ۱ هفته
- ISSUE-ST-03 — Offline behavior undefined

## ۱۰. درس‌های حیاتی Agent #27

### ۱۰.۱. boot() در app.js — window.__os را REASSIGN می‌کند

خطوط ~17792 و ~17821:

    window.__os = { getState, saveState, ... };   // reassign، نه extend

هر bridge جدید باید:

- یا در boot() merge شود (Object.assign(window.__os || {}, ...))
- یا poll کند تا window.__os.getState موجود شود (الگوی study-together-tests.js)

### ۱۰.۲. Realtime Presence — ADR-094 الزامی

- Heartbeat حداکثر ۱ بار در هر ۳۰ ثانیه (نه ۱ ثانیه)
- Closure capture per channel — check (_channel === ch) قبل از mutate
- Exponential backoff — 3s → 6s → 12s → 24s → 30s cap
- setAuth only on token change (کش کن _lastAuthToken)
- broadcastPresence فقط وقتی _channel.state === "joined"

بدون این‌ها: CLOSED loop هر ۱-۲ ثانیه، presence ناپایدار.

### ۱۰.۳. SQL — SET search_path = '' + helper در private schema

- gen_random_bytes در schema extensions است، نه public → خطا
- gen_random_uuid() در هسته Postgres (13+) → همیشه کار می‌کند
- helper functions در private schema با SECURITY DEFINER
- revoke from public, anon صریح
- notify pgrst, 'reload schema' بعد از هر تغییر RPC
- policyهای realtime.messages روی جدول موجود (RLS از قبل فعال است — ALTER نزن)

### ۱۰.۴. PowerShell — backtick در single-quote

    $s = '...`n...'   // ← backtick-n = دو کاراکتر literal، نه newline

برای newline:

- here-string with .Replace(crlf, lf)
- یا [char]10 (کاراکتر کد)
- یا $nl = [char]10 تعریف کن

### ۱۰.۵. Verification باید segment-scoped باشد

غلط (false-positive می‌دهد):

    if ($v.Contains('session_data')) { ... }

درست:

    $start = $v.IndexOf('create policy sessions_self_or_group_read')
    $end   = $v.IndexOf('create policy sessions_self_insert')
    $segment = $v.Substring($start, $end - $start)
    if (-not $segment.Contains('share_daily_total = true')) { throw 'RLS gate missing' }

### ۱۰.۶. backtick در here-string → chat می‌شکند

اگر در محتوای here-string یک backtick (تنها) لازم داری، از placeholder @@BT@@ استفاده کن و در انتها Replace کن:

    $BT = [string][char]96
    $content = @'
    ...@@BT@@...
    '@
    $content = $content.Replace('@@BT@@', $BT)

## ۱۱. اولین کار تو (Agent #28)

1. ۱۲ فایل docs + module + SQL را بخوان
2. POWERSHELL-GUIDE.md را کامل بخوان
3. DECISIONS.md ADR-091..094 را بخوان
4. منتظر دستور Design Agent یا مالک باش — هیچ کار خودسرانه‌ای شروع نکن

اگر مالک گفت:

- audit کن / بررسی کن → اول Audit script در _agent28-audit/
- patch بده → قبل از patch باید audit کرده باشی
- test بده → IIFE self-contained
- گزارش بده → جدول‌محور، دقیق، بدون ادعای تست‌نشده
- نمی‌خواد گزارش بدی → مستقیم patch، فقط OK/FAIL

## ۱۲. وضعیت Git

- آخرین commit اصلی روی main: `13985cd` — docs v0.6.0 closeout
- `docs/STUDY-TOGETHER-*`، `app/residency/study-together*.js`، تغییرات `app.js`، `index.html`، `styles.css` هنوز commit نشده‌اند (untracked + modified)
- `data/study-together.js` در gitignore است (folder data)
- Agent #28 باید قبل از هر commit، `_agent28-audit/` را حذف کند

## ۱۳. Roadmap

1. R3 — CLOSED
2. R2-H — CLOSED WITH LIMITATIONS
3. R2-I — CLOSED WITH LIMITATIONS
4. Workspace — ACCEPTED
5. Final Regression — ACCEPTED WITH LIMITATIONS
6. Release v0.6.0 — RELEASED
7. Study Together V1 — IMPLEMENTATION COMPLETE · RELEASE GATE PENDING
8. Phase بعدی — منتظر Design Agent (احتمالاً V2 Study Together یا UI redesign)

---

## Cross-References

- docs/AGENT.md — invariants (Session Update · Agent #27)
- docs/CURRENT.md — AGENT-27 CLOSEOUT
- docs/HANDOFF.md — For Agent #28
- docs/DECISIONS.md — ADR-091..094
- docs/KNOWN_ISSUES.md — ISSUE-ST-01..03
- docs/ROADMAP.md — STUDY TOGETHER V1
- docs/ARCHITECTURE.md — Study Together V1 section
- docs/STUDY-TOGETHER.md — setup guide
- docs/STUDY-TOGETHER-SQL.sql — schema
- app/residency/study-together.js — module
- docs/POWERSHELL-GUIDE.md — script rules
- _agent28-audit/ — پوشهٔ مخصوص audit شما (ایجاد خودکار)

---

**پایان AGENT-28-PROMPT.md**