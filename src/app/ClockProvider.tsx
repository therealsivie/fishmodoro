import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { formatClock } from '../domain/format'
import { remainingMs } from '../domain/timer'
import type { TimerEvent } from '../domain/timer'
import { useGameStore } from '../store/gameStore'
import { notifyPhaseEnd, playChime } from './alerts'
import { ClockContext } from './useNow'

const TICK_INTERVAL_MS = 250

function isAlertWorthy(event: TimerEvent): boolean {
  if (event.type === 'focusInterrupted') return false
  return event.type !== 'breakEnded' || !event.skipped
}

function runTick(now: number): void {
  const { tick, settings } = useGameStore.getState()
  const last = tick(now).filter(isAlertWorthy).at(-1)
  if (!last) return
  if (settings.soundEnabled) playChime()
  if (settings.notificationsEnabled) notifyPhaseEnd(last)
}

function update(now: number): void {
  if (document.visibilityState === 'visible') {
    runTick(now)
    return
  }
  const { timer } = useGameStore.getState()
  if (timer.status === 'running' && remainingMs(timer, now) <= 0) runTick(now)
}

export function ClockProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  const [now, setNow] = useState(() => Date.now())
  const timer = useGameStore((state) => state.timer)

  useEffect(() => {
    const interval = setInterval(() => {
      const current = Date.now()
      setNow(current)
      update(current)
    }, TICK_INTERVAL_MS)
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const current = Date.now()
      setNow(current)
      runTick(current)
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    document.title =
      timer.status === 'idle'
        ? t('app.name')
        : t('app.tabTitle', { clock: formatClock(remainingMs(timer, now)) })
  }, [timer, now, t])

  return <ClockContext value={now}>{children}</ClockContext>
}
