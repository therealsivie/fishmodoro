import { describe, expect, it } from 'vitest'
import {
  EMPTY_TANK,
  buy,
  currentLevel,
  missingSeconds,
  placeItem,
  setFishInTank,
  storeItem,
  upgradeTank,
} from './economy'
import type { OwnedFish, OwnedItem, Result, Tank } from './economy'

const fish = (n: number, inTank: boolean): OwnedFish => ({
  id: `f${n}`,
  speciesId: 'goldfish',
  acquiredAt: n,
  inTank,
})

const item = (id: string, catalogId: string, x: number, placed: boolean): OwnedItem => ({
  id,
  catalogId,
  x,
  placed,
})

const tankOf = (parts: Partial<Tank>): Tank => ({ ...EMPTY_TANK, ...parts })

function unwrap<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`unexpected error: ${result.error}`)
  return result.value
}

const fullOfFish = tankOf({ fish: Array.from({ length: 8 }, (_, i) => fish(i, true)) })
const fullOfItems = tankOf({
  items: Array.from({ length: 12 }, (_, i) => item(`i${i}`, 'grass', 0, true)),
})

describe('buy', () => {
  it('spends price in seconds and puts fish in the tank', () => {
    const r = buy(900, EMPTY_TANK, 'goldfish', 1, () => 'f1')
    expect(r).toEqual({
      ok: true,
      value: {
        credits: 0,
        id: 'f1',
        placed: true,
        tank: expect.objectContaining({
          fish: [{ id: 'f1', speciesId: 'goldfish', acquiredAt: 1, inTank: true }],
        }),
      },
    })
    expect(buy(899, EMPTY_TANK, 'goldfish', 1, () => 'f1')).toEqual({
      ok: false,
      error: 'insufficientCredits',
    })
  })

  it('does not mutate its inputs', () => {
    buy(900, EMPTY_TANK, 'goldfish', 1, () => 'f1')
    expect(EMPTY_TANK).toEqual({ level: 0, fish: [], items: [] })
  })

  it('sends the ninth fish of a base tank to the inventory', () => {
    const value = unwrap(buy(900, fullOfFish, 'goldfish', 9, () => 'f9'))
    expect(value.placed).toBe(false)
    expect(value.tank.fish).toHaveLength(9)
    expect(value.tank.fish[8]).toEqual({ id: 'f9', speciesId: 'goldfish', acquiredAt: 9, inTank: false })
  })

  it('counts only fish in the tank toward the capacity', () => {
    const tank = tankOf({ fish: [...fullOfFish.fish.slice(0, 7), fish(20, false), fish(21, false)] })
    expect(unwrap(buy(900, tank, 'goldfish', 9, () => 'f9')).placed).toBe(true)
  })

  it('centers a bought item in the tank and places it', () => {
    const value = unwrap(buy(5 * 60, EMPTY_TANK, 'seaweed', 1, () => 'p1'))
    expect(value.placed).toBe(true)
    expect(value.tank.items).toEqual([{ id: 'p1', catalogId: 'seaweed', x: 152, placed: true }])
  })

  it('keeps a bought item in the inventory when the tank is full', () => {
    const value = unwrap(buy(900, fullOfItems, 'grass', 1, () => 'p13'))
    expect(value.placed).toBe(false)
    expect(value.tank.items).toHaveLength(13)
    expect(value.tank.items[12]).toEqual({ id: 'p13', catalogId: 'grass', x: 152, placed: false })
  })

  it('refuses a unique decoration bought twice', () => {
    const first = unwrap(buy(36_000, EMPTY_TANK, 'skull', 1, () => 's1'))
    expect(first.credits).toBe(0)
    expect(buy(36_000, first.tank, 'skull', 2, () => 's2')).toEqual({ ok: false, error: 'alreadyOwned' })
  })

  it('refuses a unique decoration kept in the inventory', () => {
    const tank = tankOf({ items: [item('c1', 'treasureChest', 10, false)] })
    expect(buy(99_999, tank, 'treasureChest', 1, () => 'c2')).toEqual({ ok: false, error: 'alreadyOwned' })
  })

  it('reports an unknown item and does not draw an id', () => {
    let calls = 0
    const newId = () => `x${++calls}`
    expect(buy(99_999, EMPTY_TANK, 'nope', 1, newId)).toEqual({ ok: false, error: 'unknownItem' })
    expect(buy(0, EMPTY_TANK, 'goldfish', 1, newId)).toEqual({ ok: false, error: 'insufficientCredits' })
    expect(calls).toBe(0)
  })

  it('checks ownership before the price', () => {
    const tank = tankOf({ items: [item('s1', 'skull', 0, true)] })
    expect(buy(0, tank, 'skull', 1, () => 's2')).toEqual({ ok: false, error: 'alreadyOwned' })
  })
})

