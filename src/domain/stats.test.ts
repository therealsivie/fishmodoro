import { describe, expect, it } from 'vitest'
import { EMPTY_STATS, currentStreak, lastDays, localDateKey, recordFocus } from './stats'
import type { Stats } from './stats'

const at = (s: string) => new Date(s).getTime()

function completedOn(stats: Stats, ...days: string[]): Stats {
  return days.reduce(
    (acc, day) => recordFocus(acc, { type: 'focusCompleted', at: at(`${day}T10:00:00`), seconds: 1500 }),
    stats,
  )
}

describe('stats', () => {
  it('builds the date key from local time', () => {
    expect(localDateKey(at('2026-03-05T00:00:01'))).toBe('2026-03-05')
    expect(localDateKey(at('2026-10-20T23:59:59'))).toBe('2026-10-20')
  })

  it('focus ending at 23:59 counts for that day', () => {
    const s = recordFocus(EMPTY_STATS, {
      type: 'focusCompleted',
      at: at('2026-10-20T23:59:30'),
      seconds: 1500,
    })
    expect(s.days['2026-10-20']).toEqual({ seconds: 1500, completed: 1 })
    expect(s.totalFocusSeconds).toBe(1500)
    expect(s.completedPomodoros).toBe(1)
  })

  it('interrupted focus adds time but no completion', () => {
    const s = recordFocus(EMPTY_STATS, {
      type: 'focusInterrupted',
      at: at('2026-10-20T11:00:00'),
      seconds: 600,
    })
    expect(s.days['2026-10-20']).toEqual({ seconds: 600, completed: 0 })
    expect(s.totalFocusSeconds).toBe(600)
    expect(s.completedPomodoros).toBe(0)
  })

  it('accumulates several events on the same day', () => {
    let s = completedOn(EMPTY_STATS, '2026-10-20')
    s = recordFocus(s, { type: 'focusInterrupted', at: at('2026-10-20T15:00:00'), seconds: 300 })
    expect(s.days['2026-10-20']).toEqual({ seconds: 1800, completed: 1 })
    expect(s.totalFocusSeconds).toBe(1800)
  })

  it('ignores an interrupted focus without elapsed time', () => {
    const s = recordFocus(EMPTY_STATS, { type: 'focusInterrupted', at: at('2026-10-20T11:00:00'), seconds: 0 })
    expect(s).toEqual(EMPTY_STATS)
    expect(s.days).toEqual({})
  })

  it('does not mutate the input stats', () => {
    recordFocus(EMPTY_STATS, { type: 'focusCompleted', at: at('2026-10-20T10:00:00'), seconds: 1500 })
    expect(EMPTY_STATS).toEqual({ totalFocusSeconds: 0, completedPomodoros: 0, days: {}, bestStreak: 0 })
  })

  it('streak counts consecutive completed days and survives until next midnight', () => {
    const s = completedOn(EMPTY_STATS, '2026-10-18', '2026-10-19', '2026-10-20')
    expect(currentStreak(s, at('2026-10-20T23:00:00'))).toBe(3)
    expect(currentStreak(s, at('2026-10-21T10:00:00'))).toBe(3)
    expect(currentStreak(s, at('2026-10-22T00:01:00'))).toBe(0)
    expect(s.bestStreak).toBe(3)
  })

  it('a day with only interrupted focus breaks the streak', () => {
    let s = completedOn(EMPTY_STATS, '2026-10-18', '2026-10-20')
    s = recordFocus(s, { type: 'focusInterrupted', at: at('2026-10-19T10:00:00'), seconds: 600 })
    expect(currentStreak(s, at('2026-10-20T23:00:00'))).toBe(1)
  })

  it('keeps the best streak after the current one breaks', () => {
    const s = completedOn(EMPTY_STATS, '2026-10-10', '2026-10-11', '2026-10-12', '2026-10-20')
    expect(s.bestStreak).toBe(3)
    expect(currentStreak(s, at('2026-10-20T12:00:00'))).toBe(1)
  })

  it('counts the streak across the DST change', () => {
    const s = completedOn(EMPTY_STATS, '2026-10-24', '2026-10-25', '2026-10-26')
    expect(currentStreak(s, at('2026-10-26T12:00:00'))).toBe(3)
  })

  it('lastDays spans the DST change with 14 distinct consecutive days', () => {
    const days = lastDays(EMPTY_STATS, at('2026-11-03T12:00:00'))
    expect(days).toHaveLength(14)
    expect(days[0].date).toBe('2026-10-21')
    expect(days[13].date).toBe('2026-11-03')
    expect(new Set(days.map((d) => d.date)).size).toBe(14)
  })

  it('lastDays reports seconds per day and zero where there is no data', () => {
    let s = completedOn(EMPTY_STATS, '2026-10-20')
    s = recordFocus(s, { type: 'focusInterrupted', at: at('2026-10-21T09:00:00'), seconds: 600 })
    expect(lastDays(s, at('2026-10-21T12:00:00'), 3)).toEqual([
      { date: '2026-10-19', seconds: 0 },
      { date: '2026-10-20', seconds: 1500 },
      { date: '2026-10-21', seconds: 600 },
    ])
  })
})
