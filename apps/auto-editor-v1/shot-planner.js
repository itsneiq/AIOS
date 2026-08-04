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

const DEFAULT_DURATION = 18;
const DEFAULT_AI_SECONDS = 9;
const MIN_SHOT_SECONDS = 2;

// Urutan peran mengikuti struktur hook/benefit/cta yang sudah dipakai
// creative-planner, sehingga script dan shot list tetap sejalan.
const ROLE_RATIOS = Object.freeze({
  fast: Object.freeze([0.22, 0.48, 0.3]),
  medium: Object.freeze([0.25, 0.5, 0.25]),
  slow: Object.freeze([0.3, 0.5, 0.2])
});

/*
 * Hook selalu didahulukan untuk porsi AI. Tiga detik pertama menentukan apakah
 * iklan ditonton sama sekali, dan foto diam di posisi itu paling sering
 * membuat orang menggulir lewat. CTA paling akhir mendapat prioritas terendah
 * karena di sana yang dibutuhkan justru ketajaman teks dan kemasan.
 */
const AI_PRIORITY = Object.freeze(["hook", "benefit", "cta"]);

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
  const roles = ["hook", "benefit", "cta"];
  let cursor = 0;
  return ratios.map((ratio, index) => {
    const start = cursor;
    const end = index === ratios.length - 1 ? duration : round(cursor + duration * ratio);
    cursor = end;
    return { role: roles[index], start: round(start), end: round(end), duration: round(end - start) };
  });
}

/*
 * Membagi jatah detik AI ke setiap segmen menurut prioritas peran. Sisa yang
 * tidak terpakai jatuh ke foto, bukan dipaksakan menjadi klip pendek yang
 * terlalu singkat untuk terbaca sebagai gerakan.
 */
function allocateAiSeconds(segments, aiBudget) {
  const budget = Math.max(0, Number(aiBudget) || 0);
  const allocation = new Map(segments.map(segment => [segment.role, 0]));
  let remaining = budget;
  for (const role of AI_PRIORITY) {
    const segment = segments.find(item => item.role === role);
    if (!segment || remaining < MIN_SHOT_SECONDS) continue;
    const take = Math.min(segment.duration, remaining, VIDEO_MAX_SECONDS_PER_CALL);
    if (take < MIN_SHOT_SECONDS) continue;
    allocation.set(role, round(take));
    remaining = round(remaining - take);
  }
  return { allocation, unused: round(remaining) };
}

function aiPromptFor({ segment, variant, product, contract, index }) {
  const beat = segment.role === "hook"
    ? variant.visualHint || `Produk ${product.title || ""} diperlihatkan bergerak dari dekat`.trim()
    : segment.role === "benefit"
      ? `Produk sedang dipakai, memperlihatkan ${(product.benefits || [])[0] || "manfaat utamanya"}`
      : `Produk ditampilkan utuh sebagai penutup`;
  const chaining = index === 0
    ? "Ini shot pembuka."
    : "Lanjutkan dari shot sebelumnya: pertahankan produk, pencahayaan, latar, dan sudut kamera yang sama. Ubah hanya gerakan yang diminta.";
  return `${beat}. ${chaining} ${contract}`;
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
  const { allocation, unused } = allocateAiSeconds(segments, Math.min(aiSeconds, total));
  const activeScene = resolveScene({ product, scene, sceneId });
  const contract = styleContract({ product, scene: activeScene });

  const shots = [];
  let aiIndex = 0;
  for (const segment of segments) {
    const aiPortion = allocation.get(segment.role) || 0;
    let cursor = segment.start;

    if (aiPortion >= MIN_SHOT_SECONDS) {
      shots.push({
        id: `shot-${shots.length + 1}`,
        kind: "ai",
        role: segment.role,
        start: round(cursor),
        end: round(cursor + aiPortion),
        duration: round(aiPortion),
        prompt: aiPromptFor({ segment, variant, product, contract, index: aiIndex }),
        chainFrom: aiIndex === 0 ? null : shots.filter(item => item.kind === "ai").slice(-1)[0].id
      });
      cursor = round(cursor + aiPortion);
      aiIndex++;
    }

    const photoPortion = round(segment.end - cursor);
    if (photoPortion > 0) {
      shots.push({
        id: `shot-${shots.length + 1}`,
        kind: "photo",
        role: segment.role,
        start: round(cursor),
        end: round(segment.end),
        duration: photoPortion,
        photo: photos.length ? photos[shots.filter(item => item.kind === "photo").length % photos.length] : null,
        // Gerakan tajam di foto menahan kesan slideshow. Ken burns yang lambat
        // justru membuat iklan terasa mati di feed.
        motion: segment.role === "cta" ? "hold" : photoPortion <= 3 ? "punch-in" : "slow-pan",
        caption: segment.role === "hook" ? variant.hook : segment.role === "benefit" ? variant.benefit : variant.cta
      });
    }
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
    unusedAiBudget: unused,
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
  allocateAiSeconds,
  aiPromptFor,
  planShots,
  splitDurations,
  styleContract
};
