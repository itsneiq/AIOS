"use strict";

const MOTION_PRESETS = Object.freeze({
  off: Object.freeze({ id: "off", maxZoom: 1, pan: 0 }),
  subtle: Object.freeze({ id: "subtle", maxZoom: 1.06, pan: 0.025 }),
  balanced: Object.freeze({ id: "balanced", maxZoom: 1.1, pan: 0.04 }),
  energetic: Object.freeze({ id: "energetic", maxZoom: 1.15, pan: 0.055 })
});

const MOTIONS = Object.freeze(["zoom_in", "pan_left", "zoom_out", "pan_right"]);

function getMotionPreset(value) {
  return MOTION_PRESETS[value] || MOTION_PRESETS.balanced;
}

function hash(value) {
  let result = 2166136261;
  for (const char of String(value || "")) {
    result ^= char.charCodeAt(0);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function planMotion({ duration = 6, preset = "balanced", seed = "" } = {}) {
  const settings = getMotionPreset(preset);
  const videoDuration = Math.max(1, Number(duration) || 6);
  if (settings.id === "off") return { preset: settings, duration: videoDuration, segments: [] };

  const segmentCount = Math.max(1, Math.min(4, Math.ceil(videoDuration / 3.5)));
  const offset = hash(seed) % MOTIONS.length;
  const roles = ["hook", "benefit", "detail", "cta"];
  const segments = Array.from({ length: segmentCount }, (_, index) => ({
    start: (videoDuration * index) / segmentCount,
    end: (videoDuration * (index + 1)) / segmentCount,
    role: roles[Math.min(index, roles.length - 1)],
    type: MOTIONS[(offset + index) % MOTIONS.length],
    zoom: settings.maxZoom,
    pan: settings.pan
  }));
  if (segments.length > 1) segments[segments.length - 1].role = "cta";
  return { preset: settings, duration: videoDuration, segments };
}

function motionFilter(plan) {
  if (!plan?.segments?.length) return "";
  const maxZoom = plan.preset.maxZoom;
  const pan = plan.preset.pan.toFixed(3);
  const expressions = plan.segments.map(segment => {
    const length = Math.max(0.001, segment.end - segment.start).toFixed(3);
    const progress = `min(max((on/30-${segment.start.toFixed(3)})/${length},0),1)`;
    const zoomIn = `1+${(maxZoom - 1).toFixed(3)}*${progress}`;
    const zoomOut = `${maxZoom.toFixed(3)}-${(maxZoom - 1).toFixed(3)}*${progress}`;
    const z = segment.type === "zoom_out" ? zoomOut : zoomIn;
    const x = segment.type === "pan_left"
      ? `(iw-iw/zoom)*(0.5-${pan}*${progress})`
      : segment.type === "pan_right"
        ? `(iw-iw/zoom)*(0.5+${pan}*${progress})`
        : `(iw-iw/zoom)/2`;
    return { segment, z, x };
  });
  const select = key => expressions.reduceRight((fallback, item) => (
    `if(between(on/30,${item.segment.start.toFixed(3)},${item.segment.end.toFixed(3)}),${item[key]},${fallback})`
  ), expressions.at(-1)[key]);
  const z = select("z");
  const x = select("x");
  return `zoompan=z='${z}':x='${x}':y='(ih-ih/zoom)/2':d=1:s=1080x1920:fps=30`;
}

module.exports = { MOTIONS, MOTION_PRESETS, getMotionPreset, motionFilter, planMotion };
