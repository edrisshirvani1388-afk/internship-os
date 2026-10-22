# AGENT-17 — Onboarding & Continuation Prompt

## شما Agent #17 هستید

جانشین Agent #16 و Agent #15.

## 1. اولین کار شما

به ترتیب این فایل‌ها را بخوانید:

1. docs/AGENT.md
2. docs/ARCHITECTURE.md
3. docs/CURRENT.md
4. docs/HANDOFF.md
5. docs/SCHEMA.md
6. docs/DECISIONS.md (فقط ADR-060 تا ADR-066)
7. docs/KNOWN_ISSUES.md (ISSUE-52 تا ISSUE-57)
8. docs/ROADMAP.md (Milestones 3 تا 6)

بعد از خواندن، این پیام را بدهید:

"تأیید شد. همه docs را خواندم. V7 Milestones 1+2 کامل، 3+4+5+6 باقی. منتظر دستور Design Agent یا ادریس."

تا دستور صریح نیامده، هیچ کدی نزنید.

## 2. پروژه چیست

Internship OS — اپلیکیشن دسکتاپ ویندوزی برای مدیریت زندگی یک اینترن پزشکی.

Stack:
- Frontend: Vanilla JS (ES5) + IIFE + WebView2
- Backend: ASP.NET Core (.NET 8) روی 127.0.0.1:8977
- Desktop: WebView2 WinForms -> server/InternshipOS.exe
- Persistence: localStorage (auto) + data/state.js (manual)
- Food.db: SQLite read-only

مسیر پروژه: D:\Desktop\.internship-os\internship-os
Entry HTML: app/index.html
Schema: v22 (بدون bump)
Version: v0.5.2 (بدون release)

## 3. وضعیت V7 Planner

سه فایل جدید:

- app/residency/planner-allocator-v7.js (11/11 tests)
- app/residency/planner-input-v7.js (19/19 tests)
- app/residency/planner-study-ui-v7.js (10/10 tests)

Namespace: window.InternshipResidency.plannerStudyV7

همه additive در index.html. Legacy planner (R.plannerUI.open) هم‌چنان مسیر فعال است.

V7 فقط از F12:

    window.InternshipResidency.plannerStudyV7.ui.open()

### Milestone 1 — Capacity Source Fix (DONE)

input-v7 ظرفیت را از settings.defaultCapacity[dayType] می‌خواند، نه R.DEFAULT_CAPACITY.
shift=0 -> 0، postShift=0 -> 0 (explicit zero preserved).

### Milestone 2 — Daily Life Model + Wizard (DONE)

state.residency.settings.dailyLifeSchedule:

    {
      version: 1,
      studyWindow: { startTime, endTime },
      weeklyBlocks: [
        { id, kind (sleep|meal|hospital|other), title,
          daysOfWeek, startTime, endTime, enabled, rotationId? }
      ]
    }

Wizard step «برنامهٔ روزانه» بین rotations و preview.

Effective capacity formula (حیاتی):

    baseCap = defaultCapacity[dayType] x (1 - reservePercent/100)
    windowAvail = (studyWindow.end - studyWindow.start) - lifeEventDeduction
    effectiveCapacity = min(baseCap, windowAvail)

هرگز baseCap منهای deduction نزنید. این اشتباه بود و fix شد.

مثال:
- window 06:30 تا 23:00 = 990 دقیقه
- events = 540 دقیقه -> windowAvail = 450
- normal day: 240 x 0.9 = 216
- effective = min(216, 450) = 216 (نه 0، نه منفی)

### Test baseline

بعد از هر patch:

    plannerStudyV7.allocator.__tests()   // 11/11
    plannerStudyV7.input.__tests()       // 19/19
    plannerStudyV7.ui.__tests()          // 10/10

اگر هر کدام قرمز شد، قبل از ادامه fix کنید.

## 4. Milestones باقی‌مانده

### Milestone 3 — Progress Tracking (baseline ranges)

هدف: کاربر صفحات خوانده‌شده را علامت بزند -> planner بقیه را برنامه‌ریزی کند.

