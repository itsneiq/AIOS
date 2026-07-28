"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");
const { renderTimeline } = require("./export-engine");
const { resolveAppRoot, createStartupLogger, formatStartupFailure } = require("./startup-diagnostics");

const PORT = 4174;
let mainWindow;
let serverProcess;
let exportController;
let lastExportManifest = null;
let startupState = null;

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      if (startupState?.spawnError) return reject(startupState.spawnError);
      if (startupState?.exitCode !== undefined && startupState.exitCode !== null) {
        return reject(new Error(`AIOS server berhenti sebelum siap (exit ${startupState.exitCode}).`));
      }
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) return reject(new Error("AIOS server tidak merespons dalam 15 detik."));
        setTimeout(probe, 250);
      });
      req.setTimeout(1500, () => req.destroy());
    };
    probe();
  });
}

function stopProcessTree(child) {
  if (!child || child.killed) return;
  if (process.platform === "win32" && child.pid) spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true });
  else child.kill("SIGTERM");
}

function runtimeDir() {
  const dir = path.join(app.getPath("userData"), "runtime-data");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function manifestPath() { return path.join(runtimeDir(), "last-export-manifest.json"); }
function saveLastManifest(manifest) { lastExportManifest = structuredClone(manifest); fs.writeFileSync(manifestPath(), JSON.stringify(lastExportManifest, null, 2)); }
function readLastManifest() { if (lastExportManifest) return structuredClone(lastExportManifest); try { return JSON.parse(fs.readFileSync(manifestPath(), "utf8")); } catch { return null; } }

function startLocalServer() {
  const appRoot = resolveAppRoot({ isPackaged: app.isPackaged, appPath: app.getAppPath(), dirname: __dirname });
  const serverPath = path.join(appRoot, "server.js");
  const dataDir = runtimeDir();
  const logger = createStartupLogger(path.join(dataDir, "logs"));
  startupState = { appRoot, serverPath, logPath: logger.logPath, stderr: "", exitCode: null, spawnError: null };
  logger.info(`Starting AIOS server. packaged=${app.isPackaged} appRoot=${appRoot} serverPath=${serverPath}`);

  if (!fs.existsSync(serverPath)) {
    const error = new Error(`server.js tidak ditemukan di ${serverPath}`);
    startupState.spawnError = error;
    logger.error(error.message);
    return startupState;
  }

  try {
    serverProcess = spawn(process.execPath, [serverPath], {
      cwd: appRoot,
      env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: String(PORT), AIOS_DATA_DIR: dataDir },
      windowsHide: true,
      stdio: "pipe"
    });
    serverProcess.stdout.on("data", data => { const text = data.toString(); logger.info(text); console.log(`[AIOS] ${text}`); });
    serverProcess.stderr.on("data", data => { const text = data.toString(); startupState.stderr += text; logger.error(text); console.error(`[AIOS] ${text}`); });
    serverProcess.on("error", error => { startupState.spawnError = error; logger.error(`Spawn failed: ${error.stack || error.message}`); });
    serverProcess.on("exit", code => { startupState.exitCode = code; logger.error(`Server exited with code ${code}`); });
  } catch (error) {
    startupState.spawnError = error;
    logger.error(`Spawn exception: ${error.stack || error.message}`);
  }
  return startupState;
}

async function createWindow() {
  const startup = startLocalServer();
  mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 700, title: "AIOS Auto Editor", backgroundColor: "#0f1115", autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false } });
  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (error) {
    const message = formatStartupFailure({ reason: error.message, serverPath: startup.serverPath, logPath: startup.logPath, exitCode: startup.exitCode, stderr: startup.stderr });
    dialog.showErrorBox("AIOS gagal dibuka", message);
    shell.showItemInFolder(startup.logPath);
    app.quit();
    return;
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

ipcMain.handle("choose-folder", async () => { const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"] }); return result.canceled ? null : result.filePaths[0]; });
ipcMain.handle("choose-file", async (_event, options = {}) => { const result = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: options.filters || [] }); return result.canceled ? null : result.filePaths[0]; });
ipcMain.handle("choose-export-path", async (_event, suggestedName = "AIOS-export.mp4") => { const result = await dialog.showSaveDialog(mainWindow, { defaultPath: path.join(app.getPath("videos"), suggestedName), filters: [{ name: "MP4 Video", extensions: ["mp4"] }] }); return result.canceled ? null : result.filePath; });
ipcMain.handle("open-path", async (_event, target) => { if (!target || typeof target !== "string" || !fs.existsSync(target)) return "Path tidak ditemukan."; return shell.openPath(target); });
ipcMain.handle("get-last-export-manifest", async () => readLastManifest());
ipcMain.handle("export-timeline", async (_event, manifest) => { if (exportController) throw new Error("Export lain masih berjalan."); saveLastManifest(manifest); exportController = new AbortController(); try { return await renderTimeline(manifest, { signal: exportController.signal, logDir: path.join(runtimeDir(), "logs"), onProgress: (progress, status) => mainWindow?.webContents.send("export-progress", { progress, status }) }); } finally { exportController = null; } });
ipcMain.handle("cancel-export", async () => { exportController?.abort(); return true; });

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { stopProcessTree(serverProcess); if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { exportController?.abort(); stopProcessTree(serverProcess); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
