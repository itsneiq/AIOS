"use strict";
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createProject, matchByIndex, readProject, renderPrompts, resolveAssets, slug } = require("../video-project");
const { planShots } = require("../shot-planner");

const variant = { angle: "value_reveal", hook: "Ternyata gak perlu bayar mahal", benefit: "Bahannya adem", cta: "Cek keranjang", visualHint: "Tangan meregangkan kain", score: 99 };
const product = { title: "Kemeja Oversize Katun", category: "fashion", benefits: ["adem dipakai seharian"] };
const plan = planShots({ variant, product, photos: ["a.jpg"], duration: 18, aiSeconds: 9 });

const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "proyek-")), slug(product.title));
const { paths } = createProject(root, { plan, variant, product });

for (const dir of [paths.clips, paths.photos, paths.output]) assert.ok(fs.existsSync(dir), `${dir} harus dibuat`);
assert.ok(fs.existsSync(paths.manifest));
assert.equal(readProject(root).manifest.variant.hook, variant.hook);
assert.equal(readProject(root).manifest.plan.shots.length, plan.shots.length);
assert.throws(() => readProject(os.tmpdir()), /Bukan folder proyek video/);

// Prompt harus siap tempel dan menyebut nama berkas yang diharapkan, sehingga
// pemakai tahu apa yang harus dilakukan dengan setiap hasil unduhan.
const teks = fs.readFileSync(paths.prompts, "utf8");
assert.ok(teks.includes("clips/shot-1.mp4"));
assert.ok(teks.includes("Tangan meregangkan kain"));
assert.ok(teks.includes("9:16"), "kontrak gaya ikut tertulis di prompt");
assert.ok(teks.includes("melanjutkan klip sebelumnya"), "petunjuk konsistensi harus jelas");
assert.ok(renderPrompts(planShots({ variant, product, photos: ["a.jpg"], aiSeconds: 0 }), product).includes("tidak memakai klip AI"));

/*
 * Unduhan dari Flow datang dengan nama acak, jadi pencocokan bersandar pada
 * nomor di nama berkas setelah pemakai menamainya ulang.
 */
assert.equal(matchByIndex(["/x/shot-1.mp4", "/x/shot-2.mp4"], 2), "/x/shot-2.mp4");
assert.equal(matchByIndex(["/x/shot-2 (1).mp4"], 2), "/x/shot-2 (1).mp4", "salinan berulang tetap terbaca sebagai shot yang sama");
assert.equal(matchByIndex(["/x/tanpa-angka.mp4"], 1), null);

// Sebelum berkas tersedia, proyek harus menolak dianggap siap dan menyebut
// persis apa yang kurang.
const kosong = resolveAssets(root);
assert.equal(kosong.ready, false);
assert.ok(kosong.missing.length > 0);
assert.ok(kosong.missing.some(item => item.kind === "clip"));
assert.ok(kosong.missing.some(item => item.kind === "photo"));
assert.ok(kosong.missing[0].expected.includes("shot-1"), "kekurangan harus menyebut nama berkas yang diharapkan");

// Setelah diisi, setiap shot mendapat berkas sumbernya.
const aiCount = plan.shots.filter(shot => shot.kind === "ai").length;
for (let i = 1; i <= aiCount; i++) fs.writeFileSync(path.join(paths.clips, `shot-${i}.mp4`), "x");
fs.writeFileSync(path.join(paths.photos, "produk.jpg"), "x");

const siap = resolveAssets(root);
assert.equal(siap.ready, true, "proyek yang lengkap harus siap dirakit");
assert.equal(siap.missing.length, 0);
assert.ok(siap.shots.every(shot => shot.sourcePath), "setiap shot harus punya berkas sumber");
assert.equal(siap.counts.clips, aiCount);
assert.equal(siap.counts.photos, 1);

// Klip harus dipetakan menurut nomor, bukan menurut urutan direktori.
const aiShots = siap.shots.filter(shot => shot.kind === "ai");
aiShots.forEach((shot, index) => assert.ok(path.basename(shot.sourcePath).includes(String(index + 1))));

// Satu foto dipakai berulang bila shot foto lebih banyak daripada berkasnya.
assert.ok(siap.shots.filter(shot => shot.kind === "photo").every(shot => shot.sourcePath.endsWith("produk.jpg")));

// Berkas selain video dan foto diabaikan, bukan ikut terpakai.
fs.writeFileSync(path.join(paths.clips, "catatan.txt"), "x");
assert.equal(resolveAssets(root).counts.clips, aiCount);

assert.equal(slug("Kemeja Oversize Pria!! 2026"), "kemeja-oversize-pria-2026");
assert.equal(slug(""), "proyek");

fs.rmSync(path.dirname(root), { recursive: true, force: true });
console.log("video project tests passed");
