import { loadLaps, loadResults, Lap } from './data_loader.js';

/** 每位車手最快圈速 */
export function getFastestLaps(accurateOnly: boolean = true): Record<string, any>[] {
  const laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();
  const grouped = new Map<string, Lap[]>();
  for (const lap of laps) {
    if (!grouped.has(lap.Driver)) grouped.set(lap.Driver, []);
    grouped.get(lap.Driver)!.push(lap);
  }
  const results: Record<string, any>[] = [];
  for (const [driver, drLaps] of grouped) {
    const fastest = drLaps.reduce((a, b) => a.LapTime < b.LapTime ? a : b);
    results.push({
      Driver: driver,
      Team: fastest.Team,
      LapTime: fastest.LapTime,
      LapTimeSeconds: fastest.LapTime,
      LapNumber: fastest.LapNumber,
      Compound: fastest.Compound,
      TyreLife: fastest.TyreLife,
      Position: fastest.Position,
    });
  }
  return results.sort((a, b) => a.LapTimeSeconds - b.LapTimeSeconds);
}

/** 某位車手的所有圈速 */
export function getDriverLapTimes(driver: string, accurateOnly: boolean = true): Record<string, any>[] {
  const laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();
  return laps
    .filter(l => l.Driver === driver)
    .map(l => ({
      LapNumber: l.LapNumber,
      LapTime: l.LapTime,
      LapTimeSeconds: l.LapTime,
      Compound: l.Compound,
      TyreLife: l.TyreLife,
      Position: l.Position,
      IsPersonalBest: l.IsPersonalBest,
    }))
    .sort((a, b) => a.LapNumber - b.LapNumber);
}

/** 多位車手的圈速演進比較 */
export function getLapTimeEvolution(drivers?: string[], accurateOnly: boolean = true): Record<string, any>[] {
  let laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();
  if (drivers && drivers.length > 0) laps = laps.filter(l => drivers.includes(l.Driver));
  return laps
    .map(l => ({
      LapNumber: l.LapNumber,
      Driver: l.Driver,
      Team: l.Team,
      LapTime: l.LapTime,
      LapTimeSeconds: l.LapTime,
      Compound: l.Compound,
      TyreLife: l.TyreLife,
      Position: l.Position,
    }))
    .sort((a, b) => a.Driver.localeCompare(b.Driver) || a.LapNumber - b.LapNumber);
}

/** 圈速一致性（標準差、CV） */
export function getLapConsistency(driver: string, accurateOnly: boolean = true): Record<string, any> {
  const laps = getDriverLapTimes(driver, accurateOnly);
  const times = laps.map(l => l.LapTimeSeconds).filter(t => !isNaN(t));
  if (times.length === 0) {
    return { driver, mean: null, std: null, cv: null, min: null, max: null, lapsCount: 0 };
  }
  const mean = times.reduce((a, b) => a + b, 0) / times.length;
  const std = Math.sqrt(times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length);
  return {
    driver,
    mean,
    std,
    cv: mean > 0 ? std / mean * 100 : 0,
    min: Math.min(...times),
    max: Math.max(...times),
    lapsCount: times.length,
  };
}

/** 所有車手一致性 */
export function getAllDriversConsistency(accurateOnly: boolean = true): Record<string, any>[] {
  const laps = accurateOnly ? loadLaps().filter(l => l.IsAccurate) : loadLaps();
  const drivers = [...new Set(laps.map(l => l.Driver))];
  return drivers.map(d => getLapConsistency(d, accurateOnly));
}