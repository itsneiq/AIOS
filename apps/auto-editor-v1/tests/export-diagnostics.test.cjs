"use strict";
const assert=require("node:assert/strict");
const {classifyExportError}=require("../electron/export-engine");

assert.equal(classifyExportError({error:{code:"ENOENT"}}).code,"FFMPEG_NOT_FOUND");
assert.equal(classifyExportError({stderr:"Permission denied"}).code,"PERMISSION_DENIED");
assert.equal(classifyExportError({stderr:"No space left on device"}).code,"DISK_FULL");
assert.equal(classifyExportError({stderr:"Error opening input: No such file"}).code,"SOURCE_MISSING");
assert.equal(classifyExportError({stderr:"Unknown encoder libx264"}).code,"CODEC_UNSUPPORTED");
assert.equal(classifyExportError({aborted:true}).code,"CANCELLED");
assert.equal(classifyExportError({code:1}).code,"FFMPEG_FAILED");
console.log("PASS export diagnostics mapping");