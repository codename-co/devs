/**
 * Animation primitives for the DEVS product tour.
 *
 * Stage owns the timeline (playhead in seconds, RAF loop, keyboard nav,
 * persistent playback bar). Sprite renders its children only while the
 * playhead is inside [start, end] and provides them with `localTime`,
 * `progress`, and `duration` via context.
 *
 * Originally a standalone JSX file loaded via Babel-in-browser; converted
 * to a real ES module so the tour integrates with the app's build pipeline.
 */
import { Icon } from '@/components'
import { ProgressBar } from '@heroui/react_3'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'

// ── Easing functions (Popmotion-style) ─────────────────────────────────────
type EaseFn = (t: number) => number

export const Easing: Record<string, EaseFn> = {
  linear: (t) => t,
  easeInQuad: (t) => t * t,
  easeOutQuad: (t) => t * (2 - t),
  easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => --t * t * t + 1,
  easeInOutCubic: (t) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t) => t * t * t * t,
  easeOutQuart: (t) => 1 - --t * t * t * t,
  easeInOutQuart: (t) =>
    t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t,
  easeInExpo: (t) => (t === 0 ? 0 : Math.pow(2, 10 * (t - 1))),
  easeOutExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeInOutExpo: (t) => {
    if (t === 0) return 0
    if (t === 1) return 1
    if (t < 0.5) return 0.5 * Math.pow(2, 20 * t - 10)
    return 1 - 0.5 * Math.pow(2, -20 * t + 10)
  },
  easeInSine: (t) => 1 - Math.cos((t * Math.PI) / 2),
  easeOutSine: (t) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
  easeOutBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2)
  },
  easeInBack: (t) => {
    const c1 = 1.70158,
      c3 = c1 + 1
    return c3 * t * t * t - c1 * t * t
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158,
      c2 = c1 * 1.525
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (t * 2 - 2) + c2) + 2) / 2
  },
  easeOutElastic: (t) => {
    const c4 = (2 * Math.PI) / 3
    if (t === 0) return 0
    if (t === 1) return 1
    return Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1
  },
}

export const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v))

// ── Timeline context ───────────────────────────────────────────────────────
interface TimelineValue {
  time: number
  duration: number
  playing: boolean
  muted: boolean
  /**
   * Measured width of the stage canvas in CSS pixels. Scenes that need to
   * position elements at pixel coordinates should multiply fractions of
   * this value instead of hard-coding numbers — that way the whole tour
   * scales natively with the user's window.
   */
  stageWidth: number
  /** Measured height of the stage canvas in CSS pixels. */
  stageHeight: number
  setTime?: (t: number | ((prev: number) => number)) => void
  setPlaying?: (p: boolean | ((prev: boolean) => boolean)) => void
  setMuted?: (m: boolean | ((prev: boolean) => boolean)) => void
}

const TimelineContext = createContext<TimelineValue>({
  time: 0,
  duration: 10,
  playing: false,
  muted: false,
  stageWidth: 0,
  stageHeight: 0,
})

export const useTime = () => useContext(TimelineContext).time
export const useTimeline = () => useContext(TimelineContext)
export const useStageSize = () => {
  const { stageWidth, stageHeight } = useContext(TimelineContext)
  return { width: stageWidth, height: stageHeight }
}

// ── Sprite ────────────────────────────────────────────────────────────────
interface SpriteRenderArgs {
  localTime: number
  progress: number
  duration: number
  visible: boolean
}

const SpriteContext = createContext<SpriteRenderArgs>({
  localTime: 0,
  progress: 0,
  duration: 0,
  visible: false,
})
export const useSprite = () => useContext(SpriteContext)

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

// ── Stage ─────────────────────────────────────────────────────────────────
/**
 * One scheduled background transition. The stage background lerps from the
 * previous color to `color` between `start` and `end` (timeline seconds).
 * Applied to the viewport so scenes blend into the surround with no
 * visible letterbox regardless of the user's window aspect ratio.
 */
interface BackgroundTransition {
  start: number
  end: number
  color: string
}

