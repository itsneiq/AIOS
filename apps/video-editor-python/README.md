# Video Editor AI (Python / CustomTkinter)

Aplikasi desktop Windows untuk produksi video produk otomatis: VO Indonesia (Gemini + Azure/Gemini TTS),
auto-cut, foto→video, subtitle Whisper, hook text, watermark, color grade, batch dari Excel, dan mode Manual
dengan formula copywriting (Hook-Benefit-CTA / PAS / AIDA).

## Setup
1. `python -m venv venv` lalu aktifkan, `pip install -r requirements.txt`
2. Untuk GPU: `pip install torch --index-url https://download.pytorch.org/whl/cu126`
3. Salin `credentials.example.py` jadi `credentials.py`, isi API key.
4. Install ffmpeg (butuh h264_nvenc untuk render cepat; fallback otomatis ke libx264).
5. Jalankan `Buka_Video_Editor.bat` (atau `python gui_app.py`).

Versi: update43 (tab Batch/Manual dengan tinggi dinamis).
