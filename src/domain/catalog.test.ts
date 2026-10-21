import { describe, expect, it } from 'vitest'
import { CATALOG, TANK_LEVELS, getEntry } from './catalog'
import type { Category } from './catalog'

const inCategory = (category: Category) => CATALOG.filter((e) => e.category === category)

describe('catalog', () => {
  it('has unique ids, 6 per category, chest and skull unique', () => {
    const ids = CATALOG.map((e) => e.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(inCategory('fish')).toHaveLength(6)
    expect(inCategory('plant')).toHaveLength(6)
    expect(inCategory('decoration')).toHaveLength(6)
    expect(
      CATALOG.filter((e) => e.unique)
        .map((e) => e.id)
        .sort(),
    ).toEqual(['skull', 'treasureChest'])
    expect(getEntry('treasureChest')?.behavior).toBe('chest')
    expect(getEntry('skull')?.behavior).toBe('skull')
    expect(CATALOG.filter((e) => e.behavior)).toHaveLength(2)
  })

  it('gives every fish a 16x16 sprite and a positive speed, and nothing else', () => {
    for (const e of CATALOG) {
      if (e.category === 'fish') {
        expect(e.width).toBe(16)
        expect(e.height).toBe(16)
        expect(e.speed).toBeGreaterThan(0)
      } else {
        expect(e.speed).toBeUndefined()
      }
    }
  })

  it('gives the tunnel to the skull only', () => {
    expect(CATALOG.filter((e) => e.tunnel).map((e) => e.id)).toEqual(['skull'])
  })

  it('keeps points of interest inside the sprite box', () => {
    for (const e of CATALOG) {
      const points = [...(e.pointsOfInterest ?? []), ...(e.tunnel ? [e.tunnel.entry, e.tunnel.exit] : [])]
      if (e.category === 'fish') expect(e.pointsOfInterest).toBeUndefined()
      else expect(e.pointsOfInterest?.length).toBeGreaterThan(0)
      for (const p of points) {
        expect(p.x).toBeGreaterThanOrEqual(0)
        expect(p.x).toBeLessThan(e.width)
        expect(p.y).toBeGreaterThanOrEqual(0)
        expect(p.y).toBeLessThan(e.height)
      }
    }
  })

  it('looks entries up by id', () => {
    expect(getEntry('goldfish')?.priceMinutes).toBe(15)
    expect(getEntry('nope')).toBeUndefined()
  })

  it('defines three tank levels', () => {
    expect(TANK_LEVELS.map((l) => [l.level, l.width, l.maxFish, l.maxItems, l.priceMinutes])).toEqual([
      [0, 320, 8, 12, 0],
      [1, 480, 12, 18, 900],
      [2, 640, 16, 24, 2400],
    ])
  })
})
