"use strict";

const assert = require("node:assert/strict");
const { analyzeProduct, extractAttributes, inferCategory } = require("../product-analyzer");

assert.equal(inferCategory({title:"Tas wanita pastel"}).category,"fashion");
assert.equal(inferCategory({category:"beauty",title:"Tas"}).category,"beauty");
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
