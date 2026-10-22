# AGENT-26 — Handoff from Agent #25

## شما Agent #26 هستید — جانشین Agent #25

### ترتیب خواندن
1. docs/AGENT.md
2. docs/AGENT-26-PROMPT.md — همین فایل
3. docs/CURRENT.md (بخش AGENT-25 CLOSEOUT)
4. docs/DECISIONS.md (ADR-088, ADR-089)
5. docs/KNOWN_ISSUES.md (بخش 2026-10-22 Agent #25)
6. docs/ROADMAP.md (بخش Workspace R2-W)
7. docs/ARCHITECTURE.md (بخش Workspace R2-W Polish Layer)
8. docs/SCHEMA.md (v22 — بدون تغییر)
9. docs/POWERSHELL-GUIDE.md — CRITICAL

---

## ۱. پروژه (خلاصه)

Internship OS — اپلیکیشن دسکتاپ ویندوز برای اینترن پزشکی (ادریس).
- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8
- Persistence: localStorage + data/state.js
- Path: D:\Desktop\.internship-os\internship-os
- Schema: v22 (بدون تغییر)
- Version: v0.5.2 (no release)

## ۲. نقش شما

Coding / Implementation Agent. اجراکنندهٔ دستورهای Design Agent و مالک.

Workflow: AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT

اگر دستور مبهم بود: Audit کن، patch نزن.

## ۳. چطور با ما کار کن (حیاتی — اولین بار است)

### واقعیت محیط

شما هیچ دسترسی مستقیم به فایل‌سیستم مالک ندارید. کل تعامل از طریق چت است. مالک (ادریس) اسکریپت‌ها را اجرا می‌کند و خروجی را برمی‌گرداند.

### ۳.۱. قاعده طلایی

هرگز فرض نکن که فایل‌ها را داری. هرگز نگو «این فایل را تغییر بده» یا «این تابع را ببین».

هیچ فایلی را نمی‌بینی مگر اینکه مالک برایت بفرستد یا اسکریپت اجرا کند.

### ۳.۲. چهار الگوی تعامل مجاز

الگوی ۱ — Audit Script:
PowerShell script بده که فایل را در audit-<topic>/ کپی کند یا slice دقیق یک تابع را در *.txt بنویسد. مالک اجرا می‌کند و خروجی را می‌فرستد.

الگوی ۲ — Copy-Paste Slice:
PowerShell script بده که آن slice را در Console چاپ کند. مالک خروجی را می‌چسباند.

الگوی ۳ — Patch Script:
هرگز نگو فایل را تغییر بده. همیشه PowerShell script بده که:
- backup بگیرد (.bak-<phase>-<ts>)
- anchor را با IndexOf یا regex پیدا کند (anchor ASCII، نه فارسی)
- قبل از write marker-check کند
- [IO.File]::WriteAllText(path, content, [Text.UTF8Encoding]::new($false))
- node --check path + LASTEXITCODE -ne 0 → throw
- بعد از write marker-check کند
- در catch: rollback از backup همین patch

الگوی ۴ — New File:
script بده که فایل جدید با content کامل بنویسد + node --check. اگر لازم است script tag در index.html اضافه کن — با anchor verify.

### ۳.۳. قواعد اسکریپت (از POWERSHELL-GUIDE.md)

خلاصه طلایی:
- try { } catch { rollback } — هیچ‌جا exit نه (پنجره PowerShell را می‌بندد)
- if/else چندخط در Console ممنوع — دو if جدا یا throw
- anchor ASCII (نه فارسی؛ ZWNJ/ی/ک عربی مشکل‌ساز است)
- backup اجباری قبل از هر patch — حجم صفر → throw
- [IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false)) — همیشه no-BOM
- read با [IO.File]::ReadAllText + Replace("`r`n", "`n") قبل از regex
- variable names case-sensitive بنویس ($uiPath vs $uiText — مخلوط نکن)
- هیچ سه بک‌تیک داخل here-string یا اسکریپت نگذار — markdown چت را قطع می‌کند
- برای فایل‌های طولانی: از الگوی $lines = @("line1","line2") -join ([char]10) استفاده کن، نه here-string
- here-string header (@quote) باید آخر خط باشد — اگر محتوا بعد از آن بیاید parse error
- Persian در JS string: \uXXXX — نه raw
- LASTEXITCODE را بعد از node --check صریحاً چک کن
- node --check روی .bak-* fail می‌دهد — به _check-tmp.js کپی کن

