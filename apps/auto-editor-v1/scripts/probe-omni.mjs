#!/usr/bin/env node
/*
 * Memastikan bentuk permintaan dan tanggapan Gemini Omni sebelum biaya
 * generate yang sebenarnya dikeluarkan.
 *
 * Dokumentasi resmi Interactions API tidak dapat diambil saat modul ini
 * ditulis, sehingga bentuk yang dipakai omni-client.js disusun dari sumber
 * sekunder. Skrip ini membuat satu klip satu detik — panggilan termurah yang
 * mungkin — lalu mencetak struktur tanggapan apa adanya, sehingga penyesuaian
 * yang diperlukan bisa dilakukan sekali dan tepat.
 *
 *   GEMINI_API_KEY=xxx node scripts/probe-omni.mjs
 */

import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { createOmniClient, extractVideo, readStatus } = require("../omni-client.js");

const apiKey = process.env.GEMINI_API_KEY || "";
if (!apiKey) {
  console.error("GEMINI_API_KEY belum diset.");
  process.exit(1);
}

const model = process.env.GEMINI_VIDEO_MODEL || undefined;
const klien = createOmniClient({ apiKey, model, pollIntervalMs: 5000 });

console.log(`Model   ${klien.model}`);
console.log(`Endpoint ${klien.endpoint}/interactions`);
console.log("Mengirim satu klip 1 detik (panggilan termurah)...\n");

function ringkas(nilai, kedalaman = 0) {
  const spasi = "  ".repeat(kedalaman + 1);
  if (Array.isArray(nilai)) {
    if (!nilai.length) return "[]";
    return `[ ${nilai.length} item ]\n${spasi}${ringkas(nilai[0], kedalaman + 1)}`;
  }
  if (nilai && typeof nilai === "object") {
    return Object.entries(nilai)
      .map(([kunci, isi]) => {
        const tipe = Array.isArray(isi) ? "array" : isi === null ? "null" : typeof isi;
        const potongan = tipe === "string" ? ` "${String(isi).slice(0, 60)}"` : tipe === "object" || tipe === "array" ? "" : ` ${isi}`;
        const anak = (tipe === "object" || tipe === "array") ? `\n${spasi}${ringkas(isi, kedalaman + 1)}` : "";
        return `${spasi}${kunci}: ${tipe}${potongan}${anak}`;
      })
      .join("\n");
  }
  return String(nilai);
}

try {
  const awal = await klien.probe();
  console.log("TANGGAPAN AWAL");
  console.log(`  id     ${awal.interactionId || "(tidak ada)"}`);
  console.log(`  status ${awal.status}`);
  console.log(`  kunci  ${awal.keys.join(", ")}\n`);
  console.log("STRUKTUR");
  console.log(ringkas(awal.raw));
  console.log("");

  if (!awal.interactionId) {
    console.log("PERINGATAN Tidak ada id interaksi, jadi status tidak bisa ditanyakan.");
    console.log("           Sesuaikan readInteractionId() di omni-client.js.");
    process.exit(2);
  }

  console.log("Menunggu klip selesai...");
  const selesai = await klien.waitUntilDone(awal.raw, {
    onProgress: ({ seconds }) => process.stdout.write(`\r  ${seconds} detik...`)
  });
  console.log("\n");
  console.log(`STATUS AKHIR ${readStatus(selesai)}\n`);
  console.log("STRUKTUR AKHIR");
  console.log(ringkas(selesai));
  console.log("");

  try {
    const video = extractVideo(selesai);
    console.log(`BERHASIL Video terbaca sebagai ${video.kind}${video.uri ? `: ${video.uri}` : ` (${String(video.data).length} karakter base64)`}`);
    console.log("         Bentuk API cocok. Tahap generate siap dipakai.");
  } catch (error) {
    console.log(`GAGAL DIBACA ${error.message}`);
    console.log(`             kunci: ${(error.received || []).join(", ")}`);
    console.log("             Tempel struktur di atas supaya extractVideo() disesuaikan.");
    process.exit(3);
  }
} catch (error) {
  console.error(`\nGAGAL [${error.diagnostic?.code || "UNKNOWN"}] ${error.message}`);
  if (error.sample) console.error(`\nContoh tanggapan:\n${error.sample}`);
  if (error.diagnostic?.code === "MODEL_NOT_FOUND") {
    console.error("\nCoba ganti model lewat GEMINI_VIDEO_MODEL, atau lihat daftar model:");
    console.error("  node scripts/generate-script.mjs --list-models");
  }
  process.exit(1);
}
