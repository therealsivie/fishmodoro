import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isFocusActive } from '../domain/timer'
import { useGameStore } from '../store/gameStore'

const ITEMS = [
  { to: '/', key: 'focus', icon: '⏱' },
  { to: '/acquario', key: 'tank', icon: '🐟' },
  { to: '/negozio', key: 'shop', icon: '🛒' },
  { to: '/statistiche', key: 'stats', icon: '📊' },
  { to: '/impostazioni', key: 'settings', icon: '⚙️' },
] as const

export function NavBar() {
  const { t } = useTranslation()
  const shopLocked = useGameStore((state) => isFocusActive(state.timer))

  return (
    <nav className="nav-bar" aria-label={t('nav.label')}>
      {ITEMS.map(({ to, key, icon }) => {
        const locked = key === 'shop' && shopLocked
        const label = locked ? t('nav.shopLocked') : t(`nav.${key}`)
        return (
          <Link key={key} to={to} className="nav-bar__link" aria-label={label} title={label}>
            <span aria-hidden="true">{icon}</span>
            {locked && <span aria-hidden="true">🔒</span>}
          </Link>
        )
      })}
    </nav>
  )
}
