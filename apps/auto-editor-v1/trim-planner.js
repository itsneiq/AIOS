"use strict";

function planTrims(allocation={}){
  return (allocation.beats||[]).map(beat=>beat.sceneSelection).filter(selection=>selection&&selection.sourceEnd>selection.sourceStart).map((selection,index)=>({...selection,index,duration:Number((selection.sourceEnd-selection.sourceStart).toFixed(3))}));
}

function videoTrimFilter(trims=[]){
  if(!trims.length)return null;
  const inputs=trims.map((trim,index)=>`[0:v]trim=start=${trim.sourceStart}:end=${trim.sourceEnd},setpts=PTS-STARTPTS[t${index}]`).join(";");
  return `${inputs};${trims.map((_,index)=>`[t${index}]`).join("")}concat=n=${trims.length}:v=1:a=0[cut]`;
}

module.exports={planTrims,videoTrimFilter};
