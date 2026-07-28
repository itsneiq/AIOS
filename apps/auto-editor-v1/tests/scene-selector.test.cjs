"use strict";
const assert=require("node:assert/strict");
const {preferenceRank,selectScenes}=require("../scene-selector");

assert.ok(preferenceRank("detail","product_detail")<preferenceRank("detail","talking_head"));
const timeline=[
  {index:0,role:"hook",shot:"hero",duration:1},
  {index:1,role:"proof",shot:"detail",duration:1.5},
  {index:2,role:"benefit",shot:"usage",duration:2}
];
const scenes=[
  {index:0,start:0,duration:2,type:"talking_head",quality:80,usable:true},
  {index:1,start:2,duration:1,type:"product_detail",quality:90,usable:true},
  {index:2,start:3,duration:3,type:"lifestyle",quality:75,usable:true}
];
const plan=selectScenes({timeline,scenes,duplicates:[[0,1]]});
assert.deepEqual(plan.selections.map(item=>item.sceneIndex),[1,2,0]);
assert.equal(plan.uniqueScenes,3);
assert.equal(plan.coverage,1);
assert.equal(plan.warnings.length,0);
assert.deepEqual(plan,selectScenes({timeline,scenes,duplicates:[[0,1]]}),"selection must be deterministic");
assert.deepEqual(selectScenes({timeline,scenes:[]}).selections,[]);
console.log("scene selector tests passed");
