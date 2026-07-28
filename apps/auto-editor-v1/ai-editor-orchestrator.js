"use strict";

/*
 * The orchestrator intentionally owns all format conversion.  Individual engines
 * remain small, independently testable modules and do not need to know about the
 * output shape of the engine before them.
 */
const sceneAnalyzer = require("./scene-analyzer.js");
const highlightSelector = require("./highlight-selector.js");
const hookOptimizer = require("./hook-optimizer.js");
const sceneAllocation = require("./scene-allocation-engine.js");
const trimPlanner = require("./trim-planner.js");
const reframePlanner = require("./reframe-planner.js");
const bRollPlanner = require("./b-roll-planner.js");
const transitionPlanner = require("./transition-planner.js");
const musicSynchronizer = require("./music-beat-synchronizer.js");
const captionEmphasis = require("./caption-emphasis-engine.js");
const viralPatterns = require("./viral-pattern-engine.js");
const timelineOptimizer = require("./timeline-optimizer.js");
const motionPlanner = require("./motion-planner.js");
const subtitlePlanner = require("./subtitle-planner.js");
const voiceEngine = require("./voice-engine.js");

const clone = value => value === undefined ? undefined : JSON.parse(JSON.stringify(value));
const round = value => Number((Number(value) || 0).toFixed(3));
const durationOf = scenes => round((scenes || []).reduce((total, scene) => total + Number(scene.duration || 0), 0));

function inputScenes(input) {
  if (Array.isArray(input?.scenes)) return input.scenes;
  if (Array.isArray(input?.timeline)) return input.timeline;
  return [];
}

function narrativeBeats(context) {
  if (Array.isArray(context.input.beats) && context.input.beats.length) return context.input.beats;
  let cursor = 0;
  return (context.highlights?.scenes || context.analysis?.scenes || []).map((scene, index, all) => {
    const duration = Math.max(0.1, Number(scene.duration) || 1);
    const beat = { index, id: `beat-${index + 1}`, start: round(cursor), end: round(cursor + duration), duration,
      role: index === 0 ? "hook" : index === all.length - 1 ? "cta" : "benefit", text: scene.text || scene.transcript || "" };
    cursor += duration;
    return beat;
  });
}

function timelineFrom(context) {
  if (Array.isArray(context.optimizedTimeline?.timeline)) return context.optimizedTimeline.timeline;
  if (Array.isArray(context.timeline)) return context.timeline;
  const trims = context.trims || [];
  if (trims.length) return trims.map((trim, index) => ({ ...trim, id: `scene-${index + 1}`, start: trim.outputStart,
    end: trim.outputEnd, duration: trim.duration, role: trim.role || "body", score: 0.7 }));
  return (context.highlights?.scenes || context.analysis?.scenes || []).map((scene, index) => ({ ...scene,
    id: scene.id || `scene-${index + 1}`, role: scene.role || (index ? "body" : "hook") }));
}

const stage = (name, dependency, run, apply) => ({ name, dependencies: dependency ? [dependency] : [], run, apply });

