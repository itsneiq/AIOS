"use strict";
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { buildVideoRequest, createOmniClient, extractVideo, readInteractionId, readStatus } = require("../omni-client");

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "omni-uji-"));
const foto = path.join(dir, "produk.jpg");
fs.writeFileSync(foto, Buffer.from([0xff, 0xd8, 0xff, 0xe0]));

// Foto produk harus jadi bagian pertama: identitas produk berasal dari gambar
// nyata, bukan dari imajinasi model.
const denganFoto = buildVideoRequest({ model: "m", prompt: "tangan memegang botol", imagePath: foto, seconds: 6 });
assert.equal(denganFoto.model, "m");
assert.ok(Array.isArray(denganFoto.input));
assert.ok(denganFoto.input[0].inlineData.data.length > 0);
assert.equal(denganFoto.input[0].inlineData.mimeType, "image/jpeg");
assert.ok(denganFoto.input[1].text.startsWith("tangan memegang botol"));

/*
 * API menolak objek `config` dengan "Unknown parameter 'config'", dan menebak
 * nama penggantinya berarti membayar satu panggilan per tebakan. Permintaan
 * karena itu dijaga hanya berisi model dan input, dengan durasi disampaikan
 * lewat teks prompt yang memang sudah kita kendalikan.
 */
assert.deepEqual(Object.keys(denganFoto).sort(), ["input", "model"]);
assert.match(denganFoto.input[1].text, /Durasi klip sekitar 6 detik\./);

// Batas sepuluh detik per panggilan ditegakkan di sisi klien.
assert.match(buildVideoRequest({ model: "m", prompt: "x", seconds: 30 }).input, /sekitar 10 detik/);
assert.match(buildVideoRequest({ model: "m", prompt: "x", seconds: 0 }).input, /sekitar 1 detik/);

// Bila nama parameter yang benar kelak diketahui, extras menyalurkannya tanpa
// mengubah bentuk dasar permintaan.
assert.equal(buildVideoRequest({ model: "m", prompt: "x", extras: { response_format: { type: "video" } } }).response_format.type, "video");

// Tanpa foto, input menyusut jadi teks biasa.
assert.equal(typeof buildVideoRequest({ model: "m", prompt: "x" }).input, "string");

assert.equal(buildVideoRequest({ model: "m", prompt: "x", previousInteractionId: "abc" }).previousInteractionId, "abc");
assert.equal(Object.hasOwn(buildVideoRequest({ model: "m", prompt: "x" }), "previousInteractionId"), false);

assert.throws(() => buildVideoRequest({ model: "m", prompt: "x", imagePath: path.join(dir, "hilang.jpg") }), /tidak ditemukan/);
fs.writeFileSync(path.join(dir, "produk.bmp"), "x");
assert.throws(() => buildVideoRequest({ model: "m", prompt: "x", imagePath: path.join(dir, "produk.bmp") }), /tidak didukung/);

/*
 * Bentuk tanggapan Omni belum bisa dipastikan dari dokumentasi, jadi pembaca
 * harus menelusuri beberapa bentuk yang masuk akal dan tetap melapor jelas
 * bila semuanya gagal.
 */
assert.deepEqual(extractVideo({ steps: [{ content: [{ type: "video", uri: "https://v/1.mp4" }] }] }), { kind: "uri", uri: "https://v/1.mp4" });
assert.deepEqual(extractVideo({ content: [{ mimeType: "video/mp4", data: "AAA" }] }), { kind: "inline", data: "AAA" });
assert.deepEqual(extractVideo({ candidates: [{ content: { parts: [{ fileData: { fileUri: "gs://v/2.mp4", mimeType: "video/mp4" } }] } }] }), { kind: "uri", uri: "gs://v/2.mp4" });
assert.deepEqual(extractVideo({ steps: [{ content: [{ type: "text", text: "abaikan" }, { type: "video", url: "https://v/3.mp4" }] }] }), { kind: "uri", uri: "https://v/3.mp4" });

const gagal = (() => { try { extractVideo({ steps: [{ content: [{ type: "text" }] }] }); } catch (error) { return error; } })();
assert.equal(gagal.diagnostic.code, "VIDEO_NOT_FOUND");
assert.ok(gagal.sample.includes("text"), "kegagalan harus melaporkan struktur yang benar-benar diterima");
assert.ok(gagal.message.includes("probe"), "pesan harus menunjuk langkah perbaikan");

assert.equal(readStatus({ status: "COMPLETED" }), "completed");
assert.equal(readStatus({ done: true }), "completed");
assert.equal(readStatus({ status: "FAILED" }), "failed");
assert.equal(readStatus({ status: "running" }), "running");
assert.equal(readStatus({}), "running");
assert.equal(readInteractionId({ name: "interactions/xyz" }), "interactions/xyz");

