import { memo, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { Button, Chip, Kbd, ScrollShadow } from '@heroui/react_3'
import { AgentAvatar, Icon, MarkdownRenderer } from '@/components'
import { useAgentsSeparated } from '@/stores/agentStore'
import { useI18n } from '@/i18n'
import type { Agent } from '@/types'
import { CollectionView } from './CollectionView'

interface AgentBrowserProps {
  onStartConversation: (agent: Agent) => void
  className?: string
}

/**
 * Two-column agent browser for the V2 layout.
 * Left: searchable agent list. Right: agent detail preview.
 */
export const AgentBrowser = memo(function AgentBrowser({
  onStartConversation,
  className,
}: AgentBrowserProps) {
  const { t } = useI18n()
  const { customAgents, builtInAgents, loading } = useAgentsSeparated()
  const [search, setSearch] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)
  const deferredSearch = useDeferredValue(search)

  const allAgents = useMemo(
    () => [...customAgents, ...builtInAgents],
    [customAgents, builtInAgents],
  )

  const filteredAgents = useMemo(() => {
    if (!deferredSearch) return allAgents
    const q = deferredSearch.toLowerCase()
    return allAgents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.role?.toLowerCase().includes(q) ||
        a.desc?.toLowerCase().includes(q) ||
        a.tags?.some((tag) => tag.toLowerCase().includes(q)),
    )
  }, [allAgents, deferredSearch])

  const selectedAgent = useMemo(
    () => allAgents.find((a) => a.id === selectedAgentId) ?? null,
    [allAgents, selectedAgentId],
  )

  const customAgentIds = useMemo(
    () => new Set(customAgents.map((a) => a.id)),
    [customAgents],
  )

  const handleSelect = useCallback((id: string) => {
    setSelectedAgentId(id)
  }, [])

  return (
    <div
      className={`grid min-h-0 grid-cols-1 md:grid-cols-2 ${className ?? ''}`}
    >
      {/* Agent list */}
      <CollectionView
        items={filteredAgents}
        selectedId={selectedAgentId ?? undefined}
        onSelect={handleSelect}
        isLoading={loading}
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={t('Search agents…') as string}
        getItemId={(agent) => agent.id}
        getItemTextValue={(agent) => agent.name}
        renderItem={(agent) => (
          <div className="flex w-full items-center gap-3 rounded-2xl p-2">
            <AgentAvatar agent={agent} size="md" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-foreground truncate text-sm font-medium">
                {agent.name}
              </span>
              <span className="text-muted truncate text-xs">{agent.role}</span>
            </div>
            {customAgentIds.has(agent.id) && (
              <Chip size="sm" variant="soft" className="shrink-0 text-[10px]">
                Custom
              </Chip>
            )}
          </div>
        )}
        emptyLabel={t('No agents found') as string}
        noMatchLabel={t('No agents found') as string}
        ariaLabel="Agent list"
        showSearchShortcutHint={false}
      />

      {/* Agent detail */}
      <div className="hidden min-h-0 flex-col overflow-clip py-4 pr-4 md:flex">
        {selectedAgent ? (
          <AgentDetail
            agent={selectedAgent}
            isCustom={customAgentIds.has(selectedAgent.id)}
            onStartConversation={onStartConversation}
          />
        ) : (
          <div className="bg-surface flex flex-1 items-center justify-center rounded-2xl shadow-sm">
            <div className="text-muted flex flex-col items-center gap-3">
              <Icon name="Group" size="2xl" className="opacity-30" />
              <p className="text-sm">{t('Select an agent')}</p>
              <div className="flex items-center gap-2 text-xs">
                <Kbd>↑</Kbd>/<Kbd>↓</Kbd> to navigate
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
})

function AgentDetail({
  agent,
  isCustom,
  onStartConversation,
}: {
  agent: Agent
  isCustom: boolean
  onStartConversation: (agent: Agent) => void
}) {
  const { t } = useI18n()

  return (
    <div className="bg-surface flex min-h-0 max-h-full flex-1 flex-col gap-4 overflow-clip rounded-2xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start gap-4">
        <AgentAvatar agent={agent} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-foreground truncate text-base font-semibold">
              {agent.name}
            </h2>
            {isCustom && (
              <Chip size="sm" variant="soft">
                Custom
              </Chip>
            )}
          </div>
          <span className="text-muted text-sm">{agent.role}</span>
          {agent.desc && (
            <p className="text-foreground mt-1 text-sm">{agent.desc}</p>
          )}
        </div>
      </div>

      {/* Tags */}
      {agent.tags && agent.tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {agent.tags.map((tag) => (
            <Chip key={tag} size="sm" variant="soft">
              {tag}
            </Chip>
          ))}
        </div>
      )}

      {/* Settings summary */}
      <div className="border-separator flex flex-wrap gap-4 border-t pt-3 text-xs">
        {agent.temperature != null && (
          <div className="flex items-center gap-1.5">
            <Icon name="TemperatureUp" size="sm" className="text-muted" />
            <span className="text-muted">Temperature:</span>
            <span className="text-foreground font-medium">
              {agent.temperature}
            </span>
          </div>
        )}
        {agent.tools && agent.tools.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Icon name="Tools" size="sm" className="text-muted" />
            <span className="text-muted">{t('Tools') as string}:</span>
            <span className="text-foreground font-medium">
              {agent.tools.length}
            </span>
          </div>
        )}
        {agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Icon name="Book" size="sm" className="text-muted" />
            <span className="text-muted">{t('Knowledge') as string}:</span>
            <span className="text-foreground font-medium">
              {agent.knowledgeItemIds.length}
            </span>
          </div>
        )}
      </div>

      {/* Instructions preview */}
      {agent.instructions && (
        <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
          <div className="text-foreground text-sm leading-relaxed">
            <MarkdownRenderer content={agent.instructions} />
          </div>
        </ScrollShadow>
      )}

      {/* Examples */}
      {agent.examples && agent.examples.length > 0 && (
        <div className="border-separator border-t pt-3">
          <h3 className="text-muted mb-2 text-xs font-medium uppercase tracking-wide">
            Examples
          </h3>
          <div className="flex flex-col gap-1.5">
            {agent.examples.slice(0, 3).map((ex) => (
              <button
                key={ex.id}
                type="button"
                className="bg-default-100 hover:bg-default-200 cursor-pointer rounded-lg px-3 py-2 text-left text-xs transition-colors"
                onClick={() => onStartConversation(agent)}
              >
                {ex.title || ex.prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Action */}
      <div className="border-separator shrink-0 border-t pt-3">
        <Button
          fullWidth
          variant="primary"
          onPress={() => onStartConversation(agent)}
        >
          <Icon name="ChatBubble" />
          Start conversation
        </Button>
      </div>
    </div>
  )
}
