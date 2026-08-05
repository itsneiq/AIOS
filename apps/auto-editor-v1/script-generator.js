"use strict";

/*
 * Lapisan generatif untuk copy iklan.
 *
 * `script-engine.js` memilih kalimat dari kumpulan template tetap sehingga
 * hasilnya berulang antar produk. Modul ini menggantinya dengan copy yang
 * ditulis model dengan struktur hook - agitate - solve - cta.
 *
 * Bagian "solve" tetap disalin ke "benefit" sebagai alias, karena proyek yang
 * sudah tersimpan memakai nama lama dan harus tetap bisa dirakit.
 *
 * Bila Gemini tidak tersedia, modul jatuh kembali ke template lama agar alat
 * tetap bisa dipakai tanpa API key.
 */

const { PLATFORM_LIMITS } = require("./hook-optimizer");
const { generateScriptSet } = require("./script-engine");
const { policyPromptRules } = require("./policy-filter");
const { qualityPromptRules } = require("./hook-quality");
const { ctaPromptRules, profileFor } = require("./platform-profile");

const ANGLE_BRIEFS = Object.freeze({
  before_after: "Tunjukkan kondisi sebelum dan sesudah pemakaian. Kontraskan keduanya secara jujur tanpa menjanjikan hasil pasti.",
  styling: "Tunjukkan satu produk dipadukan ke beberapa gaya atau kesempatan berbeda. Jawab pertanyaan \"bisa dipakai ke mana saja\".",
  value_reveal: "Angkat kesenjangan antara tampilan produk dan harganya. Terlihat mahal, ternyata terjangkau. Jangan menyebut angka yang tidak kamu ketahui.",
  demo: "Tunjukkan produk sedang dipakai dan hasilnya langsung terlihat.",
  problem_solution: "Buka dengan masalah harian yang relatable, lalu posisikan produk sebagai jalan keluarnya.",
  detail_reveal: "Bangun rasa penasaran pada satu detail produk yang tidak langsung terlihat.",
  lifestyle: "Tempatkan produk di dalam momen sehari-hari yang ingin ditiru penonton.",
  urgency: "Tekankan momentum: promo, stok, atau alasan untuk cek sekarang, tanpa menakut-nakuti."
});

// Kategori tertentu punya format yang terbukti lebih kuat. Sudut ini didorong
// lebih sering muncul, bukan dipaksakan menjadi satu-satunya.
const CATEGORY_PRIORITY_ANGLES = Object.freeze({
  beauty: ["before_after", "problem_solution"],
  fashion: ["styling", "value_reveal", "before_after"],
  kitchen: ["demo", "problem_solution"],
  home: ["demo", "lifestyle"],
  gadget: ["detail_reveal", "demo"]
});

const DEFAULT_COUNT = 12;
const MAX_COUNT = 20;

function clampCount(value) {
  const count = Number(value) || DEFAULT_COUNT;
  return Math.max(1, Math.min(MAX_COUNT, Math.round(count)));
}

function limitsFor(platform) {
  // Profil platform yang memegang batas panjang hook; PLATFORM_LIMITS lama
  // tetap dipakai sebagai cadangan untuk platform yang belum berprofil.
  const profile = profileFor(platform);
  return profile.hook ? { min: profile.hook.minWords, max: profile.hook.maxWords } : (PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.default);
}

