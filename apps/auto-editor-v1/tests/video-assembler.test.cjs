"use strict";
const assert = require("node:assert/strict");
const {
  baseName, buildConcatArgs, buildFinalArgs, buildSegmentArgs, buildSrt,
  clipFilter, concatListContent, finalWorkDir, photoFilter, planAssembly, srtTimestamp
} = require("../video-assembler");

const klip = { id: "shot-1", kind: "ai", duration: 4.5, sourcePath: "/p/clips/shot-1.mp4" };
const foto = { id: "shot-3", kind: "photo", duration: 4.5, motion: "punch-in", sourcePath: "/p/photos/produk.jpg" };

/*
 * Setiap potongan wajib membawa jalur audio senyap. Menyambung potongan yang
 * sebagian bersuara dan sebagian tidak membuat concat menggeser audio atau
 * menjatuhkan salah satu jalur tanpa peringatan apa pun.
 */
for (const shot of [klip, foto]) {
  const args = buildSegmentArgs(shot, { output: "/tmp/part.mp4" });
  assert.ok(args.join(" ").includes("anullsrc"), `${shot.id} harus punya jalur audio senyap`);
  assert.ok(args.includes("-t") && args[args.indexOf("-t") + 1] === "4.5");
  assert.equal(args[args.length - 1], "/tmp/part.mp4");
  assert.ok(args.includes("yuv420p"), "pixel format harus dipaksa agar bisa diputar di semua pemutar");
}

assert.ok(buildSegmentArgs(foto, { output: "o.mp4" }).includes("-loop"), "foto harus di-loop agar punya durasi");
assert.ok(!buildSegmentArgs(klip, { output: "o.mp4" }).includes("-loop"));
assert.throws(() => buildSegmentArgs({ id: "x", kind: "ai", duration: 3 }, { output: "o.mp4" }), /tidak punya berkas sumber/);

// Semua sumber diseragamkan ke bingkai vertikal yang sama sebelum disambung.
assert.ok(clipFilter().includes("1080:1920"));
assert.ok(clipFilter().includes("crop=1080:1920"), "sumber dengan rasio lain dipotong, bukan diberi bar hitam");
assert.ok(clipFilter({ fps: 24 }).includes("fps=24"));

/*
 * zoompan bekerja per bingkai, sehingga laju zoom harus dihitung dari jumlah
 * bingkai. Tanpa itu gerakan pada segmen pendek terasa terlalu cepat dan pada
 * segmen panjang nyaris tidak terlihat.
 */
const pendek = photoFilter({ motion: "punch-in", duration: 2, fps: 30 });
const panjang = photoFilter({ motion: "punch-in", duration: 8, fps: 30 });
assert.ok(pendek.includes("d=60") && panjang.includes("d=240"));
const langkahPendek = Number(/zoom\+([\d.]+)/.exec(pendek)[1]);
const langkahPanjang = Number(/zoom\+([\d.]+)/.exec(panjang)[1]);
assert.ok(langkahPendek > langkahPanjang, "segmen pendek butuh langkah zoom lebih besar untuk jarak yang sama");
assert.ok(photoFilter({ motion: "slow-pan", duration: 4 }).includes("on/"), "pan bergantung pada nomor bingkai");
assert.ok(photoFilter({ motion: "hold", duration: 4 }).includes("zoompan"));
assert.ok(photoFilter({ motion: "tidak-dikenal", duration: 4 }).includes("zoompan"), "preset asing jatuh ke bawaan");
assert.doesNotThrow(() => photoFilter({ motion: "punch-in", duration: 0.01, fps: 30 }));

// Nama berkas dengan spasi dan kutip lazim di Windows dan harus tetap aman.
assert.equal(concatListContent(["/a/b c.mp4"]), "file '/a/b c.mp4'");
assert.ok(concatListContent(["C:\\video\\a.mp4"]).includes("C:/video/a.mp4"), "pemisah Windows diseragamkan");
assert.ok(concatListContent(["/a/o'brien.mp4"]).includes("'\\''"), "kutip tunggal harus dilolosi");
assert.deepEqual(buildConcatArgs({ listPath: "/tmp/l.txt", output: "/tmp/o.mp4" }).slice(0, 6), ["-y", "-f", "concat", "-safe", "0", "-i"]);

// Waktu SRT.
assert.equal(srtTimestamp(0), "00:00:00,000");
assert.equal(srtTimestamp(2.4), "00:00:02,400");
assert.equal(srtTimestamp(75.25), "00:01:15,250");
assert.equal(srtTimestamp(-5), "00:00:00,000");

const srt = buildSrt([
  { start: 0, end: 2.4, text: "Ternyata gak perlu bayar mahal" },
  { start: 2.4, end: 16, text: "" },
  { start: 16, end: 18, text: "Cek keranjang kuning" }
]);
assert.ok(srt.startsWith("1\n00:00:00,000 --> 00:00:02,400"));
assert.ok(srt.includes("2\n00:00:16,000"), "cue kosong dilewati dan penomoran tetap rapat");
assert.equal(buildSrt([]), "");

/*
 * Narasi tidak boleh tenggelam oleh musik. Pada iklan yang ditonton sambil
 * menggulir, voiceover yang tidak terdengar sama saja dengan tidak ada.
 */
