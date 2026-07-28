const DEFAULTS={warnClips:300,criticalClips:1000,warnMedia:250,maxRenderedPerTrack:240,overscan:0.35};

export function analyzeProjectPerformance(state,limits={}){
  const cfg={...DEFAULTS,...limits};
  const clipCount=state?.clips?.length||0;
  const mediaCount=state?.media?.length||0;
  const level=clipCount>=cfg.criticalClips?"critical":clipCount>=cfg.warnClips||mediaCount>=cfg.warnMedia?"warning":"normal";
  const messages=[];
  if(clipCount>=cfg.criticalClips)messages.push(`Project sangat besar (${clipCount} clip). Respons editor dapat melambat.`);
  else if(clipCount>=cfg.warnClips)messages.push(`Project besar (${clipCount} clip). Timeline memakai mode hemat render.`);
  if(mediaCount>=cfg.warnMedia)messages.push(`Media library besar (${mediaCount} item).`);
  return{level,clipCount,mediaCount,messages,virtualize:clipCount>=cfg.warnClips};
}

export function visibleTimelineClips(clips,{total=1,scrollLeft=0,viewportWidth=0,contentWidth=0,selectedClipId=null,maxRendered=DEFAULTS.maxRenderedPerTrack,overscan=DEFAULTS.overscan}={}){
  const list=[...(clips||[])];
  if(list.length<=maxRendered||!viewportWidth||!contentWidth)return list;
  const safeTotal=Math.max(.001,Number(total)||1);
  const start=Math.max(0,(scrollLeft-viewportWidth*overscan)/contentWidth*safeTotal);
  const end=Math.min(safeTotal,(scrollLeft+viewportWidth*(1+overscan))/contentWidth*safeTotal);
  const visible=list.filter(clip=>clip.id===selectedClipId||clip.timelineStart+(clip.end-clip.start)>=start&&clip.timelineStart<=end);
  if(visible.length<=maxRendered)return visible;
  const selected=visible.find(clip=>clip.id===selectedClipId);
  const limited=visible.slice(0,maxRendered);
  if(selected&&!limited.some(clip=>clip.id===selected.id))limited[limited.length-1]=selected;
  return limited;
}

export function createFrameScheduler(callback,{requestFrame=globalThis.requestAnimationFrame||((fn)=>setTimeout(fn,0))}={}){
  let queued=false;
  let latest;
  return value=>{latest=value;if(queued)return;queued=true;requestFrame(()=>{queued=false;callback(latest)})};
}
