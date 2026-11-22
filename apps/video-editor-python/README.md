# Video Editor AI (Python / CustomTkinter)

Aplikasi desktop Windows untuk produksi video produk otomatis: VO Indonesia (Gemini / Azure TTS), auto-cut,
foto→video, subtitle Whisper, hook text, watermark, color grade, batch dari Excel, mode Manual dengan formula
copywriting (Hook-Benefit-CTA / PAS / AIDA), dan **CutRecipe Studio** (editor segmen dengan preview GPU realtime).

## Setup
1. `python -m venv venv`, aktifkan, lalu `pip install -r requirements.txt`
   (sudah termasuk `moderngl`, `av`, `sounddevice` untuk preview GPU + suara).
2. Untuk Whisper di GPU: `pip install torch --index-url https://download.pytorch.org/whl/cu126`
3. Salin `credentials.example.py` jadi `credentials.py`, isi API key.
4. Install ffmpeg build **full** (misal gyan.dev) dan taruh paling depan di PATH. Butuh `h264_nvenc`
   (fallback otomatis ke libx264) dan `ffprobe`. Cek: `where.exe ffmpeg`.
5. Jalankan `Buka_Video_Editor.bat` (atau `python gui_app.py`).

Kartu grafis NVIDIA dengan driver terbaru dianjurkan. Kalau preview GPU gagal dibuka, pesan error tampil di area
preview; tombol Ekspor tetap jalan lewat ffmpeg.

## Layout
Satu jendela dengan sidebar kiri: **CutRecipe Studio**, **Batch (Excel)**, **Manual**. Panel Log bisa dibuka dari bawah.

## CutRecipe Studio
Susun ulang satu video mentah jadi video pendek dari potongan-potongan ("segmen").

**Tata letak**
- Kiri: perpustakaan preset — tab **Teks**, **Transisi**, **Efek**, **Filter** (thumbnail), **Adjust** (slider).
- Tengah: pemutar preview, timeline hasil (warna per segmen), panel audio.
- Kanan: kartu segmen (waktu mulai-akhir, teks, VO, transisi, efek).
- Bar atas: pilih video, **Suara VO** (satu pilihan untuk semua segmen), AI VO, Putar dengan VO, nama hasil, Mode hemat, **Ekspor**.

**Alur pakai**
1. **Pilih Video** mentahnya.
2. Isi segmen: tombol **+ Segmen**, atau **Tempel Resep** (JSON/teks: `[{"start": 48, "end": 51, "text": "...", "vo": "..."}]`).
   Urutan kartu = urutan di video hasil; panah untuk memindah, X untuk hapus, **Lihat** untuk loncat ke segmen itu.
3. Pilih segmen (klik kartunya), lalu klik preset:
   - **Gaya teks**: teks langsung terlihat di frame. Font, ukuran, posisi, tebal, kotak, fade bisa diatur di bawahnya.
   - **Transisi / Efek**: potongan pendek di sekitar segmen diputar berulang supaya langsung kelihatan.
     Centang "terapkan ke semua segmen" untuk menerapkan sekaligus.
   - **Filter** + slider intensitas, dan **Adjust** (suhu, eksposur, kontras, dst). Ada jeda sekitar 0,4 detik sebelum warna terpasang.
4. **Putar / Jeda**: tombol Putar atau geser timeline. Suara dicampur dulu sebentar ("Menyiapkan suara...").
   Kotak **Putar dengan VO**: VO AI ikut dibuat (memakai kuota Gemini, hasil di-cache). Kalau mati, VO AI tidak ikut diputar.
5. Panel audio: **Audio Asli**, **Mute**, atau **Musik Latar** (pilih file + volume); **Voiceover terpisah** untuk satu file VO utuh.
6. **Caption otomatis (Whisper)**: opsional, dibuat saat Ekspor.
7. Isi nama file lalu **Ekspor**. Hasil masuk folder `output`.

**Aturan yang perlu diketahui**
- VO yang lebih panjang dari segmen: dipercepat maksimal 1,2x, lalu segmen diperpanjang kalau masih kurang.
- Emoji di teks dibuang otomatis.
- Pemutar tidak menampilkan caption otomatis dan tidak menyamakan loudness; keduanya baru ada di hasil Ekspor.
- **Ekspor** memakai mesin GPU yang sama dengan pemutar (frame digambar di GPU, di-encode NVENC), jadi hasilnya sama dengan preview.
  Kalau GPU/encoder gagal, otomatis pindah ke jalur ffmpeg biasa.
- **Mode hemat**: proses berprioritas rendah dan thread dibatasi supaya PC tetap lancar dipakai kerja lain.
- Katalog preset ada di `modules/cut_catalog.py` (tambah entri = tambah pilihan baru).

**Troubleshooting**
- "Preview GPU tidak tersedia / No module named 'av'": `venv\Scripts\python.exe -m pip install moderngl av` (pakai python milik venv aplikasi).
- Tidak ada suara di pemutar: `venv\Scripts\python.exe -m pip install sounddevice`.
- Suara VO tidak muncul: pastikan **AI VO** dicentang, ada teks di kolom VO tiap segmen, dan **Putar dengan VO** dicentang.

## Batch (Excel)
Isi `products.xlsx` (satu baris per produk), taruh foto/video di `input`, atur opsi di panel, klik **Mulai Proses**.
Hasil masuk `output`.

## Manual
Satu produk per proses: pilih media, isi data produk, pilih formula copywriting (Hook-Benefit-CTA / PAS / AIDA), klik **Mulai Proses**.
