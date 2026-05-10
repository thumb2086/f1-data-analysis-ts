// F1 Data Loader — TypeScript 版
// 使用 PapaParse 解析 CSV，正確處理 timedelta、Brake/True 字串

import Papa from 'papaparse'

// ──── Types ────

export interface Lap {
  Time: number
  Driver: string
  DriverNumber: number
  LapTime: number        // 已轉秒
  LapNumber: number
  Stint: number
  Compound: string
  TyreLife: number
  Position: number
  Team: string
  SpeedST: number
  SpeedFL: number
  LapStartTime: number
  IsPersonalBest: number
  IsAccurate: boolean    // 改為 boolean
}

export interface Result {
  Position: number
  Abbreviation: string
  FullName: string
  TeamName: string
  GridPosition: number
  Points: number
  Laps: number
  Status: string
  DriverNumber: number
}

export interface Weather {
  Time: number
  AirTemp: number
  TrackTemp: number
  Humidity: number
  Pressure: number
  WindSpeed: number
  WindDirection: number
  Rainfall: number
}

export interface TelemetryPoint {
  Distance: number
  RelativeDistance: number
  Speed: number
  RPM: number
  nGear: number
  Throttle: number
  Brake: number          // 0 or 1
  DRS: number
}

export interface Stint {
  driver_number: number
  stint_number: number
  lap_start: number
  lap_end: number
  compound: string
  tyre_age_at_start: number
}

export interface LocationPoint {
  t: number     // time step
  driver: string
  x: number
  y: number
}

// ──── Helpers ────

/** 把 "0 days 00:01:21.456000" / "00:01:21.456000" 轉成秒數 */
export function parseTimeToSeconds(d: unknown): number {
  if (typeof d === 'number') return Number.isFinite(d) ? d : NaN
  if (d == null) return NaN

  const value = String(d).trim()
  if (!value) return NaN

  const m = value.match(/(?:(\d+)\s+days?\s+)?(\d+):(\d+):(\d+)(?:\.(\d+))?/)
  if (m) {
    const days = parseInt(m[1] || '0', 10)
    const h = parseInt(m[2], 10)
    const min = parseInt(m[3], 10)
    const s = parseInt(m[4], 10)
    const ms = m[5] ? parseInt(m[5].padEnd(3, '0').slice(0, 3), 10) / 1000 : 0
    return days * 86400 + h * 3600 + min * 60 + s + ms
  }

  const num = parseFloat(value)
  return Number.isFinite(num) ? num : NaN
}

function parseNumber(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : fallback
  const n = parseFloat(String(v ?? '').trim())
  return Number.isFinite(n) ? n : fallback
}

function parseIntNumber(v: unknown, fallback = 0): number {
  const n = parseNumber(v, fallback)
  return Number.isFinite(n) ? Math.trunc(n) : fallback
}

function parseBool(v: unknown): boolean {
  const value = String(v ?? '').trim().toLowerCase()
  return value === 'true' || value === '1' || value === 'yes'
}

/** Brake 欄位：CSV 中可能是 'True'/'False' 字串 */
function parseBrake(v: unknown): number {
  return parseBool(v) || parseNumber(v) === 1 ? 1 : 0
}

/** 通用 fetch + parse CSV */
async function fetchCSV<T>(filename: string, transform?: (row: any) => T): Promise<T[]> {
  const resp = await fetch(`/data/${filename}`)
  if (!resp.ok) throw new Error(`Cannot load /data/${filename}: ${resp.status}`)
  const text = await resp.text()
  const parsed = Papa.parse(text, { header: true, skipEmptyLines: true, dynamicTyping: false })
  if (parsed.errors.length > 0) throw new Error(`Cannot parse ${filename}: ${parsed.errors[0].message}`)
  if (transform) return parsed.data.map(transform)
  return parsed.data as unknown as T[]
}