const STAGE_REGISTRY = Object.freeze([
  stage("input-validation", null, context => {
    const scenes = inputScenes(context.input);
    if (!context.input || typeof context.input !== "object" || Array.isArray(context.input)) throw new TypeError("input must be an object");
    if (!scenes.length) throw new Error("input must contain at least one scene");
    return { valid: true, sceneCount: scenes.length, duration: round(context.input.duration || durationOf(scenes)) };
  }, (context, output) => { context.validation = output; }),
  stage("scene-analyzer", "input-validation", context => sceneAnalyzer.analyzeScenes({ scenes: inputScenes(context.input),
    duration: context.input.duration, metrics: context.input.metrics }), (context, output) => { context.analysis = output; }),
  stage("highlight-selector", "scene-analyzer", context => highlightSelector.selectHighlights({ scenes: context.analysis.scenes,
    beats: narrativeBeats(context), duplicates: context.input.duplicates || [], limit: context.options.highlightLimit || 0 }),
  (context, output) => { context.highlights = output; }),
  stage("hook-optimizer", "highlight-selector", context => hookOptimizer.optimizeHooks(context.input.hooks ||
    [context.input.script?.hook, ...context.highlights.scenes.map(item => item.text || item.transcript)].filter(Boolean),
  { platform: context.options.platform || context.input.platform, productName: context.input.productName, keywords: context.input.keywords || [] }),
  (context, output) => { context.hook = output; }),
  stage("scene-allocation-engine", "hook-optimizer", context => sceneAllocation.allocateScenes({ beats: narrativeBeats(context),
    scenes: context.highlights.scenes, duplicates: context.input.duplicates || [] }), (context, output) => { context.allocation = output; }),
  stage("trim-planner", "scene-allocation-engine", context => ({ trims: trimPlanner.planTrims(context.allocation) }),
  (context, output) => { context.trims = output.trims; context.timeline = timelineFrom(context); }),
  stage("reframe-planner", "trim-planner", context => reframePlanner.planReframe({ format: context.options.format || context.input.format,
    focus: context.input.focus }), (context, output) => { context.reframe = output; }),
  stage("b-roll-planner", "reframe-planner", context => bRollPlanner.planBRoll(narrativeBeats(context), context.input.bRollAssets || [], context.options.bRoll),
  (context, output) => { context.bRoll = output; }),
  stage("transition-planner", "b-roll-planner", context => transitionPlanner.planTransitions(timelineFrom(context), context.options.transitions),
  (context, output) => { context.transitions = output; }),
  stage("music-beat-synchronizer", "transition-planner", context => musicSynchronizer.synchronizeToMusic(timelineFrom(context).map((item, index) =>
    ({ id: `edit-${index + 1}`, time: item.start, action: "cut" })), context.input.music || {}, context.options.music),
  (context, output) => { context.music = output; }),
  stage("caption-emphasis-engine", "music-beat-synchronizer", context => captionEmphasis.planCaptionEmphasis({
    text: context.input.caption || context.input.script?.hook || context.hook?.bestHook || "", keywords: context.input.keywords || [] }),
  (context, output) => { context.captionEmphasis = output; }),
  stage("viral-pattern-engine", "caption-emphasis-engine", context => viralPatterns.analyzeVirality(timelineFrom(context), context.options.viral),
  (context, output) => { context.viral = output; }),
  stage("timeline-optimizer", "viral-pattern-engine", context => timelineOptimizer.optimizeTimeline(timelineFrom(context), {
    ...(context.options.timeline || {}), recommendations: context.viral.recommendations }),
  (context, output) => { context.optimizedTimeline = output; context.timeline = output.timeline; }),
  stage("motion-planner", "timeline-optimizer", context => motionPlanner.planMotion({ duration: durationOf(timelineFrom(context)),
    preset: context.options.motionPreset, seed: context.options.seed || JSON.stringify(timelineFrom(context).map(item => item.id)) }),
  (context, output) => { context.motion = output; }),
  stage("subtitle-planner", "motion-planner", context => subtitlePlanner.planSubtitles({ script: context.input.script || {
    hook: context.hook?.bestHook || "", benefit: context.input.caption || "", cta: context.input.cta || "" },
  duration: durationOf(timelineFrom(context)), platform: context.options.platform || context.input.platform }),
  (context, output) => { context.subtitles = output; }),
  // Voice synthesis has filesystem/process side effects and is deliberately represented as a render instruction here.
  stage("voice-engine", "subtitle-planner", context => ({ provider: context.options.voice?.provider || "edge",
    voice: voiceEngine.validateEdgeVoice(context.options.voice?.voice), rate: Number(context.options.voice?.rate) || 0,
    text: context.input.voiceText || [context.input.script?.hook, context.input.script?.benefit, context.input.script?.cta].filter(Boolean).join(" "),
    synthesisRequired: Boolean(context.input.voiceText || context.input.script) }), (context, output) => { context.voice = output; }),
  stage("render-plan", "voice-engine", context => generateRenderPlan(context), (context, output) => { context.renderPlan = output; }),
  stage("export-manifest", "render-plan", context => generateExportManifest(context), (context, output) => { context.exportManifest = output; })
]);

function registryFor(options = {}) {
  const overrides = options.stageHandlers || {};
  return STAGE_REGISTRY.map(item => ({ ...item, run: Object.prototype.hasOwnProperty.call(overrides, item.name) ? overrides[item.name] : item.run }));
}

function validateStageOutput(stageName, output) {
  if (output === undefined || output === null) return { valid: false, errors: [`${stageName} returned no output`] };
  if (typeof output !== "object") return { valid: false, errors: [`${stageName} output must be an object`] };
  return { valid: true, errors: [] };
}

function executeStage(stageName, context, options = {}) {
  const definition = registryFor(options).find(item => item.name === stageName);
  if (!definition || typeof definition.run !== "function") throw new Error(`engine unavailable for stage: ${stageName}`);
  const output = definition.run(context);
  if (output && typeof output.then === "function") throw new Error(`async engine is not supported by stage: ${stageName}`);
  const validation = validateStageOutput(stageName, output);
  if (!validation.valid) throw new Error(validation.errors.join("; "));
  return clone(output);
}

function collectDiagnostics(stageResults) {
  const counts = { success: 0, fallback: 0, failed: 0, skipped: 0 };
  for (const result of stageResults) counts[result.status] = (counts[result.status] || 0) + 1;
  return { totalStages: stageResults.length, ...counts,
    totalDurationMs: round(stageResults.reduce((sum, result) => sum + result.durationMs, 0)),
    stageDurations: Object.fromEntries(stageResults.map(result => [result.name, result.durationMs])) };
}