const penuh = buildFinalArgs({ videoPath: "v.mp4", voicePath: "vo.mp3", musicPath: "m.mp3", srtPath: "s.srt", output: "final.mp4" });
const rantai = penuh[penuh.indexOf("-filter_complex") + 1];
assert.ok(rantai.includes("volume=0.18"), "musik diturunkan di bawah narasi");
assert.ok(rantai.includes("normalize=0"), "amix tanpa normalize agar narasi tidak ikut turun");
assert.ok(rantai.includes("subtitles="));

/*
 * Di dalam filter_complex, titik dua memisahkan opsi. Jalur Windows seperti
 * "C:/Users/..." terbaca sebagai berkas "C" diikuti opsi "/Users/...", dan
 * FFmpeg gagal dengan keluhan menyesatkan tentang ukuran gambar. Karena itu
 * subtitle dirujuk hanya dengan nama berkasnya.
 */
for (const srt of ["C:\\Users\\Neiq\\AppData\\Local\\Temp\\aios-rakit-x\\subtitle.srt", "/tmp/aios/subtitle.srt", "F:/Projects/sub folder/subtitle.srt"]) {
  const args = buildFinalArgs({ videoPath: "v.mp4", srtPath: srt, output: "o.mp4" });
  const chain = args[args.indexOf("-filter_complex") + 1];
  const rujukan = chain.split("subtitles=")[1].split(":force_style")[0];
  assert.equal(rujukan, "subtitle.srt", `jalur bocor ke rantai filter: ${rujukan}`);
  assert.ok(!/[A-Za-z]:/.test(rujukan), "huruf drive tidak boleh masuk rantai filter");
}

// path.basename bergantung platform dan meloloskan jalur Windows saat berjalan
// di Linux, sehingga pemisahan harus mengenali kedua pemisah.
assert.equal(baseName("C:\\a\\b\\subtitle.srt"), "subtitle.srt");
assert.equal(baseName("/tmp/a/subtitle.srt"), "subtitle.srt");
assert.equal(baseName("subtitle.srt"), "subtitle.srt");

// Direktori kerja harus menunjuk tempat berkas subtitle berada.
assert.ok(finalWorkDir({ srtPath: "/tmp/aios/subtitle.srt" }).endsWith("aios"));
assert.equal(finalWorkDir({}), undefined, "tanpa subtitle tidak perlu memindah direktori kerja");
assert.ok(penuh.includes("[v]") && penuh.includes("[a]"));

/*
 * Panjang keluaran dipatok pada durasi rencana, bukan pada stream terpendek.
 * "-shortest" memotong keluaran begitu stream terpendek habis, dan voiceover
 * hampir selalu lebih pendek daripada videonya — sehingga penutup ikut hilang,
 * justru di tempat CTA berada.
 */
const dipatok = buildFinalArgs({ videoPath: "v.mp4", voicePath: "vo.mp3", srtPath: "s.srt", output: "o.mp4", duration: 18 });
assert.ok(!dipatok.includes("-shortest"), "-shortest memotong video mengikuti voiceover yang lebih pendek");
assert.equal(dipatok[dipatok.indexOf("-t") + 1], "18");
assert.ok(dipatok.indexOf("-t") > dipatok.indexOf("-c:v"), "-t harus berlaku pada keluaran, bukan pada masukan");

// Tanpa durasi, tidak ada pemotongan yang dipaksakan.
assert.ok(!buildFinalArgs({ videoPath: "v.mp4", output: "o.mp4" }).includes("-t"));
assert.ok(!buildFinalArgs({ videoPath: "v.mp4", output: "o.mp4", duration: 0 }).includes("-t"));

// Potongan per shot tetap memakai -shortest: sumber anullsrc tidak berujung,
// jadi tanpa itu render tidak akan pernah selesai.
assert.ok(buildSegmentArgs(foto, { output: "o.mp4" }).includes("-shortest"));

// Setiap gabungan sumber suara harus menghasilkan perintah yang sah.
const tanpaMusik = buildFinalArgs({ videoPath: "v.mp4", voicePath: "vo.mp3", output: "o.mp4" });
assert.equal(tanpaMusik[tanpaMusik.indexOf("-map") + 1], "0:v");
assert.ok(tanpaMusik.includes("1:a"));
assert.ok(!tanpaMusik.includes("-filter_complex"), "tanpa subtitle dan musik tidak perlu rantai filter");

const tanpaSuara = buildFinalArgs({ videoPath: "v.mp4", srtPath: "s.srt", output: "o.mp4" });
assert.ok(!tanpaSuara.includes("-c:a"), "tanpa audio jangan sisipkan encoder audio");
assert.equal(tanpaSuara.filter(item => item === "-map").length, 1);

const musikSaja = buildFinalArgs({ videoPath: "v.mp4", musicPath: "m.mp3", output: "o.mp4" });
assert.ok(musikSaja[musikSaja.indexOf("-filter_complex") + 1].includes("[1:a]volume="));

// Rencana perakitan menamai potongan secara berurutan agar concat mengikuti
// urutan shot, bukan urutan abjad direktori.
const rencana = planAssembly([klip, foto, { ...foto, id: "shot-4" }], { workDir: "/tmp/kerja" });
assert.equal(rencana.parts.length, 3);
assert.ok(rencana.parts[0].endsWith("part-000.mp4"));
assert.ok(rencana.parts[2].endsWith("part-002.mp4"));
assert.deepEqual([...rencana.parts].sort(), rencana.parts, "urutan abjad harus sama dengan urutan shot");
assert.equal(rencana.totalDuration, 13.5);

console.log("video assembler tests passed");
