import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { requestNotificationPermission } from '../../app/alerts'
import { parseSaveFile } from '../../domain/save'
import { NUMBER_RANGES, type Settings } from '../../domain/settings'
import { localDateKey } from '../../domain/stats'
import { isFocusActive } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'
import { ASSET_CREDITS } from './credits'

type NumberField = 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'roundsBeforeLongBreak'
type BooleanField = 'autoStartBreak' | 'soundEnabled' | 'notificationsEnabled'

const NUMBER_FIELDS: NumberField[] = ['focusMinutes', 'shortBreakMinutes', 'longBreakMinutes', 'roundsBeforeLongBreak']

interface Feedback {
  kind: 'error' | 'success'
  text: string
}

function NumberInput({ field }: { field: NumberField }) {
  const { t } = useTranslation()
  const value = useGameStore((state) => state.settings[field])
  const updateSettings = useGameStore((state) => state.updateSettings)
  const [draft, setDraft] = useState(String(value))
  const [syncedValue, setSyncedValue] = useState(value)

  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(String(value))
  }

  const commit = () => {
    const parsed = Number(draft)
    if (draft.trim() !== '' && Number.isFinite(parsed)) {
      updateSettings({ [field]: parsed } as Partial<Settings>)
    }
    setDraft(String(useGameStore.getState().settings[field]))
  }

  const [min, max] = NUMBER_RANGES[field]

  return (
    <label className="settings-screen__field">
      <span>{t(`settings.${field}`)}</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={1}
        value={draft}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') commit()
        }}
      />
    </label>
  )
}

export function SettingsScreen() {
  const { t } = useTranslation()
  const settings = useGameStore((state) => state.settings)
  const timer = useGameStore((state) => state.timer)
  const updateSettings = useGameStore((state) => state.updateSettings)
  const importSave = useGameStore((state) => state.importSave)
  const exportSave = useGameStore((state) => state.exportSave)
  const [notificationsDenied, setNotificationsDenied] = useState(false)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const locked = isFocusActive(timer)

  const toggle = async (field: BooleanField, checked: boolean) => {
    if (field === 'notificationsEnabled') {
      setNotificationsDenied(false)
      if (checked && !(await requestNotificationPermission().catch(() => false))) {
        setNotificationsDenied(true)
        return
      }
    }
    updateSettings({ [field]: checked } as Partial<Settings>)
  }

  const download = () => {
    const blob = new Blob([exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fishmodoro-${localDateKey(Date.now())}.json`
    document.body.append(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    input.value = ''
    setFeedback(null)

    let text: string
    try {
      text = await file.text()
    } catch {
      setFeedback({ kind: 'error', text: t('settings.import.readFailed') })
      return
    }

    const parsed = parseSaveFile(text)
    if (!parsed.ok) {
      setFeedback({ kind: 'error', text: t(`settings.import.${parsed.error}`) })
      return
    }
    if (!window.confirm(t('settings.import.confirm'))) return

    const result = importSave(text)
    setFeedback(
      result.ok
        ? { kind: 'success', text: t('settings.import.success') }
        : { kind: 'error', text: t(`settings.import.${result.error}`) },
    )
  }

  const toggleFields: BooleanField[] = ['autoStartBreak', 'soundEnabled', 'notificationsEnabled']

  return (
    <section className="settings-screen">
      <h1>{t('nav.settings')}</h1>

      <section className="settings-screen__section">
        <h2>{t('settings.timerSection')}</h2>
        {NUMBER_FIELDS.map((field) => (
          <NumberInput key={field} field={field} />
        ))}
      </section>

      <section className="settings-screen__section">
        <h2>{t('settings.alertsSection')}</h2>
        {toggleFields.map((field) => (
          <label key={field} className="settings-screen__toggle">
            <input
              type="checkbox"
              checked={settings[field]}
              onChange={(event) => void toggle(field, event.target.checked)}
            />
            <span>{t(`settings.${field}`)}</span>
          </label>
        ))}
        <p role="status" className="settings-screen__hint">
          {notificationsDenied && t('settings.notificationsDenied')}
        </p>
      </section>

      <section className="settings-screen__section">
        <h2>{t('settings.backupSection')}</h2>
        <button type="button" onClick={download}>
          {t('settings.export')}
        </button>
        <label className="settings-screen__field">
          <span>{t('settings.import.label')}</span>
          <input type="file" accept="application/json" disabled={locked} onChange={(event) => void handleImport(event)} />
        </label>
        {locked && <p className="settings-screen__hint">{t('settings.import.locked')}</p>}
        {feedback?.kind === 'error' && (
          <p role="alert" className="settings-screen__hint">
            {feedback.text}
          </p>
        )}
        <p role="status" className="settings-screen__hint">
          {feedback?.kind === 'success' && feedback.text}
        </p>
      </section>

      <section className="settings-screen__section">
        <h2>{t('settings.creditsSection')}</h2>
        <ul className="settings-screen__credits">
          {ASSET_CREDITS.map((credit) => (
            <li key={credit.name}>
              <a href={credit.url} target="_blank" rel="noopener noreferrer">
                {credit.name}
              </a>{' '}
              {t('settings.creditsAuthor', { author: credit.author })} · {t('settings.creditsLicense', { license: credit.license })}
            </li>
          ))}
        </ul>
      </section>
    </section>
  )
}
