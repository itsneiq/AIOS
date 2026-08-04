#!/usr/bin/env node
/*
 * Menemukan selector antarmuka Flow dan menyimpannya ke berkas konfigurasi.
 *
 * Antarmuka Flow tidak dapat diperiksa saat kode otomasi ditulis, dan
 * tata letaknya akan berubah lebih cepat daripada kode ini diperbarui.
 * Menuliskan selector sebagai tebakan tetap berarti otomasi rusak diam-diam
 * setiap kali Google memperbarui halaman.
 *
 * Skrip ini membuka Chrome sungguhan dengan profil yang menetap. Pemakai login
 * sendiri, membuka halaman pembuatan video, lalu menekan Enter di terminal.
 * Struktur halaman dibaca saat itu juga dan selector disimpan, sehingga ketika
 * Flow berubah cukup jalankan ulang skrip ini.
 *
 *   npm install playwright
 *   node scripts/flow-inspect.mjs
 */

import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";

const require = createRequire(import.meta.url);
const { discover } = require("../flow-selectors.js");

const CONFIG_PATH = path.resolve("data", "flow-selectors.json");
const PROFILE_DIR = path.resolve("data", "chrome-profile");
const FLOW_URL = process.env.FLOW_URL || "https://labs.google/fx/tools/flow";

let chromium;
try {
  ({ chromium } = require("playwright"));
} catch {
  console.error("Playwright belum terpasang. Jalankan dulu:\n\n  npm install playwright\n");
  process.exit(1);
}

/*
 * Hanya elemen yang benar-benar terlihat yang dikumpulkan. Elemen tersembunyi
 * tetap ada di DOM dan sering menyerupai yang dicari, sehingga otomasi bisa
 * menyentuh sesuatu yang tak pernah dilihat pemakai.
 */
const KUMPULKAN = `() => {
  const ambil = ["aria-label","title","placeholder","data-testid","name","id"];
  return [...document.querySelectorAll("textarea,input,button,a,video,div[role=button]")]
    .map((el, index) => {
      const kotak = el.getBoundingClientRect();
      const gaya = getComputedStyle(el);
      const attributes = {};
      for (const nama of ambil) { const nilai = el.getAttribute(nama); if (nilai) attributes[nama] = nilai; }
      return {
        index,
        tag: el.tagName.toLowerCase(),
        text: (el.innerText || el.value || "").trim().slice(0, 120),
        width: Math.round(kotak.width),
        height: Math.round(kotak.height),
        hidden: gaya.display === "none" || gaya.visibility === "hidden" || Number(gaya.opacity) === 0,
        disabled: Boolean(el.disabled),
        src: el.currentSrc || el.src || "",
        href: el.getAttribute("href") || "",
        attributes
      };
    });
}`;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

fs.mkdirSync(PROFILE_DIR, { recursive: true });
fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });

console.log("Membuka Chrome dengan profil yang menetap...");
console.log(`Profil: ${PROFILE_DIR}`);
console.log("Login cukup sekali; sesi tersimpan untuk pemakaian berikutnya.\n");

const context = await chromium.launchPersistentContext(PROFILE_DIR, {
  headless: false,
  viewport: null,
  args: ["--start-maximized"],
  ...(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {})
});

const page = context.pages()[0] || await context.newPage();
await page.goto(FLOW_URL, { waitUntil: "domcontentloaded" }).catch(() => {});

console.log("Silakan lakukan di jendela Chrome yang terbuka:");
console.log("  1. Login ke akun Google kamu");
console.log("  2. Buka proyek Flow sampai kotak isian prompt terlihat");
console.log("  3. Kembali ke sini lalu tekan Enter\n");
await rl.question("Tekan Enter kalau halaman pembuatan video sudah terbuka... ");

const elements = await page.evaluate(KUMPULKAN);
console.log(`\nMembaca ${elements.length} elemen.\n`);

const hasil = discover(elements);

for (const [role, laporan] of Object.entries(hasil.report)) {
  console.log(`${laporan.label}`);
  if (!laporan.candidates.length) {
    console.log("  (tidak ditemukan)\n");
    continue;
  }
  laporan.candidates.forEach((kandidat, index) => {
    const tanda = index === 0 ? "→" : " ";
    console.log(`  ${tanda} ${kandidat.selector}`);
    if (kandidat.text) console.log(`      "${kandidat.text}"`);
  });
  console.log("");
}

if (!hasil.complete) {
  console.log(`BELUM LENGKAP  Tidak ditemukan: ${hasil.missing.join(", ")}`);
  console.log("               Pastikan halaman pembuatan video benar-benar terbuka,");
  console.log("               lalu jalankan skrip ini lagi.\n");
}

const simpan = (await rl.question("Simpan selector ini ke konfigurasi? (y/n) ")).trim().toLowerCase();
if (simpan === "y" || simpan === "ya") {
  fs.writeFileSync(CONFIG_PATH, JSON.stringify({
    version: 1,
    discoveredAt: new Date().toISOString(),
    url: page.url(),
    selectors: hasil.selectors,
    missing: hasil.missing
  }, null, 2));
  console.log(`\nTersimpan: ${CONFIG_PATH}`);
  console.log("Periksa isinya sebelum otomasi dijalankan — selector yang salah membuat");
  console.log("otomasi menyentuh elemen yang tidak diinginkan.");
} else {
  console.log("\nTidak disimpan.");
}

await rl.close();
await context.close();
