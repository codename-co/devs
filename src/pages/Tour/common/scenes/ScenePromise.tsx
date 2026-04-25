/**
 * ScenePromise — numbered phrase cascade + closing tagline on dark background.
 *
 * Parametric: pass `phrases` (text + stagger time) and `tagline`.
 * Responsive: two-column on wide screens, stacked on narrow.
 */
import { Sprite, clamp, Easing, useStageSize } from '../assets/player'
import { TourSphere } from './TourSphere'
import { BackgroundOrbit } from './BackgroundOrbit'
import { useStageT } from './useStageT'

export interface PromisePhrase {
  text: string
  /** Scene-local time (seconds) when this phrase starts fading in. */
  at: number
}

interface ScenePromiseProps {
  start?: number
  end?: number
  phrases: PromisePhrase[]
  tagline: string
  /** Scene-local time when the tagline starts (default: auto-calculated). */
  taglineAt?: number
}

export function ScenePromise({
  start = 17.9,
  end = 23.0,
  phrases,
  tagline,
  taglineAt,
}: ScenePromiseProps) {
  const { width: stageW } = useStageSize()
  const t = useStageT()
  const taglineText = t(tagline)

  // Default tagline entrance: 1.3s after the last phrase starts.
  const lastPhraseAt = phrases.length > 0 ? phrases[phrases.length - 1].at : 0
  const effectiveTaglineAt = taglineAt ?? lastPhraseAt + 1.3

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = clamp(time / 0.4, 0, 1)
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const breathe = 1 + Math.sin(time * 1.8) * 0.03

        const taglineIn = clamp((time - effectiveTaglineAt) / 0.5, 0, 1)
        const taglineOpacity = taglineIn * (1 - exitT)

        const isWide = stageW >= 900

        const phraseFz = Math.round(Math.max(18, stageW * 0.044))
        const phraseGap = Math.round(Math.max(10, phraseFz * 0.85))
        const numFz = Math.round(Math.max(10, phraseFz * 0.38))
        const numW = Math.round(Math.max(20, phraseFz * 0.88))
        const sphereSz = Math.round(Math.max(72, stageW * 0.2))

        const taglineFz = Math.round(Math.max(11, stageW * 0.038))
        const taglineLS = isWide ? '0.28em' : stageW < 500 ? '0.06em' : '0.12em'

        const phraseElements = phrases.map((p, i) => {
          const lt = clamp((time - p.at) / 0.5, 0, 1)
          const yOff = (1 - Easing.easeOutBack(lt)) * 24
          return (
            <div
              key={i}
              style={{
                opacity: lt,
                transform: `translateY(${yOff}px)`,
                display: 'flex',
                alignItems: 'baseline',
                gap: isWide ? 16 : Math.round(numW * 0.4),
              }}
            >
              <span
                style={{
                  fontFamily: "'Geist', ui-monospace, monospace",
                  fontStyle: 'normal',
                  fontSize: numFz,
                  color: 'oklch(72% 0.16 253)',
                  letterSpacing: '0.14em',
                  minWidth: numW,
                  flexShrink: 0,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </span>
              <span style={{ fontSize: isWide ? 1.5 * numFz : undefined }}>
                {t(p.text)}
              </span>
            </div>
          )
        })

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'oklch(12% 0.0015 253.83)',
              opacity,
            }}
          >
            <BackgroundOrbit cx={640} cy={540} t={time} />

            {isWide ? (
              <>
                <div
                  style={{
                    position: 'absolute',
                    left: '33.3%',
                    top: '50%',
                    transform: `translate(-50%, -50%) scale(${breathe})`,
                    opacity: 1 - taglineIn * 0.6,
                  }}
                >
                  <TourSphere size={sphereSz} color="#6aa1ff" intensity={1.2} />
                </div>

                <div
                  style={{
                    position: 'absolute',
                    left: '46.9%',
                    top: '27.8%',
                    width: '46.9%',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: phraseGap,
                    fontFamily: "'Unbounded', Georgia, serif",
                    fontStyle: 'italic',
                    fontSize: phraseFz,
                    color: '#f2f4f8',
                    letterSpacing: '-0.02em',
                    lineHeight: 1.15,
                    whiteSpace: 'nowrap',
                    opacity: 1 - taglineIn,
                  }}
                >
                  {phraseElements}
                </div>
              </>
            ) : (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: phraseGap,
                  opacity: 1 - taglineIn,
                  pointerEvents: 'none',
                  fontFamily: "'Unbounded', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: phraseFz,
                  color: '#f2f4f8',
                  letterSpacing: '-0.02em',
                  lineHeight: 1.15,
                }}
              >
                <div
                  style={{
                    transform: `scale(${breathe})`,
                    flexShrink: 0,
                    marginBottom: phraseGap * 0.4,
                  }}
                >
                  <TourSphere size={sphereSz} color="#6aa1ff" intensity={1.2} />
                </div>
                {phraseElements}
              </div>
            )}

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: `translateY(-50%) scale(${0.96 + 0.04 * taglineIn})`,
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: taglineFz,
                letterSpacing: taglineLS,
                color: '#f2f4f8',
                opacity: taglineOpacity,
                pointerEvents: 'none',
                padding: '0 16px',
              }}
            >
              {taglineText}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
