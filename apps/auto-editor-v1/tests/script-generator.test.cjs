"use strict";
const assert = require("node:assert/strict");
const { buildScriptPrompt, fallbackVariants, generateScriptVariants, normalizeVariants } = require("../script-generator");

const product = { title: "Serum Glow", brand: "Aura", category: "beauty", attributes: ["material: niacinamide"], benefits: ["mendukung rutinitas perawatan"], keywords: ["serum", "glow"], targetAudience: "Pengguna beauty" };

const prompt = buildScriptPrompt({ product, platform: "meta", count: 12, duration: 18 });
assert.ok(prompt.includes("Serum Glow"));
assert.ok(prompt.includes("niacinamide"));
assert.ok(prompt.includes("Klaim medis"), "aturan kebijakan harus ikut ke dalam prompt");
assert.ok(prompt.includes("5-14 kata"), "batas kata harus mengikuti platform meta");
assert.ok(prompt.includes("12 varian"));
assert.ok(prompt.includes("problem_solution"));
assert.equal(buildScriptPrompt({ product, platform: "tiktok" }).includes("4-12 kata"), true);
assert.ok(buildScriptPrompt({ product, count: 999 }).includes("20 varian"), "jumlah varian dibatasi");

// Hook duplikat tidak boleh memakan jatah varian.
const normalized = normalizeVariants([
  { angle: "demo", hook: "Lihat hasilnya dulu", benefit: "b", cta: "c", visualHint: "v" },
  { angle: "demo", hook: "LIHAT HASILNYA DULU", benefit: "beda", cta: "c" },
  { angle: "tidak_dikenal", hook: "Hook kedua yang beda", benefit: "b", cta: "c" },
  { hook: "", benefit: "kosong" }
], { count: 10 });
assert.equal(normalized.length, 2);
assert.equal(normalized[0].source, "gemini");
assert.equal(normalized[1].angle, "balanced", "sudut pandang tak dikenal jatuh ke balanced");
assert.deepEqual(normalizeVariants({ variants: [{ hook: "Dari properti variants" }] }).length, 1);
assert.deepEqual(normalizeVariants(null), []);
assert.equal(normalizeVariants([{ hook: "a".repeat(500) }])[0].hook.length, 160, "hook dipotong agar tidak membanjiri UI");
assert.equal(normalizeVariants([{ hook: "  spasi   berlebih  " }])[0].hook, "spasi berlebih");
assert.equal(normalizeVariants([{ hook: "a" }, { hook: "b" }, { hook: "c" }], { count: 2 }).length, 2);

assert.ok(fallbackVariants({ product, count: 5 }).length > 0);
assert.equal(fallbackVariants({ product })[0].source, "template");

(async () => {
  // Tanpa klien, alat tetap harus menghasilkan sesuatu.
  const tanpaKlien = await generateScriptVariants({ product });
  assert.equal(tanpaKlien.degraded, true);
  assert.ok(tanpaKlien.variants.length > 0);
  assert.equal(tanpaKlien.variants[0].source, "template");

  const klien = { generateJSON: async () => ({ data: [{ angle: "urgency", hook: "Promo serum ini tinggal hitungan jam", benefit: "b", cta: "c" }], usage: { totalTokenCount: 5 } }) };
  const berhasil = await generateScriptVariants({ product }, klien);
  assert.equal(berhasil.degraded, false);
  assert.equal(berhasil.variants[0].angle, "urgency");
  assert.equal(berhasil.usage.totalTokenCount, 5);

  // Kegagalan API tidak boleh menghentikan alur kerja.
  const gagal = { generateJSON: async () => { const error = new Error("kuota habis"); error.diagnostic = { code: "RATE_LIMITED", message: "kuota habis" }; throw error; } };
  const turun = await generateScriptVariants({ product }, gagal);
  assert.equal(turun.degraded, true);
  assert.equal(turun.diagnostic.code, "RATE_LIMITED");
  assert.ok(turun.variants.length > 0, "harus tetap ada varian template saat Gemini gagal");

  const kosong = await generateScriptVariants({ product }, { generateJSON: async () => ({ data: [] }) });
  assert.equal(kosong.degraded, true);
  assert.ok(kosong.variants.length > 0);

  console.log("script generator tests passed");
})();
