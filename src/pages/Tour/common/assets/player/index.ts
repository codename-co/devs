/**
 * Public API for the reusable video player framework.
 *
 * Import everything you need from `@/pages/Tour/player`:
 *
 *   import { Stage, Sprite, Soundtrack, Easing, clamp, useTime, useTimeline } from './player'
 */
export { Easing, clamp } from './easing'
export {
  TimelineContext,
  SpriteContext,
  useTime,
  useTimeline,
  useStageSize,
  useSprite,
  type TimelineValue,
  type SpriteRenderArgs,
} from './context'
export { Sprite } from './Sprite'
export { Stage, type BackgroundTransition, type StageProps, type PlayerI18nDict } from './Stage'
export { Soundtrack, type SoundtrackProps } from './Soundtrack'
