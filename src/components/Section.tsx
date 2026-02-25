import { forwardRef } from 'react'

export interface SectionProps {
  children?: React.ReactNode
  className?: string
  mainClassName?: string
  size?: 2 | 3 | 4 | 5 | 6 | 7
  style?: React.CSSProperties
}

export const Section = forwardRef<HTMLElement, SectionProps>(
  ({ children, className = '', mainClassName = '', size = 4, style }, ref) => {
    const sizeClasses: Record<number, string> = {
      2: 'max-w-2xl',
      3: 'max-w-3xl',
      4: 'max-w-4xl',
      5: 'max-w-5xl',
      6: 'max-w-6xl',
      7: 'max-w-7xl',
    }

    return (
      <section
        ref={ref}
        role="section"
        className={`w-full px-4 lg:px-8 [@media(min-height:800px)]:py-6 overflow-hidden transition-all
           ${mainClassName}`.trim()}
        style={style}
      >
        <div
          className={`${sizeClasses[size] || 'max-w-4xl'} folded-landscape:max-w-none mx-auto my-6 space-y-6 gap-6 ${className}`.trim()}
        >
          {children}
        </div>
      </section>
    )
  },
)

Section.displayName = 'Section'

export default Section
