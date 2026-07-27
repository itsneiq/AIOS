@echo off
setlocal
cd /d "%~dp0"

echo =====================================
echo AIOS Auto Editor - Build Installer
 echo =====================================

if not exist "node_modules\electron\dist\electron.exe" (
  echo Dependency belum terpasang.
  echo Jalankan setup-desktop-windows.bat terlebih dahulu.
  pause
  exit /b 1
)

call npm run check
if errorlevel 1 (
  echo Pemeriksaan kode gagal. Build dibatalkan.
  pause
  exit /b 1
)

call npm run dist
if errorlevel 1 (
  echo Build installer gagal.
  pause
  exit /b 1
)

echo.
echo Installer selesai dibuat di folder dist.
pause