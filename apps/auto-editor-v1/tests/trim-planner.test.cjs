"use strict";
const assert=require("node:assert/strict");
const {normalizeSegment,planTrims,mediaTrimFilter}=require("../trim-planner");

const allocation={beats:[
  {index:4,role:"hook",segments:[{sceneIndex:2,sourceStart:0.1254,sourceEnd:1.6256}]},
  {index:5,role:"proof",segments:[null,{sceneIndex:3,sourceStart:3,sourceEnd:4.25}]},
  {index:6,role:"cta",segments:[{sourceStart:5,sourceEnd:5},{sourceStart:"bad",sourceEnd:7}]}
]};
const trims=planTrims(allocation);

assert.deepEqual(trims.map(trim=>({index:trim.index,beatIndex:trim.beatIndex,role:trim.role,duration:trim.duration,outputStart:trim.outputStart,outputEnd:trim.outputEnd})),[
  {index:0,beatIndex:4,role:"hook",duration:1.501,outputStart:0,outputEnd:1.501},
  {index:1,beatIndex:5,role:"proof",duration:1.25,outputStart:1.501,outputEnd:2.751}
]);
assert.equal(normalizeSegment({sourceStart:-1,sourceEnd:2},null,0),null);
assert.equal(normalizeSegment({sourceStart:2,sourceEnd:1},null,0),null);

const filter=mediaTrimFilter([...trims,{sourceStart:8,sourceEnd:8}],{includeAudio:true});
assert.match(filter,/concat=n=2:v=1:a=0\[cutv\]/);
assert.match(filter,/concat=n=2:v=0:a=1\[cuta\]/);
assert.doesNotMatch(filter,/start=8:end=8/);
assert.equal(mediaTrimFilter([{sourceStart:2,sourceEnd:2}]),null);
assert.deepEqual(planTrims(allocation),planTrims(allocation));
console.log("trim planner tests passed");
