import type { Settings } from './settings'

export type Phase = 'focus' | 'shortBreak' | 'longBreak'
export type TimerStatus = 'idle' | 'running' | 'paused'

export interface TimerState {
  phase: Phase
  status: TimerStatus
  startedAt: number | null
  durationMs: number
  pausedAt: number | null
  pausedTotalMs: number
  completedInCycle: number
}

export type TimerEvent =
  | { type: 'focusCompleted'; at: number; seconds: number }
  | { type: 'focusInterrupted'; at: number; seconds: number }
  | { type: 'breakEnded'; at: number; skipped: boolean }

export interface TimerResult {
  timer: TimerState
  events: TimerEvent[]
}

const MINUTE_MS = 60_000

export function phaseDurationMs(phase: Phase, settings: Settings): number {
  switch (phase) {
    case 'focus':
      return settings.focusMinutes * MINUTE_MS
    case 'shortBreak':
      return settings.shortBreakMinutes * MINUTE_MS
    case 'longBreak':
      return settings.longBreakMinutes * MINUTE_MS
  }
}

function idleTimer(phase: Phase, settings: Settings, completedInCycle: number): TimerState {
  return {
    phase,
    status: 'idle',
    startedAt: null,
    durationMs: phaseDurationMs(phase, settings),
    pausedAt: null,
    pausedTotalMs: 0,
    completedInCycle,
  }
}

export function createInitialTimer(settings: Settings): TimerState {
  return idleTimer('focus', settings, 0)
}

export function elapsedMs(t: TimerState, now: number): number {
  if (t.status === 'idle' || t.startedAt === null) return 0
  const raw = (t.pausedAt ?? now) - t.startedAt - t.pausedTotalMs
  return Math.min(t.durationMs, Math.max(0, raw))
}

export function remainingMs(t: TimerState, now: number): number {
  return t.durationMs - elapsedMs(t, now)
}

export function start(t: TimerState, settings: Settings, now: number): TimerState {
  if (t.status !== 'idle') return t
  return {
    ...t,
    status: 'running',
    startedAt: now,
    durationMs: phaseDurationMs(t.phase, settings),
    pausedAt: null,
    pausedTotalMs: 0,
  }
}

export function pause(t: TimerState, now: number): TimerState {
  if (t.phase !== 'focus' || t.status !== 'running') return t
  return { ...t, status: 'paused', pausedAt: now }
}

export function resume(t: TimerState, now: number): TimerState {
  if (t.phase !== 'focus' || t.status !== 'paused' || t.pausedAt === null) return t
  return { ...t, status: 'running', pausedAt: null, pausedTotalMs: t.pausedTotalMs + Math.max(0, now - t.pausedAt) }
}

export function isFocusActive(t: TimerState): boolean {
  return t.phase === 'focus' && t.status !== 'idle'
}

function endBreak(t: TimerState, settings: Settings, at: number, skipped: boolean): TimerResult {
  const completedInCycle = t.phase === 'longBreak' ? 0 : t.completedInCycle
  return {
    timer: idleTimer('focus', settings, completedInCycle),
    events: [{ type: 'breakEnded', at, skipped }],
  }
}

export function interrupt(t: TimerState, settings: Settings, now: number): TimerResult {
  if (!isFocusActive(t)) return { timer: t, events: [] }
  const seconds = Math.floor(elapsedMs(t, now) / 1000)
  return {
    timer: idleTimer('focus', settings, t.completedInCycle),
    events: [{ type: 'focusInterrupted', at: now, seconds }],
  }
}

export function skipBreak(t: TimerState, settings: Settings, now: number): TimerResult {
  if (t.phase === 'focus' || t.status === 'paused') return { timer: t, events: [] }
  return endBreak(t, settings, now, true)
}

export function settle(t: TimerState, settings: Settings, now: number): TimerResult {
  let timer = t
  const events: TimerEvent[] = []

  while (timer.status === 'running' && timer.startedAt !== null) {
    const endAt = timer.startedAt + timer.durationMs + timer.pausedTotalMs
    if (now < endAt) break

    if (timer.phase === 'focus') {
      const completedInCycle = timer.completedInCycle + 1
      const phase: Phase = completedInCycle >= settings.roundsBeforeLongBreak ? 'longBreak' : 'shortBreak'
      events.push({ type: 'focusCompleted', at: endAt, seconds: timer.durationMs / 1000 })
      const next = idleTimer(phase, settings, completedInCycle)
      timer = settings.autoStartBreak ? start(next, settings, endAt) : next
    } else {
      const result = endBreak(timer, settings, endAt, false)
      events.push(...result.events)
      timer = result.timer
    }
  }

  return { timer, events }
}
