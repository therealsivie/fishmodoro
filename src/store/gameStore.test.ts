// @vitest-environment jsdom
import { beforeEach, expect, test, vi } from 'vitest'
import { createDefaultSave, serializeSave } from '../domain/save'
import { listenToOtherTabs, useGameStore } from './gameStore'

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

test('interrupt credits seconds and records stats', () => {
  const s = useGameStore.getState()
  s.startTimer(0)
  s.interruptTimer(90_500)
  expect(useGameStore.getState().credits).toBe(90)
  expect(useGameStore.getState().stats.totalFocusSeconds).toBe(90)
})

test('interrupt right after the focus expired completes it instead of interrupting', () => {
  const s = useGameStore.getState()
  s.startTimer(0)
  s.interruptTimer(25 * 60_000 + 100)
  const { stats, credits } = useGameStore.getState()
  expect(stats.completedPomodoros).toBe(1)
  expect(credits).toBe(1500)
})

test('pause right after the focus expired settles it instead of pausing', () => {
  const s = useGameStore.getState()
  s.startTimer(0)
  s.pauseTimer(25 * 60_000 + 100)
  const { timer, stats } = useGameStore.getState()
  expect(stats.completedPomodoros).toBe(1)
  expect(timer.phase).toBe('shortBreak')
  expect(timer.status).not.toBe('paused')
})

test('tick credits a completed focus exactly once', () => {
  useGameStore.getState().startTimer(0)
  expect(
    useGameStore
      .getState()
      .tick(10 * 3_600_000)
      .map((e) => e.type),
  ).toEqual(['focusCompleted', 'breakEnded'])
  expect(useGameStore.getState().tick(11 * 3_600_000)).toEqual([])
  expect(useGameStore.getState().credits).toBe(1500)
})

test('tick does not touch the state when nothing changed', () => {
  useGameStore.getState().startTimer(0)
  const before = useGameStore.getState()
  expect(before.tick(1000)).toEqual([])
  expect(useGameStore.getState()).toBe(before)
})

test('skipBreak credits nothing', () => {
  useGameStore.getState().startTimer(0)
  useGameStore.getState().tick(10 * 3_600_000)
  useGameStore.getState().startTimer(10 * 3_600_000)
  useGameStore.getState().skipBreak(10 * 3_600_000 + 1000)
  expect(useGameStore.getState().credits).toBe(1500)
})

test('shop and import are locked during focus, even when paused', () => {
  useGameStore.setState({ credits: 100_000 })
  useGameStore.getState().startTimer(0)
  useGameStore.getState().pauseTimer(1000)
  expect(useGameStore.getState().buy('goldfish')).toEqual({ ok: false, error: 'focusActive' })
  expect(useGameStore.getState().upgradeTank()).toEqual({ ok: false, error: 'focusActive' })
  expect(useGameStore.getState().importSave(serializeSave(createDefaultSave()))).toEqual({
    ok: false,
    error: 'focusActive',
  })
  expect(useGameStore.getState().credits).toBe(100_000)
})

test('buy maps the domain result and spends credits', () => {
  useGameStore.setState({ credits: 100_000 })
  const result = useGameStore.getState().buy('goldfish', 5)
  expect(result.ok).toBe(true)
  expect(useGameStore.getState().tank.fish).toHaveLength(1)
  expect(useGameStore.getState().credits).toBeLessThan(100_000)
})

test('settings change updates idle timer only', () => {
  useGameStore.getState().updateSettings({ focusMinutes: 50 })
  expect(useGameStore.getState().settings.focusMinutes).toBe(50)
  expect(useGameStore.getState().timer.durationMs).toBe(3_000_000)

  useGameStore.getState().startTimer(0)
  useGameStore.getState().updateSettings({ focusMinutes: 30 })
  expect(useGameStore.getState().settings.focusMinutes).toBe(30)
  expect(useGameStore.getState().timer.durationMs).toBe(3_000_000)
})

test('failed import leaves state untouched', () => {
  useGameStore.setState({ credits: 42 })
  expect(useGameStore.getState().importSave('nope')).toEqual({ ok: false, error: 'invalidJson' })
  expect(useGameStore.getState().credits).toBe(42)
})

test('successful import replaces the state and export round-trips', () => {
  const save = { ...createDefaultSave(), credits: 500 }
  expect(useGameStore.getState().importSave(serializeSave(save))).toEqual({ ok: true })
  expect(useGameStore.getState().credits).toBe(500)
  expect(JSON.parse(useGameStore.getState().exportSave()).credits).toBe(500)
})

test('state is persisted and reloaded from another tab', async () => {
  const stop = listenToOtherTabs()
  const other = { state: { ...createDefaultSave(), credits: 777 }, version: 1 }
  localStorage.setItem('fishmodoro-save', JSON.stringify(other))
  window.dispatchEvent(new StorageEvent('storage', { key: 'fishmodoro-save' }))
  await vi.waitFor(() => expect(useGameStore.getState().credits).toBe(777))
  stop()
})

test('tampered storage is ignored on rehydrate', async () => {
  useGameStore.setState({ credits: 42 })
  localStorage.setItem('fishmodoro-save', JSON.stringify({ state: { credits: 'lots', tank: 7 }, version: 1 }))
  await useGameStore.persist.rehydrate()
  expect(useGameStore.getState().credits).toBe(42)
})
