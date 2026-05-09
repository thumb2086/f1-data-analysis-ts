import { loadLaps, loadResults } from '../data_loader.js';

export interface DriverRatingFeatures {
  driver: string;
  full_name: string;
  team_name: string;
  grid_position: number;
  finish_position: number;
  avg_lap_sec: number;
  best_lap_sec: number;
  lap_cv_pct: number;
  pace_metric_sec: number;
  start_finish_gain: number;
  position_net: number;
  tyre_deg_sec_per_lap: number;
  laps_completed: number;
  points: number;
  status: string;
}

export interface DriverRating extends DriverRatingFeatures {
  pace_score: number;
  consistency_score: number;
  start_finish_gain_score: number;
  tyre_management_score: number;
  position_gain_loss_score: number;
  overall_score: number;
  rating_rank: number;
}

/** 萃取每位車手的評分特徵 */
export function getDriverRatingFeatures(accurateOnly: boolean = true): DriverRatingFeatures[] {
  const results = loadResults();
  const laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();

  return results.map(r => {
    const drLaps = laps.filter(l => l.Driver === r.Abbreviation);
    const lapTimes = drLaps.map(l => l.LapTime).filter(t => !isNaN(t));

    const avgLap = lapTimes.length > 0 ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : NaN;
    const bestLap = lapTimes.length > 0 ? Math.min(...lapTimes) : NaN;
    const stdLap = lapTimes.length > 1
      ? Math.sqrt(lapTimes.reduce((s, t) => s + (t - avgLap) ** 2, 0) / lapTimes.length)
      : NaN;
    const cv = avgLap > 0 ? stdLap / avgLap * 100 : NaN;
    const paceMetric = avgLap && bestLap ? 0.7 * avgLap + 0.3 * bestLap : NaN;

    const startFinishGain = (r.GridPosition || NaN) - (r.Position || NaN);

    // 輪胎衰退
    let tyreDeg = NaN;
    const cleanForDeg = drLaps.filter(l => !isNaN(l.TyreLife) && !isNaN(l.LapTime));
    if (cleanForDeg.length >= 4) {
      const n = cleanForDeg.length;
      const x = cleanForDeg.map(l => l.TyreLife);
      const y = cleanForDeg.map(l => l.LapTime);
      const sumX = x.reduce((a, b) => a + b, 0);
      const sumY = y.reduce((a, b) => a + b, 0);
      const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
      const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
      const denom = n * sumX2 - sumX * sumX;
      if (Math.abs(denom) > 1e-9) tyreDeg = (n * sumXY - sumX * sumY) / denom;
    }

    // 賽中位置變化
    let posNet = NaN;
    const positions = drLaps.map(l => l.Position).filter(p => !isNaN(p));
    if (positions.length > 1) {
      let net = 0;
      for (let i = 1; i < positions.length; i++) net += positions[i - 1] - positions[i];
      posNet = net;
    }

    return {
      driver: r.Abbreviation,
      full_name: r.FullName,
      team_name: r.TeamName,
      grid_position: r.GridPosition || NaN,
      finish_position: r.Position || NaN,
      avg_lap_sec: avgLap,
      best_lap_sec: bestLap,
      lap_cv_pct: cv,
      pace_metric_sec: paceMetric,
      start_finish_gain: startFinishGain,
      position_net: posNet,
      tyre_deg_sec_per_lap: tyreDeg,
      laps_completed: r.Laps || NaN,
      points: r.Points || NaN,
      status: r.Status || '',
    };
  }).sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));
}