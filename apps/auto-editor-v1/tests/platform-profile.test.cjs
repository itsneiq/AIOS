"use strict";
const assert = require("node:assert/strict");
const { PROFILES, checkCta, ctaPromptRules, profileFor } = require("../platform-profile");

/*
 * Perbedaan terpenting antar platform ada pada mekanisme CTA. Marketplace punya
 * keranjang di dalam aplikasi; iklan berbayar mengarahkan keluar. Menyuruh
 * penonton Meta "cek keranjang" berarti meminta mereka menekan sesuatu yang
 * tidak ada di layar — kesalahan yang tidak melanggar kebijakan apa pun dan
 * karena itu lolos dari semua saringan lain.
 */
const salahMeta = checkCta("Langsung cek keranjang di bawah ya", "meta");
assert.equal(salahMeta.valid, false);
assert.equal(salahMeta.matched.toLowerCase(), "keranjang");
assert.match(salahMeta.reason, /tidak punya keranjang/i);
assert.ok(salahMeta.suggestion.length > 0, "penolakan harus membawa gantinya");
assert.ok(!/keranjang/i.test(salahMeta.suggestion), "gantinya tidak boleh mengulang kesalahan yang sama");

// Kalimat yang sama justru benar di marketplace.
assert.equal(checkCta("Langsung cek keranjang di bawah ya", "shopee").valid, true);
assert.equal(checkCta("Cek keranjang kuning di bawah", "tiktok").valid, true);

// Dan sebaliknya: ajakan bertautan keluar tidak masuk akal di marketplace.
assert.equal(checkCta("Klik link di bio ya", "shopee").valid, false);
assert.equal(checkCta("Swipe up untuk lihat harga", "tiktok").valid, false);
assert.equal(checkCta("Cek selengkapnya lewat tautan", "meta").valid, true);

// Setiap contoh ajakan bawaan wajib lolos pemeriksaannya sendiri.
for (const [id, profile] of Object.entries(PROFILES)) {
  for (const phrase of profile.cta.phrases) {
    assert.equal(checkCta(phrase, id).valid, true, `contoh "${phrase}" justru ditolak di ${id}`);
  }
}

// Marketplace dan iklan berbayar harus benar-benar terpisah perilakunya.
assert.equal(profileFor("shopee").kind, "marketplace");
assert.equal(profileFor("meta").kind, "ads");
assert.notEqual(profileFor("shopee").urgency, profileFor("meta").urgency);
assert.notEqual(profileFor("shopee").tone, profileFor("meta").tone);

// Platform asing jatuh ke Meta, yang aturannya paling ketat, bukan ke yang
// paling longgar. Salah tebak ke arah ketat hanya membuat copy lebih hati-hati.
assert.equal(profileFor("tidak-ada").id, "meta");
assert.equal(profileFor(undefined).id, "meta");
assert.equal(profileFor("SHOPEE").id, "shopee", "nama platform tidak peka huruf besar kecil");

// Batas panjang hook ikut berbeda karena kebiasaan menonton tiap platform beda.
assert.ok(profileFor("shopee").hook.maxWords < profileFor("meta").hook.maxWords);

// Arahan yang masuk ke prompt harus memuat mekanisme dan contohnya.
const arahanShopee = ctaPromptRules("shopee");
assert.ok(arahanShopee.includes("keranjang"));
assert.ok(arahanShopee.includes("Shopee Video"));
assert.ok(arahanShopee.includes("tinggi"), "tingkat urgensi ikut disampaikan");
const arahanMeta = ctaPromptRules("meta");
assert.ok(arahanMeta.includes("tautan") || arahanMeta.includes("halaman produk"));
assert.ok(!/cek keranjang/i.test(arahanMeta), "arahan Meta tidak boleh menyarankan keranjang");

/*
 * Modul ini sengaja tidak memuat urusan tampilan. Mencampur margin dan rasio ke
 * sini membuat pekerjaan konten dan editing kembali saling mengunci.
 */
const isi = JSON.stringify(PROFILES);
for (const bocor of ["margin", "safeArea", "aspect", "width", "height", "fontSize"]) {
  assert.ok(!isi.includes(bocor), `${bocor} termasuk urusan perakitan, bukan konten`);
}

console.log("platform profile tests passed");
