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

## CutRecipe (tab ketiga)
Susun ulang satu video mentah dari "resep potongan" JSON: `[{"start": 48, "end": 51, "text": "...", "vo": "..."}]`.
Urutan baris = urutan di video hasil. Opsi: teks overlay (atas-tengah), VO per segmen (TTS yang sama dengan mode lain,
auto dipercepat maks 1.2x atau segmen diperpanjang kalau VO kepanjangan), audio asli, musik latar. Emoji dibuang otomatis.


## CutRecipe Studio
Jendela satu aplikasi dengan sidebar: **CutRecipe Studio**, **Batch (Excel)**, **Manual**.
Studio: perpustakaan preset di kiri (Teks, Transisi, Efek, Filter dengan thumbnail, Adjustment), preview frame + timeline hasil di tengah, kartu segmen di kanan.
Suara VO dipilih sekali di bar atas dan dipakai semua segmen (VO yang sama di-cache). Mode hemat: ffmpeg berprioritas rendah dan thread dibatasi.
Katalog preset ada di `modules/cut_catalog.py` (tambah entri = tambah pilihan baru).
Perlu ffmpeg build "full" (misal gyan.dev) dan ffprobe di PATH.
