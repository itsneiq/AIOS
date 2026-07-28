"use strict";

const PRECISION=3;
const round=value=>Number(Number(value).toFixed(PRECISION));

function normalizeSegment(segment,beat,beatIndex){
  if(!segment)return null;
  const sourceStart=Number(segment.sourceStart),sourceEnd=Number(segment.sourceEnd);
  if(!Number.isFinite(sourceStart)||!Number.isFinite(sourceEnd)||sourceStart<0||sourceEnd<=sourceStart)return null;
  const normalizedStart=round(sourceStart),normalizedEnd=round(sourceEnd);
  return {...segment,beatIndex:Number.isInteger(beat?.index)?beat.index:beatIndex,role:beat?.role||segment.role||"benefit",sourceStart:normalizedStart,sourceEnd:normalizedEnd,duration:round(normalizedEnd-normalizedStart)};
}

function planTrims(allocation={}){
  let outputCursor=0;
  return (allocation.beats||[]).flatMap((beat,beatIndex)=>(beat.segments||[]).map(segment=>normalizeSegment(segment,beat,beatIndex))).filter(Boolean).map((selection,index)=>{
    const outputStart=round(outputCursor);outputCursor=round(outputCursor+selection.duration);
    return {...selection,index,outputStart,outputEnd:outputCursor};
  });
}

function mediaTrimFilter(trims=[],{includeAudio=false}={}){
  const valid=trims.map((trim,index)=>normalizeSegment(trim,null,index)).filter(Boolean);
  if(!valid.length)return null;
  const video=valid.map((trim,index)=>`[0:v]trim=start=${trim.sourceStart}:end=${trim.sourceEnd},setpts=PTS-STARTPTS[v${index}]`).join(";");
  const videoConcat=`${valid.map((_,index)=>`[v${index}]`).join("")}concat=n=${valid.length}:v=1:a=0[cutv]`;
  if(!includeAudio)return `${video};${videoConcat}`;
  const audio=valid.map((trim,index)=>`[0:a]atrim=start=${trim.sourceStart}:end=${trim.sourceEnd},asetpts=PTS-STARTPTS[a${index}]`).join(";");
  const audioConcat=`${valid.map((_,index)=>`[a${index}]`).join("")}concat=n=${valid.length}:v=0:a=1[cuta]`;
  return `${video};${audio};${videoConcat};${audioConcat}`;
}

const videoTrimFilter=trims=>mediaTrimFilter(trims,{includeAudio:false});
module.exports={normalizeSegment,planTrims,mediaTrimFilter,videoTrimFilter};
