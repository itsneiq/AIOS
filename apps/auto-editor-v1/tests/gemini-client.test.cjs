"use strict";
const assert = require("node:assert/strict");
const { classifyGeminiError, createGeminiClient, estimateVideoCost, extractJSON } = require("../gemini-client");

// JSON bisa datang polos, berpagar markdown, atau terselip di antara teks.
assert.deepEqual(extractJSON('[{"hook":"a"}]'), [{ hook: "a" }]);
assert.deepEqual(extractJSON('```json\n[{"hook":"a"}]\n```'), [{ hook: "a" }]);
assert.deepEqual(extractJSON('Ini hasilnya:\n[{"hook":"a"}]\nsemoga membantu'), [{ hook: "a" }]);
assert.throws(() => extractJSON("bukan json sama sekali"), /tidak bisa dibaca sebagai JSON/);
assert.throws(() => extractJSON(""), /Gemini/);

assert.equal(classifyGeminiError({ status: 404 }).code, "MODEL_NOT_FOUND");
assert.equal(classifyGeminiError({ status: 401 }).code, "AUTH_FAILED");
assert.equal(classifyGeminiError({ status: 429 }).code, "RATE_LIMITED");
assert.equal(classifyGeminiError({ status: 503 }).code, "SERVER_ERROR");
assert.equal(classifyGeminiError({ aborted: true }).code, "TIMEOUT");
assert.equal(classifyGeminiError({ error: { message: "fetch failed" } }).code, "NETWORK");
assert.match(classifyGeminiError({ status: 404 }).message, /GEMINI_TEXT_MODEL/);

// Estimasi biaya adalah satu-satunya angka yang dilihat pengguna sebelum membayar.
assert.deepEqual(estimateVideoCost(9), { seconds: 9, calls: 1, usd: 0.9, idr: 14400 });
assert.deepEqual(estimateVideoCost(18), { seconds: 18, calls: 2, usd: 1.8, idr: 28800 });
assert.equal(estimateVideoCost(0).calls, 0);
assert.equal(estimateVideoCost(11).calls, 2, "lebih dari 10 detik harus dipecah menjadi dua panggilan");

