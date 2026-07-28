"use strict";

const DEFAULT_OPTIONS=Object.freeze({minDuration:1.2,maxDuration:4,maxCoverage:0.45,minScore:35,gap:0.25});
const ROLE_WEIGHTS=Object.freeze({hook:18,problem:14,benefit:12,proof:16,demonstration:18,cta:-12,default:6});
const VISUAL_WORDS=new Set(["lihat","tunjukkan","bukti","hasil","sebelum","sesudah","cara","detail","fitur","tekstur","watch","show","proof","result","before","after","how","detail","feature"]);

const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
const round=(value,digits=3)=>Number(Number(value).toFixed(digits));
const normalize=value=>String(value||"").trim().replace(/\s+/g," ");
const tokens=value=>normalize(value).toLowerCase().match(/[\p{L}\p{N}]+/gu)||[];

function normalizeBeat(beat,index){
  const start=Math.max(0,Number(beat?.start??beat?.outputStart??0)||0);
  const end=Math.max(start,Number(beat?.end??beat?.outputEnd??start)||start);
  return {index,start,end,duration:round(end-start),text:normalize(beat?.text??beat?.script??beat?.subtitle),role:normalize(beat?.role||"default").toLowerCase(),keywords:[...(beat?.keywords||[])].map(normalize).filter(Boolean)};
}

function normalizeAsset(asset,index){
  const keywords=[...(asset?.keywords||[]),asset?.product,asset?.category,asset?.label].map(normalize).filter(Boolean);
  return {index,id:asset?.id??asset?.assetId??`asset-${index+1}`,duration:Math.max(0,Number(asset?.duration)||0),keywords,roles:[...(asset?.roles||[])].map(value=>normalize(value).toLowerCase()).filter(Boolean),quality:clamp(asset?.quality??asset?.score??0.5,0,1),path:asset?.path??asset?.src??null};
}

function scoreCandidate(beat,asset){
  const beatTerms=new Set([...tokens(beat.text),...beat.keywords.flatMap(tokens)]);
  const assetTerms=new Set(asset.keywords.flatMap(tokens));
  const overlap=[...beatTerms].filter(term=>assetTerms.has(term));
  const relevance=overlap.length?Math.min(35,15+overlap.length*10):0;
  const roleMatch=asset.roles.includes(beat.role)?20:0;
  const roleWeight=ROLE_WEIGHTS[beat.role]??ROLE_WEIGHTS.default;
  const visualCue=tokens(beat.text).some(token=>VISUAL_WORDS.has(token))?12:0;
  const durationFit=asset.duration>=1?10:asset.duration>0?5:0;
  const quality=round(asset.quality*15);
  const score=round(clamp(15+relevance+roleMatch+roleWeight+visualCue+durationFit+quality,0,100));
  return {score,reasons:{relevance,roleMatch:Boolean(roleMatch),visualCue:Boolean(visualCue),durationFit:Boolean(durationFit),quality},matchedKeywords:overlap};
}

function planBRoll(beats=[],assets=[],options={}){
  const config={...DEFAULT_OPTIONS,...options};
  const normalizedBeats=beats.map(normalizeBeat).filter(beat=>beat.duration>0);
  const normalizedAssets=assets.map(normalizeAsset);
  const timelineEnd=normalizedBeats.reduce((max,beat)=>Math.max(max,beat.end),0);
  const coverageLimit=Math.max(0,timelineEnd*clamp(config.maxCoverage,0,1));
  const usage=new Map();let coverage=0;let lastEnd=-Infinity;
  const placements=[];

  for(const beat of normalizedBeats){
    if(beat.role==="cta"||coverage>=coverageLimit||beat.start<lastEnd+Number(config.gap||0))continue;
    const ranked=normalizedAssets.map(asset=>({asset,...scoreCandidate(beat,asset)})).filter(item=>item.score>=Number(config.minScore)).sort((a,b)=>a.asset.index===b.asset.index?0:b.score-a.score||(usage.get(a.asset.id)||0)-(usage.get(b.asset.id)||0)||a.asset.index-b.asset.index);
    const best=ranked[0];if(!best)continue;
    const available=Math.max(0,coverageLimit-coverage);
    const duration=round(Math.min(beat.duration,best.asset.duration||beat.duration,Number(config.maxDuration),available));
    if(duration<Number(config.minDuration))continue;
    const start=round(beat.start),end=round(start+duration);
    placements.push({beatIndex:beat.index,role:beat.role,assetId:best.asset.id,path:best.asset.path,start,end,duration,score:best.score,matchedKeywords:best.matchedKeywords,reasons:best.reasons});
    coverage=round(coverage+duration);lastEnd=end;usage.set(best.asset.id,(usage.get(best.asset.id)||0)+1);
  }

  return {placements,coverageDuration:coverage,coverageRatio:timelineEnd?round(coverage/timelineEnd):0,timelineDuration:round(timelineEnd),evaluatedBeats:normalizedBeats.length,availableAssets:normalizedAssets.length};
}

module.exports={DEFAULT_OPTIONS,ROLE_WEIGHTS,normalizeAsset,normalizeBeat,planBRoll,scoreCandidate};
