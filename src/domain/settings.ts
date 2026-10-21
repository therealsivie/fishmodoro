export interface Settings {
  focusMinutes: number
  shortBreakMinutes: number
  longBreakMinutes: number
  roundsBeforeLongBreak: number
  autoStartBreak: boolean
  soundEnabled: boolean
  notificationsEnabled: boolean
}

export const DEFAULT_SETTINGS: Settings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  roundsBeforeLongBreak: 4,
  autoStartBreak: true,
  soundEnabled: true,
  notificationsEnabled: false,
}

export const NUMBER_RANGES = {
  focusMinutes: [1, 180],
  shortBreakMinutes: [1, 180],
  longBreakMinutes: [1, 180],
  roundsBeforeLongBreak: [1, 12],
} as const

const BOOLEAN_FIELDS = ['autoStartBreak', 'soundEnabled', 'notificationsEnabled'] as const

export function sanitizeSettings(
  input: Partial<Record<keyof Settings, unknown>>,
  base: Settings = DEFAULT_SETTINGS,
): Settings {
  const result: Settings = { ...base }

  for (const field of Object.keys(NUMBER_RANGES) as (keyof typeof NUMBER_RANGES)[]) {
    const value = input[field]
    if (typeof value === 'number' && Number.isFinite(value)) {
      const [min, max] = NUMBER_RANGES[field]
      result[field] = Math.min(max, Math.max(min, Math.round(value)))
    }
  }

  for (const field of BOOLEAN_FIELDS) {
    const value = input[field]
    if (typeof value === 'boolean') result[field] = value
  }

  return result
}
