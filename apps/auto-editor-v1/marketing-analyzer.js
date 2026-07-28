"use strict";

const CATEGORY_KEYWORDS = Object.freeze({
  fashion:["baju","dress","blouse","shirt","celana","jeans","rok","tas","bag","sepatu","sandal","hijab","fashion"],
  beauty:["serum","skincare","cream","lip","makeup","cushion","sunscreen","beauty","shampoo","parfum"],
  gadget:["hp","phone","smartphone","charger","earphone","headset","laptop","keyboard","mouse","gadget"],
  kitchen:["panci","wajan","pisau","blender","kitchen","dapur","botol","tumbler","container"],
  home:["lampu","rak","kursi","meja","dekorasi","rumah","home","bedcover","karpet"]
});

const CATEGORY_STRATEGY = Object.freeze({
  fashion:{angle:"curiosity",intent:"visual_desire",reason:"Produk fashion lebih kuat saat detail, styling, dan daya tarik visual dijadikan pemicu rasa penasaran."},
  beauty:{angle:"problem_solution",intent:"transformation",reason:"Produk beauty lebih relevan saat naskah dimulai dari masalah dan mengarah ke hasil yang diinginkan."},
  gadget:{angle:"curiosity",intent:"feature_discovery",reason:"Produk gadget cenderung menarik saat fitur atau detail yang belum langsung terlihat dibuka bertahap."},
  kitchen:{angle:"problem_solution",intent:"utility",reason:"Produk dapur paling mudah dipahami melalui masalah penggunaan harian dan solusi praktis."},
  home:{angle:"balanced",intent:"lifestyle",reason:"Produk rumah tangga membutuhkan kombinasi fungsi, tampilan, dan penggunaan sehari-hari."},
  general:{angle:"balanced",intent:"broad",reason:"Kategori belum cukup spesifik, jadi strategi seimbang adalah pilihan paling aman."}
});

function normalize(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim()}
function inferCategory(input={}){
  const explicit=String(input.category||"").toLowerCase();
  if(CATEGORY_STRATEGY[explicit]&&explicit!=="general")return {category:explicit,confidence:1,signals:["manual-category"]};
  const text=normalize([input.title,input.filename,input.description].filter(Boolean).join(" "));
  let best="general",score=0,signals=[];
  for(const [category,words] of Object.entries(CATEGORY_KEYWORDS)){
    const hits=words.filter(word=>text.includes(word));
    if(hits.length>score){best=category;score=hits.length;signals=hits}
  }
  return {category:best,confidence:score?Math.min(0.95,0.55+score*0.1):0.25,signals};
}
function analyzeMarketing(input={}){
  const inferred=inferCategory(input),strategy=CATEGORY_STRATEGY[inferred.category]||CATEGORY_STRATEGY.general;
  let angle=strategy.angle;
  if(input.style==="hard")angle="fomo";
  if(input.style==="clean"&&inferred.category!=="beauty")angle="balanced";
  return {...inferred,angle,intent:strategy.intent,reason:strategy.reason};
}

module.exports={CATEGORY_KEYWORDS,CATEGORY_STRATEGY,analyzeMarketing,inferCategory,normalize};
