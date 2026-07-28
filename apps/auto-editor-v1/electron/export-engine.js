"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function run(command,args,{onProgress,duration=1,signal}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{windowsHide:true});
    let stderr="";
    const cancel=()=>{if(process.platform==="win32")spawn("taskkill",["/pid",String(child.pid),"/t","/f"],{windowsHide:true});else child.kill("SIGTERM")};
    signal?.addEventListener("abort",cancel,{once:true});
    child.stderr.on("data",chunk=>{const text=chunk.toString();stderr+=text;const match=/time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);if(match&&onProgress){const seconds=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);onProgress(Math.min(0.99,seconds/Math.max(.01,duration)))}});
    child.on("error",reject);
    child.on("exit",code=>{signal?.removeEventListener("abort",cancel);if(code===0){onProgress?.(1);resolve()}else reject(new Error(signal?.aborted?"Export dibatalkan.":`FFmpeg gagal (${code}). ${stderr.slice(-1200)}`))});
  });
}

function qualityArgs(quality){if(quality==="high")return["-crf","18","-preset","slow"];if(quality==="fast")return["-crf","26","-preset","veryfast"];return["-crf","22","-preset","medium"]}

async function renderTimeline(manifest,{ffmpeg="ffmpeg",onProgress,signal}={}){
  const clips=manifest.clips.filter(c=>c.track==="V1").sort((a,b)=>a.timelineStart-b.timelineStart);
  if(!clips.length)throw new Error("Track V1 tidak memiliki clip untuk diekspor.");
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"aios-export-"));
  try{
    const parts=[];
    for(let index=0;index<clips.length;index++){
      const clip=clips[index],part=path.join(temp,`part-${String(index).padStart(4,"0")}.mp4`);parts.push(part);
      const duration=clip.end-clip.start;
      await run(ffmpeg,["-y","-ss",String(clip.start),"-t",String(duration),"-i",clip.sourcePath,"-vf",`scale=${manifest.output.width}:${manifest.output.height}:force_original_aspect_ratio=decrease,pad=${manifest.output.width}:${manifest.output.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${manifest.output.fps}`,"-c:v","libx264",...qualityArgs(manifest.output.quality),"-c:a","aac","-ar","48000","-ac","2",part],{signal,duration,onProgress:p=>onProgress?.((index+p)/(clips.length+1),`Rendering clip ${index+1}/${clips.length}`)});
    }
    const list=path.join(temp,"concat.txt");fs.writeFileSync(list,parts.map(file=>`file '${file.replace(/'/g,"'\\''")}'`).join("\n"));
    await run(ffmpeg,["-y","-f","concat","-safe","0","-i",list,"-c","copy",manifest.output.path],{signal,duration:manifest.duration,onProgress:p=>onProgress?.((clips.length+p)/(clips.length+1),"Menggabungkan timeline")});
    return{outputPath:manifest.output.path};
  }finally{fs.rmSync(temp,{recursive:true,force:true})}
}

module.exports={renderTimeline};
