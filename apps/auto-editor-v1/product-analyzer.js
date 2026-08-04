"use strict";

/*
 * Kosakata fashion dan beauty sengaja jauh lebih dalam daripada kategori lain.
 * Judul produk di marketplace Indonesia hampir tidak pernah memakai kata
 * "fashion" atau "skincare"; yang muncul adalah nama barangnya langsung
 * ("Kemeja Oversize Pria", "Toner Exfoliating BHA 2%"). Daftar yang tipis
 * membuat produk jatuh ke kategori general, dan seluruh keputusan setelahnya
 * ikut salah: sudut prioritas, target audiens, dan manfaat bawaan.
 */
const CATEGORY_RULES = Object.freeze({
  fashion: Object.freeze({ words:[
    // atasan
    "baju","kemeja","kaos","tshirt","t shirt","blouse","blus","atasan","tanktop","tank top","crop","croptop","crop top","sweater","hoodie","cardigan","kardigan","outer","jaket","blazer","rompi","vest","tunik","kebaya",
    // bawahan
    "celana","jeans","rok","kulot","legging","jogger","chino","hotpants","bawahan",
    // setelan dan terusan
    "setelan","dress","gamis","jumpsuit","overall","piyama","daster","homewear","one set",
    // alas kaki
    "sepatu","sneakers","sandal","heels","flatshoes","flat shoes","boots","loafers","selop","kaos kaki",
    // tas dan dompet
    "tas","bag","ransel","backpack","tote","totebag","slingbag","sling bag","clutch","dompet","pouch",
    // aksesori
    "jam tangan","kacamata","ikat pinggang","belt","topi","kalung","gelang","anting","cincin","bandana",
    // busana muslim
    "hijab","jilbab","kerudung","pashmina","mukena","khimar",
    // umum
    "fashion","outfit","ootd","unisex","oversize","oversized"
  ], audience:"Pengguna fashion dan kebutuhan harian", benefit:"lebih mudah dipadukan untuk aktivitas sehari-hari" }),
  beauty: Object.freeze({ words:[
    // skincare
    "serum","toner","essence","ampoule","moisturizer","pelembap","pelembab","cream","krim","lotion","sunscreen","sunblock","spf","cleanser","facial wash","facial foam","micellar","makeup remover","masker","sheet mask","scrub","exfoliating","peeling","eye cream","acne","jerawat","komedo","retinol","niacinamide","salicylic","hyaluronic","bha","aha","pha","ceramide","centella","skincare","skin barrier",
    // makeup
    "makeup","make up","bedak","powder","foundation","cushion","concealer","bb cream","cc cream","lipstik","lipstick","lip cream","lip balm","lipbalm","lip tint","lipgloss","lip","blush","blushon","blush on","highlighter","contour","eyeshadow","eyeliner","maskara","mascara","eyebrow","primer","setting spray",
    // rambut
    "shampoo","sampo","conditioner","hairmask","hair mask","pomade","hairspray",
    // tubuh dan wangi
    "body lotion","body wash","handbody","hand body","deodorant","deodoran","parfum","parfume","perfume","body mist","lulur","hand cream",
    // umum
    "beauty","kecantikan","perawatan","glowing","brightening"
  ], audience:"Pengguna beauty dan perawatan diri", benefit:"mendukung rutinitas perawatan yang lebih praktis" }),
  gadget: Object.freeze({ words:["hp","phone","smartphone","charger","earphone","headset","laptop","keyboard","mouse","gadget","powerbank"], audience:"Pengguna gadget dan perangkat digital", benefit:"membantu penggunaan perangkat menjadi lebih praktis" }),
  kitchen: Object.freeze({ words:["panci","wajan","pisau","blender","kitchen","dapur","botol","tumbler","container","spatula"], audience:"Pengguna perlengkapan dapur dan rumah tangga", benefit:"mempermudah pekerjaan dapur sehari-hari" }),
  home: Object.freeze({ words:["lampu","rak","kursi","meja","dekorasi","rumah","home","bedcover","karpet","organizer"], audience:"Pengguna kebutuhan rumah dan dekorasi", benefit:"membuat kebutuhan rumah terasa lebih rapi dan praktis" })
});

