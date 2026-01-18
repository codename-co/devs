export interface SectionProps {
  children?: React.ReactNode
  className?: string
  mainClassName?: string
  size?: 4 | 5 | 6 | 7
  style?: React.CSSProperties
}

export const Section = ({
  children,
  className = '',
  mainClassName = '',
  size = 4,
  style,
}: SectionProps) => {
  const sizeClasses: Record<number, string> = {
    4: 'max-w-4xl',
    5: 'max-w-5xl',
    6: 'max-w-6xl',
    7: 'max-w-7xl',
  }

  return (
    <section
      role="section"
      className={`w-full p-6 lg:px-8 overflow-hidden ${mainClassName}`.trim()}
      style={style}
    >
      <div
        className={`${sizeClasses[size] || 'max-w-4xl'} mx-auto my-6 space-y-6 gap-6 ${className}`.trim()}
      >
        {children}
      </div>
    </section>
  )
}

export default Section
