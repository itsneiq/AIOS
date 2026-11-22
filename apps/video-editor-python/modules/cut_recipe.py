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
import sys
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

from modules.cut_catalog import (  # noqa: E402,F401
    TRANSITIONS, EFFECTS, FILTERS, FILTER_ALIASES, ADJUSTMENTS, DEFAULT_ADJUST, TEXT_PRESETS, DEFAULT_TEXT_STYLE,
)

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


def render_preview_frame(video_path: str, t: float, out_png: str, width: int = 360,
                         filter_preset: str = "none", filter_intensity: float = 1.0,
                         adjust: dict = None, effect: str = "none") -> str:
    """Satu frame di detik t dengan filter + adjustment terpasang (ringan, buat preview instan)."""
    graph = f"[0:v]scale={width}:-2,setsar=1,format=yuv420p[s]"
    src = "s"
    graph += ";" + build_color_graph(src, "out", filter_preset, adjust, filter_intensity)
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-ss", f"{max(t, 0):.3f}", "-i", video_path,
           "-filter_complex", graph, "-map", "[out]", "-frames:v", "1", out_png]
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", **_popen_kwargs(True))
    if r.returncode != 0 or not os.path.exists(out_png):
        raise RuntimeError(f"Preview frame gagal: {r.stderr.strip()[-200:]}")
    return out_png


# ==========================================================
# Filter builders
# ==========================================================
def _adjust_chain(adjust: dict = None) -> str:
    """Rantai filter dari slider Adjustment ("" kalau semua netral)."""
    a = {**DEFAULT_ADJUST, **(adjust or {})}
    parts = []
    if abs(a["exposure"]) > 0.01:
        parts.append(f"exposure=exposure={a['exposure'] * 1.5:.3f}")
    if abs(a["temperature"]) > 0.01:
        t = a["temperature"]
        parts.append(f"colorbalance=rs={t * 0.15:.3f}:gs={t * 0.03:.3f}:bs={-t * 0.15:.3f}:"
                     f"rm={t * 0.1:.3f}:bm={-t * 0.1:.3f}")
    if abs(a["tint"]) > 0.01:
        parts.append(f"colorbalance=gs={-a['tint'] * 0.15:.3f}:gm={-a['tint'] * 0.1:.3f}:"
                     f"rs={a['tint'] * 0.05:.3f}:bs={a['tint'] * 0.05:.3f}")
    eq = []
    if abs(a["brightness"]) > 0.005:
        eq.append(f"brightness={a['brightness']:.3f}")
    if abs(a["contrast"] - 1.0) > 0.005:
        eq.append(f"contrast={a['contrast']:.3f}")
    if abs(a["saturation"] - 1.0) > 0.005:
        eq.append(f"saturation={a['saturation']:.3f}")
    if eq:
        parts.append("eq=" + ":".join(eq))
    # highlights/shadows/whites/blacks/fade lewat satu kurva
    if any(abs(a[k]) > 0.005 for k in ("highlights", "shadows", "whites", "blacks")) or a["fade"] > 0.01:
        lo = max(0.0, a["blacks"] + a["fade"] * 0.15)
        hi = min(1.0, 1.0 + a["whites"] - a["fade"] * 0.05)
        pts = [(0.0, lo), (0.25, 0.25 + a["shadows"]), (0.75, 0.75 + a["highlights"]), (1.0, hi)]
        pts = [(x, min(max(y, 0.0), 1.0)) for x, y in pts]
        parts.append("curves=all='" + " ".join(f"{x:g}/{y:.3f}" for x, y in pts) + "'")
    if a["sharpness"] > 0.02:
        parts.append(f"unsharp=5:5:{a['sharpness']:.3f}:5:5:0")
    if a["vignette"] > 0.02:
        angle = 1.5708 - a["vignette"] * (1.5708 - 0.5236)
        parts.append(f"vignette=angle={angle:.4f}")
    if a["grain"] > 0.02:
        parts.append(f"noise=alls={a['grain'] * 25:.1f}:allf=t")
    return ",".join(parts)


def _filter_chain(filter_preset: str) -> str:
    key = FILTER_ALIASES.get(filter_preset or "none", filter_preset or "none")
    return (FILTERS.get(key) or FILTERS["none"])[2] or ""


