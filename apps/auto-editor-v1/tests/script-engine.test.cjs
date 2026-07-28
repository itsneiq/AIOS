"use strict";

const assert = require("assert");
const { clampCount, generateScript, generateScriptSet, resolveScript } = require("../script-engine");

assert.equal(clampCount(0), 1);
assert.equal(clampCount(99), 5);

const first = generateScript({ angle: "curiosity", seed: "tas", index: 0, variant: 1 });
const repeated = generateScript({ angle: "curiosity", seed: "tas", index: 0, variant: 1 });
assert.deepEqual(first, repeated, "generation must be deterministic");
assert.equal(first.angle, "curiosity");
assert.ok(first.hook && first.benefit && first.cta);

const set = generateScriptSet({ angle: "fomo", seed: "produk", count: 5 });
assert.equal(set.length, 5);
assert.ok(new Set(set.map(script => script.hook)).size > 1, "variants should rotate hooks");

const manual = resolveScript({ scriptMode: "manual", hook: " H ", benefit: " B ", cta: " C " });
assert.deepEqual(manual, { hook: "H", benefit: "B", cta: "C", angle: "manual" });

const auto = resolveScript({ scriptMode: "auto", scriptAngle: "problem_solution" }, { base: "sample" }, 1, 2);
assert.equal(auto.angle, "problem_solution");
assert.ok(auto.hook.includes("?") || auto.hook.length > 20);

console.log("script-engine tests passed");
