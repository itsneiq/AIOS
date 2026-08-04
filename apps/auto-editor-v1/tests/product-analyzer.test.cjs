"use strict";

const assert = require("node:assert/strict");
const { analyzeProduct, extractAttributes, inferCategory } = require("../product-analyzer");

assert.equal(inferCategory({title:"Tas wanita pastel"}).category,"fashion");
assert.equal(inferCategory({category:"beauty",title:"Tas"}).category,"beauty");

/*
 * Judul produk di marketplace menyebut nama barangnya, bukan nama kategorinya.
 * Kosakata yang tipis membuat semuanya jatuh ke general dan seluruh keputusan
 * setelahnya ikut salah, jadi kedua kategori yang paling sering dipakai diuji
 * dengan judul yang bentuknya seperti aslinya.
 */
for(const title of [
  "Kemeja Oversize Pria Lengan Panjang Katun",
  "Outer Cardigan Rajut Wanita Korean Style",
  "Kaos Polos Cotton Combed 30s Unisex",
  "Sneakers Putih Casual Import Premium",
  "Jam Tangan Wanita Rantai Stainless",
  "Setelan Piyama Satin Adem Lengan Pendek",
  "Legging Sport Highwaist Anti Tembus",
  "Kacamata Anti Radiasi Frame Bulat"
]) assert.equal(inferCategory({title}).category,"fashion",`harus terbaca fashion: ${title}`);

for(const title of [
  "Toner Exfoliating BHA 2% Salicylic Acid 100ml",
  "Sunscreen SPF 50 PA++++ Gel Watery 30ml",
  "Lip Cream Matte Tahan Lama 12 Jam",
  "Masker Wajah Clay Charcoal Detox",
  "Bedak Tabur Loose Powder Oil Control",
  "Essence Retinol 0.5% Anti Aging Night",
  "Micellar Water Pembersih Makeup 200ml",
  "Parfum Wanita Tahan Lama 30ml"
]) assert.equal(inferCategory({title}).category,"beauty",`harus terbaca beauty: ${title}`);

// Kategori lain tidak boleh ikut tertarik oleh kosakata yang diperluas.
assert.equal(inferCategory({title:"Panci Anti Lengket Set 3 Pcs"}).category,"kitchen");
assert.equal(inferCategory({title:"Powerbank 20000mAh Fast Charging"}).category,"gadget");
assert.equal(inferCategory({title:"Rak Dinding Minimalis Kayu"}).category,"home");

// Akhiran -nya lazim di judul dan deskripsi marketplace.
assert.equal(inferCategory({title:"Sepatunya ringan dipakai harian"}).category,"fashion");
assert.deepEqual(extractAttributes({description:"Bahan: kanvas. Ukuran: 26 x 17 cm. Warna: biru, putih"}),[
  "material: kanvas",
  "size: 26 x 17 cm",
  "color: biru, putih"
]);

const input={
  title:"Tas wanita kanvas waterproof",
  brand:"AIOS",
  description:"Bahan: kanvas waterproof. Ukuran: 26 x 17 cm. Warna: biru",
  attributes:["ringan"]
};
const product=analyzeProduct(input);
assert.equal(product.category,"fashion");
assert.equal(Object.hasOwn(product,"price"),false);
assert.ok(product.attributes.includes("ringan"));
assert.ok(product.benefits.some(value=>value.includes("nyaman")||value.includes("aman")));
assert.ok(product.keywords.includes("fashion"));
assert.ok(product.targetAudience.length>0);
assert.deepEqual(product,analyzeProduct(input),"analysis must be deterministic");

console.log("product analyzer tests passed");
