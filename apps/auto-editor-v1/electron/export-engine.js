"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

function quote(value){const text=String(value);return /\s|"/.test(text)?`"${text.replace(/"/g,'\\"')}"`:text}
function classifyExportError({error,stderr="",code,aborted=false}={}){
  const text=`${error?.message||""}\n${stderr}`.toLowerCase();
  if(aborted)return{code:"CANCELLED",message:"Export dibatalkan oleh pengguna."};
  if(error?.code==="ENOENT"||/not recognized|not found|no such file or directory/.test(text))return{code:"FFMPEG_NOT_FOUND",message:"FFmpeg tidak ditemukan. Instal FFmpeg atau pastikan executable tersedia."};
  if(/permission denied|access is denied|eperm|eacces/.test(text))return{code:"PERMISSION_DENIED",message:"AIOS tidak memiliki izin menulis ke lokasi output."};
  if(/no space left|disk full|not enough space/.test(text))return{code:"DISK_FULL",message:"Ruang penyimpanan tidak cukup untuk menyelesaikan export."};
  if(/no such file|cannot open input|error opening input|file not found/.test(text))return{code:"SOURCE_MISSING",message:"Salah satu file sumber tidak ditemukan. Relink media lalu coba lagi."};
  if(/unknown encoder|encoder .* not found|unsupported codec|codec not currently supported/.test(text))return{code:"CODEC_UNSUPPORTED",message:"Codec export tidak didukung oleh instalasi FFmpeg ini."};
  return{code:"FFMPEG_FAILED",message:`FFmpeg gagal${Number.isInteger(code)?` (exit ${code})`:""}. Lihat log diagnostics untuk detail.`};
}
function terminate(child){if(!child||child.killed)return;if(process.platform==="win32"&&child.pid)spawn("taskkill",["/pid",String(child.pid),"/t","/f"],{windowsHide:true});else child.kill("SIGTERM")}
function createLogger(logDir,command,args){
  if(!logDir)return{path:"",write:()=>{}};
  fs.mkdirSync(logDir,{recursive:true});
  const stamp=new Date().toISOString().replace(/[:.]/g,"-");
  const file=path.join(logDir,`export-${stamp}.log`);
  fs.writeFileSync(file,[`started=${new Date().toISOString()}`,`platform=${process.platform} ${process.arch}`,`node=${process.version}`,`command=${[command,...args].map(quote).join(" ")}`,""].join("\n"));
  return{path:file,write:text=>fs.appendFileSync(file,String(text))};
}
function run(command,args,{onProgress,duration=1,signal,logDir,timeoutMs=30*60*1000}={}){
  return new Promise((resolve,reject)=>{
    const started=Date.now(),logger=createLogger(logDir,command,args),child=spawn(command,args,{windowsHide:true});
    let stderr="",settled=false;
    const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener("abort",cancel);logger.write(`\nfinished=${new Date().toISOString()}\ndurationMs=${Date.now()-started}\n`);if(error){error.logPath=logger.path;reject(error)}else resolve({...result,logPath:logger.path})};
    const cancel=()=>terminate(child);
    const timer=setTimeout(()=>{terminate(child);const diagnostic={code:"TIMEOUT",message:"FFmpeg tidak merespons dan export dihentikan."};const error=new Error(diagnostic.message);error.diagnostic=diagnostic;finish(error)},timeoutMs);
    signal?.addEventListener("abort",cancel,{once:true});
    child.stderr.on("data",chunk=>{const text=chunk.toString();stderr+=text;logger.write(text);const match=/time=(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text);if(match&&onProgress){const seconds=Number(match[1])*3600+Number(match[2])*60+Number(match[3]);onProgress(Math.min(.99,seconds/Math.max(.01,duration)))}});
    child.on("error",error=>{const diagnostic=classifyExportError({error,stderr,aborted:signal?.aborted});const wrapped=new Error(diagnostic.message);wrapped.diagnostic=diagnostic;finish(wrapped)});
    child.on("exit",code=>{if(code===0){onProgress?.(1);finish(null,{})}else{const diagnostic=classifyExportError({stderr,code,aborted:signal?.aborted});const error=new Error(diagnostic.message);error.diagnostic=diagnostic;finish(error)}});
  });
}

function qualityArgs(quality){if(quality==="high")return["-crf","18","-preset","slow"];if(quality==="fast")return["-crf","26","-preset","veryfast"];return["-crf","22","-preset","medium"]}
function inputArgs(clip){return["-ss",String(clip.start),"-t",String(clip.end-clip.start),"-i",clip.sourcePath]}

async function renderTimeline(manifest,{ffmpeg="ffmpeg",onProgress,signal,logDir}={}){
  const v1=manifest.clips.filter(c=>c.track==="V1").sort((a,b)=>a.timelineStart-b.timelineStart),v2=manifest.clips.filter(c=>c.track==="V2").sort((a,b)=>a.timelineStart-b.timelineStart),a1=manifest.clips.filter(c=>c.track==="A1").sort((a,b)=>a.timelineStart-b.timelineStart);
  if(!v1.length)throw new Error("Track V1 tidak memiliki clip untuk diekspor.");
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),"aios-export-"));let lastLogPath="";
  try{
    const parts=[];
    for(let index=0;index<v1.length;index++){const clip=v1[index],part=path.join(temp,`part-${String(index).padStart(4,"0")}.mp4`),duration=clip.end-clip.start;parts.push(part);const result=await run(ffmpeg,["-y",...inputArgs(clip),"-vf",`scale=${manifest.output.width}:${manifest.output.height}:force_original_aspect_ratio=decrease,pad=${manifest.output.width}:${manifest.output.height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${manifest.output.fps}`,"-c:v","libx264",...qualityArgs(manifest.output.quality),"-c:a","aac","-ar","48000","-ac","2",part],{signal,logDir,duration,onProgress:p=>onProgress?.((index+p)/(v1.length+2),`Rendering V1 ${index+1}/${v1.length}`)});lastLogPath=result.logPath||lastLogPath}
    const list=path.join(temp,"concat.txt"),base=path.join(temp,"base.mp4");fs.writeFileSync(list,parts.map(file=>`file '${file.replace(/'/g,"'\\''")}'`).join("\n"));
    let result=await run(ffmpeg,["-y","-f","concat","-safe","0","-i",list,"-c","copy",base],{signal,logDir,duration:manifest.duration,onProgress:p=>onProgress?.((v1.length+p)/(v1.length+2),"Menggabungkan V1")});lastLogPath=result.logPath||lastLogPath;
    if(!v2.length&&!a1.length){fs.copyFileSync(base,manifest.output.path);onProgress?.(1,"Export selesai");return{outputPath:manifest.output.path,logPath:lastLogPath}}
    const args=["-y","-i",base];for(const clip of v2)args.push(...inputArgs(clip));for(const clip of a1)args.push(...inputArgs(clip));const filters=[];let videoLabel="0:v";
    v2.forEach((clip,index)=>{const input=index+1,scaled=`ov${index}`,next=`v${index}`;filters.push(`[${input}:v]scale=${manifest.output.width}:${manifest.output.height}:force_original_aspect_ratio=decrease,format=rgba,setpts=PTS-STARTPTS+${clip.timelineStart}/TB[${scaled}]`);filters.push(`[${videoLabel}][${scaled}]overlay=0:0:eof_action=pass:shortest=0[${next}]`);videoLabel=next});let audioLabel="0:a";
    if(a1.length){const labels=[];a1.forEach((clip,index)=>{const input=1+v2.length+index,label=`a${index}`,delay=Math.max(0,Math.round(clip.timelineStart*1000));filters.push(`[${input}:a]adelay=${delay}|${delay},volume=1[${label}]`);labels.push(`[${label}]`)});filters.push(`[0:a]${labels.join("")}amix=inputs=${labels.length+1}:duration=longest:normalize=0[aout]`);audioLabel="aout"}
    args.push("-filter_complex",filters.join(";"),"-map",`[${videoLabel}]`,"-map",audioLabel==="0:a"?"0:a?":`[${audioLabel}]`,"-c:v","libx264",...qualityArgs(manifest.output.quality),"-c:a","aac","-ar","48000","-ac","2","-shortest",manifest.output.path);
    result=await run(ffmpeg,args,{signal,logDir,duration:manifest.duration,onProgress:p=>onProgress?.((v1.length+1+p)/(v1.length+2),`Compositing V2 (${v2.length}) dan A1 (${a1.length})`)});return{outputPath:manifest.output.path,logPath:result.logPath||lastLogPath};
  }catch(error){try{if(manifest.output?.path&&fs.existsSync(manifest.output.path))fs.rmSync(manifest.output.path,{force:true})}catch{}throw error}
  finally{fs.rmSync(temp,{recursive:true,force:true})}
}

module.exports={renderTimeline,classifyExportError};