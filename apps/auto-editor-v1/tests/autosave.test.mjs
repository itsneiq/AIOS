import assert from "node:assert/strict";

class MemoryStorage{
  #values=new Map();
  getItem(key){return this.#values.has(key)?this.#values.get(key):null;}
  setItem(key,value){this.#values.set(key,String(value));}
  removeItem(key){this.#values.delete(key);}
}

globalThis.localStorage=new MemoryStorage();

const{
  clearAutosave,
  createAutosaveManager,
  markCleanExit,
  markSessionStarted,
  readAutosave,
  wasCleanExit
}=await import("../public/editor/autosave.js");

const state={
  project:{id:"project-1",name:"Recovery test"},
  media:[{id:"media-1",name:"source.mp4",url:"blob:source",file:{name:"source.mp4"}}],
  clips:[{id:"clip-1",mediaId:"media-1",start:0,end:5}],
  clipboard:{id:"clipboard-1"}
};
let saved=0;
const manager=createAutosaveManager({getState:()=>state,onSaved:()=>saved++});

assert.equal(manager.save(),true,"the first snapshot must be persisted");
assert.equal(manager.save(),false,"an unchanged clean snapshot must be skipped");
assert.equal(saved,1);

const snapshot=readAutosave();
assert.equal(snapshot.project.name,"Recovery test");
assert.equal(snapshot.media[0].url,"","object URLs must not survive a restart");
assert.equal(snapshot.media[0].file,null,"File objects must not be serialized");
assert.equal(snapshot.clipboard,null,"transient clipboard data must not be recovered");
assert.equal(snapshot.recovery.version,1);
assert.ok(!Number.isNaN(Date.parse(snapshot.recovery.savedAt)));

manager.markDirty();
assert.equal(manager.save(),true,"dirty state must be persisted");
assert.equal(manager.save(true),true,"forced saves must always be persisted");
assert.equal(saved,3);

assert.equal(wasCleanExit(),false);
markCleanExit();
assert.equal(wasCleanExit(),true);
markSessionStarted();
assert.equal(wasCleanExit(),false);

localStorage.setItem("aios.coreEditor.autosave.v1","not-json");
assert.equal(readAutosave(),null,"corrupt recovery data must fail safely");
clearAutosave();
assert.equal(readAutosave(),null);

console.log("PASS editor autosave recovery");
