"use strict";

const PLATFORM_PRESETS = Object.freeze({
  tiktok: Object.freeze({ id: "tiktok", maxChars: 28, maxWords: 5, marginL: 90, marginR: 90, bodyMarginV: 310, ctaMarginV: 330 }),
  shopee: Object.freeze({ id: "shopee", maxChars: 30, maxWords: 6, marginL: 80, marginR: 80, bodyMarginV: 260, ctaMarginV: 280 }),
  meta: Object.freeze({ id: "meta", maxChars: 32, maxWords: 6, marginL: 100, marginR: 100, bodyMarginV: 290, ctaMarginV: 310 }),
  youtube: Object.freeze({ id: "youtube", maxChars: 34, maxWords: 7, marginL: 90, marginR: 90, bodyMarginV: 250, ctaMarginV: 270 })
});

const EMPHASIS_WORDS = new Set([
  "baru", "bonus", "diskon", "gratis", "hemat", "promo", "praktis", "wajib",
  "murah", "premium", "cepat", "mudah", "sekarang", "terbatas"
]);

function getPreset(platform) {
  return PLATFORM_PRESETS[platform] || PLATFORM_PRESETS.tiktok;
}

function splitReadable(text, options = {}) {
  const maxChars = Math.max(12, Number(options.maxChars) || 30);
  const maxWords = Math.max(2, Number(options.maxWords) || 6);
  const words = String(text || "").trim().split(/\s+/).filter(Boolean);
  const phrases = [];
  let current = [];

  for (const word of words) {
    const candidate = [...current, word].join(" ");
    if (current.length && (current.length >= maxWords || candidate.length > maxChars)) {
      phrases.push(current.join(" "));
      current = [word];
    } else {
      current.push(word);
    }
    if (/[.!?]$/.test(word) && current.length >= 2) {
      phrases.push(current.join(" "));
      current = [];
    }
  }
  if (current.length) phrases.push(current.join(" "));
  return phrases;
}

function cueWeights(phrases) {
  return phrases.map(text => Math.max(1, text.replace(/\s+/g, " ").length));
}

function scheduleRegion(phrases, start, end, role) {
  if (!phrases.length || end <= start) return [];
  const weights = cueWeights(phrases);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = start;
  return phrases.map((text, index) => {
    const next = index === phrases.length - 1
      ? end
      : cursor + ((end - start) * weights[index]) / total;
    const cue = { start: cursor, end: next, role, text };
    cursor = next;
    return cue;
  });
}

function planSubtitles({ script = {}, duration = 6, platform = "tiktok" } = {}) {
  const preset = getPreset(platform);
  const videoDuration = Math.max(1, Number(duration) || 6);
  const hookEnd = Math.min(videoDuration * 0.3, 2.4);
  const ctaDuration = Math.min(2, Math.max(1.2, videoDuration * 0.22));
  const ctaStart = Math.max(hookEnd, videoDuration - ctaDuration);
  const split = text => splitReadable(text, preset);
  const cues = [
    ...scheduleRegion(split(script.hook), 0, hookEnd, "hook"),
    ...scheduleRegion(split(script.benefit), hookEnd, ctaStart, "body"),
    ...scheduleRegion(split(script.cta), ctaStart, videoDuration, "cta")
  ].filter(cue => cue.end - cue.start >= 0.08);

  return { preset, duration: videoDuration, cues };
}

function findEmphasisWords(text) {
  return String(text || "").split(/\s+/).filter(word => {
    const normalized = word.toLocaleLowerCase("id-ID").replace(/[^a-z0-9%]/g, "");
    return EMPHASIS_WORDS.has(normalized) || /^(?:rp)?\d[\d.,]*%?$/.test(normalized);
  });
}

module.exports = { EMPHASIS_WORDS, PLATFORM_PRESETS, findEmphasisWords, getPreset, planSubtitles, splitReadable };
