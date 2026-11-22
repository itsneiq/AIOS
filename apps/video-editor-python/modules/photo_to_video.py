# modules/photo_to_video.py
import math
import numpy as np
import PIL.Image

# --- PATCH KOMPATIBILITAS ---
# moviepy 1.0.3 manggil PIL.Image.ANTIALIAS, tapi nama itu udah dihapus
# di Pillow versi baru (diganti nama jadi LANCZOS). Baris ini nge-tempel
# nama lama itu balik biar moviepy tetep bisa jalan tanpa perlu downgrade Pillow.
if not hasattr(PIL.Image, "ANTIALIAS"):
    PIL.Image.ANTIALIAS = PIL.Image.LANCZOS
# -----------------------------

from PIL import Image
from moviepy.editor import ImageClip, concatenate_videoclips
from config import VIDEO_WIDTH, VIDEO_HEIGHT, KEN_BURNS_ZOOM_RATIO, MIN_PHOTO_DURATION


def _cover_resize_crop(clip, target_w: int, target_h: int):
    """
    Resize + crop foto biar penuh mengisi frame target (cover),
    nggak ada bar hitam di pinggir walaupun rasio foto beda-beda.
    """
    w, h = clip.size
    scale = max(target_w / w, target_h / h)
    clip = clip.resize(scale)
    clip = clip.crop(
        x_center=clip.w / 2, y_center=clip.h / 2,
        width=target_w, height=target_h,
    )
    return clip


def _apply_ken_burns(clip, zoom_ratio: float = 0.04):
    """
    Terapin efek zoom halus (Ken Burns) selama durasi klip,
    biar foto statis kelihatan hidup/bergerak, nggak kaku.
    """
    duration = clip.duration
    base_w, base_h = clip.size

    def effect(get_frame, t):
        frame = get_frame(t)
        img = Image.fromarray(frame)
        zoom = 1 + zoom_ratio * (t / duration)

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


def create_ken_burns_clip(image_path: str, duration: float):
    """Bikin 1 klip video dari 1 foto, dengan efek Ken Burns."""
    clip = ImageClip(image_path).set_duration(duration)
    clip = _cover_resize_crop(clip, VIDEO_WIDTH, VIDEO_HEIGHT)
    clip = _apply_ken_burns(clip, zoom_ratio=KEN_BURNS_ZOOM_RATIO)
    return clip


def create_video_from_photos(photo_paths: list, total_duration: float, output_path: str) -> str:
    """
    Gabungin beberapa foto jadi 1 video dengan efek Ken Burns.
    Durasi tiap foto dibagi rata dari total_duration, dengan batas
    minimum durasi per foto (MIN_PHOTO_DURATION).
    """
    n = len(photo_paths)
    duration_per_photo = max(total_duration / n, MIN_PHOTO_DURATION)

    print(f"[INFO] {n} foto, {duration_per_photo:.2f} detik per foto "
          f"(total: {duration_per_photo * n:.2f} detik)")

    clips = [create_ken_burns_clip(p, duration_per_photo) for p in photo_paths]
    final = concatenate_videoclips(clips, method="compose")
    final.write_videofile(output_path, fps=30, codec="libx264", audio=False, logger=None)

    print(f"[INFO] Video dari foto tersimpan di: {output_path}")
    return output_path
