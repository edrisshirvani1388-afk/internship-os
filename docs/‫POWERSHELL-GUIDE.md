# قواعد ساخت اسکریپت PowerShell — Internship OS

## ۱. اصول کلی

- کاربر (ادرید) اسکریپت رو **کپی-پیست** توی PowerShell می‌کنه
- **بدون هیچ ویرایش دستی** باید کار کنه
- اگه چند خط باشه، خط آخر باید بدون خطا تموم بشه
- زبان: PowerShell 5.1 (Windows default)
- مسیر پروژه: `D:\Desktop\.internship-os\internship-os`

---

## ۲. Pitfalls کشنده (باید یاد بگیری)

### ۲.۱ — `if/else` چندخط

**❌ ممنوع:**
```powershell
if ($x) {
    Write-Host "yes"
}
else {
    Write-Host "no"
}
✅ درست:

powershell
if ($x) { Write-Host "yes" } else { Write-Host "no" }
✅ یا بهتر (بدون else):

powershell
if ($x) { Write-Host "yes" -ForegroundColor Green }
if (-not $x) { Write-Host "no" -ForegroundColor Red }
۲.۲ — Here-string اشتباه
❌ ممنوع: @' با متن بعدش، یا '@ با فاصله قبلش

✅ درست:

powershell
$content = @'
متن
خط دوم
'@
@' آخر خط و بدون چیز بعدش

'@ ابتدا خط و بدون چیز قبلش

۲.۳ — Quote تودرتو در یک رشته
❌ ممنوع:

powershell
Write-Host "$($x.Contains('some"quote'))" -ForegroundColor $(if($x){'G'}else{'R'})
✅ درست:

powershell
$check1 = $x.Contains('something')
$check2 = $x.Contains('another')
if ($check1) { Write-Host "OK 1" -ForegroundColor Green }
if (-not $check1) { Write-Host "FAIL 1" -ForegroundColor Red }
if ($check2) { Write-Host "OK 2" -ForegroundColor Green }
قاعده طلایی: هر diagnostic رو یه خط مستقل بنویس. نه تودرتو.

۲.۴ — Anchorهای فارسی
❌ ممنوع: anchor با متن فارسی (ZWNJ، نیم‌فاصله، ی، ک عربی)

✅ درست: anchor کوتاه ASCII

مثال:

powershell
# ❌ این پیدا نمی‌شه
$old = '<button title="همه‌ی دوره‌ها رو مرتب می‌کنه">🧹 بازچینی</button>'

# ✅ این پیدا می‌شه
$old = 'data-r19-redistribute-all>'
۲.۵ — UTF-8 بدون BOM
همیشه از این استفاده کن:

powershell
[IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))
نه Set-Content، نه Out-File.

۲.۶ — نبودن else روی خط }
اگه واقعاً نیاز به else داری (کم پیش میاد):

powershell
if ($x) { Write-Host "yes" }
if (-not $x) { Write-Host "no" }
۳. الگوی هر Patch
powershell
$ErrorActionPreference = "Stop"
$root = "D:\Desktop\.internship-os\internship-os"
$ts = Get-Date -Format 'yyyyMMdd-HHmmss'
$path = Join-Path $root "app\residency\some-file.js"

# ۱) Backup اجباری
Copy-Item $path "$path.bak-<phase>-$ts" -Force
Write-Host "Backup: $path.bak-<phase>-$ts" -ForegroundColor Green

# ۲) خواندن
$content = Get-Content $path -Raw -Encoding UTF8

# ۳) پیدا کردن anchor (اول با یه خط چک کن)
if (-not $content.Contains('anchor-string')) {
    Write-Host "ANCHOR NOT FOUND" -ForegroundColor Red
    exit
}

# ۴) Replace یا insert
$content = $content.Replace('old', 'new')

# ۵) نوشتن
[IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))

# ۶) Diagnostics — هر خط جدا
$check1 = $content.Contains('new-marker')
$check2 = $content.Contains('another-marker')

if ($check1) { Write-Host "marker1: OK" -ForegroundColor Green }
if (-not $check1) { Write-Host "marker1: FAIL" -ForegroundColor Red }
if ($check2) { Write-Host "marker2: OK" -ForegroundColor Green }
if (-not $check2) { Write-Host "marker2: FAIL" -ForegroundColor Red }

Write-Host "Patch complete" -ForegroundColor Green
۴. Cache Clear — کاربر خودش می‌کنه
هرگز توی اسکریپت cache clear نذار مگه واقعاً لازم باشه. کاربر خودش دستی:

powershell
Get-Process | Where-Object { $_.ProcessName -like "*Internship*" } | Stop-Process -Force
Remove-Item "$env:LOCALAPPDATA\InternshipOS\WebView2" -Recurse -Force
کاربر گفت: «الان پچات ریستارت و کلیر کش می‌کنن مگه واقعاً لازم باشه».

۵. تست جدا از اسکریپت
الگوی دو پیام:

پیام ۱ — اسکریپت
فقط patch. هیچ تستی داخلش نباشه.

پیام ۲ — راهنمای تست
text
# 🧪 تست N — [نام]

## کاری که بکن
1. کش رو دستی پاک کن + InternshipOS.exe رو ری‌استارت کن
2. F12 → Console → این رو پیست کن:
   [کد تست]
3. نتیجه رو بفرست

## باید ببینی
- ✅ ...
- ✅ ...

## اگه خطا بود
- خروجی Console رو کپی کن
۶. صبر نکن برای تأیید
اگه یه patch گذشت و verify سبز بود → خودت برو گام بعدی.
فقط اگه باگ واقعی بود، صبر کن.

۷. اگه anchor پیدا نشد
الگوی دیباگ:

powershell
$content = Get-Content $path -Raw -Encoding UTF8
$idx = $content.IndexOf('partial-anchor')
if ($idx -ge 0) {
    Write-Host "Found at index: $idx" -ForegroundColor Cyan
    Write-Host "Context:"
    Write-Host $content.Substring([Math]::Max(0, $idx - 100), 300)
} else {
    Write-Host "Not found" -ForegroundColor Red
}
کاربر خروجی رو می‌فرسته → anchor دقیق بساز.

۸. Helpers پرکاربرد
ساخت helper برای notification fallback
powershell
$notifyCode = @'
function _notify(level, msg, opts) {
  try {
    var N = window.InternshipResidency && window.InternshipResidency.notify;
    if (N && typeof N[level] === "function") { N[level](msg, opts); return; }
  } catch (e) {}
  try { if (window.InternshipLib && window.InternshipLib.toast) window.InternshipLib.toast(msg, level === "error" ? "error" : ""); }
  catch (e2) { console.warn("[notify fallback]", msg); }
}
'@
Diagnostics سبز/قرمز
powershell
$check = $content.Contains('marker')
if ($check) { Write-Host "  OK  marker" -ForegroundColor Green }
if (-not $check) { Write-Host "  FAIL marker" -ForegroundColor Red }
نه $(if($check){'Green'}else{'Red'}).

۹. ساختار فایل‌های جدید
powershell
$newFilePath = Join-Path $root "app\residency\new-module-vXX.js"

$fileContent = @'
/* ═══════════════════════════════════════════════════════════
   INTERNSHIP OS — Module Name vXX
   توضیح کوتاه
   ═══════════════════════════════════════════════════════════ */
(function () {
  "use strict";
  var R = window.InternshipResidency;
  if (!R) { console.warn("[module.name] R missing"); return; }
  
  var M = R.moduleName = R.moduleName || {};
  M.VERSION = "1.0.0";
  
  // ... کد
  
  M.__tests = function () {
    var results = [];
    // تست‌ها
    return { passed: 0, total: 0, results: results };
  };
  
  console.log("[module.name] loaded v" + M.VERSION);
})();
'@

[IO.File]::WriteAllText($newFilePath, $fileContent, [Text.UTF8Encoding]::new($false))
Write-Host "Created: $newFilePath" -ForegroundColor Green
نکته: index.html رو تغییر نده مگه صریحاً گفته بشه.

۱۰. قواعد نهایی
Backup اجباری قبل هر patch

Anchor ASCII — نه فارسی

Diagnostics تکه‌تکه — هر خط مستقل

UTF-8 بدون BOM همیشه

بدون else چندخط

Here-string درست: @' آخر خط، '@ ابتدا خط

Cache clear نکن مگه واقعاً لازم

تست جدا از patch

صبر نکن برای تأیید — فقط اگه باگ، صبر

گزارش کامل بعد هر Phase

۱۱. الگوی پاسخ به کاربر
کاربر فارسی می‌نویسه، تو هم فارسی:

کوتاه — نه فلسفی

فقط اسکریپت توی پیام اول

تست جدا توی پیام دوم

گزارش وقتی Phase تموم شد

مثال:

text
[توضیح کوتاه ۲-۳ خط]

[اسکریپت PowerShell]
بعد پیام جدید:

text
# 🧪 تست

[راهنمای دستی]