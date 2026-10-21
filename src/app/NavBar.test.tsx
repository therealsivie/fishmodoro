// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react'
import { act } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createDefaultSave } from '../domain/save'
import { i18n } from '../i18n'
import { useGameStore } from '../store/gameStore'
import { NavBar } from './NavBar'

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

afterEach(() => {
  cleanup()
})

describe('NavBar', () => {
  it('renders five links to the app routes', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )
    const links = screen.getAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/',
      '/acquario',
      '/negozio',
      '/statistiche',
      '/impostazioni',
    ])
  })

  it('locks the shop link while a focus is running', () => {
    render(
      <MemoryRouter>
        <NavBar />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: i18n.t('nav.shop') })).toHaveAttribute('href', '/negozio')

    act(() => useGameStore.getState().startTimer(Date.now()))

    const locked = screen.getByRole('link', { name: i18n.t('nav.shopLocked') })
    expect(locked).toHaveAttribute('href', '/negozio')
    expect(locked).toHaveAttribute('aria-label', i18n.t('nav.shopLocked'))
  })
})
