"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("aiosDesktop", {
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  chooseFile: options => ipcRenderer.invoke("choose-file", options),
  openPath: target => ipcRenderer.invoke("open-path", target),
  getFilePath: file => webUtils.getPathForFile(file)
});
