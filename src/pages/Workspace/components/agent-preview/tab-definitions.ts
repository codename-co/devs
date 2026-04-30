import type { IconName } from '@/lib/types'

export const AGENT_TABS: readonly {
  id: string
  label: string
  icon: IconName
}[] = [
  {
    id: 'profile',
    label: 'Profile',
    icon: 'UserCircle',
  },
  {
    id: 'context',
    label: 'Context',
    icon: 'BoxIso',
  },
  {
    id: 'playground',
    label: 'Playground',
    icon: 'ChatBubble',
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: 'Settings',
  },
] as const

export type AgentTab = (typeof AGENT_TABS)[number]['id']

export const VALID_AGENT_TABS: readonly string[] = AGENT_TABS.map((t) => t.id)

export const DEFAULT_AGENT_TAB: AgentTab = 'profile'
