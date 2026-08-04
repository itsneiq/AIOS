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
const { planShots } = require("../shot-planner.js");
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
  --ai <detik>       Porsi yang dibuat AI (default 9)
  --count <angka>    Jumlah varian yang dibuat sebelum memilih (default 12)

Tidak ada biaya video yang keluar di tahap ini. Prompt yang dihasilkan
ditempel ke Flow, lalu klipnya diunduh ke folder clips/ pada proyek.`);
  process.exit(args.title ? 0 : 1);
}

const apiKey = process.env.GEMINI_API_KEY || "";
const client = apiKey ? createGeminiClient({ apiKey, model: process.env.GEMINI_TEXT_MODEL || undefined }) : null;
if (!client) console.warn("PERINGATAN GEMINI_API_KEY belum diset — varian memakai template lama.\n");

const duration = Number(args.duration) || 18;
const aiSeconds = args.ai === undefined ? 9 : Number(args.ai);

const hasil = await planScripts({
  title: args.title,
  description: args.desc || "",
  count: Number(args.count) || undefined,
  duration,
  aiSeconds
}, client);

const pick = Math.max(1, Math.min(hasil.variants.length, Number(args.pick) || 1));
const variant = hasil.variants[pick - 1];

if (!variant) {
  console.error("Tidak ada varian yang bisa dipakai.");
  process.exit(1);
}
if (variant.policy.blocking) {
  console.error(`Varian #${pick} melanggar kebijakan Meta dan kemungkinan besar ditolak:`);
  for (const violation of variant.policy.violations) console.error(`  ${violation.label} — "${violation.matched}"`);
  console.error("Pilih varian lain dengan --pick, atau perbaiki kalimatnya dulu.");
  process.exit(1);
}

const plan = planShots({ variant, product: hasil.product, photos: [], duration, aiSeconds });
const root = path.resolve(args.out || "projects", slug(hasil.product.title));
const { paths } = createProject(root, { plan, variant, product: hasil.product });

console.log(`PRODUK    ${hasil.product.title}`);
console.log(`KATEGORI  ${hasil.product.category}`);
console.log(`VARIAN    #${pick} skor ${variant.score} [${variant.angle}]`);
console.log(`          ${variant.hook}\n`);

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
console.log(`  2. Buka ${paths.prompts}, tempel prompt satu per satu ke Flow`);
console.log(`  3. Unduh hasilnya, beri nama shot-1.mp4 dan seterusnya`);
console.log(`  4. Taruh di                ${paths.clips}`);
console.log(`  5. Rakit dengan            node scripts/make-video.mjs --project "${paths.root}"`);
console.log("\nTidak ada biaya API video yang keluar di tahap ini.");
