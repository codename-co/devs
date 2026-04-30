import { Chip } from '@heroui/react_3'
import { Icon } from '@/components'
import { useI18n } from '@/i18n'
import { SectionCard, SectionEmpty } from '../shared/SectionCard'
import type { Agent, Tool } from '@/types'

interface ToolsSectionProps {
  agent: Agent
}

function categorize(tools: Tool[]) {
  const categories: Record<string, Tool[]> = {}
  for (const tool of tools) {
    const cat = tool.type || 'other'
    if (!categories[cat]) categories[cat] = []
    categories[cat].push(tool)
  }
  return categories
}

const categoryIcons: Record<string, string> = {
  file: 'Book',
  web: 'Internet',
  api: 'Code',
  shell: 'Terminal',
  custom: 'Puzzle',
}

const categoryLabels: Record<string, string> = {
  file: 'Knowledge',
  web: 'Research',
  api: 'API',
  shell: 'Shell',
  custom: 'Custom',
}

export function ToolsSection({ agent }: ToolsSectionProps) {
  const { t } = useI18n()
  const tools = agent.tools ?? []
  const categories = categorize(tools)

  return (
    <SectionCard icon="Tools" title={t('Tools') as string} count={tools.length}>
      {tools.length === 0 ? (
        <SectionEmpty
          icon="Tools"
          message={t('No tools configured')}
        />
      ) : (
        <div className="flex flex-col gap-3">
          {Object.entries(categories).map(([cat, catTools]) => (
            <div key={cat}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <Icon
                  name={(categoryIcons[cat] || 'Puzzle') as any}
                  size="xs"
                  className="text-muted"
                />
                <span className="text-muted text-xs font-medium uppercase tracking-wider">
                  {categoryLabels[cat] || cat}
                </span>
                <Chip size="sm" variant="soft" className="text-xs">
                  {catTools.length}
                </Chip>
              </div>
              <div className="flex flex-col gap-0.5">
                {catTools.map((tool) => (
                  <div
                    key={tool.id}
                    className="flex items-start gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-default-100"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-foreground text-xs font-medium">
                        {tool.name}
                      </span>
                      {tool.description && (
                        <span className="text-muted line-clamp-1 text-xs">
                          {tool.description}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}
