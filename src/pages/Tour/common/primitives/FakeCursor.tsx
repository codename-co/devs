/**
 * FakeCursor — a non-interactive pointer overlay used in video scenes
 * to simulate user interaction (moving, clicking).
 *
 * The cursor is an SVG pointer; a concentric ring pulses when
 * `clickProgress` is truthy (0 → 1 progress window).
 */
import { Icon } from '@/components'
import type { CSSProperties } from 'react'

export interface FakeCursorProps {
  /** X in stage pixels. */
  x: number
  /** Y in stage pixels. */
  y: number
  /** 0 → 1 visibility. Default: 1. */
  opacity?: number
  /** 0 → 1 click ripple progress. 0 = idle. */
  clickProgress?: number
  /** Scale multiplier. Default: 1. */
  scale?: number
}

export function FakeCursor({
  x,
  y,
  opacity = 1,
  clickProgress = 0,
  scale = 1,
}: FakeCursorProps) {
  const wrapperStyle: CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    transform: `translate(-4px, -2px) scale(${scale})`,
    transformOrigin: 'top left',
    opacity,
    pointerEvents: 'none',
    zIndex: 100,
    willChange: 'transform, opacity',
  }

  const rippleVisible = clickProgress > 0 && clickProgress < 1
  const rippleSize = 20 + clickProgress * 100
  const rippleOpacity = rippleVisible ? 1 - clickProgress : 0.5

  return (
    <div style={wrapperStyle}>
      {rippleVisible && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: rippleSize,
            height: rippleSize,
            transform: `translate(${-rippleSize / 2 + 4}px, ${-rippleSize / 2 + 2}px)`,
            border: '2px solid oklch(60% 0.18 253)',
            borderRadius: '9999px',
            opacity: rippleOpacity,
            boxShadow: '0 0 12px oklch(60% 0.18 253 / 0.5)',
          }}
        />
      )}

      <Icon
        name="CursorPointer"
        size="3xl"
        className="absolute -m-2 text-white fill-black drop-shadow-lg"
      />
    </div>
  )
}
