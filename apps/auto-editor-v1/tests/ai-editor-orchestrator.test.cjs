"use strict";
const assert = require("node:assert/strict");
const api = require("../ai-editor-orchestrator.js");
const { STAGE_REGISTRY, runPipeline, executeStage, validateStageOutput, collectDiagnostics, generateRenderPlan, generateExportManifest } = api;

const input = { duration: 7, platform: "tiktok", productName: "AIOS Lamp", keywords: ["terang"],
  hooks: ["Jangan beli lampu sebelum lihat ini!", "Lampu biasa"],
  script: { hook: "Jangan beli lampu sebelum lihat ini!", benefit: "Lebih terang dan hemat daya", cta: "Coba sekarang" },
  caption: "Lebih terang, hemat 50% sekarang",
  scenes: [
    { id: "a", index: 0, start: 0, end: 2, duration: 2, quality: 90, detail: 80, motion: 75, text: "Produk terang", role: "hook" },
    { id: "b", index: 1, start: 2, end: 5, duration: 3, quality: 82, detail: 60, motion: 55, text: "Manfaat produk", role: "body" },
    { id: "c", index: 2, start: 5, end: 7, duration: 2, quality: 78, detail: 70, motion: 45, text: "Coba sekarang", role: "cta" }
  ], music: { bpm: 120, duration: 7 },
  bRollAssets: [{ id: "lamp", path: "lamp.mp4", duration: 2, keywords: ["produk", "terang"] }] };

const result = runPipeline(input, { seed: "test" });
assert.equal(result.status, "success", JSON.stringify(result.errors));
assert.equal(result.renderReady, true);
assert.ok(result.timeline.length);
assert.deepEqual(result.stages.map(item => item.name), STAGE_REGISTRY.map(item => item.name));
assert.ok(result.stages.every(item => item.status === "success"));

const empty = runPipeline({ scenes: [] });
assert.equal(empty.status, "partial");
assert.equal(empty.renderReady, false);
assert.ok(empty.errors.some(message => message.includes("at least one scene")));
assert.deepEqual(runPipeline(input, { seed: "repeat" }), runPipeline(input, { seed: "repeat" }));

const disabled = runPipeline(input, { disabledStages: ["b-roll-planner"] });
assert.equal(disabled.stages.find(item => item.name === "b-roll-planner").status, "skipped");
assert.ok(disabled.stagesSkipped.includes("b-roll-planner"));

const graceful = runPipeline(input, { stageHandlers: { "hook-optimizer": () => { throw new Error("simulated"); } } });
assert.equal(graceful.status, "partial");
assert.equal(graceful.stages.find(item => item.name === "hook-optimizer").status, "fallback");
assert.ok(graceful.timeline.length);

const fast = runPipeline(input, { failFast: true, stageHandlers: { "scene-analyzer": () => { throw new Error("stop"); } } });
assert.equal(fast.status, "failed");
assert.equal(fast.stages.find(item => item.name === "scene-analyzer").status, "failed");
assert.ok(fast.stages.slice(2).every(item => item.status === "skipped"));

const partial = runPipeline(input, { to: "trim-planner" });
assert.deepEqual(partial.stagesExecuted, STAGE_REGISTRY.slice(0, 6).map(item => item.name));
assert.ok(partial.timeline.length);

const diagnostics = collectDiagnostics([{ name: "one", status: "success", durationMs: 2 }, { name: "two", status: "fallback", durationMs: 3 }]);
assert.deepEqual(diagnostics.stageDurations, { one: 2, two: 3 });
assert.equal(diagnostics.totalDurationMs, 5);
assert.equal(diagnostics.fallback, 1);
assert.equal(result.diagnostics.totalStages, STAGE_REGISTRY.length);

const context = { input, options: {}, timeline: input.scenes, reframe: { output: { width: 720, height: 1280 } } };
const renderPlan = generateRenderPlan(context);
assert.equal(renderPlan.timeline.length, 3);
assert.equal(renderPlan.duration, 7);
const manifest = generateExportManifest({ ...context, renderPlan });
assert.equal(manifest.renderReady, true);
assert.deepEqual(manifest.output, { format: "mp4", width: 720, height: 1280, fps: 30, path: null });

const frozen = structuredClone(input);
runPipeline(input, { format: "square" });
assert.deepEqual(input, frozen);

const unavailable = runPipeline(input, { unavailableStages: ["motion-planner"] });
assert.equal(unavailable.stages.find(item => item.name === "motion-planner").status, "fallback");
assert.ok(unavailable.warnings.some(message => message.includes("engine unavailable")));
assert.equal(validateStageOutput("test", null).valid, false);
assert.throws(() => executeStage("not-registered", { input, options: {} }), /unavailable/);
console.log("ai-editor-orchestrator tests passed");
