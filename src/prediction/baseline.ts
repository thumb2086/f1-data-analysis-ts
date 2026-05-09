import { DriverPredictionFeatures, PredictionOutput } from './types.js';
import { getDriverPredictionFeatures } from './features.js';

/** 規則為主的預測 baseline */
function minMax(values: number[], higherIsBetter: boolean = true): number[] {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return values.map(() => 50);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (Math.abs(max - min) < 1e-9) return values.map(() => 50);
  return values.map(v => {
    if (isNaN(v)) return 50;
    const s = higherIsBetter ? (v - min) / (max - min) * 100 : (max - v) / (max - min) * 100;
    return Math.max(0, Math.min(100, s));
  });
}

function safeRank(values: number[], ascending: boolean = true): number[] {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return values.map(() => NaN);
  const sorted = [...valid].sort((a, b) => ascending ? a - b : b - a);
  return values.map(v => (isNaN(v) ? NaN : sorted.indexOf(v) + 1));
}

function gainBand(gain: number): string {
  if (isNaN(gain)) return 'Unknown';
  if (gain >= 5) return 'Gain 5+';
  if (gain >= 1) return 'Gain 1-4';
  if (gain <= -5) return 'Loss 5+';
  if (gain <= -1) return 'Loss 1-4';
  return 'Hold';
}

function strategyLabel(
  stintCount: number, maxStintLaps: number, hardStintShare: number, tyreDeg: number,
): [string, number] {
  if (isNaN(stintCount)) return ['Unknown', 0];
  if (stintCount <= 2) {
    let conf = 0.65;
    if (!isNaN(maxStintLaps) && maxStintLaps >= 24) conf += 0.20;
    else conf += 0.05;
    if (!isNaN(hardStintShare) && hardStintShare >= 0.25) conf += 0.15;
    else conf += 0.05;
    if (!isNaN(tyreDeg) && tyreDeg <= 0.045) conf += 0.05;
    return ['One-stop', Math.min(conf, 1.0)];
  }
  let conf = 0.65;
  if (!isNaN(maxStintLaps) && maxStintLaps < 24) conf += 0.20;
  else conf += 0.08;
  if (stintCount >= 3) conf += 0.10;
  return ['Two-stop', Math.min(conf, 1.0)];
}

function classifyRank(rank: number): 'Top 3' | 'Top 10' | 'DNF' {
  if (isNaN(rank)) return 'DNF';
  if (rank <= 3) return 'Top 3';
  if (rank <= 10) return 'Top 10';
  return 'DNF';
}

export function predictDriverBaseline(features: DriverPredictionFeatures[]): PredictionOutput[] {
  const N = features.length;
  const gridScores = minMax(features.map(f => f.grid_position), false);
  const paceScores = minMax(features.map(f => f.avg_lap_sec), false);
  const consistencyScores = minMax(features.map(f => f.lap_cv_pct), false);
  const degScores = minMax(features.map(f => f.tyre_deg_sec_per_lap), false);
  const teamScores = minMax(features.map(f => f.team_grid_mean), false);
  const stintScores = minMax(features.map(f => f.stint_count), false);

  const GRID_W = 0.34, PACE_W = 0.32, CONS_W = 0.16, DEG_W = 0.10, TEAM_W = 0.08;
  const finishScores = features.map((_, i) =>
    gridScores[i] * GRID_W + paceScores[i] * PACE_W +
    consistencyScores[i] * CONS_W + degScores[i] * DEG_W +
    teamScores[i] * TEAM_W
  );

  const ranks = safeRank(finishScores.map(s => -s));

  return features.map((f, i) => {
    const rank = ranks[i];
    const resultClass = classifyRank(rank);
    const gain = f.grid_position - rank;
    const [strat, stratConf] = strategyLabel(f.stint_count, f.max_stint_laps, f.hard_stint_share, f.tyre_deg_sec_per_lap);
    const resConf = Math.min(finishScores[i] / 100, 1.0);

    return {
      driver: f.driver,
      full_name: f.full_name,
      team_name: f.team_name,
      grid_position: f.grid_position,
      finish_score: Math.round(finishScores[i] * 1000) / 1000,
      predicted_finish_rank: isNaN(rank) ? NaN : rank,
      predicted_result_class: resultClass,
      predicted_gain: Math.round(gain * 1000) / 1000,
      predicted_gain_band: gainBand(gain),
      predicted_strategy: strat,
      strategy_confidence: Math.round(stratConf * 1000) / 1000,
      result_confidence: Math.round(resConf * 1000) / 1000,
      predicted_result_explanation:
        `Grid ${f.grid_position || '-'} + pace ${Math.round(paceScores[i])}/100` +
        ` + consistency ${Math.round(consistencyScores[i])}/100` +
        ` -> rank ${isNaN(rank) ? '-' : rank}`,
      predicted_strategy_explanation:
        `${f.stint_count || '-'} stints, longest ${f.max_stint_laps || '-'} laps, hard ${(f.hard_stint_share * 100).toFixed(0)}%`,
    };
  }).sort((a, b) => (a.predicted_finish_rank || 999) - (b.predicted_finish_rank || 999));
}

export function buildPredictionTable(accurateOnly: boolean = true): PredictionOutput[] {
  const features = getDriverPredictionFeatures(accurateOnly);
  return predictDriverBaseline(features);
}