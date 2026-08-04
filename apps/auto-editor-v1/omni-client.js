"use strict";

/*
 * Klien Gemini Omni Flash untuk pembuatan klip video.
 *
 * Dokumentasi resmi Interactions API tidak dapat diambil saat modul ini
 * ditulis, sehingga bentuk permintaan dan pembacaan tanggapan disusun dari
 * sumber sekunder dan bisa saja meleset. Konsekuensinya modul ini dirancang
 * agar salah bentuk mudah diperbaiki dan tidak mahal:
 *
 * - Penyusunan permintaan dan pembacaan tanggapan berdiri sebagai fungsi
 *   terpisah yang diekspor, sehingga hanya keduanya yang perlu disentuh.
 * - Pembaca tanggapan menelusuri beberapa bentuk yang masuk akal, lalu
 *   melaporkan struktur yang benar-benar diterima bila semuanya gagal.
 * - `probe()` melakukan satu panggilan termurah untuk memastikan bentuknya
 *   sebelum biaya generate dikeluarkan.
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_VIDEO_MODEL = "gemini-omni-flash-preview";
const MAX_SECONDS_PER_CALL = 10;
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_POLL_TIMEOUT_MS = 10 * 60 * 1000;

const MIME_BY_EXTENSION = Object.freeze({
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".heic": "image/heic", ".heif": "image/heif"
});

function omniError(code, message, extra = {}) {
  const error = new Error(message);
  error.diagnostic = { code, message };
  Object.assign(error, extra);
  return error;
}

function readImagePart(imagePath) {
  if (!imagePath) return null;
  if (!fs.existsSync(imagePath)) {
    throw omniError("IMAGE_MISSING", `Foto produk tidak ditemukan: ${imagePath}`);
  }
  const mimeType = MIME_BY_EXTENSION[path.extname(imagePath).toLowerCase()];
  if (!mimeType) {
    throw omniError("IMAGE_UNSUPPORTED", `Format foto tidak didukung: ${path.extname(imagePath) || "tanpa ekstensi"}. Pakai JPG, PNG, atau WEBP.`);
  }
  return { inlineData: { mimeType, data: fs.readFileSync(imagePath).toString("base64") } };
}

/*
 * Foto produk sengaja diletakkan sebagai bagian pertama. Identitas produk
 * harus berasal dari gambar nyata, bukan dari imajinasi model; inilah satu
 * pengungkit terbesar untuk menjaga bentuk dan warna tetap konsisten.
 */
function buildVideoRequest({ model, prompt, imagePath, seconds, previousInteractionId, extras }) {
  /*
   * Durasi yang tidak masuk akal jatuh ke satu detik, bukan ke batas atas.
   * Setiap detik dibayar, jadi kesalahan pemanggil harus berujung pada klip
   * termurah yang langsung terlihat salah, bukan pada tagihan sepuluh kali
   * lipat yang lolos tanpa disadari.
   */
  const diminta = Number(seconds);
  const durasi = Number.isFinite(diminta) && diminta > 0
    ? Math.max(1, Math.min(MAX_SECONDS_PER_CALL, Math.round(diminta)))
    : 1;
  /*
   * Permintaan sengaja dijaga seminimal mungkin: hanya `model` dan `input`.
   * Menyertakan objek `config` ditolak API dengan "Unknown parameter 'config'",
   * dan menebak nama pengganti berarti membayar satu panggilan per tebakan.
   *
   * Karena itu durasi disampaikan lewat teks prompt, yang bagaimanapun sudah
   * kita kendalikan penuh. Rasio 9:16 sudah dibawa kontrak gaya dari
   * shot-planner. Bila kelak nama parameter yang benar diketahui, `extras`
   * menyalurkannya tanpa mengubah bentuk dasar.
   */
  const parts = [];
  const image = readImagePart(imagePath);
  if (image) parts.push(image);
  parts.push({ text: `${String(prompt || "").trim()} Durasi klip sekitar ${durasi} detik.`.trim() });

  const body = {
    model,
    input: parts.length === 1 ? parts[0].text : parts,
    ...(extras && typeof extras === "object" ? extras : {})
  };
  // Perantaian ke interaksi sebelumnya adalah cara menjaga produk, pencahayaan,
  // dan sudut kamera tetap sama antar klip.
  if (previousInteractionId) body.previousInteractionId = previousInteractionId;
  return body;
}

