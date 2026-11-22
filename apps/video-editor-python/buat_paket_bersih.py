# buat_paket_bersih.py
# JALANIN INI DARI DALAM FOLDER PROJECT (video_editor_ai).
# Script ini BIKIN SALINAN BARU folder project yang udah dibersihin
# (nggak ngubah/ngehapus apapun di folder asli lu), lengkap jadi 1 file .zip
# yang siap dikirim ke orang lain.
import os
import shutil
import zipfile

SOURCE_DIR = "."
DEST_DIR = "video_editor_ai_CLEAN"
ZIP_NAME = "video_editor_ai_CLEAN.zip"

# Folder yang di-skip total (nggak ikut ke-copy)
EXCLUDE_DIRS = {
    "venv", "__pycache__", ".git", ".idea", ".vscode",
    "_tmp", "subtitle_previews", "voice_samples",
    "video_editor_ai_CLEAN",  # biar nggak nyalin dirinya sendiri kalau dijalanin 2x
}

# File yang di-skip total (bukan folder)
EXCLUDE_FILES_EXACT = {
    "main.py",              # versi lama, udah digantiin gui_app.py/batch_process.py
    "test_nvenc.mp4",       # hasil testing NVENC
    "buat_paket_bersih.py", # script ini sendiri nggak usah ikut ke-copy
}

# File yang di-skip kalau namanya DIAWALI ini
EXCLUDE_PREFIX = ("test_",)

# Extension file yang di-skip di dalam folder input/ (asumsi ini file testing)
# Kalau lu punya file PRODUK ASLI di sini yang mau dipertahanin, edit baris ini
# atau pindahin dulu manual sebelum jalanin script.
CLEAN_INPUT_FOLDER = True


def should_skip_dir(dirname: str) -> bool:
    return dirname in EXCLUDE_DIRS


def should_skip_file(filepath: str, filename: str) -> bool:
    if filename in EXCLUDE_FILES_EXACT:
        return True
    if filename.startswith(EXCLUDE_PREFIX) and filename.endswith(".py"):
        return True
    return False


def copy_clean():
    if os.path.exists(DEST_DIR):
        print(f"Folder '{DEST_DIR}' udah ada, dihapus dulu...")
        shutil.rmtree(DEST_DIR)

    os.makedirs(DEST_DIR)

    for root, dirs, files in os.walk(SOURCE_DIR):
        # Filter folder yang di-skip (biar os.walk nggak masuk ke dalamnya)
        dirs[:] = [d for d in dirs if not should_skip_dir(d)]

        rel_root = os.path.relpath(root, SOURCE_DIR)
        dest_root = os.path.join(DEST_DIR, rel_root) if rel_root != "." else DEST_DIR

        # Skip isi folder input/ (file testing), tapi tetap bikin foldernya kosong
        if CLEAN_INPUT_FOLDER and rel_root == "input":
            os.makedirs(dest_root, exist_ok=True)
            with open(os.path.join(dest_root, ".gitkeep"), "w") as f:
                f.write("")
            continue
        if CLEAN_INPUT_FOLDER and rel_root.startswith("input" + os.sep):
            continue  # skip subfolder di dalam input/ juga

        # Skip isi folder output/ (hasil render), tapi tetap bikin foldernya kosong
        if rel_root == "output" or rel_root.startswith("output" + os.sep):
            if rel_root == "output":
                os.makedirs(dest_root, exist_ok=True)
                with open(os.path.join(dest_root, ".gitkeep"), "w") as f:
                    f.write("")
            continue

        os.makedirs(dest_root, exist_ok=True)

        for filename in files:
            src_file = os.path.join(root, filename)
            if should_skip_file(src_file, filename):
                continue

            if filename == "credentials.py":
                # Jangan copy API key asli - bikin versi kosong (placeholder) aja
                dest_file = os.path.join(dest_root, filename)
                with open(dest_file, "w", encoding="utf-8") as f:
                    f.write(
                        "# credentials.py\n"
                        "# Isi API key kamu sendiri di sini sebelum menjalankan software.\n\n"
                        'GEMINI_API_KEYS = [\n    "isi-api-key-gemini-disini",\n]\n\n'
                        'AZURE_SPEECH_KEY = "isi-azure-speech-key-disini"\n'
                        'AZURE_SPEECH_REGION = "southeastasia"\n'
                    )
                print(f"  [SANITIZED] {os.path.join(rel_root, filename)} -> API key dikosongkan")
                continue

            dest_file = os.path.join(dest_root, filename)
            shutil.copy2(src_file, dest_file)

    print(f"\nSelesai! Folder bersih ada di: {DEST_DIR}/")


def zip_clean():
    if os.path.exists(ZIP_NAME):
        os.remove(ZIP_NAME)

    with zipfile.ZipFile(ZIP_NAME, "w", zipfile.ZIP_DEFLATED) as zf:
        for root, dirs, files in os.walk(DEST_DIR):
            for filename in files:
                filepath = os.path.join(root, filename)
                arcname = os.path.relpath(filepath, ".")
                zf.write(filepath, arcname)

    size_mb = os.path.getsize(ZIP_NAME) / (1024 * 1024)
    print(f"File zip siap: {ZIP_NAME} ({size_mb:.1f} MB)")


if __name__ == "__main__":
    print("Membuat salinan project yang bersih...\n")
    copy_clean()
    print("\nMembuat file .zip...")
    zip_clean()
    print("\n=== SELESAI ===")
    print(f"Kirim file '{ZIP_NAME}' ke orang lain.")
    print("Ingat: mereka tetap perlu jalanin 'pip install -r requirements.txt'")
    print("dan isi 'credentials.py' mereka sendiri sebelum bisa pakai.")
