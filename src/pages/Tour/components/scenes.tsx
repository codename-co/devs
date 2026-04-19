/**
 * DEVS product tour — five-scene timeline.
 *
 * Each scene is a `<Sprite start={…} end={…}>` that renders its children
 * only while the Stage playhead is inside its window and exposes the local
 * time / progress via the `useSprite()` hook.
 *
 * Scenes 1 and 2 render the real `<NewTaskHero />` inside a mock browser
 * chrome so the demo always shows the actual home page — no replicas to
 * keep in sync. Scenes 3-5 use the real `<DevsIcon />` (via a small
 * `TourSphere` wrapper that adds sizing + glow).
 */
import type { CSSProperties } from 'react'
import { memo, useLayoutEffect, useMemo, useRef } from 'react'
import { DevsIcon } from '@/components/DevsIcon'
import { useI18n } from '@/i18n'
import { NewTaskHero } from '@/pages/V2/pages/NewTaskHero'
import { Sidebar, ThreadList, ThreadPreview } from '@/pages/V2/components'
import type { Thread } from '@/pages/V2/types'
import type { Agent } from '@/types'
import { clamp, Easing, Sprite, useSprite } from './animations'
import { BrowserChrome, BrowserChromeTyping } from './BrowserChrome'
import { FakeCursor } from './FakeCursor'
import tourI18n from '../i18n'
import { PRODUCT } from '@/config/product'

// ── Tour-local DevsIcon wrapper ───────────────────────────────────────────
// Scenes 3-5 ask for a sized, tinted, glowing "sphere". The real DevsIcon
// SVG uses `currentColor` internally, so we style it via a wrapper with
// inline `color`, explicit dimensions, and a drop-shadow glow.
interface TourSphereProps {
  size: number
  color: string
  intensity?: number
}

