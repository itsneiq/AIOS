const $=id=>document.getElementById(id);
const fields=["inputFolder","outputFolder","platform","style","variants","filenamePattern","hook","benefit","cta","voiceEnabled","voiceRate","musicEnabled","musicFile"];
let timer;

function toast(msg){$("toast").textContent=msg;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),2200)}
async function api(url,options={}){const r=await fetch(url,{headers:{"Content-Type":"application/json"},...options});const j=await r.json();if(!r.ok)throw new Error(j.error||"Request gagal");return j}
function configFromUI(){const x={};for(const f of fields){const e=$(f);x[f]=e.type==="checkbox"?e.checked:e.type==="number"?Number(e.value):e.value}return x}
async function save(){await api("/api/config",{method:"POST",body:JSON.stringify(configFromUI())});toast("Pengaturan tersimpan")}
async function load(){
 const c=await api("/api/config");
 for(const f of fields){if(c[f]===undefined)continue;const e=$(f);if(e.type==="checkbox")e.checked=!!c[f];else e.value=c[f]}
 await refresh();
}
async function scan(){await save();const j=await api("/api/scan",{method:"POST",body:JSON.stringify({inputFolder:$("inputFolder").value})});toast(`${j.count} video ditemukan`);renderQueue(j.queue)}
function renderQueue(q){
 $("queue").innerHTML=q.length?q.map(x=>`<tr><td>${escapeHtml(x.name)}</td><td><span class="badge ${x.status}">${x.status}</span><div>${escapeHtml(x.message||"")}</div></td><td><div class="bar"><i style="width:${x.progress||0}%"></i></div>${x.progress||0}%</td><td>${x.output?escapeHtml(x.output):"-"}</td></tr>`).join(""):`<tr><td colspan="4">Belum ada video. Isi folder lalu klik Scan.</td></tr>`;
 const done=q.filter(x=>x.status==="done").length, fail=q.filter(x=>x.status==="failed").length;
 $("total").textContent=q.length;$("done").textContent=done;$("failed").textContent=fail;
 $("progress").textContent=q.length?Math.round(q.reduce((a,x)=>a+(x.progress||0),0)/q.length)+"%":"0%";
}
function escapeHtml(s){return String(s).replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}
async function refresh(){
 const j=await api("/api/state");renderQueue(j.queue);
 $("current").textContent=j.state.running?`Sedang memproses: ${j.state.current||"menyiapkan…"}`:"Belum ada produksi aktif.";
 $("log").textContent=(j.state.log||[]).join("\n")||"AIOS siap.";
 $("startBtn").classList.toggle("hidden",j.state.running);$("stopBtn").classList.toggle("hidden",!j.state.running);
}
async function start(){await save();await api("/api/start",{method:"POST"});toast("Produksi dimulai");refresh()}
async function stop(){await api("/api/stop",{method:"POST"});toast("Produksi dihentikan");refresh()}
async function reset(){await api("/api/queue/reset",{method:"POST"});toast("Status antrean di-reset");refresh()}
async function check(){
 const j=await api("/api/check");$("healthDot").className="dot "+(j.ffmpeg?"ok":"bad");
 $("healthText").textContent=j.ffmpeg?"Sistem siap":"FFmpeg belum ada";
 $("healthSub").textContent=j.ffmpeg?`${j.node} · FFmpeg aktif`:"Jalankan install-ffmpeg.bat";
}
$("saveBtn").onclick=save;$("scanBtn").onclick=scan;$("startBtn").onclick=start;$("stopBtn").onclick=stop;$("resetBtn").onclick=reset;
load().then(check);timer=setInterval(refresh,1800);
