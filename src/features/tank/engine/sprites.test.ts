import { describe, expect, it } from 'vitest'
import { pixelsToRgba } from './sprites'

describe('pixelsToRgba', () => {
  it('maps transparent and palette pixels', () => {
    const rgba = pixelsToRgba(['.k'], { k: '#1a1c2c' })
    expect([...rgba]).toEqual([0, 0, 0, 0, 0x1a, 0x1c, 0x2c, 255])
  })

  it('lays out several rows', () => {
    const rgba = pixelsToRgba(['a.', '.b'], { a: '#ff0000', b: '#0000ff' })
    expect(rgba.length).toBe(16)
    expect([...rgba.slice(0, 4)]).toEqual([255, 0, 0, 255])
    expect([...rgba.slice(12, 16)]).toEqual([0, 0, 255, 255])
    expect(rgba[7]).toBe(0)
  })

  it('throws on a missing palette entry', () => {
    expect(() => pixelsToRgba(['x'], {})).toThrow('x')
  })

  it('throws on rows of different widths', () => {
    expect(() => pixelsToRgba(['kk', 'k'], { k: '#000000' })).toThrow('Row 1')
  })

  it('returns an empty array for no rows', () => {
    expect(pixelsToRgba([], {}).length).toBe(0)
  })
})