def build_color_graph(src: str, dst: str, filter_preset: str = "none", adjust: dict = None,
                      intensity: float = 1.0) -> str:
    """
    Potongan filter_complex: [src] -> filter + adjustment -> [dst]. Kalau intensity < 1,
    filter dicampur dengan gambar asli (split + blend) supaya kekuatannya bisa diatur.
    """
    f = _filter_chain(filter_preset)
    adj = _adjust_chain(adjust)
    if not f and not adj:
        return f"[{src}]null[{dst}]"
    inten = min(max(float(intensity), 0.0), 1.0)
    if f and inten < 0.98:
        mid = f"{dst}_m"
        g = (f"[{src}]split[{dst}_a][{dst}_b];[{dst}_b]{f},format=yuv420p[{dst}_c];"
             f"[{dst}_a]format=yuv420p[{dst}_d];[{dst}_d][{dst}_c]blend=all_opacity={inten:.2f}[{mid}]")
        return g + (f";[{mid}]{adj}[{dst}]" if adj else f";[{mid}]null[{dst}]")
    chain = ",".join(x for x in (f, adj) if x)
    return f"[{src}]{chain}[{dst}]"


def split_color_spatial(chain: str):
    """Pecah rantai filter: (bagian warna murni, {sharp, vignette, grain}) — dipakai mesin GPU preview."""
    color, spatial = [], {"sharp": 0.0, "vignette": 0.0, "grain": 0.0}
    for part in [x for x in (chain or "").split(",") if x]:
        if part.startswith("unsharp="):
            try:
                spatial["sharp"] = max(spatial["sharp"], float(part.split(":")[2]))
            except Exception:
                spatial["sharp"] = 0.8
        elif part.startswith("noise="):
            try:
                spatial["grain"] = max(spatial["grain"], float(part.split("alls=")[1].split(":")[0]) / 25.0)
            except Exception:
                spatial["grain"] = 0.3
        elif part.startswith("vignette="):
            try:
                ang = float(part.split("angle=")[1])
                spatial["vignette"] = max(spatial["vignette"], (1.5708 - ang) / (1.5708 - 0.5236))
            except Exception:
                spatial["vignette"] = 0.4
        else:
            color.append(part)
    return ",".join(color), spatial


def build_color_filters(filter_preset: str = "none", adjust: dict = None) -> str:
    """Versi rantai lurus (tanpa intensity), dipakai untuk preview satu frame."""
    return ",".join(x for x in (_filter_chain(filter_preset), _adjust_chain(adjust)) if x)


def _effect_filter(effect: str, dur: float, W: int, H: int) -> str:
    """Filter ffmpeg untuk satu efek pada satu segmen (input sudah W x H, waktu mulai dari 0)."""
    d = max(dur, 0.1)
    zoom = {
        "zoom_in": f"(1+0.15*t/{d:.3f})",
        "zoom_out": f"(1.15-0.15*t/{d:.3f})",
        "pulse": "(1+0.05*abs(sin(t*6)))",
        "zoom_punch": "(1+0.22*max(0,1-t/0.25))",
    }.get(effect)
    if zoom:
        return f"scale=w='trunc(iw*{zoom}/2)*2':h='trunc(ih*{zoom}/2)*2':eval=frame,crop={W}:{H}"
    if effect == "shake":
        return (f"crop=w=iw*0.94:h=ih*0.94:x='(iw-ow)/2+sin(t*40)*iw*0.02':"
                f"y='(ih-oh)/2+cos(t*47)*ih*0.02',scale={W}:{H}")
    if effect == "shake_hard":
        return (f"crop=w=iw*0.88:h=ih*0.88:x='(iw-ow)/2+sin(t*60)*iw*0.05':"
                f"y='(ih-oh)/2+cos(t*71)*ih*0.05',scale={W}:{H}")
    if effect == "tilt":
        return f"rotate=a='0.05*sin(t*5)':c=black:ow={W}:oh={H},scale=iw*1.12:ih*1.12,crop={W}:{H}"
    if effect == "glitch":
        return "rgbashift=rh=8:bh=-8:enable='lt(mod(t,0.6),0.12)'"
    if effect == "rgb_split":
        return "rgbashift=rh=5:bh=-5"
    if effect == "vhs":
        return "rgbashift=rh=3:bh=-3,noise=alls=14:allf=t,eq=saturation=1.3:contrast=1.05"
    if effect == "film_grain":
        return "noise=alls=18:allf=t"
    if effect == "flash":
        return "fade=t=in:st=0:d=0.25:color=white"
    if effect == "flash_negatif":
        return "negate=enable='lt(t,0.12)'"
    if effect == "fade_in":
        return "fade=t=in:st=0:d=0.3"
    if effect == "fade_out":
        return f"fade=t=out:st={max(d - 0.3, 0):.3f}:d=0.3"
    if effect == "vignette":
        return "vignette=angle=0.6"
    if effect == "blur_in":
        return "boxblur=luma_radius=12:luma_power=2:enable='lt(t,0.3)'"
    if effect == "bw_flash":
        return "hue=s=0:enable='lt(t,0.35)'"
    if effect == "mirror":
        return "hflip"
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
        border_style, outline, back = 3, max(6, round(font_size / 4)), "&H00000000"
        st = {**st, "outline_hex": st["box_hex"]}   # BorderStyle 3: warna kotak = OutlineColour
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
        if st["uppercase"]:
            text = text.upper()
        safe = text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Overlay,,0,0,0,,{fad}{safe}")
    return header + "\n".join(lines) + "\n"


