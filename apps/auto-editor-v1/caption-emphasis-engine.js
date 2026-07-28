"use strict";

const EMPHASIS_TERMS = new Set([
  "baru", "bonus", "diskon", "gratis", "hemat", "promo", "praktis", "wajib",
  "murah", "premium", "cepat", "mudah", "sekarang", "terbatas", "best", "free",
  "new", "sale", "save", "today"
]);
const NUMBER_PATTERN = /^(?:rp)?\d[\d.,]*(?:%|x)?$/i;

function normalizeToken(value) {
  return String(value || "").toLocaleLowerCase("id-ID").replace(/[^\p{L}\p{N}%]/gu, "");
}

function emphasisReason(token, keywords) {
  const normalized = normalizeToken(token);
  if (!normalized) return null;
  if (keywords.has(normalized)) return "keyword";
  if (NUMBER_PATTERN.test(normalized)) return "number";
  if (EMPHASIS_TERMS.has(normalized)) return "term";
  return null;
}

function planCaptionEmphasis({ text = "", keywords = [], maxEmphasis = 4 } = {}) {
  const source = String(text || "");
  const keywordSet = new Set(keywords.map(normalizeToken).filter(Boolean));
  const limit = Math.max(0, Math.floor(Number(maxEmphasis) || 0));
  const matches = [];
  const pattern = /\S+/gu;
  let match;
  while ((match = pattern.exec(source)) && matches.length < limit) {
    const reason = emphasisReason(match[0], keywordSet);
    if (!reason) continue;
    matches.push({ text: match[0], normalized: normalizeToken(match[0]), start: match.index, end: match.index + match[0].length, reason });
  }
  return { text: source, matches, words: matches.map(item => item.text) };
}

function findEmphasisWords(text, options = {}) {
  return planCaptionEmphasis({ text, ...options }).words;
}

function renderEmphasis(text, render, options = {}) {
  const source = String(text || "");
  if (typeof render !== "function") return source;
  const { matches } = planCaptionEmphasis({ text: source, ...options });
  if (!matches.length) return source;
  let cursor = 0;
  let output = "";
  for (const match of matches) {
    output += source.slice(cursor, match.start) + render(match.text, match);
    cursor = match.end;
  }
  return output + source.slice(cursor);
}

module.exports = { EMPHASIS_TERMS, NUMBER_PATTERN, findEmphasisWords, normalizeToken, planCaptionEmphasis, renderEmphasis };
