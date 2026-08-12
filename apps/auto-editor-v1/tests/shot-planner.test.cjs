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

/*
 * Suara dan teks di layar. Keduanya keluar dari generate yang sama, tetapi
 * keandalannya jauh berbeda: suara dibuat bersama gambarnya sehingga sinkron,
 * sedangkan teks digambar dan kerap salah eja tanpa bisa dihapus setelahnya.
 */
const { audioBlockFor, fitSpeech, TEXT_BAN } = require("../shot-planner");

// Larangan teks wajib menempel di setiap prompt AI, ada dialog maupun tidak.
for (const rencana of [plan, panjang, rencanaBerset]) {
  for (const shot of rencana.shots.filter(item => item.kind === "ai")) {
    assert.ok(shot.prompt.includes(TEXT_BAN), `shot ${shot.id} tidak memuat larangan teks`);
  }
}

/*
 * Bawaannya klip dibuat tanpa dialog. Model menggambar subtitle karena ia
 * mendeteksi ada yang bicara, jadi klip bisu menutup masalah caption rusak dari
 * akarnya — bukan sekadar menahannya lewat larangan di prompt.
 */
const bawaan = planShots({ variant, product, photos, duration: 10, aiSeconds: 10 });
assert.equal(bawaan.aiCalls, 1);
for (const shot of bawaan.shots.filter(item => item.kind === "ai")) {
  assert.ok(/Tanpa dialog/.test(shot.prompt), "bawaannya klip dibuat tanpa dialog");
  assert.ok(!/berkata:/.test(shot.prompt));
}

/*
 * Dialog tetap bisa diminta, dan wajib ketika ada orang di frame yang mulutnya
 * bergerak — voiceover editor di atas bibir yang bergerak adalah dubbing.
 *
 * Tanda kutip memperlihatkan kalimat sebagai teks tertulis, dan teks tertulis
 * persis yang cenderung ikut digambar model ke layar. Bentuk "berkata:" tanpa
 * kutip adalah pencegahan paling murah untuk subtitle rusak.
 */
