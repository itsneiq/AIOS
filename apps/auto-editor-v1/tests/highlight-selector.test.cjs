"use strict";
const assert=require("node:assert/strict");
const {scoreSceneForBeat,selectHighlights}=require("../highlight-selector");

const scene=(index,overrides={})=>({index,start:index*2,end:index*2+2,duration:2,quality:70,motion:50,type:"general",camera:"medium",usable:true,...overrides});
const beats=[
  {index:0,role:"hook",duration:1.5},
  {index:1,role:"proof",duration:2},
  {index:2,role:"benefit",duration:2.5},
  {index:3,role:"cta",duration:1.5}
];

const detail=scene(0,{quality:86,type:"product_detail",camera:"close_up",motion:58});
const weak=scene(1,{quality:52,type:"general",camera:"wide",motion:20});
assert.ok(scoreSceneForBeat(detail,beats[0])>scoreSceneForBeat(weak,beats[0]));

const ranked=selectHighlights({scenes:[weak,detail,scene(2,{quality:80,type:"lifestyle",camera:"medium",motion:82})],beats});
assert.equal(ranked.scenes[0].index,0);
assert.equal(ranked.scenes[0].highlightRank,1);
assert.ok(ranked.scenes[0].highlightScore>=ranked.scenes[1].highlightScore);
assert.equal(ranked.candidates.length,3);

const duplicate=selectHighlights({
  scenes:[detail,scene(1,{quality:84,type:"product_detail",camera:"close_up"}),scene(2,{quality:75,type:"lifestyle"})],
  beats,
  duplicates:[[0,1]]
});
assert.equal(duplicate.scenes.length,2);
assert.equal(duplicate.scenes.filter(item=>item.duplicateGroup===duplicate.scenes[0].duplicateGroup).length,1);

const limited=selectHighlights({scenes:[detail,scene(1),scene(2),scene(3)],beats,limit:2});
assert.equal(limited.selectedCount,2);
assert.equal(limited.scenes.length,2);

const filtered=selectHighlights({scenes:[weak],beats,minScore:90});
assert.equal(filtered.selectedCount,0);
assert.equal(filtered.bestScene,null);

const deterministicInput={scenes:[detail,weak,scene(2,{quality:80,type:"lifestyle"})],beats,duplicates:[]};
assert.deepEqual(selectHighlights(deterministicInput),selectHighlights(deterministicInput));
assert.ok(ranked.selectedDuration>0);
console.log("highlight selector tests passed");
