import { SAND_HEIGHT, TANK_HEIGHT, getEntry } from '../../domain/catalog'
import type { CatalogEntry } from '../../domain/catalog'
import type { OwnedItem } from '../../domain/economy'
import type { ChestState } from './engine/chest'
import type { FishAgent } from './engine/fish'
import { drawOrder, itemTop } from './engine/layout'
import type { LoadedSprite } from './engine/sprites'

export interface SceneSnapshot {
  width: number
  items: OwnedItem[]
  agents: FishAgent[]
  chest: ChestState | null
  selectedId: string | null
}

export type LoadedSprites = Record<string, LoadedSprite | undefined>

const WATER_BOTTOM = TANK_HEIGHT - SAND_HEIGHT
const FISH_SIZE = 16
const FRAME_MS = 250
const RIGID_PLANTS = new Set(['pebbles', 'redCoral'])
const WATER_BANDS = ['#24507a', '#1f4569', '#1b3a5c']
const SAND = '#d9b77a'
const SAND_DOTS = ['#b8955a', '#f0d9a0']
const BUBBLE = 'rgba(255, 255, 255, 0.55)'
const GLITTER = '#ffe066'
const SELECTION = '#ffffff'
const AMBIENT_BUBBLES = 8
const CHEST_BUBBLES = 4

const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

const idPhase = (id: string): number => {
  let sum = 0
  for (const char of id) sum += char.charCodeAt(0)
  return sum
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number): void {
  const bandHeight = WATER_BOTTOM / WATER_BANDS.length
  WATER_BANDS.forEach((color, index) => {
    ctx.fillStyle = color
    const top = Math.round(index * bandHeight)
    ctx.fillRect(0, top, width, Math.round((index + 1) * bandHeight) - top)
  })
  ctx.fillStyle = SAND
  ctx.fillRect(0, WATER_BOTTOM, width, SAND_HEIGHT)
  const dots = Math.floor(width / 6)
  for (let index = 0; index < dots; index++) {
    ctx.fillStyle = SAND_DOTS[index % SAND_DOTS.length]
    ctx.fillRect(Math.floor(hash(index) * width), WATER_BOTTOM + Math.floor(hash(index + 1000) * SAND_HEIGHT), 1, 1)
  }
}

function drawPlant(
  ctx: CanvasRenderingContext2D,
  frame: CanvasImageSource,
  item: OwnedItem,
  entry: CatalogEntry,
  now: number,
): void {
  const top = itemTop(entry)
  if (RIGID_PLANTS.has(entry.id)) {
    ctx.drawImage(frame, item.x, top)
    return
  }
  const phase = idPhase(item.id)
  for (let row = 0; row < entry.height; row++) {
    const shift = Math.round(Math.sin(now / 800 + phase) * (1 - row / entry.height))
    ctx.drawImage(frame, 0, row, entry.width, 1, item.x + shift, top + row, entry.width, 1)
  }
}

function drawFish(ctx: CanvasRenderingContext2D, agent: FishAgent, sprite: LoadedSprite | undefined, now: number): void {
  if (!sprite) return
  const frame = sprite.frames[Math.floor(now / FRAME_MS) % sprite.frames.length]
  const x = Math.round(agent.x)
  const y = Math.round(agent.y)
  if (agent.vx < 0) {
    ctx.save()
    ctx.translate(x + FISH_SIZE, y)
    ctx.scale(-1, 1)
    ctx.drawImage(frame, 0, 0)
    ctx.restore()
  } else {
    ctx.drawImage(frame, x, y)
  }
}

function drawBubbles(ctx: CanvasRenderingContext2D, width: number, now: number): void {
  ctx.fillStyle = BUBBLE
  for (let index = 0; index < AMBIENT_BUBBLES; index++) {
    const period = 7000 + hash(index) * 5000
    const progress = ((now + hash(index + 50) * period) % period) / period
    const x = Math.round(hash(index + 100) * width + Math.sin(now / 700 + index) * 1.5)
    const size = index % 3 === 0 ? 2 : 1
    ctx.fillRect(x, Math.round(WATER_BOTTOM * (1 - progress)), size, size)
  }
}

function drawChestEffects(ctx: CanvasRenderingContext2D, chestItem: OwnedItem, entry: CatalogEntry, now: number): void {
  const top = itemTop(entry)
  ctx.fillStyle = BUBBLE
  for (let index = 0; index < CHEST_BUBBLES; index++) {
    const progress = (now / 1500 + index / CHEST_BUBBLES) % 1
    const x = chestItem.x + 10 + index * 4 + Math.round(Math.sin(now / 400 + index))
    ctx.fillRect(x, Math.round(top + 4 - progress * 36), 1, 1)
  }
  ctx.fillStyle = GLITTER
  for (let index = 0; index < 3; index++) {
    if (Math.floor(now / 150 + index * 3) % 2 === 0) {
      ctx.fillRect(chestItem.x + 10 + index * 5, top + 6 + (index % 2) * 2, 1, 1)
    }
  }
}

function drawSelection(ctx: CanvasRenderingContext2D, item: OwnedItem, entry: CatalogEntry): void {
  const x = item.x - 1
  const y = itemTop(entry) - 1
  const w = entry.width + 2
  const h = entry.height + 2
  ctx.fillStyle = SELECTION
  ctx.fillRect(x, y, w, 1)
  ctx.fillRect(x, y + h - 1, w, 1)
  ctx.fillRect(x, y, 1, h)
  ctx.fillRect(x + w - 1, y, 1, h)
}

export function drawScene(ctx: CanvasRenderingContext2D, scene: SceneSnapshot, sprites: LoadedSprites, now: number): void {
  drawBackground(ctx, scene.width)

  const ordered = drawOrder(scene.items)
  let chestItem: OwnedItem | undefined
  let chestEntry: CatalogEntry | undefined

  for (const item of ordered) {
    const entry = getEntry(item.catalogId)
    const sprite = sprites[item.catalogId]
    if (!entry) continue
    if (sprite) {
      const top = itemTop(entry)
      if (entry.behavior === 'skull') {
        if (sprite.back) ctx.drawImage(sprite.back, item.x, top)
        for (const agent of scene.agents) {
          if (agent.insideItemId === item.id) drawFish(ctx, agent, sprites[agent.speciesId], now)
        }
        if (sprite.front) ctx.drawImage(sprite.front, item.x, top)
      } else if (entry.category === 'plant') {
        drawPlant(ctx, sprite.frames[0], item, entry, now)
      } else {
        const open = entry.behavior === 'chest' && scene.chest?.open
        ctx.drawImage(sprite.frames[open ? 1 : 0] ?? sprite.frames[0], item.x, top)
      }
    }
    if (entry.behavior === 'chest') {
      chestItem = item
      chestEntry = entry
    }
  }

  for (const agent of scene.agents) {
    if (agent.insideItemId === null) drawFish(ctx, agent, sprites[agent.speciesId], now)
  }

  drawBubbles(ctx, scene.width, now)
  if (scene.chest?.open && chestItem && chestEntry) drawChestEffects(ctx, chestItem, chestEntry, now)

  const selected = ordered.find((item) => item.id === scene.selectedId)
  const selectedEntry = selected && getEntry(selected.catalogId)
  if (selected && selectedEntry) drawSelection(ctx, selected, selectedEntry)
}
