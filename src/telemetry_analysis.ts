import { loadTelemetry } from './data_loader.js';

/** 速度 vs 距離曲線 */
export function getSpeedProfile(driver: string = 'VER'): Record<string, any>[] {
  return loadTelemetry(driver).map(t => ({
    Distance: t.Distance,
    Speed: t.Speed,
    RelativeDistance: t.RelativeDistance,
    RPM: t.RPM,
    nGear: t.nGear,
    Throttle: t.Throttle,
    Brake: t.Brake,
    DRS: t.DRS,
  }));
}

/** 油門與煞車使用分析 */
export function getThrottleBrakeAnalysis(driver: string = 'VER'): Record<string, any> {
  const data = loadTelemetry(driver);
  const totalPoints = data.length || 1;
  const fullThrottle = data.filter(t => t.Throttle >= 95).length;
  const braking = data.filter(t => t.Brake).length;
  const coasting = data.filter(t => (t.Throttle ?? 0) < 5 && !t.Brake).length;
  const drsActive = data.filter(t => t.DRS >= 10).length;

  // 找煞車點
  const brakePoints: { distance: number; speed: number; gear: number }[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].Brake && !data[i - 1].Brake) {
      brakePoints.push({
        distance: data[i].Distance,
        speed: data[i].Speed,
        gear: data[i].nGear,
      });
    }
  }

  const speeds = data.map(t => t.Speed).filter(s => !isNaN(s));
  const rpms = data.map(t => t.RPM).filter(r => !isNaN(r));

  return {
    driver,
    total_points: totalPoints,
    full_throttle_pct: (fullThrottle / totalPoints) * 100,
    braking_pct: (braking / totalPoints) * 100,
    coasting_pct: (coasting / totalPoints) * 100,
    drs_active_pct: (drsActive / totalPoints) * 100,
    avg_speed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
    max_speed: Math.max(...speeds),
    avg_rpm: rpms.reduce((a, b) => a + b, 0) / rpms.length,
    max_rpm: Math.max(...rpms),
    brake_points: brakePoints.length,
  };
}

/** 各檔位使用時間佔比 */
export function getGearTimeDistribution(driver: string = 'VER'): Record<string, any> {
  const data = loadTelemetry(driver);
  const total = data.length;
  const gearCounts = new Map<number, number>();
  for (const t of data) {
    const g = Math.round(t.nGear);
    gearCounts.set(g, (gearCounts.get(g) || 0) + 1);
  }
  const distribution: Record<string, { count: number; pct: number }> = {};
  for (const [gear, count] of gearCounts) {
    distribution[String(gear)] = {
      count,
      pct: (count / total) * 100,
    };
  }
  return { driver, total_points: total, gear_distribution: distribution };
}

/** 迷你區段速度分析 */
export function getMinisectorSpeed(driver: string = 'VER', nSectors: number = 20): Record<string, any>[] {
  const data = loadTelemetry(driver);
  const maxDist = Math.max(...data.map(t => t.RelativeDistance).filter(d => !isNaN(d)));
  const binSize = maxDist / nSectors;
  const sectors = new Map<number, { speeds: number[]; throttles: number[]; rpms: number[] }>();
  for (const t of data) {
    const bin = Math.min(Math.floor((t.RelativeDistance || 0) / binSize), nSectors - 1);
    if (!sectors.has(bin)) sectors.set(bin, { speeds: [], throttles: [], rpms: [] });
    const s = sectors.get(bin)!;
    if (!isNaN(t.Speed)) s.speeds.push(t.Speed);
    if (!isNaN(t.Throttle)) s.throttles.push(t.Throttle);
    if (!isNaN(t.RPM)) s.rpms.push(t.RPM);
  }
  const results: Record<string, any>[] = [];
  for (let i = 0; i < nSectors; i++) {
    const s = sectors.get(i);
    if (!s || s.speeds.length === 0) continue;
    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
    results.push({
      sector: i,
      avg_speed: avg(s.speeds),
      max_speed: Math.max(...s.speeds),
      min_speed: Math.min(...s.speeds),
      avg_throttle: avg(s.throttles),
      avg_rpm: avg(s.rpms),
    });
  }
  return results;
}