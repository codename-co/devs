/**
 * Sprite — time-scoped rendering primitive.
 *
 * Renders its children only while the Stage playhead is inside
 * [start, end] and provides them with localTime, progress, and
 * duration via SpriteContext.
 */
import type { ReactNode } from 'react'
import { SpriteContext, type SpriteRenderArgs, useTimeline } from './context'
import { clamp } from './easing'

interface SpriteProps {
  start?: number
  end?: number
  keepMounted?: boolean
  children: ReactNode | ((args: SpriteRenderArgs) => ReactNode)
}

export function Sprite({
  start = 0,
  end = Infinity,
  children,
  keepMounted = false,
}: SpriteProps) {
  const { time } = useTimeline()
  const visible = time >= start && time <= end
  if (!visible && !keepMounted) return null

  const duration = end - start
  const localTime = Math.max(0, time - start)
  const progress =
    duration > 0 && Number.isFinite(duration)
      ? clamp(localTime / duration, 0, 1)
      : 0

  const value: SpriteRenderArgs = { localTime, progress, duration, visible }

  return (
    <SpriteContext.Provider value={value}>
      {typeof children === 'function' ? children(value) : children}
    </SpriteContext.Provider>
  )
}
