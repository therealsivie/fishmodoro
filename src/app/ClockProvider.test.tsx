// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSave } from '../domain/save'
import { useGameStore } from '../store/gameStore'
import { ClockProvider } from './ClockProvider'

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state })
}

const realTick = useGameStore.getState().tick

beforeEach(() => {
  vi.useFakeTimers()
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

afterEach(() => {
  cleanup()
  useGameStore.setState({ tick: realTick })
  vi.useRealTimers()
  vi.restoreAllMocks()
  setVisibility('visible')
})

describe('ClockProvider', () => {
  it('does not tick while the tab is hidden and ticks when it becomes visible', () => {
    const tick = vi.fn(() => [])
    useGameStore.setState({ tick })
    setVisibility('hidden')
    render(<ClockProvider>x</ClockProvider>)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(tick).not.toHaveBeenCalled()

    setVisibility('visible')
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    expect(tick).toHaveBeenCalled()
  })

  it('ticks on a hidden tab when the running phase has expired', () => {
    const tick = vi.fn(() => [])
    useGameStore.setState({ tick })
    useGameStore.getState().startTimer(Date.now())
    setVisibility('hidden')
    render(<ClockProvider>x</ClockProvider>)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(tick).not.toHaveBeenCalled()

    act(() => {
      vi.advanceTimersByTime(25 * 60_000)
    })
    expect(tick).toHaveBeenCalled()
  })

  it('updates the tab title while a timer is active', () => {
    useGameStore.setState({ tick: vi.fn(() => []) })
    useGameStore.getState().startTimer(Date.now())
    render(<ClockProvider>x</ClockProvider>)
    act(() => {
      vi.advanceTimersByTime(250)
    })
    expect(document.title).toBe('25:00 · Fishmodoro')
  })
})
