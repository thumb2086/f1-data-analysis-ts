import { loadLaps, loadResults } from './data_loader.js';

/** 最終排名 */
export function getFinalStandings(): Record<string, any>[] {
  const results = loadResults();
  return results
    .sort((a, b) => (a.Position || 999) - (b.Position || 999))
    .map(r => ({
      Position: r.Position,
      Abbreviation: r.Abbreviation,
      FullName: r.FullName,
      TeamName: r.TeamName,
      GridPosition: r.GridPosition,
      Points: r.Points,
      Laps: r.Laps,
      Status: r.Status,
    }));
}

/** 起跑 vs 最終排名變化（得失位分析） */
export function getPositionChangeSummary(): Record<string, any>[] {
  const results = loadResults();
  return results
    .map(r => {
      const change = r.GridPosition - r.Position;
      return {
        Abbreviation: r.Abbreviation,
        FullName: r.FullName,
        TeamName: r.TeamName,
        GridPosition: r.GridPosition,
        Position: r.Position,
        position_change: change,
        change_label: change > 0 ? `+${change}` : change < 0 ? `${change}` : '0',
        gained_positions: change > 0,
        Points: r.Points,
      };
    })
    .sort((a, b) => b.position_change - a.position_change);
}

/** 每圈位置變化 */
export function getPositionEvolution(drivers?: string[]): Record<string, any>[] {
  let laps = loadLaps().filter(l => l.IsAccurate);
  if (drivers && drivers.length > 0) laps = laps.filter(l => drivers.includes(l.Driver));
  return laps
    .map(l => ({ LapNumber: l.LapNumber, Driver: l.Driver, Position: l.Position, Team: l.Team }))
    .sort((a, b) => a.Driver.localeCompare(b.Driver) || a.LapNumber - b.LapNumber);
}

/** Speed Trap 最快速度 */
export function getTopSpeedTrap(): Record<string, any>[] {
  const laps = loadLaps().filter(l => l.IsAccurate);
  const grouped = new Map<string, typeof laps>();
  for (const lap of laps) {
    if (!grouped.has(lap.Driver)) grouped.set(lap.Driver, []);
    grouped.get(lap.Driver)!.push(lap);
  }
  const results: Record<string, any>[] = [];
  for (const [driver, drLaps] of grouped) {
    const fastest = drLaps.reduce((a, b) => (a.SpeedST || 0) > (b.SpeedST || 0) ? a : b);
    results.push({
      Driver: driver,
      Team: fastest.Team,
      SpeedST: fastest.SpeedST,
      LapNumber: fastest.LapNumber,
      Compound: fastest.Compound,
      TyreLife: fastest.TyreLife,
    });
  }
  return results.sort((a, b) => (b.SpeedST || 0) - (a.SpeedST || 0));
}

/** 冠軍統計 */
export function getRaceWinnerStats(): Record<string, any> {
  const results = loadResults();
  const laps = loadLaps();
  const winner = results.find(r => r.Position === 1);
  if (!winner) return {};
  const winnerCode = winner.Abbreviation;
  const winnerLaps = laps.filter(l => l.Driver === winnerCode && l.IsAccurate);
  const ledLaps = laps.filter(l => l.Driver === winnerCode && l.Position === 1).length;
  return {
    driver: winnerCode,
    full_name: winner.FullName,
    team: winner.TeamName,
    grid: winner.GridPosition,
    points: winner.Points,
    laps_completed: winner.Laps,
    avg_laptime_seconds: winnerLaps.reduce((s, l) => s + l.LapTime, 0) / winnerLaps.length,
    fastest_lap_seconds: Math.min(...winnerLaps.map(l => l.LapTime)),
    led_laps: ledLaps,
  };
}

/** 車隊積分 */
export function getTeamStandings(): Record<string, any>[] {
  const results = loadResults();
  const teams = new Map<string, { total_points: number; drivers: string[]; best_pos: number }>();
  for (const r of results) {
    if (!teams.has(r.TeamName)) teams.set(r.TeamName, { total_points: 0, drivers: [], best_pos: 999 });
    const t = teams.get(r.TeamName)!;
    t.total_points += r.Points || 0;
    t.drivers.push(r.Abbreviation);
    if (r.Position && r.Position < t.best_pos) t.best_pos = r.Position;
  }
  return [...teams.entries()]
    .map(([name, data]) => ({
      TeamName: name,
      total_points: data.total_points,
      drivers: data.drivers.join(' / '),
      best_position: data.best_pos,
    }))
    .sort((a, b) => b.total_points - a.total_points);
}