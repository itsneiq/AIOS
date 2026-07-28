"use strict";
const assert=require("node:assert/strict");
const {planBRoll,scoreCandidate,normalizeBeat,normalizeAsset}=require("../b-roll-planner");

const beats=[
  {start:0,end:3,text:"Lihat detail tekstur Serum Glow ini",role:"hook",keywords:["serum glow","tekstur"]},
  {start:3.5,end:7,text:"Hasilnya lebih lembap setelah dipakai",role:"proof",keywords:["hasil","lembap"]},
  {start:7.5,end:10,text:"Klik sekarang untuk beli",role:"cta"}
];
const assets=[
  {id:"texture",duration:3,keywords:["serum glow","tekstur","detail"],roles:["hook"],quality:.9,path:"texture.mp4"},
  {id:"result",duration:4,keywords:["hasil","lembap"],roles:["proof"],quality:.8,path:"result.mp4"}
];

assert.equal(normalizeBeat(beats[0],0).duration,3);
assert.equal(normalizeAsset(assets[0],0).id,"texture");
assert.ok(scoreCandidate(normalizeBeat(beats[0],0),normalizeAsset(assets[0],0)).score>50);

const result=planBRoll(beats,assets,{maxCoverage:.7,minScore:35});
assert.equal(result.placements.length,2);
assert.deepEqual(result.placements.map(item=>item.assetId),["texture","result"]);
assert.equal(result.placements.some(item=>item.role==="cta"),false);
assert.ok(result.coverageRatio<=.7);
assert.deepEqual(result,planBRoll(beats,assets,{maxCoverage:.7,minScore:35}));

const capped=planBRoll(beats,assets,{maxCoverage:.2,minScore:35});
assert.ok(capped.coverageRatio<=.2);
assert.deepEqual(planBRoll([],assets),{placements:[],coverageDuration:0,coverageRatio:0,timelineDuration:0,evaluatedBeats:0,availableAssets:2});
assert.equal(planBRoll(beats,[],{}).placements.length,0);
console.log("b-roll planner tests passed");
