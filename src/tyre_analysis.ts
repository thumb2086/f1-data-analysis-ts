import { loadLaps, loadStints, loadResults } from './data_loader.js';

/** 每位車手的輪胎策略摘要 */
export function getTyreStrategy(): Record<string, any>[] {
  const stints = loadStints();
  const results = loadResults();
  const resultMap = new Map(results.map(r => [r.DriverNumber, r]));
  const groups = new Map<number, any[]>();
  for (const s of stints) {
    if (!groups.has(s.driver_number)) groups.set(s.driver_number, []);
    groups.get(s.driver_number)!.push(s);
  }
  const rows: Record<string, any>[] = [];
  for (const [drvNum, stintsForDriver] of groups) {
    stintsForDriver.sort((a, b) => a.stint_number - b.stint_number);
    const compounds = stintsForDriver.map(s => s.compound);
    const stintLaps = stintsForDriver.map(s => s.lap_end - s.lap_start + 1);
    const totalLaps = stintLaps.reduce((a, b) => a + b, 0);
    const nStops = stintsForDriver.length - 1;
    const drvInfo = resultMap.get(drvNum);
    const abb = drvInfo?.Abbreviation || `#${drvNum}`;
    const finalPos = drvInfo?.Position || null;
    const strategy = stintsForDriver.map((s, i) => `${s.compound}(${stintLaps[i]})`).join(' -> ');
    rows.push({
      driver: abb,
      driver_number: drvNum,
      n_stops: nStops,
      stops_label: `${nStops}-stop`,
      compounds: compounds.join(' -> '),
      stint_laps: stintLaps,
      total_laps: totalLaps,
      strategy,
      final_position: finalPos,
    });
  }
  return rows.sort((a, b) => (a.final_position || 999) - (b.final_position || 999));
}

/** 輪胎衰退率（線性迴歸每圈衰退秒數） */
export function getTyreDegradation(compound?: string): Record<string, any>[] {
  let laps = loadLaps().filter(l => l.IsAccurate);
  if (compound) laps = laps.filter(l => l.Compound === compound);
  const results: Record<string, any>[] = [];
  const groups = new Map<string, LapGroupKey>();
  for (const lap of laps) {
    const key = `${lap.Driver}|${lap.Stint}|${lap.Compound}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lap);
  }
  for (const [key, group] of groups) {
    if (group.length < 4) continue;
    const x = group.map(l => l.TyreLife);
    const y = group.map(l => l.LapTime);
    const n = x.length;
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0);
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0);
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-9) continue;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const [driver, stint, comp] = key.split('|');
    results.push({ driver, stint: parseInt(stint), compound: comp, deg_sec_per_lap: slope });
  }
  return results;
}

interface LapGroupKey extends Array<any> {}

/** 不同輪胎配方圈速比較 */
export function getCompoundComparison(): Record<string, any>[] {
  const laps = loadLaps().filter(l => l.IsAccurate);
  const groups = new Map<string, number[]>();
  for (const lap of laps) {
    const key = `${lap.Driver}|${lap.Compound}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(lap.LapTime);
  }
  const results: Record<string, any>[] = [];
  for (const [key, times] of groups) {
    const [driver, compound] = key.split('|');
    const valid = times.filter(t => !isNaN(t));
    if (valid.length === 0) continue;
    const mean = valid.reduce((a, b) => a + b, 0) / valid.length;
    const median = valid.sort((a, b) => a - b)[Math.floor(valid.length / 2)];
    results.push({ driver, compound, avg_lap_time: mean, median_lap_time: median, laps: valid.length });
  }
  return results.sort((a, b) => a.avg_lap_time - b.avg_lap_time);
}