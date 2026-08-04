"use strict";

/*
 * Saringan kebijakan iklan Meta untuk copy berbahasa Indonesia.
 *
 * Tujuannya bukan menjamin iklan lolos review, tetapi menangkap pola yang
 * paling sering membuat iklan affiliate ditolak sebelum biaya generate video
 * dikeluarkan. Iklan yang ditolak lebih merugikan daripada iklan yang lemah,
 * karena tidak menghasilkan data apa pun.
 *
 * severity:
 *   high   - hampir pasti ditolak, harus ditulis ulang
 *   medium - berisiko, sebaiknya dihaluskan
 */

const RULES = Object.freeze([
  Object.freeze({
    id: "medical_claim",
    severity: "high",
    label: "Klaim medis",
    hint: "Ganti ke bahasa perawatan, bukan pengobatan. Contoh: \"membantu merawat\" bukan \"menyembuhkan\".",
    patterns: [/\bmenyembuhkan\b/i, /\bmengobati\b/i, /\bpenyembuh(an)?\b/i, /\bobat\s+(jerawat|kulit|wajah)\b/i, /\bmenghilangkan\s+(penyakit|infeksi)\b/i, /\bterbukti\s+secara\s+klinis\b/i, /\bbebas\s+penyakit\b/i]
  }),
  Object.freeze({
    id: "absolute_claim",
    severity: "high",
    label: "Klaim mutlak",
    hint: "Hindari jaminan pasti. Ganti ke \"membantu\", \"banyak yang cocok\", atau sebutkan manfaat tanpa menjanjikan hasil.",
    patterns: [/\b100\s*%\s*(ampuh|berhasil|efektif|works?)\b/i, /\bdijamin\s+(putih|kurus|mulus|hilang|berhasil|ampuh)\b/i, /\bpasti\s+(berhasil|putih|kurus|hilang)\b/i, /\bgaransi\s+hasil\b/i, /\bpermanen\b/i, /\btanpa\s+efek\s+samping\b/i]
  }),
  Object.freeze({
    id: "personal_attribute",
    severity: "high",
    label: "Menyinggung atribut pribadi",
    hint: "Meta melarang iklan yang seolah tahu kondisi pribadi penonton. Ubah dari \"kamu yang berjerawat\" menjadi \"buat kulit yang mudah berjerawat\".",
    patterns: [/\bkamu\s+yang\s+(gemuk|kurus|jerawatan|berjerawat|kusam|botak|tua)\b/i, /\bkulit\s+(jelek|kusam|jerawatan)\s+kamu\b/i, /\bmuka\s+kamu\s+(jelek|kusam|berminyak)\b/i, /\bberat\s+badan\s+kamu\b/i, /\bmasih\s+(gemuk|jerawatan|kusam)\s*\?/i, /\bbadan\s+kamu\s+(gemuk|gendut)\b/i]
  }),
  Object.freeze({
    id: "time_guarantee",
    severity: "medium",
    label: "Janji hasil berjangka waktu",
    hint: "Hapus tenggat hasil, atau ubah jadi durasi pemakaian. Contoh: \"dipakai rutin tiap malam\" bukan \"putih dalam 7 hari\".",
    patterns: [/\b(putih|kurus|mulus|hilang|glowing)\s+dalam\s+\d+\s*(hari|minggu|jam|menit)\b/i, /\bhanya\s+\d+\s*hari\s+(langsung|hasilnya)\b/i, /\binstan\s+(putih|kurus|glowing)\b/i, /\bseminggu\s+langsung\s+\w+/i]
  }),
  Object.freeze({
    id: "superlative",
    severity: "medium",
    label: "Superlatif tanpa bukti",
    hint: "Klaim peringkat butuh bukti. Ganti ke \"salah satu yang paling dicari\" atau sebutkan angka yang bisa lu pertanggungjawabkan.",
    patterns: [/\b(terbaik|ternomor|nomor\s*1|no\.?\s*1)\s+(di\s+)?(dunia|indonesia|pasaran)\b/i, /\bpaling\s+ampuh\s+(di|se)\w*/i, /\bsatu-satunya\s+yang\b/i]
  }),
  Object.freeze({
    id: "shock_urgency",
    severity: "medium",
    label: "Urgensi berlebihan",
    hint: "Urgensi boleh, tapi jangan mengancam atau menakut-nakuti. Fokus ke stok atau promo yang memang nyata.",
    patterns: [/\bawas\s+menyesal\b/i, /\bbahaya\s+kalau\s+tidak\b/i, /\bjangan\s+sampai\s+menyesal\s+seumur\s+hidup\b/i]
  })
]);

const SEVERITY_WEIGHT = Object.freeze({ high: 40, medium: 15 });

function textOf(script) {
  if (typeof script === "string") return script;
  return [script?.hook, script?.benefit, script?.cta].filter(Boolean).join(" ");
}

function checkPolicy(script) {
  const text = textOf(script);
  const violations = [];
  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      const match = pattern.exec(text);
      if (!match) continue;
      violations.push({ rule: rule.id, label: rule.label, severity: rule.severity, matched: match[0].trim(), hint: rule.hint });
      break;
    }
  }
  const penalty = violations.reduce((total, item) => total + (SEVERITY_WEIGHT[item.severity] || 0), 0);
  return {
    safe: violations.length === 0,
    blocking: violations.some(item => item.severity === "high"),
    violations,
    penalty: Math.min(100, penalty)
  };
}

/*
 * Dipakai saat membangun prompt supaya model diberi tahu batasannya sejak awal,
 * bukan hanya disaring setelah menghasilkan copy yang melanggar.
 */
function policyPromptRules() {
  return RULES.map(rule => `- ${rule.label}: ${rule.hint}`).join("\n");
}

module.exports = { RULES, SEVERITY_WEIGHT, checkPolicy, policyPromptRules, textOf };
