"use strict";

const assert = require("node:assert/strict");
const { analyzeProduct, extractAttributes, inferCategory, parsePrice } = require("../product-analyzer");

assert.equal(parsePrice("Rp149.000"),149000);
assert.equal(parsePrice("79,5 ribu"),79500);
assert.equal(parsePrice("1,2 juta"),1200000);
assert.equal(inferCategory({title:"Tas wanita pastel"}).category,"fashion");
assert.equal(inferCategory({category:"beauty",title:"Tas"}).category,"beauty");
assert.deepEqual(extractAttributes({description:"Bahan: kanvas. Ukuran: 26 x 17 cm. Warna: biru, putih"}),[
  "material: kanvas",
  "size: 26 x 17 cm",
  "color: biru, putih"
]);

const product=analyzeProduct({
  title:"Tas wanita kanvas waterproof",
  brand:"AIOS",
  price:"Rp149.000",
  description:"Bahan: kanvas waterproof. Ukuran: 26 x 17 cm. Warna: biru",
  attributes:["ringan"]
});
assert.equal(product.category,"fashion");
assert.equal(product.price,149000);
assert.ok(product.attributes.includes("ringan"));
assert.ok(product.benefits.some(value=>value.includes("nyaman")||value.includes("aman")));
assert.ok(product.keywords.includes("fashion"));
assert.ok(product.targetAudience.length>0);
assert.deepEqual(product,analyzeProduct({
  title:"Tas wanita kanvas waterproof",
  brand:"AIOS",
  price:"Rp149.000",
  description:"Bahan: kanvas waterproof. Ukuran: 26 x 17 cm. Warna: biru",
  attributes:["ringan"]
}),"analysis must be deterministic");

console.log("product analyzer tests passed");
