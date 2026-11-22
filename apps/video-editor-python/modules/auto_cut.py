# modules/auto_cut.py
import shutil
import subprocess
import re
from config import AUTOCUT_THRESHOLD_OFFSET_DB, AUTOCUT_MARGIN_SEC


def _has_audio_stream(input_path: str) -> bool:
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=index",
        "-of", "csv=p=0",
        input_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return bool(result.stdout.strip())


def _get_rms_level_db(input_path: str) -> float:
    cmd = ["ffmpeg", "-i", input_path, "-af", "astats=metadata=1:reset=1", "-f", "null", "-"]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    matches = re.findall(r"RMS level dB:\s*(-?\d+\.?\d*)", result.stderr)
    if not matches:
        return -30.0

    return float(matches[-1])


def auto_cut_video(input_path: str, output_path: str) -> str:
    """
    Potong otomatis bagian video yang sepi. Nyoba encode pake NVENC (GPU)
    dulu, fallback otomatis ke encoder default kalau nggak didukung.
    """
    if not _has_audio_stream(input_path):
        print(f"[INFO] Video '{input_path}' nggak ada audio, auto-cut di-skip (dipakai apa adanya).")
        shutil.copy(input_path, output_path)
        return output_path

    rms_db = _get_rms_level_db(input_path)
    threshold_db = rms_db + AUTOCUT_THRESHOLD_OFFSET_DB

    print(f"[INFO] Level volume video: {rms_db:.1f}dB -> threshold auto-cut dipakai: {threshold_db:.1f}dB")

    base_cmd = [
        "auto-editor",
        input_path,
        "-o", output_path,
        "--edit", f"audio:threshold={threshold_db:.1f}dB",
        "--margin", f"{AUTOCUT_MARGIN_SEC}sec",
        "--no-open",
    ]

    # Coba NVENC dulu
    cmd_nvenc = base_cmd + ["--video-codec", "h264_nvenc"]
    result = subprocess.run(cmd_nvenc, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        print("[WARNING] Auto-cut dengan NVENC gagal, coba encoder default (CPU)...")
        result = subprocess.run(base_cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")

    if result.returncode != 0:
        print(f"[WARNING] Auto-cut gagal total ({result.stderr.strip()[:200]}), pakai video asli tanpa dipotong.")
        shutil.copy(input_path, output_path)
        return output_path

    print(f"[INFO] Video hasil auto-cut tersimpan di: {output_path}")
    return output_path
