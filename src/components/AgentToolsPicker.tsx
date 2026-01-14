import {
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  CheckboxGroup,
  Chip,
  Divider,
} from '@heroui/react'

import { Icon, Icons } from '@/components/Icon'
import { useI18n } from '@/i18n'
import { KNOWLEDGE_TOOL_DEFINITIONS } from '@/lib/knowledge-tools'
import type { KnowledgeToolName } from '@/lib/knowledge-tools/types'
import { MATH_TOOL_DEFINITIONS } from '@/lib/math-tools'
import type { MathToolName } from '@/lib/math-tools/types'
import type { Tool } from '@/types'

interface AgentToolsPickerProps {
  selectedToolNames?: string[]
  onSelectionChange: (tools: Tool[]) => void
  className?: string
}

type IconName = keyof typeof Icons

/**
 * Tool type identifier for categorization
 */
type ToolType = 'knowledge' | 'math'

/**
 * Combined tool info type
 */
interface ToolInfo {
  icon: IconName
  label: string
  shortDescription: string
  type: ToolType
}

/**
 * Knowledge tool metadata for display purposes.
 * Maps tool names to user-friendly information.
 */
const KNOWLEDGE_TOOL_INFO: Record<KnowledgeToolName, ToolInfo> = {
  search_knowledge: {
    icon: 'PageSearch',
    label: 'Search Knowledge',
    shortDescription: 'Search the knowledge base for relevant documents',
    type: 'knowledge',
  },
  read_document: {
    icon: 'Document',
    label: 'Read Document',
    shortDescription: 'Read the full content of a specific document',
    type: 'knowledge',
  },
  list_documents: {
    icon: 'Folder',
    label: 'List Documents',
    shortDescription: 'List documents and folders in the knowledge base',
    type: 'knowledge',
  },
  get_document_summary: {
    icon: 'Page',
    label: 'Get Document Summary',
    shortDescription: 'Get a concise summary of a document',
    type: 'knowledge',
  },
}

/**
 * Math tool metadata for display purposes.
 */
const MATH_TOOL_INFO: Record<MathToolName, ToolInfo> = {
  calculate: {
    icon: 'MathBook',
    label: 'Calculate',
    shortDescription:
      'Evaluate mathematical expressions with support for variables and Math functions',
    type: 'math',
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
 * Convert math tool name to Tool object for agent storage.
 */
function mathToolNameToTool(name: MathToolName): Tool {
  const definition = MATH_TOOL_DEFINITIONS[name]
  return {
    id: `math_tool_${name}`,
    name: definition.function.name,
    description: definition.function.description,
    type: 'custom',
    config: {
      toolType: 'math',
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

/**
 * Extract math tool names from Tool array.
 */
function getMathToolNames(tools?: Tool[]): string[] {
  if (!tools) return []
  return tools
    .filter((tool) => tool.config?.toolType === 'math')
    .map((tool) => tool.name)
}

/**
 * Get all tool names from Tool array.
 */
function getAllToolNames(tools?: Tool[]): string[] {
  return [...getKnowledgeToolNames(tools), ...getMathToolNames(tools)]
}

export function AgentToolsPicker({
  selectedToolNames = [],
  onSelectionChange,
  className,
}: AgentToolsPickerProps) {
  const { t } = useI18n()
  const knowledgeToolNames = Object.keys(
    KNOWLEDGE_TOOL_DEFINITIONS,
  ) as KnowledgeToolName[]
  const mathToolNames = Object.keys(MATH_TOOL_DEFINITIONS) as MathToolName[]

  const handleSelectionChange = (values: string[]) => {
    const tools: Tool[] = []

    // Add knowledge tools
    for (const name of values) {
      if (name in KNOWLEDGE_TOOL_DEFINITIONS) {
        tools.push(knowledgeToolNameToTool(name as KnowledgeToolName))
      } else if (name in MATH_TOOL_DEFINITIONS) {
        tools.push(mathToolNameToTool(name as MathToolName))
      }
    }

    onSelectionChange(tools)
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Icon name="Settings" className="w-5 h-5 text-secondary" />
            <h3 className="text-lg font-semibold">Agent Tools</h3>
            <Chip size="sm" variant="flat" color="secondary">
              {selectedToolNames.length} enabled
            </Chip>
          </div>
        </div>
      </CardHeader>
      <CardBody className="gap-6">
        {/* Knowledge Tools Section */}
        <div>
          <p className="text-sm font-medium text-default-700 mb-2">
            Knowledge Tools
          </p>
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
                      <Icon
                        name={info.icon}
                        className="w-4 h-4 text-secondary"
                      />
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
        </div>

        <Divider />

        {/* Math Tools Section */}
        <div>
          <p className="text-sm font-medium text-default-700 mb-2">
            Math & Computation Tools
          </p>
          <p className="text-sm text-default-500 mb-4">
            Enable tools that allow the agent to perform calculations and
            mathematical operations.
          </p>
          <CheckboxGroup
            value={selectedToolNames}
            onValueChange={handleSelectionChange}
            className="gap-3"
          >
            {mathToolNames.map((name) => {
              const info = MATH_TOOL_INFO[name]
              return (
                <div
                  key={name}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-default-50 transition-colors"
                >
                  <Checkbox value={name} className="mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Icon
                        name={info.icon}
                        className="w-4 h-4 text-secondary"
                      />
                      <span className="font-medium">{t('Calculate')}</span>
                    </div>
                    <p className="text-sm text-default-500 mt-1">
                      {t(
                        'Evaluate mathematical expressions with support for variables and Math functions',
                      )}
                    </p>
                  </div>
                </div>
              )
            })}
          </CheckboxGroup>
        </div>
      </CardBody>
    </Card>
  )
}

// Export utility functions for external use
export {
  getKnowledgeToolNames,
  getMathToolNames,
  getAllToolNames,
  knowledgeToolNameToTool,
  mathToolNameToTool,
}
