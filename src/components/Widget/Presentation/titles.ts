import { useI18n } from '@/i18n'
import localI18n from './i18n'

export const usePresentationTitle = () => {
  const { t } = useI18n(localI18n)
  return t('Presentation')
}
