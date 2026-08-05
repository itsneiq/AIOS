"use strict";

/*
 * Membagi satu varian script menjadi daftar shot.
 *
 * Pembagiannya bukan soal hemat semata. Setiap detik yang di-generate AI
 * membawa dua risiko: biaya, dan kemungkinan detail produk berubah bentuk.
 * Foto asli tidak punya keduanya. Maka AI dipakai di tempat yang tidak bisa
 * difoto (gerakan, konteks, tangan memakai produk), dan foto dipakai di tempat
 * yang detailnya harus akurat (kemasan, teks, harga, CTA).
 *
 * Konsistensi antar klip dijaga dua cara: kontrak gaya yang sama disisipkan ke
 * setiap prompt, dan klip kedua dan seterusnya dirantai ke klip sebelumnya
 * alih-alih dibuat dari nol.
 */

const { VIDEO_MAX_SECONDS_PER_CALL } = require("./gemini-client");
const { describeScene, pickScenes, scenesFor } = require("./scene-library");
const { BEATS, directionForSpan } = require("./angle-direction");

const DEFAULT_DURATION = 18;
const DEFAULT_AI_SECONDS = 9;
const MIN_SHOT_SECONDS = 2;

/*
 * Bahasa Indonesia percakapan berjalan sekitar dua setengah kata per detik.
 * Dipakai untuk memangkas naskah yang tidak akan selesai diucapkan dalam durasi
 * klipnya — dialog yang kepanjangan bukan cuma terpotong, sinkron bibirnya ikut
 * berantakan sampai ke bagian yang sempat terucap.
 */
const WORDS_PER_SECOND = 2.5;

/*
 * Larangan teks masuk ke setiap prompt tanpa kecuali.
 *
 * Model video mengasosiasikan ucapan dengan tulisan di layar, jadi begitu ada
 * dialog ia cenderung "membantu" dengan menggambar subtitle sendiri. Yang
 * digambar bukan diketik: ejaannya kerap salah, dan bahasa Indonesia lebih
 * rawan lagi karena porsinya kecil di data latih perenderan teks.
 *
 * Yang membuat ini tidak bisa ditawar bukan seberapa seringnya, melainkan
 * bahwa teksnya menyatu ke piksel. Tidak ada lapisan yang bisa dimatikan, dan
 * satu-satunya perbaikan adalah generate ulang — yang memakan kredit.
 */
const TEXT_BAN = "Tanpa subtitle. Tanpa caption. Tanpa teks apa pun di layar. Tanpa tulisan tambahan, logo, atau watermark.";

/*
 * Pembagian waktu mengikuti formula hook - agitate - solve - cta.
 *
 * Struktur lama hanya punya hook, benefit, cta. Bagian tengahnya berupa klaim
 * datar tanpa tekanan, sehingga penonton tidak pernah diberi alasan untuk
 * peduli sebelum produk ditawarkan. Beat agitate mengisi jarak itu.
 *
 * Hook mendapat porsi kecil dengan sengaja: tugasnya menghentikan jempol, dan
 * itu selesai dalam hitungan detik.
 */
const ROLE_RATIOS = Object.freeze({
  fast: Object.freeze([0.15, 0.25, 0.35, 0.25]),
  medium: Object.freeze([0.17, 0.28, 0.33, 0.22]),
  slow: Object.freeze([0.2, 0.3, 0.32, 0.18])
});

/*
 * Hook selalu didahulukan untuk porsi AI. Tiga detik pertama menentukan apakah
 * iklan ditonton sama sekali, dan foto diam di posisi itu paling sering
 * membuat orang menggulir lewat. CTA paling akhir mendapat prioritas terendah
 * karena di sana yang dibutuhkan justru ketajaman teks dan kemasan.
 */
const AI_PRIORITY = Object.freeze([...BEATS]);

const round = value => Number((Number(value) || 0).toFixed(2));

function resolveScene({ product = {}, scene, sceneId } = {}) {
  if (scene && scene.world) return scene;
  const pool = scenesFor(product.category);
  const dipilih = sceneId && pool.find(item => item.id === sceneId);
  return dipilih || pickScenes({ category: product.category, seed: product.title || "" })[0];
}

