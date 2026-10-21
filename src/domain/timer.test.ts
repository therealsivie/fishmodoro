import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS as S } from './settings'
import {
  createInitialTimer,
  elapsedMs,
  interrupt,
  isFocusActive,
  pause,
  phaseDurationMs,
  remainingMs,
  resume,
  settle,
  skipBreak,
  start,
} from './timer'

const t0 = 1_000_000
const MIN = 60_000

describe('timer', () => {
  it('creates an idle focus with the configured duration', () => {
    expect(createInitialTimer(S)).toEqual({
      phase: 'focus',
      status: 'idle',
      startedAt: null,
      durationMs: 25 * MIN,
      pausedAt: null,
      pausedTotalMs: 0,
      completedInCycle: 0,
    })
    expect(phaseDurationMs('longBreak', S)).toBe(15 * MIN)
  })

  it('reports zero elapsed time when idle and clamps to the duration', () => {
    const idle = createInitialTimer(S)
    expect(elapsedMs(idle, t0)).toBe(0)
    const running = start(idle, S, t0)
    expect(elapsedMs(running, t0 - 5000)).toBe(0)
    expect(elapsedMs(running, t0 + 99 * MIN)).toBe(25 * MIN)
    expect(remainingMs(running, t0 + 99 * MIN)).toBe(0)
  })

  it('start, pause and resume keep the countdown frozen while paused', () => {
    let t = start(createInitialTimer(S), S, t0)
    expect(remainingMs(t, t0 + 60_000)).toBe(1_440_000)
    t = pause(t, t0 + 60_000)
    expect(remainingMs(t, t0 + 600_000)).toBe(1_440_000)
    t = resume(t, t0 + 600_000)
    expect(t.pausedTotalMs).toBe(540_000)
    expect(remainingMs(t, t0 + 660_000)).toBe(1_380_000)
  })

  it('settle completes focus and auto-starts the short break at the real end time', () => {
    const r = settle(start(createInitialTimer(S), S, t0), S, t0 + 1_500_000)
    expect(r.events).toEqual([{ type: 'focusCompleted', at: t0 + 1_500_000, seconds: 1500 }])
    expect(r.timer).toMatchObject({
      phase: 'shortBreak',
      status: 'running',
      startedAt: t0 + 1_500_000,
      completedInCycle: 1,
    })
  })

  it('settle does nothing before the end', () => {
    const t = start(createInitialTimer(S), S, t0)
    const r = settle(t, S, t0 + 1_499_999)
    expect(r.events).toEqual([])
    expect(r.timer).toEqual(t)
  })

  it('settle leaves the break idle when autoStartBreak is off', () => {
    const settings = { ...S, autoStartBreak: false }
    const r = settle(start(createInitialTimer(settings), settings, t0), settings, t0 + 25 * MIN)
    expect(r.timer).toMatchObject({
      phase: 'shortBreak',
      status: 'idle',
      startedAt: null,
      durationMs: 5 * MIN,
      completedInCycle: 1,
    })
  })

  it('fourth focus leads to long break, which resets the cycle', () => {
    const third = { ...createInitialTimer(S), completedInCycle: 3 }
    const r = settle(start(third, S, t0), S, t0 + 25 * MIN)
    expect(r.timer).toMatchObject({ phase: 'longBreak', status: 'running', completedInCycle: 4 })
    expect(r.timer.durationMs).toBe(15 * MIN)

    const after = settle(r.timer, S, t0 + 40 * MIN)
    expect(after.events).toEqual([{ type: 'breakEnded', at: t0 + 40 * MIN, skipped: false }])
    expect(after.timer).toMatchObject({ phase: 'focus', status: 'idle', completedInCycle: 0 })
  })

  it('settle after hours away credits once and ends idle', () => {
    const r = settle(start(createInitialTimer(S), S, t0), S, t0 + 10 * 3_600_000)
    expect(r.events.map((e) => e.type)).toEqual(['focusCompleted', 'breakEnded'])
    expect(r.events[1].at).toBe(t0 + 1_800_000)
    expect(r.timer).toMatchObject({ phase: 'focus', status: 'idle' })
    expect(settle(r.timer, S, t0 + 11 * 3_600_000).events).toEqual([])
  })

  it('paused time shifts the end of focus', () => {
    let t = start(createInitialTimer(S), S, t0)
    t = pause(t, t0 + 5 * MIN)
    t = resume(t, t0 + 15 * MIN)
    expect(settle(t, S, t0 + 34 * MIN).events).toEqual([])
    const r = settle(t, S, t0 + 36 * MIN)
    expect(r.events[0]).toEqual({ type: 'focusCompleted', at: t0 + 35 * MIN, seconds: 1500 })
  })

  it('a paused timer never expires', () => {
    const t = pause(start(createInitialTimer(S), S, t0), t0 + MIN)
    const r = settle(t, S, t0 + 100 * 3_600_000)
    expect(r.events).toEqual([])
    expect(r.timer).toEqual(t)
  })

  it('interrupt credits whole seconds and keeps the cycle', () => {
    const r = interrupt(start(createInitialTimer(S), S, t0), S, t0 + 90_500)
    expect(r.events).toEqual([{ type: 'focusInterrupted', at: t0 + 90_500, seconds: 90 }])
    expect(r.timer).toMatchObject({ phase: 'focus', status: 'idle', completedInCycle: 0 })
  })

  it('interrupt works on a paused focus and ignores idle focus and breaks', () => {
    const paused = pause(start(createInitialTimer(S), S, t0), t0 + 2 * MIN)
    expect(interrupt(paused, S, t0 + 9 * MIN).events).toEqual([
      { type: 'focusInterrupted', at: t0 + 9 * MIN, seconds: 120 },
    ])

    const idle = createInitialTimer(S)
    expect(interrupt(idle, S, t0)).toEqual({ timer: idle, events: [] })

    const breakTimer = settle(start(idle, S, t0), S, t0 + 25 * MIN).timer
    expect(interrupt(breakTimer, S, t0 + 26 * MIN)).toEqual({ timer: breakTimer, events: [] })
  })

  it('changing settings mid-focus does not change the running focus', () => {
    const t = start(createInitialTimer(S), S, t0)
    const longer = { ...S, focusMinutes: 50 }
    const r = settle(t, longer, t0 + 25 * MIN)
    expect(r.events).toEqual([{ type: 'focusCompleted', at: t0 + 25 * MIN, seconds: 1500 }])
  })

  it('pause does nothing during a break', () => {
    const breakTimer = settle(start(createInitialTimer(S), S, t0), S, t0 + 25 * MIN).timer
    expect(pause(breakTimer, t0 + 26 * MIN)).toEqual(breakTimer)
    const idle = createInitialTimer(S)
    expect(pause(idle, t0)).toEqual(idle)
  })

  it('resume does nothing when not paused', () => {
    const running = start(createInitialTimer(S), S, t0)
    expect(resume(running, t0 + MIN)).toEqual(running)
  })

  it('start does nothing when not idle', () => {
    const running = start(createInitialTimer(S), S, t0)
    expect(start(running, S, t0 + MIN)).toEqual(running)
  })

  it('skipBreak ends a running break with skipped: true', () => {
    const breakTimer = settle(start(createInitialTimer(S), S, t0), S, t0 + 25 * MIN).timer
    const r = skipBreak(breakTimer, S, t0 + 26 * MIN)
    expect(r.events).toEqual([{ type: 'breakEnded', at: t0 + 26 * MIN, skipped: true }])
    expect(r.timer).toMatchObject({ phase: 'focus', status: 'idle', completedInCycle: 1 })
  })

  it('skipBreak works on an idle break and ignores a focus', () => {
    const settings = { ...S, autoStartBreak: false }
    const idleBreak = settle(start(createInitialTimer(settings), settings, t0), settings, t0 + 25 * MIN).timer
    const r = skipBreak(idleBreak, settings, t0 + 30 * MIN)
    expect(r.events).toEqual([{ type: 'breakEnded', at: t0 + 30 * MIN, skipped: true }])
    expect(r.timer.phase).toBe('focus')

    const focus = start(createInitialTimer(S), S, t0)
    expect(skipBreak(focus, S, t0 + MIN)).toEqual({ timer: focus, events: [] })
  })

  it('skipping a long break resets the cycle', () => {
    const long = { ...createInitialTimer(S), phase: 'longBreak' as const, completedInCycle: 4 }
    const r = skipBreak(start(long, S, t0), S, t0 + MIN)
    expect(r.timer.completedInCycle).toBe(0)
  })

  it('lowering roundsBeforeLongBreak mid-cycle still triggers the long break and resets the cycle', () => {
    const third = { ...createInitialTimer(S), completedInCycle: 3 }
    const lowered = { ...S, roundsBeforeLongBreak: 2 }
    const r = settle(start(third, S, t0), lowered, t0 + 25 * MIN)
    expect(r.timer).toMatchObject({ phase: 'longBreak', completedInCycle: 4 })
    const after = settle(r.timer, lowered, t0 + 40 * MIN)
    expect(after.timer).toMatchObject({ phase: 'focus', status: 'idle', completedInCycle: 0 })
  })

  it('with one round every focus is followed by a long break', () => {
    const one = { ...S, roundsBeforeLongBreak: 1 }
    const r = settle(start(createInitialTimer(one), one, t0), one, t0 + 25 * MIN)
    expect(r.timer.phase).toBe('longBreak')
  })

  it('resume never shrinks pausedTotalMs when the clock goes backwards', () => {
    const paused = pause(start(createInitialTimer(S), S, t0), t0 + 10 * MIN)
    expect(resume(paused, t0 + 5 * MIN).pausedTotalMs).toBe(0)
  })

  it('isFocusActive is true only for a running or paused focus', () => {
    const idle = createInitialTimer(S)
    const running = start(idle, S, t0)
    expect(isFocusActive(idle)).toBe(false)
    expect(isFocusActive(running)).toBe(true)
    expect(isFocusActive(pause(running, t0 + MIN))).toBe(true)
    expect(isFocusActive(settle(running, S, t0 + 25 * MIN).timer)).toBe(false)
  })
})
