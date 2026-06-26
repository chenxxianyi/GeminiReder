@echo off
setlocal
chcp 65001 >nul

cd /d "%~dp0"

where powershell.exe >nul 2>nul
if errorlevel 1 (
  echo PowerShell was not found.
  pause
  exit /b 1
)

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0zcode-start.ps1" %*

set EXIT_CODE=%ERRORLEVEL%
if not "%EXIT_CODE%"=="0" (
  echo.
  echo ZCode launcher stopped with exit code %EXIT_CODE%.
  pause
)

exit /b %EXIT_CODE%
