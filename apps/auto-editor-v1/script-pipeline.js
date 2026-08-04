"use strict";

/*
 * Tahap murah dari produksi video: produk masuk, varian script keluar.
 *
 * Pipeline sengaja berhenti di sini. Semua yang ada di modul ini biayanya
 * mendekati nol, sehingga varian boleh dibuat ulang sebanyak apa pun sebelum
 * satu detik video pun di-generate. Tahap mahal baru dimulai setelah pengguna
 * memilih varian secara eksplisit.
 */

const { analyzeProduct } = require("./product-analyzer");
const { planCreative } = require("./creative-planner");
const { scoreHook } = require("./hook-optimizer");
const { scoreAdHook } = require("./hook-quality");
const { checkPolicy } = require("./policy-filter");
const { generateScriptVariants } = require("./script-generator");
const { estimateVideoCost } = require("./gemini-client");

const DEFAULT_DURATION = 18;
const DEFAULT_AI_SECONDS = 9;

function round(value) {
  return Number((Number(value) || 0).toFixed(2));
}

/*
 * Skor akhir menggabungkan kualitas hook dengan risiko penolakan Meta.
 * Pelanggaran berat menekan varian ke dasar daftar karena iklan yang ditolak
 * tidak menghasilkan data apa pun, seburuk apa pun hook-nya.
 */
function combineScore({ hookScore, policy }) {
  const base = Math.max(0, hookScore - policy.penalty);
  return round(policy.blocking ? Math.min(base, 20) : base);
}

function evaluateVariant(variant, { platform, product }) {
  const hook = scoreHook(variant.hook, { platform, productName: product.title, keywords: product.keywords });
  const ad = scoreAdHook(variant.hook, { baseScore: hook.score });
  const policy = checkPolicy(variant);
  return {
    ...variant,
    hookScore: hook.score,
    adScore: ad.score,
    wordCount: hook.wordCount,
    signals: hook.signals,
    strengths: ad.strengths,
    weaknesses: ad.weaknesses,
    issues: hook.issues,
    policy,
    score: combineScore({ hookScore: ad.score, policy })
  };
}

function rankVariants(variants, context) {
  return variants
    .map(variant => evaluateVariant(variant, context))
    .sort((a, b) => b.score - a.score || a.wordCount - b.wordCount)
    .map((variant, index) => ({ ...variant, rank: index + 1 }));
}

function summarize(ranked) {
  const blocked = ranked.filter(item => item.policy.blocking).length;
  const flagged = ranked.filter(item => !item.policy.safe).length;
  return {
    total: ranked.length,
    usable: ranked.filter(item => !item.policy.blocking).length,
    blocked,
    flagged,
    bestScore: ranked[0]?.score || 0,
    angles: [...new Set(ranked.map(item => item.angle))].sort()
  };
}

async function planScripts(input = {}, client) {
  const product = analyzeProduct({
    title: input.title,
    brand: input.brand,
    category: input.category,
    description: input.description,
    attributes: input.attributes,
    filename: input.filename
  });

  const duration = Number(input.duration) || DEFAULT_DURATION;
  const aiSeconds = Math.min(duration, Number(input.aiSeconds ?? DEFAULT_AI_SECONDS));
  const platform = input.platform || "meta";

  const creative = planCreative({
    category: product.category,
    angle: input.angle,
    style: input.style,
    platform,
    seed: input.seed || product.title,
    keywords: product.keywords,
    duration
  });

  const generated = await generateScriptVariants({
    product,
    platform,
    count: input.count,
    duration,
    angles: input.angles || [],
    extraNotes: input.notes || ""
  }, client);

  const ranked = rankVariants(generated.variants, { platform, product });

  return {
    product,
    creative,
    variants: ranked,
    summary: summarize(ranked),
    cost: {
      script: { usd: 0, note: "Biaya teks dapat diabaikan dibanding video." },
      videoIfApproved: estimateVideoCost(aiSeconds, { usdToIdr: input.usdToIdr }),
      plan: { duration, aiSeconds, photoSeconds: round(duration - aiSeconds) }
    },
    degraded: generated.degraded,
    reason: generated.reason,
    model: generated.model || null,
    usage: generated.usage || null
  };
}

module.exports = {
  DEFAULT_AI_SECONDS,
  DEFAULT_DURATION,
  combineScore,
  evaluateVariant,
  planScripts,
  rankVariants,
  summarize
};
