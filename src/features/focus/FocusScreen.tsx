import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { useNow } from '../../app/useNow'
import { formatClock } from '../../domain/format'
import { remainingMs } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'

export function FocusScreen() {
  const { t } = useTranslation()
  const now = useNow()
  const timer = useGameStore((state) => state.timer)
  const settings = useGameStore((state) => state.settings)
  const credits = useGameStore((state) => state.credits)
  const startTimer = useGameStore((state) => state.startTimer)
  const pauseTimer = useGameStore((state) => state.pauseTimer)
  const resumeTimer = useGameStore((state) => state.resumeTimer)
  const interruptTimer = useGameStore((state) => state.interruptTimer)
  const skipBreak = useGameStore((state) => state.skipBreak)

  const isFocus = timer.phase === 'focus'
  const total = settings.roundsBeforeLongBreak
  const done = Math.min(timer.completedInCycle, total)
  const rounds = '🍅'.repeat(done) + '⚪'.repeat(total - done)
  const minutes = Math.floor(credits / 60)

  return (
    <section className="focus-screen">
      <h1>{t(`focus.phase.${timer.phase}`)}</h1>
      <p className="focus-screen__clock">
        {formatClock(remainingMs(timer, now))}{' '}
        {timer.status === 'paused' && <span className="focus-screen__paused">{t('focus.paused')}</span>}
      </p>
      <p className="focus-screen__rounds" role="img" aria-label={t('focus.rounds', { done, total })}>
        {rounds}
      </p>
      <div className="focus-screen__actions">
        {isFocus && timer.status === 'idle' && (
          <button type="button" onClick={() => startTimer()}>
            {t('focus.start')}
          </button>
        )}
        {isFocus && timer.status === 'running' && (
          <button type="button" onClick={() => pauseTimer()}>
            {t('focus.pause')}
          </button>
        )}
        {isFocus && timer.status === 'paused' && (
          <button type="button" onClick={() => resumeTimer()}>
            {t('focus.resume')}
          </button>
        )}
        {isFocus && timer.status !== 'idle' && (
          <button type="button" onClick={() => interruptTimer()}>
            {t('focus.interrupt')}
          </button>
        )}
        {!isFocus && timer.status === 'idle' && (
          <button type="button" onClick={() => startTimer()}>
            {t('focus.startBreak')}
          </button>
        )}
        {!isFocus && (
          <button type="button" onClick={() => skipBreak()}>
            {t('focus.skipBreak')}
          </button>
        )}
      </div>
      {!isFocus && (
        <Link className="focus-screen__shop" to="/negozio">
          {t('focus.shopInvite', { minutes })}
        </Link>
      )}
    </section>
  )
}
