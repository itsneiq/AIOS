# modules/cut_studio.py
"""
CutRecipe Studio (tampilan satu jendela, gaya editor):
  kiri   = perpustakaan preset (Teks, Transisi, Efek, Filter, Adjustment)
  tengah = preview frame + timeline hasil + audio
  kanan  = kartu segmen
Dibuat ringan: preview = satu frame (tanpa render video), render video berprioritas rendah, tanpa animasi di latar.
"""
import os
import sys
import threading
import subprocess
import time
import tkinter as tk
import customtkinter as ctk
from tkinter import filedialog, messagebox
from PIL import Image, ImageTk

from modules.cut_recipe import (
    parse_recipe, recipe_total_duration, render_cut_recipe, probe_video, render_preview_frame,
    make_cached_tts, recipe_to_lines, DEFAULT_RECIPE,
)
from modules.cut_catalog import (
    TRANSITIONS, EFFECTS, FILTERS, ADJUSTMENTS, DEFAULT_ADJUST, TEXT_PRESETS, DEFAULT_TEXT_STYLE,
)

SEG_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]
TR_LABEL = {k: v[0] for k, v in TRANSITIONS.items()}
FX_LABEL = {k: v[0] for k, v in EFFECTS.items()}
TR_KEY = {v: k for k, v in TR_LABEL.items()}
FX_KEY = {v: k for k, v in FX_LABEL.items()}
POS_MAP = {"Atas": "top", "Tengah": "middle", "Bawah": "bottom"}
POS_BACK = {v: k for k, v in POS_MAP.items()}


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


