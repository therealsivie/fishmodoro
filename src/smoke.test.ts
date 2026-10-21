import { describe, expect, it } from 'vitest'
import { i18n } from './i18n'

describe('test environment', () => {
  it('applies the Europe/Rome time zone', () => {
    expect(new Date(2026, 9, 25, 12).getTimezoneOffset()).toBe(-60)
    expect(new Date(2026, 9, 24, 12).getTimezoneOffset()).toBe(-120)
  })

  it('translates the app name', () => {
    expect(i18n.t('app.name')).toBe('Fishmodoro')
  })
})
