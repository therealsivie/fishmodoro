import { describe, expect, it } from 'vitest'
import { createDefaultSave, migrateSave, parseSave, parseSaveFile, serializeSave } from './save'
import type { SaveData } from './save'

const invalid = { ok: false, error: 'invalidFormat' }

const withTank = (tank: Partial<SaveData['tank']>): SaveData => {
  const save = createDefaultSave()
  return { ...save, tank: { ...save.tank, ...tank } }
}

describe('parseSaveFile', () => {
  it('rejects invalid json', () => {
    expect(parseSaveFile('not json')).toEqual({ ok: false, error: 'invalidJson' })
  })

  it('rejects a foreign object', () => {
    expect(parseSaveFile('{"version":1}')).toEqual(invalid)
  })

  it('rejects non-object json', () => {
    expect(parseSaveFile('42')).toEqual(invalid)
    expect(parseSaveFile('null')).toEqual(invalid)
    expect(parseSaveFile('"text"')).toEqual(invalid)
  })

  it('rejects a newer version', () => {
    const text = JSON.stringify({ ...createDefaultSave(), version: 2 })
    expect(parseSaveFile(text)).toEqual({ ok: false, error: 'newerVersion' })
  })

  it('checks the version before anything else', () => {
    expect(parseSaveFile('{"version":2}')).toEqual({ ok: false, error: 'newerVersion' })
  })

  it('rejects an unknown catalog id', () => {
    const save = withTank({ items: [{ id: 'a', catalogId: 'dragon', x: 0, placed: true }] })
    expect(parseSaveFile(serializeSave(save))).toEqual(invalid)
  })

  it('rejects a species id used as catalog id of an item', () => {
    const save = withTank({ items: [{ id: 'a', catalogId: 'goldfish', x: 0, placed: true }] })
    expect(parseSaveFile(serializeSave(save))).toEqual(invalid)
  })

  it('rejects an unknown species', () => {
    const save = withTank({ fish: [{ id: 'a', speciesId: 'dragon', acquiredAt: 1, inTank: true }] })
    expect(parseSaveFile(serializeSave(save))).toEqual(invalid)
  })

  it('rejects a tank level outside the known levels', () => {
    expect(parseSaveFile(serializeSave(withTank({ level: 3 })))).toEqual(invalid)
    expect(parseSaveFile(serializeSave(withTank({ level: -1 })))).toEqual(invalid)
    expect(parseSaveFile(serializeSave(withTank({ level: 0.5 })))).toEqual(invalid)
  })

  it('rejects negative or fractional credits', () => {
    expect(parseSaveFile(serializeSave({ ...createDefaultSave(), credits: -1 }))).toEqual(invalid)
    expect(parseSaveFile(serializeSave({ ...createDefaultSave(), credits: 1.5 }))).toEqual(invalid)
  })

  it('rejects malformed day keys', () => {
    const save = createDefaultSave()
    save.stats.days = { today: { seconds: 1, completed: 1 } }
    expect(parseSaveFile(serializeSave(save))).toEqual(invalid)
  })

  it('rejects settings that are not an object', () => {
    const text = JSON.stringify({ ...createDefaultSave(), settings: 5 })
    expect(parseSaveFile(text)).toEqual(invalid)
  })

  it('clamps out of range settings', () => {
    const save = createDefaultSave()
    const text = JSON.stringify({ ...save, settings: { ...save.settings, focusMinutes: 999 } })
    const result = parseSaveFile(text)
    expect(result.ok && result.save.settings.focusMinutes).toBe(180)
  })

  it('fills missing settings with defaults', () => {
    const text = JSON.stringify({ ...createDefaultSave(), settings: { focusMinutes: 30 } })
    const result = parseSaveFile(text)
    expect(result.ok && result.save.settings.focusMinutes).toBe(30)
    expect(result.ok && result.save.settings.shortBreakMinutes).toBe(5)
  })

  it('strips unknown keys', () => {
    const text = JSON.stringify({ ...createDefaultSave(), extra: true })
    const result = parseSaveFile(text)
    expect(result.ok && 'extra' in result.save).toBe(false)
  })

  it('round trips data and resets a running timer', () => {
    const base = createDefaultSave()
    const save: SaveData = {
      ...base,
      credits: 4200,
      timer: { ...base.timer, status: 'running', startedAt: 5 },
      tank: {
        level: 1,
        fish: [{ id: 'f1', speciesId: 'goldfish', acquiredAt: 10, inTank: true }],
        items: [],
      },
    }
    const result = parseSaveFile(serializeSave(save))
    expect(result.ok && result.save.credits).toBe(4200)
    expect(result.ok && result.save.timer.status).toBe('idle')
    expect(result.ok && result.save.timer.startedAt).toBeNull()
    expect(result.ok && result.save.tank).toEqual(save.tank)
  })
})

describe('parseSave', () => {
  it('rejects non-objects', () => {
    expect(parseSave(undefined)).toEqual(invalid)
    expect(parseSave([])).toEqual(invalid)
  })
})

describe('createDefaultSave', () => {
  it('returns independent objects', () => {
    const a = createDefaultSave()
    const b = createDefaultSave()
    a.tank.fish.push({ id: 'x', speciesId: 'goldfish', acquiredAt: 1, inTank: true })
    a.stats.days['2026-01-01'] = { seconds: 1, completed: 1 }
    expect(b.tank.fish).toEqual([])
    expect(b.stats.days).toEqual({})
  })
})

describe('serializeSave', () => {
  it('indents with two spaces', () => {
    expect(serializeSave(createDefaultSave())).toContain('\n  "version": 1')
  })
})

describe('migrateSave', () => {
  it('keeps a running timer', () => {
    const base = createDefaultSave()
    const save = { ...base, timer: { ...base.timer, status: 'running', startedAt: 5 } }
    const migrated = migrateSave(JSON.parse(JSON.stringify(save)), 1)
    expect(migrated.timer).toEqual(save.timer)
    expect(migrated.version).toBe(1)
  })

  it('sanitizes settings and forces the version', () => {
    const base = createDefaultSave()
    const migrated = migrateSave({ ...base, version: 0, settings: { focusMinutes: 999 } }, 0)
    expect(migrated.version).toBe(1)
    expect(migrated.settings.focusMinutes).toBe(180)
  })

  it('throws on invalid data', () => {
    expect(() => migrateSave({ version: 1 }, 1)).toThrow()
    expect(() => migrateSave(null, 1)).toThrow()
  })

  it('throws on a newer version', () => {
    expect(() => migrateSave(createDefaultSave(), 2)).toThrow()
  })
})
