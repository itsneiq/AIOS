"use strict";
const assert=require("node:assert/strict");
const {optimizeHook,optimizeHooks,scoreHook}=require("../hook-optimizer");
assert.equal(scoreHook("",{}).score,0);
const strong="Jangan beli Serum Glow sebelum lihat 3 bukti ini!",weak="Produk yang cukup bagus untuk digunakan setiap hari oleh semua orang";
assert.ok(scoreHook(strong,{productName:"Serum Glow"}).score>scoreHook(weak,{productName:"Serum Glow"}).score);
const result=optimizeHooks([weak,strong,strong.toLowerCase()],{platform:"tiktok",productName:"Serum Glow"});
assert.equal(result.bestHook,strong);assert.equal(result.evaluatedCount,2);assert.deepEqual(result.candidates.map(item=>item.rank),[1,2]);assert.deepEqual(result,optimizeHook([weak,strong,strong.toLowerCase()],{platform:"tiktok",productName:"Serum Glow"}));assert.equal(optimizeHook([],{}).bestHook,null);
console.log("hook optimizer tests passed");
