import { memo, useEffect, useMemo, useRef } from 'react'

// ─── CSS Color → Hue Helper ────────────────────────────────────

const DEFAULT_HUE = 250

/** Parse a CSS color (hex or rgb()) and return its HSL hue (0–360). */
function parseHueFromCssColor(color: string): number {
  let r = 0,
    g = 0,
    b = 0
  if (color.startsWith('#')) {
    const hex =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color
    r = parseInt(hex.slice(1, 3), 16) / 255
    g = parseInt(hex.slice(3, 5), 16) / 255
    b = parseInt(hex.slice(5, 7), 16) / 255
  } else {
    const match = color.match(/(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/)
    if (!match) return DEFAULT_HUE
    r = parseInt(match[1], 10) / 255
    g = parseInt(match[2], 10) / 255
    b = parseInt(match[3], 10) / 255
  }
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  let h = 0
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
  else if (max === g) h = ((b - r) / d + 2) / 6
  else h = ((r - g) / d + 4) / 6
  return Math.round(h * 360)
}

/** Read --devs-primary from the document root and return its hue. */
function usePrimaryHue(): number {
  return useMemo(() => {
    if (typeof document === 'undefined') return DEFAULT_HUE
    const raw = getComputedStyle(document.documentElement)
      .getPropertyValue('--devs-primary')
      .trim()
    if (!raw) return DEFAULT_HUE
    return parseHueFromCssColor(raw)
  }, [])
}

// ─── 3D Math Helpers ───────────────────────────────────────────

type Vec3 = [number, number, number]

function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a)
  return [v[0] * c + v[2] * s, v[1], -v[0] * s + v[2] * c]
}

function rotateX(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a),
    s = Math.sin(a)
  return [v[0], v[1] * c - v[2] * s, v[1] * s + v[2] * c]
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ]
}

function sub(a: Vec3, b: Vec3): Vec3 {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function normalize(v: Vec3): Vec3 {
  const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2])
  return len === 0 ? [0, 0, 0] : [v[0] / len, v[1] / len, v[2] / len]
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
}

// ─── Icosahedron Geometry ──────────────────────────────────────

const PHI = (1 + Math.sqrt(5)) / 2

// 12 vertices of a unit icosahedron
const RAW_VERTICES: Vec3[] = [
  [-1, PHI, 0],
  [1, PHI, 0],
  [-1, -PHI, 0],
  [1, -PHI, 0],
  [0, -1, PHI],
  [0, 1, PHI],
  [0, -1, -PHI],
  [0, 1, -PHI],
  [PHI, 0, -1],
  [PHI, 0, 1],
  [-PHI, 0, -1],
  [-PHI, 0, 1],
]

// Normalize to unit sphere
const VERTICES: Vec3[] = RAW_VERTICES.map(normalize)

// 20 triangular faces (vertex indices, wound CCW from outside)
const FACES: [number, number, number][] = [
  [0, 11, 5],
  [0, 5, 1],
  [0, 1, 7],
  [0, 7, 10],
  [0, 10, 11],
  [1, 5, 9],
  [5, 11, 4],
  [11, 10, 2],
  [10, 7, 6],
  [7, 1, 8],
  [3, 9, 4],
  [3, 4, 2],
  [3, 2, 6],
  [3, 6, 8],
  [3, 8, 9],
  [4, 9, 5],
  [2, 4, 11],
  [6, 2, 10],
  [8, 6, 7],
  [9, 8, 1],
]

// ─── Shared Face Computation ───────────────────────────────────

const DEFAULT_LIGHT_DIR: Vec3 = normalize([0.5, 1, 0.8])

interface FaceData {
  ax: number
  ay: number
  bx: number
  by: number
  cx: number
  cy: number
  fill: string
  avgZ: number
}

function computeFaces(
  rx: number,
  ry: number,
  scale: number,
  halfSize: number,
  hue: number,
  lightDir: Vec3,
): FaceData[] {
  const rotated = VERTICES.map((v) => rotateX(rotateY(v, ry), rx))
  const projected = rotated.map((r) => ({
    x: r[0] * scale + halfSize,
    y: -r[1] * scale + halfSize,
    z: r[2],
  }))

  return FACES.map(([a, b, c]) => {
    const pa = projected[a],
      pb = projected[b],
      pc = projected[c]
    const avgZ = (pa.z + pb.z + pc.z) / 3

    const normal = normalize(
      cross(sub(rotated[b], rotated[a]), sub(rotated[c], rotated[a])),
    )
    const diffuse = Math.max(0, dot(normal, lightDir))
    const ambient = 0.45
    const brightness = ambient + (1 - ambient) * diffuse
    const sat = 55 + diffuse * 30
    const lum = 45 + brightness * 55

    return {
      ax: pa.x,
      ay: pa.y,
      bx: pb.x,
      by: pb.y,
      cx: pc.x,
      cy: pc.y,
      fill: `hsl(${hue + avgZ * 15}, ${sat}%, ${lum}%)`,
      avgZ,
    }
  }).sort((a, b) => a.avgZ - b.avgZ)
}

