"use strict";
const assert = require("node:assert/strict");
const { dominantRole, planAiClips, planShots, splitDurations, styleContract } = require("../shot-planner");

const variant = { angle: "value_reveal", hook: "Ternyata gak perlu bayar mahal", agitate: "Cari kemeja yang adem itu susah", solve: "Bahannya adem", benefit: "Bahannya adem", cta: "Cek keranjang", visualHint: "Tangan meregangkan kain kemeja" };
const product = { title: "Kemeja Oversize Katun", benefits: ["adem dipakai seharian"] };
const photos = ["a.jpg", "b.jpg"];

// Pembagian peran harus menutup seluruh durasi tanpa celah maupun tumpang tindih.
// Empat beat: hook, agitate, solve, cta.
const segments = splitDurations(18, "medium");
assert.equal(segments.length, 4);
assert.deepEqual(segments.map(item => item.role), ["hook", "agitate", "solve", "cta"]);
assert.equal(segments[0].start, 0);
assert.equal(segments[3].end, 18);
for (let i = 1; i < segments.length; i++) assert.equal(segments[i].start, segments[i - 1].end);

const plan = planShots({ variant, product, photos, duration: 18, aiSeconds: 9 });
assert.equal(plan.duration, 18);
assert.equal(plan.aiSeconds + plan.photoSeconds, 18, "seluruh durasi harus terisi");
assert.ok(plan.aiSeconds <= 9, "jatah AI tidak boleh terlampaui");
assert.equal(plan.missingPhotos, false);

// Shot harus bersambung rapat dari nol sampai akhir.
let cursor = 0;
for (const shot of plan.shots) {
  assert.equal(shot.start, cursor, `shot ${shot.id} harus mulai tepat di akhir shot sebelumnya`);
  assert.ok(shot.duration > 0);
  cursor = shot.end;
}
assert.equal(cursor, 18);

/*
 * Video harus dibuka dengan gerakan. Yang diuji shot pertamanya, bukan shot
 * yang berlabel "hook": satu klip panjang menaungi beberapa beat sekaligus dan
 * labelnya mengikuti beat dengan tumpang tindih terbesar, sehingga klip yang
 * membuka video bisa saja berlabel agitate. Yang menentukan tetap posisinya.
 */
assert.equal(plan.shots[0].kind, "ai", "video harus dibuka dengan gerakan, bukan foto diam");
assert.equal(plan.shots[0].start, 0);
assert.ok(plan.shots[0].beats.includes("hook"), "klip pembuka wajib menaungi beat hook");

// CTA paling akhir memakai foto agar teks dan kemasan tetap tajam.
const cta = plan.shots.filter(shot => shot.role === "cta");
assert.ok(cta.some(shot => shot.kind === "photo"));
assert.equal(cta[cta.length - 1].kind, "photo");

// Batas sepuluh detik per panggilan adalah batas keras API.
const panjang = planShots({ variant, product, photos, duration: 30, aiSeconds: 25 });
for (const shot of panjang.shots.filter(item => item.kind === "ai")) {
  assert.ok(shot.duration <= 10, `shot AI ${shot.id} melebihi batas per panggilan`);
}

// Rantai konsistensi: klip pertama berdiri sendiri, sisanya menyambung.
const aiShots = panjang.shots.filter(shot => shot.kind === "ai");
assert.equal(aiShots[0].chainFrom, null);
assert.ok(aiShots.length > 1);
for (const shot of aiShots.slice(1)) {
  assert.ok(shot.chainFrom, "klip lanjutan harus dirantai ke klip sebelumnya");
  assert.ok(shot.prompt.includes("Lanjutkan dari shot sebelumnya"));
}
assert.ok(aiShots[0].prompt.includes("shot pembuka"));

// Kontrak gaya yang sama masuk ke setiap prompt AI.
for (const shot of aiShots) assert.ok(shot.prompt.includes("9:16"), "kontrak gaya harus menempel di semua prompt");
assert.ok(styleContract({ product }).includes("Kemeja Oversize Katun"));

// Tanpa jatah AI, seluruh video memakai foto dan tidak ada biaya generate.
const tanpaAi = planShots({ variant, product, photos, duration: 18, aiSeconds: 0 });
assert.equal(tanpaAi.aiCalls, 0);
assert.equal(tanpaAi.aiSeconds, 0);
assert.equal(tanpaAi.photoSeconds, 18);
assert.ok(tanpaAi.shots.every(shot => shot.kind === "photo"));

/*
 * Jatah AI harus dipecah sesedikit mungkin. Flow menghitung kredit per generate,
 * bukan per detik, jadi sembilan detik yang pecah menjadi dua klip berarti
 * membayar dua kali untuk durasi yang sama — sekaligus menambah satu sambungan
 * tempat produk dan pencahayaan bisa melompat.
 */
assert.equal(planShots({ variant, product, photos, duration: 18, aiSeconds: 9 }).aiCalls, 1, "sembilan detik cukup satu klip");
assert.equal(planShots({ variant, product, photos, duration: 18, aiSeconds: 10 }).aiCalls, 1, "sepuluh detik masih satu klip");
assert.equal(planShots({ variant, product, photos, duration: 20, aiSeconds: 16 }).aiCalls, 2, "di atas batas baru dipecah");
assert.equal(planShots({ variant, product, photos, duration: 24, aiSeconds: 24 }).aiCalls, 3);

