import{buildExportManifest,validateExportState}from"./export-manifest.js";

function slug(value){return String(value||"AIOS-export").trim().replace(/[^a-z0-9-_]+/gi,"-").replace(/^-+|-+$/g,"")||"AIOS-export"}

export function attachExportUI({getState,toast}){
  const button=document.createElement("button");button.className="button primary";button.id="exportBtn";button.textContent="Export";document.querySelector(".top-actions")?.append(button);
  const overlay=document.createElement("div");overlay.className="export-overlay";overlay.hidden=true;overlay.innerHTML=`<section class="export-dialog panel"><div class="panel-head"><h2>Export Video</h2><button class="button ghost mini" data-close>Close</button></div><div class="export-form"><label>Aspect ratio<select data-ratio><option>9:16</option><option>16:9</option><option>1:1</option></select></label><label>Frame rate<select data-fps><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label><label>Quality<select data-quality><option value="fast">Fast</option><option value="balanced" selected>Balanced</option><option value="high">High</option></select></label><label>Output<input data-output readonly placeholder="Pilih lokasi file"></label><button class="button ghost" data-browse>Pilih lokasi</button><div class="export-errors" data-errors></div><button class="button primary" data-start>Start Export</button></div></section>`;document.body.append(overlay);
  const q=selector=>overlay.querySelector(selector);
  let outputPath="";
  async function refresh(){const errors=validateExportState(getState());q("[data-errors]").textContent=errors.join("\n");q("[data-start]").disabled=Boolean(errors.length)||!outputPath}
  button.onclick=()=>{overlay.hidden=false;refresh()};q("[data-close]").onclick=()=>overlay.hidden=true;
  q("[data-browse]").onclick=async()=>{outputPath=await window.aiosDesktop?.chooseExportPath?.(`${slug(getState().project.name)}.mp4`)||"";q("[data-output]").value=outputPath;refresh()};
  q("[data-start]").onclick=async()=>{try{const manifest=buildExportManifest(getState(),{ratio:q("[data-ratio]").value,fps:q("[data-fps]").value,quality:q("[data-quality]").value,outputPath});q("[data-start]").disabled=true;q("[data-start]").textContent="Exporting...";const result=await window.aiosDesktop.exportTimeline(manifest);toast("Export selesai");overlay.hidden=true;return result}catch(error){q("[data-errors]").textContent=error.message}finally{q("[data-start]").textContent="Start Export";refresh()}};
}
