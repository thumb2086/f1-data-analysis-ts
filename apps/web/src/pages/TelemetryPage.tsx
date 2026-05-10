import { useState, useEffect, useMemo } from 'react'
import {
  getThrottleBrakeAnalysis, getSpeedProfile, getGearTimeDistribution,
  loadAvailableTelemetryDrivers, getDriverColor,
} from '../data/f1Data'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1a1a2e] rounded-xl p-5 border border-gray-700/50 ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

const TELEMETRY_LABELS: Record<string, string> = { Speed: '速度', Throttle: '油門', RPM: '轉速', nGear: '檔位' }
const DEFAULT_COMPARE = ['LEC', 'PIA', 'NOR', 'SAI', 'HAM', 'VER']

export default function TelemetryPage() {
  const [data, setData] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [selectedDriver, setSelectedDriver] = useState('VER')
  const [availableDrivers, setAvailableDrivers] = useState<string[]>(['VER'])
  const [compareDrivers, setCompareDrivers] = useState<string[]>(['VER'])
  const [comparison, setComparison] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadAvailableTelemetryDrivers().then(drivers => {
      setAvailableDrivers(drivers)
      if (!drivers.includes(selectedDriver)) setSelectedDriver(drivers[0] || 'VER')
      const defaults = DEFAULT_COMPARE.filter(d => drivers.includes(d))
      setCompareDrivers(defaults.length > 0 ? defaults : drivers.slice(0, 6))
    })
  }, [])

  useEffect(() => {
    if (!availableDrivers.includes(selectedDriver)) return
    setLoading(true)
    setError(null)
    Promise.all([
      getThrottleBrakeAnalysis(selectedDriver),
      getSpeedProfile(selectedDriver),
      getGearTimeDistribution(selectedDriver),
    ]).then(([telemetry, speedProfile, gearDist]) => {
      if (!telemetry || telemetry.total_points === 0) {
        setError(`${selectedDriver} 沒有遙測資料`)
        setLoading(false)
        return
      }
      setData({ telemetry, speedProfile, gearDist })
      setLoading(false)
    }).catch(e => {
      setError(`載入失敗: ${e.message}`)
      setLoading(false)
    })
  }, [selectedDriver, availableDrivers])

  useEffect(() => {
    if (compareDrivers.length === 0) {
      setComparison([])
      return
    }
    Promise.all(compareDrivers.map(driver => getThrottleBrakeAnalysis(driver)))
      .then(rows => setComparison(rows.filter(row => row.total_points > 0)))
  }, [compareDrivers])

  const toggleCompareDriver = (driver: string) => {
    setCompareDrivers(prev =>
      prev.includes(driver) ? prev.filter(d => d !== driver) : [...prev, driver]
    )
  }

  const comparisonRows = useMemo(() => comparison.map(row => ({
    driver: row.driver,
    avg_speed: Number(row.avg_speed?.toFixed(1) ?? 0),
    max_speed: Number(row.max_speed?.toFixed(1) ?? 0),
    full_throttle_pct: Number(row.full_throttle_pct?.toFixed(1) ?? 0),
    braking_pct: Number(row.braking_pct?.toFixed(1) ?? 0),
    drs_active_pct: Number(row.drs_active_pct?.toFixed(1) ?? 0),
  })), [comparison])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="inline-block w-8 h-8 border-4 border-[#e10600] border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
          <p className="text-red-400 text-lg">{error}</p>
        </div>
      </div>
    )
  }

  const { telemetry, speedProfile, gearDist } = data

  // 駕駛風格圓餅圖資料
  const pieData = [
    { name: '全油門', value: Math.max(0, telemetry.full_throttle_pct), color: '#00d2be' },
    { name: '煞車', value: Math.max(0, telemetry.braking_pct), color: '#e10600' },
    { name: '滑行', value: Math.max(0, telemetry.coasting_pct), color: '#ff9800' },
  ]

  // DRS 另外顯示
  const drsPct = Math.max(0, telemetry.drs_active_pct)

  // 檔位分佈（長條圖用）
  const gearData = Object.entries(gearDist.gear_distribution || {})
    .map(([gear, info]: any) => ({
      gear: `G${gear}`,
      pct: parseFloat(info.pct.toFixed(1)),
      count: info.count,
    }))
    .sort((a, b) => parseInt(a.gear.replace('G', ''), 10) - parseInt(b.gear.replace('G', ''), 10))

  // 速度曲線 — 取樣以免點太多
  const sampledSpeed = speedProfile.filter((_: any, i: number) => i % 3 === 0)

  // 偵測 Distance 是否過小（有些 CSV 的 Distance 是 0~x 米，有些是 RelativeDistance）
  const maxDistance = Math.max(0, ...speedProfile.map((d: any) => d.Distance || 0))
  const useDistance = maxDistance > 100

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-2 h-2 bg-[#e10600] rounded-full" />
          <span className="text-[#e10600] text-xs font-bold uppercase tracking-widest">遙測分析</span>
        </div>
        <h1 className="text-3xl font-bold text-white">Telemetry Analysis</h1>
        <p className="text-gray-400 mt-1">Monza 2024 — 速度、油門、煞車、檔位</p>
      </div>

      {/* 車手選擇器 */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-3 mb-2">
          <label className="text-sm text-gray-400">主要車手</label>
          <span className="text-xs text-gray-500">Telemetry CSV: {availableDrivers.length} 位車手</span>
        </div>
        <div className="flex flex-wrap gap-2 mt-1">
          {availableDrivers.map(d => (
            <button
              key={d}
              onClick={() => setSelectedDriver(d)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors ${
                selectedDriver === d ? 'bg-[#e10600] text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      <Card title="🧭 多車手比較選擇" className="mb-8">
        <div className="flex flex-wrap gap-2">
          {availableDrivers.map(d => (
            <button
              key={d}
              onClick={() => toggleCompareDriver(d)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                compareDrivers.includes(d)
                  ? 'text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
              style={compareDrivers.includes(d) ? { backgroundColor: getDriverColor(d) } : undefined}
            >
              {d}
            </button>
          ))}
        </div>
      </Card>

      {/* 第一行：速度曲線（佔大） + 駕駛風格 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* 速度曲線 — Streamlit 版是 Distance vs Speed + 檔位 overlay */}
        <Card title={`📈 ${selectedDriver} 速度曲線 + 檔位標記`} className="lg:col-span-2">
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sampledSpeed} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis
                  dataKey={useDistance ? 'Distance' : 'RelativeDistance'}
                  stroke="#666" tick={{ fontSize: 10 }}
                  label={{ value: useDistance ? '距離 (m)' : '賽道距離比例', position: 'insideBottom', offset: -5, fill: '#666', fontSize: 11 }}
                />
                <YAxis
                  yAxisId="speed"
                  stroke="#00d2be" tick={{ fontSize: 10 }}
                  domain={[0, 'auto']}
                  label={{ value: '速度 (km/h)', angle: -90, position: 'insideLeft', fill: '#00d2be', fontSize: 11 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                  formatter={(value, name) => [value, TELEMETRY_LABELS[String(name)] || String(name ?? '')]}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="speed" type="monotone" dataKey="Speed" stroke="#00d2be" dot={false} strokeWidth={2.5} name="速度" />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-gray-500">
            <span>⚡ 平均 {telemetry.avg_speed?.toFixed(0)} km/h</span>
            <span>🔥 極速 {telemetry.max_speed?.toFixed(0)} km/h</span>
            <span>🔄 均轉 {telemetry.avg_rpm?.toFixed(0)} RPM</span>
          </div>
        </Card>

        {/* 駕駛風格圓餅圖 */}
        <Card title="🎮 駕駛風格">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%" cy="50%"
                  innerRadius={40} outerRadius={70}
                  dataKey="value"
                  label={({ value }) => value > 3 ? `${value.toFixed(1)}%` : ''}
                >
                  {pieData.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} verticalAlign="bottom" />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 text-center text-xs text-gray-500">
            DRS 使用: {drsPct.toFixed(1)}%
          </div>
        </Card>
      </div>

      {/* 第二行：檔位 + 圖表 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* 檔位分佈長條圖 — Streamlit 版是 Pie，但我改成長條圖更直觀 */}
        <Card title="🔧 檔位使用時間佔比">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gearData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="gear" stroke="#666" tick={{ fontSize: 11 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} unit="%" domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                  formatter={(value) => [`${(value as number).toFixed(1)}%`, '佔比']}
                />
                <Bar dataKey="pct" name="佔比" fill={getDriverColor(selectedDriver)}>
                  {gearData.map((_: any, idx: number) => (
                    <Cell key={idx} fill={idx % 2 === 0 ? getDriverColor(selectedDriver) : '#8B8D97'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* 油門/煞車/滑行長條圖 — 像 Streamlit 版那樣 */}
        <Card title="📊 油門/煞車/滑行/DRS 比例">
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: '全油門\n(≥95%)', value: telemetry.full_throttle_pct, fill: '#00d2be' },
                  { name: '煞車', value: telemetry.braking_pct, fill: '#e10600' },
                  { name: '滑行', value: telemetry.coasting_pct, fill: '#ff9800' },
                  { name: 'DRS 啟用', value: telemetry.drs_active_pct, fill: '#1e41ff' },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="name" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                  formatter={(value: any) => [`${(value as number).toFixed(1)}%`, '比例']}
                />
                <Bar dataKey="value" name="比例">
                  <Cell fill="#00d2be" />
                  <Cell fill="#e10600" />
                  <Cell fill="#ff9800" />
                  <Cell fill="#1e41ff" />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card title="🏎️ 車手速度比較">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="driver" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} unit=" km/h" domain={[0, 'auto']} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                  formatter={(value, name) => [`${value} km/h`, name === 'avg_speed' ? '平均速度' : '最高速度']}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="avg_speed" name="平均速度">
                  {comparisonRows.map((row: any) => <Cell key={row.driver} fill={getDriverColor(row.driver)} />)}
                </Bar>
                <Bar dataKey="max_speed" name="最高速度" fill="#8B8D97" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="🎛️ 油門 / 煞車 / DRS 比較">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparisonRows}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <XAxis dataKey="driver" stroke="#666" tick={{ fontSize: 10 }} />
                <YAxis stroke="#666" tick={{ fontSize: 10 }} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                  formatter={(value, name) => {
                    const labels: Record<string, string> = {
                      full_throttle_pct: '全油門',
                      braking_pct: '煞車',
                      drs_active_pct: 'DRS',
                    }
                    return [`${value}%`, labels[String(name)] || String(name)]
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="full_throttle_pct" name="全油門" fill="#00d2be" />
                <Bar dataKey="braking_pct" name="煞車" fill="#e10600" />
                <Bar dataKey="drs_active_pct" name="DRS" fill="#3671C6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* 第三行：全資料速度 + 轉速疊加 scatter (像 Streamlit 版的多資訊 overlay) */}
      <Card title={`📊 ${selectedDriver} — 速度 vs 距離 + 檔位標記`} className="mb-8">
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={speedProfile} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis
                dataKey={useDistance ? 'Distance' : 'RelativeDistance'}
                stroke="#666" tick={{ fontSize: 10 }}
                label={{ value: useDistance ? '距離 (m)' : '賽道距離比例', position: 'insideBottom', offset: -10, fill: '#666', fontSize: 11 }}
              />
              <YAxis
                yAxisId="speed"
                stroke="#00d2be" tick={{ fontSize: 10 }}
                domain={[0, 'auto']}
                label={{ value: '速度 (km/h)', angle: -90, position: 'insideLeft', fill: '#00d2be', fontSize: 11 }}
              />
              <YAxis
                yAxisId="throttle"
                orientation="right"
                stroke="#e10600" tick={{ fontSize: 10 }}
                domain={[0, 120]}
                label={{ value: 'Throttle %', angle: 90, position: 'insideRight', fill: '#e10600', fontSize: 11 }}
              />
              <Tooltip
                contentStyle={{ backgroundColor: '#1e1e2e', border: '1px solid #444', borderRadius: 8 }}
                formatter={(value, name) => [value, TELEMETRY_LABELS[String(name)] || String(name ?? '')]}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line yAxisId="speed" type="monotone" dataKey="Speed" stroke="#00d2be" dot={false} strokeWidth={2.5} name="Speed" />
              <Line yAxisId="throttle" type="monotone" dataKey="Throttle" stroke="#e10600" dot={false} strokeWidth={1.5} name="Throttle" opacity={0.6} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-2 text-xs text-gray-500">
          藍線 = 速度 (km/h) | 紅線 = 油門開度 (%) | hover 看詳細數據
        </div>
      </Card>

      {/* 區段速度摘要 */}
      <Card title="📍 速度摘要">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: '總資料點', value: telemetry.total_points, unit: '' },
            { label: '平均速度', value: telemetry.avg_speed?.toFixed(0), unit: 'km/h' },
            { label: '最高速度', value: telemetry.max_speed?.toFixed(0), unit: 'km/h' },
            { label: '平均轉速', value: telemetry.avg_rpm?.toFixed(0), unit: 'RPM' },
            { label: '最高轉速', value: telemetry.max_rpm?.toFixed(0), unit: 'RPM' },
            { label: 'DRS 比例', value: drsPct.toFixed(1), unit: '%' },
          ].map((stat, i) => (
            <div key={i} className="bg-white/5 rounded-lg p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">{stat.label}</p>
              <p className="text-lg font-bold text-white">{stat.value}<span className="text-xs text-gray-500 ml-1">{stat.unit}</span></p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