(async () => {
  await assert.rejects(() => createOmniClient({ apiKey: "" }).probe(), /API key Gemini belum diisi/);

  // Alur lengkap: kirim, status berjalan, lalu selesai membawa video.
  const dipanggil = [];
  let putaran = 0;
  const klien = createOmniClient({
    apiKey: "k",
    sleepImpl: async () => {},
    fetchImpl: async (url, init) => {
      dipanggil.push({ url, method: init?.method || "GET" });
      if (init?.method === "POST") return { ok: true, status: 200, json: async () => ({ id: "int-1", status: "running" }) };
      putaran++;
      return putaran < 2
        ? { ok: true, status: 200, json: async () => ({ id: "int-1", status: "running" }) }
        : { ok: true, status: 200, json: async () => ({ id: "int-1", status: "completed", steps: [{ content: [{ type: "video", uri: "https://v/final.mp4" }] }] }) };
    }
  });
  const kemajuan = [];
  const hasil = await klien.generateClip({ prompt: "p", imagePath: foto, seconds: 6, onProgress: item => kemajuan.push(item) });
  assert.deepEqual(hasil.video, { kind: "uri", uri: "https://v/final.mp4" });
  assert.equal(hasil.interactionId, "int-1");
  assert.equal(dipanggil[0].method, "POST");
  assert.ok(dipanggil[0].url.endsWith("/interactions"));
  assert.ok(dipanggil[1].url.includes("/interactions/int-1"), "polling memakai id tanpa awalan ganda");
  assert.ok(kemajuan.length >= 1, "kemajuan dilaporkan selama menunggu");

  // Kegagalan dari sisi Gemini tidak boleh menggantung sebagai "masih berjalan".
  const gagalGenerate = createOmniClient({
    apiKey: "k", sleepImpl: async () => {},
    fetchImpl: async (url, init) => init?.method === "POST"
      ? { ok: true, status: 200, json: async () => ({ id: "int-2", status: "running" }) }
      : { ok: true, status: 200, json: async () => ({ id: "int-2", status: "failed", error: { message: "prompt ditolak" } }) }
  });
  await assert.rejects(() => gagalGenerate.generateClip({ prompt: "p" }), error => error.diagnostic.code === "GENERATION_FAILED" && /prompt ditolak/.test(error.message));

  // Menunggu tanpa batas akan membakar waktu tanpa kabar; harus ada tenggat.
  const menggantung = createOmniClient({
    apiKey: "k", sleepImpl: async () => {}, pollTimeoutMs: -1,
    fetchImpl: async () => ({ ok: true, status: 200, json: async () => ({ id: "int-3", status: "running" }) })
  });
  await assert.rejects(() => menggantung.generateClip({ prompt: "p" }), error => error.diagnostic.code === "TIMEOUT");

  const kuota = createOmniClient({ apiKey: "k", fetchImpl: async () => ({ ok: false, status: 429, text: async () => "quota" }) });
  await assert.rejects(() => kuota.probe(), error => error.diagnostic.code === "RATE_LIMITED");

  /*
   * Kuota bernilai nol berbeda sifatnya dari kuota yang habis terpakai:
   * menunggu tidak akan pernah menolong, karena pembuatan video memang tidak
   * punya jatah gratis. Keduanya harus terbaca berbeda agar tidak ada
   * percobaan ulang yang pasti gagal.
   */
  const tanpaJatah = createOmniClient({
    apiKey: "k",
    fetchImpl: async () => ({ ok: false, status: 429, text: async () => '{"error":{"message":"Quota exceeded for metric: generate_content_free_tier_input_token_count, limit: 0, model: gemini-omni"}}' })
  });
  await assert.rejects(() => tanpaJatah.probe(), error =>
    error.diagnostic.code === "BILLING_REQUIRED" && /penagihan/.test(error.message));

  // Parameter yang ditolak menunjuk ke bentuk permintaan, bukan ke isi prompt.
  const bentukSalah = createOmniClient({
    apiKey: "k",
    fetchImpl: async () => ({ ok: false, status: 400, text: async () => '{"error":{"message":"Unknown parameter \'config\'."}}' })
  });
  await assert.rejects(() => bentukSalah.probe(), error =>
    error.diagnostic.code === "BAD_REQUEST_SHAPE" && /buildVideoRequest/.test(error.message));

  fs.rmSync(dir, { recursive: true, force: true });
  console.log("omni client tests passed");
})();
