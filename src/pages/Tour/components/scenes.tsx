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
import type {
  Agent,
  Artifact,
  MessageStep,
  // Requirement,
  Task,
  // TaskStep,
  // Tool,
} from '@/types'
import { clamp, Easing, Sprite, useSprite, useStageSize } from './animations'
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

// ── Scene 1: Browser opens, prompt appears, submit clicked ───────────────
// 0–4.0s — tight opening. We skip the 5× URL zoom and per-char typing that
// used to burn ~6s. The point of Scene 1 is to establish "it's a browser
// tab" — the product payoff lives in Scene 2.
interface SceneProps {
  start?: number
  end?: number
}

export function SceneOpen({ start = 0, end = 4.0 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  const { width: stageW, height: stageH } = useStageSize()
  const prompt = t(
    'Research lithium supply chains, chart the top 5 risks, and draft an exec summary.',
  )

  const toCursor = (frac: { x: number; y: number }) => ({
    x: frac.x * stageW,
    y: frac.y * stageH,
  })

  // Timeline (scene-local seconds):
  //   0.00 – 0.40  chrome eases in
  //   0.30 – 1.50  supertitle "An AI agent swarm…" fades in then out
  //   0.40 – 1.20  URL "devs.new" types
  //   1.00 – 1.80  home page fades in with prompt already filled
  //   1.80 – 2.80  cursor glides from off-stage to submit
  //   2.80 – 3.05  cursor clicks submit (ripple)
  //   3.60 – 4.00  scene fades out into SceneSwarm
  const CURSOR_ENTER = 1.8
  const MOVE_END = 2.8
  const CLICK_END = 3.05

  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const chromeIn = Easing.easeOutBack(clamp(time / 0.4, 0, 1))
        const chromeScale = 0.96 + 0.04 * chromeIn
        const chromeOpacity = clamp(time / 0.3, 0, 1)
        const urlProgress = clamp((time - 0.4) / 0.8, 0, 1)
        const pageIn = Easing.easeOutCubic(clamp((time - 1.0) / 0.8, 0, 1))
        const exitT = clamp((time - (duration - 0.4)) / 0.4, 0, 1)
        const exitOpacity = 1 - exitT

        // Supertitle (category anchor): t 0.3 → 1.5
        // const superIn = clamp((time - 0.3) / 0.3, 0, 1)
        // const superOut = clamp((time - 1.2) / 0.3, 0, 1)
        // const superOpacity = superIn * (1 - superOut)

        // Cursor — glide off-stage → submit, then click.
        const cursorOff = toCursor(CURSOR_OFF_FRAC)
        const cursorSubmit = toCursor(CURSOR_SUBMIT_FRAC)
        let cursorPos: { x: number; y: number } | null = null
        if (time >= CURSOR_ENTER && time < MOVE_END) {
          cursorPos = lerpPoint(
            cursorOff,
            cursorSubmit,
            (time - CURSOR_ENTER) / (MOVE_END - CURSOR_ENTER),
          )
        } else if (time >= MOVE_END) {
          cursorPos = cursorSubmit
        }
        const click =
          time >= MOVE_END && time < CLICK_END
            ? (time - MOVE_END) / (CLICK_END - MOVE_END)
            : 0

        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              opacity: exitOpacity,
            }}
          >
            <BrowserChromeTyping
              inset={80}
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
                  transform: `scale(${0.94 + 0.06 * pageIn})`,
                  transformOrigin: 'center top',
                }}
              >
                <NewTaskHero
                  autoFocus={false}
                  showUseCases={pageIn > 0.6}
                  className="flex h-full min-h-0 flex-1 flex-col"
                  value={pageIn > 0.3 ? prompt : undefined}
                  demo
                />
              </div>

              {/* Category-anchor supertitle */}
              {/*{superOpacity > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: '14%',
                    textAlign: 'center',
                    fontFamily: "'Unbounded', Georgia, serif",
                    fontSize: 36,
                    fontStyle: 'italic',
                    color: '#1a1d22',
                    opacity: superOpacity,
                    pointerEvents: 'none',
                  }}
                >
                  {t('An AI agent swarm. In your browser.')}
                </div>
              )}*/}
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

