"use strict";

const assert = require("node:assert/strict");
const { findEmphasisWords, normalizeToken, planCaptionEmphasis, renderEmphasis } = require("../caption-emphasis-engine");

assert.equal(normalizeToken("GRATIS!"), "gratis");
assert.deepEqual(findEmphasisWords("Promo diskon 20% sekarang"), ["Promo", "diskon", "20%", "sekarang"]);
const plan = planCaptionEmphasis({ text: "Tas kanvas cuma Rp99.000, hari ini!", keywords: ["kanvas"], maxEmphasis: 3 });
assert.deepEqual(plan.matches.map(item => item.reason), ["keyword", "number"]);
assert.deepEqual(plan.words, ["kanvas", "Rp99.000,"]);
assert.ok(plan.matches.every(item => plan.text.slice(item.start, item.end) === item.text));
assert.equal(renderEmphasis("Gratis ongkir 25%", word => `<b>${word}</b>`), "<b>Gratis</b> ongkir <b>25%</b>");
assert.equal(renderEmphasis("plain caption", word => `<b>${word}</b>`), "plain caption");
assert.deepEqual(planCaptionEmphasis({ text: "gratis promo diskon", maxEmphasis: 1 }).words, ["gratis"]);

console.log("caption emphasis engine tests passed");
