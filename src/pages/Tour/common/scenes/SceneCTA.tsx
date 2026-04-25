/**
 * SceneCTA — call-to-action ending with pulsing button.
 *
 * Parametric: pass translated strings for tagline, CTA label, friction badge,
 * and GitHub line via props.
 */
import { Sprite, clamp, useStageSize } from '../assets/player'
import { TourSphere } from './TourSphere'
import { BackgroundOrbit } from './BackgroundOrbit'
import { useStageT } from './useStageT'
import { PRODUCT } from '@/config/product'

interface SceneCTAProps {
  start?: number
  end?: number
  tagline: string
  ctaLabel: string
  frictionBadge: string
  ctaHref?: string
}

export function SceneCTA({
  start = 22.9,
  end = 30,
  tagline,
  ctaLabel,
  frictionBadge,
  ctaHref = 'https://devs.new',
}: SceneCTAProps) {
  const { width: stageW, height: stageH } = useStageSize()
  const t = useStageT()
  const taglineText = t(tagline)
  const ctaLabelText = t(ctaLabel)
  const frictionBadgeText = t(frictionBadge)

  return (
    <Sprite start={start} end={end}>
      {({ localTime }) => {
        const time = localTime
        const inT = clamp(time / 0.6, 0, 1)
        const tagT = clamp((time - 1.6) / 0.7, 0, 1)
        const ctaT = clamp((time - 2.4) / 0.6, 0, 1)
        const fricT = clamp((time - 3.0) / 0.5, 0, 1)
        const breathe = 1 + Math.sin(time * 1.8) * 0.025

        const sphereSize = Math.round(
          Math.min(160, Math.max(64, stageW * 0.18)),
        )
        const nameFontSize = Math.round(
          Math.min(96, Math.max(36, stageW * 0.13)),
        )
        const taglineFontSize = Math.round(
          Math.min(26, Math.max(13, stageW * 0.034)),
        )
        const ctaFontSize = Math.round(
          Math.min(22, Math.max(13, stageW * 0.03)),
        )
        const badgeFontSize = Math.round(
          Math.min(13, Math.max(10, stageW * 0.017)),
        )
        const ctaPadV = Math.round(Math.min(14, Math.max(9, stageW * 0.015)))
        const ctaPadH = Math.round(Math.min(36, Math.max(18, stageW * 0.044)))
        const gap = Math.round(Math.max(10, Math.min(28, stageH * 0.028)))

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'oklch(12% 0.0015 253.83)',
              opacity: inT,
            }}
          >
            <BackgroundOrbit cx={960} cy={540} t={time + 10} />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap,
                pointerEvents: 'none',
              }}
            >
              <div style={{ transform: `scale(${breathe})`, flexShrink: 0 }}>
                <TourSphere size={sphereSize} color="#6aa1ff" intensity={1.4} />
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontFamily: "'Unbounded', Georgia, serif",
                  fontSize: nameFontSize,
                  fontWeight: 500,
                  letterSpacing: '0.12em',
                  color: '#f2f4f8',
                  opacity: inT,
                  lineHeight: 1,
                }}
              >
                {PRODUCT.displayName}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontFamily: "'Unbounded', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: taglineFontSize,
                  color: '#d7dbe0',
                  opacity: tagT,
                  transform: `translateY(${(1 - tagT) * 10}px)`,
                }}
              >
                {taglineText}
              </div>

              <style>{`@keyframes tour-cta-pulse {
                0%, 100% { box-shadow: 0 0 24px oklch(72% 0.16 253 / 0.4); }
                50% { box-shadow: 0 0 56px oklch(72% 0.16 253 / 0.8); }
              }`}</style>
              <div
                style={{
                  transform: `scale(${ctaT})`,
                  opacity: ctaT,
                  fontFamily: "'Geist', ui-monospace, monospace",
                  fontSize: ctaFontSize,
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  color: '#0b0d10',
                  background: '#f2f4f8',
                  padding: `${ctaPadV}px ${ctaPadH}px`,
                  borderRadius: 999,
                  animation: 'tour-cta-pulse 1.8s ease-in-out infinite',
                  pointerEvents: ctaT > 0.9 ? 'auto' : 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  window.location.href = ctaHref
                }}
              >
                {ctaLabelText}
              </div>

              <div
                style={{
                  textAlign: 'center',
                  fontFamily: "'Geist', ui-monospace, monospace",
                  fontSize: badgeFontSize,
                  letterSpacing: '0.16em',
                  color: 'oklch(72% 0.16 253)',
                  opacity: fricT,
                }}
              >
                {frictionBadgeText}
              </div>
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
