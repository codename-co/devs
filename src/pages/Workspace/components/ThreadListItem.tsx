import { memo } from 'react'
import { AgentAvatar, Icon } from '@/components'
import {
  formatRelativeTime,
  stripMarkdown,
  truncate,
} from '../lib/thread-utils'
import { useThreadTagMap } from '../hooks/useThreadTags'
import type { Thread } from '../types'

interface ThreadListItemProps {
  thread: Thread
  onToggleStar?: (id: string) => void
  onToggleRead?: (id: string) => void
}

export const ThreadListItem = memo(function ThreadListItem({
  thread,
}: ThreadListItemProps) {
  const agent = thread.agent
  const tagMap = useThreadTagMap()

  return (
    <>
      {agent ? (
        <AgentAvatar agent={agent} size="md" />
      ) : (
        <div className="bg-default-200 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
          <Icon name="User" className="h-4 w-4" />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Row 1: agent name + time + unread dot */}
        <div className="flex items-center gap-2">
          <span
            className={`min-w-0 flex-1 truncate text-sm leading-tight ${
              thread.unread
                ? 'text-foreground font-semibold'
                : 'text-foreground'
            }`}
          >
            {thread.kind === 'media'
              ? 'Studio'
              : (agent?.name ?? 'Unknown agent')}
          </span>
          <span
            className={`shrink-0 whitespace-nowrap text-xs leading-tight ${
              thread.unread ? 'text-foreground font-medium' : 'text-muted'
            }`}
          >
            {formatRelativeTime(thread.updatedAt)}
          </span>
          {thread.unread && (
            <span className="bg-accent size-1.5 shrink-0 rounded-full" />
          )}
        </div>

        {/* Row 2: title */}
        <span
          className={`truncate text-xs leading-tight ${
            thread.unread ? 'text-foreground font-medium' : 'text-muted'
          }`}
        >
          {thread.title}
        </span>

        {/* Row 3: snippet + tag badges + inline badges */}
        <div className="flex items-center gap-1.5">
          <span className="text-muted min-w-0 flex-1 truncate text-xs leading-tight">
            {truncate(stripMarkdown(thread.snippet), 80)}
          </span>
          {thread.tags.slice(0, 3).map((tagId) => {
            const tag = tagMap.get(tagId)
            if (!tag) return null
            const dotColor =
              tag.color === 'accent'
                ? 'bg-accent'
                : tag.color === 'success'
                  ? 'bg-success'
                  : tag.color === 'warning'
                    ? 'bg-warning'
                    : tag.color === 'danger'
                      ? 'bg-danger'
                      : 'bg-default-400'
            return (
              <span
                key={tagId}
                title={tag.name}
                className={`size-2 shrink-0 rounded-full ${dotColor}`}
              />
            )
          })}
          {thread.artifacts.length > 0 && (
            <Icon size="sm" name="Attachment" className="shrink-0 text-muted" />
          )}
          {thread.kind === 'task' && (
            <Icon
              size="sm"
              name="PcCheck"
              className="shrink-0 text-secondary-500"
            />
          )}
          {thread.kind === 'media' && (
            <Icon
              size="sm"
              name="MediaImage"
              className="shrink-0 text-danger-500"
            />
          )}
          {thread.starColor && (
            <Icon
              name="StarSolid"
              size="xs"
              className="shrink-0 text-warning-500"
            />
          )}
        </div>
      </div>
    </>
  )
})
