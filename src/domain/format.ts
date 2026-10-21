export function formatClock(ms: number): string {
  const totalSeconds = Number.isFinite(ms) ? Math.ceil(Math.max(0, ms) / 1000) : 0
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function formatDuration(seconds: number): string {
  const totalMinutes = Math.floor(Math.max(0, seconds) / 60)
  const hours = Math.floor(totalMinutes / 60)
  if (hours >= 1) return `${hours} h ${String(totalMinutes % 60).padStart(2, '0')} min`
  return `${totalMinutes} min`
}
