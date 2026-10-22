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
---

# ⚠️ CRITICAL: PowerShell Crash Prevention (Agent #19 · 2026-10-19)

## The #1 killer: `exit`

**exit in a script closes the PowerShell window. No warning, no output.**

During Agent #19's session, ~8 PowerShell windows crashed. The root
cause was **exit inside error-handling paths** — NOT long scripts,
NOT Persian text, NOT here-strings.

Bad example (crashed repeatedly):

    if ($n -ne 5) { Write-Host "FAIL"; exit }   # ← CRASH

When the condition was true (common on partial patch matches), exit ran
and killed the terminal. User saw the window vanish.

## The fix: try/catch + throw — NEVER exit

    try {
        if (cond) { throw "reason" }
        # do work
        [IO.File]::WriteAllText($path, $content, [Text.UTF8Encoding]::new($false))
        & node --check $path
        if ($LASTEXITCODE -ne 0) { throw "syntax error" }
        Write-Host "  OK - done" -ForegroundColor Green
    } catch {
        Write-Host "  FAIL - $_" -ForegroundColor Red
    }

**Rules:**

1. **NO exit anywhere.** Not in if, not in catch, not in else.
2. **NO multi-line else in console.** PowerShell parses if/else line-by-line;
   else on its own line fails with: The term 'else' is not recognized.
   Use two if statements, or throw, or put everything in a .ps1.
3. **Verify markers before writing.** If -contains fails -> throw; don't write.
4. **Rollback on syntax failure.** If node --check fails after write,
   restore the .bak-* backup.
5. **Always pass [Text.UTF8Encoding]::new($false)** to prevent BOM.

## File save safety pattern

    $f = 'D:\Desktop\...\target.js'
    Copy-Item $f "$f.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
    $lines = [IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)
    $out = New-Object System.Collections.Generic.List[string]
    $n = 0
    foreach ($ln in $lines) {
        if ($ln -match 'some-anchor-regex') {
            $out.Add('replacement-line')
            $n++
            continue
        }
        $out.Add($ln)
    }
    if ($n -ne 1) { throw "anchor matched $n times (expected 1)" }
    [IO.File]::WriteAllLines($f, $out, [Text.UTF8Encoding]::new($false))
    & node --check $f
    if ($LASTEXITCODE -ne 0) { throw "syntax error" }
    Write-Host "  OK - written" -ForegroundColor Green

## Persian text in scripts

- Safe as \uXXXX inside JS string literals.
- Safe when the entire script is saved via [Text.UTF8Encoding]::new($false).
- **Not safe** in -eq comparisons (ZWNJ / Arabic vs Persian Yeh).
  Use -match with regex, or -contains on ASCII anchors only.
- Verification messages (Write-Host) — keep ASCII only.

## Long scripts

Long scripts are FINE. Length was never the cause. Wrap in one
try/catch block; on partial match (n != 1), throw cleanly — no write,
no crash.

## Diagnose one fact per line

Good:
    Write-Host "marker1:" (Test-Path $f) -ForegroundColor Green
    Write-Host "count:" $n

Bad (parser issues):
    Write-Host "OK $($x.Contains('some"quote'))"

## Recovery when PowerShell already crashed

If a file is in a broken state, iterate .bak-* by mtime and test each.
BUT: node --check on a .bak-* file (no .js extension) returns FAIL for
healthy files — always copy to a temp .js first:

    $f = 'D:\Desktop\...\target.js'
    $dir = Split-Path $f
    $tmp = Join-Path $dir '_check-tmp.js'
    Get-ChildItem "$f.bak-*" | Sort-Object LastWriteTime -Descending | ForEach-Object {
        Copy-Item $_.FullName $tmp -Force
        & node --check $tmp 2>$null
        if ($LASTEXITCODE -eq 0) { Write-Host "PASS  $($_.Name)" -ForegroundColor Green }
        if ($LASTEXITCODE -ne 0) { Write-Host "FAIL  $($_.Name)" -ForegroundColor Yellow }
    }
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue

## ⚠️ Chat copy hazard — NEVER use triple-backtick inside here-string

When you write a patch for the user in chat, the markdown block for the
PowerShell script is delimited by triple-backticks. If your here-string
content ALSO contains triple-backticks (for showing a sample code block
inside the guide), the chat renderer closes the outer block early and
the user's copy is truncated mid-script. PowerShell then receives
partial content and crashes / silently does nothing.

