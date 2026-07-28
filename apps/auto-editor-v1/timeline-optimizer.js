'use strict';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function normalizeScene(scene = {}, index = 0) {
  const start = Number.isFinite(Number(scene.start)) ? Number(scene.start) : 0;
  const duration = Math.max(0.1, Number(scene.duration) || 1);
  return {
    ...scene,
    id: scene.id || `scene-${index + 1}`,
    index,
    role: String(scene.role || 'body').toLowerCase(),
    subject: String(scene.subject || '').toLowerCase(),
    energy: clamp(Number(scene.energy) || 0.5, 0, 1),
    retentionScore: clamp(Number(scene.retentionScore ?? scene.score) || 0.5, 0, 1),
    continuityKey: String(scene.continuityKey || scene.subject || '').toLowerCase(),
    locked: Boolean(scene.locked),
    start: round(start),
    duration: round(duration),
    end: round(start + duration),
  };
}

function normalizeTimeline(timeline) {
  const scenes = Array.isArray(timeline) ? timeline : Array.isArray(timeline?.scenes) ? timeline.scenes : [];
  return scenes.map(normalizeScene);
}

function reorderScenes(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  if (options.allowReorder === false || scenes.length < 2) return scenes;

  const hook = scenes.find((scene) => scene.role === 'hook' || scene.role === 'opening');
  const cta = scenes.find((scene) => scene.role === 'cta');
  const middle = scenes
    .filter((scene) => scene !== hook && scene !== cta)
    .sort((a, b) => {
      if (a.locked || b.locked) return a.index - b.index;
      const delta = b.retentionScore - a.retentionScore;
      return Math.abs(delta) > 0.001 ? delta : a.index - b.index;
    });

  return [hook, ...middle, cta].filter(Boolean);
}

function adjustDurations(timeline, options = {}) {
  const target = Math.max(0.5, Number(options.targetSceneDuration) || 2.5);
  const min = Math.max(0.2, Number(options.minSceneDuration) || 0.8);
  const max = Math.max(min, Number(options.maxSceneDuration) || 4);

  return normalizeTimeline(timeline).map((scene) => {
    if (scene.locked) return scene;
    const roleFactor = scene.role === 'hook' ? 0.75 : scene.role === 'cta' ? 0.9 : 1;
    const retentionFactor = 0.75 + scene.retentionScore * 0.5;
    const optimizedDuration = clamp(target * roleFactor * retentionFactor, min, max);
    return { ...scene, duration: round(optimizedDuration), end: round(scene.start + optimizedDuration) };
  });
}

function insertPatternInterrupts(timeline, recommendations = [], options = {}) {
  const scenes = normalizeTimeline(timeline);
  const inserts = Array.isArray(recommendations) ? recommendations : [];
  const duration = Math.max(0.1, Number(options.patternInterruptDuration) || 0.35);

  for (const [index, recommendation] of inserts.entries()) {
    const at = Number(recommendation.time);
    if (!Number.isFinite(at)) continue;
    scenes.push(normalizeScene({
      id: recommendation.id || `pattern-interrupt-${index + 1}`,
      role: 'pattern_interrupt',
      type: recommendation.type || 'visual',
      reason: recommendation.reason || 'attention refresh',
      start: at,
      duration,
      energy: recommendation.energy ?? 0.9,
      retentionScore: recommendation.confidence ?? 0.8,
      synthetic: true,
    }, scenes.length));
  }

  return scenes.sort((a, b) => a.start - b.start || a.index - b.index);
}

function placeCTA(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  const existing = scenes.findIndex((scene) => scene.role === 'cta');
  if (existing < 0) return scenes;

  const cta = scenes[existing];
  const without = scenes.filter((_, index) => index !== existing);
  const ratio = clamp(Number(options.ctaRatio) || 0.85, 0.5, 1);
  const targetIndex = clamp(Math.round(without.length * ratio), 0, without.length);
  without.splice(targetIndex, 0, cta);
  return without;
}

function validateContinuity(timeline) {
  const scenes = normalizeTimeline(timeline);
  const issues = [];
  for (let index = 1; index < scenes.length; index += 1) {
    const previous = scenes[index - 1];
    const current = scenes[index];
    if (previous.role === 'cta' && current.role !== 'outro') {
      issues.push({ type: 'cta_not_terminal', from: previous.id, to: current.id });
    }
    if (previous.continuityKey && current.continuityKey && previous.continuityKey !== current.continuityKey) {
      if (previous.role === 'body' && current.role === 'body' && previous.energy < 0.35 && current.energy < 0.35) {
        issues.push({ type: 'weak_subject_jump', from: previous.id, to: current.id });
      }
    }
  }
  return { valid: issues.length === 0, issues };
}

function rebuildTiming(timeline) {
  let cursor = 0;
  return normalizeTimeline(timeline).map((scene, index) => {
    const start = round(cursor);
    const end = round(start + scene.duration);
    cursor = end;
    return { ...scene, index, start, end };
  });
}

function optimizeTimeline(timeline, options = {}) {
  const original = normalizeTimeline(timeline);
  if (!original.length) {
    return { timeline: [], changes: [], timelineScore: 0, continuity: { valid: true, issues: [] }, diagnostics: { originalScenes: 0, finalScenes: 0, duration: 0 } };
  }

  let optimized = reorderScenes(original, options);
  optimized = adjustDurations(optimized, options);
  optimized = placeCTA(optimized, options);
  optimized = rebuildTiming(optimized);
  optimized = insertPatternInterrupts(optimized, options.patternInterrupts || options.recommendations || [], options);
  optimized = rebuildTiming(optimized);

  const changes = [];
  const originalPositions = new Map(original.map((scene, index) => [scene.id, index]));
  for (const [index, scene] of optimized.entries()) {
    if (scene.synthetic) {
      changes.push({ type: 'insert', scene: scene.id, position: index, reason: scene.reason });
      continue;
    }
    const originalScene = original.find((item) => item.id === scene.id);
    if (originalPositions.get(scene.id) !== index) changes.push({ type: 'move', scene: scene.id, from: originalPositions.get(scene.id), to: index });
    if (originalScene && Math.abs(originalScene.duration - scene.duration) > 0.001) {
      changes.push({ type: 'trim', scene: scene.id, from: originalScene.duration, to: scene.duration });
    }
  }

  const continuity = validateContinuity(optimized);
  const retention = optimized.filter((scene) => !scene.synthetic).reduce((sum, scene) => sum + scene.retentionScore, 0) / original.length;
  const timelineScore = Math.round(clamp((retention * 75) + (continuity.valid ? 20 : 10) + Math.min(5, changes.length), 0, 100));

  return {
    timeline: optimized,
    changes,
    timelineScore,
    continuity,
    diagnostics: {
      originalScenes: original.length,
      finalScenes: optimized.length,
      insertedScenes: optimized.filter((scene) => scene.synthetic).length,
      duration: round(optimized.at(-1)?.end || 0),
      changeCount: changes.length,
    },
  };
}

module.exports = {
  optimizeTimeline,
  reorderScenes,
  adjustDurations,
  insertPatternInterrupts,
  placeCTA,
  validateContinuity,
  normalizeScene,
  normalizeTimeline,
  rebuildTiming,
};