function generateRenderPlan(context) {
  const timeline = clone(timelineFrom(context));
  return { version: 1, duration: durationOf(timeline), timeline, video: { reframe: clone(context.reframe || null),
    trims: clone(context.trims || []), transitions: clone(context.transitions?.transitions || []), bRoll: clone(context.bRoll?.placements || []),
    motion: clone(context.motion || null) }, audio: { music: clone(context.music || null), voice: clone(context.voice || null) },
    captions: { subtitles: clone(context.subtitles?.cues || []), emphasis: clone(context.captionEmphasis?.matches || []) } };
}

function generateExportManifest(context) {
  const plan = context.renderPlan || generateRenderPlan(context);
  return { version: 1, renderReady: plan.timeline.length > 0, output: { format: context.options.export?.format || "mp4",
    width: plan.video.reframe?.output?.width || 1080, height: plan.video.reframe?.output?.height || 1920,
    fps: Number(context.options.export?.fps) || 30, path: context.options.export?.path || null },
  sourceCount: inputScenes(context.input).length, duration: plan.duration, requiredAssets: [...new Set((context.bRoll?.placements || []).map(item => item.path).filter(Boolean))].sort() };
}

function selectedStageNames(options, registry) {
  let names = registry.map(item => item.name);
  if (Array.isArray(options.stages)) names = names.filter(name => options.stages.includes(name));
  if (options.from) names = names.slice(Math.max(0, names.indexOf(options.from)));
  if (options.to) names = names.slice(0, names.indexOf(options.to) + 1);
  return names;
}

function runPipeline(input, options = {}) {
  const safeOptions = clone(options) || {};
  // Test/integration adapters can be functions, which JSON cloning intentionally
  // omits. Copy only this hook table; the orchestrator never mutates it.
  if (options.stageHandlers) safeOptions.stageHandlers = { ...options.stageHandlers };
  const context = { input: clone(input), options: safeOptions };
  const registry = registryFor(safeOptions);
  const selected = selectedStageNames(safeOptions, registry);
  const disabled = new Set(safeOptions.disabledStages || []);
  const results = [], warnings = [], errors = [];
  let stopped = false;

  for (const definition of registry) {
    if (!selected.includes(definition.name)) continue;
    if (stopped || disabled.has(definition.name) || safeOptions.enabledStages?.[definition.name] === false) {
      results.push({ name: definition.name, status: "skipped", durationMs: 0,
        reason: stopped ? "fail-fast" : "disabled", warnings: [], errors: [] });
      continue;
    }
    const missing = definition.dependencies.filter(name => selected.includes(name) &&
      !results.some(result => result.name === name && ["success", "fallback"].includes(result.status)));
    if (missing.length) warnings.push(`${definition.name}: unmet dependencies: ${missing.join(", ")}`);
    try {
      if (safeOptions.unavailableStages?.includes(definition.name)) throw new Error(`engine unavailable for stage: ${definition.name}`);
      const output = executeStage(definition.name, context, safeOptions);
      definition.apply(context, output);
      results.push({ name: definition.name, status: "success", durationMs: 0, output, warnings: [], errors: [] });
    } catch (error) {
      const message = `${definition.name}: ${error.message}`;
      errors.push(message);
      if (safeOptions.failFast) {
        results.push({ name: definition.name, status: "failed", durationMs: 0, warnings: [], errors: [message] });
        stopped = true;
      } else {
        warnings.push(`graceful fallback - ${message}`);
        results.push({ name: definition.name, status: "fallback", durationMs: 0, output: null,
          warnings: [`graceful fallback - ${message}`], errors: [message] });
      }
    }
  }

  // Partial runs may omit the two final generator stages but still expose useful artifacts.
  if (!context.renderPlan && context.timeline?.length) context.renderPlan = generateRenderPlan(context);
  if (!context.exportManifest && context.renderPlan) context.exportManifest = generateExportManifest(context);
  const timeline = clone(timelineFrom(context));
  const renderReady = Boolean(context.exportManifest?.renderReady && !results.some(item => item.status === "failed"));
  return { status: results.some(item => item.status === "failed") ? "failed" : errors.length ? "partial" : renderReady ? "success" : "partial",
    renderReady, timeline, renderPlan: clone(context.renderPlan || null), exportManifest: clone(context.exportManifest || null), stages: results,
    stagesExecuted: results.filter(item => ["success", "fallback", "failed"].includes(item.status)).map(item => item.name),
    stagesSkipped: results.filter(item => item.status === "skipped").map(item => item.name), warnings, errors,
    diagnostics: collectDiagnostics(results) };
}

module.exports = { STAGE_REGISTRY, runPipeline, executeStage, validateStageOutput, collectDiagnostics,
  generateRenderPlan, generateExportManifest };