function TourSphere({ size, color, intensity = 1 }: TourSphereProps) {
  const glow = `drop-shadow(0 0 ${32 * intensity}px ${color}) drop-shadow(0 0 ${
    96 * intensity
  }px ${color})`
  const style: CSSProperties = {
    width: size,
    height: size,
    color,
    filter: glow,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  return (
    <div style={style}>
      <DevsIcon className="w-full h-full fill-white" />
    </div>
  )
}

// ── Scene 1: Browser opens, URL types, home page appears ──────────────────
// 0–4.5s
interface SceneProps {
  start?: number
  end?: number
}

export function SceneOpen({ start = 0, end = 9.5 }: SceneProps) {
  const { t } = useI18n(tourI18n)

  // Timeline of the merged opening scene (scene-local seconds):
  //   0.00 – 0.60   browser chrome eases in
  //   0.80 – 2.00   URL "devs.new" types
  //   2.00 – 3.20   home page fades in
  //   2.20 – 3.70   "Open a tab." caption
  //   3.70 – 4.50   cursor glides from off-stage to the prompt area
  //   4.50 – 4.75   cursor clicks the prompt (ripple)
  //   4.75 – 7.90   user types the task request
  //   7.90 – 8.50   cursor glides to the submit button
  //   8.50 – 8.75   cursor clicks submit (ripple)
  //   9.15 – 9.50   scene fades out into SceneSwarm
  const CURSOR_ENTER = 3.7
  const MOVE1_END = 4.5
  const CLICK1_END = 4.75
  const TYPE_START = 4.75
  const TYPE_END = 7.9
  const MOVE2_END = 8.5
  const CLICK2_END = 8.75

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const chromeIn = Easing.easeOutBack(clamp(time / 0.6, 0, 1))
        const chromeScale = 0.94 + 0.06 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)
        const urlProgress = clamp((time - 0.8) / 1.2, 0, 1)
        const pageIn = Easing.easeOutCubic(clamp((time - 2.0) / 1.2, 0, 1))
        const camScale = 1 + 0.01 * (time / duration)
        const exitT = clamp((time - (duration - 0.35)) / 0.35, 0, 1)
        const exitOpacity = 1 - exitT

        // Opening camera: hold a 5× zoom on the address bar for the first
        // 1.5 s so the user can read the domain typing, then ease back to
        // the full browser over 700 ms.
        const ZOOM_HOLD = 1.5
        const ZOOM_OUT = 0.7
        const zoomT = Easing.easeInOutCubic(
          clamp((time - ZOOM_HOLD) / ZOOM_OUT, 0, 1),
        )
        const cameraZoom = 5 + (1 - 5) * zoomT
        // Focal point in stage coords — mid-URL bar of the chrome at
        // (260, 110, 1400×860) with a 54-px-tall title bar.
        const FOCAL_X = 280
        const FOCAL_Y = 50

        // Caption fades in at ~2.2s then fades out before the cursor appears.
        const captionT =
          clamp((time - 2.2) / 0.4, 0, 1) *
          (1 - clamp((time - CURSOR_ENTER + 0.3) / 0.4, 0, 1))

        // Cursor choreography ── position.
        let cursorPos: { x: number; y: number } | null = null
        if (time >= CURSOR_ENTER && time < MOVE1_END) {
          cursorPos = lerpPoint(
            CURSOR_OFF,
            CURSOR_PROMPT,
            (time - CURSOR_ENTER) / (MOVE1_END - CURSOR_ENTER),
          )
        } else if (time >= MOVE1_END && time < TYPE_END) {
          cursorPos = CURSOR_PROMPT
        } else if (time >= TYPE_END && time < MOVE2_END) {
          cursorPos = lerpPoint(
            CURSOR_PROMPT,
            CURSOR_SUBMIT,
            (time - TYPE_END) / (MOVE2_END - TYPE_END),
          )
        } else if (time >= MOVE2_END) {
          cursorPos = CURSOR_SUBMIT
        }

        // Click ripples on prompt and submit.
        const click1 =
          time >= MOVE1_END && time < CLICK1_END
            ? (time - MOVE1_END) / (CLICK1_END - MOVE1_END)
            : 0
        const click2 =
          time >= MOVE2_END && time < CLICK2_END
            ? (time - MOVE2_END) / (CLICK2_END - MOVE2_END)
            : 0

        // Progressive typing.
        const typeT = clamp((time - TYPE_START) / (TYPE_END - TYPE_START), 0, 1)
        const typedCount = Math.floor(typeT * SCENE_TYPE_PROMPT.length)
        const typedText = SCENE_TYPE_PROMPT.slice(0, typedCount)

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              transform: `scale(${camScale * cameraZoom})`,
              transformOrigin: `${FOCAL_X}px ${FOCAL_Y}px`,
              opacity: exitOpacity,
            }}
          >
            <BrowserChromeTyping
              x={260}
              y={110}
              width={1400}
              height={860}
              urlText="devs.new"
              urlProgress={urlProgress}
              scale={chromeScale}
              opacity={chromeOpacity}
              tabTitle={false}
            >
              {/* Real product home page inside the browser body. */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  opacity: pageIn,
                  transform: `scale(${0.9 + 0.1 * pageIn})`,
                  transformOrigin: 'center top',
                }}
              >
                <NewTaskHero
                  autoFocus={false}
                  showUseCases={pageIn > 0.6}
                  className="flex h-full min-h-0 flex-1 flex-col"
                  value={time >= CURSOR_ENTER ? typedText : undefined}
                  demo
                />
              </div>

              {captionT > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    bottom: 40,
                    textAlign: 'center',
                    fontFamily: "'Unbounded', Georgia, serif",
                    fontSize: 44,
                    fontStyle: 'italic',
                    color: '#1a1d22',
                    opacity: captionT,
                  }}
                >
                  {t('Open a tab.')}
                </div>
              )}
            </BrowserChromeTyping>

            {cursorPos && (
              <FakeCursor
                x={cursorPos.x}
                y={cursorPos.y}
                clickProgress={click1 || click2}
              />
            )}
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 1b: Fake cursor clicks the prompt area and types the request ──
// Bridges SceneOpen (tab + home page) and SceneSwarm (streaming reply).
// Uses the real NewTaskHero with a controlled `value` so the prompt text
// reveals progressively. A FakeCursor overlay simulates the user's hand:
// move → click prompt → type → move to submit → click.
//
// Stage is 1920×1080; BrowserChrome occupies (260, 110, 1400×860).
// Prompt textarea lands roughly at (960, 500); the submit button at the
// prompt bar's bottom-right — around (1220, 618).
const SCENE_TYPE_PROMPT =
  'Build me a research brief on lithium battery supply chains.'

const CURSOR_OFF = { x: 1500, y: 980 }
const CURSOR_PROMPT = { x: 960, y: 620 }
const CURSOR_SUBMIT = { x: 1270, y: 680 }

