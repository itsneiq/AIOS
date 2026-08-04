"use strict";

/*
 * Penilaian tambahan khusus hook iklan.
 *
 * `hook-optimizer.js` mengukur hal yang mekanis: panjang kata, ada angka, ada
 * kata kunci produk. Itu berguna tetapi buta terhadap satu hal yang paling
 * menentukan di feed — apakah kalimatnya membuat orang berhenti menggulir.
 *
 * Modul ini menambahkan sinyal retoris di atas skor dasar tersebut. Bobotnya
 * dikalibrasi terhadap contoh nyata: hook bernada artikel ("Ini alasan kenapa
 * X banyak dicari") mendapat skor dasar setinggi hook bertegangan ("Wajah
 * kusam padahal sudah pakai banyak lapis skincare?"), padahal yang kedua jauh
 * lebih kuat sebagai iklan.
 */

const SIGNALS = Object.freeze([
  Object.freeze({
    id: "tension",
    weight: 12,
    label: "Kontras",
    // Kata yang membuka jarak antara harapan dan kenyataan. Ini pendorong
    // rasa penasaran paling kuat dan paling sering muncul di hook yang menang.
    pattern: /\b(padahal|ternyata|justru|malah|bukannya|sia-sia|percuma)\b/i
  }),
  Object.freeze({
    id: "transformation",
    weight: 10,
    label: "Perubahan",
    // Format before-after. Untuk skincare ini yang paling terbukti.
    //
    // "sebelum" sengaja tidak dihitung sendirian: dalam bahasa Indonesia kata
    // itu lebih sering menandai waktu ("sebelum berangkat kerja") daripada
    // perubahan keadaan. Perubahan yang sesungguhnya hampir selalu membawa
    // pasangannya atau kata hasil.
    pattern: /\b(sesudah|setelah\s+\w+\s+(hari|minggu|bulan|pakai|pemakaian)|dulu|sekarang|berubah|bedanya|hasilnya|sebelum\s+(dan|vs)\s+(sesudah|setelah))\b/i
  }),
  Object.freeze({
    id: "stakes",
    weight: 8,
    label: "Risiko",
    pattern: /\b(jangan|sayang|rugi|salah|buang|keburu|kelewat)\b/i
  }),
  Object.freeze({
    id: "effortless",
    weight: 6,
    label: "Ringan",
    pattern: /\b(cuma|tinggal|gak perlu|nggak perlu|tanpa ribet|sekali)\b/i
  }),
  Object.freeze({
    id: "sensory",
    weight: 6,
    label: "Konkret",
    // Detail fisik yang bisa dibayangkan: "tiga tetes", "botol mungil 20ml".
    // Bilangan ditulis sebagai angka maupun kata, karena model kerap memilih
    // bentuk kata ("tiga tetes") yang justru terdengar lebih alami diucapkan.
    pattern: /\b((\d+|satu|dua|tiga|empat|lima|enam|tujuh|delapan|sembilan|sepuluh)\s*(tetes|ml|gram|detik|menit|hari|minggu|kali|lapis)|setetes|sekali usap|mungil|tipis|lengket)\b/i
  }),
  Object.freeze({
    id: "value_contrast",
    weight: 10,
    label: "Nilai",
    // Kesenjangan tampilan dan harga. Pola persuasi paling kuat di fashion
    // affiliate: barangnya terlihat mahal, ternyata terjangkau.
    pattern: /\b(kayak mahal|keliatan mahal|kelihatan mahal|gak nyangka harga|nggak nyangka harga|semurah|murah tapi|terjangkau tapi|harga segini)\b/i
  }),
  Object.freeze({
    id: "wearability",
    weight: 6,
    label: "Nyaman",
    // Keberatan yang paling sering muncul sebelum orang membeli pakaian.
    // Menjawabnya di hook menghapus alasan untuk menggulir lewat.
    pattern: /\b(adem|nerawang|gerah|melar|gak panas|nggak panas|seharian|gak sesak|nggak sesak|jatuhnya)\b/i
  }),
  Object.freeze({
    id: "expository",
    weight: -15,
    label: "Bernada artikel",
    // Pembuka informatif membaca seperti judul blog, bukan iklan.
    pattern: /^\s*(ini alasan|inilah|berikut|ini dia|alasan kenapa|ini kenapa|fakta)/i
  }),
  Object.freeze({
    id: "third_person",
    weight: -10,
    label: "Jarak",
    // Bicara tentang sekelompok orang, bukan kepada penonton.
    pattern: /\b(banyak (yang |orang|dicari)|para |pecinta |kaum |kebanyakan orang)\b/i
  })
]);

const MAX_SCORE = 100;

function detectSignals(hook) {
  const text = String(hook || "").trim();
  if (!text) return [];
  return SIGNALS.filter(signal => signal.pattern.test(text))
    .map(signal => ({ id: signal.id, label: signal.label, weight: signal.weight }));
}

/*
 * Skor akhir tetap berpijak pada skor dasar agar batas panjang kata dan
 * relevansi produk tidak hilang; sinyal retoris hanya menggeser peringkat.
 */
function scoreAdHook(hook, { baseScore = 0 } = {}) {
  const signals = detectSignals(hook);
  const adjustment = signals.reduce((total, signal) => total + signal.weight, 0);
  const score = Math.max(0, Math.min(MAX_SCORE, Number(baseScore) + adjustment));
  return {
    score: Number(score.toFixed(2)),
    adjustment,
    signals,
    strengths: signals.filter(signal => signal.weight > 0).map(signal => signal.label),
    weaknesses: signals.filter(signal => signal.weight < 0).map(signal => signal.label)
  };
}

/*
 * Dipakai untuk mengarahkan model sejak awal. Menyaring setelah copy jadi jauh
 * lebih mahal daripada meminta bentuk yang benar sejak permintaan pertama.
 */
function qualityPromptRules() {
  return [
    "- Bangun kontras. Kata seperti \"padahal\", \"ternyata\", atau \"justru\" membuka jarak antara harapan dan kenyataan, dan itu yang menghentikan jempol.",
    "- Bicara langsung ke penonton. Hindari \"banyak orang\", \"para\", atau \"pecinta X\" yang membuat kalimat terasa berjarak.",
    "- Jangan membuka seperti artikel. \"Ini alasan kenapa...\", \"Berikut...\", dan \"Inilah...\" terbaca sebagai judul blog, bukan iklan.",
    "- Pakai detail fisik yang bisa dibayangkan: jumlah tetes, ukuran botol, tekstur, waktu pemakaian.",
    "- Untuk produk perawatan, tunjukkan perubahan sebelum dan sesudah bila masuk akal. Format ini paling terbukti di kategori skincare.",
    "- Untuk pakaian, jawab keberatan yang muncul sebelum orang membeli: apakah adem, nerawang, gerah, atau jatuhnya bagus. Boleh juga mengangkat kesenjangan antara tampilan mahal dan harga terjangkau."
  ].join("\n");
}

module.exports = { MAX_SCORE, SIGNALS, detectSignals, qualityPromptRules, scoreAdHook };
