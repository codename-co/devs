/**
 * SceneHook — a cinematic opening caption that fades in and out.
 *
 * Parametric: pass the caption text as `caption`. Uses the light theme
 * (dark text on the light stage background).
 */
import { Sprite, clamp, useStageSize } from '../assets/player'
import { useStageT } from './useStageT'

interface SceneHookProps {
  start?: number
  end?: number
  caption: string
  /** Text color. Default: dark text for light backgrounds. */
  color?: string
}

export function SceneHook({
  start = 0,
  end = 2.5,
  caption,
  color = '#1a1d22',
}: SceneHookProps) {
  const { width: stageW } = useStageSize()
  const t = useStageT()
  const text = t(caption)
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const hookIn = clamp(localTime / 0.35, 0, 1)
        const hookOut = clamp((localTime - (duration - 0.4)) / 0.4, 0, 1)
        const opacity = hookIn * (1 - hookOut)

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity,
              pointerEvents: 'none',
            }}
          >
            <div
              style={{
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: clamp(stageW * 0.042, 24, 56),
                color,
                textAlign: 'center',
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
                padding: '0 10%',
              }}
            >
              {text}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
