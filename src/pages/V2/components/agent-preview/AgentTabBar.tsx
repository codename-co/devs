import { Tabs, Tooltip } from '@heroui/react_3'
import { Icon } from '@/components'
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
                  aria-label={tab.label}
                  className="transition-all duration-200"
                >
                  <span className="flex items-center gap-1.5">
                    <Icon name={tab.icon} size="sm" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </span>
                  <Tabs.Indicator />
                </Tabs.Tab>
              )
            }

            return (
              <Tooltip key={tab.id} delay={0} closeDelay={0}>
                <Tabs.Tab
                  id={tab.id}
                  aria-label={tab.label}
                  className="text-muted transition-all duration-200"
                >
                  <Icon name={tab.icon} size="sm" />
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tooltip.Content>
                  <p>{tab.label}</p>
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