/** Smooth lerp with ease-in-out for cursor movement. */
function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tNorm: number,
) {
  const k = Easing.easeInOutCubic(clamp(tNorm, 0, 1))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

// ── Scene 2: Inbox opens, agent streams a research brief ──────────────────
// 4.5–12.5s
//
// Replaces the legacy "Swarm" visualization with the real product UI:
// the `ThreadsPage` opening — Sidebar, thread list, preview — composed from
// the actual V2 components. A pre-selected thread hosts a fake LLM reply
// that streams in word-by-word, driven entirely by the Sprite playhead
// (no network calls, no store writes).
const SCENE_SWARM_PROMPT =
  'Build me a research brief on lithium battery supply chains.'

const SCENE_SWARM_ANSWER = `## Lithium battery supply chains — research brief

The global Li-ion supply chain spans **four critical stages**:

1. **Raw materials** — lithium, cobalt, nickel, graphite
2. **Refining** — concentrated in China (~75% of capacity)
3. **Cell manufacturing** — CATL, LG, Panasonic, BYD
4. **Pack assembly** — increasingly on-shored near OEMs

### Key risks

- Geographic concentration of refining
- Cobalt sourcing (DRC artisanal mining)
- Recycling capacity lags demand growth

> **Next step:** model 2027 demand under three policy scenarios.`

// Split once at module load — keeping whitespace tokens so partial renders
// never produce orphan markdown punctuation.
const SCENE_SWARM_TOKENS = SCENE_SWARM_ANSWER.split(/(\s+)/)

/** Build a synthetic assistant agent for the mocked thread. */
function getTourAssistant(): Agent {
  return {
    id: 'tour-assistant',
    slug: 'scout',
    name: 'Scout',
    icon: 'Search',
    role: 'Research',
    instructions: '',
    createdAt: new Date(0),
  }
}

/** Build the mocked thread collection shown in the Inbox. */
function buildTourThreads(
  assistant: Agent,
  answerSoFar: string,
  createdAt: Date,
): Thread[] {
  const selected: Thread = {
    id: 'tour-thread-primary',
    kind: 'conversation',
    title: SCENE_SWARM_PROMPT,
    snippet: answerSoFar || SCENE_SWARM_PROMPT,
    updatedAt: createdAt.toISOString(),
    agent: assistant,
    participants: [assistant],
    starColor: null,
    unread: false,
    messages: [
      {
        id: 'm-user',
        role: 'user',
        content: SCENE_SWARM_PROMPT,
        timestamp: createdAt,
      },
      {
        id: 'm-assistant',
        role: 'assistant',
        agent: assistant,
        content: answerSoFar,
        timestamp: createdAt,
      },
    ],
    artifacts: [],
    source: {},
    tags: [],
  }

  const filler: Thread[] = [
    {
      id: 'tour-thread-2',
      kind: 'conversation',
      title: 'Draft Q3 OKRs for the platform team',
      snippet: 'Synthesized five drafts. Ready for review.',
      updatedAt: new Date(createdAt.getTime() - 1000 * 60 * 45).toISOString(),
      agent: { ...assistant, id: 'tour-scribe', name: 'Scribe' },
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
      kind: 'conversation',
      title: 'Compare three WebGPU inference runtimes',
      snippet: 'Benchmarks complete. Transformers.js leads on cold start.',
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 3,
      ).toISOString(),
      agent: { ...assistant, id: 'tour-forge', name: 'Forge' },
      participants: [],
      starColor: null,
      unread: true,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
    {
      id: 'tour-thread-4',
      kind: 'conversation',
      title: 'Summarize last week’s customer interviews',
      snippet: 'Three themes emerged: latency, privacy, price.',
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 26,
      ).toISOString(),
      agent: { ...assistant, id: 'tour-echo', name: 'Echo' },
      participants: [],
      starColor: null,
      unread: false,
      messages: [],
      artifacts: [],
      source: {},
      tags: [],
    },
  ]

  return [selected, ...filler]
}

const noop = () => {}

// ── Scene 2 helpers ───────────────────────────────────────────────────────
// The heavy BrowserChrome content is memoized so it only re-renders when
// `answerSoFar` changes (every few frames), not on every RAF tick. The zoom
// transform is applied directly to a DOM ref via useLayoutEffect, completely
// bypassing React reconciliation for the transform update.

interface SwarmContentProps {
  answerSoFar: string
  assistant: Agent
  createdAt: Date
}

