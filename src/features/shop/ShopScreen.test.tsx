// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSave } from '../../domain/save'
import { useGameStore } from '../../store/gameStore'
import { ShopScreen } from './ShopScreen'

function LocationProbe() {
  const { pathname, search } = useLocation()
  return <output data-testid="location">{pathname + search}</output>
}

function renderScreen() {
  return render(
    <MemoryRouter initialEntries={['/negozio']}>
      <ShopScreen />
      <LocationProbe />
    </MemoryRouter>,
  )
}

const card = (name: string): HTMLElement => {
  const item = screen.getByRole('heading', { name }).closest('li')
  if (!item) throw new Error(`No card for ${name}`)
  return item
}

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

describe('ShopScreen', () => {
  it('shop is locked during focus', () => {
    act(() => useGameStore.getState().startTimer())
    renderScreen()

    expect(screen.getByText('torna tra 25 min')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Negozio bloccato' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Compra' })).toBeNull()
  })

  it('unaffordable item shows missing minutes', () => {
    renderScreen()

    const button = within(card('Pesce rosso')).getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent('mancano 15 min')
  })

  it('owned unique item shows Posseduto', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ credits: 360 * 60 })
    renderScreen()

    await user.click(screen.getByRole('tab', { name: 'Decorazioni' }))
    await user.click(within(card('Forziere')).getByRole('button', { name: 'Compra' }))
    expect(within(card('Forziere')).getByRole('button')).toHaveTextContent('Posseduto')
    expect(within(card('Forziere')).getByRole('button')).toBeDisabled()
  })

  it('buying a decoration navigates to the tank with selection', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ credits: 30 * 60 })
    renderScreen()

    await user.click(screen.getByRole('tab', { name: 'Decorazioni' }))
    await user.click(within(card('Conchiglia')).getByRole('button', { name: 'Compra' }))

    const [item] = useGameStore.getState().tank.items
    expect(screen.getByTestId('location')).toHaveTextContent(`/acquario?select=${item.id}`)
  })

  it('paused focus shows the suspended notice', () => {
    act(() => {
      useGameStore.getState().startTimer()
      useGameStore.getState().pauseTimer()
    })
    renderScreen()

    expect(screen.getByText('Focus sospeso')).toBeInTheDocument()
  })

  it('max level tank shows the note and no upgrade button', () => {
    useGameStore.setState({ tank: { level: 2, fish: [], items: [] } })
    renderScreen()

    expect(screen.getByText('La vasca è al livello massimo')).toBeInTheDocument()
    const section = screen.getByRole('heading', { name: 'Vasca' }).closest('section')!
    expect(within(section).queryByRole('button')).toBeNull()
  })

  it('upgrading the tank raises the level and spends the price', async () => {
    const user = userEvent.setup()
    useGameStore.setState({ credits: 1000 * 60 })
    renderScreen()

    const section = screen.getByRole('heading', { name: 'Vasca' }).closest('section')!
    await user.click(within(section).getByRole('button', { name: 'Compra' }))

    const state = useGameStore.getState()
    expect(state.tank.level).toBe(1)
    expect(state.credits).toBe(100 * 60)
  })

  it('buying a plant with a full tank reports the reserve and stays on the shop', async () => {
    const user = userEvent.setup()
    const items = Array.from({ length: 12 }, (_, index) => ({
      id: `held-${index}`,
      catalogId: 'shell',
      x: index * 10,
      placed: true,
    }))
    useGameStore.setState({ credits: 360 * 60, tank: { level: 0, fish: [], items } })
    renderScreen()

    await user.click(screen.getByRole('tab', { name: 'Piante' }))
    const [first] = screen.getAllByRole('button', { name: 'Compra' })
    await user.click(first)

    expect(screen.getByText('Vasca piena: è nella riserva')).toBeInTheDocument()
    expect(screen.getByTestId('location')).toHaveTextContent('/negozio')
    expect(useGameStore.getState().tank.items.some((item) => !item.placed)).toBe(true)
  })
})