**Rule:** inside here-string blocks, use **indented code** (4 spaces)
or ~~~ fences — never ``` — to represent sample code.

**Symptom:** user says "the script cut off / box ended early".

**Fix:** rewrite the here-string without any ``` sequence.

## Checklist before every patch (Agent #19)

- [ ] try { ... } catch { ... } wrapping entire script
- [ ] No exit anywhere
- [ ] No multi-line else
- [ ] No triple-backtick inside here-strings
- [ ] Backup: Copy-Item $f "$f.bak-..." -Force
- [ ] Anchor uniqueness check: if ($n -ne 1) { throw "..." }
- [ ] [Text.UTF8Encoding]::new($false) on write
- [ ] & node --check after write
- [ ] Marker verification (-contains or -match) — ASCII only
- [ ] Persian text as \uXXXX inside JS strings
- [ ] Green OK or red FAIL in output

## Golden template

    try {
        $f = 'D:\Desktop\...\target.js'
        Copy-Item $f "$f.bak-$(Get-Date -Format 'yyyyMMdd-HHmmss')" -Force
        $lines = [IO.File]::ReadAllLines($f, [Text.Encoding]::UTF8)
        $out = New-Object System.Collections.Generic.List[string]
        $n = 0
        foreach ($ln in $lines) {
            if ($ln -match 'EXACT_ANCHOR_REGEX') {
                $out.Add('NEW_LINE_1')
                $out.Add('NEW_LINE_2')
                $n++
                continue
            }
            $out.Add($ln)
        }
        if ($n -ne 1) { throw "anchor matched $n times" }
        [IO.File]::WriteAllLines($f, $out, [Text.UTF8Encoding]::new($false))
        & node --check $f
        if ($LASTEXITCODE -ne 0) { throw "syntax error" }
        $c = [IO.File]::ReadAllText($f, [Text.UTF8Encoding]::new($false))
        if (-not $c.Contains('EXPECTED_MARKER')) { throw "marker missing" }
        Write-Host "=====================================" -ForegroundColor Green
        Write-Host "  OK - patch applied" -ForegroundColor Green
        Write-Host "=====================================" -ForegroundColor Green
    } catch {
        Write-Host "=====================================" -ForegroundColor Red
        Write-Host "  FAIL - $_" -ForegroundColor Red
        Write-Host "=====================================" -ForegroundColor Red
    }
---

# M7-B LESSONS — Agent #20 (2026-10-20)

Lessons from a ~15-patch session on the V7 Draft Editor. Each one cost a
failed patch or rollback. Read before every multi-patch session.

## 1. PowerShell variables are CASE-INSENSITIVE

`$uF` and `$uf` and `$UF` are **the same variable**. This caused a silent
disaster:

    $uF = Join-Path $root 'app\file.js'
    $uf = [IO.File]::ReadAllText($uF)     # ← overwrites $uF with content
    & node --check $uF                     # ← $uF is now 90 KB of text
    # → "filename or extension is too long"

**Rule:** Use distinct names.
- `$uiPath` (file path)
- `$uiBk` (backup path)
- `$uiText` (file content)
- `$uiNew` (modified content)

Never reuse the same variable for path and content.

## 2. Line endings: normalize to LF before pattern matching

`[IO.File]::ReadAllText` returns the file's exact line endings. If the file
has mixed CRLF/LF (common after multiple patches), patterns built with `\n`
won't match some lines.

**Fix:** always start with:

    $u = [IO.File]::ReadAllText($uiPath, [Text.UTF8Encoding]::new($false))
    $u = $u.Replace("`r`n", "`n")

Then write back — JS accepts LF, no need to restore CRLF.

## 3. Never use `IndexOf("  }")` to find function end

Function bodies contain many `\n  }` (end of inner blocks). `IndexOf` returns
the **first** one, which is inside the body — not the function's closing brace.

**Symptom:** "function not found" after replace, or syntax error from
malformed file (function cut in half).

