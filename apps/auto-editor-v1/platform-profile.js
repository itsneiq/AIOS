"use strict";

/*
 * Perbedaan platform yang menyangkut isi, bukan tampilan.
 *
 * Modul ini sengaja tidak memuat margin, safe area, maupun rasio keluaran.
 * Semua itu urusan perakitan, dan mencampurnya ke sini membuat pekerjaan
 * konten dan pekerjaan editing kembali saling mengunci — persoalan yang justru
 * ingin dihindari.
 *
 * Yang berbeda di sini hanya hal yang memengaruhi apa yang ditulis dan
 * diucapkan: panjang kalimat, nada, ajakan bertindak, dan batasan kebijakan.
 *
 * Perbedaan terpenting ada pada CTA. Marketplace punya keranjang di dalam
 * aplikasi, sedangkan iklan berbayar mengarahkan keluar ke halaman produk.
 * Menyuruh penonton Meta "cek keranjang" berarti meminta mereka menekan
 * sesuatu yang tidak ada di layar.
 */

const PROFILES = Object.freeze({
  meta: Object.freeze({
    id: "meta",
    label: "Meta Ads",
    kind: "ads",
    hook: Object.freeze({ minWords: 5, maxWords: 14 }),
    tone: "Rapi dan meyakinkan, boleh sedikit lebih tenang daripada konten marketplace.",
    cta: Object.freeze({
      mechanism: "Penonton menekan tombol atau tautan yang membawa keluar ke halaman produk.",
      phrases: Object.freeze(["Cek selengkapnya lewat tautan", "Lihat detailnya di halaman produk", "Ketuk untuk lihat pilihan variannya"]),
      forbid: Object.freeze([/keranjang/i, /checkout di aplikasi/i, /klik keranjang/i]),
      forbidReason: "Iklan Meta tidak punya keranjang di layar; menyuruh menekan keranjang membuat ajakan itu mustahil diikuti."
    }),
    urgency: "sedang",
    extraPolicy: Object.freeze([
      "Meta memeriksa iklan sebelum tayang, jadi klaim harus paling berhati-hati di antara semua platform."
    ])
  }),
  shopee: Object.freeze({
    id: "shopee",
    label: "Shopee Video",
    kind: "marketplace",
    hook: Object.freeze({ minWords: 3, maxWords: 10 }),
    tone: "Langsung dan transaksional. Harga, promo, dan alasan membeli sekarang boleh disebut terang-terangan.",
    cta: Object.freeze({
      mechanism: "Penonton menekan keranjang yang muncul di dalam aplikasi, tanpa berpindah halaman.",
      phrases: Object.freeze(["Cek keranjang di bawah", "Langsung cek keranjang di bawah ya", "Keranjang di bawah, cek variannya"]),
      forbid: Object.freeze([/tautan di bio/i, /swipe up/i, /klik link/i]),
      forbidReason: "Konten Shopee tidak memakai tautan keluar; ajakan harus mengarah ke keranjang di dalam aplikasi."
    }),
    urgency: "tinggi",
    extraPolicy: Object.freeze([
      "Sebutkan promo atau potongan harga hanya bila memang sedang berlaku; janji diskon yang tidak ada merusak kepercayaan sekaligus melanggar aturan marketplace."
    ])
  }),
  tiktok: Object.freeze({
    id: "tiktok",
    label: "TikTok Shop",
    kind: "marketplace",
    hook: Object.freeze({ minWords: 4, maxWords: 12 }),
    tone: "Santai seperti orang bercerita ke teman, tempo cepat, hindari bahasa iklan formal.",
    cta: Object.freeze({
      mechanism: "Penonton menekan keranjang kuning di dalam aplikasi.",
      phrases: Object.freeze(["Cek keranjang kuning di bawah", "Keranjang kuning ya, cek dulu"]),
      forbid: Object.freeze([/tautan di bio/i, /swipe up/i]),
      forbidReason: "TikTok Shop memakai keranjang di dalam aplikasi, bukan tautan keluar."
    }),
    urgency: "tinggi",
    extraPolicy: Object.freeze([])
  })
});

const DEFAULT_PLATFORM = "meta";

function profileFor(platform) {
  return PROFILES[String(platform || "").toLowerCase()] || PROFILES[DEFAULT_PLATFORM];
}

/*
 * Memeriksa apakah ajakan bertindak masuk akal di platform yang dituju.
 * Kesalahan ini tidak tertangkap saringan kebijakan mana pun karena kalimatnya
 * sopan dan tidak melanggar apa-apa — ia hanya mustahil dilakukan penontonnya.
 */
function checkCta(text, platform) {
  const profile = profileFor(platform);
  const isi = String(text || "");
  for (const pattern of profile.cta.forbid) {
    const match = pattern.exec(isi);
    if (match) {
      return {
        valid: false,
        matched: match[0],
        platform: profile.id,
        reason: profile.cta.forbidReason,
        suggestion: profile.cta.phrases[0]
      };
    }
  }
  return { valid: true, platform: profile.id };
}

function ctaPromptRules(platform) {
  const profile = profileFor(platform);
  return [
    `Platform: ${profile.label}.`,
    `Nada: ${profile.tone}`,
    `Mekanisme CTA: ${profile.cta.mechanism}`,
    `Contoh ajakan yang benar: ${profile.cta.phrases.map(item => `"${item}"`).join(", ")}.`,
    `Tingkat urgensi: ${profile.urgency}.`,
    ...profile.extraPolicy
  ].join("\n");
}

module.exports = { DEFAULT_PLATFORM, PROFILES, checkCta, ctaPromptRules, profileFor };
