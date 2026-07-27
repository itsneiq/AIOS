@echo off
setlocal
cd /d "%~dp0"

if not exist "node_modules\electron\dist\electron.exe" (
  echo Dependency desktop belum terpasang.
  echo Jalankan setup-desktop-windows.bat terlebih dahulu.
  pause
  exit /b 1
)

call npm start
if errorlevel 1 (
  echo AIOS berhenti karena terjadi kesalahan.
  pause
)
