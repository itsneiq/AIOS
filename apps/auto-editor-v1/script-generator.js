"use strict";

/*
 * Lapisan generatif untuk copy iklan.
 *
 * `script-engine.js` memilih kalimat dari kumpulan template tetap sehingga
 * hasilnya berulang antar produk. Modul ini menggantinya dengan copy yang
 * ditulis model, namun tetap mengembalikan bentuk { hook, benefit, cta, angle }
 * yang sama supaya seluruh tahap setelahnya tidak perlu berubah.
 *
 * Bila Gemini tidak tersedia, modul jatuh kembali ke template lama agar alat
 * tetap bisa dipakai tanpa API key.
 */

const { PLATFORM_LIMITS } = require("./hook-optimizer");
const { generateScriptSet } = require("./script-engine");
const { policyPromptRules } = require("./policy-filter");
const { qualityPromptRules } = require("./hook-quality");

const ANGLE_BRIEFS = Object.freeze({
  before_after: "Tunjukkan kondisi sebelum dan sesudah pemakaian. Kontraskan keduanya secara jujur tanpa menjanjikan hasil pasti.",
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
  fashion: ["lifestyle", "before_after"],
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
  return PLATFORM_LIMITS[platform] || PLATFORM_LIMITS.default;
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

  return `Kamu penulis copy iklan affiliate berbahasa Indonesia untuk Meta Ads (Reels dan Feed).

PRODUK
- Nama: ${product.title || "Produk"}
- Merek: ${product.brand || "-"}
- Kategori: ${product.category || "general"}
- Target: ${product.targetAudience || "Pengguna umum"}
- Atribut: ${(product.attributes || []).join("; ") || "-"}
- Manfaat: ${(product.benefits || []).join("; ") || "-"}
- Kata kunci: ${(product.keywords || []).join(", ") || "-"}

FORMAT VIDEO
- Durasi total ${duration} detik, dibagi tiga bagian: hook, benefit, CTA.
- Ditonton sambil scroll, sering tanpa suara, jadi hook harus berdiri sendiri.

ATURAN HOOK
- Panjang ${limits.min}-${limits.max} kata. Ini batas keras.
- Tiga detik pertama menentukan semuanya: langsung ke inti, tanpa sapaan dan tanpa nama merek di depan.
- Gunakan bahasa Indonesia sehari-hari yang wajar diucapkan, bukan bahasa iklan formal.
- Boleh spesifik dengan angka bila masuk akal untuk produk ini.

YANG MEMBUAT HOOK BERHENTI DIGULIR
${qualityPromptRules()}

ATURAN KEBIJAKAN META (wajib dipatuhi)
${policyPromptRules()}

SUDUT PANDANG YANG TERSEDIA
${angleList}${priorityNote}

TUGAS
Tulis ${total} varian yang benar-benar berbeda satu sama lain, tersebar merata ke beberapa sudut pandang di atas. Varian yang hanya berbeda susunan kata dianggap gagal.
${extraNotes ? `\nCATATAN TAMBAHAN\n${extraNotes}\n` : ""}
Balas HANYA dengan JSON array, tanpa penjelasan apa pun, dengan bentuk persis:
[
  {
    "angle": "<salah satu id sudut pandang di atas>",
    "hook": "<kalimat hook>",
    "benefit": "<satu sampai dua kalimat manfaat konkret>",
    "cta": "<ajakan singkat untuk cek produk>",
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
    variants.push({
      angle: ANGLE_BRIEFS[item?.angle] ? item.angle : fallbackAngle,
      hook,
      benefit: cleanLine(item?.benefit),
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
    .map(script => ({ ...script, visualHint: "", source: "template" }));
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
