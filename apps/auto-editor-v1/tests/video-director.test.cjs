"use strict";

const assert = require("node:assert/strict");
const { buildTimeline, clampDuration, directVideo } = require("../video-director");

assert.equal(clampDuration(1),3);
assert.equal(clampDuration(100),60);

const timeline=buildTimeline({format:"detail_reveal",duration:10,seed:"tas-1"});
assert.equal(timeline.length,4);
assert.deepEqual(timeline.map(item=>item.role),["hook","proof","benefit","cta"]);
assert.equal(timeline[0].start,0);
assert.equal(timeline.at(-1).end,10);
assert.ok(timeline.every((item,index)=>index===0||item.start===timeline[index-1].end));
assert.ok(timeline.every(item=>item.duration>0));

const urgency=directVideo({creative:{format:"urgency",pacing:"fast",focus:"cta"},duration:9,seed:"produk-1"});
assert.deepEqual(urgency.timeline.map(item=>item.role),["hook","benefit","cta"]);
assert.equal(urgency.duration,9);
assert.equal(urgency.pacing,"fast");
assert.equal(urgency.focus,"cta");
assert.deepEqual(urgency.sync,{subtitle:true,motion:true,voice:true});
assert.equal(urgency.shotOrder.length,urgency.timeline.length);
assert.deepEqual(urgency,directVideo({creative:{format:"urgency",pacing:"fast",focus:"cta"},duration:9,seed:"produk-1"}),"direction must be deterministic");

console.log("video director tests passed");
