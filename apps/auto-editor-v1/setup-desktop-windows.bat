@echo off
setlocal
cd /d "%~dp0"

echo =====================================
echo AIOS Auto Editor - Desktop Setup
echo =====================================

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js belum terpasang atau belum masuk PATH.
  echo Pasang Node.js versi 20 atau lebih baru, lalu jalankan ulang file ini.
  pause
  exit /b 1
)

call npm install
if errorlevel 1 (
  echo Instalasi dependency gagal.
  pause
  exit /b 1
)

echo.
echo Setup selesai.
echo Jalankan start-desktop-windows.bat untuk membuka AIOS.
pause
