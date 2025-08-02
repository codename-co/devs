import { cn } from '@/lib/utils'

export interface SectionProps {
  children: React.ReactNode
  className?: string
  mainClassName?: string
  style?: React.CSSProperties
}

export const Section = ({
  children,
  className,
  mainClassName,
  style,
}: SectionProps) => {
  return (
    <section
      className={cn('w-full py-6 px-4 lg:px-8', mainClassName)}
      {...{ style }}
    >
      <div className={cn('max-w-6xl mx-auto my-6 space-y-6 gap-6', className)}>
        {children}
      </div>
    </section>
  )
}
