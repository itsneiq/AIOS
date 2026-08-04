"use strict";
const assert = require("node:assert/strict");
const { ANGLE_DIRECTIONS, BEATS, angles, directionFor, directionForSpan } = require("../angle-direction");

/*
 * Inti modul ini: sudut yang berbeda harus menghasilkan gambar yang berbeda.
 * Sebelumnya semuanya jatuh ke prompt yang sama, sehingga iklan yang copy-nya
 * membuka dengan masalah tetap dibuka dengan close-up produk.
 */
const pembuka = angles().map(angle => directionFor(angle, "hook"));
assert.equal(new Set(pembuka).size, pembuka.length, "setiap sudut wajib punya pembuka sendiri");

// Sudut bertumpu masalah tidak boleh membuka pada produk.
assert.match(directionFor("problem_solution", "hook"), /kondisi masalah|bukan pada produk/i);
assert.match(directionFor("before_after", "hook"), /sebelum/i);
assert.match(directionFor("urgency", "hook"), /menipis|terakhir/i);
assert.match(directionFor("detail_reveal", "hook"), /sangat dekat|penasaran/i);
assert.match(directionFor("value_reveal", "hook"), /premium|mahal/i);
assert.match(directionFor("styling", "hook"), /sebelum dipakai|tergantung/i);

// Arahan harus berupa momen yang bisa difilmkan, bukan kata sifat.
for (const angle of angles()) {
  for (const beat of BEATS) {
    const arahan = directionFor(angle, beat);
    assert.ok(arahan.length > 25, `${angle}/${beat} terlalu pendek untuk jadi arahan`);
    assert.ok(!/^(tampilkan kesan|beri nuansa|buat terlihat)/i.test(arahan), `${angle}/${beat} berupa kata sifat, bukan momen`);
  }
}

// Sudut maupun beat yang tidak dikenal jatuh ke arahan bawaan, bukan gagal.
const { DEFAULT_DIRECTION } = require("../angle-direction");
assert.equal(directionFor("tidak-ada", "hook"), DEFAULT_DIRECTION.hook);
assert.equal(directionFor("tidak-ada", "solve"), DEFAULT_DIRECTION.solve);
assert.equal(directionFor("problem_solution", "beat-asing"), DEFAULT_DIRECTION.hook);

/*
 * Satu klip panjang menaungi beberapa beat. Menyambung arahannya membuat klip
 * punya perkembangan di dalamnya, bukan satu pose statis selama sembilan detik.
 */
const rentang = directionForSpan("problem_solution", ["hook", "agitate"]);
assert.ok(rentang.includes("lalu berlanjut"), "klip yang menaungi dua beat harus punya perkembangan");
assert.ok(rentang.length > directionFor("problem_solution", "hook").length);

const tiga = directionForSpan("before_after", ["hook", "agitate", "solve"]);
assert.ok(tiga.includes("kemudian"), "tiga beat disambung berurutan");

assert.equal(directionForSpan("demo", ["solve"]), directionFor("demo", "solve"), "satu beat tidak perlu penyambungan");
assert.equal(directionForSpan("demo", []), directionFor("demo", "hook"), "tanpa beat jatuh ke pembuka");
assert.equal(directionForSpan("demo", ["beat-asing"]), directionFor("demo", "hook"));

// Struktur beat mengikuti formula hook - agitate - solve - cta.
assert.deepEqual(BEATS, ["hook", "agitate", "solve", "cta"]);
for (const angle of angles()) {
  assert.deepEqual(Object.keys(ANGLE_DIRECTIONS[angle]).sort(), [...BEATS].sort(), `${angle} harus lengkap empat beat`);
}

console.log("angle direction tests passed");
