import { cn } from '@/lib/utils'

interface ContainerProps {
  children?: React.ReactNode
  className?: string
  size?: 4 | 5 | 6 | 7
  style?: React.CSSProperties
}

export const Container = ({
  children,
  className,
  size = 4,
  style,
}: ContainerProps) => {
  return (
    <div
      role="container"
      className={cn(`max-w-${size}xl my-6 space-y-6 gap-6 mx-auto`, className)}
      {...{ style }}
    >
      {children}
    </div>
  )
}
