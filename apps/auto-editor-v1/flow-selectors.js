"use strict";

/*
 * Penemuan elemen untuk otomasi Flow.
 *
 * Selector tidak ditulis sebagai tebakan tetap. Antarmuka Flow tidak dapat
 * diperiksa saat modul ini dibuat, dan bahkan bila bisa, tata letaknya akan
 * berubah lebih cepat daripada kode ini diperbarui. Yang bertahan bukan
 * selector, melainkan ciri: kotak isian prompt adalah area teks terbesar,
 * tombol generate memuat kata kerja tertentu, dan seterusnya.
 *
 * Karena itu modul ini menilai kandidat berdasarkan ciri, lalu hasilnya
 * disimpan ke berkas konfigurasi. Ketika Flow berubah, yang perlu dijalankan
 * ulang hanyalah penemuan, bukan penulisan ulang kode.
 */

const ROLES = Object.freeze({
  promptInput: Object.freeze({
    label: "Kotak isian prompt",
    tags: ["textarea", "input"],
    // Area teks yang lapang hampir selalu kotak prompt, bukan kolom pencarian.
    text: [/prompt/i, /deskripsi/i, /describe/i, /tulis/i, /apa yang/i],
    prefer: element => (element.tag === "textarea" ? 30 : 0) + Math.min(20, Math.round((element.width || 0) / 40))
  }),
  generateButton: Object.freeze({
    label: "Tombol generate",
    tags: ["button", "a", "div"],
    text: [/^generate$/i, /generate/i, /buat/i, /create/i, /kirim/i, /submit/i],
    prefer: element => (element.tag === "button" ? 20 : 0) + (element.disabled ? -40 : 0)
  }),
  resultVideo: Object.freeze({
    label: "Video hasil",
    tags: ["video"],
    text: [],
    prefer: element => (element.src ? 25 : 0)
  }),
  downloadButton: Object.freeze({
    label: "Tombol unduh",
    tags: ["button", "a", "div"],
    text: [/download/i, /unduh/i, /simpan/i, /export/i],
    prefer: element => (element.tag === "a" && element.href ? 20 : 0)
  })
});

const ATTRIBUTE_HINTS = Object.freeze(["aria-label", "title", "placeholder", "data-testid", "name", "id"]);

function describableText(element) {
  return [element.text, ...ATTRIBUTE_HINTS.map(key => element.attributes?.[key])]
    .filter(Boolean).join(" ").slice(0, 300);
}

/*
 * Elemen tersembunyi atau berukuran nol tetap ada di DOM dan sering menyerupai
 * elemen yang dicari. Menyaringnya lebih dulu mencegah otomasi mengklik
 * sesuatu yang tidak pernah terlihat pemakai.
 */
function isUsable(element) {
  if (!element || element.hidden) return false;
  if (element.tag === "video") return true;
  return (element.width || 0) > 0 && (element.height || 0) > 0;
}

function scoreCandidate(element, role) {
  if (!isUsable(element)) return -1;
  const rule = ROLES[role];
  if (!rule) return -1;
  if (rule.tags.length && !rule.tags.includes(element.tag)) return -1;
  const haystack = describableText(element);
  const matched = rule.text.some(pattern => pattern.test(haystack));
  /*
   * Peran yang dikenali lewat kata harus benar-benar memuat kata itu. Tanpa
   * syarat ini, sembarang div pada halaman yang belum selesai dimuat lolos
   * sebagai tombol generate hanya karena cocok tag-nya, dan otomasi akan
   * mengklik elemen yang tak ada hubungannya. Kesalahan semacam itu sulit
   * ditelusuri karena tidak memunculkan galat apa pun.
   */
  if (rule.text.length && !matched) return -1;
  let score = 10 + (matched ? 25 : 0);
  score += rule.prefer ? rule.prefer(element) : 0;
  // Elemen dengan data-testid jauh lebih stabil antar pembaruan antarmuka.
  if (element.attributes?.["data-testid"]) score += 15;
  return score;
}

function rankCandidates(elements, role) {
  return (elements || [])
    .map(element => ({ element, score: scoreCandidate(element, role) }))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || (a.element.index || 0) - (b.element.index || 0));
}

/*
 * Selector dibangun dari atribut yang paling jarang berubah lebih dulu.
 * Selector berbasis posisi dipakai hanya sebagai upaya terakhir karena akan
 * meleset begitu satu elemen ditambahkan di atasnya.
 */
function buildSelector(element) {
  const attributes = element.attributes || {};
  if (attributes["data-testid"]) return `[data-testid="${attributes["data-testid"]}"]`;
  if (attributes.id && !/^[0-9]/.test(attributes.id)) return `#${attributes.id}`;
  if (attributes["aria-label"]) return `${element.tag}[aria-label="${attributes["aria-label"]}"]`;
  if (attributes.name) return `${element.tag}[name="${attributes.name}"]`;
  if (attributes.placeholder) return `${element.tag}[placeholder="${attributes.placeholder}"]`;
  return element.selector || element.tag;
}

function discover(elements) {
  const found = {};
  const report = {};
  for (const role of Object.keys(ROLES)) {
    const ranked = rankCandidates(elements, role);
    report[role] = {
      label: ROLES[role].label,
      candidates: ranked.slice(0, 3).map(item => ({ selector: buildSelector(item.element), score: item.score, text: describableText(item.element).slice(0, 80) }))
    };
    if (ranked.length) found[role] = buildSelector(ranked[0].element);
  }
  const missing = Object.keys(ROLES).filter(role => !found[role]);
  return { selectors: found, report, missing, complete: missing.length === 0 };
}

module.exports = { ATTRIBUTE_HINTS, ROLES, buildSelector, describableText, discover, isUsable, rankCandidates, scoreCandidate };
