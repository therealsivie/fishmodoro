import { useTranslation } from 'react-i18next'

export function ShopScreen() {
  const { t } = useTranslation()

  return <h1>{t('nav.shop')}</h1>
}
