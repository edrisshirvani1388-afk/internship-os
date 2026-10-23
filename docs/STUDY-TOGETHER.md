# STUDY-TOGETHER.md — راه‌اندازی هم‌مطالعه V1

## پیش‌نیازها
- حساب Supabase رایگان (supabase.com)
- Internship OS v0.6.0+ روی ویندوز
- دسترسی به Dashboard Supabase

## ۱. ساخت پروژهٔ Supabase
1. supabase.com → Sign in → New Project
2. Project name: `internship-os-study-together`
3. Database password: قوی (ذخیره کن)
4. Region: نزدیک‌ترین (Frankfurt / Bahrain)
5. Plan: Free
6. حدود ۲ دقیقه صبر کن

## ۲. اجرای SQL
1. Dashboard → SQL Editor → New Query
2. محتوای `docs/STUDY-TOGETHER-SQL.sql` را paste کن
3. Run
4. خطاهای بی‌خطر: `already exists`

## ۳. تنظیمات Auth
Dashboard → Authentication → Providers → Email:
- Enable: ON
- Confirm email: OFF  (پایلوت — بدون SMTP)
- Secure email change: OFF
- Minimum password length: 8

**محدودیت ایمیل:**
- SMTP پیش‌فرض Supabase برای تحویل عمومی مناسب نیست
- با Confirm email = OFF، ثبت‌نام بدون تأیید ایمیل انجام می‌شود
- بازیابی رمز از طریق ایمیل **کار نمی‌کند**
- اگر رمز فراموش شد: Dashboard → Authentication → Users → Reset

## ۴. Realtime
Dashboard → Project Settings → Realtime:
- **Public access: OFF** (الزامی)
- Postgres Changes: خاموش بماند (فقط Presence)

## ۵. تست امنیت SQL (توصیه‌شده)
در SQL Editor این queryها را اجرا کن:

```sql
-- RLS روی چهار جدول باید true باشد
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
  and tablename in ('profiles','study_groups','study_group_members','study_sessions');

-- لیست policyها
select tablename, policyname, cmd from pg_policies
where schemaname = 'public' order by tablename, policyname;

-- helper functions با prosecdef=true
select proname, prosecdef, proconfig from pg_proc
where pronamespace = (select oid from pg_namespace where nspname = 'private');
```

## ۶. گرفتن URL و Key
Dashboard → Settings → API:
- Project URL: `https://xxxxxxxx.supabase.co`
- Publishable key: `sb_publishable_...` (یا anon قدیمی)

**هرگز `service_role` در Client نگذار.**

## ۷. ساخت فایل تنظیمات
مسیر: `D:\Desktop\.internship-os\internship-os\data\study-together.js`

```js
window.STUDY_TOGETHER_CONFIG = {
  url: "https://xxxxxxxx.supabase.co",
  publishableKey: "sb_publishable_...",
  sdkVersion: "2.118.0"
};
```

- این فایل در `.gitignore` است (folder `data/`)
- اگر فایل نباشد: پیام «اتصال آنلاین تنظیم نشده»

## ۸. تست دو حساب
1. مرورگر معمولی → حساب A: signup → username `alice`، display `آلیس`
2. Incognito → حساب B: signup → username `bob`، display `باب`
3. A: create group name="تست" → invite code مثلاً `abc123xyz789`
4. B: join with `abc123xyz789`
5. هر دو یکدیگر را ببینند
6. A: start study → B ظرف ۲ ثانیه studying ببیند
7. A: break → B break ببیند + today total A حفظ شود
8. A: resume → study
9. A: end → B idle ببیند
10. **today total A در B باید شامل هر دو بازه باشد، نه فقط دومی**

## ۹. تست غیرعضو
حساب C بدون join در Console:
```js
const { data } = await supabase.from('study_groups').select('*');
// data === []
```

## ۱۰. تست WebView2
1. InternshipOS.exe را باز کن
2. F12 → Console
3. «اتصال آنلاین تنظیم نشده» → config را چک کن
4. SDK error → اینترنت / firewall / CDN blocked
5. «اتصال برقرار شد» → live

## ۱۱. Rollback
- `data/study-together.js` را حذف کن
- ماژول به «not configured» برمی‌گردد
- **state اصلی Internship OS دست‌نخورده می‌ماند**
- برای حذف کامل: DROP جداول به ترتیب `study_sessions` → `study_group_members` → `study_groups` → `profiles`

## ۱۲. محدودیت‌های V1 (مستند)
- Supabase Free پس از ۱ هفته بی‌فعالیتی pause می‌شود — با اولین login باز می‌شود
- uptime SLA ندارد
- ایمیل بازیابی غیرفعال
- ایمیل تأییدنشده (هر email کار می‌کند)
- حداکثر ۵۰۰ مگابایت DB، ۲ گیگابایت egress
- فقط یک گروه فعال برای هر حساب (V1)
- بدون چت / feed / search
- ۵۰k MAU روی free