const SwarmContent = memo(function SwarmContent({
  answerSoFar,
  assistant,
  createdAt,
}: SwarmContentProps) {
  const threads = buildTourThreads(assistant, answerSoFar, createdAt)
  const selectedId = threads[0].id
  return (
    <BrowserChrome x={260} y={110} width={1400} height={860} url="devs.new">
      {/* ThreadsPage composition — real Sidebar + ThreadList + ThreadPreview.
          We avoid WorkspaceLayout because it forces h-dvh. */}
      <div
        className="bg-background flex h-full w-full overflow-hidden"
        style={{ height: 'calc(100% - 0px)' }}
      >
        <div className="shrink-0">
          <Sidebar
            isCollapsed
            activeFilter="inbox"
            onFilterChange={noop}
            onOpenSettings={noop}
          />
        </div>
        <div className="flex min-w-0 flex-1">
          <div className="shrink-0 border-divider/60" style={{ width: 340 }}>
            <ThreadList
              threads={threads}
              selectedThreadId={selectedId}
              selectedIds={[selectedId]}
              onSelectThread={noop}
              onShiftSelectThread={noop}
              onCreateNew={noop}
              createNewLabel="New task"
              createNewSublabel="Start a new task"
              isLoading={false}
              search=""
              onSearchChange={noop}
              onToggleStar={noop}
              onToggleRead={noop}
              layout="list"
            />
          </div>
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

// Throttle the streaming so SwarmContent re-renders at ~8fps instead of 60fps.
// Fewer re-renders → fewer layer re-rasters → the compositor-driven CSS zoom
// keyframes run uninterrupted.
const STREAM_STEPS = 48

function SceneSwarmInner() {
  const { localTime, duration } = useSprite()

  // Opacity: fade in over first 0.3s, fade out over last 0.4s.
  const inOpacity = clamp(localTime / 0.3, 0, 1)
  const exitT = clamp((localTime - (duration - 0.4)) / 0.4, 0, 1)
  const opacity = inOpacity * (1 - exitT)

  // Streaming text: discretized into STREAM_STEPS chunks so prop identity
  // only changes ~8× per second regardless of RAF cadence.
  const streamT = clamp((localTime - 0.3) / (duration - 1.2), 0, 1)
  const step = Math.floor(streamT * STREAM_STEPS)
  const revealedTokenCount = Math.floor(
    (step / STREAM_STEPS) * SCENE_SWARM_TOKENS.length,
  )
  const answerSoFar = useMemo(
    () => SCENE_SWARM_TOKENS.slice(0, revealedTokenCount).join(''),
    [revealedTokenCount],
  )

  // Stable references so SwarmContent props never churn unnecessarily.
  const assistant = useMemo(() => getTourAssistant(), [])
  const createdAt = useMemo(() => new Date('2025-01-15T09:00:00Z'), [])

  // Apply opacity via DOM ref too — the outer wrapper never re-renders from
  // React for animation purposes.
  const opacityRef = useRef<HTMLDivElement>(null)
  useLayoutEffect(() => {
    if (opacityRef.current) opacityRef.current.style.opacity = String(opacity)
  })

  return (
    <div ref={opacityRef} style={{ position: 'absolute', inset: 0, opacity }}>
      {/* Zoom handled 100% by the compositor via CSS keyframes. No React
          work per frame; unaffected by any main-thread re-renders. */}
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
          assistant={assistant}
          createdAt={createdAt}
        />
      </div>
    </div>
  )
}

export function SceneSwarm({ start = 9.3, end = 14.6 }: SceneProps) {
  return (
    <>
      <style>{`@keyframes tour-swarm-zoom { from { transform: scale(1); } to { transform: scale(1.15); } }`}</style>
      <Sprite start={start} end={end}>
        <SceneSwarmInner />
      </Sprite>
    </>
  )
}

// ── Scene 3: Simple transition into the sphere ────────────────────────────
// 3 seconds max: quick fade-through from the inbox to the dark triad.
export function SceneCollapse({ start = 12.5, end = 15.5 }: SceneProps) {
  const { t } = useI18n(tourI18n)
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
              <TourSphere size={320} color="#6aa1ff" intensity={1.2} />
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
                fontSize: 56,
                color: '#f2f4f8',
                letterSpacing: '-0.01em',
                opacity: captionT * (1 - captionOut),
                transform: `translateY(${(1 - captionT) * 14}px)`,
              }}
            >
              {t('All inside your browser.')}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}

// ── Scene 4: Privacy triad ────────────────────────────────────────────────
// 18.5–25.5s
export function ScenePromise({ start = 18.5, end = 25.5 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = clamp(time / 0.4, 0, 1)
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const phrases = [
          { text: t('No server.'), at: 0.5 },
          { text: t('No subscription.'), at: 2.0 },
          { text: t('No third party.'), at: 3.5 },
        ]

        const cx = 640,
          cy = 540
        const breathe = 1 + Math.sin(time * 1.8) * 0.03

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

            <div
              style={{
                position: 'absolute',
                left: cx,
                top: cy,
                transform: `translate(-50%, -50%) scale(${breathe})`,
              }}
            >
              <TourSphere size={260} color="#6aa1ff" intensity={1.2} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 900,
                top: 300,
                width: 900,
                display: 'flex',
                flexDirection: 'column',
                gap: 64,
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 64,
                color: '#f2f4f8',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
              }}
            >
              {phrases.map((p, i) => {
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
                      gap: 16,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'Geist', ui-monospace, monospace",
                        fontStyle: 'normal',
                        fontSize: 22,
                        color: 'oklch(72% 0.16 253)',
                        letterSpacing: '0.14em',
                        minWidth: 48,
                      }}
                    >
                      {String(i + 1).padStart(2, '0')}
                    </span>
                    <span>{p.text}</span>
                  </div>
                )
              })}
            </div>

            <div
              style={{
                position: 'absolute',
                bottom: 80,
                left: 0,
                right: 0,
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 18,
                letterSpacing: '0.3em',
                color: '#8a909a',
                opacity: clamp((time - 5.0) / 0.6, 0, 1) * (1 - exitT),
              }}
            >
              {t('OPEN SOURCE · BROWSER-NATIVE · YOURS')}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}

