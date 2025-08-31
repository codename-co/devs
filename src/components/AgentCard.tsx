import { Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useEffect, useState } from 'react'

import { getAgentById } from '@/stores/agentStore'
import { type Agent } from '@/types'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'

interface AgentCardProps {
  id: string
  className?: string
  onPress?: (agentId: string) => void
}

export const AgentCard = ({ id, className, onPress }: AgentCardProps) => {
  const [agent, setAgent] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(true)
  const { lang } = useI18n()

  useEffect(() => {
    const loadAgent = async () => {
      try {
        const agentData = await getAgentById(id)
        setAgent(agentData)
      } catch (error) {
        console.error(`Error loading agent ${id}:`, error)
      } finally {
        setLoading(false)
      }
    }

    loadAgent()
  }, [id])

  if (loading || !agent) {
    return (
      <Card className={className}>
        <CardBody>
          <div className="animate-pulse">
            <div className="h-4 bg-default-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-default-200 rounded w-full"></div>
          </div>
        </CardBody>
      </Card>
    )
  }

  const displayName = agent.i18n?.[lang]?.name || agent.name
  const displayDesc = agent.i18n?.[lang]?.desc || agent.desc

  return (
    <Card
      className={`${className} cursor-pointer hover:scale-105 transition-transform dark:border-1 dark:border-default-400`}
      isPressable
      onPress={() => onPress?.(agent.id)}
    >
      <CardHeader className="pb-2 pt-2 px-4 flex-col items-start">
        <div className="flex items-center gap-2 w-full">
          {agent.icon && <Icon name={agent.icon} className="w-6 h-6" />}
          <h4 className="font-bold text-large">{displayName}</h4>
        </div>
        {agent.tags && agent.tags.length > 0 && (
          <div className="flex gap-1 mt-2 flex-wrap">
            {agent.tags.slice(0, 3).map((tag: string) => (
              <Chip key={tag} size="sm" variant="flat">
                {tag}
              </Chip>
            ))}
          </div>
        )}
      </CardHeader>
      <CardBody className="px-4 pb-4">
        {displayDesc && (
          <p className="text-small text-default-600 line-clamp-2">
            {displayDesc}
          </p>
        )}
        {agent.knowledgeItemIds && agent.knowledgeItemIds.length > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <Icon name="Brain" size="sm" />
            <span className="text-xs">
              {agent.knowledgeItemIds.length} knowledge item
              {agent.knowledgeItemIds.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}
      </CardBody>
    </Card>
  )
}
