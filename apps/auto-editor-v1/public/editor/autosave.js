const AUTOSAVE_KEY="aios.coreEditor.autosave.v1";
const CLEAN_EXIT_KEY="aios.coreEditor.cleanExit.v1";

function sanitize(state){
  return{
    ...structuredClone(state),
    media:(state.media||[]).map(({url,file,...media})=>({...media,url:"",file:null})),
    clipboard:null,
    recovery:{savedAt:new Date().toISOString(),version:1}
  };
}

export function readAutosave(){
  try{return JSON.parse(localStorage.getItem(AUTOSAVE_KEY)||"null");}catch{return null;}
}

export function clearAutosave(){localStorage.removeItem(AUTOSAVE_KEY);}

export function wasCleanExit(){return localStorage.getItem(CLEAN_EXIT_KEY)==="1";}

export function markSessionStarted(){localStorage.setItem(CLEAN_EXIT_KEY,"0");}

export function markCleanExit(){localStorage.setItem(CLEAN_EXIT_KEY,"1");}

export function createAutosaveManager({getState,onSaved,intervalMs=30000}){
  let timer=null;
  let dirty=false;
  let lastSignature="";

  function signature(state){
    const clean=sanitize(state);
    delete clean.recovery;
    return JSON.stringify(clean);
  }

  function save(force=false){
    const state=getState();
    const nextSignature=signature(state);
    if(!force&&!dirty&&nextSignature===lastSignature)return false;
    const snapshot=sanitize(state);
    localStorage.setItem(AUTOSAVE_KEY,JSON.stringify(snapshot));
    lastSignature=nextSignature;
    dirty=false;
    onSaved?.(snapshot.recovery.savedAt);
    return true;
  }

  function markDirty(){dirty=true;}
  function start(){if(timer)return;timer=setInterval(()=>save(false),intervalMs);}
  function stop(){if(timer){clearInterval(timer);timer=null;}}

  return{start,stop,save,markDirty};
}
