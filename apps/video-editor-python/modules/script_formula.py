# modules/script_formula.py
"""
Modul buat nyusun naskah VO berdasarkan FORMULA copywriting.
Dipakai di Mode Manual (1 produk), bukan Mode Batch.

Dua cara pakai:
1. TEKS FINAL (teks_final=True)  -> kotak berisi teks jadi, tinggal digabung apa adanya.
                                    Nggak butuh judul/deskripsi produk.
2. INSTRUKSI  (teks_final=False) -> kotak berisi instruksi buat AI (boleh dikosongin
                                    sebagian). Butuh judul + deskripsi produk sebagai konteks.
                                    Kotak yang diisi -> AI ngikutin instruksi itu.
                                    Kotak yang kosong -> AI nyusun sendiri sesuai peran bagian.
"""
import google.generativeai as genai
from config import GEMINI_API_KEYS

# ============================================
# DEFINISI FORMULA
# ============================================
FORMULAS = {
    "hook_benefit_cta": {
        "label": "Hook - Benefit - CTA (simpel, cocok video pendek)",
        "parts": [
            {"key": "hook",    "label": "Hook",    "role": "kalimat pembuka yang langsung menarik perhatian dalam 1-3 detik pertama, bisa berupa pertanyaan atau pernyataan yang relate dengan masalah penonton"},
            {"key": "benefit", "label": "Benefit", "role": "manfaat atau keunggulan utama produk yang menjawab kebutuhan penonton"},
            {"key": "cta",     "label": "CTA",     "role": "ajakan bertindak yang jelas dan mendesak, misalnya mengajak checkout atau beli sekarang"},
        ],
    },
    "pas": {
        "label": "PAS: Problem - Agitate - Solution (fokus masalah & urgency)",
        "parts": [
            {"key": "problem", "label": "Problem",  "role": "menyebutkan masalah yang sedang dialami penonton secara spesifik dan relate"},
            {"key": "agitate", "label": "Agitate",  "role": "memperdalam rasa tidak nyaman dari masalah tersebut, membuat penonton merasa 'ini gue banget'"},
            {"key": "solution","label": "Solution", "role": "memperkenalkan produk sebagai solusi yang menjawab masalah tadi"},
        ],
    },
    "aida": {
        "label": "AIDA: Attention - Interest - Desire - Action (lengkap, video agak panjang)",
        "parts": [
            {"key": "attention", "label": "Attention", "role": "menarik perhatian penonton di detik pertama agar berhenti scroll"},
            {"key": "interest",  "label": "Interest",  "role": "membangun rasa penasaran dan ketertarikan terhadap produk"},
            {"key": "desire",    "label": "Desire",    "role": "membangun keinginan untuk memiliki produk, menyentuh sisi emosional bukan sekadar fitur"},
            {"key": "action",    "label": "Action",    "role": "ajakan bertindak yang jelas dan mendesak"},
        ],
    },
}


def get_formula_parts(formula_key: str) -> list:
    """Ambil daftar bagian dari sebuah formula (buat bikin kotak input di GUI)."""
    formula = FORMULAS.get(formula_key)
    if not formula:
        raise ValueError(f"Formula '{formula_key}' nggak dikenal. Pilihan: {list(FORMULAS.keys())}")
    return formula["parts"]


def build_script_from_final_text(formula_key: str, part_texts: dict) -> str:
    """
    MODE TEKS FINAL: gabungin teks yang user tulis apa adanya, sesuai urutan formula.
    part_texts: dict {part_key: teks}, misal {"hook": "Kulit kusam bikin gak pede?", ...}
    """
    parts = get_formula_parts(formula_key)
    kalimat = []

    for p in parts:
        teks = (part_texts.get(p["key"]) or "").strip()
        if teks:
            kalimat.append(teks)

    if not kalimat:
        raise ValueError("Semua kotak teks final kosong. Isi minimal satu bagian.")

    naskah = " ".join(kalimat)
    print(f"[INFO] Naskah disusun dari teks final ({len(kalimat)} bagian terisi).")
    return naskah


