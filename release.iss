; ═══════════════════════════════════════════════════════════
;  Internship OS — Unified Inno Setup Template
;  Compile with:
;    ISCC.exe release.iss ^
;      /DAppVersion=0.5.0 ^
;      /DSourceDir="D:\...\InternshipOS-Release-v0.5.0\InternshipOS" ^
;      /DOutputDir="D:\Desktop\.internship-os" ^
;      /DIconFile="D:\...\app\brain.ico"
; ═══════════════════════════════════════════════════════════

#ifndef AppVersion
  #error AppVersion must be defined (use /DAppVersion=0.5.0)
#endif
#ifndef SourceDir
  #error SourceDir must be defined (use /DSourceDir="...")
#endif
#ifndef OutputDir
  #error OutputDir must be defined (use /DOutputDir="...")
#endif
#ifndef IconFile
  #error IconFile must be defined (use /DIconFile="...")
#endif

#define MyAppName "Internship OS"
#define MyAppPublisher "Edris Shirvani"
#define MyAppExeName "InternshipOS.exe"

[Setup]
AppId={{B8F3A9D5-2E4C-4A1B-9F5D-1C7E3B8A6F2D}
AppName={#MyAppName}
AppVersion={#AppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={localappdata}\Programs\InternshipOS
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
OutputDir={#OutputDir}
OutputBaseFilename=InternshipOS-Setup-v{#AppVersion}
SetupIconFile={#IconFile}
Compression=lzma2/max
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
UninstallDisplayIcon={app}\app\brain.ico
DisableProgramGroupPage=yes
DisableDirPage=no
DisableReadyPage=no
ShowLanguageDialog=no
ArchitecturesInstallIn64BitMode=x64compatible
ArchitecturesAllowed=x64compatible

; ─── برای silent auto-update ───
CloseApplications=force
RestartApplications=no
SetupLogging=yes
UsePreviousAppDir=yes

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "ساخت آیکون روی دسکتاپ"; GroupDescription: "میان‌برها:"; Flags: checkedonce

[Files]
; همه چیز جز data\ — پوشه data کاربر دست نخورده باقی می‌ماند
Source: "{#SourceDir}\*"; DestDir: "{app}"; Excludes: "data\*,data"; Flags: recursesubdirs createallsubdirs ignoreversion
; data/ فقط اگر وجود نداشت (نصب تازه)
Source: "{#SourceDir}\data\state.js"; DestDir: "{app}\data"; Flags: onlyifdoesntexist uninsneveruninstall skipifsourcedoesntexist
Source: "{#SourceDir}\data\ai-config.json"; DestDir: "{app}\data"; Flags: onlyifdoesntexist uninsneveruninstall skipifsourcedoesntexist

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\server\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app\brain.ico"
Name: "{group}\حذف {#MyAppName}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\server\{#MyAppExeName}"; WorkingDir: "{app}"; IconFilename: "{app}\app\brain.ico"; Tasks: desktopicon

[Run]
; postinstall (بعد از نصب دستی) — بعد از silent هم اجرا می‌شود
Filename: "{app}\server\{#MyAppExeName}"; Description: "اجرای {#MyAppName}"; Flags: nowait postinstall