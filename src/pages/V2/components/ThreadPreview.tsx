import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Chip,
  DisclosureGroup,
  Dropdown,
  Kbd,
  Label,
  ScrollShadow,
  Tooltip,
} from '@heroui/react_3'
import { AgentAvatar, Icon, MarkdownRenderer, PromptArea } from '@/components'
import { MessageBubble } from '@/components/chat'
import { useI18n } from '@/i18n'
import { formatNumber } from '@/lib/number'
import { useAgents } from '@/stores/agentStore'
import { useMinWidth } from '@/hooks/useMinWidth'
import type { Message } from '@/types'
import type { Artifact } from '@/types'
import type { Thread } from '../types'
import { SystemPromptDisclosure } from './SystemPromptDisclosure'
import { ThreadMessage } from './ThreadMessage'
import { ThreadAttachments } from './ThreadAttachments'
import { TaskDetailsSection } from './TaskDetailsSection'
import { SessionPreviewContent } from './SessionPreviewContent'
import { TranscriptView } from './TranscriptView'
import { TagPicker } from './TagPicker'

export type PreviewMode = 'email' | 'feed' | 'custom' | 'transcript'

interface ThreadPreviewProps {
  thread: Thread | undefined
  pagination?: { current: number; total: number }
  goToPrevious?: () => void
  goToNext?: () => void
  onDeselect: () => void
  isStarred: boolean
  onToggleStar: () => void
  onReply: (content: string) => void
  isReplying?: boolean
  replyPrompt?: string
  onReplyPromptChange?: (value: string) => void
  className?: string
  onSelectArtifact?: (artifact: Artifact) => void
  mode?: PreviewMode
  renderCustomContent?: (thread: Thread) => React.ReactNode
  /** Called when the preview is displayed for a thread (to mark it as read) */
  onMarkRead?: (id: string) => void
  /** Whether this preview is pinned/sticky */
  isPinned?: boolean
  /** Whether this is the active preview in a multi-preview stack */
  isActive?: boolean
  /** Close this specific preview (remove from stack) */
  onClose?: () => void
  /** Toggle pin state */
  onTogglePin?: () => void
  /** Toggle between feed and transcript mode */
  onToggleTranscript?: () => void
  /** Star color for the thread */
  starColor?: string | null
}

