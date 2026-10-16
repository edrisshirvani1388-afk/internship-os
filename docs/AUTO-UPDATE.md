# Auto-Update — راهنمای کامل

> آخرین به‌روزرسانی: 2026-10-16 (v0.5.1)

## چکیده

Internship OS از v0.5.1 به بعد، آپدیت خودکار installer-based دارد.
کاربر در اپ روی «بررسی آپدیت» می‌زند → اگر نسخه‌ی جدید باشد، یک کلیک
«دانلود و نصب» → installer در پس‌زمینه سایلنت نصب می‌کند → برنامه باز
می‌شود. داده‌ی کاربر (`data/`) هرگز دست نمی‌خورد.

## معماری

```
┌──────────────────┐    ┌─────────────────┐    ┌────────────────┐
│ release.cmd      │───▶│ release.ps1     │───▶│ GitHub Release │
│ (دابل‌کلیک)      │    │ build + compile │    │ installer +    │
│ نسخه می‌پرسد       │    │ sha256 + push   │    │ update.json    │
└──────────────────┘    └─────────────────┘    └────────┬───────┘
                                                          │
                                                          ▼
┌──────────────────┐    ┌─────────────────┐    ┌────────────────┐
│ کاربر:           │───▶│ backend:        │───▶│ GitHub CDN:    │
│ «بررسی آپدیت»     │    │ /api/check-     │    │ update.json    │
│                  │    │ update          │    │ (latest)       │
└──────────────────┘    └─────────────────┘    └────────────────┘
        │
        ▼
┌──────────────────┐    ┌─────────────────┐    ┌────────────────┐
│ «دانلود و نصب»   │───▶│ /api/apply-     │───▶│ download exe + │
│                  │    │ update          │    │ verify sha256  │
└──────────────────┘    └─────────────────┘    └────────┬───────┘
                                                          │
                                                          ▼
┌──────────────────┐    ┌─────────────────┐    ┌────────────────┐
│ /SILENT نصب      │───▶│ خودبرنامه exit  │───▶│ اپ باز می‌شود   │
│ حفظ data/        │    │ installer اجرا  │    │ نسخه جدید       │
└──────────────────┘    └─────────────────┘    └────────────────┘
```

## برای توسعه‌دهنده: چطور نسخه‌ی جدید منتشر کنیم

### روش ساده — دابل‌کلیک

1. تغییرات کد را در پروژه ذخیره کن
2. روی `release.cmd` دابل کلیک کن
3. شماره‌ی نسخه‌ی جدید را تایپ کن (مثلاً `0.5.2`)
4. Enter
5. صبر ۱-۲ دقیقه

اسکریپت خودش: build → installer → sha256 → update.json → git push →
gh release create → upload assets.

### روش پیشرفته — با Notes

