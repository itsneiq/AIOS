"use strict";

const assert = require("assert");
const os = require("os");
const path = require("path");
const fs = require("fs");
const { resolveAppRoot, createStartupLogger, formatStartupFailure } = require("../electron/startup-diagnostics");

assert.strictEqual(resolveAppRoot({ isPackaged: true, appPath: "C:/AIOS/resources/app.asar", dirname: "C:/AIOS/resources/app.asar/electron" }), "C:/AIOS/resources/app.asar");
assert.strictEqual(resolveAppRoot({ isPackaged: false, appPath: "ignored", dirname: path.join("repo", "electron") }), path.resolve("repo"));

const temp = fs.mkdtempSync(path.join(os.tmpdir(), "aios-startup-test-"));
const logger = createStartupLogger(temp);
logger.info("server starting");
logger.error("server failed");
const log = fs.readFileSync(logger.logPath, "utf8");
assert.match(log, /server starting/);
assert.match(log, /server failed/);

const message = formatStartupFailure({ reason: "timeout", serverPath: "app.asar/server.js", logPath: "startup.log", exitCode: 1, stderr: "boom" });
assert.match(message, /timeout/);
assert.match(message, /Exit code: 1/);
assert.match(message, /boom/);
assert.match(message, /startup.log/);

fs.rmSync(temp, { recursive: true, force: true });
console.log("startup diagnostics tests passed");