**Fix:** brace counting.

    function ReplaceFunc {
      param($content, $funcName, $newBody)
      $marker = "function $funcName("
      $start = $content.IndexOf($marker)
      if ($start -lt 0) { throw "$funcName not found" }
      $depth = 0; $found = $false; $end = -1
      for ($i = $start; $i -lt $content.Length; $i++) {
        $c = $content[$i]
        if ($c -eq '{') { $depth++; $found = $true }
        elseif ($c -eq '}') {
          $depth--
          if ($found -and $depth -eq 0) { $end = $i; break }
        }
      }
      if ($end -lt 0) { throw "$funcName end not found" }
      return $content.Substring(0, $start) + $newBody + $content.Substring($end + 1)
    }

Works for any JS function. No regex, no line ending issues.

## 4. Always count matches before replace

    $old = '...'
    $cnt = ([regex]::Matches($content, [regex]::Escape($old))).Count
    if ($cnt -ne 1) { throw "expected 1 match, found $cnt" }

If `$cnt = 0` — pattern is stale or content changed.
If `$cnt > 1` — pattern is ambiguous (found in multiple contexts).

**Never use `$content.Replace($old, $new)` without this check.** Replaces all
occurrences silently.

## 5. Verify BEFORE write, not after

Bad:

    [IO.File]::WriteAllText($f, $new, ...)
    if (-not (ReadAllText($f).Contains('marker'))) { throw }
    # file already corrupted, throw doesn't help

Good:

    if (-not $new.Contains('marker')) { throw "marker missing" }
    [IO.File]::WriteAllText($f, $new, ...)
    $check = [IO.File]::ReadAllText($f, ...)
    if (-not $check.Contains('marker')) { throw "verify failed after write" }

Both. But the first check prevents corrupt writes.

## 6. Backup path must be captured before overwriting content variable

If `$uiPath` gets reassigned (by mistake or by design), rollback fails:

    if (Test-Path $uiBk) { Copy-Item $uiBk $uiPath -Force }
    # If $uiPath is now content, "drive not found" or worse.

**Rule:** use a separate constant-like name for the path.

    $uiPath = 'D:\...\file.js'   # never reassign
    $uiText = ReadAllText($uiPath)
    $uiNew = ...                 # modify this
    [IO.File]::WriteAllText($uiPath, $uiNew, ...)

## 7. `-contains` is NOT string contains

    $x -contains 'foo'    # ← array membership (false on strings)
    $x.Contains('foo')    # ← string contains (correct)
    $x -match 'foo'       # ← regex match

For string checks in verification:
- **Use `.Contains()`** for literal
- **Use `-match`** for regex

`-contains` on a string always returns `$false`. Silent verification failure.

## 8. `node --check` on backup files fails (no `.js` extension)

    & node --check 'file.js.bak-m7b-20261020'

Returns FAIL because node checks extension, not content. Backup files have
`.bak-<ts>` suffix — no `.js`.

**Fix:**

    $tmp = Join-Path (Split-Path $f) '_check-tmp.js'
    Copy-Item $backupFile $tmp -Force
    & node --check $tmp
    if ($LASTEXITCODE -eq 0) { Write-Host "PASS $backupFile" -ForegroundColor Green }
    if ($LASTEXITCODE -ne 0) { Write-Host "FAIL $backupFile" -ForegroundColor Yellow }
    Remove-Item $tmp -Force -ErrorAction SilentlyContinue

## 9. `$LASTEXITCODE` must be checked explicitly

    & node --check $f
    if ($LASTEXITCODE -ne 0) { throw "syntax error" }

`-ErrorAction Stop` does NOT catch `node --check` failures. Node returns
exit code 1, PowerShell doesn't raise an exception. Check `$LASTEXITCODE`.

## 10. UTF-8 no BOM for BOTH read and write

Writing with `[Text.UTF8Encoding]::new($false)` is documented. But reading
with `Get-Content -Encoding UTF8` in PS 5.1 may strip BOM or mangle non-ASCII.

**Rule:** always use `[IO.File]` methods with explicit encoding:

    $text = [IO.File]::ReadAllText($path, [Text.UTF8Encoding]::new($false))
    [IO.File]::WriteAllText($path, $text, [Text.UTF8Encoding]::new($false))

Both directions. No exceptions.

## 11. Persian in here-strings — use \uXXXX form

Persian text inside a here-string may get bidi-rewritten by PowerShell or
terminal (U+202B, U+200F injected between lines). Symptom: line breaks
disappear, or `_draftRemoveAnchor(rtid);` and next line merge into one token.

