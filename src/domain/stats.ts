import type { TimerEvent } from './timer'

export interface DayStats {
  seconds: number
  completed: number
}

export interface Stats {
  totalFocusSeconds: number
  completedPomodoros: number
  days: Record<string, DayStats>
  bestStreak: number
}

export const EMPTY_STATS: Stats = {
  totalFocusSeconds: 0,
  completedPomodoros: 0,
  days: {},
  bestStreak: 0,
}

const DEFAULT_CHART_DAYS = 14

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function localDateKey(ms: number): string {
  return dateKey(new Date(ms))
}

export function currentStreak(stats: Stats, now: number): number {
  const day = new Date(now)
  if (!((stats.days[dateKey(day)]?.completed ?? 0) > 0)) day.setDate(day.getDate() - 1)
  let streak = 0
  while ((stats.days[dateKey(day)]?.completed ?? 0) > 0) {
    streak += 1
    day.setDate(day.getDate() - 1)
  }
  return streak
}

export function recordFocus(
  stats: Stats,
  event: Extract<TimerEvent, { type: 'focusCompleted' | 'focusInterrupted' }>,
): Stats {
  const completed = event.type === 'focusCompleted' ? 1 : 0
  if (completed === 0 && event.seconds <= 0) return stats

  const key = localDateKey(event.at)
  const day = stats.days[key] ?? { seconds: 0, completed: 0 }
  const next: Stats = {
    ...stats,
    totalFocusSeconds: stats.totalFocusSeconds + event.seconds,
    completedPomodoros: stats.completedPomodoros + completed,
    days: {
      ...stats.days,
      [key]: { seconds: day.seconds + event.seconds, completed: day.completed + completed },
    },
  }
  return { ...next, bestStreak: Math.max(stats.bestStreak, currentStreak(next, event.at)) }
}

export function lastDays(
  stats: Stats,
  now: number,
  count: number = DEFAULT_CHART_DAYS,
): Array<{ date: string; seconds: number }> {
  const day = new Date(now)
  const result: Array<{ date: string; seconds: number }> = []
  for (let i = 0; i < count; i++) {
    const date = dateKey(day)
    result.unshift({ date, seconds: stats.days[date]?.seconds ?? 0 })
    day.setDate(day.getDate() - 1)
  }
  return result
}