function buildScriptPrompt({ product = {}, platform = "tiktok", count = DEFAULT_COUNT, duration = 18, angles = [], extraNotes = "" } = {}) {
  const limits = limitsFor(platform);
  const total = clampCount(count);
  const angleList = (angles.length ? angles : Object.keys(ANGLE_BRIEFS))
    .filter(angle => ANGLE_BRIEFS[angle])
    .map(angle => `- ${angle}: ${ANGLE_BRIEFS[angle]}`)
    .join("\n");
  const priority = CATEGORY_PRIORITY_ANGLES[product.category] || [];
  const priorityNote = priority.length
    ? `\nUntuk kategori ${product.category}, sudut ${priority.join(" dan ")} terbukti paling kuat. Beri porsi lebih besar ke sudut tersebut, tapi tetap sertakan sudut lain sebagai pembanding.`
    : "";

  return `Kamu penulis copy iklan affiliate berbahasa Indonesia untuk ${profileFor(platform).label}.

PRODUK
- Nama: ${product.title || "Produk"}
- Merek: ${product.brand || "-"}
- Kategori: ${product.category || "general"}
- Target: ${product.targetAudience || "Pengguna umum"}
- Atribut: ${(product.attributes || []).join("; ") || "-"}
- Manfaat: ${(product.benefits || []).join("; ") || "-"}
- Kata kunci: ${(product.keywords || []).join(", ") || "-"}

FORMAT VIDEO
- Durasi total ${duration} detik, dibagi empat bagian berurutan: hook, agitate, solve, CTA.
- Ditonton sambil scroll, sering tanpa suara, jadi hook harus berdiri sendiri.

STRUKTUR EMPAT BAGIAN
- hook: hentikan jempol. Satu kalimat, tanpa pengantar, tanpa menyebut merek di depan.
- agitate: buat masalahnya terasa. Sebutkan usaha yang sudah dicoba tapi belum berhasil, atau kerepotan yang sudah dianggap biasa. Bagian inilah yang membuat penonton merasa dibicarakan.
- solve: baru di sini produk masuk sebagai jalan keluar. Sebutkan satu alasan konkret kenapa berbeda, dan jawab keberatan utamanya di sini.
- cta: satu ajakan pendek, sesuai mekanisme platform di bawah.

Tanpa agitate, iklan berubah jadi katalog: penonton diberi tahu produknya bagus tetapi tidak pernah diberi alasan untuk peduli.

SATU VARIAN, SATU PEMBELI
Setiap varian ditujukan ke satu pembeli, bukan ke semua orang. Varian yang berbeda wajib berbeda pembelinya — bukan cuma berbeda susunan kata untuk pembeli yang sama. Pembeli yang berbeda punya hambatan berbeda, keberatan berbeda, dan bahasa berbeda.

KEBERATAN
Yang menahan orang menekan beli hampir tidak pernah kurangnya manfaat, melainkan satu keraguan yang tidak sempat terjawab: bahannya tipis atau tidak, muat atau tidak, hasilnya kelihatan atau tidak, beda atau tidak dari yang lebih murah.

Sebutkan satu keberatan utama per varian, lalu jawab dengan salah satu dari empat cara ini saja:
- bukti yang terlihat di layar;
- fakta yang memang ada di deskripsi produk;
- jawaban kreatif yang tidak mengklaim apa pun;
- risiko yang diakui terus terang.

Menjawab keberatan dengan klaim yang tidak bisa dibuktikan dianggap gagal, dan biasanya juga melanggar kebijakan di bawah.

BUKTI HARUS BISA DIFILMKAN
Alasan yang tidak bisa ditunjukkan bukan alasan, melainkan klaim — dan klaim adalah yang paling tidak dipercaya di iklan affiliate. Untuk setiap varian, sebutkan aksi yang terlihat dan hasil yang terlihat.

Contoh yang benar: "tangan meregangkan kain, lalu dilepas, kembali rapi tanpa bekas".
Contoh yang gagal: "bahannya berkualitas tinggi dan tahan lama".

ATURAN HOOK
- Panjang ${limits.min}-${limits.max} kata. Ini batas keras.
- Tiga detik pertama menentukan semuanya: langsung ke inti, tanpa sapaan dan tanpa nama merek di depan.
- Gunakan bahasa Indonesia sehari-hari yang wajar diucapkan, bukan bahasa iklan formal.
- Boleh spesifik dengan angka bila masuk akal untuk produk ini.

YANG MEMBUAT HOOK BERHENTI DIGULIR
${qualityPromptRules()}

PLATFORM DAN AJAKAN BERTINDAK
${ctaPromptRules(platform)}

ATURAN KEBIJAKAN (wajib dipatuhi)
${policyPromptRules()}

SUDUT PANDANG YANG TERSEDIA
${angleList}${priorityNote}

TUGAS
Tulis ${total} varian yang benar-benar berbeda satu sama lain, tersebar merata ke beberapa sudut pandang di atas, dan sebisa mungkin berbeda pembelinya. Varian yang hanya berbeda susunan kata dianggap gagal.
${extraNotes ? `\nCATATAN TAMBAHAN\n${extraNotes}\n` : ""}
Balas HANYA dengan JSON array, tanpa penjelasan apa pun, dengan bentuk persis:
[
  {
    "angle": "<salah satu id sudut pandang di atas>",
    "buyer": "<satu pembeli spesifik, mis. mahasiswa yang komuternya jauh>",
    "objection": "<satu keraguan yang paling menahan pembeli itu>",
    "objectionAnswer": "<jawabannya, memakai salah satu dari empat cara di atas>",
    "proof": "<aksi yang terlihat dan hasil yang terlihat, dalam satu kalimat>",
    "hook": "<satu kalimat pembuka>",
    "agitate": "<satu kalimat yang membuat masalahnya terasa>",
    "solve": "<satu sampai dua kalimat: produk sebagai jalan keluar, memuat jawaban keberatan>",
    "cta": "<ajakan singkat sesuai mekanisme platform>",
    "visualHint": "<satu kalimat: visual apa yang paling pas untuk bagian hook>"
  }
]`;
}

