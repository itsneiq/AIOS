import assert from"node:assert/strict";
import{analyzeProjectPerformance,visibleTimelineClips,createFrameScheduler}from"../public/editor/performance.js";

const small=analyzeProjectPerformance({clips:Array(20),media:Array(5)});
assert.equal(small.level,"normal");
assert.equal(small.virtualize,false);

const large=analyzeProjectPerformance({clips:Array(350),media:Array(20)});
assert.equal(large.level,"warning");
assert.equal(large.virtualize,true);
assert.match(large.messages[0],/350 clip/);

const clips=Array.from({length:1000},(_,index)=>({id:`c${index}`,timelineStart:index,end:1,start:0}));
const visible=visibleTimelineClips(clips,{total:1000,scrollLeft:4000,viewportWidth:1000,contentWidth:10000,selectedClipId:"c900",maxRendered:240});
assert.ok(visible.length<=240);
assert.ok(visible.some(clip=>clip.id==="c900"));
assert.ok(visible.some(clip=>clip.id==="c400"));
assert.ok(!visible.some(clip=>clip.id==="c50"));

const frames=[];let scheduled;
const schedule=createFrameScheduler(value=>frames.push(value),{requestFrame:fn=>scheduled=fn});
schedule(1);schedule(2);schedule(3);
assert.equal(frames.length,0);
scheduled();
assert.deepEqual(frames,[3]);

console.log("PASS editor performance guard");