describe('placeItem', () => {
  const tank = tankOf({ items: [item('a1', 'amphora', 100, true)] })
  const xOf = (result: Result<Tank>) => unwrap(result).items[0].x

  it('clamps x to the tank width', () => {
    expect(xOf(placeItem(tank, 'a1', 400))).toBe(296)
    expect(xOf(placeItem(tank, 'a1', -5))).toBe(0)
  })

  it('rounds x and replaces non-finite values with 0', () => {
    expect(xOf(placeItem(tank, 'a1', 10.6))).toBe(11)
    expect(xOf(placeItem(tank, 'a1', Number.NaN))).toBe(0)
    expect(xOf(placeItem(tank, 'a1', Number.POSITIVE_INFINITY))).toBe(0)
  })

  it('reports an unknown item', () => {
    expect(placeItem(tank, 'zz', 10)).toEqual({ ok: false, error: 'unknownItem' })
  })

  it('places an inventory item and leaves the input untouched', () => {
    const stored = tankOf({ items: [item('a1', 'amphora', 0, false)] })
    const next = unwrap(placeItem(stored, 'a1', 50))
    expect(next.items[0]).toEqual({ id: 'a1', catalogId: 'amphora', x: 50, placed: true })
    expect(stored.items[0].placed).toBe(false)
  })

  it('fails with tankFull when placing from the inventory into a full tank', () => {
    const full = tankOf({ items: [...fullOfItems.items, item('a1', 'amphora', 0, false)] })
    expect(placeItem(full, 'a1', 10)).toEqual({ ok: false, error: 'tankFull' })
  })

  it('moves an already placed item even when the tank is full', () => {
    const full = tankOf({ items: [...fullOfItems.items.slice(0, 11), item('a1', 'amphora', 0, true)] })
    expect(unwrap(placeItem(full, 'a1', 40)).items[11].x).toBe(40)
  })
})

describe('storeItem', () => {
  it('keeps x and clears placed', () => {
    const tank = tankOf({ items: [item('a1', 'amphora', 100, true)] })
    expect(storeItem(tank, 'a1').items).toEqual([item('a1', 'amphora', 100, false)])
    expect(tank.items[0].placed).toBe(true)
  })

  it('returns the same tank for an unknown id', () => {
    expect(storeItem(EMPTY_TANK, 'zz')).toBe(EMPTY_TANK)
  })
})

describe('setFishInTank', () => {
  it('fails with tankFull when moving into a full tank', () => {
    const tank = tankOf({ fish: [...fullOfFish.fish, fish(9, false)] })
    expect(setFishInTank(tank, 'f9', true)).toEqual({ ok: false, error: 'tankFull' })
  })

  it('moves a fish into the tank when there is room', () => {
    const tank = tankOf({ fish: [fish(1, false)] })
    expect(unwrap(setFishInTank(tank, 'f1', true)).fish).toEqual([fish(1, true)])
  })

  it('always lets a fish go back to the inventory', () => {
    expect(unwrap(setFishInTank(fullOfFish, 'f0', false)).fish[0].inTank).toBe(false)
  })

  it('accepts a fish already in the tank even when it is full', () => {
    expect(unwrap(setFishInTank(fullOfFish, 'f0', true))).toEqual(fullOfFish)
  })

  it('reports an unknown fish', () => {
    expect(setFishInTank(EMPTY_TANK, 'zz', true)).toEqual({ ok: false, error: 'unknownItem' })
  })
})

describe('upgradeTank', () => {
  it('keeps item positions', () => {
    const tank = tankOf({ items: [item('a1', 'amphora', 100, true)], fish: [fish(1, true)] })
    const r = upgradeTank(54_000, tank)
    expect(r).toMatchObject({ ok: true, value: { credits: 0, tank: { level: 1 } } })
    const value = unwrap(r)
    expect(value.tank.items).toEqual(tank.items)
    expect(value.tank.fish).toEqual(tank.fish)
  })

  it('refuses when credits are short', () => {
    expect(upgradeTank(53_999, EMPTY_TANK)).toEqual({ ok: false, error: 'insufficientCredits' })
  })

  it('charges the next level price', () => {
    expect(unwrap(upgradeTank(150_000, tankOf({ level: 1 })))).toMatchObject({
      credits: 6_000,
      tank: { level: 2 },
    })
  })

  it('reports maxLevel at the last level', () => {
    expect(upgradeTank(999_999, tankOf({ level: 2 }))).toEqual({ ok: false, error: 'maxLevel' })
  })
})

describe('missingSeconds', () => {
  it('returns what is still needed, never negative', () => {
    expect(missingSeconds(600, 15)).toBe(300)
    expect(missingSeconds(1000, 15)).toBe(0)
  })
})

describe('currentLevel', () => {
  it('returns the level of the tank', () => {
    expect(currentLevel(EMPTY_TANK).width).toBe(320)
    expect(currentLevel(tankOf({ level: 2 })).width).toBe(640)
  })

  it('clamps invalid levels into range', () => {
    expect(currentLevel(tankOf({ level: 7 })).level).toBe(2)
    expect(currentLevel(tankOf({ level: -1 })).level).toBe(0)
    expect(currentLevel(tankOf({ level: 1.5 })).level).toBe(1)
    expect(currentLevel(tankOf({ level: Number.NaN })).level).toBe(0)
  })
})
