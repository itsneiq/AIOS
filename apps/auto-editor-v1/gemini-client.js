"use strict";

/*
 * Klien Gemini yang sengaja dibuat tipis: tidak menyimpan state, tidak menulis
 * ke disk, dan menerima `fetchImpl` sebagai injeksi supaya seluruh pemanggil
 * bisa diuji tanpa jaringan dan tanpa API key.
 */

const DEFAULT_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_TEXT_MODEL = "gemini-3.6-flash";
const DEFAULT_TIMEOUT_MS = 30000;

// Nama model Gemini berubah cukup sering. Bila default di atas ikut pensiun,
// `--list-models` pada CLI menampilkan model yang benar-benar tersedia untuk
// key yang sedang dipakai, tanpa perlu menebak dari dokumentasi.
const DEFAULT_MAX_RETRIES = 2;
const RETRYABLE_CODES = Object.freeze(["RATE_LIMITED", "SERVER_ERROR", "NETWORK"]);

// Harga video Gemini Omni Flash dipakai untuk estimasi biaya sebelum generate.
const VIDEO_MODEL = "gemini-omni-flash-preview";
const VIDEO_USD_PER_SECOND = 0.1;
const VIDEO_MAX_SECONDS_PER_CALL = 10;

function classifyGeminiError({ status, body = "", error, aborted = false } = {}) {
  const text = `${error?.message || ""}\n${body}`.toLowerCase();
  if (aborted) return { code: "TIMEOUT", message: "Gemini tidak merespons dan permintaan dihentikan." };
  if (status === 400) return { code: "BAD_REQUEST", message: "Permintaan ditolak Gemini. Periksa prompt atau parameter model." };
  if (status === 401 || status === 403) return { code: "AUTH_FAILED", message: "API key Gemini ditolak. Periksa kembali key di pengaturan." };
  if (status === 404) return { code: "MODEL_NOT_FOUND", message: "Model Gemini tidak ditemukan. Ubah nama model di pengaturan (GEMINI_TEXT_MODEL)." };
  if (status === 429) return { code: "RATE_LIMITED", message: "Kuota Gemini habis atau terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." };
  if (status >= 500) return { code: "SERVER_ERROR", message: `Server Gemini sedang bermasalah (HTTP ${status}). Coba lagi beberapa saat.` };
  if (/enotfound|econnrefused|network|fetch failed|dns/.test(text)) return { code: "NETWORK", message: "Tidak bisa menghubungi Gemini. Periksa koneksi internet." };
  return { code: "REQUEST_FAILED", message: `Permintaan ke Gemini gagal${Number.isInteger(status) ? ` (HTTP ${status})` : ""}.` };
}

function geminiError(details) {
  const diagnostic = classifyGeminiError(details);
  const error = new Error(diagnostic.message);
  error.diagnostic = diagnostic;
  return error;
}

/*
 * Gemini kadang membungkus JSON dalam pagar markdown walaupun responseMimeType
 * sudah diminta application/json, jadi pembersihan ini tetap diperlukan.
 */
