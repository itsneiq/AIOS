"use strict";

const EPSILON=1e-6;
const round=value=>Math.round((Number(value)||0)*1000)/1000;

function duplicateGroups(scenes,duplicates){
  const parent=new Map(scenes.map(scene=>[scene.index,scene.index]));
  const find=value=>{let root=parent.get(value);while(parent.get(root)!==root)root=parent.get(root);return root};
  for(const [left,right] of duplicates||[]){if(!parent.has(left)||!parent.has(right))continue;const a=find(left),b=find(right);if(a!==b)parent.set(b,a)}
  return new Map(scenes.map(scene=>[scene.index,find(scene.index)]));
}

function allocateScenes({beats=[],scenes=[],duplicates=[],duplicateMode="STRICT",reusePolicy="FALLBACK"}={}){
  const usable=scenes.filter(scene=>scene.usable!==false&&Number(scene.duration??scene.end-scene.start)>EPSILON).map(scene=>{
    const duration=Math.max(0,Number(scene.duration??scene.end-scene.start)||0);
    return {...scene,start:Number(scene.start)||0,duration,allocated:0,remaining:duration};
  });
  const groups=duplicateGroups(usable,duplicates),usedGroups=new Set();
  let uniqueAllocated=0,requestedDuration=0;
  const allocations=beats.map((beat,beatIndex)=>{
    const requested=Math.max(0,Number(beat.duration??(beat.end-beat.start))||0);requestedDuration+=requested;
    const available=usable.filter(scene=>scene.remaining>EPSILON&&!(duplicateMode==="STRICT"&&usedGroups.has(groups.get(scene.index))&&!scene.allocated));
    available.sort((a,b)=>(b.quality||0)-(a.quality||0)||a.index-b.index);
    let scene=available.find(candidate=>candidate.allocated>EPSILON)||available[0],reused=false;
    if(!scene&&reusePolicy!=="FORBID"&&usable.length){scene=[...usable].sort((a,b)=>(b.quality||0)-(a.quality||0)||a.index-b.index)[beatIndex%usable.length];reused=true}
    if(!scene)return {...beat,requestedDuration:round(requested),allocatedDuration:0,sceneSelection:null};
    const amount=round(Math.min(requested,reused?scene.duration:scene.remaining));
    const sourceStart=round(scene.start+(reused?0:scene.allocated));
    const sourceEnd=round(sourceStart+amount);
    if(!reused){scene.allocated=round(scene.allocated+amount);scene.remaining=round(Math.max(0,scene.duration-scene.allocated));uniqueAllocated+=amount;usedGroups.add(groups.get(scene.index));}
    return {...beat,requestedDuration:round(requested),allocatedDuration:amount,sceneSelection:{sceneIndex:scene.index,sourceStart,sourceEnd,allocatedStart:sourceStart,allocatedEnd:sourceEnd,remaining:scene.remaining,reused}};
  });
  const budgets=usable.map(scene=>({sceneIndex:scene.index,duration:round(scene.duration),allocated:round(scene.allocated),remaining:round(scene.remaining)}));
  return {beats:allocations,budgets,requestedDuration:round(requestedDuration),allocatedDuration:round(uniqueAllocated),coverage:requestedDuration?round(Math.min(1,uniqueAllocated/requestedDuration)):1};
}

module.exports={allocateScenes};
