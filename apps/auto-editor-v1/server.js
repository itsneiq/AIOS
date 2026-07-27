"use strict";

const http = require("http");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { URL } = require("url");

const PORT = Number(process.env.PORT || 4174);
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
const CONFIG_FILE = path.join(DATA, "config.json");
const QUEUE_FILE = path.join(DATA, "queue.json");
const STATE_FILE = path.join(DATA, "state.json");

for (const dir of [DATA]) fs.mkdirSync(dir, { recursive: true });

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
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf8");
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
      if (data.length > 2_000_000) reject(new Error("Request too large"));
    });
    req.on("end", () => {
      try { resolve(data ? JSON.parse(data) : {}); }
      catch { reject(new Error("Invalid JSON")); }
    });
    req.on("error", reject);
  });
}
function listVideos(folder) {
  if (!folder || !fs.existsSync(folder)) return [];
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
  const state = readJson(STATE_FILE, {running:false,current:null,log:[]});
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString()}] ${message}`].slice(-300);
  writeJson(STATE_FILE, state);
}

let worker = null;
function startWorker() {
  const state = readJson(STATE_FILE, {running:false,current:null,log:[]});
  if (state.running || worker) return false;
  state.running = true;
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString()}] Produksi dimulai`];
  writeJson(STATE_FILE, state);

  worker = spawn(process.execPath, [path.join(ROOT, "renderer.js")], {
    cwd: ROOT,
    stdio: ["ignore", "pipe", "pipe"]
  });
  worker.stdout.on("data", d => appendLog(String(d).trim()));
  worker.stderr.on("data", d => appendLog("ERROR: " + String(d).trim()));
  worker.on("exit", code => {
    const s = readJson(STATE_FILE, {});
    s.running = false;
    s.current = null;
    s.log = [...(s.log || []), `[${new Date().toLocaleTimeString()}] Worker selesai (${code})`].slice(-300);
    writeJson(STATE_FILE, s);
    worker = null;
  });
  return true;
}
function stopWorker() {
  if (!worker) return false;
  worker.kill();
  worker = null;
  const state = readJson(STATE_FILE, {});
  state.running = false;
  state.current = null;
  state.log = [...(state.log || []), `[${new Date().toLocaleTimeString()}] Produksi dihentikan`].slice(-300);
  writeJson(STATE_FILE, state);
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
      writeJson(CONFIG_FILE, cfg);
      return send(res, 200, cfg);
    }
    if (req.method === "POST" && p === "/api/scan") {
      const body = await getBody(req);
      const videos = listVideos(body.inputFolder);
      writeJson(QUEUE_FILE, videos);
      return send(res, 200, { count: videos.length, queue: videos });
    }
    if (req.method === "GET" && p === "/api/queue") return send(res, 200, readJson(QUEUE_FILE, []));
    if (req.method === "POST" && p === "/api/queue/reset") {
      const q = readJson(QUEUE_FILE, []).map(x => ({...x,status:"queued",progress:0,message:"Menunggu",output:""}));
      writeJson(QUEUE_FILE, q);
      return send(res, 200, q);
    }
    if (req.method === "POST" && p === "/api/start") {
      const ok = startWorker();
      return send(res, ok ? 200 : 409, {ok});
    }
    if (req.method === "POST" && p === "/api/stop") return send(res, 200, {ok:stopWorker()});
    if (req.method === "GET" && p === "/api/state") {
      return send(res, 200, {
        state: readJson(STATE_FILE, {running:false,current:null,log:[]}),
        queue: readJson(QUEUE_FILE, [])
      });
    }
    if (req.method === "GET" && p === "/api/check") {
      const ffmpeg = spawn("ffmpeg", ["-version"], {shell:true});
      let out = "";
      ffmpeg.stdout.on("data", d => out += d);
      ffmpeg.stderr.on("data", d => out += d);
      ffmpeg.on("close", code => send(res, 200, {
        node: process.version,
        ffmpeg: code === 0,
        ffmpegInfo: out.split(/\r?\n/)[0] || ""
      }));
      return;
    }
    return serveStatic(req, res, p);
  } catch (e) {
    send(res, 500, { error: e.message });
  }
});

server.listen(PORT, () => {
  console.log(`AIOS Auto Editor berjalan di http://localhost:${PORT}`);
});
