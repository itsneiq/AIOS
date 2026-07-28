"use strict";

const assert = require("node:assert/strict");
const path = require("node:path");
const { Worker } = require("node:worker_threads");

assert.equal(typeof Worker, "function");
const rendererPath = path.resolve(__dirname, "../renderer.js");
assert.equal(path.basename(rendererPath), "renderer.js");

const options = {
  env: { ...process.env, AIOS_DATA_DIR: path.resolve(__dirname, ".tmp-worker-data") },
  stdout: true,
  stderr: true
};
assert.equal(options.stdout, true);
assert.equal(options.stderr, true);
assert.ok(options.env.AIOS_DATA_DIR.endsWith(".tmp-worker-data"));

console.log("OK worker-thread batch runtime");
