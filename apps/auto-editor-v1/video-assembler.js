"use strict";

/*
 * Menyusun perintah FFmpeg untuk merakit satu video iklan.
 *
 * Penyusunan perintah dipisahkan dari pelaksanaannya. Kesalahan pada rantai
 * filter FFmpeg baru terlihat setelah proses berjalan lama dan pesan galatnya
 * jarang menunjuk penyebabnya, sedangkan sebagai fungsi murni seluruh argumen
 * dapat diperiksa tanpa merender apa pun.
 *
 * Perakitan berlangsung dua tahap: setiap shot dirender lebih dulu menjadi
 * potongan berukuran seragam, baru disambung. Menyambung sumber dengan resolusi
 * dan laju bingkai berbeda dalam satu rantai filter jauh lebih rapuh, dan bila
 * satu shot gagal, tahap dua membuat kegagalan itu jelas milik shot mana.
 */

const path = require("path");

const DEFAULT_WIDTH = 1080;
const DEFAULT_HEIGHT = 1920;
const DEFAULT_FPS = 30;

const QUALITY_ARGS = Object.freeze({
  high: Object.freeze(["-crf", "18", "-preset", "slow"]),
  balanced: Object.freeze(["-crf", "22", "-preset", "medium"]),
  fast: Object.freeze(["-crf", "26", "-preset", "veryfast"])
});

/*
 * Gerakan pada foto sengaja tegas. Ken burns yang lambat membuat iklan terasa
 * mati di feed, dan foto diam praktis menjamin penonton menggulir lewat.
 */
const MOTION_PRESETS = Object.freeze({
  "punch-in": Object.freeze({ from: 1.0, to: 1.18, drift: 0 }),
  "slow-pan": Object.freeze({ from: 1.12, to: 1.12, drift: 0.08 }),
  hold: Object.freeze({ from: 1.04, to: 1.04, drift: 0 })
});

