import { useMemo } from 'react'
import { type LanguageCode, useUrl } from '@/i18n'
import { useConversationStore } from '@/stores/conversationStore'
import { getAgentById } from '@/stores/agentStore'
import { useAgents } from '@/stores/agentStore'
import { useSkills } from '@/stores/skillStore'
import {
  useLiveMap,
  useSyncReady,
  tasks as taskMap,
  knowledge as knowledgeMap,
  studioEntries as studioMap,
  connectors as connectorMap,
} from '@/lib/yjs'
import type { IconName } from '@/lib/types'
import { toEpoch } from '@/lib/date'

export interface ActivityItem {
  id: string
  type:
    | 'conversation'
    | 'task'
    | 'agent'
    | 'file'
    | 'studio'
    | 'connector'
    | 'skill'
  name: string
  subtitle?: string
  icon: IconName
  href: string
  timestamp: number // ms since epoch for sorting
}

export const ACTIVITY_ICONS: Record<ActivityItem['type'], IconName> = {
  conversation: 'ChatBubble',
  task: 'PcCheck',
  agent: 'Sparks',
  file: 'Page',
  studio: 'MediaImagePlus',
  connector: 'DataTransferBoth',
  skill: 'Puzzle',
}

/** Well-known workflowId values assigned to user-initiated (root) conversations. */
const ROOT_WORKFLOW_IDS = new Set(['default', 'orchestration', 'live'])

export const useRecentActivity = (lang: LanguageCode): ActivityItem[] => {
  const url = useUrl(lang)
  const conversations = useConversationStore((s) => s.conversations)
  const getTitle = useConversationStore((s) => s.getConversationTitle)
  const allTasks = useLiveMap(taskMap).filter((t) => !t.parentTaskId)
  const agents = useAgents()
  const allKnowledge = useLiveMap(knowledgeMap)
  const allStudio = useLiveMap(studioMap)
  const allConnectors = useLiveMap(connectorMap)
  const allSkills = useSkills()

  // Force a re-render once Yjs has finished hydrating from IndexedDB.
  // Without this, useLiveMap hooks may return stale (empty) snapshots
  // because the Y.Map.observe() events fired before React could process them.
  const yjsReady = useSyncReady()

  return useMemo(() => {
    const items: ActivityItem[] = []

    // Conversations – only root (user-initiated) ones
    for (const c of conversations) {
      if (!ROOT_WORKFLOW_IDS.has(c.workflowId)) continue
      const ts = toEpoch(c.updatedAt) || toEpoch(c.timestamp)
      if (!ts) continue
      const agent = c.agentId ? getAgentById(c.agentId) : undefined
      const slug = c.agentSlug || agent?.slug || 'devs'
      items.push({
        id: `conv-${c.id}`,
        type: 'conversation',
        name: getTitle(c) || 'Untitled',
        subtitle: agent?.name,
        icon: ACTIVITY_ICONS.conversation,
        href: url(`/agents/run/${slug}/${c.id}`),
        timestamp: ts,
      })
    }

    // Tasks
    for (const t of allTasks) {
      const ts = toEpoch(t.updatedAt) || toEpoch(t.createdAt)
      if (!ts) continue
      items.push({
        id: `task-${t.id}`,
        type: 'task',
        name: t.title || 'Untitled task',
        icon: ACTIVITY_ICONS.task,
        href: url(`/tasks/${t.id}`),
        timestamp: ts,
      })
    }

    // Agents (custom only — useAgents filters deleted)
    for (const a of agents) {
      const ts = toEpoch(a.updatedAt) || toEpoch(a.createdAt)
      if (!ts) continue
      items.push({
        id: `agent-${a.id}`,
        type: 'agent',
        name: a.name,
        icon: ACTIVITY_ICONS.agent,
        href: url(`/agents/run/${a.slug}`),
        timestamp: ts,
      })
    }

    // Knowledge / files
    for (const k of allKnowledge) {
      const ki = k as any
      if (ki.type === 'folder') continue
      const ts = toEpoch(ki.lastModified) || toEpoch(ki.createdAt)
      if (!ts) continue
      items.push({
        id: `file-${ki.id}`,
        type: 'file',
        name: ki.name || 'Untitled file',
        icon: ACTIVITY_ICONS.file,
        href: url(`/knowledge`),
        timestamp: ts,
      })
    }

    // Studio entries
    for (const s of allStudio) {
      const si = s as any
      const ts = toEpoch(si.createdAt)
      if (!ts) continue
      const label =
        si.prompt?.length > 40
          ? si.prompt.slice(0, 40) + '…'
          : si.prompt || 'Generation'
      items.push({
        id: `studio-${si.id}`,
        type: 'studio',
        name: label,
        icon: ACTIVITY_ICONS.studio,
        href: url(`/studio`),
        timestamp: ts,
      })
    }

    // Connectors
    for (const c of allConnectors) {
      const ci = c as any
      const ts =
        toEpoch(ci.lastSyncAt) || toEpoch(ci.updatedAt) || toEpoch(ci.createdAt)
      if (!ts) continue
      items.push({
        id: `conn-${ci.id}`,
        type: 'connector',
        name: ci.name || ci.provider || 'Connector',
        icon: ACTIVITY_ICONS.connector,
        href: url(`/#settings/connectors`),
        timestamp: ts,
      })
    }

    // Installed skills
    for (const sk of allSkills) {
      const ts = toEpoch(sk.updatedAt) || toEpoch(sk.installedAt)
      if (!ts) continue
      items.push({
        id: `skill-${sk.id}`,
        type: 'skill',
        name: sk.name,
        icon: ACTIVITY_ICONS.skill,
        href: url(`/#settings/skills`),
        timestamp: ts,
      })
    }

    // Sort descending by timestamp and take top 10
    items.sort((a, b) => b.timestamp - a.timestamp)
    return items.slice(0, 10)
  }, [
    conversations,
    getTitle,
    allTasks,
    agents,
    allKnowledge,
    allStudio,
    allConnectors,
    allSkills,
    url,
    yjsReady,
  ])
}
