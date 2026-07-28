const allowed=new Set(["video/mp4","video/quicktime","video/x-msvideo","video/x-matroska","video/webm"]);

function probe(file){return new Promise((resolve,reject)=>{const video=document.createElement("video");const url=URL.createObjectURL(file);video.preload="metadata";video.onloadedmetadata=()=>resolve({id:crypto.randomUUID(),name:file.name,size:file.size,type:file.type,duration:Number(video.duration)||0,url,file,sourcePath:window.aiosDesktop?.getFilePath?.(file)||file.path||""});video.onerror=()=>{URL.revokeObjectURL(url);reject(new Error(`Tidak bisa membaca ${file.name}`));};video.src=url;});}

export async function importMedia(files){
  const accepted=[...files].filter(file=>allowed.has(file.type)||/\.(mp4|mov|avi|mkv|webm)$/i.test(file.name));
  if(!accepted.length)throw new Error("Tidak ada file video yang didukung.");
  return Promise.all(accepted.map(probe));
}

export function formatBytes(bytes){if(bytes<1024)return`${bytes} B`;if(bytes<1048576)return`${(bytes/1024).toFixed(1)} KB`;return`${(bytes/1048576).toFixed(1)} MB`;}
