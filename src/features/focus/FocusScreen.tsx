import { useTranslation } from 'react-i18next'

export function FocusScreen() {
  const { t } = useTranslation()

  return <h1>{t('nav.focus')}</h1>
}
