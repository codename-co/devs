import { cn } from '@/lib/utils'

interface SectionProps {
  children?: React.ReactNode
  className?: string
  mainClassName?: string
  size?: 4 | 5 | 6 | 7
  style?: React.CSSProperties
}

export const Section = ({
  children,
  className,
  mainClassName,
  size = 4,
  style,
}: SectionProps) => {
  return (
    <section
      role="section"
      className={cn('w-full p-6 lg:px-8 overflow-x-hidden', mainClassName)}
      {...{ style }}
    >
      <div
        className={cn(
          `max-w-${size}xl mx-auto my-6 space-y-6 gap-6`,
          className,
        )}
      >
        {children}
      </div>
    </section>
  )
}
