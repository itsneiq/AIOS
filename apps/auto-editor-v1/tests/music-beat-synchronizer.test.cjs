'use strict';

const assert = require('node:assert/strict');
const {
  generateBeatGrid,
  normalizeBeat,
  snapEditPoints,
  synchronizeToMusic
} = require('../music-beat-synchronizer');

const grid = generateBeatGrid({ bpm: 120, duration: 2, beatsPerBar: 4 });
assert.deepEqual(grid.map((beat) => beat.time), [0, 0.5, 1, 1.5, 2]);
assert.equal(grid[0].type, 'downbeat');
assert.equal(grid[4].type, 'downbeat');

assert.deepEqual(generateBeatGrid({ bpm: 0, duration: 10 }), []);
assert.equal(normalizeBeat({ timestamp: 1.25, downbeat: true }, 0).type, 'downbeat');

const snapped = snapEditPoints(
  [{ id: 'cut-1', time: 0.46, action: 'cut', priority: 0.8 }],
  grid,
  { style: 'commercial' }
);
assert.equal(snapped[0].snapTime, 0.5);
assert.equal(snapped[0].beat.type, 'beat');
assert.ok(snapped[0].confidence > 0.5);

const locked = snapEditPoints([{ time: 0.46, locked: true }], grid);
assert.equal(locked[0].snapTime, 0.46);
assert.equal(locked[0].beat, null);
assert.equal(locked[0].reason, 'edit point is locked');

const outsideWindow = snapEditPoints([{ time: 0.25 }], grid, { maxSnapDistance: 0.1 });
assert.equal(outsideWindow[0].snapTime, 0.25);
assert.equal(outsideWindow[0].beat, null);

const energetic = snapEditPoints(
  [{ time: 0.05, action: 'auto' }],
  [{ time: 0, type: 'downbeat', strength: 1 }],
  { style: 'energetic' }
);
assert.equal(energetic[0].action, 'impact');

const first = synchronizeToMusic(
  [{ time: 0.49 }, { time: 1.02 }],
  { bpm: 120, duration: 2 },
  { style: 'commercial' }
);
const second = synchronizeToMusic(
  [{ time: 0.49 }, { time: 1.02 }],
  { bpm: 120, duration: 2 },
  { style: 'commercial' }
);
assert.deepEqual(first, second);
assert.equal(first.diagnostics.snappedCount, 2);
assert.equal(first.diagnostics.snapRate, 1);

const empty = synchronizeToMusic([], { bpm: 120, duration: 2 });
assert.equal(empty.diagnostics.editCount, 0);
assert.equal(empty.diagnostics.snapRate, 0);

console.log('music-beat-synchronizer tests passed');
