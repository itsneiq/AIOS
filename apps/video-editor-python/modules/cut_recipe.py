# modules/cut_recipe.py
"""
CutRecipe: susun ulang SATU video mentahan berdasarkan "resep potongan", lalu render jadi satu video baru.

Tiap segmen punya: start, end, text (overlay), vo (teks suara) / vo_file (file suara sendiri),
transition (transisi MASUK dari segmen sebelumnya), effect (efek pada segmen itu).
Global: filter warna, adjustment, gaya teks, auto-caption (Whisper), mode audio, musik, voiceover terpisah.

Format resep simpel (satu potongan per baris):
48-51 | Teks overlay | Teks VO (opsional)
JSON juga didukung: [{"start": 48, "end": 51, "text": "...", "vo": "...", "transition": "fade", "effect": "zoom_in"}]
"""
import os
import re
import json
import time
import shutil
import hashlib
import subprocess

FONTS_DIR_DEFAULT = "assets/fonts"
OUT_FPS = 30
MAX_VO_SPEEDUP = 1.2
DEFAULT_TRANSITION_SEC = 0.3

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002B00-\U00002BFF"
    "\U0000FE0F\U0000200D\U00002190-\U000021FF]+",
    flags=re.UNICODE,
)

# key -> label tampilan. "cut" = potong langsung (tanpa transisi). Selain itu = nama transisi ffmpeg xfade.
TRANSITIONS = {
    "cut": "Potong langsung",
    "fade": "Fade",
    "dissolve": "Dissolve",
    "wipeleft": "Wipe kiri",
    "wiperight": "Wipe kanan",
    "slideleft": "Geser kiri",
    "slideright": "Geser kanan",
    "slideup": "Geser atas",
    "circleopen": "Lingkaran buka",
    "zoomin": "Zoom masuk",
    "pixelize": "Pixelize",
    "radial": "Radial",
}

EFFECTS = {
    "none": "Tanpa efek",
    "zoom_in": "Zoom In",
    "zoom_out": "Zoom Out",
    "pulse": "Pulse (denyut)",
    "shake": "Shake (getar)",
    "glitch": "Glitch RGB",
    "flash": "Flash putih",
    "fade_in": "Fade dari hitam",
    "vignette": "Vinyet",
}

FILTER_PRESETS = {
    "none": ("Tanpa filter", None),
    "cerah_pop": ("Cerah Pop", "eq=contrast=1.15:brightness=0.03:saturation=1.3"),
    "warm_cozy": ("Hangat Cozy", "eq=contrast=1.05:brightness=0.02:saturation=1.1,colorbalance=rs=0.08:gs=0.02:bs=-0.08"),
    "clean_minimal": ("Bersih Minimal", "eq=contrast=1.08:brightness=0.0:saturation=0.9"),
    "moody_cinematic": ("Moody Sinematik", "eq=contrast=1.2:brightness=-0.03:saturation=0.85,colorbalance=rs=-0.05:bs=0.1"),
    "hitam_putih": ("Hitam Putih", "hue=s=0,eq=contrast=1.1"),
    "dingin_biru": ("Dingin Biru", "colorbalance=rs=-0.06:bs=0.1,eq=saturation=1.05"),
    "vintage": ("Vintage", "eq=contrast=0.95:saturation=0.8,colorbalance=rs=0.08:gs=0.03:bs=-0.1"),
    "tajam_segar": ("Tajam Segar", "eq=contrast=1.1:saturation=1.15,unsharp=5:5:0.8:5:5:0"),
}

DEFAULT_ADJUST = {
    "brightness": 0.0,   # -0.4 .. 0.4
    "contrast": 1.0,     # 0.6 .. 1.6
    "saturation": 1.0,   # 0 .. 2
    "temperature": 0.0,  # -1 (dingin) .. 1 (hangat)
    "sharpness": 0.0,    # 0 .. 2
    "vignette": 0.0,     # 0 .. 1
    "grain": 0.0,        # 0 .. 1
}