/*
 * Kontrak gaya mengikat seluruh shot pada satu set yang sama. Keseragaman di
 * dalam satu video itulah yang membuat potongan menyambung; keragaman berlaku
 * antar produk, dan itu ditangani pemilihan set di scene-library.
 */
function styleContract({ product = {}, scene, sceneId } = {}) {
  const subject = product.title || "produk";
  const dipakai = resolveScene({ product, scene, sceneId });
  return [
    `Subjek utama: ${subject}, tampil identik dengan gambar referensi di setiap shot.`,
    describeScene(dipakai),
    "Tidak ada tulisan, logo, atau watermark tambahan di dalam gambar.",
    "Kamera stabil, gerakan halus, tanpa perpindahan gaya di tengah shot.",
    "Rasio 9:16 vertikal."
  ].join(" ");
}

/*
 * Prompt master image dibuat lebih dulu supaya kesalahan komposisi tertangkap
 * saat masih murah. Klip video kemudian berangkat dari satu gambar yang sudah
 * benar, bukan mengarang dunianya masing-masing dari foto produk berlatar
 * putih — di situlah perbedaan antar klip biasanya muncul.
 */
function buildMasterImagePrompt({ product = {}, scene, sceneId, variant = {} } = {}) {
  const dipakai = resolveScene({ product, scene, sceneId });
  const subject = product.title || "produk";
  return {
    sceneId: dipakai.id,
    prompt: [
      `Foto produk untuk iklan: ${subject}.`,
      "Pertahankan bentuk, warna, dan seluruh detail kemasan persis seperti gambar referensi yang diunggah. Jangan mengubah tulisan pada kemasan.",
      describeScene(dipakai),
      variant.visualHint ? `Nuansa yang diinginkan: ${variant.visualHint}` : "",
      "Kualitas foto komersial, fokus tajam pada produk, latar sedikit kabur.",
      "Tidak ada tulisan, logo, atau watermark tambahan di dalam gambar.",
      "Rasio 9:16 vertikal."
    ].filter(Boolean).join(" ")
  };
}

function masterImageOptions({ product = {}, variant = {}, count = 2 } = {}) {
  return pickScenes({ category: product.category, seed: product.title || "", count })
    .map(scene => ({ ...buildMasterImagePrompt({ product, scene, variant }), scene }));
}

function splitDurations(duration, pacing) {
  const ratios = ROLE_RATIOS[pacing] || ROLE_RATIOS.medium;
  const roles = [...BEATS];
  let cursor = 0;
  return ratios.map((ratio, index) => {
    const start = cursor;
    const end = index === ratios.length - 1 ? duration : round(cursor + duration * ratio);
    cursor = end;
    return { role: roles[index], start: round(start), end: round(end), duration: round(end - start) };
  });
}

/*
 * Membagi jatah detik AI menjadi sesedikit mungkin klip.
 *
 * Versi sebelumnya membagi jatah menurut segmen peran, sehingga sembilan detik
 * pecah menjadi dua klip 4,5 detik. Itu keliru karena dua alasan. Flow
 * menghitung kredit per generate, bukan per detik, jadi memecah durasi yang
 * sama menjadi dua klip berarti membayar dua kali. Dan setiap sambungan antar
 * klip adalah titik di mana produk, pencahayaan, atau sudut kamera bisa
 * melompat — satu klip panjang tidak punya sambungan sama sekali.
 *
 * Klip hanya dipecah ketika jatahnya melewati batas keras sepuluh detik per
 * panggilan, dan pecahannya dibuat serata mungkin.
 */
function planAiClips(totalDuration, aiBudget) {
  const budget = Math.max(0, Math.min(Number(aiBudget) || 0, totalDuration));
  if (budget < MIN_SHOT_SECONDS) return [];
  const count = Math.ceil(budget / VIDEO_MAX_SECONDS_PER_CALL);
  const per = round(budget / count);
  const clips = [];
  let cursor = 0;
  for (let index = 0; index < count; index++) {
    const duration = index === count - 1 ? round(budget - cursor) : per;
    if (duration < MIN_SHOT_SECONDS) break;
    clips.push({ start: round(cursor), end: round(cursor + duration), duration });
    cursor = round(cursor + duration);
  }
  return clips;
}

