import { loadLaps, loadResults, loadWeather, loadStints, loadTelemetry, getRaceInfo } from '../src/data_loader.js';
import { getFastestLaps, getDriverLapTimes, getAllDriversConsistency } from '../src/lap_analysis.js';
import { getTyreStrategy } from '../src/tyre_analysis.js';
import { getFinalStandings, getPositionChangeSummary, getTeamStandings } from '../src/race_analysis.js';
import { getWeatherSummary } from '../src/weather_analysis.js';
import { getThrottleBrakeAnalysis } from '../src/telemetry_analysis.js';
import { buildPredictionTable } from '../src/prediction/baseline.js';
import { buildRatingLeaderboard } from '../src/rating/index.js';

const tests: { name: string; fn: () => boolean }[] = [
  { name: 'data_loader.loadLaps', fn: () => { const d = loadLaps(); return d.length > 0; } },
  { name: 'data_loader.loadResults', fn: () => { const d = loadResults(); return d.length > 0; } },
  { name: 'data_loader.loadWeather', fn: () => { const d = loadWeather(); return d.length > 0; } },
  { name: 'data_loader.loadStints', fn: () => { const d = loadStints(); return d.length > 0; } },
  { name: 'data_loader.loadTelemetry', fn: () => { const d = loadTelemetry(); return d.length > 0; } },
  { name: 'data_loader.getRaceInfo', fn: () => { const i = getRaceInfo(); return i.drivers > 0; } },
  { name: 'lap_analysis.getFastestLaps', fn: () => getFastestLaps().length > 0 },
  { name: 'lap_analysis.getDriverLapTimes', fn: () => getDriverLapTimes('VER').length > 0 },
  { name: 'lap_analysis.getAllDriversConsistency', fn: () => getAllDriversConsistency().length > 0 },
  { name: 'tyre_analysis.getTyreStrategy', fn: () => getTyreStrategy().length > 0 },
  { name: 'race_analysis.getFinalStandings', fn: () => getFinalStandings().length > 0 },
  { name: 'race_analysis.getPositionChangeSummary', fn: () => getPositionChangeSummary().length > 0 },
  { name: 'race_analysis.getTeamStandings', fn: () => getTeamStandings().length > 0 },
  { name: 'weather_analysis.getWeatherSummary', fn: () => getWeatherSummary().records_count > 0 },
  { name: 'telemetry_analysis.getThrottleBrakeAnalysis', fn: () => getThrottleBrakeAnalysis().total_points > 0 },
  { name: 'prediction.buildPredictionTable', fn: () => buildPredictionTable().length > 0 },
  { name: 'rating.buildRatingLeaderboard', fn: () => buildRatingLeaderboard().length > 0 },
];

let passed = 0;
let failed = 0;

console.log('='.repeat(50));
console.log('  F1-Monza-2024-TS Smoke Test');
console.log('='.repeat(50));

for (const test of tests) {
  try {
    const ok = test.fn();
    if (ok) {
      console.log(`  ✅ ${test.name}`);
      passed++;
    } else {
      console.log(`  ❌ ${test.name} (returned falsy)`);
      failed++;
    }
  } catch (err: any) {
    console.log(`  ❌ ${test.name} (${err.message})`);
    failed++;
  }
}

console.log('='.repeat(50));
console.log(`  Result: ${passed} passed, ${failed} failed / ${tests.length} total`);
console.log('='.repeat(50));
process.exit(failed > 0 ? 1 : 0);