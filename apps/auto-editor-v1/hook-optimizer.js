"use strict";

const PLATFORM_LIMITS=Object.freeze({tiktok:Object.freeze({min:4,max:12}),shopee:Object.freeze({min:3,max:10}),meta:Object.freeze({min:5,max:14}),youtube:Object.freeze({min:4,max:12}),default:Object.freeze({min:4,max:14})});
const ATTENTION_WORDS=new Set(["baru","bukti","cara","jangan","lihat","rahasia","ternyata","wajib","why","how","secret","stop","watch"]);
const SPECIFICITY=/\b(?:\d+(?:[.,]\d+)?%?|rp\s?\d+|detik|hari|menit|x)\b/i;
const round=value=>Number(Number(value).toFixed(3));
const words=value=>String(value||"").trim().split(/\s+/).filter(Boolean);
const normalize=value=>String(value||"").trim().replace(/\s+/g," ");
function scoreHook(hook,{platform="tiktok",productName="",keywords=[]}={}){
  const text=normalize(hook),tokens=words(text),limits=PLATFORM_LIMITS[platform]||PLATFORM_LIMITS.default;
  if(!text)return {score:0,wordCount:0,signals:{},issues:["empty_hook"]};
  const lower=tokens.map(token=>token.toLowerCase().replace(/[^\p{L}\p{N}]/gu,""));
  const inRange=tokens.length>=limits.min&&tokens.length<=limits.max,attention=lower.some(token=>ATTENTION_WORDS.has(token));
  const curiosity=/[?]/.test(text)||/\b(?:kok|kenapa|gimana|what|why|how)\b/i.test(text),specificity=SPECIFICITY.test(text);
  const relevant=[productName,...keywords].filter(Boolean).some(term=>text.toLowerCase().includes(String(term).toLowerCase()));
  const direct=/^(?:jangan|lihat|stop|coba|bayangkan|pernah|wajib|watch|try|imagine|did)/i.test(text);
  const signals={inRange,attention,curiosity,specificity,relevant,direct};
  const score=round(25+(inRange?25:Math.max(0,15-Math.abs(tokens.length-(limits.min+limits.max)/2)*2))+(attention?15:0)+(curiosity?10:0)+(specificity?10:0)+(relevant?10:0)+(direct?5:0));
  const issues=[];if(!inRange)issues.push(tokens.length<limits.min?"too_short":"too_long");if(!attention&&!curiosity)issues.push("weak_opening");if((productName||keywords.length)&&!relevant)issues.push("missing_product_context");
  return {score:Math.min(100,score),wordCount:tokens.length,signals,issues};
}
function optimizeHooks(candidates=[],options={}){
  const unique=new Map();for(const candidate of candidates){const hook=normalize(typeof candidate==="string"?candidate:candidate?.hook);if(hook&&!unique.has(hook.toLowerCase()))unique.set(hook.toLowerCase(),hook)}
  const ranked=[...unique.values()].map((hook,index)=>({hook,index,...scoreHook(hook,options)})).sort((a,b)=>b.score-a.score||a.wordCount-b.wordCount||a.index-b.index).map((item,rank)=>({...item,rank:rank+1}));
  return {bestHook:ranked[0]?.hook||null,bestScore:ranked[0]?.score||0,candidates:ranked,evaluatedCount:ranked.length};
}
function optimizeHook(candidates,options){return optimizeHooks(Array.isArray(candidates)?candidates:[candidates],options)}
module.exports={ATTENTION_WORDS,PLATFORM_LIMITS,optimizeHook,optimizeHooks,scoreHook};
