"use strict";
const assert = require("node:assert/strict");
const { combineScore, planScripts, rankVariants } = require("../script-pipeline");

const product = { title: "Serum Glow", category: "beauty", keywords: ["serum"] };

// Pelanggaran berat harus menekan varian ke dasar walau hook-nya kuat.
assert.equal(combineScore({ hookScore: 95, policy: { penalty: 0, blocking: false } }), 95);
assert.equal(combineScore({ hookScore: 95, policy: { penalty: 40, blocking: true } }), 20);
assert.equal(combineScore({ hookScore: 80, policy: { penalty: 15, blocking: false } }), 65);
assert.equal(combineScore({ hookScore: 10, policy: { penalty: 40, blocking: false } }), 0);

const ranked = rankVariants([
  { angle: "urgency", hook: "Dijamin putih dalam 7 hari pakai serum ini", benefit: "b", cta: "c" },
  { angle: "problem_solution", hook: "Jangan beli serum lain sebelum lihat 3 bukti ini", benefit: "b", cta: "c" },
  { angle: "lifestyle", hook: "Produk bagus", benefit: "b", cta: "c" }
], { platform: "meta", product });

assert.equal(ranked[0].rank, 1);
assert.ok(ranked[0].score > ranked[ranked.length - 1].score);
assert.equal(ranked.find(item => item.hook.startsWith("Dijamin")).policy.blocking, true);
assert.ok(ranked.findIndex(item => item.policy.blocking) > 0, "varian yang melanggar tidak boleh menempati peringkat teratas");
assert.ok(ranked.every(item => typeof item.hookScore === "number" && item.policy));

(async () => {
  const klien = {
    generateJSON: async () => ({
      data: [
        { angle: "problem_solution", hook: "Jangan beli serum lain sebelum lihat 3 bukti ini", benefit: "Teksturnya ringan dan cepat meresap.", cta: "Cek promonya sekarang.", visualHint: "close-up tetesan serum" },
        { angle: "urgency", hook: "Promo serum glow tinggal hitungan jam hari ini", benefit: "Stoknya terbatas per varian.", cta: "Cek keranjang." },
        { angle: "demo", hook: "Menyembuhkan jerawat cuma pakai ini", benefit: "b", cta: "c" }
      ],
      usage: { totalTokenCount: 200 }
    })
  };

  const hasil = await planScripts({ title: "Serum Glow Niacinamide", description: "bahan: niacinamide 10%", duration: 18, aiSeconds: 9 }, klien);

  assert.equal(hasil.product.category, "beauty", "kategori harus terdeteksi dari judul");
  assert.equal(hasil.variants.length, 3);
  assert.equal(hasil.degraded, false);
  assert.equal(hasil.summary.total, 3);
  assert.equal(hasil.summary.blocked, 1);
  assert.equal(hasil.summary.usable, 2);
  assert.ok(hasil.summary.angles.includes("urgency"));

  // Angka biaya adalah pagar terakhir sebelum pengguna membayar.
  assert.equal(hasil.cost.videoIfApproved.seconds, 9);
  assert.equal(hasil.cost.videoIfApproved.calls, 1);
  assert.equal(hasil.cost.videoIfApproved.idr, 14400);
  assert.equal(hasil.cost.plan.photoSeconds, 9);
  assert.equal(hasil.cost.script.usd, 0);

  assert.ok(hasil.creative.beats.length === 3, "brief kreatif tetap memakai struktur hook/benefit/cta");
  assert.equal(hasil.variants[0].policy.blocking, false, "peringkat satu tidak boleh melanggar kebijakan");

  // Tanpa klien, seluruh pipeline tetap menghasilkan varian yang bisa dinilai.
  const tanpaKlien = await planScripts({ title: "Panci Anti Lengket" });
  assert.equal(tanpaKlien.degraded, true);
  assert.ok(tanpaKlien.variants.length > 0);
  assert.equal(tanpaKlien.product.category, "kitchen");
  assert.ok(tanpaKlien.cost.videoIfApproved.idr > 0);

  console.log("script pipeline tests passed");
})();
