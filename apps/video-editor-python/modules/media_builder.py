# modules/media_builder.py
import os
import subprocess
from moviepy.editor import VideoFileClip, concatenate_videoclips
from modules.auto_cut import auto_cut_video
from modules.audio_ducking import has_audio_stream, extract_audio_from_video
from modules.photo_to_video import create_ken_burns_clip, _cover_resize_crop
from modules.effects import apply_intro_zoom
from config import (
    VIDEO_WIDTH, VIDEO_HEIGHT, MIN_PHOTO_DURATION,
    ZOOM_PUNCH_ENABLED, TRANSITION_ENABLED, TRANSITION_DURATION,
)

PHOTO_EXT = (".jpg", ".jpeg", ".png")


def _is_photo(path: str) -> bool:
    return path.lower().endswith(PHOTO_EXT)


def _validate_is_real_video(path: str):
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=format_name",
        "-of", "default=noprint_wrappers=1:nokey=1",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    format_name = result.stdout.strip().lower()

    image_formats = ("jpeg", "image2", "png_pipe", "mjpeg", "bmp_pipe", "webp_pipe")
    if any(fmt in format_name for fmt in image_formats):
        raise ValueError(
            f"File '{path}' terdaftar sebagai VIDEO di products.csv, tapi isinya "
            f"ternyata GAMBAR (format: {format_name}). Perbaiki nama file atau "
            f"media_path di products.csv untuk produk ini."
        )


def _concat_with_transitions(clips: list, transition_enabled: bool):
    if not transition_enabled or len(clips) < 2:
        return concatenate_videoclips(clips, method="compose")

    faded_clips = [clips[0]]
    for c in clips[1:]:
        faded_clips.append(c.crossfadein(TRANSITION_DURATION))

    return concatenate_videoclips(faded_clips, method="compose", padding=-TRANSITION_DURATION)


def build_media_video(media_paths: list, target_duration: float, output_path: str, tmp_dir: str = "output/_tmp",
                       zoom_punch_enabled: bool = None, transition_enabled: bool = None):
    os.makedirs(tmp_dir, exist_ok=True)

    if zoom_punch_enabled is None:
        zoom_punch_enabled = ZOOM_PUNCH_ENABLED
    if transition_enabled is None:
        transition_enabled = TRANSITION_ENABLED

    video_items = []
    photo_paths = []
    music_audio_path = None

    for p in media_paths:
        if _is_photo(p):
            photo_paths.append(p)
        else:
            _validate_is_real_video(p)

            if music_audio_path is None and has_audio_stream(p):
                base_out = os.path.splitext(os.path.basename(output_path))[0]
                music_audio_path = os.path.join(tmp_dir, f"{base_out}_extracted_music.wav")
                extract_audio_from_video(p, music_audio_path)

            base = os.path.splitext(os.path.basename(p))[0].replace(" ", "_")
            cut_path = os.path.join(tmp_dir, f"{base}_cut.mp4")
            auto_cut_video(p, cut_path)
            video_items.append((p, cut_path))

    video_total_duration = 0.0
    for _, cut_path in video_items:
        clip = VideoFileClip(cut_path)
        video_total_duration += clip.duration
        clip.close()

    remaining = max(target_duration - video_total_duration, 0)
    duration_per_photo = max(remaining / len(photo_paths), MIN_PHOTO_DURATION) if photo_paths else 0

    if photo_paths:
        print(f"[INFO] Durasi video: {video_total_duration:.1f}s, sisa buat {len(photo_paths)} foto: "
              f"{duration_per_photo:.1f}s/foto")

    clips = []
    video_lookup = {orig: cut for orig, cut in video_items}

    for p in media_paths:
        if _is_photo(p):
            clip = create_ken_burns_clip(p, duration_per_photo)
        else:
            cut_path = video_lookup[p]
            clip = VideoFileClip(cut_path)
            clip = _cover_resize_crop(clip, VIDEO_WIDTH, VIDEO_HEIGHT)
        clips.append(clip)

    final = _concat_with_transitions(clips, transition_enabled)

    if zoom_punch_enabled:
        print("[INFO] Menerapkan zoom punch-in di awal video...")
        final = apply_intro_zoom(final)

    try:
        final.write_videofile(
            output_path, fps=30, codec="h264_nvenc", audio=False, logger=None,
            ffmpeg_params=["-preset", "p4", "-cq", "19"],
        )
    except Exception as e:
        print(f"[WARNING] Encoding NVENC (GPU) gagal ({e}), fallback ke CPU (libx264)...")
        final.write_videofile(output_path, fps=30, codec="libx264", audio=False, logger=None)

    for c in clips:
        c.close()

    print(f"[INFO] Media gabungan tersimpan di: {output_path}")
    return output_path, music_audio_path
