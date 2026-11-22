# modules/gemini_tts_engine.py
import base64
import time
import wave
import requests
from config import GEMINI_API_KEYS, GEMINI_TTS_MODEL


def _save_wav(pcm_data: bytes, output_path: str, sample_rate: int = 24000):
    """Bungkus data PCM mentah dari Gemini jadi file .wav yang bisa diputer."""
    with wave.open(output_path, "wb") as wf:
        wf.setnchannels(1)      # mono
        wf.setsampwidth(2)      # 16-bit
        wf.setframerate(sample_rate)
        wf.writeframes(pcm_data)


def generate_gemini_tts_audio(text: str, output_path: str, voice_name: str = "Zephyr") -> str:
    """
    Convert naskah VO jadi audio pake Gemini native TTS.
    Otomatis coba API key berikutnya kalau key yang aktif kena limit.
    """
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_TTS_MODEL}:generateContent"

    payload = {
        "contents": [{"parts": [{"text": text}]}],
        "generationConfig": {
            "responseModalities": ["AUDIO"],
            "speechConfig": {
                "voiceConfig": {
                    "prebuiltVoiceConfig": {"voiceName": voice_name}
                }
            },
        },
    }

    last_error = None
    max_rounds = 4          # berapa kali ngulang semua key kalau kena limit / respons kosong
    wait_seconds = 25       # jeda antar ronde (limit gratisan Gemini TTS itu per menit)

    for round_no in range(1, max_rounds + 1):
        for i, api_key in enumerate(GEMINI_API_KEYS):
            headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

            response = requests.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                print(f"[WARNING] Gemini API key #{i + 1} kena limit, coba key berikutnya...")
                last_error = response.text
                continue

            if response.status_code != 200:
                if response.status_code >= 500:
                    last_error = f"status {response.status_code}: {response.text[:200]}"
                    continue
                raise Exception(f"Gemini TTS gagal (status {response.status_code}): {response.text}")

            data = response.json()
            try:
                audio_b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
            except (KeyError, IndexError, TypeError):
                # Gemini TTS kadang ngasih respons kosong (tanpa audio). Anggap sementara, coba lagi.
                reason = ""
                try:
                    reason = data["candidates"][0].get("finishReason", "")
                except Exception:
                    pass
                print(f"[WARNING] Gemini key #{i + 1} balikin respons tanpa audio ({reason or 'kosong'}), coba lagi...")
                last_error = f"respons tanpa audio ({reason or 'kosong'})"
                continue

            _save_wav(base64.b64decode(audio_b64), output_path)
            print(f"[INFO] Audio VO (Gemini - {voice_name}) tersimpan di: {output_path}")
            return output_path

        if round_no < max_rounds:
            print(f"[INFO] Nunggu {wait_seconds} detik (limit Gemini per menit), lalu ulang "
                  f"(percobaan {round_no + 1}/{max_rounds})...")
            time.sleep(wait_seconds)

    raise Exception(f"Gemini TTS gagal setelah {max_rounds} percobaan. Error terakhir: {last_error}. "
                    f"Coba pakai suara Azure (Ardi/Gadis) yang tidak dibatasi menit, atau tunggu beberapa menit.")
