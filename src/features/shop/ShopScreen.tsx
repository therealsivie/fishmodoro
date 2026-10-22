import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useNow } from '../../app/useNow'
import { CATALOG, TANK_LEVELS } from '../../domain/catalog'
import type { CatalogEntry, Category } from '../../domain/catalog'
import { currentLevel, missingSeconds } from '../../domain/economy'
import type { ActionError } from '../../domain/economy'
import { isFocusActive, remainingMs } from '../../domain/timer'
import { useGameStore } from '../../store/gameStore'
import { SpritePreview } from './SpritePreview'

const CATEGORIES: Category[] = ['fish', 'plant', 'decoration']
const SECONDS_PER_MINUTE = 60

type Notice = { kind: 'info'; key: string } | { kind: 'error'; key: ActionError }

const missingMinutes = (credits: number, priceMinutes: number) =>
  Math.ceil(missingSeconds(credits, priceMinutes) / SECONDS_PER_MINUTE)

function BuyButton({ priceMinutes, owned, onBuy }: { priceMinutes: number; owned: boolean; onBuy(): void }) {
  const { t } = useTranslation()
  const credits = useGameStore((state) => state.credits)
  const missing = missingMinutes(credits, priceMinutes)

  if (owned) return <button type="button" disabled>{t('shop.owned')}</button>
  if (missing > 0) return <button type="button" disabled>{t('shop.missing', { minutes: missing })}</button>
  return <button type="button" onClick={onBuy}>{t('shop.buy')}</button>
}

function ItemCard({ entry, onBuy }: { entry: CatalogEntry; onBuy(entry: CatalogEntry): void }) {
  const { t } = useTranslation()
  const owned = useGameStore((state) => entry.unique && state.tank.items.some((item) => item.catalogId === entry.id))

  return (
    <li className="shop-screen__card">
      <SpritePreview catalogId={entry.id} />
      <h3 className="shop-screen__name">{t(`catalog.${entry.id}`)}</h3>
      <p className="shop-screen__price">{t('shop.price', { minutes: entry.priceMinutes })}</p>
      <BuyButton priceMinutes={entry.priceMinutes} owned={owned} onBuy={() => onBuy(entry)} />
    </li>
  )
}

export function ShopScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const now = useNow()
  const timer = useGameStore((state) => state.timer)
  const credits = useGameStore((state) => state.credits)
  const tank = useGameStore((state) => state.tank)
  const [category, setCategory] = useState<Category>('fish')
  const [notice, setNotice] = useState<Notice | null>(null)

  if (isFocusActive(timer)) {
    const minutes = Math.ceil(remainingMs(timer, now) / 60_000)
    return (
      <section className="shop-screen shop-screen--locked">
        <h1>{t('nav.shop')}</h1>
        <p className="shop-screen__lock">
          <span role="img" aria-label={t('shop.locked')}>
            🔒
          </span>{' '}
          {timer.status === 'paused' ? t('shop.lockedPaused') : t('shop.lockedUntil', { minutes })}
        </p>
      </section>
    )
  }

  const buy = (entry: CatalogEntry) => {
    const result = useGameStore.getState().buy(entry.id)
    if (!result.ok) {
      setNotice({ kind: 'error', key: result.error })
    } else if (entry.category !== 'fish' && result.value.placed) {
      navigate(`/acquario?select=${result.value.id}`)
    } else {
      setNotice({ kind: 'info', key: result.value.placed ? 'shop.fishPlaced' : 'shop.reserveNotice' })
    }
  }

  const upgrade = () => {
    const result = useGameStore.getState().upgradeTank()
    setNotice(result.ok ? null : { kind: 'error', key: result.error })
  }

  const level = currentLevel(tank)
  const next = TANK_LEVELS[TANK_LEVELS.indexOf(level) + 1]

  return (
    <section className="shop-screen">
      <h1>{t('nav.shop')}</h1>
      <p className="shop-screen__balance">{t('shop.balance', { minutes: Math.floor(credits / SECONDS_PER_MINUTE) })}</p>
      <p role="status" className="shop-screen__notice">
        {notice?.kind === 'info' && t(notice.key)}
      </p>
      {notice?.kind === 'error' && (
        <p role="alert" className="shop-screen__notice">
          {t(`shop.errors.${notice.key}`)}
        </p>
      )}

      <div role="tablist" aria-label={t('shop.categories.label')} className="shop-screen__tabs">
        {CATEGORIES.map((id) => (
          <button key={id} type="button" role="tab" aria-selected={category === id} onClick={() => setCategory(id)}>
            {t(`shop.categories.${id}`)}
          </button>
        ))}
      </div>
      <ul className="shop-screen__grid">
        {CATALOG.filter((entry) => entry.category === category).map((entry) => (
          <ItemCard key={entry.id} entry={entry} onBuy={buy} />
        ))}
      </ul>

      <section className="shop-screen__tank">
        <h2>{t('shop.tank.title')}</h2>
        {next ? (
          <>
            <p>
              {t('shop.tank.next', { level: next.level + 1, maxFish: next.maxFish, maxItems: next.maxItems, width: next.width })}
            </p>
            <p className="shop-screen__price">{t('shop.price', { minutes: next.priceMinutes })}</p>
            <BuyButton priceMinutes={next.priceMinutes} owned={false} onBuy={upgrade} />
          </>
        ) : (
          <p>{t('shop.tank.maxLevel')}</p>
        )}
      </section>
    </section>
  )
}
