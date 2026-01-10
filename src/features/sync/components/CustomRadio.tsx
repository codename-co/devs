/**
 * Custom Radio Component
 *
 * A styled Radio component with enhanced visual design for selection cards.
 */
import { Radio, RadioProps } from '@heroui/react'

import { cn } from '@/lib/utils'

export function CustomRadio(props: RadioProps) {
  const { children, size, ...otherProps } = props

  return (
    <Radio
      {...otherProps}
      size={size}
      classNames={{
        base: cn(
          'flex m-0 bg-content1 items-center justify-between',
          'flex-row-reverse cursor-pointer rounded-lg gap-4 border-2 border-transparent',
          'data-[selected=true]:border-primary',
          'w-full max-w-none',
          size === 'sm' ? 'p-2' : 'p-4',
        ),
      }}
    >
      {children}
    </Radio>
  )
}
