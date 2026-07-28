"use strict";

function planTrims(allocation={}){
  return (allocation.beats||[]).flatMap(beat=>beat.segments||[]).filter(selection=>selection&&selection.sourceEnd>selection.sourceStart).map((selection,index)=>({...selection,index,duration:Number((selection.sourceEnd-selection.sourceStart).toFixed(3))}));
}

function mediaTrimFilter(trims=[],{includeAudio=false}={}){
  if(!trims.length)return null;
  const video=trims.map((trim,index)=>`[0:v]trim=start=${trim.sourceStart}:end=${trim.sourceEnd},setpts=PTS-STARTPTS[v${index}]`).join(";");
  const videoConcat=`${trims.map((_,index)=>`[v${index}]`).join("")}concat=n=${trims.length}:v=1:a=0[cutv]`;
  if(!includeAudio)return `${video};${videoConcat}`;
  const audio=trims.map((trim,index)=>`[0:a]atrim=start=${trim.sourceStart}:end=${trim.sourceEnd},asetpts=PTS-STARTPTS[a${index}]`).join(";");
  const audioConcat=`${trims.map((_,index)=>`[a${index}]`).join("")}concat=n=${trims.length}:v=0:a=1[cuta]`;
  return `${video};${audio};${videoConcat};${audioConcat}`;
}

const videoTrimFilter=trims=>mediaTrimFilter(trims,{includeAudio:false});
module.exports={planTrims,mediaTrimFilter,videoTrimFilter};