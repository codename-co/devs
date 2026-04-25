/**
 * Stage — the top-level video player component.
 *
 * Owns the timeline (playhead in seconds, RAF loop, keyboard shortcuts,
 * persistent playback bar). Content is rendered inside a canvas area that
 * is marked `inert` so users cannot Tab into scene elements.
 *
 * Also contains PlaybackBar, ControlButton, SettingsMenu, ShortcutOverlay
 * as internal sub-components.
 */
import { Icon } from '@/components'
import { I18nProvider, useI18n } from '@/i18n'
import { type LanguageCode, languages } from '@/i18n/locales'
import { userSettings } from '@/stores/userStore'
import { ProgressBar } from '@heroui/react_3'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { TimelineContext, type TimelineValue } from './context'
import { clamp } from './easing'

// `PlayerI18nDict` is defined in `./context` and re-exported below so it
// can be consumed by both the Stage internals and shared scenes via the
// timeline context.
export type { PlayerI18nDict } from './context'
import type { PlayerI18nDict } from './context'

/**
 * Hook that provides a translation function for player control strings.
 * When a dict is provided, looks up the current language and translates.
 * When omitted, returns a passthrough `t` that echoes the key as-is.
 */
function usePlayerI18n(dict?: PlayerI18nDict) {
  const { lang } = useI18n()
  const t = useCallback(
    (key: string): string => {
      if (!dict) return key
      const locale = dict[lang]
      if (!locale || Array.isArray(locale)) return key
      return (locale as Record<string, string>)[key] ?? key
    },
    [dict, lang],
  )
  return { t, lang }
}

// ── Stage ─────────────────────────────────────────────────────────────────

/**
 * One scheduled background transition. The stage background lerps from the
 * previous color to `color` between `start` and `end` (timeline seconds).
 * Applied to the viewport so scenes blend into the surround with no
 * visible letterbox regardless of the user's window aspect ratio.
 */
export interface BackgroundTransition {
  start: number
  end: number
  color: string
}

