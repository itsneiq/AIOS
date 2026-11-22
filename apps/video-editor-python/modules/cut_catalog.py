# modules/cut_catalog.py
"""
Katalog preset CutRecipe Studio (data murni, ditulis sendiri).
Menambah pilihan baru = tambah satu entri di sini, tanpa mengubah kode lain.
Semua jalan di CPU lewat filter ffmpeg standar.
"""

# ---------------------------------------------------------- Transisi
# key -> (label, kategori). key = nama transisi xfade ffmpeg ("cut" = tanpa transisi).
TRANSITIONS = {
    "cut": ("Potong langsung", "Dasar"),
    "fade": ("Fade", "Dasar"),
    "fadeblack": ("Fade hitam", "Dasar"),
    "fadewhite": ("Fade putih", "Dasar"),
    "dissolve": ("Dissolve", "Dasar"),
    "distance": ("Distance", "Dasar"),
    "wipeleft": ("Wipe kiri", "Wipe"),
    "wiperight": ("Wipe kanan", "Wipe"),
    "wipeup": ("Wipe atas", "Wipe"),
    "wipedown": ("Wipe bawah", "Wipe"),
    "slideleft": ("Geser kiri", "Geser"),
    "slideright": ("Geser kanan", "Geser"),
    "slideup": ("Geser atas", "Geser"),
    "slidedown": ("Geser bawah", "Geser"),
    "smoothleft": ("Halus kiri", "Geser"),
    "smoothright": ("Halus kanan", "Geser"),
    "circleopen": ("Lingkaran buka", "Bentuk"),
    "circleclose": ("Lingkaran tutup", "Bentuk"),
    "circlecrop": ("Lingkaran crop", "Bentuk"),
    "vertopen": ("Pintu vertikal", "Bentuk"),
    "horzopen": ("Pintu horizontal", "Bentuk"),
    "radial": ("Radial (jam)", "Bentuk"),
    "zoomin": ("Zoom masuk", "Zoom"),
    "squeezeh": ("Remas horizontal", "Zoom"),
    "pixelize": ("Pixelize", "Gaya"),
    "hlslice": ("Iris horizontal", "Gaya"),
    "vuslice": ("Iris vertikal", "Gaya"),
}

# ---------------------------------------------------------- Efek per segmen
# key -> (label, kategori). Rumus ada di cut_recipe._effect_filter
EFFECTS = {
    "none": ("Tanpa efek", "Dasar"),
    "zoom_in": ("Zoom In pelan", "Zoom"),
    "zoom_out": ("Zoom Out pelan", "Zoom"),
    "zoom_punch": ("Zoom Punch", "Zoom"),
    "pulse": ("Pulse (denyut)", "Zoom"),
    "shake": ("Shake (getar)", "Shake"),
    "shake_hard": ("Shake keras", "Shake"),
    "tilt": ("Goyang miring", "Shake"),
    "glitch": ("Glitch RGB", "Glitch"),
    "rgb_split": ("RGB Split", "Glitch"),
    "vhs": ("VHS", "Retro"),
    "film_grain": ("Film Grain", "Retro"),
    "flash": ("Flash putih", "Cahaya"),
    "flash_negatif": ("Flash negatif", "Cahaya"),
    "fade_in": ("Fade dari hitam", "Cahaya"),
    "fade_out": ("Fade ke hitam", "Cahaya"),
    "vignette": ("Vinyet", "Cahaya"),
    "blur_in": ("Blur lalu fokus", "Blur"),
    "bw_flash": ("Hitam putih sesaat", "Gaya"),
    "mirror": ("Cermin", "Gaya"),
}

