import { getRaceInfo } from '../data_loader.js';
import { getFinalStandings, getPositionChangeSummary, getTeamStandings } from '../race_analysis.js';
import { getTyreStrategy } from '../tyre_analysis.js';
import { getWeatherSummary } from '../weather_analysis.js';
import { getDriverLapTimes } from '../lap_analysis.js';
import { getThrottleBrakeAnalysis } from '../telemetry_analysis.js';
import { compareTelemetry } from '../coaching.js';
import { BotResponse, DEFAULT_BOT_OUTPUT_DIR, DEFAULT_COMPARE_BENCHMARK_CSV, DEFAULT_COMPARE_USER_CSV } from './types.js';
import { join } from 'path';

export class BotService {
  driver: string;
  compareUserCsv: string;
  compareBenchmarkCsv: string;
  outputDir: string;

  constructor(driver = 'VER', compareUserCsv = DEFAULT_COMPARE_USER_CSV, compareBenchmarkCsv = DEFAULT_COMPARE_BENCHMARK_CSV, outputDir = DEFAULT_BOT_OUTPUT_DIR) {
    this.driver = driver;
    this.compareUserCsv = compareUserCsv;
    this.compareBenchmarkCsv = compareBenchmarkCsv;
    this.outputDir = outputDir;
  }

  getStandingsResponse(): BotResponse {
    const raceInfo = getRaceInfo();
    const standings = getFinalStandings();
    const positionChanges = getPositionChangeSummary();
    const teamStandings = getTeamStandings();

    return {
      command: 'standings',
      title: '最終排名 / 車隊積分',
      summary: [
        `${raceInfo.event} @ ${raceInfo.circuit}`,
        `冠軍：${raceInfo.winner} (${raceInfo.winner_team})`,
        `總圈數：${raceInfo.total_laps} 圈；參賽：${raceInfo.drivers} 位；完賽：${raceInfo.finishers} 位`,
      ],
      metrics: {
        winner: raceInfo.winner,
        winner_team: raceInfo.winner_team,
        total_laps: raceInfo.total_laps,
        drivers: raceInfo.drivers,
        finishers: raceInfo.finishers,
      },
      tables: { final_standings: standings, position_changes: positionChanges, team_standings: teamStandings },
      details: { race_info: raceInfo },
    };
  }

  getStrategyResponse(): BotResponse {
    const strategy = getTyreStrategy();
    return {
      command: 'strategy',
      title: '輪胎策略摘要',
      summary: [`${strategy.length} 位車手的輪胎策略`],
      metrics: { drivers: strategy.length },
      tables: { tyre_strategy: strategy },
    };
  }

  getWeatherResponse(): BotResponse {
    const weather = getWeatherSummary();
    return {
      command: 'weather',
      title: '天氣摘要',
      summary: [
        `氣溫: ${weather.air_temp.min}~${weather.air_temp.max}°C`,
        `賽道溫度: ${weather.track_temp.min}~${weather.track_temp.max}°C`,
        `降雨: ${weather.rainfall ? '有' : '無'}`,
      ],
      metrics: weather,
      tables: {},
    };
  }

  getTelemetryResponse(driver?: string): BotResponse {
    const d = driver || this.driver;
    const tel = getThrottleBrakeAnalysis(d);
    return {
      command: 'telemetry',
      title: `${d} 遙測分析`,
      summary: [
        `全油門: ${tel.full_throttle_pct.toFixed(1)}%`,
        `煞車: ${tel.braking_pct.toFixed(1)}%`,
        `滑行: ${tel.coasting_pct.toFixed(1)}%`,
        `平均速度: ${tel.avg_speed.toFixed(1)} km/h`,
      ],
      metrics: tel,
      tables: {},
    };
  }

  getLapsResponse(driver?: string): BotResponse {
    const d = driver || this.driver;
    const laps = getDriverLapTimes(d);
    return {
      command: 'laps',
      title: `${d} 圈速`,
      summary: [`${d} 共有 ${laps.length} 圈資料`],
      metrics: { driver: d, laps_count: laps.length },
      tables: { laps },
    };
  }

  getCompareResponse(userCsv?: string, benchmarkCsv?: string, outputDir?: string): BotResponse {
    const u = userCsv || this.compareUserCsv;
    const b = benchmarkCsv || this.compareBenchmarkCsv;
    const o = outputDir || join(this.outputDir, 'compare');
    const result = compareTelemetry(u, b, o);

    return {
      command: 'compare',
      title: '遙測比較 (User vs VER)',
      summary: [
        `配對 ${result.brake_events.length} 個煞車事件`,
        `參考極速: ${result.speed_summary.ref_max_speed.toFixed(1)} km/h`,
        `用戶極速: ${result.speed_summary.user_max_speed.toFixed(1)} km/h`,
      ],
      metrics: { compare_result: result },
      tables: { brake_events: result.brake_events, throttle_events: result.throttle_events },
    };
  }
}