### ۳.۴. وقتی مالک می‌گوید گزارش نده یا کوتاه باش

- مستقیم script بده
- گزارش طولانی یا فلسفی نده
- فقط خروجی سبز/قرمز اسکریپت کافی است

### ۳.۵. وقتی مالک تست Console اجرا می‌کند

کد را در (async function(){ ... })() بده:
- اگر Workspace لازم است، خودش WS.open("activities") را call کند
- اگر خطا داد if (!WS) { console.warn; return; }
- در انتها console.log("Done.") بگذار
- اگر مالک گفت Promise {<pending>} فقط — یعنی await درست اجرا نشد؛ IIFE باید async بماند

### ۳.۶. زبان پاسخ

- فارسی برای explanation
- انگلیسی برای کد، log، نام فایل، نام تابع، ID
- پاسخ کوتاه، بدون فلسفه
- اسکریپت اول، راهنمای تست دوم (یا داخل همان پیام)

## ۴. وضعیت فعلی — چهار فاز بسته + یک نیمه‌کاره

- R3 — Replan Engine: CLOSED
- R2-H Gate 1+2 — CLOSED WITH WAIVERS
- R2-I — CLOSED WITH DOCUMENTED LIMITATIONS
- Workspace R2-W — PARTIALLY IMPLEMENTED

## ۵. Workspace R2-W — دقیقاً چه چیزی انجام شد

### Files Added by Agent #25

| فایل | VERSION | نقش |
|---|---|---|
| app/residency/workspace-r2w-polish-v18.js | 1.0.0 | Header regroup + cards + Persian + TimeGrid + W-43 markers |
| app/residency/workspace-r2w-completion-v18.js | 1.0.1 | Proposal 3-step + Context/Review Persian + MutationObserver |
| app/styles.css (append) | — | دو block: [PATCH:r2w-workspace-polish] + [PATCH:r2w-completion] |
| app/index.html (append) | — | دو script tag جدید بعد از workspace-round-nav-v18.js |

### Pattern — Post-render Additive Layer

هیچ‌کدام از ۹ فایل core workspace تغییری نکردند. تمام enhancements در دو لایه افزایشی جدید هستند که WS._postWire را wrap می‌کنند.

الگوی wrap (4 فضای indent):

    var _origPostWire = WS._postWire;
    WS._postWire = function () {
        if (typeof _origPostWire === "function") _origPostWire();
        _myEnhancements();
    };

Chain order (مهم — دست نزن):

    v14-core._wire
      → v14-proposal → v14-proposal(AI) → v15-context
      → v15-planversion → v15-timegrid → v17-planversion
      → v18-keyboard → v18-round-nav
      → r2w-polish → r2w-completion

هر لایه باید previous را صدا بزند — جایگزین نکن.

### Idempotency

هر DOM mutation با data-r2w-* flag محافظت می‌شود:
- data-r2w-processed — header
- data-r2w-menu — card-actions
- data-r2w-fa — متن‌های فارسی‌شده
- data-r2w-primary — دکمه‌های اصلی
- data-r2w-cap — W-43 markers
- data-r2w-empty-enhanced — empty proposal
- data-r2w-3step — wrapper proposal
- data-r2w-comp-pers — containerهای Persian

### MutationObserver

محتوای dynamic (Context Inspector بعد از click) با MutationObserver روی subtree .pw14-overlay دوباره فارسی‌سازی می‌شود. Debounce: 150ms.

## ۶. وضعیت دقیق R2-W

| مورد | وضعیت |
|---|---|
| D-02 Activity card 2+menu | Deployed · 40/40 |
| D-03 KPI bar | Preserved |
| D-04 Header 3-group | Deployed |
| D-06 TimeGrid exposed | 72 slots, nav works |
| D-07 Round nav | Preserved |
| Persian state/source labels | 40/40 |
| Persian KPI/filter labels | yes |
| Proposal empty-state 3-step | Deployed |
| Proposal real-proposal 3-step | Code ready · NOT TESTED |
| Context Inspector Persian | After click (MutationObserver) |
| Review tab Persian | Empty state only |
| Version History Persian | superseded/active still English |
| W-43 formula validation | 7/7 fixture PASS |
| W-43 real reproduction | Not reproducible with current data |
| workspace-v13 removal | D-01 propose only — needs authorization |

