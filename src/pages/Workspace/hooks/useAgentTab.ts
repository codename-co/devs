import { useCallback, useMemo } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  DEFAULT_AGENT_TAB,
  VALID_AGENT_TABS,
  type AgentTab,
} from '../components/agent-preview/tab-definitions'

const KNOWN_LANGS = ['en', 'fr', 'de', 'es', 'ar', 'ko']

function deriveFilterFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean)
  if (segments.length > 0 && KNOWN_LANGS.includes(segments[0])) segments.shift()
  if (segments.length > 0 && segments[0] === 'v2') segments.shift()
  if (segments.length >= 2 && segments[0] === 'spaces') segments.splice(0, 2)
  return segments[0] ?? 'home'
}

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
  const location = useLocation()
  const params = useParams<{
    filter?: string
    threadId?: string
    tab?: string
  }>()

  const agentId = params.threadId
  const filter = deriveFilterFromPathname(location.pathname)

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

      // Determine the base path (handles /:lang or /)
      const segments = window.location.pathname.split('/')
      const v2Idx = segments.indexOf('v2')
      let base: string
      if (v2Idx !== -1) {
        base = segments.slice(0, v2Idx + 1).join('/')
      } else {
        const langSegment = segments[1]
        const knownLangs = ['en', 'fr', 'de', 'es', 'ar', 'ko']
        base = langSegment && knownLangs.includes(langSegment)
          ? `/${langSegment}`
          : ''
      }

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
