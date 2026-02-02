/**
 * PageMenuButton Component
 *
 * Shared trigger button style for PageMenu items.
 * Provides consistent appearance for menu trigger buttons.
 */
import { Button, Tooltip, Kbd, PopoverTrigger } from '@heroui/react'
import { ReactNode, forwardRef } from 'react'

import { Icon } from './Icon'
import { IconName } from '@/lib/types'

export interface PageMenuButtonProps {
  /** Icon name to display */
  icon: IconName
  /** Tooltip text */
  tooltip: string | ReactNode
  /** Aria label for accessibility */
  ariaLabel: string
  /** Whether the button is in an active/enabled state */
  isActive?: boolean
  /** Whether to show a loading spinner on the icon */
  isLoading?: boolean
  /** Optional badge indicator (shows a pulsing dot) */
  showBadge?: boolean
  /** Whether the badge should animate (pulse). Defaults to true when showBadge is true */
  badgePulsing?: boolean
  /** Whether the tooltip should be disabled */
  tooltipDisabled?: boolean
  /** Optional keyboard shortcut to display in tooltip */
  shortcutKeys?: ('command' | 'ctrl' | 'shift' | 'alt' | 'option')[]
  /** Optional shortcut key letter */
  shortcutKey?: string
}

/**
 * Shared button component for PageMenu trigger buttons.
 * Uses forwardRef to work with PopoverTrigger.
 */
export const PageMenuButton = forwardRef<
  HTMLButtonElement,
  PageMenuButtonProps
>(
  (
    {
      icon,
      tooltip,
      ariaLabel,
      isActive,
      isLoading,
      showBadge,
      badgePulsing = true,
      tooltipDisabled,
      shortcutKeys,
      shortcutKey,
    },
    ref,
  ) => {
    const tooltipContent =
      shortcutKeys && shortcutKey ? (
        <span className="flex items-center gap-2">
          {tooltip}
          <Kbd keys={shortcutKeys}>{shortcutKey}</Kbd>
        </span>
      ) : (
        tooltip
      )

    return (
      <Tooltip content={tooltipContent} isDisabled={tooltipDisabled}>
        <span className="inline-flex">
          <PopoverTrigger>
            <Button ref={ref} aria-label={ariaLabel}>
              <Icon
                name={icon}
                className={
                  'size-4 lg:size-5 ' +
                  (isLoading ? 'animate-spin' : isActive ? 'animate-pulse' : '')
                }
              />
              {showBadge && (
                <span className="absolute top-1 end-1 flex h-2.5 w-2.5">
                  {badgePulsing && (
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-400 opacity-75" />
                  )}
                  <span className="flex rounded-full h-2.5 w-2.5 bg-success-500" />
                </span>
              )}
            </Button>
          </PopoverTrigger>
        </span>
      </Tooltip>
    )
  },
)

PageMenuButton.displayName = 'PageMenuButton'
