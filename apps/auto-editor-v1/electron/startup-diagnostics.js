"use strict";

const fs = require("fs");
const path = require("path");

function resolveAppRoot({ isPackaged, appPath, dirname }) {
  return isPackaged ? appPath : path.resolve(dirname, "..");
}

function createStartupLogger(logDir) {
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, "startup.log");
  const write = (level, message) => {
    const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${String(message).trim()}\n`;
    fs.appendFileSync(logPath, line, "utf8");
    return line;
  };
  return { logPath, info: message => write("info", message), error: message => write("error", message) };
}

function formatStartupFailure({ reason, serverPath, logPath, exitCode, stderr }) {
  const details = [
    reason || "AIOS server gagal dijalankan.",
    `Server: ${serverPath}`,
    exitCode !== undefined && exitCode !== null ? `Exit code: ${exitCode}` : "",
    stderr ? `Detail: ${String(stderr).trim().slice(-1200)}` : "",
    `Log: ${logPath}`
  ].filter(Boolean);
  return details.join("\n\n");
}

module.exports = { resolveAppRoot, createStartupLogger, formatStartupFailure };
