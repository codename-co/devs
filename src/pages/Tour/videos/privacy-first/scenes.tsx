/**
 * Privacy-first tour — two new scene components.
 *
 * SceneBrowserLocal  (2.4–9s)   Padlock + three tech labels inside browser chrome
 * SceneBYOK          (8.9–15s)  Settings panel with 6 LLM providers
 */
import { useI18n } from '@/i18n'
import {
  clamp,
  Easing,
  Sprite,
  useStageSize,
  useTimeline,
} from '../../common/assets/player'
import { BrowserChrome, FakeCursor } from '../../common/primitives'
import privacyFirstI18n from './i18n'

interface SceneProps {
  start?: number
  end?: number
}

// ── Padlock SVG ───────────────────────────────────────────────────────────

function PadlockIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

// ── Scene 2: Browser local ────────────────────────────────────────────────

const TECH_LABELS = [
  { key: 'IndexedDB', subtitle: 'Local storage', at: 1.0, side: 'left' },
  { key: 'Web Crypto', subtitle: 'Encrypted keys', at: 2.0, side: 'right' },
  {
    key: 'Service Worker',
    subtitle: 'Offline ready',
    at: 3.0,
    side: 'bottom',
  },
] as const

export function SceneBrowserLocal({ start = 2.4, end = 9 }: SceneProps) {
  const { t } = useI18n(privacyFirstI18n)
  const { width: stageW } = useStageSize()

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const chromeIn = Easing.easeOutBack(clamp(time / 0.5, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const exitOpacity = 1 - exitT

        const chromeInset = Math.round(
          Math.min(40, Math.max(8, stageW * 0.031)),
        )

        const lockSize = Math.round(Math.min(120, Math.max(48, stageW * 0.1)))
        const lockIn = Easing.easeOutBack(clamp((time - 0.4) / 0.5, 0, 1))

        const labelFz = Math.round(Math.max(13, stageW * 0.022))
        const subtitleFz = Math.round(Math.max(10, stageW * 0.015))

        // Dotted border animation
        const borderIn = clamp((time - 0.8) / 0.6, 0, 1)

        return (
          <div style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}>
            <BrowserChrome
              inset={chromeInset}
              scale={chromeScale}
              opacity={chromeOpacity}
            >
              {/* Dotted containment border */}
              <div
                style={{
                  position: 'absolute',
                  inset: 12,
                  border: '2px dashed oklch(72% 0.16 253 / 0.3)',
                  borderRadius: 12,
                  opacity: borderIn,
                  pointerEvents: 'none',
                }}
              />

              {/* Central content */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8f9fb',
                }}
              >
                {/* Lock + labels container */}
                <div
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: lockSize * 4,
                    height: lockSize * 3,
                  }}
                >
                  {/* Padlock */}
                  <div
                    style={{
                      opacity: lockIn,
                      transform: `scale(${lockIn})`,
                      transformOrigin: 'center',
                    }}
                  >
                    <PadlockIcon size={lockSize} color="oklch(72% 0.16 253)" />
                  </div>

                  {/* Tech labels */}
                  {TECH_LABELS.map((label) => {
                    const lt = clamp((time - label.at) / 0.5, 0, 1)
                    const eased = Easing.easeOutBack(lt)
                    const yOff = (1 - eased) * 20

                    const positionStyle: React.CSSProperties =
                      label.side === 'left'
                        ? {
                            position: 'absolute' as const,
                            right: `calc(50% + ${lockSize * 0.7}px)`,
                            top: '50%',
                            transform: `translateY(calc(-50% + ${yOff}px))`,
                            textAlign: 'right' as const,
                          }
                        : label.side === 'right'
                          ? {
                              position: 'absolute' as const,
                              left: `calc(50% + ${lockSize * 0.7}px)`,
                              top: '50%',
                              transform: `translateY(calc(-50% + ${yOff}px))`,
                              textAlign: 'left' as const,
                            }
                          : {
                              position: 'absolute' as const,
                              left: '50%',
                              top: `calc(50% + ${lockSize * 0.7}px)`,
                              transform: `translate(-50%, ${yOff}px)`,
                              textAlign: 'center' as const,
                            }

                    return (
                      <div
                        key={label.key}
                        style={{
                          ...positionStyle,
                          opacity: lt,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Geist', ui-monospace, monospace",
                            fontSize: labelFz,
                            fontWeight: 600,
                            color: '#1a1d22',
                            letterSpacing: '0.02em',
                          }}
                        >
                          {t(label.key)}
                        </div>
                        <div
                          style={{
                            fontFamily: "'Geist', ui-monospace, monospace",
                            fontSize: subtitleFz,
                            color: '#6b7280',
                            marginTop: 2,
                          }}
                        >
                          {t(label.subtitle)}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </BrowserChrome>
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 3: BYOK ─────────────────────────────────────────────────────────

const PROVIDERS = [
  { name: 'OpenAI', color: '#10a37f' },
  { name: 'Anthropic', color: '#d4a574' },
  { name: 'Gemini', color: '#4285f4' },
  { name: 'Ollama', color: '#ffffff' },
  { name: 'OpenRouter', color: '#9333ea' },
  { name: 'Local (WebGPU)', color: '#f59e0b' },
] as const

export function SceneBYOK({ start = 8.9, end = 15 }: SceneProps) {
  const { t } = useI18n(privacyFirstI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  // Cursor click target: second row
  const CURSOR_OFF_FRAC = { x: 0.88, y: 0.96 }
  const CURSOR_ROW_FRAC = { x: 0.62, y: 0.48 }
  const CURSOR_ENTER = 3.0
  const MOVE_END = 3.8
  const CLICK_END = 4.05
  const SHOW_KEY_INPUT = 4.05
  const KEY_INPUT_DURATION = 1.2

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const chromeIn = Easing.easeOutBack(clamp(time / 0.5, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const exitOpacity = 1 - exitT

        const chromeInset = Math.round(
          Math.min(40, Math.max(8, stageW * 0.031)),
        )

        const headerFz = Math.round(Math.max(14, stageW * 0.024))
        const rowFz = Math.round(Math.max(12, stageW * 0.018))
        const badgeFz = Math.round(Math.max(9, stageW * 0.013))
        const captionFz = Math.round(Math.max(13, stageW * 0.02))
        const panelW = Math.round(Math.min(420, Math.max(240, stageW * 0.38)))
        const rowH = Math.round(Math.max(32, stageW * 0.038))
        const dotSize = Math.round(Math.max(8, stageW * 0.012))

        // Cursor
        const showCursor = stageW >= 700
        const toCursor = (frac: { x: number; y: number }) => ({
          x: frac.x * stageW,
          y: frac.y * stageH,
        })
        const cursorOff = toCursor(CURSOR_OFF_FRAC)
        const cursorRow =
          resolveAnchor?.('[data-tour-anchor="active-provider"]') ??
          toCursor(CURSOR_ROW_FRAC)

        let cursorPos: { x: number; y: number } | null = null
        if (showCursor && time >= CURSOR_ENTER && time < MOVE_END) {
          const k = Easing.easeInOutCubic(
            clamp((time - CURSOR_ENTER) / (MOVE_END - CURSOR_ENTER), 0, 1),
          )
          cursorPos = {
            x: cursorOff.x + (cursorRow.x - cursorOff.x) * k,
            y: cursorOff.y + (cursorRow.y - cursorOff.y) * k,
          }
        } else if (showCursor && time >= MOVE_END) {
          cursorPos = cursorRow
        }

        const click =
          showCursor && time >= MOVE_END && time < CLICK_END
            ? (time - MOVE_END) / (CLICK_END - MOVE_END)
            : 0

        // Key input state for Anthropic row (index 1)
        const showKeyInput =
          time >= SHOW_KEY_INPUT && time < SHOW_KEY_INPUT + KEY_INPUT_DURATION

        // Caption
        const captionIn = clamp((time - 1.5) / 0.5, 0, 1)

        return (
          <div style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}>
            <BrowserChrome
              inset={chromeInset}
              scale={chromeScale}
              opacity={chromeOpacity}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#f8f9fb',
                  gap: Math.round(stageW * 0.02),
                }}
              >
                {/* Settings panel */}
                <div
                  style={{
                    width: panelW,
                    background: '#ffffff',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: 12,
                    overflow: 'hidden',
                  }}
                >
                  {/* Header */}
                  <div
                    style={{
                      padding: `${Math.round(rowH * 0.4)}px ${Math.round(rowH * 0.5)}px`,
                      borderBottom: '1px solid #e5e7eb',
                      fontFamily: "'Unbounded', Georgia, serif",
                      fontSize: headerFz,
                      fontWeight: 600,
                      color: '#1a1d22',
                    }}
                  >
                    {t('LLM Providers')}
                  </div>

                  {/* Provider rows */}
                  {PROVIDERS.map((provider, i) => {
                    const stagger = 0.5 + i * 0.3
                    const rowIn = clamp((time - stagger) / 0.4, 0, 1)
                    const rowEased = Easing.easeOutCubic(rowIn)

                    const isActiveRow = i === 1 && showKeyInput

                    return (
                      <div
                        key={provider.name}
                        data-tour-anchor={
                          i === 1 ? 'active-provider' : undefined
                        }
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: `0 ${Math.round(rowH * 0.5)}px`,
                          height: rowH,
                          borderBottom:
                            i < PROVIDERS.length - 1
                              ? '1px solid #f0f0f0'
                              : 'none',
                          opacity: rowEased,
                          transform: `translateX(${(1 - rowEased) * 16}px)`,
                          background: isActiveRow
                            ? 'oklch(97% 0.01 253)'
                            : 'transparent',
                          transition: 'background 0.2s',
                        }}
                      >
                        {/* Provider dot */}
                        <span
                          style={{
                            width: dotSize,
                            height: dotSize,
                            borderRadius: dotSize / 2,
                            background: provider.color,
                            border:
                              provider.color === '#ffffff'
                                ? '1px solid #d1d5db'
                                : 'none',
                            flexShrink: 0,
                          }}
                        />
                        {/* Provider name */}
                        <span
                          style={{
                            flex: 1,
                            marginLeft: Math.round(dotSize * 1.2),
                            fontFamily: "'Geist', ui-monospace, monospace",
                            fontSize: rowFz,
                            color: '#1a1d22',
                          }}
                        >
                          {t(provider.name)}
                        </span>
                        {/* Status */}
                        <span
                          style={{
                            fontFamily: "'Geist', ui-monospace, monospace",
                            fontSize: badgeFz,
                            color: isActiveRow
                              ? 'oklch(72% 0.16 253)'
                              : '#9ca3af',
                            letterSpacing: isActiveRow ? '0.05em' : '0.12em',
                          }}
                        >
                          {isActiveRow ? 'sk-ant-••••••' : '••••••••'}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Caption */}
                <div
                  style={{
                    fontFamily: "'Geist', ui-monospace, monospace",
                    fontSize: captionFz,
                    color: '#6b7280',
                    letterSpacing: '0.03em',
                    textAlign: 'center',
                    opacity: captionIn,
                    transform: `translateY(${(1 - captionIn) * 8}px)`,
                  }}
                >
                  {t('12+ providers. Your keys. Your choice.')}
                </div>
              </div>
            </BrowserChrome>

            {/* Fake cursor */}
            {cursorPos && (
              <FakeCursor
                x={cursorPos.x}
                y={cursorPos.y}
                clickProgress={click}
              />
            )}
          </div>
        )
      }}
    </Sprite>
  )
}
