"use strict";

const assert = require("node:assert/strict");
const { getOutputPreset, planReframe, reframeFilter } = require("../reframe-planner");

assert.deepEqual(getOutputPreset("vertical"), { width: 1080, height: 1920 });
assert.deepEqual(getOutputPreset("square"), { width: 1080, height: 1080 });
assert.deepEqual(getOutputPreset("unknown"), { width: 1080, height: 1920 });

const centered = planReframe();
assert.deepEqual(centered.focus, { x: 0.5, y: 0.5 });
assert.equal(centered.format, "vertical");

const protectedFocus = planReframe({ format: "landscape", focus: { x: -2, y: 4 }, safeMargin: 0.1 });
assert.deepEqual(protectedFocus.focus, { x: 0.1, y: 0.9 });
assert.deepEqual(protectedFocus.output, { width: 1920, height: 1080 });

const filter = reframeFilter({ format: "vertical", focus: { x: 0.25, y: 0.75 } });
assert.match(filter, /^scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920/);
assert.match(filter, /iw\*0\.2500-ow\/2/);
assert.match(filter, /ih\*0\.7500-oh\/2/);
assert.doesNotMatch(filter, /pad=/);
assert.equal(reframeFilter(planReframe({ focus: { x: 0.25, y: 0.75 } })), filter);

console.log("reframe planner tests passed");
