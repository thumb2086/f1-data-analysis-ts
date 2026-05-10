import { useState, useEffect } from 'react'
import {
  getWeatherSummary, getTrackTempEffect, getTyreStrategy, getTyreDegradation,
} from '../data/f1Data'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a2e] rounded-xl p-5 border border-gray-700/50 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

const COMPOUND_COLORS: Record<string, string> = {
  'SOFT': '#e10600',
  'MEDIUM': '#ffd700',
  'HARD': '#999',
  'INTERMEDIATE': '#00a86b',
  'WET': '#1e41ff',
}

export default function WeatherTyrePage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getWeatherSummary(),
      getTrackTempEffect(),
      getTyreStrategy(),
      getTyreDegradation(),
    ]).then(([weather, trackEffect, tyreStrategy, tyreDeg]) => {
      setData({ weather, trackEffect, tyreStrategy, tyreDeg })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="inline-block w-8 h-8 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin" /></div>

  const { weather, trackEffect, tyreStrategy, tyreDeg } = data

  // Aggregate tyre deg by compound
  const degByCompound: Record<string, number[]> = {}
  for (const d of tyreDeg) {
    if (!degByCompound[d.compound]) degByCompound[d.compound] = []
    degByCompound[d.compound].push(d.deg_sec_per_lap)
  }
  const degChart = Object.entries(degByCompound).map(([compound, vals]) => ({
    compound,
    avgDeg: vals.reduce((a, b) => a + b, 0) / vals.length,
    count: vals.length,
  }))

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-[#e10600] rounded-full" />
          <span className="text-[#e10600] text-xs font-bold uppercase tracking-widest">環境與輪胎</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Weather & Tyre Analysis</h1>
        <p className="text-gray-400 mt-1">Monza 2024 — 天氣影響、輪胎策略、衰退率</p>
      </div>

      {/* Weather Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-8">
        <Card title="🌡️ 氣溫">
          <p className="text-3xl font-bold text-white">{weather.air_temp?.avg?.toFixed(1)}°C</p>
          <p className="text-gray-400 text-sm">範圍 {weather.air_temp?.min}~{weather.air_temp?.max}°C</p>
        </Card>
        <Card title="🔥 賽道溫度">
          <p className="text-3xl font-bold text-[#ff6b35]">{weather.track_temp?.avg?.toFixed(1)}°C</p>
          <p className="text-gray-400 text-sm">範圍 {weather.track_temp?.min}~{weather.track_temp?.max}°C</p>
        </Card>
        <Card title="💧 濕度">
          <p className="text-3xl font-bold text-[#1e90ff]">{weather.humidity?.avg?.toFixed(0)}%</p>
          <p className="text-gray-400 text-sm">範圍 {weather.humidity?.min}~{weather.humidity?.max}%</p>
        </Card>
        <Card title="🌧️ 降雨">
          <p className={`text-3xl font-bold ${weather.rainfall ? 'text-[#1e90ff]' : 'text-[#ffd700]'}`}>
            {weather.rainfall ? '有雨' : '無雨'}
          </p>
          <p className="text-gray-400 text-sm">資料點: {weather.records_count}</p>
        </Card>
      </div>

      {/* Track Temp Effect */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="🌡️ 賽道溫度 vs 圈速">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trackEffect.slice(0, 100)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="LapNumber" stroke="#666" tick={{ fontSize: 10 }} label={{ value: '圈數', position: 'insideBottom', offset: -5, fill: '#666', fontSize: 10 }} />
                <YAxis yAxisId="left" stroke="#ff6b35" tick={{ fontSize: 10 }} label={{ value: '賽道溫度 °C', angle: -90, position: 'insideLeft', fill: '#ff6b35', fontSize: 10 }} />
                <YAxis yAxisId="right" orientation="right" stroke="#e10600" tick={{ fontSize: 10 }} label={{ value: '圈速 (s)', angle: 90, position: 'insideRight', fill: '#e10600', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }} />
                <Line yAxisId="left" type="monotone" dataKey="TrackTemp" stroke="#ff6b35" dot={false} strokeWidth={2} name="賽道溫度" />
                <Line yAxisId="right" type="monotone" dataKey="LapTimeSeconds" stroke="#e10600" dot={false} strokeWidth={1.5} name="圈速" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="🛞 輪胎衰退率（每圈秒數）">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={degChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="compound" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} label={{ value: '秒/圈', angle: -90, position: 'insideLeft', fill: '#666', fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }} />
                <Bar dataKey="avgDeg" name="平均衰退率">
                  {degChart.map((entry: any, idx: number) => (
                    <Cell key={idx} fill={COMPOUND_COLORS[entry.compound] || '#999'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Tyre Strategy */}
      <Card title="🛞 輪胎策略一覽">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-400 border-b border-gray-700">
                <th className="text-left py-2">排名</th>
                <th className="text-left py-2">車手</th>
                <th className="text-left py-2">策略</th>
                <th className="text-center py-2">停站</th>
                <th className="text-right py-2">總圈數</th>
              </tr>
            </thead>
            <tbody>
              {tyreStrategy.map((t: any) => (
                <tr key={t.driver} className="border-b border-gray-700/30 hover:bg-white/5 text-white">
                  <td className="py-2 text-gray-400 font-mono">{t.final_position ?? '-'}</td>
                  <td className="py-2 font-semibold">{t.driver}</td>
                  <td className="py-2 text-gray-300 text-xs font-mono">{t.strategy}</td>
                  <td className="py-2 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                      t.n_stops <= 1 ? 'bg-green-900/50 text-green-400' :
                      t.n_stops === 2 ? 'bg-yellow-900/50 text-yellow-400' :
                      'bg-red-900/50 text-red-400'
                    }`}>
                      {t.stops_label}
                    </span>
                  </td>
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
