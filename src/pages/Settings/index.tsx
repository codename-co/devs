import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { Section } from '@/components'
import { SettingsContent } from './SettingsContent'
import localI18n from './i18n'

// Re-export PROVIDERS for backwards compatibility
export { PROVIDERS } from './providers'

export const SettingsPage = () => {
  const { t } = useI18n(localI18n)

  const header: HeaderProps = {
    title: t('Platform Settings'),
    icon: {
      name: 'Settings',
      color: 'text-default-300 dark:text-default-400',
    },
    subtitle: t(
      'Configure AI providers, models and platform defaults for your organization',
    ),
  }

  return (
    <DefaultLayout title={t('Settings')} header={header}>
      <Section>
        <SettingsContent />
      </Section>
    </DefaultLayout>
  )
}