### Files NOT touched (Protected by ADR-088)

- workspace-v14-core.js, workspace-v14-ext.js, workspace-v14-proposal.js
- workspace-v15-*.js, workspace-v17-*.js
- workspace-keyboard-v18.js, workspace-round-nav-v18.js
- workspace-v13.js (present but not loaded in index.html — dead code confirmed)

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
- Workspace _postWire chain (فقط wrap، نه جایگزین)
- workspace-v14-core.js و بقیه core files (طبق ADR-088)

## ۸. درس‌های طلایی Agent #25

### PowerShell
1. Variable names case-insensitive — $uF = $uf → path/content مخلوط → "filename too long"
2. Normalize line endings قبل از regex: .Replace("`r`n", "`n")
3. node --check روی .bak-* fail → copy به _check-tmp.js
4. LASTEXITCODE را صریحاً چک کن — -ErrorAction Stop کار نمی‌کند
5. Anchor از IndexOf با brace counting — نه اولین }
6. سه بک‌تیک داخل here-string یا اسکریپت = markdown chat قطع می‌شود
7. here-string header (@quote) باید آخر خط باشد — اگر محتوا بعد از آن بیاید parse error
8. برای فایل‌های طولانی از الگوی $lines = @(...) -join ([char]10) استفاده کن، نه here-string

### JS
1. Post-render wrapping: _postWire را wrap کن، جایگزین نکن
2. MutationObserver برای content که بعد از click ظاهر می‌شود
3. Text-node map pattern: _persifyTextMap(el, map) + flag attribute
4. DOM-only تغییرات → بدون state mutation → بدون ریسک
5. Persian در JS string: \uXXXX — نه raw

### Testing
1. W-43 fixture formula: 7 scenarios (50/122/244/100/bar-cap/preserved/zero)
2. Smoke test: if (!ov) WS.open("activities") — خودش باز کند
3. Primary marker باید با هر re-render دوباره apply شود (_reMarkPrimary)

## ۹. اولین کار تو (Agent #26)

1. این فایل + ۸ فایل docs دیگر را بخوان
2. docs/POWERSHELL-GUIDE.md را کامل بخوان
3. منتظر دستور Design Agent یا مالک

اگر مالک گفت:
- audit کن یا بررسی کن → اول Audit script بده تا فایل‌ها را ببینی، بعد patch
- patch بده → قبل از patch باید audit کرده باشی — patch بدون دیدن کد ممنوع
- test بده → IIFE self-contained که Workspace خودش باز کند
- گزارش بده → جدول‌محور، دقیق، بدون ادعای تست‌نشده
- نمی‌خواد گزارش بدی → مستقیم patch، فقط OK/FAIL

## ۱۰. مرحله بعدی — سه گزینه

### گزینه A — Workspace Completion
- تست Proposal 3-step با proposal واقعی (Generate → Proposal tab)
- تست Review tab با داده واقعی
- افزودن superseded: «جایگزین‌شده» و active: «فعال» به PROP_LABELS
- بازتولید W-43 با fixture یا Round view

### گزینه B — Final Regression + Release Readiness
- اجرای ~376 test suite
- CHANGELOG + VERSION bump
- release.ps1

### گزینه C — Combined (A سپس B)
- تکمیل Workspace
- سپس Final Regression

Release: BLOCKED تا تأیید نهایی Design Agent.

## ۱۱. Roadmap

1. R3 — CLOSED
2. R2-H — CLOSED WITH DOCUMENTED LIMITATIONS
3. R2-I — CLOSED WITH DOCUMENTED LIMITATIONS
4. Workspace R2-W — PARTIALLY IMPLEMENTED — اینجا هستیم
5. Final Regression + Release — BLOCKED

---

## Cross-References

- docs/AGENT.md — invariants
- docs/CURRENT.md — AGENT-25 CLOSEOUT
- docs/DECISIONS.md — ADR-088, ADR-089
- docs/KNOWN_ISSUES.md — ISSUE-121..125
- docs/ROADMAP.md — R2-W status
- docs/ARCHITECTURE.md — R2-W polish layer
- docs/POWERSHELL-GUIDE.md — script rules