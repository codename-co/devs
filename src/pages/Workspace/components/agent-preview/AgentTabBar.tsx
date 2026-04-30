import { Tabs, Tooltip } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { AGENT_TABS, type AgentTab } from './tab-definitions'

interface AgentTabBarProps {
  activeTab: AgentTab
  onTabChange: (tab: AgentTab) => void
  children: React.ReactNode
}

export function AgentTabBar({
  activeTab,
  onTabChange,
  children,
}: AgentTabBarProps) {
  const { t } = useI18n()
  return (
    <Tabs
      selectedKey={activeTab}
      onSelectionChange={(key) => onTabChange(key as AgentTab)}
      className="flex min-h-0 flex-1 flex-col"
    >
      <Tabs.ListContainer className="flex justify-center">
        <Tabs.List aria-label="Agent sections" className="w-auto gap-0.5">
          {AGENT_TABS.map((tab) => {
            const isActive = activeTab === tab.id

            if (isActive) {
              return (
                <Tabs.Tab
                  key={tab.id}
                  id={tab.id}
                  aria-label={t(tab.label as any)}
                  className="transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name={tab.icon} size="sm" />
                    <span className="text-sm font-medium">{t(tab.label as any)}</span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              )
            }

            return (
              <Tooltip key={tab.id} delay={0} closeDelay={0}>
                <Tabs.Tab
                  id={tab.id}
                  aria-label={t(tab.label as any)}
                  className="text-muted transition-all duration-200"
                >
                  <Icon name={tab.icon} size="sm" />
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tooltip.Content>
                  <p>{t(tab.label as any)}</p>
                </Tooltip.Content>
              </Tooltip>
            )
          })}
        </Tabs.List>
      </Tabs.ListContainer>

      {children}
    </Tabs>
  )
}
