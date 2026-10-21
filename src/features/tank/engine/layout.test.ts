import { describe, expect, it } from 'vitest'
import { getEntry } from '../../../domain/catalog'
import type { OwnedItem } from '../../../domain/economy'
import { computeScale, drawOrder, hitTestItem, itemTop, toLogical } from './layout'

const item = (id: string, catalogId: string, x: number, placed = true): OwnedItem => ({ id, catalogId, x, placed })

describe('layout', () => {
  it('computeScale', () => {
    expect(computeScale(100)).toBe(1)
    expect(computeScale(560)).toBe(3)
    expect(computeScale(900)).toBe(5)
  })

  it('itemTop sits items in the middle of the sand band', () => {
    expect(itemTop(getEntry('skull')!)).toBe(180 - 8 - 40)
  })

  it('toLogical divides the offset by the scale', () => {
    const rect = { left: 10, top: 20 } as DOMRect
    expect(toLogical(70, 80, rect, 3)).toEqual({ x: 20, y: 20 })
  })

  it('drawOrder keeps placed items sorted by x', () => {
    const order = drawOrder([item('b', 'shell', 50), item('a', 'grass', 10), item('c', 'shell', 30, false)])
    expect(order.map((i) => i.id)).toEqual(['a', 'b'])
  })

  it('hitTestItem returns topmost placed item and ignores stored ones', () => {
    const items = [item('under', 'rockArch', 0), item('over', 'shell', 10), item('stored', 'skull', 100, false)]
    const shellTop = itemTop(getEntry('shell')!)
    expect(hitTestItem(items, { x: 12, y: shellTop + 2 })).toBe('over')
    expect(hitTestItem(items, { x: 40, y: itemTop(getEntry('rockArch')!) + 2 })).toBe('under')
    expect(hitTestItem(items, { x: 110, y: 150 })).toBeNull()
    expect(hitTestItem(items, { x: 12, y: 5 })).toBeNull()
  })
})
