import assert from"node:assert/strict";
import{applyMediaRelinks,countOfflineMedia}from"../public/editor/relink.js";

const state={media:[{id:"a",name:"Intro.MP4",size:100,url:""},{id:"b",name:"outro.mp4",size:200,url:""}]};
const intro={id:"new-a",name:"intro.mp4",size:100,url:"blob:intro"};
const extra={id:"new-c",name:"extra.mp4",size:300,url:"blob:extra"};
const result=applyMediaRelinks(state,[extra,intro]);
assert.deepEqual(result.linked,["a"]);
assert.deepEqual(result.unmatched,[extra]);
assert.equal(state.media[0].id,"a");
assert.equal(state.media[0].url,"blob:intro");
assert.equal(countOfflineMedia(state),1);

const replacement={id:"replacement",name:"renamed-source.mov",size:999,url:"blob:replacement"};
const targeted=applyMediaRelinks(state,[replacement],{targetMediaId:"b"});
assert.deepEqual(targeted.linked,["b"]);
assert.equal(state.media[1].id,"b");
assert.equal(state.media[1].name,"renamed-source.mov");
assert.equal(countOfflineMedia(state),0);

console.log("PASS media relink regression");
