"use strict";
const assert = require("node:assert/strict");
const { checkPolicy, policyPromptRules } = require("../policy-filter");

const aman = { hook: "Jangan checkout serum lain sebelum lihat 3 detail ini", benefit: "Teksturnya ringan dan cepat meresap, jadi enak dipakai sebelum tidur.", cta: "Cek varian dan promonya di keranjang." };
const bersih = checkPolicy(aman);
assert.equal(bersih.safe, true);
assert.equal(bersih.blocking, false);
assert.equal(bersih.penalty, 0);

// Klaim medis dan mutlak adalah dua penyebab penolakan paling umum.
const medis = checkPolicy({ hook: "Serum ini menyembuhkan jerawat", benefit: "", cta: "" });
assert.equal(medis.blocking, true);
assert.equal(medis.violations[0].rule, "medical_claim");
assert.equal(medis.violations[0].severity, "high");
assert.ok(medis.violations[0].hint.length > 0, "setiap pelanggaran harus memberi cara memperbaikinya");

assert.equal(checkPolicy({ hook: "Dijamin putih dalam 7 hari" }).blocking, true, "klaim mutlak harus memblokir");
assert.equal(checkPolicy({ hook: "100% ampuh hilangkan komedo" }).blocking, true);

// Atribut pribadi sering lolos perhatian padahal Meta melarangnya secara eksplisit.
const pribadi = checkPolicy({ hook: "Kamu yang berjerawat wajib coba ini" });
assert.equal(pribadi.blocking, true);
assert.equal(pribadi.violations[0].rule, "personal_attribute");

// Versi netral dari kalimat yang sama harus lolos.
assert.equal(checkPolicy({ hook: "Buat kulit yang mudah berjerawat, ini pilihannya" }).safe, true);

const sedang = checkPolicy({ hook: "Produk terbaik di dunia buat kulit kering" });
assert.equal(sedang.safe, false);
assert.equal(sedang.blocking, false, "superlatif berisiko tapi tidak otomatis ditolak");
assert.ok(sedang.penalty > 0 && sedang.penalty < 40);

// Satu aturan hanya dihitung sekali walaupun polanya cocok berkali-kali.
const ganda = checkPolicy({ hook: "Menyembuhkan jerawat", benefit: "Mengobati kulit kusam juga", cta: "" });
assert.equal(ganda.violations.filter(item => item.rule === "medical_claim").length, 1);

assert.ok(policyPromptRules().includes("Klaim medis"), "aturan harus bisa disuntikkan ke prompt");
assert.ok(policyPromptRules().split("\n").length >= 5);

console.log("policy filter tests passed");
