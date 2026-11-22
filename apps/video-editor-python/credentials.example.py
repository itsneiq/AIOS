# Salin file ini jadi `credentials.py` lalu isi key asli.
# credentials.py sudah di-.gitignore, JANGAN pernah dikirim ke siapa pun atau di-commit.

# WAJIB: key Gemini (gratis) dari https://aistudio.google.com/apikey
# Boleh lebih dari satu: ["key1", "key2"]. Kalau satu kena limit, aplikasi pindah ke berikutnya.
GEMINI_API_KEYS = ["isi-gemini-api-key-disini"]

# OPSIONAL: hanya untuk suara Azure (Ardi, Gadis, Ava). Tidak punya? Biarkan saja seperti ini,
# lalu pilih suara Gemini di aplikasi.
AZURE_SPEECH_KEY = "isi-azure-speech-key-disini"
AZURE_SPEECH_REGION = "southeastasia"