const ATTRIBUTE_LABELS = Object.freeze({
  bahan:"material", material:"material", ukuran:"size", size:"size", dimensi:"size",
  kapasitas:"capacity", capacity:"capacity", warna:"color", color:"color",
  berat:"weight", weight:"weight"
});

function normalize(value){return String(value||"").toLocaleLowerCase("id-ID").replace(/[^a-z0-9%+.,×x ]+/g," ").replace(/\s+/g," ").trim()}
function unique(values){return [...new Set(values.map(value=>String(value||"").trim()).filter(Boolean))]}

function inferCategory(input={}){
  const explicit=normalize(input.category);
  if(CATEGORY_RULES[explicit])return {category:explicit,confidence:1,signals:["manual-category"]};
  const text=normalize([input.title,input.filename,input.description,input.attributes].flat().filter(Boolean).join(" "));
  let category="general",score=0,signals=[];
  for(const [name,rule] of Object.entries(CATEGORY_RULES)){
    // Akhiran -nya lazim di judul marketplace ("bahannya adem", "sepatunya").
    const hits=rule.words.filter(word=>new RegExp(`(^|\\s)${word}(nya)?(\\s|$)`).test(text));
    if(hits.length>score){category=name;score=hits.length;signals=hits;}
  }
  return {category,confidence:score?Math.min(0.95,0.55+score*0.1):0.25,signals};
}

function extractAttributes(input={}){
  const supplied=Array.isArray(input.attributes)?input.attributes:normalize(input.attributes).split(/[,;|]/);
  const extracted=[];
  const parts=String(input.description||"").split(/[\r\n.;]+/).map(part=>part.trim()).filter(Boolean);
  for(const part of parts){
    const match=part.match(/^\s*(bahan|material|ukuran|size|dimensi|kapasitas|capacity|warna|color|berat|weight)\s*[:\-]\s*(.+)$/i);
    if(match)extracted.push(`${ATTRIBUTE_LABELS[match[1].toLowerCase()]}: ${match[2].trim()}`);
  }
  return unique([...supplied,...extracted]).slice(0,12);
}

function benefitFromAttribute(attribute,category){
  const text=normalize(attribute);
  if(/waterproof|anti air|tahan air/.test(text))return "lebih aman digunakan saat terkena cipratan air";
  if(/ringan|lightweight/.test(text))return "lebih nyaman dibawa atau digunakan lebih lama";
  if(/besar|kapasitas|liter|ml/.test(text))return "memberi ruang yang lebih praktis untuk kebutuhan harian";
  if(/cotton|katun|lembut|soft/.test(text))return "terasa lebih nyaman saat digunakan";
  if(/portable|lipat|foldable/.test(text))return "mudah disimpan dan dibawa saat dibutuhkan";
  return CATEGORY_RULES[category]?.benefit||"memberi fungsi praktis untuk penggunaan sehari-hari";
}

function buildKeywords(input,category,attributes){
  const stop=new Set(["yang","dan","untuk","dengan","ini","itu","produk","original","terbaru","murah","promo"]);
  const text=normalize([input.title,input.brand,category,...attributes].join(" "));
  const words=text.split(" ").filter(word=>word.length>=3&&!stop.has(word)&&!/^[0-9.,]+$/.test(word));
  return unique([category,...words]).slice(0,12);
}

function analyzeProduct(input={}){
  const title=String(input.title||input.filename||"Produk").trim()||"Produk";
  const brand=String(input.brand||"").trim();
  const description=String(input.description||"").trim();
  const inferred=inferCategory({...input,title,description});
  const attributes=extractAttributes({...input,description});
  const benefits=unique(attributes.map(attribute=>benefitFromAttribute(attribute,inferred.category)));
  if(!benefits.length)benefits.push(CATEGORY_RULES[inferred.category]?.benefit||"memberi fungsi praktis untuk penggunaan sehari-hari");
  return {title,brand,category:inferred.category,categoryConfidence:inferred.confidence,categorySignals:inferred.signals,attributes,benefits:benefits.slice(0,5),targetAudience:CATEGORY_RULES[inferred.category]?.audience||"Pengguna umum sesuai kebutuhan produk",keywords:buildKeywords({title,brand},inferred.category,attributes)};
}

module.exports={ATTRIBUTE_LABELS,CATEGORY_RULES,analyzeProduct,benefitFromAttribute,extractAttributes,inferCategory,normalize};
