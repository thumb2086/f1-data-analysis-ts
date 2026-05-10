import { useState, useEffect, useRef, useCallback } from 'react'
import {
  loadLocations, getDriversList, getDriverColor, normalizeLocations, getTimeRange,
} from '../data/f1Data'
import { Map, Play, Pause, RotateCcw, SkipForward, SkipBack } from 'lucide-react'

function Card({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-[#1E1E2A] rounded-xl p-5 border border-[#38383F] ${className}`}>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">{title}</h2>
      {children}
    </div>
  )
}

const CANVAS_W = 800
const CANVAS_H = 600
const TRACK_COLOR = '#38383F'
const BG_COLOR = '#15151E'
const LABEL_W = 34
const LABEL_H = 18

type LabelRect = {
  x: number
  y: number
  w: number
  h: number
  anchorX: number
  anchorY: number
  driver: string
  color: string
}

function rectsOverlap(a: LabelRect, b: LabelRect) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function clampLabel(rect: LabelRect) {
  return {
    ...rect,
    x: Math.max(4, Math.min(CANVAS_W - rect.w - 4, rect.x)),
    y: Math.max(4, Math.min(CANVAS_H - rect.h - 4, rect.y)),
  }
}

function placeDriverLabel(
  driver: string,
  color: string,
  cx: number,
  cy: number,
  placed: LabelRect[],
) {
  const candidates = [
    { dx: -LABEL_W / 2, dy: -30 },
    { dx: 12, dy: -22 },
    { dx: -LABEL_W - 12, dy: -22 },
    { dx: 12, dy: 6 },
    { dx: -LABEL_W - 12, dy: 6 },
    { dx: -LABEL_W / 2, dy: 14 },
    { dx: 20, dy: -4 },
    { dx: -LABEL_W - 20, dy: -4 },
  ]

  for (const candidate of candidates) {
    const rect = clampLabel({
      x: cx + candidate.dx,
      y: cy + candidate.dy,
      w: LABEL_W,
      h: LABEL_H,
      anchorX: cx,
      anchorY: cy,
      driver,
      color,
    })
    if (!placed.some(existing => rectsOverlap(rect, existing))) return rect
  }

  let fallback = clampLabel({
    x: cx - LABEL_W / 2,
    y: cy - 30,
    w: LABEL_W,
    h: LABEL_H,
    anchorX: cx,
    anchorY: cy,
    driver,
    color,
  })
  while (placed.some(existing => rectsOverlap(fallback, existing)) && fallback.y < CANVAS_H - LABEL_H - 4) {
    fallback = { ...fallback, y: fallback.y + LABEL_H + 3 }
  }
  return fallback
}

export default function GpsPage() {
  const [locs, setLocs] = useState<any[]>([])
  const [drivers, setDrivers] = useState<string[]>([])
  const [bounds, setBounds] = useState<any>(null)
  const [timeRange, setTimeRange] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [currentT, setCurrentT] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [selectedDrivers, setSelectedDrivers] = useState<string[]>([])
  const [showAll, setShowAll] = useState(true)

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animRef = useRef<number>(0)
  const lastFrameRef = useRef<number>(0)

  useEffect(() => {
    Promise.all([loadLocations(), getDriversList()]).then(([locationData, driverList]) => {
      setLocs(locationData)
      setDrivers(driverList)
      setSelectedDrivers(driverList)
      setBounds(normalizeLocations(locationData))
      setTimeRange(getTimeRange(locationData))
      setCurrentT(getTimeRange(locationData).min)
      setLoading(false)
    })
  }, [])

  // 繪製賽道 + 車手
  const draw = useCallback((t: number) => {
    const canvas = canvasRef.current
    if (!canvas || !bounds || locs.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const { minX, maxX, minY, maxY } = bounds
    const pad = 30
    const scaleX = (CANVAS_W - pad * 2) / (maxX - minX || 1)
    const scaleY = (CANVAS_H - pad * 2) / (maxY - minY || 1)
    const scale = Math.min(scaleX, scaleY)

    const toCanvas = (x: number, y: number) => ({
      cx: (x - minX) * scale + pad,
      cy: CANVAS_H - ((y - minY) * scale + pad),
    })

    ctx.fillStyle = BG_COLOR
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    // 畫所有軌跡（所有車手的 GPS 點）
    ctx.strokeStyle = TRACK_COLOR
    ctx.lineWidth = 1
    ctx.globalAlpha = 0.3

    const displayDrivers = showAll ? drivers : selectedDrivers
    for (const d of displayDrivers) {
      const driverLocs = locs.filter(l => l.driver === d && l.t <= t)
      if (driverLocs.length < 2) continue
      ctx.beginPath()
      const start = toCanvas(driverLocs[0].x, driverLocs[0].y)
      ctx.moveTo(start.cx, start.cy)
      for (let i = 1; i < driverLocs.length; i++) {
        const p = toCanvas(driverLocs[i].x, driverLocs[i].y)
        ctx.lineTo(p.cx, p.cy)
      }
      ctx.stroke()
    }

    // 畫目前位置
    ctx.globalAlpha = 1
    const currentLocs = locs.filter(l => l.t === t)
    const labels: LabelRect[] = []
    for (const loc of currentLocs) {
      if (!showAll && !selectedDrivers.includes(loc.driver)) continue
      const color = getDriverColor(loc.driver)
      const { cx, cy } = toCanvas(loc.x, loc.y)

      ctx.beginPath()
      ctx.arc(cx, cy, 6, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 2
      ctx.stroke()

      labels.push(placeDriverLabel(loc.driver, color, cx, cy, labels))
    }

    ctx.font = 'bold 11px Inter, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (const label of labels) {
      const labelCenterX = label.x + label.w / 2
      const labelCenterY = label.y + label.h / 2
      const isOffset = Math.abs(labelCenterX - label.anchorX) > 8 || Math.abs(labelCenterY - label.anchorY) > 18

      if (isOffset) {
        ctx.beginPath()
        ctx.moveTo(label.anchorX, label.anchorY)
        ctx.lineTo(labelCenterX, labelCenterY)
        ctx.strokeStyle = 'rgba(255,255,255,0.35)'
        ctx.lineWidth = 1
        ctx.stroke()
      }

      ctx.fillStyle = 'rgba(10,10,18,0.88)'
      ctx.strokeStyle = label.color
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.roundRect(label.x, label.y, label.w, label.h, 5)
      ctx.fill()
      ctx.stroke()

      ctx.fillStyle = '#fff'
      ctx.fillText(label.driver, labelCenterX, labelCenterY + 0.5)
    }

    // 時間標籤
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.font = '12px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`t = ${t}`, CANVAS_W - pad, 20)
  }, [locs, drivers, bounds, showAll, selectedDrivers])

  // 動畫 loop
  useEffect(() => {
    if (!playing || !timeRange) return
    const frameIntervalMs = 160 / speed

    const animate = (timestamp: number) => {
      if (!lastFrameRef.current) lastFrameRef.current = timestamp
      const elapsed = timestamp - lastFrameRef.current
      if (elapsed < frameIntervalMs) {
        animRef.current = requestAnimationFrame(animate)
        return
      }
      lastFrameRef.current = timestamp

      setCurrentT(prev => {
        const next = prev + 1
        if (next > timeRange.max) {
          setPlaying(false)
          return timeRange.min
        }
        return next
      })
      animRef.current = requestAnimationFrame(animate)
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [playing, timeRange, speed])

  // 繪製 currentT
  useEffect(() => {
    if (!loading) draw(currentT)
  }, [currentT, loading, draw])

  if (loading) return <div className="flex items-center justify-center h-screen bg-[#15151E]"><div className="animate-spin w-8 h-8 border-4 border-[#E10600] border-t-transparent rounded-full" /></div>

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="mb-6 border-l-4 border-[#E10600] pl-4">
        <div className="flex items-center gap-2 mb-1">
          <Map className="w-5 h-5 text-[#E10600]" />
          <span className="text-[#E10600] text-xs font-bold uppercase tracking-widest">GPS 賽車動畫</span>
        </div>
        <h1 className="text-3xl font-bold text-white">實時賽車追蹤</h1>
        <p className="text-gray-400 mt-1">Monza 2024 — 20 車手 GPS 位置動畫（{timeRange?.max} 幀）</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 控制面板 */}
        <div className="space-y-4">
          <Card title="🎮 控制">
            <div className="flex gap-2 mb-4">
              <button onClick={() => { setCurrentT(timeRange.min); setPlaying(false) }}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white">
                <RotateCcw className="w-4 h-4" />
              </button>
              <button onClick={() => { const t = Math.max(timeRange.min, currentT - 50); setCurrentT(t) }}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white">
                <SkipBack className="w-4 h-4" />
              </button>
              <button onClick={() => setPlaying(!playing)}
                className={`p-2 rounded-lg ${playing ? 'bg-[#E10600] text-white' : 'bg-gray-800 hover:bg-gray-700 text-white'}`}>
                {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <button onClick={() => { const t = Math.min(timeRange.max, currentT + 50); setCurrentT(t) }}
                className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white">
                <SkipForward className="w-4 h-4" />
              </button>
            </div>
            <div className="text-sm text-gray-400 mb-2">速度：{speed.toFixed(1)}x</div>
            <input type="range" min="0.2" max="5" step="0.2" value={speed}
              onChange={e => setSpeed(parseFloat(e.target.value))}
              className="w-full accent-[#E10600]" />
            <div className="text-sm text-gray-400 mt-2">
              幀：{currentT} / {timeRange?.max}
            </div>
            <input type="range" min={timeRange?.min || 0} max={timeRange?.max || 1} step={1}
              value={currentT} onChange={e => { setCurrentT(parseInt(e.target.value)); setPlaying(false) }}
              className="w-full accent-[#E10600] mt-1" />
          </Card>

          <Card title="🏎️ 顯示車手">
            <label className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <input type="checkbox" checked={showAll} onChange={() => { setShowAll(!showAll); setSelectedDrivers(drivers) }}
                className="accent-[#E10600]" />
              全部顯示
            </label>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {drivers.map(d => (
                <label key={d} className="flex items-center gap-2 text-sm text-white cursor-pointer">
                  <input type="checkbox" checked={selectedDrivers.includes(d)}
                    onChange={() => {
                      setSelectedDrivers(prev =>
                        prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d]
                      )
                      setShowAll(false)
                    }}
                    className="accent-[#E10600]" />
                  <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: getDriverColor(d) }} />
                  {d}
                </label>
              ))}
            </div>
          </Card>
        </div>

        {/* Canvas */}
        <div className="lg:col-span-3">
          <Card title={`📍 Monza 賽道 — ${showAll ? '所有車手' : `${selectedDrivers.length} 位車手`}`}>
            <canvas ref={canvasRef} width={CANVAS_W} height={CANVAS_H}
              className="w-full rounded-lg border border-[#38383F]" />
          </Card>
        </div>
      </div>
    </div>
  )
}