interface StageProps {
  duration?: number
  background?: string
  /**
   * Time-synced background color transitions. Applied to the full viewport
   * so scenes appear center-focused on any screen ratio (portrait, ultrawide,
   * etc.) without visible letterbox bars.
   */
  backgroundTransitions?: BackgroundTransition[]
  loop?: boolean
  autoplay?: boolean
  /** Local-storage key for playhead persistence. */
  persistKey?: string
  /**
   * Called when the canvas area is clicked. Receives the current playhead
   * time (in seconds) and a `toggle` callback that flips play/pause. If
   * omitted, clicks toggle playback by default.
   */
  onCanvasClick?: (time: number, toggle: () => void) => void
  children?: ReactNode
}

/**
 * Resolve the effective background color at a given time, applying any
 * scheduled transitions sequentially. A transition at [start, end] lerps
 * from the previous color to its own `color` over that window.
 */
function resolveBackground(
  base: string,
  transitions: BackgroundTransition[] | undefined,
  time: number,
): string {
  if (!transitions || transitions.length === 0) return base
  let current = base
  for (const tr of transitions) {
    if (time <= tr.start) break
    if (time >= tr.end) {
      current = tr.color
      continue
    }
    const p = clamp((time - tr.start) / (tr.end - tr.start), 0, 1)
    // CSS color-mix works cross-format (oklch, hex, rgb, hsl) so callers
    // can use any color notation they prefer for transitions.
    return `color-mix(in oklab, ${current} ${(1 - p) * 100}%, ${tr.color} ${p * 100}%)`
  }
  return current
}

export function Stage({
  duration = 10,
  background = '#f6f4ef',
  backgroundTransitions,
  loop = true,
  autoplay = true,
  persistKey = 'animstage',
  onCanvasClick,
  children,
}: StageProps) {
  const [time, setTime] = useState(() => {
    if (!persistKey) return 0
    try {
      const v = parseFloat(localStorage.getItem(persistKey + ':t') || '0')
      return Number.isFinite(v) ? clamp(v, 0, duration) : 0
    } catch {
      return 0
    }
  })
  const [playing, setPlaying] = useState(autoplay)
  // Start muted so the tour respects browser autoplay policies and doesn't
  // blast audio at users who just landed on the page. The underlying audio
  // element isn't even loaded until they unmute — see TourSoundtrack.
  const [muted, setMuted] = useState(true)
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({
    w: 0,
    h: 0,
  })

  const stageRef = useRef<HTMLDivElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastTsRef = useRef<number | null>(null)

  // Persist playhead (skipped when persistKey is empty).
  useEffect(() => {
    if (!persistKey) return
    try {
      localStorage.setItem(persistKey + ':t', String(time))
    } catch {
      // localStorage unavailable — not persisting is fine.
    }
  }, [time, persistKey])

  // Track the canvas's real CSS size so scenes can author layouts as
  // fractions (e.g. `0.5 * stageWidth`) and let the browser handle
  // responsivity natively. No transform/scale trickery — the canvas
  // simply fills whatever space its parent gives it.
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    const measure = () => {
      setStageSize({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => {
      ro.disconnect()
    }
  }, [])

  // Animation loop
  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null
      return
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = (ts - lastTsRef.current) / 1000
      lastTsRef.current = ts
      setTime((t) => {
        let next = t + dt
        if (next >= duration) {
          if (loop) next = next % duration
          else {
            next = duration
            setPlaying(false)
          }
        }
        return next
      })
      rafRef.current = requestAnimationFrame(step)
    }
    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      lastTsRef.current = null
    }
  }, [playing, duration, loop])

  const [isFullscreen, setIsFullscreen] = useState(false)
  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onFs)
    return () => document.removeEventListener('fullscreenchange', onFs)
  }, [])

  // Auto-hide the playback bar after 4 s of no mouse movement on the stage.
  const [barVisible, setBarVisible] = useState(true)
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const resetIdleTimer = useCallback(() => {
    setBarVisible(true)
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    idleTimerRef.current = setTimeout(() => setBarVisible(false), 4000)
  }, [])
  useEffect(() => {
    resetIdleTimer()
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [resetIdleTimer])

  const toggleFullscreen = useCallback(() => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }, [])

  // If at the end, reset and restart; otherwise toggle play/pause.
  const handlePlayPause = useCallback(() => {
    if (time >= duration) {
      setTime(0)
      setPlaying(true)
    } else {
      setPlaying((p) => !p)
    }
  }, [time, duration])

  // Keyboard: space = play/pause, ← → = seek
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
      )
        return
      if (e.code === 'Space') {
        e.preventDefault()
        handlePlayPause()
      } else if (e.code === 'ArrowLeft') {
        setTime((t) => clamp(t - (e.shiftKey ? 1 : 0.1), 0, duration))
      } else if (e.code === 'ArrowRight') {
        setTime((t) => clamp(t + (e.shiftKey ? 1 : 0.1), 0, duration))
      } else if (e.key === '0' || e.code === 'Home') {
        setTime(0)
      } else if (e.key === 'm' || e.key === 'M') {
        e.preventDefault()
        setMuted((m) => !m)
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault()
        toggleFullscreen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [duration, toggleFullscreen, handlePlayPause])

  const ctxValue = useMemo<TimelineValue>(
    () => ({
      time,
      duration,
      playing,
      muted,
      stageWidth: stageSize.w,
      stageHeight: stageSize.h,
      setTime,
      setPlaying,
      setMuted,
    }),
    [time, duration, playing, muted, stageSize.w, stageSize.h],
  )

  // The viewport background tracks any scheduled color transitions so the
  // stage surround matches each scene's visuals — keeps the tour feeling
  // native on any aspect ratio (portrait, ultrawide, vertical) without any
  // letterbox bars.
  const effectiveBackground = useMemo(
    () => resolveBackground(background, backgroundTransitions, time),
    [background, backgroundTransitions, time],
  )

  return (
    <div
      ref={stageRef}
      onMouseMove={resetIdleTimer}
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        background: effectiveBackground,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        onClick={() => {
          if (onCanvasClick) onCanvasClick(time, handlePlayPause)
          else handlePlayPause()
        }}
        style={{
          flex: 1,
          width: '100%',
          display: 'flex',
          overflow: 'hidden',
          minHeight: 0,
          cursor: 'pointer',
        }}
      >
        {/* Canvas fills the available space natively — no CSS scale, no
            fixed design dimensions. Scenes use percentages / flex / `inset`
            to lay themselves out, or read `stageWidth`/`stageHeight` from
            the timeline context when they need true pixel math. */}
        <div
          ref={canvasRef}
          className="pointer-events-none"
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            background: effectiveBackground,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <TimelineContext.Provider value={ctxValue}>
            {children}
          </TimelineContext.Provider>
        </div>
      </div>

      <div
        style={{
          opacity: barVisible ? 1 : 0,
          transition: 'opacity 0.15s ease',
          pointerEvents: barVisible ? 'auto' : 'none',
        }}
      >
        <PlaybackBar
          time={time}
          duration={duration}
          playing={playing}
          muted={muted}
          onPlayPause={handlePlayPause}
          onMuteToggle={() => setMuted((m) => !m)}
          onSeek={(t) => setTime(t)}
          onFullscreen={toggleFullscreen}
          isFullscreen={isFullscreen}
        />
      </div>
    </div>
  )
}