const satuKlip = planShots({ variant, product, photos, duration: 10, aiSeconds: 10, voice: "flow" });
const klipTunggal = satuKlip.shots.find(shot => shot.kind === "ai");
assert.equal(satuKlip.aiCalls, 1);
assert.ok(/berkata: /.test(klipTunggal.prompt), "dialog harus memakai bentuk berkata:");
assert.ok(!/berkata:\s*["'“]/.test(klipTunggal.prompt), "dialog tidak boleh dibungkus tanda kutip");
assert.ok(/berbahasa Indonesia/.test(klipTunggal.prompt), "bahasa harus disebut eksplisit");
assert.ok(/Tanpa musik latar/.test(klipTunggal.prompt), "musik ditempel di editor, bukan di Flow");

/*
 * Dua klip yang masing-masing berdialog bisa keluar dengan warna suara berbeda,
 * dan pergantian suara di tengah iklan terdengar seperti dua video yang
 * disambung paksa. Karena itu dialog ditolak untuk video berklip banyak,
 * bahkan ketika diminta secara eksplisit.
 */
const banyakKlip = planShots({ variant, product, photos, duration: 24, aiSeconds: 24, voice: "flow" });
assert.ok(banyakKlip.aiCalls > 1);
for (const shot of banyakKlip.shots.filter(item => item.kind === "ai")) {
  assert.ok(/Tanpa dialog/.test(shot.prompt), `shot ${shot.id} tidak boleh berdialog di video berklip banyak`);
  assert.ok(!/berkata:/.test(shot.prompt));
}

// Ambience ikut diminta meskipun dialognya ditangani editor — suara ruangan
// yang cocok membuat klip terasa nyata dan tidak menambah biaya apa pun.
for (const shot of banyakKlip.shots.filter(item => item.kind === "ai")) {
  assert.ok(/Ambience: /.test(shot.prompt));
}
assert.ok(banyakKlip.shots.find(shot => shot.kind === "ai").prompt.includes(banyakKlip.scene.ambience));

// Naskah dipotong di batas kata, tidak pernah di tengah kata.
assert.equal(fitSpeech("satu dua tiga empat lima", 100), "satu dua tiga empat lima");
assert.equal(fitSpeech("satu dua tiga empat lima enam", 2), "satu dua tiga empat lima.");
assert.equal(fitSpeech("", 5), "");
for (const detik of [2, 4, 8, 10]) {
  const hasil = fitSpeech("satu dua tiga empat lima enam tujuh delapan sembilan sepuluh sebelas dua belas tiga belas", detik);
  assert.ok(hasil.split(/\s+/).length <= Math.floor(detik * 2.5), `naskah ${detik} detik kepanjangan`);
  assert.ok(!/\s$/.test(hasil));
}

/*
 * Pilihan ketiga: orang tampil tetapi tidak bicara. Ini yang menghapus
 * pertukaran antara wajah manusia dan suara yang konsisten — voiceover editor
 * di atas bibir yang tidak bergerak tidak terbaca sebagai dubbing.
 */
const bisu = planShots({ variant, product, photos, duration: 10, aiSeconds: 10, voice: "silent" });
for (const shot of bisu.shots.filter(item => item.kind === "ai")) {
  assert.ok(/tidak berbicara/.test(shot.prompt), "model harus diminta tidak bicara");
  assert.ok(/tanpa lip-sync/i.test(shot.prompt), "lip-sync harus ditolak eksplisit");
  assert.ok(!/berkata:/.test(shot.prompt));
  assert.ok(/Voiceover ditambahkan di editor/.test(shot.prompt));
}

/*
 * Ruang untuk caption disiapkan saat generate. Kalau produk terlanjur ditaruh
 * di seperempat bawah frame, caption ditaruh di mana pun akan menutupinya dan
 * editor tidak punya cara memperbaikinya selain generate ulang.
 */
const { NEGATIVE_SPACE } = require("../shot-planner");
for (const shot of plan.shots.filter(item => item.kind === "ai")) {
  assert.ok(shot.prompt.includes(NEGATIVE_SPACE), `shot ${shot.id} tidak meminta ruang kosong`);
}
assert.ok(master.prompt.includes(NEGATIVE_SPACE), "master image juga harus menyisakan ruang");
// Menyisakan ruang tidak boleh mengalahkan produk; itu yang dijual.
assert.ok(/produk jadi kecil|komposisi jadi janggal/.test(NEGATIVE_SPACE), "pengecualian demi produk harus tertulis");

// Tanpa naskah sama sekali, blok suara tetap sah dan tidak menyisakan "berkata:" kosong.
const tanpaNaskah = audioBlockFor({ variant: {}, beats: ["hook"], scene: { ambience: "ruang senyap" }, duration: 8, clipCount: 1, voice: "flow" });
assert.ok(!/berkata:/.test(tanpaNaskah));
assert.ok(/Ambience: ruang senyap/.test(tanpaNaskah));

console.log("shot planner audio tests passed");

/*
 * Karakter dikunci sama seperti produk: lewat kalimat yang menempel foto
 * referensi, bukan lewat deskripsi teks yang berdiri sendiri. Tanpa karakter,
 * perilaku lama harus tetap persis sama — ini fitur tambahan, bukan pengganti.
 */
const { characterLockLine } = require("../shot-planner");

// Tanpa karakter, kalimat subjek dan prompt master sama persis seperti sebelum
// fitur ini ada — tidak boleh ada regresi buat pemakai yang belum pakai karakter.
assert.equal(characterLockLine(), "");
assert.equal(characterLockLine({}), "");
assert.ok(styleContract({ product }).startsWith("Subjek utama: Kemeja Oversize Katun,"));
assert.ok(!master.prompt.includes("Foto referensi karakter"));

// Dengan karakter, kalimat pengunci menempel di kedua tempat: kontrak gaya
// (untuk video) dan prompt master image, dengan urutan karakter dulu baru produk
// supaya cocok dengan urutan foto yang diunggah.
const karakter = { label: "Model A, perempuan berhijab" };
const kontrakBerkarakter = styleContract({ product, character: karakter });
assert.ok(kontrakBerkarakter.includes("Model A, perempuan berhijab mengenakan Kemeja Oversize Katun"));

const masterBerkarakter = buildMasterImagePrompt({ product: { title: "Serum Glow", category: "beauty" }, variant, character: karakter });
assert.ok(masterBerkarakter.prompt.includes("Foto referensi karakter: Model A, perempuan berhijab."));
/*
 * Kalimatnya rinci dengan sengaja. "Pertahankan gaya" saja pernah terbukti
 * tidak cukup — warna dan tekstur rambut rawan "diperbaiki" model kalau
 * tidak disebut satu-satu, persis kasus tulisan kemasan yang harus dikunci
 * eksplisit di prompt produk.
 */
assert.ok(masterBerkarakter.prompt.includes("warna rambut, panjang dasar rambut, tekstur rambut"), "identitas rambut harus disebut eksplisit, bukan cuma \"gaya\"");
assert.ok(masterBerkarakter.prompt.indexOf("referensi karakter") < masterBerkarakter.prompt.indexOf("Foto produk untuk iklan"), "karakter dikunci sebelum produk, mengikuti urutan unggah");
// Kunci produk tidak boleh hilang cuma karena karakter ditambahkan.
assert.ok(masterBerkarakter.prompt.includes("Jangan mengubah tulisan pada kemasan."));

/*
 * Rincinya berhenti di identitas. Foto referensi cuma menangkap satu momen
 * styling; mengunci penataannya berarti satu foto menentukan penampilan untuk
 * semua produk selamanya — dress formal minta sanggul, olahraga minta
 * ponytail, dan foto acuan tidak bisa melayani keduanya.
 */
const kunci = characterLockLine(karakter);
assert.ok(/Penataan rambut, intensitas riasan, dan aksesoris boleh menyesuaikan/.test(kunci), "penataan harus dibebaskan eksplisit");
assert.ok(!/Jangan mengubah[^.]*riasan/.test(kunci), "riasan tidak boleh ikut dilarang berubah");
assert.ok(!/Jangan mengubah[^.]*aksesoris/.test(kunci), "aksesoris tidak boleh ikut dilarang berubah");
// Yang dilarang berubah tetap identitasnya, dan itu harus tegas.
assert.ok(kunci.includes("Jangan mengubah wajah, warna atau panjang dasar rambut, tekstur rambut, maupun proporsi tubuh model."));

// Kontrak gaya untuk video ikut memisahkan keduanya — "identik" cuma untuk produk.
assert.ok(kontrakBerkarakter.includes("Produk tampil identik dengan gambar referensi."));
assert.ok(/Identitas karakter[^.]*tetap sama di setiap shot/.test(kontrakBerkarakter));
assert.ok(kontrakBerkarakter.includes("penataan rambut dan riasan boleh menyesuaikan"));

// Karakter ikut ke setiap shot lewat kontrak, dan ikut ke setiap pilihan master image.
const rencanaBerkarakter = planShots({ variant, product, photos, duration: 10, aiSeconds: 10, character: karakter });
for (const shot of rencanaBerkarakter.shots.filter(item => item.kind === "ai")) {
  assert.ok(shot.prompt.includes("Model A, perempuan berhijab"), `shot ${shot.id} tidak membawa kunci karakter`);
}
const pilihanBerkarakter = masterImageOptions({ product: { title: "Serum Glow", category: "beauty" }, variant, count: 2, character: karakter });
assert.ok(pilihanBerkarakter.every(item => item.prompt.includes("Foto referensi karakter: Model A")));

console.log("shot planner character lock tests passed");

/*
 * Pratinjau komposisi. Bukan pengganti master image — cuma mengecek apakah
 * tiga arah pembuka cukup beda satu sama lain sebelum tiga klip video benar-
 * benar digenerate. Dipakai setelah master image, jadi identitasnya mengacu
 * ke situ, bukan mengunci identitas baru.
 */
const { buildCompositionPreviewPrompt } = require("../shot-planner");

const openers = [
  "Berdiri ragu memegang ujung kulot sebelum melangkah",
  "Memegang kulot sambil melirik jam tangan, terburu-buru",
  "Melihat HP kecewa, lalu melirik kulot dengan ekspresi berharap"
];

const pratinjau = buildCompositionPreviewPrompt({ product, scene: rencanaBerset.scene, openers });
assert.ok(pratinjau.includes("3 panel berdampingan"));
assert.ok(pratinjau.includes("Panel 1: Berdiri ragu"));
assert.ok(pratinjau.includes("Panel 2: Memegang kulot"));
assert.ok(pratinjau.includes("Panel 3: Melihat HP"));
assert.ok(pratinjau.includes(rencanaBerset.scene.world), "latar pratinjau harus konsisten sama master image");
assert.ok(pratinjau.includes("gambar referensi master image yang diunggah"), "bukan referensi baru, harus rujuk master image");
assert.ok(/LARANGAN/.test(pratinjau));
assert.ok(/Tanpa teks, angka, atau label/.test(pratinjau), "gambar pratinjau tidak boleh mengandalkan teks yang digambar");
assert.ok(pratinjau.includes("Rasio 16:9 horizontal"), "landscape supaya tiga panel muat berdampingan");

// Karakter ikut ke subjek pratinjau kalau ada, sama seperti di master image.
const pratinjauBerkarakter = buildCompositionPreviewPrompt({ product, character: karakter, scene: rencanaBerset.scene, openers });
assert.ok(pratinjauBerkarakter.includes("Model A, perempuan berhijab mengenakan"));

// Kurang dari tiga pembuka tetap sah — jumlah panel menyesuaikan, tidak dipatok.
const pratinjauDua = buildCompositionPreviewPrompt({ product, scene: rencanaBerset.scene, openers: openers.slice(0, 2) });
assert.ok(pratinjauDua.includes("2 panel berdampingan"));
assert.ok(!pratinjauDua.includes("Panel 3"));

console.log("shot planner composition preview tests passed");
