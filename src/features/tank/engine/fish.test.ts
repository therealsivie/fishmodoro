import { describe, expect, it } from 'vitest'
import { getEntry } from '../../../domain/catalog'
import type { OwnedFish } from '../../../domain/economy'
import { mulberry32 } from '../../../test/rng'
import { createAgent, stepAgent } from './fish'
import type { Swimmable } from './fish'
import { worldFor } from './scene'

const fish = (id: string, speciesId: string): OwnedFish => ({ id, speciesId, acquiredAt: 0, inTank: true })
const DT = 1 / 60

describe('fish agents', () => {
  it('fish stay inside the tank and respect species speed', () => {
    const world = worldFor(320, [{ id: 'shell1', catalogId: 'shell', x: 100, placed: true }])
    for (const species of ['goldfish', 'neonTetra', 'pufferfish']) {
      const rng = mulberry32(7)
      const speed = getEntry(species)!.speed!
      let agent = createAgent(fish('f', species), world, rng)
      for (let i = 0; i < 10_000; i++) {
        const next = stepAgent(agent, DT, world, rng)
        expect(Math.hypot(next.x - agent.x, next.y - agent.y)).toBeLessThanOrEqual(speed * DT + 1e-9)
        expect(next.x).toBeGreaterThanOrEqual(0)
        expect(next.x).toBeLessThanOrEqual(320 - 16)
        expect(next.y).toBeGreaterThanOrEqual(8)
        expect(next.y).toBeLessThanOrEqual(180 - 16 - 16)
        agent = next
      }
    }
  })

  it('uses the fallback speed for an unknown species', () => {
    const world: Swimmable = { width: 320, pois: [], tunnels: [] }
    const rng = mulberry32(3)
    let agent = createAgent(fish('f', 'mystery'), world, rng)
    for (let i = 0; i < 1000; i++) {
      const next = stepAgent(agent, DT, world, rng)
      expect(Math.hypot(next.x - agent.x, next.y - agent.y)).toBeLessThanOrEqual(16 * DT + 1e-9)
      agent = next
    }
  })

  it('fish eventually swim through the skull and leave it', () => {
    const world = worldFor(320, [{ id: 'skull1', catalogId: 'skull', x: 100, placed: true }])
    const rng = mulberry32(42)
    let agent = createAgent(fish('f', 'guppy'), world, rng)
    let wasInside = false
    let leftAfter = false
    for (let i = 0; i < 20_000 && !leftAfter; i++) {
      agent = stepAgent(agent, DT, world, rng)
      if (agent.insideItemId === 'skull1') wasInside = true
      else if (wasInside) leftAfter = true
    }
    expect(wasInside).toBe(true)
    expect(leftAfter).toBe(true)
    expect(agent.tunnelExit).toBeNull()
  })

  it('halves the speed inside the tunnel', () => {
    const world = worldFor(320, [{ id: 'skull1', catalogId: 'skull', x: 100, placed: true }])
    const rng = mulberry32(1)
    const base = createAgent(fish('f', 'guppy'), world, rng)
    const inside = { ...base, mode: 'tunnel' as const, insideItemId: 'skull1', x: 0, y: 8, target: { x: 300, y: 8 } }
    const next = stepAgent(inside, DT, world, rng)
    expect(next.x).toBeCloseTo(getEntry('guppy')!.speed! * 0.5 * DT)
  })

  it('vx follows the swimming direction', () => {
    const world: Swimmable = { width: 320, pois: [], tunnels: [] }
    const rng = mulberry32(5)
    const base = createAgent(fish('f', 'goldfish'), world, rng)
    const left = stepAgent({ ...base, x: 200, y: 50, target: { x: 50, y: 60 } }, DT, world, rng)
    const right = stepAgent({ ...base, x: 50, y: 50, target: { x: 200, y: 40 } }, DT, world, rng)
    expect(left.vx).toBeLessThan(0)
    expect(right.vx).toBeGreaterThan(0)
  })
})