function isValidLap(lap: Lap): boolean {
  return lap.IsAccurate && Number.isFinite(lap.LapTime) && lap.LapTime > 0
}

// ──── Caches ────

let lapsCache: Lap[] | null = null
let resultsCache: Result[] | null = null
let weatherCache: Weather[] | null = null
let stintsCache: Stint[] | null = null
let telemetryCache: Map<string, TelemetryPoint[]> = new Map()
let locationsCache: LocationPoint[] | null = null
let telemetryDriversCache: string[] | null = null

export const AVAILABLE_TELEMETRY_DRIVERS = ['VER']

// ──── Loaders ────

export async function loadLaps(): Promise<Lap[]> {
  if (lapsCache) return lapsCache
  const raw = await fetchCSV<Lap>('laps.csv', r => ({
    Time: parseTimeToSeconds(r.Time),
    Driver: r.Driver,
    DriverNumber: parseIntNumber(r.DriverNumber),
    LapTime: parseTimeToSeconds(r.LapTime),
    LapNumber: parseIntNumber(r.LapNumber),
    Stint: parseIntNumber(r.Stint),
    Compound: r.Compound,
    TyreLife: parseNumber(r.TyreLife),
    Position: parseIntNumber(r.Position),
    Team: r.Team,
    SpeedST: parseNumber(r.SpeedST),
    SpeedFL: parseNumber(r.SpeedFL),
    LapStartTime: parseTimeToSeconds(r.LapStartTime),
    IsPersonalBest: parseBool(r.IsPersonalBest) ? 1 : 0,
    IsAccurate: parseBool(r.IsAccurate),
  }))
  lapsCache = raw
  return raw
}

export async function loadResults(): Promise<Result[]> {
  if (resultsCache) return resultsCache
  const raw = await fetchCSV<Result>('results.csv', r => ({
    Position: parseIntNumber(r.Position),
    Abbreviation: r.Abbreviation,
    FullName: r.FullName,
    TeamName: r.TeamName,
    GridPosition: parseIntNumber(r.GridPosition),
    Points: parseIntNumber(r.Points),
    Laps: parseIntNumber(r.Laps),
    Status: r.Status,
    DriverNumber: parseIntNumber(r.DriverNumber),
  }))
  resultsCache = raw
  return raw
}

export async function loadWeather(): Promise<Weather[]> {
  if (weatherCache) return weatherCache
  const raw = await fetchCSV<Weather>('weather.csv', r => ({
    Time: parseTimeToSeconds(r.Time),
    AirTemp: parseNumber(r.AirTemp),
    TrackTemp: parseNumber(r.TrackTemp),
    Humidity: parseNumber(r.Humidity),
    Pressure: parseNumber(r.Pressure),
    WindSpeed: parseNumber(r.WindSpeed),
    WindDirection: parseNumber(r.WindDirection),
    Rainfall: parseBool(r.Rainfall) ? 1 : 0,
  }))
  weatherCache = raw
  return raw
}

export async function loadStints(): Promise<Stint[]> {
  if (stintsCache) return stintsCache
  const raw = await fetchCSV<Stint>('stints.csv', r => ({
    driver_number: parseIntNumber(r.driver_number),
    stint_number: parseIntNumber(r.stint_number),
    lap_start: parseIntNumber(r.lap_start),
    lap_end: parseIntNumber(r.lap_end),
    compound: r.compound,
    tyre_age_at_start: parseNumber(r.tyre_age_at_start),
  }))
  stintsCache = raw
  return raw
}

export async function loadTelemetry(driver: string = 'VER'): Promise<TelemetryPoint[]> {
  if (telemetryCache.has(driver)) return telemetryCache.get(driver)!
  const raw = await fetchCSV<TelemetryPoint>(`telemetry_${driver}.csv`, r => ({
    Distance: parseNumber(r.Distance),
    RelativeDistance: parseNumber(r.RelativeDistance),
    Speed: parseNumber(r.Speed),
    RPM: parseNumber(r.RPM),
    nGear: parseNumber(r.nGear),
    Throttle: parseNumber(r.Throttle),
    Brake: parseBrake(r.Brake),
    DRS: parseNumber(r.DRS),
  }))
  telemetryCache.set(driver, raw)
  return raw
}

