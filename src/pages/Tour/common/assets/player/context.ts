/**
 * Timeline and Sprite contexts for the video player.
 *
 * Provides reactive access to playhead position, stage dimensions,
 * playback state, and per-sprite local time/progress.
 */
import { createContext, useContext } from 'react'
import type { LanguageCode } from '@/i18n/locales'

/**
 * Shape of an i18n dictionary accepted by `useI18n(dict)`. The `en` entry
 * is the canonical key list (keys = values); other locales map keys to
 * translated strings. Defined here so both the Stage and shared scenes
 * can consume it from the timeline context.
 */
export type PlayerI18nDict = {
  en?: readonly string[]
  [key: string]: Record<string, string> | readonly string[] | undefined
}

// ── Timeline context ───────────────────────────────────────────────────────
export interface TimelineValue {
  time: number
  duration: number
  playing: boolean
  muted: boolean
  /** Current playback speed multiplier (0.5, 1, 1.5, 2). */
  speed: number
  /** Video-local language override. */
  lang: LanguageCode
  /**
   * Measured width of the stage canvas in CSS pixels. Scenes that need to
   * position elements at pixel coordinates should multiply fractions of
   * this value instead of hard-coding numbers — that way the whole video
   * scales natively with the user's window.
   */
  stageWidth: number
  /** Measured height of the stage canvas in CSS pixels. */
  stageHeight: number
  /**
   * The translation dictionary supplied to `<Stage i18nDict={…}>`.
   * Shared scenes (SceneHook, SceneCTA, etc.) read this from context to
   * translate their text props — each video composition only needs to
   * pass keys, not pre-translated strings.
   */
  i18nDict?: PlayerI18nDict
  /**
   * Resolve a CSS selector against the stage canvas and return the target
   * element's centre in stage-local pixel coordinates. Returns `null` when
   * the canvas is not mounted, the selector matches nothing, or the target
   * has zero size (not yet laid out).
   *
   * Use this from inside a Sprite render function so the cursor tracks the
   * real DOM position every frame — immune to zoom, responsive breakpoints,
   * or layout shifts inside the rendered product components.
   */
  resolveAnchor?: (selector: string) => { x: number; y: number } | null
  setTime?: (t: number | ((prev: number) => number)) => void
  setPlaying?: (p: boolean | ((prev: boolean) => boolean)) => void
  setMuted?: (m: boolean | ((prev: boolean) => boolean)) => void
  setSpeed?: (s: number) => void
  setLang?: (l: LanguageCode) => void
}

export const TimelineContext = createContext<TimelineValue>({
  time: 0,
  duration: 10,
  playing: false,
  muted: false,
  speed: 1,
  lang: 'en',
  stageWidth: 0,
  stageHeight: 0,
})

export const useTime = () => useContext(TimelineContext).time
export const useTimeline = () => useContext(TimelineContext)
export const useStageSize = () => {
  const { stageWidth, stageHeight } = useContext(TimelineContext)
  return { width: stageWidth, height: stageHeight }
}

// ── Sprite context ────────────────────────────────────────────────────────
export interface SpriteRenderArgs {
  localTime: number
  progress: number
  duration: number
  visible: boolean
}

export const SpriteContext = createContext<SpriteRenderArgs>({
  localTime: 0,
  progress: 0,
  duration: 0,
  visible: false,
})

export const useSprite = () => useContext(SpriteContext)
