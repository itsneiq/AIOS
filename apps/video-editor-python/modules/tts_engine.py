# modules/tts_engine.py
import re
import azure.cognitiveservices.speech as speechsdk
from config import AZURE_SPEECH_KEY, AZURE_SPEECH_REGION


def _build_ssml(text: str, voice_name: str) -> str:
    """
    Ubah naskah polos jadi SSML dengan jeda natural antar kalimat,
    supaya hasil TTS nggak kedengeran monoton/kaku.
    """
    sentences = re.split(r'(?<=[.!?])\s+', text.strip())
    sentences = [s.strip() for s in sentences if s.strip()]

    body = ""
    for s in sentences:
        s_clean = s.replace("&", "and").replace("<", "").replace(">", "")
        body += f'{s_clean}<break time="350ms"/> '

    ssml = f"""
    <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="id-ID">
        <voice name="{voice_name}">
            <prosody rate="0%" pitch="0%">
                {body}
            </prosody>
        </voice>
    </speak>
    """
    return ssml.strip()


def generate_vo_audio(text: str, output_path: str, voice_name: str = "id-ID-ArdiNeural") -> str:
    """
    Convert naskah VO (teks) jadi file audio pake Azure Neural TTS + SSML.
    voice_name: nama suara Azure yang mau dipakai, misal 'id-ID-ArdiNeural'.
    """
    speech_config = speechsdk.SpeechConfig(
        subscription=AZURE_SPEECH_KEY,
        region=AZURE_SPEECH_REGION,
    )

    audio_config = speechsdk.audio.AudioOutputConfig(filename=output_path)
    synthesizer = speechsdk.SpeechSynthesizer(
        speech_config=speech_config,
        audio_config=audio_config,
    )

    ssml = _build_ssml(text, voice_name)
    result = synthesizer.speak_ssml_async(ssml).get()

    if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
        print(f"[INFO] Audio VO ({voice_name}) tersimpan di: {output_path}")
        return output_path

    elif result.reason == speechsdk.ResultReason.Canceled:
        cancellation = result.cancellation_details
        raise Exception(
            f"TTS gagal. Alasan: {cancellation.reason}. "
            f"Detail: {cancellation.error_details}"
        )

    else:
        raise Exception(f"TTS gagal dengan status: {result.reason}")
