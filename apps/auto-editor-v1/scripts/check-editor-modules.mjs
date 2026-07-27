import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const files=[
  "public/editor/editor.js",
  "public/editor/state.js",
  "public/editor/history.js",
  "public/editor/media.js",
  "public/editor/project.js"
];

let failed=false;
for(const relative of files){
  const filename=path.join(root,relative);
  try{
    const source=fs.readFileSync(filename,"utf8");
    new vm.SourceTextModule(source,{identifier:filename});
    console.log(`OK ${relative}`);
  }catch(error){
    failed=true;
    console.error(`FAIL ${relative}`);
    console.error(error.stack||error.message);
  }
}
if(failed)process.exit(1);
