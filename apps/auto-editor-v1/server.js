"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4174);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = process.env.AIOS_DATA_DIR || path.join(ROOT, "data");
const CONFIG_FILE = path.join(DATA, "config.json");
const QUEUE_FILE = path.join(DATA, "queue.json");
const STATE_FILE = path.join(DATA, "state.json");

fs.mkdirSync(DATA, { recursive: true });

const defaults = {
  inputFolder: "",
  outputFolder: "",
  platform: "tiktok",
  style: "ugc",
  voiceEnabled: true,
  musicEnabled: false,
  musicFile: "",
  volumeMusic: 0.12,
  filenamePattern: "{base}_AIOS_{index}",
  hook: "Wajib lihat detail produk ini!",
  benefit: "Desain menarik, detail rapi, dan cocok dipakai sehari-hari.",
  cta: "Klik keranjang kuning dan cek promonya sekarang.",
  voiceRate: 0,
  variants: 1
};

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); }
  catch { return fallback; }
}
function writeJson(file, value) {
  const temp = `${file}.tmp`;
  fs.writeFileSync(temp, JSON.stringify(value, null, 2), "utf8");
  fs.renameSync(temp, file);
}
if (!fs.existsSync(CONFIG_FILE)) writeJson(CONFIG_FILE, defaults);
if (!fs.existsSync(QUEUE_FILE)) writeJson(QUEUE_FILE, []);
if (!fs.existsSync(STATE_FILE)) writeJson(STATE_FILE, { running:false, current:null, log:[] });

