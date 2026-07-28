"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const http = require("http");
const { renderTimeline } = require("./export-engine");

const PORT = 4174;
let mainWindow;
let serverProcess;
let exportController;

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, res => { res.resume(); resolve(); });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) return reject(new Error("AIOS server gagal dijalankan."));
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

function startLocalServer() {
  const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
  const serverPath = path.join(appRoot, "server.js");
  const dataDir = path.join(app.getPath("userData"), "runtime-data");
  fs.mkdirSync(dataDir, { recursive: true });
  serverProcess = spawn(process.execPath, [serverPath], { cwd: appRoot, env: { ...process.env, ELECTRON_RUN_AS_NODE: "1", PORT: String(PORT), AIOS_DATA_DIR: dataDir }, windowsHide: true, stdio: "pipe" });
  serverProcess.stdout.on("data", data => console.log(`[AIOS] ${data}`));
  serverProcess.stderr.on("data", data => console.error(`[AIOS] ${data}`));
}

async function createWindow() {
  startLocalServer();
  mainWindow = new BrowserWindow({ width: 1440, height: 920, minWidth: 1100, minHeight: 700, title: "AIOS Auto Editor", backgroundColor: "#0f1115", autoHideMenuBar: true, webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false } });
  try { await waitForServer(`http://127.0.0.1:${PORT}`); await mainWindow.loadURL(`http://127.0.0.1:${PORT}`); }
  catch (error) { dialog.showErrorBox("AIOS gagal dibuka", error.message); app.quit(); }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: "deny" }; });
}

ipcMain.handle("choose-folder", async () => { const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"] }); return result.canceled ? null : result.filePaths[0]; });
ipcMain.handle("choose-file", async (_event, options = {}) => { const result = await dialog.showOpenDialog(mainWindow, { properties: ["openFile"], filters: options.filters || [] }); return result.canceled ? null : result.filePaths[0]; });
ipcMain.handle("choose-export-path", async (_event, suggestedName="AIOS-export.mp4") => { const result=await dialog.showSaveDialog(mainWindow,{defaultPath:path.join(app.getPath("videos"),suggestedName),filters:[{name:"MP4 Video",extensions:["mp4"]}]});return result.canceled?null:result.filePath; });
ipcMain.handle("open-path", async (_event, target) => { if (!target || typeof target !== "string" || !fs.existsSync(target)) return "Path tidak ditemukan."; return shell.openPath(target); });
ipcMain.handle("export-timeline", async (_event, manifest) => {
  if(exportController)throw new Error("Export lain masih berjalan.");
  exportController=new AbortController();
  try{return await renderTimeline(manifest,{signal:exportController.signal,onProgress:(progress,status)=>mainWindow?.webContents.send("export-progress",{progress,status})});}
  finally{exportController=null;}
});
ipcMain.handle("cancel-export", async()=>{exportController?.abort();return true;});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { stopProcessTree(serverProcess); if (process.platform !== "darwin") app.quit(); });
app.on("before-quit", () => { exportController?.abort(); stopProcessTree(serverProcess); });
app.on("activate", () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
