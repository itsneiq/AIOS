"use strict";

const CREATIVE_FORMATS = Object.freeze({
  demo: Object.freeze({id:"demo",hookStyle:"show_result",pacing:"medium",motionPreset:"balanced",subtitlePreset:"platform",focus:"usage"}),
  problem_solution: Object.freeze({id:"problem_solution",hookStyle:"pain_point",pacing:"fast",motionPreset:"energetic",subtitlePreset:"platform",focus:"benefit"}),
  detail_reveal: Object.freeze({id:"detail_reveal",hookStyle:"curiosity",pacing:"medium",motionPreset:"subtle",subtitlePreset:"platform",focus:"detail"}),
  lifestyle: Object.freeze({id:"lifestyle",hookStyle:"aspiration",pacing:"slow",motionPreset:"subtle",subtitlePreset:"platform",focus:"lifestyle"}),
  urgency: Object.freeze({id:"urgency",hookStyle:"fomo",pacing:"fast",motionPreset:"energetic",subtitlePreset:"platform",focus:"cta"})
});

const CATEGORY_DEFAULTS = Object.freeze({
  fashion:"lifestyle",
  beauty:"problem_solution",
  gadget:"detail_reveal",
  kitchen:"demo",
  home:"demo",
  general:"detail_reveal"
});

function hash(value){let h=2166136261;for(const char of String(value||"")){h^=char.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function normalizePlatform(value){return ["tiktok","shopee","meta","youtube"].includes(value)?value:"tiktok"}
function selectFormat({category="general",angle="balanced",style="ugc"}={}){
  if(style==="hard"||angle==="fomo")return "urgency";
  if(angle==="problem_solution")return "problem_solution";
  if(angle==="curiosity")return "detail_reveal";
  if(style==="clean"&&category==="fashion")return "lifestyle";
  return CATEGORY_DEFAULTS[category]||CATEGORY_DEFAULTS.general;
}
function buildBeats(format,duration){
  const total=Math.max(3,Number(duration)||6);
  const ratios=format.pacing==="fast"?[0.22,0.48,0.3]:format.pacing==="slow"?[0.3,0.5,0.2]:[0.25,0.5,0.25];
  const roles=["hook","benefit","cta"];
  let cursor=0;
  return ratios.map((ratio,index)=>{
    const start=cursor;
    const end=index===ratios.length-1?total:cursor+total*ratio;
    cursor=end;
    return {role:roles[index],start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),focus:index===0?format.hookStyle:index===1?format.focus:"action"};
  });
}
function planCreative(input={}){
  const formatId=input.format&&CREATIVE_FORMATS[input.format]?input.format:selectFormat(input);
  const format=CREATIVE_FORMATS[formatId];
  const platform=normalizePlatform(input.platform);
  const seed=String(input.seed||input.title||"aios");
  const emphasis=[...(input.keywords||[])].slice(0,4);
  return {
    id:`${format.id}-${hash(`${seed}:${platform}`)}`,
    format:format.id,
    platform,
    hookStyle:format.hookStyle,
    pacing:format.pacing,
    focus:format.focus,
    motionPreset:input.motionPreset&&input.motionPreset!=="auto"?input.motionPreset:format.motionPreset,
    subtitlePreset:input.subtitlePreset&&input.subtitlePreset!=="auto"?input.subtitlePreset:platform,
    beats:buildBeats(format,input.duration),
    emphasis
  };
}

module.exports={CATEGORY_DEFAULTS,CREATIVE_FORMATS,buildBeats,normalizePlatform,planCreative,selectFormat};
