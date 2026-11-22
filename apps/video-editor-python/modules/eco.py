# modules/eco.py
"""Mode hemat CPU: turunkan prioritas proses (Windows). Proses anak (ffmpeg, auto-editor) mewarisinya,
jadi aplikasi lain tetap lancar walaupun render sedang jalan. Aman dipanggil di OS lain (tidak melakukan apa-apa)."""
import sys

BELOW_NORMAL = 0x00004000
NORMAL = 0x00000020


def set_low_priority(on: bool) -> bool:
    if not sys.platform.startswith("win"):
        return False
    try:
        import ctypes
        k = ctypes.windll.kernel32
        return bool(k.SetPriorityClass(k.GetCurrentProcess(), BELOW_NORMAL if on else NORMAL))
    except Exception:
        return False
