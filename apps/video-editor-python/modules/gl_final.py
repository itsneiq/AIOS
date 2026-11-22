# modules/gl_final.py
"""
Tahap akhir Batch/Manual di GPU: color grade (LUT), subtitle Whisper, teks hook, watermark, lalu NVENC + audio.
Pengganti filter_complex ffmpeg di render_final (yang berjalan di CPU).
"""
import os
import re
import subprocess
import time
import numpy as np
from PIL import Image, ImageDraw

from modules.gl_engine import GLEngine, VideoSource, make_lut
from modules.cut_recipe import split_color_spatial, _popen_kwargs
from modules.watermark import find_font, make_watermark_rgba

PLAY_RES_Y = 288.0       # libass: SRT tanpa header dianggap kanvas 384x288, semua ukuran style diskalakan ke tinggi video
PLAY_RES_X = 384.0
_TS = re.compile(r"(\d+):(\d+):(\d+)[,.](\d+)")


def _sec(m):
    return int(m.group(1)) * 3600 + int(m.group(2)) * 60 + int(m.group(3)) + int(m.group(4).ljust(3, "0")[:3]) / 1000.0


def parse_srt(path):
    cues = []
    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        blocks = re.split(r"\n\s*\n", f.read().replace("\r\n", "\n").strip())
    for b in blocks:
        lines = [l for l in b.split("\n") if l.strip() != ""]
        for i, l in enumerate(lines):
            if "-->" in l:
                a, c = l.split("-->")
                ma, mc = _TS.search(a), _TS.search(c)
                if ma and mc:
                    text = " ".join(x.strip() for x in lines[i + 1:])
                    text = re.sub(r"<[^>]+>|\{[^}]*\}", "", text).strip()
                    if text:
                        cues.append((_sec(ma), _sec(mc), text))
                break
    return cues


def ass_rgba(c, default=(255, 255, 255, 255)):
    """'&H00BBGGRR&' (alpha 00 = buram penuh) -> (r,g,b,a)."""
    try:
        h = str(c).replace("&", "").upper().lstrip("H").rjust(8, "0")
        a, b, g, r = (int(h[i:i + 2], 16) for i in (0, 2, 4, 6))
        return (r, g, b, 255 - a)
    except Exception:
        return default


class SubtitleLayer:
    """Menggambar cue SRT dengan gaya ASS (FontName, FontSize, Outline, MarginV, Alignment, BorderStyle...)."""

    def __init__(self, cues, style, W, H, fonts_dir):
        self.cues, self.st, self.W, self.H, self.fonts_dir = cues, style, W, H, fonts_dir
        self._cache = {}
        self.k = H / PLAY_RES_Y

    def index_at(self, t):
        for i, (a, b, _) in enumerate(self.cues):
            if a <= t < b:
                return i
        return None

    def rgba(self, i):
        if i in self._cache:
            return self._cache[i]
        st, W, H, k = self.st, self.W, self.H, self.k
        text = self.cues[i][2]
        size = max(8, round(float(st["FontSize"]) * k))
        f0 = find_font(st["FontName"], size, self.fonts_dir, bold=bool(int(st.get("Bold", 0))))
        try:
            asc, desc = f0.getmetrics()
            em = max(8, round(size * size / (asc + desc)))
        except Exception:
            em = size
        font = find_font(st["FontName"], em, self.fonts_dir, bold=bool(int(st.get("Bold", 0))))
        img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        maxw = int(W * (1 - 2 * 10 / PLAY_RES_X))
        words, lines, cur = text.split(), [], ""
        for w in words:
            trial = (cur + " " + w).strip()
            if d.textlength(trial, font=font) <= maxw or not cur:
                cur = trial
            else:
                lines.append(cur)
                cur = w
        if cur:
            lines.append(cur)
        lh = size
        total = lh * len(lines)
        # ffmpeg (force_style) memakai penomoran SSA lama: 1-3 bawah, 5-7 atas, 9-11 tengah (kiri, tengah, kanan)
        al = int(st.get("Alignment", 2))
        if al in (1, 2, 3):
            row, col = "b", al - 1
        elif al in (5, 6, 7):
            row, col = "t", al - 5
        elif al in (9, 10, 11):
            row, col = "m", al - 9
        elif al == 8:
            row, col = "m", 0
        else:
            row, col = "b", 1
        mv = round(float(st.get("MarginV", 0)) * k)
        y0 = mv if row == "t" else ((H - total) // 2 if row == "m" else H - mv - total)
        prim = ass_rgba(st.get("PrimaryColour"))
        outc = ass_rgba(st.get("OutlineColour"), (0, 0, 0, 255))
        back = ass_rgba(st.get("BackColour"), (0, 0, 0, 0))
        ow = round(float(st.get("Outline", 0)) * k)
        sh = round(float(st.get("Shadow", 0)) * k)
        box = int(st.get("BorderStyle", 1)) == 3
        for n, ln in enumerate(lines):
            tw = d.textlength(ln, font=font)
            mx = W * 10 / PLAY_RES_X
            x = mx if col == 0 else ((W - tw) / 2 if col == 1 else W - tw - mx)
            y = y0 + n * lh
            if box:
                pad = max(ow, 2) + size * 0.12
                d.rectangle([x - pad, y - pad * 0.3, x + tw + pad, y + lh + pad * 0.3], fill=outc)
                d.text((x, y), ln, font=font, fill=prim)
                continue
            if sh > 0:
                d.text((x + sh, y + sh), ln, font=font, fill=back if back[3] else (0, 0, 0, 160),
                       stroke_width=ow, stroke_fill=back if back[3] else (0, 0, 0, 160))
            d.text((x, y), ln, font=font, fill=prim, stroke_width=ow, stroke_fill=outc)
        arr = np.array(img)
        if len(self._cache) > 6:
            self._cache.clear()
        self._cache[i] = arr
        return arr


def _over(base, top):
    """Gabung dua RGBA (straight alpha) -> RGBA."""
    a = top[..., 3:4].astype(np.float32) / 255.0
    b = base[..., 3:4].astype(np.float32) / 255.0
    oa = a + b * (1 - a)
    rgb = (top[..., :3] * a + base[..., :3] * b * (1 - a)) / np.maximum(oa, 1e-6)
    return np.concatenate([rgb, oa * 255.0], axis=-1).astype(np.uint8)


class GLFinal(GLEngine):
    def __init__(self, video_path, W, H, layers):
        super().__init__(video_path, size=(W, H))
        self.src = VideoSource(video_path, W, H)
        self.layers = layers          # [SubtitleLayer, ...] ; urutan = lapisan bawah -> atas
        self._ov_key = None
        self._ov_arr = None
        self.overlay_fn = self._overlay

    def _frame(self, seg_i, which, t):
        return self.src.frame_at(t)

    def _overlay(self, t):
        idxs = tuple(L.index_at(t) for L in self.layers)
        if all(i is None for i in idxs):
            return None
        if idxs != self._ov_key:
            arr = None
            for L, i in zip(self.layers, idxs):
                if i is None:
                    continue
                a = L.rgba(i)
                arr = a if arr is None else _over(arr, a)
            self._ov_arr, self._ov_key = arr, idxs
        return self._ov_arr

    def close(self):
        self.src.close()
        super().close()


def _duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of",
                        "default=noprint_wrappers=1:nokey=1", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def _video_size(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height",
                        "-of", "csv=p=0", path], capture_output=True, text=True)
    w, h = r.stdout.strip().split(",")[:2]
    return int(w) // 2 * 2, int(h) // 2 * 2