DEFAULT_TEXT_STYLE = {
    "font_name": "Arial Black",
    "size_pct": 3.6,        # % dari tinggi video
    "text_hex": "FFFFFF",
    "outline_hex": "000000",
    "position": "top",      # top | middle | bottom
    "offset_pct": 25.0,     # jarak dari tepi atas (top) atau bawah (bottom), % tinggi video
    "bold": True,
    "box": False,           # kotak latar di belakang teks
    "animate": True,        # fade in/out singkat
}

DEFAULT_RECIPE = [
    {"start": 48, "end": 51, "text": "Kulkas kotor gini bisa balik putih lagi?", "vo": "Kulkas sekotor ini... beneran bisa putih lagi?"},
    {"start": 8, "end": 10, "text": "Bau busuk, kerak, noda membandel", "vo": "Bau, kerak, noda nempel semua."},
    {"start": 26, "end": 28, "text": "Cukup pakai ini", "vo": "Aku cuma pakai ini."},
    {"start": 16, "end": 18, "text": "Semprot...", "vo": "Semprot aja..."},
    {"start": 21, "end": 25, "text": "...lap, kerak langsung keangkat", "vo": "...terus lap. Keraknya langsung keangkat."},
    {"start": 43, "end": 46, "text": "Karet pintu kuning juga beres", "vo": "Karet pintu yang udah kuning juga ikut bersih."},
    {"start": 53, "end": 55, "text": "Kulkas bersih, wangi, siap dipakai", "vo": "Kulkas jadi bersih, nggak bau lagi."},
    {"start": 56, "end": 57, "text": "Cek di keranjang kuning", "vo": "Cek keranjang kuning, ya!"},
]


def make_cached_tts(tts_raw, voice_key: str, cache_dir: str):
    """Bungkus fungsi TTS: teks + suara yang sama tidak dibuat ulang (hemat waktu dan kuota API)."""
    os.makedirs(cache_dir, exist_ok=True)

    def tts(text: str, out_path: str):
        key = hashlib.sha1(f"{voice_key}||{text}".encode("utf-8")).hexdigest()[:20]
        cached = os.path.join(cache_dir, key + ".wav")
        if os.path.exists(cached) and os.path.getsize(cached) > 1000:
            shutil.copyfile(cached, out_path)
            print(f"[CACHE] VO dipakai ulang: \"{text[:30]}\"")
            return
        tts_raw(text, out_path)
        try:
            shutil.copyfile(out_path, cached)
        except OSError:
            pass
    return tts