(async () => {
  const noKey = createGeminiClient({ apiKey: "" });
  await assert.rejects(() => noKey.generateJSON("x"), /API key Gemini belum diisi/);

  let captured = null;
  const ok = createGeminiClient({
    apiKey: "test-key",
    model: "model-uji",
    fetchImpl: async (url, init) => {
      captured = { url, init };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"hook":"halo"}]' }] } }], usageMetadata: { totalTokenCount: 12 } }) };
    }
  });
  const result = await ok.generateJSON("prompt uji");
  assert.deepEqual(result.data, [{ hook: "halo" }]);
  assert.equal(result.usage.totalTokenCount, 12);
  assert.match(captured.url, /model-uji:generateContent$/);
  assert.equal(captured.init.headers["x-goog-api-key"], "test-key", "API key harus lewat header, bukan query string");
  assert.equal(JSON.parse(captured.init.body).generationConfig.responseMimeType, "application/json");

  // Kegagalan sementara diulang dengan jeda; jeda disuntik agar tes tidak menunggu.
  let percobaan = 0;
  const jeda = [];
  const sempatGagal = createGeminiClient({
    apiKey: "k",
    sleepImpl: async ms => { jeda.push(ms); },
    fetchImpl: async () => {
      percobaan++;
      if (percobaan < 3) return { ok: false, status: 503, text: async () => "sibuk" };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"hook":"akhirnya"}]' }] } }] }) };
    }
  });
  assert.deepEqual((await sempatGagal.generateJSON("x")).data, [{ hook: "akhirnya" }]);
  assert.equal(percobaan, 3);
  assert.deepEqual(jeda, [1000, 2000], "jeda harus naik secara eksponensial");

  let dicoba = 0;
  const failing = createGeminiClient({
    apiKey: "k",
    sleepImpl: async () => {},
    fetchImpl: async () => { dicoba++; return { ok: false, status: 429, text: async () => "quota" }; }
  });
  await assert.rejects(() => failing.generateJSON("x"), error => error.diagnostic.code === "RATE_LIMITED");
  assert.equal(dicoba, 3, "satu percobaan awal ditambah dua ulangan");

  // Model salah tidak akan membaik dengan menunggu, jadi tidak boleh diulang.
  let modelDicoba = 0;
  const modelSalah = createGeminiClient({
    apiKey: "k",
    sleepImpl: async () => {},
    fetchImpl: async () => { modelDicoba++; return { ok: false, status: 404, text: async () => "not found" }; }
  });
  await assert.rejects(() => modelSalah.generateJSON("x"), error => error.diagnostic.code === "MODEL_NOT_FOUND");
  // Satu panggilan generateContent, lalu satu upaya mencari model pengganti.
  // Yang penting: generateContent tidak diulang-ulang, karena menunggu tidak
  // akan menghidupkan kembali model yang sudah pensiun.
  assert.equal(modelDicoba, 2, "kesalahan permanen tidak diulang, hanya dicarikan pengganti sekali");

  // listModels hanya menampilkan model yang benar-benar bisa generateContent.
  const daftar = createGeminiClient({
    apiKey: "k",
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ models: [
      { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
      { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] },
      { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: ["generateContent"] }
    ] }) })
  });
  assert.deepEqual(await daftar.listModels(), ["gemini-3.5-flash-lite", "gemini-3.6-flash"]);
  await assert.rejects(() => createGeminiClient({ apiKey: "" }).listModels(), /API key Gemini belum diisi/);

  const blocked = createGeminiClient({ apiKey: "k", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }) }) });
  await assert.rejects(() => blocked.generateJSON("x"), error => error.diagnostic.code === "BLOCKED");

  /*
   * Model pensiun adalah kegagalan paling mudah terlewat: pipeline diam-diam
   * memakai template dan keluarannya tetap terlihat wajar. Klien harus mencari
   * pengganti sendiri, bukan menyerah dan menyalahkan pengguna.
   */
  const daftarModel = { models: [
    { name: "models/gemini-3.6-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: ["generateContent"] },
    { name: "models/gemini-3.1-flash", supportedGenerationMethods: ["generateContent"] },
    { name: "models/text-embedding-004", supportedGenerationMethods: ["embedContent"] }
  ] };
  const dipanggil = [];
  const pensiun = createGeminiClient({
    apiKey: "k",
    model: "gemini-1.0-sudah-pensiun",
    sleepImpl: async () => {},
    fetchImpl: async url => {
      dipanggil.push(url);
      if (url.endsWith("/models")) return { ok: true, status: 200, json: async () => daftarModel };
      if (url.includes("sudah-pensiun")) return { ok: false, status: 404, text: async () => "not found" };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: '[{"hook":"jalan"}]' }] } }] }) };
    }
  });
  const pulih = await pensiun.generateJSON("x");
  assert.deepEqual(pulih.data, [{ hook: "jalan" }]);
  assert.equal(pulih.modelAutoResolved, "gemini-3.6-flash", "harus memilih flash versi tertinggi");
  assert.equal(pensiun.model, "gemini-3.6-flash", "model aktif ikut berubah");
  assert.ok(dipanggil.some(url => url.endsWith("/models")), "daftar model harus ditanyakan");

  // Varian lite dihindari selama masih ada flash penuh, karena kualitas copy
  // lebih menentukan daripada kecepatan di tahap ini.
  const hanyaLite = createGeminiClient({
    apiKey: "k", model: "gemini-lama",
    sleepImpl: async () => {},
    fetchImpl: async url => url.endsWith("/models")
      ? { ok: true, status: 200, json: async () => ({ models: [{ name: "models/gemini-3.5-flash-lite", supportedGenerationMethods: ["generateContent"] }] }) }
      : url.includes("gemini-lama")
        ? { ok: false, status: 404, text: async () => "nope" }
        : { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: "[]" }] } }] }) }
  });
  await hanyaLite.generateJSON("x");
  assert.equal(hanyaLite.model, "gemini-3.5-flash-lite", "lite tetap dipakai bila tidak ada pilihan lain");

  // Bila daftar model juga kosong, kesalahan asli yang dilempar.
  const buntu = createGeminiClient({
    apiKey: "k", model: "gemini-lama",
    sleepImpl: async () => {},
    fetchImpl: async url => url.endsWith("/models")
      ? { ok: true, status: 200, json: async () => ({ models: [] }) }
      : { ok: false, status: 404, text: async () => "nope" }
  });
  await assert.rejects(() => buntu.generateJSON("x"), error => error.diagnostic.code === "MODEL_NOT_FOUND");

  console.log("gemini client tests passed");
})();
