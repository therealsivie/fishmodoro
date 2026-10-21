import { describe, expect, it } from 'vitest'
import { CATALOG, getEntry } from '../../../domain/catalog'
import { PALETTE, SPRITES } from './index'

function opaque(row: string): number {
  return [...row].filter((char) => char !== '.').length
}

describe('sprites', () => {
  it('has a sprite for every catalog entry', () => {
    for (const entry of CATALOG) expect(SPRITES[entry.id], entry.id).toBeDefined()
  })

  it('draws pixel sprites at the catalog size using only palette colors', () => {
    for (const entry of CATALOG) {
      const source = SPRITES[entry.id]
      expect(source.kind, entry.id).toBe('pixels')
      if (source.kind !== 'pixels') continue
      const { art } = source
      expect([art.width, art.height], entry.id).toEqual([entry.width, entry.height])
      const layers = [...art.frames, ...(art.back ? [art.back] : []), ...(art.front ? [art.front] : [])]
      for (const rows of layers) {
        expect(rows, entry.id).toHaveLength(entry.height)
        for (const row of rows) {
          expect(row, entry.id).toHaveLength(entry.width)
          for (const char of row) expect(char === '.' || char in PALETTE, `${entry.id} "${char}"`).toBe(true)
        }
      }
    }
  })

  it('animates fish with two frames', () => {
    for (const entry of CATALOG.filter((item) => item.category === 'fish')) {
      const source = SPRITES[entry.id]
      if (source.kind !== 'pixels') throw new Error(entry.id)
      expect(source.art.frames, entry.id).toHaveLength(2)
      expect(source.art.frames[0], entry.id).not.toEqual(source.art.frames[1])
    }
  })

  it('gives static items a single frame', () => {
    for (const entry of CATALOG.filter((item) => item.category !== 'fish' && item.id !== 'treasureChest')) {
      const source = SPRITES[entry.id]
      if (source.kind !== 'pixels') throw new Error(entry.id)
      expect(source.art.frames, entry.id).toHaveLength(1)
    }
  })

  it('draws the chest closed then open', () => {
    const source = SPRITES.treasureChest
    if (source.kind !== 'pixels') throw new Error('treasureChest')
    expect(source.art.frames).toHaveLength(2)
    const [closed, open] = source.art.frames
    expect(closed).not.toEqual(open)
    const top = (rows: string[]) => rows.slice(0, 8).reduce((sum, row) => sum + opaque(row), 0)
    expect(top(open)).toBeGreaterThan(top(closed))
  })

  it('leaves no empty last row in non-fish sprites', () => {
    for (const entry of CATALOG.filter((item) => item.category !== 'fish')) {
      const source = SPRITES[entry.id]
      if (source.kind !== 'pixels') throw new Error(entry.id)
      expect(opaque(source.art.frames[0].at(-1) ?? ''), entry.id).toBeGreaterThan(0)
    }
  })

  it('animates only the tail of fish, which sits on the left of the head', () => {
    for (const entry of CATALOG.filter((item) => item.category === 'fish')) {
      const source = SPRITES[entry.id]
      if (source.kind !== 'pixels') throw new Error(entry.id)
      const [a, b] = source.art.frames
      const changed = a.flatMap((row, y) => [...row].flatMap((char, x) => (char !== b[y][x] ? [x] : [])))
      expect(Math.max(...changed), entry.id).toBeLessThan(entry.width / 2)
    }
  })

  it('draws the skull with a back and a front layer', () => {
    const source = SPRITES.skull
    if (source.kind !== 'pixels') throw new Error('skull')
    expect(source.art.back).toBeDefined()
    expect(source.art.front).toBeDefined()
    expect(source.art.frames).toHaveLength(1)
  })

  it('keeps the skull tunnel openings transparent in the front layer', () => {
    const source = SPRITES.skull
    const tunnel = getEntry('skull')?.tunnel
    if (source.kind !== 'pixels' || !source.art.front || !tunnel) throw new Error('skull')
    const front = source.art.front
    for (const point of [tunnel.entry, tunnel.exit]) {
      expect(front[point.y][point.x], `${point.x},${point.y}`).toBe('.')
    }
  })
})
