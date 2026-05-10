import { useState, useEffect } from 'react'
import {
  getFastestLaps, getDriverLapTimes, getLapTimeEvolution, getLapConsistency,
  getFinalStandings, getDriverColor,
} from '../data/f1Data'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a2e] rounded-xl p-5 border border-gray-700/50 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function LapsPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState('VER')
  const [compareDrivers, setCompareDrivers] = useState<string[]>(['VER', 'LEC', 'NOR'])

  useEffect(() => {
    Promise.all([
      getFastestLaps(),
      getFinalStandings(),
      getLapConsistency(selectedDriver),
      getDriverLapTimes(selectedDriver),
      getLapTimeEvolution(compareDrivers),
    ]).then(([fastest, standings, consistency, driverLaps, evolution]) => {
      setData({ fastest, standings, consistency, driverLaps, evolution })
      setLoading(false)
    })
  }, [selectedDriver, compareDrivers])

  const toggleDriver = (d: string) => {
    setCompareDrivers(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
    )
  }

  const selectDriverForCompare = (d: string) => {
    setSelectedDriver(d)
    setCompareDrivers(prev => prev.includes(d) ? prev : [...prev, d])
  }

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="inline-block w-8 h-8 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin" /></div>

  const { fastest, standings, consistency, driverLaps, evolution } = data
  const drivers = standings.map((r: any) => r.Abbreviation)
  const evolutionRows = Array.from(
    evolution.reduce((rows: Map<number, any>, item: any) => {
      const row = rows.get(item.LapNumber) || { LapNumber: item.LapNumber }
      row[item.Driver] = item.LapTime
      rows.set(item.LapNumber, row)
      return rows
    }, new Map<number, any>()).values()
  ).sort((a: any, b: any) => a.LapNumber - b.LapNumber)

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-[#e10600] rounded-full" />
          <span className="text-[#e10600] text-xs font-bold uppercase tracking-widest">圈速分析</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Lap Time Analysis</h1>
        <p className="text-gray-400 mt-1">Monza 2024 — 圈速比較、一致性、演進趨勢</p>
      </div>

      {/* Fastest Laps */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card title="⚡ 最快圈速排行">
          <div className="space-y-1.5">
            {fastest.slice(0, 10).map((f: any, i: number) => (
              <button
                key={f.Driver}
                type="button"
                onClick={() => selectDriverForCompare(f.Driver)}
                className={`w-full flex justify-between items-center p-2 rounded-lg text-sm text-left transition-colors ${
                  f.Driver === selectedDriver ? 'bg-[#e10600]/20 ring-1 ring-[#e10600]/60' : 'bg-white/5 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5">{i + 1}</span>
                  <span className={`font-semibold ${f.Driver === selectedDriver ? 'text-[#e10600]' : 'text-white'}`}>
                    {f.Driver}
                  </span>
                  <span className="text-xs text-gray-500">{f.Compound}</span>
                </div>
                <div className="flex gap-3 text-xs font-mono">
                  <span className="text-white">{f.LapTime?.toFixed(3)}s</span>
                  <span className="text-gray-400">L{f.LapNumber}</span>
                </div>
              </button>
            ))}
          </div>
        </Card>

        <Card title={`🔍 ${selectedDriver} 圈速詳情`}>
          <div className="mb-3">
            <select
              value={selectedDriver}
              onChange={e => setSelectedDriver(e.target.value)}
              className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-1.5 text-sm w-full"
            >
              {drivers.map((d: string) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {consistency && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">平均圈速</span>
                <span className="font-mono">{consistency.mean?.toFixed(3)}s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">標準差</span>
                <span className="font-mono">{consistency.std?.toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">變異係數</span>
                <span className="font-mono">{consistency.cv?.toFixed(2)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">最快 / 最慢</span>
                <span className="font-mono">{consistency.min?.toFixed(3)} / {consistency.max?.toFixed(3)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">有效圈數</span>
                <span className="font-mono">{consistency.lapsCount}</span>
              </div>
            </div>
          )}
        </Card>

        <Card title="📈 單圈速度走勢">
          {driverLaps?.length > 0 && (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={driverLaps}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="LapNumber" stroke="#666" tick={{ fontSize: 10 }} />
                  <YAxis domain={['dataMin - 0.5', 'dataMax + 0.5']} stroke="#666" tick={{ fontSize: 10 }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                    labelStyle={{ color: '#ccc' }}
                  />
                  <Line type="monotone" dataKey="LapTime" stroke="#e10600" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>
      </div>

      {/* Lap Time Evolution Comparison */}
      <Card title="🔄 車手圈速演進比較">
        <div className="mb-4 flex flex-wrap gap-2">
          {drivers.slice(0, 10).map((d: string) => (
            <button
              key={d}
              onClick={() => toggleDriver(d)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                compareDrivers.includes(d)
                  ? 'bg-[#e10600] text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={evolutionRows}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="LapNumber" stroke="#666" tick={{ fontSize: 10 }} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#666" tick={{ fontSize: 10 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                labelStyle={{ color: '#ccc' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {compareDrivers.map(d => (
                <Line
                  key={d}
                  type="monotone"
                  dataKey={d}
                  name={d}
                  stroke={getDriverColor(d)}
                  dot={false}
                  strokeWidth={d === selectedDriver ? 2.5 : 1.5}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  )
}