// Peran dipakai untuk menyusun kalimat prompt. Satu klip panjang bisa menaungi
// beberapa peran sekaligus, dan yang diambil adalah peran dengan tumpang tindih
// waktu terbesar.
function dominantRole(segments, clip) {
  let best = segments[0]?.role || "hook";
  let bestOverlap = -1;
  for (const segment of segments) {
    const overlap = Math.min(segment.end, clip.end) - Math.max(segment.start, clip.start);
    if (overlap > bestOverlap) { bestOverlap = overlap; best = segment.role; }
  }
  return best;
}

/*
 * Seluruh beat yang benar-benar ditaungi satu klip, bukan hanya yang dominan.
 * Klip sembilan detik pada video delapan belas detik melewati dua beat, dan
 * arahannya perlu memuat keduanya supaya klip punya perkembangan di dalamnya.
 */
function beatsInSpan(segments, clip, minOverlap = 1) {
  return segments
    .filter(segment => Math.min(segment.end, clip.end) - Math.max(segment.start, clip.start) >= minOverlap)
    .map(segment => segment.role);
}

/*
 * Arahan visual diambil dari sudut kreatif varian, bukan dari peran shot semata.
 *
 * Sebelumnya fungsi ini hanya membaca peran, sehingga problem_solution,
 * value_reveal, dan before_after menghasilkan prompt gambar yang persis sama.
 * Iklan yang copy-nya membuka dengan masalah tetap dibuka dengan close-up
 * produk: penonton mendengar keluhan tetapi melihat katalog.
 *
 * Saran visual dari penulis naskah tetap didahulukan bila ada, karena ia sudah
 * mempertimbangkan produk yang sebenarnya.
 */
function aiPromptFor({ beats, variant, product, contract, index, audio }) {
  const arahan = directionForSpan(variant.angle, beats);
  const saran = index === 0 && variant.visualHint ? `${variant.visualHint}. ` : "";
  const chaining = index === 0
    ? "Ini shot pembuka."
    : "Lanjutkan dari shot sebelumnya: pertahankan produk, pencahayaan, latar, dan sudut kamera yang sama. Ubah hanya gerakan yang diminta.";
  const bagian = [`${saran}${arahan}. ${chaining} ${contract}`];
  if (audio) bagian.push(`\n\nAUDIO\n${audio}`);
  bagian.push(`\n\nLARANGAN\n${TEXT_BAN}`);
  return bagian.join("");
}

/*
 * Naskah dipotong di batas kata sesuai durasi yang tersedia. Memotong di tengah
 * kata menghasilkan dialog yang tidak pernah selesai, dan itu terdengar lebih
 * buruk daripada kalimat pendek yang utuh.
 */
function fitSpeech(text, seconds) {
  const kata = String(text || "").trim().split(/\s+/).filter(Boolean);
  if (!kata.length) return "";
  const muat = Math.max(1, Math.floor(seconds * WORDS_PER_SECOND));
  if (kata.length <= muat) return kata.join(" ");
  return `${kata.slice(0, muat).join(" ").replace(/[,.!?]+$/, "")}.`;
}

/*
 * Blok suara untuk satu klip.
 *
 * Dialog ditulis dengan bentuk "berkata:" tanpa tanda kutip. Tanda kutip
 * memperlihatkan kalimatnya sebagai teks tertulis, dan teks tertulis persis
 * yang cenderung ikut digambar model ke layar — pemicu tunggal paling sering
 * dari subtitle rusak.
 *
 * Dialog hanya dititipkan ke Flow ketika videonya cukup satu klip. Dua klip
 * yang masing-masing punya dialog bisa keluar dengan warna suara berbeda, dan
 * pergantian suara di tengah iklan terdengar seperti dua video yang disambung
 * paksa. Untuk video berklip banyak, klip dibuat tanpa dialog dan voiceover
 * disambung sekali jalan di editor.
 */
