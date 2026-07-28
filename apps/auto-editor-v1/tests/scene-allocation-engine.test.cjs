"use strict";
const assert=require("node:assert/strict");
const {allocateScenes}=require("../scene-allocation-engine");
const {planTrims,mediaTrimFilter,videoTrimFilter}=require("../trim-planner");
const beats=durations=>durations.map((duration,index)=>({index,duration}));
const scene=(index,start,duration,quality=80)=>({index,start,end:start+duration,duration,quality,usable:true});

const sequential=allocateScenes({beats:beats([2,2,2]),scenes:[scene(0,0,8)]});
assert.deepEqual(planTrims(sequential).map(trim=>[trim.sourceStart,trim.sourceEnd]),[[0,2],[2,4],[4,6]]);
assert.deepEqual({...sequential.budgets[0],reuseCount:undefined},{sceneIndex:0,duration:8,allocated:6,remaining:2,reuseCount:undefined});
assert.equal(sequential.renderedDuration,6);

const splitBeat=allocateScenes({beats:beats([3]),scenes:[scene(0,0,1),scene(1,1,2,70)],reusePolicy:"FORBID"});
assert.deepEqual(splitBeat.beats[0].segments.map(segment=>[segment.sceneIndex,segment.sourceStart,segment.sourceEnd]),[[0,0,1],[1,1,3]]);
assert.equal(splitBeat.beats[0].allocatedDuration,3);assert.equal(splitBeat.renderedDuration,3);

const exhausted=allocateScenes({beats:beats([2,2]),scenes:[scene(0,0,2),scene(1,2,2,70)],reusePolicy:"FORBID"});
assert.deepEqual(exhausted.beats.map(beat=>beat.segments[0].sceneIndex),[0,1]);
const strictDuplicate=allocateScenes({beats:beats([1,1]),scenes:[scene(0,0,1),scene(1,1,1,79),scene(2,2,1,60)],duplicates:[[0,1]],reusePolicy:"FORBID"});
assert.deepEqual(strictDuplicate.beats.map(beat=>beat.segments[0].sceneIndex),[0,2]);

const forbidden=allocateScenes({beats:beats([2,2]),scenes:[scene(0,0,2)],reusePolicy:"FORBID"});
assert.equal(forbidden.beats[1].sceneSelection,null);assert.equal(forbidden.coverage,0.5);assert.equal(forbidden.allocatedDuration,2);assert.equal(forbidden.renderedDuration,2);
const fallback=allocateScenes({beats:beats([1,1,1]),scenes:[scene(0,0,2)]});
assert.deepEqual(planTrims(fallback).map(trim=>[trim.sourceStart,trim.sourceEnd,trim.reused]),[[0,1,false],[1,2,false],[0,1,true]]);
assert.equal(fallback.coverage,0.667);assert.equal(fallback.renderedDuration,3);

assert.match(videoTrimFilter(planTrims(sequential)),/concat=n=3:v=1:a=0\[cutv\]/);
const avFilter=mediaTrimFilter(planTrims(sequential),{includeAudio:true});
assert.match(avFilter,/atrim=start=0:end=2,asetpts=PTS-STARTPTS\[a0\]/);
assert.match(avFilter,/concat=n=3:v=0:a=1\[cuta\]/);

const input={beats:beats([1,1,1]),scenes:[scene(0,0,2,80),scene(1,2,2,80)],reusePolicy:"FORBID"};
assert.deepEqual(allocateScenes(input),allocateScenes(input));
let seed=123456789;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/2**32);
const stressBeats=Array.from({length:100},(_,index)=>({index,duration:Number((0.1+random()*1.4).toFixed(3))}));
const stressScenes=Array.from({length:30},(_,index)=>scene(index,index*3,Number((1+random()*3).toFixed(3)),Math.floor(50+random()*50)));
const stress=allocateScenes({beats:stressBeats,scenes:stressScenes,reusePolicy:"FORBID"});
assert.equal(stress.beats.length,100);assert.ok(stress.coverage>=0&&stress.coverage<=1);
for(const budget of stress.budgets){assert.ok(budget.remaining>=0);assert.equal(Number((budget.allocated+budget.remaining).toFixed(3)),budget.duration)}
for(const candidate of stressScenes){const ranges=planTrims(stress).filter(item=>item.sceneIndex===candidate.index&&!item.reused).map(item=>[item.sourceStart,item.sourceEnd]);for(let i=1;i<ranges.length;i++)assert.ok(ranges[i][0]>=ranges[i-1][1])}
console.log("scene allocation engine tests passed");