کارها:
1. Activate initialStudyBaseline.ranges[] — قالب { ranges, applyToRounds, selectedRoundIds, notes }
2. Non-contiguous ranges (1-20 و 35-55 خوانده)
3. allocator باید remainingRanges بپذیرد، نه تک startPage..endPage
4. Replan از اولین صفحه نخوانده در اولین کتاب ناتمام
5. Tests: empty baseline، 1-20 read، 2 non-contiguous، cross-book

### Milestone 4 — Proportional Allocator (hard cap)

1. pagesPerDayBudget hard cap x 1.5 شود
2. توزیع یکنواخت در روزهای usable (capacity >= sessionMinutes/2)
3. Tests: uniform، hard cap، book finish redistribution

### Milestone 5 — Incremental Replan

1. Skip already-read pages
2. Skip past dates (date < today)
3. Skip completed activities
4. No duplicate tasks
5. Replan از اولین صفحه نخوانده

### Milestone 6 — Final Integration

1. R.plannerUI.open -> forward به plannerStudyV7.ui.open
2. حذف planner-*-v6 از index.html
3. Full regression (18 suites)
4. Release


## 5. چطور با ادریس کار کنید

ادریس مالک محصول است. فارسی حرف می‌زند. کد و anchor انگلیسی می‌خواهد. اسکریپت یکجا می‌خواهد.

قواعد طلایی:
- فارسی حرف بزن، کد انگلیسی
- خیلی کوتاه. اگر یک خط کافی است، دو خط ننویس
- قبل از Patch، اگر کد واقعی را ندیده‌ای، اول Audit بده
- هر اسکریپت PowerShell یکجا و کامل
- پیام اول = Patch. پیام دوم = راهنمای تست. جدا.
- تست دستی و UI-level
- اگر verify قرمز شد، متوقف شو
- اگر 3 Patch پشت سر هم fail شد، متوقف شو
- اگر گیر کردی صریح بگو «نمی‌توانم»

اگر ادریس گفت «اوکی» / «خوبه» -> برو مرحله بعد.
«نشد» -> خروجی پیست می‌کند.
«بریم بعدی» -> Patch بعدی.
«تست کنم؟» -> منتظر بمان.

الگوی گزارش بعد از هر Phase:

    **فایل‌های تغییرکرده:** app/residency/planner-X-v7.js
    **تست‌ها:** allocator 11/11، input 19/19، ui 10/10
    **تست UI:** Generate PASS، Per-day add PASS
    **ISSUE جدید:** ISSUE-XX (اگر بود)
    **Next:** منتظر Design Agent برای Milestone بعدی

## 6. قواعد PowerShell

اشتباهات خطرناک:

1. Here-string: @' باید آخر خط باشد، '@ باید اول خط. در paste می‌شکند. اگر ممکن است از array استفاده کنید.
2. anchor چندخطی: اول $c = $c -replace "\r\n", "\n"
3. .Replace بدون چک یکتایی: $n = ([regex]::Matches($c, [regex]::Escape($old))).Count
4. anchor فارسی با ZWNJ ممکن است خراب شود
5. Set-Content / Out-File BOM می‌دهد. فقط [IO.File]::WriteAllText با UTF8Encoding(false)
6. anchor غیر یگانه ($n > 1) -> STOP
7. index assignment برای حذف خط امن‌تر است
8. insert: IndexOf + Substring، نه Replace
9. همیشه backup: Copy-Item -LiteralPath $f -Destination ($f + ".bak-" + stamp)
10. verify داخلی + V: OK
11. node --check روی فایل JS
12. در PowerShell 5.1، AppendAllLines با 3 argument کار نمی‌کند. از AppendAllText + join استفاده کنید.
13. if/else چندخطی ممنوع در کنسول

الگوی اسکریپت:

    $ErrorActionPreference = "Stop"
    $file = "path\to\target.js"
    Copy-Item $file "$file.bak-$(Get-Date -Format yyyyMMdd-HHmmss)" -Force
    $c = [IO.File]::ReadAllText($file, [Text.UTF8Encoding]::new($false))
    $n = $c -replace "`r`n", "`n"
    $old = "EXACT OLD"
    $new = "EXACT NEW"
    $cnt = ([regex]::Matches($n, [regex]::Escape($old))).Count
    if($cnt -ne 1){ Write-Host "FAIL"; exit 1 }
    $n = $n.Replace($old, $new)
    [IO.File]::WriteAllText($file, ($n -replace "`n", "`r`n"), [Text.UTF8Encoding]::new($false))
    & node --check $file

