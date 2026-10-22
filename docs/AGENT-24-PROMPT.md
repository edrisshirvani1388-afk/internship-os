# AGENT-24 — Handoff from Agent #22 & #23

## شما Agent #24 هستید — جانشین Agent #22/23

### ترتیب خواندن
1. `docs/AGENT.md`
2. `docs/AGENT-24-PROMPT.md` ← این فایل (کامل بخوان)
3. `docs/CURRENT.md`
4. `docs/ARCHITECTURE.md` (بخش‌های V7 + Replan)
5. `docs/DECISIONS.md` (ADR-074 تا ADR-081)
6. `docs/KNOWN_ISSUES.md` (ISSUE-90 تا ISSUE-106)
7. `docs/ROADMAP.md` (بخش R3 تا Workspace)
8. `docs/SCHEMA.md` (v22 — بدون تغییر)
9. `docs/POWERSHELL-GUIDE.md` ← CRITICAL — `exit` kills window

---

## ۱. پروژه (خلاصه)
**Internship OS** — اپلیکیشن دسکتاپ ویندوز برای اینترن پزشکی (ادریس).
- Frontend: Vanilla JS ES5 + IIFE + WebView2
- Backend: ASP.NET Core .NET 8
- Persistence: localStorage + `data/state.js`
- Path: `D:\Desktop\.internship-os\internship-os`
- Schema: **v22 (بدون تغییر)**
- Version: **v0.5.2 (no release)**

## ۲. نقش شما
**Coding / Implementation Agent.** اجراکنندهٔ دستورهای Design Agent.
Workflow: `AUDIT → IMPACT → CONTRACT → IMPLEMENT → TEST → REGRESSION → REPORT`
اگر دستور مبهم بود → **Audit کن، patch نزن.**

---

## ۳. وضعیت فعلی — R3 بسته شد (CLOSED)
فاز R3 (بازسازی موتور Replan) با موفقیت کامل شد. تمام باگ‌های P0 و P1 رفع شدند.
- **T27** (باگ cross-round در dedup) رفع شد. کلید dedup از `bookId` به `(bookId::roundId)` تغییر کرد.
- **Hard-delete** برای فعالیت‌های آینده بدون پیشرفت (planned با actualPages=0) پیاده‌سازی و در ADR-081 مستند شد.
- **Regression:** تمام تست‌ها (376/376) پاس شدند (پس از ایزوله کردن input/ui در fixture).

### باگ‌های کلیدی که در R3 رفع شدند (برای اینکه دوباره سراغشان نروی):
- **B13 (مهم‌ترین):** `Object.keys(byDate).sort()` بدون comparator در `planner-schedule-v6-4.js` باعث می‌شد صفحات بهم ریخته تخصیص یابند. با `sort(_cmpDate)` رفع شد.
- **B6:** فیلتر `roundUsable.endDate` در `buildCapacityLedger` روزهای بعد از آخرین دوره را حذف می‌کرد. برداشته شد.
- **B3/B4:** الگوریتم تخصیص به Sequential + Proportional تغییر کرد تا برنامه از روز اول فشرده نشود و کتاب‌ها به ترتیب پیش بروند.

---

## ۴. مرحله بعدی — R2-H (Visual Polish, Accessibility & Responsive)
Design Agent دستور داده است که فاز R2-H شروع شود. در حال حاضر در مرحله **H1 (Audit)** هستیم.
**مجوز شما:** فقط Audit، طراحی و مستندسازی. **هیچ پچ UI نزن** تا Design Agent تأیید کند.

