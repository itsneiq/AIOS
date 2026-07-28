"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");
const { synthesizeVoice } = require("./voice-engine");
const { resolveScript } = require("./script-engine");
const { findEmphasisWords, planSubtitles } = require("./subtitle-planner");

const ROOT = __dirname;
const DATA = process.env.AIOS_DATA_DIR || path.join(ROOT, "data");
const CONFIG_FILE = path.join(DATA, "config.json");
const QUEUE_FILE = path.join(DATA, "queue.json");
const STATE_FILE = path.join(DATA, "state.json");
const WORK = path.join(DATA, "work");
fs.mkdirSync(WORK, {recursive:true});

function readJson(f, fallback) { try { return JSON.parse(fs.readFileSync(f,"utf8")); } catch { return fallback; } }
function writeJson(f,v) { const t=`${f}.tmp`; fs.writeFileSync(t,JSON.stringify(v,null,2),"utf8"); fs.renameSync(t,f); }
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }
function escAss(s){ return String(s||"").replace(/\r?\n/g,"\\N").replace(/[{}]/g,""); }
function assTime(sec){
  sec = Math.max(0, sec);
  const h = Math.floor(sec/3600); sec -= h*3600;
  const m = Math.floor(sec/60); sec -= m*60;
  return `${h}:${String(m).padStart(2,"0")}:${sec.toFixed(2).padStart(5,"0")}`;
}
function run(cmd,args,opts={}) {
  return new Promise((resolve,reject)=>{
    const p=spawn(cmd,args,{shell:true,windowsHide:true,...opts});
    let so="",se="";
    p.stdout?.on("data",d=>so+=d);
    p.stderr?.on("data",d=>se+=d);
    p.on("error",reject);
    p.on("close",c=>c===0?resolve({stdout:so,stderr:se}):reject(new Error(`${cmd} exited ${c}\n${se}`)));
  });
}
async function duration(file){
  const r=await run("ffprobe",["-v","error","-show_entries","format=duration","-of","default=noprint_wrappers=1:nokey=1",`"${file}"`]);
  return Number(r.stdout.trim()) || 6;
}
function updateItem(id, patch){
  const q=readJson(QUEUE_FILE,[]);
  const i=q.findIndex(x=>x.id===id);
  if(i>=0){ q[i]={...q[i],...patch}; writeJson(QUEUE_FILE,q); }
}
function updateState(patch){
  const s=readJson(STATE_FILE,{running:true,current:null,log:[]});
  writeJson(STATE_FILE,{...s,...patch});
}
function stopRequested(){ return !!readJson(STATE_FILE,{}).stopRequested; }
function emphasizeAss(text){
  const emphasis=new Set(findEmphasisWords(text).map(word=>word.toLocaleLowerCase("id-ID").replace(/[^a-z0-9%]/g,"")));
  return escAss(text).split(/(\s+)/).map(part=>{
    const normalized=part.toLocaleLowerCase("id-ID").replace(/[^a-z0-9%]/g,"");
    return emphasis.has(normalized)?`{\\c&H00D7FF&}${part}{\\c&HFFFFFF&}`:part;
  }).join("");
}
function makeAss(file,dur,script,platform){
  const plan=planSubtitles({script,duration:dur,platform});
  const {preset}=plan;
  const content=`[Script Info]
ScriptType: v4.00+
PlayResX: 1080
PlayResY: 1920
WrapStyle: 0
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name,Fontname,Fontsize,PrimaryColour,SecondaryColour,OutlineColour,BackColour,Bold,Italic,Underline,StrikeOut,ScaleX,ScaleY,Spacing,Angle,BorderStyle,Outline,Shadow,Alignment,MarginL,MarginR,MarginV,Encoding
Style: Hook,Arial,66,&H00FFFFFF,&H000000FF,&H00101010,&H78000000,-1,0,0,0,100,100,0,0,1,4,2,8,${preset.marginL},${preset.marginR},120,1
Style: Body,Arial,50,&H00FFFFFF,&H000000FF,&H00101010,&H78000000,-1,0,0,0,100,100,0,0,1,3,1,2,${preset.marginL},${preset.marginR},${preset.bodyMarginV},1
Style: CTA,Arial,55,&H00FFFFFF,&H000000FF,&H00101010,&H90000000,-1,0,0,0,100,100,0,0,3,2,0,2,${preset.marginL},${preset.marginR},${preset.ctaMarginV},1

[Events]
Format: Layer,Start,End,Style,Name,MarginL,MarginR,MarginV,Effect,Text
${plan.cues.map(cue=>`Dialogue: 0,${assTime(cue.start)},${assTime(cue.end)},${cue.role === "hook" ? "Hook" : cue.role === "cta" ? "CTA" : "Body"},,0,0,0,,${emphasizeAss(cue.text)}`).join("\n")}
`;
  fs.writeFileSync(file,content,"utf8");
}
function outputName(cfg,item,index,variant){
  let s=cfg.filenamePattern || "{base}_AIOS_{index}";
  s=s.replaceAll("{base}",item.base).replaceAll("{index}",String(index+1).padStart(2,"0")).replaceAll("{variant}",String(variant));
  return s.replace(/[<>:"/\\|?*]/g,"_");
}
async function render(item,index,cfg,variant){
  const script=resolveScript(cfg,item,index,variant);
  const dur=await duration(item.source);
  const token=`${Date.now()}-${index}-${variant}`;
  const ass=path.join(WORK,`${token}.ass`);
  const wav=path.join(WORK,`${token}.${cfg.voiceProvider === "windows" ? "wav" : "mp3"}`);
  makeAss(ass,dur,script,cfg.subtitlePreset || cfg.platform);

  const outDir=cfg.outputFolder || path.join(path.dirname(item.source),"AIOS_Output");
  fs.mkdirSync(outDir,{recursive:true});
  const out=path.join(outDir,`${outputName(cfg,item,index,variant)}.mp4`);

  let voiceExists=false;
  if(cfg.voiceEnabled){
    try {
      const provider=await synthesizeVoice({text:`${script.hook}. ${script.benefit}. ${script.cta}`,output:wav,voice:cfg.voiceName,rate:cfg.voiceRate,provider:cfg.voiceProvider,fallback:cfg.voiceFallback,workDir:WORK});
      console.log(`Voice-over dibuat dengan ${provider === "edge" ? "Edge Neural TTS" : "Windows Speech"}; script angle: ${script.angle}`);
      voiceExists=fs.existsSync(wav);
    } catch(e){ console.log(`Voice-over gagal, lanjut tanpa VO: ${e.message}`); }
  }

  const assEsc=ass.replace(/\\/g,"/").replace(/:/g,"\\:");
  const vf=`scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,subtitles='${assEsc}'`;
  const args=["-y","-i",`"${item.source}"`];
  if(voiceExists) args.push("-i",`"${wav}"`);
  if(cfg.musicEnabled && cfg.musicFile && fs.existsSync(cfg.musicFile)) args.push("-stream_loop","-1","-i",`"${cfg.musicFile}"`);

  args.push("-filter_complex");
  let fc=`[0:v]${vf}[v]`;
  let maps=["-map","[v]"];
  if(voiceExists && cfg.musicEnabled && cfg.musicFile && fs.existsSync(cfg.musicFile)){
    fc+=`;[0:a]volume=0.35[a0];[1:a]volume=1.0[a1];[2:a]volume=${Number(cfg.volumeMusic)||0.12}[a2];[a0][a1][a2]amix=inputs=3:duration=first:dropout_transition=2[a]`;
    maps.push("-map","[a]");
  } else if(voiceExists){
    fc+=`;[0:a]volume=0.32[a0];[1:a]volume=1.0[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]`;
    maps.push("-map","[a]");
  } else if(cfg.musicEnabled && cfg.musicFile && fs.existsSync(cfg.musicFile)){
    fc+=`;[0:a]volume=0.45[a0];[1:a]volume=${Number(cfg.volumeMusic)||0.12}[a1];[a0][a1]amix=inputs=2:duration=first:dropout_transition=2[a]`;
    maps.push("-map","[a]");
  } else {
    maps.push("-map","0:a?");
  }
  args.push(`"${fc}"`,...maps,"-c:v","libx264","-preset","medium","-crf","20","-c:a","aac","-b:a","192k","-shortest",`"${out}"`);
  await run("ffmpeg",args);
  for(const f of [ass,wav]) try{ if(fs.existsSync(f)) fs.unlinkSync(f); }catch{}
  return {out,script};
}

(async()=>{
  const cfg=readJson(CONFIG_FILE,{});
  let q=readJson(QUEUE_FILE,[]);
  for(let i=0;i<q.length;i++){
    if(stopRequested()) break;
    q=readJson(QUEUE_FILE,[]);
    const item=q[i];
    if(!item || item.status==="done") continue;
    updateState({current:item.name});
    updateItem(item.id,{status:"processing",progress:5,message:"Menganalisis video"});
    try{
      let last="",lastScript=null;
      const variants=Math.max(1,Math.min(5,Number(cfg.variants)||1));
      for(let v=1;v<=variants;v++){
        if(stopRequested()) throw new Error("Produksi dihentikan pengguna");
        updateItem(item.id,{progress:15+Math.round((v-1)/variants*75),message:`Render varian ${v}/${variants}`});
        const result=await render(item,i,cfg,v);
        last=result.out;lastScript=result.script;
      }
      updateItem(item.id,{status:"done",progress:100,message:"Selesai",output:last,script:lastScript});
      console.log(`Selesai: ${item.name}`);
    }catch(e){
      const stopped=stopRequested();
      updateItem(item.id,{status:stopped?"queued":"failed",progress:0,message:stopped?"Dihentikan":e.message.slice(0,180)});
      if(!stopped) console.error(`Gagal ${item.name}: ${e.message}`);
    }
    await sleep(250);
  }
  updateState({running:false,current:null,stopRequested:false});
})().catch(e=>{
  console.error(e);
  updateState({running:false,current:null,stopRequested:false});
  process.exit(1);
});
