import { SAND_HEIGHT, TANK_HEIGHT, getEntry } from '../../../domain/catalog'
import type { Point } from '../../../domain/catalog'
import type { OwnedFish } from '../../../domain/economy'

export type Rng = () => number

export interface Swimmable {
  width: number
  pois: Point[]
  tunnels: Array<{ itemId: string; entry: Point; exit: Point }>
}

export interface FishAgent {
  id: string
  speciesId: string
  x: number
  y: number
  vx: number
  target: Point
  mode: 'wander' | 'visit' | 'tunnelIn' | 'tunnel'
  insideItemId: string | null
  tunnelExit: Point | null
}

const FISH_SIZE = 16
const HALF_FISH = FISH_SIZE / 2
const MIN_Y = 8
const MAX_Y = TANK_HEIGHT - SAND_HEIGHT - FISH_SIZE
const DEFAULT_SPEED = 16
const TUNNEL_SPEED_FACTOR = 0.5
const TUNNEL_CHANCE = 0.1
const VISIT_CHANCE = 0.25

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const maxX = (world: Swimmable) => Math.max(0, world.width - FISH_SIZE)
const centred = (point: Point): Point => ({ x: point.x - HALF_FISH, y: point.y - HALF_FISH })
const pick = <T>(list: T[], rng: Rng): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))]

function inSwimArea(point: Point, world: Swimmable): Point {
  return { x: clamp(point.x, 0, maxX(world)), y: clamp(point.y, MIN_Y, MAX_Y) }
}

function randomPoint(world: Swimmable, rng: Rng): Point {
  return { x: rng() * maxX(world), y: MIN_Y + rng() * (MAX_Y - MIN_Y) }
}

export function retarget(agent: FishAgent, world: Swimmable, rng: Rng): FishAgent {
  const roll = rng()
  if (roll < TUNNEL_CHANCE && world.tunnels.length > 0) {
    const tunnel = pick(world.tunnels, rng)
    return { ...agent, mode: 'tunnelIn', target: centred(tunnel.entry), tunnelExit: tunnel.exit, insideItemId: null }
  }
  if (roll < VISIT_CHANCE && world.pois.length > 0) {
    const poi = pick(world.pois, rng)
    return { ...agent, mode: 'visit', target: inSwimArea(centred(poi), world), tunnelExit: null, insideItemId: null }
  }
  return { ...agent, mode: 'wander', target: randomPoint(world, rng), tunnelExit: null, insideItemId: null }
}

export function createAgent(fish: OwnedFish, world: Swimmable, rng: Rng): FishAgent {
  const { x, y } = randomPoint(world, rng)
  return {
    id: fish.id,
    speciesId: fish.speciesId,
    x,
    y,
    vx: 0,
    target: randomPoint(world, rng),
    mode: 'wander',
    insideItemId: null,
    tunnelExit: null,
  }
}

function arrive(agent: FishAgent, world: Swimmable, rng: Rng): FishAgent {
  if (agent.mode === 'tunnelIn') {
    const tunnel = world.tunnels.find(
      (candidate) => candidate.exit.x === agent.tunnelExit?.x && candidate.exit.y === agent.tunnelExit?.y,
    )
    if (!tunnel) return retarget(agent, world, rng)
    return { ...agent, mode: 'tunnel', insideItemId: tunnel.itemId, target: centred(tunnel.exit) }
  }
  return retarget(agent, world, rng)
}

export function stepAgent(agent: FishAgent, dt: number, world: Swimmable, rng: Rng): FishAgent {
  const baseSpeed = getEntry(agent.speciesId)?.speed ?? DEFAULT_SPEED
  const speed = agent.mode === 'tunnel' ? baseSpeed * TUNNEL_SPEED_FACTOR : baseSpeed
  const stepLength = speed * dt
  const dx = agent.target.x - agent.x
  const dy = agent.target.y - agent.y
  const distance = Math.hypot(dx, dy)

  if (distance <= stepLength) {
    const arrived = { ...agent, x: agent.target.x, y: agent.target.y }
    return arrive(arrived, world, rng)
  }
  return {
    ...agent,
    x: agent.x + (dx / distance) * stepLength,
    y: agent.y + (dy / distance) * stepLength,
    vx: (dx / distance) * speed,
  }
}
