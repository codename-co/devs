/**
 * Task-delegation tour — scene components.
 *
 * SceneConnectors     (2.4–9s)   Real Settings layout with connector wizard flow
 * ScenePromptSubmit   (8.9–13s)  Browser chrome with typed prompt + submit
 * SceneSwarmStream    (12.9–22s) Real ThreadPreview with steps + PPTX widget
 * SceneEmailDraft     (21.9–28s) Gmail compose view with PPTX attachment
 */
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { useI18n } from '@/i18n'
import { NewTaskHero } from '@/pages/Workspace/pages/NewTaskHero'
import { Sidebar, ThreadList, ThreadPreview } from '@/pages/Workspace/components'
import type { Thread } from '@/pages/Workspace/types'
import type { Artifact, MessageStep, Task } from '@/types'
import {
  clamp,
  Easing,
  Sprite,
  useSprite,
  useStageSize,
  useTimeline,
} from '../../common/assets/player'
import {
  BrowserChrome,
  BrowserChromeTyping,
  FakeCursor,
} from '../../common/primitives'
import taskDelegationI18n from './i18n'

interface SceneProps {
  start?: number
  end?: number
}

function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tNorm: number,
) {
  const k = Easing.easeInOutCubic(clamp(tNorm, 0, 1))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

const noop = () => {}
const t0 = new Date(0)

// ═══════════════════════════════════════════════════════════════════════════
// Scene 2 — Real user journey: Homepage → Sidebar Settings → Modal → Connectors
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Phases (scene-local time):
 *   0.0–1.0  Homepage appears (real NewTaskHero inside browser chrome)
 *   1.0–1.8  Cursor glides to the Settings ⚙️ gear in the collapsed sidebar
 *   1.8–2.0  Click on Settings
 *   2.0–2.8  Settings modal slides in (General section visible)
 *   2.8–3.4  Cursor moves to "Connectors" nav item, click
 *   3.4–4.2  ProviderGrid visible
 *   4.2–5.0  OAuth Drive spinner
 *   5.0–5.8  Success Drive
 *   5.8–6.6  OAuth Gmail spinner
 *   6.6–7.4  Success Gmail
 *   7.4–8.6  Both connected list, fade out
 */

// Providers matching the real ProviderGrid
interface ProviderDef {
  id: string
  name: string
  icon: string
  color: string
  desc: string
}

const PROVIDERS: ProviderDef[] = [
  { id: 'google-drive', name: 'Google Drive', icon: '📁', color: '#4285f4', desc: 'Sync files and folders' },
  { id: 'gmail', name: 'Gmail', icon: '✉️', color: '#ea4335', desc: 'Sync emails' },
  { id: 'notion', name: 'Notion', icon: '📝', color: '#000000', desc: 'Sync pages' },
  { id: 'slack', name: 'Slack', icon: '💬', color: '#4a154b', desc: 'Sync messages' },
  { id: 'dropbox', name: 'Dropbox', icon: '📦', color: '#0061fe', desc: 'Sync files' },
  { id: 'figma', name: 'Figma', icon: '🎨', color: '#f24e1e', desc: 'Sync designs' },
]

// Settings sidebar nav items (mirrors real SettingsContent)
const NAV_ITEMS = [
  { key: '', icon: '⚙️', label: 'Settings' },
  { key: 'providers', icon: '✨', label: 'AI Providers' },
  { key: 'features', icon: '🧊', label: 'Features' },
  { key: 'skills', icon: '🧩', label: 'Skills' },
  { key: 'connectors', icon: '🔌', label: 'Connectors' },
] as const

type ModalPhase =
  | 'general'        // Settings General section
  | 'grid'           // ProviderGrid
  | 'oauth-drive'
  | 'success-drive'
  | 'oauth-gmail'
  | 'success-gmail'
  | 'done'

function getModalPhase(modalTime: number): ModalPhase {
  if (modalTime < 0.8) return 'general'
  if (modalTime < 2.2) return 'grid'
  if (modalTime < 3.0) return 'oauth-drive'
  if (modalTime < 3.8) return 'success-drive'
  if (modalTime < 4.6) return 'oauth-gmail'
  if (modalTime < 5.4) return 'success-gmail'
  return 'done'
}

function SettingsNavSidebar({
  fontSize,
  activeKey,
}: {
  fontSize: number
  activeKey: string
}) {
  return (
    <div
      style={{
        width: 155,
        borderRight: '1px solid #e5e7eb',
        background: '#fafbfc',
        padding: '14px 0',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
        flexShrink: 0,
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          fontFamily: "'Unbounded', Georgia, serif",
          fontSize: fontSize + 1,
          fontWeight: 600,
          color: '#1a1d22',
          padding: '4px 14px 10px',
        }}
      >
        Settings
      </div>
      {NAV_ITEMS.map((item) => {
        const isActive = item.key === activeKey
        return (
          <div
            key={item.key}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '6px 14px',
              borderRadius: 8,
              margin: '0 6px',
              fontSize: fontSize - 1,
              fontFamily: 'Figtree, system-ui, sans-serif',
              color: isActive ? '#1a1d22' : '#6b7280',
              fontWeight: isActive ? 600 : 400,
              background: isActive ? '#e5e7eb' : 'transparent',
            }}
          >
            <span style={{ fontSize: fontSize - 1 }}>{item.icon}</span>
            {item.label}
          </div>
        )
      })}
    </div>
  )
}

