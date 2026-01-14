import {
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
} from '@heroui/react'

import { Icon, Icons } from '@/components/Icon'
import { KNOWLEDGE_TOOL_DEFINITIONS } from '@/lib/knowledge-tools'
import type { KnowledgeToolName } from '@/lib/knowledge-tools/types'
import type { Tool } from '@/types'

interface AgentToolsPickerProps {
  selectedToolNames?: string[]
  onSelectionChange: (tools: Tool[]) => void
  className?: string
}

type IconName = keyof typeof Icons

/**
 * Knowledge tool metadata for display purposes.
 * Maps tool names to user-friendly information.
 */
const KNOWLEDGE_TOOL_INFO: Record<
  KnowledgeToolName,
  { icon: IconName; label: string; shortDescription: string }
> = {
  search_knowledge: {
    icon: 'PageSearch',
    label: 'Search Knowledge',
    shortDescription: 'Search the knowledge base for relevant documents',
  },
  read_document: {
    icon: 'Document',
    label: 'Read Document',
    shortDescription: 'Read the full content of a specific document',
  },
  list_documents: {
    icon: 'Folder',
    label: 'List Documents',
    shortDescription: 'List documents and folders in the knowledge base',
  },
  get_document_summary: {
    icon: 'Page',
    label: 'Get Document Summary',
    shortDescription: 'Get a concise summary of a document',
  },
}

/**
 * Convert knowledge tool name to Tool object for agent storage.
 */
function knowledgeToolNameToTool(name: KnowledgeToolName): Tool {
  const definition = KNOWLEDGE_TOOL_DEFINITIONS[name]
  return {
    id: `knowledge_tool_${name}`,
    name: definition.function.name,
    description: definition.function.description,
    type: 'custom',
    config: {
      toolType: 'knowledge',
      parameters: definition.function.parameters,
    },
  }
}

/**
 * Extract knowledge tool names from Tool array.
 */
function getKnowledgeToolNames(tools?: Tool[]): string[] {
  if (!tools) return []
  return tools
    .filter((tool) => tool.config?.toolType === 'knowledge')
    .map((tool) => tool.name)
}

export function AgentToolsPicker({
  selectedToolNames = [],
  onSelectionChange,
  className,
}: AgentToolsPickerProps) {
  const knowledgeToolNames = Object.keys(
    KNOWLEDGE_TOOL_DEFINITIONS,
  ) as KnowledgeToolName[]

  const handleSelectionChange = (values: string[]) => {
    const tools = values.map((name) =>
      knowledgeToolNameToTool(name as KnowledgeToolName),
    )
    onSelectionChange(tools)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Knowledge Tools</h3>
            <Chip size="sm" variant="flat" color="secondary">
              {selectedToolNames.length} enabled
            </Chip>
          </div>
        </div>
      </CardHeader>
      <CardBody>
        <p className="text-sm text-default-500 mb-4">
          Enable tools that allow the agent to search and read from your
          knowledge base.
        </p>
        <CheckboxGroup
          value={selectedToolNames}
          onValueChange={handleSelectionChange}
          className="gap-3"
        >
          {knowledgeToolNames.map((name) => {
            const info = KNOWLEDGE_TOOL_INFO[name]
            return (
              <div
                key={name}
                className="flex items-start gap-3 p-3 rounded-lg hover:bg-default-50 transition-colors"
              >
                <Checkbox value={name} className="mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon name={info.icon} className="w-4 h-4 text-secondary" />
                    <span className="font-medium">{info.label}</span>
                  </div>
                  <p className="text-sm text-default-500 mt-1">
                    {info.shortDescription}
                  </p>
                </div>
              </div>
            )
          })}
        </CheckboxGroup>
      </CardBody>
    </Card>
  )
}

// Export utility functions for external use
export { getKnowledgeToolNames, knowledgeToolNameToTool }
