@echo off
cd /d "%~dp0"
taskkill /F /IM InternshipOS.exe >nul 2>&1
taskkill /F /IM InternshipOS.Server.exe >nul 2>&1
timeout /t 2 /nobreak >nul
cd server-dotnet
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:IncludeNativeLibrariesForSelfExtract=true -o "..\server\"
echo.
echo Done. Press any key to close.
pause >nul