import type { TimerEvent } from '../domain/timer'
import { i18n } from '../i18n'

let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (audioContext) return audioContext
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  audioContext = new Ctor()
  return audioContext
}

export function playChime(): void {
  try {
    const context = getAudioContext()
    if (!context) return
    void context.resume()
    const notes = [660, 880]
    notes.forEach((frequency, index) => {
      const start = context.currentTime + index * 0.2
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.2, start)
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(start)
      oscillator.stop(start + 0.2)
    })
  } catch {
    // Audio is a nicety: unsupported or blocked contexts are ignored.
  }
}

export function notifyPhaseEnd(event: TimerEvent): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return
  const key = event.type === 'focusCompleted' ? 'alerts.focusCompleted' : 'alerts.breakEnded'
  try {
    new Notification(i18n.t('app.name'), { body: i18n.t(key) })
  } catch {
    // Some mobile browsers only allow notifications through a service worker.
  }
}

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  const permission = await Notification.requestPermission()
  return permission === 'granted'
}
