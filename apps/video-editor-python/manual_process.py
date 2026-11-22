# manual_process.py
"""
Pemrosesan MODE MANUAL: 1 produk, media dipilih langsung (bukan dari Excel),
naskah disusun pakai formula copywriting (teks final atau instruksi).

Semua fitur visual/audio (suara, subtitle, hook, watermark, filter warna,
zoom punch, transisi) tetap tersedia sama seperti Mode Batch.
"""
import os
import glob
import subprocess

from modules.script_formula import build_manual_script
from modules.tts_engine import generate_vo_audio as generate_azure_audio
from modules.gemini_tts_engine import generate_gemini_tts_audio
from modules.media_builder import build_media_video
from modules.audio_ducking import prepare_final_audio_from_music_path
from modules.subtitle_gen import generate_subtitles, split_hook_and_rest
from modules.render_final import render_final_video
from config import HOOK_STYLE


def _get_duration(path: str) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(result.stdout.strip())


def _generate_audio(text: str, output_path: str, voice_option: dict) -> str:
    if voice_option["engine"] == "azure":
        return generate_azure_audio(text, output_path, voice_name=voice_option["voice_name"])
    return generate_gemini_tts_audio(text, output_path, voice_name=voice_option["voice_name"])


def process_manual(
    media_paths: list,
    nama_output: str,
    voice_option: dict,
    formula_key: str,
    part_values: dict,
    teks_final: bool,
    judul_produk: str = "",
    deskripsi_produk: str = "",
    target_vo_duration: float = 20,
    subtitle_on: bool = True,
    subtitle_style=None,
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
    """
    Proses 1 produk lewat Mode Manual, dari media + naskah formula sampai video final.
    """
    os.makedirs(tmp_dir, exist_ok=True)
    os.makedirs("output", exist_ok=True)

    if hook_style is None:
        hook_style = HOOK_STYLE

    if not nama_output.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
        nama_output = nama_output.strip() + ".mp4"

    safe_name = "".join(c if c.isalnum() else "_" for c in os.path.splitext(nama_output)[0].lower())

    print(f"\n{'=' * 55}\nMODE MANUAL: {nama_output}\n{'=' * 55}")

    print("[1/6] Menyusun naskah VO...")
    naskah = build_manual_script(
        formula_key=formula_key,
        part_values=part_values,
        teks_final=teks_final,
        judul_produk=judul_produk,
        deskripsi_produk=deskripsi_produk,
        duration_seconds=target_vo_duration,
    )
    print(f"\nNaskah VO:\n{naskah}\n")

    print("[2/6] Generate audio VO...")
    vo_path = os.path.join(tmp_dir, f"{safe_name}_vo.wav")
    _generate_audio(naskah, vo_path, voice_option)
    vo_duration = _get_duration(vo_path)
    print(f"       Durasi VO: {vo_duration:.1f} detik")

    print("[3/6] Menyiapkan video/foto...")
    media_video_path = os.path.join(tmp_dir, f"{safe_name}_media.mp4")
    media_video_path, music_audio_path = build_media_video(
        media_paths, target_duration=vo_duration,
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
    output_path = os.path.join("output", nama_output)
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

    print("[Cleanup] Menghapus file sementara...")
    for f in glob.glob(os.path.join(tmp_dir, f"{safe_name}*")):
        try:
            os.remove(f)
        except Exception:
            pass

    print(f"\nSELESAI: {output_path}")
    return output_path
