import { createContext, type RefObject, useContext } from 'react'
import type { Agent, Artifact } from '@/types'
import type { ThreadTag } from '@/lib/yjs'
import type { PreviewItem } from '@/components/ArtifactPreviewCard'
import type { NavItem, ThreadFilter, Thread } from './types'
import type { InspectSegment } from './hooks/useThreadSelection'

export interface V2ShellContextValue {
  // URL state — multi-selection
  filter: ThreadFilter
  selectedIds: string[]
  activeId: string | undefined
  pinnedIds: string[]
  /** @deprecated Use activeId */
  selectedId: string | undefined
  search: string
  setSearch: (q: string) => void
  setFilter: (filter: ThreadFilter) => void
  selectItem: (id: string) => void
  addItem: (id: string) => void
  removeItem: (id: string) => void
  togglePin: (id: string) => void
  deselect: () => void
  inspectSegment: InspectSegment
  setInspect: (seg: InspectSegment) => void

  // Pagination / keyboard nav
  goToNext: () => void
  goToPrevious: () => void
  pagination: { current: number; total: number }

  // Sidebar
  navItems: NavItem[]
  openSettings: () => void

  // Thread data — multi-selection
  filteredThreads: Thread[]
  selectedThreads: Thread[]
  activeThread: Thread | undefined
  /** @deprecated Use activeThread */
  selectedThread: Thread | undefined
  isLoading: boolean

  // Agent data — multi-selection
  filteredAgents: Agent[]
  selectedAgents: Agent[]
  activeAgent: Agent | null
  /** @deprecated Use activeAgent */
  selectedAgent: Agent | null
  customAgentIds: Set<string>
  isAgentsLoading: boolean

  // Handlers — threads
  handleToggleStar: () => void
  handleToggleStarById: (id: string) => void
  handleToggleReadById: (id: string) => void
  markRead: (id: string) => void
  handleReply: (content: string) => Promise<void>
  isReplying: boolean
  replyPrompt: string
  setReplyPrompt: (value: string) => void

  // Handlers — inspect panel
  handleSelectArtifact: (artifact: Artifact) => void
  inspectedItem: PreviewItem | null
  closeInspectedPanel: () => void

  // Handlers — agents
  handleStartConversation: (agent: Agent) => void

  // Refs
  searchInputRef: RefObject<HTMLInputElement | null>

  // Tags
  tagDefinitions: ThreadTag[]
}

export const V2ShellContext = createContext<V2ShellContextValue | null>(null)

export function useV2Shell(): V2ShellContextValue {
  const ctx = useContext(V2ShellContext)
  if (!ctx) throw new Error('useV2Shell must be used inside V2Page')
  return ctx
}
