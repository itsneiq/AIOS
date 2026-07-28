"use strict";

const assert = require("node:assert/strict");
const { getMotionPreset, motionFilter, planMotion } = require("../motion-planner");

assert.equal(getMotionPreset("unknown").id, "balanced");
assert.equal(getMotionPreset("energetic").maxZoom, 1.15);

const plan = planMotion({ duration: 10, preset: "subtle", seed: "produk-1" });
assert.equal(plan.segments.length, 3);
assert.equal(plan.segments[0].start, 0);
assert.equal(plan.segments.at(-1).end, 10);
assert.equal(plan.segments.at(-1).role, "cta");
assert.ok(plan.segments.every((segment, index) => index === 0 || segment.type !== plan.segments[index - 1].type));
assert.deepEqual(plan, planMotion({ duration: 10, preset: "subtle", seed: "produk-1" }), "planning must be deterministic");
assert.match(motionFilter(plan), /^zoompan=/);
assert.equal(motionFilter(planMotion({ preset: "off" })), "");

console.log("motion planner tests passed");
