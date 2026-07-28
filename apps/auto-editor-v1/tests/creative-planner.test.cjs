"use strict";

const assert=require("node:assert/strict");
const {buildBeats,planCreative,selectFormat}=require("../creative-planner");

assert.equal(selectFormat({category:"beauty",angle:"balanced",style:"ugc"}),"problem_solution");
assert.equal(selectFormat({category:"fashion",angle:"balanced",style:"clean"}),"lifestyle");
assert.equal(selectFormat({category:"gadget",angle:"fomo",style:"ugc"}),"urgency");

const plan=planCreative({category:"fashion",angle:"curiosity",platform:"meta",duration:10,seed:"tas-1",keywords:["fashion","kanvas","ringan"]});
assert.equal(plan.format,"detail_reveal");
assert.equal(plan.platform,"meta");
assert.equal(plan.subtitlePreset,"meta");
assert.equal(plan.beats.length,3);
assert.equal(plan.beats[0].start,0);
assert.equal(plan.beats.at(-1).end,10);
assert.deepEqual(plan.emphasis,["fashion","kanvas","ringan"]);
assert.deepEqual(plan,planCreative({category:"fashion",angle:"curiosity",platform:"meta",duration:10,seed:"tas-1",keywords:["fashion","kanvas","ringan"]}),"creative planning must be deterministic");
assert.deepEqual(buildBeats({pacing:"fast",hookStyle:"fomo",focus:"cta"},6).map(x=>x.role),["hook","benefit","cta"]);

console.log("creative planner tests passed");
