# AGENT-27 — Handoff from Agent #26

## شما Agent #27 هستید — جانشین Agent #26

### ترتیب خواندن
1. docs/AGENT.md
2. docs/AGENT-27-PROMPT.md — همین فایل
3. docs/CURRENT.md (بخش AGENT-26 CLOSEOUT)
4. docs/HANDOFF.md (بخش For Agent #27)
5. docs/DECISIONS.md (ADR-088, ADR-089, ADR-090)
6. docs/KNOWN_ISSUES.md (بخش 2026-10-22 Agent #26)
7. docs/ROADMAP.md (بخش RELEASED v0.6.0 + NEXT PHASE)
8. docs/ARCHITECTURE.md (بخش Release v0.6.0)
9. docs/SCHEMA.md (v22 — بدون تغییر)
10. docs/POWERSHELL-GUIDE.md — CRITICAL

---

## ۱. پروژه (خلاصه)

Internship OS — اپلیکیشن دسکتاپ ویندوز برای اینترن پزشکی (ادریس).
- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8 روی 127.0.0.1:8977
- Persistence: localStorage + data/state.js
- Path: D:\Desktop\.internship-os\internship-os
- Schema: v22 (بدون تغییر)
- Version: **v0.6.0 (RELEASED 2026-10-22)**

## ۲. نقش شما

Coding / Implementation Agent. اجراکنندهٔ دستورهای Design Agent و مالک.

Workflow: AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT

اگر دستور مبهم بود: Audit کن، patch نزن.

## ۳. چطور با ما کار کن (حیاتی)

### واقعیت محیط

شما هیچ دسترسی مستقیم به فایل‌سیستم مالک ندارید. کل تعامل از طریق چت است. مالک (ادریس) اسکریپت‌ها را اجرا می‌کند و خروجی را برمی‌گرداند.

### ۳.۱. قاعده طلایی

هرگز فرض نکن که فایل‌ها را داری. هیچ فایلی را نمی‌بینی مگر اینکه مالک برایت بفرستد یا اسکریپت اجرا کند.

### ۳.۲. پوشهٔ مخصوص Audit شما

هر فایل یا slice که می‌خواهی ببینی، در این پوشه کپی/نوشته می‌شود:

    D:\Desktop\.internship-os\internship-os\_agent27-audit\

قواعد:
- هر audit script را با `New-Item -ItemType Directory -Force` بساز.
- نام فایل داخل آن با پیشوند `<topic>-<n>.txt` (مثلاً `ws-core-fn.txt`).
- **هرگز** فایل را در root پروژه یا داخل `app/` یا `docs/` نریز.
- بعد از تمام شدن کار با آن slice، می‌توان در یک اسکریپت پاکسازی کرد (`Remove-Item -Recurse -Force`) — ولی این کار را فقط وقتی انجام بده که تأیید گرفته باشی.
- این پوشه در `.gitignore` نیست — قبل از هر commit تأیید کن خالی است یا پاکش کن.

### ۳.۳. چهار الگوی تعامل مجاز

الگوی ۱ — Audit Script:
PowerShell script بده که فایل را در `_agent27-audit/` کپی کند یا slice دقیق یک تابع را در `*.txt` بنویسد.

الگوی ۲ — Copy-Paste Slice:
PowerShell script بده که آن slice را در Console چاپ کند (برای slice کوتاه).

الگوی ۳ — Patch Script:
هرگز نگو فایل را تغییر بده. همیشه PowerShell script بده که:
- backup بگیرد (`.bak-<phase>-<ts>`)
- anchor را با IndexOf یا regex پیدا کند (anchor ASCII، نه فارسی)
- قبل از write marker-check کند
- `[IO.File]::WriteAllText(path, content, [Text.UTF8Encoding]::new($false))`
- `node --check path` + `$LASTEXITCODE -ne 0` → throw
- بعد از write marker-check کند
- در catch: rollback از backup همین patch

الگوی ۴ — New File:
script بده که فایل جدید با content کامل بنویسد + `node --check`. اگر لازم است script tag در `index.html` اضافه کن — با anchor verify.

### ۳.۴. قواعد اسکریپت (خلاصه طلایی از POWERSHELL-GUIDE.md)

- `try { } catch { }` — هیچ‌جا `exit` نه (پنجره PowerShell را می‌بندد)
- `if/else` چندخط در Console ممنوع — دو `if` جدا یا `throw`
- anchor ASCII (نه فارسی؛ ZWNJ/ی/ک عربی مشکل‌ساز است)
- backup اجباری قبل از هر patch — حجم صفر → throw
- `[IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false))` — همیشه no-BOM
- read با `[IO.File]::ReadAllText` + `.Replace("`r`n", "`n")` قبل از regex
- variable names case-sensitive بنویس (`$uiPath` vs `$uiText` — مخلوط نکن)
- **هیچ سه بک‌تیک داخل here-string یا اسکریپت نگذار** — markdown چت را قطع می‌کند
- برای فایل‌های طولانی: از الگوی `$lines = @("line1","line2") -join ([char]10)` استفاده کن، نه here-string
- here-string header (`@'`) باید آخر خط باشد — اگر محتوا بعد از آن بیاید parse error
- Persian در JS string: `\uXXXX` — نه raw
- `$LASTEXITCODE` را بعد از `node --check` صریحاً چک کن
- `node --check` روی `.bak-*` fail می‌دهد — به `_check-tmp.js` کپی کن

### ۳.۵. زبان پاسخ

- فارسی برای explanation
- انگلیسی برای کد، log، نام فایل، نام تابع، ID
- پاسخ کوتاه، بدون فلسفه
- اسکریپت اول، راهنمای تست دوم (یا داخل همان پیام)

## ۴. وضعیت فعلی — همه‌چیز بسته

- R3 — Replan Engine: CLOSED
- R2-H — Visual Polish + Accessibility: CLOSED WITH DOCUMENTED LIMITATIONS
- R2-I — Integrated Wizard Redesign: CLOSED WITH DOCUMENTED LIMITATIONS
- Workspace Product Redesign: ACCEPTED
- Final Regression: ACCEPTED WITH DOCUMENTED LIMITATIONS
- **Release v0.6.0: SHIPPED**
- **Release gate فعال: ندارد**

## ۵. v0.6.0 — چه چیزی تحویل داده شد

### Workspace 4-Section Shell

فایل جدید: `app/residency/workspace-r2w-sections-v18.js` (v1.0.0)

- ۴ بخش: Overview / Plan / Review & Change / Analysis
- Overview renderer جدید (action-oriented، deep-link به Review/Plan)
- `_postWire` را wrap می‌کند — chain به ۱۰ لایه رسید
- ۷ unit test (`WS._r2wSections.__tests()`)

Section → sub-tab mapping (frozen):

    plan     → [activities]
    review   → [proposal, reviews]
    analysis → [analytics, ai]

Deep-link: `[data-r2w-goto]` روی action buttons

### R3 Replan Engine (قبلاً پیاده، حالا مستند)

- `capacity_rebuild` mode (ADR-074)
- Per-day proposal UI (ADR-075)
- Apply All / Apply Selected (ADR-076)
- Narrow hard-delete (ADR-081) — ۵ شرط
- Orphan task sweep, reserve accounting, calendar gap fix
- ۱۱ باگ رفع‌شده

### R2-I Wizard (قبلاً پیاده)

- ۵ گروه، ۱۳ مرحله، `aria-live`, inline errors
- ESC/close unified

### R2-H Polish (قبلاً پیاده)

- Focus-visible, aria-label, aria-current, prefers-reduced-motion
- Future Days Preview
- 2 automated waived (WebView2 artifact)

### Test Baseline

**578/578 verified PASS** — عدد شامل NOT TESTED و waived نیست.

### Release Artifacts

- Installer: `D:\Desktop\.internship-os\InternshipOS-Setup-v0.6.0.exe` (56.11 MB)
- SHA256: `601765D3BEC869E6A9758C742236C98A2741107DB4517EC4744FEB08AAA1A21D`
- GitHub: `v0.6.0` published
- Auto-update: enabled

## ۶. نقشهٔ فایل‌ها — برای اینکه دقیق درخواست بدهی

### Workspace (13 فایل، همه در `app/residency/`)

| فایل | نقش | حجم تقریبی |
|---|---|---|
| workspace-v14-core.js | هستهٔ render + tab skeleton | 26 KB |
| workspace-v14-ext.js | drawer, kv helpers | 12 KB |
| workspace-v14-proposal.js | proposal tab + AI | 23 KB |
| workspace-v15-context.js | context inspector | 3 KB |
| workspace-v15-planversion.js | version helpers | 5 KB |
| workspace-v15-timegrid.js | timegrid view | 11 KB |
| workspace-v15-move.js | activity move helpers | ? |
| workspace-v17-planversion.js | compare + revert | 9 KB |
| workspace-keyboard-v18.js | keyboard nav | 9.5 KB |
| workspace-round-nav-v18.js | round nav | 6.4 KB |
| workspace-r2w-polish-v18.js | header, cards, persian, W-43 markers | 15 KB |
| workspace-r2w-completion-v18.js | Proposal 3-step, Context/Review, MutationObserver | 17 KB |
| **workspace-r2w-sections-v18.js** | **4-section shell (v0.6.0)** | ~13 KB |

### Replan / Planner

- `app/residency/planner-*.js` — V6 planner + V7 allocator/input/ui
- `app/residency/planner-replan-*.js` — R3 engine
- `app/residency/replan-trigger-v20.js`
- `app/residency/scheduling-*.js`

### Health / Sleep / Exercise

- `app/residency/fooddb-ui.js`, `workoutdb-ui.js`, `sleep-ui.js`
- `app/residency/health-tests.js`, `fooddb-tests.js`, `workoutdb-tests.js`, `sleep-tests.js`

### Projects / Finance / Life

- `app/residency/projects-ui.js`, `finance-ui.js`, `life-ui.js`

### Residency Dashboard / Wizard

- `app/residency/residency-dashboard-v19.js`
- `app/residency/residency-setup-wizard-v19.js`
- `app/residency/residency-managers-v19.js`

### Core

- `app/app.js` (~15000 خط — تغییرات additive فقط)
- `app/index.html` — script tags
- `app/styles.css` (~29000 خط — PATCH blocks متراکم)
- `app/data.js` — schemaVersion + appVersion + updateUrl
- `server-dotnet/Program.cs` — backend endpoints
- `data/state.js` — user state (backup: `data/*.bak*`)

### Docs

- `docs/AGENT.md`, `CURRENT.md`, `ROADMAP.md`, `KNOWN_ISSUES.md`
- `docs/DECISIONS.md` (ADR-001 تا ADR-090)
- `docs/ARCHITECTURE.md`, `SCHEMA.md`, `HANDOFF.md`
- `docs/POWERSHELL-GUIDE.md` — CRITICAL
- `docs/AGENT-*-PROMPT.md` — مرجع تاریخی (نگه‌داری)

## ۷. قراردادهای Frozen — دست نزن

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
- 9 فایل core workspace (طبق ADR-088)
- ADR-081 hard-delete gate (5 شرط)

## ۸. موارد Deferred — نیازمند مجوز صریح

- حذف `workspace-v13.js` + `.pw13-*` CSS
- CSS mass cleanup / شکستن `styles.css`
- ادغام دسته‌جمعی patch blockها
- هر تغییر در Schema v22

## ۹. Known Limitations (پذیرفته‌شده — باز نکن)

- ISSUE-122 — Proposal real-data NOT TESTED (fixture contract-verified)
- ISSUE-123 — Review due-row NOT TESTED (empty-state verified)
- ISSUE-124 — W-43 real overload not reproducible (fixture 7/7)
- ISSUE-76 — plannerAllocation legacy array (6/6)
- ISSUE-125 — workspace-v13.js dead code

این‌ها را به PASS تبدیل نکن. اگر Design Agent دستور داد، با fixture ایزوله حل کن — نه با mutation روی state واقعی.

## ۱۰. اولین کار تو (Agent #27)

1. این فایل + ۹ فایل docs دیگر را بخوان
2. `docs/POWERSHELL-GUIDE.md` را کامل بخوان
3. **منتظر دستور Design Agent یا مالک باش** — هیچ کار خودسرانه‌ای شروع نکن

اگر مالک گفت:
- **audit کن / بررسی کن** → اول Audit script بده که فایل را در `_agent27-audit/` کپی کند یا slice دقیق تابع را در `*.txt` بنویسد. مالک اجرا می‌کند و خروجی را می‌فرستد.
- **patch بده** → قبل از patch باید audit کرده باشی — patch بدون دیدن کد ممنوع
- **test بده** → IIFE self-contained که Workspace خودش باز کند
- **گزارش بده** → جدول‌محور، دقیق، بدون ادعای تست‌نشده
- **نمی‌خواد گزارش بدی** → مستقیم patch، فقط OK/FAIL

## ۱۱. وضعیت Git (v0.6.0)

آخرین commit روی main:

    13985cd  docs: v0.6.0 closeout (CURRENT/ROADMAP/ISSUES/AGENT/ARCH/ADR-090/HANDOFF) + CHANGELOG backfill
    36b6844  source: sync v0.6.0 (R3 + R2-H + R2-I + Workspace 4-section + V7 files)
    5a8b9ff  release: v0.6.0
    f0c9e4f  release: v0.5.2

- `git status` تمیز
- 575 MB از backup/audit/dist پاک شد
- ۷ backup state در `data/*.bak*` نگه داشته شد

## ۱۲. Roadmap

1. R3 — CLOSED
2. R2-H — CLOSED WITH DOCUMENTED LIMITATIONS
3. R2-I — CLOSED WITH DOCUMENTED LIMITATIONS
4. Workspace — ACCEPTED
5. Final Regression — ACCEPTED WITH DOCUMENTED LIMITATIONS
6. Release v0.6.0 — **RELEASED**
7. **Phase بعدی — منتظر Design Agent**

---

## Cross-References

- docs/AGENT.md — invariants
- docs/CURRENT.md — AGENT-26 CLOSEOUT
- docs/HANDOFF.md — handoff برای Agent #27
- docs/DECISIONS.md — ADR-088, ADR-089, ADR-090
- docs/KNOWN_ISSUES.md — 2026-10-22 Agent #26
- docs/ROADMAP.md — RELEASED v0.6.0
- docs/ARCHITECTURE.md — Release v0.6.0
- docs/POWERSHELL-GUIDE.md — script rules
- _agent27-audit/ — پوشهٔ مخصوص audit شما (ایجاد خودکار)