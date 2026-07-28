'use strict';

const assert = require('node:assert/strict');
const {
  optimizeTimeline,
  reorderScenes,
  adjustDurations,
  insertPatternInterrupts,
  placeCTA,
  validateContinuity,
} = require('../timeline-optimizer.js');

const scenes = [
  { id: 'body-low', role: 'body', duration: 4, retentionScore: 0.3, subject: 'product', energy: 0.2 },
  { id: 'hook', role: 'hook', duration: 3, retentionScore: 0.95, subject: 'creator', energy: 0.9 },
  { id: 'body-high', role: 'body', duration: 3, retentionScore: 0.8, subject: 'product', energy: 0.7 },
  { id: 'cta', role: 'cta', duration: 3, retentionScore: 0.7, subject: 'creator', energy: 0.6 },
];

assert.deepEqual(reorderScenes(scenes).map((scene) => scene.id), ['hook', 'body-high', 'body-low', 'cta']);
assert.deepEqual(reorderScenes(scenes, { allowReorder: false }).map((scene) => scene.id), scenes.map((scene) => scene.id));

const adjusted = adjustDurations(scenes, { targetSceneDuration: 2, minSceneDuration: 0.8, maxSceneDuration: 3 });
assert.ok(adjusted.every((scene) => scene.duration >= 0.8 && scene.duration <= 3));
assert.ok(adjusted.find((scene) => scene.id === 'hook').duration < adjusted.find((scene) => scene.id === 'body-high').duration);

const inserted = insertPatternInterrupts(scenes, [{ time: 2.2, reason: 'fatigue' }]);
assert.equal(inserted.filter((scene) => scene.synthetic).length, 1);
assert.equal(inserted.find((scene) => scene.synthetic).role, 'pattern_interrupt');

const placed = placeCTA(scenes, { ctaRatio: 1 });
assert.equal(placed.at(-1).id, 'cta');

assert.equal(validateContinuity([{ id: 'cta', role: 'cta' }, { id: 'body', role: 'body' }]).valid, false);
assert.equal(validateContinuity([{ id: 'hook', role: 'hook' }, { id: 'cta', role: 'cta' }]).valid, true);

const result = optimizeTimeline(scenes, {
  targetSceneDuration: 2,
  patternInterrupts: [{ time: 2, reason: 'attention refresh', confidence: 0.9 }],
});
assert.equal(result.timeline[0].id, 'hook');
assert.equal(result.timeline.filter((scene) => scene.synthetic).length, 1);
assert.ok(result.changes.some((change) => change.type === 'move'));
assert.ok(result.changes.some((change) => change.type === 'trim'));
assert.ok(result.changes.some((change) => change.type === 'insert'));
assert.ok(result.timelineScore > 0 && result.timelineScore <= 100);
assert.equal(result.diagnostics.originalScenes, 4);
assert.equal(result.diagnostics.finalScenes, 5);
assert.ok(result.timeline.every((scene, index, all) => index === 0 || scene.start === all[index - 1].end));

const empty = optimizeTimeline([]);
assert.deepEqual(empty.timeline, []);
assert.equal(empty.timelineScore, 0);

assert.deepEqual(optimizeTimeline(scenes, { targetSceneDuration: 2 }), optimizeTimeline(scenes, { targetSceneDuration: 2 }));

console.log('timeline-optimizer tests passed');
