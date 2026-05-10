import { useState, useEffect } from 'react'
import {
  getDriverRatings, getPredictions,
} from '../data/f1Data'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Legend } from 'recharts'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a2e] rounded-xl p-5 border border-gray-700/50 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

export default function RatingPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getDriverRatings(),
      getPredictions(),
    ]).then(([ratings, predictions]) => {
      setData({ ratings, predictions })
      setLoading(false)
    })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen"><div className="inline-block w-8 h-8 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin" /></div>

  const { ratings, predictions } = data

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-[#e10600] rounded-full" />
          <span className="text-[#e10600] text-xs font-bold uppercase tracking-widest">評分與預測</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Driver Ratings & Predictions</h1>
        <p className="text-gray-400 mt-1">Monza 2024 — 綜合評分、比賽預測 vs 實際結果</p>
      </div>

      {/* Rating Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="🏆 車手綜合評分">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ratings} layout="vertical" margin={{ left: 30 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis type="number" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="Driver" stroke="#666" tick={{ fontSize: 11 }} width={30} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }} />
                <Bar dataKey="Score" name="評分">
                  {ratings.map((_: any, idx: number) => (
                    <Cell key={idx} fill={idx < 3 ? '#e10600' : idx < 6 ? '#ff9800' : '#1e41ff'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="🔮 預測 vs 實際（排名）">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={predictions}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="Driver" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} reversed domain={[1, 20]} />
                <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }} />
                <Legend />
                <Bar dataKey="PredictedFinish" fill="#ff9800" name="預測" />
                <Bar dataKey="ActualFinish" fill="#e10600" name="實際" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Rating Table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="📊 詳細評分表">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">排名</th>
                  <th className="text-left py-2">車手</th>
                  <th className="text-right py-2">一致性</th>
                  <th className="text-right py-2">超車</th>
                  <th className="text-right py-2">積分</th>
                  <th className="text-right py-2">總分</th>
                </tr>
              </thead>
              <tbody>
                {ratings.map((r: any, i: number) => (
                  <tr key={r.Driver} className="border-b border-gray-700/30 hover:bg-white/5 text-white">
                    <td className="py-2 font-mono text-gray-400">{i + 1}</td>
                    <td className="py-2 font-semibold">{r.Driver}</td>
                    <td className="py-2 text-right font-mono">{r.Consistency}%</td>
                    <td className={`py-2 text-right font-mono ${r.PositionsGained > 0 ? 'text-green-400' : r.PositionsGained < 0 ? 'text-red-400' : ''}`}>
                      {r.PositionsGained > 0 ? `+${r.PositionsGained}` : r.PositionsGained}
                    </td>
                    <td className="py-2 text-right font-mono">{r.Points}</td>
                    <td className="py-2 text-right font-mono font-bold text-[#e10600]">{r.Score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card title="🔮 預測誤差分析">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 border-b border-gray-700">
                  <th className="text-left py-2">車手</th>
                  <th className="text-right py-2">預測</th>
                  <th className="text-right py-2">實際</th>
                  <th className="text-right py-2">誤差</th>
                  <th className="text-right py-2">積分</th>
                </tr>
              </thead>
              <tbody>
                {predictions.map((p: any) => {
                  const error = p.PredictedFinish - p.ActualFinish
                  return (
                    <tr key={p.Driver} className="border-b border-gray-700/30 hover:bg-white/5 text-white">
                      <td className="py-2 font-semibold">{p.Driver}</td>
                      <td className="py-2 text-right font-mono">P{p.PredictedFinish}</td>
                      <td className="py-2 text-right font-mono">P{p.ActualFinish}</td>
                      <td className={`py-2 text-right font-mono ${
                        error > 0 ? 'text-red-400' : error < 0 ? 'text-green-400' : 'text-gray-400'
                      }`}>
                        {error > 0 ? `-${error}` : error < 0 ? `+${Math.abs(error)}` : '0'}
                      </td>
                      <td className="py-2 text-right font-mono">{p.Points}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
