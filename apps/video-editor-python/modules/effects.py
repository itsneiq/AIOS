# modules/effects.py
import math
import subprocess
import numpy as np
from PIL import Image


def apply_intro_zoom(clip, punch_duration: float = 0.3, settle_duration: float = 0.9, zoom_amount: float = 0.15):
    total_zoom_window = punch_duration + settle_duration
    base_w, base_h = clip.size

    def zoom_factor_at(t):
        if t < punch_duration:
            return 1 + zoom_amount * (t / punch_duration)
        elif t < total_zoom_window:
            progress = (t - punch_duration) / settle_duration
            return 1 + zoom_amount * (1 - progress)
        else:
            return 1.0

    def effect(get_frame, t):
        frame = get_frame(t)
        zoom = zoom_factor_at(t)
        if zoom <= 1.0001:
            return frame

        img = Image.fromarray(frame)
        new_w = math.ceil(base_w * zoom)
        new_h = math.ceil(base_h * zoom)
        new_w += new_w % 2
        new_h += new_h % 2

        img = img.resize((new_w, new_h), Image.LANCZOS)
        x = (new_w - base_w) // 2
        y = (new_h - base_h) // 2
        img = img.crop((x, y, x + base_w, y + base_h))
        return np.array(img)

    return clip.fl(effect)


_WATERMARK_POSITION_MAP = {
    "Kiri Atas": "10:10",
    "Kanan Atas": "main_w-overlay_w-10:10",
    "Kiri Bawah": "10:main_h-overlay_h-10",
    "Kanan Bawah": "main_w-overlay_w-10:main_h-overlay_h-10",
    "Tengah": "(main_w-overlay_w)/2:(main_h-overlay_h)/2",
}

_TEXT_WATERMARK_POSITION_MAP = {
    "Kiri Atas": "x=20:y=20",
    "Kanan Atas": "x=w-tw-20:y=20",
    "Kiri Bawah": "x=20:y=h-th-20",
    "Kanan Bawah": "x=w-tw-20:y=h-th-20",
    "Tengah": "x=(w-tw)/2:y=(h-th)/2",
}


def apply_watermark(video_path: str, watermark_path: str, output_path: str,
                     position: str = "Kanan Bawah", scale_width: int = 150, opacity: float = 0.8) -> str:
    overlay_pos = _WATERMARK_POSITION_MAP.get(position, _WATERMARK_POSITION_MAP["Kanan Bawah"])

    filter_complex = (
        f"[1:v]scale={scale_width}:-1,format=rgba,colorchannelmixer=aa={opacity}[wm];"
        f"[0:v][wm]overlay={overlay_pos}[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-i", watermark_path,
        "-filter_complex", filter_complex,
        "-map", "[out]", "-map", "0:a?",
        "-c:a", "copy",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise Exception(f"Watermark gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Watermark (gambar) diterapkan: {output_path}")
    return output_path


def apply_text_watermark(video_path: str, output_path: str, text: str,
                          position: str = "Kanan Bawah", font_size: int = 24,
                          color_hex: str = "FFFFFF", opacity: float = 0.8,
                          font_path: str = "C:/Windows/Fonts/arial.ttf") -> str:
    """
    Tempelin watermark berupa TEKS (bukan gambar) di video, misal nama toko/username.
    """
    pos_expr = _TEXT_WATERMARK_POSITION_MAP.get(position, _TEXT_WATERMARK_POSITION_MAP["Kanan Bawah"])

    text_escaped = text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
    font_path_escaped = font_path.replace("\\", "/").replace(":", "\\:")

    drawtext = (
        f"drawtext=fontfile='{font_path_escaped}':text='{text_escaped}':"
        f"fontsize={font_size}:fontcolor=0x{color_hex}@{opacity}:"
        f"{pos_expr}:shadowcolor=black@0.5:shadowx=2:shadowy=2"
    )

    cmd = ["ffmpeg", "-y", "-i", video_path, "-vf", drawtext, "-c:a", "copy", output_path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        raise Exception(f"Text watermark gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Watermark (teks: '{text}') diterapkan: {output_path}")
    return output_path


COLOR_GRADE_PRESETS = {
    "none": None,
    "cerah_pop": "eq=contrast=1.15:brightness=0.03:saturation=1.3",
    "warm_cozy": "eq=contrast=1.05:brightness=0.02:saturation=1.1,colorbalance=rs=0.08:gs=0.02:bs=-0.08",
    "clean_minimal": "eq=contrast=1.08:brightness=0.0:saturation=0.9",
    "moody_cinematic": "eq=contrast=1.2:brightness=-0.03:saturation=0.85,colorbalance=rs=-0.05:bs=0.1",
}


def apply_color_grade(video_path: str, output_path: str, preset: str = "none") -> str:
    filter_str = COLOR_GRADE_PRESETS.get(preset)
    if not filter_str:
        cmd = ["ffmpeg", "-y", "-i", video_path, "-c", "copy", output_path]
    else:
        cmd = ["ffmpeg", "-y", "-i", video_path, "-vf", filter_str, "-c:a", "copy", output_path]

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise Exception(f"Color grading gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Color grade ({preset}) diterapkan: {output_path}")
    return output_path

# ============================================
# DETEKSI GPU (buat pilih hardware encoding kalau ada NVIDIA)
# ============================================
_video_codec_cache = None


def get_video_codec():
    """
    Cek apakah PC punya GPU NVIDIA yang bisa dipakai buat encode video
    (jauh lebih cepat dari CPU). Kalau nggak ada, fallback ke CPU (libx264).
    Hasil dicache biar nggak ngecek berkali-kali.
    """
    global _video_codec_cache
    if _video_codec_cache is not None:
        return _video_codec_cache

    has_nvidia = False
    try:
        check = subprocess.run(["nvidia-smi"], capture_output=True, text=True, timeout=5)
        has_nvidia = check.returncode == 0
    except Exception:
        has_nvidia = False

    if has_nvidia:
        try:
            encoders = subprocess.run(["ffmpeg", "-hide_banner", "-encoders"],
                                       capture_output=True, text=True, timeout=10)
            if "h264_nvenc" in encoders.stdout:
                print("[INFO] GPU NVIDIA terdeteksi -> pakai hardware encoding (h264_nvenc), lebih cepat.")
                _video_codec_cache = ("h264_nvenc", [])
                return _video_codec_cache
        except Exception:
            pass

    print("[INFO] GPU NVIDIA nggak terdeteksi -> pakai CPU encoding (libx264).")
    _video_codec_cache = ("libx264", ["-preset", "fast"])
    return _video_codec_cache
