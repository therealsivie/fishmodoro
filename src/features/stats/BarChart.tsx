import { useTranslation } from 'react-i18next'
import { formatDuration } from '../../domain/format'

type Day = { date: string; seconds: number }

const dayFormat = new Intl.DateTimeFormat('it-IT', { day: 'numeric', month: 'long' })
const weekdayFormat = new Intl.DateTimeFormat('it-IT', { weekday: 'narrow' })

const EDGE_COLUMNS = 3

function parseLocalDate(date: string): Date {
  const [year, month, day] = date.split('-').map(Number)
  return new Date(year, month - 1, day)
}

function valueClassName(index: number, count: number): string {
  if (index < EDGE_COLUMNS) {
    return 'bar-chart__value bar-chart__value--start'
  }
  if (index >= count - EDGE_COLUMNS) {
    return 'bar-chart__value bar-chart__value--end'
  }
  return 'bar-chart__value'
}

export function BarChart({ days }: { days: Day[] }) {
  const { t } = useTranslation()
  const max = Math.max(0, ...days.map((day) => day.seconds))
  const tallest = max > 0 ? days.findIndex((day) => day.seconds === max) : -1

  return (
    <figure className="bar-chart">
      <figcaption className="bar-chart__title">{t('stats.chartTitle')}</figcaption>
      <ul className="bar-chart__plot" aria-label={t('stats.chartTitle')}>
        {days.map((day, index) => {
          const date = parseLocalDate(day.date)
          const label = t('stats.dayLabel', {
            date: dayFormat.format(date),
            duration: formatDuration(day.seconds),
          })

          return (
            <li key={day.date} className="bar-chart__day" title={label}>
              <span className="visually-hidden">{label}</span>
              <div className="bar-chart__track">
                {day.seconds > 0 && (
                  <div className="bar-chart__bar" style={{ height: `${(day.seconds / max) * 100}%` }}>
                    {index === tallest && (
                      <span className={valueClassName(index, days.length)} aria-hidden="true">
                        {formatDuration(day.seconds)}
                      </span>
                    )}
                  </div>
                )}
              </div>
              <span className="bar-chart__weekday" aria-hidden="true">
                {weekdayFormat.format(date)}
              </span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
