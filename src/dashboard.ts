import { getRaceInfo } from './data_loader.js';
import { getFinalStandings } from './race_analysis.js';
import { getFastestLaps } from './lap_analysis.js';
import { getWeatherSummary } from './weather_analysis.js';
import { getThrottleBrakeAnalysis } from './telemetry_analysis.js';

export function main() {
  console.log('='.repeat(60));
  console.log('  F1 Monza 2024 整合儀表板 (TypeScript CLI)');
  console.log('='.repeat(60));

  const info = getRaceInfo();
  console.log(`\n📋 賽事: ${info.event} @ ${info.circuit}`);
  console.log(`   冠軍: ${info.winner} (${info.winner_team})`);
  console.log(`   總圈數: ${info.total_laps} | 車手: ${info.drivers} | 完賽: ${info.finishers}`);

  const standings = getFinalStandings();
  console.log('\n🏆 前 5 名:');
  for (const r of standings.slice(0, 5)) {
    console.log(`  P${r.Position}  ${r.Abbreviation} (${r.TeamName}) - ${r.Points} pts`);
  }

  const fastest = getFastestLaps();
  if (fastest.length > 0) {
    console.log(`\n⚡ 最快圈速: ${fastest[0].Driver} — ${fastest[0].LapTimeSeconds.toFixed(3)}s (Lap ${fastest[0].LapNumber})`);
  }

  const w = getWeatherSummary();
  console.log(`\n🌤️ 天氣: ${w.air_temp.min}~${w.air_temp.max}°C | 賽道 ${w.track_temp.min}~${w.track_temp.max}°C`);
  console.log(`   濕度 ${w.humidity.min}~${w.humidity.max}% | 降雨: ${w.rainfall ? '有' : '無'}`);

  const tel = getThrottleBrakeAnalysis('VER');
  console.log(`\n📊 VER 遙測:`);
  console.log(`   全油門 ${tel.full_throttle_pct.toFixed(1)}% | 煞車 ${tel.braking_pct.toFixed(1)}%`);
  console.log(`   均速 ${tel.avg_speed.toFixed(0)} km/h | 極速 ${tel.max_speed.toFixed(0)} km/h`);
  console.log('='.repeat(60));
}

main();