# ==========================================================
# Parsing & validasi resep
# ==========================================================
def _parse_time(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", ".")
    if ":" in s:
        t = 0.0
        for p in [float(x) for x in s.split(":")]:
            t = t * 60 + p
        return t
    return float(s)


def strip_emoji(text: str) -> str:
    return re.sub(r"\s{2,}", " ", _EMOJI_RE.sub("", text or "")).strip()


_LINE_RE = re.compile(
    r"^\s*([\d:.,]+)\s*(?:-|–|—|->|s/d|sampai)\s*([\d:.,]+)\s*(?:\|(.*))?$",
    flags=re.IGNORECASE,
)


def _parse_lines(raw: str) -> list:
    """Format simpel: `48-51 | teks overlay | teks vo`. Baris kosong / diawali # diabaikan."""
    rows = []
    for no, line in enumerate(raw.splitlines(), start=1):
        if not line.strip() or line.strip().startswith("#"):
            continue
        m = _LINE_RE.match(line)
        if not m:
            raise ValueError(f"Baris {no} tidak dikenali: \"{line.strip()[:50]}\". "
                             f"Format: 48-51 | teks overlay | teks VO")
        parts = [p.strip() for p in (m.group(3) or "").split("|")]
        rows.append({"start": m.group(1), "end": m.group(2),
                     "text": parts[0] if parts else "", "vo": parts[1] if len(parts) > 1 else ""})
    return rows


def parse_recipe(raw) -> list:
    """Terima string (JSON atau format baris) / list / dict {"segments": [...]}. Return list segmen bersih."""
    if isinstance(raw, str):
        raw = raw.strip()
        if not raw:
            raise ValueError("Resep kosong.")
        if raw[0] in "[{":
            try:
                data = json.loads(raw)
            except json.JSONDecodeError as e:
                raise ValueError(f"Resep (JSON) tidak valid: {e}")
        else:
            data = _parse_lines(raw)
    else:
        data = raw

    if isinstance(data, dict):
        data = data.get("segments") or data.get("recipe") or []
    if not isinstance(data, list) or not data:
        raise ValueError("Resep harus berupa daftar segmen (list) dan tidak boleh kosong.")

    segments = []
    for i, row in enumerate(data, start=1):
        if not isinstance(row, dict):
            raise ValueError(f"Baris {i}: harus berupa objek {{start, end, text, vo}}.")
        try:
            start, end = _parse_time(row["start"]), _parse_time(row["end"])
        except KeyError:
            raise ValueError(f"Baris {i}: field 'start' dan 'end' wajib ada.")
        except ValueError:
            raise ValueError(f"Baris {i}: 'start'/'end' bukan angka atau format mm:ss yang valid.")
        if start < 0 or end <= start:
            raise ValueError(f"Baris {i}: waktu tidak valid (start={start}, end={end}); end harus > start >= 0.")
        tr = str(row.get("transition", "cut") or "cut")
        fx = str(row.get("effect", "none") or "none")
        segments.append({
            "start": start, "end": end,
            "text": strip_emoji(str(row.get("text", "") or "")),
            "vo": strip_emoji(str(row.get("vo", "") or "")),
            "vo_file": row.get("vo_file") or None,
            "transition": tr if tr in TRANSITIONS else "cut",
            "effect": fx if fx in EFFECTS else "none",
        })
    return segments


def recipe_total_duration(segments: list, transition_sec: float = DEFAULT_TRANSITION_SEC) -> float:
    """Perkiraan durasi hasil (transisi non-cut memendekkan durasi sebesar lama transisinya)."""
    total, prev = 0.0, None
    for s in segments:
        d = s["end"] - s["start"]
        total += d
        if prev is not None and s.get("transition", "cut") != "cut":
            total -= min(transition_sec, 0.45 * min(prev, d))
        prev = d
    return total


def recipe_to_lines(segments: list) -> str:
    out = []
    for r in segments:
        line = f"{r['start']:g}-{r['end']:g} | {r.get('text', '')}"
        if r.get("vo"):
            line += f" | {r['vo']}"
        out.append(line)
    return "\n".join(out)


# ==========================================================
# ffprobe / ffmpeg helpers
# ==========================================================
def probe_video(path: str) -> dict:
    cmd = ["ffprobe", "-v", "error", "-show_entries",
           "stream=codec_type,width,height:format=duration", "-of", "json", path]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        raise RuntimeError(f"ffprobe gagal membaca video: {r.stderr.strip()}")
    info = json.loads(r.stdout or "{}")
    streams = info.get("streams", [])
    v = next((s for s in streams if s.get("codec_type") == "video"), None)
    if not v:
        raise RuntimeError("File ini tidak punya track video.")
    return {
        "width": int(v["width"]), "height": int(v["height"]),
        "duration": float(info["format"]["duration"]),
        "has_audio": any(s.get("codec_type") == "audio" for s in streams),
    }


def _audio_duration(path: str) -> float:
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                        "-of", "default=noprint_wrappers=1:nokey=1", path],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(r.stdout.strip())


def extract_frame(video_path: str, t: float, out_png: str, width: int = 360) -> str:
    """Ambil satu frame di detik t (untuk thumbnail/preview di GUI)."""
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{max(t, 0):.3f}", "-i", video_path,
           "-frames:v", "1", "-vf", f"scale={width}:-2", out_png]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0 or not os.path.exists(out_png):
        raise RuntimeError(f"Gagal mengambil frame: {r.stderr.strip()[-200:]}")
    return out_png


