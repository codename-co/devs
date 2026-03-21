import { Tabs, Tab } from '@heroui/react'
import { useLocation, useNavigate } from 'react-router-dom'

import DefaultLayout from '@/layouts/Default'
import { useI18n, useUrl } from '@/i18n'
import { Section, Container } from '@/components'
import type { HeaderProps } from '@/lib/types'
import { LibraryContent } from '@/pages/Artifacts'
import { TasksContent } from '@/pages/Tasks'
import { ConversationsContent } from '@/pages/Conversation'
import { AgentMemories } from '@/pages/Knowledge/AgentMemories'

type HistoryTab = 'library' | 'files' | 'memories' | 'tasks' | 'conversations'

function getActiveTab(pathname: string): HistoryTab {
  // if (pathname.endsWith('/history/files') || pathname.endsWith('/files'))
  //   return 'files'
  if (pathname.endsWith('/history/memories') || pathname.endsWith('/memories'))
    return 'memories'
  if (pathname.endsWith('/history/tasks') || pathname.endsWith('/tasks'))
    return 'tasks'
  if (
    pathname.endsWith('/history/conversations') ||
    pathname.endsWith('/conversations')
  )
    return 'conversations'
  return 'library'
}

export const HistoryPage = () => {
  const { t, lang } = useI18n()
  const url = useUrl(lang)
  const location = useLocation()
  const navigate = useNavigate()

  const activeTab = getActiveTab(location.pathname)

  const setTab = (tab: string) => {
    const target = tab === 'library' ? '/history' : `/history/${tab}`
    navigate(url(target))
  }

  const header: HeaderProps = {
    icon: {
      name: 'ClockRotateRight',
      color: 'text-default-300',
    },
    title: t('History'),
    subtitle: t('Your library, tasks, and conversations in one place'),
  }

  return (
    <DefaultLayout title={t('History')} header={header}>
      <Section>
        <Container>
          <Tabs
            selectedKey={activeTab}
            onSelectionChange={(key) => setTab(key as string)}
            aria-label={t('History sections')}
            variant="underlined"
            classNames={{
              base: 'w-full max-w-full',
              tabList: 'gap-6 overflow-x-auto scrollbar-hide max-w-full',
              cursor: 'w-full',
              tab: 'max-w-fit px-0 h-12',
            }}
          >
            <Tab
              key="library"
              title={
                <div className="flex items-center gap-2">
                  {/* <Icon name="BookStack" className="w-5 h-5" /> */}
                  <span>{t('Library')}</span>
                  {/* {artifacts.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {artifacts.length}
                    </Chip>
                  )} */}
                </div>
              }
            >
              <LibraryContent />
            </Tab>
            {/* <Tab
              key="files"
              title={
                <div className="flex items-center gap-2">
                  <span>{t('Files')}</span>
                </div>
              }
            >
              <FilesSection />
            </Tab> */}
            <Tab
              key="tasks"
              title={
                <div className="flex items-center gap-2">
                  {/* <Icon name="PcCheck" className="w-5 h-5" /> */}
                  <span>{t('Tasks')}</span>
                  {/* {tasks.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {tasks.length}
                    </Chip>
                  )} */}
                </div>
              }
            >
              <TasksContent />
            </Tab>
            <Tab
              key="conversations"
              title={
                <div className="flex items-center gap-2">
                  {/* <Icon name="ChatBubble" className="w-5 h-5" /> */}
                  <span>{t('Conversations')}</span>
                  {/* {conversations.length > 0 && (
                    <Chip size="sm" variant="flat">
                      {conversations.length}
                    </Chip>
                  )} */}
                </div>
              }
            >
              <ConversationsContent />
            </Tab>
            <Tab
              key="memories"
              title={
                <div className="flex items-center gap-2">
                  {/* <Icon name="Brain" className="w-5 h-5" /> */}
                  <span>{t('Memories')}</span>
                </div>
              }
            >
              <AgentMemories />
            </Tab>
          </Tabs>
        </Container>
      </Section>
    </DefaultLayout>
  )
}
