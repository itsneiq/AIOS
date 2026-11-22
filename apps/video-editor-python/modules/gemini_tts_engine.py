# modules/gemini_tts_engine.py
import base64
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
    for i, api_key in enumerate(GEMINI_API_KEYS):
        headers = {"x-goog-api-key": api_key, "Content-Type": "application/json"}

        try:
            response = requests.post(url, headers=headers, json=payload)

            if response.status_code == 429:
                print(f"[WARNING] Gemini API key #{i + 1} kena limit, coba key berikutnya...")
                last_error = response.text
                continue

            if response.status_code != 200:
                raise Exception(f"Gemini TTS gagal (status {response.status_code}): {response.text}")

            data = response.json()
            audio_b64 = data["candidates"][0]["content"]["parts"][0]["inlineData"]["data"]
            pcm_data = base64.b64decode(audio_b64)

            _save_wav(pcm_data, output_path)
            print(f"[INFO] Audio VO (Gemini - {voice_name}) tersimpan di: {output_path}")
            return output_path

        except Exception as e:
            if "429" in str(e) or "quota" in str(e).lower():
                last_error = e
                continue
            raise e

    raise Exception(f"Semua API key Gemini kena limit/gagal buat TTS. Error terakhir: {last_error}")
