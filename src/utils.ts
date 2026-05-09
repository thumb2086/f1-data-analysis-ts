import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const PROJECT_ROOT = join(__dirname, '..', '..');
export const DEFAULT_OUTPUT_DIR = join(PROJECT_ROOT, 'outputs');
export const RAW_DIR = join(PROJECT_ROOT, 'raw');

export function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function writeCSV(path: string, rows: Record<string, any>[]): void {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const lines = rows.map(r => headers.map(h => {
    const v = r[h];
    if (v === null || v === undefined || (typeof v === 'number' && isNaN(v))) return '';
    return String(v);
  }).join(','));
  const csv = [headers.join(','), ...lines].join('\n');
  ensureDir(dirname(path));
  writeFileSync(path, csv, 'utf-8');
}

export function safeNum(v: any, fallback: number = 0): number {
  if (v === null || v === undefined) return fallback;
  const n = typeof v === 'number' ? v : parseFloat(String(v));
  return isNaN(n) ? fallback : n;
}

export function minMaxScore(values: number[], higherIsBetter: boolean = true): number[] {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return values.map(() => 50);
  const min = Math.min(...valid);
  const max = Math.max(...valid);
  if (Math.abs(max - min) < 1e-9) return values.map(() => 50);
  return values.map(v => {
    if (isNaN(v)) return 50;
    const score = higherIsBetter ? (v - min) / (max - min) * 100 : (max - v) / (max - min) * 100;
    return Math.max(0, Math.min(100, score));
  });
}

export function safeRank(values: number[], ascending: boolean = true): number[] {
  const valid = values.filter(v => !isNaN(v));
  if (valid.length === 0) return values.map(() => NaN);
  const sorted = [...valid].sort((a, b) => ascending ? a - b : b - a);
  return values.map(v => {
    if (isNaN(v)) return NaN;
    return sorted.indexOf(v) + 1;
  });
}

export function formatNumber(value: any, digits: number = 2): string {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (isNaN(value)) return '-';
    return value.toFixed(digits);
  }
  return String(value);
}

export function dataframeToMarkdown(rows: Record<string, any>[], maxRows?: number): string {
  if (!rows || rows.length === 0) return '_No data available_';
  const data = maxRows ? rows.slice(0, maxRows) : rows;
  const headers = Object.keys(data[0]);
  const fmtRows = data.map(r => headers.map(h => formatNumber(r[h])));
  const widths = headers.map((h, i) => Math.max(h.length, ...fmtRows.map(r => r[i].length)));
  const line = (parts: string[]) => '| ' + parts.map((p, i) => p.padEnd(widths[i])).join(' | ') + ' |';
  const sep = '| ' + widths.map(w => '-'.repeat(w)).join(' | ') + ' |';
  return [line(headers), sep, ...fmtRows.map(r => line(r))].join('\n');
}

export function dataframeToHtmlTable(rows: Record<string, any>[], maxRows?: number): string {
  if (!rows || rows.length === 0) return '<p><em>No data available</em></p>';
  const data = maxRows ? rows.slice(0, maxRows) : rows;
  const headers = Object.keys(data[0]);
  const headerHtml = headers.map(h => `<th>${h}</th>`).join('');
  const bodyHtml = data.map(r => '<tr>' + headers.map(h => `<td>${formatNumber(r[h])}</td>`).join('') + '</tr>').join('\n    ');
  return `<table class="report-table" border="0">\n  <thead><tr>${headerHtml}</tr></thead>\n  <tbody>${bodyHtml}</tbody>\n</table>`;
}