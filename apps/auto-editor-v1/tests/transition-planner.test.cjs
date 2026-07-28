"use strict";
const assert=require("node:assert/strict");
const {TYPES,chooseTransition,normalizeScene,planTransitions}=require("../transition-planner");
const scenes=[
  {id:"hook",role:"hook",subject:"bag",camera:"wide",energy:0.9,motion:"fast pan",tags:["bag"]},
  {id:"detail",role:"proof",subject:"bag",camera:"macro",energy:0.8,motion:"static",tags:["bag"]},
  {id:"cta",role:"cta",subject:"bag",camera:"medium",energy:0.3,motion:"static",tags:["bag"]}
];
const plan=planTransitions(scenes);
assert.equal(plan.transitionCount,2);
assert.equal(plan.transitions[0].transitionType,TYPES.MATCH_CUT);
assert.equal(plan.transitions[1].transitionType,TYPES.FADE);
assert.ok(plan.totalTransitionDuration>0);
assert.deepEqual(plan,planTransitions(scenes));
assert.equal(planTransitions([]).transitionCount,0);
assert.equal(planTransitions([scenes[0]]).transitionCount,0);
assert.equal(chooseTransition(normalizeScene(scenes[0]),normalizeScene(scenes[1]),{forceType:TYPES.WHIP}).transitionType,TYPES.WHIP);
assert.ok(planTransitions(scenes,{style:"fast"}).transitions[0].duration<plan.transitions[0].duration);
console.log("transition planner tests passed");
