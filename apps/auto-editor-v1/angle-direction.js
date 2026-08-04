"use strict";

/*
 * Menerjemahkan sudut kreatif menjadi arahan visual.
 *
 * Sebelumnya sudut hanya hidup di teks. `aiPromptFor` membaca peran shot
 * (hook, benefit, cta) tetapi tidak pernah membaca `variant.angle`, sehingga
 * problem_solution, value_reveal, dan before_after menghasilkan prompt gambar
 * yang persis sama: produk diperlihatkan bergerak dari dekat.
 *
 * Akibatnya iklan yang copy-nya membuka dengan masalah tetap dibuka dengan
 * close-up botol. Penonton mendengar keluhan tetapi melihat katalog, dan tiga
 * detik pertama terbuang.
 *
 * Modul ini menutup jarak itu: setiap sudut punya momen visual sendiri untuk
 * tiap beat, sehingga gambar menceritakan hal yang sama dengan kalimatnya.
 */

// Beat mengikuti formula hook - agitate - solve - cta. Struktur lama hanya
// punya hook, benefit, cta; bagian tengahnya berupa klaim datar tanpa tekanan,
// sehingga penonton tidak pernah diberi alasan untuk peduli.
const BEATS = Object.freeze(["hook", "agitate", "solve", "cta"]);

const DEFAULT_DIRECTION = Object.freeze({
  hook: "Produk diperlihatkan bergerak dari dekat, memancing perhatian",
  agitate: "Sorot kerepotan yang biasa dialami sebelum memakai produk ini",
  solve: "Produk sedang dipakai dan hasilnya mulai terlihat",
  cta: "Produk ditampilkan utuh sebagai penutup"
});

/*
 * Arahan ditulis sebagai momen yang bisa difilmkan, bukan sebagai kata sifat.
 * "Tangan menyingkirkan tumpukan botol lalu mengambil satu" dapat dieksekusi
 * model video; "tampilkan kesan praktis" tidak.
 */
const ANGLE_DIRECTIONS = Object.freeze({
  problem_solution: Object.freeze({
    hook: "Buka pada kondisi masalahnya lebih dulu, bukan pada produk. Perlihatkan situasi yang bikin kesal sebelum produk muncul sama sekali",
    agitate: "Perlihatkan usaha yang sudah dilakukan tapi belum berhasil: tumpukan produk lain, langkah yang berulang, raut lelah",
    solve: "Produk masuk ke frame sebagai jalan keluar, dipakai dengan satu langkah sederhana",
    cta: "Kondisi setelahnya terlihat lega, produk diletakkan di depan kamera"
  }),
  before_after: Object.freeze({
    hook: "Buka pada kondisi sebelum pemakaian, jujur apa adanya, tanpa dilebih-lebihkan",
    agitate: "Tahan sebentar pada kondisi sebelum itu agar penonton sempat mengenalinya sebagai keadaannya sendiri",
    solve: "Perlihatkan peralihan ke kondisi sesudah dalam satu gerakan menyambung, bukan potongan terpisah",
    cta: "Kondisi sesudah ditahan di layar bersama produk"
  }),
  value_reveal: Object.freeze({
    hook: "Buka dengan kesan mahal: bahan, kemasan, atau detail yang terlihat premium dari jarak sangat dekat",
    agitate: "Perlihatkan pembanding yang biasanya jauh lebih mahal untuk kesan serupa",
    solve: "Kamera menarik mundur memperlihatkan produk sesungguhnya, sederhana dan terjangkau",
    cta: "Produk ditampilkan utuh, kesan premium tetap terjaga"
  }),
  styling: Object.freeze({
    hook: "Buka pada satu produk tergantung atau tergeletak, sebelum dipakai",
    agitate: "Perlihatkan kebingungan memadukan: beberapa pilihan dibolak-balik tanpa keputusan",
    solve: "Transisi cepat antar beberapa padu-padan memakai produk yang sama persis",
    cta: "Padu-padan terakhir ditahan, produk terlihat jelas"
  }),
  demo: Object.freeze({
    hook: "Buka tepat pada momen produk mulai dipakai, tanpa pengantar",
    agitate: "Perlihatkan bagian yang biasanya paling merepotkan saat memakai produk sejenis",
    solve: "Pemakaian berlanjut sampai hasilnya terlihat dalam satu gerakan menyambung",
    cta: "Hasil akhir ditahan berdampingan dengan produk"
  }),
  detail_reveal: Object.freeze({
    hook: "Buka sangat dekat pada satu detail yang belum jelas apa, memancing penasaran",
    agitate: "Tahan pada detail itu sedikit lebih lama sampai penonton ingin tahu",
    solve: "Kamera menarik mundur, terlihat detail itu bagian dari produk dan apa gunanya",
    cta: "Produk utuh ditampilkan, detail tadi tetap terbaca"
  }),
  lifestyle: Object.freeze({
    hook: "Buka pada momen sehari-hari yang sedang berlangsung, produk belum jadi pusat perhatian",
    agitate: "Perlihatkan bagian rutinitas yang terasa terburu-buru atau merepotkan",
    solve: "Produk masuk ke rutinitas itu dengan wajar, tanpa dipamerkan",
    cta: "Momen ditutup tenang, produk terlihat di dalam suasananya"
  }),
  urgency: Object.freeze({
    hook: "Buka pada isyarat persediaan menipis: rak yang tinggal sedikit, tangan mengambil sisa terakhir",
    agitate: "Perlihatkan produk berpindah cepat, kesan banyak yang mencari",
    solve: "Produk terakhir diamankan dan diperlihatkan utuh",
    cta: "Produk ditahan di depan kamera bersama isyarat ajakan bertindak"
  })
});

function directionFor(angle, beat) {
  const set = ANGLE_DIRECTIONS[angle] || DEFAULT_DIRECTION;
  return set[beat] || DEFAULT_DIRECTION[beat] || DEFAULT_DIRECTION.hook;
}

/*
 * Satu klip panjang menaungi beberapa beat sekaligus. Menyambung arahan
 * keduanya membuat klip punya perkembangan di dalamnya, bukan satu pose statis
 * selama sembilan detik.
 */
function directionForSpan(angle, beats = []) {
  const dipakai = beats.filter(beat => BEATS.includes(beat));
  if (!dipakai.length) return directionFor(angle, "hook");
  if (dipakai.length === 1) return directionFor(angle, dipakai[0]);
  const bagian = dipakai.map(beat => directionFor(angle, beat));
  return `${bagian[0]}, lalu berlanjut: ${bagian.slice(1).join(", kemudian ")}`;
}

function angles() {
  return Object.keys(ANGLE_DIRECTIONS);
}

module.exports = { ANGLE_DIRECTIONS, BEATS, DEFAULT_DIRECTION, angles, directionFor, directionForSpan };
