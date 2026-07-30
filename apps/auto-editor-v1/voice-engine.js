"use strict";

const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const DEFAULT_EDGE_TIMEOUT_MS = 15000;
const INDONESIAN_EDGE_VOICES = Object.freeze([
  { id: "id-ID-GadisNeural", name: "Gadis", gender: "Perempuan" },
  { id: "id-ID-ArdiNeural", name: "Ardi", gender: "Laki-laki" }
]);

const SPEECH_PRESETS = Object.freeze({
  affiliate: Object.freeze({ rateOffset: 4, pitch: "+6Hz", pause: "\n\n" }),
  ugc: Object.freeze({ rateOffset: 3, pitch: "+5Hz", pause: "\n\n" }),
  storytelling: Object.freeze({ rateOffset: -3, pitch: "+0Hz", pause: "\n\n" }),
  podcast: Object.freeze({ rateOffset: -1, pitch: "-2Hz", pause: "\n" }),
  default: Object.freeze({ rateOffset: 0, pitch: "+0Hz", pause: "\n\n" })
});

function run(command, args, { timeoutMs = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { shell: false, windowsHide: true });
    let stderr = "";
    let settled = false;
    let timer = null;

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

    if (timeoutMs > 0) {
      timer = setTimeout(() => {
        try { child.kill("SIGKILL"); } catch {}
        finish(reject, new Error(`${command} timeout setelah ${timeoutMs} ms`));
      }, timeoutMs);
    }
  });
}

function clampRate(value) {
  return Math.max(-50, Math.min(100, Number(value) || 0));
}

function edgeRate(value) {
  const rate = clampRate(value);
  return `${rate >= 0 ? "+" : ""}${rate}%`;
}

function edgePitch(value) {
  const match = String(value ?? "+0Hz").trim().match(/^([+-]?)(\d{1,3})\s*Hz$/i);
  if (!match) return "+0Hz";
  const amount = Math.max(0, Math.min(100, Number(match[2]) || 0));
  const sign = match[1] === "-" ? "-" : "+";
  return `${sign}${amount}Hz`;
}

function edgeRateToWindowsRate(value) {
  return Math.max(-5, Math.min(5, Math.round((Number(value) || 0) / 10)));
}

function validateEdgeVoice(voice) {
  return INDONESIAN_EDGE_VOICES.some(item => item.id === voice)
    ? voice
    : INDONESIAN_EDGE_VOICES[0].id;
}

function resolveSpeechPreset(style) {
  const value = String(style || "").toLowerCase();
  if (value.includes("affiliate") || value.includes("jualan") || value.includes("sales")) return SPEECH_PRESETS.affiliate;
  if (value.includes("ugc")) return SPEECH_PRESETS.ugc;
  if (value.includes("story")) return SPEECH_PRESETS.storytelling;
  if (value.includes("podcast") || value.includes("talking")) return SPEECH_PRESETS.podcast;
  return SPEECH_PRESETS.default;
}

function cleanSpeechSegment(value) {
  return String(value || "")
    .replace(/\r?\n+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\.{3,}/g, "…")
    .replace(/\s+([,!?;:.])/g, "$1")
    .trim();
}

function finishSegment(text, role) {
  if (!text) return "";
  if (/[.!?…]$/.test(text)) return text;
  if (role === "hook") return `${text}?`;
  if (role === "cta") return `${text}!`;
  return `${text}.`;
}

function optimizeSpeechText({ text, segments, style } = {}) {
  const preset = resolveSpeechPreset(style);
  const sourceSegments = Array.isArray(segments) && segments.length
    ? segments
    : [{ role: "body", text }];

  const optimized = sourceSegments
    .map(segment => {
      const role = typeof segment === "object" ? segment.role : "body";
      const value = typeof segment === "object" ? segment.text : segment;
      return finishSegment(cleanSpeechSegment(value), role);
    })
    .filter(Boolean);

  return optimized.join(preset.pause);
}

function prepareSpeechOptions(options = {}) {
  const preset = resolveSpeechPreset(options.style);
  return {
    ...options,
    text: optimizeSpeechText(options),
    rate: clampRate((Number(options.rate) || 0) + preset.rateOffset),
    pitch: edgePitch(options.pitch || preset.pitch)
  };
}

async function synthesizeEdge(options, execute = run) {
  const prepared = prepareSpeechOptions(options);
  await execute(
    "edge-tts",
    [
      "--voice", validateEdgeVoice(prepared.voice),
      "--rate", edgeRate(prepared.rate),
      "--pitch", prepared.pitch,
      "--text", prepared.text,
      "--write-media", prepared.output
    ],
    { timeoutMs: prepared.timeoutMs || DEFAULT_EDGE_TIMEOUT_MS }
  );

  if (!fs.existsSync(prepared.output) || fs.statSync(prepared.output).size === 0) {
    throw new Error("Edge TTS tidak menghasilkan audio.");
  }
}

async function synthesizeWindows(options, execute = run) {
  const prepared = prepareSpeechOptions(options);
  const ps1 = path.join(
    prepared.workDir,
    `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.ps1`
  );
  const windowsRate = edgeRateToWindowsRate(prepared.rate);
  const script = `Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
$s.Rate = ${windowsRate}
$s.SetOutputToWaveFile('${prepared.output.replace(/'/g, "''")}')
$s.Speak('${prepared.text.replace(/'/g, "''")}')
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
  SPEECH_PRESETS,
  edgePitch,
  edgeRate,
  edgeRateToWindowsRate,
  optimizeSpeechText,
  prepareSpeechOptions,
  resolveSpeechPreset,
  synthesizeEdge,
  synthesizeWindows,
  synthesizeVoice,
  validateEdgeVoice
};