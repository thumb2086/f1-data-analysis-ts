import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  getRaceInfo, getFinalStandings, getPositionChangeSummary,
  getFastestLaps, getWeatherSummary, getThrottleBrakeAnalysis,
  getDriverRatings, getPredictions, getTyreStrategy,
  loadAvailableTelemetryDrivers, getDriversList,
} from '../data/f1Data'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a2e] rounded-xl p-5 border border-gray-700/50 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value, color = 'text-white' }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-gray-700/30 last:border-0">
      <span className="text-gray-400 text-sm">{label}</span>
      <span className={`font-mono font-semibold ${color}`}>{value}</span>
    </div>
  )
}

export default function Dashboard() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getRaceInfo(),
      getFinalStandings(),
      getPositionChangeSummary(),
      getFastestLaps(),
      getWeatherSummary(),
      getThrottleBrakeAnalysis(),
      getDriverRatings(),
      getPredictions(),
      getTyreStrategy(),
      loadAvailableTelemetryDrivers(),
      getDriversList(),
    ]).then(([raceInfo, standings, posChanges, fastestLaps, weather, telemetry, ratings, predictions, tyreStrategy, telemetryDrivers, gpsDrivers]) => {
      setData({ raceInfo, standings, posChanges, fastestLaps, weather, telemetry, ratings, predictions, tyreStrategy, telemetryDrivers, gpsDrivers })
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-gray-400">正在載入 F1 Monza 2024 資料...</p>
        </div>
      </div>
    )
  }

  const { raceInfo, standings, posChanges, fastestLaps, weather, telemetry, ratings, predictions, tyreStrategy, telemetryDrivers, gpsDrivers } = data

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-[#e10600] rounded-full" />
          <span className="text-[#e10600] text-xs font-bold uppercase tracking-widest">Formula 1</span>
        </div>
        <h1 className="text-3xl font-bold text-white">{raceInfo.event}</h1>
        <p className="text-gray-400 mt-1">{raceInfo.circuit}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <Card title="資料覆蓋">
          <Stat label="圈速資料" value={`${standings.length} 位車手`} color="text-green-400" />
          <Stat label="遙測 CSV" value={`${telemetryDrivers.length} 位車手`} color="text-green-400" />
          <Stat label="GPS 位置" value={`${gpsDrivers.length} 位車手`} color="text-green-400" />
          <Stat label="天氣紀錄" value={`${weather.records_count} 筆`} />
        </Card>

        <Card title="關鍵結果">
          <Stat label="冠軍" value={raceInfo.winner} color="text-[#e10600]" />
          <Stat label="最快圈" value={`${fastestLaps[0]?.Driver ?? '-'} ${fastestLaps[0]?.LapTime?.toFixed(3) ?? '-'}s`} />
          <Stat label="最大名次收益" value={`${posChanges[0]?.Abbreviation ?? '-'} ${posChanges[0]?.change_label ?? '-'}`} color="text-green-400" />
          <Stat label="評分領先" value={`${ratings[0]?.Driver ?? '-'} ${ratings[0]?.Score ?? '-'}pts`} />
        </Card>

        <Card title="快速工作流">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: '/telemetry', label: '遙測比較' },
              { to: '/laps', label: '圈速分析' },
              { to: '/gps', label: 'GPS 動畫' },
              { to: '/weather-tyre', label: '輪胎策略' },
            ].map(item => (
              <Link
                key={item.to}
                to={item.to}
                className="rounded-lg bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </Card>
      </div>

      {/* Race Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card title="🏆 冠軍">
          <p className="text-2xl font-bold text-[#e10600]">{raceInfo.winner}</p>
          <p className="text-gray-400 text-sm">{raceInfo.winner_team}</p>
        </Card>
        <Card title="📋 賽事資訊">
          <Stat label="總圈數" value={raceInfo.total_laps} />
          <Stat label="車手" value={raceInfo.drivers} />
          <Stat label="完賽" value={raceInfo.finishers} />
        </Card>
        <Card title="🌤️ 天氣">
          <Stat label="氣溫" value={`${weather.air_temp?.min ?? '-'}~${weather.air_temp?.max ?? '-'}°C`} />
          <Stat label="賽道溫度" value={`${weather.track_temp?.min ?? '-'}~${weather.track_temp?.max ?? '-'}°C`} />
          <Stat label="濕度" value={`${weather.humidity?.min ?? '-'}~${weather.humidity?.max ?? '-'}%`} />
          <Stat label="降雨" value={weather.rainfall ? '有 🌧️' : '無 ☀️'} />
        </Card>
        <Card title="📊 遙測基準">
          <Stat label="全油門" value={`${telemetry.full_throttle_pct?.toFixed(1)}%`} />
          <Stat label="煞車" value={`${telemetry.braking_pct?.toFixed(1)}%`} />
          <Stat label="均速" value={`${telemetry.avg_speed?.toFixed(0)} km/h`} />
          <Stat label="極速" value={`${telemetry.max_speed?.toFixed(0)} km/h`} />
        </Card>
      </div>

      {/* Standings Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="🏁 最終排名">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2 w-10">P</th>
                  <th className="text-left py-2">車手</th>
                  <th className="text-left py-2 hidden md:table-cell">車隊</th>
                  <th className="text-right py-2">積分</th>
                </tr>
              </thead>
              <tbody>
                {standings.slice(0, 10).map((r: any) => (
                  <tr key={r.Position} className={`border-b border-gray-700/30 hover:bg-white/5 ${r.Position === 1 ? 'text-[#e10600]' : 'text-white'}`}>
                    <td className="py-2 font-mono">{r.Position}</td>
                    <td className="py-2 font-semibold">{r.Abbreviation}</td>
                    <td className="py-2 text-gray-400 hidden md:table-cell">{r.TeamName}</td>
                    <td className="py-2 text-right font-mono">{r.Points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="⬆⬇ 位置變化">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">車手</th>
                  <th className="text-center py-2">起跑</th>
                  <th className="text-center py-2">完賽</th>
                  <th className="text-right py-2">得失</th>
                </tr>
              </thead>
              <tbody>
                {posChanges.slice(0, 10).map((r: any) => (
                  <tr key={r.Abbreviation} className="border-b border-gray-700/30 hover:bg-white/5 text-white">
                    <td className="py-2 font-semibold">{r.Abbreviation}</td>
                    <td className="py-2 text-center font-mono">P{r.GridPosition}</td>
                    <td className="py-2 text-center font-mono">P{r.Position}</td>
                    <td className={`py-2 text-right font-mono ${r.gained_positions ? 'text-green-400' : r.position_change < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                      {r.change_label}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Second Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="⚡ 最快圈速 Top 5">
          <div className="space-y-2">
            {fastestLaps.slice(0, 5).map((f: any, i: number) => (
              <div key={f.Driver} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <span className="font-semibold">{f.Driver}</span>
                  <span className="text-xs text-gray-400">{f.Compound}</span>
                </div>
                <span className="font-mono text-sm">{f.LapTime?.toFixed(3)}s</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="🏆 車手評分">
          <div className="space-y-2">
            {ratings.slice(0, 5).map((r: any, i: number) => (
              <div key={r.Driver} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-4">{i + 1}</span>
                  <span className="font-semibold">{r.Driver}</span>
                </div>
                <div className="flex gap-3 text-xs">
                  <span className="text-gray-400">{r.Consistency}%</span>
                  <span className="font-mono text-[#e10600]">{r.Score}pts</span>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="🔮 預測 vs 實際">
          <div className="space-y-2">
            {predictions.slice(0, 5).map((p: any) => (
              <div key={p.Driver} className="flex justify-between items-center p-2 rounded-lg bg-white/5">
                <span className="font-semibold text-sm">{p.Driver}</span>
                <div className="flex gap-3 text-sm font-mono">
                  <span className="text-gray-400">預測 P{p.PredictedFinish}</span>
                  <span className={`${p.ActualFinish < p.PredictedFinish ? 'text-green-400' : p.ActualFinish > p.PredictedFinish ? 'text-red-400' : 'text-gray-400'}`}>
                    實際 P{p.ActualFinish}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Tyre Strategy */}
      <Card title="🛞 輪胎策略" className="mb-8">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">車手</th>
                <th className="text-left py-2">策略</th>
                <th className="text-center py-2">停站</th>
                <th className="text-right py-2">總圈</th>
              </tr>
            </thead>
            <tbody>
              {tyreStrategy.slice(0, 10).map((t: any) => (
                <tr key={t.driver} className="border-b border-gray-700/30 hover:bg-white/5 text-white">
                  <td className="py-2 font-semibold">{t.driver}</td>
                  <td className="py-2 text-gray-300 text-xs">{t.strategy}</td>
                  <td className="py-2 text-center">{t.stops_label}</td>
                  <td className="py-2 text-right font-mono">{t.total_laps}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
