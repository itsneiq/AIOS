# gui_app.py
import os
import sys
import queue
import threading
import customtkinter as ctk
from tkinter import filedialog, messagebox

from modules.csv_loader import load_product_list
from modules.subtitle_gen import build_custom_style
from modules.effects import COLOR_GRADE_PRESETS
from modules.script_formula import FORMULAS, get_formula_parts
from batch_process import process_one_product
from manual_process import process_manual
from batch_process import generate_audio
from modules.cut_recipe import (
    parse_recipe, recipe_total_duration, render_cut_recipe, DEFAULT_RECIPE, recipe_to_lines,
)
import json
from config import (VOICE_OPTIONS, SUBTITLE_STYLES, FONT_OPTIONS, COLOR_OPTIONS, OUTPUT_DIR,
                    GEMINI_API_KEYS, AZURE_SPEECH_KEY)

ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")

POSITION_OPTIONS = {
    "Bawah": {"alignment": 2, "margin_v": 80},
    "Tengah": {"alignment": 5, "margin_v": 0},
    "Atas": {"alignment": 8, "margin_v": 60},
}

WATERMARK_POSITION_LIST = ["Kiri Atas", "Kanan Atas", "Kiri Bawah", "Kanan Bawah", "Tengah"]
COLOR_GRADE_LIST = list(COLOR_GRADE_PRESETS.keys())
FORMULA_LABELS = {v["label"]: k for k, v in FORMULAS.items()}


TAB_HEIGHT_BATCH = 165
TAB_HEIGHT_MANUAL = 470
WINDOW_HEIGHT_BATCH = 800
WINDOW_HEIGHT_MANUAL = 1010
TAB_HEIGHT_CUTRECIPE = 400
WINDOW_HEIGHT_CUTRECIPE = 960
TAB_BATCH = "Batch (dari Excel)"
TAB_MANUAL = "Manual (1 Produk)"
TAB_CUT = "CutRecipe (Potong Ulang)"


class TextRedirector:
    def __init__(self, log_queue):
        self.log_queue = log_queue

    def write(self, text):
        if text:
            self.log_queue.put(text)

    def flush(self):
        pass