def render_final_gpu(video_path, audio_path, output_path, srt_path=None, subtitle_on=True, subtitle_style=None,
                     hook_srt_path=None, hook_on=False, hook_style=None, watermark=None, color_chain=None,
                     fonts_dir="assets/fonts", fps=30, eco=True):
    W, H = _video_size(video_path)
    layers = []
    if hook_on and hook_srt_path and os.path.exists(hook_srt_path) and hook_style:
        layers.append(SubtitleLayer(parse_srt(hook_srt_path), hook_style, W, H, fonts_dir))
    if subtitle_on and srt_path and os.path.exists(srt_path) and subtitle_style:
        layers.append(SubtitleLayer(parse_srt(srt_path), subtitle_style, W, H, fonts_dir))

    video_dur, audio_dur = _duration(video_path), _duration(audio_path)
    eng = GLFinal(video_path, W, H, layers)
    try:
        eng.set_segments([{"start": 0.0, "end": video_dur, "text": "", "effect": "none", "transition": "cut"}], 0.3)
        if color_chain:
            fchain, sp = split_color_spatial(color_chain)
            eng.apply_look({"lf": make_lut(fchain), "la": None, "sp": sp}, 1.0)
        eng.set_watermark(watermark)
        n = int(round(video_dur * fps))
        af = []
        if audio_dur > video_dur:
            af = ["-filter:a", f"atempo={audio_dur / video_dur:.4f}"]
        base = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
                "-i", audio_path]
        kw = _popen_kwargs(eco)
        for enc in (["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"],
                    ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19"]):
            cmd = base + ["-map", "0:v", "-map", "1:a"] + enc + ["-pix_fmt", "yuv420p"] + af + \
                  ["-c:a", "aac", "-shortest", "-movflags", "+faststart", output_path]
            pr = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE, **kw)
            t0, last, ok = time.time(), 0.0, True
            try:
                for i in range(n):
                    pr.stdin.write(eng.render(i / fps).tobytes())
                    if time.time() - last > 3:
                        last = time.time()
                        print(f"[GPU] final frame {i + 1}/{n} ({(i + 1) / max(time.time() - t0, 1e-6):.0f} fps)")
                pr.stdin.close()
            except (BrokenPipeError, OSError):
                ok = False
            err = pr.stderr.read().decode("utf-8", "replace")
            pr.wait()
            if ok and pr.returncode == 0:
                print(f"[GPU] render final selesai: {n} frame, {time.time() - t0:.1f}s")
                return output_path
            print("[WARNING] Encoder gagal, coba cadangan:", err[-300:])
        raise RuntimeError("encoder gagal")
    finally:
        eng.close()
