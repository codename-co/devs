import { Switch as HeroSwitch, type SwitchProps } from '@heroui/react'
import { cn } from '@/lib/utils'

/**
 * Switch component with default card-style classNames pre-applied.
 * Renders as a full-width row with label on the left and toggle on the right.
 * All HeroUI Switch props are forwarded; classNames are deeply merged.
 */
export function Switch({ classNames, ...props }: SwitchProps) {
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
      {...props}
    >
      <div className="flex flex-col gap-1">{props.children}</div>
    </HeroSwitch>
  )
}