// ── Scene 1b: Fake cursor clicks the prompt area and types the request ──
// Bridges SceneOpen (tab + home page) and SceneSwarm (streaming reply).
// Uses the real NewTaskHero with a controlled `value` so the prompt text
// reveals progressively. A FakeCursor overlay simulates the user's hand:
// move → click prompt → type → move to submit → click.
//
// Cursor waypoints are stored as fractions of the stage so the cursor
// lands in the same relative spot regardless of the user's viewport size.
// `NewTaskHero` centres its prompt horizontally, so the X fractions stay
// near the visual centre at any aspect ratio.

const CURSOR_OFF_FRAC = { x: 0.885, y: 0.963 }
const CURSOR_SUBMIT_FRAC = { x: 0.661, y: 0.637 }

/** Smooth lerp with ease-in-out for cursor movement. */
function lerpPoint(
  a: { x: number; y: number },
  b: { x: number; y: number },
  tNorm: number,
) {
  const k = Easing.easeInOutCubic(clamp(tNorm, 0, 1))
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
}

// ── Scene 2: The task package — swarm + thinking + tools + artifacts ─────
// 4.0–15.0s (11 s). Uses real product components (ThreadPreview,
// TaskDetailsSection, MessageBubble, ArtifactPreviewCard). The tour
// feeds them a richer mock than before:
//
//   - 4 participants visible in the thread header
//   - kind: 'task' → status chip + TaskDetailsSection disclosures
//     (Requirements 5, Steps 4, Tools 6 — counts animate as statuses flip)
//   - assistant message with `steps` = thinking + 3 tool-call steps +
//     3 work steps; rendered by the real MessageBubble / StepTracker
//   - 2 artifacts that shimmer in during the last 1.5 s

/** Build the team of agents shown as thread participants. */
function getTourTeam(roles: {
  research: string
  analysis: string
  writing: string
  review: string
}): {
  scout: Agent
  forge: Agent
  scribe: Agent
  echo: Agent
} {
  const t0 = new Date(0)
  return {
    scout: {
      id: 'tour-scout',
      slug: 'scout',
      name: 'Scout',
      icon: 'PcCheck',
      role: roles.research,
      instructions: '',
      createdAt: t0,
    },
    forge: {
      id: 'tour-forge',
      slug: 'forge',
      name: 'Forge',
      icon: 'GraphUp',
      role: roles.analysis,
      instructions: '',
      createdAt: t0,
    },
    scribe: {
      id: 'tour-scribe',
      slug: 'scribe',
      name: 'Scribe',
      icon: 'EditPencil',
      role: roles.writing,
      instructions: '',
      createdAt: t0,
    },
    echo: {
      id: 'tour-echo',
      slug: 'echo',
      name: 'Echo',
      icon: 'DoubleCheck',
      role: roles.review,
      instructions: '',
      createdAt: t0,
    },
  }
}

/** Compute requirement status at scene-local time `t`. */
// function reqStatus(
//   t: number,
//   startT: number,
//   doneT: number,
// ): { status: Requirement['status']; satisfiedAt?: Date } {
//   if (t >= doneT) return { status: 'satisfied', satisfiedAt: new Date() }
//   if (t >= startT) return { status: 'in_progress' }
//   return { status: 'pending' }
// }

/** Compute task-step status at scene-local time `t`. */
// function stepStatus(
//   t: number,
//   startT: number,
//   doneT: number,
// ): TaskStep['status'] {
//   if (t >= doneT) return 'completed'
//   if (t >= startT) return 'in_progress'
//   return 'pending'
// }

interface TourThreadStrings {
  prompt: string
  filler2Title: string
  filler2Snippet: string
  filler3Title: string
  filler3Snippet: string
  filler4Title: string
  filler4Snippet: string
  stepResearch: string
  stepChart: string
  stepDraft: string
  stepReview: string
  artifactSummary: string
  artifactChart: string
}

