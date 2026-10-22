import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { getEntry } from '../../domain/catalog'
import { currentLevel } from '../../domain/economy'
import type { ActionError, Result } from '../../domain/economy'
import { isFocusActive } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'

export function InventoryPanel() {
  const { t } = useTranslation()
  const tank = useGameStore((state) => state.tank)
  const locked = useGameStore((state) => isFocusActive(state.timer))
  const { setFishInTank, placeItem, storeItem } = useGameStore.getState()
  const [error, setError] = useState<ActionError | null>(null)

  const run = (result: Result<null>) => setError(result.ok ? null : result.error)

  const centreOf = (catalogId: string) => {
    const entry = getEntry(catalogId)
    return entry ? Math.floor((currentLevel(tank).width - entry.width) / 2) : 0
  }

  const actionLabel = (inTank: boolean) => t(inTank ? 'tank.inventory.moveToReserve' : 'tank.inventory.putInTank')

  return (
    <section className="inventory-panel" aria-label={t('tank.inventory.title')}>
      <h2 className="inventory-panel__title">{t('tank.inventory.title')}</h2>
      {error && (
        <p role="alert" className="inventory-panel__error">
          {t(`tank.inventory.${error}`)}
        </p>
      )}

      <h3>{t('tank.inventory.fish')}</h3>
      <ul className="inventory-panel__list">
        {tank.fish.map((fish) => (
          <li key={fish.id} className="inventory-panel__row">
            <span>{t(`catalog.${fish.speciesId}`)}</span>
            <button type="button" disabled={locked} onClick={() => run(setFishInTank(fish.id, !fish.inTank))}>
              {actionLabel(fish.inTank)}
            </button>
          </li>
        ))}
      </ul>

      <h3>{t('tank.inventory.items')}</h3>
      <ul className="inventory-panel__list">
        {tank.items.map((item) => (
          <li key={item.id} className="inventory-panel__row">
            <span>{t(`catalog.${item.catalogId}`)}</span>
            <button
              type="button"
              disabled={locked}
              onClick={() => run(item.placed ? storeItem(item.id) : placeItem(item.id, centreOf(item.catalogId)))}
            >
              {actionLabel(item.placed)}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
