@echo off
echo Node:
node -v
echo.
echo FFmpeg:
ffmpeg -version
echo.
echo Edge Neural TTS:
where edge-tts >nul 2>nul
if errorlevel 1 (
  echo Edge TTS belum tersedia. Jalankan: py -m pip install edge-tts
  echo Windows Speech tetap dapat digunakan sebagai fallback offline.
) else (
  edge-tts --version
)
echo.
pause
