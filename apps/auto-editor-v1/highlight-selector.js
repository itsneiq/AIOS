"use strict";

const TYPE_ROLE_SCORES=Object.freeze({
  talking_head:Object.freeze({hook:82,proof:68,benefit:72,cta:78}),
  product_detail:Object.freeze({hook:92,proof:96,benefit:86,cta:88}),
  lifestyle:Object.freeze({hook:90,proof:72,benefit:94,cta:84}),
  b_roll:Object.freeze({hook:76,proof:70,benefit:78,cta:72}),
  general:Object.freeze({hook:68,proof:66,benefit:70,cta:68})
});

const CAMERA_ROLE_SCORES=Object.freeze({
  close_up:Object.freeze({hook:92,proof:96,benefit:84,cta:88}),
  medium:Object.freeze({hook:86,proof:82,benefit:90,cta:86}),
  wide:Object.freeze({hook:78,proof:68,benefit:88,cta:76})
});

function clamp(value,min=0,max=100){return Math.max(min,Math.min(max,Number(value)||0))}
function round(value,digits=3){const p=10**digits;return Math.round((Number(value)||0)*p)/p}
function roleScore(table,key,role){return table[key]?.[role]??70}
function durationScore(duration,target){
  const d=Math.max(0,Number(duration)||0),t=Math.max(0.1,Number(target)||1);
  if(d>=t)return 100;
  return clamp(d/t*100);
}
function duplicateMap(scenes,duplicates){
  const parent=new Map(scenes.map(scene=>[scene.index,scene.index]));
  const find=value=>{let root=parent.get(value);while(parent.get(root)!==root)root=parent.get(root);return root};
  for(const pair of duplicates||[]){const [left,right]=pair;if(!parent.has(left)||!parent.has(right))continue;const a=find(left),b=find(right);if(a!==b)parent.set(b,a)}
  return new Map(scenes.map(scene=>[scene.index,find(scene.index)]));
}
function scoreSceneForBeat(scene,beat){
  const role=beat?.role||"benefit";
  const quality=clamp(scene.quality??50);
  const typeFit=roleScore(TYPE_ROLE_SCORES,scene.type||"general",role);
  const cameraFit=roleScore(CAMERA_ROLE_SCORES,scene.camera||"medium",role);
  const durationFit=durationScore(scene.duration,beat?.duration);
  const motion=clamp(scene.motion??50);
  const motionFit=role==="hook"?clamp(55+motion*0.45):role==="proof"?clamp(100-Math.abs(motion-45)*0.8):clamp(65+motion*0.3);
  return round(quality*0.38+typeFit*0.24+cameraFit*0.16+durationFit*0.14+motionFit*0.08);
}
function selectHighlights({scenes=[],beats=[],duplicates=[],limit=0,minScore=0}={}){
  const usable=scenes.filter(scene=>scene.usable!==false&&Number(scene.duration)>0);
  const groups=duplicateMap(usable,duplicates);
  const scored=usable.map(scene=>{
    const beatScores=(beats.length?beats:[{role:"benefit",duration:scene.duration}]).map(beat=>({beatIndex:beat.index??0,role:beat.role||"benefit",score:scoreSceneForBeat(scene,beat)}));
    const best=beatScores.reduce((winner,item)=>item.score>winner.score?item:winner,beatScores[0]);
    const average=beatScores.reduce((sum,item)=>sum+item.score,0)/beatScores.length;
    const highlightScore=round(best.score*0.7+average*0.3);
    return {...scene,originalQuality:scene.quality,quality:highlightScore,highlightScore,bestRole:best.role,bestBeatIndex:best.beatIndex,beatScores,duplicateGroup:groups.get(scene.index)};
  }).sort((a,b)=>b.highlightScore-a.highlightScore||b.originalQuality-a.originalQuality||a.index-b.index);
  const selected=[],seenGroups=new Set();
  for(const scene of scored){
    if(scene.highlightScore<Number(minScore||0))continue;
    if(seenGroups.has(scene.duplicateGroup))continue;
    selected.push({...scene,highlightRank:selected.length+1});seenGroups.add(scene.duplicateGroup);
    if(Number(limit)>0&&selected.length>=Number(limit))break;
  }
  const selectedDuration=round(selected.reduce((sum,scene)=>sum+Number(scene.duration||0),0));
  return {scenes:selected,candidates:scored,selectedCount:selected.length,selectedDuration,bestScene:selected[0]?.index??null};
}

module.exports={CAMERA_ROLE_SCORES,TYPE_ROLE_SCORES,scoreSceneForBeat,selectHighlights};
