import { z } from 'zod'
import { CATALOG, TANK_LEVELS } from './catalog'
import { DEFAULT_SETTINGS, sanitizeSettings } from './settings'
import type { Settings } from './settings'
import { createInitialTimer } from './timer'
import type { TimerState } from './timer'
import type { Stats } from './stats'
import type { Tank } from './economy'

export const SAVE_VERSION = 1

export interface SaveData {
  version: 1
  credits: number
  settings: Settings
  timer: TimerState
  stats: Stats
  tank: Tank
}

export type ParseError = 'invalidJson' | 'invalidFormat' | 'newerVersion'

export type ParseResult = { ok: true; save: SaveData } | { ok: false; error: ParseError }

export function createDefaultSave(): SaveData {
  return {
    version: 1,
    credits: 0,
    settings: { ...DEFAULT_SETTINGS },
    timer: createInitialTimer(DEFAULT_SETTINGS),
    stats: { totalFocusSeconds: 0, completedPomodoros: 0, days: {}, bestStreak: 0 },
    tank: { level: 0, fish: [], items: [] },
  }
}

const count = z.number().int().nonnegative()
const catalogIds = (...categories: string[]): Set<string> =>
  new Set(CATALOG.filter((e) => categories.includes(e.category)).map((e) => e.id))

const FISH_IDS = catalogIds('fish')
const DECOR_IDS = catalogIds('plant', 'decoration')

const timerSchema = z.object({
  phase: z.enum(['focus', 'shortBreak', 'longBreak']),
  status: z.enum(['idle', 'running', 'paused']),
  startedAt: z.number().finite().nullable(),
  durationMs: z.number().nonnegative(),
  pausedAt: z.number().finite().nullable(),
  pausedTotalMs: z.number().nonnegative(),
  completedInCycle: count,
})

const statsSchema = z.object({
  totalFocusSeconds: count,
  completedPomodoros: count,
  days: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.object({ seconds: count, completed: count })),
  bestStreak: count,
})

const tankSchema = z.object({
  level: count.refine((level) => level < TANK_LEVELS.length),
  fish: z.array(
    z.object({
      id: z.string().min(1),
      speciesId: z.string().refine((id) => FISH_IDS.has(id)),
      acquiredAt: count,
      inTank: z.boolean(),
    }),
  ),
  items: z.array(
    z.object({
      id: z.string().min(1),
      catalogId: z.string().refine((id) => DECOR_IDS.has(id)),
      x: count,
      placed: z.boolean(),
    }),
  ),
})

const saveSchema = z.object({
  credits: count,
  settings: z.record(z.string(), z.unknown()),
  timer: timerSchema,
  stats: statsSchema,
  tank: tankSchema,
})

function validate(raw: unknown): SaveData | null {
  const parsed = saveSchema.safeParse(raw)
  if (!parsed.success) return null
  const { settings, ...rest } = parsed.data
  return { version: 1, ...rest, settings: sanitizeSettings(settings, DEFAULT_SETTINGS) }
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export function parseSave(raw: unknown): ParseResult {
  if (isObject(raw) && typeof raw.version === 'number' && raw.version > SAVE_VERSION) {
    return { ok: false, error: 'newerVersion' }
  }
  if (!isObject(raw) || raw.version !== SAVE_VERSION) return { ok: false, error: 'invalidFormat' }

  const save = validate(raw)
  if (!save) return { ok: false, error: 'invalidFormat' }
  return { ok: true, save: { ...save, timer: createInitialTimer(save.settings) } }
}

export function parseSaveFile(text: string): ParseResult {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, error: 'invalidJson' }
  }
  return parseSave(raw)
}

export function serializeSave(save: SaveData): string {
  return JSON.stringify(save, null, 2)
}

export function migrateSave(raw: unknown, fromVersion: number): SaveData {
  if (fromVersion > SAVE_VERSION) throw new Error(`Unsupported save version: ${fromVersion}`)
  const save = validate(raw)
  if (!save) throw new Error('Invalid save data')
  return save
}