def _call_gemini(prompt: str) -> str:
    """Panggil Gemini dengan rotasi API key kalau kena limit."""
    last_error = None
    for i, api_key in enumerate(GEMINI_API_KEYS):
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            print(f"[INFO] Naskah digenerate pakai API key #{i + 1}")
            return response.text.strip()
        except Exception as e:
            msg = str(e)
            if "429" in msg or "quota" in msg.lower():
                print(f"[WARNING] API key #{i + 1} kena limit, coba key berikutnya...")
                last_error = e
                continue
            raise e

    raise Exception(f"Semua API key kena limit. Error terakhir: {last_error}")


def build_script_from_instructions(
    formula_key: str,
    part_instructions: dict,
    judul_produk: str,
    deskripsi_produk: str,
    duration_seconds: float = 20,
) -> str:
    """
    MODE INSTRUKSI: AI nyusun naskah berdasarkan formula.
    - Bagian yang ADA instruksinya -> AI wajib ngikutin instruksi itu.
    - Bagian yang KOSONG           -> AI nyusun sendiri sesuai peran bagian tersebut.
    """
    parts = get_formula_parts(formula_key)
    formula_label = FORMULAS[formula_key]["label"]
    target_words = int(duration_seconds * 2.5)

    bagian_lines = []
    for idx, p in enumerate(parts, start=1):
        instruksi = (part_instructions.get(p["key"]) or "").strip()
        if instruksi:
            bagian_lines.append(
                f"{idx}. {p['label']} ({p['role']})\n"
                f"   INSTRUKSI WAJIB DIIKUTI: {instruksi}"
            )
        else:
            bagian_lines.append(
                f"{idx}. {p['label']} ({p['role']})\n"
                f"   Tidak ada instruksi khusus - susun sendiri yang paling pas untuk produk ini."
            )

    bagian_text = "\n".join(bagian_lines)

    prompt = f"""Kamu adalah copywriter iklan profesional untuk konten video pendek (TikTok/Reels/Shorts).

Buatkan naskah voice over (VO) dalam Bahasa Indonesia yang natural, persuasif, dan enak didengar.

PRODUK:
Judul: {judul_produk}
Deskripsi: {deskripsi_produk}

FORMULA YANG DIPAKAI: {formula_label}

Susun naskah mengikuti urutan bagian berikut:
{bagian_text}

KETENTUAN:
- Total panjang naskah sekitar {target_words} kata (untuk durasi sekitar {duration_seconds:.0f} detik)
- Tulis sebagai SATU naskah utuh yang mengalir natural, JANGAN pakai label/judul bagian
- Jangan pakai tanda baca aneh, emoji, atau simbol
- Gaya bahasa: menjual, energik, tapi tetap terdengar manusiawi
- Langsung tulis naskahnya saja, tanpa penjelasan atau pembuka apa pun

Naskah VO:"""

    print(f"[INFO] Generate naskah pakai formula: {formula_label}")
    return _call_gemini(prompt)


def build_manual_script(
    formula_key: str,
    part_values: dict,
    teks_final: bool,
    judul_produk: str = "",
    deskripsi_produk: str = "",
    duration_seconds: float = 20,
) -> str:
    """
    Fungsi utama yang dipanggil dari luar (Mode Manual).
    Otomatis milih jalur sesuai toggle teks_final.
    """
    if teks_final:
        return build_script_from_final_text(formula_key, part_values)

    if not judul_produk.strip() or not deskripsi_produk.strip():
        raise ValueError(
            "Mode instruksi butuh Judul dan Deskripsi produk diisi "
            "(supaya AI punya konteks produknya)."
        )

    return build_script_from_instructions(
        formula_key, part_values, judul_produk, deskripsi_produk, duration_seconds
    )
