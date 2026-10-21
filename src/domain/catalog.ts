export type Category = 'fish' | 'plant' | 'decoration'

export interface Point {
  x: number
  y: number
}

export interface CatalogEntry {
  id: string
  category: Category
  priceMinutes: number
  unique: boolean
  width: number
  height: number
  speed?: number
  pointsOfInterest?: Point[]
  tunnel?: { entry: Point; exit: Point }
  behavior?: 'chest' | 'skull'
}

export interface TankLevel {
  level: number
  width: number
  maxFish: number
  maxItems: number
  priceMinutes: number
}

export const TANK_HEIGHT = 180
export const SAND_HEIGHT = 16

const FISH_SIZE = 16

function fish(id: string, priceMinutes: number, speed: number): CatalogEntry {
  return { id, category: 'fish', priceMinutes, unique: false, width: FISH_SIZE, height: FISH_SIZE, speed }
}

function plant(
  id: string,
  priceMinutes: number,
  width: number,
  height: number,
  pointsOfInterest: Point[],
): CatalogEntry {
  return { id, category: 'plant', priceMinutes, unique: false, width, height, pointsOfInterest }
}

function decoration(
  id: string,
  priceMinutes: number,
  width: number,
  height: number,
  pointsOfInterest: Point[],
  extra: Partial<CatalogEntry> = {},
): CatalogEntry {
  return {
    id,
    category: 'decoration',
    priceMinutes,
    unique: false,
    width,
    height,
    pointsOfInterest,
    ...extra,
  }
}

export const CATALOG: readonly CatalogEntry[] = [
  fish('goldfish', 15, 18),
  fish('guppy', 20, 24),
  fish('neonTetra', 25, 30),
  fish('clownfish', 40, 20),
  fish('angelfish', 60, 14),
  fish('pufferfish', 180, 10),

  plant('seaweed', 5, 16, 48, [
    { x: 8, y: 12 },
    { x: 8, y: 32 },
  ]),
  plant('grass', 8, 16, 16, [{ x: 8, y: 8 }]),
  plant('fern', 12, 16, 32, [
    { x: 8, y: 10 },
    { x: 8, y: 24 },
  ]),
  plant('pebbles', 15, 24, 8, [{ x: 12, y: 4 }]),
  plant('redCoral', 20, 24, 24, [
    { x: 6, y: 12 },
    { x: 18, y: 12 },
  ]),
  plant('anubias', 25, 24, 24, [{ x: 12, y: 12 }]),

  decoration('shell', 30, 16, 16, [{ x: 8, y: 8 }]),
  decoration('rockArch', 45, 48, 32, [
    { x: 24, y: 20 },
    { x: 8, y: 24 },
    { x: 40, y: 24 },
  ]),
  decoration('diverHelmet', 60, 32, 32, [
    { x: 16, y: 16 },
    { x: 16, y: 28 },
  ]),
  decoration('amphora', 90, 24, 32, [
    { x: 12, y: 8 },
    { x: 12, y: 24 },
  ]),
  decoration('treasureChest', 360, 32, 24, [{ x: 16, y: 12 }], { unique: true, behavior: 'chest' }),
  decoration('skull', 600, 48, 40, [{ x: 24, y: 20 }], {
    unique: true,
    behavior: 'skull',
    tunnel: { entry: { x: 14, y: 17 }, exit: { x: 34, y: 32 } },
  }),
]

export function getEntry(id: string): CatalogEntry | undefined {
  return CATALOG.find((entry) => entry.id === id)
}

export const TANK_LEVELS: readonly TankLevel[] = [
  { level: 0, width: 320, maxFish: 8, maxItems: 12, priceMinutes: 0 },
  { level: 1, width: 480, maxFish: 12, maxItems: 18, priceMinutes: 900 },
  { level: 2, width: 640, maxFish: 16, maxItems: 24, priceMinutes: 2400 },
]
