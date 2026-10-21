import { TANK_LEVELS, getEntry } from './catalog'
import type { TankLevel } from './catalog'

export interface OwnedFish {
  id: string
  speciesId: string
  acquiredAt: number
  inTank: boolean
}

export interface OwnedItem {
  id: string
  catalogId: string
  x: number
  placed: boolean
}

export interface Tank {
  level: number
  fish: OwnedFish[]
  items: OwnedItem[]
}

export const EMPTY_TANK: Tank = { level: 0, fish: [], items: [] }

export type ActionError =
  | 'insufficientCredits'
  | 'alreadyOwned'
  | 'unknownItem'
  | 'maxLevel'
  | 'tankFull'
  | 'focusActive'

export type Result<T> = { ok: true; value: T } | { ok: false; error: ActionError }

const SECONDS_PER_MINUTE = 60

const fail = (error: ActionError): { ok: false; error: ActionError } => ({ ok: false, error })

export function currentLevel(tank: Tank): TankLevel {
  const index = Number.isFinite(tank.level) ? Math.floor(tank.level) : 0
  return TANK_LEVELS[Math.min(TANK_LEVELS.length - 1, Math.max(0, index))]
}

const fishInTank = (tank: Tank): number => tank.fish.filter((f) => f.inTank).length
const itemsPlaced = (tank: Tank): number => tank.items.filter((i) => i.placed).length

export function missingSeconds(credits: number, priceMinutes: number): number {
  return Math.max(0, priceMinutes * SECONDS_PER_MINUTE - credits)
}

export function buy(
  credits: number,
  tank: Tank,
  catalogId: string,
  now: number,
  newId: () => string,
): Result<{ credits: number; tank: Tank; id: string; placed: boolean }> {
  const entry = getEntry(catalogId)
  if (!entry) return fail('unknownItem')

  if (entry.unique && tank.items.some((i) => i.catalogId === catalogId)) return fail('alreadyOwned')

  const price = entry.priceMinutes * SECONDS_PER_MINUTE
  if (credits < price) return fail('insufficientCredits')

  const level = currentLevel(tank)
  const id = newId()
  const remaining = credits - price

  if (entry.category === 'fish') {
    const placed = fishInTank(tank) < level.maxFish
    const owned: OwnedFish = { id, speciesId: catalogId, acquiredAt: now, inTank: placed }
    return { ok: true, value: { credits: remaining, tank: { ...tank, fish: [...tank.fish, owned] }, id, placed } }
  }

  const placed = itemsPlaced(tank) < level.maxItems
  const owned: OwnedItem = {
    id,
    catalogId,
    x: Math.floor((level.width - entry.width) / 2),
    placed,
  }
  return { ok: true, value: { credits: remaining, tank: { ...tank, items: [...tank.items, owned] }, id, placed } }
}

export function upgradeTank(credits: number, tank: Tank): Result<{ credits: number; tank: Tank }> {
  const current = currentLevel(tank)
  const next = TANK_LEVELS[TANK_LEVELS.indexOf(current) + 1]
  if (!next) return fail('maxLevel')

  const price = next.priceMinutes * SECONDS_PER_MINUTE
  if (credits < price) return fail('insufficientCredits')

  return { ok: true, value: { credits: credits - price, tank: { ...tank, level: next.level } } }
}

export function setFishInTank(tank: Tank, fishId: string, inTank: boolean): Result<Tank> {
  const target = tank.fish.find((f) => f.id === fishId)
  if (!target) return fail('unknownItem')

  if (inTank && !target.inTank && fishInTank(tank) >= currentLevel(tank).maxFish) return fail('tankFull')

  return {
    ok: true,
    value: { ...tank, fish: tank.fish.map((f) => (f.id === fishId ? { ...f, inTank } : f)) },
  }
}

export function placeItem(tank: Tank, itemId: string, x: number): Result<Tank> {
  const target = tank.items.find((i) => i.id === itemId)
  const entry = target && getEntry(target.catalogId)
  if (!target || !entry) return fail('unknownItem')

  const level = currentLevel(tank)
  if (!target.placed && itemsPlaced(tank) >= level.maxItems) return fail('tankFull')

  const rounded = Number.isFinite(x) ? Math.round(x) : 0
  const clamped = Math.min(level.width - entry.width, Math.max(0, rounded))

  return {
    ok: true,
    value: {
      ...tank,
      items: tank.items.map((i) => (i.id === itemId ? { ...i, x: clamped, placed: true } : i)),
    },
  }
}

export function storeItem(tank: Tank, itemId: string): Tank {
  if (!tank.items.some((i) => i.id === itemId)) return tank
  return { ...tank, items: tank.items.map((i) => (i.id === itemId ? { ...i, placed: false } : i)) }
}
