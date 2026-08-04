"use strict";
const assert = require("node:assert/strict");
const { detectSignals, qualityPromptRules, scoreAdHook } = require("../hook-quality");

/*
 * Kalibrasi utama. Dua hook ini mendapat skor dasar sama (80) dari
 * hook-optimizer, padahal yang bertegangan jauh lebih kuat sebagai iklan.
 * Sinyal retoris harus memisahkan keduanya dengan jelas.
 */
const bertegangan = "Wajah kelihatan kusam padahal udah pakai banyak lapis skincare tiap hari?";
const bernadaArtikel = "Ini alasan kenapa konsentrasi Niacinamide 10% banyak dicari pecinta skincare.";

const kuat = scoreAdHook(bertegangan, { baseScore: 80 });
const lemah = scoreAdHook(bernadaArtikel, { baseScore: 80 });
assert.ok(kuat.score > lemah.score, "hook bertegangan harus mengalahkan hook bernada artikel");
assert.ok(kuat.score - lemah.score >= 30, "selisihnya harus tegas, bukan sekadar satu dua poin");
assert.ok(kuat.strengths.includes("Kontras"));
assert.ok(lemah.weaknesses.includes("Bernada artikel"));
assert.ok(lemah.weaknesses.includes("Jarak"));

// Sinyal individual.
assert.ok(detectSignals("Ternyata bukan seruminya yang salah").some(item => item.id === "tension"));
assert.ok(detectSignals("Lihat bedanya sebelum dan sesudah dua minggu").some(item => item.id === "transformation"));
assert.ok(detectSignals("Dulu kusam, sekarang jauh lebih cerah").some(item => item.id === "transformation"));
assert.ok(detectSignals("Hasilnya kelihatan di minggu kedua").some(item => item.id === "transformation"));
assert.ok(detectSignals("Bedanya kelihatan setelah dua minggu pakai rutin").some(item => item.id === "transformation"));

// "sebelum" sendirian hampir selalu menandai waktu, bukan perubahan keadaan.
// Tanpa penjagaan ini, hampir setiap hook mendapat bonus before-after gratis.
assert.ok(!detectSignals("Rutinitas skincare pagi anti ribet sebelum berangkat kerja").some(item => item.id === "transformation"));
assert.ok(!detectSignals("Cek promonya sebelum stok habis").some(item => item.id === "transformation"));
assert.ok(detectSignals("Jangan keburu checkout sebelum lihat ini").some(item => item.id === "stakes"));
assert.ok(detectSignals("Cuma butuh tiga tetes tiap malam").some(item => item.id === "effortless"));
assert.ok(detectSignals("Cuma butuh tiga tetes tiap malam").some(item => item.id === "sensory"));
assert.ok(detectSignals("Botol mungil 20ml ini ternyata rahasianya").some(item => item.id === "sensory"));
assert.ok(detectSignals("Berikut lima alasan memilih serum").some(item => item.id === "expository"));
assert.ok(detectSignals("Produk ini banyak dicari para ibu muda").some(item => item.id === "third_person"));

// Before-after adalah format terkuat untuk skincare dan harus terbaca sebagai kekuatan.
const beforeAfter = scoreAdHook("Bedanya kelihatan setelah dua minggu pakai rutin", { baseScore: 60 });
assert.ok(beforeAfter.strengths.includes("Perubahan"));
assert.ok(beforeAfter.score > 60);

// Skor tetap berpijak pada skor dasar dan tidak boleh keluar dari rentang wajar.
assert.equal(scoreAdHook("", { baseScore: 50 }).score, 50, "hook kosong tidak menggeser apa pun");
assert.equal(scoreAdHook("Ternyata padahal justru", { baseScore: 98 }).score, 100, "skor dibatasi di 100");
assert.equal(scoreAdHook("Berikut ini banyak dicari para pecinta", { baseScore: 10 }).score, 0, "skor tidak boleh negatif");
assert.deepEqual(detectSignals(""), []);
assert.deepEqual(detectSignals(null), []);

// Satu hook bisa membawa beberapa sinyal sekaligus.
const gabungan = scoreAdHook("Jangan buang serum kamu, ternyata cuma butuh tiga tetes", { baseScore: 50 });
assert.ok(gabungan.signals.length >= 3);
assert.ok(gabungan.adjustment > 20);

assert.ok(qualityPromptRules().includes("padahal"), "arahan harus bisa disuntikkan ke prompt");
assert.ok(qualityPromptRules().includes("skincare"));

console.log("hook quality tests passed");
