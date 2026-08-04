"use strict";

/*
 * Pustaka set visual untuk master image.
 *
 * Sebelumnya kontrak gaya berupa satu kalimat tetap, sehingga setiap produk
 * dan setiap video keluar dengan tampilan yang persis sama. Untuk pemakai yang
 * memasang banyak iklan, keseragaman itu justru merugikan: penonton berhenti
 * memperhatikan sesuatu yang sudah pernah dilihat.
 *
 * Perlu dibedakan dua hal yang sekilas mirip:
 *
 *   Seragam DI DALAM satu video  → diinginkan. Ini yang membuat shot menyambung.
 *   Seragam ANTAR video          → merugikan. Ini yang membuat iklan terabaikan.
 *
 * Karena itu satu set dipilih per produk lalu dipegang teguh untuk seluruh shot
 * video tersebut, sementara produk berbeda mendapat set berbeda. Pemilihan
 * memakai benih dari nama produk supaya hasilnya tetap dapat diulang: produk
 * yang sama selalu memperoleh set yang sama, sehingga varian yang disukai bisa
 * dibuat ulang persis.
 */

const SCENES = Object.freeze({
  beauty: Object.freeze([
    Object.freeze({ id: "vanity-pagi", world: "meja rias kayu terang dengan cermin bulat", lighting: "cahaya pagi masuk dari jendela samping, bayangan lembut", camera: "eye-level, jarak dekat", wardrobe: "piyama satin warna netral", action: "produk diambil dan dibuka perlahan" }),
    Object.freeze({ id: "wastafel-putih", world: "wastafel keramik putih bersih dengan handuk terlipat", lighting: "cahaya siang lembut merata", camera: "sedikit dari atas, 45 derajat", wardrobe: "kaos putih polos", action: "produk dituang ke telapak tangan" }),
    Object.freeze({ id: "meja-marmer", world: "permukaan marmer abu muda dengan satu tanaman kecil", lighting: "softbox studio, pantulan halus", camera: "makro sangat dekat", wardrobe: "tidak ada model, hanya tangan", action: "tekstur produk diusap dengan ujung jari" }),
    Object.freeze({ id: "kamar-sore", world: "sudut kamar tidur dengan sprei linen krem", lighting: "golden hour hangat dari jendela", camera: "eye-level, kedalaman ruang terasa", wardrobe: "kaos rumahan longgar", action: "produk diaplikasikan ke wajah dengan tenang" }),
    Object.freeze({ id: "rak-minimalis", world: "rak kayu terbuka dengan botol perawatan tersusun rapi", lighting: "cahaya samping netral, latar sedikit kabur", camera: "eye-level, komposisi simetris", wardrobe: "tidak ada model", action: "produk diambil dari rak" }),
    Object.freeze({ id: "teras-pagi", world: "meja kecil di teras dengan cangkir dan tanaman", lighting: "sinar matahari pagi langsung, kontras sedang", camera: "dari atas, tegak lurus", wardrobe: "kemeja linen longgar", action: "produk diletakkan lalu diambil kembali" })
  ]),
  fashion: Object.freeze([
    Object.freeze({ id: "kafe-siang", world: "kafe dengan meja kayu dan jendela besar", lighting: "cahaya alami dari jendela, hangat", camera: "eye-level, setengah badan", wardrobe: "celana bahan netral sebagai padanan", action: "berjalan masuk lalu duduk" }),
    Object.freeze({ id: "jalan-kota", world: "trotoar kota dengan dinding beton polos", lighting: "sore menjelang golden hour", camera: "sedikit dari bawah, seluruh badan", wardrobe: "jeans gelap dan sepatu putih", action: "berjalan pelan ke arah kamera" }),
    Object.freeze({ id: "kamar-cermin", world: "kamar dengan cermin tinggi dan lemari kayu", lighting: "cahaya lembut dari jendela di belakang kamera", camera: "eye-level menghadap cermin", wardrobe: "celana pendek rumahan", action: "memakai produk lalu merapikan di depan cermin" }),
    Object.freeze({ id: "rooftop-sore", world: "rooftop terbuka dengan langit lapang", lighting: "matahari rendah, kontras tinggi", camera: "medium shot, angin terasa", wardrobe: "celana kargo netral", action: "berdiri santai, bahan tertiup angin" }),
    Object.freeze({ id: "studio-polos", world: "latar studio abu muda tanpa properti", lighting: "dua softbox, bayangan minimal", camera: "seluruh badan, tegak lurus", wardrobe: "padanan monokrom sederhana", action: "berputar pelan memperlihatkan potongan" }),
    Object.freeze({ id: "lemari-pagi", world: "depan lemari terbuka berisi pakaian tergantung", lighting: "cahaya kamar pagi, hangat lembut", camera: "medium close, dari samping", wardrobe: "kaos dalam polos", action: "memilih lalu mengenakan produk" })
  ]),
  kitchen: Object.freeze([
    Object.freeze({ id: "dapur-terang", world: "meja dapur dengan bahan masakan segar", lighting: "cahaya jendela siang", camera: "dari atas 45 derajat", wardrobe: "celemek polos", action: "produk dipakai memasak" }),
    Object.freeze({ id: "meja-kayu", world: "meja kayu gelap dengan latar bersih", lighting: "softbox tunggal dari samping", camera: "makro dekat", wardrobe: "tidak ada model", action: "produk diputar memperlihatkan detail" })
  ]),
  home: Object.freeze([
    Object.freeze({ id: "ruang-tamu", world: "sudut ruang tamu dengan sofa netral", lighting: "cahaya sore lembut", camera: "eye-level, ruang terasa lapang", wardrobe: "pakaian rumahan", action: "produk dipasang atau dirapikan" }),
    Object.freeze({ id: "sudut-rapi", world: "meja kerja minimalis dengan sedikit properti", lighting: "cahaya netral merata", camera: "medium, komposisi bersih", wardrobe: "tidak ada model", action: "produk diletakkan pada posisinya" })
  ]),
  gadget: Object.freeze([
    Object.freeze({ id: "meja-kerja", world: "meja kerja dengan laptop dan buku catatan", lighting: "cahaya netral dari samping", camera: "dari atas 45 derajat", wardrobe: "kaos polos", action: "produk digunakan sambil bekerja" }),
    Object.freeze({ id: "genggam-dekat", world: "latar gelap polos", lighting: "cahaya tepi menegaskan bentuk", camera: "makro sangat dekat", wardrobe: "tidak ada model", action: "produk digenggam dan diputar" })
  ]),
  general: Object.freeze([
    Object.freeze({ id: "netral-terang", world: "permukaan polos warna netral", lighting: "cahaya merata tanpa bayangan keras", camera: "eye-level, jarak sedang", wardrobe: "tidak ada model", action: "produk diperlihatkan dari beberapa sisi" }),
    Object.freeze({ id: "meja-hangat", world: "meja kayu dengan sedikit properti pendukung", lighting: "cahaya hangat dari samping", camera: "dari atas 45 derajat", wardrobe: "tidak ada model", action: "produk diambil lalu diletakkan" })
  ])
});

