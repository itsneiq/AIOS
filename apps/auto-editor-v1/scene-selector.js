"use strict";

const SHOT_PREFERENCES=Object.freeze({
  hero:["product_detail","general","talking_head","lifestyle","b_roll"],
  detail:["product_detail","b_roll","general","lifestyle","talking_head"],
  usage:["lifestyle","general","b_roll","product_detail","talking_head"],
  lifestyle:["lifestyle","general","talking_head","b_roll","product_detail"],
  comparison:["product_detail","general","b_roll","lifestyle","talking_head"],
  cta:["talking_head","product_detail","general","lifestyle","b_roll"]
});

function round(value){return Math.round(Number(value)*1000)/1000}
function preferenceRank(shot,type){const rank=(SHOT_PREFERENCES[shot]||SHOT_PREFERENCES.hero).indexOf(type);return rank<0?SHOT_PREFERENCES.hero.length:rank}
function duplicateSet(pairs=[]){return new Set(pairs.map(pair=>pair.slice().sort((a,b)=>a-b).join(":")))}
function isDuplicate(a,b,duplicates){return duplicates.has([a,b].sort((x,y)=>x-y).join(":"))}
function scoreScene(scene,shot,used,previous,duplicates){
  const quality=Math.max(0,Math.min(100,Number(scene.quality)||0));
  const preference=(SHOT_PREFERENCES.hero.length-preferenceRank(shot,scene.type))*20;
  const fresh=used.has(scene.index)?-120:15;
  const duplicate=previous!=null&&isDuplicate(previous,scene.index,duplicates)?-30:0;
  return preference+quality+fresh+duplicate;
}
function selectScenes({timeline=[],scenes=[],duplicates=[]}={}){
  const usable=scenes.filter(scene=>scene&&scene.usable!==false&&Number(scene.duration)>0);
  if(!timeline.length||!usable.length)return {selections:[],coverage:0,uniqueScenes:0,warnings:usable.length?[]:["No usable source scenes"]};
  const used=new Set(),duplicatePairs=duplicateSet(duplicates);let previous=null;
  const selections=timeline.map(beat=>{
    const ranked=usable.map(scene=>({scene,score:scoreScene(scene,beat.shot,used,previous,duplicatePairs)})).sort((a,b)=>b.score-a.score||a.scene.index-b.scene.index);
    const scene=ranked[0].scene;used.add(scene.index);previous=scene.index;
    const requested=Math.max(0,Number(beat.duration)||0),available=Math.max(0,Number(scene.duration)||0),clipDuration=Math.min(requested,available);
    return {beatIndex:beat.index,role:beat.role,shot:beat.shot,sceneIndex:scene.index,sourceStart:round(scene.start),sourceEnd:round(Number(scene.start)+clipDuration),duration:round(clipDuration),requestedDuration:round(requested),score:round(ranked[0].score)};
  });
  const requested=timeline.reduce((sum,beat)=>sum+(Number(beat.duration)||0),0),selected=selections.reduce((sum,item)=>sum+item.duration,0);
  return {selections,coverage:requested?round(Math.min(1,selected/requested)):1,uniqueScenes:used.size,warnings:selected<requested?[`Source scenes cover ${Math.round(requested?selected/requested*100:100)}% of the directed timeline`]:[]};
}

module.exports={SHOT_PREFERENCES,preferenceRank,scoreScene,selectScenes};