const asArray = value => Array.isArray(value) ? value : value == null ? [] : [value];

function collectCandidates(payload) {
  const steps = asArray(payload?.steps).flatMap(step => asArray(step?.content));
  return [
    ...steps,
    ...asArray(payload?.content),
    ...asArray(payload?.response?.steps).flatMap(step => asArray(step?.content)),
    ...asArray(payload?.candidates).flatMap(item => asArray(item?.content?.parts))
  ];
}

/*
 * Mengambil rujukan video dari tanggapan. Beberapa bentuk ditelusuri karena
 * penamaan pada API ini belum bisa dipastikan; yang gagal melapor apa adanya
 * agar perbaikannya satu langkah, bukan menebak lagi.
 */
function extractVideo(payload) {
  for (const item of collectCandidates(payload)) {
    if (!item || typeof item !== "object") continue;
    const mime = item.mimeType || item.inlineData?.mimeType || item.fileData?.mimeType || item.video?.mimeType || "";
    const isVideo = item.type === "video" || /^video\//.test(mime);
    if (!isVideo) continue;
    const uri = item.uri || item.url || item.fileUri || item.fileData?.fileUri || item.video?.uri;
    const data = item.data || item.inlineData?.data || item.bytesBase64Encoded;
    if (uri) return { kind: "uri", uri };
    if (data) return { kind: "inline", data };
  }
  throw omniError(
    "VIDEO_NOT_FOUND",
    "Tanggapan Omni tidak memuat video pada bentuk yang dikenali. Jalankan mode probe lalu sesuaikan extractVideo().",
    { received: Object.keys(payload || {}), sample: JSON.stringify(payload || {}).slice(0, 1500) }
  );
}

function readStatus(payload) {
  const raw = String(payload?.status || payload?.state || (payload?.done ? "completed" : "") || "").toLowerCase();
  if (["failed", "error", "cancelled", "canceled"].includes(raw)) return "failed";
  if (["completed", "succeeded", "success", "done"].includes(raw)) return "completed";
  return "running";
}

function readInteractionId(payload) {
  return payload?.id || payload?.name || payload?.interactionId || null;
}