class CutStudioFrame(ctk.CTkFrame):
    def __init__(self, master, app):
        super().__init__(master, fg_color="transparent")
        self.app = app
        self.video_path = None
        self.src_dur = 1.0
        self.vid_info = None
        self.rows = []
        self.sel = 0
        self.busy = False
        self.music_path = None
        self.sep_vo_path = None
        self.filter_key = "none"
        self.filter_intensity = 1.0
        self.text_style = dict(DEFAULT_TEXT_STYLE)
        self.playhead = 0.0
        self._frame_job = None
        self._frame_token = 0
        self._frame_img = None
        self.engine = None
        self.proj_dirty = True
        self.playing = False
        self.loop_range = None
        self._tick_job = None
        self._show_job = None
        self._look_job = None
        self._look_gen = 0
        self._look_result = None
        self._ph = None
        self._play_t0 = 0.0
        self._play_wall = 0.0
        self._thumbs = {}
        self._thumb_started = False
        self._result = None
        self.tmp_dir = os.path.join(app.output_dir, "_tmp")
        self._build()
        self._load_rows(DEFAULT_RECIPE[:3])

    # ================================================== layout
    def _build(self):
        self.grid_rowconfigure(1, weight=1)
        self.grid_columnconfigure(1, weight=1)
        self._build_topbar()

        self.lib = ctk.CTkFrame(self, width=370)
        self.lib.grid(row=1, column=0, sticky="nsew", padx=(0, 6), pady=(6, 0))
        self.lib.grid_propagate(False)
        self.center = ctk.CTkFrame(self)
        self.center.grid(row=1, column=1, sticky="nsew", pady=(6, 0))
        self.right = ctk.CTkFrame(self, width=500)
        self.right.grid(row=1, column=2, sticky="nsew", padx=(6, 0), pady=(6, 0))
        self.right.grid_propagate(False)

        self._build_library()
        self._build_center()
        self._build_segments_panel()

    def _build_topbar(self):
        bar = ctk.CTkFrame(self)
        bar.grid(row=0, column=0, columnspan=3, sticky="ew")
        ctk.CTkButton(bar, text="Pilih Video...", width=110, command=self._pick_video).pack(side="left", padx=(8, 4), pady=8)
        self.lbl_video = ctk.CTkLabel(bar, text="belum ada video", text_color="gray", width=150, anchor="w")
        self.lbl_video.pack(side="left", padx=4)

        ctk.CTkLabel(bar, text="Suara VO:").pack(side="left", padx=(14, 4))
        labels = list(self.app.voice_map.keys())
        self.c_voice = ctk.CTkComboBox(bar, values=labels, width=260)
        self.c_voice.set(self.app.combo_voice.get() if hasattr(self.app, "combo_voice") else labels[0])
        self.c_voice.pack(side="left", padx=4)
        self.v_vo = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(bar, text="AI VO", variable=self.v_vo, width=60).pack(side="left", padx=(8, 2))
        self.v_prev_vo = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(bar, text="VO saat Preview", variable=self.v_prev_vo, width=100).pack(side="left", padx=6)

        self.btn_export = ctk.CTkButton(bar, text="Ekspor", width=90, font=ctk.CTkFont(weight="bold"),
                                        command=lambda: self._render(False))
        self.btn_export.pack(side="right", padx=(4, 8), pady=8)
        self.btn_prev = ctk.CTkButton(bar, text="Preview", width=90, fg_color="gray30", command=lambda: self._render(True))
        self.btn_prev.pack(side="right", padx=4)
        self.v_eco = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(bar, text="Mode hemat", variable=self.v_eco, width=90).pack(side="right", padx=8)
        self.e_out = ctk.CTkEntry(bar, placeholder_text="nama_hasil.mp4", width=170)
        self.e_out.pack(side="right", padx=4)

    # ------------------------------------------------ perpustakaan
    def _build_library(self):
        self.tabs = ctk.CTkTabview(self.lib, command=self._on_lib_tab)
        self.tabs.pack(fill="both", expand=True, padx=6, pady=6)
        self.t_text = self.tabs.add("Teks")
        self.t_tr = self.tabs.add("Transisi")
        self.t_fx = self.tabs.add("Efek")
        self.t_flt = self.tabs.add("Filter")
        self.t_adj = self.tabs.add("Adjust")
        self._build_text_tab()
        self._build_trans_tab()
        self._build_effect_tab()
        self._build_filter_tab()
        self._build_adjust_tab()

    def _chip_grid(self, parent, table, command, cols=2, skip=()):
        fr = ctk.CTkScrollableFrame(parent)
        fr.pack(fill="both", expand=True)
        row = 0
        cat = None
        col = 0
        for k, v in table.items():
            if k in skip:
                continue
            c = v[1] if isinstance(v[1], str) else None
            if c and c != cat:
                cat = c
                if col != 0:
                    row += 1
                    col = 0
                ctk.CTkLabel(fr, text=c, text_color="gray", anchor="w").grid(row=row, column=0, columnspan=cols, sticky="w", pady=(8, 2))
                row += 1
            b = ctk.CTkButton(fr, text=v[0], height=34, fg_color="gray25", hover_color="gray35",
                              command=lambda key=k: command(key))
            b.grid(row=row, column=col, padx=3, pady=3, sticky="ew")
            fr.grid_columnconfigure(col, weight=1)
            col += 1
            if col >= cols:
                col = 0
                row += 1
        return fr

    def _build_text_tab(self):
        t = self.t_text
        table = {k: (v[0], "Gaya teks") for k, v in TEXT_PRESETS.items()}
        box = ctk.CTkFrame(t, fg_color="transparent")
        box.pack(fill="both", expand=True)
        grid = ctk.CTkFrame(box, fg_color="transparent", height=230)
        grid.pack(fill="x")
        grid.pack_propagate(False)
        self._chip_grid(grid, table, self._apply_text_preset, cols=2)

        g = ctk.CTkFrame(box)
        g.pack(fill="x", pady=6)
        fonts = self.app.font_list
        self.c_font = ctk.CTkComboBox(g, values=fonts, width=150, command=lambda v: self._text_changed())
        self.c_font.set(self.text_style["font_name"] if self.text_style["font_name"] in fonts else fonts[0])
        self.c_font.grid(row=0, column=0, padx=6, pady=4)
        names = list(self.app.color_map.keys())
        self.c_color = ctk.CTkComboBox(g, values=names, width=110, command=self._on_color)
        self.c_color.set(names[0])
        self.c_color.grid(row=0, column=1, padx=4)
        ctk.CTkLabel(g, text="Ukuran").grid(row=1, column=0, sticky="w", padx=6)
        self.s_size = ctk.CTkSlider(g, from_=1.5, to=8, width=130, command=lambda v: self._text_changed())
        self.s_size.set(self.text_style["size_pct"])
        self.s_size.grid(row=1, column=1, padx=4)
        ctk.CTkLabel(g, text="Jarak tepi").grid(row=2, column=0, sticky="w", padx=6)
        self.s_off = ctk.CTkSlider(g, from_=0, to=50, width=130, command=lambda v: self._text_changed())
        self.s_off.set(self.text_style["offset_pct"])
        self.s_off.grid(row=2, column=1, padx=4)
        self.c_pos = ctk.CTkSegmentedButton(g, values=["Atas", "Tengah", "Bawah"], command=lambda v: self._text_changed())
        self.c_pos.set("Atas")
        self.c_pos.grid(row=3, column=0, columnspan=2, padx=6, pady=4, sticky="w")
        self.v_bold = ctk.BooleanVar(value=True)
        self.v_box = ctk.BooleanVar(value=False)
        self.v_anim = ctk.BooleanVar(value=True)
        for i, (txt, var) in enumerate([("Tebal", self.v_bold), ("Kotak", self.v_box), ("Fade", self.v_anim)]):
            ctk.CTkCheckBox(g, text=txt, variable=var, width=60, command=self._text_changed).grid(
                row=4 + i // 2, column=i % 2, padx=6, pady=2, sticky="w")

        c = ctk.CTkFrame(box)
        c.pack(fill="x", pady=4)
        self.v_caption = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(c, text="Caption otomatis (Whisper, saat Ekspor)", variable=self.v_caption).pack(anchor="w", padx=8, pady=(8, 2))
        from config import SUBTITLE_STYLES
        keys = list(SUBTITLE_STYLES.keys())
        self.c_cap = ctk.CTkComboBox(c, values=keys, width=160)
        self.c_cap.set("simple" if "simple" in keys else keys[0])
        self.c_cap.pack(anchor="w", padx=8, pady=(2, 8))

    def _build_trans_tab(self):
        t = self.t_tr
        top = ctk.CTkFrame(t, fg_color="transparent")
        top.pack(fill="x")
        self.v_all_tr = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(top, text="Terapkan ke semua segmen", variable=self.v_all_tr).pack(anchor="w", padx=4, pady=(2, 2))
        row = ctk.CTkFrame(top, fg_color="transparent")
        row.pack(fill="x")
        ctk.CTkLabel(row, text="Lama (detik)").pack(side="left", padx=4)
        self.s_trans = ctk.CTkSlider(row, from_=0.1, to=1.0, width=170)
        self.s_trans.set(0.3)
        self.s_trans.pack(side="left", padx=6)
        self._chip_grid(t, TRANSITIONS, self._apply_transition, cols=2)

    def _build_effect_tab(self):
        t = self.t_fx
        self.v_all_fx = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(t, text="Terapkan ke semua segmen", variable=self.v_all_fx).pack(anchor="w", padx=4, pady=(2, 2))
        self._chip_grid(t, EFFECTS, self._apply_effect, cols=2)

    def _build_filter_tab(self):
        t = self.t_flt
        top = ctk.CTkFrame(t, fg_color="transparent")
        top.pack(fill="x")
        ctk.CTkLabel(top, text="Intensitas").pack(side="left", padx=4)
        self.s_inten = ctk.CTkSlider(top, from_=0, to=1, width=170, command=self._on_intensity)
        self.s_inten.set(1.0)
        self.s_inten.pack(side="left", padx=6)
        self.lbl_flt = ctk.CTkLabel(top, text="Tanpa filter", text_color="gray")
        self.lbl_flt.pack(side="left", padx=6)
        self.flt_scroll = ctk.CTkScrollableFrame(t)
        self.flt_scroll.pack(fill="both", expand=True)
        self._flt_buttons = {}
        cat, row, col = None, 0, 0
        for k, v in FILTERS.items():
            if k in ("moody_cinematic", "hitam_putih", "dingin_biru", "warm_cozy", "cerah_pop", "clean_minimal"):
                continue
            if v[1] != cat:
                cat = v[1]
                if col:
                    row, col = row + 1, 0
                ctk.CTkLabel(self.flt_scroll, text=cat, text_color="gray", anchor="w").grid(row=row, column=0, columnspan=3, sticky="w", pady=(8, 2))
                row += 1
            b = ctk.CTkButton(self.flt_scroll, text=v[0], width=100, height=64, fg_color="gray25", hover_color="gray35",
                              compound="top", font=ctk.CTkFont(size=11), command=lambda key=k: self._apply_filter(key))
            b.grid(row=row, column=col, padx=3, pady=3, sticky="ew")
            self._flt_buttons[k] = b
            col += 1
            if col >= 3:
                row, col = row + 1, 0

    def _build_adjust_tab(self):
        t = self.t_adj
        sc = ctk.CTkScrollableFrame(t)
        sc.pack(fill="both", expand=True)
        self.adj = {}
        for key, (label, lo, hi, dflt) in ADJUSTMENTS.items():
            f = ctk.CTkFrame(sc, fg_color="transparent")
            f.pack(fill="x", pady=2)
            ctk.CTkLabel(f, text=label, width=120, anchor="w").pack(side="left")
            val = ctk.CTkLabel(f, text=f"{dflt:.2f}", width=40)
            s = ctk.CTkSlider(f, from_=lo, to=hi, width=130)
            s.set(dflt)
            s.configure(command=lambda v, lb=val: (lb.configure(text=f"{v:.2f}"), self._schedule_frame()))
            s.pack(side="left", padx=4)
            val.pack(side="left")
            self.adj[key] = (s, val)
        ctk.CTkButton(sc, text="Reset semua", width=100, fg_color="gray30", command=self._reset_adjust).pack(anchor="w", pady=8)

    def _on_lib_tab(self):
        if self.tabs.get() == "Filter":
            self._start_thumbs()

    # ------------------------------------------------ tengah
    def _build_center(self):
        c = self.center
        c.grid_rowconfigure(0, weight=1)
        c.grid_columnconfigure(0, weight=1)
        self.lbl_frame = tk.Label(c, text="Pilih video dulu", fg="#888888", bg="#111111", bd=0)
        self.lbl_frame.grid(row=0, column=0, sticky="nsew", padx=8, pady=8)

        ctl = ctk.CTkFrame(c, fg_color="transparent")
        ctl.grid(row=1, column=0, sticky="ew", padx=8)
        self.btn_play = ctk.CTkButton(ctl, text="Putar", width=64, command=self._toggle_play)
        self.btn_play.pack(side="left", padx=(0, 8))
        self.s_play = ctk.CTkSlider(ctl, from_=0, to=1, command=self._on_scrub)
        self.s_play.set(0)
        self.s_play.pack(side="left", fill="x", expand=True, padx=(0, 8))
        self.lbl_time = ctk.CTkLabel(ctl, text="0.0 / 0.0 s", width=90)
        self.lbl_time.pack(side="right")

        self.canvas = ctk.CTkCanvas(c, height=64, bg="#2b2b2b", highlightthickness=0)
        self.canvas.grid(row=2, column=0, sticky="ew", padx=8, pady=(8, 2))
        self.canvas.bind("<Button-1>", self._on_canvas_click)
        self.canvas.bind("<Configure>", self._on_canvas_resize)
        self.lbl_usage = ctk.CTkLabel(c, text="", text_color="gray", anchor="w")
        self.lbl_usage.grid(row=3, column=0, sticky="ew", padx=10)

        af = ctk.CTkFrame(c)
        af.grid(row=4, column=0, sticky="ew", padx=8, pady=8)
        self.audio_var = ctk.StringVar(value="original")
        for i, (v, t) in enumerate([("original", "Audio Asli"), ("mute", "Mute"), ("music", "Musik Latar")]):
            ctk.CTkRadioButton(af, text=t, variable=self.audio_var, value=v).grid(row=0, column=i, padx=8, pady=6, sticky="w")
        ctk.CTkButton(af, text="Musik...", width=80, command=self._pick_music).grid(row=0, column=3, padx=4)
        self.lbl_music = ctk.CTkLabel(af, text="-", text_color="gray", width=90, anchor="w")
        self.lbl_music.grid(row=0, column=4)
        self.s_music = ctk.CTkSlider(af, from_=0, to=100, width=80)
        self.s_music.set(20)
        self.s_music.grid(row=0, column=5, padx=6)
        ctk.CTkButton(af, text="Voiceover terpisah...", width=140, fg_color="gray30", command=self._pick_sep_vo).grid(
            row=1, column=0, columnspan=2, padx=8, pady=(0, 6), sticky="w")
        self.lbl_sepvo = ctk.CTkLabel(af, text="tidak ada", text_color="gray")
        self.lbl_sepvo.grid(row=1, column=2, columnspan=3, sticky="w")
        self.lbl_status = ctk.CTkLabel(c, text="Siap.", text_color="gray", anchor="w")
        self.lbl_status.grid(row=5, column=0, sticky="ew", padx=10, pady=(0, 8))

    # ------------------------------------------------ segmen
    def _build_segments_panel(self):
        r = self.right
        top = ctk.CTkFrame(r, fg_color="transparent")
        top.pack(fill="x", padx=8, pady=(8, 2))
        ctk.CTkButton(top, text="+ Segmen", width=80, command=lambda: self._add_row(None)).pack(side="left")
        ctk.CTkButton(top, text="Tempel Resep", width=100, fg_color="gray30", command=self._paste_recipe).pack(side="left", padx=4)
        ctk.CTkButton(top, text="Salin", width=50, fg_color="gray30", command=self._copy_recipe).pack(side="left")
        self.lbl_total = ctk.CTkLabel(top, text="", text_color="gray")
        self.lbl_total.pack(side="right")
        self.cards = ctk.CTkScrollableFrame(r)
        self.cards.pack(fill="both", expand=True, padx=6, pady=(2, 6))

    # ================================================== video
    def _pick_video(self):
        p = filedialog.askopenfilename(filetypes=[("Video", "*.mp4 *.mov *.avi *.mkv *.webm")])
        if p:
            self.load_video(p)

    def load_video(self, path):
        try:
            info = probe_video(path)
        except Exception as e:
            messagebox.showerror("Video gagal dibaca", str(e))
            return
        self.video_path = path
        self.vid_info = info
        self.src_dur = info["duration"]
        self.lbl_video.configure(text=os.path.basename(path)[:22], text_color="white")
        self.playhead = 0.0
        self._thumbs.clear()
        self._thumb_started = False
        self._stop_play()
        self._close_engine()
        self._redraw_timeline()
        self._mark_dirty(0)

    # ================================================== segmen: data
    def _load_rows(self, segs):
        self.rows.clear()
        for s in segs:
            self._append_row(s)
        self.sel = 0
        self._render_cards()
        self._redraw_timeline()
        self._mark_dirty()

    def _append_row(self, seg):
        seg = seg or {}
        last_end = 0.0
        if self.rows and not seg:
            try:
                last_end = float(self.rows[-1]["end"].get().replace(",", "."))
            except ValueError:
                pass
        row = {
            "start": ctk.StringVar(value=f"{seg.get('start', last_end):g}"),
            "end": ctk.StringVar(value=f"{seg.get('end', min(last_end + 3, self.src_dur)):g}"),
            "text": ctk.StringVar(value=seg.get("text", "")),
            "vo": ctk.StringVar(value=seg.get("vo", "")),
            "vo_file": seg.get("vo_file"),
            "transition": ctk.StringVar(value=TR_LABEL.get(seg.get("transition", "cut"), "Potong langsung")),
            "effect": ctk.StringVar(value=FX_LABEL.get(seg.get("effect", "none"), "Tanpa efek")),
        }
        for k in ("start", "end", "text", "transition", "effect"):
            row[k].trace_add("write", lambda *a: self._on_row_edit())
        self.rows.append(row)

    def _on_row_edit(self):
        self._redraw_timeline()
        self._mark_dirty()

    def _add_row(self, seg):
        self._append_row(seg)
        self.sel = len(self.rows) - 1
        self._render_cards()
        self._redraw_timeline()
        self._mark_dirty()

    def _render_cards(self):
        for w in self.cards.winfo_children():
            w.destroy()
        self.sel = min(self.sel, len(self.rows) - 1)
        for i, row in enumerate(self.rows):
            col = SEG_COLORS[i % len(SEG_COLORS)]
            selected = (i == self.sel)
            card = ctk.CTkFrame(self.cards, border_width=3 if selected else 1, border_color=col if selected else "gray30")
            card.pack(fill="x", padx=2, pady=4)
            card.bind("<Button-1>", lambda e, k=i: self._select(k))
            top = ctk.CTkFrame(card, fg_color="transparent")
            top.pack(fill="x", padx=6, pady=(6, 2))
            ctk.CTkButton(top, text=f" {i + 1} ", width=28, fg_color=col, hover_color=col,
                          command=lambda k=i: self._select(k)).pack(side="left")
            ctk.CTkEntry(top, textvariable=row["start"], width=52).pack(side="left", padx=(8, 2))
            ctk.CTkLabel(top, text="-").pack(side="left")
            ctk.CTkEntry(top, textvariable=row["end"], width=52).pack(side="left", padx=2)
            ctk.CTkButton(top, text="Lihat", width=44, fg_color="gray30", command=lambda r=row: self._peek(r)).pack(side="left", padx=6)
            ctk.CTkButton(top, text="X", width=26, fg_color="#7f1d1d", command=lambda r=row: self._del_row(r)).pack(side="right")
            ctk.CTkButton(top, text="v", width=26, fg_color="gray30", command=lambda r=row: self._move(r, 1)).pack(side="right", padx=2)
            ctk.CTkButton(top, text="^", width=26, fg_color="gray30", command=lambda r=row: self._move(r, -1)).pack(side="right")
            ctk.CTkEntry(card, textvariable=row["text"], placeholder_text="Teks overlay").pack(fill="x", padx=6, pady=2)
            ctk.CTkEntry(card, textvariable=row["vo"], placeholder_text="Teks VO").pack(fill="x", padx=6, pady=2)
            b = ctk.CTkFrame(card, fg_color="transparent")
            b.pack(fill="x", padx=6, pady=(2, 6))
            st = "disabled" if i == 0 else "normal"
            ctk.CTkComboBox(b, values=list(TR_KEY.keys()), variable=row["transition"], width=140, state=st).pack(side="left")
            ctk.CTkComboBox(b, values=list(FX_KEY.keys()), variable=row["effect"], width=130).pack(side="left", padx=4)
            name = os.path.basename(row["vo_file"])[:9] if row["vo_file"] else "Upload VO"
            ctk.CTkButton(b, text=name, width=70, fg_color="gray30", command=lambda r=row: self._pick_row_vo(r)).pack(side="left")
        self._update_total()

    def _select(self, i):
        if i != self.sel:
            self.sel = i
            self._render_cards()
            self._redraw_timeline()

    def _del_row(self, row):
        if len(self.rows) <= 1:
            return
        self.rows.remove(row)
        self.sel = min(self.sel, len(self.rows) - 1)
        self._render_cards()
        self._redraw_timeline()
        self._mark_dirty()

    def _move(self, row, d):
        i = self.rows.index(row)
        j = i + d
        if 0 <= j < len(self.rows):
            self.rows[i], self.rows[j] = self.rows[j], self.rows[i]
            self.sel = j
            self._render_cards()
            self._redraw_timeline()
            self._mark_dirty()

    def _pick_row_vo(self, row):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.wav *.mp3 *.m4a *.aac")])
        if p:
            row["vo_file"] = p
            self._render_cards()

    def _peek(self, row):
        i = self.rows.index(row)
        self._sync_project()
        if self.engine and i < len(self.engine.segs):
            self._seek(self.engine.segs[i]["show0"] + 0.05)

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
            self._load_rows(segs)
            win.destroy()
        ctk.CTkButton(win, text="Pakai resep ini (ganti semua segmen)", command=ok).pack(pady=(0, 12))
        win.after(150, win.focus)

    def _copy_recipe(self):
        try:
            segs = self._collect_segments()
        except ValueError as e:
            messagebox.showerror("Resep tidak valid", str(e))
            return
        self.clipboard_clear()
        self.clipboard_append(recipe_to_lines(segs))
        self._status("Resep disalin ke clipboard.")

    # ================================================== terapkan preset
    def _targets(self, all_var):
        if all_var.get():
            return self.rows
        return [self.rows[self.sel]] if self.rows else []

    def _apply_transition(self, key):
        for i, r in enumerate(self._targets(self.v_all_tr)):
            if r is not self.rows[0]:
                r["transition"].set(TR_LABEL[key])
        self._render_cards()
        self._redraw_timeline()
        self._mark_dirty()
        self._loop_selected("transition")

    def _apply_effect(self, key):
        for r in self._targets(self.v_all_fx):
            r["effect"].set(FX_LABEL[key])
        self._render_cards()
        self._mark_dirty()
        self._loop_selected("effect")

    def _apply_filter(self, key):
        self.filter_key = key
        self.lbl_flt.configure(text=FILTERS[key][0])
        for k, b in self._flt_buttons.items():
            b.configure(fg_color="#1f6aa5" if k == key else "gray25")
        self._schedule_frame()

    def _on_intensity(self, v):
        self.filter_intensity = float(v)
        if self.engine:
            self.engine.inten = self.filter_intensity
            self._mark_dirty(30, resync=False)

    def _reset_adjust(self):
        for k, (s, val) in self.adj.items():
            s.set(DEFAULT_ADJUST[k])
            val.configure(text=f"{DEFAULT_ADJUST[k]:.2f}")
        self._schedule_frame()

    def _apply_text_preset(self, key):
        st = TEXT_PRESETS[key][1]
        self.text_style = {**DEFAULT_TEXT_STYLE, **st}
        if st["font_name"] in self.app.font_list:
            self.c_font.set(st["font_name"])
        self.s_size.set(st["size_pct"])
        self.s_off.set(st["offset_pct"])
        self.c_pos.set(POS_BACK.get(st["position"], "Atas"))
        self.v_bold.set(st["bold"])
        self.v_box.set(st["box"])
        for nm, hx in self.app.color_map.items():
            if hx.upper() == st["text_hex"].upper():
                self.c_color.set(nm)
                break
        self._status(f"Gaya teks: {TEXT_PRESETS[key][0]}")
        self._mark_dirty()
        self._loop_selected("text")

    def _text_changed(self):
        self._mark_dirty()

    def _on_color(self, name):
        hx = self.app.color_map.get(name)
        if hx:
            self.text_style["text_hex"] = hx

    def _current_text_style(self):
        st = dict(self.text_style)
        st.update({
            "font_name": self.c_font.get(),
            "size_pct": float(self.s_size.get()),
            "offset_pct": float(self.s_off.get()),
            "position": POS_MAP.get(self.c_pos.get(), "top"),
            "bold": self.v_bold.get(), "box": self.v_box.get(), "animate": self.v_anim.get(),
        })
        return st

    # ================================================== frame preview (satu frame, ringan)
    def _adjust_values(self):
        return {k: float(s.get()) for k, (s, _) in self.adj.items()}

    # ================================================== pemutar GPU (preview realtime)
    def _ensure_engine(self):
        if self.engine is not None or not self.video_path:
            return self.engine
        try:
            from modules.gl_engine import GLEngine
            self.engine = GLEngine(self.video_path, preview_h=520, fonts_dir="assets/fonts")
            self._look_gen += 1
            self._apply_look_async()
        except Exception as e:
            self.engine = None
            self.lbl_frame.configure(image="", text=f"Preview GPU tidak tersedia:\n{e}", fg="#f87171")
            self._status("Preview GPU gagal dibuka. Tombol Preview/Ekspor tetap bisa dipakai.", "#f87171")
        return self.engine

    def _close_engine(self):
        if self.engine is not None:
            try:
                self.engine.close()
            except Exception:
                pass
            self.engine = None
        self.proj_dirty = True

    def _sync_project(self):
        if not self.engine:
            return
        if self.proj_dirty:
            try:
                segs = self._collect_segments()
            except ValueError:
                return
            self.engine.set_segments(segs, float(self.s_trans.get()))
            self.engine.set_text_style(self._current_text_style())
            self.s_play.configure(to=max(self.engine.total, 0.1))
            self.proj_dirty = False

    def _mark_dirty(self, delay=80, resync=True):
        if resync:
            self.proj_dirty = True
        if self._show_job:
            self.after_cancel(self._show_job)
        self._show_job = self.after(delay, self._show_now)

    def _show_now(self):
        self._show_job = None
        if not self._ensure_engine():
            return
        self._sync_project()
        self._paint(self.playhead)

    def _paint(self, t):
        e = self.engine
        if not e or not e.segs:
            return
        self.playhead = min(max(t, 0.0), e.total)
        arr = e.render(self.playhead)
        self._ph = ImageTk.PhotoImage(Image.fromarray(arr))
        self.lbl_frame.configure(image=self._ph, text="")
        self.lbl_time.configure(text=f"{self.playhead:.1f} / {e.total:.1f} s")

    def _seek(self, t):
        self.playhead = t
        self._play_wall = time.perf_counter()
        self._play_t0 = t
        if self.engine and self.engine.total:
            self.s_play.set(min(t, self.engine.total))
        self._show_now()

    def _on_scrub(self, v):
        self.loop_range = None
        self.playhead = float(v)
        self._play_t0 = self.playhead
        self._play_wall = time.perf_counter()
        if not self.playing:
            self._mark_dirty(10, resync=False)

    def _toggle_play(self):
        if self.playing:
            self._stop_play()
        else:
            if not self._ensure_engine():
                return
            self._sync_project()
            self.loop_range = None
            self._start_play()

    def _start_play(self):
        e = self.engine
        if not e or not e.segs:
            return
        if self.playhead >= e.total - 0.05:
            self.playhead = 0.0
        self.playing = True
        self.btn_play.configure(text="Jeda")
        self._play_t0 = self.playhead
        self._play_wall = time.perf_counter()
        self._tick()

    def _stop_play(self):
        self.playing = False
        if self._tick_job:
            self.after_cancel(self._tick_job)
            self._tick_job = None
        try:
            self.btn_play.configure(text="Putar")
        except Exception:
            pass

    def _tick(self):
        if not self.playing or not self.engine:
            return
        t0 = time.perf_counter()
        t = self._play_t0 + (t0 - self._play_wall)
        e = self.engine
        if self.loop_range:
            a, b = self.loop_range
            if t >= b:
                t = a
                self._play_t0, self._play_wall = a, t0
        elif t >= e.total:
            self._stop_play()
            self._paint(e.total)
            return
        self._paint(t)
        self.s_play.set(self.playhead)
        used = (time.perf_counter() - t0) * 1000
        self._tick_job = self.after(max(1, int(1000 / 30 - used)), self._tick)

    def _loop_selected(self, kind):
        """Setelah memilih efek/transisi/teks: putar potongan pendek di sekitar segmen terpilih, berulang."""
        if not self._ensure_engine():
            return
        self._sync_project()
        e = self.engine
        i = min(self.sel, len(e.segs) - 1)
        if i < 0:
            return
        sg = e.segs[i]
        if kind == "text":
            self._stop_play()
            self._seek(min(sg["show0"] + 0.6, sg["show1"] - 0.05))
            return
        if kind == "transition" and i > 0 and sg["td"] > 0:
            a, b = max(sg["t0"] - 0.5, 0.0), min(sg["show0"] + 0.7, e.total)
        else:
            a, b = sg["t0"], min(sg["t0"] + 1.8, sg["show1"])
        self.loop_range = (a, b)
        self.playhead = a
        self._stop_play()
        self._start_play()

    # ---- filter/adjust: LUT dihitung di thread (ffmpeg), dipasang di thread utama
    def _schedule_frame(self, delay=250):
        """Dipanggil saat filter/adjustment berubah."""
        if not self.video_path:
            return
        if self._look_job:
            self.after_cancel(self._look_job)
        self._look_job = self.after(delay, self._apply_look_async)

    def _apply_look_async(self):
        self._look_job = None
        if not self.engine:
            return
        self._look_gen += 1
        gen = self._look_gen
        flt, adj = self.filter_key, self._adjust_values()
        self._look_result = None

        def work():
            try:
                from modules.gl_engine import GLEngine
                self._look_result = (gen, GLEngine.compute_look(flt, adj), None)
            except Exception as ex:
                self._look_result = (gen, None, str(ex))
        threading.Thread(target=work, daemon=True).start()
        self.after(100, lambda: self._poll_look(gen))

    def _poll_look(self, gen):
        if gen != self._look_gen:
            return
        r = self._look_result
        if not r or r[0] != gen:
            self.after(100, lambda: self._poll_look(gen))
            return
        _, look, err = r
        if look is not None and self.engine:
            self.engine.apply_look(look, self.filter_intensity)
            if not self.playing:
                self._mark_dirty(0, resync=False)

    # ================================================== thumbnail filter (sekali, prioritas rendah)
    def _start_thumbs(self):
        if self._thumb_started or not self.video_path:
            return
        self._thumb_started = True
        t = min(max(self.playhead, 0), max(self.src_dur - 0.2, 0))
        keys = list(self._flt_buttons.keys())
        self._thumb_queue = []

        def work():
            for k in keys:
                png = os.path.join(self.tmp_dir, f"_thumb_{k}.png")
                try:
                    render_preview_frame(self.video_path, t, png, 96, k, 1.0, None)
                    self._thumb_queue.append((k, png))
                except Exception:
                    pass
        threading.Thread(target=work, daemon=True).start()
        self.after(300, self._poll_thumbs)

    def _poll_thumbs(self):
        q, self._thumb_queue = self._thumb_queue, []
        for k, png in q:
            try:
                img = Image.open(png).convert("RGB")
                img.load()
                w, h = 64, 64
                ratio = img.height / img.width
                im = img.resize((w, int(w * ratio))).crop((0, 0, w, min(int(w * ratio), 40)))
                ci = ctk.CTkImage(light_image=im, dark_image=im, size=(im.width, im.height))
                self._thumbs[k] = ci
                self._flt_buttons[k].configure(image=ci)
            except Exception:
                pass
        if len(self._thumbs) < len(self._flt_buttons):
            self.after(400, self._poll_thumbs)

    # ================================================== timeline
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
        W = max(c.winfo_width(), 300)
        spans = self._spans()
        durs = [max(sp[1] - sp[0], 0.0) if sp else 0.0 for sp in spans]
        total = sum(durs) or 1.0
        x = 0.0
        for i, (sp, d) in enumerate(zip(spans, durs)):
            w = d / total * (W - 2)
            col = SEG_COLORS[i % len(SEG_COLORS)]
            c.create_rectangle(x, 8, x + max(w, 3), 52, fill=col, outline="white" if i == self.sel else "", width=2)
            c.create_text(x + max(w, 3) / 2, 30, text=str(i + 1), fill="white", font=("Arial", 10, "bold"))
            if i > 0 and TR_KEY.get(self.rows[i]["transition"].get(), "cut") != "cut":
                c.create_text(x, 58, text="x", fill="#fbbf24", font=("Arial", 9, "bold"))
            x += w
        used = sum((min(sp[1], self.src_dur) - max(sp[0], 0)) for sp in spans if sp and sp[1] > sp[0])
        self.lbl_usage.configure(text=f"Dipakai {used:.1f}s dari {self.src_dur:.1f}s video asli  |  Dibuang {max(self.src_dur - used, 0):.1f}s")
        self._update_total()

    def _on_canvas_resize(self, e):
        # jangan gambar ulang tiap langkah drag jendela (bikin lag); tunggu sampai berhenti
        if getattr(self, "_resize_job", None):
            self.after_cancel(self._resize_job)
        self._resize_job = self.after(250, self._redraw_timeline)

    def _on_canvas_click(self, e):
        spans = self._spans()
        durs = [max(sp[1] - sp[0], 0.0) if sp else 0.0 for sp in spans]
        total = sum(durs) or 1.0
        W = max(self.canvas.winfo_width(), 300)
        x = 0.0
        for i, d in enumerate(durs):
            w = d / total * (W - 2)
            if x <= e.x <= x + max(w, 3):
                self._select(i)
                return
            x += w

    def _update_total(self):
        try:
            segs = self._collect_segments()
            self.lbl_total.configure(text=f"Hasil ~{recipe_total_duration(segs, float(self.s_trans.get())):.1f}s")
        except Exception:
            self.lbl_total.configure(text="")

    # ================================================== audio
    def _pick_music(self):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.mp3 *.wav *.m4a *.aac")])
        if p:
            self.music_path = p
            self.lbl_music.configure(text=os.path.basename(p)[:12], text_color="white")
            self.audio_var.set("music")

    def _pick_sep_vo(self):
        p = filedialog.askopenfilename(filetypes=[("Audio", "*.wav *.mp3 *.m4a *.aac")])
        if p:
            self.sep_vo_path = p
            self.lbl_sepvo.configure(text=os.path.basename(p)[:28], text_color="white")

    # ================================================== render
    def _status(self, text, color="gray"):
        self.lbl_status.configure(text=text, text_color=color)

    def _collect_segments(self):
        data = []
        for r in self.rows:
            data.append({
                "start": r["start"].get(), "end": r["end"].get(),
                "text": r["text"].get(), "vo": r["vo"].get(), "vo_file": r["vo_file"],
                "transition": TR_KEY.get(r["transition"].get(), "cut"),
                "effect": FX_KEY.get(r["effect"].get(), "none"),
            })
        return parse_recipe(data)

    def _render(self, preview):
        if self.busy:
            return
        if not self.video_path:
            messagebox.showerror("Error", "Pilih dulu video mentahnya.")
            return
        try:
            segs = self._collect_segments()
        except ValueError as e:
            messagebox.showerror("Resep tidak valid", str(e))
            return
        name = self.e_out.get().strip()
        if not preview:
            if not name:
                messagebox.showerror("Error", "Isi dulu nama file hasil.")
                return
            if not name.lower().endswith(".mp4"):
                name += ".mp4"

        vo_on = self.v_vo.get() and any(s["vo"] and not s["vo_file"] for s in segs)
        if preview and not self.v_prev_vo.get():
            vo_on = False      # hemat kuota API: VO AI baru dibuat saat Ekspor
        tts = None
        if vo_on:
            tts = self.app.make_tts(self.c_voice.get())
            if tts is None:
                return
        kwargs = dict(
            video_path=self.video_path, segments=segs,
            output_path=(os.path.join(self.tmp_dir, "_studio_preview.mp4") if preview else os.path.join(self.app.output_dir, name)),
            tts_func=tts, vo_enabled=vo_on, audio_mode=self.audio_var.get(),
            music_path=self.music_path, music_volume=self.s_music.get() / 100.0,
            separate_vo_path=self.sep_vo_path, text_style=self._current_text_style(),
            filter_preset=self.filter_key, filter_intensity=self.filter_intensity, adjust=self._adjust_values(),
            caption=({"style": self.c_cap.get()} if self.v_caption.get() else None),
            transition_sec=float(self.s_trans.get()), preview=preview, eco=self.v_eco.get(), tmp_dir=self.tmp_dir,
        )
        self.busy = True
        for b in (self.btn_prev, self.btn_export):
            b.configure(state="disabled")
        self._status(("Membuat preview" + ("" if vo_on else " (tanpa VO AI, hemat kuota)") + "...") if preview
                     else "Mengekspor video...", "white")
        self._result = None

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
        threading.Thread(target=work, daemon=True).start()
        self.after(400, self._poll_result)

    def _poll_result(self):
        if self._result is None:
            self.after(400, self._poll_result)
            return
        (path, err, preview), self._result = self._result, None
        self.busy = False
        for b in (self.btn_prev, self.btn_export):
            b.configure(state="normal")
        if err:
            self._status("Gagal. Lihat log di bawah.", "#f87171")
            messagebox.showerror("Render gagal", err[-600:])
            return
        self._status("Preview dibuka." if preview else f"Selesai: {path}", "#4ade80")
        _open_file(path)
