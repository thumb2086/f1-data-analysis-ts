import { getRaceInfo } from '../data_loader.js';
import { getFinalStandings, getPositionChangeSummary } from '../race_analysis.js';
import { getFastestLaps } from '../lap_analysis.js';
import { getTyreStrategy } from '../tyre_analysis.js';
import { getWeatherSummary } from '../weather_analysis.js';
import { getThrottleBrakeAnalysis } from '../telemetry_analysis.js';
import { dataframeToMarkdown } from '../utils.js';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const DEFAULT_OUTPUT_DIR = join(PROJECT_ROOT, 'outputs', 'reports');

export function buildRaceReport(driver: string = 'VER'): Record<string, any> {
  const ri = getRaceInfo();
  return {
    report_title: '2024 Italian Grand Prix - Monza',
    summary: {
      winner: ri.winner,
      winner_team: ri.winner_team,
      total_laps: ri.total_laps,
      drivers: ri.drivers,
      finishers: ri.finishers,
      weather_rain: ri.weather.rain,
      temp_min: ri.weather.temp_min,
      temp_max: ri.weather.temp_max,
      track_temp_min: ri.weather.track_temp_min,
      track_temp_max: ri.weather.track_temp_max,
    },
    race_info: ri,
    standings: getFinalStandings(),
    position_changes: getPositionChangeSummary(),
    fastest_laps: getFastestLaps(),
    tyre_strategy: getTyreStrategy(),
    weather_summary: getWeatherSummary(),
    telemetry_summary: getThrottleBrakeAnalysis(driver),
  };
}

export function generateRaceReport(outputDir?: string, driver: string = 'VER'): string {
  const outDir = outputDir || DEFAULT_OUTPUT_DIR;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
  const report = buildRaceReport(driver);
  const s = report.summary;

  const md = [
    `# ${report.report_title}\n`,
    '## Race Summary',
    `- Winner: ${s.winner} (${s.winner_team})`,
    `- Total Laps: ${s.total_laps}`,
    `- Drivers: ${s.drivers}, Finishers: ${s.finishers}`,
    `- Weather: Rain=${s.weather_rain}, Temp ${s.temp_min}-${s.temp_max}°C`,
    `- Track Temp: ${s.track_temp_min}-${s.track_temp_max}°C\n`,
    '## Final Standings',
    dataframeToMarkdown(report.standings.map((r: any) => ({
      Pos: r.Position, Driver: r.Abbreviation, Team: r.TeamName, Grid: r.GridPosition, Points: r.Points,
    }))),
    '\n## Position Changes',
    dataframeToMarkdown(report.position_changes.map((r: any) => ({
      Driver: r.Abbreviation, Grid: r.GridPosition, Finish: r.Position, Change: r.change_label,
    }))),
    '\n## Fastest Laps',
    dataframeToMarkdown(report.fastest_laps.map((r: any) => ({
      Driver: r.Driver, Time: r.LapTimeSeconds.toFixed(3), Lap: r.LapNumber, Compound: r.Compound,
    }))),
    '\n## Tyre Strategy',
    dataframeToMarkdown(report.tyre_strategy.map((r: any) => ({
      Driver: r.driver, Stops: r.stops_label, Compounds: r.compounds,
    }))),
    '\n## Weather',
    `- Air Temp: ${report.weather_summary.air_temp.min}~${report.weather_summary.air_temp.max}°C (avg ${report.weather_summary.air_temp.avg.toFixed(1)})`,
    `- Track Temp: ${report.weather_summary.track_temp.min}~${report.weather_summary.track_temp.max}°C`,
    `- Humidity: ${report.weather_summary.humidity.min}~${report.weather_summary.humidity.max}%`,
    `- Rainfall: ${report.weather_summary.rainfall}\n`,
    '## Telemetry',
    `- Full throttle: ${report.telemetry_summary.full_throttle_pct.toFixed(1)}%`,
    `- Braking: ${report.telemetry_summary.braking_pct.toFixed(1)}%`,
    `- Avg Speed: ${report.telemetry_summary.avg_speed.toFixed(1)} km/h`,
    `- Max Speed: ${report.telemetry_summary.max_speed.toFixed(1)} km/h`,
    `- Brake Points: ${report.telemetry_summary.brake_points}`,
  ].join('\n');

  const mdPath = join(outDir, '2024_italian_gp.md');
  writeFileSync(mdPath, md, 'utf-8');
  console.log(`✅ Report: ${mdPath}`);
  return mdPath;
}

if (process.argv[1]?.endsWith('report_builder.js') || process.argv[1]?.endsWith('report_builder.ts')) {
  generateRaceReport();
}