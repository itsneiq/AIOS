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

  const failing = createGeminiClient({ apiKey: "k", fetchImpl: async () => ({ ok: false, status: 429, text: async () => "quota" }) });
  await assert.rejects(() => failing.generateJSON("x"), error => error.diagnostic.code === "RATE_LIMITED");

  const blocked = createGeminiClient({ apiKey: "k", fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ promptFeedback: { blockReason: "SAFETY" } }) }) });
  await assert.rejects(() => blocked.generateJSON("x"), error => error.diagnostic.code === "BLOCKED");

  console.log("gemini client tests passed");
})();
