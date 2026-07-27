export function createEditorState(){
  const listeners=new Set();
  const fresh=()=>({project:{id:crypto.randomUUID(),name:"Untitled Project",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()},media:[],clips:[],selectedClipId:null,currentTime:0,zoom:1,clipboard:null});
  let state=fresh();
  const notify=()=>listeners.forEach(fn=>fn(state));
  return{
    get:()=>state,
    set(patch){state={...state,...patch};notify();},
    replace(next){state=structuredClone(next);notify();},
    update(mutator){state=mutator(structuredClone(state));notify();},
    subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
    reset(){state=fresh();notify();}
  };
}
