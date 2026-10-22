// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSave } from '../../domain/save'
import { useGameStore } from '../../store/gameStore'
import { InventoryPanel } from './InventoryPanel'

const fish = (id: string, inTank: boolean) => ({ id, speciesId: 'goldfish', acquiredAt: 0, inTank })

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('InventoryPanel', () => {
  it('inventory moves fish and reports a full tank', async () => {
    const user = userEvent.setup()
    const crowded = Array.from({ length: 8 }, (_, index) => fish(`in-${index}`, true))
    useGameStore.setState({ tank: { level: 0, fish: [...crowded, fish('spare', false)], items: [] } })
    render(<InventoryPanel />)

    await user.click(screen.getByRole('button', { name: 'Metti in vasca' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Vasca piena')
    expect(useGameStore.getState().tank.fish.find((f) => f.id === 'spare')?.inTank).toBe(false)

    await user.click(screen.getAllByRole('button', { name: 'Sposta in riserva' })[0])
    const putButtons = screen.getAllByRole('button', { name: 'Metti in vasca' })
    await user.click(putButtons[putButtons.length - 1])
    const { fish: after } = useGameStore.getState().tank
    expect(after.filter((f) => f.inTank)).toHaveLength(8)
    expect(after.find((f) => f.id === 'spare')?.inTank).toBe(true)
  })

  it('moves a placed item to the reserve and back to the centre', async () => {
    const user = userEvent.setup()
    useGameStore.setState({
      tank: { level: 0, fish: [], items: [{ id: 'shell-1', catalogId: 'shell', x: 10, placed: true }] },
    })
    render(<InventoryPanel />)

    await user.click(screen.getByRole('button', { name: 'Sposta in riserva' }))
    expect(useGameStore.getState().tank.items[0].placed).toBe(false)

    await user.click(screen.getByRole('button', { name: 'Metti in vasca' }))
    expect(useGameStore.getState().tank.items[0]).toMatchObject({ placed: true, x: 152 })
  })

  it('disables every action during focus', async () => {
    useGameStore.setState({ tank: { level: 0, fish: [fish('a', true)], items: [] } })
    useGameStore.getState().startTimer()
    render(<InventoryPanel />)

    expect(screen.getByRole('button', { name: 'Sposta in riserva' })).toBeDisabled()
  })
})
