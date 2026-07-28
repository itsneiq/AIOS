function normalizedName(value){return String(value||"").trim().toLocaleLowerCase();}

function isCompatible(saved,incoming){
  return normalizedName(saved.name)===normalizedName(incoming.name)&&(!saved.size||!incoming.size||saved.size===incoming.size);
}

export function countOfflineMedia(state){return(state.media||[]).filter(media=>!media.url).length;}

export function applyMediaRelinks(state,items,{targetMediaId=null}={}){
  const available=[...(items||[])];
  const linked=[];
  if(targetMediaId){
    const target=(state.media||[]).find(media=>media.id===targetMediaId);
    if(!target||target.url||available.length!==1)return{linked,unmatched:available};
    const incoming=available.shift();
    Object.assign(target,incoming,{id:target.id});
    linked.push(target.id);
    return{linked,unmatched:available};
  }
  for(const target of(state.media||[]).filter(media=>!media.url)){
    const index=available.findIndex(item=>isCompatible(target,item));
    if(index<0)continue;
    const[incoming]=available.splice(index,1);
    Object.assign(target,incoming,{id:target.id});
    linked.push(target.id);
  }
  return{linked,unmatched:available};
}
