import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import LapsPage from './pages/LapsPage'
import WeatherTyrePage from './pages/WeatherTyrePage'
import TelemetryPage from './pages/TelemetryPage'
import RatingPage from './pages/RatingPage'
import GpsPage from './pages/GpsPage'

function NavBar() {
  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-lg text-sm font-semibold transition-colors ${
      isActive ? 'bg-[#E10600] text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
    }`

  return (
    <nav className="bg-[#111] border-b border-gray-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">🏎️</span>
          <span className="text-white font-bold text-sm">F1 Monza 2024</span>
        </div>
        <div className="flex gap-1 overflow-x-auto">
          <NavLink to="/dashboard" className={linkClass}>儀表板</NavLink>
          <NavLink to="/laps" className={linkClass}>圈速</NavLink>
          <NavLink to="/weather-tyre" className={linkClass}>天氣/輪胎</NavLink>
          <NavLink to="/telemetry" className={linkClass}>遙測</NavLink>
          <NavLink to="/ratings" className={linkClass}>評分/預測</NavLink>
          <NavLink to="/gps" className={linkClass}>GPS 動畫</NavLink>
        </div>
      </div>
    </nav>
  )
}

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#15151E]">
        <NavBar />
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/laps" element={<LapsPage />} />
          <Route path="/weather-tyre" element={<WeatherTyrePage />} />
          <Route path="/telemetry" element={<TelemetryPage />} />
          <Route path="/ratings" element={<RatingPage />} />
          <Route path="/gps" element={<GpsPage />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App