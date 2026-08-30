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

/*
 * Set tanpa model bertentangan dengan karakter yang dikunci: prompt yang sama
 * akan menyuruh karakter mengenakan produk sekaligus menyuruh tidak ada model
 * di frame. Setnya tidak diganti — identitas visualnya masih dipakai — yang
 * menyesuaikan cuma baris wardrobe-nya.
 */
const tanpaModel = SCENES.beauty[2];
assert.ok(describeScene(tanpaModel, { withCharacter: true }).includes("Wardrobe pendukung"));
assert.ok(!describeScene(tanpaModel, { withCharacter: true }).includes("Tanpa model"), "tidak boleh menyuruh tanpa model padahal karakternya dikunci");
// Unsur set lainnya tetap utuh — yang berubah cuma wardrobe-nya.
for (const kata of ["Latar:", "Pencahayaan:", "Kamera:", "Aksi:"]) {
  assert.ok(describeScene(tanpaModel, { withCharacter: true }).includes(kata));
}
// Set yang memang punya wardrobe tidak berubah sama sekali.
assert.equal(describeScene(SCENES.fashion[0], { withCharacter: true }), describeScene(SCENES.fashion[0]));

/*
 * Seluruh bidang wardrobe di pustaka ini ditulis untuk fashion umum, jadi tidak
 * satu pun cocok untuk busana muslim. Wardrobe modest menimpa bawaan set, bukan
 * cuma mengisi yang kosong — wardrobe yang salah konteks lebih merugikan
 * daripada wardrobe yang seragam antar set.
 */
const { WARDROBE_MODEST } = require("../scene-library");
for (const set of [SCENES.fashion[0], SCENES.beauty[0], SCENES.beauty[2]]) {
  const hasil = describeScene(set, { withCharacter: true, modest: true });
  assert.ok(hasil.includes(WARDROBE_MODEST), `set ${set.id} tidak memakai wardrobe modest`);
  assert.ok(!hasil.includes("Tanpa model"), `set ${set.id} tidak boleh menyuruh tanpa model saat modest`);
  // Unsur set lain tetap utuh — yang ditimpa cuma wardrobe-nya.
  for (const kata of ["Latar:", "Pencahayaan:", "Kamera:", "Aksi:"]) assert.ok(hasil.includes(kata));
}
// Wardrobe bawaan set yang tidak modest benar-benar hilang, bukan ditambahkan.
assert.ok(!describeScene(SCENES.fashion[5], { modest: true }).includes(SCENES.fashion[5].wardrobe));

console.log("scene library tests passed");
