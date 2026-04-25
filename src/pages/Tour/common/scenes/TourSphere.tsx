/**
 * TourSphere — a sized, tinted, glowing DEVS icon for dark-background scenes.
 *
 * Uses the real `<DevsIcon />` SVG internally, styled via wrapper props.
 */
import type { CSSProperties } from 'react'
import { DevsIcon } from '@/components/DevsIcon'

export interface TourSphereProps {
  size: number
  color: string
  intensity?: number
}

export function TourSphere({ size, color, intensity = 1 }: TourSphereProps) {
  const glow = `drop-shadow(0 0 ${32 * intensity}px ${color}) drop-shadow(0 0 ${
    96 * intensity
  }px ${color})`
  const style: CSSProperties = {
    width: size,
    height: size,
    color,
    filter: glow,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div style={style}>
      <DevsIcon className="w-full h-full fill-white" />
    </div>
  )
}