# ---------------------------------------------------------- Filter warna
# key -> (label, kategori, rantai filter ffmpeg)
FILTERS = {
    "none": ("Tanpa filter", "Dasar", None),
    # Sehari-hari
    "fresh": ("Segar", "Sehari-hari", "eq=contrast=1.08:brightness=0.03:saturation=1.15"),
    "vivid": ("Vivid", "Sehari-hari", "eq=contrast=1.15:saturation=1.45"),
    "clean": ("Bersih", "Sehari-hari", "eq=contrast=1.06:brightness=0.02:saturation=0.92"),
    "soft_light": ("Lembut", "Sehari-hari", "eq=contrast=0.93:brightness=0.04:saturation=1.05,curves=all='0/0.04 1/0.97'"),
    "cerah_pop": ("Cerah Pop", "Sehari-hari", "eq=contrast=1.15:brightness=0.03:saturation=1.3"),
    "pastel": ("Pastel", "Sehari-hari", "eq=contrast=0.9:brightness=0.06:saturation=0.8,curves=all='0/0.08 1/1'"),
    # Hangat
    "warm": ("Hangat", "Hangat", "colorbalance=rs=0.08:gs=0.02:bs=-0.1:rm=0.06:bm=-0.08,eq=saturation=1.08"),
    "golden_hour": ("Golden Hour", "Hangat", "colorbalance=rm=0.12:gm=0.04:bm=-0.14:rh=0.1:bh=-0.1,eq=contrast=1.08:saturation=1.2"),
    "warm_cozy": ("Hangat Cozy", "Hangat", "eq=contrast=1.05:brightness=0.02:saturation=1.1,colorbalance=rs=0.08:gs=0.02:bs=-0.08"),
    "blush": ("Blush", "Hangat", "colorbalance=rm=0.08:bm=0.02:rh=0.05,eq=brightness=0.04:saturation=1.1:contrast=0.98"),
    "autumn": ("Autumn", "Hangat", "colorbalance=rs=0.1:gs=0.04:bs=-0.14:rm=0.08:bm=-0.1,eq=saturation=1.2:contrast=1.1"),
    # Dingin
    "cool": ("Dingin", "Dingin", "colorbalance=rs=-0.06:bs=0.1:rm=-0.04:bm=0.08,eq=saturation=1.05"),
    "cool_blue": ("Biru Dingin", "Dingin", "colorbalance=rs=-0.1:bs=0.16:rh=-0.06:bh=0.1,eq=contrast=1.08:saturation=1.1"),
    "winter": ("Winter", "Dingin", "colorbalance=rm=-0.05:bm=0.1:bh=0.06,eq=brightness=0.04:saturation=0.85:contrast=1.05"),
    "aquamarine": ("Aquamarine", "Dingin", "colorbalance=rm=-0.1:gm=0.05:bm=0.1,eq=saturation=1.2:brightness=0.02"),
    "mint_haze": ("Mint Haze", "Dingin", "colorbalance=rm=-0.04:gm=0.06:bm=0.02,eq=brightness=0.05:saturation=0.9:contrast=0.95"),
    # Sinematik
    "teal_orange": ("Teal & Orange", "Sinematik", "colorbalance=rs=-0.12:gs=0.02:bs=0.16:rh=0.16:gh=0.04:bh=-0.14,eq=contrast=1.12:saturation=1.1"),
    "moody": ("Moody", "Sinematik", "eq=contrast=1.2:brightness=-0.03:saturation=0.85,colorbalance=rs=-0.05:bs=0.1"),
    "moody_cinematic": ("Moody Sinematik", "Sinematik", "eq=contrast=1.2:brightness=-0.03:saturation=0.85,colorbalance=rs=-0.05:bs=0.1"),
    "matte": ("Matte", "Sinematik", "curves=all='0/0.08 1/0.94',eq=saturation=0.9:contrast=1.05"),
    "bleach_bypass": ("Bleach Bypass", "Sinematik", "eq=contrast=1.35:saturation=0.6:brightness=-0.02"),
    "night": ("Malam", "Sinematik", "eq=brightness=-0.06:contrast=1.15:saturation=0.9,colorbalance=bs=0.1:bm=0.08"),
    # Retro
    "vintage": ("Vintage", "Retro", "eq=contrast=0.95:saturation=0.8,colorbalance=rs=0.08:gs=0.03:bs=-0.1"),
    "retro_70s": ("Retro 70an", "Retro", "colorbalance=rs=0.1:gs=0.03:bs=-0.12:rh=0.06,eq=saturation=0.9:contrast=0.95,curves=all='0/0.06 1/0.95'"),
    "film": ("Film", "Retro", "eq=contrast=1.08:saturation=0.92,curves=all='0/0.04 0.5/0.5 1/0.96',noise=alls=6:allf=t"),
    "instant_print": ("Instant Print", "Retro", "colorbalance=rs=0.06:bs=-0.06,eq=contrast=1.1:saturation=1.05:brightness=0.03,curves=all='0/0.07 1/0.95'"),
    "sepia": ("Sepia", "Retro", "colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131"),
    # Hitam putih
    "mono": ("Mono", "Hitam putih", "hue=s=0,eq=contrast=1.1"),
    "hitam_putih": ("Hitam Putih", "Hitam putih", "hue=s=0,eq=contrast=1.1"),
    "noir": ("Noir", "Hitam putih", "hue=s=0,eq=contrast=1.45:brightness=-0.04"),
    "silver": ("Silver", "Hitam putih", "hue=s=0,eq=contrast=0.95:brightness=0.04,curves=all='0/0.05 1/0.98'"),
    # Gaya
    "neon": ("Neon", "Gaya", "eq=contrast=1.25:saturation=1.7,colorbalance=rs=0.05:bs=0.1"),
    "cyberpunk": ("Cyberpunk", "Gaya", "colorbalance=rs=0.1:bs=0.14:gm=-0.04:rh=0.08:bh=0.1,eq=contrast=1.2:saturation=1.4"),
    "dingin_biru": ("Dingin Biru", "Gaya", "colorbalance=rs=-0.06:bs=0.1,eq=saturation=1.05"),
    "tajam_segar": ("Tajam Segar", "Gaya", "eq=contrast=1.1:saturation=1.15,unsharp=5:5:0.8:5:5:0"),
}

