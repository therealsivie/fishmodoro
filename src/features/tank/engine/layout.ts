import { SAND_HEIGHT, TANK_HEIGHT, getEntry } from '../../../domain/catalog'
import type { CatalogEntry, Point } from '../../../domain/catalog'
import type { OwnedItem } from '../../../domain/economy'

export const FRAME_WIDTH = 2
const TAP_TOLERANCE = 3

export function clampItemX(x: number, itemWidth: number, tankWidth: number): number {
  return Math.min(tankWidth - itemWidth, Math.max(0, x))
}

export function exceedsTapTolerance(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= TAP_TOLERANCE
}

export function computeScale(availableHeight: number): number {
  return Math.max(1, Math.floor(availableHeight / TANK_HEIGHT))
}

export function itemTop(entry: CatalogEntry): number {
  return TANK_HEIGHT - SAND_HEIGHT / 2 - entry.height
}

export function toLogical(clientX: number, clientY: number, rect: DOMRect, scale: number): Point {
  return { x: (clientX - rect.left) / scale, y: (clientY - rect.top) / scale }
}

export function drawOrder(items: OwnedItem[]): OwnedItem[] {
  return items
    .filter((item) => item.placed && getEntry(item.catalogId) !== undefined)
    .sort((a, b) => a.x - b.x)
}

export function hitTestItem(items: OwnedItem[], p: Point): string | null {
  const ordered = drawOrder(items)
  for (let index = ordered.length - 1; index >= 0; index--) {
    const item = ordered[index]
    const entry = getEntry(item.catalogId)
    if (!entry) continue
    const top = itemTop(entry)
    if (p.x >= item.x && p.x < item.x + entry.width && p.y >= top && p.y < top + entry.height) {
      return item.id
    }
  }
  return null
}
