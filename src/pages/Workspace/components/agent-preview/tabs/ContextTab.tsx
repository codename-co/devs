import { ScrollShadow } from '@heroui/react_3'
import type { Agent } from '@/types'
import { KnowledgeSection } from '../context-sections/KnowledgeSection'
import { ToolsSection } from '../context-sections/ToolsSection'
import { SkillsSection } from '../context-sections/SkillsSection'
import { ConnectorsSection } from '../context-sections/ConnectorsSection'
import { MemorySection } from '../context-sections/MemorySection'

interface ContextTabProps {
  agent: Agent
}

export function ContextTab({ agent }: ContextTabProps) {
  return (
    <ScrollShadow hideScrollBar className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-3 py-1">
        <KnowledgeSection agent={agent} />
        <ToolsSection agent={agent} />
        <SkillsSection agentId={agent.id} />
        <MemorySection agentId={agent.id} />
        <ConnectorsSection />
      </div>
    </ScrollShadow>
  )
}