class VideoEditorApp(ctk.CTk):
    def __init__(self):
        super().__init__()

        self.title("AI Video Editor")
        self.geometry(f"1050x{WINDOW_HEIGHT_BATCH}")
        self.minsize(900, 700)

        self.excel_path = ctk.StringVar(value="products.xlsx")
        self.watermark_path_var = ctk.StringVar(value="assets/watermark/logo.png")
        self.manual_media_paths = []
        self.cut_video_path = None
        self.cut_music_path = None
        self.part_entries = {}
        self.log_queue = queue.Queue()
        self.is_processing = False

        self.voice_map = {opt["label"]: opt for opt in VOICE_OPTIONS.values()}
        self.style_keys = list(SUBTITLE_STYLES.keys())
        self.font_list = list(FONT_OPTIONS.values())
        self.color_map = {c["label"]: c["hex"] for c in COLOR_OPTIONS.values() if c["hex"] is not None}
        self.color_list = list(self.color_map.keys()) + ["Custom (hex manual)"]

        self._build_ui()
        self.after(100, self._poll_log_queue)

    # ==========================================================
    # UI BUILDER
    # ==========================================================
    def _build_ui(self):
        self.tabview = ctk.CTkTabview(self, height=TAB_HEIGHT_BATCH, command=self._on_tab_change)
        self.tabview.pack(padx=15, pady=(15, 5), fill="x")
        self.tab_batch = self.tabview.add(TAB_BATCH)
        self.tab_manual = self.tabview.add(TAB_MANUAL)
        self.tab_cut = self.tabview.add(TAB_CUT)

        self._build_batch_tab()
        self._build_manual_tab()
        self._build_cutrecipe_tab()
        self.tabview.set(TAB_BATCH)
        self.tabview.configure(height=TAB_HEIGHT_BATCH)

        self.settings_scroll = ctk.CTkScrollableFrame(self, height=280)
        self.settings_scroll.pack(padx=15, pady=5, fill="both", expand=True)
        self._build_voice_section()
        self._build_subtitle_section()
        self._build_hook_section()
        self._build_effects_section()

        # Panggil refresh SETELAH semua section kebentuk, biar referensi "before="
        # (label_hook_section, label_effects_section) udah pasti ada
        self._refresh_subtitle_controls()
        self._refresh_hook_controls()

        self.btn_start = ctk.CTkButton(
            self, text="Mulai Proses", height=42,
            font=ctk.CTkFont(size=15, weight="bold"),
            command=self._start_processing,
        )
        self.btn_start.pack(pady=(5, 3))

        self.progress_label = ctk.CTkLabel(self, text="Siap memulai.")
        self.progress_label.pack(pady=(0, 3))

        self.log_box = ctk.CTkTextbox(self, height=170, font=ctk.CTkFont(family="Consolas", size=12))
        self.log_box.pack(padx=15, pady=(3, 15), fill="both", expand=True)

    def _on_tab_change(self):
        """Tinggi tab + window menyesuaikan isi tab yang aktif."""
        current = self.tabview.get()
        tab_h, win_h = {
            TAB_BATCH: (TAB_HEIGHT_BATCH, WINDOW_HEIGHT_BATCH),
            TAB_MANUAL: (TAB_HEIGHT_MANUAL, WINDOW_HEIGHT_MANUAL),
            TAB_CUT: (TAB_HEIGHT_CUTRECIPE, WINDOW_HEIGHT_CUTRECIPE),
        }[current]
        self.tabview.configure(height=tab_h)
        self.geometry(f"{self.winfo_width()}x{win_h}")

    # ---------- TAB BATCH ----------
    def _build_batch_tab(self):
        f = ctk.CTkFrame(self.tab_batch)
        f.pack(fill="x", padx=10, pady=15)
        ctk.CTkLabel(f, text="File Excel produk:").pack(side="left", padx=(10, 5), pady=10)
        ctk.CTkEntry(f, textvariable=self.excel_path).pack(side="left", padx=5, pady=10, fill="x", expand=True)
        ctk.CTkButton(f, text="Browse...", width=90, command=self._browse_excel).pack(side="left", padx=(5, 10), pady=10)

        ctk.CTkLabel(
            self.tab_batch,
            text="Mode Batch: semua produk di Excel diproses otomatis.\n"
                 "Naskah, formula copywriting, dan durasi ditentukan otomatis oleh AI.",
            justify="left", text_color="gray",
        ).pack(anchor="w", padx=20, pady=(0, 10))

    # ---------- TAB CUTRECIPE ----------
    def _build_cutrecipe_tab(self):
        t = self.tab_cut
        f1 = ctk.CTkFrame(t)
        f1.pack(fill="x", padx=5, pady=(5, 4))
        ctk.CTkButton(f1, text="Pilih Video Mentah...", width=160,
                      command=self._browse_cut_video).pack(side="left", padx=10, pady=8)
        ctk.CTkButton(f1, text="Buka CutRecipe Studio", width=170, fg_color="#16a34a", hover_color="#15803d",
                      command=self._open_studio).pack(side="left", padx=5, pady=8)
        self.label_cut_video = ctk.CTkLabel(f1, text="Belum ada video dipilih", text_color="gray")
        self.label_cut_video.pack(side="left", padx=5, pady=8)
        ctk.CTkLabel(f1, text="Output:").pack(side="left", padx=(20, 5), pady=8)
        self.entry_cut_output = ctk.CTkEntry(f1, placeholder_text="misal kulkas_20detik.mp4", width=220)
        self.entry_cut_output.pack(side="left", padx=5, pady=8, fill="x", expand=True)

        f2 = ctk.CTkFrame(t)
        f2.pack(fill="both", expand=True, padx=5, pady=4)
        head = ctk.CTkFrame(f2, fg_color="transparent")
        head.pack(fill="x", padx=8, pady=(6, 0))
        ctk.CTkLabel(head, text="Resep: satu potongan per baris  ->  mulai-selesai | teks layar | teks VO   (urutan = urutan di video hasil)",
                     anchor="w").pack(side="left")
        ctk.CTkButton(head, text="Cek Resep", width=90, command=self._check_recipe).pack(side="right", padx=(5, 0))
        ctk.CTkButton(head, text="Muat Contoh", width=100, fg_color="gray30",
                      command=self._load_example_recipe).pack(side="right", padx=5)
        self.text_recipe = ctk.CTkTextbox(f2, height=140, font=ctk.CTkFont(family="Consolas", size=12))
        self.text_recipe.pack(fill="both", expand=True, padx=8, pady=6)
        self._load_example_recipe()

        f3 = ctk.CTkFrame(t)
        f3.pack(fill="x", padx=5, pady=4)
        self.cut_vo_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(f3, text="Tambah VO per segmen (pakai pilihan Suara VO di bawah; audio asli dimatikan)",
                        variable=self.cut_vo_var).grid(row=0, column=0, columnspan=4, sticky="w", padx=10, pady=(8, 2))
        self.cut_keep_audio_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(f3, text="Pakai audio asli video (kalau VO mati)",
                        variable=self.cut_keep_audio_var).grid(row=1, column=0, columnspan=2, sticky="w", padx=10, pady=2)
        ctk.CTkButton(f3, text="Musik latar...", width=110, command=self._browse_cut_music).grid(
            row=2, column=0, sticky="w", padx=10, pady=(2, 8))
        self.label_cut_music = ctk.CTkLabel(f3, text="Tanpa musik", text_color="gray")
        self.label_cut_music.grid(row=2, column=1, sticky="w", padx=5, pady=(2, 8))
        ctk.CTkLabel(f3, text="Volume musik (%):").grid(row=2, column=2, sticky="e", padx=(20, 5), pady=(2, 8))
        self.entry_cut_music_vol = ctk.CTkEntry(f3, width=60)
        self.entry_cut_music_vol.insert(0, "20")
        self.entry_cut_music_vol.grid(row=2, column=3, sticky="w", padx=5, pady=(2, 8))

        f4 = ctk.CTkFrame(t)
        f4.pack(fill="x", padx=5, pady=(4, 5))
        ctk.CTkLabel(f4, text="Teks overlay:").pack(side="left", padx=(10, 5), pady=8)
        self.combo_cut_font = ctk.CTkComboBox(f4, values=self.font_list, width=140)
        self.combo_cut_font.set("Arial Black" if "Arial Black" in self.font_list else self.font_list[0])
        self.combo_cut_font.pack(side="left", padx=4, pady=8)
        ctk.CTkLabel(f4, text="Ukuran %:").pack(side="left", padx=(12, 3), pady=8)
        self.entry_cut_size = ctk.CTkEntry(f4, width=50)
        self.entry_cut_size.insert(0, "3.6")
        self.entry_cut_size.pack(side="left", padx=3, pady=8)
        ctk.CTkLabel(f4, text="Posisi dari atas %:").pack(side="left", padx=(12, 3), pady=8)
        self.entry_cut_top = ctk.CTkEntry(f4, width=50)
        self.entry_cut_top.insert(0, "25")
        self.entry_cut_top.pack(side="left", padx=3, pady=8)
        ctk.CTkLabel(f4, text="Warna:").pack(side="left", padx=(12, 3), pady=8)
        names = list(self.color_map.keys())
        self.combo_cut_color = ctk.CTkComboBox(f4, values=names, width=110)
        self.combo_cut_color.set(names[0])
        self.combo_cut_color.pack(side="left", padx=3, pady=8)

    def make_redirector(self):
        return TextRedirector(self.log_queue)

    def _studio_tts_factory(self):
        voice_option = self.voice_map.get(self.combo_voice.get())
        prev = self.cut_vo_var.get()
        self.cut_vo_var.set(True)
        try:
            problem = self._check_credentials(TAB_CUT, voice_option)
        finally:
            self.cut_vo_var.set(prev)
        if problem:
            messagebox.showerror("Belum siap", problem)
            return None
        return lambda text, path: generate_audio(text, path, voice_option)

    def _open_studio(self):
        if not self.cut_video_path or not os.path.exists(self.cut_video_path):
            messagebox.showerror("Error", "Pilih dulu video mentahnya.")
            return
        try:
            segs = parse_recipe(self.text_recipe.get("1.0", "end"))
        except ValueError:
            segs = None
        from modules.cut_studio import CutStudio
        try:
            CutStudio(self, self.cut_video_path, OUTPUT_DIR, os.path.join(OUTPUT_DIR, "_tmp"),
                      self._studio_tts_factory, self.font_list, self.color_map,
                      initial_segments=segs, output_name=self.entry_cut_output.get().strip())
        except Exception as e:
            messagebox.showerror("Studio gagal dibuka", str(e))

    def _browse_cut_video(self):
        path = filedialog.askopenfilename(filetypes=[("Video", "*.mp4 *.mov *.avi *.mkv *.webm")])
        if path:
            self.cut_video_path = path
            self.label_cut_video.configure(text=os.path.basename(path), text_color="white")

    def _browse_cut_music(self):
        path = filedialog.askopenfilename(filetypes=[("Audio", "*.mp3 *.wav *.m4a *.aac")])
        if path:
            self.cut_music_path = path
            self.label_cut_music.configure(text=os.path.basename(path), text_color="white")

    def _load_example_recipe(self):
        self.text_recipe.delete("1.0", "end")
        self.text_recipe.insert("1.0", recipe_to_lines(DEFAULT_RECIPE))

    def _check_recipe(self):
        try:
            segs = parse_recipe(self.text_recipe.get("1.0", "end"))
        except ValueError as e:
            messagebox.showerror("Resep tidak valid", str(e))
            return
        n_vo = sum(1 for s in segs if s["vo"])
        messagebox.showinfo(
            "Resep valid",
            f"{len(segs)} segmen, durasi hasil sekitar {recipe_total_duration(segs):.1f} detik.\n"
            f"{n_vo} segmen punya teks VO.\n"
            "(Kalau VO lebih panjang dari segmen, segmen otomatis diperpanjang.)")

    # ---------- TAB MANUAL ----------
    def _build_manual_tab(self):
        scroll = ctk.CTkScrollableFrame(self.tab_manual, height=420)
        scroll.pack(fill="both", expand=True, padx=5, pady=5)
        self.manual_scroll = scroll

        f_media = ctk.CTkFrame(scroll)
        f_media.pack(fill="x", pady=(0, 8))
        ctk.CTkButton(f_media, text="Pilih Video/Foto...", width=150,
                       command=self._browse_manual_media).pack(side="left", padx=10, pady=10)
        self.label_media = ctk.CTkLabel(f_media, text="Belum ada media dipilih", text_color="gray")
        self.label_media.pack(side="left", padx=10, pady=10)
        ctk.CTkLabel(f_media, text="Output:").pack(side="left", padx=(20, 5), pady=10)
        self.entry_manual_output = ctk.CTkEntry(f_media, placeholder_text="misal produk_baru.mp4", width=220)
        self.entry_manual_output.pack(side="left", padx=5, pady=10, fill="x", expand=True)

        f_formula = ctk.CTkFrame(scroll)
        f_formula.pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(f_formula, text="Formula:").pack(side="left", padx=10, pady=10)
        self.combo_formula = ctk.CTkComboBox(
            f_formula, values=list(FORMULA_LABELS.keys()), width=430,
            command=lambda _: self._rebuild_part_boxes(),
        )
        self.combo_formula.set(list(FORMULA_LABELS.keys())[0])
        self.combo_formula.pack(side="left", padx=5, pady=10, fill="x", expand=True)
        self.teks_final_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(f_formula, text="Teks Final (kotak = teks jadi)",
                         variable=self.teks_final_var, command=self._refresh_manual_mode).pack(
            side="left", padx=(10, 10), pady=10)

        self.frame_produk_info = ctk.CTkFrame(scroll)
        self.frame_produk_info.pack(fill="x", pady=(0, 8))
        ctk.CTkLabel(self.frame_produk_info, text="Judul produk:").grid(row=0, column=0, sticky="w", padx=10, pady=6)
        self.entry_judul = ctk.CTkEntry(self.frame_produk_info, width=400)
        self.entry_judul.grid(row=0, column=1, sticky="ew", padx=10, pady=6)
        ctk.CTkLabel(self.frame_produk_info, text="Deskripsi:").grid(row=1, column=0, sticky="nw", padx=10, pady=6)
        self.text_deskripsi = ctk.CTkTextbox(self.frame_produk_info, height=60)
        self.text_deskripsi.grid(row=1, column=1, sticky="ew", padx=10, pady=6)
        self.frame_produk_info.grid_columnconfigure(1, weight=1)

        self.frame_parts = ctk.CTkFrame(scroll)
        self.frame_parts.pack(fill="x", pady=(0, 8))

        self._rebuild_part_boxes()
        self._refresh_manual_mode()

    def _rebuild_part_boxes(self):
        for w in self.frame_parts.winfo_children():
            w.destroy()
        self.part_entries = {}

        formula_key = FORMULA_LABELS.get(self.combo_formula.get())
        if not formula_key:
            return

        is_final = self.teks_final_var.get()
        hint = "teks jadi yang akan diucapkan" if is_final else "instruksi buat AI (boleh dikosongkan)"

        ctk.CTkLabel(self.frame_parts, text=f"Isi bagian ({hint}):",
                      font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=10, pady=(8, 6))

        # Layout GRID: kotak-kotak sejajar horizontal (bukan numpuk ke bawah).
        # Kalau bagiannya banyak (misal AIDA = 4), otomatis dibagi 2 baris x 2 kolom.
        parts = get_formula_parts(formula_key)
        max_cols = 3 if len(parts) <= 3 else 2

        grid_frame = ctk.CTkFrame(self.frame_parts, fg_color="transparent")
        grid_frame.pack(fill="x", padx=8, pady=(0, 10))
        for col in range(max_cols):
            grid_frame.grid_columnconfigure(col, weight=1, uniform="part_col")

        for idx, p in enumerate(parts):
            row_idx = idx // max_cols
            col_idx = idx % max_cols

            cell = ctk.CTkFrame(grid_frame)
            cell.grid(row=row_idx, column=col_idx, padx=6, pady=6, sticky="nsew")

            ctk.CTkLabel(cell, text=p["label"], font=ctk.CTkFont(weight="bold")).pack(
                anchor="w", padx=10, pady=(8, 4))
            entry = ctk.CTkTextbox(cell, height=90)
            entry.pack(padx=10, pady=(0, 10), fill="both", expand=True)
            self.part_entries[p["key"]] = entry

    def _refresh_manual_mode(self):
        if self.teks_final_var.get():
            self.frame_produk_info.pack_forget()
        else:
            self.frame_produk_info.pack(fill="x", pady=(0, 8), before=self.frame_parts)
        self._rebuild_part_boxes()

    # ---------- SETTINGS (dipakai kedua mode) ----------
    def _build_voice_section(self):
        ctk.CTkLabel(self.settings_scroll, text="-- Suara & Durasi --",
                      font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=5, pady=(5, 0))

        f = ctk.CTkFrame(self.settings_scroll)
        f.pack(fill="x", pady=(5, 5))
        ctk.CTkLabel(f, text="Suara VO:").pack(side="left", padx=10, pady=10)
        voice_labels = list(self.voice_map.keys())
        self.combo_voice = ctk.CTkComboBox(f, values=voice_labels, width=420)
        gemini_labels = [lbl for lbl in voice_labels if "Gemini" in lbl]
        self.combo_voice.set(gemini_labels[0] if gemini_labels else voice_labels[0])
        self.combo_voice.pack(side="left", padx=10, pady=10, fill="x", expand=True)

        f2 = ctk.CTkFrame(self.settings_scroll)
        f2.pack(fill="x", pady=(0, 10))
        self.set_duration_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(f2, text="Atur Durasi VO Manual", variable=self.set_duration_var,
                         command=self._toggle_duration_entry).pack(side="left", padx=10, pady=10)
        ctk.CTkLabel(f2, text="Target (detik):").pack(side="left", padx=(20, 5), pady=10)
        self.entry_duration = ctk.CTkEntry(f2, width=80)
        self.entry_duration.insert(0, "20")
        self.entry_duration.configure(state="disabled")
        self.entry_duration.pack(side="left", padx=5, pady=10)

    def _build_subtitle_section(self):
        ctk.CTkLabel(self.settings_scroll, text="-- Subtitle --",
                      font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=5, pady=(5, 0))

        ft = ctk.CTkFrame(self.settings_scroll)
        ft.pack(fill="x", pady=(5, 5))
        self.subtitle_on_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(ft, text="Tampilkan Subtitle", variable=self.subtitle_on_var,
                         command=self._refresh_subtitle_controls).pack(side="left", padx=10, pady=10)
        self.use_custom_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(ft, text="Pakai gaya CUSTOM", variable=self.use_custom_var,
                         command=self._refresh_subtitle_controls).pack(side="left", padx=20, pady=10)

        self.frame_preset = ctk.CTkFrame(self.settings_scroll)
        self.frame_preset.pack(fill="x", pady=(0, 10))
        ctk.CTkLabel(self.frame_preset, text="Preset gaya:").pack(side="left", padx=10, pady=10)
        self.combo_style = ctk.CTkComboBox(self.frame_preset, values=self.style_keys, width=400)
        self.combo_style.set("simple")
        self.combo_style.pack(side="left", padx=10, pady=10, fill="x", expand=True)

        self.frame_custom = ctk.CTkFrame(self.settings_scroll)
        self.frame_custom.pack(fill="x", pady=(0, 10))
        self.frame_custom.grid_columnconfigure(1, weight=1)
        self.frame_custom.grid_columnconfigure(3, weight=1)

        ctk.CTkLabel(self.frame_custom, text="Font:").grid(row=0, column=0, sticky="w", padx=10, pady=8)
        self.combo_font = ctk.CTkComboBox(self.frame_custom, values=self.font_list, width=180)
        self.combo_font.set(self.font_list[0])
        self.combo_font.grid(row=0, column=1, sticky="w", padx=10, pady=8)

        ctk.CTkLabel(self.frame_custom, text="Ukuran (px):").grid(row=0, column=2, sticky="w", padx=10, pady=8)
        self.entry_size = ctk.CTkEntry(self.frame_custom, width=80)
        self.entry_size.insert(0, "16")
        self.entry_size.grid(row=0, column=3, sticky="w", padx=10, pady=8)

        ctk.CTkLabel(self.frame_custom, text="Warna teks:").grid(row=1, column=0, sticky="w", padx=10, pady=8)
        self.combo_text_color = ctk.CTkComboBox(self.frame_custom, values=self.color_list, width=180,
                                                  command=lambda v: self._toggle_hex_entry(v, self.entry_text_hex))
        self.combo_text_color.set("Putih")
        self.combo_text_color.grid(row=1, column=1, sticky="w", padx=10, pady=8)
        self.entry_text_hex = ctk.CTkEntry(self.frame_custom, width=100, placeholder_text="FF5733")
        self.entry_text_hex.grid(row=1, column=1, sticky="e", padx=10, pady=8)
        self.entry_text_hex.grid_remove()

        ctk.CTkLabel(self.frame_custom, text="Warna outline:").grid(row=1, column=2, sticky="w", padx=10, pady=8)
        self.combo_outline_color = ctk.CTkComboBox(self.frame_custom, values=self.color_list, width=180,
                                                     command=lambda v: self._toggle_hex_entry(v, self.entry_outline_hex))
        self.combo_outline_color.set("Hitam")
        self.combo_outline_color.grid(row=1, column=3, sticky="w", padx=10, pady=8)
        self.entry_outline_hex = ctk.CTkEntry(self.frame_custom, width=100, placeholder_text="000000")
        self.entry_outline_hex.grid(row=1, column=3, sticky="e", padx=10, pady=8)
        self.entry_outline_hex.grid_remove()

        ctk.CTkLabel(self.frame_custom, text="Posisi:").grid(row=2, column=0, sticky="w", padx=10, pady=8)
        self.combo_position = ctk.CTkComboBox(self.frame_custom, values=list(POSITION_OPTIONS.keys()), width=180)
        self.combo_position.set("Bawah")
        self.combo_position.grid(row=2, column=1, sticky="w", padx=10, pady=8)

        self.bold_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(self.frame_custom, text="Bold", variable=self.bold_var).grid(
            row=2, column=2, sticky="w", padx=10, pady=8)

    def _build_hook_section(self):
        self.label_hook_section = ctk.CTkLabel(self.settings_scroll, text="-- Hook Text --",
                                                 font=ctk.CTkFont(weight="bold"))
        self.label_hook_section.pack(anchor="w", padx=5, pady=(10, 0))

        ft = ctk.CTkFrame(self.settings_scroll)
        ft.pack(fill="x", pady=(5, 5))
        self.hook_on_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(ft, text="Aktifkan Hook Text (kalimat pertama, gaya beda)",
                         variable=self.hook_on_var, command=self._refresh_hook_controls).pack(
            side="left", padx=10, pady=10)

        self.frame_hook = ctk.CTkFrame(self.settings_scroll)
        self.frame_hook.pack(fill="x", pady=(0, 10))
        self.frame_hook.grid_columnconfigure(1, weight=1)
        self.frame_hook.grid_columnconfigure(3, weight=1)

        ctk.CTkLabel(self.frame_hook, text="Font:").grid(row=0, column=0, sticky="w", padx=10, pady=8)
        self.combo_hook_font = ctk.CTkComboBox(self.frame_hook, values=self.font_list, width=180)
        self.combo_hook_font.set("Arial Black")
        self.combo_hook_font.grid(row=0, column=1, sticky="w", padx=10, pady=8)

        ctk.CTkLabel(self.frame_hook, text="Ukuran (px):").grid(row=0, column=2, sticky="w", padx=10, pady=8)
        self.entry_hook_size = ctk.CTkEntry(self.frame_hook, width=80)
        self.entry_hook_size.insert(0, "22")
        self.entry_hook_size.grid(row=0, column=3, sticky="w", padx=10, pady=8)

        ctk.CTkLabel(self.frame_hook, text="Warna teks:").grid(row=1, column=0, sticky="w", padx=10, pady=8)
        self.combo_hook_text_color = ctk.CTkComboBox(self.frame_hook, values=self.color_list, width=180,
                                                       command=lambda v: self._toggle_hex_entry(v, self.entry_hook_text_hex))
        self.combo_hook_text_color.set("Putih")
        self.combo_hook_text_color.grid(row=1, column=1, sticky="w", padx=10, pady=8)
        self.entry_hook_text_hex = ctk.CTkEntry(self.frame_hook, width=100, placeholder_text="FF5733")
        self.entry_hook_text_hex.grid(row=1, column=1, sticky="e", padx=10, pady=8)
        self.entry_hook_text_hex.grid_remove()

        ctk.CTkLabel(self.frame_hook, text="Warna outline:").grid(row=1, column=2, sticky="w", padx=10, pady=8)
        self.combo_hook_outline_color = ctk.CTkComboBox(self.frame_hook, values=self.color_list, width=180,
                                                          command=lambda v: self._toggle_hex_entry(v, self.entry_hook_outline_hex))
        self.combo_hook_outline_color.set("Hitam")
        self.combo_hook_outline_color.grid(row=1, column=3, sticky="w", padx=10, pady=8)
        self.entry_hook_outline_hex = ctk.CTkEntry(self.frame_hook, width=100, placeholder_text="000000")
        self.entry_hook_outline_hex.grid(row=1, column=3, sticky="e", padx=10, pady=8)
        self.entry_hook_outline_hex.grid_remove()

        ctk.CTkLabel(self.frame_hook, text="Posisi:").grid(row=2, column=0, sticky="w", padx=10, pady=8)
        self.combo_hook_position = ctk.CTkComboBox(self.frame_hook, values=list(POSITION_OPTIONS.keys()), width=180)
        self.combo_hook_position.set("Tengah")
        self.combo_hook_position.grid(row=2, column=1, sticky="w", padx=10, pady=8)

        self.hook_bold_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(self.frame_hook, text="Bold", variable=self.hook_bold_var).grid(
            row=2, column=2, sticky="w", padx=10, pady=8)

    def _build_effects_section(self):
        self.label_effects_section = ctk.CTkLabel(self.settings_scroll, text="-- Efek Visual --",
                                                    font=ctk.CTkFont(weight="bold"))
        self.label_effects_section.pack(anchor="w", padx=5, pady=(10, 0))

        f1 = ctk.CTkFrame(self.settings_scroll)
        f1.pack(fill="x", pady=(5, 5))
        self.zoom_punch_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(f1, text="Zoom Punch-in di awal", variable=self.zoom_punch_var).pack(
            side="left", padx=10, pady=10)
        self.transition_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(f1, text="Transisi Fade antar klip", variable=self.transition_var).pack(
            side="left", padx=20, pady=10)

        f2 = ctk.CTkFrame(self.settings_scroll)
        f2.pack(fill="x", pady=(0, 5))
        ctk.CTkLabel(f2, text="Filter Warna:").pack(side="left", padx=10, pady=10)
        self.combo_color_grade = ctk.CTkComboBox(f2, values=COLOR_GRADE_LIST, width=200)
        self.combo_color_grade.set("none")
        self.combo_color_grade.pack(side="left", padx=10, pady=10)

        f3 = ctk.CTkFrame(self.settings_scroll)
        f3.pack(fill="x", pady=(0, 5))
        self.watermark_on_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(f3, text="Watermark", variable=self.watermark_on_var,
                         command=self._refresh_watermark_controls).pack(side="left", padx=10, pady=10)
        self.watermark_type_var = ctk.StringVar(value="image")
        ctk.CTkRadioButton(f3, text="Gambar", variable=self.watermark_type_var, value="image",
                            command=self._refresh_watermark_controls).pack(side="left", padx=(20, 5), pady=10)
        ctk.CTkRadioButton(f3, text="Teks", variable=self.watermark_type_var, value="text",
                            command=self._refresh_watermark_controls).pack(side="left", padx=5, pady=10)
        self.combo_watermark_pos = ctk.CTkComboBox(f3, values=WATERMARK_POSITION_LIST, width=150)
        self.combo_watermark_pos.set("Kanan Bawah")
        self.combo_watermark_pos.pack(side="right", padx=10, pady=10)

        self.frame_wm_image = ctk.CTkFrame(self.settings_scroll)
        self.frame_wm_image.pack(fill="x", pady=(0, 5))
        ctk.CTkLabel(self.frame_wm_image, text="File logo:").pack(side="left", padx=10, pady=10)
        ctk.CTkEntry(self.frame_wm_image, textvariable=self.watermark_path_var).pack(
            side="left", padx=5, pady=10, fill="x", expand=True)
        ctk.CTkButton(self.frame_wm_image, text="Browse...", width=90,
                       command=self._browse_watermark).pack(side="left", padx=5, pady=10)

        self.frame_wm_text = ctk.CTkFrame(self.settings_scroll)
        self.frame_wm_text.pack(fill="x", pady=(0, 10))
        ctk.CTkLabel(self.frame_wm_text, text="Teks watermark:").pack(side="left", padx=10, pady=10)
        self.entry_watermark_text = ctk.CTkEntry(self.frame_wm_text, placeholder_text="misal @tokolu")
        self.entry_watermark_text.pack(side="left", padx=5, pady=10, fill="x", expand=True)

        self._refresh_watermark_controls()

    # ==========================================================
    # HELPERS
    # ==========================================================
    def _refresh_hook_controls(self):
        if self.hook_on_var.get():
            self.frame_hook.pack(fill="x", pady=(0, 10), before=self.label_effects_section)
        else:
            self.frame_hook.pack_forget()

    def _refresh_watermark_controls(self):
        if not self.watermark_on_var.get():
            self.frame_wm_image.pack_forget()
            self.frame_wm_text.pack_forget()
            return
        if self.watermark_type_var.get() == "image":
            self.frame_wm_text.pack_forget()
            self.frame_wm_image.pack(fill="x", pady=(0, 5))
        else:
            self.frame_wm_image.pack_forget()
            self.frame_wm_text.pack(fill="x", pady=(0, 10))

    def _refresh_subtitle_controls(self):
        if not self.subtitle_on_var.get():
            self.frame_preset.pack_forget()
            self.frame_custom.pack_forget()
            return
        if self.use_custom_var.get():
            self.frame_preset.pack_forget()
            self.frame_custom.pack(fill="x", pady=(0, 10), before=self.label_hook_section)
        else:
            self.frame_custom.pack_forget()
            self.frame_preset.pack(fill="x", pady=(0, 10), before=self.label_hook_section)

    def _toggle_duration_entry(self):
        self.entry_duration.configure(state="normal" if self.set_duration_var.get() else "disabled")

    def _toggle_hex_entry(self, selected_value, entry_widget):
        if selected_value == "Custom (hex manual)":
            entry_widget.grid()
        else:
            entry_widget.grid_remove()

    def _browse_excel(self):
        path = filedialog.askopenfilename(filetypes=[("Excel files", "*.xlsx")])
        if path:
            self.excel_path.set(path)

    def _browse_watermark(self):
        path = filedialog.askopenfilename(filetypes=[("Image files", "*.png *.jpg *.jpeg")])
        if path:
            self.watermark_path_var.set(path)

    def _browse_manual_media(self):
        paths = filedialog.askopenfilenames(
            filetypes=[("Video/Foto", "*.mp4 *.mov *.avi *.mkv *.jpg *.jpeg *.png")])
        if paths:
            self.manual_media_paths = list(paths)
            names = ", ".join(os.path.basename(p) for p in self.manual_media_paths[:3])
            extra = f" (+{len(self.manual_media_paths) - 3} lagi)" if len(self.manual_media_paths) > 3 else ""
            self.label_media.configure(text=f"{len(self.manual_media_paths)} file: {names}{extra}",
                                        text_color="white")

    def _log(self, text):
        self.log_box.insert("end", text)
        self.log_box.see("end")

    def _poll_log_queue(self):
        while not self.log_queue.empty():
            self._log(self.log_queue.get_nowait())
        self.after(100, self._poll_log_queue)

    def _set_progress(self, text):
        self.after(0, lambda: self.progress_label.configure(text=text))

    def _get_color_hex(self, combo_widget, hex_entry_widget) -> str:
        selected = combo_widget.get()
        if selected == "Custom (hex manual)":
            val = hex_entry_widget.get().strip().lstrip("#")
            return val if val else "FFFFFF"
        return self.color_map.get(selected, "FFFFFF")

    def _build_custom_style_from_ui(self) -> dict:
        try:
            font_size = int(self.entry_size.get())
        except ValueError:
            font_size = 16
        pos = POSITION_OPTIONS.get(self.combo_position.get(), POSITION_OPTIONS["Bawah"])
        return build_custom_style(
            font_name=self.combo_font.get(),
            text_color_hex=self._get_color_hex(self.combo_text_color, self.entry_text_hex),
            outline_color_hex=self._get_color_hex(self.combo_outline_color, self.entry_outline_hex),
            font_size=font_size, bold=self.bold_var.get(),
            alignment=pos["alignment"], margin_v=pos["margin_v"], outline_width=3,
        )

    def _build_hook_style_from_ui(self) -> dict:
        try:
            font_size = int(self.entry_hook_size.get())
        except ValueError:
            font_size = 22
        pos = POSITION_OPTIONS.get(self.combo_hook_position.get(), POSITION_OPTIONS["Tengah"])
        return build_custom_style(
            font_name=self.combo_hook_font.get(),
            text_color_hex=self._get_color_hex(self.combo_hook_text_color, self.entry_hook_text_hex),
            outline_color_hex=self._get_color_hex(self.combo_hook_outline_color, self.entry_hook_outline_hex),
            font_size=font_size, bold=self.hook_bold_var.get(),
            alignment=pos["alignment"], margin_v=pos["margin_v"], outline_width=3,
        )

    def _collect_common_settings(self) -> dict:
        subtitle_on = self.subtitle_on_var.get()
        subtitle_style = "simple"
        if subtitle_on and self.use_custom_var.get():
            subtitle_style = self._build_custom_style_from_ui()
        elif subtitle_on:
            subtitle_style = self.combo_style.get()

        target_vo_duration = 20
        if self.set_duration_var.get():
            target_vo_duration = float(self.entry_duration.get())

        hook_on = self.hook_on_var.get()

        return dict(
            subtitle_on=subtitle_on,
            subtitle_style=subtitle_style,
            target_vo_duration=target_vo_duration,
            hook_on=hook_on,
            hook_style=self._build_hook_style_from_ui() if hook_on else None,
            watermark_enabled=self.watermark_on_var.get(),
            watermark_type=self.watermark_type_var.get(),
            watermark_path=self.watermark_path_var.get(),
            watermark_text=self.entry_watermark_text.get().strip(),
            watermark_position=self.combo_watermark_pos.get(),
            color_grade_preset=self.combo_color_grade.get(),
            zoom_punch_enabled=self.zoom_punch_var.get(),
            transition_enabled=self.transition_var.get(),
        )

    # ==========================================================
    # START PROCESSING
    # ==========================================================
    def _start_processing(self):
        if self.is_processing:
            messagebox.showinfo("Info", "Masih ada proses berjalan, tunggu sampai selesai.")
            return

        mode = self.tabview.get()

        try:
            settings = self._collect_common_settings()
        except ValueError:
            messagebox.showerror("Error", "Durasi VO harus berupa angka.")
            return

        if settings["watermark_enabled"]:
            if settings["watermark_type"] == "image" and not os.path.exists(settings["watermark_path"]):
                messagebox.showerror("Error", f"File watermark nggak ditemukan: {settings['watermark_path']}")
                return
            if settings["watermark_type"] == "text" and not settings["watermark_text"]:
                messagebox.showerror("Error", "Isi dulu teks watermark-nya.")
                return

        voice_option = self.voice_map.get(self.combo_voice.get())

        problem = self._check_credentials(mode, voice_option)
        if problem:
            messagebox.showerror("API key belum siap", problem)
            return

        if mode == TAB_BATCH:
            excel_path = self.excel_path.get()
            if not os.path.exists(excel_path):
                messagebox.showerror("Error", f"File Excel nggak ditemukan: {excel_path}")
                return
            target = self._run_batch
            args = (excel_path, voice_option, settings)
        elif mode == TAB_CUT:
            cut_args = self._collect_cut_args(voice_option)
            if cut_args is None:
                return
            target = self._run_cutrecipe
            args = (cut_args,)
        else:
            if not self.manual_media_paths:
                messagebox.showerror("Error", "Pilih dulu file video/foto-nya.")
                return

            nama_output = self.entry_manual_output.get().strip()
            if not nama_output:
                messagebox.showerror("Error", "Isi dulu nama file output-nya.")
                return

            formula_key = FORMULA_LABELS.get(self.combo_formula.get())
            teks_final = self.teks_final_var.get()
            part_values = {k: w.get("1.0", "end").strip() for k, w in self.part_entries.items()}

            judul = self.entry_judul.get().strip() if not teks_final else ""
            deskripsi = self.text_deskripsi.get("1.0", "end").strip() if not teks_final else ""

            if teks_final and not any(part_values.values()):
                messagebox.showerror("Error", "Isi minimal satu kotak teks final.")
                return
            if not teks_final and (not judul or not deskripsi):
                messagebox.showerror("Error", "Mode instruksi butuh Judul dan Deskripsi produk diisi.")
                return

            manual_args = dict(
                media_paths=self.manual_media_paths,
                nama_output=nama_output,
                voice_option=voice_option,
                formula_key=formula_key,
                part_values=part_values,
                teks_final=teks_final,
                judul_produk=judul,
                deskripsi_produk=deskripsi,
                **settings,
            )
            target = self._run_manual
            args = (manual_args,)

        self.is_processing = True
        self.btn_start.configure(state="disabled", text="Sedang Memproses...")
        self.log_box.delete("1.0", "end")

        threading.Thread(target=target, args=args, daemon=True).start()

    def _run_batch(self, excel_path, voice_option, settings):
        old_stdout = sys.stdout
        sys.stdout = TextRedirector(self.log_queue)
        try:
            products = load_product_list(excel_path)
            print(f"\nAkan memproses {len(products)} produk...\n")

            sukses, gagal = [], []
            for i, product in enumerate(products, start=1):
                self._set_progress(f"Produk {i}/{len(products)}: {product['judul']}")
                print(f"\n{'=' * 50}\n### PRODUK {i}/{len(products)} ###\n{'=' * 50}")
                try:
                    sukses.append(process_one_product(product, voice_option, **settings))
                except Exception as e:
                    print(f"[ERROR] Gagal proses '{product['judul']}': {e}")
                    gagal.append(product["judul"])

            print(f"\n\nBATCH SELESAI: {len(sukses)} berhasil, {len(gagal)} gagal")
            for p in sukses:
                print(f"  - {p}")
            self._set_progress(f"Selesai! {len(sukses)} berhasil, {len(gagal)} gagal.")
        except Exception as e:
            print(f"[FATAL ERROR] {e}")
            self._set_progress("Terjadi error, cek log.")
        finally:
            sys.stdout = old_stdout
            self._finish_processing()

    def _run_manual(self, manual_args):
        old_stdout = sys.stdout
        sys.stdout = TextRedirector(self.log_queue)
        try:
            self._set_progress("Memproses 1 produk (mode manual)...")
            path = process_manual(**manual_args)
            print(f"\nSELESAI: {path}")
            self._set_progress(f"Selesai! Output: {path}")
        except Exception as e:
            print(f"[ERROR] {e}")
            self._set_progress("Terjadi error, cek log.")
        finally:
            sys.stdout = old_stdout
            self._finish_processing()

    def _check_credentials(self, mode, voice_option):
        """Cek key yang dibutuhkan proses ini. Return pesan error, atau None kalau aman."""
        engine = voice_option["engine"] if voice_option else "gemini"
        if mode == TAB_CUT:
            uses_voice = self.cut_vo_var.get()
            needs_script_ai = False
        elif mode == TAB_MANUAL:
            uses_voice = True
            needs_script_ai = not self.teks_final_var.get()
        else:
            uses_voice = True
            needs_script_ai = True

        if (needs_script_ai or (uses_voice and engine == "gemini")) and not GEMINI_API_KEYS:
            return ("API key Gemini belum diisi.\n\nBuka credentials.py, isi GEMINI_API_KEYS dengan key dari "
                    "aistudio.google.com/apikey, simpan, lalu buka ulang aplikasi.")
        if uses_voice and engine == "azure" and not AZURE_SPEECH_KEY:
            return ("Suara Azure butuh AZURE_SPEECH_KEY di credentials.py, dan itu belum diisi.\n\n"
                    "Pilih suara Gemini (Zephyr, Puck, Kore, Charon, Leda) di Suara VO, atau isi key Azure.")
        return None

    def _collect_cut_args(self, voice_option):
        if not self.cut_video_path or not os.path.exists(self.cut_video_path):
            messagebox.showerror("Error", "Pilih dulu video mentahnya.")
            return None
        nama = self.entry_cut_output.get().strip()
        if not nama:
            messagebox.showerror("Error", "Isi dulu nama file output-nya.")
            return None
        if not nama.lower().endswith(".mp4"):
            nama += ".mp4"
        try:
            segments = parse_recipe(self.text_recipe.get("1.0", "end"))
            vol = float(self.entry_cut_music_vol.get().replace(",", ".")) / 100.0
            size_pct = float(self.entry_cut_size.get().replace(",", "."))
            top_pct = float(self.entry_cut_top.get().replace(",", "."))
        except ValueError as e:
            messagebox.showerror("Error", f"Input tidak valid: {e}")
            return None
        vo_on = self.cut_vo_var.get()
        if vo_on and not any(s["vo"] for s in segments):
            messagebox.showerror("Error", "VO aktif tapi tidak ada baris yang punya teks \"vo\" di resep.")
            return None
        return dict(
            video_path=self.cut_video_path,
            segments=segments,
            output_path=os.path.join(OUTPUT_DIR, nama),
            voice_option=voice_option,
            vo_enabled=vo_on,
            audio_mode=("music" if self.cut_music_path else ("original" if self.cut_keep_audio_var.get() else "mute")),
            music_path=self.cut_music_path,
            music_volume=vol,
            text_style={"font_name": self.combo_cut_font.get(), "size_pct": size_pct, "offset_pct": top_pct,
                        "position": "top",
                        "text_hex": self.color_map.get(self.combo_cut_color.get(), "FFFFFF")},
        )

    def _run_cutrecipe(self, cut_args):
        old_stdout = sys.stdout
        sys.stdout = TextRedirector(self.log_queue)
        try:
            self._set_progress("Memproses CutRecipe...")
            voice_option = cut_args.pop("voice_option")
            if cut_args["vo_enabled"]:
                cut_args["tts_func"] = lambda text, path: generate_audio(text, path, voice_option)
            path = render_cut_recipe(tmp_dir=os.path.join(OUTPUT_DIR, "_tmp"), **cut_args)
            print(f"\nSELESAI: {path}")
            self._set_progress(f"Selesai! Output: {path}")
        except Exception as e:
            print(f"[ERROR] {e}")
            self._set_progress("Terjadi error, cek log.")
        finally:
            sys.stdout = old_stdout
            self._finish_processing()

    def _finish_processing(self):
        self.is_processing = False
        self.after(0, lambda: self.btn_start.configure(state="normal", text="Mulai Proses"))


if __name__ == "__main__":
    app = VideoEditorApp()
    app.mainloop()
