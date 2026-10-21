import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as economy from '../domain/economy'
import type { Result, Tank } from '../domain/economy'
import { createDefaultSave, migrateSave, parseSaveFile, SAVE_VERSION, serializeSave } from '../domain/save'
import type { ParseError, SaveData } from '../domain/save'
import { sanitizeSettings } from '../domain/settings'
import type { Settings } from '../domain/settings'
import { recordFocus } from '../domain/stats'
import * as timerDomain from '../domain/timer'
import type { TimerEvent, TimerResult } from '../domain/timer'

const STORAGE_KEY = 'fishmodoro-save'

export interface GameState extends Omit<SaveData, 'version'> {
  startTimer(now?: number): void
  pauseTimer(now?: number): void
  resumeTimer(now?: number): void
  interruptTimer(now?: number): void
  skipBreak(now?: number): void
  tick(now?: number): TimerEvent[]
  updateSettings(patch: Partial<Settings>): void
  buy(catalogId: string, now?: number): Result<{ id: string; placed: boolean }>
  upgradeTank(): Result<null>
  setFishInTank(fishId: string, inTank: boolean): Result<null>
  placeItem(itemId: string, x: number): Result<null>
  storeItem(itemId: string): Result<null>
  importSave(text: string): { ok: true } | { ok: false; error: ParseError | 'focusActive' }
  exportSave(): string
}

type Data = Omit<SaveData, 'version'>

const focusActive = { ok: false, error: 'focusActive' } as const
const done: Result<null> = { ok: true, value: null }

function toSave(state: Data): SaveData {
  const { credits, settings, timer, stats, tank } = state
  return { version: SAVE_VERSION, credits, settings, timer, stats, tank }
}

function applyEvents(state: Data, { timer, events }: TimerResult): Partial<Data> {
  let { credits, stats } = state
  for (const event of events) {
    if (event.type === 'breakEnded') continue
    credits += event.seconds
    stats = recordFocus(stats, event)
  }
  return { timer, credits, stats }
}

export const useGameStore = create<GameState>()(
  persist<GameState, [], [], SaveData>(
    (set, get) => {
      const settle = (run: (state: GameState) => TimerResult): TimerEvent[] => {
        const result = run(get())
        if (result.events.length > 0 || result.timer !== get().timer) {
          set((state) => applyEvents(state, result))
        }
        return result.events
      }

      const updateTank = (change: (tank: Tank) => Result<Tank>): Result<null> => {
        const state = get()
        if (timerDomain.isFocusActive(state.timer)) return focusActive
        const result = change(state.tank)
        if (!result.ok) return result
        set({ tank: result.value })
        return done
      }

      return {
        ...createDefaultSave(),

        startTimer: (now = Date.now()) => {
          const { timer, settings } = get()
          set({ timer: timerDomain.start(timer, settings, now) })
        },
        pauseTimer: (now = Date.now()) => set({ timer: timerDomain.pause(get().timer, now) }),
        resumeTimer: (now = Date.now()) => set({ timer: timerDomain.resume(get().timer, now) }),
        interruptTimer: (now = Date.now()) => {
          settle((s) => timerDomain.interrupt(s.timer, s.settings, now))
        },
        skipBreak: (now = Date.now()) => {
          settle((s) => timerDomain.skipBreak(s.timer, s.settings, now))
        },
        tick: (now = Date.now()) => settle((s) => timerDomain.settle(s.timer, s.settings, now)),

        updateSettings: (patch) => {
          const { settings: current, timer } = get()
          const settings = sanitizeSettings({ ...current, ...patch }, current)
          set({
            settings,
            timer:
              timer.status === 'idle'
                ? { ...timer, durationMs: timerDomain.phaseDurationMs(timer.phase, settings) }
                : timer,
          })
        },

        buy: (catalogId, now = Date.now()) => {
          const { timer, credits, tank } = get()
          if (timerDomain.isFocusActive(timer)) return focusActive
          const result = economy.buy(credits, tank, catalogId, now, () => crypto.randomUUID())
          if (!result.ok) return result
          const { credits: remaining, tank: nextTank, id, placed } = result.value
          set({ credits: remaining, tank: nextTank })
          return { ok: true, value: { id, placed } }
        },
        upgradeTank: () => {
          const { timer, credits, tank } = get()
          if (timerDomain.isFocusActive(timer)) return focusActive
          const result = economy.upgradeTank(credits, tank)
          if (!result.ok) return result
          set({ credits: result.value.credits, tank: result.value.tank })
          return done
        },
        setFishInTank: (fishId, inTank) => updateTank((tank) => economy.setFishInTank(tank, fishId, inTank)),
        placeItem: (itemId, x) => updateTank((tank) => economy.placeItem(tank, itemId, x)),
        storeItem: (itemId) => updateTank((tank) => ({ ok: true, value: economy.storeItem(tank, itemId) })),

        importSave: (text) => {
          if (timerDomain.isFocusActive(get().timer)) return focusActive
          const parsed = parseSaveFile(text)
          if (!parsed.ok) return parsed
          const { credits, settings, timer, stats, tank } = parsed.save
          set({ credits, settings, timer, stats, tank })
          return { ok: true }
        },
        exportSave: () => serializeSave(toSave(get())),
      }
    },
    {
      name: STORAGE_KEY,
      version: SAVE_VERSION,
      partialize: toSave,
      migrate: (persisted, version) => migrateSave(persisted, version),
      merge: (persisted, current) => {
        try {
          const { credits, settings, timer, stats, tank } = migrateSave(persisted, SAVE_VERSION)
          return { ...current, credits, settings, timer, stats, tank }
        } catch {
          return current
        }
      },
    },
  ),
)

export function listenToOtherTabs(): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) void useGameStore.persist.rehydrate()
  }
  window.addEventListener('storage', onStorage)
  return () => window.removeEventListener('storage', onStorage)
}
