export function createEditorState(){
  const listeners=new Set();
  let state={
    project:{id:crypto.randomUUID(),name:"Untitled Project",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},
    media:[],clips:[],selectedClipId:null,currentTime:0
  };
  return {
    get:()=>state,
    set(patch){state={...state,...patch};listeners.forEach(fn=>fn(state));},
    update(mutator){state=mutator(structuredClone(state));listeners.forEach(fn=>fn(state));},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    reset(){state={project:{id:crypto.randomUUID(),name:"Untitled Project",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},media:[],clips:[],selectedClipId:null,currentTime:0};listeners.forEach(fn=>fn(state));}
  };
}
