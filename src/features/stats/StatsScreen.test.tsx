// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ClockContext } from '../../app/useNow'
import { createDefaultSave } from '../../domain/save'
import { EMPTY_STATS, recordFocus } from '../../domain/stats'
import type { Stats } from '../../domain/stats'
import { useGameStore } from '../../store/gameStore'
import { StatsScreen } from './StatsScreen'

const at = (s: string) => new Date(s).getTime()
const NOW = at('2026-10-20T23:00:00')

function completedOn(stats: Stats, ...days: string[]): Stats {
  return days.reduce(
    (acc, day) => recordFocus(acc, { type: 'focusCompleted', at: at(`${day}T10:00:00`), seconds: 1500 }),
    stats,
  )
}

function renderScreen() {
  return render(
    <ClockContext.Provider value={NOW}>
      <StatsScreen />
    </ClockContext.Provider>,
  )
}

function valueOf(label: string): string | null {
  return screen.getByText(label).nextElementSibling?.textContent ?? null
}

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

afterEach(() => {
  cleanup()
})

describe('StatsScreen', () => {
  it('shows the four values and the 14-day chart', () => {
    useGameStore.setState({ stats: completedOn(EMPTY_STATS, '2026-10-18', '2026-10-19', '2026-10-20') })
    renderScreen()

    expect(screen.getByRole('heading', { level: 1, name: 'Statistiche' })).toBeInTheDocument()
    expect(valueOf('Giorni consecutivi')).toBe('3')
    expect(valueOf('Record di giorni consecutivi')).toBe('3')
    expect(valueOf('Focus totale')).toBe('1 h 15 min')
    expect(valueOf('Pomodori completati')).toBe('3')

    const items = within(screen.getByRole('list', { name: 'Ultimi 14 giorni' })).getAllByRole('listitem')
    expect(items).toHaveLength(14)
    expect(within(items[0]).getByText('7 ottobre: 0 min')).toBeInTheDocument()
    expect(within(items[13]).getByText('20 ottobre: 25 min')).toBeInTheDocument()
  })

  it('renders empty statistics without crashing', () => {
    renderScreen()

    expect(valueOf('Giorni consecutivi')).toBe('0')
    expect(valueOf('Record di giorni consecutivi')).toBe('0')
    expect(valueOf('Focus totale')).toBe('0 min')
    expect(valueOf('Pomodori completati')).toBe('0')

    const items = within(screen.getByRole('list', { name: 'Ultimi 14 giorni' })).getAllByRole('listitem')
    expect(items).toHaveLength(14)
    for (const item of items) {
      expect(item.getAttribute('title')).toMatch(/: 0 min$/)
    }
  })
})
