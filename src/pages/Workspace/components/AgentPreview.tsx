import { useState, useCallback } from 'react'
import { Kbd, Tabs } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import type { Agent } from '@/types'
import { useAgentTab } from '../hooks/useAgentTab'
import { AgentPreviewHeader } from './agent-preview/AgentPreviewHeader'
import { AgentTabBar } from './agent-preview/AgentTabBar'
import { AgentCreationWizard } from './agent-preview/AgentCreationWizard'
import { ProfileTab } from './agent-preview/tabs/ProfileTab'
import { ContextTab } from './agent-preview/tabs/ContextTab'
import { PlaygroundTab } from './agent-preview/tabs/PlaygroundTab'
import { SettingsTab } from './agent-preview/tabs/SettingsTab'

interface AgentPreviewProps {
  agent: Agent | null
  selectedId?: string
  isCustom: boolean
  onStartConversation: (agent: Agent) => void
  onDeselect: () => void
  onCreated?: (agentId: string) => void
  pagination?: { current: number; total: number }
  goToPrevious?: () => void
  goToNext?: () => void
  className?: string
  /** Whether this preview is pinned/sticky */
  isPinned?: boolean
  /** Whether this is the active preview in a multi-preview stack */
  isActive?: boolean
  /** Close this specific preview (remove from stack) */
  onClose?: () => void
  /** Toggle pin state */
  onTogglePin?: () => void
}

export function AgentPreview({
  agent,
  selectedId,
  isCustom,
  onStartConversation,
  onDeselect,
  onCreated,
  pagination,
  goToPrevious,
  goToNext,
  className,
  isPinned,
  isActive = true,
  onClose,
  onTogglePin,
}: AgentPreviewProps) {
  const { t } = useI18n()
  const { activeTab, setActiveTab } = useAgentTab()
  const [isFullscreen, setIsFullscreen] = useState(false)

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), [])

  // Creation wizard — sentinel ID without a matching agent
  if (selectedId === 'new' && !agent) {
    return (
      <div
        className={`h-full min-h-0 min-w-0 flex-col overflow-clip py-4 pl-0.5 pr-4 ${className ?? 'flex'}`}
      >
        <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
          <AgentCreationWizard
            onCreated={onCreated ?? (() => {})}
            onCancel={onDeselect}
          />
        </div>
      </div>
    )
  }

  if (!agent) {
    return (
      <div
        className={`h-full flex-1 items-center justify-center ${className ?? 'flex'}`}
      >
        <div className="text-muted flex flex-col items-center gap-3">
          <Icon name="Group" size="2xl" className="opacity-30" />
          <p className="text-sm">{t('Select an agent')}</p>
          <div className="flex items-center gap-2 text-xs">
            <Kbd>j</Kbd>/<Kbd>k</Kbd> to navigate
          </div>
        </div>
      </div>
    )
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col p-4 v2-fullscreen-enter'
    : `h-full min-h-0 min-w-0 flex-col py-4 pl-0.5 pr-4 ${className ?? 'flex'}`

  return (
    <div className={containerClass}>
      <div className={`bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm ${isPinned ? 'outline-2 outline-primary outline-offset-2' : ''}`}>
        {/* Toolbar + agent identity */}
        <AgentPreviewHeader
          agent={agent}
          isCustom={isCustom}
          onStartConversation={onStartConversation}
          onDeselect={onClose ?? onDeselect}
          pagination={isActive ? pagination : undefined}
          goToPrevious={isActive ? goToPrevious : undefined}
          goToNext={isActive ? goToNext : undefined}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          isPinned={isPinned}
          onTogglePin={onTogglePin}
        />

        {/* Tabbed content */}
        <AgentTabBar activeTab={activeTab} onTabChange={setActiveTab}>
          <Tabs.Panel id="profile" className="flex min-h-0 flex-1 flex-col">
            <ProfileTab
              agent={agent}
              isCustom={isCustom}
              onStartConversation={onStartConversation}
            />
          </Tabs.Panel>

          <Tabs.Panel id="context" className="flex min-h-0 flex-1 flex-col">
            <ContextTab agent={agent} />
          </Tabs.Panel>

          <Tabs.Panel id="playground" className="flex min-h-0 flex-1 flex-col">
            <PlaygroundTab agent={agent} />
          </Tabs.Panel>

          <Tabs.Panel id="settings" className="flex min-h-0 flex-1 flex-col">
            <SettingsTab agent={agent} isCustom={isCustom} />
          </Tabs.Panel>
        </AgentTabBar>
      </div>
    </div>
  )
}
