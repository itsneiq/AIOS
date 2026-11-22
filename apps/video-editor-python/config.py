# config.py
from credentials import GEMINI_API_KEYS, AZURE_SPEECH_KEY, AZURE_SPEECH_REGION

GEMINI_TTS_MODEL = "gemini-2.5-flash-preview-tts"

VOICE_OPTIONS = {
    "1": {"label": "Ardi - Cowok Indonesia (Azure, lokal)",       "engine": "azure",  "voice_name": "id-ID-ArdiNeural"},
    "2": {"label": "Gadis - Cewek Indonesia (Azure, lokal)",      "engine": "azure",  "voice_name": "id-ID-GadisNeural"},
    "3": {"label": "Ava - Cewek Multilingual (Azure)",            "engine": "azure",  "voice_name": "en-US-AvaMultilingualNeural"},
    "4": {"label": "Zephyr - Ekspresif & hangat (Gemini)",        "engine": "gemini", "voice_name": "Zephyr"},
    "5": {"label": "Puck - Energik & cepat (Gemini)",             "engine": "gemini", "voice_name": "Puck"},
    "6": {"label": "Kore - Tenang & profesional (Gemini)",        "engine": "gemini", "voice_name": "Kore"},
    "7": {"label": "Charon - Cowok, suara dalam (Gemini)",        "engine": "gemini", "voice_name": "Charon"},
    "8": {"label": "Leda - Cewek, ramah (Gemini)",                "engine": "gemini", "voice_name": "Leda"},
}

INPUT_DIR = "input"
OUTPUT_DIR = "output"
FONTS_DIR = "assets/fonts"

AUTOCUT_THRESHOLD_OFFSET_DB = -5
AUTOCUT_MARGIN_SEC = 0.2

VIDEO_WIDTH = 1080
VIDEO_HEIGHT = 1920
KEN_BURNS_ZOOM_RATIO = 0.04
MIN_PHOTO_DURATION = 1.5

ZOOM_PUNCH_ENABLED = True

TRANSITION_ENABLED = True
TRANSITION_DURATION = 0.4

WHISPER_MODEL = "small"

SUBTITLE_ON = True
SUBTITLE_STYLE = "simple"

SUBTITLE_STYLES = {
    "simple": {
        "label": "Simple - putih bersih, ukuran kecil",
        "FontName": "Arial", "FontSize": 13,
        "PrimaryColour": "&H00FFFFFF&", "OutlineColour": "&H00000000&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 2, "Shadow": 0,
        "Alignment": 2, "MarginV": 80,
    },
    "minimal": {
        "label": "Minimal - kecil banget, mepet tepi bawah",
        "FontName": "Arial", "FontSize": 11,
        "PrimaryColour": "&H00FFFFFF&", "OutlineColour": "&H00000000&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 1, "Shadow": 0,
        "Alignment": 2, "MarginV": 40,
    },
    "boxed_clean": {
        "label": "Boxed Clean - teks putih dengan kotak background transparan",
        "FontName": "Arial", "FontSize": 13,
        "PrimaryColour": "&H00FFFFFF&", "OutlineColour": "&H00000000&", "BackColour": "&H80000000&",
        "Bold": 0, "BorderStyle": 3, "Outline": 0, "Shadow": 0,
        "Alignment": 2, "MarginV": 80,
    },
    "cartoon_bangers": {
        "label": "Comic shout - kuning, gaya komik/banner (font: Bangers)",
        "FontName": "Bangers", "FontSize": 18,
        "PrimaryColour": "&H0000FFFF&", "OutlineColour": "&H00000000&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 3, "Shadow": 0,
        "Alignment": 2, "MarginV": 90,
    },
    "cartoon_luckiest_guy": {
        "label": "Cartoon bulat tebal - oranye ceria (font: Luckiest Guy)",
        "FontName": "Luckiest Guy", "FontSize": 16,
        "PrimaryColour": "&H0000A5FF&", "OutlineColour": "&H00FFFFFF&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 3, "Shadow": 0,
        "Alignment": 2, "MarginV": 90,
    },
    "cartoon_fredoka": {
        "label": "Playful rounded - pink cerah, gaya TikTok (font: Fredoka)",
        "FontName": "Fredoka", "FontSize": 16,
        "PrimaryColour": "&H00B469FF&", "OutlineColour": "&H00800080&", "BackColour": "&H00000000&",
        "Bold": 1, "BorderStyle": 1, "Outline": 3, "Shadow": 1,
        "Alignment": 2, "MarginV": 90,
    },
    "cartoon_chewy": {
        "label": "Bubble imut - hijau muda ceria (font: Chewy)",
        "FontName": "Chewy", "FontSize": 16,
        "PrimaryColour": "&H0090EE90&", "OutlineColour": "&H00000000&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 2, "Shadow": 0,
        "Alignment": 2, "MarginV": 90,
    },
    "cartoon_marker": {
        "label": "Gaya tulisan spidol tangan (font: Permanent Marker)",
        "FontName": "Permanent Marker", "FontSize": 15,
        "PrimaryColour": "&H00FFFFFF&", "OutlineColour": "&H00000000&", "BackColour": "&H00000000&",
        "Bold": 0, "BorderStyle": 1, "Outline": 2, "Shadow": 0,
        "Alignment": 2, "MarginV": 85,
    },
}

HOOK_ON = False

HOOK_STYLE = {
    "FontName": "Arial Black",
    "FontSize": 22,
    "PrimaryColour": "&H00FFFFFF&",
    "OutlineColour": "&H00000000&",
    "BackColour": "&H00000000&",
    "Bold": 1,
    "BorderStyle": 1,
    "Outline": 3,
    "Shadow": 0,
    "Alignment": 5,
    "MarginV": 0,
}

FONT_OPTIONS = {
    "1": "Arial", "2": "Arial Black", "3": "Impact", "4": "Georgia", "5": "Comic Sans MS",
    "6": "Bangers", "7": "Luckiest Guy", "8": "Fredoka", "9": "Chewy", "10": "Permanent Marker",
}

COLOR_OPTIONS = {
    "1": {"label": "Putih", "hex": "FFFFFF"},
    "2": {"label": "Hitam", "hex": "000000"},
    "3": {"label": "Kuning", "hex": "FFFF00"},
    "4": {"label": "Merah", "hex": "FF0000"},
    "5": {"label": "Hijau", "hex": "00FF00"},
    "6": {"label": "Biru", "hex": "0000FF"},
    "7": {"label": "Pink", "hex": "FF69B4"},
    "8": {"label": "Ungu", "hex": "800080"},
    "9": {"label": "Oranye", "hex": "FFA500"},
    "10": {"label": "Emas", "hex": "D4AF37"},
    "0": {"label": "Custom (input hex sendiri)", "hex": None},
}

WATERMARK_ENABLED = False
WATERMARK_PATH = "assets/watermark/logo.png"
WATERMARK_POSITION = "Kanan Bawah"

COLOR_GRADE_PRESET = "none"
