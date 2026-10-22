import { useEffect, useRef } from 'react'
import { getEntry } from '../../domain/catalog'
import { PALETTE, SPRITES } from '../tank/art'
import { loadSprite } from '../tank/engine/sprites'

const PREVIEW_SCALE = 3

export function SpritePreview({ catalogId }: { catalogId: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const entry = getEntry(catalogId)
  const width = (entry?.width ?? 0) * PREVIEW_SCALE
  const height = (entry?.height ?? 0) * PREVIEW_SCALE

  useEffect(() => {
    const source = SPRITES[catalogId]
    const ctx = canvasRef.current?.getContext('2d')
    if (!source || !ctx) return
    let cancelled = false
    loadSprite(source, PALETTE)
      .then((sprite) => {
        if (cancelled) return
        ctx.imageSmoothingEnabled = false
        for (const layer of [sprite.back, sprite.frames[0], sprite.front]) {
          if (layer) ctx.drawImage(layer, 0, 0, width, height)
        }
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [catalogId, width, height])

  return <canvas ref={canvasRef} className="sprite-preview" width={width} height={height} aria-hidden="true" />
}
