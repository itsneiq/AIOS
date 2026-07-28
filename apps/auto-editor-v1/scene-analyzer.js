"use strict";

const DEFAULT_THRESHOLD=0.32;
function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,Number(value)||0))}
function round(value,digits=3){const p=10**digits;return Math.round(Number(value)*p)/p}
function sceneDetectionFilter(threshold=DEFAULT_THRESHOLD){const t=Math.max(0.05,Math.min(0.95,Number(threshold)||DEFAULT_THRESHOLD));return `select='gt(scene,${t})',showinfo`}
function parseSceneLog(log,duration=0){
  const total=Math.max(0,Number(duration)||0);const cuts=[0];
  for(const match of String(log||"").matchAll(/pts_time:([0-9.]+)/g)){const time=round(Number(match[1]));if(time>0&&(!total||time<total)&&time-cuts[cuts.length-1]>=0.25)cuts.push(time)}
  if(total>0&&total-cuts[cuts.length-1]>=0.1)cuts.push(round(total));
  if(cuts.length===1)cuts.push(round(total||0));
  return cuts.slice(0,-1).map((start,index)=>({index,start,end:cuts[index+1],duration:round(cuts[index+1]-start)}));
}
function qualityScore(metrics={}){
  const blur=clamp(metrics.blur??50),exposure=clamp(metrics.exposure??50),motion=clamp(metrics.motion??50),stability=clamp(metrics.stability??50);
  return Math.round(blur*0.3+exposure*0.3+motion*0.15+stability*0.25);
}
function classifyScene(scene={}){
  const duration=Number(scene.duration)||0,motion=clamp(scene.motion??50),detail=clamp(scene.detail??50),faces=Number(scene.faces)||0;
  if(faces>0&&detail<55)return "talking_head";
  if(detail>=75)return "product_detail";
  if(motion>=72)return "lifestyle";
  if(duration<=1.2)return "b_roll";
  return "general";
}
function cameraType(scene={}){const detail=clamp(scene.detail??50);return detail>=75?"close_up":detail>=45?"medium":"wide"}
function analyzeScenes({scenes=[],duration=0,metrics=[]}={}){
  const source=scenes.length?scenes:[{index:0,start:0,end:Number(duration)||0,duration:Number(duration)||0}];
  const analyzed=source.map((scene,index)=>{const m={...(metrics[index]||{}),...scene};const quality=qualityScore(m);return {...scene,index,type:classifyScene(m),camera:cameraType(m),quality,motion:clamp(m.motion??50),usable:quality>=45&&Number(scene.duration)>=0.35}});
  const usable=analyzed.filter(scene=>scene.usable).sort((a,b)=>b.quality-a.quality||a.index-b.index);
  return {duration:round(duration||analyzed.at(-1)?.end||0),sceneCount:analyzed.length,usableCount:usable.length,bestScene:usable[0]?.index??null,scenes:analyzed};
}
function findNearDuplicates(scenes=[],tolerance=6){const duplicates=[];for(let i=0;i<scenes.length;i++)for(let j=i+1;j<scenes.length;j++){const a=scenes[i],b=scenes[j];if(a.type===b.type&&a.camera===b.camera&&Math.abs((a.quality||0)-(b.quality||0))<=tolerance)duplicates.push([a.index,b.index])}return duplicates}
module.exports={DEFAULT_THRESHOLD,analyzeScenes,cameraType,classifyScene,findNearDuplicates,parseSceneLog,qualityScore,sceneDetectionFilter};
