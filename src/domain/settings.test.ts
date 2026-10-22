import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'

describe('sanitizeSettings', () => {
  it('clamps and rounds', () => {
    expect(sanitizeSettings({ focusMinutes: 0 }).focusMinutes).toBe(1)
    expect(sanitizeSettings({ focusMinutes: 999 }).focusMinutes).toBe(180)
    expect(sanitizeSettings({ focusMinutes: 2.5 }).focusMinutes).toBe(3)
    expect(sanitizeSettings({ focusMinutes: '' }).focusMinutes).toBe(25)
    expect(sanitizeSettings({ focusMinutes: NaN }).focusMinutes).toBe(25)
    expect(sanitizeSettings({ roundsBeforeLongBreak: 50 }).roundsBeforeLongBreak).toBe(12)
    expect(sanitizeSettings({ roundsBeforeLongBreak: 0 }).roundsBeforeLongBreak).toBe(1)
    expect(sanitizeSettings({ autoStartBreak: 'yes' }).autoStartBreak).toBe(true)
  })

  it('exposes the documented defaults', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      roundsBeforeLongBreak: 4,
      autoStartBreak: true,
      soundEnabled: true,
      notificationsEnabled: false,
    })
  })

  it('falls back to the given base for invalid values', () => {
    const base = { ...DEFAULT_SETTINGS, focusMinutes: 40, soundEnabled: false }
    const result = sanitizeSettings({ focusMinutes: null, soundEnabled: 1, shortBreakMinutes: 7 }, base)
    expect(result.focusMinutes).toBe(40)
    expect(result.soundEnabled).toBe(false)
    expect(result.shortBreakMinutes).toBe(7)
  })

  it('accepts real booleans, ignores unknown keys and returns a fresh object', () => {
    const input = { notificationsEnabled: true, unknown: 1 } as Record<string, unknown>
    const result = sanitizeSettings(input)
    expect(result.notificationsEnabled).toBe(true)
    expect(result).not.toHaveProperty('unknown')
    expect(result).not.toBe(DEFAULT_SETTINGS)
    expect(sanitizeSettings({}, DEFAULT_SETTINGS)).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects infinite numbers', () => {
    expect(sanitizeSettings({ focusMinutes: Infinity }).focusMinutes).toBe(25)
  })
})
