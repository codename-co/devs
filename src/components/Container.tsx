import { cn } from '@/lib/utils'

interface ContainerProps {
  children?: React.ReactNode
  className?: string
  style?: React.CSSProperties
}

export const Container = ({ children, className, style }: ContainerProps) => {
  return (
    <div
      className={cn('max-w-4xl my-6 space-y-6 gap-6 mx-auto', className)}
      {...{ style }}
    >
      {children}
    </div>
  )
}
