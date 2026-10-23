# AGENT-29 — Handoff from Agent #28

## شما Agent #29 هستید — جانشین Agent #28

### ترتیب خواندن

1. docs/AGENT.md
2. docs/AGENT-29-PROMPT.md — همین فایل
3. docs/CURRENT.md (بخش AGENT-28 CLOSEOUT)
4. docs/HANDOFF.md (بخش For Agent #29)
5. docs/DECISIONS.md (ADR-091..094 V1 + ADR-100..103 2.0)
6. docs/KNOWN_ISSUES.md (ISSUE-ST-01..05)
7. docs/ROADMAP.md (بخش STUDY TOGETHER 2.0)
8. docs/ARCHITECTURE.md (بخش Study Together 2.0)
9. docs/STUDY-TOGETHER.md — setup V1
10. docs/STUDY-TOGETHER-SQL.sql — Schema V1 + RLS + RPC
11. docs/study-together-2.0-migrations.sql — Migrations 2.0 (M1+M2+M3)
12. app/residency/study-together.js — ماژول اصلی (~2600 خط)
13. docs/POWERSHELL-GUIDE.md — CRITICAL

---

## ۱. پروژه (خلاصه)

Internship OS — اپلیکیشن دسکتاپ ویندوز برای اینترن پزشکی (ادریس).

- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8 روی 127.0.0.1:8977
- Persistence: localStorage + data/state.js
- Path: D:\Desktop\.internship-os\internship-os
- Schema: v22 (بدون تغییر)
- Version: v0.6.1 (بدون release جدید — Release Gate `OPEN — PRIVATE PILOT WITH DOCUMENTED LIMITATIONS`)

### Study Together (زیرسیستم اینترن)

- Backend: Supabase Free (Auth + Postgres + Realtime Presence)
- Client SDK: @supabase/supabase-js 2.118.0 (pinned، lazy load از jsDelivr)
- Config: data/study-together.js (خارج از git، مالک می‌سازد)
- Module: app/residency/study-together.js (~2600 خط، external IIFE)
- SQL: docs/STUDY-TOGETHER-SQL.sql (V1) + docs/study-together-2.0-migrations.sql (2.0)

## ۲. نقش شما

Coding / Implementation Agent. اجراکنندهٔ دستورهای Design Agent و مالک.

Workflow: AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT

اگر دستور مبهم بود: Audit کن، patch نزن.

## ۳. چطور با ما کار کن (حیاتی)

### ۳.۱ واقعیت محیط

شما هیچ دسترسی مستقیم به فایل‌سیستم مالک ندارید. کل تعامل از طریق چت است.
مالک (ادریس) اسکریپت‌ها را اجرا می‌کند و خروجی را برمی‌گرداند.

### ۳.۲ قاعده طلایی

هرگز فرض نکن که فایل‌ها را داری. هیچ فایلی را نمی‌بینی مگر اینکه مالک برایت بفرستد یا اسکریپت اجرا کند.

### ۳.۳ پوشهٔ مخصوص Audit شما

    D:\Desktop\.internship-os\internship-os\_agent29-audit\

قواعد:
- هر audit script را با `New-Item -ItemType Directory -Force` بساز.
- نام فایل با پیشوند topic-number.txt.
- هرگز فایل را در root پروژه یا داخل app/ یا docs/ نریز.
- **`_agent*-audit/` در `.gitignore` ثبت شده — commit نمی‌شود.**

### ۳.۴ چهار الگوی تعامل مجاز

**الگوی ۱ — Audit Script:** PowerShell script بده که فایل را در `_agent29-audit/` کپی کند یا slice دقیق تابع را در txt بنویسد.

**الگوی ۲ — Copy-Paste Slice:** PowerShell script بده که slice کوتاه را در Console چاپ کند.

**الگوی ۳ — Patch Script:**
- backup با پسوند `.bak-<phase>-ts`
- anchor ASCII
- marker-check قبل/بعد
- نوشتن با `[IO.File]::WriteAllText` + `[Text.UTF8Encoding]::new($false)`
- `node --check` + `$LASTEXITCODE` check
- در catch: rollback از backup همین patch

**الگوی ۴ — New File:** script بده که فایل جدید با content کامل بنویسد + `node --check`.

اگر فایل یا اطلاعاتی نیاز داری: **اسکریپت PowerShell بده** تا مالک اجرا کند و خروجی را به تو برگرداند.

### ۳.۵ قواعد اسکریپت (POWERSHELL-GUIDE + درس‌های Agent #27/28)

- `try/catch` — هیچ‌جا `exit` نه
- anchor ASCII (نه فارسی)
- backup اجباری + size check (0 byte → `throw`)
- نوشتن با `[IO.File]::WriteAllText($p, $s, [Text.UTF8Encoding]::new($false))`
- خواندن با `[IO.File]::ReadAllText($p, [Text.UTF8Encoding]::new($false))` — هرگز `Get-Content -Encoding UTF8`
- normalize CRLF→LF: `$s.Replace([string][char]13 + [string][char]10, [string][char]10)` **بعد از** ReadAllText
- variable names case-insensitive — `$uiPath` و `$uiText` را جدا نگه دار
- backtick در single-quote = دو کاراکتر literal (نه newline) → از `[char]10` یا here-string با Replace استفاده کن
- verification **segment-scoped**: `$s.Substring($start, $len).Contains(...)` نه `$s.Contains(...)` (global)
- برای function boundary از **brace-counting** استفاده کن، نه `IndexOf("  }")`
- `node --check` روی `.bak-*` fail می‌دهد — به `_check-tmp.js` کپی کن
- هیچ triple-backtick داخل here-string نگذار — markdown چت را قطع می‌کند (از 4-space indent استفاده کن)
- اگر در محتوای here-string کاراکتر backtick تنها لازم داری، از placeholder `@@BT@@` استفاده کن و در انتها `Replace('@@BT@@', [string][char]96)` کن
- verify **قبل** از write + verify **بعد** از write
- `finally` برای cleanup (مثل `window.__PRA_FORCE_FAIL__`)

### ۳.۶ زبان پاسخ

- فارسی برای explanation
- انگلیسی برای کد، log، نام فایل، تابع، ID
- پاسخ کوتاه، بدون فلسفه
- اسکریپت اول، راهنمای تست دوم
- جدول‌محور وقتی چند مورد است

---

## ۴. وضعیت فعلی (2026-10-23)

| مورد | وضعیت |
|---|---|
| Release v0.6.0 | RELEASED 2026-10-22 |
| Version در working tree | v0.6.1 (commit 74efa79) |
| R3 Replan Engine | CLOSED |
| R2-H Polish/A11y | CLOSED WITH LIMITATIONS |
| R2-I Wizard | CLOSED WITH LIMITATIONS |
| Workspace Redesign | ACCEPTED |
| Final Regression v0.6.0 | 578/578 PASS |
| **Study Together V1** | COMMITTED (74efa79) |
| **Study Together 2.0 Wave 1** | COMMITTED (74efa79) |
| **Study Together 2.0 Wave 2** | COMMITTED (db09687) |
| **Study Together 2.0 Wave 3** | COMMITTED (27e4069) |
| **V1 Release Gate** | OPEN — PRIVATE PILOT WITH DOCUMENTED LIMITATIONS |

### Commit chain

- `13985cd` — v0.6.0 closeout (origin/main — push نشده)
- `74efa79` — Study Together V1 + D + Wave 1 (31 files, +5008/-1985)
- `db09687` — Wave 2 (2 files, +630/-40)
- `27e4069` — Wave 3 (2 files, +386/-11) ← HEAD

**۳ commit جلوتر از origin — تصمیم push با Design Agent.**

---

## ۵. Study Together 2.0 — چه چیزی تحویل داده شد

### معماری

- Backend: Supabase Free (Auth + Postgres + Realtime Presence)
- 5 migrations applied (V1 base + M1 + M2 + M3)
- Server-side ownership enforced by trigger

### ۵ بخش تکمیل‌شده

**۱. Focus Studio**
- Course chips (بدون درس / courses کاربر / + جدید)
- SVG timer ring (پومودورو timestamp-driven)
- Manual timer + Pomodoro overlay
- Today summary (total / count / last session)
- Members presence grid (studying / break / idle / disconnected)
- Reminder banner (پس از ۱۴:۰۰ اگر ۰ جلسه امروز)

**۲. Profile**
- Avatar picker (av-1..8 gradients)
- display_name + username
- Today / 7-day / courses count stats
- ۴ privacy toggles: `share_daily_total`، `share_timeline`، `share_course_breakdown`، `share_history_with_group`

**۳. History**
- 7 / 30 / 90 day range
- Monthly heatmap (5 levels l0..l4، click-to-filter)
- Course filter dropdown (همه / بدون درس / هر course)
- Day-clear chip
- Day-grouped rows با badges (پایان / استراحت / قطع‌شده / باز / دستی)

**۴. Statistics**
- Period selector (امروز / ۷ روز / ۳۰ روز)
- SVG line chart (area gradient)
- ۴ stat tiles (مجموع / جلسه / میانگین روزانه / طولانی‌ترین)
- Top-3 روزهای پربازده
- Best session highlight
- Per-course breakdown (top 5 bars)

**۵. Friends**
- Leaderboard (today / 7d / 30d)
- Rank badges (🥇🥈🥉)
- Clickable member cards
- Member profile modal
- Share-gated data (share_daily_total / share_course_breakdown / share_history_with_group / share_timeline)
- Privacy note / backdrop close / close button

### Migrations

**V1 base** (`docs/STUDY-TOGETHER-SQL.sql`):
- Tables: profiles، study_groups، study_group_members، study_sessions
- RLS روی ۴ جدول + realtime.messages
- private schema helpers (SECURITY DEFINER + `SET search_path = ''`)
- RPC: create_study_group، join_study_group، leave_study_group، delete_study_group، revoke_invite_code

**2.0** (`docs/study-together-2.0-migrations.sql`):
- **M1:** `study_courses` table (id, user_id, name, color, icon, display_order, archived_at) + 4 RLS policies + index
- **M2:** `study_sessions.course_id` (FK nullable، ON DELETE SET NULL) + `private.enforce_session_course_owner()` trigger (BEFORE INSERT OR UPDATE OF course_id, user_id) — error `42501: course_not_owned_by_user`
- **M3:** `profiles.avatar_key` (av-1..8 regex)، `bio` (≤200)، `share_course_breakdown` (bool default false)، `share_history_with_group` (bool default false)

### Server-side enforcement (ADR-102)

- Trigger rejects client-attached `course_id` that isn't owned by the `user_id`
- Tested: F.2a (INSERT cross-owner) + F.2b (UPDATE cross-owner) + F.2c (no stray rows)
- **Client validation alone is not trusted**

### Test Results (cumulative)

| Suite | Result |
|---|---|
| Unit (module __tests) | 41/41 |
| D Security (SQL) | 4/4 (cross-user UPDATE/DELETE/SELECT/INSERT blocked) |
| Server ownership (F.2a-c) | 3/3 |
| Wave 1 (V3 final) | 13/13 |
| Wave 2 (W2A + W2B + W2C) | 18 + 21 + 20 = 59 |
| Wave 3 (W3) | 22/22 |
| State integrity | 196 / 156 / 22 UNCHANGED |

**توجه:** W2B 21/21 و W3 22/22 پس از تفسیر false-negativeهای test-script (نه module). شاهد در درس ۱۰.۹ همین فایل.

### SQL Security verified (D-S01..S04)

- S01 UPDATE cross-user → `0 rows affected`, no error
- S02 DELETE cross-user → `0 rows affected`, no error
- S03 SELECT non-member → `0 rows returned`, no error
- S04 INSERT non-member → `error 42501 (RLS policy violation)`, 0 rows

---

## ۶. نقشهٔ فایل‌های Study Together 2.0

| فایل | خط | نقش |
|---|---|---|
| `app/residency/study-together.js` | ~2600 | ماژول اصلی (V1 + D + W1 + W2 + W3) |
| `app/residency/study-together-tests.js` | ~27 | test bridge (poll-until-ready) |
| `docs/STUDY-TOGETHER-SQL.sql` | ~459 | Schema + RLS + RPC (V1) |
| `docs/study-together-2.0-migrations.sql` | ~100 | M1 + M2 + M3 (2.0) |
| `docs/STUDY-TOGETHER.md` | ~119 | setup guide (Persian) |
| `data/study-together.js` | ~5 | config (gitignored، مالک می‌سازد) |
| `app/app.js` | +58/-2 | V1 routes (MAIN_ROUTES، switch case، renderStudyTogether، _studyTogetherBridge، _stGetCurrentActivity) |
| `app/index.html` | +8/-1 | nav button + ۲ script tag |
| `app/styles.css` | +~11.5 KB | تمام CSS Study Together (prefix `st-` فقط) |

---

## ۷. قراردادهای Frozen — دست نزن

### قبلی (از v0.6.0)

- `round-scheduler-v22.js`
- `store-v2/v5/v10.js`
- `domain-v2/v3/v4/v5/v10/v20.js`
- `planner-replan-apply-v7.js`
- `scheduling-conflict-v20.js` RULES
- Schema v22 (no bump)
- `window.INTERNSHIP_STATE` (read-only)
- migration chain
- STEPS (13)، `_draft`، `_applySchedulerToDraft`
- Workspace `_postWire` chain (10 لایه — wrap نه replace)
- ۹ فایل core workspace
- ADR-081 hard-delete gate (۵ شرط)

### Study Together (ADR-091..094 + ADR-100..103)

- `service_role` هرگز در client (فقط `publishableKey`)
- `share_daily_total` / `share_timeline` در RLS enforcement؛ `share_course_breakdown` / `share_history_with_group` = UI-only (ISSUE-ST-05)
- SQL helpers در `private` schema فقط (SECURITY DEFINER + `SET search_path = ''`)
- `gen_random_uuid()` نه `gen_random_bytes`
- Server-side ownership trigger (`private.enforce_session_course_owner`)
- Realtime: heartbeat ≤30s، closure-capture per channel، backoff 3→6→12→24→30، `setAuth` on token change، `state==="joined"` gate قبل از `track()`
- `study_sessions.course_id = NULL` برای sessionهای قدیمی → «عمومی/بدون دسته»
- `client_session_id` prefix `manual-` برای manual insert (idempotency + تشخیص در تاریخچه)

---

## ۸. موارد Deferred — نیازمند مجوز صریح

### قبلی

- حذف `workspace-v13.js` + `.pw13-*` CSS
- CSS mass cleanup / شکستن styles.css
- تغییر Schema v22

### Study Together — فاز بعد

- **ISSUE-ST-04** — presence reconnect duplication (پیش‌موجود V1، خارج از scope)
- **ISSUE-ST-05** — `share_course_breakdown` / `share_history_with_group` UI-only (RLS فقط `share_daily_total` را gate می‌کند)
- **D-I03** — concurrent edit (2-tab env)
- **Multi-device** course sync
- **Storage** برای avatar upload (B از roadmap اصلی — `avatar_key` فعلی av-1..8)
- **Pomodoro custom duration** (فعلاً 25/5 ثابت)
- **Group chat / feed** (بدون scope)
- **Offline sync queue** (نیازمند ADR جدا)

---

## ۹. Known Limitations (پذیرفته — باز نکن)

- ISSUE-122..125 (v0.6.0 closeout)
- ISSUE-ST-01 — UI یک گروه (V1 design)
- ISSUE-ST-02 — Supabase Free pause ۱ هفته
- ISSUE-ST-03 — Offline start-study undefined
- **ISSUE-ST-04** — presence reconnect duplication (pre-existing V1)
- **ISSUE-ST-05** — 2-layer privacy (RLS فقط share_daily_total)

---

## ۱۰. درس‌های حیاتی Agent #28 (بخوان قبل از هر patch)

### ۱۰.۱ — fa0 با صفر پیشرو

`_fa0("00") = "۰"` نه `"۰۰"`. هرگز از `fa0` برای ساخت zero-padded string استفاده نکن.

`_fmtTimer` اصلی V1 این باگ را داشت → C-1 آن را با helper اختصاصی بازنویسی کرد:

    function _toPersianDigits(str) {
      return String(str).replace(/[0-9]/g, function(d){ return String.fromCharCode(0x06F0 + parseInt(d,10)); });
    }
    function _fmtTimer(sec) {
      function pad2(n){ return _toPersianDigits(n < 10 ? "0" + n : "" + n); }
      return pad2(h) + ":" + pad2(m) + ":" + pad2(s);
    }

### ۱۰.۲ — render* function: return vs innerHTML

`renderReady` یک dispatch مرکزی است. اگر شاخه‌ای `return renderX()` بدهد (return string، نه assign)، DOM آپدیت نمی‌شود.

    // غلط — DOM آپدیت نمی‌شود:
    if (S.readyView === "course-form") return _courseFormRender();
    // درست:
    if (S.readyView === "course-form") { S.container.innerHTML = _courseFormRender(); wire(); return; }

این تنها باگ واقعی Wave 1 بود (V3 fix).

### ۱۰.۳ — waitFor برای تست‌های async

`S.phase === "ready"` صادق است حتی وقتی `_loadCourses()` هنوز تمام نشده (چون `render()` در bootstrap قبل از network انجام می‌شود). تست‌های DOM باید روی عنصر واقعی منتظر بمانند:

    await waitFor(() => document.querySelectorAll('[data-st-act="nav-tab"]').length === 5, 8000);

نه فقط `waitFor(() => ST.status().phase === "ready")`.

### ۱۰.۴ — Detached element بعد از render

    var chip = document.querySelector('.st-course-chip');
    chip.click();           // render() DOM را جایگزین می‌کند
    chip.classList.contains('is-active')  // ← chip detached است، همیشه false
    // درست:
    var fresh = document.querySelector('[data-course-id="' + cid + '"]');
    fresh.classList.contains('is-active')  // ← true

شاهد: V3-05 اعلام شکست کرد ولی V3-07 (session.course_id در DB) اثبات کرد module درست کار کرده.

### ۱۰.۵ — Pomodoro fast-forward

`_pomTick` از `S.pom.phaseEndsAt` (memory) می‌خواند، نه localStorage. تغییر localStorage از Console هیچ اثری ندارد. باید nav-away → nav-back تا `_pomAfterOpen` اجرا شود و `S.pom` از localStorage reload شود.

### ۱۰.۶ — Multiple open sessions

`endWith` یک session را می‌بندد. `refreshAll` در query بعدی اگر session باز دیگری پیدا کند، `S.session` را ست می‌کند → دکمهٔ `end` برمی‌گردد. برای پاک‌سازی: loop تا `pom-start` ظاهر شود (نه `end`).

### ۱۰.۷ — qGetProfiles columns

اگر ستون جدید (مثلاً `share_course_breakdown`) در SELECT نباشد، `S.members` آن فیلد را ندارد → member modal به اشتباه privacy note نشان می‌دهد. `qGetProfiles` باید **همهٔ** ستون‌های مورد نیاز را بگیرد.

### ۱۰.۸ — Server trigger برای ownership

Client validation کافی نیست. `private.enforce_session_course_owner()` BEFORE INSERT OR UPDATE OF course_id, user_id → `42501: course_not_owned_by_user`. این را در هر مهاجرت course_id-dependent حفظ کن.

### ۱۰.۹ — Test-script bugs ≠ module bugs

- W2B-04/05/06 FAIL → waitFor اشتباه (heatmap بعد از network load ظاهر می‌شود)
- W2C-03 FAIL → `.st-card` counting شامل `.st-chart-card` نمی‌شود
- W3-17 FAIL → modal قبل از async load چک شد
- V3-05 FAIL → detached element

قبل از patch، همیشه شاهد قطعی (DB state، یا waitFor مجدد) بگیر — patch کردن module وقتی module سالم است، ریسک است.

### ۱۰.۱۰ — PowerShell lessons (ترکیب Guide + Agent #27 + Agent #28)

- Single-quote: backtick-n = دو کاراکتر literal (نه newline). از `[char]10` یا here-string با Replace استفاده کن.
- Segment-scoped verify: `Substring(start, len).Contains(...)` نه `$v.Contains(...)`.
- Brace-counting برای function boundary (نه `IndexOf("  }")`).
- CRLF→LF normalize **بعد از** هر ReadAllText قبل از Replace.
- `_check-tmp.js` برای `node --check` روی `.bak-*`.
- variable names case-insensitive — path و content را در variable جدا نگه دار.
- `try/catch` با rollback از backup همین patch. `finally` برای پاک‌سازی.
- verify BEFORE + AFTER write.

---

## ۱۱. اولین کار تو (Agent #29)

1. ۱۳ فایل docs + module + SQL را بخوان
2. POWERSHELL-GUIDE.md را کامل بخوان
3. DECISIONS.md ADR-091..094 + ADR-100..103 را بخوان
4. **منتظر دستور Design Agent یا مالک باش — هیچ کار خودسرانه‌ای شروع نکن**

اگر مالک گفت:

- **audit کن / بررسی کن** → اول Audit script در `_agent29-audit/`
- **patch بده** → قبل از patch باید audit کرده باشی
- **test بده** → IIFE self-contained، با `waitFor` برای async، با `console.table` summary
- **گزارش بده** → جدول‌محور، دقیق، بدون ادعای تست‌نشده، با `NOT TESTED` صریح
- **نمی‌خواد گزارش بدی** → مستقیم patch، فقط OK/FAIL
- **migration بده** → **قبل از** UI patch اجرا شود، verification queries بدهد

اگر فایل یا اطلاعاتی نداری:
- **اسکریپت PowerShell بده** تا مالک اجرا کند و خروجی را به تو برگرداند
- هرگز فرض نکن که فایل را می‌بینی

---

## ۱۲. وضعیت Git

- `main` HEAD: `27e4069` (Wave 3)
- `origin/main`: `13985cd` (v0.6.0 — push نشده)
- Commits ahead: ۳ (`74efa79`، `db09687`، `27e4069`)
- `_agent28-audit/` و `_agent29-audit/` — gitignored (`_agent*-audit/`)
- همهٔ `*.bak-*` — gitignored
- `data/study-together.js` — gitignored (folder `data/`)

**قبل از هر push:** `git status` → بررسی. اگر Design Agent گفت push، ابتدا تأیید بگیر.

**قبل از هر commit:** stage صریح (نه wildcard). `_agent*-audit/`، `*.bak-*`، `data/` هرگز commit نکنند.

---

## ۱۳. Roadmap

1. R3 — CLOSED
2. R2-H — CLOSED WITH LIMITATIONS
3. R2-I — CLOSED WITH LIMITATIONS
4. Workspace — ACCEPTED
5. Final Regression v0.6.0 — ACCEPTED WITH LIMITATIONS
6. Release v0.6.0 — RELEASED 2026-10-22
7. **Study Together V1** — COMMITTED + PRIVATE PILOT
8. **Study Together 2.0 Wave 1** — COMMITTED
9. **Study Together 2.0 Wave 2** — COMMITTED
10. **Study Together 2.0 Wave 3** — COMMITTED
11. **Phase بعدی** — منتظر Design Agent

**Wave 4 candidates (بدون scope قفل‌شده):**
- Storage برای avatar upload (B از roadmap اصلی)
- Group analytics cross-user (با حفظ privacy layers)
- Custom Pomodoro durations
- Offline sync queue (نیازمند ADR)
- NOTIFICATION OS-level
- Group chat / activity feed (design تصمیم)
- ISSUE-ST-04 fix (presence reconnect)

---

## Cross-References

- `docs/AGENT.md` — invariants (Session Update · Agent #28)
- `docs/CURRENT.md` — AGENT-28 CLOSEOUT
- `docs/HANDOFF.md` — For Agent #29
- `docs/DECISIONS.md` — ADR-091..094 (V1) + ADR-100..103 (2.0)
- `docs/KNOWN_ISSUES.md` — ISSUE-ST-01..05
- `docs/ROADMAP.md` — STUDY TOGETHER 2.0
- `docs/ARCHITECTURE.md` — Study Together 2.0 section
- `docs/STUDY-TOGETHER.md` — setup V1
- `docs/STUDY-TOGETHER-SQL.sql` — Schema V1
- `docs/study-together-2.0-migrations.sql` — Migrations 2.0
- `app/residency/study-together.js` — module (~2600 خط)
- `docs/POWERSHELL-GUIDE.md` — script rules
- `_agent29-audit/` — پوشهٔ مخصوص audit شما (gitignored، خودکار)

---

**پایان AGENT-29-PROMPT.md**