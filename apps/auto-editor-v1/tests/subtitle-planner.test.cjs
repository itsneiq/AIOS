"use strict";

const assert = require("node:assert/strict");
const { findEmphasisWords, getPreset, planSubtitles, splitReadable } = require("../subtitle-planner");

assert.deepEqual(splitReadable("Kalimat pendek untuk dibaca dengan nyaman", { maxChars: 18, maxWords: 3 }), ["Kalimat pendek", "untuk dibaca", "dengan nyaman"]);
assert.equal(getPreset("unknown").id, "tiktok");
assert.ok(getPreset("shopee").bodyMarginV < getPreset("tiktok").bodyMarginV);

const plan = planSubtitles({
  duration: 10,
  platform: "meta",
  script: {
    hook: "Wajib lihat produk baru ini sekarang!",
    benefit: "Lebih praktis untuk dipakai setiap hari tanpa membuat tas penuh.",
    cta: "Dapatkan diskon 20% sekarang."
  }
});
assert.equal(plan.preset.id, "meta");
assert.equal(plan.cues[0].start, 0);
assert.equal(plan.cues.at(-1).end, 10);
assert.ok(plan.cues.length > 3, "long copy should be split into readable cues");
assert.ok(plan.cues.every((cue, index) => index === 0 || cue.start >= plan.cues[index - 1].end));
assert.deepEqual(findEmphasisWords("Promo diskon 20% sekarang"), ["Promo", "diskon", "20%", "sekarang"]);

console.log("subtitle planner tests passed");