**For JS content:** use `\uXXXX` escapes inside single-quote here-strings:

    $f = @'
    var msg = '\u062E\u0637\u0627';
    '@

The output file has literal `\u062E...` — JS parses it at runtime.

**For Write-Host / comparison:** use ASCII-only anchors.

**For Persian in final user-facing strings:** only through `\uXXXX`, never
raw Persian in a script comparison (`-eq`, `-match`).

## 12. Backup file size = sanity check

After `Copy-Item $f "$f.bak-..." -Force`, verify:

    $sz = (Get-Item $bakPath).Length
    if ($sz -eq 0) { throw "backup empty" }
    Write-Host "Backup: $bakPath ($sz bytes)" -ForegroundColor Green

A zero-byte or truncated backup means the copy failed silently (locked file,
disk full, permission). You lose rollback capability.

## 13. `try/finally` for cleanup, not just `try/catch`

If the test opens a resource (temp file, debug flag on `window.__PRA_FORCE_FAIL__`),
use `finally`:

    try {
      window.__PRA_FORCE_FAIL__ = 'cancel'
      # ... test
    } finally {
      window.__PRA_FORCE_FAIL__ = null
    }

`catch` alone doesn't run on success. `finally` always runs.

## 14. The "Golden Template" (revised for multi-patch sessions)

    try {
      $ErrorActionPreference = 'Stop'

      $f = 'D:\...\target.js'
      $uiPath = $f                                   # distinct from content
      $uiBk   = "$f.bak-<phase>-$(Get-Date -Format 'yyyyMMdd-HHmmss')"
      Copy-Item $uiPath $uiBk -Force
      if ((Get-Item $uiBk).Length -eq 0) { throw "backup empty" }

      $uiText = [IO.File]::ReadAllText($uiPath, [Text.UTF8Encoding]::new($false))
      $uiText = $uiText.Replace("`r`n", "`n")

      # Pattern 1: single-line replace
      $old1 = '...'
      $cnt1 = ([regex]::Matches($uiText, [regex]::Escape($old1))).Count
      if ($cnt1 -ne 1) { throw "pattern1 count=$cnt1" }
      $uiText = $uiText.Replace($old1, $new1)

      # Pattern 2: whole-function replace via brace counting
      $marker = 'function doSomething('
      $start = $uiText.IndexOf($marker)
      if ($start -lt 0) { throw "doSomething not found" }
      $depth = 0; $found = $false; $end = -1
      for ($i = $start; $i -lt $uiText.Length; $i++) {
        if ($uiText[$i] -eq '{') { $depth++; $found = $true }
        elseif ($uiText[$i] -eq '}') {
          $depth--
          if ($found -and $depth -eq 0) { $end = $i; break }
        }
      }
      if ($end -lt 0) { throw "doSomething end not found" }
      $uiText = $uiText.Substring(0, $start) + $newBody + $uiText.Substring($end + 1)

      # Verify BEFORE write
      if (-not $uiText.Contains('expected-marker')) { throw "marker missing before write" }

      # Write
      [IO.File]::WriteAllText($uiPath, $uiText, [Text.UTF8Encoding]::new($false))

      # Syntax check
      & node --check $uiPath
      if ($LASTEXITCODE -ne 0) { throw "syntax error" }

      # Verify AFTER write
      $check = [IO.File]::ReadAllText($uiPath, [Text.UTF8Encoding]::new($false))
      if (-not $check.Contains('expected-marker')) { throw "marker missing after write" }

      Write-Host ""
      Write-Host "=========================================" -ForegroundColor Green
      Write-Host "  OK - patch applied" -ForegroundColor Green
      Write-Host "=========================================" -ForegroundColor Green
    } catch {
      Write-Host ""
      Write-Host "=========================================" -ForegroundColor Red
      Write-Host "  FAIL - $_" -ForegroundColor Red
      Write-Host "=========================================" -ForegroundColor Red
      try {
        if (Test-Path $uiBk) {
          Copy-Item $uiBk $uiPath -Force
          Write-Host "Rollback: $uiPath" -ForegroundColor Yellow
        }
      } catch { Write-Host "Rollback failed: $_" -ForegroundColor Red }
    }

## 15. Multi-patch session workflow

For 5+ patches in a row on the same file:

1. **First patch:** fresh backup with `<file>.bak-<phase>-<ts>`.
2. **Each subsequent patch:** new backup. Never reuse.
3. **After each patch:** `node --check` + marker verify.
4. **If patch fails 3x in a row** — stop. Re-audit the file.
5. **Rollback = restore from THIS patch's backup**, not an older one.

Why separate backups: if patch 5 fails and patch 1 already passed,
rollback to patch 1's backup loses patches 2-4. Restore only patch 5's
backup → file returns to post-patch-4 state.

## 16. When PowerShell can't find your anchor

Even after audit, `IndexOf` returns -1. Three causes:

**A) Line ending mismatch** — normalize `\r\n` -> `\n` first.

**B) Whitespace inside pattern** — audit's output may trim. Use regex with
`\s*`:

    $pat = 'var\s+totalPages\s*=\s*0'
    $m = [regex]::Match($u, $pat)
    if (-not $m.Success) { throw "not found" }

**C) Persian/bidi in pattern** — see item 11. Use `\uXXXX` form or ASCII-only
portions.

**Debug:** find approximate location:

    $idx = $u.IndexOf('partial-anchor')
    if ($idx -ge 0) {
      $s = [Math]::Max(0, $idx - 100)
      $e = [Math]::Min($u.Length, $idx + 200)
      Write-Host $u.Substring($s, $e - $s)
    }

Read the actual bytes. Build pattern from them.

## 17. Test scripts must not touch real state

When running `__tests()` that depend on state (input, ui), state pollution
causes silent failures (`no_books_to_plan` guard -> early return -> 0/1).

**Fix:** isolated test:

    $origSave = window.__os.saveState
    window.__os.saveState = function() { }
    try {
      # snapshot activities, filter test data, run tests, restore
    } finally {
      window.__os.saveState = $origSave
    }

`finally` ensures saveState is re-enabled even if test throws.

## 18. `Get-FileHash` for integrity check

Before touching a state file, capture hash:

    $origHash = (Get-FileHash $statePath -Algorithm SHA256).Hash
    [IO.File]::WriteAllText($hashFile, $origHash, [Text.UTF8Encoding]::new($false))

After test, verify:

    $nowHash = (Get-FileHash $statePath -Algorithm SHA256).Hash
    if ($origHash -eq $nowHash) { Write-Host "UNCHANGED" -ForegroundColor Green }

For the "isolated state" test: saveState noop -> state.js UNCHANGED -> hash
match. If hash changed, something wrote bypassing saveState.

## 19. `Remove-Item` with wildcards is dangerous

    Remove-Item "$f.bak-*" -Force    # ← deletes ALL backups

**Rule:** never use wildcards on user data or backups. Delete exact paths only.

For temp cleanup: `Remove-Item $tmpPath -Force -ErrorAction SilentlyContinue`.

## 20. Filenames may contain invisible Unicode chars

`Get-ChildItem` output showed `‫POWERSHELL-GUIDE.md` with an RTL embedding
mark (U+202B) prefix. `Join-Path 'docs' 'POWERSHELL-GUIDE.md'` failed because
the actual filename had that hidden char.

**Fix:** use wildcard search, then take `.FullName`:

    $found = Get-ChildItem $docs -Filter '*POWERSHELL*' | Select-Object -First 1
    if (-not $found) { throw "not found" }
    $path = $found.FullName

Never trust literal names for files created on Windows with mixed RTL content.

## 21. Summary checklist (per patch)

- [ ] `$ErrorActionPreference = 'Stop'` at start
- [ ] `try { ... } catch { rollback } finally { ... }`
- [ ] Distinct variable names (path != content)
- [ ] Backup + size verify
- [ ] Read file with `[Text.UTF8Encoding]::new($false)`
- [ ] Normalize `\r\n` -> `\n`
- [ ] Pattern uniqueness: `if ($cnt -ne 1) { throw }`
- [ ] Function boundary: brace counting
- [ ] Verify marker BEFORE write
- [ ] `[IO.File]::WriteAllText(..., [Text.UTF8Encoding]::new($false))`
- [ ] `& node --check $path`
- [ ] `if ($LASTEXITCODE -ne 0) { throw }`
- [ ] Verify marker AFTER write
- [ ] Persian as `\uXXXX` in JS strings, not in PS comparisons
- [ ] Green `OK` or red `FAIL` at end

If any step fails silently, rollback. Don't proceed.

---

**End of M7-B lessons.**