/** Build the mocked thread collection shown in the Inbox. */
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
      kind: 'conversation',
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
      kind: 'conversation',
      title: s.filler3Title,
      snippet: s.filler3Snippet,
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 3,
      ).toISOString(),
      agent: forge,
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
      title: s.filler4Title,
      snippet: s.filler4Snippet,
      updatedAt: new Date(
        createdAt.getTime() - 1000 * 60 * 60 * 26,
      ).toISOString(),
      agent: echo,
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
// `answerSoFar` / step count / status tier changes, not on every RAF tick.

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
    <BrowserChrome inset={40} url="devs.new">
      {/* ThreadsPage composition — real Sidebar + ThreadList + ThreadPreview.
          We avoid WorkspaceLayout because it forces h-dvh. */}
      <div
        className="bg-background flex h-full w-full overflow-hidden relative"
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
  const { t } = useI18n(tourI18n)
  const { localTime, duration } = useSprite()

  // Translated strings used to build the mocked thread + answer.
  const answerMarkdown = t(
    `## Research brief — lithium supply chains

**Four critical stages:** raw materials · refining · cell manufacturing · pack assembly.

### Top 5 risks

1. **Refining concentration** — China controls ~75% of capacity
2. **Cobalt sourcing** — DRC artisanal mining exposure
3. **Recycling gap** — capacity lags demand growth
4. **Nickel volatility** — Indonesian supply shocks
5. **Geopolitical shifts** — IRA, EU CRMA reshape flows

> Exec summary and risks chart attached.`,
  )
  const answerTokens = useMemo(
    () => answerMarkdown.split(/(\s+)/),
    [answerMarkdown],
  )

  const strings = useMemo<TourThreadStrings>(
    () => ({
      prompt: t(
        'Research lithium supply chains, chart the top 5 risks, and draft an exec summary.',
      ),
      filler2Title: t('Draft Q3 OKRs for the platform team'),
      filler2Snippet: t('Synthesized five drafts. Ready for review.'),
      filler3Title: t('Compare three WebGPU inference runtimes'),
      filler3Snippet: t(
        'Benchmarks complete. Transformers.js leads on cold start.',
      ),
      filler4Title: t('Summarize last week’s customer interviews'),
      filler4Snippet: t('Three themes emerged: latency, privacy, price.'),
      stepResearch: t('Research supply chain stages'),
      stepChart: t('Build risks chart'),
      stepDraft: t('Draft exec summary'),
      stepReview: t('Reviewing deliverables'),
      artifactSummary: t('Lithium supply chain — exec summary'),
      artifactChart: t('Top 5 risks — chart'),
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
    'Breaking this into parallel subtasks. Recruiting Research, Analysis, Writing, and Review…',
  )
  const toolLabels = {
    knowledge: t('Searching knowledge base'),
    wikipedia: t('Searching Wikipedia'),
    arxiv: t('Searching arXiv'),
    chart: t('Charting top 5 risks'),
    draft: t('Drafting exec summary'),
    review: t('Reviewing deliverables'),
  }

  // Opacity: fade in over first 0.3s, fade out over last 0.4s.
  const inOpacity = clamp(localTime / 0.3, 0, 1)
  const exitT = clamp((localTime - (duration - 0.4)) / 0.4, 0, 1)
  const opacity = inOpacity * (1 - exitT)

  // ── Streaming text ─────────────────────────────────────────────────────
  // Stream is slower + starts later: we want Thinking + tool calls to
  // dominate the first half of the scene, not wall-to-wall markdown.
  const STREAM_BEGIN = 4.0
  const STREAM_END = duration - 2.0
  const streamT = clamp(
    (localTime - STREAM_BEGIN) / (STREAM_END - STREAM_BEGIN),
    0,
    1,
  )
  const step = Math.floor(streamT * STREAM_STEPS)
  const revealedTokenCount = Math.floor(
    (step / STREAM_STEPS) * answerTokens.length,
  )
  const answerSoFar = useMemo(
    () => answerTokens.slice(0, revealedTokenCount).join(''),
    [answerTokens, revealedTokenCount],
  )

  // ── Team ───────────────────────────────────────────────────────────────
  const team = useMemo(
    () => getTourTeam(roles),
    [roles.research, roles.analysis, roles.writing, roles.review],
  )
  const createdAt = useMemo(() => new Date(), [])

  // ── Task package (requirements, steps, agent-with-tools) ───────────────
  const task = useMemo<Task>(() => {
    // const tools: Tool[] = [
    //   {
    //     id: 'tour-tool-knowledge',
    //     name: 'search_knowledge',
    //     description: 'Search the knowledge base',
    //     type: 'file',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-wikipedia',
    //     name: 'wikipedia_search',
    //     description: 'Search Wikipedia',
    //     type: 'web',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-arxiv',
    //     name: 'arxiv_search',
    //     description: 'Search arXiv papers',
    //     type: 'web',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-chart',
    //     name: 'generate_chart',
    //     description: 'Build a chart artifact',
    //     type: 'custom',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-artifact',
    //     name: 'artifact',
    //     description: 'Produce a deliverable',
    //     type: 'custom',
    //     config: {},
    //   },
    //   {
    //     id: 'tour-tool-execute',
    //     name: 'execute',
    //     description: 'Run sandboxed code',
    //     type: 'shell',
    //     config: {},
    //   },
    // ]
    // const agentWithTools: Agent = { ...team.scout, tools }

    // Requirements wave — each transitions pending → in_progress → satisfied.
    // const requirements: Requirement[] = [
    //   {
    //     id: 'req-1',
    //     type: 'functional',
    //     description: t('Research supply chain stages'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 1.0, 3.0),
    //   },
    //   {
    //     id: 'req-2',
    //     type: 'functional',
    //     description: t('Identify top 5 risks'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 1.5, 3.8),
    //   },
    //   {
    //     id: 'req-3',
    //     type: 'functional',
    //     description: t('Build risks chart'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 3.0, 5.8),
    //   },
    //   {
    //     id: 'req-4',
    //     type: 'functional',
    //     description: t('Draft exec summary'),
    //     priority: 'must',
    //     source: 'explicit',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 4.2, 7.0),
    //   },
    //   {
    //     id: 'req-5',
    //     type: 'non_functional',
    //     description: t('Reviewing deliverables'),
    //     priority: 'should',
    //     source: 'inferred',
    //     taskId: 'tour-task-primary',
    //     validationCriteria: [],
    //     ...reqStatus(localTime, 5.5, 8.0),
    //   },
    // ]

    // Task steps — show the parallel agents via Chip in the Steps disclosure.
    // const steps: TaskStep[] = [
    //   {
    //     id: 's-1',
    //     name: strings.stepResearch,
    //     description: '',
    //     order: 1,
    //     agentId: team.scout.id,
    //     status: stepStatus(localTime, 1.0, 3.8),
    //   },
    //   {
    //     id: 's-2',
    //     name: strings.stepChart,
    //     description: '',
    //     order: 2,
    //     agentId: team.forge.id,
    //     status: stepStatus(localTime, 3.0, 5.8),
    //   },
    //   {
    //     id: 's-3',
    //     name: strings.stepDraft,
    //     description: '',
    //     order: 3,
    //     agentId: team.scribe.id,
    //     status: stepStatus(localTime, 4.2, 7.0),
    //   },
    //   {
    //     id: 's-4',
    //     name: strings.stepReview,
    //     description: '',
    //     order: 4,
    //     agentId: team.echo.id,
    //     status: stepStatus(localTime, 5.5, 8.0),
    //   },
    // ]

    const taskStatus: Task['status'] =
      localTime >= 8.5
        ? 'completed'
        : localTime >= 0.3
          ? 'in_progress'
          : 'pending'

    return {
      id: 'tour-task-primary',
      workflowId: 'tour-workflow',
      title: strings.prompt,
      description: strings.prompt,
      complexity: 'complex',
      status: taskStatus,
      assignedAgentId: team.scout.id,
      // agent: agentWithTools,
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
  }, [localTime, team, createdAt, strings, t])

  // ── Assistant message.steps (Thinking + tool calls + work) ─────────────
  // Each step flips running → completed at its own time. We guard with
  // tiered boundaries so SwarmContent only re-renders when the shape
  // actually changes.
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

    // Step 0: Thinking — always present once scene begins.
    const thinking = mk('s0-thinking', 'Sparks', 'thinking', 0.5, 2.2, {
      thinkingContent,
      title: thinkingContent,
    })
    if (thinking) out.push(thinking)

    // Tool calls (staggered 200ms apart).
    // const tc1 = mk('s1-knowledge', 'Search', 'tool', 2.0, 2.8, {
    //   title: toolLabels.knowledge,
    //   toolCalls: [
    //     {
    //       name: 'search_knowledge',
    //       input: { query: 'lithium supply chain 2024' },
    //       output:
    //         localTime >= 2.8 ? '42 documents · 128 chunks matched' : undefined,
    //     },
    //   ],
    // })
    // if (tc1) out.push(tc1)

    const tc2 = mk('s2-wikipedia', 'Internet', 'tool', 2.4, 3.2, {
      title: toolLabels.wikipedia,
      toolCalls: [
        {
          name: 'wikipedia_search',
          input: { topic: 'Cobalt mining DRC' },
          output: localTime >= 3.2 ? '7 articles · cross-linked' : undefined,
        },
      ],
    })
    if (tc2) out.push(tc2)

    // const tc3 = mk('s3-arxiv', 'Page', 'tool', 2.8, 3.6, {
    //   title: toolLabels.arxiv,
    //   toolCalls: [
    //     {
    //       name: 'arxiv_search',
    //       input: { query: 'Li-ion recycling capacity' },
    //       output: localTime >= 3.6 ? '23 papers · 2022-2024' : undefined,
    //     },
    //   ],
    // })
    // if (tc3) out.push(tc3)

    // Work steps — the three agents doing their part.
    // const w1 = mk('s4-chart', 'GraphUp', 'tool', 4.2, 5.8, {
    //   title: toolLabels.chart,
    //   toolCalls: [
    //     {
    //       name: 'generate_chart',
    //       input: { kind: 'bar', series: 'risk_score', n: 5 },
    //       output: localTime >= 5.8 ? 'chart.svg · 5 bars' : undefined,
    //     },
    //   ],
    // })
    // if (w1) out.push(w1)

    // const w2 = mk('s5-draft', 'EditPencil', 'tool', 5.0, 6.8, {
    //   title: toolLabels.draft,
    //   toolCalls: [
    //     {
    //       name: 'artifact',
    //       input: { type: 'document', format: 'markdown' },
    //       output: localTime >= 6.8 ? 'summary.md · 820 words' : undefined,
    //     },
    //   ],
    // })
    // if (w2) out.push(w2)

    const w3 = mk('s6-review', 'DoubleCheck', 'tool', 6.5, 7.8, {
      title: toolLabels.review,
      toolCalls: [
        {
          name: 'validate',
          input: { requirements: 5 },
          output: localTime >= 7.8 ? '5/5 satisfied · approved' : undefined,
        },
      ],
    })
    if (w3) out.push(w3)

    return out
  }, [
    // Re-derive only when a status boundary crosses:
    Math.floor(localTime * 5),
    thinkingContent,
    toolLabels.knowledge,
    toolLabels.wikipedia,
    toolLabels.arxiv,
    toolLabels.chart,
    toolLabels.draft,
    toolLabels.review,
  ])

  // ── Artifacts (appear at t=7.5, shimmer via CSS) ───────────────────────
  const artifacts = useMemo<Artifact[]>(() => {
    if (localTime < 7.5) return []
    return [
      {
        id: 'tour-art-summary',
        taskId: 'tour-task-primary',
        agentId: team.scribe.id,
        title: strings.artifactSummary,
        description: '820 words · markdown',
        type: 'document',
        format: 'markdown',
        content: '',
        version: 1,
        status: 'final',
        dependencies: [],
        validates: [],
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: 'tour-art-chart',
        taskId: 'tour-task-primary',
        agentId: team.forge.id,
        title: strings.artifactChart,
        description: '5 bars · SVG',
        type: 'analysis',
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
  }, [localTime >= 7.5, team.scribe.id, team.forge.id, strings, createdAt])

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

export function SceneSwarm({ start = 3.9, end = 15.0 }: SceneProps) {
  return (
    <>
      <style>{`@keyframes tour-swarm-zoom { from { transform: scale(1); } to { transform: scale(1.08); } }
@keyframes tour-artifact-shimmer { 0% { opacity: 0; transform: translateY(6px); } 100% { opacity: 1; transform: translateY(0); } }`}</style>
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
// 17.9–23.0s — tightened. Three short lines + elevated closing tagline.
export function ScenePromise({ start = 17.9, end = 23.0 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  return (
    <Sprite start={start} end={end}>
      {({ localTime, duration }) => {
        const time = localTime
        const inT = clamp(time / 0.4, 0, 1)
        const exitT = clamp((time - (duration - 0.5)) / 0.5, 0, 1)
        const opacity = inT * (1 - exitT)

        const phrases = [
          { text: t('No server.'), at: 0.3 },
          { text: t('No subscription.'), at: 1.2 },
          { text: t('Your keys. Your data.'), at: 2.1 },
        ]

        // Sphere sits at one-third from the left, vertically centred —
        // expressed as percentages so it follows the user's window size.
        const SPHERE_LEFT = '33.3%'
        const SPHERE_TOP = '50%'
        const breathe = 1 + Math.sin(time * 1.8) * 0.03

        // Closing tagline: "OPEN SOURCE · BROWSER-NATIVE · YOURS"
        // Promoted from a bottom footnote to a larger centered climax at
        // the end of the scene.
        const taglineIn = clamp((time - 3.4) / 0.5, 0, 1)
        const taglineOpacity = taglineIn * (1 - exitT)

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
                left: SPHERE_LEFT,
                top: SPHERE_TOP,
                transform: `translate(-50%, -50%) scale(${breathe})`,
                opacity: 1 - taglineIn * 0.6,
              }}
            >
              <TourSphere size={260} color="#6aa1ff" intensity={1.2} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: '46.9%',
                top: '27.8%',
                width: '46.9%',
                display: 'flex',
                flexDirection: 'column',
                gap: 48,
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 56,
                color: '#f2f4f8',
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                whiteSpace: 'nowrap',
                opacity: 1 - taglineIn,
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

            {/* Elevated closing tagline — centered, large, climactic. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '50%',
                transform: `translateY(-50%) scale(${0.96 + 0.04 * taglineIn})`,
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 34,
                letterSpacing: '0.28em',
                color: '#f2f4f8',
                opacity: taglineOpacity,
                pointerEvents: 'none',
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
      viewBox="0 0 1920 1080"
      preserveAspectRatio="xMidYMid slice"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
      }}
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
// 22.9–30s — imperative CTA, friction-killer badge, pulsing click target.
// The CTA pulse uses a CSS keyframe so motion survives the Stage clock
// stopping at t=30 (no more "frozen end frame").
export function SceneCTA({ start = 22.9, end = 30 }: SceneProps) {
  const { t } = useI18n(tourI18n)
  return (
    <Sprite start={start} end={end}>
      {({ localTime }) => {
        const time = localTime
        const inT = clamp(time / 0.6, 0, 1)
        const urlT = clamp((time - 0.8) / 0.8, 0, 1)
        const tagT = clamp((time - 1.6) / 0.7, 0, 1)
        const ctaT = clamp((time - 2.4) / 0.6, 0, 1)
        const fricT = clamp((time - 3.0) / 0.5, 0, 1)
        const repoT = clamp((time - 3.6) / 0.6, 0, 1)
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
                top: '28%',
                transform: `translate(-50%, -50%) scale(${breathe})`,
              }}
            >
              <TourSphere size={180} color="#6aa1ff" intensity={1.4} />
            </div>

            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '44%',
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontSize: 120,
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
                top: '58%',
                textAlign: 'center',
                fontFamily: "'Unbounded', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 30,
                color: '#d7dbe0',
                opacity: tagT,
                transform: `translateY(${(1 - tagT) * 10}px)`,
              }}
            >
              {t('Intelligence, one tab away')}
            </div>

            {/* Imperative CTA button — CSS-keyframe pulse so it keeps
                animating even after the Stage clock stops. */}
            <style>{`@keyframes tour-cta-pulse {
              0%, 100% { box-shadow: 0 0 24px oklch(72% 0.16 253 / 0.4); }
              50% { box-shadow: 0 0 56px oklch(72% 0.16 253 / 0.8); }
            }`}</style>
            <div
              style={{
                position: 'absolute',
                left: '50%',
                top: '70%',
                transform: `translate(-50%, -50%) scale(${ctaT})`,
                opacity: ctaT,
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 28,
                fontWeight: 600,
                letterSpacing: '0.05em',
                color: '#0b0d10',
                background: '#f2f4f8',
                padding: '16px 40px',
                borderRadius: 999,
                animation: 'tour-cta-pulse 1.8s ease-in-out infinite',
                pointerEvents: 'none',
              }}
            >
              {t('Open devs.new →')}
            </div>

            {/* Friction-killer badge — the conversion lever nobody else has. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                top: '80%',
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 15,
                letterSpacing: '0.22em',
                color: 'oklch(72% 0.16 253)',
                opacity: fricT,
              }}
            >
              {t('No signup · No install · Free')}
            </div>

            {/* Repo / URL footer — de-emphasized now that the CTA is elsewhere. */}
            <div
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                bottom: 60,
                textAlign: 'center',
                fontFamily: "'Geist', ui-monospace, monospace",
                fontSize: 14,
                letterSpacing: '0.18em',
                color: '#6a6f78',
                opacity: repoT,
              }}
            >
              <span style={{ color: 'oklch(72% 0.16 253)', opacity: urlT }}>
                {t('devs.new')}
              </span>
              <span style={{ margin: '0 14px' }}>·</span>
              {t('github.com/codename-co/devs · MIT')}
            </div>
          </div>
        )
      }}
    </Sprite>
  )
}
