import { memo, useState, useCallback } from 'react'
import { Button, TextArea, Chip, Alert } from '@heroui/react'

import { useI18n } from '@/i18n'
import { Icon } from '@/components/Icon'
import { AgentAvatar } from '@/components/AgentAvatar'
import { MarkdownRenderer } from '@/components/MarkdownRenderer'
import { resolveHitlRequest, dismissHitlRequest } from '@/lib/hitl'
import type { HitlRequest } from '@/types'
import type { Agent } from '@/types'

// ============================================================================
// HitlPrompt — inline HITL intervention in chat timeline
// ============================================================================

export interface HitlPromptProps {
  request: HitlRequest
  agent?: Agent | null
}

export const HitlPrompt = memo(({ request, agent }: HitlPromptProps) => {
  const { t } = useI18n()
  const [textResponse, setTextResponse] = useState('')
  const isPending = request.status === 'pending'
  const isAutoResolved = request.status === 'auto-resolved'

  const handleQuickReply = useCallback(
    (value: string) => {
      resolveHitlRequest(request.id, value)
    },
    [request.id],
  )

  const handleTextSubmit = useCallback(() => {
    if (textResponse.trim()) {
      resolveHitlRequest(request.id, textResponse.trim())
      setTextResponse('')
    }
  }, [request.id, textResponse])

  const handleDismiss = useCallback(() => {
    dismissHitlRequest(request.id)
  }, [request.id])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleTextSubmit()
      }
    },
    [handleTextSubmit],
  )

  const statusColor = {
    pending: 'warning',
    answered: 'success',
    dismissed: 'default',
    'auto-resolved': 'secondary',
  } as const

  const typeIcon = {
    approval: 'CheckCircle',
    clarification: 'HelpCircle',
    choice: 'List',
    confirmation: 'CheckSquare',
    feedback: 'MessageText',
  } as const

  return (
    <div className="flex gap-3 my-4" data-testid="hitl-prompt">
      {/* Agent avatar */}
      <div className="flex-shrink-0 mt-1">
        {agent ? (
          <AgentAvatar agent={agent} size="sm" />
        ) : (
          <div className="w-8 h-8 rounded-full bg-warning-100 flex items-center justify-center">
            <Icon name="WarningCircle" size="sm" className="text-warning-500" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          {agent && (
            <span className="text-sm font-medium text-default-700">
              {agent.name}
            </span>
          )}
          <Chip size="sm" color={statusColor[request.status]} variant="soft">
            {t(
              request.status === 'pending'
                ? 'Awaiting response'
                : request.status === 'answered'
                  ? 'Answered'
                  : request.status === 'auto-resolved'
                    ? 'Auto-resolved'
                    : 'Dismissed',
            )}
          </Chip>
          <Chip size="sm" variant="soft" color="warning">
            <Icon
              name={typeIcon[request.type] as any}
              size="sm"
              className="mr-1 inline"
            />
            {t(
              (request.type.charAt(0).toUpperCase() +
                request.type.slice(1)) as any,
            )}
          </Chip>
        </div>

        {/* Question */}
        <Alert
          color="warning"
          status="faded"
          icon={<Icon name="ChatBubbleQuestionSolid" />}
        >
          <MarkdownRenderer content={request.question} />
        </Alert>

        {/* Quick replies */}
        {isPending &&
          request.quickReplies &&
          request.quickReplies.length > 0 && (
            <div className="flex gap-2 flex-wrap mb-3">
              {request.quickReplies.map((reply) => (
                <Button
                  key={reply.value}
                  size="sm"
                  color={reply.color ?? 'default'}
                  variant="secondary"
                  onPress={() => handleQuickReply(reply.value)}
                >
                  {reply.label}
                </Button>
              ))}
            </div>
          )}

        {/* Text input for custom response */}
        {isPending && (
          <div className="flex gap-2">
            <TextArea
              size="sm"
              minRows={1}
              maxRows={4}
              placeholder={t('Type your response...')}
              value={textResponse}
              onChange={(e) => setTextResponse(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1"
            />
            <div className="flex flex-col gap-1">
              <Button
                size="sm"
                color="primary"
                isDisabled={!textResponse.trim()}
                onPress={handleTextSubmit}
              >
                {t('Send')}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                color="default"
                onPress={handleDismiss}
              >
                {t('Skip')}
              </Button>
            </div>
          </div>
        )}

        {/* Show response after answered */}
        {!isPending && request.response && (
          <div className="mt-2 p-2 bg-default-100 rounded-lg">
            <span className="text-xs text-default-500 mr-2">
              {isAutoResolved ? t('Auto-resolved') + ':' : t('Response') + ':'}
            </span>
            <span className="text-sm text-default-700">{request.response}</span>
          </div>
        )}
      </div>
    </div>
  )
})

HitlPrompt.displayName = 'HitlPrompt'
