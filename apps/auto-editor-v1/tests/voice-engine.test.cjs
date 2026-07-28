"use strict";
const assert=require("assert");
const fs=require("fs"),os=require("os"),path=require("path");
const {edgeRate,synthesizeVoice,validateEdgeVoice}=require("../voice-engine");
assert.equal(edgeRate(25),"+25%");
assert.equal(edgeRate(-80),"-50%");
assert.equal(validateEdgeVoice("id-ID-ArdiNeural"),"id-ID-ArdiNeural");
assert.equal(validateEdgeVoice("en-US-Unknown"),"id-ID-GadisNeural");
(async()=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"aios-voice-")),output=path.join(dir,"voice.mp3"),calls=[];const provider=await synthesizeVoice({text:"Halo",output,voice:"id-ID-GadisNeural",rate:10,provider:"edge",fallback:true,workDir:dir},async(command,args)=>{calls.push({command,args});if(command==="edge-tts")throw new Error("offline");fs.writeFileSync(output,"audio")});assert.equal(provider,"windows");assert.deepEqual(calls.map(x=>x.command),["edge-tts","powershell"]);fs.rmSync(dir,{recursive:true,force:true});console.log("voice-engine tests passed")})().catch(error=>{console.error(error);process.exitCode=1});
