import { describe, expect, it } from 'vitest'
import { formatClock, formatDuration } from './format'

describe('formatClock', () => {
  it('formats milliseconds as MM:SS rounding seconds up', () => {
    expect(formatClock(1_453_000)).toBe('24:13')
    expect(formatClock(999)).toBe('00:01')
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(5_400_000)).toBe('90:00')
  })

  it('treats negative input as zero', () => {
    expect(formatClock(-5000)).toBe('00:00')
  })

  it('treats non-finite input as zero', () => {
    expect(formatClock(NaN)).toBe('00:00')
    expect(formatClock(Infinity)).toBe('00:00')
  })
})

describe('formatDuration', () => {
  it('formats seconds as minutes or hours and minutes', () => {
    expect(formatDuration(2700)).toBe('45 min')
    expect(formatDuration(11_100)).toBe('3 h 05 min')
    expect(formatDuration(30)).toBe('0 min')
    expect(formatDuration(3600)).toBe('1 h 00 min')
  })
})