// ─── Canvas Renderer (animated) ────────────────────────────────
// Uses <canvas> so the rAF loop never touches the DOM tree,
// which eliminates Chrome DevTools observer overhead.

function drawFaces(
  ctx: CanvasRenderingContext2D,
  faces: FaceData[],
  dpr: number,
) {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  for (let i = 0; i < faces.length; i++) {
    const f = faces[i]
    ctx.beginPath()
    ctx.moveTo(f.ax, f.ay)
    ctx.lineTo(f.bx, f.by)
    ctx.lineTo(f.cx, f.cy)
    ctx.closePath()
    ctx.fillStyle = f.fill
    ctx.fill()
  }
}

// ─── Icosahedron Component ─────────────────────────────────────

interface Icosahedron3DProps {
  /** Pixel size */
  size?: number
  /** Rotation speed (radians per frame), 0 to disable */
  rotationSpeed?: number
  /** Initial Y rotation in radians */
  initialRotY?: number
  /** Initial X rotation in radians */
  initialRotX?: number
  /** Base hue for the gem palette (0–360) */
  hue?: number
  /** Light direction (normalized) */
  lightDir?: Vec3
  /** Show wireframe edges */
  edges?: boolean
  /** Edge stroke color */
  edgeColor?: string
  /** Edge stroke width */
  edgeWidth?: number
  /** CSS className */
  className?: string
  /** Whether the icon is animated (rotates) */
  animate?: boolean
}

function Icosahedron3D({
  size = 64,
  rotationSpeed = 0.008,
  initialRotY = 3.2,
  initialRotX = 4.1,
  hue = 250,
  lightDir = DEFAULT_LIGHT_DIR,
  edges = false,
  edgeColor = 'rgba(255,255,255,0.15)',
  edgeWidth = 0.5,
  className,
  animate = false,
}: Icosahedron3DProps) {
  const scale = size * 0.5
  const halfSize = size / 2

  // ── Animated path: Canvas (no DOM mutations per frame) ──
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const angleRef = useRef({ x: initialRotX, y: initialRotY })

  useEffect(() => {
    if (!animate) return

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr

    const tick = () => {
      angleRef.current.y += rotationSpeed
      angleRef.current.x += rotationSpeed * 0.3

      const faces = computeFaces(
        angleRef.current.x,
        angleRef.current.y,
        scale,
        halfSize,
        hue,
        lightDir,
      )
      drawFaces(ctx, faces, dpr)

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafRef.current)
  }, [animate, rotationSpeed, size, scale, halfSize, hue, lightDir])

  // ── Static path: SVG (crisp, no animation overhead) ──
  const initialFaces = useMemo(
    () =>
      computeFaces(initialRotX, initialRotY, scale, halfSize, hue, lightDir),
    [initialRotX, initialRotY, scale, halfSize, hue, lightDir],
  )

  if (animate) {
    return (
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className={className}
      />
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {initialFaces.map((face, i) => (
        <polygon
          key={i}
          points={`${face.ax},${face.ay} ${face.bx},${face.by} ${face.cx},${face.cy}`}
          fill={face.fill}
          stroke={edges ? edgeColor : 'none'}
          strokeWidth={edges ? edgeWidth : 0}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

// ─── Exported Devs Icon Variants ───────────────────────────────

export const DevsIcon = memo(() => {
  const hue = usePrimaryHue()
  return (
    <Icosahedron3D
      size={96}
      hue={hue}
      // animate
      rotationSpeed={0.002}
      className="mb-4 sm:my-6"
    />
  )
})
DevsIcon.displayName = 'DevsIcon'

export const DevsIconSmall = memo(() => {
  const hue = usePrimaryHue()
  return <Icosahedron3D size={16} hue={hue} animate={false} edges={false} />
})
DevsIconSmall.displayName = 'DevsIconSmall'

export const DevsIconXL = memo(() => {
  const hue = usePrimaryHue()
  return <Icosahedron3D size={32} hue={hue} animate rotationSpeed={0.005} />
})
DevsIconXL.displayName = 'DevsIconXL'

export { Icosahedron3D }