export interface StageProps {
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
  /**
   * i18n dictionary for player controls (Speed, Pause, etc.). Player
   * controls will use these translations via `usePlayerI18n(i18nDict)`. If
   * omitted, controls fall back to the global i18n provider.
   */
  i18nDict?: PlayerI18nDict
  /**
   * HTML `id` attribute for the root element. Used to scope CSS selectors
   * (e.g. the animation-pause rule). Defaults to `'tour-root'`.
   */
  rootId?: string
  /**
   * When true, disables the global `window` keyboard shortcuts (space,
   * arrows, etc.). Useful when multiple Stage instances are mounted
   * simultaneously (e.g. a gallery) to prevent key events from
   * controlling all players at once.
   */
  disableKeyboard?: boolean
  /**
   * Initial playhead position in seconds. When `persistKey` is set and a
   * persisted position exists, the persisted value takes precedence.
   * Defaults to 0.
   */
  initialTime?: number
  /**
   * When true, the playback bar and shortcut overlay are not rendered.
   * Intended for embed/thumbnail contexts where controls are unwanted.
   */
  hideControls?: boolean
  /**
   * Fired exactly once per playthrough when the playhead reaches `duration`
   * and `loop` is `false`. Used by gallery hosts (e.g. the About page) to
   * advance to the next video in a sequence.
   */
  onEnded?: () => void
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
  i18nDict,
  rootId = 'tour-root',
  disableKeyboard = false,
  initialTime = 0,
  hideControls = false,
  onEnded,
  children,
}: StageProps) {
  // Stable ref so the RAF loop can call the latest `onEnded` without
  // re-subscribing every render.
  const onEndedRef = useRef(onEnded)
  onEndedRef.current = onEnded
  const [time, setTime] = useState(() => {
    if (persistKey) {
      try {
        const v = parseFloat(localStorage.getItem(persistKey + ':t') || '')
        if (Number.isFinite(v)) return clamp(v, 0, duration)
      } catch {
        // localStorage unavailable
      }
    }
    return clamp(initialTime, 0, duration)
  })
  const [playing, setPlaying] = useState(autoplay)
  const [muted, setMuted] = useState(true)
  const [speed, setSpeed] = useState(1)
  const [lang, setLang] = useState<LanguageCode>(() => {
    // Priority: explicit per-player override (set by the user via the
    // in-player language menu) → the user's app-wide language preference
    // → English. This means a brand-new visitor sees the tour in their
    // own language without having to fiddle with the player menu.
    const stored = localStorage.getItem('videoLang')
    if (stored && stored in languages) return stored as LanguageCode
    const userLang = userSettings.getState().language
    if (userLang && userLang in languages) return userLang as LanguageCode
    return 'en'
  })
  const [showShortcuts, setShowShortcuts] = useState(false)
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
  // fractions and let the browser handle responsivity natively.
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

  // Animation loop — reads speed via ref to avoid re-subscribing RAF on
  // speed changes.
  const speedRef = useRef(speed)
  speedRef.current = speed

  useEffect(() => {
    if (!playing) {
      lastTsRef.current = null
      return
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts
      const dt = ((ts - lastTsRef.current) / 1000) * speedRef.current
      lastTsRef.current = ts
      setTime((t) => {
        let next = t + dt
        if (next >= duration) {
          if (loop) next = next % duration
          else {
            next = duration
            setPlaying(false)
            // Fire after the state update settles so listeners observe a
            // consistent paused-at-end state.
            queueMicrotask(() => onEndedRef.current?.())
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
    if (disableKeyboard) return
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
      } else if (e.key === '?') {
        e.preventDefault()
        setShowShortcuts((s) => !s)
      } else if (e.code === 'Escape') {
        setShowShortcuts(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [disableKeyboard, duration, toggleFullscreen, handlePlayPause])

  // Resolve a CSS selector to its centre in stage-local pixel coordinates.
  // Recomputed each call (cheap getBoundingClientRect) — callers invoke this
  // inside per-frame Sprite render functions so the cursor tracks the real
  // element through any responsive / zoom / layout shift.
  const resolveAnchor = useCallback(
    (selector: string): { x: number; y: number } | null => {
      const canvas = canvasRef.current
      if (!canvas) return null
      let target: HTMLElement | null = null
      try {
        target = canvas.querySelector(selector) as HTMLElement | null
      } catch {
        return null
      }
      if (!target) return null
      const c = canvas.getBoundingClientRect()
      const r = target.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return null
      return {
        x: r.left + r.width / 2 - c.left,
        y: r.top + r.height / 2 - c.top,
      }
    },
    [],
  )

  const ctxValue = useMemo<TimelineValue>(
    () => ({
      time,
      duration,
      playing,
      muted,
      speed,
      lang,
      stageWidth: stageSize.w,
      stageHeight: stageSize.h,
      i18nDict,
      resolveAnchor,
      setTime,
      setPlaying,
      setMuted,
      setSpeed,
      setLang,
    }),
    [
      time,
      duration,
      playing,
      muted,
      speed,
      lang,
      stageSize.w,
      stageSize.h,
      i18nDict,
      resolveAnchor,
    ],
  )

  const effectiveBackground = useMemo(
    () => resolveBackground(background, backgroundTransitions, time),
    [background, backgroundTransitions, time],
  )

  return (
    <div
      id={rootId}
      ref={stageRef}
      onMouseMove={resetIdleTimer}
      role="region"
      aria-label="Video player"
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
        <div
          ref={canvasRef}
          className="pointer-events-none"
          inert
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 0,
            background: effectiveBackground,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* When paused, freeze ALL CSS animations inside the canvas —
              including HeroUI spinners, keyframe loops, shimmer effects.
              One global rule, zero prop-passing. */}
          {!playing && (
            <style>{`#${rootId} [inert] *, #${rootId} [inert] *::before, #${rootId} [inert] *::after { animation-play-state: paused !important; }`}</style>
          )}
          {/* I18nProvider scoped to the canvas only — switching the
              in-player language affects the video content (scenes,
              captions) but not the player controls themselves. */}
          <I18nProvider lang={lang}>
            <TimelineContext.Provider value={ctxValue}>
              {children}
            </TimelineContext.Provider>
          </I18nProvider>
        </div>
      </div>

      {/* Keyboard shortcut overlay */}
      {!hideControls && showShortcuts && (
        <ShortcutOverlay
          onClose={() => setShowShortcuts(false)}
          i18nDict={i18nDict}
        />
      )}

      {!hideControls && (
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
            speed={speed}
            lang={lang}
            onPlayPause={handlePlayPause}
            onMuteToggle={() => setMuted((m) => !m)}
            onSeek={(t) => setTime(t)}
            onSpeedChange={setSpeed}
            onLangChange={(l) => {
              setLang(l)
              localStorage.setItem('videoLang', l)
            }}
            onFullscreen={toggleFullscreen}
            isFullscreen={isFullscreen}
            i18nDict={i18nDict}
          />
        </div>
      )}
    </div>
  )
}

// ── Playback bar ──────────────────────────────────────────────────────────
interface PlaybackBarProps {
  time: number
  duration: number
  playing: boolean
  muted: boolean
  speed: number
  lang: LanguageCode
  onPlayPause: () => void
  onMuteToggle: () => void
  onSeek: (t: number) => void
  onSpeedChange: (s: number) => void
  onLangChange: (l: LanguageCode) => void
  onFullscreen: () => void
  isFullscreen: boolean
  i18nDict?: PlayerI18nDict
}

function PlaybackBar({
  time,
  duration,
  playing,
  muted,
  speed,
  lang,
  onPlayPause,
  onMuteToggle,
  onSeek,
  onSpeedChange,
  onLangChange,
  onFullscreen,
  isFullscreen,
  i18nDict,
}: PlaybackBarProps) {
  const { t } = usePlayerI18n(i18nDict)
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [dragging, setDragging] = useState(false)

  const timeFromPointer = useCallback(
    (clientX: number) => {
      if (!trackRef.current) return 0
      const rect = trackRef.current.getBoundingClientRect()
      const x = clamp((clientX - rect.left) / rect.width, 0, 1)
      return x * duration
    },
    [duration],
  )

  const timeFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent) => timeFromPointer(e.clientX),
    [timeFromPointer],
  )

  const onTrackMove = (e: React.MouseEvent) => {
    if (dragging) onSeek(timeFromEvent(e))
  }

  const onTrackLeave = () => {}

  const onTrackDown = (e: React.MouseEvent) => {
    setDragging(true)
    onSeek(timeFromEvent(e))
  }

  // Touch handlers for mobile scrubbing
  const onTouchStart = (e: React.TouchEvent) => {
    e.preventDefault()
    setDragging(true)
    const touch = e.touches[0]
    onSeek(timeFromPointer(touch.clientX))
  }

  const onTouchMove = (e: React.TouchEvent) => {
    if (!dragging) return
    const touch = e.touches[0]
    onSeek(timeFromPointer(touch.clientX))
  }

  const onTouchEnd = () => setDragging(false)

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
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        role="slider"
        aria-label="Seek"
        aria-valuemin={0}
        aria-valuemax={duration}
        aria-valuenow={Math.round(time * 10) / 10}
        tabIndex={0}
        style={{
          position: 'relative',
          height: 14,
          padding: '5px 12px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          touchAction: 'none',
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
          title={playing ? `${t('Pause')} (k)` : `${t('Play')} (space)`}
        >
          <Icon
            name={playing ? 'Pause' : 'PlaySolid'}
            size="lg"
            style={{ color: '#fff' }}
          />
        </ControlButton>

        <ControlButton
          onClick={onMuteToggle}
          title={muted ? `${t('Unmute')} (m)` : `${t('Mute')} (m)`}
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

        <SettingsMenu
          speed={speed}
          lang={lang}
          onSpeedChange={onSpeedChange}
          onLangChange={onLangChange}
          i18nDict={i18nDict}
        />

        <ControlButton
          onClick={onFullscreen}
          title={isFullscreen ? `${t('Exit full screen')} (f)` : `${t('Full screen')} (f)`}
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

// ── Settings menu (speed + language) ──────────────────────────────────────
const SPEED_OPTIONS = [0.5, 1, 1.5, 2] as const

interface SettingsMenuProps {
  speed: number
  lang: LanguageCode
  onSpeedChange: (s: number) => void
  onLangChange: (l: LanguageCode) => void
  i18nDict?: PlayerI18nDict
}

type SettingsPanel = 'main' | 'speed' | 'lang'

function SettingsMenu({
  speed,
  lang,
  onSpeedChange,
  onLangChange,
  i18nDict,
}: SettingsMenuProps) {
  const { t } = usePlayerI18n(i18nDict)
  const [open, setOpen] = useState(false)
  const [panel, setPanel] = useState<SettingsPanel>('main')
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
        setPanel('main')
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [open])

  const menuStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '100%',
    right: 0,
    marginBottom: 8,
    background: 'rgba(28,28,28,0.95)',
    backdropFilter: 'blur(12px)',
    borderRadius: 10,
    padding: '6px 0',
    minWidth: 200,
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontSize: 13,
    color: '#e8e8e8',
    zIndex: 10,
  }

  const itemStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 16px',
    cursor: 'pointer',
    background: 'transparent',
    border: 'none',
    color: 'inherit',
    width: '100%',
    fontSize: 'inherit',
    fontFamily: 'inherit',
    textAlign: 'left',
  }

  const hoverHandlers = {
    onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
    },
    onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
      e.currentTarget.style.background = 'transparent'
    },
  }

  const renderMain = () => (
    <>
      <button
        style={itemStyle}
        {...hoverHandlers}
        onClick={() => setPanel('speed')}
      >
        <Icon name="Timer" size="md" style={{ color: '#fff' }} />
        <span style={{ flex: 1 }}>{t('Speed')}</span>
        <span style={{ opacity: 0.6 }}>{speed === 1 ? t('Normal') : `${speed}×`}</span>
        <span style={{ opacity: 0.4, fontSize: 11 }}>›</span>
      </button>
      <button
        style={itemStyle}
        {...hoverHandlers}
        onClick={() => setPanel('lang')}
      >
        <Icon name="Language" size="md" style={{ color: '#fff' }} />
        <span style={{ flex: 1 }}>{t('Language')}</span>
        <span style={{ opacity: 0.6 }}>{languages[lang]}</span>
        <span style={{ opacity: 0.4, fontSize: 11 }}>›</span>
      </button>
    </>
  )

  const renderSpeed = () => (
    <>
      <button
        style={{ ...itemStyle, borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        {...hoverHandlers}
        onClick={() => setPanel('main')}
      >
        <span style={{ opacity: 0.4, fontSize: 11 }}>‹</span>
        <span style={{ fontWeight: 500 }}>{t('Speed')}</span>
      </button>
      {SPEED_OPTIONS.map((s) => (
        <button
          key={s}
          style={itemStyle}
          {...hoverHandlers}
          onClick={() => {
            onSpeedChange(s)
            setOpen(false)
            setPanel('main')
          }}
        >
          <span style={{ width: 18, textAlign: 'center', opacity: speed === s ? 1 : 0 }}>
            {speed === s && <Icon name="Check" size="sm" style={{ color: '#fff' }} />}
          </span>
          <span>{s === 1 ? t('Normal') : `${s}×`}</span>
        </button>
      ))}
    </>
  )

  const renderLang = () => (
    <>
      <button
        style={{ ...itemStyle, borderBottom: '1px solid rgba(255,255,255,0.1)' }}
        {...hoverHandlers}
        onClick={() => setPanel('main')}
      >
        <span style={{ opacity: 0.4, fontSize: 11 }}>‹</span>
        <span style={{ fontWeight: 500 }}>{t('Language')}</span>
      </button>
      {(Object.entries(languages) as [LanguageCode, string][]).map(([code, name]) => (
        <button
          key={code}
          style={itemStyle}
          {...hoverHandlers}
          onClick={() => {
            onLangChange(code)
            setOpen(false)
            setPanel('main')
          }}
        >
          <span style={{ width: 18, textAlign: 'center', opacity: lang === code ? 1 : 0 }}>
            {lang === code && <Icon name="Check" size="sm" style={{ color: '#fff' }} />}
          </span>
          <span>{name}</span>
        </button>
      ))}
    </>
  )

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <ControlButton
        onClick={() => {
          setOpen((o) => !o)
          setPanel('main')
        }}
        title={t('Settings')}
      >
        <Icon name="Settings" size="lg" style={{ color: '#fff' }} />
      </ControlButton>

      {open && (
        <div style={menuStyle}>
          {panel === 'main' && renderMain()}
          {panel === 'speed' && renderSpeed()}
          {panel === 'lang' && renderLang()}
        </div>
      )}
    </div>
  )
}

// ── Keyboard shortcut overlay ─────────────────────────────────────────────
function ShortcutOverlay({
  onClose,
  i18nDict,
}: {
  onClose: () => void
  i18nDict?: PlayerI18nDict
}) {
  const { t } = usePlayerI18n(i18nDict)
  const shortcuts = [
    ['Space', t('Play / Pause')],
    ['←', t('Seek back 0.1 s')],
    ['→', t('Seek forward 0.1 s')],
    ['Shift + ←', t('Seek back 1 s')],
    ['Shift + →', t('Seek forward 1 s')],
    ['Home / 0', t('Go to start')],
    ['M', t('Toggle mute')],
    ['F', t('Toggle full screen')],
    ['?', t('Show shortcuts')],
    ['Esc', t('Close this overlay')],
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: 'rgba(28,28,28,0.95)',
          borderRadius: 16,
          padding: '28px 36px',
          minWidth: 320,
          boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
          color: '#e8e8e8',
          fontFamily: 'Inter, system-ui, sans-serif',
        }}
      >
        <div
          style={{
            fontSize: 16,
            fontWeight: 600,
            marginBottom: 20,
            letterSpacing: '0.01em',
          }}
        >
          {t('Keyboard shortcuts')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {shortcuts.map(([key, desc]) => (
            <div
              key={key}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 24,
              }}
            >
              <span style={{ fontSize: 13, opacity: 0.7 }}>{desc}</span>
              <kbd
                style={{
                  fontFamily: "'Geist', ui-monospace, monospace",
                  fontSize: 12,
                  background: 'rgba(255,255,255,0.1)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 5,
                  padding: '3px 8px',
                  whiteSpace: 'nowrap',
                }}
              >
                {key}
              </kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
