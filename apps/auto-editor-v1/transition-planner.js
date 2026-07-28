"use strict";

const TYPES=Object.freeze({HARD_CUT:"hard_cut",MATCH_CUT:"match_cut",WHIP:"whip",ZOOM:"zoom",FADE:"fade",DISSOLVE:"dissolve",MOTION_BLUR:"motion_blur"});
const DEFAULTS=Object.freeze({minDuration:0.08,maxDuration:0.65,defaultDuration:0.22,style:"balanced"});
const round=value=>Number(Number(value).toFixed(3));
const clamp=(value,min,max)=>Math.min(max,Math.max(min,value));
const normalizeText=value=>String(value||"").trim().toLowerCase();
const normalizeScene=(scene,index=0)=>({id:String(scene?.id??`scene-${index+1}`),role:normalizeText(scene?.role||scene?.type),motion:normalizeText(scene?.motion),camera:normalizeText(scene?.camera),subject:normalizeText(scene?.subject||scene?.product),energy:clamp(Number(scene?.energy??0.5),0,1),duration:Math.max(0,Number(scene?.duration??0)),tags:[...(scene?.tags||[])].map(normalizeText).filter(Boolean)});
function sharedSignals(a,b){const left=new Set([a.subject,...a.tags].filter(Boolean));return [...new Set([b.subject,...b.tags].filter(Boolean))].filter(value=>left.has(value));}
function chooseTransition(from,to,options={}){
  const config={...DEFAULTS,...options};
  const shared=sharedSignals(from,to),energyDelta=Math.abs(from.energy-to.energy),sameSubject=Boolean(from.subject&&from.subject===to.subject);
  let type=TYPES.HARD_CUT,confidence=0.72,reason="clean pacing cut";
  if(options.forceType&&Object.values(TYPES).includes(options.forceType)){type=options.forceType;confidence=1;reason="forced by configuration";}
  else if(/outro|ending|cta/.test(to.role)&&to.energy<0.45){type=TYPES.FADE;confidence=0.86;reason="soft landing into ending beat";}
  else if(sameSubject&&shared.length&&from.camera&&to.camera&&from.camera!==to.camera){type=TYPES.MATCH_CUT;confidence=0.9;reason="shared subject with complementary framing";}
  else if(/whip|pan/.test(from.motion+" "+to.motion)&&Math.max(from.energy,to.energy)>0.7){type=TYPES.WHIP;confidence=0.88;reason="high-energy directional motion";}
  else if(/zoom|push|pull/.test(from.motion+" "+to.motion)){type=TYPES.ZOOM;confidence=0.84;reason="continuous zoom language";}
  else if(/blur|fast|swipe/.test(from.motion+" "+to.motion)&&Math.max(from.energy,to.energy)>0.6){type=TYPES.MOTION_BLUR;confidence=0.82;reason="fast motion benefits from blur bridge";}
  else if(energyDelta<0.18&&from.role&&to.role&&from.role!==to.role){type=TYPES.DISSOLVE;confidence=0.75;reason="gentle narrative beat change";}
  const base={hard_cut:0.08,match_cut:0.14,whip:0.18,zoom:0.2,fade:0.45,dissolve:0.38,motion_blur:0.16}[type]??config.defaultDuration;
  const duration=round(clamp(base+(config.style==="cinematic"?0.08:config.style==="fast"?-0.04:0),config.minDuration,config.maxDuration));
  return {transitionType:type,duration,confidence:round(confidence),reason,signals:{shared,energyDelta:round(energyDelta),sameSubject}};
}
function planTransitions(scenes=[],options={}){
  const normalized=scenes.map(normalizeScene),transitions=[];
  for(let index=0;index<normalized.length-1;index++)transitions.push({index,fromSceneId:normalized[index].id,toSceneId:normalized[index+1].id,...chooseTransition(normalized[index],normalized[index+1],options)});
  return {transitions,sceneCount:normalized.length,transitionCount:transitions.length,totalTransitionDuration:round(transitions.reduce((sum,item)=>sum+item.duration,0)),style:options.style||DEFAULTS.style};
}
module.exports={DEFAULTS,TYPES,chooseTransition,normalizeScene,planTransitions};
