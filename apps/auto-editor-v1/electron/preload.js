"use strict";

const { contextBridge, ipcRenderer, webUtils } = require("electron");

contextBridge.exposeInMainWorld("aiosDesktop", {
  chooseFolder: () => ipcRenderer.invoke("choose-folder"),
  chooseFile: options => ipcRenderer.invoke("choose-file", options),
  chooseExportPath: suggestedName => ipcRenderer.invoke("choose-export-path", suggestedName),
  openPath: target => ipcRenderer.invoke("open-path", target),
  getFilePath: file => webUtils.getPathForFile(file),
  exportTimeline: manifest => ipcRenderer.invoke("export-timeline", manifest),
  getLastExportManifest: () => ipcRenderer.invoke("get-last-export-manifest"),
  cancelExport: () => ipcRenderer.invoke("cancel-export"),
  onExportProgress: callback => {
    const listener=(_event,payload)=>callback(payload);
    ipcRenderer.on("export-progress",listener);
    return()=>ipcRenderer.removeListener("export-progress",listener);
  }
});