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
    child.stderr.on("data",chunk=>{const text=chunk.toString();stderr+=text;const match=/time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);if(match&&onProgress){const seconds=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);onProgress(Math.min(.99,seconds/Math.max(.01,duration)))}});
    child.on("error",reject);
    child.on("exit",code=>{signal?.removeEventListener("abort",cancel);if(code===0){onProgress?.(1);resolve()}else reject(new Error(signal?.aborted?"Export dibatalkan.":`FFmpeg gagal (${code}). ${stderr.slice(-1400)}`))});
  });
}

function qualityArgs(quality){if(quality==="high")return["-crf","18","-preset","slow"];if(quality==="fast")return["-crf","26","-preset","veryfast"];return["-crf","22","-preset","medium"]}
function inputArgs(clip){return["-ss",String(clip.start),"-t",String(clip.end-clip.start),"-i",clip.sourcePath]}

async function renderTimeline(manifest,{ffmpeg="ffmpeg",onProgress,signal}={}){
  const v1=manifest.clips.filter(c=>c.track==="V1").sort((a,b)=>a.timelineStart-b.timelineStart);
  const v2=manifest.clips.filter(c=>c.track==="V2").sort((a,b)=>a.timelineStart-b.timelineStart);
  const a1=manifest.clips.filter(c=>c.track==="A1").sort((a,b)=>a.timelineStart-b.timelineStart);
  if(!v1.length)throw new Error("Track V1 tidak memiliki clip untuk diekspor.");
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"aios-export-"));
  try{
    const parts=[];
    for(let index=0;index<v1.length;index++){
      const clip=v1[index],part=path.join(temp,`part-${String(index).padStart(4,"0")}.mp4`),duration=clip.end-clip.start;
      parts.push(part);
      await run(ffmpeg,["-y",...inputArgs(clip),"-vf",`scale=${manifest.output.width}:${manifest.output.height}:force_original_aspect_ratio=decrease,pad=${manifest.output.width}:${manifest.output.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${manifest.output.fps}`,"-c:v","libx264",...qualityArgs(manifest.output.quality),"-c:a","aac","-ar","48000","-ac","2",part],{signal,duration,onProgress:p=>onProgress?.((index+p)/(v1.length+2),`Rendering V1 ${index+1}/${v1.length}`)});
    }
    const list=path.join(temp,"concat.txt"),base=path.join(temp,"base.mp4");
    fs.writeFileSync(list,parts.map(file=>`file '${file.replace(/'/g,"'\\''")}'`).join("\n"));
    await run(ffmpeg,["-y","-f","concat","-safe","0","-i",list,"-c","copy",base],{signal,duration:manifest.duration,onProgress:p=>onProgress?.((v1.length+p)/(v1.length+2),"Menggabungkan V1")});
    if(!v2.length&&!a1.length){fs.copyFileSync(base,manifest.output.path);onProgress?.(1,"Export selesai");return{outputPath:manifest.output.path};}

    const args=["-y","-i",base];
    for(const clip of v2)args.push(...inputArgs(clip));
    for(const clip of a1)args.push(...inputArgs(clip));
    const filters=[];
    let videoLabel="0:v";
    v2.forEach((clip,index)=>{const input=index+1,scaled=`ov${index}`,next=`v${index}`;filters.push(`[${input}:v]scale=${manifest.output.width}:${manifest.output.height}:force_original_aspect_ratio=decrease,format=rgba,setpts=PTS-STARTPTS+${clip.timelineStart}/TB[${scaled}]`);filters.push(`[${videoLabel}][${scaled}]overlay=0:0:eof_action=pass:shortest=0[${next}]`);videoLabel=next});
    let audioLabel="0:a";
    if(a1.length){const labels=[];a1.forEach((clip,index)=>{const input=1+v2.length+index,label=`a${index}`,delay=Math.max(0,Math.round(clip.timelineStart*1000));filters.push(`[${input}:a]adelay=${delay}|${delay},volume=1[${label}]`);labels.push(`[${label}]`)});filters.push(`[0:a]${labels.join("")}amix=inputs=${labels.length+1}:duration=longest:normalize=0[aout]`);audioLabel="aout"}
    args.push("-filter_complex",filters.join(";"),"-map",`[${videoLabel}]`,"-map",audioLabel==="0:a"?"0:a?":`[${audioLabel}]`,"-c:v","libx264",...qualityArgs(manifest.output.quality),"-c:a","aac","-ar","48000","-ac","2","-shortest",manifest.output.path);
    await run(ffmpeg,args,{signal,duration:manifest.duration,onProgress:p=>onProgress?.((v1.length+1+p)/(v1.length+2),`Compositing V2 (${v2.length}) dan A1 (${a1.length})`)});
    return{outputPath:manifest.output.path};
  }finally{fs.rmSync(temp,{recursive:true,force:true})}
}

module.exports={renderTimeline};
