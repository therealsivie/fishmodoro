// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDefaultSave } from '../../domain/save'
import type { TimerState } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'
import { FocusScreen } from './FocusScreen'

function renderScreen() {
  return render(
    <MemoryRouter>
      <FocusScreen />
    </MemoryRouter>,
  )
}

function setTimer(patch: Partial<TimerState>) {
  act(() => {
    const { timer } = useGameStore.getState()
    useGameStore.setState({ timer: { ...timer, ...patch } })
  })
}

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

afterEach(() => {
  cleanup()
})

describe('FocusScreen', () => {
  it('idle focus shows only Avvia', () => {
    renderScreen()
    expect(screen.getByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Avvia'])
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('start, suspend, resume', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Avvia' }))
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Sospendi', 'Interrompi'])

    await user.click(screen.getByRole('button', { name: 'Sospendi' }))
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Riprendi', 'Interrompi'])
    expect(screen.getByText('Sospeso')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Riprendi' }))
    expect(screen.getByRole('button', { name: 'Sospendi' })).toBeInTheDocument()
  })

  it('interrupt returns to idle focus', async () => {
    const user = userEvent.setup()
    renderScreen()

    await user.click(screen.getByRole('button', { name: 'Avvia' }))
    await user.click(screen.getByRole('button', { name: 'Interrompi' }))
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Avvia'])
  })

  it('break shows skip and shop invite', () => {
    useGameStore.setState({ credits: 600 })
    setTimer({ phase: 'shortBreak', status: 'running', startedAt: Date.now(), durationMs: 300_000 })
    renderScreen()

    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Salta pausa'])
    const link = screen.getByRole('link', { name: 'Hai 10 min da spendere' })
    expect(link).toHaveAttribute('href', '/negozio')
  })

  it('idle long break offers start and skip, and skipping returns to focus', async () => {
    const user = userEvent.setup()
    setTimer({ phase: 'longBreak', status: 'idle' })
    renderScreen()

    expect(screen.getByRole('heading', { level: 1, name: 'Pausa lunga' })).toBeInTheDocument()
    expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Avvia pausa', 'Salta pausa'])
    expect(screen.getByRole('link', { name: 'Hai 0 min da spendere' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Salta pausa' }))
    expect(screen.getByRole('heading', { level: 1, name: 'Focus' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })

  it('rounds indicator', () => {
    setTimer({ completedInCycle: 2 })
    renderScreen()

    expect(screen.getByRole('img', { name: '2 di 4 giri' })).toHaveTextContent('🍅🍅⚪⚪')
  })

  it('caps the rounds indicator at the cycle length', () => {
    setTimer({ completedInCycle: 5 })
    renderScreen()

    expect(screen.getByRole('img', { name: '4 di 4 giri' })).toHaveTextContent('🍅🍅🍅🍅')
  })
})
