#!/usr/bin/env node
/*
 * CLI tahap murah: produk masuk, varian script keluar, tidak ada video yang
 * di-generate. Dipakai untuk menilai kualitas copy sebelum mengeluarkan biaya.
 *
 * Contoh:
 *   GEMINI_API_KEY=xxx node scripts/generate-script.mjs \
 *     --title "Serum Glow Niacinamide 10%" \
 *     --desc "bahan: niacinamide 10%; ukuran: 20ml" \
 *     --count 12
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { planScripts } = require("../script-pipeline.js");
const { createGeminiClient } = require("../gemini-client.js");

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith("--")) continue;
    const key = token.slice(2);
    const next = argv[index + 1];
    if (next === undefined || next.startsWith("--")) { args[key] = true; continue; }
    args[key] = next;
    index++;
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));

if (args["list-models"]) {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key) {
    console.error("GEMINI_API_KEY belum diset.");
    process.exit(1);
  }
  const models = await createGeminiClient({ apiKey: key }).listModels();
  console.log(`Model yang tersedia untuk API key ini (${models.length}):\n`);
  for (const name of models) console.log(`  ${name}`);
  console.log(`\nPakai salah satu dengan:  $env:GEMINI_TEXT_MODEL = "<nama model>"`);
  process.exit(0);
}

if (args.help || !args.title) {
  console.log(`Pemakaian:
  node scripts/generate-script.mjs --title "<nama produk>" [opsi]

Opsi:
  --title <teks>     Nama produk (wajib)
  --desc <teks>      Deskripsi produk
  --brand <teks>     Merek
  --count <angka>    Jumlah varian (default 12, maks 20)
  --duration <detik> Durasi video (default 18)
  --ai <detik>       Porsi yang di-generate AI (default 9)
  --platform <nama>  meta | tiktok | shopee | youtube (default meta)
  --json             Cetak hasil mentah sebagai JSON
  --list-models      Tampilkan model yang tersedia untuk API key ini, lalu keluar

Butuh GEMINI_API_KEY. Tanpa key, alat tetap jalan memakai template lama.
Nama model bisa diganti lewat GEMINI_TEXT_MODEL bila default sudah pensiun.`);
  process.exit(args.title ? 0 : 1);
}

const apiKey = process.env.GEMINI_API_KEY || "";
const client = apiKey
  ? createGeminiClient({ apiKey, model: process.env.GEMINI_TEXT_MODEL || undefined })
  : null;

if (!client) console.warn("PERINGATAN GEMINI_API_KEY belum diset — memakai template lama, kualitas copy jauh menurun.\n");

const result = await planScripts({
  title: args.title,
  description: args.desc || "",
  brand: args.brand || "",
  count: Number(args.count) || undefined,
  duration: Number(args.duration) || undefined,
  aiSeconds: args.ai === undefined ? undefined : Number(args.ai),
  platform: args.platform || "meta"
}, client);

if (args.json) {
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
}

const { product, summary, cost, variants } = result;

console.log(`PRODUK    ${product.title}`);
console.log(`KATEGORI  ${product.category} (keyakinan ${Math.round(product.categoryConfidence * 100)}%)`);
console.log(`TARGET    ${product.targetAudience}`);
if (product.attributes.length) console.log(`ATRIBUT   ${product.attributes.join(" | ")}`);
console.log("");

/*
 * Peringatan ini sengaja dibuat mencolok. Keluaran template tetap terlihat
 * wajar sekilas, sehingga mudah dikira hasil Gemini padahal isinya hanya lima
 * kalimat tetap yang diputar ulang.
 */
if (result.degraded) {
  const garis = "=".repeat(72);
  console.log(garis);
  console.log("  INI BUKAN HASIL GEMINI — memakai template lama");
  console.log(`  Sebab: ${result.reason}`);
  console.log("  Varian akan terasa berulang dan tidak menyebut detail produk.");
  console.log("  Jalankan: node scripts/generate-script.mjs --list-models");
  console.log(`${garis}\n`);
} else if (result.model) {
  console.log(`MODEL     ${result.model}\n`);
}

for (const variant of variants) {
  const tanda = variant.policy.blocking ? "DITOLAK " : variant.policy.safe ? "        " : "PERIKSA ";
  console.log(`${tanda}#${String(variant.rank).padStart(2)}  skor ${String(variant.score).padStart(5)}  [${variant.angle}]`);
  console.log(`          HOOK    ${variant.hook}  (${variant.wordCount} kata)`);
  if (variant.benefit) console.log(`          MANFAAT ${variant.benefit}`);
  if (variant.cta) console.log(`          CTA     ${variant.cta}`);
  if (variant.visualHint) console.log(`          VISUAL  ${variant.visualHint}`);
  for (const violation of variant.policy.violations) {
    console.log(`          ! ${violation.label} — "${violation.matched}"`);
    console.log(`            ${violation.hint}`);
  }
  console.log("");
}

console.log(`RINGKASAN  ${summary.usable}/${summary.total} varian layak pakai, ${summary.blocked} ditolak kebijakan, ${summary.flagged} perlu diperiksa`);
console.log(`SUDUT      ${summary.angles.join(", ")}`);
console.log(`RENCANA    ${cost.plan.duration} detik = ${cost.plan.aiSeconds} detik AI + ${cost.plan.photoSeconds} detik foto bermotion`);
console.log(`BIAYA      script Rp 0 — video baru ~Rp ${cost.videoIfApproved.idr.toLocaleString("id-ID")} ($${cost.videoIfApproved.usd}) setelah kamu memilih varian`);