const escapePath = value => String(value).replace(/\\/g, "/").replace(/'/g, "'\\''");

// path.basename bergantung platform: di Linux ia tidak mengenali "\" sebagai
// pemisah, sehingga jalur Windows lolos utuh. Pemisahan manual berlaku di mana
// pun, dan itu penting karena jalur yang lolos ke rantai filter justru
// kegagalan yang ingin dicegah.
const baseName = value => String(value).split(/[\\/]/).pop();
const round = value => Number((Number(value) || 0).toFixed(3));

function qualityArgs(quality) {
  return [...(QUALITY_ARGS[quality] || QUALITY_ARGS.balanced)];
}

/*
 * zoompan bekerja per bingkai, sehingga laju perubahan zoom harus dihitung dari
 * jumlah bingkai segmen, bukan dari durasinya. Tanpa itu gerakan pada segmen
 * pendek terasa terlalu cepat dan pada segmen panjang nyaris tak terlihat.
 */
function photoFilter({ motion = "punch-in", duration, width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, fps = DEFAULT_FPS } = {}) {
  const preset = MOTION_PRESETS[motion] || MOTION_PRESETS["punch-in"];
  const frames = Math.max(1, Math.round(duration * fps));
  const step = frames > 1 ? round((preset.to - preset.from) / (frames - 1)) : 0;
  const zoom = step > 0 ? `min(zoom+${step},${preset.to})` : String(preset.from);
  const x = preset.drift
    ? `iw/2-(iw/zoom/2)+(on/${frames}-0.5)*iw*${preset.drift}`
    : "iw/2-(iw/zoom/2)";
  return [
    `scale=${width * 2}:${height * 2}:force_original_aspect_ratio=increase`,
    `crop=${width * 2}:${height * 2}`,
    `zoompan=z='${zoom}':x='${x}':y='ih/2-(ih/zoom/2)':d=${frames}:s=${width}x${height}:fps=${fps}`,
    "setsar=1"
  ].join(",");
}

function clipFilter({ width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, fps = DEFAULT_FPS } = {}) {
  return [
    `scale=${width}:${height}:force_original_aspect_ratio=increase`,
    `crop=${width}:${height}`,
    `fps=${fps}`,
    "setsar=1"
  ].join(",");
}

/*
 * Setiap potongan membawa jalur audio senyap. Menyambung potongan yang sebagian
 * bersuara dan sebagian tidak membuat concat menggeser audio atau menjatuhkan
 * salah satu jalur tanpa peringatan.
 */
function buildSegmentArgs(shot, options = {}) {
  const { width = DEFAULT_WIDTH, height = DEFAULT_HEIGHT, fps = DEFAULT_FPS, quality = "balanced", output } = options;
  if (!shot.sourcePath) throw new Error(`Shot ${shot.id} tidak punya berkas sumber.`);
  const duration = round(shot.duration);
  const common = ["-t", String(duration), "-c:v", "libx264", ...qualityArgs(quality), "-pix_fmt", "yuv420p", "-c:a", "aac", "-ar", "48000", "-ac", "2", "-shortest", output];

  if (shot.kind === "photo") {
    return ["-y", "-loop", "1", "-i", shot.sourcePath,
      "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
      "-vf", photoFilter({ motion: shot.motion, duration, width, height, fps }), ...common];
  }
  return ["-y", "-i", shot.sourcePath,
    "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
    "-vf", clipFilter({ width, height, fps }),
    "-map", "0:v:0", "-map", "1:a:0", ...common];
}

function buildConcatArgs({ listPath, output }) {
  return ["-y", "-f", "concat", "-safe", "0", "-i", listPath, "-c", "copy", output];
}

function concatListContent(parts) {
  return parts.map(file => `file '${escapePath(file)}'`).join("\n");
}

function srtTimestamp(seconds) {
  const total = Math.max(0, Number(seconds) || 0);
  const jam = String(Math.floor(total / 3600)).padStart(2, "0");
  const menit = String(Math.floor((total % 3600) / 60)).padStart(2, "0");
  const detik = String(Math.floor(total % 60)).padStart(2, "0");
  const milidetik = String(Math.round((total % 1) * 1000)).padStart(3, "0");
  return `${jam}:${menit}:${detik},${milidetik}`;
}

function buildSrt(cues = []) {
  return cues
    .filter(cue => cue && String(cue.text || "").trim())
    .map((cue, index) => `${index + 1}\n${srtTimestamp(cue.start)} --> ${srtTimestamp(cue.end)}\n${String(cue.text).trim()}\n`)
    .join("\n");
}

/*
 * Tahap akhir menempelkan suara dan teks. Voiceover dan musik dicampur dengan
 * normalize dimatikan supaya tingkat suara narasi tidak ikut turun ketika musik
 * ditambahkan; pada iklan yang ditonton sambil menggulir, narasi yang tenggelam
 * sama saja dengan tidak ada narasi.
 */
// Direktori kerja yang harus dipakai saat menjalankan perintah dari
// buildFinalArgs, agar rujukan nama berkas subtitle dapat ditemukan.
function finalWorkDir({ srtPath } = {}) {
  return srtPath ? path.dirname(srtPath) : undefined;
}

function buildFinalArgs({ videoPath, voicePath, musicPath, srtPath, output, duration, quality = "balanced", musicVolume = 0.18, subtitleStyle } = {}) {
  /*
   * Berkas subtitle dirujuk hanya dengan nama berkasnya, dan proses dijalankan
   * dari direktori tempat berkas itu berada.
   *
   * Di dalam filter_complex, titik dua memisahkan opsi. Jalur Windows seperti
   * "C:/Users/..." karena itu terbaca sebagai nama berkas "C" diikuti opsi
   * "/Users/...", dan FFmpeg gagal dengan keluhan yang menyesatkan tentang
   * ukuran gambar. Melolosi titik dua bisa saja, tetapi aturan pelolosan
   * berlapis pada filter FFmpeg mudah salah; nama berkas polos tidak
   * mengandung satu pun karakter yang perlu dilolosi.
   */
  const args = ["-y", "-i", videoPath];
  if (voicePath) args.push("-i", voicePath);
  if (musicPath) args.push("-i", musicPath);

  const filters = [];
  const voiceIndex = voicePath ? 1 : null;
  const musicIndex = musicPath ? (voicePath ? 2 : 1) : null;

  if (srtPath) {
    const style = subtitleStyle || "FontSize=16,Outline=2,Shadow=0,Alignment=2,MarginV=90";
    filters.push(`[0:v]subtitles=${baseName(srtPath)}:force_style='${style}'[v]`);
  }

  let audioLabel = null;
  if (voiceIndex !== null && musicIndex !== null) {
    filters.push(`[${musicIndex}:a]volume=${musicVolume}[bg]`);
    filters.push(`[${voiceIndex}:a][bg]amix=inputs=2:duration=first:normalize=0[a]`);
    audioLabel = "[a]";
  } else if (voiceIndex !== null) {
    audioLabel = `${voiceIndex}:a`;
  } else if (musicIndex !== null) {
    filters.push(`[${musicIndex}:a]volume=${musicVolume}[a]`);
    audioLabel = "[a]";
  }

  if (filters.length) args.push("-filter_complex", filters.join(";"));
  args.push("-map", srtPath ? "[v]" : "0:v");
  if (audioLabel) args.push("-map", audioLabel);

  args.push("-c:v", "libx264", ...qualityArgs(quality), "-pix_fmt", "yuv420p");
  if (audioLabel) args.push("-c:a", "aac", "-ar", "48000", "-ac", "2");
  /*
   * Panjang keluaran dipatok pada durasi rencana, bukan pada stream terpendek.
   *
   * "-shortest" memotong keluaran begitu stream terpendek habis. Voiceover
   * hampir selalu lebih pendek daripada videonya, sehingga bagian penutup ikut
   * terpotong — dan justru di sanalah CTA berada. Dengan "-t", audio yang lebih
   * pendek cukup menyisakan hening di ekor, dan audio yang lebih panjang
   * dipangkas mengikuti video.
   */
  if (Number(duration) > 0) args.push("-t", String(round(duration)));
  args.push(output);
  return args;
}

function segmentFileName(index) {
  return `part-${String(index).padStart(3, "0")}.mp4`;
}

function planAssembly(shots, options = {}) {
  const workDir = options.workDir || ".";
  const segments = shots.map((shot, index) => {
    const output = path.join(workDir, segmentFileName(index));
    return { shot, output, args: buildSegmentArgs(shot, { ...options, output }) };
  });
  return {
    segments,
    parts: segments.map(item => item.output),
    totalDuration: round(shots.reduce((sum, shot) => sum + (Number(shot.duration) || 0), 0))
  };
}

module.exports = {
  DEFAULT_FPS,
  DEFAULT_HEIGHT,
  DEFAULT_WIDTH,
  MOTION_PRESETS,
  QUALITY_ARGS,
  buildConcatArgs,
  baseName,
  buildFinalArgs,
  finalWorkDir,
  buildSegmentArgs,
  buildSrt,
  clipFilter,
  concatListContent,
  photoFilter,
  planAssembly,
  qualityArgs,
  segmentFileName,
  srtTimestamp
};
