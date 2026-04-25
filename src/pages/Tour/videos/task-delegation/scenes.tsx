/**
 * Task-delegation tour — three new scene components.
 *
 * ScenePromptSubmit  (2.4–6s)   Browser chrome with typed prompt + submit click
 * SceneBoardView     (5.9–13s)  Real ThreadBoardView with animated task status
 * SceneArtifacts     (12.9–19s) Completed task summary + artifact panel
 */
import { memo, useMemo } from 'react'
import { useI18n } from '@/i18n'
import { Sidebar, ThreadBoardView } from '@/pages/V2/components'
import type { Thread } from '@/pages/V2/types'
import type { Agent, Task } from '@/types'
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

// ── Helpers ───────────────────────────────────────────────────────────────

function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tNorm: number,
) {
  const k = Easing.easeInOutCubic(clamp(tNorm, 0, 1))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

// ── Scene 2: Prompt submit ────────────────────────────────────────────────

const CURSOR_OFF_FRAC = { x: 0.88, y: 0.96 }
const CURSOR_SUBMIT_FRAC = { x: 0.66, y: 0.72 }

export function ScenePromptSubmit({ start = 2.4, end = 6 }: SceneProps) {
  const { t } = useI18n(taskDelegationI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const { resolveAnchor } = useTimeline()

  const prompt = t('Audit Q1 expenses, flag anomalies, draft a CFO memo')

  const toCursor = (frac: { x: number; y: number }) => ({
    x: frac.x * stageW,
    y: frac.y * stageH,
  })

  const CURSOR_ENTER = 2.0
  const MOVE_END = 2.8
  const CLICK_END = 3.05

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const exitT = clamp((time - (duration - 0.4)) / 0.4, 0, 1)
        const exitOpacity = 1 - exitT

        // Chrome entrance
        const chromeIn = Easing.easeOutBack(clamp(time / 0.5, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.4, 0, 1)

        // URL typing
        const urlProgress = clamp((time - 0.2) / 0.8, 0, 1)

        // Prompt text reveal
        const promptIn = Easing.easeOutCubic(clamp((time - 0.6) / 1.0, 0, 1))
        const charCount = Math.floor(prompt.length * promptIn)

        // Cursor — anchor on the real submit element every frame, with the
        // fractional value as a pre-mount fallback.
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

        const chromeInset = Math.round(
          Math.min(40, Math.max(8, stageW * 0.031)),
        )

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: exitOpacity,
            }}
          >
            <BrowserChromeTyping
              inset={chromeInset}
              urlText="devs.new"
              urlProgress={urlProgress}
              scale={chromeScale}
              opacity={chromeOpacity}
              tabTitle={false}
            >
              {/* Simplified prompt area */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: '8%',
                  background: '#f8f9fb',
                }}
              >
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
                    fontSize: Math.round(
                      Math.min(16, Math.max(11, stageW * 0.018)),
                    ),
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
                    marginTop: 16,
                    padding: '10px 32px',
                    background:
                      click > 0
                        ? 'oklch(55% 0.195 253.83)'
                        : 'oklch(62.04% 0.195 253.83)',
                    color: '#fff',
                    borderRadius: 999,
                    fontFamily: "'Geist', ui-monospace, monospace",
                    fontSize: Math.round(
                      Math.min(15, Math.max(11, stageW * 0.016)),
                    ),
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

// ── Scene 3: Board view (real ThreadBoardView) ───────────────────────────

const noop = () => {}

const t0 = new Date(0)

/** Map a time fraction (0→1) to task statuses for 5 threads. */
function getTaskStatuses(timeFrac: number): Array<Task['status']> {
  // All start pending, then cascade through in_progress → completed.
  if (timeFrac < 0.2)
    return ['pending', 'pending', 'pending', 'pending', 'pending']
  if (timeFrac < 0.35)
    return ['in_progress', 'in_progress', 'in_progress', 'pending', 'pending']
  if (timeFrac < 0.55)
    return ['completed', 'in_progress', 'in_progress', 'pending', 'pending']
  if (timeFrac < 0.72)
    return ['completed', 'completed', 'in_progress', 'in_progress', 'pending']
  if (timeFrac < 0.88)
    return ['completed', 'completed', 'completed', 'in_progress', 'in_progress']
  return ['completed', 'completed', 'completed', 'completed', 'in_progress']
}

/** Build 5 mock threads whose task.status animates over time. */
function buildBoardThreads(
  agents: Record<string, Agent>,
  statuses: Array<Task['status']>,
  createdAt: Date,
  titles: string[],
  snippets: string[],
): Thread[] {
  const agentKeys = ['analyst', 'auditor', 'analyst', 'writer', 'writer']
  return titles.map((title, i) => {
    const agent = agents[agentKeys[i]]
    const status = statuses[i]
    const task: Task = {
      id: `td-task-${i}`,
      workflowId: 'td-workflow',
      title,
      description: title,
      complexity: 'simple',
      status,
      assignedAgentId: agent.id,
      agent,
      dependencies: [],
      requirements: [],
      artifacts: [],
      steps: [],
      estimatedPasses: 1,
      actualPasses: 1,
      createdAt,
      updatedAt: createdAt,
      completedAt: status === 'completed' ? createdAt : undefined,
    }
    return {
      id: `td-thread-${i}`,
      kind: 'task' as const,
      title,
      snippet: snippets[i] || title,
      updatedAt: new Date(createdAt.getTime() - i * 60_000).toISOString(),
      agent,
      participants: [agent],
      starColor: null,
      unread: status === 'in_progress',
      messages: [],
      artifacts: [],
      source: { task },
      tags: [],
    }
  })
}

/** Memoized board content — only re-renders when status tier changes. */
interface BoardContentProps {
  statusTier: number
  titles: string[]
  snippets: string[]
  agentRoles: { analysis: string; auditing: string; writing: string }
}

const BoardContent = memo(function BoardContent({
  statusTier,
  titles,
  snippets,
  agentRoles,
}: BoardContentProps) {
  const { width: stageW } = useStageSize()
  const chromeInset = Math.round(Math.min(40, Math.max(8, stageW * 0.031)))
  const showSidebar = stageW >= 650

  const agents = useMemo(
    () => ({
      analyst: {
        id: 'td-analyst',
        slug: 'analyst',
        name: 'Analyst',
        icon: 'GraphUp' as const,
        role: agentRoles.analysis,
        instructions: '',
        createdAt: t0,
      },
      auditor: {
        id: 'td-auditor',
        slug: 'auditor',
        name: 'Auditor',
        icon: 'PcCheck' as const,
        role: agentRoles.auditing,
        instructions: '',
        createdAt: t0,
      },
      writer: {
        id: 'td-writer',
        slug: 'writer',
        name: 'Writer',
        icon: 'EditPencil' as const,
        role: agentRoles.writing,
        instructions: '',
        createdAt: t0,
      },
    }),
    [agentRoles],
  )
  const createdAt = useMemo(() => new Date(), [])

  // Map the status tier (0–5) back to a time fraction for getTaskStatuses
  const tierFracs = [0, 0.2, 0.4, 0.6, 0.75, 0.9]
  const statuses = useMemo(
    () => getTaskStatuses(tierFracs[statusTier] ?? 0),
    [statusTier],
  )

  const threads = useMemo(
    () => buildBoardThreads(agents, statuses, createdAt, titles, snippets),
    [agents, statuses, createdAt, titles, snippets],
  )

  return (
    <BrowserChrome inset={chromeInset} url="devs.new">
      <div
        className="bg-background flex h-full w-full overflow-hidden"
        style={{ height: '100%' }}
      >
        {showSidebar && (
          <div className="shrink-0">
            <Sidebar
              isCollapsed
              activeFilter="inbox"
              onFilterChange={noop}
              onOpenSettings={noop}
            />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <ThreadBoardView
            threads={threads}
            onSelect={noop}
            search=""
            onSearchChange={noop}
          />
        </div>
      </div>
    </BrowserChrome>
  )
})

/** Throttle board re-renders: only when status distribution changes. */
function getStatusTier(timeFrac: number): number {
  if (timeFrac < 0.2) return 0
  if (timeFrac < 0.35) return 1
  if (timeFrac < 0.55) return 2
  if (timeFrac < 0.72) return 3
  if (timeFrac < 0.88) return 4
  return 5
}

function SceneBoardViewInner() {
  const { t } = useI18n(taskDelegationI18n)
  const { localTime, duration } = useSprite()

  const inOpacity = clamp(localTime / 0.5, 0, 1)
  const exitT = clamp((localTime - (duration - 0.5)) / 0.5, 0, 1)
  const opacity = inOpacity * (1 - exitT)

  const timeFrac = clamp(localTime / duration, 0, 1)
  const statusTier = getStatusTier(timeFrac)

  const titles = useMemo(
    () => [
      t('Parse invoices'),
      t('Flag anomalies'),
      t('Cross-check budgets'),
      t('Summarize findings'),
      t('Draft CFO memo'),
    ],
    [t],
  )

  const snippets = useMemo(
    () => [
      t('Extract line items from 247 invoices'),
      t('Identify outliers above 2σ threshold'),
      t('Compare against Q4 budget allocations'),
      t('Aggregate findings into executive bullets'),
      t('Compose formal memo for CFO review'),
    ],
    [t],
  )

  const agentRoles = useMemo(
    () => ({
      analysis: t('Analysis'),
      auditing: t('Auditing'),
      writing: t('Writing'),
    }),
    [t],
  )

  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      <BoardContent
        statusTier={statusTier}
        titles={titles}
        snippets={snippets}
        agentRoles={agentRoles}
      />
    </div>
  )
}

export function SceneBoardView({ start = 5.9, end = 13 }: SceneProps) {
  return (
    <Sprite start={start} end={end}>
      <SceneBoardViewInner />
    </Sprite>
  )
}

// ── Scene 4: Artifacts ────────────────────────────────────────────────────

export function SceneArtifacts({ start = 12.9, end = 19 }: SceneProps) {
  const { t } = useI18n(taskDelegationI18n)
  const { width: stageW } = useStageSize()

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = Easing.easeOutCubic(clamp(time / 0.6, 0, 1))
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        // Left panel — completed task summary
        const leftIn = Easing.easeOutCubic(clamp((time - 0.2) / 0.6, 0, 1))

        // Right panel — slides in from right
        const rightIn = Easing.easeOutCubic(clamp((time - 1.0) / 0.8, 0, 1))
        const rightSlide = (1 - rightIn) * 60

        // Artifact shimmer
        const shimmer1 = clamp((time - 2.0) / 0.5, 0, 1)
        const shimmer2 = clamp((time - 2.6) / 0.5, 0, 1)

        const panelMaxW = Math.round(
          Math.min(300, Math.max(140, stageW * 0.28)),
        )
        const fontSize = Math.round(Math.min(14, Math.max(10, stageW * 0.015)))
        const titleFz = Math.round(Math.min(18, Math.max(12, stageW * 0.022)))
        const gap = Math.round(Math.min(24, Math.max(10, stageW * 0.02)))

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: gap * 2,
              padding: '5%',
              opacity,
            }}
          >
            {/* Left — task summary */}
            <div
              style={{
                width: panelMaxW,
                opacity: leftIn,
                transform: `translateY(${(1 - leftIn) * 20}px)`,
                background: '#fff',
                borderRadius: 16,
                padding: gap,
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
                display: 'flex',
                flexDirection: 'column',
                gap: gap / 2,
              }}
            >
              {/* Checkmark */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: '#22c55e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#fff',
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                ✓
              </div>
              <div
                style={{
                  fontFamily: "'Unbounded', Georgia, serif",
                  fontSize: titleFz,
                  fontWeight: 600,
                  color: '#1a1d22',
                }}
              >
                {t('Task completed')}
              </div>
              <div
                style={{
                  fontFamily: 'Figtree, system-ui, sans-serif',
                  fontSize,
                  color: '#6b7280',
                }}
              >
                {t('3 agents collaborated')}
              </div>
            </div>

            {/* Right — artifact panel */}
            <div
              style={{
                width: panelMaxW,
                opacity: rightIn,
                transform: `translateX(${rightSlide}px)`,
                display: 'flex',
                flexDirection: 'column',
                gap,
              }}
            >
              {/* Artifact 1 */}
              <ArtifactCard
                icon="📊"
                title={t('Q1 Expense Audit')}
                type={t('report')}
                shimmer={shimmer1}
                fontSize={fontSize}
                titleFz={titleFz}
              />

              {/* Artifact 2 */}
              <ArtifactCard
                icon="📝"
                title={t('CFO Memo')}
                type={t('document')}
                shimmer={shimmer2}
                fontSize={fontSize}
                titleFz={titleFz}
              />
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}

function ArtifactCard({
  icon,
  title,
  type,
  shimmer,
  fontSize,
  titleFz,
}: {
  icon: string
  title: string
  type: string
  shimmer: number
  fontSize: number
  titleFz: number
}) {
  const glowOpacity =
    shimmer > 0 && shimmer < 1 ? 0.5 + 0.5 * Math.sin(shimmer * Math.PI) : 0

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '16px 18px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        boxShadow:
          glowOpacity > 0
            ? `0 0 ${20 + glowOpacity * 20}px oklch(62% 0.195 253 / ${glowOpacity * 0.4}), 0 4px 16px rgba(0,0,0,0.06)`
            : '0 4px 16px rgba(0,0,0,0.06)',
        border: '1px solid #e9ecef',
        opacity: clamp(shimmer * 3, 0, 1),
        transform: `translateY(${(1 - clamp(shimmer * 2, 0, 1)) * 12}px)`,
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: 'oklch(95% 0.02 253)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span
          style={{
            fontFamily: "'Unbounded', Georgia, serif",
            fontSize: Math.round(titleFz * 0.85),
            fontWeight: 600,
            color: '#1a1d22',
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontFamily: "'Geist', ui-monospace, monospace",
            fontSize: Math.max(9, fontSize - 2),
            color: 'oklch(62% 0.195 253)',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {type}
        </span>
      </div>
    </div>
  )
}