# Preset lama (nama dipakai config.py) tetap dikenali
FILTER_ALIASES = {"clean_minimal": "clean"}
FILTERS["clean_minimal"] = ("Bersih Minimal", "Sehari-hari", FILTERS["clean"][2])

# ---------------------------------------------------------- Adjustment
# key -> (label, min, max, default)
ADJUSTMENTS = {
    "temperature": ("Suhu warna", -1.0, 1.0, 0.0),
    "tint": ("Tint (hijau - magenta)", -1.0, 1.0, 0.0),
    "saturation": ("Saturasi", 0.0, 2.0, 1.0),
    "exposure": ("Exposure", -1.0, 1.0, 0.0),
    "brightness": ("Kecerahan", -0.4, 0.4, 0.0),
    "contrast": ("Kontras", 0.6, 1.6, 1.0),
    "highlights": ("Highlights", -0.3, 0.3, 0.0),
    "shadows": ("Shadows", -0.3, 0.3, 0.0),
    "whites": ("Whites", -0.2, 0.2, 0.0),
    "blacks": ("Blacks", -0.2, 0.2, 0.0),
    "sharpness": ("Ketajaman", 0.0, 2.0, 0.0),
    "fade": ("Fade (matte)", 0.0, 1.0, 0.0),
    "vignette": ("Vinyet", 0.0, 1.0, 0.0),
    "grain": ("Grain film", 0.0, 1.0, 0.0),
}
DEFAULT_ADJUST = {k: v[3] for k, v in ADJUSTMENTS.items()}

