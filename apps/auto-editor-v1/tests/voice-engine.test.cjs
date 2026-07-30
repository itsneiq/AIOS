"use strict";

const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const {
  DEFAULT_EDGE_TIMEOUT_MS,
  edgePitch,
  edgeRate,
  edgeRateToWindowsRate,
  optimizeSpeechText,
  prepareSpeechOptions,
  synthesizeEdge,
  synthesizeVoice,
  validateEdgeVoice
} = require("../voice-engine");

assert.equal(edgeRate(25), "+25%");
assert.equal(edgeRate(-80), "-50%");
assert.equal(edgePitch("-250Hz"), "-100Hz");
assert.equal(edgePitch("invalid"), "+0Hz");
assert.equal(edgeRateToWindowsRate(100), 5);
assert.equal(edgeRateToWindowsRate(-50), -5);
assert.equal(validateEdgeVoice("id-ID-ArdiNeural"), "id-ID-ArdiNeural");
assert.equal(validateEdgeVoice("en-US-Unknown"), "id-ID-GadisNeural");

assert.equal(
  optimizeSpeechText({
    style: "affiliate",
    segments: [
      { role: "hook", text: "Tas lucu ini wajib kamu lihat" },
      { role: "benefit", text: "ringan   dan muat banyak" },
      { role: "cta", text: "cek promonya sekarang" }
    ]
  }),
  "Tas lucu ini wajib kamu lihat?\n\nringan dan muat banyak.\n\ncek promonya sekarang!"
);

assert.deepEqual(
  prepareSpeechOptions({ text: "Halo", style: "ugc", rate: 0 }),
  { text: "Halo.", style: "ugc", rate: 3, pitch: "+5Hz" }
);

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aios-voice-"));

  try {
    const fallbackOutput = path.join(dir, "fallback.mp3");
    const fallbackCalls = [];
    const fallbackProvider = await synthesizeVoice(
      {
        text: "Halo",
        output: fallbackOutput,
        voice: "id-ID-GadisNeural",
        rate: 10,
        provider: "edge",
        fallback: true,
        workDir: dir
      },
      async (command, args, options) => {
        fallbackCalls.push({ command, args, options });
        if (command === "edge-tts") throw new Error("offline");
        fs.writeFileSync(fallbackOutput, "audio");
      }
    );
    assert.equal(fallbackProvider, "windows");
    assert.deepEqual(fallbackCalls.map(item => item.command), ["edge-tts", "powershell"]);
    assert.equal(fallbackCalls[0].options.timeoutMs, DEFAULT_EDGE_TIMEOUT_MS);

    const windowsOutput = path.join(dir, "windows.wav");
    const windowsCalls = [];
    const windowsProvider = await synthesizeVoice(
      {
        text: "Halo",
        output: windowsOutput,
        rate: 0,
        provider: "windows",
        fallback: false,
        workDir: dir
      },
      async command => {
        windowsCalls.push(command);
        fs.writeFileSync(windowsOutput, "audio");
      }
    );
    assert.equal(windowsProvider, "windows");
    assert.deepEqual(windowsCalls, ["powershell"]);

    const noFallbackOutput = path.join(dir, "no-fallback.mp3");
    const noFallbackCalls = [];
    await assert.rejects(
      synthesizeVoice(
        {
          text: "Halo",
          output: noFallbackOutput,
          voice: "id-ID-GadisNeural",
          rate: 0,
          provider: "edge",
          fallback: false,
          workDir: dir
        },
        async command => {
          noFallbackCalls.push(command);
          throw new Error("offline");
        }
      ),
      /offline/
    );
    assert.deepEqual(noFallbackCalls, ["edge-tts"]);

    const timeoutOutput = path.join(dir, "timeout.mp3");
    let timeoutOptions;
    let edgeArgs;
    await synthesizeEdge(
      {
        segments: [
          { role: "hook", text: "Lagi cari tas baru" },
          { role: "cta", text: "cek sekarang" }
        ],
        style: "affiliate",
        output: timeoutOutput,
        voice: "id-ID-GadisNeural",
        rate: 0,
        timeoutMs: 1234
      },
      async (command, args, options) => {
        edgeArgs = args;
        timeoutOptions = options;
        fs.writeFileSync(timeoutOutput, "audio");
      }
    );
    assert.equal(timeoutOptions.timeoutMs, 1234);
    assert.equal(edgeArgs[edgeArgs.indexOf("--rate") + 1], "+4%");
    assert.equal(edgeArgs[edgeArgs.indexOf("--pitch") + 1], "+6Hz");
    assert.equal(
      edgeArgs[edgeArgs.indexOf("--text") + 1],
      "Lagi cari tas baru?\n\ncek sekarang!"
    );

    console.log("voice-engine tests passed");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});