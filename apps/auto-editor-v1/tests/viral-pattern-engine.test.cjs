'use strict';

const assert = require('node:assert/strict');
const {
  analyzeVirality,
  scoreHook,
  scoreRetention,
  recommendPatternInterrupt,
  predictEngagement,
  normalizeScene
} = require('../viral-pattern-engine');

const strongTimeline = [
  { id: 'hook', start: 0, duration: 2, role: 'hook', energy: 92, motion: 88, novelty: 90, relevance: 96, emotion: 84, text: 'Stop! Ini rahasia diskon 70%' },
  { id: 'proof', start: 2, duration: 2.2, role: 'proof', energy: 74, motion: 68, novelty: 72, relevance: 90, emotion: 66 },
  { id: 'demo', start: 4.2, duration: 2.4, role: 'demo', energy: 82, motion: 84, novelty: 78, relevance: 91, emotion: 72 },
  { id: 'cta', start: 6.6, duration: 1.8, role: 'cta', energy: 88, motion: 72, novelty: 66, relevance: 94, emotion: 78 }
];

assert.equal(normalizeScene({}, 1).id, 'scene-2');
assert.ok(scoreHook(strongTimeline[0]) >= 80, 'strong hook should score highly');
assert.ok(scoreRetention(strongTimeline) >= 60, 'well-paced timeline should retain viewers');
assert.equal(predictEngagement(strongTimeline).level, 'high');

const empty = analyzeVirality([]);
assert.deepEqual(empty.recommendations, []);
assert.equal(empty.viralityScore, 0);

const result = analyzeVirality(strongTimeline);
assert.ok(result.viralityScore >= 70);
assert.equal(result.diagnostics.sceneCount, 4);
assert.equal(result.recommendations.some(item => item.action === 'cta'), false, 'existing CTA should prevent duplicate CTA recommendation');

const fatigueTimeline = [
  { start: 0, duration: 2, role: 'hook', energy: 80, motion: 70, novelty: 70, relevance: 80 },
  { start: 2, duration: 5, role: 'body', energy: 20, motion: 18, novelty: 25, relevance: 55 },
  { start: 7, duration: 5, role: 'body', energy: 22, motion: 20, novelty: 26, relevance: 50 }
];
const interrupts = recommendPatternInterrupt(fatigueTimeline);
assert.ok(interrupts.length >= 2);
assert.ok(interrupts.every(item => item.action === 'pattern_interrupt'));

const noCta = analyzeVirality(strongTimeline.filter(scene => scene.role !== 'cta'));
assert.ok(noCta.recommendations.some(item => item.action === 'cta'));

assert.deepEqual(analyzeVirality(strongTimeline), analyzeVirality(strongTimeline), 'output must be deterministic');

console.log('viral-pattern-engine tests passed');