# ---------------------------------------------------------- Preset teks
# key -> (label, gaya). Gaya menimpa DEFAULT_TEXT_STYLE. Font harus ada di FONT_OPTIONS config.
TEXT_PRESETS = {
    "bold_caption": ("Bold Caption", {"font_name": "Arial Black", "size_pct": 3.8, "text_hex": "FFFFFF", "outline_hex": "000000",
                                      "position": "bottom", "offset_pct": 18, "bold": True, "box": False}),
    "judul_atas": ("Judul Atas", {"font_name": "Arial Black", "size_pct": 3.6, "text_hex": "FFFFFF", "outline_hex": "000000",
                                  "position": "top", "offset_pct": 25, "bold": True, "box": False}),
    "block_kuning": ("Block Kuning", {"font_name": "Arial Black", "size_pct": 3.6, "text_hex": "000000", "outline_hex": "000000",
                                      "position": "bottom", "offset_pct": 20, "bold": True, "box": True, "box_hex": "FFE600"}),
    "block_hitam": ("Block Hitam", {"font_name": "Arial", "size_pct": 3.4, "text_hex": "FFFFFF", "outline_hex": "000000",
                                    "position": "bottom", "offset_pct": 20, "bold": True, "box": True, "box_hex": "000000"}),
    "lower_third": ("Lower Third", {"font_name": "Arial", "size_pct": 3.0, "text_hex": "FFFFFF", "outline_hex": "000000",
                                    "position": "bottom", "offset_pct": 12, "bold": True, "box": True, "box_hex": "111111"}),
    "impact": ("Impact", {"font_name": "Impact", "size_pct": 5.0, "text_hex": "FFFFFF", "outline_hex": "000000",
                          "position": "middle", "offset_pct": 0, "bold": False, "box": False, "uppercase": True}),
    "komik": ("Komik", {"font_name": "Bangers", "size_pct": 5.0, "text_hex": "FFE600", "outline_hex": "000000",
                        "position": "top", "offset_pct": 22, "bold": False, "box": False, "uppercase": True}),
    "kartun": ("Kartun", {"font_name": "Luckiest Guy", "size_pct": 4.6, "text_hex": "FFFFFF", "outline_hex": "FF5A00",
                          "position": "top", "offset_pct": 22, "bold": False, "box": False}),
    "bubble": ("Bubble", {"font_name": "Fredoka", "size_pct": 4.0, "text_hex": "FFFFFF", "outline_hex": "FF4D94",
                          "position": "bottom", "offset_pct": 20, "bold": True, "box": False}),
    "candy": ("Candy", {"font_name": "Chewy", "size_pct": 4.4, "text_hex": "FF69B4", "outline_hex": "FFFFFF",
                        "position": "top", "offset_pct": 24, "bold": False, "box": False}),
    "tulisan_tangan": ("Tulisan Tangan", {"font_name": "Permanent Marker", "size_pct": 4.0, "text_hex": "FFFFFF", "outline_hex": "000000",
                                          "position": "bottom", "offset_pct": 22, "bold": False, "box": False}),
    "editorial": ("Editorial", {"font_name": "Georgia", "size_pct": 3.6, "text_hex": "FFFFFF", "outline_hex": "000000",
                                "position": "bottom", "offset_pct": 20, "bold": True, "box": False}),
    "clean": ("Clean", {"font_name": "Arial", "size_pct": 3.2, "text_hex": "FFFFFF", "outline_hex": "000000",
                        "position": "bottom", "offset_pct": 16, "bold": False, "box": False}),
    "tengah_besar": ("Tengah Besar", {"font_name": "Arial Black", "size_pct": 5.2, "text_hex": "FFFFFF", "outline_hex": "000000",
                                      "position": "middle", "offset_pct": 0, "bold": True, "box": False, "uppercase": True}),
    "neon_pink": ("Neon Pink", {"font_name": "Arial Black", "size_pct": 3.8, "text_hex": "FFFFFF", "outline_hex": "FF00AA",
                                "position": "top", "offset_pct": 24, "bold": True, "box": False}),
}

DEFAULT_TEXT_STYLE = {
    "font_name": "Arial Black",
    "size_pct": 3.6,
    "text_hex": "FFFFFF",
    "outline_hex": "000000",
    "position": "top",
    "offset_pct": 25.0,
    "bold": True,
    "box": False,
    "box_hex": "000000",
    "uppercase": False,
    "animate": True,
}


def labels(table: dict) -> dict:
    """key -> label"""
    return {k: v[0] for k, v in table.items()}


def categories(table: dict) -> list:
    seen = []
    for v in table.values():
        c = v[1] if isinstance(v[1], str) else None
        if c and c not in seen:
            seen.append(c)
    return seen
