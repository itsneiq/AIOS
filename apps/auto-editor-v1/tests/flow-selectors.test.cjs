"use strict";
const assert = require("node:assert/strict");
const { buildSelector, discover, isUsable, rankCandidates, scoreCandidate } = require("../flow-selectors");

const halaman = [
  { index: 0, tag: "input", width: 120, height: 30, attributes: { placeholder: "Cari proyek" } },
  { index: 1, tag: "textarea", width: 800, height: 120, attributes: { "data-testid": "prompt-box", placeholder: "Describe your video" } },
  { index: 2, tag: "button", width: 100, height: 40, text: "Batal", attributes: {} },
  { index: 3, tag: "button", width: 140, height: 44, text: "Generate", attributes: { "data-testid": "generate-btn" } },
  { index: 4, tag: "video", src: "blob:hasil", attributes: {} },
  { index: 5, tag: "a", width: 90, height: 32, text: "Download", href: "blob:unduh", attributes: { "aria-label": "Download video" } },
  { index: 6, tag: "button", width: 0, height: 0, text: "Generate", attributes: {}, hidden: true }
];

const hasil = discover(halaman);
assert.equal(hasil.complete, true);
assert.deepEqual(hasil.missing, []);
assert.equal(hasil.selectors.promptInput, '[data-testid="prompt-box"]');
assert.equal(hasil.selectors.generateButton, '[data-testid="generate-btn"]');
assert.equal(hasil.selectors.resultVideo, "video");
assert.equal(hasil.selectors.downloadButton, '[data-testid="download"]' === hasil.selectors.downloadButton ? hasil.selectors.downloadButton : 'a[aria-label="Download video"]');

// Laporan menampilkan alternatif agar pilihan bisa diperiksa manusia sebelum
// dipakai, bukan diterima begitu saja.
assert.ok(hasil.report.promptInput.candidates.length >= 1);
assert.ok(hasil.report.promptInput.candidates[0].score > 0);
assert.ok(hasil.report.generateButton.label.includes("generate") || hasil.report.generateButton.label.includes("Tombol"));

/*
 * Elemen tersembunyi tetap ada di DOM dan sering menyerupai elemen yang dicari.
 * Mengkliknya berarti otomasi menyentuh sesuatu yang tak pernah dilihat
 * pemakai, dan kegagalannya sulit ditelusuri.
 */
assert.equal(isUsable(halaman[6]), false);
assert.equal(scoreCandidate(halaman[6], "generateButton"), -1);
assert.equal(isUsable({ tag: "button", width: 0, height: 0 }), false);
assert.equal(isUsable({ tag: "video" }), true, "video kerap berukuran nol sebelum dimuat");

// Kotak prompt harus menang atas kolom pencarian yang sama-sama input.
assert.ok(scoreCandidate(halaman[1], "promptInput") > scoreCandidate(halaman[0], "promptInput"));

// Tombol yang mati tidak boleh dipilih selama masih ada yang aktif.
const denganMati = rankCandidates([
  { index: 0, tag: "button", width: 100, height: 40, text: "Generate", disabled: true, attributes: {} },
  { index: 1, tag: "button", width: 100, height: 40, text: "Generate", attributes: {} }
], "generateButton");
assert.equal(denganMati[0].element.index, 1);

// Selector dibangun dari atribut yang paling jarang berubah lebih dulu.
assert.equal(buildSelector({ tag: "button", attributes: { "data-testid": "x", id: "y", "aria-label": "z" } }), '[data-testid="x"]');
assert.equal(buildSelector({ tag: "button", attributes: { id: "kirim", "aria-label": "z" } }), "#kirim");
assert.equal(buildSelector({ tag: "button", attributes: { "aria-label": "Kirim" } }), 'button[aria-label="Kirim"]');
assert.equal(buildSelector({ tag: "textarea", attributes: { placeholder: "Tulis" } }), 'textarea[placeholder="Tulis"]');
assert.equal(buildSelector({ tag: "div", attributes: { id: "3kolom" } }), "div", "id yang diawali angka bukan selector CSS yang sah");

// Halaman yang belum dimuat harus dilaporkan kurang, bukan dipaksa jalan.
const belumSiap = discover([{ index: 0, tag: "div", width: 10, height: 10, text: "Memuat", attributes: {} }]);
assert.equal(belumSiap.complete, false);
assert.ok(belumSiap.missing.includes("promptInput"));
assert.ok(belumSiap.missing.includes("generateButton"));
assert.deepEqual(discover([]).missing.length, 4);

console.log("flow selectors tests passed");
