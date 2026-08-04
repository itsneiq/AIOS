"use strict";
const assert = require("node:assert/strict");
const { SCENES, describeScene, pickScenes, scenesFor } = require("../scene-library");

/*
 * Inti pustaka ini: produk berbeda harus mendapat tampilan berbeda. Kontrak
 * gaya yang tetap membuat lima puluh iklan keluar dengan look yang sama, dan
 * penonton berhenti memperhatikan sesuatu yang sudah pernah dilihat.
 */
const produk = ["Serum Niacinamide 10%", "Toner BHA 2%", "Sunscreen SPF 50", "Masker Clay", "Essence Retinol", "Micellar Water"];
const terpilih = produk.map(nama => pickScenes({ category: "beauty", seed: nama })[0].id);
assert.ok(new Set(terpilih).size >= 4, `enam produk harus menyebar ke banyak set, dapat: ${[...new Set(terpilih)].join(", ")}`);

// Namun produk yang sama harus selalu mendapat set yang sama, supaya varian
// yang disukai bisa dibuat ulang persis.
assert.deepEqual(
  pickScenes({ category: "beauty", seed: "Serum Niacinamide 10%", count: 3 }),
  pickScenes({ category: "beauty", seed: "Serum Niacinamide 10%", count: 3 })
);

/*
 * Beberapa pilihan yang ditawarkan harus benar-benar berbeda satu sama lain.
 * Tiga pilihan yang suasananya mirip kehilangan gunanya sebagai pilihan.
 */
const tiga = pickScenes({ category: "fashion", seed: "Kemeja Oversize", count: 3 });
assert.equal(tiga.length, 3);
assert.equal(new Set(tiga.map(item => item.id)).size, 3, "tidak boleh ada set yang terulang");
assert.equal(new Set(tiga.map(item => item.world)).size, 3, "latar ketiganya harus berbeda");
assert.equal(new Set(tiga.map(item => item.lighting)).size, 3, "pencahayaan ketiganya harus berbeda");

// Permintaan melebihi isi pustaka dibatasi, bukan mengulang set yang sama.
const banyak = pickScenes({ category: "kitchen", seed: "Panci", count: 10 });
assert.equal(banyak.length, SCENES.kitchen.length);
assert.equal(new Set(banyak.map(item => item.id)).size, banyak.length);

assert.equal(pickScenes({ category: "beauty", seed: "x" }).length, 1);
assert.equal(pickScenes({ category: "beauty", seed: "x", count: 0 }).length, 1);

// Kategori tak dikenal jatuh ke set umum, bukan gagal.
assert.equal(scenesFor("tidak-ada"), SCENES.general);
assert.ok(pickScenes({ category: "tidak-ada", seed: "x" })[0].world);

// Setiap set wajib lengkap; satu bidang kosong membuat prompt menggantung.
for (const [kategori, daftar] of Object.entries(SCENES)) {
  assert.ok(daftar.length >= 2, `${kategori} perlu minimal dua set agar ada variasi`);
  for (const scene of daftar) {
    for (const bidang of ["id", "world", "lighting", "camera", "wardrobe", "action"]) {
      assert.ok(scene[bidang] && String(scene[bidang]).trim(), `${kategori}/${scene.id} kehilangan ${bidang}`);
    }
  }
  assert.equal(new Set(daftar.map(item => item.id)).size, daftar.length, `id di ${kategori} harus unik`);
}

// Dua kategori yang paling sering dipakai perlu pustaka yang dalam.
assert.ok(SCENES.beauty.length >= 5, "beauty butuh set yang cukup banyak agar tidak berulang");
assert.ok(SCENES.fashion.length >= 5, "fashion butuh set yang cukup banyak agar tidak berulang");

// Deskripsi harus memuat seluruh unsur agar model tidak mengarang sendiri.
const deskripsi = describeScene(SCENES.fashion[0]);
for (const kata of ["Latar:", "Pencahayaan:", "Kamera:", "Aksi:"]) assert.ok(deskripsi.includes(kata));
assert.ok(describeScene(SCENES.beauty[2]).includes("Tanpa model"), "set tanpa model harus menyebutkannya secara eksplisit");
assert.ok(describeScene(SCENES.fashion[0]).includes("Wardrobe pendukung"));

console.log("scene library tests passed");