function BackgroundOrbit({
  t,
  cx = 640,
  cy = 540,
  radius = 180,
  radiusStep = 80,
  yScale = 0.9,
}: {
  t: number
  cx?: number
  cy?: number
  radius?: number
  radiusStep?: number
  yScale?: number
}) {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const base = (i / 14) * Math.PI * 2
    const ang = base + t * 0.25
    const r = radius + (i % 3) * radiusStep
    const x = cx + Math.cos(ang) * r
    const y = cy + Math.sin(ang) * r * yScale
    const size = 2 + (i % 3)
    return { x, y, size }
  })
  return (
    <svg
      width="1920"
      height="1080"
      viewBox="0 0 1920 1080"
      style={{ position: 'absolute', inset: 0 }}
    >
      {dots.map((d, i) => (
        <circle
          key={i}
          cx={d.x}
          cy={d.y}
          r={d.size}
          fill="oklch(72% 0.12 253 / 0.5)"
        />
      ))}
    </svg>
  )
}

// ── Scene 5: Call to action ───────────────────────────────────────────────
// 25.5–30s
export function SceneCTA({ start = 25.5, end = 30 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  return (
    <Sprite start={start} end={end}>
      {({ localTime }) => {
        const time = localTime
        const inT = clamp(time / 0.6, 0, 1)
        const urlT = clamp((time - 0.8) / 0.8, 0, 1)
        const repoT = clamp((time - 1.8) / 0.7, 0, 1)
        const tagT = clamp((time - 2.5) / 0.9, 0, 1)
        const breathe = 1 + Math.sin(time * 1.8) * 0.025

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'oklch(12% 0.0015 253.83)',
              opacity: inT,
            }}
          >
            <BackgroundOrbit cx={960} cy={360} t={time + 10} />

            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '35%',
                transform: `translate(-50%, -50%) scale(${breathe})`,
              }}
            >
              <TourSphere size={200} color="#6aa1ff" intensity={1.4} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '52%',
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontSize: 140,
                fontWeight: 500,
                letterSpacing: '0.14em',
                color: '#f2f4f8',
                opacity: inT,
              }}
            >
              {PRODUCT.displayName}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '68%',
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 48,
                letterSpacing: '0.04em',
                color: 'oklch(72% 0.16 253)',
                opacity: urlT,
                transform: `translateY(${(1 - urlT) * 10}px)`,
              }}
            >
              {t('devs.new')}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '78%',
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 36,
                color: '#d7dbe0',
                opacity: tagT,
                transform: `translateY(${(1 - tagT) * 10}px)`,
              }}
            >
              {t('Intelligence amplification for everyone with a browser.')}
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 80,
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 18,
                letterSpacing: '0.18em',
                color: '#8a909a',
                opacity: repoT,
              }}
            >
              {t('github.com/codename-co/devs · MIT')}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
