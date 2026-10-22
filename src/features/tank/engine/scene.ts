import { getEntry } from '../../../domain/catalog'
import type { Point } from '../../../domain/catalog'
import type { OwnedFish, OwnedItem } from '../../../domain/economy'
import { createAgent, retarget } from './fish'
import type { FishAgent, Rng, Swimmable } from './fish'
import { itemTop } from './layout'

export function worldFor(tankWidth: number, items: OwnedItem[]): Swimmable {
  const world: Swimmable = { width: tankWidth, pois: [], tunnels: [] }
  for (const item of items) {
    const entry = item.placed ? getEntry(item.catalogId) : undefined
    if (!entry) continue
    const top = itemTop(entry)
    const place = (p: Point): Point => ({ x: item.x + p.x, y: top + p.y })
    world.pois.push(...(entry.pointsOfInterest ?? []).map(place))
    if (entry.tunnel) {
      world.tunnels.push({ itemId: item.id, entry: place(entry.tunnel.entry), exit: place(entry.tunnel.exit) })
    }
  }
  return world
}

function tunnelStillExists(agent: FishAgent, world: Swimmable): boolean {
  if (agent.mode !== 'tunnel' && agent.mode !== 'tunnelIn') return true
  return world.tunnels.some(
    (tunnel) =>
      (agent.mode === 'tunnelIn' || tunnel.itemId === agent.insideItemId) &&
      tunnel.exit.x === agent.tunnelExit?.x &&
      tunnel.exit.y === agent.tunnelExit?.y,
  )
}

export function syncAgents(agents: FishAgent[], fishInTank: OwnedFish[], world: Swimmable, rng: Rng): FishAgent[] {
  const existing = new Map(agents.map((agent) => [agent.id, agent]))
  return fishInTank
    .filter((fish) => fish.inTank)
    .map((fish) => {
      const agent = existing.get(fish.id)
      if (!agent) return createAgent(fish, world, rng)
      return tunnelStillExists(agent, world) ? agent : retarget(agent, world, rng)
    })
}
