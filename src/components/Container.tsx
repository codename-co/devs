import { forwardRef } from 'react'

export interface ContainerProps {
  children?: React.ReactNode
  className?: string
  size?: 4 | 5 | 6 | 7
  style?: React.CSSProperties
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(
  ({ children, className = '', size = 4, style }, ref) => {
    const sizeClasses: Record<number, string> = {
      4: 'max-w-4xl',
      5: 'max-w-5xl',
      6: 'max-w-6xl',
      7: 'max-w-7xl',
    }

    return (
      <div
        ref={ref}
        role="container"
        className={`${sizeClasses[size] || 'max-w-4xl'} my-6 space-y-6 gap-6 mx-auto ${className}`.trim()}
        style={style}
      >
        {children}
      </div>
    )
  },
)

Container.displayName = 'Container'

export default Container
