import { useI18n } from '@/i18n'
import DefaultLayout from '@/layouts/Default'
import type { HeaderProps } from '@/lib/types'
import { Section } from '@/components'
import { SyncSettings } from '@/features/sync'

const localI18n = {
  en: [
    'Sync',
    'Synchronization',
    'Sync your data across devices using peer-to-peer connections',
  ] as const,
  fr: {
    Sync: 'Synchronisation',
    Synchronization: 'Synchronisation',
    'Sync your data across devices using peer-to-peer connections':
      'Synchronisez vos données entre appareils en pair-à-pair',
  },
  es: {
    Sync: 'Sincronización',
    Synchronization: 'Sincronización',
    'Sync your data across devices using peer-to-peer connections':
      'Sincroniza tus datos entre dispositivos usando conexiones peer-to-peer',
  },
}

export const SyncPage = () => {
  const { t } = useI18n(localI18n)

  const header: HeaderProps = {
    title: t('Synchronization'),
    subtitle: t('Sync your data across devices using peer-to-peer connections'),
  }

  return (
    <DefaultLayout title={t('Sync')} header={header}>
      <Section>
        <SyncSettings />
      </Section>
    </DefaultLayout>
  )
}
