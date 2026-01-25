/**
 * PageMenuPanel Component
 *
 * Shared panel layout for PageMenu popover content.
 * Provides consistent structure: title, actions, status chip, description, and content.
 */
import { Chip, ChipProps, Tooltip } from '@heroui/react'
import { ReactNode } from 'react'

export interface PageMenuPanelStatus {
  /** Status text to display in the chip */
  text: string
  /** Chip color variant */
  color?: ChipProps['color']
  /** Optional tooltip content for the status chip */
  tooltip?: string
  /** Optional close/disconnect action */
  onClose?: () => void
  /** Aria label for close button */
  closeLabel?: string
}

export interface PageMenuPanelProps {
  /** Panel title displayed at top left */
  title: string | ReactNode
  /** Action items displayed on the right, before the status chip */
  actions?: ReactNode
  /** Status chip configuration with optional close action */
  status?: PageMenuPanelStatus
  /** Optional description text below the header */
  description?: string | ReactNode
  /** Panel content */
  children: ReactNode
}

/**
 * Shared panel component for PageMenu popovers.
 * Provides consistent layout with title, actions, status, description, and content area.
 */
export function PageMenuPanel({
  title,
  actions,
  status,
  description,
  children,
}: PageMenuPanelProps) {
  return (
    <div className="flex flex-col gap-3 p-3 max-w-80">
      {/* Header row: title left, actions + status right */}
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{title}</span>
        <div className="flex items-center gap-1">
          {/* Action items */}
          {actions}
          {/* Status chip */}
          {status && (
            <Tooltip content={status.tooltip} isDisabled={!status.tooltip}>
              <Chip
                size="sm"
                variant="flat"
                color={status.color || 'default'}
                onClose={status.onClose}
              >
                {status.text}
              </Chip>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Optional description */}
      {description && <p className="text-sm text-default-500">{description}</p>}

      {/* Content */}
      {children}
    </div>
  )
}
