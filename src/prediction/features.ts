import { loadLaps, loadResults, loadStints } from '../data_loader.js';
import { DriverPredictionFeatures } from './types.js';

/** 萃取每位車手的預測用特徵 */
export function getDriverPredictionFeatures(accurateOnly: boolean = true): DriverPredictionFeatures[] {
  const results = loadResults();
  const laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();
  const stints = loadStints();

  return results.map(r => {
    const drLaps = laps.filter(l => l.Driver === r.Abbreviation);
    const drStints = stints.filter(s => s.driver_number === r.DriverNumber);

    const lapTimes = drLaps.map(l => l.LapTime).filter(t => !isNaN(t));
    const avgLap = lapTimes.length > 0 ? lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length : NaN;
    const bestLap = lapTimes.length > 0 ? Math.min(...lapTimes) : NaN;
    const stdLap = lapTimes.length > 1
      ? Math.sqrt(lapTimes.reduce((s, t) => s + (t - avgLap) ** 2, 0) / lapTimes.length)
      : NaN;
    const cv = avgLap > 0 ? stdLap / avgLap * 100 : NaN;
    const paceMetric = avgLap && bestLap ? 0.7 * avgLap + 0.3 * bestLap : NaN;

    const stintCount = drStints.length;
    const maxStintLaps = drStints.length > 0 ? Math.max(...drStints.map(s => s.lap_end - s.lap_start + 1)) : NaN;
    const hardStints = drStints.filter(s => s.compound === 'HARD').length;
    const hardStintShare = drStints.length > 0 ? hardStints / drStints.length : NaN;

    // 輪胎衰退
    let tyreDeg = NaN;
    if (drLaps.length >= 4) {
      const clean = drLaps.filter(l => !isNaN(l.TyreLife) && !isNaN(l.LapTime));
      if (clean.length >= 4) {
        const n = clean.length;
        const x = clean.map(l => l.TyreLife);
        const y = clean.map(l => l.LapTime);
        const sumX = x.reduce((a, b) => a + b, 0);
        const sumY = y.reduce((a, b) => a + b, 0);
        const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
        const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
        const denom = n * sumX2 - sumX * sumX;
        if (Math.abs(denom) > 1e-9) {
          tyreDeg = (n * sumXY - sumX * sumY) / denom;
        }
      }
    }

    // team grid mean
    const teamResults = results.filter(tr => tr.TeamName === r.TeamName);
    const teamGridMean = teamResults.length > 0
      ? teamResults.map(tr => tr.GridPosition).reduce((a, b) => a + b, 0) / teamResults.length
      : NaN;

    // position net
    let posNet = NaN;
    if (drLaps.length > 1) {
      const positions = drLaps.map(l => l.Position).filter(p => !isNaN(p));
      let gain = 0;
      for (let i = 1; i < positions.length; i++) {
        const delta = positions[i - 1] - positions[i];
        if (delta > 0) gain += delta;
        else if (delta < 0) gain += delta;
      }
      posNet = gain;
    }

    const startFinishGain = (r.GridPosition || NaN) - (r.Position || NaN);

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
      tyre_deg_sec_per_lap: tyreDeg,
      start_finish_gain: startFinishGain,
      stint_count: stintCount,
      max_stint_laps: maxStintLaps,
      hard_stint_share: hardStintShare,
      position_net: posNet,
      team_grid_mean: teamGridMean,
      laps_completed: r.Laps || NaN,
      points: r.Points || NaN,
      status: r.Status || '',
    };
  }).sort((a, b) => (a.finish_position || 999) - (b.finish_position || 999));
}