"use strict";

const OUTPUT_PRESETS = Object.freeze({
  vertical: Object.freeze({ width: 1080, height: 1920 }),
  square: Object.freeze({ width: 1080, height: 1080 }),
  landscape: Object.freeze({ width: 1920, height: 1080 })
});

function clamp(value, fallback = 0.5) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : fallback;
}

function getOutputPreset(format = "vertical") {
  return OUTPUT_PRESETS[format] || OUTPUT_PRESETS.vertical;
}

function planReframe({ format = "vertical", focus = {}, safeMargin = 0.08 } = {}) {
  const output = getOutputPreset(format);
  const margin = Math.max(0, Math.min(0.45, Number(safeMargin) || 0));
  const focusX = Math.max(margin, Math.min(1 - margin, clamp(focus.x)));
  const focusY = Math.max(margin, Math.min(1 - margin, clamp(focus.y)));
  return { format: OUTPUT_PRESETS[format] ? format : "vertical", output, focus: { x: focusX, y: focusY }, safeMargin: margin };
}

function reframeFilter(plan = planReframe()) {
  const normalized = planReframe(plan);
  const { width, height } = normalized.output;
  const x = normalized.focus.x.toFixed(4);
  const y = normalized.focus.y.toFixed(4);
  return `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height}:x='max(0,min(iw-ow,iw*${x}-ow/2))':y='max(0,min(ih-oh,ih*${y}-oh/2))'`;
}

module.exports = { OUTPUT_PRESETS, getOutputPreset, planReframe, reframeFilter };
