"use strict";

/*
 * Struktur folder proyek video dan berkas pendampingnya.
 *
 * Pembuatan klip sengaja tidak diikat ke satu jalur. Kredit langganan Flow dan
 * penagihan Gemini API adalah dua sistem terpisah: kredit hanya berlaku di
 * aplikasi web Flow, sedangkan API menagih dalam dolar. Bagi pemakai yang
 * sudah berlangganan, membuat klip lewat Flow berarti biaya tambahannya nol,
 * dan hasilnya bisa dilihat dulu sebelum dipakai.
 *
 * Maka proyek disimpan sebagai folder yang bisa diisi dari mana saja: klip
 * yang diunduh dari Flow, klip hasil API, atau rekaman sendiri. Assembly hanya
 * peduli ada berkas yang cocok untuk setiap shot.
 */

const fs = require("fs");
const path = require("path");

const VIDEO_EXTENSIONS = Object.freeze([".mp4", ".mov", ".webm", ".m4v"]);
const PHOTO_EXTENSIONS = Object.freeze([".jpg", ".jpeg", ".png", ".webp"]);
const MANIFEST_NAME = "project.json";
const PROMPTS_NAME = "prompts.txt";

const slug = value => String(value || "proyek")
  .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || "proyek";

function projectPaths(root) {
  return {
    root,
    clips: path.join(root, "clips"),
    photos: path.join(root, "photos"),
    output: path.join(root, "output"),
    manifest: path.join(root, MANIFEST_NAME),
    prompts: path.join(root, PROMPTS_NAME)
  };
}

function createProject(root, { plan, variant, product }) {
  const paths = projectPaths(root);
  for (const dir of [paths.root, paths.clips, paths.photos, paths.output]) fs.mkdirSync(dir, { recursive: true });
  const manifest = {
    version: 1,
    createdAt: new Date().toISOString(),
    product: { title: product.title, category: product.category },
    variant: { angle: variant.angle, hook: variant.hook, benefit: variant.benefit, cta: variant.cta, score: variant.score },
    plan
  };
  fs.writeFileSync(paths.manifest, JSON.stringify(manifest, null, 2));
  fs.writeFileSync(paths.prompts, renderPrompts(plan, product));
  return { paths, manifest };
}

function readProject(root) {
  const paths = projectPaths(root);
  if (!fs.existsSync(paths.manifest)) {
    const error = new Error(`Bukan folder proyek video: ${root} (tidak ada ${MANIFEST_NAME}).`);
    error.diagnostic = { code: "NOT_A_PROJECT", message: error.message };
    throw error;
  }
  return { paths, manifest: JSON.parse(fs.readFileSync(paths.manifest, "utf8")) };
}

/*
 * Berkas dicocokkan ke shot lewat nomor urut di namanya, bukan lewat urutan
 * direktori. Unduhan dari Flow datang dengan nama acak dan urutan yang tidak
 * bisa diandalkan, sedangkan pemakai menamai ulang sesuai nomor shot dengan
 * mudah. Nomor terbesar dipakai supaya "shot-2 (1).mp4" tetap terbaca sebagai
 * shot 2, bukan shot 1.
 */
function matchByIndex(files, wanted) {
  for (const file of files) {
    const numbers = String(path.basename(file)).match(/\d+/g);
    if (numbers && Number(numbers[0]) === wanted) return file;
  }
  return null;
}

function listFiles(dir, extensions) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(name => extensions.includes(path.extname(name).toLowerCase()))
    .sort()
    .map(name => path.join(dir, name));
}

/*
 * Memetakan setiap shot ke berkas yang tersedia dan melaporkan apa yang masih
 * kurang. Assembly tidak boleh berjalan setengah jadi: video yang kehilangan
 * satu klip di tengah lebih membingungkan daripada kegagalan yang jelas.
 */
function resolveAssets(root) {
  const { paths, manifest } = readProject(root);
  const clips = listFiles(paths.clips, VIDEO_EXTENSIONS);
  const photos = listFiles(paths.photos, PHOTO_EXTENSIONS);
  const missing = [];
  let aiSeen = 0;
  let photoSeen = 0;

  const shots = manifest.plan.shots.map(shot => {
    if (shot.kind === "ai") {
      aiSeen++;
      const file = matchByIndex(clips, aiSeen) || clips[aiSeen - 1] || null;
      if (!file) missing.push({ shot: shot.id, kind: "clip", expected: `clips/shot-${aiSeen}.mp4` });
      return { ...shot, sourcePath: file };
    }
    photoSeen++;
    const file = photos.length ? photos[(photoSeen - 1) % photos.length] : null;
    if (!file) missing.push({ shot: shot.id, kind: "photo", expected: "photos/*.jpg" });
    return { ...shot, sourcePath: file };
  });

  return {
    paths,
    manifest,
    shots,
    missing,
    ready: missing.length === 0,
    counts: { clips: clips.length, photos: photos.length, aiShots: aiSeen, photoShots: photoSeen }
  };
}

/*
 * Prompt ditulis dalam bentuk yang bisa langsung ditempel satu per satu ke
 * Flow, lengkap dengan nomor shot dan nama berkas yang diharapkan, sehingga
 * pemakai tahu persis apa yang harus dilakukan dengan setiap hasil unduhan.
 */
function renderPrompts(plan, product = {}) {
  const aiShots = plan.shots.filter(shot => shot.kind === "ai");
  const lines = [
    `PROMPT VIDEO — ${product.title || "Produk"}`,
    `${aiShots.length} klip, total ${plan.aiSeconds} detik`,
    "",
    "Cara pakai:",
    "1. Buka Flow, buat proyek baru.",
    "2. Unggah foto produk sebagai gambar referensi.",
    "3. Tempel prompt di bawah satu per satu, generate, lalu unduh hasilnya.",
    "4. Ganti nama unduhan menjadi shot-1.mp4, shot-2.mp4, dan seterusnya.",
    "5. Pindahkan ke folder clips/ pada proyek ini.",
    "",
    "Generate berurutan dan jangan mulai proyek baru di tengah jalan.",
    "Klip kedua dan seterusnya harus melanjutkan klip sebelumnya agar produk,",
    "pencahayaan, dan sudut kamera tetap sama.",
    ""
  ];
  aiShots.forEach((shot, index) => {
    lines.push("=".repeat(72));
    lines.push(`SHOT ${index + 1}  (${shot.role}, ${shot.duration} detik)  →  simpan sebagai clips/shot-${index + 1}.mp4`);
    lines.push("=".repeat(72));
    lines.push(shot.prompt);
    lines.push("");
  });
  if (!aiShots.length) lines.push("(Rencana ini tidak memakai klip AI — seluruh video memakai foto bermotion.)");
  return lines.join("\n");
}

module.exports = {
  MANIFEST_NAME,
  PHOTO_EXTENSIONS,
  PROMPTS_NAME,
  VIDEO_EXTENSIONS,
  createProject,
  listFiles,
  matchByIndex,
  projectPaths,
  readProject,
  renderPrompts,
  resolveAssets,
  slug
};
