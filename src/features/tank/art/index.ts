import type { SpriteSource } from '../engine/sprites'
import { DECORATIONS } from './decorations'
import { FISH } from './fish'
import { PLANTS } from './plants'

export { PALETTE } from './palette'

export const SPRITES: Record<string, SpriteSource> = { ...FISH, ...PLANTS, ...DECORATIONS }
