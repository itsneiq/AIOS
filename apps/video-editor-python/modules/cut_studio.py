# modules/cut_studio.py
"""CutRecipe Studio: jendela editor untuk menyusun ulang satu video (kartu segmen, timeline, transisi, efek, filter, adjustment, teks)."""
import os
import sys
import threading
import subprocess
import customtkinter as ctk
from tkinter import filedialog, messagebox
from PIL import Image

from modules.cut_recipe import (
    parse_recipe, recipe_total_duration, render_cut_recipe, probe_video, extract_frame,
    TRANSITIONS, EFFECTS, FILTER_PRESETS, DEFAULT_ADJUST, DEFAULT_TEXT_STYLE, recipe_to_lines,
)

SEG_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
TR_LABELS = {v: k for k, v in TRANSITIONS.items()}
FX_LABELS = {v: k for k, v in EFFECTS.items()}
FILTER_LABELS = {v[0]: k for k, v in FILTER_PRESETS.items()}

ADJUST_SLIDERS = [  # key, label, min, max
    ("brightness", "Kecerahan", -0.4, 0.4),
    ("contrast", "Kontras", 0.6, 1.6),
    ("saturation", "Saturasi", 0.0, 2.0),
    ("temperature", "Suhu (dingin - hangat)", -1.0, 1.0),
    ("sharpness", "Ketajaman", 0.0, 2.0),
    ("vignette", "Vinyet", 0.0, 1.0),
    ("grain", "Grain (butiran film)", 0.0, 1.0),
]


def _open_file(path):
    try:
        if sys.platform.startswith("win"):
            os.startfile(path)  # noqa
        elif sys.platform == "darwin":
            subprocess.Popen(["open", path])
        else:
            subprocess.Popen(["xdg-open", path])
    except Exception as e:
        messagebox.showinfo("Hasil", f"File ada di:\n{path}\n\n({e})")


