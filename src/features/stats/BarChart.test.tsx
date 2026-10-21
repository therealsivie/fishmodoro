// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { BarChart } from './BarChart'

function days(...seconds: number[]) {
  return seconds.map((value, index) => ({
    date: `2026-10-${String(index + 7).padStart(2, '0')}`,
    seconds: value,
  }))
}

function renderChart(...seconds: number[]) {
  const { container } = render(<BarChart days={days(...seconds)} />)
  const items = [...container.querySelectorAll('li')]
  return {
    container,
    bars: items.map((item) => item.querySelector<HTMLElement>('.bar-chart__bar')),
    values: [...container.querySelectorAll('.bar-chart__value')],
  }
}

afterEach(() => {
  cleanup()
})

describe('BarChart', () => {
  it('scales bars to the busiest day and skips empty days', () => {
    const { bars } = renderChart(0, 0, 0, 1500, 0, 0, 3000, 0, 0, 0, 750, 0, 0, 0)

    expect(bars[0]).toBeNull()
    expect(bars[3]?.style.height).toBe('50%')
    expect(bars[6]?.style.height).toBe('100%')
    expect(bars[10]?.style.height).toBe('25%')
    expect(bars.filter(Boolean)).toHaveLength(3)
  })

  it('labels only the first busiest day', () => {
    const { bars, values } = renderChart(0, 0, 0, 0, 3000, 0, 0, 3000, 0, 0, 0, 0, 0, 0)

    expect(values).toHaveLength(1)
    expect(values[0]).toHaveTextContent('50 min')
    expect(values[0]).toHaveAttribute('aria-hidden', 'true')
    expect(bars[4]).toContainElement(values[0] as HTMLElement)
  })

  it('keeps the label inside the plot on the edge columns', () => {
    expect(renderChart(1500, ...Array(13).fill(0)).values[0]).toHaveClass('bar-chart__value--start')
    cleanup()
    expect(renderChart(...Array(13).fill(0), 1500).values[0]).toHaveClass('bar-chart__value--end')
    cleanup()
    const middle = renderChart(...Array(7).fill(0), 1500, ...Array(6).fill(0)).values[0]
    expect(middle).not.toHaveClass('bar-chart__value--start')
    expect(middle).not.toHaveClass('bar-chart__value--end')
  })

  it('draws no bars and no label when every day is empty', () => {
    const { container, bars, values } = renderChart(...Array(14).fill(0))

    expect(bars.filter(Boolean)).toHaveLength(0)
    expect(values).toHaveLength(0)
    expect(container.innerHTML).not.toContain('NaN')
  })
})