// ── Playback bar ──────────────────────────────────────────────────────────
interface PlaybackBarProps {
  time: number
  duration: number
  playing: boolean
  muted: boolean
  onPlayPause: () => void
  onMuteToggle: () => void
  onSeek: (t: number) => void
  onFullscreen: () => void
  isFullscreen: boolean
}

function PlaybackBar({
  time,
  duration,
  playing,
  muted,
  onPlayPause,
  onMuteToggle,
  onSeek,
  onFullscreen,
  isFullscreen,
}: PlaybackBarProps) {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const timeFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const x = clamp((e.clientX - rect.left) / rect.width, 0, 1)
      return x * duration
    },
    [duration],
  )

  const onTrackMove = (e: React.MouseEvent) => {
    if (dragging) onSeek(timeFromEvent(e))
  }

  const onTrackLeave = () => {}

  const onTrackDown = (e: React.MouseEvent) => {
    setDragging(true)
    const t = timeFromEvent(e)
    onSeek(t)
  }

  useEffect(() => {
    if (!dragging) return
    const onUp = () => setDragging(false)
    const onMove = (e: MouseEvent) => {
      if (!trackRef.current) return
      onSeek(timeFromEvent(e))
    }
    window.addEventListener('mouseup', onUp)
    window.addEventListener('mousemove', onMove)
    return () => {
      window.removeEventListener('mouseup', onUp)
      window.removeEventListener('mousemove', onMove)
    }
  }, [dragging, timeFromEvent, onSeek])

  const pct = duration > 0 ? (time / duration) * 100 : 0
  const fmt = (t: number) => {
    const total = Math.max(0, t)
    const m = Math.floor(total / 60)
    const s = Math.floor(total % 60)
    // const cs = Math.floor((total * 100) % 100)
    return `${String(m).padStart(1, '0')}:${String(s).padStart(2, '0')}`
  }

  const mono =
    "'Geist', JetBrains Mono, ui-monospace, SFMono-Regular, monospace"

  return (
    <div
      className="group/pb absolute bottom-0 left-0 right-0"
      style={{
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
        userSelect: 'none',
        background:
          'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.6) 40%, rgba(0,0,0,0) 100%)',
        paddingTop: 40,
      }}
    >
      {/* Scrub track — thin by default, thickens on hover of the whole bar. */}
      <div
        ref={trackRef}
        onMouseMove={onTrackMove}
        onMouseLeave={onTrackLeave}
        onMouseDown={onTrackDown}
        style={{
          position: 'relative',
          height: 14,
          padding: '5px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <div
          className="transition-[height] duration-150 group-hover/pb:h-[5px]"
          style={{
            position: 'relative',
            width: '100%',
            height: 3,
            background: 'rgba(255,255,255,0.22)',
            borderRadius: 2,
            overflow: 'visible',
          }}
        >
          <ProgressBar
            value={time}
            minValue={0}
            maxValue={duration}
            aria-label="Playback progress"
            className="absolute inset-0 !bg-transparent"
          >
            <ProgressBar.Fill
              className="!transition-none !rounded-sm bg-primary-400"
              style={{ height: '100%' }}
            />
          </ProgressBar>
          {/* Thumb — invisible by default, appears on bar hover. */}
          <div
            className="opacity-0 transition-opacity duration-150 group-hover/pb:opacity-100 bg-primary-400"
            style={{
              position: 'absolute',
              left: `${pct}%`,
              top: '50%',
              width: 13,
              height: 13,
              marginLeft: -6.5,
              marginTop: -6.5,
              borderRadius: '50%',
              pointerEvents: 'none',
              boxShadow: '0 0 0 1px rgba(0,0,0,0.15)',
            }}
          />
        </div>
      </div>

      {/* Controls row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '0 8px 8px',
        }}
      >
        <ControlButton
          onClick={onPlayPause}
          title={playing ? 'Pause (k)' : 'Play (space)'}
        >
          <Icon
            name={playing ? 'Pause' : 'PlaySolid'}
            size="lg"
            style={{ color: '#fff' }}
          />
        </ControlButton>

        <ControlButton
          onClick={onMuteToggle}
          title={muted ? 'Unmute (m)' : 'Mute (m)'}
        >
          <Icon
            name={muted ? 'SoundOffSolid' : 'SoundHighSolid'}
            size="lg"
            style={{ color: '#fff' }}
          />
        </ControlButton>

        <div
          style={{
            fontFamily: mono,
            fontSize: 13,
            fontVariantNumeric: 'tabular-nums',
            color: '#fff',
            padding: '0 8px',
          }}
        >
          <span>{fmt(time)}</span>
          <span style={{ color: 'rgba(255,255,255,0.7)' }}>
            {' / '}
            {fmt(duration)}
          </span>
        </div>

        <div style={{ flex: 1 }} />

        <ControlButton
          onClick={onFullscreen}
          title={isFullscreen ? 'Exit full screen (f)' : 'Full screen (f)'}
        >
          <Icon
            name={isFullscreen ? 'Reduce' : 'Enlarge'}
            size="xl"
            style={{ color: '#fff' }}
          />
        </ControlButton>
      </div>
    </div>
  )
}

interface ControlButtonProps {
  children: ReactNode
  onClick: () => void
  title: string
}

function ControlButton({ children, onClick, title }: ControlButtonProps) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        width: 40,
        height: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: '#fff',
        cursor: 'pointer',
        padding: 0,
        borderRadius: 4,
        opacity: 0.95,
        transition: 'opacity 120ms, transform 120ms',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.opacity = '1'
        e.currentTarget.style.transform = 'scale(1.08)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.opacity = '0.95'
        e.currentTarget.style.transform = 'scale(1)'
      }}
    >
      {children}
    </button>
  )
}