# ==========================================================
# Filter builders
# ==========================================================
def build_color_filters(filter_preset: str = "none", adjust: dict = None) -> str:
    """Gabungkan preset filter + adjustment jadi satu rantai filter ffmpeg ("" kalau netral)."""
    parts = []
    preset = FILTER_PRESETS.get(filter_preset or "none", FILTER_PRESETS["none"])[1]
    if preset:
        parts.append(preset)

    a = {**DEFAULT_ADJUST, **(adjust or {})}
    eq = []
    if abs(a["brightness"]) > 0.005:
        eq.append(f"brightness={a['brightness']:.3f}")
    if abs(a["contrast"] - 1.0) > 0.005:
        eq.append(f"contrast={a['contrast']:.3f}")
    if abs(a["saturation"] - 1.0) > 0.005:
        eq.append(f"saturation={a['saturation']:.3f}")
    if eq:
        parts.append("eq=" + ":".join(eq))
    if abs(a["temperature"]) > 0.01:
        t = a["temperature"]
        parts.append(f"colorbalance=rs={t * 0.15:.3f}:gs={t * 0.03:.3f}:bs={-t * 0.15:.3f}")
    if a["sharpness"] > 0.02:
        parts.append(f"unsharp=5:5:{a['sharpness']:.3f}:5:5:0")
    if a["vignette"] > 0.02:
        angle = 1.5708 - a["vignette"] * (1.5708 - 0.5236)   # PI/2 (lemah) .. PI/6 (kuat)
        parts.append(f"vignette=angle={angle:.4f}")
    if a["grain"] > 0.02:
        parts.append(f"noise=alls={a['grain'] * 25:.1f}:allf=t")
    return ",".join(parts)


def _effect_filter(effect: str, dur: float, W: int, H: int) -> str:
    """Filter ffmpeg untuk satu efek pada satu segmen (input sudah W x H, waktu mulai dari 0)."""
    d = max(dur, 0.1)
    if effect == "zoom_in":
        z = f"(1+0.15*t/{d:.3f})"
    elif effect == "zoom_out":
        z = f"(1.15-0.15*t/{d:.3f})"
    elif effect == "pulse":
        z = "(1+0.05*abs(sin(t*6)))"
    else:
        z = None
    if z:
        return (f"scale=w='trunc(iw*{z}/2)*2':h='trunc(ih*{z}/2)*2':eval=frame,crop={W}:{H}")
    if effect == "shake":
        return (f"crop=w=iw*0.94:h=ih*0.94:x='(iw-ow)/2+sin(t*40)*iw*0.02':"
                f"y='(ih-oh)/2+cos(t*47)*ih*0.02',scale={W}:{H}")
    if effect == "glitch":
        return "rgbashift=rh=8:bh=-8:enable='lt(mod(t,0.6),0.12)'"
    if effect == "flash":
        return "fade=t=in:st=0:d=0.25:color=white"
    if effect == "fade_in":
        return "fade=t=in:st=0:d=0.3"
    if effect == "vignette":
        return "vignette=angle=0.6"
    return ""


# ==========================================================
# ASS overlay teks
# ==========================================================
def _ass_time(t: float) -> str:
    cs = int(round(t * 100))
    h, cs = divmod(cs, 360000)
    m, cs = divmod(cs, 6000)
    s, cs = divmod(cs, 100)
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def _hex_to_ass(hex_code: str) -> str:
    h = hex_code.strip().lstrip("#").upper()
    if len(h) != 6:
        raise ValueError(f"Kode warna hex tidak valid: {hex_code}")
    return f"&H00{h[4:6]}{h[2:4]}{h[0:2]}"


def build_overlay_ass(entries: list, width: int, height: int, style: dict) -> str:
    """entries: [(start, end, text)] pada timeline hasil."""
    st = {**DEFAULT_TEXT_STYLE, **(style or {})}
    font_size = max(12, round(height * st["size_pct"] / 100))
    side = int(width * 0.06)
    margin_v = round(height * st["offset_pct"] / 100)
    alignment = {"top": 8, "middle": 5, "bottom": 2}.get(st["position"], 8)
    if st["box"]:
        border_style, outline, back = 3, max(6, round(font_size / 4)), "&H99000000"
    else:
        border_style, outline, back = 1, max(2, round(font_size / 10)), "&H80000000"
    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Overlay,{st['font_name']},{font_size},{_hex_to_ass(st['text_hex'])},&H00FFFFFF,"
        f"{_hex_to_ass(st['outline_hex'])},{back},{-1 if st['bold'] else 0},0,0,0,100,100,0,0,"
        f"{border_style},{outline},1,{alignment},{side},{side},{margin_v},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    fad = "{\\fad(180,180)}" if st["animate"] else ""
    lines = []
    for start, end, text in entries:
        if not text:
            continue
        safe = text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Overlay,,0,0,0,,{fad}{safe}")
    return header + "\n".join(lines) + "\n"