function cleanLine(value, { maxLength = 240 } = {}) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function normalizeVariants(raw, { count = DEFAULT_COUNT, fallbackAngle = "balanced" } = {}) {
  const list = Array.isArray(raw) ? raw : Array.isArray(raw?.variants) ? raw.variants : [];
  const seen = new Set();
  const variants = [];
  for (const item of list) {
    const hook = cleanLine(item?.hook, { maxLength: 160 });
    if (!hook) continue;
    const key = hook.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const solve = cleanLine(item?.solve || item?.benefit);
    variants.push({
      angle: ANGLE_BRIEFS[item?.angle] ? item.angle : fallbackAngle,
      /*
       * Pembeli, keberatan, dan bukti tidak dipakai menyusun kalimat iklan —
       * itu sudah selesai di naskah. Ketiganya ikut disimpan supaya keputusan
       * di balik varian bisa dibaca ulang saat memilih, dan supaya varian yang
       * pembelinya sama ketahuan sebagai pengulangan. Model lama tidak
       * mengisinya, jadi kosong tetap sah.
       */
      buyer: cleanLine(item?.buyer, { maxLength: 160 }),
      objection: cleanLine(item?.objection, { maxLength: 160 }),
      objectionAnswer: cleanLine(item?.objectionAnswer, { maxLength: 240 }),
      proof: cleanLine(item?.proof, { maxLength: 240 }),
      hook,
      agitate: cleanLine(item?.agitate),
      solve,
      // Proyek lama menyimpan bagian ini sebagai "benefit". Nama itu
      // dipertahankan sebagai alias supaya berkas proyek yang sudah ada tetap
      // bisa dirakit tanpa perlu dibuat ulang.
      benefit: solve,
      cta: cleanLine(item?.cta, { maxLength: 120 }),
      visualHint: cleanLine(item?.visualHint, { maxLength: 200 }),
      source: "gemini"
    });
    if (variants.length >= clampCount(count)) break;
  }
  return variants;
}

/*
 * Template lama dipakai sebagai jaring pengaman, bukan sebagai jalur utama.
 * Hasilnya ditandai source "template" supaya jelas saat ditampilkan ke pengguna.
 */
function fallbackVariants({ product, count = DEFAULT_COUNT, angle = "balanced" } = {}) {
  return generateScriptSet({ count: Math.min(5, clampCount(count)), angle, product, seed: product?.title || "aios" })
    .map(script => ({ ...script, agitate: "", solve: script.benefit, visualHint: "", source: "template" }));
}

async function generateScriptVariants(options = {}, client) {
  const { product = {}, platform = "tiktok", count = DEFAULT_COUNT, duration = 18, angles = [], extraNotes = "", temperature = 1.1 } = options;
  if (!client || typeof client.generateJSON !== "function") {
    return { variants: fallbackVariants({ product, count }), degraded: true, reason: "Klien Gemini tidak tersedia.", usage: null };
  }

  const prompt = buildScriptPrompt({ product, platform, count, duration, angles, extraNotes });
  try {
    const { data, usage, model } = await client.generateJSON(prompt, { temperature });
    const variants = normalizeVariants(data, { count });
    if (!variants.length) {
      return { variants: fallbackVariants({ product, count }), degraded: true, reason: "Gemini tidak mengembalikan varian yang bisa dipakai.", usage };
    }
    return { variants, degraded: false, reason: "", usage, model };
  } catch (error) {
    return {
      variants: fallbackVariants({ product, count }),
      degraded: true,
      reason: error.diagnostic?.message || error.message,
      diagnostic: error.diagnostic || null,
      usage: null
    };
  }
}

module.exports = {
  ANGLE_BRIEFS,
  CATEGORY_PRIORITY_ANGLES,
  DEFAULT_COUNT,
  MAX_COUNT,
  buildScriptPrompt,
  clampCount,
  fallbackVariants,
  generateScriptVariants,
  normalizeVariants
};
