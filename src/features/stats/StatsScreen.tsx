import { useTranslation } from 'react-i18next'
import { useNow } from '../../app/useNow'
import { formatDuration } from '../../domain/format'
import { currentStreak, lastDays } from '../../domain/stats'
import { useGameStore } from '../../store/gameStore'
import { BarChart } from './BarChart'

export function StatsScreen() {
  const { t } = useTranslation()
  const now = useNow()
  const stats = useGameStore((state) => state.stats)

  const tiles = [
    { label: t('stats.currentStreak'), value: String(currentStreak(stats, now)) },
    { label: t('stats.bestStreak'), value: String(stats.bestStreak) },
    { label: t('stats.totalFocus'), value: formatDuration(stats.totalFocusSeconds) },
    { label: t('stats.completed'), value: String(stats.completedPomodoros) },
  ]

  return (
    <div className="stats-screen">
      <h1>{t('nav.stats')}</h1>
      <dl className="stats-screen__tiles">
        {tiles.map((tile) => (
          <div key={tile.label} className="stats-screen__tile">
            <dt>{tile.label}</dt>
            <dd>{tile.value}</dd>
          </div>
        ))}
      </dl>
      <BarChart days={lastDays(stats, now)} />
    </div>
  )
}
