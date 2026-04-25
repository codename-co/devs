/**
 * BackgroundOrbit — ambient orbital dots for dark-background scenes.
 *
 * Renders 14 faintly-glowing dots orbiting at varying radii.
 */
export function BackgroundOrbit({
  t,
  cx = 640,
  cy = 540,
  radius = 180,
  radiusStep = 80,
  yScale = 0.9,
}: {
  t: number
  cx?: number
  cy?: number
  radius?: number
  radiusStep?: number
  yScale?: number
}) {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const base = (i / 14) * Math.PI * 2
    const ang = base + t * 0.25
    const r = radius + (i % 3) * radiusStep
    const x = cx + Math.cos(ang) * r
    const y = cy + Math.sin(ang) * r * yScale
    const size = 2 + (i % 3)
    return { x, y, size }
  })
  return (
    <svg
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.size}
          fill="oklch(72% 0.12 253 / 0.5)"
        />
      ))}
    </svg>
  )
}
