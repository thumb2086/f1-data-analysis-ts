import { loadWeather, loadLaps } from './data_loader.js';

/** 天氣隨時間變化 */
export function getWeatherTimeline(): Record<string, any>[] {
  return loadWeather().map(w => ({
    ...w,
    Time_minutes: w.Time / 60,
  }));
}

/** 賽道溫度對圈速的影響（合併天氣與圈速） */
export function getTrackTempEffect(): Record<string, any>[] {
  const weather = loadWeather().sort((a, b) => a.Time - b.Time);
  const laps = loadLaps().filter(l => l.IsAccurate).sort((a, b) => a.LapStartTime - b.LapStartTime);
  let wi = 0;
  return laps.map(lap => {
    // 找最近的天氣記錄
    while (wi < weather.length - 1 && weather[wi + 1].Time <= lap.LapStartTime) wi++;
    const w = weather[wi];
    return {
      LapNumber: lap.LapNumber,
      Driver: lap.Driver,
      LapTimeSeconds: lap.LapTime,
      AirTemp: w?.AirTemp ?? NaN,
      TrackTemp: w?.TrackTemp ?? NaN,
      Humidity: w?.Humidity ?? NaN,
      Rainfall: w?.Rainfall ?? false,
    };
  });
}

/** 天氣摘要 */
export function getWeatherSummary(): Record<string, any> {
  const weather = loadWeather();
  const airTemps = weather.map(w => w.AirTemp).filter(t => !isNaN(t));
  const trackTemps = weather.map(w => w.TrackTemp).filter(t => !isNaN(t));
  const humidities = weather.map(w => w.Humidity).filter(t => !isNaN(t));
  const pressures = weather.map(w => w.Pressure).filter(t => !isNaN(t));
  const windSpeeds = weather.map(w => w.WindSpeed).filter(t => !isNaN(t));

  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  return {
    air_temp: {
      min: Math.min(...airTemps),
      max: Math.max(...airTemps),
      avg: avg(airTemps),
    },
    track_temp: {
      min: Math.min(...trackTemps),
      max: Math.max(...trackTemps),
      avg: avg(trackTemps),
    },
    humidity: {
      min: Math.min(...humidities),
      max: Math.max(...humidities),
      avg: avg(humidities),
    },
    pressure: {
      min: Math.min(...pressures),
      max: Math.max(...pressures),
    },
    rainfall: weather.some(w => w.Rainfall),
    wind_speed: {
      avg: avg(windSpeeds),
      max: Math.max(...windSpeeds),
    },
    records_count: weather.length,
  };
}