// Benih FNV-1a, sama seperti yang dipakai script-engine, agar pemilihan set
// dapat diulang persis untuk produk yang sama.
function hash(value) {
  let h = 2166136261;
  for (const char of String(value || "")) {
    h ^= char.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function scenesFor(category) {
  return SCENES[category] || SCENES.general;
}

/*
 * Beberapa set diambil dengan jarak indeks selebar mungkin, bukan berurutan.
 * Set yang bersebelahan dalam daftar cenderung bertetangga suasananya, sehingga
 * pilihan yang ditawarkan akan terasa mirip satu sama lain dan kehilangan
 * gunanya sebagai pilihan.
 */
function pickScenes({ category = "general", seed = "", count = 1 } = {}) {
  const pool = scenesFor(category);
  const total = Math.max(1, Math.min(pool.length, Math.round(Number(count) || 1)));
  const start = hash(seed) % pool.length;
  const stride = total > 1 ? Math.max(1, Math.floor(pool.length / total)) : 1;
  const picked = [];
  for (let index = 0; index < total; index++) {
    const scene = pool[(start + index * stride) % pool.length];
    if (!picked.some(item => item.id === scene.id)) picked.push(scene);
  }
  // Bila langkah membentur set yang sama, sisanya diisi dari yang belum terpakai.
  for (const scene of pool) {
    if (picked.length >= total) break;
    if (!picked.some(item => item.id === scene.id)) picked.push(scene);
  }
  return picked;
}

// Bidang wardrobe berisi kalimat bebas, jadi keberadaan model dikenali lewat
// pola, bukan lewat kesamaan string persis. Menyamakan persis akan meleset
// begitu kalimatnya ditulis sedikit berbeda.
const TANPA_MODEL = /tidak ada model|tanpa model/i;

function describeScene(scene) {
  const wardrobe = String(scene.wardrobe || "");
  return [
    `Latar: ${scene.world}.`,
    `Pencahayaan: ${scene.lighting}.`,
    `Kamera: ${scene.camera}.`,
    !wardrobe || TANPA_MODEL.test(wardrobe)
      ? "Tanpa model, fokus pada produk dan tangan."
      : `Wardrobe pendukung: ${wardrobe}.`,
    `Aksi: ${scene.action}.`
  ].join(" ");
}

module.exports = { SCENES, describeScene, hash, pickScenes, scenesFor };
