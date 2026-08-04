#!/usr/bin/env node
/*
 * Merakit satu video iklan dari proyek yang sudah lengkap.
 *
 * Klip boleh berasal dari mana saja — unduhan Flow, hasil API, atau rekaman
 * sendiri. Skrip ini hanya peduli setiap shot punya berkas sumber.
 *
 *   node scripts/make-video.mjs --project "F:\videos\kemeja-oversize"
 */

import { createRequire } from "node:module";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const require = createRequire(import.meta.url);
const { resolveAssets } = require("../video-project.js");
const { buildConcatArgs, buildFinalArgs, buildSrt, concatListContent, finalWorkDir, planAssembly } = require("../video-assembler.js");
const { planSubtitles } = require("../subtitle-planner.js");
const { synthesizeVoice } = require("../voice-engine.js");

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

if (args.help || !args.project) {
  console.log(`Pemakaian:
  node scripts/make-video.mjs --project "<folder proyek>" [opsi]

Opsi:
  --project <folder>  Folder proyek dari plan-video.mjs (wajib)
  --music <berkas>    Musik latar (opsional)
  --quality <nama>    high | balanced | fast (default balanced)
  --no-voice          Lewati voiceover
  --ffmpeg <jalur>    Jalur ffmpeg bila tidak ada di PATH`);
  process.exit(args.project ? 0 : 1);
}

const ffmpeg = args.ffmpeg || process.env.FFMPEG_PATH || "ffmpeg";

function run(command, commandArgs, label, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, commandArgs, { windowsHide: true, ...options });
    let stderr = "";
    child.stderr.on("data", chunk => { stderr += chunk; });
    child.on("error", error => reject(
      error.code === "ENOENT"
        ? new Error(`FFmpeg tidak ditemukan di "${command}". Jalankan install-ffmpeg.bat atau pakai --ffmpeg <jalur>.`)
        : error
    ));
    child.on("exit", code => code === 0
      ? resolve()
      : reject(new Error(`${label} gagal (exit ${code}).\n${stderr.trim().slice(-1200)}`)));
  });
}

const project = resolveAssets(path.resolve(args.project));

console.log(`PROYEK   ${project.paths.root}`);
console.log(`PRODUK   ${project.manifest.product.title}`);
console.log(`HOOK     ${project.manifest.variant.hook}\n`);

/*
 * Perakitan dihentikan bila ada shot yang belum punya berkas. Video yang
 * kehilangan satu bagian di tengah lebih membingungkan daripada kegagalan yang
 * menyebut persis apa yang belum ada.
 */
if (!project.ready) {
  console.error("BELUM LENGKAP. Yang masih kurang:\n");
  for (const item of project.missing) console.error(`  ${item.shot}  →  ${item.expected}`);
  console.error(`\nKlip  : ${project.paths.clips}`);
  console.error(`Foto  : ${project.paths.photos}`);
  console.error(`\nPrompt untuk membuat klip ada di ${project.paths.prompts}`);
  process.exit(1);
}

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "aios-rakit-"));
const variant = project.manifest.variant;
const duration = project.manifest.plan.duration;
const outputPath = path.join(project.paths.output, `${path.basename(project.paths.root)}.mp4`);

try {
  const rencana = planAssembly(project.shots, { workDir, quality: args.quality || "balanced" });

  for (const [index, segment] of rencana.segments.entries()) {
    const shot = segment.shot;
    process.stdout.write(`\rMerender shot ${index + 1}/${rencana.segments.length} (${shot.kind}, ${shot.duration} detik)   `);
    await run(ffmpeg, segment.args, `Render ${shot.id}`);
  }
  console.log("\n");

  const listPath = path.join(workDir, "concat.txt");
  fs.writeFileSync(listPath, concatListContent(rencana.parts));
  const gabungan = path.join(workDir, "gabungan.mp4");
  console.log("Menyambung potongan...");
  await run(ffmpeg, buildConcatArgs({ listPath, output: gabungan }), "Concat");

  let voicePath = null;
  if (!args["no-voice"]) {
    const teks = [variant.hook, variant.benefit, variant.cta].filter(Boolean).join(" ");
    voicePath = path.join(workDir, "voice.mp3");
    try {
      console.log("Membuat voiceover...");
      const provider = await synthesizeVoice({ text: teks, output: voicePath, workDir, preset: "affiliate" });
      console.log(`  suara: ${provider}`);
    } catch (error) {
      console.log(`  dilewati: ${error.message}`);
      voicePath = null;
    }
  }

  const subtitles = planSubtitles({
    script: { hook: variant.hook, benefit: variant.benefit, cta: variant.cta },
    duration,
    platform: "meta"
  });
  const srtPath = path.join(workDir, "subtitle.srt");
  fs.writeFileSync(srtPath, buildSrt(subtitles.cues), "utf8");

  fs.mkdirSync(project.paths.output, { recursive: true });
  console.log("Menempelkan suara dan teks...");
  await run(ffmpeg, buildFinalArgs({
    videoPath: gabungan,
    voicePath,
    musicPath: args.music || null,
    srtPath,
    output: outputPath,
    duration,
    quality: args.quality || "balanced"
  }), "Render akhir", { cwd: finalWorkDir({ srtPath }) });

  const ukuran = fs.statSync(outputPath).size;
  console.log(`\nSELESAI  ${outputPath}`);
  console.log(`         ${duration} detik, ${(ukuran / 1024 / 1024).toFixed(1)} MB, 1080x1920`);
  console.log(`         ${project.counts.aiShots} klip + ${project.counts.photoShots} foto${voicePath ? " + voiceover" : ""}${args.music ? " + musik" : ""}`);
} catch (error) {
  try { if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { force: true }); } catch {}
  console.error(`\nGAGAL  ${error.message}`);
  process.exit(1);
} finally {
  fs.rmSync(workDir, { recursive: true, force: true });
}
