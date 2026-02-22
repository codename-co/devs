import React, { useMemo } from 'react'
import { Chip, Tabs, Tab } from '@heroui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import DefaultLayout from '@/layouts/Default'
import { useI18n, useUrl } from '@/i18n'
import { Section, Container, Icon } from '@/components'
import type { HeaderProps } from '@/lib/types'
import { useConnectorStore } from '@/features/connectors/stores'
import localI18n from './i18n'

import { Files } from './Files'
import { Connectors } from './Connectors'

export const KnowledgePage: React.FC = () => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const location = useLocation()
  const navigate = useNavigate()

  const { getAppConnectors } = useConnectorStore()

  // Count connectors for badge
  const connectorsCount = useMemo(() => {
    return getAppConnectors().length
  }, [getAppConnectors])

  // Main tab state - derived from path
  const mainTab = location.pathname.endsWith('/knowledge/connectors')
    ? 'connectors'
    : 'files'

  const setMainTab = (tab: string) => {
    navigate(url(`/knowledge/${tab}`))
  }

  const header: HeaderProps = {
    icon: {
      name: 'Book',
      color: 'text-primary-300 dark:text-primary-600',
    },
    title: t('Knowledge Base'),
    subtitle: t('Manage your files, sync sources, and agent memories'),
  }

  return (
    <DefaultLayout header={header}>
      <Section>
        <Container>
          <Tabs
            selectedKey={mainTab}
            onSelectionChange={(key) => setMainTab(key as string)}
            aria-label="Knowledge base sections"
            variant="underlined"
            classNames={{
              base: 'w-full max-w-full',
              tabList: 'gap-6 overflow-x-auto scrollbar-hide max-w-full',
              cursor: 'w-full',
              tab: 'max-w-fit px-0 h-12',
            }}
          >
            {/* Files Tab - Manual uploads */}
            <Tab
              key="files"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Folder" className="w-5 h-5" />
                  <span>{t('My Files')}</span>
                </div>
              }
            >
              <Files />
            </Tab>

            {/* Connectors Tab - External services */}
            <Tab
              key="connectors"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Puzzle" className="w-5 h-5" />
                  <span>{t('Connectors')}</span>
                  {connectorsCount > 0 && (
                    <Chip size="sm" variant="flat">
                      {connectorsCount}
                    </Chip>
                  )}
                </div>
              }
            >
              <Connectors />
            </Tab>
          </Tabs>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
