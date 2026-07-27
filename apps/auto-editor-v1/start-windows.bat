@echo off
cd /d "%~dp0"
echo Menjalankan AIOS Auto Editor...
start "" http://localhost:4174
node server.js
pause