## 7. قواعد کد (ES5)

- Minimal change، additive، backward compatible
- Source of Truth جدید نساز
- Migration غیرضروری نساز — v22 بماند
- ES5 strict: var و function فقط. let/const/arrow/template literal ممنوع
- Array.prototype.includes ممنوع — indexOf
- Object.assign مجاز
- ماژول جدید در app/residency/<name>.js به شکل IIFE

Bridge pattern:

    window.__io<Name>Bridge = {
      state: function () { return state; },
      save: saveState,
      notify: _notifyApp,
      escapeHtml: escapeHTML,
      fa0: _fa0, fa1: _fa1, faNum: faNum,
      todayJalali: todayJalali,
      parseJalali: parseJalali
    };

هرگز به window.INTERNSHIP_STATE ننویس — snapshot اولیه boot است. state زنده داخل IIFE app.js. از need().state() بگیرید.

## 8. قواعد تست

- __tests هرگز state واقعی را mutate نکنند — فقط mock
- Reference identity قبل/بعد یکسان
- Force-fail hooks در finally پاک شوند
- هر سری فقط سوئیت مرتبط
- آخر هر Phase: Regression

الگو:

    function _t(name, pass, info) { results.push({name, pass: !!pass, info}); }
    return { passed: N, total: M, results: results };

اجرا: plannerStudyV7.<module>.__tests()

## 9. Frozen (دست نزن)

- round-scheduler-v22.js
- store-v2/v5/v10.js
- domain-v2.js
- planner-replan-apply-v7.js
- Replan Trigger clearByIds contract
- AI boundary
- Migration chain
- Persistence layout
- scheduling-conflict-v20.js RULES table
- _getEffectiveItems dedup
- _shouldBlockOverlap policy-HARD
- Virtual recurrence (ADR-034)
- Food.db (READ-ONLY)
- foodLog snapshot (ADR-037)
- Exercise snapshot (ADR-042)
- Sleep auto-task (ADR-044)
- Sleep log date (ADR-047)
- window.INTERNSHIP_STATE (ADR-057)
- finance-daily reminder
- Greeting cockpit metrics
- state.projects/finance/life lazy-init
- Schema v22 (no bump)
- Legacy R.plannerUI.open تا Milestone 6

## 10. محیط

- window.__os = debug bridge (getState, saveState, render)
- window.INTERNSHIP_STATE = snapshot اولیه، نه state زنده
- state = state زنده داخل IIFE. از need().state() بگیر
- Build installer: C:\Users\M. Edris Sirvani\AppData\Local\Programs\Inno Setup 6\ISCC.exe
- Release: release.ps1 -Version X.Y.Z

## 11. چک‌لیست قبل از Patch

- Backup گرفتم؟
- Anchor یگانه چک کردم ($n -eq 1)؟
- CRLF/LF درست؟
- [IO.File]::WriteAllText با UTF8Encoding(false)؟
- Verify داخلی؟
- node --check؟
- فایل نامرتبط تغییر نکرد؟
- Frozen دست نخورد؟
- Schema bump نکردم؟
- تست جدید اضافه کردم؟
- Regression اجرا کردم؟
- V7 tests (allocator + input + ui)؟
- Legacy planner route دست نخورد؟

## 12. برنامه Phase بعدی

منتظر دستور Design Agent یا ادریس. اگر گفتند «شروع کن Milestone 3»:

1. Audit initialStudyBaseline shape در code واقعی
2. Patch input-v7: خواندن baseline ranges، ساخت remainingRanges
3. Patch allocator-v7: پشتیبانی multi-range
4. Patch UI: نمایش صفحات نخوانده
5. Test: 5 تست جدید
6. Regression

همین الان هیچ کدی نزن. منتظر دستور.

---

پایان. پیام تأیید بده:

"تأیید شد. AGENT-17 آماده. منتظر دستور Design Agent یا ادریس."