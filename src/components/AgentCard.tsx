import { Avatar, Card, CardBody, CardHeader, Chip } from '@heroui/react'
import { useEffect, useState } from 'react'

import { getAgentById } from '@/stores/agentStore'
import { type Agent, type AgentColor } from '@/types'
import { Icon } from '@/components/Icon'
import { useI18n } from '@/i18n'

/**
 * Map agent color to HeroUI Avatar color
 */
const getAvatarColor = (
  color?: AgentColor,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger' => {
  return color || 'default'
}

interface AgentCardProps {
  id: string
  className?: string
  onPress?: (agentId: string) => void
  children?: React.ReactNode
  showDetails?: boolean
}

export const AgentCard = ({
  id,
  className,
  onPress,
  children,
  showDetails = false,
}: AgentCardProps) => {
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
  const displayDesc = agent.i18n?.[lang]?.desc || agent.desc || agent.role

  // Map agent color to Tailwind background classes
  const colorBgClasses: Record<string, string> = {
    primary: 'bg-primary-100 dark:bg-primary-900/30',
    secondary: 'bg-secondary-100 dark:bg-secondary-900/30',
    success: 'bg-success-100 dark:bg-success-900/30',
    warning: 'bg-warning-100 dark:bg-warning-900/30',
    danger: 'bg-danger-100 dark:bg-danger-900/30',
    default: 'bg-default-100 dark:bg-default-100',
  }

  const bgColorClass =
    colorBgClasses[agent.color || 'default'] || colorBgClasses.default

  return (
    <Card
      data-testid="agent-card"
      className={`${className} ${bgColorClass} cursor-pointer hover:scale-105 transition-transform dark:border-1 dark:border-default-400`}
      isPressable
      onPress={() => onPress?.(agent.slug)}
    >
      <CardHeader className="pb-2 pt-2 px-4 flex-col items-start relative">
        {children}
        <div
          className="flex items-start gap-3 w-full"
          data-testid="agent-details"
        >
          {/* Agent avatar using HeroUI Avatar */}
          <Avatar
            className="w-16 h-16 text-large"
            radius="full"
            color={getAvatarColor(agent.color)}
            src={
              agent.portrait
                ? `data:image/png;base64,${agent.portrait}`
                : undefined
            }
            name={displayName}
            showFallback
            fallback={
              <Icon
                name={agent.icon || 'User'}
                className="w-8 h-8 text-inherit"
              />
            }
            classNames={{
              base: 'flex-shrink-0',
              fallback: 'flex items-center justify-center',
            }}
          />
          <div className="flex flex-col items-start min-w-0 flex-1 text-start">
            <h3 className="text-md font-medium truncate w-full">
              {displayName}
            </h3>
            {displayDesc && (
              <p className="text-sm text-default-600 line-clamp-2 mt-1">
                {displayDesc}
              </p>
            )}
          </div>
        </div>
      </CardHeader>
      {showDetails && (
        <CardBody className="px-4 pb-4 pt-0">
          {!displayDesc && agent.tags && agent.tags.length > 0 && (
            <div data-testid="agent-tags" className="flex gap-1 flex-wrap">
              {agent.tags.slice(0, 3).map((tag: string) => (
                <Chip key={tag} size="sm" variant="flat" className="tag">
                  {tag}
                </Chip>
              ))}
            </div>
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
      )}
    </Card>
  )
}
