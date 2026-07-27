# AIOS Auto Editor v1.0 — Batch Video Editor

Aplikasi lokal Windows untuk mengedit satu folder video menjadi video affiliate vertikal secara batch.

## Fitur MVP

- Scan seluruh video dalam satu folder.
- Queue batch dan progress.
- Resize/pad otomatis ke 1080×1920.
- Hook, benefit, dan CTA sebagai subtitle bergaya.
- Voice-over lokal memakai suara Windows (`System.Speech`).
- Musik latar opsional.
- 1–5 varian output per video.
- Penamaan output otomatis.
- Tidak membutuhkan API AI atau server cloud.
- Semua file tetap berada di komputer pengguna.

## Instalasi Windows

1. Pastikan Node.js sudah terpasang.
2. Klik `install-ffmpeg.bat`.
3. Tutup dan buka kembali Command Prompt setelah FFmpeg selesai diinstal.
4. Klik `start-windows.bat`.
5. Buka `http://localhost:4174`.

## Penggunaan

1. Buat folder berisi video mentah.
2. Masukkan path folder ke **Folder video mentah**.
3. Tentukan folder output.
4. Isi hook, benefit, dan CTA.
5. Klik **Scan**.
6. Klik **Start Production**.
7. Tunggu seluruh antrean selesai.

## Pola nama file

- `{base}`: nama file asli tanpa ekstensi
- `{index}`: urutan video
- `{variant}`: nomor varian

Contoh: `{base}_AIOS_{index}_v{variant}`

## Status arsitektur

Fondasi v1.0 sudah berjalan sebagai batch renderer. Sprint selanjutnya akan mengubah editor menjadi Creative Director dengan pipeline:

`Raw Video → Scene Analyzer → Marketing Analyzer → Editing Planner → Subtitle Engine → Voice Engine → Motion Engine → QC → Export`

## Keterbatasan v1.0

- Subtitle berasal dari naskah template, belum mentranskripsi ucapan pada video.
- Template naskah masih berlaku untuk seluruh batch.
- Belum membaca link produk atau Excel.
- Belum memiliki scene-aware marketing analysis.
- Voice-over tergantung suara yang tersedia di Windows.

## Roadmap

### Sprint 2 — Editing Intelligence
- Scene Analyzer
- Marketing Analyzer
- Subtitle Planner
- Motion Planner
- Voice Planner

### Sprint 3 — Advanced Editing
- Scene-aware timing
- Dynamic subtitle layout
- Automatic zoom
- Product detail highlight
- Audio ducking
- Sound effects
- TikTok, Shopee, dan Meta presets

### Sprint 4 — Batch Affiliate Production
- Excel/CSV importer
- Per-video scripts
- Product links
- Automatic hook variants
- Multi-variant batch production
- Quality scoring dan re-edit loop
