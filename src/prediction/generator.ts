import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPredictionTable } from './baseline.js';
import { dataframeToMarkdown } from '../utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PROJECT_ROOT = join(__dirname, '..', '..');
const DEFAULT_OUTPUT_DIR = join(PROJECT_ROOT, 'outputs', 'prediction');

/** 產出預測 CSV 與 Markdown */
export function generatePredictionArtifacts(outputDir: string = DEFAULT_OUTPUT_DIR): { csv: string; markdown: string } {
  if (!existsSync(outputDir)) mkdirSync(outputDir, { recursive: true });

  const predictions = buildPredictionTable();
  if (predictions.length === 0) {
    console.warn('⚠ 無預測資料可產出');
    return { csv: '', markdown: '' };
  }

  // ── CSV ──
  const headers = Object.keys(predictions[0]);
  const csvLines = [
    headers.join(','),
    ...predictions.map(row =>
      headers.map(h => {
        const v = (row as any)[h];
        if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '';
        return String(v);
      }).join(',')
    ),
  ];
  const csvPath = join(outputDir, 'monza_2024_predictions.csv');
  writeFileSync(csvPath, csvLines.join('\n'), 'utf-8');

  // ── Markdown ──
  const summary = {
    top3: predictions.filter(p => p.predicted_result_class === 'Top 3').length,
    top10: predictions.filter(p => p.predicted_result_class === 'Top 10').length,
    dnf: predictions.filter(p => p.predicted_result_class === 'DNF').length,
    oneStop: predictions.filter(p => p.predicted_strategy === 'One-stop').length,
    twoStop: predictions.filter(p => p.predicted_strategy === 'Two-stop').length,
  };

  const topCols = ['driver', 'full_name', 'team_name', 'predicted_result_class', 'predicted_gain_band', 'predicted_strategy'];
  const tableData = predictions.map((p, i) => {
    const row: Record<string, any> = { rank: i + 1 };
    for (const col of topCols) row[col] = (p as any)[col];
    return row;
  });

  const md = [
    '# Monza 2024 baseline predictions (TypeScript)',
    '',
    'This artifact contains an explainable rule-based baseline: result class, gain band, and strategy.',
    '',
    '## Summary',
    `- Drivers: ${predictions.length}`,
    `- Predicted Top 3: ${summary.top3}`,
    `- Predicted Top 10: ${summary.top10}`,
    `- Predicted DNF bucket: ${summary.dnf}`,
    `- Predicted One-stop: ${summary.oneStop}`,
    `- Predicted Two-stop: ${summary.twoStop}`,
    '',
    '## Driver predictions',
    dataframeToMarkdown(tableData),
    '',
    '## Notes',
    '- Result class: ranking bucket from grid, pace, consistency, degradation, team score.',
    '- Gain band: predicted finish rank minus grid position.',
    '- Strategy: stint count, longest stint, hard-tyre share and degradation slope.',
  ].join('\n');

  const mdPath = join(outputDir, 'monza_2024_predictions.md');
  writeFileSync(mdPath, md, 'utf-8');

  console.log(`✅ Predictions CSV: ${csvPath}`);
  console.log(`✅ Predictions MD:  ${mdPath}`);
  return { csv: csvPath, markdown: mdPath };
}

// CLI
const args = process.argv.slice(2);
const outDir = args.includes('--output-dir') ? args[args.indexOf('--output-dir') + 1] : DEFAULT_OUTPUT_DIR;
if (process.argv[1] && process.argv[1].endsWith('__main__.js') || process.argv[1]?.endsWith('__main__.ts')) {
  generatePredictionArtifacts(outDir);
}