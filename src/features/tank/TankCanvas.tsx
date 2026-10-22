import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { TANK_HEIGHT, getEntry } from '../../domain/catalog'
import { currentLevel } from '../../domain/economy'
import { useGameStore } from '../../store/gameStore'
import { PALETTE, SPRITES } from './art'
import { createChest, stepChest } from './engine/chest'
import type { ChestState } from './engine/chest'
import { stepAgent } from './engine/fish'
import type { FishAgent } from './engine/fish'
import { FRAME_WIDTH, clampItemX, computeScale, exceedsTapTolerance, hitTestItem, toLogical } from './engine/layout'
import { syncAgents, worldFor } from './engine/scene'
import type { Swimmable } from './engine/fish'
import { loadSprite } from './engine/sprites'
import { drawScene } from './render'
import type { LoadedSprites } from './render'

interface Props {
  selectedId: string | null
  readOnly: boolean
  onSelect(id: string | null): void
}

type Gesture =
  | {
      kind: 'item'
      pointerId: number
      id: string
      startX: number
      startY: number
      grabOffset: number
      moved: boolean
      x: number
    }
  | { kind: 'pan'; pointerId: number; startX: number; lastX: number; moved: boolean }

const MAX_DT = 0.1

export function TankCanvas({ selectedId, readOnly, onSelect }: Props) {
  const { t } = useTranslation()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gestureRef = useRef<Gesture | null>(null)
  const live = useRef({ scale: 1, selectedId, readOnly, onSelect })
  const width = useGameStore((state) => currentLevel(state.tank).width)
  const [scale, setScale] = useState(1)
  const pixelRatio = window.devicePixelRatio || 1

  useEffect(() => {
    live.current = { scale, selectedId, readOnly, onSelect }
  })

  useEffect(() => {
    const wrapper = wrapperRef.current
    if (!wrapper) return
    setScale(computeScale(wrapper.clientHeight - 2 * FRAME_WIDTH))
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver((entries) => setScale(computeScale(entries[0].contentRect.height - 2 * FRAME_WIDTH)))
    observer.observe(wrapper)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    const sprites: LoadedSprites = {}
    for (const [id, source] of Object.entries(SPRITES)) {
      loadSprite(source, PALETTE)
        .then((sprite) => {
          sprites[id] = sprite
        })
        .catch(() => undefined)
    }

    let lastTank: unknown = null
    let tankWidth = 0
    let world: Swimmable = { width: 0, pois: [], tunnels: [] }
    let agents: FishAgent[] = []
    let chest: ChestState | null = null
    let lastTime = performance.now()
    let frameId = 0

    const frame = (time: number) => {
      const dt = Math.min(MAX_DT, (time - lastTime) / 1000)
      lastTime = time
      const now = Date.now()
      const { tank } = useGameStore.getState()

      if (tank !== lastTank) {
        lastTank = tank
        tankWidth = currentLevel(tank).width
        world = worldFor(tankWidth, tank.items)
        agents = syncAgents(agents, tank.fish, world, Math.random)
      }
      agents = agents.map((agent) => stepAgent(agent, dt, world, Math.random))

      const hasChest = tank.items.some((item) => item.placed && getEntry(item.catalogId)?.behavior === 'chest')
      chest = hasChest ? stepChest(chest ?? createChest(now, Math.random), now, Math.random) : null

      const gesture = gestureRef.current
      const items =
        gesture?.kind === 'item' && gesture.moved
          ? tank.items.map((item) => (item.id === gesture.id ? { ...item, x: gesture.x } : item))
          : tank.items

      const k = canvas.width / tankWidth
      ctx.setTransform(k, 0, 0, k, 0, 0)
      ctx.imageSmoothingEnabled = false
      drawScene(ctx, { width: tankWidth, items, agents, chest, selectedId: live.current.selectedId }, sprites, now)
      frameId = requestAnimationFrame(frame)
    }
    frameId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(frameId)
  }, [])

  const logicalPoint = (event: PointerEvent<HTMLCanvasElement>) =>
    toLogical(
      event.clientX - FRAME_WIDTH,
      event.clientY - FRAME_WIDTH,
      event.currentTarget.getBoundingClientRect(),
      live.current.scale,
    )

  const handlePointerDown = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current) return
    const point = logicalPoint(event)
    const { items } = useGameStore.getState().tank
    const id = live.current.readOnly ? null : hitTestItem(items, point)
    const item = items.find((candidate) => candidate.id === id)

    event.currentTarget.setPointerCapture(event.pointerId)
    gestureRef.current = item
      ? {
          kind: 'item',
          pointerId: event.pointerId,
          id: item.id,
          startX: event.clientX,
          startY: event.clientY,
          grabOffset: point.x - item.x,
          moved: false,
          x: item.x,
        }
      : { kind: 'pan', pointerId: event.pointerId, startX: event.clientX, lastX: event.clientX, moved: false }
  }

  const handlePointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    if (gesture.kind === 'pan') {
      if (wrapperRef.current) wrapperRef.current.scrollLeft -= event.clientX - gesture.lastX
      gesture.lastX = event.clientX
      if (exceedsTapTolerance(event.clientX - gesture.startX, 0)) gesture.moved = true
      return
    }

    if (!gesture.moved && !exceedsTapTolerance(event.clientX - gesture.startX, event.clientY - gesture.startY)) {
      return
    }
    gesture.moved = true
    const item = useGameStore.getState().tank.items.find((candidate) => candidate.id === gesture.id)
    const entry = item && getEntry(item.catalogId)
    if (!entry) return
    const tankWidth = currentLevel(useGameStore.getState().tank).width
    gesture.x = clampItemX(Math.round(logicalPoint(event).x - gesture.grabOffset), entry.width, tankWidth)
  }

  const handlePointerUp = (event: PointerEvent<HTMLCanvasElement>) => {
    const gesture = gestureRef.current
    if (!gesture || gesture.pointerId !== event.pointerId) return

    if (gesture.kind === 'pan') {
      if (!gesture.moved) live.current.onSelect(null)
    } else {
      if (gesture.moved) useGameStore.getState().placeItem(gesture.id, gesture.x)
      live.current.onSelect(gesture.id)
    }
    gestureRef.current = null
  }

  const handlePointerCancel = (event: PointerEvent<HTMLCanvasElement>) => {
    if (gestureRef.current?.pointerId === event.pointerId) gestureRef.current = null
  }

  return (
    <div ref={wrapperRef} className="tank-canvas">
      <canvas
        ref={canvasRef}
        className="tank-canvas__canvas"
        role="img"
        aria-label={t('tank.canvasLabel')}
        width={Math.round(width * scale * pixelRatio)}
        height={Math.round(TANK_HEIGHT * scale * pixelRatio)}
        style={{ width: width * scale, height: TANK_HEIGHT * scale }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        onLostPointerCapture={handlePointerCancel}
      />
    </div>
  )
}