# ==========================================================
# Render
# ==========================================================
def _popen_kwargs(eco: bool) -> dict:
    """Mode hemat: ffmpeg jalan di prioritas rendah (Windows) supaya PC tetap responsif."""
    if eco and sys.platform.startswith("win"):
        return {"creationflags": 0x00004000}   # BELOW_NORMAL_PRIORITY_CLASS
    return {}


def _run_ffmpeg(cmd: list, codec_idx: int, cwd: str, eco: bool = True) -> subprocess.CompletedProcess:
    kw = _popen_kwargs(eco)
    r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=cwd, **kw)
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
        r = subprocess.run(cleaned, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=cwd, **kw)
    return r


def _gpu_export(video_path, segs, total, W, H, transition_sec, text_style, filter_preset, filter_intensity,
                adjust, watermark, inputs, audio_fc, has_audio, target, tmp_dir, base, fonts_dir, eco):
    """Video dirender frame-demi-frame oleh GLEngine (GPU) dan di-pipe ke NVENC; audio dari graf ffmpeg terpisah."""
    from modules.gl_engine import GLEngine
    kw = _popen_kwargs(eco)
    audio_file = None
    if has_audio:
        audio_file = os.path.join(tmp_dir, f"{base}_cr_audio.m4a")
        cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(audio_fc), "-map", "[aout]",
               "-c:a", "aac", "-b:a", "192k", "-ar", "44100", "-t", f"{total:.3f}", audio_file]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace", cwd=tmp_dir, **kw)
        if r.returncode != 0:
            raise RuntimeError("audio gagal: " + r.stderr[-600:])
    eng = GLEngine(video_path, preview_h=H, fonts_dir=fonts_dir)
    try:
        if (eng.W, eng.H) != (W, H):
            raise RuntimeError(f"ukuran mesin {eng.W}x{eng.H} != {W}x{H}")
        eng.set_segments(segs, transition_sec)
        eng.set_text_style(text_style)
        eng.set_look(filter_preset, filter_intensity, adjust)
        eng.set_watermark(watermark)
        n = int(round(eng.total * OUT_FPS))
        base_cmd = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(OUT_FPS), "-i", "-"]
        if audio_file:
            base_cmd += ["-i", audio_file]
        for enc in (["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"],
                    ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19"]):
            cmd = base_cmd + ["-map", "0:v"] + (["-map", "1:a", "-c:a", "copy"] if audio_file else []) + \
                  enc + ["-pix_fmt", "yuv420p", "-movflags", "+faststart", "-t", f"{eng.total:.3f}", target]
            pr = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE, cwd=tmp_dir, **kw)
            t0, last, ok = time.time(), 0.0, True
            try:
                for i in range(n):
                    pr.stdin.write(eng.render(i / OUT_FPS).tobytes())
                    if time.time() - last > 2:
                        last = time.time()
                        print(f"[GPU] frame {i + 1}/{n} ({(i + 1) / max(time.time() - t0, 1e-6):.0f} fps)")
                pr.stdin.close()
            except (BrokenPipeError, OSError):
                ok = False
            err = pr.stderr.read().decode("utf-8", "replace")
            pr.wait()
            if ok and pr.returncode == 0:
                print(f"[GPU] selesai {n} frame dalam {time.time() - t0:.1f}s")
                return
            print("[WARNING] Encoder gagal, coba cadangan:", err[-300:])
        raise RuntimeError("encoder gagal")
    finally:
        eng.close()


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
    filter_intensity: float = 1.0,
    adjust: dict = None,
    caption: dict = None,                  # {"style": preset-name|dict} -> auto caption Whisper
    transition_sec: float = DEFAULT_TRANSITION_SEC,
    preview: bool = False,                 # render kecil & cepat untuk dicek
    eco: bool = True,                      # mode hemat: prioritas rendah + thread dibatasi
    fonts_dir: str = FONTS_DIR_DEFAULT,
    tmp_dir: str = "_tmp",
    max_vo_speedup: float = MAX_VO_SPEEDUP,
    gpu: bool = True,                      # ekspor lewat mesin GPU yang sama dengan preview
    audio_only_out: str = None,            # kalau diisi: hanya bikin campuran audio (WAV) untuk pemutar preview
    watermark: dict = None,                # lihat modules/watermark.py
    timeline_out: list = None,             # diisi start/end segmen final (setelah VO memperpanjang segmen)
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
    if preview and H > 480:
        W, H = int(round(W * 480 / H / 2) * 2), 480

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
    wm_png = None
    if watermark and watermark.get("enabled") and not audio_only_out:
        from modules.watermark import make_watermark_rgba
        from PIL import Image as _Img
        arr, _bb = make_watermark_rgba(watermark, W, H, fonts_dir)
        if arr is not None:
            wm_png = os.path.join(tmp_dir, f"{base}_cr_wm.png")
            _Img.fromarray(arr, "RGBA").save(wm_png)
            inputs += ["-i", wm_png]
    fc = []
    n = len(segs)
    for i, s in enumerate(segs):
        d = s["end"] - s["start"]
        chain = (f"[0:v]trim=start={s['start']:.3f}:end={s['end']:.3f},setpts=PTS-STARTPTS,"
                 f"fps={OUT_FPS},scale={W}:{H},setsar=1,format=yuv420p")
        fx = _effect_filter(s.get("effect", "none"), d, W, H)
        if fx:
            chain += "," + fx + f",scale={W}:{H},setsar=1,format=yuv420p"
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

    fonts_escaped = os.path.abspath(fonts_dir).replace("\\", "/").replace(":", "\\:")
    fc.append(build_color_graph(cur, "vgrade", filter_preset, adjust, filter_intensity))
    if wm_png:
        fc.append(f"[vgrade]subtitles={ass_name}:fontsdir='{fonts_escaped}'[vsub]")
        fc.append("[vsub][1:v]overlay=0:0:format=auto,format=yuv420p[vout]")
    else:
        fc.append(f"[vgrade]subtitles={ass_name}:fontsdir='{fonts_escaped}'[vout]")

    # ---- 6. graf audio ----
    a_start = len(fc)
    labels = []
    nxt = 2 if wm_png else 1

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

    if timeline_out is not None:
        timeline_out[:] = [{"start": s["start"], "end": s["end"]} for s in segs]
    if audio_only_out:
        if not has_audio_out:
            return None
        cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc[a_start:]), "-map", "[aout]",
               "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2", "-t", f"{total:.3f}", os.path.abspath(audio_only_out)]
        r = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace",
                           cwd=tmp_dir, **_popen_kwargs(eco))
        if r.returncode != 0:
            raise RuntimeError("Audio preview gagal: " + r.stderr[-600:])
        return audio_only_out

    # ---- 7. encode ----
    want_caption = bool(caption) and not preview
    render_target = (os.path.join(tmp_dir, f"{base}_cr_precaption.mp4") if want_caption else output_path)

    done_gpu = False
    if gpu and not preview:
        try:
            _gpu_export(video_path, segs, total, W, H, transition_sec, text_style, filter_preset,
                        filter_intensity, adjust, watermark, inputs, fc[a_start:], has_audio_out, render_target,
                        tmp_dir, base, fonts_dir, eco)
            done_gpu = True
        except Exception as e:
            print(f"[WARNING] Ekspor GPU gagal ({e}). Pakai jalur ffmpeg biasa.")

    threads = ["-threads", str(max(2, (os.cpu_count() or 4) // 2))] if eco else []
    cmd = ["ffmpeg", "-y", *threads, *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]"]
    if has_audio_out:
        cmd += ["-map", "[aout]"]
    if done_gpu:
        cmd = None
    codec_idx = len(cmd) + 1 if cmd else 0
    if cmd is None:
        pass
    elif preview:
        cmd += ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "30", "-pix_fmt", "yuv420p"]
    else:
        cmd += ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19", "-pix_fmt", "yuv420p"]
    if cmd is not None:
        if has_audio_out:
            cmd += ["-c:a", "aac", "-b:a", "192k", "-ar", "44100"]
        cmd += ["-t", f"{total:.3f}", "-movflags", "+faststart", render_target]

    if cmd is not None:
        r = _run_ffmpeg(cmd, codec_idx, cwd=tmp_dir, eco=eco)
        if r.returncode != 0:
            raise RuntimeError(f"Render CutRecipe gagal.\nSTDERR: {r.stderr[-1500:]}")
    t_render = time.time()

    # ---- 8. auto caption (Whisper) di atas hasil jadi ----
    if want_caption:
        if not has_audio_out:
            print("[WARNING] Auto caption dilewati: video hasil tidak punya audio.")
            os.replace(render_target, output_path)
        else:
            from modules.subtitle_gen import generate_subtitles, burn_subtitles_to_video, release_whisper
            wav = os.path.join(tmp_dir, f"{base}_cr_caption.wav")
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", render_target, "-vn",
                            "-ac", "1", "-ar", "16000", wav], check=True)
            srt = os.path.join(tmp_dir, f"{base}_cr_caption.srt")
            generate_subtitles(wav, srt)
            release_whisper()
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