function extractJSON(raw) {
  const text = String(raw || "").trim();
  if (!text) throw geminiError({ status: 200, body: "respons kosong" });
  const unfenced = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  try {
    return JSON.parse(unfenced);
  } catch {
    const start = unfenced.search(/[[{]/);
    const end = Math.max(unfenced.lastIndexOf("]"), unfenced.lastIndexOf("}"));
    if (start >= 0 && end > start) {
      try { return JSON.parse(unfenced.slice(start, end + 1)); } catch {}
    }
    const error = new Error("Gemini mengembalikan format yang tidak bisa dibaca sebagai JSON.");
    error.diagnostic = { code: "INVALID_JSON", message: error.message };
    error.raw = text.slice(0, 2000);
    throw error;
  }
}

function firstTextPart(payload) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts.map(part => part?.text || "").join("").trim();
}

function estimateVideoCost(seconds, { usdPerSecond = VIDEO_USD_PER_SECOND, usdToIdr = 16000 } = {}) {
  const total = Math.max(0, Number(seconds) || 0);
  const usd = Number((total * usdPerSecond).toFixed(4));
  return {
    seconds: total,
    calls: Math.ceil(total / VIDEO_MAX_SECONDS_PER_CALL) || 0,
    usd,
    idr: Math.round(usd * usdToIdr)
  };
}

function createGeminiClient({
  apiKey,
  model = DEFAULT_TEXT_MODEL,
  endpoint = DEFAULT_ENDPOINT,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxRetries = DEFAULT_MAX_RETRIES,
  fetchImpl,
  sleepImpl
} = {}) {
  const doFetch = fetchImpl || globalThis.fetch;
  const sleep = sleepImpl || (ms => new Promise(resolve => setTimeout(resolve, ms)));

  function requireKey() {
    if (apiKey) return;
    const error = new Error("API key Gemini belum diisi. Set GEMINI_API_KEY atau isi lewat pengaturan aplikasi.");
    error.diagnostic = { code: "NO_API_KEY", message: error.message };
    throw error;
  }

  /*
   * Hanya kegagalan sementara yang diulang. Model salah atau key ditolak tidak
   * akan membaik dengan menunggu, jadi langsung dilempar ke pemanggil.
   */
  async function withRetry(attempt) {
    let lastError;
    for (let tries = 0; tries <= maxRetries; tries++) {
      try {
        return await attempt();
      } catch (error) {
        lastError = error;
        if (!RETRYABLE_CODES.includes(error.diagnostic?.code) || tries === maxRetries) throw error;
        await sleep(1000 * 2 ** tries);
      }
    }
    throw lastError;
  }

  async function listModels() {
    requireKey();
    const response = await doFetch(`${endpoint}/models`, { headers: { "x-goog-api-key": apiKey } });
    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch {}
      throw geminiError({ status: response.status, body });
    }
    const payload = await response.json();
    return (payload?.models || [])
      .filter(item => (item.supportedGenerationMethods || []).includes("generateContent"))
      .map(item => String(item.name || "").replace(/^models\//, ""))
      .filter(Boolean)
      .sort();
  }

  async function generateJSON(prompt, options = {}) {
    return withRetry(() => generateJSONOnce(prompt, options));
  }

  async function generateJSONOnce(prompt, { temperature = 1, maxOutputTokens = 4096, signal } = {}) {
    requireKey();
    if (typeof doFetch !== "function") {
      const error = new Error("fetch tidak tersedia. Jalankan dengan Node.js 20 atau lebih baru.");
      error.diagnostic = { code: "NO_FETCH", message: error.message };
      throw error;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    signal?.addEventListener("abort", () => controller.abort(), { once: true });

    let response;
    try {
      response = await doFetch(`${endpoint}/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: String(prompt) }] }],
          generationConfig: { temperature, maxOutputTokens, responseMimeType: "application/json" }
        }),
        signal: controller.signal
      });
    } catch (error) {
      throw geminiError({ error, aborted: controller.signal.aborted });
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      let body = "";
      try { body = await response.text(); } catch {}
      throw geminiError({ status: response.status, body });
    }

    let payload;
    try { payload = await response.json(); } catch (error) { throw geminiError({ error, status: response.status }); }

    const blocked = payload?.promptFeedback?.blockReason;
    if (blocked) {
      const error = new Error(`Gemini menolak prompt (${blocked}). Ubah deskripsi produk lalu coba lagi.`);
      error.diagnostic = { code: "BLOCKED", message: error.message };
      throw error;
    }

    return { data: extractJSON(firstTextPart(payload)), usage: payload?.usageMetadata || null, model };
  }

  return { model, endpoint, generateJSON, listModels };
}

module.exports = {
  DEFAULT_ENDPOINT,
  DEFAULT_MAX_RETRIES,
  DEFAULT_TEXT_MODEL,
  DEFAULT_TIMEOUT_MS,
  RETRYABLE_CODES,
  VIDEO_MAX_SECONDS_PER_CALL,
  VIDEO_MODEL,
  VIDEO_USD_PER_SECOND,
  classifyGeminiError,
  createGeminiClient,
  estimateVideoCost,
  extractJSON
};
