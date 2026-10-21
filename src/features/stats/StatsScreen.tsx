import { useTranslation } from 'react-i18next'

export function StatsScreen() {
  const { t } = useTranslation()

  return <h1>{t('nav.stats')}</h1>
}
