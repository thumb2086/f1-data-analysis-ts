import { DriverRatingFeatures, DriverRating } from './features.js';
import { minMaxScore } from '../utils.js';

const DEFAULT_WEIGHTS = {
  pace_score: 0.30,
  consistency_score: 0.20,
  start_finish_gain_score: 0.20,
  tyre_management_score: 0.15,
  position_gain_loss_score: 0.15,
};

const SCORE_COLUMNS = Object.keys(DEFAULT_WEIGHTS);

/** 將原始特徵轉成 0-100 的子分數與總分 */
export function scoreRatingFeatures(features: DriverRatingFeatures[]): DriverRating[] {
  const N = features.length;

  const paceScores = minMaxScore(features.map(f => f.pace_metric_sec), false);
  const consistencyScores = minMaxScore(features.map(f => f.lap_cv_pct), false);
  const startFinishScores = minMaxScore(features.map(f => f.start_finish_gain), true);
  const tyreMgmtScores = minMaxScore(features.map(f => f.tyre_deg_sec_per_lap), false);
  const positionScores = minMaxScore(features.map(f => f.position_net), true);

  const ratings: DriverRating[] = features.map((f, i) => ({
    ...f,
    pace_score: paceScores[i],
    consistency_score: consistencyScores[i],
    start_finish_gain_score: startFinishScores[i],
    tyre_management_score: tyreMgmtScores[i],
    position_gain_loss_score: positionScores[i],
    overall_score: 0,
    rating_rank: 0,
  }));

  // 計算總分
  for (const r of ratings) {
    r.overall_score = Math.max(0, Math.min(100,
      paceScores[ratings.indexOf(r)] * DEFAULT_WEIGHTS.pace_score +
      consistencyScores[ratings.indexOf(r)] * DEFAULT_WEIGHTS.consistency_score +
      startFinishScores[ratings.indexOf(r)] * DEFAULT_WEIGHTS.start_finish_gain_score +
      tyreMgmtScores[ratings.indexOf(r)] * DEFAULT_WEIGHTS.tyre_management_score +
      positionScores[ratings.indexOf(r)] * DEFAULT_WEIGHTS.position_gain_loss_score
    ));
  }

  // 排名
  const sorted = [...ratings].sort((a, b) => b.overall_score - a.overall_score);
  for (let i = 0; i < sorted.length; i++) {
    sorted[i].rating_rank = i + 1;
  }

  return sorted;
}