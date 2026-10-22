// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createDefaultSave, serializeSave } from '../../domain/save'
import { useGameStore } from '../../store/gameStore'
import { SettingsScreen } from './SettingsScreen'

beforeEach(() => {
  localStorage.clear()
  useGameStore.setState(createDefaultSave())
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

function importFile(contents: string) {
  const file = new File([contents], 'save.json', { type: 'application/json' })
  return userEvent.upload(screen.getByLabelText('Importa salvataggio'), file)
}

describe('SettingsScreen', () => {
  it('out-of-range duration is corrected', async () => {
    render(<SettingsScreen />)
    const input = screen.getByLabelText('Durata del focus (min)')

    await userEvent.clear(input)
    await userEvent.type(input, '0')
    await userEvent.tab()

    expect(useGameStore.getState().settings.focusMinutes).toBe(1)
    expect(input).toHaveValue(1)
  })

  it('empty draft is discarded on blur and the stored value is restored', async () => {
    render(<SettingsScreen />)
    const input = screen.getByLabelText('Durata del focus (min)')

    await userEvent.clear(input)
    await userEvent.tab()

    expect(useGameStore.getState().settings.focusMinutes).toBe(25)
    expect(input).toHaveValue(25)
  })

  it('number inputs expose the allowed range', () => {
    render(<SettingsScreen />)
    const input = screen.getByLabelText('Giri prima della pausa lunga')

    expect(input).toHaveAttribute('min')
    expect(input).toHaveAttribute('max')
    expect(input).toHaveAttribute('step', '1')
  })

  it('Enter commits a value', async () => {
    render(<SettingsScreen />)
    const input = screen.getByLabelText('Giri prima della pausa lunga')

    await userEvent.clear(input)
    await userEvent.type(input, '6{Enter}')

    expect(useGameStore.getState().settings.roundsBeforeLongBreak).toBe(6)
  })

  it('import of a broken file shows an error and keeps credits', async () => {
    useGameStore.setState({ credits: 500 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SettingsScreen />)

    await importFile('nope')

    expect(await screen.findByRole('alert')).toHaveTextContent('Il file non è un JSON valido')
    expect(confirm).not.toHaveBeenCalled()
    expect(useGameStore.getState().credits).toBe(500)
  })

  it('unreadable file shows a read error', async () => {
    vi.spyOn(File.prototype, 'text').mockRejectedValue(new Error('io'))
    const confirm = vi.spyOn(window, 'confirm')
    render(<SettingsScreen />)

    await importFile('{}')

    expect(await screen.findByRole('alert')).toHaveTextContent('Impossibile leggere il file')
    expect(confirm).not.toHaveBeenCalled()
  })

  it('valid file with confirmation replaces the save', async () => {
    useGameStore.setState({ credits: 500 })
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    render(<SettingsScreen />)

    await importFile(serializeSave({ ...createDefaultSave(), credits: 1234 }))

    expect(await screen.findByText('Salvataggio importato')).toHaveAttribute('role', 'status')
    expect(useGameStore.getState().credits).toBe(1234)
  })

  it('declined confirmation leaves the store unchanged', async () => {
    useGameStore.setState({ credits: 500 })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<SettingsScreen />)

    await importFile(serializeSave({ ...createDefaultSave(), credits: 1234 }))

    await waitFor(() => expect(confirm).toHaveBeenCalled())
    expect(useGameStore.getState().credits).toBe(500)
  })

  it('import disabled during focus', () => {
    act(() => useGameStore.getState().startTimer())
    render(<SettingsScreen />)

    expect(screen.getByLabelText('Importa salvataggio')).toBeDisabled()
    expect(screen.getByText('Importazione bloccata durante il focus')).toBeInTheDocument()
  })

  it('focus started while the confirmation is open blocks the import', async () => {
    useGameStore.setState({ credits: 500 })
    vi.spyOn(window, 'confirm').mockImplementation(() => {
      useGameStore.getState().startTimer()
      return true
    })
    render(<SettingsScreen />)

    await importFile(serializeSave({ ...createDefaultSave(), credits: 1234 }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Non puoi importare durante un focus')
    expect(useGameStore.getState().credits).toBe(500)
  })

  it('denied notification permission leaves the toggle off', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('denied') })
    render(<SettingsScreen />)
    const toggle = screen.getByLabelText('Notifiche')

    await userEvent.click(toggle)

    expect(await screen.findByText('Notifiche non disponibili o negate dal browser')).toHaveAttribute('role', 'status')
    expect(toggle).not.toBeChecked()
    expect(useGameStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('rejected notification permission request is treated as denied', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockRejectedValue(new Error('blocked')) })
    render(<SettingsScreen />)

    await userEvent.click(screen.getByLabelText('Notifiche'))

    expect(await screen.findByText('Notifiche non disponibili o negate dal browser')).toBeInTheDocument()
    expect(useGameStore.getState().settings.notificationsEnabled).toBe(false)
  })

  it('granted notification permission turns the setting on', async () => {
    vi.stubGlobal('Notification', { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') })
    render(<SettingsScreen />)

    await userEvent.click(screen.getByLabelText('Notifiche'))

    await waitFor(() => expect(useGameStore.getState().settings.notificationsEnabled).toBe(true))
  })

  it('export downloads a dated json file', async () => {
    const createObjectURL = vi.fn().mockReturnValue('blob:fake')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = createObjectURL
        static revokeObjectURL = revokeObjectURL
      },
    )
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      expect(this.download).toMatch(/^fishmodoro-\d{4}-\d{2}-\d{2}\.json$/)
      expect(this.href).toBe('blob:fake')
    })
    render(<SettingsScreen />)

    await userEvent.click(screen.getByRole('button', { name: 'Esporta salvataggio' }))

    expect(click).toHaveBeenCalledOnce()
    expect(createObjectURL.mock.calls[0][0]).toBeInstanceOf(Blob)
    await waitFor(() => expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake'))
    expect(document.querySelector('a[download]')).toBeNull()
  })

  it('lists asset credits with safe external links', () => {
    render(<SettingsScreen />)

    const link = screen.getByRole('link', { name: 'Pixelify Sans' })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    expect(screen.getByRole('link', { name: 'Sweetie 16' })).toHaveAttribute(
      'href',
      'https://lospec.com/palette-list/sweetie-16',
    )
  })
})
