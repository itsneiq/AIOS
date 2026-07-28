const TRACKS=["V1","V2","A1"];
const RATIOS={"9:16":[1080,1920],"16:9":[1920,1080],"1:1":[1080,1080]};

export function validateExportState(state){
  const errors=[];
  if(!state?.clips?.length)errors.push("Timeline masih kosong.");
  const mediaById=new Map((state?.media||[]).map(item=>[item.id,item]));
  for(const clip of state?.clips||[]){
    const media=mediaById.get(clip.mediaId);
    if(!media)errors.push(`Media untuk clip ${clip.name} tidak ditemukan.`);
    else if(!media.sourcePath)errors.push(`Media ${media.name} belum direlink ke file sumber.`);
    if(!(clip.end>clip.start))errors.push(`Durasi clip ${clip.name} tidak valid.`);
    if(!TRACKS.includes(clip.track))errors.push(`Track clip ${clip.name} tidak valid.`);
  }
  return [...new Set(errors)];
}

export function buildExportManifest(state,settings={}){
  const errors=validateExportState(state);
  if(errors.length)throw new Error(errors.join("\n"));
  const ratio=settings.ratio||"9:16";
  const [width,height]=RATIOS[ratio]||RATIOS["9:16"];
  const mediaById=new Map(state.media.map(item=>[item.id,item]));
  return{
    version:1,
    project:{id:state.project.id,name:state.project.name},
    output:{path:settings.outputPath||"",width,height,ratio,fps:Number(settings.fps)||30,quality:settings.quality||"balanced"},
    duration:Math.max(0,...state.clips.map(c=>c.timelineStart+(c.end-c.start))),
    clips:state.clips.map(c=>({id:c.id,name:c.name,track:c.track,start:c.start,end:c.end,timelineStart:c.timelineStart,sourcePath:mediaById.get(c.mediaId).sourcePath}))
  };
}
