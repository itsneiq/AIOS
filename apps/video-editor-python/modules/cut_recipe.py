# modules/cut_recipe.py
"""
CutRecipe: susun ulang SATU video mentahan berdasarkan "resep potongan"
(daftar segmen + teks overlay + VO per segmen), lalu render jadi satu video baru.

Format resep simpel (satu potongan per baris):
48-51 | Teks overlay | Teks VO (opsional)
0:08-0:10 | Teks overlay saja

Format resep JSON (tetap didukung):
[
  {"start": 48, "end": 51, "text": "Kulkas kotor gini bisa balik putih lagi?", "vo": "Kulkas sekotor ini..."},
  {"start": "0:08", "end": "0:10", "text": "Bau busuk, kerak, noda membandel"}
]
- start/end boleh detik (angka) atau "mm:ss" / "hh:mm:ss".
- text (overlay) dan vo (suara) boleh kosong.
- Urutan baris = urutan di video hasil (bukan urutan asli video).
"""
import os
import re
import json
import subprocess

FONTS_DIR_DEFAULT = "assets/fonts"
OUT_FPS = 30
MAX_VO_SPEEDUP = 1.2

_EMOJI_RE = re.compile(
    "[\U0001F000-\U0001FAFF\U00002600-\U000027BF\U0001F1E6-\U0001F1FF\U00002B00-\U00002BFF"
    "\U0000FE0F\U0000200D\U00002190-\U000021FF]+",
    flags=re.UNICODE,
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


def recipe_to_lines(segments: list) -> str:
    """Ubah daftar segmen jadi format satu-baris (untuk contoh di GUI)."""
    out = []
    for r in segments:
        line = f"{r['start']:g}-{r['end']:g} | {r.get('text', '')}"
        if r.get("vo"):
            line += f" | {r['vo']}"
        out.append(line)
    return "\n".join(out)


# ==========================================================
# Parsing & validasi resep
# ==========================================================
def _parse_time(value) -> float:
    if isinstance(value, (int, float)):
        return float(value)
    s = str(value).strip().replace(",", ".")
    if ":" in s:
        parts = [float(p) for p in s.split(":")]
        t = 0.0
        for p in parts:
            t = t * 60 + p
        return t
    return float(s)


def strip_emoji(text: str) -> str:
    return re.sub(r"\s{2,}", " ", _EMOJI_RE.sub("", text or "")).strip()


_LINE_RE = re.compile(
    r"^\s*([\d:.,]+)\s*(?:-|\u2013|\u2014|->|s/d|sampai)\s*([\d:.,]+)\s*(?:\|(.*))?$",
    flags=re.IGNORECASE,
)


def _parse_lines(raw: str) -> list:
    """Format simpel: satu potongan per baris -> `48-51 | teks overlay | teks vo`.
    Waktu boleh detik (48) atau mm:ss (0:48). Teks dan vo boleh kosong. Baris diawali # diabaikan."""
    rows = []
    for no, line in enumerate(raw.splitlines(), start=1):
        if not line.strip() or line.strip().startswith("#"):
            continue
        m = _LINE_RE.match(line)
        if not m:
            raise ValueError(f"Baris {no} tidak dikenali: \"{line.strip()[:50]}\". "
                             f"Format: 48-51 | teks overlay | teks VO")
        rest = m.group(3) or ""
        parts = [p.strip() for p in rest.split("|")]
        rows.append({"start": m.group(1), "end": m.group(2),
                     "text": parts[0] if parts else "", "vo": parts[1] if len(parts) > 1 else ""})
    return rows


def parse_recipe(raw) -> list:
    """Terima string JSON / list / dict {"segments": [...]}. Return list segmen bersih."""
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
            start = _parse_time(row["start"])
            end = _parse_time(row["end"])
        except KeyError:
            raise ValueError(f"Baris {i}: field 'start' dan 'end' wajib ada.")
        except ValueError:
            raise ValueError(f"Baris {i}: 'start'/'end' bukan angka atau format mm:ss yang valid.")
        if start < 0 or end <= start:
            raise ValueError(f"Baris {i}: waktu tidak valid (start={start}, end={end}); end harus > start >= 0.")
        segments.append({
            "start": start,
            "end": end,
            "text": strip_emoji(str(row.get("text", "") or "")),
            "vo": strip_emoji(str(row.get("vo", "") or "")),
        })
    return segments


def recipe_total_duration(segments: list) -> float:
    return sum(s["end"] - s["start"] for s in segments)


# ==========================================================
# ffprobe helpers
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


def build_overlay_ass(entries: list, width: int, height: int, font_name: str, font_size: int,
                      text_hex: str, outline_hex: str, top_margin_px: int) -> str:
    """entries: [(start, end, text)] pada timeline hasil. Teks rata tengah, di atas-tengah layar."""
    side_margin = int(width * 0.06)
    header = (
        "[Script Info]\nScriptType: v4.00+\n"
        f"PlayResX: {width}\nPlayResY: {height}\nWrapStyle: 0\n\n"
        "[V4+ Styles]\n"
        "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, "
        "Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, "
        "Alignment, MarginL, MarginR, MarginV, Encoding\n"
        f"Style: Overlay,{font_name},{font_size},{_hex_to_ass(text_hex)},&H00FFFFFF,{_hex_to_ass(outline_hex)},"
        f"&H80000000,-1,0,0,0,100,100,0,0,1,{max(2, round(font_size / 10))},1,8,{side_margin},{side_margin},"
        f"{top_margin_px},1\n\n"
        "[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n"
    )
    lines = []
    for start, end, text in entries:
        if not text:
            continue
        safe = text.replace("\\", "").replace("{", "(").replace("}", ")").replace("\n", "\\N")
        lines.append(f"Dialogue: 0,{_ass_time(start)},{_ass_time(end)},Overlay,,0,0,0,,{safe}")
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
        # buang opsi khusus NVENC: -preset p4 -cq 19
        cleaned, skip = [], 0
        for i, c in enumerate(cpu):
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
    keep_original_audio: bool = True,
    music_path: str = None,
    music_volume: float = 0.2,
    font_name: str = "Arial",
    text_size_pct: float = 3.6,
    text_top_pct: float = 25.0,
    text_color_hex: str = "FFFFFF",
    outline_color_hex: str = "000000",
    fonts_dir: str = FONTS_DIR_DEFAULT,
    tmp_dir: str = "_tmp",
    max_vo_speedup: float = MAX_VO_SPEEDUP,
) -> str:
    """
    tts_func(text, output_path) -> membuat file audio VO (dipakai kalau vo_enabled).
    Aturan audio:
      - vo_enabled  : audio asli dimatikan, VO tiap segmen ditaruh di awal segmennya, musik (opsional) di volume rendah.
      - tanpa VO    : audio asli dipakai kalau keep_original_audio, dan/atau musik latar.
    """
    video_path = os.path.abspath(video_path)
    output_path = os.path.abspath(output_path)
    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)
    os.makedirs(tmp_dir, exist_ok=True)
    tmp_dir = os.path.abspath(tmp_dir)
    base = os.path.splitext(os.path.basename(output_path))[0]

    info = probe_video(video_path)
    W, H, src_dur = info["width"] - info["width"] % 2, info["height"] - info["height"] % 2, info["duration"]

    # ---- 1. validasi / clamp segmen terhadap durasi video ----
    segs = []
    for i, s in enumerate(segments, start=1):
        st, en = s["start"], min(s["end"], src_dur)
        if st >= src_dur:
            print(f"[WARNING] Segmen {i} dilewati: start {st:.1f}s melebihi durasi video ({src_dur:.1f}s).")
            continue
        if en < s["end"]:
            print(f"[WARNING] Segmen {i}: end dipotong ke {en:.1f}s (durasi video {src_dur:.1f}s).")
        segs.append({**s, "start": st, "end": en, "speed": 1.0, "vo_file": None})
    if not segs:
        raise ValueError("Tidak ada segmen yang valid terhadap durasi video.")

    # ---- 2. VO per segmen + cek durasi ----
    use_vo = vo_enabled and any(s["vo"] for s in segs)
    if vo_enabled and tts_func is None:
        raise ValueError("VO aktif tapi tts_func tidak diberikan.")
    if use_vo:
        for i, s in enumerate(segs, start=1):
            if not s["vo"]:
                continue
            vo_file = os.path.join(tmp_dir, f"{base}_cr_vo_{i}.wav")
            tts_func(s["vo"], vo_file)
            d = _audio_duration(vo_file)
            avail = s["end"] - s["start"]
            s["vo_file"] = vo_file
            if d > avail:
                speed = min(d / avail, max_vo_speedup)
                d_fast = d / speed
                s["speed"] = speed
                if d_fast > avail + 0.05:
                    new_end = min(s["start"] + d_fast + 0.1, src_dur)
                    print(f"[WARNING] VO segmen {i} ({d:.1f}s) lebih panjang dari segmen ({avail:.1f}s): "
                          f"dipercepat {speed:.2f}x dan segmen diperpanjang ke {new_end:.1f}s.")
                    s["end"] = new_end
                else:
                    print(f"[INFO] VO segmen {i} dipercepat {speed:.2f}x agar muat.")

    # ---- 3. timeline hasil ----
    t = 0.0
    for s in segs:
        s["t0"] = t
        t += s["end"] - s["start"]
        s["t1"] = t
    total = t
    print(f"[INFO] {len(segs)} segmen, durasi hasil {total:.1f}s")

    # ---- 4. file overlay ASS ----
    ass_name = f"{base}_cr_overlay.ass"
    ass = build_overlay_ass(
        [(s["t0"], s["t1"], s["text"]) for s in segs], W, H, font_name,
        font_size=max(12, round(H * text_size_pct / 100)),
        text_hex=text_color_hex, outline_hex=outline_color_hex,
        top_margin_px=round(H * text_top_pct / 100),
    )
    with open(os.path.join(tmp_dir, ass_name), "w", encoding="utf-8") as f:
        f.write(ass)

    # ---- 5. filter_complex ----
    inputs = ["-i", video_path]
    fc = []
    n = len(segs)
    for i, s in enumerate(segs):
        fc.append(f"[0:v]trim=start={s['start']:.3f}:end={s['end']:.3f},setpts=PTS-STARTPTS,"
                  f"scale={W}:{H},setsar=1,fps={OUT_FPS}[v{i}]")
    fc.append("".join(f"[v{i}]" for i in range(n)) + f"concat=n={n}:v=1:a=0[vc]")
    fonts_escaped = os.path.abspath(fonts_dir).replace("\\", "/").replace(":", "\\:")
    fc.append(f"[vc]subtitles={ass_name}:fontsdir='{fonts_escaped}'[vout]")

    audio_labels = []   # label-label audio yang akan di-mix
    next_input = 1

    if use_vo:
        for i, s in enumerate(segs):
            if not s["vo_file"]:
                continue
            inputs += ["-i", s["vo_file"]]
            delay_ms = int(round(s["t0"] * 1000))
            tempo = f"atempo={s['speed']:.4f}," if s["speed"] > 1.0001 else ""
            fc.append(f"[{next_input}:a]{tempo}aresample=44100,adelay={delay_ms}:all=1[vo{i}]")
            audio_labels.append(f"[vo{i}]")
            next_input += 1
    elif keep_original_audio and info["has_audio"]:
        for i, s in enumerate(segs):
            fc.append(f"[0:a]atrim=start={s['start']:.3f}:end={s['end']:.3f},asetpts=PTS-STARTPTS,"
                      f"aresample=44100[a{i}]")
        fc.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1[orig]")
        audio_labels.append("[orig]")
    elif keep_original_audio and not info["has_audio"]:
        print("[INFO] Video asli tidak punya audio, dilewati.")

    if music_path:
        inputs += ["-stream_loop", "-1", "-i", os.path.abspath(music_path)]
        vol = music_volume if (use_vo or audio_labels) else max(music_volume, 0.6)
        fade_start = max(total - 0.5, 0)
        fc.append(f"[{next_input}:a]atrim=0:{total:.3f},asetpts=PTS-STARTPTS,aresample=44100,"
                  f"volume={vol:.3f},afade=t=out:st={fade_start:.3f}:d=0.5[music]")
        audio_labels.append("[music]")
        next_input += 1

    has_audio_out = bool(audio_labels)
    if has_audio_out:
        if len(audio_labels) == 1:
            fc.append(f"{audio_labels[0]}apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]")
        else:
            fc.append("".join(audio_labels) + f"amix=inputs={len(audio_labels)}:duration=longest,"
                      f"apad,atrim=0:{total:.3f},loudnorm=I=-16:TP=-1.5:LRA=11[aout]")

    cmd = ["ffmpeg", "-y", *inputs, "-filter_complex", ";".join(fc), "-map", "[vout]"]
    if has_audio_out:
        cmd += ["-map", "[aout]"]
    codec_idx = len(cmd) + 1
    cmd += ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19", "-pix_fmt", "yuv420p"]
    if has_audio_out:
        cmd += ["-c:a", "aac", "-b:a", "192k", "-ar", "44100"]
    cmd += ["-t", f"{total:.3f}", "-movflags", "+faststart", output_path]

    r = _run_ffmpeg(cmd, codec_idx, cwd=tmp_dir)
    if r.returncode != 0:
        raise RuntimeError(f"Render CutRecipe gagal.\nSTDERR: {r.stderr[-1500:]}")

    # ---- 6. bersihin file sementara ----
    for fn in os.listdir(tmp_dir):
        if fn.startswith(f"{base}_cr_"):
            try:
                os.remove(os.path.join(tmp_dir, fn))
            except OSError:
                pass

    print(f"[INFO] CutRecipe selesai: {output_path} ({total:.1f}s)")
    return output_path
