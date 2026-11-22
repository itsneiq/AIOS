# modules/gl_compose.py
"""
Penyusun video di GPU untuk mode Batch/Manual (pengganti moviepy untuk bagian foto Ken Burns, crossfade, zoom punch).
Foto/video dipotong 'cover' ke ukuran keluaran, transisi dan zoom dihitung di shader, hasilnya dipipe ke NVENC.
"""
import os
import subprocess
import time
import numpy as np
import av
from PIL import Image, ImageOps

from modules.gl_engine import GLEngine, VideoSource
from modules.cut_recipe import _popen_kwargs


def _cover_array(im, W, H):
    """PIL RGB -> array HxWx3 uint8, di-resize 'cover' lalu crop tengah (sama seperti _cover_resize_crop)."""
    scale = max(W / im.width, H / im.height)
    cw, ch = max(W, int(np.ceil(im.width * scale))), max(H, int(np.ceil(im.height * scale)))
    im = im.resize((cw, ch), Image.LANCZOS)
    x0, y0 = (cw - W) // 2, (ch - H) // 2
    return np.ascontiguousarray(np.asarray(im)[y0:y0 + H, x0:x0 + W])


class CoverVideoSource(VideoSource):
    def _convert(self, f):
        if self.yuv:
            return self._to_yuv(f)
        scale = max(self.W / f.width, self.H / f.height)
        cw, ch = max(self.W, int(np.ceil(f.width * scale))), max(self.H, int(np.ceil(f.height * scale)))
        a = f.reformat(width=cw, height=ch, format="rgb24").to_ndarray()
        x0, y0 = (cw - self.W) // 2, (ch - self.H) // 2
        return np.ascontiguousarray(a[y0:y0 + self.H, x0:x0 + self.W])


class PhotoSource:
    def __init__(self, path, W, H):
        im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
        self.arr = _cover_array(im, W, H)

    def frame_at(self, t):
        return self.arr

    def close(self):
        pass


class GLCompose(GLEngine):
    def __init__(self, items, W, H, punch=True, kb_ratio=0.04):
        super().__init__(None, size=(W, H))
        self.kb_ratio = kb_ratio
        self.punch = punch
        self.items = items
        self.cover = True
        self.sources = [PhotoSource(it["path"], W, H) if it["kind"] == "photo"
                        else CoverVideoSource(it["path"], W, H, yuv=self.yuv_ok) for it in items]

    def _frame(self, seg_i, which, t):
        return self.sources[seg_i].frame_at(t)

    def zoom_at(self, t):
        """Zoom punch-in di awal video (sama dengan apply_intro_zoom: 0.3 s naik, 0.9 s turun)."""
        if not self.punch:
            return 1.0
        if t < 0.3:
            return 1 + 0.15 * (t / 0.3)
        if t < 1.2:
            return 1 + 0.15 * (1 - (t - 0.3) / 0.9)
        return 1.0

    def close(self):
        for s in self.sources:
            s.close()
        super().close()


def compose_media(items, output_path, W, H, fps=30, transition_enabled=True, transition_sec=0.4,
                  zoom_punch=True, kb_ratio=0.04, eco=True):
    """items: [{"kind": "photo"|"video", "path": str, "duration": float}] -> video tanpa audio di output_path."""
    eng = GLCompose(items, W, H, punch=zoom_punch, kb_ratio=kb_ratio)
    try:
        segs = []
        for i, it in enumerate(items):
            segs.append({"start": 0.0, "end": float(it["duration"]), "text": "",
                         "effect": "kenburns" if it["kind"] == "photo" else "none",
                         "transition": "fade" if (transition_enabled and i > 0) else "cut"})
        eng.set_segments(segs, transition_sec)
        n = int(round(eng.total * fps))
        base = ["ffmpeg", "-y", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-"]
        kw = _popen_kwargs(eco)
        for enc in (["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"],
                    ["-c:v", "libx264", "-preset", "veryfast", "-crf", "19"]):
            cmd = base + enc + ["-pix_fmt", "yuv420p", "-an", "-t", f"{eng.total:.3f}", output_path]
            pr = subprocess.Popen(cmd, stdin=subprocess.PIPE, stderr=subprocess.PIPE, **kw)
            t0, last, ok = time.time(), 0.0, True
            try:
                for i in range(n):
                    pr.stdin.write(eng.render(i / fps).tobytes())
                    if time.time() - last > 3:
                        last = time.time()
                        print(f"[GPU] frame {i + 1}/{n} ({(i + 1) / max(time.time() - t0, 1e-6):.0f} fps)")
                pr.stdin.close()
            except (BrokenPipeError, OSError):
                ok = False
            err = pr.stderr.read().decode("utf-8", "replace")
            pr.wait()
            if ok and pr.returncode == 0:
                print(f"[GPU] komposisi selesai: {n} frame, {time.time() - t0:.1f}s")
                return output_path
            print("[WARNING] Encoder gagal, coba cadangan:", err[-300:])
        raise RuntimeError("encoder gagal")
    finally:
        eng.close()