export async function loadAvailableTelemetryDrivers(): Promise<string[]> {
  if (telemetryDriversCache) return telemetryDriversCache

  try {
    const resp = await fetch('/data/telemetry_manifest.json')
    if (resp.ok) {
      const manifest = await resp.json()
      if (Array.isArray(manifest.drivers) && manifest.drivers.length > 0) {
        const drivers = manifest.drivers.map(String)
        telemetryDriversCache = drivers
        return drivers
      }
    }
  } catch {
    // Fall back to the workshop's original single-driver telemetry file.
  }

  telemetryDriversCache = AVAILABLE_TELEMETRY_DRIVERS
  return AVAILABLE_TELEMETRY_DRIVERS
}

export async function loadLocations(): Promise<LocationPoint[]> {
  if (locationsCache) return locationsCache
  const raw = await fetchCSV<LocationPoint>('locations.csv', r => ({
    t: parseIntNumber(r.t),
    driver: r.driver,
    x: parseNumber(r.x),
    y: parseNumber(r.y),
  }))
  locationsCache = raw
  return raw
}

// ──── 賽事資訊 ────

export function getRaceInfo() {
  return {
    event: '2024 Italian Grand Prix',
    circuit: 'Autodromo Nazionale di Monza',
    winner: 'Charles Leclerc',
    winner_team: 'Ferrari',
    total_laps: 53,
    drivers: 20,
    finishers: 18,
  }
}

// ════════════════════════════════════════════════════════════
// 分析函式
// ════════════════════════════════════════════════════════════

// ──── Race Analysis ────

export async function getFinalStandings(): Promise<Result[]> {
  const results = await loadResults()
  return results.sort((a, b) => a.Position - b.Position)
}

export async function getPositionChangeSummary(): Promise<any[]> {
  const results = await loadResults()
  return results
    .map(r => ({
      Abbreviation: r.Abbreviation,
      FullName: r.FullName,
      TeamName: r.TeamName,
      GridPosition: r.GridPosition,
      Position: r.Position,
      position_change: r.GridPosition - r.Position,
      change_label: (r.GridPosition - r.Position) > 0
        ? `+${r.GridPosition - r.Position}`
        : (r.GridPosition - r.Position) < 0
          ? `${r.GridPosition - r.Position}`
          : '0',
      gained_positions: (r.GridPosition - r.Position) > 0,
      Points: r.Points,
    }))
    .sort((a, b) => b.position_change - a.position_change)
}

export async function getTeamStandings(): Promise<any[]> {
  const results = await loadResults()
  const teams = new Map<string, { total_points: number; drivers: string[]; color: string }>()
  const TEAM_COLORS: Record<string, string> = {
    'Red Bull Racing': '#3671C6',
    'Mercedes': '#27F4D2',
    'Ferrari': '#E10600',
    'McLaren': '#FF8000',
    'Aston Martin': '#229971',
    'Alpine': '#FF87BC',
    'Williams': '#64C4FF',
    'RB': '#6692FF',
    'Haas F1 Team': '#B6BABD',
    'Sauber': '#52E252',
  }
  for (const r of results) {
    const existing = teams.get(r.TeamName)
    if (existing) {
      existing.total_points += r.Points
      existing.drivers.push(r.Abbreviation)
    } else {
      teams.set(r.TeamName, {
        total_points: r.Points,
        drivers: [r.Abbreviation],
        color: TEAM_COLORS[r.TeamName] || '#888',
      })
    }
  }
  return Array.from(teams.entries())
    .map(([name, info]) => ({ TeamName: name, ...info }))
    .sort((a, b) => b.total_points - a.total_points)
}