### یافته‌های اولیه Audit (بر اساس بازخورد ادریس و اسکرین‌شات‌ها):
1. **Today Empty State (P1):** وقتی برنامه فعال است ولی امروز فعالیتی ندارد، CTA به اشتباه می‌گوید «برنامه مطالعه بساز». باید هوشمندتر شود (مثلاً «برنامه‌ات تا [تاریخ] پر است»).
2. **Program Tools (P1):** دکمه‌های «برنامه‌ریزی مجدد»، «حالت پیشرفته» و «مدیریت برنامه» در پایین صفحه بسیار زشت و بدون استایل هستند. نیاز به کارت‌های زیبا با آیکون و هاور دارند.
3. **Manage Inputs (P2):** کادرهای عددی «ساعت‌های مطالعه» در تب تنظیمات، اعداد را وسط‌چین نشان می‌دهند (text-align: center). باید راست‌چین شوند.
4. **Planner V7 Entry (P1):** وقتی برنامه‌ای وجود ندارد، دکمه‌ای برای ورود مستقیم به V7 Planner در تب Program دیده نمی‌شود.
5. **Workspace (P2):** کل محیط Workspace پر از اصطلاحات انگلیسی نامفهوم، شلوغ و بدون یکپارچگی بصری با تب‌های جدید است.

### کارهایی که باید در H1 انجام دهی (اگر ادامه‌دهنده هستی):
- اگر ادریس فایل `styles.css` را داد، آن را تحلیل کن (تعداد بلوک‌ها، توکن‌ها، `!important` ها).
- سپس `H1.1 (جدول مشکلات)`، `H1.2 (ارزیابی Design System)` و `H1.3 (برنامه اجرا)` را به Design Agent ارائه بده.
- **ممنوعیت مطلق:** در این مرحله هیچ کد CSS یا JS تغییر نمی‌کند.

---

## ۵. چارچوب‌های قفل‌شده (Frozen) — دست نزن
- `round-scheduler-v22.js`
- `store-v2/v5/v10.js`
- `domain-v2/v3.js`
- `planner-replan-apply-v7.js` (قراردادهای Apply تغییر نکنند)
- `scheduling-conflict-v20.js` RULES
- `window.INTERNSHIP_STATE` (فقط خواندنی)
- **Schema v22** و قراردادهای Calendar/Timeline
- منطق تخصیص و ظرفیت (برای زیباسازی UI دستکاری نشوند)

---

## ۶. درس‌های طلایی PowerShell (از Agent #22)
1. **هرگز `exit` نزن.** از `throw` استفاده کن.
2. **بدون `else` چندخطی در کنسول.** از دو `if` جدا استفاده کن.
3. **هرگز triple-backtick داخل here-string نگذار.** از ۴ فاصله (indent) استفاده کن.
4. **برای جایگزینی توابع، از `Replace-BraceFn` (شمارش آکولاد) استفاده کن.** String replace در برابر HTML/Quotes شکست می‌خورد.
5. **همیشه anchor uniqueness را چک کن:** `if ($c -ne 1) { throw "anchor count=$c" }`
6. **متن‌های فارسی در جاوااسکریپت را به `\uXXXX` تبدیل کن** تا در PowerShell خراب نشوند.
7. **`[Text.UTF8Encoding]::new($false)`** برای نوشتن فایل.
8. **`-contains` روی رشته غلط است.** از `.Contains()` یا `-match` استفاده کن.
9. **`$LASTEXITCODE` را بعد از `node --check` چک کن.**
10. **اگر anchor پیدا نشد، حدس نزن.** اول Audit کن، context را ببین، بعد patch بزن.

---

## ۷. پیام تأیید نهایی (دقیقاً این را بفرست)
تأیید شد. Agent #24 آماده.
فایل‌های docs و پرامپت را خواندم.
وضعیت: R3 کاملاً بسته شد (CLOSED). باگ‌های T27، Hard-delete و ترتیب صفحات حل شدند. Regression 376/376.
مرحله فعلی: R2-H / H1 (Visual Audit) — منتظر دستور ادریس یا Design Agent برای ادامه Audit و طراحی.
بدون دستور صریح، هیچ کد UI تغییر نمی‌دهم. Schema v22 و Frozen ها حفظ می‌شوند.

**End of AGENT-24-PROMPT.**