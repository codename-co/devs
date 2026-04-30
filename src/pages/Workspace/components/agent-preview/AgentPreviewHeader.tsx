import { useState, useCallback } from 'react'
import { Button, Dropdown, Kbd, Label, Tooltip } from '@heroui/react_3'
import { AgentAvatar, Icon } from '@/components'
import { useI18n } from '@/i18n'
import { softDeleteAgent } from '@/stores/agentStore'
import { useMinWidth } from '@/hooks/useMinWidth'
import type { Agent } from '@/types'

interface AgentPreviewHeaderProps {
  agent: Agent
  isCustom: boolean
  onStartConversation: (agent: Agent) => void
  onDeselect: () => void
  pagination?: { current: number; total: number }
  goToPrevious?: () => void
  goToNext?: () => void
  isFullscreen: boolean
  onToggleFullscreen: () => void
  /** Whether this preview is pinned/sticky */
  isPinned?: boolean
  /** Toggle pin state */
  onTogglePin?: () => void
}

export function AgentPreviewHeader({
  agent,
  isCustom,
  onStartConversation,
  onDeselect,
  pagination,
  goToPrevious,
  goToNext,
  isFullscreen,
  onToggleFullscreen,
  isPinned,
  onTogglePin,
}: AgentPreviewHeaderProps) {
  const { t } = useI18n()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const isHD = useMinWidth(1280)

  const handleDelete = useCallback(async () => {
    await softDeleteAgent(agent.id)
    setShowDeleteConfirm(false)
    onDeselect()
  }, [agent.id, onDeselect])

  const handleDropdownAction = useCallback((key: React.Key) => {
    if (key === 'delete') {
      setShowDeleteConfirm(true)
    }
  }, [])

  return (
    <div className="flex shrink-0 flex-col gap-3">
      {/* Toolbar row — mirrors ThreadPreview */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ToolbarBtn icon="Xmark" onClick={onDeselect} tooltip={t('Close (Esc)')} />
          <div className="bg-separator mx-1 h-4 w-px" />
          <ToolbarBtn
            icon={isFullscreen ? 'Collapse' : 'Expand'}
            onClick={onToggleFullscreen}
            tooltip={isFullscreen ? t('Exit fullscreen') : t('Fullscreen')}
          />
          {onTogglePin && isHD && (
            <ToolbarBtn
              icon={isPinned ? 'PinSolid' : 'Pin'}
              onClick={onTogglePin}
              tooltip={isPinned ? t('Unpin') : t('Pin')}
            />
          )}
          <ToolbarBtn
            icon="ChatBubble"
            onClick={() => onStartConversation(agent)}
            tooltip={t('Chat')}
          />

          {/* More actions dropdown */}
          <Dropdown>
            <Dropdown.Trigger>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-foreground"
                aria-label={t('More actions')}
              >
                <Icon name="MoreVert" />
              </Button>
            </Dropdown.Trigger>
            <Dropdown.Popover placement="bottom end">
              <Dropdown.Menu onAction={handleDropdownAction}>
                {isCustom ? (
                  <Dropdown.Item
                    id="delete"
                    textValue={t('Delete agent')}
                    variant="danger"
                  >
                    <Icon name="Trash" />
                    <Label>{t('Delete')}</Label>
                  </Dropdown.Item>
                ) : (
                  <Dropdown.Item
                    id="no-actions"
                    textValue={t('No actions available')}
                    isDisabled
                  >
                    <Label>{t('No actions available')}</Label>
                  </Dropdown.Item>
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </div>

        <div className="flex items-center gap-3">
          {pagination && goToPrevious && goToNext && (
            <>
              <span className="text-muted text-xs tabular-nums">
                {t('{current} of {total}', { current: pagination.current, total: pagination.total })}
              </span>
              <div className="flex items-center gap-0.5">
                <ToolbarBtn
                  icon="ArrowLeft"
                  onClick={goToPrevious}
                  disabled={pagination.current <= 1}
                  tooltip={
                    <>
                      {t('Previous')} <Kbd>j</Kbd>
                    </>
                  }
                />
                <ToolbarBtn
                  icon="ArrowRight"
                  onClick={goToNext}
                  disabled={pagination.current >= pagination.total}
                  tooltip={
                    <>
                      {t('Next')} <Kbd>k</Kbd>
                    </>
                  }
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete confirmation banner */}
      {showDeleteConfirm && (
        <div className="bg-danger-50/50 dark:bg-danger-50/10 border-danger/20 flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
          <span className="text-danger text-xs font-medium">
            {t('Delete this agent? This cannot be undone.')}
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="danger" onPress={handleDelete}>
              {t('Delete')}
            </Button>
            <Button
              size="sm"
              variant="tertiary"
              onPress={() => setShowDeleteConfirm(false)}
            >
              {t('Cancel')}
            </Button>
          </div>
        </div>
      )}

      {/* Agent identity row */}
      <div className="flex items-center gap-3">
        <AgentAvatar agent={agent} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 className="text-foreground truncate text-lg font-semibold tracking-tight">
            {agent.name}
          </h2>
          <span className="text-muted line-clamp-1 text-sm leading-snug">
            {agent.role}
          </span>
        </div>
        {isCustom && (
          <span className="text-muted shrink-0 text-[10px] font-medium uppercase tracking-wider">
            {t('Custom')}
          </span>
        )}
      </div>
    </div>
  )
}

/** Small icon-only toolbar button with optional tooltip */
function ToolbarBtn({
  icon,
  onClick,
  disabled,
  tooltip,
}: {
  icon: string
  onClick?: () => void
  disabled?: boolean
  tooltip?: React.ReactNode
}) {
  const btn = (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      className="text-muted hover:text-foreground"
      onPress={onClick}
      isDisabled={disabled}
    >
      <Icon name={icon as any} />
    </Button>
  )

  if (!tooltip) return btn

  return (
    <Tooltip delay={0}>
      {btn}
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  )
}