export async function getPositionEvolution(drivers?: string[]): Promise<any[]> {
  let laps = (await loadLaps()).filter(isValidLap)
  if (drivers && drivers.length > 0) laps = laps.filter(l => drivers.includes(l.Driver))
  return laps
    .map(l => ({ LapNumber: l.LapNumber, Driver: l.Driver, Position: l.Position, Team: l.Team }))
    .sort((a, b) => a.Driver.localeCompare(b.Driver) || a.LapNumber - b.LapNumber)
}

// ──── Lap Analysis ────

export async function getFastestLaps(): Promise<any[]> {
  const laps = (await loadLaps()).filter(isValidLap)
  const grouped = new Map<string, Lap[]>()
  for (const lap of laps) {
    if (!grouped.has(lap.Driver)) grouped.set(lap.Driver, [])
    grouped.get(lap.Driver)!.push(lap)
  }
  return Array.from(grouped.entries())
    .map(([driver, driverLaps]) => {
      const fastest = driverLaps.reduce((a, b) => a.LapTime < b.LapTime ? a : b)
      return {
        Driver: driver,
        Team: fastest.Team,
        LapTime: fastest.LapTime,
        LapNumber: fastest.LapNumber,
        Compound: fastest.Compound,
        TyreLife: fastest.TyreLife,
        Position: fastest.Position,
      }
    })
    .sort((a, b) => a.LapTime - b.LapTime)
}

export async function getDriverLapTimes(driver: string): Promise<any[]> {
  const laps = (await loadLaps()).filter(l => isValidLap(l) && l.Driver === driver)
  return laps
    .map(l => ({
      LapNumber: l.LapNumber,
      LapTime: l.LapTime,
      Compound: l.Compound,
      TyreLife: l.TyreLife,
      Position: l.Position,
      IsPersonalBest: l.IsPersonalBest,
    }))
    .sort((a, b) => a.LapNumber - b.LapNumber)
}

export async function getLapTimeEvolution(drivers?: string[]): Promise<any[]> {
  let laps = (await loadLaps()).filter(isValidLap)
  if (drivers && drivers.length > 0) laps = laps.filter(l => drivers.includes(l.Driver))
  return laps
    .map(l => ({
      LapNumber: l.LapNumber,
      Driver: l.Driver,
      Team: l.Team,
      LapTime: l.LapTime,
      Compound: l.Compound,
      TyreLife: l.TyreLife,
      Position: l.Position,
    }))
    .sort((a, b) => a.Driver.localeCompare(b.Driver) || a.LapNumber - b.LapNumber)
}

export async function getLapConsistency(driver: string): Promise<any> {
  const times = (await getDriverLapTimes(driver)).map(l => l.LapTime).filter(t => Number.isFinite(t))
  if (times.length === 0) return { driver, mean: null, std: null, cv: null, lapsCount: 0 }
  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const std = Math.sqrt(times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length)
  return {
    driver,
    mean,
    std,
    cv: mean > 0 ? (std / mean) * 100 : 0,
    min: Math.min(...times),
    max: Math.max(...times),
    lapsCount: times.length,
  }
}

// ──── Weather Analysis ────

export async function getWeatherSummary(): Promise<any> {
  const weather = await loadWeather()
  const air = weather.map(w => w.AirTemp).filter(t => Number.isFinite(t))
  const track = weather.map(w => w.TrackTemp).filter(t => Number.isFinite(t))
  const humid = weather.map(w => w.Humidity).filter(t => Number.isFinite(t))
  const pressure = weather.map(w => w.Pressure).filter(t => Number.isFinite(t))
  const wind = weather.map(w => w.WindSpeed).filter(t => Number.isFinite(t))
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length
  return {
    air_temp: { min: Math.min(...air), max: Math.max(...air), avg: avg(air) },
    track_temp: { min: Math.min(...track), max: Math.max(...track), avg: avg(track) },
    humidity: { min: Math.min(...humid), max: Math.max(...humid), avg: avg(humid) },
    pressure: { min: Math.min(...pressure), max: Math.max(...pressure) },
    wind_speed: { avg: avg(wind), max: Math.max(...wind) },
    rainfall: weather.some(w => w.Rainfall),
    records_count: weather.length,
  }
}

