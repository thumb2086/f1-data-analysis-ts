import { readFileSync, existsSync } from 'fs';
import { parse } from 'csv-parse/sync';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RAW_DIR = join(__dirname, '..', '..', 'raw');

// 解析 "0 days 00:01:28.179000" 格式為秒數
export function parseDurationToSeconds(d: string): number {
  if (!d || d === '') return NaN;
  const m = d.match(/(\d+)\s+days?\s+(\d+):(\d+):(\d+)(?:\.(\d+))?/);
  if (m) {
    const days = parseInt(m[1], 10);
    const h = parseInt(m[2], 10);
    const min = parseInt(m[3], 10);
    const s = parseInt(m[4], 10);
    const ms = m[5] ? parseInt(m[5]) / 1000 : 0;
    return days * 86400 + h * 3600 + min * 60 + s + ms;
  }
  return NaN;
}

function loadCSV(fileName: string): any[] {
  const path = join(RAW_DIR, fileName);
  if (!existsSync(path)) return [];
  const raw = readFileSync(path, 'utf-8');
  return parse(raw, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

interface RawLap {
  Time: string;
  Driver: string;
  DriverNumber: string;
  LapTime: string;
  LapNumber: string;
  Stint: string;
  Compound: string;
  TyreLife: string;
  FreshTyre: string;
  Team: string;
  LapStartTime: string;
  Position: string;
  IsAccurate: string;
  SpeedST: string;
  IsPersonalBest: string;
  [key: string]: string;
}

interface RawResult {
  DriverNumber: string;
  Abbreviation: string;
  TeamName: string;
  FullName: string;
  Position: string;
  GridPosition: string;
  Points: string;
  Laps: string;
  Status: string;
  [key: string]: string;
}

interface RawWeather {
  Time: string;
  AirTemp: string;
  TrackTemp: string;
  Humidity: string;
  Rainfall: string;
  WindSpeed: string;
  Pressure: string;
  [key: string]: string;
}

interface RawStint {
  driver_number: string;
  stint_number: string;
  lap_start: string;
  lap_end: string;
  compound: string;
  [key: string]: string;
}

interface RawTelemetry {
  Distance: string;
  Speed: string;
  Throttle: string;
  Brake: string;
  RPM: string;
  nGear: string;
  DRS: string;
  RelativeDistance: string;
  [key: string]: string;
}

// ── 公開介面 ──────────────────────────────────────────────

export interface Lap {
  Time: number;
  Driver: string;
  DriverNumber: number;
  LapTime: number;
  LapNumber: number;
  Stint: number;
  Compound: string;
  TyreLife: number;
  FreshTyre: boolean;
  Team: string;
  LapStartTime: number;
  Position: number;
  IsAccurate: boolean;
  SpeedST: number;
  IsPersonalBest: boolean;
}

export interface Result {
  DriverNumber: number;
  Abbreviation: string;
  TeamName: string;
  FullName: string;
  Position: number;
  GridPosition: number;
  Points: number;
  Laps: number;
  Status: string;
}

export interface Weather {
  Time: number;
  AirTemp: number;
  TrackTemp: number;
  Humidity: number;
  Rainfall: boolean;
  WindSpeed: number;
  Pressure: number;
}

export interface Stint {
  driver_number: number;
  stint_number: number;
  lap_start: number;
  lap_end: number;
  compound: string;
}

export interface Telemetry {
  Distance: number;
  Speed: number;
  Throttle: number;
  Brake: boolean;
  RPM: number;
  nGear: number;
  DRS: number;
  RelativeDistance: number;
}

export interface RaceInfo {
  event: string;
  circuit: string;
  date: string;
  drivers: number;
  finishers: number;
  total_laps: number;
  weather: { temp_min: number; temp_max: number; track_temp_min: number; track_temp_max: number; rain: boolean };
  winner: string;
  winner_team: string;
}

function parseNum(v: string): number {
  if (v === '' || v === null || v === undefined) return NaN;
  const n = parseFloat(v);
  return isNaN(n) ? NaN : n;
}

function parseBool(v: string): boolean {
  const s = v.trim().toLowerCase();
  return s === 'true' || s === '1' || s === 't' || s === 'yes';
}

// ── 載入器 ──────────────────────────────────────────────

export function loadLaps(): Lap[] {
  return (loadCSV('laps.csv') as RawLap[]).map(r => ({
    Time: parseDurationToSeconds(r.Time),
    Driver: r.Driver,
    DriverNumber: parseNum(r.DriverNumber),
    LapTime: parseDurationToSeconds(r.LapTime),
    LapNumber: parseNum(r.LapNumber),
    Stint: parseNum(r.Stint),
    Compound: r.Compound,
    TyreLife: parseNum(r.TyreLife),
    FreshTyre: parseBool(r.FreshTyre),
    Team: r.Team,
    LapStartTime: parseDurationToSeconds(r.LapStartTime),
    Position: parseNum(r.Position),
    IsAccurate: parseBool(r.IsAccurate),
    SpeedST: parseNum(r.SpeedST),
    IsPersonalBest: parseBool(r.IsPersonalBest),
  }));
}

export function loadResults(): Result[] {
  return (loadCSV('results.csv') as RawResult[]).map(r => ({
    DriverNumber: parseNum(r.DriverNumber),
    Abbreviation: r.Abbreviation,
    TeamName: r.TeamName,
    FullName: r.FullName,
    Position: parseNum(r.Position),
    GridPosition: parseNum(r.GridPosition),
    Points: parseNum(r.Points),
    Laps: parseNum(r.Laps),
    Status: r.Status,
  }));
}

export function loadWeather(): Weather[] {
  return (loadCSV('weather.csv') as RawWeather[]).map(r => ({
    Time: parseDurationToSeconds(r.Time),
    AirTemp: parseNum(r.AirTemp),
    TrackTemp: parseNum(r.TrackTemp),
    Humidity: parseNum(r.Humidity),
    Rainfall: parseBool(r.Rainfall),
    WindSpeed: parseNum(r.WindSpeed),
    Pressure: parseNum(r.Pressure),
  }));
}

export function loadStints(): Stint[] {
  return (loadCSV('stints.csv') as RawStint[]).map(r => ({
    driver_number: parseNum(r.driver_number),
    stint_number: parseNum(r.stint_number),
    lap_start: parseNum(r.lap_start),
    lap_end: parseNum(r.lap_end),
    compound: r.compound,
  }));
}

export function loadTelemetry(driverCode: string = 'VER'): Telemetry[] {
  return (loadCSV(`telemetry_${driverCode}.csv`) as RawTelemetry[]).map(r => ({
    Distance: parseNum(r.Distance),
    Speed: parseNum(r.Speed),
    Throttle: parseNum(r.Throttle),
    Brake: parseBool(r.Brake),
    RPM: parseNum(r.RPM),
    nGear: parseNum(r.nGear),
    DRS: parseNum(r.DRS),
    RelativeDistance: parseNum(r.RelativeDistance),
  }));
}

export function getRaceInfo(): RaceInfo {
  const results = loadResults();
  const laps = loadLaps();
  const weather = loadWeather();
  const winner = results.find(r => r.Position === 1);
  const finishers = results.filter(r => r.Status === 'Finished');
  return {
    event: '2024 Italian Grand Prix',
    circuit: 'Monza',
    date: '2024-09-01',
    drivers: results.length,
    finishers: finishers.length,
    total_laps: Math.max(...laps.map(l => l.LapNumber).filter(n => !isNaN(n))),
    weather: {
      temp_min: Math.min(...weather.map(w => w.AirTemp).filter(n => !isNaN(n))),
      temp_max: Math.max(...weather.map(w => w.AirTemp).filter(n => !isNaN(n))),
      track_temp_min: Math.min(...weather.map(w => w.TrackTemp).filter(n => !isNaN(n))),
      track_temp_max: Math.max(...weather.map(w => w.TrackTemp).filter(n => !isNaN(n))),
      rain: weather.some(w => w.Rainfall),
    },
    winner: winner?.FullName || 'Unknown',
    winner_team: winner?.TeamName || 'Unknown',
  };
}