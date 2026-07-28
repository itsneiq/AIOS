'use strict';

const DEFAULT_OPTIONS = Object.freeze({
  hookWindow: 3,
  fatigueWindow: 4,
  targetSceneDuration: 2.5,
  patternInterruptInterval: 4,
  ctaWindowRatio: 0.78
});

const clamp = (value, min = 0, max = 100) => Math.min(max, Math.max(min, value));
const round = (value, digits = 3) => Number(Number(value).toFixed(digits));

function normalizeScene(scene = {}, index = 0) {
  const start = Number.isFinite(Number(scene.start)) ? Number(scene.start) : 0;
  const duration = Math.max(0, Number.isFinite(Number(scene.duration)) ? Number(scene.duration) : 0);
  return {
    id: scene.id ?? `scene-${index + 1}`,
    index,
    start,
    end: Number.isFinite(Number(scene.end)) ? Number(scene.end) : start + duration,
    duration,
    role: String(scene.role || 'body').toLowerCase(),
    energy: clamp(Number(scene.energy ?? 50)),
    motion: clamp(Number(scene.motion ?? 50)),
    novelty: clamp(Number(scene.novelty ?? 50)),
    relevance: clamp(Number(scene.relevance ?? scene.score ?? 50)),
    emotion: clamp(Number(scene.emotion ?? 50)),
    text: String(scene.text || scene.caption || scene.transcript || ''),
    tags: Array.isArray(scene.tags) ? scene.tags.map(String) : []
  };
}

function normalizeTimeline(timeline) {
  const source = Array.isArray(timeline) ? timeline : timeline?.scenes;
  return Array.isArray(source)
    ? source.map(normalizeScene).sort((a, b) => a.start - b.start || a.index - b.index)
    : [];
}

function scoreHook(scene = {}) {
  const item = normalizeScene(scene);
  const hookRole = /hook|opening|problem|result/.test(item.role) ? 18 : 0;
  const language = /\?|how|why|secret|stop|never|before|warning|diskon|gratis|cara|rahasia|jangan|ternyata/i.test(item.text) ? 12 : 0;
  const speed = item.duration > 0 && item.duration <= 3 ? 10 : 0;
  return round(clamp(
    item.relevance * 0.28 + item.energy * 0.2 + item.motion * 0.12 +
    item.novelty * 0.18 + item.emotion * 0.12 + hookRole + language + speed
  ));
}

function scoreRetention(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  if (!scenes.length) return 0;
  const config = { ...DEFAULT_OPTIONS, ...options };
  const durationScores = scenes.map(scene => {
    const delta = Math.abs(scene.duration - config.targetSceneDuration);
    return clamp(100 - delta * 22);
  });
  const pace = durationScores.reduce((sum, value) => sum + value, 0) / scenes.length;
  const energyVariance = variance(scenes.map(scene => scene.energy));
  const novelty = average(scenes.map(scene => scene.novelty));
  const relevance = average(scenes.map(scene => scene.relevance));
  const fatiguePenalty = detectFatigue(scenes, config).length * 5;
  return round(clamp(pace * 0.32 + novelty * 0.23 + relevance * 0.3 + clamp(energyVariance, 0, 100) * 0.15 - fatiguePenalty));
}

function detectFatigue(scenes, options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const results = [];
  for (let index = 0; index < scenes.length; index += 1) {
    const scene = scenes[index];
    const previous = scenes[index - 1];
    const lowStimulus = scene.energy < 38 && scene.motion < 38 && scene.novelty < 42;
    const repetitive = previous && Math.abs(previous.energy - scene.energy) < 8 && Math.abs(previous.motion - scene.motion) < 8;
    const longScene = scene.duration > config.fatigueWindow;
    if (lowStimulus || (repetitive && longScene)) {
      results.push({ time: round(scene.start + scene.duration / 2), sceneId: scene.id, reason: lowStimulus ? 'low_stimulus' : 'repetitive_pacing' });
    }
  }
  return results;
}

function recommendPatternInterrupt(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  const config = { ...DEFAULT_OPTIONS, ...options };
  const fatigue = detectFatigue(scenes, config);
  const recommendations = fatigue.map(item => ({
    time: item.time,
    action: 'pattern_interrupt',
    confidence: item.reason === 'low_stimulus' ? 0.88 : 0.76,
    reason: item.reason
  }));

  if (!recommendations.length && scenes.length > 2) {
    const totalEnd = Math.max(...scenes.map(scene => scene.end));
    for (let time = config.patternInterruptInterval; time < totalEnd; time += config.patternInterruptInterval) {
      recommendations.push({ time: round(time), action: 'pattern_interrupt', confidence: 0.62, reason: 'scheduled_attention_refresh' });
    }
  }
  return recommendations;
}

function predictEngagement(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  if (!scenes.length) return { score: 0, level: 'low' };
  const hook = scoreHook(scenes[0]);
  const retention = scoreRetention(scenes, options);
  const emotion = average(scenes.map(scene => scene.emotion));
  const score = round(clamp(hook * 0.38 + retention * 0.42 + emotion * 0.2));
  return { score, level: score >= 80 ? 'high' : score >= 60 ? 'medium' : 'low' };
}

function analyzeVirality(timeline, options = {}) {
  const scenes = normalizeTimeline(timeline);
  if (!scenes.length) {
    return {
      viralityScore: 0,
      hookScore: 0,
      retentionScore: 0,
      engagementPrediction: 'low',
      recommendations: [],
      diagnostics: { sceneCount: 0, duration: 0, fatiguePoints: 0 }
    };
  }

  const config = { ...DEFAULT_OPTIONS, ...options };
  const hookScore = scoreHook(scenes[0]);
  const retentionScore = scoreRetention(scenes, config);
  const engagement = predictEngagement(scenes, config);
  const interruptRecommendations = recommendPatternInterrupt(scenes, config);
  const totalDuration = Math.max(...scenes.map(scene => scene.end));
  const ctaTime = round(totalDuration * config.ctaWindowRatio);
  const recommendations = [...interruptRecommendations];

  if (!scenes.some(scene => scene.role === 'cta')) {
    recommendations.push({ time: ctaTime, action: 'cta', confidence: 0.74, reason: 'missing_cta_near_peak_window' });
  }

  recommendations.sort((a, b) => a.time - b.time || a.action.localeCompare(b.action));
  const viralityScore = round(clamp(hookScore * 0.34 + retentionScore * 0.38 + engagement.score * 0.28));

  return {
    viralityScore,
    hookScore,
    retentionScore,
    engagementPrediction: engagement.level,
    engagementScore: engagement.score,
    recommendations,
    diagnostics: {
      sceneCount: scenes.length,
      duration: round(totalDuration),
      fatiguePoints: detectFatigue(scenes, config).length,
      averageEnergy: round(average(scenes.map(scene => scene.energy)))
    }
  };
}

function average(values) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function variance(values) {
  if (!values.length) return 0;
  const mean = average(values);
  return average(values.map(value => (value - mean) ** 2));
}

module.exports = {
  analyzeVirality,
  scoreHook,
  scoreRetention,
  recommendPatternInterrupt,
  predictEngagement,
  normalizeScene,
  normalizeTimeline
};
