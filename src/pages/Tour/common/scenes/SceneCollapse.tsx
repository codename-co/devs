/**
 * SceneCollapse — sphere + single caption on dark background.
 *
 * A quick cinematic interstitial: glowing sphere breathes in the center,
 * a caption fades in below.
 */
import { Sprite, clamp, Easing, useStageSize } from '../assets/player'
import { TourSphere } from './TourSphere'
import { useStageT } from './useStageT'

interface SceneCollapseProps {
  start?: number
  end?: number
  caption: string
}

export function SceneCollapse({
  start = 12.5,
  end = 15.5,
  caption,
}: SceneCollapseProps) {
  const { width: stageW } = useStageSize()
  const t = useStageT()
  const text = t(caption)
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.5, 0, 1))
        const exitT = clamp((time - (duration - 0.4)) / 0.4, 0, 1)
        const opacity = inT * (1 - exitT)
        const sphereScale = 0.9 + 0.1 * inT
        const breathe = 1 + Math.sin(time * 1.8) * 0.02
        const captionT = clamp((time - 0.4) / 0.5, 0, 1)
        const captionOut = clamp((time - (duration - 0.5)) / 0.5, 0, 1)

        const sphereSz = Math.round(Math.max(100, stageW * 0.25))
        const captionFz = Math.round(Math.max(18, stageW * 0.044))

        return (
          <div style={{ position: 'absolute', inset: 0, opacity }}>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                transform: `translate(-50%, -50%) scale(${sphereScale * breathe})`,
              }}
            >
              <TourSphere size={sphereSz} color="#6aa1ff" intensity={1.2} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '68%',
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: captionFz,
                color: '#f2f4f8',
                letterSpacing: '-0.01em',
                opacity: captionT * (1 - captionOut),
                transform: `translateY(${(1 - captionT) * 14}px)`,
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
