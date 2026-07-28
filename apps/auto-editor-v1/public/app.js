const $=id=>document.getElementById(id);
const fields=["inputFolder","outputFolder","platform","style","variants","filenamePattern","scriptMode","scriptAngle","hook","benefit","cta","voiceEnabled","voiceProvider","voiceName","voiceRate","voiceFallback","musicEnabled","musicFile"];
let timer;

function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2600)}
async function api(url,options={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...options});let j={};try{j=await r.json()}catch{}if(!r.ok)throw new Error(j.error||"Request gagal");return j}
function configFromUI(){const x={};for(const f of fields){const e=$(f);x[f]=e.type==="checkbox"?e.checked:e.type==="number"?Number(e.value):e.value}return x}
function setBusy(running){$("startBtn").classList.toggle("hidden",running);$("stopBtn").classList.toggle("hidden",!running);$("scanBtn").disabled=running;$("chooseInputBtn").disabled=running;$("chooseOutputBtn").disabled=running}
async function save(){await api("/api/config",{method:"POST",body:JSON.stringify(configFromUI())});toast("Pengaturan tersimpan")}
async function load(){const c=await api("/api/config");for(const f of fields){if(c[f]===undefined)continue;const e=$(f);if(e.type==="checkbox")e.checked=!!c[f];else e.value=c[f]}await refresh()}
async function scan(){try{await save();const j=await api("/api/scan",{method:"POST",body:JSON.stringify({inputFolder:$("inputFolder").value})});toast(`${j.count} video ditemukan`);renderQueue(j.queue)}catch(e){toast(e.message)}}
function renderQueue(q){$("queue").innerHTML=q.length?q.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td><span class="badge ${x.status}">${x.status}</span><div>${escapeHtml(x.message||"")}</div></td><td><div class="bar"><i style="width:${x.progress||0}%"></i></div>${x.progress||0}%</td><td>${x.output?`<button class="mini open-result" data-path="${escapeHtml(x.output)}">Buka</button>`:"-"}</td></tr>`).join(""):`<tr><td colspan="4">Belum ada video. Pilih folder lalu klik Scan.</td></tr>`;const done=q.filter(x=>x.status==="done").length,fail=q.filter(x=>x.status==="failed").length;$("total").textContent=q.length;$("done").textContent=done;$("failed").textContent=fail;$("progress").textContent=q.length?Math.round(q.reduce((a,x)=>a+(x.progress||0),0)/q.length)+"%":"0%";document.querySelectorAll(".open-result").forEach(b=>b.onclick=()=>openPath(b.dataset.path))}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function refresh(){try{const j=await api("/api/state");renderQueue(j.queue);$("current").textContent=j.state.running?`Sedang memproses: ${j.state.current||"menyiapkan…"}`:"Belum ada produksi aktif.";$("log").textContent=(j.state.log||[]).join("\n")||"AIOS siap.";setBusy(!!j.state.running)}catch(e){$("current").textContent="Koneksi ke engine terputus"}}
async function start(){try{await save();await api("/api/start",{method:"POST"});toast("Produksi dimulai");refresh()}catch(e){toast(e.message)}}
async function stop(){try{await api("/api/stop",{method:"POST"});toast("Produksi dihentikan");refresh()}catch(e){toast(e.message)}}
async function reset(){try{await api("/api/queue/reset",{method:"POST"});toast("Status antrean di-reset");refresh()}catch(e){toast(e.message)}}
async function check(){try{const j=await api("/api/check");$("healthDot").className="dot "+(j.ffmpeg?"ok":"bad");$("healthText").textContent=j.ffmpeg?"Sistem siap":"FFmpeg belum ada";$("healthSub").textContent=j.ffmpeg?`${j.node} · FFmpeg aktif`:"Jalankan install-ffmpeg.bat"}catch{$("healthText").textContent="Engine tidak tersedia"}}
async function chooseFolder(field){if(!window.aiosDesktop)return toast("Jalankan versi desktop untuk memakai pemilih folder");const value=await window.aiosDesktop.chooseFolder();if(value){$(field).value=value;await save()}}
async function chooseMusic(){if(!window.aiosDesktop)return toast("Jalankan versi desktop untuk memilih musik");const value=await window.aiosDesktop.chooseFile({filters:[{name:"Audio",extensions:["mp3","wav","m4a","aac","ogg"]}]});if(value){$("musicFile").value=value;$("musicEnabled").checked=true;await save()}}
async function openPath(target){if(!window.aiosDesktop)return toast("Fitur ini tersedia di versi desktop");const result=await window.aiosDesktop.openPath(target);if(result)toast(result)}
async function openOutput(){await openPath($("outputFolder").value)}

$("saveBtn").onclick=save;$("scanBtn").onclick=scan;$("startBtn").onclick=start;$("stopBtn").onclick=stop;$("resetBtn").onclick=reset;
$("chooseInputBtn").onclick=()=>chooseFolder("inputFolder");$("chooseOutputBtn").onclick=()=>chooseFolder("outputFolder");$("chooseMusicBtn").onclick=chooseMusic;$("openOutputBtn").onclick=openOutput;
load().then(check);timer=setInterval(refresh,1200);
