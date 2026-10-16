@echo off
cd /d "%~dp0"
taskkill /F /IM InternshipOS.exe >nul 2>&1
timeout /t 1 /nobreak >nul
if not exist "server\InternshipOS.exe" (
    echo [ERROR] server\InternshipOS.exe not found.
    pause
    exit /b 1
)
start "" "server\InternshipOS.exe"
timeout /t 2 /nobreak >nul
exit