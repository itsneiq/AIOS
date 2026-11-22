# modules/watermark.py
"""Watermark (gambar atau teks) untuk CutRecipe Studio. Hanya PIL + numpy, dipakai mesin GPU dan jalur ffmpeg."""
import os
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

DEFAULT_WATERMARK = {
    "enabled": False,
    "kind": "text",             # text | image
    "text": "@namabrand",
    "image_path": None,
    "font_name": "Arial Black",
    "color_hex": "FFFFFF",
    "outline": True,
    "size_pct": 20.0,           # lebar gambar = % lebar frame; teks: ukuran font ~ 0.4 x ini % lebar frame
    "opacity": 0.8,
    "x": 0.82,                  # posisi TENGAH watermark, pecahan lebar (0..1)
    "y": 0.07,                  # pecahan tinggi (0..1)
}

_FONT_FILES = {
    "arial": ["arial.ttf"], "arial black": ["ariblk.ttf"], "impact": ["impact.ttf"], "georgia": ["georgia.ttf"],
    "comic sans ms": ["comic.ttf"], "bangers": ["Bangers-Regular.ttf"], "luckiest guy": ["LuckiestGuy-Regular.ttf"],
    "fredoka": ["Fredoka-Regular.ttf", "Fredoka-VariableFont_wdth,wght.ttf"], "chewy": ["Chewy-Regular.ttf"],
    "permanent marker": ["PermanentMarker-Regular.ttf"],
}


_BOLD_FILES = {"arial": ["arialbd.ttf"], "georgia": ["georgiab.ttf"], "comic sans ms": ["comicbd.ttf"]}


def find_font(name: str, size: int, fonts_dir: str = "assets/fonts", bold: bool = False):
    cands = (_BOLD_FILES.get((name or "").lower(), []) if bold else []) + _FONT_FILES.get((name or "").lower(), [])
    dirs = [fonts_dir]
    if sys.platform.startswith("win"):
        dirs.append(os.path.join(os.environ.get("WINDIR", "C:\\Windows"), "Fonts"))
        dirs.append(os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts"))
    for fn in cands + [name + ".ttf", name.replace(" ", "") + ".ttf"]:
        for d in dirs:
            p = os.path.join(d, fn)
            if os.path.exists(p):
                try:
                    return ImageFont.truetype(p, size)
                except Exception:
                    pass
    for fn in ("DejaVuSans-Bold.ttf", "arial.ttf"):
        try:
            return ImageFont.truetype(fn, size)
        except Exception:
            continue
    return ImageFont.load_default()



def make_watermark_rgba(wm, W, H, fonts_dir="assets/fonts"):
    """-> (array RGBA uint8 HxWx4 seukuran frame, bbox (x0,y0,x1,y1)) atau (None, None) kalau mati/tidak valid."""
    if not wm or not wm.get("enabled"):
        return None, None
    cfg = {**DEFAULT_WATERMARK, **wm}
    size = max(1.0, float(cfg["size_pct"]))
    if cfg["kind"] == "image":
        p = cfg.get("image_path")
        if not p or not os.path.exists(p):
            return None, None
        im = Image.open(p).convert("RGBA")
        w = int(cfg["width_px"]) if cfg.get("width_px") else max(8, int(W * size / 100))
        w = max(8, w)
        im = im.resize((w, max(8, int(im.height * w / im.width))), Image.LANCZOS)
    else:
        text = (cfg.get("text") or "").strip()
        if not text:
            return None, None
        em = int(cfg["em_px"]) if cfg.get("em_px") else max(10, int(W * size / 100 * 0.4))
        font = find_font(cfg["font_name"], em, fonts_dir)
        hx = str(cfg["color_hex"]).lstrip("#")
        col = tuple(int(hx[i:i + 2], 16) for i in (0, 2, 4))
        sw = max(2, round(em / 12)) if cfg.get("outline", True) else 0
        probe = ImageDraw.Draw(Image.new("RGBA", (1, 1)))
        l, t, r, b = probe.textbbox((0, 0), text, font=font, stroke_width=sw)
        pad = sw + 2
        im = Image.new("RGBA", (r - l + 2 * pad, b - t + 2 * pad), (0, 0, 0, 0))
        ImageDraw.Draw(im).text((pad - l, pad - t), text, font=font, fill=col + (255,),
                                stroke_width=sw, stroke_fill=(0, 0, 0, 255))
    if im.width > W or im.height > H:
        k = min(W / im.width, H / im.height)
        im = im.resize((max(1, int(im.width * k)), max(1, int(im.height * k))), Image.LANCZOS)
    a = np.array(im)
    a[..., 3] = (a[..., 3].astype(np.float32) * float(min(max(cfg["opacity"], 0.0), 1.0))).astype(np.uint8)
    if cfg.get("anchor"):
        m = int(cfg.get("margin_px", 10))
        anc = cfg["anchor"]
        x0 = m if "Kiri" in anc else (W - im.width - m if "Kanan" in anc else (W - im.width) // 2)
        y0 = m if "Atas" in anc else (H - im.height - m if "Bawah" in anc else (H - im.height) // 2)
    else:
        x0 = int(round(cfg["x"] * W - im.width / 2))
        y0 = int(round(cfg["y"] * H - im.height / 2))
    x0 = min(max(x0, 0), W - im.width)
    y0 = min(max(y0, 0), H - im.height)
    out = np.zeros((H, W, 4), dtype=np.uint8)
    out[y0:y0 + im.height, x0:x0 + im.width] = a
    return out, (x0, y0, x0 + im.width, y0 + im.height)
