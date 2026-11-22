# modules/audio_ducking.py
import os
import subprocess


def has_audio_stream(video_path: str) -> bool:
    cmd = [
        "ffprobe", "-v", "error",
        "-select_streams", "a",
        "-show_entries", "stream=index",
        "-of", "csv=p=0",
        video_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return bool(result.stdout.strip())


def extract_audio_from_video(video_path: str, output_audio_path: str) -> str:
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vn", "-acodec", "pcm_s16le", "-ar", "44100",
        output_audio_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise Exception(f"Extract audio gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Audio musik diekstrak ke: {output_audio_path}")
    return output_audio_path


def duck_and_mix_audio(
    music_path: str,
    vo_path: str,
    output_path: str,
    music_volume: float = 1.0,
    threshold: float = 0.02,
    ratio: int = 8,
    attack: int = 5,
    release: int = 300,
) -> str:
    filter_complex = (
        f"[0:a]volume={music_volume}[music];"
        f"[1:a]asplit=2[sc][vo_out];"
        f"[music][sc]sidechaincompress=threshold={threshold}:ratio={ratio}:attack={attack}:release={release}[ducked];"
        f"[ducked][vo_out]amix=inputs=2:duration=longest:dropout_transition=0,"
        f"loudnorm=I=-16:TP=-1.5:LRA=11[out]"
    )

    cmd = [
        "ffmpeg", "-y",
        "-i", music_path,
        "-i", vo_path,
        "-filter_complex", filter_complex,
        "-map", "[out]",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise Exception(f"Audio ducking gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Audio hasil ducking + normalize tersimpan di: {output_path}")
    return output_path


def _normalize_vo_only(vo_path: str, output_path: str) -> str:
    cmd = [
        "ffmpeg", "-y",
        "-i", vo_path,
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        output_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if result.returncode != 0:
        raise Exception(f"Normalize VO gagal.\nSTDERR: {result.stderr}")

    print(f"[INFO] Audio VO (normalized, tanpa musik) tersimpan di: {output_path}")
    return output_path


def prepare_final_audio(video_path: str, vo_path: str, output_path: str) -> str:
    """
    Versi lama: ambil musik dari SATU video sumber langsung.
    Dipakai buat testing tunggal (test_ducking.py).
    """
    if has_audio_stream(video_path):
        tmp_music = output_path.replace(".wav", "_temp_music.wav")
        extract_audio_from_video(video_path, tmp_music)
        result = duck_and_mix_audio(tmp_music, vo_path, output_path)
        if os.path.exists(tmp_music):
            os.remove(tmp_music)
        return result
    else:
        return _normalize_vo_only(vo_path, output_path)


def prepare_final_audio_from_music_path(music_audio_path: str, vo_path: str, output_path: str) -> str:
    """
    Versi buat BATCH: musik udah diekstrak duluan (bisa dari beberapa video
    sekaligus atau produk tipe foto yang nggak punya musik sama sekali).

    music_audio_path : path file audio musik, ATAU None kalau nggak ada musik
    """
    if music_audio_path and os.path.exists(music_audio_path):
        return duck_and_mix_audio(music_audio_path, vo_path, output_path)
    else:
        print("[INFO] Nggak ada musik latar buat produk ini, pakai VO aja.")
        return _normalize_vo_only(vo_path, output_path)
