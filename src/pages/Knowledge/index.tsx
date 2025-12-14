import React, { useMemo } from 'react'
import { Chip, Tabs, Tab } from '@heroui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import DefaultLayout from '@/layouts/Default'
import { useI18n, useUrl } from '@/i18n'
import { Section, Container, Icon } from '@/components'
import type { HeaderProps } from '@/lib/types'
import { useAgentMemoryStore } from '@/stores/agentMemoryStore'
import { usePinnedMessageStore } from '@/stores/pinnedMessageStore'
import localI18n from './i18n'

import { Files } from './Files'
import { AgentMemories } from './AgentMemories'
import { PinnedMessages } from './PinnedMessages'

export const KnowledgePage: React.FC = () => {
  const { lang, t } = useI18n(localI18n)
  const url = useUrl(lang)
  const location = useLocation()
  const navigate = useNavigate()

  const { getPendingReviewMemories } = useAgentMemoryStore()
  const { pinnedMessages } = usePinnedMessageStore()

  // Main tab state - derived from path
  const mainTab = location.pathname.endsWith('/knowledge/memories')
    ? 'memories'
    : location.pathname.endsWith('/knowledge/pinned')
      ? 'pinned'
      : 'files'

  const setMainTab = (tab: string) => {
    navigate(url(`/knowledge/${tab}`))
  }

  const pendingMemories = useMemo(
    () => getPendingReviewMemories(),
    [getPendingReviewMemories],
  )

  const header: HeaderProps = {
    icon: {
      name: 'Brain',
      color: 'text-danger-300 dark:text-danger-600',
    },
    title: t('Knowledge Base'),
    subtitle: t('Manage your files and agents memories'),
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
              tabList: 'gap-6',
              cursor: 'w-full',
              tab: 'max-w-fit px-0 h-12',
            }}
          >
            {/* Files Tab */}
            <Tab
              key="files"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Folder" className="w-5 h-5" />
                  <span>{t('Files')}</span>
                </div>
              }
            >
              <Files />
            </Tab>

            {/* Agent Memory Tab */}
            <Tab
              key="memories"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Brain" className="w-5 h-5" />
                  <span>{t('Agent Memory')}</span>
                  {pendingMemories.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {pendingMemories.length}
                    </Chip>
                  )}
                </div>
              }
            >
              <AgentMemories />
            </Tab>

            {/* Pinned Messages Tab */}
            <Tab
              key="pinned"
              title={
                <div className="flex items-center gap-2">
                  <Icon name="Pin" className="w-5 h-5" />
                  <span>{t('Pinned Messages')}</span>
                  {pinnedMessages.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {pinnedMessages.length}
                    </Chip>
                  )}
                </div>
              }
            >
              <PinnedMessages />
            </Tab>
          </Tabs>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
