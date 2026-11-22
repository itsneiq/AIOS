# modules/subtitle_gen.py
import subprocess
import whisper
from config import WHISPER_MODEL, SUBTITLE_STYLES, FONTS_DIR

_model_cache = None


def _get_whisper_model():
    global _model_cache
    if _model_cache is None:
        device = "cpu"
        try:
            import torch
            if torch.cuda.is_available():
                device = "cuda"
                print(f"[INFO] GPU (CUDA) terdeteksi, Whisper dipakai di GPU.")
            else:
                print(f"[INFO] GPU (CUDA) nggak terdeteksi, Whisper dipakai di CPU "
                      f"(lebih lambat - install torch versi CUDA kalau mau lebih cepat).")
        except Exception:
            pass

        print(f"[INFO] Loading Whisper model '{WHISPER_MODEL}' (pertama kali agak lama)...")
        _model_cache = whisper.load_model(WHISPER_MODEL, device=device)
    return _model_cache


def _format_timestamp(seconds: float) -> str:
    hours = int(seconds // 3600)
    minutes = int((seconds % 3600) // 60)
    secs = int(seconds % 60)
    millis = int(round((seconds - int(seconds)) * 1000))
    return f"{hours:02d}:{minutes:02d}:{secs:02d},{millis:03d}"


def _write_srt(segments: list, output_srt_path: str):
    srt_lines = []
    for i, seg in enumerate(segments, start=1):
        start = _format_timestamp(seg["start"])
        end = _format_timestamp(seg["end"])
        srt_lines.append(str(i))
        srt_lines.append(f"{start} --> {end}")
        srt_lines.append(seg["text"].strip())
        srt_lines.append("")

    with open(output_srt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(srt_lines))


def generate_subtitles(audio_path: str, output_srt_path: str, language: str = "id"):
    """
    Transkrip audio VO jadi file subtitle .srt pake Whisper.
    Return: (path_srt, list_segments) - segments dipakai buat misahin hook text.
    """
    model = _get_whisper_model()
    print(f"[INFO] Transkrip audio: {audio_path} ...")
    result = model.transcribe(audio_path, language=language)

    segments = [
        {"start": seg["start"], "end": seg["end"], "text": seg["text"].strip()}
        for seg in result["segments"]
    ]

    _write_srt(segments, output_srt_path)
    print(f"[INFO] Subtitle tersimpan di: {output_srt_path}")
    return output_srt_path, segments


def split_hook_and_rest(segments: list, tmp_dir: str, base_name: str):
    """
    Pisahin segment PERTAMA (buat hook text) dari sisanya (subtitle biasa).
    Return: (hook_srt_path atau None, rest_srt_path atau None)
    """
    if not segments:
        return None, None

    hook_seg = [segments[0]]
    rest_segs = segments[1:]

    hook_srt_path = f"{tmp_dir}/{base_name}_hook.srt"
    _write_srt(hook_seg, hook_srt_path)

    rest_srt_path = None
    if rest_segs:
        rest_srt_path = f"{tmp_dir}/{base_name}_rest.srt"
        _write_srt(rest_segs, rest_srt_path)

    return hook_srt_path, rest_srt_path


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


def hex_to_ass_color(hex_code: str) -> str:
    hex_code = hex_code.strip().lstrip("#").upper()
    if len(hex_code) != 6:
        raise ValueError(f"Kode warna hex nggak valid: {hex_code}")
    r, g, b = hex_code[0:2], hex_code[2:4], hex_code[4:6]
    return f"&H00{b}{g}{r}&"


def build_custom_style(font_name, text_color_hex, outline_color_hex="000000", font_size=16,
                        bold=False, alignment=2, margin_v=80, outline_width=2) -> dict:
    return {
        "FontName": font_name,
        "FontSize": font_size,
        "PrimaryColour": hex_to_ass_color(text_color_hex),
        "OutlineColour": hex_to_ass_color(outline_color_hex),
        "BackColour": "&H00000000&",
        "Bold": 1 if bold else 0,
        "BorderStyle": 1,
        "Outline": outline_width,
        "Shadow": 0,
        "Alignment": alignment,
        "MarginV": margin_v,
    }


def burn_subtitles_to_video(video_path: str, output_path: str,
                             main_srt_path: str = None, main_style=None,
                             hook_srt_path: str = None, hook_style: dict = None) -> str:
    """
    'Bakar' subtitle ke video. Bisa gabungin 2 layer sekaligus:
    - main_srt_path + main_style : subtitle biasa (nama preset STRING atau dict custom)
    - hook_srt_path + hook_style : hook text terpisah (dict), independen dari subtitle biasa

    Salah satu boleh None kalau nggak dipakai.
    """
    fonts_dir_escaped = FONTS_DIR.replace("\\", "/").replace(":", "\\:")
    filters = []

    if hook_srt_path and hook_style:
        srt_escaped = hook_srt_path.replace("\\", "/").replace(":", "\\:")
        style_str = _build_force_style(hook_style)
        filters.append(f"subtitles='{srt_escaped}':fontsdir='{fonts_dir_escaped}':force_style='{style_str}'")

    if main_srt_path and main_style:
        if isinstance(main_style, str):
            if main_style not in SUBTITLE_STYLES:
                main_style = "simple"
            style_dict = SUBTITLE_STYLES[main_style]
        else:
            style_dict = main_style

        srt_escaped = main_srt_path.replace("\\", "/").replace(":", "\\:")
        style_str = _build_force_style(style_dict)
        filters.append(f"subtitles='{srt_escaped}':fontsdir='{fonts_dir_escaped}':force_style='{style_str}'")

    if not filters:
        raise ValueError("Nggak ada subtitle/hook yang mau di-burn (semua None).")

    vf = ",".join(filters)
    cmd = ["ffmpeg", "-y", "-i", video_path, "-vf", vf, "-c:a", "copy", output_path]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        raise Exception(f"Burn subtitle gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Video dengan subtitle/hook tersimpan di: {output_path}")
    return output_path
