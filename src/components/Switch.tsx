import { type ReactNode } from 'react'
import { Switch as HeroSwitch, type SwitchProps } from '@/components/heroui-compat'
import { cn } from '@/lib/utils'

interface ExtendedSwitchProps extends SwitchProps {
  classNames?: Record<string, string>
  onValueChange?: (isSelected: boolean) => void
  isSelected?: boolean
  /** Content rendered before the children (e.g. an icon). */
  startContent?: ReactNode
  /** Content rendered after the children (e.g. a status badge). */
  endContent?: ReactNode
  [key: string]: unknown
}

/**
 * Switch component with default card-style classNames pre-applied.
 * Renders as a full-width row with label on the left and toggle on the right.
 * `startContent` / `endContent` appear at the horizontal edges of the label area.
 * All HeroUI Switch props are forwarded; classNames are deeply merged.
 */
export function Switch({
  classNames,
  startContent,
  endContent,
  ...props
}: ExtendedSwitchProps) {
  return (
    <HeroSwitch
      size="sm"
      classNames={{
        ...classNames,
        base: cn(
          'flex flex-row-reverse w-full max-w-xl bg-content1 hover:bg-content2 items-center',
          'justify-between cursor-pointer rounded-lg gap-2 p-4 border-2 border-transparent',
          classNames?.base,
        ),
      }}
      {...props as any}
    >
      <div className="flex items-center gap-3 w-full">
        {startContent}
        <div className="flex flex-col gap-1 flex-1 min-w-0">
          {props.children as React.ReactNode}
        </div>
        {endContent}
      </div>
    </HeroSwitch>
  )
}