function ProviderGridView({ fontSize, t }: { fontSize: number; t: (k: any) => string }) {
  return (
    <div style={{ padding: '14px 20px' }}>
      <div
        style={{
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontSize: fontSize - 1,
          color: '#6b7280',
          marginBottom: 12,
        }}
      >
        {t('Choose a service to connect:')}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 10,
        }}
      >
        {PROVIDERS.map((p) => (
          <div
            key={p.id}
            style={{
              border: '1.5px solid #e5e7eb',
              borderRadius: 12,
              padding: '12px 8px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 5,
              background: '#fff',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 9,
                background: `${p.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
              }}
            >
              {p.icon}
            </div>
            <span
              style={{
                fontFamily: 'Figtree, system-ui, sans-serif',
                fontSize: fontSize - 1,
                fontWeight: 600,
                color: '#1a1d22',
                textAlign: 'center',
              }}
            >
              {p.name}
            </span>
            <span
              style={{
                fontFamily: 'Figtree, system-ui, sans-serif',
                fontSize: Math.max(7, fontSize - 3),
                color: '#9ca3af',
                textAlign: 'center',
              }}
            >
              {p.desc}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function OAuthView({
  provider,
  spinProgress,
  fontSize,
  t,
}: {
  provider: ProviderDef
  spinProgress: number
  fontSize: number
  t: (k: any) => string
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 20px',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 14,
          background: `${provider.color}15`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 24,
        }}
      >
        {provider.icon}
      </div>
      <div
        style={{
          fontFamily: "'Unbounded', Georgia, serif",
          fontSize: fontSize + 1,
          fontWeight: 600,
          color: '#1a1d22',
        }}
      >
        {t(`Connecting to ${provider.name}...`)}
      </div>
      <div
        style={{
          width: 22,
          height: 22,
          border: `3px solid ${provider.color}30`,
          borderTop: `3px solid ${provider.color}`,
          borderRadius: '50%',
          transform: `rotate(${spinProgress * 720}deg)`,
        }}
      />
    </div>
  )
}

function SuccessView({
  provider,
  progress,
  fontSize,
  t,
}: {
  provider: ProviderDef
  progress: number
  fontSize: number
  t: (k: any) => string
}) {
  const checkScale = Easing.easeOutBack(clamp(progress / 0.4, 0, 1))
  const textOpacity = clamp((progress - 0.2) / 0.4, 0, 1)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px',
        gap: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          borderRadius: 24,
          background: '#dcfce7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${checkScale})`,
          fontSize: 24,
        }}
      >
        ✓
      </div>
      <div
        style={{
          fontFamily: "'Unbounded', Georgia, serif",
          fontSize: fontSize + 1,
          fontWeight: 600,
          color: '#1a1d22',
          opacity: textOpacity,
        }}
      >
        {t('Successfully connected!')}
      </div>
      <div
        style={{
          background: '#f9fafb',
          borderRadius: 10,
          padding: 12,
          width: '80%',
          maxWidth: 260,
          opacity: textOpacity,
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: `${provider.color}15`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 15,
            }}
          >
            {provider.icon}
          </div>
          <span
            style={{
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontSize: fontSize - 1,
              fontWeight: 600,
              color: '#1a1d22',
            }}
          >
            {provider.name}
          </span>
        </div>
        {[t('Connected and authorized'), t('Auto-sync enabled')].map(
          (label, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                fontFamily: 'Figtree, system-ui, sans-serif',
                fontSize: fontSize - 2,
                color: '#4b5563',
              }}
            >
              <span style={{ color: '#22c55e', fontSize: fontSize - 2 }}>✓</span>
              {label}
            </div>
          ),
        )}
      </div>
    </div>
  )
}

