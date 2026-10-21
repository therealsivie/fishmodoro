import { describe, expect, it } from 'vitest'
import { mulberry32 } from '../../../test/rng'
import { createChest, stepChest } from './chest'

describe('chest', () => {
  it('starts closed with a 20-60 s delay', () => {
    const chest = createChest(1000, mulberry32(1))
    expect(chest.open).toBe(false)
    expect(chest.nextChangeAt).toBeGreaterThanOrEqual(1000 + 20_000)
    expect(chest.nextChangeAt).toBeLessThanOrEqual(1000 + 60_000)
  })

  it('chest opens for 4 seconds', () => {
    const rng = mulberry32(9)
    const closed = createChest(0, rng)
    expect(stepChest(closed, closed.nextChangeAt - 1, rng)).toBe(closed)
    const open = stepChest(closed, closed.nextChangeAt, rng)
    expect(open.open).toBe(true)
    expect(open.nextChangeAt).toBe(closed.nextChangeAt + 4000)
    const again = stepChest(open, open.nextChangeAt, rng)
    expect(again.open).toBe(false)
    expect(again.nextChangeAt - open.nextChangeAt).toBeGreaterThanOrEqual(20_000)
    expect(again.nextChangeAt - open.nextChangeAt).toBeLessThanOrEqual(60_000)
  })

  it('toggles once after a long gap', () => {
    const rng = mulberry32(2)
    const closed = createChest(0, rng)
    const open = stepChest(closed, 10_000_000, rng)
    expect(open.open).toBe(true)
    expect(open.nextChangeAt).toBe(10_004_000)
  })
})
