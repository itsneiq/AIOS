import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const failures=[];
const notices=[];

function requirePath(relative){
  const target=path.join(root,relative);
  if(!fs.existsSync(target))failures.push(`Missing required path: ${relative}`);
  return target;
}

function assert(condition,message){if(!condition)failures.push(message);}

const requiredFiles=[
  "electron/main.js",
  "electron/preload.js",
  "electron/export-engine.js",
  "public/editor.html",
  "public/editor/editor.js",
  "public/editor/export-ui.js",
  "public/editor/autosave.js",
  "public/editor/relink.js",
  "server.js",
  "renderer.js",
  "package.json"
];
requiredFiles.forEach(requirePath);

const packagePath=requirePath("package.json");
const pkg=JSON.parse(fs.readFileSync(packagePath,"utf8"));
assert(pkg.main==="electron/main.js","package.json main must point to electron/main.js");
assert(pkg.engines?.node,"package.json must declare a Node.js engine");
assert(pkg.scripts?.check,"package.json must expose npm run check");
assert(pkg.scripts?.test,"package.json must expose npm test");
assert(pkg.scripts?.dist,"package.json must expose npm run dist");
assert(pkg.build?.win?.target==="nsis","Windows build target must be NSIS");
assert(pkg.build?.nsis?.allowToChangeInstallationDirectory===true,"NSIS installer must allow choosing an installation directory");
assert(Array.isArray(pkg.build?.files),"electron-builder files list is required");
for(const required of ["electron/**/*","public/**/*","scripts/**/*","server.js","renderer.js","package.json"]){
  assert(pkg.build?.files?.includes(required),`electron-builder files must include ${required}`);
}

const ignoredDirectories=["node_modules","dist"];
for(const directory of ignoredDirectories){
  if(fs.existsSync(path.join(root,directory)))notices.push(`${directory}/ exists locally and must not be committed`);
}

if(failures.length){
  console.error("Release readiness check failed:\n"+failures.map(item=>`- ${item}`).join("\n"));
  process.exit(1);
}

console.log(`PASS release readiness (${requiredFiles.length} required files checked)`);
for(const notice of notices)console.log(`NOTICE ${notice}`);
