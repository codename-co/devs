import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'

export const SettingsPage = () => {
  const { t } = useI18n()

  const header: HeaderProps = {
    color: 'bg-default-50',
    icon: {
      name: 'Settings',
      color: 'text-default-300',
    },
    title: t('Platform Settings'),
    subtitle: t(
      'Configure LLM providers, models and platform defaults for your organization',
    ),
  }

  return (
    <DefaultLayout title={t('Settings')} header={header}>
      SettingsPage
    </DefaultLayout>
  )
}
