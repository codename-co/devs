import { useCallback, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  DEFAULT_AGENT_TAB,
  VALID_AGENT_TABS,
  type AgentTab,
} from '../components/agent-preview/tab-definitions'

/**
 * Reads and writes the agent tab segment from the V2 URL.
 *
 * URL shape: `v2/agents/:agentId/:tab`
 *
 * The `:tab` param comes from the route `v2/:filter/:threadId/:tab`
 * added alongside the existing V2 routes.
 */
export function useAgentTab() {
  const navigate = useNavigate()
  const params = useParams<{
    filter?: string
    threadId?: string
    tab?: string
  }>()

  const agentId = params.threadId
  const filter = params.filter

  const activeTab: AgentTab = useMemo(() => {
    if (filter !== 'agents') return DEFAULT_AGENT_TAB
    const raw = params.tab
    if (raw && VALID_AGENT_TABS.includes(raw)) {
      return raw as AgentTab
    }
    return DEFAULT_AGENT_TAB
  }, [filter, params.tab])

  const setActiveTab = useCallback(
    (tab: AgentTab) => {
      if (!agentId) return

      // Determine the base path (handles /:lang/v2 or /v2)
      const segments = window.location.pathname.split('/')
      const v2Idx = segments.indexOf('v2')
      const base = segments.slice(0, v2Idx + 1).join('/')

      // Build agent tab URL
      const path =
        tab === DEFAULT_AGENT_TAB
          ? `${base}/agents/${agentId}`
          : `${base}/agents/${agentId}/${tab}`

      // Preserve any hash-based search
      const hash = window.location.hash || ''
      navigate(path + hash, { replace: true })
    },
    [agentId, navigate],
  )

  return { activeTab, setActiveTab, agentId }
}