function send(res, status, body, type="application/json; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(type.startsWith("application/json") ? JSON.stringify(body) : body);
}
function getBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", c => {
      data += c;
      if (data.length > 2_000_000) reject(new Error("Request terlalu besar"));
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("JSON tidak valid")); }
    });
    req.on("error", reject);
  });
}
function validateFolder(folder, label) {
  if (!folder || typeof folder !== "string") throw new Error(`${label} belum dipilih.`);
  if (!fs.existsSync(folder)) throw new Error(`${label} tidak ditemukan.`);
  if (!fs.statSync(folder).isDirectory()) throw new Error(`${label} bukan folder.`);
}
function listVideos(folder) {
  validateFolder(folder, "Folder video");
  const allowed = new Set([".mp4", ".mov", ".mkv", ".webm", ".avi", ".m4v"]);
  return fs.readdirSync(folder, { withFileTypes:true })
    .filter(x => x.isFile() && allowed.has(path.extname(x.name).toLowerCase()))
    .map((x, i) => ({
      id: `${Date.now()}-${i}-${Math.random().toString(36).slice(2,8)}`,
      source: path.join(folder, x.name),
      name: x.name,
      base: path.parse(x.name).name,
      status: "queued",
      progress: 0,
      message: "Menunggu",
      output: ""
    }));
}
function appendLog(message) {
  if (!String(message).trim()) return;
  const state = readJson(STATE_FILE, {running:false,current:null,log:[]});
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString("id-ID")}] ${String(message).trim()}`].slice(-300);
  writeJson(STATE_FILE, state);
}

let worker = null;
function startWorker() {
  const state = readJson(STATE_FILE, {running:false,current:null,log:[]});
  const queue = readJson(QUEUE_FILE, []);
  if (state.running || worker) throw new Error("Produksi masih berjalan.");
  if (!queue.length) throw new Error("Queue kosong. Pilih folder lalu klik Scan.");
  const cfg = readJson(CONFIG_FILE, defaults);
  if (cfg.outputFolder) {
    if (!fs.existsSync(cfg.outputFolder)) fs.mkdirSync(cfg.outputFolder, { recursive: true });
    validateFolder(cfg.outputFolder, "Folder output");
  }

  state.running = true;
  state.stopRequested = false;
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString("id-ID")}] Produksi dimulai`];
  writeJson(STATE_FILE, state);

  worker = spawn(process.execPath, [path.join(ROOT, "renderer.js")], {
    cwd: ROOT,
    env: { ...process.env, AIOS_DATA_DIR: DATA, ELECTRON_RUN_AS_NODE: "1" },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"]
  });
  worker.stdout.on("data", d => appendLog(String(d)));
  worker.stderr.on("data", d => appendLog("ERROR: " + String(d)));
  worker.on("exit", code => {
    const s = readJson(STATE_FILE, {});
    s.running = false;
    s.current = null;
    s.log = [...(s.log || []), `[${new Date().toLocaleTimeString("id-ID")}] Worker selesai (${code})`].slice(-300);
    writeJson(STATE_FILE, s);
    worker = null;
  });
  return true;
}
function stopWorker() {
  const state = readJson(STATE_FILE, {});
  state.stopRequested = true;
  state.running = false;
  state.current = null;
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString("id-ID")}] Permintaan berhenti dikirim`].slice(-300);
  writeJson(STATE_FILE, state);
  if (worker && !worker.killed) worker.kill("SIGTERM");
  worker = null;
  return true;
}
function serveStatic(req, res, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  rel = path.normalize(rel).replace(/^(\.\.[/\\])+/, "");
  const file = path.join(PUBLIC, rel);
  if (!file.startsWith(PUBLIC) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    return send(res, 404, "Not found", "text/plain; charset=utf-8");
  }
  const ext = path.extname(file).toLowerCase();
  const types = {
    ".html":"text/html; charset=utf-8", ".js":"application/javascript; charset=utf-8",
    ".css":"text/css; charset=utf-8", ".svg":"image/svg+xml", ".png":"image/png"
  };
  send(res, 200, fs.readFileSync(file), types[ext] || "application/octet-stream");
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const p = u.pathname;

    if (req.method === "GET" && p === "/api/config") return send(res, 200, readJson(CONFIG_FILE, defaults));
    if (req.method === "POST" && p === "/api/config") {
      const body = await getBody(req);
      const cfg = { ...defaults, ...body };
      cfg.variants = Math.max(1, Math.min(5, Number(cfg.variants) || 1));
      cfg.voiceRate = Math.max(-5, Math.min(5, Number(cfg.voiceRate) || 0));
      writeJson(CONFIG_FILE, cfg);
      return send(res, 200, cfg);
    }
    if (req.method === "POST" && p === "/api/scan") {
      const body = await getBody(req);
      const videos = listVideos(body.inputFolder);
      writeJson(QUEUE_FILE, videos);
      appendLog(`${videos.length} video ditemukan di folder input`);
      return send(res, 200, { count: videos.length, queue: videos });
    }
    if (req.method === "GET" && p === "/api/queue") return send(res, 200, readJson(QUEUE_FILE, []));
    if (req.method === "POST" && p === "/api/queue/reset") {
      const q = readJson(QUEUE_FILE, []).map(x => ({...x,status:"queued",progress:0,message:"Menunggu",output:""}));
      writeJson(QUEUE_FILE, q);
      return send(res, 200, q);
    }
    if (req.method === "POST" && p === "/api/start") return send(res, 200, {ok:startWorker()});
    if (req.method === "POST" && p === "/api/stop") return send(res, 200, {ok:stopWorker()});
    if (req.method === "GET" && p === "/api/state") {
      return send(res, 200, {
        state: readJson(STATE_FILE, {running:false,current:null,log:[]}),
        queue: readJson(QUEUE_FILE, [])
      });
    }
    if (req.method === "GET" && p === "/api/check") {
      const ffmpeg = spawn("ffmpeg", ["-version"], {shell:true, windowsHide:true});
      let out = "";
      ffmpeg.stdout.on("data", d => out += d);
      ffmpeg.stderr.on("data", d => out += d);
      ffmpeg.on("error", () => send(res, 200, { node:process.version, ffmpeg:false, ffmpegInfo:"" }));
      ffmpeg.on("close", code => send(res, 200, {
        node: process.version,
        ffmpeg: code === 0,
        ffmpegInfo: out.split(/\r?\n/)[0] || ""
      }));
      return;
    }
    return serveStatic(req, res, p);
  } catch (e) {
    send(res, 400, { error: e.message });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`AIOS Auto Editor berjalan di http://127.0.0.1:${PORT}`);
});