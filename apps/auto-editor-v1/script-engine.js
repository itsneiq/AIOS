"use strict";

const { analyzeMarketing } = require("./marketing-analyzer");

const ANGLES = Object.freeze({
  balanced: {
    hooks: [
      "Stop scroll dulu, produk ini punya detail yang bikin penasaran.",
      "Kalau kamu suka produk yang praktis tapi tetap menarik, lihat ini.",
      "Ini salah satu produk yang gampang masuk ke rutinitas harian.",
      "Kelihatannya simpel, tapi bagian terbaiknya ada di detailnya.",
      "Sebelum checkout produk sejenis, lihat pilihan yang satu ini."
    ],
    benefits: [
      "Desainnya mudah dipadukan, detailnya rapi, dan nyaman dipakai untuk aktivitas sehari-hari.",
      "Tampilannya menarik tanpa terasa berlebihan, jadi cocok untuk banyak kebutuhan.",
      "Fungsional untuk penggunaan harian dengan bentuk yang tetap enak dilihat.",
      "Detail dan tampilannya dibuat untuk memberi kesan praktis sekaligus lebih premium.",
      "Cocok untuk kamu yang mencari produk serbaguna dengan tampilan yang tetap menarik."
    ],
    ctas: [
      "Cek detail dan promo terbarunya di keranjang sekarang.",
      "Lihat pilihan variannya sebelum stok atau promonya berubah.",
      "Klik produknya untuk cek harga dan detail lengkapnya.",
      "Masukkan ke keranjang dulu supaya gampang dibandingkan.",
      "Cek produknya sekarang dan pilih varian yang paling cocok."
    ]
  },
  curiosity: { hooks: [
    "Awalnya terlihat biasa, sampai kamu lihat detail yang satu ini.",
    "Ada alasan kenapa produk ini menarik perhatian sejak detik pertama.",
    "Bagian paling menarik dari produk ini bukan yang langsung kelihatan.",
    "Coba perhatikan detailnya, ini yang bikin produk ini terasa berbeda.",
    "Produk ini punya satu hal kecil yang bikin keseluruhan tampilannya naik level."
  ]},
  problem_solution: { hooks: [
    "Masih bingung cari produk harian yang praktis tapi tetap enak dilihat?",
    "Kalau produk yang kamu pakai sehari-hari terasa kurang praktis, coba lihat ini.",
    "Buat kamu yang butuh fungsi tanpa mengorbankan tampilan, ini bisa jadi jawabannya.",
    "Tidak perlu pilih antara praktis atau menarik kalau bisa dapat keduanya.",
    "Ini solusi simpel untuk kebutuhan harian yang sering dianggap sepele."
  ]},
  fomo: { hooks: [
    "Jangan sampai baru lihat produk ini setelah variannya habis.",
    "Produk seperti ini biasanya cepat dilirik saat promonya masih aktif.",
    "Sebelum harga atau stoknya berubah, cek dulu detail produk ini.",
    "Kalau sudah masuk wishlist, ini waktunya cek promonya.",
    "Pilihan menarik seperti ini sering tidak lama tersedia lengkap."
  ]}
});

function clampCount(value,max=5){return Math.max(1,Math.min(max,Number(value)||1))}
function hash(value){let h=2166136261;for(const char of String(value||"")){h^=char.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
function rotate(list,seed,offset=0){return list[(hash(seed)+offset)%list.length]}
function pool(angle,key){return ANGLES[angle]?.[key]||ANGLES.balanced[key]}
function generateScript(options={}){
  const seed=`${options.seed||"aios"}:${options.index||0}:${options.variant||1}`;
  const angle=ANGLES[options.angle]?options.angle:"balanced";
  return {hook:rotate(pool(angle,"hooks"),seed,0),benefit:rotate(pool(angle,"benefits"),seed,1),cta:rotate(pool(angle,"ctas"),seed,2),angle};
}
function resolveScript(config={},item={},index=0,variant=1){
  if(config.scriptMode!=="auto")return {hook:String(config.hook||"").trim(),benefit:String(config.benefit||"").trim(),cta:String(config.cta||"").trim(),angle:"manual"};
  const marketing=config.scriptAngle==="auto"?analyzeMarketing({category:config.productCategory,title:config.productName,filename:item.name||item.base,style:config.style,platform:config.platform}):null;
  const script=generateScript({angle:marketing?.angle||config.scriptAngle,seed:item.base||item.name||"video",index,variant});
  return marketing?{...script,marketing}:script;
}
function generateScriptSet(options={}){const count=clampCount(options.count);return Array.from({length:count},(_,index)=>generateScript({...options,index,variant:index+1}))}

module.exports={ANGLES,clampCount,generateScript,generateScriptSet,resolveScript};
