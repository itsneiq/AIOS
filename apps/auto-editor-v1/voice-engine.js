"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_EDGE_TIMEOUT_MS = 15000;
const INDONESIAN_EDGE_VOICES = Object.freeze([
  { id: "id-ID-GadisNeural", name: "Gadis", gender: "Perempuan" },
  { id: "id-ID-ArdiNeural", name: "Ardi", gender: "Laki-laki" }
]);

function run(command, args, { timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stderr = "";
    let settled = false;

    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      callback(value);
    };

    child.stderr?.on("data", chunk => {
      stderr += chunk;
    });
    child.on("error", error => finish(reject, error));
    child.on("close", code => {
      if (code === 0) return finish(resolve);
      finish(reject, new Error(`${command} exited ${code}: ${stderr.trim()}`));
    });

    const timer = timeoutMs > 0
      ? setTimeout(() => {
          try { child.kill("SIGKILL"); } catch {}
          finish(reject, new Error(`${command} timeout setelah ${timeoutMs} ms`));
        }, timeoutMs)
      : null;
  });
}

function edgeRate(value) {
  const rate = Math.max(-50, Math.min(100, Number(value) || 0));
  return `${rate >= 0 ? "+" : ""}${rate}%`;
}

function edgeRateToWindowsRate(value) {
  return Math.max(-5, Math.min(5, Math.round((Number(value) || 0) / 10)));
}

function validateEdgeVoice(voice) {
  return INDONESIAN_EDGE_VOICES.some(item => item.id === voice)
    ? voice
    : INDONESIAN_EDGE_VOICES[0].id;
}

async function synthesizeEdge(
  { text, output, voice, rate, timeoutMs = DEFAULT_EDGE_TIMEOUT_MS },
  execute = run
) {
  await execute(
    "edge-tts",
    [
      "--voice", validateEdgeVoice(voice),
      "--rate", edgeRate(rate),
      "--text", String(text),
      "--write-media", output
    ],
    { timeoutMs }
  );

  if (!fs.existsSync(output) || fs.statSync(output).size === 0) {
    throw new Error("Edge TTS tidak menghasilkan audio.");
  }
}

async function synthesizeWindows({ text, output, rate, workDir }, execute = run) {
  const ps1 = path.join(
    workDir,
    `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`
  );
  const windowsRate = edgeRateToWindowsRate(rate);
  const script = `Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.Rate = ${windowsRate}
$s.SetOutputToWaveFile('${output.replace(/'/g, "''")}')
$s.Speak('${String(text).replace(/'/g, "''")}')
$s.Dispose()
`;

  fs.writeFileSync(ps1, script, "utf8");
  try {
    await execute(
      "powershell",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", ps1]
    );
  } finally {
    try { fs.unlinkSync(ps1); } catch {}
  }
}

async function synthesizeVoice(options, execute = run) {
  const provider = options.provider === "windows" ? "windows" : "edge";

  try {
    if (provider === "windows") {
      await synthesizeWindows(options, execute);
    } else {
      await synthesizeEdge(options, execute);
    }
    return provider;
  } catch (error) {
    if (provider !== "edge" || options.fallback === false) throw error;
    await synthesizeWindows(options, execute);
    return "windows";
  }
}

module.exports = {
  DEFAULT_EDGE_TIMEOUT_MS,
  INDONESIAN_EDGE_VOICES,
  edgeRate,
  edgeRateToWindowsRate,
  synthesizeEdge,
  synthesizeWindows,
  synthesizeVoice,
  validateEdgeVoice
};
