'use strict';

const STYLE_CONFIG = Object.freeze({
  energetic: { maxSnapDistance: 0.18, preferDownbeats: true, actionBias: 'impact' },
  commercial: { maxSnapDistance: 0.22, preferDownbeats: true, actionBias: 'cut' },
  smooth: { maxSnapDistance: 0.3, preferDownbeats: false, actionBias: 'transition' },
  cinematic: { maxSnapDistance: 0.4, preferDownbeats: true, actionBias: 'transition' }
});

function finite(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

function roundTime(value) {
  return Math.round(value * 1000) / 1000;
}

function normalizeBeat(beat, index = 0) {
  if (typeof beat === 'number') {
    return { id: `beat-${index + 1}`, time: Math.max(0, beat), strength: 0.5, type: 'beat', index };
  }

  const time = Math.max(0, finite(beat?.time ?? beat?.timestamp));
  return {
    id: String(beat?.id ?? `beat-${index + 1}`),
    time,
    strength: clamp(finite(beat?.strength ?? beat?.confidence, 0.5), 0, 1),
    type: String(beat?.type ?? (beat?.downbeat ? 'downbeat' : 'beat')).toLowerCase(),
    index
  };
}

function normalizeEditPoint(point, index = 0) {
  if (typeof point === 'number') {
    return { id: `edit-${index + 1}`, time: Math.max(0, point), action: 'cut', priority: 0.5, locked: false, index };
  }

  return {
    id: String(point?.id ?? `edit-${index + 1}`),
    time: Math.max(0, finite(point?.time ?? point?.timestamp ?? point?.start)),
    action: String(point?.action ?? point?.type ?? 'cut').toLowerCase(),
    priority: clamp(finite(point?.priority, 0.5), 0, 1),
    locked: Boolean(point?.locked),
    index
  };
}

function generateBeatGrid({ bpm, duration, offset = 0, beatsPerBar = 4 } = {}) {
  const normalizedBpm = finite(bpm);
  const normalizedDuration = Math.max(0, finite(duration));
  const normalizedOffset = Math.max(0, finite(offset));
  const meter = Math.max(1, Math.round(finite(beatsPerBar, 4)));

  if (normalizedBpm <= 0 || normalizedDuration <= 0 || normalizedOffset > normalizedDuration) return [];

  const interval = 60 / normalizedBpm;
  const beats = [];
  for (let time = normalizedOffset, index = 0; time <= normalizedDuration + 1e-9; time += interval, index += 1) {
    beats.push({
      id: `beat-${index + 1}`,
      time: roundTime(time),
      strength: index % meter === 0 ? 1 : 0.65,
      type: index % meter === 0 ? 'downbeat' : 'beat',
      index
    });
  }
  return beats;
}

function beatScore(editPoint, beat, config) {
  const distance = Math.abs(editPoint.time - beat.time);
  const proximity = 1 - clamp(distance / config.maxSnapDistance, 0, 1);
  const downbeatBonus = beat.type === 'downbeat' && config.preferDownbeats ? 0.18 : 0;
  const priorityBonus = editPoint.priority * 0.08;
  return clamp((proximity * 0.65) + (beat.strength * 0.2) + downbeatBonus + priorityBonus, 0, 1);
}

function actionFor(editPoint, beat, config) {
  if (editPoint.action !== 'auto') return editPoint.action;
  if (beat.type === 'downbeat' && config.actionBias === 'impact') return 'impact';
  return config.actionBias;
}

function snapEditPoints(editPoints, beats, options = {}) {
  const style = String(options.style ?? 'commercial').toLowerCase();
  const config = { ...STYLE_CONFIG.commercial, ...(STYLE_CONFIG[style] || {}), ...options };
  const normalizedBeats = (Array.isArray(beats) ? beats : []).map(normalizeBeat).sort((a, b) => a.time - b.time || a.index - b.index);
  const points = (Array.isArray(editPoints) ? editPoints : []).map(normalizeEditPoint);

  if (!points.length) return [];

  return points.map((point) => {
    if (point.locked || !normalizedBeats.length) {
      return { ...point, originalTime: point.time, snapTime: point.time, offset: 0, confidence: point.locked ? 1 : 0, beat: null, reason: point.locked ? 'edit point is locked' : 'no beat data available' };
    }

    const candidates = normalizedBeats
      .map((beat) => ({ beat, distance: Math.abs(point.time - beat.time), score: beatScore(point, beat, config) }))
      .filter((candidate) => candidate.distance <= config.maxSnapDistance)
      .sort((a, b) => b.score - a.score || a.distance - b.distance || a.beat.time - b.beat.time);

    const best = candidates[0];
    if (!best) {
      return { ...point, originalTime: point.time, snapTime: point.time, offset: 0, confidence: 0, beat: null, reason: 'no beat inside snap window' };
    }

    return {
      ...point,
      action: actionFor(point, best.beat, config),
      originalTime: point.time,
      snapTime: best.beat.time,
      offset: roundTime(best.beat.time - point.time),
      confidence: roundTime(best.score),
      beat: best.beat,
      reason: `snapped to nearest ${best.beat.type}`
    };
  });
}

function synchronizeToMusic(editPoints, music = {}, options = {}) {
  const suppliedBeats = Array.isArray(music.beats) ? music.beats : [];
  const beats = suppliedBeats.length ? suppliedBeats.map(normalizeBeat) : generateBeatGrid(music);
  const synchronized = snapEditPoints(editPoints, beats, options);
  const snappedCount = synchronized.filter((item) => item.beat).length;

  return {
    bpm: finite(music.bpm, null),
    style: String(options.style ?? 'commercial').toLowerCase(),
    beats,
    edits: synchronized,
    diagnostics: {
      beatCount: beats.length,
      editCount: synchronized.length,
      snappedCount,
      snapRate: synchronized.length ? roundTime(snappedCount / synchronized.length) : 0
    }
  };
}

module.exports = {
  STYLE_CONFIG,
  normalizeBeat,
  normalizeEditPoint,
  generateBeatGrid,
  snapEditPoints,
  synchronizeToMusic
};
