"use strict";

const EPSILON=1e-6;
const round=value=>Math.round((Number(value)||0)*1000)/1000;

function duplicateGroups(scenes,duplicates){
  const parent=new Map(scenes.map(scene=>[scene.index,scene.index]));
  const find=value=>{let root=parent.get(value);while(parent.get(root)!==root)root=parent.get(root);return root};
  for(const [left,right] of duplicates||[]){if(!parent.has(left)||!parent.has(right))continue;const a=find(left),b=find(right);if(a!==b)parent.set(b,a)}
  return new Map(scenes.map(scene=>[scene.index,find(scene.index)]));
}

function rankedScenes(scenes){return [...scenes].sort((a,b)=>(b.quality||0)-(a.quality||0)||a.index-b.index)}

function allocateScenes({beats=[],scenes=[],duplicates=[],duplicateMode="STRICT",reusePolicy="FALLBACK"}={}){
  const usable=scenes.filter(scene=>scene.usable!==false&&Number(scene.duration??scene.end-scene.start)>EPSILON).map(scene=>{
    const duration=Math.max(0,Number(scene.duration??scene.end-scene.start)||0);
    return {...scene,start:Number(scene.start)||0,duration,allocated:0,remaining:duration,reuseCursor:0,reuseCount:0};
  });
  const groups=duplicateGroups(usable,duplicates),usedGroups=new Set();
  let uniqueAllocated=0,requestedDuration=0;
  const allocations=beats.map((beat,beatIndex)=>{
    const requested=Math.max(0,Number(beat.duration??(beat.end-beat.start))||0);requestedDuration+=requested;
    let needed=requested;
    const segments=[];
    while(needed>EPSILON){
      const available=usable.filter(scene=>scene.remaining>EPSILON&&!(duplicateMode==="STRICT"&&usedGroups.has(groups.get(scene.index))&&scene.allocated<=EPSILON));
      const ranked=rankedScenes(available);
      const scene=ranked.find(candidate=>candidate.allocated>EPSILON)||ranked[0];
      if(!scene)break;
      const amount=round(Math.min(needed,scene.remaining));
      const sourceStart=round(scene.start+scene.allocated),sourceEnd=round(sourceStart+amount);
      scene.allocated=round(scene.allocated+amount);scene.remaining=round(Math.max(0,scene.duration-scene.allocated));
      uniqueAllocated=round(uniqueAllocated+amount);needed=round(Math.max(0,needed-amount));usedGroups.add(groups.get(scene.index));
      segments.push({sceneIndex:scene.index,sourceStart,sourceEnd,allocatedStart:sourceStart,allocatedEnd:sourceEnd,remaining:scene.remaining,reused:false});
    }
    while(needed>EPSILON&&reusePolicy!=="FORBID"&&usable.length){
      const ranked=rankedScenes(usable).sort((a,b)=>a.reuseCount-b.reuseCount||(b.quality||0)-(a.quality||0)||a.index-b.index);
      const scene=ranked[beatIndex%ranked.length];
      const available=Math.max(EPSILON,scene.duration-scene.reuseCursor);
      const amount=round(Math.min(needed,available));
      const sourceStart=round(scene.start+scene.reuseCursor),sourceEnd=round(sourceStart+amount);
      scene.reuseCursor=round((scene.reuseCursor+amount)>=scene.duration-EPSILON?0:scene.reuseCursor+amount);scene.reuseCount+=1;needed=round(Math.max(0,needed-amount));
      segments.push({sceneIndex:scene.index,sourceStart,sourceEnd,allocatedStart:sourceStart,allocatedEnd:sourceEnd,remaining:scene.remaining,reused:true});
    }
    const allocatedDuration=round(requested-needed);
    return {...beat,requestedDuration:round(requested),allocatedDuration,segments,sceneSelection:segments.length===1?segments[0]:segments.length?{segments,sourceStart:segments[0].sourceStart,sourceEnd:segments.at(-1).sourceEnd,reused:segments.some(segment=>segment.reused)}:null};
  });
  const budgets=usable.map(scene=>({sceneIndex:scene.index,duration:round(scene.duration),allocated:round(scene.allocated),remaining:round(scene.remaining),reuseCount:scene.reuseCount}));
  const renderedDuration=round(allocations.reduce((total,beat)=>total+beat.allocatedDuration,0));
  return {beats:allocations,budgets,requestedDuration:round(requestedDuration),allocatedDuration:round(uniqueAllocated),renderedDuration,coverage:requestedDuration?round(Math.min(1,uniqueAllocated/requestedDuration)):1};
}

module.exports={allocateScenes};