# Internship OS - Release Automation
[CmdletBinding()]
param(
    [string] $Version,
    [string] $Notes = "",
    [switch] $SkipBuild,
    [switch] $SkipPush
)
$ErrorActionPreference = 'Stop'
$Root     = if($PSScriptRoot){ $PSScriptRoot } else { (Get-Location).Path }
$Parent   = Split-Path $Root -Parent
$Releases = Join-Path $Parent 'internship-os-releases'
$Repo     = 'edrisshirvani1388-afk/internship-os'
$Iscc     = 'C:\Users\M. Edris Sirvani\AppData\Local\Programs\Inno Setup 6\ISCC.exe'
function Say($m,$c){ Write-Host $m -ForegroundColor $c }
# --- Section 0: env
if(-not (Test-Path (Join-Path $Root 'release.iss'))){ Say 'release.iss not found' 'Red'; exit 1 }
if(-not (Test-Path (Join-Path $Root 'VERSION'))){ Say 'VERSION not found' 'Red'; exit 1 }
if(-not (Test-Path $Iscc)){ Say 'ISCC not found' 'Red'; exit 1 }
# --- Section 1: version
$cur = (Get-Content (Join-Path $Root 'VERSION') -Raw).Trim()
Write-Host "current version: $cur"
if([string]::IsNullOrWhiteSpace($Version)){ $Version = (Read-Host "new version (e.g. 0.5.0)").Trim() }
if($Version -notmatch '^\d+\.\d+\.\d+$'){ Say "bad version: $Version" 'Red'; exit 1 }
if($Version -eq $cur){ Say 'same as current' 'Red'; exit 1 }
Say "target: v$Version" 'Green'
# --- Section 2: build
if($SkipBuild){ Say 'build skipped' 'Yellow' }
if(-not $SkipBuild){
    $serverDir = Join-Path $Root 'server'
    if(Test-Path $serverDir){ Remove-Item -LiteralPath $serverDir -Recurse -Force }
    Push-Location (Join-Path $Root 'server-dotnet')
    try {
        & dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o $serverDir
        if($LASTEXITCODE -ne 0){ Say 'dotnet publish failed' 'Red'; exit 1 }
        Say 'backend built' 'Green'
    } finally { Pop-Location }
}
# --- Section 3: assemble
$releaseDir   = Join-Path $Releases ("InternshipOS-Release-v$Version")
$releaseInner = Join-Path $releaseDir 'InternshipOS'
if(Test-Path $releaseDir){ Remove-Item -LiteralPath $releaseDir -Recurse -Force }
New-Item -ItemType Directory -Path $releaseInner -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $Root 'app') -Destination $releaseInner -Recurse -Force
Get-ChildItem -LiteralPath (Join-Path $releaseInner 'app') -Recurse -File | Where-Object { $_.Name -match '\.bak' } | Remove-Item -Force -ErrorAction SilentlyContinue
Copy-Item -LiteralPath (Join-Path $Root 'server') -Destination $releaseInner -Recurse -Force
Copy-Item -LiteralPath (Join-Path $Root 'Food.db') -Destination $releaseInner -Force
$cl = Join-Path $Root 'CHANGELOG.md'
if(Test-Path $cl){ Copy-Item -LiteralPath $cl -Destination $releaseInner -Force }
$dataInner = Join-Path $releaseInner 'data'
New-Item -ItemType Directory -Path $dataInner -Force | Out-Null
$empty = '/* INTERNSHIP OS - fresh */' + "`n" + 'window.INTERNSHIP_STATE = {"schemaVersion":22,"workspace":{"name":"","firstName":""},"tasks":[],"shifts":[],"rotations":[],"cases":[],"procedures":[],"clinicalProgress":{},"procedureProgress":{},"curriculumMeta":{},"customContent":{},"imports":[],"programContent":[],"contentDrafts":[],"residency":null,"replanTriggers":[],"schedulingAcks":[]};' + "`n" + 'window.INTERNSHIP_STATE_SAVED_AT=0;' + "`n"
[IO.File]::WriteAllText((Join-Path $dataInner 'state.js'), $empty, [Text.UTF8Encoding]::new($false))
Say 'assembled' 'Green'
# --- Section 4: VERSION + version.json + data.js
[IO.File]::WriteAllText((Join-Path $Root 'VERSION'), $Version, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $releaseInner 'VERSION'), $Version, [Text.UTF8Encoding]::new($false))
$today = Get-Date -Format 'yyyy-MM-dd'
$hl = if($Notes){ $Notes -split "`n" } else { @("Release v$Version") }
$vj = @{version=$Version;releasedAt=$today;schema=22;highlights=$hl;notes="v$Version"} | ConvertTo-Json -Depth 4
[IO.File]::WriteAllText((Join-Path $Root 'version.json'), $vj, [Text.UTF8Encoding]::new($false))
[IO.File]::WriteAllText((Join-Path $releaseInner 'version.json'), $vj, [Text.UTF8Encoding]::new($false))
$djp = Join-Path $Root 'app\data.js'
$djc = [IO.File]::ReadAllText($djp, [Text.UTF8Encoding]::new($false))
$djc = [regex]::Replace($djc, 'appVersion:\s*"[^"]*"', "appVersion: `"$Version`"")
$djc = [regex]::Replace($djc, 'updateUrl:\s*"[^"]*"', "updateUrl: `"https://github.com/$Repo/releases/latest/download/update.json`"")
[IO.File]::WriteAllText($djp, $djc, [Text.UTF8Encoding]::new($false))
Copy-Item -LiteralPath $djp -Destination (Join-Path $releaseInner 'app\data.js') -Force
Say "data.js -> v$Version" 'Green'
# --- Section 5: installer
$inst = Join-Path $Parent "InternshipOS-Setup-v$Version.exe"
if(Test-Path $inst){ try { Remove-Item -LiteralPath $inst -Force } catch { Move-Item -LiteralPath $inst -Destination ($inst + '.old-' + (Get-Date -Format 'HHmmss')) -Force } }
$ico = Join-Path $Root 'app\brain.ico'
& $Iscc (Join-Path $Root 'release.iss') "/DAppVersion=$Version" "/DSourceDir=$releaseInner" "/DOutputDir=$Parent" "/DIconFile=$ico" | Out-Null
if($LASTEXITCODE -ne 0){ Say 'ISCC failed' 'Red'; exit 1 }
if(-not (Test-Path $inst)){ Say 'installer not produced' 'Red'; exit 1 }
$iSize = (Get-Item $inst).Length
$iHash = (Get-FileHash $inst -Algorithm SHA256).Hash
Say ("installer: {0:N2} MB" -f ($iSize/1MB)) 'Green'
Say "sha256: $iHash" 'Green'
# --- Section 6: update.json
$iUrl = "https://github.com/$Repo/releases/download/v$Version/InternshipOS-Setup-v$Version.exe"
$uj = @{latest=$Version;installerUrl=$iUrl;zipUrl=$iUrl;sha256=$iHash;sizeBytes=$iSize;releaseNotes=$Notes;publishedAt=$today} | ConvertTo-Json -Depth 4
$ujp = Join-Path $Root 'update.json'
[IO.File]::WriteAllText($ujp, $uj, [Text.UTF8Encoding]::new($false))
Say 'update.json' 'Green'
# --- Section 7: push
if($SkipPush){ Say 'push skipped' 'Yellow' }
if(-not $SkipPush){
    Push-Location $Root
    try {
        $ErrorActionPreference = 'Continue'; git add VERSION version.json app/data.js app/app.js server-dotnet/Program.cs update.json release.iss release.ps1 release.cmd 2>$null; $ErrorActionPreference = 'Stop'
        $ErrorActionPreference = 'Continue'; git -c user.name=Edris -c user.email=edris@local commit -m "release: v$Version" 2>$null; $ErrorActionPreference = 'Stop'
        $ErrorActionPreference = 'Continue'; git push origin main 2>&1 | ForEach-Object { Write-Host $_ }; $ErrorActionPreference = 'Stop'
        if($LASTEXITCODE -ne 0){ Say 'push failed' 'Red'; exit 1 }
    } finally { Pop-Location }
    $tag = "v$Version"
    $tf = Join-Path $env:TEMP "ios-notes-$Version.txt"
    [IO.File]::WriteAllText($tf, $(if($Notes){$Notes}else{"Release v$Version"}), [Text.UTF8Encoding]::new($false))
    & gh release create $tag --repo $Repo --title "Internship OS v$Version" --notes-file $tf $inst $ujp 2>&1 | ForEach-Object { Write-Host $_ }
    if($LASTEXITCODE -ne 0){ Say 'gh release failed' 'Red'; exit 1 }
    Remove-Item -LiteralPath $tf -Force -ErrorAction SilentlyContinue
    Say 'GitHub Release uploaded' 'Green'
}

Say "==== Release v$Version ready ====" 'Green'
Write-Host "installer: $inst"
Write-Host ("size: {0:N2} MB" -f ($iSize/1MB))
Write-Host "sha256: $iHash"
if(-not $SkipPush){ Write-Host "github: https://github.com/$Repo/releases/tag/v$Version" }
