import { Navigate, Route, Routes } from 'react-router-dom'
import { FocusScreen } from '../features/focus/FocusScreen'
import { SettingsScreen } from '../features/settings/SettingsScreen'
import { ShopScreen } from '../features/shop/ShopScreen'
import { StatsScreen } from '../features/stats/StatsScreen'
import { TankScreen } from '../features/tank/TankScreen'
import { ClockProvider } from './ClockProvider'
import { NavBar } from './NavBar'

export function App() {
  return (
    <ClockProvider>
      <NavBar />
      <main className="app-content">
        <Routes>
          <Route path="/" element={<FocusScreen />} />
          <Route path="/acquario" element={<TankScreen />} />
          <Route path="/negozio" element={<ShopScreen />} />
          <Route path="/statistiche" element={<StatsScreen />} />
          <Route path="/impostazioni" element={<SettingsScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </ClockProvider>
  )
}