function createOmniClient({
  apiKey,
  model = DEFAULT_VIDEO_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  pollTimeoutMs = DEFAULT_POLL_TIMEOUT_MS,
  fetchImpl,
  sleepImpl
} = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const sleep = sleepImpl || (ms => new Promise(resolve => setTimeout(resolve, ms)));

  async function request(url, init = {}) {
    if (!apiKey) throw omniError("NO_API_KEY", "API key Gemini belum diisi. Set GEMINI_API_KEY.");
    let response;
    try {
      response = await doFetch(url, { ...init, headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey, ...(init.headers || {}) } });
    } catch (error) {
      throw omniError("NETWORK", `Tidak bisa menghubungi Gemini: ${error.message}`);
    }
    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch {}
      // Parameter yang ditolak menunjuk ke bentuk permintaan, bukan ke isi
      // prompt, jadi dibedakan agar perbaikannya langsung terarah.
      const unknownParameter = /unknown (parameter|field)/i.exec(body);
      /*
       * Kuota bernilai nol berbeda sifatnya dari kuota yang habis terpakai.
       * Pembuatan video tidak punya jatah gratis sama sekali, sehingga
       * menunggu atau mengulang tidak akan pernah berhasil; yang dibutuhkan
       * adalah penagihan yang aktif. Membedakan keduanya mencegah percobaan
       * ulang yang pasti gagal sekaligus menunjuk perbaikan yang benar.
       */
      const noFreeTier = response.status === 429 && (/limit:\s*0\b/i.test(body) || /billing/i.test(body));
      const code = unknownParameter ? "BAD_REQUEST_SHAPE"
        : noFreeTier ? "BILLING_REQUIRED"
        : response.status === 404 ? "MODEL_NOT_FOUND"
        : response.status === 429 ? "RATE_LIMITED"
        : response.status >= 500 ? "SERVER_ERROR" : "REQUEST_FAILED";
      const petunjuk = unknownParameter ? " Sesuaikan buildVideoRequest() di omni-client.js."
        : noFreeTier ? " Pembuatan video tidak punya jatah gratis. Aktifkan penagihan pada project Google Cloud milik API key ini di https://aistudio.google.com/apikey."
        : "";
      throw omniError(code, `Permintaan video gagal (HTTP ${response.status}). ${body.slice(0, 400)}${petunjuk}`);
    }
    return response.json();
  }

  async function submit(options) {
    return request(`${endpoint}/interactions`, { method: "POST", body: JSON.stringify(buildVideoRequest({ ...options, model })) });
  }

  async function poll(interactionId) {
    return request(`${endpoint}/interactions/${encodeURIComponent(String(interactionId).replace(/^interactions\//, ""))}`);
  }

  async function waitUntilDone(payload, { onProgress } = {}) {
    const started = Date.now();
    let current = payload;
    let ticks = 0;
    while (readStatus(current) === "running") {
      if (Date.now() - started > pollTimeoutMs) {
        throw omniError("TIMEOUT", `Video belum selesai setelah ${Math.round(pollTimeoutMs / 60000)} menit. Interaksi: ${readInteractionId(current)}`);
      }
      const id = readInteractionId(current);
      if (!id) throw omniError("NO_INTERACTION_ID", "Tanggapan Omni tidak memuat id interaksi sehingga status tidak bisa ditanyakan.", { sample: JSON.stringify(current || {}).slice(0, 800) });
      onProgress?.({ seconds: Math.round((Date.now() - started) / 1000), ticks: ++ticks });
      await sleep(pollIntervalMs);
      current = await poll(id);
    }
    if (readStatus(current) === "failed") {
      throw omniError("GENERATION_FAILED", `Gemini gagal membuat video. ${current?.error?.message || ""}`.trim(), { sample: JSON.stringify(current || {}).slice(0, 800) });
    }
    return current;
  }

  async function generateClip({ prompt, imagePath, seconds, previousInteractionId, onProgress } = {}) {
    const submitted = await submit({ prompt, imagePath, seconds, previousInteractionId });
    const finished = await waitUntilDone(submitted, { onProgress });
    return { video: extractVideo(finished), interactionId: readInteractionId(finished), raw: finished };
  }

  /*
   * Panggilan terpendek yang mungkin, hanya untuk memastikan bentuk permintaan
   * dan tanggapan sebelum klip yang sebenarnya dibuat.
   */
  async function probe({ prompt = "Sebuah botol kecil berputar pelan di atas meja putih." } = {}) {
    const submitted = await submit({ prompt, seconds: 1 });
    return { interactionId: readInteractionId(submitted), status: readStatus(submitted), keys: Object.keys(submitted || {}), raw: submitted };
  }

  return { model, endpoint, generateClip, poll, probe, submit, waitUntilDone };
}

module.exports = {
  DEFAULT_ENDPOINT,
  DEFAULT_POLL_INTERVAL_MS,
  DEFAULT_POLL_TIMEOUT_MS,
  DEFAULT_VIDEO_MODEL,
  MAX_SECONDS_PER_CALL,
  MIME_BY_EXTENSION,
  buildVideoRequest,
  createOmniClient,
  extractVideo,
  readInteractionId,
  readStatus
};
