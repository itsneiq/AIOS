"use strict";

const { app, BrowserWindow, dialog, ipcMain, shell } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const http = require("http");

const PORT = 4174;
let mainWindow;
let serverProcess;

function waitForServer(url, timeoutMs = 15000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const probe = () => {
      const req = http.get(url, res => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() - started > timeoutMs) return reject(new Error("AIOS server gagal dijalankan."));
        setTimeout(probe, 250);
      });
      req.setTimeout(1500, () => req.destroy());
    };
    probe();
  });
}

function startLocalServer() {
  const appRoot = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "..");
  const serverPath = path.join(appRoot, "server.js");

  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: appRoot,
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: "1",
      PORT: String(PORT)
    },
    windowsHide: true,
    stdio: "pipe"
  });

  serverProcess.stdout.on("data", data => console.log(`[AIOS] ${data}`));
  serverProcess.stderr.on("data", data => console.error(`[AIOS] ${data}`));
  serverProcess.on("exit", code => console.log(`AIOS server exited with code ${code}`));
}

async function createWindow() {
  startLocalServer();

  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1100,
    minHeight: 700,
    title: "AIOS Auto Editor",
    backgroundColor: "#0f1115",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  try {
    await waitForServer(`http://127.0.0.1:${PORT}`);
    await mainWindow.loadURL(`http://127.0.0.1:${PORT}`);
  } catch (error) {
    dialog.showErrorBox("AIOS gagal dibuka", error.message);
    app.quit();
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

ipcMain.handle("choose-folder", async () => {
  const result = await dialog.showOpenDialog(mainWindow, { properties: ["openDirectory", "createDirectory"] });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("choose-file", async (_event, options = {}) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: options.filters || []
  });
  return result.canceled ? null : result.filePaths[0];
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
  if (process.platform !== "darwin") app.quit();
});
app.on("before-quit", () => {
  if (serverProcess && !serverProcess.killed) serverProcess.kill();
});
app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
