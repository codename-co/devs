import type { ReactNode } from 'react'

interface PreviewStackProps {
  children: ReactNode[]
  className?: string
}

/**
 * Grid container that renders preview panels in equal-width columns.
 * Each column is capped at 640px. On mobile (< md), only the last child
 * (active preview) is rendered.
 */
export function PreviewStack({ children, className }: PreviewStackProps) {
  const items = children.filter(Boolean)

  if (items.length === 0) return null
  if (items.length === 1) return <>{items[0]}</>

  return (
    <div
      className={`grid h-full min-h-0 min-w-0 ${className ?? ''}`}
      style={{
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 640px))`,
      }}
    >
      {items.map((child, i) => (
        <div
          key={i}
          className={`min-h-0 min-w-0 ${i < items.length - 1 ? 'hidden md:block' : ''}`}
        >
          {child}
        </div>
      ))}
    </div>
  )
}