function ConnectedListView({
  fontSize,
  t,
}: {
  fontSize: number
  t: (k: any) => string
}) {
  const cards = [PROVIDERS[0], PROVIDERS[1]]
  return (
    <div style={{ padding: '14px 20px' }}>
      <div
        style={{
          fontFamily: 'Figtree, system-ui, sans-serif',
          fontSize: fontSize - 1,
          color: '#6b7280',
          marginBottom: 12,
        }}
      >
        {t('Connectors')}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {cards.map((p) => (
          <div
            key={p.id}
            style={{
              border: `1.5px solid ${p.color}40`,
              borderRadius: 12,
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: '#fff',
              boxShadow: `0 2px 12px ${p.color}10`,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `${p.color}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
              }}
            >
              {p.icon}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontFamily: 'Figtree, system-ui, sans-serif',
                  fontSize: fontSize - 1,
                  fontWeight: 600,
                  color: '#1a1d22',
                }}
              >
                {p.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    background: '#22c55e',
                  }}
                />
                <span
                  style={{
                    fontFamily: 'Figtree, system-ui, sans-serif',
                    fontSize: fontSize - 2,
                    color: '#22c55e',
                    fontWeight: 600,
                  }}
                >
                  Connected
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** General settings placeholder shown before navigating to Connectors */
function GeneralSectionPlaceholder({ fontSize }: { fontSize: number }) {
  return (
    <div style={{ padding: '14px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Fake settings rows */}
      {['Language', 'Theme', 'Default model'].map((label) => (
        <div
          key={label}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #f3f4f6',
          }}
        >
          <span
            style={{
              fontFamily: 'Figtree, system-ui, sans-serif',
              fontSize: fontSize - 1,
              color: '#374151',
            }}
          >
            {label}
          </span>
          <div
            style={{
              width: 80,
              height: 28,
              borderRadius: 8,
              background: '#f3f4f6',
            }}
          />
        </div>
      ))}
    </div>
  )
}

// Cursor waypoints as fractions of stage size
const SETTINGS_GEAR_FRAC = { x: 0.038, y: 0.92 } // Sidebar bottom-left area
const CONNECTORS_NAV_FRAC = { x: 0.30, y: 0.52 }  // "Connectors" nav in modal

export function SceneConnectors({ start = 2.4, end = 11 }: SceneProps) {
  const { t } = useI18n(taskDelegationI18n)
  const { width: stageW, height: stageH } = useStageSize()

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)

        // Phase 1: Homepage appears
        const chromeIn = Easing.easeOutBack(clamp(time / 0.6, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)
        const pageIn = Easing.easeOutCubic(clamp((time - 0.3) / 0.5, 0, 1))

        // Phase 2: Cursor moves to Settings gear and clicks
        const showCursor = stageW >= 600
        const cursorStart = { x: 0.5 * stageW, y: 0.5 * stageH }
        const gearTarget = { x: SETTINGS_GEAR_FRAC.x * stageW, y: SETTINGS_GEAR_FRAC.y * stageH }
        const CURSOR_MOVE_START = 1.0
        const CURSOR_MOVE_END = 1.6
        const CLICK_START = 1.6
        const CLICK_END = 1.8

        let cursorPos: { x: number; y: number } | null = null
        let clickProgress = 0
        if (showCursor && time >= CURSOR_MOVE_START && time < CLICK_END + 0.2) {
          if (time < CURSOR_MOVE_END) {
            cursorPos = lerpPoint(
              cursorStart,
              gearTarget,
              (time - CURSOR_MOVE_START) / (CURSOR_MOVE_END - CURSOR_MOVE_START),
            )
          } else {
            cursorPos = gearTarget
          }
          if (time >= CLICK_START && time < CLICK_END) {
            clickProgress = (time - CLICK_START) / (CLICK_END - CLICK_START)
          }
        }

        // Phase 3: Modal slides in
        const modalVisible = time >= 2.0
        const modalSlideIn = Easing.easeOutCubic(clamp((time - 2.0) / 0.5, 0, 1))
        const modalTime = Math.max(0, time - 2.0)
        const modalPhase = getModalPhase(modalTime)
        const modalActiveNav = modalPhase === 'general' ? '' : 'connectors'

        // Phase 4: Cursor moves to Connectors nav in modal
        const connectorsTarget = { x: CONNECTORS_NAV_FRAC.x * stageW, y: CONNECTORS_NAV_FRAC.y * stageH }
        const NAV_MOVE_START = 2.4
        const NAV_MOVE_END = 2.8
        const NAV_CLICK_START = 2.8
        const NAV_CLICK_END = 3.0
        let cursorPos2: { x: number; y: number } | null = null
        let clickProgress2 = 0
        if (showCursor && time >= NAV_MOVE_START && time < NAV_CLICK_END + 0.2) {
          if (time < NAV_MOVE_END) {
            cursorPos2 = lerpPoint(
              gearTarget,
              connectorsTarget,
              (time - NAV_MOVE_START) / (NAV_MOVE_END - NAV_MOVE_START),
            )
          } else {
            cursorPos2 = connectorsTarget
          }
          if (time >= NAV_CLICK_START && time < NAV_CLICK_END) {
            clickProgress2 = (time - NAV_CLICK_START) / (NAV_CLICK_END - NAV_CLICK_START)
          }
        }

        // Determine which cursor to show
        const activeCursor = cursorPos2 ?? cursorPos
        const activeClick = cursorPos2 ? clickProgress2 : clickProgress

        // Wizard phase progress values
        const oauthDriveT = clamp((modalTime - 2.2) / 0.8, 0, 1)
        const successDriveT = clamp((modalTime - 3.0) / 0.8, 0, 1)
        const oauthGmailT = clamp((modalTime - 3.8) / 0.8, 0, 1)
        const successGmailT = clamp((modalTime - 4.6) / 0.8, 0, 1)

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fontSize = Math.round(Math.min(13, Math.max(10, stageW * 0.015)))
        const showNav = stageW >= 600

        // Homepage opacity fades when modal appears
        const homepageDim = modalVisible ? 0.3 : 1

        return (
          <div style={{ position: 'absolute', inset: 0, opacity: 1 - exitT }}>
            {/* Browser chrome with real homepage */}
            <BrowserChrome
              inset={chromeInset}
              url="devs.new"
              scale={chromeScale}
              opacity={chromeOpacity}
            >
              <div
                className="bg-background flex h-full w-full overflow-hidden"
                style={{ height: '100%' }}
              >
                {/* Real collapsed sidebar */}
                <div className="shrink-0" style={{ opacity: homepageDim, transition: 'opacity 0.3s' }}>
                  <Sidebar
                    isCollapsed
                    activeFilter="home"
                    onFilterChange={noop}
                    onOpenSettings={noop}
                  />
                </div>
                {/* Real homepage */}
                <div
                  className="min-w-0 flex-1"
                  style={{
                    opacity: pageIn * homepageDim,
                    transform: `scale(${0.96 + 0.04 * pageIn})`,
                    transformOrigin: 'center top',
                    transition: 'opacity 0.3s',
                  }}
                >
                  <NewTaskHero
                    autoFocus={false}
                    showUseCases={false}
                    className="flex h-full min-h-0 flex-1 flex-col"
                    demo
                  />
                </div>
              </div>
            </BrowserChrome>

            {/* Settings Modal overlay — slides up from bottom like real Modal */}
            {modalVisible && (
              <div
                style={{
                  position: 'absolute',
                  left: chromeInset,
                  right: chromeInset,
                  top: chromeInset,
                  bottom: chromeInset,
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  pointerEvents: 'none',
                  zIndex: 50,
                }}
              >
                {/* Backdrop blur */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0,0,0,0.25)',
                    backdropFilter: 'blur(4px)',
                    borderRadius: 16,
                    opacity: modalSlideIn,
                  }}
                />
                {/* Modal card */}
                <div
                  style={{
                    position: 'relative',
                    width: '92%',
                    maxWidth: 700,
                    height: '80%',
                    background: '#ffffff',
                    borderRadius: '16px 16px 0 0',
                    boxShadow: '0 -8px 40px rgba(0,0,0,0.15)',
                    overflow: 'hidden',
                    transform: `translateY(${(1 - modalSlideIn) * 100}%)`,
                    opacity: modalSlideIn,
                    display: 'flex',
                  }}
                >
                  {/* Settings nav sidebar inside modal */}
                  {showNav && (
                    <SettingsNavSidebar
                      fontSize={fontSize}
                      activeKey={modalActiveNav}
                    />
                  )}

                  {/* Content area */}
                  <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                    {/* Progress bar (only for wizard phases) */}
                    {modalPhase !== 'general' && (
                      <div
                        style={{
                          height: 3,
                          background: '#e5e7eb',
                          position: 'relative',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            background: 'oklch(62.04% 0.195 253.83)',
                            width: `${modalPhase === 'grid' ? 25 : modalPhase === 'oauth-drive' || modalPhase === 'oauth-gmail' ? 50 : modalPhase === 'success-drive' || modalPhase === 'success-gmail' ? 75 : 100}%`,
                            transition: 'width 0.3s',
                            borderRadius: 2,
                          }}
                        />
                      </div>
                    )}

                    {/* Phase content */}
                    <div style={{ height: modalPhase === 'general' ? '100%' : 'calc(100% - 3px)', overflow: 'hidden' }}>
                      {modalPhase === 'general' && (
                        <GeneralSectionPlaceholder fontSize={fontSize} />
                      )}
                      {modalPhase === 'grid' && (
                        <ProviderGridView fontSize={fontSize} t={t} />
                      )}
                      {modalPhase === 'oauth-drive' && (
                        <OAuthView
                          provider={PROVIDERS[0]}
                          spinProgress={oauthDriveT}
                          fontSize={fontSize}
                          t={t}
                        />
                      )}
                      {modalPhase === 'success-drive' && (
                        <SuccessView
                          provider={PROVIDERS[0]}
                          progress={successDriveT}
                          fontSize={fontSize}
                          t={t}
                        />
                      )}
                      {modalPhase === 'oauth-gmail' && (
                        <OAuthView
                          provider={PROVIDERS[1]}
                          spinProgress={oauthGmailT}
                          fontSize={fontSize}
                          t={t}
                        />
                      )}
                      {modalPhase === 'success-gmail' && (
                        <SuccessView
                          provider={PROVIDERS[1]}
                          progress={successGmailT}
                          fontSize={fontSize}
                          t={t}
                        />
                      )}
                      {modalPhase === 'done' && (
                        <ConnectedListView fontSize={fontSize} t={t} />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Animated cursor */}
            {activeCursor && time < 3.2 && (
              <FakeCursor
                x={activeCursor.x}
                y={activeCursor.y}
                clickProgress={activeClick}
              />
            )}
          </div>
        )
      }}
    </Sprite>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 3 — Prompt Submit
// ═══════════════════════════════════════════════════════════════════════════

const CURSOR_OFF_FRAC = { x: 0.88, y: 0.96 }
const CURSOR_SUBMIT_FRAC = { x: 0.66, y: 0.80 }

export function ScenePromptSubmit({ start = 10.9, end = 15 }: SceneProps) {
  const { t } = useI18n(taskDelegationI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  const prompt = t(
    'Analyze last month\u2019s sales invoices from Drive, calculate quarterly projections, and generate a PPTX deck with an email draft to the client',
  )

  const toCursor = (frac: { x: number; y: number }) => ({
    x: frac.x * stageW,
    y: frac.y * stageH,
  })

  const CURSOR_ENTER = 2.6
  const MOVE_END = 3.4
  const CLICK_END = 3.65

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const exitT = clamp((time - (duration - 0.4)) / 0.4, 0, 1)
        const exitOpacity = 1 - exitT

        const chromeIn = Easing.easeOutBack(clamp(time / 0.5, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)
        const urlProgress = clamp((time - 0.2) / 0.8, 0, 1)

        // Prompt text reveal
        const promptIn = Easing.easeOutCubic(clamp((time - 0.4) / 1.6, 0, 1))
        const charCount = Math.floor(prompt.length * promptIn)

        // Connected badges
        const badgeIn = Easing.easeOutCubic(clamp((time - 0.6) / 0.5, 0, 1))

        // Cursor
        const showCursor = stageW >= 700
        const cursorOff = toCursor(CURSOR_OFF_FRAC)
        const cursorSubmit =
          resolveAnchor?.('[data-tour-anchor="submit"]') ??
          toCursor(CURSOR_SUBMIT_FRAC)
        let cursorPos: { x: number; y: number } | null = null
        if (showCursor && time >= CURSOR_ENTER && time < MOVE_END) {
          cursorPos = lerpPoint(
            cursorOff,
            cursorSubmit,
            (time - CURSOR_ENTER) / (MOVE_END - CURSOR_ENTER),
          )
        } else if (showCursor && time >= MOVE_END) {
          cursorPos = cursorSubmit
        }
        const click =
          showCursor && time >= MOVE_END && time < CLICK_END
            ? (time - MOVE_END) / (CLICK_END - MOVE_END)
            : 0

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fz = Math.round(Math.min(15, Math.max(10, stageW * 0.016)))

        return (
          <div style={{ position: 'absolute', inset: 0, opacity: exitOpacity }}>
            <BrowserChromeTyping
              inset={chromeInset}
              urlText="devs.new"
              urlProgress={urlProgress}
              scale={chromeScale}
              opacity={chromeOpacity}
              tabTitle={false}
            >
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '6% 8%',
                  background: '#f8f9fb',
                  gap: 12,
                }}
              >
                {/* Connected connector badges */}
                <div
                  style={{
                    display: 'flex',
                    gap: 10,
                    opacity: badgeIn,
                    transform: `translateY(${(1 - badgeIn) * 10}px)`,
                    marginBottom: 4,
                  }}
                >
                  {[
                    { icon: '📁', label: 'Drive', color: '#4285f4' },
                    { icon: '✉️', label: 'Gmail', color: '#ea4335' },
                  ].map(({ icon, label, color }) => (
                    <div
                      key={label}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '4px 10px',
                        borderRadius: 999,
                        background: `${color}12`,
                        border: `1px solid ${color}30`,
                        fontFamily: "'Geist', ui-monospace, monospace",
                        fontSize: Math.max(9, fz - 4),
                        fontWeight: 600,
                        color,
                      }}
                    >
                      <span>{icon}</span>
                      {label}
                      <span style={{ color: '#22c55e', fontSize: 9 }}>●</span>
                    </div>
                  ))}
                </div>

                {/* Prompt input area */}
                <div
                  style={{
                    width: '100%',
                    maxWidth: 560,
                    background: '#ffffff',
                    border: '1.5px solid #d7dbe0',
                    borderRadius: 16,
                    padding: '16px 20px',
                    fontFamily: 'Figtree, system-ui, sans-serif',
                    fontSize: fz,
                    color: '#1a1d22',
                    lineHeight: 1.5,
                    minHeight: 80,
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  {prompt.slice(0, charCount)}
                  {charCount < prompt.length && (
                    <span
                      style={{
                        display: 'inline-block',
                        width: 1.5,
                        height: '1.1em',
                        marginLeft: 2,
                        background: 'oklch(62.04% 0.195 253.83)',
                        verticalAlign: 'text-bottom',
                        animation: 'devs-caret 0.9s steps(1) infinite',
                      }}
                    />
                  )}
                </div>

                {/* Submit button */}
                <div
                  data-tour-anchor="submit"
                  style={{
                    marginTop: 4,
                    padding: '10px 32px',
                    background:
                      click > 0
                        ? 'oklch(55% 0.195 253.83)'
                        : 'oklch(62.04% 0.195 253.83)',
                    color: '#fff',
                    borderRadius: 999,
                    fontFamily: "'Geist', ui-monospace, monospace",
                    fontSize: fz,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    transform: click > 0 ? 'scale(0.96)' : 'scale(1)',
                    transition: 'transform 0.1s',
                    boxShadow: '0 2px 8px oklch(62% 0.195 253 / 0.3)',
                  }}
                >
                  Submit
                </div>
              </div>
            </BrowserChromeTyping>

            {cursorPos && (
              <FakeCursor x={cursorPos.x} y={cursorPos.y} clickProgress={click} />
            )}
          </div>
        )
      }}
    </Sprite>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 4 — Swarm Stream (real ThreadPreview)
// ═══════════════════════════════════════════════════════════════════════════

function getTourTeam(roles: {
  research: string
  analysis: string
  writing: string
  review: string
}) {
  return {
    scout: {
      id: 'tour-scout',
      slug: 'scout',
      name: 'Scout',
      icon: 'DataTransferBoth' as const,
      role: roles.research,
      instructions: '',
      createdAt: t0,
    },
    forge: {
      id: 'tour-forge',
      slug: 'forge',
      name: 'Forge',
      icon: 'GraphUp' as const,
      role: roles.analysis,
      instructions: '',
      createdAt: t0,
    },
    scribe: {
      id: 'tour-scribe',
      slug: 'scribe',
      name: 'Scribe',
      icon: 'EditPencil' as const,
      role: roles.writing,
      instructions: '',
      createdAt: t0,
    },
    echo: {
      id: 'tour-echo',
      slug: 'echo',
      name: 'Echo',
      icon: 'DoubleCheck' as const,
      role: roles.review,
      instructions: '',
      createdAt: t0,
    },
  }
}

interface TourThreadStrings {
  prompt: string
  filler2Title: string
  filler2Snippet: string
  filler3Title: string
  filler3Snippet: string
}

function buildTourThreads(
  team: ReturnType<typeof getTourTeam>,
  answerSoFar: string,
  messageSteps: MessageStep[],
  task: Task,
  artifacts: Artifact[],
  createdAt: Date,
  s: TourThreadStrings,
): Thread[] {
  const { scout, forge, scribe, echo } = team

  const selected: Thread = {
    id: 'tour-thread-primary',
    kind: 'task',
    title: s.prompt,
    snippet: answerSoFar || s.prompt,
    updatedAt: createdAt.toISOString(),
    agent: scout,
    participants: [scout, forge, scribe, echo],
    starColor: null,
    unread: false,
    messages: [
      {
        id: 'm-user',
        role: 'user',
        content: s.prompt,
        timestamp: createdAt,
      },
      {
        id: 'm-assistant',
        role: 'assistant',
        agent: scout,
        content: answerSoFar,
        timestamp: createdAt,
        steps: messageSteps,
      },
    ],
    artifacts,
    source: { task },
    tags: [],
  }

  const filler: Thread[] = [
    {
      id: 'tour-thread-2',
      kind: 'chat',
      title: s.filler2Title,
      snippet: s.filler2Snippet,
      updatedAt: new Date(createdAt.getTime() - 1000 * 60 * 45).toISOString(),
      agent: scribe,
      participants: [],
      starColor: '#F59E0B',
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'tour-thread-3',
      kind: 'chat',
      title: s.filler3Title,
      snippet: s.filler3Snippet,
      updatedAt: new Date(createdAt.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      agent: forge,
      participants: [],
      starColor: null,
      unread: true,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
  ]

  return [selected, ...filler]
}

interface SwarmContentProps {
  answerSoFar: string
  messageSteps: MessageStep[]
  task: Task
  team: ReturnType<typeof getTourTeam>
  artifacts: Artifact[]
  createdAt: Date
  strings: TourThreadStrings
  createNewLabel: string
  createNewSublabel: string
}

const SwarmContent = memo(function SwarmContent({
  answerSoFar,
  messageSteps,
  task,
  team,
  artifacts,
  createdAt,
  strings,
  createNewLabel,
  createNewSublabel,
}: SwarmContentProps) {
  const { width: stageW } = useStageSize()
  const showThreadList = stageW >= 650
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))

  const threads = buildTourThreads(
    team,
    answerSoFar,
    messageSteps,
    task,
    artifacts,
    createdAt,
    strings,
  )
  const selectedId = threads[0].id

  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      <div
        className="bg-background flex h-full w-full overflow-hidden relative"
        style={{ height: '100%' }}
      >
        <div className="shrink-0">
          <Sidebar
            isCollapsed
            activeFilter="tasks"
            onFilterChange={noop}
            onOpenSettings={noop}
          />
        </div>
        <div className="flex min-w-0 flex-1">
          {showThreadList && (
            <div className="shrink-0 border-divider/60" style={{ width: 340 }}>
              <ThreadList
                threads={threads}
                selectedThreadId={selectedId}
                selectedIds={[selectedId]}
                onSelectThread={noop}
                onShiftSelectThread={noop}
                onCreateNew={noop}
                createNewLabel={createNewLabel}
                createNewSublabel={createNewSublabel}
                isLoading={false}
                search=""
                onSearchChange={noop}
                onToggleStar={noop}
                onToggleRead={noop}
                layout="list"
              />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <ThreadPreview
              thread={threads[0]}
              onDeselect={noop}
              isStarred={false}
              starColor={null}
              onToggleStar={noop}
              onReply={noop}
              replyPrompt=""
              onReplyPromptChange={noop}
              mode="feed"
              isActive
              onMarkRead={noop}
            />
          </div>
        </div>
      </div>
    </BrowserChrome>
  )
})

const STREAM_STEPS = 48

function SceneSwarmStreamInner() {
  const { t } = useI18n(taskDelegationI18n)
  const { localTime, duration } = useSprite()

  // The answer includes a pptx code block that will render as a PPTX widget
  const answerMarkdown = t('quarterly_report') === 'quarterly_report'
    ? `## Quarterly Sales Projections

**Data sources:** 34 invoices from Google Drive · 12 PO confirmations from Gmail

### Revenue Summary

| Quarter | Revenue | Growth |
|---------|---------|--------|
| Q1 | $2.4M | — |
| Q2 | $3.1M | +29% |
| Q3 | $2.8M | -10% |
| Q4 (proj) | $3.6M | +29% |

### Key Insights

1. **Enterprise segment** drove 42% of growth
2. **Recurring revenue** increased to 68% of total
3. **3 risk factors** identified — see appendix

\`\`\`pptx
const pres = new pptxgen();
let slide = pres.addSlide();
slide.background = { color: "1a1d22" };
slide.addText("Q4 Sales Projections", { x: 0.8, y: 0.8, w: 8.4, h: 1.2, fontSize: 32, color: "FFFFFF", bold: true });
slide.addText("Quarterly Revenue Analysis & Forecast", { x: 0.8, y: 2.0, w: 8.4, h: 0.6, fontSize: 16, color: "9CA3AF" });

let slide2 = pres.addSlide();
slide2.background = { color: "FFFFFF" };
slide2.addText("Revenue Summary", { x: 0.8, y: 0.4, w: 8.4, h: 0.8, fontSize: 24, color: "1a1d22", bold: true });
slide2.addText([{ text: "Q1: $2.4M", options: { fontSize: 18, color: "6b7280", bullet: true, breakLine: true } }, { text: "Q2: $3.1M (+29%)", options: { fontSize: 18, color: "6b7280", bullet: true, breakLine: true } }, { text: "Q3: $2.8M (-10%)", options: { fontSize: 18, color: "6b7280", bullet: true, breakLine: true } }, { text: "Q4: $3.6M (+29%) — Projected", options: { fontSize: 18, color: "4285f4", bullet: true, bold: true } }], { x: 0.8, y: 1.4, w: 8.4, h: 3.0 });

let slide3 = pres.addSlide();
slide3.background = { color: "FFFFFF" };
slide3.addText("Key Growth Drivers", { x: 0.8, y: 0.4, w: 8.4, h: 0.8, fontSize: 24, color: "1a1d22", bold: true });
slide3.addText([{ text: "Enterprise segment: +42% YoY", options: { fontSize: 16, color: "374151", bullet: true, breakLine: true } }, { text: "Recurring revenue: 68% of total", options: { fontSize: 16, color: "374151", bullet: true, breakLine: true } }, { text: "New client acquisition: 18 accounts", options: { fontSize: 16, color: "374151", bullet: true } }], { x: 0.8, y: 1.4, w: 8.4, h: 3.0 });
\`\`\``
    : t('quarterly_report')

  const answerTokens = useMemo(
    () => answerMarkdown.split(/(\s+)/),
    [answerMarkdown],
  )

  const strings = useMemo<TourThreadStrings>(
    () => ({
      prompt: t(
        'Analyze last month\u2019s sales invoices from Drive, calculate quarterly projections, and generate a PPTX deck with an email draft to the client',
      ),
      filler2Title: t('Draft Q3 OKRs for the platform team'),
      filler2Snippet: t('Synthesized five drafts. Ready for review.'),
      filler3Title: t('Compare three WebGPU inference runtimes'),
      filler3Snippet: t('Benchmarks complete. Transformers.js leads on cold start.'),
    }),
    [t],
  )
  const createNewLabel = t('New task')
  const createNewSublabel = t('Start a new task')
  const roles = {
    research: t('Research'),
    analysis: t('Analysis'),
    writing: t('Writing'),
    review: t('Review'),
  }
  const thinkingContent = t(
    'Breaking into subtasks. Recruiting Data, Analysis, and Writing agents\u2026',
  )
  const toolLabels = {
    drive: t('Pulling invoices from Google Drive'),
    gmail: t('Scanning Gmail for purchase order confirmations'),
    calculate: t('Calculating quarterly projections'),
    pptx: t('Generating presentation'),
    email: t('Drafting email to client'),
  }
  const toolOutputs = {
    drive: t('34 invoices \u00B7 Sales folder'),
    gmail: t('12 matching PO confirmations'),
    calculate: t('Q1: $2.4M \u00B7 Q2: $3.1M \u00B7 Q3: $2.8M \u00B7 Q4 (proj): $3.6M'),
    pptx: t('8 slides \u00B7 .pptx ready'),
    email: t('Draft ready \u00B7 1 attachment'),
  }

  // Opacity
  const inOpacity = clamp(localTime / 0.3, 0, 1)
  const exitT = clamp((localTime - (duration - 0.4)) / 0.4, 0, 1)
  const opacity = inOpacity * (1 - exitT)

  // Streaming text
  const STREAM_BEGIN = 4.5
  const STREAM_END = duration - 1.5
  const streamT = clamp((localTime - STREAM_BEGIN) / (STREAM_END - STREAM_BEGIN), 0, 1)
  const step = Math.floor(streamT * STREAM_STEPS)
  const revealedTokenCount = Math.floor((step / STREAM_STEPS) * answerTokens.length)
  const answerSoFar = useMemo(
    () => answerTokens.slice(0, revealedTokenCount).join(''),
    [answerTokens, revealedTokenCount],
  )

  const team = useMemo(() => getTourTeam(roles), [roles.research, roles.analysis, roles.writing, roles.review])
  const createdAt = useMemo(() => new Date(), [])

  const task = useMemo<Task>(() => {
    const taskStatus: Task['status'] =
      localTime >= 8.0 ? 'completed' : localTime >= 0.3 ? 'in_progress' : 'pending'
    return {
      id: 'tour-task-primary',
      workflowId: 'tour-workflow',
      title: strings.prompt,
      description: strings.prompt,
      complexity: 'complex',
      status: taskStatus,
      assignedAgentId: team.scout.id,
      agent: team.scout,
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt,
      updatedAt: createdAt,
      completedAt: taskStatus === 'completed' ? createdAt : undefined,
    }
  }, [localTime >= 8.0, localTime >= 0.3, team, createdAt, strings])

  // Message steps — animate tool calls
  const messageSteps = useMemo<MessageStep[]>(() => {
    const now = createdAt.getTime()
    const mk = (
      id: string,
      icon: string,
      i18nKey: string,
      startT: number,
      doneT: number,
      extra: Partial<MessageStep> = {},
    ): MessageStep | null => {
      if (localTime < startT) return null
      const completed = localTime >= doneT
      return {
        id,
        icon,
        i18nKey,
        status: completed ? 'completed' : 'running',
        startedAt: now + startT * 1000,
        completedAt: completed ? now + doneT * 1000 : undefined,
        ...extra,
      }
    }

    const out: MessageStep[] = []

    const thinking = mk('s0-thinking', 'Sparks', 'thinking', 0.5, 2.0, {
      thinkingContent,
      title: thinkingContent,
    })
    if (thinking) out.push(thinking)

    const tcDrive = mk('s1-drive', 'GoogleDrive', 'tool', 1.8, 2.8, {
      title: toolLabels.drive,
      toolCalls: [
        {
          name: 'drive_list',
          input: { folder: 'Sales/Invoices', month: 'last' },
          output: localTime >= 2.8 ? toolOutputs.drive : undefined,
        },
      ],
    })
    if (tcDrive) out.push(tcDrive)

    const tcGmail = mk('s2-gmail', 'Gmail', 'tool', 2.6, 3.6, {
      title: toolLabels.gmail,
      toolCalls: [
        {
          name: 'gmail_search',
          input: { query: 'purchase order confirmation', limit: 50 },
          output: localTime >= 3.6 ? toolOutputs.gmail : undefined,
        },
      ],
    })
    if (tcGmail) out.push(tcGmail)

    const tcCalc = mk('s3-calc', 'Calculator', 'tool', 3.4, 4.4, {
      title: toolLabels.calculate,
      toolCalls: [
        {
          name: 'execute',
          input: { language: 'javascript', code: 'projectQuarterlyRevenue(invoices)' },
          output: localTime >= 4.4 ? toolOutputs.calculate : undefined,
        },
      ],
    })
    if (tcCalc) out.push(tcCalc)

    const tcPptx = mk('s4-pptx', 'Presentation', 'tool', 5.5, 7.0, {
      title: toolLabels.pptx,
      toolCalls: [
        {
          name: 'generate_pptx',
          input: { title: 'Q4 Sales Projections', slides: 8 },
          output: localTime >= 7.0 ? toolOutputs.pptx : undefined,
        },
      ],
    })
    if (tcPptx) out.push(tcPptx)

    const tcEmail = mk('s5-email', 'Mail', 'tool', 7.2, 8.0, {
      title: toolLabels.email,
      toolCalls: [
        {
          name: 'gmail_draft',
          input: { to: 'sarah@client.com', subject: 'Q4 Sales Projections' },
          output: localTime >= 8.0 ? toolOutputs.email : undefined,
        },
      ],
    })
    if (tcEmail) out.push(tcEmail)

    return out
  }, [Math.floor(localTime * 5), thinkingContent, toolLabels, toolOutputs])

  // Artifacts
  const artifacts = useMemo<Artifact[]>(() => {
    if (localTime < 7.0) return []
    return [
      {
        id: 'tour-art-pptx',
        taskId: 'tour-task-primary',
        agentId: team.scribe.id,
        title: 'Q4 Sales Projections',
        description: '8 slides · .pptx',
        type: 'document',
        format: 'html',
        content: '',
        version: 1,
        status: 'final',
        dependencies: [],
        validates: [],
        createdAt,
        updatedAt: createdAt,
      },
    ]
  }, [localTime >= 7.0, team.scribe.id, createdAt])

  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: 'center center',
          willChange: 'transform',
          animation: `tour-swarm-zoom ${duration}s cubic-bezier(0.42, 0, 0.58, 1) forwards`,
        }}
      >
        <SwarmContent
          answerSoFar={answerSoFar}
          messageSteps={messageSteps}
          task={task}
          team={team}
          artifacts={artifacts}
          createdAt={createdAt}
          strings={strings}
          createNewLabel={createNewLabel}
          createNewSublabel={createNewSublabel}
        />
      </div>
    </div>
  )
}

export function SceneSwarmStream({ start = 14.9, end = 24 }: SceneProps) {
  return (
    <>
      <style>{`@keyframes tour-swarm-zoom { from { transform: scale(1); } to { transform: scale(1.06); } }`}</style>
      <Sprite start={start} end={end}>
        <SceneSwarmStreamInner />
      </Sprite>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// Scene 5 — Email Draft (Gmail compose view with PPTX attachment)
// ═══════════════════════════════════════════════════════════════════════════

export function SceneEmailDraft({ start = 23.9, end = 30 }: SceneProps) {
  const { t } = useI18n(taskDelegationI18n)
  const { width: stageW } = useStageSize()

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.6, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
        const fz = Math.round(Math.min(14, Math.max(10, stageW * 0.015)))
        const titleFz = Math.round(Math.min(16, Math.max(11, stageW * 0.018)))

        // Staggered reveal for email lines
        const lineReveal = (idx: number) =>
          Easing.easeOutCubic(clamp((time - 0.6 - idx * 0.25) / 0.5, 0, 1))

        // Attachment slide-in
        const attachT = Easing.easeOutBack(clamp((time - 2.8) / 0.6, 0, 1))

        // PPTX preview thumbnails
        const previewT = Easing.easeOutCubic(clamp((time - 3.6) / 0.8, 0, 1))

        const emailLines = [
          t('Dear Sarah,'),
          '',
          t('Please find attached our quarterly sales projections deck. Key highlights:'),
          '',
          t('\u2022 Q4 projected revenue: **$3.6M** (+29% vs Q3)'),
          t('\u2022 Top growth driver: Enterprise segment (+42%)'),
          t('\u2022 3 risk factors flagged in appendix'),
          '',
          t('Happy to walk through the details at your convenience.'),
          '',
          t('Best regards'),
        ]

        return (
          <div style={{ position: 'absolute', inset: 0, opacity }}>
            <BrowserChrome inset={chromeInset} url="mail.google.com" tabTitle="Gmail">
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Gmail-style toolbar */}
                <div
                  style={{
                    padding: '8px 20px',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                  }}
                >
                  <div
                    style={{
                      padding: '6px 16px',
                      background: '#1a73e8',
                      color: '#fff',
                      borderRadius: 6,
                      fontFamily: "'Geist', ui-monospace, monospace",
                      fontSize: fz - 1,
                      fontWeight: 600,
                    }}
                  >
                    Send
                  </div>
                  <div style={{ flex: 1 }} />
                  <span
                    style={{
                      fontFamily: "'Geist', ui-monospace, monospace",
                      fontSize: Math.max(8, fz - 3),
                      color: '#9ca3af',
                      letterSpacing: '0.06em',
                    }}
                  >
                    DRAFT
                  </span>
                </div>

                {/* Email fields */}
                <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6' }}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 8,
                      opacity: lineReveal(0),
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        fontSize: fz - 1,
                        color: '#9ca3af',
                        width: 50,
                      }}
                    >
                      {t('To:')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        fontSize: fz,
                        color: '#1a1d22',
                      }}
                    >
                      sarah@client.com
                    </span>
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      opacity: lineReveal(1),
                    }}
                  >
                    <span
                      style={{
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        fontSize: fz - 1,
                        color: '#9ca3af',
                        width: 50,
                      }}
                    >
                      {t('Subject:')}
                    </span>
                    <span
                      style={{
                        fontFamily: 'Figtree, system-ui, sans-serif',
                        fontSize: titleFz,
                        fontWeight: 600,
                        color: '#1a1d22',
                      }}
                    >
                      {t('Q4 Sales Projections \u2014 Deck Attached')}
                    </span>
                  </div>
                </div>

                {/* Email body */}
                <div
                  style={{
                    flex: 1,
                    padding: '16px 20px',
                    fontFamily: 'Figtree, system-ui, sans-serif',
                    fontSize: fz,
                    color: '#374151',
                    lineHeight: 1.7,
                    overflow: 'hidden',
                  }}
                >
                  {emailLines.map((line, i) =>
                    line === '' ? (
                      <br key={i} />
                    ) : (
                      <div
                        key={i}
                        style={{
                          opacity: lineReveal(i + 2),
                          transform: `translateY(${(1 - lineReveal(i + 2)) * 6}px)`,
                        }}
                      >
                        {/* Render bold markdown inline */}
                        {line.split(/(\*\*.*?\*\*)/).map((part, j) =>
                          part.startsWith('**') && part.endsWith('**') ? (
                            <strong key={j} style={{ fontWeight: 700, color: '#1a1d22' }}>
                              {part.slice(2, -2)}
                            </strong>
                          ) : (
                            <span key={j}>{part}</span>
                          ),
                        )}
                      </div>
                    ),
                  )}
                </div>

                {/* Attachment */}
                <div
                  style={{
                    padding: '12px 20px',
                    borderTop: '1px solid #e5e7eb',
                    opacity: attachT,
                    transform: `translateY(${(1 - attachT) * 20}px)`,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '10px 14px',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: 12,
                      background: '#fafbfc',
                    }}
                  >
                    {/* PPTX icon */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: '#ea433515',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      📊
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: 'Figtree, system-ui, sans-serif',
                          fontSize: fz,
                          fontWeight: 600,
                          color: '#1a1d22',
                        }}
                      >
                        {t('quarterly-projections.pptx')}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Geist', ui-monospace, monospace",
                          fontSize: Math.max(8, fz - 3),
                          color: '#9ca3af',
                        }}
                      >
                        {t('2.4 MB')}
                      </div>
                    </div>

                    {/* Inline slide thumbnails */}
                    <div
                      style={{
                        display: 'flex',
                        gap: 4,
                        opacity: previewT,
                        transform: `scale(${0.8 + 0.2 * previewT})`,
                        transformOrigin: 'right center',
                      }}
                    >
                      {[
                        { bg: '#1a1d22', text: 'Q4 Sales', textColor: '#fff' },
                        { bg: '#ffffff', text: 'Revenue', textColor: '#1a1d22' },
                        { bg: '#ffffff', text: 'Drivers', textColor: '#1a1d22' },
                      ].map((slide, i) => (
                        <div
                          key={i}
                          style={{
                            width: Math.round(Math.min(52, Math.max(28, stageW * 0.05))),
                            aspectRatio: '16/9',
                            borderRadius: 4,
                            background: slide.bg,
                            border: '1px solid #e5e7eb',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: "'Geist', ui-monospace, monospace",
                            fontSize: Math.max(5, Math.round(stageW * 0.006)),
                            color: slide.textColor,
                            fontWeight: 600,
                            overflow: 'hidden',
                          }}
                        >
                          {slide.text}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </BrowserChrome>
          </div>
        )
      }}
    </Sprite>
  )
}