```powershell
cd D:\Desktop\.internship-os\internship-os
.\release.ps1 -Version 0.5.2 -Notes "رفع باگ X`nبهبود Y"
```

`Notes` به کاربر در modal آپدیت نمایش داده می‌شود (تبدیل `n` به خط جدید).

### فازهای اسکریپت

| Section | کار |
|---------|-----|
| 0 | بررسی محیط (release.iss، VERSION، ISCC، gh) |
| 1 | دریافت نسخه از CLI یا prompt |
| 2 | بررسی branch روی main |
| 3 | بستن نمونه‌های در حال اجرای InternshipOS |
| 4 | `dotnet publish` برای backend |
| 5 | assemble پوشه‌ی release در `internship-os-releases/InternshipOS-Release-vX.Y.Z/` |
| 6 | آپدیت `VERSION`، `version.json`، `app/data.js` |
| 7 | compile installer با `release.iss` |
| 8 | ساخت `update.json` |
| 9 | `git add/commit/push` + `gh release create` |

## برای کاربر: چطور آپدیت کند

1. اپ Internship OS را باز کن
2. تنظیمات (داده‌ها) → بخش «به‌روزرسانی برنامه»
3. روی «بررسی آپدیت» بزن
4. اگر نسخه‌ی جدید بود: «دانلود و نصب آپدیت»
5. صبر کن — اپ خودش می‌بندد، نصب می‌کند، و دوباره باز می‌شود

**داده‌های شخصی (`data/`) دست نمی‌خورد.**

## قراردادها

### `update.json` (manifest)

در ریشه‌ی release روی GitHub آپلود می‌شود، مسیر ثابت:

```
https://github.com/edrisshirvani1388-afk/internship-os/releases/latest/download/update.json
```

ساختار:

```json
{
  "latest": "0.5.1",
  "installerUrl": "https://github.com/.../releases/download/v0.5.1/InternshipOS-Setup-v0.5.1.exe",
  "zipUrl": "<همان installerUrl — سازگاری با فرمت قدیمی>",
  "sha256": "45870960DB527F...",
  "sizeBytes": 58754032,
  "releaseNotes": "...",
  "publishedAt": "2026-10-16"
}
```

### Backend endpoints

**`GET /api/check-update?url=<manifest-url>`**

پاسخ:
```json
{
  "ok": true,
  "latest": "0.5.1",
  "installerUrl": "https://...",
  "zipUrl": "https://...",
  "sha256": "...",
  "sizeBytes": 58754032,
  "notes": "...",
  "publishedAt": "2026-10-16"
}
```

**`POST /api/apply-update`**

Body:
```json
{
  "installerUrl": "https://...",
  "newVersion": "0.5.1",
  "sha256": "..."
}
```

مراحل backend:
1. دانلود installer به `%TEMP%\InternshipOS-Setup-vX.Y.Z-<guid>.exe`
2. verify SHA256 (اگر mismatch: `{ error: "sha256_mismatch" }`)
3. خواندن مسیر نصب از registry: `HKCU\...\Uninstall\{AppId}_is1\InstallLocation`
4. fallback: `%LOCALAPPDATA%\Programs\InternshipOS`
5. `Process.Start(installer, "/SILENT /NORESTART /SUPPRESSMSGBOXES /DIR=<path> /LOG=<log>")`
6. `Task.Delay(2000)` سپس `Environment.Exit(0)`

### Installer (Inno Setup)

`release.iss` — قالب واحد پارامتری:

- `/DAppVersion=0.5.1` — نسخه
- `/DSourceDir=<path>` — پوشه‌ی محتوای release
- `/DOutputDir=<path>` — محل خروجی installer
- `/DIconFile=<path>` — آیکون

نکات ایمنی:
- `CloseApplications=force` — فایل‌های قفل‌شده را آزاد کن
- `RestartApplications=no` — خودش restart نکند (اپ این کار را می‌کند)
- `UsePreviousAppDir=yes` — همان مسیر قبلی را نگه دارد
- `data\` از wildcard حذف شده → data کاربر حفظ می‌شود
- `[Run]` بدون `skipifsilent` → بعد از silent هم اپ باز می‌شود

## مسیرهای کلیدی

| مسیر | نقش |
|------|------|
| `<repo>/release.iss` | قالب installer |
| `<repo>/release.ps1` | اسکریپت انتشار |
| `<repo>/release.cmd` | wrapper برای دابل‌کلیک |
| `<repo>/update.json` | manifest (آخرین بار generate) |
| `<repo>/VERSION` | نسخه‌ی فعلی (source of truth) |
| `<repo>/version.json` | metadata نسخه (برای URL server) |
| `<parent>/internship-os-releases/InternshipOS-Release-vX.Y.Z/` | پوشه assemble |
| `<parent>/InternshipOS-Setup-vX.Y.Z.exe` | installer نهایی |
| `%LOCALAPPDATA%\Programs\InternshipOS\` | مسیر نصب روی سیستم کاربر |

## عیب‌یابی

### `release.ps1` نمی‌تواند فایل exe را حذف کند

**علت:** یک InternshipOS در حال اجراست.
**راه‌حل:** `release.ps1` حالا خودش `taskkill` می‌زند و ۲ ثانیه صبر می‌کند.
اگر باز مشکل: Task Manager → بستن `InternshipOS.exe` و `InternshipOS-Setup-*.exe`.

### `git push` خطا می‌دهد ولی push شده

**علت:** git پیشرفت را به stderr می‌نویسد و PowerShell آن را خطا می‌بیند.
**وضعیت:** در `release.ps1` با `$ErrorActionPreference='Continue'` دور push حل شده.

### `gh release` با `EOF` شکست می‌خورد

**علت:** اتصال شبکه ناپایدار (خاورمیانه / تحریم).
**راه‌حل:** اسکریپت با retry ۵ باره تلاش می‌کند. اگر باز شکست:
`.\release.ps1 -Version X.Y.Z -SkipBuild` (بدون build دوباره).
اگر draft باقی ماند: `gh api -X DELETE repos/<owner>/<repo>/releases/<id>`.

### کاربر آپدیت را می‌زند ولی هیچ اتفاقی نمی‌افتد

**علت‌های احتمالی:**
- اینترنت قطع یا کند
- نسخه‌ی کاربر < 0.5.1 است (ZIP-based قدیمی که installer را نمی‌فهمد)
- Windows Defender installer را بلاک کرده

**راه‌حل:** در `%TEMP%` دنبال `InternshipOS-Setup-v*` و `InternshipOS-update-*.log`
بگرد. log آخرین مراحل را نشان می‌دهد.

## محدودیت‌ها

### فقط از v0.5.1 به بعد

نسخه‌های < 0.5.1 منطق ZIP-based قدیمی دارند. برای مهاجرت به auto-update،
**یک بار** باید installer v0.5.1 را دستی نصب کنند. از آن به بعد همه‌چیز خودکار.

### progress bar نداریم

modal آپدیت فقط «در حال دانلود...» نشان می‌دهد. برای دانلود ۵۶MB روی
اینترنت کند، کاربر نمی‌داند چقدر مانده. (ISSUE-XX — قابل بهبود)

### ترک draft در صورت قطع شبکه

اگر وسط `gh release create` اتصال قطع شود، یک draft ممکن است باقی بماند.
پاک‌سازی: `gh api -X DELETE repos/.../releases/<id>`.

## تاریخچه

- **v0.5.1 (2026-10-16)** — پیاده‌سازی auto-update installer-based
- **v0.5.0 (2026-10-16)** — زیرساخت انتشار + release.ps1 + release.iss
- **قبل از v0.5.0** — ZIP-based (منسوخ)

## ADRهای مرتبط

- ADR-059 — Installer-Based Auto-Update (این سند)
- ADR-006 — Storage Layout Must Not Leak
- ADR-007 — Split State is Future, Not Now

## Cross-References

- `docs/ARCHITECTURE.md` — بخش Auto-Update
- `docs/SCHEMA.md` — ساختار update.json
- `docs/DECISIONS.md` — ADR-059
- `docs/KNOWN_ISSUES.md` — عیب‌یابی مرتبط
- `release.ps1` — پیاده‌سازی
- `release.iss` — قالب installer
- `server-dotnet/Program.cs` — endpointهای check-update / apply-update