export async function getWeatherTimeline(): Promise<any[]> {
  const weather = await loadWeather()
  return weather.map(w => ({
    ...w,
    Time_minutes: w.Time / 60,
  }))
}

export async function getTrackTempEffect(): Promise<any[]> {
  const weather = (await loadWeather()).sort((a, b) => a.Time - b.Time)
  const laps = (await loadLaps()).filter(isValidLap).sort((a, b) => a.LapStartTime - b.LapStartTime)
  let wi = 0
  return laps.map(lap => {
    while (wi < weather.length - 1 && weather[wi + 1].Time <= lap.LapStartTime) wi++
    const w = weather[wi]
    return {
      LapNumber: lap.LapNumber,
      Driver: lap.Driver,
      LapTimeSeconds: lap.LapTime,
      AirTemp: w?.AirTemp ?? NaN,
      TrackTemp: w?.TrackTemp ?? NaN,
      Humidity: w?.Humidity ?? NaN,
      Rainfall: w?.Rainfall ?? false,
    }
  })
}

// ──── Tyre Analysis ────

export async function getTyreStrategy(): Promise<any[]> {
  const stints = await loadStints()
  const results = await loadResults()
  const resultMap = new Map(results.map(r => [r.DriverNumber, r]))
  const groups = new Map<number, any[]>()
  for (const s of stints) {
    if (!groups.has(s.driver_number)) groups.set(s.driver_number, [])
    groups.get(s.driver_number)!.push(s)
  }
  return Array.from(groups.entries())
    .map(([drvNum, driverStints]) => {
      driverStints.sort((a, b) => a.stint_number - b.stint_number)
      const stintLaps = driverStints.map(s => s.lap_end - s.lap_start + 1)
      const totalLaps = stintLaps.reduce((a, b) => a + b, 0)
      const nStops = driverStints.length - 1
      const drvInfo = resultMap.get(drvNum)
      const abb = drvInfo?.Abbreviation || `#${drvNum}`
      const strategy = driverStints.map((s, i) => `${s.compound}(${stintLaps[i]})`).join(' → ')
      return {
        driver: abb,
        driver_number: drvNum,
        n_stops: nStops,
        stops_label: `${nStops}-stop`,
        compounds: driverStints.map(s => s.compound).join(' → '),
        stint_laps: stintLaps,
        total_laps: totalLaps,
        strategy,
        stint_details: driverStints.map(s => ({
          compound: s.compound,
          lap_start: s.lap_start,
          lap_end: s.lap_end,
          laps: s.lap_end - s.lap_start + 1,
        })),
        final_position: drvInfo?.Position || null,
      }
    })
    .sort((a, b) => (a.final_position || 999) - (b.final_position || 999))
}

