import type { Rng } from './fish'

export interface ChestState {
  open: boolean
  nextChangeAt: number
}

const OPEN_MS = 4000
const MIN_CLOSED_MS = 20_000
const MAX_CLOSED_MS = 60_000

const closedFor = (rng: Rng) => MIN_CLOSED_MS + rng() * (MAX_CLOSED_MS - MIN_CLOSED_MS)

export function createChest(now: number, rng: Rng): ChestState {
  return { open: false, nextChangeAt: now + closedFor(rng) }
}

export function stepChest(state: ChestState, now: number, rng: Rng): ChestState {
  if (now < state.nextChangeAt) return state
  return state.open
    ? { open: false, nextChangeAt: now + closedFor(rng) }
    : { open: true, nextChangeAt: now + OPEN_MS }
}
