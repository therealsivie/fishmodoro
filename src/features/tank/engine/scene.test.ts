import { describe, expect, it } from 'vitest'
import type { OwnedFish } from '../../../domain/economy'
import { mulberry32 } from '../../../test/rng'
import { stepAgent } from './fish'
import { syncAgents, worldFor } from './scene'

const fish = (id: string, inTank = true): OwnedFish => ({ id, speciesId: 'goldfish', acquiredAt: 0, inTank })

describe('scene', () => {
  it('worldFor translates points to tank coordinates and skips stored items', () => {
    const world = worldFor(320, [
      { id: 's', catalogId: 'skull', x: 100, placed: true },
      { id: 'g', catalogId: 'grass', x: 10, placed: false },
    ])
    expect(world.pois).toEqual([{ x: 124, y: 132 + 20 }])
    expect(world.tunnels).toEqual([
      { itemId: 's', entry: { x: 114, y: 149 }, exit: { x: 130, y: 166 } },
    ])
  })

  it('syncAgents keeps existing positions, adds new and removes gone fish', () => {
    const world = worldFor(320, [])
    const rng = mulberry32(5)
    let agents = syncAgents([], [fish('a'), fish('b')], world, rng)
    for (let i = 0; i < 100; i++) agents = agents.map((agent) => stepAgent(agent, 1 / 60, world, rng))
    const before = agents.find((agent) => agent.id === 'a')!
    const next = syncAgents(agents, [fish('a'), fish('c'), fish('d', false)], world, rng)
    expect(next.map((agent) => agent.id)).toEqual(['a', 'c'])
    expect(next[0]).toEqual(before)
  })

  it('syncAgents releases a fish whose tunnel item was removed', () => {
    const withSkull = worldFor(320, [{ id: 's', catalogId: 'skull', x: 100, placed: true }])
    const rng = mulberry32(5)
    const [agent] = syncAgents([], [fish('a')], withSkull, rng)
    const stuck = { ...agent, mode: 'tunnel' as const, insideItemId: 's', tunnelExit: { x: 130, y: 166 } }
    const [freed] = syncAgents([stuck], [fish('a')], worldFor(320, []), rng)
    expect(freed.mode).toBe('wander')
    expect(freed.insideItemId).toBeNull()
  })

  it('syncAgents releases a fish whose tunnel item was moved', () => {
    const withSkull = worldFor(320, [{ id: 's', catalogId: 'skull', x: 100, placed: true }])
    const rng = mulberry32(5)
    const [agent] = syncAgents([], [fish('a')], withSkull, rng)
    const inside = { ...agent, mode: 'tunnel' as const, insideItemId: 's', tunnelExit: { x: 130, y: 166 } }
    const moved = worldFor(320, [{ id: 's', catalogId: 'skull', x: 200, placed: true }])
    expect(syncAgents([inside], [fish('a')], withSkull, rng)[0]).toEqual(inside)
    const [freed] = syncAgents([inside], [fish('a')], moved, rng)
    expect(freed.mode).not.toBe('tunnel')
    expect(freed.insideItemId).toBeNull()
  })
})
