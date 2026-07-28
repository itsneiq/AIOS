import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const source=fs.readFileSync(path.join(root,"public/editor/export-manifest.js"),"utf8");
const moduleUrl=`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
const {buildExportManifest,validateExportState}=await import(moduleUrl);

function state(overrides={}){
  return{
    project:{id:"project-1",name:"Regression Project"},
    media:[{id:"media-1",name:"source.mp4",sourcePath:"C:/media/source.mp4"}],
    clips:[{id:"clip-1",mediaId:"media-1",name:"Clip 1",track:"V1",start:2,end:7,timelineStart:0}],
    ...overrides
  };
}

assert.deepEqual(validateExportState(state()),[]);
assert.deepEqual(validateExportState(state({clips:[]})),["Timeline masih kosong."]);
assert.match(validateExportState(state({media:[{id:"media-1",name:"source.mp4"}]}))[0],/belum direlink/);
assert.match(validateExportState(state({clips:[{id:"bad",mediaId:"missing",name:"Missing",track:"V1",start:0,end:1,timelineStart:0}]}))[0],/tidak ditemukan/);
assert.match(validateExportState(state({clips:[{id:"bad",mediaId:"media-1",name:"Bad",track:"V1",start:4,end:4,timelineStart:0}]}))[0],/tidak valid/);
assert.match(validateExportState(state({clips:[{id:"bad",mediaId:"media-1",name:"Bad Track",track:"V9",start:0,end:1,timelineStart:0}]}))[0],/Track/);

const portrait=buildExportManifest(state(),{ratio:"9:16",fps:60,quality:"high",outputPath:"C:/out/result.mp4"});
assert.equal(portrait.version,1);
assert.deepEqual([portrait.output.width,portrait.output.height],[1080,1920]);
assert.equal(portrait.output.fps,60);
assert.equal(portrait.output.quality,"high");
assert.equal(portrait.duration,5);
assert.equal(portrait.clips[0].sourcePath,"C:/media/source.mp4");

const square=buildExportManifest(state(),{ratio:"1:1"});
assert.deepEqual([square.output.width,square.output.height],[1080,1080]);

const stressClips=Array.from({length:500},(_,index)=>({id:`clip-${index}`,mediaId:"media-1",name:`Clip ${index}`,track:"V1",start:0,end:1,timelineStart:index}));
const started=performance.now();
const stress=buildExportManifest(state({clips:stressClips}),{ratio:"16:9"});
const elapsed=performance.now()-started;
assert.equal(stress.clips.length,500);
assert.equal(stress.duration,500);
assert.ok(elapsed<1000,`Manifest build terlalu lambat: ${elapsed.toFixed(1)}ms`);

console.log(`PASS export manifest regression (${elapsed.toFixed(1)}ms for 500 clips)`);
