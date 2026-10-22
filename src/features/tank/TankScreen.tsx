import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import { isFocusActive } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'
import { InventoryPanel } from './InventoryPanel'
import { TankCanvas } from './TankCanvas'

export function TankScreen() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const [selectedId, setSelectedId] = useState<string | null>(() => params.get('select'))
  const [inventoryOpen, setInventoryOpen] = useState(false)
  const tank = useGameStore((state) => state.tank)
  const locked = useGameStore((state) => isFocusActive(state.timer))
  const storeItem = useGameStore((state) => state.storeItem)

  const reserved = tank.fish.filter((fish) => !fish.inTank).length + tank.items.filter((item) => !item.placed).length
  const selectedItem = tank.items.find((item) => item.id === selectedId && item.placed)

  if (selectedId && !selectedItem) setSelectedId(null)

  return (
    <section className="tank-screen">
      <header className="tank-screen__bar">
        <h1 className="tank-screen__title">{t('nav.tank')}</h1>
        <button type="button" aria-expanded={inventoryOpen} onClick={() => setInventoryOpen((open) => !open)}>
          {t('tank.reserve', { count: reserved })}
        </button>
        {selectedItem && !locked && (
          <button
            type="button"
            onClick={() => {
              storeItem(selectedItem.id)
              setSelectedId(null)
            }}
          >
            {t('tank.store')}
          </button>
        )}
        {locked && <p className="tank-screen__notice">{t('tank.readOnly')}</p>}
      </header>
      <TankCanvas selectedId={locked ? null : selectedId} readOnly={locked} onSelect={setSelectedId} />
      {inventoryOpen && <InventoryPanel />}
    </section>
  )
}
