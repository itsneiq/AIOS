#!/usr/bin/env node
/*
 * Menyiapkan folder proyek video dari satu varian script terpilih.
 *
 * Skrip ini tidak membuat klip dan tidak memanggil API video sama sekali,
 * sehingga tidak ada biaya yang keluar. Keluarannya adalah rencana shot dan
 * daftar prompt yang siap ditempel ke Flow, di mana kredit langganan sudah
 * dibayar dan hasilnya bisa dilihat sebelum dipakai.
 *
 *   GEMINI_API_KEY=xxx node scripts/plan-video.mjs \
 *     --title "Kemeja Oversize Pria" --desc "katun adem" --pick 1 --out F:\videos
 */

import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const { planScripts } = require("../script-pipeline.js");
const { masterImageOptions, planShots } = require("../shot-planner.js");
const { createGeminiClient } = require("../gemini-client.js");
const { createProject, slug } = require("../video-project.js");

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

if (args.help || !args.title) {
  console.log(`Pemakaian:
  node scripts/plan-video.mjs --title "<nama produk>" [opsi]

Opsi:
  --title <teks>     Nama produk (wajib)
  --desc <teks>      Deskripsi produk
  --pick <angka>     Varian ke berapa yang dipakai (default 1, yang skornya tertinggi)
  --out <folder>     Folder induk proyek (default ./projects)
  --duration <detik> Durasi video (default 18)
  --ai <detik>       Porsi yang dibuat AI (default: seluruh durasi)
  --count <angka>    Jumlah varian yang dibuat sebelum memilih (default 12)
  --masters <angka>  Jumlah pilihan master image (default 2)
  --scene <id>       Paksa set visual tertentu, mis. rooftop-sore
  --platform <nama>  meta | shopee | tiktok (default meta)

Tidak ada biaya video yang keluar di tahap ini. Prompt yang dihasilkan
ditempel ke Flow, lalu klipnya diunduh ke folder clips/ pada proyek.`);
  process.exit(args.title ? 0 : 1);
}

const apiKey = process.env.GEMINI_API_KEY || "";
const client = apiKey ? createGeminiClient({ apiKey, model: process.env.GEMINI_TEXT_MODEL || undefined }) : null;
if (!client) console.warn("PERINGATAN GEMINI_API_KEY belum diset — varian memakai template lama.\n");

const duration = Number(args.duration) || 18;
/*
 * Seluruh durasi dibuat AI kecuali diminta lain.
 *
 * Jatah AI dulu dibatasi setengah durasi untuk menghemat, karena API video
 * menagih per detik. Flow menagih per generate, jadi klip sepuluh detik dan
 * klip empat detik sama harganya dan penghematan itu tidak ada lagi. Porsi foto
 * sekarang dipakai karena alasan isinya — kemasan yang harus terbaca, atau foto
 * asli yang lebih meyakinkan — bukan karena biaya, dan itu keputusan pemakai
 * lewat --ai.
 */
const aiSeconds = args.ai === undefined ? duration : Number(args.ai);

const hasil = await planScripts({
  title: args.title,
  description: args.desc || "",
  count: Number(args.count) || undefined,
  duration,
  aiSeconds,
  platform: args.platform || "meta"
}, client);

const pick = Math.max(1, Math.min(hasil.variants.length, Number(args.pick) || 1));
const variant = hasil.variants[pick - 1];

if (!variant) {
  console.error("Tidak ada varian yang bisa dipakai.");
  process.exit(1);
}
/*
 * Ajakan yang tidak mungkin diikuti penontonnya tidak melanggar kebijakan apa
 * pun, sehingga lolos saringan lain. Menyuruh penonton Meta menekan keranjang
 * berarti meminta sesuatu yang tidak ada di layar.
 */
if (variant.ctaCheck && !variant.ctaCheck.valid) {
  console.error(`Varian #${pick} memakai ajakan yang tidak ada di ${variant.ctaCheck.platform}: "${variant.ctaCheck.matched}"`);
  console.error(`  ${variant.ctaCheck.reason}`);
  console.error(`  Ganti dengan yang seperti: "${variant.ctaCheck.suggestion}"`);
  console.error("Pilih varian lain dengan --pick.");
  process.exit(1);
}
if (variant.policy.blocking) {
  console.error(`Varian #${pick} melanggar kebijakan Meta dan kemungkinan besar ditolak:`);
  for (const violation of variant.policy.violations) console.error(`  ${violation.label} — "${violation.matched}"`);
  console.error("Pilih varian lain dengan --pick, atau perbaiki kalimatnya dulu.");
  process.exit(1);
}

const plan = planShots({ variant, product: hasil.product, photos: [], duration, aiSeconds, sceneId: args.scene || undefined });
const masters = masterImageOptions({ product: hasil.product, variant, count: Number(args.masters) || 2 });
const root = path.resolve(args.out || "projects", slug(hasil.product.title));
const { paths } = createProject(root, { plan, variant, product: hasil.product, masters });

console.log(`PRODUK    ${hasil.product.title}`);
console.log(`KATEGORI  ${hasil.product.category}`);
console.log(`PLATFORM  ${(args.platform || "meta")}`);
console.log(`VARIAN    #${pick} skor ${variant.score} [${variant.angle}]`);
console.log(`  hook    ${variant.hook}`);
if (variant.agitate) console.log(`  agitate ${variant.agitate}`);
if (variant.solve || variant.benefit) console.log(`  solve   ${variant.solve || variant.benefit}`);
console.log(`  cta     ${variant.cta}\n`);

console.log(`SET VISUAL  ${plan.scene.id} — ${plan.scene.world}`);
console.log(`            ${plan.scene.lighting}\n`);

console.log("RENCANA SHOT");
for (const shot of plan.shots) {
  const label = shot.kind === "ai" ? "AI   " : "foto ";
  console.log(`  ${label} ${String(shot.start).padStart(5)}–${String(shot.end).padEnd(5)} ${shot.role.padEnd(8)} ${shot.kind === "ai" ? `→ clips/shot-?.mp4` : shot.motion}`);
}
console.log(`\n  ${plan.aiCalls} klip AI (${plan.aiSeconds} detik) + ${plan.photoSeconds} detik foto bermotion\n`);

console.log(`PROYEK    ${paths.root}`);
console.log(`          ${paths.prompts}\n`);

console.log("LANGKAH BERIKUTNYA");
console.log(`  1. Taruh foto produk di   ${paths.photos}`);
console.log(`  2. Buka ${paths.prompts}`);
console.log(`  3. TAHAP 1 — generate ${masters.length} pilihan master image, pilih satu`);
console.log(`     Simpan sebagai          ${path.join(paths.master, "master.jpg")}`);
console.log(`  4. TAHAP 2 — pakai master itu sebagai referensi, generate klip video`);
console.log(`     Beri nama shot-1.mp4, taruh di ${paths.clips}`);
console.log(`  5. Periksa tiap klip: kalau ada tulisan nyasar di layar, generate ulang`);
console.log(`  6. Sambung, tempel caption, dan tambah musik di editor`);
/*
 * Caption sengaja tidak diminta ke Flow. Teksnya digambar, bukan diketik, dan
 * begitu jadi ia menyatu ke piksel — tidak ada lapisan yang bisa dimatikan,
 * sehingga salah eja hanya bisa diperbaiki dengan generate ulang.
 */
console.log("\nCaption ditempel di editor, bukan diminta ke Flow.");
console.log("Tidak ada biaya API video yang keluar di tahap ini.");