export const ThreadPreview = memo(function ThreadPreview({
  thread,
  pagination,
  goToPrevious,
  goToNext,
  onDeselect,
  isStarred,
  onToggleStar,
  onReply,
  isReplying,
  replyPrompt,
  onReplyPromptChange,
  className,
  onSelectArtifact,
  mode = 'email',
  renderCustomContent,
  isPinned,
  isActive = true,
  onClose,
  onTogglePin,
  onToggleTranscript,
  onMarkRead,
}: ThreadPreviewProps) {
  const { lang, t } = useI18n()
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showSource, setShowSource] = useState(false)
  const [showEnvelope, setShowEnvelope] = useState(false)
  const isHD = useMinWidth(1280)

  const toggleFullscreen = useCallback(() => setIsFullscreen((v) => !v), [])

  const agents = useAgents()
  const agentMap = useMemo(() => {
    const m = new Map<string, (typeof agents)[0]>()
    for (const a of agents) m.set(a.id, a)
    return m
  }, [agents])

  // Mark the thread as read when it is displayed in the preview
  useEffect(() => {
    if (thread?.id) onMarkRead?.(thread.id)
  }, [thread?.id, onMarkRead])

  // Empty state
  if (!thread) {
    return (
      <div
        className={`h-full flex-1 items-center justify-center ${className ?? 'flex'}`}
      >
        <div className="text-muted flex flex-col items-center gap-3">
          <Icon name="MultiBubble" size="2xl" className="opacity-30" />
          <p className="text-sm">Select a thread to preview</p>
          <div className="flex items-center gap-2 text-xs">
            <Kbd>j</Kbd>/<Kbd>k</Kbd> to navigate
          </div>
        </div>
      </div>
    )
  }

  const containerClass = isFullscreen
    ? 'fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex flex-col p-4 v2-fullscreen-enter'
    : `h-full min-h-0 min-w-0 flex-col py-4 pl-0.5 pr-4 ${className ?? 'flex'}`

  return (
    <div className={containerClass}>
      <div className={`bg-surface flex min-h-0 max-h-full flex-1 flex-col overflow-hidden rounded-2xl shadow-sm ${isPinned ? 'outline-2 outline-primary outline-offset-2' : ''}`}>
        {/* Toolbar */}
        <div className="flex shrink-0 flex-col gap-4 p-4 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ToolbarBtn
                icon="Xmark"
                onClick={onClose ?? onDeselect}
                tooltip="Close (Esc)"
              />
              <ToolbarBtn
                icon={isFullscreen ? 'Collapse' : 'Expand'}
                onClick={toggleFullscreen}
                tooltip={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
              />
              {onTogglePin && isHD && (
                <ToolbarBtn
                  icon={isPinned ? 'PinSolid' : 'Pin'}
                  onClick={onTogglePin}
                  tooltip={isPinned ? 'Unpin' : 'Pin'}
                />
              )}
              <ToolbarBtn
                icon={isStarred ? 'StarSolid' : 'Star'}
                onClick={onToggleStar}
                tooltip={isStarred ? 'Unstar' : 'Star'}
                className={isStarred ? 'text-warning-500' : undefined}
              />
              {onToggleTranscript && (
                <ToolbarBtn
                  icon={mode === 'transcript' ? 'ChatLines' : 'Activity'}
                  onClick={onToggleTranscript}
                  tooltip={mode === 'transcript' ? 'Chat view' : 'Transcript'}
                />
              )}

              {/* More actions dropdown */}
              <Dropdown>
                <Dropdown.Trigger>
                  <Button
                    isIconOnly
                    size="sm"
                    variant="ghost"
                    className="text-muted hover:text-foreground"
                    aria-label="More actions"
                  >
                    <Icon name="MoreVert" />
                  </Button>
                </Dropdown.Trigger>
                <Dropdown.Popover placement="bottom start">
                  <Dropdown.Menu
                    onAction={(key) => {
                      if (key === 'source') setShowSource((v) => !v)
                      if (key === 'envelope') setShowEnvelope((v) => !v)
                    }}
                  >
                    <Dropdown.Item id="source" textValue="Source">
                      <Icon name="Code" />
                      <Label>{t('Source')}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item id="envelope" textValue="Conversation">
                      <Icon name="ChatLines" />
                      <Label>{t('Conversation')}</Label>
                    </Dropdown.Item>
                    <Dropdown.Item
                      id="delete"
                      textValue="Delete"
                      variant="danger"
                    >
                      <Icon name="Trash" />
                      <Label>{t('Delete')}</Label>
                    </Dropdown.Item>
                  </Dropdown.Menu>
                </Dropdown.Popover>
              </Dropdown>
            </div>

            <div className="flex items-center gap-3">
              {/* Pagination — only shown for active preview */}
              {isActive && pagination && goToPrevious && goToNext && (
                <>
                  <span className="text-muted text-xs tabular-nums">
                    {pagination.current} of{' '}
                    {formatNumber(pagination.total, lang)}
                  </span>
                  <div className="flex items-center gap-0.5">
                    <ToolbarBtn
                      icon="ArrowLeft"
                      onClick={goToPrevious}
                      disabled={pagination.current <= 1}
                      tooltip={
                        <>
                          Previous <Kbd>j</Kbd>
                        </>
                      }
                    />
                    <ToolbarBtn
                      icon="ArrowRight"
                      onClick={goToNext}
                      disabled={pagination.current >= pagination.total}
                      tooltip={
                        <>
                          Next <Kbd>k</Kbd>
                        </>
                      }
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Thread header — single line */}
          <div className="flex items-center gap-2 px-4">
            {thread.agent && <AgentAvatar agent={thread.agent} size="sm" />}

            <h1 className="text-foreground min-w-0 flex-1 truncate text-sm font-medium">
              {thread.title}
            </h1>

            {thread.kind === 'task' && (
              <Chip
                size="sm"
                variant="soft"
                color={
                  thread.source.task?.status === 'completed'
                    ? 'success'
                    : thread.source.task?.status === 'in_progress'
                      ? 'accent'
                      : 'default'
                }
              >
                {thread.source.task?.status?.replace('_', ' ') ?? 'Task'}
              </Chip>
            )}
            {thread.kind === 'session' && (
              <Chip
                size="sm"
                variant="soft"
                color={
                  thread.source.session?.status === 'completed'
                    ? 'success'
                    : thread.source.session?.status === 'running' ||
                        thread.source.session?.status === 'starting'
                      ? 'accent'
                      : thread.source.session?.status === 'failed'
                        ? 'danger'
                        : 'default'
                }
              >
                {thread.source.session?.status ?? 'Session'}
              </Chip>
            )}

            {/* Tags — macOS-style inline color dots */}
            <TagPicker threadId={thread.id} threadTagIds={thread.tags} />

            {/* Participants — inline, pushed right */}
            {thread.participants.length > 1 && (
              <div className="flex items-center gap-1 ml-auto shrink-0">
                <div className="flex -space-x-1.5">
                  {thread.participants.slice(0, 3).map((p) => (
                    <Tooltip key={p.id} delay={0}>
                      <AgentAvatar
                        agent={p}
                        size="sm"
                        avatarClassName="ring-2 ring-surface"
                      />
                      <Tooltip.Content>
                        <p>{p.name}</p>
                      </Tooltip.Content>
                    </Tooltip>
                  ))}
                </div>
                {thread.participants.length > 3 && (
                  <span className="text-muted text-xs">
                    +{thread.participants.length - 3}
                  </span>
                )}
              </div>
            )}
          </div>
          {/* End toolbar/header wrapper */}
        </div>

        {/* Content area — transcript mode uses its own layout */}
        {mode === 'transcript' ? (
          <div className="min-h-0 flex-1">
            <TranscriptView thread={thread} />
          </div>
        ) : (
          <ScrollShadow
            hideScrollBar
            size={32}
            className="min-h-0 flex-1 overflow-y-auto px-5"
          >
            <div className="flex flex-col pb-6">
              {/* Task requirements & steps */}
              {thread.kind === 'task' && thread.source.task && (
                <TaskDetailsSection
                  task={thread.source.task}
                  agentMap={agentMap}
                />
              )}

              {/* Session-specific rendering with execution support */}
              {thread.kind === 'session' ? (
                <SessionPreviewContent thread={thread} />
              ) : mode === 'custom' && renderCustomContent ? (
                renderCustomContent(thread)
              ) : mode === 'feed' ? (
                thread.messages.length > 0 ? (
                  <div className="flex flex-col gap-4">
                    {thread.messages.map((msg, idx) => {
                      // First message with role "system" → collapsible prompt
                      if (idx === 0 && msg.role === 'system') {
                        return (
                          <SystemPromptDisclosure
                            key={msg.id}
                            content={msg.content}
                          />
                        )
                      }

                      const bubbleMessage: Message = {
                        id: msg.id,
                        role: msg.role,
                        content: msg.content,
                        timestamp: msg.timestamp,
                        agentId: msg.agent?.id,
                        steps: msg.steps,
                        traceIds: msg.traceIds,
                      }
                      return (
                        <MessageBubble
                          key={msg.id}
                          message={bubbleMessage}
                          agent={msg.agent}
                          showAgentChip={msg.role === 'assistant'}
                          size="sm"
                        />
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-foreground text-sm leading-relaxed">
                    <MarkdownRenderer
                      content={
                        thread.source.task?.description ??
                        thread.snippet ??
                        'No content'
                      }
                    />
                  </div>
                )
              ) : thread.messages.length > 0 ? (
                <DisclosureGroup
                  allowsMultipleExpanded
                  defaultExpandedKeys={[
                    thread.messages[thread.messages.length - 1]?.id,
                  ]}
                >
                  {thread.messages.map((msg, idx) => {
                    if (idx === 0 && msg.role === 'system') {
                      return (
                        <SystemPromptDisclosure
                          key={msg.id}
                          content={msg.content}
                        />
                      )
                    }
                    return (
                      <ThreadMessage
                        key={msg.id}
                        message={msg}
                        isLast={idx === thread.messages.length - 1}
                        defaultExpanded={idx === thread.messages.length - 1}
                      />
                    )
                  })}
                </DisclosureGroup>
              ) : (
                <div className="text-foreground text-sm leading-relaxed">
                  <MarkdownRenderer
                    content={
                      thread.source.task?.description ??
                      thread.snippet ??
                      'No content'
                    }
                  />
                </div>
              )}

              {/* Artifacts */}
              {thread.artifacts.length > 0 && (
                <div className="mt-6">
                  <ThreadAttachments
                    artifacts={thread.artifacts}
                    onSelectArtifact={onSelectArtifact}
                  />
                </div>
              )}
            </div>
          </ScrollShadow>
        )}

        {/* Source panel */}
        {showSource && (
          <div className="border-divider bg-background mx-2 flex max-h-[50%] min-h-0 flex-col rounded-xl border">
            <div className="border-divider flex items-center justify-between border-b px-3 py-2">
              <span className="text-muted text-xs font-medium uppercase tracking-wide">
                Source
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-foreground"
                onPress={() => setShowSource(false)}
              >
                <Icon name="Xmark" />
              </Button>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs leading-relaxed whitespace-pre-wrap break-all font-mono">
              {JSON.stringify(
                {
                  id: thread.id,
                  kind: thread.kind,
                  title: thread.title,
                  updatedAt: thread.updatedAt,
                  starColor: thread.starColor,
                  unread: thread.unread,
                  participants: thread.participants.map((p) => ({
                    id: p.id,
                    name: p.name,
                    role: p.role,
                  })),
                  messages: thread.messages,
                  artifacts: thread.artifacts,
                  source: thread.source,
                },
                null,
                2,
              )}
            </pre>
          </div>
        )}

        {/* Conversation envelope panel — LLM messages format */}
        {showEnvelope && (
          <div className="border-divider bg-background mx-2 flex max-h-[50%] min-h-0 flex-col rounded-xl border">
            <div className="border-divider flex items-center justify-between border-b px-3 py-2">
              <span className="text-muted text-xs font-medium uppercase tracking-wide">
                Conversation Envelope
              </span>
              <Button
                isIconOnly
                size="sm"
                variant="ghost"
                className="text-muted hover:text-foreground"
                onPress={() => setShowEnvelope(false)}
              >
                <Icon name="Xmark" />
              </Button>
            </div>
            <pre className="flex-1 overflow-auto p-3 text-xs leading-relaxed whitespace-pre-wrap break-all font-mono">
              {JSON.stringify(
                thread.messages.map((msg) => ({
                  role: msg.role,
                  content: msg.content,
                })),
                null,
                2,
              )}
            </pre>
          </div>
        )}

        {/* Reply area — sticky at the bottom, always visible */}
        {/* {isActive && ( */}
        <div className="shrink-0 p-4 pt-2">
          <PromptArea
            lang={lang}
            className="!max-w-full"
            placeholder={t('Continue the conversation…')}
            isSending={isReplying}
            value={replyPrompt}
            {...(thread.agent && { selectedAgent: thread.agent })}
            onValueChange={onReplyPromptChange}
            onSubmitToAgent={(cleanedPrompt) => {
              if (cleanedPrompt?.trim()) onReply(cleanedPrompt)
            }}
            disabledAgentPicker
            disabledMention
          />
        </div>
        {/* )} */}
      </div>
    </div>
  )
})

/** Small icon-only toolbar button with optional tooltip */
function ToolbarBtn({
  icon,
  onClick,
  disabled,
  tooltip,
  className,
}: {
  icon: string
  onClick?: () => void
  disabled?: boolean
  tooltip?: React.ReactNode
  className?: string
}) {
  const btn = (
    <Button
      isIconOnly
      size="sm"
      variant="ghost"
      className={className ?? 'text-muted hover:text-foreground'}
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
