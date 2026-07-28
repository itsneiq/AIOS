"use strict";

const SHOT_ROLES = Object.freeze({
  hook: Object.freeze(["hero","detail","lifestyle"]),
  proof: Object.freeze(["detail","usage","comparison"]),
  benefit: Object.freeze(["usage","lifestyle","detail"]),
  cta: Object.freeze(["hero","cta","detail"])
});

const FORMAT_ORDERS = Object.freeze({
  demo:["hook","proof","benefit","cta"],
  problem_solution:["hook","proof","benefit","cta"],
  detail_reveal:["hook","proof","benefit","cta"],
  lifestyle:["hook","benefit","proof","cta"],
  urgency:["hook","benefit","cta"]
});

function hash(value){let h=2166136261;for(const char of String(value||"")){h^=char.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function clampDuration(value){return Math.max(3,Math.min(60,Number(value)||6))}
function choose(list,seed,offset=0){return list[(hash(seed)+offset)%list.length]}
function roleWeights(format,order){if(format==="urgency")return [0.3,0.4,0.3];if(format==="lifestyle")return [0.24,0.42,0.18,0.16];return order.length===4?[0.22,0.23,0.35,0.2]:order.map(()=>1/order.length)}
function buildTimeline({format="detail_reveal",duration=6,seed="aios"}={}){
  const order=FORMAT_ORDERS[format]||FORMAT_ORDERS.detail_reveal;
  const total=clampDuration(duration);
  const weights=roleWeights(format,order);
  let cursor=0;
  return order.map((role,index)=>{
    const start=cursor;
    const end=index===order.length-1?total:cursor+total*weights[index];
    cursor=end;
    const shot=choose(SHOT_ROLES[role]||SHOT_ROLES.benefit,`${seed}:${role}`,index);
    return {index,role,shot,start:Number(start.toFixed(3)),end:Number(end.toFixed(3)),duration:Number((end-start).toFixed(3))};
  });
}
function directVideo(input={}){
  const creative=input.creative||{};
  const format=creative.format||input.format||"detail_reveal";
  const duration=clampDuration(input.duration||creative.duration||6);
  const seed=String(input.seed||creative.id||input.title||"aios");
  const timeline=buildTimeline({format,duration,seed});
  return {
    id:`director-${hash(`${seed}:${format}:${duration}`)}`,
    format,
    duration,
    opening:timeline[0]?.shot||"hero",
    closing:timeline.at(-1)?.shot||"cta",
    shotOrder:timeline.map(item=>item.shot),
    timeline,
    sync:{subtitle:true,motion:true,voice:true},
    pacing:creative.pacing||"medium",
    focus:creative.focus||"detail"
  };
}

module.exports={FORMAT_ORDERS,SHOT_ROLES,buildTimeline,clampDuration,directVideo};