function audioBlockFor({ variant = {}, beats = [], scene, duration, clipCount = 1 } = {}) {
  const ambience = scene && scene.ambience ? scene.ambience : "suara ruangan yang wajar sesuai latar";
  const dasar = [`Ambience: ${ambience}, pelan.`, "Tanpa musik latar."];

  if (clipCount !== 1) {
    return ["Tanpa dialog, tanpa narasi.", ...dasar, "Voiceover ditambahkan di editor supaya suaranya sama di seluruh video."].join(" ");
  }

  const naskah = beats
    .map(beat => (beat === "solve" ? variant.solve || variant.benefit : variant[beat]))
    .filter(Boolean)
    .join(" ");
  const ucapan = fitSpeech(naskah, duration);
  if (!ucapan) return [...dasar].join(" ");

  return [
    "Suara perempuan muda Indonesia, nada santai, tempo sedang, artikulasi jelas, berbahasa Indonesia.",
    `Ia menghadap kamera dan berkata: ${ucapan}`,
    ...dasar
  ].join(" ");
}

function planShots(input = {}) {
  const {
    variant = {},
    product = {},
    photos = [],
    duration = DEFAULT_DURATION,
    aiSeconds = DEFAULT_AI_SECONDS,
    pacing = "medium",
    scene,
    sceneId
  } = input;

  const total = Math.max(MIN_SHOT_SECONDS, Number(duration) || DEFAULT_DURATION);
  const segments = splitDurations(total, pacing);
  const aiClips = planAiClips(total, aiSeconds);
  const activeScene = resolveScene({ product, scene, sceneId });
  const contract = styleContract({ product, scene: activeScene });

  const shots = [];
  aiClips.forEach((clip, index) => {
    const role = dominantRole(segments, clip);
    const beats = beatsInSpan(segments, clip);
    shots.push({
      id: `shot-${shots.length + 1}`,
      kind: "ai",
      role,
      beats,
      start: clip.start,
      end: clip.end,
      duration: clip.duration,
      prompt: aiPromptFor({
        beats: beats.length ? beats : [role],
        variant,
        product,
        contract,
        index,
        audio: audioBlockFor({
          variant,
          beats: beats.length ? beats : [role],
          scene: activeScene,
          duration: clip.duration,
          clipCount: aiClips.length
        })
      }),
      chainFrom: index === 0 ? null : `shot-${index}`
    });
  });

  const aiEnd = aiClips.length ? aiClips[aiClips.length - 1].end : 0;
  let photoIndex = 0;
  for (const segment of segments) {
    const start = Math.max(segment.start, aiEnd);
    const photoPortion = round(segment.end - start);
    if (photoPortion <= 0) continue;
    shots.push({
      id: `shot-${shots.length + 1}`,
      kind: "photo",
      role: segment.role,
      start: round(start),
      end: round(segment.end),
      duration: photoPortion,
      photo: photos.length ? photos[photoIndex % photos.length] : null,
      // Gerakan tajam di foto menahan kesan slideshow. Ken burns yang lambat
      // justru membuat iklan terasa mati di feed.
      motion: segment.role === "cta" ? "hold" : photoPortion <= 3 ? "punch-in" : "slow-pan",
      caption: variant[segment.role] || variant.benefit || ""
    });
    photoIndex++;
  }

  const aiTotal = round(shots.filter(shot => shot.kind === "ai").reduce((sum, shot) => sum + shot.duration, 0));
  return {
    duration: total,
    scene: activeScene,
    contract,
    shots,
    aiSeconds: aiTotal,
    photoSeconds: round(total - aiTotal),
    aiCalls: shots.filter(shot => shot.kind === "ai").length,
    missingPhotos: shots.some(shot => shot.kind === "photo" && !shot.photo)
  };
}

module.exports = {
  AI_PRIORITY,
  buildMasterImagePrompt,
  masterImageOptions,
  resolveScene,
  DEFAULT_AI_SECONDS,
  DEFAULT_DURATION,
  MIN_SHOT_SECONDS,
  ROLE_RATIOS,
  audioBlockFor,
  beatsInSpan,
  dominantRole,
  fitSpeech,
  planAiClips,
  aiPromptFor,
  planShots,
  splitDurations,
  styleContract,
  TEXT_BAN,
  WORDS_PER_SECOND
};
