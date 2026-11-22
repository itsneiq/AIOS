# batch_process.py
import os
import glob
import subprocess
from modules.csv_loader import load_product_list
from modules.script_generator import generate_vo_script
from modules.tts_engine import generate_vo_audio as generate_azure_audio
from modules.gemini_tts_engine import generate_gemini_tts_audio
from modules.media_builder import build_media_video
from modules.audio_ducking import prepare_final_audio_from_music_path
from modules.subtitle_gen import generate_subtitles, split_hook_and_rest
from modules.render_final import render_final_video
from config import VOICE_OPTIONS, SUBTITLE_STYLES, HOOK_STYLE


def _get_duration(path: str) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(result.stdout.strip())


def generate_audio(text: str, output_path: str, voice_option: dict) -> str:
    if voice_option["engine"] == "azure":
        return generate_azure_audio(text, output_path, voice_name=voice_option["voice_name"])
    else:
        return generate_gemini_tts_audio(text, output_path, voice_name=voice_option["voice_name"])


def process_one_product(
    product: dict,
    voice_option: dict,
    subtitle_on: bool,
    subtitle_style,
    target_vo_duration: float = 20,
    hook_on: bool = False,
    hook_style: dict = None,
    watermark_enabled: bool = None,
    watermark_type: str = "image",
    watermark_path: str = None,
    watermark_text: str = None,
    watermark_position: str = None,
    color_grade_preset: str = None,
    zoom_punch_enabled: bool = None,
    transition_enabled: bool = None,
    tmp_dir: str = "output/_tmp",
) -> str:
    os.makedirs(tmp_dir, exist_ok=True)
    os.makedirs("output", exist_ok=True)

    if hook_style is None:
        hook_style = HOOK_STYLE

    judul = product["judul"]
    safe_name = "".join(c if c.isalnum() else "_" for c in judul.lower())

    print(f"\n{'=' * 55}\nMEMPROSES: {judul}\n{'=' * 55}")

    print("[1/6] Generate naskah VO...")
    naskah = generate_vo_script(product["deskripsi"], duration_seconds=target_vo_duration)

    print("[2/6] Generate audio VO...")
    vo_path = os.path.join(tmp_dir, f"{safe_name}_vo.wav")
    generate_audio(naskah, vo_path, voice_option)
    vo_duration = _get_duration(vo_path)
    print(f"       Durasi VO: {vo_duration:.1f} detik")

    print("[3/6] Menyiapkan video/foto...")
    media_video_path = os.path.join(tmp_dir, f"{safe_name}_media.mp4")
    media_video_path, music_audio_path = build_media_video(
        product["media_paths"], target_duration=vo_duration,
        output_path=media_video_path, tmp_dir=tmp_dir,
        zoom_punch_enabled=zoom_punch_enabled, transition_enabled=transition_enabled,
    )

    print("[4/6] Audio ducking...")
    final_audio_path = os.path.join(tmp_dir, f"{safe_name}_final_audio.wav")
    prepare_final_audio_from_music_path(music_audio_path, vo_path, final_audio_path)

    srt_path = None
    hook_srt_path = None
    if subtitle_on or hook_on:
        print("[5/6] Generate subtitle...")
        srt_path = os.path.join(tmp_dir, f"{safe_name}.srt")
        _, segments = generate_subtitles(vo_path, srt_path, language="id")

        if hook_on:
            hook_srt_path, rest_srt_path = split_hook_and_rest(segments, tmp_dir, safe_name)
            if subtitle_on:
                srt_path = rest_srt_path
    else:
        print("[5/6] Subtitle & hook di-skip (keduanya OFF).")

    print("[6/6] Render video final...")
    output_path = os.path.join("output", product["nama_output"])
    render_final_video(
        video_path=media_video_path,
        audio_path=final_audio_path,
        output_path=output_path,
        srt_path=srt_path,
        subtitle_on=subtitle_on,
        subtitle_style=subtitle_style,
        hook_srt_path=hook_srt_path,
        hook_on=hook_on,
        hook_style=hook_style,
        watermark_enabled=watermark_enabled,
        watermark_type=watermark_type,
        watermark_path=watermark_path,
        watermark_text=watermark_text,
        watermark_position=watermark_position,
        color_grade_preset=color_grade_preset,
    )

    print("[Cleanup] Menghapus file sementara produk ini...")
    for f in glob.glob(os.path.join(tmp_dir, f"{safe_name}*")):
        try:
            os.remove(f)
        except Exception:
            pass

    print(f"\n✅ SELESAI: {output_path}")
    return output_path


if __name__ == "__main__":
    print("Jalanin 'python gui_app.py' buat pake versi GUI-nya.")
