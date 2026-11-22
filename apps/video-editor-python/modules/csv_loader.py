# modules/csv_loader.py
import pandas as pd

VALID_MEDIA_EXT = (".mp4", ".mov", ".avi", ".mkv", ".jpg", ".jpeg", ".png")
MEDIA_COLUMNS = ["media_1", "media_2", "media_3", "media_4", "media_5", "media_6"]


def load_product_list(excel_path: str) -> list[dict]:
    """
    Baca file Excel (.xlsx) berisi daftar produk, return list of dict per baris.

    Karena ini Excel asli (bukan CSV/teks), tiap kolom udah otomatis
    kepisah sendiri - kolom 'deskripsi' bebas diisi koma, titik, apapun,
    nggak perlu delimiter atau tanda kutip khusus sama sekali.

    Struktur kolom yang dipakai (nama kolom di baris pertama Excel):
    judul_produk | deskripsi | media_1 | media_2 | media_3 | media_4 | media_5 | media_6 | nama_output
    """
    df = pd.read_excel(excel_path)

    required_cols = {"judul_produk", "deskripsi", "nama_output"}
    if not required_cols.issubset(df.columns):
        raise ValueError(f"Excel harus punya kolom: {required_cols} (+ media_1 s/d media_6)")

    available_media_cols = [c for c in MEDIA_COLUMNS if c in df.columns]
    if not available_media_cols:
        raise ValueError("Excel harus punya minimal 1 kolom media (media_1, media_2, dst)")

    df = df.dropna(subset=["judul_produk", "deskripsi", "nama_output"], how="any")

    products = []
    for idx, row in df.iterrows():
        baris_ke = idx + 2

        judul = str(row["judul_produk"]).strip()
        deskripsi = str(row["deskripsi"]).strip()
        nama_output = str(row["nama_output"]).strip()

        if not judul or not deskripsi or not nama_output or judul == "nan" or deskripsi == "nan":
            print(f"[WARNING] Baris {baris_ke} di Excel di-skip (ada kolom wajib kosong).")
            continue

        if not nama_output.lower().endswith((".mp4", ".mov", ".avi", ".mkv")):
            print(
                f"[WARNING] Baris {baris_ke} di Excel di-skip: kolom 'nama_output' isinya "
                f"'{nama_output}' (harus akhiran .mp4 dst). Produk: '{judul}'."
            )
            continue

        media_paths = []
        for col in available_media_cols:
            val = row.get(col)
            if pd.isna(val):
                continue
            val = str(val).strip()
            if val and val.lower() != "nan":
                media_paths.append(val)

        if not media_paths:
            print(f"[WARNING] Baris {baris_ke} di Excel di-skip: nggak ada media. Produk: '{judul}'.")
            continue

        if not all(p.lower().endswith(VALID_MEDIA_EXT) for p in media_paths):
            print(
                f"[WARNING] Baris {baris_ke} di Excel di-skip: ada isi kolom media yang bukan "
                f"file video/foto valid: {media_paths}. Produk: '{judul}'."
            )
            continue

        is_photo_set = all(p.lower().endswith((".jpg", ".jpeg", ".png")) for p in media_paths)

        products.append({
            "judul": judul,
            "deskripsi": deskripsi,
            "media_paths": media_paths,
            "media_type": "photo" if is_photo_set else "video",
            "nama_output": nama_output,
        })
    return products
