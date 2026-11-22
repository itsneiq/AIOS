# modules/render_final.py
import os
import subprocess
from modules.effects import COLOR_GRADE_PRESETS
from config import (
    SUBTITLE_ON, SUBTITLE_STYLE, SUBTITLE_STYLES, FONTS_DIR,
    WATERMARK_ENABLED, WATERMARK_PATH, WATERMARK_POSITION, COLOR_GRADE_PRESET,
)

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


def _get_duration(path: str) -> float:
    cmd = ["ffprobe", "-v", "error", "-show_entries", "format=duration",
           "-of", "default=noprint_wrappers=1:nokey=1", path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return float(result.stdout.strip())


def _build_force_style(style: dict) -> str:
    return (
        f"FontName={style['FontName']},"
        f"FontSize={style['FontSize']},"
        f"PrimaryColour={style['PrimaryColour']},"
        f"OutlineColour={style['OutlineColour']},"
        f"BackColour={style.get('BackColour', '&H00000000&')},"
        f"Bold={style['Bold']},"
        f"BorderStyle={style['BorderStyle']},"
        f"Outline={style['Outline']},"
        f"Shadow={style['Shadow']},"
        f"Alignment={style['Alignment']},"
        f"MarginV={style['MarginV']}"
    )


def _run_ffmpeg_with_nvenc_fallback(cmd_base: list, video_codec_flag_index: int) -> subprocess.CompletedProcess:
    result = subprocess.run(cmd_base, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0 and "nvenc" in " ".join(cmd_base).lower():
        print("[WARNING] Encoding NVENC (GPU) gagal, fallback ke CPU (libx264)...")
        cmd_cpu = cmd_base.copy()
        cmd_cpu[video_codec_flag_index] = "libx264"
        cmd_cpu = [c for c in cmd_cpu if c not in ("-cq", "19", "-preset", "p4")]
        result = subprocess.run(cmd_cpu, capture_output=True, text=True, encoding="utf-8", errors="replace")

    return result


def render_final_video(
    video_path: str,
    audio_path: str,
    output_path: str,
    srt_path: str = None,
    subtitle_on: bool = None,
    subtitle_style=None,
    hook_srt_path: str = None,
    hook_on: bool = False,
    hook_style: dict = None,
    watermark_enabled: bool = None,
    watermark_type: str = "image",
    watermark_path: str = None,
    watermark_text: str = None,
    watermark_position: str = None,
    color_grade_preset: str = None,
) -> str:
    if subtitle_on is None:
        subtitle_on = SUBTITLE_ON
    if subtitle_style is None:
        subtitle_style = SUBTITLE_STYLE
    if watermark_enabled is None:
        watermark_enabled = WATERMARK_ENABLED
    if watermark_path is None:
        watermark_path = WATERMARK_PATH
    if watermark_position is None:
        watermark_position = WATERMARK_POSITION
    if color_grade_preset is None:
        color_grade_preset = COLOR_GRADE_PRESET

    video_dur = _get_duration(video_path)
    audio_dur = _get_duration(audio_path)

    inputs = ["-i", video_path, "-i", audio_path]
    next_input_idx = 2

    filter_parts = []
    video_label = "0:v"
    audio_label = "1:a"

    if audio_dur > video_dur:
        speed_factor = audio_dur / video_dur
        pct = (speed_factor - 1) * 100
        print(f"[INFO] Audio ({audio_dur:.1f}s) lebih panjang dari video ({video_dur:.1f}s), "
              f"audio dipercepat {pct:.1f}% biar pas.")
        if pct > 25:
            print(f"[WARNING] Audio dipercepat cukup banyak ({pct:.1f}%), suara VO mungkin kedengeran buru-buru.")
        filter_parts.append(f"[1:a]atempo={speed_factor:.4f}[aout]")
        audio_label = "aout"

    if color_grade_preset and color_grade_preset != "none":
        cg_filter = COLOR_GRADE_PRESETS.get(color_grade_preset)
        if cg_filter:
            filter_parts.append(f"[{video_label}]{cg_filter}[graded]")
            video_label = "graded"

    if watermark_enabled:
        if watermark_type == "image" and watermark_path and os.path.exists(watermark_path):
            inputs += ["-i", watermark_path]
            wm_idx = next_input_idx
            next_input_idx += 1
            pos = _WATERMARK_POSITION_MAP.get(watermark_position, _WATERMARK_POSITION_MAP["Kanan Bawah"])
            filter_parts.append(f"[{wm_idx}:v]scale=150:-1,format=rgba,colorchannelmixer=aa=0.8[wmimg]")
            filter_parts.append(f"[{video_label}][wmimg]overlay={pos}[wmout]")
            video_label = "wmout"
        elif watermark_type == "text" and watermark_text:
            pos_expr = _TEXT_WATERMARK_POSITION_MAP.get(watermark_position, _TEXT_WATERMARK_POSITION_MAP["Kanan Bawah"])
            text_escaped = watermark_text.replace("\\", "\\\\").replace(":", "\\:").replace("'", "\\'")
            font_path = "C\\:/Windows/Fonts/arial.ttf"
            filter_parts.append(
                f"[{video_label}]drawtext=fontfile='{font_path}':text='{text_escaped}':"
                f"fontsize=24:fontcolor=0xFFFFFF@0.8:{pos_expr}:shadowcolor=black@0.5:shadowx=2:shadowy=2[wmtxt]"
            )
            video_label = "wmtxt"

    fonts_dir_escaped = FONTS_DIR.replace("\\", "/").replace(":", "\\:")
    sub_filters = []

    print(f"[DEBUG] hook_on={hook_on}, hook_srt_path={hook_srt_path}, "
          f"hook_srt_ada={os.path.exists(hook_srt_path) if hook_srt_path else False}, "
          f"hook_style_diisi={bool(hook_style)}")

    if hook_on and hook_srt_path and os.path.exists(hook_srt_path) and hook_style:
        print(f"[DEBUG] hook_style dict yang diterima: {hook_style}")
        srt_escaped = hook_srt_path.replace("\\", "/").replace(":", "\\:")
        style_str = _build_force_style(hook_style)
        print(f"[DEBUG] force_style HOOK yang dikirim ke ffmpeg: {style_str}")
        sub_filters.append(f"subtitles='{srt_escaped}':fontsdir='{fonts_dir_escaped}':force_style='{style_str}'")

        with open(hook_srt_path, "r", encoding="utf-8") as f:
            print(f"[DEBUG] Isi file hook.srt:\n{f.read()}")

    need_main_sub = subtitle_on and srt_path and os.path.exists(srt_path)
    if need_main_sub:
        if isinstance(subtitle_style, str):
            style_dict = SUBTITLE_STYLES.get(subtitle_style, SUBTITLE_STYLES["simple"])
        else:
            style_dict = subtitle_style
        srt_escaped = srt_path.replace("\\", "/").replace(":", "\\:")
        style_str = _build_force_style(style_dict)
        print(f"[DEBUG] force_style SUBTITLE UTAMA yang dikirim ke ffmpeg: {style_str}")
        sub_filters.append(f"subtitles='{srt_escaped}':fontsdir='{fonts_dir_escaped}':force_style='{style_str}'")

    if sub_filters:
        combined = ",".join(sub_filters)
        filter_parts.append(f"[{video_label}]{combined}[subout]")
        video_label = "subout"

    filter_complex = ";".join(filter_parts) if filter_parts else None

    cmd = ["ffmpeg", "-y"] + inputs
    if filter_complex:
        print(f"[DEBUG] filter_complex lengkap:\n{filter_complex}")
        cmd += ["-filter_complex", filter_complex, "-map", f"[{video_label}]"]
    else:
        cmd += ["-map", "0:v"]
    cmd += ["-map", f"[{audio_label}]" if audio_label == "aout" else "1:a"]

    video_codec_idx = len(cmd)
    cmd += ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"]
    cmd += ["-c:a", "aac", "-shortest", output_path]

    result = _run_ffmpeg_with_nvenc_fallback(cmd, video_codec_idx + 1)

    if result.returncode != 0:
        raise Exception(f"Render final gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] === VIDEO FINAL tersimpan di: {output_path} ===")
    return output_path