// Pecahan dibuat serata mungkin dan tidak ada yang melewati batas keras.
for (const budget of [11, 16, 19, 24, 25, 30]) {
  const klip = planAiClips(30, budget);
  assert.ok(klip.every(item => item.duration <= 10), `jatah ${budget} melewati batas per panggilan`);
  assert.ok(klip.every(item => item.duration >= 2));
  const selisih = Math.max(...klip.map(i => i.duration)) - Math.min(...klip.map(i => i.duration));
  assert.ok(selisih <= 0.1, `jatah ${budget} terbagi tidak rata (selisih ${selisih})`);
  assert.equal(Number(klip.reduce((sum, i) => sum + i.duration, 0).toFixed(1)), budget);
}

// Jatah yang terlalu kecil untuk terbaca sebagai gerakan tidak dipaksakan.
assert.deepEqual(planAiClips(18, 1), []);
assert.deepEqual(planAiClips(18, 0), []);

// Satu klip panjang bisa menaungi beberapa peran; yang diambil peran dengan
// tumpang tindih waktu terbesar.
const segmen = splitDurations(18, "medium");
assert.equal(dominantRole(segmen, { start: 0, end: 3 }), "hook");
assert.equal(dominantRole(segmen, { start: 14, end: 18 }), "cta");
assert.ok(["agitate", "solve"].includes(dominantRole(segmen, { start: 5, end: 13 })));

/*
 * Klip panjang menaungi beberapa beat sekaligus, dan arahannya harus memuat
 * semuanya supaya klip punya perkembangan di dalamnya, bukan satu pose statis.
 */
const { beatsInSpan } = require("../shot-planner");
const beats = beatsInSpan(segmen, { start: 0, end: 9 });
assert.ok(beats.length >= 2, `klip sembilan detik melewati lebih dari satu beat, dapat: ${beats.join(",")}`);
assert.equal(beats[0], "hook");
assert.deepEqual(beatsInSpan(segmen, { start: 0, end: 3 }), ["hook"]);

// Tanpa foto sama sekali, perencana tetap menghasilkan rencana tetapi menandainya.
const tanpaFoto = planShots({ variant, product, photos: [], duration: 18, aiSeconds: 9 });
assert.equal(tanpaFoto.missingPhotos, true);

// Rencana harus deterministik agar varian yang disukai bisa dibuat ulang persis.
assert.deepEqual(planShots({ variant, product, photos, duration: 18, aiSeconds: 9 }), plan);

console.log("shot planner tests passed");

/*
 * Set visual: seragam di dalam satu video, beragam antar produk. Keduanya
 * mudah tertukar, dan tertukarnya mahal — video yang setnya berganti di tengah
 * terlihat rusak, sedangkan lima puluh iklan bersert sama akan diabaikan.
 */
const { buildMasterImagePrompt, masterImageOptions, resolveScene } = require("../shot-planner");

const rencanaBerset = planShots({ variant, product: { ...product, category: "fashion" }, photos, duration: 18, aiSeconds: 9 });
assert.ok(rencanaBerset.scene && rencanaBerset.scene.world, "rencana harus menyebut set yang dipakai");
for (const shot of rencanaBerset.shots.filter(item => item.kind === "ai")) {
  assert.ok(shot.prompt.includes(rencanaBerset.scene.world), "semua shot AI terikat pada satu set yang sama");
}

// Produk berbeda mendapat set berbeda tanpa perlu diatur pemakai.
const setA = planShots({ variant, product: { title: "Kemeja Oversize Katun", category: "fashion" }, photos }).scene.id;
const setB = planShots({ variant, product: { title: "Sepatu Sneakers Putih", category: "fashion" }, photos }).scene.id;
assert.notEqual(setA, setB, "dua produk berbeda tidak boleh selalu jatuh ke set yang sama");

// Pemakai tetap bisa menimpa pilihan otomatis ketika merasa setnya berulang.
const dipaksa = planShots({ variant, product: { title: "Kemeja", category: "fashion" }, photos, sceneId: "rooftop-sore" });
assert.equal(dipaksa.scene.id, "rooftop-sore");
assert.equal(resolveScene({ product: { category: "fashion" }, sceneId: "tidak-ada" }).world !== undefined, true, "id asing jatuh ke pilihan otomatis");

/*
 * Prompt master image wajib menegaskan produk tidak boleh diubah. Tanpa itu
 * model kerap memperbaiki kemasan menurut seleranya sendiri, dan penonton
 * menerima barang yang berbeda dari yang diiklankan.
 */
const master = buildMasterImagePrompt({ product: { title: "Serum Glow", category: "beauty" }, variant });
assert.ok(master.prompt.includes("Serum Glow"));
assert.ok(/jangan mengubah tulisan/i.test(master.prompt), "tulisan pada kemasan harus dikunci");
assert.ok(/pertahankan bentuk, warna/i.test(master.prompt));
assert.ok(master.prompt.includes("9:16"));
assert.ok(!/watermark/i.test(master.prompt) === false, "watermark harus dilarang secara eksplisit");
assert.ok(master.sceneId);

// Beberapa pilihan master harus benar-benar berbeda, bukan variasi tipis.
const pilihan = masterImageOptions({ product: { title: "Serum Glow", category: "beauty" }, variant, count: 3 });
assert.equal(pilihan.length, 3);
assert.equal(new Set(pilihan.map(item => item.sceneId)).size, 3);
assert.equal(new Set(pilihan.map(item => item.scene.world)).size, 3, "latar ketiganya harus berbeda");
assert.ok(pilihan.every(item => item.prompt.includes("Serum Glow")));

console.log("shot planner scene tests passed");