class CutStudio(ctk.CTkToplevel):
    def __init__(self, app, video_path, output_dir, tmp_dir, tts_factory, font_list, color_map,
                 initial_segments=None, output_name=""):
        super().__init__(app)
        self.app = app
        self.title("CutRecipe Studio")
        self.geometry("1320x860")
        self.minsize(1100, 700)
        self.video_path = video_path
        self.output_dir = output_dir
        self.tmp_dir = tmp_dir
        self.tts_factory = tts_factory          # () -> fungsi tts(text, path) atau None kalau key belum siap
        self.font_list = font_list
        self.color_map = color_map
        self.rows = []                          # list dict: var-var tiap kartu
        self.busy = False
        self.music_path = None
        self.sep_vo_path = None
        self._thumb = None

        self.info = probe_video(video_path)
        self.src_dur = self.info["duration"]

        self._build()
        for s in (initial_segments or []):
            self._add_row(s)
        if not self.rows:
            self._add_row({"start": 0, "end": min(3, self.src_dur)})
        if output_name:
            self.e_out.insert(0, output_name)
        self._show_frame(0)
        self._redraw_timeline()
        self.after(150, self.focus)

    # ------------------------------------------------------ layout
    def _build(self):
        self.grid_columnconfigure(0, weight=0, minsize=430)
        self.grid_columnconfigure(1, weight=1)
        self.grid_rowconfigure(0, weight=1)

        left = ctk.CTkFrame(self)
        left.grid(row=0, column=0, sticky="nsew", padx=(10, 5), pady=10)
        right = ctk.CTkFrame(self)
        right.grid(row=0, column=1, sticky="nsew", padx=(5, 10), pady=10)

        # ---- kiri: preview + timeline + audio + ekspor
        ctk.CTkLabel(left, text=os.path.basename(self.video_path), font=ctk.CTkFont(weight="bold")).pack(
            anchor="w", padx=12, pady=(10, 0))
        self.lbl_meta = ctk.CTkLabel(
            left, text=f"{self.info['width']}x{self.info['height']} - {self.src_dur:.1f} detik", text_color="gray")
        self.lbl_meta.pack(anchor="w", padx=12)
        self.lbl_frame = ctk.CTkLabel(left, text="", width=260, height=300)
        self.lbl_frame.pack(pady=8)

        ctk.CTkLabel(left, text="Timeline video asli (bagian berwarna = dipakai)").pack(anchor="w", padx=12)
        self.canvas = ctk.CTkCanvas(left, width=400, height=46, bg="#2b2b2b", highlightthickness=0)
        self.canvas.pack(padx=12, pady=(2, 0))
        self.lbl_usage = ctk.CTkLabel(left, text="", text_color="gray", justify="left")
        self.lbl_usage.pack(anchor="w", padx=12, pady=(2, 6))

        af = ctk.CTkFrame(left)
        af.pack(fill="x", padx=10, pady=4)
        ctk.CTkLabel(af, text="Audio", font=ctk.CTkFont(weight="bold")).grid(row=0, column=0, sticky="w", padx=8, pady=(6, 0))
        self.audio_var = ctk.StringVar(value="original")
        for i, (v, t) in enumerate([("original", "Audio Asli"), ("mute", "Mute"), ("music", "Musik Latar")]):
            ctk.CTkRadioButton(af, text=t, variable=self.audio_var, value=v).grid(row=1, column=i, padx=8, pady=4, sticky="w")
        ctk.CTkButton(af, text="Pilih musik...", width=100, command=self._pick_music).grid(row=2, column=0, padx=8, pady=4, sticky="w")
        self.lbl_music = ctk.CTkLabel(af, text="belum ada", text_color="gray")
        self.lbl_music.grid(row=2, column=1, sticky="w")
        self.music_vol = ctk.CTkSlider(af, from_=0, to=100, width=110)
        self.music_vol.set(20)
        self.music_vol.grid(row=2, column=2, padx=8)
        self.vo_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(af, text="AI VO dari kolom 'Teks VO' (audio asli otomatis mati)",
                        variable=self.vo_var).grid(row=3, column=0, columnspan=3, sticky="w", padx=8, pady=(4, 2))
        ctk.CTkButton(af, text="Voiceover terpisah...", width=140, command=self._pick_sep_vo).grid(
            row=4, column=0, columnspan=2, sticky="w", padx=8, pady=(2, 8))
        self.lbl_sepvo = ctk.CTkLabel(af, text="tidak ada", text_color="gray")
        self.lbl_sepvo.grid(row=4, column=2, sticky="w")

        ef = ctk.CTkFrame(left)
        ef.pack(fill="x", padx=10, pady=4)
        ctk.CTkLabel(ef, text="Nama file:").pack(side="left", padx=(8, 4), pady=8)
        self.e_out = ctk.CTkEntry(ef, placeholder_text="hasil_potong.mp4")
        self.e_out.pack(side="left", fill="x", expand=True, padx=(0, 8), pady=8)

        bf = ctk.CTkFrame(left, fg_color="transparent")
        bf.pack(fill="x", padx=10, pady=6)
        self.btn_prev = ctk.CTkButton(bf, text="Preview Resep", fg_color="gray30", command=lambda: self._render(True))
        self.btn_prev.pack(side="left", expand=True, fill="x", padx=(0, 4))
        self.btn_export = ctk.CTkButton(bf, text="Ekspor Video", command=lambda: self._render(False),
                                        font=ctk.CTkFont(weight="bold"))
        self.btn_export.pack(side="left", expand=True, fill="x", padx=(4, 0))
        self.lbl_status = ctk.CTkLabel(left, text="Siap.", text_color="gray", wraplength=400, justify="left")
        self.lbl_status.pack(anchor="w", padx=12, pady=(2, 8))

        # ---- kanan: tab Segmen | Teks & Caption | Filter | Adjustment
        self.tabs = ctk.CTkTabview(right)
        self.tabs.pack(fill="both", expand=True, padx=8, pady=8)
        t_seg = self.tabs.add("Segmen")
        t_txt = self.tabs.add("Teks & Caption")
        t_flt = self.tabs.add("Filter")
        t_adj = self.tabs.add("Adjustment")

        tb = ctk.CTkFrame(t_seg, fg_color="transparent")
        tb.pack(fill="x")
        ctk.CTkButton(tb, text="+ Tambah Segmen", width=130, command=lambda: self._add_row(None)).pack(side="left", padx=2)
        ctk.CTkButton(tb, text="Tempel Resep", width=110, fg_color="gray30", command=self._paste_recipe).pack(side="left", padx=4)
        ctk.CTkButton(tb, text="Salin Resep", width=100, fg_color="gray30", command=self._copy_recipe).pack(side="left", padx=2)
        self.lbl_total = ctk.CTkLabel(tb, text="", text_color="gray")
        self.lbl_total.pack(side="right", padx=8)
        self.cards = ctk.CTkScrollableFrame(t_seg)
        self.cards.pack(fill="both", expand=True, pady=(6, 0))

        self._build_text_tab(t_txt)
        self._build_filter_tab(t_flt)
        self._build_adjust_tab(t_adj)

    def _build_text_tab(self, t):
        g = ctk.CTkFrame(t)
        g.pack(fill="x", padx=6, pady=6)
        ctk.CTkLabel(g, text="Teks overlay (tiap segmen)", font=ctk.CTkFont(weight="bold")).grid(
            row=0, column=0, columnspan=4, sticky="w", padx=8, pady=(8, 4))
        ctk.CTkLabel(g, text="Font").grid(row=1, column=0, sticky="w", padx=8)
        self.c_font = ctk.CTkComboBox(g, values=self.font_list, width=170)
        self.c_font.set("Arial Black" if "Arial Black" in self.font_list else self.font_list[0])
        self.c_font.grid(row=1, column=1, padx=4, pady=4, sticky="w")
        ctk.CTkLabel(g, text="Warna").grid(row=1, column=2, sticky="w", padx=8)
        names = list(self.color_map.keys())
        self.c_color = ctk.CTkComboBox(g, values=names, width=130)
        self.c_color.set(names[0])
        self.c_color.grid(row=1, column=3, padx=4, sticky="w")
        ctk.CTkLabel(g, text="Ukuran (% tinggi)").grid(row=2, column=0, sticky="w", padx=8)
        self.s_size = ctk.CTkSlider(g, from_=1.5, to=8, width=170)
        self.s_size.set(DEFAULT_TEXT_STYLE["size_pct"])
        self.s_size.grid(row=2, column=1, padx=4, pady=4)
        ctk.CTkLabel(g, text="Posisi").grid(row=2, column=2, sticky="w", padx=8)
        self.c_pos = ctk.CTkSegmentedButton(g, values=["Atas", "Tengah", "Bawah"])
        self.c_pos.set("Atas")
        self.c_pos.grid(row=2, column=3, padx=4, sticky="w")
        ctk.CTkLabel(g, text="Jarak dari tepi (%)").grid(row=3, column=0, sticky="w", padx=8)
        self.s_off = ctk.CTkSlider(g, from_=0, to=50, width=170)
        self.s_off.set(DEFAULT_TEXT_STYLE["offset_pct"])
        self.s_off.grid(row=3, column=1, padx=4, pady=4)
        self.v_bold = ctk.BooleanVar(value=True)
        self.v_box = ctk.BooleanVar(value=False)
        self.v_anim = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(g, text="Tebal", variable=self.v_bold).grid(row=4, column=0, sticky="w", padx=8, pady=4)
        ctk.CTkCheckBox(g, text="Kotak latar", variable=self.v_box).grid(row=4, column=1, sticky="w", padx=4)
        ctk.CTkCheckBox(g, text="Animasi fade", variable=self.v_anim).grid(row=4, column=2, sticky="w", padx=8)

        c = ctk.CTkFrame(t)
        c.pack(fill="x", padx=6, pady=6)
        ctk.CTkLabel(c, text="Caption otomatis (Whisper)", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=8, pady=(8, 2))
        ctk.CTkLabel(c, text="Menulis ulang suara di video hasil jadi subtitle. Hanya jalan saat Ekspor (bukan Preview), butuh audio.",
                     text_color="gray", wraplength=640, justify="left").pack(anchor="w", padx=8)
        self.v_caption = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(c, text="Aktifkan caption otomatis", variable=self.v_caption).pack(anchor="w", padx=8, pady=(6, 2))
        from config import SUBTITLE_STYLES
        self.c_cap_style = ctk.CTkComboBox(c, values=list(SUBTITLE_STYLES.keys()), width=200)
        self.c_cap_style.set("simple" if "simple" in SUBTITLE_STYLES else list(SUBTITLE_STYLES.keys())[0])
        self.c_cap_style.pack(anchor="w", padx=8, pady=(2, 10))

        tr = ctk.CTkFrame(t)
        tr.pack(fill="x", padx=6, pady=6)
        ctk.CTkLabel(tr, text="Lama transisi (detik)", font=ctk.CTkFont(weight="bold")).pack(side="left", padx=8, pady=10)
        self.s_trans = ctk.CTkSlider(tr, from_=0.1, to=1.0, width=200)
        self.s_trans.set(0.3)
        self.s_trans.pack(side="left", padx=8)

    def _build_filter_tab(self, t):
        ctk.CTkLabel(t, text="Filter warna untuk seluruh video", font=ctk.CTkFont(weight="bold")).pack(anchor="w", padx=8, pady=(8, 4))
        self.filter_var = ctk.StringVar(value="Tanpa filter")
        grid = ctk.CTkFrame(t, fg_color="transparent")
        grid.pack(fill="x", padx=8)
        for i, (k, (label, _)) in enumerate(FILTER_PRESETS.items()):
            ctk.CTkRadioButton(grid, text=label, variable=self.filter_var, value=label).grid(
                row=i // 3, column=i % 3, padx=10, pady=8, sticky="w")

    def _build_adjust_tab(self, t):
        self.adj = {}
        ctk.CTkLabel(t, text="Adjustment manual (ditumpuk di atas filter)", font=ctk.CTkFont(weight="bold")).pack(
            anchor="w", padx=8, pady=(8, 4))
        for key, label, lo, hi in ADJUST_SLIDERS:
            f = ctk.CTkFrame(t, fg_color="transparent")
            f.pack(fill="x", padx=8, pady=3)
            ctk.CTkLabel(f, text=label, width=170, anchor="w").pack(side="left")
            s = ctk.CTkSlider(f, from_=lo, to=hi, width=300)
            s.set(DEFAULT_ADJUST[key])
            s.pack(side="left", padx=8)
            val = ctk.CTkLabel(f, text=f"{DEFAULT_ADJUST[key]:.2f}", width=50)
            val.pack(side="left")
            s.configure(command=lambda v, lb=val: lb.configure(text=f"{v:.2f}"))
            self.adj[key] = (s, val, key)
        ctk.CTkButton(t, text="Reset", width=80, fg_color="gray30", command=self._reset_adjust).pack(anchor="w", padx=8, pady=10)

    def _reset_adjust(self):
        for key, (s, val, _) in self.adj.items():
            s.set(DEFAULT_ADJUST[key])
            val.configure(text=f"{DEFAULT_ADJUST[key]:.2f}")

    # ------------------------------------------------------ baris/segmen
    def _add_row(self, seg):
        seg = seg or {}
        last_end = 0.0
        if self.rows and seg == {}:
            try:
                last_end = float(self.rows[-1]["end"].get().replace(",", "."))
            except ValueError:
                last_end = 0.0
        row = {
            "start": ctk.StringVar(value=f"{seg.get('start', last_end):g}"),
            "end": ctk.StringVar(value=f"{seg.get('end', min(last_end + 3, self.src_dur)):g}"),
            "text": ctk.StringVar(value=seg.get("text", "")),
            "vo": ctk.StringVar(value=seg.get("vo", "")),
            "vo_file": seg.get("vo_file"),
            "transition": ctk.StringVar(value=TRANSITIONS.get(seg.get("transition", "cut"), "Potong langsung")),
            "effect": ctk.StringVar(value=EFFECTS.get(seg.get("effect", "none"), "Tanpa efek")),
        }
        for k in ("start", "end"):
            row[k].trace_add("write", lambda *a: self._redraw_timeline())
        self.rows.append(row)
        self._render_cards()
        self._redraw_timeline()

    def _render_cards(self):
        for w in self.cards.winfo_children():
            w.destroy()
        for i, row in enumerate(self.rows):
            col = SEG_COLORS[i % len(SEG_COLORS)]
            card = ctk.CTkFrame(self.cards, border_width=2, border_color=col)
            card.pack(fill="x", padx=2, pady=4)
            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=8, pady=(6, 2))
            ctk.CTkLabel(top, text=f" {i + 1} ", fg_color=col, corner_radius=6, text_color="white").pack(side="left")
            ctk.CTkLabel(top, text="Mulai").pack(side="left", padx=(10, 2))
            ctk.CTkEntry(top, textvariable=row["start"], width=64).pack(side="left")
            ctk.CTkLabel(top, text="Selesai").pack(side="left", padx=(8, 2))
            ctk.CTkEntry(top, textvariable=row["end"], width=64).pack(side="left")
            ctk.CTkButton(top, text="Lihat", width=50, fg_color="gray30",
                          command=lambda r=row: self._peek(r)).pack(side="left", padx=8)
            ctk.CTkButton(top, text="X", width=30, fg_color="#7f1d1d", command=lambda r=row: self._del_row(r)).pack(side="right")
            ctk.CTkButton(top, text="v", width=30, fg_color="gray30", command=lambda r=row: self._move(r, 1)).pack(side="right", padx=2)
            ctk.CTkButton(top, text="^", width=30, fg_color="gray30", command=lambda r=row: self._move(r, -1)).pack(side="right", padx=2)

            m = ctk.CTkFrame(card, fg_color="transparent")
            m.pack(fill="x", padx=8, pady=2)
            ctk.CTkLabel(m, text="Teks Overlay", width=85, anchor="w").grid(row=0, column=0)
            ctk.CTkEntry(m, textvariable=row["text"]).grid(row=0, column=1, sticky="ew", padx=4, pady=2)
            ctk.CTkLabel(m, text="Teks VO", width=85, anchor="w").grid(row=1, column=0)
            ctk.CTkEntry(m, textvariable=row["vo"]).grid(row=1, column=1, sticky="ew", padx=4, pady=2)
            m.grid_columnconfigure(1, weight=1)

            b = ctk.CTkFrame(card, fg_color="transparent")
            b.pack(fill="x", padx=8, pady=(2, 8))
            ctk.CTkLabel(b, text="Transisi masuk").pack(side="left")
            st = "disabled" if i == 0 else "normal"
            ctk.CTkComboBox(b, values=list(TRANSITIONS.values()), variable=row["transition"], width=140, state=st).pack(side="left", padx=(4, 12))
            ctk.CTkLabel(b, text="Efek").pack(side="left")
            ctk.CTkComboBox(b, values=list(EFFECTS.values()), variable=row["effect"], width=140).pack(side="left", padx=(4, 12))
            name = os.path.basename(row["vo_file"]) if row["vo_file"] else "Upload VO"
            ctk.CTkButton(b, text=name[:22], width=110, fg_color="gray30",
                          command=lambda r=row: self._pick_row_vo(r)).pack(side="left")
        self._update_total()

    def _del_row(self, row):
        if len(self.rows) <= 1:
            return
        self.rows.remove(row)
        self._render_cards()
        self._redraw_timeline()

    def _move(self, row, d):
        i = self.rows.index(row)
        j = i + d
        if 0 <= j < len(self.rows):
            self.rows[i], self.rows[j] = self.rows[j], self.rows[i]
            self._render_cards()
            self._redraw_timeline()

    def _pick_row_vo(self, row):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.wav *.mp3 *.m4a *.aac")])
        if p:
            row["vo_file"] = p
            self._render_cards()

    def _peek(self, row):
        try:
            self._show_frame(float(row["start"].get().replace(",", ".")))
        except ValueError:
            pass

    # ------------------------------------------------------ resep tempel/salin
    def _paste_recipe(self):
        win = ctk.CTkToplevel(self)
        win.title("Tempel resep")
        win.geometry("620x420")
        ctk.CTkLabel(win, text="Satu baris per segmen:  48-51 | teks overlay | teks VO   (atau JSON)").pack(anchor="w", padx=12, pady=(10, 2))
        box = ctk.CTkTextbox(win, font=ctk.CTkFont(family="Consolas", size=12))
        box.pack(fill="both", expand=True, padx=12, pady=6)

        def ok():
            try:
                segs = parse_recipe(box.get("1.0", "end"))
            except ValueError as e:
                messagebox.showerror("Resep tidak valid", str(e), parent=win)
                return
            self.rows.clear()
            for s in segs:
                self._add_row(s)
            win.destroy()
        ctk.CTkButton(win, text="Pakai resep ini (ganti semua segmen)", command=ok).pack(pady=(0, 12))
        win.after(150, win.focus)

    def _copy_recipe(self):
        try:
            segs = self._collect_segments()
        except ValueError as e:
            messagebox.showerror("Resep tidak valid", str(e), parent=self)
            return
        self.clipboard_clear()
        self.clipboard_append(recipe_to_lines(segs))
        self.lbl_status.configure(text="Resep disalin ke clipboard.")

    # ------------------------------------------------------ timeline + frame
    def _spans(self):
        out = []
        for r in self.rows:
            try:
                out.append((float(r["start"].get().replace(",", ".")), float(r["end"].get().replace(",", "."))))
            except ValueError:
                out.append(None)
        return out

    def _redraw_timeline(self):
        c = self.canvas
        c.delete("all")
        W, H = 400, 46
        c.create_rectangle(0, 14, W, 40, fill="#3a3a3a", outline="")
        used = 0.0
        for i, sp in enumerate(self._spans()):
            if not sp or sp[1] <= sp[0]:
                continue
            a, b = max(sp[0], 0), min(sp[1], self.src_dur)
            x0, x1 = a / self.src_dur * W, b / self.src_dur * W
            col = SEG_COLORS[i % len(SEG_COLORS)]
            c.create_rectangle(x0, 14, max(x1, x0 + 2), 40, fill=col, outline="")
            c.create_text((x0 + x1) / 2, 27, text=str(i + 1), fill="white", font=("Arial", 9, "bold"))
            used += max(b - a, 0)
        for s in range(0, int(self.src_dur) + 1, 10):
            x = s / self.src_dur * W
            c.create_line(x, 40, x, 44, fill="#888")
            c.create_text(x, 6, text=f"{s}s", fill="#aaa", font=("Arial", 7))
        self.lbl_usage.configure(
            text=f"Dipakai {used:.1f}s dari {self.src_dur:.1f}s  |  Dibuang {max(self.src_dur - used, 0):.1f}s")
        self._update_total()

    def _update_total(self):
        try:
            segs = self._collect_segments()
            tr = float(self.s_trans.get())
            self.lbl_total.configure(text=f"Hasil sekitar {recipe_total_duration(segs, tr):.1f} detik")
        except Exception:
            self.lbl_total.configure(text="")

    def _show_frame(self, t):
        try:
            os.makedirs(self.tmp_dir, exist_ok=True)
            png = os.path.join(self.tmp_dir, "_studio_frame.png")
            extract_frame(self.video_path, min(t, max(self.src_dur - 0.1, 0)), png, width=320)
            img = Image.open(png).convert("RGB")
            img.load()
            h = 300
            w = max(int(img.width * h / img.height), 1)
            self._thumb = ctk.CTkImage(light_image=img, dark_image=img, size=(w, h))
            self.lbl_frame.configure(image=self._thumb, text="")
        except Exception as e:
            self.lbl_frame.configure(text=f"(preview frame gagal: {e})", image=None)

    # ------------------------------------------------------ audio
    def _pick_music(self):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.mp3 *.wav *.m4a *.aac")])
        if p:
            self.music_path = p
            self.lbl_music.configure(text=os.path.basename(p)[:20], text_color="white")
            self.audio_var.set("music")

    def _pick_sep_vo(self):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.wav *.mp3 *.m4a *.aac")])
        if p:
            self.sep_vo_path = p
            self.lbl_sepvo.configure(text=os.path.basename(p)[:20], text_color="white")

    # ------------------------------------------------------ render
    def _collect_segments(self):
        data = []
        for i, r in enumerate(self.rows, start=1):
            data.append({
                "start": r["start"].get(), "end": r["end"].get(),
                "text": r["text"].get(), "vo": r["vo"].get(), "vo_file": r["vo_file"],
                "transition": TR_LABELS.get(r["transition"].get(), "cut"),
                "effect": FX_LABELS.get(r["effect"].get(), "none"),
            })
        return parse_recipe(data)

    def _text_style(self):
        pos = {"Atas": "top", "Tengah": "middle", "Bawah": "bottom"}[self.c_pos.get()]
        return {
            "font_name": self.c_font.get(), "size_pct": float(self.s_size.get()),
            "text_hex": self.color_map.get(self.c_color.get(), "FFFFFF"),
            "position": pos, "offset_pct": float(self.s_off.get()),
            "bold": self.v_bold.get(), "box": self.v_box.get(), "animate": self.v_anim.get(),
        }

    def _render(self, preview):
        if self.busy:
            return
        try:
            segs = self._collect_segments()
        except ValueError as e:
            messagebox.showerror("Resep tidak valid", str(e), parent=self)
            return
        name = self.e_out.get().strip()
        if not preview:
            if not name:
                messagebox.showerror("Error", "Isi dulu nama file.", parent=self)
                return
            if not name.lower().endswith(".mp4"):
                name += ".mp4"
        vo_on = self.vo_var.get()
        tts = None
        if vo_on:
            if not any(s["vo"] and not s["vo_file"] for s in segs) and not any(s["vo_file"] for s in segs):
                messagebox.showerror("Error", "AI VO aktif tapi tidak ada teks VO.", parent=self)
                return
            tts = self.tts_factory()
            if tts is None:
                return
        kwargs = dict(
            video_path=self.video_path, segments=segs,
            output_path=(os.path.join(self.tmp_dir, "_studio_preview.mp4") if preview else os.path.join(self.output_dir, name)),
            tts_func=tts, vo_enabled=vo_on, audio_mode=self.audio_var.get(),
            music_path=self.music_path, music_volume=self.music_vol.get() / 100.0,
            separate_vo_path=self.sep_vo_path, text_style=self._text_style(),
            filter_preset=FILTER_LABELS.get(self.filter_var.get(), "none"),
            adjust={k: float(s.get()) for k, (s, _, _) in self.adj.items()},
            caption=({"style": self.c_cap_style.get()} if self.v_caption.get() else None),
            transition_sec=float(self.s_trans.get()), preview=preview, tmp_dir=self.tmp_dir,
        )
        self.busy = True
        for b in (self.btn_prev, self.btn_export):
            b.configure(state="disabled")
        self.lbl_status.configure(text="Memproses preview..." if preview else "Mengekspor video...", text_color="white")

        def work():
            old = sys.stdout
            sys.stdout = self.app.make_redirector()
            err, path = None, None
            try:
                path = render_cut_recipe(**kwargs)
            except Exception as e:
                err = str(e)
                print(f"[ERROR] {e}")
            finally:
                sys.stdout = old
            self._result = (path, err, preview)
        self._result = None
        threading.Thread(target=work, daemon=True).start()
        self.after(300, self._poll_result)

    def _poll_result(self):
        if self._result is None:
            self.after(300, self._poll_result)
            return
        r, self._result = self._result, None
        self._done(*r)

    def _done(self, path, err, preview):
        self.busy = False
        for b in (self.btn_prev, self.btn_export):
            b.configure(state="normal")
        if err:
            self.lbl_status.configure(text="Gagal. Cek log di jendela utama.", text_color="#f87171")
            messagebox.showerror("Render gagal", err[-600:], parent=self)
            return
        self.lbl_status.configure(text=("Preview dibuka." if preview else f"Selesai: {path}"), text_color="#4ade80")
        _open_file(path)
