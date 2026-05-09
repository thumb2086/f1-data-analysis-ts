import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..');
const RAW_DIR = join(PROJECT_ROOT, 'raw');
const DEFAULT_OUTPUT_DIR = join(PROJECT_ROOT, 'outputs', 'coaching');

function loadCSV(path: string): Record<string, any>[] {
  const raw = readFileSync(path, 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

function findBrakePoints(data: { Distance: number; Brake: boolean }[]): number[] {
  const pts: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].Brake && !data[i - 1].Brake) pts.push(data[i].Distance);
  }
  return pts;
}

function findThrottlePickups(data: { Distance: number; Throttle: number; Brake: boolean }[]): number[] {
  const pts: number[] = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i].Throttle >= 80 && data[i - 1].Throttle < 80 && !data[i].Brake) pts.push(data[i].Distance);
  }
  return pts;
}

export function compareTelemetry(
  userCsv: string,
  benchmarkCsv: string = join(RAW_DIR, 'telemetry_VER.csv'),
  outputDir: string = DEFAULT_OUTPUT_DIR,
): Record<string, any> {
  const userRaw = loadCSV(userCsv);
  const refRaw = loadCSV(benchmarkCsv);

  const parseRow = (r: any) => ({
    Distance: parseFloat(r['Distance']) || 0,
    Speed: parseFloat(r['Speed']) || 0,
    Throttle: parseFloat(r['Throttle']) || 0,
    Brake: String(r['Brake']).trim().toLowerCase() === 'true' || String(r['Brake']).trim() === '1',
    RPM: parseFloat(r['RPM']) || 0,
    nGear: parseFloat(r['nGear']) || 0,
  });

  const userData = userRaw.map(parseRow).sort((a, b) => a.Distance - b.Distance);
  const refData = refRaw.map(parseRow).sort((a, b) => a.Distance - b.Distance);

  const refBrakePts = findBrakePoints(refData);
  const userBrakePts = findBrakePoints(userData);
  const refThrottlePts = findThrottlePickups(refData);
  const userThrottlePts = findThrottlePickups(userData);

  const n = Math.min(refBrakePts.length, userBrakePts.length, refThrottlePts.length);
  const brakeEvents: any[] = [];
  const throttleEvents: any[] = [];

  for (let i = 0; i < n; i++) {
    const db = userBrakePts[i] - refBrakePts[i];
    const dt = userThrottlePts[i] - refThrottlePts[i];

    brakeEvents.push({
      event: i + 1,
      ref_brake_distance: refBrakePts[i],
      user_brake_distance: userBrakePts[i],
      brake_delta_m: db,
      feedback: db > 5 ? `煞車晚了 ${db.toFixed(1)}m` : db < -5 ? `煞車早了 ${Math.abs(db).toFixed(1)}m` : '煞車點相近',
    });
    throttleEvents.push({
      event: i + 1,
      ref_throttle_distance: refThrottlePts[i],
      user_throttle_distance: userThrottlePts[i],
      throttle_delta_m: dt,
      feedback: dt > 5 ? `油門回補晚了 ${dt.toFixed(1)}m` : dt < -5 ? `油門回補早了 ${Math.abs(dt).toFixed(1)}m` : '油門回補時機相近',
    });
  }

  const refSpeeds = refData.map(d => d.Speed);
  const userSpeeds = userData.map(d => d.Speed);

  const report = {
    driver_comparison: 'User vs VER (benchmark)',
    brake_events: brakeEvents,
    throttle_events: throttleEvents,
    speed_summary: {
      ref_avg_speed: refSpeeds.reduce((a, b) => a + b, 0) / refSpeeds.length,
      user_avg_speed: userSpeeds.reduce((a, b) => a + b, 0) / userSpeeds.length,
      ref_max_speed: Math.max(...refSpeeds),
      user_max_speed: Math.max(...userSpeeds),
    },
  };

  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const jsonPath = join(outputDir, 'coaching_report.json');
  writeFileSync(jsonPath, JSON.stringify(report, null, 2), 'utf-8');

  const txtLines = [
    '=== Coaching Report: User vs VER ===\n',
    `煞車事件比較 (${brakeEvents.length} 個配對):`,
    ...brakeEvents.map(e => `  #${e.event}: ${e.feedback}`),
    `\n油門回補比較:`,
    ...throttleEvents.map(e => `  #${e.event}: ${e.feedback}`),
    `\n速度摘要:`,
    `  參考平均: ${report.speed_summary.ref_avg_speed.toFixed(1)} km/h`,
    `  用戶平均: ${report.speed_summary.user_avg_speed.toFixed(1)} km/h`,
    `  參考極速: ${report.speed_summary.ref_max_speed.toFixed(1)} km/h`,
    `  用戶極速: ${report.speed_summary.user_max_speed.toFixed(1)} km/h`,
  ].join('\n');
  const txtPath = join(outputDir, 'coaching_summary.txt');
  writeFileSync(txtPath, txtLines, 'utf-8');

  return { json_path: jsonPath, txt_path: txtPath, ...report };
}