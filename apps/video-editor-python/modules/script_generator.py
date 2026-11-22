# modules/script_generator.py
import google.generativeai as genai
from config import GEMINI_API_KEYS


def generate_vo_script(product_description: str, duration_seconds: float) -> str:
    """
    Generate naskah VO pake Gemini API.
    Otomatis coba API key berikutnya kalau key yang aktif kena limit.
    """
    target_words = int(duration_seconds * 2.5)

    prompt = f"""Kamu adalah copywriter iklan profesional.
Buatkan naskah voice over (VO) untuk video produk berikut, dalam Bahasa Indonesia yang natural, persuasif, dan enak didengar (bukan kaku seperti robot).

Deskripsi produk:
{product_description}

Ketentuan:
- Panjang naskah harus sekitar {target_words} kata
- Gaya bahasa: menjual, energik, tapi tetap natural
- Jangan pakai tanda baca aneh atau emoji
- Langsung tulis naskahnya saja, tanpa embel-embel penjelasan

Naskah VO:"""

    last_error = None
    for i, api_key in enumerate(GEMINI_API_KEYS):
        try:
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel("gemini-2.5-flash")
            response = model.generate_content(prompt)
            print(f"[INFO] Berhasil pake API key #{i + 1}")
            return response.text.strip()

        except Exception as e:
            error_msg = str(e)
            if "429" in error_msg or "quota" in error_msg.lower():
                print(f"[WARNING] API key #{i + 1} kena limit, coba key berikutnya...")
                last_error = e
                continue
            else:
                # Error lain (bukan soal limit), langsung raise
                raise e

    raise Exception(f"Semua API key kena limit. Error terakhir: {last_error}")