export async function getTyreDegradation(): Promise<any[]> {
  const laps = (await loadLaps()).filter(isValidLap)
  const groups = new Map<string, Lap[]>()
  for (const lap of laps) {
    const key = `${lap.Driver}|${lap.Stint}|${lap.Compound}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(lap)
  }
  const results: any[] = []
  for (const [key, group] of groups) {
    if (group.length < 4) continue
    const x = group.map(l => l.TyreLife)
    const y = group.map(l => l.LapTime)
    const n = x.length
    const sumX = x.reduce((a, b) => a + b, 0)
    const sumY = y.reduce((a, b) => a + b, 0)
    const sumXY = x.reduce((s, xi, i) => s + xi * y[i], 0)
    const sumX2 = x.reduce((s, xi) => s + xi * xi, 0)
    const denom = n * sumX2 - sumX * sumX
    if (Math.abs(denom) < 1e-9) continue
    const slope = (n * sumXY - sumX * sumY) / denom
    const [driver, stint, comp] = key.split('|')
    results.push({ driver, stint: parseInt(stint, 10), compound: comp, deg_sec_per_lap: slope })
  }
  return results
}

// ──── Telemetry Analysis ────

export async function getThrottleBrakeAnalysis(driver: string = 'VER'): Promise<any> {
  const data = await loadTelemetry(driver)
  const total = data.length
  if (total === 0) {
    return {
      driver,
      total_points: 0,
      full_throttle_pct: 0,
      braking_pct: 0,
      coasting_pct: 0,
      drs_active_pct: 0,
      avg_speed: 0,
      max_speed: 0,
      avg_rpm: 0,
      max_rpm: 0,
    }
  }
  const fullThrottle = data.filter(t => t.Throttle >= 95).length
  const braking = data.filter(t => t.Brake).length
  const coasting = data.filter(t => (t.Throttle ?? 0) < 5 && !t.Brake).length
  const drsActive = data.filter(t => t.DRS >= 10).length
  const speeds = data.map(t => t.Speed).filter(s => Number.isFinite(s))
  const rpms = data.map(t => t.RPM).filter(r => Number.isFinite(r))
  return {
    driver,
    total_points: total,
    full_throttle_pct: (fullThrottle / total) * 100,
    braking_pct: (braking / total) * 100,
    coasting_pct: (coasting / total) * 100,
    drs_active_pct: (drsActive / total) * 100,
    avg_speed: speeds.length > 0 ? speeds.reduce((a, b) => a + b, 0) / speeds.length : 0,
    max_speed: speeds.length > 0 ? Math.max(...speeds) : 0,
    avg_rpm: rpms.length > 0 ? rpms.reduce((a, b) => a + b, 0) / rpms.length : 0,
    max_rpm: rpms.length > 0 ? Math.max(...rpms) : 0,
  }
}

export async function getSpeedProfile(driver: string = 'VER'): Promise<any[]> {
  const data = await loadTelemetry(driver)
  return data.map(t => ({
    Distance: t.Distance,
    Speed: t.Speed,
    RelativeDistance: t.RelativeDistance,
    RPM: t.RPM,
    nGear: t.nGear,
    Throttle: t.Throttle,
    Brake: t.Brake,
    DRS: t.DRS,
  }))
}

export async function getGearTimeDistribution(driver: string = 'VER'): Promise<any> {
  const data = await loadTelemetry(driver)
  const total = data.length
  if (total === 0) return { driver, total_points: 0, gear_distribution: {} }
  const gearCounts = new Map<number, number>()
  for (const t of data) {
    const g = Math.round(t.nGear)
    gearCounts.set(g, (gearCounts.get(g) || 0) + 1)
  }
  const distribution: Record<string, { count: number; pct: number }> = {}
  for (const [gear, count] of gearCounts) {
    distribution[String(gear)] = { count, pct: (count / total) * 100 }
  }
  return { driver, total_points: total, gear_distribution: distribution }
}

// ──── Rating ────

export async function getDriverRatings(): Promise<any[]> {
  const results = await loadResults()
  const laps = (await loadLaps()).filter(isValidLap)
  const ratings: any[] = []
  for (const r of results) {
    const driverLaps = laps.filter(l => l.Driver === r.Abbreviation)
    if (driverLaps.length < 5) continue
    const times = driverLaps.map(l => l.LapTime)
    const mean = times.reduce((a, b) => a + b, 0) / times.length
    const std = Math.sqrt(times.reduce((s, t) => s + (t - mean) ** 2, 0) / times.length)
    const consistency = mean > 0 ? (1 - std / mean) * 100 : 0
    const positionsGained = r.GridPosition - r.Position
    const score = Math.round(consistency * 0.4 + Math.max(0, positionsGained) * 2 + r.Points * 1.5)
    ratings.push({
      Driver: r.Abbreviation,
      Team: r.TeamName,
      Position: r.Position,
      Consistency: consistency.toFixed(1),
      PositionsGained: positionsGained,
      Points: r.Points,
      Score: score,
    })
  }
  return ratings.sort((a, b) => b.Score - a.Score)
}

// ──── Prediction ────

export async function getPredictions(): Promise<any[]> {
  const results = await loadResults()
  return results
    .map(r => ({
      Driver: r.Abbreviation,
      Team: r.TeamName,
      GridPosition: r.GridPosition,
      PredictedFinish: Math.max(1, Math.round(r.GridPosition * 0.7 + r.Points * 0.1)),
      ActualFinish: r.Position,
      Points: r.Points,
    }))
    .sort((a, b) => a.PredictedFinish - b.PredictedFinish)
}

// ──── Locations (GPS) ────

export async function getLocationData(): Promise<LocationPoint[]> {
  return await loadLocations()
}

export async function getDriversList(): Promise<string[]> {
  const locs = await loadLocations()
  return [...new Set(locs.map(l => l.driver))].sort()
}

/** 取得每個車手在某個時間點的 GPS 位置 */
export function getLocationsAtTime(locs: LocationPoint[], t: number, allDrivers: string[]): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>()
  const tLocs = locs.filter(l => l.t === t)
  for (const d of allDrivers) {
    const found = tLocs.find(l => l.driver === d)
    if (found) result.set(d, { x: found.x, y: found.y })
  }
  return result
}

/** 車隊顏色對照表 */
export const TEAM_COLORS: Record<string, string> = {
  'Red Bull Racing': '#3671C6',
  'Mercedes': '#27F4D2',
  'Ferrari': '#E10600',
  'McLaren': '#FF8000',
  'Aston Martin': '#229971',
  'Alpine': '#FF87BC',
  'Williams': '#64C4FF',
  'RB': '#6692FF',
  'Haas F1 Team': '#B6BABD',
  'Sauber': '#52E252',
}

export const DRIVER_TEAMS: Record<string, string> = {
  'VER': 'Red Bull Racing', 'PER': 'Red Bull Racing',
  'HAM': 'Mercedes', 'RUS': 'Mercedes',
  'LEC': 'Ferrari', 'SAI': 'Ferrari',
  'NOR': 'McLaren', 'PIA': 'McLaren',
  'ALO': 'Aston Martin', 'STR': 'Aston Martin',
  'OCO': 'Alpine', 'GAS': 'Alpine',
  'ALB': 'Williams', 'COL': 'Williams',
  'RIC': 'RB', 'TSU': 'RB',
  'HUL': 'Haas F1 Team', 'MAG': 'Haas F1 Team',
  'BOT': 'Sauber', 'ZHO': 'Sauber',
}

export function getDriverColor(driver: string): string {
  const team = DRIVER_TEAMS[driver]
  return TEAM_COLORS[team] || '#888'
}

export function normalizeLocations(locs: LocationPoint[]): { x: number[]; y: number[]; minX: number; maxX: number; minY: number; maxY: number } {
  const xs = locs.map(l => l.x)
  const ys = locs.map(l => l.y)
  return {
    x: xs, y: ys,
    minX: Math.min(...xs), maxX: Math.max(...xs),
    minY: Math.min(...ys), maxY: Math.max(...ys),
  }
}

/** 取得所有時間點 */
export function getTimeRange(locs: LocationPoint[]): { min: number; max: number; steps: number[] } {
  const times = [...new Set(locs.map(l => l.t))].sort((a, b) => a - b)
  return { min: times[0], max: times[times.length - 1], steps: times }
}
