import { useTranslation } from 'react-i18next'

export function TankScreen() {
  const { t } = useTranslation()

  return <h1>{t('nav.tank')}</h1>
}
