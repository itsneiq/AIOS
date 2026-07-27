const KEY="aios.coreEditor.projects.v1";

function readAll(){try{return JSON.parse(localStorage.getItem(KEY)||"[]");}catch{return[];}}
function writeAll(items){localStorage.setItem(KEY,JSON.stringify(items.slice(0,12)));}

export function saveProject(state){
  const snapshot={...state,media:state.media.map(({url,file,...m})=>m),project:{...state.project,updatedAt:new Date().toISOString()}};
  const all=readAll().filter(x=>x.project.id!==snapshot.project.id);
  writeAll([snapshot,...all]);
  return snapshot;
}
export function listProjects(){return readAll();}
export function loadProject(id){return readAll().find(x=>x.project.id===id)||null;}
export function renameProject(project,name){return{...project,name:String(name||"Untitled Project").trim()||"Untitled Project",updatedAt:new Date().toISOString()};}