# ==========================================================
# Render
# ==========================================================
def _run_ffmpeg(cmd: list, codec_idx: int, cwd: str) -> subprocess.CompletedProcess:
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=cwd)
    if r.returncode != 0 and "nvenc" in " ".join(cmd).lower():
        print("[WARNING] Encoding NVENC (GPU) gagal, fallback ke CPU (libx264)...")
        cpu = cmd.copy()
        cpu[codec_idx] = "libx264"
        cleaned, skip = [], 0
        for c in cpu:
            if skip:
                skip -= 1
                continue
            if c in ("-preset", "-cq"):
                skip = 1
                continue
            cleaned.append(c)
        r = subprocess.run(cleaned, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=cwd)
    return r


def render_cut_recipe(
    video_path: str,
    segments: list,
    output_path: str,
    tts_func=None,
    vo_enabled: bool = False,
    audio_mode: str = "original",          # original | mute | music
    music_path: str = None,
    music_volume: float = 0.2,
    separate_vo_path: str = None,          # satu file VO utuh, diputar dari detik 0
    text_style: dict = None,
    filter_preset: str = "none",
    adjust: dict = None,
    caption: dict = None,                  # {"style": preset-name|dict} -> auto caption Whisper
    transition_sec: float = DEFAULT_TRANSITION_SEC,
    preview: bool = False,                 # render kecil & cepat untuk dicek
    fonts_dir: str = FONTS_DIR_DEFAULT,
    tmp_dir: str = "_tmp",
    max_vo_speedup: float = MAX_VO_SPEEDUP,
) -> str:
    t_start = time.time()
    video_path = os.path.abspath(video_path)
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_dir = os.path.abspath(tmp_dir)
    base = os.path.splitext(os.path.basename(output_path))[0]

    info = probe_video(video_path)
    W, H, src_dur = info["width"] - info["width"] % 2, info["height"] - info["height"] % 2, info["duration"]
    if preview and H > 640:
        W, H = int(round(W * 640 / H / 2) * 2), 640

    # ---- 1. validasi / clamp segmen ----
    segs = []
    for i, s in enumerate(segments, start=1):
        st, en = s["start"], min(s["end"], src_dur)
        if st >= src_dur:
            print(f"[WARNING] Segmen {i} dilewati: start {st:.1f}s melebihi durasi video ({src_dur:.1f}s).")
            continue
        if en < s["end"]:
            print(f"[WARNING] Segmen {i}: end dipotong ke {en:.1f}s (durasi video {src_dur:.1f}s).")
        segs.append({**s, "start": st, "end": en, "speed": 1.0, "vo_audio": s.get("vo_file")})
    if not segs:
        raise ValueError("Tidak ada segmen yang valid terhadap durasi video.")
    segs[0]["transition"] = "cut"

    def _td(i):
        """Lama transisi masuk ke segmen i (0 kalau cut / segmen pertama)."""
        if i == 0 or segs[i].get("transition", "cut") == "cut":
            return 0.0
        d_prev = segs[i - 1]["end"] - segs[i - 1]["start"]
        d_cur = segs[i]["end"] - segs[i]["start"]
        return max(0.05, min(transition_sec, 0.45 * min(d_prev, d_cur)))

    # ---- 2. VO per segmen (file sendiri atau TTS) + cek durasi ----
    for i, s in enumerate(segs):
        if not s["vo_audio"] and vo_enabled and s.get("vo"):
            if tts_func is None:
                raise ValueError("VO aktif tapi tts_func tidak diberikan.")
            f = os.path.join(tmp_dir, f"{base}_cr_vo_{i + 1}.wav")
            tts_func(s["vo"], f)
            s["vo_audio"] = f
        if s["vo_audio"]:
            d = _audio_duration(s["vo_audio"])
            avail = (s["end"] - s["start"]) - _td(i)
            if d > avail:
                speed = min(d / avail, max_vo_speedup)
                d_fast = d / speed
                s["speed"] = speed
                if d_fast > avail + 0.05:
                    new_end = min(s["end"] + (d_fast - avail) + 0.1, src_dur)
                    print(f"[WARNING] VO segmen {i + 1} ({d:.1f}s) lebih panjang dari segmen ({avail:.1f}s): "
                          f"dipercepat {speed:.2f}x dan segmen diperpanjang ke {new_end:.1f}s.")
                    s["end"] = new_end
                else:
                    print(f"[INFO] VO segmen {i + 1} dipercepat {speed:.2f}x agar muat.")
    use_vo = any(s["vo_audio"] for s in segs) or bool(separate_vo_path)
    t_vo = time.time()

    # ---- 3. timeline hasil (transisi menumpuk sebagian segmen) ----
    acc = 0.0
    for i, s in enumerate(segs):
        d = s["end"] - s["start"]
        td = _td(i)
        s["td"] = td
        s["t0"] = acc - td if i else 0.0
        s["show0"] = s["t0"] + td          # saat teks dan VO segmen ini mulai
        s["show1"] = s["t0"] + d
        acc = s["t0"] + d
    total = acc
    print(f"[INFO] {len(segs)} segmen, durasi hasil {total:.1f}s")

    # ---- 4. overlay ASS ----
    ass_name = f"{base}_cr_overlay.ass"
    with open(os.path.join(tmp_dir, ass_name), "w", encoding="utf-8") as f:
        f.write(build_overlay_ass([(s["show0"], s["show1"], s["text"]) for s in segs], W, H, text_style))

    # ---- 5. graf video ----
    inputs = ["-i", video_path]
    fc = []
    n = len(segs)
    for i, s in enumerate(segs):
        d = s["end"] - s["start"]
        chain = (f"[0:v]trim=start={s['start']:.3f}:end={s['end']:.3f},setpts=PTS-STARTPTS,"
                 f"fps={OUT_FPS},scale={W}:{H},setsar=1,format=yuv420p")
        fx = _effect_filter(s.get("effect", "none"), d, W, H)
        if fx:
            chain += "," + fx + ",format=yuv420p"
        fc.append(chain + f"[v{i}]")

    cur = "v0"
    for i in range(1, n):
        out = f"vx{i}"
        if segs[i]["td"] > 0:
            offset = segs[i]["t0"]
            fc.append(f"[{cur}][v{i}]xfade=transition={segs[i]['transition']}:"
                      f"duration={segs[i]['td']:.3f}:offset={offset:.3f}[{out}]")
        else:
            fc.append(f"[{cur}][v{i}]concat=n=2:v=1:a=0[{out}]")
        cur = out

    color = build_color_filters(filter_preset, adjust)
    fonts_escaped = os.path.abspath(fonts_dir).replace("\\", "/").replace(":", "\\:")
    post = (color + "," if color else "") + f"subtitles={ass_name}:fontsdir='{fonts_escaped}'"
    fc.append(f"[{cur}]{post}[vout]")

    # ---- 6. graf audio ----
    labels = []
    nxt = 1

    if audio_mode == "original" and info["has_audio"] and not use_vo:
        for i, s in enumerate(segs):
            fc.append(f"[0:a]atrim=start={s['start']:.3f}:end={s['end']:.3f},asetpts=PTS-STARTPTS,"
                      f"aresample=44100,aformat=sample_fmts=fltp:channel_layouts=stereo[a{i}]")
        acur = "a0"
        for i in range(1, n):
            out = f"ax{i}"
            if segs[i]["td"] > 0:
                fc.append(f"[{acur}][a{i}]acrossfade=d={segs[i]['td']:.3f}[{out}]")
            else:
                fc.append(f"[{acur}][a{i}]concat=n=2:v=0:a=1[{out}]")
            acur = out
        labels.append(f"[{acur}]")
    elif audio_mode == "original" and use_vo:
        print("[INFO] Ada VO: audio asli video dimatikan supaya suara tidak bertabrakan.")
    elif audio_mode == "original" and not info["has_audio"]:
        print("[INFO] Video asli tidak punya audio, dilewati.")

    for i, s in enumerate(segs):
        if not s["vo_audio"]:
            continue
        inputs += ["-i", os.path.abspath(s["vo_audio"])]
        tempo = f"atempo={s['speed']:.4f}," if s["speed"] > 1.0001 else ""
        fc.append(f"[{nxt}:a]{tempo}aresample=44100,adelay={int(round(s['show0'] * 1000))}:all=1[vo{i}]")
        labels.append(f"[vo{i}]")
        nxt += 1

    if separate_vo_path:
        inputs += ["-i", os.path.abspath(separate_vo_path)]
        fc.append(f"[{nxt}:a]aresample=44100[vosep]")
        labels.append("[vosep]")
        nxt += 1

    if audio_mode == "music" and music_path:
        inputs += ["-stream_loop", "-1", "-i", os.path.abspath(music_path)]
        fade_start = max(total - 0.5, 0)
        fc.append(f"[{nxt}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,aresample=44100,"
                  f"volume={(music_volume if use_vo else max(music_volume, 0.6)):.3f},"
                  f"afade=t=out:st={fade_start:.3f}:d=0.5[music]")
        labels.append("[music]")
        nxt += 1
    elif audio_mode == "music" and not music_path:
        print("[WARNING] Mode Musik Latar dipilih tapi file musik belum dipilih.")

    has_audio_out = bool(labels)
    if has_audio_out:
        mix = labels[0] if len(labels) == 1 else (
            "".join(labels) + f"amix=inputs={len(labels)}:duration=longest,")
        if len(labels) == 1:
            fc.append(f"{mix}apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
        else:
            fc.append(f"{mix}apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]")

    # ---- 7. encode ----
    want_caption = bool(caption) and not preview
    render_target = (os.path.join(tmp_dir, f"{base}_cr_precaption.mp4") if want_caption else output_path)

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]"]
    if has_audio_out:
        cmd += ["-map", "[aout]"]
    codec_idx = len(cmd) + 1
    if preview:
        cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "30", "-pix_fmt", "yuv420p"]
    else:
        cmd += ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19", "-pix_fmt", "yuv420p"]
    if has_audio_out:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ar", "44100"]
    cmd += ["-t", f"{total:.3f}", "-movflags", "+faststart", render_target]

    r = _run_ffmpeg(cmd, codec_idx, cwd=tmp_dir)
    if r.returncode != 0:
        raise RuntimeError(f"Render CutRecipe gagal.\nSTDERR: {r.stderr[-1500:]}")
    t_render = time.time()

    # ---- 8. auto caption (Whisper) di atas hasil jadi ----
    if want_caption:
        if not has_audio_out:
            print("[WARNING] Auto caption dilewati: video hasil tidak punya audio.")
            os.replace(render_target, output_path)
        else:
            from modules.subtitle_gen import generate_subtitles, burn_subtitles_to_video
            wav = os.path.join(tmp_dir, f"{base}_cr_caption.wav")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", render_target, "-vn",
                            "-ac", "1", "-ar", "16000", wav], check=True)
            srt = os.path.join(tmp_dir, f"{base}_cr_caption.srt")
            generate_subtitles(wav, srt)
            burn_subtitles_to_video(render_target, output_path, main_srt_path=srt,
                                    main_style=caption.get("style", "simple"))

    # ---- 9. bersihin file sementara ----
    for fn in os.listdir(tmp_dir):
        if fn.startswith(f"{base}_cr_"):
            try:
                os.remove(os.path.join(tmp_dir, fn))
            except OSError:
                pass

    t_end = time.time()
    print(f"[WAKTU] VO/TTS {t_vo - t_start:.1f}s | render ffmpeg {t_render - t_vo:.1f}s | "
          f"caption+bersih-bersih {t_end - t_render:.1f}s | total {t_end - t_start:.1f}s")
    print(f"[INFO] CutRecipe selesai: {output_path} ({total:.1f}s)")
    return output_path
